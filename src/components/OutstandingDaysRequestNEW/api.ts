// FILE: src/components/OutstandingDaysRequestNEW/api.ts
// Every HTTP call of the Outstanding Days Request screen — same URL paths,
// methods, headers, params/body keys (and key order) and response paths as the
// legacy components/OutstandingDaysRequest/index.tsx, but using the `API` host
// prop and the `token` prop instead of the global `API` import.
//
// Legacy route: app/(tabs)/outstanding-days-request.tsx
// AsyncStorage: none (the legacy component read nothing from storage; the
// legacy ROUTE read access_token / user_details, now injected as props).
//
//   GET  /api/osdaysreqbrowse  { txntype:'outstandingdaysrequest', referrer:'dashboard' }
//          -> res.data.success ? res.data.data : []                       (Request tab)
//   GET  /api/osdaysreqbrowse  { txntype:'outstandingdaysrequesthistory', action:'allpartyhistory', referrer:'dashboard' }
//          -> res.data.success ? res.data.data : []                       (History tab)
//   GET  /api/osdaysreqbrowse  { acccode, txntype:'outstandingdaysrequesthistory', referrer:'dashboard',
//                                action:'partyhistory', prptype }
//          -> res.data.success && res.data.data.length > 0 ? res.data.data : []   (party history)
//   GET  /api/get_criterion    { prpcodes:[prpcode], prptype, yearno, strcode:'', parcodes:[parcode],
//                                txntype:'outstandingdaysrequest', fetch:'dr' }
//          -> res.data.success && res.data.response.data.length > 0 ? res.data.response.data : (none)
//   GET  /api/osdaysreqbills   { uid, prpcode, acccode, txntype:'outstandingdaysrequestbills',
//                                referrer:'dashboard', action:'partybills', prptype }
//          -> res.data.success ? { res.data.data.mainpardata, res.data.data.osbills || [] } : res.data.message
//   POST /api/osdaysreqedit    body = { ...card, limit2, limit3, isauth (1 accept / 2 reject),
//                                referrer:'dashboard', txntype:'outstandingdaysrequest', action:'edit' }
//          -> res.data.success, res.data.message
import axios from 'axios';

export type Row = Record<string, any>;

/** Headers of the two "browse" list calls and the bills call (legacy: Authorization only). */
const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });

/** Legacy getRequestConfig(): JSON headers + params + (optional) axios cancel token. */
const requestConfig = (token: string, params: Row, cancelToken?: any) => ({
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  params,
  cancelToken,
});

/** Same as legacy `axios.CancelToken.source()`. */
export const newCancelSource = () => axios.CancelToken.source();
/** Same as legacy `axios.isCancel(error)`. */
export const isCancel = (error: any) => axios.isCancel(error);

/** Request tab list. Throws on network error (caller alerts "Server error"). */
export async function fetchRequests(API: string, token: string): Promise<Row[]> {
  const res = await axios.get(`${API}/api/osdaysreqbrowse`, {
    headers: bearer(token),
    params: { txntype: 'outstandingdaysrequest', referrer: 'dashboard' },
  });
  return res.data.success ? res.data.data : [];
}

/** History tab list (all parties). */
export async function fetchAllHistory(API: string, token: string): Promise<Row[]> {
  const res = await axios.get(`${API}/api/osdaysreqbrowse`, {
    headers: bearer(token),
    params: {
      txntype: 'outstandingdaysrequesthistory',
      action: 'allpartyhistory',
      referrer: 'dashboard',
    },
  });
  return res.data.success ? res.data.data : [];
}

/** History of one party (party-history panel, "History" tab). */
export async function fetchPartyHistory(
  API: string,
  token: string,
  parcode: string,
  prptype: string,
  cancelToken?: any,
): Promise<Row[]> {
  const historyPayload = {
    acccode: parcode,
    txntype: 'outstandingdaysrequesthistory',
    referrer: 'dashboard',
    action: 'partyhistory',
    prptype: prptype,
  };
  const response = await axios.get(
    `${API}/api/osdaysreqbrowse`,
    requestConfig(token, { ...historyPayload }, cancelToken),
  );
  return response.data.success && response.data.data.length > 0 ? response.data.data : [];
}

/** Parties of the request (party-history panel, "Parties" tab).
 *  Returns null when the API says no / empty (legacy: clear the list and do NOT load history). */
export async function fetchCriterionParties(
  API: string,
  token: string,
  prpcode: string,
  prptype: string,
  yearno: string,
  parcode: string,
  cancelToken?: any,
): Promise<Row[] | null> {
  const historyPayload = {
    prpcodes: [prpcode],
    prptype: prptype,
    yearno: yearno,
    strcode: '',
    parcodes: [parcode],
    txntype: 'outstandingdaysrequest',
    fetch: 'dr',
  };
  const response = await axios.get(
    `${API}/api/get_criterion`,
    requestConfig(token, { ...historyPayload }, cancelToken),
  );
  return response.data.success && response.data.response.data.length > 0
    ? response.data.response.data
    : null;
}

export type BillsResult =
  | { success: true; mainParData: any; bills: Row[] }
  | { success: false; message: string };

/** Outstanding bills of the party of one request. */
export async function fetchBills(
  API: string,
  token: string,
  parcode: string,
  prptype: string,
  uid: string,
  prpcode: string,
): Promise<BillsResult> {
  const payload = {
    uid: uid,
    prpcode: prpcode,
    acccode: parcode,
    txntype: 'outstandingdaysrequestbills',
    referrer: 'dashboard',
    action: 'partybills',
    prptype: prptype,
  };
  const response = await axios.get(`${API}/api/osdaysreqbills`, {
    headers: bearer(token),
    params: payload,
  });
  if (response.data.success) {
    const data = response.data.data;
    return { success: true, mainParData: data.mainpardata, bills: data.osbills || [] };
  }
  return { success: false, message: response.data.message || 'Failed to fetch bills' };
}

/** Approve (isauth 1) / reject (isauth 2). `payload` is built by model.buildEditPayload. */
export async function postEdit(API: string, token: string, payload: Row): Promise<{ success: boolean; message: any }> {
  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    'X-Requested-with': 'XMLHttpRequest',
  };
  const response = await axios.post(`${API}/api/osdaysreqedit`, payload, { headers });
  return { success: !!response.data.success, message: response.data.message };
}
