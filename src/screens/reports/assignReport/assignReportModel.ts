// FILE: src/screens/reports/assignReport/assignReportModel.ts
// The rules of the web ERP's Reports screen (Reports.js + utils/getRegisterReportGridCreation.js), as data:
//   - which keys of a saved setting are dates the user can change, and their default by schedtype
//   - the grid: columns (label, width, align, type, digits, hidden), group columns, totals (sum / count / avg)
//   - filter, sort, grouping and totals of the rows
import { RptSettings } from './assignReportApi';

/* ------------------------------------------------------------------------- */
/*  dates of a setting                                                        */
/* ------------------------------------------------------------------------- */

/** a key of the saved setting the user may change: has "date" in it, but not "validate" / "extravalidate" */
export const isDateKey = (k: string) => /date/i.test(k) && !/validate/i.test(k);

/** the date keys of a setting, in the setting's order */
export const dateKeysOf = (value: Record<string, any> | null | undefined) =>
  Object.keys(value || {}).filter(isDateKey);

/** dd-mm-yyyy  <->  yyyy-mm-dd  (the ERP settings carry dd-mm-yyyy; the date box works in ISO) */
export const toISO = (v: any): string => {
  const s = String(v ?? '').trim();
  let m = s.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = s.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  return '';
};

/** back to the format the setting itself uses (dd-mm-yyyy by default — the web screen's input mask) */
export const fromISO = (iso: string, like: any): string => {
  const s = String(like ?? '').trim();
  if (!iso) return '';
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return iso;
  if (/^\d{8}$/.test(s)) return iso.replace(/-/g, '');
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) return `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
  return `${iso.slice(8, 10)}-${iso.slice(5, 7)}-${iso.slice(0, 4)}`;
};

export type ServerDates = { currentdate: string; weekstartdate: string; weekenddate: string; monthstartdate: string; monthenddate: string };

/**
 * Default dates of a setting (web getSettingsValue):
 *   schedtype daily   fromdate = saved (when an asondate exists) else today · todate / asondate = today
 *   schedtype weekly  fromdate = saved / week start · todate / asondate = week end
 *   schedtype monthly fromdate = saved / month start · todate / asondate = month end
 *   none / missing    the saved values
 * Other date keys keep the saved value.
 */
export function defaultDates(value: Record<string, any>, sv: ServerDates): Record<string, string> {
  const out: Record<string, string> = {};
  const sched = String(value.schedtype || 'none').toLowerCase();
  const hasAson = Object.prototype.hasOwnProperty.call(value, 'asondate');
  const pick = (start: string, end: string, k: string) => {
    if (k === 'fromdate') return hasAson ? value[k] : start;
    if (k === 'todate' || k === 'asondate') return end;
    return value[k];
  };
  dateKeysOf(value).forEach((k) => {
    let v: any = value[k];
    if (sched === 'daily') v = pick(sv.currentdate, sv.currentdate, k);
    else if (sched === 'weekly') v = pick(sv.weekstartdate, sv.weekenddate, k);
    else if (sched === 'monthly') v = pick(sv.monthstartdate, sv.monthenddate, k);
    out[k] = v == null ? '' : String(v);
  });
  return out;
}

/** the payload of /rpt_gateway: the whole setting, dates replaced by the user's values (web handleLoadData) */
export function buildPayload(value: Record<string, any>, dates: Record<string, string>): Record<string, any> {
  const out: Record<string, any> = {};
  Object.keys(value).forEach((k) => {
    if (isDateKey(k) && Object.prototype.hasOwnProperty.call(dates, k) && dates[k] !== '' && dates[k] != null) out[k] = dates[k];
    else out[k] = value[k];
  });
  return out;
}

/* ------------------------------------------------------------------------- */
/*  grid definition                                                           */
/* ------------------------------------------------------------------------- */

export type Col = {
  name: string;
  header: string;
  width: number;
  align: 'left' | 'center' | 'right';
  numeric: boolean;
  /** decimals shown (null = as it comes) */
  digits: number | null;
  /** 1 = sum, 0 = count, 2 = average, null = no total */
  total: 0 | 1 | 2 | null;
  visible: boolean;
  /** -1 none · 0 ascending · 1 descending (the report's default order) */
  order: -1 | 0 | 1;
};

const splitCsv = (s: any) => String(s ?? '').split(',').map((x) => x.trim());

export function buildColumns(rs: RptSettings): { cols: Col[]; groupBy: string[] } {
  const names = splitCsv(rs.rptcols);
  const labels = splitCsv(rs.rptcolslabels);
  const widths = splitCsv(rs.rptcolswidth);
  const aligns = splitCsv(rs.rptcolsalign);
  const orders = splitCsv(rs.rptorderbycol);
  const types = splitCsv(rs.rpttype || '');
  const sums = splitCsv(rs.rptsumfields);
  const digits = splitCsv(rs.rptnumberformat);
  const skip = String(rs.rptcolsskip || '').trim() === '' ? [] : splitCsv(rs.rptcolsskip).map((x) => x.split('#')[0]);
  const groupBy = String(rs.rptgroupcol || '').trim() === '' ? [] : splitCsv(rs.rptgroupcol).filter(Boolean);

  const cols: Col[] = names.filter((n) => n !== '').map((name, i) => {
    const w = parseInt(widths[i] || '0', 10);
    const a = aligns[i];
    const d = digits[i];
    const s = sums[i];
    const o = orders[i];
    // rptnumberformat: decimals of a number column; -1 = not a number (web: TempDigitFormat only when > 0)
    const dgRaw = d === undefined || d === '' ? NaN : parseInt(d, 10);
    const dg = Number.isFinite(dgRaw) && dgRaw > 0 ? dgRaw : null;
    return {
      name,
      header: labels[i] || name,
      width: Number.isFinite(w) && w > 0 ? Math.max(70, w) : 110,
      align: a === '1' ? 'right' : a === '0' ? 'center' : 'left',
      numeric: types[i] === 'N' || (dg !== null && a === '1'),
      digits: dg,
      total: s === '1' ? 1 : s === '0' ? 0 : s === '2' ? 2 : null,
      visible: !(Number.isFinite(w) && w === 0) && !skip.includes(name),
      order: o === '0' ? 0 : o === '1' ? 1 : -1,
    };
  });
  return { cols, groupBy: groupBy.filter((g) => cols.some((c) => c.name === g)) };
}

/* ------------------------------------------------------------------------- */
/*  rows: filter · sort · group · totals                                       */
/* ------------------------------------------------------------------------- */

export type Row = Record<string, any>;
export type Sort = { col: string; dir: 'asc' | 'desc' } | null;

export const num = (v: any): number => {
  if (v === null || v === undefined || v === '') return 0;
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(/,/g, ''));
  return Number.isFinite(n) ? n : 0;
};

/** cell text: numbers with the column's decimals and Indian grouping; the rest as it comes */
export function cellText(c: Col, v: any): string {
  if (v === null || v === undefined) return '';
  if (c.digits !== null) {
    const n = parseFloat(String(v).replace(/,/g, ''));
    return Number.isNaN(n) ? (c.numeric ? '0.' + '0'.repeat(c.digits) : String(v)) : n.toLocaleString('en-IN', { minimumFractionDigits: c.digits, maximumFractionDigits: c.digits });
  }
  if (c.numeric && typeof v === 'number') return v.toLocaleString('en-IN');
  return String(v);
}

/** column text filters (contains, case-insensitive) + one search over every visible column */
export function filterRows(rows: Row[], cols: Col[], filters: Record<string, string>, search: string): Row[] {
  const active = Object.entries(filters).filter(([, v]) => v.trim() !== '').map(([k, v]) => [k, v.trim().toLowerCase()] as const);
  const q = search.trim().toLowerCase();
  const vis = cols.filter((c) => c.visible);
  if (!active.length && !q) return rows;
  return rows.filter((r) => {
    for (const [k, v] of active) if (!String(r[k] ?? '').toLowerCase().includes(v)) return false;
    if (q) return vis.some((c) => String(r[c.name] ?? '').toLowerCase().includes(q));
    return true;
  });
}

export function sortRows(rows: Row[], cols: Col[], sort: Sort): Row[] {
  if (!sort) return rows;
  const c = cols.find((x) => x.name === sort.col);
  if (!c) return rows;
  const dir = sort.dir === 'desc' ? -1 : 1;
  const numeric = c.numeric || c.digits !== null;
  return [...rows].sort((a, b) => {
    const x = a[c.name], y = b[c.name];
    if (numeric) return (num(x) - num(y)) * dir;
    return String(x ?? '').localeCompare(String(y ?? ''), undefined, { numeric: true, sensitivity: 'base' }) * dir;
  });
}

/** the report's own default order (first column with an order), as the web grid sorted it */
export function defaultSort(cols: Col[]): Sort {
  const c = cols.find((x) => x.order !== -1);
  return c ? { col: c.name, dir: c.order === 1 ? 'desc' : 'asc' } : null;
}

export type Totals = Record<string, number>;

/** sum / count / average of the total columns (web summaryReducer) */
export function totalsOf(rows: Row[], cols: Col[]): Totals {
  const t: Totals = {};
  cols.forEach((c) => {
    if (c.total === null) return;
    if (c.total === 0) t[c.name] = rows.length;
    else {
      const s = rows.reduce((a, r) => a + num(r[c.name]), 0);
      t[c.name] = c.total === 2 ? (rows.length ? Math.round(s / rows.length) : 0) : s;
    }
  });
  return t;
}

export function totalText(c: Col, t: Totals): string {
  if (c.total === null || !(c.name in t)) return '';
  if (c.total === 0) return String(t[c.name]);
  const d = c.digits !== null ? c.digits : 2;
  return t[c.name].toLocaleString('en-IN', { minimumFractionDigits: d, maximumFractionDigits: d });
}

export type Group = { key: string; label: string; rows: Row[]; totals: Totals; children?: Group[] };

/** nested groups by the group columns (web groupBy) with their own totals */
export function groupRows(rows: Row[], cols: Col[], groupBy: string[]): Group[] {
  if (!groupBy.length) return [];
  // key = the whole path (Party A › Jan and Party B › Jan are two different groups)
  const build = (list: Row[], depth: number, parent: string): Group[] => {
    const col = groupBy[depth];
    const def = cols.find((c) => c.name === col);
    const by = new Map<string, Row[]>();
    list.forEach((r) => {
      const k = String(r[col] ?? '');
      if (!by.has(k)) by.set(k, []);
      by.get(k)!.push(r);
    });
    return [...by.entries()].map(([k, rs]) => ({
      key: `${parent}|${depth}:${k}`,
      label: `${def ? def.header : col}: ${k === '' ? '(blank)' : k === 'true' ? 'Yes' : k === 'false' ? 'No' : k}`,
      rows: rs,
      totals: totalsOf(rs, cols),
      children: depth + 1 < groupBy.length ? build(rs, depth + 1, `${parent}|${depth}:${k}`) : undefined,
    }));
  };
  return build(rows, 0, '');
}

/** the colour of a row, as the web grid painted it (BStatus / BSrNo / statuscolor) */
export function rowTint(r: Row): string | null {
  const s = String(r.BStatus ?? r.bstatus ?? '');
  if (s === 'C') return '#dde89c';
  if (s === 'P') return '#7fccdf';
  if (String(r.BSrNo ?? r.bsrno ?? '') === 'B1' && s === '') return '#ff000045';
  return null;
}
export function cellTint(c: Col, v: any): string | null {
  if (c.name !== 'statuscolor') return null;
  const s = String(v ?? '').toUpperCase();
  return s === 'GREEN' ? '#98fb98' : s === 'RED' ? '#ff6d6d' : null;
}
