// FILE: src/components/PackingAutomationNEW/api.ts
// Every HTTP call of the NEW Packing Automation screen. Same Laravel
// endpoints, params and headers as the React Web ERP:
//   PackingAutomation.jsx          prodpackingshow · getplanningpartydetail · prodpackingcartinfo · print-qr-label
//   ProductionPackingHelpData.js   prodpackinghelp          (route cards + the parties / merges / grades linked to each)
//   PartySelect (Components)       get_criterion get_prod_packing_party (parties of the route card's plan)
//   GradeSelect (Components)       get_criterion packing_grd · packing_grd_wise_data (grades of the production + balance)
//   MergeSelect (Components)       getmerge fetch=merge     (merges for the route card)
//   PrinterSelect.jsx              printers                 (printer list)
//
// Host + Bearer come from ErpSessionGate (screens/production/PackingAutomationScreen.tsx),
// i.e. the same Laravel host the web reads from its public JSON config, so
// printing goes React Native → Laravel → Node → printer exactly like the web.
import axios from 'axios';

/** txntype the web screen uses for its own calls. */
export const TXNTYPE = 'production_packing_automation';
/** txntype the web passes to the shared help components (route card, party, grade). */
export const HELP_TXNTYPE = 'production_packing';
/** Header PrinterSelect.jsx sends to the printer endpoints. */
const PRINT_API_KEY = 'PRINT_SECRET_123';

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

/** { success, message, data } envelope (packing endpoints). */
const ok = (body: any, fallback: string) => {
  if (!body || body.success === false) throw new Error(body?.message || fallback);
  if (body?.data?.isauth === '_AUTHFAILED') throw new Error('Session expired. Please sign in again.');
  return body;
};
/** { response: { isauth, data } } envelope (get_criterion). */
const okResponse = (body: any, fallback: string): Row[] => {
  const r = body?.response;
  if (!r) throw new Error(body?.message || fallback);
  if (r.isauth === '_AUTHFAILED') throw new Error('Session expired. Please sign in again.');
  return Array.isArray(r.data) ? r.data : [];
};

const base = (c: Ctx, txntype = TXNTYPE) => ({ prpcode: c.prpcode, yearno: c.yearno, strcode: c.strcode, txntype });

/* ------------------------------ form ------------------------------ */

/** Web: SoShow('0') → GET /api/prodpackingshow. Gives the form's defaults (main[0]) incl. its uid. */
export async function showPacking(a: Api, c: Ctx): Promise<{ main: Row; d1: Row[] }> {
  const r = await axios.get(`${a.API}/api/prodpackingshow`, {
    headers: headers(a.token),
    params: { uid: '0', action: 'add', ...base(c) },
  });
  const data = ok(r?.data, 'Packing form could not be loaded.').data || {};
  return { main: (Array.isArray(data.main) && data.main[0]) || {}, d1: Array.isArray(data.d1) ? data.d1 : [] };
}

/**
 * Web: ProductionPackingHelpData → GET /api/prodpackinghelp. `uid` is the form uid from showPacking.
 *   main = route cards open for packing (prodpackingmain). Each row: productionvouno
 *          (route card no.), productionuid, productionvoudate, planninguid, maccode/macname,
 *          itmcode/itmname, denier, mercode/mername, grdcode, shdcode/shdname, parcode/parname, cheeswt.
 *   d1, d2 = the cards' detail rows (prodpackingd1 / prodpackingd2). The web keeps these too;
 *          the party / merge / grade pickers read the rows linked to the chosen card from them.
 */
export type RouteData = { main: Row[]; d1: Row[]; d2: Row[] };
export async function fetchRouteCards(a: Api, c: Ctx, uid: any): Promise<RouteData> {
  const r = await axios.get(`${a.API}/api/prodpackinghelp`, {
    headers: headers(a.token),
    params: { ...base(c, HELP_TXNTYPE), uid: uid ?? '0' },
  });
  const body = r?.data;
  if (!body || body.success !== true) throw new Error(body?.message || 'Route cards could not be loaded.');
  const d = body?.data || {};
  const arr = (x: any) => (Array.isArray(x) ? x : []);
  return { main: arr(d.prodpackingmain), d1: arr(d.prodpackingd1), d2: arr(d.prodpackingd2) };
}

/* ------------------------------ details ------------------------------ */

/**
 * Web: ProductionPartySelect → PartySelect dialog (dependentId = planuid, onlyFromAutomation = 1)
 * → GET /api/get_criterion fetch=get_prod_packing_party for the route card's plan.
 * Rows: acccode, accountname, Address, City, State, prodtype, actprodqty, ordqty,
 * packwt, cartoncode, cartonname, cheeswt.
 */
export async function fetchPackingParties(a: Api, c: Ctx, planuid: any): Promise<Row[]> {
  const r = await axios.get(`${a.API}/api/get_criterion`, {
    headers: headers(a.token),
    params: { ...base(c, HELP_TXNTYPE), fetch: 'get_prod_packing_party', planuid: planuid ?? '', prptype: '', sexe: '' },
  });
  return okResponse(r?.data, 'Parties could not be loaded.');
}

/** Planned cartons per production type for the party. */
export type Carton = { prodtype: string; carcode: string; carname: string; raw: Row };

/** Web: getPlanningPartyDetailData → GET /api/getplanningpartydetail. */
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
 * Web: ProductionGradeSelect → GradeSelect dialog (txntype production_packing)
 * → GET /api/get_criterion fetch=packing_grd for the route card's production uid.
 * Rows: GrdCode, GrdName, MerCode, MerName.
 */
export async function fetchGrades(a: Api, c: Ctx, productionuid: any): Promise<Row[]> {
  const r = await axios.get(`${a.API}/api/get_criterion`, {
    headers: headers(a.token),
    params: { ...base(c, HELP_TXNTYPE), fetch: 'packing_grd', productionuid: productionuid ?? '', prptype: '' },
  });
  return okResponse(r?.data, 'Grades could not be loaded.');
}

export type GradeBalance = { gradechees: number; gradeqty: number; packchees: number; packqty: number; balPcs: number; balWt: number };

/**
 * Web: GradeSelect.fetchPackingGradeData (production_packing, store ≠ 001)
 * → GET /api/get_criterion fetch=packing_grd_wise_data. Graded vs packed cones / weight
 * for this production, grade and merge (web: totbalpcs / totbalwt).
 */
export async function fetchGradeBalance(a: Api, c: Ctx, p: { productionuid: any; grdcode: string; mercode: string }): Promise<GradeBalance | null> {
  const r = await axios.get(`${a.API}/api/get_criterion`, {
    headers: headers(a.token),
    params: { ...base(c, HELP_TXNTYPE), fetch: 'packing_grd_wise_data', productionuid: p.productionuid ?? '', grdcode: p.grdcode, mercode: p.mercode, prptype: '' },
  });
  const d = okResponse(r?.data, 'Grade balance could not be loaded.')[0];
  if (!d) return null;
  const n = (v: any, int = false) => { const x = int ? parseInt(v, 10) : parseFloat(v); return Number.isFinite(x) ? x : 0; };
  const gradechees = n(d.gradechees, true); const packchees = n(d.packchees, true);
  const gradeqty = n(d.gradeqty ?? d.gradeQty); const packqty = n(d.packqty);
  return { gradechees, gradeqty, packchees, packqty, balPcs: gradechees - packchees, balWt: parseFloat((gradeqty - packqty).toFixed(3)) };
}

/**
 * Production types a grade may be packed as, out of the party's types.
 * GET /api/get_criterion fetch=prdtype (txntype production_packing_automation), e.g.
 *   ?prpcode=MTX&yearno=27&strcode=002&txntype=production_packing_automation&prptype=&fetch=prdtype&grdcode=23&prdtype=M,B
 * Response: { data: [{ PrdType: 'B', PrdTypeName: 'Bottom', prodtype: 'B', prodtypename: 'Bottom' }], message }
 * (also accepted inside the usual { response: { data } } envelope).
 * Returns the allowed codes (only those of `prdtypes`, in the party's spelling) and their names.
 */
export type GradeProdTypes = { types: string[]; names: Record<string, string> };
export async function fetchGradeProdTypes(a: Api, c: Ctx, p: { grdcode: string; prdtypes: string[] }): Promise<GradeProdTypes> {
  const r = await axios.get(`${a.API}/api/get_criterion`, {
    headers: headers(a.token),
    params: { ...base(c), prptype: '', fetch: 'prdtype', grdcode: p.grdcode, prdtype: p.prdtypes.join(',') },
  });
  const body = r?.data;
  const fallback = 'Production type for this grade could not be checked.';
  let rows: Row[];
  if (body?.response) rows = okResponse(body, fallback);
  else if (body && Array.isArray(body.data)) {
    if (body.success === false) throw new Error(body.message || fallback);
    rows = body.data;
  } else throw new Error(body?.message || fallback);

  const up = (v: any) => String(v ?? '').trim().toUpperCase();
  const found = new Map<string, string>(); // CODE -> name
  for (const row of rows) {
    const code = up(row?.PrdType ?? row?.prodtype ?? row?.prdtype ?? row?.ProdType);
    if (code) found.set(code, String(row?.PrdTypeName ?? row?.prodtypename ?? row?.ProdTypeName ?? '').trim());
  }
  const types = p.prdtypes.filter((t) => found.has(up(t)));
  const names: Record<string, string> = {};
  types.forEach((t) => { const n = found.get(up(t)); if (n) names[t] = n; });
  return { types, names };
}

/**
 * Web: ProductionMergeSelect → MergeSelect dialog (onlyForProdPackingMod = true)
 * → GET /api/getmerge fetch=merge for the route card's item / grade / shade and current merge.
 * Rows: MerCode, MerName, Qty. Searched on the server (`search`), 20 at a time like the web.
 */
export async function fetchMerges(a: Api, c: Ctx, p: { itmcode: string; grdcode: string; shdcode: string; mercode: string; mername: string; search: string }): Promise<Row[]> {
  const r = await axios.get(`${a.API}/api/getmerge`, {
    headers: headers(a.token),
    params: {
      prpcode: c.prpcode, yearno: c.yearno, strcode: c.strcode, plnmercode: '',
      ItmCode: p.itmcode, GrdCode: p.grdcode, ShdCode: p.shdcode,
      ttype: ['8', '3', '30', '2', '34', '83', '42', '994', '992'], isall: 1, fetch: 'merge', limit: 20,
      search: p.search, type: '', txntype: TXNTYPE, mercode: p.mercode, mername: p.mername,
    },
  });
  return okResponse(r?.data, 'Merges could not be loaded.');
}

/* ------------------------------ printing ------------------------------ */

export type Printer = { name: string; status: string; online: boolean | null };

/**
 * Web: PrinterSelect → GET {Laravel}/api/printers (the web goes to
 * localhost:4000 only on a Rayons office PC; a phone or tablet always goes
 * through Laravel). Rows: Name, StatusText.
 */
export async function fetchPrinters(a: Api): Promise<Printer[]> {
  const r = await axios.get(`${a.API}/api/printers`, {
    headers: headers(a.token, { 'Content-Type': 'application/json', 'x-api-key': PRINT_API_KEY }),
  });
  const list: Row[] = r?.data?.printers || [];
  return list
    .map((p) => {
      const status = String(p.StatusText ?? '').trim();
      return { name: String(p.Name ?? '').trim(), status, online: !status || status === 'Idle' ? true : status === 'Offline' ? false : null };
    })
    .filter((p) => p.name);
}

/**
 * Web: handleItemNewOk, printSystem 0 → POST /api/print-qr-label
 * (React → Laravel → Cloudflare → Node → printer). Same body: { printerName, isMultiple, data }.
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
