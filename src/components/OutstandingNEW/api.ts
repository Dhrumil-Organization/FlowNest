// FILE: src/components/OutstandingNEW/api.ts
// Every HTTP call of the three "outstanding dashboard" screens of the ERP:
//
//   Receivables          (Rayons)          legacy: components/Receivables/index.tsx        route app/(tabs)/receivables.tsx
//   Receivables Sudamo   (Sudamo / Knits)  legacy: components/ReceivablesSudamo/index.tsx  route app/(tabs)/receivables-sudamo.tsx
//   Payable                                legacy: components/Payable/index.tsx            route app/(tabs)/payable.tsx
//
// Same URL paths, methods, headers, param / body keys (and key order) and
// response paths as legacy. The only change: the `API` host and the `token`
// come in as arguments (ErpSessionGate) instead of the global `API` import.
//
//   GET  /api/dashprpgrp        { txntype }                                         -> data.data.dashlastsync, data.data.prpgroup
//   GET  /api/dashprp           { prptype, txntype }                                -> data.data.prp
//   GET  /api/get_criterion     { prptype, fetch:'dr', dashview, txntype }          -> data.response.data   (parties)
//   GET  /api/get_criterion     { prptype, dashview, fetch:'salesexe' }             -> data.response.data   (sales executives)
//   POST /api/get_dashoutshead  { prptype, dashview, prpcodes }                     -> data.data.data       (sub heads)
//   POST /api/dashdata          summary / slabdetail payload (see model.ts)         -> data.data.dashoutcards / outdetail / outsummary
//
// txntype  = '/receivables-view' (both receivables screens) | '/payable-view'
// dashview = 'outstanding'       (both receivables screens) | 'payable'
import axios from 'axios';
import type { Row, Variant } from './model';

/** Legacy headers of the criterion GET calls. */
const criterionHeaders = (token: string) => ({
  Authorization: `Bearer ${token}`,
  'Content-Type': 'application/javascript',
  Accept: 'application/json',
});

/** Legacy headers of the two POST calls. */
const postHeaders = (token: string) => ({
  Authorization: `Bearer ${token}`,
  'Content-Type': 'application/json',
  'X-Requested-with': 'XMLHttpRequest',
});

const list = (v: any): Row[] => (Array.isArray(v) ? v : []);

export type SyncInfo = { lastSync: string; groups: Row[] };

/** Last sync time + property groups. Returns null when the API answers success !== true (legacy: keep what is shown). */
export async function fetchSync(API: string, token: string, v: Variant): Promise<SyncInfo | null> {
  const res = await axios.get(`${API}/api/dashprpgrp`, {
    // legacy: Receivables sent Authorization only, Payable sent the full criterion headers
    headers: v.fullSyncHeaders ? criterionHeaders(token) : { Authorization: `Bearer ${token}` },
    params: { txntype: v.txntype },
  });
  if (res.data?.success !== true) return null;
  return {
    lastSync: res.data.data?.dashlastsync || '',
    groups: list(res.data.data?.prpgroup),
  };
}

/** Properties of a property group. null = API said no (legacy: list stays as it was). */
export async function fetchProperties(API: string, token: string, v: Variant, prptype: any): Promise<Row[] | null> {
  const payload = { prptype, txntype: v.txntype };
  const res = await axios.get(`${API}/api/dashprp`, { headers: criterionHeaders(token), params: { ...payload } });
  return res.data?.success === true ? list(res.data.data?.prp) : null;
}

/** Parties of a property group. */
export async function fetchParties(API: string, token: string, v: Variant, prptype: any): Promise<Row[] | null> {
  const payload = { prptype, fetch: 'dr', dashview: v.dashview, txntype: v.txntype };
  const res = await axios.get(`${API}/api/get_criterion`, { headers: criterionHeaders(token), params: { ...payload } });
  return res.data?.success === true ? list(res.data.response?.data) : null;
}

/** Sales executives of a property group. */
export async function fetchSalesExecutives(API: string, token: string, v: Variant, prptype: any): Promise<Row[] | null> {
  const payloadSexe = { prptype, dashview: v.dashview, fetch: 'salesexe' };
  const res = await axios.get(`${API}/api/get_criterion`, { headers: criterionHeaders(token), params: { ...payloadSexe } });
  return res.data?.success === true ? list(res.data.response?.data) : null;
}

/** Sub heads of the selected properties. */
export async function fetchSubHeads(
  API: string,
  token: string,
  v: Variant,
  prptype: any,
  prpcodes: string[],
): Promise<Row[] | null> {
  const payload = { prptype, dashview: v.dashview, prpcodes };
  const res = await axios.post(`${API}/api/get_dashoutshead`, payload, { headers: postHeaders(token) });
  return res.data?.success === true ? list(res.data.data?.data) : null;
}

export type DashData = { success: boolean; cards: Row[]; details: Row[]; summary: Row[] };

/** The dashboard itself (Load = fetch 'summary', card tap = fetch 'slabdetail'). */
export async function postDashData(API: string, token: string, payload: Row): Promise<DashData> {
  const res = await axios.post(`${API}/api/dashdata`, payload, { headers: postHeaders(token) });
  return {
    success: res.data?.success == true, // legacy used ==
    cards: list(res.data?.data?.dashoutcards),
    details: list(res.data?.data?.outdetail),
    summary: list(res.data?.data?.outsummary),
  };
}

/** Message worth showing to the user for a failed request. */
export const errorText = (e: any): string =>
  String(e?.response?.data?.message || e?.message || 'Unable to reach the server. Please try again.');
