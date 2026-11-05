// FILE: src/components/MergeMasterDataNEW/api.ts
// Merge Master Data — network layer (single place for URLs, payload keys and error handling).
import axios from 'axios';
import AsyncStorage from '../../common/utils/compatibleStorage';
import {
  MasterTable,
  MergePayload,
  PropertyOpt,
  TXN_TYPE,
  extractList,
  findYearNo,
  toMasterTable,
  toPropertyOptions
} from './model';

/**
 * Laravel routes (routes/api.php):
 *   Route::prefix('merge-master-data')->group(function () {
 *     Route::get('browse-data',  [MergeMasterDataController::class, 'browse_data']);   // first dropdown
 *     Route::get('show-data',    [MergeMasterDataController::class, 'show_data']);     // Main / Merge panels
 *     Route::post('modify-data', [MergeMasterDataController::class, 'modify_data']);
 *   });
 * browse-data fills the first dropdown; show-data fills the Main / Merge panels
 * and receives the selected dropdown code in the `mstcode` key.
 */
const BASE = '/api/merge-master-data';
export const ENDPOINTS = {
  /** GET  — first dropdown. Params: prptype, yearno, txntype (NO mstcode here) */
  properties: `${BASE}/browse-data`,
  /** GET  — rows for the Main / Merge panels. Params: prptype, yearno, txntype, mstcode (= first dropdown selection) */
  records: `${BASE}/show-data`,
  /** POST — Save / Merge button. Body: prptype, yearno, txntype, mstcode, maincode, mergecode, mainstrcode, mergestrcode, action */
  merge: `${BASE}/modify-data`,
} as const;

/** `message` = the friendly text the server sent; `details` = technical text (SQL / exception) shown only under "Technical details". */
export class ApiError extends Error {
  details: string;
  constructor(message: string, details = '') {
    super(message);
    this.details = details;
  }
}

/** prptype is read dynamically from login.response.prptypes / yearno / txntype — attached to EVERY request. */
export const baseScope = (yearNo: string, prpType: string) => ({ prptype: prpType, yearno: yearNo, txntype: TXN_TYPE });

const headers = (token: string) => ({
  Authorization: `Bearer ${token}`,
  'Content-Type': 'application/json',
  Accept: 'application/json',
  'X-Requested-With': 'XMLHttpRequest',
});

/* ------------------------------------------------------------------ */
/* Messages / errors                                                   */
/* ------------------------------------------------------------------ */

const firstText = (v: any): string => {
  if (v === null || v === undefined) return '';
  if (typeof v === 'string') {
    const t = v.trim();
    return t === 'true' || t === 'false' ? '' : t;
  }
  if (Array.isArray(v)) {
    for (const x of v) {
      const t = firstText(x);
      if (t) return t;
    }
    return '';
  }
  if (typeof v === 'object') {
    for (const k of ['message', 'Message', 'msg', 'error_message']) {
      const t = firstText(v[k]);
      if (t) return t;
    }
    for (const x of Object.values(v)) {
      const t = firstText(x);
      if (t) return t;
    }
  }
  return '';
};

/** The text the SERVER sent (success or failure) — shown to the user as-is. */
export const serverMessage = (d: any): string =>
  firstText(d?.message) || firstText(d?.Message) || firstText(d?.msg) || firstText(d?.response?.message) || firstText(d?.errors) || firstText(d?.error);

const isFlag = (v: any) => v === true || v === 'true' || v === 1 || v === '1';

/** Everything technical the server sent besides the main message (response.error, error, errors ...). */
export const errorDetails = (d: any, main = ''): string => {
  const out: string[] = [];
  const add = (v: any) => {
    const t = firstText(v);
    if (t && t !== main && !out.includes(t)) out.push(t);
  };
  add(d?.response?.error);
  add(d?.response?.errors);
  add(d?.error);
  add(d?.errors);
  add(d?.exception);
  add(d?.trace);
  return out.join('\n\n');
};

/** Technical details for ANY failure (server body, HTTP status, network). */
export const detailsOf = (e: any): string => {
  if (e instanceof ApiError) return e.details;
  const parts: string[] = [];
  const status = e?.response?.status;
  if (status) parts.push(`HTTP ${status}${e?.response?.statusText ? ` ${e.response.statusText}` : ''}`);
  const d = errorDetails(e?.response?.data, serverMessage(e?.response?.data));
  if (d) parts.push(d);
  if (!status && e?.message) parts.push(String(e.message));
  return parts.join('\n\n');
};

/** success:false / error:true / _AUTHFAILED (also inside `response`) -> throw the server's own message. */
const assertOk = (res: any) => {
  const d = res?.data;
  const authFailed = d?.response?.isauth === '_AUTHFAILED' || d?.isauth === '_AUTHFAILED';
  const failed =
    authFailed ||
    d?.success === false || d?.status === false ||
    isFlag(d?.error) || isFlag(d?.response?.error) || isFlag(d?.data?.error) ||
    d?.response?.success === false;
  if (failed) {
    const main = serverMessage(d) || (authFailed ? 'You are not authorised for this action.' : 'The server rejected the request.');
    throw new ApiError(main, errorDetails(d, main));
  }
};

export const isCancelled = (e: any) => axios.isCancel(e) || e?.code === 'ERR_CANCELED' || e?.name === 'CanceledError';

export const messageOf = (e: any, fallback: string): string => {
  if (e instanceof ApiError) return e.message;
  const status = e?.response?.status;
  if (status === 401) return 'Your session has expired. Please log in again.';
  if (status === 403) return 'You do not have permission for this action.';
  return (
    serverMessage(e?.response?.data) ||
    (e?.request && !e?.response ? 'Network problem. Please check your internet connection and try again.' : '') ||
    e?.message ||
    fallback
  );
};

/* ------------------------------------------------------------------ */
/* Login year                                                          */
/* ------------------------------------------------------------------ */

/**
 * YearNo comes from the LOGIN response (never typed / hard-coded):
 *   1. mobile_raw_login_response  (the whole login payload, `year.YearNo`)
 *   2. yno                        (saved by the embedded login)
 *   3. any other stored login object that carries a YearNo
 */
export async function readLoginYearNo(): Promise<string> {
  const parse = (raw: string | null) => {
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return raw; }
  };
  try {
    const login = parse(await AsyncStorage.getItem('mobile_raw_login_response'));
    const fromLogin = findYearNo(login);
    if (fromLogin) return fromLogin;
  } catch { /* try next source */ }
  try {
    const yno = await AsyncStorage.getItem('yno');
    if (yno && String(yno).trim() && String(yno).trim() !== 'undefined' && String(yno).trim() !== 'null') return String(yno).trim();
  } catch { /* try next source */ }
  try {
    const keys = await AsyncStorage.getAllKeys();
    for (const key of keys) {
      try {
        const found = findYearNo(parse(await AsyncStorage.getItem(key)));
        if (found) return found;
      } catch { /* continue */ }
    }
  } catch { /* getAllKeys not supported */ }
  return '';
}

/* ------------------------------------------------------------------ */
/* Login response -> prptype */

/**
 * Finds the selected login property in response.prptypes and returns its PrpOf.
 * Example: selected PrpCode MT -> matching prptypes entry -> PrpOf R.
 * The value is taken only from the login response; no hard-coded company mapping.
 */
export async function readLoginPrpType(): Promise<string> {
  try {
    const raw = await AsyncStorage.getItem('mobile_raw_login_response');
    if (!raw) return '';
    let login: any;
    try { login = JSON.parse(raw); } catch { return ''; }
    const r = login?.response ?? login;
    const selectedPrpCode =
      r?.app_session?.business_context?.prp_code ??
      r?.prpcode ??
      r?.year?.PrpCode ??
      '';
    const prpTypes = Array.isArray(r?.prptypes) ? r.prptypes : [];
    const selectedType = prpTypes.find(
      (item: any) => String(item?.PrpCode ?? '').trim().toUpperCase() === String(selectedPrpCode).trim().toUpperCase()
    );
    return String(selectedType?.PrpOf ?? '').trim().toUpperCase();
  } catch {
    return '';
  }
}

/* Calls                                                               */
/* ------------------------------------------------------------------ */

type Ctx = { API: string; token: string; yearNo: string; prpType: string; signal?: AbortSignal };

/** First dropdown. Everything the API returns is shown — nothing is filtered or hard-coded. */
export async function fetchProperties({ API, token, yearNo, prpType, signal }: Ctx): Promise<PropertyOpt[]> {
  const res = await axios.get(`${API}${ENDPOINTS.properties}`, { params: baseScope(yearNo, prpType), headers: headers(token), signal });
  assertOk(res);
  return toPropertyOptions(extractList(res.data));
}

/** Rows for both panels (Main / Merge) — show-data, selected dropdown code goes in `mstcode`. */
export async function fetchRecords({ API, token, yearNo, prpType, signal }: Ctx, mstCode: string): Promise<MasterTable> {
  const res = await axios.get(`${API}${ENDPOINTS.records}`, {
    params: { ...baseScope(yearNo, prpType), mstcode: mstCode },
    headers: headers(token),
    signal,
  });
  assertOk(res);
  return toMasterTable(extractList(res.data), mstCode);
}

/** Save / Merge — one POST. Resolves with the server's own success message. */
export async function postMerge({ API, token, yearNo, prpType }: Ctx, p: MergePayload): Promise<string> {
  const res = await axios.post(
    `${API}${ENDPOINTS.merge}`,
    {
      ...baseScope(yearNo, prpType),
      mstcode: p.property,
      maincode: p.mainCode,
      mergecode: p.mergeCode,
      ...(p.mainStrCode || p.mergeStrCode ? { mainstrcode: p.mainStrCode ?? '', mergestrcode: p.mergeStrCode ?? '' } : null),
      action: p.action,
    },
    { headers: headers(token), timeout: 60000 },
  );
  assertOk(res);
  return serverMessage(res.data) || 'Merge completed successfully.';
}
