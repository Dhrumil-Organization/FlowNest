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
  costingVariance: '/costing/variance',
  realCostingDashboard: '/real-costing-chain/dashboard',
} as const;

export const DesignAPI = {
  list: (params?: any) => client.get(LEGACY_ROUTES.designList, { params }),
  get: (id: string | number) => client.get(LEGACY_ROUTES.designDetail(id)),
  create: (body: any) => client.post(LEGACY_ROUTES.designCreate, body),
  update: (id: string | number, body: any) => client.put(LEGACY_ROUTES.designUpdate(id), body),

  // Required by YD Costing:
  // GET /api/designs/{mdId}/colourways
  //
  // The route already exists in Laravel. The previous legacyClient exposed
  // addColourway() but accidentally omitted the corresponding GET method,
  // which caused:
  //   DesignAPI.colourways is not a function (it is undefined)
  colourways: (id: string | number) =>
    client.get<{ success: boolean; data: SubDesign[] }>(
      LEGACY_ROUTES.designColourway(id)
    ),

  addColourway: (id: string | number, body: any) =>
    client.post(LEGACY_ROUTES.designColourway(id), body),

  yarns: (params?: any) => client.get(LEGACY_ROUTES.designYarns, { params }),
  yarnDyeing: (body: any) => client.post(LEGACY_ROUTES.designDyeing, body),
};

export const ItemAPI = {
  getItem: (params?: any) => client.get(LEGACY_ROUTES.itemList, { params }),
};

// Replace only the existing CostingAPI block in api/legacyClient.ts.

export type CostingHistoryParams = {
  md_id?: string;
  sub_design_id?: string | null;
  tier_code?: string | null;
  page?: number;
  per_page?: number;
  records_per_design?: number;
};

export type CostingVarianceParams = {
  md_id: string;
  sub_design_id?: string | null;
  tier_code?: string | null;
};

export type CostingDetailResponse = {
  id: string;
  md_id: string;
  sub_design_id?: string | null;
  tier_code?: string | null;
  scenario_name?: string | null;
  code?: string;
  type?: string;
  category?: string;
  created_at?: string | null;
  inputs: {
    price_map?: Record<string, number>;
    dye_map?: Record<string, number>;
    sizing_map?: Record<string, number>;
    gpm_map?: Record<string, number>;
    weaving_rate?: number;
    rpm?: number;
    eff?: number;
    greige_brok?: number;
    dyeing_proc?: number;
    finished_brok?: number;
    cut_pack?: number;
    greige_width?: number;
    warp_wastage?: number;
    weft_wastage?: number;
    weft_shrink?: number;
    fin_width?: number;
    gf_shrink?: number;
  };
  snap?: Record<string, unknown>;
  yarn_lines?: unknown[];
};

export const CostingAPI = {
  compute: (body: { md_id: string } & CostInputs) =>
    client.post<{ success: boolean; data: ComputeResult }>(
      '/costing/compute',
      body
    ),

  save: (body: { md_id: string } & CostInputs) =>
    client.post<{
      success: boolean;
      persisted?: boolean;
      message?: string;
      data: ComputeResult & { id: string; persisted?: boolean };
    }>('/costing/save', body),

  history: (params: CostingHistoryParams = {}) =>
    client.get<{ success: boolean; data: any[]; meta?: any }>(
      '/costing/history',
      {
        params: {
          ...params,
          sub_design_id:
            params.sub_design_id || undefined,
          tier_code:
            params.tier_code || undefined,
        },
      }
    ),

  get: (id: string | number) =>
    client.get<{
      success: boolean;
      data: CostingDetailResponse;
    }>(`/costing/${encodeURIComponent(String(id))}`),

  variance: (params: CostingVarianceParams) =>
    client.get<{
      success: boolean;
      data: { records: any[]; variance: any };
    }>('/costing/variance', {
      params: {
        md_id: params.md_id,
        sub_design_id:
          params.sub_design_id || undefined,
        tier_code:
          params.tier_code || undefined,
      },
    }),
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

// ─────────────────────────────────────────────────────────────────────────
// Grey Packing mobile live-session API.
// Existing Web Grey Packing routes are not used/replaced here.
// One successful scan response means the backend transaction committed.
// ─────────────────────────────────────────────────────────────────────────
export const GreyPackingAPI = {
  transactionTypes: (params: Record<string, any>) =>
    client.get('/get_criterion', { params }),

  departments: (params: Record<string, any>) =>
    client.get('/getdepartment', { params }),

  packingTypes: (params: Record<string, any>) =>
    client.get('/packtypedrop', { params }),

  checkedBy: (params: Record<string, any>) =>
    client.get('/getcheckby', { params }),

  voucherNo: (params: Record<string, any>) =>
    client.get('/checkvoucherno', { params }),

  startSession: (body: Record<string, any>) =>
    client.post('/greypacking/mobile_start_session', body),

  scanSave: (body: Record<string, any>) =>
    client.post('/greypacking/mobile_scan_save', body, { timeout: 20000 }),

  getSession: (body: Record<string, any>) =>
    client.post('/greypacking/mobile_get_session', body),

  removeScan: (body: Record<string, any>) =>
    client.post('/greypacking/mobile_remove_scan', body),

  cancelSession: (body: Record<string, any>) =>
    client.post('/greypacking/mobile_cancel_session', body),

  completeSession: (body: Record<string, any>) =>
    client.post('/greypacking/mobile_complete_session', body),

  openModify: (body: Record<string, any>) =>
    client.post('/greypacking/mobile_open_modify', body),

  deletePacking: (body: Record<string, any>) =>
    client.post('/greypacking/mobile_delete_packing', body),

  PackingList: (params: Record<string, any>) =>
    client.get('/greypackingbarcodebrowse', { params }),
};

