/**
 * Month settings (artifact "MONTH SETTINGS" card) — editable Unit rate,
 * Working days, Stores Section A, Stores Section B.
 *
 * Editing any value re-derives EVERY dependent number of the month, the same
 * way the ERP Designing artifact recomputes from its settings:
 *
 *   Unit rate  -> every electricity ₹ = kWh × rate (all days use this rate,
 *                 like the artifact's single month rate). kWh, A/B kWh split
 *                 (senior rule: Waterjet + 230 + 1/3 shared -> A, rest -> B)
 *                 are unchanged — only ₹ changes.
 *   Stores A/B -> month store per section; each day's store is re-spread in
 *                 the same proportion the ERP used (or by that day's metres if
 *                 the ERP had no store for that section).
 *   Working days -> cost / machine·day and metres / machine·day.
 *
 * Then section totals, ₹/pick, Total, shares, and the daily trend rows are
 * recomputed from those values. Salary / Maintenance / Other / production /
 * picks are never touched.
 *
 * Nothing is written to the ERP: values are a per-month override kept on this
 * device (AsyncStorage) with a one-tap "ERP values" reset.
 */

export const MONTH_SETTINGS_STORAGE_KEY = 'expense_month_settings_v1';

const n = (v) => {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
};
const isSet = (v) => v !== undefined && v !== null && String(v).trim() !== '' && Number.isFinite(Number(v));
const r2 = (v) => Math.round(v * 100) / 100;

/** ERP (un-edited) values of a month, shown as defaults / reset target. */
export function erpSettingsOf(d) {
  const src = d?.settings_erp || d || {};
  return {
    rate: n(src.unit_rate),
    days: n(src.days),
    storeA: n(src.section_a_stores),
    storeB: n(src.section_b_stores),
  };
}

/** true when the override actually changes something */
export function settingsChanged(d, ov) {
  if (!ov) return false;
  const e = erpSettingsOf(d);
  const diff = (k, tol) => isSet(ov[k]) && Math.abs(Number(ov[k]) - e[k]) > tol;
  return diff('rate', 1e-9) || diff('days', 1e-9) || diff('storeA', 0.004) || diff('storeB', 0.004);
}

/**
 * Returns a NEW month object with the override applied (or `d` itself when
 * there is nothing to apply). Only Section A/B months (from 1 Oct) are
 * editable — older Rapier/Waterjet months stay exactly as the ERP gives them.
 */
export function applyMonthSettings(d, ov) {
  if (!d || d.section_ab_active !== true || !settingsChanged(d, ov)) return d;

  const erp = erpSettingsOf(d);
  const rateOn = isSet(ov.rate) && Math.abs(Number(ov.rate) - erp.rate) > 1e-9;
  const daysOn = isSet(ov.days) && Math.abs(Number(ov.days) - erp.days) > 1e-9;
  const stAOn = isSet(ov.storeA) && Math.abs(Number(ov.storeA) - erp.storeA) > 0.004;
  const stBOn = isSet(ov.storeB) && Math.abs(Number(ov.storeB) - erp.storeB) > 0.004;

  const rate = rateOn ? Math.max(0, Number(ov.rate)) : erp.rate;
  const days = daysOn ? Math.max(0, Number(ov.days)) : erp.days;
  const storeA = stAOn ? Math.max(0, Number(ov.storeA)) : erp.storeA;
  const storeB = stBOn ? Math.max(0, Number(ov.storeB)) : erp.storeB;

  /* ---------------- electricity: per-day rate lookup ---------------- */
  const elecRows = Array.isArray(d.electricity_daily) ? d.electricity_daily : [];
  const dayRate = {};
  elecRows.forEach((row) => {
    const k = Number(row?.date_ymd || 0);
    if (k) dayRate[k] = n(row?.unit_rate) || erp.rate;
  });
  // ₹ for a kWh figure on a given day (falls back to scaling an old ₹ figure)
  const elecFor = (kwh, oldAmount, ymd) => {
    if (!rateOn) return n(oldAmount);
    if (kwh !== undefined && kwh !== null && Number.isFinite(Number(kwh))) return r2(n(kwh) * rate);
    const old = dayRate[Number(ymd)] || erp.rate;
    return old > 0 ? r2(n(oldAmount) * rate / old) : n(oldAmount);
  };

  const electricity_daily = rateOn
    ? elecRows.map((row) => {
        const ab = row?.section_ab || {};
        return {
          ...row,
          unit_rate: rate,
          erp_unit_rate: n(row?.unit_rate),
          amount: r2(n(row?.total_kwh) * rate),
          section_ab: {
            ...ab,
            section_a_amount: r2(n(ab.section_a_kwh) * rate),
            section_b_amount: r2(n(ab.section_b_kwh) * rate),
            total_amount: r2(n(ab.total_kwh) * rate),
          },
        };
      })
    : elecRows;

  /* ---------------- stores: re-spread each day ---------------- */
  const trend = Array.isArray(d.expense_daily_trend) ? d.expense_daily_trend : [];
  const sumMtrA = trend.reduce((t, r) => t + n(r?.section_a_mtr), 0);
  const sumMtrB = trend.reduce((t, r) => t + n(r?.section_b_mtr), 0);
  const storeDay = (oldDay, oldMonth, newMonth, mtr, sumMtr, on) => {
    if (!on) return n(oldDay);
    if (n(oldMonth) > 0) return r2(n(oldDay) * newMonth / n(oldMonth));
    return sumMtr > 0 ? r2(newMonth * n(mtr) / sumMtr) : 0;
  };

  const costPerPick = (cost, mtr, picks) => (n(mtr) > 0 && n(picks) > 0 ? cost / n(mtr) / n(picks) : 0);

  const expense_daily_trend = trend.map((t) => {
    const ymd = t?.date_ymd;
    const eA = elecFor(t?.section_a_electricity_kwh, t?.section_a_electricity, ymd);
    const eB = elecFor(t?.section_b_electricity_kwh, t?.section_b_electricity, ymd);
    const dEA = eA - n(t?.section_a_electricity);
    const dEB = eB - n(t?.section_b_electricity);
    const sA = storeDay(t?.section_a_stores_allocated, erp.storeA, storeA, t?.section_a_mtr, sumMtrA, stAOn);
    const sB = storeDay(t?.section_b_stores_allocated, erp.storeB, storeB, t?.section_b_mtr, sumMtrB, stBOn);
    const dSA = sA - n(t?.section_a_stores_allocated);
    const dSB = sB - n(t?.section_b_stores_allocated);
    const total = n(t?.total_cost) + dEA + dEB + dSA + dSB;
    const out = {
      ...t,
      section_a_electricity: eA,
      section_b_electricity: eB,
      electricity: r2(n(t?.electricity) + dEA + dEB),
      section_a_stores_allocated: sA,
      section_b_stores_allocated: sB,
      section_a_stores_classified_allocated: sA,
      section_b_stores_classified_allocated: sB,
      stores_allocated: r2(n(t?.stores_allocated) + dSA + dSB),
      total_cost: r2(total),
      cost_per_mtr: n(t?.production_mtr) > 0 ? total / n(t.production_mtr) : 0,
      cost_per_pick: costPerPick(total, t?.production_mtr, t?.avg_picks),
    };
    if (t?.section_a_total_cost !== null && t?.section_a_total_cost !== undefined) {
      out.section_a_total_cost = r2(n(t.section_a_total_cost) + dEA + dSA);
    }
    if (t?.section_b_total_cost !== null && t?.section_b_total_cost !== undefined) {
      out.section_b_total_cost = r2(n(t.section_b_total_cost) + dEB + dSB);
    }
    return out;
  });
  const trendBy = Object.fromEntries(expense_daily_trend.map((t) => [Number(t.date_ymd), t]));

  const daily = Array.isArray(d.daily)
    ? d.daily.map((row) => {
        const t = trendBy[Number(row?.date_ymd)];
        if (!t) return row;
        return {
          ...row,
          section_a_electricity: t.section_a_electricity,
          section_b_electricity: t.section_b_electricity,
          section_a_stores: t.section_a_stores_allocated,
          section_b_stores: t.section_b_stores_allocated,
          section_a_total_cost: t.section_a_total_cost ?? row.section_a_total_cost,
          section_b_total_cost: t.section_b_total_cost ?? row.section_b_total_cost,
        };
      })
    : d.daily;

  const utility_daily_trend = rateOn && Array.isArray(d.utility_daily_trend)
    ? d.utility_daily_trend.map((u) => {
        const amount = r2(n(u?.kwh) * rate);
        const mtr = n(u?.production_mtr);
        const pk = n(u?.picks);
        return {
          ...u,
          amount,
          cost_per_mtr: mtr > 0 ? amount / mtr : 0,
          cost_per_pick: mtr > 0 && pk > 0 ? amount / mtr / pk : 0,
        };
      })
    : d.utility_daily_trend;

  /* ---------------- month totals ---------------- */
  const elecA = elecFor(d.section_a_electricity_kwh || null, d.section_a_elec, null);
  const elecB = elecFor(d.section_b_electricity_kwh || null, d.section_b_elec, null);
  const elecT = elecA + elecB;

  const secA = elecA + n(d.section_a_salary) + storeA + n(d.section_a_maintenance) + n(d.section_a_other);
  const secB = elecB + n(d.section_b_salary) + storeB + n(d.section_b_maintenance) + n(d.section_b_other);
  const total = secA + secB;
  const prodT = n(d.prod_total);

  const machinesFallback = n(d.section_machine_counts?.total_section) || n(d.costing_looms) || 126;
  const oldMachineDays = n(d.machine_days);
  const machineDays = daysOn
    ? (erp.days > 0 && oldMachineDays > 0 ? oldMachineDays * days / erp.days : days * machinesFallback)
    : (oldMachineDays > 0 ? oldMachineDays : days * machinesFallback);
  const oldTotal = n(d.total);

  const kwhRow = (k) => n(d[`kwh_${k}`]);
  const amt = (k) => (rateOn ? r2(kwhRow(k) * rate) : n(d[`elec_${k}`]));

  const utility_rates = rateOn && Array.isArray(d.utility_rates)
    ? d.utility_rates.map((u) => {
        const a = r2(n(u?.kwh) * rate);
        const mtr = n(u?.production_mtr_basis);
        const pk = n(u?.picks_basis);
        return {
          ...u,
          amount: a,
          cost_per_mtr: mtr > 0 ? a / mtr : 0,
          cost_per_pick: mtr > 0 && pk > 0 ? a / mtr / pk : 0,
        };
      })
    : d.utility_rates;

  return {
    ...d,
    settings_erp: d.settings_erp || {
      unit_rate: erp.rate,
      days: erp.days,
      section_a_stores: erp.storeA,
      section_b_stores: erp.storeB,
    },
    settings_override: { rate: rateOn, days: daysOn, storeA: stAOn, storeB: stBOn },

    unit_rate: rate,
    days,

    elec_total: elecT,
    section_ab_electricity_total_amount: elecT,
    section_a_elec: elecA,
    section_b_elec: elecB,
    section_a_electricity_amount: elecA,
    section_b_electricity_amount: elecB,
    elec_mw_looms: amt('mw_looms'),
    elec_mw_luwa: amt('mw_luwa'),
    elec_sd_looms: amt('sd_looms'),
    elec_sd_luwa: amt('sd_luwa'),
    elec_wj_looms: amt('wj_looms'),
    elec_warping: amt('warping'),
    elec_misc: amt('misc'),

    section_a_stores: storeA,
    section_b_stores: storeB,
    store_total: storeA + storeB,

    section_a_total: secA,
    section_b_total: secB,
    total,
    section_a_cpp: costPerPick(secA, d.section_a_prod, d.section_a_avg_picks),
    section_b_cpp: costPerPick(secB, d.section_b_prod, d.section_b_avg_picks),
    cpp_total: prodT > 0 && n(d.avg_pick_tot) > 0
      ? total / prodT / n(d.avg_pick_tot)
      : (oldTotal > 0 ? n(d.cpp_total) * total / oldTotal : n(d.cpp_total)),
    section_a_pct: total > 0 ? (secA / total) * 100 : 0,
    section_b_pct: total > 0 ? (secB / total) * 100 : 0,
    per_mtr: prodT > 0 ? total / prodT : 0,
    store_per_mtr: prodT > 0 ? (storeA + storeB) / prodT : 0,

    machine_days: machineDays,
    cpmc: machineDays > 0 ? total / machineDays : 0,
    production_per_machine_day: machineDays > 0 ? prodT / machineDays : 0,

    utility_rates,
    electricity_daily,
    expense_daily_trend,
    utility_daily_trend,
    daily,
    coverage_daily: daily,
  };
}
