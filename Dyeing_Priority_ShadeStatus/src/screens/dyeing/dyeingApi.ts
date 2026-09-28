// FILE: src/screens/dyeing/dyeingApi.ts
// Single service used by all three Dyeing tabs.
//
// >>> RIGHT NOW every call returns HARD-CODED JSON (dyeingMockData.ts) so the
// >>> screens can be tested before the backend is deployed.
//
// TO SWITCH TO THE REAL BACKEND (after the PHP/SQL changes are live):
//   in each function below, comment the `mock...` line and UN-comment the
//   `DyeingAPI...` / `PriorityAPI...` line right above it. Nothing else in
//   the screens has to change — mock and API return the same shape.
//
// Every function returns the raw axios-style response ({ data: body }), the
// screens unwrap it with `unwrapBody` / `isSaved`.

// import { DyeingAPI, PriorityAPI } from '@/src/api/legacyClient';
import { DyeingAPI, PriorityAPI } from '../../api/legacyClient';
// import {
//   mockDyeingBrowse,
//   mockDyeingDailyUpdate,
//   mockDyeingMillHub,
//   mockSaveDyeingLot,
//   mockSaveDyeingStatus,
//   mockSavePriorityOrder,
// } from './dyeingMockData';
import { SaveLotPayload, SaveStatusPayload } from './dyeingModel';

type Ctx = { prptype: string; yearno: string | number };

export const DyeingService = {
  /** Priority tab — charts with per-shade rows, lots and status history. */
  browse: (ctx: Ctx) => {
    return DyeingAPI.priorityBrowse(ctx);
    // return mockDyeingBrowse();
  },

  /**
   * Priority order save — UNCHANGED existing endpoint (save_priority_party),
   * same payload as before. Only SelfPriority changes; ClientPriority is sent
   * back exactly as received.
   */
  savePriorityOrder: (payloads: Record<string, any>[]) => {
    return PriorityAPI.save(payloads);
    // return mockSavePriorityOrder(payloads);
  },

  /** Row-wise status save (one lot of one colour). */
  saveStatus: (payload: SaveStatusPayload) => {
    return DyeingAPI.saveStatus(payload);
    // return mockSaveDyeingStatus(payload);
  },

  /** Add / edit / remove a lot. */
  saveLot: (payload: SaveLotPayload) => {
    return DyeingAPI.saveLot(payload);
    // return mockSaveDyeingLot(payload);
  },

  /** Daily Update tab — raw events for the range. */
  dailyUpdate: (body: Ctx & { fromdate: string; todate: string }) => {
    return DyeingAPI.dailyUpdate(body);
    // return mockDyeingDailyUpdate(body);
  },

  /**
   * Shade status (status sheet) — OLD shade-level endpoint /save_priority_status,
   * body { prptype, yearno, OrderUId, OrderSrNo, ChartNo, ParCode, DsnCode,
   * DsnName, PartyName, shades: [{ ShdCode, ShdName, Status }] }. Backend also
   * writes the dated history event (colourHistory) shown as chips.
   */
  saveShadeStatus: (payload: Record<string, any>) => {
    return PriorityAPI.saveShadeStatus(payload);
  },

  /** Priority status sheet — outward (challan) help + saved outward lot nos of a chart. */
  outwardDetails: (params: { prptype: string; chartno: string; yearno: string | number }) => {
    return DyeingAPI.outwardDetails(params);
  },

  /**
   * Add / edit the lot no. of one outward line. Sent as query params exactly
   * like the URL contract; if the route is registered as POST (405 on GET)
   * the same params are re-sent as POST.
   */
  saveOutwardDetails: async (params: {
    prptype: string; chartno: string; yearno: string | number; uid: string | number; srno: string | number; lotno: string;
  }) => {
    try {
      return await DyeingAPI.saveOutwardDetails(params);
    } catch (err: any) {
      if (err?.response?.status === 405) return DyeingAPI.saveOutwardDetailsPost(params);
      throw err;
    }
  },

  /** Mill Hub tab — history up to `todate`. */
  millHub: (body: Ctx & { fromdate: string; todate: string }) => {
    return DyeingAPI.millHub(body);
    // return mockDyeingMillHub(body);
  },
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
