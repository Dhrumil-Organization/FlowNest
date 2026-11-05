// FILE: src/components/SalesInvoiceBrowse/api.ts
// Every HTTP call of the Sales Invoice browse screen.
//
//   GET  /api/getproperty                (Property picker)
//   GET  /api/getstore                   { prpcode, yearno, txntype:'', prptype }                                   (Store picker)
//   GET  /api/invoicebrowse              { prpcode, yearno, strcode, page:'', limit:'', search, txntype:'sales_invoice',
//                                          fromdate:'yyyy-mm-dd', todate:'yyyy-mm-dd' }                              (list)
//   POST /api/saleschallanmultiprintnew  { prpcode, yearno, strcode, uid, printTypes:['sales_invoice'], printFormat } (card print)
//   --- Multi print modal ---
//   GET  /api/accountbook                { prpcode, yearno, strcode, page:'', limit:'', search, isceo:0, partype:0, txntype:'sales_invoice' } (Sales A/c)
//   GET  /api/getprinttypes              { prpcode, yearno, strcode, txntype:'sales_invoice' }                     (Print Type)
//   POST /api/multiprint                 { prpcode, yearno, strcode, acccode, vounofrom, vounoto, datefrom, dateto,
//                                          parcodes:'', txntype, printtype, fetch:'parcode', isceo:0, limit, page, search } (Party list)
//   POST /api/multiprint                 { prpcode, yearno, strcode, acccode, vounofrom, vounoto, datefrom, dateto,
//                                          parcodes, txntype, printtype, checketype:'O' }       (OK step 1 -> uids)
//   POST /api/saleschallanmultiprintnew  { prpcode, yearno, strcode, uid:'<uids comma separated>', printTypes:[txntype],
//                                          printFormat:printtype, vounofrom, vounoto, datefrom, dateto }            (OK step 2 -> PDF)
import AsyncStorage from '@/common/utils/compatibleStorage';
import axios from 'axios';
import { BrowseFilters, Row, yy } from './model';

export const TXN = 'sales_invoice';
export const MULTI_PRINT_ENDPOINT = '/api/multiprint';

/** Same headers as the other master lookups (property / store / account book / print types / print party). */
const masterHeaders = (token: string) => ({
  Authorization: `Bearer ${token}`,
  'Content-Type': 'application/javascript',
  Accept: 'application/json',
  'x-platform': 'mob',
});

const jsonHeaders = (token: string) => ({
  Authorization: `Bearer ${token}`,
  'Content-Type': 'application/json',
  Accept: 'application/json',
  'x-platform': 'mob',
});

const postHeaders = (token: string) => ({
  Authorization: `Bearer ${token}`,
  Accept: 'application/json',
  'Content-Type': 'application/json',
  'X-Requested-With': 'XMLHttpRequest',
  'x-platform': 'mob',
});

/** Same headers as the web multi print (Authorization + JSON + XMLHttpRequest) — used by both multi print calls. */
const multiPrintHeaders = (token: string) => ({
  Authorization: `Bearer ${token}`,
  'Content-Type': 'application/json',
  'X-Requested-with': 'XMLHttpRequest',
  Accept: 'application/json',
  'x-platform': 'mob',
});

/** Web posts getRequestConfig({ params }) as the body; send the same fields flat AND under `params` so the API reads them either way. */
const withParams = (payload: Record<string, any>) => ({ ...payload, params: payload });

export const errorMessage = (error: any, fallback: string): string => error?.response?.data?.message || fallback;

/** First list found in a response: response.data -> response -> data -> body itself. */
const pickList = (body: any): Row[] => {
  const d = body?.response?.data ?? body?.response ?? body?.data ?? body;
  return Array.isArray(d) ? d : [];
};

export type PrintCtx = { prpcode: any; yearno: any; strcode: any; txntype?: string };

/** txntype of the picked Print Type (sales_invoice when none is given). */
const txnOf = (ctx: { txntype?: string }): string => ctx?.txntype || TXN;

/* ------------------------------------------------------------------ */
/* Browse screen                                                       */
/* ------------------------------------------------------------------ */

/** GET /api/getproperty — never throws, [] on failure. */
export async function fetchPropertyData(API: string, token: string): Promise<Row[]> {
  try {
    const response = await axios.get(`${API}/api/getproperty`, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/javascript', Accept: 'application/json' },
      params: null,
    });
    if (response.data.success && response.data.response.data.length > 0) {
      const data = response.data.response.data;
      await AsyncStorage.setItem('get_property', JSON.stringify(data));
      return data;
    }
    return [];
  } catch (error) {
    if (!axios.isCancel(error)) console.log('[SalesInvoiceBrowse] fetchPropertyData error', error);
    return [];
  }
}

/** GET /api/getstore — store list of the property. Never throws, [] on failure. */
export async function fetchStores(API: string, token: string, prpcode: string, yearText: string): Promise<Row[]> {
  try {
    const prptype = await AsyncStorage.getItem('user_prptype');
    const r = await axios.get(`${API}/api/getstore`, {
      headers: masterHeaders(token),
      params: { prpcode, yearno: yy(yearText), txntype: '', prptype },
    });
    return pickList(r?.data);
  } catch (error: any) {
    console.log('[SalesInvoiceBrowse] fetchStores error', error?.response?.data || error?.message);
    return [];
  }
}

/** GET /api/invoicebrowse — page / limit are sent blank. Never throws, [] on failure. */
export async function browseInvoices(
  API: string,
  token: string,
  text: string,
  f: BrowseFilters,
  yearText: string,
): Promise<Row[]> {
  try {
    const params = {
      prpcode: f.prpcode,
      yearno: yy(yearText),
      strcode: f.strcode,
      page: '',
      limit: '',
      search: text,
      txntype: TXN,
      fromdate: f.fromdate,
      todate: f.todate,
    };
    const res = await axios.get(`${API}/api/invoicebrowse`, { headers: jsonHeaders(token), params });
    if (res.data.success === true) return pickList(res.data);
    return [];
  } catch (error: any) {
    console.log('[SalesInvoiceBrowse] browse error', error?.response?.data || error?.message);
    return [];
  }
}

/** POST /api/saleschallanmultiprintnew — print one invoice (card print icon). Returns res.data. */
export async function printInvoice(API: string, token: string, ctx: PrintCtx, uid: any, format = 'ROne'): Promise<any> {
  const payload = {
    prpcode: ctx.prpcode,
    yearno: yy(ctx.yearno),
    strcode: ctx.strcode,
    uid,
    printTypes: [txnOf(ctx)],
    printFormat: format,
  };
  const res = await axios.post(`${API}/api/saleschallanmultiprintnew`, payload, { headers: postHeaders(token) });
  return res?.data;
}

/* ------------------------------------------------------------------ */
/* Multi print modal                                                   */
/* ------------------------------------------------------------------ */

/** GET /api/accountbook — Sales A/c list (page / limit blank = every account). */
export async function fetchAccountBook(API: string, token: string, ctx: PrintCtx): Promise<Row[]> {
  try {
    const params = {
      prpcode: ctx.prpcode,
      yearno: yy(ctx.yearno),
      strcode: ctx.strcode,
      page: '',
      limit: '',
      search: '',
      isceo: 0,
      partype: 0,
      txntype: txnOf(ctx),
    };
    const res = await axios.get(`${API}/api/accountbook`, { headers: masterHeaders(token), params });
    return pickList(res?.data);
  } catch (error: any) {
    console.log('[SalesInvoiceBrowse] accountbook error', error?.response?.data || error?.message);
    return [];
  }
}

/** GET /api/getprinttypes — [{ printtypecode, printtypename }] (codes can repeat, key by index). */
export async function fetchPrintTypes(API: string, token: string, ctx: PrintCtx): Promise<Row[]> {
  try {
    const params = { prpcode: ctx.prpcode, yearno: yy(ctx.yearno), strcode: ctx.strcode, txntype: txnOf(ctx) };
    const res = await axios.get(`${API}/api/getprinttypes`, { headers: masterHeaders(token), params });
    return pickList(res?.data);
  } catch (error: any) {
    console.log('[SalesInvoiceBrowse] printtypes error', error?.response?.data || error?.message);
    return [];
  }
}

export type MultiPrintInput = PrintCtx & {
  acccode: string;
  vounofrom: string;
  vounoto: string;
  datefrom: string; // dd-mm-yyyy
  dateto: string; // dd-mm-yyyy
  parcodes: string[]; // [] = all
  printtype: string;
};

/** POST /api/multiprint with fetch:'parcode' — parties that have invoices in the voucher / date range. Never throws. */
export async function fetchPrintParties(
  API: string,
  token: string,
  i: MultiPrintInput,
  page: number,
  limit: number,
  search: string,
): Promise<Row[]> {
  try {
    const payload = {
      prpcode: i.prpcode,
      yearno: yy(i.yearno),
      strcode: i.strcode,
      acccode: i.acccode,
      vounofrom: i.vounofrom,
      vounoto: i.vounoto,
      datefrom: i.datefrom,
      dateto: i.dateto,
      parcodes: '',
      txntype: txnOf(i),
      printtype: i.printtype,
      fetch: 'parcode',
      isceo: 0,
      limit,
      page,
      search,
    };
    const res = await axios.post(`${API}${MULTI_PRINT_ENDPOINT}`, withParams(payload), { headers: multiPrintHeaders(token) });
    console.log('[SalesInvoiceBrowse] print party request', JSON.stringify(payload));
    console.log('[SalesInvoiceBrowse] print party response', JSON.stringify(res?.data)?.slice(0, 600));
    return pickList(res?.data);
  } catch (error: any) {
    console.log('[SalesInvoiceBrowse] print party error', error?.response?.data || error?.message);
    return [];
  }
}

/** uids out of the multiprint response -> '12,13,14' (array or already a string). */
const uidsOf = (data: any): string => {
  const u = data?.response?.data?.uids;
  if (Array.isArray(u)) return u.join(',');
  return u ? String(u) : '';
};

/**
 * OK of the Multi Print dialog = two calls, exactly like the web:
 *   1) POST /api/multiprint                 -> response.data.response.data.uids
 *   2) POST /api/saleschallanmultiprintnew  -> uid = those uids, results[txntype] = PDF url
 * Returns the res.data of step 2 (success / results / message). Step 1 with no vouchers -> { success:false, message:'No Data found' }.
 */
export async function multiPrintInvoices(API: string, token: string, i: MultiPrintInput): Promise<any> {
  const headers = multiPrintHeaders(token);
  const yearno = yy(i.yearno);

  // step 1 — find the invoices (uids)
  const step1 = await axios.post(
    `${API}${MULTI_PRINT_ENDPOINT}`,
    withParams({
      prpcode: i.prpcode,
      yearno,
      strcode: i.strcode,
      acccode: i.acccode,
      vounofrom: i.vounofrom,
      vounoto: i.vounoto,
      datefrom: i.datefrom,
      dateto: i.dateto,
      parcodes: i.parcodes,
      txntype: txnOf(i),
      printtype: i.printtype,
      checketype: 'O',
    }),
    { headers },
  );
  const uid = uidsOf(step1?.data);
  if (step1?.data?.success === false) return step1.data;
  if (!uid) return { success: false, message: 'No Data found' };

  // step 2 — print those uids
  const step2 = await axios.post(
    `${API}/api/saleschallanmultiprintnew`,
    {
      prpcode: i.prpcode,
      yearno,
      strcode: i.strcode,
      uid,
      printTypes: [txnOf(i)],
      printFormat: i.printtype,
      vounofrom: i.vounofrom,
      vounoto: i.vounoto,
      datefrom: i.datefrom,
      dateto: i.dateto,
    },
    { headers },
  );
  return step2?.data;
}

/** PDF url out of a print response (results[txntype], else the first url found). */
export const pdfUrlOf = (data: any, txntype: string = TXN): string => {
  const r = data?.results;
  if (typeof r === 'string' && r) return r;
  if (r && typeof r === 'object') {
    if (typeof r[txntype] === 'string' && r[txntype]) return r[txntype];
    const first = Object.values(r).find((v) => typeof v === 'string' && v);
    if (first) return first as string;
  }
  const alt = data?.response?.url || data?.response?.pdf || data?.url || data?.pdf;
  return typeof alt === 'string' ? alt : '';
};
