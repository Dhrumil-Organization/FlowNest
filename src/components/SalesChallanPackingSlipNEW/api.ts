// FILE: src/components/SalesChallanPackingSlipNEW/api.ts
// Every HTTP call of the NEW Sales Challan Packing Slip screen. Same Laravel
// endpoints, params and headers as the React Web ERP:
//   SalesChallanPackingSlip.js      showpackslip · checkvoucherno · get_pack_current_stock · savepackslip
//                                   savepackslipcarton · packslipdelete · getproperty · getstore
//   AllPartyDataSCPS (+ PartySelect) accountbasic (load all once; client-side search)
//                                   accountget    (full party record on pick)
//                                   getlimit      (credit limit → crlimit[0] merged into the form)
//   PendingOrderSelect / Single     showpendingso
//   ProductionTypeSelect            get_criterion fetch=prdtype
//   CartonDetail                    getcartondetail
//
// Host + Bearer come from the session gate (same as PackingAutomationNEW).
import axios from 'axios';

export const TXNTYPE = 'sales_challan_packing_slip';
export const PARTY_PAGE = 20;

export type Row = Record<string, any>;
export type Api = { API: string; token: string };
export type Ctx = { prpcode: string; yearno: string; strcode: string };
/** Extra values the web read from localStorage for the party help (getIsCeo / getIsParType). */
export type PartyScope = { isceo?: string; partype?: string };

const headers = (token: string, extra?: Record<string, any>) => ({
  Authorization: `Bearer ${token}`,
  Accept: 'application/json',
  'X-Requested-With': 'XMLHttpRequest',
  ...(extra || {}),
});
const json = (token: string) => headers(token, { 'Content-Type': 'application/json' });

export const apiErrorText = (e: any, fallback = 'Something went wrong.'): string => {
  const errs = e?.response?.data?.errors;
  if (Array.isArray(errs) && errs.length) return errs.join('\n');
  return String(e?.response?.data?.message || e?.message || fallback);
};

/** { response: { isauth, data, … } } envelope used by every endpoint of this screen. */
const resp = (body: any, fallback: string): Row => {
  const r = body?.response;
  if (!r) throw new Error(body?.message || fallback);
  if (r.isauth === '_AUTHFAILED') throw new Error('Session expired. Please sign in again.');
  return r;
};
const arr = (x: any): Row[] => (Array.isArray(x) ? x : []);

const get = async (a: Api, path: string, params: Row) =>
  (await axios.get(`${a.API}/api/${path}`, { headers: headers(a.token), params }))?.data;
const post = async (a: Api, path: string, body: Row) =>
  (await axios.post(`${a.API}/api/${path}`, body, { headers: json(a.token) }))?.data;
/**
 * Web: axios.post(url, getRequestConfig({ params }), { headers }) — the payload is wrapped
 * in `params`. Kept so Laravel needs no change.
 */
const postParams = (a: Api, path: string, params: Row) => post(a, path, { params });

const base = (c: Ctx) => ({ prpcode: c.prpcode, yearno: c.yearno, strcode: c.strcode });

/* ------------------------------ entry ------------------------------ */

export type Mode = 'add' | 'view' | 'edit' | 'scan';
export type Loaded = { main: Row; crlimit: Row; d1: Row[]; d2: Row[]; stock: Row[]; lock: any };

/** Web SoShow → GET showpackslip. add: blank entry + next number; view/edit/scan: the saved entry. */
export async function showPackSlip(a: Api, c: Ctx, uid: string | undefined, mode: Mode): Promise<Loaded> {
  const body = await get(a, 'showpackslip', {
    uid: !uid || uid === '0' ? '0' : uid,
    ...base(c),
    action: mode === 'add' ? 'add' : 'view',
    txntype: TXNTYPE,
  });
  const r = resp(body, 'Packing slip could not be loaded.');
  if (r.error === true) throw new Error(r.message || 'Packing slip could not be loaded.');
  return {
    main: arr(r.main)[0] || {},
    crlimit: arr(r.crlimit)[0] || {},
    d1: arr(r.d1),
    d2: arr(r.Sod2),
    stock: arr(r.editedd1),
    lock: r.lockdata,
  };
}

/** Web fetchPrpCode → getproperty. PrpOf = property type (S, R, U, K …) — `newPagePrpTypes`. */
export async function fetchPropertyType(a: Api, prpcode: string): Promise<string> {
  const r = resp(await get(a, 'getproperty', {}), 'Property could not be loaded.');
  const hit = arr(r.data).find((x) => String(x.PrpCode) === String(prpcode));
  return String(hit?.PrpOf ?? '');
}

/** Web fetchStrcode → getstore. SDesc = `newPageStrDesc`. Null = store not assigned to the user. */
export async function fetchStore(a: Api, c: Ctx): Promise<Row | null> {
  const r = resp(await get(a, 'getstore', { prpcode: c.prpcode, yearno: c.yearno, txntype: TXNTYPE }), 'Store could not be loaded.');
  return arr(r.data).find((x) => String(x.StrCode) === String(c.strcode)) || null;
}

/** Web checkVoucherNumber* → checkvoucherno (module FAMSAL, key ChalNo). */
export async function checkVoucherNo(a: Api, c: Ctx, p: { vouno: string; suffix: string; month: string; uid: string; date: string }) {
  const r = resp(await get(a, 'checkvoucherno', { ...base(c), ...p, module: 'FAMSAL', module_no_key: 'ChalNo' }), 'Packing number could not be checked.');
  return { ok: r.validate !== 'false', message: String(r.message || ''), ChalNo: r.ChalNo, suffix: r.suffix, month: r.month };
}

/* ------------------------------ party (AllPartyDataSCPS) ------------------------------ */

/**
 * Party master from GET accountbasic. The Party modal requests the full list once
 * (limit: '') and filters it in memory; no HTTP request is made while typing.
 * Rows: acccode, accountname, Address, City, Cnty, GSTIN, MHName, SHName, GrpCode, PanNo, Balance.
 */
export async function searchParties(a: Api, c: Ctx, p: { search: string; page?: number; limit?: number | ''; scope?: PartyScope; parcode?: string }) {
  const r = resp(await get(a, 'accountbasic', {
    ...base(c),
    txntype: TXNTYPE,
    partytype: 'p',
    type: '',
    page: p.page ?? 1,
    limit: p.limit ?? PARTY_PAGE,
    search: p.search,
    isceo: p.scope?.isceo ?? '',
    partype: p.scope?.partype ?? '',
    grntype: '',
    parcode: p.parcode ?? '',
    fetch: '',
    acccode: '',
    billdate: '',
    strtype: '',
    isfaint: '',
  }), 'Parties could not be loaded.');
  return arr(r.data);
}

/**
 * Web fetchPartyDetail → GET accountget. The full party record used to fill the form.
 * Row: acccode, accname, Address, City, State, Cnty, Zip, brkAcc, brkname, crday, SrNo, GSTIN,
 * GrpCode, PanNo, TanNo, sexe, acchist.
 */
export async function fetchPartyDetail(a: Api, c: Ctx, acccode: string): Promise<Row | null> {
  const r = resp(await get(a, 'accountget', {
    ...base(c),
    acccode,
    accname: '',
    partytype: 'p',
    txntype: TXNTYPE,
    type: '',
    grntype: '',
    contra: '',
    billdate: '',
    strtype: '',
    isfaint: '',
  }), 'Party could not be loaded.');
  return arr(r.data)[0] || null;
}

/** Web fatchlimit → GET getlimit. crlimit[0] is merged into the form. */
export async function fetchPartyLimit(a: Api, c: Ctx, parcode: string): Promise<Row> {
  const r = resp(await get(a, 'getlimit', { prpcode: c.prpcode, yearno: c.yearno, parcode, txntype: TXNTYPE, voudate: '' }), 'Credit limit could not be loaded.');
  return arr(r.crlimit)[0] || {};
}

/* ------------------------------ orders · stock ------------------------------ */

/** Web PendingOrderSelect → POST showpendingso. `linked` = "Show Linked Party Order". */
export async function fetchPendingOrders(a: Api, c: Ctx, p: { parcode: string; chaldate: string; linked: boolean; d1: Row[] }) {
  const body = await postParams(a, 'showpendingso', {
    ...base(c),
    parcode: p.parcode,
    chaldate: p.chaldate,
    limit: 20,
    page: 1,
    search: '',
    link: p.linked ? 1 : 0,
    selecteduid: p.d1,
  });
  return arr(resp(body, 'Pending orders could not be loaded.').data);
}

/** Web ProductionTypeSelect → GET get_criterion fetch=prdtype. Rows: PrdType, PrdTypeName, ListNo. */
export async function fetchProdTypes(a: Api, c: Ctx) {
  const body = await get(a, 'get_criterion', { ...base(c), txntype: TXNTYPE, prptype: '', fetch: 'prdtype' });
  return arr(resp(body, 'Production types could not be loaded.').data);
}

/** Web getStockData → POST get_pack_current_stock. Returns the allocation rows (`getD2Data`). */
export async function fetchCurrentStock(a: Api, c: Ctx, p: { d1: Row[]; prodtypes: string[]; chees: string }) {
  const body = await post(a, 'get_pack_current_stock', {
    ...base(c),
    txntype: TXNTYPE,
    itmcodes: p.d1.map((r) => r.ItmCode),
    grdcodes: p.d1.map((r) => r.GrdCode),
    shdcodes: p.d1.map((r) => r.ShdCode),
    prodtypes: p.prodtypes,
    chees: p.chees,
    selectedd1: p.d1,
  });
  return arr(resp(body, 'Stock could not be loaded.').d1);
}

/**
 * Cartons in stock for one allocation line (ItmCode + MerCode + GrdCode + ShdCode) — the same call as the web carton
 * help (CartonDetail/components/CartonSelect.fetchCarton): limit '' = ALL cartons, linked to the order line
 * (planninguid / planningsrno) on the packing date. Rows: cartno, qty, chees, WarehouseLoction (sic), ProdType,
 * GrdName, TranName / TranType, LotNo, lock, lockreason, ZUId / ZSrNo / ZSubSr, SpColor, qrcodestring, qrcodestring1.
 */
export async function fetchCartons(a: Api, c: Ctx, row: Row, p: { date: string; selected: Row[] }) {
  const body = await postParams(a, 'getcartondetail', {
    PrpCode: c.prpcode, YearNo: c.yearno, StrCode: c.strcode,
    MerCode: row.MerCode, ItmCode: row.ItmCode, GrdCode: row.GrdCode, ShdCode: row.ShdCode,
    selectedcarton: p.selected, page: 1, limit: '', type: 'S', search: '',
    planninguid: row.SOUId, planningsrno: row.SOSrNo, txntype: TXNTYPE, TxnDate: p.date,
    ttype: ['8', '3', '30', '2', '34', '32', '83', '994', '992'],
  });
  return arr(resp(body, 'Cartons could not be loaded.').data);
}

/**
 * Web ItemDetail.getSetChallan → GET getsetchallan (prpcode, yearno).
 * data: { extraqtyper (e.g. 25 = 25 %), ratedisable, calculatedisconrate }.
 * extraqtyper = extra qty allowed over the order balance, as % of the order qty (SOQty).
 */
export async function fetchSetChallan(a: Api, c: Ctx): Promise<{ extraqtyper: number }> {
  const r = resp(await get(a, 'getsetchallan', { prpcode: c.prpcode, yearno: c.yearno }), 'Challan settings could not be loaded.');
  const x = parseFloat(String(r?.data?.extraqtyper ?? '').replace(',', '.'));
  return { extraqtyper: Number.isFinite(x) && x > 0 ? x : 0 };
}

/* ------------------------------ browse ------------------------------ */

/**
 * Web SalesChallanPackingSlipBrowse.SoShow → GET packslipbrowse (action browse).
 * Every slip of the facility, one row per slip line: UId, ChalNo, ChalDate, SONo, ParName, BQty, SrNo.
 * The web has no server-side filter; the list filters on the device.
 */
export async function browseSlips(a: Api, c: Ctx): Promise<Row[]> {
  const r = resp(await get(a, 'packslipbrowse', { ...base(c), action: 'browse', txntype: TXNTYPE }), 'Packing slips could not be loaded.');
  if (r.error === true) throw new Error(r.message || 'Packing slips could not be loaded.');
  return arr(r.data);
}

/* ------------------------------ save · delete ------------------------------ */

/** Web handleSaveClick / handleSaveCartons. Same article: the form + editedd1 + txntype (+ action). */
export async function saveSlip(a: Api, article: Row, cartons: boolean): Promise<string> {
  const body = await post(a, cartons ? 'savepackslipcarton' : 'savepackslip', article);
  if (body?.success !== true) throw new Error(body?.message || 'Packing slip could not be saved.');
  return String(body?.response?.main?.[0]?.UId ?? '');
}

export async function deleteSlip(a: Api, c: Ctx, uid: string): Promise<string> {
  const body = await post(a, 'packslipdelete', { ...base(c), uid, action: 'delete', txntype: TXNTYPE });
  const r = resp(body, 'Packing slip could not be deleted.');
  // The entry screen reads response.success, the browse screen reads the top-level success.
  if (r.success !== true && body?.success !== true) throw new Error(r.message || body?.message || 'Packing slip could not be deleted.');
  return String(r.message || 'Deleted');
}
