// FILE: src/components/OwnerDashboardNEW/prodOrderModel.ts
// Response contract of GET /api/getprodorderdashboard + pure helpers (no API / state here).
//   { summary: { allProductionOrders, stageOverdue, sharedExecutives, fullySold }, data: ProdOrderRow[] }
import type { BeamRow, BillRow, NowAt, OutInRow, PlanActualRow, StageCell, StageDef, StageStatus } from './trackerModel';

export type ProdOrderSummary = {
  allProductionOrders: number;
  stageOverdue: number;
  sharedExecutives: number;
  fullySold: number;
};

/** The API sends every value as a string (or null). */
export type ProdOrderRow = {
  TrackId: string;
  ProductionQty: string;
  dsnname: string;
  itmname: string;
  ProductionOrderNo: string;
  ProductionOrderDate: string; // 'YYYYMMDD'
  BeamCount: string | null;
  SexName: string | null; // executive name
  Sexe?: string | null; // executive code (same as get_criterion Code) — used by the executive filter
  WarpingTimeStatus?: string | null;
  LoomShedsTimeStatus?: string | null;
  GreyCheckingTimeStatus?: string | null;
  OutwardTimeStatus?: string | null; // optional - only shown when the API sends it
  InwardTimeStatus?: string | null;
  PackingTimeStatus?: string | null;
  SaleTimeStatus?: string | null;
  CurrentStage: string;
  TotalDelayDays: string;
  SoldPercent: string;
  [key: string]: string | null | undefined;
};

export type ProdOrderData = { summary: ProdOrderSummary; data: ProdOrderRow[] };

export type ProdFilter = 'all' | 'overdue' | 'shared' | 'sold';

export type ProdStageDef = StageDef & { field: string; optional?: boolean };

/** Order = the order of the dots. */
export const PROD_STAGES: ProdStageDef[] = [
  { key: 'warp', label: 'Warping', short: 'Warp', field: 'WarpingTimeStatus' },
  { key: 'loom', label: 'Loom shed', short: 'Loom', field: 'LoomShedsTimeStatus' },
  { key: 'grey', label: 'Grey checking', short: 'Grey', field: 'GreyCheckingTimeStatus' },
  { key: 'out', label: 'Outward', short: 'Out', field: 'OutwardTimeStatus', optional: true },
  { key: 'in', label: 'Inward', short: 'In', field: 'InwardTimeStatus' },
  { key: 'pack', label: 'Packing', short: 'Pack', field: 'PackingTimeStatus' },
  { key: 'sale', label: 'Sale', short: 'Sale', field: 'SaleTimeStatus' },
];

/** Stages to draw: the optional ones only when the API really sends them. */
export const stageDefsFor = (rows: ProdOrderRow[]): ProdStageDef[] =>
  PROD_STAGES.filter((d) => !d.optional || rows.some((r) => r[d.field] !== undefined));

/** A row is "fully sold" from this sold % (the API's fullySold count matches 95+). */
export const FULLY_SOLD_PCT = 95;

export const num = (v: string | number | null | undefined): number => {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? ''));
  return Number.isFinite(n) ? n : 0;
};

export const toStatus = (raw: string | null | undefined): StageStatus => {
  const s = String(raw ?? '').trim().toLowerCase();
  if (s === 'on time') return 'ontime';
  if (s.startsWith('done')) return 'late';
  if (s === 'overdue') return 'overdue';
  if (s === 'not needed') return 'skip';
  if (s.includes('progress')) return 'progress';
  return 'pending';
};

export const stageCells = (row: ProdOrderRow, defs: ProdStageDef[]): StageCell[] =>
  defs.map((d) => ({ key: d.key, status: toStatus(row[d.field]), days: 0, done: 0, total: 0 }));

export const delayDays = (row: ProdOrderRow) => Math.round(num(row.TotalDelayDays));

/** Needs action now: a stage is overdue, or the order is running late. */
export const isOverdue = (row: ProdOrderRow) =>
  delayDays(row) > 0 || PROD_STAGES.some((d) => toStatus(row[d.field]) === 'overdue');

export const isFullySold = (row: ProdOrderRow) => num(row.SoldPercent) >= FULLY_SOLD_PCT;

export const hasExecutive = (row: ProdOrderRow) => !!(row.SexName && row.SexName.trim());

const STAGE_LABEL: Record<string, string> = {
  outwards: 'Outward',
  inwards: 'Inward',
};

export const stageLabel = (raw: string | null | undefined) => {
  const s = String(raw ?? '').trim();
  return STAGE_LABEL[s.toLowerCase()] || s || '—';
};

/** 'Now at' pill: stage + days late. Red when late / overdue, grey for a fresh production order, green otherwise. */
export const nowOf = (row: ProdOrderRow): NowAt => {
  const days = delayDays(row);
  const late = isOverdue(row);
  const fresh = String(row.CurrentStage || '').trim().toLowerCase() === 'production order';
  return {
    key: String(row.CurrentStage || ''),
    label: stageLabel(row.CurrentStage),
    status: late ? 'overdue' : fresh ? 'pending' : 'ontime',
    days,
  };
};

export const nowPillText = (now: NowAt, row: ProdOrderRow) =>
  now.days > 0 ? `${now.label} · ${now.days}d late` : now.status === 'overdue' ? `${now.label} · overdue` : now.label;

export const beamsText = (row: ProdOrderRow) => {
  const n = Math.round(num(row.BeamCount));
  return n > 0 ? `${n} beam${n === 1 ? '' : 's'}` : '';
};

/** 'YYYY-YYYY' financial year (starts in April) — same value index.tsx sends as yearno. */
export const financialYear = (d: Date = new Date()) => {
  const y = d.getFullYear();
  const start = d.getMonth() + 1 >= 4 ? y : y - 1;
  return `${start}-${start + 1}`;
};

  const getCurrentFinancialYearMain = () => {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1; // getMonth() returns 0-11

    // Financial year starts in April
    const financialYearStart = currentMonth >= 4 ? currentYear : currentYear - 1;
    const financialYearEnd = financialYearStart + 1;

    return `${financialYearStart}-${financialYearEnd}`;
  };

/* ------------------------------------------------------------------ */
/* Stage detail (getprodorderstagedashboard)                           */
/* ------------------------------------------------------------------ */

/** prpcode sent to getprodorderstagedashboard — always 'sip'. */
export const PRP_CODE = 'SIP';

/** yearno sent to getprodorderstagedashboard. Same financial year as the list API; change here if it needs the short form. */
export const stageYearNo = () => '27';

/** One row of getprodorderstagedashboard -> data[] (every value is a string or null). */
export type StageApiRow = {
  StageId: string;
  StageName: string;
  TotalBeam: string | null;
  CompletedBeam: string | null;
  PendingBeam: string | null;
  PlanDate: string | null; // 'YYYY-MM-DD'
  DoneDate: string | null; // 'YYYY-MM-DD'
  TimeStatus: string | null; // 'On Time' | 'Overdue' | 'Pending' | 'Not Needed' | 'Done ...'
  TotalDelayDays: string | null;
  AssignedStatus: string | null;
};

/** What the detail screen draws for one stage. */
export type StageDetailRow = {
  key: string;
  label: string;
  status: StageStatus;
  days: number;
  done: number;
  total: number;
  pending: number;
  planned_ymd: number | null;
  done_ymd: number | null;
  assigned: string;
};

export type StageDetail = {
  stages: StageDetailRow[];
  // optional sections — filled only when the API sends them (same shapes as the old tracker)
  beam_rows: BeamRow[];
  out_in: OutInRow[];
  bills: { available: boolean; rows: BillRow[] };
  plan_actual: { available: boolean; unplanned_pct: number | null; rows: PlanActualRow[] };
};

/** '2026-10-12' -> 20261012 (null when empty / invalid). */
export const dateToYmd = (v: string | null | undefined): number | null => {
  const m = String(v ?? '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? Number(`${m[1]}${m[2]}${m[3]}`) : null;
};

/**
 * Turns the body of getprodorderstagedashboard ({ data: [ {StageName, PlanDate, DoneDate, TimeStatus ...} ] },
 * optionally wrapped in `response`) into the rows the detail screen draws.
 * Returns null when the body has no `data` array.
 */
export const normalizeStageDetail = (raw: any): StageDetail | null => {
  const p = raw && typeof raw === 'object' ? (Array.isArray(raw.data) ? raw : raw.response && typeof raw.response === 'object' ? raw.response : raw) : null;
  const list: StageApiRow[] | null = p && Array.isArray(p.data) ? p.data : Array.isArray(p) ? p : null;
  if (!list) return null;

  const arr = (v: any): any[] => (Array.isArray(v) ? v : []);
  const bills = p.bills ?? p.Bills;
  const plan = p.plan_actual ?? p.planActual;
  const planRows = Array.isArray(plan) ? plan : arr(plan?.rows);

  return {
    beam_rows: arr(p.beam_rows ?? p.beamRows ?? p.beams),
    out_in: arr(p.out_in ?? p.outIn ?? p.outward_inward),
    bills: { available: Array.isArray(bills) || Array.isArray(bills?.rows), rows: Array.isArray(bills) ? bills : arr(bills?.rows) },
    plan_actual: {
      available: planRows.length > 0,
      unplanned_pct: plan && typeof plan.unplanned_pct === 'number' ? plan.unplanned_pct : null,
      rows: planRows,
    },
    stages: list.map((r, i) => {
      const total = Math.round(num(r.TotalBeam));
      const done = Math.round(num(r.CompletedBeam));
      return {
        key: `${r.StageId}-${r.StageName}-${i}`,
        label: String(r.StageName || '').trim() || '—',
        status: toStatus(r.TimeStatus),
        days: Math.round(num(r.TotalDelayDays)),
        done,
        total,
        pending: Math.round(num(r.PendingBeam)),
        planned_ymd: dateToYmd(r.PlanDate),
        done_ymd: dateToYmd(r.DoneDate),
        assigned: String(r.AssignedStatus || '').trim(),
      };
    }),
  };
};

/* ------------------------------------------------------------------ */
/* Collapsible sections: beam-wise / outward-inward / sales bills       */
/* ------------------------------------------------------------------ */

export type BeamwiseApiRow = {
  Beam: string;
  Machine: string | null;
  Warp: string | null; // 'YYYY-MM-DD'
  Loom: string | null;
  Grey: string | null;
  OutwardStatus: string | null; // 'On Time' | '21d late' | 'Not Needed' | null
  InwardStatus: string | null;
  PackStatus: string | null;
  SaleStatus: string | null;
};

export type InwOutApiRow = {
  ProductionOrderNo: string;
  BeamNo: string;
  OutwardNos: string | null; // 'a, b, c'
  OutwardDates: string | null; // '20260806, 20260808'
  OutQty: string | null;
  InwardNos: string | null;
  InwardDates: string | null;
  Lot: string | null;
};

export type InvoiceApiRow = {
  BeamUid: string;
  SaleDate: string | null; // 'YYYY-MM-DD'
  SaleQty: string | null;
  InvoiceNo: string | null; // 'a, b'
  LrNo: string | null;
  Rate: string | null;
  Amount: string | null; // '218080.00, 29952.00'
  ChallanNo: string | null;
  SaleDelayDays: string | null;
};

/** The rows of a `{ data: [...] }` body (also accepts `{ response: { data } }` or a bare array). */
export const rowsOf = <T,>(body: any): T[] | null => {
  if (Array.isArray(body)) return body as T[];
  if (body && Array.isArray(body.data)) return body.data as T[];
  if (body?.response) return rowsOf<T>(body.response);
  return null;
};

/** 'a, b ,c' -> ['a','b','c'] (empty / null -> []). */
export const splitList = (v: string | null | undefined): string[] =>
  String(v ?? '')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);

/** '20260806, 20260808' -> [20260806, 20260808] */
export const ymdList = (v: string | null | undefined): number[] =>
  splitList(v)
    .map((x) => Number(x.replace(/\D/g, '')))
    .filter((n) => n > 0);

/** Text of a beam-wise status cell -> label + kind (drives the pill colour). */
export const beamStatusOf = (raw: string | null | undefined): { text: string; kind: 'ok' | 'late' | 'skip' | 'pending' } => {
  const t = String(raw ?? '').trim();
  const l = t.toLowerCase();
  if (!t) return { text: 'pending', kind: 'pending' };
  if (l === 'on time') return { text: 'On time', kind: 'ok' };
  if (l.includes('late') || l.includes('overdue')) return { text: t, kind: 'late' };
  if (l === 'not needed') return { text: 'Not needed', kind: 'skip' };
  return { text: t, kind: 'pending' };
};
