// ─────────────────────────────────────────────────────────────
// FILE: src/lib/rememberedLogin.ts   (Android / iOS)
//
// NEW ERP "Remember me" vault — native implementation.
// The web build uses rememberedLogin.web.ts (Metro picks it automatically).
//
// Rules
//   • Only written when the user ticks "Remember me" on the NEW ERP login
//     AND confirms with the device lock at that moment.
//   • One vault per NEW ERP property (Sudamo/Knits and Rayons hit
//     different API servers, so their logins are kept apart).
//   • Credentials live ONLY in Expo SecureStore:
//       iOS     → Keychain, WHEN_UNLOCKED_THIS_DEVICE_ONLY (no iCloud sync,
//                 not restored onto another phone from a backup)
//       Android → EncryptedSharedPreferences, key held in Android Keystore
//   • They are read back ONLY after the OS lock prompt succeeds:
//       Android → the phone's own screen lock (fingerprint / face / PIN /
//                 pattern / password — whatever the user already uses)
//       iOS     → Face ID (or Touch ID); if that fails iOS itself offers
//                 the device passcode. Cancel → app shows the manual
//                 username/password screen.
//   • A phone with NO screen lock cannot use Remember me (the vault would
//     be unprotected), so the option is shown disabled with a hint.
// ─────────────────────────────────────────────────────────────

import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import type {
  RememberedCredentials,
  RememberedLoginInfo,
  RememberSupport,
  SaveRememberResult,
  UnlockResult,
} from './rememberedLogin.types';

export type {
  RememberedCredentials,
  RememberedLoginInfo,
  RememberSupport,
  SaveRememberResult,
  UnlockResult,
} from './rememberedLogin.types';

const VERSION = 1;
const LEGACY_KEY = 'sudamo_biometric_credentials';

const STORE_OPTS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

function safeProperty(property: string): string {
  return String(property || 'default').replace(/[^a-zA-Z0-9_-]/g, '_');
}
const secretKey = (property: string) => `nerp.remember.${safeProperty(property)}`;
const metaKey = (property: string) => `nerp.remember.${safeProperty(property)}.meta`;

// ─── Device capability ───────────────────────────────────────
export async function getRememberSupport(): Promise<RememberSupport> {
  const platform = Platform.OS === 'ios' ? 'ios' : 'android';
  try {
    const level = await LocalAuthentication.getEnrolledLevelAsync();
    if (level === LocalAuthentication.SecurityLevel.NONE) {
      return {
        available: false,
        requiresUnlock: true,
        method: 'none',
        label: platform === 'ios' ? 'Passcode' : 'Screen lock',
        icon: 'lock-open',
        platform,
        reason:
          platform === 'ios'
            ? 'Set a passcode / Face ID on this iPhone to use Remember me.'
            : 'Set a screen lock on this phone to use Remember me.',
      };
    }

    const types = await LocalAuthentication.supportedAuthenticationTypesAsync().catch(() => []);
    const hasBiometric =
      level === LocalAuthentication.SecurityLevel.BIOMETRIC_STRONG ||
      level === LocalAuthentication.SecurityLevel.BIOMETRIC_WEAK;

    if (platform === 'ios') {
      if (hasBiometric && types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
        return { available: true, requiresUnlock: true, method: 'biometric', label: 'Face ID', icon: 'face', platform };
      }
      if (hasBiometric && types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
        return { available: true, requiresUnlock: true, method: 'biometric', label: 'Touch ID', icon: 'fingerprint', platform };
      }
      return { available: true, requiresUnlock: true, method: 'device-lock', label: 'Passcode', icon: 'lock', platform };
    }

    // Android: always talk about "screen lock" — the system prompt offers
    // fingerprint / face AND the PIN / pattern / password fallback.
    return {
      available: true,
      requiresUnlock: true,
      method: hasBiometric ? 'biometric' : 'device-lock',
      label: 'Screen lock',
      icon: hasBiometric && types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT) ? 'fingerprint' : 'lock',
      platform,
    };
  } catch {
    return {
      available: false,
      requiresUnlock: true,
      method: 'none',
      label: 'Screen lock',
      icon: 'lock-open',
      platform,
      reason: 'Device lock is not available on this device.',
    };
  }
}

// ─── OS lock prompt ──────────────────────────────────────────
type PromptOutcome = 'ok' | 'cancelled' | 'failed' | 'unavailable';

async function promptDeviceLock(promptMessage: string): Promise<PromptOutcome> {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      // iOS: label of the cancel button. Android: negative button (only
      // shown when the device-credential fallback is not displayed).
      cancelLabel: 'Use password',
      // iOS: after a failed Face ID the system offers the passcode.
      fallbackLabel: 'Enter Passcode',
      // Allow the OS PIN / pattern / passcode fallback on both platforms.
      disableDeviceFallback: false,
      // Android: accept class-2 face unlock too, not only class-3 sensors.
      biometricsSecurityLevel: 'weak',
      requireConfirmation: false,
    } as LocalAuthentication.LocalAuthenticationOptions);

    if (result.success) return 'ok';

    switch (result.error) {
      case 'user_cancel':
      case 'system_cancel':
      case 'app_cancel':
      case 'user_fallback':
        return 'cancelled';
      case 'not_enrolled':
      case 'not_available':
      case 'passcode_not_set':
        return 'unavailable';
      default:
        return 'failed';
    }
  } catch {
    return 'failed';
  }
}

// ─── Vault read / write ──────────────────────────────────────
export async function getRememberedLogin(property: string): Promise<RememberedLoginInfo | null> {
  await dropLegacyVault();
  try {
    const [meta, secret] = await Promise.all([
      SecureStore.getItemAsync(metaKey(property)),
      // Presence check only; the value is parsed after the lock prompt.
      SecureStore.getItemAsync(secretKey(property)),
    ]);
    if (!secret) return null;
    const parsed = meta ? JSON.parse(meta) : {};
    return {
      property,
      hint: typeof parsed.hint === 'string' ? parsed.hint : '',
      savedAt: Number(parsed.savedAt) || 0,
    };
  } catch {
    return null;
  }
}

export async function saveRememberedLogin(
  property: string,
  creds: RememberedCredentials,
  hint: string,
): Promise<SaveRememberResult> {
  const support = await getRememberSupport();
  if (!support.available) {
    return { saved: false, reason: 'unsupported', message: support.reason };
  }

  // Prove it's really the phone owner BEFORE anything is written.
  const outcome = await promptDeviceLock(`Confirm with ${support.label} to remember this login`);
  if (outcome !== 'ok') {
    return {
      saved: false,
      reason: outcome === 'cancelled' ? 'cancelled' : 'failed',
      message: `"Remember me" was not saved because ${support.label} was not confirmed.`,
    };
  }

  try {
    await SecureStore.setItemAsync(
      secretKey(property),
      JSON.stringify({ v: VERSION, u: creds.username.trim(), p: creds.password }),
      STORE_OPTS,
    );
    await SecureStore.setItemAsync(
      metaKey(property),
      JSON.stringify({ v: VERSION, hint, savedAt: Date.now() }),
      STORE_OPTS,
    );
    return { saved: true };
  } catch (e: any) {
    await forgetRememberedLogin(property);
    return { saved: false, reason: 'failed', message: e?.message || 'Could not save the login securely.' };
  }
}

export async function unlockRememberedLogin(property: string): Promise<UnlockResult> {
  const info = await getRememberedLogin(property);
  if (!info) return { status: 'missing' };

  const support = await getRememberSupport();
  if (!support.available) {
    // Screen lock was removed after saving → the vault must not open.
    await forgetRememberedLogin(property);
    return {
      status: 'failed',
      message: 'The screen lock on this device was removed, so the saved login was deleted. Please log in manually.',
    };
  }

  const outcome = await promptDeviceLock(`Unlock to sign in to NEW ERP`);
  if (outcome === 'cancelled') return { status: 'cancelled' };
  if (outcome !== 'ok') {
    return { status: 'failed', message: `${support.label} could not be confirmed. Try again or log in manually.` };
  }

  try {
    const raw = await SecureStore.getItemAsync(secretKey(property));
    const parsed = raw ? JSON.parse(raw) : null;
    if (!parsed?.u || typeof parsed?.p !== 'string') {
      await forgetRememberedLogin(property);
      return { status: 'missing' };
    }
    return { status: 'ok', credentials: { username: parsed.u, password: parsed.p } };
  } catch {
    await forgetRememberedLogin(property);
    return { status: 'failed', message: 'Saved login could not be read. Please log in manually.' };
  }
}

export async function forgetRememberedLogin(property: string): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(secretKey(property)).catch(() => undefined),
    SecureStore.deleteItemAsync(metaKey(property)).catch(() => undefined),
  ]);
}

/** Old single-slot vault (no property, no meta) — superseded by this module. */
async function dropLegacyVault() {
  try {
    await SecureStore.deleteItemAsync(LEGACY_KEY);
  } catch {
    // nothing to drop
  }
}
