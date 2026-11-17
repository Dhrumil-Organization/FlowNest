// FILE: src/components/RollCutScanner/offline/network.ts
// One online / offline flag for the Roll Cut module — web, Android and iOS.
//
//   device signal : web -> navigator.onLine + online/offline events,  native -> expo-network listener
//   real signal   : every API call reports its outcome (reportReachable). Wi-Fi connected but no internet
//                   (or server down) still counts as OFFLINE, so scans go to the queue instead of failing.
//   recovery      : while "offline", probeServer() is called on a timer (RollCutOfflineBoot) -> back online.
import { useSyncExternalStore } from 'react';
import { Platform } from 'react-native';

let deviceOnline = true; // what the OS / browser says
let serverOk = true; // false after a request could not reach the server
let started = false;
const subs = new Set<() => void>();

const emit = () => subs.forEach((f) => f());
const setDevice = (v: boolean) => {
  if (deviceOnline === v) return;
  deviceOnline = v;
  if (v) serverOk = true; // network came back -> trust it until a request says otherwise
  emit();
};

export const isOnline = () => deviceOnline && serverOk;

/** API layer tells us whether the server was really reached. */
export function reportReachable(ok: boolean) {
  if (serverOk === ok) return;
  serverOk = ok;
  emit();
}

export function startNetworkWatch() {
  if (started) return;
  started = true;
  if (Platform.OS === 'web') {
    if (typeof window === 'undefined') return;
    const nav: any = window.navigator;
    deviceOnline = nav?.onLine !== false;
    window.addEventListener('online', () => setDevice(true));
    window.addEventListener('offline', () => setDevice(false));
    return;
  }
  // native: expo-network (already a dependency of the app)
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Network = require('expo-network');
  const apply = (s: any) => setDevice(!!s?.isConnected && s?.isInternetReachable !== false);
  Network.getNetworkStateAsync?.().then(apply).catch(() => undefined);
  try {
    Network.addNetworkStateListener?.(apply);
  } catch {
    /* older runtime: the probe timer still recovers the flag */
  }
}

/** Re-read the device state (used when the app comes back to the foreground). */
export async function refreshNetwork() {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') setDevice((window.navigator as any)?.onLine !== false);
    return;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const s = await require('expo-network').getNetworkStateAsync();
    setDevice(!!s?.isConnected && s?.isInternetReachable !== false);
  } catch {
    /* keep the last value */
  }
}

/**
 * Is the ERP server reachable right now? Any HTTP answer (even 401/404) = reachable.
 * Web uses `no-cors` so an answer without CORS headers still resolves; only a real network failure rejects.
 */
export async function probeServer(API: string): Promise<boolean> {
  const base = String(API || '').replace(/\/+$/, '');
  if (!base) return false;
  const ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = setTimeout(() => ctl?.abort(), 8000);
  try {
    await fetch(`${base}/api/getyear?_=${Date.now()}`, {
      method: 'GET',
      cache: 'no-store',
      ...(Platform.OS === 'web' ? { mode: 'no-cors' as const } : null),
      signal: ctl?.signal,
    });
    // an answer arrived -> we are online, whatever the OS flag says
    if (!deviceOnline || !serverOk) {
      deviceOnline = true;
      serverOk = true;
      emit();
    }
    return true;
  } catch {
    reportReachable(false);
    return false;
  } finally {
    clearTimeout(timer);
  }
}

const subscribe = (f: () => void) => {
  startNetworkWatch();
  subs.add(f);
  return () => {
    subs.delete(f);
  };
};

/** React hook: true = online (device connected AND server reachable). */
export function useOnline() {
  return useSyncExternalStore(subscribe, isOnline, () => true);
}
