// FILE: src/components/ProcessCompleteRequestNew/ProcessCompleteRequestNew.tsx
// NEW ERP — Process Complete Request  (Pending / Request tabs)
//
// Tabs      Pending (default)  → POST get_process_complete_data   (payload unchanged)
//           Request            → GET  process-complete-request/browse-data
// Pending   multi-select cards → ONE common [Save]   → POST process-complete-request/add-data
// Request   multi-select cards → ONE common [Delete] → POST process-complete-request/delete-data
// Toolbar   [Pending | Request]            [filter: property · year · date range] [refresh]
//           [search box — searches the ACTIVE tab's data]
// Layout    measured on the screen's OWN width:  phone 1 column · tablet 2 columns · desktop 3 columns
// Theme     only the light tokens T / S (same as ProcessCompleteAuthNEW).
import AppAlert from '@/common/utils/appAlert';
import AsyncStorage from '@/common/utils/compatibleStorage';
import { S, T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  LayoutChangeEvent,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import CriteriaSheet, { Criteria } from '../ProcessCompleteAuthNEW/CriteriaSheet';
import {
  CriteriaPayload,
  deleteSelected,
  fetchPendingRows,
  fetchRequestRows,
  getApiErrorMessage,
  Row,
  saveSelected,
  ScreenTab,
} from './api';

type Props = { token: string; API: string; username?: string; defaultPrpType?: string };
type Item = { key: string; row: Row; searchText: string };

const CONTENT_MAX = 1200;
const GAP = 12;
const TINT = '#FBF1E8'; // light copper tint (same as the old header icon background)

const EXCLUDED_SEARCH_KEYS = ['GradUId', 'Gruid', 'PrUid', 'ProcessUId'];
// Pending data has multiple rows with the same MerName (display batch number).
// Use the unique production/grade UID first so all API rows remain visible.
const KEY_FIELDS = ['Gruid', 'GradUId', 'PrUid', 'ProcessUId', 'MerUId', 'MerUid', 'ReqUId', 'ReqNo', 'Id', 'id', 'MerName'];

const str = (x: any) => (x === null || x === undefined ? '' : String(x).trim());
const show = (x: any) => (str(x) === '' ? '—' : str(x));
const num = (x: any) => {
  const n = parseFloat(String(x ?? '').replace(/,/g, ''));
  return isNaN(n) ? 0 : n;
};
const fmt = (n: number) => (Math.round(n * 1000) / 1000).toLocaleString('en-IN', { maximumFractionDigits: 3 });
const toISO = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const dmy = (iso: string) => iso.split('-').reverse().join('-');
const dayStart = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
const pick = (row: Row, keys: string[]) => {
  for (const k of keys) if (str(row?.[k]) !== '') return row[k];
  return '';
};

/** A row is authorised when browse_data reports an authorised status. */
function isAuthorisedRow(row: Row): boolean {
  const status = str(row?.AuthSatus ?? row?.AuthStatus ?? row?.AuthStatusName).toLowerCase();
  return status === 'authorised' || status === 'authorized' ||
    status.includes('authorised') || status.includes('authorized');
}

/** Precompute searchable text once per API row; typing then scans one string per row. */
function makeSearchText(row: Row): string {
  return Object.entries(row || {})
    .filter(([k, v]) => !EXCLUDED_SEARCH_KEYS.includes(k) && (typeof v === 'string' || typeof v === 'number'))
    .map(([, v]) => String(v).toLowerCase())
    .join(' ');
}

/** rows → items with a stable, unique key (pending: one card per batch) */
function toItems(rows: Row[], dedupe: boolean): Item[] {
  const seen = new Set<string>();
  const out: Item[] = [];
  rows.forEach((row, i) => {
    let base = '';
    for (const k of KEY_FIELDS) {
      if (str(row?.[k]) !== '') {
        base = str(row[k]);
        break;
      }
    }
    // Keep every API row visible. Some valid rows share the same preferred
    // business key (for example Gruid); only the React/UI key must be unique.
    // Add an index suffix on collisions instead of dropping the duplicate row.
    let key = base || `row-${i}`;
    while (seen.has(key)) key = `${base || `row-${i}`}#${i}-${seen.size}`;
    seen.add(key);
    out.push({ key, row, searchText: makeSearchText(row) });
  });
  return out.sort((a, b) => a.key.localeCompare(b.key, undefined, { numeric: true, sensitivity: 'base' }));
}

const TABS: { k: ScreenTab; label: string; icon: string }[] = [
  { k: 'pending', label: 'Pending', icon: 'hourglass-empty' },
  { k: 'request', label: 'Pending Request', icon: 'assignment' },
  { k: 'authorised', label: 'Authorised Request', icon: 'verified-user' },
];

export default function ProcessCompleteRequestNew({ token, API, defaultPrpType }: Props) {
  const win = useWindowDimensions();
  const [width, setWidth] = useState(0);
  const w = width || win.width;
  const phone = w < 560;
  const cols = w >= 1000 ? 3 : w >= 640 ? 2 : 1;
  const pad = phone ? 12 : 16;
  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const next = Math.round(e.nativeEvent.layout.width);
    setWidth((p) => (Math.abs(p - next) > 1 ? next : p));
  }, []);
  // same width as the header block (max CONTENT_MAX) so cards line up with it and sit centered
  const contentW = Math.min(w - pad * 2, CONTENT_MAX);
  const cardW = cols === 1 ? '100%' : Math.floor((contentW - GAP * (cols - 1)) / cols);

  /* ------------------------------- state -------------------------------- */
  const [activeTab, setActiveTab] = useState<ScreenTab>('pending'); // default = pending
  const [rows, setRows] = useState<Record<ScreenTab, Item[]>>({ pending: [], request: [], authorised: [] });
  const [loading, setLoading] = useState<Record<ScreenTab, boolean>>({ pending: true, request: false, authorised: false });
  const [errors, setErrors] = useState<Record<ScreenTab, string>>({ pending: '', request: '', authorised: '' });
  const [picked, setPicked] = useState<Record<ScreenTab, Record<string, true>>>({ pending: {}, request: {}, authorised: {} });
  const [search, setSearch] = useState<Record<ScreenTab, string>>({ pending: '', request: '', authorised: '' });
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ kind: 'success' | 'error'; title: string; message: string } | null>(null);

  /* filter (criteria) — Property, Year, From, To */
  const [sheetOpen, setSheetOpen] = useState(false);
  const [criteria, setCriteria] = useState<Criteria>({ StrCode: '' });
  const [properties, setProperties] = useState<Row[]>([]);
  const [years, setYears] = useState<Row[]>([]);
  const [fromDate, setFromDate] = useState(new Date());
  const [toDate, setToDate] = useState(new Date());
  const [applied, setApplied] = useState<CriteriaPayload | null>(null);
  const appliedRef = useRef<CriteriaPayload | null>(null);

  const alive = useRef(true);
  const seq = useRef<Record<ScreenTab, number>>({ pending: 0, request: 0, authorised: 0 });
  const loaded = useRef<Record<ScreenTab, boolean>>({ pending: false, request: false, authorised: false });
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const getPrpType = useCallback(async () => {
    let prptype = '';
    try {
      prptype = (await AsyncStorage.getItem('user_prptype')) || '';
    } catch {
      // storage unavailable → fall back to the prop
    }
    return prptype || defaultPrpType || '';
  }, [defaultPrpType]);

  /* ------------------------------- data --------------------------------- */
  const load = useCallback(
    async (tab: ScreenTab) => {
      if (!token) return;
      const id = ++seq.current[tab]; // newer load of the same tab cancels the older one
      setLoading((p) => ({ ...p, [tab]: true }));
      setErrors((p) => ({ ...p, [tab]: '' }));
      try {
        const prptype = await getPrpType();
        const list =
          tab === 'pending'
            ? await fetchPendingRows(API, token, prptype, appliedRef.current)
            : await fetchRequestRows(API, token, prptype, appliedRef.current);
        if (!alive.current || id !== seq.current[tab]) return;
        // Pending Request and Authorised Request share browse-data API.
        // Split its rows by AuthStatus so authorised rows appear only in their own tab.
        const tabRows = tab === 'request'
          ? list.filter((row) => !isAuthorisedRow(row))
          : tab === 'authorised'
            ? list.filter(isAuthorisedRow)
            : list;
        const items = toItems(tabRows, tab === 'pending');
        setRows((p) => ({ ...p, [tab]: items }));
        // drop selections that no longer exist
        const keys = new Set(items.map((i) => i.key));
        setPicked((p) => ({
          ...p,
          [tab]: Object.keys(p[tab]).reduce<Record<string, true>>((a, k) => (keys.has(k) ? { ...a, [k]: true } : a), {}),
        }));
        loaded.current[tab] = true;
      } catch (e: any) {
        if (!alive.current || id !== seq.current[tab]) return;
        setRows((p) => ({ ...p, [tab]: [] }));
        setPicked((p) => ({ ...p, [tab]: {} }));
        setErrors((p) => ({ ...p, [tab]: e?.response?.data?.message || e?.message || 'Server Error' }));
      } finally {
        if (alive.current && id === seq.current[tab]) setLoading((p) => ({ ...p, [tab]: false }));
      }
    },
    [API, token, getPrpType],
  );

  // Load only the active tab's data on screen open; skip the unused show-data call.

  /* load the active tab the first time it is opened (and again after a filter change) */
  useEffect(() => {
    if (!loaded.current[activeTab]) void load(activeTab);
  }, [activeTab, load]);

  // Property/year master requests are not fired on screen open while the
  // criteria UI is disabled. This avoids competing network requests on mobile.


  /** Load Data button of the filter sheet */
  const onApplyCriteria = async () => {
    if (!criteria.PrpCode) return AppAlert.alert('Select property first.');
    if (!criteria.YearNo) return AppAlert.alert('Select year first.');
    if (dayStart(fromDate) > dayStart(toDate)) return AppAlert.alert('From date cannot be after To date.');
    const crit: CriteriaPayload = {
      prpcode: String(criteria.PrpCode),
      yearno: String(criteria.YearNo),
      fromdate: toISO(fromDate),
      todate: toISO(toDate),
    };
    appliedRef.current = crit;
    setApplied(crit);
    loaded.current = { pending: false, request: false, authorised: false }; // other tabs reload when opened
    setPicked({ pending: {}, request: {}, authorised: {} });
    await load(activeTab);
    loaded.current = { ...loaded.current, [activeTab]: true, pending: activeTab !== 'pending' ? false : loaded.current.pending, request: activeTab !== 'request' ? false : loaded.current.request, authorised: activeTab !== 'authorised' ? false : loaded.current.authorised };
    if (alive.current) setSheetOpen(false);
  };

  /* ----------------------------- derived -------------------------------- */
  const query = search[activeTab].trim().toLowerCase();
  const items = rows[activeTab];
  const visible = useMemo(() => {
    if (!query) return items;
    return items.filter((item) => item.searchText.includes(query));
  }, [items, query]);

  const sel = picked[activeTab];
  const selCount = Object.keys(sel).length;
  const selRows = useMemo(() => items.filter((i) => sel[i.key]).map((i) => i.row), [items, sel]);
  const selWt = useMemo(() => selRows.reduce((a, r) => a + num(r?.NetWt), 0), [selRows]);
  const allVisiblePicked = visible.length > 0 && visible.every((i) => sel[i.key]);
  const isLoading = loading[activeTab];
  const error = errors[activeTab];
  const isPending = activeTab === 'pending';
  const isAuthorised = activeTab === 'authorised';

  /* ------------------------------ actions ------------------------------- */
  const toggle = (key: string) =>
    setPicked((p) => {
      const cur = { ...p[activeTab] };
      if (cur[key]) delete cur[key];
      else cur[key] = true;
      return { ...p, [activeTab]: cur };
    });

  const toggleAll = () =>
    setPicked((p) => {
      const cur = { ...p[activeTab] };
      if (allVisiblePicked) visible.forEach((i) => delete cur[i.key]);
      else visible.forEach((i) => (cur[i.key] = true));
      return { ...p, [activeTab]: cur };
    });

  const clearSel = () => setPicked((p) => ({ ...p, [activeTab]: {} }));

  const run = async (kind: 'save' | 'delete') => {
    if (busy || selRows.length === 0) return;
    setNotice(null);
    setBusy(true);
    try {
      const prptype = await getPrpType();
      const n = selRows.length;
      if (kind === 'save') await saveSelected(API, token, prptype, selRows, appliedRef.current);
      else await deleteSelected(API, token, prptype, selRows, appliedRef.current);
      if (!alive.current) return;
      setPicked({ pending: {}, request: {}, authorised: {} });
      loaded.current = { pending: false, request: false, authorised: false };
      setNotice({
        kind: 'success',
        title: kind === 'save' ? 'Saved successfully' : 'Deleted successfully',
        message: `${n} batch${n === 1 ? '' : 'es'} ${kind === 'save' ? 'saved' : 'deleted'} successfully.`,
      });
      await load(activeTab);
      loaded.current = { ...loaded.current, [activeTab]: true };
    } catch (e: any) {
      if (alive.current) {
        const serverMessage = getApiErrorMessage(e?.response?.data, '') ||
          getApiErrorMessage(e?.response?.data?.response, '') ||
          (typeof e?.message === 'string' && e.message.trim() ? e.message : 'Server Error');
        setNotice({
          kind: 'error',
          title: kind === 'save' ? 'Save failed' : 'Delete failed',
          message: serverMessage,
        });
      }
    } finally {
      if (alive.current) setBusy(false);
    }
  };

  const confirm = (kind: 'save' | 'delete') => {
    if (busy || selRows.length === 0) return;
    setNotice(null);
    const n = selRows.length;
    const noun = `${n} batch${n === 1 ? '' : 'es'}`;
    if (kind === 'save') {
      AppAlert.alert('Save request?', `${noun} will be saved.`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Save', onPress: () => void run('save') },
      ]);
    } else {
      AppAlert.alert('Delete request?', `${noun} will be deleted. This cannot be undone.`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => void run('delete') },
      ]);
    }
  };

  /* -------------------------------- parts ------------------------------- */
  const filterLabel = applied ? `${dmy(applied.fromdate)} → ${dmy(applied.todate)}` : '';

  const header = (
    <View style={[s.topRow, phone && s.topRowPhone]}>
      <View style={s.tabs} accessibilityRole="tablist">
        {TABS.map((t) => {
          const on = activeTab === t.k;
          const count = loaded.current[t.k] || rows[t.k].length ? rows[t.k].length : null;
          return (
            <TouchableOpacity
              key={t.k}
              style={[s.tab, phone && s.tabPhone, on && s.tabActive]}
              onPress={() => setActiveTab(t.k)}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
            >
              <Text numberOfLines={1} style={[s.tabText, phone && s.tabTextPhone, on && s.tabTextActive]}>{phone ? (t.k === 'request' ? 'Pending Req.' : t.k === 'authorised' ? 'Authorised' : 'Pending') : t.label}</Text>
              {count !== null ? (
                <View style={[s.count, on && { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                  <Text style={[s.countText, on && { color: '#fff' }]}>{count}</Text>
                </View>
              ) : null}
            </TouchableOpacity>
          );
        })}
      </View>
      <View style={[s.actions, phone && s.actionsPhone]}>
        {/* Temporarily disabled: Property / Year / Date Range Filter
        <TouchableOpacity
          style={[s.filterBtn, phone ? s.square : s.filterBtnWide, applied && { borderColor: T.copper, backgroundColor: TINT }]}
          onPress={() => setSheetOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="Filter by property, year and date range"
        >
          <View style={s.filterIcon}>
            <Icon name="tune" size={20} color={applied ? T.copper : T.nav} />
            {applied ? <View style={s.dot} /> : null}
          </View>
          {!phone ? (
            <Text style={[s.iconBtnText, applied && { color: T.copper }]} numberOfLines={1}>
              Filter
            </Text>
          ) : null}
        </TouchableOpacity>
        */}
        <TouchableOpacity
          style={[s.filterBtn, s.square]}
          onPress={() => void load(activeTab)}
          disabled={isLoading || busy}
          accessibilityRole="button"
          accessibilityLabel="Refresh"
        >
          {isLoading ? <ActivityIndicator size="small" color={T.copper} /> : <Icon name="refresh" size={22} color={T.nav} />}
        </TouchableOpacity>
      </View>
    </View>
  );

  const searchBox = (
    <View style={s.search}>
      <Icon name="search" size={20} color={T.muted} />
      <TextInput
        value={search[activeTab]}
        onChangeText={(v) => setSearch((p) => ({ ...p, [activeTab]: v }))}
        placeholder={isPending ? 'Search pending — party, quality, batch, shade…' : isAuthorised ? 'Search authorised requests — party, quality, batch, shade…' : 'Search pending requests — party, quality, batch, shade…'}
        placeholderTextColor={T.muted}
        style={s.searchInput}
        autoCorrect={false}
        autoCapitalize="none"
        returnKeyType="search"
        accessibilityLabel="Search"
      />
      {search[activeTab] ? (
        <TouchableOpacity
          onPress={() => setSearch((p) => ({ ...p, [activeTab]: '' }))}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityLabel="Clear search"
        >
          <Icon name="close" size={18} color={T.muted} />
        </TouchableOpacity>
      ) : null}
      {phone ? (
        <TouchableOpacity
          style={s.searchRefresh}
          onPress={() => void load(activeTab)}
          disabled={isLoading || busy}
          accessibilityRole="button"
          accessibilityLabel="Refresh"
        >
          {isLoading ? <ActivityIndicator size="small" color={T.copper} /> : <Icon name="refresh" size={20} color={T.nav} />}
        </TouchableOpacity>
      ) : null}
    </View>
  );

  const selectBar =
    !isAuthorised && !isLoading && !error && items.length > 0 ? (
      <View style={s.selRow}>
        <TouchableOpacity
          style={s.selAll}
          onPress={toggleAll}
          disabled={visible.length === 0}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: allVisiblePicked }}
          accessibilityLabel="Select all"
        >
          <Check on={allVisiblePicked} />
          <Text style={s.selAllText}>{allVisiblePicked ? 'Unselect all' : 'Select all'}</Text>
        </TouchableOpacity>
        <Text style={s.summary} numberOfLines={1}>
          {query ? `${visible.length} of ${items.length}` : `${items.length}`} {isPending ? 'pending' : isAuthorised ? 'authorised request' : 'pending request'}
          {filterLabel ? ` · ${filterLabel}` : ''}
        </Text>
      </View>
    ) : null;

  const body = (() => {
    if (isLoading && items.length === 0) {
      return (
        <View style={s.grid}>
          {Array.from({ length: cols * 2 }).map((_, i) => (
            <View key={i} style={[s.card, { width: cardW as any, opacity: 0.6 }]}>
              <View style={[s.skel, { width: '45%', height: 16 }]} />
              <View style={[s.skel, { width: '80%' }]} />
              <View style={[s.skel, { width: '60%' }]} />
              <View style={[s.skel, { width: '100%', height: 30 }]} />
            </View>
          ))}
        </View>
      );
    }
    if (error) {
      return (
        <View style={s.state} accessibilityRole="alert">
          <View style={[s.stateIcon, { backgroundColor: `${T.red}12` }]}>
            <Icon name="error-outline" size={30} color={T.red} />
          </View>
          <Text style={s.stateTitle}>Could not load {isPending ? 'pending' : isAuthorised ? 'authorised requests' : 'pending requests'}</Text>
          <Text style={s.stateText}>{error}</Text>
          <TouchableOpacity style={s.retry} onPress={() => void load(activeTab)} accessibilityRole="button">
            <Icon name="refresh" size={18} color="#fff" />
            <Text style={s.retryText}>Try again</Text>
          </TouchableOpacity>
        </View>
      );
    }
    if (items.length === 0) {
      return (
        <View style={s.state}>
          <View style={s.stateIcon}>
            <Icon name={isPending ? 'inventory-2' : 'assignment'} size={30} color={T.copper} />
          </View>
          <Text style={s.stateTitle}>{isPending ? 'No pending batch' : isAuthorised ? 'No authorised request found' : 'No pending request found'}</Text>
          <Text style={s.stateText}>
            {applied ? 'Nothing matches the selected property, year and dates.' : 'Pull the latest data with the refresh button.'}
          </Text>
        </View>
      );
    }
    if (visible.length === 0) {
      return (
        <View style={s.state}>
          <View style={s.stateIcon}>
            <Icon name="search-off" size={30} color={T.copper} />
          </View>
          <Text style={s.stateTitle}>No match</Text>
          <Text style={s.stateText}>Nothing found for “{search[activeTab].trim()}”.</Text>
        </View>
      );
    }
    // Cards are rendered by FlatList below (virtualized for large API results).
    return null;
  })();

  const actionBar =
    !isAuthorised && selCount > 0 ? (
      <View style={s.barWrap}>
        <View style={s.bar}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={s.barTitle} numberOfLines={1}>
              {selCount} selected
            </Text>
            {selWt > 0 ? (
              <Text style={s.barSub} numberOfLines={1}>
                Net wt. {fmt(selWt)}
              </Text>
            ) : null}
          </View>
          <TouchableOpacity style={s.clear} onPress={clearSel} disabled={busy} accessibilityRole="button" accessibilityLabel="Clear selection">
            <Text style={s.clearText}>Clear</Text>
          </TouchableOpacity>
          {/* Pending tab → only Save · Request tab → only Delete */}
          {isPending ? (
            <TouchableOpacity
              style={[s.primary, { backgroundColor: T.copper }, busy && { opacity: 0.6 }]}
              onPress={() => confirm('save')}
              disabled={busy}
              accessibilityRole="button"
              accessibilityLabel="Save selected"
            >
              {busy ? <ActivityIndicator size="small" color="#fff" /> : <Icon name="save" size={19} color="#fff" />}
              <Text style={s.primaryText}>Save</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[s.primary, { backgroundColor: T.red }, busy && { opacity: 0.6 }]}
              onPress={() => confirm('delete')}
              disabled={busy}
              accessibilityRole="button"
              accessibilityLabel="Delete selected"
            >
              {busy ? <ActivityIndicator size="small" color="#fff" /> : <Icon name="delete-outline" size={20} color="#fff" />}
              <Text style={s.primaryText}>Delete</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    ) : null;

  /* -------------------------------- render ------------------------------ */
  return (
    <View style={s.root} onLayout={onLayout}>
      <FlatList
        key={`pcr-list-${cols}`}
        data={visible}
        numColumns={cols}
        keyExtractor={(item) => item.key}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[s.content, { padding: pad, flexGrow: 1 }]}
        ListHeaderComponent={(
          <View style={{ width: '100%', maxWidth: CONTENT_MAX, alignSelf: 'center', gap: phone ? 10 : 12 }}>
            {header}
            {searchBox}
            {selectBar}
          </View>
        )}
        ListEmptyComponent={(
          <View style={{ width: '100%', maxWidth: CONTENT_MAX, alignSelf: 'center' }}>
            {body || (!isLoading && !error && items.length > 0 && visible.length === 0 ? (
              <View style={s.state}>
                <View style={s.stateIcon}><Icon name="search-off" size={30} color={T.copper} /></View>
                <Text style={s.stateTitle}>No match</Text>
                <Text style={s.stateText}>Nothing found for “{search[activeTab].trim()}”.</Text>
              </View>
            ) : null)}
          </View>
        )}
        renderItem={({ item }) => (
          <View style={cols > 1 ? { width: cardW as any, marginBottom: GAP } : { width: '100%', maxWidth: CONTENT_MAX, alignSelf: 'center', marginBottom: GAP }}>
            <BatchCard
              row={item.row}
              on={!!sel[item.key]}
              width="100%"
              request={!isPending}
              selectable={!isAuthorised}
              onPress={() => { if (!isAuthorised) toggle(item.key); }}
            />
          </View>
        )}
        columnWrapperStyle={cols > 1 ? { gap: GAP, justifyContent: 'flex-start', width: contentW, alignSelf: 'center' } : undefined}
        initialNumToRender={phone ? 6 : 12}
        maxToRenderPerBatch={phone ? 6 : 12}
        updateCellsBatchingPeriod={30}
        windowSize={phone ? 5 : 7}
        removeClippedSubviews
      />

      {actionBar}

      {notice ? (
        <View style={s.noticeLayer} pointerEvents="box-none">
          <View
            style={[s.noticeCard, { width: Math.min(Math.max(w - 24, 0), 440), maxHeight: Math.max(220, win.height - 32) }]}
            accessibilityRole="alert"
            accessibilityLiveRegion="polite"
          >
            <View style={s.noticeHeader}>
              <View style={[s.noticeIconWrap, notice.kind === 'error' ? s.noticeIconError : s.noticeIconSuccess]}>
                <Icon
                  name={notice.kind === 'error' ? 'error-outline' : 'check-circle'}
                  size={26}
                  color={notice.kind === 'error' ? '#B42318' : '#16803D'}
                />
              </View>
              <View style={s.noticeHeadingText}>
                <Text style={s.noticeEyebrow}>{notice.kind === 'error' ? 'ACTION REQUIRED' : 'COMPLETED'}</Text>
                <Text style={s.noticeTitle}>{notice.title}</Text>
              </View>
              <TouchableOpacity
                style={s.noticeClose}
                onPress={() => setNotice(null)}
                accessibilityRole="button"
                accessibilityLabel="Close notification"
                hitSlop={8}
              >
                <Icon name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>
            <ScrollView
              style={s.noticeMessageScroll}
              contentContainerStyle={s.noticeMessageContent}
              nestedScrollEnabled
              showsVerticalScrollIndicator
              keyboardShouldPersistTaps="handled"
            >
              <Text selectable style={s.noticeMessage}>{notice.message}</Text>
            </ScrollView>
            <TouchableOpacity
              style={[s.noticeButton, notice.kind === 'error' ? s.noticeButtonError : s.noticeButtonSuccess]}
              onPress={() => setNotice(null)}
              accessibilityRole="button"
              accessibilityLabel="Dismiss message"
            >
              <Text style={s.noticeButtonText}>Got it</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      {/* Temporarily disabled for future use: Property / Year / Date Range + Load Data
      <CriteriaSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="Process complete request"
        isLoading={isLoading}
        values={criteria}
        setValues={(fn) =>
          setCriteria((v) => {
            const next = fn(v);
            // property changed → old year no longer valid
            return next.PrpCode !== v.PrpCode ? { ...next, YearNo: '' } : next;
          })
        }
        properties={properties}
        years={years}
        fromDate={fromDate}
        toDate={toDate}
        onFromDateChange={setFromDate}
        onToDateChange={setToDate}
        onLoad={() => void onApplyCriteria()}
      />
      */}
    </View>
  );
}

/* ------------------------------------------------------------------------ */
function Check({ on }: { on: boolean }) {
  return (
    <View style={[s.check, on && s.checkOn]}>
      {on ? <Icon name="check" size={16} color="#fff" /> : null}
    </View>
  );
}

function BatchCard({ row, on, width, request, selectable = true, onPress }: { row: Row; on: boolean; width: any; request: boolean; selectable?: boolean; onPress: () => void }) {
  const batch = pick(row, ['MerName', 'BatchNo', 'ReqNo']);
  const meta = request ? [pick(row, ['ReqNo', 'RequestNo']), pick(row, ['ReqDate', 'RequestDate', 'TxnDate'])].filter((x) => str(x) && str(x) !== str(batch)) : [];
  return (
    <TouchableOpacity
      activeOpacity={selectable ? 0.85 : 1}
      onPress={selectable ? onPress : undefined}
      disabled={!selectable}
      style={[s.card, { width }, selectable && on && s.cardOn]}
      accessibilityRole={selectable ? 'checkbox' : 'summary'}
      accessibilityState={selectable ? { checked: on } : undefined}
      accessibilityLabel={`Batch ${show(batch)}`}
    >
      <View style={s.cardTop}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={s.eyebrow}>BATCH NO.</Text>
          <Text style={s.title} numberOfLines={1}>
            {show(batch)}
          </Text>
        </View>
        {selectable ? <Check on={on} /> : null}
      </View>
      <Text style={s.party} numberOfLines={2}>
        {show(row.PartyNames)}
      </Text>
      <Text style={s.sub} numberOfLines={1}>
        {[str(row.ItmName), str(row.ShdName)].filter(Boolean).join('  ·  ') || '—'}
      </Text>
      {meta.length ? (
        <Text style={s.metaLine} numberOfLines={1}>
          {meta.map(str).join('  ·  ')}
        </Text>
      ) : null}
      <View style={s.stats}>
        <View style={s.chip}>
          <Text style={s.chipK}>Cones</Text>
          <Text style={s.chipV}>{show(row.Cones)}</Text>
        </View>
        <View style={s.chip}>
          <Text style={s.chipK}>Net wt.</Text>
          <Text style={[s.chipV, { color: T.copper }]}>{str(row.NetWt) === '' ? '—' : fmt(num(row.NetWt))}</Text>
        </View>
        {str(row.ProdType) ? (
          <View style={[s.chip, { flex: 1.2 }]}>
            <Text style={s.chipK}>Type</Text>
            <Text style={s.chipV} numberOfLines={1}>
              {str(row.ProdType)}
            </Text>
          </View>
        ) : null}
      </View>
      {request ? (
        <View style={s.authInfo}>
          <View style={s.authInfoItem}>
            <Text style={s.chipK}>Auth Status</Text>
            <Text style={s.chipV} numberOfLines={1}>{show(row.AuthSatus ?? row.AuthStatus)}</Text>
          </View>
          <View style={s.authInfoItem}>
            <Text style={s.chipK}>Auth User</Text>
            <Text style={s.chipV} numberOfLines={1}>{show(row.AUsrName ?? row.AuthUser)}</Text>
          </View>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

/* ------------------------------------------------------------------------ */
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  noticeLayer: { position: 'absolute', top: 12, right: 12, left: 0, zIndex: 9999, elevation: 30, alignItems: 'flex-end', paddingHorizontal: 0 },
  noticeCard: { maxWidth: 440, borderRadius: 16, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 14, alignItems: 'stretch', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E7EAF0', shadowColor: '#000000', shadowOpacity: 0.22, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 16, gap: 10 },
  noticeHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  noticeHeadingText: { flex: 1, minWidth: 0, gap: 2 },
  noticeClose: { width: 32, height: 32, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F1F5F9' },
  noticeIconWrap: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  noticeMessageScroll: { flexShrink: 1, minHeight: 36, maxHeight: 260, borderRadius: 10, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E8EDF3' },
  noticeMessageContent: { padding: 10 },
  noticeIconSuccess: { backgroundColor: '#E8F7EE' },
  noticeIconError: { backgroundColor: '#FDECEC' },
  noticeEyebrow: { fontSize: 9, fontWeight: '900', letterSpacing: 1.2, color: '#7B8492' },
  noticeTitle: { fontSize: 17, lineHeight: 22, fontWeight: '800', color: '#152235' },
  noticeMessage: { fontSize: 13, lineHeight: 19, fontWeight: '500', color: '#334155', textAlign: 'left', flexShrink: 1 },
  noticeButton: { minHeight: 42, alignSelf: 'stretch', borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
  noticeButtonSuccess: { backgroundColor: '#16803D' },
  noticeButtonError: { backgroundColor: '#B42318' },
  noticeButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  content: { flexGrow: 1, paddingBottom: 24 },

  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  topRowPhone: { flexDirection: 'column', alignItems: 'stretch', gap: 8 },
  tabs: { flexDirection: 'row', padding: 4, borderRadius: 12, borderWidth: 1, borderColor: T.border, backgroundColor: T.surface, gap: 4 },
  tab: { minWidth: 112, height: 40, paddingHorizontal: 16, borderRadius: 9, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  tabPhone: { flex: 1, minWidth: 0, paddingHorizontal: 5, gap: 4 },
  tabActive: { backgroundColor: T.nav },
  tabText: { fontSize: 13.5, fontWeight: '700', color: T.muted },
  tabTextPhone: { fontSize: 10.5, flexShrink: 1 },
  tabTextActive: { color: '#fff' },
  count: { minWidth: 20, height: 18, borderRadius: 9, paddingHorizontal: 6, backgroundColor: T.alt, alignItems: 'center', justifyContent: 'center' },
  countText: { fontSize: 11, fontWeight: '800', color: T.muted },

  actions: { flexDirection: 'row', gap: 8, flexShrink: 0 },
  actionsPhone: { display: 'none' },
  filterBtn: { height: 44, borderRadius: 11, borderWidth: 1, borderColor: T.border, backgroundColor: T.surface, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, flexShrink: 0 },
  square: { width: 44 },
  filterBtnWide: { paddingHorizontal: 16 },
  filterIcon: { width: 22, height: 22, alignItems: 'center', justifyContent: 'center' },
  iconBtnText: { fontSize: 13.5, fontWeight: '700', color: T.nav },
  dot: { position: 'absolute', top: -1, right: -3, width: 9, height: 9, borderRadius: 5, backgroundColor: T.copper, borderWidth: 1.5, borderColor: TINT },

  search: { height: 46, flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, borderWidth: 1, borderColor: T.border, backgroundColor: T.surface, paddingHorizontal: 14 },
  searchInput: { flex: 1, minWidth: 0, fontSize: 14, color: T.ink, height: 44 },
  searchRefresh: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: T.sub, marginLeft: 2 },

  selRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingHorizontal: 2 },
  selAll: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
  selAllText: { fontSize: 13.5, fontWeight: '800', color: T.nav },
  summary: { flexShrink: 1, fontSize: 12.5, fontWeight: '600', color: T.muted },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP },
  card: { backgroundColor: T.surface, borderRadius: 14, borderWidth: 1.5, borderColor: T.border, padding: 14, gap: 6, ...(S?.card as object) },
  cardOn: { borderColor: T.copper, backgroundColor: TINT },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  eyebrow: { fontSize: 9.5, fontWeight: '800', color: T.muted, letterSpacing: 1 },
  title: { fontSize: 17, fontWeight: '800', color: T.nav },
  party: { fontSize: 14, fontWeight: '700', color: T.ink, marginTop: 2 },
  sub: { fontSize: 12.5, fontWeight: '600', color: T.muted },
  metaLine: { fontSize: 12, fontWeight: '700', color: T.copper },
  stats: { flexDirection: 'row', gap: 8, marginTop: 6 },
  authInfo: { flexDirection: 'row', gap: 8, marginTop: 2 },
  authInfoItem: { flex: 1, minWidth: 0, backgroundColor: T.sub, borderRadius: 9, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: T.hair },
  chip: { flex: 1, minWidth: 0, backgroundColor: T.sub, borderRadius: 9, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: T.hair },
  chipK: { fontSize: 9.5, fontWeight: '800', color: T.muted, textTransform: 'uppercase', letterSpacing: 0.4 },
  chipV: { fontSize: 14, fontWeight: '800', color: T.ink, marginTop: 1 },

  check: { width: 24, height: 24, borderRadius: 7, borderWidth: 2, borderColor: T.border, backgroundColor: T.surface, alignItems: 'center', justifyContent: 'center' },
  checkOn: { backgroundColor: T.copper, borderColor: T.copper },

  skel: { height: 12, borderRadius: 6, backgroundColor: T.alt },

  state: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 20, gap: 8, backgroundColor: T.surface, borderRadius: 14, borderWidth: 1, borderColor: T.border },
  stateIcon: { width: 60, height: 60, borderRadius: 30, backgroundColor: TINT, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  stateTitle: { fontSize: 16, fontWeight: '800', color: T.nav, textAlign: 'center' },
  stateText: { fontSize: 13, color: T.muted, textAlign: 'center', maxWidth: 420 },
  retry: { marginTop: 8, height: 42, borderRadius: 10, paddingHorizontal: 18, backgroundColor: T.nav, flexDirection: 'row', alignItems: 'center', gap: 6 },
  retryText: { color: '#fff', fontSize: 14, fontWeight: '800' },

  barWrap: { borderTopWidth: 1, borderTopColor: T.border, backgroundColor: T.surface },
  bar: { width: '100%', maxWidth: CONTENT_MAX, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 10 },
  barTitle: { fontSize: 15, fontWeight: '800', color: T.nav },
  barSub: { fontSize: 12, fontWeight: '600', color: T.muted },
  clear: { height: 44, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' },
  clearText: { fontSize: 13.5, fontWeight: '800', color: T.muted },
  primary: { minWidth: 120, height: 46, borderRadius: 11, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  primaryText: { color: '#fff', fontSize: 15, fontWeight: '800' },
});
