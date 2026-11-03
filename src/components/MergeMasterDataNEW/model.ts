// FILE: src/components/MergeMasterDataNEW/model.ts
// Types, constants and response normalisers for the Merge Master Data module.
// No React / network code here, so everything is easy to unit test.

/* ------------------------------------------------------------------ */
/* Constants                                                           */
/* ------------------------------------------------------------------ */

/**
 * Property code (`prpcode`) sent with every request — decided by the company the user logged in to:
 *   Sudamo -> SIP      Reyons -> MT
 * The company comes from the login response: `userof` / `app_session.business_context.prp_group` = 'R' (Reyons) or 'S' (Sudamo)
 * (see readLoginPrpCode in api.ts). The company name inside the API URL / login text is only a fallback.
 */
export const GROUP_PRP_CODES: Readonly<Record<string, { name: string; prpcode: string }>> = {
  R: { name: 'Reyons', prpcode: 'MT' },
  S: { name: 'Sudamo', prpcode: 'SIP' },
};
export const COMPANY_PRP_CODES: ReadonlyArray<{ name: string; match: RegExp; prpcode: string }> = [
  { name: 'Sudamo', match: /sudamo/i, prpcode: 'SIP' },
  { name: 'Reyons', match: /reyons/i, prpcode: 'MT' },
];

/** Transaction type sent with EVERY request of this module. */
export const TXN_TYPE = 'mob_merge_master_data';

/** Permission resource registered in registry/modules/production.module.ts */
export const PERMISSION_RESOURCE = 'production.merge_master_data';

/**
 * Which panel is the record that gets Passive / Deleted after the merge.
 *   'from' -> left panel record is merged INTO the right panel record, then the left one is made Passive / Deleted.
 *   'to'   -> (legacy desktop behaviour) right panel record is merged INTO the left one, then the right one is removed.
 * Only the wording of the confirmation dialog depends on this; the API always receives both codes.
 * Confirm with the backend developer and change this single line if needed.
 */
export const REMOVED_SIDE: 'from' | 'to' = 'to'; // backend: maincode SURVIVES, mergecode is replaced then made passive

/** Dropdown under the two panels. `value` is what the API receives. */
export type MergeAction = 'P' | 'D';
export const ACTION_OPTIONS: ReadonlyArray<{ value: MergeAction; label: string; hint: string; danger: boolean }> = [
  { value: 'P', label: 'Passive', hint: 'Merged record is kept but marked Passive (inactive).', danger: false },
  // Delete option is disabled for now — remove the comment below to enable it again.
  { value: 'D', label: 'Delete', hint: 'Merged record is permanently deleted. This cannot be undone.', danger: true },
];

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export type Breakpoint = 'phone' | 'tablet' | 'desktop';

/** Row of the Property dropdown. Whatever else the API sends stays in `raw`. */
export type PropertyOpt = { code: string; name: string; raw: Record<string, any> };

/** Row of a Main / Merge panel. */
/** `id` is unique per ROW (the same code can appear in several rows, e.g. one per store) — selection works on `id`, the API gets `code`. */
export type MasterRow = {
  id: string;
  code: string;
  /** Store code of the row (response key `StrCode`) — '' when the master has no store. Sent as mainstrcode / mergestrcode. */
  strCode: string;
  name: string;
  address: string;
  raw: Record<string, any>;
};

export type MergePayload = {
  property: string;
  /** Code shown in the MAIN panel -> API key `maincode` (this record SURVIVES). */
  mainCode: string;
  /** Code shown in the MERGE panel -> API key `mergecode` (this record is replaced, then made Passive). */
  mergeCode: string;
  /** StrCode of the MAIN / MERGE row -> API keys `mainstrcode` / `mergestrcode` (sent only when the master has a store). */
  mainStrCode?: string;
  mergeStrCode?: string;
  action: MergeAction;
};

/* ------------------------------------------------------------------ */
/* Responsive breakpoints — measured on the screen's OWN width         */
/* (so the web sidebar is already excluded).                           */
/* ------------------------------------------------------------------ */

export const BP_TABLET = 600;
export const BP_DESKTOP = 1000;
/** Panels sit side by side from this width, stacked below it. */
export const SIDE_BY_SIDE_MIN = 760;
export const CONTENT_MAX = 1320;

export const breakpointFor = (width: number): Breakpoint =>
  width >= BP_DESKTOP ? 'desktop' : width >= BP_TABLET ? 'tablet' : 'phone';

/* ------------------------------------------------------------------ */
/* Response normalisers                                                */
/* ------------------------------------------------------------------ */

const str = (v: any): string => (v === null || v === undefined ? '' : String(v).trim());
const isPrimitive = (v: any) => typeof v === 'string' || typeof v === 'number';

const CODE_KEYS = ['Code', 'code', 'MstCode', 'mstcode', 'mst_code', 'MainCode', 'main_code', 'AccCode', 'acc_code', 'PrtCode', 'PrpCode', 'id', 'Id', 'ID', 'value', 'Value'];
const NAME_KEYS = ['Name', 'name', 'MainAccountName', 'main_account_name', 'AccountName', 'account_name', 'AccName', 'acc_name', 'PrtName', 'label', 'Label', 'text', 'Text', 'Description', 'description'];
const ADDRESS_KEYS = ['Address', 'address', 'Addr', 'addr', 'Adr', 'AccAddress', 'Add1', 'add1', 'Address1', 'address1'];

const pick = (r: Record<string, any>, keys: string[]): string => {
  for (const k of keys) {
    const v = r?.[k];
    if (v !== undefined && v !== null && isPrimitive(v) && str(v) !== '') return str(v);
  }
  return '';
};

/**
 * Backend may send the list as a code -> name map:  { "001": "Account Master", "002": "Party Master(Supplier)" }
 * Returned as [{ code, name }] in the SAME order the backend sent. Records (objects) are not treated as maps.
 */
function codeNameMap(v: any): Array<{ code: string; name: string }> {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return [];
  const entries = Object.entries(v);
  if (!entries.length) return [];
  if (!entries.every(([, val]) => isPrimitive(val))) return [];
  if ('message' in v || 'success' in v || 'status' in v || 'error' in v) return [];
  return entries.map(([code, name]) => ({ code, name: str(name) }));
}

/**
 * Finds the array inside any of the shapes the Laravel backend uses:
 *   [ ... ] · { data: [...] } · { response: [...] } · { response: { data: [...] } } · { response: { data: { data: [...] } } }
 */
export function extractList(body: any, depth = 0): any[] {
  if (Array.isArray(body)) return body;
  if (!body || typeof body !== 'object' || depth > 4) return [];
  for (const k of ['data', 'Data', 'response', 'result', 'results', 'items', 'rows', 'list']) {
    if (body[k] !== undefined) {
      const asMap = codeNameMap(body[k]);
      if (asMap.length && k !== 'response') return asMap;
      const found = extractList(body[k], depth + 1);
      if (found.length) return found;
    }
  }
  // last resort: the first array-valued property
  for (const v of Object.values(body)) {
    if (Array.isArray(v)) return v as any[];
  }
  return [];
}

/**
 * Property dropdown rows. Anything the backend adds to the response shows up automatically —
 * nothing is hard-coded on this side.
 */
export function toPropertyOptions(list: any[]): PropertyOpt[] {
  const seen = new Set<string>();
  const out: PropertyOpt[] = [];
  for (const item of list ?? []) {
    if (item === null || item === undefined) continue;
    let code = '';
    let name = '';
    let raw: Record<string, any>;
    if (isPrimitive(item)) {
      code = str(item);
      name = code;
      raw = { code };
    } else {
      raw = item as Record<string, any>;
      code = pick(raw, CODE_KEYS);
      name = pick(raw, NAME_KEYS);
      if (!code || !name) {
        // unknown key names: first two primitive values are treated as code and name
        const prim = Object.values(raw).filter(isPrimitive).map(str).filter(Boolean);
        code = code || prim[0] || '';
        name = name || prim[1] || prim[0] || '';
      }
    }
    if (!code || seen.has(code)) continue;
    seen.add(code);
    out.push({ code, name: name || code, raw });
  }
  return out;
}

/** Column of the Main / Merge tables. `key` AND `label` are exactly the key names the show-data response sends. */
export type Column = { key: string; label: string; isCode: boolean };

/** Result of show-data: rows + the columns found in the response + which key holds the code. */
export type MasterTable = { rows: MasterRow[]; columns: Column[]; codeKey: string };

const cell = (v: any): string => (isPrimitive(v) ? str(v) : v === null || v === undefined ? '' : '');

/**
 * show-data rows, shown EXACTLY as the response comes:
 *   { "StrName": "BANGALORE", "ItmCode": "6226", "ItmName": "" }  ->  columns StrName | ItmCode | ItmName
 * - columns = every key of the response, in the order the backend sends them (labels = the key names)
 * - code column = CODE_KEY_BY_PROPERTY[property], else the last key that ends with "code" (ItmCode, AccCode ...), else a known alias, else the first key
 * - the code of the row is what goes to the API as `maincode` / `mergecode`
 */
/**
 * Which response key is the CODE of the record, per property (first dropdown code).
 * Needed because some responses carry several *Code keys (e.g. StrCode = store, ItmCode = item) — the one that is
 * sent as maincode / mergecode must be the record's own code. Add a line here for every master that is used.
 */
export const CODE_KEY_BY_PROPERTY: Record<string, string> = {
  '009': 'ItmCode', // Item Master
};

export function toMasterTable(list: any[], property = ''): MasterTable {
  const objs = (list ?? []).filter((x) => x && typeof x === 'object' && !Array.isArray(x)) as Record<string, any>[];
  const keys: string[] = [];
  const seenKey = new Set<string>();
  for (const o of objs) {
    for (const k of Object.keys(o)) {
      if (!seenKey.has(k) && (isPrimitive(o[k]) || o[k] === null || o[k] === undefined)) { seenKey.add(k); keys.push(k); }
    }
  }
  const mapped = CODE_KEY_BY_PROPERTY[property];
  const codeKeys = keys.filter((k) => /code$/i.test(k));
  const codeKey =
    (mapped && seenKey.has(mapped) ? mapped : '') ||
    // no mapping: several *Code keys -> the LAST one (store / branch codes come first, the record's own code after them)
    codeKeys[codeKeys.length - 1] ||
    CODE_KEYS.find((k) => seenKey.has(k)) ||
    keys[0] ||
    '';
  const columns: Column[] = keys.map((k) => ({ key: k, label: k, isCode: k === codeKey }));

  const strKey = keys.find((k) => k.toLowerCase() === 'strcode') ?? '';
  const rows: MasterRow[] = [];
  const idCount = new Map<string, number>();
  for (const raw of objs) {
    const code = cell(raw[codeKey]);
    if (!code) continue;
    // stable id: all values of the row (so it survives a reload); exact duplicates get a counter
    const base = keys.map((k) => cell(raw[k])).join('\u0001');
    const n = idCount.get(base) ?? 0;
    idCount.set(base, n + 1);
    const id = n ? `${base}\u0002${n}` : base;
    const name = keys.filter((k) => k !== codeKey).map((k) => cell(raw[k])).filter(Boolean).join(' · ');
    rows.push({ id, code, strCode: strKey ? cell(raw[strKey]) : '', name: name || '—', address: '', raw });
  }
  return { rows, columns, codeKey };
}

/** Case-insensitive "all words must match" search over code, name and address. */
export function filterRows<T extends { code: string; name: string; address?: string }>(rows: T[], query: string): T[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return rows;
  return rows.filter((r) => {
    const hay = `${r.code} ${r.name} ${r.address ?? ''}`.toLowerCase();
    return words.every((w) => hay.includes(w));
  });
}

/* ------------------------------------------------------------------ */
/* Year number from the login response                                 */
/* ------------------------------------------------------------------ */

/** Finds YearNo anywhere inside a stored login payload (`year: { YearNo }`, `[{ yearno }]`, …). */
export function findYearNo(value: any, depth = 0): string {
  if (value === null || value === undefined || depth > 6) return '';
  if (Array.isArray(value)) {
    for (const entry of value) {
      const found = findYearNo(entry, depth + 1);
      if (found) return found;
    }
    return '';
  }
  if (typeof value !== 'object') return '';
  const direct = value.YearNo ?? value.yearNo ?? value.yearno ?? value.Yearno;
  if (direct !== undefined && direct !== null && isPrimitive(direct) && str(direct)) return str(direct);
  // prefer the `year` branch of the login response, then everything else
  const keys = Object.keys(value).sort((a, b) => Number(b.toLowerCase() === 'year') - Number(a.toLowerCase() === 'year'));
  for (const k of keys) {
    const child = value[k];
    if (child && typeof child === 'object') {
      const found = findYearNo(child, depth + 1);
      if (found) return found;
    }
  }
  return '';
}
