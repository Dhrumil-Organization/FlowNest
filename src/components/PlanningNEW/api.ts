// FILE: src/components/PlanningNEW/api.ts
// Yarn Dyeing › Planning API adapter.
// Same conventions as ProcessChemicalsNEW/api.ts: Bearer token + server base URL come from ErpSessionGate, Laravel
// envelope { success, response: {...}, message }, server messages are shown to the user as-is.
//
// DEMO MODE: USE_MOCK is ON unless EXPO_PUBLIC_PLANNING_MOCK=0. The screen shows a "Demo data" banner while it is on.
import axios from 'axios';
import { BrowseRow, Lookups, Opt, Plan, PlanLine, PlanType, SourceRow, emptyLookups, emptyPlan, lineQty, toNum, totalQty } from './model';
import { mock } from './mock';

export const USE_MOCK = process.env.EXPO_PUBLIC_PLANNING_MOCK !== '0';

export const ENDPOINTS = {
  browse: '/api/planning/browse-data', // { type: 'lookups' | 'plans' | 'sources' | 'shades' }
  show: '/api/planning/show-data', // { voucher_no }  (0 -> next free voucher number for Add)
  add: '/api/planning/add-data',
  modify: '/api/planning/modify-data',
  remove: '/api/planning/delete-data', // { voucher_no }
} as const;
export const TXN_TYPE = 'planning';

export class ApiError extends Error {}

const headers = (token: string) => ({ Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' });
const s = (v: any) => (v === null || v === undefined ? '' : String(v));
const isFlag = (v: any) => v === true || v === 'true' || v === 1 || v === '1';

const firstText = (v: any): string => {
  if (v === null || v === undefined) return '';
  if (typeof v === 'string') { const t = v.trim(); return t === 'true' || t === 'false' ? '' : t; }
  if (Array.isArray(v)) { for (const x of v) { const t = firstText(x); if (t) return t; } return ''; }
  if (typeof v === 'object') {
    for (const k of ['message', 'Message', 'msg', 'error_message']) { const t = firstText(v[k]); if (t) return t; }
    for (const x of Object.values(v)) { const t = firstText(x); if (t) return t; }
  }
  return '';
};
export const serverMessage = (d: any): string =>
  firstText(d?.message) || firstText(d?.Message) || firstText(d?.msg) || firstText(d?.response?.message) || firstText(d?.errors) || firstText(d?.error);
export const messageOf = (e: any, fallback: string) =>
  e instanceof ApiError ? e.message
    : serverMessage(e?.response?.data) || (e?.request && !e?.response ? 'Network problem. Please check your internet connection and try again.' : e?.message) || fallback;

const bodyData = (res: any) => res?.data?.response ?? res?.data?.data ?? res?.data?.Data ?? res?.data ?? {};
const assertOk = (res: any) => {
  const d = res?.data;
  if (d?.success === false || d?.status === false || isFlag(d?.error) || isFlag(d?.response?.error) || d?.response?.success === false) throw new ApiError(serverMessage(d) || 'The server rejected the request.');
};
const post = async (API: string, token: string, endpoint: string, body: any) => {
  const res = await axios.post(`${API}${endpoint}`, { ...body, txntype: TXN_TYPE }, { headers: headers(token), timeout: 30000 });
  assertOk(res);
  return res;
};
const wrap = async <T,>(fn: () => Promise<T>, fallback: string): Promise<T> => {
  try { return await fn(); } catch (e) { throw e instanceof ApiError ? e : new ApiError(messageOf(e, fallback)); }
};

/* ------------------------------- mappers -------------------------------- */
const opts = (list: any[], idKeys: string[], labelKeys: string[]): Opt[] => {
  const seen = new Set<string>();
  const pick = (x: any, keys: string[]) => { for (const k of keys) if (x?.[k] !== undefined && x?.[k] !== null) return s(x[k]); return ''; };
  return (list ?? []).map((x) => ({ id: pick(x, idKeys), label: pick(x, labelKeys) })).filter((o) => o.id !== '' && !seen.has(o.id) && !!seen.add(o.id));
};
const toSource = (x: any): SourceRow => {
  const kind = (s(x.kind ?? x.order_type ?? x.OrdType).toUpperCase() === 'JO' ? 'JO' : 'SO') as 'SO' | 'JO';
  const orderNo = s(x.order_no ?? x.OrderNo ?? x.so_no ?? x.jo_no), itemCode = s(x.item_code ?? x.ItmCode), shadeCode = s(x.shade_code ?? x.ShdCode);
  return {
    key: `${kind}|${orderNo}|${itemCode}|${shadeCode}`, kind, orderNo, orderDate: s(x.order_date ?? x.OrderDate ?? x.so_date ?? x.jo_date).slice(0, 10),
    partyCode: s(x.party_code ?? x.PrtCode), partyName: s(x.party_name ?? x.PrtName), itemCode, itemName: s(x.item_name ?? x.ItmName),
    shadeCode, shadeName: s(x.shade_name ?? x.ShdName), orderQty: toNum(x.order_qty ?? x.Qty), balance: toNum(x.balance ?? x.balance_qty ?? x.BalQty ?? x.order_qty), remarks: s(x.remarks ?? x.Remarks),
  };
};
const toLine = (x: any, i: number): PlanLine => {
  const qty = toNum(x.qty ?? x.Qty);
  return {
    id: s(x.line_id ?? x.SrNo ?? x.id) || `line-${i}`, kind: s(x.kind ?? x.order_type).toUpperCase() === 'JO' ? 'JO' : 'SO', orderNo: s(x.order_no ?? x.OrderNo),
    orderDate: s(x.order_date ?? x.OrderDate).slice(0, 10), partyCode: s(x.party_code ?? x.PrtCode), partyName: s(x.party_name ?? x.PrtName),
    itemCode: s(x.item_code ?? x.ItmCode), itemName: s(x.item_name ?? x.ItmName), shadeCode: s(x.shade_code ?? x.ShdCode), shadeName: s(x.shade_name ?? x.ShdName),
    orderQty: toNum(x.order_qty ?? x.OrderQty), available: toNum(x.available ?? x.balance ?? qty) || qty, qty: s(x.qty ?? x.Qty), remarks: s(x.remarks ?? x.Remarks), apiFields: { ...x },
  };
};
const toPlan = (r: any): Plan => ({
  ...emptyPlan(),
  prefix: s(r.prefix ?? r.voucher_prefix ?? r.VchPrefix), voucherNo: s(r.voucher_no ?? r.VchNo),
  date: s(r.voucher_date ?? r.VchDate).slice(0, 10) || emptyPlan().date,
  type: (['DYEING', 'CONING', 'CHECKING'].includes(s(r.type ?? r.job_name).toUpperCase()) ? s(r.type ?? r.job_name).toUpperCase() : 'DYEING') as PlanType,
  processCode: s(r.process_code ?? r.PrcCode), processName: s(r.process_name ?? r.PrcName),
  itemCode: s(r.item_code ?? r.ItmCode) === '0' ? '' : s(r.item_code ?? r.ItmCode), itemName: s(r.item_name ?? r.ItmName),
  shadeCode: s(r.shade_code ?? r.ShdCode) === '0' ? '' : s(r.shade_code ?? r.ShdCode), shadeName: s(r.shade_name ?? r.ShdName),
  mergeCode: s(r.merge_code ?? r.MrgCode), mergeName: s(r.merge_name ?? r.MrgName), machineCode: s(r.machine_code ?? r.McnCode), machineName: s(r.machine_name ?? r.McnName),
  remarks: s(r.remarks ?? r.Remarks), status: s(r.status ?? r.Status) || 'Pending', lines: (r.lines ?? r.Lines ?? []).map(toLine),
  apiFields: { ...r, lines: undefined, Lines: undefined },
});
const toBrowse = (r: any): BrowseRow => ({
  voucherNo: s(r.voucher_no ?? r.VchNo), prefix: s(r.prefix ?? r.VchPrefix), date: s(r.voucher_date ?? r.date ?? r.VchDate).slice(0, 10),
  type: s(r.type ?? r.job_name ?? r.JobName).toUpperCase(), process: s(r.process ?? r.process_name ?? r.PrcName), itemName: s(r.item_name ?? r.ItmName),
  shade: s(r.shade ?? r.shade_name ?? r.ShdName), machine: s(r.machine ?? r.machine_name ?? r.McnName), qty: toNum(r.qty ?? r.Qty ?? r.total_qty),
  party: s(r.party ?? r.party_name ?? r.SubPart), status: s(r.status) || 'Pending',
});

/** Plan -> request body. Total qty is always re-derived from the lines. */
const toPayload = (p: Plan, deletedLines: string[], originalNo = '') => ({
  ...(p.apiFields ?? {}),
  voucher_no: Number(p.voucherNo) || 0,
  original_voucher_no: Number(originalNo) || Number(p.voucherNo) || 0,
  voucher_date: p.date, type: p.type, process_code: p.processCode, item_code: p.itemCode || 0, shade_code: p.shadeCode || 0,
  merge_code: p.mergeCode || '', machine_code: p.machineCode, remarks: p.remarks.trim(), total_qty: totalQty(p.lines),
  lines: p.lines.map((l) => ({
    ...(l.apiFields ?? {}), line_id: /^new-/.test(l.id) ? 0 : Number(l.id) || 0, kind: l.kind, order_no: l.orderNo, order_date: l.orderDate,
    party_code: l.partyCode, item_code: l.itemCode, shade_code: l.shadeCode, qty: lineQty(l), remarks: l.remarks,
  })),
  deleted_lines: deletedLines.map(Number).filter(Boolean),
});

/* -------------------------------- calls --------------------------------- */
export const fetchLookups = (API: string, token: string): Promise<Lookups> =>
  USE_MOCK ? mock.lookups() : wrap(async () => {
    const d = bodyData(await post(API, token, ENDPOINTS.browse, { type: 'lookups' }));
    const base = emptyLookups();
    return {
      ...base,
      processes: opts(d.processes ?? [], ['id', 'PrcCode', 'process_code'], ['label', 'name', 'PrcName']),
      machines: (d.machines ?? []).map((m: any) => ({ id: s(m.id ?? m.McnCode), label: s(m.label ?? m.name ?? m.McnName), group: s(m.group ?? m.machine_group ?? m.McnGroup) })).filter((m: any) => m.id !== ''),
      merges: (d.merges ?? []).map((m: any) => ({ id: s(m.id ?? m.MrgCode), label: s(m.label ?? m.name ?? m.MrgName), stock: isFlag(m.stock ?? m.is_stock ?? m.stock_merge) })).filter((m: any) => m.id !== ''),
    };
  }, 'Could not load the lists.');

export const fetchBrowse = (API: string, token: string): Promise<BrowseRow[]> =>
  USE_MOCK ? mock.browse() : wrap(async () => {
    const d = bodyData(await post(API, token, ENDPOINTS.browse, { type: 'plans' }));
    return (Array.isArray(d) ? d : d.plans ?? d.data ?? []).map(toBrowse).filter((r: BrowseRow) => r.voucherNo !== '');
  }, 'Could not load the plans.');

/** Pending Sales Order / Job Order item rows (the Item help). */
export const fetchSources = (API: string, token: string, type: PlanType, processCode: string): Promise<SourceRow[]> =>
  USE_MOCK ? mock.sources() : wrap(async () => {
    const d = bodyData(await post(API, token, ENDPOINTS.browse, { type: 'sources', plan_type: type, process_code: processCode }));
    return (Array.isArray(d) ? d : d.sources ?? d.data ?? []).map(toSource).filter((r: SourceRow) => r.orderNo !== '');
  }, 'Could not load the orders.');

/** Unique shades of the selected items (the Shade help). */
export const fetchShades = (API: string, token: string, itemCodes: string[]): Promise<Opt[]> =>
  USE_MOCK ? mock.shades(itemCodes) : wrap(async () => {
    const d = bodyData(await post(API, token, ENDPOINTS.browse, { type: 'shades', item_codes: itemCodes }));
    return opts(Array.isArray(d) ? d : d.shades ?? [], ['id', 'ShdCode', 'shade_code'], ['label', 'name', 'ShdName', 'shade_name']);
  }, 'Could not load the shades.');

export const fetchPlan = (API: string, token: string, no: string): Promise<Plan> =>
  USE_MOCK ? mock.show(no).then((r) => { if (!r) throw new ApiError(`Planning ${no} was not found.`); return r; })
    : wrap(async () => {
      const d = bodyData(await post(API, token, ENDPOINTS.show, { voucher_no: Number(no) || 0 }));
      const r = toPlan(d.plan ?? d.voucher ?? d);
      if (!r.voucherNo) throw new ApiError(`Planning ${no} was not found.`);
      return r;
    }, 'Could not open the plan.');

export const fetchNextNo = (API: string, token: string): Promise<{ prefix: string; no: string }> =>
  USE_MOCK ? mock.next() : wrap(async () => {
    const d = bodyData(await post(API, token, ENDPOINTS.show, { voucher_no: 0 }));
    return { prefix: s(d.prefix ?? d.voucher_prefix), no: s(d.next_voucher_no ?? d.voucher_no ?? d.VchNo) };
  }, 'Could not get the next voucher number.');

export const savePlan = (API: string, token: string, p: Plan, mode: 'add' | 'modify', deletedLines: string[], originalNo = ''): Promise<{ plan: Plan | null; message: string }> =>
  USE_MOCK ? mock.save(p, mode, originalNo).then((plan) => ({ plan, message: '' })) : wrap(async () => {
    const res = await post(API, token, mode === 'add' ? ENDPOINTS.add : ENDPOINTS.modify, toPayload(p, deletedLines, originalNo));
    const d = bodyData(res);
    const saved = d?.plan ?? d?.voucher ?? (d?.voucher_no ? d : null);
    return { plan: saved ? toPlan(saved) : null, message: serverMessage(res.data) };
  }, 'Could not save the plan.');

export const deletePlan = (API: string, token: string, no: string): Promise<string> =>
  USE_MOCK ? mock.remove(no) : wrap(async () => serverMessage((await post(API, token, ENDPOINTS.remove, { voucher_no: Number(no) || 0 })).data), 'Could not delete the plan.');
