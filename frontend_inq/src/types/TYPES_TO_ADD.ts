// ============================================================
// ADD TO YOUR EXISTING src/types/index.ts
// ============================================================

// 1) New Note interface
export interface InquiryNote {
  id: number;
  inquiry_id: number;
  note: string;
  created_by: number | null;
  created_by_name: string | null;
  is_edited: boolean;
  edited_at: string | null;
  created_at: string;
  updated_at: string;
}

// 2) Add these fields to your existing Inquiry interface:
//
// export interface Inquiry {
//   ... existing fields ...
//   notes_count?: number;
//   latest_note?: {
//     id: number;
//     note: string;
//     created_by_name: string | null;
//     created_at: string;
//   } | null;
//   can_edit?: boolean;
//   can_delete?: boolean;
// }

// 3) Add Notes screen to your RootStackParamList:
//
// export type RootStackParamList = {
//   ... existing screens ...
//   InquiryNotes: { inquiryId: number; inquiryNo: string };
// };
