// FILE: src/features/support/push.ts
// Notifications on this device for the Support Desk:
//   phone / tablet app   Expo push token (expo-notifications) -> push.register {channel: 'expo'}
//   browser (any OS)     Web Push: service worker /support-sw.js + the server's VAPID key
//                        -> push.register {channel: 'web', endpoint + keys}
// enable() asks for permission (call it from a button — browsers need a tap). quietRegister() runs
// on every open and only refreshes the token when permission was already given (no pop-up).
import { Platform } from 'react-native';
import type { SupportCall } from './api';

const WEB = Platform.OS === 'web';
export type PushState = 'on' | 'off' | 'blocked' | 'unsupported';

const b64ToBytes = (b64: string) => {
  const s = (b64 + '='.repeat((4 - (b64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  const raw = (globalThis as any).atob(s);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
};
const bytesToB64u = (buf: ArrayBuffer | null) => {
  if (!buf) return '';
  const b = new Uint8Array(buf);
  let s = '';
  for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
  return (globalThis as any).btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

export function webPushSupported() {
  const g: any = globalThis;
  return WEB && !!g.navigator?.serviceWorker && !!g.PushManager && !!g.Notification;
}

export async function pushState(): Promise<PushState> {
  if (WEB) {
    if (!webPushSupported()) return 'unsupported';
    const p = (globalThis as any).Notification.permission;
    if (p === 'denied') return 'blocked';
    if (p !== 'granted') return 'off';
    try {
      const reg = await (globalThis as any).navigator.serviceWorker.getRegistration('/flownest-sw.js');
      const sub = reg ? await reg.pushManager.getSubscription() : null;
      return sub ? 'on' : 'off';
    } catch { return 'off'; }
  }
  try {
    const N = await import('expo-notifications');
    const p = await N.getPermissionsAsync();
    return p.granted ? 'on' : p.canAskAgain === false ? 'blocked' : 'off';
  } catch { return 'unsupported'; }
}

async function registerWeb(api: SupportCall, ask: boolean): Promise<PushState> {
  if (!webPushSupported()) return 'unsupported';
  const g: any = globalThis;
  let perm = g.Notification.permission;
  if (perm === 'default' && ask) perm = await g.Notification.requestPermission();
  if (perm === 'denied') return 'blocked';
  if (perm !== 'granted') return 'off';
  const { web_public_key: key, enabled } = await api<{ web_public_key: string | null; enabled: boolean }>('push.key');
  if (!key || !enabled) return 'unsupported';
  const reg = await g.navigator.serviceWorker.register('/flownest-sw.js', { scope: '/' });
  await g.navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  // the server key changed -> subscribe again
  if (sub && sub.options?.applicationServerKey && bytesToB64u(sub.options.applicationServerKey) !== key) { await sub.unsubscribe(); sub = null; }
  if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(key) });
  await api('push.register', { channel: 'web', token: sub.endpoint, p256dh: bytesToB64u(sub.getKey('p256dh')), auth: bytesToB64u(sub.getKey('auth')), device: String(g.navigator.userAgent || '').slice(0, 180) });
  return 'on';
}

async function registerNative(api: SupportCall, ask: boolean): Promise<PushState> {
  const N = await import('expo-notifications');
  let p = await N.getPermissionsAsync();
  if (!p.granted && ask && p.canAskAgain !== false) p = await N.requestPermissionsAsync();
  if (!p.granted) return p.canAskAgain === false ? 'blocked' : 'off';
  if (Platform.OS === 'android') {
    try { await N.setNotificationChannelAsync('default', { name: 'Default', importance: N.AndroidImportance.MAX, sound: 'default' }); } catch { /* exists */ }
  }
  let projectId: string | undefined;
  try {
    const C: any = (await import('expo-constants')).default;
    projectId = C?.expoConfig?.extra?.eas?.projectId || C?.easConfig?.projectId;
  } catch { /* none */ }
  const t = await N.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
  await api('push.register', { channel: 'expo', token: t.data, device: Platform.OS });
  return 'on';
}

/** true when this device gets server pushes (then the in-app banner does not show twice on phones) */
export let pushOnHere = false;

/** ask (from a button) and register this device */
export async function enablePush(api: SupportCall): Promise<PushState> {
  const st = await (WEB ? registerWeb(api, true) : registerNative(api, true));
  pushOnHere = st === 'on';
  return st;
}

/** on every open: keep the token fresh, never shows a pop-up */
export async function quietRegister(api: SupportCall): Promise<void> {
  try { pushOnHere = (await (WEB ? registerWeb(api, false) : registerNative(api, false))) === 'on'; } catch { /* next time */ }
}
