/** Pure grouping logic for the Claude Daily Production report. No UI dependencies. */
export type Mode = 'shed' | 'category' | 'design';
export type Key = 'shed' | 'category' | 'design' | 'day' | 'machine' | 'beam';
export type Step = { field: Key; value: string; label: string };
export type DailyRow = {
  prpcode: string;
  process_uid: number | string;
  beam_uid: number | string;
  machine_code: string;
  machine_name?: string | null;
  machine_label?: string | null;
  machine_group_name?: string | null;
  shed_key: string;
  shed_label: string;
  category_code?: string | null;
  category_name?: string | null;
  design_code?: number | string | null;
  design_name?: string | null;
  chkdate: number | string;
  metres: number | string;
  checking_rows: number | string;
};
export type ShedSpec = { key: string; label: string; color: string; range: string; fleet: number };
export type Bucket = {
  key: string; label: string; metres: number; rolls: number;
  machines: Set<string>; beams: Set<string>; designs: Set<string>;
  entries: DailyRow[];
};
export const measure = (rows: DailyRow[]) => rows.reduce((total, row) => total + Number(row.metres || 0), 0);
export const rollCount = (rows: DailyRow[]) => rows.reduce((total, row) => total + Number(row.checking_rows || 0), 0);
export const machineKey = (row: DailyRow) => `${row.prpcode}|${row.machine_code}`;
export const processKey = (row: DailyRow) => `${row.prpcode}|${row.process_uid}`;
export const designKey = (row: DailyRow) => `${row.prpcode}|${row.design_code ?? 'UNRESOLVED'}`;
export function keyOf(row: DailyRow, field: Key): string {
  switch (field) {
    case 'shed': return row.shed_key || 'UNMAPPED';
    case 'category': return `${row.prpcode}|${row.category_code ?? 'UNRESOLVED'}`;
    case 'design': return designKey(row);
    case 'machine': return machineKey(row);
    case 'beam': return processKey(row);
    case 'day': return String(row.chkdate);
  }
}
export function labelOf(row: DailyRow, field: Key): string {
  switch (field) {
    case 'shed': return row.shed_label || 'UNMAPPED MACHINES';
    case 'category': return row.category_name || 'UNRESOLVED CATEGORY';
    case 'design': return row.design_name || 'UNRESOLVED DESIGN';
    case 'machine': return row.machine_label || row.machine_name || String(row.machine_code);
    case 'beam': return `Beam ${row.beam_uid}${Number(row.beam_uid) < 0 ? ' · Carry-forward' : ''} · Process ${row.process_uid}`;
    case 'day': {
      const raw = String(row.chkdate);
      return raw.length === 8 ? `${raw.slice(6,8)}-${raw.slice(4,6)}-${raw.slice(0,4)}` : raw;
    }
  }
}
export function levelsFor(mode: Mode, multiDay: boolean): Key[] {
  if (mode === 'shed') return ['shed', 'machine', 'design', 'beam'];
  if (mode === 'category') return ['category', 'design', ...(multiDay ? ['day' as Key] : []), 'machine', 'beam'];
  return ['design', ...(multiDay ? ['day' as Key] : []), 'machine', 'beam'];
}
export function withinPath(rows: DailyRow[], path: Step[]): DailyRow[] {
  return rows.filter((r) => path.every((p) => keyOf(r, p.field) === p.value));
}
export function bucketsOf(rows: DailyRow[], field: Key): Bucket[] {
  const map = new Map<string, Bucket>();
  for (const r of rows) {
    const key = keyOf(r, field);
    let bucket = map.get(key);
    if (!bucket) {
      bucket = { key, label: labelOf(r, field), metres: 0, rolls: 0,
        machines: new Set(), beams: new Set(), designs: new Set(), entries: [] };
      map.set(key, bucket);
    }
    bucket.metres += Number(r.metres || 0);
    bucket.rolls += Number(r.checking_rows || 0);
    bucket.machines.add(machineKey(r));
    bucket.beams.add(processKey(r));
    bucket.designs.add(designKey(r));
    bucket.entries.push(r);
  }
  const sorted = [...map.values()].sort((a, b) => b.metres - a.metres);
  if (field === 'day') sorted.sort((a, b) => a.key.localeCompare(b.key));
  return sorted;
}
export function deltaPercent(now: number, prior: number | null): number | null {
  if (prior === null || prior <= 0) return null;
  return Math.round((now - prior) * 100 / prior);
}
export function ymdToIso(value: string | number): string {
  const s = String(value);
  return /^\d{8}$/.test(s) ? `${s.slice(0,4)}-${s.slice(4,6)}-${s.slice(6,8)}` : s;
}
export function shiftIso(s: string, days: number): string {
  const [y, m, d] = s.split('-').map(Number);
  const v = new Date(y, m - 1, d, 12);
  v.setDate(v.getDate() + days);
  return `${v.getFullYear()}-${String(v.getMonth()+1).padStart(2,'0')}-${String(v.getDate()).padStart(2,'0')}`;
}
export function seriesFor(rows: DailyRow[], from: string, to: string, maxDays = 63) {
  const out: { day: string; metres: number }[] = [];
  const byDay = new Map<string, number>();
  for (const r of rows) {
    const day = ymdToIso(r.chkdate);
    byDay.set(day, (byDay.get(day) || 0) + Number(r.metres || 0));
  }
  for (let day = from; day <= to && out.length < maxDays; day = shiftIso(day, 1)) {
    out.push({ day, metres: byDay.get(day) || 0 });
  }
  return out;
}
