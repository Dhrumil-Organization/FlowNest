// FILE: src/features/repacking/types.ts
// Repacking (Knitting • Grey): new cartons for a Repacking Issue.
import type { LookupOption, RepackContext } from '../repackingIssue/types';

export type { LookupOption, RepackContext };
export type Opt = LookupOption;

/** Repacking Issue in the help list (not repacked yet) */
export interface IssueSummary {
  uid: number;
  vouNo: string;
  date: string; // dd-mm-yyyy
  remark: string;
  dptCode: string;
  stkType: string;
  items: number;
  cartons: number;
  totPcs: number;
  totQty: number;
  totWt: number;
  itmName: string;
  merName: string;
}

export interface IssueItem {
  srNo: number;
  item: Opt | null;
  merge: Opt | null;
  grade: Opt | null;
  shade: Opt | null;
  denier: string;
  totPcs: number;
  totQty: number;
  totWt: number;
  /** MTR → Qty is meters; KGS → Qty is the weight */
  calcOn: CalcOn;
}

export interface IssueCarton {
  srNo: number; // issue item srno
  subSr: number;
  cartNo: string;
  qty: number;
  wt: number;
  chees: number;
  /** MTR → qty is meters; KGS → qty is pieces, wt is the quantity */
  calcOn: CalcOn;
}

export interface IssueDetail {
  summary: IssueSummary;
  items: IssueItem[];
  cartons: IssueCarton[];
}

/** GENDefaultsO POY 27: packtype, prodtype, chkcode, carcode */
export interface RepackDefaults {
  packType: string;
  prodType: string;
  chkCode: string;
  carCode: string;
}

export interface CartonType {
  code: string;
  name: string;
  carWt: number;
  carSize: string;
}

export interface RepackMasters {
  prodTypes: Opt[];
  packTypes: Opt[];
  cartonTypes: CartonType[];
  checkers: Opt[];
  defaults: RepackDefaults;
  errors: string[];
}

export type CalcOn = 'MTR' | 'KGS';

/** POYProd.PackType — shown as "Type" like the desktop */
export const PACK_TYPES = [
  { code: 'NEX', name: 'Non Excisable' },
  { code: 'EXC', name: 'Excisable' },
] as const;
export const PIECES = ['A', 'B', 'C', 'D', 'E'] as const;
export const SHIFTS = [
  { code: '1', name: 'I' },
  { code: '2', name: 'II' },
] as const;

/**
 * New carton / taka (POYProdD1), like the desktop Re-Packing taka grid:
 * Taka No | Piece | CalcOn | Meters | Gross Wt | Tare Wt | Weight (= Gross − Tare)
 */
export interface RpCarton {
  key: string;
  cartNo: string;
  /** Auto Entry: the issue carton it comes from (meters / weight fixed) */
  origCartNo?: string;
  issSrNo?: number;
  issSubSr?: number;
  piece: string;
  calcOn: CalcOn;
  meters: string;
  grossWt: string;
  tareWt: string;
  /** Auto: from the issue (fixed), gross = weight + tare. Manual: gross − tare */
  weight: string;
  /** OprCode — employee (same list as Checked By) */
  operator: Opt | null;
  /** ShfCode: '1' = I, '2' = II, '' = none */
  shift: string;
  used?: boolean;
}

export interface RpItem {
  key: string;
  srNo: number;
  /** the issue item it repacks */
  issSrNo?: number;
  /** issue item Qty / Wt — fixed; the cartons must not go above them */
  issQty: number;
  issWt: number;
  /** CalcOn of the issue item (default for new cartons) */
  calcOn: CalcOn;
  item: Opt | null;
  merge: Opt | null;
  grade: Opt | null;
  shade: Opt | null;
  denier: string;
  prodType: Opt | null;
  packType: string;
  checker: Opt | null;
  cartons: RpCarton[];
}

export interface RpHeader {
  vouDate: string;
  /** prefix / number / suffix like Repacking Issue (shared 8-digit series; prefix / suffix normally empty) */
  vouPrefix: string;
  vouNo: string;
  vouSuffix: string;
  remark: string;
  party: Opt | null;
  /** DptCode of the row — from the issue; picked only when the issue has none */
  department: Opt | null;
  /** Auto: cartons from the issue; Manual: cartons typed (items always come from the issue) */
  auto: boolean;
}

export interface RpForm {
  header: RpHeader;
  issue: IssueDetail | null;
  items: RpItem[];
  meta?: { uid: number; used: number };
}

export interface RpRights {
  view: boolean;
  add: boolean;
  edit: boolean;
  delete: boolean;
  /** repacking.carton_entry:edit — add / rename cartons */
  cartons: boolean;
  removeCarton: boolean;
}
