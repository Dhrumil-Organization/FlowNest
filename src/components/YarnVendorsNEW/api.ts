// ─────────────────────────────────────────────────────────────
// FILE: src/components/YarnVendorsNEW/api.ts
//
// The ONE network call of the Yarn Vendors screen — through the ERP backend,
// with the same Bearer token as every other screen:
//
//   POST {API}/api/yarn-vendors-chat
//   headers  Authorization: Bearer <token>, Content-Type: application/json,
//            Accept: application/json
//   body     { item: string, city: string, yarns?: string[], prptype?: string }
//            item: one or more yarn items, comma separated (typed)
//            city: one or more INDIAN cities, comma separated — '' = all India
//            yarns: [itmcode] — the ONE yarn SELECTED from the ERP yarn master (main or sub item, Spun or Filament); the
//                   backend reads its full details again from the master and puts them in the AI question. prptype: login group.
//
//   GET  {API}/api/yarn-vendors-yarns?prptype=   → { success, response: { items: [Yarn + subs] } }   (ONE list: Spun + Filament)
//
//   reply    { success: true, response: { status, item, city, area, items, cities,
//              skipped_items, skipped_cities, failed_items, coverage, count, searched_at, note,
//              vendors: [{ searched_item, searched_area, party_name, address, city,
//              state, contact_no, party_item_name, rate, source_url, remarks }] } }
//            status: 'ok' | 'no_results' | 'not_yarn_item' | 'invalid_city'
//   error    { success: false, message, error_type }           (HTTP 200)
//
// This backend's exception handler (app/Exceptions/Handler.php) has its own
// conventions, handled below:
//   - login expired  -> HTTP 200 { success: true, response: { isauth: '_AUTHFAILED' } }
//   - ANY other error -> HTTP 404 { success: false, message: <reason> }
//     ("The specified resource cannot be found." = the route is not on that server)
// ─────────────────────────────────────────────────────────────
import { SEARCH_ENDPOINT, SEARCH_TIMEOUT_MS } from './config';

export type Vendor = {
  /** Which of the entered yarn items this party was found for. */
  searched_item: string;
  /** Which of the entered cities (or "All India") this party was found for. */
  searched_area: string;
  party_name: string;
  address: string;
  city: string;
  state: string;
  contact_no: string;
  party_item_name: string;
  rate: string;
  source_url: string;
  remarks: string;
};

/** What one item x city search produced (every pair the user asked for has one). */
export type Coverage = {
  item: string;
  area: string;
  status: 'ok' | 'no_results' | 'invalid_city' | 'not_yarn_item' | 'failed';
  count: number;
};

/** One yarn of the ERP yarn master (main item, or a sub item in `subs`) — same fields as the Designs → Yarns card. */
export type Yarn = {
  itmcode: string; mitmcode: string; is_sub: boolean; name: string; kind: 'Spun' | 'Filament';
  blend: { name: string; per: number }[]; blend_label: string; count: string; count_type: string; ply: string;
  denier: string; filament_type: string; lustre: string; other: string;
  /** what the vendor search calls it */
  label: string;
  /** every detail in one line (exactly what the AI gets) */
  spec: string;
  subs: Yarn[];
};
/** The yarn master for the selection: every main item (Spun + Filament together) with its sub items. */
export type YarnMaster = { items: Yarn[] };

const toYarn = (r: any): Yarn => ({
  itmcode: str(r?.itmcode), mitmcode: str(r?.mitmcode), is_sub: !!r?.is_sub, name: str(r?.name), kind: r?.kind === 'Filament' ? 'Filament' : 'Spun',
  blend: Array.isArray(r?.blend) ? r.blend.map((b: any) => ({ name: str(b?.name), per: Number(b?.per) || 0 })).filter((b: any) => b.name) : [],
  blend_label: str(r?.blend_label), count: str(r?.count), count_type: str(r?.count_type), ply: str(r?.ply), denier: str(r?.denier),
  filament_type: str(r?.filament_type), lustre: str(r?.lustre), other: str(r?.other), label: str(r?.label) || str(r?.name), spec: str(r?.spec),
  subs: Array.isArray(r?.subs) ? r.subs.map(toYarn).filter((y: Yarn) => y.itmcode) : [],
});

/** The ERP yarn master for the selection: Spun + Filament main items with their sub items (one call). */
export async function loadYarnMaster(API: string, token: string, prptype: string): Promise<YarnMaster> {
  if (!API || !token) throw new SearchError('auth', 'Your login session was not found. Please sign in again.');
  let res: any;
  let data: any = null;
  try {
    res = await fetch(`${API}/api/yarn-vendors-yarns?prptype=${encodeURIComponent(prptype || '')}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    });
    data = JSON.parse((await res.text()) || 'null');
  } catch {
    throw new SearchError('network', 'Could not load the yarn master. Check your internet connection and try again.');
  }
  if (res.status === 401 || data?.response?.isauth === '_AUTHFAILED') throw new SearchError('auth', 'Your login session has expired. Please sign in again.');
  if (!data || data.success !== true) {
    throw new SearchError('server', str(data?.message) || (res.status === 404 ? 'The yarn master API was not found on this server (/api/yarn-vendors-yarns).' : 'The yarn master could not be loaded.'));
  }
  const r = data.response || {};
  return { items: Array.isArray(r.items) ? r.items.map(toYarn).filter((y: Yarn) => y.itmcode) : [] };
}

export type SearchStatus = 'ok' | 'no_results' | 'not_yarn_item' | 'invalid_city';

export type SearchResult = {
  status: SearchStatus;
  item: string;
  city: string;
  /** Cities searched ("Surat, Mumbai"), or "All India". */
  area: string;
  /** The entered values, split. */
  items: string[];
  cities: string[];
  /** Entered items that are not yarn items — not searched. */
  skippedItems: string[];
  /** Entered cities that are not a place in India — not searched. */
  skippedCities: string[];
  /** "item (city)" searches that could not be completed this time. */
  failedItems: string[];
  /** One entry per item x city: how many parties that search gave. */
  coverage: Coverage[];
  vendors: Vendor[];
  note: string;
  /** Server time of the search, "YYYY-MM-DD HH:mm:ss". */
  searchedAt: string;
  /** For a yarn selected from the master: exactly the details the AI got (read from the master by the server). */
  specs: { item: string; spec: string }[];
  /** the whole question the AI got (for checking) */
  prompt: { model: string; system: string; user: string } | null;
  /** true = the saved list of this same search (no new web search) */
  fromSaved: boolean;
  /** "Search the web again": parties added to the saved list */
  added: number;
  /** when this list was first searched (it grows with every "Search the web again") */
  firstSearchedAt: string;
};

export type SearchErrorKind = 'cancelled' | 'network' | 'timeout' | 'auth' | 'rate-limit' | 'not-configured' | 'invalid' | 'server';

export class SearchError extends Error {
  kind: SearchErrorKind;
  constructor(kind: SearchErrorKind, message: string) {
    super(message);
    this.kind = kind;
  }
}

/** backend error_type -> app error kind */
const KIND_OF: Record<string, SearchErrorKind> = {
  not_configured: 'not-configured',
  search_unavailable: 'server',
  timeout: 'timeout',
  network: 'network',
  rate_limit: 'rate-limit',
  overloaded: 'server',
  invalid_request: 'invalid',
  server: 'server',
};

const str = (v: any) => (typeof v === 'string' ? v.trim() : typeof v === 'number' ? String(v) : '');

const strList = (v: any): string[] => (Array.isArray(v) ? v.map(str).filter((x) => x !== '') : []);

const toVendor = (row: any): Vendor => ({
  searched_item: str(row?.searched_item),
  searched_area: str(row?.searched_area),
  party_name: str(row?.party_name),
  address: str(row?.address),
  city: str(row?.city),
  state: str(row?.state),
  contact_no: str(row?.contact_no),
  party_item_name: str(row?.party_item_name),
  rate: str(row?.rate),
  source_url: str(row?.source_url),
  remarks: str(row?.remarks),
});

/** Ask the backend for the parties selling `item` in `city` (both may be comma lists; city '' = all India). */
export async function searchVendors(API: string, token: string, item: string, city: string, signal?: AbortSignal,
  sel?: { yarns: string[]; prptype: string }, fresh = false): Promise<SearchResult> {
  if (!API || !token) {
    throw new SearchError('auth', 'Your login session was not found. Please sign in again.');
  }

  // Own controller so the timeout and the caller's cancel both stop the request.
  const controller = new AbortController();
  let timedOut = false;
  const onOuterAbort = () => controller.abort();
  if (signal) {
    if (signal.aborted) controller.abort();
    else signal.addEventListener('abort', onOuterAbort);
  }
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, SEARCH_TIMEOUT_MS);

  const reqBody = { ...(sel && sel.yarns.length ? { item, city, yarns: sel.yarns, prptype: sel.prptype } : { item, city }), ...(fresh ? { fresh: 1 } : {}) };
  console.log('[YarnVendors] request', reqBody);

  let res: any;
  let text = '';
  try {
    res = await fetch(`${API}${SEARCH_ENDPOINT}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(reqBody),
      signal: controller.signal,
    });
    text = await res.text();
  } catch (e: any) {
    if (timedOut) throw new SearchError('timeout', 'The search took too long. Please try again.');
    if (signal?.aborted) throw new SearchError('cancelled', 'Search cancelled.');
    throw new SearchError('network', 'Could not reach the server. Check your internet connection and try again.');
  } finally {
    clearTimeout(timer);
    if (signal) signal.removeEventListener('abort', onOuterAbort);
  }

  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }

  const status = Number(res.status) || 0;
  const serverMessage = str(data?.message);

  // The exact prompt the server sent to the AI (F12 → Console, filter "[YarnVendors]").
  const body = data?.response ?? data;
  const pr = body?.prompt;
  if (pr && typeof pr === 'object') {
    console.log(
      `[YarnVendors] AI prompt${body?.from_saved ? ' (saved list — prompt of the search that built it)' : ''}`
      + `\n\n===== MODEL =====\n${pr.model ?? ''}`
      + `\n\n===== MESSAGE (user) =====\n${pr.user ?? ''}`
      + `\n\n===== RULES (system) =====\n${pr.system ?? ''}`,
    );
  } else {
    console.log(`[YarnVendors] AI prompt NOT in the reply (HTTP ${status}${body?.from_saved ? ', saved list made before the prompt was stored — press "Search the web again"' : ', is the new YarnVendorsChatController.php on the server?'})`, body);
  }

  // Login expired (backend convention) or a plain 401.
  if (status === 401 || data?.response?.isauth === '_AUTHFAILED' || /unauthenticated/i.test(serverMessage)) {
    throw new SearchError('auth', 'Your login session has expired. Please sign in again.');
  }
  // Gateway / web-server timeout while the backend was still searching.
  if (status === 502 || status === 503 || status === 504) {
    throw new SearchError('timeout', 'The server stopped waiting before the search finished. Please try again.');
  }

  // The backend answers every exception with HTTP 404 + { success:false, message }.
  if (!res.ok || !data) {
    if (!data || /specified (resource|route) cannot be found/i.test(serverMessage)) {
      throw new SearchError(
        'not-configured',
        status === 404
          ? 'The Yarn Vendors API was not found on this server (/api/yarn-vendors-chat). Please contact the administrator.'
          : `The server could not answer right now (${status}). Please try again.`,
      );
    }
    // A real server-side error: show its reason so it can be fixed.
    throw new SearchError('server', serverMessage ? `Server error: ${serverMessage}` : `The server could not answer right now (${status}).`);
  }

  if (data.success !== true) {
    throw new SearchError(KIND_OF[str(data.error_type)] || 'server', serverMessage || 'The search could not be completed. Please try again.');
  }

  const r = data.response || {};
  const known: SearchStatus[] = ['ok', 'no_results', 'not_yarn_item', 'invalid_city'];
  const vendors: Vendor[] = Array.isArray(r.vendors) ? r.vendors.map(toVendor).filter((v: Vendor) => v.party_name !== '') : [];
  let resultStatus: SearchStatus = known.includes(r.status) ? r.status : 'ok';
  if (resultStatus === 'ok' && vendors.length === 0) resultStatus = 'no_results';

  return {
    status: resultStatus,
    item: str(r.item) || item,
    city: str(r.city),
    area: str(r.area) || (city ? city : 'All India'),
    items: strList(r.items),
    cities: strList(r.cities),
    skippedItems: strList(r.skipped_items),
    skippedCities: strList(r.skipped_cities),
    failedItems: strList(r.failed_items),
    coverage: Array.isArray(r.coverage)
      ? r.coverage.map((cv: any): Coverage => ({
        item: str(cv?.item),
        area: str(cv?.area),
        status: ['ok', 'no_results', 'invalid_city', 'not_yarn_item', 'failed'].includes(cv?.status) ? cv.status : 'no_results',
        count: Number(cv?.count) || 0,
      })).filter((cv: Coverage) => cv.item !== '')
      : [],
    vendors: resultStatus === 'ok' ? vendors : [],
    note: str(r.note),
    searchedAt: str(r.searched_at),
    specs: Array.isArray(r.specs) ? r.specs.map((x: any) => ({ item: str(x?.item), spec: str(x?.spec) })).filter((x: any) => x.spec) : [],
    prompt: r.prompt && typeof r.prompt === 'object' ? { model: str(r.prompt.model), system: String(r.prompt.system ?? ''), user: String(r.prompt.user ?? '') } : null,
    fromSaved: !!r.from_saved,
    added: Number(r.added) || 0,
    firstSearchedAt: str(r.first_searched_at),
  };
}
