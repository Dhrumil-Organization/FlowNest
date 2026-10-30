// FILE: src/components/RollCutAnalysis/api.ts
// NEW ERP — Roll Cut Analysis: the one HTTP call of the module.
//
//   POST /api/roll_cut_analysis   (Sudamo: API\SudamoProduction\RollCutAnalysisController@report)
//     { prpcode, prptype, fromdate: dd-mm-yyyy, todate: dd-mm-yyyy, basis: rollcut|checking|sticker, beamno? }
//   → response: { summary, buckets[], beams[], daily[], takas[], beam_list[], filters, databases[], truncated, errors[] }
//
// Host + Bearer token come from ErpSessionGate (same as every NEW ERP module).
import axios from 'axios';
import { fmtApiDate } from '../RollCutScanner/api';

export const ENDPOINT = '/api/roll_cut_analysis';

export type Basis = 'rollcut' | 'checking' | 'sticker';
export type Stage = 'checked' | 'waiting_checking' | 'not_cut' | 'checked_no_cut';

export type TakaRow = {
  beamno: string;
  takano: string;
  prpcode: string;
  sticker_at: string | null;
  rollcut_at: string | null;
  checking_at: string | null;
  rollcut: 'Done' | 'Pending';
  checking: 'Done' | 'Pending';
  stage: Stage;
  gap_min: number | null;
  gap_text: string | null;
  wait_min: number | null;
  wait_text: string | null;
};
export type BeamRow = {
  beamno: string; takas: number; cut: number; checked: number; waiting: number;
  avg_min: number | null; avg_text: string | null; max_min: number | null; max_text: string | null;
  first_cut: string | null; last_check: string | null;
};
export type DayRow = { date: string; cut: number; checked: number; avg_min: number | null; avg_text: string | null };
export type Bucket = { key: string; label: string; count: number };
export type Summary = {
  takas: number; rollcut_done: number; rollcut_pending: number; checking_done: number; waiting_checking: number; checked_before_cut: number;
  gap_count: number; avg_min: number | null; median_min: number | null; max_min: number | null; within_24h: number;
  avg_text: string | null; median_text: string | null; max_text: string | null;
};
export type Report = {
  summary: Summary; buckets: Bucket[]; beams: BeamRow[]; daily: DayRow[]; takas: TakaRow[];
  filters: { from: string; to: string; basis: Basis; beamno: string; prpcodes: string[] };
  beam_list?: string[];   // every beam of the period (Beam No dropdown)
  databases: string[]; truncated: boolean; errors: string[];
};

/** bucket key of a gap (same limits as the backend) */
export const bucketOf = (min: number | null): string | null => {
  if (min === null || min < 0) return null;
  if (min <= 60) return 'h1';
  if (min <= 240) return 'h4';
  if (min <= 720) return 'h12';
  if (min <= 1440) return 'h24';
  if (min <= 2880) return 'd2';
  return 'd2p';
};

/** true when the request was cancelled because a newer filter selection replaced it */
export const isCancel = (e: any) => axios.isCancel(e) || e?.name === 'CanceledError' || e?.code === 'ERR_CANCELED';

export function createRollCutAnalysisApi(API: string, token: string) {
  const c = axios.create({
    baseURL: String(API || '').replace(/\/+$/, ''),
    timeout: 120000,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
  });
  return {
    report: async (p: { prpcode: string; prptype: string; from: Date; to: Date; basis: Basis; beamno: string }, signal?: AbortSignal): Promise<Report> => {
      const body = {
        prpcode: p.prpcode,
        prptype: p.prptype,
        fromdate: fmtApiDate(p.from),
        todate: fmtApiDate(p.to),
        basis: p.basis,
        beamno: p.beamno || '',
      };
      const r = (await c.post(ENDPOINT, body, { signal })).data;
      if (!r || r.success === false) throw new Error(r?.message || 'Could not load the report.');
      return r.response as Report;
    },
  };
}
