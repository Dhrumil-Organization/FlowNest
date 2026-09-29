// FILE: src/components/StockVerificationNEW/verificationApi.ts
// All HTTP calls of the stock verification screens — same URLs, params and
// headers as the legacy screens + common/API/Functions.tsx helpers, but using
// the ErpSessionGate host/token and the dynamic prptype.
import { PRINTSTICKER } from '@/common/API/dynamicAPI';
import axios from 'axios';
import {
  Filter, loadPayload, Manual, masterParams, pickList, printPayload, Row, updatePayload, VerifyConfig, insertPayload,
} from './verificationModel';

export type Api = { API: string; token: string; prptype: string; cfg: VerifyConfig };

const jsonHeaders = (token: string) => ({
  Authorization: `Bearer ${token}`,
  'Content-Type': 'application/json',
  'X-Requested-with': 'XMLHttpRequest',
});
const getHeaders = (token: string) => ({
  Authorization: `Bearer ${token}`,
  'Content-Type': 'application/json',
  Accept: 'application/json',
});
// legacy fetchAll* helpers send this content type
const masterHeaders = (token: string) => ({
  Authorization: `Bearer ${token}`,
  'Content-Type': 'application/javascript',
  Accept: 'application/json',
});

/* ------------------------ property / year / store ---------------------- */

/** legacy fetchAllPropertyData: get_criterion?prptype=<user>&txntype=''&fetch=prp */
export async function fetchProperties({ API, token, prptype }: Api): Promise<Row[]> {
  const url = `${API}/api/get_criterion?prptype=${encodeURIComponent(prptype)}&txntype=''&fetch=prp`;
  const r = await axios.get(url, { headers: masterHeaders(token) });
  return pickList(r?.data);
}

/** legacy fetchAllYeardata: GET getyear { prpcode } */
export async function fetchYears({ API, token }: Api, prpcode: string): Promise<Row[]> {
  const r = await axios.get(`${API}/api/getyear`, { headers: masterHeaders(token), params: { prpcode } });
  return pickList(r?.data);
}

/** legacy fetchAllStoredata: GET getstore { prpcode, yearno, txntype:'', prptype } (x-platform: mob) */
export async function fetchStores({ API, token, prptype }: Api, prpcode: string, yearno: string): Promise<Row[]> {
  const r = await axios.get(`${API}/api/getstore`, {
    headers: { ...masterHeaders(token), 'x-platform': 'mob' },
    params: { prpcode, yearno, txntype: '', prptype },
  });
  return pickList(r?.data);
}

/* ------------------------------ stock ---------------------------------- */

export type Result<T> = { ok: true; data: T } | { ok: false; message: string; empty?: boolean };

const msg = (d: any) => String(d?.message || 'Something went wrong');

/** POST get_verify_manual_(fabric_)stock → rows (response.data.response.data) */
export async function loadStock(a: Api, f: Filter, ctx?: { PrpCode: string; YearNo: string; StrCode: string }): Promise<Result<Row[]>> {
  const payload = loadPayload(a.cfg, a.prptype, f, ctx);
  console.log(`[${a.cfg.title}] ${a.cfg.endpoints.load} ->`, payload);
  const r = await axios.post(`${a.API}/api/${a.cfg.endpoints.load}`, payload, { headers: jsonHeaders(a.token) });
  const d = r?.data;
  if (d?.success === true) {
    const rows = Array.isArray(d?.response?.data) ? d.response.data : [];
    return rows.length ? { ok: true, data: rows } : { ok: false, empty: true, message: 'No Data Found' };
  }
  return { ok: false, message: msg(d) };
}

/** POST update_verify_manual_(fabric_)stock → saved UId (data[0].UId) */
export async function verifyRow(a: Api, f: Filter, row: Row): Promise<Result<Row>> {
  const payload = updatePayload(a.cfg, a.prptype, f, row);
  console.log(`[${a.cfg.title}] ${a.cfg.endpoints.update} ->`, payload);
  const r = await axios.post(`${a.API}/api/${a.cfg.endpoints.update}`, payload, { headers: jsonHeaders(a.token) });
  const d = r?.data;
  if (d?.success === true) {
    const list = Array.isArray(d?.data) ? d.data : [];
    return list.length ? { ok: true, data: list[0] } : { ok: false, empty: true, message: 'No Data Found' };
  }
  return { ok: false, message: msg(d) };
}

/** POST insert_verify_manual_(fabric_)stock → inserted rows (data) */
export async function insertManual(a: Api, m: Manual): Promise<Result<Row[]>> {
  const payload = insertPayload(a.cfg, a.prptype, m);
  console.log(`[${a.cfg.title}] ${a.cfg.endpoints.insert} ->`, payload);
  const r = await axios.post(`${a.API}/api/${a.cfg.endpoints.insert}`, payload, { headers: jsonHeaders(a.token) });
  const d = r?.data;
  if (d?.success === true) {
    const list = Array.isArray(d?.data) ? d.data : [];
    return list.length ? { ok: true, data: list } : { ok: false, empty: true, message: 'No Data Found' };
  }
  return { ok: false, message: msg(d) };
}

/** POST PRINTSTICKER (print-grey-in-stock) */
export async function printRow(a: Api, f: Filter, row: Row): Promise<Result<number>> {
  const params = printPayload(a.cfg, f, row);
  console.log(`[${a.cfg.title}] print ->`, params);
  try {
    const r = await axios.post(`${PRINTSTICKER}`, params, { headers: jsonHeaders(a.token) });
    const res = r?.data;
    if (res?.success) return { ok: true, data: Number(res?.printed ?? 1) };
    return { ok: false, message: res?.message || 'Operation failed' };
  } catch (e: any) {
    return { ok: false, message: e?.response?.data?.error || e?.message || 'Print failed' };
  }
}

/* --------------------------- manual masters ---------------------------- */

export type Masters = { items: Row[]; merges: Row[]; grades: Row[]; shades: Row[]; designs: Row[] };

const drop = async (a: Api, ep: string, params: any): Promise<Row[]> => {
  try {
    const r = await axios.get(`${a.API}/api/${ep}`, { headers: getHeaders(a.token), params });
    return pickList(r?.data);
  } catch (e: any) {
    console.log(`[${a.cfg.title}] ${ep} error`, e?.message);
    return [];
  }
};

export async function fetchMasters(a: Api, m: Pick<Manual, 'PrpCode' | 'YearNo' | 'StrCode'>): Promise<Masters> {
  const p = masterParams(a.cfg, m);
  const [items, merges, grades, shades, designs] = await Promise.all([
    drop(a, 'itemdrop', p.itemdrop),
    a.cfg.kind === 'yarn' ? drop(a, 'mergedrop', p.mergedrop) : Promise.resolve([] as Row[]),
    drop(a, 'gradedrop', p.gradedrop),
    drop(a, 'shadedrop', p.shadedrop),
    a.cfg.kind === 'fabric' ? drop(a, 'designdrop', p.designdrop) : Promise.resolve([] as Row[]),
  ]);
  return { items, merges, grades, shades, designs };
}
