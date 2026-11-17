// FILE: src/components/RollCutScanner/api.ts
// NEW ERP — Roll Cut Scanner: every HTTP call of the module in one place.
// Host + Bearer token come from props (ErpSessionGate), same as the other NEW ERP modules.
//
//   SAVE   POST  SAVE_ENDPOINT       { txntype:'roll_cut_scanner', prpcode, yearno, beamuid, beamno, takano, isfirsttaka, islasttaka } (flat)
//   LIST   GET   LIST_ENDPOINT       { prptype, yearno, txntype, PrpCode, BeamNo, FromDate, ToDate, ... } -> data.main
//   BEAMS  POST  BEAM_HELP_ENDPOINT  same call as the old Checking Scanner "Beam No help" -> response.data (unique BeamNo)
//
// >>> If the backend uses different endpoint / param names, change ONLY the constants below. <<<
import axios from 'axios';

export const TXN_ROLL_CUT = 'roll_cut_scanner';

export const SAVE_ENDPOINT = '/api/add_roll_cut_detail';
// !! confirm this with the backend: endpoint used by the delete icon on every scanned card
export const DELETE_ENDPOINT = '/api/delete_roll_cut_detail';
export const LIST_ENDPOINT = '/api/show_roll_cut';
export const BEAM_HELP_ENDPOINT = '/api/get_auto_checking_help';

/** query-string keys of the list API for the date range */
export const LIST_FROM_KEY = 'FromDate';
export const LIST_TO_KEY = 'ToDate';

export type Opt = { label: string; value: string };
export type QrData = { prpcode: string; beamno: string; takano: string; yearno?: string;[k: string]: any };

const pad = (n: number) => String(n).padStart(2, '0');

/** Financial year (end year, 2 digits; April starts the next year) — same as the old module. */
export const getCurrentFinancialYear = () => {
  const d = new Date();
  const fy = d.getMonth() + 1 >= 4 ? d.getFullYear() + 1 : d.getFullYear();
  return String(fy).substring(2);
};

/** Date -> dd-mm-yyyy (what the ERP APIs expect) */
export const fmtApiDate = (d: Date) => `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}`;

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
/** Date -> 22 Oct 2026 */
export const fmtShowDate = (d: Date) => `${pad(d.getDate())} ${MON[d.getMonth()]} ${d.getFullYear()}`;

export const str = (v: any) => (v === null || v === undefined ? '' : String(v));
export const errMsg = (e: any, fb: string) => e?.response?.data?.message || e?.response?.data?.error || e?.message || fb;

/** true when the request never reached the server (no network / DNS / timeout) -> safe to keep for later. */
export const isNetErr = (e: any) => {
  if (!e || e.response) return false;
  const code = str(e.code);
  return (
    code === 'ERR_NETWORK' || code === 'ECONNABORTED' || code === 'ETIMEDOUT' || code === 'ERR_INTERNET_DISCONNECTED' ||
    /network error|network request failed|timeout|failed to fetch/i.test(str(e.message))
  );
};

/** Server said "this taka is already saved" (add_roll_cut_detail duplicate check). */
export const isDuplicateMsg = (m: any) => /duplicate\s*taka/i.test(str(m));

const swapCase = (t: string) => t.replace(/[a-zA-Z]/g, (ch) => (ch === ch.toLowerCase() ? ch.toUpperCase() : ch.toLowerCase()));
const lowerKeys = (o: any) => Object.keys(o).reduce((a: any, k) => ((a[k.toLowerCase()] = o[k]), a), {});

/**
 * Raw scanner text -> clean JSON text (null when it is not a QR of this module).
 * Camera gives the exact text. A scanner GUN "types" the text like a keyboard, so it can arrive with
 * a prefix / suffix (Enter, Tab), curly quotes (iOS smart punctuation) or inverted case (Caps Lock ON).
 */
export function normalizeQrText(value: string): string | null {
  let t = str(value)
    .replace(/[\u201C\u201D\u201E\u2033]/g, '"')
    .replace(/[\u2018\u2019\u2032]/g, "'")
    .replace(/[\u0000-\u001F\u007F\uFEFF]/g, '');
  const a = t.indexOf('{');
  const b = t.lastIndexOf('}');
  if (a < 0 || b <= a) return null;
  t = t.slice(a, b + 1);
  const tryParse = (text: string) => {
    try {
      const o = JSON.parse(text);
      return o && typeof o === 'object' && !Array.isArray(o) ? o : null;
    } catch {
      return null;
    }
  };
  const good = (o: any) => !!o && !!str(o.beamno) && !!str(o.takano);
  // 1) exactly as printed (keys are lowercase: beamno, takano ...)
  const exact = tryParse(t);
  if (good(exact)) return JSON.stringify(exact);
  // 2) Caps Lock was ON while the gun typed: every letter is inverted -> invert back (keys AND values)
  const inverted = tryParse(swapCase(t));
  if (good(inverted)) return JSON.stringify(inverted);
  // 3) QR printed with other key casing (BeamNo / TakaNo): only the keys are normalised
  const loose = exact ? lowerKeys(exact) : null;
  if (good(loose)) return JSON.stringify(loose);
  return null;
}

/** Scanned text -> QR object (null when it is not valid JSON / has no beam or taka). */
export function parseQr(value: string): QrData | null {
  const clean = normalizeQrText(value);
  if (!clean) return null;
  const o = JSON.parse(clean);
  return {
    ...o,
    prpcode: str(o.prpcode),
    beamno: str(o.beamno),
    takano: str(o.takano),
    yearno: o.yearno ? str(o.yearno) : undefined,
  };
}

export function createRollCutApi(API: string, token: string) {
  const base = String(API || '').replace(/\/+$/, '');
  const c = axios.create({
    baseURL: base,
    timeout: 30000,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'application/json' },
  });
  const xhr = { headers: { 'X-Requested-With': 'XMLHttpRequest' } };

  return {
    /** Save one scan — flat payload: txntype + all QR keys. */
    save: async (p: { prpcode: string; yearno: string; scannedString: string; scannedAt?: number }) => {
      // flat payload: QR keys go straight into the body (no scannedString, no nested object/array)
      const q = JSON.parse(p.scannedString);
      const body: Record<string, any> = { txntype: TXN_ROLL_CUT, ...q, prpcode: p.prpcode, yearno: p.yearno, uid: '0' };
      // Offline scan uploaded later: send the real scan date/time too. The backend ignores unknown keys today
      // (it stamps RcDate with the server date) — it can start using `scandate` without any app change.
      if (p.scannedAt) {
        const d = new Date(p.scannedAt);
        body.offline = '1';
        body.scandate = fmtApiDate(d);
        body.scantime = `${pad(d.getHours())}.${pad(d.getMinutes())}`;
      }
      return (await c.post(SAVE_ENDPOINT, body, xhr)).data;
    },

    /** Delete one scanned taka — flat payload: txntype + prpcode + yearno + the row's own keys. */
    remove: async (p: { prpcode: string; yearno: string; row: any }) => {
      const r = p.row || {};
      const body = {
        txntype: TXN_ROLL_CUT,
        prpcode: p.prpcode,
        yearno: p.yearno,
        uid: str(r.UId),
        // srno: str(r.SrNo),
        beamno: str(r.BeamNo),
        takano: str(r.TakaNo),
      };
      return (await c.post(DELETE_ENDPOINT, body, xhr)).data;
    },

    /** Scanned list for property + date range (+ optional beam). */
    list: async (p: { prptype: string; prpCode: string; beamNo: string; from: Date; to: Date }): Promise<any[]> => {
      const params: Record<string, any> = {
        prptype: p.prptype,
        yearno: getCurrentFinancialYear(),
        txntype: TXN_ROLL_CUT,
        PrpCode: p.prpCode,
        BeamNo: p.beamNo || '',
        [LIST_FROM_KEY]: fmtApiDate(p.from),
        [LIST_TO_KEY]: fmtApiDate(p.to),
      };
      const r = (await c.get(LIST_ENDPOINT, { params })).data;
      if (r && r.success === false) throw new Error(r.message || 'Could not load the list');
      return r?.data?.main || r?.data || [];
    },

    /** Beam No dropdown of the selected property (same call as the old module's BeamNoHelp). */
    beams: async (prpCode: string, prptype: string): Promise<Opt[]> => {
      const yearno = getCurrentFinancialYear();
      const body = {
        txntype: TXN_ROLL_CUT,
        referrer: 'dashboard',
        scannedString: { prpcode: prpCode, prptype, beamuid: '', beamno: '', takano: '', isfirsttaka: '', islasttaka: '', yearno },
        prpcode: prpCode,
        prptype,
        dsncode: '',
        yearno,
      };
      const r = (await c.post(BEAM_HELP_ENDPOINT, body, xhr)).data;
      const data: any[] = Array.isArray(r?.response?.data) ? r.response.data : [];
      return data
        .filter((x, i, self) => x?.BeamNo && i === self.findIndex((y) => y.BeamNo === x.BeamNo))
        .map((x) => ({ label: str(x.BeamNo), value: str(x.BeamNo) }));
    },
  };
}

export type RollCutApi = ReturnType<typeof createRollCutApi>;
