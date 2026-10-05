// FILE: src/components/ProductionReportNEW/api.ts
// Every HTTP call of the Production Report screen — same URL paths, methods, headers,
// params/body keys (and key ORDER) and response paths as the legacy
//   components/ProductionReport/index.tsx            (the live legacy screen, repo root)
//   common/API/Functions.tsx                         (fetchPropertyData / fetchAllYeardata / fetchAllStoredata,
//                                                     which the legacy screen called for Property / Year / Store)
// but using the `API` host prop and the `token` prop instead of the global `API` import.
//
// Endpoints
//   GET  /api/getproperty          params: null                         -> data.response.data (when data.success && length > 0)
//                                  writes AsyncStorage 'get_property' (JSON of the list); reads it first (legacy read it and ignored it)
//   GET  /api/getyear              { prpcode }                          -> data.response.data | data.data | data (first array found)
//   GET  /api/getstore             { prpcode, yearno, txntype:'', prptype:<AsyncStorage user_prptype> }  header x-platform: mob
//                                                                       -> data.response.data | data.data | data
//   GET  /api/get_criterion        fetch:'macgrp'   { fetch, txntype:'mob_production_report', prptype:'', prpcode, yearno, strcode, productiontype }
//   GET  /api/get_criterion        fetch:'macsgrp'  { fetch, txntype, prptype:'', prpcode, yearno, macgrp[], strcode, productiontype }
//   GET  /api/get_criterion        fetch:'machine'  { fetch, txntype, prptype:'', prpcode, yearno, macgrp[], macsgrp[], strcode, productiontype }
//                                                                       -> data.response.data (used only when data.success && length > 0)
//   POST /api/prodproductionreport action:'report'      { prptype:'', txntype, prpcode, yearno, strcode, macgrp[], macsgrp[], maccode[],
//                                                         fromdate, todate, productiontype, action }          -> data.data (+ data.success, data.message)
//   POST /api/prodproductionreport action:'packinginfo' { ...same 11 keys, action, uid, vouno, voudate, mgrpname, msgrpname, macname,
//                                                         itmname, mername, prodorderqty, doffqty, packingqty } -> data.data (grade rows: grdname, qty)
// AsyncStorage keys: get_property (read + write), user_prptype (read).
import AsyncStorage from '@/common/utils/compatibleStorage';
import axios from 'axios';

export type Row = Record<string, any>;
export type ProductionType = 'all' | 'running' | 'closed';

export const TXNTYPE = 'mob_production_report';

/** legacy convertedStatus: all -> '-1', running -> '0', closed -> '2' */
export const statusOf = (t: ProductionType | string) =>
  t == 'all' ? '-1' : t == 'running' ? '0' : t == 'closed' ? '2' : '';

/** legacy "safe data extraction" used by getyear / getstore */
const pickArray = (data: any): Row[] => {
  if (data?.response?.data && Array.isArray(data.response.data)) return data.response.data;
  if (data?.data && Array.isArray(data.data)) return data.data;
  if (Array.isArray(data)) return data;
  return [];
};

/* ----------------------------- GET /api/getproperty ----------------------------- */
export async function fetchProperties(API: string, token: string): Promise<Row[]> {
  try {
    await AsyncStorage.getItem('get_property'); // legacy read the cache but never used it
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
    console.log('fetchPropertyData error', error);
    return [];
  }
}

/* ------------------------------- GET /api/getyear ------------------------------- */
export async function fetchYears(API: string, token: string, prpcd = ''): Promise<Row[]> {
  try {
    const params = { prpcode: prpcd };
    const response = await axios.get(`${API}/api/getyear`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/javascript',
        Accept: 'application/json',
      },
      params,
    });
    return pickArray(response.data);
  } catch (error) {
    console.log('fetchAllYeardata error', error);
    return [];
  }
}

/* ------------------------------ GET /api/getstore ------------------------------- */
// legacy screen called fetchAllStoredata(token, prpcode, yearno) -> txn = ''
export async function fetchStores(API: string, token: string, prp = '', yrno = '', txn = ''): Promise<Row[]> {
  const userPtype = await AsyncStorage.getItem('user_prptype');
  try {
    const params = {
      prpcode: prp,
      yearno: yrno,
      txntype: txn,
      prptype: userPtype,
    };
    const response = await axios.get(`${API}/api/getstore`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/javascript',
        Accept: 'application/json',
        'x-platform': 'mob',
      },
      params,
    });
    return pickArray(response.data);
  } catch (error) {
    console.log('fetchAllStoredata error', error);
    return [];
  }
}

/* ---------------------------- GET /api/get_criterion ---------------------------- */
export type CriterionBase = { prpcode: string; yearno: string; strcode: any; productiontype: string };

/** Returns the list ONLY when success && length > 0, otherwise null (legacy then kept the previous list). */
async function getCriterion(API: string, token: string, payload: Row, tag: string): Promise<Row[] | null> {
  try {
    const res = await axios.get(`${API}/api/get_criterion`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      params: payload,
    });
    if (res.data.success && res.data.response.data.length > 0) return res.data.response.data;
    console.log(`${tag} API success false:`, res?.data);
    return null;
  } catch (error) {
    console.log(`${tag} error:`, error);
    return null;
  }
}

export function fetchMachineGroups(API: string, token: string, b: CriterionBase) {
  const payload = {
    fetch: 'macgrp',
    txntype: TXNTYPE,
    prptype: '',
    prpcode: b.prpcode,
    yearno: b.yearno,
    strcode: b.strcode,
    productiontype: b.productiontype,
  };
  return getCriterion(API, token, payload, 'macgrp');
}

export function fetchMachineSubGroups(API: string, token: string, b: CriterionBase, macgrp: any[]) {
  const payload = {
    fetch: 'macsgrp',
    txntype: TXNTYPE,
    prptype: '',
    prpcode: b.prpcode,
    yearno: b.yearno,
    macgrp,
    strcode: b.strcode,
    productiontype: b.productiontype,
  };
  return getCriterion(API, token, payload, 'macsgrp');
}

export function fetchMachines(API: string, token: string, b: CriterionBase, macgrp: any[], macsgrp: any[]) {
  const payload = {
    fetch: 'machine',
    txntype: TXNTYPE,
    prptype: '',
    prpcode: b.prpcode,
    yearno: b.yearno,
    macgrp,
    macsgrp,
    strcode: b.strcode,
    productiontype: b.productiontype,
  };
  return getCriterion(API, token, payload, 'machine');
}

/* ------------------------- POST /api/prodproductionreport ------------------------ */
export type ReportCriteria = {
  prpcode: string;
  yearno: string;
  strcode: any;
  macgrp: any[];
  macsgrp: any[];
  maccode: any[];
  fromdate: string;
  todate: string;
  productiontype: string;
};

const reportHeaders = (token: string) => ({
  Authorization: `Bearer ${token}`,
  'Content-Type': 'application/json',
  'X-Requested-with': 'XMLHttpRequest',
});

/** action:'report' — returns response.data ({ success, data, message }). Throws on network error. */
export async function postReport(API: string, token: string, c: ReportCriteria): Promise<any> {
  const payload = {
    prptype: '',
    txntype: TXNTYPE,
    prpcode: c.prpcode,
    yearno: c.yearno,
    strcode: c.strcode,
    macgrp: c.macgrp,
    macsgrp: c.macsgrp,
    maccode: c.maccode,
    fromdate: c.fromdate,
    todate: c.todate,
    productiontype: c.productiontype,
    action: 'report',
  };
  console.log('payload :---', payload);
  const response = await axios.post(`${API}/api/prodproductionreport`, payload, { headers: reportHeaders(token) });
  return response.data;
}

/** action:'packinginfo' — grade-wise packing of one report row. Returns response.data. Throws on network error. */
export async function postPackingInfo(API: string, token: string, c: ReportCriteria, row: Row = {}): Promise<any> {
  const payload = {
    prptype: '',
    txntype: TXNTYPE,
    prpcode: c.prpcode,
    yearno: c.yearno,
    strcode: c.strcode,
    macgrp: c.macgrp,
    macsgrp: c.macsgrp,
    maccode: c.maccode,
    fromdate: c.fromdate,
    todate: c.todate,
    productiontype: c.productiontype,
    action: 'packinginfo',
    uid: row.uid,
    vouno: row.vouno,
    voudate: row.voudate,
    mgrpname: row.mgrpname,
    msgrpname: row.msgrpname,
    macname: row.macname,
    itmname: row.itmname,
    mername: row.mername,
    prodorderqty: row.prodorderqty,
    doffqty: row.doffqty,
    packingqty: row.packingqty,
  };
  console.log('payload ::', payload);
  const response = await axios.post(`${API}/api/prodproductionreport`, payload, { headers: reportHeaders(token) });
  return response.data;
}
