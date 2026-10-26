// import AsyncStorage from '@/common/utils/compatibleStorage';
// import axios from 'axios';
// import { API } from '../../common/API/dynamicAPI';
// import { resolveNewErpApiBaseUrl } from './client';

// export type YarnMaster = any;
// export type Design = any;
// export type SubDesign = any;
// export type GetItem = any;
// export type CostInputs = any;
// export type ComputeResult = any;

// const client = axios.create({ baseURL: `${API}/api`, timeout: 30000 });
// client.interceptors.request.use(async (config) => {
//   // FIX: `axios.create({ baseURL })` only reads `API` ONCE, at module import
//   // time. Every DesignAPI/CostingAPI/CheckingAPI/BeamCloseAPI/SalesOrderAPI/
//   // PriorityAPI/GreyPackingAPI call in this file goes through this single
//   // `client` instance, so without re-resolving here, ALL of those screens
//   // would keep calling whichever property's host (apig vs apiy) was active
//   // when the app first loaded — even after the user switches property from
//   // the header. Re-reading `selected_property` fresh on every request (same
//   // pattern as `src/api/client.ts`'s `request()`) keeps this in sync with an
//   // in-app property switch, exactly like every other New ERP API call.
//   const selectedProperty = await AsyncStorage.getItem('selected_property');
//   config.baseURL = `${resolveNewErpApiBaseUrl(selectedProperty)}/api`;

//   const token = await AsyncStorage.getItem('access_token');
//   config.headers = config.headers || {};
//   config.headers.Accept = 'application/json';
//   config.headers['Content-Type'] = 'application/json';
//   config.headers['x-platform'] = 'mob';
//   if (token) config.headers.Authorization = `Bearer ${token}`;
//   return config;
// });

// // Keep all endpoint names in one place. If your existing Laravel route differs,
// // change only this map; migrated screens remain untouched.
// export const LEGACY_ROUTES = {
//   designList: '/designs',
//   designDetail: (id: string | number) => `/designs/${id}`,
//   designCreate: '/designs',
//   designUpdate: (id: string | number) => `/designs/${id}`,
//   designColourway: (id: string | number) => `/designs/${id}/colourways`,
//   designYarns: '/yarns',
//   designDyeing: '/design-yarn-dyeing',
//   itemList: '/getitem',
//   designOptions: '/design-options',
//   costingCompute: '/costing/compute',
//   costingSave: '/costing/save',
//   costingHistory: '/costing/history',
//   costingVariance: '/costing/variance',
//   realCostingDashboard: '/real-costing-chain/dashboard',
// } as const;

// export const DesignAPI = {
//   list: (params?: any) => client.get(LEGACY_ROUTES.designList, { params }),
//   get: (id: string | number) => client.get(LEGACY_ROUTES.designDetail(id)),
//   create: (body: any) => client.post(LEGACY_ROUTES.designCreate, body),
//   update: (id: string | number, body: any) => client.put(LEGACY_ROUTES.designUpdate(id), body),

//   // Required by YD Costing:
//   // GET /api/designs/{mdId}/colourways
//   //
//   // The route already exists in Laravel. The previous legacyClient exposed
//   // addColourway() but accidentally omitted the corresponding GET method,
//   // which caused:
//   //   DesignAPI.colourways is not a function (it is undefined)
//   colourways: (id: string | number) =>
//     client.get<{ success: boolean; data: SubDesign[] }>(
//       LEGACY_ROUTES.designColourway(id)
//     ),

//   addColourway: (id: string | number, body: any) =>
//     client.post(LEGACY_ROUTES.designColourway(id), body),

//   yarns: (params?: any) => client.get(LEGACY_ROUTES.designYarns, { params }),
//   yarnDyeing: (body: any) => client.post(LEGACY_ROUTES.designDyeing, body),
// };

// export const ItemAPI = {
//   getItem: (params?: any) => client.get(LEGACY_ROUTES.itemList, { params }),
// };

// // Replace only the existing CostingAPI block in api/legacyClient.ts.

// export type CostingHistoryParams = {
//     md_id?: string;
//     sub_design_id?: string | null;
//     tier_code?: string | null;
//     page?: number;
//     per_page?: number;
//     records_per_design?: number;
// };

// export type CostingVarianceParams = {
//     md_id: string;
//     sub_design_id?: string | null;
//     tier_code?: string | null;
// };

// export type CostingDetailResponse = {
//     id: string;
//     md_id: string;
//     sub_design_id?: string | null;
//     tier_code?: string | null;
//     scenario_name?: string | null;
//     code?: string;
//     type?: string;
//     category?: string;
//     created_at?: string | null;
//     inputs: {
//         price_map?: Record<string, number>;
//         dye_map?: Record<string, number>;
//         sizing_map?: Record<string, number>;
//         gpm_map?: Record<string, number>;
//         weaving_rate?: number;
//         rpm?: number;
//         eff?: number;
//         greige_brok?: number;
//         dyeing_proc?: number;
//         finished_brok?: number;
//         cut_pack?: number;
//         greige_width?: number;
//         warp_wastage?: number;
//         weft_wastage?: number;
//         weft_shrink?: number;
//         fin_width?: number;
//         gf_shrink?: number;
//     };
//     snap?: Record<string, unknown>;
//     yarn_lines?: unknown[];
// };

// export const CostingAPI = {
//     compute: (body: { md_id: string } & CostInputs) =>
//         client.post<{ success: boolean; data: ComputeResult }>(
//             '/costing/compute',
//             body
//         ),

//     save: (body: { md_id: string } & CostInputs) =>
//         client.post<{
//             success: boolean;
//             persisted?: boolean;
//             message?: string;
//             data: ComputeResult & { id: string; persisted?: boolean };
//         }>('/costing/save', body),

//     history: (params: CostingHistoryParams = {}) =>
//         client.get<{ success: boolean; data: any[]; meta?: any }>(
//             '/costing/history',
//             {
//                 params: {
//                     ...params,
//                     sub_design_id:
//                         params.sub_design_id || undefined,
//                     tier_code:
//                         params.tier_code || undefined,
//                 },
//             }
//         ),

//     get: (id: string | number) =>
//         client.get<{
//             success: boolean;
//             data: CostingDetailResponse;
//         }>(`/costing/${encodeURIComponent(String(id))}`),

//     variance: (params: CostingVarianceParams) =>
//         client.get<{
//             success: boolean;
//             data: { records: any[]; variance: any };
//         }>('/costing/variance', {
//             params: {
//                 md_id: params.md_id,
//                 sub_design_id:
//                     params.sub_design_id || undefined,
//                 tier_code:
//                     params.tier_code || undefined,
//             },
//         }),
// };


// export const RealCostingChainAPI = {
//   dashboard: (params?: any) => client.get(LEGACY_ROUTES.realCostingDashboard, { params }),
// };

// // ─────────────────────────────────────────────────────────────────────────
// // NEW: Checking Scanner — migrated from the old CheckingScanner/
// // CheckingScannerNew screens (both used raw `axios` + manually-built
// // Authorization headers on every single call). This is the same 8
// // endpoints, same params, same payload shapes — centralized here so the
// // screen itself no longer builds its own client or headers by hand.
// //
// // NOTE ON BASE URL: the old screens called `${API}/api/...` where `API`
// // came from the pre-migration `common/API/dynamicAPI` constant, which
// // this repo doesn't have visibility into. `client` here points at
// // `API_BASE_URL` from `./client` (currently 'https://apig.tms-webapp.com').
// // These are very likely the same production backend, but worth a quick
// // confirmation before relying on this in production if your old `common`
// // constant ever pointed somewhere different (e.g. a local/staging IP).
// //
// // NOTE ON PRINTING: the printer-bridge endpoints (`printers`, `printSticker`)
// // intentionally do NOT go through `client` — they use their own headers
// // (including a printer-bridge API key, not the user's bearer token) and
// // may point at a different host entirely (a local network print-bridge
// // service, not the main API). Kept as separate raw `axios` calls for
// // exactly that reason, same as the original code.
// // ─────────────────────────────────────────────────────────────────────────
// export const CheckingAPI = {
//   // Generic master-list lookup — the old code called this 4 different ways
//   // (grade / checker / shift / operator) by varying `fetch` + `txntype`.
//   // Kept as one method with those as parameters, matching the original.
//   criterion: (params: { txntype: string; fetch: string; prpcode: string; yearno: string; referrer?: string; prptype?: string }) =>
//     client.get('/get_criterion', { params }),

//   // Scan mode: initial design list for a scanned beam/taka.
//   autoCheckingHelp: (body: { txntype: string; referrer: string; scannedString: any; prpcode: string; yearno: string; dsncode?: string }) =>
//     client.post('/get_auto_checking_help', body),

//   // Scan mode: save the checked entry.
//   addAutoCheckingDetail: (body: Record<string, any>) => client.post('/add_auto_checking_detail', body),

//   // Manual mode: design list for a manually-selected beam.
//   autoCheckingDesignHelp: (body: Record<string, any>) => client.post('/get_auto_checking_design_help', body),

//   // Manual mode: beam list.
//   showBeamChecking: (params: { prptype: string; yearno: string; txntype: string; ShfCode?: string; ChkDate?: string; PrpCode?: string; BeamNo?: string; EMode?: string }) =>
//     client.get('/show_beam_checking', { params }),

//   // Manual mode: existing manual-checking records list.
//   manualCheckingDetail: (params: { prptype: string; yearno: string; txntype: string; MacCode?: string; TakaNo?: string }) =>
//     client.get('/get_manual_checking_detail', { params }),

//   // Delete a checking record.
//   deleteCheckingDetail: (body: Record<string, any>) => client.post('/delete_checking_detail', body),
// };

// export const PrinterAPI = {
//   list: (printersUrl: string, headers: Record<string, string>) =>
//     axios.get(printersUrl, { headers, timeout: 30000 }),
//   printSticker: (printStickerUrl: string, body: Record<string, any>, headers: Record<string, string>) =>
//     axios.post(printStickerUrl, body, { headers, timeout: 30000 }),
// };

// // ─────────────────────────────────────────────────────────────────────────
// // NEW: Beam Close/Open — migrated from the old BeamClose/index.tsx +
// // BeamClose/SelectBeam.tsx screens. Same 3 endpoints, same params.
// // Note: `get_checking_help` is reused across 3 different call shapes (this
// // screen's machine list, its design list, and SelectBeam's beam list) by
// // varying `txntype`/params — kept as one method matching the original,
// // same as CheckingAPI.criterion above.
// // ─────────────────────────────────────────────────────────────────────────
// export const BeamCloseAPI = {
//   checkingHelp: (params: { PrpCode: string; yearno?: string; YearNo?: string; ChkDate: string; MacCode?: string; txntype: string }) =>
//     client.get('/get_checking_help', { params }),
//   addBeamClose: (body: Record<string, any>) => client.post('/add_beam_close', body),
//   addBeamOpen: (body: Record<string, any>) => client.post('/add_beam_open', body),
// };

// // ─────────────────────────────────────────────────────────────────────────
// // NEW: Sales Order (New Order / Auth / Tracking / Summary) — migrated from
// // SalesOrderNew/index.tsx, which is a much richer replacement for the
// // existing (already-migrated) OrdersScreen.tsx. 12 endpoints total, same
// // params as the original — GET/POST verified against every call site
// // rather than assumed.
// // ─────────────────────────────────────────────────────────────────────────
// export const SalesOrderAPI = {
//   accountBasic: (params: Record<string, any>) => client.get('/accountbasic', { params }),
//   authSo: (params: Record<string, any>) => client.get('/authso', { params }),
//   criterion: (params: Record<string, any>) => client.get('/get_criterion', { params }),
//   getDesign: (params: Record<string, any>) => client.get('/getdesign', { params }),
//   getDesignRate: (params: Record<string, any>) => client.get('/getdesignrate', { params }),
//   getItem: (params: Record<string, any>) => client.get('/getitem', { params }),
//   getLatestCosting: (params: Record<string, any>) => client.get('/getlatestcosting', { params }),
//   getShade: (params: Record<string, any>) => client.get('/getshade', { params }),
//   mobAppSave: (body: Record<string, any>) => client.post('/mobappsave', body),
//   salesOrderTracking: (body: Record<string, any>) => client.post('/salesordertracking', body),
//   confirmApc: (body: Record<string, any>) => client.post('/soconfirmapc', body),
//   dispatch: (body: Record<string, any>) => client.post('/sodispatch', body),
//   sortBrowse: (params: Record<string, any>) => client.get('/sosortbrowse', { params }),
// };

// export default client;

// // ─────────────────────────────────────────────────────────────────────────
// // Grey Packing mobile live-session API.
// // Existing Web Grey Packing routes are not used/replaced here.
// // One successful scan response means the backend transaction committed.
// // ─────────────────────────────────────────────────────────────────────────
// // ─────────────────────────────────────────────────────────────────────────
// // NEW: Chart Priority — mobile "Priority" tab. Lets a user drag/reorder the
// // sales-order allocation charts for the logged-in property + financial
// // year, then save that order back. Two endpoints, same `client` instance
// // (axios, token/headers already attached by the interceptor above) used by
// // every other domain block in this file.
// // ─────────────────────────────────────────────────────────────────────────
// export const PriorityAPI = {
//   // POST /prioritybrowse — body: { prptype, yearno } (prptype here carries
//   // the property's prp_code, e.g. 'SIP' — same naming used by the legacy
//   // web screen's contract, kept as-is intentionally).
//   browse: (body: { prptype: string; yearno: string }) =>
//     client.post('/prioritybrowseparty', body),

//   // POST /save_priority — body: array of per-order payloads, each with the
//   // shade-level items carrying the new ClientPriority rank.
//   save: (payloads: Record<string, any>[]) =>
//     client.post('/save_priority_party', payloads),
// };

// export const GreyPackingAPI = {
//   transactionTypes: (params: Record<string, any>) =>
//     client.get('/get_criterion', { params }),

//   departments: (params: Record<string, any>) =>
//     client.get('/getdepartment', { params }),

//   packingTypes: (params: Record<string, any>) =>
//     client.get('/packtypedrop', { params }),

//   checkedBy: (params: Record<string, any>) =>
//     client.get('/getcheckby', { params }),

//   voucherNo: (params: Record<string, any>) =>
//     client.get('/checkvoucherno', { params }),

//   startSession: (body: Record<string, any>) =>
//     client.post('/greypacking/mobile_start_session', body),

//   scanSave: (body: Record<string, any>) =>
//     client.post('/greypacking/mobile_scan_save', body, { timeout: 20000 }),

//   getSession: (body: Record<string, any>) =>
//     client.post('/greypacking/mobile_get_session', body),

//   removeScan: (body: Record<string, any>) =>
//     client.post('/greypacking/mobile_remove_scan', body),

//   cancelSession: (body: Record<string, any>) =>
//     client.post('/greypacking/mobile_cancel_session', body),

//   completeSession: (body: Record<string, any>) =>
//     client.post('/greypacking/mobile_complete_session', body),
// };



import AsyncStorage from '@/common/utils/compatibleStorage';
import axios from 'axios';
import { API } from '../../common/API/dynamicAPI';
import { resolveNewErpApiBaseUrl } from './client';

export type YarnMaster = any;
export type Design = any;
export type SubDesign = any;
export type GetItem = any;
export type CostInputs = any;
export type ComputeResult = any;

const client = axios.create({ baseURL: `${API}/api`, timeout: 30000 });
client.interceptors.request.use(async (config) => {
  // FIX: `axios.create({ baseURL })` only reads `API` ONCE, at module import
  // time. Every DesignAPI/CostingAPI/CheckingAPI/BeamCloseAPI/SalesOrderAPI/
  // PriorityAPI/GreyPackingAPI call in this file goes through this single
  // `client` instance, so without re-resolving here, ALL of those screens
  // would keep calling whichever property's host (apig vs apiy) was active
  // when the app first loaded — even after the user switches property from
  // the header. Re-reading `selected_property` fresh on every request (same
  // pattern as `src/api/client.ts`'s `request()`) keeps this in sync with an
  // in-app property switch, exactly like every other New ERP API call.
  const selectedProperty = await AsyncStorage.getItem('selected_property');
  config.baseURL = `${resolveNewErpApiBaseUrl(selectedProperty)}/api`;

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
  beamShortageReport: '/reports/beam_shortage',
  beamShortageTakas: '/reports/beam_shortage/takas',
  yarnHubSummary: '/yarn_hub/summary',
  yarnHubItem: '/yarn_hub/item',
  yarnRates: (action: string) => `/yarn_rates/${action}`,
  realCostChain: (action: string) => `/real_cost_chain/${action}`,
  samplingHub: (action: string) => `/sampling_hub/${action}`,
  greyScanInward: (action: string) => `/grey_scan_inward/${action}`,
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
// ─────────────────────────────────────────────────────────────────────────
// NEW: Chart Priority — mobile "Priority" tab. Lets a user drag/reorder the
// sales-order allocation charts for the logged-in property + financial
// year, then save that order back. Two endpoints, same `client` instance
// (axios, token/headers already attached by the interceptor above) used by
// every other domain block in this file.
// ─────────────────────────────────────────────────────────────────────────
export const PriorityAPI = {
  // POST /prioritybrowse — body: { prptype, yearno } (prptype here carries
  // the property's prp_code, e.g. 'SIP' — same naming used by the legacy
  // web screen's contract, kept as-is intentionally).
  browse: (body: { prptype: string; yearno: string }) =>
    client.post('/prioritybrowseparty', body),

  // POST /save_priority — body: array of per-order payloads, each with the
  // shade-level items carrying the new ClientPriority rank.
  save: (payloads: Record<string, any>[]) =>
    client.post('/save_priority_party', payloads),

  // POST /save_priority_status — shade status is persisted independently
  // from priority order. The screen re-browses only after this returns true.
  saveShadeStatus: (payload: Record<string, any>) =>
    client.post('/save_priority_status', payload),
};

// ─────────────────────────────────────────────────────────────────────────
// NEW: Dyeing module (Priority / Daily Update / Mill Hub).
// Backend: SalesOrderPartyPriorityController — see routes added under
// "//dyeing module" in api.php. Every body carries { prptype, yearno } so
// the repository connects to the right property/year database, exactly
// like the priority endpoints above.
// These are called from src/screens/dyeing/dyeingApi.ts (currently
// commented there — the screens run on hard-coded JSON until the backend
// is deployed).
// ─────────────────────────────────────────────────────────────────────────
export const DyeingAPI = {
  // Charts -> shades (per-shade OrderSrNo/AllocationId) -> lots -> history
  priorityBrowse: (body: { prptype: string; yearno: string | number }) =>
    client.post('/dyeing/priority_browse', body),

  // Row-wise status for ONE colour: one lot (old body) or many lots
  // (`Lots: [...]`, optional `SplitFromLotId`). All-or-nothing. Append-only history.
  saveStatus: (payload: Record<string, any>) =>
    client.post('/dyeing/save_status', payload),

  // Lot CRUD for ONE colour: add / edit / remove / split — one lot (old body)
  // or many lots at once (`Lots: [...]`, optional `SplitFromLotId`)
  saveLot: (payload: Record<string, any>) =>
    client.post('/dyeing/save_lot', payload),

  // { prptype, yearno, fromdate: 'YYYY-MM-DD', todate: 'YYYY-MM-DD' }
  dailyUpdate: (body: Record<string, any>) =>
    client.post('/dyeing/daily_update', body),

  // { prptype, yearno, fromdate, todate } — returns history up to todate
  millHub: (body: Record<string, any>) =>
    client.post('/dyeing/mill_hub', body),
  // Mill Hub from job outward / inward (DyeingMillHubController)
  // POST /dyeing/mill_hub_report { prptype, yearno, fromdate, todate }
  millHubReport: (body: Record<string, any>) =>
    client.post('/dyeing/mill_hub_report', body),
  // POST /dyeing/mill_hub_lot { prptype, yearno, outuid, outsrno } — on-click lot detail
  millHubLot: (body: Record<string, any>) =>
    client.post('/dyeing/mill_hub_lot', body),

  // Outward (challan) help for one chart + the lot nos already saved on it.
  // GET /dyeing/outward_details?prptype=S&chartno=CH-2-01&yearno=27
  outwardDetails: (params: { prptype: string; chartno: string; yearno: string | number; shdcode?: string; shdname?: string; dsncode?: string; dsnname?: string }) =>
    client.get('/dyeing/outward_details', { params }),

  // Every outward line of ONE SO line (shade) with its saved lot no.
  // GET /dyeing/outward_details_all?prptype=S&yearno=27&orderuid=370000635&ordersrno=1
  outwardDetailsAll: (params: { prptype: string; yearno: string | number; orderuid: string | number; ordersrno: string | number; shdcode?: string; shdname?: string; dsncode?: string; dsnname?: string }) =>
    client.get('/dyeing/outward_details_all', { params }),

  // Saved lot nos of one chart + SO line (the table under the status sheet).
  // GET /dyeing/lotnos?prptype=S&chartno=CH-2-01&yearno=27&orderuid=370000635&ordersrno=2
  lotNos: (params: { prptype: string; chartno: string; yearno: string | number; orderuid: string | number; ordersrno: string | number; shdcode?: string; shdname?: string; dsncode?: string; dsnname?: string }) =>
    client.get('/dyeing/lotnos', { params }),

  // Add / edit the lot no. of ONE outward line (uid + srno of the challan).
  // /dyeing/save_outward_details?prptype=S&chartno=CH-2-01&yearno=27&uid=370000208&srno=2&lotno=123
  saveOutwardDetails: (params: Record<string, any>) =>
    client.get('/dyeing/save_outward_details', { params }),
  saveOutwardDetailsPost: (params: Record<string, any>) =>
    client.post('/dyeing/save_outward_details', params, { params }),

  // Remove the lot no. of ONE outward line (uid + srno from /dyeing/lotnos).
  // POST /dyeing/remove_lotno { uid, srno, chartno, shdcode, prptype, yearno }
  removeLotNo: (payload: Record<string, any>) =>
    client.post('/dyeing/remove_lotno', payload),

  // Remove the LATEST status of ONE shade (only the last one can be removed).
  // POST /dyeing/remove_status { OrderUId, OrderSrNo, ChartNo, ParCode, ShdCode, Status, prptype, yearno }
  removeStatus: (payload: Record<string, any>) =>
    client.post('/dyeing/remove_status', payload),
};

// Reports -> Beam Shortage (read-only).
// POST /reports/beam_shortage { prptype, prpcode, yearno, fromdate: 'YYYY-MM-DD', todate: 'YYYY-MM-DD' }
// Completed beams only (islasttaka = 1): design-wise summary + beam-wise detail
// (beamno, warped, produced, shortage). If the Laravel route is named
// differently, change only LEGACY_ROUTES.beamShortageReport.
export const BeamShortageAPI = {
  report: (body: Record<string, any>) => client.post(LEGACY_ROUTES.beamShortageReport, body),
  /** taka-wise checking entries of one beam (× design) — the drill-down below the beam / design page */
  takas: (body: Record<string, any>) => client.post(LEGACY_ROUTES.beamShortageTakas, body),
};

// Yarn Hub (YarnHubController) — read-only.
//   summary: { prptype, yearno }          -> every main yarn: category, subs, stock, used, designs, latest rate
//   item:    { prptype, yearno, itmcode } -> cartons, creel / weft issue rows, party-wise purchase rates
export const YarnHubAPI = {
  // stock SP + every yarn of the year: allow longer than the 30 s default
  summary: (body: Record<string, any>) => client.post(LEGACY_ROUTES.yarnHubSummary, body, { timeout: 180000 }),
  item: (body: Record<string, any>) => client.post(LEGACY_ROUTES.yarnHubItem, body, { timeout: 120000 }),
};

// Real Cost Chain (RealCostChainController) — Reports → Real Costing Chain: actual vs assumed cost per metre.
// body { prptype, prpcode, yearno, month? 'YYYY-MM' } — group / property / year of the login.
export const RealCostChainAPI = {
  report: (body: Record<string, any>) => client.post(LEGACY_ROUTES.realCostChain('report'), body, { timeout: 600000 }),
};

// Sampling Hub (SamplingHubController) — samples with permanent IDs + QR, movement log (TMSMASTER SmpSample / SmpMove).
// Every body carries { prptype, yearno } of the login. Rights: production.sampling_hub (checked by the API too).
//   list       -> samples + movements of the group, rights, me, today
//   masters    -> designs (Design module catalogue rule), categories, customers (Sales Order party rule)
//   colourways -> { md_id } active colourways of a design
//   photo      -> { id } garment photo (data URL)
//   save       -> new sample(s) / { id } edit;  delete -> { id } HARD delete with its movements
//   split      -> { id, n } items of a batch get their own IDs
//   move_save  -> record / { id } modify a movement;  move_delete -> { id } HARD delete
//   sticker    -> { ids } label rows for the Checking Scanner print path (PRINTSTICKER, PrintFormat 4)
export const SamplingHubAPI = {
  list: (body: Record<string, any>) => client.post(LEGACY_ROUTES.samplingHub('list'), body, { timeout: 120000 }),
  masters: (body: Record<string, any>) => client.post(LEGACY_ROUTES.samplingHub('masters'), body, { timeout: 120000 }),
  colourways: (body: Record<string, any>) => client.post(LEGACY_ROUTES.samplingHub('colourways'), body),
  photo: (body: Record<string, any>) => client.post(LEGACY_ROUTES.samplingHub('photo'), body),
  save: (body: Record<string, any>) => client.post(LEGACY_ROUTES.samplingHub('save'), body, { timeout: 60000 }),
  remove: (body: Record<string, any>) => client.post(LEGACY_ROUTES.samplingHub('delete'), body, { timeout: 60000 }),
  split: (body: Record<string, any>) => client.post(LEGACY_ROUTES.samplingHub('split'), body, { timeout: 60000 }),
  moveSave: (body: Record<string, any>) => client.post(LEGACY_ROUTES.samplingHub('move_save'), body, { timeout: 60000 }),
  moveRemove: (body: Record<string, any>) => client.post(LEGACY_ROUTES.samplingHub('move_delete'), body, { timeout: 60000 }),
  sticker: (body: Record<string, any>) => client.post(LEGACY_ROUTES.samplingHub('sticker'), body, { timeout: 60000 }),
};

// Yarn Rates (YarnRateController) — rate book per main yarn (TMSMASTER.dbo.FAMIYarnRate).
// Every body carries { prptype, yearno } of the login — property GROUP wise, no prpcode. New table data only.
//   list    -> main yarns of the group + every rate of the group's book
//   item    { itmcode }                      -> that yarn's rates
//   parties                                  -> supplier master: Dyeing party list (FAMAcc MHead 18 / SHead 117) + yarn suppliers of the group
//   save    { itmcode, parcode, date, rate, remark, replace, orig? { itmcode, parcode, date } } -> 409 code 'exists' = ask to replace
//   remove  { itmcode, parcode, date }      (hard delete)
export const YarnRateAPI = {
  list: (body: Record<string, any>) => client.post(LEGACY_ROUTES.yarnRates('list'), body, { timeout: 120000 }),
  item: (body: Record<string, any>) => client.post(LEGACY_ROUTES.yarnRates('item'), body, { timeout: 120000 }),
  parties: (body: Record<string, any>) => client.post(LEGACY_ROUTES.yarnRates('parties'), body),
  save: (body: Record<string, any>) => client.post(LEGACY_ROUTES.yarnRates('save'), body, { timeout: 60000 }),
  remove: (body: Record<string, any>) => client.post(LEGACY_ROUTES.yarnRates('delete'), body, { timeout: 60000 }),
};

// Outward Scan Sticker (GreyScanInwardController) — grey store job inward by scanning the fusion sticker.
// Every body carries { prpcode, yearno }. save = add (uid 0) or modify (uid); remove = HARD delete.
export const GreyScanInwardAPI = {
  meta: (body: Record<string, any>) => client.post(LEGACY_ROUTES.greyScanInward('meta'), body),
  parties: (body: Record<string, any>) => client.post(LEGACY_ROUTES.greyScanInward('parties'), body),
  grn: (body: Record<string, any>) => client.post(LEGACY_ROUTES.greyScanInward('grn'), body),
  shades: (body: Record<string, any>) => client.post(LEGACY_ROUTES.greyScanInward('shades'), body, { timeout: 60000 }),
  scan: (body: Record<string, any>) => client.post(LEGACY_ROUTES.greyScanInward('scan'), body),
  pending: (body: Record<string, any>) => client.post(LEGACY_ROUTES.greyScanInward('pending'), body),
  recheck: (body: Record<string, any>) => client.post(LEGACY_ROUTES.greyScanInward('recheck'), body),
  save: (body: Record<string, any>) => client.post(LEGACY_ROUTES.greyScanInward('save'), body, { timeout: 120000 }),
  browse: (body: Record<string, any>) => client.post(LEGACY_ROUTES.greyScanInward('browse'), body),
  show: (body: Record<string, any>) => client.post(LEGACY_ROUTES.greyScanInward('show'), body),
  remove: (body: Record<string, any>) => client.post(LEGACY_ROUTES.greyScanInward('delete'), body, { timeout: 120000 }),
};

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

  PackingList: (params: Record<string, any>) =>
    client.get('/greypackingbarcodebrowse', { params }),

    openModify: (body: Record<string, any>) =>
    client.post('/greypacking/mobile_open_modify', body),

  deletePacking: (body: Record<string, any>) =>
    client.post('/greypacking/mobile_delete', body),

};

