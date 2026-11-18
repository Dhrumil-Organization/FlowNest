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
//             jobwork -> Outsourcing hub + Yarn ledger (FY to `to`) · jobwork_rolls&uid= -> rolls of one inward
//             production_rolls&uid=prp|machine|beam -> the rolls of one Production record
//             yarn_usage -> yarns of DTS designs, DTS-only / common (Stock)
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

/* ------------------------------------------------------------------ */
/* One line for every DTS request.                                     */
/* Opening the screen used to send ~20 heavy requests at the same moment (every widget, stock, the yarn and fabric */
/* stock reports). The server then timed some out — that is why Stock showed "retry" and needed 3-4 taps.        */
/* Now at most MAX_PARALLEL run together and the rest wait their turn; a request that fails because the server    */
/* was busy (timeout, network, 5xx) is tried again by itself before an error is shown.                           */
/* ------------------------------------------------------------------ */
const MAX_PARALLEL = 4;
let running = 0;
const waiting: (() => void)[] = [];

/** urgent = asked for by a page the owner has open: it goes to the FRONT of the line, ahead of dashboard cards */
export async function limited<T>(job: () => Promise<T>, urgent = false): Promise<T> {
  if (running >= MAX_PARALLEL) await new Promise<void>((go) => (urgent ? waiting.unshift(go) : waiting.push(go)));
  running++;
  try {
    return await job();
  } finally {
    running--;
    const next = waiting.shift();
    if (next) next();
  }
}

/** busy-server failures are worth one more try; a refusal (401 / 403 / 404 / 422) is not */
const transient = (e: any) => {
  const st = e?.status ?? e?.response?.status;
  if (st === 401 || st === 403 || st === 404 || st === 422) return false;
  return !st || st >= 500 || e?.code === 'ECONNABORTED' || /timeout|network/i.test(String(e?.message || ''));
};

export async function withRetry<T>(job: () => Promise<T>, tries = 3, urgent = false): Promise<T> {
  let last: any;
  for (let i = 0; i < tries; i++) {
    try {
      return await limited(job, urgent);
    } catch (e: any) {
      last = e;
      if (!transient(e) || i === tries - 1) break;
      await new Promise((r) => setTimeout(r, 1200 * (i + 1)));
    }
  }
  throw last;
}

export type DtsParams = { prptype: string; section: DtsSection; from?: string; to?: string; metric?: string; uid?: string; urgent?: boolean };

export function getDtsSection(API: string, token: string, params: DtsParams): Promise<DtsResponse> {
  return withRetry(() => getDtsSectionOnce(API, token, params), 3, !!params.urgent);
}

async function getDtsSectionOnce(API: string, token: string, params: DtsParams): Promise<DtsResponse> {
  try {
    const response = await axios.get(`${API}/api/getDtsDashboard`, {
      params: {
        prptype: params.prptype,
        section: params.section,
        ...(params.from ? { from: params.from } : null),
        ...(params.to ? { to: params.to } : null),
        ...(params.metric ? { metric: params.metric } : null),
        ...(params.uid ? { uid: params.uid } : null),
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
