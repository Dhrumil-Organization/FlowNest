// FILE: src/components/YarnSalesOrderNEW/api.ts
// Every HTTP call of the Yarn Sales Order module. Same URL paths, methods,
// headers, body / query keys (and key ORDER), value sources and response paths
// as the legacy screens in components/YarnSalesOrder/. Only difference: the host
// comes from the `API` argument and the bearer from the `token` argument
// (legacy: global `API` import, token from the route params).
//
// Endpoints
//   GET  /api/getproperty                 params: null                                   (browse: Property picker)
//        -> res.data.response.data (when success && length > 0), cached to AsyncStorage 'get_property'
//   GET  /api/sosortbrowse                { search, prpcode, prptype, yearno, strcode:'002', fromdate, todate,
//                                           isauth, strtype:'Y', txntype:'sales_order',
//                                           referrer:'mob_yarn_sales_order', atype }  (browse list)
//        -> res.data.response.data (when res.data.success === true)
//   POST /api/mobappdeleteso              { Mode, uid, prpcode, yearno, strcode }        (delete, browse + summary)
//        -> res.data.success / res.data.message
//   GET  /api/accountbasic                { prpcode, prptype, yearno, strcode:'002', txntype:'yarn_sales_order',
//                                           partytype:'p', type:'S', page, limit, search, isceo, partype, grntype,
//                                           fetch, acccode, billdate, strtype, isfaint }  (party list)
//        -> res.data.response.data
//   GET  /api/get_criterion               { prpcode, prptype, yearno, strcode:'002', txntype:'yarn_sales_order',
//                                           fetch:'salesexe' }                           (sales executives)
//        -> res.data.response.data
//   GET  /api/mobappshow                  { uid, prpcode, strcode, yearno, mode }        (open saved order)
//        -> res.data.response | res.data.data | res.data  -> { main, d1, tax, exp, ... }
//   GET  /api/getaddress                  { uid, prpcode, strcode, yearno, parcode, page, limit, search,
//                                           txntype:'sales_order' }                      (delivery addresses)
//        -> res.data.response.data
//   GET  /api/getitem                     { prpcode, strcode, yearno, txntype:'yarn_sales_order' }   (items)
//   GET  /api/getgrade                    { prpcode, strcode, yearno, ItmCode, ttype:[...], fetch, MerCode,
//                                           ShdCode, txntype:'mob_app_sales_order' }     (grades)
//   GET  /api/getmobshade                 { prpcode, strcode, yearno, itmcode, mitmcode, search, limit:100 } (shades)
//        -> res.data.response.data | res.data.response | res.data.data   (all three lists)
//   POST /api/get_so_current_stock        { prptype, prpcode, strcode, yearno, d1, selectedd1 }      (stock)
//        -> (res.data.response.data | res.data.response | res.data.data).stockdata
//   POST /api/mobappsave                  { Mode, UId, main, d1, tax, exp, newsoitem, newsoparty, extra }  (save)
//        -> res.data.success, res.data.response.{ sono, uid, PrpCode, YearNo, StrCode }
//   POST /api/saleschallanmultiprintnew   { prpcode, yearno, strcode, uid, printTypes:['sales_order'],
//                                           printFormat }                                (print PDF)
//        -> res.data.results.sales_order (when res.data.success === true)
//
// AsyncStorage keys: 'user_prptype' (read), 'get_property' (read + write).
// `yearno` is always reduced to its last 2 characters before it is sent (legacy `.slice(-2)`).
import AsyncStorage from '@/common/utils/compatibleStorage';
import axios from 'axios';
import { BrowseFilters, OrderCtx, Row, yy } from './model';

/** Legacy getRequestConfig() / inline headers of every Yarn Sales Order screen. */
const jsonHeaders = (token: string) => ({
  Authorization: `Bearer ${token}`,
  'Content-Type': 'application/json',
  Accept: 'application/json',
  'x-platform': 'mob',
});

/** Legacy POST headers (Accept before Content-Type, as legacy sends them). */
const postHeaders = (token: string) => ({
  Authorization: `Bearer ${token}`,
  Accept: 'application/json',
  'Content-Type': 'application/json',
  'x-platform': 'mob',
});

const firstList = (resData: any): Row[] => {
  const data = resData?.response?.data || resData?.response || resData?.data || [];
  return Array.isArray(data) ? data : [];
};

const userPrpType = () => AsyncStorage.getItem('user_prptype');

/** Server message of a failed request, when the server sent one. */
export const errorMessage = (error: any, fallback: string): string => error?.response?.data?.message || fallback;

/* ------------------------------------------------------------------ */
/* Browse                                                              */
/* ------------------------------------------------------------------ */

/** GET /api/getproperty — legacy fetchPropertyData (never throws, [] on failure). */
export async function fetchPropertyData(API: string, token: string): Promise<Row[]> {
  try {
    await AsyncStorage.getItem('get_property');
    const params: any = null;
    const response = await axios.get(`${API}/api/getproperty`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/javascript',
        Accept: 'application/json',
      },
      params,
    });
    if (response.data.success && response.data.response.data.length > 0) {
      const propertyData = response.data.response.data;
      await AsyncStorage.setItem('get_property', JSON.stringify(propertyData));
      return propertyData;
    }
    return [];
  } catch (error) {
    if (!axios.isCancel(error)) console.log('[YarnSalesOrderNEW] fetchPropertyData error', error);
    return [];
  }
}

/**
 * GET /api/sosortbrowse — legacy loadOrders(). `yearText` is what legacy slices:
 * the applied filter year when there is one, otherwise the year shown in the picker.
 * Never throws: [] on failure / success !== true.
 */
export async function browseOrders(
  API: string,
  token: string,
  text: string,
  activeFilters: BrowseFilters,
  yearText: string,
): Promise<Row[]> {
  const userPtype = await userPrpType();
  try {
    const payload = {
      search: text,
      prpcode: activeFilters.prpcode,
      prptype: userPtype,
      yearno: yy(yearText),
      strcode: '002',
      fromdate: activeFilters.fromdate,
      todate: activeFilters.todate,
      isauth: activeFilters.show_authorized ? 1 : 0,
      strtype: 'Y',
      txntype: 'sales_order',
      referrer: 'mob_yarn_sales_order',
      atype: activeFilters.show_authorized ? 'm' : 'b',
    };
    const res = await axios.get(`${API}/api/sosortbrowse`, { headers: jsonHeaders(token), params: { ...payload } });
    if (res.data.success === true) return res.data.response.data || [];
    return [];
  } catch (error: any) {
    console.log('[YarnSalesOrderNEW] browse error', error?.response?.data || error?.message);
    return [];
  }
}

/** POST /api/mobappdeleteso — used by the browse card (Mode '') and by the summary (Mode = screen mode). */
export async function deleteOrder(
  API: string,
  token: string,
  payload: { Mode: string; uid: any; prpcode: any; yearno: string; strcode: any },
): Promise<{ success: boolean; message?: string }> {
  const res = await axios.post(`${API}/api/mobappdeleteso`, payload, { headers: postHeaders(token) });
  return { success: res.data?.success === true, message: res.data?.message };
}

/* ------------------------------------------------------------------ */
/* Party                                                               */
/* ------------------------------------------------------------------ */

/** GET /api/accountbasic — legacy loadParties() (the search text is NOT sent, the list is filtered on screen). */
export async function fetchParties(API: string, token: string, ctx: OrderCtx): Promise<Row[]> {
  const userPtype = await userPrpType();
  const payload = {
    prpcode: ctx.prpcode,
    prptype: userPtype,
    yearno: yy(ctx.yearno),
    strcode: '002',
    txntype: 'yarn_sales_order',
    partytype: 'p',
    type: 'S',
    page: '',
    limit: '',
    search: '',
    isceo: '',
    partype: '',
    grntype: '',
    fetch: '',
    acccode: '',
    billdate: '',
    strtype: '',
    isfaint: '',
  };
  const response = await axios.get(`${API}/api/accountbasic`, { headers: jsonHeaders(token), params: { ...payload } });
  const data = response?.data?.response?.data || [];
  return response?.data?.success && data.length > 0 ? data : [];
}

/** GET /api/get_criterion fetch:'salesexe' — legacy loadExecutive(). */
export async function fetchExecutives(API: string, token: string, ctx: OrderCtx): Promise<Row[]> {
  const userPtype = await userPrpType();
  const payload = {
    prpcode: ctx.prpcode,
    prptype: userPtype,
    yearno: yy(ctx.yearno),
    strcode: '002',
    txntype: 'yarn_sales_order',
    fetch: 'salesexe',
  };
  const response = await axios.get(`${API}/api/get_criterion`, { headers: jsonHeaders(token), params: { ...payload } });
  const data = response?.data?.response?.data || [];
  return response?.data?.success && data.length > 0 ? data : [];
}

/* ------------------------------------------------------------------ */
/* Order summary                                                       */
/* ------------------------------------------------------------------ */

/** GET /api/mobappshow — returns res.data (parsed by model.parseOrderResponse). */
export async function showOrder(API: string, token: string, ctx: OrderCtx, uid: any, mode: string): Promise<any> {
  const params = {
    uid,
    prpcode: ctx.prpcode,
    strcode: ctx.strcode,
    yearno: yy(ctx.yearno),
    mode,
  };
  const res = await axios.get(`${API}/api/mobappshow`, { headers: jsonHeaders(token), params });
  return res?.data;
}

/** GET /api/getaddress — delivery addresses of the party. */
export async function fetchAddresses(API: string, token: string, ctx: OrderCtx, uid: any, parcode: any): Promise<Row[]> {
  const params = {
    uid,
    prpcode: ctx.prpcode,
    strcode: ctx.strcode,
    yearno: yy(ctx.yearno),
    parcode,
    page: '',
    limit: '',
    search: '',
    txntype: 'sales_order',
  };
  const res = await axios.get(`${API}/api/getaddress`, { headers: jsonHeaders(token), params });
  return res?.data?.response?.data || [];
}

/** POST /api/mobappsave — returns res.data. */
export async function saveOrder(API: string, token: string, payload: Row): Promise<any> {
  const res = await axios.post(`${API}/api/mobappsave`, payload, { headers: postHeaders(token) });
  return res.data;
}

/** POST /api/saleschallanmultiprintnew — returns res.data ({ success, results: { sales_order: <pdf url> }, message }). */
export async function printOrder(API: string, token: string, ctx: OrderCtx, uid: any, format = 'ROne'): Promise<any> {
  const payload = {
    prpcode: ctx.prpcode,
    yearno: yy(ctx.yearno),
    strcode: ctx.strcode,
    uid,
    printTypes: ['sales_order'],
    printFormat: format,
  };
  const res = await axios.post(`${API}/api/saleschallanmultiprintnew`, payload, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      'x-platform': 'mob',
    },
  });
  return res?.data;
}

/* ------------------------------------------------------------------ */
/* Item / Grade / Shade / Stock                                        */
/* ------------------------------------------------------------------ */

/** GET /api/getitem. */
export async function fetchItems(API: string, token: string, ctx: OrderCtx): Promise<Row[]> {
  const payload = {
    prpcode: ctx.prpcode,
    strcode: ctx.strcode,
    yearno: yy(ctx.yearno),
    txntype: 'yarn_sales_order',
  };
  const res = await axios.get(`${API}/api/getitem`, { headers: jsonHeaders(token), params: { ...payload } });
  return firstList(res.data);
}

/** GET /api/getgrade. */
export async function fetchGrades(API: string, token: string, ctx: OrderCtx, itmCode: any): Promise<Row[]> {
  const payload = {
    prpcode: ctx.prpcode,
    strcode: ctx.strcode,
    yearno: yy(ctx.yearno),
    ItmCode: itmCode,
    ttype: ['8', '3', '30', '2', '34', '83', '42'],
    fetch: '',
    MerCode: '',
    ShdCode: '',
    txntype: 'mob_app_sales_order',
  };
  const res = await axios.get(`${API}/api/getgrade`, { headers: jsonHeaders(token), params: { ...payload } });
  return firstList(res.data);
}

/** GET /api/getmobshade — server side search, 100 rows. */
export async function fetchShades(
  API: string,
  token: string,
  ctx: OrderCtx,
  selectedItem: Row,
  searchText: string,
): Promise<Row[]> {
  const payload = {
    prpcode: ctx.prpcode,
    strcode: ctx.strcode,
    yearno: yy(ctx.yearno),
    itmcode: selectedItem.ItmCode,
    mitmcode: selectedItem.MItmCode || selectedItem.ItmCode,
    search: searchText,
    limit: 100,
  };
  const res = await axios.get(`${API}/api/getmobshade`, { headers: jsonHeaders(token), params: payload });
  return firstList(res.data);
}

/** POST /api/get_so_current_stock — returns the `stockdata` rows. */
export async function fetchCurrentStock(
  API: string,
  token: string,
  ctx: OrderCtx,
  d1: Row[],
  selectedd1: Row[],
): Promise<Row[]> {
  const userPtype = await userPrpType();
  const payload = {
    prptype: userPtype,
    prpcode: ctx.prpcode,
    strcode: ctx.strcode,
    yearno: yy(ctx.yearno),
    d1,
    selectedd1,
  };
  const res = await axios.post(`${API}/api/get_so_current_stock`, payload, { headers: jsonHeaders(token) });
  const data: any = res.data?.response?.data || res.data?.response || res.data?.data || [];
  return data?.stockdata || [];
}
