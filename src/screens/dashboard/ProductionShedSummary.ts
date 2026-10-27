/**
 * Physical-shed totals for the Owner Production card.
 * The Laravel production_full service owns machine classification; this
 * module ONLY sums returned shed_key values. Never infer width by MacGrp or
 * process PrpCode (both can span multiple physical sheds).
 */
import type { DailyRow, ShedSpec } from './ProductionDailyModel';

export type ProductionShedTotal = {
  key: string; label: string; yesterdayMetres: number; mtdMetres: number;
  unassigned?: boolean;
};
export type ProductionShedSummary = {
  sheds: ProductionShedTotal[];
  classifiedMtd: number;
  unassignedMtd: number;
  totalMtd: number;
};

// Keys are the verified production_full shed_catalog identifiers.
const SHEDS = [
  { key: 'MW', label: 'M WEAVES' },
  { key: 'S190', label: 'S. RAPIER (190 CM)' },
  { key: 'S230', label: 'S. RAPIER (230 CM)' },
  { key: 'WJ', label: 'WATERJET' },
] as const;

export function buildProductionShedSummary(
  rows: DailyRow[], catalog: ShedSpec[], actualThroughYmd: number | string
): ProductionShedSummary {
  const through = String(actualThroughYmd ?? '').trim();
  const allowed = new Map<string, ProductionShedTotal>();
  const catalogLabels = new Map((catalog || []).map(s => [String(s.key), String(s.label)]));
  for (const spec of SHEDS) {
    allowed.set(spec.key, {
      key: spec.key,
      label: catalogLabels.get(spec.key) || spec.label,
      yesterdayMetres: 0,
      mtdMetres: 0,
    });
  }
  let unassignedMtd = 0;
  let unassignedYesterday = 0;
  for (const row of rows || []) {
    const amount = Number(row.metres);
    if (!Number.isFinite(amount)) continue;
    const key = String(row.shed_key ?? '').trim();
    const match = allowed.get(key);
    const isLastDay = String(row.chkdate ?? '').trim() === through;
    if (match) {
      match.mtdMetres += amount;
      if (isLastDay) match.yesterdayMetres += amount;
    } else {
      // Includes UNMAPPED and unexpected codes. Do not lose output silently.
      unassignedMtd += amount;
      if (isLastDay) unassignedYesterday += amount;
    }
  }
  const sheds: ProductionShedTotal[] = [...allowed.values()];
  const classifiedMtd = sheds.reduce((sum, shed) => sum + shed.mtdMetres, 0);
  if (unassignedMtd !== 0) {
    sheds.push({
      key: 'UNMAPPED', label: 'UNASSIGNED MACHINES',
      yesterdayMetres: unassignedYesterday, mtdMetres: unassignedMtd,
      unassigned: true,
    });
  }
  return { sheds, classifiedMtd, unassignedMtd, totalMtd: classifiedMtd + unassignedMtd };
}
