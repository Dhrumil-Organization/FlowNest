// FILE: src/screens/weftReturn/weftReturnApi.ts
// NEW ERP — Weft Issue Return: every endpoint used by the legacy module
// (components/WeftIssueReturn/*), same paths + payload keys.
import AsyncStorage from '@/common/utils/compatibleStorage';
import * as Dyn from '@/common/API/dynamicAPI';
import axios from 'axios';

export const STRCODE = '002';
export const TXN = 'beam_weft_issue_return';
const TTYPE = ['8', '3', '30', '2', '34', '83', '42'];

export type Property = { PrpCode: string; PrpOf: string; LngName: string; [k: string]: any };
export type Ctx = { prpcode: string; prptype: string; yearno: string };

const pickList = (res: any) => {
  const d = res?.data?.response?.data || res?.data?.data || res?.data?.result || [];
  return Array.isArray(d) ? d : [];
};

export function createWeftReturnApi(API: string, token: string) {
  const base = String(API || '').replace(/\/+$/, '');
  const c = axios.create({
    baseURL: base,
    timeout: 120000,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'application/json' },
  });
  const post = (url: string, body: any) => c.post(url, body, { headers: { 'X-Requested-with': 'XMLHttpRequest' } });
  const printerHeaders = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
    'x-api-key': 'PRINT_SECRET_123',
  };

  return {
    /** GET /api/getproperty (legacy fetchPropertyData) */
    properties: async (): Promise<Property[]> => {
      const res = await c.get('/api/getproperty');
      return res.data?.success && res.data?.response?.data?.length ? res.data.response.data : [];
    },

    /** POST /api/get_creel_issue_return_browse — frmdate / todate DD-MM-YYYY */
    browse: async (ctx: Ctx, frmdate: string, todate: string) =>
      pickList(await post('/api/get_creel_issue_return_browse', {
        prpcode: ctx.prpcode, prptype: ctx.prptype, yearno: ctx.yearno, strcode: STRCODE, txntype: TXN, frmdate, todate,
      })),

    /** POST /api/delete_creel_issue_return */
    remove: async (ctx: Ctx, uid: any) =>
      (await post('/api/delete_creel_issue_return', { prpcode: ctx.prpcode, yearno: ctx.yearno, strcode: STRCODE, txntype: TXN, uid })).data,

    /** POST /api/get_creel_issue_detail — beams that can be linked */
    linkable: async (ctx: Ctx) =>
      pickList(await post('/api/get_creel_issue_detail', { prpcode: ctx.prpcode, prptype: ctx.prptype, yearno: ctx.yearno, strcode: STRCODE, txntype: TXN })),

    items: async (ctx: Ctx) => (await c.get('/api/itemdrop', { params: {
      prpcode: ctx.prpcode, yearno: ctx.yearno, strcode: STRCODE, itemcode: '', itemname: '', isall: '1', txntype: TXN, billdate: '', ttype: TTYPE, fetch: '',
    } })).data?.response?.data ?? [],
    merges: async (ctx: Ctx) => (await c.get('/api/mergedrop', { params: {
      prpcode: ctx.prpcode, yearno: ctx.yearno, strcode: STRCODE, itemcode: '', itemname: '', isall: 1, txntype: TXN, billdate: '',
    } })).data?.response?.data ?? [],
    grades: async (ctx: Ctx) => (await c.get('/api/gradedrop', { params: {
      prpcode: ctx.prpcode, yearno: ctx.yearno, strcode: STRCODE, itemcode: '', itemname: '', isall: 1, txntype: TXN, billdate: '', ttype: TTYPE, fetch: 'grade',
    } })).data?.response?.data ?? [],
    shades: async (ctx: Ctx) => (await c.get('/api/shadedrop', { params: {
      prpcode: ctx.prpcode, yearno: ctx.yearno, strcode: STRCODE, itemcode: '', itemname: '', isall: 1, txntype: TXN, billdate: '',
    } })).data?.response?.data ?? [],

    /** POST /api/add_creel_issue_return — PascalCase form (legacy) */
    add: async (payload: Record<string, any>) => (await post('/api/add_creel_issue_return', payload)).data,

    /** POST /api/get_creel_issue_return_show */
    show: async (ctx: Ctx, uid: any) =>
      (await post('/api/get_creel_issue_return_show', { prpcode: ctx.prpcode, yearno: ctx.yearno, strcode: STRCODE, txntype: TXN, uid: uid || 0 })).data,

    /** POST /api/modify_creel_issue_return */
    modify: async (payload: Record<string, any>) => (await post('/api/modify_creel_issue_return', payload)).data,

    /** GET {API}/api/printers */
    printers: async (): Promise<{ Name: string; StatusText: string; [k: string]: any }[]> => {
      const res = await axios.get(`${base}/api/printers`, { headers: printerHeaders });
      const raw = res.data;
      const list = raw?.printers || raw?.data?.printers || raw?.data || raw || [];
      if (!Array.isArray(list)) return [];
      return list
        .map((i: any) => ({ ...i, Name: i.Name || i.name, StatusText: i.StatusText || i.status || 'Idle' }))
        .filter((p: any) => !!p.Name);
    },

    /** POST PRINTSTICKER (print-grey-in-stock) */
    print: async (obj: Record<string, any>, printerName: string) => {
      const params = { data: [obj], IskgQty: 0, printype: 'Print', PrintFormat: 5, printerName, txntype: TXN };
      return (await axios.post(Dyn.PRINTSTICKER, params, { headers: printerHeaders })).data;
    },
  };
}

export type WeftReturnApi = ReturnType<typeof createWeftReturnApi>;

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
/** Legacy getFinancialYearDates: FY start → today (current FY) or FY end. */
export const fyRange = (fy: string) => {
  const [a, b] = fy.split('-').map(Number);
  const from = new Date(a, 3, 1);
  const to = fy === currentFY() ? new Date() : new Date(b, 2, 31);
  return { from: dmy(from), to: dmy(to) };
};
/** Sticker yearno of a browse row: FY end (2 digits) of IssRDate. */
export const fyOfDate = (v: any) => {
  if (!v) return '0';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '0';
  const end = d.getMonth() + 1 >= 4 ? d.getFullYear() + 1 : d.getFullYear();
  return String(end).slice(-2);
};
export const str = (v: any) => (v === null || v === undefined ? '' : String(v));
export const errOf = (e: any, fb: string) => e?.response?.data?.message || e?.message || fb;
