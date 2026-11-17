// FILE: src/components/RollCutScanner/offline/masters.ts
// Offline copy of the Roll Cut selections:  Property list  +  Beam No list of EVERY property.
//
//   prefetchMasters()  -> runs automatically right after login (RollCutOfflineBoot), again whenever the
//                         network comes back and when the Roll Cut screen is opened online.
//                         1) properties   2) beams property-by-property (beams depend on the property)
//   getMasters()       -> what the screen shows when there is no network.
//
// Online screens always call the live API first and refresh this copy; the copy is only the fallback.
import { useSyncExternalStore } from 'react';
import { fetchProperties } from '../../StockVerificationNEW/verificationApi';
import type { VerifyConfig } from '../../StockVerificationNEW/verificationModel';
import { TXN_ROLL_CUT, createRollCutApi, isNetErr, str, type Opt } from '../api';
import { isOnline, reportReachable } from './network';
import { readJson, writeJson } from './storage';

export type PropRow = { PrpCode: string; LngName: string };
export type Masters = {
  prptype: string;
  props: PropRow[];
  propsAt: number; // 0 = never downloaded
  beams: Record<string, { at: number; list: Opt[] }>;
  fullAt: number; // last time properties + ALL beams were downloaded completely
};
export type Ctx = { API: string; token: string; prptype: string; scope: string };

const KEY = (scope: string) => `rollcut_masters_v1:${scope}`;
const REFRESH_EVERY = 10 * 60 * 1000; // do not re-download more often than this (unless forced)
const CRITERIA_CFG = { kind: 'fabric', title: 'Roll Cut', txntype: TXN_ROLL_CUT } as unknown as VerifyConfig;
const empty = (prptype: string): Masters => ({ prptype, props: [], propsAt: 0, beams: {}, fullAt: 0 });

const mem = new Map<string, Masters>();

export async function getMasters(scope: string, prptype: string): Promise<Masters> {
  let m = mem.get(scope);
  if (!m) {
    m = await readJson<Masters>(KEY(scope), empty(prptype));
    mem.set(scope, m);
  }
  // another property group -> the saved lists do not belong to this login
  if (prptype && m.prptype !== prptype) {
    m = empty(prptype);
    mem.set(scope, m);
  }
  return m;
}

const persist = (scope: string) => writeJson(KEY(scope), mem.get(scope));

export async function putProps(scope: string, prptype: string, rows: any[]) {
  const m = await getMasters(scope, prptype);
  m.props = rows.filter((x) => str(x?.PrpCode) !== '').map((x) => ({ PrpCode: str(x.PrpCode), LngName: str(x.LngName) || str(x.PrpCode) }));
  m.propsAt = Date.now();
  // forget beams of properties this user no longer has
  const keep = new Set(m.props.map((p) => p.PrpCode));
  Object.keys(m.beams).forEach((k) => !keep.has(k) && delete m.beams[k]);
  await persist(scope);
}

export async function putBeams(scope: string, prptype: string, prpCode: string, list: Opt[]) {
  const m = await getMasters(scope, prptype);
  m.beams[prpCode] = { at: Date.now(), list };
  await persist(scope);
}

/** Live property list (shared by the screen and the background download). */
export async function fetchRollCutProperties(c: Ctx): Promise<any[]> {
  try {
    const rows = await fetchProperties({ API: c.API, token: c.token, prptype: c.prptype, cfg: CRITERIA_CFG });
    reportReachable(true);
    await putProps(c.scope, c.prptype, rows);
    return rows;
  } catch (e) {
    if (isNetErr(e)) reportReachable(false);
    throw e;
  }
}

/** Live beam list of one property (shared by the screen and the background download). */
export async function fetchRollCutBeams(c: Ctx, prpCode: string): Promise<Opt[]> {
  try {
    const list = await createRollCutApi(c.API, c.token).beams(prpCode, c.prptype);
    reportReachable(true);
    await putBeams(c.scope, c.prptype, prpCode, list);
    return list;
  } catch (e) {
    if (isNetErr(e)) reportReachable(false);
    throw e;
  }
}

/* ----------------------------- background download ----------------------------- */

export type MastersStatus = { running: boolean; done: number; total: number; readyAt: number; props: number; beamProps: number; error: string };
let status: MastersStatus = { running: false, done: 0, total: 0, readyAt: 0, props: 0, beamProps: 0, error: '' };
const subs = new Set<() => void>();
const setStatus = (p: Partial<MastersStatus>) => {
  status = { ...status, ...p };
  subs.forEach((f) => f());
};

const summarise = (m: Masters) => ({ readyAt: m.fullAt || m.propsAt, props: m.props.length, beamProps: m.props.filter((p) => m.beams[p.PrpCode]).length });

/** Show what is already saved on the device (called when the scope is known). */
export async function loadMastersStatus(scope: string, prptype: string) {
  setStatus({ ...summarise(await getMasters(scope, prptype)), error: '' });
}

let flight: Promise<void> | null = null;
let flightScope = '';

/**
 * Download properties + the beam list of every property and keep them on the device.
 * Single flight (a second call while it runs just waits for the first one).
 */
export function prefetchMasters(c: Ctx, opt: { force?: boolean } = {}): Promise<void> {
  if (!c.API || !c.token || !c.prptype || !c.scope) return Promise.resolve();
  if (flight && flightScope === c.scope) return flight;

  flightScope = c.scope;
  flight = (async () => {
    const m = await getMasters(c.scope, c.prptype);
    setStatus({ ...summarise(m), error: '' });
    if (!isOnline()) return;
    if (!opt.force && m.fullAt && Date.now() - m.fullAt < REFRESH_EVERY) return;

    setStatus({ running: true, done: 0, total: 0 });
    try {
      await fetchRollCutProperties(c);
      const codes = (await getMasters(c.scope, c.prptype)).props.map((p) => p.PrpCode);
      setStatus({ total: codes.length, props: codes.length });

      let failed = 0;
      // one property after another: a slow / failing property never blocks the others
      for (let i = 0; i < codes.length; i++) {
        try {
          await fetchRollCutBeams(c, codes[i]);
        } catch (e) {
          failed++;
          if (isNetErr(e)) throw e; // network dropped in the middle -> stop, keep what we have, retry on reconnect
        }
        setStatus({ done: i + 1 });
      }
      const after = await getMasters(c.scope, c.prptype);
      if (!failed) after.fullAt = Date.now();
      await persist(c.scope);
      setStatus({ ...summarise(after), error: failed ? `Beam list of ${failed} propert${failed === 1 ? 'y' : 'ies'} could not be downloaded` : '' });
    } catch (e: any) {
      const cur = await getMasters(c.scope, c.prptype);
      setStatus({ ...summarise(cur), error: isNetErr(e) ? '' : str(e?.response?.data?.message || e?.message) });
    } finally {
      setStatus({ running: false });
    }
  })().finally(() => {
    flight = null;
  });
  return flight;
}

const subscribe = (f: () => void) => {
  subs.add(f);
  return () => {
    subs.delete(f);
  };
};
const snap = () => status;

/** React hook: progress / freshness of the offline selections. */
export function useMastersStatus() {
  return useSyncExternalStore(subscribe, snap, snap);
}

/** test helper */
export function _resetMasters() {
  mem.clear();
  flight = null;
  status = { running: false, done: 0, total: 0, readyAt: 0, props: 0, beamProps: 0, error: '' };
}
