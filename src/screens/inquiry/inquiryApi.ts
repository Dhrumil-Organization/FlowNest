// FILE: src/screens/inquiry/inquiryApi.ts
// NEW ERP — Inquiry module: ONE service for every inquiry endpoint.
// Same endpoints + payloads as the legacy module (src_inquiry/services/*).
//
// Difference vs legacy: the legacy axios client read the API host ONCE at
// import time (so a property switch kept hitting the old host) and some
// calls sent a hard-coded yearno '27' / no prptype at all. Here the client
// is built from the ErpSessionGate session (correct host + token for the
// selected property) and every call gets the same prptype + yearno.
import axios, { AxiosInstance } from 'axios';
import {
  AuthQueueItem,
  CostSheet,
  DashboardCounts,
  Design,
  GstinData,
  Inquiry,
  InquiryDesignInput,
  InquiryNote,
  InquiryRights,
  InquiryShade,
  InquiryStatus,
  Party,
  TatConfiguration,
  TatCounts,
  TatStatus,
} from './inquiryModel';

export type Ctx = { prptype: string; yearno: string };

export interface StorePayload {
  party_prp_code: string | null;
  party_acc_code: string;
  party_name_snapshot: string;
  party_gstin?: string;
  party_address?: string;
  designs: InquiryDesignInput[];
  remarks?: string;
  prptype: string;
  yearno: string;
}

const buildAddress = (r: any) => [r.AddrBnm, r.AddrBno, r.AddrFlno, r.AddrSt, r.AddrLoc].filter(Boolean).join(', ');

const createClient = (API: string, token: string): AxiosInstance => {
  const client = axios.create({
    baseURL: String(API || '').replace(/\/+$/, ''),
    timeout: 120000,
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
  });
  client.interceptors.request.use((config) => {
    if (token) {
      config.headers = config.headers || ({} as any);
      (config.headers as any).Authorization = `Bearer ${token}`;
    }
    return config;
  });
  return client;
};

export function createInquiryApi(API: string, token: string, ctx: Ctx) {
  const c = createClient(API, token);
  const q = { prptype: ctx.prptype, yearno: ctx.yearno };

  return {
    ctx,

    /* ------------------------------ inquiries ------------------------------ */
    list: async (p: { status?: InquiryStatus | 'all'; tat?: TatStatus; search?: string; rights: number }) => {
      const res = await c.get('/api/inquiries', { params: { ...p, ...q } });
      return {
        data: (res.data?.data ?? []) as Inquiry[],
        counts: (res.data?.counts ?? null) as DashboardCounts | null,
        tatCounts: (res.data?.tat_counts ?? null) as TatCounts | null,
      };
    },

    show: async (id: number): Promise<Inquiry> => {
      const res = await c.get(`/api/inquiries/${id}`, { params: q });
      const payload = res.data?.data as Inquiry;
      const tat_live = res.data?.tat_live ?? (payload as any)?.tat_live;
      return { ...payload, tat_live };
    },

    store: async (payload: StorePayload): Promise<Inquiry> => (await c.post('/api/inquiries', payload)).data?.data,

    update: async (id: number, payload: StorePayload): Promise<Inquiry> =>
      (await c.put(`/api/inquiries/${id}`, payload)).data?.data,

    remove: async (id: number) => (await c.delete(`/api/inquiries/${id}`, { params: q })).data?.data,

    submitCosting: async (id: number, costings: { inquiry_design_id: number; cost_per_mtr: number; gst_percent: number }[]) =>
      (await c.post(`/api/inquiries/${id}/costing`, { costings }, { params: q })).data?.data,

    confirm: async (id: number, p: { payment_terms?: string; delivery_terms?: string; remarks?: string }) =>
      (await c.post(`/api/inquiries/${id}/confirm`, { ...p, ...q })).data?.data,

    reject: async (id: number, p: { reason: string; remarks?: string }) =>
      (await c.post(`/api/inquiries/${id}/reject`, { ...p, ...q })).data?.data,

    pdf: async (id: number): Promise<{ pdf_url: string; pdf_path: string }> =>
      (await c.get(`/api/inquiries/${id}/pdf`, { params: q })).data?.data,

    sendEmail: async (id: number, p: { email: string; subject?: string; message?: string }) =>
      (await c.post(`/api/inquiries/${id}/email`, { ...p, ...q })).data,

    sendWhatsapp: async (id: number, p: { mobile: string; message?: string }) =>
      (await c.post(`/api/inquiries/${id}/whatsapp`, { ...p, ...q })).data,

    /* -------------------------------- notes -------------------------------- */
    notes: async (inquiryId: number): Promise<InquiryNote[]> =>
      (await c.get(`/api/inquiries/${inquiryId}/notes`, { params: q })).data?.data ?? [],
    addNote: async (inquiryId: number, note: string): Promise<InquiryNote> =>
      (await c.post(`/api/inquiries/${inquiryId}/notes`, { note, ...q })).data?.data,
    updateNote: async (inquiryId: number, noteId: number, note: string): Promise<InquiryNote> =>
      (await c.put(`/api/inquiries/${inquiryId}/notes/${noteId}`, { note }, { params: q })).data?.data,
    deleteNote: async (inquiryId: number, noteId: number) =>
      (await c.delete(`/api/inquiries/${inquiryId}/notes/${noteId}`, { params: q })).data?.data,

    /* ------------------------------ cost sheet ----------------------------- */
    costSheet: async (inquiryId: number, designId: number): Promise<CostSheet | null> =>
      (await c.get(`/api/inquiries/${inquiryId}/designs/${designId}/cost-sheet`, { params: q })).data?.data?.cost_sheet ?? null,
    saveCostSheet: async (inquiryId: number, designId: number, sheet: Partial<CostSheet>): Promise<CostSheet> => {
      const res = await c.post(`/api/inquiries/${inquiryId}/designs/${designId}/cost-sheet`, sheet, { params: q });
      if (!res.data?.success) throw { response: { data: { message: res.data?.message || 'Failed to save' } } };
      return res.data.data;
    },
    submitCostSheet: async (inquiryId: number, designId: number): Promise<CostSheet> =>
      (await c.post(`/api/inquiries/${inquiryId}/designs/${designId}/cost-sheet/submit`, null, { params: q })).data?.data,
    approveCostSheet: async (inquiryId: number, designId: number): Promise<CostSheet> =>
      (await c.post(`/api/inquiries/${inquiryId}/designs/${designId}/cost-sheet/approve`, null, { params: q })).data?.data,
    rejectCostSheet: async (inquiryId: number, designId: number, p: { reason: string; remarks?: string }): Promise<CostSheet> =>
      (await c.post(`/api/inquiries/${inquiryId}/designs/${designId}/cost-sheet/reject`, p, { params: q })).data?.data,
    authQueue: async (): Promise<{ counts: { pending: number; approved: number; rejected: number }; data: AuthQueueItem[] }> => {
      const res = await c.get('/api/auth/pending-cost-sheets', { params: q });
      return { counts: res.data?.counts ?? { pending: 0, approved: 0, rejected: 0 }, data: res.data?.data ?? [] };
    },

    /* ------------------------------- masters ------------------------------- */
    searchParties: async (search: string): Promise<Party[]> =>
      (await c.get('/api/parties/search', { params: { q: search, ...q } })).data?.data ?? [],
    searchDesigns: async (search: string): Promise<Design[]> =>
      (await c.get('/api/designs/search', { params: { q: search, ...q } })).data?.data ?? [],
    /** Shade master (same as legacy: prpcode SIP for S else SK, store 002, txntype sales_order). */
    shadeMaster: async (): Promise<{ ShdCode: string; ShdName: string }[]> => {
      const prpcode = String(ctx.prptype).trim().toUpperCase() === 'S' ? 'SIP' : 'SK';
      const res = await c.get('/api/shadedrop', {
        params: { prpcode, yearno: ctx.yearno, strcode: '002', shdcode: '', shdname: '', txntype: 'sales_order' },
      });
      return res.data?.response?.data ?? [];
    },
    /** Fabric stock rows (SDSNCODE / ITMCODE + SHDCODE -> TOTQTY) for the shade stock chip. */
    stockList: async (): Promise<any[]> => {
      const res = await c.get('/api/appgreyinstockdata', { params: { prpcodes: [], ...q, txntype: 'mob_fabric_stock' } });
      return res.data?.response?.data ?? [];
    },
    saveShades: async (designId: number, shades: { shade_name: string; shade_code?: string | null; quantity: number; rate?: number | null }[]): Promise<InquiryShade[]> =>
      (await c.post(`/api/designs/${designId}/shades`, { shades }, { params: q })).data?.data,
    fetchGstin: async (gstin: string): Promise<GstinData> => {
      const res = await c.post('/api/check_single_gstin', {
        ...q, action: 'add', txntype: 'account_master', gstin: gstin.trim().toUpperCase(),
      });
      const { success, result } = res.data || {};
      if (!success) throw new Error(res.data?.message || 'GSTIN fetch failed');
      return {
        gstin: result.Gstin || gstin,
        legal_name: result.LegalName || '',
        trade_name: result.TradeName || '',
        address: buildAddress(result),
        city: result.AddrLoc || '',
        state: result.State || '',
        pincode: result.AddrPncd ? String(result.AddrPncd) : '',
        status: result.Status || '',
      };
    },

    /* ------------------------------- rights -------------------------------- */
    /** GET /api/checkrights — module_rights[0] (same call + user_id value as legacy). */
    rights: async (userId: string): Promise<InquiryRights | null> => {
      const res = await c.get('/api/checkrights', { params: { permission: '', user_id: userId, txntype: 'mob_inquiry' } });
      if (!res.data?.success) throw new Error(res.data?.message || 'rights fetch failed');
      const list = res.data?.response?.module_rights;
      return Array.isArray(list) && list.length ? list[0] : null;
    },
    myPermissions: async (): Promise<{ is_authorizer: boolean; user_id: number | null }> =>
      (await c.get('/api/settings/me/permissions', { params: q })).data?.data ?? { is_authorizer: false, user_id: null },

    /* ------------------------------ admin ---------------------------------- */
    tatConfigs: async (): Promise<TatConfiguration[]> =>
      (await c.get('/api/tat/configurations', { params: q })).data?.data ?? [],
    saveTatConfigs: async (rows: { id: number; expected_hours: number; warning_threshold_percent: number }[]) =>
      (await c.post('/api/tat/configurations/bulk', {
        configurations: rows.map((r) => ({ ...r, ...q })),
        ...q,
      })).data?.data,
    authorizers: async (): Promise<number[]> =>
      (await c.get('/api/settings/authorizers', { params: q })).data?.data?.user_ids ?? [],
    saveAuthorizers: async (userIds: number[]): Promise<number[]> =>
      (await c.put('/api/settings/authorizers', { user_ids: userIds }, { params: q })).data?.data?.user_ids ?? userIds,
  };
}

export type InquiryApi = ReturnType<typeof createInquiryApi>;
