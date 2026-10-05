// FILE: src/components/OwnerDashboardNEW/api.ts
// Every HTTP call of the NEW ERP Owner Dashboard screen (ONE call).
//
//   GET {API}/api/getOwnerSummaryDashboard?date=YYYY-MM-DD&prptype=S&executive_code=<code|''>
//     headers : Authorization: Bearer <token>, Accept: application/json
//     backend : App\Http\Controllers\API\Analysis\OwnerSummaryDashboardController@getDashboard
//               (a NEW endpoint that re-uses the EXISTING dashboard queries — getOwnerDashboard,
//               DashboardSalesAnalyticsService, ExpenseDashboardCardService — so every figure matches
//               the existing Dashboard / Monthly Report / Production Cost card)
//     returns : { success, response: OwnerSummaryData, message }
//
// Host = `API` prop and Bearer = `token` prop, both injected by ErpSessionGate
// (sudamo_knits -> apig, rayons -> apiy). No AsyncStorage key is read or written here.
import axios from 'axios';
import type { OwnerSummaryData } from './model';
import type { TrackerDetailData, TrackerOrdersData } from './trackerModel';

export type OwnerSummaryParams = {
  date: string; // YYYY-MM-DD
  prptype: string;
  executive_code?: string;
  refresh?: 0 | 1;
};

export class OwnerSummaryError extends Error {
  status?: number;
  code?: string;
}

export async function getOwnerSummaryDashboard(
  API: string,
  token: string,
  params: OwnerSummaryParams,
): Promise<OwnerSummaryData> {
  try {
    const response = await axios.get(`${API}/api/getOwnerSummaryDashboard`, {
      params: {
        date: params.date,
        prptype: params.prptype,
        executive_code: params.executive_code || '',
        ...(params.refresh ? { refresh: 1 } : null),
      },
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    });

    const body = response.data;

    if (!body || body.success === false || !body.response) {
      const error = new OwnerSummaryError(body?.message || 'Unable to load Owner Dashboard.');
      error.code = body?.code;
      throw error;
    }

    return body.response as OwnerSummaryData;
  } catch (err: any) {
    if (err instanceof OwnerSummaryError) throw err;

    const status: number | undefined = err?.response?.status;
    const data = err?.response?.data;
    const error = new OwnerSummaryError(
      status === 403
        ? data?.message || 'Owner Dashboard is available only to Director or Super Admin users.'
        : status === 404
          ? 'Owner Dashboard API is not available on this server yet (route getOwnerSummaryDashboard).'
          : data?.message || err?.message || 'Unable to load Owner Dashboard.',
    );
    error.status = status;
    error.code = data?.code;
    throw error;
  }
}

/* ------------------------------------------------------------------ */
/* Executive Summary drill-down (sales order stage tracker)            */
/* ------------------------------------------------------------------ */
//   GET {API}/api/getOwnerSummaryOrders?date&prptype&executive_code
//       -> open sales orders of the executive with the 7-stage tracker
//   GET {API}/api/getOwnerSummaryOrderDetail?date&prptype&so_uid
//       -> one sales order: stages, production orders, beams, outward / inward, bills, plan vs actual
//   backend : App\Http\Controllers\API\Analysis\OwnerSummaryOrderTrackerController (@orders / @detail)
//             stage dates are read from the ERP tracking table ProductionTrackingBeamSummary.

async function trackerGet<T>(API: string, token: string, path: string, params: Record<string, string>, what: string): Promise<T> {
  try {
    const response = await axios.get(`${API}/api/${path}`, {
      params,
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    });
    const body = response.data;
    if (!body || body.success === false || !body.response) {
      const error = new OwnerSummaryError(body?.message || `Unable to load ${what}.`);
      error.code = body?.code;
      throw error;
    }
    return body.response as T;
  } catch (err: any) {
    if (err instanceof OwnerSummaryError) throw err;
    const status: number | undefined = err?.response?.status;
    const data = err?.response?.data;
    const error = new OwnerSummaryError(
      status === 403
        ? data?.message || 'Owner Dashboard is available only to Director or Super Admin users.'
        : status === 404 && !data?.message
          ? `This API is not available on this server yet (route ${path}).`
          : data?.message || err?.message || `Unable to load ${what}.`,
    );
    error.status = status;
    error.code = data?.code;
    throw error;
  }
}

export function getOwnerSummaryOrders(
  API: string,
  token: string,
  params: { date: string; prptype: string; executive_code: string },
): Promise<TrackerOrdersData> {
  return trackerGet<TrackerOrdersData>(API, token, 'getOwnerSummaryOrders', params, 'sales orders');
}

export function getOwnerSummaryOrderDetail(
  API: string,
  token: string,
  params: { date: string; prptype: string; so_uid: string },
): Promise<TrackerDetailData> {
  return trackerGet<TrackerDetailData>(API, token, 'getOwnerSummaryOrderDetail', params, 'sales order detail');
}
