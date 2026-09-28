// FILE: src/screens/dyeing/dyeingReports.ts
// Pure calculations for the Daily Update and Mill Hub tabs.
//
// Both tabs are READ-ONLY and derive everything from the append-only lot
// status history (DyeEventRow[]) — there is no separate data entry for
// them. The same functions run on the mock data today and on the real API
// response later (the backend returns raw events; the math lives here), so
// the numbers cannot drift between mock and live.
//
// Counting rules (physical material is never double counted):
//   - IsRework = the same status already happened earlier on that lot.
//   - Main totals (Sent / Dyed / Finished / Received, Outward / Inward) use
//     IsRework = false events only.
//   - Redyed = re-work 'Dying' events; other re-work (re-finish, re-send,
//     re-inward) is shown as 'Re-process' — both separate from the main totals.
//   - Lorry Cut is its own metric (count of cuts + metres).

import { DyeEventRow, num, ShadeStatus } from './dyeingModel';

/* -------------------------------------------------------------------------- */
/*  Daily Update                                                               */
/* -------------------------------------------------------------------------- */

export type DayTotals = {
  sent: number;
  dyed: number;
  finished: number;
  received: number;
  lorryCut: number;
  lorryCutCount: number;
  redyed: number;
  reprocess: number;
};

export const emptyTotals = (): DayTotals => ({
  sent: 0, dyed: 0, finished: 0, received: 0,
  lorryCut: 0, lorryCutCount: 0, redyed: 0, reprocess: 0,
});

export const addEventToTotals = (totals: DayTotals, event: DyeEventRow) => {
  const qty = num(event.Qty);
  if (event.Status === 'Lorry Cut') {
    totals.lorryCut += qty;
    totals.lorryCutCount += 1;
    return;
  }
  if (event.IsRework) {
    if (event.Status === 'Dying') totals.redyed += qty;
    else totals.reprocess += qty;
    return;
  }
  if (event.Status === 'Sent for job') totals.sent += qty;
  else if (event.Status === 'Dying') totals.dyed += qty;
  else if (event.Status === 'Finish') totals.finished += qty;
  else if (event.Status === 'Job inward') totals.received += qty;
};

export type DailyDay = {
  date: string;
  totals: DayTotals;
  rows: DyeEventRow[];
};

/** Every date from `from` to `to` (inclusive), newest first, with totals. */
export function buildDailyUpdate(events: DyeEventRow[], from: string, to: string) {
  const byDate = new Map<string, DailyDay>();
  events.forEach((event) => {
    const date = event.StatusDate;
    if (!date || date < from || date > to) return;
    const day = byDate.get(date) || { date, totals: emptyTotals(), rows: [] };
    addEventToTotals(day.totals, event);
    day.rows.push(event);
    byDate.set(date, day);
  });

  const days: DailyDay[] = [];
  let cursor = to;
  // walk the full range so empty dates still show as a row with zeroes
  for (let guard = 0; guard < 400 && cursor >= from; guard += 1) {
    days.push(byDate.get(cursor) || { date: cursor, totals: emptyTotals(), rows: [] });
    const [y, m, d] = cursor.split('-').map(Number);
    const prev = new Date(y, m - 1, d - 1);
    cursor = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}-${String(prev.getDate()).padStart(2, '0')}`;
  }

  days.forEach((day) =>
    day.rows.sort((a, b) =>
      (a.DsnName || '').localeCompare(b.DsnName || '') ||
      (a.ChartNo || '').localeCompare(b.ChartNo || '') ||
      (a.ShdName || '').localeCompare(b.ShdName || ''),
    ),
  );

  const grand = emptyTotals();
  days.forEach((day) => {
    (Object.keys(grand) as (keyof DayTotals)[]).forEach((k) => { grand[k] += day.totals[k]; });
  });

  return { days, grand };
}

/* -------------------------------------------------------------------------- */
/*  Mill Hub                                                                   */
/* -------------------------------------------------------------------------- */

export type MillChallan = {
  key: string;
  ChallanNo: string;
  MillName: string;
  OutDate: string;
  DsnName: string;
  DsnCode: string;
  ChartNo: string;
  PartyName: string;
  ShdName: string;
  LotNo: string;
  LotStatus: ShadeStatus | null;
  outQty: number;
  inQtyAll: number; // all-time inward against this challan
  inQtyInRange: number;
  lastInDate: string | null;
  inAmountInRange: number;
  closed: boolean; // every lot sent on this challan has a Job inward
  chainLotCount: number; // lots sharing this outward (split lots)
  receivedLots: string[]; // lot ids with a (first) Job inward
  outInRange: boolean;
  closedInRange: boolean;
  pending: number;
  shortage: number;
  redyed: number;
  lorryCutCount: number;
};

export type MillDesignRow = {
  DsnName: string;
  DsnCode: string;
  outward: number;
  inward: number;
  pending: number;
  shortage: number;
  shortageBase: number; // outward of the challans the shortage was measured on
  shortagePct: number;
  inwardAmount: number;
  redyed: number;
  challans: MillChallan[];
};

/**
 * Mill Hub rules:
 *   - Outward and inward are counted independently within the range (an
 *     inward counts even if its outward was before the range).
 *   - Pending = outward (in range) not yet received (no Job inward against the
 *     challan yet). Pending is never shortage.
 *   - Shortage = outward minus inward, measured only on challans whose Job
 *     inward landed in the range. ('Job inward' = whole lot received; for a
 *     partial receipt split the colour into lots first.)
 *   - Re-work events (re-send after a lorry cut, re-inward) are NOT outward /
 *     inward again; Redyed metres are shown separately.
 *   - Split lots: a lot sent as one and later split into several lots keeps
 *     ONE outward challan (keyed by RootLotId). Each split lot's Job inward
 *     is matched to it, and the challan is closed only when ALL the lots of
 *     that chain (ChainLotCount) have a Job inward.
 */
export function buildMillHub(events: DyeEventRow[], from: string, to: string, mill: string | null) {
  const inRange = (date: string | null | undefined) => !!date && date >= from && date <= to;
  const challans = new Map<string, MillChallan>();
  const lotLastChallan = new Map<string, string>();

  const sorted = events.slice().sort((a, b) =>
    (a.StatusDate || '').localeCompare(b.StatusDate || '') || String(a.Id).localeCompare(String(b.Id)),
  );

  // pass 1 — outward challans (first, non re-work 'Sent for job')
  sorted.forEach((event) => {
    if (event.Status !== 'Sent for job' || event.IsRework) return;
    const root = String(event.RootLotId ?? event.LotId);
    const challanNo = String(event.ChallanNo || `LOT-${root}`).trim();
    const key = `${challanNo}::${root}`;
    lotLastChallan.set(root, key);
    const existing = challans.get(key);
    if (existing) {
      existing.outQty += num(event.Qty);
      return;
    }
    challans.set(key, {
      key,
      ChallanNo: challanNo,
      MillName: String(event.MillName || '—'),
      OutDate: event.StatusDate,
      DsnName: event.DsnName || event.DsnCode || '—',
      DsnCode: event.DsnCode,
      ChartNo: event.ChartNo,
      PartyName: event.PartyName,
      ShdName: event.ShdName,
      LotNo: event.LotNo,
      LotStatus: event.LotStatus,
      outQty: num(event.Qty),
      inQtyAll: 0,
      inQtyInRange: 0,
      lastInDate: null,
      inAmountInRange: 0,
      closed: false, // set when every lot of the chain has a Job inward
      chainLotCount: Math.max(1, num(event.ChainLotCount) || 1),
      receivedLots: [],
      outInRange: inRange(event.StatusDate),
      closedInRange: false,
      pending: 0,
      shortage: 0,
      redyed: 0,
      lorryCutCount: 0,
    });
  });

  // pass 2 — inward / re-work, matched to the outward challan
  sorted.forEach((event) => {
    const root = String(event.RootLotId ?? event.LotId);
    const against = String(event.AgainstChallanNo || '').trim();
    const key = against && challans.has(`${against}::${root}`)
      ? `${against}::${root}`
      : lotLastChallan.get(root);
    const challan = key ? challans.get(key) : undefined;
    if (!challan) return;

    if (event.Status === 'Job inward' && !event.IsRework) {
      challan.inQtyAll += num(event.Qty);
      challan.lastInDate = event.StatusDate;
      // 'Job inward' is a whole-lot receipt. The challan is closed once every
      // lot of the chain is received — later re-processing (Lorry Cut) is
      // never new outward / pending.
      const lotId = String(event.LotId);
      if (!challan.receivedLots.includes(lotId)) challan.receivedLots.push(lotId);
      challan.chainLotCount = Math.max(challan.chainLotCount, num(event.ChainLotCount) || 1);
      if (challan.receivedLots.length >= challan.chainLotCount) challan.closed = true;
      if (inRange(event.StatusDate)) {
        challan.inQtyInRange += num(event.Qty);
        challan.inAmountInRange += num(event.Qty) * num(event.Rate);
      }
    } else if (event.Status === 'Dying' && event.IsRework && inRange(event.StatusDate)) {
      challan.redyed += num(event.Qty);
    } else if (event.Status === 'Lorry Cut' && inRange(event.StatusDate)) {
      challan.lorryCutCount += 1;
    }
  });

  const designs = new Map<string, MillDesignRow>();
  challans.forEach((challan) => {
    if (mill && challan.MillName !== mill) return;
    challan.closedInRange = challan.closed && inRange(challan.lastInDate);
    challan.pending = challan.outInRange && !challan.closed
      ? Math.max(0, challan.outQty - challan.inQtyAll)
      : 0;
    challan.shortage = challan.closedInRange ? challan.outQty - challan.inQtyAll : 0;

    const touches = challan.outInRange || challan.inQtyInRange > 0 || challan.closedInRange || challan.redyed > 0;
    if (!touches) return;

    const designKey = challan.DsnName;
    const row = designs.get(designKey) || {
      DsnName: challan.DsnName,
      DsnCode: challan.DsnCode,
      outward: 0, inward: 0, pending: 0, shortage: 0, shortageBase: 0,
      shortagePct: 0, inwardAmount: 0, redyed: 0, challans: [],
    };
    if (challan.outInRange) row.outward += challan.outQty;
    row.inward += challan.inQtyInRange;
    row.pending += challan.pending;
    if (challan.closedInRange) {
      row.shortage += challan.shortage;
      row.shortageBase += challan.outQty;
    }
    row.inwardAmount += challan.inAmountInRange;
    row.redyed += challan.redyed;
    row.challans.push(challan);
    designs.set(designKey, row);
  });

  const rows = Array.from(designs.values());
  rows.forEach((row) => {
    row.shortagePct = row.shortageBase > 0 ? (row.shortage / row.shortageBase) * 100 : 0;
    row.challans.sort((a, b) => b.OutDate.localeCompare(a.OutDate));
  });
  rows.sort((a, b) => b.outward - a.outward || a.DsnName.localeCompare(b.DsnName));

  const total = rows.reduce(
    (acc, row) => {
      acc.outward += row.outward;
      acc.inward += row.inward;
      acc.pending += row.pending;
      acc.shortage += row.shortage;
      acc.shortageBase += row.shortageBase;
      acc.inwardAmount += row.inwardAmount;
      acc.redyed += row.redyed;
      return acc;
    },
    { outward: 0, inward: 0, pending: 0, shortage: 0, shortageBase: 0, inwardAmount: 0, redyed: 0, shortagePct: 0 },
  );
  total.shortagePct = total.shortageBase > 0 ? (total.shortage / total.shortageBase) * 100 : 0;

  const mills = Array.from(new Set(Array.from(challans.values()).map((c) => c.MillName))).sort();

  return { rows, total, mills };
}
