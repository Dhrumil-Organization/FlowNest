// FILE: src/components/PlanningNEW/model.ts
// Yarn Dyeing › Planning (production planning entry) — types, validation, calculations.
// No React / no network in here. Layout helpers are REUSED from StoreItemMasterNew/model so every NEW
// screen switches layout at exactly the same widths.
import { Breakpoint, Mode, Opt, breakpointFor, formColumns, newLocalId, sanitizeDecimal, toNum, CONTENT_MAX } from '../StoreItemMasterNew/model';

export type { Breakpoint, Mode, Opt };
export { CONTENT_MAX, breakpointFor, formColumns, newLocalId, sanitizeDecimal, toNum };

/* ------------------------------------------------------------------ */
/* Plan type (the legacy "Type" drop-down)                              */
/* ------------------------------------------------------------------ */

export type PlanType = 'DYEING' | 'CONING' | 'CHECKING';
export const PLAN_TYPES: { id: PlanType; label: string }[] = [
  { id: 'DYEING', label: 'Dyeing' },
  { id: 'CONING', label: 'Coning' },
  { id: 'CHECKING', label: 'Checking (Grading)' },
];
export const typeLabel = (t: string) => PLAN_TYPES.find((x) => x.id === t)?.label ?? t;
/** Dyeing has NO merge selection; Coning and Checking have. */
export const usesMerge = (t: PlanType) => t === 'CONING' || t === 'CHECKING';
/** Set to true if the business wants Merge to be mandatory for Coning / Checking. */
export const MERGE_REQUIRED = false;

/* ------------------------------------------------------------------ */
/* Lookups                                                             */
/* ------------------------------------------------------------------ */

export type MergeOpt = Opt & { stock: boolean };
export type Lookups = {
  processes: Opt[];
  /** ALL machines of the machine master (nothing filtered out). */
  machines: (Opt & { group: string })[];
  /** Merges; the screen only offers `stock === true` ones. */
  merges: MergeOpt[];
};
export const emptyLookups = (): Lookups => ({ processes: [], machines: [], merges: [] });

/* ------------------------------------------------------------------ */
/* Source orders (Item help: Sales Order / Job Order)                   */
/* ------------------------------------------------------------------ */

export type SourceKind = 'SO' | 'JO';
/** One pending Sales Order / Job Order item row that can be planned. */
export type SourceRow = {
  /** unique key: kind|no|itemCode|shade */
  key: string;
  kind: SourceKind;
  /** SO no or JO no */
  orderNo: string;
  /** SO date or JO date (ISO) */
  orderDate: string;
  partyCode: string;
  partyName: string;
  itemCode: string;
  itemName: string;
  shadeCode: string;
  shadeName: string;
  orderQty: number;
  /** still free to plan (order qty − already planned) */
  balance: number;
  /** item-wise remarks written on the sales order */
  remarks: string;
};

/* ------------------------------------------------------------------ */
/* Plan                                                                */
/* ------------------------------------------------------------------ */

export type PlanLine = {
  /** Local id (`new-…` until saved) — also the React key. */
  id: string;
  kind: SourceKind;
  orderNo: string;
  orderDate: string;
  partyCode: string;
  partyName: string;
  itemCode: string;
  itemName: string;
  shadeCode: string;
  shadeName: string;
  orderQty: number;
  /** what could still be planned when the voucher was opened (incl. this line's own saved qty) */
  available: number;
  /** text while typing */
  qty: string;
  remarks: string;
  apiFields?: Record<string, any>;
};

export type Plan = {
  /** series prefix shown in front of the number, e.g. "11" — set by the server */
  prefix: string;
  voucherNo: string;
  /** ISO yyyy-mm-dd */
  date: string;
  type: PlanType;
  processCode: string;
  processName: string;
  itemCode: string;
  itemName: string;
  shadeCode: string;
  shadeName: string;
  mergeCode: string;
  mergeName: string;
  machineCode: string;
  machineName: string;
  remarks: string;
  /** 'Pending' until production picks it up; only a Pending plan may be modified / deleted */
  status: 'Pending' | 'Processed' | string;
  lines: PlanLine[];
  apiFields?: Record<string, any>;
};

export const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const emptyPlan = (): Plan => ({
  prefix: '', voucherNo: '', date: todayISO(), type: 'DYEING', processCode: '', processName: '', itemCode: '', itemName: '',
  shadeCode: '', shadeName: '', mergeCode: '', mergeName: '', machineCode: '', machineName: '', remarks: '', status: 'Pending', lines: [],
});

export const isPending = (p: Plan) => String(p.status || 'Pending').toLowerCase() === 'pending';

/* ------------------------------------------------------------------ */
/* Calculations                                                        */
/* ------------------------------------------------------------------ */

export const lineQty = (l: PlanLine) => toNum(l.qty);
/** Total Quantity = sum of the grid. Never typed by hand. */
export const totalQty = (lines: PlanLine[]) => Math.round(lines.reduce((s, l) => s + lineQty(l), 0) * 1000) / 1000;
export const fmtQty = (n: number) => (Number.isFinite(n) ? n.toLocaleString('en-IN', { minimumFractionDigits: 3, maximumFractionDigits: 3 }) : '0.000');

export const fmtDate = (v: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(v || '');
  return m ? `${m[3]}/${m[2]}/${m[1]}` : v || '';
};
const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
export const fmtDateLong = (v: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(v || '');
  if (!m) return v || '';
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return `${DAYS[d.getDay()]} ${d.getDate()}, ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};
export const voucherLabel = (p: Pick<Plan, 'prefix' | 'voucherNo'>) => (p.voucherNo ? `${p.prefix ? `${p.prefix}/` : ''}${p.voucherNo}` : '');

/** Unique shades of the items currently in the grid (the Shade help list). */
export const shadesOf = (rows: { itemCode: string; shadeCode: string; shadeName: string }[]): Opt[] => {
  const seen = new Set<string>();
  const out: Opt[] = [];
  for (const r of rows) {
    if (!r.shadeCode || seen.has(r.shadeCode)) continue;
    seen.add(r.shadeCode);
    out.push({ id: r.shadeCode, label: r.shadeName || r.shadeCode });
  }
  return out;
};

export const sourceToLine = (r: SourceRow): PlanLine => ({
  id: newLocalId(), kind: r.kind, orderNo: r.orderNo, orderDate: r.orderDate, partyCode: r.partyCode, partyName: r.partyName,
  itemCode: r.itemCode, itemName: r.itemName, shadeCode: r.shadeCode, shadeName: r.shadeName, orderQty: r.orderQty,
  available: r.balance, qty: r.balance > 0 ? String(r.balance) : '', remarks: r.remarks,
});

/** Item-wise sales-order remarks, de-duplicated, joined for the plan's Remarks (Coning / Checking). */
export const joinRemarks = (lines: { remarks: string }[]): string => {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const l of lines) { const t = (l.remarks || '').trim(); if (t && !seen.has(t.toUpperCase())) { seen.add(t.toUpperCase()); out.push(t); } }
  return out.join(' | ').slice(0, 250);
};

/* ------------------------------------------------------------------ */
/* Validation                                                          */
/* ------------------------------------------------------------------ */

export type PlanErrors = Partial<Record<'date' | 'type' | 'processCode' | 'shadeCode' | 'machineCode' | 'mergeCode' | 'lines', string>> & { qty?: Record<string, string> };

export function validatePlan(p: Plan): PlanErrors {
  const e: PlanErrors = {};
  if (!p.date) e.date = 'Voucher date is required.';
  if (!p.type) e.type = 'Select the plan type.';
  if (!p.processCode) e.processCode = 'Select the process.';
  if (!p.lines.length) e.lines = 'Select at least one order (Item help) before saving.';
  else {
    const q: Record<string, string> = {};
    for (const l of p.lines) {
      const n = lineQty(l);
      if (!(n > 0)) q[l.id] = 'Enter a quantity greater than 0.';
      else if (l.available > 0 && n - l.available > 0.0005) q[l.id] = `Only ${fmtQty(l.available)} is left to plan on this order.`;
    }
    if (Object.keys(q).length) { e.qty = q; if (!e.lines) e.lines = 'Fix the highlighted quantities.'; }
    const items = new Set(p.lines.map((l) => l.itemCode));
    if (items.size > 1) e.lines = 'One plan can have only ONE item. Remove the orders of the other item.';
  }
  if (!p.shadeCode) e.shadeCode = 'Select the shade.';
  if (!p.machineCode) e.machineCode = 'Select the machine.';
  if (usesMerge(p.type) && MERGE_REQUIRED && !p.mergeCode) e.mergeCode = 'Select the merge.';
  return e;
}

/** Changes whenever anything the user can edit changes (drives the "Unsaved changes" hint). */
export const planSignature = (p: Plan) =>
  JSON.stringify([p.voucherNo, p.date, p.type, p.processCode, p.itemCode, p.shadeCode, p.mergeCode, p.machineCode, p.remarks, p.lines.map((l) => [l.id, l.qty, l.remarks])]);

/** Switching the type clears what only makes sense for the old one. */
export const withType = (p: Plan, type: PlanType): Plan =>
  type === p.type ? p : { ...p, type, mergeCode: usesMerge(type) ? p.mergeCode : '', mergeName: usesMerge(type) ? p.mergeName : '' };

/* ------------------------------------------------------------------ */
/* Browse                                                              */
/* ------------------------------------------------------------------ */

export type BrowseRow = {
  voucherNo: string; prefix: string; date: string; type: string; process: string; itemName: string; shade: string; machine: string; qty: number; party: string; status: string;
};
export type BrowseSortKey = 'voucher' | 'date' | 'type' | 'process' | 'item' | 'shade' | 'machine' | 'qty' | 'party';
export type BrowseFilters = Record<BrowseSortKey, string>;
export const NO_FILTERS: BrowseFilters = { voucher: '', date: '', type: '', process: '', item: '', shade: '', machine: '', qty: '', party: '' };

const browseValue = (r: BrowseRow, k: BrowseSortKey): string | number =>
  k === 'voucher' ? Number(r.voucherNo) || 0 : k === 'date' ? r.date : k === 'type' ? typeLabel(r.type) : k === 'process' ? r.process : k === 'item' ? r.itemName
    : k === 'shade' ? r.shade : k === 'machine' ? r.machine : k === 'qty' ? r.qty : r.party;
const browseText = (r: BrowseRow, k: BrowseSortKey): string =>
  k === 'voucher' ? voucherLabel(r) : k === 'date' ? fmtDate(r.date) : k === 'qty' ? fmtQty(r.qty) : String(browseValue(r, k));

export function filterBrowse(rows: BrowseRow[], query: string, filters: BrowseFilters, sort: BrowseSortKey, dir: 'asc' | 'desc'): BrowseRow[] {
  const q = query.trim().toLowerCase();
  const keys = Object.keys(NO_FILTERS) as BrowseSortKey[];
  const out = rows.filter((r) => {
    if (q && !keys.some((k) => browseText(r, k).toLowerCase().includes(q))) return false;
    return keys.every((k) => !filters[k].trim() || browseText(r, k).toLowerCase().includes(filters[k].trim().toLowerCase()));
  });
  const m = dir === 'asc' ? 1 : -1;
  return out.sort((a, b) => {
    const x = browseValue(a, sort), y = browseValue(b, sort);
    return (typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), undefined, { numeric: true })) * m;
  });
}
export { browseText };
