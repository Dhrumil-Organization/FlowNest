// FILE: src/components/DtsNEW/Fy.tsx
// DTS · Financial-year performance — the "FY 26 ›" button of every DTS widget.
// The design's FY page (overview -> month -> breakdown -> records), fed with DTS records only:
//   year chips · headline figure with the gap to last year and the pace · three-year strip · tiles that open into a
//   three-year table · "Cumulative · the chase" · "Month by month · three years" (tap a month) · top list ·
//   full breakdown by every dimension down to the records.
//
// Data — built like the Home dashboard's FY pages: the SERVER adds the year up, the records are loaded only when opened.
//   GET /api/getDtsDashboard?section=fy&metric=<sales|production|payments|jobwork|pickmetres>&from=<1 Apr>&to=<31 Mar | today>
//     -> one row per month x breakdown dimensions (a few hundred rows a year, never cut at 20,000 records)
//   The current year is loaded first and drawn at once; the two earlier years follow, then the optional
//   collection / target tiles of Sales (metric=sales_cross). Nothing waits for anything it does not need.
//   "Show the N bills / rolls" asks the normal section (sales, production, ...) for just the month or year on screen.
// (DtsDashboardController opens the year database of `to`, so an earlier year is read from its own books.)
// A year whose books cannot be opened is shown as "no data" and named in the footnote — never estimated.
// Expense metrics (DTS expense · Weaving cost) cost each pick-metre at the Expense module's rate of its month, so they
// cover the months the Expense module has loaded.
import { T } from '@/src/theme';
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line as SvgLine, Path, Rect, Text as SvgText } from 'react-native-svg';
import { FONT } from '../OwnerDashboardNEW/fonts';
import type { DtsExpenseSource } from './Expense';
import { daysInMonth, DtsFetch, DtsItem, DtsSection, fmtDY, fyN, M, monthEnd, num, Q, SEC_MACH, toItems, todayS } from './model';
import { C, st as ui, StateBox } from './ui';

export type FyMetric = 'sales' | 'production' | 'seccost' | 'dtscost' | 'payments' | 'jobwork';
type Fetch = DtsFetch;
type Money = (n: number) => string;
/** nb = sales only: 1 on one row of each bill, so adding it up gives the exact number of bills */
type Line = { k: string; amt: number; qty: number; n: number; nb?: number; date: string; ref: string; sub: string; d: Record<string, string> };
type MonthMeta = Record<string, { prod: number; pm: number }>;
/** one financial year as the server sent it (month-wise rows) */
type RawYear = { rows: any[]; error: string };
type YearData = { lines: Line[]; meta: MonthMeta; error: string; note: string };
type Cross = { coll: Record<string, number>; tgt: Record<string, number> };
type Extra = { k: string; label: string; num: number | null; fmt: (v: number) => string };
type Def = {
  title: string; noun: string; icon: string; accent: string; color?: string; fmt: Money; measure: string; count: string;
  qty?: { lbl: string; fmt: Money }; dims: string[]; note: string; distinct?: boolean; xcoll?: boolean;
  extras?: (ls: Line[], meta: MonthMeta) => Extra[];
};

/* ---------- financial-year arithmetic (the design's helpers) ---------- */
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const fyOfMonth = (m: string) => {
  const y = +m.slice(0, 4), mo = +m.slice(5, 7), fy = mo >= 4 ? y : y - 1;
  return `${fy}-${String((fy + 1) % 100).padStart(2, '0')}`;
};
const fyMonths = (fy: string) => {
  const y = +fy.slice(0, 4);
  return Array.from({ length: 12 }, (_, i) => { const mo = 4 + i; return `${mo > 12 ? y + 1 : y}-${String(mo > 12 ? mo - 12 : mo).padStart(2, '0')}`; });
};
const fyIdx = (m: string) => fyMonths(fyOfMonth(m)).indexOf(m);
const fyPrev = (fy: string) => { const y = +fy.slice(0, 4) - 1; return `${y}-${String((y + 1) % 100).padStart(2, '0')}`; };
const fyLbl = (fy: string) => `FY ${fy}`;
const fyRange = (fy: string) => `Apr ${fy.slice(0, 4)} – Mar ${+fy.slice(0, 4) + 1}`;
const mShort = (m: string) => MON[+m.slice(5, 7) - 1];
const mLblY = (m: string) => `${mShort(m)} '${m.slice(2, 4)}`;
const dLbl = (d: string) => `${d.slice(8, 10)} ${MON[+d.slice(5, 7) - 1]}`;
const chg = (a: number, b: number | null) => (b != null && b > 0 ? Math.round(((a - b) / b) * 100) : null);
const pctTxt = (p: number | null) => (p == null ? '—' : Math.round(p) === 0 ? '0%' : `${p > 0 ? '+' : '−'}${Math.abs(Math.round(p))}%`);
const sumA = (ls: Line[]) => ls.reduce((s, l) => s + l.amt, 0);
const ratio = (ls: Line[], f: (l: Line) => number) => { const a = sumA(ls), q = ls.reduce((s, l) => s + f(l), 0); return q > 0 ? a / q : null; };
const group = (ls: Line[], dim: string) => {
  const g: Record<string, { k: string; amt: number; qty: number; n: number }> = {};
  ls.forEach((l) => {
    const k = l.d[dim] || '—';
    const o = g[k] || (g[k] = { k, amt: 0, qty: 0, n: 0 });
    o.amt += l.amt; o.qty += l.qty; o.n += l.n;
  });
  return Object.values(g).sort((a, b) => b.amt - a.amt);
};
const DIMS: Record<string, string> = {
  exec: 'Executive', party: 'Customer', cat: 'Category', art: 'Design', shed: 'Shed', head: 'Cost head', secm: 'Machines',
  vendor: 'Vendor', worker: 'Job worker',
};
const dimLbl = (k: string) => DIMS[k] || k;
const GREYS = ['#C9C2BA', '#8A8580'];
const PAY_COL = '#8C4A2F';
const HEADS: [string, string][] = [['elec', 'Electricity'], ['sal', 'Salary'], ['store', 'Stores'], ['maint', 'Maintenance'], ['oth', 'Other']];

/* ---------- the metrics ---------- */
const costExtras = (ls: Line[], meta: MonthMeta): Extra[] => {
  let prod = 0, pm = 0;
  Array.from(new Set(ls.map((l) => l.k))).forEach((m) => { const x = meta[m]; if (x) { prod += x.prod; pm += x.pm; } });
  const cost = sumA(ls);
  return [
    { k: 'pick', label: 'Cost / pick', num: pm > 0 ? cost / pm : null, fmt: (v) => `₹${v.toFixed(3)}` },
    { k: 'perm', label: 'Cost / m', num: prod > 0 ? cost / prod : null, fmt: (v) => `₹${v.toFixed(2)}` },
    { k: 'prod', label: 'Production', num: prod > 0 ? prod : null, fmt: M },
  ];
};
const defsOf = (L: Money): Record<FyMetric, Def> => ({
  sales: {
    title: 'Sales', noun: 'billing', icon: '🧵', accent: C.owner, color: C.bill, fmt: L, measure: 'Billed', count: 'Bills', distinct: true,
    qty: { lbl: 'Metres', fmt: Q }, dims: ['exec', 'party', 'cat', 'art'], xcoll: true,
    extras: (ls) => [{ k: 'rate', label: 'Avg rate', num: ratio(ls, (l) => l.qty), fmt: (v) => `₹${v.toFixed(0)}/m` }],
    note: 'Billing by invoice date — invoice lines whose item is Dress Material, Technical Textile or Sportswear. A bill belongs to the executive of its sales order.',
  },
  production: {
    title: 'Production', noun: 'production', icon: '⚙️', accent: C.prod, fmt: M, measure: 'Checked', count: 'Rolls', dims: ['shed', 'art', 'cat'],
    extras: (ls) => [{ k: 'roll', label: 'Avg roll', num: ratio(ls, (l) => l.n), fmt: (v) => `${fyN(v)} m` }],
    note: 'Checked metres of DTS designs by checking date, attributed to the shed of the machine that wove them.',
  },
  seccost: {
    title: 'Weaving cost', noun: 'cost', icon: '₹', accent: T.copper, fmt: L, measure: 'Cost', count: 'Rolls', qty: { lbl: 'Metres', fmt: Q }, dims: ['cat', 'art', 'shed'],
    extras: (ls) => [{ k: 'perm', label: 'Cost / metre', num: ratio(ls, (l) => l.qty), fmt: (v) => `₹${v.toFixed(2)}/m` }],
    note: "Checked rolls of DTS designs costed at the Expense module's rate for the section of the machine that wove them × the design's picks × metres.",
  },
  dtscost: {
    title: 'DTS expense', noun: 'cost', icon: '⚡', accent: T.copper, fmt: L, measure: 'Cost', count: 'Rolls', dims: ['head', 'secm', 'cat', 'art'], extras: costExtras,
    note: "Dress Material, Technical Textile and Sportswear rolls on any machine: each roll × its picks × the per-pick cost of every head for the section whose machines wove it (the Expense module's month, live or closed). Other categories are left out.",
  },
  payments: {
    title: 'Payments Made', noun: 'payments', icon: '💸', accent: PAY_COL, fmt: L, measure: 'Paid', count: 'Payments', dims: ['vendor', 'cat'],
    extras: (ls) => [{ k: 'avg', label: 'Avg payment', num: ratio(ls, (l) => l.n), fmt: L }],
    note: 'The part of each cleared payment adjusted against a purchase bill carrying DTS items (job work, greige, processing), by payment date. Yarn bills serve both sections and are left out.',
  },
  jobwork: {
    title: 'Job work', noun: 'job work', icon: '🧶', accent: C.prod, fmt: M, measure: 'Woven', count: 'Inwards', qty: { lbl: 'Charges', fmt: L }, dims: ['worker', 'art', 'cat'],
    extras: (ls) => { const a = sumA(ls), v = ls.reduce((s, l) => s + l.qty, 0); return [{ k: 'perm', label: 'Charge / m', num: a > 0 ? v / a : null, fmt: (x) => `₹${x.toFixed(2)}` }]; },
    note: 'Outsourced · our yarn: metres of DTS fabric received from job workers, on the inward date, with the job charges of the inward.',
  },
});

/* ---------- one financial year of a metric ---------- */
const lineOf = (x: DtsItem, o: Partial<Line> = {}): Line => ({
  k: x.date.slice(0, 7), amt: num(x.v), qty: 0, n: 1, date: x.date, ref: x.label, sub: x.sub, d: x.d, ...o,
});
/** the `metric` of section=fy and the normal section that holds the same records */
const FY_KEY: Record<FyMetric, string> = { sales: 'sales', production: 'production', payments: 'payments', jobwork: 'jobwork', seccost: 'pickmetres', dtscost: 'pickmetres' };
const REC_SECTION: Record<FyMetric, DtsSection> = { sales: 'sales', production: 'production', payments: 'payments_made', jobwork: 'outsourcing', seccost: 'pickmetres', dtscost: 'pickmetres' };
const isCost = (m: FyMetric) => m === 'seccost' || m === 'dtscost';
const yearRange = (fy: string): [string, string] => {
  const today = todayS(), y = +fy.slice(0, 4), end = `${y + 1}-03-31`;
  return [`${y}-04-01`, end > today ? today : end];
};
/** a pick-metre row (metres v, pick-metres pm, rolls n, section s) costed at the Expense module's rate of its month */
function costInto(out: Line[], metric: FyMetric, exp: DtsExpenseSource, meta: MonthMeta | null, base: Line, s: 'A' | 'B', v: number, pm: number, rolls: number): number {
  const mo = exp.byMonth[base.k];
  if (!mo || !mo[s] || !(pm > 0)) return v;
  if (meta) { const mt = meta[base.k] || (meta[base.k] = { prod: 0, pm: 0 }); mt.prod += v; mt.pm += pm; }
  const art = base.d.art || '', shed = base.d.shed || '';
  if (metric === 'seccost') {
    const rt = num(mo[s].totPick);
    if (rt > 0) out.push({ ...base, amt: rt * pm, qty: v, n: rolls || 1, sub: `${base.sub ? `${base.sub} · ` : ''}₹${rt.toFixed(4)}/pick·m · Section ${s}` });
  } else {
    let first = true;
    HEADS.forEach(([h, lbl]) => {
      const rt = num(mo[s][h]?.perPick), amt = rt * pm;
      if (!(amt > 0)) return;
      /* the rolls are counted once (on the first head), so "Rolls" adds up to the rolls costed */
      out.push({ ...base, amt, n: first ? rolls || 1 : 0, sub: `${lbl} · ${art} · ${shed} · ₹${rt.toFixed(4)}/pick·m × ${fyN(pm)} pick·m`, d: { ...base.d, head: lbl, secm: SEC_MACH[s].lbl } });
      first = false;
    });
  }
  return 0;
}
/** the server's month-wise rows of one year -> the page's lines */
function buildYear(metric: FyMetric, raw: RawYear, exp: DtsExpenseSource): YearData {
  const out: YearData = { lines: [], meta: {}, error: raw.error, note: '' };
  let skipped = 0;
  (raw.rows || []).forEach((r) => {
    const k = String(r.k || '').slice(0, 7), s: 'A' | 'B' = r.sec === 'A' ? 'A' : 'B';
    if (k.length !== 7) return;
    const d: Record<string, string> = { ...(r.d || {}) };
    if (r.sec) d.secm = SEC_MACH[s].lbl;
    const base: Line = { k, amt: num(r.amt), qty: num(r.qty), n: num(r.n), nb: num(r.nb), date: `${k}-01`, ref: '', sub: '', d };
    if (isCost(metric)) skipped += costInto(out.lines, metric, exp, out.meta, base, s, num(r.amt), num(r.pm), num(r.n));
    else out.lines.push(base);
  });
  if (skipped > 0) out.note = `${fyN(skipped)} m fall in months for which the Expense module has no Section A / B rate loaded and are not costed`;
  return out;
}
/** the records of a month / year (the normal section's rows) -> lines, for "Show the N records" */
function recLines(metric: FyMetric, items: DtsItem[], exp: DtsExpenseSource): Line[] {
  if (metric === 'sales') return items.map((x) => lineOf(x, { qty: num(x.q) }));
  if (metric === 'production') return items.map((x) => lineOf(x, { n: num(x.aux) || 1 }));
  if (metric === 'payments') return items.map((x) => lineOf(x));
  if (metric === 'jobwork') return items.map((x) => lineOf(x, { qty: num(x.aux) }));
  const out: Line[] = [];
  items.forEach((p) => { costInto(out, metric, exp, null, lineOf(p), p.sec === 'A' ? 'A' : 'B', num(p.v), num(p.pm), num(p.x?.n)); });
  return out;
}

/* ---------- small pieces ---------- */
function Delta({ pct, lbl, size = 10, invert, color }: { pct: number | null; lbl?: string; size?: number; invert?: boolean; color?: string }) {
  if (pct == null) return <Text style={{ fontFamily: FONT, fontSize: size, color: C.faint }}>—{lbl ? ` ${lbl}` : ''}</Text>;
  if (Math.round(pct) === 0) return <Text style={{ fontFamily: FONT, fontSize: size, fontWeight: '700', color: color || C.mut }}>0%{lbl ? <Text style={{ fontWeight: '500', color: color || C.faint }}> {lbl}</Text> : null}</Text>;
  const good = invert ? pct <= 0 : pct >= 0;
  return (
    <Text style={{ fontFamily: FONT, fontSize: size, fontWeight: '700', color: color || (good ? C.today : C.over) }}>
      {pct >= 0 ? '▲ ' : '▼ '}{pctTxt(pct)}{lbl ? <Text style={{ fontWeight: '500', color: color || C.faint }}> {lbl}</Text> : null}
    </Text>
  );
}
function Chip({ on, l, fn, color, dim, small }: { on: boolean; l: string; fn: () => void; color: string; dim?: boolean; small?: boolean }) {
  return (
    <Pressable onPress={fn} disabled={dim && !on} accessibilityRole="button"
      style={[s.chip, small && { paddingHorizontal: 9, paddingVertical: 5 }, on ? { backgroundColor: color, borderColor: color } : null, dim && !on ? { opacity: 0.55 } : null]}>
      <Text style={{ fontFamily: FONT, fontSize: small ? 11 : 12, fontWeight: '700', color: on ? '#fff' : dim ? C.faint : C.mut }}>{l}</Text>
    </Pressable>
  );
}

/** "FY 26 ›" — the button on a widget's title bar (dark) or beside a title (light) */
export function FYBtn({ onPress, dark, big }: { onPress: () => void; dark?: boolean; big?: boolean }) {
  const fy = fyOfMonth(todayS().slice(0, 7));
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel="Financial-year performance" hitSlop={8}
      style={[s.fyBtn, dark ? { borderColor: 'rgba(255,255,255,0.55)', backgroundColor: 'rgba(255,255,255,0.16)' } : { borderColor: T.copper, backgroundColor: '#fff' }, big && { paddingHorizontal: 10, paddingVertical: 7 }]}>
      <Text style={{ fontFamily: FONT, fontSize: big ? 10 : 9, fontWeight: '700', color: dark ? '#fff' : T.copper }}>FY {fy.slice(2, 4)} ›</Text>
    </Pressable>
  );
}

/* ---------- the page ---------- */
export default function FYPage({
  metric, fetch, exp, L, backRef, title = 'DTS',
}: {
  metric: FyMetric; fetch: Fetch; exp: DtsExpenseSource; L: Money; title?: string;
  /** the hub's ‹ asks the page first: true = the page stepped back inside itself */
  backRef: React.MutableRefObject<(() => boolean) | null>;
}) {
  const def = useMemo(() => defsOf(L)[metric], [L, metric]);
  const col = def.color || def.accent, fmt = def.fmt;
  const today = todayS(), CUR_M = today.slice(0, 7), FY_CUR = fyOfMonth(CUR_M);
  const FY_LIST = useMemo(() => [FY_CUR, fyPrev(FY_CUR), fyPrev(fyPrev(FY_CUR))], [FY_CUR]);
  const yrs = useMemo(() => FY_LIST.slice().reverse(), [FY_LIST]);
  const [raw, setRaw] = useState<Record<string, RawYear>>({});
  const [cross, setCross] = useState<Record<string, Cross>>({});
  const [recs, setRecs] = useState<{ key: string; lines: Line[]; loading: boolean; error: string; note: string }>({ key: '', lines: [], loading: false, error: '', note: '' });
  const [fy, setFy] = useState(FY_CUR);
  const [view, setView] = useState<'overview' | 'detail'>('overview');
  const [month, setMonth] = useState<string | null>(null);
  const [path, setPath] = useState<{ dim: string; val: string }[]>([]);
  const [dimSel, setDimSel] = useState<string | null>(null);
  const [showLines, setShowLines] = useState(false);
  const [tile, setTile] = useState<string | null>(null);
  const [boxW, setBoxW] = useState(0);
  const expKey = Object.keys(exp.byMonth).sort().join(',');

  /* the current year first (the page is drawn as soon as it arrives), then the two earlier years, then the optional
     collection / target figures of Sales. One request per year, each a small month-wise table. */
  useEffect(() => {
    let alive = true;
    setRaw({});
    setCross({});
    const one = (y: string) => {
      const [from, to] = yearRange(y);
      return fetch('fy', from, to, FY_KEY[metric])
        .then((r) => { if (alive) setRaw((o) => ({ ...o, [y]: { rows: r.items, error: '' } })); })
        .catch((e: any) => { if (alive) setRaw((o) => ({ ...o, [y]: { rows: [], error: e?.message || 'Unable to load.' } })); });
    };
    (async () => {
      await one(FY_LIST[0]);
      if (!alive) return;
      await Promise.all(FY_LIST.slice(1).map(one));
      if (!alive || metric !== 'sales') return;
      for (const y of FY_LIST) {
        const [from, to] = yearRange(y);
        try {
          const r = await fetch('fy', from, to, 'sales_cross');
          if (!alive) return;
          setCross((o) => ({ ...o, [y]: { coll: r.meta?.coll || {}, tgt: r.meta?.tgt || {} } }));
        } catch { /* the cross-figures are optional: without them their two tiles are simply not drawn */ }
      }
    })();
    return () => { alive = false; };
  }, [metric, fetch, FY_LIST]);

  /* the Expense module's rates arrive on their own: the cost metrics are re-costed from the rows already loaded, not re-fetched */
  const data = useMemo(() => {
    const o: Record<string, YearData> = {};
    Object.keys(raw).forEach((y) => { o[y] = buildYear(metric, raw[y], exp); });
    return o;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [raw, metric, expKey]);

  /* ---------- every number of the page: the lines cut by financial year and month ---------- */
  const base = useMemo(() => FY_LIST.flatMap((y) => data[y]?.lines || []), [data, FY_LIST]);
  const meta = useMemo(() => Object.assign({}, ...FY_LIST.map((y) => data[y]?.meta || {})) as MonthMeta, [data, FY_LIST]);
  const curIdx = fyIdx(CUR_M), asFrac = Math.min(1, (+today.slice(8, 10) || 1) / daysInMonth(CUR_M));
  /* bills: Σ nb is exact for a year / month / party / executive; inside a category or design each row's own bills (n) count */
  const cnt = (ls: Line[], byDesign = false) => ls.reduce((a, l) => a + (def.distinct && !byDesign ? num(l.nb) : l.n), 0);
  const S = useMemo(() => {
    const byY: Record<string, { amt: number; qty: number; n: number }[]> = {};
    yrs.forEach((y) => { byY[y] = Array.from({ length: 12 }, () => ({ amt: 0, qty: 0, n: 0 })); });
    base.forEach((l) => { const o = byY[fyOfMonth(l.k)]?.[fyIdx(l.k)]; if (o) { o.amt += l.amt; o.qty += l.qty; o.n += l.n; } });
    const val = (y: string, i: number, f: 'amt' | 'qty' | 'n' = 'amt') => byY[y]?.[i]?.[f] || 0;
    const has = (y: string, i: number) => !!(byY[y]?.[i] && (byY[y][i].amt || byY[y][i].n));
    const months = (y: string) => Array.from({ length: y === FY_CUR ? curIdx + 1 : 12 }, (_, i) => i);
    const full = (y: string, f: 'amt' | 'qty' | 'n' = 'amt') => months(y).reduce((a, i) => a + val(y, i, f), 0);
    const stage = (y: string, f: 'amt' | 'qty' | 'n' = 'amt') =>
      y === FY_CUR ? full(y, f) : Array.from({ length: curIdx }, (_, i) => val(y, i, f)).reduce((a, v) => a + v, 0) + val(y, curIdx, f) * asFrac;
    const cum = (y: string) => { let a = 0; return Array.from({ length: 12 }, (_, i) => { if (y === FY_CUR && i > curIdx) return null; a += val(y, i); return a; }); };
    const avg = (y: string, st2: boolean) => { const ix = months(y).filter((i) => (!st2 || i <= curIdx) && has(y, i)); return ix.length ? ix.reduce((a, i) => a + val(y, i), 0) / ix.length : 0; };
    const best = (y: string, st2: boolean) => { let b: number | null = null; months(y).forEach((i) => { if (st2 && i > curIdx) return; if (has(y, i) && (b == null || val(y, i) > val(y, b))) b = i; }); return b as number | null; };
    return { val, has, months, full, stage, cum, avg, best };
  }, [base, yrs, FY_CUR, curIdx, asFrac]);

  const isCur = fy === FY_CUR;
  const prevFy = FY_LIST[FY_LIST.indexOf(fy) + 1] || null, prev2Fy = FY_LIST[FY_LIST.indexOf(fy) + 2] || null;
  const ms = fyMonths(fy);
  const rangeOf = (y: string) => (isCur ? S.stage(y) : S.full(y));
  const focusTot = S.full(fy), prevTot = prevFy ? rangeOf(prevFy) : null, prev2Tot = prev2Fy ? rangeOf(prev2Fy) : null;
  const gap = prevTot != null ? focusTot - prevTot : null, gapPct = prevTot != null ? chg(focusTot, prevTot) : null;
  const elapsed = curIdx + asFrac, remaining = 12 - elapsed;
  const lastFull = S.full(FY_LIST[1]), lastStage = S.stage(FY_LIST[1]);
  const pace = isCur ? (lastStage > 0 ? (focusTot * lastFull) / lastStage : elapsed > 0 ? (focusTot / elapsed) * 12 : 0) : null;
  const need = isCur && prevFy && remaining > 0.2 ? Math.max(0, (S.full(prevFy) - focusTot) / remaining) : null;
  const paceRate = isCur && elapsed > 0 ? focusTot / elapsed : null;
  const inRange = (l: Line, y: string) => fyOfMonth(l.k) === y && (!isCur || fyIdx(l.k) <= curIdx);
  const focusLines = base.filter((l) => inRange(l, fy)), prevLines = prevFy ? base.filter((l) => inRange(l, prevFy)) : [];
  const dim0 = def.dims[0];
  const top = group(focusLines, dim0);
  const topPrev: Record<string, number> = Object.fromEntries(group(prevLines, dim0).map((g) => [g.k, g.amt]));
  const topTot = top.reduce((a, g) => a + g.amt, 0);

  /* ---------- tiles: each knows its figure for any year, so it opens into a three-year table ---------- */
  type Tile = { k: string; label: string; fmt: (v: number) => string; f: (y: string) => number; sub?: (y: string) => string; pick?: (y: string) => string | null; good?: 'up' | 'down' };
  const tiles: Tile[] = [];
  const linesOf = (y: string) => base.filter((l) => inRange(l, y));
  tiles.push({ k: 'avg', label: 'Monthly average', fmt, f: (y) => S.avg(y, isCur), sub: (y) => `${S.months(y).filter((i) => (!isCur || i <= curIdx) && S.has(y, i)).length} months` });
  tiles.push({
    k: 'best', label: 'Best month', fmt, f: (y) => { const b = S.best(y, isCur); return b == null ? 0 : S.val(y, b); },
    sub: (y) => { const b = S.best(y, isCur); return b == null ? '—' : mLblY(fyMonths(y)[b]); },
    pick: (y) => { const b = S.best(y, isCur); return b == null ? null : fyMonths(y)[b]; },
  });
  tiles.push({ k: 'n', label: def.count, fmt: fyN, f: (y) => cnt(linesOf(y)) });
  if (def.qty) tiles.push({ k: 'qty', label: def.qty.lbl, fmt: def.qty.fmt, f: (y) => (isCur ? S.stage(y, 'qty') : S.full(y, 'qty')) });
  (def.extras ? def.extras(focusLines, meta) : []).forEach((x, i) => {
    if (x.num == null) return;
    tiles.push({ k: x.k, label: x.label, fmt: x.fmt, f: (y) => { const e = def.extras!(linesOf(y), meta)[i]; return e && e.num != null ? e.num : 0; } });
  });
  const xSum = (y: string, f: 'coll' | 'tgt', frac: boolean) =>
    fyMonths(y).reduce((a, m, i) => (y === FY_CUR && i > curIdx ? a : a + num(cross[y]?.[f]?.[m]) * (frac && y !== FY_CUR && isCur && i === curIdx ? asFrac : frac && y !== FY_CUR && isCur && i > curIdx ? 0 : 1)), 0);
  if (def.xcoll && Object.keys(cross[fy]?.coll || {}).length) {
    tiles.push({ k: 'eff', label: 'Collected vs billed', fmt: (v) => `${Math.round(v)}%`, good: 'up', f: (y) => { const b = rangeOf(y), c = xSum(y, 'coll', true); return b > 0 ? (c / b) * 100 : 0; }, sub: (y) => `${L(xSum(y, 'coll', true))} of ${L(rangeOf(y))}` });
  }
  if (def.xcoll && xSum(fy, 'tgt', false) > 0) {
    tiles.push({ k: 'tgt', label: 'Achievement vs target', fmt: (v) => `${Math.round(v)}%`, good: 'up', f: (y) => { const t = xSum(y, 'tgt', false); return t > 0 ? ((y === FY_CUR ? S.stage(y) : S.full(y)) / t) * 100 : 0; }, sub: (y) => `${fmt(y === FY_CUR ? S.stage(y) : S.full(y))} of ${fmt(xSum(y, 'tgt', false))}` });
  }

  /* ---------- insights: three short lines ---------- */
  const insights: string[] = [];
  if (prevFy && prevTot != null && prevTot > 0) insights.push(`${gap! >= 0 ? 'Ahead of ' : 'Behind '}${fyLbl(prevFy)} by ${fmt(Math.abs(gap!))}${isCur ? ' at this stage' : ''} (${pctTxt(gapPct)})`);
  if (pace != null && prevFy && S.full(prevFy) > 0) insights.push(`On pace for ${fmt(pace)} — would ${pace >= S.full(prevFy) ? 'pass ' : 'fall short of '}${fyLbl(prevFy)} (${fmt(S.full(prevFy))})`);
  if (prevTot != null && prev2Tot != null && prevTot > 0 && prev2Tot > 0) {
    if (focusTot > prevTot && prevTot > prev2Tot) insights.push(`Up on both earlier years${isCur ? ' at this stage' : ''} — third year of growth`);
    else if (focusTot < prevTot && prevTot < prev2Tot) insights.push(`Below both earlier years${isCur ? ' at this stage' : ''}`);
  }
  if (top.length > 1 && topTot > 0 && top[0].amt / topTot >= 0.5) insights.push(`${top[0].k} accounts for ${Math.round((top[0].amt / topTot) * 100)}% of ${def.noun}`);
  const bI = S.best(fy, isCur);
  if (bI != null && insights.length < 3) insights.push(`Best month${isCur ? ' so far: ' : ': '}${mLblY(ms[bI])} (${fmt(S.val(fy, bI))})`);

  const colorOf = (y: string) => (y === fy ? col : y === FY_CUR ? C.ink : GREYS[yrs.indexOf(y)] || C.faint);
  const pick = (m: string) => { setMonth((x) => (x === m ? null : m)); setShowLines(false); };
  const mIdx = month ? ms.indexOf(month) : -1;
  const openDetail = (m?: string) => { if (m !== undefined) setMonth(m); setView('detail'); setShowLines(false); };
  const goYear = (f: string) => { setFy(f); setMonth(null); setPath([]); setTile(null); setShowLines(false); };

  /* ---------- detail scope ---------- */
  const matches = (l: Line, ps: { dim: string; val: string }[]) => ps.every((p) => (l.d[p.dim] || '—') === p.val);
  const scoped = base.filter((l) => matches(l, path));
  const fyLines = scoped.filter((l) => fyOfMonth(l.k) === fy);
  const scopeLines = month ? fyLines.filter((l) => l.k === month) : fyLines;
  const prevScope = prevFy ? scoped.filter((l) => fyOfMonth(l.k) === prevFy && (month ? fyIdx(l.k) === ms.indexOf(month) : !isCur || fyIdx(l.k) <= curIdx)) : [];
  const dimsLeft = def.dims.filter((d) => !path.some((p) => p.dim === d));
  const dim = dimSel && dimsLeft.includes(dimSel) ? dimSel : dimsLeft[0];
  const leaf = !dim, listing = showLines || leaf;
  const rows = dim ? group(scopeLines, dim) : [];
  const prevRows: Record<string, number> = dim && prevFy ? Object.fromEntries(group(prevScope, dim).map((g) => [g.k, g.amt])) : {};
  const inDesign = (d?: string) => d === 'cat' || d === 'art' || path.some((p) => p.dim === 'cat' || p.dim === 'art');
  const scopeTot = sumA(scopeLines), scopeN = cnt(scopeLines, inDesign()), scopeQ = scopeLines.reduce((a, l) => a + l.qty, 0);
  const cntOf = (n: number) => { const c = def.count.toLowerCase(); return n === 1 ? c.replace(/s$/, '') : c; };
  /* the records behind the scope are loaded only when they are opened: the month on screen, else the year */
  const [recFrom, recTo] = month ? [`${month}-01`, monthEnd(month) > today ? today : monthEnd(month)] : yearRange(fy);
  const recKey = `${metric}|${recFrom}|${recTo}`, wantRecs = view === 'detail' && listing && recFrom <= recTo;
  const entries = listing && recs.key === recKey
    ? recs.lines.filter((l) => matches(l, path)).sort((a, b) => b.date.localeCompare(a.date) || b.amt - a.amt)
    : [];

  backRef.current = () => {
    if (view === 'detail') {
      if (showLines && !leaf) setShowLines(false);
      else if (path.length) setPath(path.slice(0, -1));
      else setView('overview');
      return true;
    }
    if (month) { setMonth(null); return true; }
    return false;
  };
  useEffect(() => () => { backRef.current = null; }, [backRef]);

  useEffect(() => {
    if (!wantRecs) return;
    let alive = true;
    setRecs({ key: recKey, lines: [], loading: true, error: '', note: '' });
    fetch(REC_SECTION[metric], recFrom, recTo)
      .then((r) => alive && setRecs({
        key: recKey, lines: recLines(metric, toItems(REC_SECTION[metric], r.items), exp), loading: false, error: '',
        note: r.truncated ? 'Only the first 20,000 records of this period are listed — open a month to see all of its records.' : '',
      }))
      .catch((e: any) => alive && setRecs({ key: recKey, lines: [], loading: false, error: e?.message || 'Unable to load the records.', note: '' }));
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wantRecs, recKey, fetch, expKey]);

  const cur = data[FY_CUR];
  /* a cost metric needs the Expense module's rates before a rupee can be shown */
  if (!cur || (isCost(metric) && exp.loading)) return <View style={[ui.card, { padding: 16 }]}><StateBox loading /></View>;
  if (cur.error) return <View style={[ui.card, { padding: 16 }]}><StateBox error={cur.error} /></View>;

  const sec = (t: string, right?: string | null) => (
    <View style={s.secRow}>
      <Text style={s.secT}>{t}</Text>
      {right ? <Text style={s.secR}>{right}</Text> : null}
    </View>
  );
  const stageLbl = `${mShort(ms[0])}–${mShort(ms[curIdx])} to ${dLbl(today)}`;
  const tileCols = boxW >= 700 ? 4 : boxW >= 520 ? 3 : 2;
  const tileW = boxW > 0 ? (boxW - 8 * (tileCols - 1)) / tileCols : 150;

  /* ---------- charts (scroll sideways on a phone, like the design) ---------- */
  const CW = Math.max(boxW - 14, 560), CH = 200, PX = 26, PT = 14, PB = 22;
  const xs = (i: number) => PX + (i / 11) * (CW - PX * 2);
  const cums = yrs.map((y) => S.cum(y));
  const cMax = Math.max(1, ...cums.flat().map((v) => v || 0));
  const cy = (v: number) => PT + (CH - PT - PB) * (1 - v / cMax);
  const chase = (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <Svg width={CW} height={CH}>
        <SvgLine x1={xs(curIdx)} x2={xs(curIdx)} y1={PT} y2={CH - PB} stroke={C.mut} strokeDasharray="4 4" />
        {yrs.map((y, yi) => {
          const pts = cums[yi].map((v, i) => (v == null ? null : `${xs(i).toFixed(1)},${cy(v).toFixed(1)}`)).filter(Boolean) as string[];
          return pts.length ? <Path key={y} d={`M${pts.join('L')}`} fill="none" stroke={colorOf(y)} strokeWidth={y === fy ? 3 : 2} strokeLinejoin="round" strokeLinecap="round" /> : null;
        })}
        {cums[2].map((v, i) => (v == null ? null : <Circle key={i} cx={xs(i)} cy={cy(v)} r={2.5} fill={colorOf(yrs[2])} />))}
        {ms.map((m, i) => <SvgText key={m} x={xs(i)} y={CH - 6} fontSize={10} fill={C.faint} textAnchor="middle" fontFamily={FONT}>{mShort(m)}</SvgText>)}
      </Svg>
    </ScrollView>
  );
  const BW = Math.max(boxW - 14, 600), BH = 190, slot = (BW - 16) / 12, bw = Math.max(4, (slot * 0.78) / 3 - 1);
  const mVals = (i: number) => yrs.map((y, yi) => (yi === 2 && y === FY_CUR && i > curIdx ? 0 : S.val(y, i)));
  const bMax = Math.max(1, ...Array.from({ length: 12 }, (_, i) => Math.max(...mVals(i))));
  const bars = (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <Svg width={BW} height={BH}>
        {ms.map((m, i) => {
          const x0 = 8 + i * slot + slot * 0.11;
          return (
            <React.Fragment key={m}>
              {mVals(i).map((v, yi) => {
                const h = ((BH - PT - PB) * v) / bMax;
                return <Rect key={yi} x={x0 + yi * (bw + 1)} y={BH - PB - h} width={bw} height={Math.max(h, v > 0 ? 1.5 : 0)} rx={2} fill={colorOf(yrs[yi])} opacity={mIdx >= 0 && mIdx !== i ? 0.35 : 1} />;
              })}
              <SvgText x={8 + i * slot + slot / 2} y={BH - 6} fontSize={10} fill={month === m ? col : C.faint} fontWeight={month === m ? '700' : '400'} textAnchor="middle" fontFamily={FONT}>{mShort(m)}</SvgText>
              <Rect x={8 + i * slot} y={0} width={slot} height={BH} fill="transparent" onPress={() => pick(m)} />
            </React.Fragment>
          );
        })}
      </Svg>
    </ScrollView>
  );

  /* ---------- overview ---------- */
  const overview = (
    <>
      <View style={[ui.card, { padding: 14, paddingBottom: 12, marginBottom: 10, borderLeftWidth: 3, borderLeftColor: col }]}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, alignItems: 'flex-start' }}>
          <View style={{ flexGrow: 1, flexShrink: 1, flexBasis: 200, minWidth: 0 }}>
            <Text style={s.kicker}>{def.measure} · {fyLbl(fy)}{isCur ? ' · to date' : ' · full year'}</Text>
            <Text style={s.big} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>{fmt(focusTot)}</Text>
            {prevFy && gap != null ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
                <Delta pct={gapPct} size={12} />
                <Text style={s.mutTxt}>{gap >= 0 ? '+' : '−'}{fmt(Math.abs(gap))} vs {fyLbl(prevFy)}{isCur ? ' at this stage' : ''}</Text>
              </View>
            ) : null}
            {pace != null ? (
              <Text style={[s.mutTxt, { marginTop: 4 }]}>
                Pace <Text style={s.b}>{fmt(pace)}</Text> for the full year{lastStage > 0 ? ' (seasonal)' : ''}{lastFull > 0 ? <> · {fyLbl(FY_LIST[1])} closed at <Text style={s.b}>{fmt(lastFull)}</Text></> : null}
              </Text>
            ) : null}
          </View>
          {insights.length ? (
            <View style={s.insights}>
              {insights.slice(0, 3).map((t, i) => (
                <View key={i} style={{ flexDirection: 'row', gap: 7, paddingVertical: 2 }}>
                  <Text style={{ color: col }}>•</Text>
                  <Text style={{ flex: 1, fontFamily: FONT, fontSize: 11, color: C.ink, lineHeight: 15.5 }}>{t}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>
        <View style={{ flexDirection: 'row', gap: 6, marginTop: 12 }}>
          {yrs.map((y, i) => {
            const focus = y === fy, fullV = S.full(y), stV = S.stage(y), prevY = yrs[i - 1], useStage = isCur || y === FY_CUR;
            const yoy = prevY ? chg(useStage ? stV : fullV, useStage ? S.stage(prevY) : S.full(prevY)) : null;
            const failed = !!raw[y]?.error, pending = !raw[y];
            return (
              <Pressable key={y} onPress={() => goYear(y)} accessibilityRole="button" style={[s.yearCell, focus ? { backgroundColor: col, borderColor: col } : null]}>
                <Text style={{ fontFamily: FONT, fontSize: 9, fontWeight: '800', color: focus ? '#fff' : C.mut }} numberOfLines={1}>{fyLbl(y)}{y === FY_CUR ? ' · to date' : ''}</Text>
                <Text style={{ fontFamily: FONT, fontSize: 14, fontWeight: '700', color: focus ? '#fff' : C.ink, marginTop: 2 }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                  {pending ? '…' : failed ? 'no data' : fmt(fullV)}
                </Text>
                {y !== FY_CUR && !failed && !pending ? (
                  <Text style={{ fontFamily: FONT, fontSize: 9, color: focus ? '#fff' : C.mut, lineHeight: 12.5 }}>at this stage{'\n'}<Text style={{ fontWeight: '700' }}>{fmt(stV)}</Text></Text>
                ) : null}
                <View style={{ marginTop: 3 }}>
                  {yoy == null ? <Text style={{ fontFamily: FONT, fontSize: 9, color: focus ? '#fff' : C.faint }}>—</Text>
                    : <Delta pct={yoy} size={9.5} lbl={`vs ${prevY.slice(2)}`} color={focus ? '#fff' : undefined} />}
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {tiles.map((t) => {
          const v = t.f(fy), pv = prevFy ? t.f(prevFy) : null, d = prevFy && pv != null && pv > 0 ? chg(v, pv) : null, open = tile === t.k;
          const spark = t.k === 'avg' ? ms.map((_, i) => (isCur && i > curIdx ? 0 : S.val(fy, i))) : null;
          const sMax = spark ? Math.max(1, ...spark) : 1;
          return (
            <View key={t.k} style={[s.tile, { width: open ? '100%' : tileW }, open && { borderColor: col }]}>
              <Pressable onPress={() => setTile(open ? null : t.k)} accessibilityRole="button">
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={s.tileLbl} numberOfLines={2}>{t.label}</Text>
                  <Text style={{ fontSize: 9, color: C.faint }}>{open ? '▴' : '▾'}</Text>
                </View>
                <Text style={[s.tileVal, { color: col }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{t.fmt(v)}</Text>
                {prevFy ? <View style={{ marginTop: 2 }}><Delta pct={d} lbl={`vs ${prevFy.slice(2)}`} invert={t.good === 'down'} /></View> : null}
                {t.sub ? <Text style={s.tileSub} numberOfLines={1}>{t.sub(fy)}</Text> : null}
                {spark ? (
                  <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 2, height: 22, marginTop: 6, maxWidth: 240 }}>
                    {spark.map((sv, i) => <View key={i} style={{ flex: 1, height: Math.max(2, Math.round((sv / sMax) * 22)), backgroundColor: col, opacity: i === mIdx ? 1 : 0.33, borderRadius: 1 }} />)}
                  </View>
                ) : null}
              </Pressable>
              {open ? (
                <View style={{ borderTopWidth: 1, borderTopColor: T.hair, marginTop: 10, paddingTop: 8 }}>
                  <View style={s.tRow}><Text style={[s.th, { flex: 1.3 }]}>Year</Text><Text style={[s.th, s.tr]}>{t.label}</Text><Text style={[s.th, s.tr]}>vs previous</Text></View>
                  {yrs.map((y, i) => {
                    const yv = t.f(y), py = yrs[i - 1] ? t.f(yrs[i - 1]) : null;
                    return (
                      <View key={y} style={s.tRow}>
                        <Text style={{ flex: 1.3, fontFamily: FONT, fontSize: 11, fontWeight: y === fy ? '800' : '500', color: y === fy ? col : C.ink }}>
                          {fyLbl(y)}<Text style={{ color: C.faint, fontWeight: '500' }}>{y === FY_CUR ? ' · to date' : isCur ? ' · at this stage' : ''}</Text>
                        </Text>
                        <Text style={[s.tr, { fontFamily: FONT, fontSize: 11, fontWeight: '700', color: C.ink }]}>{t.fmt(yv)}{t.k === 'best' && t.sub ? <Text style={{ color: C.faint, fontWeight: '500', fontSize: 9.5 }}> {t.sub(y)}</Text> : null}</Text>
                        <View style={[s.tr, { alignItems: 'flex-end' }]}><Delta pct={py != null && py > 0 ? chg(yv, py) : null} invert={t.good === 'down'} /></View>
                      </View>
                    );
                  })}
                  <View style={{ flexDirection: 'row', gap: 14, marginTop: 8 }}>
                    {t.pick && t.pick(fy) ? <Pressable onPress={() => pick(t.pick!(fy)!)} hitSlop={6}><Text style={s.link}>Open {mLblY(t.pick(fy)!)} ›</Text></Pressable> : null}
                    <Pressable onPress={() => openDetail()} hitSlop={6}><Text style={s.link}>Full breakdown ›</Text></Pressable>
                  </View>
                </View>
              ) : null}
            </View>
          );
        })}
      </View>

      {sec('Cumulative · the chase', "dashed line = today's stage")}
      <View style={[ui.card, { paddingTop: 10, paddingHorizontal: 6, paddingBottom: 6, marginBottom: 10 }]}>
        {chase}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 14, rowGap: 4, paddingHorizontal: 8, paddingTop: 8, paddingBottom: 4, alignItems: 'center' }}>
          {yrs.slice().reverse().map((y, i, arr) => {
            const v = S.stage(y), ref = arr[i + 1], d = ref ? chg(v, S.stage(ref)) : null;
            return (
              <View key={y} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <View style={{ width: 10, height: 3, borderRadius: 2, backgroundColor: colorOf(y) }} />
                <Text style={s.leg}>{fyLbl(y)} <Text style={s.b}>{fmt(v)}</Text></Text>
                {d != null ? <Delta pct={d} size={9.5} /> : null}
              </View>
            );
          })}
          <Text style={[s.leg, { color: C.faint }]}>at this stage · {stageLbl}</Text>
        </View>
        {need != null && prevFy && paceRate != null && S.full(prevFy) > 0 ? (
          <Text style={[s.mutTxt, { fontSize: 10.5, paddingHorizontal: 8, paddingVertical: 4, lineHeight: 15 }]}>
            {S.full(prevFy) > focusTot
              ? <>To pass {fyLbl(prevFy)} ({fmt(S.full(prevFy))}): <Text style={s.b}>{fmt(need)}</Text>/month needed over the remaining {Math.round(remaining * 10) / 10} months · current pace <Text style={[s.b, { color: paceRate >= need ? C.today : C.over }]}>{fmt(paceRate)}</Text>/month</>
              : <>{fyLbl(prevFy)}'s full year ({fmt(S.full(prevFy))}) is already passed · current pace <Text style={s.b}>{fmt(paceRate)}</Text>/month</>}
          </Text>
        ) : null}
      </View>

      {sec('Month by month · three years', 'tap a month')}
      <View style={[ui.card, { paddingTop: 10, paddingHorizontal: 6, paddingBottom: 4, marginBottom: 10 }]}>
        {bars}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 5, paddingHorizontal: 6, paddingTop: 8, paddingBottom: 6 }}>
          {ms.map((m, i) => <Chip key={m} small on={month === m} dim={!S.has(fy, i)} color={col} l={mShort(m)} fn={() => pick(m)} />)}
        </ScrollView>
        {month ? (
          <View style={{ borderTopWidth: 1, borderTopColor: T.hair, marginHorizontal: 6, paddingHorizontal: 4, paddingTop: 10, paddingBottom: 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
              <Text style={{ fontFamily: FONT, fontSize: 14, fontWeight: '800', color: C.ink }}>{mLblY(month)}</Text>
              <Text style={{ fontFamily: FONT, fontSize: 16, fontWeight: '800', color: col }}>{fmt(S.val(fy, mIdx))}</Text>
              {focusTot > 0 ? <Text style={{ fontFamily: FONT, fontSize: 10.5, color: C.faint }}>{Math.round((S.val(fy, mIdx) / focusTot) * 100)}% of the year</Text> : null}
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 14, rowGap: 4, marginTop: 4 }}>
              {yrs.filter((y) => y !== fy).map((y) => {
                const yv = S.val(y, mIdx);
                return (
                  <View key={y} style={{ flexDirection: 'row', gap: 5, alignItems: 'center' }}>
                    <Text style={s.leg}>{mLblY(fyMonths(y)[mIdx])} <Text style={s.b}>{fmt(yv)}</Text></Text>
                    {yv > 0 ? <Delta pct={chg(S.val(fy, mIdx), yv)} size={9.5} /> : null}
                  </View>
                );
              })}
            </View>
            <View style={{ marginTop: 8 }}>
              {group(base.filter((l) => l.k === month), dim0).slice(0, 3).map((g, i) => {
                const t = S.val(fy, mIdx);
                return (
                  <View key={g.k} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 3 }}>
                    <Text style={{ width: 10, fontFamily: FONT, fontSize: 10, color: C.faint }}>{i + 1}</Text>
                    <Text style={{ flex: 1, fontFamily: FONT, fontSize: 11, color: C.ink }} numberOfLines={1}>{g.k}</Text>
                    <Text style={{ fontFamily: FONT, fontSize: 10, color: C.faint }}>{t > 0 ? `${Math.round((g.amt / t) * 100)}%` : ''}</Text>
                    <Text style={{ fontFamily: FONT, fontSize: 11, fontWeight: '700', color: C.ink }}>{fmt(g.amt)}</Text>
                  </View>
                );
              })}
            </View>
            <Pressable onPress={() => openDetail(month)} hitSlop={6}><Text style={[s.link, { marginTop: 6 }]}>Open {mLblY(month)} in full ›</Text></Pressable>
          </View>
        ) : null}
      </View>

      {sec(`Top ${dimLbl(dim0).toLowerCase()}${dimLbl(dim0).endsWith('s') ? '' : 's'} · ${fyLbl(fy)}${isCur ? ' to date' : ''}`, prevFy ? `grey = ${fyLbl(prevFy)}${isCur ? ' at this stage' : ''}` : null)}
      <View style={[ui.card, { paddingHorizontal: 12, paddingTop: 4, paddingBottom: 8, marginBottom: 10 }]}>
        {top.slice(0, 5).map((g, i) => {
          const sh = topTot > 0 ? (g.amt / topTot) * 100 : 0, pv = topPrev[g.k], mx = Math.max(top[0].amt, ...Object.values(topPrev), 1);
          return (
            <Pressable key={g.k} onPress={() => { setPath([{ dim: dim0, val: g.k }]); setView('detail'); }} accessibilityRole="button" style={s.topRow}>
              <Text style={{ width: 14, fontFamily: FONT, fontSize: 11, color: C.faint }}>{i + 1}</Text>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ fontFamily: FONT, fontSize: 12, fontWeight: '700', color: C.ink }} numberOfLines={1}>{g.k}</Text>
                <View style={{ gap: 2, marginTop: 4, maxWidth: 260 }}>
                  <View style={s.track}><View style={{ width: `${Math.min(100, (g.amt / mx) * 100)}%`, height: '100%', backgroundColor: col }} /></View>
                  {prevFy ? <View style={[s.track, { height: 3 }]}><View style={{ width: `${Math.min(100, ((pv || 0) / mx) * 100)}%`, height: '100%', backgroundColor: GREYS[1] }} /></View> : null}
                </View>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ fontFamily: FONT, fontSize: 12, fontWeight: '700', color: C.ink }}>{fmt(g.amt)}</Text>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  <Text style={{ fontFamily: FONT, fontSize: 9.5, color: C.faint }}>{Math.round(sh)}%</Text>
                  {prevFy && pv > 0 ? <Delta pct={chg(g.amt, pv)} size={9.5} /> : null}
                </View>
              </View>
            </Pressable>
          );
        })}
        {!top.length ? <Text style={s.none}>No {def.noun} recorded in {fyLbl(fy)}.</Text> : null}
        <Pressable onPress={() => openDetail()} accessibilityRole="button" style={{ flexDirection: 'row', justifyContent: 'space-between', paddingTop: 9, paddingBottom: 2 }}>
          <Text style={s.link}>Full breakdown · {def.dims.map(dimLbl).join(' · ')} ›</Text>
        </Pressable>
      </View>
    </>
  );

  /* ---------- detail: breakdown and records ---------- */
  const prevAmt = sumA(prevScope);
  const detail = (
    <View style={[ui.card, { marginBottom: 10 }]}>
      <View style={[s.crumbBar, { backgroundColor: col }]}>
        <Pressable onPress={() => { setView('overview'); setPath([]); setShowLines(false); }} hitSlop={6}><Text style={s.crumb}>{fyLbl(fy)}</Text></Pressable>
        {month ? <><Text style={s.crumbSep}>›</Text><Pressable onPress={() => { setPath([]); setShowLines(false); }} hitSlop={6}><Text style={s.crumb}>{mLblY(month)}</Text></Pressable></> : null}
        {path.map((p, i) => (
          <React.Fragment key={i}>
            <Text style={s.crumbSep}>›</Text>
            <Pressable onPress={() => { setPath(path.slice(0, i + 1)); setShowLines(false); }} hitSlop={6} style={{ maxWidth: 160 }}><Text style={s.crumb} numberOfLines={1}>{p.val}</Text></Pressable>
          </React.Fragment>
        ))}
        <View style={{ flex: 1 }} />
        <Text style={{ fontFamily: FONT, fontSize: 11.5, fontWeight: '700', color: '#fff' }}>{fmt(scopeTot)}</Text>
        <Text style={{ fontFamily: FONT, fontSize: 9.5, color: '#fff', opacity: 0.8 }}>{def.qty ? def.qty.fmt(scopeQ) : `${fyN(scopeN)} ${cntOf(scopeN)}`}</Text>
      </View>
      <View style={{ paddingHorizontal: 12, paddingTop: 8, paddingBottom: 10 }}>
        {month == null ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 5, paddingBottom: 8 }}>
            {ms.map((m, i) => <Chip key={m} small on={false} dim={!S.has(fy, i)} color={col} l={mShort(m)} fn={() => pick(m)} />)}
          </ScrollView>
        ) : null}
        {prevFy ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 5, paddingBottom: 8 }}>
            <Text style={[s.mutTxt, { fontSize: 10.5 }]}>vs {fyLbl(prevFy)}{month ? ` · ${mLblY(fyMonths(prevFy)[ms.indexOf(month)])}` : isCur ? ' at this stage' : ''}: <Text style={s.b}>{fmt(prevAmt)}</Text></Text>
            <Delta pct={chg(scopeTot, prevAmt)} />
          </View>
        ) : null}
        {dimsLeft.length ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, alignItems: 'center', paddingBottom: 8 }}>
            <Text style={{ fontFamily: FONT, fontSize: 9.5, fontWeight: '800', color: C.mut, letterSpacing: 0.4 }}>BY</Text>
            {dimsLeft.map((d) => <Chip key={d} small on={dim === d} color={col} l={dimLbl(d)} fn={() => { setDimSel(d); setShowLines(false); }} />)}
          </ScrollView>
        ) : null}
        {dim && !listing ? (
          <>
            <View style={s.dHead}>
              <View style={{ width: 14 }} /><Text style={[ui.rowHeadText, { flex: 1 }]}>{dimLbl(dim)}</Text>
              <Text style={[ui.rowHeadText, s.dCol]}>{def.qty ? def.qty.lbl : def.count}</Text><Text style={[ui.rowHeadText, s.dCol]}>{def.measure}</Text>
            </View>
            {!rows.length ? <Text style={s.none}>No {def.noun} recorded here.</Text> : null}
            {rows.map((r, i) => {
              const sh = scopeTot > 0 ? (r.amt / scopeTot) * 100 : 0, pv = prevRows[r.k];
              return (
                <Pressable key={r.k} onPress={() => { setPath([...path, { dim, val: r.k }]); setShowLines(false); }} accessibilityRole="button" style={({ pressed }) => [s.dRow, pressed && { backgroundColor: '#F9F7F4' }]}>
                  <Text style={{ width: 14, fontFamily: FONT, fontSize: 11, color: C.faint }}>{i + 1}</Text>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={{ fontFamily: FONT, fontSize: 12, fontWeight: '700', color: C.ink }} numberOfLines={1}>{r.k}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3, flexWrap: 'wrap' }}>
                      <View style={[s.track, { flex: 1, maxWidth: 220, minWidth: 40 }]}><View style={{ width: `${Math.min(100, sh)}%`, height: '100%', backgroundColor: col, opacity: 0.75 }} /></View>
                      <Text style={{ fontFamily: FONT, fontSize: 9.5, color: C.faint }}>{Math.round(sh)}%</Text>
                      {prevFy ? <Text style={{ fontFamily: FONT, fontSize: 9.5, color: C.faint }}>{fyLbl(prevFy)} {fmt(pv || 0)}</Text> : null}
                      {prevFy && pv > 0 ? <Delta pct={chg(r.amt, pv)} size={9.5} /> : null}
                    </View>
                  </View>
                  <Text style={[s.dCol, { fontFamily: FONT, fontSize: 11, color: C.mut }]}>{def.qty ? def.qty.fmt(r.qty) : fyN(def.distinct ? cnt(scopeLines.filter((l) => (l.d[dim] || '—') === r.k), inDesign(dim)) : r.n)}</Text>
                  <Text style={[s.dCol, { fontFamily: FONT, fontSize: 12, fontWeight: '700', color: C.ink }]}>{fmt(r.amt)}</Text>
                </Pressable>
              );
            })}
          </>
        ) : null}
        {listing ? (
          <>
            <View style={s.dHead}><Text style={[ui.rowHeadText, { flex: 1 }]}>{def.count}</Text><Text style={[ui.rowHeadText, s.dCol]}>{def.measure}</Text></View>
            {recs.key !== recKey || recs.loading ? <StateBox loading minHeight={60} /> : recs.error ? <StateBox error={recs.error} minHeight={60} /> : !entries.length ? <Text style={s.none}>Nothing recorded.</Text> : null}
            {recs.key === recKey && recs.note ? <Text style={{ fontFamily: FONT, fontSize: 10.5, color: C.faint, paddingTop: 6 }}>{recs.note}</Text> : null}
            {entries.slice(0, 80).map((l, i) => (
              <View key={i} style={s.dRow}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ fontFamily: FONT, fontSize: 12, fontWeight: '700', color: C.ink }} numberOfLines={1}><Text style={{ color: T.copper, fontSize: 11 }}>{l.ref}</Text>{l.sub ? ` · ${l.sub}` : ''}</Text>
                  <Text style={{ fontFamily: FONT, fontSize: 9.5, color: C.mut, marginTop: 1 }}>{fmtDY(l.date)}{def.qty && l.qty ? ` · ${def.qty.fmt(l.qty)}` : ''}</Text>
                </View>
                <Text style={[s.dCol, { fontFamily: FONT, fontSize: 12, fontWeight: '700', color: C.ink }]}>{fmt(l.amt)}</Text>
              </View>
            ))}
            {entries.length > 80 ? <Text style={{ fontFamily: FONT, fontSize: 10.5, color: C.faint, paddingTop: 8 }}>+{entries.length - 80} more — narrow the scope to see them all.</Text> : null}
          </>
        ) : null}
        {!leaf && scopeLines.length > 0 ? (
          <Pressable onPress={() => setShowLines((v) => !v)} accessibilityRole="button" style={s.showLines}>
            <Text style={s.link}>{showLines ? 'Back to breakdown' : `Show the ${fyN(scopeN)} ${cntOf(scopeN)}`}</Text>
            <Text style={{ color: C.faint }}>{showLines ? '▴' : '▾'}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );

  const failed = FY_LIST.filter((y) => data[y]?.error), notes = FY_LIST.filter((y) => data[y]?.note).map((y) => `${fyLbl(y)}: ${data[y].note}`);
  return (
    <View onLayout={(e) => setBoxW(e.nativeEvent.layout.width)} style={{ paddingBottom: 16 }}>
      <View style={s.head}>
        <Text style={s.headT} numberOfLines={1}>{def.icon} {def.title}{title ? ` · ${title}` : ''}</Text>
        <Text style={s.headS} numberOfLines={1}>
          {view === 'detail' ? [fyLbl(fy), month ? mLblY(month) : null, ...path.map((p) => p.val)].filter(Boolean).join(' › ') : `${fyLbl(fy)} · ${fyRange(fy)}${isCur ? ` · to ${dLbl(today)}` : ''}`}
        </Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 7, paddingTop: 2, paddingBottom: 10 }}>
        {FY_LIST.map((f, i) => <Chip key={f} on={fy === f} color={col} l={`${fyLbl(f)}${i === 0 ? ' · current' : ''}`} fn={() => goYear(f)} />)}
      </ScrollView>
      {view === 'detail' ? detail : overview}
      <Text style={s.foot}>
        {def.note} Every year is read from that year's own ERP books.{failed.length ? ` ${failed.map(fyLbl).join(' and ')} could not be read and ${failed.length > 1 ? 'are' : 'is'} shown as no data.` : ''}
        {notes.length ? ` ${notes.join('. ')}.` : ''} {isCur ? `"At this stage" means ${stageLbl} of each year, so every comparison is like-for-like.` : 'Comparisons are full year against full year.'}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  head: { backgroundColor: T.nav, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 10 },
  headT: { fontFamily: FONT, fontSize: 14, fontWeight: '800', color: '#fff' },
  headS: { fontFamily: FONT, fontSize: 10.5, color: '#fff', opacity: 0.8, marginTop: 1 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, backgroundColor: '#fff', borderWidth: 1, borderColor: T.border },
  fyBtn: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 10, borderWidth: 1 },
  kicker: { fontFamily: FONT, fontSize: 9.5, fontWeight: '800', color: C.faint, textTransform: 'uppercase', letterSpacing: 0.8 },
  big: { fontFamily: FONT, fontSize: 30, fontWeight: '800', color: C.ink, marginTop: 4, fontVariant: ['tabular-nums'] },
  mutTxt: { fontFamily: FONT, fontSize: 11, color: C.mut },
  b: { fontWeight: '700', color: C.ink },
  insights: { flexGrow: 1, flexShrink: 1, flexBasis: 220, minWidth: 0, backgroundColor: T.bg, borderRadius: 10, paddingHorizontal: 11, paddingVertical: 9 },
  yearCell: { flex: 1, minWidth: 0, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, backgroundColor: T.bg, borderWidth: 1, borderColor: T.border },
  tile: { backgroundColor: '#fff', borderWidth: 1, borderColor: T.border, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 },
  tileLbl: { flex: 1, fontFamily: FONT, fontSize: 8.5, fontWeight: '700', color: C.mut, textTransform: 'uppercase', letterSpacing: 0.5 },
  tileVal: { fontFamily: FONT, fontSize: 17, fontWeight: '700', marginTop: 3, fontVariant: ['tabular-nums'] },
  tileSub: { fontFamily: FONT, fontSize: 9.5, color: C.faint, marginTop: 2 },
  tRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 2 },
  th: { fontFamily: FONT, fontSize: 8.5, fontWeight: '700', color: C.faint, textTransform: 'uppercase', letterSpacing: 0.5 },
  tr: { flex: 1, textAlign: 'right' },
  link: { fontFamily: FONT, fontSize: 11, fontWeight: '700', color: C.bill },
  secRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, marginTop: 16, marginBottom: 6, marginHorizontal: 2 },
  secT: { fontFamily: FONT, fontSize: 9.5, fontWeight: '800', color: C.faint, textTransform: 'uppercase', letterSpacing: 0.8, flexShrink: 1 },
  secR: { fontFamily: FONT, fontSize: 9.5, color: C.faint, textAlign: 'right' },
  leg: { fontFamily: FONT, fontSize: 10.5, color: C.mut },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: T.hair },
  track: { height: 5, backgroundColor: T.hair, borderRadius: 3, overflow: 'hidden' },
  none: { fontFamily: FONT, fontSize: 12, color: C.faint, textAlign: 'center', paddingVertical: 14 },
  crumbBar: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', paddingHorizontal: 12, paddingVertical: 9 },
  crumb: { fontFamily: FONT, fontSize: 11, fontWeight: '800', color: '#fff' },
  crumbSep: { color: '#fff', opacity: 0.6 },
  dHead: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: T.hair },
  dRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: T.hair },
  dCol: { minWidth: 64, textAlign: 'right' },
  showLines: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 9, paddingBottom: 2, marginTop: 6 },
  foot: { fontFamily: FONT, fontSize: 10, color: C.faint, lineHeight: 15, paddingHorizontal: 4, paddingTop: 14 },
});
