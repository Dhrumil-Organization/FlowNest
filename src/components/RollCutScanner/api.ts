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
export const LIST_ENDPOINT = '/api/show_beam_checking';
export const BEAM_HELP_ENDPOINT = '/api/get_auto_checking_help';

/** query-string keys of the list API for the date range */
export const LIST_FROM_KEY = 'FromDate';
export const LIST_TO_KEY = 'ToDate';

export type Opt = { label: string; value: string };
export type QrData = { prpcode: string; beamno: string; takano: string; yearno?: string; [k: string]: any };

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

/** Scanned text -> QR object (null when it is not valid JSON / has no beam or taka). */
export function parseQr(value: string): QrData | null {
  try {
    const o = JSON.parse(value);
    if (!o || typeof o !== 'object') return null;
    return {
      ...o,
      prpcode: str(o.prpcode),
      beamno: str(o.beamno),
      takano: str(o.takano),
      yearno: o.yearno ? str(o.yearno) : undefined,
    };
  } catch {
    return null;
  }
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
    save: async (p: { prpcode: string; yearno: string; scannedString: string }) => {
      // flat payload: QR keys go straight into the body (no scannedString, no nested object/array)
      const q = JSON.parse(p.scannedString);
      const body = { txntype: TXN_ROLL_CUT, ...q, prpcode: p.prpcode, yearno: p.yearno };
      return (await c.post(SAVE_ENDPOINT, body, xhr)).data;
    },

    /** Scanned list for property + date range (+ optional beam). */
    list: async (p: { prptype: string; prpCode: string; beamNo: string; from: Date; to: Date }): Promise<any[]> => {
      const params: Record<string, any> = {
        prptype: p.prptype,
        yearno: getCurrentFinancialYear(),
        txntype: TXN_ROLL_CUT,
        PrpCode: p.prpCode,
        BeamNo: p.beamNo || '',
        ShfCode: '',
        ChkDate: '',
        EMode: 'S',
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
