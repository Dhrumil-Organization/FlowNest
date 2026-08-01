import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API } from '../../common/API/dynamicAPI';

export type YarnMaster = any;
export type Design = any;
export type SubDesign = any;
export type GetItem = any;
export type CostInputs = any;
export type ComputeResult = any;

const client = axios.create({ baseURL: `${API}/api`, timeout: 30000 });
client.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('access_token');
  config.headers = config.headers || {};
  config.headers.Accept = 'application/json';
  config.headers['Content-Type'] = 'application/json';
  config.headers['x-platform'] = 'mob';
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Keep all endpoint names in one place. If your existing Laravel route differs,
// change only this map; migrated screens remain untouched.
export const LEGACY_ROUTES = {
  designList: '/designs',
  designDetail: (id: string | number) => `/designs/${id}`,
  designCreate: '/designs',
  designUpdate: (id: string | number) => `/designs/${id}`,
  designColourway: (id: string | number) => `/designs/${id}/colourways`,
  designYarns: '/yarns',
  designDyeing: '/design-yarn-dyeing',
  itemList: '/getitem',
  designOptions: '/design-options',
  costingCompute: '/costing/compute',
  costingSave: '/costing/save',
  costingHistory: '/costing/history',
  costingVariance: (id: string | number) => `/costing/variance/${id}`,
  realCostingDashboard: '/real-costing-chain/dashboard',
} as const;

export const DesignAPI = {
  list: (params?: any) => client.get(LEGACY_ROUTES.designList, { params }),
  get: (id: string | number) => client.get(LEGACY_ROUTES.designDetail(id)),
  create: (body: any) => client.post(LEGACY_ROUTES.designCreate, body),
  update: (id: string | number, body: any) => client.put(LEGACY_ROUTES.designUpdate(id), body),
  addColourway: (id: string | number, body: any) => client.post(LEGACY_ROUTES.designColourway(id), body),
  yarns: (params?: any) => client.get(LEGACY_ROUTES.designYarns, { params }),
  yarnDyeing: (body: any) => client.post(LEGACY_ROUTES.designDyeing, body),
};

export const ItemAPI = {
  getItem: (params?: any) => client.get(LEGACY_ROUTES.itemList, { params }),
};

export const CostingAPI = {
  compute: (body: any) => client.post(LEGACY_ROUTES.costingCompute, body),
  save: (body: any) => client.post(LEGACY_ROUTES.costingSave, body),
  history: () => client.get(LEGACY_ROUTES.costingHistory),
  variance: (id: string | number) => client.get(LEGACY_ROUTES.costingVariance(id)),
};

export const RealCostingChainAPI = {
  dashboard: (params?: any) => client.get(LEGACY_ROUTES.realCostingDashboard, { params }),
};

// ─────────────────────────────────────────────────────────────────────────
// NEW: Checking Scanner — migrated from the old CheckingScanner/
// CheckingScannerNew screens (both used raw `axios` + manually-built
// Authorization headers on every single call). This is the same 8
// endpoints, same params, same payload shapes — centralized here so the
// screen itself no longer builds its own client or headers by hand.
//
// NOTE ON BASE URL: the old screens called `${API}/api/...` where `API`
// came from the pre-migration `common/API/dynamicAPI` constant, which
// this repo doesn't have visibility into. `client` here points at
// `API_BASE_URL` from `./client` (currently 'https://apig.tms-webapp.com').
// These are very likely the same production backend, but worth a quick
// confirmation before relying on this in production if your old `common`
// constant ever pointed somewhere different (e.g. a local/staging IP).
//
// NOTE ON PRINTING: the printer-bridge endpoints (`printers`, `printSticker`)
// intentionally do NOT go through `client` — they use their own headers
// (including a printer-bridge API key, not the user's bearer token) and
// may point at a different host entirely (a local network print-bridge
// service, not the main API). Kept as separate raw `axios` calls for
// exactly that reason, same as the original code.
// ─────────────────────────────────────────────────────────────────────────
export const CheckingAPI = {
  // Generic master-list lookup — the old code called this 4 different ways
  // (grade / checker / shift / operator) by varying `fetch` + `txntype`.
  // Kept as one method with those as parameters, matching the original.
  criterion: (params: { txntype: string; fetch: string; prpcode: string; yearno: string; referrer?: string; prptype?: string }) =>
    client.get('/get_criterion', { params }),

  // Scan mode: initial design list for a scanned beam/taka.
  autoCheckingHelp: (body: { txntype: string; referrer: string; scannedString: any; prpcode: string; yearno: string; dsncode?: string }) =>
    client.post('/get_auto_checking_help', body),

  // Scan mode: save the checked entry.
  addAutoCheckingDetail: (body: Record<string, any>) => client.post('/add_auto_checking_detail', body),

  // Manual mode: design list for a manually-selected beam.
  autoCheckingDesignHelp: (body: Record<string, any>) => client.post('/get_auto_checking_design_help', body),

  // Manual mode: beam list.
  showBeamChecking: (params: { prptype: string; yearno: string; txntype: string; ShfCode?: string; ChkDate?: string; PrpCode?: string; BeamNo?: string; EMode?: string }) =>
    client.get('/show_beam_checking', { params }),

  // Manual mode: existing manual-checking records list.
  manualCheckingDetail: (params: { prptype: string; yearno: string; txntype: string; MacCode?: string; TakaNo?: string }) =>
    client.get('/get_manual_checking_detail', { params }),

  // Delete a checking record.
  deleteCheckingDetail: (body: Record<string, any>) => client.post('/delete_checking_detail', body),
};

export const PrinterAPI = {
  list: (printersUrl: string, headers: Record<string, string>) =>
    axios.get(printersUrl, { headers, timeout: 30000 }),
  printSticker: (printStickerUrl: string, body: Record<string, any>, headers: Record<string, string>) =>
    axios.post(printStickerUrl, body, { headers, timeout: 30000 }),
};

// ─────────────────────────────────────────────────────────────────────────
// NEW: Beam Close/Open — migrated from the old BeamClose/index.tsx +
// BeamClose/SelectBeam.tsx screens. Same 3 endpoints, same params.
// Note: `get_checking_help` is reused across 3 different call shapes (this
// screen's machine list, its design list, and SelectBeam's beam list) by
// varying `txntype`/params — kept as one method matching the original,
// same as CheckingAPI.criterion above.
// ─────────────────────────────────────────────────────────────────────────
export const BeamCloseAPI = {
  checkingHelp: (params: { PrpCode: string; yearno?: string; YearNo?: string; ChkDate: string; MacCode?: string; txntype: string }) =>
    client.get('/get_checking_help', { params }),
  addBeamClose: (body: Record<string, any>) => client.post('/add_beam_close', body),
  addBeamOpen: (body: Record<string, any>) => client.post('/add_beam_open', body),
};

// ─────────────────────────────────────────────────────────────────────────
// NEW: Sales Order (New Order / Auth / Tracking / Summary) — migrated from
// SalesOrderNew/index.tsx, which is a much richer replacement for the
// existing (already-migrated) OrdersScreen.tsx. 12 endpoints total, same
// params as the original — GET/POST verified against every call site
// rather than assumed.
// ─────────────────────────────────────────────────────────────────────────
export const SalesOrderAPI = {
  accountBasic: (params: Record<string, any>) => client.get('/accountbasic', { params }),
  authSo: (params: Record<string, any>) => client.get('/authso', { params }),
  criterion: (params: Record<string, any>) => client.get('/get_criterion', { params }),
  getDesign: (params: Record<string, any>) => client.get('/getdesign', { params }),
  getDesignRate: (params: Record<string, any>) => client.get('/getdesignrate', { params }),
  getItem: (params: Record<string, any>) => client.get('/getitem', { params }),
  getLatestCosting: (params: Record<string, any>) => client.get('/getlatestcosting', { params }),
  getShade: (params: Record<string, any>) => client.get('/getshade', { params }),
  mobAppSave: (body: Record<string, any>) => client.post('/mobappsave', body),
  salesOrderTracking: (body: Record<string, any>) => client.post('/salesordertracking', body),
  confirmApc: (body: Record<string, any>) => client.post('/soconfirmapc', body),
  dispatch: (body: Record<string, any>) => client.post('/sodispatch', body),
  sortBrowse: (params: Record<string, any>) => client.get('/sosortbrowse', { params }),
};

export default client;
