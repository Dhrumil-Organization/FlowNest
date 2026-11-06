// FILE: src/screens/dyeing/millHubModel.ts
// Dyeing → Mill Hub — pure data rules (no React).
//
// Source: POST /dyeing/mill_hub_report (DyeingMillHubController::report)
//   one row per OUTWARD LOT (GRYOutD1) whose job-outward challan date is in the range,
//   with everything received against it so far (GRYInw / GRYInwD2, any inward date).
// Detail: POST /dyeing/mill_hub_lot  -> challan header, taka-wise out vs in, inward entries.
//
// Rules (same on both sides):
//   OUT   = outward metres of the lot (Σ taka metres)
//   IN    = inward metres received against the lot
//   PEND  = metres of outward takas not received yet
//   SHORT = OUT − IN, ONLY for a COMPLETE lot (every taka received)
//   %     = SHORT ÷ OUT of the complete lots × 100   (from summed metres)
//   IN ₹  = job amount of the inward lots
//
// Property type K (knitting) — same endpoints, data.mode = 'K' (DyeingMillHubController::reportK / lotK):
//   one row per outward LINE of a challan with an annexure no.; unit by GRYOutD1.AmtCalc (MTR or KG, never added
//   together). OUT qty, INW, WASTE, RET (return), SHORT, EXCESS, BAL = OUT − all of them, BAL ₹ = BAL × rate.
//   The S fields are filled too (outM = OUT, inM = INW + RET, pend = BAL, short = WASTE + SHORT once complete).

export type LotStatus = 'COMPLETE' | 'PARTIAL' | 'PENDING';

export type HubLot = {
  key: string;
  outUId: string;
  outSrNo: string;
  outNo: string;
  outDate: string; // YYYY-MM-DD
  party: string; // outward party (mill / job worker)
  jobName: string;
  chartNo: string;
  lotNo: string;
  design: string;
  shade: string;
  item: string;
  customer: string;
  outTakas: number;
  recvTakas: number;
  outM: number;
  inM: number;
  /** returned back unprocessed (job outward return GRYORet / GRYORetD2) */
  retM: number;
  retTakas: number;
  pend: number;
  short: number | null; // null until the lot is complete
  pct: number | null;
  inAmt: number;
  inwCount: number;
  lastInw: string;
  unmatched: number;
  status: LotStatus;
  /** K only ('' for S): MTR / KG by GRYOutD1.AmtCalc, and the K quantities in that unit */
  unit: '' | 'MTR' | 'KG';
  annNo: string;
  outQ: number;
  outKg: number;
  outMtrQ: number;
  inwQ: number;
  wstQ: number;
  retQ: number;
  shtQ: number;
  excQ: number;
  balQ: number;
  rate: number;
  balAmt: number;
  inwAmt: number;
  /** Inward-view context supplied by the backend across the full outward-lot history. */
  originalOutDate?: string;
  movementDate?: string;
  otherInwardMonths?: string[];
  overallInM?: number;
  overallShort?: number | null;
  overallPct?: number | null;
  overallStatus?: LotStatus;
  overallRecvTakas?: number;
  movementEntries?: Array<Record<string, any>>;
  merge: string;
  grade: string;
  dept: string;
  remark: string;
};

/** one aggregated line (item row / design row / grand total / challan total) */
export type HubAgg = {
  /** label: item name on the item level, design name on the design level */
  design: string;
  /** item level: number of designs under the item */
  designs?: number;
  lots: number;
  outM: number;
  inM: number;
  ret: number;
  pend: number;
  short: number;
  /** outward metres of the complete lots (base of %) */
  lOut: number;
  pct: number;
  inAmt: number;
};

export type HubTaka = {
  takaNo: string;
  outM: number;
  received: boolean;
  inM: number;
  retM: number;
  returned: boolean;
  retNo: string;
  retDate: string;
  diff: number | null;
  inwNo: string;
  inwDate: string;
};

export type HubInward = {
  inwNo: string; inwDate: string; chalNo: string; lotNo: string; takas: number; inM: number; jobRate: number; jobAmt: number;
  /** K only */
  typeName: string; billNo: string; inwQ: number; wstQ: number; retQ: number; shtQ: number; excQ: number;
};

/** K: one line of the same annexure (party + annexure no.) */
export type HubAnnLine = { outUId: string; outSrNo: string; outNo: string; outDate: string; item: string; design: string; shade: string; unit: string; outQ: number; balQ: number; status: LotStatus };

export type HubReturn = { retNo: string; retDate: string; chalNo: string; takas: number; retM: number };

export type HubLotDetail = {
  takas: HubTaka[];
  inwards: HubInward[];
  returns: HubReturn[];
  unmatched: { takaNo: string; inM: number; inwNo: string; inwDate: string }[];
  /** K only */
  annexure: HubAnnLine[];
  annexureBal: number | null;
};

/** 'K' when the server answered with the property type K rules (data.mode = 'K') */
export const reportMode = (response: any): 'K' | 'S' => (s(unwrap(response, 'lots').mode).toUpperCase() === 'K' ? 'K' : 'S');

/* -------------------------------------------------------------------------- */

const lower = (row: any): Record<string, any> => {
  const out: Record<string, any> = {};
  if (row && typeof row === 'object') for (const k of Object.keys(row)) out[k.toLowerCase()] = row[k];
  return out;
};
const s = (v: any) => String(v ?? '').trim();
const n = (v: any) => {
  const x = Number(typeof v === 'string' ? v.replace(/,/g, '') : v);
  return Number.isFinite(x) ? x : 0;
};
const nOrNull = (v: any) => (v === null || v === undefined || v === '' ? null : n(v));
const date = (v: any) => {
  const raw = s(v);
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  if (/^\d{8}$/.test(raw)) return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
  return '';
};

/** Strip {data}/{success,data}/{response} wrappers down to the object holding `key`. */
const unwrap = (response: any, key: string): any => {
  let body: any = response?.data ?? response;
  for (let i = 0; i < 4; i += 1) {
    if (!body || typeof body !== 'object' || Array.isArray(body)) break;
    if (lower(body)[key] !== undefined) break;
    const next = body.data ?? body.response ?? body.result;
    if (!next || typeof next !== 'object') break;
    body = next;
  }
  return lower(body);
};

export const failMessage = (response: any): string | null => {
  const b = response?.data ?? response;
  return b && typeof b === 'object' && (b.success === false || b.status === false) ? s(b.message) || 'Request failed.' : null;
};

export const normalizeLots = (response: any): HubLot[] => {
  const body = unwrap(response, 'lots');
  const list: any[] = Array.isArray(body.lots) ? body.lots : [];
  return list.map((raw) => {
    const r = lower(raw);
    const st = s(r.status).toUpperCase();
    return {
      key: `${s(r.outuid)}|${s(r.outsrno)}`,
      outUId: s(r.outuid),
      outSrNo: s(r.outsrno),
      outNo: s(r.outno),
      outDate: date(r.outdate),
      party: s(r.partyname) || s(r.parcode) || '—',
      jobName: s(r.jobname),
      chartNo: s(r.chartno),
      lotNo: s(r.lotno),
      design: s(r.dsnname) || s(r.dsncode) || '—',
      shade: s(r.shdname),
      item: s(r.itmname),
      customer: s(r.customer),
      outTakas: n(r.outtakas),
      recvTakas: n(r.recvtakas),
      outM: n(r.outmtr),
      // K: IN = inward only, RET = return (the server's inmtr is inward + return for older apps)
      inM: s(r.unit) ? n(r.inwqty) : n(r.inmtr),
      retM: s(r.unit) ? n(r.retqty) : n(r.retmtr),
      retTakas: n(r.rettakas),
      pend: n(r.pendmtr),
      short: nOrNull(r.shortmtr),
      pct: nOrNull(r.shortper),
      inAmt: n(r.inamt),
      inwCount: n(r.inwcount),
      lastInw: date(r.lastinw),
      unmatched: n(r.unmatchedin),
      status: (st === 'COMPLETE' || st === 'PARTIAL' ? st : 'PENDING') as LotStatus,
      unit: (s(r.unit).toUpperCase() === 'MTR' ? 'MTR' : s(r.unit).toUpperCase() === 'KG' ? 'KG' : '') as HubLot['unit'],
      annNo: s(r.outannno),
      outQ: n(r.outqty),
      outKg: n(r.outkg),
      outMtrQ: n(r.outmtrq),
      inwQ: n(r.inwqty),
      wstQ: n(r.wstqty),
      retQ: n(r.retqty),
      shtQ: n(r.shtqty),
      excQ: n(r.excqty),
      balQ: n(r.balqty),
      rate: n(r.rate),
      balAmt: n(r.balamt),
      inwAmt: n(r.inwamt),
      originalOutDate: date(r.originaloutdate || r.outdate),
      movementDate: date(r.movementdate || r.lastinw),
      otherInwardMonths: Array.isArray(r.otherinwardmonths)
        ? r.otherinwardmonths.map((v: any) => s(v)).filter(Boolean)
        : s(r.otherinwardmonths || r.othermonths).split(',').map((v: string) => v.trim()).filter(Boolean),
      overallInM: nOrNull(r.overallinmtr) ?? undefined,
      overallShort: nOrNull(r.overallshortmtr),
      overallPct: nOrNull(r.overallshortper),
      overallStatus: (['COMPLETE', 'PARTIAL', 'PENDING'].includes(s(r.overallstatus).toUpperCase())
        ? s(r.overallstatus).toUpperCase()
        : '') as HubLot['overallStatus'],
      overallRecvTakas: nOrNull(r.overallrecvtakas) ?? undefined,
      movementEntries: Array.isArray(r.movemententries) ? r.movemententries : [],
      merge: s(r.mername),
      grade: s(r.grdname),
      dept: s(r.department),
      remark: s(r.remark),
    };
  });
};

export const normalizeLotDetail = (response: any): HubLotDetail => {
  const body = unwrap(response, 'takas');
  const takas = (Array.isArray(body.takas) ? body.takas : []).map((raw: any) => {
    const r = lower(raw);
    return {
      takaNo: s(r.takano), outM: n(r.outmtr), received: n(r.received) > 0, inM: n(r.inmtr),
      retM: n(r.retmtr), returned: n(r.returned) > 0, retNo: s(r.retno), retDate: s(r.retdate).split(',').map(date).filter(Boolean).join(', '),
      diff: nOrNull(r.diffmtr), inwNo: s(r.inwno), inwDate: s(r.inwdate).split(',').map(date).filter(Boolean).join(', '),
    };
  });
  const inwards = (Array.isArray(body.inwards) ? body.inwards : []).map((raw: any) => {
    const r = lower(raw);
    return {
      inwNo: s(r.inwno), inwDate: date(r.inwdate), chalNo: s(r.chalno), lotNo: s(r.lotno), takas: n(r.takas), inM: n(r.inmtr), jobRate: n(r.jobrate), jobAmt: n(r.jobamt),
      typeName: s(r.typename), billNo: s(r.billno), inwQ: n(r.inwqty), wstQ: n(r.wstqty), retQ: n(r.retqty), shtQ: n(r.shtqty), excQ: n(r.excqty),
    };
  });
  const unmatched = (Array.isArray(body.unmatched) ? body.unmatched : []).map((raw: any) => {
    const r = lower(raw);
    return { takaNo: s(r.takano), inM: n(r.inmtr), inwNo: s(r.inwno), inwDate: date(r.inwdate) };
  });
  const annexure = (Array.isArray(body.annexure) ? body.annexure : []).map((raw: any) => {
    const r = lower(raw);
    const st = s(r.status).toUpperCase();
    return {
      outUId: s(r.outuid), outSrNo: s(r.outsrno), outNo: s(r.outno), outDate: date(r.outdate), item: s(r.itmname), design: s(r.dsnname),
      shade: s(r.shdname), unit: s(r.unit), outQ: n(r.outqty), balQ: n(r.balqty),
      status: (st === 'COMPLETE' || st === 'PARTIAL' ? st : 'PENDING') as LotStatus,
    };
  });
  const returns = (Array.isArray(body.returns) ? body.returns : []).map((raw: any) => {
    const r = lower(raw);
    return { retNo: s(r.retno), retDate: date(r.retdate), chalNo: s(r.chalno), takas: n(r.takas), retM: n(r.retmtr) };
  });
  return { takas, inwards, returns, unmatched, annexure, annexureBal: nOrNull(body.annexurebal) };
};

/* -------------------------------------------------------------------------- */
/*  aggregation                                                                */
/* -------------------------------------------------------------------------- */

export const aggOf = (design: string, lots: HubLot[]): HubAgg => {
  const a: HubAgg = { design, lots: lots.length, outM: 0, inM: 0, ret: 0, pend: 0, short: 0, lOut: 0, pct: 0, inAmt: 0 };
  lots.forEach((l) => {
    a.outM += l.outM;
    a.inM += l.inM;
    a.ret += l.retM;
    a.pend += l.pend;
    a.inAmt += l.inAmt;
    if (l.status === 'COMPLETE' && l.short !== null) {
      a.short += l.short;
      a.lOut += l.outM;
    }
  });
  a.pct = a.lOut > 0 ? (a.short / a.lOut) * 100 : 0;
  return a;
};

export type StatusFilter = 'ALL' | LotStatus;

export const filterLots = (lots: HubLot[], party: string, status: StatusFilter) =>
  lots.filter((l) => (party === 'ALL' || l.party === party) && (status === 'ALL' || l.status === status));

/** design-wise rows (most outward first) + grand total */
export const buildDesignRows = (lots: HubLot[]) => {
  const by = new Map<string, HubLot[]>();
  lots.forEach((l) => {
    const list = by.get(l.design);
    if (list) list.push(l); else by.set(l.design, [l]);
  });
  const rows = [...by.entries()].map(([d, ls]) => aggOf(d, ls)).sort((a, b) => b.outM - a.outM || a.design.localeCompare(b.design));
  return { rows, G: aggOf('GRAND TOTAL', lots) };
};

/** item of a lot as shown (GRYOutD1 item → FAMItem.ItmName); K adds the unit — MTR and KG lines are never mixed */
export const itemOf = (l: HubLot) => (l.item || '(no item)') + (l.unit ? ` · ${l.unit}` : '');

/* ------------------------------ K item summary ------------------------------ */

export type KAgg = {
  key: string; // itemOf() of its lines (drill key)
  item: string;
  unit: 'MTR' | 'KG';
  lines: number;
  challans: number;
  out: number;
  outKg: number;
  inw: number;
  wst: number;
  ret: number;
  sht: number;
  exc: number;
  bal: number;
  balAmt: number;
  inwAmt: number;
};

const kAgg = (key: string, item: string, unit: 'MTR' | 'KG', lots: HubLot[]): KAgg => {
  const a: KAgg = { key, item, unit, lines: lots.length, challans: new Set(lots.map((l) => l.outUId)).size, out: 0, outKg: 0, inw: 0, wst: 0, ret: 0, sht: 0, exc: 0, bal: 0, balAmt: 0, inwAmt: 0 };
  lots.forEach((l) => {
    a.out += l.outQ; a.outKg += l.outKg; a.inw += l.inwQ; a.wst += l.wstQ; a.ret += l.retQ; a.sht += l.shtQ; a.exc += l.excQ;
    a.bal += l.balQ; a.balAmt += l.balAmt; a.inwAmt += l.inwAmt;
  });
  return a;
};

/** K: item-wise rows per unit (MTR block, KG block), most outward first, each with its own total */
export const buildKItemRows = (lots: HubLot[]) => {
  const blocks: { unit: 'MTR' | 'KG'; rows: KAgg[]; G: KAgg }[] = [];
  (['MTR', 'KG'] as const).forEach((unit) => {
    const ul = lots.filter((l) => l.unit === unit);
    if (!ul.length) return;
    const by = new Map<string, HubLot[]>();
    ul.forEach((l) => {
      const k = itemOf(l);
      const list = by.get(k);
      if (list) list.push(l); else by.set(k, [l]);
    });
    const rows = [...by.entries()].map(([k, ls]) => kAgg(k, ls[0].item || '(no item)', unit, ls)).sort((a, b) => b.out - a.out || a.item.localeCompare(b.item));
    blocks.push({ unit, rows, G: kAgg(`TOTAL ${unit}`, `TOTAL · ${unit}`, unit, ul) });
  });
  return blocks;
};

/** item-wise rows (parent level, most outward first) + grand total; HubAgg.design carries the item name */
export const buildItemRows = (lots: HubLot[]) => {
  const by = new Map<string, HubLot[]>();
  lots.forEach((l) => {
    const k = itemOf(l);
    const list = by.get(k);
    if (list) list.push(l); else by.set(k, [l]);
  });
  const rows = [...by.entries()]
    .map(([k, ls]) => ({ ...aggOf(k, ls), designs: new Set(ls.map((l) => l.design)).size }))
    .sort((a, b) => b.outM - a.outM || a.design.localeCompare(b.design));
  return { rows, G: aggOf('GRAND TOTAL', lots) };
};

/** lots of one item */
export const lotsOfItem = (lots: HubLot[], item: string) => lots.filter((l) => itemOf(l) === item);

/** lots of one design, newest challan first */
export const lotsOfDesign = (lots: HubLot[], design: string) =>
  lots.filter((l) => l.design === design).sort((a, b) => (b.outDate.localeCompare(a.outDate)) || b.outNo.localeCompare(a.outNo));

export const partiesOf = (lots: HubLot[]) => [...new Set(lots.map((l) => l.party).filter((p) => p && p !== '—'))].sort((a, b) => a.localeCompare(b));

export const statusCounts = (lots: HubLot[]) => ({
  COMPLETE: lots.filter((l) => l.status === 'COMPLETE').length,
  PARTIAL: lots.filter((l) => l.status === 'PARTIAL').length,
  PENDING: lots.filter((l) => l.status === 'PENDING').length,
});

/* -------------------------------------------------------------------------- */
/*  mock (dyeingApi USE_MOCK = true) — same shape as the controller            */
/* -------------------------------------------------------------------------- */

const MOCK = [
  ['JO/27/101', '2026-09-04', 'Shree Rang Dyeing', 'RIP STOP-145', 'BROWN', 'CH-938-01', 6, 6, 612, 598.4],
  ['JO/27/101', '2026-09-04', 'Shree Rang Dyeing', 'RIP STOP-145', 'GREY', 'CH-938-01', 6, 4, 610, 402.1],
  ['JO/27/108', '2026-09-12', 'Akash Process', 'Micro Twill 310', 'OLIVE', 'CH-941-02', 8, 8, 830, 806.0],
  ['JO/27/115', '2026-09-20', 'Akash Process', 'Micro Twill 310', 'BLACK', 'CH-941-02', 5, 0, 515, 0],
  ['JO/27/122', '2026-10-02', 'Shree Rang Dyeing', 'Satin Stripe 77', 'CAMEL', 'CH-950-01', 7, 7, 721, 712.5],
] as const;

export const mockMillHubReport = async (body: { fromdate: string; todate: string }) => {
  await new Promise((r) => setTimeout(r, 250));
  const lots = MOCK.filter((m) => m[1] >= body.fromdate && m[1] <= body.todate).map((m, i) => {
    const [outno, outdate, party, dsn, shd, chart, ot, rt, om, im] = m;
    const complete = rt === ot;
    const per = om / ot;
    return {
      outuid: 9000 + i, outsrno: 1, outno, outdate, partyname: party, jobname: 'DYEING', chartno: chart, lotno: `L${200 + i}`,
      dsnname: dsn, shdname: shd, itmname: 'GREY FABRIC', customer: 'KHAZANA SYNTEX', outtakas: ot, recvtakas: rt,
      outmtr: om, inmtr: im, pendmtr: Math.round((ot - rt) * per * 100) / 100,
      shortmtr: complete ? Math.round((om - im) * 100) / 100 : null,
      shortper: complete ? Math.round(((om - im) / om) * 10000) / 100 : null,
      inamt: Math.round(im * 14.5), inwcount: rt ? 1 : 0, lastinw: rt ? outdate : '', unmatchedin: 0,
      status: complete ? 'COMPLETE' : rt ? 'PARTIAL' : 'PENDING',
    };
  });
  return { data: { success: true, data: { lots } } };
};

export const mockMillHubLot = async (lot: HubLot) => {
  await new Promise((r) => setTimeout(r, 200));
  const per = lot.outTakas ? lot.outM / lot.outTakas : 0;
  const inPer = lot.recvTakas ? lot.inM / lot.recvTakas : 0;
  const takas = Array.from({ length: lot.outTakas }, (_, i) => {
    const got = i < lot.recvTakas;
    return {
      takano: `${lot.outNo.slice(-3)}-${i + 1}`, outmtr: Math.round(per * 100) / 100, received: got ? 1 : 0,
      inmtr: got ? Math.round(inPer * 100) / 100 : 0, diffmtr: got ? Math.round((per - inPer) * 100) / 100 : null,
      inwno: got ? 'JI/27/77' : '', inwdate: got ? lot.lastInw : '',
    };
  });
  const inwards = lot.recvTakas ? [{ inwno: 'JI/27/77', inwdate: lot.lastInw, chalno: 'DC-5521', lotno: lot.lotNo, takas: lot.recvTakas, inmtr: lot.inM, jobrate: 14.5, jobamt: lot.inAmt }] : [];
  return { data: { success: true, data: { takas, inwards, unmatched: [] } } };
};
