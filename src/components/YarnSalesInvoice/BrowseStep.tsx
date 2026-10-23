// FILE: src/components/SalesInvoiceBrowse/BrowseStep.tsx
// Sales Invoice — BROWSE ONLY (web + mobile). Same card look as the Yarn Sales Order list, NEW theme.
//   - top bar: search, Multi Print icon, Filters button (criteria drawer like Taka History)
//   - criteria drawer: Property, Year, Store, From / To date -> Load
//   - list API: GET /api/invoicebrowse (page / limit blank)
//   - cards are NOT clickable; the Print icon prints that one invoice (saleschallanmultiprintnew)
//   - Multi Print icon opens the multi print dialog (Sales A/c, voucher / date range, parties, print type)
import { AppAlert } from '@/common/utils/appAlert';
import { Btn, DateField, EmptyState, IconBtn, PickField } from '@/src/components/erpUi';
import { T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { browseInvoices, errorMessage, fetchPropertyData, fetchStores, pdfUrlOf, printInvoice } from './api';
import FilterDrawer from './FilterDrawer';
import {
  BrowseFilters,
  buildYearOptions,
  filterInvoices,
  financialYearDates,
  getBalAmt,
  getInvDate,
  getInvNo,
  getNetAmt,
  getUid,
  isEwayCancelled,
  isIrnCancelled,
  isoDate,
  parseSlashDmy,
  Row,
  show,
  showIso,
  splitBillNo,
  storeCode,
  storeName,
} from './model';
import MultiPrintModal, { MultiPrintSeed } from './MultiPrintModal';
import { CONTENT, ListSkeleton, PickerSheet, SearchInput, useCols } from './ui';

type Props = { token: string; API: string; onOpenPdf: (pdfUrl: string, title: string) => void };

const emptyFilters = (): BrowseFilters => ({ prpcode: '', yearno: '', strcode: '', fromdate: '', todate: '' });

export default function BrowseStep({ token, API, onOpenPdf }: Props) {
  const { cols } = useCols();

  const yearOptions = useMemo(() => buildYearOptions(), []);
  const [selectedYear, setSelectedYear] = useState(yearOptions[0]);
  const [propertyData, setPropertyData] = useState<Row[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<Row | null>(null);
  const [storeData, setStoreData] = useState<Row[]>([]);
  const [selectedStore, setSelectedStore] = useState<Row | null>(null);
  const [propertyPickerVisible, setPropertyPickerVisible] = useState(false);
  const [storePickerVisible, setStorePickerVisible] = useState(false);
  const [yearPickerVisible, setYearPickerVisible] = useState(false);

  const [fromDate, setFromDate] = useState<Date>(new Date());
  const [toDate, setToDate] = useState<Date>(new Date());

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loaded, setLoaded] = useState(false); // false until the first Load
  const [filters, setFilters] = useState<BrowseFilters>(emptyFilters);

  const [search, setSearch] = useState('');
  const [invoices, setInvoices] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [printing, setPrinting] = useState(false);
  const [mpOpen, setMpOpen] = useState(false);

  const loadSeq = useRef(0);
  const aliveRef = useRef(true);
  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  const live = useRef({ filters, search, loaded });
  live.current = { filters, search, loaded };

  const loadInvoices = useCallback(
    async (text: string, f?: BrowseFilters) => {
      const active = f || live.current.filters;
      const seq = ++loadSeq.current;
      setLoading(true);
      const data = await browseInvoices(API, token, text, active, active.yearno);
      if (!aliveRef.current || seq !== loadSeq.current) return;
      setInvoices(data);
      setLoading(false);
      setRefreshing(false);
    },
    [API, token],
  );

  // Property list — a single property is picked for you
  useEffect(() => {
    if (!token) return;
    let alive = true;
    fetchPropertyData(API, token).then((data) => {
      if (!alive) return;
      const list = data || [];
      setPropertyData(list);
      if (list.length === 1) setSelectedProperty(list[0]);
    });
    return () => {
      alive = false;
    };
  }, [API, token]);

  // Store list — follows the picked property / year; a single store is picked for you
  useEffect(() => {
    const prp = selectedProperty?.PrpCode;
    if (!token || !prp) {
      setStoreData([]);
      setSelectedStore(null);
      return;
    }
    let alive = true;
    fetchStores(API, token, String(prp), selectedYear).then((list) => {
      if (!alive) return;
      setStoreData(list);
      setSelectedStore((prev) => {
        const keep = prev && list.find((s) => storeCode(s) === storeCode(prev));
        return keep || (list.length === 1 ? list[0] : null);
      });
    });
    return () => {
      alive = false;
    };
  }, [API, token, selectedProperty?.PrpCode, selectedYear]);

  // Search (500 ms) — server search + on-screen filter, only once the list has been loaded
  useEffect(() => {
    if (!live.current.loaded) return;
    const t = setTimeout(() => loadInvoices(search), 500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

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
    if (!selectedProperty?.PrpCode) {
      AppAlert.alert('Required', 'Please select property');
      return;
    }
    if (!selectedYear) {
      AppAlert.alert('Required', 'Please select year');
      return;
    }
    if (!selectedStore) {
      AppAlert.alert('Required', 'Please select store');
      return;
    }
    const next: BrowseFilters = {
      prpcode: String(selectedProperty.PrpCode),
      yearno: selectedYear,
      strcode: storeCode(selectedStore),
      fromdate: fromDate ? isoDate(fromDate) : '',
      todate: toDate ? isoDate(toDate) : '',
    };
    setFilters(next);
    setLoaded(true);
    setDrawerOpen(false);
    loadInvoices(search, next);
  };

  const onRefresh = useCallback(() => {
    if (!live.current.loaded) {
      setRefreshing(false);
      return;
    }
    setRefreshing(true);
    loadInvoices(live.current.search);
  }, [loadInvoices]);

  const filteredInvoices = useMemo(() => filterInvoices(invoices, search), [invoices, search]);

  /* ---------------- print ---------------- */
  const printOne = async (item: Row) => {
    const uid = getUid(item);
    if (!uid || printing) return;
    const ctx = {
      prpcode: filters.prpcode,
      strcode: item.strcode || item.StrCode || filters.strcode,
      yearno: filters.yearno,
    };
    try {
      setPrinting(true);
      const data = await printInvoice(API, token, ctx, uid, 'ROne');
      if (data?.success === true) {
        const pdfUrl = pdfUrlOf(data);
        if (!pdfUrl) {
          AppAlert.alert('PDF Error', 'PDF URL not found.');
          return;
        }
        onOpenPdf(pdfUrl, `Invoice ${getInvNo(item)}`);
      } else {
        AppAlert.alert('PDF Failed', data?.message || 'PDF generation failed.');
      }
    } catch (error: any) {
      console.log('[SalesInvoiceBrowse] print error', error?.response?.data || error?.message);
      AppAlert.alert('Error', errorMessage(error, 'Unable to generate PDF.'));
    } finally {
      if (aliveRef.current) setPrinting(false);
    }
  };

  const openMultiPrint = () => {
    if (!loaded) {
      setDrawerOpen(true);
      AppAlert.alert('Multi Print', 'Please select Property and Store, then tap Load first');
      return;
    }
    setMpOpen(true);
  };

  // voucher / date of the newest loaded invoice pre-fill the multi print dialog
  const mpSeed: MultiPrintSeed = useMemo(() => {
    const first = invoices[0];
    const { no, series } = splitBillNo(first?.BillNo);
    return { no, series, date: parseSlashDmy(first?.ChalDate) || new Date() };
  }, [invoices]);

  /* ---------------- render ---------------- */
  const InfoCell = ({ icon, label, value }: { icon: string; label: string; value: any }) => (
    <View style={st.cellInfo}>
      <View style={st.cellLabelRow}>
        <Icon name={icon as any} size={13} color={T.muted} />
        <Text style={st.miniLabel} numberOfLines={1}>{label}</Text>
      </View>
      <Text style={st.cellValue} numberOfLines={1}>{show(value)}</Text>
    </View>
  );

  const renderItem = ({ item }: { item: Row }) => {
    const irnCancelled = isIrnCancelled(item);
    const hasAck = String(item.ackno || '').trim() !== '';
    const tone = irnCancelled ? T.red : hasAck ? T.green : T.amber;
    const statusText = irnCancelled ? 'IRN Cancelled' : hasAck ? 'IRN Done' : 'Pending';
    return (
      <View style={[st.cell, cols > 1 && { width: `${100 / cols}%` as any }]}>
        <View style={st.card}>
          <View style={st.cardHead}>
            <View style={st.soIcon}>
              <Icon name="receipt-long" size={20} color={T.copper} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={st.soNo} numberOfLines={1}>{getInvNo(item)}</Text>
              <Text style={st.soDate} numberOfLines={1}>Bill Date : {getInvDate(item)}</Text>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 4 }}>
              <View style={[st.status, { backgroundColor: `${tone}1A`, borderColor: `${tone}55` }]}>
                <Text style={[st.statusText, { color: tone }]} numberOfLines={1}>{statusText}</Text>
              </View>
              {isEwayCancelled(item) ? (
                <View style={[st.status, { backgroundColor: `${T.red}1A`, borderColor: `${T.red}55` }]}>
                  <Text style={[st.statusText, { color: T.red }]} numberOfLines={1}>E-Way Cancelled</Text>
                </View>
              ) : null}
            </View>
          </View>

          <Text style={st.partyName} numberOfLines={1}>{show(item.ParName)}</Text>

          <View style={st.grid}>
            <InfoCell icon="verified" label="Ack No" value={item.ackno} />
            <InfoCell icon="local-shipping" label="E-Way No" value={item.ewayno} />
            <InfoCell icon="directions-car" label="Vehicle No" value={item.VehNo} />
            <InfoCell icon="description" label="Form Iss" value={item.FormIss} />
          </View>

          <View style={st.addrBox}>
            <View style={st.addrRow}>
              <Icon name="home" size={15} color={T.muted} />
              <Text style={st.addrText} numberOfLines={2}>
                <Text style={st.addrKey}>Billing  </Text>{show(item.BAdd)}
              </Text>
            </View>
            <View style={st.addrRow}>
              <Icon name="place" size={15} color={T.muted} />
              <Text style={st.addrText} numberOfLines={2}>
                <Text style={st.addrKey}>Delivery  </Text>{show(item.DAdd)}
              </Text>
            </View>
            <View style={st.addrRow}>
              <Icon name="notes" size={15} color={T.muted} />
              <Text style={st.addrText} numberOfLines={2}>
                <Text style={st.addrKey}>Remark  </Text>{show(item.Remark)}
              </Text>
            </View>
          </View>

          <View style={st.cardFoot}>
            <IconBtn icon="print" label="Print invoice" tone="soft" color={T.copper} onPress={() => printOne(item)} />
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={st.miniLabel}>Balance  <Text style={st.balance}>₹ {getBalAmt(item)}</Text></Text>
              <Text style={st.miniLabel}>Net Amount</Text>
              <Text style={st.amount} numberOfLines={1}>₹ {getNetAmt(item)}</Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  const appliedLine = `${showIso(filters.fromdate)} to ${showIso(filters.todate)}`;

  return (
    <View style={st.root}>
      <View style={st.top}>
        <View style={[CONTENT, st.toolbar]}>
          <SearchInput value={search} onChangeText={setSearch} placeholder="Search bill no, party, ack / e-way no" style={{ flex: 1 }} />
          <IconBtn icon="library-books" label="Multi print" tone="soft" color={T.copper} onPress={openMultiPrint} />
          <Btn label="Filters" icon="tune" compact onPress={() => setDrawerOpen(true)} style={{ height: 44 }} />
        </View>
      </View>

      <FlatList
        key={`cols-${cols}`}
        data={loaded && !loading ? filteredInvoices : []}
        numColumns={cols}
        keyExtractor={(item, index) => `${getUid(item)}_${index}`}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.copper} />}
        contentContainerStyle={[CONTENT, st.listContent]}
        ListHeaderComponent={
          <View style={st.listHead}>
            <View style={st.metaRow}>
              <Text style={st.metaCount}>
                {!loaded
                  ? 'Choose filters to load invoices'
                  : loading
                    ? 'Loading…'
                    : `${filteredInvoices.length} invoice${filteredInvoices.length === 1 ? '' : 's'}`}
              </Text>
              {loaded ? <Text style={st.metaText} numberOfLines={1}>{appliedLine}</Text> : null}
            </View>
            {loaded && loading ? <ListSkeleton rows={4} tall /> : null}
          </View>
        }
        ListEmptyComponent={
          loading ? null : !loaded ? (
            <View style={{ alignItems: 'center', gap: 14 }}>
              <EmptyState
                icon="receipt-long"
                title="No data available"
                text="Choose property and store, then tap Load to see the Multiprints."
              />
              <Btn label="Open filters" icon="tune" onPress={() => setDrawerOpen(true)} />
            </View>
          ) : (
            <EmptyState icon="receipt-long" title="No invoice found" text="Change the search or the filters." />
          )
        }
      />

      <FilterDrawer
        open={drawerOpen}
        kicker="Multiprint"
        title="Filters"
        onClose={() => setDrawerOpen(false)}
        onSubmit={applyFilter}
        loading={loading}
      >
        <PickField
          label="Property *"
          value={selectedProperty?.LngName}
          placeholder="Select property"
          icon="business"
          onPress={() => setPropertyPickerVisible(true)}
        />
        <PickField
          label="Year *"
          value={selectedYear}
          placeholder="Select year"
          icon="calendar-month"
          onPress={() => setYearPickerVisible(true)}
        />
        <PickField
          label="Store *"
          value={selectedStore ? storeName(selectedStore) : ''}
          placeholder={selectedProperty ? 'Select store' : 'Select property first'}
          icon="store"
          onPress={() => (selectedProperty ? setStorePickerVisible(true) : AppAlert.alert('Required', 'Please select property first'))}
        />
        <View style={st.dateRow}>
          <View style={{ flex: 1, gap: 6 }}>
            <Text style={st.label}>From Date</Text>
            <DateField value={fromDate} onChange={setFromDate} />
          </View>
          <View style={{ flex: 1, gap: 6 }}>
            <Text style={st.label}>To Date</Text>
            <DateField value={toDate} onChange={setToDate} />
          </View>
        </View>
      </FilterDrawer>

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
        open={storePickerVisible}
        title="Select Store"
        searchPlaceholder="Search store..."
        rows={storeData}
        keyOf={(s) => storeCode(s)}
        labelOf={(s) => storeName(s)}
        searchOf={(s) => storeName(s)}
        selectedKey={selectedStore ? storeCode(selectedStore) : ''}
        onPick={(s) => {
          setSelectedStore(s);
          setStorePickerVisible(false);
        }}
        onClose={() => setStorePickerVisible(false)}
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

      <MultiPrintModal
        open={mpOpen}
        onClose={() => setMpOpen(false)}
        API={API}
        token={token}
        ctx={{ prpcode: filters.prpcode, yearno: filters.yearno, strcode: filters.strcode }}
        seed={mpSeed}
        onPdf={onOpenPdf}
      />

      {printing ? (
        <View style={st.overlay}>
          <View style={st.overlayBox}>
            <ActivityIndicator size="large" color={T.copper} />
            <Text style={st.overlayText}>Preparing PDF…</Text>
          </View>
        </View>
      ) : null}
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

  dateRow: { flexDirection: 'row', gap: 10 },
  label: { fontSize: 11, fontWeight: '800', color: T.muted, letterSpacing: 0.5, textTransform: 'uppercase' },

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
  cardHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
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
  status: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 14, borderWidth: 1, maxWidth: 140 },
  statusText: { fontSize: 11, fontWeight: '800' },
  partyName: { fontSize: 14, fontWeight: '800', color: T.nav },

  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 10 },
  cellInfo: { width: '50%', paddingRight: 8, gap: 2 },
  cellLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cellValue: { fontSize: 12.5, fontWeight: '700', color: T.ink },

  addrBox: { gap: 6, padding: 10, borderRadius: 10, backgroundColor: T.bg },
  addrRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  addrText: { flex: 1, fontSize: 12, fontWeight: '600', color: T.nav, lineHeight: 17 },
  addrKey: { fontSize: 10.5, fontWeight: '800', color: T.muted, textTransform: 'uppercase', letterSpacing: 0.3 },

  cardFoot: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: T.hair,
    paddingTop: 10,
  },
  miniLabel: { fontSize: 10.5, fontWeight: '700', color: T.muted, letterSpacing: 0.3, textTransform: 'uppercase' },
  balance: { fontSize: 11.5, fontWeight: '800', color: T.red },
  amount: { fontSize: 16, fontWeight: '900', color: T.green, marginTop: 2 },

  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 50,
  },
  overlayBox: { backgroundColor: T.surface, borderRadius: 14, paddingVertical: 20, paddingHorizontal: 28, alignItems: 'center', gap: 10 },
  overlayText: { fontSize: 13.5, fontWeight: '700', color: T.nav },
});
