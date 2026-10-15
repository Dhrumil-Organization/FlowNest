// FILE: src/components/OwnerDashboardNEW/trackerModel.ts
// Response contract of the Executive Summary drill-down
//   GET /api/getOwnerSummaryOrders       -> TrackerOrdersData
//   GET /api/getOwnerSummaryOrderDetail  -> TrackerDetailData
// plus the pure display helpers of the stage tracker. No API / state here.
import { T } from '@/src/theme';

/** ontime = done on time · late = done late · progress = some beams done ·
 *  overdue = waiting past its planned date · pending = not started · skip = not needed · none = no production yet */
export type StageStatus = 'ontime' | 'late' | 'progress' | 'overdue' | 'pending' | 'skip' | 'none';

export type StageDef = { key: string; label: string; short: string };

export type StageCell = { key: string; status: StageStatus; days: number; done: number; total: number };

export type StageRow = StageCell & {
  label: string;
  planned_ymd: number | null;
  done_ymd: number | null;
  last_done_ymd: number | null;
};

export type NowAt = { key: string; label: string; status: StageStatus; days: number };

export type TrackerOrder = {
  uid: string;
  prpcode: string;
  so_no: string;
  so_date_ymd: number | null;
  party: string;
  executive_code: string;
  executive: string;
  design: string;
  more_designs: number;
  item: string;
  qty: number;
  pending_qty: number;
  sold_qty: number;
  sold_pct: number;
  due_ymd: number | null;
  days_to_due: number | null;
  production_orders?: string[];
  beams?: number;
  stages?: StageCell[];
  now?: NowAt;
};

export type TrackerOrdersData = {
  stages: StageDef[];
  summary: {
    orders: number;
    overdue: number;
    delivery_past: number;
    not_planned: number;
    tracking_available: boolean;
    tracking_message: string;
    truncated: boolean;
  };
  orders: TrackerOrder[];
  generated_at?: string;
};

export type BeamStage = { status: StageStatus; date_ymd: number | null; planned_ymd: number | null; days: number };

export type BeamRow = { beam_uid: string; beam: string; machine: string; woven: number; stages: Record<string, BeamStage> };

export type OutInRow = {
  beam: string;
  outward_nos: string;
  outward_dates: string;
  outward_qty: number;
  inward_nos: string;
  inward_dates: string;
  inward_qty: number;
  lot: string;
};

export type PlanActualRow = {
  beam: string;
  planned: number;
  actual: number;
  on_plan: number;
  unplanned: number;
  not_made: number;
  result: 'more' | 'less' | 'as_planned' | 'unplanned';
};

export type SiblingOrder = {
  uid: string;
  so_no: string;
  executive: string;
  party: string;
  qty: number;
  share_pct: number | null;
  due_ymd: number | null;
  sold_qty: number;
  sold_pct: number;
  is_current: boolean;
};

export type TrackerProductionOrder = {
  uid: string;
  no: string;
  date_ymd: number | null;
  design: string;
  item: string;
  qty: number;
  beams: number;
  woven: number;
  sold: number;
  stages: StageRow[];
  now: NowAt;
  sales_orders: SiblingOrder[];
  beam_rows: BeamRow[];
  out_in: OutInRow[];
  plan_actual: {
    available: boolean;
    unplanned_pct: number | null;
    rows: PlanActualRow[];
    total: { planned: number; actual: number; on_plan: number; unplanned: number; not_made: number } | null;
  };
};

export type BillRow = {
  challan_no: string;
  challan_ymd: number | null;
  bill_no: string;
  bill_ymd: number | null;
  qty: number;
  amount: number;
};

export type TrackerDetailData = {
  stages: StageDef[];
  order: TrackerOrder;
  now: NowAt;
  biggest_delay: { label: string; days: number; status: StageStatus } | null;
  overall_stages: StageRow[];
  production_orders: TrackerProductionOrder[];
  bills: { available: boolean; rows: BillRow[]; total_qty: number; total_amount: number };
  tracking_available: boolean;
  tracking_message: string;
  responsible_available: boolean;
  generated_at?: string;
};

/* ------------------------------------------------------------------ */
/* Display helpers                                                     */
/* ------------------------------------------------------------------ */

export const STATUS_LEGEND: { status: StageStatus; label: string }[] = [
  { status: 'ontime', label: 'Done on time' },
  { status: 'late', label: 'Done late' },
  { status: 'progress', label: 'In progress' },
  { status: 'overdue', label: 'Overdue now' },
  { status: 'pending', label: 'Not started' },
  { status: 'skip', label: 'Not needed' },
];

/** Not started = dark grey, Not needed = periwinkle blue (dashed ring). Text colour of the matching pills below. */
export const NOT_STARTED = '#5F6672';
export const NOT_NEEDED = '#5B7FD6';
export const NOT_NEEDED_TEXT = '#3A55B0';

/** NEW ERP theme colours of each stage status. */
export const statusColor = (status: StageStatus | undefined): string => {
  switch (status) {
    case 'ontime':
      return T.green;
    case 'late':
      return T.amber;
    case 'progress':
      return T.yd;
    case 'overdue':
      return T.red;
    case 'pending':
      return NOT_STARTED;
    case 'skip':
      return NOT_NEEDED;
    default:
      return T.muted;
  }
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** 20261005 -> '05 Oct 26' (withYear) / '05 Oct'; empty -> '' */
export const ymd = (value: number | null | undefined, withYear = true): string => {
  if (!value || value <= 0) return '';
  const s = String(Math.trunc(value)).padStart(8, '0');
  const month = MONTHS[Number(s.slice(4, 6)) - 1] || '';
  return withYear ? `${s.slice(6, 8)} ${month} ${s.slice(2, 4)}` : `${s.slice(6, 8)} ${month}`;
};

export const qty = (value: number | null | undefined): string =>
  typeof value === 'number' && Number.isFinite(value) ? value.toLocaleString('en-IN', { maximumFractionDigits: 0 }) : '—';

export const pct = (value: number | null | undefined): string =>
  typeof value === 'number' && Number.isFinite(value) ? `${Math.round(value)}%` : '—';

/** Text of a stage status ('Done, 109 days late', 'Overdue 6 days', …). */
export const stageStatusText = (status: StageStatus, days: number, done = 0, total = 0): string => {
  const d = `${days} day${days === 1 ? '' : 's'}`;
  switch (status) {
    case 'ontime':
      return 'Done on time';
    case 'late':
      return `Done, ${d} late`;
    case 'overdue':
      return `Overdue ${d}`;
    case 'progress':
      return total > 0 ? `In progress · ${done} of ${total}` : 'In progress';
    case 'skip':
      return 'Not needed';
    default:
      return 'Not started';
  }
};

/** 'Outward · 6d late' pill text of the list. */
export const nowText = (now: NowAt | undefined): string => {
  if (!now) return '—';
  return now.status === 'overdue' && now.days > 0 ? `${now.label} · ${now.days}d late` : now.label;
};

/** '82 days past' / '3 days left' / 'Due today' */
export const dueText = (days: number | null | undefined): string => {
  if (days === null || days === undefined) return 'No delivery date';
  if (days < 0) return `${Math.abs(days)} day${days === -1 ? '' : 's'} past`;
  if (days === 0) return 'Due today';
  return `${days} day${days === 1 ? '' : 's'} left`;
};

export const RESULT_LABEL: Record<PlanActualRow['result'], string> = {
  more: 'More than plan',
  less: 'Less than plan',
  as_planned: 'As planned',
  unplanned: 'Unplanned beam',
};
