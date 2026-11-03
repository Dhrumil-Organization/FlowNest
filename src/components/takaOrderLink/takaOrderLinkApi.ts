// FILE: src/screens/takaOrderLink/takaOrderLinkApi.ts
// Taka - Production Order Link. One Laravel endpoint: POST /api/taka_order_link
// (PrdBeamDetailController@taka_order_link) with action designs | list | orders | link | unlink.
// "list" runs TMSMASTER.dbo.SP_TAKA_ORDER_LINK_LIST (same stock rules as the stock reports:
// department PR, stock type I, design type 7 and job outward / return excluded).
import axios from 'axios';

export type TakaRow = {
  TakaNo: string;
  EntryType: string;            // CHECKING, GRADING, OPENING, JOB INWARD, ...
  BeamType: 'CREEL' | 'PLAN' | 'OTHER';
  InwardVoucher: string;
  InwardDate: number | string;  // yyyymmdd
  InwardQty: number;
  InStock: number;
  StkType: string;
  ChkUId: number | null;
  ChkSrNo: number | null;
  ChkQty: number | null;
  OrderUId: number;
  OrderNo: string;
  OrderDate?: number | string | null;
  OrderInHouseQty?: number | null; // SelfProdQty of the linked order
  OrderLinkedQty?: number | null;
  SuggestedOrderNo?: string;       // newest order of the design with in-house balance
  LinkIssue?: string;              // why the link is wrong (LinkStatus CHECK ORDER)
  PlanUId: number;
  BeamUId: number | null;
  BeamNo: string;
  DsnCode: number;
  DsnName: string;
  PrpCode: string;
  LinkStatus: 'LINKED' | 'CHECK ORDER' | 'NOT LINKED' | 'ORDER MISSING' | 'N/A';
  VisibleInVB: number;          // 0 = the VB report does not show this taka (no plan on the beam)
};

export type Design = { DsnCode: number; DsnName: string };

export type Order = {
  UId: number;
  OrderNo: string;
  VouDate: number | string;
  TotQty: number;
  SelfProdQty: number;
  DsnCode: number;
  Sexe: string;
  IsAuth: number;
  LinkedQty: number;
  BalQty: number;
  InHouseBal: number;  // SelfProdQty - LinkedQty (0 when the order has no in-house quantity)
  LastYear: number;    // 1 = carried forward from last year (negative UId)
  SameBeam: number;
};

export type LinkResult = { TakaNo: string; success: boolean; message: string; OrderUId?: number };

export type Ctx = { API: string; token: string; prpcode: string; yearno: string; prptype: string };

export class TakaOrderLinkError extends Error {}

const n = (v: any) => {
  const x = parseFloat(String(v ?? ''));
  return Number.isFinite(x) ? x : 0;
};

async function call<T>(ctx: Ctx, action: string, body: Record<string, any> = {}): Promise<{ data: T; message: string; success: boolean }> {
  try {
    const res = await axios.request({
      method: 'POST',
      url: `${ctx.API}/api/taka_order_link`,
      headers: { Authorization: `Bearer ${ctx.token}`, 'Content-Type': 'application/json', Accept: 'application/json' },
      data: { action, prpcode: ctx.prpcode, yearno: ctx.yearno, prptype: ctx.prptype, ...body },
      timeout: 180000, // the list rebuilds the whole year's ledger for one design
    });
    const d = res.data || {};
    // reporesponse shape varies between servers: {success, message, data} or {success, message, response:{data}}
    const data = (d?.response?.data ?? d?.data ?? []) as T;
    const message = String(d?.message ?? d?.response?.message ?? '');
    const success = d?.success !== false;
    if (!success && action !== 'link' && action !== 'unlink') throw new TakaOrderLinkError(message || 'Request failed');
    return { data, message, success };
  } catch (e: any) {
    if (e instanceof TakaOrderLinkError) throw e;
    const status = e?.response?.status;
    if (status === 404) throw new TakaOrderLinkError('The server does not have the taka_order_link API yet.');
    throw new TakaOrderLinkError(e?.response?.data?.message || e?.message || 'Network error');
  }
}

export const TakaOrderLinkAPI = {
  designs: async (ctx: Ctx, search: string) => (await call<Design[]>(ctx, 'designs', { search })).data || [],

  list: async (ctx: Ctx, asondate: string, dsncode: number) => {
    const rows = (await call<TakaRow[]>(ctx, 'list', { asondate, dsncode })).data || [];
    return rows.map((r) => ({
      ...r,
      TakaNo: String(r.TakaNo ?? '').trim(),
      InwardQty: n(r.InwardQty),
      InStock: n(r.InStock),
      ChkQty: r.ChkQty == null ? null : n(r.ChkQty),
      OrderUId: n(r.OrderUId),
      VisibleInVB: n(r.VisibleInVB),
    }));
  },

  orders: async (ctx: Ctx, dsncode: number, beamuid: number) =>
    ((await call<Order[]>(ctx, 'orders', { dsncode, beamuid })).data || []).map((o) => ({
      ...o, TotQty: n(o.TotQty), SelfProdQty: n(o.SelfProdQty), LinkedQty: n(o.LinkedQty), BalQty: n(o.BalQty),
      InHouseBal: n(o.InHouseBal), LastYear: n(o.LastYear), SameBeam: n(o.SameBeam), IsAuth: n(o.IsAuth),
    })),

  /** link or re-link; allowNoInHouse = the user confirmed an order without in-house quantity */
  link: (ctx: Ctx, order: Order, takas: TakaRow[], allowNoInHouse = false) =>
    call<LinkResult[]>(ctx, 'link', {
      order: { UId: order.UId, TotQty: order.TotQty, DsnCode: order.DsnCode, Sexe: order.Sexe },
      takas: takas.map(takaPayload),
      allow_no_inhouse: allowNoInHouse ? 1 : 0,
    }),

  unlink: (ctx: Ctx, takas: TakaRow[]) => call<LinkResult[]>(ctx, 'unlink', { takas: takas.map(takaPayload) }),
};

const takaPayload = (t: TakaRow) => ({
  ChkUId: t.ChkUId, ChkSrNo: t.ChkSrNo, ChkQty: t.ChkQty ?? t.InwardQty, BeamNo: t.BeamNo,
  BeamUId: t.BeamUId ?? 0, DsnCode: t.DsnCode, PrpCode: t.PrpCode, TakaNo: t.TakaNo,
});

/* ---------- formatting ---------- */
const pad = (x: number) => String(x).padStart(2, '0');
export const ymd = (d: Date) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
export const fmtYmd = (v: any) => {
  const s = String(v ?? '').replace(/\D/g, '');
  return s.length === 8 ? `${s.slice(6, 8)}-${s.slice(4, 6)}-${s.slice(0, 4)}` : '';
};
export const mtr = (v: any) => n(v).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const num = n;
