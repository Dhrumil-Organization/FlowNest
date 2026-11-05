// FILE: src/components/ShadeRecipeNEW/model.ts
// Shade Recipe (Define Recipe with Shade / Color / Shade Range) — types, validation, copy rules.
//
// The chemical lines are IDENTICAL to Process Chemicals, so lines, cost maths, grouping, grid and the
// add/edit-chemical sheet are REUSED from ProcessChemicalsNEW. Only the recipe header differs.
import {
  Lookups as ChemLookups, RecipeLine, emptyLine, emptyLookups as emptyChemLookups, fmtCost, fmtDate, fmtDateLong, fmtQty, groupLines, lineCost, newLocalId,
  recipeTotals, todayISO, toNum, validateLine,
} from '../ProcessChemicalsNEW/model';
import type { Opt } from '../ProcessChemicalsNEW/model';

export type { Opt, RecipeLine };
export { emptyLine, fmtCost, fmtDate, fmtDateLong, fmtQty, groupLines, lineCost, recipeTotals, todayISO, toNum, validateLine };
export { CONTENT_MAX, breakpointFor, formColumns } from '../ProcessChemicalsNEW/model';
export type { Breakpoint, Mode } from '../ProcessChemicalsNEW/model';

/** A shade. Choosing it fills Item / Color / Shade range when the server knows them. */
export type ShadeOpt = { id: string; label: string; itemCode: string; itemName: string; range: string; color: string };

/** `processes` stays empty (the shared LineSheet only reads `groups` and `chemicals`). */
export type Lookups = ChemLookups & { shades: ShadeOpt[]; ranges: Opt[] };
export const emptyLookups = (): Lookups => ({
  ...emptyChemLookups(),
  shades: [],
  ranges: [{ id: 'LIGHT', label: 'LIGHT' }, { id: 'MEDIUM', label: 'MEDIUM' }, { id: 'DARK', label: 'DARK' }],
});

export type ShadeRecipe = {
  recipeNo: string;
  /** ISO yyyy-mm-dd */
  date: string;
  description: string;
  shadeCode: string;
  shadeName: string;
  itemCode: string;
  itemName: string;
  color: string;
  /** LIGHT / MEDIUM / DARK */
  range: string;
  location: string;
  pageNo: string;
  /** 'A' Active / 'P' Passive */
  status: string;
  lines: RecipeLine[];
  apiFields?: Record<string, any>;
};

export type BrowseRow = { recipeNo: string; date: string; description: string; shadeName: string; color: string; range: string; itemName: string };

export const emptyRecipe = (): ShadeRecipe => ({
  recipeNo: '', date: todayISO(), description: '', shadeCode: '', shadeName: '', itemCode: '', itemName: '', color: '', range: '',
  location: '', pageNo: '0', status: 'A', lines: [],
});

/* ------------------------------- validation ------------------------------ */

export type RecipeErrors = Partial<Record<'recipeNo' | 'date' | 'description' | 'shadeCode' | 'pageNo' | 'lines', string>>;

export function validateRecipe(r: ShadeRecipe): RecipeErrors {
  const e: RecipeErrors = {};
  if (!/^\d+$/.test(String(r.recipeNo).trim()) || Number(r.recipeNo) <= 0) e.recipeNo = 'Enter a valid recipe no.';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(r.date)) e.date = 'Select the recipe date';
  if (!r.description.trim()) e.description = 'Enter the recipe description';
  if (!r.shadeCode) e.shadeCode = 'Select the shade';
  if (r.pageNo && !/^\d+$/.test(r.pageNo)) e.pageNo = 'Page no. must be a whole number';
  if (!r.lines.length) e.lines = 'Add at least one chemical to the recipe';
  else if (r.lines.some((l) => !(toNum(l.qty) > 0))) e.lines = 'Every chemical needs a quantity greater than zero';
  return e;
}

/** Everything the user can change — used for the "unsaved changes" check. */
export const recipeSignature = (r: ShadeRecipe) =>
  JSON.stringify([r.recipeNo, r.date, r.description.trim(), r.shadeCode, r.itemCode, r.range, r.location, r.pageNo, r.status,
    r.lines.map((l) => [l.groupCode, l.itemCode, l.make, l.model, l.qty])]);

/**
 * Copy Recipe: description, shade, item, color, shade range, location, page no. and every chemical come from
 * `source`; recipe number, date and status stay those of the recipe being edited. Lines get fresh local ids.
 */
export const copyFromRecipe = (source: ShadeRecipe, base: ShadeRecipe): ShadeRecipe => ({
  ...base,
  description: source.description,
  shadeCode: source.shadeCode, shadeName: source.shadeName,
  itemCode: source.itemCode, itemName: source.itemName,
  color: source.color, range: source.range,
  location: source.location, pageNo: source.pageNo,
  lines: source.lines.map((l) => ({ ...l, id: newLocalId(), apiFields: undefined })),
});

/* --------------------------- Browse / Recipe help ------------------------- */

export type BrowseSortKey = 'recipeNo' | 'date' | 'description' | 'shadeName' | 'color' | 'range' | 'itemName';
export type BrowseFilters = Record<BrowseSortKey, string>;
export const NO_FILTERS: BrowseFilters = { recipeNo: '', date: '', description: '', shadeName: '', color: '', range: '', itemName: '' };

export function filterBrowse(rows: BrowseRow[], query: string, filters: BrowseFilters, sort: BrowseSortKey, dir: 'asc' | 'desc'): BrowseRow[] {
  const q = query.trim().toLowerCase();
  const has = (v: string, n: string) => !n.trim() || v.toLowerCase().includes(n.trim().toLowerCase());
  const out = rows.filter((r) => {
    const dt = fmtDate(r.date);
    if (q && !`${r.recipeNo} ${dt} ${r.description} ${r.shadeName} ${r.color} ${r.range} ${r.itemName}`.toLowerCase().includes(q)) return false;
    return has(r.recipeNo, filters.recipeNo) && has(dt, filters.date) && has(r.description, filters.description)
      && has(r.shadeName, filters.shadeName) && has(r.color, filters.color) && has(r.range, filters.range) && has(r.itemName, filters.itemName);
  });
  const mul = dir === 'asc' ? 1 : -1;
  return out.sort((a, b) => {
    if (sort === 'recipeNo') return (toNum(a.recipeNo) - toNum(b.recipeNo)) * mul;
    return String(a[sort] ?? '').localeCompare(String(b[sort] ?? ''), undefined, { numeric: true, sensitivity: 'base' }) * mul;
  });
}
