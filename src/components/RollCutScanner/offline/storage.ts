// FILE: src/components/RollCutScanner/offline/storage.ts
// Tiny JSON storage for the offline data of the Roll Cut module.
// AsyncStorage = device storage on Android / iOS and localStorage on web, so the same code works everywhere
// and the data survives closing the app / the browser tab.
import AsyncStorage from '../../../common/utils/compatibleStorage';

export async function readJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const v = await AsyncStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}

/** false = the device refused to store it (storage full) — callers must tell the user. */
export async function writeJson(key: string, value: unknown): Promise<boolean> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e: any) {
    console.log('[Roll Cut] storage write failed', key, e?.message);
    return false;
  }
}

/**
 * Offline data is kept per server + per user, so a second login on the same device never
 * sees (or uploads under its own name) the scans of the first user.
 */
export function makeScope(API: string, username: string) {
  const host = String(API || '').replace(/^https?:\/\//i, '').replace(/\/+$/, '');
  return `${host}|${String(username || 'User').trim()}`.toLowerCase().replace(/[^a-z0-9|._-]+/g, '_');
}

const pad = (n: number) => String(n).padStart(2, '0');
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
/** 1731730000000 -> "10:32" (today) or "14 Nov, 10:32" */
export function fmtWhen(ts?: number) {
  if (!ts) return '';
  const d = new Date(ts);
  const n = new Date();
  const hm = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  const same = d.getDate() === n.getDate() && d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear();
  return same ? hm : `${d.getDate()} ${MON[d.getMonth()]}, ${hm}`;
}
