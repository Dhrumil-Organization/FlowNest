// FILE: src/screens/beamGaitingNew/beamGaitingApi.ts
// NEW ERP — Beam Gaiting: every endpoint of the legacy module
// (components/BeamGaiting: index.tsx list, AddBeamGaiting.tsx add, CustomDrawer.tsx year),
// same paths, GET/POST, param keys and value formats. txntype 'beam_gaiting_detail'.
//
// NOTE: like legacy, params are passed through axios `params`, so null / undefined
// values (e.g. prptype when AsyncStorage has no 'user_prptype', prpcode when no
// machine is selected) are dropped from the query string exactly as before.
import AsyncStorage from '@/common/utils/compatibleStorage';
import axios from 'axios';

export const TXN = 'beam_gaiting_detail';

/** legacy: every call reads AsyncStorage 'user_prptype' right before the request */
export const getPrptype = async (): Promise<string | null> => {
  try { return await AsyncStorage.getItem('user_prptype'); } catch { return null; }
};

const pad = (n: number) => String(n).padStart(2, '0');

/** legacy AddBeamGaiting.formatDate: dd-mm-yyyy, empty / invalid -> TODAY */
export const formatDate = (date: any) => {
  let d = date ? new Date(date) : new Date();
  if (Number.isNaN(d.getTime())) d = new Date();
  return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}`;
};
/** legacy AddBeamGaiting.formatTime: HH:mm, empty -> '' */
export const formatTime = (date: any) => {
  if (!date) return '';
  const d = new Date(date);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
/** legacy display of start / end time: toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) */
export const showTime = (v: any) => {
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '--:--';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};
export const str = (v: any) => (v === null || v === undefined ? '' : String(v));

export function createBeamGaitingApi(API: string, token: string) {
  const c = axios.create({
    baseURL: String(API || '').replace(/\/+$/, ''),
    timeout: 120000,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'application/json' },
  });

  return {
    /**
     * GET /api/getyear?prpcode  (legacy common/API/Functions.fetchAllYeardata)
     * Legacy calls it with prpcode 'SIP' on mount and with FormState.PrpCode on "Done".
     * Returns response.data.response.data | response.data.data | response.data (first array), [] on error.
     */
    years: async (prpcode: string): Promise<any[]> => {
      try {
        const r = await c.get('/api/getyear', { params: { prpcode } });
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
     * GET /api/prodbeamdetailbrowsesudo?prptype&yearno&txntype=beam_gaiting_detail
     * (legacy index.fatchAllBeamDetailData) -> response.data.data when success && length.
     */
    browse: async (p: { prptype: string | null; yearno: string }): Promise<any[]> => {
      const r = await c.get('/api/prodbeamdetailbrowsesudo', { params: { prptype: p.prptype, yearno: p.yearno, txntype: TXN } });
      const data = r?.data?.data || [];
      return r?.data?.success && Array.isArray(data) && data.length > 0 ? data : [];
    },

    /**
     * GET /api/prodbeamdetailbrowsesudo?prptype&yearno&txntype&fetch=add_gaiting_machine_help
     * (legacy AddBeamGaiting.fetchmachine) -> response.data.data when success && length.
     */
    machines: async (p: { prptype: string | null; yearno: string }): Promise<any[]> => {
      const r = await c.get('/api/prodbeamdetailbrowsesudo', {
        params: { prptype: p.prptype, yearno: p.yearno, txntype: TXN, fetch: 'add_gaiting_machine_help' },
      });
      const data = r?.data?.data || [];
      return r?.data?.success && Array.isArray(data) && data.length > 0 ? data : [];
    },

    /**
     * GET /api/get_gaiting_beamno?prptype&yearno&txntype  (legacy fetchbeam)
     * -> response.data.response.data when success && length.
     */
    beams: async (p: { prptype: string | null; yearno: string }): Promise<any[]> => {
      const r = await c.get('/api/get_gaiting_beamno', { params: { prptype: p.prptype, yearno: p.yearno, txntype: TXN } });
      const data = r?.data?.response?.data || [];
      return r?.data?.success && Array.isArray(data) && data.length > 0 ? data : [];
    },

    /**
     * GET /api/get_criterion  (legacy fetchshift / fetchemployee / fetchoperator / fetchsupervisior)
     *   shift   : { yearno, txntype, fetch:'shift', prpcode }                       (NO prptype, NO stcode)
     *   employee: { prptype, yearno, txntype, fetch:'employee', prpcode, stcode:'' }
     *   operator: { prptype, yearno, txntype, fetch:'operator', prpcode, stcode:'' }
     *   sprvsr  : { prptype, yearno, txntype, fetch:'sprvsr',   prpcode, stcode:'' }
     * -> response.data.response.data when success && length.
     */
    criterion: async (fetch: 'shift' | 'employee' | 'operator' | 'sprvsr', p: {
      prptype: string | null; yearno: string; prpcode: string | undefined;
    }): Promise<any[]> => {
      const params = fetch === 'shift'
        ? { yearno: p.yearno, txntype: TXN, fetch, prpcode: p.prpcode }
        : { prptype: p.prptype, yearno: p.yearno, txntype: TXN, fetch, prpcode: p.prpcode, stcode: '' };
      const r = await c.get('/api/get_criterion', { params });
      const data = r?.data?.response?.data || [];
      return r?.data?.success && Array.isArray(data) && data.length > 0 ? data : [];
    },

    /**
     * GET /api/show_beam_gaiting_detail  (legacy Soshow, on beam select)
     * { MacCode, MacName, UBeamNo, WarpLen, BeamNo, BeamUId, prpcode, prptype, yearno, uid:'0', action:'add', txntype:'beam_detail_sudo' }
     * -> { success, uid: response.data.data.main[0].UId }
     */
    show: async (p: {
      MacCode: any; MacName: any; UBeamNo: any; WarpLen: any; BeamNo: any; BeamUId: any;
      prpcode: any; prptype: string | null; yearno: string;
    }): Promise<{ success: boolean; uid: any }> => {
      const r = await c.get('/api/show_beam_gaiting_detail', {
        params: { ...p, uid: '0', action: 'add', txntype: 'beam_detail_sudo' },
      });
      const main = r?.data?.data?.main?.[0] || {};
      return { success: !!r?.data?.success, uid: main?.UId };
    },

    /**
     * GET /api/checkvoucherno  (legacy checkvoucher)
     * { prpcode, yearno, acccode:'', vouno, suffix, month (MM), uid, date (dd-mm-yyyy), module:'GRYProcess', module_no_key:'VouNo' }
     * -> response.data.response ({ validate:'true'|'false', VouNo, suffix, month, message })
     */
    voucher: async (p: { prpcode: any; yearno: string; vouno: any; suffix: string; month: string; uid: any; date: string }) => {
      const r = await c.get('/api/checkvoucherno', {
        params: {
          prpcode: p.prpcode, yearno: p.yearno, acccode: '', vouno: p.vouno, suffix: p.suffix, month: p.month,
          uid: p.uid, date: p.date, module: 'GRYProcess', module_no_key: 'VouNo',
        },
      });
      return r?.data?.response;
    },

    /**
     * POST /api/add_beam_gaiting_detail  (legacy handlesave) with header X-Requested-with: XMLHttpRequest.
     * Body = the full legacy payloadObj (see BeamGaitingModule buildPayload). -> response.data
     */
    add: async (payload: any) =>
      (await c.post('/api/add_beam_gaiting_detail', payload, { headers: { 'X-Requested-with': 'XMLHttpRequest' } })).data,
  };
}

export type BeamGaitingApi = ReturnType<typeof createBeamGaitingApi>;
