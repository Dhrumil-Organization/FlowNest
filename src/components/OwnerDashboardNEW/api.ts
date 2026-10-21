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
import type { ProdOrderData } from './prodOrderModel';
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
    if (!body || body.success === false || !body.response) {
      const error = new OwnerSummaryError(body?.message || `Unable to load ${what}.`);
      error.code = body?.code;
      throw error;
    }
    return body.response as T;
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

export function getOwnerSummaryOrders(
  API: string,
  token: string,
  params: { date: string; prptype: string; executive_code: string },
): Promise<TrackerOrdersData> {
  return trackerGet<TrackerOrdersData>(API, token, 'getOwnerSummaryOrders', params, 'sales orders');
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
  // PRODORDER mode
  DsnCode?: string | null;
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
