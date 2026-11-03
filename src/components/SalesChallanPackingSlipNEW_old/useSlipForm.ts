// FILE: src/components/SalesChallanPackingSlipNEW/useSlipForm.ts
// All state + actions of the packing slip, kept out of the screens.
//
// Names follow the web so the two are easy to compare:
//   f.d1    order lines picked from pending orders (left grid on web)
//   stock   allocation lines from get_pack_current_stock (right grid, `getD2Data`, saved as `editedd1`)
//   f.d2    scanned cartons of every line (web CartonDetail → FormState.values.d2)
import { useCallback, useEffect, useRef, useState } from 'react';
import * as A from './api';
import type { Api, Ctx, Mode, PartyScope, Row } from './api';
import {
  PARTY_CLEAR, assignQtyIssue, blank, d1Key, filterPartyRows, indexPartyRows, maxSr, n3, orderToD1, partyFields, saveIssue, splitTypes, sum, today,
} from './rules';

type Busy = Partial<Record<'load' | 'party' | 'stock' | 'save' | 'remove' | 'voucher', boolean>>;
type Problems = Partial<Record<'load' | 'party' | 'stock' | 'voucher' | 'save', string>>;

export type Meta = { prpType: string; strDesc: string; storeName: string };

export function useSlipForm(api: Api, ctx: Ctx, mode: Mode, uid: string | undefined, opts: { assignRight: boolean; scope?: PartyScope; skip?: boolean }) {
  const [f, setF] = useState<Row>({ ChalDate: today(), d1: [], d2: [] });
  const [stock, setStock] = useState<Row[]>([]);
  const [meta, setMeta] = useState<Meta>({ prpType: '', strDesc: '', storeName: '' });
  const [busy, setBusy] = useState<Busy>({});
  const [problem, setProblem] = useState<Problems>({});
  const fRef = useRef(f);
  fRef.current = f;
  const seq = useRef({ load: 0, party: 0, stock: 0 });

  const flag = (k: keyof Busy, v: boolean) => setBusy((b) => ({ ...b, [k]: v }));
  const fail = (k: keyof Problems, msg?: string) => setProblem((p) => ({ ...p, [k]: msg }));
  const ready = !opts.skip && !!(ctx.prpcode && ctx.yearno && ctx.strcode);

  /* ------------------------------ load ------------------------------ */

  const lastKey = useRef('');
  const load = useCallback(async () => {
    if (!ready) return;
    const key = `${mode}|${uid ?? ''}|${ctx.prpcode}|${ctx.yearno}|${ctx.strcode}`;
    if (key !== lastKey.current) {
      // Another entry / mode: start clean (web reloaded the page here).
      lastKey.current = key;
      setF({ ChalDate: today(), d1: [], d2: [] }); setStock([]); setProblem({});
    }
    const id = ++seq.current.load;
    flag('load', true); fail('load');
    try {
      const [r, prpType, store] = await Promise.all([
        A.showPackSlip(api, ctx, uid, mode),
        A.fetchPropertyType(api, ctx.prpcode).catch(() => ''),
        A.fetchStore(api, ctx).catch(() => undefined),
      ]);
      if (id !== seq.current.load) return;
      if (store === null) throw new Error('Store is not assigned to you. Kindly contact the administrator.');
      setMeta({ prpType, strDesc: String(store?.SDesc ?? ''), storeName: String(store?.StrName ?? store?.SName ?? store?.StrDesc ?? '') });
      setF((prev) => ({
        ...r.main,
        Status: 'P',
        PrpCode: ctx.prpcode, YearNo: ctx.yearno, StrCode: ctx.strcode,
        ...r.crlimit,
        d1: r.d1, d2: r.d2, d1delete: [], lockarray: r.lock,
        // add: today's date like the web (FormState.values wins); others: the saved date
        ChalDate: mode === 'add' ? prev.ChalDate || today() : r.main.ChalDate || prev.ChalDate,
        ProdTtype: splitTypes(r.main.ProdTtype),
      }));
      setStock(mode === 'add' ? [] : r.stock);
    } catch (e) {
      if (id === seq.current.load) fail('load', A.apiErrorText(e, 'Packing slip could not be loaded.'));
    } finally {
      if (id === seq.current.load) flag('load', false);
    }
  }, [api, ctx, uid, mode, ready]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  const set = useCallback((k: string, v: any) => setF((x) => ({ ...x, [k]: v })), []);

  /** checkvoucherno — on date / suffix change (web onBlur). */
  const checkVoucher = useCallback(async (p: { date?: string; suffix?: string }) => {
    const x = fRef.current;
    flag('voucher', true); fail('voucher');
    try {
      const r = await A.checkVoucherNo(api, ctx, {
        vouno: str(x.ChalNo), suffix: p.suffix ?? str(x.suffix), month: str(x.month), uid: str(x.UId), date: p.date ?? str(x.ChalDate),
      });
      setF((y) => ({ ...y, ChalNo: r.ChalNo ?? y.ChalNo, suffix: r.suffix ?? y.suffix, month: r.month ?? y.month }));
      if (!r.ok) fail('voucher', r.message || 'Packing number is not valid.');
    } catch (e) {
      fail('voucher', A.apiErrorText(e, 'Packing number could not be checked.'));
    } finally {
      flag('voucher', false);
    }
  }, [api, ctx]);

  /* ------------------------------ party (AllPartyDataSCPS) ------------------------------ */

  // Keep the full help list within this form and context only. The active request is
  // shared by concurrent picker loads, so typing never starts another HTTP request.
  // The property/store, session and party visibility scope are part of the cache key.
  const partyListCache = useRef<{
    key: string;
    promise: Promise<ReturnType<typeof indexPartyRows>>;
  } | null>(null);

  /** Return locally filtered parties; page 0 exposes the complete cached list. */
  const searchParties = useCallback(async (search: string, page = 1) => {
    const cacheKey = JSON.stringify([
      api.API, api.token, ctx.prpcode, ctx.yearno, ctx.strcode,
      opts.scope?.isceo ?? '', opts.scope?.partype ?? '',
    ]);

    if (!partyListCache.current || partyListCache.current.key !== cacheKey) {
      // accountbasic currently returns the complete accessible party list when
      // limit is blank. Preserve the original server-side visibility filters.
      const entry = {
        key: cacheKey,
        promise: A.searchParties(api, ctx, {
          search: '', page: 1, limit: '', scope: opts.scope,
        }).then(indexPartyRows),
      };
      partyListCache.current = entry;
      // A failed initial load must be retried next time the picker is opened.
      entry.promise.catch(() => {
        if (partyListCache.current === entry) partyListCache.current = null;
      });
    }

    const all = await partyListCache.current.promise;
    const matches = filterPartyRows(all, search);
    // Page 0 is the dedicated Party modal's full local dataset (not an API page).
    // The API itself is still requested only once for this form/context.
    if (page === 0) return { rows: matches.map((entry) => entry.row), more: false };
    const pageNumber = Math.max(1, Math.floor(Number(page) || 1));
    const offset = (pageNumber - 1) * A.PARTY_PAGE;
    const rows = matches.slice(offset, offset + A.PARTY_PAGE).map((entry) => entry.row);
    return { rows, more: offset + A.PARTY_PAGE < matches.length };
  }, [api, ctx, opts.scope]);

  /**
   * Pick a party: accountget → fill the form → GSTIN must be there → getlimit.
   * A different party clears the order lines, stock and cartons (web: d1 = d2 = [], setD2Data([])).
   * Resolves true when the party is set.
   */
  const chooseParty = useCallback(async (acccode: string): Promise<boolean> => {
    const id = ++seq.current.party;
    flag('party', true); fail('party');
    try {
      const r = await A.fetchPartyDetail(api, ctx, acccode);
      if (id !== seq.current.party) return false;
      if (!r) throw new Error('Party not found.');
      if (blank(r.GSTIN)) {
        setF((x) => ({ ...x, ...PARTY_CLEAR }));
        fail('party', `${r.accname || 'This party'} has no GSTIN in the master. Party GSTIN cannot be blank.`);
        return false;
      }
      const changed = String(fRef.current.ParCode ?? '') !== String(r.acccode);
      setF((x) => ({ ...x, ...partyFields(r), ...(changed ? { d1: [], d2: [] } : {}) }));
      if (changed) setStock([]);
      A.fetchPartyLimit(api, ctx, String(r.acccode))
        .then((lim) => { if (id === seq.current.party) setF((x) => ({ ...x, ...lim })); })
        .catch(() => { /* web ignores a failed limit too */ });
      return true;
    } catch (e) {
      if (id === seq.current.party) fail('party', A.apiErrorText(e, 'Party could not be loaded.'));
      return false;
    } finally {
      if (id === seq.current.party) flag('party', false);
    }
  }, [api, ctx]);

  const clearParty = useCallback(() => {
    seq.current.party++;
    fail('party');
    setF((x) => ({ ...x, ...PARTY_CLEAR, d1: [], d2: [] }));
    setStock([]);
  }, []);

  /* ------------------------------ orders ------------------------------ */

  const loadPendingOrders = useCallback((linked: boolean) => {
    const x = fRef.current;
    return A.fetchPendingOrders(api, ctx, { parcode: str(x.ParCode), chaldate: str(x.ChalDate), linked, d1: x.d1 || [] });
  }, [api, ctx]);

  const addOrders = useCallback((rows: Row[]) => {
    setF((x) => {
      const have = new Set((x.d1 || []).map(d1Key));
      let sr = maxSr(x.d1, 'SrNo') + 1;
      const add = rows.map((d) => orderToD1(d, sr++, x.UId, !opts.assignRight)).filter((r) => !have.has(d1Key(r)));
      const last = add[add.length - 1] || {};
      return {
        ...x,
        BAccCode: last.BAccCode ?? x.BAccCode, BAccName: last.BAccName ?? x.BAccName, BADDRESS: last.BADDRESS ?? x.BADDRESS,
        DAdd: last.DAdd ?? x.DAdd, DCity: last.DCity ?? x.DCity, DCnty: last.DCnty ?? x.DCnty, DState: last.DState ?? x.DState,
        DZip: last.DZip ?? x.DZip, QtyKgs: last.IsDlvStatus ?? x.QtyKgs, DueDay: last.DueDay ?? x.DueDay, DueDate: last.DueDate ?? x.DueDate,
        SrNo: maxSr(x.d1, 'SrNo') + 1,
        d1: [...(x.d1 || []), ...add],
      };
    });
    setStock([]); // stock belongs to the old order list
  }, [opts.assignRight]);

  const removeOrder = useCallback((srNo: any) => {
    setF((x) => ({ ...x, d1: (x.d1 || []).filter((r: Row) => r.SrNo !== srNo) }));
    setStock([]);
  }, []);

  const loadProdTypes = useCallback(() => A.fetchProdTypes(api, ctx), [api, ctx]);

  /* ------------------------------ stock ------------------------------ */

  const getStock = useCallback(async (): Promise<boolean> => {
    const x = fRef.current;
    if (blank(x.ParCode)) { fail('stock', 'Choose the party first.'); return false; }
    if (!(x.d1 || []).length) { fail('stock', 'Add at least one pending order first.'); return false; }
    const id = ++seq.current.stock;
    flag('stock', true); fail('stock');
    try {
      const rows = await A.fetchCurrentStock(api, ctx, { d1: x.d1, prodtypes: splitTypes(x.ProdTtype), chees: str(x.chees) });
      if (id !== seq.current.stock) return false;
      setStock(rows);
      if (!rows.length) { fail('stock', 'No stock for these orders with this production type / chees.'); return false; }
      return true;
    } catch (e) {
      if (id === seq.current.stock) fail('stock', A.apiErrorText(e, 'Stock could not be loaded.'));
      return false;
    } finally {
      if (id === seq.current.stock) flag('stock', false);
    }
  }, [api, ctx]);

  /** Returns the reason (value not kept) or '' (value kept). */
  const setAssign = useCallback((index: number, value: string): string => {
    const issue = assignQtyIssue(stock[index] || {}, value);
    if (!issue) setStock((s) => s.map((r, i) => (i === index ? { ...r, AssQty: value.replace(',', '.') } : r)));
    return issue;
  }, [stock]);

  /** Several lots at once (Auto-fill / Clear). Values are already valid. */
  const setAssignMany = useCallback((changes: Record<number, string>) => {
    setStock((s) => s.map((r, i) => (i in changes ? { ...r, AssQty: changes[i] } : r)));
  }, []);

  /* ------------------------------ cartons ------------------------------ */

  /** All cartons in stock for the line (web carton help), on the packing date, with this line's cartons as selected. */
  const loadCartons = useCallback((row: Row) => {
    const x = fRef.current;
    const selected = (x.d2 || []).filter((c: Row) => String(c.SrNo) === String(row.SrNo));
    return A.fetchCartons(api, ctx, row, { date: str(x.ChalDate), selected });
  }, [api, ctx]);

  const applyCartons = useCallback((srNo: any, cartons: Row[]) => {
    setF((x) => ({
      ...x,
      d2: [...(x.d2 || []).filter((c: Row) => !blank(c.SrNo) && !blank(c.SubSr) && String(c.SrNo) !== String(srNo)), ...cartons],
    }));
  }, []);

  /* ------------------------------ save · delete ------------------------------ */

  const saving = useRef(false);
  const save = useCallback(async (): Promise<string | null> => {
    if (saving.current) return null;
    const x = fRef.current;
    const issue = saveIssue(x, stock);
    if (issue) { fail('save', issue); return null; }
    saving.current = true;
    flag('save', true); fail('save');
    try {
      const article = {
        ...x,
        editedd1: stock.filter((r) => n3(r.AssQty) > 0),
        txntype: A.TXNTYPE,
        ...(mode === 'scan' ? {} : { action: mode }),
      };
      const id = await A.saveSlip(api, article, mode === 'scan');
      return id || str(x.UId);
    } catch (e) {
      fail('save', A.apiErrorText(e, 'Packing slip could not be saved.'));
      return null;
    } finally {
      saving.current = false;
      flag('save', false);
    }
  }, [api, stock, mode]);

  const remove = useCallback(async (): Promise<boolean> => {
    flag('remove', true); fail('save');
    try {
      await A.deleteSlip(api, ctx, str(fRef.current.UId));
      return true;
    } catch (e) {
      fail('save', A.apiErrorText(e, 'Packing slip could not be deleted.'));
      return false;
    } finally {
      flag('remove', false);
    }
  }, [api, ctx]);

  const totals = {
    assigned: sum(stock, 'AssQty'),
    lines: stock.filter((r) => n3(r.AssQty) > 0).length,
    cartons: (f.d2 || []).length,
    cartonQty: sum(f.d2, 'QtyWt'),
    cartonTarget: stock.reduce((s, r) => s + (parseInt(r.TotCarton, 10) || 0), 0),
  };

  return {
    f, stock, meta, busy, problem, totals, ready,
    actions: {
      reload: load, set, checkVoucher, clearProblem: (k: keyof Problems) => fail(k),
      searchParties, chooseParty, clearParty,
      loadPendingOrders, addOrders, removeOrder, loadProdTypes,
      getStock, setAssign, setAssignMany, loadCartons, applyCartons, save, remove,
    },
  };
}

const str = (v: any) => (v === null || v === undefined ? '' : String(v).trim());
