// FILE: src/components/ProcessChemicalsNEW/model.ts
// Process Chemicals (Define Recipe) — types, validation, calculations. No React / no network in here.
//
// Layout helpers (breakpoints, number sanitizers, local ids) are REUSED from StoreItemMasterNew/model
// so every NEW master screen switches layout at exactly the same widths.
import { Breakpoint, Mode, Opt, breakpointFor, formColumns, newLocalId, sanitizeDecimal, toNum, CONTENT_MAX } from '../StoreItemMasterNew/model';

export type { Breakpoint, Mode, Opt };
export { CONTENT_MAX, breakpointFor, formColumns, newLocalId, sanitizeDecimal, toNum };

/* ------------------------------------------------------------------ */
/* Lookups                                                             */
/* ------------------------------------------------------------------ */

/** Recipe group (e.g. "30 · 4. COTTON CHEMICAL 4") + the basis its quantities are calculated on. */
export type GroupOpt = { id: string; code: string; name: string; calc: string };
/** One selectable chemical = item + make + model (the same item can exist under several makes). */
export type ChemOpt = { key: string; itemCode: string; itemName: string; make: string; model: string; uom: string; rate: number };
export type Lookups = {
  processes: Opt[];
  items: Opt[];
  locations: Opt[];
  groups: GroupOpt[];
  chemicals: ChemOpt[];
  status: Opt[];
};
export const emptyLookups = (): Lookups => ({ processes: [], items: [], locations: [], groups: [], chemicals: [], status: [{ id: 'A', label: 'Active' }, { id: 'P', label: 'Passive' }] });

/* ------------------------------------------------------------------ */
/* Recipe                                                              */
/* ------------------------------------------------------------------ */

export type RecipeLine = {
  /** Local id (`new-…` until saved) — also the React key. */
  id: string;
  groupCode: string;
  groupName: string;
  /** Calculation basis of the group, e.g. "Job Weight(Percentage)". */
  calc: string;
  itemCode: string;
  itemName: string;
  make: string;
  model: string;
  uom: string;
  /** Kept as text while typing. */
  qty: string;
  /** Rate per KG (or per unit) from the item master. Cost is always derived from it. */
  rate: number;
  /** Original API row, so fields we do not show survive Modify. */
  apiFields?: Record<string, any>;
};

export type Recipe = {
  recipeNo: string;
  /** ISO yyyy-mm-dd */
  date: string;
  description: string;
  processCode: string;
  processName: string;
  itemCode: string;
  itemName: string;
  location: string;
  pageNo: string;
  /** 'A' Active / 'P' Passive */
  status: string;
  lines: RecipeLine[];
  apiFields?: Record<string, any>;
};

export type BrowseRow = { recipeNo: string; date: string; description: string; process: string; color: string; itemName: string };

export const QTY_DP = 5;
export const COST_DP = 4;

export const todayISO = () => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};
/** ISO (or ISO datetime) -> dd/mm/yyyy ; anything else is shown as the server sent it. */
export const fmtDate = (v: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(v || '');
  return m ? `${m[3]}/${m[2]}/${m[1]}` : v || '';
};
/** "Mon, 2 Nov 2026" style long date for the hero card. */
export const fmtDateLong = (v: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(v || '');
  if (!m) return v || '';
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
};

export const fmtNum = (v: any, dp: number) => {
  const n = toNum(v);
  return n.toLocaleString('en-IN', { minimumFractionDigits: dp, maximumFractionDigits: dp });
};
export const fmtQty = (v: any) => fmtNum(v, QTY_DP);
export const fmtCost = (v: any) => fmtNum(v, COST_DP);

export const emptyRecipe = (): Recipe => ({
  recipeNo: '', date: todayISO(), description: '', processCode: '', processName: '', itemCode: '', itemName: '',
  location: '', pageNo: '0', status: 'A', lines: [],
});

export const emptyLine = (): RecipeLine => ({
  id: newLocalId(), groupCode: '', groupName: '', calc: '', itemCode: '', itemName: '', make: '', model: '', uom: '', qty: '', rate: 0,
});

/* ------------------------------------------------------------------ */
/* Calculations                                                        */
/* ------------------------------------------------------------------ */

/**
 * Cost of one line.
 * Rates in the item master are per KG, recipe quantities are in grams (GMS / GMS%), so
 *   GMS / GMS%  ->  qty / 1000 × rate        (500 GMS% @ 210/kg = 105.00)
 *   any other UOM ->  qty × rate
 * Change ONLY this function if the server uses another rule.
 */
export const lineCost = (l: Pick<RecipeLine, 'qty' | 'rate' | 'uom'>) => {
  const q = toNum(l.qty);
  const r = toNum(l.rate);
  const gram = /^GMS%?$/i.test((l.uom || '').trim());
  return Math.round((gram ? (q / 1000) * r : q * r) * 10000) / 10000;
};

export type RecipeGroup = { code: string; name: string; calc: string; lines: RecipeLine[]; qty: number; cost: number };

/** Lines grouped by recipe group (ordered by group code), each with its own totals. */
export function groupLines(lines: RecipeLine[]): RecipeGroup[] {
  const map = new Map<string, RecipeGroup>();
  for (const l of lines) {
    const k = l.groupCode || '0';
    let g = map.get(k);
    if (!g) { g = { code: l.groupCode, name: l.groupName, calc: l.calc, lines: [], qty: 0, cost: 0 }; map.set(k, g); }
    g.lines.push(l);
    g.qty += toNum(l.qty);
    g.cost += lineCost(l);
  }
  return [...map.values()].sort((a, b) => (Number(a.code) || 0) - (Number(b.code) || 0));
}

export const recipeTotals = (lines: RecipeLine[]) => ({
  groups: new Set(lines.map((l) => l.groupCode)).size,
  chemicals: lines.length,
  qty: lines.reduce((s, l) => s + toNum(l.qty), 0),
  cost: lines.reduce((s, l) => s + lineCost(l), 0),
});

/* ------------------------------------------------------------------ */
/* Validation                                                          */
/* ------------------------------------------------------------------ */

export type RecipeErrors = Partial<Record<'recipeNo' | 'date' | 'description' | 'processCode' | 'pageNo' | 'lines', string>>;

export function validateRecipe(r: Recipe): RecipeErrors {
  const e: RecipeErrors = {};
  if (!/^\d+$/.test(String(r.recipeNo).trim()) || Number(r.recipeNo) <= 0) e.recipeNo = 'Enter a valid recipe no.';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(r.date)) e.date = 'Select the recipe date';
  if (!r.description.trim()) e.description = 'Enter the recipe description';
  if (!r.processCode) e.processCode = 'Select the process';
  if (r.pageNo && !/^\d+$/.test(r.pageNo)) e.pageNo = 'Page no. must be a whole number';
  if (!r.lines.length) e.lines = 'Add at least one chemical to the recipe';
  else if (r.lines.some((l) => !(toNum(l.qty) > 0))) e.lines = 'Every chemical needs a quantity greater than zero';
  return e;
}

export type LineErrors = Partial<Record<'group' | 'chemical' | 'qty', string>>;

/** `others` = the rest of the recipe's lines (the line being edited excluded). */
export function validateLine(l: RecipeLine, others: RecipeLine[]): LineErrors {
  const e: LineErrors = {};
  if (!l.itemCode) e.chemical = 'Select the chemical';
  else if (others.some((o) => o.itemCode === l.itemCode && o.make === l.make && o.model === l.model))
    e.chemical = 'This chemical is already in the recipe';
  if (!(toNum(l.qty) > 0)) e.qty = 'Enter a quantity greater than zero';
  return e;
}

/** Stable text of everything the user can change — used for the "unsaved changes" check. */
export const recipeSignature = (r: Recipe) =>
  JSON.stringify([r.recipeNo, r.date, r.description.trim(), r.processCode, r.itemCode, r.location, r.pageNo, r.status,
    r.lines.map((l) => [l.groupCode, l.itemCode, l.make, l.model, l.qty])]);

/* ------------------------------------------------------------------ */
/* Copy Recipe                                                         */
/* ------------------------------------------------------------------ */

/**
 * Copy everything that describes the recipe (description, process, item, location, page, chemicals)
 * from `source` into the NEW recipe `base`. Number, date and status stay those of the new recipe;
 * every line gets a fresh local id so it is saved as a new row.
 */
export const copyFromRecipe = (source: Recipe, base: Recipe): Recipe => ({
  ...base,
  description: source.description,
  processCode: source.processCode,
  processName: source.processName,
  itemCode: source.itemCode,
  itemName: source.itemName,
  location: source.location,
  pageNo: source.pageNo,
  lines: source.lines.map((l) => ({ ...l, id: newLocalId(), apiFields: undefined })),
});

/* ------------------------------------------------------------------ */
/* Browse / Recipe-help filtering                                      */
/* ------------------------------------------------------------------ */

export type BrowseSortKey = 'recipeNo' | 'date' | 'description' | 'process' | 'color' | 'itemName';
export type BrowseFilters = Record<BrowseSortKey, string>;
export const NO_FILTERS: BrowseFilters = { recipeNo: '', date: '', description: '', process: '', color: '', itemName: '' };

export function filterBrowse(rows: BrowseRow[], query: string, filters: BrowseFilters, sort: BrowseSortKey, dir: 'asc' | 'desc'): BrowseRow[] {
  const q = query.trim().toLowerCase();
  const has = (v: string, n: string) => !n.trim() || v.toLowerCase().includes(n.trim().toLowerCase());
  const out = rows.filter((r) => {
    const dt = fmtDate(r.date);
    if (q && !`${r.recipeNo} ${dt} ${r.description} ${r.process} ${r.color} ${r.itemName}`.toLowerCase().includes(q)) return false;
    return has(r.recipeNo, filters.recipeNo) && has(dt, filters.date) && has(r.description, filters.description) && has(r.process, filters.process) && has(r.color, filters.color) && has(r.itemName, filters.itemName);
  });
  const mul = dir === 'asc' ? 1 : -1;
  return out.sort((a, b) => {
    if (sort === 'recipeNo') return (toNum(a.recipeNo) - toNum(b.recipeNo)) * mul;
    return String(a[sort] ?? '').localeCompare(String(b[sort] ?? ''), undefined, { numeric: true, sensitivity: 'base' }) * mul;
  });
}
