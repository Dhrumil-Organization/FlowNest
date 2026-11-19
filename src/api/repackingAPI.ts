// FILE: src/api/repackingAPI.ts
// Repacking (Knitting • Grey) API on the shared legacy `client`.
// Entries / view / save / delete / issue help / voucher → KnitPrdRepackController (Route::prefix('repack')).
// Item / Grade / Shade → get_criterion, Merge → getmerge (txntype prod_repacking).
// Property / Year / Store / Department → same calls as Repacking Issue.
import client from './legacyClient';
import {
  apiError, bodyOf, createRepackingIssueService, failed, listOf, MERGE_TTYPE, messageOf, toOption, unwrapRows,
} from './repackingIssueAPI';
import type { SaveResult } from '../features/repackingIssue/service';
import type { LookupFilter, LookupKind, LookupOption, RepackContext, RepackListRow } from '../features/repackingIssue/types';
import {
  buildPayload, defaultsFrom, formFromShow, issueDetailFrom, issueSummaryFrom, toDMY,
} from '../features/repacking/logic';
import type { IssueDetail, IssueSummary, RepackMasters, RpForm } from '../features/repacking/types';

export const REPACKING_TXN_TYPE = 'prod_repacking';
const REPO = '/repack';

export const REPACKING_ROUTES = {
  browse: `${REPO}/browse-data`,
  show: `${REPO}/show-data`,
  add: `${REPO}/add-data`,
  modify: `${REPO}/modify-data`,
  remove: `${REPO}/delete-data`,
  pendingIssues: `${REPO}/pending-issues`,
  issueDetail: `${REPO}/auto-entry`,
  masters: `${REPO}/masters`,
  parties: `${REPO}/parties`,
  voucherNo: `${REPO}/next-voucher-no`,
  criterion: '/get_criterion',
  merge: '/getmerge',
} as const;

type Row = Record<string, any>;

const get = (url: string, params: Row) => client.get(url, { params });
const post = (url: string, body: Row) => client.post(url, body, { timeout: 60000 });

/** body of a repository response or an Error with its message */
const ok = (data: any, fallback: string) => {
  if (failed(data)) throw new Error(messageOf(data, fallback) || fallback);
  return bodyOf(data);
};

/** { header, main, d1, issue } / { main, d1, d2 } wherever the wrapper put it */
const objWith = (data: any, key: string): Row => {
  const c = [bodyOf(data), data?.response, data?.data, data].find(x => x && typeof x === 'object' && !Array.isArray(x) && key in x);
  return c ?? {};
};

const ctxParams = (ctx: RepackContext) => ({ prpcode: ctx.prpCode, yearno: ctx.yearNo, strcode: ctx.strCode, txntype: REPACKING_TXN_TYPE });

const num = (v: any) => (Number.isFinite(Number(v)) ? Number(v) : 0);

export interface RepackingService {
  lookup(kind: LookupKind, ctx: RepackContext, filter?: LookupFilter): Promise<LookupOption[]>;
  masters(ctx: RepackContext, force?: boolean): Promise<RepackMasters>;
  parties(ctx: RepackContext, search: string): Promise<LookupOption[]>;
  pendingIssues(ctx: RepackContext, currentIssUid?: number): Promise<IssueSummary[]>;
  issueDetail(ctx: RepackContext, issUid: number): Promise<IssueDetail>;
  /** shared series with Repacking Issue; with `typed` it validates (throws "Duplicate Voucher No") */
  nextVoucher(ctx: RepackContext, vouDate: string, typed?: string, issUid?: number): Promise<{ prefix: string; no: string; suffix: string }>;
  browse(ctx: RepackContext, fromDate: string, toDate: string): Promise<RepackListRow[]>;
  load(ctx: RepackContext, uid: number): Promise<RpForm>;
  save(ctx: RepackContext, form: RpForm): Promise<SaveResult>;
  remove(ctx: RepackContext, uid: number): Promise<SaveResult>;
}

export function createRepackingService(): RepackingService {
  const issueSvc = createRepackingIssueService(); // property / year / store / department
  const masterCache = new Map<string, RepackMasters>();

  const svc: RepackingService = {
    async lookup(kind, ctx, filter = {}) {
      if (kind === 'property' || kind === 'year' || kind === 'store' || kind === 'department') {
        return issueSvc.lookup(kind, ctx, filter);
      }
      let rows: any[];
      if (kind === 'item') {
        rows = listOf(await get(REPACKING_ROUTES.criterion, {
          ...ctxParams(ctx), prptype: '', limit: 20, fetch: 'itm', itmcode: '',
          strcodes: ['', ''], issdate: '', issrdate: '', search: filter.search ?? '',
        }));
      } else if (kind === 'merge') {
        if (!filter.itmCode) return [];
        rows = listOf(await get(REPACKING_ROUTES.merge, {
          ...ctxParams(ctx), plnmercode: '', ItmCode: filter.itmCode, ShdCode: '', ttype: MERGE_TTYPE,
          isall: 1, fetch: 'merge', limit: 20, search: filter.search ?? '', type: '',
        }));
      } else if (kind === 'grade') {
        if (!filter.itmCode || !filter.merCode) return [];
        rows = listOf(await get(REPACKING_ROUTES.criterion, {
          ...ctxParams(ctx), ShdCode: '', ItmCode: filter.itmCode, MerCode: filter.merCode, fetch: 'grd', prptype: '',
        }));
      } else {
        if (!filter.itmCode || !filter.merCode || !filter.grdCode) return [];
        rows = listOf(await get(REPACKING_ROUTES.criterion, {
          ...ctxParams(ctx), fetch: 'shd', GrdCode: filter.grdCode, ItmCode: filter.itmCode, MerCode: filter.merCode, prptype: '',
        }));
      }
      return rows.map(r => toOption(kind, r)).filter(o => o.code !== '');
    },

    async masters(ctx, force = false) {
      const key = ctx.prpCode;
      if (!force && masterCache.has(key)) return masterCache.get(key)!;
      const res = await get(REPACKING_ROUTES.masters, ctxParams(ctx));
      const b = objWith(res?.data, 'cartons');
      const opts = (v: any): LookupOption[] =>
        unwrapRows(v).map(r => ({ code: String(r.code ?? '').trim(), name: String(r.name ?? r.code ?? '').trim() })).filter(o => o.code);
      const m: RepackMasters = {
        prodTypes: opts(b.prodtypes),
        packTypes: opts(b.packtypes).length ? opts(b.packtypes) : [{ code: 'NEX', name: 'NEX' }, { code: 'EXC', name: 'EXC' }],
        cartonTypes: unwrapRows(b.cartons).map(r => ({
          code: String(r.code ?? '').trim(), name: String(r.name ?? '').trim(), carWt: num(r.carwt), carSize: String(r.carsize ?? '').trim(),
        })).filter(t => t.code),
        checkers: opts(b.checkers),
        defaults: defaultsFrom(b.defaults),
        errors: Array.isArray(b.errors) ? b.errors.map(String) : [],
      };
      // Packing Type list = get_criterion fetch=prdtype (as the web screen); repository list is the fallback
      try {
        const rows = listOf(await get(REPACKING_ROUTES.criterion, { ...ctxParams(ctx), prptype: '', fetch: 'prdtype' }));
        const pick = (r: Row, keys: string[]) => {
          for (const k of keys) if (r?.[k] !== undefined && r?.[k] !== null && String(r[k]).trim() !== '') return String(r[k]).trim();
          return '';
        };
        const list = rows
          .map(r => {
            const code = pick(r, ['LValue', 'lvalue', 'ProdType', 'prodtype', 'PrdType', 'prdtype', 'code', 'Code']);
            return { code, name: pick(r, ['ListPara', 'listpara', 'ProdTypeName', 'PrdTypeName', 'Name', 'name', 'LngName']) || code };
          })
          .filter(o => o.code);
        if (list.length) m.prodTypes = list;
      } catch {
        /* keep repository list */
      }
      masterCache.set(key, m);
      return m;
    },

    async parties(ctx, search) {
      const res = await get(REPACKING_ROUTES.parties, { ...ctxParams(ctx), search });
      return unwrapRows(ok(res?.data, 'Could not load parties.'))
        .map(r => ({ code: String(r.code ?? '').trim(), name: String(r.name ?? r.code ?? '').trim() }))
        .filter(o => o.code);
    },

    async pendingIssues(ctx, currentIssUid = 0) {
      const res = await get(REPACKING_ROUTES.pendingIssues, { ...ctxParams(ctx), issuid: currentIssUid });
      return unwrapRows(ok(res?.data, 'Could not load Repacking Issues.')).map(issueSummaryFrom).filter(i => i.uid > 0);
    },

    async issueDetail(ctx, issUid) {
      const res = await get(REPACKING_ROUTES.issueDetail, { ...ctxParams(ctx), issuid: issUid });
      if (failed(res?.data)) throw new Error(messageOf(res?.data, 'Repacking Issue not found.'));
      const b = objWith(res?.data, 'main');
      return issueDetailFrom({ main: b.main, d1: unwrapRows(b.d1), d2: unwrapRows(b.d2) });
    },

    async nextVoucher(ctx, vouDate, typed = '', issUid = 0) {
      const res = await get(REPACKING_ROUTES.voucherNo, { ...ctxParams(ctx), pdate: vouDate, vouno: typed.trim(), issuid: issUid });
      const b = ok(res?.data, 'Could not get voucher no.') ?? {};
      const no = String(b.vouno ?? '').trim();
      if (String(b.validate).toLowerCase() === 'false' || !no) throw new Error(String(b.message || 'Invalid voucher number.'));
      return { prefix: String(b.month ?? '').trim(), no, suffix: String(b.suffix ?? '').trim() };
    },

    async browse(ctx, fromDate, toDate) {
      const res = await get(REPACKING_ROUTES.browse, { ...ctxParams(ctx), fromdate: fromDate, todate: toDate });
      const rows = unwrapRows(ok(res?.data, 'Could not load entries.'));
      // Repacking lives on the issue's own POYProd row → one card per UId
      return rows.map(raw => {
        const r: Row = {};
        Object.keys(raw).forEach(k => { r[k.toLowerCase()] = raw[k]; });
        const date = toDMY(r.pdate);
        const n = String(r.npdate ?? '');
        const items = num(r.items);
        return {
          uid: num(r.uid),
          vouNo: String(r.vouno ?? '').trim(),
          date,
          dateKey: /^\d{8}$/.test(n) ? Number(n) : Number(date.split('-').reverse().join('')) || 0,
          items: [{ name: String(r.itmname ?? '').trim(), merge: String(r.mername ?? '').trim() }],
          remark: String(r.remark ?? '').trim(),
          isRepack: num(r.used),
          info: `${items} issue item${items === 1 ? '' : 's'}  •  ${num(r.totpcs)} taka  •  ${num(r.totwt).toFixed(3)} wt`,
        } as RepackListRow;
      }).sort((a, b) => b.dateKey - a.dateKey || b.uid - a.uid);
    },

    async load(ctx, uid) {
      const [res, m] = await Promise.all([get(REPACKING_ROUTES.show, { ...ctxParams(ctx), uid }), svc.masters(ctx).catch(() => null)]);
      if (failed(res?.data)) throw new Error(messageOf(res?.data, 'Entry not found.'));
      const b = objWith(res?.data, 'header');
      const form = formFromShow({ ...b, issue: { main: b.issue?.main, d1: unwrapRows(b.issue?.d1), d2: unwrapRows(b.issue?.d2) } }, m);
      if (!form.meta?.uid) throw new Error('Entry not found.');
      return form;
    },

    async save(ctx, form) {
      try {
        const editing = !!form.meta?.uid;
        const body = buildPayload(ctx, form, REPACKING_TXN_TYPE);
        const res = editing ? await post(REPACKING_ROUTES.modify, body) : await post(REPACKING_ROUTES.add, body);
        const data = res?.data ?? {};
        if (failed(data)) return { ok: false, message: messageOf(data, 'Save failed.') };
        const h = objWith(data, 'header').header ?? {};
        const vou = [h.month, h.vouno].map((v: any) => String(v ?? '').trim()).filter(Boolean).join(' / ');
        return { ok: true, message: `${editing ? 'Updated' : 'Saved'}${vou ? ` voucher ${vou}` : ''}.` };
      } catch (e) {
        return { ok: false, message: apiError(e) };
      }
    },

    async remove(ctx, uid) {
      try {
        const res = await post(REPACKING_ROUTES.remove, { ...ctxParams(ctx), uid });
        if (failed(res?.data)) return { ok: false, message: messageOf(res?.data, 'Delete failed.') };
        return { ok: true, message: messageOf(res?.data) || 'Deleted.' };
      } catch (e) {
        return { ok: false, message: apiError(e) };
      }
    },
  };
  return svc;
}
