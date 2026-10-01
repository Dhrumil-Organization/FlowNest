/*
 * Browser counterpart of biometricAuth.ts.
 *
 * The NEW ERP "Remember me" / Auto Login vault lives in
 * rememberedLogin.web.ts (encrypted cookie + Windows Hello / Touch ID).
 *
 * This file only keeps the in-app "Switch Property" credentials. They are
 * now stored the same way: AES-256-GCM ciphertext in a Secure, SameSite=Strict
 * first-party cookie, encrypted with a non-extractable browser key — so the
 * password never appears in localStorage, sessionStorage or IndexedDB values.
 */
import { secureStorage } from '@/src/platform/secureStorage';

import {
  deleteCookie,
  getDeviceKey,
  readJsonCookie,
  seal,
  unseal,
  webCryptoAvailable,
  writeJsonCookie,
} from './webCookieVault';

// Old IndexedDB entries written by the previous implementation.
const LEGACY_CRED_KEY = 'sudamo_biometric_credentials';
const LEGACY_PROPERTY_SWITCH_KEY = 'sudamo_property_switch_credentials';

const PS_COOKIE = 'nerp_ps';
const PS_AAD = 'nerp-ps|1';
const PS_MAX_AGE = 30 * 24 * 60 * 60;

type Creds = { username: string; password: string };

async function dropLegacy() {
  await Promise.all([
    secureStorage.removeItem(LEGACY_CRED_KEY),
    secureStorage.removeItem(LEGACY_PROPERTY_SWITCH_KEY),
  ]).catch(() => undefined);
}

export async function isBiometricSupported(): Promise<boolean> {
  return false;
}

export async function getBiometricLabel(): Promise<string> {
  return 'Browser secure storage';
}

/** Superseded by rememberedLogin.web.ts — kept so old imports still compile. */
export async function saveCredentialsForBiometric(_username: string, _password: string) {
  await dropLegacy();
}

export async function getCredentialsForBiometric(): Promise<Creds | null> {
  return null;
}

export async function clearCredentialsForBiometric() {
  await dropLegacy();
}

export async function saveCredentialsForPropertySwitch(username: string, password: string) {
  if (!webCryptoAvailable()) return;
  try {
    const key = await getDeviceKey(true);
    if (!key) return;
    const box = await seal(key, JSON.stringify({ u: username, p: password }), PS_AAD);
    writeJsonCookie(PS_COOKIE, { v: 1, ...box }, PS_MAX_AGE);
  } finally {
    await dropLegacy();
  }
}

export async function getCredentialsForPropertySwitch(): Promise<Creds | null> {
  try {
    const rec = readJsonCookie<{ v: number; iv: string; ct: string }>(PS_COOKIE);
    if (rec?.iv && rec?.ct) {
      const key = await getDeviceKey(false);
      if (!key) return null;
      const parsed = JSON.parse(await unseal(key, rec, PS_AAD));
      return parsed?.u ? { username: parsed.u, password: parsed.p } : null;
    }

    // One-time migration from the old IndexedDB record.
    const legacy = await secureStorage.getItem(LEGACY_PROPERTY_SWITCH_KEY);
    if (legacy) {
      const parsed = JSON.parse(legacy);
      if (parsed?.username) {
        await saveCredentialsForPropertySwitch(parsed.username, parsed.password);
        return { username: parsed.username, password: parsed.password };
      }
    }
    return null;
  } catch {
    return null;
  }
}

export async function clearCredentialsForPropertySwitch() {
  deleteCookie(PS_COOKIE);
  await dropLegacy();
}

export async function authenticateWithBiometrics(): Promise<boolean> {
  return false;
}
