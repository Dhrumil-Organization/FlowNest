// FILE: src/components/PackingAutomationNEW/api.ts
// Every HTTP call of the NEW Packing Automation screen. Same Laravel
// endpoints, params and headers as the React Web ERP (PackingAutomation.jsx).
//
// Host + Bearer come from ErpSessionGate (screens/production/PackingAutomationScreen.tsx).
// prpcode / yearno / strcode come from the business context and can be changed
// on the screen's Facility card.
//
// ┌──────────────────────────────────────────────────────────────────────┐
// │ ENDPOINTS STILL TO CONNECT (see the "TO CONNECT" section at the end)  │
// │ The web screen gets these through shared components that were not in │
// │ the code we received:                                                 │
// │   findRouteCard  ← ProductionPackingHelpData                          │
// │   searchParties  ← ProductionPartySelect  (onlyFromAutomation=1)      │
// │   searchGrades   ← ProductionGradeSelect                              │
// │   searchMerges   ← ProductionMergeSelect  (onlyForProdPackingMod)     │
// │   fetchPrinters  ← PrinterSelect                                      │
// │ Until connected they throw a clear "not connected" error that the UI  │
// │ shows in place, so nothing silently half-works.                       │
// └──────────────────────────────────────────────────────────────────────┘
import axios from 'axios';

export const TXNTYPE = 'production_packing_automation';

export type Row = Record<string, any>;
export type Api = { API: string; token: string };
export type Ctx = { prpcode: string; yearno: string; strcode: string };

const headers = (token: string, extra?: Record<string, any>) => ({
  Authorization: `Bearer ${token}`,
  Accept: 'application/json',
  'X-Requested-With': 'XMLHttpRequest',
  ...(extra || {}),
});

export const apiErrorText = (e: any, fallback = 'Something went wrong.'): string => {
  const errs = e?.response?.data?.errors;
  if (Array.isArray(errs) && errs.length) return errs.join('\n');
  return String(e?.response?.data?.message || e?.message || fallback);
};

const ok = (body: any, fallback: string) => {
  if (!body || body.success === false) throw new Error(body?.message || fallback);
  if (body?.data?.isauth === '_AUTHFAILED') throw new Error('Session expired. Please sign in again.');
  return body;
};

const base = (c: Ctx) => ({ prpcode: c.prpcode, yearno: c.yearno, strcode: c.strcode, txntype: TXNTYPE });

/* ------------------------------ connected ------------------------------ */

/** Web: SoShow('0') → GET /api/prodpackingshow. Gives the form's defaults (main[0]) incl. its uid. */
export async function showPacking(a: Api, c: Ctx): Promise<{ main: Row; d1: Row[] }> {
  const r = await axios.get(`${a.API}/api/prodpackingshow`, {
    headers: headers(a.token),
    params: { uid: '0', action: 'add', ...base(c) },
  });
  const data = ok(r?.data, 'Packing form could not be loaded.').data || {};
  return { main: (Array.isArray(data.main) && data.main[0]) || {}, d1: Array.isArray(data.d1) ? data.d1 : [] };
}

export type Carton = { prodtype: string; carcode: string; carname: string; raw: Row };

/** Web: getPlanningPartyDetailData → GET /api/getplanningpartydetail. Planned cartons per production type. */
export async function fetchPlannedCartons(a: Api, c: Ctx, parcode: string, planuid: any): Promise<Carton[]> {
  const r = await axios.get(`${a.API}/api/getplanningpartydetail`, {
    headers: headers(a.token),
    params: { ...base(c), parcode, planuid },
  });
  const rows: Row[] = ok(r?.data, 'Planned cartons could not be loaded.').data?.plancarton || [];
  return rows.map((x) => ({
    prodtype: String(x.prodtype ?? '').trim(),
    carcode: String(x.carcode ?? '').trim(),
    carname: String(x.carname ?? '').trim(),
    raw: x,
  }));
}

/** Web: getPackingCartInfo → GET /api/prodpackingcartinfo. Master empty-carton weight. */
export async function fetchCartonWeight(a: Api, c: Ctx, parcode: string, carcode: string): Promise<number> {
  const r = await axios.get(`${a.API}/api/prodpackingcartinfo`, {
    headers: headers(a.token),
    params: { ...base(c), parcode, carcode },
  });
  const info: Row[] = ok(r?.data, 'Carton weight could not be loaded.').data?.cartinfo || [];
  const wt = parseFloat(info[0]?.carwt);
  return Number.isFinite(wt) ? wt : 0;
}

/**
 * Web: handleItemNewOk, printSystem 0 (NEW) → POST /api/print-qr-label
 * (React → Laravel → Cloudflare → Node → printer).
 * The OLD path (direct to a Node server on localhost:4000) cannot work from a
 * phone or tablet, so the app always uses this one.
 */
export async function printLabels(a: Api, printerName: string, labels: Row[]): Promise<{ printed: number; raw: Row }> {
  const r = await axios.post(`${a.API}/api/print-qr-label`, { printerName, isMultiple: 1, data: labels }, {
    headers: headers(a.token, { 'Content-Type': 'application/json' }),
    timeout: 30000,
  });
  const body = r?.data || {};
  if (body.success === false) throw new Error(body.message || 'Print failed.');
  const printed = Number(body.printed ?? body?.data?.printed ?? labels.length);
  return { printed: Number.isFinite(printed) ? printed : labels.length, raw: body };
}

/* ------------------------------ TO CONNECT ------------------------------
 * Fill these in from the web's shared components. Keep the return shapes:
 * the rest of the module only reads the normalised fields below.
 * ------------------------------------------------------------------------ */

const notConnected = (what: string): never => {
  throw new Error(`${what}: API not connected yet in PackingAutomationNEW/api.ts.`);
};

/** Route card lookup (scan or typed). Return the row the web help puts into FormState. */
export async function findRouteCard(_a: Api, _c: Ctx, _routeCardNo: string): Promise<Row | null> {
  return notConnected('Route card lookup');
}

/** Parties for this route card's plan. Each row: acccode/parcode, accname/parname, prodtype ("LC" or "LC,DM"). */
export async function searchParties(_a: Api, _c: Ctx, _p: { planuid: any; search: string }): Promise<Row[]> {
  return notConnected('Party list');
}

/** Grades (web enables these only after a party is chosen). Each row: grdcode, grdname. */
export async function searchGrades(_a: Api, _c: Ctx, _p: { parcode: string; search: string }): Promise<Row[]> {
  return notConnected('Grade list');
}

/** Merge (route) choices. Each row: mercode, mername. */
export async function searchMerges(_a: Api, _c: Ctx, _p: { route: Row; search: string }): Promise<Row[]> {
  return notConnected('Merge list');
}

/** Printer names the user may print to. */
export async function fetchPrinters(_a: Api, _c: Ctx): Promise<string[]> {
  return notConnected('Printer list');
}
