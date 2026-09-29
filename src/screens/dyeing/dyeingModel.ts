// FILE: src/screens/dyeing/dyeingModel.ts
// Shared model for the Dyeing module (Priority / Daily Update / Mill Hub).
//
// ONE place for:
//   - the hard-coded status list (existing 4 + new 'Lorry Cut')
//   - colours / first-letter badges used on cards, filters and sheets
//   - the stage rank used to derive a colour's status from its lots
//   - the re-work rule (a status repeated on the same lot = re-work)
//   - lorry-cut reasons
//   - types shared by the API service, mock store and all three tabs
//
// The backend (SalesOrderPartyPriorityRepository::save_dyeing_status) uses
// the SAME rank + re-work rule, so the mock and the real API behave alike.
//
// Storage (backend): the EXISTING FAMSOAllocationPriorityStatus table —
//   IsLot = 0 colour row (old status), IsLot = 1 one row per dyeing lot —
// plus the append-only FAMSOAllocationPriorityStatusHistory. `LotId` below is
// the Id of the lot's row in FAMSOAllocationPriorityStatus.
//
// Multiple lots: save_status / save_lot take `Lots: LotEntry[]` (one OR many
// lots in one all-or-nothing save). `SplitFromLotId` splits an existing lot:
// Lots[0] = that lot (keeps its history), Lots[1..] = new lots split from it.

import { T } from '@/src/theme';

/* -------------------------------------------------------------------------- */
/*  Status list — hard-coded (no backend enum). Strings are EXACTLY the ones   */
/*  already stored in FAMSOAllocationPriorityStatus.Status, plus 'Lorry Cut'.  */
/* -------------------------------------------------------------------------- */

export const STATUS_OPTIONS = ['Sent for job', 'Dying', 'Finish', 'Job inward', 'Lorry Cut'] as const;
export type ShadeStatus = (typeof STATUS_OPTIONS)[number];

export const STATUS_COLORS: Record<ShadeStatus, string> = {
  'Sent for job': T.amber,
  'Dying': T.red,
  'Finish': T.green,
  'Job inward': T.copper,
  'Lorry Cut': T.purple,
};

/** First-letter badge shown on the card (Lorry Cut uses the scissors glyph). */
export const STATUS_LETTER: Record<ShadeStatus, string> = {
  'Sent for job': 'S',
  'Dying': 'D',
  'Finish': 'F',
  'Job inward': 'J',
  'Lorry Cut': '✂',
};

/**
 * Stage rank. A colour's status = the LOWEST-ranked status among its lots
 * (the colour is only as far along as its slowest lot). Lorry Cut sits
 * between Sent and Dying: the lot has gone back for re-dyeing.
 */
export const STATUS_RANK: Record<ShadeStatus, number> = {
  'Sent for job': 1,
  'Lorry Cut': 2,
  'Dying': 3,
  'Finish': 4,
  'Job inward': 5,
};

/**
 * FIXED status sequence of one shade (Priority status sheet):
 *
 *   (none) → Sent for job → Dying → Finish → Job inward
 *                                          ↘ Lorry Cut
 *
 * Only the NEXT step of the shade's latest status can be sent — no skipping,
 * no going back, no repeating the same status. After Finish, either
 * Job inward OR Lorry Cut can come. Job inward / Lorry Cut are final.
 * To go back, the latest status has to be removed first (one at a time).
 */
export const NEXT_STATUSES: Record<ShadeStatus | 'NONE', ShadeStatus[]> = {
  NONE: ['Sent for job'],
  'Sent for job': ['Dying'],
  'Dying': ['Finish'],
  'Finish': ['Job inward', 'Lorry Cut'],
  'Job inward': [],
  'Lorry Cut': [],
};

export const nextStatusesOf = (current: ShadeStatus | null): ShadeStatus[] =>
  NEXT_STATUSES[current ?? 'NONE'] ?? [];

export const canMoveTo = (current: ShadeStatus | null, target: ShadeStatus) =>
  nextStatusesOf(current).includes(target);

/** Display / sequence order (index) — used as a tie-breaker when two events share a date. */
export const STATUS_SEQ: Record<ShadeStatus, number> = {
  'Sent for job': 1,
  'Dying': 2,
  'Finish': 3,
  'Job inward': 4,
  'Lorry Cut': 4,
};

export const LORRY_CUT_REASONS = [
  'White spots',
  'Patchiness',
  'Uneven dyeing',
  'Shade variation',
  'Crease marks',
  'Streaks',
  'Listing (side-centre variation)',
  'Poor fastness',
  'Stains / oil marks',
  'Other',
] as const;

export const normalizeStatus = (value: any): ShadeStatus | null => {
  if (value === null || value === undefined) return null;
  const trimmed = String(value).trim();
  if (!trimmed || trimmed.toLowerCase() === 'none') return null;
  const hit = (STATUS_OPTIONS as readonly string[]).find(
    (option) => option.toLowerCase() === trimmed.toLowerCase(),
  );
  return (hit as ShadeStatus) ?? null;
};

/* -------------------------------------------------------------------------- */
/*  Types                                                                      */
/* -------------------------------------------------------------------------- */

/** One append-only history event on a lot. */
export type DyeEvent = {
  Id: number | string;
  Status: ShadeStatus;
  StatusDate: string; // YYYY-MM-DD
  Qty: number;
  IsRework: boolean;
  LorryCutReason: string | null;
  Remarks: string | null;
  ChallanNo: string | null; // outward challan (Sent for job) / inward challan (Job inward)
  AgainstChallanNo: string | null; // Job inward -> which outward challan it closes
  MillName: string | null;
  Rate: number | null; // ₹/m, Job inward only (Mill Hub inward amount)
  CreatedBy: string | null;
  CreatedAt: string | null;
  FromLotNo?: string; // inherited event: the parent lot it happened on
  Source?: string | null; // 'DYEING' | 'LEGACY' (old /save_priority_status)
};

/** One dyeing lot of one colour. `LotId === null` = not yet saved (virtual). */
export type DyeLot = {
  LotId: number | null;
  LotNo: string;
  LotQty: number;
  Status: ShadeStatus | null;
  StatusDate: string | null;
  LorryCutCount: number;
  ParentId: number | null; // lot this one was split from
  history: DyeEvent[]; // this lot's own events
  inheritedHistory: DyeEvent[]; // parent lot(s) events before the split
  virtual?: boolean; // the un-split remainder of the colour
};

export type PriorityShade = {
  ShdCode: string;
  ShdName: string;
  OrderSrNo: number; // per-shade — status is saved against THIS, not the chart's
  AllocationId: number | null;
  AllocationQty: number;
  ClientPriority: number | null;
  SelfPriority: number | null;
  Status: ShadeStatus | null; // derived colour status (lowest lot)
  colourHistory: DyeEvent[]; // colour-level events (saved without lots / old API)
  lots: DyeLot[];
};

export type PriorityChart = {
  key: string;
  ChartNo: string;
  LastDate: string;
  OrderUId: number;
  OrderSrNo: number;
  ParCode: string;
  PartyName: string;
  DesignCode: string;
  DesignName: string;
  ApcChartName: string;
  qty: number;
  shades: PriorityShade[];
  savedClientPriority: number | null; // display only — never edited here
  savedSelfPriority: number | null;
  displayPriority: number;
};

/** One lot inside a multi-lot save. LotId null = new lot. */
export type LotEntry = {
  LotId: number | null;
  LotNo: string;
  LotQty?: number | null; // new lot / edited / split qty
  Qty?: number | null; // status save: qty for this event (empty = full lot)
  Remove?: boolean; // save_lot only
};

/**
 * Row-wise status save — ONE colour of one chart; one lot (single body)
 * or several lots (`Lots`) with the same status / date / challan.
 */
export type SaveStatusPayload = {
  prptype?: string;
  yearno?: string | number;
  OrderUId: number;
  OrderSrNo: number;
  ChartNo: string;
  ParCode: string;
  ShdCode: string;
  ShdName: string;
  AllocationId: number | null;
  DsnCode: string;
  DsnName: string;
  PartyName: string;
  LotId: number | null;
  LotNo: string;
  LotQty: number;
  Status: ShadeStatus;
  StatusDate: string;
  Qty: number;
  LorryCutReason: string | null;
  Remarks: string | null;
  ChallanNo: string | null;
  AgainstChallanNo: string | null;
  MillName: string | null;
  Rate: number | null;
  Lots?: LotEntry[];
  SplitFromLotId?: number | null;
};

/** Add / edit / remove one or many lots (split a colour / a lot into lots). */
export type SaveLotPayload = {
  prptype?: string;
  yearno?: string | number;
  OrderUId: number;
  OrderSrNo: number;
  ChartNo: string;
  ParCode: string;
  ShdCode: string;
  ShdName: string;
  AllocationId: number | null;
  DsnCode: string;
  DsnName: string;
  PartyName: string;
  ColourQty: number; // for the over-allocation check
  LotId: number | null; // null = new lot
  LotNo: string;
  LotQty: number;
  Remove?: boolean;
  Lots?: LotEntry[];
  SplitFromLotId?: number | null;
};

/** Flat event row used by Daily Update + Mill Hub (history + chart context). */
export type DyeEventRow = DyeEvent & {
  LotId: number | string;
  LotNo: string;
  LotStatus: ShadeStatus | null;
  ChartNo: string;
  OrderUId: number;
  OrderSrNo: number;
  ParCode: string;
  PartyName: string;
  ShdCode: string;
  ShdName: string;
  DsnCode: string;
  DsnName: string;
  RootLotId: number | string; // lot the material was first sent under (split lots share it)
  ChainLotCount: number; // active lots sharing RootLotId
  LotNos: string; // mill lot nos. saved on this shade's outwards (GRYOutD1.ChartLotNo), "3365/3378"
  OutwardNos: string; // outward challan nos. of this shade (FAMSAL.ChalNo), "00035/00038"
};

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                    */
/* -------------------------------------------------------------------------- */

export const num = (value: any) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

export const qtyLabel = (value: any) =>
  num(value).toLocaleString('en-IN', { maximumFractionDigits: 2 });

export const amountLabel = (value: any) =>
  `₹${num(value).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

export const pad2 = (n: number) => String(n).padStart(2, '0');

export const toISO = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

export const todayISO = () => toISO(new Date());

export const addDaysISO = (iso: string, days: number) => {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, (m || 1) - 1, d || 1);
  date.setDate(date.getDate() + days);
  return toISO(date);
};

/** Accepts YYYY-MM-DD, YYYYMMDD or DD-MM-YYYY; returns YYYY-MM-DD or ''. */
export const parseAnyDate = (value: any): string => {
  const raw = String(value ?? '').trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  if (/^\d{8}$/.test(raw)) return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
  const m = raw.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (m) return `${m[3]}-${pad2(Number(m[2]))}-${pad2(Number(m[1]))}`;
  return '';
};

/** YYYY-MM-DD -> DD-MM-YYYY for display. */
export const showDate = (value: any) => {
  const iso = parseAnyDate(value);
  if (!iso) return String(value ?? '') || '—';
  return `${iso.slice(8, 10)}-${iso.slice(5, 7)}-${iso.slice(0, 4)}`;
};

export const shortDate = (value: any) => {
  const iso = parseAnyDate(value);
  if (!iso) return '—';
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${iso.slice(8, 10)} ${months[Number(iso.slice(5, 7)) - 1]}`;
};

/** Lowest-ranked status among a colour's saved lots (null if none started). */
export const deriveColourStatus = (lots: DyeLot[]): ShadeStatus | null => {
  let best: ShadeStatus | null = null;
  lots.forEach((lot) => {
    if (!lot.Status || lot.virtual) return;
    if (!best || STATUS_RANK[lot.Status] < STATUS_RANK[best]) best = lot.Status;
  });
  return best;
};

/**
 * Re-work rule (same on the backend): an event is re-work when the SAME
 * status was already recorded earlier on the SAME lot. So a lot that is
 * dyed, lorry-cut and dyed again counts its first Dying as production and the
 * second as re-work (Redyed). Physical movement is therefore never counted
 * twice in Daily Update / Mill Hub.
 */
export const isReworkFor = (history: Pick<DyeEvent, 'Status'>[], status: ShadeStatus) =>
  status !== 'Lorry Cut' && history.some((event) => event.Status === status);

/**
 * Everything that "already happened" to a lot for the rules (Lorry Cut needs
 * a Dying, repeated status = Re-work): colour-level events + the parent
 * lots' events before the split + the lot's own events. Same on the backend.
 */
export const ruleHistory = (lot: DyeLot, shade: Pick<PriorityShade, 'colourHistory'>): DyeEvent[] => [
  ...(shade.colourHistory || []),
  ...(lot.inheritedHistory || []),
  ...(lot.history || []),
];

/**
 * "L101, L102 L103" / one per line -> ['L101', 'L102', 'L103'].
 * Commas, semicolons, new lines and tabs separate; if the text has none of
 * those, spaces separate. Duplicates (case-insensitive) are dropped.
 */
export const parseLotNos = (text: string): string[] => {
  const raw = String(text || '').trim();
  if (!raw) return [];
  const parts = /[,;\n\t]/.test(raw) ? raw.split(/[,;\n\t]+/) : raw.split(/\s+/);
  const seen = new Set<string>();
  const out: string[] = [];
  parts.map((p) => p.trim().toUpperCase()).filter(Boolean).forEach((p) => {
    if (seen.has(p)) return;
    seen.add(p);
    out.push(p);
  });
  return out;
};

/** Splits `total` into `n` parts (2 decimals); the last part takes the rounding. */
export const splitEqually = (total: number, n: number): number[] => {
  if (n <= 0 || !(total > 0)) return [];
  const each = Math.floor((total / n) * 100) / 100;
  const parts = Array.from({ length: n }, () => each);
  parts[n - 1] = Math.round((total - each * (n - 1)) * 1000) / 1000;
  return parts;
};

/** One editable row of the multiple-lot editor. */
export type LotRowDraft = { LotNo: string; Qty: string; LotId?: number | null };

/**
 * Validates the multiple-lot rows. Returns an error message or the clean
 * rows ({LotNo, qty}). `taken` = lot nos already used by OTHER lots of the
 * colour (upper-case).
 */
export const validateLotRows = (
  rows: LotRowDraft[],
  available: number,
  taken: string[],
  minRows = 2,
): { error: string } | { rows: { LotId: number | null; LotNo: string; qty: number }[] } => {
  const clean = rows
    .map((r) => ({ LotId: r.LotId ?? null, LotNo: r.LotNo.trim().toUpperCase(), qty: num(r.Qty) }))
    .filter((r) => r.LotId != null || r.LotNo || r.qty > 0);
  if (clean.length < minRows) return { error: `Enter at least ${minRows} lots.` };
  const seen = new Set<string>();
  const takenSet = new Set(taken.map((t) => t.trim().toUpperCase()).filter(Boolean));
  for (let i = 0; i < clean.length; i += 1) {
    const r = clean[i];
    if (!r.LotNo) return { error: `Row ${i + 1}: Lot No. is required.` };
    if (!(r.qty > 0)) return { error: `Row ${i + 1}: enter qty.` };
    if (seen.has(r.LotNo)) return { error: `Lot No. ${r.LotNo} is entered twice.` };
    if (takenSet.has(r.LotNo)) return { error: `Lot No. ${r.LotNo} already exists on this colour.` };
    seen.add(r.LotNo);
  }
  const total = clean.reduce((sum, r) => sum + r.qty, 0);
  if (total > available + 0.001) {
    return { error: `Lots total ${qtyLabel(total)} m — only ${qtyLabel(available)} m available.` };
  }
  return { rows: clean };
};

/**
 * Builds the lot list the UI works with: the saved lots plus a virtual
 * "unsplit remainder" when the lots do not yet cover the colour's quantity.
 * A colour with no saved lots becomes one virtual lot carrying the old
 * (legacy, colour-level) status so nothing that was saved before is lost.
 */
export const withVirtualRemainder = (
  savedLots: DyeLot[],
  colourQty: number,
  legacyStatus: ShadeStatus | null,
): DyeLot[] => {
  const lots = savedLots.filter((lot) => !lot.virtual);
  if (!lots.length) {
    return [{
      LotId: null,
      LotNo: '',
      LotQty: colourQty,
      Status: legacyStatus,
      StatusDate: null,
      LorryCutCount: 0,
      ParentId: null,
      history: [],
      inheritedHistory: [],
      virtual: true,
    }];
  }
  const used = lots.reduce((sum, lot) => sum + num(lot.LotQty), 0);
  const remainder = Math.round((colourQty - used) * 1000) / 1000;
  if (remainder > 0) {
    lots.push({
      LotId: null,
      LotNo: '',
      LotQty: remainder,
      Status: null,
      StatusDate: null,
      LorryCutCount: 0,
      ParentId: null,
      history: [],
      inheritedHistory: [],
      virtual: true,
    });
  }
  return lots;
};

export const weekdayOf = (iso: string) => {
  const [y, mo, d] = iso.split('-').map(Number);
  return ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][new Date(y, mo - 1, d).getDay()];
};

/** Normalises one flat event row from daily_update / mill_hub responses. */
export const toEventRow = (raw: any): DyeEventRow | null => {
  const status = normalizeStatus(raw?.Status);
  if (!status) return null;
  return {
    Id: raw?.Id,
    Status: status,
    StatusDate: parseAnyDate(raw?.StatusDate),
    Qty: num(raw?.Qty),
    IsRework: !!Number(raw?.IsRework ?? 0) || raw?.IsRework === true,
    LorryCutReason: raw?.LorryCutReason ?? null,
    Remarks: raw?.Remarks ?? null,
    ChallanNo: raw?.ChallanNo ?? null,
    AgainstChallanNo: raw?.AgainstChallanNo ?? null,
    MillName: raw?.MillName ?? null,
    Rate: raw?.Rate != null ? num(raw.Rate) : null,
    CreatedBy: raw?.CreatedBy ?? null,
    CreatedAt: raw?.CreatedAt ?? null,
    LotId: raw?.LotId,
    LotNo: String(raw?.LotNo ?? ''),
    LotStatus: normalizeStatus(raw?.LotStatus),
    ChartNo: String(raw?.ChartNo ?? ''),
    OrderUId: num(raw?.OrderUId),
    OrderSrNo: num(raw?.OrderSrNo),
    ParCode: String(raw?.ParCode ?? ''),
    PartyName: String(raw?.PartyName ?? ''),
    ShdCode: String(raw?.ShdCode ?? ''),
    ShdName: String(raw?.ShdName ?? ''),
    DsnCode: String(raw?.DsnCode ?? ''),
    DsnName: String(raw?.DsnName ?? ''),
    RootLotId: raw?.RootLotId ?? raw?.LotId,
    ChainLotCount: Math.max(1, num(raw?.ChainLotCount) || 1),
    LotNos: String(raw?.LotNos ?? '').trim(),
    OutwardNos: String(raw?.OutwardNos ?? '').trim(),
    Source: raw?.Source ?? null,
  };
};

