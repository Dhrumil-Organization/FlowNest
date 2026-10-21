// FILE: src/components/PackingGradeAuthNEW/api.ts
// Every HTTP call of the Packing Grade Auth screen — same URL paths, methods,
// headers, params/body keys and response paths as the legacy
// src/components/PackingAuth/index.tsx (+ common/API/Functions.tsx
// fetchAllStoredata), but using the `API` host prop instead of the global.
import AsyncStorage from '@/common/utils/compatibleStorage';
import axios from 'axios';

export type Row = Record<string, any>;
export type Tab = 'request' | 'history';

/** Preserve the API's own message across common response shapes. */
// export const getApiMessage = (data: any): string => {
//   const candidates = [
//     data?.response?.message,
//     data?.message,
//     data?.data?.response?.message,
//     data?.data?.message,
//   ];
//   const message = candidates.find(
//     value => typeof value === 'string' && value.trim().length > 0
//   );
//   return message ?? '';
// };


export const getApiMessage = (data: any): string => {
  const candidates = [
    data?.message,
    data?.response?.message,
    data?.data?.message,
    data?.data?.response?.message,
  ];

  const message = candidates.find(
    value =>
      typeof value === 'string' &&
      value.trim().length > 0
  );

  return message?.trim() ?? '';
};


export const isApiError = (data: any): boolean => {
  // Check the outer response first. Error responses may contain data: []
  // alongside success: false, so do not unwrap data before checking success.
  const payloads = [
    data,
    data?.response,
    data?.data,
    data?.data?.response,
  ];

  return payloads.some(
    payload =>
      payload?.success === false ||
      payload?.success === 'false' ||
      payload?.success === 0 ||
      payload?.error === true
  );
};

/** legacy: atype 'B' for the Request tab, 'H' for History */

export const atypeOf = (tab: Tab) => (tab === 'history' ? 'H' : 'B');

/** legacy: `${y - i}-${y - i + 1}` for the last 5 years, first one selected */
export function buildYearOptions(): string[] {
  const y = new Date().getFullYear();
  const arr: string[] = [];
  for (let i = 0; i < 5; i++) arr.push(`${y - i}-${y - i + 1}`);
  return arr;
}

/** legacy sends selectedYear?.slice(-2) as yearno (e.g. "2026-2027" -> "27") */
export const yearNoOf = (selectedYear: string) => selectedYear?.slice(-2);

/** legacy: selectedstore?.StrCode || selectedstore?.strcode || FormState.values.StrCode || '' */
export const strCodeOf = (store: Row | null, formStrCode: string) =>
  store?.StrCode || store?.strcode || formStrCode || '';

export const storeNameOf = (s: Row | null | undefined) => s?.StrName || s?.LngName || s?.store_name || '';

const browseHeaders = (token: string) => ({
  Authorization: `Bearer ${token}`,
  'Content-Type': 'application/json',
  Accept: 'application/json',
});

/* ------------------------------------------------------------------ */
/* legacy fetchAllStoredata(token, '', yno, 'sales_order')              */
/* GET /api/getstore { prpcode, yearno, txntype, prptype }             */
/* ------------------------------------------------------------------ */
export async function fetchStores(API: string, token: string, prp = '', yrno: any = '', txn = ''): Promise<Row[]> {
  const userPtype = await AsyncStorage.getItem('user_prptype');
  try {
    const params = { prpcode: prp, yearno: yrno, txntype: txn, prptype: userPtype };
    const response = await axios.get(`${API}/api/getstore`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/javascript',
        Accept: 'application/json',
        'x-platform': 'mob',
      },
      params,
    });
    let data: any[] = [];
    if (response.data?.response?.data && Array.isArray(response.data.response.data)) {
      data = response.data.response.data;
    } else if (response.data?.data && Array.isArray(response.data.data)) {
      data = response.data.data;
    } else if (Array.isArray(response.data)) {
      data = response.data;
    }
    return data;
  } catch (error) {
    if (!axios.isCancel(error)) console.log('fetchAllStoredata error', error);
    return [];
  }
}

export type Ctx = { API: string; token: string; selectedYear: string; strcode: string; tab: Tab };

/* ------------------------------------------------------------------ */
/* GET /api/prodpackingbrowse  fetch:'browsedata'  -> res.data.data.data */
/* ------------------------------------------------------------------ */
export async function fetchBrowse(c: Ctx): Promise<{ rows: Row[]; apiError: boolean; apiMessage: string }> {
  const userPtype = await AsyncStorage.getItem('user_prptype');
  const payload = {
    prptype: userPtype,
    yearno: yearNoOf(c.selectedYear),
    strcode: c.strcode,
    txntype: 'mob_packing_auth',
    atype: atypeOf(c.tab),
    referrer: 'dashboard',
    fetch: 'browsedata',
  };
  console.log('[PackingGradeAuthNEW] prodpackingbrowse browsedata ->', payload);
  const res = await axios.get(`${c.API}/api/prodpackingbrowse`, { headers: browseHeaders(c.token), params: payload });
  return {
    rows: res?.data?.data?.data || [],
    apiError: isApiError(res?.data),
    apiMessage: getApiMessage(res?.data),
  };
}

/* ------------------------------------------------------------------ */
/* GET /api/prodpackingbrowse  fetch:'packdata', produid -> res.data.response.data */
/* ------------------------------------------------------------------ */
export async function fetchPackData(c: Ctx, item: Row): Promise<{ rows: Row[]; apiError: boolean; apiMessage: string }> {
  const userPtype = await AsyncStorage.getItem('user_prptype');
  const payload = {
    prptype: userPtype,
    yearno: yearNoOf(c.selectedYear),
    strcode: c.strcode,
    txntype: 'mob_packing_auth',
    atype: atypeOf(c.tab),
    referrer: 'dashboard',
    fetch: 'packdata',
    produid: item?.produid,
  };
  console.log('[PackingGradeAuthNEW] prodpackingbrowse packdata ->', payload);
  const res = await axios.get(`${c.API}/api/prodpackingbrowse`, { headers: browseHeaders(c.token), params: payload });
  return {
    rows: res?.data?.response?.data || [],
    apiError: isApiError(res?.data),
    apiMessage: getApiMessage(res?.data),
  };
}

/* ------------------------------------------------------------------ */
/* POST /api/authpacking  isauth 1 = approve, 2 = reject               */
/* ------------------------------------------------------------------ */
export async function postAuth(c: Omit<Ctx, 'tab'>, item: Row, isauthValue: 1 | 2, remark: string) {
  const userPtype = await AsyncStorage.getItem('user_prptype');
  const params = {
    prptype: userPtype,
    prpcode: item?.prpcode || '',
    yearno: yearNoOf(c.selectedYear),
    strcode: c.strcode,
    uid: item?.uid || '',
    srno: item?.srno || '',
    isauth: isauthValue,
    txntype: 'mob_packing_auth',
    remark: remark || '',
  };
  console.log('[PackingGradeAuthNEW] authpacking ->', params);
  return axios.post(`${c.API}/api/authpacking`, params, {
    headers: {
      Authorization: `Bearer ${c.token}`,
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      Accept: 'application/json',
    },
  });
}

/* ------------------------------ search -------------------------------- */
// Same field list as legacy filteredData (String() so numeric fields cannot throw).
const SEARCH_FIELDS = [
  'vouno', 'voudate', 'parcode', 'parname', 'authstatus', 'itmname', 'mername', 'grdname', 'shdname', 'qty',
  'cartno', 'mainstrname', 'prodno', 'proddate', 'qty1', 'qty2', 'qty3', 'authby', 'authdate', 'aremark', 'vouddate',
];
export function matchesSearch(i: Row, search: string) {
  const t = (search || '').toLowerCase();
  return SEARCH_FIELDS.some((k) => i?.[k] != null && String(i[k]).toLowerCase().includes(t));
}

export const statusOf = (i: Row) => String(i?.authstatus || '').toLowerCase();
export const fmt3 = (v: any) => Number(v || 0).toFixed(3);
