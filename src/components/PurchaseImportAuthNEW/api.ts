// FILE: src/components/PurchaseImportAuthNEW/api.ts
// Every HTTP call of the Purchase Import Auth screen — same URL paths, methods,
// headers, params/body keys and response paths as the legacy
// src/components/PurchaseImportAuth/index.tsx, but using the `API` host prop
// instead of the global dynamicAPI import.
import AsyncStorage from '@/common/utils/compatibleStorage';
import axios from 'axios';

export type Row = Record<string, any>;
export type Tab = 'request' | 'history';

/** legacy: atype 'B' for the Request tab, 'H' for History */
export const atypeOf = (tab: Tab) => (tab === 'history' ? 'H' : 'B');

export type Ctx = { API: string; token: string; tab: Tab };

/* ------------------------------------------------------------------ */
/* GET /api/purchasebrowse  txntype:'purchase_import_auth'             */
/*   headers -> res.data.response.data, item lines -> res.data.response.d1 */
/* ------------------------------------------------------------------ */
export async function fetchBrowse(c: Ctx): Promise<{ rows: Row[]; d1: Row[]; apiError: boolean }> {
  const userPtype = await AsyncStorage.getItem('user_prptype');
  const yno = await AsyncStorage.getItem('yno');
  const payload = {
    prpcode: 'MT',
    prptype: userPtype,
    strcode: '',
    yearno: yno,
    txntype: 'purchase_import_auth',
    referrer: 'dashboard',
    atype: atypeOf(c.tab),
  };
  console.log('[PurchaseImportAuthNEW] purchasebrowse ->', payload);
  const res = await axios.get(`${c.API}/api/purchasebrowse`, {
    headers: {
      Authorization: `Bearer ${c.token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    params: payload,
  });
  return {
    rows: res?.data?.response?.data || [],
    d1: res?.data?.response?.d1 || [],
    apiError: res?.data?.response?.error == true,
  };
}

/* ------------------------------------------------------------------ */
/* POST /api/authpurchase  isauth 1 = approve, 2 = reject              */
/* Body = { prptype, yearno, ...item, isauth, txntype, remark, action,  */
/*          referrer, ARemark, aremark } — key order kept from legacy  */
/* (item fields spread AFTER prptype/yearno, so the row's own values   */
/* win if it carries them).                                            */
/* ------------------------------------------------------------------ */
export async function postAuth(c: Omit<Ctx, 'tab'>, item: Row, isauthValue: 1 | 2, remark: string) {
  const userPtype = await AsyncStorage.getItem('user_prptype');
  const yno = await AsyncStorage.getItem('yno');
  const params = {
    prptype: userPtype,
    yearno: yno,
    ...item,
    isauth: isauthValue,
    txntype: 'purchase_import_auth',
    remark: remark || '',
    action: 'edit',
    referrer: 'dashboard',
    ARemark: remark || '',
    aremark: remark || '',
  };
  console.log('[PurchaseImportAuthNEW] authpurchase ->', params);
  return axios.post(`${c.API}/api/authpurchase`, params, {
    headers: {
      Authorization: `Bearer ${c.token}`,
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
    },
  });
}

/* ------------------------------ search -------------------------------- */
// Same fields as legacy filteredData: header fields OR any of the row's d1 lines.
const HEAD_FIELDS = ['inwno', 'inwdate', 'parcode', 'parname', 'invtype', 'authstatus', 'aremark', 'authby', 'authdate'];
const LINE_FIELDS = ['itmname', 'srno', 'curr', 'currrate', 'exrate', 'porate', 'poamt', 'purrate', 'puramt'];

const has = (o: Row, keys: string[], t: string) => keys.some((k) => String(o?.[k] || '').toLowerCase().includes(t));

export function matchesSearch(item: Row, lines: Row[], search: string) {
  const t = (search || '').toLowerCase().trim();
  if (!t) return true;
  return has(item, HEAD_FIELDS, t) || lines.some((d) => has(d, LINE_FIELDS, t));
}

export const linesOf = (d1: Row[], item: Row) => d1.filter((d) => d.uid === item.uid);

export const statusOf = (i: Row) => String(i?.authstatus || '').toLowerCase();

/** legacy: Number(v).toFixed(2) || '-' */
// Fix vs legacy: legacy showed "NaN" when the value was missing; show '-' instead.
export const fmt2 = (v: any) => {
  const n = Number(v);
  return Number.isNaN(n) ? '-' : n.toFixed(2);
};

/** legacy red highlight: purchase rate above PO rate (both rounded to 2 dp).
 *  Fix vs legacy: legacy compared the toFixed() STRINGS ("9.00" > "10.00" is true
 *  lexicographically); compare the rounded numbers instead. */
export function rateExceedsPo(d: Row) {
  const pur = Number(Number(d?.purrate || 0).toFixed(2));
  const po = Number(Number(d?.porate || 0).toFixed(2));
  return pur > 0 && pur > po;
}
