// FILE: src/components/WarehouseNEW/api.ts
// Every HTTP call of the Warehouse module. Same URL paths, methods, headers,
// body/query keys (and key ORDER), value sources and response paths as legacy:
//   components/components/Warehouse/WarehouseCriteriaScreen.tsx
//   components/components/Warehouse/WarehouseAssignScreen.tsx
//   components/components/Warehouse/WarehouseTransferScreen.tsx
//   components/components/Warehouse/WarehouseViewScreen.tsx
//   common/API/Functions.ts            (fetchPropertyData, fetchAllStoredata)
//   common/API/mobileUserPreferenceApi + hooks/useMobileUserPreference
// Only difference: the host comes from the `API` prop and the bearer from the
// `token` prop (legacy: global `API` import / `initAPI()`).
//
// Endpoints
//   GET  /api/getproperty                    params: null
//        -> res.data.response.data (when res.data.success && length > 0), cached to AsyncStorage 'get_property'
//   GET  /api/getstore                       params { prpcode, yearno:'', txntype:'', prptype }
//        -> res.data.response.data | res.data.data | res.data (first array)
//   POST /api/mobile-user-preference/get     { UserId, ModuleCode, ScreenCode }
//        -> res.data.data.PreferenceJson (when res.data.status; JSON-parsed if string)
//   POST /api/mobile-user-preference/save    { UserId, ModuleCode, ModuleName, ScreenCode, ScreenName, CriteriaName, PreferenceJson, IsDefault }
//   POST /api/prodwarehouselocations         { yearno, savereportsettings, settingsname, schedtype, rptid, rptaction, prptype, prpcodes, strcode, stocktype, inverse, extravalidate }
//        -> res.data.data.prodwarehouselocations
//   GET  /api/get_criterion                  params { prpcode, strcode, yearno, txntype, prptype:'R', limit, strcodes, issdate, fetch }
//        -> res.data.response.data | res.data.response | res.data.data
//        (legacy only called this from the Item/Merge/Grade/Shade "Selected" radio rows,
//         which are commented out in the legacy JSX — ported here for parity, not wired to UI)
//   POST /api/getcartondetail                { PrpCode, StrCode, YearNo, GrdCode, ItmCode, MerCode, ShdCode, limit, page, search, selectedcarton, ttype, txntype, type }
//        -> res.data.response.data | res.data.response.results
//   POST /api/master_crud                    { PrpCode, StrCode, YearNo, txntype, action:'browse_data', fetch, module }
//        -> res.data.data.prodwarehouselocations | res.data.response.data | res.data.data | res.data.results
//   POST /api/prodwarehousemanage  action 'view'      (View screen + Transfer "LOAD DATA")  -> res.data.data | res.data.results
//   POST /api/prodwarehousemanage  action 'assign'    (Assign save)   -> res.data.success / res.data.message
//   POST /api/prodwarehousemanage  action 'transfer'  (Transfer save) -> res.data.success / res.data.message
//
// AsyncStorage keys: 'user_prptype' (read), 'get_property' (read + write).
//
// Not ported: legacy `warehouseApi` (services/warehouseApi.js). Its only live
// call, `getCriteriaMaster()`, does `API.get(...)` on the host STRING, which
// throws a TypeError that legacy swallowed in a try/catch — i.e. no request
// was ever sent. The other five methods were never called.
import AsyncStorage from '@/common/utils/compatibleStorage';
import axios from 'axios';
import { getCurrentFinancialYear, Row } from './model';

const TXNTYPE = 'production_warehouse_locations';

/** Legacy getRequestConfig() of all four Warehouse screens. */
const jsonHeaders = (token: string) => ({
  Authorization: `Bearer ${token}`,
  'Content-Type': 'application/json',
  Accept: 'application/json',
  'x-platform': 'mob',
});

/* ------------------------------------------------------------------ */
/* Criteria masters                                                     */
/* ------------------------------------------------------------------ */

/** GET /api/getproperty — legacy fetchPropertyData (never throws, [] on failure). */
export async function fetchPropertyData(API: string, token: string): Promise<Row[]> {
  try {
    await AsyncStorage.getItem('get_property');
    const params: any = null;
    const response = await axios.get(`${API}/api/getproperty`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/javascript',
        Accept: 'application/json',
      },
      params,
    });
    if (response.data.success && response.data.response.data.length > 0) {
      const propertyData = response.data.response.data;
      await AsyncStorage.setItem('get_property', JSON.stringify(propertyData));
      return propertyData;
    }
    return [];
  } catch (error) {
    if (!axios.isCancel(error)) console.log('[WarehouseNEW] fetchPropertyData error', error);
    return [];
  }
}

/** GET /api/getstore — legacy fetchAllStoredata(token, prpcode) (never throws, [] on failure). */
export async function fetchAllStoredata(API: string, token: string, prp: any = '', yrno = '', txn = ''): Promise<Row[]> {
  const userPtype = await AsyncStorage.getItem('user_prptype');
  try {
    const params = {
      prpcode: prp,
      yearno: yrno,
      txntype: txn,
      prptype: userPtype,
    };
    const response = await axios.get(`${API}/api/getstore`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/javascript',
        Accept: 'application/json',
        'x-platform': 'mob',
      },
      params,
    });
    let data: Row[] = [];
    if (response.data?.response?.data && Array.isArray(response.data.response.data)) {
      data = response.data.response.data;
    } else if (response.data?.data && Array.isArray(response.data.data)) {
      data = response.data.data;
    } else if (Array.isArray(response.data)) {
      data = response.data;
    }
    return data;
  } catch (error) {
    if (!axios.isCancel(error)) console.log('[WarehouseNEW] fetchAllStoredata error', error);
    return [];
  }
}

/* ------------------------------------------------------------------ */
/* Saved criteria (mobile user preference)                              */
/* legacy useMobileUserPreference({ UserId: userid || 0, ModuleCode:    */
/*   'WAREHOUSE', ModuleName:'Warehouse', ScreenCode:'WAREHOUSE',       */
/*   ScreenName:'Warehouse', token })                                   */
/* ------------------------------------------------------------------ */

const PREF = { ModuleCode: 'WAREHOUSE', ModuleName: 'Warehouse', ScreenCode: 'WAREHOUSE', ScreenName: 'Warehouse' };

/** POST /api/mobile-user-preference/get — legacy loadDefaultPreference(). Throws on HTTP error. */
export async function loadDefaultPreference(API: string, token: string, userid: any): Promise<any> {
  const response = await axios.post(
    `${API}/api/mobile-user-preference/get`,
    {
      UserId: Number(userid || 0),
      ModuleCode: PREF.ModuleCode,
      ScreenCode: PREF.ScreenCode,
    },
    { headers: jsonHeaders(token) },
  );
  if (response.data.status) {
    let pref = response.data.data?.PreferenceJson;
    if (typeof pref === 'string') {
      try {
        pref = JSON.parse(pref);
      } catch (e) {
        console.log('[WarehouseNEW] PreferenceJson parse error', e);
      }
    }
    return pref;
  }
  return null;
}

/** POST /api/mobile-user-preference/save — legacy savePreference({ CriteriaName:'Default', IsDefault:true, PreferenceJson }). */
export async function saveDefaultPreference(API: string, token: string, userid: any, PreferenceJson: any) {
  const response = await axios.post(
    `${API}/api/mobile-user-preference/save`,
    {
      UserId: Number(userid || 0),
      ModuleCode: PREF.ModuleCode,
      ModuleName: PREF.ModuleName,
      ScreenCode: PREF.ScreenCode,
      ScreenName: PREF.ScreenName,
      CriteriaName: 'Default',
      PreferenceJson,
      IsDefault: true,
    },
    { headers: jsonHeaders(token) },
  );
  return response.data;
}

/* ------------------------------------------------------------------ */
/* Criteria -> dashboard                                                */
/* ------------------------------------------------------------------ */

/** The report payload legacy posted AND stored as the saved preference `criteria`. */
export function buildPreviewPayload(userPtype: any, prpcode: any, strcode: any, stockType: any) {
  return {
    yearno: getCurrentFinancialYear(),
    savereportsettings: 0,
    settingsname: '',
    schedtype: '',
    rptid: 501,
    rptaction: 'rpt_gateway',
    prptype: userPtype,
    prpcodes: prpcode,
    strcode: strcode,
    stocktype: stockType,
    inverse: [] as any[],
    extravalidate: {},
  };
}

/** POST /api/prodwarehouselocations -> res.data.data.prodwarehouselocations */
export async function fetchWarehouseLocations(API: string, token: string, payload: Row): Promise<any> {
  console.log('[WarehouseNEW] prodwarehouselocations ->', payload);
  const res = await axios.post(`${API}/api/prodwarehouselocations`, payload, {
    headers: jsonHeaders(token),
    params: undefined,
    cancelToken: undefined,
  });
  return res?.data?.data?.prodwarehouselocations || [];
}

/** GET /api/get_criterion — legacy loadSelectionData(type) ('itm' | 'mer' | 'grd' | 'shd'). */
export async function fetchCriterion(
  API: string,
  token: string,
  prpcode: any,
  strcode: any,
  type: 'itm' | 'mer' | 'grd' | 'shd',
): Promise<Row[]> {
  const payload = {
    prpcode: prpcode,
    strcode: strcode,
    yearno: getCurrentFinancialYear(),
    txntype: TXNTYPE,
    prptype: 'R',
    limit: '',
    strcodes: '',
    issdate: '',
    fetch: type,
  };
  const res = await axios.get(`${API}/api/get_criterion`, {
    headers: jsonHeaders(token),
    params: { ...payload },
    cancelToken: undefined,
  });
  return res?.data?.response?.data || res?.data?.response || res?.data?.data || [];
}

/* ------------------------------------------------------------------ */
/* Assign                                                               */
/* ------------------------------------------------------------------ */

/** POST /api/getcartondetail (Assign "LOAD DATA") -> res.data.response.data | .results */
export async function fetchAssignCartons(API: string, token: string, criteria: Row): Promise<Row[]> {
  const payload = {
    PrpCode: criteria.prpcode,
    StrCode: criteria.strcode,
    YearNo: getCurrentFinancialYear(),
    GrdCode: '',
    ItmCode: '',
    MerCode: '',
    ShdCode: '',
    limit: '',
    page: '',
    search: '',
    selectedcarton: [] as any[],
    ttype: ['8', '3', '30', '2', '34', '32', '83', '994', '992'],
    txntype: TXNTYPE,
    type: 'S',
  };
  const res = await axios.post(`${API}/api/getcartondetail`, payload, { headers: jsonHeaders(token) });
  const rows = res?.data?.response?.data || res?.data?.response?.results || [];
  return Array.isArray(rows) ? rows : [];
}

/** POST /api/prodwarehousemanage action 'assign' — returns res.data (success / message). */
export async function saveAssign(API: string, token: string, criteria: Row, location: Row, selectedRows: Row[]): Promise<any> {
  const payload = {
    prpcode: criteria.prpcode,
    strcode: criteria.strcode,
    yearno: getCurrentFinancialYear(),
    itmcode: '',
    txntype: TXNTYPE,
    selectedcartons: selectedRows,
    fromlocationdetail: [location],
    tolocationdetail: [] as any[],
    action: 'assign',
  };
  console.log('[WarehouseNEW] assign save payload', payload);
  const res = await axios.post(`${API}/api/prodwarehousemanage`, payload, { headers: jsonHeaders(token) });
  return res?.data;
}

/* ------------------------------------------------------------------ */
/* View + Transfer                                                      */
/* ------------------------------------------------------------------ */

/** POST /api/prodwarehousemanage action 'view' (View screen load, Transfer "LOAD DATA"). */
export async function fetchLocationCartons(API: string, token: string, criteria: Row, location: Row): Promise<Row[]> {
  const userPtype = await AsyncStorage.getItem('user_prptype');
  const payload = {
    prpcode: criteria.prpcode,
    strcode: criteria.strcode,
    yearno: getCurrentFinancialYear(),
    itmcode: '',
    txntype: TXNTYPE,
    selectedcartons: [] as any[],
    fromlocationdetail: [location],
    tolocationdetail: [] as any[],
    action: 'view',
    prptype: userPtype,
  };
  const res = await axios.post(`${API}/api/prodwarehousemanage`, payload, { headers: jsonHeaders(token) });
  const rows = res?.data?.data || res?.data?.results || [];
  return Array.isArray(rows) ? rows : [];
}

/** POST /api/master_crud browse_data — "To Location" list (the from-location is filtered out). */
export async function fetchToLocations(API: string, token: string, criteria: Row, location: Row): Promise<Row[]> {
  await AsyncStorage.getItem('user_prptype');
  const payload = {
    PrpCode: criteria.prpcode,
    StrCode: criteria.strcode,
    YearNo: getCurrentFinancialYear(),
    txntype: TXNTYPE,
    action: 'browse_data',
    fetch: 'production_warehouse_location_master',
    module: 'production_warehouse_location_master',
  };
  const res = await axios.post(`${API}/api/master_crud`, payload, { headers: jsonHeaders(token) });
  const rows =
    res?.data?.data?.prodwarehouselocations ||
    res?.data?.response?.data ||
    res?.data?.data ||
    res?.data?.results ||
    [];
  return Array.isArray(rows)
    ? rows.filter(
        (item: Row) =>
          String(item.location || '').trim().toLowerCase() !==
          String(location.locationName || location.location || '')
            .trim()
            .toLowerCase(),
      )
    : [];
}

/** POST /api/prodwarehousemanage action 'transfer' — returns res.data (success / message). */
export async function saveTransfer(
  API: string,
  token: string,
  criteria: Row,
  location: Row,
  selectedLocation: Row | null,
  selectedRows: Row[],
): Promise<any> {
  const payload = {
    prpcode: criteria.prpcode,
    strcode: criteria.strcode,
    yearno: getCurrentFinancialYear(),
    itmcode: '',
    txntype: TXNTYPE,
    selectedcartons: selectedRows,
    fromlocationdetail: [location],
    tolocationdetail: [selectedLocation],
    action: 'transfer',
  };
  console.log('[WarehouseNEW] transfer save payload', payload);
  const res = await axios.post(`${API}/api/prodwarehousemanage`, payload, { headers: jsonHeaders(token) });
  return res?.data;
}

/** Legacy error text of every prodwarehousemanage / master_crud catch block. */
export const manageErrorText = (e: any): string =>
  e?.response?.data?.message || e?.response?.data?.error || e?.message || 'Failed to save assign';
