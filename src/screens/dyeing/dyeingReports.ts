// FILE: src/screens/dyeing/dyeingReports.ts
// Pure calculations for the Daily Update and Mill Hub tabs — a straight port
// of the ERP Designing screens (PCDaily / PCMillHub) onto the app's data.
//
// Source = the append-only status history (FAMSOAllocationPriorityStatusHistory)
// that the Priority status sheet writes — shade-wise: one "lot" per status row
// (LotId = StatusId). Nothing is typed into these two tabs.
//
// ── Daily Update (ERP PCDaily) ──────────────────────────────────────────────
// Every lot's events are walked in date order and classified:
//   Dying       -> dyeing         (after a Lorry Cut -> redye)
//   Finish      -> finish         (after a Lorry Cut that came AFTER finishing -> refin)
//   Job inward  -> inward         (after a Lorry Cut -> back)
//   Lorry Cut   -> cut            (before / after finishing, cycle no.)
//   Sent for job after a Lorry Cut -> resent (re-processing outward)
// A stage repeated inside the same cycle (no Lorry Cut in between) is the same
// material saved twice — it is ignored, so nothing is ever counted twice.
// Per day each lot counts ONCE per kind (max metres), exactly like the ERP.
//
// ── Mill Hub (ERP PCMillHub) ────────────────────────────────────────────────
// Every lot becomes "trips" (outward challans):
//   first trip  = first 'Sent for job' (or, when that was never saved, the
//                 first status — the material obviously went to the mill)
//   re-dye trip = a Lorry Cut AFTER the lot was received sends it back
//                 (reprocess — never added to Outward / Inward)
//   'Job inward' closes the open trip (whole-lot receipt).
// Then the ERP rules: outward and inward counted independently by their own
// dates; pending = period outwards not yet received; shortage = sent minus
// received on the period's receipts (pending never counts, never blocks);
// re-dye shown separately.

import { DyeEventRow, num } from './dyeingModel';

/* -------------------------------------------------------------------------- */
/*  Shared                                                                     */
/* -------------------------------------------------------------------------- */

const byDateThenId = (a: DyeEventRow, b: DyeEventRow) =>
  (a.StatusDate || '').localeCompare(b.StatusDate || '') ||
  String(a.CreatedAt || '').localeCompare(String(b.CreatedAt || '')) ||
  num(a.Id) - num(b.Id);

/** Lot identity: the status row (LotId = StatusId); falls back to the colour. */
export const lotKeyOf = (e: DyeEventRow) =>
  e.LotId !== undefined && e.LotId !== null && String(e.LotId) !== ''
    ? `S${e.LotId}`
    : `C${e.OrderUId}|${e.OrderSrNo}|${e.ChartNo}|${e.ShdCode}|${e.ParCode}`;

/** Actual design name (never a chart ref). */
export const designOf = (e: Pick<DyeEventRow, 'DsnName' | 'DsnCode'>) =>
  String(e.DsnName || e.DsnCode || '—').trim() || '—';

const lotNoOf = (e: DyeEventRow) => e.LotNos || e.LotNo || '';

const groupByLot = (events: DyeEventRow[]) => {
  const map = new Map<string, DyeEventRow[]>();
  events.forEach((e) => {
    const k = lotKeyOf(e);
    const list = map.get(k);
    if (list) list.push(e);
    else map.set(k, [e]);
  });
  map.forEach((list) => list.sort(byDateThenId));
  return map;
};

/* -------------------------------------------------------------------------- */
/*  Daily Update                                                               */
/* -------------------------------------------------------------------------- */

export type DailyKind = 'dyeing' | 'finish' | 'inward' | 'cut' | 'resent' | 'redye' | 'refin' | 'back';

export const DAILY_MAIN: DailyKind[] = ['dyeing', 'finish', 'inward'];
export const DAILY_RE: DailyKind[] = ['cut', 'resent', 'redye', 'refin', 'back'];

export type StreamRow = {
  date: string;
  lot: string; // lot key
  kind: DailyKind;
  metres: number;
  design: string;
  chartNo: string;
  colour: string;
  party: string;
  lotNo: string;
  challan: string;
  mill: string;
  reason: string | null;
  afterFinish: boolean | null;
  cycle: number | null;
};

/** Every classified daily row (all dates) — ERP `stream`. */
export function buildStream(events: DyeEventRow[]): StreamRow[] {
  const rows: StreamRow[] = [];
  groupByLot(events).forEach((list, lot) => {
    let finishedBefore = false;
    let lastCut: { afterFinish: boolean; n: number } | null = null;
    let cuts = 0;
    let cycle = new Set<string>();
    let sentSinceCut = false;
    let cutAfterReceipt = false; // material came back and was cut -> it must be sent again (re-dye trip)
    list.forEach((e) => {
      const base = {
        date: e.StatusDate,
        lot,
        metres: num(e.Qty),
        design: designOf(e),
        chartNo: e.ChartNo,
        colour: e.ShdName || e.ShdCode || '—',
        party: e.PartyName || '',
        lotNo: lotNoOf(e),
        challan: e.ChallanNo || e.OutwardNos || '',
        mill: e.MillName || '',
        reason: null as string | null,
        afterFinish: null as boolean | null,
        cycle: null as number | null,
      };
      switch (e.Status) {
        case 'Lorry Cut': {
          cuts += 1;
          lastCut = { afterFinish: finishedBefore, n: cuts };
          cutAfterReceipt = cycle.has('inward');
          finishedBefore = false;
          cycle = new Set();
          sentSinceCut = false;
          rows.push({ ...base, kind: 'cut', reason: e.LorryCutReason || null, afterFinish: lastCut.afterFinish, cycle: cuts });
          break;
        }
        case 'Sent for job': {
          if (lastCut && cutAfterReceipt && !sentSinceCut) {
            // re-processing outward (same material going round again) — same rule as buildTrips
            sentSinceCut = true;
            rows.push({ ...base, kind: 'resent', cycle: lastCut.n });
          } else if (cycle.has('inward')) {
            // received earlier and sent again without a lorry cut = a new batch of material
            lastCut = null;
            cutAfterReceipt = false;
            finishedBefore = false;
            cycle = new Set();
          }
          break;
        }
        case 'Dying': {
          if (cycle.has('dyeing')) break;
          cycle.add('dyeing');
          if (lastCut) rows.push({ ...base, kind: 'redye', afterFinish: lastCut.afterFinish, cycle: lastCut.n });
          else rows.push({ ...base, kind: 'dyeing' });
          break;
        }
        case 'Finish': {
          if (cycle.has('finish')) break;
          cycle.add('finish');
          if (lastCut && lastCut.afterFinish) rows.push({ ...base, kind: 'refin', afterFinish: true, cycle: lastCut.n });
          else rows.push({ ...base, kind: 'finish' });
          finishedBefore = true;
          break;
        }
        case 'Job inward': {
          if (cycle.has('inward')) break;
          cycle.add('inward');
          rows.push({ ...base, kind: lastCut ? 'back' : 'inward', cycle: lastCut ? lastCut.n : null });
          break;
        }
        default:
          break;
      }
    });
  });
  return rows;
}

/** Sum of metres, each lot counted once per kind (max) — ERP `onceSum`. */
export const onceSum = (list: StreamRow[], kind: DailyKind) => {
  const m = new Map<string, number>();
  list.forEach((r) => {
    if (r.kind !== kind) return;
    m.set(r.lot, Math.max(m.get(r.lot) || 0, r.metres));
  });
  let total = 0;
  m.forEach((v) => { total += v; });
  return total;
};

/** Number of lots with that kind — ERP `onceCnt`. */
export const onceCnt = (list: StreamRow[], kind: DailyKind) =>
  new Set(list.filter((r) => r.kind === kind).map((r) => r.lot)).size;

/** One lot's activity on one day (all kinds merged) — ERP `rowsMap`. */
export type DayLotRow = {
  lot: string;
  design: string;
  chartNo: string;
  colour: string;
  party: string;
  lotNo: string;
  challan: string;
  mill: string;
  metres: number;
  kinds: Partial<Record<DailyKind, true>>;
  reasons: string[];
  afterFinish: boolean | null;
  cycle: number | null;
};

export const mergeDayRows = (list: StreamRow[]): DayLotRow[] => {
  const map = new Map<string, DayLotRow>();
  list.forEach((r) => {
    let x = map.get(r.lot);
    if (!x) {
      x = {
        lot: r.lot, design: r.design, chartNo: r.chartNo, colour: r.colour, party: r.party,
        lotNo: r.lotNo, challan: r.challan, mill: r.mill, metres: 0, kinds: {}, reasons: [],
        afterFinish: null, cycle: null,
      };
      map.set(r.lot, x);
    }
    x.kinds[r.kind] = true;
    x.metres = Math.max(x.metres, r.metres);
    if (r.mill) x.mill = r.mill;
    if (r.lotNo) x.lotNo = r.lotNo;
    if (r.challan) x.challan = r.challan;
    if (r.reason) x.reasons.push(r.reason);
    if (r.afterFinish !== null) {
      x.afterFinish = r.afterFinish;
      x.cycle = r.cycle;
    }
  });
  return Array.from(map.values()).sort((a, b) =>
    a.design.localeCompare(b.design) || a.chartNo.localeCompare(b.chartNo) || a.colour.localeCompare(b.colour),
  );
};

export const isReworkRow = (r: DayLotRow) =>
  !!(r.kinds.cut || r.kinds.resent || r.kinds.redye || r.kinds.refin || r.kinds.back);

export const labelOfRow = (r: DayLotRow) => {
  const p: string[] = [];
  if (r.kinds.dyeing) p.push('Dyed');
  if (r.kinds.finish) p.push('Finished');
  if (r.kinds.inward) p.push('Received');
  if (r.kinds.cut) p.push(`Lorry cut ${r.afterFinish ? 'after finishing' : 'before finishing'}`);
  if (r.kinds.resent) p.push('Sent for re-dye');
  if (r.kinds.redye) p.push('Re-dyed');
  if (r.kinds.refin) p.push('Re-finished');
  if (r.kinds.back) p.push('Re-dye back');
  return p.join(' + ');
};

/** Per-design chips for a day: main (first-time) metres + re-processing metres. */
export const designSummary = (list: StreamRow[]) => {
  const m = new Map<string, { d: string; main: Map<string, number>; re: Map<string, number> }>();
  list.forEach((r) => {
    let x = m.get(r.design);
    if (!x) { x = { d: r.design, main: new Map(), re: new Map() }; m.set(r.design, x); }
    const bucket = DAILY_MAIN.includes(r.kind) ? x.main : x.re;
    const k = `${r.lot}|${r.kind}`;
    bucket.set(k, Math.max(bucket.get(k) || 0, r.metres));
  });
  const sum = (mp: Map<string, number>) => { let t = 0; mp.forEach((v) => { t += v; }); return t; };
  return Array.from(m.values())
    .map((x) => ({ d: x.d, main: sum(x.main), re: sum(x.re) }))
    .sort((a, b) => b.main + b.re - (a.main + a.re));
};

export type DayTotals = Record<DailyKind, number> & { cuts: number };

export const dayTotals = (list: StreamRow[]): DayTotals => ({
  dyeing: onceSum(list, 'dyeing'),
  finish: onceSum(list, 'finish'),
  inward: onceSum(list, 'inward'),
  cut: onceSum(list, 'cut'),
  cuts: onceCnt(list, 'cut'),
  resent: onceSum(list, 'resent'),
  redye: onceSum(list, 'redye'),
  refin: onceSum(list, 'refin'),
  back: onceSum(list, 'back'),
});

/** Date-wise table: every date from `to` back to `from` (newest first) + grand total. */
export function buildMonthTable(stream: StreamRow[], from: string, to: string, addDays: (iso: string, n: number) => string) {
  const byDate = new Map<string, StreamRow[]>();
  stream.forEach((r) => {
    if (r.date < from || r.date > to) return;
    const l = byDate.get(r.date);
    if (l) l.push(r);
    else byDate.set(r.date, [r]);
  });
  const days: { date: string; t: DayTotals }[] = [];
  for (let d = to, guard = 0; d >= from && guard < 400; d = addDays(d, -1), guard += 1) {
    days.push({ date: d, t: dayTotals(byDate.get(d) || []) });
  }
  const grand = days.reduce((acc, { t }) => {
    (Object.keys(acc) as (keyof DayTotals)[]).forEach((k) => { acc[k] += t[k]; });
    return acc;
  }, dayTotals([]));
  return { days, grand };
}

/* -------------------------------------------------------------------------- */
/*  Mill Hub                                                                   */
/* -------------------------------------------------------------------------- */

export type MillInward = {
  id: string;
  date: string;
  metres: number;
  rate: number;
  mill: string;
};

export type MillTrip = {
  id: string;
  lot: string;
  date: string;
  metres: number;
  mill: string;
  challan: string;
  rate: number;
  reprocess: boolean;
  implied: boolean; // no 'Sent for job' was saved — outward taken from the first status
  design: string;
  chartNo: string;
  colour: string;
  party: string;
  lotNo: string;
  ins: MillInward[];
  // state flags of the lot (for the D / F / L / ✂ info line)
  dyed: boolean;
  finished: boolean;
  cuts: number;
};

/** Every outward trip (with its receipts) of every lot — the app's "mill moves". */
export function buildTrips(events: DyeEventRow[]): MillTrip[] {
  const trips: MillTrip[] = [];
  groupByLot(events).forEach((list, lot) => {
    let open: MillTrip | null = null;
    let last: MillTrip | null = null;
    let cutAfterReceipt: { date: string; qty: number; e: DyeEventRow } | null = null;
    let n = 0;
    let dyed = false;
    let finished = false;
    let cuts = 0;
    const mine: MillTrip[] = [];

    const make = (e: DyeEventRow, date: string, metres: number, reprocess: boolean, implied: boolean): MillTrip => {
      n += 1;
      const baseChallan = e.ChallanNo || e.OutwardNos || `${e.ChartNo} · ${e.ShdName || e.ShdCode}`;
      const t: MillTrip = {
        id: `${lot}#${n}`,
        lot,
        date,
        metres,
        mill: e.MillName || (last ? last.mill : '') || '',
        challan: reprocess && !e.ChallanNo ? `${baseChallan} · R${cuts}` : baseChallan,
        rate: num(e.Rate) || (last ? last.rate : 0),
        reprocess,
        implied,
        design: designOf(e),
        chartNo: e.ChartNo,
        colour: e.ShdName || e.ShdCode || '—',
        party: e.PartyName || '',
        lotNo: lotNoOf(e),
        ins: [],
        dyed: false,
        finished: false,
        cuts: 0,
      };
      trips.push(t);
      mine.push(t);
      open = t;
      last = t;
      return t;
    };

    const ensureOpenFor = (e: DyeEventRow) => {
      if (open) return;
      if (cutAfterReceipt) {
        const c = cutAfterReceipt;
        cutAfterReceipt = null;
        make(c.e, c.date, c.qty, true, !(e.Status === 'Sent for job'));
        return;
      }
      if (!last) make(e, e.StatusDate, num(e.Qty), false, e.Status !== 'Sent for job');
    };

    list.forEach((e) => {
      switch (e.Status) {
        case 'Sent for job': {
          if (open) {
            const o = open as MillTrip;
            if (!o.mill && e.MillName) o.mill = e.MillName;
            break;
          }
          if (cutAfterReceipt) {
            const c = cutAfterReceipt;
            cutAfterReceipt = null;
            make(e, e.StatusDate, num(e.Qty) || c.qty, true, false);
          } else {
            // first outward, or a new outward after the earlier one was received
            make(e, e.StatusDate, num(e.Qty), false, false);
          }
          break;
        }
        case 'Lorry Cut': {
          cuts += 1;
          if (!open && last) {
            // received earlier -> material goes back to the mill (re-dye trip)
            cutAfterReceipt = { date: e.StatusDate, qty: num(e.Qty) || (last as MillTrip).metres, e };
          } else {
            ensureOpenFor(e);
          }
          break;
        }
        case 'Dying':
        case 'Finish': {
          ensureOpenFor(e);
          if (e.Status === 'Dying') dyed = true;
          else { dyed = true; finished = true; }
          const o = open as MillTrip | null;
          if (o && !o.mill && e.MillName) o.mill = e.MillName;
          break;
        }
        case 'Job inward': {
          ensureOpenFor(e);
          const o = open as MillTrip | null;
          if (!o) break; // already received — same receipt saved twice
          if (!o.mill && e.MillName) o.mill = e.MillName;
          o.ins.push({
            id: `${o.id}/in${o.ins.length + 1}`,
            date: e.StatusDate,
            metres: num(e.Qty),
            rate: num(e.Rate) || o.rate,
            mill: e.MillName || o.mill,
          });
          dyed = true;
          finished = true;
          open = null;
          break;
        }
        default:
          break;
      }
    });
    if (cutAfterReceipt) {
      const c = cutAfterReceipt as { date: string; qty: number; e: DyeEventRow };
      make(c.e, c.date, c.qty, true, true);
    }
    mine.forEach((t) => {
      t.dyed = dyed;
      t.finished = finished;
      t.cuts = cuts;
      if (!t.mill) t.mill = '—';
    });
  });
  return trips;
}

/** ERP settleOf — every receipt closes (final) the trip. */
export const settleOf = (t: MillTrip) => {
  const O = t.metres;
  let acc = 0;
  const parts = t.ins
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((i) => {
      const recv = i.metres;
      const ag = Math.max(0, O - acc); // final receipt settles the whole balance
      acc += ag;
      return { i, recv, ag, short: Math.max(0, Math.round((ag - recv) * 100) / 100) };
    });
  return { parts, settled: Math.round(acc * 100) / 100 };
};

export const closedOf = (t: MillTrip) => t.ins.length > 0;
export const pendOf = (t: MillTrip) =>
  closedOf(t) ? 0 : Math.max(0, Math.round((t.metres - settleOf(t).settled) * 100) / 100);
export const shortAllOf = (t: MillTrip) => settleOf(t).parts.reduce((s, p) => s + p.short, 0);

export type MillAgg = {
  design: string;
  outM: number;
  inM: number;
  inAmt: number;
  pend: number;
  short: number;
  lOut: number;
  redye: number;
  redyeBack: number;
  pct: number;
};

const emptyAgg = (design: string): MillAgg => ({
  design, outM: 0, inM: 0, inAmt: 0, pend: 0, short: 0, lOut: 0, redye: 0, redyeBack: 0, pct: 0,
});

/** Design-level Mill Hub (ERP main screen). */
export function buildMillHub(tripsAll: MillTrip[], from: string, to: string, mill: string) {
  const inRange = (d: string) => !!d && d >= from && d <= to;
  const trips = tripsAll.filter((t) => mill === 'ALL' || t.mill === mill);
  const agg = new Map<string, MillAgg>();
  const A = (d: string) => {
    let a = agg.get(d);
    if (!a) { a = emptyAgg(d); agg.set(d, a); }
    return a;
  };
  let outCount = 0;
  let inCount = 0;
  let reCount = 0;
  trips.forEach((t) => {
    if (inRange(t.date)) {
      const a = A(t.design);
      if (t.reprocess) { a.redye += t.metres; reCount += 1; } else { a.outM += t.metres; outCount += 1; }
      a.pend += pendOf(t);
    }
    t.ins.forEach((i) => {
      if (!inRange(i.date)) return;
      const a = A(t.design);
      if (t.reprocess) { a.redyeBack += i.metres; reCount += 1; } else { a.inM += i.metres; inCount += 1; }
      a.inAmt += i.metres * i.rate;
    });
    settleOf(t).parts.forEach((p) => {
      if (!inRange(p.i.date)) return;
      const a = A(t.design);
      a.short += p.short;
      a.lOut += p.ag;
    });
  });
  const rows = Array.from(agg.values())
    .map((a) => ({ ...a, pct: a.lOut > 0 ? (a.short / a.lOut) * 100 : 0 }))
    .sort((a, b) => b.outM + b.inM - (a.outM + a.inM) || a.design.localeCompare(b.design));
  const G = rows.reduce((g, r) => {
    g.outM += r.outM; g.inM += r.inM; g.pend += r.pend; g.short += r.short; g.lOut += r.lOut;
    g.inAmt += r.inAmt; g.redye += r.redye; g.redyeBack += r.redyeBack;
    return g;
  }, emptyAgg('GRAND TOTAL'));
  G.pct = G.lOut > 0 ? (G.short / G.lOut) * 100 : 0;

  const mills = Array.from(new Set(tripsAll.map((t) => t.mill).filter((m) => m && m !== '—'))).sort();
  const moves = tripsAll.length + tripsAll.reduce((s, t) => s + t.ins.length, 0);
  return { rows, G, mills, outCount, inCount, reCount, moves };
}

export type ChallanRow = {
  t: MillTrip;
  outIn: boolean;
  inM: number;
  inAmt: number;
  rem: number;
  closed: boolean;
  pend: number | null;
  sh: number | null;
  shAll: number;
  settledP: number;
  settled: number;
  received: number;
  state: 'CLOSED' | 'CLOSED · SHORT' | 'PARTIAL' | 'PARTIAL · SHORT' | 'PENDING';
  pct: number | null;
};

/** Challan-wise page of one design (ERP drill-down). */
export function buildChallanRows(tripsAll: MillTrip[], design: string, from: string, to: string, mill: string) {
  const inRange = (d: string) => !!d && d >= from && d <= to;
  const rows: ChallanRow[] = tripsAll
    .filter((t) => (mill === 'ALL' || t.mill === mill) && t.design === design)
    .filter((t) => inRange(t.date) || t.ins.some((i) => inRange(i.date)))
    .map((t) => {
      const st = settleOf(t);
      const pParts = st.parts.filter((p) => inRange(p.i.date));
      const outIn = inRange(t.date);
      const inM = pParts.reduce((s, p) => s + p.recv, 0);
      const inAmt = pParts.reduce((s, p) => s + p.recv * p.i.rate, 0);
      const closed = closedOf(t);
      const rem = pendOf(t);
      const settledP = pParts.reduce((s, p) => s + p.ag, 0);
      const pend = outIn && !closed ? rem : null;
      const sh = pParts.length ? pParts.reduce((s, p) => s + p.short, 0) : null;
      const shAll = shortAllOf(t);
      const state: ChallanRow['state'] = closed
        ? (shAll > 0 ? 'CLOSED · SHORT' : 'CLOSED')
        : t.ins.length ? (shAll > 0 ? 'PARTIAL · SHORT' : 'PARTIAL') : 'PENDING';
      return {
        t, outIn, inM, inAmt, rem, closed, pend, sh, shAll, settledP, settled: st.settled,
        received: t.ins.reduce((s, i) => s + i.metres, 0),
        state,
        pct: sh !== null && settledP > 0 ? (sh / settledP) * 100 : null,
      };
    })
    .sort((a, b) => b.t.date.localeCompare(a.t.date));
  // as in the ERP drill-down: the challan page totals every row shown (re-dye rows included)
  const CT = {
    outM: rows.reduce((s, r) => s + (r.outIn ? r.t.metres : 0), 0),
    inM: rows.reduce((s, r) => s + r.inM, 0),
    pend: rows.reduce((s, r) => s + (r.pend || 0), 0),
    short: rows.reduce((s, r) => s + (r.sh || 0), 0),
    lOut: rows.reduce((s, r) => s + (r.settledP || 0), 0),
    inAmt: rows.reduce((s, r) => s + r.inAmt, 0),
  };
  return { rows, CT };
}
