// All shared types for the fabric inquiry module

export type InquiryStatus =
  | 'pending_costing'
  | 'costed'
  | 'sent'
  | 'confirmed'
  | 'rejected';

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
  // For existing design
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
  created_at: string;
  updated_at: string;
}

export interface DashboardCounts {
  pending_costing: number;
  costed: number;
  sent: number;
  confirmed: number;
  rejected: number;
  total: number;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  counts?: DashboardCounts;
  meta: {
    current_page: number;
    last_page: number;
    total: number;
  };
}

// Navigation param list
export type RootStackParamList = {
  Dashboard: undefined;
  InquiryForm: { inquiryId?: number } | undefined;
  PartySelection: { onSelect: (party: Party) => void };
  AddParty: { gstin?: string; onSaved: (party: Party) => void };
  DesignSelection: { onSelect: (design: Design) => void };
  InquiryDetail: { id: number };
  Costing: { id: number };
  SendQuotation: { id: number };
  RejectInquiry: { id: number };
  ConfirmInquiry: { id: number };
};
