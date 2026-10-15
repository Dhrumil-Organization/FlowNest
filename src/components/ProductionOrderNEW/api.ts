// FILE: src/components/ProductionOrderNEW/api.ts
// Every HTTP call of the NEW Production Order entry screen. Same Laravel
// endpoints, params and headers as the React Web ERP
// (SudamoProductionOrderNew.js / SudamoProductionOrderDetailNew.js).
//
// Host + Bearer come from ErpSessionGate (screens/production/ProductionOrderEntryScreen.tsx).
// prpcode / yearno / strcode come from the business context (header property
// switch) and can be changed on the screen's context bar.
import axios from 'axios';
import type { Row } from './format';

export const TXNTYPE = 'production_order_sudo';

export type Api = { API: string; token: string };
export type Ctx = { prpcode: string; yearno: string; strcode: string };

const headers = (token: string, extra?: Record<string, any>) => ({
  Authorization: `Bearer ${token}`,
  Accept: 'application/json',
  'X-Requested-With': 'XMLHttpRequest',
  ...(extra || {}),
});

export const apiErrorText = (e: any, fallback = 'Something went wrong.'): string =>
  String(e?.response?.data?.message || e?.message || fallback);

const ok = (body: any, fallback: string) => {
  if (!body || body.success === false) throw new Error(body?.message || fallback);
  if (body?.data?.isauth === '_AUTHFAILED') throw new Error('Session expired. Please sign in again.');
  return body;
};

/* ------------------------------- browse ------------------------------- */

export async function browseOrders(a: Api, c: Ctx, f: { fromdate: string; todate: string; isauth: 0 | 1 }): Promise<Row[]> {
  const r = await axios.get(`${a.API}/api/prodorderbrowsesudo`, {
    headers: headers(a.token),
    params: { prpcode: c.prpcode, yearno: c.yearno, strcode: c.strcode || '012', txntype: TXNTYPE, ...f },
  });
  const d = r?.data?.data;
  if (d?.isauth === '_AUTHFAILED') throw new Error('Session expired. Please sign in again.');
  return Array.isArray(d) ? d : Array.isArray(d?.data) ? d.data : [];
}

export async function deleteOrder(a: Api, c: Ctx, uid: any, strcode?: string) {
  const r = await axios.post(`${a.API}/api/prodorderdeletesudo`, {
    prpcode: c.prpcode, yearno: c.yearno, strcode: strcode || c.strcode || '012', uid,
    action: 'delete', txntype: TXNTYPE, module: 'prodorder', module_no_key: 'vouno',
  }, { headers: headers(a.token, { 'Content-Type': 'application/json' }) });
  return ok(r?.data, 'Production Order could not be deleted.');
}

/* ------------------------------- detail ------------------------------- */

export async function showOrder(a: Api, c: Ctx, uid: number, action: string, strcode: string): Promise<Row> {
  const r = await axios.get(`${a.API}/api/prodorderwebnew/show`, {
    headers: headers(a.token),
    params: { uid, prpcode: c.prpcode, yearno: c.yearno, strcode: strcode || c.strcode, action, txntype: TXNTYPE },
  });
  return ok(r?.data, 'Production Order could not be loaded.').data || {};
}

export async function fetchGroups(a: Api, c: Ctx, p: { strcode?: string; uid?: number; page?: number; perPage?: number; search?: string; orderSource?: string }) {
  const r = await axios.get(`${a.API}/api/prodorderwebnew/groups`, {
    headers: headers(a.token),
    params: {
      prpcode: c.prpcode, yearno: c.yearno, strcode: p.strcode || c.strcode, uid: p.uid || 0,
      page: p.page || 1, per_page: p.perPage || 25, search: p.search || '', order_source: p.orderSource || 'I',
    },
  });
  const data = ok(r?.data, 'Design groups could not be loaded.').data || {};
  return {
    groups: (Array.isArray(data.groups) ? data.groups : []) as Row[],
    pagination: (data.pagination || { page: 1, last_page: 1, total: 0 }) as Row,
  };
}

/** role: 'job' | 'purchase' | 'owner' */
export async function fetchParties(a: Api, c: Ctx, role: 'job' | 'purchase' | 'owner', search = ''): Promise<Row[]> {
  const r = await axios.get(`${a.API}/api/prodorderwebnew/parties`, {
    headers: headers(a.token),
    params: { prpcode: c.prpcode, yearno: c.yearno, role, search, limit: 100 },
  });
  return ok(r?.data, 'Party help could not be loaded.').data?.parties || [];
}

export async function fetchCostings(a: Api, c: Ctx, dsncode: any, search = ''): Promise<Row> {
  const r = await axios.get(`${a.API}/api/prodorderwebnew/costings`, {
    headers: headers(a.token),
    params: { prpcode: c.prpcode, yearno: c.yearno, dsncode: dsncode || 0, txntype: TXNTYPE, search, limit: 100 },
  });
  return ok(r?.data, 'Costing choices could not be loaded.').data || {};
}

export async function fetchLegacyCosting(a: Api, c: Ctx, costuid: number): Promise<Row> {
  const r = await axios.get(`${a.API}/api/prodordersudocosting`, {
    headers: headers(a.token),
    params: { prpcode: c.prpcode, yearno: c.yearno, costuid, txntype: TXNTYPE },
  });
  const body = ok(r?.data, 'Legacy costing could not be loaded.');
  if (!body.data) throw new Error('Legacy costing could not be loaded.');
  return body.data;
}

export async function mapLegacyCosting(a: Api, c: Ctx, dsncode: any, legacyPrpcode: string, legacyDsncode: any) {
  const r = await axios.post(`${a.API}/api/prodorderwebnew/costing-map`, {
    prpcode: c.prpcode, yearno: c.yearno, dsncode, legacy_prpcode: legacyPrpcode || 'TRL', legacy_dsncode: legacyDsncode,
  }, { headers: headers(a.token, { 'Content-Type': 'application/json' }) });
  return ok(r?.data, 'Legacy costing design could not be linked.');
}

/** Stock & Sell design help (web uses SudamoAllDesignSelect). Served by
 *  web_designs() in the Laravel patch shipped with this module. */
export async function searchDesigns(a: Api, c: Ctx, search = ''): Promise<Row[]> {
  const r = await axios.get(`${a.API}/api/prodorderwebnew/designs`, {
    headers: headers(a.token),
    params: { prpcode: c.prpcode, yearno: c.yearno, search, limit: 50 },
  });
  return ok(r?.data, 'Designs could not be loaded.').data?.designs || [];
}

export async function prepareVoucher(a: Api, c: Ctx, main: Row, strcode: string, date: string) {
  const r = await axios.get(`${a.API}/api/checkvoucherno`, {
    headers: headers(a.token),
    params: {
      prpcode: c.prpcode, yearno: c.yearno, strcode, acccode: '',
      vouno: main.vouno || '', suffix: main.suffix || '', month: main.month || '',
      uid: main.uid, date, module: 'prodorder', module_no_key: 'vouno',
    },
  });
  const v = r?.data?.response || {};
  if (!v.vouno) throw new Error(v.message || 'Voucher number could not be prepared.');
  return { vouno: String(v.vouno), suffix: String(v.suffix || ''), month: String(v.month || '') };
}

export async function saveOrder(a: Api, c: Ctx, payload: Row, voucher: Row, main: Row, recordUid: number, strcode: string) {
  const r = await axios.post(`${a.API}/api/prodorderwebnew/save`, payload, {
    headers: headers(a.token, {
      'Content-Type': 'application/json',
      reqhdrprpcode: c.prpcode, reqhdryearno: c.yearno, reqhdrstrcode: strcode, reqhdracccode: '',
      reqhdrvouno: voucher.vouno || main.vouno || '', reqhdrsuffix: voucher.suffix || main.suffix || '',
      reqhdrmonth: voucher.month || main.month || '', reqhdruid: recordUid || main.uid,
      reqhdrdate: payload.voudate, reqhdrmodule: 'prodorder', reqhdrmodulenokey: 'vouno', reqhdrsavecall: 1,
    }),
  });
  return ok(r?.data, 'Production Order could not be saved.');
}

/* ---------------- costing module (NEW design costing) ---------------- */

/** GET /api/costing/{id} → { inputs, snap, yarn_lines } (costing module). */
export async function fetchCostingDetail(a: Api, costingId: string): Promise<Row> {
  const r = await axios.get(`${a.API}/api/costing/${encodeURIComponent(costingId)}`, { headers: headers(a.token) });
  return ok(r?.data, 'Costing sheet could not be loaded.').data || {};
}

/** GET /api/designs/{md_id} → design master (yarn names, type PD/YD). */
export async function fetchDesignDetail(a: Api, mdId: string): Promise<Row> {
  const r = await axios.get(`${a.API}/api/designs/${encodeURIComponent(mdId)}`, { headers: headers(a.token) });
  return ok(r?.data, 'Design could not be loaded.').data || {};
}
