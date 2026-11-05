// ─────────────────────────────────────────────────────────────
// FILE: src/lib/rememberedLogin.web.ts   (browser build)
//
// NEW ERP "Remember me" vault — web implementation.
//
// Where is the saved login kept?
//   ONLY in an encrypted first-party cookie (see webCookieVault.ts).
//   Nothing is written to localStorage or sessionStorage, and the
//   username/password are never visible in DevTools — the cookie holds an
//   opaque AES-256-GCM blob.
//
// How is it unlocked?
//   1. PC / laptop HAS a screen lock (Windows Hello PIN / face / finger,
//      macOS Touch ID / password, Android / iOS screen lock):
//        At "Remember me" time a WebAuthn platform credential is created
//        for this site. A random 32-byte secret is stored INSIDE that
//        credential (as its user handle). The browser/OS only hands that
//        secret back after the user passes the screen-lock prompt, and the
//        AES key is derived from it. So without the device lock the
//        cookie cannot be decrypted at all — not by the app, not from
//        DevTools, not on another computer.
//   2. PC has NO screen lock:
//        Auto Login signs in directly. The cookie is encrypted with a
//        NON-EXTRACTABLE browser key, so the password is still never
//        readable and the cookie cannot be decrypted anywhere else.
// ─────────────────────────────────────────────────────────────

import type {
  RememberedCredentials,
  RememberedLoginInfo,
  RememberSupport,
  SaveRememberResult,
  UnlockResult,
} from './rememberedLogin.types';
import {
  b64uDecode,
  b64uEncode,
  deleteCookie,
  deriveKeyFromSecret,
  getDeviceKey,
  randomBytes,
  readJsonCookie,
  seal,
  unseal,
  webCryptoAvailable,
  writeJsonCookie,
} from './webCookieVault';

export type {
  RememberedCredentials,
  RememberedLoginInfo,
  RememberSupport,
  SaveRememberResult,
  UnlockResult,
} from './rememberedLogin.types';

const VERSION = 1;
const MAX_AGE_SECONDS = 30 * 24 * 60 * 60; // sliding 30 days
const PROPERTY_LABEL: Record<string, string> = { sudamo_knits: 'Sudamo/Knits', rayons: 'Rayons' };

type WebRecord = {
  v: number;
  /** 'uh' = locked behind the device screen lock, 'direct' = no lock on this PC */
  m: 'uh' | 'direct';
  /** WebAuthn credential id (base64url) — only for 'uh' */
  id?: string;
  iv: string;
  ct: string;
  /** masked username for the Auto Login card */
  h: string;
  t: number;
};

const safeProperty = (property: string) => String(property || 'default').replace(/[^a-zA-Z0-9_-]/g, '_');
const cookieBase = (property: string) => `nerp_rl_${safeProperty(property)}`;
const aadFor = (property: string, rec: Pick<WebRecord, 'm' | 'id'>) =>
  `nerp-rl|${VERSION}|${safeProperty(property)}|${rec.m}|${rec.id || ''}`;

function maskHint(value: string): string {
  const v = String(value || '').trim();
  if (!v) return '';
  if (v.length <= 2) return `${v[0]}•`;
  return `${v.slice(0, 2)}${'•'.repeat(Math.min(5, v.length - 2))}`;
}

function platformLabel(): { label: string; icon: string } {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent || '' : '';
  if (/iPhone|iPad|iPod/i.test(ua)) return { label: 'Face ID', icon: 'face' };
  if (/Android/i.test(ua)) return { label: 'Screen lock', icon: 'fingerprint' };
  if (/Windows/i.test(ua)) return { label: 'Windows Hello', icon: 'fingerprint' };
  if (/Macintosh|Mac OS X/i.test(ua)) return { label: 'Touch ID', icon: 'fingerprint' };
  return { label: 'Device lock', icon: 'lock' };
}

// ─── Capability ──────────────────────────────────────────────
async function hasPlatformAuthenticator(): Promise<boolean> {
  try {
    const PKC: any = (window as any).PublicKeyCredential;
    if (!PKC?.isUserVerifyingPlatformAuthenticatorAvailable) return false;
    const timeout = new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 2000));
    return await Promise.race([PKC.isUserVerifyingPlatformAuthenticatorAvailable() as Promise<boolean>, timeout]);
  } catch {
    return false;
  }
}

let supportPromise: Promise<RememberSupport> | null = null;

export function getRememberSupport(): Promise<RememberSupport> {
  if (!supportPromise) {
    supportPromise = (async (): Promise<RememberSupport> => {
      if (!webCryptoAvailable()) {
        return {
          available: false,
          requiresUnlock: false,
          method: 'none',
          label: 'This browser',
          icon: 'lock-open',
          platform: 'web',
          reason: 'Remember me needs a secure (https) connection with cookies enabled.',
        };
      }
      const { label, icon } = platformLabel();
      if (await hasPlatformAuthenticator()) {
        return { available: true, requiresUnlock: true, method: 'platform-authenticator', label, icon, platform: 'web' };
      }
      return { available: true, requiresUnlock: false, method: 'direct', label: 'This computer', icon: 'computer', platform: 'web' };
    })();
  }
  return supportPromise;
}

// ─── Read ────────────────────────────────────────────────────
function readRecord(property: string): WebRecord | null {
  const rec = readJsonCookie<WebRecord>(cookieBase(property));
  if (!rec || rec.v !== VERSION || !rec.iv || !rec.ct || (rec.m !== 'uh' && rec.m !== 'direct')) return null;
  if (rec.m === 'uh' && !rec.id) return null;
  return rec;
}

export async function getRememberedLogin(property: string): Promise<RememberedLoginInfo | null> {
  if (!webCryptoAvailable()) return null;
  const rec = readRecord(property);
  if (!rec) return null;
  return { property, hint: rec.h || '', savedAt: rec.t || 0, locked: rec.m === 'uh' };
}

// ─── Save ────────────────────────────────────────────────────
export async function saveRememberedLogin(
  property: string,
  creds: RememberedCredentials,
  hint: string,
): Promise<SaveRememberResult> {
  const support = await getRememberSupport();
  if (!support.available) return { saved: false, reason: 'unsupported', message: support.reason };

  const payload = JSON.stringify({ u: creds.username.trim(), p: creds.password });
  const masked = maskHint(hint || creds.username);

  try {
    let record: WebRecord | null = null;

    if (support.requiresUnlock) {
      const secret = randomBytes(32);
      const startedAt = Date.now();
      let credential: PublicKeyCredential | null = null;
      let fallbackToDirect = false;

      try {
        credential = (await navigator.credentials.create({
          publicKey: {
            rp: { name: 'FlowNest NEW ERP' },
            user: {
              id: secret as BufferSource,
              name: `${creds.username.trim()} · ${PROPERTY_LABEL[property] || property}`,
              displayName: `NEW ERP – ${creds.username.trim()}`,
            },
            challenge: randomBytes(32) as BufferSource,
            pubKeyCredParams: [
              { type: 'public-key', alg: -7 }, // ES256
              { type: 'public-key', alg: -257 }, // RS256 (Windows Hello)
            ],
            authenticatorSelection: {
              authenticatorAttachment: 'platform',
              userVerification: 'required',
              residentKey: 'required',
              requireResidentKey: true,
            },
            attestation: 'none',
            timeout: 60_000,
          },
        })) as PublicKeyCredential | null;
      } catch (e: any) {
        const name = e?.name;
        if (name === 'NotAllowedError') {
          // Safari only shows the prompt inside a fresh click. If it was
          // rejected instantly, the UI asks the user to tap once more.
          if (Date.now() - startedAt < 400) {
            return { saved: false, reason: 'needs-gesture' };
          }
          return {
            saved: false,
            reason: 'cancelled',
            message: `"Remember me" was not saved because ${support.label} was not confirmed.`,
          };
        }
        if (name === 'SecurityError' || name === 'NotSupportedError') {
          // This site/host cannot use the OS lock (e.g. opened by IP).
          fallbackToDirect = true;
        } else {
          throw e;
        }
      }

      if (!fallbackToDirect) {
        if (!credential) return { saved: false, reason: 'cancelled', message: '"Remember me" was not saved.' };
        const id = b64uEncode(credential.rawId);
        const key = await deriveKeyFromSecret(secret, `remember|${safeProperty(property)}`);
        const base = { m: 'uh' as const, id };
        record = { v: VERSION, ...base, ...(await seal(key, payload, aadFor(property, base))), h: masked, t: Date.now() };
      }
    }

    if (!record) {
      const key = await getDeviceKey(true);
      if (!key) throw new Error('Secure key could not be created.');
      const base = { m: 'direct' as const };
      record = { v: VERSION, ...base, ...(await seal(key, payload, aadFor(property, base))), h: masked, t: Date.now() };
    }

    if (!writeJsonCookie(cookieBase(property), record, MAX_AGE_SECONDS)) {
      return { saved: false, reason: 'failed', message: 'This browser blocked the secure cookie, so "Remember me" was not saved.' };
    }
    return { saved: true };
  } catch (e: any) {
    deleteCookie(cookieBase(property));
    return { saved: false, reason: 'failed', message: e?.message || 'Could not save the login securely.' };
  }
}

// ─── Unlock (call directly from the Auto Login click) ────────
export async function unlockRememberedLogin(property: string): Promise<UnlockResult> {
  // Read synchronously so the WebAuthn prompt starts inside the click.
  const rec = readRecord(property);
  if (!rec) return { status: 'missing' };

  let key: CryptoKey | null = null;

  if (rec.m === 'uh') {
    let assertion: PublicKeyCredential | null = null;
    try {
      assertion = (await navigator.credentials.get({
        publicKey: {
          challenge: randomBytes(32) as BufferSource,
          allowCredentials: [{ type: 'public-key', id: b64uDecode(rec.id!) as BufferSource }],
          userVerification: 'required',
          timeout: 60_000,
        },
      })) as PublicKeyCredential | null;
    } catch (e: any) {
      if (e?.name === 'NotAllowedError' || e?.name === 'AbortError') return { status: 'cancelled' };
      return { status: 'failed', message: 'Screen lock could not be confirmed. Try again or log in manually.' };
    }
    if (!assertion) return { status: 'cancelled' };

    const response = assertion.response as AuthenticatorAssertionResponse;
    const flags = new Uint8Array(response.authenticatorData)[32] ?? 0;
    const userVerified = (flags & 0x04) !== 0;
    if (!userVerified) {
      return { status: 'failed', message: 'Screen lock was not verified. Please try again.' };
    }
    if (!response.userHandle || response.userHandle.byteLength === 0) {
      await forgetRememberedLogin(property);
      return { status: 'failed', message: 'This browser could not unlock the saved login. Please log in manually and tick Remember me again.' };
    }
    key = await deriveKeyFromSecret(new Uint8Array(response.userHandle), `remember|${safeProperty(property)}`);
  } else {
    key = await getDeviceKey(false).catch(() => null);
    if (!key) {
      await forgetRememberedLogin(property);
      return { status: 'failed', message: 'Saved login has expired on this browser. Please log in manually.' };
    }
  }

  try {
    const parsed = JSON.parse(await unseal(key, { iv: rec.iv, ct: rec.ct }, aadFor(property, rec)));
    if (!parsed?.u || typeof parsed?.p !== 'string') throw new Error('bad payload');
    // Sliding expiry: keep the saved login for 30 days after last use.
    writeJsonCookie(cookieBase(property), rec, MAX_AGE_SECONDS);
    return { status: 'ok', credentials: { username: parsed.u, password: parsed.p } };
  } catch {
    await forgetRememberedLogin(property);
    return { status: 'failed', message: 'Saved login could not be unlocked. Please log in manually.' };
  }
}

// ─── Forget ──────────────────────────────────────────────────
export async function forgetRememberedLogin(property: string): Promise<void> {
  const rec = readRecord(property);
  deleteCookie(cookieBase(property));
  // Ask the OS password manager to drop the now-useless passkey
  // (Chrome 132+; silently ignored elsewhere).
  try {
    const PKC: any = (window as any).PublicKeyCredential;
    if (rec?.m === 'uh' && rec.id && typeof PKC?.signalUnknownCredential === 'function') {
      await PKC.signalUnknownCredential({ rpId: location.hostname, credentialId: rec.id });
    }
  } catch {
    // best effort
  }
}
