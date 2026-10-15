// FILE: src/components/TakaHistory/model.ts
// Response types + small pure helpers of the Taka History module (no API / state here).
import { T } from '@/src/theme';

/** Store code sent to the API (store is no longer a filter). */
export const TAKA_STR_CODE = '012';

export type TakaRun = {
  run_id: number;
  reused: boolean;
  prp_codes: string;
  str_codes: string;
  as_on_date: string | null;
  created_at: string;
  takas: number;
  seconds: number;
};

export type TakaRow = {
  key: string;
  property: string;
  taka_no: string;
  design: string;
  shade: string | null;
  inward_from: string;
  inward_qty: number;
  inward_date: string | null;
  steps: number;
  total_sales: number;
  closing: number;
  at_job_worker: number;
  location: string | null;
  since: string | null;
};

export type TakaStep = {
  step: number;
  process: string;
  design: string;
  shade: string | null;
  qty: number;
  date: string | null;
};

export type TakaTotals = {
  takas: number;
  inward_qty: number;
  total_sales: number;
  closing: number;
  at_job_worker: number;
};

export type TakaSort = 'taka' | 'closing' | 'sales' | 'date';

export type TakaFilters = {
  search?: string;
  prp?: string;
  only_in_stock?: 0 | 1;
  sort?: TakaSort;
  page?: number;
  per_page?: number;
};

export type TakasPage = { data: TakaRow[]; page: number; last_page: number };
export type TakaDetailData = { taka: TakaRow; steps: TakaStep[] };

export const SORTS: { key: TakaSort; label: string }[] = [
  { key: 'taka', label: 'Taka no' },
  { key: 'closing', label: 'Closing' },
  { key: 'sales', label: 'Sales' },
  { key: 'date', label: 'Latest' },
];

/** Colour of each process step on the journey timeline. */
export const processColors: Record<string, string> = {
  'Job Outward': '#7C3AED',
  'Job Transfer': '#9333EA',
  'Job Out Return': '#0E7490',
  'Job Inward': '#0369A1',
  Conversion: '#B45309',
  Cutting: '#BE185D',
  Packing: '#4D7C0F',
  Sale: '#15803D',
  'Pur Return': '#B91C1C',
  'Process Out': '#6B7280',
  'Repack Issue': '#6B7280',
};
export const processColor = (p: string) => processColors[p] || T.nav;

export const fmtQty = (n: number | string | null | undefined) =>
  Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const pad = (n: number | string) => String(n).padStart(2, '0');

/** today as dd/mm/yyyy */
export const todayText = () => {
  const d = new Date();
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
};

/** Current financial year (April - March) as "2026-2027". The filter has no year dropdown - this is always sent as yearno. */
export const getCurrentFinancialYearMain = () => {
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1; // getMonth() returns 0-11

  // Financial year starts in April
  const financialYearStart = currentMonth >= 4 ? currentYear : currentYear - 1;
  const financialYearEnd = financialYearStart + 1;

  return `${financialYearStart}-${financialYearEnd}`;
};

/** dd/mm/yyyy -> yyyy-mm-dd (null when invalid) */
export const toIso = (text: string) => {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text.trim());
  if (!m) return null;
  const [, d, mo, y] = m;
  const dt = new Date(Number(y), Number(mo) - 1, Number(d));
  if (dt.getDate() !== Number(d) || dt.getMonth() !== Number(mo) - 1) return null;
  return `${y}-${pad(mo)}-${pad(d)}`;
};
