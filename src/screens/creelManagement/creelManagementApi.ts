// FILE: src/screens/creelManagement/creelManagementApi.ts
// NEW ERP — Creel Management System: every endpoint of the legacy module
// (components/CreelManagementSystem/index.tsx + CustomDrawer.tsx), same paths,
// same GET/POST, same payload keys. txntype 'creel_yarn_issue', strcode '002'.
import axios from 'axios';

export const TXN = 'creel_yarn_issue';
export const STRCODE = '002';

/** Legacy mobile-user-preference identity (useMobileUserPreference props). */
export const PREF = {
  ModuleCode: 'CREEL',
  ModuleName: 'Creel',
  ScreenCode: 'CREEL_BROWSER',
  ScreenName: 'Creel Management Browser',
};

export const STOCK_TYPES = [
  { stktypename: 'In house', StkType: 'I' },
  { stktypename: 'Process house', StkType: 'P' },
];

export const str = (v: any) => (v === null || v === undefined ? '' : String(v));

const pad = (n: number) => String(n).padStart(2, '0');
/** local yyyy-mm-dd */
export const isoDay = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
/** yyyy-mm-dd -> dd-mm-yyyy ('' when empty) */
export const isoToDmy = (iso: string) => {
  const m = str(iso).match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : '';
};
/** dd-mm-yyyy / yyyy-mm-dd -> yyyy-mm-dd ('' when unknown) */
export const toIso = (v: string) => {
  const s = str(v).trim();
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (m) return `${m[3]}-${pad(Number(m[2]))}-${pad(Number(m[1]))}`;
  return '';
};

/** legacy getCurrentFinancialYear(): 2-digit FY end year ("26" for Apr-2025..Mar-2026). */
export const getCurrentFinancialYear = () => {
  const d = new Date();
  const fy = d.getMonth() + 1 >= 4 ? d.getFullYear() + 1 : d.getFullYear();
  return fy.toString().substring(2);
};

/** legacy parseDate('yyyy-mm-dd') -> local Date ('' gives an Invalid Date, as legacy). */
export const parseDate = (dateStr: string) => {
  const [year, month, day] = str(dateStr).split('-');
  return new Date(Number(year), Number(month) - 1, Number(day));
};

/** legacy getStatusFromQty */
export const getStatusFromQty = (qty: any) => (parseFloat(qty || 0) === 0 ? 'Complete' : 'Pending');

/** QR (~ separated) -> carton fields (legacy handleBarcodeScanned: 16 / 13+ / 11+ parts). */
export const parseQr = (value: string): Record<string, any> | null => {
  const parts = str(value).split('~');
  if (parts.length === 16) {
    return {
      PUId: parts[0] || '', PSrNo: parts[1] || '', PSubSr: parts[2] || '', TranType: parts[3] || '',
      CartNo: parts[4] || '', ItmCode: parts[5] || '', ItmName: parts[6] || '', MerCode: parts[7] || '',
      MerName: parts[8] || '', GrdCode: parts[9] || '', GrdName: parts[10] || '', ShdCode: parts[11] || '',
      ShdName: parts[12] || '', Wt: parts[13] || 0, Chees: parts[14] || 0, yearNo: parts[15] || '',
    };
  }
  if (parts.length >= 13) {
    return {
      PrpCode: parts[0] || '', PUId: parts[1] || '', PSrNo: parts[2] || '', PSubSr: parts[3] || '',
      TranType: parts[4] || '', CartNo: parts[5] || '', ItmCode: parts[6] || '', MerCode: parts[7] || '',
      GrdCode: parts[8] || '', ShdCode: parts[9] || '', Denier: parts[10] || '', Wt: parts[11] || 0,
      Chees: parts[12] || 0, Rate: parts[13] || 0, yearNo: parts[14] || '',
    };
  }
  if (parts.length >= 11) {
    return {
      PUId: parts[0] || '', PSrNo: parts[1] || '', PSubSr: parts[2] || '', TranType: parts[3] || '',
      CartNo: parts[4] || '', ItmCode: parts[5] || '', MerCode: parts[6] || '', GrdCode: parts[7] || '',
      ShdCode: parts[8] || '', Denier: parts[9] || '', Wt: parts[10] || 0, Chees: 0, yearNo: parts[11] || '',
    };
  }
  return null;
};

/** legacy handleViewClick mapping: d2 rows joined to d1 on SrNo (rows without a d1 are dropped). */
export const mapShow = (resData: any, yearNo: string) => {
  const d1: any[] = Array.isArray(resData?.d1) ? resData.d1 : [];
  const d2: any[] = Array.isArray(resData?.d2) ? resData.d2 : [];
  const d1Map: Record<string, any> = {};
  d1.forEach((x) => { d1Map[String(x.SrNo)] = x; });
  return d2
    .filter((r) => d1Map[String(r.SrNo)])
    .map((r) => {
      const a = d1Map[String(r.SrNo)];
      return {
        cartonNo: r.CartNo || '', qty: r.Qty || '', chees: r.Chees || '',
        PUId: r.PUId || '', PSrNo: r.PSrNo || '', PSubSr: r.PSubSr || '', TranType: r.TranType || '',
        d2SrNo: String(r.SrNo || ''), SrNo: r.SrNo, SubSrNo: r.SubSr,
        ItmCode: a.ItmCode || '', ItmName: a.ItmName || '', MerCode: a.MerCode || '', MerName: a.MerName || '',
        GrdCode: a.GrdCode || '', GrdName: a.GrdName || '', ShdCode: a.ShdCode || '', ShdName: a.ShdName || '',
        Denier: a.Denier || '', d1SrNo: String(a.SrNo || ''), UId: a.UId || '',
        yearNo: yearNo || '',
      } as Record<string, any>;
    });
};

/* -------------------------------------------------------------------------- */
/*  Laravel response helpers (verbatim port of the legacy helpers)             */
/* -------------------------------------------------------------------------- */

export const getLaravelResponsePayload = (source: any) => {
  if (!source) return null;
  if (source?.response?.data) return source.response.data; // axios HTTP error
  if (source?.data) return source.data; // axios response
  return source; // already unwrapped
};

const firstErr = (errors: any) => {
  if (!errors || typeof errors !== 'object') return '';
  for (const value of Object.values(errors) as any[]) {
    if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'string') return value[0];
    if (typeof value === 'string' && value.trim() !== '') return value.trim();
  }
  return '';
};

export const getLaravelApiMessage = (source: any, fallback: string) => {
  const payload = getLaravelResponsePayload(source);
  const nested = payload?.response;
  const errorCode = String(payload?.error_code ?? nested?.error_code ?? nested?.data?.error_code ?? '').trim().toUpperCase();
  const cartNo = String(payload?.CartNo ?? nested?.CartNo ?? nested?.data?.CartNo ?? '').trim();
  if (errorCode === 'DUPLICATE_CARTON') {
    return cartNo ? `Carton ${cartNo} is already issued.` : 'This carton is already issued.';
  }
  const candidates = [
    payload?.message, nested?.message, nested?.data?.message, payload?.error,
    nested?.error_message, nested?.data?.error_message, payload?.errors?.message, source?.message,
  ];
  for (const c of candidates) {
    if (typeof c === 'string' && c.trim() !== '') return c.trim();
  }
  return firstErr(payload?.errors) || firstErr(nested?.errors) || fallback;
};

export const getLaravelErrorCode = (source: any) => {
  const payload = getLaravelResponsePayload(source);
  return String(payload?.error_code ?? payload?.response?.error_code ?? payload?.response?.data?.error_code ?? '').trim().toUpperCase();
};

export const isLaravelSuccess = (response: any) => {
  const payload = getLaravelResponsePayload(response);
  const nested = payload?.response;
  const errorCode = String(payload?.error_code ?? nested?.error_code ?? nested?.data?.error_code ?? '').trim().toUpperCase();
  const duplicate = payload?.duplicate === true || nested?.duplicate === true || nested?.data?.duplicate === true
    || errorCode === 'DUPLICATE_CARTON';
  if (duplicate) return false;

  const savedPayload = nested?.data && typeof nested.data === 'object' ? nested.data : nested;
  const hasSavedRowEvidence = savedPayload && typeof savedPayload === 'object'
    && (savedPayload?.SrNo !== undefined || savedPayload?.SubSr !== undefined || savedPayload?.carton !== undefined)
    && (savedPayload?.UId !== undefined || savedPayload?.uid !== undefined);
  if (hasSavedRowEvidence) return true;

  const knownFailureCodes = [
    'CARTON_VALIDATION_ERROR', 'INVALID_CARTON_WEIGHT', 'INVALID_CARTON_CHEES', 'CARTON_SAVE_FAILED', 'SESSION_ERROR', 'VALIDATION_ERROR',
  ];
  if (knownFailureCodes.includes(errorCode) || payload?.error === true || nested?.error === true || nested?.data?.error === true) return false;
  return payload?.success === true;
};

/** legacy showCartonSaveError -> { title, message } */
export const cartonSaveError = (source: any, fallback = 'Please scan again.') => {
  const message = getLaravelApiMessage(source, fallback);
  const errorCode = getLaravelErrorCode(source);
  const n = message.toLowerCase();
  const isDuplicate = errorCode === 'DUPLICATE_CARTON' || n.includes('already issued') || n.includes('already added') || n.includes('duplicate carton');
  const isSession = n.includes('creel session') || n.includes('draft creel') || n.includes('only a draft');
  const isValidation = errorCode.includes('VALIDATION') || n.includes('is required') || n.includes('must be greater') || n.includes('property mismatch');
  const title = isDuplicate ? 'Duplicate Carton' : isSession ? 'Session Error' : isValidation ? 'Validation Error' : 'Carton Not Saved';
  return { title, message };
};

/* -------------------------------------------------------------------------- */
/*  API                                                                        */
/* -------------------------------------------------------------------------- */

export function createCreelApi(API: string, token: string) {
  const base = String(API || '').replace(/\/+$/, '');
  const c = axios.create({
    baseURL: base,
    timeout: 120000,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'application/json' },
  });
  const xhr = { headers: { 'X-Requested-with': 'XMLHttpRequest' } };
  const post = (url: string, body: any) => c.post(url, body, xhr);
  const pref = { headers: { 'x-platform': 'mob' } };

  return {
    /** GET /api/getproperty  (legacy fetchPropertyData) -> response.data */
    properties: async (): Promise<any[]> => {
      const r = await c.get('/api/getproperty');
      return r.data?.success && Array.isArray(r.data?.response?.data) && r.data.response.data.length ? r.data.response.data : [];
    },
    /** GET /api/getyear?prpcode  (legacy fetchAllYeardata) */
    years: async (prpcode: string): Promise<any[]> => {
      const r = await c.get('/api/getyear', { params: { prpcode } });
      const d = r.data;
      if (Array.isArray(d?.response?.data)) return d.response.data;
      if (Array.isArray(d?.data)) return d.data;
      if (Array.isArray(d)) return d;
      return [];
    },

    /** POST /api/mobile-user-preference/get {UserId, ModuleCode, ScreenCode} -> parsed PreferenceJson | null */
    loadPreference: async (UserId: number) => {
      const r = await c.post('/api/mobile-user-preference/get', { UserId, ModuleCode: PREF.ModuleCode, ScreenCode: PREF.ScreenCode }, pref);
      if (!r.data?.status) return null;
      let p = r.data?.data?.PreferenceJson;
      if (typeof p === 'string') { try { p = JSON.parse(p); } catch { /* legacy logs */ } }
      return p ?? null;
    },
    /** POST /api/mobile-user-preference/save {UserId, ModuleCode, ModuleName, ScreenCode, ScreenName, CriteriaName, PreferenceJson, IsDefault} */
    savePreference: async (UserId: number, PreferenceJson: any) =>
      (await c.post('/api/mobile-user-preference/save', {
        UserId, ...PREF, CriteriaName: 'Default', PreferenceJson, IsDefault: true,
      }, pref)).data,

    /** GET /api/get_criterion?txntype&prptype&fetch=shift&prpcode&yearno -> response.data */
    shifts: async (p: { prptype: string | null; prpcode: string; yearno: string }): Promise<any[]> => {
      const r = await c.get('/api/get_criterion', { params: { txntype: TXN, prptype: p.prptype, fetch: 'shift', prpcode: p.prpcode, yearno: p.yearno } });
      return r.data?.success && Array.isArray(r.data?.response?.data) && r.data.response.data.length > 0 ? r.data.response.data : [];
    },
    /** GET /api/get_criterion?txntype&prptype&fetch=machine&prpcode&yearno&strcode=002&macgrp=WRP -> response.data */
    machines: async (p: { prptype: string | null; prpcode: string; yearno: string }): Promise<any[]> => {
      const r = await c.get('/api/get_criterion', {
        params: { txntype: TXN, prptype: p.prptype, fetch: 'machine', prpcode: p.prpcode, yearno: p.yearno, strcode: STRCODE, macgrp: 'WRP' },
      });
      return r.data?.success && Array.isArray(r.data?.response?.data) && r.data.response.data.length > 0 ? r.data.response.data : [];
    },
    /** GET /api/get_criterion?txntype&prpcode&yearno&strcode=002&maccode&fetch=get_creelid&prptype -> response.data.batch_no */
    creelId: async (p: { prptype: string | null; prpcode: string; yearno: string; maccode: any }) => {
      const r = await c.get('/api/get_criterion', {
        params: { txntype: TXN, prpcode: p.prpcode, yearno: p.yearno, strcode: STRCODE, maccode: p.maccode, fetch: 'get_creelid', prptype: p.prptype },
      });
      return r.data?.success ? str(r.data?.response?.data?.batch_no) : '';
    },

    /** POST /api/get_yarn_issue_browse {prpcode, prptype, strcode, txntype, yearno, fromdate, todate, status, include_drafts:1} -> raw data */
    browse: async (p: { prpcode: string; prptype: string | null; yearno: string; fromdate: string; todate: string; status: string }) =>
      (await post('/api/get_yarn_issue_browse', {
        prpcode: p.prpcode, prptype: p.prptype, strcode: STRCODE, txntype: TXN, yearno: p.yearno,
        fromdate: p.fromdate, todate: p.todate, status: p.status, include_drafts: 1,
      })).data,
    /** POST /api/resume_creel_session (DRAFT) | /api/get_yarn_issue_show (other) {uid, prpcode, strcode, yearno, txntype} */
    show: async (draft: boolean, p: { uid: any; prpcode: string; yearno: string }) =>
      (await post(draft ? '/api/resume_creel_session' : '/api/get_yarn_issue_show', {
        uid: p.uid, prpcode: p.prpcode, strcode: STRCODE, yearno: p.yearno, txntype: TXN,
      })).data,

    /** POST /api/start_creel_session {PrpCode, YearNo, txntype, CreelId, SetupDate, Shift, Remark, StkType, RecipeUId:1, BeamUId:0, DsnCode:0, IssTo} */
    startSession: async (p: {
      PrpCode: string; YearNo: string; CreelId: string; SetupDate: string; Shift: string; Remark: string; StkType: string; IssTo: any;
    }) => (await post('/api/start_creel_session', {
      PrpCode: p.PrpCode, YearNo: p.YearNo, txntype: TXN, CreelId: p.CreelId, SetupDate: p.SetupDate, Shift: p.Shift,
      Remark: p.Remark, StkType: p.StkType, RecipeUId: 1, BeamUId: 0, DsnCode: 0, IssTo: p.IssTo,
    })).data,
    /** POST /api/add_single_carton_scan {uid, prpcode, yearno, carton:{...}} -> full axios response (legacy inspects it) */
    addCarton: async (p: { uid: any; prpcode: string; yearno: string; carton: any }) => post('/api/add_single_carton_scan', p),
    /** POST /api/finalize_creel_session {uid, prpcode, yearno} */
    finalize: async (p: { uid: any; prpcode: string; yearno: string }) => (await post('/api/finalize_creel_session', p)).data,
    /** POST /api/discard_creel_session — list delete {prpcode, yearno, uid}; draft discard adds txntype */
    discard: async (p: { prpcode: string; yearno: string; uid: any; txntype?: string }) => (await post('/api/discard_creel_session', p)).data,
    /** POST /api/delete_creel_single_data {cartonno, srno, subsrno, uid, prpcode, yearno, txntype} */
    deleteCarton: async (p: { cartonno: any; srno: any; subsrno: any; uid: any; prpcode: string; yearno: string }) =>
      (await post('/api/delete_creel_single_data', { ...p, txntype: TXN })).data,

    /** POST /api/get_carton_search {prpcode, yearno, strcode, searchcarton} -> response.data */
    searchCarton: async (p: { prpcode: string; yearno: string; searchcarton: string }) => {
      const r = await post('/api/get_carton_search', { prpcode: p.prpcode, yearno: p.yearno, strcode: STRCODE, searchcarton: p.searchcarton });
      const data = r.data?.response?.data || [];
      return r.data?.success && Array.isArray(data) && data.length > 0 ? data : [];
    },
    /** POST /api/get_item_detail_from_carton {prpcode, yearno, strcode, itmcode, mercode, grdcode, shdcode} -> names | null */
    itemNames: async (p: { prpcode: string; yearno: string; itmcode: any; mercode: any; grdcode: any; shdcode: any }) => {
      const r = await post('/api/get_item_detail_from_carton', { prpcode: p.prpcode, yearno: p.yearno, strcode: STRCODE, itmcode: p.itmcode, mercode: p.mercode, grdcode: p.grdcode, shdcode: p.shdcode });
      return r.data?.success && r.data?.response?.data ? r.data.response.data : null;
    },
    /** POST /api/get_auto_checking_help {txntype:'chekingScanner', referrer:'dashboard', scannedString, prpcode, yearno}
     *  (legacy sendScannedValue — only reached when the QR text is valid JSON) */
    autoCheckingHelp: async (scanned: any, yearno: string | null) =>
      (await post('/api/get_auto_checking_help', {
        txntype: 'chekingScanner', referrer: 'dashboard', scannedString: scanned, prpcode: scanned?.prpcode, yearno,
      })).data,
  };
}

export type CreelApi = ReturnType<typeof createCreelApi>;
