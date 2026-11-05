// FILE: src/components/QuarterSummaryNEW/model.ts
// Pure helpers of the Quarter Summary screen — copied 1:1 from the legacy
// components/QuarterWiseDispatch/QuarterSummaryScreen.tsx (constants, number formats, month getters).

export const quarters = [
  { key: 'Q1', label: 'Apr - Jun' },
  { key: 'Q2', label: 'Jul - Sep' },
  { key: 'Q3', label: 'Oct - Dec' },
  { key: 'Q4', label: 'Jan - Mar' },
];

export const types = ['ALL', 'GREIGE', 'DYED'];
export const units = ['KG', 'PCS'];

/** legacy label of a type button: 'ALL' -> 'All', 'GREIGE' -> 'Greige' */
export const typeLabel = (t: string) => (t === 'ALL' ? 'All' : t[0] + t.slice(1).toLowerCase());

export const fmt = (value: any, suffix = '') =>
  `${Number(value || 0).toLocaleString('en-IN', {
    maximumFractionDigits: 3,
  })}${suffix}`;

export const fmtCompact = (value: any, suffix = '') => {
  const n = Number(value || 0);
  return `${n.toLocaleString('en-IN', { maximumFractionDigits: 3 })}${suffix}`;
};

export const pct = (value: any) => `${Number(value || 0).toFixed(2)}%`;

export const getMonthNo = (m: any) => m.month_no ?? m.MonthNo ?? m.MonthNO ?? 0;

export const getMonthName = (m: any) => m.month_name || m.MonthName || m.month || m.Month || '';

export const getOrderQty = (m: any) => Number(m?.orders?.qty ?? m?.OrderQty ?? m?.order_qty ?? 0);

export const getDispatchQty = (m: any) => Number(m?.dispatch?.qty ?? m?.DispatchQty ?? m?.dispatch_qty ?? 0);

export const getPendingQty = (m: any) =>
  Number(m?.total_pending?.qty ?? m?.pending?.qty ?? m?.TotalPendingQty ?? m?.pending_qty ?? 0);

/** legacy: current calendar year and the 5 before it, as 'YYYY-YYYY+1' */
export const buildYearOptions = () => {
  const y = new Date().getFullYear();
  const years: string[] = [];
  for (let i = 0; i < 6; i++) {
    years.push(`${y - i}-${y - i + 1}`);
  }
  return years;
};

export function getPickerTitle(type: string) {
  if (type === 'fy') return 'Select Financial Year';
  if (type === 'unit') return 'Select Unit';
  if (type === 'party') return 'Select Party';
  return 'Select';
}
