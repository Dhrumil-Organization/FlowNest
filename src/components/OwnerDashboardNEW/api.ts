// FILE: src/components/OwnerDashboardNEW/api.ts
// Every HTTP call of the NEW ERP Owner Dashboard screen (ONE call).
//
//   GET {API}/api/getOwnerSummaryDashboard?date=YYYY-MM-DD&prptype=S&executive_code=<code|''>
//     headers : Authorization: Bearer <token>, Accept: application/json
//     backend : App\Http\Controllers\API\Analysis\OwnerSummaryDashboardController@getDashboard
//               (a NEW endpoint that re-uses the EXISTING dashboard queries — getOwnerDashboard,
//               DashboardSalesAnalyticsService, ExpenseDashboardCardService — so every figure matches
//               the existing Dashboard / Monthly Report / Production Cost card)
//     returns : { success, response: OwnerSummaryData, message }
//
// Host = `API` prop and Bearer = `token` prop, both injected by ErpSessionGate
// (sudamo_knits -> apig, rayons -> apiy). No AsyncStorage key is read or written here.
import axios from 'axios';
import type { OwnerSummaryData } from './model';
import { nowOf, PROD_STAGES, stageCells, type ProdOrderData, type ProdOrderRow } from './prodOrderModel';
import type { TrackerDetailData, TrackerOrdersData } from './trackerModel';

export type OwnerSummaryParams = {
  // date: string; 
  prptype: string;
  executive_code?: string;
  refresh?: 0 | 1;
  yearno: string
};

export class OwnerSummaryError extends Error {
  status?: number;
  code?: string;
}

export async function getOwnerSummaryDashboard(
  API: string,
  token: string,
  params: OwnerSummaryParams,
): Promise<OwnerSummaryData> {
  try {
    const response = await axios.get(`${API}/api/getOwnerSummaryDashboard`, {
      params: {
        yearno: params.yearno,
        prptype: params.prptype,
        executive_code: params.executive_code || '',
        ...(params.refresh ? { refresh: 1 } : null),
      },
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    });

    const body = response.data;

    if (!body || body.success === false || !body.response) {
      const error = new OwnerSummaryError(body?.message || 'Unable to load Owner Dashboard.');
      error.code = body?.code;
      throw error;
    }

    return body.response as OwnerSummaryData;
  } catch (err: any) {
    if (err instanceof OwnerSummaryError) throw err;

    const status: number | undefined = err?.response?.status;
    const data = err?.response?.data;
    const error = new OwnerSummaryError(
      status === 403
        ? data?.message || 'Owner Dashboard is available only to Director or Super Admin users.'
        : status === 404
          ? 'Owner Dashboard API is not available on this server yet (route getOwnerSummaryDashboard).'
          : data?.message || err?.message || 'Unable to load Owner Dashboard.',
    );
    error.status = status;
    error.code = data?.code;
    throw error;
  }
}

/* ------------------------------------------------------------------ */
/* Executive Summary drill-down (sales order stage tracker)            */
/* ------------------------------------------------------------------ */
//   GET {API}/api/getOwnerSummaryOrders?date&prptype&executive_code
//       -> open sales orders of the executive with the 7-stage tracker
//   GET {API}/api/getOwnerSummaryOrderDetail?date&prptype&so_uid
//       -> one sales order: stages, production orders, beams, outward / inward, bills, plan vs actual
//   backend : App\Http\Controllers\API\Analysis\OwnerSummaryOrderTrackerController (@orders / @detail)
//             stage dates are read from the ERP tracking table ProductionTrackingBeamSummary.

async function trackerGet<T>(API: string, token: string, path: string, params: Record<string, string>, what: string): Promise<T> {
  try {
    const response = await axios.get(`${API}/api/${path}`, {
      params,
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    });
    const body = response.data;
    if (!body || body.success === false || body.error) {
      const error = new OwnerSummaryError(body?.message || body?.error || `Unable to load ${what}.`);
      error.code = body?.code;
      throw error;
    }

    // APIs in different ERP deployments return either { success, response: ... },
    // { data: [...] }, or the payload directly. Accept all three shapes.
    const payload = body.response ?? body.data ?? body;
    if (payload == null) {
      const error = new OwnerSummaryError(body?.message || `No ${what} data was returned.`);
      error.code = body?.code;
      throw error;
    }
    return payload as T;
  } catch (err: any) {
    if (err instanceof OwnerSummaryError) throw err;
    const status: number | undefined = err?.response?.status;
    const data = err?.response?.data;
    const error = new OwnerSummaryError(
      status === 403
        ? data?.message || 'Owner Dashboard is available only to Director or Super Admin users.'
        : status === 404 && !data?.message
          ? `This API is not available on this server yet (route ${path}).`
          : data?.message || err?.message || `Unable to load ${what}.`,
    );
    error.status = status;
    error.code = data?.code;
    throw error;
  }
}

type ApiSalesOrderRow = Record<string, any>;

const asNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

const asText = (value: unknown): string => value === null || value === undefined ? '' : String(value);

/** 'YYYYMMDD' / 'YYYY-MM-DD' / 'YYYY-MM-DDTHH:mm:ss' -> 20261017 (null when empty / invalid). */
const toYmd = (value: unknown): number | null => {
  const d = asText(value).replace(/\D/g, '').slice(0, 8);
  return d.length === 8 ? Number(d) : null;
};

const stageDefs = [
  { key: 'warp', label: 'Warping', short: 'Warp' },
  { key: 'loom', label: 'Loom sheds', short: 'Loom' },
  { key: 'grey', label: 'Grey checking', short: 'Grey' },
  { key: 'out', label: 'Outward', short: 'Out' },
  { key: 'in', label: 'Inward', short: 'In' },
  { key: 'pack', label: 'Packing', short: 'Pack' },
  { key: 'sale', label: 'Sale', short: 'Sale' },
];

// Per stage: [key, prefix of the *DelayDays / *LateDays / *OverdueDays fields, plan-date field, done-date fields]
const STAGE_FIELDS: { key: string; prefix: string; plan: string; done: string[] }[] = [
  { key: 'warp', prefix: 'Warping', plan: 'WarpingPlanDate', done: ['WarpIssueDate', 'WarpDate'] },
  { key: 'loom', prefix: 'LoomSheds', plan: 'LoomShedsPlanDate', done: ['LoomStartDate'] },
  { key: 'grey', prefix: 'GreyChecking', plan: 'GreyCheckingPlanDate', done: ['WeavingCompDate', 'GreyDate'] },
  { key: 'out', prefix: 'Outward', plan: 'OutwardPlanDate', done: ['OutwardDate'] },
  { key: 'in', prefix: 'Inward', plan: 'InwardPlanDate', done: ['InwardDate'] },
  { key: 'pack', prefix: 'Packing', plan: 'PackingPlanDate', done: ['PackingDate'] },
  { key: 'sale', prefix: 'Sale', plan: 'SalePlanDate', done: ['SaleDate'] },
];

/** Delivery: negative = days past, 0 = due today, positive = days left, null = no delivery date. */
const deliveryDays = (row: ApiSalesOrderRow): number | null => {
  const past = asNumber(row.DeliveryDaysPast) ?? 0;
  const left = asNumber(row.DeliveryDaysLeft) ?? 0;
  if (past > 0) return -past;
  if (left > 0) return left;
  return toYmd(row.DeliveryDate) ? 0 : null;
};

const hasProduction = (r: ApiSalesOrderRow) => !!(asText(r.TrackId).trim() || asText(r.ProductionOrderNo).trim());

/**
 * One sales order = every API row with the same SOUId.
 * A sales order with no production order comes as ONE row with TrackId = null;
 * a sales order that is on several production orders comes as one row per production order.
 */
function normalizeSalesOrderGroup(rows: ApiSalesOrderRow[]): any {
  const header = rows[0];

  // production orders of this sales order (unique by TrackId)
  const seen = new Set<string>();
  const prodRows = rows.filter(hasProduction).filter((r) => {
    const id = asText(r.TrackId || r.ProductionOrderNo);
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
  // the row that drives the stage strip / "Now at" = the production order that is most behind
  const lead: ApiSalesOrderRow =
    [...prodRows].sort((a, b) => (asNumber(b.TotalDelayDays) ?? 0) - (asNumber(a.TotalDelayDays) ?? 0))[0] || header;

  const stages = STAGE_FIELDS.map((f, i) => {
    const doneDate = f.done.map((k) => lead[k]).find((v) => asText(v).trim());
    const base = stageCells(lead as ProdOrderRow, [PROD_STAGES[i]])[0].status; // 'On Time' / 'Overdue' / 'Done…' / 'Not Needed' / 'Pending'
    const delay = asNumber(lead[`${f.prefix}OverdueDays`]) ?? asNumber(lead[`${f.prefix}LateDays`]) ?? asNumber(lead[`${f.prefix}DelayDays`]) ?? 0;
    return {
      key: f.key,
      status: base === 'pending' && doneDate ? 'ontime' : base,
      days: Math.abs(delay),
      planned_ymd: toYmd(lead[f.plan]),
      done_ymd: toYmd(doneDate),
      done: doneDate ? 1 : 0,
      total: 1,
    };
  });

  const noProduction = prodRows.length === 0;
  const now = noProduction
    ? { key: 'none', label: asText(header.SalesOrderStatus).trim() || 'No Production Order', status: 'none', days: 0 }
    : asText(lead.CurrentStage).trim()
      ? nowOf(lead as ProdOrderRow)
      : { key: 'none', label: asText(lead.SalesOrderStatus).trim() || 'Tracking not started', status: 'none', days: 0 };

  // SalesDesignName can be a long comma list -> show the first design + "+N"
  const designList = asText(header.SalesDesignName).split(',').map((x) => x.trim()).filter(Boolean);
  const design = asText(header.dsnname).trim() || designList[0] || '';

  const qty = asNumber(header.SalesOrderQty) ?? asNumber(header.SalesOrderTotalQty) ?? 0;
  const soldQty = asNumber(header.SalesOrderSoldQty) ?? 0;
  const soldPct = asNumber(header.SOSoldPercent) ?? (qty > 0 ? (soldQty / qty) * 100 : 0);

  return {
    uid: asText(header.SOUId) || asText(header.SalesOrderNo),
    so_uid: asText(header.SOUId),
    prpcode: '',
    so_no: asText(header.SalesOrderNo),
    so_date_ymd: toYmd(header.SalesOrderDate),
    party: asText(header.PartyName || header.AccName || header.ParName || header.ParCode).trim(),
    executive_code: asText(header.SExe),
    executive: asText(header.lngname || header.SexName || header.SExeName || header.sexe || header.SExe).trim(),
    design,
    designs_text: designList.join(', '),
    more_designs: asText(header.dsnname).trim() ? 0 : Math.max(designList.length - 1, 0),
    item: asText(header.itmname || header.ItemName).trim(),
    qty,
    pending_qty: Math.max(qty - soldQty, 0),
    sold_qty: soldQty,
    sold_pct: soldPct,
    due_ymd: toYmd(header.DeliveryDate),
    days_to_due: deliveryDays(header),
    delivery_text: asText(header.DeliveryStatusText),
    stages,
    now,
    production_orders: prodRows.map((r) => ({ uid: asText(r.TrackId || r.ProductionOrderNo), no: asText(r.ProductionOrderNo), row: r })),
    beams: prodRows.reduce((a, r) => a + (asNumber(r.BeamCount) ?? 0), 0),
    raw: header,
  };
}

function normalizeTrackerOrders(payload: any): TrackerOrdersData {
  if (payload && Array.isArray(payload.orders)) return payload as TrackerOrdersData;
  const rows: ApiSalesOrderRow[] = Array.isArray(payload) ? payload : Array.isArray(payload?.data) ? payload.data : [];

  const groups = new Map<string, ApiSalesOrderRow[]>();
  rows.forEach((r, i) => {
    const key = asText(r.SOUId) || asText(r.SalesOrderNo) || `row-${i}`;
    const list = groups.get(key);
    if (list) list.push(r);
    else groups.set(key, [r]);
  });
  const orders = Array.from(groups.values()).map(normalizeSalesOrderGroup);

  // counts are taken from the same list the filter chips filter, so a chip number always matches its list
  const summary = {
    orders: orders.length,
    overdue: orders.filter((o) => o.now?.status === 'overdue').length,
    delivery_past: orders.filter((o) => typeof o.days_to_due === 'number' && o.days_to_due < 0).length,
    not_planned: orders.filter((o) => o.production_orders.length === 0).length,
    tracking_available: true,
    tracking_message: '',
    truncated: false,
  };
  return { orders, summary, stages: stageDefs } as unknown as TrackerOrdersData;
}

export async function getOwnerSummaryOrders(
  API: string,
  token: string,
  params: { date: string; prptype: string; executive_code: string },
): Promise<TrackerOrdersData> {
  const result = await trackerGet<any>(API, token, 'getOwnerSummaryOrders', params, 'sales orders');
  return normalizeTrackerOrders(result);
}

//   GET {API}/api/getsalesorderdashboard?date&prptype&executive_code&sexeid
//       -> Executive Summary row expand hone par lagti hai (pehle wali getOwnerSummaryOrders ke payload + sexeid)
//       response wahi shape: { success, response: TrackerOrdersData }
export async function getSalesOrderDashboard(
  API: string,
  token: string,
  params: { date: string; prptype: string; executive_code: string; sexeid: string },
): Promise<TrackerOrdersData> {
  // Support backend versions that identify the executive by either `sexeid`
  // or `executive_code`; retain date and send the selected financial year too.
  const dateValue = String(params.date || '').slice(0, 10);
  const date = /^\d{4}-\d{2}-\d{2}$/.test(dateValue) ? dateValue : '';
  const parsed = date ? new Date(`${date}T00:00:00`) : new Date();
  const fyStart = parsed.getMonth() >= 3 ? parsed.getFullYear() : parsed.getFullYear() - 1;
  const yearno = `${fyStart}-${fyStart + 1}`;
  const executiveCode = String(params.executive_code || params.sexeid || '');

  const result = await trackerGet<any>(API, token, 'getsalesorderdashboard', {
    date: date || params.date,
    yearno,
    prptype: params.prptype,
    executive_code: executiveCode,
    sexeid: String(params.sexeid || executiveCode),
  }, 'sales orders');

  // API may return { data: [...] }, { response: [...] }, or a direct array.
  return normalizeTrackerOrders(result);
}

export function getOwnerSummaryOrderDetail(
  API: string,
  token: string,
  params: { date: string; prptype: string; so_uid: string },
): Promise<TrackerDetailData> {
  return trackerGet<TrackerDetailData>(API, token, 'getOwnerSummaryOrderDetail', params, 'sales order detail');
}

/* ------------------------------------------------------------------ */
/* Production orders dashboard                                         */
/* ------------------------------------------------------------------ */
//   GET {API}/api/getprodorderdashboard?yearno&prptype&executive_code[&refresh=1]
//       -> { summary: { allProductionOrders, stageOverdue, sharedExecutives, fullySold }, data: [...] }
//   (works whether the backend wraps it as { success, response: {...} } or returns { summary, data } directly)
export async function getProdOrderDashboard(
  API: string,
  token: string,
  params: { yearno: string; prptype: string; executive_code?: string; refresh?: 0 | 1 },
): Promise<ProdOrderData> {
  try {
    const response = await axios.get(`${API}/api/getprodorderdashboard`, {
      params: {
        yearno: params.yearno,
        prptype: params.prptype,
        executive_code: params.executive_code || '',
        ...(params.refresh ? { refresh: 1 } : null),
      },
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    });

    const body = response.data;
    const payload = body?.response && (body.response.data || body.response.summary) ? body.response : body;

    if (!body || body.success === false || !payload || !Array.isArray(payload.data)) {
      const error = new OwnerSummaryError(body?.message || 'Unable to load production orders.');
      error.code = body?.code;
      throw error;
    }

    return {
      summary: {
        allProductionOrders: Number(payload.summary?.allProductionOrders ?? payload.data.length) || 0,
        stageOverdue: Number(payload.summary?.stageOverdue) || 0,
        sharedExecutives: Number(payload.summary?.sharedExecutives) || 0,
        fullySold: Number(payload.summary?.fullySold) || 0,
      },
      data: payload.data,
    };
  } catch (err: any) {
    if (err instanceof OwnerSummaryError) throw err;
    const status: number | undefined = err?.response?.status;
    const data = err?.response?.data;
    const error = new OwnerSummaryError(
      status === 403
        ? data?.message || 'Production orders are available only to Director or Super Admin users.'
        : status === 404 && !data?.message
          ? 'Production orders API is not available on this server yet (route getprodorderdashboard).'
          : data?.message || err?.message || 'Unable to load production orders.',
    );
    error.status = status;
    error.code = data?.code;
    throw error;
  }
}

/* ------------------------------------------------------------------ */
/* Production order -> stage detail (row click)                        */
/* ------------------------------------------------------------------ */
//   GET {API}/api/getprodorderstagedashboard?prpcode=sip&yearno=<financial year>&trackid=<TrackId of the clicked row>
//   Returns the raw body; ./prodOrderModel.ts -> normalizeStageDetail() turns it into what the screen draws.
export async function getProdOrderStageDashboard(
  API: string,
  token: string,
  params: { prpcode: string; yearno: string; trackid: string },
): Promise<any> {
  try {
    const response = await axios.get(`${API}/api/getprodorderstagedashboard`, {
      params: { prpcode: params.prpcode, yearno: params.yearno, trackid: params.trackid },
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    });
    const body = response.data;
    if (!body || body.success === false) {
      const error = new OwnerSummaryError(body?.message || 'Unable to load production order detail.');
      error.code = body?.code;
      throw error;
    }
    return body;
  } catch (err: any) {
    if (err instanceof OwnerSummaryError) throw err;
    const status: number | undefined = err?.response?.status;
    const data = err?.response?.data;
    const error = new OwnerSummaryError(
      status === 404 && !data?.message
        ? 'Production order detail API is not available on this server yet (route getprodorderstagedashboard).'
        : data?.message || err?.message || 'Unable to load production order detail.',
    );
    error.status = status;
    error.code = data?.code;
    throw error;
  }
}

/* ------------------------------------------------------------------ */
/* Production order -> collapsible sections (loaded when opened)       */
/* ------------------------------------------------------------------ */
//   GET {API}/api/getprodorderbeamwisedashboard?prpcode&yearno&trackid      -> Beam-wise dates
//   GET {API}/api/getprodorderinwoutdashboard?prpcode&yearno&trackid        -> Outward and inward
//   GET {API}/api/getprodordersalesinvoicedashboard?prpcode&yearno&trackid  -> Sales bills
//   GET {API}/api/salesorderfromproductionorder?prpcode&yearno&trackid      -> Sales orders on this production order
//   GET {API}/api/getprodbeamplantrackid?prpcode&yearno&trackid             -> Beam plan vs actual
//   All three return { data: [...] }; ./prodOrderModel.ts parses each row type.
type ProdOrderPartParams = { prpcode: string; yearno: string; trackid: string };

async function prodOrderPartGet(API: string, token: string, route: string, params: ProdOrderPartParams, what: string): Promise<any> {
  try {
    const response = await axios.get(`${API}/api/${route}`, {
      params: { prpcode: params.prpcode, yearno: params.yearno, trackid: params.trackid },
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    });
    const body = response.data;
    if (!body || body.success === false) {
      const error = new OwnerSummaryError(body?.message || `Unable to load ${what}.`);
      error.code = body?.code;
      throw error;
    }
    return body;
  } catch (err: any) {
    if (err instanceof OwnerSummaryError) throw err;
    const status: number | undefined = err?.response?.status;
    const data = err?.response?.data;
    const error = new OwnerSummaryError(
      status === 404 && !data?.message
        ? `This API is not available on this server yet (route ${route}).`
        : data?.message || err?.message || `Unable to load ${what}.`,
    );
    error.status = status;
    error.code = data?.code;
    throw error;
  }
}

export const getProdOrderBeamwiseDashboard = (API: string, token: string, params: ProdOrderPartParams) =>
  prodOrderPartGet(API, token, 'getprodorderbeamwisedashboard', params, 'beam-wise dates');

export const getProdOrderInwOutDashboard = (API: string, token: string, params: ProdOrderPartParams) =>
  prodOrderPartGet(API, token, 'getprodorderinwoutdashboard', params, 'outward and inward');

export const getProdOrderSalesInvoiceDashboard = (API: string, token: string, params: ProdOrderPartParams) =>
  prodOrderPartGet(API, token, 'getprodordersalesinvoicedashboard', params, 'sales bills');

export const getSalesOrderFromProductionOrder = (API: string, token: string, params: ProdOrderPartParams) =>
  prodOrderPartGet(API, token, 'salesorderfromproductionorder', params, 'sales orders');

export const getProdBeamPlanTrackId = (API: string, token: string, params: ProdOrderPartParams) =>
  prodOrderPartGet(API, token, 'getprodbeamplantrackid', params, 'beam plan');

/* ------------------------------------------------------------------ */
/* Executive dropdown (get_criterion)                                  */
/* ------------------------------------------------------------------ */
//   GET {API}/api/get_criterion?prpcode=SIP&strcode=012&yearno=<yy>&txntype=sales_order&fetch=salesexe&prptype=
//   -> { success, response: { data: [ { Code, "Sales Executive", SalesExecutive } ] } }
export async function getCriterionExecutives(
  API: string,
  token: string,
  params: { prpcode: string; yearno: string },
): Promise<{ code: string; name: string }[]> {
  try {
    const response = await axios.get(`${API}/api/get_criterion`, {
      params: {
        prpcode: params.prpcode,
        strcode: '012',
        yearno: params.yearno,
        txntype: 'sales_order',
        fetch: 'salesexe',
        prptype: '',
      },
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    });
    const body = response.data;
    const list = Array.isArray(body?.response?.data) ? body.response.data : Array.isArray(body?.data) ? body.data : null;
    if (!body || body.success === false || !list) {
      throw new OwnerSummaryError(body?.message || 'Unable to load sales executives.');
    }
    return list
      .map((r: any) => ({ code: String(r.Code ?? '').trim(), name: String(r.SalesExecutive ?? r['Sales Executive'] ?? '').trim() }))
      .filter((r: { code: string; name: string }) => r.code && r.name);
  } catch (err: any) {
    if (err instanceof OwnerSummaryError) throw err;
    const error = new OwnerSummaryError(err?.response?.data?.message || err?.message || 'Unable to load sales executives.');
    error.status = err?.response?.status;
    throw error;
  }
}

/* ------------------------------------------------------------------ */
/* Stage assignment tab (item x stage -> person)                       */
/* ------------------------------------------------------------------ */
export type AssignItem = { code: string; name: string };
export type AssignStage = { StageId: string; StageName: string };
export type AssignRow = { ItemCode: string; ItemName: string | null; StageId: string; StageName: string; PersonId?: string | number | null; PersonName?: string | null; IsActive: number | boolean };

const authHdr = (token: string) => ({ Authorization: `Bearer ${token}`, Accept: 'application/json' });
const apiErr = (err: any, what: string) => {
  const e = new OwnerSummaryError(err?.response?.data?.message || err?.message || `Unable to ${what}.`);
  e.status = err?.response?.status;
  return e;
};

//   GET {API}/api/getStageSetupItems?prpcode=SIP&strcode=012   -> { success, response: { data: [ { ItemCode, ItemName } ] } }
//   Distinct ItmCode from DAPDesign (NOT get_criterion). ItemName may be '' until an item-name source is configured on the server.
export async function getStageSetupItems(API: string, token: string, p: { prpcode: string; strcode: string }): Promise<AssignItem[]> {
  try {
    const r = await axios.get(`${API}/api/getStageSetupItems`, { params: { prpcode: p.prpcode, strcode: p.strcode }, headers: authHdr(token) });
    const b = r.data;
    const list = Array.isArray(b?.response?.data) ? b.response.data : null;
    if (!b || b.success === false || !list) throw new OwnerSummaryError(b?.message || 'Unable to load items.');
    return list
      .map((x: any) => ({ code: String(x.ItemCode ?? '').trim(), name: String(x.ItemName ?? '').trim() }))
      .filter((x: AssignItem) => x.code);
  } catch (err: any) {
    if (err instanceof OwnerSummaryError) throw err;
    throw apiErr(err, 'load items');
  }
}

//   GET {API}/api/getItemStageAssignments?prpcode&yearno&itemcode=<code|''>   -> { success, response: { stages, data } }
export async function getItemStageAssignments(
  API: string, token: string, p: { prpcode: string; yearno: string; itemcode: string },
): Promise<{ stages: AssignStage[]; data: AssignRow[] }> {
  try {
    const r = await axios.get(`${API}/api/getItemStageAssignments`, { params: p, headers: authHdr(token) });
    const b = r.data;
    const pl = b?.response ?? b;
    if (!b || b.success === false || !Array.isArray(pl?.data) || !Array.isArray(pl?.stages)) throw new OwnerSummaryError(b?.message || 'Unable to load assignments.');
    return {
      stages: pl.stages.map((s: any) => ({ StageId: String(s.StageId), StageName: String(s.StageName) })),
      data: pl.data,
    };
  } catch (err: any) {
    if (err instanceof OwnerSummaryError) throw err;
    throw apiErr(err, 'load assignments');
  }
}

//   POST {API}/api/saveItemStageAssignments   (insert new + update changed + deactivate when PersonId = null)
export async function saveItemStageAssignments(
  API: string, token: string,
  body: { prpcode: string; yearno: string; items: { ItemCode: string; ItemName: string; assignments: { StageId: string; StageName: string; PersonName: string | null }[] }[] },
): Promise<{ inserted: number; updated: number; deactivated: number; message: string }> {
  try {
    const r = await axios.post(`${API}/api/saveItemStageAssignments`, body, { headers: authHdr(token) });
    if (!r.data || r.data.success === false) throw new OwnerSummaryError(r.data?.message || 'Save failed.');
    // { success, response: { response: { inserted, updated, deactivated }, message }, message }
    const c = r.data.response?.response ?? r.data.response ?? {};
    return {
      inserted: Number(c.inserted) || 0,
      updated: Number(c.updated) || 0,
      deactivated: Number(c.deactivated) || 0,
      message: String(r.data.response?.message || r.data.message || ''),
    };
  } catch (err: any) {
    if (err instanceof OwnerSummaryError) throw err;
    throw apiErr(err, 'save assignments');
  }
}

//   POST {API}/api/deleteItemStageAssignments   (soft delete: IsActive = 0)
export async function deleteItemStageAssignments(
  API: string, token: string, body: { prpcode: string; yearno: string; itemcode: string; stageid?: string; stagename?: string },
): Promise<{ deactivated: number; message: string }> {
  try {
    const r = await axios.post(`${API}/api/deleteItemStageAssignments`, body, { headers: authHdr(token) });
    if (!r.data || r.data.success === false) throw new OwnerSummaryError(r.data?.message || 'Delete failed.');
    // { success, response: { deactivated }, message }
    return { deactivated: Number(r.data.response?.deactivated) || 0, message: String(r.data.message || '') };
  } catch (err: any) {
    if (err instanceof OwnerSummaryError) throw err;
    throw apiErr(err, 'delete assignments');
  }
}

//   POST {API}/api/bulkSaveItemStageAssignments   (All items row: the server applies each stage to EVERY distinct DAPDesign item, one transaction)
export async function bulkSaveItemStageAssignments(
  API: string, token: string,
  body: { prpcode: string; strcode: string; assignments: { StageId: string; StageName: string; PersonName: string }[] },
): Promise<{ items: number; inserted: number; updated: number }> {
  try {
    const r = await axios.post(`${API}/api/bulkSaveItemStageAssignments`, body, { headers: authHdr(token) });
    if (!r.data || r.data.success === false) throw new OwnerSummaryError(r.data?.message || 'Bulk save failed.');
    return r.data.response;
  } catch (err: any) {
    if (err instanceof OwnerSummaryError) throw err;
    throw apiErr(err, 'apply to all items');
  }
}

/* ------------------------------------------------------------------ */
/* Delays by person tab                                                */
/* ------------------------------------------------------------------ */
//   GET {API}/api/getdelaysbyperson?prpcode=SIP&yearno=27
//   backend : ProductionDelaysByPersonController@getDelaysByPerson  (SP_ProductionOrderTrackingDashboard @Mode = 'PERSON')
//   -> { success, response: { summary: PersonSummaryApiRow[], data: PersonDetailApiRow[] } }
export type PersonSummaryApiRow = {
  Person: string;
  Stages: string | null; // 'Warping,Loom Start,...'
  PendingLate: number | string;
  FinishedLate: number | string;
  FinishedOnTime: number | string;
  TotalDaysLost: number | string;
};
export type PersonDetailApiRow = {
  Person: string;
  StageNo: number | string;
  StageName: string;
  TrackId: string | number;
  ProductionOrderNo: string;
  ProdItmCode?: string | null;
  ProdDsnCode?: string | null;
  DesignName?: string | null;
  SExe?: string | null;
  ProductionQty?: number | string | null;
  PlanDate?: string | null; // 'YYYY-MM-DD'
  Status: 'Overdue' | 'Done - Late' | 'On Time' | string;
  LateDays: number | string;
  OverdueDays: number | string;
  DaysLost: number | string;
};

export async function getDelaysByPerson(
  API: string,
  token: string,
  p: { prpcode: string; yearno: string },
): Promise<{ summary: PersonSummaryApiRow[]; data: PersonDetailApiRow[] }> {
  try {
    const r = await axios.get(`${API}/api/getdelaysbyperson`, { params: { prpcode: p.prpcode, yearno: p.yearno }, headers: authHdr(token) });
    const b = r.data;
    const pl = b?.response ?? b;
    if (!b || b.success === false || !Array.isArray(pl?.summary) || !Array.isArray(pl?.data)) {
      throw new OwnerSummaryError(b?.message || 'Unable to load delays by person.');
    }
    return { summary: pl.summary, data: pl.data };
  } catch (err: any) {
    if (err instanceof OwnerSummaryError) throw err;
    const status: number | undefined = err?.response?.status;
    const e = new OwnerSummaryError(
      status === 404 && !err?.response?.data?.message
        ? 'Delays by person API is not available on this server yet (route getdelaysbyperson).'
        : err?.response?.data?.message || err?.message || 'Unable to load delays by person.',
    );
    e.status = status;
    throw e;
  }
}

/* ------------------------------------------------------------------ */
/* Beam plan tab                                                       */
/* ------------------------------------------------------------------ */
//   GET {API}/api/getbeamplan?prpcode=SIP&yearno=27&mode=BEAM|PRODORDER
//   backend : BeamPlanController@getBeamPlan  (SP dbo.SP_BeamPlanDashboard @Mode)
//   -> { success, response: { mode, summary: BeamPlanSummaryApi, data: BeamPlanApiRow[] } }
//   PlannedFor / MadeFor = 'label|qty|flag, label|qty|flag'  (flag 1 = made more than planned)
export type BeamPlanMode = 'BEAM' | 'PRODORDER';
export type BeamPlanSummaryApi = {
  TotalPlannedMtr: number | string;
  TotalMadeMtr: number | string;
  TotalAsPlannedMtr: number | string;
  TotalUnplannedMtr: number | string;
  TotalNotMadeMtr: number | string;
  TotalAsPlannedPercent: number | string;
  TotalUnplannedPercent: number | string;
};
export type BeamPlanApiRow = {
  // BEAM mode
  BeamUId?: number | string;
  BeamNo?: string | null;
  MachineName?: string | null;
  BeamWarpLen?: number | string | null;
  // PRODORDER mode (old getbeamplan)
  DsnCode?: string | null;
  // getprodbeamplan (By production order)
  ProdOrdUId?: string | null;
  ProdOrdNo?: string | null;
  ProdOrdDate?: string | null; // 'YYYYMMDD'
  PlannedDesigns?: string | null; // 'design|qty, design|qty'
  MadeDesigns?: string | null;
  PlannedBeams?: string | null; // 'beam|qty, beam|qty'
  UnplannedBeams?: string | null; // beams it was made on without being planned
  // both
  PlannedFor?: string | null;
  MadeFor?: string | null;
  PlannedQty: number | string;
  MadeQty: number | string;
  AsPlannedQty: number | string;
  UnplannedQty: number | string;
  NotMadeQty: number | string;
  UnplannedPercent: number | string;
  AsPlannedPercent: number | string;
  HasUnplannedFlag: number | string;
};

export async function getBeamPlan(
  API: string,
  token: string,
  p: { prpcode: string; yearno: string; mode: BeamPlanMode },
): Promise<{ summary: BeamPlanSummaryApi; data: BeamPlanApiRow[] }> {
  try {
    const r = await axios.get(`${API}/api/getbeamplan`, { params: { prpcode: p.prpcode, yearno: p.yearno, mode: p.mode }, headers: authHdr(token) });
    const b = r.data;
    const pl = b?.response ?? b;
    if (!b || b.success === false || !pl?.summary || !Array.isArray(pl?.data)) {
      throw new OwnerSummaryError(b?.message || 'Unable to load beam plan.');
    }
    return { summary: pl.summary, data: pl.data };
  } catch (err: any) {
    if (err instanceof OwnerSummaryError) throw err;
    const status: number | undefined = err?.response?.status;
    const e = new OwnerSummaryError(
      status === 404 && !err?.response?.data?.message
        ? 'Beam plan API is not available on this server yet (route getbeamplan).'
        : err?.response?.data?.message || err?.message || 'Unable to load beam plan.',
    );
    e.status = status;
    throw e;
  }
}

/* ------------------------------------------------------------------ */
/* Beam plan tab -> "By production order"                              */
/* ------------------------------------------------------------------ */
//   GET {API}/api/getprodbeamplan?prpcode=SIP&yearno=27&trackid=      (trackid stays BLANK -> every production order)
//   -> { summary: BeamPlanSummaryApi, data: BeamPlanApiRow[] }   (also accepted wrapped as { response: { summary, data } })
export async function getProdBeamPlan(
  API: string,
  token: string,
  p: { prpcode: string; yearno: string; trackid?: string },
): Promise<{ summary: BeamPlanSummaryApi; data: BeamPlanApiRow[] }> {
  try {
    const r = await axios.get(`${API}/api/getprodbeamplan`, { params: { prpcode: p.prpcode, yearno: p.yearno, trackid: p.trackid ?? '' }, headers: authHdr(token) });
    const b = r.data;
    const pl = b?.response?.data || b?.response?.summary ? b.response : b;
    if (!b || b.success === false || !pl?.summary || !Array.isArray(pl?.data)) {
      throw new OwnerSummaryError(b?.message || 'Unable to load beam plan.');
    }
    return { summary: pl.summary, data: pl.data };
  } catch (err: any) {
    if (err instanceof OwnerSummaryError) throw err;
    const status: number | undefined = err?.response?.status;
    const e = new OwnerSummaryError(
      status === 404 && !err?.response?.data?.message
        ? 'Beam plan API is not available on this server yet (route getprodbeamplan).'
        : err?.response?.data?.message || err?.message || 'Unable to load beam plan.',
    );
    e.status = status;
    throw e;
  }
}
