// FILE: src/features/repackingIssue/service.ts
// The form and the Entries list only talk to this interface. The real implementation lives in
// src/api/repackingIssueAPI.ts (createRepackingIssueService) → KnitPrdRepackIssueRepository.
import { LookupFilter, LookupKind, LookupOption, RepackContext, RepackForm, RepackItem, RepackListRow, StockCarton } from './types';

export interface SaveResult {
  ok: boolean;
  message: string;
  uid?: number;
}

export interface RepackingService {
  /** list for a master; Merge / Grade / Shade depend on the codes in `filter` */
  lookup(kind: LookupKind, ctx: RepackContext, filter?: LookupFilter): Promise<LookupOption[]>;
  /**
   * Repacking Issue's own series (KnitPrdRepackIssueRepository::next_voucher_no):
   * MAX(VouNo) + 1 for property + store. With `current` it validates a typed number.
   * Throws with the server message when the typed number already exists.
   */
  nextVoucher(
    ctx: RepackContext,
    vouDate: string,
    current?: { no: string; suffix: string }
  ): Promise<{ prefix: string; no: string; suffix: string }>;
  /** cartons in stock for the item's Item / Merge / Grade / Shade up to the voucher date (getcartondetail) */
  stock(ctx: RepackContext, item: Pick<RepackItem, 'item' | 'merge' | 'grade' | 'shade'>, vouDate: string): Promise<StockCarton[]>;

  /** Entries list (browse_data, txntype prod_repacking_issue) — dates dd-mm-yyyy */
  browse(ctx: RepackContext, fromDate: string, toDate: string): Promise<RepackListRow[]>;
  /** One saved entry (show_data) mapped to the form */
  load(ctx: RepackContext, uid: number): Promise<RepackForm>;
  /** add_data (new) or modify_data (form.meta.uid set) */
  save(ctx: RepackContext, form: RepackForm): Promise<SaveResult>;
  /** delete_data */
  remove(ctx: RepackContext, uid: number): Promise<SaveResult>;
}

/** Rights resolved by the screen from usePermission().canDo(...) */
export type RepackRights = {
  view: boolean;
  add: boolean;
  edit: boolean;
  delete: boolean;
  scan: boolean;
  removeCarton: boolean;
};
