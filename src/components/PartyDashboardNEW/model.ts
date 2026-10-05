// FILE: src/components/PartyDashboardNEW/model.ts
// Pure helpers / calculations of the Party Dashboard — identical to the inline
// expressions of legacy components/PartyDashboard/index.tsx and PartyDetailScreen.tsx.
import type { Row } from './api';

/** legacy: 5 options starting at the current CALENDAR year: "2026-2027", "2025-2026", … */
export function buildYearOptions(now: Date = new Date()): string[] {
  const y = now.getFullYear();
  const arr: string[] = [];
  for (let i = 0; i < 5; i++) arr.push(`${y - i}-${y - i + 1}`);
  return arr;
}

/** legacy: [Address, City, State, Cnty, Zip].filter(Boolean).join(', ') */
export const fullAddressOf = (p?: Row | null) =>
  [p?.Address, p?.City, p?.State, p?.Cnty, p?.Zip].filter(Boolean).join(', ');

/** legacy list search: accname contains search (case-insensitive) */
export const filterParties = (rows: Row[], search: string) =>
  rows.filter((i) => i.accname?.toLowerCase().includes(search.toLowerCase()));

/** legacy: Number(crlimit || 0).toLocaleString('en-IN', 0 decimals) */
export const fmtLimit = (v: any) =>
  Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

/** legacy: parseFloat(x || 0).toLocaleString()  (device locale, like legacy) */
export const num = (v: any) => parseFloat(v || 0);
export const money = (v: any) => num(v).toLocaleString();

/** legacy summary values: `₹ {value?.toLocaleString()}` — undefined renders as nothing */
export const summaryMoney = (v: any) => {
  const s = v?.toLocaleString?.();
  return `₹ ${s === undefined || s === null ? '' : s}`;
};

export type OutstandingCalc = {
  debit: number;
  credit: number;
  outstanding: number;
  paid: number;
  status: 'Paid' | 'Partial' | 'Pending';
};

/** legacy renderOutstanding calculations (paid = credit; Paid when outstanding === 0;
 *  Partial when outstanding > 0 && paid > 0; otherwise Pending). */
export function outstandingCalc(item: Row): OutstandingCalc {
  const debit = parseFloat(item.DrAmt || 0);
  const credit = parseFloat(item.CrAmt || 0);
  const outstanding = parseFloat(item.BalOsAmt || item.Outstanding || 0);
  const paid = credit;
  const isPaid = outstanding === 0;
  const isPartial = outstanding > 0 && paid > 0;
  return { debit, credit, outstanding, paid, status: isPaid ? 'Paid' : isPartial ? 'Partial' : 'Pending' };
}

/** legacy renderRate: `₹ ${parseFloat(Rate || 0).toFixed(2)}` */
export const rateText = (item: Row) => `₹ ${parseFloat(item.Rate || 0).toFixed(2)}`;

export const voucherOf = (item: Row) => item.VouNo || item.DocNo || '-';
export const particularsOf = (item: Row) => item.Ptcl || 'Transaction';

export const TABS = ['Outstanding', 'Ledger', 'Rate', 'Billings'] as const;
