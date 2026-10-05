// FILE: src/components/OwnerDashboardNEW/model.ts
// Types (the response contract of GET /api/getOwnerSummaryDashboard) and the
// pure display helpers of the Owner Dashboard. No API / state lives here.
import {
  formatDashboardAmount,
  type DashboardAmountMode,
} from '@/src/components/dashboard/AmountDisplayModeControl';

export type Num = number | null | undefined;

export type OwnerExecutiveOption = { code: string; name: string };

export type OwnerCountBlock = { count: Num; mtrs?: Num; amount?: Num; pct?: Num };

export type OwnerProductionRow = {
  key: string;
  label: string;
  today_mtrs: Num;
  mtd_mtrs: Num;
  efficiency: Num;
  avg_efficiency: Num;
  avg_rpm: Num;
  looms?: number;
  low_efficiency_looms?: number;
};

export type OwnerDeploymentRow = {
  key: string;
  label: string;
  today_attendance: Num;
  today_salary: Num;
  mtd_attendance: Num;
  mtd_salary: Num;
  avg_per_day: Num;
};

export type OwnerExecutiveRow = {
  code: string;
  name: string;
  is_unassigned?: boolean;
  open_order: number;
  open_amount: number;
  mto_order: number;
  mto_amount: number;
  running_order: number;
  running_amount: number;
  outstanding: number;
  due_amount: number;
};

export type OwnerSourceStatus = { status: 'ok' | 'unavailable' | string; source: string; message: string };

export type OwnerSummaryData = {
  filters: {
    date: string;
    date_ymd: number;
    month_start_ymd: number;
    month_label: string;
    prptype: string;
    yearno: number;
    executive_code: string;
    executive_name: string;
  };
  executives: OwnerExecutiveOption[];
  kpis: {
    today_sales: Num;
    mtd_sales: Num;
    today_collection: Num;
    mtd_collection: Num;
    total_outstanding: Num;
    outstanding_basis?: string;
    overdue_payment: Num;
    collection: { received: Num; due: Num; pct: Num };
    sales_orders: {
      count: Num;
      mtrs: Num;
      amount: Num;
      today_count: Num;
      today_mtrs: Num;
      today_amount: Num;
    };
    running_order: OwnerCountBlock;
    pending_order: OwnerCountBlock;
    on_time_delivery: OwnerCountBlock;
    delay_delivery: OwnerCountBlock;
  };
  profit: {
    scope: string;
    sales: Num;
    total_expense: Num;
    gross_profit: Num;
    profit_pct: Num;
    expense_through_ymd?: Num;
    expense_range?: string;
    composition?: Record<string, number>;
    note?: string;
  };
  alerts: {
    delayed_orders: Num;
    open_orders: Num;
    low_efficiency_looms: Num;
    low_efficiency_threshold: number;
    low_efficiency_sheet_ymd?: Num;
    pending_sales_amount: Num;
    pending_sales_mtrs?: Num;
  };
  production: {
    rows: OwnerProductionRow[];
    total: { today_mtrs: Num; mtd_mtrs: Num; efficiency: Num; avg_efficiency: Num; avg_rpm: Num };
    production_period?: string;
    production_day_ymd?: Num;
    efficiency_available: boolean;
    efficiency_sheet_ymd?: Num;
    efficiency_message?: string;
    low_efficiency_threshold: number;
  };
  deployment: {
    rows: OwnerDeploymentRow[];
    total: Omit<OwnerDeploymentRow, 'key' | 'label'>;
    salary_available: boolean;
    salary_day_ymd?: Num;
    salary_days?: number;
    attendance_available: boolean;
    attendance_message?: string;
  };
  executive_rows: OwnerExecutiveRow[];
  executive_total: Omit<OwnerExecutiveRow, 'code' | 'name' | 'is_unassigned'>;
  order_book?: { available: boolean; mto_supported: boolean; as_on_ymd: number; no_due_date_count: number };
  sources?: Record<string, OwnerSourceStatus>;
  generated_at?: string;
};

/* ------------------------------------------------------------------ */
/* Display helpers                                                     */
/* ------------------------------------------------------------------ */

export const DASH = '—';

const isNum = (v: Num): v is number => typeof v === 'number' && Number.isFinite(v);

/** ₹ amount in the dashboard-wide Compact / Actual mode; null -> — */
export const money = (v: Num, mode: DashboardAmountMode) => (isNum(v) ? formatDashboardAmount(v, mode) : DASH);

/** Plain count; null -> — */
export const count = (v: Num) => (isNum(v) ? Math.round(v).toLocaleString('en-IN') : DASH);

/** Metres. Compact mode shortens lakhs / thousands, Actual shows the full figure. */
export const mtrs = (v: Num, mode: DashboardAmountMode = 'actual') => {
  if (!isNum(v)) return DASH;
  const abs = Math.abs(v);
  if (mode === 'compact') {
    if (abs >= 10000000) return `${(v / 10000000).toFixed(2)} Cr`;
    if (abs >= 100000) return `${(v / 100000).toFixed(2)} L`;
  }
  return v.toLocaleString('en-IN', { maximumFractionDigits: 0 });
};

export const percent = (v: Num, digits = 1) => (isNum(v) ? `${v.toFixed(digits)}%` : DASH);

export const rpm = (v: Num) => (isNum(v) && v > 0 ? Math.round(v).toLocaleString('en-IN') : DASH);

const pad2 = (n: number) => String(n).padStart(2, '0');
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const toIsoDate = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

/** 'Oct-26' — same caption the Excel sheet shows next to the date. */
export const monthLabel = (d: Date) => `${MONTHS[d.getMonth()]}-${String(d.getFullYear()).slice(-2)}`;

/** 20261001 -> '01 Oct' ('' when empty) */
export const ymdLabel = (ymd: Num) => {
  if (!isNum(ymd) || ymd <= 0) return '';
  const s = String(Math.trunc(ymd)).padStart(8, '0');
  const m = Number(s.slice(4, 6));
  return `${s.slice(6, 8)} ${MONTHS[m - 1] || ''}`.trim();
};

/** Efficiency colour band: green >= threshold, amber within 5 points, red below. */
export const efficiencyBand = (v: Num, threshold: number): 'good' | 'warn' | 'bad' | 'none' => {
  if (!isNum(v) || v <= 0) return 'none';
  if (v >= threshold) return 'good';
  if (v >= threshold - 5) return 'warn';
  return 'bad';
};
