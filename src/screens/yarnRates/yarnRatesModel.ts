// FILE: src/screens/yarnRates/yarnRatesModel.ts
// Yarn Rates — types and the rules of the ERP Designing "Yarn Rates" master (YarnRatesMaster):
//   current rate of a yarn  = its latest-dated entry (same date: the one entered last)
//   ▲ / ▼ %                 = that entry vs the SAME supplier's previous quote
//   chart                   = one line per supplier (rate book), purchases optional as their own lines
// Backend: YarnRateController (POST /api/yarn_rates/list | item | parties | save | delete).

import type { PricePoint } from '../yarnHub/yarnHubModel';

export type RateItem = {
  itmcode: string; name: string; category: string; catsub: string; fibres: string[]; nsubs: number; subs: string[];
};
export type RateRow = {
  prpcode: string; itmcode: string; parcode: string; party: string; date: string; rate: number; remark: string;
  source: 'rates' | 'purchase' | string; srcref: string; ts: string; uts: string; user: string; uuser: string;
};
export type Buy = { rate: number; party: string; date: string };
export type Party = { code: string; name: string; short: string };
export type Fy = { yearno: string; name: string; from: string; to: string };
export type PropOpt = { code: string; name: string; short: string; years: Fy[] };
export type ListData = { prpcode: string; prpname: string; prpcodes: string[]; fy: Fy; items: RateItem[]; rates: RateRow[]; buys: Record<string, Buy> };
export type ItemData = { itmcode: string; rates: RateRow[]; purchases: PricePoint[] };

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
  prpcode: s(r.prpcode), itmcode: s(r.itmcode), parcode: s(r.parcode), party: s(r.party) || s(r.parcode), date: s(r.date),
  rate: n(r.rate), remark: s(r.remark), source: s(r.source) || 'rates', srcref: s(r.srcref), ts: s(r.ts), uts: s(r.uts), user: s(r.user), uuser: s(r.uuser),
});

export function normalizeList(raw: any): ListData {
  if (!raw || typeof raw !== 'object' || !Array.isArray(raw.items)) throw new Error('The server sent an unexpected answer for the yarn list.');
  const buys: Record<string, Buy> = {};
  Object.entries(raw.buys && typeof raw.buys === 'object' ? raw.buys : {}).forEach(([k, b]: [string, any]) => {
    if (b && n(b.rate) > 0) buys[s(k)] = { rate: n(b.rate), party: s(b.party), date: s(b.date) };
  });
  const fy = raw.fy && typeof raw.fy === 'object' ? raw.fy : {};
  return {
    prpcode: s(raw.prpcode),
    prpname: s(raw.prpname) || s(raw.prpcode),
    prpcodes: arr(raw.prpcodes).map(s),
    fy: { yearno: s(fy.yearno), name: s(fy.name) || 'FY ' + s(fy.yearno), from: s(fy.from), to: s(fy.to) },
    items: arr(raw.items).map((it) => ({
      itmcode: s(it.itmcode), name: s(it.name) || s(it.itmcode), category: s(it.category), catsub: s(it.catsub),
      fibres: arr(it.fibres).map(s).filter(Boolean), nsubs: n(it.nsubs), subs: arr(it.subs).map(s),
    })).filter((it) => it.itmcode),
    rates: arr(raw.rates).map(normRate).filter((r) => r.itmcode && r.rate > 0),
    buys,
  };
}

export function normalizeItem(raw: any): ItemData {
  if (!raw || typeof raw !== 'object') throw new Error('The server sent an unexpected answer for this yarn.');
  return {
    itmcode: s(raw.itmcode),
    rates: arr(raw.rates).map(normRate).filter((r) => r.rate > 0),
    purchases: arr(raw.purchases).map((p) => ({
      date: s(p.date), inwno: s(p.inwno), party: s(p.party) || s(p.parcode), parcode: s(p.parcode), itmcode: s(p.itmcode), qty: n(p.qty), rate: n(p.rate),
    })).filter((p) => p.date && p.rate > 0),
  };
}

export const normalizeParties = (raw: any): Party[] =>
  arr(raw?.parties).map((p) => ({ code: s(p.code), name: s(p.name), short: s(p.short) })).filter((p) => p.code && p.name);

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
  rates: RateRow[]; lf: RateRow | null; pv: RateRow | null; nSup: number; delta: number | null; buy: Buy | null;
};

export function yarnRows(items: RateItem[], rates: RateRow[], buys: Record<string, Buy>): YarnRow[] {
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
        buy: buys[it.itmcode] || null,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** chart points: rate book (one line per supplier) + purchases as their own "· purchase" lines when asked */
export function chartPoints(rates: RateRow[], purchases: PricePoint[], withBuys: boolean): PricePoint[] {
  const pts: (PricePoint & { k: string })[] = rates.map((r) => ({
    date: r.date, inwno: 'rate', party: r.party, parcode: r.parcode, itmcode: r.itmcode, qty: 0, rate: r.rate, k: r.date + '|0|' + (r.ts || ''),
  }));
  if (withBuys) {
    purchases.forEach((p) => pts.push({ ...p, party: p.party + ' · purchase', k: p.date + '|1|' + p.inwno }));
  }
  return pts.sort((a, b) => a.k.localeCompare(b.k)).map(({ k, ...p }) => p);
}

/** a purchase already taken into the rate book (same supplier, date and rate) */
export const purchaseUsed = (p: PricePoint, rates: RateRow[]) =>
  rates.some((r) => r.date === p.date && Math.abs(r.rate - p.rate) < 0.005 && (r.parcode === p.parcode || (r.source === 'purchase' && r.srcref === p.inwno)));

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

/** Property / Year combo list (POST /yarn_rates/properties): login's properties of the group, each with its years */
export function normalizeProps(raw: any): PropOpt[] {
  return arr(raw?.properties)
    .map((p: any) => ({
      code: s(p.code).toUpperCase(), name: s(p.name) || s(p.code), short: s(p.short),
      years: arr(p.years).map((y: any) => ({ yearno: s(y.yearno), name: s(y.name) || 'FY ' + s(y.yearno), from: s(y.from), to: s(y.to) }))
        .filter((y: Fy) => y.yearno && /^\d{4}-\d{2}-\d{2}$/.test(y.from) && /^\d{4}-\d{2}-\d{2}$/.test(y.to)),
    }))
    .filter((p: PropOpt) => p.code && p.years.length);
}

/** true when an ISO date lies inside the FY */
export const inFy = (iso: string, fy: Fy | null | undefined) => !!fy && !!iso && iso >= fy.from && iso <= fy.to;
