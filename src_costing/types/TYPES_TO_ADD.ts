// ============================================================
// ADD TO YOUR EXISTING src/types/index.ts
// ============================================================

// 1) Update InquiryStatus to include new states
export type InquiryStatus =
  | 'pending_costing'
  | 'awaiting_auth'
  | 'auth_rejected'
  | 'costed'
  | 'sent'
  | 'confirmed'
  | 'rejected';

// 2) New Shade type
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

// 3) Add shades to your existing InquiryDesignInput interface:
// shades?: InquiryShade[];

// 4) Add shades to your existing InquiryDesign interface:
// shades?: InquiryShade[];
// total_shade_quantity?: number;
// average_shade_rate?: number;
// costing_method?: 'simple' | 'cost_sheet';

// 5) Cost Sheet types
export type CostSheetAuthStatus =
  | 'draft'
  | 'awaiting_auth'
  | 'approved'
  | 'rejected';

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
}

// 9) Add to RootStackParamList:
// export type RootStackParamList = {
//   ... existing ...
//   CostSheetDesignPicker: {id: number};  // NEW: list designs to pick which to cost
//   CostSheet: {inquiryId: number; designId: number};
//   AuthQueue: undefined;
//   AuthReview: {inquiryId: number; designId: number};
//   Settings: undefined;
//   Tour: undefined;
// };
