// FILE: src/api/beamInOutAPI.ts
// Beam Outward / Beam Inward (Knitting) on the shared legacy `client`.
//  - voucher CRUD + beam / inward help: POST /knit_beam_inward_outward_crud {action}
//    (KnitPrdBeamInwardOutwardController, same request format as the web beam_inward_outward_crud)
//  - masters: accountbook, accountbasic (party), getenttype, getgroup, getdepartment, getauthby
//  - property / year lookups for the Entries filter: the Repacking Issue service
import client from './legacyClient';
import { apiError, bodyOf, failed, listOf, messageOf, unwrapRows } from './repackingIssueAPI';
import { createRepackingIssueService } from './repackingIssueAPI';
import type { SaveResult } from '../features/repackingIssue/service';
import type { LookupFilter, LookupKind, LookupOption, RepackListRow } from '../features/repackingIssue/types';
import { buildPayload, formFromShow, fmt2, fmtQ, inwardFromRow, lower, masterFromRow, num, numberTaxLines, outwardFromRow, taxLineFromRow } from '../features/beamInOut/logic';
import type { BeamContext, BeamForm, BeamLookup, BeamMaster, BeamTxn, InwardLink, Opt, OutwardBeam, TaxLine } from '../features/beamInOut/types';

type Row = Record<string, any>;

export const BEAM_ROUTES = {
  crud: '/knit_beam_inward_outward_crud',
  /** web print: results[printType] = PDF url */
  print: '/saleschallanmultiprintnew',
  account: '/accountbook',
  party: '/accountbasic',
  entType: '/getenttype',
  group: '/getgroup',
  department: '/getdepartment',
  authBy: '/getauthby',
  /** Tax Detail rows of an Entry Type (gettaxtable?enttype=G2&prpcode=SIP&yearno=27) */
  taxLines: '/gettaxtable',
} as const;

/**
 * Entry Type and Authorized By are per store on the web: Sudamo (SIP) 012, Knitting 5.
 * The beam screens have no store of their own, so the store comes from the property.
 */
export const BEAM_STRCODE = { sudamo: '012', knit: '5' } as const;
export const SUDAMO_PRPCODES = ['SIP'];
export const beamStrCode = (prpCode: string) =>
  SUDAMO_PRPCODES.includes(prpCode.trim().toUpperCase()) ? BEAM_STRCODE.sudamo : BEAM_STRCODE.knit;

/** yarn store of the POYInw inwards (Process House Inward No.): Sudamo 002 (as the web), Knitting 2 */
export const YARN_STRCODE = { sudamo: '002', knit: '2' } as const;
export const yarnStrCode = (prpCode: string) =>
  SUDAMO_PRPCODES.includes(prpCode.trim().toUpperCase()) ? YARN_STRCODE.sudamo : YARN_STRCODE.knit;

const get = (url: string, params: Row) => client.get(url, { params });
const post = (url: string, body: Row) => client.post(url, body, { timeout: 60000 });

const ok = (data: any, fallback: string) => {
  if (failed(data)) throw new Error(messageOf(data, fallback) || fallback);
  return bodyOf(data);
};

/* ---------------- rows anywhere in a response ---------------- */

const isRow = (x: any) => x && typeof x === 'object' && !Array.isArray(x);

/** listOf() first; else the first array of objects (or {"0":{..}} map) found anywhere in the body */
export const rowsOf = (res: any): Row[] => {
  const direct = listOf(res);
  if (direct.length) return direct;
  const seen = new Set<any>();
  const queue: any[] = [res?.data];
  while (queue.length) {
    const v = queue.shift();
    if (!v || typeof v !== 'object' || seen.has(v)) continue;
    seen.add(v);
    if (Array.isArray(v)) {
      if (v.length && v.every(isRow)) return v;
      continue;
    }
    const num = unwrapRows(v);
    if (num.length && !Array.isArray(v) && Object.keys(v).every(k => /^\d+$/.test(k))) return num;
    Object.values(v).forEach(x => queue.push(x));
  }
  return [];
};

/* ---------------- generic master row → option ---------------- */

const first = (r: Row, keys: string[]) => {
  for (const k of keys) {
    const v = r[k.toLowerCase()];
    if (v !== undefined && v !== null && String(v).trim() !== '') return String(v).trim();
  }
  return '';
};

const KEYS: Record<BeamLookup | 'party', { code: string[]; name: string[] }> = {
  account: { code: ['AccCode', 'code', 'value'], name: ['AccName', 'name', 'label'] },
  party: { code: ['AccCode', 'ParCode', 'code', 'value'], name: ['AccName', 'ParName', 'name', 'label'] },
  group: { code: ['GrpCode', 'code', 'value'], name: ['GrpName', 'LngName', 'ShtName', 'name', 'label'] },
  entType: { code: ['EntType', 'EntCode', 'Code', 'TypeCode', 'value', 'id'], name: ['EntName', 'EntTypeName', 'LngName', 'ShtName', 'Description', 'Name', 'label', 'text'] },
  department: { code: ['DptCode', 'code', 'value'], name: ['LngName', 'DptName', 'ShtName', 'name', 'label'] },
  authBy: { code: ['AuthBy', 'AuthCode', 'Code', 'EmpCode', 'value'], name: ['AuthName', 'Name', 'LngName', 'EmpName', 'label'] },
};

export const optionOf = (kind: BeamLookup | 'party', raw: Row): Opt => {
  const r = lower(raw);
  let code = first(r, KEYS[kind].code);
  let name = first(r, KEYS[kind].name);
  // unknown shape: first *code / *name column
  if (!code) code = String(Object.keys(r).filter(k => k.endsWith('code')).map(k => r[k])[0] ?? '').trim();
  if (!name) name = String(Object.keys(r).filter(k => k.endsWith('name')).map(k => r[k])[0] ?? code).trim();
  // still nothing: first two text columns
  if (!code) {
    const vals = Object.values(r).filter(v => v !== null && v !== undefined && String(v).trim() !== '' && typeof v !== 'object');
    code = String(vals[0] ?? '').trim();
    if (!name) name = String(vals[1] ?? code).trim();
  }
  const extra: Record<string, unknown> = {};
  if (kind === 'entType') extra.taxStru = first(r, ['TaxStru', 'TaxStruCode']);
  if (kind === 'party') {
    extra.address = [first(r, ['Add1', 'Address1', 'Address']), first(r, ['Add2', 'Address2']), first(r, ['Add3', 'Address3']), first(r, ['Add4', 'Address4']), first(r, ['City', 'CityName']), first(r, ['State', 'StateName'])]
      .filter(Boolean)
      .join(', ');
    extra.state = first(r, ['State', 'StateName']);
  }
  return { code, name: name || code, extra };
};

/* ---------------- print ---------------- */

/** web print types; Beam Inward has none yet */
export const BEAM_PRINT_TYPE: Partial<Record<BeamTxn, string>> = { beam_outward: 'beam_outward' };
export const BEAM_PRINT_FORMATS: Opt[] = [
  { code: 'one', name: 'Format One' },
  { code: 'two', name: 'Format Two' },
];

/** PDF url out of a print response: results[printType], else the first url found */
export const pdfUrlOf = (data: any, printType: string): string => {
  const r = data?.results ?? data?.response?.results;
  if (typeof r === 'string' && r) return r;
  if (r && typeof r === 'object') {
    if (typeof r[printType] === 'string' && r[printType]) return r[printType];
    const first = Object.values(r).find(v => typeof v === 'string' && v);
    if (first) return first as string;
  }
  const alt = data?.response?.url || data?.response?.pdf || data?.url || data?.pdf;
  return typeof alt === 'string' ? alt : '';
};

/* ---------------- service ---------------- */

export interface BeamService {
  /** property / year (Entries filter) */
  lookup(kind: LookupKind, ctx: BeamContext, filter?: LookupFilter): Promise<LookupOption[]>;
  master(kind: BeamLookup, ctx: BeamContext, txn: BeamTxn): Promise<Opt[]>;
  parties(ctx: BeamContext, txn: BeamTxn, search: string): Promise<Opt[]>;
  taxLines(ctx: BeamContext, txn: BeamTxn, entType: Opt): Promise<TaxLine[]>;
  taxAccounts(ctx: BeamContext, txn: BeamTxn, parCode: string): Promise<{ taxAcc: string[]; sameState: boolean | null; message: string }>;
  beams(ctx: BeamContext, txn: BeamTxn, opts: { uid: number; selected: { beamCode: number; beamSrNo: number }[]; search?: string; onlyInHouse?: boolean }): Promise<BeamMaster[]>;
  /** Beam Inward: beams out at the party (open Beam Outward lines) */
  outwardBeams(ctx: BeamContext, opts: { parCode: string; uid: number; selected: { uid: number; srNo: number }[]; search?: string }): Promise<OutwardBeam[]>;
  inwards(ctx: BeamContext, txn: BeamTxn, opts: { parCode: string; beamCode: number; beamSrNo: number; info: string }): Promise<InwardLink[]>;
  nextVoucher(ctx: BeamContext, vouDate: string): Promise<{ no: string; suffix: string }>;
  /** pads a typed voucher no. to 8 digits and checks it is free in the financial year */
  checkVoucher(ctx: BeamContext, o: { vouNo: string; suffix: string; vouDate: string; uid: number }): Promise<{ no: string; ok: boolean; message: string }>;
  browse(ctx: BeamContext, from: string, to: string): Promise<RepackListRow[]>;
  /** web print (saleschallanmultiprintnew) → PDF url */
  print(ctx: BeamContext, uid: number, format: string): Promise<string>;
  load(ctx: BeamContext, uid: number): Promise<BeamForm>;
  save(ctx: BeamContext, form: BeamForm): Promise<SaveResult>;
  remove(ctx: BeamContext, uid: number): Promise<SaveResult>;
}

const ctxParams = (ctx: BeamContext, txn: BeamTxn) => ({ prpcode: ctx.prpCode, yearno: ctx.yearNo, txntype: txn });

export function createBeamService(txn: BeamTxn): BeamService {
  const repack = createRepackingIssueService();
  const masterCache = new Map<string, Opt[]>();

  const crud = async (action: string, ctx: BeamContext, body: Row, fallback: string) => {
    const res = await post(BEAM_ROUTES.crud, { ...ctxParams(ctx, txn), action, ...body });
    return ok(res?.data, fallback);
  };

  const svc: BeamService = {
    lookup: (kind, ctx, filter) => repack.lookup(kind, ctx, filter),

    async master(kind, ctx, t) {
      const key = [kind, ctx.prpCode, ctx.yearNo, t].join('|');
      if (masterCache.has(key)) return masterCache.get(key)!;
      const base = ctxParams(ctx, t);
      // exactly the parameters of the web URLs
      const params: Row =
        kind === 'authBy' ? { prpcode: ctx.prpCode, yearno: ctx.yearNo, strcode: beamStrCode(ctx.prpCode) }
        : kind === 'entType' ? { prpcode: ctx.prpCode, yearno: ctx.yearNo, strcode: beamStrCode(ctx.prpCode), txntype: t }
        : kind === 'group' ? { ...base, fetch: '' }
        : base;
      const res = await get(BEAM_ROUTES[kind], params);
      if (failed(res?.data)) throw new Error(messageOf(res?.data, 'List could not be loaded.'));
      const list = rowsOf(res).map(r => optionOf(kind, r)).filter(o => o.code);
      if (!list.length) {
        const empty = Array.isArray(res?.data?.response?.data) && res.data.response.data.length === 0;
        throw new Error(
          empty
            ? `${BEAM_ROUTES[kind]} returned no ${kind === 'entType' ? 'entry types' : 'rows'} for property ${ctx.prpCode} (${t}). The list is not set up for this property.`
            : `No rows found in the ${kind} response (${BEAM_ROUTES[kind]}). Response starts: ${JSON.stringify(res?.data ?? null).slice(0, 300)}`
        );
      }
      masterCache.set(key, list);
      return list;
    },

    async parties(ctx, _t, search) {
      // Beam Inward uses the Beam Outward party list: beams come back from the parties they went to
      const call = async (q: string, acccode: string) => {
        const res = await get(BEAM_ROUTES.party, {
          prpcode: ctx.prpCode, yearno: ctx.yearNo, txntype: 'beam_outward', partytype: 'p', type: 'S', page: 1, limit: 20,
          search: q, isceo: 0, partype: 0, grntype: '', fetch: '', acccode, billdate: '', strtype: '', isfaint: '',
        });
        if (failed(res?.data)) throw new Error(messageOf(res?.data, 'Parties could not be loaded.'));
        return rowsOf(res).map(r => optionOf('party', r)).filter(o => o.code);
      };
      const q = search.trim();
      // a number may be the account code (2081): look it up by code too
      const lists = await Promise.all([call(q, ''), /^\d+$/.test(q) ? call('', q).catch(() => []) : Promise.resolve([])]);
      const seen = new Set<string>();
      return [...lists[1], ...lists[0]].filter(o => (seen.has(o.code) ? false : (seen.add(o.code), true)));
    },

    async taxLines(ctx, t, entType) {
      const res = await get(BEAM_ROUTES.taxLines, { enttype: entType.code, prpcode: ctx.prpCode, yearno: ctx.yearNo });
      if (failed(res?.data)) throw new Error(messageOf(res?.data, 'Tax detail could not be loaded.'));
      const lines = numberTaxLines(rowsOf(res).map(taxLineFromRow).filter(l => l.taxName || l.taxCode));
      if (!lines.length) throw new Error(`No tax lines for entry type ${entType.name || entType.code} (${ctx.prpCode}).`);
      return lines;
    },

    async taxAccounts(ctx, _t, parCode) {
      const res = await post(BEAM_ROUTES.crud, { ...ctxParams(ctx, txn), action: 'get_tax_accounts', parcode: parCode });
      const b = ok(res?.data, 'GST accounts could not be loaded.');
      const list = Array.isArray(b?.taxacc) ? b.taxacc : [];
      const same = b?.samestate;
      return {
        taxAcc: list.map((x: unknown) => String(x ?? '').trim()).filter(Boolean),
        sameState: same === null || same === undefined || same === '' ? null : Number(same) === 1,
        message: messageOf(res?.data),
      };
    },

    async beams(ctx, _t, o) {
      const b = await crud('get_beam_master_help', ctx, {
        uid: o.uid,
        selected: o.selected.map(s => ({ BeamCode: s.beamCode, BeamSrNo: s.beamSrNo })),
        search: o.search ?? '',
        onlyinhouse: o.onlyInHouse ? 1 : 0,
      }, 'Beams could not be loaded.');
      return unwrapRows(b).map(masterFromRow).filter(m => m.beamCode);
    },

    async outwardBeams(ctx, o) {
      const res = await post(BEAM_ROUTES.crud, {
        ...ctxParams(ctx, txn), action: 'get_outward_beams_help', parcode: o.parCode, uid: o.uid, search: o.search ?? '',
        selected: o.selected.map(s => ({ InwUId: s.uid, InwSrNo: s.srNo })),
      });
      const b = ok(res?.data, 'Beams out at the party could not be loaded.');
      return unwrapRows(b).map(outwardFromRow).filter(x => x.link.uid);
    },

    async inwards(ctx, _t, o) {
      const b = await crud('get_inwardno_help', ctx, {
        parcode: o.parCode, beamcode: o.beamCode, srno: o.beamSrNo, beaminfo: o.info, strcode: yarnStrCode(ctx.prpCode),
      }, 'Inward list could not be loaded.');
      return unwrapRows(b).map(inwardFromRow).filter(i => i.uid);
    },

    async nextVoucher(ctx, vouDate) {
      const b = await crud('next_voucher_no', ctx, { rodate: vouDate }, 'Voucher no. could not be loaded.');
      return { no: String(b?.vouno ?? '').trim(), suffix: String(b?.suffix ?? '').trim() };
    },

    async checkVoucher(ctx, o) {
      const res = await post(BEAM_ROUTES.crud, { ...ctxParams(ctx, txn), action: 'next_voucher_no', rodate: o.vouDate, vouno: o.vouNo, suffix: o.suffix, uid: o.uid });
      const data = res?.data;
      const b = bodyOf(data) ?? {};
      const no = String(b?.vouno ?? o.vouNo.padStart(8, '0')).trim();
      if (failed(data) || String(b?.validate) === 'false' || b?.validate === false) {
        return { no, ok: false, message: messageOf(data, 'Duplicate Voucher No.') || 'Duplicate Voucher No.' };
      }
      return { no, ok: true, message: '' };
    },

    async print(ctx, uid, format) {
      const type = BEAM_PRINT_TYPE[txn];
      if (!type) throw new Error('There is no print for this screen yet.');
      const res = await post(BEAM_ROUTES.print, {
        prpcode: ctx.prpCode, yearno: String(ctx.yearNo), strcode: beamStrCode(ctx.prpCode), uid: String(uid), printTypes: [type], printFormat: format,
      });
      const data = res?.data;
      if (failed(data)) throw new Error(messageOf(data, 'Print failed.'));
      const url = pdfUrlOf(data, type);
      if (!url) throw new Error(messageOf(data, 'The print did not return a PDF.') || 'The print did not return a PDF.');
      return url;
    },

    async browse(ctx, from, to) {
      const b = await crud('browse_data', ctx, { fromdate: from, todate: to }, 'Could not load entries.');
      return unwrapRows(b).map((raw): RepackListRow => {
        const r = lower(raw);
        const date = String(r.rodate ?? '').trim();
        const n = String(r.nrodate ?? '');
        const beams = num(r.beams);
        const gp = String(r.gatepassno ?? '').trim();
        return {
          uid: num(r.uid),
          vouNo: String(r.rono ?? '').trim(),
          date,
          dateKey: /^\d{8}$/.test(n) ? Number(n) : Number(date.split('-').reverse().join('')) || 0,
          items: [{ name: String(r.parname ?? '').trim() || String(r.parcode ?? ''), merge: '' }],
          remark: String(r.remark ?? '').trim(),
          isRepack: num(r.received) + (gp ? 1 : 0),
          info: `${beams} beam${beams === 1 ? '' : 's'}  •  Qty ${fmtQ(num(r.totqty))}  •  ₹ ${fmt2(num(r.netamt))}${gp ? `  •  Gate pass ${gp}` : ''}`,
        };
      }).sort((a, b) => b.dateKey - a.dateKey || b.uid - a.uid);
    },

    async load(ctx, uid) {
      const res = await post(BEAM_ROUTES.crud, { ...ctxParams(ctx, txn), action: 'show_data', uid });
      const data = res?.data;
      if (failed(data)) throw new Error(messageOf(data, 'Entry not found.'));
      const cands = [bodyOf(data), data?.response, data?.data, data];
      const body = cands.find(c => c && typeof c === 'object' && 'main' in c) ?? {};
      const form = formFromShow(txn, { main: unwrapRows(body.main), d1: unwrapRows(body.d1), tax: unwrapRows(body.tax), taxacc: body.taxacc ?? [], samestate: body.samestate });
      if (!form.meta?.uid) throw new Error('Entry not found.');
      // names of the coded masters
      const named = async (kind: BeamLookup, o: Opt | null) => {
        if (!o) return o;
        try { return (await svc.master(kind, ctx, txn)).find(x => x.code === o.code) ?? o; } catch { return o; }
      };
      const [group, entType, authBy] = await Promise.all([named('group', form.header.group), named('entType', form.header.entType), named('authBy', form.header.authBy)]);
      form.header = { ...form.header, group, entType, authBy };
      return form;
    },

    async save(ctx, form) {
      try {
        const editing = !!form.meta?.uid;
        const res = await post(BEAM_ROUTES.crud, buildPayload(ctx, form, editing ? 'modify_data' : 'add_data'));
        const data = res?.data ?? {};
        if (failed(data)) return { ok: false, message: messageOf(data, 'Save failed.') };
        const cands = [bodyOf(data), data?.response, data?.data, data];
        const body = cands.find(c => c && typeof c === 'object' && 'main' in c) ?? {};
        const m = lower(unwrapRows(body.main)[0]);
        const vou = [m.month, m.rono, m.suffix].map((v: any) => String(v ?? '').trim()).filter(Boolean).join(' / ');
        return { ok: true, message: `${editing ? 'Updated' : 'Saved'}${vou ? ` voucher ${vou}` : ''}.` };
      } catch (e) {
        return { ok: false, message: apiError(e) };
      }
    },

    async remove(ctx, uid) {
      try {
        const res = await post(BEAM_ROUTES.crud, { ...ctxParams(ctx, txn), action: 'delete_data', uid });
        if (failed(res?.data)) return { ok: false, message: messageOf(res?.data, 'Delete failed.') };
        return { ok: true, message: messageOf(res?.data) || 'Deleted.' };
      } catch (e) {
        return { ok: false, message: apiError(e) };
      }
    },
  };
  return svc;
}
