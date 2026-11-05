// FILE: src/screens/yarnRates/yarnRatesModel.ts
// Yarn Rates — types and the rules of the ERP Designing "Yarn Rates" master (YarnRatesMaster):
//   current rate of a yarn  = its latest-dated entry (same date: the one entered last)
//   ▲ / ▼ %                 = that entry vs the SAME supplier's previous quote
//   chart                   = one line per supplier (rate book)
// Data ONLY from the new table TMSMASTER.dbo.FAMIYarnRate (no purchase / old data). Group (prptype) + login year;
// no property code anywhere.
// Backend: YarnRateController (POST /api/yarn_rates/list | item | parties | save | delete).

import type { PricePoint } from '../yarnHub/yarnHubModel';

export type RateItem = {
  itmcode: string; name: string; category: string; catsub: string; fibres: string[]; nsubs: number; subs: string[];
};
export type RateRow = {
  itmcode: string; parcode: string; party: string; date: string; rate: number; remark: string;
  ts: string; uts: string; user: string; uuser: string;
};
export type Party = { code: string; name: string; short: string; src: string[] }; // src: dyeing | purchase
export type Fy = { yearno: string; name: string; from: string; to: string };
export type ListData = { prptype: string; fy: Fy; items: RateItem[]; rates: RateRow[] };
export type ItemData = { itmcode: string; rates: RateRow[] };

export const MAX_RATE = 100000;

const s = (v: any) => (v == null ? '' : String(v)).trim();
const n = (v: any) => {
  const x = typeof v === 'number' ? v : parseFloat(String(v ?? '').replace(/,/g, ''));
  return Number.isFinite(x) ? x : 0;
};

/* ------------------------------ api envelope ------------------------------ */

export function unwrap(response: any): any {
  const body = response && typeof response === 'object' && 'data' in response && 'status' in response && 'headers' in response ? response.data : response;
  if (typeof body === 'string') {
    const t = body.trim();
    throw new Error(t.startsWith('<') ? 'The server sent a web page instead of data — the Yarn Rates backend is not deployed on this server (or the route cache is old).' : 'The server sent an unexpected answer: ' + t.slice(0, 120));
  }
  if (body && typeof body === 'object' && body.success === false) throw new Error(body.message || 'Request failed.');
  return body && typeof body === 'object' && 'data' in body ? body.data : body;
}

export const errText = (err: any, fallback: string) =>
  err?.response?.data?.message || err?.response?.data?.error || err?.message || fallback;

const arr = (v: any): any[] => (Array.isArray(v) ? v : []);

export const normRate = (r: any): RateRow => ({
  itmcode: s(r.itmcode), parcode: s(r.parcode), party: s(r.party) || s(r.parcode), date: s(r.date),
  rate: n(r.rate), remark: s(r.remark), ts: s(r.ts), uts: s(r.uts), user: s(r.user), uuser: s(r.uuser),
});

export function normalizeList(raw: any): ListData {
  if (!raw || typeof raw !== 'object' || !Array.isArray(raw.items)) throw new Error('The server sent an unexpected answer for the yarn list.');
  const fy = raw.fy && typeof raw.fy === 'object' ? raw.fy : {};
  return {
    prptype: s(raw.prptype),
    fy: { yearno: s(fy.yearno), name: s(fy.name) || 'FY ' + s(fy.yearno), from: s(fy.from), to: s(fy.to) },
    items: arr(raw.items).map((it) => ({
      itmcode: s(it.itmcode), name: s(it.name) || s(it.itmcode), category: s(it.category), catsub: s(it.catsub),
      fibres: arr(it.fibres).map(s).filter(Boolean), nsubs: n(it.nsubs), subs: arr(it.subs).map(s),
    })).filter((it) => it.itmcode),
    rates: arr(raw.rates).map(normRate).filter((r) => r.itmcode && r.rate > 0),
  };
}

export function normalizeItem(raw: any): ItemData {
  if (!raw || typeof raw !== 'object') throw new Error('The server sent an unexpected answer for this yarn.');
  return {
    itmcode: s(raw.itmcode),
    rates: arr(raw.rates).map(normRate).filter((r) => r.rate > 0),
  };
}

export const normalizeParties = (raw: any): Party[] =>
  arr(raw?.parties).map((p) => ({ code: s(p.code), name: s(p.name), short: s(p.short), src: arr(p.src).map(s) })).filter((p) => p.code && p.name);

/* ------------------------------ rate rules ------------------------------ */

/** order of the rate book: date, then time of entry */
const cmp = (a: RateRow, b: RateRow) => a.date.localeCompare(b.date) || (a.ts || '').localeCompare(b.ts || '');

/** current rate = latest-dated entry (same date: entered last) */
export function latestOf(rates: RateRow[]): RateRow | null {
  let best: RateRow | null = null;
  rates.forEach((r) => {
    if (!(r.rate > 0)) return;
    if (!best || cmp(r, best) >= 0) best = r;
  });
  return best;
}

/** the same supplier's previous quote — what the latest entry moved from */
export function prevOf(rates: RateRow[], lf: RateRow | null): RateRow | null {
  if (!lf) return null;
  const same = rates.filter((r) => r !== lf && r.parcode === lf.parcode && r.rate > 0 && cmp(r, lf) <= 0).sort(cmp);
  return same.length ? same[same.length - 1] : null;
}

export type YarnRow = RateItem & {
  rates: RateRow[]; lf: RateRow | null; pv: RateRow | null; nSup: number; delta: number | null;
};

export function yarnRows(items: RateItem[], rates: RateRow[]): YarnRow[] {
  const by: Record<string, RateRow[]> = {};
  rates.forEach((r) => (by[r.itmcode] = by[r.itmcode] || []).push(r));
  return items
    .map((it) => {
      const rs = (by[it.itmcode] || []).slice().sort(cmp);
      const lf = latestOf(rs);
      const pv = prevOf(rs, lf);
      return {
        ...it, rates: rs, lf, pv,
        nSup: new Set(rs.map((r) => r.parcode)).size,
        delta: lf && pv && pv.rate > 0 ? ((lf.rate - pv.rate) / pv.rate) * 100 : null,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** chart points: the rate book, one line per supplier (the Yarn Hub chart's point shape) */
export function chartPoints(rates: RateRow[]): PricePoint[] {
  const pts: (PricePoint & { k: string })[] = rates.map((r) => ({
    date: r.date, inwno: 'rate', party: r.party, parcode: r.parcode, itmcode: r.itmcode, qty: 0, rate: r.rate, k: r.date + '|' + (r.ts || ''),
  }));
  return pts.sort((a, b) => a.k.localeCompare(b.k)).map(({ k, ...p }) => p);
}

/* ------------------------------ formatting ------------------------------ */

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const dateFull = (d: string) => (d && d.length >= 10 ? `${d.slice(8, 10)} ${MONTHS[Number(d.slice(5, 7)) - 1] || ''} ${d.slice(0, 4)}` : d || '—');
export const timeOf = (ts: string) => (ts && ts.length >= 16 ? ts.slice(11, 16) : '');
export const rupee = (v: number) => '₹' + (Math.round(v * 100) / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 });

export const isoToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
export const isoToDate = (v: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v || '');
  return m ? new Date(+m[1], +m[2] - 1, +m[3]) : new Date();
};
export const dateToIso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** ₹/kg typed: digits with at most 2 decimals */
export const cleanRate = (v: string) => {
  let t = v.replace(/[^0-9.]/g, '');
  const i = t.indexOf('.');
  if (i >= 0) t = t.slice(0, i + 1) + t.slice(i + 1).replace(/\./g, '').slice(0, 2);
  return t.slice(0, 9);
};

/**
 * Search (same as Yarn Hub): every word must match the START of a word of the row, any order — "40" finds 40/1 and
 * 40s but not 140, "lin" finds LINEN; a word with / - . is matched as typed anywhere ("40/1", "55/45").
 */
export const matches = (hay: string, q: string) => {
  const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const h = hay.toLowerCase();
  const raw = h.split(/[^a-z0-9]+/).filter(Boolean);
  const tokens = raw.concat(raw.map((t) => t.replace(/^[a-z]+(?=\d)/, '')).filter((t, i) => t !== raw[i]));
  return words.every((w) => (/[^a-z0-9]/.test(w) ? h.includes(w) : tokens.some((t) => t.startsWith(w))));
};

export const searchText = (y: YarnRow) =>
  [y.itmcode, y.name, y.catsub, y.category, ...y.subs, y.lf ? y.lf.party : '', ...y.rates.map((r) => r.party)].join(' ');

/** true when an ISO date lies inside the FY */
export const inFy = (iso: string, fy: Fy | null | undefined) => !!fy && !!iso && iso >= fy.from && iso <= fy.to;
