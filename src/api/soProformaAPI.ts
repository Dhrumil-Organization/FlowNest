// FILE: src/api/soProformaAPI.ts
// Sales Order → Proforma Invoice (Grey) on the shared legacy `client`.
//  - authorized Grey SOs: GET /sosortbrowse {prptype, strcode:'012', fromdate, todate (yyyymmdd), strtype:'g',
//    txntype:'sales_order', referrer:'mob_dashboard', yearno, prpcode, prpcodes:[], search:'', isauth:1, atype:'m'}
//  - POST /so_proforma_crud {action}: so_summary, list_data, show_data, add_data, modify_data, delete_data, next_no, last_tax
//  - tax lines: the Entry Type of the SO through GET /gettaxtable; same state / other state through the beam
//    get_tax_accounts action (party state vs property state)
//  - SO print: POST /saleschallanmultiprintnew {printTypes:['sales_order'], printFormat:'2'} → results.sales_order = PDF url
//  - Proforma print: same route {uid: proforma UId, printTypes:['so_proforma'], printFormat:'2'} → results.so_proforma
import AsyncStorage from '@/common/utils/compatibleStorage';
import client from './legacyClient';
import { apiError, bodyOf, failed, messageOf, unwrapRows } from './repackingIssueAPI';
import { BEAM_ROUTES, createBeamService, pdfUrlOf, rowsOf } from './beamInOutAPI';
import { lower, num, r3 } from '../features/beamInOut/logic';
import { numberTaxLines, taxLineFromRow } from '../features/beamInOut/logic';
import type { TaxLine } from '../features/beamInOut/types';
import { buildPayload, dmyKey, lineName, sameStateFromTaxAcc, toDMY } from '../features/soProforma/logic';
import type { PiContext, PiLine, Proforma, ProformaRow, SalesOrder, SoLine } from '../features/soProforma/types';

type Row = Record<string, any>;

export const PI_ROUTES = { crud: '/so_proforma_crud', soBrowse: '/sosortbrowse', print: '/saleschallanmultiprintnew' } as const;
/** Grey sales orders */
export const GREY_SO = { strcode: '012', strtype: 'g' } as const;
export const SO_PRINT = { type: 'sales_order', format: '2' } as const;
/** proforma print on the server: same layout as the Sales Order print format "2", data from FAMSOProforma (uid = proforma UId) */
export const PI_PRINT = { type: 'so_proforma', format: '2' } as const;

const str = (v: unknown) => String(v ?? '').trim();
const ymd = (d: Date) => `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;

const soLineFromRow = (raw: Row): SoLine => {
  const r = lower(raw);
  return {
    srNo: num(r.srno), itmCode: num(r.itmcode), dsnCode: num(r.dsncode), shdCode: num(r.shdcode),
    item: str(r.itmname), design: str(r.dsnname), shade: str(r.shdname),
    qty: r3(num(r.qty)), rate: num(r.unitrate ?? r.rate), done: 0,
  };
};

export const soFromRow = (raw: Row): SalesOrder => {
  const r = lower(raw);
  const date = str(r.sodate);
  return {
    uid: num(r.uid), prpCode: str(r.prpcode), soNo: str(r.sono), soDate: date,
    dateKey: /^\d{8}$/.test(str(r.nsodate)) ? num(r.nsodate) : dmyKey(date),
    parCode: str(r.parcode), party: str(r.parname), entType: str(r.enttype), netAmt: num(r.netamt),
    lines: (Array.isArray(raw?.d1) ? raw.d1 : Array.isArray(r.d1) ? r.d1 : []).map(soLineFromRow).filter((l: SoLine) => l.qty > 0),
    piCount: 0,
  };
};

const proformaRowOf = (raw: Row): ProformaRow => {
  const r = lower(raw);
  const date = str(r.pidate);
  return {
    uid: num(r.uid), no: str(r.pino), date, dateKey: /^\d{8}$/.test(str(r.npidate)) ? num(r.npidate) : dmyKey(date),
    validTill: str(r.validdate), qty: r3(num(r.qty)), grsAmt: num(r.grsamt), taxAmt: num(r.taxamt), netAmt: num(r.netamt), remark: str(r.remark),
  };
};

export interface SaveOut { ok: boolean; message: string; proforma?: Proforma }

export interface ProformaService {
  /** authorized Grey SOs of the period with their proformed qty */
  orders(ctx: PiContext, months: number, search: string): Promise<SalesOrder[]>;
  /** proformas of one SO; also refreshes the SO's proformed qty */
  proformas(ctx: PiContext, so: SalesOrder): Promise<{ so: SalesOrder; list: ProformaRow[] }>;
  /** proforma for the form (lines = every SO line, qty from the proforma) */
  load(ctx: PiContext, so: SalesOrder, uid: number): Promise<Proforma>;
  nextNo(ctx: PiContext, date: string): Promise<string>;
  /**
   * full tax structure of the SO's Entry Type (gettaxtable) + which GST lines apply (its `taxacc`),
   * the tax % / terms of the last proforma of this SO
   */
  taxDefaults(ctx: PiContext, so: SalesOrder): Promise<{ lines: TaxLine[]; taxAcc: string[]; sameState: boolean | null; previous: TaxLine[]; remark: string }>;
  sameState(ctx: PiContext, parCode: string): Promise<boolean | null>;
  save(ctx: PiContext, so: SalesOrder, p: Proforma, sameState: boolean | null): Promise<SaveOut>;
  remove(ctx: PiContext, uid: number): Promise<{ ok: boolean; message: string }>;
  printSO(ctx: PiContext, so: SalesOrder): Promise<string>;
  /** PDF url of a saved proforma (saleschallanmultiprintnew, printTypes ['so_proforma'], printFormat '2') */
  printPI(ctx: PiContext, so: SalesOrder, uid: number): Promise<string>;
}

export function createProformaService(): ProformaService {
  const beam = createBeamService('beam_outward');
  const crud = async (action: string, ctx: PiContext, body: Row = {}) =>
    (await client.post(PI_ROUTES.crud, { prpcode: ctx.prpCode, yearno: ctx.yearNo, action, ...body }, { timeout: 60000 }))?.data;
  const ok = (data: any, fallback: string) => {
    if (failed(data)) throw new Error(messageOf(data, fallback) || fallback);
    return bodyOf(data);
  };

  /** proformed qty per SO line → so.lines[].done, proforma count → so.piCount */
  const summary = async (ctx: PiContext, orders: SalesOrder[]) => {
    if (!orders.length) return orders;
    const b = ok(await crud('so_summary', ctx, { souids: orders.map(o => o.uid) }), 'Proformed qty could not be loaded.');
    const done = new Map<string, number>();
    const pis = new Map<number, number>();
    unwrapRows(b?.lines).forEach(raw => {
      const r = lower(raw);
      done.set(`${num(r.souid)}|${num(r.sosrno)}`, r3(num(r.doneqty)));
    });
    unwrapRows(b?.counts).forEach(raw => {
      const r = lower(raw);
      pis.set(num(r.souid), num(r.pis));
    });
    return orders.map(o => ({ ...o, piCount: pis.get(o.uid) ?? 0, lines: o.lines.map(l => ({ ...l, done: done.get(`${o.uid}|${l.srNo}`) ?? 0 })) }));
  };

  const printPdf = async (prpcode: string, ctx: PiContext, uid: number, type: string, format: string) => {
    const res = await client.post(PI_ROUTES.print, {
      prpcode, yearno: String(ctx.yearNo), strcode: GREY_SO.strcode, uid: String(uid), printTypes: [type], printFormat: format,
    }, { timeout: 60000 });
    const data = res?.data;
    if (failed(data)) throw new Error(messageOf(data, 'Print failed.'));
    const url = pdfUrlOf(data, type);
    if (!url) throw new Error(messageOf(data, 'The print did not return a PDF.') || 'The print did not return a PDF.');
    return url;
  };

  return {
    async orders(ctx, months, search) {
      const to = new Date();
      const from = new Date(to.getFullYear(), to.getMonth() - months, to.getDate());
      const prptype = (await AsyncStorage.getItem('user_prptype')) ?? '';
      const res = await client.get(PI_ROUTES.soBrowse, {
        params: {
          prptype, strcode: GREY_SO.strcode, fromdate: ymd(from), todate: ymd(to), strtype: GREY_SO.strtype, txntype: 'sales_order',
          referrer: 'mob_dashboard', yearno: ctx.yearNo, prpcode: ctx.prpCode, prpcodes: [], search, isauth: 1, atype: 'm',
        },
      });
      const data = res?.data;
      if (failed(data)) throw new Error(messageOf(data, 'Sales Orders could not be loaded.'));
      const list = (data?.response?.data || data?.response || data?.data || []) as Row[];
      const orders = (Array.isArray(list) ? list : [])
        .map(soFromRow)
        .filter(o => o.uid && o.lines.length && (!o.prpCode || o.prpCode === ctx.prpCode));
      return (await summary(ctx, orders)).sort((a, b) => b.dateKey - a.dateKey || b.uid - a.uid);
    },

    async proformas(ctx, so) {
      const b = ok(await crud('list_data', ctx, { souid: so.uid }), 'Proformas could not be loaded.');
      const list = unwrapRows(b?.main).map(proformaRowOf).sort((x, y) => x.dateKey - y.dateKey || x.uid - y.uid);
      const done = new Map<number, number>();
      unwrapRows(b?.lines).forEach(raw => {
        const r = lower(raw);
        done.set(num(r.sosrno), r3((done.get(num(r.sosrno)) ?? 0) + num(r.qty)));
      });
      return { so: { ...so, piCount: list.length, lines: so.lines.map(l => ({ ...l, done: done.get(l.srNo) ?? 0 })) }, list };
    },

    async load(ctx, so, uid) {
      const b = ok(await crud('show_data', ctx, { uid }), 'Proforma not found.');
      const m = lower(b?.main);
      if (!num(m.uid)) throw new Error('Proforma not found.');
      const mine = new Map<number, Row>();
      unwrapRows(b?.d1).forEach(raw => { const r = lower(raw); mine.set(num(r.sosrno), r); });
      const lines: PiLine[] = so.lines.map(l => {
        const d = mine.get(l.srNo);
        const q = d ? r3(num(d.qty)) : 0;
        return {
          soSrNo: l.srNo, itmCode: l.itmCode, dsnCode: l.dsnCode, shdCode: l.shdCode, name: d ? str(d.itmname) || lineName(l) : lineName(l),
          ordered: l.qty, other: r3(Math.max(0, l.done - q)), rate: d ? num(d.rate) : l.rate, qty: q ? String(q) : '', hsn: d ? str(d.hsncode) : '',
        };
      });
      return {
        uid: num(m.uid), no: str(m.pino), date: toDMY(m.pidates ?? m.pidate), validTill: toDMY(m.validdates ?? m.validdate),
        remark: str(m.remark), lines, tax: numberTaxLines(unwrapRows(b?.tax).map(taxLineFromRow)),
      };
    },

    async nextNo(ctx, date) {
      const b = ok(await crud('next_no', ctx, { pidate: date }), 'Next proforma no. could not be loaded.');
      return str(b?.pino);
    },

    async taxDefaults(ctx, so) {
      const structure = async () => {
        if (!so.entType) return { lines: [] as TaxLine[], taxAcc: [] as string[] };
        const res = await client.get(BEAM_ROUTES.taxLines, { params: { enttype: so.entType, prpcode: ctx.prpCode, yearno: ctx.yearNo, parcode: so.parCode } });
        if (failed(res?.data)) throw new Error(messageOf(res?.data, 'Tax detail could not be loaded.'));
        const accRaw = res?.data?.taxacc ?? res?.data?.response?.taxacc ?? res?.data?.data?.taxacc;
        return {
          lines: numberTaxLines(rowsOf(res).map(taxLineFromRow).filter(l => l.taxName || l.taxCode)),
          taxAcc: (Array.isArray(accRaw) ? accRaw : []).map((x: unknown) => str(x)).filter(Boolean),
        };
      };
      const [st, last] = await Promise.all([
        structure().catch(() => ({ lines: [] as TaxLine[], taxAcc: [] as string[] })),
        crud('last_tax', ctx, { souid: so.uid }).then(d => (failed(d) ? null : bodyOf(d))).catch(() => null),
      ]);
      const previous = numberTaxLines(unwrapRows(last?.tax).map(taxLineFromRow));
      // CGST + SGST or IGST: the GST accounts gettaxtable lists (as the web), else the party / property state
      let same = sameStateFromTaxAcc(st.lines, st.taxAcc);
      if (same === null) same = await beam.taxAccounts(ctx, 'beam_outward', so.parCode).then(r => r.sameState).catch(() => null);
      return {
        lines: st.lines.length ? st.lines : previous.map(t => ({ ...t, amt: t.manual ? '' : t.amt, manual: false })),
        taxAcc: st.taxAcc,
        sameState: same,
        previous,
        remark: str(last?.remark),
      };
    },

    async sameState(ctx, parCode) {
      try {
        return (await beam.taxAccounts(ctx, 'beam_outward', parCode)).sameState;
      } catch {
        return null;
      }
    },

    async save(ctx, so, p, sameState) {
      try {
        const action = p.uid ? 'modify_data' : 'add_data';
        const data = await crud(action, ctx, buildPayload(ctx, so, p, sameState));
        if (failed(data)) return { ok: false, message: messageOf(data, 'Save failed.') };
        const m = lower(bodyOf(data)?.main);
        return { ok: true, message: messageOf(data) || 'Proforma saved.', proforma: { ...p, uid: num(m.uid) || p.uid, no: str(m.pino) || p.no } };
      } catch (e) {
        return { ok: false, message: apiError(e) };
      }
    },

    async remove(ctx, uid) {
      try {
        const data = await crud('delete_data', ctx, { uid });
        if (failed(data)) return { ok: false, message: messageOf(data, 'Delete failed.') };
        return { ok: true, message: messageOf(data) || 'Deleted.' };
      } catch (e) {
        return { ok: false, message: apiError(e) };
      }
    },

    async printSO(ctx, so) {
      return printPdf(so.prpCode || ctx.prpCode, ctx, so.uid, SO_PRINT.type, SO_PRINT.format);
    },

    async printPI(ctx, so, uid) {
      return printPdf(so.prpCode || ctx.prpCode, ctx, uid, PI_PRINT.type, PI_PRINT.format);
    },
  };
}
