// FILE: src/features/beamGatePass/types.ts
import type { RepackContext } from '../repackingIssue/types';

export type GpContext = RepackContext;

/** a Beam Outward waiting for its gate pass */
export interface PendingOutward {
  uid: number;
  vouNo: string; // 00000001/BM
  date: string;
  dateKey: number;
  parCode: string;
  party: string;
  beams: number;
  qty: number;
  beamNos: string;
  remark: string;
}

export interface GpBeam {
  srNo: number;
  beamNo: string;
  beamName: string;
  weight: number;
  qty: number;
}

export interface GatePass {
  uid: number;
  no: string;
  date: string; // dd-mm-yyyy
  time: string; // HH.MM
  vehNo: string;
  parCode: string;
  party: string;
  outUid: number;
  outNo: string;
  outDate: string;
  beams: GpBeam[];
}

export interface GpRights {
  view: boolean;
  add: boolean;
  edit: boolean;
  delete: boolean;
  print: boolean;
}
