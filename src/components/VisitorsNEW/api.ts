// FILE: src/components/VisitorsNEW/api.ts
// ─────────────────────────────────────────────────────────────────────────
// EVERY HTTP call of the Visitor module (Visits + Visitors Report).
//
// Same flow as the other NEW ERP screens (DoffEntryNEW/api.ts,
// PriceListNEW/api.ts):
//   - host    = the `API` prop from ErpSessionGate  (apig / apiy)
//   - auth    = `Authorization: Bearer <token>` (token prop)
//   - prptype = AsyncStorage 'user_prptype', yearno = AsyncStorage 'yno'
//   - txntype = TXNTYPE below
//
// Backend: Laravel `VisitorController` (see backend/ in the delivery).
//
// ┌───────────────────────────────────────────────────────────────────────┐
// │ USE_MOCK = false → the real Laravel APIs below are called.            │
// │ USE_MOCK = true  → sample data from mockData.ts (no server needed;    │
// │                    handy for a demo before the backend is deployed).  │
// │ Nothing else in the two screens changes with this switch.             │
// └───────────────────────────────────────────────────────────────────────┘
//
// ENDPOINTS (all `${API}/api/...`, every reply is { success, message, response:{ data } }):
//   GET  visitor_visit_list      { prptype, txntype, fromdate, todate (YYYYMMDD), includeopen '0'|'1' } → Visit[]
//   POST visitor_visit_add       { prptype, txntype, yearno, visits: VisitPayload[] }                    → Visit[]  (one groupId)
//   POST visitor_visit_edit      { prptype, txntype, id, ...VisitPayload }                               → Visit
//   POST visitor_visit_checkout  { prptype, txntype, ids[], outat (ISO), outremark }                     → Visit[]
//   POST visitor_visit_undo_out  { prptype, txntype, id }                                                → Visit
//   POST visitor_visit_delete    { prptype, txntype, id }                                                → { id }
//   GET  visitor_search          { prptype, txntype, q }                                                 → VisitorProfile[]
//   GET  visitor_suggestions     { prptype, txntype }                                                    → VisitorSuggestions
//   GET  visitor_period_summary  { prptype, txntype, fromdate, todate, group day|month|year, status, purpose, host, q } → PeriodRow[] (without label)
//   POST visitor_photo_upload    { image: 'data:image/jpeg;base64,…', kind }  or multipart `file`        → { url }
//
// `Visit` / `VisitPayload` / `VisitorProfile` / `VisitorSuggestions` are in
// model.ts — the JSON keys are exactly those field names.
// Rights checked on the server too: production.visits → view / add / edit /
// checkout / delete, production.visitors_report → view / edit / delete / export.
// ─────────────────────────────────────────────────────────────────────────

import AsyncStorage from '@/common/utils/compatibleStorage';
import axios from 'axios';
import { aggregatePeriods, applyFilters, Filters, PeriodGroup, periodKeyLabel, PeriodRow } from '../VisitorsReportNEW/reportModel';
import { makeVisitNo, mockDelay, mockLoad, mockSave } from './mockData';
import {
  buildProfiles, buildSuggestions, cleanMobile, dayKey, NO_SUGGESTIONS, str, uid, Visit, VisitorProfile, VisitorSuggestions,
  VisitPayload, VisitPhoto,
} from './model';

export const USE_MOCK: boolean = false;
export const TXNTYPE = 'mob_visitor';

/**
 * `screen` tells the server which right to check for edit / delete:
 * 'visits' (watchman screen) or 'report' (Visitors Report).
 */
export type Api = { API: string; token: string; username?: string; screen?: 'visits' | 'report' };

const headers = (token: string) => ({
  Authorization: `Bearer ${token}`,
  'Content-Type': 'application/json',
  Accept: 'application/json',
  'X-Requested-With': 'XMLHttpRequest',
});

const base = async (api: Api) => ({
  prptype: await AsyncStorage.getItem('user_prptype'),
  yearno: await AsyncStorage.getItem('yno'),
  txntype: TXNTYPE,
  screen: api.screen || 'visits',
  username: api.username || '',
});

const ensureOk = (body: any) => {
  if (!body || body.success === false) throw new Error(body?.message || 'Request failed');
  return body;
};
const rows = (body: any): any[] => {
  if (Array.isArray(body?.response?.data)) return body.response.data;
  if (Array.isArray(body?.data)) return body.data;
  return [];
};
const one = (body: any) => body?.response?.data ?? body?.data ?? null;
const ymd = (d: Date) => dayKey(d).replace(/-/g, '');

/** Make sure a row from the server has every field the screens read. */
const normalize = (v: any): Visit => ({
  id: String(v?.id ?? ''),
  visitNo: str(v?.visitNo),
  groupId: str(v?.groupId),
  groupSize: Number(v?.groupSize) || 1,
  name: str(v?.name),
  mobile: str(v?.mobile),
  altMobile: str(v?.altMobile),
  designation: str(v?.designation),
  gender: (['M', 'F', 'O'].includes(v?.gender) ? v.gender : '') as Visit['gender'],
  company: str(v?.company),
  purpose: str(v?.purpose),
  purposeNote: str(v?.purposeNote),
  hostName: str(v?.hostName),
  appointment: (v?.appointment === 'Y' || v?.appointment === 'N' ? v.appointment : '') as Visit['appointment'],
  extraPersons: Number(v?.extraPersons) || 0,
  remarks: str(v?.remarks),
  inAt: str(v?.inAt),
  outAt: v?.outAt ? String(v.outAt) : null,
  outRemark: str(v?.outRemark),
  photos: Array.isArray(v?.photos)
    ? v.photos.filter((p: any) => p && p.uri).map((p: any) => ({ id: String(p.id), kind: (p.kind === 'visitor' || p.kind === 'card' ? p.kind : 'other') as VisitPhoto['kind'], uri: String(p.uri), takenAt: str(p.takenAt) }))
    : [],
  prpCode: str(v?.prpCode),
  createdBy: str(v?.createdBy),
  createdAt: str(v?.createdAt),
  updatedBy: str(v?.updatedBy),
  updatedAt: str(v?.updatedAt),
  checkedOutBy: str(v?.checkedOutBy),
});

export const apiErrorText = (error: any): string => {
  const data = error?.response?.data;
  // Laravel validation: { message, errors: { field: [text] } }
  const first = data?.errors ? (Object.values(data.errors)[0] as any)?.[0] : '';
  return first || data?.message || error?.message || 'Something went wrong. Please try again.';
};

const who = (api: Api) => str(api.username) || 'User';
const byInDesc = (a: Visit, b: Visit) => (a.inAt < b.inAt ? 1 : a.inAt > b.inAt ? -1 : 0);

/* -------------------------------------------------------------------------- */
/* Photo upload — one request per NEW photo, returns the server URL.           */
/* Photos already on the server (http…) are passed through unchanged.          */
/* -------------------------------------------------------------------------- */

export async function uploadVisitPhoto(api: Api, photo: VisitPhoto): Promise<VisitPhoto> {
  if (/^https?:/i.test(photo.uri)) return photo;
  const common = await base(api);
  let body: any;
  if (photo.uri.startsWith('data:')) {
    // normal case: photos.ts returns a small JPEG as a data: URI
    const response = await axios.post(`${api.API}/api/visitor_photo_upload`, { ...common, kind: photo.kind, image: photo.uri }, {
      headers: headers(api.token),
    });
    body = response.data;
  } else {
    // fallback: a file:// URI (the phone could not make base64)
    const form = new FormData();
    form.append('file', { uri: photo.uri, name: `visitor_${Date.now()}.jpg`, type: 'image/jpeg' } as any);
    form.append('kind', photo.kind);
    form.append('txntype', TXNTYPE);
    form.append('prptype', String(common.prptype ?? ''));
    const response = await axios.post(`${api.API}/api/visitor_photo_upload`, form, {
      headers: { Authorization: `Bearer ${api.token}`, Accept: 'application/json', 'Content-Type': 'multipart/form-data' },
    });
    body = response.data;
  }
  const url = one(ensureOk(body))?.url;
  if (!url) throw new Error('Photo upload failed. Please try again.');
  return { ...photo, uri: String(url) };
}

const uploadAll = (api: Api, photos: VisitPhoto[]) => Promise.all(photos.map((p) => uploadVisitPhoto(api, p)));

/* -------------------------------------------------------------------------- */
/* Visits for a date range (inclusive). Used by BOTH screens.                  */
/* includeOpen = also return everybody who is STILL INSIDE, whatever the day   */
/* (so nobody who has not left can be missed at the gate).                     */
/* -------------------------------------------------------------------------- */

export async function fetchVisits(api: Api, from: Date, to: Date, opts?: { includeOpen?: boolean }): Promise<Visit[]> {
  if (USE_MOCK) {
    await mockDelay();
    const a = dayKey(from);
    const b = dayKey(to);
    const all = await mockLoad();
    return all
      .filter((v) => {
        const k = dayKey(v.inAt);
        return (k >= a && k <= b) || (!!opts?.includeOpen && !v.outAt);
      })
      .sort(byInDesc);
  }
  const response = await axios.get(`${api.API}/api/visitor_visit_list`, {
    headers: headers(api.token),
    params: { ...(await base(api)), fromdate: ymd(from), todate: ymd(to), includeopen: opts?.includeOpen ? '1' : '0' },
  });
  return rows(ensureOk(response.data)).map(normalize).sort(byInDesc);
}

/* -------------------------------------------------------------------------- */
/* New entry — one or MANY people who came together (one groupId).             */
/* -------------------------------------------------------------------------- */

export async function addVisits(api: Api, payloads: VisitPayload[]): Promise<Visit[]> {
  if (USE_MOCK) {
    await mockDelay(450);
    const all = await mockLoad();
    const groupId = uid('g');
    const nowIso = new Date().toISOString();
    const created: Visit[] = payloads.map((p, i) => {
      const inDate = new Date(p.inAt);
      const serial = all.filter((v) => dayKey(v.inAt) === dayKey(inDate)).length + i + 1;
      return {
        ...p,
        id: uid('v'),
        visitNo: makeVisitNo(inDate, serial),
        groupId,
        groupSize: payloads.length,
        outAt: null,
        outRemark: '',
        prpCode: '',
        createdBy: who(api),
        createdAt: nowIso,
        updatedBy: '',
        updatedAt: '',
        checkedOutBy: '',
      };
    });
    await mockSave([...created, ...all]);
    return created;
  }
  // photos first (each becomes a URL), then the entry itself
  const visits = await Promise.all(payloads.map(async (p) => ({ ...p, photos: await uploadAll(api, p.photos) })));
  const response = await axios.post(`${api.API}/api/visitor_visit_add`, { ...(await base(api)), visits }, {
    headers: headers(api.token),
  });
  return rows(ensureOk(response.data)).map(normalize);
}

/* -------------------------------------------------------------------------- */
/* Edit one visit (one person). Photos removed in the form are deleted on the  */
/* server, new ones are uploaded.                                              */
/* -------------------------------------------------------------------------- */

export async function updateVisit(api: Api, id: string, payload: VisitPayload): Promise<Visit> {
  if (USE_MOCK) {
    await mockDelay(400);
    const all = await mockLoad();
    const cur = all.find((v) => v.id === id);
    if (!cur) throw new Error('This entry was not found. Please refresh.');
    const next: Visit = { ...cur, ...payload, updatedBy: who(api), updatedAt: new Date().toISOString() };
    await mockSave(all.map((v) => (v.id === id ? next : v)));
    return next;
  }
  const photos = await uploadAll(api, payload.photos);
  const response = await axios.post(`${api.API}/api/visitor_visit_edit`, { ...(await base(api)), id, ...payload, photos }, {
    headers: headers(api.token),
  });
  return normalize(one(ensureOk(response.data)));
}

/* -------------------------------------------------------------------------- */
/* Check-out (OUT time) — one person or several in one tap.                    */
/* -------------------------------------------------------------------------- */

export async function checkoutVisits(api: Api, ids: string[], outAt: Date, outRemark: string): Promise<Visit[]> {
  if (USE_MOCK) {
    await mockDelay(300);
    const all = await mockLoad();
    const set = new Set(ids);
    const changed: Visit[] = [];
    const next = all.map((v) => {
      if (!set.has(v.id) || v.outAt) return v;
      const x: Visit = { ...v, outAt: outAt.toISOString(), outRemark: str(outRemark), checkedOutBy: who(api) };
      changed.push(x);
      return x;
    });
    await mockSave(next);
    return changed;
  }
  const response = await axios.post(`${api.API}/api/visitor_visit_checkout`, {
    ...(await base(api)), ids, outat: outAt.toISOString(), outremark: outRemark,
  }, { headers: headers(api.token) });
  return rows(ensureOk(response.data)).map(normalize);
}

/** OUT was pressed by mistake → the person is shown as inside again. */
export async function undoCheckout(api: Api, id: string): Promise<Visit> {
  if (USE_MOCK) {
    await mockDelay(250);
    const all = await mockLoad();
    const cur = all.find((v) => v.id === id);
    if (!cur) throw new Error('This entry was not found. Please refresh.');
    const next: Visit = { ...cur, outAt: null, outRemark: '', checkedOutBy: '', updatedBy: who(api), updatedAt: new Date().toISOString() };
    await mockSave(all.map((v) => (v.id === id ? next : v)));
    return next;
  }
  const response = await axios.post(`${api.API}/api/visitor_visit_undo_out`, { ...(await base(api)), id }, {
    headers: headers(api.token),
  });
  return normalize(one(ensureOk(response.data)));
}

/* -------------------------------------------------------------------------- */
/* Delete a wrong entry (with its photos).                                     */
/* -------------------------------------------------------------------------- */

export async function deleteVisit(api: Api, id: string): Promise<void> {
  if (USE_MOCK) {
    await mockDelay(300);
    const all = await mockLoad();
    await mockSave(all.filter((v) => v.id !== id));
    return;
  }
  const response = await axios.post(`${api.API}/api/visitor_visit_delete`, { ...(await base(api)), id }, {
    headers: headers(api.token),
  });
  ensureOk(response.data);
}

/* -------------------------------------------------------------------------- */
/* "Came before?" — people from EARLIER VISITS (not a master) matching a       */
/* mobile number, name or company. The form fills itself from the result.      */
/* -------------------------------------------------------------------------- */

export async function searchVisitors(api: Api, query: string): Promise<VisitorProfile[]> {
  const q = str(query).toLowerCase();
  if (USE_MOCK) {
    await mockDelay(150);
    const profiles = buildProfiles(await mockLoad());
    if (!q) return profiles.slice(0, 40);
    const digits = cleanMobile(q);
    return profiles
      .filter((p) => (digits.length >= 4 && p.mobile.includes(digits)) || `${p.name} ${p.company}`.toLowerCase().includes(q))
      .slice(0, 40);
  }
  const response = await axios.get(`${api.API}/api/visitor_search`, {
    headers: headers(api.token),
    params: { ...(await base(api)), q },
  });
  return rows(ensureOk(response.data)) as VisitorProfile[];
}

/* -------------------------------------------------------------------------- */
/* Words used in earlier visits (company, whom to meet) → tap-to-fill           */
/* suggestions under the free-text fields.                                     */
/* -------------------------------------------------------------------------- */

export async function fetchSuggestions(api: Api): Promise<VisitorSuggestions> {
  if (USE_MOCK) {
    await mockDelay(120);
    return buildSuggestions(await mockLoad());
  }
  const response = await axios.get(`${api.API}/api/visitor_suggestions`, {
    headers: headers(api.token),
    params: await base(api),
  });
  const d = one(ensureOk(response.data)) || {};
  const list = (x: any): string[] => (Array.isArray(x) ? x.map(str).filter(Boolean) : []);
  return {
    ...NO_SUGGESTIONS,
    companies: list(d.companies),
    hosts: list(d.hosts),
  };
}

/* -------------------------------------------------------------------------- */
/* Day-wise / month-wise / year-wise totals, counted on the server so a whole  */
/* year (or every year) does not have to be downloaded row by row.             */
/* The same search + filters as the report screen are applied.                 */
/* -------------------------------------------------------------------------- */

export async function fetchPeriodSummary(
  api: Api, from: Date, to: Date, group: PeriodGroup, filters: Filters, query: string,
): Promise<PeriodRow[]> {
  if (USE_MOCK) {
    await mockDelay(200);
    const a = dayKey(from);
    const b = dayKey(to);
    const now = new Date();
    const all = (await mockLoad()).filter((v) => { const k = dayKey(v.inAt); return k >= a && k <= b; });
    return aggregatePeriods(applyFilters(all, filters, query, now), group, now);
  }
  const response = await axios.get(`${api.API}/api/visitor_period_summary`, {
    headers: headers(api.token),
    params: {
      ...(await base(api)), fromdate: ymd(from), todate: ymd(to), group,
      status: filters.status, purpose: filters.purpose, host: filters.host, q: str(query),
    },
  });
  return rows(ensureOk(response.data)).map((r: any): PeriodRow => ({
    key: String(r.key),
    label: periodKeyLabel(String(r.key), group),
    visits: Number(r.visits) || 0,
    persons: Number(r.persons) || 0,
    unique: Number(r.unique) || 0,
    out: Number(r.out) || 0,
    inside: Number(r.inside) || 0,
    avgStay: Number(r.avgStay) || 0,
    stay: Number(r.stay) || (Number(r.avgStay) || 0) * (Number(r.out) || 0),
  })).sort((x, y) => (x.key < y.key ? -1 : 1));
}
