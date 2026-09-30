// FILE: src/components/SalesOrderPriceListAuthNEW/api.ts
// Every HTTP call of the Sales Order Price List Auth screen — same URL paths,
// methods, headers, params keys/values and response paths as the legacy
// src/components/SalesOrderPriceListAuth/index.tsx, but using the `API` host
// prop instead of the global dynamicAPI import.
import AsyncStorage from '@/common/utils/compatibleStorage';
import axios from 'axios';

export type Row = Record<string, any>;
export type Tab = 'request' | 'history';

/** legacy: atype 'B' for the Request tab, 'H' for History */
export const atypeOf = (tab: Tab) => (tab === 'history' ? 'H' : 'B');

export const TXN = 'mob_sales_order_price_list_auth';

/* ------------------------------------------------------------------ */
/* legacy fetchSalesOrderlist                                          */
/* GET /api/sosortbrowse -> header rows res.data.response.data,        */
/*                          item rows   res.data.response.d1           */
/* ------------------------------------------------------------------ */
export async function fetchBrowse(API: string, token: string, tab: Tab): Promise<{ rows: Row[]; details: Row[]; apiError: boolean }> {
  const userPtype = await AsyncStorage.getItem('user_prptype');
  const yno = await AsyncStorage.getItem('yno');
  const payload = {
    prpcode: 'MTX',
    prptype: userPtype,
    strcode: '002',
    yearno: yno,
    txntype: TXN,
    referrer: TXN,
    atype: atypeOf(tab),
    strtype: 'G',
  };
  console.log('[SalesOrderPriceListAuthNEW] sosortbrowse ->', payload);
  const res = await axios.get(`${API}/api/sosortbrowse`, {
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
/* legacy fetchauthoriseddata — GET /api/authso                        */
/* isauth 1 = approve, 2 = reject. NOTE: legacy spreads the whole row  */
/* AFTER prptype/yearno, so row keys with the same name win — kept.    */
/* ------------------------------------------------------------------ */
export async function authSO(API: string, token: string, item: Row, isauthValue: 1 | 2, remark: string) {
  const userPtype = await AsyncStorage.getItem('user_prptype');
  const yno = await AsyncStorage.getItem('yno');
  const params = {
    prptype: userPtype,
    yearno: yno,
    ...item,
    isauth: isauthValue,
    txntype: TXN,
    remark: remark || '',
    action: 'edit',
    referrer: 'dashboard',
    ARemark: remark || '',
    aremark: remark || '',
  };
  console.log('[SalesOrderPriceListAuthNEW] authso ->', params);
  return axios.get(`${API}/api/authso`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'X-Requested-with': 'XMLHttpRequest',
    },
    params,
  });
}

/* ------------------------------ helpers -------------------------------- */

/** legacy: salesOrderDetails.filter(d => d.UId === item.UId) */
export const detailsOf = (details: Row[], item: Row) => details.filter((d) => d.UId === item.UId);

/** legacy red highlight: PLRate > 0 && UnitRate < PLRate */
export const belowPL = (d: Row) => Number(d?.PLRate || 0) > 0 && Number(d?.UnitRate || 0) < Number(d?.PLRate || 0);

/** legacy: detail.PLRate != null ? Number(detail.PLRate).toFixed(2) : '0.00' */
export const fmtPL = (v: any) => (v != null ? Number(v).toFixed(2) : '0.00');

export const statusOf = (i: Row) => String(i?.AuthStatus || '').toLowerCase();

/* ------------------------------ search -------------------------------- */
// Same fields as legacy filteredData: header fields OR any matching item row.
const HEAD_FIELDS = ['SONo', 'SODate', 'ParName', 'BAccName', 'NetAmt', 'DueDate', 'DueDay', 'AuthStatus'];
const DETAIL_FIELDS = ['ItmName', 'Qty', 'UnitRate', 'PLRate', 'Amount', 'Denier', 'ShdName', 'GrdName'];
const has = (o: Row, k: string, t: string) => String(o?.[k] || '').toLowerCase().includes(t);

export function matchesSearch(item: Row, details: Row[], search: string) {
  const t = (search || '').toLowerCase().trim();
  if (!t) return true;
  if (HEAD_FIELDS.some((k) => has(item, k, t))) return true;
  return detailsOf(details, item).some((d) => DETAIL_FIELDS.some((k) => has(d, k, t)));
}
