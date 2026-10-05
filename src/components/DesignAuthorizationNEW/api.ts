// FILE: src/components/DesignAuthorizationNEW/api.ts
// Every HTTP call of Design Authorization — same URL paths, methods, headers,
// params / bodies and response paths as the legacy screen
// (components/DesignAuthorization/index.tsx, route app/(tabs)/design-authorization.tsx),
// but host = `API` prop and bearer = `token` prop.
//
//   GET  /api/itembrowse        params { txntype:'app_item_master_auth', referrer:'dashboard', prptype:'R',
//                                        yearno:<AsyncStorage 'yno'>, strcode, atype }   B=Request h=History A=Verify
//                               rows: response.data.response.data (when response.data.success and length > 0)
//   POST /api/authitem          body  row (minus d1) + { remark, prptype:'R', isauth, referrer:'dashboard', itmcode,
//                                        strcode, yearno:'26', action:'edit', txntype:'app_item_master_auth', atype }
//                               result: response.data.success / .message / .response.data
//   GET  /api/get_criterion     params { prpcodes:[prpcode], prptype, yearno, strcode:'', parcodes:[parcode],
//                                        txntype:'purchase_order_detail', fetch:'dr' }  rows: response.data.response.data
//   GET  /api/crlimitreqbrowse  params { text:parcode, txntype:'creditlimithistory', referrer:'dashboard',
//                                        action:'partyhistory', prptype }               rows: response.data.data
//
// AsyncStorage keys read: 'yno'.
// Not ported: legacy also called fetchAllStoredata (GET /api/getstore) once on mount, but its result was
// only used for a variable that is never read, so the call is dropped (see index.tsx header).
import AsyncStorage from '@/common/utils/compatibleStorage';
import axios, { CancelToken } from 'axios';
import { browseParams, MainTab, Row } from './model';

export type Api = { API: string; token: string };

/** GET /api/itembrowse — Request (atype 'B') sends Content-Type/Accept too; History ('h') and Verify ('A') only Authorization (legacy). */
export async function browseItems(
  { API, token }: Api, tab: MainTab, strcode: string, cancelToken?: CancelToken,
): Promise<{ ok: boolean; rows: Row[] }> {
  const yno = await AsyncStorage.getItem('yno');
  const headers =
    tab === 'requests'
      ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'application/json' }
      : { Authorization: `Bearer ${token}` };
  const params = browseParams(tab, yno, strcode);
  const response = await axios.get(`${API}/api/itembrowse`, { headers, params, cancelToken });
  const d = response.data;
  if (d.success && d.response.data.length > 0) return { ok: true, rows: d.response.data };
  return { ok: false, rows: [] };
}

const reqConfig = (token: string, params: Row, cancelToken?: CancelToken) => ({
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  params,
  cancelToken,
});

/** legacy handleListIconClick: GET /api/get_criterion (party list for purchase_order_detail, fetch 'dr'). */
export async function fetchPartyList(
  { API, token }: Api, prpcode: string, prptype: string, yearno: string, parcode: string, cancelToken?: CancelToken,
): Promise<Row[] | null> {
  const params = {
    prpcodes: [prpcode],
    prptype,
    yearno,
    strcode: '',
    parcodes: [parcode],
    txntype: 'purchase_order_detail',
    fetch: 'dr',
  };
  const response = await axios.get(`${API}/api/get_criterion`, reqConfig(token, params, cancelToken));
  if (response.data.success && response.data.response.data.length > 0) return response.data.response.data;
  return null;
}

/** legacy fetchHistoryData: GET /api/crlimitreqbrowse (party credit-limit history). */
export async function fetchPartyHistory(
  { API, token }: Api, parcode: string, prptype: string, cancelToken?: CancelToken,
): Promise<Row[] | null> {
  const params = {
    text: parcode,
    txntype: 'creditlimithistory',
    referrer: 'dashboard',
    action: 'partyhistory',
    prptype,
  };
  const response = await axios.get(`${API}/api/crlimitreqbrowse`, reqConfig(token, params, cancelToken));
  if (response.data.success && response.data.data.length > 0) return response.data.data;
  return null;
}

/** legacy handleConfirmAction: POST /api/authitem (accept / reject / verify-pending / verify-reject). */
export async function postAuthItem({ API, token }: Api, payload: any) {
  const response = await axios.post(`${API}/api/authitem`, payload, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      Accept: 'application/json',
    },
  });
  return response;
}
