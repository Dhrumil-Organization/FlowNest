// FILE: src/components/ProductionReportNEW/model.ts
// Pure helpers of the Production Report screen — ported 1:1 from legacy
// components/ProductionReport/index.tsx (formatters, search filter, balance calculation).
import { Row } from './api';

/** legacy formatFull: "05 Mar 2026" (label of the date fields) */
export const formatFull = (date: Date) =>
  date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

/** legacy fetchData (action 'report'): dd-mm-yyyy built from date.toISOString() (UTC calendar day).
 *  Dates come from PlatformDatePicker at local 12:00, exactly as in legacy. */
export const isoDateForReport = (date: Date | null): string => {
  if (!date) return '';
  const p = date.toISOString().split('T')[0].split('-');
  return p[2] + '-' + p[1] + '-' + p[0];
};

/** legacy formatDateForAPI (action 'packinginfo'): timezone-safe local dd-mm-yyyy */
export const formatDateForAPI = (date: Date | null): string => {
  if (!date || isNaN(date.getTime())) return '';
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
};

/** legacy formatDate: voudate 20260305 -> 05/03/2026 ('' when not 8 characters) */
export const formatDate = (input: any = ''): string => {
  if (!input || input === 0) return '';
  const str = String(input);
  if (str.length !== 8) return '';
  return `${str.substring(6, 8)}/${str.substring(4, 6)}/${str.substring(0, 4)}`;
};

/** legacy card balance: (parseFloat(a) - parseFloat(b)).toFixed(3).
 *  Display fix: when that is NaN (a value missing/blank) the legacy card printed "NaN"; here the blank
 *  side counts as 0 — the rule of legacy's own (unused) calcQty helper. */
export const balance = (a: any, b: any): string => {
  const raw = parseFloat(a) - parseFloat(b);
  if (!Number.isNaN(raw)) return raw.toFixed(3);
  const a1 = typeof a == 'undefined' || a == null || a == '' ? 0 : a;
  const b1 = typeof b == 'undefined' || b == null || b == '' ? 0 : b;
  const c = parseFloat(a1) - parseFloat(b1);
  return Number.isNaN(c) ? '0.000' : c.toFixed(3);
};

// Same fields and same OR-chain as legacy filteredData (text fields lower-cased, qty fields as text).
const TEXT_FIELDS = ['vouno', 'mgrpname', 'itmname', 'msgrpname', 'macname', 'mername'];
const QTY_FIELDS = ['prodorderqty', 'doffqty', 'packingqty'];

export function matchesSearch(item: Row, search: string): boolean {
  const s = (search || '').toLowerCase();
  return (
    // String() guard: legacy called .toLowerCase() directly and would crash on a numeric value
    TEXT_FIELDS.some((k) => item?.[k] != null && String(item[k]).toLowerCase().includes(s)) ||
    QTY_FIELDS.some((k) => item?.[k] != null && item[k].toString().includes(s))
  );
}

/** legacy guard used before loading years / stores */
export const hasProperty = (p: any) =>
  typeof p != 'undefined' && p != null && p != '' && Object.keys(p).length > 0;
