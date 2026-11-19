// FILE: src/components/RollCutScanner/offline/queue.ts
// Offline scan queue of the Roll Cut module.
//
//   enqueue()  -> a scan saved while there is no network is written to device storage (survives app close).
//   syncNow()  -> uploads the queue ONE BY ONE, oldest first (same order the takas were scanned), through the
//                 normal save API. Runs automatically when the network comes back (RollCutOfflineBoot).
//
// Result of every upload:
//   success                    -> removed from the queue, shown under "Recently uploaded"
//   "Duplicate TakaNo" answer  -> the taka is already on the server (e.g. the earlier answer was lost on a
//                                 weak network) -> removed, shown as "Already on server". Never saved twice.
//   server refused (other)     -> stays in the queue as FAILED with the server message; the next ones continue.
//                                 The user can Retry or Remove it.
//   network lost / server down -> the run stops, everything left stays PENDING, retried on the next reconnect.
//   login expired (401)        -> the run stops; scans stay safe on the device until the user logs in again.
import { useSyncExternalStore } from 'react';
import { createRollCutApi, errMsg, isDuplicateMsg, isNetErr, str } from '../api';
import { isOnline, reportReachable } from './network';
import { readJson, writeJson } from './storage';

export type QItem = {
  id: string;
  raw: string; // clean QR json text (what the save API needs)
  prpcode: string;
  yearno: string;
  beamno: string;
  takano: string;
  at: number; // when it was scanned (ms)
  status: 'pending' | 'failed';
  error?: string;
  tries: number;
};
export type LogItem = { id: string; beamno: string; takano: string; at: number; syncedAt: number; result: 'uploaded' | 'duplicate' };
export type SyncInfo = { running: boolean; done: number; total: number; currentId: string; lastRunAt: number; note: string; authError: boolean };
export type QueueState = { scope: string; ready: boolean; items: QItem[]; log: LogItem[]; sync: SyncInfo };

const QKEY = (s: string) => `rollcut_queue_v1:${s}`;
const LKEY = (s: string) => `rollcut_synclog_v1:${s}`;
const LOG_MAX = 30;
const idleSync: SyncInfo = { running: false, done: 0, total: 0, currentId: '', lastRunAt: 0, note: '', authError: false };

let state: QueueState = { scope: '', ready: false, items: [], log: [], sync: idleSync };
const subs = new Set<() => void>();
const set = (p: Partial<QueueState>) => {
  state = { ...state, ...p };
  subs.forEach((f) => f());
};
const setSync = (p: Partial<SyncInfo>) => set({ sync: { ...state.sync, ...p } });

export const getQueue = () => state;
export const pendingCount = () => state.items.filter((i) => i.status === 'pending').length;

/* Every change = read storage -> change -> write storage, one after another (no lost update, also across web tabs). */
let chain: Promise<any> = Promise.resolve();
function mutate(fn: (items: QItem[]) => QItem[] | void): Promise<boolean> {
  const scope = state.scope;
  const run = async () => {
    if (!scope) return false;
    const cur = await readJson<QItem[]>(QKEY(scope), []);
    const next = fn(cur) || cur;
    const ok = await writeJson(QKEY(scope), next);
    if (ok && state.scope === scope) set({ items: next });
    return ok;
  };
  const p = chain.then(run, run);
  chain = p.catch(() => undefined);
  return p;
}

async function addLog(entry: LogItem) {
  const scope = state.scope;
  const log = [entry, ...state.log.filter((l) => l.id !== entry.id)].slice(0, LOG_MAX);
  set({ log });
  await writeJson(LKEY(scope), log);
}

/** Load the queue of this server + user from the device. Call when the session is known / changes. */
export async function initQueue(scope: string) {
  if (!scope) return;
  if (state.scope === scope && state.ready) return;
  set({ scope, ready: false, items: [], log: [], sync: idleSync });
  const [items, log] = await Promise.all([readJson<QItem[]>(QKEY(scope), []), readJson<LogItem[]>(LKEY(scope), [])]);
  if (state.scope !== scope) return;
  set({ items, log, ready: true });
}

/** Re-read from storage (another browser tab changed it). */
export async function reloadQueue() {
  const scope = state.scope;
  if (!scope || state.sync.running) return;
  const items = await readJson<QItem[]>(QKEY(scope), []);
  if (state.scope === scope) set({ items });
}

const sameTaka = (a: { prpcode: string; beamno: string; takano: string }, b: typeof a) =>
  a.prpcode.toLowerCase() === b.prpcode.toLowerCase() && a.beamno.toLowerCase() === b.beamno.toLowerCase() && a.takano.toLowerCase() === b.takano.toLowerCase();

/** Is this taka already waiting in the offline queue? */
export const isQueued = (q: { prpcode: string; beamno: string; takano: string }) => state.items.some((i) => sameTaka(i, q));

export type EnqueueResult = 'queued' | 'duplicate' | 'storage_error';

/** Keep one scan on the device for a later upload. */
export async function enqueue(q: { raw: string; prpcode: string; yearno: string; beamno: string; takano: string }): Promise<EnqueueResult> {
  let dup = false;
  const ok = await mutate((items) => {
    if (items.some((i) => sameTaka(i, q))) {
      dup = true;
      return;
    }
    return [...items, { ...q, id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`, at: Date.now(), status: 'pending', tries: 0 }];
  });
  if (dup) return 'duplicate';
  return ok ? 'queued' : 'storage_error';
}

export const removeQueued = (id: string) => mutate((items) => items.filter((i) => i.id !== id));
export const retryQueued = (id?: string) =>
  mutate((items) => items.map((i) => (i.status === 'failed' && (!id || i.id === id) ? { ...i, status: 'pending', error: '' } : i)));

/* ---------------------------------- sync ---------------------------------- */

let active = false;

/** On web several tabs can be open: only one of them may upload at a time. */
async function withCrossTabLock(scope: string, fn: () => Promise<void>) {
  const locks: any = typeof navigator !== 'undefined' ? (navigator as any).locks : null;
  if (locks?.request) {
    await locks.request(`rollcut-sync:${scope}`, { ifAvailable: true }, async (lock: any) => {
      if (lock) await fn();
    });
  } else {
    await fn();
  }
}

/**
 * Upload everything that is pending, sequentially. Safe to call any time / many times.
 * Returns the number of scans that left the queue in this run.
 */
export async function syncNow(c: { API: string; token: string }): Promise<number> {
  const scope = state.scope;
  if (active || !scope || !state.ready || !c.API || !c.token) return 0;
  if (!state.items.some((i) => i.status === 'pending')) return 0;
  active = true;
  let cleared = 0;
  try {
    await withCrossTabLock(scope, async () => {
      await chain;
      const fresh = await readJson<QItem[]>(QKEY(scope), []);
      if (state.scope !== scope) return;
      set({ items: fresh });
      const ids = fresh.filter((i) => i.status === 'pending').sort((a, b) => a.at - b.at).map((i) => i.id);
      if (!ids.length) return;

      const api = createRollCutApi(c.API, c.token);
      setSync({ running: true, done: 0, total: ids.length, currentId: '', note: '', authError: false });

      for (let n = 0; n < ids.length; n++) {
        if (state.scope !== scope) break; // user changed in the middle
        const it = state.items.find((i) => i.id === ids[n]);
        if (!it || it.status !== 'pending') {
          setSync({ done: n + 1 });
          continue; // removed by the user meanwhile
        }
        setSync({ currentId: it.id });

        let outcome: 'uploaded' | 'duplicate' | 'failed' = 'failed';
        let message = '';
        try {
          const r = await api.save({ prpcode: it.prpcode, yearno: it.yearno, scannedString: it.raw, scannedAt: it.at });
          reportReachable(true);
          if (r?.success === true) outcome = 'uploaded';
          else if (isDuplicateMsg(r?.message)) outcome = 'duplicate';
          else message = str(r?.message) || 'Server did not save this scan';
        } catch (e: any) {
          const code = Number(e?.response?.status || 0);
          if (isNetErr(e)) {
            reportReachable(false);
            setSync({ note: 'Network lost — will continue automatically' });
            break;
          }
          if (code === 401 || code === 403 || code === 419) {
            setSync({ note: 'Login expired — please log in again to upload', authError: true });
            break;
          }
          if (code === 429 || code === 502 || code === 503 || code === 504) {
            setSync({ note: 'Server busy — will try again automatically' });
            break;
          }
          reportReachable(true);
          if (isDuplicateMsg(e?.response?.data?.message)) outcome = 'duplicate';
          else message = errMsg(e, 'Upload failed');
        }

        if (outcome === 'failed') {
          await mutate((items) => items.map((i) => (i.id === it.id ? { ...i, status: 'failed', error: message, tries: i.tries + 1 } : i)));
        } else {
          await mutate((items) => items.filter((i) => i.id !== it.id));
          await addLog({ id: it.id, beamno: it.beamno, takano: it.takano, at: it.at, syncedAt: Date.now(), result: outcome });
          cleared++;
        }
        setSync({ done: n + 1 });
      }
    });
  } finally {
    active = false;
    setSync({ running: false, currentId: '', lastRunAt: Date.now() });
  }
  return cleared;
}

/** Upload if it makes sense right now (online + something pending). */
export function syncIfNeeded(c: { API: string; token: string }) {
  if (isOnline() && pendingCount() > 0) void syncNow(c);
}

const subscribe = (f: () => void) => {
  subs.add(f);
  return () => {
    subs.delete(f);
  };
};

/** React hook: the queue, the recent uploads and the sync progress. */
export function useQueue() {
  return useSyncExternalStore(subscribe, getQueue, getQueue);
}

/** test helper */
export function _resetQueue() {
  state = { scope: '', ready: false, items: [], log: [], sync: idleSync };
  chain = Promise.resolve();
  active = false;
}
