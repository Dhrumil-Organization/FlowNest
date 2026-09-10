/*
 * Browser counterpart of biometricAuth.ts.
 * Browsers do not expose Expo LocalAuthentication. We therefore do not fake
 * a biometric prompt. Remember-me/property-switch credentials use the shared
 * platform secure storage abstraction, while native builds keep the existing
 * Face ID/Fingerprint/device-lock flow unchanged.
 */
import { secureStorage } from '@/src/platform/secureStorage';

const CRED_KEY = 'sudamo_biometric_credentials';
const PROPERTY_SWITCH_CRED_KEY = 'sudamo_property_switch_credentials';

export async function isBiometricSupported(): Promise<boolean> {
  return false;
}

export async function getBiometricLabel(): Promise<string> {
  return 'Browser secure storage';
}

export async function saveCredentialsForBiometric(username: string, password: string) {
  await secureStorage.setItem(CRED_KEY, JSON.stringify({ username, password }));
}

export async function getCredentialsForBiometric(): Promise<{ username: string; password: string } | null> {
  try {
    const raw = await secureStorage.getItem(CRED_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function clearCredentialsForBiometric() {
  await secureStorage.removeItem(CRED_KEY);
}

export async function saveCredentialsForPropertySwitch(username: string, password: string) {
  await secureStorage.setItem(
    PROPERTY_SWITCH_CRED_KEY,
    JSON.stringify({ username, password }),
  );
}

export async function getCredentialsForPropertySwitch(): Promise<{ username: string; password: string } | null> {
  try {
    const raw = await secureStorage.getItem(PROPERTY_SWITCH_CRED_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function authenticateWithBiometrics(): Promise<boolean> {
  return false;
}
