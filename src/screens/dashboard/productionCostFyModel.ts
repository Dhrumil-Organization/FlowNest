/**
 * FY Production Cost model. Monetary data comes solely from the existing
 * monthly expense-card endpoint; this file does NOT estimate missing history.
 */
import type { ExpenseDashboardData } from '@/src/services/Dashboard/expenseDashboardApi';

export type CostHead = 'electricity' | 'salary' | 'stores' | 'maintenance' | 'other';
export const HEADS: { key: CostHead; label: string; color: string }[] = [
  { key: 'electricity', label: 'Electricity', color: '#C96E16' },
  { key: 'salary', label: 'Salary', color: '#355D94' },
  { key: 'stores', label: 'Stores', color: '#607A62' },
  { key: 'maintenance', label: 'Maintenance', color: '#8C609C' },
  { key: 'other', label: 'Other', color: '#A7824C' },
];
export const num = (v: unknown): number => {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
};
export const pad = (v: number) => String(v).padStart(2, '0');
export const yearLabel = (year: number) => `FY ${String(year).slice(-2)}–${String(year + 1).slice(-2)}`;
export const startYearOf = (d: Date): number => d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1;
export const fyYearNo = (year: number): number => (year + 1) % 100;
export const fyMonths = (year: number) => Array.from({ length: 12 }, (_, i) => ({
  index: i,
  year: year + (i >= 9 ? 1 : 0),
  month: i < 9 ? i + 4 : i - 8,
  label: ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'][i],
}));
export const fyMonthEnd = (year: number, index: number): string => {
  const m = fyMonths(year)[index];
  return `${m.year}-${pad(m.month)}-${pad(new Date(m.year, m.month, 0).getDate())}`;
};
export const fyMonthKey = (year: number, index: number) => {
  const m = fyMonths(year)[index];
  return `${m.year}${pad(m.month)}`;
};
export const fyStageIndex = (d: Date) => (d.getMonth() + 9) % 12;
export const dateYmd = (d: Date): string => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const stageDate = (year: number, index: number, day: number): string => {
  const m = fyMonths(year)[index];
  const maxDay = new Date(m.year, m.month, 0).getDate();
  return `${m.year}-${pad(m.month)}-${pad(Math.min(maxDay, day))}`;
};
export const monthCacheKey = (year: number, index: number, stage: boolean) =>
  `${year}:${index}:${stage ? 'stage' : 'full'}`;

export type MonthState = {
  status: 'loading' | 'ready' | 'unavailable' | 'error';
  data?: ExpenseDashboardData;
  reason?: string;
};
export type MonthCache = Record<string, MonthState>;
export type CostMonth = {
  year: number;
  index: number;
  label: string;
  key: string;
  available: boolean;
  complete: boolean;
  hasSource: boolean;
  costSourceReady: boolean;
  amount: number | null;
  heads: Record<CostHead, number>;
  metres: number;
  weightedPicks: number;
  picksReliable: boolean;
  machineDays: number;
  mode: 'section_ab' | 'legacy_rapier_waterjet';
  coverageDate?: number;
  raw?: ExpenseDashboardData;
  status: MonthState['status'] | 'not-requested';
  reason?: string;
};

export function fromMonth(year: number, index: number, item?: MonthState): CostMonth {
  const base = { year, index, label: fyMonths(year)[index].label, key: fyMonthKey(year, index) };
  const empty = { electricity: 0, salary: 0, stores: 0, maintenance: 0, other: 0 };
  if (!item || item.status !== 'ready' || !item.data) return {
    ...base, available: false, complete: false, hasSource: false, costSourceReady: false, amount: null,
    heads: empty, metres: 0, weightedPicks: 0, picksReliable: false, machineDays: 0,
    mode: index >= 6 && year >= 2026 ? 'section_ab' as const : 'legacy_rapier_waterjet' as const,
    status: item?.status ?? 'not-requested', reason: item?.reason,
  };
  const d = item.data;
  const heads = {
    electricity: num(d.composition?.electricity),
    salary: num(d.composition?.salary),
    stores: num(d.composition?.stores),
    maintenance: num((d.composition as any)?.maintenance),
    other: num((d.composition as any)?.other),
  };
  const total = num(d.summary?.total_cost);
  const sourceDate = num(d.period?.last_expense_entry_ymd || d.period?.complete_through_ymd);
  const hasSource = sourceDate > 0 || Object.values(heads).some(v => Math.abs(v) > 0.005);
  const headSum = Object.values(heads).reduce((a, b) => a + b, 0);
  const headsMatch = Math.abs(total - headSum) <= 1.0;
  // Older endpoints may omit maintenance and other; detect that, do not invent a head.
  const hasHeads = d.composition && typeof (d.composition as any).maintenance !== 'undefined'
    && typeof (d.composition as any).other !== 'undefined';
  const complete = d.period?.is_complete === true && (headsMatch || !hasHeads);
  /*
   * Production Cost is NOT total cost when historical ExpCosting has no
   * Electricity/Salary rows. Older FY databases can return Stores cost and
   * valid checking metres although both daily expense heads are absent.
   * The monthly Expense API exposes both source dates independently. Require
   * each source to cover the effective month cutoff, not the browser date:
   * Oct '26 can legitimately be costed through 26 Oct on a 28 Oct request.
   * This is FY-only eligibility; it never changes the monthly card's total.
   */
  const sourceCoverage = (d.period as any)?.source_coverage;
  const electricityLast = num(sourceCoverage?.electricity_last_entered_ymd);
  const salaryLast = num(sourceCoverage?.salary_last_entered_ymd);
  const effectiveThrough = num(d.period?.upto_date_ymd);
  const costSourceReady = headsMatch && effectiveThrough > 0
    && electricityLast >= effectiveThrough && salaryLast >= effectiveThrough
    && heads.electricity > 0.005 && heads.salary > 0.005;
  const avg = num(d.summary?.avg_picks);
  const metres = num(d.summary?.production_mtr);
  const mode = (d.meta as any)?.calculation_mode === 'section_ab'
    ? 'section_ab' as const : 'legacy_rapier_waterjet' as const;

  // Legacy month-start ExpCosting picks can be blank although the checked
  // rolls have a verified design/plan PPI. Reuse *those ERP checking records*
  // (not an average or estimated PPI) only when every recorded metre has
  // design PPI coverage. This keeps the historical monthly cost unchanged.
  const existingWeighted = num((d.picks as any)?.weighted_total);
  const checking = Array.isArray(d.production?.daily_trend)
    ? (d.production.daily_trend as Array<Record<string, unknown>>) : [];
  const checkingMetres = checking.reduce((v, r) => v + num(r.section_a_mtr) + num(r.section_b_mtr), 0);
  const checkingWeighted = checking.reduce((v, r) => v + num(r.section_a_weighted_picks) + num(r.section_b_weighted_picks), 0);
  const missingPpiMetres = checking.reduce((v, r) => v + num(r.missing_ppi_mtr), 0);
  const verifiedCheckingPpi = metres > 0 && checking.length > 0 && checkingWeighted > 0
    && missingPpiMetres < 0.005 && Math.abs(checkingMetres - metres) < Math.max(0.1, checking.length * .005);
  const weightedPicks = existingWeighted > 0 ? existingWeighted
    : (verifiedCheckingPpi ? checkingWeighted : 0);
  const picksReliable = weightedPicks > 0;
  return {
    ...base, available: hasSource, complete: complete && costSourceReady,
    hasSource, costSourceReady,
    // Exclude partial historical months from FY TOTALS and COST-RATE
    // denominators; their original source rows stay in raw for drilldowns.
    amount: hasSource && costSourceReady ? total : null,
    heads, metres, weightedPicks, picksReliable,
    machineDays: num(d.summary?.machine_days),
    mode,
    coverageDate: sourceDate || undefined,
    raw: d, status: 'ready',
    reason: !hasSource ? 'No recorded expenses for this month'
      : !headsMatch ? 'Monthly expense totals do not match'
      : !costSourceReady ? 'Electricity or Salary not recorded for this month' : undefined,
  };
}
export type YearStats = {
  year: number;
  months: CostMonth[];
  total: number;
  verified: boolean;
  pending: number;
  missing: number;
  partial: number;
  ready: number;
  heads: Record<CostHead, number>;
  metres: number;
  weightedPicks: number;
  machineDays: number;
  costPerPick: number | null;
  costPerMetre: number | null;
  costPerMcDay: number | null;
  monthlyAverage: number | null;
  bestMonth: CostMonth | null;
};
export function summarizeYear(year: number, months: CostMonth[]): YearStats {
  const withData = months.filter(m => m.available && m.amount !== null);
  const missing = months.filter(m => m.status === 'unavailable' || m.status === 'error' || (m.status === 'ready' && m.amount === null)).length;
  const pending = months.filter(m => m.status === 'loading' || m.status === 'not-requested').length;
  const partial = withData.filter(m => !m.complete).length;
  const heads = HEADS.reduce((a, h) => { a[h.key] = withData.reduce((t, m) => t + m.heads[h.key], 0); return a; }, {} as Record<CostHead, number>);
  const total = withData.reduce((s, m) => s + num(m.amount), 0);
  // Production is an independent, valid ERP measure even where historical
  // Electricity/Salary were not entered. Do not erase production when
  // excluding an incomplete month from COST aggregation.
  const metres = months.filter(m => m.raw && m.status === 'ready')
    .reduce((s, m) => s + m.metres, 0);
  const costMetres = withData.reduce((s, m) => s + m.metres, 0);
  const weightedPicks = withData.reduce((s, m) => s + m.weightedPicks, 0);
  const allPpiVerified = withData.every(m => m.metres <= 0 || m.picksReliable);
  const machineDays = withData.reduce((s, m) => s + m.machineDays, 0);
  const bestMonth = withData.length ? withData.reduce((a,b)=>num(b.amount)>num(a.amount)?b:a) : null;
  return {
    year, months, total,
    verified: pending === 0 && missing === 0 && partial === 0 && withData.length === months.length,
    pending, missing, partial, ready: withData.length, heads, metres, weightedPicks, machineDays,
    costPerPick: allPpiVerified && weightedPicks > 0 ? total / weightedPicks : null,
    costPerMetre: costMetres > 0 ? total / costMetres : null,
    costPerMcDay: machineDays > 0 ? total / machineDays : null,
    monthlyAverage: withData.length > 0 ? total / withData.length : null,
    bestMonth,
  };
}


/**
 * Count the actual daily cost-entry events signalled by the existing Expense
 * report, not the calculated Section A/B or Rapier/Waterjet allocations.
 * Each (date, expense type) is one entry; a single calendar day can contain
 * separate Electricity and Salary entries. The ERP does not expose raw Stores
 * voucher counts here, so those are intentionally outside this KPI.
 *
 * null means the API supplied no entry evidence; it never means zero.
 */
export function countSavedExpenseEntries(month: CostMonth): number | null {
  if (!month.available || month.amount === null || !month.raw) return null;
  const source = (month.raw as any).entries;
  // The optional RC8 read-only source returns actual saved Store records as
  // well as Unit/Salary/Daily Expense. Prefer it to any inferred day count.
  if (source && source.basis === 'saved_erp_records' &&
      Number.isInteger(Number(source.total)) && Number(source.total) >= 0 &&
      source.includes_stores === true) return Number(source.total);

  // Compatibility for servers not yet upgraded: legacy trends omit Salary
  // allocation flags even when ExpCosting has saved salary. A nonzero manual
  // salary is evidence of a record; a Section allocation is NOT an entry.
  const rows = month.raw.trends?.expense_daily;
  if (!Array.isArray(rows)) return null;
  const counted = new Set<string>();
  let evidencePresent = false;
  for (const row of rows) {
    if (!row || typeof row !== 'object') continue;
    const date = num(row.date_ymd);
    if (!Number.isInteger(date) || date <= 0) continue;
    for (const key of ['electricity_entry_exists', 'salary_entry_exists',
                       'maintenance_entry_exists', 'other_entry_exists']) {
      if (typeof row[key] !== 'boolean') continue;
      if (row[key] === true) {
        evidencePresent = true;
        counted.add(`${date}:${key}`);
      }
    }
    if (month.mode === 'legacy_rapier_waterjet') {
      if (Math.abs(num(row.rapier_salary)) + Math.abs(num(row.waterjet_salary)) > .005) {
        evidencePresent = true;
        counted.add(`${date}:salary_entry_exists`);
      }
      if (num(row.electricity) > .005) {
        evidencePresent = true;
        counted.add(`${date}:electricity_entry_exists`);
      }
    }
  }
  // The old API does not expose raw Store vouchers. When Stores have a cost,
  // showing 0 from the four other heads would be actively misleading.
  if (month.heads.stores > .005) return null;
  return evidencePresent ? counted.size : null;
}

/**
 * Only publish a cost-based year-over-year % when BOTH periods have adequate
 * comparable cost input coverage. Older FYs can contain production and Stores
 * but lack historical daily Electricity/Salary entries; comparing such costs
 * against complete 2026 expenses creates dramatic but misleading percentages.
 * This is a validation of comparison eligibility, not an adjustment to cost.
 *
 * A partial as-of final month is allowed when both daily inputs have been
 * entered for most of the days production was recorded. Historical/full
 * months still need source expense coverage of their own.
 */
export function hasComparableCostCoverage(month: CostMonth): boolean {
  if (!month.available || month.amount === null || !month.raw) return false;
  const period = month.raw.period;
  // A genuine cost comparison requires BOTH independent expenses for the
  // selected month, not merely production and allocated Stores. Otherwise the
  // historical total is a different accounting basis from the current one.
  if (month.metres <= 0 || month.heads.electricity <= 0 || month.heads.salary <= 0) return false;
  if (month.complete) return true;
  // Open month may lag data entry by up to two days, as permitted by the
  // existing monthly expense dashboard (no backfilled value is invented).
  const requested = num(period?.requested_upto_ymd);
  const through = num(period?.complete_through_ymd);
  const end = num(fyMonthEnd(month.year, month.index).replace(/-/g, ''));
  const toUTC = (ymd: number) => {
    const raw = String(Math.trunc(ymd));
    if (!/^\d{8}$/.test(raw)) return NaN;
    return Date.UTC(+raw.slice(0,4), +raw.slice(4,6)-1, +raw.slice(6,8));
  };
  const lag = (toUTC(requested) - toUTC(through)) / 86400000;
  return requested > 0 && requested < end && through > 0 && lag >= 0 && lag <= 2;
}

export function areComparableCostPeriods(
  focus: YearStats,
  previous: YearStats,
): boolean {
  if (focus.months.length === 0 || focus.months.length !== previous.months.length) return false;
  if (focus.ready !== focus.months.length || previous.ready !== previous.months.length) return false;
  return focus.months.every((m, i) =>
    hasComparableCostCoverage(m) && hasComparableCostCoverage(previous.months[i])
  );
}


/** Read-only, per-month reconciliation of the values received from the existing
 * monthly Production Cost API. This does not manufacture missing expenses,
 * overwrite cost or infer undocumented historical accounting entries. */
export type CostMonthAudit = {
  month: CostMonth;
  expenseTotal: number | null;
  expenseHeadSum: number | null;
  costReconciles: boolean | null;
  electricity: number | null;
  salary: number | null;
  stores: number | null;
  checkedMetres: number | null;
  dailyCheckedMetres: number | null;
  metresReconcile: boolean | null;
  checkedWeightedPicks: number | null;
  missingPpiMetres: number | null;
  ppiSource: 'monthly_erp' | 'checked_design' | 'unavailable';
  electricityLastDate: number | null;
  salaryLastDate: number | null;
  costThroughDate: number | null;
  requestedThroughDate: number | null;
  latestProductionDate: number | null;
  dailyExpenseEntries: number | null;
  storeRecords: number | null;
  totalEntries: number | null;
  entriesReconcile: boolean | null;
  comparableCost: boolean;
  issues: string[];
};
const validNumber = (v: unknown): number | null =>
  v === undefined || v === null || v === '' || !Number.isFinite(Number(v))
    ? null : Number(v);
export function auditCostMonth(m: CostMonth): CostMonthAudit {
  const d = m.raw as any;
  const summary = d?.summary;
  const composition = d?.composition;
  const period = d?.period;
  const daily = Array.isArray(d?.production?.daily_trend) ? d.production.daily_trend : [];
  const checks = daily.map((r:any) => num(r.section_a_mtr) + num(r.section_b_mtr));
  const dailyCheckedMetres = d ? checks.reduce((a:number,b:number)=>a+b,0) : null;
  const expenseTotal = d ? validNumber(summary?.total_cost) : null;
  const expenseHeadSum = composition
    ? ['electricity','salary','stores','maintenance','other'].reduce((t,h)=>t+num(composition[h]),0) : null;
  const costReconciles = expenseTotal === null || expenseHeadSum === null ? null
    : Math.abs(expenseTotal-expenseHeadSum) <= Math.max(1,Math.abs(expenseTotal)*.000001);
  const checkedMetres = d ? validNumber(summary?.production_mtr) : null;
  const metresReconcile = checkedMetres === null || dailyCheckedMetres === null ? null
    : Math.abs(checkedMetres-dailyCheckedMetres) <= Math.max(.1,daily.length*.005);
  const saved = d?.entries;
  const dailyExpenseEntries = saved?.basis === 'saved_erp_records'
    ? ['electricity','salary','maintenance','other'].reduce((t,h)=>t+num(saved[h]),0) : null;
  const storeRecords = saved?.basis === 'saved_erp_records'
    ? num(saved.stores_receipt_rows)+num(saved.stores_issue_vouchers) : null;
  const totalEntries = saved?.basis === 'saved_erp_records' ? validNumber(saved.total) : null;
  const entriesReconcile = totalEntries === null || dailyExpenseEntries === null || storeRecords === null
    ? null : Math.abs(totalEntries-dailyExpenseEntries-storeRecords)<.005;
  const missingPpiMetres = daily.length
    ? daily.reduce((t:number,r:any)=>t+num(r.missing_ppi_mtr),0) : null;
  const checkedWeightedPicks = daily.length
    ? daily.reduce((t:number,r:any)=>t+num(r.section_a_weighted_picks)+num(r.section_b_weighted_picks),0) : null;
  const ppiSource = !m.picksReliable ? 'unavailable'
    : num(d?.picks?.weighted_total)>0 ? 'monthly_erp' : 'checked_design';
  const electricityLastDate = validNumber(period?.source_coverage?.electricity_last_entered_ymd);
  const salaryLastDate = validNumber(period?.source_coverage?.salary_last_entered_ymd);
  const latestProductionDate = validNumber(d?.production?.latest_date_ymd)
    ?? (daily.length ? Math.max(...daily.map((r:any)=>num(r.date_ymd))) : null);
  const costThroughDate = validNumber(period?.upto_date_ymd);
  const requestedThroughDate = validNumber(period?.requested_upto_ymd);
  const issues: string[] = [];
  if (!d) issues.push(m.status === 'loading' ? 'Loading' : m.status === 'error' ? 'Could not load monthly expense data' : 'No monthly expense data');
  else {
    if (expenseTotal === null) issues.push('Monthly cost is missing');
    if (costReconciles === false) issues.push('Cost does not match expense-head total');
    if (metresReconcile === false) issues.push('Checking metres differ from the daily records');
    if (num(composition?.electricity) <= 0) issues.push('Electricity not recorded');
    if (num(composition?.salary) <= 0) issues.push('Salary not recorded');
    if (ppiSource === 'unavailable' && num(checkedMetres) > 0) issues.push('Checked-design picks not fully available');
    if (missingPpiMetres !== null && missingPpiMetres > .005) issues.push('Design PPI missing on checked metres');
    if (entriesReconcile === false) issues.push('Expense entry count does not reconcile');
    if (costThroughDate !== null && requestedThroughDate !== null && costThroughDate < requestedThroughDate)
      issues.push('Cost inputs end before the requested date');
  }
  return {
    month:m, expenseTotal, expenseHeadSum, costReconciles,
    electricity: d?validNumber(composition?.electricity):null,
    salary: d?validNumber(composition?.salary):null,
    stores: d?validNumber(composition?.stores):null,
    checkedMetres,dailyCheckedMetres,metresReconcile,checkedWeightedPicks,missingPpiMetres,ppiSource,
    electricityLastDate,salaryLastDate,costThroughDate,requestedThroughDate,latestProductionDate,
    dailyExpenseEntries,storeRecords,totalEntries,entriesReconcile,
    comparableCost:hasComparableCostCoverage(m),issues,
  };
}
export function sumEntryTypes(months: CostMonth[]) {
  const audits=months.map(auditCostMonth);
  if (audits.some(a=>a.dailyExpenseEntries===null || a.storeRecords===null || a.totalEntries===null)) return null;
  return {
    daily: audits.reduce((t,a)=>t+num(a.dailyExpenseEntries),0),
    stores: audits.reduce((t,a)=>t+num(a.storeRecords),0),
    total: audits.reduce((t,a)=>t+num(a.totalEntries),0),
    reconciled: audits.every(a=>a.entriesReconcile===true),
  };
}

export type SectionCost = { name: string; amount: number; head: CostHead; days: {date:number; amount:number}[] };
const dailyField = (section: string, head: CostHead) => {
  const suffix = head === 'stores' ? 'stores_allocated' : head;
  return `${section}_${suffix}`;
};
function validatedLegacyDays(trend: Record<string, unknown>[], group: 'rapier' | 'waterjet', head: CostHead, expected: number) {
  const suffix = head === 'stores' ? 'stores_allocated' : head;
  const key = `${group}_${suffix}`;
  const days = trend.filter(row => row[key] != null)
    .map(row => ({ date: num(row.date_ymd), amount: num(row[key]) }))
    .filter(row => Math.abs(row.amount) > .005);
  // Legacy reported totals may include month-end adjustments; only show the
  // daily split if it exactly follows the independently verified month total.
  return Math.abs(days.reduce((s,d)=>s+d.amount,0)-expected) <= Math.max(1,trend.length*.03) ? days : [];
}
/** Get factual head/section entries from monthly daily trend, only when they
 * reconcile to the authoritative monthly head total. Never scale/fabricate. */
export function monthSectionRows(m: CostMonth, head: CostHead): SectionCost[] | null {
  if (!m.available || !m.raw) return null;
  const amount = m.heads[head];
  const trend = (m.raw.trends?.expense_daily ?? []) as Record<string, unknown>[];
  if (m.mode === 'legacy_rapier_waterjet') {
    const rapier = num((m.raw.division as any)?.rapier?.[head]);
    const jet = num((m.raw.division as any)?.waterjet?.[head]);
    if (Math.abs((rapier + jet) - amount) > 1) return null;
    return [
      { name: 'Rapier · historical', amount: rapier, head, days: validatedLegacyDays(trend, 'rapier', head, rapier) },
      { name: 'Waterjet · historical', amount: jet, head, days: validatedLegacyDays(trend, 'waterjet', head, jet) },
    ].filter(row => Math.abs(row.amount) > 0.005);
  }
  const rows: SectionCost[] = ['a','b'].map(section => {
    const field = dailyField(`section_${section}`, head);
    const days = trend.filter(row => row[field] !== null && row[field] !== undefined)
      .map(row => ({ date: num(row.date_ymd), amount: num(row[field]) }))
      .filter(row => Math.abs(row.amount) > 0.005);
    return { name: `Section ${section.toUpperCase()}`, amount: days.reduce((s,row)=>s+row.amount,0), head, days };
  });
  const sum = rows.reduce((s, r) => s + r.amount, 0);
  if (Math.abs(sum - amount) > Math.max(1, (trend.length || 1) * .03)) return null;
  return rows.filter(row => Math.abs(row.amount) > 0.005);
}

/**
 * Claude's Entries tile counts non-zero cost lines by Expense Head and
 * Section / historical division. It does NOT count voucher rows or daily
 * save events. The monthly expense-card's composition is authoritative.
 *
 * Some legitimate monthly heads cannot be split into sections: for example,
 * October's independently entered Electricity may extend beyond the final
 * Salary cutoff, and historical shared meters need not add to the legacy
 * rapier/waterjet display allocations. In those cases one real, non-zero
 * Expense Head is one line. Never fail the ENTIRE FY entry count merely
 * because a single head's section allocation is unavailable.
 *
 * No monetary values are added, changed, estimated or redistributed here.
 */
export function countExpenseCostLines(month: CostMonth): number | null {
  if (!month.available || month.amount === null || !month.raw) return null;
  const tolerance = (v: number) => Math.max(1, Math.abs(v) * 0.000001);
  const raw = month.raw as any;

  // The optional server-side breakdown can be used when *every* head in it
  // reconciles to the monthly card. If its all-or-nothing verification failed,
  // compute per-head counts below instead of returning a blank KPI.
  const fromServer = raw.fy_cost_lines;
  if (fromServer?.basis === 'expense_head_section' && fromServer.verified === true) {
    const lines: any[] = Array.isArray(fromServer.lines) ? fromServer.lines : [];
    const reported = Number(fromServer.count);
    const validLines = Number.isInteger(reported) && reported === lines.length
      && lines.every((r: any) => r && typeof r.head === 'string'
        && typeof r.section === 'string' && Number.isFinite(Number(r.amount))
        && Number(r.amount) > .005);
    if (validLines) {
      const validHeads = HEADS.every(h => {
        const sum = lines.filter(r => r.head === h.key)
          .reduce((t, r) => t + Number(r.amount), 0);
        return Math.abs(sum - month.heads[h.key]) <= tolerance(month.heads[h.key]);
      });
      if (validHeads) return reported;
    }
  }

  let count = 0;
  for (const { key } of HEADS) {
    const amount = month.heads[key];
    if (!Number.isFinite(amount)) return null;
    if (amount <= .005) continue;
    let shares: number[] | null = null;
    if (month.mode === 'legacy_rapier_waterjet') {
      const a = raw.division?.rapier?.[key];
      const b = raw.division?.waterjet?.[key];
      if (a != null && b != null && Number.isFinite(Number(a)) && Number.isFinite(Number(b))) {
        shares = [Number(a), Number(b)];
      }
    } else {
      const group = raw.section_ab?.[key];
      if (group && typeof group === 'object') {
        const aField = key === 'stores' ? 'final_section_a_amount'
          : key === 'maintenance' || key === 'other' ? 'section_a_allocated'
          : 'section_a_amount';
        const bField = key === 'stores' ? 'final_section_b_amount'
          : key === 'maintenance' || key === 'other' ? 'section_b_allocated'
          : 'section_b_amount';
        if (group[aField] != null && group[bField] != null
          && Number.isFinite(Number(group[aField])) && Number.isFinite(Number(group[bField]))) {
          shares = [Number(group[aField]), Number(group[bField])];
        }
      }
    }
    if (shares && shares.every(v => v >= -.005)
      && Math.abs(shares[0] + shares[1] - amount) <= tolerance(amount)) {
      count += shares.filter(v => v > .005).length;
    } else {
      // Authoritative expense head exists, but its section split is not
      // comparable to the monthly summary: count the saved head ONCE, not
      // two guessed section lines, and never suppress unrelated heads.
      count += 1;
    }
  }
  return count;
}
