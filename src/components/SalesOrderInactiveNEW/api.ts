// FILE: src/components/SalesOrderInactiveNEW/api.ts
// Every HTTP call of the Sales Order (Inactive) screen — same URL paths,
// methods, headers, params/body keys and response paths as the legacy
// src/components/SalesOrderInActive/index.tsx, but using the `API` host prop
// and `token` prop instead of the globals. Plus the small pure helpers
// (financial year, search, d1 grouping, action payloads).
import axios, { CancelToken } from 'axios';

export type Row = Record<string, any>;
export type MainTab = 'requests' | 'Activehistory' | 'Closehistory';
export type PartyTab = 'party' | 'history';
export type SoAction = 'Active' | 'InActive';

export const str = (v: any) => (v === undefined || v === null ? '' : String(v).trim());

/** legacy getCurrentFinancialYear: FY starts in April → last 2 digits of the FY END year. */
export const getCurrentFinancialYear = () => {
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;
  const financialYear = currentMonth >= 4 ? currentYear + 1 : currentYear;
  return financialYear.toString().substring(2);
};

/** legacy getRequestConfig (list / criterion / history calls). */
const reqConfig = (token: string, params: any, cancelToken?: CancelToken) => ({
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  params,
  cancelToken,
});

/** legacy fetchData ('requests'), fetchAllHistoryData ('Activehistory'), fetchAllVerifyData ('Closehistory'). */
export const browseParams = (tab: MainTab) => ({
  txntype: 'sales_order',
  referrer: 'dashboard',
  prptype: 'R',
  yearno: getCurrentFinancialYear(),
  atype: tab === 'requests' ? 'B' : 'H',
  strtype: ['Y', 'G'],
  strcodes: ['001', '002', '005'],
  status: tab === 'requests' ? 'I' : tab === 'Activehistory' ? 'P' : 'C',
});

/* ------------------------------------------------------------------ */
/* GET /api/sosortbrowse  -> response.data.response.data               */
/* ------------------------------------------------------------------ */
export async function fetchBrowse(API: string, token: string, tab: MainTab, cancelToken?: CancelToken): Promise<Row[]> {
  const payload = browseParams(tab);
  console.log('[SalesOrderInactiveNEW] sosortbrowse ->', payload);
  const response = await axios.get(`${API}/api/sosortbrowse`, reqConfig(token, { ...payload }, cancelToken));
  if (response.data.success && response.data.response.data.length > 0) {
    const rows: Row[] = response.data.response.data;
    if (tab !== 'requests') return rows;
    // legacy fetchData: itemNameArray = d1 ItmName joined by ', '
    return rows.map((item) => ({
      ...item,
      // Fix vs legacy: guard a missing d1 (legacy item.d1.map would throw → "Server error").
      itemNameArray: (Array.isArray(item.d1) ? item.d1 : []).map((d: Row) => d.ItmName).join(', '),
    }));
  }
  return [];
}

/* ------------------------------------------------------------------ */
/* legacy handleListIconClick: GET /api/get_criterion (fetch 'dr')     */
/* ------------------------------------------------------------------ */
export async function fetchPartyList(
  API: string, token: string, prpcode: string, prptype: string, yearno: string, parcode: string, cancelToken?: CancelToken,
): Promise<Row[] | null> {
  const params = {
    prpcodes: [prpcode],
    prptype,
    yearno,
    strcode: '',
    parcodes: [parcode],
    txntype: 'sales_order',
    fetch: 'dr',
  };
  console.log('[SalesOrderInactiveNEW] get_criterion ->', params);
  const response = await axios.get(`${API}/api/get_criterion`, reqConfig(token, { ...params }, cancelToken));
  if (response.data.success && response.data.response.data.length > 0) return response.data.response.data;
  return null;
}

/* ------------------------------------------------------------------ */
/* legacy fetchHistoryData: GET /api/crlimitreqbrowse (party history)  */
/* ------------------------------------------------------------------ */
export async function fetchPartyHistory(
  API: string, token: string, parcode: string, prptype: string, cancelToken?: CancelToken,
): Promise<Row[] | null> {
  const params = {
    text: parcode,
    txntype: 'creditlimithistory',
    referrer: 'dashboard',
    action: 'partyhistory',
    prptype,
  };
  console.log('[SalesOrderInactiveNEW] crlimitreqbrowse ->', params);
  const response = await axios.get(`${API}/api/crlimitreqbrowse`, reqConfig(token, { ...params }, cancelToken));
  if (response.data.success && response.data.data.length > 0) return response.data.data;
  return null;
}

/* ------------------------------------------------------------------ */
/* legacy handleConfirmAction payloads                                  */
/* ------------------------------------------------------------------ */
/** Active: every field of the row except d1, plus Remark / IsAuth / referrer / txntype / action. */
export function activePayload(item: Row, remark: string): Row {
  const removed1: Row = { ...item };
  delete removed1.d1;
  return {
    ...removed1,
    Remark: remark,
    IsAuth: 1,
    referrer: 'dashboard',
    txntype: 'sales_order',
    action: 'edit',
  };
}

/** Close (InActive): legacy updatedItemReject. */
export function closePayload(item: Row, remark: string): Row {
  return {
    PrpCode: item.PrpCode,
    StrCode: item.StrCode,
    YearNo: item.yearno,
    UId: item.UId,
    DueDay: item.DueDay,
    Remark: remark,
    referrer: 'dashboard',
  };
}

/* GET /api/activeso  (payload sent as query params; Content-Type application/javascript like legacy) */
export async function activeSO(API: string, token: string, payload: Row) {
  console.log('[SalesOrderInactiveNEW] activeso ->', payload);
  return axios.get(`${API}/api/activeso`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/javascript',
      Accept: 'application/json',
    },
    params: payload ? payload : null,
  });
}

/* POST /api/closesalesorder  (JSON body) */
export async function closeSO(API: string, token: string, payload: Row) {
  console.log('[SalesOrderInactiveNEW] closesalesorder ->', payload);
  return axios.post(`${API}/api/closesalesorder`, payload, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
  });
}

/* ------------------------------ helpers ------------------------------- */
/** legacy filtered*DataSPO / party modal filters: any field (Object.values) contains the text. */
export const searchRows = <R extends Row>(rows: R[], q: string): R[] => {
  if (!q) return rows;
  const needle = q.toLowerCase();
  return rows.filter((item) => Object.values(item).some((val) => String(val).toLowerCase().includes(needle)));
};

/** legacy groupedData: d1 lines grouped by `${DsnName}_${ItmName}` (insertion order). */
export type D1Group = { key: string; designName: string; itemName: string; items: Row[] };
export function groupD1(d1: Row[]): D1Group[] {
  const acc: Record<string, Row[]> = {};
  d1.forEach((item) => {
    const key = `${item.DsnName}_${item.ItmName}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
  });
  return Object.entries(acc).map(([key, items]) => ({
    key,
    // Fix vs legacy: legacy key.split('_') mis-splits names that contain '_'; read them from the row instead.
    designName: String(items[0]?.DsnName),
    itemName: String(items[0]?.ItmName),
    items,
  }));
}

/** legacy displayValue: null / undefined / '' / 0 -> '-' */
export const displayValue = (val: any) => (val === null || val === undefined || val === '' || val === 0 ? '-' : val);

/** isauth '1' authorised, '2' rejected, else pending (legacy stamps). */
export const authTone = (isAuth: any): 'ok' | 'rej' | 'pend' => {
  const v = str(isAuth);
  return v === '1' ? 'ok' : v === '2' ? 'rej' : 'pend';
};

export const netAmtNum = (v: any) => parseFloat(String(v ?? '').replace(/[^0-9.-]/g, '')) || 0;
