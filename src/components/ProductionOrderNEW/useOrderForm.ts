import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
// FILE: src/components/ProductionOrderNEW/useOrderForm.ts
// All state of the Production Order entry (add / edit / view). Port of
// SudamoProductionOrderDetailNew.js (web) + the job-work split.
import {
  Api,
  Ctx,
  apiErrorText as errorMessage,
  fetchCostingDetail, fetchCostings, fetchDesignDetail, fetchGroups, fetchLegacyCosting, fetchParties,
  mapLegacyCosting, prepareVoucher, saveOrder, showOrder
} from './api';
import { buildEngine, computeBreakup, Engine, matchesSnap, Rates, ratesEdited, ratesFromSnapshot, savedBreakup, snapshotDerived, snapshotRates } from './costEngine';
import { firstValue, Row, rowKey, todayDMY } from './format';
import { authorizationReason, computePlan, sourcingFromRows, validatePlan } from './plan';

// import { buildEngine, computeBreakup, Engine, matchesSnap, Rates } from './costEngine';
import { confirmAsync, notifyAsync } from './ui';

const mergeParties = (existing: Row[], rows: Row[]): Row[] => {
  const map: Record<string, Row> = {};
  existing.concat(rows).forEach((it: Row) => {
    const code = String(it.parcode || '');
    if (code) map[code] = { parcode: code, parname: it.parname || it.partyname || code };
  });
  return Object.values(map).sort((a, b) => String(a.parname).localeCompare(String(b.parname)));
};

let idSeq = 0;
const newId = () => `j${Date.now()}${idSeq++}`;

export default function useOrderForm({ api, ctx, mode, uid }: { api: Api; ctx: Ctx; mode: string; uid: any }) {
  const routeMode = String(mode || 'view').toLowerCase();
  const recordUid = routeMode === 'add' ? 0 : Number(uid || 0);
  const isAdd = routeMode === 'add';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [callError, setCallError] = useState('');
  const [lock, setLock] = useState<Row>({ read_only: routeMode === 'view', code: '', reason: '' });
  const [main, setMain] = useState<Row>({});
  const [sourceMode, setSourceMode] = useState('sales');
  const [selfFabricType, setSelfFabricType] = useState('Finish');
  const [stockType, setStockType] = useState('I');
  const [storeCode, setStoreCode] = useState('012');
  const [selectedGroupKey, setSelectedGroupKey] = useState('');
  const [selectedGroupSnapshot, setSelectedGroupSnapshot] = useState<Row | null>(null);
  const [selectedOrders, setSelectedOrders] = useState<Row[]>([]);
  const [selfDesign, setSelfDesign] = useState<Row>({});
  const [baseQtyInput, setBaseQtyInput] = useState('');
  const [selfGreigeQtyInput, setSelfGreigeQtyInput] = useState('');
  const [selfFinishedCost, setSelfFinishedCost] = useState('');
  const [selfGreigeCost, setSelfGreigeCost] = useState('');
  // Keep selling rate independent for each Stock & sell fabric tab.
  const [selfFinishedSellingRate, setSelfFinishedSellingRate] = useState('');
  const [selfGreigeSellingRate, setSelfGreigeSellingRate] = useState('');
  const [salesSellingRate, setSalesSellingRate] = useState('');
  const [shrinkage, setShrinkage] = useState('0');
  const [greigeRate, setGreigeRate] = useState('0');
  // Sourcing (review step): in-house + job workers + greige purchase, all greige metres.
  const [jobList, setJobList] = useState<Row[]>([]);
  const [purchaseList, setPurchaseList] = useState<Row[]>([]);
  const [inhouseQtyInput, setInhouseQtyInput] = useState('');
  const [inhouseTouched, setInhouseTouched] = useState(false);
  const [inhouseRate, setInhouseRate] = useState('');
  // Live cost engine (NEW design costing): /api/costing/{id} + /api/designs/{md_id}
  const [engine, setEngine] = useState<Engine | null>(null);
  const [rates, setRates] = useState<Rates | null>(null);
  const [engineLoading, setEngineLoading] = useState(false);
  const [engineNote, setEngineNote] = useState('');
  const [voucher, setVoucher] = useState({ vouno: '', suffix: '', month: '' });
  const [groups, setGroups] = useState<Row[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [poOwners, setPoOwners] = useState<Row[]>([]);
  const [poOwnerCode, setPoOwnerCode] = useState('');
  const [ownerLoading, setOwnerLoading] = useState(false);
  const [savedOwner, setSavedOwner] = useState<{ code: string; name: string }>({ code: '', name: '' });
  const [stockMeters, setStockMeters] = useState('0');
  const [stockMetersTouched, setStockMetersTouched] = useState(false);
  const [voucherLoading, setVoucherLoading] = useState(false);
  const [reviewStep, setReviewStep] = useState(false);
  // costing
  const [costingLoading, setCostingLoading] = useState(false);
  const [costingError, setCostingError] = useState('');
  const [legacyCostingData, setLegacyCostingData] = useState<Row | null>(null);
  const [costingResult, setCostingResult] = useState<Row | null>(null);
  const [legacyCostChoice, setLegacyCostChoice] = useState<Row | null>(null);
  const [newCostChoice, setNewCostChoice] = useState<Row | null>(null);
  const [resolvedCostingMeta, setResolvedCostingMeta] = useState<Row>({});
  const [savedPoCostSnapshot, setSavedPoCostSnapshot] = useState<Row | null>(null);
  const [costOptions, setCostOptions] = useState<Row[]>([]);
  const [costNeedsMapping, setCostNeedsMapping] = useState(false);
  const [costDesignOptions, setCostDesignOptions] = useState<Row[]>([]);

  const readOnly = routeMode === 'view' || Boolean(lock.read_only);
  const isEdit = routeMode === 'edit' && !readOnly;

  // ---------- owners ----------
  const loadOwners = useCallback(async () => {
    setOwnerLoading(true);
    try { const list = await fetchParties(api, ctx, 'owner', ''); setPoOwners(cur => mergeParties(cur, list)); }
    catch (e) { /* server validates on save */ }
    finally { setOwnerLoading(false); }
  }, []);
  useEffect(() => { loadOwners(); }, [loadOwners]);

  useEffect(() => {
    const fromOrders = selectedOrders.map((r: Row) => ({
      parcode: String(firstValue(r.sexecode, r.SExe, r.sexe, '') || '').trim(),
      parname: String(firstValue(r.sexename, r.SExeName, r.sexecode, '') || '').trim()
    })).filter(x => x.parcode);
    if (fromOrders.length) setPoOwners(cur => mergeParties(cur, fromOrders));
  }, [selectedOrders]);

  // Default PO owner = the single SO executive (web behaviour).
  useEffect(() => {
    if (sourceMode !== 'sales' || selectedOrders.length === 0 || readOnly) return;
    const codes = [...new Set(selectedOrders.map((r: Row) => String(firstValue(r.sexecode, r.SExe, r.sexe, '') || '').trim()).filter(Boolean))];
    if (codes.length === 1 && String(poOwnerCode || '') !== codes[0]) setPoOwnerCode(codes[0]);
  }, [sourceMode, selectedOrders]); // eslint-disable-line react-hooks/exhaustive-deps

  // Edit / view: if the saved order only carries the owner's NAME, pick the
  // matching owner from the list once it has loaded.
  useEffect(() => {
    if (isAdd || poOwnerCode || savedOwner.code || !savedOwner.name || poOwners.length === 0) return;
    const want = savedOwner.name.toUpperCase();
    const hit = poOwners.find((o: Row) => String(o.parname || '').trim().toUpperCase() === want);
    if (hit) setPoOwnerCode(String(hit.parcode));
  }, [isAdd, poOwnerCode, savedOwner, poOwners]);

  // ---------- record ----------
  const loadRecord = useCallback(async () => {
    setLoading(true); setCallError('');
    try {
      const data = await showOrder(api, ctx, recordUid, routeMode, storeCode);
      const m = (data.main && data.main[0]) || {};
      // Greige store from the server (get_grey_str). Never fall back to the login store (e.g. 002).
      const store = String(m.greystrcode || '012');
      const meta = data.webmeta || {};
      const poSnapshot = data.po_costing_snapshot && typeof data.po_costing_snapshot === 'object'
        ? data.po_costing_snapshot
        : (data.stock_costing_snapshot && typeof data.stock_costing_snapshot === 'object'
          ? data.stock_costing_snapshot : null);
      setSavedPoCostSnapshot(poSnapshot);
      const src = data.source_mode || (poSnapshot && poSnapshot.source_mode)
        || (Number(m.prodtype || 0) === 1 ? 'sales' : 'self');
      const fab = data.fabric_type || meta.fabric_type || 'Finish';
      const orders = (data.d1 || []).map((row: Row) => ({
        ...row,
        sotype: firstValue(row.sotype, row.SOType, 'SO'),
        souid: firstValue(row.souid, row.SOUId, row.SOUID),
        sosrno: String(firstValue(row.sosrno, row.SOSrNo, row.srno, row.SrNo, '')).trim(),
        sono: firstValue(row.sono, row.SONo, row.jono, row.JONo),
        parcode: firstValue(row.parcode, row.ParCode), parname: firstValue(row.parname, row.ParName, row.partyname),
        itmcode: firstValue(row.itmcode, row.ItmCode), grdcode: firstValue(row.grdcode, row.GrdCode),
        shdcode: firstValue(row.shdcode, row.ShdCode), shdname: firstValue(row.shdname, row.ShdName),
        fabric_type: firstValue(row.fabric_type, row.FabricType, data.fabric_type, ''),
        dsncode: firstValue(row.dsncode, row.DsnCode), dsnname: firstValue(row.dsnname, row.DsnName),
        sexecode: firstValue(row.sexecode, m.sexe, meta.group_exec), sexename: firstValue(row.sexename, m.sexename),
        qty: Number(firstValue(row.soqty, row.SOQty, row.qty, 0) || 0),
        rate: Number(firstValue(row.sorate, row.SORate, row.rate, 0) || 0)
      }));
      setMain(m); setStoreCode(store);
      setLock(data.lock || { read_only: routeMode === 'view', code: '', reason: '' });
      setSourceMode(src); setSelfFabricType(fab); setSelectedOrders(orders);
      setStockType(String(firstValue(data.order_source, meta.order_source, m.stktype, '')).toUpperCase() === 'P'
        || orders.some((r: Row) => String(r.sotype).toUpperCase() === 'POYJO') ? 'P' : 'I');
      setSelectedGroupKey(orders.length > 0
        ? `${orders[0].dsncode || ''}${Number(orders[0].group_shdcode || 0) > 0 ? `-shd-${orders[0].group_shdcode}` : ''}-fabric-${orders[0].fabric_type || fab}`
        : '');
      setSelfDesign({
        dsncode: m.dsncode, dsnname: m.dsnname, itmcode: m.itmcode, itmname: m.itmname, grdcode: m.grdcode,
        shdcode: m.shdcode, shdname: m.shdname, md_id: m.md_id || '',
        design_costing_source: (poSnapshot && poSnapshot.costing_source) || m.design_costing_source || 'LEGACY',
        design_costing_id: (poSnapshot && poSnapshot.design_costing_id) || m.design_costing_id || '',
        legacy_costuid: (poSnapshot && poSnapshot.costuid) || m.costuid || 0
      });
      setBaseQtyInput(String(meta.base_qty || m.orderqty || ''));
      if (src === 'self') setSelfGreigeQtyInput(String(m.totqty || ''));
      setShrinkage(String(m.shkperc || 0)); setGreigeRate(String(m.greyrate || 0));
      const savedSellingRate = firstValue(m.sellingrate, m.selling_rate, data.sellingrate, data.selling_rate, meta.sellingrate, meta.selling_rate, '');
      setSalesSellingRate(src === 'sales' ? String(savedSellingRate ?? '') : '');
      // The API stores the active tab's rate in sellingrate; restore it only to that tab.
      setSelfFinishedSellingRate(fab === 'Finish' ? String(savedSellingRate ?? '') : '');
      setSelfGreigeSellingRate(fab === 'Greige' ? String(savedSellingRate ?? '') : '');
      const sm = Number(meta.stock_meters || 0);
      if (sm > 0) { setStockMeters(String(sm)); setStockMetersTouched(true); }
      const sourcing = sourcingFromRows(data.d12 || [], data.d13 || []);
      setJobList(sourcing.jobList); setPurchaseList(sourcing.purchaseList);
      setVoucher({ vouno: m.vouno || '', suffix: m.suffix || '', month: m.month || '' });
      // Saved PO owner. Stock & sell orders have no SO lines, so the owner must
      // come from the header / web meta — check every key the server may use.
      const snap = data.commercial_snapshot || meta.commercial_snapshot || {};
      const rawOwnerCode = String(firstValue(
        meta.po_owner_code, data.po_owner_code, m.po_owner_code, snap.po_owner_code,
        m.sexe, m.SExe, m.sexecode, m.SExeCode, meta.group_exec, orders[0] && orders[0].sexecode, ''
      ) || '').trim();
      const ownerCode = rawOwnerCode === '0' ? '' : rawOwnerCode;
      const ownerName = String(firstValue(meta.po_owner_name, data.po_owner_name, m.sexename, m.SExeName, orders[0] && orders[0].sexename, '') || '').trim();
      setSavedOwner({ code: ownerCode, name: ownerName });
      setPoOwnerCode(ownerCode);
      if (ownerCode) setPoOwners(cur => mergeParties(cur, [{ parcode: ownerCode, parname: ownerName || ownerCode }]));
      if (routeMode === 'add') {
        setVoucherLoading(true);
        try { setVoucher(await prepareVoucher(api, ctx, m, store, todayDMY())); }
        catch (e) { setCallError(errorMessage(e, 'Voucher number could not be prepared.')); }
        finally { setVoucherLoading(false); }
      }
    } catch (e) { setCallError(errorMessage(e, 'Production Order could not be loaded.')); }
    finally { setLoading(false); }
  }, [recordUid, routeMode]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { loadRecord(); }, [loadRecord]);

  // ---------- design groups (search + paging) ----------
  const [groupQuery, setGroupQuery] = useState({ search: '', page: 1 });
  const [groupPagination, setGroupPagination] = useState<Row>({ page: 1, last_page: 1, total: 0 });
  const reqSeq = useRef(0);
  useEffect(() => {
    if (sourceMode !== 'sales' || readOnly || loading || !storeCode) return;
    const id = ++reqSeq.current;
    setGroupsLoading(true);
    fetchGroups(api, ctx, { strcode: storeCode, uid: recordUid, page: groupQuery.page, perPage: 25, search: groupQuery.search, orderSource: stockType })
      .then(r => { if (id === reqSeq.current) { setGroups(r.groups); setGroupPagination(r.pagination); } })
      .catch(e => { if (id === reqSeq.current) setCallError(errorMessage(e, 'Sales Order groups could not be loaded.')); })
      .finally(() => { if (id === reqSeq.current) setGroupsLoading(false); });
  }, [sourceMode, readOnly, loading, storeCode, recordUid, groupQuery, stockType]);

  // Refresh selected rows with the latest availability when the group reloads (edit mode).
  useEffect(() => {
    if (!selectedGroupKey || groups.length === 0 || selectedOrders.length === 0) return;
    const g = groups.find(x => x.key === selectedGroupKey);
    if (!g) return;
    const byKey: Record<string, Row> = {};
    g.orders.forEach((r: Row) => { byKey[rowKey(r)] = r; });
    setSelectedOrders(cur => cur.map(r => ({ ...r, ...(byKey[rowKey(r)] || {}), qty: r.qty })));
  }, [groups, selectedGroupKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectedGroup = groups.find(g => g.key === selectedGroupKey)
    || (selectedGroupSnapshot && selectedGroupSnapshot.key === selectedGroupKey ? selectedGroupSnapshot : null)
    || (selectedGroupKey && selectedOrders.length > 0 ? { ...selectedOrders[0], key: selectedGroupKey, orders: selectedOrders } : null);

  const clearCosting = () => {
    setLegacyCostChoice(null); setNewCostChoice(null); setResolvedCostingMeta({});
    setSavedPoCostSnapshot(null);
    setCostOptions([]); setLegacyCostingData(null); setCostingError('');
  };

  const chooseSource = (m: string) => {
    if (readOnly || isEdit || m === sourceMode) return;
    clearCosting();
    setSourceMode(m); setSelectedGroupKey(''); setSelectedOrders([]); setSelectedGroupSnapshot(null);
    setStockMeters('0'); setStockMetersTouched(false); resetSourcing(); setReviewStep(false);
  };
  const chooseStockType = (v: string) => {
    if (readOnly || v === stockType) return;
    clearCosting();
    setStockType(v); setSelectedGroupKey(''); setSelectedOrders([]); setGroups([]); setSelectedGroupSnapshot(null);
    setStockMeters('0'); setStockMetersTouched(false); resetSourcing(); setGroupQuery({ search: '', page: 1 });
  };
  const chooseGroup = async (g: Row) => {
    if (readOnly) return;
    // web chooseGroup: confirm before replacing the design group of a saved order
    if (isEdit && selectedGroupKey && selectedGroupKey !== g.key &&
      !(await confirmAsync('Change the Design group?', 'Existing selected Sales Orders will be replaced.', 'Change'))) return;
    if (selectedGroupKey !== g.key) clearCosting();
    setSelectedGroupSnapshot(g); setSelectedGroupKey(g.key); setReviewStep(false);
    setStockMeters('0'); setStockMetersTouched(false); setPoOwnerCode(''); resetSourcing();
    setSelectedOrders(isEdit
      ? g.orders.filter((r: Row) => Number(r.selected_qty || 0) > 0).map((r: Row) => ({ ...r, qty: Number(r.selected_qty || 0) }))
      : []);
  };
  const toggleOrder = (order: Row) => {
    if (readOnly) return;
    const key = rowKey(order);
    // web toggleOrder: the last selected Sales Order of the group cannot be unticked
    if (selectedOrders.length === 1 && selectedOrders.some(r => rowKey(r) === key)) {
      notifyAsync('Production Order', 'At least one Sales Order must remain selected in the group.');
      return;
    }
    setSelectedOrders(cur => {
      if (cur.some(r => rowKey(r) === key)) {
        return cur.filter(r => rowKey(r) !== key);
      }
      return cur.concat({ ...order, qty: Number(order.qty || 0) });
    });
  };
  const setOrderQty = (order: Row, text: string) => {
    const max = Number(order.available_qty || order.qty || 0);
    const key = rowKey(order);
    const v = Math.max(0, Math.min(max, Number(String(text).replace(/[^0-9.]/g, '') || 0)));
    setSelectedOrders(cur => cur.map(r => rowKey(r) === key ? { ...r, qty: v } : r));
  };

  // ---------- sourcing lines ----------
  function resetSourcing() { setJobList([]); setPurchaseList([]); setInhouseTouched(false); setInhouseQtyInput(''); }
  const addJob = () => setJobList((l) => l.concat({ id: newId(), parcode: '', parname: '', qty: '', pickRate: '', yarnFrom: 'OUR', tolPct: '10' }));
  const updateJob = (id: string, patch: Row) => setJobList((l) => l.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const removeJob = (id: string) => setJobList((l) => l.filter((r) => r.id !== id));
  const addPurchase = () => setPurchaseList((l) => l.concat({ id: newId(), parcode: '', parname: '', qty: '', rate: '', gstPct: '5' }));
  const updatePurchase = (id: string, patch: Row) => setPurchaseList((l) => l.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const removePurchase = (id: string) => setPurchaseList((l) => l.filter((r) => r.id !== id));
  const setInhouseQty = (v: string) => { setInhouseTouched(true); setInhouseQtyInput(v); };

  // ---------- costing (same resolution order as web) ----------
  const designForCosting = sourceMode === 'sales' ? (selectedOrders[0] || selectedGroup || {}) : selfDesign;
  const metaBaseForCosting = sourceMode === 'sales' ? (selectedGroup || selectedOrders[0] || {}) : selfDesign;
  useEffect(() => {
    let cancelled = false;
    setCostingResult(null); setLegacyCostingData(null); setCostingError('');
    if (!designForCosting.dsncode) { setCostingLoading(false); return undefined; }
    (async () => {
      setCostingLoading(true);
      try {
        const data = await fetchCostings(api, ctx, designForCosting.dsncode);
        const rows = data.costings || data.data || [];
        const src = String(data.design_costing_source || '').toUpperCase();
        if (cancelled) return;
        setResolvedCostingMeta({ design_costing_source: src || 'LEGACY', md_id: data.md_id || '', design_costing_count: Number(data.costing_count || rows.length || 0) });
        setCostNeedsMapping(Boolean(data.needs_mapping)); setCostDesignOptions(data.cost_designs || []); setCostOptions(rows);
        if (src === 'NEW') {
          const savedNewId = String(
            savedPoCostSnapshot && String(savedPoCostSnapshot.costing_source || '').toUpperCase() === 'NEW'
              ? (savedPoCostSnapshot.design_costing_id || '') : ''
          ).trim();
          const wanted = String((newCostChoice && newCostChoice.costing_id) || savedNewId
            || metaBaseForCosting.design_costing_id || main.design_costing_id || '').trim();
          const chosen = rows.find((r: Row) => String(r.costing_id || r.costuid) === wanted) || rows[0] || null;
          if (!chosen) throw new Error('No saved costing revision found for this design.');
          setNewCostChoice(chosen);
          setCostingResult({
            snap_greige_price: Number(firstValue(chosen.greige_price, chosen.Total, chosen.FabCost, 0)),
            snap_finished_price: Number(firstValue(chosen.finished_price, chosen.FinishedCost, chosen.final_cost, chosen.FinTotAmt, 0)),
            snap_final_cost: Number(firstValue(chosen.final_cost, chosen.FinTotAmt, chosen.finished_price, chosen.FinishedCost, 0)),
            gf_shrink: Number(firstValue(chosen.gf_shrink, chosen.ShrinkPer, chosen.shkperc, 0))
          });
          return;
        }
        const savedLegacyUid = Number(
          savedPoCostSnapshot && String(savedPoCostSnapshot.costing_source || '').toUpperCase() === 'LEGACY'
            ? (savedPoCostSnapshot.costuid || 0) : 0
        );
        const legacyUid = Number((legacyCostChoice && legacyCostChoice.costuid) || savedLegacyUid || metaBaseForCosting.legacy_costuid ||
          metaBaseForCosting.LegacyCostUId || main.costuid || main.CostUId || 0);
        if (!(legacyUid > 0)) {
          setCostingError(data.needs_mapping ? 'Link this ERP design to its matching legacy costing design once.' : 'Choose a costing sheet to preview costing.');
          return;
        }
        const legacy = await fetchLegacyCosting(api, ctx, legacyUid);
        if (!cancelled) setLegacyCostingData(legacy);
      } catch (e) { if (!cancelled) setCostingError(errorMessage(e, 'Unable to load costing.')); }
      finally { if (!cancelled) setCostingLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [designForCosting.dsncode, metaBaseForCosting.legacy_costuid, main.costuid, main.design_costing_id,
    savedPoCostSnapshot && savedPoCostSnapshot.costing_source,
    savedPoCostSnapshot && savedPoCostSnapshot.design_costing_id,
    savedPoCostSnapshot && savedPoCostSnapshot.costuid,
    legacyCostChoice, newCostChoice && newCostChoice.costing_id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load the selected NEW costing sheet in full so rates can be verified / edited.
  const engineCostingId = String((newCostChoice && (newCostChoice.costing_id || newCostChoice.costuid)) || '');
  const engineMdId = String(resolvedCostingMeta.md_id || metaBaseForCosting.md_id || '');
  useEffect(() => {
    setEngine(null); setRates(null); setEngineNote('');
    if (!engineCostingId || String(resolvedCostingMeta.design_costing_source || '').toUpperCase() !== 'NEW') return undefined;
    let cancelled = false;
    setEngineLoading(true);
    (async () => {
      try {
        const [detail, design] = await Promise.all([
          fetchCostingDetail(api, engineCostingId),
          engineMdId ? fetchDesignDetail(api, engineMdId).catch(() => null) : Promise.resolve(null),
        ]);
        if (cancelled) return;
        const e = buildEngine(detail, design);
        if (!e.yarns.length) { setEngineNote('This costing sheet has no yarn lines — showing its saved totals.'); return; }
        if (!matchesSnap(e)) setEngineNote('Saved costing revision is displayed unchanged. Editing a rate will calculate a new estimate.');
        const savedMatches = !!savedPoCostSnapshot
          && String(savedPoCostSnapshot.costing_source || '').toUpperCase() === 'NEW'
          && String(savedPoCostSnapshot.design_costing_id || '') === engineCostingId;
        setEngine(e);
        setRates(savedMatches ? ratesFromSnapshot(e, savedPoCostSnapshot.rates || {}) : e.initial);
        if (savedMatches && Number(savedPoCostSnapshot.is_frozen || 0) === 1) {
          setEngineNote('Frozen PO costing snapshot loaded. Design Costing remains unchanged.');
        } else if (savedMatches && Number((savedPoCostSnapshot.rates || {}).is_override || 0) === 1) {
          setEngineNote('PO-specific costing override restored. Design Costing remains unchanged.');
        }
      } catch (err) {
        if (!cancelled) setEngineNote(errorMessage(err, 'Costing detail could not be loaded — showing saved totals.'));
      } finally { if (!cancelled) setEngineLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [engineCostingId, engineMdId, resolvedCostingMeta.design_costing_source,
    savedPoCostSnapshot && savedPoCostSnapshot.costing_source,
    savedPoCostSnapshot && savedPoCostSnapshot.design_costing_id]); // eslint-disable-line react-hooks/exhaustive-deps
  const breakup = useMemo(() => (engine && rates ? (ratesEdited(engine, rates) ? computeBreakup(engine, rates) : savedBreakup(engine)) : null), [engine, rates]);
  // The saved revision is authoritative; only actual rate edits recalculate.
  const effectiveCostingResult = breakup ? {
    ...(costingResult || {}),
    snap_greige_price: breakup.greigePrice,
    snap_finished_price: breakup.finishedPrice,
    snap_final_cost: breakup.finishedPrice || breakup.greigePrice,
    gf_shrink: engine ? engine.gfPct : 0,
  } : costingResult;

  const searchCostSheets = useCallback(async (search: string) => {
    const data = await fetchCostings(api, ctx, designForCosting.dsncode, search);
    setCostNeedsMapping(Boolean(data.needs_mapping));
    setCostDesignOptions(data.cost_designs || []);
    const rows = data.costings || data.data || [];
    setCostOptions(rows);
    return data.needs_mapping ? (data.cost_designs || []).map((d: Row) => ({ ...d, __mapping: true })) : rows;
  }, [designForCosting.dsncode]);

  const chooseCosting = (row: Row) => {
    if (row.__mapping) return;
    const source = String(row.design_costing_source || '').toUpperCase();
    const chosenId = source === 'NEW' ? String(row.costing_id || row.costuid || '') : String(row.costuid || '');
    const savedId = savedPoCostSnapshot
      ? (String(savedPoCostSnapshot.costing_source || '').toUpperCase() === 'NEW'
        ? String(savedPoCostSnapshot.design_costing_id || '')
        : String(savedPoCostSnapshot.costuid || ''))
      : '';
    if (!savedPoCostSnapshot || source !== String(savedPoCostSnapshot.costing_source || '').toUpperCase() || chosenId !== savedId) {
      setSavedPoCostSnapshot(null);
    }
    if (source === 'NEW') { setNewCostChoice(row); setLegacyCostChoice(null); }
    else { setLegacyCostChoice(row); setNewCostChoice(null); }
    setCostingError('');
  };
  const linkCostDesign = async (row: Row) => {
    await mapLegacyCosting(api, ctx, designForCosting.dsncode, row.legacy_prpcode, row.legacy_dsncode);
    setCostNeedsMapping(false);
    setLegacyCostChoice(null); // re-triggers costing resolution
  };

  // ---------- derived ----------
  const state: Row = {
    sourceMode, selfFabricType, stockType, selectedOrders, selectedGroup, selfDesign, baseQtyInput,
    selfGreigeQtyInput, shrinkage, stockMeters, stockMetersTouched, legacyCostingData, legacyCostChoice,
    newCostChoice, costingResult: effectiveCostingResult, resolvedCostingMeta, savedPoCostSnapshot,
    costingLoading: costingLoading || engineLoading, costingError, main,
    jobList, purchaseList, inhouseQtyInput, inhouseTouched, readOnly, lock, selfFinishedCost, selfGreigeCost, ownerLoading, poOwnerCode, isAdd, voucher, greigeRate
  };
  const plan = useMemo(() => computePlan(state), Object.values(state)); // eslint-disable-line react-hooks/exhaustive-deps
  const saveReason = validatePlan(state, plan);
  const authReason = authorizationReason(state, plan);
  const canSave = !saveReason && !authReason && !saving;

  const save = async () => {
    if (!canSave) throw new Error(saveReason || authReason || 'Production Order is not ready to save.');
    setSaving(true); setCallError('');
    const p = plan;
    const s = { prpcode: ctx.prpcode, yearno: ctx.yearno };
    const voudate = main.voudate || todayDMY();

    // Exact PO-specific costing basis. The selected Design Costing is the
    // master/prefill only; edits below never write back to Design Costing.
    let poCostingSnapshot: Row | null = null;
    if (p.isNewDesignCosting && newCostChoice) {
      const selectedCostingId = String(newCostChoice.costing_id || newCostChoice.costuid || '');
      const savedMatches = !!savedPoCostSnapshot
        && String(savedPoCostSnapshot.costing_source || '').toUpperCase() === 'NEW'
        && String(savedPoCostSnapshot.design_costing_id || '') === selectedCostingId;
      poCostingSnapshot = {
        source: 'NEW',
        design_costing_id: selectedCostingId,
        md_id: p.costingMdId,
        rates: engine && rates
          ? snapshotRates(engine, rates)
          : (savedMatches ? (savedPoCostSnapshot!.rates || {}) : {}),
        derived: breakup
          ? snapshotDerived(breakup)
          : (savedMatches ? (savedPoCostSnapshot!.derived || {}) : {
              greige_cost: Number(p.plannedGreigeCost || 0),
              finished_cost: Number(p.plannedFinishedCost || 0)
            })
      };
    } else if (!p.isNewDesignCosting && p.effectiveLegacyCostUid > 0) {
      const savedMatches = !!savedPoCostSnapshot
        && String(savedPoCostSnapshot.costing_source || '').toUpperCase() === 'LEGACY'
        && Number(savedPoCostSnapshot.costuid || 0) === Number(p.effectiveLegacyCostUid);
      poCostingSnapshot = {
        source: 'LEGACY',
        costuid: Number(p.effectiveLegacyCostUid),
        rates: savedMatches ? (savedPoCostSnapshot!.rates || {}) : {},
        derived: savedMatches ? (savedPoCostSnapshot!.derived || {}) : {
          greige_cost: Number(p.plannedGreigeCost || 0),
          finished_cost: Number(p.plannedFinishedCost || 0)
        }
      };
    }

    const payload: Row = {
      uid: recordUid, prpcode: s.prpcode, yearno: s.yearno, strcode: storeCode,
      source_mode: sourceMode, order_source: stockType, fabric_type: p.fabricType, selected_orders: selectedOrders,
      stock_meters: p.stockMetersQty, po_owner_code: poOwnerCode,
      design: selfDesign, base_qty: p.baseQty, shrinkage: Number(p.effectiveShrinkage || 0),
      recipe: p.recipeApplied ? {
        source: p.recipeSource,
        md_id: p.isNewDesignCosting ? p.costingMdId : (p.currentRecipeAvailable ? (p.recipeMeta.md_id || '') : ''),
        costuid: p.recipeSource === 'LEGACY_COSTING' ? p.effectiveLegacyCostUid : 0,
        shrinkage_basis: p.greigeSoRequirement ? 'WARP' : 'FINISH',
        applied_shrink_pct: p.appliedRecipeShrink, finish_shrink_pct: p.recipeFinishShrink,
        warp_shrink_pct: p.recipeWarpShrink !== null ? p.recipeWarpShrink : 0,
        weft_shrink_pct: p.currentRecipeAvailable ? Number(p.recipeMeta.recipe_weft_shrink || 0) : 0,
        warp_wastage_pct: p.currentRecipeAvailable ? Number(p.recipeMeta.recipe_warp_wastage || 0) : 0,
        weft_wastage_pct: p.currentRecipeAvailable ? Number(p.recipeMeta.recipe_weft_wastage || 0) : 0,
        finished_qty: p.finishRequirement ? p.baseQty : 0, so_greige_qty: !p.finishRequirement ? p.baseQty : 0,
        required_greige_qty: p.totalQty, effective_addition_pct: Number(p.effectiveShrinkage || 0)
      } : null,
      greige_rate: sourceMode === 'self' && !selfDesign.dsncode
        ? (p.fabricType === 'Greige' ? Number(selfGreigeCost || 0) : 0)
        : (p.plannedGreigeCost > 0 ? Number(p.plannedGreigeCost) : Number(greigeRate || 0)),
      finished_rate: sourceMode === 'self' && !selfDesign.dsncode && p.fabricType === 'Finish' ? Number(selfFinishedCost || 0) : undefined,
      manual_stock_sell: sourceMode === 'self' && !selfDesign.dsncode ? 1 : 0,
      manual_greige_qty: sourceMode === 'self' ? Number(p.selfArtifactGreigeQty || 0) : 0,
      selling_rate: sourceMode === 'sales' ? Number(salesSellingRate || p.weightedRate || 0) : Number((p.fabricType === 'Greige' ? selfGreigeSellingRate : selfFinishedSellingRate) || 0),
      sellingrate: sourceMode === 'sales' ? Number(salesSellingRate || p.weightedRate || 0)
        : Number((p.fabricType === 'Greige' ? selfGreigeSellingRate : selfFinishedSellingRate) || 0),
      // Sourcing. qty = greige metres (prodorderjob.Qty); rate fields are stored by the Laravel patch.
      job_rows: p.jobRows,
      purchase_rows: p.purchaseRows,
      picks: engine ? engine.ppiTable : undefined,
      voucher, voudate,
      expected_date: main.expdate || main.deliverydate || voudate,
      po_costing_snapshot: poCostingSnapshot,
      // Compatibility alias for older Laravel/RN builds.
      stock_costing_snapshot: sourceMode === 'self' ? poCostingSnapshot : null,
      commercial_snapshot: sourceMode === 'sales' ? {
        basis: 'GREIGE_METRE', booked_so_qty: p.bookedSoQty, planned_so_qty: p.plannedSoQty,
        finished_qty: p.finishRequirement ? p.baseQty : 0, required_greige_qty: p.totalQty,
        weighted_so_rate: p.weightedRate, weighted_greige_net_back: p.weightedGreigeNetBack,
        greige_cost: p.plannedGreigeCost, finished_cost: p.plannedFinishedCost,
        planned_margin_greige: p.greigeBasisMargin, planned_margin_pct: p.greigeBasisMarginPct,
        below_cost: p.greigeBelowCost ? 1 : 0, po_owner_code: poOwnerCode,
        job_work_qty: p.jobQty, purchase_qty: p.purchaseQty, in_house_qty: p.millQty,
        cost_rates: rates || null,
        inhouse_pick_rate: Number(inhouseRate || (rates ? rates.weavingRate : 0) || 0), picks: engine ? engine.ppiTable : 0,
        cost_breakup: breakup ? {
          yarn: breakup.yarnCost, dye: breakup.dyeCost, weaving: breakup.weavingCost, greige: breakup.greigeMfg,
          greige_price: breakup.greigePrice, shrink: breakup.shrinkImpact, proc: breakup.dyeingProc,
          fin_brok: breakup.finBrokAmt, cut_pack: breakup.cutPack, finished: breakup.finishedPrice,
        } : null,
        lines: p.saleLines.map((r: Row) => ({ sono: r.sono || r.jono || '', qty: Number(r.qty || 0), rate: Number(r.rate || 0), greige_eq: Number(r.greigeEq || 0), net_back: Number(r.netBack || 0), own_cost: Number(r.ownCost || 0), below_cost: r.ownMargin < 0 ? 1 : 0 }))
      } : null,
      design_costing_id: p.isNewDesignCosting ? String((newCostChoice && (newCostChoice.costing_id || newCostChoice.costuid)) || '') : '',
      costing: p.isNewDesignCosting && newCostChoice ? {
        costing_id: String(newCostChoice.costing_id || newCostChoice.costuid || ''),
        design_costing_id: String(newCostChoice.costing_id || newCostChoice.costuid || ''),
        md_id: p.costingMdId, design_costing_source: 'NEW'
      } : (!p.isNewDesignCosting && p.effectiveLegacyCostUid > 0 ? {
        costuid: p.effectiveLegacyCostUid,
        costdsncode: (legacyCostChoice && legacyCostChoice.costdsncode) || p.costMeta.legacy_costdsncode || p.legacyMain.DsnCode || p.legacyMain.dsncode || 0,
        costdsnname: (legacyCostChoice && legacyCostChoice.costdsnname) || p.costMeta.legacy_costdsnname || '',
        costdate: (legacyCostChoice && legacyCostChoice.costdate) || '',
        sampleno: (legacyCostChoice && legacyCostChoice.sampleno) || p.legacyMain.SampleNo || p.legacyMain.sampleno || ''
      } : null),
      remark: main.remarks1 || ''
    };
    try {
      const body = await saveOrder(api, ctx, payload, voucher, main, recordUid, storeCode);
      const savedMain = body.data && body.data.main && body.data.main[0];
      return { uid: savedMain ? savedMain.uid : recordUid, message: body.message || 'Saved successfully.' };
    } catch (e) {
      const msg = errorMessage(e, 'Production Order could not be saved.');
      setCallError(msg);
      if (/authorised|view-only|closed|downstream/i.test(msg) && recordUid) setLock({ read_only: true, code: 'SERVER_LOCK', reason: msg });
      throw new Error(msg);
    } finally { setSaving(false); }
  };

  return {
    api, ctx, storeCode, routeMode, recordUid, isAdd, isEdit, readOnly, loading, saving, callError, setCallError, lock, main,
    sourceMode, chooseSource, stockType, chooseStockType, selfFabricType, setSelfFabricType,
    groups, groupsLoading, groupQuery, setGroupQuery, groupPagination, selectedGroup, chooseGroup,
    selectedOrders, toggleOrder, setOrderQty, selfDesign, setSelfDesign,
    baseQtyInput, setBaseQtyInput, selfGreigeQtyInput, setSelfGreigeQtyInput,
    selfFinishedCost, setSelfFinishedCost, selfGreigeCost, setSelfGreigeCost,
    selfFinishedSellingRate, setSelfFinishedSellingRate,
    selfGreigeSellingRate, setSelfGreigeSellingRate,
    salesSellingRate, setSalesSellingRate,
    stockMeters, setStockMeters: (v: string) => { setStockMetersTouched(true); setStockMeters(v); }, stockMetersTouched,
    poOwners, poOwnerCode, setPoOwnerCode, ownerLoading,
    jobList, addJob, updateJob, removeJob, purchaseList, addPurchase, updatePurchase, removePurchase,
    setInhouseQty, inhouseTouched, inhouseRate: inhouseRate || (rates ? rates.weavingRate : ''), setInhouseRate,
    engine, rates, setRates, breakup, engineLoading, engineNote,
    voucher, voucherLoading, reviewStep, setReviewStep,
    costingLoading, costingError, costOptions, costNeedsMapping, costDesignOptions, legacyCostChoice, newCostChoice,
    searchCostSheets, chooseCosting, linkCostDesign,
    plan, saveReason, authReason, canSave, save
  };
}
