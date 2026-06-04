// ============================================================
// ADDITIONAL PATCHES FOR src/types/index.ts
// (Add to your existing TYPES_TO_ADD.ts)
// ============================================================

// ──────────────────────────────────────────────────────────
// 1) Update DashboardCounts to include new status counts:
// ──────────────────────────────────────────────────────────
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

// ──────────────────────────────────────────────────────────
// 2) Update InquiryDesignInput to support shades:
// ──────────────────────────────────────────────────────────
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

// ──────────────────────────────────────────────────────────
// 3) Update InquiryDesign to include shades + cost sheet:
// ──────────────────────────────────────────────────────────
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
