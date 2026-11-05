// FILE: src/components/ShadeRecipeNEW/api.ts
// Shade Recipe API adapter — same conventions as ProcessChemicalsNEW/api.ts (Bearer token + base URL from
// ErpSessionGate, Laravel envelope { success, response, message }, server messages shown as-is).
//
// DEMO MODE: USE_MOCK is ON unless EXPO_PUBLIC_SHADE_RECIPE_MOCK=0. The screen shows a "Demo data" banner
// while it is on. Set the variable to 0 (or change the default) when the Laravel controller is live.
import axios from 'axios';
// mappers for lookups / chemical lines are REUSED (lines are identical to Process Chemicals)
import { ApiError, messageOf, serverMessage, toChem, toGroup, toLine, uniq } from '../ProcessChemicalsNEW/api';
import type { ChemOpt, GroupOpt } from '../ProcessChemicalsNEW/model';
import { BrowseRow, Lookups, ShadeOpt, ShadeRecipe, emptyLookups, emptyRecipe, lineCost, toNum } from './model';
import { mock } from './mock';

export { ApiError };
export const USE_MOCK = process.env.EXPO_PUBLIC_SHADE_RECIPE_MOCK !== '0';

export const ENDPOINTS = {
  browse: '/api/shade-recipe/browse-data', // { type: 'lookups' } | { type: 'recipes' }
  show: '/api/shade-recipe/show-data', // { recipe_no }  (0 -> next free number for Add)
  add: '/api/shade-recipe/add-data',
  modify: '/api/shade-recipe/modify-data',
  remove: '/api/shade-recipe/delete-data',
} as const;
export const TXN_TYPE = 'shade_recipe';

const headers = (token: string) => ({ Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' });
const s = (v: any) => (v === null || v === undefined ? '' : String(v));
const isFlag = (v: any) => v === true || v === 'true' || v === 1 || v === '1';
const bodyData = (res: any) => res?.data?.response ?? res?.data?.data ?? res?.data?.Data ?? res?.data ?? {};
const assertOk = (res: any) => {
  const d = res?.data;
  if (d?.success === false || d?.status === false || isFlag(d?.error) || isFlag(d?.response?.error) || d?.response?.success === false)
    throw new ApiError(serverMessage(d) || 'The server rejected the request.');
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
const toShade = (x: any): ShadeOpt => ({
  id: s(x.id ?? x.ShdCode ?? x.shade_code), label: s(x.label ?? x.name ?? x.ShdName ?? x.shade_name),
  itemCode: s(x.item_code ?? x.ItmCode) === '0' ? '' : s(x.item_code ?? x.ItmCode), itemName: s(x.item_name ?? x.ItmName),
  range: s(x.range ?? x.ShdRange ?? x.shade_range), color: s(x.color ?? x.Color ?? x.ColName),
});
const toRecipe = (r: any): ShadeRecipe => ({
  ...emptyRecipe(),
  recipeNo: s(r.recipe_no ?? r.RecipeNo ?? r.RcpNo),
  date: s(r.recipe_date ?? r.RecipeDate ?? r.RcpDate).slice(0, 10) || emptyRecipe().date,
  description: s(r.description ?? r.Description ?? r.RcpDesc),
  shadeCode: s(r.shade_code ?? r.ShdCode) === '0' ? '' : s(r.shade_code ?? r.ShdCode), shadeName: s(r.shade_name ?? r.ShdName),
  itemCode: s(r.item_code ?? r.ItmCode) === '0' ? '' : s(r.item_code ?? r.ItmCode), itemName: s(r.item_name ?? r.ItmName),
  color: s(r.color ?? r.Color), range: s(r.shade_range ?? r.range ?? r.ShdRange),
  location: s(r.location ?? r.StrLoc), pageNo: s(r.page_no ?? r.PageNo) || '0', status: s(r.status ?? r.Status) || 'A',
  lines: (r.lines ?? r.Lines ?? []).map(toLine),
  apiFields: { ...r, lines: undefined, Lines: undefined },
});
const toBrowse = (r: any): BrowseRow => ({
  recipeNo: s(r.recipe_no ?? r.RecipeNo ?? r.RcpNo), date: s(r.recipe_date ?? r.date ?? r.RecipeDate ?? r.RcpDate).slice(0, 10),
  description: s(r.description ?? r.Description), shadeName: s(r.shade_name ?? r.shdname ?? r.ShdName), color: s(r.color ?? r.Color ?? r.ColName),
  range: s(r.range ?? r.shade_range ?? r.ShdRange), itemName: s(r.item_name ?? r.itmname ?? r.ItmName),
});
const toPayload = (r: ShadeRecipe, deletedLines: string[], originalNo = '') => ({
  ...(r.apiFields ?? {}),
  recipe_no: Number(r.recipeNo) || 0,
  // Modify: the number the recipe had when it was opened (the user may have edited Recipe no.)
  original_recipe_no: Number(originalNo) || Number(r.recipeNo) || 0,
  recipe_date: r.date,
  description: r.description.trim().toUpperCase(),
  shade_code: Number(r.shadeCode) || 0,
  item_code: Number(r.itemCode) || 0,
  color: r.color,
  shade_range: r.range,
  location: r.location,
  page_no: Number(r.pageNo) || 0,
  status: r.status || 'A',
  lines: r.lines.map((l) => ({
    ...(l.apiFields ?? {}),
    line_id: /^new-/.test(l.id) ? 0 : Number(l.id) || 0,
    group_code: Number(l.groupCode) || 0, item_code: Number(l.itemCode) || 0,
    make: l.make, model: l.model, uom: l.uom, qty: toNum(l.qty), rate: toNum(l.rate), cost: lineCost(l),
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
      shades: (d.shades ?? []).map(toShade).filter((x: ShadeOpt) => x.id !== ''),
      items: uniq(d.items ?? [], ['id', 'ItmCode'], ['label', 'name', 'ItmName']),
      ranges: Array.isArray(d.ranges) && d.ranges.length ? uniq(d.ranges, ['id', 'ShdRange'], ['label', 'name', 'ShdRange']) : base.ranges,
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

export const fetchRecipe = (API: string, token: string, recipeNo: string): Promise<ShadeRecipe> =>
  USE_MOCK
    ? mock.show(recipeNo).then((r) => { if (!r) throw new ApiError(`Recipe ${recipeNo} was not found.`); return r; })
    : wrap(async () => {
        const d = bodyData(await post(API, token, ENDPOINTS.show, { recipe_no: Number(recipeNo) || 0 }));
        const r = toRecipe(d.recipe ?? d);
        if (!r.recipeNo) throw new ApiError(`Recipe ${recipeNo} was not found.`);
        return r;
      }, 'Could not open the recipe.');

/** Next free recipe number for Add (show-data with recipe_no 0). */
export const fetchNextNo = (API: string, token: string): Promise<string> =>
  USE_MOCK ? mock.nextNo() : wrap(async () => {
    const d = bodyData(await post(API, token, ENDPOINTS.show, { recipe_no: 0 }));
    return s(d.next_recipe_no ?? d.recipe_no ?? d.RecipeNo ?? d.recipe?.recipe_no);
  }, 'Could not get the next recipe number.');

export const saveRecipe = (API: string, token: string, r: ShadeRecipe, mode: 'add' | 'modify', deletedLines: string[], lookups: Lookups, originalNo = ''): Promise<{ recipe: ShadeRecipe | null; message: string }> =>
  USE_MOCK ? mock.save(r, mode, lookups, originalNo) : wrap(async () => {
    const res = await post(API, token, mode === 'add' ? ENDPOINTS.add : ENDPOINTS.modify, toPayload(r, deletedLines, originalNo));
    const d = bodyData(res);
    const saved = d?.recipe ?? (d?.recipe_no ? d : null);
    return { recipe: saved ? toRecipe(saved) : null, message: serverMessage(res.data) };
  }, 'Could not save the recipe.');

export const deleteRecipe = (API: string, token: string, recipeNo: string): Promise<string> =>
  USE_MOCK ? mock.remove(recipeNo) : wrap(async () => serverMessage((await post(API, token, ENDPOINTS.remove, { recipe_no: Number(recipeNo) || 0 })).data), 'Could not delete the recipe.');
