// FILE: src/components/ItemAuthorizationNEW/api.ts
// Every HTTP call of Item Authorization — same URL paths, methods, headers,
// params and bodies as the legacy screen, but host = `API` prop, token = prop.
import AsyncStorage from '@/common/utils/compatibleStorage';
import axios, { CancelToken } from 'axios';
import { browseParams, MainTab, Row } from './model';

export type Api = { API: string; token: string };

/** legacy fetchAllStoredata(token, '', yno, 'sales_order') from common/API/Functions.tsx:
 *  GET /api/getstore { prpcode, yearno, txntype, prptype: user_prptype } */
export async function fetchStores({ API, token }: Api, yno: string | null): Promise<Row[]> {
  const userPtype = await AsyncStorage.getItem('user_prptype');
  try {
    const response = await axios.get(`${API}/api/getstore`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/javascript',
        Accept: 'application/json',
        'x-platform': 'mob',
      },
      params: { prpcode: '', yearno: yno, txntype: 'sales_order', prptype: userPtype },
    });
    let data: any[] = [];
    if (response.data?.response?.data && Array.isArray(response.data.response.data)) data = response.data.response.data;
    else if (response.data?.data && Array.isArray(response.data.data)) data = response.data.data;
    else if (Array.isArray(response.data)) data = response.data;
    return data;
  } catch (error) {
    if (!axios.isCancel(error)) console.log('fetchAllStoredata error', error);
    return [];
  }
}

/** GET /api/itembrowse — requests (atype 'B') sends Content-Type/Accept too; history ('h') and verify ('A') only Authorization (legacy). */
export async function browseItems({ API, token }: Api, tab: MainTab, strcode: string): Promise<{ ok: boolean; rows: Row[] }> {
  const headers =
    tab === 'requests'
      ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'application/json' }
      : { Authorization: `Bearer ${token}` };
  const params = browseParams(tab, strcode);
  const response = await axios.get(`${API}/api/itembrowse`, { headers, params });
  const d = response?.data;
  if (d?.success && d.response.data.length > 0) return { ok: true, rows: d.response.data };
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

/** legacy handleConfirmAction: POST /api/authitem (approve / reject / verify-pending / verify-reject). */
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
