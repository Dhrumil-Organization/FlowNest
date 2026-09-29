// FILE: src/screens/beamCloseNew/beamCloseApi.ts
// NEW ERP — Beam Close: every endpoint of the legacy module
// (components/BeamClose/index.tsx + SelectBeam.tsx), same paths, verbs and
// param / body keys. Property is hard-coded 'SIP' exactly like legacy.
import axios from 'axios';

/** Legacy hard-codes PrpCode 'SIP' for the year list and every help call. */
export const PRP = 'SIP';
export const TXN_CLOSE = 'beam_close_tablet';
export const TXN_OPEN = 'beam_open_tablet';

export type Year = { YearNo: any; YearName: string; [k: string]: any };

const pad = (n: number) => String(n).padStart(2, '0');

/** legacy formatDate: DD-MM-YYYY (local time) */
export const dmy = (date: any) => {
  if (!date) return '';
  const d = new Date(date);
  return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}`;
};

/** 'DD-MM-YYYY' → local Date (null when not parseable) */
export const fromDmy = (s: string): Date | null => {
  const m = String(s || '').match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  return m ? new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1])) : null;
};

/** legacy getFinancialYearFromDate: Apr–Mar → 'YYYY-YYYY' */
export const fyOfDate = (date: any): string | null => {
  if (!date) return null;
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return null;
  const month = d.getMonth() + 1;
  const year = d.getFullYear();
  return month <= 3 ? `${year - 1}-${year}` : `${year}-${year + 1}`;
};

export const str = (v: any) => (v === null || v === undefined ? '' : String(v));

export function createBeamCloseApi(API: string, token: string) {
  const c = axios.create({
    baseURL: String(API || '').replace(/\/+$/, ''),
    timeout: 120000,
    headers: { Authorization: `Bearer ${token}` },
  });
  const helpList = (res: any): any[] => {
    const d = res?.data?.response?.data;
    return Array.isArray(d) ? d : [];
  };

  return {
    /**
     * GET /api/getyear?prpcode=SIP  (legacy fetchAllYeardata(token, "SIP")).
     * Accepts response.data.response.data | response.data.data | response.data. Errors → [].
     */
    years: async (): Promise<Year[]> => {
      try {
        const r = await c.get('/api/getyear', {
          params: { prpcode: PRP },
          headers: { 'Content-Type': 'application/javascript', Accept: 'application/json' },
        });
        const d = r.data;
        if (Array.isArray(d?.response?.data)) return d.response.data;
        if (Array.isArray(d?.data)) return d.data;
        if (Array.isArray(d)) return d;
        return [];
      } catch {
        return [];
      }
    },

    /**
     * GET /api/get_checking_help?PrpCode=SIP&yearno&ChkDate=DD-MM-YYYY&txntype=beam_close_tablet
     * — machine list (legacy fetchMachine). → response.data.response.data
     */
    machines: async (p: { yearno: any; chkDate: string }) =>
      helpList(await c.get('/api/get_checking_help', {
        params: { PrpCode: PRP, yearno: p.yearno, ChkDate: p.chkDate, txntype: TXN_CLOSE },
      })),

    /**
     * GET /api/get_checking_help?PrpCode=SIP&yearno&ChkDate&MacCode&txntype=beam_close_tablet
     * — designs / running beam of one machine (legacy fetchDesign). → response.data.response.data
     */
    designs: async (p: { yearno: any; chkDate: string; macCode: any }) =>
      helpList(await c.get('/api/get_checking_help', {
        params: { PrpCode: PRP, yearno: p.yearno, ChkDate: p.chkDate, MacCode: p.macCode, txntype: TXN_CLOSE },
      })),

    /**
     * GET /api/get_checking_help?PrpCode=SIP&YearNo&ChkDate&txntype=beam_open_tablet
     * — closed beam list for "Load Beam" (legacy SelectBeam.fetchBeamList; note capital YearNo).
     */
    closedBeams: async (p: { yearNo: any; chkDate: string }) =>
      helpList(await c.get('/api/get_checking_help', {
        params: { PrpCode: PRP, YearNo: p.yearNo, ChkDate: p.chkDate, txntype: TXN_OPEN },
      })),

    /** POST /api/add_beam_close  { ShfCode, ChkDate, MacGrp, PrpCode, YearNo, yearno, txntype, d1:[…], d2:[] } */
    addClose: async (payload: any) =>
      (await c.post('/api/add_beam_close', payload, { headers: { 'Content-Type': 'application/json' } })).data,

    /** POST /api/add_beam_open  { ShfCode, ChkDate, MacGrp, PrpCode, prpcode, YearNo, yearno, d1:[…], d2, txntype } */
    addOpen: async (payload: any) =>
      (await c.post('/api/add_beam_open', payload, { headers: { 'Content-Type': 'application/json' } })).data,
  };
}

export type BeamCloseApi = ReturnType<typeof createBeamCloseApi>;
