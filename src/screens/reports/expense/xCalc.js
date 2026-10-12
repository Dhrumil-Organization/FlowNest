/**
 * Expense report — calculation layer.
 *
 * A line-by-line port of the ERP Designing artifact's Expense module helpers
 * (xCompute, xDailySeries, xUtilMeters, xUtilDaily, xSectionMTD …), fed with
 * live ERP data from /api/mobile-dashboard/expense-card instead of the
 * artifact's sample month.
 *
 * Senior's rules (from 1 Oct 2026) replace the artifact's machine-count split:
 *   Section A = Waterjet + S. Rapier (230 cm) + 1/3 × (Warping + Misc)
 *   Section B = MW Rapier + MW Luwa + S. Rapier (190 cm) + S. Rapier Luwa
 *               + 2/3 × (Warping + Misc)
 *   S. Rapier Luwa → 100 % Section B (it serves the 190 cm looms)
 *   Store-Waterjet → A, Store-Rapier → B (backend gives final A/B stores)
 *   Each meter ₹/pick = its kWh × that day's rate ÷ (its own machines'
 *   metres × their PPI); warping / misc / total ÷ total production ×
 *   production-weighted PPI. Units are never merged before costing.
 *   Day-wise figures use that day's units, rate, production and picks.
 * Maintenance / Other "Common" keeps the ERP rule: split by machine count.
 */

/* ------------------------------------------------------------------ */
/*  Theme + formatters (artifact constants)                            */
/* ------------------------------------------------------------------ */
export const T = {
  nav: '#0D1B2A', bg: '#F5F2EE', surface: '#FFFFFF', border: '#E5E0DA', muted: '#9A9590',
  sub: '#F8F5F1', alt: '#F0EDE8', ink: '#1A1514', copper: '#C87533', green: '#2A6044',
  red: '#B23A2A', amber: '#C98A1A', blue: '#3A568A', purple: '#652880',
};
export const XC = { elec: '#3A568A', sal: '#9A4A10', store: '#2A6044', fixed: '#652880', other: '#C98A1A' };

const num = (v) => {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
};
export const xCr = (n) => {
  n = +n || 0;
  const s = n < 0 ? '-' : '';
  n = Math.abs(n);
  if (n >= 1e7) return `${s}₹${(n / 1e7).toFixed(2)} Cr`;
  if (n >= 1e5) return `${s}₹${(n / 1e5).toFixed(2)} L`;
  return `${s}₹${Math.round(n).toLocaleString('en-IN')}`;
};
export const xM = (n) => {
  n = +n || 0;
  if (n >= 1e5) return `${(n / 1e5).toFixed(2)} L m`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)} K m`;
  return `${Math.round(n)} m`;
};
export const xR2 = (n) => `₹${(+n || 0).toFixed(2)}`;
export const xR3 = (n) => `₹${(+n || 0).toFixed(3)}`;
export const xR4 = (n) => `₹${(+n || 0).toFixed(4)}`;
export const xPc = (n) => `${(+n || 0).toFixed(1)}%`;
export const xK0 = (n) => Math.round(+n || 0).toLocaleString('en-IN');

export const XMON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
/** 20261001 -> "01-Oct" (artifact day label) */
export const dayLabel = (ymd) => {
  const s = String(ymd || '');
  if (s.length !== 8) return s;
  return `${s.slice(6, 8)}-${XMON[Number(s.slice(4, 6)) - 1] || ''}`;
};
/** 20261001 -> "2026-10-01" */
export const ymdIso = (ymd) => {
  const s = String(ymd || '');
  return s.length === 8 ? `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}` : null;
};

/* ------------------------------------------------------------------ */
/*  Sections — counts from the ERP machine map (artifact defaults)     */
/* ------------------------------------------------------------------ */
export const SHARE = { A: 1 / 3, B: 2 / 3 }; // warping + misc (senior)
const cnt = (v, fb) => (num(v) > 0 ? Math.round(num(v)) : fb);
export function machineCounts(d) {
  const c = (d && d.section_machine_counts) || {};
  const wj = cnt(c.waterjet, 30), s230 = cnt(c.sud_rapier_230, 10), mw = cnt(c.mw_rapier, 48), s190 = cnt(c.sud_rapier_190, 38);
  return { wj, s230, mw, s190, A: wj + s230, B: mw + s190, T: wj + s230 + mw + s190 };
}
export function makeXSEC(c) {
  return {
    A: {
      k: 'A', n: c.A, short: 'Section A', color: '#3A568A',
      lbl: `A — Waterjet (${c.wj}) + S. Rapier (230 cm) (${c.s230})`,
      groups: `Waterjet ${c.wj} (W01–W30) · S. Rapier 230 cm ${c.s230} (R75–R84)`,
    },
    B: {
      k: 'B', n: c.B, short: 'Section B', color: '#652880',
      lbl: `B — Rapier (190 cm): ${c.B} machines · M Weaves: ${c.mw} · S. Rapier: ${c.s190}`,
      groups: `M Weaves ${c.mw} (R01–R48) · S. Rapier 190 cm ${c.s190} (R49–R74, R85–R96)`,
    },
  };
}
export function makeXGROUPS(c) {
  return [
    { k: 'wjet', lbl: 'Waterjet', n: c.wj, sec: 'A', rng: 'W01–W30', prod: 'wjet', pick: 'wjet' },
    { k: 'sud230', lbl: 'S. Rapier (230 cm)', n: c.s230, sec: 'A', rng: 'R75–R84', prod: 'sud230', pick: 'sud230' },
    { k: 'mw', lbl: 'M Weaves', n: c.mw, sec: 'B', rng: 'R01–R48', prod: 'mwRapier', pick: 'mw' },
    { k: 'sud', lbl: 'S. Rapier (190 cm)', n: c.s190, sec: 'B', rng: 'R49–R74 · R85–R96', prod: 'sudRapier', pick: 'sud' },
  ];
}

/* ------------------------------------------------------------------ */
/*  Meters                                                             */
/* ------------------------------------------------------------------ */
export const XUKEYS = ['mwLooms', 'mwLuwa', 'sudLooms', 'sud230Looms', 'sudLuwa', 'wjetLooms', 'warping', 'misc'];
export const XUALL = [...XUKEYS, 'total'];
/* Each meter's own production basis (senior). */
const XUPROD = { mwLooms: 'mw', mwLuwa: 'mw', sudLooms: 'sud', sud230Looms: 'sud230', sudLuwa: 'sud', wjetLooms: 'wjet', warping: 'all', misc: 'all' };

export function makeXU_METERS(c) {
  return {
    mwLooms: { k: 'mwLooms', lbl: 'MW Rapier', sub: `${c.mw} looms · R01–R48`, sec: 'B', prod: 'mwRapier', pick: 'mw', basis: 'M Weaves production' },
    mwLuwa: { k: 'mwLuwa', lbl: 'MW Luwa', sub: 'humidification · on M Weaves production', sec: 'B', prod: 'mwRapier', pick: 'mw', basis: 'M Weaves production' },
    sudLooms: { k: 'sudLooms', lbl: 'S. Rapier (190 cm)', sub: `${c.s190} looms · R49–R74, R85–R96`, sec: 'B', prod: 'sudRapier', pick: 'sud', basis: 'S. Rapier 190 cm production' },
    sudLuwa: { k: 'sudLuwa', lbl: 'S. Rapier Luwa', sub: 'humidification · on 190 cm production', sec: 'B', prod: 'sudRapier', pick: 'sud', basis: 'S. Rapier 190 cm production' },
    sud230Looms: { k: 'sud230Looms', lbl: 'S. Rapier (230 cm)', sub: `${c.s230} looms · R75–R84 · own sub-meter`, sec: 'A', prod: 'sud230', pick: 'sud230', basis: 'S. Rapier 230 cm production' },
    wjetLooms: { k: 'wjetLooms', lbl: 'Waterjet', sub: `${c.wj} looms · W01–W30`, sec: 'A', prod: 'wjet', pick: 'wjet', basis: 'Waterjet production' },
    warping: { k: 'warping', lbl: 'Warping', sub: 'on total production · weighted PPI', sec: 'A+B', prod: 'all', pick: 'all', basis: 'total production, production-weighted PPI' },
    misc: { k: 'misc', lbl: 'Miscellaneous', sub: 'total − all meters above · on total production', sec: 'A+B', prod: 'all', pick: 'all', basis: 'total production, production-weighted PPI', remainder: true },
    total: { k: 'total', lbl: 'Total electricity', sub: 'all meters · total production · weighted PPI', sec: 'A+B', prod: 'all', pick: 'all', basis: 'total production, production-weighted PPI', total: true },
  };
}
export function makeXU_CARDS(c) {
  return [
    { k: 'mw', lbl: 'M Weaves', sub: `${c.mw} looms`, sec: 'B', keys: ['mwLooms', 'mwLuwa'] },
    { k: 'sud', lbl: 'S. Rapier', sub: `${c.s190} + ${c.s230} looms`, sec: 'B', keys: ['sudLooms', 'sudLuwa', 'sud230Looms'] },
    { k: 'wjet', lbl: 'Waterjet', sub: `${c.wj} looms`, sec: 'A', keys: ['wjetLooms'] },
    { k: 'shared', lbl: 'Shared meters', sub: 'plant-wide', sec: 'A+B', keys: ['warping', 'misc'] },
  ];
}

/* ------------------------------------------------------------------ */
/*  Day helpers                                                        */
/* ------------------------------------------------------------------ */
/** that day's ₹ for each meter + its A / B electricity (senior split) */
export function xDayElec(u, exp) {
  const rate = exp.rateEdited ? num(exp.rate) : num(u && u.rate) || num(exp.rate);
  const e = (k) => num((u || {})[k]) * rate;
  const shared = e('warping') + e('misc');
  return {
    A: e('wjetLooms') + e('sud230Looms') + shared * SHARE.A,
    B: e('mwLooms') + e('mwLuwa') + e('sudLooms') + e('sudLuwa') + shared * SHARE.B,
    e,
    rate,
  };
}
/** kWh split only (Daily units module) */
export function xDayKwhAB(u) {
  const e = (k) => num((u || {})[k]);
  const shared = e('warping') + e('misc');
  return { A: e('wjetLooms') + e('sud230Looms') + shared * SHARE.A, B: e('mwLooms') + e('mwLuwa') + e('sudLooms') + e('sudLuwa') + shared * SHARE.B };
}
/** that day's production by group with that day's real PPI */
export function xDayProd(p) {
  p = p || {};
  const mw = num(p.mwRapier), sud = num(p.sudRapier), s2 = num(p.sud230), wj = num(p.wjet);
  const pk = p.pk || { mw: 0, sud: 0, sud230: 0, wjet: 0 };
  const A = wj + s2, B = mw + sud;
  return {
    mw, sud, s2, wj, A, B, T: A + B, pk,
    pkA: A > 0 ? (num(pk.wjet) * wj + num(pk.sud230) * s2) / A : 0,
    pkB: B > 0 ? (num(pk.mw) * mw + num(pk.sud) * sud) / B : 0,
  };
}
const xSumUnits = (rows) => {
  const o = {};
  XUKEYS.forEach((k) => (o[k] = 0));
  (rows || []).forEach((r) => XUKEYS.forEach((k) => (o[k] += num(r[k]))));
  return o;
};
const xSumSal = (rows) => (rows || []).reduce((a, r) => ({ A: a.A + num(r.A), B: a.B + num(r.B) }), { A: 0, B: 0 });
const xSumRWC = (rows) => {
  let a = 0, b = 0, c = 0;
  (rows || []).forEach((x) => { a += num(x.A); b += num(x.B); c += num(x.common); });
  return { a, b, c };
};
export const xAllocRWC = (t, cnts) => {
  const tot = cnts.A + cnts.B || 1;
  return { A: t.a + (cnts.A / tot) * t.c, B: t.b + (cnts.B / tot) * t.c };
};

/* ------------------------------------------------------------------ */
/*  Month figures (artifact xCompute)                                   */
/* ------------------------------------------------------------------ */
export function xCompute(I) {
  const c = I.counts;
  const u = I.units || {};
  const eAll = I.eAll || {};
  const elecTotal = XUKEYS.reduce((s, k) => s + num(eAll[k]), 0);
  const unitsTotal = XUKEYS.reduce((s, k) => s + num(u[k]), 0);
  const shared = num(eAll.warping) + num(eAll.misc);
  const elecA = num(eAll.wjetLooms) + num(eAll.sud230Looms) + shared * SHARE.A;
  const elecB = num(eAll.mwLooms) + num(eAll.mwLuwa) + num(eAll.sudLooms) + num(eAll.sudLuwa) + shared * SHARE.B;
  const P = I.prod || {}, K = I.picks || {};
  const pv = (k) => num(P[k]), kv = (k) => num(K[k]);
  const prodA = pv('wjet') + pv('sud230'), prodB = pv('mwRapier') + pv('sudRapier'), totalProd = prodA + prodB;
  const picksA = prodA > 0 ? (kv('wjet') * pv('wjet') + kv('sud230') * pv('sud230')) / prodA : 0;
  const picksB = prodB > 0 ? (kv('mw') * pv('mwRapier') + kv('sud') * pv('sudRapier')) / prodB : 0;
  const totalPicks = totalProd > 0 ? (picksA * prodA + picksB * prodB) / totalProd : 0;
  const sal = I.salary || { A: 0, B: 0 }, st = I.stores || { A: 0, B: 0 }, mt = I.maint || { A: 0, B: 0 }, ot = I.other || { A: 0, B: 0 };
  const salT = num(sal.A) + num(sal.B), storeT = num(st.A) + num(st.B), maintT = num(mt.A) + num(mt.B), otherT = num(ot.A) + num(ot.B);
  const coreTotal = elecTotal + salT + storeT + maintT + otherT;
  const costA = elecA + num(sal.A) + num(st.A) + num(mt.A) + num(ot.A);
  const costB = elecB + num(sal.B) + num(st.B) + num(mt.B) + num(ot.B);
  const pp = (a, p, k) => (p > 0 && k > 0 ? a / p / k : 0);
  const mk = (a, p, k) => ({ amt: a, perM: p > 0 ? a / p : 0, perPick: pp(a, p, k) });
  const sec = (k, elec, cost, p, pk) => ({
    k, elec: mk(elec, p, pk), sal: mk(num(sal[k]), p, pk), store: mk(num(st[k]), p, pk), maint: mk(num(mt[k]), p, pk), oth: mk(num(ot[k]), p, pk),
    prod: p, picks: pk, cost, totPick: pp(cost, p, pk), perM: p > 0 ? cost / p : 0, n: k === 'A' ? c.A : c.B,
  });
  const groups = makeXGROUPS(c).map((g) => ({ ...g, prod: pv(g.prod), picks: kv(g.pick) }));
  const nL = c.T || 126, nD = num(I.days) || 1;
  return {
    ...I, ab: true, eAll, elecTotal, unitsTotal, shared, elecA, elecB, prodA, prodB, totalProd, picksA, picksB, totalPicks,
    salT, storeT, maintT, otherT, salary: sal, stores: st, maint: mt, other: ot, coreTotal, costA, costB, groups,
    looms: { A: c.A, B: c.B, total: nL },
    costPerM: totalProd > 0 ? coreTotal / totalProd : 0,
    costPerPick: totalProd > 0 && totalPicks > 0 ? coreTotal / totalProd / totalPicks : 0,
    costPerMcDay: coreTotal / nD / nL,
    prodPerMcDay: totalProd / nD / nL,
    shareA: coreTotal > 0 ? (costA / coreTotal) * 100 : 0,
    shareB: coreTotal > 0 ? (costB / coreTotal) * 100 : 0,
    prodShareA: totalProd > 0 ? (prodA / totalProd) * 100 : 0,
    prodShareB: totalProd > 0 ? (prodB / totalProd) * 100 : 0,
    unitsPerM: totalProd > 0 ? unitsTotal / totalProd : 0,
    salPerM: totalProd > 0 ? salT / totalProd : 0,
    storePerM: totalProd > 0 ? storeT / totalProd : 0,
    A: sec('A', elecA, costA, prodA, picksA),
    B: sec('B', elecB, costB, prodB, picksB),
    T: {
      k: 'T', elec: mk(elecTotal, totalProd, totalPicks), sal: mk(salT, totalProd, totalPicks), store: mk(storeT, totalProd, totalPicks),
      maint: mk(maintT, totalProd, totalPicks), oth: mk(otherT, totalProd, totalPicks), prod: totalProd, picks: totalPicks,
      cost: coreTotal, totPick: pp(coreTotal, totalProd, totalPicks), perM: totalProd > 0 ? coreTotal / totalProd : 0, n: nL,
    },
  };
}

/* ------------------------------------------------------------------ */
/*  ERP data -> artifact "exp" (one month of day-wise inputs)          */
/* ------------------------------------------------------------------ */
function groupPick(g) {
  if (!g) return 0;
  const m = num(g.mtr), w = num(g.weighted_picks);
  return num(g.avg_picks) || (m > 0 && w > 0 ? w / m : 0);
}
/** day-wise production rows from the production feed (fallback: electricity basis) */
function prodRowsOf(d) {
  const out = {};
  (Array.isArray(d.production_daily) ? d.production_daily : []).forEach((r) => {
    const ymd = Number(r && r.date_ymd);
    const g = (r && r.groups) || {};
    if (!ymd) return;
    out[ymd] = {
      ymd, d: dayLabel(ymd),
      mwRapier: num(g.mw_mtr), sudRapier: num(g.sud_190_mtr), sud230: num(g.sud_230_mtr), wjet: num(g.waterjet_mtr),
      pk: { mw: num(g.mw_avg_picks), sud: num(g.sud_190_avg_picks), sud230: num(g.sud_230_avg_picks), wjet: num(g.waterjet_avg_picks) },
    };
  });
  (Array.isArray(d.electricity_daily) ? d.electricity_daily : []).forEach((r) => {
    const ymd = Number(r && r.date_ymd);
    const g = (r && r.production_basis && r.production_basis.groups) || {};
    if (!ymd || out[ymd] || !Object.keys(g).length) return;
    out[ymd] = {
      ymd, d: dayLabel(ymd),
      mwRapier: num(g.mw && g.mw.mtr), sudRapier: num(g.sud_190 && g.sud_190.mtr), sud230: num(g.sud_230 && g.sud_230.mtr), wjet: num(g.waterjet && g.waterjet.mtr),
      pk: { mw: groupPick(g.mw), sud: groupPick(g.sud_190), sud230: groupPick(g.sud_230), wjet: groupPick(g.waterjet) },
    };
  });
  return Object.values(out).sort((a, b) => a.ymd - b.ymd);
}

export function buildExp(mEntry, d, settings) {
  const counts = machineCounts(d);
  const st = settings || {};
  const isSet = (v) => v !== undefined && v !== null && String(v).trim() !== '' && Number.isFinite(Number(v));
  const erp = { rate: num(d.unit_rate), days: num(d.days), storeA: num(d.section_a_stores), storeB: num(d.section_b_stores) };

  const dailyUnits = (Array.isArray(d.electricity_daily) ? d.electricity_daily : [])
    .filter((r) => r && r.entry_exists !== false)
    .map((r) => ({
      ymd: Number(r.date_ymd), d: dayLabel(r.date_ymd), rate: num(r.unit_rate),
      mwLooms: num(r.mw_rapier_looms), mwLuwa: num(r.mw_rapier_luwa), sudLooms: num(r.sud_190_looms),
      sud230Looms: num(r.sud_230_looms), sudLuwa: num(r.sip_rapier_luwa), wjetLooms: num(r.sip_waterjet_looms),
      warping: num(r.warping_shared), misc: num(r.misc_shared),
    }))
    .sort((a, b) => a.ymd - b.ymd);

  const trend = Array.isArray(d.expense_daily_trend) ? d.expense_daily_trend : [];
  const dailySalary = trend
    .filter((t) => t && (t.section_a_salary !== null && t.section_a_salary !== undefined || t.section_b_salary !== null && t.section_b_salary !== undefined || t.salary_entry_exists))
    .map((t) => ({ ymd: Number(t.date_ymd), d: dayLabel(t.date_ymd), A: num(t.section_a_salary), B: num(t.section_b_salary) }))
    .filter((r) => r.A !== 0 || r.B !== 0)
    .sort((a, b) => a.ymd - b.ymd);

  const rwc = (rows) => (Array.isArray(rows) ? rows : [])
    .map((x) => ({
      ymd: Number(x.date_ymd || x.entry_date), d: dayLabel(x.date_ymd || x.entry_date),
      A: num(x.section_a_amount), B: num(x.section_b_amount), common: num(x.common_amount), saved: true,
    }))
    .filter((r) => r.ymd)
    .sort((a, b) => a.ymd - b.ymd);

  const g = d.section_groups || {};
  const monthProd = {
    prod: { mwRapier: num(g.mw && g.mw.mtr), sudRapier: num(g.sud_190 && g.sud_190.mtr), sud230: num(g.sud_230 && g.sud_230.mtr), wjet: num(g.waterjet && g.waterjet.mtr) },
    picks: { mw: groupPick(g.mw), sud: groupPick(g.sud_190), sud230: groupPick(g.sud_230), wjet: groupPick(g.waterjet) },
  };

  return {
    key: mEntry.key,
    cur: `${mEntry.calYear}-${String(mEntry.calMonth + 1).padStart(2, '0')}`,
    label: `${XMON[mEntry.calMonth]} '${String(mEntry.calYear % 100).padStart(2, '0')}`,
    yearMonth: { yearno: mEntry.yearno, monthno: mEntry.monthno, calYear: mEntry.calYear, calMonth: mEntry.calMonth },
    counts,
    erp,
    rate: isSet(st.rate) ? Number(st.rate) : erp.rate,
    rateEdited: isSet(st.rate) && Math.abs(Number(st.rate) - erp.rate) > 1e-9,
    days: isSet(st.days) ? Number(st.days) : erp.days,
    stores: { A: isSet(st.storeA) ? Number(st.storeA) : erp.storeA, B: isSet(st.storeB) ? Number(st.storeB) : erp.storeB },
    settings: st,
    dailyUnits,
    dailySalary,
    dailyMaint: rwc(d.maintenance_daily),
    dailyOther: rwc(d.other_daily),
    dailyProd: prodRowsOf(d),
    monthProd,
    salaryErp: { A: num(d.section_a_salary), B: num(d.section_b_salary) },
  };
}

/** artifact xCurrent: month figures of the ongoing month from its day-wise inputs */
export function xCurrent(exp) {
  const eAll = {};
  XUKEYS.forEach((k) => (eAll[k] = 0));
  exp.dailyUnits.forEach((u) => {
    const el = xDayElec(u, exp);
    XUKEYS.forEach((k) => (eAll[k] += el.e(k)));
  });
  let salary = xSumSal(exp.dailySalary);
  if (salary.A + salary.B === 0 && exp.salaryErp.A + exp.salaryErp.B > 0) salary = exp.salaryErp;
  return xCompute({
    key: exp.cur, label: exp.label, rate: exp.rate, days: exp.days, counts: exp.counts,
    units: xSumUnits(exp.dailyUnits), eAll, salary, stores: exp.stores,
    prod: exp.monthProd.prod, picks: exp.monthProd.picks,
    maint: xAllocRWC(xSumRWC(exp.dailyMaint), exp.counts),
    other: xAllocRWC(xSumRWC(exp.dailyOther), exp.counts),
  });
}

/**
 * Months before Section A/B (ERP still books Rapier / Waterjet): only the
 * ERP totals are real, so A/B costs stay empty ("—") instead of invented.
 */
export function legacyMonth(mEntry, d) {
  const counts = machineCounts(d);
  const g = d.section_groups || {};
  const prod = { mwRapier: num(g.mw && g.mw.mtr), sudRapier: num(g.sud_190 && g.sud_190.mtr), sud230: num(g.sud_230 && g.sud_230.mtr), wjet: num(g.waterjet && g.waterjet.mtr) };
  const picks = { mw: groupPick(g.mw), sud: groupPick(g.sud_190), sud230: groupPick(g.sud_230), wjet: groupPick(g.waterjet) };
  const units = xSumUnits((Array.isArray(d.electricity_daily) ? d.electricity_daily : []).map((r) => ({
    mwLooms: r.mw_rapier_looms, mwLuwa: r.mw_rapier_luwa, sudLooms: r.sud_190_looms, sud230Looms: r.sud_230_looms,
    sudLuwa: r.sip_rapier_luwa, wjetLooms: r.sip_waterjet_looms, warping: r.warping_shared, misc: r.misc_shared,
  })));
  const prodA = num(prod.wjet) + num(prod.sud230), prodB = num(prod.mwRapier) + num(prod.sudRapier);
  const pA = prodA > 0 ? (picks.wjet * prod.wjet + picks.sud230 * prod.sud230) / prodA : 0;
  const pB = prodB > 0 ? (picks.mw * prod.mwRapier + picks.sud * prod.sudRapier) / prodB : 0;
  const totalProd = num(d.prod_total) || prodA + prodB;
  const coreTotal = num(d.total);
  const totalPicks = num(d.avg_pick_tot);
  const unitsTotal = num(d.kwh_total) || XUKEYS.reduce((s, k) => s + units[k], 0);
  const salT = num(d.sal_total), storeT = num(d.store_total), elecTotal = num(d.elec_total);
  const maintT = num(d.maintenance_total), otherT = num(d.other_total);
  const nL = counts.T, nD = num(d.days) || 1;
  const none = { amt: null, perM: null, perPick: null };
  const blankSec = (k, p, pk) => ({ k, elec: none, sal: none, store: none, maint: none, oth: none, prod: p, picks: pk, cost: null, totPick: null, n: k === 'A' ? counts.A : counts.B });
  const mk = (a) => ({ amt: a, perM: totalProd > 0 ? a / totalProd : 0, perPick: totalProd > 0 && totalPicks > 0 ? a / totalProd / totalPicks : 0 });
  return {
    key: `${mEntry.calYear}-${String(mEntry.calMonth + 1).padStart(2, '0')}`,
    label: `${XMON[mEntry.calMonth]} '${String(mEntry.calYear % 100).padStart(2, '0')}`,
    ab: false, counts, rate: num(d.unit_rate), days: num(d.days), units, prod, picks,
    looms: { A: counts.A, B: counts.B, total: nL },
    groups: makeXGROUPS(counts).map((gr) => ({ ...gr, prod: num(prod[gr.prod]), picks: num(picks[gr.pick]) })),
    elecTotal, salT, storeT, maintT, otherT, coreTotal, unitsTotal, totalProd, totalPicks,
    prodA, prodB, picksA: pA, picksB: pB, costA: null, costB: null, shareA: null, shareB: null,
    // ERP's own split for these months (Rapier / Waterjet division), as the old report showed
    rapierCost: num(d.total_rapier), wjetCost: num(d.total_wjet), rapierPct: num(d.rapier_pct), wjetPct: num(d.wjet_pct),
    salary: { A: null, B: null }, stores: { A: null, B: null }, maint: { A: null, B: null }, other: { A: null, B: null },
    costPerPick: num(d.cpp_total), costPerM: totalProd > 0 ? coreTotal / totalProd : 0,
    costPerMcDay: num(d.cpmc) || coreTotal / nD / nL,
    prodPerMcDay: num(d.production_per_machine_day) || totalProd / nD / nL,
    prodShareA: totalProd > 0 ? (prodA / totalProd) * 100 : 0, prodShareB: totalProd > 0 ? (prodB / totalProd) * 100 : 0,
    unitsPerM: totalProd > 0 ? unitsTotal / totalProd : 0, salPerM: totalProd > 0 ? salT / totalProd : 0, storePerM: totalProd > 0 ? storeT / totalProd : 0,
    A: blankSec('A', prodA, pA), B: blankSec('B', prodB, pB),
    T: { k: 'T', elec: mk(elecTotal), sal: mk(salT), store: mk(storeT), maint: mk(maintT), oth: mk(otherT), prod: totalProd, picks: totalPicks, cost: coreTotal, totPick: num(d.cpp_total), n: nL },
  };
}

/** A/B month that is not the ongoing one (closed / earlier A/B months) */
export function abMonth(mEntry, d) {
  return xCurrent(buildExp(mEntry, d, null));
}

/* ------------------------------------------------------------------ */
/*  Day-wise series (artifact xDailySeries)                            */
/* ------------------------------------------------------------------ */
export function xDailySeries(exp) {
  const c = exp.counts;
  const rows = [];
  const prodBy = Object.fromEntries((exp.dailyProd || []).map((r) => [r.d, r]));
  const salBy = Object.fromEntries((exp.dailySalary || []).map((r) => [r.d, r]));
  const mtBy = Object.fromEntries((exp.dailyMaint || []).map((r) => [r.d, r]));
  const otBy = Object.fromEntries((exp.dailyOther || []).map((r) => [r.d, r]));
  const tot = { A: 0, B: 0 };
  (exp.dailyProd || []).forEach((r) => { const p = xDayProd(r); tot.A += p.A; tot.B += p.B; });
  (exp.dailyUnits || []).forEach((u) => {
    const p = xDayProd(prodBy[u.d]);
    const el = xDayElec(u, exp);
    const sal = salBy[u.d] || {};
    const mt = xAllocRWC(xSumRWC([mtBy[u.d] || {}]), c), ot = xAllocRWC(xSumRWC([otBy[u.d] || {}]), c);
    const stA = tot.A > 0 ? (num(exp.stores.A) * p.A) / tot.A : 0, stB = tot.B > 0 ? (num(exp.stores.B) * p.B) / tot.B : 0;
    const costA = el.A + num(sal.A) + mt.A + ot.A + stA, costB = el.B + num(sal.B) + mt.B + ot.B + stB;
    const pkT = p.T > 0 ? (p.pkA * p.A + p.pkB * p.B) / p.T : 0;
    const cpp = (cc, pr, k) => (pr > 0 && k > 0 ? cc / pr / k : 0);
    const util = {};
    XUKEYS.forEach((k) => {
      const gk = XUPROD[k];
      const pr = gk === 'mw' ? p.mw : gk === 'sud' ? p.sud : gk === 'sud230' ? p.s2 : gk === 'wjet' ? p.wj : p.T;
      const kk = gk === 'mw' ? num(p.pk.mw) : gk === 'sud' ? num(p.pk.sud) : gk === 'sud230' ? num(p.pk.sud230) : gk === 'wjet' ? num(p.pk.wjet) : pkT;
      util[k] = { units: num(u[k]), cost: el.e(k), prod: pr, picks: kk, perM: pr > 0 ? el.e(k) / pr : 0, perPick: cpp(el.e(k), pr, kk) };
    });
    const uT = XUKEYS.reduce((a, k) => a + num(u[k]), 0), cT = XUKEYS.reduce((a, k) => a + el.e(k), 0);
    util.total = { units: uT, cost: cT, prod: p.T, picks: pkT, perM: p.T > 0 ? cT / p.T : 0, perPick: cpp(cT, p.T, pkT) };
    rows.push({
      d: u.d, ymd: u.ymd, rate: el.rate,
      prod: { A: p.A, B: p.B, T: p.T },
      cost: { A: costA, B: costB, T: costA + costB },
      elec: { A: el.A, B: el.B, T: el.A + el.B },
      picks: { A: p.pkA, B: p.pkB, T: pkT },
      cpp: { A: cpp(costA, p.A, p.pkA), B: cpp(costB, p.B, p.pkB), T: cpp(costA + costB, p.T, pkT) },
      util,
    });
  });
  const avg = (k) => {
    const cc = rows.reduce((a, r) => a + r.cost[k], 0), pm = rows.reduce((a, r) => a + r.prod[k] * r.picks[k], 0);
    return pm > 0 ? cc / pm : 0;
  };
  const upk = (k) => {
    const cc = rows.reduce((a, r) => a + r.util[k].cost, 0), pm = rows.reduce((a, r) => a + r.util[k].prod * r.util[k].picks, 0);
    return pm > 0 ? cc / pm : 0;
  };
  return { rows, avg: { A: avg('A'), B: avg('B'), T: avg('T') }, upk: Object.fromEntries(XUALL.map((k) => [k, upk(k)])) };
}

/* ------------------------------------------------------------------ */
/*  Utility per meter (artifact xUtilMeters)                           */
/* ------------------------------------------------------------------ */
export function xUtilMeters(mo) {
  const XU = makeXU_METERS(mo.counts);
  const u = mo.units || {}, P = mo.prod || {}, K = mo.picks || {};
  const pv = (k) => num(P[k]), kv = (k) => num(K[k]);
  const prodAll = pv('mwRapier') + pv('sudRapier') + pv('sud230') + pv('wjet');
  const pmAll = pv('mwRapier') * kv('mw') + pv('sudRapier') * kv('sud') + pv('sud230') * kv('sud230') + pv('wjet') * kv('wjet');
  const ppiAll = prodAll > 0 ? pmAll / prodAll : 0;
  const unitsAll = XUKEYS.reduce((a, k) => a + num(u[k]), 0);
  // ₹ per meter: ongoing month = Σ day kWh × day rate; other months = kWh × month rate
  const eAll = mo.eAll || null;
  const costOf = (k, units) => (eAll ? (k === 'total' ? XUKEYS.reduce((a, x) => a + num(eAll[x]), 0) : num(eAll[k])) : units * num(mo.rate));
  // No 230 cm sub-meter reading in the month (months before it was installed):
  // the S. Rapier meter then fed all 48 S. Rapier looms, so it is divided by
  // the 190 + 230 production instead of leaving the 230 looms' metres out.
  const no230 = num(u.sud230Looms) === 0 && pv('sud230') > 0;
  const sudAllProd = pv('sudRapier') + pv('sud230');
  const sudAllPpi = sudAllProd > 0 ? (pv('sudRapier') * kv('sud') + pv('sud230') * kv('sud230')) / sudAllProd : 0;
  const rows = Object.keys(XU).map((k) => {
    const dd = XU[k];
    const units = dd.total ? unitsAll : num(u[k]);
    const cost = costOf(k, units);
    const allSud = no230 && dd.prod === 'sudRapier';
    const prod = dd.prod === 'all' ? prodAll : allSud ? sudAllProd : pv(dd.prod);
    const ppi = dd.pick === 'all' ? ppiAll : allSud ? sudAllPpi : kv(dd.pick);
    const picks = prod * ppi;
    return { ...dd, units, cost, prod, ppi, picks, perM: prod > 0 ? cost / prod : 0, perPick: picks > 0 ? cost / picks : 0 };
  });
  const byK = Object.fromEntries(rows.map((r) => [r.k, r]));
  return { rows, byK, rate: num(mo.rate), unitsAll, prodAll, ppiAll, othersUnits: unitsAll - num(u.misc) };
}

/** Day-wise electricity ₹ per metre for each section (artifact xUtilDaily) */
export function xUtilDaily(exp) {
  const prodBy = Object.fromEntries((exp.dailyProd || []).map((r) => [r.d, r]));
  const acc = { A: { c: 0, m: 0 }, B: { c: 0, m: 0 } };
  const rows = (exp.dailyUnits || []).map((u) => {
    const el = xDayElec(u, exp), p = xDayProd(prodBy[u.d]);
    acc.A.c += el.A; acc.A.m += p.A; acc.B.c += el.B; acc.B.m += p.B;
    return { d: String(u.d).slice(0, 2), full: u.d, A: p.A > 0 ? +(el.A / p.A).toFixed(3) : null, B: p.B > 0 ? +(el.B / p.B).toFixed(3) : null };
  });
  return { rows, avg: { A: acc.A.m > 0 ? acc.A.c / acc.A.m : 0, B: acc.B.m > 0 ? acc.B.c / acc.B.m : 0 } };
}

/* ------------------------------------------------------------------ */
/*  Section conversion rates (artifact xSectionMTD)                    */
/* ------------------------------------------------------------------ */
export function xSectionMTD(exp) {
  const c = exp.counts;
  const prodBy = Object.fromEntries((exp.dailyProd || []).map((r) => [r.d, r]));
  const salBy = Object.fromEntries((exp.dailySalary || []).map((r) => [r.d, r]));
  const mtBy = Object.fromEntries((exp.dailyMaint || []).map((r) => [r.d, r]));
  const otBy = Object.fromEntries((exp.dailyOther || []).map((r) => [r.d, r]));
  const tot = { A: 0, B: 0 };
  (exp.dailyProd || []).forEach((r) => { const p = xDayProd(r); tot.A += p.A; tot.B += p.B; });
  const acc = { A: { conv: 0, ovh: 0, pm: 0, m: 0, days: 0 }, B: { conv: 0, ovh: 0, pm: 0, m: 0, days: 0 } };
  let upto = null;
  (exp.dailyUnits || []).forEach((u) => {
    const p = xDayProd(prodBy[u.d]);
    const el = xDayElec(u, exp);
    const sal = salBy[u.d] || {};
    const mt = xAllocRWC(xSumRWC([mtBy[u.d] || {}]), c), ot = xAllocRWC(xSumRWC([otBy[u.d] || {}]), c);
    const stA = tot.A > 0 ? (num(exp.stores.A) * p.A) / tot.A : 0, stB = tot.B > 0 ? (num(exp.stores.B) * p.B) / tot.B : 0;
    acc.A.conv += el.A + num(sal.A); acc.A.ovh += stA + mt.A + ot.A; acc.A.pm += p.A * p.pkA; acc.A.m += p.A; acc.A.days++;
    acc.B.conv += el.B + num(sal.B); acc.B.ovh += stB + mt.B + ot.B; acc.B.pm += p.B * p.pkB; acc.B.m += p.B; acc.B.days++;
    const dk = ymdIso(u.ymd);
    if (dk && (!upto || dk > upto)) upto = dk;
  });
  const fin = (k) => ({
    conv: acc[k].pm > 0 ? acc[k].conv / acc[k].pm : 0, ovh: acc[k].pm > 0 ? acc[k].ovh / acc[k].pm : 0,
    convAmt: acc[k].conv, ovhAmt: acc[k].ovh, pm: acc[k].pm, metres: acc[k].m, picks: acc[k].m > 0 ? acc[k].pm / acc[k].m : 0, days: acc[k].days,
  });
  return { month: exp.cur, upto, A: fin('A'), B: fin('B'), live: true };
}
/** closed / earlier month: full-month section rates from its month figures */
export function xClosedRates(mo) {
  if (!mo || !mo.ab) return null;
  const sec = (S) => ({ conv: S.elec.perPick + S.sal.perPick, ovh: S.store.perPick + S.maint.perPick + S.oth.perPick, picks: S.picks, metres: S.prod });
  return { month: mo.key, A: sec(mo.A), B: sec(mo.B), live: false, closed: true, label: mo.label };
}

/* ------------------------------------------------------------------ */
/*  Day labels for the input modules                                   */
/* ------------------------------------------------------------------ */
export function nextYmd(rows, exp) {
  const last = rows && rows.length ? rows[rows.length - 1].ymd : null;
  const y = exp.yearMonth.calYear, m = exp.yearMonth.calMonth;
  const dim = new Date(y, m + 1, 0).getDate();
  if (!last) return Number(`${y}${String(m + 1).padStart(2, '0')}01`);
  const day = Number(String(last).slice(6, 8)) + 1;
  if (day > dim) return null;
  return Number(`${y}${String(m + 1).padStart(2, '0')}${String(day).padStart(2, '0')}`);
}
