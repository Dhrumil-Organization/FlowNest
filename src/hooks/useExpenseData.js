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
    async ({ yearno, monthno, key }) => {
      try {
        const userPtype = (await AsyncStorage.getItem('user_prptype')) || 'S';
        const payload = await fetchExpenseDashboardCard({
          token,
          prptype: userPtype,
          yearno,
          monthno,
        });

        const r = payload.division?.rapier || {};
        const w = payload.division?.waterjet || {};
        const utilityRows = payload.utilities?.rate_rows || [];
        const util = Object.fromEntries(utilityRows.map(x => [x.key, x]));
        const expenseDaily = payload.trends?.expense_daily || [];
        const utilityDaily = payload.trends?.utility_daily || [];
        const electricityDaily = payload.trends?.electricity_daily || [];
        const prodDaily = payload.production?.daily_trend || [];
        const sectionAB = payload.section_ab || {};
        const sectionABProduction = sectionAB.production || {};
        const sectionABPicks = sectionAB.picks || {};
        const sectionABElectricity = sectionAB.electricity || {};
        const isSectionAB = payload.meta?.calculation_mode === 'section_ab' && sectionAB.active === true;
        const byDate = Object.fromEntries(expenseDaily.map(x => [Number(x.date_ymd), x]));

        const daily = prodDaily.map(row => {
          const t = byDate[Number(row.date_ymd)] || {};
          const ymd = String(row.date_ymd || '');
          const date = ymd.length === 8
            ? `${ymd.slice(6,8)}-${new Date(Number(ymd.slice(0,4)), Number(ymd.slice(4,6))-1, 1).toLocaleString('en-US',{month:'short'})}`
            : String(row.day || '');
          return {
            date,
            date_ymd: Number(row.date_ymd || 0),
            mw_looms: 0, mw_luwa: 0, sd_looms: 0, sd_luwa: 0, wj_looms: 0, warping: 0, misc: 0,
            total_kwh: 0,
            sal_r: 0, sal_w: 0, sal_t: Number(t.salary || 0),
            prod_mw: Number(row.mw_rapier_mtr || 0),
            prod_sud: Number(row.sip_rapier_mtr || 0),
            prod_wj: Number(row.waterjet_mtr || 0),
            prod_tot: Number(row.combined_mtr || 0),
            section_a_mtr: Number(row.section_a_mtr || 0),
            section_b_mtr: Number(row.section_b_mtr || 0),
            section_a_weighted_picks: Number(row.section_a_weighted_picks || 0),
            section_b_weighted_picks: Number(row.section_b_weighted_picks || 0),
          };
        });

        const data = {
          unit_rate: Number(payload.summary?.unit_rate || 0),
          days: Number(payload.period?.working_days || 0),
          total: Number(payload.summary?.total_cost || 0),
          cpp_total: Number(payload.summary?.cost_per_pick || 0),
          avg_pick_mw: Number(r.avg_picks || 0),
          avg_pick_wjet: Number(w.avg_picks || 0),
          avg_pick_tot: Number(payload.summary?.avg_picks || 0),
          cpmc: Number(payload.summary?.cost_per_machine_day || 0),
          cpmc_rapier: 0,
          cpmc_wjet: 0,
          rapier_pct: payload.summary?.total_cost > 0 ? Number(r.total_cost || 0) / Number(payload.summary.total_cost) * 100 : 0,
          wjet_pct: payload.summary?.total_cost > 0 ? Number(w.total_cost || 0) / Number(payload.summary.total_cost) * 100 : 0,
          cpp_rapier: Number(r.cost_per_pick || 0),
          cpp_wjet: Number(w.cost_per_pick || 0),
          total_rapier: Number(r.total_cost || 0),
          total_wjet: Number(w.total_cost || 0),
          per_mtr: payload.summary?.production_mtr > 0 ? Number(payload.summary.total_cost || 0) / Number(payload.summary.production_mtr) : 0,

          kwh_total: Number(payload.utilities?.total_kwh || payload.summary?.units || 0),
          kwh_mw_looms: Number(util.mw_rapier_looms?.kwh || 0),
          kwh_mw_luwa: Number(util.mw_rapier_luwa?.kwh || 0),
          kwh_sd_looms: Number(util.sip_rapier_looms?.kwh || 0),
          kwh_sd_luwa: Number(util.sip_rapier_luwa?.kwh || 0),
          kwh_wj_looms: Number(util.sip_waterjet_looms?.kwh || 0),
          kwh_warping: Number(util.warping_shared?.kwh || 0),
          kwh_misc: Number(util.misc_shared?.kwh || 0),

          elec_total: Number(payload.composition?.electricity || 0),
          elec_mw_looms: Number(util.mw_rapier_looms?.amount || 0),
          elec_mw_luwa: Number(util.mw_rapier_luwa?.amount || 0),
          elec_sd_looms: Number(util.sip_rapier_looms?.amount || 0),
          elec_sd_luwa: Number(util.sip_rapier_luwa?.amount || 0),
          elec_wj_looms: Number(util.sip_waterjet_looms?.amount || 0),
          elec_warping: Number(util.warping_shared?.amount || 0),
          elec_misc: Number(util.misc_shared?.amount || 0),
          elec_rapier: Number(r.electricity || 0),
          elec_wjet: Number(w.electricity || 0),

          sal_rapier: Number(r.salary || 0),
          sal_wjet: Number(w.salary || 0),
          sal_total: Number(payload.composition?.salary || 0),
          store_total: Number(payload.composition?.stores || 0),
          store_rapier: Number(r.stores || 0),
          store_wjet: Number(w.stores || 0),

          prod_mw: Number(payload.production?.mw_rapier_mtr || 0),
          prod_sud: Number(payload.production?.sip_rapier_mtr || 0),
          prod_rapier: Number(payload.production?.rapier_total_mtr || 0),
          prod_wjet: Number(payload.production?.sip_waterjet_mtr || 0),
          prod_total: Number(payload.production?.total_mtr || 0),
          prod_total_L: Number(payload.production?.total_mtr || 0) / 1e5,
          utility_rates: utilityRows,
          units_per_mtr: payload.production?.total_mtr > 0 ? Number(payload.summary?.units || 0) / Number(payload.production.total_mtr) : 0,
          sal_per_mtr: payload.production?.total_mtr > 0 ? Number(payload.composition?.salary || 0) / Number(payload.production.total_mtr) : 0,
          store_per_mtr: payload.production?.total_mtr > 0 ? Number(payload.composition?.stores || 0) / Number(payload.production.total_mtr) : 0,
          daily,
          coverage_daily: daily,
          expense_daily_trend: expenseDaily,
          utility_daily_trend: utilityDaily,
          electricity_daily: electricityDaily,

          // Effective-dated Section A/B reporting contract. Legacy fields above
          // intentionally remain populated for <= 30/09/2026 and for the
          // later salary/stores migration steps.
          calculation_mode: payload.meta?.calculation_mode || 'legacy_rapier_waterjet',
          is_section_ab: isSectionAB,
          section_ab_effective_from_ymd: Number(payload.meta?.section_ab_effective_from_ymd || sectionAB.effective_from_ymd || 20261001),
          section_a_mtr: Number(sectionABProduction.section_a_mtr || 0),
          section_b_mtr: Number(sectionABProduction.section_b_mtr || 0),
          section_a_avg_picks: Number(sectionABPicks.section_a_avg || 0),
          section_b_avg_picks: Number(sectionABPicks.section_b_avg || 0),
          section_a_electricity_kwh: Number(sectionABElectricity.section_a_kwh || 0),
          section_b_electricity_kwh: Number(sectionABElectricity.section_b_kwh || 0),
          section_a_electricity_amount: Number(sectionABElectricity.section_a_amount || 0),
          section_b_electricity_amount: Number(sectionABElectricity.section_b_amount || 0),
          section_ab_electricity_total_kwh: Number(sectionABElectricity.total_kwh || 0),
          section_ab_electricity_total_amount: Number(sectionABElectricity.total_amount || 0),
          section_ab_electricity_reconciled: sectionABElectricity.is_reconciled === true,
          section_ab_electricity_difference_kwh: Number(sectionABElectricity.difference_kwh || 0),
          section_ab_electricity_status: sectionABElectricity.status || null,
          section_ab_readiness: sectionAB.readiness || {},
          section_ab_groups: sectionABProduction.groups || {},

          trend_meta: payload.trends || {},
          conversion_rates: payload.conversion_rates || null,
          coverage: payload.period,
        };

        setStates(prev => ({ ...prev, [key]: { status: 'done', data, error: null } }));
      } catch (err) {
        const msg = err?.message || 'Network error';
        setStates(prev => ({ ...prev, [key]: { status: 'error', data: null, error: msg } }));
      }
    },
    [token]
  );

  // ── Fire all 6 in parallel ──
  const fetchAll = useCallback(() => {
    // Instantly show all as loading (user sees skeletons immediately)
    setStates(
      Object.fromEntries(
        MONTHS.map((m) => [m.key, { status: 'loading', data: null, error: null }])
      )
    );

    // All 6 fire simultaneously — each resolves independently
    MONTHS.forEach((m) => fetchMonth(m));
  }, [fetchMonth]);  // eslint-disable-line react-hooks/exhaustive-deps

  // ── Auto-fetch on mount ──
  useEffect(() => {
    if (!hasFetched.current && token && apiBase) {
      hasFetched.current = true;
      fetchAll();
    }
  }, [fetchAll, token, apiBase]);

  // ── Retry a single failed month ──
  const retryMonth = useCallback(
    (key) => {
      const month = MONTHS.find((m) => m.key === key);
      if (!month) return;
      setStates((prev) => ({
        ...prev,
        [key]: { status: 'loading', data: null, error: null },
      }));
      fetchMonth(month);
    },
    [fetchMonth]
  );

  return {
    months: MONTHS,          // array of month metadata
    states,                        // { [key]: {status, data, error} }
    loadedCount,                   // how many finished (for progress)
    errorCount,                    // how many failed
    total: MONTHS.length,   // always 6
    isAllDone: loadedCount + errorCount === MONTHS.length,
    refresh: fetchAll,         // reload everything
    retryMonth,                    // retry one month by key
  };
}
