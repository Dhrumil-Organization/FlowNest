// FILE: src/features/beamGateEntry/types.ts
// Beam Gate Entry (security): empty beams coming back from a party → GRLog (GRType 'BMR'), one row per beam,
// each linked to its Beam Outward line. The guard starts from the party or a beam no.
import type { RepackContext } from '../repackingIssue/types';

export type GeContext = RepackContext;

/** a party with beams still out */
export interface GeParty {
  parCode: string;
  party: string;
  openBeams: number;
  outwards: number;
  firstOut: string;
  beamNos: string;
}

/** a beam no. typed / scanned → where it is out */
export interface GeBeamHit {
  parCode: string;
  party: string;
  outUid: number;
  outSrNo: number;
  outNo: string;
  outDate: string;
  beamNo: string;
  beamName: string;
}

/** a beam out at the party (one Beam Outward line) */
export interface GeBeam {
  outUid: number;
  outSrNo: number;
  outNo: string;
  outDate: string;
  beamNo: string;
  beamName: string;
  weight: number;
  qty: number;
  /** still out = qty − received − on other open gate entries (this entry's own beams included) */
  openQty: number;
  /** on this gate entry */
  picked: boolean;
  /** already taken in by Beam Inward (this gate entry's row is closed) */
  inwarded: boolean;
}

export const beamKey = (b: { outUid: number; outSrNo: number }) => `${b.outUid}-${b.outSrNo}`;

export interface GeVehicle {
  uid: number;
  vouNo: string;
  date: string;
  vehNo: string;
  driver: string;
  transport: string;
  inTime: string;
}

export interface GateEntry {
  uid: number;
  no: string;
  date: string; // dd-mm-yyyy
  time: string; // HH.MM
  parCode: string;
  party: string;
  vehUid: number;
  vehNo: string;
  docNo: string;
  docDate: string;
  remark: string;
  beams: GeBeam[];
  inwarded: number;
}

export interface GeRights {
  view: boolean;
  add: boolean;
  edit: boolean;
  delete: boolean;
}
