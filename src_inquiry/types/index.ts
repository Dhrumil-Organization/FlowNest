// All shared types for the fabric inquiry module

export type InquiryStatus =
  | 'pending_costing'
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

export interface DashboardCounts {
  pending_costing: number;
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
  ShadeSelection: { onSelect: (shade: { name: string; code?: string; isNew?: boolean }) => void };
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