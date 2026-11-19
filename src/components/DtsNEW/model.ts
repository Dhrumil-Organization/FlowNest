// FILE: src/components/DtsNEW/model.ts
// Types, date helpers, formatters and the row -> report-item mapping of the DTS screen.
// DTS = Dress Material · Technical Textile · Sportswear. A record belongs to DTS by the item (category)
// of its design; which items count is decided ONLY in the backend (DtsDashboardController).
//
// The screen never calculates a business figure of its own: it adds up, groups and filters the rows the
// API returned (the same thing the artifact's DTS hub does with its records).

export type DtsSection =
  | 'meta' | 'sales' | 'booked' | 'production' | 'collection' | 'outstanding' | 'beam_shortage'
  | 'payments_made' | 'monthly' | 'pickmetres' | 'outsourcing' | 'outsourcing_yarn' | 'mill_stock' | 'target' | 'fy'
  | 'jobwork' | 'jobwork_rolls' | 'yarn_usage' | 'production_rolls';

/** the hub's cached loader: `metric` is used by section 'fy'; 'uid:<n>' in its place names the inward of 'jobwork_rolls' */
export type DtsFetch = (section: DtsSection, from?: string, to?: string, metric?: string) => Promise<DtsResponse>;

/** the DTS targets of one month (section 'target') — null = no billing target entered for that month */
export type DtsTarget = {
  month: string; company_target: number | null; target: number | null; collection_target: number | null;
  exec_targets: { name: string; target: number }[]; category_targets: { name: string; target: number }[];
  dts_share: number; dts_billed_fy: number; all_billed_fy: number; targets_available: boolean;
};

export type DtsRightKey =
  | 'sales' | 'production' | 'collection' | 'outstanding' | 'beam_shortage' | 'payments_made' | 'samples' | 'target'
  | 'expense' | 'outsourcing' | 'stock';

export type DtsResponse = {
  section: DtsSection;
  from: string;
  to: string;
  fy: { from: string; to: string; yearno: number };
  fromClamped: boolean;
  truncated: boolean;
  items: any[];
  meta: Record<string, any>;
  permissions: { screen: boolean; sections: Partial<Record<DtsRightKey, boolean>> };
};

export type DtsCategory = { code: string; name: string };

/** one record of a report: `d` holds the dimensions it can be grouped / filtered by */
export type DtsItem = {
  id: string;
  date: string;
  v: number;
  aux?: number;
  q?: number;
  d: Record<string, string>;
  label: string;
  sub: string;
  aside?: string;
  warn?: boolean;
  sec?: 'A' | 'B';
  /** pick-metres (metres x design picks) of a production record */
  pm?: number;
  /** extra figures of a record, by name (yarn account: issued / consumed / shortage / wastage) */
  x?: Record<string, number>;
};

export type DtsMonthRow = {
  month: string; label: string; booked: number; billed: number; qty: number; collected: number;
  is_future: boolean; categories: { name: string; amount: number }[];
  /** the month's company billing target, the DTS part of it, and the DTS collection target (null = no target entered) */
  company_target: number | null; target: number | null; collection_target: number | null;
  exec_targets: { name: string; target: number }[]; category_targets: { name: string; target: number }[];
};

export type PathStep = { k: string; v: string };
export type PeriodKey = 'today' | 'yesterday' | 'month' | 'custom' | 'fy';
export type DrillInit = {
  period?: PeriodKey; from?: string; to?: string; path?: PathStep[]; sel?: string | null; kind?: string;
  /** Outsourcing hub / Yarn ledger: the view and the supplier › design › challan it is on */
  hub?: { view?: 'recv' | 'chg' | 'yout' | 'ybal'; worker?: string; art?: string; chal?: string };
};

export const DTS = {
  lbl: 'DTS',
  long: 'Dress Material · Technical Textile · Sportswear',
  color: '#3A568A',
};

export const DIM_LBL: Record<string, string> = {
  cat: 'Category', art: 'Design', shed: 'Shed', secm: 'Machines', party: 'Party', vendor: 'Vendor',
  exec: 'Executive', mc: 'Machine', head: 'Cost head', worker: 'Job worker', where: 'Location', yarn: 'Yarn',
};

export const SEC_MACH = {
  A: { lbl: 'Section A machines', sub: 'Waterjet · S. Rapier 230 cm' },
  B: { lbl: 'Section B machines', sub: 'M Weaves · S. Rapier 190 cm' },
} as const;

/* ------------------------------------------------------------------ */
/* dates (local calendar, ISO strings)                                 */
/* ------------------------------------------------------------------ */

const pad = (n: number) => String(n).padStart(2, '0');
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MON_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export const isoOf = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const todayS = () => isoOf(new Date());
export const dateOf = (iso: string) => {
  const [y, m, d] = String(iso || '').slice(0, 10).split('-').map(Number);
  return new Date(y || 2000, (m || 1) - 1, d || 1);
};
export const addDays = (iso: string, n: number) => {
  const d = dateOf(iso);
  d.setDate(d.getDate() + n);
  return isoOf(d);
};
export const daysBetween = (a: string, b: string) => Math.round((dateOf(b).getTime() - dateOf(a).getTime()) / 86400000);
export const daysInMonth = (ym: string) => {
  const [y, m] = ym.split('-').map(Number);
  return new Date(y, m, 0).getDate();
};
export const monthEnd = (ym: string) => `${ym}-${pad(daysInMonth(ym))}`;
export const fmtD = (iso: string) => (iso ? `${+iso.slice(8, 10)} ${MON[+iso.slice(5, 7) - 1]}` : '—');
export const fmtDY = (iso: string) => (iso ? `${fmtD(iso)} ${iso.slice(0, 4)}` : '—');
export const mLbl = (ym: string) => `${MON[+ym.slice(5, 7) - 1]} ${ym.slice(2, 4)}`;
export const mLong = (ym: string) => `${MON_LONG[+ym.slice(5, 7) - 1]} ${ym.slice(0, 4)}`;
/** a day ("2026-11-14") or a month ("2026-11") picked on a graph */
export const selLbl = (s: string | null) => (!s ? '' : s.length === 7 ? mLbl(s) : fmtDY(s));

export const fyStartOf = (iso: string) => {
  const y = +iso.slice(0, 4), m = +iso.slice(5, 7);
  return `${m >= 4 ? y : y - 1}-04-01`;
};
export const fyEndOf = (iso: string) => `${+fyStartOf(iso).slice(0, 4) + 1}-03-31`;
export const fyLabelOf = (iso: string) => {
  const y = +fyStartOf(iso).slice(0, 4);
  return `FY ${String(y).slice(2)}-${String(y + 1).slice(2)}`;
};

export const daysIn = (a: string, b: string) => {
  const out: string[] = [];
  let d = a;
  while (d <= b && out.length < 400) {
    out.push(d);
    d = addDays(d, 1);
  }
  return out;
};

export const PERIODS = (today: string): [PeriodKey, string][] => [
  ['today', 'Today'], ['yesterday', 'Yesterday'], ['month', 'This month'], ['custom', 'Custom'], ['fy', fyLabelOf(today)],
];

/**
 * [from, to, label, wholeMonth] of a period. A month or FY runs to its end, as on the owner dashboard
 * (records dated later in the period count).
 */
export function rangeOf(period: PeriodKey, from?: string, to?: string): [string, string, string, boolean] {
  const t = todayS();
  let f = t, u = t;
  if (period === 'yesterday') {
    f = u = addDays(t, -1);
  } else if (period === 'month') {
    f = `${t.slice(0, 7)}-01`;
    u = monthEnd(t.slice(0, 7));
  } else if (period === 'fy') {
    f = fyStartOf(t);
    u = fyEndOf(t);
  } else if (period === 'custom') {
    f = from || t;
    u = to || t;
    if (f > u) [f, u] = [u, f];
  }
  const wholeMonth = f.slice(8) === '01' && u === monthEnd(f.slice(0, 7));
  const lbl = f === u ? fmtDY(f) : wholeMonth ? mLong(f.slice(0, 7)) : `${fmtD(f)} – ${fmtDY(u)}`;
  return [f, u, lbl, wholeMonth];
}

/* ------------------------------------------------------------------ */
/* numbers                                                             */
/* ------------------------------------------------------------------ */

export const num = (v: any) => {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? ''));
  return Number.isFinite(n) ? n : 0;
};
export const fyN = (n: number) => Math.round(num(n)).toLocaleString('en-IN');
/** metres on widgets: 1.25 L m / 12,400 m */
export const M = (n: number) => {
  n = num(n);
  if (Math.abs(n) >= 1e5) return `${(n / 1e5).toFixed(2)} L m`;
  return `${Math.round(n).toLocaleString('en-IN')} m`;
};
/** short quantity: 1.25 L m / 12.4 K m / 840 m */
export const Q = (n: number) => {
  n = num(n);
  if (Math.abs(n) >= 1e5) return `${(n / 1e5).toFixed(2)} L m`;
  if (Math.abs(n) >= 1e3) return `${(n / 1e3).toFixed(1)} K m`;
  return `${Math.round(n)} m`;
};
export const secM = (n: number) => `${fyN(n)} m`;
/** kilograms: 1.25 t / 840 kg */
export const secKg = (n: number) => {
  n = num(n);
  const a = Math.abs(n);
  return `${n < 0 ? '−' : ''}${a >= 1e3 ? `${(a / 1e3).toFixed(2)} t` : `${Math.round(a).toLocaleString('en-IN')} kg`}`;
};
export const pctTxt = (s: number, w: number) => (w > 0 ? `${((s / w) * 100).toFixed(1)}%` : '—');
export const pl = (n: number, w: string) => `${n.toLocaleString('en-IN')} ${n === 1 ? w.replace(/s$/, '') : w}`;
export const sum = (ls: DtsItem[], k: 'v' | 'aux' | 'q' = 'v') => ls.reduce((s, x) => s + num(x[k]), 0);
export const initialsOf = (name: string) =>
  String(name || '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase() || '—';
/** a stable hue for an executive's avatar */
export const hueOf = (key: string) => {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) % 360;
  return h;
};

/* ------------------------------------------------------------------ */
/* API row -> report item                                              */
/* ------------------------------------------------------------------ */

const s = (v: any) => (v == null ? '' : String(v)).trim();

export function toItems(section: DtsSection, rows: any[]): DtsItem[] {
  const out: DtsItem[] = [];
  (rows || []).forEach((r, i) => {
    const base = { id: s(r.id) || String(i), date: s(r.date).slice(0, 10), v: num(r.v) };
    if (section === 'sales') {
      out.push({
        ...base, q: num(r.q),
        d: { cat: s(r.cat) || '—', art: s(r.art) || '—', party: s(r.party) || '—', exec: s(r.exec) || 'UNASSIGNED' },
        label: `Bill ${s(r.no) || '—'}`,
        sub: `${s(r.party)} · ${s(r.art)} · ${Q(num(r.q))}${num(r.q) > 0 ? ` @ ₹${(num(r.v) / num(r.q)).toFixed(2)}` : ''}${s(r.so) ? ` · SO ${s(r.so)}` : ''}`,
      });
    } else if (section === 'production') {
      const sec: 'A' | 'B' = s(r.sec) === 'A' ? 'A' : 'B';
      const mc = s(r.mc), beam = s(r.beam);
      out.push({
        ...base, sec, aux: num(r.n),
        d: { cat: s(r.cat) || '—', art: s(r.art) || '—', shed: s(r.shed) || '—', secm: SEC_MACH[sec].lbl, mc: mc || '—', prp: s(r.prp), mac: s(r.mac), beam },
        label: mc ? `${mc}${beam ? ` · Beam ${beam}` : ''}` : s(r.shed) || '—',
        sub: `${s(r.art)} · ${s(r.shed)} · ${pl(num(r.n), 'rolls')}`,
      });
    } else if (section === 'collection') {
      out.push({
        ...base,
        d: { exec: s(r.exec) || 'UNASSIGNED', party: s(r.party) || '—', art: s(r.art) || '—', cat: s(r.cat) || '—' },
        label: `Receipt against bill ${s(r.no) || '—'}`,
        sub: `${s(r.party)} · against bill ${s(r.no) || '—'} (${s(r.art)}${num(r.bill_amt) > 0 ? `, ₹${Math.round(num(r.bill_amt)).toLocaleString('en-IN')}` : ''})${r.bill_date ? ` of ${fmtDY(s(r.bill_date))}` : ''}${r.prev_fy ? ' · previous-year bill' : ''}`,
        aside: r.settled === undefined ? undefined : r.settled ? 'bill settled' : 'part of bill',
      });
    } else if (section === 'outstanding') {
      const od = num(r.overdue_days);
      out.push({
        ...base,
        d: { exec: s(r.exec) || 'UNASSIGNED', party: s(r.party) || '—', art: s(r.art) || '—', cat: s(r.cat) || '—', region: s(r.state) || s(r.city) },
        label: `Bill ${s(r.no) || '—'}`,
        sub: `${s(r.party)} · ${s(r.art)}${r.due ? ` · due ${fmtDY(s(r.due))}` : ''}${r.prev_fy ? ' · previous-year bill' : ''}`,
        aside: od > 0 ? `${od}d overdue` : r.due ? 'within terms' : undefined,
        warn: od > 0,
      });
    } else if (section === 'beam_shortage') {
      const per = num(r.per);
      out.push({
        ...base, aux: num(r.aux),
        d: { cat: s(r.cat) || '—', art: s(r.art) || '—', mc: s(r.mc) || '—', shed: s(r.shed) || s(r.mc) || '—' },
        label: `Beam ${s(r.beam) || '—'}`,
        sub: `${s(r.art)} · ${s(r.mc)} · ${secM(num(r.prod))} checked of ${secM(num(r.aux))} warped${num(r.shared) ? ' · shared beam' : ''}`,
        aside: `${per.toFixed(1)}% short`,
        warn: per > 3,
      });
    } else if (section === 'payments_made') {
      const share = num(r.share);
      out.push({
        ...base,
        d: { vendor: s(r.vendor) || '—', cat: s(r.cat) || '—', pay: s(r.pay) || s(r.id), vou: s(r.vou), mode: s(r.mode), head: s(r.head), vendor_id: s(r.vendor_id) },
        x: { paid: num(r.paid) },
        label: s(r.vou) ? `Voucher ${s(r.vou)}` : `Bill ${s(r.no) || '—'}`,
        sub: `${s(r.vendor)}${s(r.mode) ? ` · ${s(r.mode)}` : ''} · against bill ${s(r.no) || '—'} · ${s(r.cat)}${share > 0 && share < 0.9995 ? ` · ${(share * 100).toFixed(0)}% of the bill is DTS` : ''}${r.bill_date ? ` · bill of ${fmtDY(s(r.bill_date))}` : ''}`,
      });
    } else if (section === 'pickmetres') {
      const sec: 'A' | 'B' = s(r.sec) === 'A' ? 'A' : 'B';
      out.push({
        ...base, sec, pm: num(r.pm), aux: num(r.pm), x: { n: num(r.n) },
        d: { cat: s(r.cat) || '—', art: s(r.art) || '—', shed: s(r.shed) || '—', secm: SEC_MACH[sec].lbl, grp: s(r.grp) },
        label: s(r.art) || '—',
        sub: `${s(r.shed)} · ${secM(num(r.v))} · ${pl(num(r.n), 'rolls')}`,
      });
    } else if (section === 'outsourcing') {
      const rate = num(r.rate), kg = num(r.yarn_kg);
      out.push({
        ...base, aux: num(r.aux), x: { yarn: kg },
        d: { worker: s(r.worker) || '—', art: s(r.art) || '—', cat: s(r.cat) || '—' },
        label: `Inward ${s(r.no) || '—'}`,
        sub: `${s(r.worker)} · ${s(r.art)}${s(r.job) ? ` · ${s(r.job)}` : ''}${rate > 0 ? ` · ₹${rate.toFixed(2)} job rate` : ''}${kg > 0 ? ` · ${secKg(kg)} yarn consumed` : ''}${s(r.bill) ? ` · bill ${s(r.bill)}` : ''}`,
      });
    } else if (section === 'outsourcing_yarn') {
      out.push({
        ...base, x: { issued: num(r.issued), consumed: num(r.consumed), shortage: num(r.shortage), wastage: num(r.wastage) },
        d: { worker: s(r.worker) || '—', yarn: s(r.yarn) || '—', where: s(r.worker) || '—' },
        label: s(r.yarn) || '—',
        sub: `${s(r.worker)} · issued ${secKg(num(r.issued))} · consumed ${secKg(num(r.consumed))}${num(r.shortage) ? ` · shortage ${secKg(num(r.shortage))}` : ''}${num(r.wastage) ? ` · wastage ${secKg(num(r.wastage))}` : ''} · ${pl(num(r.challans), 'challans')}`,
        warn: num(r.v) < -0.5,
      });
    } else if (section === 'mill_stock') {
      out.push({
        ...base,
        d: { where: s(r.where) || '—', art: s(r.art) || '—', cat: s(r.cat) || '—' },
        label: `Challan ${s(r.no) || '—'}`,
        sub: `${s(r.where)} · ${s(r.art)}${s(r.shade) ? ` · ${s(r.shade)}` : ''}${s(r.chart) ? ` · chart ${s(r.chart)}` : ''} · sent ${secM(num(r.out))} · received ${secM(num(r.in))}`,
        aside: s(r.status).toLowerCase() || undefined,
      });
    } else if (section === 'booked') {
      out.push({ ...base, q: num(r.q), d: {}, label: `SO ${base.id}`, sub: '' });
    }
  });
  return out;
}

/** does a Sampling Hub category belong to DTS (same words the backend matches item names with) */
export const isDtsCategory = (category: string, patterns: string[]) => {
  const c = String(category || '').toUpperCase();
  return (patterns || []).some((p) => p && c.includes(String(p).toUpperCase()));
};
