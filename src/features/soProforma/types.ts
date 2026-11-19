// FILE: src/features/soProforma/types.ts
// Sales Order → Proforma Invoice (Grey). A proforma takes part of the SO qty; the real invoice can differ.
import type { RepackContext } from '../repackingIssue/types';
import type { TaxLine } from '../beamInOut/types';

export type PiContext = RepackContext;

/** one line of an authorized Sales Order (sosortbrowse d1) */
export interface SoLine {
  srNo: number;
  itmCode: number;
  dsnCode: number;
  shdCode: number;
  item: string;
  design: string;
  shade: string;
  qty: number;
  rate: number;
  /** already in proformas (all, or all except the one being edited) */
  done: number;
}

export interface SalesOrder {
  uid: number;
  prpCode: string;
  soNo: string;
  soDate: string; // dd/mm/yyyy as the browse sends it
  dateKey: number; // yyyymmdd
  parCode: string;
  party: string;
  entType: string;
  netAmt: number;
  lines: SoLine[];
  /** proformas made for this SO */
  piCount: number;
}

export interface ProformaRow {
  uid: number;
  no: string;
  date: string;
  dateKey: number;
  validTill: string;
  qty: number;
  grsAmt: number;
  taxAmt: number;
  netAmt: number;
  remark: string;
}

/** a line on the proforma form: qty typed by the user (string while typing) */
export interface PiLine {
  soSrNo: number;
  itmCode: number;
  dsnCode: number;
  shdCode: number;
  name: string;
  ordered: number;
  /** in other proformas of this SO */
  other: number;
  rate: number;
  qty: string;
  hsn: string;
}

export interface Proforma {
  uid: number;
  no: string;
  date: string; // dd-mm-yyyy
  validTill: string; // dd-mm-yyyy or ''
  remark: string;
  lines: PiLine[];
  tax: TaxLine[];
}

export interface PiRights {
  view: boolean;
  add: boolean;
  edit: boolean;
  delete: boolean;
  print: boolean;
}
