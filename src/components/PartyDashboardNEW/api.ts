// FILE: src/components/PartyDashboardNEW/api.ts
// Every HTTP call of the Party Dashboard — same URL paths, methods, headers,
// params/body keys (and key ORDER) and response paths as legacy:
//   components/PartyDashboard/index.tsx            (party list  – route /(tabs)/party-dashboard)
//   components/PartyDashboard/PartyDetailScreen.tsx (party detail – route /(tabs)/PartyDetailScreen)
//   common/API/Functions.tsx -> fetchPropertyData   (property list used by the filter)
// The `API` host prop and `token` prop replace the global `API` import.
//
// Endpoints
//   GET  /api/getproperty        (no params)                 -> res.data.response.data   (cached to AsyncStorage 'get_property')
//   GET  /api/mobaccountbasic    (params, see fetchPartyList) -> res.data.response.data || res.data.data || res.data.result
//   POST /api/get_report         (body, see fetchPartyReport) -> res.data.response.data.{get_ledger_data,get_outstanding_data,
//                                                                 get_customer_rate,get_billings,account_summary}
// AsyncStorage keys: 'get_property' (read + written, exactly like legacy fetchPropertyData).
//
// NOT ported (not reachable from the live legacy screens): /api/prodordertrack — it is only called by
// ProdOrderTrackingCard.tsx, which nothing imports.
import AsyncStorage from '@/common/utils/compatibleStorage';
import axios from 'axios';

export type Row = Record<string, any>;

/* ------------------------------------------------------------------ */
/* GET /api/getproperty  (legacy common/API/Functions fetchPropertyData) */
/*   headers: Authorization, Content-Type 'application/javascript',     */
/*            Accept 'application/json'; params: null                   */
/*   success && response.data.length > 0 -> cache 'get_property', return */
/*   anything else / any error -> []                                    */
/* ------------------------------------------------------------------ */
export async function fetchPropertyData(API: string, token: string): Promise<Row[]> {
  try {
    // legacy reads the cache first but never uses it (kept for parity of storage access)
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
    if (!axios.isCancel(error)) console.log('[PartyDashboardNEW] fetchPropertyData error', error);
    return [];
  }
}

/* ------------------------------------------------------------------ */
/* GET /api/mobaccountbasic   (legacy index.tsx fetchpartylist)          */
/*   params (order kept): prpcode, prptype, yearno, strcode:'0',        */
/*     txntype:'mob_party_dashboard', partytype:'p', type:'s', page:1,  */
/*     limit:20, search:'', isceo:0, partype:0, grntype:'', fetch:'',   */
/*     acccode:'', billdate:'', strtype:'', isfaint:'', user_id:1       */
/*   prpcode = selectedProperty.PrpCode, prptype = selectedProperty.PrpOf, */
/*   yearno  = last 2 chars of the selected year ("2026-2027" -> "27")  */
/*   -> rows, each normalised with acccode / accname / address aliases  */
/*   Throws on network error (caller clears the list, like legacy).     */
/* ------------------------------------------------------------------ */
export async function fetchPartyList(API: string, token: string, selectedProperty: any, selectedYear: string): Promise<Row[]> {
  const prpcode = typeof selectedProperty === 'object' ? selectedProperty?.PrpCode : selectedProperty;
  const prptype = typeof selectedProperty === 'object' ? selectedProperty?.PrpOf : selectedProperty;
  const yearno = selectedYear?.slice(-2);

  const payload = {
    prpcode,
    prptype,
    yearno,
    strcode: '0',
    txntype: 'mob_party_dashboard',
    partytype: 'p',
    type: 's',
    page: 1,
    limit: 20,
    search: '',
    isceo: 0,
    partype: 0,
    grntype: '',
    fetch: '',
    acccode: '',
    billdate: '',
    strtype: '',
    isfaint: '',
    user_id: 1,
  };
  console.log('[PartyDashboardNEW] mobaccountbasic ->', payload);

  const res = await axios.get(`${API}/api/mobaccountbasic`, {
    headers: { Authorization: `Bearer ${token}` },
    params: payload,
  });

  const rawData = res?.data?.response?.data || res?.data?.data || res?.data?.result || [];
  if (Array.isArray(rawData) && rawData.length > 0) {
    return rawData.map((item: Row) => ({
      ...item,
      acccode: item.acccode || item.AccCode,
      accname: item.accountname || item.accname || item.AccName || '',
      address: item.address || item.addr || item.Address || '',
    }));
  }
  return [];
}

export type PartyReport = {
  ledger: Row[];
  outstanding: Row[];
  rate: Row[];
  billing: Row[];
  summary: Row;
};

/* ------------------------------------------------------------------ */
/* POST /api/get_report   (legacy PartyDetailScreen.tsx fetchData)       */
/*   body (order kept): prptype, prpcodes, parcodes:[acccode], yearno,  */
/*     mheads:[], sheads:[], contras:[], inverse:[], fromdate:'',       */
/*     todate:'', reportytype:0, showopening:1, display:1,              */
/*     showinternal:-1, txntype:'mob_party_dashboard', rptid:1635,      */
/*     rptaction:'get_collection_comman_rpt', export:'', grpby:'party'  */
/*   headers: Authorization, Content-Type 'application/json',           */
/*            'X-Requested-with': 'XMLHttpRequest'                      */
/*   res.data.success -> res.data.response.data ; otherwise null        */
/*   (legacy leaves the previous state untouched). Throws on error.     */
/* ------------------------------------------------------------------ */
export async function fetchPartyReport(
  API: string,
  token: string,
  party: Row | null,
  selectedProperty: any,
  selectedYear: string,
): Promise<PartyReport | null> {
  const payload = {
    prptype: selectedProperty?.PrpOf || '',
    prpcodes: selectedProperty?.PrpCode || '',
    parcodes: party?.acccode ? [party.acccode] : [],
    yearno: selectedYear ? selectedYear.slice(-2) : '',
    mheads: [] as any[],
    sheads: [] as any[],
    contras: [] as any[],
    inverse: [] as any[],
    fromdate: '',
    todate: '',
    reportytype: 0,
    showopening: 1,
    display: 1,
    showinternal: -1,
    txntype: 'mob_party_dashboard',
    rptid: 1635,
    rptaction: 'get_collection_comman_rpt',
    export: '',
    grpby: 'party',
  };
  console.log('[PartyDashboardNEW] get_report ->', payload);

  const res = await axios.post(`${API}/api/get_report`, payload, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'X-Requested-with': 'XMLHttpRequest',
    },
  });

  if (res.data.success) {
    const data = res.data.response.data;
    return {
      ledger: data.get_ledger_data || [],
      outstanding: data.get_outstanding_data || [],
      rate: data.get_customer_rate || [],
      billing: data.get_billings || [],
      summary: data.account_summary || [],
    };
  }
  return null;
}
