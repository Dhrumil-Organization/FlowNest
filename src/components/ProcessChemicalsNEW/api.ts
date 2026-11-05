// FILE: src/components/ProcessChemicalsNEW/api.ts
// Process Chemicals (Define Recipe) API adapter.
//
// Same conventions as StoreItemMasterNew/api.ts: Bearer token + server base URL (no trailing /api) come
// from ErpSessionGate, Laravel envelope { success, response: {...}, message }, server messages are shown as-is.
//
// DEMO MODE
//   While the Laravel controller is not deployed, USE_MOCK serves an in-memory copy of the reference
//   data (./mock.ts). It is ON unless EXPO_PUBLIC_PROCESS_CHEMICALS_MOCK=0 is set — set it to 0 (or flip the
//   default below) the day the backend is ready. The screen shows a "Demo data" banner while it is on, so a
//   demo build can never be mistaken for live data.
import axios from 'axios';
import { ChemOpt, GroupOpt, Lookups, BrowseRow, Opt, Recipe, RecipeLine, emptyLookups, emptyRecipe, lineCost, toNum } from './model';
import { mock } from './mock';

export const USE_MOCK = process.env.EXPO_PUBLIC_PROCESS_CHEMICALS_MOCK !== '0';

export const ENDPOINTS = {
  browse: '/api/process-chemicals/browse-data', // { type: 'lookups' } | { type: 'recipes' }
  show: '/api/process-chemicals/show-data', // { recipe_no }   (recipe_no: 0 -> next free number for Add)
  add: '/api/process-chemicals/add-data',
  modify: '/api/process-chemicals/modify-data',
  remove: '/api/process-chemicals/delete-data', // { recipe_no }
} as const;
/** Sent with EVERY request (same idea as 'store_item_master'). */
export const TXN_TYPE = 'process_chemicals';

export class ApiError extends Error {}

const headers = (token: string) => ({
  Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest',
});
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
/** The message the SERVER sent (success or error). */
export const serverMessage = (d: any): string =>
  firstText(d?.message) || firstText(d?.Message) || firstText(d?.msg) || firstText(d?.response?.message) || firstText(d?.errors) || firstText(d?.error);

export const messageOf = (e: any, fallback: string) =>
  e instanceof ApiError ? e.message
    : serverMessage(e?.response?.data) || (e?.request && !e?.response ? 'Network problem. Please check your internet connection and try again.' : e?.message) || fallback;

const bodyData = (res: any) => res?.data?.response ?? res?.data?.data ?? res?.data?.Data ?? res?.data ?? {};
const assertOk = (res: any) => {
  const d = res?.data;
  const failed = d?.success === false || d?.status === false || isFlag(d?.error) || isFlag(d?.response?.error) || d?.response?.success === false;
  if (failed) throw new ApiError(serverMessage(d) || 'The server rejected the request.');
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

export const uniq = (list: any[], idKeys: string[], labelKeys: string[]): Opt[] => {
  const seen = new Set<string>();
  const pick = (x: any, keys: string[]) => { for (const k of keys) if (x?.[k] !== undefined && x?.[k] !== null) return s(x[k]); return ''; };
  return (list ?? []).map((x) => ({ id: pick(x, idKeys), label: pick(x, labelKeys) }))
    .filter((o) => o.id !== '' && !seen.has(o.id) && !!seen.add(o.id));
};
export const toGroup = (x: any): GroupOpt => ({
  id: s(x.id ?? x.GrpCode ?? x.group_code), code: s(x.code ?? x.GrpCode ?? x.group_code ?? x.id),
  name: s(x.name ?? x.label ?? x.GrpName ?? x.group_name), calc: s(x.calc ?? x.calculation ?? x.CalcName ?? x.calc_name),
});
export const toChem = (x: any): ChemOpt => {
  const itemCode = s(x.item_code ?? x.ItmCode), make = s(x.make ?? x.MakName), model = s(x.model ?? x.Model);
  return { key: `${itemCode}|${make}|${model}`, itemCode, itemName: s(x.item_name ?? x.ItmName), make, model, uom: s(x.uom ?? x.UOM), rate: toNum(x.rate ?? x.Rate ?? x.LastRate) };
};
export const toLine = (x: any, i: number): RecipeLine => ({
  id: s(x.line_id ?? x.SrNo ?? x.id) || `line-${i}`,
  groupCode: s(x.group_code ?? x.GrpCode), groupName: s(x.group_name ?? x.GrpName), calc: s(x.calc ?? x.calculation ?? x.CalcName),
  itemCode: s(x.item_code ?? x.ItmCode), itemName: s(x.item_name ?? x.ItmName),
  make: s(x.make ?? x.MakName), model: s(x.model ?? x.Model), uom: s(x.uom ?? x.UOM),
  qty: s(x.qty ?? x.Qty), rate: toNum(x.rate ?? x.Rate), apiFields: { ...x },
});
const toRecipe = (r: any): Recipe => ({
  ...emptyRecipe(),
  recipeNo: s(r.recipe_no ?? r.RecipeNo ?? r.RcpNo),
  date: s(r.recipe_date ?? r.RecipeDate ?? r.RcpDate).slice(0, 10) || emptyRecipe().date,
  description: s(r.description ?? r.Description ?? r.RcpDesc),
  processCode: s(r.process_code ?? r.ProcessCode ?? r.PrcCode), processName: s(r.process_name ?? r.ProcessName ?? r.PrcName),
  itemCode: s(r.item_code ?? r.ItmCode) === '0' ? '' : s(r.item_code ?? r.ItmCode), itemName: s(r.item_name ?? r.ItmName),
  location: s(r.location ?? r.StrLoc), pageNo: s(r.page_no ?? r.PageNo) || '0', status: s(r.status ?? r.Status) || 'A',
  lines: (r.lines ?? r.Lines ?? []).map(toLine),
  apiFields: { ...r, lines: undefined, Lines: undefined },
});
const toBrowse = (r: any): BrowseRow => ({
  recipeNo: s(r.recipe_no ?? r.RecipeNo ?? r.RcpNo), date: s(r.recipe_date ?? r.date ?? r.RecipeDate ?? r.RcpDate).slice(0, 10),
  description: s(r.description ?? r.Description), process: s(r.process ?? r.process_name ?? r.ProcessName),
  color: s(r.color ?? r.Color ?? r.ColName), itemName: s(r.item_name ?? r.itemName ?? r.ItmName),
});

/** Recipe -> request body. Every line carries its derived cost so the server can store it unchanged. */
const toPayload = (r: Recipe, deletedLines: string[], originalNo = '') => ({
  ...(r.apiFields ?? {}),
  recipe_no: Number(r.recipeNo) || 0,
  // Modify: the number the recipe had when it was opened (the user may have edited Recipe no.)
  original_recipe_no: Number(originalNo) || Number(r.recipeNo) || 0,
  recipe_date: r.date,
  description: r.description.trim().toUpperCase(),
  process_code: r.processCode,
  item_code: r.itemCode || 0,
  location: r.location,
  page_no: Number(r.pageNo) || 0,
  status: r.status || 'A',
  lines: r.lines.map((l) => ({
    ...(l.apiFields ?? {}),
    line_id: /^new-/.test(l.id) ? 0 : Number(l.id) || 0,
    group_code: Number(l.groupCode) || 0,
    item_code: Number(l.itemCode) || 0,
    make: l.make, model: l.model, uom: l.uom,
    qty: toNum(l.qty), rate: toNum(l.rate), cost: lineCost(l),
  })),
  deleted_lines: deletedLines.map(Number).filter(Boolean),
});

/* -------------------------------- calls --------------------------------- */

export const fetchLookups = (API: string, token: string): Promise<Lookups> =>
  USE_MOCK ? mock.lookups() : wrap(async () => {
    const d = bodyData(await post(API, token, ENDPOINTS.browse, { type: 'lookups' }));
    const base = emptyLookups();
    return {
      processes: uniq(d.processes ?? d.process ?? [], ['id', 'PrcCode', 'ProcessCode'], ['label', 'name', 'PrcName', 'ProcessName']),
      items: uniq(d.items ?? [], ['id', 'ItmCode'], ['label', 'name', 'ItmName']),
      locations: uniq(d.locations ?? [], ['id', 'StrLoc'], ['label', 'name', 'LctName', 'StrLoc']),
      groups: (d.groups ?? []).map(toGroup).filter((g: GroupOpt) => g.id !== ''),
      chemicals: (d.chemicals ?? []).map(toChem).filter((c: ChemOpt) => c.itemCode !== ''),
      status: Array.isArray(d.status) && d.status.length ? uniq(d.status, ['id', 'Status'], ['label', 'StatusName']) : base.status,
    };
  }, 'Could not load the lists.');

export const fetchBrowse = (API: string, token: string): Promise<BrowseRow[]> =>
  USE_MOCK ? mock.browse() : wrap(async () => {
    const d = bodyData(await post(API, token, ENDPOINTS.browse, { type: 'recipes' }));
    const rows: any[] = Array.isArray(d) ? d : d.recipes ?? d.data ?? [];
    return rows.map(toBrowse).filter((r) => r.recipeNo !== '');
  }, 'Could not load the recipes.');

export const fetchRecipe = (API: string, token: string, recipeNo: string): Promise<Recipe> =>
  USE_MOCK
    ? mock.show(recipeNo).then((r) => { if (!r) throw new ApiError(`Recipe ${recipeNo} was not found.`); return r; })
    : wrap(async () => {
        const d = bodyData(await post(API, token, ENDPOINTS.show, { recipe_no: Number(recipeNo) || 0 }));
        const r = toRecipe(d.recipe ?? d);
        if (!r.recipeNo) throw new ApiError(`Recipe ${recipeNo} was not found.`);
        return r;
      }, 'Could not open the recipe.');

/** Next free recipe number for Add (show-data with recipe_no 0, same trick as Store Item Master). */
export const fetchNextNo = (API: string, token: string): Promise<string> =>
  USE_MOCK ? mock.nextNo() : wrap(async () => {
    const d = bodyData(await post(API, token, ENDPOINTS.show, { recipe_no: 0 }));
    return s(d.next_recipe_no ?? d.recipe_no ?? d.RecipeNo ?? d.recipe?.recipe_no);
  }, 'Could not get the next recipe number.');

export const saveRecipe = (API: string, token: string, r: Recipe, mode: 'add' | 'modify', deletedLines: string[], lookups: Lookups, originalNo = ''): Promise<{ recipe: Recipe | null; message: string }> =>
  USE_MOCK ? mock.save(r, mode, lookups, originalNo) : wrap(async () => {
    const res = await post(API, token, mode === 'add' ? ENDPOINTS.add : ENDPOINTS.modify, toPayload(r, deletedLines, originalNo));
    const d = bodyData(res);
    const saved = d?.recipe ?? (d?.recipe_no ? d : null);
    return { recipe: saved ? toRecipe(saved) : null, message: serverMessage(res.data) };
  }, 'Could not save the recipe.');

export const deleteRecipe = (API: string, token: string, recipeNo: string): Promise<string> =>
  USE_MOCK ? mock.remove(recipeNo) : wrap(async () => serverMessage((await post(API, token, ENDPOINTS.remove, { recipe_no: Number(recipeNo) || 0 })).data), 'Could not delete the recipe.');
