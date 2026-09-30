// FILE: src/screens/dyeing/dyeingApi.ts
// Single service used by all three Dyeing tabs + the Priority status sheet.
//
// USE_MOCK = true  -> every call returns the HARD-CODED JSON / in-memory mock
//                     backend in dyeingMockData.ts (same shapes as the PHP API).
// USE_MOCK = false -> live backend (SalesOrderPartyPriorityController).
// Nothing in the screens changes between the two.
//
// Every function returns the raw axios-style response ({ data: body }); the
// screens unwrap it with `unwrapBody` / `isSaved` / `outwardSaveOk`.

import { DyeingAPI, PriorityAPI } from '../../api/legacyClient';
import {
  mockDyeingBrowse,
  mockDyeingDailyUpdate,
  mockDyeingMillHub,
  mockLotNos,
  mockOutwardDetails,
  mockOutwardDetailsAll,
  mockRemoveDyeingStatus,
  mockRemoveLotNo,
  mockSaveDyeingLot,
  mockSaveDyeingStatus,
  mockSaveOutwardDetails,
  mockSavePriorityOrder,
} from './dyeingMockData';
import { SaveLotPayload, SaveStatusPayload } from './dyeingModel';

/** Flip to `true` to run the whole Dyeing module on the mock data. */
export const USE_MOCK = false;

type Ctx = { prptype: string; yearno: string | number };

export const DyeingService = {
  /** Priority tab — charts with per-shade rows and status history. */
  browse: (ctx: Ctx) => (USE_MOCK ? mockDyeingBrowse() : DyeingAPI.priorityBrowse(ctx)),

  /**
   * Priority order save — UNCHANGED existing endpoint (save_priority_party),
   * same payload as before. Only SelfPriority changes; ClientPriority is sent
   * back exactly as received.
   */
  savePriorityOrder: (payloads: Record<string, any>[]) =>
    (USE_MOCK ? mockSavePriorityOrder(payloads) : PriorityAPI.save(payloads)),

  /** Shade-wise status save (one shade of one chart). */
  saveStatus: (payload: SaveStatusPayload) =>
    (USE_MOCK ? mockSaveDyeingStatus(payload) : DyeingAPI.saveStatus(payload)),

  /** Lot CRUD (kept for the contract — lot nos now live on the outward line). */
  saveLot: (payload: SaveLotPayload) =>
    (USE_MOCK ? mockSaveDyeingLot(payload) : DyeingAPI.saveLot(payload)),

  /** Daily Update tab — raw status events of the range. */
  dailyUpdate: (body: Ctx & { fromdate: string; todate: string }) =>
    (USE_MOCK ? mockDyeingDailyUpdate(body) : DyeingAPI.dailyUpdate(body)),

  /** Mill Hub tab — full history (up to `todate`) of every shade touched in the range. */
  millHub: (body: Ctx & { fromdate: string; todate: string }) =>
    (USE_MOCK ? mockDyeingMillHub(body) : DyeingAPI.millHub(body)),

  /** Status sheet — outward (challan) lines of a chart (the "Select Outward" help, with ChalNo). */
  outwardDetails: (params: { prptype: string; chartno: string; yearno: string | number; shdcode?: string; shdname?: string }) =>
    (USE_MOCK ? mockOutwardDetails(params) : DyeingAPI.outwardDetails(params)),

  /**
   * Status sheet — EVERY outward line of one SO line (shade) with its saved lot no.
   * GET /dyeing/outward_details_all?prptype=S&yearno=27&orderuid=370000635&ordersrno=1
   */
  outwardDetailsAll: (params: { prptype: string; yearno: string | number; orderuid: string | number; ordersrno: string | number; shdcode?: string; shdname?: string }) =>
    (USE_MOCK ? mockOutwardDetailsAll(params) : DyeingAPI.outwardDetailsAll(params)),

  /**
   * Status sheet — table of saved lot nos. (chart + SO line).
   * GET /dyeing/lotnos?prptype=S&chartno=CH-2-01&yearno=27&orderuid=370000635&ordersrno=2
   */
  lotNos: (params: { prptype: string; chartno: string; yearno: string | number; orderuid: string | number; ordersrno: string | number; shdcode?: string; shdname?: string }) =>
    (USE_MOCK ? mockLotNos(params) : DyeingAPI.lotNos(params)),

  /**
   * Add AND update the lot no. of one outward line (same API for both).
   * Sent as POST with the params also on the query string; if the route is
   * registered as GET only (405) the same params are re-sent as GET.
   */
  saveOutwardDetails: async (params: {
    prptype: string; chartno: string; yearno: string | number; uid: string | number; srno: string | number; lotno: string;
    shdcode: string; shdname?: string; uuid?: any; usrno?: any;
    lotqty?: number | null; // lot qty (m) = outward qty of the lot
    mode?: 'add' | 'edit'; // add = refuse when this shade already has this outward line
    lotchartno?: string; orderuid?: string | number; ordersrno?: string | number; parcode?: string; // shade identity
  }) => {
    if (USE_MOCK) return mockSaveOutwardDetails(params);
    try {
      return await DyeingAPI.saveOutwardDetailsPost(params);
    } catch (err: any) {
      if (err?.response?.status === 405) return DyeingAPI.saveOutwardDetails(params);
      throw err;
    }
  },

  /**
   * Remove the lot no. of one outward line (uid + srno from /dyeing/lotnos).
   * POST /dyeing/remove_lotno
   * { "uid": 370000208, "srno": 2, "chartno": "CH-2-01", "shdcode": "5", "prptype": "S", "yearno": 27 }
   */
  removeLotNo: (payload: RemoveLotNoPayload) =>
    (USE_MOCK ? mockRemoveLotNo(payload) : DyeingAPI.removeLotNo(payload)),

  /**
   * Remove the LATEST status of one shade.
   * POST /dyeing/remove_status
   * { "OrderUId": 370000635, "OrderSrNo": 1, "ChartNo": "CH-2-04", "ParCode": "22790",
   *   "ShdCode": "32", "Status": "Sent for job", "prptype": "S", "yearno": 27 }
   */
  removeStatus: (payload: RemoveStatusPayload) =>
    (USE_MOCK ? mockRemoveDyeingStatus(payload) : DyeingAPI.removeStatus(payload)),
};

export type RemoveLotNoPayload = {
  uid: number | string;
  srno: number | string;
  uuid?: any; // outward uuid as received
  usrno?: any; // outward usrno as received
  shdname?: string; // shade name of the shade the lot belongs to
  chartno: string;
  lotchartno?: string; // chart of the shade (lot table key)
  orderuid?: number | string; // SO line of the shade
  ordersrno?: number | string;
  lotid?: number; // lot row id (lot table)
  shdcode: string;
  prptype: string;
  yearno: number | string;
};

export type RemoveStatusPayload = {
  OrderUId: number | string;
  OrderSrNo: number | string;
  ChartNo: string;
  ParCode: string;
  ShdCode: string;
  Status: string;
  prptype: string;
  yearno: number | string;
};

/** Numeric string -> number (payloads send uid / srno / yearno as numbers). */
export const asNum = (v: any) => {
  const n = Number(v);
  return v !== '' && v !== null && v !== undefined && Number.isFinite(n) ? n : v;
};

/* -------------------------------------------------------------------------- */
/*  Response helpers — tolerate every wrapper the backend uses                 */
/*  (reporesponse -> {success, data}, response()->json -> {status, message},   */
/*   sendResponse -> {success, data:{message}}).                               */
/* -------------------------------------------------------------------------- */

export const unwrapBody = (response: any) => {
  const body: any = response?.data ?? response;
  const payload = body?.response?.data ?? body?.data ?? body ?? {};
  return payload?.data && typeof payload.data === 'object' && !Array.isArray(payload.data)
    ? payload.data
    : payload;
};

export const isSaved = (response: any) => {
  const body = response?.data ?? response;
  return (
    body === true ||
    body?.status === true ||
    body?.success === true ||
    body?.response === true ||
    body?.data === true
  );
};

export const messageOf = (response: any, fallback: string) => {
  const body = response?.data ?? response;
  return body?.message || body?.data?.message || fallback;
};
