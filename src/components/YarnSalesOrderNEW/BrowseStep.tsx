// FILE: src/components/YarnSalesOrderNEW/BrowseStep.tsx
// Sales order list (legacy components/YarnSalesOrder/index.tsx — "Sales Order Browse").
//   search (server + on-screen), Property / Year / From / To / Show Authorized filter,
//   open an order, delete a not-authorised order, start a new order.
// Rules kept from legacy:
//   - the list first loads with today's date as From / To and no property / year;
//     the picker dates only apply after "Apply Filter"
//   - search waits 500 ms, then asks the server and also filters the loaded rows
//   - a new order needs a Property picked first
//   - delete is offered only while AuthStatus is not 'Authorised'
import { AppAlert } from '@/common/utils/appAlert';
import { Btn, Card, DateField, EmptyState, IconBtn, PickField } from '@/src/components/erpUi';
import { T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { browseOrders, deleteOrder, errorMessage, fetchPropertyData } from './api';
import {
  BrowseFilters,
  buildYearOptions,
  defaultFilters,
  filterOrders,
  financialYearDates,
  getSODate,
  getSONo,
  isAuthorised,
  OrderCtx,
  Row,
  ymd,
  yy,
} from './model';
import { BrowseSignal, Nav } from './nav';
import { CheckRow, CONTENT, Dialog, ListSkeleton, PickerSheet, SearchInput, useCols } from './ui';

type Props = { token: string; API: string; nav: Nav; signal: BrowseSignal | null };

/** 'yyyymmdd' -> 'dd-mm-yyyy' for the "applied filter" line. */
const showYmd = (v: string) => (v && v.length === 8 ? `${v.slice(6, 8)}-${v.slice(4, 6)}-${v.slice(0, 4)}` : v || '-');

export default function BrowseStep({ token, API, nav, signal }: Props) {
  const { cols, isPhone } = useCols();

  const yearOptions = useMemo(() => buildYearOptions(), []);
  const [selectedYear, setSelectedYear] = useState(yearOptions[0]);
  const [propertyData, setPropertyData] = useState<Row[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<Row | null>(null);
  const [propertyPickerVisible, setPropertyPickerVisible] = useState(false);
  const [yearPickerVisible, setYearPickerVisible] = useState(false);

  const initialDates = useMemo(() => financialYearDates(yearOptions[0]), [yearOptions]);
  const [fromDate, setFromDate] = useState<Date>(initialDates?.from || new Date());
  const [toDate, setToDate] = useState<Date>(initialDates?.to || new Date());

  const [search, setSearch] = useState('');
  const [orders, setOrders] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showFilter, setShowFilter] = useState(true);
  const [filters, setFilters] = useState<BrowseFilters>(defaultFilters);

  const [deleting, setDeleting] = useState(false);
  const [deleteItem, setDeleteItem] = useState<Row | null>(null);
  const [deleteSuccessVisible, setDeleteSuccessVisible] = useState(false);

  const loadSeq = useRef(0);
  const skipSearchRef = useRef(true); // the first run of the search effect is the initial load below
  const aliveRef = useRef(true);
  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  // latest values for callbacks that outlive a render (signal handler, timers)
  const live = useRef({ filters, selectedYear, search, propertyData });
  live.current = { filters, selectedYear, search, propertyData };

  /** Legacy loadOrders(text, isFilter, customFilters). */
  const loadOrders = useCallback(
    async (text: string, customFilters?: BrowseFilters, yearFallback?: string) => {
      const activeFilters = customFilters || live.current.filters;
      const yearText = activeFilters.yearno || (yearFallback !== undefined ? yearFallback : live.current.selectedYear);
      const seq = ++loadSeq.current;
      setLoading(true);
      const data = await browseOrders(API, token, text, activeFilters, yearText);
      if (!aliveRef.current || seq !== loadSeq.current) return;
      setOrders(data);
      setLoading(false);
      setRefreshing(false);
    },
    [API, token],
  );

  // Property list
  useEffect(() => {
    if (!token) return;
    let alive = true;
    fetchPropertyData(API, token).then((data) => {
      if (alive) setPropertyData(data || []);
    });
    return () => {
      alive = false;
    };
  }, [API, token]);

  // Initial list — legacy sends no year on the very first request.
  useEffect(() => {
    loadOrders('', undefined, '');
  }, [loadOrders]);

  // Search (500 ms) — server search; the loaded rows are also filtered on screen.
  useEffect(() => {
    if (skipSearchRef.current) {
      skipSearchRef.current = false;
      return;
    }
    const delay = setTimeout(() => {
      loadOrders(search);
    }, 500);
    return () => clearTimeout(delay);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  // Year picked -> From / To follow the financial year (legacy getFinancialYearDates).
  const pickYear = (year: string) => {
    setSelectedYear(year);
    const d = financialYearDates(year);
    if (d) {
      setFromDate(d.from);
      setToDate(d.to);
    }
    setYearPickerVisible(false);
  };

  const applyFilter = () => {
    const updatedFilters: BrowseFilters = {
      ...filters,
      prpcode: selectedProperty?.PrpCode || '',
      yearno: selectedYear || '',
      fromdate: fromDate ? ymd(fromDate) : '',
      todate: toDate ? ymd(toDate) : '',
    };
    setFilters(updatedFilters);
    loadOrders(search, updatedFilters);
    setShowFilter(false);
  };

  const resetFilter = () => {
    const reset = defaultFilters();
    setFilters(reset);
    loadOrders(search, reset);
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadOrders(live.current.search);
  }, [loadOrders]);

  // Coming back from an order: reload (legacy "refreshAfterDelete" for a deleted order).
  useEffect(() => {
    if (!signal) return;
    const cur = live.current;
    if (signal.kind === 'deleted') {
      const nextFilters: BrowseFilters = {
        ...cur.filters,
        prpcode: signal.prpcode || cur.filters.prpcode || '',
        yearno: signal.yearno || cur.filters.yearno || '',
        strcode: signal.strcode || cur.filters.strcode || '002',
      };
      setFilters(nextFilters);
      if (signal.prpcode && cur.propertyData?.length > 0) {
        const matched = cur.propertyData.find((x) => String(x.PrpCode) === String(signal.prpcode));
        if (matched) setSelectedProperty(matched);
      }
      if (cur.search !== '') {
        skipSearchRef.current = true;
        setSearch('');
      }
      setShowFilter(false);
      loadOrders('', nextFilters);
      return;
    }
    loadOrders(cur.search);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signal?.key]);

  const addNewSalesOrder = () => {
    if (!selectedProperty?.PrpCode) {
      setShowFilter(true);
      AppAlert.alert('Required', 'Please select property first');
      return;
    }
    const ctx: OrderCtx = {
      prpcode: filters.prpcode || selectedProperty?.PrpCode || '',
      strcode: filters.strcode || '002',
      yearno: filters.yearno || selectedYear?.slice(-2) || '',
      prpname: selectedProperty?.LngName || '',
    };
    nav.push('party', { ctx, purpose: 'new' });
  };

  const openExistingOrder = (order: Row) => {
    const ctx: OrderCtx = {
      prpcode: order.PrpCode,
      strcode: order.StrCode || filters.strcode || '002',
      yearno: selectedYear?.slice(-2),
      prpname:
        propertyData.find((p) => String(p.PrpCode) === String(order.PrpCode))?.LngName ||
        (String(selectedProperty?.PrpCode) === String(order.PrpCode) ? selectedProperty?.LngName : '') ||
        '',
    };
    nav.push('summary', {
      ctx,
      initialMode: 'EDIT',
      uid: order.UId === undefined || order.UId === null ? '0' : String(order.UId),
    });
  };

  const confirmDelete = async () => {
    const item = deleteItem;
    if (!item) return;
    try {
      setDeleting(true);
      const res = await deleteOrder(API, token, {
        Mode: '',
        uid: item.UId || 0,
        prpcode: item.PrpCode,
        yearno: yy(selectedYear),
        strcode: item.StrCode || '002',
      });
      if (res.success) {
        setDeleteItem(null);
        setDeleteSuccessVisible(true);
      } else {
        AppAlert.alert('Delete Failed', res.message || 'Unable to delete order');
      }
    } catch (error: any) {
      console.log('[YarnSalesOrderNEW] delete error', error?.response?.data || error?.message);
      AppAlert.alert('Error', errorMessage(error, 'Something went wrong while deleting'));
    } finally {
      setDeleting(false);
    }
  };

  const filteredOrders = useMemo(() => filterOrders(orders, search), [orders, search]);

  const renderItem = ({ item }: { item: Row }) => {
    const auth = isAuthorised(item);
    const tone = auth ? T.green : T.amber;
    return (
      <View style={[st.cell, cols > 1 && { width: `${100 / cols}%` as any }]}>
        <TouchableOpacity
          activeOpacity={0.85}
          style={st.card}
          onPress={() => openExistingOrder(item)}
          accessibilityRole="button"
          accessibilityLabel={`Sales order ${getSONo(item)}, ${item.ParName || ''}`}
        >
          <View style={st.cardHead}>
            <View style={st.soIcon}>
              <Icon name="receipt-long" size={20} color={T.copper} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={st.soNo} numberOfLines={1}>{getSONo(item)}</Text>
              <Text style={st.soDate} numberOfLines={1}>SO Date : {getSODate(item)}</Text>
            </View>
            <View style={[st.status, { backgroundColor: `${tone}1A`, borderColor: `${tone}55` }]}>
              <Text style={[st.statusText, { color: tone }]} numberOfLines={1}>{item.AuthStatus || 'Pending'}</Text>
            </View>
          </View>

          <View style={st.party}>
            <Text style={st.partyName} numberOfLines={1}>{item.ParName || '-'}</Text>
            <View style={st.partyMeta}>
              <Icon name="badge" size={14} color={T.muted} />
              <Text style={st.partyCode} numberOfLines={1}>{item.ParCode || '-'}</Text>
            </View>
          </View>

          <View style={st.cardFoot}>
            {!auth ? (
              <IconBtn icon="delete-outline" label="Delete sales order" tone="danger" color={T.red} onPress={() => setDeleteItem(item)} />
            ) : (
              <View />
            )}
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={st.miniLabel}>Net Amount</Text>
              <Text style={st.amount} numberOfLines={1}>₹ {item.NetAmt}</Text>
            </View>
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  const appliedLine = `${showYmd(filters.fromdate)} to ${showYmd(filters.todate)}  ·  ${
    filters.show_authorized ? 'Authorised' : 'Pending'
  }`;

  const filterCard = showFilter ? (
    <Card style={{ gap: 12 }}>
      <View style={[st.filterGrid, !isPhone && { flexDirection: 'row' }]}>
        <PickField
          label="Property"
          value={selectedProperty?.LngName}
          placeholder="Select Property"
          icon="business"
          onPress={() => setPropertyPickerVisible(true)}
          style={!isPhone && { flex: 1.4 }}
        />
        <PickField
          label="Year"
          value={selectedYear}
          placeholder="Select Year"
          icon="calendar-month"
          onPress={() => setYearPickerVisible(true)}
          style={!isPhone && { flex: 1 }}
        />
        <View style={[st.dateRow, !isPhone && { flex: 2 }]}>
          <View style={{ flex: 1, gap: 6 }}>
            <Text style={st.label}>From Date</Text>
            <DateField value={fromDate} onChange={setFromDate} />
          </View>
          <View style={{ flex: 1, gap: 6 }}>
            <Text style={st.label}>To Date</Text>
            <DateField value={toDate} onChange={setToDate} />
          </View>
        </View>
      </View>
      <View style={st.filterFoot}>
        <CheckRow
          label="Show Authorized Data"
          checked={filters.show_authorized}
          onToggle={() => setFilters((prev) => ({ ...prev, show_authorized: !prev.show_authorized }))}
        />
        <View style={st.filterBtns}>
          <Btn label="Reset" kind="ghost" onPress={resetFilter} style={{ flex: 1, minWidth: 96 }} />
          <Btn label="Apply Filter" icon="filter-alt" onPress={applyFilter} style={{ flex: 1.4, minWidth: 140 }} />
        </View>
      </View>
    </Card>
  ) : null;

  return (
    <View style={st.root}>
      <View style={st.top}>
        <View style={[CONTENT, st.toolbar]}>
          <SearchInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search order no, party name or code"
            style={{ flex: 1 }}
          />
          <IconBtn
            icon="tune"
            label={showFilter ? 'Hide filters' : 'Show filters'}
            tone={showFilter ? 'soft' : 'plain'}
            color={showFilter ? T.copper : T.nav}
            onPress={() => setShowFilter((v) => !v)}
          />
          <Btn label={isPhone ? 'New' : 'New Sales Order'} icon="add" kind="copper" compact onPress={addNewSalesOrder} style={{ height: 44 }} />
        </View>
      </View>

      <FlatList
        key={`cols-${cols}`}
        data={loading ? [] : filteredOrders}
        numColumns={cols}
        keyExtractor={(item, index) => `${item.UId}_${index}`}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.copper} />}
        contentContainerStyle={[CONTENT, st.listContent]}
        ListHeaderComponent={
          <View style={st.listHead}>
            {filterCard}
            <View style={st.metaRow}>
              <Text style={st.metaCount}>{loading ? 'Loading…' : `${filteredOrders.length} sales order${filteredOrders.length === 1 ? '' : 's'}`}</Text>
              <Text style={st.metaText} numberOfLines={1}>{appliedLine}</Text>
            </View>
            {loading ? <ListSkeleton rows={4} tall /> : null}
          </View>
        }
        ListEmptyComponent={
          loading ? null : (
            <EmptyState
              icon="receipt-long"
              title="No sales order found"
              text="Change the search or the filter, or create a new sales order."
            />
          )
        }
      />

      <PickerSheet
        open={propertyPickerVisible}
        title="Select Property"
        searchPlaceholder="Search property..."
        rows={propertyData}
        keyOf={(p) => String(p.PrpCode)}
        labelOf={(p) => String(p.LngName ?? '')}
        searchOf={(p) => String(p.LngName ?? '')}
        selectedKey={selectedProperty ? String(selectedProperty.PrpCode) : ''}
        onPick={(p) => {
          setSelectedProperty(p);
          setPropertyPickerVisible(false);
        }}
        onClose={() => setPropertyPickerVisible(false)}
      />

      <PickerSheet
        open={yearPickerVisible}
        title="Select Year"
        rows={yearOptions}
        keyOf={(y) => y}
        labelOf={(y) => y}
        selectedKey={selectedYear}
        onPick={pickYear}
        onClose={() => setYearPickerVisible(false)}
      />

      <Dialog
        open={!!deleteItem}
        icon="delete-outline"
        title="Delete Sales Order?"
        message={`Are you sure you want to delete SO No ${deleteItem?.SONo || '-'}? This action cannot be undone.`}
        onClose={() => (deleting ? undefined : setDeleteItem(null))}
        actions={
          <>
            <Btn label="No, Cancel" kind="ghost" onPress={() => setDeleteItem(null)} disabled={deleting} style={{ flex: 1 }} />
            <Btn label={deleting ? 'Deleting...' : 'Yes, Delete'} kind="danger" onPress={confirmDelete} loading={deleting} style={{ flex: 1 }} />
          </>
        }
      />

      <Dialog
        open={deleteSuccessVisible}
        tone="success"
        icon="check"
        title="Deleted Successfully"
        message="Sales order has been deleted."
        actions={
          <Btn
            label="OK"
            onPress={() => {
              setDeleteSuccessVisible(false);
              loadOrders(live.current.search);
            }}
            style={{ flex: 1 }}
          />
        }
      />
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  top: { backgroundColor: T.surface, borderBottomWidth: 1, borderBottomColor: T.border },
  toolbar: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 10 },

  listContent: { paddingHorizontal: 7, paddingTop: 12, paddingBottom: 32 },
  listHead: { paddingHorizontal: 5, gap: 10, marginBottom: 6 },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingHorizontal: 2 },
  metaCount: { fontSize: 12, fontWeight: '900', color: T.nav, letterSpacing: 0.6, textTransform: 'uppercase' },
  metaText: { flexShrink: 1, fontSize: 12, fontWeight: '600', color: T.muted },

  filterGrid: { gap: 12 },
  dateRow: { flexDirection: 'row', gap: 10 },
  label: { fontSize: 11, fontWeight: '800', color: T.muted, letterSpacing: 0.5, textTransform: 'uppercase' },
  filterFoot: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  filterBtns: { flexDirection: 'row', gap: 10, flexGrow: 1, justifyContent: 'flex-end' },

  cell: { width: '100%', padding: 5 },
  card: {
    flex: 1,
    backgroundColor: T.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: T.border,
    padding: 14,
    gap: 12,
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  soIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: `${T.copper}14`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  soNo: { fontSize: 15, fontWeight: '900', color: T.ink },
  soDate: { fontSize: 12, fontWeight: '600', color: T.muted, marginTop: 2 },
  status: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 14, borderWidth: 1, maxWidth: 130 },
  statusText: { fontSize: 11, fontWeight: '800' },
  party: { gap: 4 },
  partyName: { fontSize: 14, fontWeight: '800', color: T.nav },
  partyMeta: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  partyCode: { fontSize: 12, fontWeight: '700', color: T.muted },
  cardFoot: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: T.hair,
    paddingTop: 10,
  },
  miniLabel: { fontSize: 10.5, fontWeight: '700', color: T.muted, letterSpacing: 0.3, textTransform: 'uppercase' },
  amount: { fontSize: 16, fontWeight: '900', color: T.green, marginTop: 2 },
});
