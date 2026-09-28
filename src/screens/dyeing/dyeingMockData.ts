// FILE: src/screens/dyeing/dyeingMockData.ts
// HARD-CODED JSON + an in-memory mock "backend" for the Dyeing module.
//
// Used by dyeingApi.ts while the new backend endpoints are not deployed.
// Everything lives in module memory only (no AsyncStorage / browser
// storage): saves made while testing show up immediately on re-browse, the
// Daily Update and Mill Hub, and reset when the app reloads.
//
// The response SHAPES here are exactly what the backend returns:
//   POST /dyeing/priority_browse   -> { data: { Charts: [...] } }
//   POST /save_priority_party      -> { status: true }
//   POST /dyeing/save_status       -> { status: true, data: { Lot, Lots } }
//   POST /dyeing/save_lot          -> { status: true, data: { Lot, Lots } }
//   POST /dyeing/daily_update      -> { data: { Events: [...] } }
//   POST /dyeing/mill_hub          -> { data: { Events: [...] } }
// The mock applies the SAME validation, rank, re-work, multiple-lot and
// split rules as the PHP repository (all-or-nothing saves included), so
// behaviour matches once the real API is switched on.
//
// Backend storage it imitates: FAMSOAllocationPriorityStatus (IsLot = 0 the
// colour row -> `colourRowId` / `colourHistory` here; IsLot = 1 one row per
// lot -> `lots`) + FAMSOAllocationPriorityStatusHistory (`history`).

import {
  addDaysISO,
  DyeEvent,
  DyeEventRow,
  LotEntry,
  normalizeStatus,
  num,
  SaveLotPayload,
  SaveStatusPayload,
  ShadeStatus,
  STATUS_RANK,
  todayISO,
} from './dyeingModel';

export const mockDelay = (ms = 300) => new Promise((resolve) => setTimeout(resolve, ms));

/* -------------------------------------------------------------------------- */
/*  Raw backend-shaped records                                                 */
/* -------------------------------------------------------------------------- */

type RawEvent = Omit<DyeEvent, 'IsRework'> & { IsRework: 0 | 1 | boolean };
type RawLot = {
  LotId: number;
  LotNo: string;
  LotQty: number;
  Status: ShadeStatus | null;
  StatusDate: string | null;
  LorryCutCount: number;
  ParentId: number | null;
  bornAt: number; // event-id counter when the lot was created (inheritance cut-off)
  history: RawEvent[];
};
type RawShade = {
  ShdCode: string;
  ShdName: string;
  OrderSrNo: number;
  AllocationId: number | null;
  Qty: number;
  ClientPriority: number;
  SelfPriority: number;
  Status: ShadeStatus | null; // colour row status (FAMSOAllocationPriorityStatus, IsLot = 0)
  colourRowId: string;
  colourHistory: RawEvent[];
  lots: RawLot[];
};
type RawChart = {
  ChartNo: string;
  OrderUId: number;
  OrderSrNo: number;
  ParCode: string;
  PartyName: string;
  dsncode: string;
  dsnname: string;
  apcchartname: string;
  LastDate: string;
  ClientPriority: number;
  SelfPriority: number;
  shades: RawShade[];
};

let nextLotId = 5001;
let nextEventId = 90001;
let nextColourRowId = 1;
const T0 = todayISO();
const ago = (days: number) => addDaysISO(T0, -days);

type SeedEvent = [ShadeStatus, number /* days ago */, number /* qty */, Partial<RawEvent>?];

const isReworkIn = (statuses: string[], status: ShadeStatus) => status !== 'Lorry Cut' && statuses.includes(status);

function seedLot(lotNo: string, qty: number, events: SeedEvent[]): RawLot {
  const history: RawEvent[] = [];
  let lorry = 0;
  events.forEach(([status, days, evQty, extra]) => {
    history.push({
      Id: nextEventId++,
      Status: status,
      StatusDate: ago(days),
      Qty: evQty,
      IsRework: isReworkIn(history.map((h) => h.Status), status) ? 1 : 0,
      LorryCutReason: null,
      Remarks: null,
      ChallanNo: null,
      AgainstChallanNo: null,
      MillName: null,
      Rate: null,
      CreatedBy: 'mock',
      CreatedAt: `${ago(days)} 10:00:00`,
      Source: 'DYEING',
      ...extra,
    });
    if (status === 'Lorry Cut') lorry += 1;
  });
  const last = history[history.length - 1];
  return {
    LotId: nextLotId++,
    LotNo: lotNo,
    LotQty: qty,
    Status: last ? last.Status : null,
    StatusDate: last ? last.StatusDate : null,
    LorryCutCount: lorry,
    ParentId: null,
    bornAt: 0,
    history,
  };
}

function legacyEvent(status: ShadeStatus, qty: number): RawEvent {
  return {
    Id: nextEventId++,
    Status: status,
    StatusDate: ago(5),
    Qty: qty,
    IsRework: 0,
    LorryCutReason: null,
    Remarks: 'Migrated from old status',
    ChallanNo: null,
    AgainstChallanNo: null,
    MillName: null,
    Rate: null,
    CreatedBy: 'mock',
    CreatedAt: `${ago(5)} 10:00:00`,
    Source: 'LEGACY',
  };
}

const MILL_A = 'Madhusudhan Processing';
const MILL_B = 'Shree Hari Dyeing';
const MILL_C = 'Laxmi Process House';

const shade = (
  ShdName: string, ShdCode: string, Qty: number, lots: RawLot[] = [], Status: ShadeStatus | null = null, OrderSrNo = 1,
): RawShade => ({
  ShdCode, ShdName, OrderSrNo, AllocationId: null, Qty,
  ClientPriority: 0, SelfPriority: 0, Status, lots,
  colourRowId: `C${nextColourRowId++}`,
  // an old colour-level status (saved through /save_priority_status before
  // lots existed) arrives as one LEGACY colour-history event
  colourHistory: Status ? [legacyEvent(Status, Qty)] : [],
});

const chart = (
  ChartNo: string, OrderUId: number, dsncode: string, dsnname: string, LastDate: string,
  ClientPriority: number, SelfPriority: number, shades: RawShade[], PartyName = 'Shree Textiles', apc = '',
): RawChart => {
  shades.forEach((s) => { s.ClientPriority = ClientPriority; s.SelfPriority = SelfPriority; });
  return {
    ChartNo, OrderUId, OrderSrNo: shades[0]?.OrderSrNo ?? 1, ParCode: '22790', PartyName,
    dsncode, dsnname, apcchartname: apc, LastDate, ClientPriority, SelfPriority, shades,
  };
};

/* -------------------------------------------------------------------------- */
/*  Seed — real design names / chart nos from the existing priority mock, with */
/*  lots and history dated relative to TODAY so Daily Update has this month's  */
/*  and yesterday's data.                                                      */
/* -------------------------------------------------------------------------- */

const SEED: RawChart[] = [
  chart('CH-535-01', 630017426, '32752', 'RIP STOP-145', '20260901', 2, 1, [
    // BLACK split into 3 lots — each at its own stage
    shade('BLACK', '80', 1200, [
      seedLot('L-4411', 500, [
        ['Sent for job', 12, 500, { ChallanNo: 'OC-1101', MillName: MILL_A }],
        ['Dying', 9, 500], ['Finish', 6, 500],
        ['Job inward', 3, 488, { ChallanNo: 'IC-771', AgainstChallanNo: 'OC-1101', MillName: MILL_A, Rate: 14 }],
      ]),
      seedLot('L-4412', 400, [
        ['Sent for job', 12, 400, { ChallanNo: 'OC-1101', MillName: MILL_A }],
        ['Dying', 8, 400], ['Finish', 1, 400],
      ]),
      seedLot('L-4413', 300, [
        ['Sent for job', 12, 300, { ChallanNo: 'OC-1101', MillName: MILL_A }],
        ['Dying', 1, 300],
      ]),
    ]),
    // BROWN — dyed, lorry cut (shade variation), re-dyed, finished
    shade('BROWN', '11457', 1200, [
      seedLot('L-4420', 1200, [
        ['Sent for job', 14, 1200, { ChallanNo: 'OC-1102', MillName: MILL_A }],
        ['Dying', 10, 1200],
        ['Lorry Cut', 8, 1200, { LorryCutReason: 'Shade variation', Remarks: 'Lighter than approved' }],
        ['Dying', 5, 1200], ['Finish', 1, 1200],
      ]),
    ]),
    shade('CAMEL', '91126', 1200, [
      seedLot('L-4431', 1200, [['Sent for job', 2, 1200, { ChallanNo: 'OC-1140', MillName: MILL_A }]]),
    ]),
    shade('CHARCORL', '11562', 1200),
    shade('MID GREY', '91223', 1200),
    shade('OLIVE', '3319', 1200),
  ]),
  chart('CH-216-09', 630013474, '32752', 'RIP STOP-145', '20260904', 1, 2, [
    shade('GREY', '1383', 13000, [
      seedLot('L-4390', 6500, [
        ['Sent for job', 20, 6500, { ChallanNo: 'OC-1088', MillName: MILL_B }],
        ['Dying', 16, 6500], ['Finish', 13, 6500],
        ['Job inward', 11, 6380, { ChallanNo: 'IC-742', AgainstChallanNo: 'OC-1088', MillName: MILL_B, Rate: 12.5 }],
      ]),
      seedLot('L-4391', 6500, [
        ['Sent for job', 20, 6500, { ChallanNo: 'OC-1089', MillName: MILL_B }],
        ['Dying', 15, 6500],
        ['Lorry Cut', 12, 2000, { LorryCutReason: 'Patchiness' }],
        ['Dying', 7, 2000], ['Finish', 2, 6500],
      ]),
    ]),
  ]),
  chart('CH-538-01', 630017434, '32820', 'DL-8228', '20260901', 3, 3, [
    shade('7039-LT GREEN', '4268', 1200, [
      seedLot('L-4450', 1200, [
        ['Sent for job', 6, 1200, { ChallanNo: 'OC-1120', MillName: MILL_C }],
        ['Dying', 1, 1200],
      ]),
    ]),
    shade('BLACK', '80', 1200, [
      seedLot('L-4451', 1200, [
        ['Sent for job', 6, 1200, { ChallanNo: 'OC-1120', MillName: MILL_C }],
        ['Dying', 3, 1200],
        ['Lorry Cut', 1, 1200, { LorryCutReason: 'White spots' }],
      ]),
    ]),
    shade('CAMEL', '91126', 1200, [], 'Sent for job'),
    shade('MAGNET', '90903', 1200),
    shade('MID GREY', '91223', 1200),
    shade('MUMBA', '91951', 1200),
  ]),
  chart('CH-542-01', 630017452, '49930', 'DL-1013', '20260901', 4, 4, [
    shade('ASH GREEN', '861', 1200, [
      seedLot('L-4460', 1200, [
        ['Sent for job', 18, 1200, { ChallanNo: 'OC-1095', MillName: MILL_B }],
        ['Dying', 14, 1200], ['Finish', 10, 1200],
        ['Job inward', 1, 1172, { ChallanNo: 'IC-790', AgainstChallanNo: 'OC-1095', MillName: MILL_B, Rate: 13 }],
      ]),
    ]),
    shade('BEIGE', '12150', 1200, [
      seedLot('L-4461', 1200, [
        ['Sent for job', 18, 1200, { ChallanNo: 'OC-1095', MillName: MILL_B }],
        ['Dying', 13, 1200], ['Finish', 9, 1200],
        ['Job inward', 4, 1190, { ChallanNo: 'IC-781', AgainstChallanNo: 'OC-1095', MillName: MILL_B, Rate: 13 }],
        // re-processing AFTER inward — finish issue found later
        ['Lorry Cut', 2, 400, { LorryCutReason: 'Crease marks' }],
      ]),
    ]),
    shade('BLACK', '80', 1200),
    shade('DARK CAMEL', '449', 1200),
    shade('DARK GREEN -7491', '80592', 1200),
    shade('LT.GRAY', '3454', 1200),
  ]),
  chart('CH-543-01', 630017453, '36670', 'SM-387', '20260901', 5, 5, [
    shade('BLACK', '80', 1200, [
      seedLot('L-4470', 1200, [
        ['Sent for job', 4, 1200, { ChallanNo: 'OC-1131', MillName: MILL_C }],
        ['Dying', 2, 1200], ['Finish', 0, 1200],
      ]),
    ]),
    shade('CAMEL', '91126', 1200),
    shade('DARK GREY', '607', 1200),
    shade('GREEN', '1462', 1200),
    shade('MID OLIVE', '92165', 1200),
    shade('S.MINK', '92193', 1200),
  ]),
  chart('CH-194-03', 630016566, '65285', 'SK-043', '20260825', 6, 6, [
    shade('BLACK', '80', 1200),
    shade('BROWN', '11457', 1200),
    shade('CAMEL', '91126', 1200, [
      seedLot('L-4480', 1200, [
        ['Sent for job', 3, 1200, { ChallanNo: 'OC-1135', MillName: MILL_A }],
        ['Dying', 0, 1200],
      ]),
    ]),
    shade('CHARCORL', '11562', 1200),
    shade('MID GREY', '91223', 1200),
    shade('OLIVE', '3319', 1200),
  ]),
  chart('CH-165-02', 630016262, '32752', 'RIP STOP-145', '20260823', 7, 7, [
    shade('ASH GREY', '255', 1200),
    shade('BLACK', '80', 2400, [
      seedLot('L-4488', 2400, [
        ['Sent for job', 1, 2400, { ChallanNo: 'OC-1150', MillName: MILL_B }],
      ]),
    ]),
    shade('DARK CAMEL', '449', 1200),
    shade('DARK GREY', '607', 1200),
    shade('NAVY BLUE', '86387', 2400),
    shade('OLIVE', '3319', 1200),
  ]),
  chart('CH-166-01', 630016263, '32820', 'DL-8228', '20260823', 8, 8, [
    shade('LT.GREEN', '82144', 1200),
  ]),
  chart('CH-148-01', 630016102, '32752', 'RIP STOP-145', '20260822', 9, 9, [
    shade('BLACK', '80', 13000, [
      seedLot('L-4301', 13000, [
        ['Sent for job', 28, 13000, { ChallanNo: 'OC-1040', MillName: MILL_A }],
        ['Dying', 24, 13000], ['Finish', 21, 13000],
        ['Job inward', 19, 12760, { ChallanNo: 'IC-700', AgainstChallanNo: 'OC-1040', MillName: MILL_A, Rate: 12 }],
      ]),
    ]),
  ]),
  chart('CH-165-01', 630016262, '32752', 'RIP STOP-145', '20260822', 10, 10, [
    shade('BLACK', '80', 1600, [], 'Job inward'),
    shade('BROWN', '11457', 1600),
    shade('CAMEL', '91126', 1600),
    shade('CHARCORL', '11562', 1600),
    shade('LT.GRAY', '3454', 1600),
    shade('MID GREY', '91223', 1600),
  ]),
  chart('CH-45-01', 630014429, '32752', 'RIP STOP-145', '20260807', 0, 0, [shade('CAMEL', '91126', 12000)]),
  chart('CH-194-02', 630016566, '65285', 'SK-043', '20260730', 0, 0, [
    shade('BLACK', '80', 1600), shade('BROWN', '11457', 400), shade('CAMEL', '91126', 400),
    shade('DARK BROWN', '877', 1200), shade('DARK CAMEL', '449', 1200),
  ]),
  chart('CH-77-01', 630011684, '32874', 'SM-380', '20260713', 0, 0, [
    shade('BLACK', '80', 1200), shade('NAVY BLUE', '86387', 1200), shade('OLIVE', '3319', 1200),
  ]),
  chart('CH-88-01', 630011793, '32752', 'RIP STOP-145', '20260713', 0, 0, [shade('DARK GREY', '607', 12000)]),
];


// colour-level status mirror (what the IsLot = 0 row holds)
SEED.forEach((c) => c.shades.forEach((s) => {
  if (s.lots.length) s.Status = colourStatusOf(s.lots) ?? s.Status;
}));

let STORE: RawChart[] = JSON.parse(JSON.stringify(SEED));

/** Resets the mock store to the seed (handy while testing). */
export function resetDyeingMock() {
  STORE = JSON.parse(JSON.stringify(SEED));
}

/* -------------------------------------------------------------------------- */
/*  Internal helpers (mirror the PHP repository)                               */
/* -------------------------------------------------------------------------- */

function colourStatusOf(lots: RawLot[]): ShadeStatus | null {
  let best: ShadeStatus | null = null;
  lots.forEach((lot) => {
    if (!lot.Status) return;
    if (!best || STATUS_RANK[lot.Status] < STATUS_RANK[best]) best = lot.Status;
  });
  return best;
}

function findShade(p: { ChartNo: string; ParCode: string; OrderUId: number; ShdCode: string; OrderSrNo: number }) {
  const c = STORE.find(
    (x) => x.ChartNo === p.ChartNo && x.ParCode === p.ParCode && Number(x.OrderUId) === Number(p.OrderUId),
  );
  if (!c) return { chart: null, shade: null };
  const s = c.shades.find(
    (x) => String(x.ShdCode) === String(p.ShdCode) && Number(x.OrderSrNo) === Number(p.OrderSrNo),
  );
  return { chart: c, shade: s || null };
}

const fail = (message: string) => ({ data: { status: false, message } });

class MockValidation extends Error {}
const bad = (message: string): never => { throw new MockValidation(message); };

/** Parent lots' events BEFORE the split (backend: CreatedAt < child's CreatedAt). */
function inheritedOf(s: RawShade, lot: RawLot): (RawEvent & { FromLotNo: string })[] {
  const out: (RawEvent & { FromLotNo: string })[] = [];
  let child = lot;
  for (let guard = 0; guard < 25 && child.ParentId != null; guard += 1) {
    const parent = s.lots.find((l) => l.LotId === child.ParentId);
    if (!parent) break;
    parent.history.forEach((h) => {
      if (Number(h.Id) < child.bornAt) out.push({ ...h, FromLotNo: parent.LotNo });
    });
    child = parent;
  }
  return out;
}

/** colour-level + inherited + own statuses (Lorry Cut rule + re-work flag). */
function ruleStatusesOf(s: RawShade, lot: RawLot): string[] {
  return [
    ...s.colourHistory.map((h) => h.Status),
    ...inheritedOf(s, lot).map((h) => h.Status),
    ...lot.history.map((h) => h.Status),
  ];
}

const lotLabel = (lot: RawLot) => (lot.LotNo ? lot.LotNo : `#${lot.LotId}`);

/** Normalises single body / Lots[] exactly like dyeing_entries() in PHP. */
function entriesOf(p: any): LotEntry[] {
  const raw: any[] = Array.isArray(p.Lots) && p.Lots.length
    ? p.Lots
    : [{ LotId: p.LotId, LotNo: p.LotNo, LotQty: p.LotQty, Qty: p.Qty, Remove: p.Remove }];
  const blank = (v: any) => v === null || v === undefined || String(v).trim() === '';
  return raw.map((r) => ({
    LotId: blank(r?.LotId) ? null : Number(r.LotId),
    LotNo: String(r?.LotNo ?? '').trim(),
    LotQty: blank(r?.LotQty) ? null : num(r.LotQty),
    Qty: blank(r?.Qty) ? null : num(r.Qty),
    Remove: !!r?.Remove,
  }));
}

/** Mirror of dyeing_upsert_lots(): lot CRUD for one colour; throws MockValidation. */
function upsertLots(s: RawShade, entries: LotEntry[], splitFromId: number | null, mode: 'lot' | 'status'): (number | null)[] {
  const multi = entries.length > 1;
  const byId = new Map(s.lots.map((l) => [l.LotId, l]));
  const hasChildren = new Set(s.lots.filter((l) => l.ParentId != null).map((l) => l.ParentId as number));

  let parent: RawLot | null = null;
  if (splitFromId) {
    parent = byId.get(splitFromId) ?? null;
    if (!parent) bad('Lot to split was not found on this colour — refresh and try again.');
    if (entries.length < 2) bad('Enter at least 2 lots to split a lot.');
    if (entries[0].LotId == null) entries[0] = { ...entries[0], LotId: splitFromId };
    if (entries[0].LotId !== splitFromId) bad('Row 1 of a split must be the lot being split.');
    entries.slice(1).forEach((e) => { if (e.LotId != null || e.Remove) bad('Rows 2 onwards of a split must be new lots.'); });
  }

  const final = new Map<string, { LotNo: string; LotQty: number }>();
  s.lots.forEach((l) => final.set(`L${l.LotId}`, { LotNo: (l.LotNo || '').trim(), LotQty: num(l.LotQty) }));

  type Plan =
    | { action: 'remove'; id: number }
    | { action: 'update'; id: number; LotNo: string; LotQty: number }
    | { action: 'insert'; LotNo: string; LotQty: number; ParentId: number | null };
  const plan: Plan[] = [];
  const seen = new Set<number>();

  entries.forEach((e, i) => {
    const label = multi ? `Row ${i + 1}: ` : '';
    if (e.LotId != null) {
      const lot = byId.get(e.LotId);
      if (!lot) bad(`${label}Lot not found for this colour — refresh and try again.`);
      if (seen.has(e.LotId)) bad(`${label}The same lot is entered twice.`);
      seen.add(e.LotId);
      const current = final.get(`L${e.LotId}`)!;
      if (e.Remove) {
        if (mode !== 'lot') bad('A lot cannot be removed while saving a status.');
        if (lot!.history.length) bad(`Lot ${lotLabel(lot!)} already has status history — it cannot be removed.`);
        if (hasChildren.has(e.LotId)) bad(`Lot ${lotLabel(lot!)} has lots split from it — remove those first.`);
        final.delete(`L${e.LotId}`);
        plan.push({ action: 'remove', id: e.LotId });
        return;
      }
      const newNo = e.LotNo ? e.LotNo : current.LotNo;
      if (mode === 'lot' && !newNo) bad(`${label}Lot No. is required.`);
      let newQty = current.LotQty;
      if (mode === 'lot' || (parent && e.LotId === parent.LotId)) {
        if (e.LotQty == null || !(e.LotQty > 0)) bad(`${label}Lot qty must be greater than 0.`);
        newQty = Math.round(num(e.LotQty) * 1000) / 1000;
      }
      final.set(`L${e.LotId}`, { LotNo: newNo, LotQty: newQty });
      plan.push({ action: 'update', id: e.LotId, LotNo: newNo, LotQty: newQty });
      return;
    }
    if (e.Remove) bad(`${label}Lot not found.`);
    if ((mode === 'lot' || multi) && !e.LotNo) bad(`${label}Lot No. is required.`);
    let qty = e.LotQty != null ? num(e.LotQty) : 0;
    if (qty <= 0 && mode === 'status' && !multi && !parent) {
      let used = 0;
      final.forEach((f) => { used += f.LotQty; });
      qty = Math.max(0, s.Qty - used);
    }
    if (qty <= 0) bad(`${label}Lot qty must be greater than 0.`);
    const rounded = Math.round(qty * 1000) / 1000;
    final.set(`N${i}`, { LotNo: e.LotNo, LotQty: rounded });
    plan.push({ action: 'insert', LotNo: e.LotNo, LotQty: rounded, ParentId: parent ? parent.LotId : null });
  });

  const nos = new Set<string>();
  final.forEach((f) => {
    const key = f.LotNo.trim().toUpperCase();
    if (!key) return;
    if (nos.has(key)) bad(`Lot No. ${f.LotNo} is used twice on this colour.`);
    nos.add(key);
  });

  if (parent && parent.history.length) {
    const splitTotal = plan.reduce((sum, p) => sum + (p.action === 'remove' ? 0 : p.LotQty), 0);
    if (splitTotal > num(parent.LotQty) + 0.001) {
      bad(`Split lots total ${splitTotal} m — more than lot ${lotLabel(parent)} qty ${parent.LotQty} m.`);
    }
  }

  let total = 0;
  final.forEach((f) => { total += f.LotQty; });
  if (total > s.Qty + 0.001) bad(`Lots would total ${Math.round(total * 1000) / 1000} m — more than the colour qty ${s.Qty} m.`);

  const bornAt = nextEventId; // events created from here on are NOT inherited
  return plan.map((p) => {
    if (p.action === 'remove') {
      s.lots = s.lots.filter((l) => l.LotId !== p.id);
      return null;
    }
    if (p.action === 'update') {
      const lot = s.lots.find((l) => l.LotId === p.id)!;
      lot.LotNo = p.LotNo;
      lot.LotQty = p.LotQty;
      return p.id;
    }
    const created: RawLot = {
      LotId: nextLotId++, LotNo: p.LotNo, LotQty: p.LotQty, Status: null, StatusDate: null,
      LorryCutCount: 0, ParentId: p.ParentId, bornAt, history: [],
    };
    s.lots.push(created);
    return created.LotId;
  });
}

/** Browse shape of one lot: history + inherited history, no internals. */
function lotOut(s: RawShade, lot: RawLot) {
  const { bornAt, ...rest } = lot;
  void bornAt;
  return JSON.parse(JSON.stringify({ ...rest, inheritedHistory: inheritedOf(s, lot) }));
}

function flattenEvents(): DyeEventRow[] {
  const rows: DyeEventRow[] = [];
  STORE.forEach((c) => c.shades.forEach((s) => {
    // chain root: split lots -> their top lot; a colour sent as a whole
    // (colour-level history) -> the colour row. Mirrors dyeing_attach_chains().
    const hasColourHistory = s.colourHistory.length > 0;
    const rootOf = (lot: RawLot): number | string => {
      let cur = lot;
      for (let g = 0; g < 25 && cur.ParentId != null; g += 1) {
        const p = s.lots.find((l) => l.LotId === cur.ParentId);
        if (!p) break;
        cur = p;
      }
      return hasColourHistory ? s.colourRowId : cur.LotId;
    };
    const members = new Map<string, number>();
    s.lots.forEach((l) => {
      const r = String(rootOf(l));
      members.set(r, (members.get(r) || 0) + 1);
    });
    const base = {
      ChartNo: c.ChartNo, OrderUId: c.OrderUId, OrderSrNo: s.OrderSrNo, ParCode: c.ParCode,
      PartyName: c.PartyName, ShdCode: s.ShdCode, ShdName: s.ShdName, DsnCode: c.dsncode, DsnName: c.dsnname,
    };
    s.colourHistory.forEach((h) => {
      rows.push({
        ...h, ...base, IsRework: !!h.IsRework, LotId: s.colourRowId, LotNo: '', LotStatus: s.Status,
        RootLotId: s.colourRowId, ChainLotCount: Math.max(1, members.get(s.colourRowId) || 0),
      });
    });
    s.lots.forEach((lot) => {
      const root = rootOf(lot);
      lot.history.forEach((h) => {
        rows.push({
          ...h, ...base, IsRework: !!h.IsRework, LotId: lot.LotId, LotNo: lot.LotNo, LotStatus: lot.Status,
          RootLotId: root, ChainLotCount: Math.max(1, members.get(String(root)) || 0),
        });
      });
    });
  }));
  return rows;
}

/* -------------------------------------------------------------------------- */
/*  Mock endpoints                                                             */
/* -------------------------------------------------------------------------- */

export async function mockDyeingBrowse() {
  await mockDelay(250);
  const Charts = STORE.map((c) => ({
    ...c,
    shades: c.shades.map((s) => {
      const { colourRowId, ...rest } = s;
      void colourRowId;
      return { ...rest, colourHistory: JSON.parse(JSON.stringify(s.colourHistory)), lots: s.lots.map((l) => lotOut(s, l)) };
    }),
  }));
  return {
    data: {
      success: true,
      message: 'Data loaded successfully. (mock)',
      data: { Charts: JSON.parse(JSON.stringify(Charts)) },
    },
  };
}

/** Same payload as the existing save_priority_party: [{OrderUId, OrderSrNo, ParCode, items[]}] */
export async function mockSavePriorityOrder(payloads: any[]) {
  await mockDelay(300);
  payloads.forEach((group) => {
    (group.items || []).forEach((item: any) => {
      const c = STORE.find(
        (x) => x.ChartNo === item.ChartNo && x.ParCode === group.ParCode && Number(x.OrderUId) === Number(group.OrderUId),
      );
      if (!c) return;
      c.SelfPriority = Number(item.SelfPriority) || 0;
      c.shades.forEach((s) => { s.SelfPriority = c.SelfPriority; });
      // ClientPriority is NEVER changed here — sent back as received.
    });
  });
  return { data: { status: true, message: 'Allocation priority saved successfully. (mock)' } };
}

/** Status save — one OR many lots of one colour. All-or-nothing, append-only. */
export async function mockSaveDyeingStatus(p: SaveStatusPayload) {
  await mockDelay(300);
  const status = normalizeStatus(p.Status);
  if (!status) return fail('Invalid status.');
  if (!p.StatusDate) return fail('Status date is required.');
  if (p.StatusDate > todayISO()) return fail('Future date is not allowed.');
  if (status === 'Lorry Cut' && !p.LorryCutReason) return fail('Select the Lorry Cut reason.');

  const entries = entriesOf(p);
  const multi = entries.length > 1;
  for (const e of entries) {
    if (e.Remove) return fail('A lot cannot be removed while saving a status.');
    if (!multi && !(num(e.Qty) > 0)) return fail('Quantity must be greater than 0.');
  }

  const { shade: s } = findShade(p);
  if (!s) return fail(`Shade ${p.ShdCode} not found on chart ${p.ChartNo}.`);

  const backup = JSON.stringify(s);
  const backupIds = [nextLotId, nextEventId];
  try {
    const lotEntries = entries.map((e) => (e.LotId == null && e.LotQty == null && multi ? { ...e, LotQty: e.Qty } : e));
    const ids = upsertLots(s, lotEntries, p.SplitFromLotId ?? null, 'status');

    // validate every lot first (rules use history BEFORE this save)
    const work = entries.map((e, i) => {
      const label = multi ? `Row ${i + 1}: ` : '';
      const lot = s.lots.find((l) => l.LotId === ids[i])!;
      const qty = num(e.Qty) > 0 ? num(e.Qty) : num(lot.LotQty);
      if (!(qty > 0)) bad(`${label}Quantity must be greater than 0.`);
      if (qty > num(lot.LotQty) + 0.001) bad(`${label}Qty cannot be more than the lot qty (${lot.LotQty} m).`);
      if (status !== 'Sent for job' && !lot.LotNo) bad(`${label}Lot No. is required from Dying onwards.`);
      const rules = ruleStatusesOf(s, lot);
      if (status === 'Lorry Cut' && !rules.includes('Dying')) bad(`${label}Lorry Cut is allowed only after the lot has been dyed.`);
      return { lot, qty, isRework: isReworkIn(rules, status) };
    });

    const withChallan = status === 'Sent for job' || status === 'Job inward';
    work.forEach(({ lot, qty, isRework }) => {
      lot.history.push({
        Id: nextEventId++,
        Status: status,
        StatusDate: p.StatusDate,
        Qty: qty,
        IsRework: isRework ? 1 : 0,
        LorryCutReason: status === 'Lorry Cut' ? p.LorryCutReason : null,
        Remarks: p.Remarks || null,
        ChallanNo: withChallan ? p.ChallanNo || null : null,
        AgainstChallanNo: status === 'Job inward' ? p.AgainstChallanNo || null : null,
        MillName: withChallan ? p.MillName || null : null,
        Rate: status === 'Job inward' ? p.Rate ?? null : null,
        CreatedBy: 'mock',
        CreatedAt: new Date().toISOString(),
        Source: 'DYEING',
      });
      lot.Status = status;
      lot.StatusDate = p.StatusDate;
      if (status === 'Lorry Cut') lot.LorryCutCount += 1;
    });
    s.Status = colourStatusOf(s.lots) ?? s.Status;

    const lots = work.map(({ lot }) => lotOut(s, lot));
    return {
      data: {
        status: true,
        message: lots.length > 1 ? `Status saved on ${lots.length} lots. (mock)` : 'Status saved successfully. (mock)',
        data: { Lot: lots[0], Lots: lots },
      },
    };
  } catch (err: any) {
    // all-or-nothing, like the DB transaction
    Object.assign(s, JSON.parse(backup));
    [nextLotId, nextEventId] = backupIds;
    if (err instanceof MockValidation) return fail(err.message);
    throw err;
  }
}

/** Lot CRUD — add / edit / remove / split, one OR many lots. All-or-nothing. */
export async function mockSaveDyeingLot(p: SaveLotPayload) {
  await mockDelay(250);
  const { shade: s } = findShade(p);
  if (!s) return fail(`Shade ${p.ShdCode} not found on chart ${p.ChartNo}.`);

  const entries = entriesOf(p);
  const backup = JSON.stringify(s);
  const backupIds = [nextLotId, nextEventId];
  try {
    const ids = upsertLots(s, entries, p.SplitFromLotId ?? null, 'lot');
    s.Status = colourStatusOf(s.lots) ?? s.Status;

    let added = 0;
    let updated = 0;
    let removed = 0;
    const lots: any[] = [];
    entries.forEach((e, i) => {
      if (ids[i] == null) { removed += 1; return; }
      if (e.LotId == null) added += 1; else updated += 1;
      lots.push(lotOut(s, s.lots.find((l) => l.LotId === ids[i])!));
    });
    const parts = [added && `${added} added`, updated && `${updated} updated`, removed && `${removed} removed`].filter(Boolean);
    const message = entries.length === 1
      ? (removed ? 'Lot removed.' : added ? 'Lot added.' : 'Lot updated.')
      : `${p.SplitFromLotId ? 'Lot split — ' : 'Lots saved — '}${parts.join(', ')}.`;
    return { data: { status: true, message: `${message} (mock)`, data: { Lot: lots[0] ?? null, Lots: lots } } };
  } catch (err: any) {
    Object.assign(s, JSON.parse(backup));
    [nextLotId, nextEventId] = backupIds;
    if (err instanceof MockValidation) return fail(err.message);
    throw err;
  }
}

export async function mockDyeingDailyUpdate(body: { fromdate: string; todate: string }) {
  await mockDelay(250);
  const Events = flattenEvents().filter((e) => e.StatusDate >= body.fromdate && e.StatusDate <= body.todate);
  return { data: { success: true, data: { Events } } };
}

/** Mill Hub: full history up to `todate` of every chain with an event in range. */
export async function mockDyeingMillHub(body: { fromdate: string; todate: string }) {
  await mockDelay(250);
  const upTo = flattenEvents().filter((e) => e.StatusDate <= body.todate);
  const active = new Set(
    upTo.filter((e) => e.StatusDate >= body.fromdate).map((e) => String(e.RootLotId)),
  );
  const Events = upTo.filter((e) => active.has(String(e.RootLotId)));
  return { data: { success: true, data: { Events } } };
}
