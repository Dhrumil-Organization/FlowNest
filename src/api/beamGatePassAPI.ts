// FILE: src/api/beamGatePassAPI.ts
// Beam Gate Pass (security) on the shared legacy `client`.
//  - POST /knit_beam_gate_pass_crud {action}: browse_data, show_data, add_data, modify_data, delete_data,
//    pending_outwards, outward_detail (KnitPrdBeamGatePassController)
//  - print: POST /saleschallanmultiprintnew {printTypes:['gate_pass'], printFormat:'1', strcode:'0'} → results.gate_pass = PDF url
import client from './legacyClient';
import { apiError, bodyOf, failed, messageOf, unwrapRows } from './repackingIssueAPI';
import { createRepackingIssueService } from './repackingIssueAPI';
import { pdfUrlOf } from './beamInOutAPI';
import type { SaveResult } from '../features/repackingIssue/service';
import type { LookupFilter, LookupKind, LookupOption, RepackListRow } from '../features/repackingIssue/types';
import type { GatePass, GpBeam, GpContext, PendingOutward } from '../features/beamGatePass/types';
export { matchesVoucher } from '../features/beamGatePass/logic';

type Row = Record<string, any>;

export const GP_ROUTES = { crud: '/knit_beam_gate_pass_crud', print: '/saleschallanmultiprintnew' } as const;
export const GP_PRINT = { type: 'gate_pass', format: '1', strcode: '0' } as const;

const post = (url: string, body: Row) => client.post(url, body, { timeout: 60000 });
const lower = (r: any): Row => {
  const o: Row = {};
  if (r && typeof r === 'object') Object.keys(r).forEach(k => { o[k.toLowerCase()] = r[k]; });
  return o;
};
const num = (v: unknown) => { const n = Number(String(v ?? '').trim()); return Number.isFinite(n) ? n : 0; };
const str = (v: unknown) => String(v ?? '').trim();
const dkey = (d: string, n?: unknown) => (/^\d{8}$/.test(String(n ?? '')) ? Number(n) : Number(d.split('-').reverse().join('')) || 0);
/** 15.4 → "15.40" */
export const fmtTime = (v: unknown) => { const n = num(v); return n ? n.toFixed(2) : ''; };

export const pendingFromRow = (raw: Row): PendingOutward => {
  const r = lower(raw);
  const date = str(r.rodate);
  return {
    uid: num(r.uid), vouNo: str(r.rono), date, dateKey: dkey(date, r.nrodate), parCode: str(r.parcode), party: str(r.parname),
    beams: num(r.beams), qty: num(r.totqty), beamNos: str(r.beamnos), remark: str(r.remark),
  };
};

const beamFromRow = (raw: Row): GpBeam => {
  const r = lower(raw);
  return { srNo: num(r.srno), beamNo: str(r.beamsr) || `#${num(r.beamsrno)}`, beamName: str(r.beamname), weight: num(r.wt), qty: num(r.qty) };
};

export interface GatePassService {
  lookup(kind: LookupKind, ctx: GpContext, filter?: LookupFilter): Promise<LookupOption[]>;
  pending(ctx: GpContext, search: string): Promise<PendingOutward[]>;
  outward(ctx: GpContext, outUid: number): Promise<{ beams: GpBeam[]; gatePassUid: number; message: string }>;
  browse(ctx: GpContext, from: string, to: string): Promise<RepackListRow[]>;
  load(ctx: GpContext, uid: number): Promise<GatePass>;
  add(ctx: GpContext, o: { outUid: number; date: string; time: string; vehNo: string }): Promise<SaveResult & { gatePass?: GatePass }>;
  modify(ctx: GpContext, o: { uid: number; date: string; time: string; vehNo: string }): Promise<SaveResult & { gatePass?: GatePass }>;
  remove(ctx: GpContext, uid: number): Promise<SaveResult>;
  print(ctx: GpContext, uid: number): Promise<string>;
}

const gatePassOf = (body: any): GatePass => {
  const m = lower(body?.main);
  const o = lower(body?.outward);
  return {
    uid: num(m.uid), no: str(m.outno), date: str(m.outdate), time: fmtTime(m.outtime), vehNo: str(m.vehno),
    parCode: str(m.parcode), party: str(m.parname), outUid: num(body?.outuid), outNo: str(m.beamoutno) || str(o.rono), outDate: str(o.rodate),
    beams: unwrapRows(body?.beams).map(beamFromRow),
  };
};

export function createGatePassService(): GatePassService {
  const repack = createRepackingIssueService();
  const crud = async (action: string, ctx: GpContext, body: Row = {}) =>
    (await post(GP_ROUTES.crud, { prpcode: ctx.prpCode, yearno: ctx.yearNo, action, ...body }))?.data;
  const ok = (data: any, fallback: string) => {
    if (failed(data)) throw new Error(messageOf(data, fallback) || fallback);
    return bodyOf(data);
  };
  const save = async (action: 'add_data' | 'modify_data', ctx: GpContext, body: Row) => {
    try {
      const data = await crud(action, ctx, body);
      if (failed(data)) return { ok: false, message: messageOf(data, 'Save failed.') };
      const gp = gatePassOf(bodyOf(data));
      return { ok: true, message: messageOf(data) || `Gate pass ${gp.no} saved.`, gatePass: gp };
    } catch (e) {
      return { ok: false, message: apiError(e) };
    }
  };

  return {
    lookup: (kind, ctx, filter) => repack.lookup(kind, ctx, filter),

    async pending(ctx, search) {
      const b = ok(await crud('pending_outwards', ctx, { search, limit: 100 }), 'Beam Outwards could not be loaded.');
      return unwrapRows(b).map(pendingFromRow).filter(p => p.uid);
    },

    async outward(ctx, outUid) {
      const data = await crud('outward_detail', ctx, { outuid: outUid });
      const b = ok(data, 'Beam Outward could not be loaded.');
      return { beams: unwrapRows(b?.beams).map(beamFromRow), gatePassUid: num(b?.gatepassuid), message: messageOf(data) };
    },

    async browse(ctx, from, to) {
      const b = ok(await crud('browse_data', ctx, { fromdate: from, todate: to }), 'Could not load gate passes.');
      return unwrapRows(b).map((raw): RepackListRow => {
        const r = lower(raw);
        const date = str(r.outdate);
        return {
          uid: num(r.uid),
          vouNo: str(r.outno),
          date,
          dateKey: dkey(date, r.noutdate),
          items: [{ name: str(r.parname) || str(r.parcode), merge: `Beam Outward ${str(r.beamoutno)}` }],
          remark: str(r.beamnos),
          isRepack: 0,
          info: `${num(r.beams)} beam${num(r.beams) === 1 ? '' : 's'}${str(r.vehno) ? `  •  ${str(r.vehno)}` : ''}  •  ${fmtTime(r.outtime)}`,
        };
      }).sort((a, b) => b.dateKey - a.dateKey || b.uid - a.uid);
    },

    async load(ctx, uid) {
      const b = ok(await crud('show_data', ctx, { uid }), 'Gate pass not found.');
      const gp = gatePassOf(b);
      if (!gp.uid) throw new Error('Gate pass not found.');
      return gp;
    },

    add: (ctx, o) => save('add_data', ctx, { outuid: o.outUid, outdate: o.date, outtime: o.time, vehno: o.vehNo }),
    modify: (ctx, o) => save('modify_data', ctx, { uid: o.uid, outdate: o.date, outtime: o.time, vehno: o.vehNo }),

    async remove(ctx, uid) {
      try {
        const data = await crud('delete_data', ctx, { uid });
        if (failed(data)) return { ok: false, message: messageOf(data, 'Delete failed.') };
        return { ok: true, message: messageOf(data) || 'Deleted.' };
      } catch (e) {
        return { ok: false, message: apiError(e) };
      }
    },

    async print(ctx, uid) {
      const res = await post(GP_ROUTES.print, {
        prpcode: ctx.prpCode, yearno: String(ctx.yearNo), strcode: GP_PRINT.strcode, uid: String(uid), printTypes: [GP_PRINT.type], printFormat: GP_PRINT.format,
      });
      const data = res?.data;
      if (failed(data)) throw new Error(messageOf(data, 'Print failed.'));
      const url = pdfUrlOf(data, GP_PRINT.type);
      if (!url) throw new Error(messageOf(data, 'The print did not return a PDF.') || 'The print did not return a PDF.');
      return url;
    },
  };
}
