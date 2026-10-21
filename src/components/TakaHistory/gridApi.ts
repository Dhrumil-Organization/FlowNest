// FILE: src/components/TakaHistory/gridApi.ts
// API of the wide "journey grid" (one row per taka, every step as columns) - same endpoints as the expo-grid app:
//   POST {API}/api/taka-grid/runs                       body { prp_codes, str_codes, date_mode, as_on_date | from_date + to_date, yearno, only_in_stock, max_steps, refresh }
//   GET  {API}/api/taka-grid/runs/{run}/columns
//   GET  {API}/api/taka-grid/runs/{run}/rows            ?search&sort&dir&filters(json)&page&per_page
//   POST {API}/api/taka-grid/runs/{run}/export         body { search, sort, dir, filters, cols }   -> .xlsx (small) or streamed .csv (big)
//        (POST, not GET: 150+ column names + filters make the URL too long, the web server then fails the CORS preflight = "Network Error")
// Host = `API`, Bearer = `token` (same as the rest of the module).
import axios from 'axios';
import { Platform } from 'react-native';

export const GRID_MAX_STEPS = 30;
export const GRID_PAGE_SIZE = 200;

export type GridCreate = {
  prp_codes: string;
  str_codes: string;
  date_mode: 'A' | 'S'; // 'A' = as on date, 'S' = sales between from_date and to_date
  as_on_date?: string;
  from_date?: string;
  to_date?: string;
  yearno: string;
  refresh: boolean;
};
export type GridRun = { run_id: number; as_on_date?: string | null; from_date?: string | null; to_date?: string | null; prp_codes?: string; str_codes?: string };
export type GridColType = 'text' | 'number' | 'date';
export type GridColumn = { name: string; label: string; group?: string | null; type: GridColType };
export type GridFilter = { col: string; op: string; value?: string; value2?: string };
export type GridRowsPage = {
  columns: string[];
  rows: any[][];
  totals: Record<string, number>;
  page: number;
  last_page: number;
  total: number;
};
export type GridQuery = { search?: string; sort?: string; dir?: string; filters?: GridFilter[] };

const base = (API: string) => `${API}/api/taka-grid`;

const qs = (params: Record<string, any>) =>
  Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(typeof v === 'object' ? JSON.stringify(v) : String(v))}`)
    .join('&');

async function request<T>(API: string, token: string, path: string, opts: { method?: 'GET' | 'POST'; body?: unknown; timeoutMs?: number } = {}): Promise<T> {
  try {
    const res = await axios.request<T>({
      url: `${base(API)}${path}`,
      method: opts.method || 'GET',
      data: opts.body,
      timeout: opts.timeoutMs ?? 60000,
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json', 'Content-Type': 'application/json' },
    });
    return res.data;
  } catch (err: any) {
    const status: number | undefined = err?.response?.status;
    throw new Error(
      err?.code === 'ECONNABORTED'
        ? 'Server took too long. Please try again.'
        : err?.response?.data?.message || (status ? `Server error ${status}` : err?.message || 'Unable to reach the server.'),
    );
  }
}

/** Building a fresh grid can take 30-60 seconds. */
export const createGridRun = (API: string, token: string, c: GridCreate) =>
  request<GridRun>(API, token, '/runs', {
    method: 'POST',
    body: { ...c, only_in_stock: false, max_steps: GRID_MAX_STEPS },
    timeoutMs: 330000,
  });

export const getGridColumns = (API: string, token: string, runId: number) =>
  request<{ columns: GridColumn[] }>(API, token, `/runs/${runId}/columns`);

export const getGridRows = (API: string, token: string, runId: number, q: GridQuery & { page: number; per_page: number }) =>
  request<GridRowsPage>(API, token, `/runs/${runId}/rows?${qs({ ...q, filters: q.filters?.length ? q.filters : undefined })}`);

// Blob -> base64 (works in browsers and in React Native)
const blobToBase64 = (blob: any): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new (globalThis as any).FileReader();
    reader.onloadend = () => resolve(String(reader.result).split(',')[1] || '');
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const CSV_MIME = 'text/csv';

/**
 * POSTs the grid state (search, sort, filters, visible columns) and saves the file
 * (saved on web, share sheet on phone). `cols` is [] when no column is hidden = export all columns.
 * The server sends .xlsx for small exports and a streamed .csv for big ones, so the file extension is
 * taken from the response - pass the name WITHOUT extension (baseName).
 */
export async function downloadGridExcel(API: string, token: string, runId: number, q: GridQuery & { cols: string[] }, baseName: string) {
  const res = await fetch(`${base(API)}/runs/${runId}/export`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ search: q.search, sort: q.sort, dir: q.dir, filters: q.filters || [], cols: q.cols }),
  });
  if (!res.ok) {
    const j: any = await res.json().catch(() => ({}));
    throw new Error(j?.message || `Export failed (${res.status})`);
  }
  const isCsv = (res.headers.get('Content-Type') || '').includes('text/csv');
  const fileName = `${baseName}.${isCsv ? 'csv' : 'xlsx'}`;
  const blob = await res.blob();

  if (Platform.OS === 'web') {
    const doc = (globalThis as any).document;
    const link = doc.createElement('a');
    link.href = (globalThis as any).URL.createObjectURL(blob);
    link.download = fileName;
    doc.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => (globalThis as any).URL.revokeObjectURL(link.href), 10000);
    return;
  }

  // phone: write to cache (expo-file-system, SDK 54+: 'expo-file-system/legacy'), then open the share sheet
  let FileSystem: any;
  try {
    FileSystem = require('expo-file-system/legacy');
  } catch (e) {
    FileSystem = require('expo-file-system');
  }
  const Sharing = require('expo-sharing');
  const uri = `${FileSystem.cacheDirectory}${fileName}`;
  await FileSystem.writeAsStringAsync(uri, await blobToBase64(blob), { encoding: 'base64' });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: isCsv ? CSV_MIME : XLSX_MIME,
      UTI: isCsv ? 'public.comma-separated-values-text' : 'org.openxmlformats.spreadsheetml.sheet',
      dialogTitle: 'Taka history Excel',
    });
  } else {
    throw new Error(`Saved to ${uri}`);
  }
}
