// FILE: src/screens/reports/beamShortage/beamTakaModel.ts
// Reports → Beam Shortage → taka-wise checking entries (the third level of the
// drill-down, opened from a beam × design line on either second page).
//
// Source: POST /reports/beam_shortage/takas
//   { prptype, prpcode, yearno, beamuid, dsncode }
// Answer (BeamShortageReportController::takas):
//   { success, data: { beam: {...}, takas: [...], summary: {...} } }
// Every taka is one GRYProcessC checking entry. Graded = the checking entry
// carries a grade (GrdCode not blank / 0) — the same value the GRADE column shows.
// gradeSummary() groups the takas grade-wise (takas · metres · share of metres).

import { num, parseAnyDate } from './beamShortageModel';

export type TakaEntry = {
  key: string;
  takaNo: string;
  chkDate: string; // YYYY-MM-DD
  shift: string;
  qty: number; // metres
  wt: number;
  avgWt: number;
  grdCode: string;
  grdName: string;
  chkCode: string;
  chkName: string;
  wvrName: string;
  supName: string;
  oprName: string;
  remarks: string;
  remarkC: string;
  remarkD: string;
  isSample: boolean;
  isMending: boolean;
  isLastTaka: boolean;
  orderNo: string;
  trackId: string;
  entryDate: string;
  entryTime: string;
  machine: string;
  gaitDate: string;
  dsnName: string;
  /** checking grade present (GrdCode not blank / 0) */
  graded: boolean;
};

export type TakaSummary = {
  takas: number;
  qty: number;
  wt: number;
  graded: number;
  notGraded: number;
  samples: number;
  mending: number;
};

export type TakaData = { takas: TakaEntry[]; summary: TakaSummary };

export type TakaRequest = {
  prptype: string;
  prpcode: string;
  yearno: string | number;
  beamuid: string | number;
  /** design of the line; '' = "Design not linked" line */
  dsncode: string;
};

export const EMPTY_TAKAS: TakaData = {
  takas: [],
  summary: { takas: 0, qty: 0, wt: 0, graded: 0, notGraded: 0, samples: 0, mending: 0 },
};

const lower = (row: any): Record<string, any> => {
  const out: Record<string, any> = {};
  if (row && typeof row === 'object') for (const k of Object.keys(row)) out[k.toLowerCase()] = row[k];
  return out;
};
const s = (v: any) => String(v ?? '').trim();
const flag = (v: any) => num(v) > 0;
/** a checking entry is graded when its GrdCode is filled (not blank, not 0) */
const hasGrade = (v: any) => {
  const g = s(v);
  if (!g) return false;
  return Number.isNaN(Number(g)) ? true : Number(g) !== 0; // text code = graded, numeric 0 = not graded
};

const unwrap = (response: any): any => {
  let body: any = response?.data ?? response;
  for (let i = 0; i < 4; i += 1) {
    if (!body || typeof body !== 'object' || Array.isArray(body)) break;
    if (Array.isArray(lower(body).takas)) break;
    const next = body.data ?? body.response ?? body.result;
    if (!next || typeof next !== 'object') break;
    body = next;
  }
  return body;
};

export const normalizeTakas = (response: any): TakaData => {
  const body = lower(unwrap(response));
  const list: any[] = Array.isArray(body.takas) ? body.takas : Array.isArray(response) ? response : [];
  const takas: TakaEntry[] = list.map((raw, i) => {
    const r = lower(raw);
    return {
      key: `${s(r.chkuid)}|${s(r.chksrno)}|${i}`,
      takaNo: s(r.takano),
      chkDate: parseAnyDate(r.chkdate),
      shift: s(r.shfcode),
      qty: num(r.qty),
      wt: num(r.wt),
      avgWt: num(r.avgwt),
      grdCode: s(r.grdcode),
      grdName: s(r.grdname),
      chkCode: s(r.chkcode),
      chkName: s(r.chkname),
      wvrName: s(r.wvrname),
      supName: s(r.supname),
      oprName: s(r.oprname),
      remarks: s(r.remarks),
      remarkC: s(r.remarkc),
      remarkD: s(r.remarkd),
      isSample: flag(r.issample),
      isMending: flag(r.ismending),
      isLastTaka: flag(r.islasttaka),
      orderNo: s(r.orderno),
      trackId: num(r.trackid) ? s(r.trackid) : '',
      entryDate: parseAnyDate(r.entrydate),
      entryTime: s(r.entrytime),
      machine: s(r.macname) || s(r.maccode),
      gaitDate: parseAnyDate(r.gaittingdate),
      dsnName: s(r.dsnname),
      graded: hasGrade(r.grdcode),
    };
  });
  return { takas, summary: summarize(takas) };
};

export const summarize = (takas: TakaEntry[]): TakaSummary => {
  const out = { ...EMPTY_TAKAS.summary };
  takas.forEach((t) => {
    out.takas += 1;
    out.qty += t.qty;
    out.wt += t.wt;
    if (t.graded) out.graded += 1; else out.notGraded += 1;
    if (t.isSample) out.samples += 1;
    if (t.isMending) out.mending += 1;
  });
  out.qty = Math.round(out.qty * 100) / 100;
  return out;
};

/* -------------------------------------------------------------------------- */
/*  grade-wise summary                                                         */
/* -------------------------------------------------------------------------- */

/** key of the "Not graded" group */
export const NO_GRADE = '__nograde';

/** grade group of a taka: its grade name (else code), or NO_GRADE */
export const gradeKeyOf = (t: TakaEntry) => (t.graded ? t.grdName || t.grdCode : NO_GRADE);

export type GradeGroup = {
  key: string;
  label: string; // grade name, or 'Not graded'
  code: string;
  takas: number;
  qty: number;
  /** share of the checked metres, % */
  share: number;
};

/**
 * Takas grouped grade-wise. Grades in grade-code order (1 = A, 2 = B …),
 * "Not graded" always last. Share = metres of the grade ÷ all checked metres.
 */
export const gradeSummary = (takas: TakaEntry[]): GradeGroup[] => {
  const map = new Map<string, GradeGroup>();
  let all = 0;
  takas.forEach((t) => {
    const key = gradeKeyOf(t);
    const g = map.get(key) || { key, label: key === NO_GRADE ? 'Not graded' : key, code: t.graded ? t.grdCode : '', takas: 0, qty: 0, share: 0 };
    g.takas += 1;
    g.qty += t.qty;
    all += t.qty;
    map.set(key, g);
  });
  const codeNo = (c: string) => (Number.isFinite(Number(c)) && c !== '' ? Number(c) : Number.MAX_SAFE_INTEGER);
  return [...map.values()]
    .map((g) => ({ ...g, qty: Math.round(g.qty * 100) / 100, share: all > 0 ? (g.qty / all) * 100 : 0 }))
    .sort((a, b) => {
      if (a.key === NO_GRADE) return 1;
      if (b.key === NO_GRADE) return -1;
      return codeNo(a.code) - codeNo(b.code) || a.label.localeCompare(b.label);
    });
};

/** 'all', or one grade group's key (NO_GRADE = only the not-graded takas) */
export type TakaFilter = string;

export const filterTakas = (takas: TakaEntry[], f: TakaFilter, q: string) => {
  const qq = q.trim().toLowerCase();
  return takas.filter((t) => {
    if (f !== 'all' && gradeKeyOf(t) !== f) return false;
    if (!qq) return true;
    return [t.takaNo, t.chkName, t.grdName, t.wvrName].some((v) => v.toLowerCase().includes(qq));
  });
};

/* -------------------------------------------------------------------------- */
/*  mock (USE_MOCK = true) — same shape as the controller                      */
/* -------------------------------------------------------------------------- */

export const mockBeamTakas = async (body: TakaRequest, produced: number) => {
  await new Promise((resolve) => setTimeout(resolve, 250));
  const seed = String(body.beamuid).split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const per = 105;
  const n = Math.max(1, Math.round(produced / per));
  const names = ['Ramesh Patel', 'Sunil Rathod', 'Mahesh Solanki'];
  const takas = Array.from({ length: n }, (_, i) => {
    const qty = i === n - 1 ? Math.round((produced - per * (n - 1)) * 100) / 100 : per;
    const grade = (seed + i) % 9 === 0 ? ['2', 'B'] : (seed + i) % 17 === 0 ? ['0', ''] : ['1', 'A'];
    const day = String(1 + (i % 27)).padStart(2, '0');
    return {
      chkuid: Number(body.beamuid) * 10 + 1, chksrno: i + 1, takano: `T${seed}${String(i + 1).padStart(3, '0')}`,
      chkdate: `2026-09-${day}`, shfcode: i % 2 ? '2' : '1', qty, wt: Math.round(qty * 0.0642 * 1000) / 1000,
      avgwt: 6.42, grdcode: grade[0], grdname: grade[1], chkcode: '18', chkname: names[i % 3], wvrname: 'Weaver ' + (1 + (i % 4)),
      supname: '', oprname: '', remarks: '', remarkc: '', remarkd: '', issample: 0, ismending: i % 13 === 5 ? 1 : 0,
      islasttaka: i === n - 1 ? 1 : 0, orderno: 'PO/27/118', trackid: 4021,
      entrydate: `2026-09-${day}`, entrytime: '14.32', macname: 'R-76', gaittingdate: '2026-09-01',
      dsnname: '',
    };
  });
  return { data: { success: true, data: { takas } } };
};
