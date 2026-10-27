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
  amount: number | null;
  heads: Record<CostHead, number>;
  metres: number;
  weightedPicks: number;
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
    ...base, available: false, complete: false, hasSource: false, amount: null,
    heads: empty, metres: 0, weightedPicks: 0, machineDays: 0,
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
  const avg = num(d.summary?.avg_picks);
  const metres = num(d.summary?.production_mtr);
  return {
    ...base, available: hasSource, complete, hasSource,
    amount: hasSource && headsMatch ? total : null,
    heads, metres, weightedPicks: num((d.picks as any)?.weighted_total) || metres * avg,
    machineDays: num(d.summary?.machine_days),
    mode: (d.meta as any)?.calculation_mode === 'section_ab'
      ? 'section_ab' : 'legacy_rapier_waterjet',
    coverageDate: sourceDate || undefined,
    raw: d, status: 'ready',
    reason: !hasSource ? 'No expense entries for this month'
      : !headsMatch ? 'Cost components do not reconcile with monthly total' : undefined,
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
  const metres = withData.reduce((s, m) => s + m.metres, 0);
  const weightedPicks = withData.reduce((s, m) => s + m.weightedPicks, 0);
  const machineDays = withData.reduce((s, m) => s + m.machineDays, 0);
  const bestMonth = withData.length ? withData.reduce((a,b)=>num(b.amount)>num(a.amount)?b:a) : null;
  return {
    year, months, total,
    verified: pending === 0 && missing === 0 && partial === 0 && withData.length === months.length,
    pending, missing, partial, ready: withData.length, heads, metres, weightedPicks, machineDays,
    costPerPick: weightedPicks > 0 ? total / weightedPicks : null,
    costPerMetre: metres > 0 ? total / metres : null,
    costPerMcDay: machineDays > 0 ? total / machineDays : null,
    monthlyAverage: withData.length > 0 ? total / withData.length : null,
    bestMonth,
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
