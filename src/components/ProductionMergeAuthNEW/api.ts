// FILE: src/components/ProductionMergeAuthNEW/api.ts
// API layer for Production Merge Auth — a 1:1 mapping of the calls in the legacy
// src/components/ProductionMergeAuth/index.tsx (same paths, methods, headers,
// params/body keys and value formats, same response paths).
//
// AsyncStorage keys read (exactly as legacy): 'user_prptype', 'yno'.
// The token comes from the `token` prop (legacy also received it as a prop).
import AsyncStorage from '@/common/utils/compatibleStorage';
import axios from 'axios';

export type Row = Record<string, any>;
export type Api = { API: string; token: string };
export type Tab = 'request' | 'history';

export const TXNTYPE = 'mob_prod_merge_auth';

/** legacy: atype = 'B' (request tab) / 'H' (history tab) */
export const atypeOf = (tab: Tab) => (tab === 'history' ? 'H' : 'B');

const getHeaders = (token: string) => ({
  Authorization: `Bearer ${token}`,
  'Content-Type': 'application/json',
  Accept: 'application/json',
});

async function readCtx() {
  const userPtype = await AsyncStorage.getItem('user_prptype');
  const yno = await AsyncStorage.getItem('yno');
  return { userPtype, yno };
}

/**
 * GET ${API}/api/prodproductionbrowse
 * params { prptype, yearno, txntype:'mob_prod_merge_auth', atype:'B'|'H', referrer:'dashboard', fetch:'browsedata' }
 * rows = res.data.data.data ; warning flag = res.data.response.error == true
 */
export async function fetchMergeList(api: Api, tab: Tab): Promise<{ rows: Row[]; warn: boolean }> {
  const { userPtype, yno } = await readCtx();
  const payload = {
    prptype: userPtype,
    yearno: yno,
    txntype: TXNTYPE,
    atype: atypeOf(tab),
    referrer: 'dashboard',
    fetch: 'browsedata',
  };
  const res = await axios.get(`${api.API}/api/prodproductionbrowse`, {
    headers: getHeaders(api.token),
    params: payload,
  });
  const rows = res?.data?.data?.data || [];
  // eslint-disable-next-line eqeqeq
  return { rows: Array.isArray(rows) ? rows : [], warn: res?.data?.response?.error == true };
}

/**
 * GET ${API}/api/prodpackingbrowse
 * params { prptype, yearno, txntype:'mob_prod_merge_auth', atype:'B'|'H', referrer:'dashboard', fetch:'packdata', produid }
 * rows = res.data.response.data ; warning flag = res.data.response.error == true
 *
 * NOTE: in the legacy screen this call lives in `fetchProdMergedatalist`, which is
 * never invoked from the UI (no button renders it, and the fetched data is never
 * displayed). It is mapped here exactly so it can be wired later, but the NEW
 * screen does not call it — same runtime behaviour as legacy.
 */
export async function fetchPackingDetails(api: Api, tab: Tab, item: Row): Promise<{ rows: Row[]; warn: boolean }> {
  const { userPtype, yno } = await readCtx();
  const payload = {
    prptype: userPtype,
    yearno: yno,
    txntype: TXNTYPE,
    atype: atypeOf(tab),
    referrer: 'dashboard',
    fetch: 'packdata',
    produid: item?.produid,
  };
  const res = await axios.get(`${api.API}/api/prodpackingbrowse`, {
    headers: getHeaders(api.token),
    params: payload,
  });
  const rows = res?.data?.response?.data || [];
  // eslint-disable-next-line eqeqeq
  return { rows: Array.isArray(rows) ? rows : [], warn: res?.data?.response?.error == true };
}

export type AuthResult =
  | { kind: 'error'; message: string }
  | { kind: 'success'; message: string }
  | { kind: 'none' };

/**
 * POST ${API}/api/authproductionmerge
 * body { prptype, yearno, mercode: item.submercode || '', isauth: 1 (approve) | 2 (reject) (number),
 *        txntype:'mob_prod_merge_auth', remark: remarks[item.uid] || '' }
 * headers: Bearer, Content-Type json, X-Requested-With XMLHttpRequest, Accept json
 *
 * Result rules (legacy):
 *   data.response.error == true  -> error "Please Try Again"
 *   else data.success == true    -> success data.response.message (caller refreshes list)
 *   else                         -> nothing shown, no refresh
 *   thrown                       -> error (err.response.data.message || err.message || "Failed.")
 */
export async function authoriseMerge(api: Api, item: Row, isauthValue: 1 | 2, remark: string): Promise<AuthResult> {
  const { userPtype, yno } = await readCtx();
  try {
    const params = {
      prptype: userPtype,
      yearno: yno,
      mercode: item?.submercode || '',
      isauth: isauthValue,
      txntype: TXNTYPE,
      remark: remark || '',
    };
    const response = await axios.post(`${api.API}/api/authproductionmerge`, params, {
      headers: {
        Authorization: `Bearer ${api.token}`,
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        Accept: 'application/json',
      },
    });
    // eslint-disable-next-line eqeqeq
    if (response?.data?.response?.error == true) return { kind: 'error', message: 'Please Try Again' };
    // eslint-disable-next-line eqeqeq
    if (response?.data?.success == true) return { kind: 'success', message: response?.data.response?.message };
    return { kind: 'none' };
  } catch (error: any) {
    console.log('PRODUCTION MERGE AUTH ERROR:', error?.response?.data || error?.message);
    return { kind: 'error', message: error?.response?.data?.message || error?.message || 'Failed.' };
  }
}

/* ------------------------------ search filter ----------------------------- */

// Same fields, same order and same "lowercase includes" rule as legacy.
const SEARCH_KEYS = [
  'submercode', 'submername', 'mainmercode', 'mainmername', 'rsnname', 'authstatus',
  'prodno', 'proddate', 'createdby', 'createddate', 'createdtime', 'aremark',
  'authby', 'authdate', 'authtime',
];

export function filterRows(rows: Row[], search: string): Row[] {
  const searchText = (search || '').toLowerCase();
  return rows.filter((i) =>
    SEARCH_KEYS.some((k) => {
      const v = i?.[k];
      // legacy used v?.toLowerCase(): only string values can match.
      return typeof v === 'string' && v.toLowerCase().includes(searchText);
    }),
  );
}

export const statusKey = (r: Row): 'authorised' | 'rejected' | 'pending' => {
  const s = typeof r?.authstatus === 'string' ? r.authstatus.toLowerCase() : '';
  return s === 'authorised' ? 'authorised' : s === 'rejected' ? 'rejected' : 'pending';
};
