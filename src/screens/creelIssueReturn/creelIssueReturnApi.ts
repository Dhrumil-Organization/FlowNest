// FILE: src/screens/creelIssueReturn/creelIssueReturnApi.ts
// NEW ERP — Creel Issue Return: every endpoint used by the legacy module
// (components/CreelIssueReturn/*), same paths, methods and payload keys.
// Host + token come from props (ErpSessionGate) instead of dynamicAPI / params.
import AsyncStorage from '@/common/utils/compatibleStorage';
import * as Dyn from '@/common/API/dynamicAPI';
import axios from 'axios';

export const STRCODE = '002';
export const TXN = 'creel_issue_return';
const TTYPE = ['8', '3', '30', '2', '34', '83', '42'];

export type Property = { PrpCode: string; PrpOf: string; LngName: string; [k: string]: any };
/** prpcode = property.PrpCode, prptype = property.PrpOf, yearno = last 2 chars of "YYYY-YYYY". */
/** prpcode / prptype keep the raw property values (legacy sent selectedProperty.PrpCode / .PrpOf uncoerced). */
export type Ctx = { prpcode: any; prptype: any; yearno: string };

const pickList = (res: any) => {
  const d = res?.data?.response?.data || res?.data?.data || res?.data?.result || [];
  return Array.isArray(d) ? d : [];
};

export function createCreelIssueReturnApi(API: string, token: string) {
  const base = String(API || '').replace(/\/+$/, '');
  const c = axios.create({
    baseURL: base,
    timeout: 120000,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'application/json' },
  });
  // legacy POSTs: Authorization + Content-Type + X-Requested-with
  const post = (url: string, body: any) => c.post(url, body, { headers: { 'X-Requested-with': 'XMLHttpRequest' } });
  const printerHeaders = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
    'x-api-key': 'PRINT_SECRET_123',
  };
  const dropParams = (ctx: Ctx) => ({ prpcode: ctx.prpcode, yearno: ctx.yearno, strcode: STRCODE, itemcode: '', itemname: '' });

  return {
    /** GET /api/getproperty — legacy fetchPropertyData (default = first row). */
    properties: async (): Promise<Property[]> => {
      const res = await c.get('/api/getproperty');
      const list = res.data?.success && res.data?.response?.data?.length ? res.data.response.data : [];
      if (list.length) await AsyncStorage.setItem('get_property', JSON.stringify(list)).catch(() => undefined);
      return list;
    },

    /** POST /api/get_creel_issue_return_browse — { prpcode, prptype, yearno, strcode, txntype, frmdate, todate } (dates DD-MM-YYYY). */
    browse: async (ctx: Ctx, frmdate: string, todate: string) =>
      pickList(await post('/api/get_creel_issue_return_browse', {
        prpcode: ctx.prpcode, prptype: ctx.prptype, yearno: ctx.yearno, strcode: STRCODE, txntype: TXN, frmdate, todate,
      })),

    /** POST /api/delete_creel_issue_return — { prpcode, yearno, strcode, txntype, uid }. */
    remove: async (ctx: Ctx, uid: any) =>
      (await post('/api/delete_creel_issue_return', { prpcode: ctx.prpcode, yearno: ctx.yearno, strcode: STRCODE, txntype: TXN, uid })).data,

    /** POST /api/get_creel_issue_detail — creels that can be linked: { prpcode, prptype, yearno, strcode, txntype }. */
    linkable: async (ctx: Ctx) =>
      pickList(await post('/api/get_creel_issue_detail', { prpcode: ctx.prpcode, prptype: ctx.prptype, yearno: ctx.yearno, strcode: STRCODE, txntype: TXN })),

    /** GET /api/itemdrop — { prpcode, yearno, strcode, itemcode:'', itemname:'', isall:'1', txntype, billdate:'', ttype[], fetch:'' }. */
    items: async (ctx: Ctx) => (await c.get('/api/itemdrop', { params: {
      ...dropParams(ctx), isall: '1', txntype: TXN, billdate: '', ttype: TTYPE, fetch: '',
    } })).data?.response?.data ?? [],
    /** GET /api/mergedrop — { prpcode, yearno, strcode, itemcode:'', itemname:'', isall:1, txntype, billdate:'' }. */
    merges: async (ctx: Ctx) => (await c.get('/api/mergedrop', { params: {
      ...dropParams(ctx), isall: 1, txntype: TXN, billdate: '',
    } })).data?.response?.data ?? [],
    /** GET /api/gradedrop — { ..., isall:1, txntype, billdate:'', ttype[], fetch:'grade' }. */
    grades: async (ctx: Ctx) => (await c.get('/api/gradedrop', { params: {
      ...dropParams(ctx), isall: 1, txntype: TXN, billdate: '', ttype: TTYPE, fetch: 'grade',
    } })).data?.response?.data ?? [],
    /** GET /api/shadedrop — { ..., isall:1, txntype, billdate:'' }. */
    shades: async (ctx: Ctx) => (await c.get('/api/shadedrop', { params: {
      ...dropParams(ctx), isall: 1, txntype: TXN, billdate: '',
    } })).data?.response?.data ?? [],

    /**
     * POST /api/add_creel_issue_return — legacy PascalCase form:
     * { CartNo, ItmCode, MerCode, GrdCode, ShdCode, TotPcs, TotQty, IssUId, IssSrNo, IssSubSr, IssQty, IssChees,
     *   StkType, PrpCode, StrCode:'002', YearNo, IsCartonType 0|1, IsCartonStatus 0|1, Denier }.
     */
    add: async (payload: Record<string, any>) => (await post('/api/add_creel_issue_return', payload)).data,

    /** POST /api/get_creel_issue_return_show — { prpcode, yearno, strcode, txntype, uid (or 0) } → response { main, d1, d2, d3 }. */
    show: async (ctx: Ctx, uid: any) =>
      (await post('/api/get_creel_issue_return_show', { prpcode: ctx.prpcode, yearno: ctx.yearno, strcode: STRCODE, txntype: TXN, uid: uid ? uid : 0 })).data,

    /** POST /api/modify_creel_issue_return — { prpcode, yearno, strcode, txntype, uid, d1, d2, d3[] }. */
    modify: async (payload: Record<string, any>) => (await post('/api/modify_creel_issue_return', payload)).data,

    /** GET {API}/api/printers (x-api-key PRINT_SECRET_123). */
    printers: async (): Promise<{ Name: string; StatusText: string; [k: string]: any }[]> => {
      const res = await axios.get(`${base}/api/printers`, { headers: printerHeaders });
      const raw = res.data;
      const list = raw?.printers || raw?.data?.printers || raw?.data || raw || [];
      if (!Array.isArray(list)) return [];
      return list
        .map((i: any) => ({ ...i, Name: i.Name || i.name, StatusText: i.StatusText || i.status || 'Idle' }))
        .filter((p: any) => !!p.Name);
    },

    /** POST PRINTSTICKER (dynamicAPI, print-grey-in-stock) — { data:[sticker], IskgQty:0, printype:'Print', PrintFormat:5, printerName, txntype }. */
    print: async (obj: Record<string, any>, printerName: string) => {
      const params = { data: [obj], IskgQty: 0, printype: 'Print', PrintFormat: 5, printerName, txntype: TXN };
      return (await axios.post(Dyn.PRINTSTICKER, params, { headers: printerHeaders })).data;
    },
  };
}

export type CreelIssueReturnApi = ReturnType<typeof createCreelIssueReturnApi>;

export const lastPrinter = {
  get: () => AsyncStorage.getItem('lastSelectedPrinter').catch(() => null),
  set: (name: string) => AsyncStorage.setItem('lastSelectedPrinter', name).catch(() => undefined),
};

/** Financial year helpers — "2026-2027", starts in April. */
export const currentFY = () => {
  const d = new Date();
  const y = d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1;
  return `${y}-${y + 1}`;
};
export const fyOptions = () => {
  const start = Number(currentFY().split('-')[0]);
  return Array.from({ length: 5 }, (_, i) => `${start - i}-${start - i + 1}`);
};
const pad = (n: number) => String(n).padStart(2, '0');
export const dmy = (d: Date) => `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}`;
/** Legacy getFinancialYearDates: 1 Apr → today (current FY) or 31 Mar (older FY). */
export const fyRange = (fy: string) => {
  const [a, b] = fy.split('-').map(Number);
  const from = new Date(a, 3, 1);
  const to = fy === currentFY() ? new Date() : new Date(b, 2, 31);
  return { from: dmy(from), to: dmy(to) };
};
/** Legacy browse-print yearno: FY end (2 digits) of new Date(IssRDate), '0' if unparsable. */
export const fyOfDate = (v: any) => {
  if (!v) return '0';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '0';
  const end = d.getMonth() + 1 >= 4 ? d.getFullYear() + 1 : d.getFullYear();
  return String(end).slice(-2);
};
export const str = (v: any) => (v === null || v === undefined ? '' : String(v));
export const errOf = (e: any, fb: string) => e?.response?.data?.message || e?.message || fb;
