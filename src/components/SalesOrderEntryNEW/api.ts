// FILE: src/components/SalesOrderEntryNEW/api.ts
// Every HTTP call of the Sales Order Entry module. Same URL paths, methods,
// headers, query / body keys (and key ORDER) and response paths as the Legacy
// screen components/SalesOrderNew/index.tsx. Only difference: the host comes
// from the `API` argument (ErpSessionGate) instead of the global import, and
// the bearer from the `token` argument.
//
// Endpoints
//   GET  /api/getproperty        (no params)                                   New Order: Property picker
//        -> res.data.response.data (when success && length > 0), cached to AsyncStorage 'get_property'
//   GET  /api/accountbasic       { prpcode, prptype, yearno, strcode:'012', txntype:'sales_order', partytype:'p',
//                                  type:'S', page, limit, search, isceo, partype, grntype, fetch, acccode,
//                                  billdate, strtype, isfaint }                  New Order: customers
//        -> res.data.response.data
//   GET  /api/get_criterion      { prpcode, strcode:'012', yearno, txntype:'sales_order', fetch:'salesexe', prptype:'' }
//   GET  /api/getitem            { prpcode, strcode, yearno }                  items (New Order + Edit "add combination")
//   GET  /api/getdesignrate      { prpcode, strcode:'012', yearno, dsncode }   design rate (loaded, not shown — as Legacy)
//   GET  /api/getdesign          { prpcode, strcode, yearno, itmcode, mitmcode, txntype:'mob_app_sales_order' }
//   GET  /api/getshade           { prpcode, strcode, yearno, itmcode, mitmcode, dsncode }   (also Tracking: Confirm APC)
//        -> res.data.response.data | res.data.response | res.data.data   (lists above)
//   GET  /api/getlatestcosting   { prpcode, strcode:'012', yearno, itmcode, dsncode }
//        -> res.data.response.data | res.data.data | null
//   POST /api/mobappsave         { Mode, UId, main, d1, tax, exp }             New Order (ADD) + Auth edit (EDIT)
//        -> res.data.success === true, res.data.response.sono | SONo
//   GET  /api/sosortbrowse       { prptype, strcode:'012', fromdate, todate, strtype:'g', txntype:'sales_order',
//                                  referrer:'mob_dashboard', yearno, prpcode, prpcodes:[], search:'', isauth, atype }
//                                Auth (pending isauth 0 / atype b, authorised isauth 1 / atype m), Summary (no isauth),
//                                tab counter (own short param set)  -> res.data.response.data
//   GET  /api/authso             approve (IsAuth 1) / reject (IsAuth 2) — see model.buildAuthParams
//   POST /api/sodelete           { uid, UId, prpcode, PrpCode, strcode, yearno, txntype:'sales_order' }
//   POST /api/salesordertracking { referrer, strtype, fromdate, deldate, todate, yearno, sexes, type, wise,
//                                  dsncodes, itemcodes, parties, prptype, txntype:'prodorderlist' }
//        -> res.data.data.salesdata
//   POST /api/sodispatch         { uid, prpcode, strcode, Items:[{ ShdCode, Qty }] }
//   POST /api/soconfirmapc       { uid, prpcode, strcode, OldShdCode, ShdCode, ShdName }
//
// AsyncStorage keys read: 'user_prptype'. (The tabs also read / write 'selected_prpcode',
// 'selectedyear' and read 'selected_yearno' exactly like Legacy — see the tab files.)
import AsyncStorage from '@/common/utils/compatibleStorage';
import axios from 'axios';
import { Row } from './model';

/** Legacy authHdr(). */
const authHdr = (token: string) => ({
  Authorization: `Bearer ${token}`,
  'Content-Type': 'application/json',
  Accept: 'application/json',
  'x-platform': 'mob',
});

const cfg = (token: string, params: any) => ({ headers: authHdr(token), params });

/** res.data.response.data | res.data.response | res.data.data, as an array. */
const listOf = (resData: any): Row[] => {
  const data = resData?.response?.data || resData?.response || resData?.data || [];
  return Array.isArray(data) ? data : [];
};

export const userPrpType = () => AsyncStorage.getItem('user_prptype');

/* ------------------------------------------------------------------ */
/* New Order masters                                                   */
/* ------------------------------------------------------------------ */

/** GET /api/getproperty — Legacy common fetchPropertyData (never throws, [] on failure). */
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
    if (!axios.isCancel(error)) console.log('[SalesOrderEntryNEW] fetchPropertyData error', error);
    return [];
  }
}

/** GET /api/accountbasic — customers. Throws on failure (caller clears the list). */
export async function getParties(API: string, token: string, prpcode: string, yrno: string): Promise<Row[]> {
  const userPtype = await userPrpType();
  const res = await axios.get(
    `${API}/api/accountbasic`,
    cfg(token, {
      prpcode, prptype: userPtype, yearno: yrno, strcode: '012',
      txntype: 'sales_order', partytype: 'p', type: 'S',
      page: '', limit: '', search: '', isceo: '', partype: '',
      grntype: '', fetch: '', acccode: '', billdate: '', strtype: '', isfaint: '',
    }),
  );
  return res.data?.response?.data || [];
}

/** GET /api/get_criterion fetch=salesexe. */
export async function getSalesExecs(API: string, token: string, prpcode: string, yrno: string): Promise<Row[]> {
  const res = await axios.get(
    `${API}/api/get_criterion`,
    cfg(token, { prpcode, strcode: '012', yearno: yrno, txntype: 'sales_order', fetch: 'salesexe', prptype: '' }),
  );
  return listOf(res.data);
}

/** GET /api/getitem — the ITEM list (Legacy names it "designList"). */
export async function getItems(API: string, token: string, prpcode: string, strcode: string, yearno: string): Promise<Row[]> {
  const res = await axios.get(`${API}/api/getitem`, cfg(token, { prpcode, strcode, yearno }));
  return listOf(res.data);
}

/** GET /api/getdesignrate — result is kept but not shown (same as Legacy). */
export async function getDesignRate(API: string, token: string, prpcode: string, yrno: string, dsncode: any): Promise<Row[]> {
  const res = await axios.get(`${API}/api/getdesignrate`, cfg(token, { prpcode, strcode: '012', yearno: yrno, dsncode }));
  return listOf(res.data);
}

/** GET /api/getdesign — the DESIGN list of an item (Legacy names it "itemList"). */
export async function getDesigns(API: string, token: string, prpcode: string, strcode: string, yearno: string, item: Row): Promise<Row[]> {
  const res = await axios.get(
    `${API}/api/getdesign`,
    cfg(token, {
      prpcode, strcode, yearno,
      itmcode: item.ItmCode,
      mitmcode: item.MItmCode || item.ItmCode,
      txntype: 'mob_app_sales_order',
    }),
  );
  return listOf(res.data);
}

/** GET /api/getshade. */
export async function getShadesOf(
  API: string,
  token: string,
  p: { prpcode: string; strcode: string; yearno: string; itmcode: any; mitmcode: any; dsncode: any },
): Promise<Row[]> {
  const res = await axios.get(
    `${API}/api/getshade`,
    cfg(token, { prpcode: p.prpcode, strcode: p.strcode, yearno: p.yearno, itmcode: p.itmcode, mitmcode: p.mitmcode, dsncode: p.dsncode }),
  );
  return listOf(res.data);
}

/** GET /api/getlatestcosting. */
export async function getLatestCosting(API: string, token: string, prpcode: string, yrno: string, itmcode: any, dsncode: any): Promise<Row | null> {
  const res = await axios.get(`${API}/api/getlatestcosting`, cfg(token, { prpcode, strcode: '012', yearno: yrno, itmcode, dsncode }));
  return res.data?.response?.data || res.data?.data || null;
}

/** POST /api/mobappsave (ADD or EDIT). Returns res.data. */
export async function saveOrder(API: string, token: string, payload: any): Promise<any> {
  const res = await axios.post(`${API}/api/mobappsave`, payload, { headers: authHdr(token) });
  return res.data;
}

/* ------------------------------------------------------------------ */
/* Auth / Summary / tab counter                                        */
/* ------------------------------------------------------------------ */

export type BrowseBase = {
  prptype: string | null;
  strcode: string;
  fromdate: string;
  todate: string;
  strtype: string;
  txntype: string;
  referrer: string;
  yearno: string;
  prpcode: string;
  prpcodes: any[];
  search: string;
};

/** GET /api/sosortbrowse. `extra` is appended after the base keys (Legacy cfg(extra)). */
export async function sortBrowse(API: string, token: string, base: BrowseBase, extra?: Row): Promise<Row[]> {
  const res = await axios.get(`${API}/api/sosortbrowse`, cfg(token, { ...base, ...(extra || {}) }));
  return res.data?.response?.data || [];
}

/** Root tab counter: pending orders this month (Legacy OrdersScreen effect). */
export async function pendingCount(API: string, token: string, todayYmdStr: string): Promise<number> {
  const res = await axios.get(`${API}/api/sosortbrowse`, {
    headers: authHdr(token),
    params: {
      strcode: '012', isauth: 0, atype: 'b', txntype: 'sales_order',
      referrer: 'mob_dashboard', strtype: 'g',
      fromdate: todayYmdStr.slice(0, 6) + '01', todate: todayYmdStr,
      prpcodes: [],
    },
  });
  return (res.data?.response?.data || []).length;
}

/** GET /api/authso. Returns res.data. */
export async function authorise(API: string, token: string, params: Row): Promise<any> {
  const res = await axios.get(`${API}/api/authso`, { headers: authHdr(token), params });
  return res.data;
}

/** POST /api/sodelete. Returns res.data. */
export async function deleteSo(API: string, token: string, item: Row, prpcode: string, yearno: string, fy: string): Promise<any> {
  const res = await axios.post(
    `${API}/api/sodelete`,
    {
      uid: item.UId,
      UId: item.UId,
      prpcode: item.PrpCode || prpcode,
      PrpCode: item.PrpCode || prpcode,
      strcode: item.StrCode || '012',
      yearno: item.yearno || yearno || fy,
      txntype: 'sales_order',
    },
    { headers: authHdr(token) },
  );
  return res.data;
}

/* ------------------------------------------------------------------ */
/* Tracking                                                            */
/* ------------------------------------------------------------------ */

/** POST /api/salesordertracking — res.data.data.salesdata. */
export async function getTracking(API: string, token: string, yearno: string): Promise<Row[]> {
  const userPtype = await userPrpType();
  const params = {
    referrer: 'mob_dashboard',
    strtype: 'g',
    fromdate: '',
    deldate: '',
    todate: '',
    yearno: yearno || '27',
    sexes: '',
    type: 'all',
    wise: 'order',
    dsncodes: [],
    itemcodes: [],
    parties: [],
    prptype: userPtype,
    txntype: 'prodorderlist',
  };
  const res = await axios.post(`${API}/api/salesordertracking`, params, { headers: authHdr(token) });
  return res?.data?.data?.salesdata || [];
}

/** POST /api/sodispatch. Returns res.data. */
export async function dispatchSo(API: string, token: string, dispItem: Row, prpcode: string, items: any[]): Promise<any> {
  const res = await axios.post(
    `${API}/api/sodispatch`,
    { uid: dispItem.UId, prpcode: dispItem.PrpCode || prpcode, strcode: dispItem.StrCode || '012', Items: items },
    { headers: authHdr(token) },
  );
  return res.data;
}

/** POST /api/soconfirmapc. Returns res.data. */
export async function confirmApc(API: string, token: string, item: Row, apcRow: Row, prpcode: string, shade: Row): Promise<any> {
  const res = await axios.post(
    `${API}/api/soconfirmapc`,
    {
      uid: item.UId,
      prpcode: item.PrpCode || prpcode,
      strcode: item.StrCode || '012',
      OldShdCode: apcRow.ShdCode,
      ShdCode: shade.ShdCode,
      ShdName: shade.ShdName || shade.ShadeName,
    },
    { headers: authHdr(token) },
  );
  return res.data;
}
