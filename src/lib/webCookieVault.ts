// ─────────────────────────────────────────────────────────────
// FILE: src/lib/webCookieVault.ts   (browser only — imported by *.web.ts)
//
// Small primitives for keeping secrets in the browser WITHOUT putting
// anything readable in localStorage / sessionStorage / IndexedDB:
//
//   • The secret is AES-256-GCM encrypted and the ciphertext is kept in a
//     first-party cookie:  Secure · SameSite=Strict · Path=/ and the
//     "__Host-" prefix on HTTPS (cannot be set/overwritten by sub-domains
//     or over plain http). DevTools → Cookies only ever shows an opaque
//     base64url blob — never the username or password.
//   • The AES key is NEVER in the cookie. It is either
//       a) re-derived from the PC's own screen lock (Windows Hello /
//          Touch ID) — see rememberedLogin.web.ts, or
//       b) a NON-EXTRACTABLE WebCrypto key (only for PCs that have no
//          screen lock). Non-extractable means the raw key bytes can never
//          be read or exported, not even from DevTools; a copied cookie is
//          useless on any other browser/computer.
// ─────────────────────────────────────────────────────────────

const enc = new TextEncoder();
const dec = new TextDecoder();

export const isHttps = () =>
  typeof location !== 'undefined' && location.protocol === 'https:';

export function webCryptoAvailable(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof document !== 'undefined' &&
    !!window.isSecureContext &&
    !!window.crypto?.subtle &&
    navigator.cookieEnabled !== false
  );
}

// ─── base64url ───────────────────────────────────────────────
export function b64uEncode(bytes: ArrayBuffer | Uint8Array): string {
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let bin = '';
  for (let i = 0; i < u8.length; i += 1) bin += String.fromCharCode(u8[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function b64uDecode(value: string): Uint8Array {
  const b64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = b64 + '==='.slice((b64.length + 3) % 4);
  const bin = atob(padded);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
  return out;
}

export const utf8 = (s: string) => enc.encode(s);
export const randomBytes = (n: number) => crypto.getRandomValues(new Uint8Array(n));

// ─── cookies ─────────────────────────────────────────────────
export function cookieName(base: string): string {
  const safe = base.replace(/[^a-zA-Z0-9_-]/g, '_');
  return (isHttps() ? '__Host-' : '') + safe;
}

function cookieAttrs(maxAgeSeconds: number): string {
  return `; Path=/; Max-Age=${Math.max(0, Math.floor(maxAgeSeconds))}; SameSite=Strict${isHttps() ? '; Secure' : ''}`;
}

export function readCookie(base: string): string | null {
  if (typeof document === 'undefined') return null;
  const name = cookieName(base);
  const parts = document.cookie ? document.cookie.split('; ') : [];
  for (const part of parts) {
    const idx = part.indexOf('=');
    if (idx > 0 && part.slice(0, idx) === name) return part.slice(idx + 1);
  }
  return null;
}

/** Returns false when the browser refused the cookie (blocked / too large). */
export function writeCookie(base: string, value: string, maxAgeSeconds: number): boolean {
  if (typeof document === 'undefined') return false;
  if (!/^[A-Za-z0-9_-]*$/.test(value)) throw new Error('Cookie value must be base64url.');
  document.cookie = `${cookieName(base)}=${value}${cookieAttrs(maxAgeSeconds)}`;
  return readCookie(base) === value;
}

export function deleteCookie(base: string): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${cookieName(base)}=${cookieAttrs(0)}`;
  // Also clear a copy written before the __Host- prefix was in use.
  if (isHttps()) {
    document.cookie = `${base.replace(/[^a-zA-Z0-9_-]/g, '_')}=; Path=/; Max-Age=0; SameSite=Strict; Secure`;
  }
}

export function readJsonCookie<T = any>(base: string): T | null {
  const raw = readCookie(base);
  if (!raw) return null;
  try {
    return JSON.parse(dec.decode(b64uDecode(raw))) as T;
  } catch {
    return null;
  }
}

export function writeJsonCookie(base: string, value: unknown, maxAgeSeconds: number): boolean {
  return writeCookie(base, b64uEncode(utf8(JSON.stringify(value))), maxAgeSeconds);
}

// ─── keys ────────────────────────────────────────────────────
const KEY_DB = 'nerp_k';
const KEY_STORE = 'k';
const DEVICE_KEY_ID = 'device-v1';

function openKeyDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const req = indexedDB.open(KEY_DB, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(KEY_STORE)) req.result.createObjectStore(KEY_STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Non-extractable AES-GCM key bound to this browser profile. Holds no
 * credential data itself; it only exists so the cookie ciphertext cannot
 * be decrypted anywhere else. Only used when the PC has no screen lock.
 */
export async function getDeviceKey(create: boolean): Promise<CryptoKey | null> {
  const db = await openKeyDb();
  try {
    const existing = await new Promise<CryptoKey | undefined>((resolve, reject) => {
      const req = db.transaction(KEY_STORE, 'readonly').objectStore(KEY_STORE).get(DEVICE_KEY_ID);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    if (existing) return existing;
    if (!create) return null;

    const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(KEY_STORE, 'readwrite');
      tx.objectStore(KEY_STORE).put(key, DEVICE_KEY_ID);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    return key;
  } finally {
    db.close();
  }
}

/** AES-256-GCM key derived (HKDF-SHA256) from secret bytes the authenticator returns. */
export async function deriveKeyFromSecret(secret: Uint8Array, info: string): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey('raw', secret as BufferSource, 'HKDF', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'HKDF', hash: 'SHA-256', salt: utf8('flownest-nerp-remember') as BufferSource, info: utf8(info) as BufferSource },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

export type SealedBox = { iv: string; ct: string };

export async function seal(key: CryptoKey, plaintext: string, aad: string): Promise<SealedBox> {
  const iv = randomBytes(12);
  const ct = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as BufferSource, additionalData: utf8(aad) as BufferSource },
    key,
    utf8(plaintext) as BufferSource,
  );
  return { iv: b64uEncode(iv), ct: b64uEncode(ct) };
}

export async function unseal(key: CryptoKey, box: SealedBox, aad: string): Promise<string> {
  const pt = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: b64uDecode(box.iv) as BufferSource, additionalData: utf8(aad) as BufferSource },
    key,
    b64uDecode(box.ct) as BufferSource,
  );
  return dec.decode(pt);
}
