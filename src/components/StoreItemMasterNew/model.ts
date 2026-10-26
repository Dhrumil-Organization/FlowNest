// FILE: src/components/StoreItemMasterNew/model.ts
// Store Item Master — types, constants and pure helpers (no React, no network).

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export type Opt = { id: string; label: string };
export type SubGroupOpt = Opt & { groupId: string };
/** Property option; `type` is the property type (the legacy `prptype`). */
export type PropertyOpt = Opt & { type: string };

/**
 * The Property / Year / Store trio. Every API call is made inside one scope,
 * exactly like Color Item Master (prptype + PrpCode + YearNo + StrCode).
 */
export type Scope = { prpType: string; prpCode: string; yearNo: string; store: string };

export type Lookups = {
  groups: Opt[];
  subGroups: SubGroupOpt[];
  uoms: Opt[];
  hsn: Opt[];
  gst: Opt[];
  /** Make status codes: A = Active, P = Passive. */
  status: Opt[];
  /** Make/model rows returned with the main lookups response. */
  makes: { makeCode: string; makeName: string; model: string; makeSrNo: number }[];
  /** Store locations (make "Location" dropdown). */
  locations: Opt[];
  /** false = the backend does not allow editing rates. */
  rateEditable: boolean;
};

/** Code -> label from a lookup list (falls back to the code itself). */
export const labelOf = (list: Opt[], id: string) => list.find((o) => o.id === id)?.label || id;

/** One make / model row of an item (the lower grid of the legacy screen). */
export type ItemMake = {
  id: string; // local key; server srno once saved
  makeCode: string;
  makeName: string;
  model: string;
  shortName: string;
  roLevel: string;
  roQty: string;
  opQty: string;
  opRate: string;
  rate1: string;
  rate2: string;
  rate3: string;
  rate4: string;
  saleRate: string;
  location: string;
  inwardExtraQtyPct: string;
  inwardExtraQty: string;
  shift: string;
  surplusLevel: string;
  dead: boolean;
  status: string; // read-only, comes from the server ("Passive" / "Active")
  /** Original show-data make row, retained so every backend key is sent on save. */
  apiFields?: Record<string, any>;
};

export type StoreItem = {
  prpType: string;
  prpCode: string;
  yearNo: string;
  store: string;
  code: string;
  name: string;
  groupId: string;
  subGroupId: string;
  purchaseUom: string;
  salesUom: string;
  hsn: string;
  gst: string;
  stopInward: boolean;
  stopIssue: boolean;
  makes: ItemMake[];
  /** Original show-data top-level fields retained for complete add/modify payloads. */
  apiFields?: Record<string, any>;
};

/** One line of the Browse (Item List) grid. */
export type BrowseRow = {
  key: string;
  store: string;
  code: string;
  name: string;
  uom: string;
  group: string;
  subGroup: string;
  rate: number;
  location: string;
  /** Entire original browse API record, retained for automatic future columns. */
  apiData?: Record<string, any>;
};

export type Mode = 'view' | 'add' | 'modify';
export type Breakpoint = 'phone' | 'tablet' | 'desktop';

/* ------------------------------------------------------------------ */
/* Responsive breakpoints — measured on the SCREEN'S OWN WIDTH         */
/* (not the window), so the sidebar of the web shell is accounted for. */
/* ------------------------------------------------------------------ */

export const BP_TABLET = 560;
export const BP_DESKTOP = 900;
export const CONTENT_MAX = 1180;

export const breakpointFor = (width: number): Breakpoint =>
  width >= BP_DESKTOP ? 'desktop' : width >= BP_TABLET ? 'tablet' : 'phone';

export const formColumns = (bp: Breakpoint) => (bp === 'desktop' ? 3 : bp === 'tablet' ? 2 : 1);

/* ------------------------------------------------------------------ */
/* Number handling                                                     */
/* ------------------------------------------------------------------ */

/** Decimals shown per numeric make field (matches the legacy grid). */
export const DP = {
  roLevel: 3,
  roQty: 3,
  opQty: 4,
  opRate: 2,
  rate1: 2,
  rate2: 2,
  rate3: 2,
  rate4: 2,
  saleRate: 2,
  inwardExtraQtyPct: 2,
  inwardExtraQty: 3,
  surplusLevel: 0,
} as const;

export type NumKey = keyof typeof DP;

/** Keeps digits and one dot; trims decimals to `dp`. */
export function sanitizeDecimal(value: string, dp: number): string {
  let v = String(value ?? '').replace(/[^0-9.]/g, '');
  const firstDot = v.indexOf('.');
  if (firstDot >= 0) {
    v = v.slice(0, firstDot + 1) + v.slice(firstDot + 1).replace(/\./g, '');
    if (dp === 0) v = v.slice(0, firstDot);
    else v = v.slice(0, firstDot + 1 + dp);
  }
  return v;
}

export const digitsOnly = (value: string) => String(value ?? '').replace(/[^0-9]/g, '');

export const toNum = (value: any): number => {
  const n = parseFloat(String(value ?? ''));
  return Number.isFinite(n) ? n : 0;
};

/** Fixed decimals for display, Indian digit grouping. */
export const fmt = (value: any, dp: number): string =>
  toNum(value).toLocaleString('en-IN', { minimumFractionDigits: dp, maximumFractionDigits: dp });

export const fmtRate = (value: any) => fmt(value, 2);

/* ------------------------------------------------------------------ */
/* Factories                                                           */
/* ------------------------------------------------------------------ */

let tmpSeq = 0;
export const newLocalId = () => `new-${Date.now()}-${++tmpSeq}`;

export const emptyMake = (): ItemMake => ({
  id: newLocalId(),
  makeCode: '',
  makeName: '',
  model: '',
  shortName: '',
  roLevel: '',
  roQty: '',
  opQty: '',
  opRate: '',
  rate1: '',
  rate2: '',
  rate3: '',
  rate4: '',
  saleRate: '',
  location: '',
  inwardExtraQtyPct: '',
  inwardExtraQty: '',
  shift: '',
  surplusLevel: '',
  dead: false,
  status: 'A',
});

export const emptyScope = (): Scope => ({ prpType: '', prpCode: '', yearNo: '', store: '' });
export const scopeOf = (i: Pick<StoreItem, 'prpType' | 'prpCode' | 'yearNo' | 'store'>): Scope => ({
  prpType: i.prpType, prpCode: i.prpCode, yearNo: i.yearNo, store: i.store,
});
export const sameScope = (a: Scope, b: Scope) =>
  a.prpType === b.prpType && a.prpCode === b.prpCode && a.yearNo === b.yearNo && a.store === b.store;
export const scopeReady = (s: Scope) => !!(s.prpCode && s.yearNo && s.store);

/** Accepts a full/partial scope (or just a store id, for older callers). */
export const emptyItem = (scope: Partial<Scope> | string = {}): StoreItem => {
  const sc: Partial<Scope> = typeof scope === 'string' ? { store: scope } : scope;
  return blankItem({ ...emptyScope(), ...sc });
};

const blankItem = (sc: Scope): StoreItem => ({
  prpType: sc.prpType,
  prpCode: sc.prpCode,
  yearNo: sc.yearNo,
  store: sc.store,
  code: '',
  name: '',
  groupId: '',
  subGroupId: '',
  purchaseUom: '',
  salesUom: '',
  hsn: '',
  gst: '',
  stopInward: false,
  stopIssue: false,
  makes: [],
});

/** Purchase / Sales UOM default to NUMBER (NOS) when the lookup has it — like the legacy Add. */
export const withDefaultUom = (item: StoreItem, uoms: Opt[]): StoreItem => {
  const nos = uoms.find((u) => u.id.toUpperCase() === 'NOS') || uoms.find((u) => /number/i.test(u.label));
  if (!nos) return item;
  return { ...item, purchaseUom: item.purchaseUom || nos.id, salesUom: item.salesUom || nos.id };
};

/* ------------------------------------------------------------------ */
/* Status                                                              */
/* ------------------------------------------------------------------ */

export type StatusKind = 'active' | 'noInward' | 'noIssue' | 'stopped';

/** Make status code ('A' / 'P' / 'Active' / 'Passive') -> 'Active' | 'Passive'. */
export const makeStatusLabel = (code: string, list: Opt[]) => {
  const c = String(code ?? '').trim();
  const hit = list.find((o) => o.id.toUpperCase() === c.toUpperCase() || o.label.toUpperCase() === c.toUpperCase());
  return hit?.label || (/^a/i.test(c) ? 'Active' : 'Passive');
};

export const itemStatus = (item: Pick<StoreItem, 'stopInward' | 'stopIssue'>): { kind: StatusKind; label: string } => {
  if (item.stopInward && item.stopIssue) return { kind: 'stopped', label: 'Stopped' };
  if (item.stopInward) return { kind: 'noInward', label: 'No inward' };
  if (item.stopIssue) return { kind: 'noIssue', label: 'No issue' };
  return { kind: 'active', label: 'Active' };
};

/* ------------------------------------------------------------------ */
/* Validation                                                          */
/* ------------------------------------------------------------------ */

export type ItemErrors = Partial<Record<'prpCode' | 'yearNo' | 'store' | 'code' | 'name' | 'groupId' | 'subGroupId' | 'purchaseUom' | 'salesUom' | 'makes', string>>;

export function validateItem(item: StoreItem, mode: Mode, subGroups: SubGroupOpt[] = []): ItemErrors {
  const e: ItemErrors = {};
  if (!item.prpCode) e.prpCode = 'Select a property';
  if (!item.yearNo) e.yearNo = 'Select a year';
  if (!item.store) e.store = 'Select a store';
  if (mode === 'add' && item.code && !/^\d+$/.test(item.code)) e.code = 'Digits only';
  if (item.name.trim().length < 2) e.name = 'Enter the item name';
  if (!item.groupId) e.groupId = 'Select an item group';
  // Sub groups are listed per item group: when the chosen group has any, one must be picked.
  else if (!item.subGroupId && subGroups.some((s) => s.groupId === item.groupId)) e.subGroupId = 'Select an item sub group';
  if (!item.purchaseUom) e.purchaseUom = 'Select a purchase UOM';
  if (!item.salesUom) e.salesUom = 'Select a sales UOM';

  const seen = new Set<string>();
  for (const m of item.makes) {
    if (!m.makeName.trim()) {
      e.makes = 'Every make needs a make name';
      break;
    }
    const k = `${m.makeCode.trim()}|${m.makeName.trim()}|${m.model.trim()}`.toUpperCase();
    if (seen.has(k)) {
      e.makes = `"${m.makeName.trim()}" with the same model is added twice`;
      break;
    }
    seen.add(k);
  }
  return e;
}

export type MakeErrors = Partial<Record<'makeName', string>>;
export const validateMake = (m: ItemMake): MakeErrors => (m.makeName.trim() ? {} : { makeName: 'Enter the make name' });

/* ------------------------------------------------------------------ */
/* Dirty check                                                         */
/* ------------------------------------------------------------------ */

export const itemSignature = (item: StoreItem) =>
  JSON.stringify({ ...item, name: item.name.trim(), makes: item.makes.map(({ id, ...rest }) => rest) });

/* ------------------------------------------------------------------ */
/* Browse grid                                                         */
/* ------------------------------------------------------------------ */

export type BrowseSortKey = 'code' | 'name' | 'group' | 'rate';
export type BrowseFilters = { code: string; name: string; uom: string; group: string; subGroup: string; location: string };
export const NO_COLUMN_FILTERS: BrowseFilters = { code: '', name: '', uom: '', group: '', subGroup: '', location: '' };

const has = (hay: string, needle: string) => !needle.trim() || hay.toLowerCase().includes(needle.trim().toLowerCase());

export function filterBrowse(
  rows: BrowseRow[],
  q: string,
  group: string,
  cols: BrowseFilters,
  sortKey: BrowseSortKey,
  sortDir: 'asc' | 'desc',
): BrowseRow[] {
  const out = rows.filter(
    (r) =>
      (!group || r.group === group) &&
      (has(`${r.code} ${r.name} ${r.group} ${r.subGroup} ${r.location}`, q)) &&
      has(r.code, cols.code) &&
      has(r.name, cols.name) &&
      has(r.uom, cols.uom) &&
      has(r.group, cols.group) &&
      has(r.subGroup, cols.subGroup) &&
      has(r.location, cols.location),
  );
  const dir = sortDir === 'asc' ? 1 : -1;
  return out.sort((a, b) => {
    switch (sortKey) {
      case 'code':
        return (toNum(a.code) - toNum(b.code)) * dir;
      case 'rate':
        return (a.rate - b.rate) * dir;
      case 'group':
        return a.group.localeCompare(b.group) * dir || a.name.localeCompare(b.name);
      default:
        return a.name.localeCompare(b.name, undefined, { numeric: true }) * dir;
    }
  });
}
