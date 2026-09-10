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
// ── Financial Year Helper ────────────────────────────────────────
// calMonth: 0-indexed JS Date month (0=Jan ... 11=Dec)
// April (3) onwards belongs to the NEW financial year
// e.g. Jun 2026 (m=5, y=2026) → FY 2026-27 → yearno "27"
// e.g. Mar 2026 (m=2, y=2026) → FY 2025-26 → yearno "26"
function getFY(calMonth, calYear) {
  return calMonth >= 3
    ? String((calYear + 1) % 100).padStart(2, '0')
    : String(calYear % 100).padStart(2, '0');
}

// ── Build last-6-months list (newest first) ──────────────────────
export function buildSixMonths(fromDate = new Date()) {
  const NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  let m = fromDate.getMonth();   // 0-indexed
  let y = fromDate.getFullYear();
  const months = [];

  for (let i = 0; i < 6; i++) {
    const yearno = getFY(m, y);
    const monthno = String(m + 1).padStart(2, '0');
    months.push({
      index: i,
      yearno,
      monthno,
      label: `${NAMES[m]} '${yearno}`,           // "Jun '27"
      shortLabel: NAMES[m],                            // "Jun"
      fullLabel: `${NAMES[m]} ${y}`,                 // "Jun 2026"
      calMonth: m,
      calYear: y,
      key: monthno + yearno,                     // unique key e.g. "0627"
    });
    m--;
    if (m < 0) { m = 11; y--; }
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

    // Safe numeric cell reader
    const n = (cell) => {
      const v = ws[cell]?.v;
      return typeof v === 'number' ? v : 0;
    };

    // ── Read daily rows (row 4 onwards) ──
    const daily = [];
    for (let r = 4; r < 300; r++) {
      const dateVal = ws[`A${r}`]?.v;
      if (!dateVal || typeof dateVal !== 'string') break;
      // Only include rows that look like actual dates (e.g. "01-Jan", "15-May")
      if (!/^\d{2}-[A-Za-z]{3}$/.test(dateVal)) break;
      daily.push({
        date: dateVal,
        mw_looms: n(`B${r}`),
        mw_luwa: n(`C${r}`),
        sd_looms: n(`D${r}`),
        sd_luwa: n(`E${r}`),
        wj_looms: n(`F${r}`),
        warping: n(`G${r}`),
        misc: n(`H${r}`),
        total_kwh: n(`I${r}`),
        sal_r: n(`L${r}`),
        sal_w: n(`M${r}`),
        sal_t: n(`N${r}`),
        prod_mw: n(`O${r}`),
        prod_sud: n(`P${r}`),
        prod_wj: n(`Q${r}`),
        prod_tot: n(`R${r}`),
      });
    }

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
    const prodRapier = n('O36') + n('P36');
    const prodWjet = n('Q37');
    const prodTotal = n('R37') || (prodRapier + prodWjet);
    const prodTotalL = prodTotal > 0 ? prodTotal / 1e5 : 0;

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
      prod_rapier: prodRapier,
      prod_wjet: prodWjet,
      prod_total: prodTotal,
      prod_total_L: prodTotalL,

      // Derived per-metre
      units_per_mtr: prodTotal > 0 ? n('I36') / prodTotal : 0,
      sal_per_mtr: prodTotal > 0 ? n('N36') / prodTotal : 0,
      store_per_mtr: prodTotal > 0 ? storeTotal / prodTotal : 0,

      // Daily rows
      daily,
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

      const userPtype = await AsyncStorage.getItem('user_prptype');

      console.log("yearno", yearno, monthno)
      const payload = {
        prptype: 'S',
        // prptype: userPtype,
        yearno,
        monthno,
        action: 'excel',
        txntype,
      };

      console.log('API Payload =>', payload);

      axios.post(
        `${apiBase}/api/exp_costing_crud`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
          },
          timeout: 60000,
        }
      )
        .then((res) => {
          const filedata = res.data?.data?.filedata;
          const data = filedata ? parseXlsxBase64(filedata) : null;

          // Only update THIS month — others are unaffected
          setStates((prev) => ({
            ...prev,
            [key]: {
              status: data ? 'done' : 'error',
              data,
              error: data ? null : 'Could not parse response',
            },
          }));
        })
        .catch((err) => {
          const msg =
            err?.response?.data?.message ||
            err?.message ||
            'Network error';

          setStates((prev) => ({
            ...prev,
            [key]: { status: 'error', data: null, error: msg },
          }));
        });
    },
    [apiBase, token, txntype]
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
