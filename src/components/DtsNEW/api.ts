// FILE: src/components/DtsNEW/api.ts
// Every HTTP call of the NEW ERP DTS screen (ONE endpoint, one call per section).
//
//   GET {API}/api/getDtsDashboard?prptype=S&section=<section>&from=YYYY-MM-DD&to=YYYY-MM-DD
//     headers : Authorization: Bearer <token>, Accept: application/json
//     backend : App\Http\Controllers\API\Analysis\DtsDashboardController@getDashboard   (NEW controller)
//     returns : { success, section, from, to, fy, items: [...], meta: {...}, permissions: {...} }
//
//   section = meta | sales | booked | production | collection | outstanding | beam_shortage |
//             payments_made | monthly | pickmetres | outsourcing | outsourcing_yarn | mill_stock
//             target  -> the DTS targets of the month of `from`            (Target card, Monthly Report)
//             fy      -> one financial year month-wise, &metric=sales | sales_cross | production | payments |
//                        jobwork | pickmetres                               (the FY page — aggregated on the server)
//
// Host = `API` prop and Bearer = `token` prop, both injected by ErpSessionGate
// (sudamo_knits -> apig, rayons -> apiy). No AsyncStorage key is read or written here.
import axios from 'axios';
import type { DtsResponse, DtsSection } from './model';

export class DtsError extends Error {
  status?: number;
  code?: string;
}

export type DtsParams = { prptype: string; section: DtsSection; from?: string; to?: string; metric?: string };

export async function getDtsSection(API: string, token: string, params: DtsParams): Promise<DtsResponse> {
  try {
    const response = await axios.get(`${API}/api/getDtsDashboard`, {
      params: {
        prptype: params.prptype,
        section: params.section,
        ...(params.from ? { from: params.from } : null),
        ...(params.to ? { to: params.to } : null),
        ...(params.metric ? { metric: params.metric } : null),
      },
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      timeout: 180000,
    });
    const body = response.data;
    if (!body || typeof body !== 'object' || body.success === false) {
      const error = new DtsError(body?.message || 'Unable to load DTS.');
      error.code = body?.code;
      throw error;
    }
    return {
      section: params.section,
      from: String(body.from || params.from || ''),
      to: String(body.to || params.to || ''),
      fy: body.fy || { from: '', to: '', yearno: 0 },
      fromClamped: !!body.from_clamped_to_fy,
      truncated: !!body.truncated,
      items: Array.isArray(body.items) ? body.items : [],
      meta: body.meta && typeof body.meta === 'object' ? body.meta : {},
      permissions: body.permissions || { screen: true, sections: {} },
    };
  } catch (err: any) {
    if (err instanceof DtsError) throw err;
    const status: number | undefined = err?.response?.status;
    const data = err?.response?.data;
    const error = new DtsError(
      status === 403
        ? data?.message || 'You do not have the right to view this part of DTS.'
        : status === 404
          ? 'DTS API is not available on this server yet (route getDtsDashboard).'
          : data?.message
            ? `${data.message}${data?.error ? ` — ${String(data.error).slice(0, 180)}` : ''}`
            : err?.message || 'Unable to load DTS.',
    );
    error.status = status;
    error.code = data?.code;
    throw error;
  }
}
