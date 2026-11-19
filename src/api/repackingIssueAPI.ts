// FILE: src/api/repackingIssueAPI.ts
// Repacking Issue (Knitting • Grey) API — uses the shared legacy `client`
// (property-aware base URL + bearer token + x-platform header).
//
// Entries list / view / save / delete / voucher no. → KnitPrdRepackIssueController (Route::prefix('repack-issue')).
// Item / Grade / Shade → get_criterion, Merge → getmerge, carton stock → getcartondetail
// (same calls as the web Repacking Issue, txntype prod_repacking_issue).

import AsyncStorage from '@/common/utils/compatibleStorage';
import client from './legacyClient';
import { buildRepoPayload, formFromShow, listFromBrowse, MissingCartonSourceError, Row } from '../features/repackingIssue/repoMapping';
import type { RepackingService } from '../features/repackingIssue/service';
import type { LookupKind, LookupOption, RepackContext, StockCarton } from '../features/repackingIssue/types';

/** txntype of the web Repacking Issue — used for every call of this module */
export const REPACK_TXN_TYPE = 'prod_repacking_issue';
const REPO = '/repack-issue';

/** stock sources for getcartondetail (8 packing, 3 purchase, 30 job inward, 2 sales return, 34 issue return,
 *  32 job return, 83 sample to finish, 994 production packing, 42 process inward, 992 indent issue return) */
export const REPACK_STOCK_TTYPE = ['8', '3', '30', '2', '34', '32', '83', '994', '42', '992'];
/** getmerge ttype list (as sent by the web screen) */
export const MERGE_TTYPE = ['8', '3', '30', '2', '34', '83', '42', '994', '992'];

export const REPACK_ROUTES = {
  // same routes as common/API/Functions.tsx + WarehouseNEW/api.ts (working on web + mobile)
  property: '/getproperty',
  year: '/getyear', // ?prpcode
  store: '/getstore', // ?prpcode&yearno&txntype&prptype
  department: '/getdepartment',
  // KnitPrdRepackIssueRepository
  browse: `${REPO}/browse-data`,
  show: `${REPO}/show-data`,
  add: `${REPO}/add-data`,
  modify: `${REPO}/modify-data`,
  remove: `${REPO}/delete-data`,
  voucherNo: `${REPO}/next-voucher-no`,
  criterion: '/get_criterion', // fetch = itm | grd | shd
  merge: '/getmerge',
  stock: '/getcartondetail',
} as const;

export const RepackingIssueAPI = {
  properties: () => client.get(REPACK_ROUTES.property),
  years: (prpcode: string) => client.get(REPACK_ROUTES.year, { params: { prpcode } }),
  stores: (params: Record<string, any>) => client.get(REPACK_ROUTES.store, { params }),
  departments: (params: Record<string, any>) => client.get(REPACK_ROUTES.department, { params }),
  voucherNo: (params: Record<string, any>) => client.get(REPACK_ROUTES.voucherNo, { params }),
  criterion: (params: Record<string, any>) => client.get(REPACK_ROUTES.criterion, { params }),
  merges: (params: Record<string, any>) => client.get(REPACK_ROUTES.merge, { params }),
  // getstock reads $request->params[...]; FlowNest Warehouse posts the same keys flat → send both
  stock: (body: Record<string, any>) => client.post(REPACK_ROUTES.stock, { ...body, params: body }, { timeout: 60000 }),
  browse: (params: Record<string, any>) => client.get(REPACK_ROUTES.browse, { params }),
  show: (params: Record<string, any>) => client.get(REPACK_ROUTES.show, { params }),
  add: (body: Row) => client.post(REPACK_ROUTES.add, body, { timeout: 60000 }),
  modify: (body: Row) => client.post(REPACK_ROUTES.modify, body, { timeout: 60000 }),
  remove: (body: Row) => client.post(REPACK_ROUTES.remove, body, { timeout: 60000 }),
};

/* ---------------- helpers ---------------- */

export const apiError = (error: any): string =>
  error?.response?.data?.response?.message ||
  error?.response?.data?.message ||
  error?.response?.data?.error ||
  error?.message ||
  'Unable to reach server.';

/* ---- repository responses: reporesponse($data, $ok, $message) ---- */

/** the inner payload: { success, response: X } | { success, data: X } | { response: { data: X } } | X */
export const bodyOf = (data: any): any => {
  if (data?.response?.data !== undefined && typeof data.response === 'object' && !Array.isArray(data.response)) return data.response.data;
  if (data?.response !== undefined) return data.response;
  if (data?.data !== undefined) return data.data;
  return data;
};

export const messageOf = (data: any, fallback = ''): string =>
  String(data?.message ?? data?.response?.message ?? data?.data?.message ?? fallback).trim();

export const failed = (data: any) =>
  data?.success === false || data?.status === false || data?.error === true ||
  data?.response?.success === false || data?.response?.error === true;

/** Laravel may serialize a collection as {"0":{..},"1":{..}} */
export const unwrapRows = (value: any): Row[] => {
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object') {
    if (Array.isArray(value.data)) return value.data;
    const keys = Object.keys(value).filter(k => /^\d+$/.test(k)).sort((a, b) => +a - +b);
    if (keys.length) return keys.map(k => value[k]).filter(r => r && typeof r === 'object');
  }
  return [];
};

const assertOk = (data: any, fallback: string) => {
  if (failed(data)) throw new Error(messageOf(data, fallback) || fallback);
  return bodyOf(data);
};

/** show_data payload → { main, d1, d2 } wherever the wrapper put it */
const showBody = (data: any) => {
  const candidates = [bodyOf(data), data?.response, data?.data, data];
  const b = candidates.find(c => c && typeof c === 'object' && 'main' in c) ?? {};
  return { main: unwrapRows(b.main), d1: unwrapRows(b.d1), d2: unwrapRows(b.d2) };
};

/** Same shapes Grey Packing handles: [..] | {data:[..]} | {data:{response:{data:[..]}}} */
export const listOf = (response: any): any[] => {
  const raw = response?.data;
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw?.data)) return raw.data;
  if (Array.isArray(raw?.response?.data)) return raw.response.data;
  if (Array.isArray(raw?.response?.results)) return raw.response.results;
  if (Array.isArray(raw?.response)) return raw.response;
  if (Array.isArray(raw?.data?.data)) return raw.data.data;
  if (Array.isArray(response?.response?.data)) return response.response.data;
  return unwrapRows(raw?.response?.data ?? raw?.data);
};

const pick = (row: any, keys: string[]) => {
  for (const k of keys) if (row?.[k] !== undefined && row?.[k] !== null && String(row[k]).trim() !== '') return String(row[k]).trim();
  return '';
};

const MASTER_KEYS: Record<LookupKind, { code: string[]; name: string[] }> = {
  item: { code: ['ItmCode', 'itmcode', 'code'], name: ['ItmName', 'itmname', 'name'] },
  merge: { code: ['MerCode', 'mercode', 'code'], name: ['MerName', 'mername', 'name'] },
  grade: { code: ['GrdCode', 'grdcode', 'code'], name: ['GrdName', 'grdname', 'name'] },
  shade: { code: ['ShdCode', 'shdcode', 'code'], name: ['ShdName', 'shdname', 'name'] },
  department: { code: ['DptCode', 'dptcode', 'code'], name: ['LngName', 'DptName', 'name'] },
  property: { code: ['PrpCode', 'prpcode'], name: ['LngName', 'PrpName', 'ShtName'] },
  year: { code: ['YearNo', 'yearno'], name: ['YearName', 'yearname', 'YearDesc', 'YearNo'] },
  store: { code: ['StrCode', 'strcode'], name: ['StrName', 'strname', 'LngName', 'ShtName'] },
};

export const toOption = (kind: LookupKind, row: any): LookupOption => {
  const code = pick(row, MASTER_KEYS[kind].code);
  return {
    code,
    name: pick(row, MASTER_KEYS[kind].name) || code,
    extra: kind === 'item' ? { amtCalc: pick(row, ['AmtCalc', 'amtcalc', 'UOM', 'uom']), denier: pick(row, ['Denier', 'denier']) } : undefined,
  };
};

const num = (v: any) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/** getstock row (ZUId, ZSrNo, ZSubSr, cartno, qty, Wt, TranType, lock, lockreason, TranName) → StockCarton */
export const stockFromRow = (row: Row): StockCarton => {
  const l: Row = {};
  Object.keys(row || {}).forEach(k => { l[k.toLowerCase()] = row[k]; });
  return {
    cartNo: String(l.cartno ?? '').trim(),
    source: {
      puid: num(l.zuid),
      psrno: num(l.zsrno),
      psubsr: num(l.zsubsr),
      trantype: num(l.trantype),
      qty: num(l.qty),
      wt: num(l.wt),
      amtCalc: String(l.amtcalc ?? '').trim().toUpperCase(),
    },
    locked: num(l.lock) > 0,
    lockReason: String(l.lockreason ?? '').trim(),
    tranName: String(l.tranname ?? '').trim(),
  };
};

const baseParams = (ctx: RepackContext) => ({
  prpcode: ctx.prpCode,
  yearno: ctx.yearNo,
  strcode: ctx.strCode,
  txntype: REPACK_TXN_TYPE,
});

/** RepackingService used by the form. */
export function createRepackingIssueService(): RepackingService {
  const svc: RepackingService = {
    async lookup(kind, ctx, filter = {}) {
      let rows: any[];
      if (kind === 'property') rows = listOf(await RepackingIssueAPI.properties());
      else if (kind === 'year') rows = listOf(await RepackingIssueAPI.years(ctx.prpCode));
      else if (kind === 'store') {
        rows = listOf(await RepackingIssueAPI.stores({
          prpcode: ctx.prpCode,
          yearno: '',
          txntype: '',
          prptype: (await AsyncStorage.getItem('user_prptype')) || '',
        }));
      } else if (kind === 'department') rows = listOf(await RepackingIssueAPI.departments(baseParams(ctx)));
      else if (kind === 'item') {
        rows = listOf(await RepackingIssueAPI.criterion({
          ...baseParams(ctx), prptype: '', limit: 20, fetch: 'itm', itmcode: '',
          strcodes: ['', ''], issdate: '', issrdate: '', search: filter.search ?? '',
        }));
      } else if (kind === 'merge') {
        if (!filter.itmCode) return [];
        rows = listOf(await RepackingIssueAPI.merges({
          ...baseParams(ctx), plnmercode: '', ItmCode: filter.itmCode, ttype: MERGE_TTYPE,
          isall: 0, fetch: 'merge', limit: 20, search: filter.search ?? '', type: '',
        }));
      } else if (kind === 'grade') {
        if (!filter.itmCode || !filter.merCode) return [];
        rows = listOf(await RepackingIssueAPI.criterion({
          ...baseParams(ctx), ItmCode: filter.itmCode, MerCode: filter.merCode, fetch: 'grd', prptype: '',
        }));
      } else {
        if (!filter.itmCode || !filter.merCode || !filter.grdCode) return [];
        rows = listOf(await RepackingIssueAPI.criterion({
          ...baseParams(ctx), fetch: 'shd', GrdCode: filter.grdCode, ItmCode: filter.itmCode, MerCode: filter.merCode, prptype: '',
        }));
      }
      return (Array.isArray(rows) ? rows : []).map(row => toOption(kind, row)).filter(o => o.code !== '');
    },

    /*
     * Repacking Issue's own series — KnitPrdRepackIssueRepository::next_voucher_no
     * (MAX(VouNo)+1 for property + store, 8 digits, no month / suffix). Does not touch the
     * shared voucher counter, so other modules are not affected.
     * With a typed number: validate 'false' + 'Duplicate Voucher No' when it already exists.
     */
    async nextVoucher(ctx, _vouDate, current) {
      const typed = String(current?.no ?? '').trim();
      const response = await RepackingIssueAPI.voucherNo({
        prpcode: ctx.prpCode,
        yearno: ctx.yearNo,
        strcode: ctx.strCode,
        uid: 0,
        vouno: typed,
      });
      const data = response?.data ?? {};
      const body = bodyOf(data) ?? {};
      const message = String(body?.message ?? messageOf(data));
      const no = String(body?.vouno ?? body?.VouNo ?? '').trim();
      if (failed(data) || String(body?.validate).toLowerCase() === 'false' || !no) {
        throw new Error(message || 'Invalid voucher number.');
      }
      return { prefix: '', no, suffix: '' };
    },

    /*
     * getcartondetail (getstock): every carton with balance for Item / Merge / Grade / Shade in the store,
     * dated on or before the voucher date. ZUId / ZSrNo / ZSubSr / TranType become the carton's
     * puid / psrno / psubsr / trantype in POYProdRD2.
     */
    async stock(ctx, it, vouDate) {
      if (!it.item?.code || !it.merge?.code || !it.grade?.code) return [];
      const response = await RepackingIssueAPI.stock({
        PrpCode: ctx.prpCode,
        YearNo: String(ctx.yearNo),
        StrCode: ctx.strCode,
        MerCode: it.merge.code,
        ItmCode: it.item.code,
        GrdCode: it.grade.code,
        ShdCode: it.shade?.code ?? '',
        selectedcarton: [],
        page: 1,
        limit: '',
        type: 'S',
        search: '',
        planninguid: '',
        planningsrno: 1,
        txntype: REPACK_TXN_TYPE,
        TxnDate: vouDate,
        ttype: REPACK_STOCK_TTYPE,
      });
      const data = response?.data ?? {};
      if (failed(data)) throw new Error(messageOf(data, 'Could not load stock.'));
      const rows = unwrapRows(data?.response?.data ?? data?.response?.results ?? data?.data?.data ?? data?.data ?? []);
      return rows.map(stockFromRow).filter(r => r.cartNo !== '');
    },

    async browse(ctx, fromDate, toDate) {
      const response = await RepackingIssueAPI.browse({
        prpcode: ctx.prpCode,
        yearno: ctx.yearNo,
        strcode: ctx.strCode,
        fromdate: fromDate,
        todate: toDate,
        txntype: REPACK_TXN_TYPE,
      });
      return listFromBrowse(unwrapRows(assertOk(response?.data, 'Could not load entries.')));
    },

    async load(ctx, uid) {
      const response = await RepackingIssueAPI.show({
        prpcode: ctx.prpCode,
        yearno: ctx.yearNo,
        strcode: ctx.strCode,
        uid,
        txntype: REPACK_TXN_TYPE,
      });
      if (failed(response?.data)) throw new Error(messageOf(response?.data, 'Entry not found.'));
      const form = formFromShow(showBody(response?.data));
      if (!form.meta?.uid) throw new Error('Entry not found.');
      // show_data only carries the department code → name from the master
      const dpt = form.header.department;
      if (dpt) {
        try {
          const hit = (await svc.lookup('department', ctx)).find(o => o.code === dpt.code);
          if (hit) form.header.department = hit;
        } catch {
          /* keep the code */
        }
      }
      return form;
    },

    async save(ctx, form) {
      try {
        // template = every column of POYProd / RD1 / RD2 (+ new UId for add)
        const t = await RepackingIssueAPI.show({ prpcode: ctx.prpCode, yearno: ctx.yearNo, strcode: ctx.strCode, uid: 0, txntype: REPACK_TXN_TYPE });
        if (failed(t?.data)) return { ok: false, message: messageOf(t?.data, 'Could not prepare the entry.') };
        const tb = showBody(t?.data);
        const payload = buildRepoPayload({ main: tb.main[0] ?? {}, d1: tb.d1[0] ?? {}, d2: tb.d2[0] ?? {} }, ctx, form, REPACK_TXN_TYPE);

        const editing = !!form.meta?.uid;
        const response = editing ? await RepackingIssueAPI.modify(payload) : await RepackingIssueAPI.add(payload);
        const data = response?.data ?? {};
        if (failed(data)) return { ok: false, message: messageOf(data, 'Save failed.') };
        const saved = showBody(data).main[0];
        const vouno = String(saved?.vouno ?? saved?.VouNo ?? payload.vouno ?? '').trim();
        return {
          ok: true,
          message: `${editing ? 'Updated' : 'Saved'} voucher ${vouno}.`.replace(' .', '.'),
          uid: Number(saved?.uid ?? saved?.UId ?? payload.uid) || undefined,
        };
      } catch (error) {
        if (error instanceof MissingCartonSourceError) return { ok: false, message: error.message };
        return { ok: false, message: apiError(error) };
      }
    },

    async remove(ctx, uid) {
      try {
        const response = await RepackingIssueAPI.remove({ prpcode: ctx.prpCode, yearno: ctx.yearNo, strcode: ctx.strCode, uid, txntype: REPACK_TXN_TYPE });
        const data = response?.data ?? {};
        if (failed(data)) return { ok: false, message: messageOf(data, 'Delete failed.') };
        return { ok: true, message: messageOf(data) || 'Deleted.' };
      } catch (error) {
        return { ok: false, message: apiError(error) };
      }
    },
  };
  return svc;
}
