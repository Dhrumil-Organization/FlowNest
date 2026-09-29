// FILE: src/screens/weftIssue/weftIssueApi.ts
// NEW ERP — Weft Issue: every endpoint of the legacy module
// (components/WftIssue = "Previous", components/WftIssueNew = "New"),
// same paths + payload keys. txntype 'beam_weft_issue'.
import axios from 'axios';

export const TXN = 'beam_weft_issue';
export type Mode = 'new' | 'old';

const listOf = (res: any) => {
  const d = res?.data?.response?.data ?? res?.data?.data ?? res?.data;
  return Array.isArray(d) ? d : [];
};

export type Carton = {
  cartonNo: string; qty: any; chees: any;
  PUId: any; PSrNo: any; PSubSr: any; SrNo: any; SubSr: any; TranType: any;
  ItmCode: any; ItmName: any; MerCode: any; MerName: any; GrdCode: any; GrdName: any;
  ShdCode: any; ShdName: any; Denier: any; yearNo: any; DsnRcpSrNo: any;
  UId: any; uid?: any; ExpProdQty?: any; [k: string]: any;
};

/** legacy normalizeCarton */
export const normalizeCarton = (item: any): Carton => ({
  ...item,
  UId: item?.UId ?? item?.uid ?? item?.CartonUId ?? item?.cartonuid ?? '',
  uid: item?.uid ?? item?.UId ?? item?.CartonUId ?? item?.cartonuid ?? '',
  SrNo: item?.SrNo ?? item?.srno ?? item?.PSrNo ?? '',
  SubSr: item?.SubSr ?? item?.subsrno ?? item?.PSubSr ?? '',
  PSrNo: item?.PSrNo ?? item?.SrNo ?? item?.srno ?? '',
  PSubSr: item?.PSubSr ?? item?.SubSr ?? item?.subsrno ?? '',
});

/** legacy handleViewClick mapping: d2 joined to d1 on SrNo (d1 UId wins). */
export const mapShow = (resp: any, yearNo: string): { main: any; cartons: Carton[] } => {
  const main = resp?.main?.[0] ?? null;
  const d1: any[] = Array.isArray(resp?.d1) ? resp.d1 : [];
  const d2: any[] = Array.isArray(resp?.d2) ? resp.d2 : [];
  const d1Map: Record<string, any> = {};
  d1.forEach((x) => { d1Map[String(x.SrNo)] = x; });
  const cartons = d2.filter((r) => d1Map[String(r.SrNo)]).map((r) => {
    const a = d1Map[String(r.SrNo)];
    return normalizeCarton({
      cartonNo: r.CartNo || '', qty: r.Qty || '', chees: r.Chees || '',
      DsnRcpSrNo: r.DsnRcpSrNo || '', RecipeUId: r.RecipeUId || '',
      PUId: r.PUId || '', PSrNo: r.PSrNo || '', PSubSr: r.PSubSr || '', TranType: r.TranType || '',
      d2SrNo: String(r.SrNo || ''), SrNo: r.SrNo, SubSr: r.SubSr, BalQty: r.BalQty, ProdType: r.ProdType, ExpProdQty: r.ExpProdQty,
      ItmCode: a.ItmCode || '', ItmName: a.ItmName || '', MerCode: a.MerCode || '', MerName: a.MerName || '',
      GrdCode: a.GrdCode || '', GrdName: a.GrdName || '', ShdCode: a.ShdCode || '', ShdName: a.ShdName || '',
      Denier: a.Denier || '', d1SrNo: String(a.SrNo || ''),
      UId: a.UId || '',
      yearNo: yearNo || '',
    });
  });
  return { main, cartons };
};

/** Recursively finds the UId of the carton `cartonNo` inside a save response. */
export const cartonUidFrom = (data: any, cartonNo: string) => {
  const target = String(cartonNo || '');
  const seen = new Set<any>();
  const walk = (v: any): any => {
    if (!v || typeof v !== 'object' || seen.has(v)) return '';
    seen.add(v);
    if (Array.isArray(v)) { for (const i of v) { const f = walk(i); if (f) return f; } return ''; }
    const no = v.CartNo ?? v.cartonNo ?? v.CartonNo;
    if (target && no != null && String(no) === target) return v.UId ?? v.uid ?? v.CartonUId ?? v.cartonuid ?? '';
    for (const k of Object.keys(v)) { const f = walk(v[k]); if (f) return f; }
    return '';
  };
  return walk(data);
};

/** QR (~ separated) -> carton fields (legacy layouts: 16 / 13+ / 11+ parts). */
export const parseQr = (raw: string): Record<string, any> | null => {
  const p = String(raw || '').split('~');
  if (p.length === 16) {
    return {
      PUId: p[0], PSrNo: p[1], PSubSr: p[2], TranType: p[3], CartNo: p[4], ItmCode: p[5], ItmName: p[6], MerCode: p[7],
      MerName: p[8], GrdCode: p[9], GrdName: p[10], ShdCode: p[11], ShdName: p[12], Wt: p[13], Chees: p[14], yearNo: p[15],
    };
  }
  if (p.length >= 13) {
    return {
      PrpCode: p[0], PUId: p[1], PSrNo: p[2], PSubSr: p[3], TranType: p[4], CartNo: p[5], ItmCode: p[6], MerCode: p[7],
      GrdCode: p[8], ShdCode: p[9], Denier: p[10], Wt: p[11], Chees: p[12], Rate: p[13], yearNo: p[14],
    };
  }
  if (p.length >= 11) {
    return {
      PUId: p[0], PSrNo: p[1], PSubSr: p[2], TranType: p[3], CartNo: p[4], ItmCode: p[5], MerCode: p[6], GrdCode: p[7],
      ShdCode: p[8], Denier: p[9], Wt: p[10], Chees: 0, yearNo: p[11],
    };
  }
  return null;
};

const pad = (n: number) => String(n).padStart(2, '0');
/** dd-mm-yyyy (legacy formatDisplayDate) */
export const dmy = (v: any) => {
  if (!v) return '';
  const d = v instanceof Date ? v : new Date(v);
  if (Number.isNaN(d.getTime())) return '';
  return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}`;
};
export const isoDay = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
/** dd-mm-yyyy / yyyy-mm-dd / any parseable -> Date at local midnight (null when unknown). */
export const toDate = (v: any): Date | null => {
  if (!v) return null;
  if (v instanceof Date) return v;
  const s = String(v);
  let m = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (m) return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
};
export const monthOf = (d: Date | null) => (d ? pad(d.getMonth() + 1) : '');
export const str = (v: any) => (v === null || v === undefined ? '' : String(v));
export const errOf = (e: any, fb: string) =>
  e?.response?.data?.response?.message || e?.response?.data?.message || (typeof e?.message === 'string' ? e.message : '') || fb;

export function createWeftIssueApi(API: string, token: string) {
  const c = axios.create({
    baseURL: String(API || '').replace(/\/+$/, ''),
    timeout: 120000,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'application/json' },
  });
  const post = (url: string, body: any) => c.post(url, body, { headers: { 'X-Requested-with': 'XMLHttpRequest' } });

  return {
    /** GET /api/get_criterion?prptype&txntype=''&fetch=prp  (legacy fetchAllPropertyData) */
    properties: async (prptype: string) =>
      listOf(await c.get('/api/get_criterion', { params: { prptype, txntype: "''", fetch: 'prp' } })),
    /** GET /api/getyear?prpcode */
    years: async (prpcode: string) => listOf(await c.get('/api/getyear', { params: { prpcode } })),

    /** POST /api/get_yarn_issue_browse — dates yyyy-mm-dd or '' */
    browse: async (p: { prptype: string; prpcode: string; yearno: string; fromdate: string; todate: string }) => {
      const res = await post('/api/get_yarn_issue_browse', { ...p, strcode: '002', txntype: TXN, status: '' });
      return res.data?.success && Array.isArray(res.data?.response?.data) ? res.data.response.data : [];
    },
    /** POST /api/get_yarn_issue_show */
    show: async (p: { uid: any; prpcode: string; yearno: string }) =>
      (await post('/api/get_yarn_issue_show', { uid: p.uid, prpcode: p.prpcode, strcode: '002', yearno: p.yearno, txntype: TXN })).data,
    /** POST /api/delete_creel_data — whole entry */
    deleteEntry: async (p: { prpcode: string; yearno: string; uid: any }) => (await post('/api/delete_creel_data', p)).data,

    /** GET /api/warpissueshow — header defaults + issue-design users */
    defaults: async (p: { prpcode: string; yearno: string }) =>
      (await c.get('/api/warpissueshow', { params: { uid: '0', prpcode: p.prpcode, yearno: p.yearno, strcode: '012', action: 'add', txntype: TXN } })).data?.data ?? {},
    /** GET /api/checkvoucherno */
    voucher: async (p: { prpcode: string; yearno: string; vouno: string; suffix: string; month: string; uid: any; date: string }) =>
      (await c.get('/api/checkvoucherno', { params: { ...p, acccode: '', module: 'POYIssue', module_no_key: 'IssNo' } })).data?.response ?? {},
    /** GET /api/beam_for_weftissue_help */
    beams: async (p: { prpcode: string; yearno: string; strcode: string; date: string; uid: any }) => {
      const r = await c.get('/api/beam_for_weftissue_help', { params: { ...p, txntype: TXN } });
      return r.data?.success && Array.isArray(r.data?.data) ? r.data.data : [];
    },
    /** GET /api/orderdesign_for_weftissue_help */
    designs: async (p: { prpcode: string; yearno: string; date: string; uid: any; stktype: string; beamuid: any }) => {
      const r = await c.get('/api/orderdesign_for_weftissue_help', { params: { ...p, txntype: TXN } });
      return Array.isArray(r.data?.data) ? r.data.data : [];
    },
    /** GET /api/get_weftissuedesign_help -> data.IssueDesign */
    issueDesigns: async (p: { prpcode: string; yearno: string; dsncode: string }) => {
      const r = await c.get('/api/get_weftissuedesign_help', { params: { ...p, strcode: '012', txntype: TXN } });
      return r.data?.success && Array.isArray(r.data?.data?.IssueDesign) ? r.data.data.IssueDesign : [];
    },
    /** GET /api/designwise_mainitem_for_weftissue_help (txntype weft_selvedge_issue) */
    designItems: async (p: { prpcode: string; yearno: string; dsncode: string }) => {
      const r = await c.get('/api/designwise_mainitem_for_weftissue_help', { params: { ...p, txntype: 'weft_selvedge_issue' } });
      return Array.isArray(r.data?.data) ? r.data.data : [];
    },
    /** POST /api/get_item_detail_from_carton -> names of a scanned carton */
    itemNames: async (p: { prpcode: string; yearno: string; strcode: string; itmcode: any; mercode: any; grdcode: any; shdcode: any }) =>
      (await post('/api/get_item_detail_from_carton', p)).data?.response?.data ?? null,
    /** POST /api/get_carton_search */
    searchCarton: async (p: { prpcode: string; yearno: string; strcode: string; mitmcode: string; searchcarton: string }) => {
      const r = await post('/api/get_carton_search', { ...p, txntype: TXN });
      return Array.isArray(r.data?.response?.data) ? r.data.response.data : [];
    },
    /** Expected production qty — "Previous": get_expprodqty_from_issueqty, "New": getExpectedWeftIssue */
    expQty: async (mode: Mode, p: {
      prpcode: string; yearno: string; qty: any; itmcode: any; shdcode: any; srno: any; beamuid: any; dsncode: any; issuid: any;
    }) => {
      const res = mode === 'new'
        ? await c.get('/api/getExpectedWeftIssue', { params: {
          prpcode: p.prpcode, yearno: p.yearno, txntype: TXN, reqqty: p.qty, itmcode: p.itmcode, shdcode: p.shdcode,
          srno: p.srno, beamuid: p.beamuid, dsncode: p.dsncode, IssUId: p.issuid,
        } })
        : await c.get('/api/get_expprodqty_from_issueqty', { params: {
          PrpCode: p.prpcode, YearNo: p.yearno, txntype: TXN, WfIssQty: p.qty, MRUId: '0', MRSrNo: '0',
          ItmCode: p.itmcode, ShdCode: p.shdcode, PlnWfSrNo: p.srno, beamuid: p.beamuid, dsncode: p.dsncode,
        } });
      const arr = res.data?.data?.data;
      return Array.isArray(arr) && arr.length ? (arr[0].ExpProdQty || 0) : 0;
    },
    /** POST /api/add_creel_data */
    add: async (payload: any) => (await post('/api/add_creel_data', payload)).data,
    /** POST /api/modify_creel_data */
    modify: async (payload: any) => (await post('/api/modify_creel_data', payload)).data,
    /** POST /api/delete_creel_single_data */
    deleteCarton: async (payload: any) => (await post('/api/delete_creel_single_data', payload)).data,
  };
}

export type WeftIssueApi = ReturnType<typeof createWeftIssueApi>;
