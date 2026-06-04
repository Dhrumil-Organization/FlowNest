// All shared types for the fabric inquiry module

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
  shades?: InquiryShade[];   // NEW
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
  costing_method?: 'simple' | 'cost_sheet';   // NEW
  shades?: InquiryShade[];                     // NEW
  costSheet?: CostSheet | null;                // NEW (or cost_sheet — check your backend serialization)
}


export interface InquiryTat {
  costing_status: TatStatus;
  quotation_status: TatStatus;
  response_status: TatStatus;
  overall_status: TatStatus;
  custom_overall_hours: number | null;
}

export interface InquiryMilestones {
  created_at: string;
  costing_completed_at: string | null;
  quotation_sent_at: string | null;
  closed_at: string | null;
}

export interface TatEvent {
  step_code: string;
  step_name: string;
  started_at: string;
  completed_at: string;
  expected_hours: number;
  actual_hours: number;
  variance_hours: number;
  status: TatStatus;
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
  tat: InquiryTat;
  milestones: InquiryMilestones;
  designs_count?: number;
  designs?: InquiryDesign[];
  rejection?: {
    reason: string;
    remarks: string | null;
    at: string;
  } | null;
  sales_order?: {
    id: number;
    so_no: string;
    so_date: string;
    grand_total: number;
  } | null;
  tat_events?: TatEvent[];
  created_at: string;
  updated_at: string;
}

export interface InquiryDetailResponse extends Inquiry {
  tat_live?: TatLive;
}

// export interface DashboardCounts {
//   pending_costing: number;
//   costed: number;
//   sent: number;
//   confirmed: number;
//   rejected: number;
//   total: number;
// }
export interface DashboardCounts {
  pending_costing: number;
  awaiting_auth: number;   // NEW
  auth_rejected: number;   // NEW
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

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  counts?: DashboardCounts;
  tat_counts?: TatCounts;
  meta: {
    current_page: number;
    last_page: number;
    total: number;
  };
}

export interface TatConfigurationList {
  prpcode: string;
  yearno: string;
}

export interface TatConfiguration {
  id: number;
  step_code: string;
  step_name: string;
  expected_hours: number;
  warning_threshold_percent: number;
  is_active: boolean;
  description: string | null;
  prpcode: string;
  yearno: string;
}

export interface TatAnalytics {
  step_code: string;
  step_name: string;
  total_completed: number;
  on_time: number;
  warning: number;
  breached: number;
  breach_percent: number;
  avg_actual_hours: number;
  avg_variance_hours: number;
}

// Navigation
export type RootStackParamList = {
  Dashboard: undefined;
  InquiryForm: {inquiryId?: number} | undefined;
  PartySelection: {onSelect: (party: Party) => void};
  AddParty: {gstin?: string; onSaved: (party: Party) => void};
  DesignSelection: {onSelect: (design: Design) => void};
  InquiryDetail: {id: number};
  Costing: {id: number};
  SendQuotation: {id: number};
  RejectInquiry: {id: number};
  ConfirmInquiry: {id: number};
  TatConfig: undefined;
  TatAnalytics: undefined;
  ShadeSelection: {
    onSelect: (shade: { shade_code: string; shade_name: string }) => void;
  };
  CostSheet: {inquiryId: number; designId: number};
  AuthQueue: undefined;
  AuthReview: {inquiryId: number; designId: number};
  Settings: undefined;
  Tour: undefined;
};

export interface UserRights {
  permission: string | null;
  user_id: string | number | null;
  txntype: string;
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
  yearno: '27',
  created_at: string;
  updated_at: string;
}


export interface InquiryShade {
  id?: number; // optional for new entries
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

export type CostSheetAuthStatus =
  | 'draft'
  | 'awaiting_auth'
  | 'approved'
  | 'rejected';

export interface CostSheet {
  prptype: string;
  yearno: string;
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
  submitted_by?: number | null;
  submitted_at?: string | null;
  authorized_by?: number | null;
  authorized_by_name?: string | null;
  authorized_at?: string | null;
  rejection_reason?: string | null;
  rejection_remarks?: string | null;
}

// 6) Auth queue item
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
  submitted_by: number | null;
}

export interface AuthQueueResponse {
  prptype: string;
  yearno: string;
  counts: {
    pending: number;
    approved: number;
    rejected: number;
  };
  data: AuthQueueItem[];
}

// 7) User permissions
export interface UserPermissions {
  is_authorizer: boolean;
  user_id: number | null;
}

// 8) Stock response
export interface ShadeStock {
  shade_name: string;
  stock_qty: number;
  unit: string;
  last_updated: string;
  prptype: string;
  yearno: string;
}