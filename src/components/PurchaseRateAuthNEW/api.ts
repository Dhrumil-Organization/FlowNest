// FILE: src/components/PurchaseRateAuthNEW/api.ts
// Every HTTP call of the Purchase Rate Auth screen — same URL paths, methods,
// headers, params/body keys and response paths as the legacy
// src/components/PurchaseRateAuth/index.tsx, but using the `API` host prop and
// the `token` prop instead of the global API import.
import AsyncStorage from '@/common/utils/compatibleStorage';
import axios from 'axios';

export type Row = Record<string, any>;
export type Tab = 'request' | 'history';

export const TXNTYPE = 'purchase_transport_auth';

/** legacy: atype 'B' for the Request tab, 'H' for History */
export const atypeOf = (tab: Tab) => (tab === 'history' ? 'H' : 'B');

export type ListResult = { rows: Row[]; details: Row[]; apiError: boolean };

/* ------------------------------------------------------------------ */
/* GET /api/purchasebrowse                                              */
/*   { prpcode:'MT', prptype, strcode:'', yearno, txntype, referrer, atype } */
/*   -> res.data.response.data (headers) + res.data.response.d1 (items)  */
/* ------------------------------------------------------------------ */
export async function fetchBrowse(API: string, token: string, tab: Tab): Promise<ListResult> {
  const userPtype = await AsyncStorage.getItem('user_prptype');
  const yno = await AsyncStorage.getItem('yno');
  const payload = {
    prpcode: 'MT',
    prptype: userPtype,
    strcode: '',
    yearno: yno,
    txntype: TXNTYPE,
    referrer: 'dashboard',
    atype: atypeOf(tab),
  };
  console.log('[PurchaseRateAuthNEW] purchasebrowse ->', payload);
  const res = await axios.get(`${API}/api/purchasebrowse`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    params: payload,
  });
  return {
    rows: res?.data?.response?.data || [],
    details: res?.data?.response?.d1 || [],
    apiError: res?.data?.response?.error == true,
  };
}

/* ------------------------------------------------------------------ */
/* POST /api/authpurchase  isauth 1 = approve, 2 = reject               */
/*   { prptype, yearno, ...item, isauth, txntype, remark, action:'edit', */
/*     referrer:'dashboard', ARemark, aremark }                          */
/*   (key order kept: the spread item may override prptype/yearno)       */
/* ------------------------------------------------------------------ */
export async function postAuth(API: string, token: string, item: Row, isauthValue: 1 | 2, remark: string) {
  const userPtype = await AsyncStorage.getItem('user_prptype');
  const yno = await AsyncStorage.getItem('yno');
  const params = {
    prptype: userPtype,
    yearno: yno,
    ...item,
    isauth: isauthValue,
    txntype: TXNTYPE,
    remark: remark || '',
    action: 'edit',
    referrer: 'dashboard',
    ARemark: remark || '',
    aremark: remark || '',
  };
  console.log('[PurchaseRateAuthNEW] authpurchase ->', params);
  return axios.post(`${API}/api/authpurchase`, params, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
    },
  });
}

/* ------------------------------ search -------------------------------- */
// Same field lists as legacy filteredData: header fields OR any detail (d1) row of the same uid.
const HEADER_FIELDS = [
  'inwno', 'inwdate', 'parcode', 'parname', 'mainstrname', 'invtype', 'authstatus', 'aremark', 'authby',
  'authdate', 'countofitem',
];
const DETAIL_FIELDS = [
  'srno', 'itmname', 'curr', 'currrate', 'exrate', 'porate', 'poamt', 'potrpper', 'potrpamt', 'purrate',
  'puramt', 'purtrpper', 'purtrpamt', 'amount',
];
const hit = (o: Row, keys: string[], t: string) => keys.some((k) => String(o?.[k] ?? '').toLowerCase().includes(t));

export function matchesSearch(item: Row, details: Row[], search: string) {
  const t = (search || '').trim().toLowerCase();
  if (!t) return true;
  if (hit(item, HEADER_FIELDS, t)) return true;
  return details.some((d) => d.uid === item.uid && hit(d, DETAIL_FIELDS, t));
}

export const detailsOf = (details: Row[], item: Row) => details.filter((d) => d.uid === item.uid);

export const statusOf = (i: Row) => String(i?.authstatus || '').toLowerCase();

/** legacy: Number(v).toFixed(2). Fix vs legacy: a missing value showed "NaN"; show '-' instead (display only). */
export const fx2 = (v: any) => {
  const n = Number(v);
  return v === null || v === undefined || v === '' || Number.isNaN(n) ? '-' : n.toFixed(2);
};
/** legacy: Number(v || 0).toFixed(2) */
export const fx2z = (v: any) => Number(v || 0).toFixed(2);
const r2 = (v: any) => Number(Number(v || 0).toFixed(2));

/** legacy red highlight: purchase rate above PO rate, or purchase transport amount above PO transport amount
 *  (each only when the PO value is > 0; compared after rounding to 2 decimals). */
export const isOverPO = (d: Row) =>
  (r2(d.porate) > 0 && r2(d.purrate) > r2(d.porate)) ||
  (r2(d.potrpamt) > 0 && r2(d.purtrpamt) > r2(d.potrpamt));
