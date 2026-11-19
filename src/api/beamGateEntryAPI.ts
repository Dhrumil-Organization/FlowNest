// FILE: src/api/beamGateEntryAPI.ts
// Beam Gate Entry (security) on the shared legacy `client`.
//  POST /knit_beam_gate_entry_crud {action}: pending_parties, find_beam, party_beams, vehicle_help, browse_data, show_data,
//  add_data, modify_data, delete_data (KnitPrdBeamGateEntryController). Rows are GRLog GRType 'BMR', TranType -10,
//  one per beam, linked to its Beam Outward line (POUId / POSrNo).
import client from './legacyClient';
import { apiError, bodyOf, failed, messageOf, unwrapRows } from './repackingIssueAPI';
import { createRepackingIssueService } from './repackingIssueAPI';
import type { SaveResult } from '../features/repackingIssue/service';
import type { LookupFilter, LookupKind, LookupOption, RepackListRow } from '../features/repackingIssue/types';
import type { GateEntry, GeBeam, GeBeamHit, GeContext, GeParty, GeVehicle } from '../features/beamGateEntry/types';

type Row = Record<string, any>;

export const GE_ROUTES = { crud: '/knit_beam_gate_entry_crud' } as const;

const post = (url: string, body: Row) => client.post(url, body, { timeout: 60000 });
const lower = (r: any): Row => {
  const o: Row = {};
  if (r && typeof r === 'object') Object.keys(r).forEach(k => { o[k.toLowerCase()] = r[k]; });
  return o;
};
const num = (v: unknown) => { const n = Number(String(v ?? '').trim()); return Number.isFinite(n) ? n : 0; };
const str = (v: unknown) => String(v ?? '').trim();
const r3 = (n: number) => Math.round(n * 1000) / 1000;
const dkey = (d: string, n?: unknown) => (/^\d{8}$/.test(String(n ?? '')) ? Number(n) : Number(d.replace(/\//g, '-').split('-').reverse().join('')) || 0);
/** "19/11/2026" → "19-11-2026" */
const dmy = (v: unknown) => str(v).replace(/\//g, '-');
/** 15.4 → "15.40" */
export const fmtTime = (v: unknown) => { const n = num(v); return n ? n.toFixed(2) : ''; };

const partyFromRow = (raw: Row): GeParty => {
  const r = lower(raw);
  return {
    parCode: str(r.parcode), party: str(r.parname), openBeams: num(r.openbeams), outwards: num(r.outwards),
    firstOut: dmy(r.firstoutdate), beamNos: str(r.beamnos),
  };
};

const hitFromRow = (raw: Row): GeBeamHit => {
  const r = lower(raw);
  return {
    parCode: str(r.parcode), party: str(r.parname), outUid: num(r.outuid), outSrNo: num(r.outsrno), outNo: str(r.rono),
    outDate: dmy(r.rodate), beamNo: str(r.beamsr), beamName: str(r.beamname),
  };
};

const beamFromRow = (raw: Row): GeBeam => {
  const r = lower(raw);
  return {
    outUid: num(r.outuid), outSrNo: num(r.outsrno), outNo: str(r.rono), outDate: dmy(r.rodate),
    beamNo: str(r.beamsr) || `#${num(r.beamsrno)}`, beamName: str(r.beamname), weight: num(r.wt),
    qty: r3(num(r.qty)), openQty: r3(num(r.openqty)), picked: false, inwarded: false,
  };
};

const vehicleFromRow = (raw: Row): GeVehicle => {
  const r = lower(raw);
  return { uid: num(r.uid), vouNo: str(r.vouno), date: dmy(r.voudate), vehNo: str(r.vehno), driver: str(r.drvname), transport: str(r.trpname), inTime: fmtTime(r.intime) };
};

/** show_data → GateEntry: every beam out at the party, the ones on this gate entry picked */
const entryOf = (body: any): GateEntry => {
  const m = lower(body?.main);
  const rows = unwrapRows(body?.d1).map(lower);
  const mine = new Map<string, Row>();
  rows.forEach(r => mine.set(`${num(r.pouid)}-${num(r.posrno)}`, r));
  const beams = unwrapRows(body?.beams).map(beamFromRow).map(b => {
    const g = mine.get(`${b.outUid}-${b.outSrNo}`);
    return g ? { ...b, picked: true, inwarded: str(g.status) === 'C', openQty: r3(Math.max(b.openQty, num(g.qty))) } : b;
  });
  // a closed row's outward line may be fully received now — keep it visible
  rows.forEach(r => {
    if (!beams.some(b => b.outUid === num(r.pouid) && b.outSrNo === num(r.posrno))) {
      beams.push({
        outUid: num(r.pouid), outSrNo: num(r.posrno), outNo: '', outDate: '', beamNo: str(r.beamsr) || str(r.beamno), beamName: str(r.beamname),
        weight: 0, qty: r3(num(r.qty)), openQty: r3(num(r.qty)), picked: true, inwarded: str(r.status) === 'C',
      });
    }
  });
  return {
    uid: num(m.uid), no: str(m.grno), date: dmy(m.grdates ?? m.grdate), time: fmtTime(m.intime),
    parCode: str(m.parcode), party: str(m.parname),
    vehUid: num(m.vehuid), vehNo: str(m.vehno), docNo: str(m.docno), docDate: dmy(m.docdates), remark: str(m.remark),
    beams, inwarded: rows.filter(r => str(r.status) === 'C').length,
  };
};

export interface GateEntryInput {
  uid: number;
  parCode: string;
  date: string;
  vehUid: number;
  docNo: string;
  docDate: string;
  remark: string;
  beams: { outUid: number; outSrNo: number; qty: number }[];
}

export interface GateEntryService {
  lookup(kind: LookupKind, ctx: GeContext, filter?: LookupFilter): Promise<LookupOption[]>;
  /** parties with beams out (search: party, beam no., outward no.) */
  parties(ctx: GeContext, search: string): Promise<GeParty[]>;
  /** beam no. → where it is out */
  findBeam(ctx: GeContext, beamNo: string): Promise<GeBeamHit[]>;
  /** every beam out at the party (uid: gate entry being edited) */
  partyBeams(ctx: GeContext, parCode: string, uid: number): Promise<{ party: string; beams: GeBeam[] }>;
  vehicles(ctx: GeContext, search: string): Promise<GeVehicle[]>;
  browse(ctx: GeContext, from: string, to: string): Promise<RepackListRow[]>;
  load(ctx: GeContext, uid: number): Promise<GateEntry>;
  save(ctx: GeContext, e: GateEntryInput): Promise<SaveResult & { entry?: GateEntry }>;
  remove(ctx: GeContext, uid: number): Promise<SaveResult>;
}

export function createGateEntryService(): GateEntryService {
  const repack = createRepackingIssueService();
  const crud = async (action: string, ctx: GeContext, body: Row = {}) =>
    (await post(GE_ROUTES.crud, { prpcode: ctx.prpCode, yearno: ctx.yearNo, action, ...body }))?.data;
  const ok = (data: any, fallback: string) => {
    if (failed(data)) throw new Error(messageOf(data, fallback) || fallback);
    return bodyOf(data);
  };

  return {
    lookup: (kind, ctx, filter) => repack.lookup(kind, ctx, filter),

    async parties(ctx, search) {
      const b = ok(await crud('pending_parties', ctx, { search }), 'Parties could not be loaded.');
      return unwrapRows(b).map(partyFromRow).filter(p => p.parCode);
    },

    async findBeam(ctx, beamNo) {
      const b = ok(await crud('find_beam', ctx, { beamno: beamNo }), 'Beam could not be looked up.');
      return unwrapRows(b).map(hitFromRow).filter(h => h.outUid);
    },

    async partyBeams(ctx, parCode, uid) {
      const b = ok(await crud('party_beams', ctx, { parcode: parCode, uid }), 'Beams of the party could not be loaded.');
      return { party: str(b?.parname), beams: unwrapRows(b?.beams).map(beamFromRow) };
    },

    async vehicles(ctx, search) {
      try {
        const b = ok(await crud('vehicle_help', ctx, { search }), 'Vehicle entries could not be loaded.');
        return unwrapRows(b).map(vehicleFromRow).filter(v => v.uid);
      } catch {
        return [];
      }
    },

    async browse(ctx, from, to) {
      const b = ok(await crud('browse_data', ctx, { fromdate: from, todate: to }), 'Could not load gate entries.');
      return unwrapRows(b).map((raw): RepackListRow => {
        const r = lower(raw);
        const date = dmy(r.grdate);
        const beams = num(r.beams);
        const done = num(r.inwarded);
        return {
          uid: num(r.uid),
          vouNo: str(r.grno),
          date,
          dateKey: dkey(date, r.ngrdate),
          items: [{ name: str(r.parname) || str(r.parcode), merge: str(r.rono) ? `Outward ${str(r.rono)}` : '' }],
          remark: str(r.beamnos),
          isRepack: done,
          info: `${beams} beam${beams === 1 ? '' : 's'}  •  ${done ? `${done} inwarded` : 'waiting for Beam Inward'}${str(r.vehno) ? `  •  ${str(r.vehno)}` : ''}  •  ${fmtTime(r.intime)}`,
        };
      }).sort((a, b) => b.dateKey - a.dateKey || b.uid - a.uid);
    },

    async load(ctx, uid) {
      const e = entryOf(ok(await crud('show_data', ctx, { uid }), 'Gate entry not found.'));
      if (!e.uid) throw new Error('Gate entry not found.');
      return e;
    },

    async save(ctx, e) {
      try {
        const data = await crud(e.uid ? 'modify_data' : 'add_data', ctx, {
          uid: e.uid, parcode: e.parCode, grdate: e.date, vehuid: e.vehUid, docno: e.docNo, docdate: e.docDate, remark: e.remark,
          beams: e.beams.map(b => ({ OutUId: b.outUid, OutSrNo: b.outSrNo, Qty: b.qty })),
        });
        if (failed(data)) return { ok: false, message: messageOf(data, 'Save failed.') };
        const entry = entryOf(bodyOf(data));
        return { ok: true, message: messageOf(data) || `Gate entry ${entry.no} saved.`, entry };
      } catch (err) {
        return { ok: false, message: apiError(err) };
      }
    },

    async remove(ctx, uid) {
      try {
        const data = await crud('delete_data', ctx, { uid });
        if (failed(data)) return { ok: false, message: messageOf(data, 'Delete failed.') };
        return { ok: true, message: messageOf(data) || 'Deleted.' };
      } catch (err) {
        return { ok: false, message: apiError(err) };
      }
    },
  };
}
