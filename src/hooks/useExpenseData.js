// import axios from 'axios';
// import { useCallback, useEffect, useMemo, useState } from 'react';
// import { API_BASE_URL } from '../api/client';

// const monthList = (count = 6) => {
//   const out = [];
//   const now = new Date();
//   for (let i = 0; i < count; i++) {
//     const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
//     const key = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}`;
//     out.push({ key, label: d.toLocaleDateString('en-US',{month:'short'}), shortLabel: d.toLocaleDateString('en-US',{month:'short'}), fullLabel: d.toLocaleDateString('en-US',{month:'long',year:'numeric'}) });
//   }
//   return out;
// };

// export function useExpenseData({ token, apiBase } = {}) {
//   const months = useMemo(() => monthList(6), []);
//   const [states, setStates] = useState(() => Object.fromEntries(months.map(m => [m.key,{status:'loading',data:null,error:null}])));

//   const loadMonth = useCallback(async (month) => {
//     setStates(p => ({...p,[month.key]:{...p[month.key],status:'loading',error:null}}));
//     try {
//       const res = await axios.get(`${apiBase || API_BASE_URL}/api/expense-dashboard`, {
//         headers: { Authorization: `Bearer ${token}`, Accept: 'application/json', 'x-platform': 'mob' },
//         params: { month: month.key },
//       });
//       console.log('API URL NEW LOGIN:', `${apiBase || API_BASE_URL}/api/expense-dashboard`);
//       console.log('expnese response', res);
//       const data = res.data?.response?.data || res.data?.response || res.data?.data || null;
//       setStates(p => ({...p,[month.key]:{status:'done',data,error:null}}));
//     } catch (error) {
//       setStates(p => ({...p,[month.key]:{status:'error',data:null,error}}));
//     }
//   }, [token, apiBase]);

//   const refresh = useCallback(() => { if (token) months.forEach(loadMonth); }, [token,months,loadMonth]);
//   const retryMonth = useCallback((key) => { const m=months.find(x=>x.key===key); if(m) loadMonth(m); }, [months,loadMonth]);
//   useEffect(() => { refresh(); }, [refresh]);
//   const loadedCount = Object.values(states).filter(s => s.status === 'done').length;
//   return { months, states, loadedCount, total: months.length, refresh, retryMonth };
// }
import AsyncStorage from '@/common/utils/compatibleStorage';
import axios from 'axios';
import { useCallback, useEffect, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { fetchExpenseDashboardCard } from '@/src/services/Dashboard/expenseDashboardApi';
import { API_BASE_URL } from '@/src/api/client';
// ── Financial Year Helper ────────────────────────────────────────
// calMonth: 0-indexed JS Date month (0=Jan ... 11=Dec)
// April (3) onwards belongs to the NEW financial year
// e.g. Jun 2026 (m=5, y=2026) → FY 2026-27 → yearno "27"
// e.g. Mar 2026 (m=2, y=2026) → FY 2025-26 → yearno "26"
// Returns the financial-year ENDING year.
//
// Apr 2026–Dec 2026 => FY 2026-27 => "27"
// Jan 2027–Mar 2027 => FY 2026-27 => "27"
// Jan 2026–Mar 2026 => FY 2025-26 => "26"
function getFYYearNo(calMonth, calYear) {
  const fyEndYear = calMonth >= 3 ? calYear + 1 : calYear;

  return String(fyEndYear % 100).padStart(2, '0');
}

// Actual calendar year used only for the displayed month label.
//
// Jul 2026 => "26"
// Mar 2026 => "26"
function getDisplayYear(calYear) {
  return String(calYear % 100).padStart(2, '0');
}

// ── Build last-6-months list (newest first) ──────────────────────
export function buildSixMonths(fromDate = new Date()) {
  const NAMES = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];

  let m = fromDate.getMonth();
  let y = fromDate.getFullYear();

  const months = [];

  for (let i = 0; i < 6; i++) {
    const yearno = getFYYearNo(m, y); // API/database financial year
    const displayYear = getDisplayYear(y); // Month's calendar year
    const monthno = String(m + 1).padStart(2, '0');

    months.push({
      index: i,

      // Sent to API
      yearno,
      monthno,
      displayYear,
      // Shown to user
      label: `${NAMES[m]}-${displayYear}`,
      shortLabel: NAMES[m],
      fullLabel: `${NAMES[m]} ${y}`,

      calMonth: m,
      calYear: y,

      // Unique API-state key
      key: `${monthno}${yearno}`,
    });

    m--;

    if (m < 0) {
      m = 11;
      y--;
    }
  }

  return months;
}

// ── XLSX Parser ──────────────────────────────────────────────────
// Reads the base64 XLSX that your Laravel function returns.
// Cell addresses match exactly what your PHP writes:
//   Row 1:  G1=working_days, I1=unit_rate
//   Row 36: B-N=kwh totals + salary totals, O-R=production
//   Row 37: Q=wjet_prod, R=total_prod
//   Row 38: L=store_total
//   Row 39: L=store_rapier (=L38-L40)
//   Row 40: L=store_wjet
//   Row 41: B-I=electricity costs per sub-meter
//   Row 46: B=avg_pick_mw, L=total_cost
//   Row 47: O=total_rapier, P=cpmc_rapier, Q=rapier_pct
//   Row 48: F=avg_pick_wjet, G=avg_pick_tot, L=cpp_total,
//           O=total_wjet,    P=cpmc_wjet,    Q=wjet_pct
//   Row 49: B=cpp_rapier, F=cpp_wjet, O=cpmc_total
//   Rows 4+: daily rows A=date B=MW_Loom C=MW_Luwa D=Sud_Loom
//            E=Sud_Luwa F=WJet_Loom G=Warp H=Misc I=Total_KWh
//            L=Sal_Rapier M=Sal_WJet N=Sal_Total
//            O=Prod_MW P=Prod_Sud Q=Prod_WJet R=Total_Prod

export function parseXlsxBase64(b64) {
  try {
    const bin = atob(b64);
    const u8 = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    const wb = XLSX.read(u8, { type: 'array' });
    const ws = wb.Sheets['Sheet1'];
    if (!ws) return null;

    // Sheet1 remains the validated costing/report source.
    // Sheet2 is the live daily-entry coverage source because it can contain
    // electricity/production dates beyond the common costing cut-off.
    // Fall back to Sheet1 for older exports that do not contain Sheet2.
    const coverageWs = wb.Sheets['Sheet2'] || ws;

    // Safe numeric cell reader
    const n = (cell) => {
      const v = ws[cell]?.v;
      return typeof v === 'number' ? v : 0;
    };
    const coverageN = (cell) => {
      const v = coverageWs[cell]?.v;
      return typeof v === 'number' ? v : 0;
    };

    const readDailyRows = (sheet, numberAt) => {
      const rows = [];
      for (let r = 4; r < 300; r++) {
        const dateVal = sheet[`A${r}`]?.v;
        if (!dateVal || typeof dateVal !== 'string') break;
        if (!/^\d{2}-[A-Za-z]{3}$/.test(dateVal)) break;
        rows.push({
          date: dateVal,
          mw_looms: numberAt(`B${r}`),
          mw_luwa: numberAt(`C${r}`),
          sd_looms: numberAt(`D${r}`),
          sd_luwa: numberAt(`E${r}`),
          wj_looms: numberAt(`F${r}`),
          warping: numberAt(`G${r}`),
          misc: numberAt(`H${r}`),
          total_kwh: numberAt(`I${r}`),
          sal_r: numberAt(`L${r}`),
          sal_w: numberAt(`M${r}`),
          sal_t: numberAt(`N${r}`),
          prod_mw: numberAt(`O${r}`),
          prod_sud: numberAt(`P${r}`),
          prod_wj: numberAt(`Q${r}`),
          prod_tot: numberAt(`R${r}`),
        });
      }
      return rows;
    };

    // Existing report/drill-down data stays on Sheet1.
    const daily = readDailyRows(ws, n);
    // Coverage only uses Sheet2 so a zero placeholder is not mistaken for an entry.
    const coverageDaily = readDailyRows(coverageWs, coverageN);

    // ── Electricity costs per sub-meter ──
    const elecWarping = n('G41');
    const elecMisc = n('H41');
    const elecRapier = n('B41') + n('C41') + n('D41') + n('E41') + (2 / 3) * (elecWarping + elecMisc);
    const elecWjet = n('F41') + (1 / 3) * (elecWarping + elecMisc);

    // ── Store ──
    const storeTotal = n('L38');
    const storeRapier = n('L39') || (storeTotal - n('L40'));
    const storeWjet = n('L40');

    // ── Production ──
    const prodMW = n('O36');
    const prodSud = n('P36');
    const prodRapier = prodMW + prodSud;
    const prodWjet = n('Q37');
    const prodTotal = n('R37') || (prodRapier + prodWjet);
    const prodTotalL = prodTotal > 0 ? prodTotal / 1e5 : 0;

    /*
     * CLIENT REQUIREMENT — utility contribution per metre / pick.
     *
     * The Excel report exposes one Rapier average-pick basis (B46), one
     * Waterjet basis (F48), and the combined weighted basis (G48). Direct MW
     * and Sud Rapier utility heads therefore use their own production metres
     * with the existing Rapier pick basis. Shared Warping/Misc remain shared
     * and use combined metres / combined weighted picks. This is display-only
     * and does not alter any existing costing/allocation formula.
     */
    const rapierPicks = n('B46');
    const waterjetPicks = n('F48');
    const combinedPicks = n('G48');

    const utilityRateRow = ({
      key, label, kwh, amount, productionMtr, picks, basis, shared = false,
    }) => {
      const safeAmount = Number(amount || 0);
      const safeProduction = Number(productionMtr || 0);
      const safePicks = Number(picks || 0);
      return {
        key,
        label,
        shared,
        kwh: Number(kwh || 0),
        amount: safeAmount,
        production_mtr_basis: safeProduction,
        picks_basis: safePicks,
        rate_available: safeProduction > 0,
        pick_rate_available: safeProduction > 0 && safePicks > 0,
        cost_per_mtr: safeProduction > 0 ? safeAmount / safeProduction : 0,
        cost_per_pick:
          safeProduction > 0 && safePicks > 0
            ? safeAmount / safeProduction / safePicks
            : 0,
        basis,
      };
    };

    const utilityRates = [
      utilityRateRow({
        key: 'mw_rapier_looms',
        label: 'MW Rapier — Looms',
        kwh: n('B36'),
        amount: n('B41'),
        productionMtr: prodMW,
        picks: rapierPicks,
        basis: 'MW Rapier production / Rapier avg picks',
      }),
      utilityRateRow({
        key: 'mw_rapier_luwa',
        label: 'MW Rapier — Luwa (humid.)',
        kwh: n('C36'),
        amount: n('C41'),
        productionMtr: prodMW,
        picks: rapierPicks,
        basis: 'MW Rapier production / Rapier avg picks',
      }),
      utilityRateRow({
        key: 'sud_rapier_looms',
        label: 'Sud Rapier — Looms',
        kwh: n('D36'),
        amount: n('D41'),
        productionMtr: prodSud,
        picks: rapierPicks,
        basis: 'Sud Rapier production / Rapier avg picks',
      }),
      utilityRateRow({
        key: 'sud_rapier_luwa',
        label: 'Sud Rapier — Luwa (humid.)',
        kwh: n('E36'),
        amount: n('E41'),
        productionMtr: prodSud,
        picks: rapierPicks,
        basis: 'Sud Rapier production / Rapier avg picks',
      }),
      utilityRateRow({
        key: 'sud_waterjet_looms',
        label: 'Sud W-Jet — Looms',
        kwh: n('F36'),
        amount: n('F41'),
        productionMtr: prodWjet,
        picks: waterjetPicks,
        basis: 'Waterjet production / Waterjet avg picks',
      }),
      utilityRateRow({
        key: 'warping_shared',
        label: 'Warping (shared)',
        kwh: n('G36'),
        amount: elecWarping,
        productionMtr: prodTotal,
        picks: combinedPicks,
        basis: 'Combined production / weighted avg picks',
        shared: true,
      }),
      utilityRateRow({
        key: 'misc_shared',
        label: 'Miscellaneous (shared)',
        kwh: n('H36'),
        amount: elecMisc,
        productionMtr: prodTotal,
        picks: combinedPicks,
        basis: 'Combined production / weighted avg picks',
        shared: true,
      }),
    ];

    return {
      // Header
      unit_rate: n('I1'),
      days: n('G1'),

      // Summary (from Excel computed cells)
      total: n('L46'),
      cpp_total: n('L48'),
      avg_pick_mw: n('B46'),
      avg_pick_wjet: n('F48'),
      avg_pick_tot: n('G48'),
      cpmc: n('O49'),
      cpmc_rapier: n('P47'),
      cpmc_wjet: n('P48'),
      rapier_pct: n('Q47') * 100,
      wjet_pct: n('Q48') * 100,
      cpp_rapier: n('B49'),
      cpp_wjet: n('F49'),
      total_rapier: n('O47'),
      total_wjet: n('O48'),
      per_mtr: n('L47'),

      // KWh sub-meters (row 36 totals)
      kwh_total: n('I36'),
      kwh_mw_looms: n('B36'),
      kwh_mw_luwa: n('C36'),
      kwh_sd_looms: n('D36'),
      kwh_sd_luwa: n('E36'),
      kwh_wj_looms: n('F36'),
      kwh_warping: n('G36'),
      kwh_misc: n('H36'),

      // Electricity costs (row 41)
      elec_total: n('I41'),
      elec_mw_looms: n('B41'),
      elec_mw_luwa: n('C41'),
      elec_sd_looms: n('D41'),
      elec_sd_luwa: n('E41'),
      elec_wj_looms: n('F41'),
      elec_warping: elecWarping,
      elec_misc: elecMisc,
      elec_rapier: elecRapier,
      elec_wjet: elecWjet,

      // Salary
      sal_rapier: n('L36'),
      sal_wjet: n('M36'),
      sal_total: n('N36'),

      // Stores
      store_total: storeTotal,
      store_rapier: storeRapier,
      store_wjet: storeWjet,

      // Production
      prod_mw: prodMW,
      prod_sud: prodSud,
      prod_rapier: prodRapier,
      prod_wjet: prodWjet,
      prod_total: prodTotal,
      prod_total_L: prodTotalL,

      // Per-utility display KPIs. Existing totals/allocation stay untouched.
      utility_rates: utilityRates,

      // Derived per-metre
      units_per_mtr: prodTotal > 0 ? n('I36') / prodTotal : 0,
      sal_per_mtr: prodTotal > 0 ? n('N36') / prodTotal : 0,
      store_per_mtr: prodTotal > 0 ? storeTotal / prodTotal : 0,

      // Daily rows
      daily,
      // Live coverage rows from Sheet2 (Sheet1 fallback for legacy exports).
      coverage_daily: coverageDaily,
    };
  } catch (err) {
    console.error('[parseXlsxBase64] parse error:', err);
    return null;
  }
}

// ── Main Hook ────────────────────────────────────────────────────
const asNumber = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const nearlyEqual = (a, b, tolerance = 0.01) =>
  Math.abs(asNumber(a) - asNumber(b)) <= tolerance;

const firstFinite = (...values) => {
  for (const value of values) {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return 0;
};

const hasNumericValue = (value) =>
  value !== null
  && value !== undefined
  && value !== ''
  && Number.isFinite(Number(value));

const ymdLabel = (ymd) => {
  const s = String(ymd || '').padStart(8, '0');
  if (!/^\d{8}$/.test(s)) return '';
  const year = Number(s.slice(0, 4));
  const month = Number(s.slice(4, 6));
  const day = Number(s.slice(6, 8));
  if (!year || month < 1 || month > 12 || day < 1 || day > 31) return '';
  const mon = new Date(year, month - 1, 1).toLocaleString('en-US', { month: 'short' });
  return `${String(day).padStart(2, '0')}-${mon}`;
};

const normalizeApiRoot = (apiBase) => {
  const base = String(apiBase || API_BASE_URL || '').trim().replace(/\/+$/, '');
  if (!base) throw new Error('Expense API base URL is not available.');
  return /\/api$/i.test(base) ? base : `${base}/api`;
};

const dailyEndpoint = (kind) => {
  if (kind === 'maintenance') return 'expense-maintenance';
  if (kind === 'other') return 'expense-other';
  throw new Error('Unsupported daily expense type.');
};

export function useExpenseData({ token, apiBase, txntype = 'monthly_expense_rpt' }) {
  const MONTHS = buildSixMonths();

  // Per-month state keyed by monthno+yearno (e.g. "0627")
  const initialStates = Object.fromEntries(
    MONTHS.map((m) => [m.key, { status: 'idle', data: null, error: null }])
  );
  const [states, setStates] = useState(initialStates);
  const hasFetched = useRef(false);

  // Count how many are done (for progress bar)
  const loadedCount = Object.values(states).filter((s) => s.status === 'done').length;
  const errorCount = Object.values(states).filter((s) => s.status === 'error').length;

  // ── Fire single month request ──
  const fetchMonth = useCallback(
    async ({ yearno, monthno, key }, force = false) => {
      try {
        const userPtype = (await AsyncStorage.getItem('user_prptype')) || 'S';
        const payload = await fetchExpenseDashboardCard({
          token,
          prptype: userPtype,
          yearno,
          monthno,
          refresh: force,
        });

        const r = payload.division?.rapier || {};
        const w = payload.division?.waterjet || {};
        const section = payload.section_ab || {};
        const sectionActive = section.active === true;
        const sectionProduction = section.production || {};
        const sectionElectricity = section.electricity || {};
        const sectionSalary = section.salary || {};
        const sectionStores = section.stores || {};
        const sectionMaintenance = section.maintenance || {};
        const sectionOther = section.other || {};
        const sectionPicks = section.picks || {};

        const utilityRows = payload.utilities?.rate_rows || [];
        const util = Object.fromEntries(utilityRows.map(x => [x.key, x]));
        const expenseDaily = Array.isArray(payload.trends?.expense_daily)
          ? payload.trends.expense_daily
          : [];
        const utilityDaily = Array.isArray(payload.trends?.utility_daily)
          ? payload.trends.utility_daily
          : [];
        const electricityDaily = Array.isArray(payload.trends?.electricity_daily)
          ? payload.trends.electricity_daily
          : [];
        const prodDaily = Array.isArray(payload.production?.daily_trend)
          ? payload.production.daily_trend
          : [];

        const expenseByDate = Object.fromEntries(
          expenseDaily.map(x => [Number(x.date_ymd), x])
        );
        const electricityByDate = Object.fromEntries(
          electricityDaily.map(x => [Number(x.date_ymd), x])
        );
        const prodByDate = Object.fromEntries(
          prodDaily.map(x => [Number(x.date_ymd), x])
        );

        // IMPORTANT: use the union date set. From 01-10-2026 management-entry-only
        // dates (Maintenance / Other) must remain visible even when there is no
        // checking production or ExpCosting row on that day.
        const sectionMaintenanceDaily = Array.isArray(sectionMaintenance.daily)
          ? sectionMaintenance.daily
          : [];
        const sectionOtherDaily = Array.isArray(sectionOther.daily)
          ? sectionOther.daily
          : [];

        const dailyDates = Array.from(new Set([
          ...expenseDaily.map(x => Number(x.date_ymd || 0)),
          ...electricityDaily.map(x => Number(x.date_ymd || 0)),
          ...prodDaily.map(x => Number(x.date_ymd || 0)),
          ...sectionMaintenanceDaily.map(x => Number(x.date_ymd || x.entry_date || 0)),
          ...sectionOtherDaily.map(x => Number(x.date_ymd || x.entry_date || 0)),
        ].filter(Boolean))).sort((a, b) => a - b);

        const daily = dailyDates.map(dateYmd => {
          const t = expenseByDate[dateYmd] || {};
          const e = electricityByDate[dateYmd] || {};
          const p = prodByDate[dateYmd] || {};

          return {
            date: ymdLabel(dateYmd) || String(t.day || p.day || e.day || ''),
            date_ymd: dateYmd,

            // Daily electricity drill-down — now populated from the live API.
            mw_looms: asNumber(e.mw_rapier_looms),
            mw_luwa: asNumber(e.mw_rapier_luwa),
            sd_looms: asNumber(e.sip_rapier_looms),
            sd_luwa: asNumber(e.sip_rapier_luwa),
            wj_looms: asNumber(e.sip_waterjet_looms),
            warping: asNumber(e.warping_shared),
            misc: asNumber(e.misc_shared),
            total_kwh: asNumber(e.total_kwh),

            // Existing manual Rapier / Waterjet salary source remains visible.
            sal_r: asNumber(t.rapier_salary),
            sal_w: asNumber(t.waterjet_salary),
            sal_t: asNumber(t.salary),

            // Production system feed.
            prod_mw: asNumber(p.mw_rapier_mtr),
            prod_sud: asNumber(p.sip_rapier_mtr),
            prod_wj: asNumber(p.waterjet_mtr),
            prod_tot: asNumber(p.combined_mtr || t.production_mtr),

            // Section A/B day values used by the new Client Artifact UI.
            section_a_mtr: asNumber(t.section_a_mtr),
            section_b_mtr: asNumber(t.section_b_mtr),
            section_a_avg_picks: asNumber(t.section_a_avg_picks),
            section_b_avg_picks: asNumber(t.section_b_avg_picks),
            section_a_electricity: asNumber(t.section_a_electricity),
            section_b_electricity: asNumber(t.section_b_electricity),
            section_a_salary: asNumber(t.section_a_salary),
            section_b_salary: asNumber(t.section_b_salary),
            section_a_stores: asNumber(t.section_a_stores_allocated),
            section_b_stores: asNumber(t.section_b_stores_allocated),
            section_a_maintenance: asNumber(t.section_a_maintenance),
            section_b_maintenance: asNumber(t.section_b_maintenance),
            maintenance_common: asNumber(t.maintenance_common),
            section_a_other: asNumber(t.section_a_other),
            section_b_other: asNumber(t.section_b_other),
            other_common: asNumber(t.other_common),
            section_a_total_cost: asNumber(t.section_a_total_cost),
            section_b_total_cost: asNumber(t.section_b_total_cost),
            total_cost_complete: t.total_cost_complete !== false,
            total_cost_completeness: t.total_cost_completeness || null,
          };
        });

        const sectionAProduction = asNumber(sectionProduction.section_a_mtr);
        const sectionBProduction = asNumber(sectionProduction.section_b_mtr);
        const sectionAAvgPicks = asNumber(sectionPicks.section_a_avg);
        const sectionBAvgPicks = asNumber(sectionPicks.section_b_avg);

        const sectionAElectricity = asNumber(sectionElectricity.section_a_amount);
        const sectionBElectricity = asNumber(sectionElectricity.section_b_amount);
        const sectionASalary = asNumber(sectionSalary.section_a_amount);
        const sectionBSalary = asNumber(sectionSalary.section_b_amount);
        const sectionAStores = asNumber(sectionStores.final_section_a_amount);
        const sectionBStores = asNumber(sectionStores.final_section_b_amount);
        const sectionAMaintenance = asNumber(sectionMaintenance.section_a_allocated);
        const sectionBMaintenance = asNumber(sectionMaintenance.section_b_allocated);
        const sectionAOther = asNumber(sectionOther.section_a_allocated);
        const sectionBOther = asNumber(sectionOther.section_b_allocated);

        /*
         * SECTION A/B AUTHORITATIVE TOTALS
         * -------------------------------
         * From 01-10-2026, section_ab is the detailed accounting source for the
         * five cost heads. Recompose the displayed totals from A+B so the UI
         * cannot silently show a stale/older composition cache while the
         * detailed A/B payload is already correct.
         */
        const sectionElectricityTotal = sectionAElectricity + sectionBElectricity;
        const sectionSalaryTotal = sectionASalary + sectionBSalary;
        const sectionStoresTotal = sectionAStores + sectionBStores;
        const sectionMaintenanceTotal = sectionAMaintenance + sectionBMaintenance;
        const sectionOtherTotal = sectionAOther + sectionBOther;

        const effectiveElectricity = sectionActive
          ? sectionElectricityTotal
          : asNumber(payload.composition?.electricity);
        const effectiveSalary = sectionActive
          ? sectionSalaryTotal
          : asNumber(payload.composition?.salary);
        const storesFinalABAvailable =
          hasNumericValue(sectionStores.final_section_a_amount)
          && hasNumericValue(sectionStores.final_section_b_amount);

        const effectiveStores = sectionActive
          ? (
              storesFinalABAvailable
                ? sectionStoresTotal
                : firstFinite(
                    payload.composition?.stores,
                    sectionStores.store_total,
                    0
                  )
            )
          : asNumber(payload.composition?.stores);
        const effectiveMaintenance = sectionActive
          ? sectionMaintenanceTotal
          : asNumber(payload.composition?.maintenance);
        const effectiveOther = sectionActive
          ? sectionOtherTotal
          : asNumber(payload.composition?.other);

        const sectionATotal = sectionAElectricity + sectionASalary + sectionAStores
          + sectionAMaintenance + sectionAOther;
        const sectionBTotal = sectionBElectricity + sectionBSalary + sectionBStores
          + sectionBMaintenance + sectionBOther;

        const effectiveTotal = sectionActive
          ? sectionATotal + sectionBTotal
          : asNumber(payload.summary?.total_cost);

        const backendCompositionTotal = asNumber(payload.composition?.total);
        const backendSummaryTotal = asNumber(payload.summary?.total_cost);

        const sectionACpp = sectionAProduction > 0 && sectionAAvgPicks > 0
          ? sectionATotal / sectionAProduction / sectionAAvgPicks
          : 0;
        const sectionBCpp = sectionBProduction > 0 && sectionBAvgPicks > 0
          ? sectionBTotal / sectionBProduction / sectionBAvgPicks
          : 0;

        const machineCounts = sectionSalary.machine_counts
          || sectionStores.machine_counts
          || sectionMaintenance.common?.machine_counts_as_of_upto
          || sectionOther.common?.machine_counts_as_of_upto
          || {};

        const completenessKeys = ['electricity', 'salary', 'stores', 'maintenance', 'other', 'design_ppi'];
        const aggregateCompleteness = Object.fromEntries(
          completenessKeys.map(k => [k, sectionActive ? expenseDaily.length > 0 : true])
        );
        if (sectionActive) {
          expenseDaily.forEach(row => {
            const c = row?.total_cost_completeness || {};
            completenessKeys.forEach(k => {
              if (c[k] !== true) aggregateCompleteness[k] = false;
            });
          });
        }
        const totalCostComplete = !sectionActive
          || (expenseDaily.length > 0 && expenseDaily.every(row => row?.total_cost_complete === true));

        const data = {
          label: payload.period?.label || payload.period?.month_name || '',
          unit_rate: asNumber(payload.summary?.unit_rate),
          days: asNumber(payload.period?.working_days),
          total: effectiveTotal,
          cpp_total: asNumber(payload.production?.total_mtr) > 0 && asNumber(payload.summary?.avg_picks) > 0
            ? effectiveTotal / asNumber(payload.production?.total_mtr) / asNumber(payload.summary?.avg_picks)
            : asNumber(payload.summary?.cost_per_pick),
          avg_pick_mw: asNumber(r.avg_picks),
          avg_pick_wjet: asNumber(w.avg_picks),
          avg_pick_tot: asNumber(payload.summary?.avg_picks),
          cpmc: asNumber(payload.summary?.cost_per_machine_day),
          cpmc_rapier: 0,
          cpmc_wjet: 0,
          rapier_pct: !sectionActive && asNumber(payload.summary?.total_cost) > 0
            ? asNumber(r.total_cost) / asNumber(payload.summary.total_cost) * 100
            : 0,
          wjet_pct: !sectionActive && asNumber(payload.summary?.total_cost) > 0
            ? asNumber(w.total_cost) / asNumber(payload.summary.total_cost) * 100
            : 0,
          cpp_rapier: asNumber(r.cost_per_pick),
          cpp_wjet: asNumber(w.cost_per_pick),
          total_rapier: asNumber(r.total_cost),
          total_wjet: asNumber(w.total_cost),
          per_mtr: asNumber(payload.summary?.production_mtr) > 0
            ? asNumber(payload.summary?.total_cost) / asNumber(payload.summary?.production_mtr)
            : 0,

          kwh_total: asNumber(payload.utilities?.total_kwh || payload.summary?.units),
          kwh_mw_looms: asNumber(util.mw_rapier_looms?.kwh),
          kwh_mw_luwa: asNumber(util.mw_rapier_luwa?.kwh),
          kwh_sd_looms: asNumber(util.sip_rapier_looms?.kwh),
          kwh_sd_luwa: asNumber(util.sip_rapier_luwa?.kwh),
          kwh_wj_looms: asNumber(util.sip_waterjet_looms?.kwh),
          kwh_warping: asNumber(util.warping_shared?.kwh),
          kwh_misc: asNumber(util.misc_shared?.kwh),

          elec_total: effectiveElectricity,
          elec_mw_looms: asNumber(util.mw_rapier_looms?.amount),
          elec_mw_luwa: asNumber(util.mw_rapier_luwa?.amount),
          elec_sd_looms: asNumber(util.sip_rapier_looms?.amount),
          elec_sd_luwa: asNumber(util.sip_rapier_luwa?.amount),
          elec_wj_looms: asNumber(util.sip_waterjet_looms?.amount),
          elec_warping: asNumber(util.warping_shared?.amount),
          elec_misc: asNumber(util.misc_shared?.amount),
          elec_rapier: asNumber(r.electricity),
          elec_wjet: asNumber(w.electricity),

          sal_rapier: asNumber(r.salary),
          sal_wjet: asNumber(w.salary),
          sal_total: effectiveSalary,
          store_total: effectiveStores,
          store_rapier: asNumber(r.stores),
          store_wjet: asNumber(w.stores),
          maintenance_total: effectiveMaintenance,
          other_total: effectiveOther,

          prod_mw: asNumber(payload.production?.mw_rapier_mtr),
          prod_sud: asNumber(payload.production?.sip_rapier_mtr),
          prod_rapier: asNumber(payload.production?.rapier_total_mtr),
          prod_wjet: asNumber(payload.production?.sip_waterjet_mtr),
          prod_total: asNumber(payload.production?.total_mtr),
          prod_total_L: asNumber(payload.production?.total_mtr) / 1e5,
          utility_rates: utilityRows,
          units_per_mtr: asNumber(payload.production?.total_mtr) > 0
            ? asNumber(payload.summary?.units) / asNumber(payload.production?.total_mtr)
            : 0,
          sal_per_mtr: asNumber(payload.production?.total_mtr) > 0
            ? effectiveSalary / asNumber(payload.production?.total_mtr)
            : 0,
          store_per_mtr: asNumber(payload.production?.total_mtr) > 0
            ? effectiveStores / asNumber(payload.production?.total_mtr)
            : 0,

          // Section A/B flattened view for the React Native report.
          section_ab_active: sectionActive,
          is_section_ab: sectionActive,
          section_ab_effective_from_ymd: asNumber(section.effective_from_ymd),
          section_a_mtr: sectionAProduction,
          section_b_mtr: sectionBProduction,
          section_a_electricity_kwh: asNumber(sectionElectricity.section_a_kwh),
          section_b_electricity_kwh: asNumber(sectionElectricity.section_b_kwh),
          section_a_electricity_amount: sectionAElectricity,
          section_b_electricity_amount: sectionBElectricity,
          section_ab_electricity_total_kwh: asNumber(sectionElectricity.total_kwh || payload.utilities?.total_kwh || payload.summary?.units),
          section_ab_electricity_total_amount: asNumber(sectionElectricity.total_amount || payload.composition?.electricity),
          section_machine_counts: {
            total_section: asNumber(machineCounts.total_section),
            section_a: asNumber(machineCounts.section_a),
            section_b: asNumber(machineCounts.section_b),
            waterjet: asNumber(machineCounts.waterjet),
            total_rapier: asNumber(machineCounts.total_rapier),
            mw_rapier: asNumber(machineCounts.mw_rapier),
            sud_rapier: asNumber(machineCounts.sud_rapier),
            sud_rapier_230: asNumber(machineCounts.sud_rapier_230),
            rapier_190: asNumber(machineCounts.rapier_190),
          },
          section_groups: sectionProduction.groups || {},
          section_a_prod: sectionAProduction,
          section_b_prod: sectionBProduction,
          section_a_avg_picks: sectionAAvgPicks,
          section_b_avg_picks: sectionBAvgPicks,
          section_a_elec: sectionAElectricity,
          section_b_elec: sectionBElectricity,
          section_a_salary: sectionASalary,
          section_b_salary: sectionBSalary,
          section_a_stores: sectionAStores,
          section_b_stores: sectionBStores,
          section_a_maintenance: sectionAMaintenance,
          section_b_maintenance: sectionBMaintenance,
          section_a_other: sectionAOther,
          section_b_other: sectionBOther,
          section_a_total: sectionATotal,
          section_b_total: sectionBTotal,
          section_a_cpp: sectionACpp,
          section_b_cpp: sectionBCpp,
          section_a_pct: effectiveTotal > 0
            ? sectionATotal / effectiveTotal * 100
            : 0,
          section_b_pct: effectiveTotal > 0
            ? sectionBTotal / effectiveTotal * 100
            : 0,

          maintenance_direct_a: asNumber(sectionMaintenance.section_a_direct),
          maintenance_direct_b: asNumber(sectionMaintenance.section_b_direct),
          maintenance_common: asNumber(sectionMaintenance.common?.source_amount),
          maintenance_daily: sectionMaintenanceDaily,
          maintenance_status: sectionMaintenance.status || null,
          maintenance_reconciled: sectionMaintenance.reconciliation?.is_reconciled === true,

          other_direct_a: asNumber(sectionOther.section_a_direct),
          other_direct_b: asNumber(sectionOther.section_b_direct),
          other_common: asNumber(sectionOther.common?.source_amount),
          other_daily: sectionOtherDaily,
          other_status: sectionOther.status || null,
          other_reconciled: sectionOther.reconciliation?.is_reconciled === true,

          stores_status: sectionStores.status || null,
          stores_daily_allocation_ready: sectionStores.daily_allocation_ready === true,
          salary_section_ready: sectionSalary.reconciliation?.is_reconciled === true,
          salary_daily: Array.isArray(sectionSalary.daily) ? sectionSalary.daily : [],
          electricity_section_ready: sectionElectricity.is_reconciled === true,
          total_cost_complete: totalCostComplete,
          total_cost_completeness: aggregateCompleteness,
          section_readiness: section.readiness || {},

          data_integrity: {
            section_ab: sectionActive,
            section_total: effectiveTotal,
            backend_summary_total: backendSummaryTotal,
            backend_composition_total: backendCompositionTotal,
            summary_difference: sectionActive
              ? Number((effectiveTotal - backendSummaryTotal).toFixed(2))
              : 0,
            composition_difference: sectionActive
              ? Number((effectiveTotal - backendCompositionTotal).toFixed(2))
              : 0,
            production_difference: sectionActive
              ? Number(((sectionAProduction + sectionBProduction) - asNumber(payload.production?.total_mtr)).toFixed(3))
              : 0,
            maintenance_difference: sectionActive
              ? Number((effectiveMaintenance - asNumber(sectionMaintenance.total ?? sectionMaintenance.allocated_total)).toFixed(2))
              : 0,
            other_difference: sectionActive
              ? Number((effectiveOther - asNumber(sectionOther.total ?? sectionOther.allocated_total)).toFixed(2))
              : 0,
            stores_difference: sectionActive
              ? Number((effectiveStores - asNumber(sectionStores.store_total)).toFixed(2))
              : 0,
            is_reconciled: !sectionActive || (
              nearlyEqual(sectionAProduction + sectionBProduction, asNumber(payload.production?.total_mtr), 0.01)
              && nearlyEqual(effectiveMaintenance, asNumber(sectionMaintenance.total ?? sectionMaintenance.allocated_total), 0.01)
              && nearlyEqual(effectiveOther, asNumber(sectionOther.total ?? sectionOther.allocated_total), 0.01)
              && nearlyEqual(effectiveStores, asNumber(sectionStores.store_total), 0.01)
              && (
                nearlyEqual(effectiveTotal, backendSummaryTotal, 0.01)
                || backendSummaryTotal === 0
              )
            ),
          },

          daily,
          coverage_daily: daily,
          expense_daily_trend: expenseDaily,
          utility_daily_trend: utilityDaily,
          electricity_daily: electricityDaily,
          trend_meta: payload.trends || {},
          conversion_rates: payload.conversion_rates || null,
          coverage: payload.period,
          raw_section_ab: section,
        };

        /*
         * DAILY ENTRY HYDRATION FALLBACK
         * ------------------------------
         * Normally Maintenance / Other editors use section_ab.*.daily directly.
         * If an older cache/envelope omitted that array but expense_daily already
         * contains the allocated values, reconstruct the direct A/B amounts by
         * subtracting the Common machine-count share. This prevents an existing
         * ERP entry from appearing as zero in the editor.
         */
        const countsA = asNumber(data.section_machine_counts?.section_a);
        const countsB = asNumber(data.section_machine_counts?.section_b);
        const countsT = asNumber(data.section_machine_counts?.total_section) || (countsA + countsB);
        const commonShareA = countsT > 0 ? countsA / countsT : 0;

        if (sectionActive && data.maintenance_daily.length === 0) {
          data.maintenance_daily = daily
            .filter(row =>
              asNumber(row.section_a_maintenance) !== 0
              || asNumber(row.section_b_maintenance) !== 0
              || asNumber(row.maintenance_common) !== 0
            )
            .map(row => {
              const common = asNumber(row.maintenance_common);
              const commonA = Math.round(common * commonShareA * 100) / 100;
              const commonB = Math.round((common - commonA) * 100) / 100;
              return {
                date_ymd: row.date_ymd,
                section_a_amount: Math.round((asNumber(row.section_a_maintenance) - commonA) * 100) / 100,
                section_b_amount: Math.round((asNumber(row.section_b_maintenance) - commonB) * 100) / 100,
                common_amount: common,
                machine_counts: {
                  total_section: countsT,
                  section_a: countsA,
                  section_b: countsB,
                },
                section_a_allocated: asNumber(row.section_a_maintenance),
                section_b_allocated: asNumber(row.section_b_maintenance),
                allocated_total:
                  asNumber(row.section_a_maintenance) + asNumber(row.section_b_maintenance),
                hydration_source: 'expense_daily_fallback',
              };
            });
        }

        if (sectionActive && data.other_daily.length === 0) {
          data.other_daily = daily
            .filter(row =>
              asNumber(row.section_a_other) !== 0
              || asNumber(row.section_b_other) !== 0
              || asNumber(row.other_common) !== 0
            )
            .map(row => {
              const common = asNumber(row.other_common);
              const commonA = Math.round(common * commonShareA * 100) / 100;
              const commonB = Math.round((common - commonA) * 100) / 100;
              return {
                date_ymd: row.date_ymd,
                section_a_amount: Math.round((asNumber(row.section_a_other) - commonA) * 100) / 100,
                section_b_amount: Math.round((asNumber(row.section_b_other) - commonB) * 100) / 100,
                common_amount: common,
                machine_counts: {
                  total_section: countsT,
                  section_a: countsA,
                  section_b: countsB,
                },
                section_a_allocated: asNumber(row.section_a_other),
                section_b_allocated: asNumber(row.section_b_other),
                allocated_total:
                  asNumber(row.section_a_other) + asNumber(row.section_b_other),
                hydration_source: 'expense_daily_fallback',
              };
            });
        }

        setStates(prev => ({ ...prev, [key]: { status: 'done', data, error: null } }));
        return data;
      } catch (err) {
        const msg = err?.message || 'Network error';
        setStates(prev => ({ ...prev, [key]: { status: 'error', data: null, error: msg } }));
        return null;
      }
    },
    [token]
  );

  const getRequestToken = useCallback(async () => {
    return token || (await AsyncStorage.getItem('access_token')) || '';
  }, [token]);

  const saveDailySectionExpense = useCallback(async ({
    kind,
    entryDate,
    sectionAAmount = 0,
    sectionBAmount = 0,
    commonAmount = 0,
    remark = '',
    existing = false,
  }) => {
    const endpoint = dailyEndpoint(kind);
    const root = normalizeApiRoot(apiBase);
    const authToken = await getRequestToken();
    if (!authToken) throw new Error('Unauthenticated.');

    const url = existing
      ? `${root}/mobile-dashboard/${endpoint}/${Number(entryDate)}`
      : `${root}/mobile-dashboard/${endpoint}`;

    const body = {
      entry_date: Number(entryDate),
      section_a_amount: asNumber(sectionAAmount),
      section_b_amount: asNumber(sectionBAmount),
      common_amount: asNumber(commonAmount),
      remark: remark == null ? '' : String(remark),
    };

    const config = {
      headers: {
        Authorization: `Bearer ${authToken}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'x-platform': 'mob',
      },
    };

    const response = existing
      ? await axios.put(url, body, config)
      : await axios.post(url, body, config);

    if (response?.data?.success !== true) {
      throw new Error(response?.data?.message || 'Daily expense save failed.');
    }

    return response.data?.response?.data || null;
  }, [apiBase, getRequestToken]);

  const deleteDailySectionExpense = useCallback(async ({ kind, entryDate }) => {
    const endpoint = dailyEndpoint(kind);
    const root = normalizeApiRoot(apiBase);
    const authToken = await getRequestToken();
    if (!authToken) throw new Error('Unauthenticated.');

    const response = await axios.delete(
      `${root}/mobile-dashboard/${endpoint}/${Number(entryDate)}`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
          Accept: 'application/json',
          'x-platform': 'mob',
        },
      }
    );

    if (response?.data?.success !== true) {
      throw new Error(response?.data?.message || 'Daily expense delete failed.');
    }

    return response.data?.response?.data || null;
  }, [apiBase, getRequestToken]);

  // ── Fire all 6 in parallel ──
  const fetchAll = useCallback((force = false) => {
    // Instantly show all as loading (user sees skeletons immediately)
    setStates(
      Object.fromEntries(
        MONTHS.map((m) => [m.key, { status: 'loading', data: null, error: null }])
      )
    );

    // All 6 fire simultaneously — each resolves independently
    MONTHS.forEach((m) => {
      fetchMonth(m, force).catch(() => {});
    });
  }, [fetchMonth]);  // eslint-disable-line react-hooks/exhaustive-deps

  // ── Auto-fetch on mount ──
  useEffect(() => {
    if (!hasFetched.current && token && apiBase) {
      hasFetched.current = true;
      fetchAll(false);
    }
  }, [fetchAll, token, apiBase]);

  const refreshMonth = useCallback(
    async (key, force = true) => {
      const month = MONTHS.find((m) => m.key === key);
      if (!month) return null;
      setStates((prev) => ({
        ...prev,
        [key]: { ...prev[key], status: 'loading', error: null },
      }));
      return fetchMonth(month, force);
    },
    [fetchMonth]
  );

  // ── Retry a single failed month ──
  const retryMonth = useCallback(
    (key) => refreshMonth(key, true),
    [refreshMonth]
  );

  const refresh = useCallback(() => fetchAll(true), [fetchAll]);

  return {
    months: MONTHS,
    states,
    loadedCount,
    errorCount,
    total: MONTHS.length,
    isAllDone: loadedCount + errorCount === MONTHS.length,
    refresh,
    refreshMonth,
    retryMonth,
    saveDailySectionExpense,
    deleteDailySectionExpense,
  };
}
