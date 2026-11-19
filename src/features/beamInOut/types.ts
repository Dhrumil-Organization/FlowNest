// FILE: src/features/beamInOut/types.ts
// Beam Outward / Beam Inward (Knitting) — FAMBOut (RType O / I), FAMBOutD1, FAMBOutTax.
import type { RepackContext } from '../repackingIssue/types';

export type BeamContext = RepackContext;
export type BeamTxn = 'beam_outward' | 'beam_inward';

export interface Opt {
  code: string;
  name: string;
  extra?: Record<string, unknown>;
}

/** Beam Info: 0 In House, 1 Process House */
export type BeamInfo = '0' | '1';
export const BEAM_INFO: { value: BeamInfo; label: string }[] = [
  { value: '0', label: 'In House' },
  { value: '1', label: 'Process House' },
];

/** a row of the Beam master help (GRYBeam + GRYBeamD1) */
export interface BeamMaster {
  beamCode: number;
  beamName: string;
  beamSrNo: number; // GRYBeamD1.SrNo
  beamNo: string; // GRYBeamD1.BeamSr
  diameter: string;
  weight: number;
  isOut: boolean;
}

/** Beam Inward help: a Beam Outward line of the party that is not fully received back */
export interface OutwardBeam {
  beam: BeamMaster;
  link: InwardLink; // tranType -10, balQty = open qty
  rate: number;
  info: BeamInfo;
}

/** Inward No. link of a row: an earlier Beam Outward row (-10) or a POYInw inward (42) */
export interface InwardLink {
  uid: number;
  srNo: number;
  tranType: number; // -10 | 42
  no: string;
  date: string;
  balQty?: number;
}

export interface BeamRow {
  key: string;
  beamCode: number;
  beamName: string;
  beamSrNo: number;
  beamNo: string;
  weight: string;
  qty: string;
  rate: string;
  info: BeamInfo;
  inward: InwardLink | null;
  remarks: [string, string, string, string, string];
  /** already received back against this row (locks the voucher) */
  inQty: number;
  hsnCode: string;
}

/** a line of the Tax Detail (tax structure of the Entry Type) */
export interface TaxLine {
  taxStru: string;
  taxSr: number;
  taxMode: '+' | '-';
  taxType: string; // DIS | TAX
  accCode: string;
  taxCode: string;
  taxName: string;
  /** kept as received; the web / desktop calculation does not use it */
  taxCal: number;
  per: string;
  amt: string;
  /** amount typed by the user (the % is then shown as 0) */
  manual: boolean;
}

export interface BeamHeader {
  vouDate: string; // dd-mm-yyyy
  vouNo: string;
  suffix: string;
  account: Opt | null;
  group: Opt | null;
  entType: Opt | null; // extra.taxStru
  party: Opt | null; // extra.address, extra.state
  address: string; // party address (shown)
  delAddress: string; // DAdd
  department: Opt | null;
  authBy: Opt | null;
  remark: string;
}

/** Beam Inward: the Beam Gate Entry (GRLog BMR) the beams came in on */
export interface BeamGate {
  uid: number;
  no: string;
  date: string;
  vehNo: string;
}

export interface BeamForm {
  txn: BeamTxn;
  header: BeamHeader;
  rows: BeamRow[];
  tax: TaxLine[];
  /** CGST / SGST / IGST accounts of the party (show_data taxacc) — informational */
  taxAcc: string[];
  /** property state = party state → CGST + SGST; different → IGST; null → a state is blank (nothing locked) */
  sameState: boolean | null;
  meta?: { uid: number; received: number; gatePassNo?: string };
  /** Beam Inward: gate entry the beams came in on (beams back against a Beam Outward need one) */
  gate?: BeamGate | null;
  /** Beam Inward saved by a user with the "Inward without Gate Entry" right (sent to the server) */
  withoutGate?: boolean;
  /** Vou. No was filled in by the next-number call (not typed): the server gives the next free number at save */
  autoVouNo?: boolean;
}

export interface BeamListRow {
  uid: number;
  vouNo: string;
  date: string;
  dateKey: number;
  party: string;
  beams: number;
  qty: number;
  netAmt: number;
  remark: string;
  received: number;
}

export interface BeamRights {
  view: boolean;
  add: boolean;
  edit: boolean;
  delete: boolean;
  beams: boolean; // add / change beam rows
  removeBeam: boolean;
  tax: boolean; // change the tax detail
  print: boolean;
  /** Beam Inward: may take in our beams without a Beam Gate Entry */
  withoutGate?: boolean;
}

export type BeamLookup = 'account' | 'group' | 'entType' | 'department' | 'authBy';
