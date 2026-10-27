// FILE: src/components/StoreItemMasterNew/api.ts
// Store Item Master API adapter for the supplied Laravel StoreItemMaster controller.
import axios from 'axios';
import { BrowseRow, ItemMake, Lookups, Mode, Opt, PropertyOpt, Scope, StoreItem, emptyMake, scopeOf, scopeReady, toNum } from './model';

// Real backend is enabled. API should be the server base URL (without a trailing /api).
export const USE_MOCK = false;
export const ENDPOINTS = {
  lookups: '/api/store-item-master/browse-data',
  browse: '/api/store-item-master/browse-data',
  item: '/api/store-item-master/show-data',
  add: '/api/store-item-master/add-data',
  modify: '/api/store-item-master/modify-data',
  remove: '/api/store-item-master/delete-data',
} as const;
/** Transaction type sent with EVERY request (same idea as Color Item Master's 'color_item_master'). */
export const TXN_TYPE = 'store_item_master';

/**
 * Property / Year / Store scope + txntype, attached to every request.
 * Color Item Master keys (prptype, PrpCode, YearNo, StrCode) are sent together with the
 * snake_case keys this controller already uses (prp_code, year_no, str_code).
 * If your backend reads only one style, delete the other here — this is the single place.
 */
export const scopePayload = (sc: Scope, action?: string) => ({
  prptype: sc.prpType, PrpCode: 'MT', YearNo: sc.yearNo, StrCode: sc.store,
  // prp_type: sc.prpType, prp_code: sc.prpCode, year_no: sc.yearNo, str_code: sc.store,
  txntype: TXN_TYPE,
  ...(action ? { action } : {}),
});
export class ApiError extends Error { }
const headers = (token: string) => ({ Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' });
/** First readable text inside any API shape: "text", ["text"], { message }, { field: ["text"] } (Laravel validation). */
const firstText = (v: any): string => {
  if (v === null || v === undefined) return '';
  if (typeof v === 'string') { const t = v.trim(); return t === 'true' || t === 'false' ? '' : t; }
  if (Array.isArray(v)) { for (const x of v) { const t = firstText(x); if (t) return t; } return ''; }
  if (typeof v === 'object') {
    for (const k of ['message', 'Message', 'msg', 'error_message']) { const t = firstText(v[k]); if (t) return t; }
    for (const x of Object.values(v)) { const t = firstText(x); if (t) return t; }
  }
  return '';
};
/** The message the SERVER sent (success or error) — shown to the user as-is. */
export const serverMessage = (d: any): string =>
  firstText(d?.message) || firstText(d?.Message) || firstText(d?.msg) || firstText(d?.response?.message) || firstText(d?.errors) || firstText(d?.error);
const messageOf = (e: any, fallback: string) =>
  e instanceof ApiError ? e.message
    : serverMessage(e?.response?.data) || (e?.request && !e?.response ? 'Network problem. Please check your internet connection and try again.' : e?.message) || fallback;
const s = (v: any) => v === null || v === undefined ? '' : String(v);
const truthy = (v: any) => v === true || v === 1 || v === '1' || v === 'Y' || v === 'y' || v === 'true';
// Laravel wraps the payload as { success, response: {...}, message }; older routes use data / Data.
const bodyData = (res: any) => res?.data?.response ?? res?.data?.data ?? res?.data?.Data ?? res?.data ?? {};
/** Drop blank ids and repeated ids (the HSN list starts with a blank row; GST repeats ids). */
const uniq = (list: any[]): Opt[] => { const seen = new Set<string>(); return (list ?? []).map(opt).filter((o) => o.id !== '' && !seen.has(o.id) && !!seen.add(o.id)); };
const isFlag = (v: any) => v === true || v === 'true' || v === 1 || v === '1';
/** error:true / success:false (also inside `response` / `data`) → throw the server's own message. */
const assertOk = (res: any) => {
  const d = res?.data;
  const failed = d?.success === false || d?.status === false || isFlag(d?.error) || isFlag(d?.response?.error) || isFlag(d?.data?.error) || d?.response?.success === false;
  if (failed) throw new ApiError(serverMessage(d) || 'The server rejected the request.');
};
// Normalize the actual Laravel/legacy lookup keys to the SelectField contract.
// The API does not return generic `Code` / `Name` for most lists.
const opt = (x: any): Opt => ({
  id: s(
    x?.id ?? x?.Code ?? x?.code ??
    x?.ItmGrp ?? x?.ItmSGrp ?? x?.UOMCode ??
    x?.HsnCode ?? x?.GSTGrpCode ?? x?.Status ?? x?.StrLoc
  ),
  label: s(
    x?.label ?? x?.Name ?? x?.name ??
    x?.IGName ?? x?.ISGName ?? x?.LngName ??
    x?.HsnName ?? x?.GrpName ?? x?.StatusName ??
    x?.LctName ?? x?.StrLoc
  ),
});
const get = (API: string, token: string, endpoint: string, params: any = {}) => axios.get(`${API}${endpoint}`, { params, headers: headers(token) });
const post = (API: string, token: string, endpoint: string, body: any) => axios.post(`${API}${endpoint}`, body, { headers: headers(token) });

// PHP response fields are snake_case; the adapters also accept DB-style keys for safety.
const toMake = (r: any, i: number): ItemMake => ({
  ...emptyMake(),
  // Keep the full API row; save uses its keys to include fields not displayed in the UI.
  apiFields: { ...r },

  // Make/model row ID
  id: s(r.item_code || r.ItmCode || r.MakSrNo || r.make_srno || r.SrNo || `make-${i}`),

  // Make & model mapping
  makeCode: s(r.make_code || r.MakCode),
  makeName: s(r.make_name || r.MakName || r.MakNameJ),
  model: s(r.model || r.Model || r.ModelJ),
  shortName: s(r.short_name || r.ShtName),

  // Stock levels
  roLevel: s(r.ro_level ?? r.ROLevel),
  roQty: s(r.ro_qty ?? r.ROQty),
  opQty: s(r.op_qty ?? r.OpQty),
  opRate: s(r.op_rate ?? r.OpRate),
  surplusLevel: s(r.surplus_level ?? r.SurplusLevel),

  // Rates
  rate1: s(r.rate1 ?? r.LastRate),
  rate2: s(r.rate2 ?? r.PRate1),
  rate3: s(r.rate3 ?? r.PRate2),
  rate4: s(r.rate4 ?? r.PRate3),
  saleRate: s(r.sale_rate ?? r.SLRate),

  // Other fields
  location: s(r.store_loc ?? r.StrLoc),
  inwardExtraQtyPct: s(r.inward_extra_perc ?? r.OLPerc),
  inwardExtraQty: s(r.inward_extra_qty ?? r.OLQty),
  shift: s(r.shift ?? r.Shift ?? r.ShfCode),
  dead: truthy(r.is_dead ?? r.IsDead),
  status: s(r.status || r.Status) || 'A',
});

export type MakeModelOption = {
  makeCode: string;
  makeName: string;
  model: string;
  makeSrNo: number;
};

export async function fetchMakeModels(
  API: string,
  token: string,
  sc: Scope,
): Promise<MakeModelOption[]> {
  try {
    const res = await get(API, token, ENDPOINTS.browse, {
      ...scopePayload(sc, 'browse_data'),
      type: 'makes',
      search: '',
      page: 1,
      per_page: 200,
    });

    assertOk(res);

    const d = bodyData(res);
    // Support both { makes: [...] } and a direct array response.
    // bodyData() already unwraps Laravel's { response: {...} } envelope.
    const rows: any[] = Array.isArray(d)
      ? d
      : Array.isArray(d?.makes)
        ? d.makes
        : Array.isArray(d?.response?.makes)
          ? d.response.makes
          : Array.isArray(d?.data?.makes)
            ? d.data.makes
            : [];

    return rows.map((r: any) => ({
      makeCode: s(r.make_code ?? r.MakCode),
      makeName: s(r.make_name ?? r.MakName ?? r.MakNameJ),
      model: s(r.model ?? r.Model ?? r.ModelJ),
      makeSrNo: Number(r.make_srno ?? r.MakSrNo ?? r.SrNo) || 0,
    }));
  } catch (e) {
    throw new ApiError(
      messageOf(e, 'Could not load Make/Model options.'),
    );
  }
}

const toItem = (r: any, sc: Scope): StoreItem => ({
  // Retain every original show-data key outside `makes` for add/modify payloads.
  apiFields: { ...r },
  prpType: s(r.prp_type ?? r.prptype ?? r.PrpType) || sc.prpType,
  prpCode: s(r.prp_code ?? r.PrpCode) || sc.prpCode,
  yearNo: s(r.year_no ?? r.YearNo) || sc.yearNo,
  store: s(r.str_code ?? r.StrCode) || sc.store, code: s(r.ItmCode ?? r.MItmCode), mItmCode: s(r.MItmCode ?? r.ItmCode), name: s(r.item_name ?? r.ItmName),
  groupId: s(r.group_code ?? r.ItmGrp), subGroupId: s(r.sub_group_code ?? r.ItmSGrp), purchaseUom: s(r.purchase_uom ?? r.PUOM), salesUom: s(r.sales_uom ?? r.UOM),
  hsn: s(r.hsn_code ?? r.HsnCode), gst: s(r.gst_group_code ?? r.GSTGrpCode), stopInward: truthy(r.stop_inward ?? r.StopIn), stopIssue: truthy(r.stop_issue ?? r.StopIss),
  makes: (r.makes ?? r.Makes ?? []).map(toMake),
});
const toBrowseRow = (r: any, i: number): BrowseRow => ({
  key: `${s(r.ItmCode ?? r.itmcode ?? r.code ?? r.MItmCode)}-${s(r.MItmCode)}-${i}`,
  // Browse shows ItmCode; MItmCode is kept separately for the show-data call.
  store: s(r.str_code ?? r.StrCode), code: s(r.ItmCode ?? r.itmcode ?? r.code ?? r.MItmCode),
  mItmCode: s(r.MItmCode ?? r.mitmcode ?? r.ItmCode ?? r.itmcode ?? r.code),
  name: s(r.item_name ?? r.ItmName ?? r.itmname ?? r.name),
  uom: s(r.uom ?? r.UOM ?? r.PUOM), group: s(r.group_name ?? r.GroupName ?? r.IGName ?? r.itmgrp),
  subGroup: s(r.sub_group_name ?? r.SubGroupName ?? r.ISGName),
  rate: toNum(r.rate ?? r.Rate ?? r.LastRate ?? r.last_rate), location: s(r.location ?? r.StrLoc),
  apiData: r && typeof r === 'object' ? { ...r } : {},
});
const safeDefaultForApiValue = (value: any) => {
  if (typeof value === 'number') return 0;
  if (typeof value === 'string') return '';
  if (typeof value === 'boolean') return false;
  return '';
};

/**
 * Value sent for a field that is no longer shown on the screen: the data type of the
 * loaded show-data value decides it — string -> '' (blank), number -> 0.
 * When the record has no such key yet (Add), `fallback` (blank '' or 0) is used.
 */
const blankByType = (src: Record<string, any> | undefined, keys: string[], fallback: any) => {
  for (const k of keys) {
    const v = src?.[k];
    if (v === null || v === undefined) continue;
    if (typeof v === 'number') return 0;
    if (typeof v === 'string') return '';
    if (typeof v === 'boolean') return false;
  }
  return fallback;
};

const toPayload = (it: StoreItem, deletedMakes: string[] = []) => {
  const topLevelDefaults: Record<string, any> = {};
  Object.entries(it.apiFields ?? {}).forEach(([key, value]) => {
    if (key !== 'makes' && key !== 'Makes' && key !== 'message') {
      topLevelDefaults[key] = safeDefaultForApiValue(value);
    }
  });

  const mapped: Record<string, any> = {
    // PascalCase keys returned by show-data.
    PrpCode: it.prpCode,
    StrCode: it.store,
    MItmCode: Number(it.mItmCode) || Number(it.code) || 0,
    Category: it.apiFields?.Category == null ? '' : it.apiFields.Category,
    // Removed from the screen -> blank / 0 by data type.
    GSTGrpCode: 0, // GST group is no longer on the screen: always 0
    ItmName: it.name.trim().toUpperCase(),
    PUOM: blankByType(it.apiFields, ['PUOM', 'purchase_uom'], ''),
    UOM: it.salesUom,
    ItmGrp: it.groupId,
    ItmSGrp: blankByType(it.apiFields, ['ItmSGrp', 'sub_group_code'], ''),
    HsnCode: blankByType(it.apiFields, ['HsnCode', 'hsn_code'], ''),
    RawMat: it.apiFields?.RawMat === true || it.apiFields?.RawMat === 1 ? 1 : 0,
    ABCAnal: it.apiFields?.ABCAnal === true || it.apiFields?.ABCAnal === 1 ? 1 : 0,
    FSNAnal: it.apiFields?.FSNAnal === true || it.apiFields?.FSNAnal === 1 ? 1 : 0,
    StopIn: blankByType(it.apiFields, ['StopIn', 'stop_inward'], 0),
    StopIss: blankByType(it.apiFields, ['StopIss', 'stop_issue'], 0),

    // Existing Laravel add-data contract.
    ...scopePayload(scopeOf(it)),
    // ItmCode is the detail/make item code; MItmCode is the parent master code.
    // Keep the parent master code separate instead of duplicating it into ItmCode.
    ItmCode: Number(
      [...(it.makes ?? [])]
        .map((m: any) => Number(m.apiFields?.ItmCode) || 0)
        .find((code: number) => code > 0) || 0
    ),
    item_name: it.name.trim().toUpperCase(),
    group_code: it.groupId,
    sub_group_code: blankByType(it.apiFields, ['sub_group_code', 'ItmSGrp'], ''),
    purchase_uom: blankByType(it.apiFields, ['purchase_uom', 'PUOM'], ''),
    sales_uom: it.salesUom,
    hsn_code: blankByType(it.apiFields, ['hsn_code', 'HsnCode'], ''),
    gst_group_code: 0, // always 0 (same field as GSTGrpCode)
    stop_inward: blankByType(it.apiFields, ['stop_inward', 'StopIn'], 0),
    stop_issue: blankByType(it.apiFields, ['stop_issue', 'StopIss'], 0),
    raw_material: !!it.apiFields?.RawMat,
    abc_analysis: !!it.apiFields?.ABCAnal,
    fsn_analysis: !!it.apiFields?.FSNAnal,
    makes: it.makes.map(m => {
      const defaults: Record<string, any> = {};
      Object.entries(m.apiFields ?? {}).forEach(([key, value]) => { defaults[key] = safeDefaultForApiValue(value); });
      return {
        ...defaults,
        ItmCode: /^new-/.test(m.id) ? 0 : Number(m.apiFields?.ItmCode ?? m.id) || 0,
        // MItmCode belongs to the parent Store Item Master record and must be sent on every make row.
        MItmCode: Number(it.mItmCode) || Number(it.code) || Number(m.apiFields?.MItmCode) || 0,
        MakCode: Number(m.makeCode) || 0,
        MakName: m.makeName || '',
        Model: m.model || '',
        MakSrNo: Number(m.apiFields?.MakSrNo ?? m.apiFields?.make_srno ?? m.apiFields?.SrNo) || 0,
        SrNo: Number(m.apiFields?.SrNo ?? m.apiFields?.MakSrNo ?? m.apiFields?.make_srno) || 0,
        // Short name / Location are no longer captured: blank string goes to the backend.
        ShtName: '',
        StrLoc: '',
        // Backend contract: send a hyphen for Remarks on every make row.
        Remarks: '-',
        Status: (m.status === 'Active' ? 'A' : m.status === 'Passive' ? 'P' : m.status) || 'A',
        IsDead: m.dead ? 1 : 0,
        // R.O. level / R.O. qty are no longer captured: 0 goes to the backend.
        ROLevel: 0, ROQty: 0,
        // Opening rate is no longer captured: blank / 0 by data type.
        OpQty: Number(m.opQty) || 0, OpRate: blankByType(m.apiFields, ['OpRate', 'op_rate'], 0),
        // Inward extra qty (%) / qty are no longer captured: 0 goes to the backend.
        OLPerc: 0, OLQty: 0,
        Shift: m.shift || '', shift: m.shift || '',
        // Surplus level is no longer captured: blank / 0 by data type.
        SurplusLevel: blankByType(m.apiFields, ['SurplusLevel', 'surplus_level'], 0),
        LastRate: Number(m.rate1) || 0, PRate1: Number(m.rate2) || 0,
        PRate2: Number(m.rate3) || 0, PRate3: Number(m.rate4) || 0,
        SLRate: Number(m.saleRate) || 0,
        make_code: Number(m.makeCode) || 0, make_name: m.makeName || '', model: m.model || '',
        make_srno: Number(m.apiFields?.MakSrNo ?? m.apiFields?.make_srno ?? m.apiFields?.SrNo) || 0,
        short_name: '', ro_level: 0,
        ro_qty: 0, op_qty: Number(m.opQty) || 0,
        op_rate: blankByType(m.apiFields, ['op_rate', 'OpRate'], 0), rate1: Number(m.rate1) || 0,
        rate2: Number(m.rate2) || 0, rate3: Number(m.rate3) || 0,
        rate4: Number(m.rate4) || 0, sale_rate: Number(m.saleRate) || 0,
        store_loc: '', inward_extra_perc: 0,
        inward_extra_qty: 0, is_dead: m.dead ? 1 : 0,
        surplus_level: blankByType(m.apiFields, ['surplus_level', 'SurplusLevel'], 0),
        status: (m.status === 'Active' ? 'A' : m.status === 'Passive' ? 'P' : m.status) || 'A',
        contra: Number(m.apiFields?.Contra) || 0,
      };
    }),
    deleted_makes: deletedMakes.map(Number).filter(Boolean),
  };
  return { ...topLevelDefaults, ...mapped };
};

/* ------------------------------------------------------------------ */
/* Property -> Year -> Store                                           */
/*   /api/getproperty  txntype               -> ALL properties        */
/*        rows: PrpCode, LngName (shown), ShtName, PrpOf (= prptype)  */
/*   /api/getyear      prptype (+prpcode)    -> years                 */
/*   /api/getmstore    prpcode + yearno      -> stores                */
/* Response shape: res.data.response.data (list), res.data.response.isauth */
/* ------------------------------------------------------------------ */
export const SCOPE_ENDPOINTS = { property: '/api/getproperty', year: '/api/getyear', store: '/api/getmstore' } as const;

const scopeList = (res: any): any[] => {
  const r = res?.data?.response;
  if (r?.isauth === '_AUTHFAILED') throw new ApiError('Your session has expired. Please log in again.');
  const d = r?.data ?? res?.data?.data ?? [];
  return Array.isArray(d) ? d : [];
};

/** All properties in one call. Label = LngName; `type` = the row's own PrpOf (sent as prptype once chosen). */
export async function fetchProperties(API: string, token: string): Promise<PropertyOpt[]> {
  try {
    const res = await get(API, token, SCOPE_ENDPOINTS.property, { txntype: TXN_TYPE });
    const seen = new Set<string>();
    return scopeList(res)
      .map((x) => ({ id: s(x.PrpCode), label: s(x.LngName) || s(x.ShtName) || s(x.PrpCode), type: s(x.PrpOf) }))
      .filter((o) => o.id && !seen.has(o.id) && !!seen.add(o.id));
  } catch (e) { throw new ApiError(messageOf(e, 'Could not load the property list.')); }
}
export async function fetchYears(API: string, token: string, prpType: string, prpCode = ''): Promise<Opt[]> {
  try {
    const res = await get(API, token, SCOPE_ENDPOINTS.year, { prptype: prpType, ...(prpCode ? { prpcode: prpCode } : {}), txntype: TXN_TYPE });
    return scopeList(res).map((x) => ({ id: s(x.YearNo), label: s(x.YearName) || s(x.YearNo) })).filter((o) => o.id);
  } catch (e) { throw new ApiError(messageOf(e, 'Could not load the year list.')); }
}
/** Stores depend on Property + Year. */
export async function fetchStores(API: string, token: string, prpCode: string, yearNo: string): Promise<Opt[]> {
  if (!prpCode || !yearNo) return [];
  try {
    const res = await get(API, token, SCOPE_ENDPOINTS.store, { prpcode: prpCode, yearno: yearNo, txntype: TXN_TYPE });
    return scopeList(res).map((x) => ({ id: s(x.StrCode), label: s(x.SDesc) || s(x.StrName) || s(x.StrCode) })).filter((o) => o.id);
  } catch (e) { throw new ApiError(messageOf(e, 'Could not load the store list.')); }
}
/**
 * First load — ONE call per list, in order:
 *   getproperty (all properties) -> pick one -> getyear (its prptype + prpcode) -> [getmstore in the screen]
 * Initial property = saved choice, else `defaultPrpCode`, else the first property of the login's type
 * (`prpType` pref), else the first property.
 */
export async function fetchScopeBase(API: string, token: string, pref: Partial<Scope> = {}) {
  const properties = await fetchProperties(API, token);
  if (!properties.length) throw new ApiError('No property is available for this login.');
  const chosen = properties.find((p) => p.id === pref.prpCode)
    || (pref.prpType ? properties.find((p) => p.type === pref.prpType) : undefined)
    || properties[0];
  const years = await fetchYears(API, token, chosen.type, chosen.id);
  const yearNo = years.find((y) => y.id === pref.yearNo)?.id || years[0]?.id || '';
  return { prpType: chosen.type, properties, years, prpCode: chosen.id, yearNo };
}

export async function fetchLookups(API: string, token: string, sc: Scope): Promise<Lookups> {
  try {
    const res = await get(API, token, ENDPOINTS.lookups, { ...scopePayload(sc, 'browse_data'), type: 'lookups' }); assertOk(res); const d = bodyData(res);
    // browse-data?type=lookups  ->  response: { stores, groups, subgroups, uom, hsn, gst, status, locations, rate_editable }
    // (stores are NOT used here: they come from getmstore for the chosen Property + Year)
    const subs = (d.subgroups ?? d.subGroups ?? []) as any[];
    const seenSub = new Set<string>();
    return {
      makes: (Array.isArray(d.makes) ? d.makes : []).map((r: any) => ({
        makeCode: s(r.make_code ?? r.MakCode),
        makeName: s(r.make_name ?? r.MakName ?? r.MakNameJ),
        model: s(r.model ?? r.Model ?? r.ModelJ),
        makeSrNo: Number(r.make_srno ?? r.MakSrNo ?? r.SrNo) || 0,
      })),
      groups: uniq(d.groups),                                   // id, label            -> Item group
      subGroups: subs.map((x) => ({ ...opt(x), groupId: s(x.group_code ?? x.groupId ?? x.ItmGrp) }))
        .filter((o) => o.id !== '' && !seenSub.has(`${o.groupId}|${o.id}`) && !!seenSub.add(`${o.groupId}|${o.id}`)), // id, label, group_code -> Item sub group (filtered by group)
      uoms: uniq(d.uom ?? d.uoms),                              // id (NOS), label      -> Purchase UOM / Sales UOM
      hsn: uniq(d.hsn),                                         // id, label (HSN no.)  -> HSN code
      gst: uniq(d.gst),                                         // id, label            -> GST group
      status: uniq(d.status),                                   // A / P                -> make status text
      locations: uniq(
        (d.locations ?? []).map((x: any) => ({
          id: x.StrLoc ?? x.id ?? x.Code ?? x.code,
          label: x.LctName ?? x.label ?? x.Name ?? x.name,
        }))
      ),                        // id, label            -> make Location
      rateEditable: d.rate_editable === true || d.rate_editable === 1 || d.rate_editable === '1',
    };
  } catch (e) { throw new ApiError(messageOf(e, 'Could not load item dropdowns.')); }
}
/**
 * "Show" call with ItmCode = 0 — asks the backend for the NEXT item code of the current
 * Property / Year / Store (Color Item Master does the same on every scope change).
 * Returns '' when the scope is incomplete or the server sends no code.
 */
export async function fetchNextCode(API: string, token: string, sc: Scope): Promise<string> {
  if (!scopeReady(sc)) return '';
  try {
    const res = await get(API, token, ENDPOINTS.item, { ...scopePayload(sc, 'show_data'), MItmCode: 0 }); assertOk(res);
    const d = bodyData(res); const r = Array.isArray(d) ? d[0] : (d.item ?? d);
    const code = s(r?.ItmCode ?? r?.MItmCode ?? r?.ItmCode ?? r?.next_code ?? r?.code);
    return code && code !== '0' ? code : '';
  } catch (e) { throw new ApiError(messageOf(e, 'Could not get the next item code.')); }
}
export async function fetchBrowse(API: string, token: string, sc: Scope): Promise<BrowseRow[]> {
  try { const res = await get(API, token, ENDPOINTS.browse, { ...scopePayload(sc, 'browse_data'), type: 'items', page: 1, per_page: 200 }); assertOk(res); const d = bodyData(res); const list = Array.isArray(d) ? d : (d?.items ?? d?.data ?? d?.main ?? d?.rows ?? []); return (Array.isArray(list) ? list : []).map(toBrowseRow); }
  catch (e) { throw new ApiError(messageOf(e, 'Could not load the item list.')); }
}
export async function fetchItem(API: string, token: string, sc: Scope, code: string): Promise<StoreItem> {
  try { const res = await get(API, token, ENDPOINTS.item, { ...scopePayload(sc, 'show_data'), MItmCode: Number(code) }); assertOk(res); const d0 = bodyData(res); const d = Array.isArray(d0) ? d0[0] : (d0?.item ?? d0); if (!d || !(d.ItmCode ?? d.MItmCode)) throw new ApiError(`Item ${code} was not found.`); return toItem(d, sc); }
  catch (e) { throw new ApiError(messageOf(e, 'Could not open the item.')); }
}
export type SaveResult = { item: StoreItem; message: string };
export async function saveItem(API: string, token: string, mode: Mode, item: StoreItem, deletedMakes: string[] = []): Promise<SaveResult> {
  try {
    // Make/model and makeSrNo are selected from the cached lookups loaded with type=lookups.
    // Do not make a separate type=makes request during save.
    const resolvedMakes = item.makes.map((m) => {
      if (!m.makeCode || !m.makeName.trim()) throw new ApiError('Select a valid Make name.');
      return { ...m, makeSrNo: Number(m.makeSrNo) || 0 };
    });
    const payload: any = { ...toPayload({ ...item, makes: resolvedMakes }, deletedMakes), ...scopePayload(scopeOf(item), mode === 'add' ? 'add_data' : 'modify_data') };
    payload.makes = payload.makes.map((m: any, i: number) => ({ ...m, make_srno: resolvedMakes[i].makeSrNo }));
    const endpoint = mode === 'add' ? ENDPOINTS.add : ENDPOINTS.modify;
    const res = await post(API, token, endpoint, payload);
    assertOk(res);
    const d = bodyData(res);
    const message = serverMessage(res.data);
    return { message, item: d && (d.ItmCode ?? d.MItmCode) ? toItem(d, scopeOf(item)) : { ...item, code: s(d?.ItmCode ?? item.code) } };
  } catch (e) { throw new ApiError(messageOf(e, 'Could not save the item.')); }
}
/** Resolves with the server's success message ('' when it sent none). */
export async function deleteItem(API: string, token: string, sc: Scope, code: string): Promise<string> {
  try { const res = await post(API, token, ENDPOINTS.remove, { ...scopePayload(sc, 'delete_data'), MItmCode: Number(code) }); assertOk(res); return serverMessage(res.data); }
  catch (e) { throw new ApiError(messageOf(e, 'Could not delete the item.')); }
}

/* ------------------------------------------------------------------ */
/* Make / Model MASTER  (global DAPMake records — NOT the item's rows)  */
/*   GET  make-model-master/browse-data  -> list of make/model rows     */
/*   GET  make-model-master/show-data    -> MakCode = 0 -> empty record */
/*   POST make-model-master/add-data | modify-data | delete-data        */
/* Same idea as Color Item Master's inline masters (Fibre, UOM, ...):   */
/* one dialog = add / rename / delete + a browse list, refreshed after  */
/* every write.                                                         */
/* ------------------------------------------------------------------ */
export const MAKE_MASTER_ENDPOINTS = {
  browse: '/api/make-model-master/browse-data',
  show: '/api/make-model-master/show-data',
  add: '/api/make-model-master/add-data',
  modify: '/api/make-model-master/modify-data',
  remove: '/api/make-model-master/delete-data',
} as const;
/** txntype sent with the make/model master calls. Change here if your backend expects another value. */
export const MAKE_TXN_TYPE = 'store_item_master';

/** One row of the make master = one Make + one Model (DAPMake composite key: MakCode + SrNo). */
export type MakeMasterRow = { key: string; makeCode: string; makeName: string; shortName: string; status: string; model: string; srNo: number };
export type MakeMasterInput = {
  makeCode: string; makeName: string; shortName?: string; status?: string; model: string; srNo: number;
  /** Several models of the SAME make in one save (add-data). When given, `model` / `srNo` mirror the first entry. */
  models?: Array<{ model: string; srNo: number }>;
};

const toMakeMasterRows = (r: any, i: number): MakeMasterRow[] => {
  // Some backends return one row per make with a nested models list — flatten it.
  const nested = r?.models ?? r?.Models;
  if (Array.isArray(nested)) {
    return nested.flatMap((m: any, j: number) => toMakeMasterRows({ ...r, ...m, models: undefined, Models: undefined }, i * 1000 + j));
  }
  const makeCode = s(r?.make_code ?? r?.MakCode ?? r?.makeCode);
  const srNo = Number(r?.make_srno ?? r?.MakSrNo ?? r?.SrNo ?? r?.srno ?? r?.sr_no) || 0;
  return [{
    key: `${makeCode}-${srNo}-${i}`,
    makeCode,
    makeName: s(r?.make_name ?? r?.MakName ?? r?.MakNameJ ?? r?.makeName),
    shortName: s(r?.short_name ?? r?.ShtName ?? r?.shortName),
    status: s(r?.status ?? r?.Status) || 'A',
    model: s(r?.model ?? r?.Model ?? r?.ModelJ),
    srNo,
  }];
};
/** Dropdown option shape used by MakeSheet. */
export const toMakeOption = (r: MakeMasterRow): MakeModelOption => ({ makeCode: r.makeCode, makeName: r.makeName, model: r.model, makeSrNo: r.srNo });

// Delete from the Makes grid: backend needs only the make code + scope/action.
const makespayload = (sc: Scope, action: string, m: MakeMasterInput) => ({
  ...scopePayload(sc, action),
  txntype: MAKE_TXN_TYPE,
  MakCode: Number(m.makeCode) || 0,
});

// Delete a model from the model dropdown: backend needs the make and model keys only.
const modelMasterPayload = (sc: Scope, action: string, m: MakeMasterInput) => ({
  ...scopePayload(sc, action),
  txntype: MAKE_TXN_TYPE,
  MakCode: Number(m.makeCode) || 0,
  MakName: m.makeName.trim().toUpperCase(),
  SrNo: Number(m.srNo) || 0,
});

const makeMasterPayload = (sc: Scope, action: string, m: MakeMasterInput) => ({
  ...scopePayload(sc, action),
  txntype: MAKE_TXN_TYPE,
  // PascalCase (DB style) + snake_case (controller style) — same approach as the Store Item payload.
  MakCode: Number(m.makeCode) || 0,
  MakName: m.makeName.trim().toUpperCase(),
  ShtName: (m.shortName ?? '').trim().toUpperCase(),
  Status: m.status || 'A',
  Model: m.model.trim().toUpperCase(),
  SrNo: Number(m.srNo) || 0,
  MakSrNo: Number(m.srNo) || 0,
  make_code: Number(m.makeCode) || 0,
  make_name: m.makeName.trim().toUpperCase(),
  short_name: (m.shortName ?? '').trim().toUpperCase(),
  status: m.status || 'A',
  model: m.model.trim().toUpperCase(),
  make_srno: Number(m.srNo) || 0,
  // ARRAY of model objects (same keys as the show-data `models` object): one object per model, all under this MakCode.
  models: (m.models && m.models.length ? m.models : [{ model: m.model, srNo: m.srNo }]).map((x) => ({
    PrpCode: (scopePayload(sc, action) as any).PrpCode,
    MakCode: Number(m.makeCode) || 0,
    SrNo: Number(x.srNo) || 0,
    Model: (x.model ?? '').trim().toUpperCase(),
  })),
});

/** Whole make/model list (browse-data). Pages until the server stops returning new rows. */
export async function fetchMakeMasterList(API: string, token: string, sc: Scope): Promise<MakeMasterRow[]> {
  try {
    const res = await get(API, token, MAKE_MASTER_ENDPOINTS.browse, { ...scopePayload(sc, 'browse_data'), txntype: MAKE_TXN_TYPE, search: '', page: 1, per_page: 50000 });
    assertOk(res);
    const d = bodyData(res);
    // The supplied API returns separate `makes` and `models` arrays.
    if (d && !Array.isArray(d) && Array.isArray(d.makes)) {
      const makes: any[] = d.makes;
      const models: any[] = Array.isArray(d.models) ? d.models : [];
      return makes.flatMap((mk: any, i: number) => {
        const code = s(mk?.MakCode ?? mk?.make_code ?? mk?.makeCode);
        const related = models.filter((m: any) => String(m?.MakCode ?? m?.make_code ?? m?.makeCode) === code);
        const common = { makeCode: code, makeName: s(mk?.MakName ?? mk?.make_name ?? mk?.makeName), shortName: s(mk?.ShtName ?? mk?.short_name ?? mk?.shortName), status: s(mk?.Status ?? mk?.status) || 'A' };
        if (!related.length) return [{ key: `${code}-0-${i}`, ...common, model: '', srNo: 0 }];
        return related.map((m: any, j: number) => ({ key: `${code}-${Number(m?.SrNo ?? m?.srno ?? 0)}-${i}-${j}`, ...common, model: s(m?.Model ?? m?.model ?? m?.ModelJ), srNo: Number(m?.SrNo ?? m?.srno ?? m?.sr_no) || 0 }));
      });
    }
    const raw: any[] = Array.isArray(d) ? d : d?.items ?? d?.rows ?? d?.data ?? [];
    return (Array.isArray(raw) ? raw : []).flatMap(toMakeMasterRows);
  } catch (e) { throw new ApiError(messageOf(e, 'Could not load the make / model list.')); }
}

/** SHOW with MakCode = 0 -> next make code ('' when the server does not send one; add-data then assigns it). */
export async function fetchMakeMasterNextCode(API: string, token: string, sc: Scope): Promise<string> {
  const pick = (d: any) => {
    const r = Array.isArray(d) ? d[0] : (d?.make ?? d?.item ?? d);
    const c = s(r?.MakCode ?? r?.make_code ?? r?.next_code ?? r?.code);
    return c && c !== '0' ? c : '';
  };
  try {
    const res = await get(API, token, MAKE_MASTER_ENDPOINTS.show, { ...makeMasterPayload(sc, 'show_data', { makeCode: '0', makeName: '', model: '', srNo: 0 }) });
    assertOk(res);
    return pick(bodyData(res));
  } catch (e) { throw new ApiError(messageOf(e, 'Could not get the next make code.')); }
}

/** Add a make (next MakCode, SrNo 1) or a new model under an existing make (its MakCode, SrNo = last + 1). Resolves with the server message. */
export async function addMakeMaster(API: string, token: string, sc: Scope, m: MakeMasterInput): Promise<string> {
  try { const res = await post(API, token, MAKE_MASTER_ENDPOINTS.add, makeMasterPayload(sc, 'add_data', m)); assertOk(res); return serverMessage(res.data); }
  catch (e) { throw new ApiError(messageOf(e, 'Could not add the make.')); }
}
export async function modifyMakeMaster(API: string, token: string, sc: Scope, m: MakeMasterInput): Promise<string> {
  try { const res = await post(API, token, MAKE_MASTER_ENDPOINTS.modify, makeMasterPayload(sc, 'modify_data', m)); assertOk(res); return serverMessage(res.data); }
  catch (e) { throw new ApiError(messageOf(e, 'Could not update the make.')); }
}
export async function deleteMakeMaster(API: string, token: string, sc: Scope, m: MakeMasterInput): Promise<string> {
  try { const res = await post(API, token, MAKE_MASTER_ENDPOINTS.remove, makespayload(sc, 'delete_data', m)); assertOk(res); return serverMessage(res.data); }
  catch (e) { throw new ApiError(messageOf(e, 'Could not delete the make.')); }
}

export async function deleteModelMaster(API: string, token: string, sc: Scope, m: MakeMasterInput): Promise<string> {
  try { const res = await post(API, token, MAKE_MASTER_ENDPOINTS.remove, modelMasterPayload(sc, 'delete_data', m)); assertOk(res); return serverMessage(res.data); }
  catch (e) { throw new ApiError(messageOf(e, 'Could not delete the model.')); }
}

// Mock implementation intentionally removed from the active adapter; all actions use Laravel endpoints.
