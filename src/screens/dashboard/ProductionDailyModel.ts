/** Pure grouping logic for the Claude Daily Production report. No UI dependencies. */
export type Mode = 'shed' | 'category' | 'design';
export type Key = 'shed' | 'category' | 'design' | 'day' | 'machine' | 'beam';
export type Step = { field: Key; value: string; label: string };
export type DailyRow = {
  prpcode: string;
  process_uid: number | string;
  beam_uid: number | string;
  beam_no?: string | null;
  beam_warp_length?: number | string | null;
  beam_balance_length?: number | string | null;
  machine_code: string;
  machine_name?: string | null;
  machine_label?: string | null;
  machine_group_name?: string | null;
  erp_machine_group?: string | null;
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
/** Format operator-facing counts. Never label a single beam as “1 beams”. */
export function countLabel(count: number, singular: string, plural = `${singular}s`): string {
  const value = Number(count);
  return `${value.toLocaleString('en-IN', { maximumFractionDigits: 0 })} ${value === 1 ? singular : plural}`;
}
export const measure = (rows: DailyRow[]) => rows.reduce((total, row) => total + Number(row.metres || 0), 0);
export const rollCount = (rows: DailyRow[]) => rows.reduce((total, row) => total + Number(row.checking_rows || 0), 0);
/** Master lookups remain property-qualified; report grouping does not inherit that boundary. */
const groupName = (value: string | null | undefined, fallback: string): string =>
  String(value ?? '').trim().replace(/\s+/g, ' ').toLocaleUpperCase('en') || fallback;
const designNumber = (value: string | number | null | undefined): string => {
  const raw = String(value ?? '').trim();
  // SQL decimal identifiers may arrive as 65281, '65281' or '65281.000'.
  return /^\d+(?:\.0+)?$/.test(raw) ? raw.split('.')[0].replace(/^0+(?=\d)/, '') : raw;
};
/** A verified shed plus normalized loom label identifies a physical machine.
 * If the machine is not classified, preserve its source identity rather than guess.
 * Each underlying ERP entry retains its original PrpCode and MacCode. */
export const machineKey = (row: DailyRow): string => {
  const shed = String(row.shed_key ?? '').trim();
  const label = displayMachine(String(row.machine_label || '').trim());
  const parsed = /^([RW])-0*(\d{1,3})$/i.exec(label);
  return shed && shed !== 'UNMAPPED' && parsed
    ? `LOOM|${shed}|${parsed[1].toUpperCase()}${Number(parsed[2])}`
    : `SOURCE|${row.prpcode}|${row.machine_code}`;
};
export const processKey = (row: DailyRow) => `${row.prpcode}|${row.process_uid}`;
/** Format operator-facing machine labels without modifying the ERP machine code. */
export function displayMachine(label:string):string {
  const s=String(label||'').trim();
  const m=/^([RW])[-\s]*0*(\d{1,3})$/i.exec(s);
  return m?`${m[1].toUpperCase()}-${m[2].padStart(2,'0')}`:s;
}
// A beam is identified by its ERP beam UID, including negative prior-year carry-forwards.
// A process UID is a fallback only when the beam link is missing.
export const beamKey = (row: DailyRow) => `${row.prpcode}|${row.beam_uid === null || row.beam_uid === undefined || String(row.beam_uid).trim()==='' || String(row.beam_uid)==='0' ? `PROCESS:${row.process_uid}` : row.beam_uid}`;
/** Cross-property Design reporting combines only matching design code AND name.
 * Same code/different name or same name/different code are not proven identical.
 * PrpCode remains attached to each row for all ERP master/transaction lookups. */
export const designKey = (row: DailyRow): string => {
  const name = groupName(row.design_name, 'UNRESOLVED DESIGN');
  const code = designNumber(row.design_code) || 'UNRESOLVED';
  // An unresolved master code/name does not establish cross-property design identity.
  return name === 'UNRESOLVED DESIGN' || code === 'UNRESOLVED'
    ? `UNRESOLVED DESIGN|${row.prpcode}|${code}|${name}`
    : `DESIGN|${code}|${name}`;
};
/** Reporting category identity is the *resolved* category name, not PrpCode.
 * The service has already resolved FAMItem using PrpCode + store + item code. */
export const categoryKey = (row: DailyRow) => `CATEGORY|${groupName(row.category_name, 'UNRESOLVED CATEGORY')}`;
export function keyOf(row: DailyRow, field: Key): string {
  switch (field) {
    case 'shed': return row.shed_key || 'UNMAPPED';
    case 'category': return categoryKey(row);
    case 'design': return designKey(row);
    case 'machine': return machineKey(row);
    case 'beam': return beamKey(row);
    case 'day': return String(row.chkdate);
  }
}
export function labelOf(row: DailyRow, field: Key): string {
  switch (field) {
    case 'shed': return row.shed_label || 'UNMAPPED MACHINES';
    case 'category': return row.category_name || 'UNRESOLVED CATEGORY';
    case 'design': return row.design_name || 'UNRESOLVED DESIGN';
    case 'machine': return displayMachine(row.machine_label || row.machine_name || String(row.machine_code));
    case 'beam': return beamDisplayLabel(row);
    case 'day': {
      const raw = String(row.chkdate);
      return raw.length === 8 ? `${raw.slice(6,8)}-${raw.slice(4,6)}-${raw.slice(0,4)}` : raw;
    }
  }
}
/** Operator-facing BeamNo, never the internal BeamUId as the main label. */
export function beamDisplayLabel(row: Pick<DailyRow, 'beam_no' | 'beam_uid' | 'process_uid'>): string {
  const actual = String(row.beam_no ?? '').trim();
  if (actual) return actual;
  const uid = String(row.beam_uid ?? '').trim();
  // Never expose internal ERP identity or prior-year resolution mechanics in live UI.
  // The UID remains available unchanged for navigation and authorized database lookups.
  return 'Beam number unavailable';
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
    bucket.beams.add(beamKey(r));
    bucket.designs.add(designKey(r));
    bucket.entries.push(r);
  }
  const sorted = [...map.values()].sort((a, b) => b.metres - a.metres);
  if (field === 'design') {
    // Distinct ERP design codes can have an identical name. Preserve both,
    // but distinguish the rows with their business design code, not property.
    const byName = new Map<string, Bucket[]>();
    for (const bucket of sorted) {
      const name = groupName(bucket.label, 'UNRESOLVED DESIGN');
      const existing = byName.get(name) || [];
      existing.push(bucket);
      byName.set(name, existing);
    }
    for (const matches of byName.values()) {
      if (matches.length < 2) continue;
      for (const bucket of matches) {
        const code = designNumber(bucket.entries[0]?.design_code);
        if (code) bucket.label = `${bucket.label} · ${code}`;
      }
    }
  }
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

/** Raw checking rows are loaded only for single-day drill-in, from GryProcessC. */
export type CheckingRollRow = {
  prpcode: string; process_uid: number | string; beam_uid: number | string | null;
  beam_no?: string | null; beam_warp_length?: number | string | null;
  beam_balance_length?: number | string | null;
  machine_code: string; chkdate: number | string; srno: number | string;
  taka_no?: number | string | null; is_last_taka?: number | string | null;
  /** ERP GryProcessC.GrdCode; do not assume a descriptive grade name. */
  grade_code?: number | string | null;
  /** Name from property-qualified DAPGrade master, if available. */
  grade_name?: string | null;
  /** Checking workflow label, not a physical inventory balance. */
  checking_status?: string | null;
  /** ERP GryProcessC.ChkCode; NOT a verified stock/disposition status. */
  checking_code?: number | string | null;
  design_code?: number | string | null; design_name?: string | null; metres: number | string;
};
/** Keys intentionally preserve PrpCode so common process IDs cannot merge. */
export function checkingIdentity(row: {prpcode:string;process_uid:number|string;chkdate:number|string;design_code?:number|string|null}):string {
  return [row.prpcode,String(row.process_uid),String(row.chkdate),designNumber(row.design_code) || 'UNRESOLVED'].join('|');
}
/** Filter raw records by the already-authorized, already-scoped aggregate rows. */
export function checkingInScope(checking:CheckingRollRow[], aggregate:DailyRow[]):CheckingRollRow[]{
  const allowed = new Set(aggregate.map(checkingIdentity));
  return checking.filter(r=>allowed.has(checkingIdentity(r)));
}
