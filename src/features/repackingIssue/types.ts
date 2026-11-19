// Repacking Issue (Knitting Grey) — shared types

export type StockType = 'IN_HOUSE' | 'PROCESS_HOUSE';

export const STOCK_TYPES: { value: StockType; label: string; hint: string }[] = [
  { value: 'IN_HOUSE', label: 'In House', hint: 'Own premises' },
  { value: 'PROCESS_HOUSE', label: 'Process House', hint: 'At processor' }
];

export type LookupKind = 'item' | 'merge' | 'grade' | 'shade' | 'department' | 'property' | 'year' | 'store';

/** Masters used inside the item sheet */
export type ItemLookupKind = Extract<LookupKind, 'item' | 'merge' | 'grade' | 'shade'>;

export interface LookupOption {
  code: string;
  name: string;
  /** Item: { amtCalc: 'MTR' | 'KGS' | ..., denier?: string } */
  extra?: Record<string, unknown>;
}

/** Dependent filters for the item masters (Merge needs Item, Grade needs Item + Merge, Shade needs all three). */
export interface LookupFilter {
  itmCode?: string;
  merCode?: string;
  grdCode?: string;
  /** server-side search (Item / Merge lists come back 20 at a time) */
  search?: string;
}

/** One carton available in stock for the selected Item / Merge / Grade / Shade (getcartondetail). */
export interface StockCarton {
  cartNo: string;
  /** puid / psrno / psubsr / trantype + balance qty / wt */
  source: CartonSource;
  /** lock = 1 → cannot be issued (lockreason: planning, not in warehouse, stock date …) */
  locked: boolean;
  lockReason: string;
  tranName: string;
}

/** Session context: Property / Year / Store chosen at login or on the module home. */
export interface RepackContext {
  prpCode: string;
  prpName: string;
  yearNo: number;
  yearLabel: string;
  strCode: string;
  strName: string;
}

/** Where a carton's stock comes from (POYProdRD2 puid / psrno / psubsr / trantype). */
export interface CartonSource {
  puid: number;
  psrno: number;
  psubsr: number;
  trantype: number;
  /** current balance from the stock lookup (optional, used as default Qty / Weight) */
  qty?: number;
  wt?: number;
  /** AmtCalc of the inward the stock came from: MTR → item Qty uses qty, KGS → item Qty uses wt */
  amtCalc?: string;
}

export interface CartonRow {
  key: string;
  cartNo: string;
  /** stock reference — required for new cartons so the server can reduce the right stock */
  source?: CartonSource;
  /** POYProdRD2 row as loaded from show_data (edit) — every column is sent back on save */
  raw?: Record<string, any>;
  /** Meter → saved as Qty */
  mtr: string;
  /** Weight → saved as Wt */
  wt: string;
}

export interface RepackItem {
  key: string;
  srNo: number;
  item: LookupOption | null;
  merge: LookupOption | null;
  grade: LookupOption | null;
  shade: LookupOption | null;
  denier: string;
  /** read-only, comes from item AmtCalc */
  uom: string;
  pieces: string;
  qty: string;
  wt: string;
  cartons: CartonRow[];
  /** POYProdRD1 row as loaded from show_data (edit) */
  raw?: Record<string, any>;
}

export interface RepackHeader {
  vouDate: string; // dd-mm-yyyy
  vouPrefix: string;
  vouNo: string;
  vouSuffix: string;
  remarks: string;
  stockType: StockType | null;
  department: LookupOption | null;
  remark1: string;
  remark2: string;
  remark3: string;
}

/** Saved record info (edit / view). */
export interface RepackMeta {
  uid: number;
  /** > 0 → cartons already re-packed / used: no edit, no delete (server rule) */
  isRepack: number;
  /** POYProd row from show_data */
  rawMain?: Record<string, any>;
}

export interface RepackForm {
  header: RepackHeader;
  items: RepackItem[];
  meta?: RepackMeta;
}

/** One saved Repacking Issue in the Entries list. */
export interface RepackListRow {
  uid: number;
  vouNo: string;
  date: string; // dd-mm-yyyy
  dateKey: number; // yyyymmdd for sorting
  items: { name: string; merge: string }[];
  remark: string;
  /** > 0 → locked (Repacking Issue: already re-packed; Repacking: cartons used) */
  isRepack: number;
  /** optional extra line on the card (e.g. Repacking: issue no. • pcs • net wt) */
  info?: string;
}
