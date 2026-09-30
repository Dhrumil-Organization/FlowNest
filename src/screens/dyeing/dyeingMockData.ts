// FILE: src/screens/dyeing/dyeingMockData.ts
// HARD-CODED JSON + an in-memory mock "backend" for the whole Dyeing module
// (Priority / status sheet / outward lot nos / Daily Update / Mill Hub).
//
// Switch it on with USE_MOCK = true in dyeingApi.ts. Everything lives in
// module memory only (no AsyncStorage): saves made while testing show up
// immediately on re-browse, in the Daily Update and in the Mill Hub, and
// reset when the app reloads.
//
// It imitates the CURRENT backend exactly (shade-wise, no lot rows):
//   FAMSOAllocationPriorityStatus        -> one status row per shade (`rowId`)
//   FAMSOAllocationPriorityStatusHistory -> `history` (append-only events)
//   GRYOutD1 (+ FAMSAL.ChalNo)           -> `GRY` (outward lines + ChartLotNo)
// Response shapes = the PHP repository's:
//   POST /dyeing/priority_browse        -> { success, data: { Charts } }
//   POST /save_priority_party           -> { status: true }
//   POST /dyeing/save_status            -> { status, success, message, data }
//   GET  /dyeing/outward_details        -> { success, data: { outward_details } }
//   GET  /dyeing/outward_details_all    -> { success, data: { outward_details } }
//   *    /dyeing/save_outward_details   -> { success, data, message }
//   POST /dyeing/daily_update           -> { success, data: { Events, fromdate, todate } }
//   POST /dyeing/mill_hub               -> { success, data: { Events, fromdate, todate } }
//
// Seed = the ERP Designing seed (SEED_PRODEVENTS_BUILD + SEED_MILLHIST_BUILD):
// same mills (Shree Rang Dyeing / Akash Process), same designs (Rib Stop 145,
// 8228, Milano, Mesh Track, Monaco, Tussar Silk, Oxford), same challans,
// rates, metres and day offsets from today — so the Daily Update and the
// Mill Hub show the same picture as the ERP.

import { addDaysISO, canMoveTo, nextStatusesOf, normalizeStatus, num, SaveLotPayload, SaveStatusPayload, todayISO } from './dyeingModel';

export const mockDelay = (ms = 250) => new Promise((resolve) => setTimeout(resolve, ms));

/* -------------------------------------------------------------------------- */
/*  Store                                                                      */
/* -------------------------------------------------------------------------- */

type MockEvent = {
  Id: number;
  Status: string;
  StatusDate: string;
  Qty: number;
  IsRework: 0;
  LorryCutReason: string | null;
  Remarks: string | null;
  ChallanNo: string | null;
  AgainstChallanNo: string | null;
  MillName: string | null;
  Rate: number | null;
  LotNo: string | null;
  Source: string;
  CreatedBy: string;
  CreatedAt: string;
};

type MockShade = {
  rowId: number; // FAMSOAllocationPriorityStatus.Id
  ShdCode: string;
  ShdName: string;
  OrderSrNo: number;
  AllocationId: number;
  Qty: number;
  Status: string | null;
  history: MockEvent[];
};

type MockChart = {
  ChartNo: string;
  OrderUId: number;
  ParCode: string;
  PartyName: string;
  dsncode: string;
  dsnname: string;
  apcchartname: string;
  LastDate: string;
  ClientPriority: number;
  SelfPriority: number;
  shades: MockShade[];
};

type GryLine = {
  UId: number;
  SrNo: number;
  ChartNo: string;
  ChartLotNo: string;
  SOUID: number;
  SOSrNo: number;
  ChalNo: string;
  Qty: number; // outward qty (FAMSALD2.Qty)
  MillName: string; // outward party
  SoShdCode: string;
};

/** FAMSOAllocationPriorityOutwardLot — one lot of one shade on one outward line. */
type MockLot = {
  Id: number;
  OrderUId: number;
  OrderSrNo: number;
  ChartNo: string;
  ShdCode: string;
  ShdName: string;
  OutwardUId: number;
  OutwardSrNo: number;
  OutwardShdCode: string;
  ChalNo: string;
  MillName: string;
  OutwardQty: number;
  LotNo: string;
  LotQty: number | null;
  IsActive: boolean;
};

let CHARTS: MockChart[] = [];
let GRY: GryLine[] = [];
let LOTS: MockLot[] = [];
let lotSeq = 0;
let eventSeq = 0;
let rowSeq = 0;

const D = (n: number) => addDaysISO(todayISO(), -n);
const SR = 'Shree Rang Dyeing';
const AK = 'Akash Process';

const ev = (
  Status: string, off: number, Qty: number,
  extra: Partial<Pick<MockEvent, 'LorryCutReason' | 'ChallanNo' | 'MillName' | 'Rate' | 'Remarks'>> = {},
): MockEvent => {
  eventSeq += 1;
  const date = D(off);
  return {
    Id: eventSeq,
    Status,
    StatusDate: date,
    Qty,
    IsRework: 0,
    LorryCutReason: extra.LorryCutReason ?? null,
    Remarks: extra.Remarks ?? null,
    ChallanNo: extra.ChallanNo ?? null,
    AgainstChallanNo: null,
    MillName: extra.MillName ?? null,
    Rate: extra.Rate ?? null,
    LotNo: null,
    Source: 'DYEING',
    CreatedBy: 'Mock',
    CreatedAt: `${date} 10:${String(eventSeq % 60).padStart(2, '0')}:00`,
  };
};

/** Sent → Dyed → Finished → Job inward with ERP day offsets (null = not reached). */
const flow = (
  qty: number, mill: string, rate: number,
  o: { sent: number; dyed?: number | null; fin?: number | null; inward?: number | null; inQty?: number; challan?: string | null },
): MockEvent[] => {
  const out: MockEvent[] = [ev('Sent for job', o.sent, qty, { MillName: mill, Rate: rate, ChallanNo: o.challan ?? null })];
  if (o.dyed != null) out.push(ev('Dying', o.dyed, qty, { MillName: mill }));
  if (o.fin != null) out.push(ev('Finish', o.fin, qty, { MillName: mill }));
  if (o.inward != null) out.push(ev('Job inward', o.inward, o.inQty ?? qty, { MillName: mill, Rate: rate, ChallanNo: o.challan ?? null }));
  return out;
};

const lastStatus = (h: MockEvent[]) => (h.length ? h[h.length - 1].Status : null);

let uidSeq = 370000600;
let gryUid = 370000200;
let shdSeq = 1200;

const chart = (
  ChartNo: string, PartyName: string, dsnname: string, dsncode: string, self: number, client: number,
  apc: string, shades: { name: string; qty: number; history: MockEvent[]; lots?: string[] }[],
): MockChart => {
  uidSeq += 1;
  const OrderUId = uidSeq;
  const c: MockChart = {
    ChartNo, OrderUId, ParCode: `P${String(uidSeq % 100).padStart(2, '0')}`, PartyName, dsncode, dsnname,
    apcchartname: apc, LastDate: D(20), ClientPriority: client, SelfPriority: self, shades: [],
  };
  shades.forEach((s, idx) => {
    rowSeq += 1;
    shdSeq += 1;
    const OrderSrNo = idx + 1;
    c.shades.push({
      rowId: rowSeq, ShdCode: String(shdSeq), ShdName: s.name, OrderSrNo, AllocationId: 5000 + rowSeq,
      Qty: s.qty, Status: lastStatus(s.history), history: s.history,
    });
    // GRYOutD1: one outward line per 'Sent for job' on this SO line (+ lot no. when given)
    const sends = s.history.filter((h) => h.Status === 'Sent for job');
    (sends.length ? sends : []).forEach((h, i) => {
      gryUid += 1;
      const line: GryLine = {
        UId: gryUid, SrNo: i + 1, ChartNo, SOUID: OrderUId, SOSrNo: OrderSrNo,
        ChalNo: h.ChallanNo || `DC-${String(gryUid).slice(-4)}`,
        ChartLotNo: (s.lots && s.lots[i]) || '',
        Qty: num(h.Qty) || s.qty,
        MillName: h.MillName || '',
        SoShdCode: String(shdSeq),
      };
      GRY.push(line);
      if (!h.ChallanNo) h.ChallanNo = line.ChalNo;
      if (line.ChartLotNo) {
        lotSeq += 1;
        LOTS.push({
          Id: lotSeq, OrderUId, OrderSrNo, ChartNo, ShdCode: String(shdSeq), ShdName: s.name,
          OutwardUId: line.UId, OutwardSrNo: line.SrNo, OutwardShdCode: line.SoShdCode,
          ChalNo: line.ChalNo, MillName: line.MillName, OutwardQty: line.Qty,
          LotNo: line.ChartLotNo, LotQty: line.Qty, IsActive: true,
        });
      }
    });
  });
  CHARTS.push(c);
  return c;
};

/** Extra outward line on an SO line (a second challan not yet given a lot no.). */
const extraOutward = (c: MockChart, srNo: number, chalNo: string, lot = '') => {
  gryUid += 1;
  const shd = c.shades.find((x) => x.OrderSrNo === srNo);
  GRY.push({
    UId: gryUid, SrNo: 1, ChartNo: c.ChartNo, SOUID: c.OrderUId, SOSrNo: srNo, ChalNo: chalNo, ChartLotNo: lot,
    Qty: 600, MillName: SR, SoShdCode: shd?.ShdCode || '',
  });
};

function seed() {
  CHARTS = [];
  GRY = [];
  LOTS = [];
  lotSeq = 0;
  eventSeq = 0;
  rowSeq = 0;
  uidSeq = 370000600;
  gryUid = 370000200;
  shdSeq = 1200;

  // ── Rib Stop 145 · C1 — Shree Rang: all six done; Olive lorry-cut after receipt, sent back, re-dyed, re-finished
  const c1 = chart('CH-2-01', 'Chennai Sportswear', 'Rib Stop 145', 'D145', 1, 2, 'APC Summer', [
    ...['Navy', 'Black', 'White', 'Charcoal', 'Sand'].map((name, i) => ({
      name, qty: 1200, lots: [`SR-43${10 + i}`],
      history: flow(1200, SR, 46, { sent: 11, dyed: 9, fin: 7, inward: 5, inQty: name === 'Sand' ? 1176 : 1200 }),
    })),
    {
      name: 'Olive', qty: 1200, lots: ['SR-4315'],
      history: [
        ...flow(1200, SR, 46, { sent: 11, dyed: 9, fin: 7, inward: 5 }),
        ev('Lorry Cut', 5, 1200, { LorryCutReason: 'Shade variation — lot to lot', Remarks: 'cut after receipt, sent back', MillName: SR }),
        ev('Sent for job', 4, 1200, { MillName: SR, Rate: 48, ChallanNo: 'DC-4114R' }),
        ev('Dying', 2, 1200, { MillName: SR }),
        ev('Finish', 1, 1200, { MillName: SR }),
        ev('Job inward', 1, 1190, { MillName: SR, Rate: 48, ChallanNo: 'DC-4114R' }),
      ],
    },
  ]);

  // ── Rib Stop 145 · C2 — Akash: four finished, Navy + Black received yesterday
  const c2 = chart('CH-2-02', 'Chennai Sportswear', 'Rib Stop 145', 'D145', 2, 1, 'APC Summer', ['Navy', 'Black', 'Olive', 'White'].map((name, i) => ({
    name, qty: 1200, lots: [`AK-22${40 + i}`],
    history: flow(1200, AK, 45, { sent: 8, dyed: 6, fin: 4, inward: name === 'Navy' || name === 'Black' ? 1 : null }),
  })));

  // ── Rib Stop 145 · C3 — Shree Rang: in dyeing
  const c3 = chart('CH-2-03', 'Chennai Sportswear', 'Rib Stop 145', 'D145', 3, 3, 'APC Summer', [
    { name: 'Forest', qty: 1200, lots: ['SR-4420'], history: flow(1200, SR, 46, { sent: 3, dyed: 1 }) },
    { name: 'Navy', qty: 1200, lots: ['SR-4421'], history: flow(1200, SR, 46, { sent: 5, dyed: 1 }) },
    { name: 'Black', qty: 1200, lots: [], history: flow(1200, SR, 46, { sent: 4, dyed: 2 }) },
  ]);
  extraOutward(c3, 3, 'DC-4131'); // second challan on Black — lot no. still to be added

  // ── Rib Stop 145 · C4 — Akash: finished yesterday, Teal lorry-cut today (before receipt)
  chart('CH-2-04', 'Chennai Sportswear', 'Rib Stop 145', 'D145', 4, 4, '', [
    {
      name: 'Teal', qty: 1200, lots: ['AK-2250'],
      history: [
        ...flow(1200, AK, 45, { sent: 3, dyed: 1, fin: 1 }),
        ev('Lorry Cut', 0, 1200, { LorryCutReason: 'Shade variation — lot to lot', MillName: AK }),
      ],
    },
    { name: 'Grey', qty: 1200, lots: ['AK-2251'], history: flow(1200, AK, 45, { sent: 3, dyed: 1, fin: 1 }) },
  ]);

  // ── 8228 · C2 — Shree Rang: dyed 2 days ago; Charcoal lorry-cut before finishing
  chart('CH-3-02', 'Mumbai Uniforms', '8228', 'D8228', 5, 2, '', [
    { name: 'Navy Blue', qty: 1200, lots: ['SR-4412'], history: flow(1200, SR, 52, { sent: 4, dyed: 2, fin: 1 }) },
    { name: 'Black', qty: 1200, lots: [], history: flow(1200, SR, 52, { sent: 4, dyed: 2 }) },
    { name: 'Ivory', qty: 1200, lots: [], history: flow(1200, SR, 52, { sent: 4, dyed: 2 }) },
    {
      name: 'Charcoal', qty: 1200, lots: ['SR-4413'],
      history: [
        ...flow(1200, SR, 52, { sent: 4, dyed: 2 }),
        ev('Lorry Cut', 1, 1200, { LorryCutReason: 'Patchiness', Remarks: 'centre patch, re-dye advised', MillName: SR }),
      ],
    },
  ]);

  // ── 8228 · C1 — Akash: full cycle, received 6 days ago (Stone short)
  chart('CH-3-01', 'Mumbai Uniforms', '8228', 'D8228', 6, 1, '', ['Navy Blue', 'Black', 'Olive', 'Ivory', 'Charcoal', 'Stone'].map((name, i) => ({
    name, qty: 1200, lots: [`AK-21${60 + i}`],
    history: flow(1200, AK, 50, { sent: 12, dyed: 10, fin: 8, inward: 6, inQty: name === 'Stone' ? 1180 : 1200 }),
  })));

  // ── ERP mill history (SEED_MILLHIST_BUILD) — one colour per challan
  const hist: [string, string, string, string, string, string, number, number, number, number | null, number][] = [
    // chart, party, design, dsncode, colour, mill, outOff, metres, rate, inOff, inMetres   challan
    ['CH-4-01', 'Surat Textiles', '8228', 'D8228', 'Navy', SR, 28, 2400, 46, 20, 2400],
    ['CH-4-02', 'Surat Textiles', '8228', 'D8228', 'Black', AK, 18, 1800, 45, 9, 1800],
    ['CH-5-01', 'Delhi Activewear', 'Rib Stop 145', 'D145', 'White', AK, 26, 3000, 48, 17, 2910],
    ['CH-5-02', 'Delhi Activewear', 'Rib Stop 145', 'D145', 'Red', AK, 12, 1500, 48, 4, 1380],
    ['CH-5-03', 'Delhi Activewear', 'Rib Stop 145', 'D145', 'Navy', SR, 0, 900, 48, null, 0],
    ['CH-6-01', 'Jaipur Ethnic', 'Tussar Silk', 'DTS', 'Stone', SR, 6, 2200, 52, null, 0],
    ['CH-7-01', 'Kolkata Formals', 'Oxford', 'DOX', 'Indigo', AK, 2, 1000, 44, null, 0],
    ['CH-8-01', 'Pune Sports', 'Mesh Track', 'DMT', 'Black', SR, 14, 2000, 47, 7, 1960],
    ['CH-8-02', 'Pune Sports', 'Mesh Track', 'DMT', 'Olive', AK, 30, 1600, 47, 22, 1600],
    ['CH-9-01', 'Ahmedabad Linen', 'Milano', 'DML', 'Navy', AK, 45, 2500, 50, 10, 2440],
    ['CH-9-02', 'Ahmedabad Linen', 'Milano', 'DML', 'Grey', SR, 40, 1200, 50, 3, 1170],
    ['CH-10-01', 'Hyderabad Hosiery', 'Monaco', 'DMC', 'Beige', SR, 16, 800, 49, 8, 800],
  ];
  const challans = ['DC-4101', 'DC-4102', 'DC-4104', 'DC-4105', 'DC-4106', 'DC-4107', 'DC-4108', 'DC-4109', 'DC-4110', 'DC-4111', 'DC-4112', 'DC-4113'];
  hist.forEach(([chNo, party, dsn, code, colour, mill, outOff, metres, rate, inOff, inMetres], i) => {
    // exactly like the ERP mill history: outward challan + (optional) inward, no dyeing events
    chart(chNo, party, dsn, code, 10 + i, 0, '', [{
      name: colour, qty: metres, lots: inOff != null ? [`${mill === SR ? 'SR' : 'AK'}-${4000 + i}`] : [],
      history: flow(metres, mill, rate, { sent: outOff, inward: inOff, inQty: inMetres, challan: challans[i] }),
    }]);
  });

  // a chart not sent yet (Priority shows "Not started")
  chart('CH-11-01', 'Chennai Sportswear', 'Rib Stop 145', 'D145', 30, 0, '', [
    { name: 'Maroon', qty: 1500, history: [] },
    { name: 'Bottle Green', qty: 1500, history: [] },
  ]);

  void c1; void c2;
}

seed();

export function resetDyeingMock() {
  seed();
}

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                    */
/* -------------------------------------------------------------------------- */

const ok = (data: any, message = 'Data loaded successfully.') => ({ data: { success: true, status: true, data, message } });
const fail = (message: string) => ({ data: { success: false, status: false, data: [], message } });

const gryOf = (c: MockChart, s: MockShade) =>
  GRY.filter((g) => g.SOUID === c.OrderUId && g.SOSrNo === s.OrderSrNo && g.ChartNo === c.ChartNo);

const join = (xs: string[]) => Array.from(new Set(xs.map((x) => x.trim()).filter(Boolean))).join('/');

const lotsOfShade = (c: MockChart, s: MockShade) =>
  LOTS.filter((l) => l.IsActive && l.OrderUId === c.OrderUId && l.OrderSrNo === s.OrderSrNo
    && l.ChartNo === c.ChartNo && l.ShdCode === s.ShdCode);

const lotBrief = (l: MockLot) => ({
  LotId: l.Id, LotNo: l.LotNo, LotQty: l.LotQty, OutwardUId: String(l.OutwardUId), OutwardSrNo: l.OutwardSrNo,
  ChalNo: l.ChalNo, ChalDate: null, MillName: l.MillName || null, OutwardShdCode: l.OutwardShdCode,
});

/** backend dyeing_lots_total — null when no lot or any lot without qty. */
const lotsTotal = (lots: MockLot[]) =>
  lots.length && lots.every((l) => (l.LotQty ?? 0) > 0) ? lots.reduce((t, l) => t + (l.LotQty ?? 0), 0) : null;

const lotApiRow = (l: MockLot) => ({
  Id: l.Id, LotId: l.Id, uuid: String(l.OutwardUId), usrno: String(l.OutwardSrNo), uid: String(l.OrderUId), srno: String(l.OrderSrNo),
  ChartNo: l.ChartNo, ChartLotNo: l.LotNo, LotNo: l.LotNo, LotQty: l.LotQty, soshdcode: l.ShdCode, ShdCode: l.ShdCode,
  ShdName: l.ShdName, OutwardShdCode: l.OutwardShdCode, ChalNo: l.ChalNo, MillName: l.MillName, Qty: l.OutwardQty, Legacy: 0,
});

/** outward_details row + what the lot table knows about that line (backend dyeing_outward_with_lots). */
const outwardRow = (g: GryLine, shdcode: string, withChallan: boolean) => {
  const lots = LOTS.filter((l) => l.IsActive && l.OutwardUId === g.UId && l.OutwardSrNo === g.SrNo);
  const used = lots.reduce((t, l) => t + (l.LotQty ?? 0), 0);
  const mine = shdcode ? lots.find((l) => l.ShdCode === shdcode) : undefined;
  return {
    uuid: String(g.UId), usrno: String(g.SrNo), uid: String(g.SOUID), srno: String(g.SOSrNo), ChartNo: g.ChartNo,
    ChartLotNo: shdcode ? (mine?.LotNo ?? '') : g.ChartLotNo, soshdcode: g.SoShdCode,
    ...(withChallan ? { ChalNo: g.ChalNo } : {}),
    MillName: g.MillName, Qty: g.Qty,
    ShadeLots: lots.map((l) => ({ LotId: l.Id, ShdCode: l.ShdCode, ChartNo: l.ChartNo, LotNo: l.LotNo, LotQty: l.LotQty })),
    LotQtyUsed: used, Balance: Math.max(0, g.Qty - used),
    TakenBy: lots.filter((l) => l !== mine).map((l) => `Lot ${l.LotNo} · Shd ${l.ShdCode}`).join(', '),
    LotQty: mine?.LotQty ?? null, LotId: mine?.Id ?? null,
  };
};

/** Flat report rows (backend dyeing_event_query + GRY enrichment). */
const flatEvents = () => {
  const rows: any[] = [];
  CHARTS.forEach((c) => c.shades.forEach((s) => {
    const g = gryOf(c, s);
    const lots = lotsOfShade(c, s);
    const LotNos = lots.length ? join(lots.map((l) => l.LotNo)) : join(g.map((x) => x.ChartLotNo));
    const OutwardNos = lots.length ? join(lots.map((l) => l.ChalNo)) : join(g.map((x) => x.ChalNo));
    const LotQty = lotsTotal(lots);
    s.history.forEach((h) => rows.push({
      ...h,
      Qty: LotQty ?? h.Qty,
      QtySource: LotQty != null ? 'LOT' : 'EVENT',
      LotQty,
      OutwardLots: lots.map(lotBrief),
      LotId: s.rowId,
      LotNo: h.LotNo || LotNos,
      LotStatus: s.Status,
      ChartNo: c.ChartNo,
      OrderUId: c.OrderUId,
      OrderSrNo: s.OrderSrNo,
      ParCode: c.ParCode,
      PartyName: c.PartyName,
      ShdCode: s.ShdCode,
      ShdName: s.ShdName,
      DsnCode: c.dsncode,
      DsnName: c.dsnname,
      RootLotId: s.rowId,
      ChainLotCount: 1,
      LotNos,
      OutwardNos,
    }));
  }));
  return rows.sort((a, b) => a.StatusDate.localeCompare(b.StatusDate) || a.Id - b.Id);
};

const findShade = (p: { OrderUId: any; OrderSrNo: any; ShdCode: any; ChartNo: any }) => {
  const c = CHARTS.find((x) => String(x.OrderUId) === String(p.OrderUId) && x.ChartNo === String(p.ChartNo).trim());
  const s = c?.shades.find((x) => x.OrderSrNo === num(p.OrderSrNo) && x.ShdCode === String(p.ShdCode).trim());
  return c && s ? { c, s } : null;
};

/* -------------------------------------------------------------------------- */
/*  Endpoints                                                                  */
/* -------------------------------------------------------------------------- */

export async function mockDyeingBrowse() {
  await mockDelay();
  const Charts = CHARTS.map((c) => ({
    ChartNo: c.ChartNo,
    OrderUId: String(c.OrderUId),
    OrderSrNo: 1,
    ParCode: c.ParCode,
    PartyName: c.PartyName,
    dsncode: c.dsncode,
    dsnname: c.dsnname,
    apcchartname: c.apcchartname,
    LastDate: c.LastDate,
    ClientPriority: c.ClientPriority,
    SelfPriority: c.SelfPriority,
    shades: c.shades.map((s) => ({
      ShdCode: s.ShdCode,
      ShdName: s.ShdName,
      OrderSrNo: s.OrderSrNo,
      AllocationId: String(s.AllocationId),
      Qty: s.Qty,
      ClientPriority: c.ClientPriority,
      SelfPriority: c.SelfPriority,
      Status: s.Status,
      LotNos: join(lotsOfShade(c, s).map((l) => l.LotNo)),
      LotQty: lotsTotal(lotsOfShade(c, s)),
      outwardLots: lotsOfShade(c, s).map(lotBrief),
      colourHistory: s.history.map((h) => ({ ...h })),
      lots: [],
    })),
  }));
  Charts.sort((a, b) => (a.SelfPriority || 1e9) - (b.SelfPriority || 1e9));
  return ok({ Charts });
}

export async function mockSavePriorityOrder(payloads: any[]) {
  await mockDelay();
  (payloads || []).forEach((p) => {
    const c = CHARTS.find((x) => String(x.OrderUId) === String(p?.OrderUId));
    const item = Array.isArray(p?.items) ? p.items[0] : p;
    if (c && item?.SelfPriority != null) c.SelfPriority = num(item.SelfPriority);
  });
  return { data: { status: true, message: 'Priority saved successfully.' } };
}

/** Same checks as save_dyeing_status: valid status, no future date, Lorry Cut needs a reason. */
export async function mockSaveDyeingStatus(p: SaveStatusPayload) {
  await mockDelay();
  const status = normalizeStatus(p.Status);
  if (!status) return fail('Invalid status.');
  if (String(p.StatusDate) > todayISO()) return fail('Future date is not allowed.');
  if (status === 'Lorry Cut' && !String(p.LorryCutReason || '').trim()) return fail('Select the Lorry Cut reason.');
  const hit = findShade(p);
  if (!hit) return fail('Shade not found.');
  const cur = normalizeStatus(lastStatus(hit.s.history));
  if (!canMoveTo(cur, status)) {
    const next = nextStatusesOf(cur);
    return fail(next.length ? `After ${cur ?? 'no status'} only ${next.join(' / ')} is allowed.` : `${cur} is the final status.`);
  }
  const withChallan = status === 'Sent for job' || status === 'Job inward';
  eventSeq += 1;
  hit.s.history.push({
    Id: eventSeq,
    Status: status,
    StatusDate: p.StatusDate,
    Qty: num(p.Qty),
    IsRework: 0,
    LorryCutReason: status === 'Lorry Cut' ? p.LorryCutReason : null,
    Remarks: p.Remarks ?? null,
    ChallanNo: withChallan ? p.ChallanNo ?? null : null,
    AgainstChallanNo: status === 'Job inward' ? p.AgainstChallanNo ?? null : null,
    MillName: withChallan ? p.MillName ?? null : null,
    Rate: status === 'Job inward' ? p.Rate ?? null : null,
    LotNo: p.LotNo || null,
    Source: 'DYEING',
    CreatedBy: 'Mock',
    CreatedAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
  });
  hit.s.Status = status;
  return { data: { status: true, success: true, message: 'Status saved successfully.', data: { Id: hit.s.rowId, Status: status } } };
}

/** Lots are no longer stored separately (lot no. lives on the outward) — kept for the API contract. */
export async function mockSaveDyeingLot(_p: SaveLotPayload) {
  await mockDelay();
  return { data: { status: true, success: true, message: 'Lot updated.', data: { Lot: null, Lots: [] } } };
}

export async function mockOutwardDetails(params: { chartno: string; shdcode?: string }) {
  await mockDelay(150);
  const chartNo = String(params.chartno || '').trim();
  if (!chartNo) return fail('Chart No is required.');
  const shd = String(params.shdcode || '').trim();
  const outward_details = GRY
    .filter((g) => g.ChartNo === chartNo)
    .sort((a, b) => a.UId - b.UId || a.SrNo - b.SrNo)
    .map((g) => outwardRow(g, shd, true));
  return ok({ outward_details });
}

export async function mockOutwardDetailsAll(params: { orderuid: string | number; ordersrno: string | number; shdcode?: string }) {
  await mockDelay(150);
  const shd = String(params.shdcode || '').trim();
  const outward_details = GRY
    .filter((g) => String(g.SOUID) === String(params.orderuid) && String(g.SOSrNo) === String(params.ordersrno))
    .sort((a, b) => a.UId - b.UId || a.SrNo - b.SrNo)
    .map((g) => outwardRow(g, shd, true));
  return ok({ outward_details });
}

/** GET /dyeing/lotnos — backend get_lot_data: lots of ONE shade (chart + SO line + shade). */
export async function mockLotNos(params: { chartno: string; orderuid: string | number; ordersrno: string | number; shdcode?: string }) {
  await mockDelay(150);
  const chartNo = String(params.chartno || '').trim();
  if (!chartNo) return fail('Chart No is required.');
  const shd = String(params.shdcode || '').trim();
  const lot_details = LOTS
    .filter((l) => l.IsActive && l.ChartNo === chartNo && String(l.OrderUId) === String(params.orderuid)
      && String(l.OrderSrNo) === String(params.ordersrno) && (!shd || l.ShdCode === shd))
    .map(lotApiRow);
  return ok({ lot_details, LotQtyTotal: lotsTotal(LOTS.filter((l) => lot_details.some((r) => r.Id === l.Id))) });
}

/** POST /dyeing/save_outward_details — add / update the lot (no + qty) of one shade on one outward line. */
export async function mockSaveOutwardDetails(params: {
  uid: any; srno: any; uuid?: any; usrno?: any; chartno: string; lotno: string; lotqty?: number | null;
  shdcode: string; shdname?: string; lotchartno?: string; orderuid?: any; ordersrno?: any; mode?: 'add' | 'edit';
}) {
  await mockDelay(200);
  const lot = String(params.lotno || '').trim().toUpperCase();
  if (!params.uid) return fail('UId is required.');
  if (!params.srno) return fail('SrNo is required.');
  if (!params.chartno) return fail('Chart No is required.');
  if (!lot) return fail('Lot No is required.');
  const g = GRY.find((x) => String(x.SOUID) === String(params.uid) && String(x.SOSrNo) === String(params.srno)
    && x.ChartNo === String(params.chartno).trim()
    && (params.uuid == null || params.uuid === '' || String(x.UId) === String(params.uuid))
    && (params.usrno == null || params.usrno === '' || String(x.SrNo) === String(params.usrno)));
  if (!g) return fail(`Outward entry not found for UId: ${params.uid}, SrNo: ${params.srno}, ChartNo: ${params.chartno}`);
  const shd = String(params.shdcode || '').trim();
  if (!shd) return fail('ShdCode is required.');
  const qty = num(params.lotqty) > 0 ? num(params.lotqty) : g.Qty;
  if (!(qty > 0)) return fail('Enter Lot Qty (m).');
  const OrderUId = num(params.orderuid) || g.SOUID;
  const OrderSrNo = num(params.ordersrno) || g.SOSrNo;
  const ChartNo = String(params.lotchartno || params.chartno).trim();
  const others = LOTS.filter((l) => l.IsActive && l.OutwardUId === g.UId && l.OutwardSrNo === g.SrNo
    && !(l.OrderUId === OrderUId && l.OrderSrNo === OrderSrNo && l.ChartNo === ChartNo && l.ShdCode === shd))
    .reduce((t, l) => t + (l.LotQty ?? 0), 0);
  if (qty + others > g.Qty + 0.001) {
    return fail(`Lot qty ${qty} m is more than the balance of this outward (${Math.max(0, g.Qty - others)} m of ${g.Qty} m).`);
  }
  let row = LOTS.find((l) => l.IsActive && l.OrderUId === OrderUId && l.OrderSrNo === OrderSrNo && l.ChartNo === ChartNo
    && l.ShdCode === shd && l.OutwardUId === g.UId && l.OutwardSrNo === g.SrNo);
  if (row && params.mode === 'add') {
    return fail(`This outward is already added in this shade (Lot ${row.LotNo}) — the same outward can't be added twice in one shade. Edit it in the table.`);
  }
  const mode = row ? 'updated' : 'added';
  if (row) {
    row.LotNo = lot;
    row.LotQty = qty;
  } else {
    lotSeq += 1;
    row = {
      Id: lotSeq, OrderUId, OrderSrNo, ChartNo, ShdCode: shd, ShdName: String(params.shdname || ''),
      OutwardUId: g.UId, OutwardSrNo: g.SrNo, OutwardShdCode: g.SoShdCode, ChalNo: g.ChalNo, MillName: g.MillName,
      OutwardQty: g.Qty, LotNo: lot, LotQty: qty, IsActive: true,
    };
    LOTS.push(row);
  }
  g.ChartLotNo = lot;
  return ok({ UId: g.UId, SrNo: g.SrNo, ChartNo: g.ChartNo, ChartLotNo: lot, Lot: lotApiRow(row) }, `Lot No ${mode} successfully.`);
}

/** POST /dyeing/remove_lotno — removes the lot of ONE shade on one outward line. */
export async function mockRemoveLotNo(p: {
  uid: any; srno: any; uuid?: any; usrno?: any; chartno: string; shdcode: string; lotid?: number;
  lotchartno?: string; orderuid?: any; ordersrno?: any;
}) {
  await mockDelay(200);
  if (!p.uid) return fail('UId is required.');
  if (!p.srno) return fail('SrNo is required.');
  if (!p.chartno) return fail('Chart No is required.');
  const shd = String(p.shdcode || '').trim();
  const ChartNo = String(p.lotchartno || p.chartno).trim();
  const hits = LOTS.filter((l) => l.IsActive && (p.lotid ? l.Id === p.lotid
    : l.OrderUId === (num(p.orderuid) || num(p.uid)) && l.OrderSrNo === (num(p.ordersrno) || num(p.srno))
      && l.ChartNo === ChartNo && l.ShdCode === shd && String(l.OutwardUId) === String(p.uuid) && String(l.OutwardSrNo) === String(p.usrno)));
  if (!hits.length) return fail('Lot not found.');
  hits.forEach((l) => { l.IsActive = false; });
  hits.forEach((l) => {
    const g = GRY.find((x) => x.UId === l.OutwardUId && x.SrNo === l.OutwardSrNo);
    const rest = LOTS.filter((x) => x.IsActive && x.OutwardUId === l.OutwardUId && x.OutwardSrNo === l.OutwardSrNo);
    if (g) g.ChartLotNo = rest.length ? rest[rest.length - 1].LotNo : '';
  });
  return ok({ UId: hits[0].OutwardUId, SrNo: hits[0].OutwardSrNo, ChartNo: hits[0].ChartNo, ChartLotNo: '' }, 'Lot No removed successfully.');
}

/** POST /dyeing/remove_status — removes the shade's LATEST status only. */
export async function mockRemoveDyeingStatus(p: { OrderUId: any; OrderSrNo: any; ShdCode: any; ChartNo: any; Status: string }) {
  await mockDelay(200);
  const hit = findShade(p);
  if (!hit) return fail('Shade not found.');
  const last = hit.s.history[hit.s.history.length - 1];
  if (!last) return fail('No status to remove.');
  if (String(last.Status).toLowerCase() !== String(p.Status).trim().toLowerCase()) {
    return fail(`Only the latest status (${last.Status}) can be removed.`);
  }
  hit.s.history.pop();
  hit.s.Status = lastStatus(hit.s.history);
  return ok({ Status: hit.s.Status }, 'Status removed successfully.');
}

/** Full history (up to todate) of every shade touched in the range — backend dyeing_touched_history. */
const touchedHistory = (from: string, to: string) => {
  const all = flatEvents().filter((e) => e.StatusDate <= to);
  const touched = new Set(all.filter((e) => e.StatusDate >= from).map((e) => String(e.LotId)));
  return all.filter((e) => touched.has(String(e.LotId)));
};

export async function mockDyeingDailyUpdate(body: { fromdate: string; todate: string }) {
  await mockDelay();
  return ok({ Events: touchedHistory(body.fromdate, body.todate), fromdate: body.fromdate, todate: body.todate });
}

export async function mockDyeingMillHub(body: { fromdate: string; todate: string }) {
  await mockDelay();
  return ok({ Events: touchedHistory(body.fromdate, body.todate), fromdate: body.fromdate, todate: body.todate });
}
