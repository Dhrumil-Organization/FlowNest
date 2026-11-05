// FILE: src/screens/checkingScannerNew/checkingScannerApi.ts
// NEW ERP — Checking Scanner: every endpoint used by the legacy module
// (components/CheckingScanner/index.tsx + ScannerFaultsModal.tsx), same paths,
// same GET/POST, same query / body keys. Host + token come from props.
import AsyncStorage from '@/common/utils/compatibleStorage';
import * as Dyn from '@/common/API/dynamicAPI';
import axios from 'axios';

/** txntype strings used by legacy (the typo "cheking" is what the server expects). */
export const TXN_SCAN = 'chekingScanner';
export const TXN_TABLET = 'beam_checking_tablet';
export const TXN_MANUAL = 'manual_checking';
export const TXN_LIST = 'cheking_scanner_list';
export const TXN_FAULT = 'beam_checking';

/** AsyncStorage keys read / written by legacy. */
export const MANUAL_CHECKER_KEY = 'manual_checker';
export const QR_CHECKER_KEY = 'qr_checker';
export const LAST_PRINTER_KEY = 'lastSelectedPrinter';

export const storage = {
  get: (k: string) => AsyncStorage.getItem(k).catch(() => null),
  set: (k: string, v: string) => AsyncStorage.setItem(k, v).catch(() => undefined),
};

/** Legacy getCurrentFinancialYear: FY end year, 2 digits (Apr → next year). */
export const getCurrentFinancialYear = () => {
  const d = new Date();
  const fy = d.getMonth() + 1 >= 4 ? d.getFullYear() + 1 : d.getFullYear();
  return fy.toString().substring(2);
};

export const str = (v: any) => (v === null || v === undefined ? '' : String(v));

export type Printer = { Name: string; StatusText: string; [k: string]: any };

/** Legacy normalizePrinterList */
export const normalizePrinterList = (raw: any): Printer[] => {
  const list = raw?.printers || raw?.data?.printers || raw?.data || raw || [];
  if (!Array.isArray(list)) return [];
  return list
    .map((item: any) => {
      if (typeof item === 'string') return { Name: item, StatusText: 'Idle' };
      return {
        ...item,
        Name: item.Name || item.name || item.printerName || '',
        StatusText: item.StatusText || item.statusText || item.status || 'Idle',
      };
    })
    .filter((item: any) => item.Name);
};

/** Legacy getScannerFaultPayload (row of the scanner list). */
export const faultRowParams = (row: any) => ({
  ShfCode: row?.ShfCode || '',
  ChkDate: row?.ChkDate || '',
  MacGrp: row?.MacGrp || '',
  PrpCode: row?.PrpCode || '',
  yearno: row?.yearno || getCurrentFinancialYear(),
  BeamNo: row?.BeamNo || '',
  UId: row?.UId || '',
  SrNo: row?.SrNo || '',
  txntype: TXN_FAULT,
});

/** ScannerFaultsModal buildPayloadBase (yearno always current FY). */
export const faultModalBase = (row: any) => ({
  ShfCode: row?.ShfCode || '',
  ChkDate: row?.ChkDate || '',
  MacGrp: row?.MacGrp || '',
  PrpCode: row?.PrpCode || '',
  BeamNo: row?.BeamNo || '',
  SrNo: row?.SrNo || '',
  UId: row?.UId || '',
  yearno: getCurrentFinancialYear(),
  txntype: TXN_FAULT,
});

export function createCheckingScannerApi(API: string, token: string) {
  const base = String(API || '').replace(/\/+$/, '');
  const c = axios.create({
    baseURL: base,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'application/json' },
  });
  const post = (url: string, body: any) => c.post(url, body, { headers: { 'X-Requested-with': 'XMLHttpRequest' } });
  const printerHeaders = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
    'x-api-key': 'PRINT_SECRET_123',
  };

  return {
    /**
     * GET /api/get_criterion — grade / checker / shift / operator lists.
     * Scan : { txntype:'beam_checking_tablet', referrer:'dashboard', fetch:'grd'|'prodrepackchkby'|'shift', prpcode, yearno:yno, [prptype] }
     *        { txntype:'chekingScanner', fetch:'operator', prpcode, yearno:yno, prptype }
     * Manual: { referrer:'dashboard', prpcode:''|beam PrpCode, yearno:yno, prptype, txntype:'manual_checking', fetch }
     * Returns the raw body ({ success, response: { data, user_id } }).
     */
    criterion: async (params: Record<string, any>) => (await c.get('/api/get_criterion', { params })).data,

    /**
     * POST /api/get_auto_checking_help — body { txntype:'chekingScanner', referrer:'dashboard',
     * scannedString:{...}, prpcode, [prptype], [dsncode], yearno:FY }.
     * Without dsncode → response.design (design list); with dsncode → response.data (beam/design row),
     * response.maxtakano; manual beam help → response.data (beam rows).
     */
    autoCheckingHelp: async (body: Record<string, any>) => (await post('/api/get_auto_checking_help', body)).data,

    /** POST /api/get_auto_checking_design_help — { prptype, yearno:FY, txntype:'manual_checking', fetch:'manual_checking_machine_help', referrer:'dashboard' } → response.design */
    autoCheckingDesignHelp: async (body: Record<string, any>) => (await post('/api/get_auto_checking_design_help', body)).data,

    /** POST /api/add_auto_checking_detail — save (scan EMode 'S' / manual EMode 'M'). */
    addAutoCheckingDetail: async (body: Record<string, any>) => (await post('/api/add_auto_checking_detail', body)).data,

    /** GET /api/get_manual_checking_detail — { prptype, yearno:FY, txntype:'manual_checking', MacCode:'', TakaNo:'' } → data.new_main */
    manualCheckingDetail: async (params: Record<string, any>) => (await c.get('/api/get_manual_checking_detail', { params })).data,

    /** GET /api/show_beam_checking — { prptype, yearno:FY, txntype:'cheking_scanner_list', ShfCode:'', ChkDate:'', PrpCode:'', BeamNo:'', EMode } → data.main */
    showBeamChecking: async (params: Record<string, any>) => (await c.get('/api/show_beam_checking', { params })).data,

    /** POST /api/delete_checking_detail — { ShfCode, ChkDate, MacGrp, PrpCode, yearno, txntype:'chekingScanner', SrNo, UId, BeamNo } */
    deleteCheckingDetail: async (body: Record<string, any>) => (await post('/api/delete_checking_detail', body)).data,

    /** GET /api/show_checking_fault — params = getScannerFaultPayload(row) (used after delete to blank the faults) */
    showCheckingFault: async (params: Record<string, any>) => (await c.get('/api/show_checking_fault', { params })).data,

    /** POST /api/add_checking_fault — { ShfCode, ChkDate, MacGrp, PrpCode, BeamNo, SrNo, UId, yearno, txntype:'beam_checking', IsEntry:'1', d1 } */
    addCheckingFault: async (body: Record<string, any>) =>
      (await c.post('/api/add_checking_fault', body, { headers: { 'X-Requested-With': 'XMLHttpRequest' } })).data,

    /** GET /api/get_checking_fault_help — faultModalBase(row) → response.{ default_faults, filterdata } */
    checkingFaultHelp: async (params: Record<string, any>) =>
      (await c.get('/api/get_checking_fault_help', { params, headers: { 'X-Requested-With': 'XMLHttpRequest' } })).data,

    /** POST /api/add_checking_detail — "Remove Last Taka" { ShfCode, ChkDate(dd-mm-yyyy), MacGrp, PrpCode, yearno, txntype:'chekingScanner', d1:[row], d2:[] } */
    addCheckingDetail: async (body: Record<string, any>) => (await post('/api/add_checking_detail', body)).data,

    /** GET {API}/api/printers (x-api-key, 30 s timeout) → normalized printer list */
    printers: async (): Promise<Printer[]> => {
      const res = await axios.get(`${base}/api/printers`, { headers: printerHeaders, timeout: 30000 });
      return normalizePrinterList(res.data);
    },

    /** POST PRINTSTICKER — { data:[row], IskgQty:0, printype:'Print', PrintFormat:4, printerName, txntype:'chekingScanner' } */
    print: async (row: Record<string, any>, printerName: string) => {
      const params = { data: [row], IskgQty: 0, printype: 'Print', PrintFormat: 4, printerName: printerName || '', txntype: TXN_SCAN };
      return (await axios.post(Dyn.PRINTSTICKER, params, { headers: printerHeaders, timeout: 30000 })).data;
    },
  };
}

export type CheckingScannerApi = ReturnType<typeof createCheckingScannerApi>;
