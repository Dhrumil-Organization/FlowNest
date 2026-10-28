/**
 * Sales FY — Achievement vs Target.
 * Uses the BILLING row of the existing monthly Target Card contract, rather
 * than synthesising targets from FY Sales bills or mixing SO/Collection stages.
 * No monetary target is inferred for a missing month.
 */
export type FyBillingTargetMonth = {
  monthKey: string;
  index: number;
  target: number;
  billed: number;
  source: string;
  configured: boolean;
};

export type FyBillingTargetSummary = {
  billed: number;
  target: number;
  pct: number | null;
  expectedMonths: number;
  availableMonths: number;
  missingMonths: number;
  hasAutomaticGoals: boolean;
};

export function parseFyBillingTargetMonth(
  payload: any,
  monthKey: string,
  index: number,
): FyBillingTargetMonth | null {
  // The API has {success,response:{configured,scope,cards}}, not {data:...}.
  if (!payload || payload.success !== true || payload.response?.configured !== true) return null;
  if (payload.response?.scope?.configured === false) return null;
  const cards = payload.response?.cards;
  if (!Array.isArray(cards)) return null;
  const billing = cards.find((item: any) => String(item?.key || '').toUpperCase() === 'BILLING');
  if (!billing) return null;
  const target = Number(billing.target);
  const billed = Number(billing.actual);
  // A zero-amount billed month can be valid; a zero/absent target is not.
  if (!Number.isFinite(target) || target <= 0 || !Number.isFinite(billed)) return null;
  const periodKey = String(payload.response?.period?.from_date || '').slice(0, 7);
  if (periodKey && periodKey !== monthKey) return null;
  return {
    monthKey, index, target, billed,
    source: String(billing.target_source || 'UNKNOWN'),
    configured: Boolean(billing.target_configured),
  };
}

export function summarizeFyBillingTarget(
  values: Array<FyBillingTargetMonth | null | undefined>,
  expectedMonths: number,
): FyBillingTargetSummary {
  const expected = Math.max(0, Math.min(12, Math.floor(Number(expectedMonths) || 0)));
  const months = values.slice(0, expected).filter((row): row is FyBillingTargetMonth => Boolean(row));
  const target = months.reduce((sum, row) => sum + row.target, 0);
  const billed = months.reduce((sum, row) => sum + row.billed, 0);
  const complete = expected > 0 && months.length === expected && target > 0;
  return {
    billed, target,
    pct: complete ? (billed / target) * 100 : null,
    expectedMonths: expected,
    availableMonths: months.length,
    missingMonths: Math.max(0, expected - months.length),
    hasAutomaticGoals: months.some(row => row.source !== 'MANUAL_MONTHLY_TARGET'),
  };
}

export function billingAchievementChange(
  current: FyBillingTargetSummary | undefined,
  previous: FyBillingTargetSummary | undefined,
): number | null {
  if (current?.pct == null || previous?.pct == null || previous.pct <= 0) return null;
  return ((current.pct - previous.pct) / previous.pct) * 100;
}
