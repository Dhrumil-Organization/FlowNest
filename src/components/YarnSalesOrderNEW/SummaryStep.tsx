// FILE: src/components/YarnSalesOrderNEW/SummaryStep.tsx
// Order summary (legacy components/YarnSalesOrder/OrderSummaryScreen.tsx):
// "New Sales Order" / "Modify Sales Order" / "Authorised Sales Order".
//   GET  /api/mobappshow                 open a saved order (EDIT / VIEW)
//   GET  /api/getaddress                 delivery addresses ("Tap to change")
//   POST /api/mobappsave                 save
//   POST /api/mobappdeleteso             delete
//   POST /api/saleschallanmultiprintnew  print (format 'ROne')
//
// Rules kept from legacy
//   - an order with IsAuth != 0 (or opened as VIEW) is read-only: no add / edit / save / delete
//   - the item / grade / shade pencils are also off when IsAuth = 1
//   - "Change" party: only on a new order, or on an authorised order whose party is the temp party '-1'
//   - every row needs item, grade, shade, Qty > 0 and Rate > 0
//   - Discount / Tax are not shown; the values loaded with a saved order still go into the totals
//   - the save payload is model.buildSavePayload() (same keys and value sources as legacy)
//
// Changes on top of legacy
//   - Due Days / Due Date replace Delivery Days / Date on the form. Due Days starts from the
//     party's credit days, can be changed, and Due Date = SO date (today when new) + Due Days;
//     picking a Due Date by hand sets Due Days to match. Due Days must be a whole number >= 0.
//   - Sales Executive can be changed on the order (GET /api/get_criterion fetch:'salesexe').
//   - Sales Party card after the main party (party list reused); optional, blank when not picked.
//   - Qty / Pcs / Rate have a pencil on every row (like the Item pencil) — the value is
//     changed in place, Amount is recalculated, nothing else on the row changes.
//   - Every row shows its available stock (POST /api/get_so_current_stock, one request per
//     Item + Grade + Shade, 4 at a time, cached; refresh button on the rows header).
//   - Search box on the rows (item / grade / shade code or name, remark).
//
// Unlike legacy the order (party, rows, days, remark, the loaded header) stays in this
// step while the item / grade / shade steps are open on top of it — legacy re-opened a
// blank summary after every pick and lost the header values.
import { AppAlert } from '@/common/utils/appAlert';
import { Btn, BusyOverlay, Card, DateField, EmptyState, Field, IconBtn, Kpi, KpiGrid, PanelHeader, SectionHead, Sheet } from '@/src/components/erpUi';
import { T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { deleteOrder, errorMessage, fetchAddresses, fetchCurrentStock, fetchExecutives, fetchParties, printOrder, saveOrder, showOrder } from './api';
import {
  applyDeliveryAddress,
  applyExecutive,
  applyWorkingRows,
  buildSavePayload,
  buildStockLines,
  canAskStock,
  cleanZip,
  computeTotals,
  dmy,
  dueDateFor,
  dueDaysFor,
  effectiveSalesParty,
  filterAddresses,
  filterOrderRows,
  lineAmount,
  makeRowKey,
  money,
  num,
  OrderCtx,
  OrderMode,
  parseOrderResponse,
  placeLine,
  reSrNo,
  Row,
  salesPartyFromPick,
  saveTimestamp,
  selectedItemFromRow,
  totalStockQty,
  updateRowValue,
  validateOrder,
  withBillingAddress,
  yy,
} from './model';
import { Nav, PickFlow } from './nav';
import { CONTENT, Dialog, FooterBar, InfoRow, ListSkeleton, PickerSheet, SearchInput, useCols } from './ui';

export type SummaryParams = {
  ctx: OrderCtx;
  /** 'ADD' new order, 'EDIT' from the list, 'VIEW' after a save. */
  initialMode: OrderMode;
  /** Kept as text ('0' for a new order) — the form legacy sends it in. */
  uid: string;
  party?: Row | null;
};

type Props = { token: string; API: string; nav: Nav; params: SummaryParams };

/** Available stock of one Item + Grade + Shade (keyed by model.makeRowKey). */
type StockInfo = { loading: boolean; failed?: boolean; qty: number; rows: Row[] };

type QuickField = 'Qty' | 'Pcs' | 'Rate';
const QUICK_LABEL: Record<QuickField, string> = { Qty: 'Qty', Pcs: 'Pcs', Rate: 'Rate' };

const STOCK_WORKERS = 4;

/** Due Days as shown in the input ('' when the party has none). */
const dueDayText = (v: any) => (v === null || v === undefined ? '' : String(v));

const parseDmyDate = (text: string): Date => {
  const parts = String(text || '').split('-');
  if (parts.length === 3) {
    const d = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
    if (!isNaN(d.getTime())) return d;
  }
  return new Date();
};

export default function SummaryStep({ token, API, nav, params }: Props) {
  const { ctx, initialMode } = params;
  const uid = params.uid || '0';
  const { cols, isPhone } = useCols();

  // Legacy screen mode: an order that has a UId is always handled as EDIT.
  const screenMode: OrderMode = Number(uid) > 0 || initialMode === 'EDIT' ? 'EDIT' : initialMode;
  const mode = screenMode;

  const [isViewMode, setIsViewMode] = useState(initialMode === 'VIEW');
  const [autoLocked, setAutoLocked] = useState<number>(0);
  const [currentParty, setCurrentParty] = useState<Row | null>(params.party || null);
  const [rows, setRows] = useState<Row[]>([]);
  const [discount, setDiscount] = useState('0');
  const [tax, setTax] = useState('0');
  const [dueDays, setDueDays] = useState<string>(dueDayText(params.party?.DueDay));
  const [dueDate, setDueDate] = useState('');
  const [salesParty, setSalesParty] = useState<Row | null>(null);
  const [remark, setRemark] = useState('');
  const [soDate, setSoDate] = useState('');
  const [soNo, setSoNo] = useState('');
  const [rawMain, setRawMain] = useState<Row | null>(null);
  const [rawTax, setRawTax] = useState<Row[]>([]);
  const [rawExp, setRawExp] = useState<Row | null>(null);
  const [rawExtra, setRawExtra] = useState<Row>({});

  const needsLoad = (initialMode === 'EDIT' || initialMode === 'VIEW') && Number(uid) > 0;
  const [loadingOrder, setLoadingOrder] = useState(needsLoad);
  const [loadFailed, setLoadFailed] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [dirty, setDirty] = useState(false);

  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleteSuccessVisible, setDeleteSuccessVisible] = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);
  const [addressListVisible, setAddressListVisible] = useState(false);
  const [addressList, setAddressList] = useState<Row[]>([]);
  const [addressLoading, setAddressLoading] = useState(false);
  const [addressSearch, setAddressSearch] = useState('');
  const [actionRow, setActionRow] = useState<Row | null>(null);

  const [executives, setExecutives] = useState<Row[]>([]);
  const [exeLoading, setExeLoading] = useState(false);
  const [exePickerVisible, setExePickerVisible] = useState(false);

  const [rowSearch, setRowSearch] = useState('');
  const [quickEdit, setQuickEdit] = useState<{ row: Row; field: QuickField; value: string } | null>(null);

  const [stock, setStock] = useState<Record<string, StockInfo>>({});
  const [stockRowKey, setStockRowKey] = useState<string | null>(null);
  const [stockTick, setStockTick] = useState(0);

  const aliveRef = useRef(true);
  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  /* ---------------- open a saved order ---------------- */

  /**
   * A saved order carries only the delivery address. The billing address of the party and
   * of the Sales Party is filled from the party master (/api/accountbasic). Not a change to
   * the order, so it does not mark it dirty; on failure the cards just show '-'.
   */
  const fillBillingAddresses = async (partyCode: any, salesCode: any) => {
    try {
      const list = await fetchParties(API, token, ctx);
      if (!aliveRef.current) return;
      const find = (code: any) => list.find((p) => String(p.acccode) === String(code));
      const master = partyCode ? find(partyCode) : undefined;
      if (master) {
        setCurrentParty((prev) => (prev && String(prev.ParCode) === String(partyCode) ? withBillingAddress(prev, master) : prev));
      }
      const salesMaster = salesCode ? find(salesCode) : undefined;
      if (salesMaster) {
        setSalesParty((prev) => (prev && String(prev.ParCode) === String(salesCode) ? withBillingAddress(prev, salesMaster) : prev));
      }
    } catch (error: any) {
      console.log('[YarnSalesOrderNEW] billing address error', error?.response?.data || error?.message);
    }
  };

  const loadOrderFromBackend = useCallback(async () => {
    try {
      setLoadingOrder(true);
      setLoadFailed('');
      // legacy sends the mode the screen was opened with ('EDIT' / 'VIEW')
      const resData = await showOrder(API, token, ctx, uid, initialMode);
      if (!aliveRef.current) return;
      const order = parseOrderResponse(resData);
      if (!order) {
        setLoadFailed('Sales order not found');
        return;
      }
      const { main } = order;
      setAutoLocked(Number(main?.IsAuth));
      const isLocked = Number(main?.IsAuth || 0) !== 0;
      setIsViewMode(initialMode === 'VIEW' || isLocked);

      setRawMain(main);
      setRawTax(order.rawTax);
      setRawExp(order.rawExp);
      setRawExtra(order.rawExtra);
      setRows(order.rows);

      setDiscount(order.discount);
      setDueDays(dueDayText(main.DueDay));
      setTax(order.tax);
      setRemark(main.Remark || '');
      setSoDate(main.SODate || '');
      setSoNo(main.SONo || '');
      setDueDate(main.DueDate || '');
      setCurrentParty(order.party);
      setSalesParty(order.salesParty);
      setDirty(false);
      fillBillingAddresses(order.party?.ParCode, order.salesParty?.ParCode);
    } catch (error: any) {
      console.log('[YarnSalesOrderNEW] load order error', error?.response?.data || error?.message);
      if (aliveRef.current) setLoadFailed(errorMessage(error, 'Unable to load sales order'));
    } finally {
      if (aliveRef.current) setLoadingOrder(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [API, token, uid, initialMode]);

  useEffect(() => {
    if (needsLoad) loadOrderFromBackend();
  }, [needsLoad, loadOrderFromBackend]);

  /* ---------------- dates that follow the header ---------------- */

  // Due Date = SO date (today when new) + Due Days
  useEffect(() => {
    const next = dueDateFor(dueDays, soDate);
    if (next !== null) setDueDate((cur) => (cur === next ? cur : next));
  }, [dueDays, soDate]);

  /** Due Date picked by hand -> Due Days follows it. */
  const pickDueDate = (d: Date) => {
    const days = dueDaysFor(d, soDate);
    if (days === null) {
      AppAlert.alert('Invalid Due Date', 'Due Date cannot be before the SO date.');
      return;
    }
    setDueDays(String(days));
    setDueDate(dmy(d));
    setDirty(true);
  };

  /* ---------------- totals ---------------- */

  const totals = useMemo(() => computeTotals(rows), [rows]);

  const shownRows = useMemo(() => filterOrderRows(rows, rowSearch), [rows, rowSearch]);

  /* ---------------- stock of every row ---------------- */

  const rowsRef = useRef(rows);
  rowsRef.current = rows;
  /** Bumped by "refresh stock" so answers of an older round are dropped. */
  const stockGen = useRef(0);
  const stockAsked = useRef(new Set<string>());

  useEffect(() => {
    if (!token || loadingOrder) return;
    const pending = Array.from(new Set(rows.filter(canAskStock).map(makeRowKey))).filter(
      (k) => !stockAsked.current.has(k),
    );
    if (pending.length === 0) return;
    pending.forEach((k) => stockAsked.current.add(k));
    setStock((prev) => {
      const next = { ...prev };
      pending.forEach((k) => {
        next[k] = { loading: true, qty: prev[k]?.qty || 0, rows: prev[k]?.rows || [] };
      });
      return next;
    });

    const gen = stockGen.current;
    let at = 0;
    const worker = async () => {
      while (at < pending.length) {
        const key = pending[at++];
        const all = rowsRef.current;
        const row = all.find((r) => makeRowKey(r) === key);
        if (!row) {
          if (gen === stockGen.current) setStock((prev) => ({ ...prev, [key]: { loading: false, qty: 0, rows: [] } }));
          continue;
        }
        let info: StockInfo;
        try {
          // same body as the details screen when it edits this row
          const { d1, selectedd1 } = buildStockLines(
            { ItmCode: row.ItmCode },
            { GrdCode: row.GrdCode },
            [{ ShdCode: row.ShdCode }],
            all,
            row,
          );
          const stockRows = await fetchCurrentStock(API, token, ctx, d1, selectedd1);
          info = { loading: false, qty: totalStockQty(stockRows), rows: stockRows };
        } catch (error: any) {
          console.log('[YarnSalesOrderNEW] row stock error', error?.response?.data || error?.message);
          info = { loading: false, failed: true, qty: 0, rows: [] };
        }
        if (!aliveRef.current || gen !== stockGen.current) return;
        setStock((prev) => ({ ...prev, [key]: info }));
      }
    };
    for (let i = 0; i < Math.min(STOCK_WORKERS, pending.length); i++) worker();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, token, API, loadingOrder, stockTick]);

  const refreshStock = () => {
    stockGen.current += 1;
    stockAsked.current = new Set();
    setStock({});
    // the effect above runs again on the new (empty) cache
    setStockTick((t) => t + 1);
  };

  /* ---------------- leaving with unsaved changes ---------------- */

  const canLoseWork = dirty && !isViewMode && !saving;
  useEffect(() => {
    if (!canLoseWork) {
      nav.setGuard(null);
      return;
    }
    nav.setGuard(() => {
      AppAlert.alert('Discard changes?', 'This sales order has changes that are not saved.', [
        { text: 'Keep editing', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: () => nav.forceBack() },
      ]);
      return true;
    });
    return () => nav.setGuard(null);
  }, [canLoseWork, nav]);

  /* ---------------- item / grade / shade flows ---------------- */

  const onRowsDone = useCallback(
    (workingRows: Row[], isEdit: boolean) => {
      setRows(applyWorkingRows(workingRows, isEdit));
      setDirty(true);
      nav.popToSelf();
    },
    [nav],
  );

  const flowFor = (row: Row | null): PickFlow => {
    const stableUid = Number(uid || row?.UId || rawMain?.UId || 0);
    const stableMode: OrderMode = stableUid > 0 || mode === 'EDIT' ? 'EDIT' : 'ADD';
    return {
      ctx,
      mode: stableMode,
      uid: String(stableUid),
      party: currentParty,
      editMode: !!row,
      oldRow: row,
      workingRows: rows,
      replace: null,
      onDone: onRowsDone,
    };
  };

  const addItem = () => nav.push('item', flowFor(null));

  const handleEditItem = (row: Row) => nav.push('item', { ...flowFor(row), replace: 'item' });

  const handleEditGrade = (row: Row) =>
    nav.push('grade', { ...flowFor(row), replace: 'grade', selectedItem: selectedItemFromRow(row) });

  const handleEditShade = (row: Row) =>
    nav.push('shade', {
      ...flowFor(row),
      replace: 'shade',
      selectedItem: selectedItemFromRow(row),
      selectedGrade: { GrdCode: row.GrdCode, GrdName: row.GrdName, Raw: row },
    });

  const handleEditDetails = (row: Row) =>
    nav.push('details', {
      ...flowFor(row),
      replace: 'details',
      selectedItem: selectedItemFromRow(row),
      selectedGrade: { GrdCode: row.GrdCode, GrdName: row.GrdName, Raw: row },
      selectedShades: [{ ShdCode: row.ShdCode, ShdName: row.ShdName, Raw: row }],
    });

  const removeRow = (row: Row) => {
    AppAlert.alert('Delete Row', 'Are you sure you want to delete this shade?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          setRows((prev) => reSrNo(prev.filter((x) => String(x.LineId) !== String(row.LineId))));
          setDirty(true);
        },
      },
    ]);
  };

  /* ---------------- party / address ---------------- */

  const canChangeParty =
    // eslint-disable-next-line eqeqeq
    (mode !== 'EDIT' && Number(uid) <= 0) || (currentParty?.ParCode == '-1' && Number(autoLocked) == 1);

  const changeParty = () =>
    nav.push('party', {
      ctx,
      purpose: 'replace',
      onPick: (party: Row) => {
        setCurrentParty(party);
        // a new party brings its own credit days
        setDueDays(dueDayText(party?.DueDay));
        setDirty(true);
      },
    });

  const pickSalesParty = () =>
    nav.push('party', {
      ctx,
      purpose: 'replace',
      title: 'Select Sales Party',
      crumb: 'Sales party',
      onPick: (party: Row) => {
        // stored as picked, even when it is the same as the main party
        setSalesParty(salesPartyFromPick(party));
        setDirty(true);
      },
    });

  const openExecutivePicker = async () => {
    setExePickerVisible(true);
    if (executives.length > 0) return;
    try {
      setExeLoading(true);
      const data = await fetchExecutives(API, token, ctx);
      if (aliveRef.current) setExecutives(data);
    } catch (error: any) {
      console.log('[YarnSalesOrderNEW] executive list error', error?.response?.data || error?.message);
      if (aliveRef.current) AppAlert.alert('Error', errorMessage(error, 'Unable to load sales executives'));
    } finally {
      if (aliveRef.current) setExeLoading(false);
    }
  };

  /* ---------------- Qty / Pcs / Rate pencils ---------------- */

  const openQuickEdit = (row: Row, field: QuickField) => setQuickEdit({ row, field, value: String(row[field] ?? '') });

  const saveQuickEdit = () => {
    if (!quickEdit) return;
    const { row, field, value } = quickEdit;
    const text = String(value || '').trim();
    if (field === 'Pcs' ? text !== '' && (isNaN(Number(text)) || num(text) < 0) : num(text) <= 0) {
      AppAlert.alert('Required', field === 'Pcs' ? 'Enter valid pcs' : `Enter valid ${field.toLowerCase()}`);
      return;
    }
    setRows((prev) => updateRowValue(prev, row.LineId, field, text || '0'));
    setDirty(true);
    setQuickEdit(null);
  };

  const loadDeliveryAddress = async () => {
    try {
      setAddressLoading(true);
      const data = await fetchAddresses(API, token, ctx, uid, currentParty?.ParCode);
      if (aliveRef.current) setAddressList(data);
    } catch (error: any) {
      console.log('[YarnSalesOrderNEW] address error', error?.response?.data || error?.message);
      AppAlert.alert('Error', errorMessage(error, 'Unable to load delivery address'));
    } finally {
      if (aliveRef.current) setAddressLoading(false);
    }
  };

  /* ---------------- save / delete / print ---------------- */

  const handleSave = async () => {
    const invalid = validateOrder(currentParty, dueDays, rows);
    if (invalid) {
      AppAlert.alert(invalid[0], invalid[1]);
      return;
    }
    try {
      setSaving(true);
      const payload = buildSavePayload({
        mode,
        uid,
        ctx,
        party: currentParty,
        rows,
        discount,
        tax,
        remark,
        dueDays,
        dueDate,
        salesParty,
        rawMain,
        rawTax,
        rawExp,
        rawExtra,
      });
      const data = await saveOrder(API, token, payload);
      if (data?.success === true) {
        const r = data?.response || {};
        nav.restartWith(
          'saved',
          {
            orderNo: r.sono || soNo || '-',
            uid: String(r.uid || uid),
            ctx: {
              prpcode: r.PrpCode || ctx.prpcode,
              yearno: r.YearNo || ctx.yearno,
              strcode: r.StrCode || ctx.strcode,
            },
            dateTime: saveTimestamp(),
          },
          { kind: 'saved' },
        );
      } else {
        AppAlert.alert('Save Failed', data?.message || 'Unable to save order');
      }
    } catch (error: any) {
      console.log('[YarnSalesOrderNEW] save error', error?.response?.data || error?.message);
      AppAlert.alert('Error', errorMessage(error, 'Something went wrong while saving'));
    } finally {
      if (aliveRef.current) setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      setDeleting(true);
      const res = await deleteOrder(API, token, {
        Mode: mode,
        uid: uid || 0,
        prpcode: ctx.prpcode,
        yearno: yy(ctx.yearno),
        strcode: '002',
      });
      if (res.success) {
        setDeleteModalVisible(false);
        setDeleteSuccessVisible(true);
        setTimeout(() => {
          if (!aliveRef.current) return;
          setDeleteSuccessVisible(false);
          // back to the list, reloaded for this order's property / year (legacy refreshAfterDelete)
          nav.exitToBrowse({ kind: 'deleted', prpcode: ctx.prpcode, yearno: ctx.yearno, strcode: ctx.strcode });
        }, 1200);
      } else {
        AppAlert.alert('Delete Failed', res.message || 'Unable to delete order');
      }
    } catch (error: any) {
      console.log('[YarnSalesOrderNEW] delete error', error?.response?.data || error?.message);
      AppAlert.alert('Error', errorMessage(error, 'Something went wrong while deleting'));
    } finally {
      if (aliveRef.current) setDeleting(false);
    }
  };

  const handlePrint = async () => {
    try {
      setPdfLoading(true);
      const data = await printOrder(API, token, ctx, uid, 'ROne');
      if (data?.success === true) {
        const pdfUrl = data?.results?.sales_order;
        if (!pdfUrl) {
          AppAlert.alert('PDF Error', 'PDF URL not found.');
          return;
        }
        nav.push('pdf', { pdfUrl, title: 'Sales Order Print' });
      } else {
        AppAlert.alert('PDF Failed', data?.message || 'PDF generation failed.');
      }
    } catch (error: any) {
      console.log('[YarnSalesOrderNEW] print error', error?.response?.data || error?.message);
      AppAlert.alert('Error', errorMessage(error, 'Unable to generate PDF.'));
    } finally {
      if (aliveRef.current) setPdfLoading(false);
    }
  };

  /* ---------------- render ---------------- */

  // eslint-disable-next-line eqeqeq
  const authorised = Number(autoLocked) == 1;
  const pencilsOff = authorised || isViewMode;
  const title = authorised
    ? 'Authorised Sales Order'
    : isViewMode
      ? 'View Sales Order'
      : mode === 'EDIT' || Number(uid) > 0
        ? 'Modify Sales Order'
        : 'New Sales Order';
  const badge = authorised ? 'VIEW' : initialMode;
  const daysEditable = !isViewMode || screenMode === 'ADD';
  const shownSalesParty = effectiveSalesParty(salesParty, currentParty);
  const partyPlace = placeLine(currentParty?.City, currentParty?.State, currentParty?.Cnty, currentParty?.Zip);
  const shownAddresses = filterAddresses(addressList, addressSearch);
  const salesPlace = placeLine(shownSalesParty?.City, shownSalesParty?.State, shownSalesParty?.Cnty, shownSalesParty?.Zip);
  const stockRow = stockRowKey ? rows.find((r) => makeRowKey(r) === stockRowKey) : null;
  const stockInfo = stockRowKey ? stock[stockRowKey] : undefined;

  if (loadingOrder) {
    return (
      <View style={st.root}>
        <PanelHeader onBack={nav.back} crumbs={['Yarn Sales Order']} title="Loading sales order…" />
        <View style={[CONTENT, { padding: 12 }]}>
          <ListSkeleton rows={4} tall />
        </View>
      </View>
    );
  }

  if (loadFailed) {
    return (
      <View style={st.root}>
        <PanelHeader onBack={nav.back} crumbs={['Yarn Sales Order']} title="Sales Order" />
        <EmptyState
          icon="error-outline"
          title={loadFailed}
          text="The order could not be opened. Check the connection and try again."
          action={<Btn label="Try again" icon="refresh" onPress={loadOrderFromBackend} />}
        />
      </View>
    );
  }

  const renderStock = (item: Row) => {
    if (!canAskStock(item)) return <Text style={st.meta}>Stock : -</Text>;
    const info = stock[makeRowKey(item)];
    const enough = !!info && !info.loading && !info.failed && info.qty >= num(item.Qty);
    const color = !info || info.loading ? T.muted : info.failed ? T.red : info.qty <= 0 ? T.red : enough ? T.green : T.amber;
    return (
      <TouchableOpacity
        style={[st.stockChip, { borderColor: `${color}55`, backgroundColor: `${color}12` }]}
        onPress={() => setStockRowKey(makeRowKey(item))}
        disabled={!info || info.loading}
        accessibilityRole="button"
        accessibilityLabel="Stock details"
      >
        <Icon name="inventory" size={14} color={color} />
        <Text style={[st.stockChipLabel, { color }]}>Stock</Text>
        {!info || info.loading ? (
          <ActivityIndicator size="small" color={T.copper} />
        ) : (
          <Text style={[st.stockChipValue, { color }]}>{info.failed ? 'Not loaded' : info.qty.toFixed(3)}</Text>
        )}
        {info && !info.loading && !info.failed ? <Icon name="info-outline" size={14} color={color} /> : null}
      </TouchableOpacity>
    );
  };

  const editCell = (item: Row, field: QuickField, shown: string, extra?: any) => (
    <TouchableOpacity
      style={[st.cellBox, extra]}
      onPress={() => openQuickEdit(item, field)}
      disabled={pencilsOff}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`Change ${QUICK_LABEL[field]}`}
    >
      <View style={st.cellHead}>
        <Text style={st.cellLabel}>{QUICK_LABEL[field]}</Text>
        {!pencilsOff ? <Icon name="edit" size={12} color={T.copper} /> : null}
      </View>
      <Text style={[st.cellValue, !pencilsOff && st.cellEditable]} numberOfLines={1}>{shown}</Text>
    </TouchableOpacity>
  );

  const renderRow = (item: Row, index: number) => (
    <View key={`${item.LineId}_${index}`} style={[st.rowCell, cols > 1 && { width: `${100 / Math.min(cols, 2)}%` as any }]}>
      <View style={st.rowCard}>
        <View style={st.rowTop}>
          <View style={st.rowNo}>
            <Text style={st.rowNoText}>{item.SrNo || index + 1}</Text>
          </View>
          <View style={{ flex: 1, minWidth: 0, gap: 6 }}>
            <View style={st.line}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={st.lineLabel}>Item</Text>
                <Text style={st.itemName} numberOfLines={2}>{item.ItmCode} - {item.ItmName}</Text>
              </View>
              <IconBtn icon="edit" label="Change item" color={T.copper} tone="soft" disabled={pencilsOff} onPress={() => handleEditItem(item)} />
            </View>
            <View style={st.line}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={st.lineLabel}>Grade</Text>
                <Text style={st.lineValue} numberOfLines={1}>{item.GrdCode} - {item.GrdName || '-'}</Text>
              </View>
              <IconBtn icon="edit" label="Change grade" color={T.copper} tone="soft" disabled={pencilsOff} onPress={() => handleEditGrade(item)} />
            </View>
            <View style={st.line}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={st.lineLabel}>Shade</Text>
                <Text style={st.lineValue} numberOfLines={1}>{item.ShdCode} - {item.ShdName || '-'}</Text>
              </View>
              <IconBtn icon="edit" label="Change shade" color={T.copper} tone="soft" disabled={pencilsOff} onPress={() => handleEditShade(item)} />
            </View>
            <View style={st.metaRow}>
              <Text style={st.meta} numberOfLines={1}>Denier : {item.Denier || item.denier || '-'}</Text>
              {renderStock(item)}
            </View>
            {item.Remark ? <Text style={st.meta} numberOfLines={3}>Remark : {item.Remark}</Text> : null}
          </View>
          <TouchableOpacity
            style={[st.menuBtn, isViewMode && { opacity: 0.4 }]}
            onPress={() => setActionRow(item)}
            disabled={isViewMode}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            accessibilityRole="button"
            accessibilityLabel={`Row ${item.SrNo || index + 1} actions`}
          >
            <Icon name="more-vert" size={22} color={T.nav} />
          </TouchableOpacity>
        </View>
        <View style={st.rowBottom}>
          {editCell(item, 'Qty', String(item.Qty))}
          {editCell(item, 'Pcs', String(item.Pcs))}
          {editCell(item, 'Rate', `₹ ${money(item.Rate)}`)}
          <View style={[st.cellBox, { flex: 1.3, alignItems: 'flex-end' }]}>
            <Text style={st.cellLabel}>Amount</Text>
            <Text style={[st.cellValue, { color: T.green }]} numberOfLines={1}>₹ {money(item.Amount)}</Text>
          </View>
        </View>
      </View>
    </View>
  );

  return (
    <View style={st.root}>
      <PanelHeader
        onBack={nav.back}
        crumbs={['Yarn Sales Order']}
        title={title}
        subtitle={`SO No : ${soNo || '-'}   ·   SO Date : ${soDate || '-'}`}
        right={
          <View style={st.headRight}>
            <View style={st.modeBadge}>
              <Text style={st.modeText}>{badge}</Text>
            </View>
            <IconBtn icon="info-outline" label="Sales order details" color={T.copper} tone="soft" onPress={() => setDetailVisible(true)} />
          </View>
        }
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[CONTENT, st.content]}
      >
        <View style={[st.topGrid, !isPhone && { flexDirection: 'row' }]}>
          {/* Party */}
          <Card style={[st.partyCard, !isPhone && { flex: 1.5 }]}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={st.eyebrow}>Party</Text>
              <Text style={st.partyName} numberOfLines={2}>{currentParty?.ParName || '-'}</Text>
              {/* billing address (party master) — a delivery address pick does not change it */}
              <Text style={st.partySub} numberOfLines={3}>
                {currentParty?.ParCode || '-'} | {currentParty?.Address || '-'}
              </Text>
              {partyPlace ? (
                <View style={st.placeRow}>
                  <Icon name="location-on" size={14} color={T.muted} />
                  <Text style={st.placeText} numberOfLines={2}>{partyPlace}</Text>
                </View>
              ) : null}
              <TouchableOpacity
                style={[st.exePick, isViewMode && st.exePickOff]}
                onPress={openExecutivePicker}
                disabled={isViewMode}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Change sales executive"
              >
                <Icon name="person-outline" size={15} color={isViewMode ? T.muted : T.copper} />
                <View style={{ flexShrink: 1, minWidth: 0 }}>
                  <Text style={st.exeLabel}>Sales Executive</Text>
                  <Text style={st.exeValue} numberOfLines={1}>{currentParty?.SExeName || 'Select'}</Text>
                </View>
                {!isViewMode ? <Icon name="edit" size={14} color={T.copper} /> : null}
              </TouchableOpacity>
            </View>
            {canChangeParty ? <Btn label="Change" kind="soft" compact onPress={changeParty} /> : null}
          </Card>

          {/* Due days / date */}
          <Card style={[{ gap: 12 }, !isPhone && { flex: 1 }]}>
            <Field
              label="Due Days"
              required
              value={dueDays}
              onChangeText={(t: string) => {
                setDueDays(t.replace(/[^0-9]/g, ''));
                setDirty(true);
              }}
              keyboardType="number-pad"
              editable={daysEditable}
              selectTextOnFocus
              placeholder="Credit days"
              accessibilityLabel="Due days"
            />
            <View style={{ gap: 6 }}>
              <Text style={st.label}>Due Date</Text>
              {isViewMode ? (
                <View style={st.readBox}>
                  <Icon name="event" size={17} color={T.muted} />
                  <Text style={st.readText}>{dueDate || '-'}</Text>
                </View>
              ) : (
                <DateField value={parseDmyDate(dueDate)} onChange={pickDueDate} />
              )}
            </View>
          </Card>
        </View>

        {/* Sales party (after the main party) */}
        <Card style={st.partyCard}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={st.eyebrow}>Sales Party</Text>
            {shownSalesParty ? (
              <>
                <Text style={st.salesName} numberOfLines={2}>{shownSalesParty.ParName || '-'}</Text>
                <Text style={st.partySub} numberOfLines={1}>{shownSalesParty.ParCode || '-'}</Text>
              </>
            ) : (
              <Text style={st.partySub} numberOfLines={1}>Not selected</Text>
            )}
            {shownSalesParty?.Address ? (
              <Text style={st.partySub} numberOfLines={3}>{shownSalesParty.Address}</Text>
            ) : null}
            {salesPlace ? (
              <View style={st.placeRow}>
                <Icon name="location-on" size={14} color={T.muted} />
                <Text style={st.placeText} numberOfLines={2}>{salesPlace}</Text>
              </View>
            ) : null}
          </View>
          {!isViewMode ? (
            <View style={st.salesBtns}>
              {salesParty?.ParCode ? (
                <IconBtn
                  icon="close"
                  label="Clear sales party"
                  color={T.muted}
                  tone="soft"
                  onPress={() => {
                    setSalesParty(null);
                    setDirty(true);
                  }}
                />
              ) : null}
              <Btn label={salesParty?.ParCode ? 'Change' : 'Select'} kind="soft" compact onPress={pickSalesParty} />
            </View>
          ) : null}
        </Card>

        <KpiGrid isPhone={isPhone}>
          <Kpi label="Rows" value={String(totals.itemCount)} icon="format-list-numbered" />
          <Kpi label="Qty" value={totals.totalQty} icon="scale" accent={T.yd} />
          <Kpi label="Pcs" value={String(totals.totalPcs)} icon="inventory-2" accent={T.blue} />
          <Kpi label="Amount" value={`₹ ${money(totals.totalAmount)}`} icon="payments" accent={T.green} valueColor={T.green} />
        </KpiGrid>

        <SectionHead
          title="Items / Grade / Shade rows"
          meta={
            rows.length
              ? rowSearch
                ? `${shownRows.length} of ${rows.length} rows`
                : `${rows.length} row${rows.length === 1 ? '' : 's'}`
              : undefined
          }
        />

        {rows.length > 0 ? (
          <SearchInput
            value={rowSearch}
            onChangeText={setRowSearch}
            placeholder="Search item, grade or shade in this order"
            onRefresh={refreshStock}
            loading={Object.values(stock).some((x) => x.loading)}
          />
        ) : null}

        {rows.length === 0 ? (
          <Card>
            <EmptyState
              icon="inventory-2"
              title="No items added"
              text={isViewMode ? 'This sales order has no rows.' : 'Tap Add Item to start creating the sales order.'}
            />
          </Card>
        ) : shownRows.length === 0 ? (
          <Card>
            <EmptyState icon="search-off" title="No matching row" text="Try another item, grade or shade." />
          </Card>
        ) : (
          <View style={st.rowGrid}>{shownRows.map(renderRow)}</View>
        )}

        <Card style={{ gap: 12 }}>
          <View style={st.grossRow}>
            <Text style={st.grossLabel}>Gross Amount</Text>
            <Text style={st.grossValue}>₹ {money(totals.totalAmount)}</Text>
          </View>
          <Field
            label="Remark"
            value={remark}
            onChangeText={(t: string) => {
              setRemark(t);
              setDirty(true);
            }}
            placeholder="Remark (optional)"
            multiline
            editable={!isViewMode}
          />
        </Card>
      </ScrollView>

      <FooterBar>
        {screenMode !== 'ADD' ? (
          <Btn label={isPhone ? '' : 'Print'} icon="print" kind="ghost" onPress={handlePrint} loading={pdfLoading} style={st.footIcon} />
        ) : null}
        {screenMode !== 'ADD' && !Number(autoLocked) ? (
          <Btn
            label={isPhone ? '' : 'Delete'}
            icon="delete-outline"
            kind="danger"
            onPress={() => setDeleteModalVisible(true)}
            disabled={saving || isViewMode}
            style={st.footIcon}
          />
        ) : null}
        <Btn label={isPhone ? 'Add' : 'Add Item'} icon="add-shopping-cart" kind="soft" onPress={addItem} disabled={isViewMode} style={{ flex: 1 }} />
        <Btn
          label={mode === 'EDIT' || Number(uid) > 0 ? 'Update Order' : 'Save Order'}
          icon={mode === 'EDIT' || Number(uid) > 0 ? 'edit' : 'save'}
          onPress={handleSave}
          loading={saving}
          disabled={isViewMode}
          style={{ flex: 1.6 }}
        />
      </FooterBar>

      {/* Row actions */}
      <Sheet
        open={!!actionRow}
        onClose={() => setActionRow(null)}
        eyebrow="ROW ACTION"
        title={actionRow ? `${actionRow.ItmName || ''} - ${actionRow.ShdName || ''}` : ''}
        wideMax={420}
      >
        <View>
          <TouchableOpacity
            style={st.actRow}
            accessibilityRole="button"
            onPress={() => {
              const row = actionRow;
              setActionRow(null);
              if (row) handleEditDetails(row);
            }}
          >
            <Icon name="edit" size={22} color={T.copper} />
            <Text style={st.actText}>Edit qty / rate / remark</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={st.actRow}
            accessibilityRole="button"
            onPress={() => {
              const row = actionRow;
              setActionRow(null);
              if (row) removeRow(row);
            }}
          >
            <Icon name="delete-outline" size={22} color={T.red} />
            <Text style={[st.actText, { color: T.red }]}>Delete row</Text>
          </TouchableOpacity>
        </View>
      </Sheet>

      {/* Sales order details */}
      <Sheet open={detailVisible} onClose={() => setDetailVisible(false)} title="Sales Order Details" wideMax={520}>
        <View>
          <InfoRow icon="person" label="Sales Executive" value={String(currentParty?.SExeName || '-')} />
          <InfoRow icon="storefront" label="Sales Party" value={String(shownSalesParty?.ParName || '-')} />
          <InfoRow icon="handshake" label="Broker" value={String(currentParty?.BAccName || '-')} />
          <InfoRow icon="calendar-today" label="Due Days" value={dueDays || '-'} />
          <InfoRow icon="event" label="Due Date" value={dueDate || '-'} />
          {/* Billing address (party master) — read-only, same layout as the delivery address */}
          <View style={st.addrRow}>
            <Icon name="receipt-long" size={18} color={T.copper} />
            <Text style={st.addrLabel}>Billing Address</Text>
            <View style={{ flex: 1, minWidth: 0, alignItems: 'flex-end' }}>
              <Text style={st.addrValue} numberOfLines={10}>{currentParty?.Address || '-'}</Text>
            </View>
          </View>
          <InfoRow icon="location-city" label="Billing City" value={String(currentParty?.City || '-')} />
          <InfoRow icon="map" label="Billing State" value={String(currentParty?.State || '-')} />
          <InfoRow icon="public" label="Billing Country" value={String(currentParty?.Cnty || '-')} />
          <InfoRow icon="markunread-mailbox" label="Billing Zip" value={cleanZip(currentParty?.Zip) || '-'} />
          <TouchableOpacity
            style={st.addrRow}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Change delivery address"
            onPress={() => {
              setAddressSearch('');
              setAddressListVisible(true);
              loadDeliveryAddress();
            }}
          >
            <Icon name="location-on" size={18} color={T.copper} />
            <Text style={st.addrLabel}>Delivery Address</Text>
            <View style={{ flex: 1, minWidth: 0, alignItems: 'flex-end' }}>
              <Text style={st.addrValue} numberOfLines={10}>{currentParty?.DAdd || currentParty?.Address || '-'}</Text>
              <Text style={st.addrHint}>Tap to change</Text>
            </View>
          </TouchableOpacity>
          <InfoRow icon="location-city" label="Delivery City" value={String(currentParty?.DCity || '-')} />
          <InfoRow icon="map" label="Delivery State" value={String(currentParty?.DState || '-')} />
          <InfoRow icon="public" label="Delivery Country" value={String(currentParty?.DCnty || '-')} />
          <InfoRow icon="markunread-mailbox" label="Delivery Zip" value={cleanZip(currentParty?.DZip) || '-'} />
        </View>
      </Sheet>

      {/* Select address */}
      <Sheet open={addressListVisible} onClose={() => setAddressListVisible(false)} title="Select Delivery Address" wideMax={520}>
        <SearchInput
          value={addressSearch}
          onChangeText={setAddressSearch}
          placeholder="Search address, city, state or zip"
          onRefresh={loadDeliveryAddress}
          loading={addressLoading}
          style={st.addrSearch}
        />
        {addressLoading ? (
          <View style={st.addrState}>
            <ActivityIndicator size="large" color={T.copper} />
            <Text style={st.addrStateText}>Loading Address...</Text>
          </View>
        ) : shownAddresses.length > 0 ? (
          <View>
            {shownAddresses.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={st.addrItem}
                accessibilityRole="button"
                onPress={() => {
                  setCurrentParty((prev) => applyDeliveryAddress(prev, item));
                  setDirty(true);
                  setAddressListVisible(false);
                }}
              >
                <Text style={st.addrItemTitle}>{item?.DAdd || '-'}</Text>
                <Text style={st.addrItemSub}>{item?.DCity || '-'} , {item?.DState || '-'}</Text>
                <Text style={st.addrItemSub}>{item?.DCnty || '-'} - {item?.DZip || '-'}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={st.addrState}>
            <Text style={st.addrStateText}>{addressList.length > 0 ? 'No matching address' : 'No Address Found'}</Text>
          </View>
        )}
      </Sheet>

      {/* Sales executive */}
      <PickerSheet
        open={exePickerVisible}
        title={exeLoading ? 'Loading sales executives…' : 'Select Sales Executive'}
        searchPlaceholder="Search sales executive..."
        rows={executives}
        keyOf={(e) => String(e.Code)}
        labelOf={(e) => `${e.SalesExecutive || '-'}${e.Code !== undefined ? `  (${e.Code})` : ''}`}
        searchOf={(e) => `${e.SalesExecutive || ''} ${e.Code ?? ''}`}
        selectedKey={currentParty?.SExe !== undefined && currentParty?.SExe !== null ? String(currentParty.SExe) : ''}
        onPick={(e) => {
          setCurrentParty((prev) => applyExecutive(prev, e));
          setDirty(true);
          setExePickerVisible(false);
        }}
        onClose={() => setExePickerVisible(false)}
      />

      {/* Qty / Pcs / Rate pencil */}
      <Sheet
        open={!!quickEdit}
        onClose={() => setQuickEdit(null)}
        eyebrow={quickEdit ? `ROW ${quickEdit.row.SrNo || ''}` : ''}
        title={quickEdit ? `Change ${QUICK_LABEL[quickEdit.field]}` : ''}
        wideMax={420}
      >
        {quickEdit ? (
          <View style={{ gap: 14 }}>
            <Text style={st.quickSub} numberOfLines={2}>
              {quickEdit.row.ItmName} · {quickEdit.row.GrdName || quickEdit.row.GrdCode} · {quickEdit.row.ShdName || quickEdit.row.ShdCode}
            </Text>
            <Field
              label={QUICK_LABEL[quickEdit.field]}
              required={quickEdit.field !== 'Pcs'}
              value={quickEdit.value}
              onChangeText={(t: string) => setQuickEdit((q) => (q ? { ...q, value: t } : q))}
              keyboardType="numeric"
              autoFocus
              selectTextOnFocus
            />
            {quickEdit.field !== 'Pcs' ? (
              <View style={st.quickAmt}>
                <Text style={st.cellLabel}>New Amount</Text>
                <Text style={st.quickAmtValue}>
                  ₹{' '}
                  {money(
                    lineAmount(
                      quickEdit.field === 'Qty' ? quickEdit.value : quickEdit.row.Qty,
                      quickEdit.field === 'Rate' ? quickEdit.value : quickEdit.row.Rate,
                    ),
                  )}
                </Text>
              </View>
            ) : null}
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Btn label="Cancel" kind="ghost" onPress={() => setQuickEdit(null)} style={{ flex: 1 }} />
              <Btn label="Update" icon="check" onPress={saveQuickEdit} style={{ flex: 1.4 }} />
            </View>
          </View>
        ) : null}
      </Sheet>

      {/* Stock of one row */}
      <Sheet
        open={!!stockRowKey}
        onClose={() => setStockRowKey(null)}
        eyebrow="STOCK DETAILS"
        title={stockRow ? `${stockRow.ItmName || ''} - ${stockRow.ShdName || ''}` : 'Stock Details'}
        wideMax={520}
      >
        {!stockInfo || stockInfo.rows.length === 0 ? (
          <Text style={st.stockEmpty}>No stock found</Text>
        ) : (
          <View style={{ gap: 10 }}>
            <View style={st.grossRow}>
              <Text style={st.grossLabel}>Total available</Text>
              <Text style={st.grossValue}>{stockInfo.qty.toFixed(3)}</Text>
            </View>
            {stockInfo.rows.map((s2, i) => (
              <View key={i} style={st.stockCard}>
                <View style={st.grossRow}>
                  <Text style={st.stockMer} numberOfLines={1}>{s2?.MerCode}</Text>
                  <Text style={st.stockQty}>{Number(s2?.StkQty || 0).toFixed(3)}</Text>
                </View>
                <Text style={st.stockName}>{s2?.MerName}</Text>
                <Text style={st.meta}>Carton : {s2?.TotCarton}</Text>
              </View>
            ))}
          </View>
        )}
      </Sheet>

      <Dialog
        open={deleteModalVisible}
        icon="delete-outline"
        title="Delete Sales Order?"
        message={`Are you sure you want to delete SO No ${soNo || '-'}? This action cannot be undone.`}
        onClose={() => (deleting ? undefined : setDeleteModalVisible(false))}
        actions={
          <>
            <Btn label="No, Cancel" kind="ghost" onPress={() => setDeleteModalVisible(false)} disabled={deleting} style={{ flex: 1 }} />
            <Btn label={deleting ? 'Deleting...' : 'Yes, Delete'} kind="danger" onPress={handleDelete} loading={deleting} style={{ flex: 1 }} />
          </>
        }
      />

      <Dialog open={deleteSuccessVisible} tone="success" icon="check" title="Deleted Successfully" message="Sales order has been deleted." />

      <BusyOverlay visible={saving} text="Saving sales order…" />
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  content: { padding: 12, gap: 12, paddingBottom: 28 },
  headRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  modeBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14, backgroundColor: `${T.yd}16`, borderWidth: 1, borderColor: `${T.yd}40` },
  modeText: { fontSize: 11, fontWeight: '900', color: T.yd, letterSpacing: 0.5 },

  topGrid: { gap: 12 },
  partyCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  eyebrow: { fontSize: 10.5, fontWeight: '800', color: T.copper, letterSpacing: 0.8, textTransform: 'uppercase' },
  partyName: { fontSize: 16, fontWeight: '900', color: T.nav, marginTop: 3 },
  partySub: { flexShrink: 1, fontSize: 12.5, lineHeight: 18, fontWeight: '600', color: T.muted, marginTop: 3 },
  exePick: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: `${T.copper}40`,
    backgroundColor: `${T.copper}0D`,
    maxWidth: '100%',
  },
  exePickOff: { borderColor: T.border, backgroundColor: T.alt },
  exeLabel: { fontSize: 9.5, fontWeight: '800', color: T.muted, letterSpacing: 0.4, textTransform: 'uppercase' },
  exeValue: { fontSize: 13, fontWeight: '800', color: T.nav },
  salesName: { fontSize: 14.5, fontWeight: '900', color: T.nav, marginTop: 3 },
  salesBtns: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  placeRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  placeText: { flexShrink: 1, fontSize: 12.5, fontWeight: '700', color: T.ink },
  label: { fontSize: 11, fontWeight: '800', color: T.muted, letterSpacing: 0.5, textTransform: 'uppercase' },
  readBox: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: T.border,
    backgroundColor: T.alt,
  },
  readText: { fontSize: 14, fontWeight: '700', color: T.ink },

  rowGrid: { flexDirection: 'row', flexWrap: 'wrap', margin: -5 },
  rowCell: { width: '100%', padding: 5 },
  rowCard: { flex: 1, backgroundColor: T.surface, borderRadius: 14, borderWidth: 1, borderColor: T.border, overflow: 'hidden' },
  rowTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 12 },
  rowNo: { width: 28, height: 28, borderRadius: 14, backgroundColor: T.nav, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  rowNoText: { color: '#fff', fontSize: 12, fontWeight: '900' },
  line: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  lineLabel: { fontSize: 10, fontWeight: '800', color: T.muted, letterSpacing: 0.4, textTransform: 'uppercase' },
  itemName: { fontSize: 14.5, fontWeight: '900', color: T.ink, marginTop: 1 },
  lineValue: { fontSize: 13.5, fontWeight: '700', color: T.nav, marginTop: 1 },
  meta: { fontSize: 12.5, fontWeight: '600', color: T.muted },
  metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 10 },
  stockChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
  },
  stockChipLabel: { fontSize: 10.5, fontWeight: '800', letterSpacing: 0.3, textTransform: 'uppercase' },
  stockChipValue: { fontSize: 12.5, fontWeight: '900' },
  menuBtn: { width: 34, height: 34, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: T.alt },
  rowBottom: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: T.sub,
    borderTopWidth: 1,
    borderTopColor: T.hair,
  },
  cellBox: { flex: 1, minWidth: 0 },
  cellLabel: { fontSize: 10, fontWeight: '700', color: T.muted, letterSpacing: 0.3, textTransform: 'uppercase' },
  cellValue: { fontSize: 13.5, fontWeight: '800', color: T.ink, marginTop: 2 },
  cellHead: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cellEditable: { color: T.nav },

  quickSub: { fontSize: 13, fontWeight: '700', color: T.muted },
  quickAmt: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, backgroundColor: T.sub },
  quickAmtValue: { fontSize: 16, fontWeight: '900', color: T.green },

  stockEmpty: { textAlign: 'center', color: T.muted, fontWeight: '700', paddingVertical: 28 },
  stockCard: { borderWidth: 1, borderColor: T.border, borderRadius: 12, padding: 12, backgroundColor: T.sub },
  stockMer: { flex: 1, minWidth: 0, fontSize: 14, fontWeight: '900', color: T.nav },
  stockQty: { fontSize: 15, fontWeight: '900', color: T.green },
  stockName: { fontSize: 13, fontWeight: '700', color: T.ink, marginTop: 4 },

  grossRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  grossLabel: { fontSize: 13.5, fontWeight: '800', color: T.nav },
  grossValue: { fontSize: 18, fontWeight: '900', color: T.green },

  footIcon: { minWidth: 46, paddingHorizontal: 12 },

  actRow: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 50, paddingHorizontal: 4 },
  actText: { fontSize: 15, fontWeight: '800', color: T.ink },

  addrRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: T.hair,
  },
  addrLabel: { width: 136, fontSize: 12.5, fontWeight: '700', color: T.muted },
  addrValue: { textAlign: 'right', fontSize: 13.5, fontWeight: '800', color: T.ink },
  addrHint: { fontSize: 12, fontWeight: '800', color: T.copper, marginTop: 4 },
  addrSearch: { marginBottom: 6 },
  addrState: { paddingVertical: 40, alignItems: 'center', justifyContent: 'center', gap: 12 },
  addrStateText: { fontSize: 14, fontWeight: '600', color: T.muted },
  addrItem: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: T.hair },
  addrItemTitle: { fontSize: 14, lineHeight: 21, fontWeight: '800', color: T.ink },
  addrItemSub: { fontSize: 12.5, fontWeight: '600', color: T.muted, marginTop: 3 },
});
