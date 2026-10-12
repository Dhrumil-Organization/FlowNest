/**
 * Section-wise electricity (+ stores) cost per pick — senior's rules (Oct 2026).
 *
 * Every electricity sub-meter stays separate and is costed on its OWN production:
 *
 *   1 MW Rapier looms   = MW loom kWh      × rate ÷ (MW Rapier picks)
 *   2 MW Luwa           = MW Luwa kWh      × rate ÷ (MW Rapier picks)
 *   3 Süd Rapier 190    = Süd 190 loom kWh × rate ÷ (Süd 190 picks)
 *   4 Süd Luwa          = Süd Luwa kWh     × rate ÷ (Süd 190 picks)
 *   5 Süd Rapier 230    = Süd 230 kWh      × rate ÷ (Süd 230 picks)
 *   6 Waterjet          = Waterjet kWh     × rate ÷ (Waterjet picks)
 *   7 Warping           = Warping kWh      × rate ÷ (total picks)
 *   8 Total electricity = Total kWh        × rate ÷ (total picks)
 *   9 Miscellaneous     = Total kWh − sum of all meters above (1–7)
 *
 *   picks = production metres × average picks  (= Σ checked metres × design PPI, from the backend)
 *   total picks = MW + Süd 190 + Süd 230 + Waterjet  (so the average picks are production-weighted)
 *
 *   Section A = Waterjet + Süd 230 electricity + Store-Waterjet + 1/3 (Warping + Misc)
 *               ÷ (Waterjet + Süd 230 picks)
 *   Section B = MW + MW Luwa + Süd 190 + Süd Luwa electricity + Store-Rapier + 2/3 (Warping + Misc)
 *               ÷ (MW Rapier + Süd 190 picks)
 *
 * Each DAY is calculated on its own: that day's kWh, that day's unit rate, that day's
 * production and that day's picks. A month figure = Σ ₹ ÷ Σ picks of its days.
 */

const n = (v) => {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
};

/* ---------------------------------------------------------------------------
 * Section labels — exactly as the ERP Designing expense report (artifact),
 * with the live machine counts (fallback 30 / 10 / 48 / 38 = 126 machines).
 * ------------------------------------------------------------------------- */
const cnt = (v, fb) => {
  const x = Number(v);
  return Number.isFinite(x) && x > 0 ? x : fb;
};
export function secCounts(d) {
  const c = d?.section_machine_counts || {};
  const wj = cnt(c.waterjet, 30);
  const s230 = cnt(c.sud_rapier_230, 10);
  const mw = cnt(c.mw_rapier, 48);
  const s190 = cnt(c.sud_rapier_190, 38);
  return { wj, s230, mw, s190, A: wj + s230, B: mw + s190, T: wj + s230 + mw + s190 };
}
/** "A — Waterjet (30) + S. Rapier (230 cm) (10)" / "B — Rapier (190 cm): 86 machines · M Weaves: 48 · S. Rapier: 38" */
export function secLbl(d, k) {
  const c = secCounts(d);
  if (k === 'A') return `A — Waterjet (${c.wj}) + S. Rapier (230 cm) (${c.s230})`;
  if (k === 'B') return `B — Rapier (190 cm): ${c.B} machines · M Weaves: ${c.mw} · S. Rapier: ${c.s190}`;
  return `Total · A + B · ${c.T} machines`;
}
/** machine ranges line under the section name */
export function secGroups(d, k) {
  const c = secCounts(d);
  if (k === 'A') return `Waterjet ${c.wj} (W01–W30) · S. Rapier 230 cm ${c.s230} (R75–R84)`;
  if (k === 'B') return `M Weaves ${c.mw} (R01–R48) · S. Rapier 190 cm ${c.s190} (R49–R74, R85–R96)`;
  return `Section A ${c.A} + Section B ${c.B}`;
}
export const SEC_COLOR = { A: '#185FA5', B: '#534AB7', T: '#0D1B2A' };

export const SHARE_A = 1 / 3;
export const SHARE_B = 2 / 3;

/** The 9 meter rows, in the senior's order. */
export const SENIOR_METERS = [
  { key: 'mw_looms', no: 1, label: 'MW Rapier', detail: '48 looms · R01–R48', basis: 'mw', section: 'B' },
  { key: 'mw_luwa', no: 2, label: 'MW Luwa', detail: 'humidification · on M Weaves production', basis: 'mw', section: 'B' },
  { key: 'sud190_looms', no: 3, label: 'S. Rapier (190 cm)', detail: '38 looms · R49–R74, R85–R96', basis: 'sud_190', section: 'B' },
  { key: 'sud_luwa', no: 4, label: 'S. Rapier Luwa', detail: 'humidification · on 190 cm production', basis: 'sud_190', section: 'B' },
  { key: 'sud230_looms', no: 5, label: 'S. Rapier (230 cm)', detail: '10 looms · R75–R84 · own sub-meter', basis: 'sud_230', section: 'A' },
  { key: 'wjet_looms', no: 6, label: 'Waterjet', detail: '30 looms · W01–W30', basis: 'waterjet', section: 'A' },
  { key: 'warping', no: 7, label: 'Warping', detail: 'on total production · weighted PPI', basis: 'total', section: 'A+B' },
  { key: 'total', no: 8, label: 'Total electricity', detail: 'all meters · total production · weighted PPI', basis: 'total', section: 'A+B' },
  { key: 'misc', no: 9, label: 'Miscellaneous', detail: 'total − all meters above · on total production', basis: 'total', section: 'A+B' },
];

/** Meter cards, grouped like the artifact (M Weaves · S. Rapier · Waterjet · Shared meters). */
export const SENIOR_CARDS = [
  { k: 'mw', lbl: 'M Weaves', sub: '48 looms', sec: 'B', keys: ['mw_looms', 'mw_luwa'] },
  { k: 'sud', lbl: 'S. Rapier', sub: '38 + 10 looms', sec: 'B', keys: ['sud190_looms', 'sud_luwa', 'sud230_looms'] },
  { k: 'wjet', lbl: 'Waterjet', sub: '30 looms', sec: 'A', keys: ['wjet_looms'] },
  { k: 'shared', lbl: 'Shared meters', sub: 'plant-wide', sec: 'A+B', keys: ['warping', 'misc'] },
];

export const SENIOR_SECTIONS = [
  { key: 'secA', tag: 'A', color: '#185FA5' },
  { key: 'secB', tag: 'B', color: '#534AB7' },
];

const groupOf = (row, key) =>
  row?.production_basis?.groups?.[key] || row?.section_ab?.production_basis?.groups?.[key] || {};

const mtrOf = (row, key) => n(groupOf(row, key)?.mtr ?? groupOf(row, key)?.production_mtr);

const picksOf = (row, key) => {
  const g = groupOf(row, key);
  const direct = n(g?.weighted_picks);
  return direct || mtrOf(row, key) * n(g?.avg_picks);
};

/** Stores for one day: Section A = Waterjet store, Section B = Rapier store. */
export function storeOfDay(expenseDay) {
  if (!expenseDay) return { A: 0, B: 0 };
  const secA = n(expenseDay.section_a_stores_allocated);
  const secB = n(expenseDay.section_b_stores_allocated);
  if (secA || secB) return { A: secA, B: secB };
  return { A: n(expenseDay.waterjet_stores_allocated), B: n(expenseDay.rapier_stores_allocated) };
}

/**
 * One day, fully independent.
 * @param row        electricity_daily row (raw meters, unit_rate, production_basis)
 * @param expenseDay expense_daily row of the same date (stores), optional
 */
export function seniorDay(row, expenseDay) {
  const rate = n(row?.unit_rate);

  // Meter readings (kWh) — never merged before costing.
  const mw = n(row?.mw_rapier_looms);
  const mwLuwa = n(row?.mw_rapier_luwa);
  const sud230 = n(row?.sud_230_looms);
  const sipLooms = n(row?.sip_rapier_looms);
  const sud190 = row?.sud_190_looms != null ? n(row.sud_190_looms) : Math.max(0, sipLooms - sud230);
  const sudLuwa = n(row?.sip_rapier_luwa);
  const wjet = n(row?.sip_waterjet_looms);
  const warping = n(row?.warping_shared);
  const meters = mw + mwLuwa + sud190 + sudLuwa + sud230 + wjet + warping;
  const reported = n(row?.reported_total_kwh) || n(row?.total_kwh);
  const total = reported > 0 ? reported : meters + n(row?.misc_shared);
  const miscRaw = total - meters;
  const misc = Math.max(0, miscRaw);

  // Production (m) and picks (m × avg picks) per group, for THIS day.
  const prod = {
    mw: mtrOf(row, 'mw'),
    sud_190: mtrOf(row, 'sud_190'),
    sud_230: mtrOf(row, 'sud_230'),
    waterjet: mtrOf(row, 'waterjet'),
  };
  const picks = {
    mw: picksOf(row, 'mw'),
    sud_190: picksOf(row, 'sud_190'),
    sud_230: picksOf(row, 'sud_230'),
    waterjet: picksOf(row, 'waterjet'),
  };
  prod.total = prod.mw + prod.sud_190 + prod.sud_230 + prod.waterjet;
  picks.total = picks.mw + picks.sud_190 + picks.sud_230 + picks.waterjet;

  const kwh = {
    mw_looms: mw,
    mw_luwa: mwLuwa,
    sud190_looms: sud190,
    sud_luwa: sudLuwa,
    sud230_looms: sud230,
    wjet_looms: wjet,
    warping,
    total,
    misc,
  };

  const meter = {};
  SENIOR_METERS.forEach((m) => {
    const amount = kwh[m.key] * rate;
    const p = picks[m.basis] || 0;
    meter[m.key] = {
      kwh: kwh[m.key],
      amount,
      prod: prod[m.basis] || 0,
      picks: p,
      cpp: p > 0 ? amount / p : null,
    };
  });

  const store = storeOfDay(expenseDay);
  const shared = (warping + misc) * rate;

  const secAElec = (wjet + sud230) * rate + shared * SHARE_A;
  const secBElec = (mw + mwLuwa + sud190 + sudLuwa) * rate + shared * SHARE_B;
  const secAPicks = picks.waterjet + picks.sud_230;
  const secBPicks = picks.mw + picks.sud_190;
  const secAProd = prod.waterjet + prod.sud_230;
  const secBProd = prod.mw + prod.sud_190;

  const section = {
    secA: {
      elec: secAElec,
      store: store.A,
      amount: secAElec + store.A,
      prod: secAProd,
      picks: secAPicks,
      cpp: secAPicks > 0 ? (secAElec + store.A) / secAPicks : null,
      elecCpp: secAPicks > 0 ? secAElec / secAPicks : null,
    },
    secB: {
      elec: secBElec,
      store: store.B,
      amount: secBElec + store.B,
      prod: secBProd,
      picks: secBPicks,
      cpp: secBPicks > 0 ? (secBElec + store.B) / secBPicks : null,
      elecCpp: secBPicks > 0 ? secBElec / secBPicks : null,
    },
  };

  return {
    date_ymd: Number(row?.date_ymd || 0),
    day: row?.day ?? String(row?.date_ymd || '').slice(-2),
    rate,
    kwh,
    miscRaw,
    miscValid: miscRaw >= -0.01,
    prod,
    picks,
    meter,
    section,
  };
}

/** All days of a month + month totals (Σ ₹ ÷ Σ picks). */
export function seniorMonth(electricityDaily, expenseDaily) {
  const expenseByDate = {};
  (Array.isArray(expenseDaily) ? expenseDaily : []).forEach((e) => {
    expenseByDate[Number(e?.date_ymd || 0)] = e;
  });

  const days = (Array.isArray(electricityDaily) ? electricityDaily : [])
    .filter((r) => r && r.entry_exists !== false)
    .map((r) => seniorDay(r, expenseByDate[Number(r?.date_ymd || 0)]))
    .sort((a, b) => a.date_ymd - b.date_ymd);

  const sumOf = (fn) => days.reduce((t, d) => t + n(fn(d)), 0);

  const meter = {};
  SENIOR_METERS.forEach((m) => {
    const kwh = sumOf((d) => d.meter[m.key].kwh);
    const amount = sumOf((d) => d.meter[m.key].amount);
    const prod = sumOf((d) => d.meter[m.key].prod);
    const picks = sumOf((d) => d.meter[m.key].picks);
    meter[m.key] = {
      kwh,
      amount,
      prod,
      picks,
      avgPicks: prod > 0 ? picks / prod : 0,
      cpp: picks > 0 ? amount / picks : null,
      perM: prod > 0 ? amount / prod : null,
    };
  });

  const section = {};
  ['secA', 'secB'].forEach((k) => {
    const elec = sumOf((d) => d.section[k].elec);
    const store = sumOf((d) => d.section[k].store);
    const prod = sumOf((d) => d.section[k].prod);
    const picks = sumOf((d) => d.section[k].picks);
    section[k] = {
      elec,
      store,
      amount: elec + store,
      prod,
      picks,
      avgPicks: prod > 0 ? picks / prod : 0,
      cpp: picks > 0 ? (elec + store) / picks : null,
      elecCpp: picks > 0 ? elec / picks : null,
    };
  });

  const metersSum = ['mw_looms', 'mw_luwa', 'sud190_looms', 'sud_luwa', 'sud230_looms', 'wjet_looms', 'warping', 'misc']
    .reduce((t, k) => t + meter[k].amount, 0);

  return {
    days,
    meter,
    section,
    check: {
      // Σ of the 8 section-wise meters must equal the total electricity ₹
      metersAmount: metersSum,
      totalAmount: meter.total.amount,
      difference: metersSum - meter.total.amount,
      // A + B electricity must equal total electricity ₹ (nothing lost, nothing double counted)
      sectionsElec: section.secA.elec + section.secB.elec,
      negativeMiscDays: days.filter((d) => !d.miscValid).map((d) => d.date_ymd),
    },
  };
}

/** Daily series for one meter key or a section key, ready for the trend sheet. */
export function seniorSeries(month, key) {
  const isSection = key === 'secA' || key === 'secB';
  return (month?.days || []).map((d) => {
    const x = isSection ? d.section[key] : d.meter[key];
    return {
      date_ymd: d.date_ymd,
      day: d.day,
      rate: d.rate,
      kwh: isSection ? null : x.kwh,
      elec: isSection ? x.elec : x.amount,
      store: isSection ? x.store : 0,
      amount: x.amount,
      prod: x.prod,
      picks: x.picks,
      avgPicks: x.prod > 0 ? x.picks / x.prod : 0,
      cpp: x.cpp,
    };
  });
}
