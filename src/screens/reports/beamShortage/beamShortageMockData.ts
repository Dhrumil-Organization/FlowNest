// FILE: src/screens/reports/beamShortage/beamShortageMockData.ts
// HARD-CODED test data for Reports → Beam Shortage, used while
// USE_MOCK = true in beamShortageApi.ts.
//
// `mockBeamShortage(body)` answers exactly like the PHP API
// (BeamShortageReportController): it takes raw completed beams, applies the
// period on the last-taka date + the year no., distributes each beam's
// shortage over its designs by produced metres, and returns
// { success, data: { designs, details, total, context } }.

type Run = { dsncode: string; maccode: string; prod: number; gait: string };
type MockBeam = { beamuid: number; beamno: string; warplen: number; warp: string; last: string; runs: Run[] };

const DESIGNS: Record<string, { dsnname: string; itmcode: string; itmname: string }> = {
  D145: { dsnname: 'Rib Stop 145', itmcode: 'I01', itmname: 'SPORTSWEAR' },
  D8228: { dsnname: '8228', itmcode: 'I02', itmname: 'DRESS MATERIAL' },
  D310: { dsnname: 'Micro Twill 310', itmcode: 'I01', itmname: 'SPORTSWEAR' },
  D77: { dsnname: 'Satin Stripe 77', itmcode: 'I03', itmname: 'SHIRTING' },
  D520: { dsnname: 'Dobby Check 520', itmcode: 'I03', itmname: 'SHIRTING' },
  D9001: { dsnname: 'Honeycomb 9001', itmcode: 'I02', itmname: 'DRESS MATERIAL' },
};

const MACHINES: Record<string, string> = {
  R01: 'R-01', R02: 'R-02', R14: 'R-14', R37: 'R-37', R76: 'R-76', R81: 'R-81', W03: 'W-03', W11: 'W-11', W22: 'W-22',
};

// FY 2026-27 (year no. 27) and FY 2025-26 (year no. 26). `last` = last-taka date.
const BEAMS: MockBeam[] = [
  { beamuid: 270001, beamno: 'B-1041', warplen: 3200, warp: '2026-08-28', last: '2026-09-29', runs: [{ dsncode: 'D145', maccode: 'R76', prod: 3142.5, gait: '2026-09-01' }] },
  { beamuid: 270002, beamno: 'B-1038', warplen: 2800, warp: '2026-08-20', last: '2026-09-24', runs: [{ dsncode: 'D145', maccode: 'R81', prod: 1620, gait: '2026-08-24' }, { dsncode: 'D310', maccode: 'R81', prod: 1068.4, gait: '2026-09-10' }] },
  { beamuid: 270003, beamno: 'B-1033', warplen: 4100, warp: '2026-08-11', last: '2026-09-18', runs: [{ dsncode: 'D8228', maccode: 'W03', prod: 3936.2, gait: '2026-08-14' }] },
  { beamuid: 270004, beamno: 'B-1029', warplen: 2500, warp: '2026-08-02', last: '2026-09-06', runs: [{ dsncode: 'D77', maccode: 'R14', prod: 2478.3, gait: '2026-08-05' }] },
  { beamuid: 270005, beamno: 'B-1024', warplen: 3600, warp: '2026-07-21', last: '2026-08-27', runs: [{ dsncode: 'D520', maccode: 'R37', prod: 3471.9, gait: '2026-07-24' }] },
  { beamuid: 270006, beamno: 'B-1019', warplen: 3000, warp: '2026-07-09', last: '2026-08-14', runs: [{ dsncode: 'D9001', maccode: 'W11', prod: 1410, gait: '2026-07-12' }, { dsncode: 'D8228', maccode: 'W11', prod: 1502.6, gait: '2026-07-29' }] },
  { beamuid: 270007, beamno: 'B-1012', warplen: 2750, warp: '2026-06-25', last: '2026-07-30', runs: [{ dsncode: 'D310', maccode: 'R02', prod: 2712.4, gait: '2026-06-28' }] },
  { beamuid: 270008, beamno: 'B-1007', warplen: 3300, warp: '2026-06-10', last: '2026-07-16', runs: [{ dsncode: 'D145', maccode: 'R76', prod: 3188.7, gait: '2026-06-13' }] },
  { beamuid: 270009, beamno: 'B-0998', warplen: 2900, warp: '2026-05-22', last: '2026-06-27', runs: [{ dsncode: 'D77', maccode: 'R01', prod: 2861.1, gait: '2026-05-25' }] },
  { beamuid: 270010, beamno: 'B-0991', warplen: 4000, warp: '2026-05-04', last: '2026-06-09', runs: [{ dsncode: 'D8228', maccode: 'W22', prod: 3790.5, gait: '2026-05-07' }] },
  { beamuid: 270011, beamno: 'B-0984', warplen: 2600, warp: '2026-04-12', last: '2026-05-15', runs: [{ dsncode: 'D520', maccode: 'R37', prod: 2569.8, gait: '2026-04-15' }] },
  { beamuid: 260101, beamno: 'B-0972', warplen: 3100, warp: '2026-02-10', last: '2026-03-18', runs: [{ dsncode: 'D145', maccode: 'R76', prod: 3024.6, gait: '2026-02-13' }] },
  { beamuid: 260102, beamno: 'B-0951', warplen: 2800, warp: '2025-12-20', last: '2026-01-26', runs: [{ dsncode: 'D9001', maccode: 'W03', prod: 2702.2, gait: '2025-12-23' }] },
  { beamuid: 260103, beamno: 'B-0930', warplen: 3500, warp: '2025-10-28', last: '2025-12-04', runs: [{ dsncode: 'D310', maccode: 'R02', prod: 1900, gait: '2025-10-31' }, { dsncode: 'D77', maccode: 'R02', prod: 1551.5, gait: '2025-11-18' }] },
  { beamuid: 260104, beamno: 'B-0902', warplen: 2400, warp: '2025-08-15', last: '2025-09-19', runs: [{ dsncode: 'D8228', maccode: 'W11', prod: 2295.4, gait: '2025-08-18' }] },
  { beamuid: 260105, beamno: 'B-0877', warplen: 3700, warp: '2025-06-02', last: '2025-07-10', runs: [{ dsncode: 'D520', maccode: 'R14', prod: 3668.9, gait: '2025-06-05' }] },
];

const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const fyEndYear = (iso: string) => {
  const y = Number(iso.slice(0, 4));
  return Number(iso.slice(5, 7)) >= 4 ? y + 1 : y;
};

export const mockBeamShortage = async (body: { yearno?: any; fromdate: string; todate: string; prpcode?: string }) => {
  await new Promise((resolve) => setTimeout(resolve, 350)); // feel like a network call

  const yearNo = Number(body.yearno);
  const picked = BEAMS.filter((b) =>
    b.last >= body.fromdate && b.last <= body.todate &&
    (!(yearNo > 0) || fyEndYear(b.last) % 100 === yearNo));

  const details: Record<string, any>[] = [];
  const designs: Record<string, any> = {};

  picked.forEach((b) => {
    const beamProd = b.runs.reduce((a, r) => a + r.prod, 0);
    const beamShort = r2(b.warplen - beamProd);
    let given = 0;
    b.runs.forEach((r, k) => {
      const share = k === b.runs.length - 1
        ? r2(beamShort - given)
        : beamProd > 0 ? r2((beamShort * r.prod) / beamProd) : r2(beamShort / b.runs.length);
      given += share;
      const prod = r2(r.prod);
      const warped = r2(prod + share);
      const d = DESIGNS[r.dsncode];
      details.push({
        dsncode: r.dsncode, dsnname: d.dsnname, itmcode: d.itmcode, itmname: d.itmname,
        beamuid: b.beamuid, beamno: b.beamno, maccode: r.maccode, macname: MACHINES[r.maccode] || r.maccode,
        warpingdate: b.warp, gaittingdate: r.gait, lasttakadate: b.last,
        status: 'Beam Fall', shared: b.runs.length > 1 ? 1 : 0,
        warpedmtr: warped, producemtr: prod, shortagemtr: share,
        shortageper: warped > 0 ? r2((share / warped) * 100) : 0,
        islasttakadone: 1, yearno: fyEndYear(b.last) % 100,
      });
      const s = designs[r.dsncode] || (designs[r.dsncode] = {
        dsncode: r.dsncode, dsnname: d.dsnname, itmcode: d.itmcode, itmname: d.itmname,
        beams: 0, warpedmtr: 0, producemtr: 0, shortagemtr: 0, shortageper: 0,
      });
      s.beams += 1;
      s.warpedmtr += warped;
      s.producemtr += prod;
      s.shortagemtr += share;
    });
  });

  const total = { designs: 0, beams: picked.length, warpedmtr: 0, producemtr: 0, shortagemtr: 0, shortageper: 0 };
  const list = Object.values(designs).map((s: any) => {
    s.warpedmtr = r2(s.warpedmtr);
    s.producemtr = r2(s.producemtr);
    s.shortagemtr = r2(s.shortagemtr);
    s.shortageper = s.warpedmtr > 0 ? r2((s.shortagemtr / s.warpedmtr) * 100) : 0;
    total.warpedmtr += s.warpedmtr;
    total.producemtr += s.producemtr;
    total.shortagemtr += s.shortagemtr;
    return s;
  }).sort((a: any, b: any) => b.shortagemtr - a.shortagemtr);
  total.designs = list.length;
  total.warpedmtr = r2(total.warpedmtr);
  total.producemtr = r2(total.producemtr);
  total.shortagemtr = r2(total.shortagemtr);
  total.shortageper = total.warpedmtr > 0 ? r2((total.shortagemtr / total.warpedmtr) * 100) : 0;

  return {
    data: {
      success: true,
      data: {
        designs: list,
        details,
        total,
        context: { yearno: body.yearno, prpcode: body.prpcode || '', fromdate: body.fromdate, todate: body.todate },
      },
    },
  };
};

/** Raw beams in the PHP controller's row shape — used only to cross-check mock vs backend. */
export const mockRawRows = () =>
  BEAMS.flatMap((b) => b.runs.map((r) => ({
    beamuid: b.beamuid, beamno: b.beamno, warplen: b.warplen,
    warpingdate: b.warp.replace(/-/g, ''), gaittingdate: r.gait.replace(/-/g, ''), lasttakadate: b.last.replace(/-/g, ''),
    prod: r.prod, pstatus: 1, dsncode: r.dsncode, dsnname: DESIGNS[r.dsncode].dsnname,
    itmcode: DESIGNS[r.dsncode].itmcode, itmname: DESIGNS[r.dsncode].itmname,
    maccode: r.maccode, macname: MACHINES[r.maccode],
  })));
