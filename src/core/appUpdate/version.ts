// FILE: src/core/appUpdate/version.ts
// Shared helpers for the "new update available" system (web + Android + iOS).
// Single source of truth for the version = app.json -> expo.version.
import * as Application from 'expo-application';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

/** Where the mobile store-update config lives (the file public/app-update.json, deployed with the web build). */
export const APP_UPDATE_CONFIG_URL =
  process.env.EXPO_PUBLIC_UPDATE_CONFIG_URL || 'https://flownest.tms-webapp.com/app-update.json';

/** Web build id baked into the bundle by scripts/build-web.js (undefined in `expo start`). */
export const WEB_BUILD_ID: string = process.env.EXPO_PUBLIC_WEB_BUILD_ID || '';

/** Fallbacks if expo-application cannot tell us (should not happen in store builds). */
export const ANDROID_PACKAGE = 'com.anonymous.FlowNest';
export const IOS_BUNDLE_ID = 'com.dhrumil.FlowNest';

/** Version of the JS bundle (app.json expo.version at build time). */
export function getBundleVersion(): string {
  return (
    Constants.expoConfig?.version ||
    // older manifests
    (Constants as any).manifest?.version ||
    (Constants as any).manifest2?.extra?.expoClient?.version ||
    '0.0.0'
  );
}

/** Installed app version. On Android/iOS this is the REAL installed binary version. */
export function getInstalledVersion(): string {
  if (Platform.OS !== 'web') {
    const native = Application.nativeApplicationVersion;
    if (native) return native;
  }
  return getBundleVersion();
}

export function getApplicationId(): string {
  const id = Platform.OS !== 'web' ? Application.applicationId : null;
  if (id) return id;
  return Platform.OS === 'ios' ? IOS_BUNDLE_ID : ANDROID_PACKAGE;
}

/**
 * Compare dotted versions: 1.0.10 > 1.0.9, 1.1 == 1.1.0.
 * Returns 1 if a > b, -1 if a < b, 0 if equal. Non-numeric parts count as 0.
 */
export function compareVersions(a?: string | null, b?: string | null): number {
  const pa = String(a || '0').trim().split(/[.+-]/).map((x) => parseInt(x, 10) || 0);
  const pb = String(b || '0').trim().split(/[.+-]/).map((x) => parseInt(x, 10) || 0);
  const n = Math.max(pa.length, pb.length, 3);
  for (let i = 0; i < n; i++) {
    const x = pa[i] || 0;
    const y = pb[i] || 0;
    if (x > y) return 1;
    if (x < y) return -1;
  }
  return 0;
}

export const isNewer = (candidate?: string | null, current?: string | null) =>
  !!candidate && compareVersions(candidate, current) > 0;

/** fetch JSON with a timeout and no caching (query-string cache-buster too). */
export async function fetchJsonNoCache<T = any>(url: string, timeoutMs = 8000): Promise<T | null> {
  const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = ctrl ? setTimeout(() => ctrl.abort(), timeoutMs) : null;
  try {
    const sep = url.includes('?') ? '&' : '?';
    const res = await fetch(`${url}${sep}t=${Date.now()}`, {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
      signal: ctrl?.signal,
    } as RequestInit);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  } finally {
    if (timer) clearTimeout(timer);
  }
}
