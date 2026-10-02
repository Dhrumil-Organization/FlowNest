// FILE: src/components/VisitorsReportNEW/reportModel.ts
// Pure calculations of the Visitors Report: the period (day / month / year /
// last 7 days / custom), filters, KPI numbers, breakdowns (purpose / host /
// company / hour), day-wise · month-wise · year-wise totals and the "unique
// visitors" list. No React, no API — easy to test and reuse.
import {
  addDays, dayKey, displayName, endOfDay, fmtDate, fmtDayShort, labelOf, matches, PURPOSES, startOfDay, statusOf, stayMinutes,
  str, Visit, visitorKey, weekdayOf,
} from '../VisitorsNEW/model';

/* --------------------------------- period -------------------------------- */

/**
 * What the report is looking at:
 *   day    one calendar day     (Today, Yesterday, ‹ › moves a day)
 *   month  one calendar month   (This month, Last month, ‹ › moves a month)
 *   year   one calendar year    (This year, Last year, ‹ › moves a year)
 *   last7  the last 7 days up to today
 *   custom From – To
 */
export type PeriodMode = 'day' | 'month' | 'year' | 'last7' | 'custom';
export type Period = { mode: PeriodMode; anchor: Date; from: Date; to: Date };

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MONTH_SHORT = MONTH_NAMES.map((m) => m.slice(0, 3));

export type PresetKey = 'today' | 'yesterday' | 'last7' | 'month' | 'lastMonth' | 'year' | 'lastYear' | 'custom';
export const PRESETS: { key: PresetKey; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: 'last7', label: 'Last 7 days' },
  { key: 'month', label: 'This month' },
  { key: 'lastMonth', label: 'Last month' },
  { key: 'year', label: 'This year' },
  { key: 'lastYear', label: 'Last year' },
  { key: 'custom', label: 'Custom' },
];

export function presetPeriod(key: PresetKey, now: Date, custom: { from: Date; to: Date }): Period {
  const today = startOfDay(now);
  switch (key) {
    case 'today': return { mode: 'day', anchor: today, from: today, to: today };
    case 'yesterday': return { mode: 'day', anchor: addDays(today, -1), from: addDays(today, -1), to: addDays(today, -1) };
    case 'last7': return { mode: 'last7', anchor: today, from: addDays(today, -6), to: today };
    case 'month': return { mode: 'month', anchor: new Date(today.getFullYear(), today.getMonth(), 1), from: today, to: today };
    case 'lastMonth': return { mode: 'month', anchor: new Date(today.getFullYear(), today.getMonth() - 1, 1), from: today, to: today };
    case 'year': return { mode: 'year', anchor: new Date(today.getFullYear(), 0, 1), from: today, to: today };
    case 'lastYear': return { mode: 'year', anchor: new Date(today.getFullYear() - 1, 0, 1), from: today, to: today };
    default: return { mode: 'custom', anchor: today, from: custom.from, to: custom.to };
  }
}

/** First and last moment of the period (a running month / year ends today, not in the future). */
export function periodDates(p: Pick<Period, 'mode' | 'anchor' | 'from' | 'to'>, now: Date = new Date()): { from: Date; to: Date } {
  const today = startOfDay(now);
  const cap = (d: Date) => (d > today ? today : d);
  switch (p.mode) {
    case 'day': return { from: startOfDay(p.anchor), to: endOfDay(p.anchor) };
    case 'month': return {
      from: new Date(p.anchor.getFullYear(), p.anchor.getMonth(), 1),
      to: endOfDay(cap(new Date(p.anchor.getFullYear(), p.anchor.getMonth() + 1, 0))),
    };
    case 'year': return { from: new Date(p.anchor.getFullYear(), 0, 1), to: endOfDay(cap(new Date(p.anchor.getFullYear(), 11, 31))) };
    case 'last7': return { from: addDays(today, -6), to: endOfDay(today) };
    default: {
      const a = startOfDay(p.from);
      const b = startOfDay(p.to);
      return a <= b ? { from: a, to: endOfDay(b) } : { from: b, to: endOfDay(a) };
    }
  }
}

/** "02 Oct 2026" · "October 2026" · "2026" · "26 Sep 2026 – 02 Oct 2026" */
export function periodLabel(p: Pick<Period, 'mode' | 'anchor'>, from: Date, to: Date): string {
  if (p.mode === 'month') return `${MONTH_NAMES[p.anchor.getMonth()]} ${p.anchor.getFullYear()}`;
  if (p.mode === 'year') return String(p.anchor.getFullYear());
  return dayKey(from) === dayKey(to) ? fmtDate(from) : `${fmtDate(from)} – ${fmtDate(to)}`;
}

/** Move a day / month / year period one step back (-1) or forward (+1). */
export function stepAnchor(mode: PeriodMode, anchor: Date, dir: -1 | 1): Date {
  if (mode === 'month') return new Date(anchor.getFullYear(), anchor.getMonth() + dir, 1);
  if (mode === 'year') return new Date(anchor.getFullYear() + dir, 0, 1);
  return addDays(startOfDay(anchor), dir);
}

/** Which preset chip is "on" for a period (none when the arrows moved it elsewhere). */
export function presetOf(mode: PeriodMode, anchor: Date, now: Date): PresetKey | '' {
  const today = startOfDay(now);
  if (mode === 'last7') return 'last7';
  if (mode === 'custom') return 'custom';
  if (mode === 'day') return dayKey(anchor) === dayKey(today) ? 'today' : dayKey(anchor) === dayKey(addDays(today, -1)) ? 'yesterday' : '';
  if (mode === 'month') {
    const diff = (today.getFullYear() - anchor.getFullYear()) * 12 + today.getMonth() - anchor.getMonth();
    return diff === 0 ? 'month' : diff === 1 ? 'lastMonth' : '';
  }
  const y = today.getFullYear() - anchor.getFullYear();
  return y === 0 ? 'year' : y === 1 ? 'lastYear' : '';
}

/* ----------------------- day-wise / month-wise / year-wise ----------------- */

export type PeriodGroup = 'day' | 'month' | 'year';

/** Totals of one day, month or year. */
export type PeriodRow = {
  key: string;       // '2026-10-02' | '2026-10' | '2026'
  label: string;     // '02 Oct 2026, Fri' | 'October 2026' | '2026'
  visits: number;
  persons: number;   // visits + people who came along
  unique: number;    // different people
  out: number;       // went out
  inside: number;    // not marked OUT
  avgStay: number;   // minutes, finished visits
  stay: number;      // total minutes of the finished visits (so totals stay exact)
};

export const periodKeyOf = (iso: string, group: PeriodGroup): string => {
  const k = dayKey(iso);
  return group === 'day' ? k : group === 'month' ? k.slice(0, 7) : k.slice(0, 4);
};

export const periodKeyLabel = (key: string, group: PeriodGroup): string => {
  if (group === 'year') return key;
  if (group === 'month') return `${MONTH_NAMES[Number(key.slice(5, 7)) - 1]} ${key.slice(0, 4)}`;
  const d = new Date(Number(key.slice(0, 4)), Number(key.slice(5, 7)) - 1, Number(key.slice(8, 10)));
  return `${fmtDate(d)}, ${weekdayOf(d)}`;
};

export const periodKeyShort = (key: string, group: PeriodGroup): { label: string; sub: string } => {
  if (group === 'year') return { label: key, sub: '' };
  if (group === 'month') return { label: MONTH_SHORT[Number(key.slice(5, 7)) - 1], sub: key.slice(2, 4) };
  const d = new Date(Number(key.slice(0, 4)), Number(key.slice(5, 7)) - 1, Number(key.slice(8, 10)));
  return { label: key.slice(8, 10), sub: weekdayOf(d).slice(0, 2) };
};

/** First and last day of a period key (to open that day / month / year). */
export function periodKeyRange(key: string, group: PeriodGroup): { mode: PeriodMode; anchor: Date } {
  const y = Number(key.slice(0, 4));
  if (group === 'year') return { mode: 'year', anchor: new Date(y, 0, 1) };
  if (group === 'month') return { mode: 'month', anchor: new Date(y, Number(key.slice(5, 7)) - 1, 1) };
  return { mode: 'day', anchor: new Date(y, Number(key.slice(5, 7)) - 1, Number(key.slice(8, 10))) };
}

/** Group visits into day / month / year totals (only periods that have visits). */
export function aggregatePeriods(visits: Visit[], group: PeriodGroup, now: Date = new Date()): PeriodRow[] {
  const map = new Map<string, { row: PeriodRow; people: Set<string>; stay: number }>();
  visits.forEach((v) => {
    const key = periodKeyOf(v.inAt, group);
    let b = map.get(key);
    if (!b) {
      b = { row: { key, label: periodKeyLabel(key, group), visits: 0, persons: 0, unique: 0, out: 0, inside: 0, avgStay: 0, stay: 0 }, people: new Set(), stay: 0 };
      map.set(key, b);
    }
    b.row.visits += 1;
    b.row.persons += 1 + (v.extraPersons || 0);
    b.people.add(visitorKey(v));
    if (v.outAt) { b.row.out += 1; b.stay += stayMinutes(v, now); } else b.row.inside += 1;
  });
  return Array.from(map.values())
    .map((b) => ({ ...b.row, unique: b.people.size, stay: b.stay, avgStay: b.row.out ? Math.round(b.stay / b.row.out) : 0 }))
    .sort((a, b) => (a.key < b.key ? -1 : 1));
}

/** Add the empty days / months so the table has no gaps (rows come back oldest → newest). */
export function fillPeriods(rows: PeriodRow[], group: PeriodGroup, from: Date, to: Date): PeriodRow[] {
  if (group === 'year') return rows;
  const have = new Map(rows.map((r) => [r.key, r]));
  const out: PeriodRow[] = [];
  const blank = (key: string): PeriodRow => ({ key, label: periodKeyLabel(key, group), visits: 0, persons: 0, unique: 0, out: 0, inside: 0, avgStay: 0, stay: 0 });
  if (group === 'month') {
    const cur = new Date(from.getFullYear(), from.getMonth(), 1);
    while (cur <= to) {
      const key = dayKey(cur).slice(0, 7);
      out.push(have.get(key) || blank(key));
      cur.setMonth(cur.getMonth() + 1);
    }
    return out;
  }
  const days = Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / 86400000) + 1;
  // very long day lists show only the days that have visits
  if (days > 366) return rows;
  for (let i = 0; i < days; i += 1) {
    const key = dayKey(addDays(startOfDay(from), i));
    out.push(have.get(key) || blank(key));
  }
  return out;
}

export const sumPeriods = (rows: PeriodRow[]): PeriodRow => {
  const t: PeriodRow = { key: 'total', label: 'Total', visits: 0, persons: 0, unique: 0, out: 0, inside: 0, avgStay: 0, stay: 0 };
  rows.forEach((r) => { t.visits += r.visits; t.persons += r.persons; t.out += r.out; t.inside += r.inside; t.stay += r.stay; });
  t.avgStay = t.out ? Math.round(t.stay / t.out) : 0;
  return t;
};

/* --------------------------------- filters ------------------------------- */

export type Filters = {
  status: '' | 'inside' | 'out' | 'overstay';
  purpose: string;
  host: string;
};

export const NO_FILTERS: Filters = { status: '', purpose: '', host: '' };

export const STATUS_OPTIONS = [
  { value: 'inside', label: 'Still inside' },
  { value: 'out', label: 'Went out' },
  { value: 'overstay', label: 'Inside too long (overstay)' },
];

export const activeFilterCount = (f: Filters) => Object.values(f).filter(Boolean).length;

export function applyFilters(visits: Visit[], f: Filters, query: string, now: Date): Visit[] {
  return visits.filter((v) => {
    if (f.status) {
      const s = statusOf(v, now);
      // "Still inside" includes the overstaying ones (they are inside too)
      if (f.status === 'inside' ? s === 'out' : s !== f.status) return false;
    }
    if (f.purpose && v.purpose !== f.purpose) return false;
    if (f.host && v.hostName !== f.host) return false;
    return matches(v, query);
  });
}

/** Distinct non-empty values of a field, A–Z (for the filter dropdowns). */
export const distinct = (visits: Visit[], pick: (v: Visit) => string): string[] =>
  Array.from(new Set(visits.map(pick).map(str).filter(Boolean))).sort((a, b) => a.localeCompare(b));

/* ---------------------------------- KPIs --------------------------------- */

export type Kpis = {
  visits: number;
  persons: number;      // visits + people who came along without their own entry
  unique: number;
  inside: number;
  overstay: number;
  avgStay: number;      // minutes, finished visits only
  withPhoto: number;    // visits that have at least one photo
  photos: number;       // photos in total
  repeat: number;       // unique visitors with more than one visit in the period
};

export function kpisOf(visits: Visit[], now: Date): Kpis {
  const perVisitor = new Map<string, number>();
  let inside = 0; let overstay = 0; let stay = 0; let done = 0; let persons = 0; let withPhoto = 0; let photos = 0;
  visits.forEach((v) => {
    perVisitor.set(visitorKey(v), (perVisitor.get(visitorKey(v)) || 0) + 1);
    persons += 1 + (v.extraPersons || 0);
    const s = statusOf(v, now);
    if (s !== 'out') inside += 1;
    if (s === 'overstay') overstay += 1;
    if (v.outAt) { stay += stayMinutes(v, now); done += 1; }
    if (v.photos.length) withPhoto += 1;
    photos += v.photos.length;
  });
  return {
    visits: visits.length,
    persons,
    unique: perVisitor.size,
    inside,
    overstay,
    avgStay: done ? Math.round(stay / done) : 0,
    withPhoto,
    photos,
    repeat: Array.from(perVisitor.values()).filter((n) => n > 1).length,
  };
}

/* ------------------------------- breakdowns ------------------------------ */

export type Slice = { key: string; label: string; count: number; pct: number };

export function countBy(visits: Visit[], keyOf: (v: Visit) => string, labelOfKey: (key: string) => string = (k) => k, top = 0): Slice[] {
  const map = new Map<string, number>();
  visits.forEach((v) => {
    const k = str(keyOf(v));
    map.set(k, (map.get(k) || 0) + 1);
  });
  const total = visits.length || 1;
  const list = Array.from(map.entries())
    .map(([key, count]) => ({ key, label: key ? labelOfKey(key) : 'Not entered', count, pct: (count / total) * 100 }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  return top > 0 ? list.slice(0, top) : list;
}

export const byPurpose = (visits: Visit[]) => countBy(visits, (v) => v.purpose, (k) => labelOf(PURPOSES, k));
export const byHost = (visits: Visit[], top = 8) => countBy(visits, (v) => v.hostName, (k) => k, top);
export const byCompany = (visits: Visit[], top = 8) => countBy(visits.filter((v) => str(v.company)), (v) => v.company, (k) => k, top);

export type Column = { key: string; label: string; sub: string; count: number };

/** One column per day of the range (per month when the range is long). */
export function byDay(visits: Visit[], from: Date, to: Date): Column[] {
  const days = Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / 86400000) + 1;
  if (days > 45) {
    const map = new Map<string, number>();
    visits.forEach((v) => { const k = dayKey(v.inAt).slice(0, 7); map.set(k, (map.get(k) || 0) + 1); });
    const out: Column[] = [];
    const cur = new Date(from.getFullYear(), from.getMonth(), 1);
    while (cur <= to) {
      const k = dayKey(cur).slice(0, 7);
      out.push({ key: k, label: fmtDayShort(cur).slice(3), sub: String(cur.getFullYear()).slice(-2), count: map.get(k) || 0 });
      cur.setMonth(cur.getMonth() + 1);
    }
    return out;
  }
  const map = new Map<string, number>();
  visits.forEach((v) => { const k = dayKey(v.inAt); map.set(k, (map.get(k) || 0) + 1); });
  const out: Column[] = [];
  for (let i = 0; i < days; i += 1) {
    const d = addDays(startOfDay(from), i);
    const k = dayKey(d);
    out.push({ key: k, label: fmtDayShort(d).slice(0, 2), sub: weekdayOf(d).slice(0, 2), count: map.get(k) || 0 });
  }
  return out;
}

/** Visits by the hour they came in (only the hours between first and last busy hour, min 8–20). */
export function byHour(visits: Visit[]): Column[] {
  const counts = new Array(24).fill(0);
  visits.forEach((v) => { counts[new Date(v.inAt).getHours()] += 1; });
  let first = 8; let last = 20;
  counts.forEach((c, h) => { if (c > 0) { first = Math.min(first, h); last = Math.max(last, h); } });
  const out: Column[] = [];
  for (let h = first; h <= last; h += 1) {
    out.push({ key: String(h), label: String(h % 12 === 0 ? 12 : h % 12), sub: h < 12 ? 'am' : 'pm', count: counts[h] });
  }
  return out;
}

/* ----------------------------- unique visitors --------------------------- */

export type VisitorRow = {
  key: string;
  name: string;
  mobile: string;
  company: string;
  visits: Visit[];      // newest first
  count: number;
  firstInAt: string;
  lastInAt: string;
  totalStay: number;    // minutes
  avgStay: number;
  insideNow: boolean;
  photo: string;
};

export function visitorsOf(visits: Visit[], now: Date): VisitorRow[] {
  const map = new Map<string, VisitorRow>();
  [...visits].sort((a, b) => (a.inAt < b.inAt ? 1 : -1)).forEach((v) => {
    const key = visitorKey(v);
    let row = map.get(key);
    if (!row) {
      row = {
        key, name: displayName(v), mobile: v.mobile, company: v.company,
        visits: [], count: 0, firstInAt: v.inAt, lastInAt: v.inAt, totalStay: 0, avgStay: 0, insideNow: false,
        photo: '',
      };
      map.set(key, row);
    }
    row.visits.push(v);
    row.count += 1;
    row.firstInAt = v.inAt; // list is newest → oldest, so the last one seen is the first visit
    row.totalStay += stayMinutes(v, now);
    if (!v.outAt) row.insideNow = true;
    if (!row.company) row.company = v.company;
    if (!row.photo) row.photo = v.photos.find((p) => p.kind === 'visitor')?.uri || '';
  });
  const list = Array.from(map.values());
  list.forEach((r) => { r.avgStay = r.count ? Math.round(r.totalStay / r.count) : 0; });
  return list.sort((a, b) => b.count - a.count || (a.lastInAt < b.lastInAt ? 1 : -1));
}

/* --------------------------------- sorting ------------------------------- */

export type SortKey = 'new' | 'old' | 'stay' | 'name';
export const SORTS: { key: SortKey; label: string }[] = [
  { key: 'new', label: 'Newest' },
  { key: 'old', label: 'Oldest' },
  { key: 'stay', label: 'Longest stay' },
  { key: 'name', label: 'Name A–Z' },
];

export function sortVisits(visits: Visit[], key: SortKey, now: Date): Visit[] {
  const list = [...visits];
  switch (key) {
    case 'old': return list.sort((a, b) => (a.inAt > b.inAt ? 1 : -1));
    case 'stay': return list.sort((a, b) => stayMinutes(b, now) - stayMinutes(a, now));
    case 'name': return list.sort((a, b) => displayName(a).localeCompare(displayName(b)));
    default: return list.sort((a, b) => (a.inAt < b.inAt ? 1 : -1));
  }
}
