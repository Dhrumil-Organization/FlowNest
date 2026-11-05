// Read-only Samples dashboard statistics derived from the same movement replay as Sampling Hub.
// Each sample is one record for inventory card totals. A batch's available units are retained
// as a separate quantity, and dispatches count movement events (not distinct samples).
import { ListData, Move, Sample, smpState, SmpState, SMP_TYPE } from '@/src/screens/samplingHub/samplingHubModel';

export type SampleSnapshot = { sample: Sample; state: SmpState };
export type SamplesDashboardStats = {
  asOf: string; monthStart: string; created: number; dispatched: number;
  inStore: number; out: number; sent: number; atEvents: number; storeUnits: number;
  createdItems: SampleSnapshot[]; storeItems: SampleSnapshot[]; outItems: SampleSnapshot[];
  latestDispatches: { move: Move; sample: Sample | null }[];
  allItems: SampleSnapshot[];
};

export function sampleDashboardStats(data: ListData, asOf: string): SamplesDashboardStats {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(asOf) ? asOf : data.today;
  const monthStart = date.slice(0, 7) + '-01';
  const active = data.samples.filter(sm => sm.created && sm.created.slice(0, 10) <= date);
  const validIds = new Set(active.map(sm => sm.id));
  const validMoves = data.moves.filter(m => validIds.has(m.sample) && m.date && m.date.slice(0, 10) <= date);
  const byId = new Map(active.map(sm => [sm.id, sm] as const));
  const allItems = active.map(sample => ({sample, state: smpState(sample, validMoves)}));
  const createdItems = allItems.filter(x => x.sample.created.slice(0, 10) >= monthStart);
  const storeItems = allItems.filter(x => x.state.code === 'in');
  const outItems = allItems.filter(x => x.state.code === 'out' || x.state.code === 'use');
  const dispatches = validMoves.filter(m => m.purpose === 'dispatch' && m.date.slice(0, 10) >= monthStart)
    .slice().sort((a,b) => b.date.localeCompare(a.date) || b.id - a.id);
  return {
    asOf: date, monthStart, created: createdItems.length, dispatched: dispatches.length,
    inStore: storeItems.length, out: outItems.length,
    sent: allItems.filter(x => x.state.code === 'sent').length,
    atEvents: allItems.filter(x => x.state.code === 'event' || Object.keys(x.state.atEvents).length > 0).length,
    storeUnits: storeItems.reduce((sum, x) => sum + x.state.bal, 0),
    createdItems, storeItems, outItems, allItems,
    latestDispatches: dispatches.map(move => ({move, sample: byId.get(move.sample) || null})),
  };
}

export function sampleDisplayName(sample: Sample | null): string {
  if (!sample) return 'Sample';
  const type = SMP_TYPE[sample.type]?.lbl || 'Sample';
  const design = sample.design || (sample.type === 'booklet' ? sample.range : '');
  const color = sample.colourway || sample.colour;
  return [type, design, color, sample.metres ? `${sample.metres} m` : ''].filter(Boolean).join(' · ');
}

export function sampleDateLabel(iso: string): string {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso || '—';
  const m = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${iso.slice(8,10)} ${m[Number(iso.slice(5,7))-1]} ${iso.slice(0,4)}`;
}
