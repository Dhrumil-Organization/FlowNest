// FILE: src/components/SalesInvoiceBrowse/model.ts
// Pure helpers of the Sales Invoice browse screen — no React, no HTTP, no storage.

export type Row = Record<string, any>;

/** Last 2 characters of the year ('2026-2027' -> '27'), '' when empty. */
export const yy = (yearno: any): string => (yearno ? String(yearno).slice(-2) : '');

const pad2 = (n: number) => String(n).padStart(2, '0');

/** yyyy-mm-dd — the invoicebrowse date format (fromdate / todate). */
export const isoDate = (d: Date): string => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

/** dd-mm-yyyy — the multi print date format (datefrom / dateto). */
export const dmy = (d: Date): string => `${pad2(d.getDate())}-${pad2(d.getMonth() + 1)}-${d.getFullYear()}`;

/** 'dd/mm/yyyy' (card date) -> Date, null when it is not in that shape. */
export const parseSlashDmy = (text: any): Date | null => {
  const m = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(String(text || '').trim());
  return m ? new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1])) : null;
};

/** 'yyyy-mm-dd' -> 'dd-mm-yyyy' for the "applied filter" line. */
export const showIso = (v: string): string => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v || '');
  return m ? `${m[3]}-${m[2]}-${m[1]}` : v || '-';
};

/** '00006043/FS' -> { no: '00006043', series: 'FS' } */
export const splitBillNo = (bill: any): { no: string; series: string } => {
  const s = String(bill || '').trim();
  const i = s.indexOf('/');
  return i < 0 ? { no: s, series: '' } : { no: s.slice(0, i), series: s.slice(i + 1) };
};

/** ('00006043', 'FS') -> '00006043/FS' (series blank -> just the number) */
export const joinBillNo = (no: string, series: string): string => {
  const n = String(no || '').trim();
  const s = String(series || '').trim();
  if (!n) return '';
  return s ? `${n}/${s}` : n; // suffix goes only when it was entered
};

/** Current financial year and the 4 before it, as 'YYYY-YYYY+1' (FY starts 1 April). */
export const buildYearOptions = (now: Date = new Date()): string[] => {
  const start = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  return Array.from({ length: 5 }, (_, i) => `${start - i}-${start - i + 1}`);
};

/** 1 Apr -> today (current FY) or 31 Mar (other years). */
export const financialYearDates = (fy: string, today: Date = new Date()): { from: Date; to: Date } | null => {
  if (!fy) return null;
  const [a, b] = fy.split('-').map((x) => parseInt(x, 10));
  if (!a || !b) return null;
  const curStart = today.getMonth() >= 3 ? today.getFullYear() : today.getFullYear() - 1;
  const from = new Date(a, 3, 1);
  const to = a === curStart ? today : new Date(b, 2, 31);
  return { from, to };
};

/* ---------------- invoice card fields ---------------- */

const text = (v: any) => (v === undefined || v === null ? '' : String(v).replace(/\s+/g, ' ').trim());

export const getInvNo = (i: Row) => text(i?.BillNo) || '-';
export const getInvDate = (i: Row) => text(i?.ChalDate) || '-';
export const getNetAmt = (i: Row) => text(i?.NetAmt) || '0.00';
export const getBalAmt = (i: Row) => text(i?.BalAmt) || '0.00';
export const getUid = (i: Row) => String(i?.UId ?? i?.Uid ?? i?.uid ?? '');
/** Blank values are shown as '-'. */
export const show = (v: any) => text(v) || '-';
export const isIrnCancelled = (i: Row) => String(i?.isirncancel) === '1';
export const isEwayCancelled = (i: Row) => String(i?.isewaycancel) === '1';

/** Store picker row -> code / name. */
export const storeCode = (s: Row) => String(s?.StrCode ?? s?.Code ?? s?.strcode ?? '');
export const storeName = (s: Row) => String(s?.StrName ?? s?.LngName ?? s?.Name ?? s?.StrDesc ?? s?.strname ?? storeCode(s));

/** On-screen filter on top of the server search. */
export const filterInvoices = (rows: Row[], search: string): Row[] => {
  const s = String(search || '').toLowerCase();
  if (!s) return rows;
  return rows.filter((i) =>
    [i?.BillNo, i?.ParName, i?.ChalDate, i?.ackno, i?.ewayno, i?.VehNo, i?.Remark].some((v) =>
      String(v ?? '').toLowerCase().includes(s),
    ),
  );
};

export type BrowseFilters = {
  prpcode: string;
  yearno: string;
  strcode: string;
  fromdate: string;
  todate: string;
};

/** Print Type of the criteria form -> txntype sent to every API. */
export const TXN_OPTIONS = [
  { label: 'Sales Invoice', txntype: 'sales_invoice' },
  { label: 'Sales Challan', txntype: 'sales_challan' },
  { label: 'Debit Note', txntype: 'debit_note' },
  { label: 'Credit Note', txntype: 'credit_note' },
];
export const txnLabel = (txntype: string): string => TXN_OPTIONS.find((o) => o.txntype === txntype)?.label || 'Sales Invoice';
