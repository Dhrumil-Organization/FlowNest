// ─────────────────────────────────────────────────────────────
// FILE: src/lib/biometricAuth.ts
// Thin wrapper around expo-local-authentication so the rest of the
// app never talks to the native module directly.
//
// Requires: expo install expo-local-authentication
// (Also add the usage description strings in app.json — see notes
// at the bottom of this file.)
// ─────────────────────────────────────────────────────────────

import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

/**
 * True if the device has ANY unlock method enrolled that
 * `authenticateAsync` can use — Face ID, Fingerprint, OR a plain
 * device screen lock (PIN / pattern / password). This matches how
 * banking apps behave: whatever the user already uses to unlock
 * their phone is accepted, biometric hardware or not.
 */
export async function isBiometricSupported(): Promise<boolean> {
  try {
    const level = await LocalAuthentication.getEnrolledLevelAsync();
    // NONE = nothing set up at all. SECRET = device PIN/pattern/password.
    // WEAK/STRONG = fingerprint or face. Any non-NONE level is usable.
    return level !== LocalAuthentication.SecurityLevel.NONE;
  } catch {
    return false;
  }
}

/**
 * Returns a friendly label for the toggle/UI based on what the
 * device actually supports (Face ID vs Fingerprint vs Screen Lock).
 */
export async function getBiometricLabel(): Promise<string> {
  try {
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
    if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
      return 'Face ID';
    }
    if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
      return 'Fingerprint';
    }
    const level = await LocalAuthentication.getEnrolledLevelAsync();
    if (level === LocalAuthentication.SecurityLevel.SECRET) {
      return 'Screen Lock';
    }
    return 'Biometric login';
  } catch {
    return 'Biometric login';
  }
}

// ─────────────────────────────────────────────────────────────
// Secure credential storage (Keychain on iOS / Keystore on Android).
// Only used when the user has explicitly opted in to biometric /
// quick login. NEVER stored in AsyncStorage — SecureStore encrypts
// at rest using the OS-level secure enclave / keystore.
// ─────────────────────────────────────────────────────────────
const CRED_KEY = 'sudamo_biometric_credentials';
// Separate secure credentials used only for the in-app property switch.
// Keeping this separate means the existing biometric/Remember Me behavior
// is not changed.
const PROPERTY_SWITCH_CRED_KEY = 'sudamo_property_switch_credentials';

export async function saveCredentialsForBiometric(username: string, password: string) {
  await SecureStore.setItemAsync(
    CRED_KEY,
    JSON.stringify({ username, password }),
    { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY }
  );
}

export async function getCredentialsForBiometric(): Promise<{ username: string; password: string } | null> {
  try {
    const raw = await SecureStore.getItemAsync(CRED_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function clearCredentialsForBiometric() {
  try {
    await SecureStore.deleteItemAsync(CRED_KEY);
  } catch {
    // ignore — nothing to clear
  }
}

export async function saveCredentialsForPropertySwitch(username: string, password: string) {
  await SecureStore.setItemAsync(
    PROPERTY_SWITCH_CRED_KEY,
    JSON.stringify({ username, password }),
    { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY }
  );
}

export async function getCredentialsForPropertySwitch(): Promise<{ username: string; password: string } | null> {
  try {
    const raw = await SecureStore.getItemAsync(PROPERTY_SWITCH_CRED_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Triggers the native biometric prompt.
 * Returns true only on a successful match.
 */
export async function authenticateWithBiometrics(
  promptMessage: string = 'Unlock Sudamo'
): Promise<boolean> {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      cancelLabel: 'Use password instead',
      disableDeviceFallback: false, // allow OS PIN/passcode fallback
    });
    return result.success;
  } catch {
    return false;
  }
}

// ─────────────────────────────────────────────────────────────
// SETUP NOTES (do these once):
//
// 1. Install the packages:
//      npx expo install expo-local-authentication expo-secure-store
//
// 2. app.json -> ios.infoPlist:
//      "NSFaceIDUsageDescription": "Use Face ID to log in quickly."
//
// 3. Android needs no extra permission for fingerprint/device-credential
//    (handled by the OS biometric prompt), but make sure you're on a
//    recent expo-local-authentication version if targeting Android 14+.
// ─────────────────────────────────────────────────────────────
