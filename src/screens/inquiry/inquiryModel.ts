// FILE: src/screens/inquiry/inquiryModel.ts
// NEW ERP — Inquiry module: types, colour maps, formatters, cost-sheet math.
// Same shapes as the legacy module (src_inquiry/types) so the backend
// contract does not change.
import { T } from '@/src/theme';

export type InquiryStatus =
  | 'pending_costing'
  | 'awaiting_auth'
  | 'auth_rejected'
  | 'costed'
  | 'sent'
  | 'confirmed'
  | 'rejected';

export type TatStatus = 'on_time' | 'warning' | 'breached' | 'not_applicable';

export interface Party {
  prp_code: string | null;
  acc_code: string;
  name: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  gstin?: string;
  mobile?: string;
  email?: string;
  contact?: string;
}

export interface GstinData {
  gstin: string;
  legal_name: string;
  trade_name: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  status: string;
}

export interface Design {
  prp_code: string | null;
  dsn_code: number;
  name: string;
  short?: string;
}

export interface InquiryShade {
  id?: number;
  inquiry_design_id?: number;
  shade_name: string;
  shade_code?: string | null;
  quantity: number;
  rate?: number | null;
  stock_qty?: number | null;
  stock_status?: 'sufficient' | 'low' | 'out' | 'unknown';
  total?: number;
  display_order?: number;
}

export interface InquiryDesignInput {
  design_prp_code: string | null;
  design_dsn_code: number | null;
  is_new_design: boolean;
  design_name_snapshot: string;
  construction_remarks: string;
  quantity: number;
  unit: string;
  expected_delivery_date?: string;
  gst_percent: number;
  shades?: InquiryShade[];
}

export interface InquiryDesign {
  id: number;
  inquiry_id: number;
  design_prp_code: string | null;
  design_dsn_code: number | null;
  is_new_design: boolean;
  design_name: string;
  construction_remarks: string | null;
  quantity: number;
  unit: string;
  expected_delivery_date: string | null;
  cost_per_mtr: number | null;
  gst_percent: number;
  amount: number;
  gst_amount: number;
  total_amount: number;
  is_costed: boolean;
  costing_method?: 'simple' | 'cost_sheet';
  shades?: InquiryShade[];
}

export interface TatLiveState {
  step_code: string | null;
  step_name: string | null;
  is_started: boolean;
  is_completed: boolean;
  started_at: string | null;
  completed_at: string | null;
  expected_hours: number;
  elapsed_hours: number;
  remaining_hours: number;
  variance_hours: number;
  status: TatStatus;
  percent_used: number;
}

export interface TatLive {
  costing: TatLiveState;
  send_quotation: TatLiveState;
  party_response: TatLiveState;
  overall: TatLiveState;
}

export interface InquiryNote {
  id: number;
  inquiry_id: number;
  note: string;
  created_by: number | null;
  created_by_name: string | null;
  is_edited: boolean;
  edited_at: string | null;
  prptype: string;
  yearno: string;
  created_at: string;
  updated_at: string;
}

export interface Inquiry {
  id: number;
  inquiry_no: string;
  inquiry_date: string;
  party_prp_code: string | null;
  party_acc_code: string;
  party_name: string;
  party_gstin: string | null;
  party_address: string | null;
  status: InquiryStatus;
  status_label: string;
  remarks: string | null;
  tat: { overall_status: TatStatus; [k: string]: any };
  designs_count?: number;
  designs?: InquiryDesign[];
  rejection?: { reason: string; remarks: string | null; at: string } | null;
  sales_order?: { id: number; so_no: string; so_date: string; grand_total: number } | null;
  latest_note?: InquiryNote | null;
  notes_count?: number;
  can_edit?: boolean;
  can_delete?: boolean;
  tat_live?: TatLive;
  created_at: string;
  updated_at: string;
}

export interface DashboardCounts {
  pending_costing: number;
  awaiting_auth: number;
  auth_rejected: number;
  costed: number;
  sent: number;
  confirmed: number;
  rejected: number;
  total: number;
}

export interface TatCounts {
  on_time: number;
  warning: number;
  breached: number;
}

export type CostSheetAuthStatus = 'draft' | 'awaiting_auth' | 'approved' | 'rejected';

export interface CostSheet {
  id?: number;
  inquiry_design_id: number;
  so_no?: string | null;
  quality?: string | null;
  total_quantity?: number;
  quantity_unit?: string;
  knitter_prp_code?: string | null;
  knitter_acc_code?: string | null;
  knitter_name?: string | null;
  mill_name?: string | null;
  shades_dyed?: string | null;
  greige_rate: number;
  purchase: number;
  brokerage: number;
  freight: number;
  dyeing_shortage_pct: number;
  dyeing_shortage_amount: number;
  dyeing_charge: number;
  value_add: number;
  packaging_charge: number;
  overheads_exp: number;
  overheads_basis?: string | null;
  hidden_cost_pct: number;
  hidden_cost_amount: number;
  sale_discount_pct: number;
  sale_discount_amount: number;
  sale_brokerage_pct: number;
  sale_brokerage_amount: number;
  total_cost: number;
  sale_rate: number;
  gross_margin_amount: number;
  gross_margin_pct: number;
  payment_term?: string | null;
  cost_remarks?: string | null;
  auth_status: CostSheetAuthStatus;
  authorized_by_name?: string | null;
  rejection_reason?: string | null;
  rejection_remarks?: string | null;
  [k: string]: any;
}

export interface AuthQueueItem {
  id: number;
  inquiry_id: number;
  inquiry_no: string;
  party_name: string;
  design_id: number;
  design_name: string;
  quality: string | null;
  total_quantity: number;
  quantity_unit: string;
  total_cost: number;
  sale_rate: number;
  gross_margin_amount: number;
  gross_margin_pct: number;
  submitted_at: string | null;
}

export interface TatConfiguration {
  id: number;
  step_code: string;
  step_name: string;
  expected_hours: number;
  warning_threshold_percent: number;
  is_active: boolean;
  description: string | null;
}

/** Row of /api/checkrights (module_rights[0]). */
export interface InquiryRights {
  assign?: string;
  attachtds?: string;
  detachtds?: string;
  [k: string]: any;
}

/* -------------------------------------------------------------------------- */
/*  Rules (identical to legacy)                                                */
/* -------------------------------------------------------------------------- */

/** `rights` sent to GET /api/inquiries: assign=3, attachtds=1, detachtds=2, else 0. */
export const rightsCode = (r: InquiryRights | null) =>
  !r ? 0 : r.assign === '1' ? 3 : r.attachtds === '1' ? 1 : r.detachtds === '1' ? 2 : 0;

/** detachtds = view-only user (no new / edit / notes / admin icons). */
export const isViewOnly = (r: InquiryRights | null) => r?.detachtds === '1';

export const isSip = (prptype: string) => String(prptype || '').trim().toUpperCase() === 'S';
/** S (weaving) talks about "design", every other property about "item". */
export const dsnWord = (prptype: string, plural = false) => (isSip(prptype) ? 'design' : 'item') + (plural ? 's' : '');
export const DsnWord = (prptype: string, plural = false) => {
  const w = dsnWord(prptype, plural);
  return w.charAt(0).toUpperCase() + w.slice(1);
};

export const canEditInquiry = (i: Inquiry) => i.can_edit ?? i.status === 'pending_costing';
export const canDeleteInquiry = (i: Inquiry) => i.can_delete ?? i.status === 'pending_costing';

export const STATUS_FILTERS: { key: InquiryStatus | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pending_costing', label: 'Pending' },
  { key: 'costed', label: 'Costed' },
  { key: 'sent', label: 'Sent' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'rejected', label: 'Rejected' },
];

export const TAT_FILTERS: { key: TatStatus | 'all'; label: string }[] = [
  { key: 'all', label: 'All TAT' },
  { key: 'on_time', label: 'On Time' },
  { key: 'warning', label: 'Warning' },
  { key: 'breached', label: 'Breached' },
];

export const INQUIRY_REJECT_REASONS = [
  'Price too high',
  'Design not suitable',
  'Quantity mismatch',
  'Delivery timeline issue',
  'Party not interested',
  'Other',
];

export const COST_SHEET_REJECT_REASONS = [
  'Margin too low',
  'Pricing error',
  'Wrong knitter/mill',
  'Missing information',
  'Quality concerns',
  'Other',
];

/* -------------------------------------------------------------------------- */
/*  Colours (NEW ERP theme tokens)                                             */
/* -------------------------------------------------------------------------- */

const tint = (c: string) => `${c}1A`;

export const STATUS_META: Record<string, { fg: string; bg: string; label: string }> = {
  pending_costing: { fg: T.amber, bg: tint(T.amber), label: 'Pending Costing' },
  awaiting_auth: { fg: T.blue, bg: tint(T.blue), label: 'Awaiting Auth' },
  auth_rejected: { fg: T.red, bg: tint(T.red), label: 'Auth Rejected' },
  costed: { fg: T.green, bg: tint(T.green), label: 'Costed' },
  sent: { fg: T.purple, bg: tint(T.purple), label: 'Sent' },
  confirmed: { fg: T.green, bg: tint(T.green), label: 'Confirmed' },
  rejected: { fg: T.red, bg: tint(T.red), label: 'Rejected' },
};

export const TAT_META: Record<string, { fg: string; bg: string; label: string; icon: string }> = {
  on_time: { fg: T.green, bg: tint(T.green), label: 'On Time', icon: 'check-circle' },
  warning: { fg: T.amber, bg: tint(T.amber), label: 'Warning', icon: 'error-outline' },
  breached: { fg: T.red, bg: tint(T.red), label: 'Breached', icon: 'cancel' },
  not_applicable: { fg: T.muted, bg: T.alt, label: 'N/A', icon: 'remove-circle-outline' },
};

export const SHEET_META: Record<CostSheetAuthStatus, { fg: string; bg: string; label: string }> = {
  draft: { fg: T.muted, bg: T.alt, label: 'Draft' },
  awaiting_auth: { fg: T.amber, bg: tint(T.amber), label: 'Awaiting Auth' },
  approved: { fg: T.green, bg: tint(T.green), label: 'Approved' },
  rejected: { fg: T.red, bg: tint(T.red), label: 'Rejected' },
};

/** GM colour: < 5 % red, < 10 % amber, else green. */
export const gmColor = (pct: number) => (pct < 5 ? T.red : pct < 10 ? T.amber : T.green);
export const gmBg = (pct: number) => tint(gmColor(pct));

/* -------------------------------------------------------------------------- */
/*  Formatters                                                                 */
/* -------------------------------------------------------------------------- */

export const num = (v: any) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export const formatCurrency = (n: number | null | undefined): string => {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return '₹ 0.00';
  return `₹ ${Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 2 })}`;
};

export const formatQty = (n: any) => num(n).toLocaleString('en-IN', { maximumFractionDigits: 2 });

export const formatDate = (iso: string | null | undefined): string => {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const relativeTime = (iso: string | null | undefined): string => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const min = Math.floor((Date.now() - d.getTime()) / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
};

export const formatHours = (h: number): string => {
  const v = num(h);
  if (v < 1) return `${Math.round(v * 60)} min`;
  if (v < 24) return `${v.toFixed(1)} hrs`;
  const days = Math.floor(v / 24);
  const rem = Math.round(v % 24);
  return rem > 0 ? `${days}d ${rem}h` : `${days} day${days > 1 ? 's' : ''}`;
};

export const formatHoursLabel = (h: number): string => {
  if (h < 24) return `${h} hours`;
  const days = Math.floor(h / 24);
  const rem = h % 24;
  return rem > 0 ? `${days}d ${rem}h` : `${days} day${days > 1 ? 's' : ''}`;
};

/* Delivery date: the API takes DD-MM-YYYY (legacy format). */
const pad = (n: number) => String(n).padStart(2, '0');
export const toDmy = (d: Date) => `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}`;
export const todayIsoLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
/** Any of DD-MM-YYYY / DD/MM/YYYY / YYYY-MM-DD[...] -> YYYY-MM-DD ('' when unknown). */
export const anyToIso = (v: string | null | undefined): string => {
  const s = String(v || '').trim();
  if (!s) return '';
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (m) return `${m[3]}-${pad(Number(m[2]))}-${pad(Number(m[1]))}`;
  return '';
};
export const isoToDmy = (iso: string) => {
  const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : iso;
};
export const showDmy = (v: string | null | undefined) => {
  const iso = anyToIso(v);
  return iso ? isoToDmy(iso).replace(/-/g, '/') : String(v || '');
};

export const isValidGSTIN = (g: string) =>
  /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test((g || '').toUpperCase());
export const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e || '');
export const isValidMobile = (m: string) => /^[6-9]\d{9}$/.test((m || '').replace(/\D/g, '').slice(-10));

export const errMsg = (e: any, fallback: string) =>
  e?.response?.data?.message || (typeof e?.message === 'string' && e.message) || fallback;

/* -------------------------------------------------------------------------- */
/*  Cost sheet                                                                 */
/* -------------------------------------------------------------------------- */

export const defaultSheet = (designId: number): CostSheet => ({
  inquiry_design_id: designId,
  greige_rate: 0,
  purchase: 0,
  brokerage: 0,
  freight: 0,
  dyeing_shortage_pct: 0,
  dyeing_shortage_amount: 0,
  dyeing_charge: 0,
  value_add: 0,
  packaging_charge: 0,
  overheads_exp: 0,
  hidden_cost_pct: 0,
  hidden_cost_amount: 0,
  sale_discount_pct: 0,
  sale_discount_amount: 0,
  sale_brokerage_pct: 0,
  sale_brokerage_amount: 0,
  total_cost: 0,
  sale_rate: 0,
  gross_margin_amount: 0,
  gross_margin_pct: 0,
  quantity_unit: 'KGS',
  auth_status: 'draft',
});

/** Brokerage is a % of the greige rate (legacy rule). */
export const brokerageAmount = (s: CostSheet) => +(num(s.greige_rate) * (num(s.brokerage) / 100)).toFixed(2);

/** Local mirror of the backend formula (same as legacy CostSheetScreen.recompute). */
export const recompute = (s: CostSheet): CostSheet => {
  const brokerageAmt = brokerageAmount(s);
  const freightBase = num(s.greige_rate) + num(s.purchase) + brokerageAmt + num(s.freight);
  const dyeShort = +(freightBase * (num(s.dyeing_shortage_pct) / 100)).toFixed(2);
  const hiddenBase = freightBase + dyeShort + num(s.dyeing_charge) + num(s.value_add) + num(s.packaging_charge) + num(s.overheads_exp);
  const hidden = +(hiddenBase * (num(s.hidden_cost_pct) / 100)).toFixed(2);
  const dis = +(num(s.sale_rate) * (num(s.sale_discount_pct) / 100)).toFixed(2);
  const sBrk = +(num(s.sale_rate) * (num(s.sale_brokerage_pct) / 100)).toFixed(2);
  const total = +(hiddenBase + hidden + dis + sBrk).toFixed(2);
  const gmAmt = +(num(s.sale_rate) - total).toFixed(2);
  const gmPct = num(s.sale_rate) > 0 ? +((gmAmt / num(s.sale_rate)) * 100).toFixed(2) : 0;
  return {
    ...s,
    dyeing_shortage_amount: dyeShort,
    hidden_cost_amount: hidden,
    sale_discount_amount: dis,
    sale_brokerage_amount: sBrk,
    total_cost: total,
    gross_margin_amount: gmAmt,
    gross_margin_pct: gmPct,
  };
};

export const sheetLocked = (s: CostSheet | null | undefined) =>
  s?.auth_status === 'awaiting_auth' || s?.auth_status === 'approved';
