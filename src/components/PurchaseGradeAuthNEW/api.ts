// FILE: src/components/PurchaseGradeAuthNEW/api.ts
// Every HTTP call of the Purchase Grade Auth screen — same URL paths, methods,
// headers, params/body keys and response paths as the legacy
// src/components/PurchaseGradeAuth/index.tsx (+ common/API/Functions.tsx
// fetchAllStoredata), but using the `API` host prop instead of the global.
import AsyncStorage from '@/common/utils/compatibleStorage';
import axios from 'axios';

export type Row = Record<string, any>;
export type Tab = 'request' | 'history';

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
/* GET /api/purchasebrowse  fetch:'browsedata'  -> res.data.response.data */
/* ------------------------------------------------------------------ */
export async function fetchBrowse(c: Ctx): Promise<{ rows: Row[]; apiError: boolean }> {
  const userPtype = await AsyncStorage.getItem('user_prptype');
  const payload = {
    prptype: userPtype,
    yearno: yearNoOf(c.selectedYear),
    strcode: c.strcode,
    txntype: 'mob_purchase_auth',
    atype: atypeOf(c.tab),
    referrer: 'dashboard',
    fetch: 'browsedata',
  };
  console.log('[PurchaseGradeAuthNEW] purchasebrowse browsedata ->', payload);
  const res = await axios.get(`${c.API}/api/purchasebrowse`, { headers: browseHeaders(c.token), params: payload });
  return { rows: res?.data?.response?.data || [], apiError: res?.data?.response?.error == true };
}

/* ------------------------------------------------------------------ */
/* GET /api/purchasebrowse  fetch:'purdata', pouid -> res.data.response.data */
/* ------------------------------------------------------------------ */
export async function fetchPurData(c: Ctx, item: Row): Promise<{ rows: Row[]; apiError: boolean }> {
  const userPtype = await AsyncStorage.getItem('user_prptype');
  const payload = {
    prptype: userPtype,
    yearno: yearNoOf(c.selectedYear),
    strcode: c.strcode,
    txntype: 'mob_purchase_auth',
    atype: atypeOf(c.tab),
    referrer: 'dashboard',
    fetch: 'purdata',
    pouid: item?.pouid,
  };
  console.log('[PurchaseGradeAuthNEW] purchasebrowse purdata ->', payload);
  const res = await axios.get(`${c.API}/api/purchasebrowse`, { headers: browseHeaders(c.token), params: payload });
  return { rows: res?.data?.response?.data || [], apiError: res?.data?.response?.error == true };
}

/* ------------------------------------------------------------------ */
/* POST /api/authpurchase  isauth 1 = approve, 2 = reject              */
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
    txntype: 'mob_purchase_auth',
    remark: remark || '',
  };
  console.log('[PurchaseGradeAuthNEW] authpurchase ->', params);
  return axios.post(`${c.API}/api/authpurchase`, params, {
    headers: {
      Authorization: `Bearer ${c.token}`,
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      Accept: 'application/json',
    },
  });
}

/* ------------------------------ search -------------------------------- */
// Same field list as legacy filteredData.
// Fix vs legacy: legacy called `i?.qty1?.toLowerCase()` which throws a TypeError
// when a field is a number (e.g. qty1/qty2/qty3); String() makes it safe.
const SEARCH_FIELDS = [
  'parcode', 'parname', 'itmname', 'mername', 'inwno', 'inwdate', 'grdname', 'shdname', 'mainstrname',
  'authstatus', 'authby', 'authdate', 'aremark', 'pono', 'podate', 'qty1', 'qty2', 'qty3',
];
export function matchesSearch(i: Row, search: string) {
  const t = (search || '').toLowerCase();
  return SEARCH_FIELDS.some((k) => i?.[k] != null && String(i[k]).toLowerCase().includes(t));
}

export const statusOf = (i: Row) => String(i?.authstatus || '').toLowerCase();
export const fmt3 = (v: any) => Number(v || 0).toFixed(3);
