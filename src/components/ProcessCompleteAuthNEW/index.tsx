// FILE: src/components/ProcessCompleteAuthNEW/index.tsx
// NEW ERP — Process Complete Auth (replaces legacy
//   src/components/ProcessCompleteAuth/index.tsx, CriteriaForm.tsx, PCAcard.tsx,
//   route app/(tabs)/process-complete-auth.tsx).
// APIs (same as legacy, host = `API` prop, Bearer = `token` prop):
//   POST ${API}/api/get_process_complete_data     { chkldcldata:1, chkrpt:0, prptype, txntype:'mobile_api' }
//   POST ${API}/api/insert_process_complete_data  { prptype, yearno:item.YearNo, prpcode:item.PrpCode,
//                                                   txntype:'mobile_api', chkldcldata:1, chkrpt:0, rows:[item] }
//   GET  ${API}/api/get_criterion?prptype=<user_prptype>&txntype=''&fetch=prp   (legacy fetchAllPropertyData)
//   GET  ${API}/api/getyear { prpcode }                                         (legacy fetchAllYeardata)
// AsyncStorage keys read: 'user_prptype'.
// Flow: on mount (token) → properties + auto-load with user_prptype (only when set);
// card Save → confirm → insert → alert(message) → reload with the same prptype.
import { TruncText } from '@/src/components/ui/TruncText';
import AppAlert from '@/common/utils/appAlert';
import AsyncStorage from '@/common/utils/compatibleStorage';
import { T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { Sheet } from '../StockVerificationNEW/ui';
import {
  fetchAllPropertyData,
  fetchAllYeardata,
  getProcessCompleteData,
  insertProcessCompleteData,
  Row,
} from './api';
import CriteriaSheet, { Criteria } from './CriteriaSheet';
import PCACard from './PCACard';

const PAGE = 20; // legacy PCAcard chunk size
const EXCLUDED_SEARCH_KEYS = ['GradUId', 'Gruid', 'PrUid', 'ProcessUId'];

const num = (x: any) => {
  const n = parseFloat(String(x ?? '').replace(/,/g, ''));
  return isNaN(n) ? 0 : n;
};
const fmt = (n: number) => (Math.round(n * 1000) / 1000).toLocaleString('en-IN', { maximumFractionDigits: 3 });

type TabKey = 'request' | 'all';

type Props = { token: string; API: string; username?: string };

export default function ProcessCompleteAuthNEW({ token, API }: Props) {
  const { width } = useWindowDimensions();
  const cols = width >= 1180 ? 3 : width >= 768 ? 2 : 1;

  // ---- legacy state ----
  const [criteriaFormOpen, setCriteriaFormOpen] = useState(false);
  const [getAllPropertyData, setAllPropertyData] = useState<Row[]>([]);
  const [getAllYearData, setAllYearData] = useState<Row[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [FormState, setFormState] = useState<{ values: Criteria }>({ values: { StrCode: '' } });
  const [fromDate, setFromDate] = useState(new Date());
  const [toDate, setToDate] = useState(new Date());
  const [getAllData, setAllData] = useState<Row[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [getSelectedRow, setSelectedRow] = useState<Row>({});
  const [getModalOpen, setModalOpen] = useState(false);
  const [getPrpType, setPrpType] = useState<string | null>('');
  const [loadedOnce, setLoadedOnce] = useState(false);

  // ---- tabs: 'request' (baad me) | 'all' (current screen) ----
  const [activeTab, setActiveTab] = useState<TabKey>('all');

  // ---- PCAcard paging state ----
  const [page, setPage] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // token → today's dates + property master
  useEffect(() => {
    if (!token) return;
    const today = new Date();
    setFromDate(today);
    setToDate(today);
    (async () => {
      const allprpdata = await fetchAllPropertyData(API, token);
      setAllPropertyData(allprpdata);
    })();
  }, [token, API]);

  // property → year master
  useEffect(() => {
    if (!token) return;
    const p = FormState.values.PrpCode;
    if (typeof p != 'undefined' && p != null && p != '') {
      (async () => {
        const allyeardata = await fetchAllYeardata(API, token, p);
        setAllYearData(allyeardata);
      })();
    }
  }, [FormState.values.PrpCode, token, API]);

  /** legacy handleConfirmAction(ptye) */
  const handleConfirmAction = async (ptye: any = '') => {
    setIsLoading(true);
    const userPtype = await AsyncStorage.getItem('user_prptype');
    console.log('userPtype :', userPtype);
    try {
      const data = await getProcessCompleteData(API, token, ptye);
      if (data.success === true && data.data.length === 0) {
        AppAlert.alert('No Data Found');
        setAllData([]);
      } else if (data.success === true && data.data.length > 0) {
        setAllData(data.data);
      } else if (data.success === false) {
        AppAlert.alert(`${data.message}`);
        setAllData([]);
      } else {
        AppAlert.alert(`${data.message}`);
        setAllData([]);
      }
    } catch (error) {
      setIsLoading(false);
      setAllData([]);
      AppAlert.alert('Server Error');
    } finally {
      setIsLoading(false);
      setLoadedOnce(true);
      setCriteriaFormOpen(false);
    }
  };

  /** legacy handleSave(item) */
  const handleSave = async (item: Row) => {
    setModalOpen(false);
    setIsLoading(true);
    try {
      const data = await insertProcessCompleteData(API, token, getPrpType, item);
      if (data.success === true) {
        AppAlert.alert(`${data.message}`);
        setAllData([]);
      } else if (data.success === false) {
        AppAlert.alert(`${data.message}`);
      } else {
        AppAlert.alert(`${data.message}`);
      }
    } catch (error) {
      AppAlert.alert('Server Error');
    } finally {
      handleConfirmAction(getPrpType);
    }
  };

  // token → read user_prptype and auto-load when present
  useEffect(() => {
    (async () => {
      if (!token) return;
      const userPtype = await AsyncStorage.getItem('user_prptype');
      setPrpType(userPtype);
      if (typeof userPtype != 'undefined' && userPtype != null && userPtype != '') handleConfirmAction(userPtype);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, API]);

  // ---- legacy PCAcard search (string values, excluded uid keys) ----
  const tabData = useMemo(
    () => activeTab === 'request'
      ? (getAllData || []).filter((item) => String(item?.ProcessCompleteRequest ?? '').trim() === '1')
      : (getAllData || []),
    [getAllData, activeTab],
  );

  const filteredData = useMemo(() => {
    const src = tabData;
    const q = searchQuery.trim().toLowerCase();
    if (!q) return src;
    return src.filter((item) =>
      Object.entries(item).some(
        ([key, value]) => !EXCLUDED_SEARCH_KEYS.includes(key) && typeof value === 'string' && value.toLowerCase().includes(q),
      ),
    );
  }, [tabData, searchQuery]);

  useEffect(() => { setPage(1); }, [getAllData, searchQuery, activeTab]);

  const visible = useMemo(() => filteredData.slice(0, page * PAGE), [filteredData, page]);

  const loadMoreData = () => {
    if (isLoadingMore) return;
    if (filteredData.slice(page * PAGE, page * PAGE + PAGE).length === 0) return;
    setIsLoadingMore(true);
    setTimeout(() => {
      setPage((p) => p + 1);
      setIsLoadingMore(false);
    }, 300);
  };

  const handleCardPress = useCallback((item: Row) => {
    setSelectedRow(item);
    setModalOpen(true);
  }, []);

  const stats = useMemo(() => ({
    total: tabData.length,
    dyeQty: tabData.reduce((a, r) => a + num(r?.NetWt), 0),
    packQty: tabData.reduce((a, r) => a + num(r?.PQty), 0),
  }), [tabData]);

  // ------------------------------- UI ----------------------------------
  const summary = (
    <View style={s.summary}>
      <View style={s.kpiWrap}>
        <Kpi label="Records" value={String(stats.total)} color="#fff" />
        <Kpi label="Dyeing qty" value={fmt(stats.dyeQty)} color={T.copper} />
        <Kpi label="Packing qty" value={fmt(stats.packQty)} color="#8FD1AE" />
      </View>
      <View style={s.toolbar}>
        <View style={s.search}>
          <Icon name="search" size={18} color={T.muted} />
          <TextInput value={searchQuery} onChangeText={setSearchQuery}
            placeholder="Search party, quality, batch, packing no…"
            placeholderTextColor={T.muted} style={s.searchInput}
            autoCorrect={false} autoCapitalize="none" />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityLabel="Clear search">
              <Icon name="close" size={18} color={T.muted} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
      {tabData.length ? <Text style={s.listInfo}>{filteredData.length} of {tabData.length} records</Text> : null}
    </View>
  );

  const empty = isLoading ? (
    <View style={s.empty}><ActivityIndicator color={T.copper} /><Text style={s.emptyText}>Loading…</Text></View>
  ) : (
    <View style={s.empty}>
      <Icon name={getAllData.length ? 'search-off' : 'inventory-2'} size={42} color={T.border} />
      <Text style={s.emptyTitle}>No data found!</Text>
      {!loadedOnce && !getPrpType ? (
        <Text style={s.emptyText}>Use the criteria button to load data.</Text>
      ) : getAllData.length ? (
        <Text style={s.emptyText}>Change the search text.</Text>
      ) : null}
    </View>
  );

  const sel = getSelectedRow || {};

  return (
    <View style={s.root}>
      {/* Request / All tabs and shared criteria + refresh actions */}
      <View style={s.tabsOuter}>
        <View style={s.tabsRow}>
          <View style={s.tabs} accessibilityRole="tablist">
            <TabBtn label="Request" count={getAllData.filter((item) => String(item?.ProcessCompleteRequest ?? '').trim() === '1').length} active={activeTab === 'request'} onPress={() => setActiveTab('request')} />
            <TabBtn label="All" count={loadedOnce ? getAllData.length : undefined} active={activeTab === 'all'} onPress={() => setActiveTab('all')} />
          </View>
          <TouchableOpacity style={s.iconBtn} onPress={() => setCriteriaFormOpen(true)} accessibilityLabel="Criteria">
            <Icon name="tune" size={20} color={T.nav} />
          </TouchableOpacity>
          <TouchableOpacity style={s.iconBtn} onPress={() => handleConfirmAction(getPrpType)} disabled={isLoading} accessibilityLabel="Refresh">
            <Icon name="refresh" size={20} color={T.nav} />
          </TouchableOpacity>
        </View>
      </View>

      {summary}

      <FlatList
        key={`cols-${cols}-${activeTab}`}
        data={visible}
        numColumns={cols}
        keyExtractor={(item, index) => String(item?.PrUid ?? item?.Gruid ?? index)}
        renderItem={({ item }) => (
          <View style={{ flex: 1 / cols, padding: cols > 1 ? 6 : 0, paddingVertical: 6 }}>
            <PCACard item={item} onSave={handleCardPress} />
          </View>
        )}
        ListEmptyComponent={empty}
        ListFooterComponent={isLoadingMore ? <ActivityIndicator color={T.copper} style={{ marginVertical: 12 }} /> : null}
        contentContainerStyle={s.listContent}
        onEndReached={loadMoreData}
        onEndReachedThreshold={0.5}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={10}
        keyboardShouldPersistTaps="handled"
      />

      {isLoading ? (
        <View style={s.loader} pointerEvents="auto">
          <View style={s.loaderBox}><ActivityIndicator size="large" color={T.copper} /></View>
        </View>
      ) : null}

      <CriteriaSheet
        open={criteriaFormOpen}
        onClose={() => setCriteriaFormOpen(false)}
        isLoading={isLoading}
        values={FormState.values}
        setValues={(fn) => setFormState((fs) => ({ ...fs, values: fn(fs.values) }))}
        properties={getAllPropertyData}
        years={getAllYearData}
        fromDate={fromDate}
        toDate={toDate}
        onFromDateChange={setFromDate}
        onToDateChange={setToDate}
        onLoad={() => handleConfirmAction(getPrpType)}
      />

      <Sheet
        open={getModalOpen}
        onClose={() => setModalOpen(false)}
        eyebrow="SAVE CONFIRM"
        title="Are you sure you want to save ?"
        wideMax={520}
        footer={
          <>
            <TouchableOpacity style={[s.fBtn, s.fNo]} onPress={() => setModalOpen(false)} accessibilityRole="button">
              <Text style={[s.fBtnText, { color: T.red }]}>No</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.fBtn, { backgroundColor: T.green }]} onPress={() => handleSave(getSelectedRow)} accessibilityRole="button">
              <Icon name="check" size={18} color="#fff" />
              <Text style={[s.fBtnText, { color: '#fff' }]}>Yes</Text>
            </TouchableOpacity>
          </>
        }
      >
        <View style={s.kv}>
          <KV k="Party" v={sel.PartyNames} full />
          <KV k="Property" v={sel.PrpCode} />
          <KV k="Packing no." v={sel.PackingNo} />
          <KV k="Pack. date" v={sel.PackDate} />
          <KV k="Quality" v={sel.ItmName} />
          <KV k="Batch no" v={sel.MerName} />
          <KV k="Shade" v={sel.ShdName} />
          <KV k="Net wt." v={sel.NetWt} />
          <KV k="Dyeing no. of cones" v={sel.Cones} />
          <KV k="Dyeing qty." v={sel.NetWt} />
          <KV k="Packing no. of cones" v="Need To Confirm" />
          <KV k="Packing qty." v="Need To Confirm" />
          <KV k="Prod. type" v={sel.ProdType} />
        </View>
      </Sheet>
    </View>
  );
}

function TabBtn({ label, count, active, onPress }: { label: string; count?: number; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      style={[s.tab, active && s.tabActive]}
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
    >
      <Text style={[s.tabText, active && s.tabTextActive]}>{label}</Text>
      {typeof count === 'number' ? (
        <View style={[s.tabBadge, active && s.tabBadgeActive]}>
          <Text style={[s.tabBadgeText, active && { color: '#fff' }]}>{count}</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

function Kpi({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={s.kpi}>
      <TruncText style={s.kpiLabel} numberOfLines={1}>{label}</TruncText>
      <Text style={[s.kpiValue, { color }]} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
    </View>
  );
}

function KV({ k, v, full }: { k: string; v: any; full?: boolean }) {
  return (
    <View style={[s.kvItem, full && { width: '100%' }]}>
      <TruncText style={s.kvK} numberOfLines={1}>{k}</TruncText>
      <Text style={s.kvV}>{v === null || v === undefined || v === '' ? '—' : String(v)}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  summary: { width: '100%', maxWidth: 1200, alignSelf: 'center', paddingHorizontal: 12, paddingTop: 12, gap: 12 },
  listContent: { paddingHorizontal: 12, paddingBottom: 12, width: '100%', maxWidth: 1200, alignSelf: 'center', flexGrow: 1 },
  kpiWrap: { flexDirection: 'row', gap: 8, backgroundColor: T.nav, borderRadius: 14, padding: 10 },
  kpi: { flex: 1, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 10, minWidth: 0 },
  kpiLabel: { fontSize: 10, fontWeight: '800', color: 'rgba(255,255,255,0.6)', letterSpacing: 0.6, textTransform: 'uppercase' },
  kpiValue: { fontSize: 16, fontWeight: '800', marginTop: 2 },
  tabsOuter: { width: '100%', maxWidth: 1200, alignSelf: 'center', paddingHorizontal: 12, paddingTop: 12 },
  tabsRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tabs: { flex: 1, flexDirection: 'row', gap: 4, padding: 4, borderRadius: 12, borderWidth: 1, borderColor: T.border, backgroundColor: T.surface },
  tab: { flex: 1, height: 38, borderRadius: 9, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  tabActive: { backgroundColor: T.nav },
  tabText: { fontSize: 13.5, fontWeight: '800', color: T.muted },
  tabTextActive: { color: '#fff' },
  tabBadge: { minWidth: 22, paddingHorizontal: 6, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: T.border },
  tabBadgeActive: { backgroundColor: T.copper },
  tabBadgeText: { fontSize: 10.5, fontWeight: '800', color: T.nav },
  toolbar: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  search: { flex: 1, minWidth: 0, height: 44, flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 10, borderWidth: 1, borderColor: T.border, backgroundColor: T.surface, paddingHorizontal: 12 },
  searchInput: { flex: 1, minWidth: 0, fontSize: 14, color: T.ink, height: 42 },
  iconBtn: { width: 44, height: 44, borderRadius: 10, borderWidth: 1, borderColor: T.border, backgroundColor: T.surface, alignItems: 'center', justifyContent: 'center' },
  listInfo: { fontSize: 12, fontWeight: '700', color: T.nav },
  empty: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 24, gap: 6 },
  emptyTitle: { fontSize: 15, fontWeight: '800', color: T.nav },
  emptyText: { fontSize: 13, color: T.muted, textAlign: 'center' },
  loader: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(13,27,42,0.25)', alignItems: 'center', justifyContent: 'center', zIndex: 50 },
  loaderBox: { width: 72, height: 72, borderRadius: 16, backgroundColor: T.surface, alignItems: 'center', justifyContent: 'center' },
  kv: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 10 },
  kvItem: { width: '50%', paddingRight: 8 },
  kvK: { fontSize: 10.5, fontWeight: '800', color: T.muted, textTransform: 'uppercase', letterSpacing: 0.4 },
  kvV: { fontSize: 14, fontWeight: '700', color: T.ink, marginTop: 1 },
  fBtn: { flex: 1, height: 44, borderRadius: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  fNo: { borderWidth: 1, borderColor: T.red, backgroundColor: T.surface },
  fBtnText: { fontSize: 14, fontWeight: '800' },
});
