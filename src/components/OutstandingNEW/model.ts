// FILE: src/components/OutstandingNEW/model.ts
// Rules of the three "outstanding dashboard" screens (Receivables, Receivables
// Sudamo, Payable) — no React, no network. Everything here mirrors the inline
// expressions of the legacy screens:
//   components/Receivables/index.tsx        + CustomDrawer.tsx
//   components/ReceivablesSudamo/index.tsx  + CustomDrawer.tsx
//   components/Payable/index.tsx            + CustomDrawer.tsx
import AsyncStorage from '@/common/utils/compatibleStorage';

export type Row = Record<string, any>;

/* ------------------------------------------------------------------ */
/* The three screens                                                   */
/* ------------------------------------------------------------------ */

export type VariantKey = 'receivables' | 'receivablesSudamo' | 'payable';

export type Variant = {
  key: VariantKey;
  /** Breadcrumb / titles ("Receivables > Over Due summary"). */
  title: string;
  /** legacy `txntype` of every call. */
  txntype: string;
  /** legacy `dashview` of every call. */
  dashview: string;
  /** Internal / External / Both value selected when the screen opens. */
  internalDefault: string;
  /** The Sales Executive filter exists on both Receivables screens, not on Payable. */
  salesExecutiveFilter: boolean;
  /** Rayons Receivables only: the role "Receivables View Combine" hides the
   *  property-group picker and sends prptype 'R'. */
  combineRole: boolean;
  /** Payable sent Content-Type / Accept on the sync call, Receivables did not. */
  fullSyncHeaders: boolean;
  /** Which column sets the summary tables use. */
  tables: 'receivables' | 'payable';
  /** Order of the bill details: by TRANID, or by NTRANDATE + TRANID (Payable). */
  detailOrder: 'tranid' | 'dateTranid';
  searchPlaceholder: string;
  /** Words used in empty states / buttons. */
  noun: string;
};

export const VARIANTS: Record<VariantKey, Variant> = {
  receivables: {
    key: 'receivables',
    title: 'Receivables',
    txntype: '/receivables-view',
    dashview: 'outstanding',
    internalDefault: '0', // legacy: internal_dropdown[1] = External
    salesExecutiveFilter: true,
    combineRole: true,
    fullSyncHeaders: false,
    tables: 'receivables',
    detailOrder: 'tranid',
    searchPlaceholder: 'Search receivables...',
    noun: 'receivables',
  },
  receivablesSudamo: {
    key: 'receivablesSudamo',
    title: 'Receivables',
    txntype: '/receivables-view',
    dashview: 'outstanding',
    internalDefault: '0', // legacy: internal_dropdown[1] = External
    salesExecutiveFilter: true,
    combineRole: false,
    fullSyncHeaders: false,
    tables: 'receivables',
    detailOrder: 'tranid',
    searchPlaceholder: 'Search receivables...',
    noun: 'receivables',
  },
  payable: {
    key: 'payable',
    title: 'Payable',
    txntype: '/payable-view',
    dashview: 'payable',
    internalDefault: '1', // legacy: internal_dropdown[0] = Internal
    salesExecutiveFilter: false,
    combineRole: false,
    fullSyncHeaders: true,
    tables: 'payable',
    detailOrder: 'dateTranid',
    searchPlaceholder: 'Search payable...',
    noun: 'payables',
  },
};

/** legacy internal_dropdown */
export type InternalOption = { label: string; value: string };
export const INTERNAL_OPTIONS: InternalOption[] = [
  { label: 'Internal', value: '1' },
  { label: 'External', value: '0' },
  { label: 'Both', value: '-1' },
];

/* ------------------------------------------------------------------ */
/* Role "Receivables View Combine" (Rayons Receivables)                */
/* ------------------------------------------------------------------ */

export const COMBINE_ROLE = 'Receivables View Combine';

/** Role names out of the login `role1` value. Legacy stored JSON.stringify(role1)
 *  and read: array whose first entry is a comma separated string, else an array
 *  of names. A plain comma separated string is accepted too. */
export function roleNames(role1: any): string[] {
  let value = role1;
  if (typeof value === 'string') {
    const text = value.trim();
    if (!text) return [];
    try {
      value = JSON.parse(text);
    } catch {
      value = text;
    }
  }
  if (typeof value === 'string') return value.split(',').map((r) => r.trim()).filter(Boolean);
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  value.forEach((entry) => {
    if (typeof entry === 'string') entry.split(',').forEach((r) => { if (r.trim()) out.push(r.trim()); });
  });
  return out;
}

/** true when the logged-in user has the role "Receivables View Combine".
 *  Legacy read AsyncStorage 'user_login_role' (written by the Legacy login).
 *  The ERP login keeps the same role1 inside 'mobile_raw_login_response', so
 *  that is read first and 'user_login_role' is the fallback. */
export async function readCombineRole(): Promise<boolean> {
  try {
    const rawLogin = await AsyncStorage.getItem('mobile_raw_login_response');
    if (rawLogin) {
      const login = JSON.parse(rawLogin);
      if (login && typeof login === 'object' && 'role1' in login) {
        return roleNames(login.role1).includes(COMBINE_ROLE);
      }
    }
  } catch {
    // fall through to the legacy key
  }
  try {
    const role = await AsyncStorage.getItem('user_login_role');
    return role ? roleNames(role).includes(COMBINE_ROLE) : false;
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------------ */
/* Filters -> request payloads                                         */
/* ------------------------------------------------------------------ */

export type Selection = {
  group: Row | null;        // property group  { PrpTypeCode, PrpTypeOf }
  internal: InternalOption; // Internal / External / Both
  properties: Row[];        // { PrpCode, PrpName }
  party: Row | null;        // single party { acccode, accname, ParCode }
  subHeads: Row[];          // { SHead, SHName }
  salesExes: Row[];         // { Code, SalesExecutive }
  combine: boolean;         // role "Receivables View Combine"
};

/** legacy: hideprpGroup === true ? 'R' : selectedPrpgrp?.PrpTypeCode */
export const prpTypeOf = (v: Variant, sel: Pick<Selection, 'group' | 'combine'>) =>
  v.combineRole && sel.combine ? 'R' : sel.group?.PrpTypeCode;

const pad2 = (n: number) => String(n).padStart(2, '0');
/** legacy formatDate123: yyyy-MM-dd */
export const ymd = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

/** legacy: first day of the current month -> today */
export function monthToDate(now: Date = new Date()) {
  return { fromdate: ymd(new Date(now.getFullYear(), now.getMonth(), 1)), todate: ymd(now) };
}

/** "Load" (legacy handleConfirmAction): POST /api/dashdata, fetch 'summary'. */
export function buildSummaryPayload(v: Variant, sel: Selection, now: Date = new Date()): Row {
  const { fromdate, todate } = monthToDate(now);
  return {
    CardName: '',
    prptype: prpTypeOf(v, sel),
    accounts: [],
    prpcodes: sel.properties.map((item) => item.PrpCode),
    sheadcodes: sel.subHeads.map((item) => item.SHead),
    fetch: 'summary',
    dashstyle: '1',
    dashview: v.dashview,
    fromdate,
    todate,
    for: 'sales',
    uom: '1',
    uomname: '',
    gridid: '0',
    gridgroup: '',
    showinternal: sel.internal.value,
    storecode: '',
    stockdate: todate,
    ageing: '30',
    ageing2: '60',
    display: '1',
    export: 'Excel',
    salesexes: sel.salesExes.map((item) => item.Code),
    dashparcode: sel.party ? sel.party.ParCode : undefined,
    txntype: v.txntype,
  };
}

/** Card tap (legacy handleConfirmActionNew): POST /api/dashdata, fetch 'slabdetail'. */
export function buildSlabPayload(v: Variant, sel: Selection, card: Row, now: Date = new Date()): Row {
  const { fromdate, todate } = monthToDate(now);
  return {
    CardName: String(card?.caption ?? '').toUpperCase(),
    accounts: [],
    prptype: prpTypeOf(v, sel),
    prpcodes: sel.properties.map((item) => item.PrpCode),
    sheadcodes: sel.subHeads.map((item) => item.SHead),
    fetch: 'slabdetail',
    dashstyle: '1',
    dashview: v.dashview,
    fromdate,
    todate,
    for: 'sales',
    uom: '1',
    uomname: '',
    gridid: 0,
    gridfilter: [],
    gridgroup: '',
    showinternal: sel.internal.value,
    slab: [],
    storecode: '',
    stockdate: todate,
    ageing: 30,
    ageing2: 0,
    selecetedslab: card && [card], // (sic) key name as the API expects it
    display: '1',
    export: 'Excel',
    salesexes: sel.salesExes.map((item) => item.Code),
    dashparcode: (sel.party && sel.party.ParCode) || '',
    txntype: v.txntype,
  };
}

/** legacy: the dashboard is accepted only when cards, details and summary all have rows. */
export const hasDashRows = (d: { cards: Row[]; details: Row[]; summary: Row[] }) =>
  d.cards.length > 0 && d.details.length > 0 && d.summary.length > 0;

/* ------------------------------------------------------------------ */
/* Numbers                                                             */
/* ------------------------------------------------------------------ */

/** legacy: parseFloat(x) || 0 */
export const toNum = (v: any): number => parseFloat(v) || 0;

/** Indian digit grouping (same result as toLocaleString('en-IN'), without
 *  depending on the device's Intl support). */
export function inr(value: number, decimals = 0): string {
  if (!Number.isFinite(value)) return decimals > 0 ? `0.${'0'.repeat(decimals)}` : '0';
  const fixed = Math.abs(value).toFixed(decimals);
  const [int, frac] = fixed.split('.');
  let grouped = int;
  if (int.length > 3) {
    const head = int.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',');
    grouped = `${head},${int.slice(-3)}`;
  }
  const body = frac ? `${grouped}.${frac}` : grouped;
  return value < 0 && Number(fixed) !== 0 ? `-${body}` : body;
}

/** Amount with 2 decimals (legacy table cells / footers). */
export const money2 = (v: any): string => inr(toNum(v), 2);

/** Whole rupees: commas removed, decimals dropped (legacy dashboard cards and
 *  the Receivables "Advance" table). */
export function whole(v: any): string {
  if (!v && v !== 0) return '0';
  const num = parseFloat(typeof v === 'string' ? v.replace(/,/g, '') : v);
  if (isNaN(num)) return '0';
  return inr(Math.floor(num), 0);
}

/** legacy: a card whose amount is exactly 0 cannot be opened. */
export const isZeroAmount = (summary: any) => parseFloat(String(summary ?? '').replace(/,/g, '')) === 0;

/** "19.54 Cr" / "50.41 L" helper line under a card amount (display only). */
export function compactInr(v: any): string {
  const n = parseFloat(String(v ?? '').replace(/,/g, ''));
  if (!Number.isFinite(n)) return '';
  const a = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (a >= 1e7) return `${sign}${(a / 1e7).toFixed(2)} Cr`;
  if (a >= 1e5) return `${sign}${(a / 1e5).toFixed(2)} L`;
  if (a >= 1e3) return `${sign}${(a / 1e3).toFixed(1)} K`;
  return '';
}

/* ------------------------------------------------------------------ */
/* Search                                                              */
/* ------------------------------------------------------------------ */

const has = (value: any, q: string) => String(value ?? '').toLowerCase().includes(q);

/** legacy summary / details search: any value of the row contains the text. */
export function filterRows<T extends Row>(rows: T[], query: string): T[] {
  const q = query.toLowerCase();
  if (!q) return rows;
  return rows.filter((item) => Object.values(item).some((val) => String(val).toLowerCase().includes(q)));
}

/** legacy card search: caption contains the text; when nothing matches every card stays visible. */
export function visibleCards(cards: Row[], query: string): Row[] {
  const q = query.toLowerCase();
  const filtered = cards.filter((item) => has(item.caption, q));
  return filtered.length > 0 ? filtered : cards;
}

export const filterProperties = (rows: Row[], query: string) => {
  const q = query.toLowerCase();
  return rows.filter((p) => has(p.PrpCode, q) || has(p.PrpName, q));
};
export const filterParties = (rows: Row[], query: string) => {
  const q = query.toLowerCase();
  return rows.filter((p) => has(p.acccode, q) || has(p.accname, q));
};
export const filterSubHeads = (rows: Row[], query: string) => {
  const q = query.toLowerCase();
  return rows.filter((p) => has(p.SHName, q) || has(p.SHead, q));
};
export const filterSalesExes = (rows: Row[], query: string) => {
  const q = query.toLowerCase();
  return rows.filter((p) => has(p.Code, q) || has(p.SalesExecutive, q));
};

/* ------------------------------------------------------------------ */
/* Tables                                                              */
/* ------------------------------------------------------------------ */

export type Fmt = 'text' | 'money' | 'whole';
export type Align = 'left' | 'right' | 'center';
export type Col = {
  key: string;
  label: string;
  width: number;
  align: Align;
  fmt: Fmt;
  /** summed in the Totals row */
  sum?: boolean;
  /** the "open details" button column */
  action?: boolean;
};

export const ACTION_KEY = '__action';
const W = { name: 220, amt: 132, txt: 140, small: 110, action: 84 };

const name = (label = 'Account Name'): Col => ({ key: 'AccName', label, width: W.name, align: 'left', fmt: 'text' });
const amt = (key: string, label: string, fmt: Fmt = 'money'): Col => ({ key, label, width: W.amt, align: 'right', fmt, sum: true });
const txt = (key: string, label: string, align: Align = 'left', width = W.txt): Col => ({ key, label, width, align, fmt: 'text' });
const action = (): Col => ({ key: ACTION_KEY, label: 'Details', width: W.action, align: 'center', fmt: 'text', action: true });

export type SummaryKind = 'default' | 'advance' | 'onaccount';

/** legacy: caption == 'On Account' -> on-account table, 'Advance' -> advance table, else the slab table. */
export const summaryKindOf = (caption: any): SummaryKind =>
  caption == 'On Account' ? 'onaccount' : caption == 'Advance' ? 'advance' : 'default';

const slabs = (fmt: Fmt): Col[] => [
  amt('slab1', '0-30', fmt),
  amt('slab2', '31-60', fmt),
  amt('slab3', '61-90', fmt),
  amt('slab4', '91-120', fmt),
  amt('slab5', '121 Above', fmt),
];

/** Columns of the party summary of a card, in the legacy column order. */
export function summaryColumns(v: Variant, kind: SummaryKind): Col[] {
  if (v.tables === 'payable') {
    if (kind === 'onaccount') {
      return [name(), amt('amount', 'Amount'), action(), txt('city', 'City'), txt('AccCode', 'Code', 'center', W.small)];
    }
    const tail: Col[] = [
      amt('onaccount', 'On Account'),
      amt('nclramt', 'NCL Amount'),
      amt('pdcamt', 'PDC Amount'),
      ...slabs('money'),
      txt('crday', 'Credit Days', 'center', W.small),
      txt('AccCode', 'Code', 'center', W.small),
    ];
    return kind === 'advance'
      ? [name(), amt('advance', 'Advance'), amt('Total', 'Outstanding'), action(), ...tail]
      : [name(), amt('Total', 'Outstanding'), action(), amt('advance', 'Advance'), ...tail];
  }

  // Receivables (Rayons + Sudamo)
  if (kind === 'onaccount') {
    return [
      name(),
      amt('amount', 'Amount'),
      action(),
      txt('crday', 'Credit Days', 'center', W.small),
      amt('crlimit', 'Credit Limit'),
      txt('sexename', 'Sales Executive'),
      txt('AccCode', 'Code', 'center', W.small),
      txt('BrkName', 'Broker'),
    ];
  }
  // legacy: the Advance table shows whole rupees, the slab table 2 decimals
  const fmt: Fmt = kind === 'advance' ? 'whole' : 'money';
  const tail: Col[] = [
    amt('onaccount', 'On Account', fmt),
    amt('nclramt', 'NCL Amount', fmt),
    amt('pdcamt', 'PDC Amount', fmt),
    ...slabs(fmt),
    txt('crday', 'Credit Days', 'center', W.small),
    txt('sename', 'Sales Executive'),
    txt('AccCode', 'Code', 'center', W.small),
    amt('crlimit', 'Credit Limit', fmt),
    txt('BrkName', 'Broker'),
  ];
  return kind === 'advance'
    ? [name(), amt('advance', 'Advance', fmt), action(), amt('Total', 'Total', fmt), ...tail]
    : [name(), amt('Total', 'Total', fmt), action(), amt('advance', 'Advance', fmt), ...tail];
}

export type DetailKind = 'bills' | 'onaccount';
export const detailKindOf = (caption: any): DetailKind => (caption == 'On Account' ? 'onaccount' : 'bills');

/** Columns of the bill details of one account. */
export function detailColumns(kind: DetailKind): Col[] {
  if (kind === 'onaccount') {
    return [
      txt('chqno', 'Chq. No.', 'left', 150),
      txt('chqdate', 'Chq. Date', 'center', 130),
      txt('remark', 'Remark', 'left', 220),
      txt('clrdate', 'Clr. Date', 'center', 130),
      amt('AMOUNT', 'Amount'),
    ];
  }
  return [
    txt('TYPE', 'Type', 'center', W.small),
    txt('TRANDATE', 'Date', 'center', 130),
    txt('VOUNO', 'Vou. No.', 'left', 190),
    amt('CUMBAL', 'Balance'),
    txt('DUEDAY', 'Due Days', 'center', W.small),
    amt('Cumulative', 'Cumulative'),
  ];
}

/** Text of one cell. */
export function cellText(col: Col, row: Row): string {
  const v = row?.[col.key];
  if (col.fmt === 'money') return money2(v);
  if (col.fmt === 'whole') return whole(v);
  return v === undefined || v === null || String(v).trim() === '' ? '—' : String(v);
}

/** legacy calculateTotals: sum of parseFloat(x) || 0 for every summed column. */
export function columnTotals(cols: Col[], rows: Row[]): Record<string, number> {
  const totals: Record<string, number> = {};
  cols.forEach((c) => {
    if (!c.sum) return;
    totals[c.key] = rows.reduce((sum, item) => sum + toNum(item[c.key]), 0);
  });
  return totals;
}

/** Text of one Totals cell ('' for columns that are not summed). */
export function totalText(col: Col, totals: Record<string, number>): string {
  if (!col.sum) return '';
  const t = totals[col.key] || 0;
  return col.fmt === 'whole' ? inr(Math.floor(t), 0) : inr(t, 2);
}

/** legacy: details of the tapped account = rows whose ACCCODE equals the summary AccCode. */
export const detailsOfAccount = (details: Row[], accCode: any) => details.filter((d) => d.ACCCODE === accCode);

/** Bill details with the running "Cumulative" balance, newest first.
 *  Receivables: ordered by TRANID. Payable: ordered by "NTRANDATE-TRANID".
 *  The running total is built oldest -> newest, then the list is shown newest -> oldest. */
export function withCumulative(v: Variant, rows: Row[]): Row[] {
  const byTranId = (a: Row, b: Row) => (parseFloat(a.TRANID) - parseFloat(b.TRANID)) || 0;
  const dateKey = (item: Row) => `${item.NTRANDATE}-${item.TRANID}`;

  const sorted =
    v.detailOrder === 'dateTranid'
      ? [...rows].sort((a, b) => dateKey(a).localeCompare(dateKey(b)))
      : [...rows].sort(byTranId);

  let running = 0;
  const cumulative = sorted.map((item) => {
    running += toNum(item.CUMBAL);
    return { ...item, Cumulative: running.toString() };
  });

  return v.detailOrder === 'dateTranid'
    ? cumulative.reverse()
    : cumulative.sort((a, b) => byTranId(b, a));
}

/* ------------------------------------------------------------------ */
/* Card looks (presentation only)                                      */
/* ------------------------------------------------------------------ */

export type SlabLook = { icon: string; tone: 'nav' | 'blue' | 'red' | 'green' | 'amber' | 'purple' | 'copper' | 'yd' | 'pd'; hint: string };

export function slabLook(v: Variant, card: Row): SlabLook {
  const slab = String(card?.slab ?? '').toLowerCase();
  const pay = v.tables === 'payable';
  switch (slab) {
    case 'all':
      return { icon: 'account-balance', tone: 'nav', hint: pay ? 'Total payable to all parties' : 'Total receivable from all parties' };
    case 'adv':
      return { icon: 'account-balance-wallet', tone: 'blue', hint: pay ? 'Paid in advance' : 'Received in advance' };
    case 'overdue':
      return { icon: 'warning-amber', tone: 'red', hint: 'Bills past the due date' };
    case 'notdue':
      return { icon: 'event-available', tone: 'green', hint: 'Bills not due yet' };
    case 'duetoday':
      return { icon: 'today', tone: 'amber', hint: 'Bills due today' };
    case 'onaccount':
      return { icon: 'payments', tone: 'purple', hint: 'Not adjusted against a bill' };
    case 'limitcross':
      return { icon: 'trending-up', tone: 'pd', hint: 'Outstanding above the credit limit' };
    case 'slab1':
      return { icon: 'date-range', tone: 'yd', hint: 'Bills in this age range' };
    case 'slab2':
      return { icon: 'date-range', tone: 'copper', hint: 'Bills in this age range' };
    case 'slab3':
      return { icon: 'date-range', tone: 'amber', hint: 'Bills in this age range' };
    case 'slab4':
      return { icon: 'hourglass-bottom', tone: 'pd', hint: 'Bills in this age range' };
    case 'slab5':
      return { icon: 'hourglass-bottom', tone: 'red', hint: 'Oldest bills' };
    default:
      return { icon: 'list-alt', tone: 'copper', hint: '' };
  }
}

/** Short text for the filter chips under the search box. */
export function selectionChips(v: Variant, sel: Selection): { icon: string; text: string }[] {
  const chips: { icon: string; text: string }[] = [];
  if (!(v.combineRole && sel.combine)) {
    chips.push({ icon: 'domain', text: String(sel.group?.PrpTypeOf || 'Select Property Group') });
  }
  chips.push({ icon: 'swap-horiz', text: sel.internal.label });
  if (sel.properties.length) chips.push({ icon: 'business', text: sel.properties.length === 1 ? String(sel.properties[0].PrpName) : `${sel.properties.length} properties` });
  if (sel.party) chips.push({ icon: 'person', text: String(sel.party.accname) });
  if (sel.subHeads.length) chips.push({ icon: 'account-tree', text: sel.subHeads.length === 1 ? String(sel.subHeads[0].SHName) : `${sel.subHeads.length} sub heads` });
  if (sel.salesExes.length) chips.push({ icon: 'badge', text: sel.salesExes.length === 1 ? String(sel.salesExes[0].SalesExecutive) : `${sel.salesExes.length} sales executives` });
  return chips;
}

/** Number of optional filters in use (badge on the Filters button). */
export const selectionCount = (sel: Selection) =>
  (sel.properties.length ? 1 : 0) + (sel.party ? 1 : 0) + (sel.subHeads.length ? 1 : 0) + (sel.salesExes.length ? 1 : 0);
