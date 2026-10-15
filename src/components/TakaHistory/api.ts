// FILE: src/components/TakaHistory/api.ts
// Every HTTP call of the NEW ERP Taka History module (4 calls, same endpoints as before).
//
//   POST {API}/api/taka-history/runs                          body { prp_codes, str_codes, as_on_date, refresh }
//   GET  {API}/api/taka-history/runs/{run}/totals             ?search&prp&only_in_stock
//   GET  {API}/api/taka-history/runs/{run}/takas              ?search&prp&only_in_stock&sort&page&per_page
//   GET  {API}/api/taka-history/runs/{run}/takas/{takaKey}    one taka + all its steps
//     headers : Authorization: Bearer <token>, Accept: application/json
//
// Host = `API` prop and Bearer = `token` prop, both injected by ErpSessionGate
// (sudamo_knits -> apig, rayons -> apiy). No config file, no API key in the app.
import axios from 'axios';
import type { TakaDetailData, TakaFilters, TakaRun, TakasPage, TakaTotals } from './model';

export class TakaHistoryError extends Error {
  status?: number;
}

type Params = Record<string, string | number | boolean | undefined | null>;

// drop empty values (same as the old query-string helper)
const clean = (p?: Params) =>
  Object.keys(p || {}).reduce<Record<string, string | number | boolean>>((acc, k) => {
    const v = (p as Params)[k];
    if (v !== undefined && v !== null && v !== '') acc[k] = v;
    return acc;
  }, {});

async function request<T>(
  API: string,
  token: string,
  path: string,
  opts: { method?: 'GET' | 'POST'; params?: Params; body?: unknown; timeoutMs?: number } = {},
): Promise<T> {
  try {
    const res = await axios.request<T>({
      url: `${API}/api/taka-history${path}`,
      method: opts.method || 'GET',
      params: clean(opts.params),
      data: opts.body,
      timeout: opts.timeoutMs ?? 30000,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    });
    return res.data;
  } catch (err: any) {
    const status: number | undefined = err?.response?.status;
    const error = new TakaHistoryError(
      err?.code === 'ECONNABORTED'
        ? 'Server took too long. Please try again.'
        : err?.response?.data?.message || (status ? `Server error ${status}` : err?.message || 'Unable to reach the server.'),
    );
    error.status = status;
    throw error;
  }
}

/** Builds (or re-uses) the snapshot. A fresh build can take 30-60 seconds on the server. */
export const createTakaRun = (
  API: string,
  token: string,
  body: { prp_codes: string; str_codes: string; as_on_date: string; yearno: string, refresh: boolean },
) => request<TakaRun>(API, token, '/runs', { method: 'POST', body, timeoutMs: 330000 });

export const getTakaTotals = (API: string, token: string, runId: number, filters: TakaFilters) =>
  request<TakaTotals>(API, token, `/runs/${runId}/totals`, { params: filters });

export const getTakas = (API: string, token: string, runId: number, filters: TakaFilters) =>
  request<TakasPage>(API, token, `/runs/${runId}/takas`, { params: filters });

export const getTaka = (API: string, token: string, runId: number, takaKey: string) =>
  request<TakaDetailData>(API, token, `/runs/${runId}/takas/${encodeURIComponent(takaKey)}`);
