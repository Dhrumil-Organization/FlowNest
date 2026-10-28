// FILE: src/components/ProcessCompleteRequestNew/api.ts
// HTTP calls of the Process Complete Request screen.
// Same URL / method / headers / body as ProcessCompleteAuthNEW/api.ts → getProcessCompleteData,
// host = `API` prop, Bearer = `token` prop (from ErpSessionGate).
import axios from 'axios';

// property / year masters are shared with Process Complete Auth
export { fetchAllPropertyData, fetchAllYeardata } from '../ProcessCompleteAuthNEW/api';

export type Row = Record<string, any>;

/** Criteria chosen in the filter sheet. Dates are 'YYYY-MM-DD'. */
export type CriteriaPayload = { prpcode: string; yearno: string; fromdate: string; todate: string };

export type ProcessTab = 'request' | 'browse';

/** Tabs of the screen. pending → get_process_complete_data, request → process-complete-request/browse-data */
export type ScreenTab = 'pending' | 'request' | 'authorised';

const REQUEST_TIMEOUT_MS = 30000;

const jsonHeaders = (token: string) => ({
  Authorization: `Bearer ${token}`,
  'Content-Type': 'application/json',
  'X-Requested-with': 'XMLHttpRequest',
});

/** POST get_process_complete_data. Returns response.data as-is. */

export async function getProcessCompleteData(
  API: string,
  token: string,
  prptype: any,
  criteria?: CriteriaPayload | null,
  activeTab: ProcessTab = 'request',
): Promise<any> {
  const payload = {
    prptype,
    txntype: 'mobile_api',
    chkldcldata: 1,
    chkrpt: 0,
    referrer:
      activeTab === 'request'
        ? 'process_complete_request'
        : 'process_complete_browse',

    // ...(criteria
    //   ? {
    //     prpcode: criteria.prpcode,
    //     yearno: criteria.yearno,
    //     fromdate: criteria.fromdate,
    //     todate: criteria.todate,
    //   }
    //   : {}),
  };

  const response = await axios.post(
    `${API}/api/get_process_complete_data`,
    payload,
    {
      headers: jsonHeaders(token),
      timeout: REQUEST_TIMEOUT_MS,
    },
  );

  return response.data;
}


/**
 * Rows for the Batch No. dropdown (each row has MerName, PartyNames, ItmName, ShdName, Cones, NetWt, ProdType …).
 *  success:true  + data[]  → rows (can be empty)
 *  anything else           → throws Error(message sent by the API)
 */
export async function fetchBatchRows(API: string, token: string, prptype: any, criteria?: CriteriaPayload | null, activeTab: ProcessTab = 'request',): Promise<Row[]> {
  const data = await getProcessCompleteData(API, token, prptype, criteria, activeTab,);
  if (data?.success === true) return Array.isArray(data.data) ? data.data : [];
  throw new Error(data?.message ? String(data.message) : 'Could not load the batch list.');
}


/* ========================================================================== */
/*  process-complete-request  (Laravel route group)                           */
/*                                                                            */
/*  Route::prefix('process-complete-request')                                 */
/*    GET  browse-data   → ProcessCompleteRequestController@browse_data       */
/*    GET  show-data     → ProcessCompleteRequestController@show_data         */
/*    POST add-data      → ProcessCompleteRequestController@add_data          */
/*    POST modify-data   → ProcessCompleteRequestController@modify_data       */
/*    POST delete-data   → ProcessCompleteRequestController@delete_data       */
/*                                                                            */
/*  Existing calls above (getProcessCompleteData / fetchBatchRows) are        */
/*  untouched. Every function below returns response.data as-is.              */
/* ========================================================================== */

const PCR_BASE = '/api/process-complete-request';

/** GET browse-data — list of saved requests (Browse tab). `params` = optional filters, e.g. { prptype, fromdate, todate }. */
export async function getBrowseData(
  API: string,
  token: string,
  params: Record<string, any> = {},
): Promise<any> {
  const response = await axios.get(`${API}${PCR_BASE}/browse-data`, {
    headers: jsonHeaders(token),
    params,
    timeout: REQUEST_TIMEOUT_MS,
  });
  return response.data;
}

/** GET show-data — one saved request. `params` = identifier of the record, e.g. { id } / { reqno }. */
export async function getShowData(
  API: string,
  token: string,
  params: Record<string, any> = {},
): Promise<any> {
  const response = await axios.get(`${API}${PCR_BASE}/show-data`, {
    headers: jsonHeaders(token),
    params,
    timeout: REQUEST_TIMEOUT_MS,
  });
  return response.data;
}

/** POST add-data — save a new request (e.g. the batches added in the grid). */
export async function addProcessCompleteRequest(
  API: string,
  token: string,
  payload: Record<string, any>,
): Promise<any> {
  const response = await axios.post(`${API}${PCR_BASE}/add-data`, payload, {
    headers: jsonHeaders(token),
    timeout: REQUEST_TIMEOUT_MS,
  });
  return response.data;
}

/** POST modify-data — update an existing request. */
export async function modifyProcessCompleteRequest(
  API: string,
  token: string,
  payload: Record<string, any>,
): Promise<any> {
  const response = await axios.post(`${API}${PCR_BASE}/modify-data`, payload, {
    headers: jsonHeaders(token),
    timeout: REQUEST_TIMEOUT_MS,
  });
  return response.data;
}

/** POST delete-data — delete an existing request. */
export async function deleteProcessCompleteRequest(
  API: string,
  token: string,
  payload: Record<string, any>,
): Promise<any> {
  const response = await axios.post(`${API}${PCR_BASE}/delete-data`, payload, {
    headers: jsonHeaders(token),
    timeout: REQUEST_TIMEOUT_MS,
  });
  return response.data;
}


/* ========================================================================== */
/*  Helpers used by the new Pending / Request screen                          */
/* ========================================================================== */

/**
 * Pull rows out of the API response shapes used by this module.
 * browse_data can return:
 * { success: true, response: { "0": { ...row }, "1": { ...row }, message: "..." } }
 * rather than a normal `data: []` array. Convert only numeric-keyed objects
 * to rows and ignore metadata such as `message`.
 */
export function unwrapRows(data: any): Row[] {
  const toRows = (value: any): Row[] | null => {
    if (Array.isArray(value)) return value;
    if (!value || typeof value !== 'object') return null;

    // Some endpoints return one record directly.
    if ('RequestId' in value || 'Gruid' in value || 'MerName' in value) {
      return [value as Row];
    }

    // Laravel/PHP may serialize a numerically indexed collection as an object.
    const numericKeys = Object.keys(value)
      .filter((key) => /^\d+$/.test(key))
      .sort((a, b) => Number(a) - Number(b));
    if (numericKeys.length > 0) {
      return numericKeys
        .map((key) => value[key])
        .filter((row) => row && typeof row === 'object' && !Array.isArray(row)) as Row[];
    }
    return null;
  };

  const candidates = [data?.response, data?.data?.response, data?.data?.data, data?.data, data];
  for (const candidate of candidates) {
    const rows = toRows(candidate);
    if (rows !== null) return rows;
  }
  return [];
}

/** Extract a useful message from common API/Laravel error response shapes. */
export function getApiErrorMessage(data: any, fallback = 'Server Error'): string {
  const candidates = [
    data?.response?.data?.message,
    data?.response?.message,
    data?.data?.message,
    data?.message,
    data?.error,
    data?.errors,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) return candidate.trim();
    if (Array.isArray(candidate)) {
      const messages = candidate.filter((value) => typeof value === 'string' && value.trim());
      if (messages.length) return messages.join('\n');
    }
    if (candidate && typeof candidate === 'object') {
      const messages = Object.values(candidate)
        .flatMap((value: any) => Array.isArray(value) ? value : [value])
        .filter((value) => typeof value === 'string' && value.trim());
      if (messages.length) return messages.join('\n');
    }
  }
  return fallback;
}

/** Throws when the API explicitly reports failure, including nested responses. */
export function assertOk(data: any, fallback: string): any {
  const result = data?.response && typeof data.response === 'object' ? data.response : null;
  const failed = data?.success === false || data?.status === false ||
    result?.success === false || result?.status === false ||
    data?.error === true || result?.error === true;
  if (failed) throw new Error(getApiErrorMessage(data, fallback));
  return data;
}

/** PENDING tab → POST get_process_complete_data (payload unchanged: referrer = process_complete_request). */
export async function fetchPendingRows(
  API: string,
  token: string,
  prptype: any,
  criteria?: CriteriaPayload | null,
): Promise<Row[]> {
  const data = await getProcessCompleteData(API, token, prptype, criteria, 'request');
  if (data?.success === true) return unwrapRows(data);
  throw new Error(data?.message ? String(data.message) : 'Could not load pending batches.');
}

/** REQUEST tab → GET process-complete-request/browse-data. */
export async function fetchRequestRows(
  API: string,
  token: string,
  prptype: any,
  criteria?: CriteriaPayload | null,
): Promise<Row[]> {
  const data = await getBrowseData(API, token, {
    prptype,
    txntype: 'mobile_api',
    ...(criteria
      ? { prpcode: criteria.prpcode, yearno: criteria.yearno, fromdate: criteria.fromdate, todate: criteria.todate }
      : {}),
  });
  assertOk(data, 'Could not load requests.');
  return unwrapRows(data);
}

/** Page render → GET process-complete-request/show-data. */
export async function fetchShowData(API: string, token: string, prptype: any): Promise<any> {
  const data = await getShowData(API, token, { prptype, txntype: 'mobile_api' });
  return assertOk(data, 'Could not load page data.');
}

/**
 * Body for add-data / delete-data.
 * >>> If your Laravel controller expects other field names, change ONLY this function. <<<
 */
export function buildSelectionPayload(prptype: any, rows: Row[], criteria?: CriteriaPayload | null) {
  // Match the field names returned by process-complete-request/show-data.response.
  // Keep the selected rows as an array for multi-select saves; the first selected
  // row is also copied to the top-level fields for APIs expecting a single record.
  const fields = [
    'RequestId', 'PrpCode', 'YearNo', 'Gruid', 'PrUid', 'GreadingNo', 'PackingNo',
    'PackDate', 'ItmCode', 'TotWt', 'TotPcs', 'ItmName', 'ProdType', 'PStockDate',
    'StockDate', 'MerCode', 'MerName', 'ShdCode', 'ShdName', 'ProcessUId', 'GradUId',
    'PartyNames', 'Cones', 'NetWt', 'PCones', 'PQty', 'CartNo', 'CartonCount', 'message',
  ];
  const mapRowToShowData = (row: Row) => {
    const mapped: Record<string, any> = {};
    fields.forEach((key) => {
      // RequestId/message are request-level fields and do not exist in pending rows.
      if (key === 'RequestId') mapped[key] = row?.[key] ?? 0;
      else if (key === 'message') mapped[key] = row?.[key] ?? '';
      else mapped[key] = row?.[key] ?? '';
    });
    return mapped;
  };
  const mappedRows = rows.map(mapRowToShowData);
  return {
    // ...(mappedRows[0] || Object.fromEntries(fields.map((key) => [key, key === 'RequestId' ? 0 : '']))),
    prptype,
    txntype: 'mobile_api',
    referrer: 'process_complete_request',
    ...(criteria ?? {}),
    batches: mappedRows,
    // mernames: rows.map((r) => r?.MerName).filter((x) => x !== undefined && x !== null),
  };
}

/** Save button (Pending tab) → POST add-data. */
export async function saveSelected(API: string, token: string, prptype: any, rows: Row[], criteria?: CriteriaPayload | null) {
  const data = await addProcessCompleteRequest(API, token, buildSelectionPayload(prptype, rows, criteria));
  return assertOk(data, 'Could not save.');
}

/**
 * Build the delete-data body separately from add-data.
 * The backend expects RequestId as an array of objects, one for each
 * selected request card, along with the active criteria and transaction type.
 */
export function buildDeletePayload(
  prptype: any,
  rows: Row[],
  criteria?: CriteriaPayload | null,
) {
  return {
    // Send primitive RequestId values from the selected browse-data rows.
    // Example: selecting RequestId 1, 2, 3, and 4 sends [1, 2, 3, 4].
    RequestId: rows
      .map((row) => row?.RequestId)
      .filter((id) => id !== undefined && id !== null && id !== ''),
    prptype,
    txntype: 'mobile_api',
    referrer: 'process_complete_request',
    ...(criteria
      ? {
          prpcode: criteria.prpcode,
          yearno: criteria.yearno,
          fromdate: criteria.fromdate,
          todate: criteria.todate,
        }
      : {}),
  };
}

/** Delete button (Request tab) → POST delete-data. */
export async function deleteSelected(API: string, token: string, prptype: any, rows: Row[], criteria?: CriteriaPayload | null) {
  const payload = buildDeletePayload(prptype, rows, criteria);
  const data = await deleteProcessCompleteRequest(API, token, payload);
  return assertOk(data, 'Could not delete.');
}
