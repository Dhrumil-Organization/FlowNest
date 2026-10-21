// FILE: src/components/PackingGradeAuthNEW/index.tsx
// NEW ERP — Packing Grade Auth (replaces legacy screen).
// Legacy source : src/components/PackingAuth/index.tsx (identical copy: components/PackingAuth/index.tsx)
// Legacy route  : app/(tabs)/packing-grade-auth.tsx
// Endpoints (same as legacy, host = `API` prop, Bearer = `token` prop):
//   GET  /api/getstore           { prpcode:'', yearno:<AsyncStorage yno>, txntype:'sales_order', prptype }
//                                 (legacy fetchAllStoredata; x-platform: mob) — store list, first store auto-selected
//   GET  /api/prodpackingbrowse  { prptype, yearno, strcode, txntype:'mob_packing_auth', atype:'B'|'H',
//                                   referrer:'dashboard', fetch:'browsedata' }            — list (res.data.data.data)
//   GET  /api/prodpackingbrowse  { …same…, fetch:'packdata', produid }                     — packing entries (info)
//   POST /api/authpacking        { prptype, prpcode, yearno, strcode, uid, srno, isauth:1|2,
//                                   txntype:'mob_packing_auth', remark }                   — approve (1) / reject (2)
// AsyncStorage keys read: user_prptype (every call), yno (store list).
import AsyncStorage from '@/common/utils/compatibleStorage';
import { TruncText } from '@/src/components/ui/TruncText';
import { S, T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View
} from 'react-native';
import { Btn, Opt, Segment, SelectField, Sheet } from '../StockVerificationNEW/ui';
import {
  buildYearOptions, Ctx, fetchBrowse, fetchPackData, fetchStores, fmt3,
  getApiMessage, isApiError,
  matchesSearch, postAuth, Row,
  statusOf, storeNameOf, strCodeOf, Tab,
} from './api';

type Props = { token: string; API: string; username?: string };

const TAB_OPTS: Opt[] = [
  { value: 'request', label: 'Request' },
  { value: 'history', label: 'History' },
];

const statusColor = (st: string) => (st === 'authorised' ? T.green : st === 'rejected' ? T.red : T.amber);

export default function PackingGradeAuthNEW({ token, API }: Props) {
  const { width } = useWindowDimensions();
  const phone = width < 768;
  const cols = width >= 1180 ? 3 : width >= 768 ? 2 : 1;

  const [tab, setTab] = useState<Tab>('request');
  const [search, setSearch] = useState('');
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [pulling, setPulling] = useState(false);

  const [yearOptions] = useState<string[]>(() => buildYearOptions());
  const [selectedYear, setSelectedYear] = useState<string>(() => buildYearOptions()[0]);
  const [stores, setStores] = useState<Row[]>([]);
  const [storesLoading, setStoresLoading] = useState(false);
  const [storesLoaded, setStoresLoaded] = useState(false);
  const [selectedStore, setSelectedStore] = useState<Row | null>(null);
  const [formStrCode, setFormStrCode] = useState(''); // legacy FormState.values.StrCode
  const [filterOpen, setFilterOpen] = useState(false);

  const [remarks, setRemarks] = useState<Record<string, string>>({});
  const [details, setDetails] = useState<Record<string, Row[]>>({});
  const [infoLoading, setInfoLoading] = useState<Record<string, boolean>>({});
  const [showInfo, setShowInfo] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState<{ uid: string; act: 1 | 2 } | null>(null);
  const [apiNotice, setApiNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const initialLoaded = useRef(false);
  const reqSeq = useRef(0);
  // Blocks double-tap on Approve/Reject (state `busy` updates async, a ref does not).
  const submitting = useRef(false);

  const strcode = strCodeOf(selectedStore, formStrCode);
  const ctx: Ctx = { API, token, selectedYear, strcode, tab };

  /* ------------------------- stores (legacy mount) ------------------------ */
  const loadStores = useCallback(async () => {
    if (!token) return;
    setStoresLoading(true);
    try {
      const yno = await AsyncStorage.getItem('yno');
      const data = await fetchStores(API, token, '', yno, 'sales_order');
      setStores(data || []);
      if (data?.length) {
        setSelectedStore(data[0]);
        setFormStrCode(data[0]?.StrCode || data[0]?.strcode || '');
      }
    } finally {
      setStoresLoading(false);
      setStoresLoaded(true);
    }
  }, [API, token]);

  useEffect(() => { loadStores(); }, [loadStores]);

  /* ------------------------------ list ----------------------------------- */
  const fetchList = async (options?: { suppressErrors?: boolean }) => {
    if (!selectedStore) return;
    const seq = ++reqSeq.current;
    setLoading(true);
    try {
      const { rows: data, apiError, apiMessage } = await fetchBrowse(ctx);

      if (seq !== reqSeq.current) return;

      if (apiError) {
        setRows([]);
        // Background refresh after Approve/Reject passes suppressErrors:true
        // so it can never replace the success popup.
        if (!options?.suppressErrors) {
          setApiNotice({
            type: 'error',
            message: apiMessage || 'Unable to load packing records.',
          });
        }
        return;
      }

      setRows(data);

    } catch (e: any) {
      console.log(e);
      if (seq === reqSeq.current) {
        setRows([]);
        if (!options?.suppressErrors) {
          setApiNotice({
            type: 'error',
            message: getApiMessage(e?.response?.data) || e?.message || 'Unable to load packing records.',
          });
        }
      }
    } finally {
      if (seq === reqSeq.current) setLoading(false);
    }
  };
  const fetchRef = useRef(fetchList);
  fetchRef.current = fetchList;

  // legacy: first load once a store and a year are available
  useEffect(() => {
    if (!token) return;
    if (selectedStore && selectedYear && !initialLoaded.current) {
      fetchRef.current();
      initialLoaded.current = true;
    }
  }, [selectedStore, selectedYear, token]);

  // legacy: tab change collapses info panels and reloads (after the first load)
  useEffect(() => {
    if (!token) return;
    setShowInfo({});
    setDetails({});
    if (initialLoaded.current) fetchRef.current();
  }, [tab, token]);

  const onPull = async () => {
    setPulling(true);
    try { await fetchList(); } finally { setPulling(false); }
  };

  /* --------------------------- packing info ------------------------------ */
  // const toggleInfo = async (item: Row) => {
  //   const uid = item.uid;
  //   if (showInfo[uid]) {
  //     setShowInfo((p) => ({ ...p, [uid]: false }));
  //     return;
  //   }
  //   if (!selectedStore) return;
  //   try {
  //     setInfoLoading((p) => ({ ...p, [uid]: true }));
  //     const { rows: data, apiError } = await fetchPackData(ctx, item);
  //     setDetails((p) => ({ ...p, [uid]: data }));
  //     setShowInfo((p) => ({ ...p, [uid]: !p[uid] }));
  //     if (apiError) AppAlert.alert('Warning', 'Please Try Again !!!');
  //   } catch (e) {
  //     console.log(e);
  //     setRows([]); // legacy quirk: a failed info call clears the list
  //   } finally {
  //     setInfoLoading((p) => ({ ...p, [uid]: false }));
  //   }
  // };

  const toggleInfo = async (item: Row, cardKey: string) => {
    if (showInfo[cardKey]) {
      setShowInfo(prev => ({ ...prev, [cardKey]: false }));
      return;
    }

    if (!selectedStore) return;

    try {
      setInfoLoading(prev => ({ ...prev, [cardKey]: true }));
      const { rows: data, apiError, apiMessage } = await fetchPackData(ctx, item);

      if (apiError) {
        setApiNotice({
          type: 'error',
          message: apiMessage || 'Unable to load packing details.',
        });
        return;
      }

      setDetails(prev => ({ ...prev, [cardKey]: data }));
      setShowInfo(prev => ({ ...prev, [cardKey]: true }));
    } catch (e: any) {
      console.log(e);
      setApiNotice({
        type: 'error',
        message: getApiMessage(e?.response?.data) || e?.message || 'Unable to load packing details.',
      });
    } finally {
      setInfoLoading(prev => ({ ...prev, [cardKey]: false }));
    }
  };

  /* ------------------------- approve / reject ----------------------------- */
  const doAuth = async (item: Row, isauth: 1 | 2) => {
    // Keep the mandatory remark validation visible to the user.
    const remark = String(remarks[item?.uid] ?? '').trim();
    if (!remark) {
      setApiNotice({
        type: 'error',
        message: `Voucher No. ${String(item?.vouno ?? '').trim() || '-'}: Please enter Remark before ${isauth === 1 ? 'approving' : 'rejecting'} this packing request.`,
      });
      return;
    }

    if (submitting.current) return;
    submitting.current = true;
    setBusy({ uid: String(item?.uid ?? ''), act: isauth });

    try {
      const response = await postAuth(ctx, item, isauth, remark);
      const payload = response?.data;
      console.log('[PackingGradeAuthNEW] authpacking response ->', response?.status, JSON.stringify(payload));

      // Do not show API success/error messages on screen.
      // Only the local mandatory-remark validation above should show a popup.
      if (isApiError(payload)) {
        console.log('[PackingGradeAuthNEW] authpacking API reported an error:', getApiMessage(payload) || payload);
      }
    } catch (error: any) {
      // Keep API/HTTP errors out of the UI; log for debugging only.
      console.log(
        '[PackingGradeAuthNEW] authpacking request failed:',
        error?.response?.status,
        JSON.stringify(error?.response?.data),
        error?.message,
      );
    } finally {
      // Refresh silently regardless of API success/error, without showing another popup.
      try {
        await fetchList({ suppressErrors: true });
      } catch (refreshError) {
        console.log('[PackingGradeAuthNEW] silent refresh failed:', refreshError);
      }
      submitting.current = false;
      setBusy(null);
    }
  };

  /* ------------------------------ derived -------------------------------- */
  const filtered = useMemo(() => rows.filter((i) => matchesSearch(i, search)), [rows, search]);
  const stats = useMemo(() => {
    const c = { pending: 0, authorised: 0, rejected: 0 };
    rows.forEach((r) => {
      const st = statusOf(r);
      if (st === 'authorised') c.authorised++;
      else if (st === 'rejected') c.rejected++;
      else if (st === 'pending') c.pending++;
    });
    return c;
  }, [rows]);

  const yearOpts: Opt[] = useMemo(() => yearOptions.map((y) => ({ value: y, label: y })), [yearOptions]);
  const storeOpts: Opt[] = useMemo(
    () => stores.map((s, i) => ({ value: String(i), label: storeNameOf(s) || String(s?.StrCode || s?.strcode || ''), searchText: storeNameOf(s) })),
    [stores],
  );
  const storeIdx = selectedStore ? String(stores.indexOf(selectedStore)) : '';
  const storeLabel = storeNameOf(selectedStore) || (storesLoading ? 'Loading store…' : 'Select Store');

  /* ------------------------------- header -------------------------------- */
  const header = (
    <View style={{ gap: 10 }}>
      <View style={[s.toolbar, phone && { flexDirection: 'column', alignItems: 'stretch' }]}>
        <View style={[{ flexDirection: 'row' }, phone ? null : { width: 260 }]}>
          <Segment value={tab} options={TAB_OPTS} onChange={(v) => setTab(v as Tab)} />
        </View>
        <View style={s.toolRow}>
          <View style={s.search}>
            <Icon name="search" size={18} color={T.muted} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search packing..."
              placeholderTextColor={T.muted}
              style={s.searchInput}
              returnKeyType="search"
              autoCorrect={false}
            />
            {search.length > 0 ? (
              <TouchableOpacity onPress={() => { setSearch(''); Keyboard.dismiss(); }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Icon name="close" size={18} color={T.muted} />
              </TouchableOpacity>
            ) : null}
          </View>
          <TouchableOpacity style={s.iconBtn} onPress={() => setFilterOpen(true)} accessibilityLabel="Filters">
            <Icon name="tune" size={20} color={T.nav} />
          </TouchableOpacity>
          <TouchableOpacity style={s.iconBtn} onPress={() => fetchList()} disabled={loading} accessibilityLabel="Refresh">
            {loading ? <ActivityIndicator size="small" color={T.copper} /> : <Icon name="refresh" size={20} color={T.nav} />}
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity style={s.ctx} onPress={() => setFilterOpen(true)} activeOpacity={0.8}>
        <Icon name="event" size={15} color={T.copper} />
        <Text style={s.ctxText}>{selectedYear}</Text>
        <View style={s.ctxDot} />
        <Icon name="store" size={15} color={T.copper} />
        <TruncText style={[s.ctxText, { flexShrink: 1 }]} numberOfLines={1} tapReveal={false}>{storeLabel}</TruncText>
        <Icon name="expand-more" size={18} color={T.muted} />
      </TouchableOpacity>

      <View style={s.kpis}>
        <Kpi label="Total" value={rows.length} color={T.nav} />
        <Kpi label="Pending" value={stats.pending} color={T.amber} />
        <Kpi label="Authorised" value={stats.authorised} color={T.green} />
        <Kpi label="Rejected" value={stats.rejected} color={T.red} />
      </View>

      {rows.length > 0 && search ? (
        <Text style={s.listInfo}>{filtered.length} of {rows.length} records</Text>
      ) : null}
    </View>
  );

  const empty = loading && !pulling ? (
    <View style={s.empty}><ActivityIndicator color={T.copper} /><Text style={s.emptyText}>Loading packing…</Text></View>
  ) : !selectedStore && storesLoading ? (
    <View style={s.empty}><ActivityIndicator color={T.copper} /><Text style={s.emptyText}>Loading stores…</Text></View>
  ) : !selectedStore && storesLoaded ? (
    <View style={s.empty}>
      <Icon name="store" size={42} color={T.border} />
      <Text style={s.emptyTitle}>No store available</Text>
      <TouchableOpacity onPress={loadStores}><Text style={[s.emptyText, { color: T.copper, fontWeight: '700' }]}>Retry</Text></TouchableOpacity>
    </View>
  ) : (
    <View style={s.empty}>
      <Icon name="inventory-2" size={42} color={T.border} />
      <Text style={s.emptyTitle}>{rows.length ? 'No match' : 'No Packing Data'}</Text>
      <Text style={s.emptyText}>{rows.length ? 'Change the search text.' : 'Packing records will appear here'}</Text>
    </View>
  );

  return (
    <View style={s.root}>
      <FlatList
        key={`cols-${cols}`}
        data={loading && !pulling ? [] : filtered}
        numColumns={cols}
        keyExtractor={(_: Row, i: number) => i.toString()}
        ListHeaderComponent={header}
        ListHeaderComponentStyle={{ marginBottom: 12 }}
        ListEmptyComponent={empty}
        columnWrapperStyle={cols > 1 ? { gap: 10 } : undefined}
        contentContainerStyle={s.content}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
        refreshControl={<RefreshControl refreshing={pulling} onRefresh={onPull} colors={[T.copper]} tintColor={T.copper} />}
        // renderItem={({ item }: { item: Row }) => (
        //   <View style={{ flex: 1 / cols, marginBottom: 10 }}>
        //     <PackCard
        //       item={item}
        //       tab={tab}
        //       open={!!showInfo[item.uid]}
        //       infoBusy={!!infoLoading[item.uid]}
        //       entries={details[item.uid] || []}
        //       remark={remarks[item?.uid] || ''}
        //       onRemark={(text) => setRemarks((p) => ({ ...p, [item?.uid]: text }))}
        //       onInfo={() => toggleInfo(item)}
        //       onApprove={() => doAuth(item, 1)}
        //       onReject={() => doAuth(item, 2)}
        //       busyAct={busy && busy.uid === String(item?.uid ?? '') ? busy.act : null}
        //       locked={busy !== null}
        //     />
        //   </View>
        // )}

        renderItem={({ item, index }: { item: Row; index: number }) => {
          const cardKey = `${String(item.uid ?? '')}_${index}`;

          return (
            <View style={{ flex: 1 / cols, marginBottom: 10 }}>
              <PackCard
                item={item}
                tab={tab}
                open={!!showInfo[cardKey]}
                infoBusy={!!infoLoading[cardKey]}
                entries={details[cardKey] || []}
                remark={remarks[item?.uid] || ''}
                onRemark={text =>
                  setRemarks(prev => ({
                    ...prev,
                    [item?.uid]: text,
                  }))
                }
                onInfo={() => toggleInfo(item, cardKey)}
                onApprove={() => doAuth(item, 1)}
                onReject={() => doAuth(item, 2)}
                busyAct={
                  busy && busy.uid === String(item?.uid ?? '')
                    ? busy.act
                    : null
                }
                locked={busy !== null}
              />
            </View>
          );
        }}
      />

      <Modal
        visible={!!apiNotice}
        transparent
        animationType="fade"
        onRequestClose={() => setApiNotice(null)}
        statusBarTranslucent
      >
        <View style={s.messageOverlay}>
          <View style={[s.messageCard, { width: width >= 768 ? 440 : '92%' }]}>
            <View
              style={[
                s.messageIcon,
                { backgroundColor: apiNotice?.type === 'success' ? '#DCFCE7' : '#FEE2E2' },
              ]}
            >
              <Icon
                name={apiNotice?.type === 'success' ? 'check-circle' : 'error-outline'}
                size={30}
                color={apiNotice?.type === 'success' ? '#15803D' : '#DC2626'}
              />
            </View>
            <Text style={s.messageTitle}>
              {apiNotice?.type === 'success' ? 'Success' : ''}
              {apiNotice?.type === 'error' ? 'Error' : ''}
            </Text>
            <Text style={s.messageText}>{apiNotice?.message}</Text>
            <TouchableOpacity
              style={[
                s.messageButton,
                { backgroundColor: apiNotice?.type === 'success' ? '#15803D' : '#DC2626' },
              ]}
              onPress={() => setApiNotice(null)}
              accessibilityRole="button"
              accessibilityLabel="Close message"
            >
              <Text style={s.messageButtonText}>OK, Got it</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* <Sheet
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        eyebrow="CRITERIA"
        title="Filters"
        wideMax={520}
        footer={(
          <Btn
            label="Load Data"
            icon="refresh"
            kind="copper"
            style={{ flex: 1 }}
            onPress={() => { fetchList(); setFilterOpen(false); }}
          />
        )}
      >
        <SelectField
          label="Select Year"
          value={selectedYear}
          options={yearOpts}
          placeholder="Select Year"
          onChange={(v) => setSelectedYear(v)}
          style={{ flex: 0 }}
        />
        <SelectField
          label="Select Store"
          value={storeIdx === '-1' ? '' : storeIdx}
          options={storeOpts}
          placeholder="Select Store"
          loading={storesLoading}
          onRefresh={loadStores}
          onChange={(v) => {
            const item = stores[Number(v)];
            if (!item) return;
            setSelectedStore(item);
            setFormStrCode(item.StrCode || item.strcode || '');
          }}
          style={{ flex: 0 }}
        />
      </Sheet> */}

      <Sheet
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        eyebrow="CRITERIA"
        title="Filters"
        wideMax={520}
        footer={
          <Btn
            label="Load Data"
            icon="refresh"
            kind="copper"
            style={{ flex: 1 }}
            onPress={() => {
              fetchList();
              setFilterOpen(false);
            }}
          />
        }
      >
        <View style={{ width: '100%' }}>
          {/* Select Year */}
          <View style={{ width: '100%', marginBottom: 20 }}>
            <SelectField
              label="Select Year"
              value={selectedYear}
              options={yearOpts}
              placeholder="Select Year"
              onChange={(v) => setSelectedYear(v)}
              style={{ width: '100%' }}
            />
          </View>

          {/* Select Store */}
          <View style={{ width: '100%', marginBottom: 8 }}>
            <SelectField
              label="Select Store"
              value={storeIdx === '-1' ? '' : storeIdx}
              options={storeOpts}
              placeholder="Select Store"
              loading={storesLoading}
              onRefresh={loadStores}
              onChange={(v) => {
                const item = stores[Number(v)];

                if (!item) return;

                setSelectedStore(item);
                setFormStrCode(item.StrCode || item.strcode || '');
              }}
              style={{ width: '100%' }}
            />
          </View>
        </View>
      </Sheet>

    </View>
  );
}

/* --------------------------------------------------------------------------- */

function Kpi({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={s.kpi}>
      <TruncText style={s.kpiLabel} numberOfLines={1}>{label}</TruncText>
      <Text style={[s.kpiValue, { color }]}>{value}</Text>
    </View>
  );
}

function KV({ k, v, align = 'left', color, lines = 2 }: { k: string; v: any; align?: 'left' | 'center' | 'right'; color?: string; lines?: number }) {
  const a = align === 'right' ? 'flex-end' : align === 'center' ? 'center' : 'flex-start';
  return (
    <View style={[s.kv, { alignItems: a }]}>
      <Text style={s.kvK}>{k}</Text>
      <TruncText style={[s.kvV, color ? { color } : null, { textAlign: align }]} numberOfLines={lines}>{v ?? ''}</TruncText>
    </View>
  );
}

function PackCard({
  item, tab, open, infoBusy, entries, remark, onRemark, onInfo, onApprove, onReject, busyAct, locked,
}: {
  item: Row; tab: Tab; open: boolean; infoBusy: boolean; entries: Row[]; remark: string;
  onRemark: (t: string) => void; onInfo: () => void; onApprove: () => void; onReject: () => void;
  busyAct: 1 | 2 | null; locked: boolean;
}) {
  const st = statusOf(item);
  const col = statusColor(st);
  const actionable = tab !== 'history' && st === 'pending';
  return (
    <View style={[s.card, S.card, { borderLeftColor: col }]}>
      <View style={s.cardTop}>
        <TruncText style={s.topDate} numberOfLines={1}>{item.voudate}</TruncText>
        <TruncText style={s.topNo} numberOfLines={1}>{item.vouno}</TruncText>
      </View>

      <View style={s.body}>
        <View style={s.partyRow}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <TruncText style={s.parCode} numberOfLines={1}>{item.parcode}</TruncText>
            <TruncText style={s.parName} numberOfLines={2}>{item.parname}</TruncText>
          </View>
          <View style={[s.badge, { borderColor: col, backgroundColor: `${col}14` }]}>
            <TruncText style={[s.badgeText, { color: col }]} numberOfLines={1}>{item.authstatus}</TruncText>
          </View>
        </View>

        <View style={s.hr} />

        <View style={s.row}>
          <KV k="Item" v={item.itmname} />
          <KV k="Merge" v={item.mername} align="right" />
        </View>
        <View style={s.row}>
          <KV k="Grade" v={item.grdname} />
          <KV k="Shade" v={item.shdname} align="right" />
        </View>
        <View style={s.row}>
          <KV k="Qty" v={fmt3(item.qty)} color={T.copper} lines={1} />
          <KV k="Cart No" v={item.cartno || '-'} align="center" lines={1} />
          <KV k="Store" v={item.mainstrname} align="right" color={T.blue} lines={1} />
        </View>
        <View style={[s.row, { alignItems: 'center' }]}>
          <KV k="Prod. No." v={item.prodno || '-'} lines={1} />
          <KV k="Prod. Date" v={item.proddate || '-'} align="center" lines={1} />
          <View style={[s.kv, { alignItems: 'flex-end' }]}>
            <TouchableOpacity style={[s.infoBtn, open && { backgroundColor: T.blue }]} onPress={onInfo} accessibilityLabel="Packing entries">
              {infoBusy
                ? <ActivityIndicator size="small" color={open ? '#fff' : T.blue} />
                : <Icon name={open ? 'expand-less' : 'info-outline'} size={18} color={open ? '#fff' : T.blue} />}
            </TouchableOpacity>
          </View>
        </View>

        {open ? (
          <View style={s.entries}>
            <View style={s.entriesHead}>
              <Text style={s.entriesHeadText}>Packing Date</Text>
              <Text style={s.entriesHeadText}>Packing No</Text>
            </View>
            <ScrollView style={{ maxHeight: 170 }} nestedScrollEnabled showsVerticalScrollIndicator persistentScrollbar bounces={false}>
              {entries.map((p, idx) => (
                <View key={idx} style={s.entryRow}>
                  <TruncText style={s.entryL} numberOfLines={1}>{p?.vouddate}</TruncText>
                  <TruncText style={s.entryR} numberOfLines={1}>{p?.vouno}</TruncText>
                </View>
              ))}
            </ScrollView>
          </View>
        ) : null}

        <View style={s.qtyRow}>
          <KV k="Prod. Qty" v={fmt3(item.qty1)} lines={1} />
          <KV k="1st" v={fmt3(item.qty2)} align="center" lines={1} />
          <KV k="Oth" v={fmt3(item.qty3)} align="right" lines={1} />
        </View>

        {actionable ? (
          <View style={{ gap: 5 }}>
            <Text style={s.fieldLabel}>Remark</Text>
            <TextInput
              placeholder="Enter Remark"
              placeholderTextColor={T.muted}
              value={remark}
              onChangeText={onRemark}
              style={s.remark}
              multiline
            />
          </View>
        ) : null}

        {tab === 'history' ? (
          <>
            <View style={s.hr} />
            {item.aremark ? (
              <View style={s.histRemark}>
                <Text style={s.kvK}>Remark</Text>
                <Text style={s.histRemarkText}>{item.aremark}</Text>
              </View>
            ) : null}
            <View style={s.row}>
              <KV k="Auth By" v={item.authby || '-'} />
              <KV k="Auth Date" v={item.authdate || '-'} align="right" />
            </View>
          </>
        ) : null}
      </View>

      {actionable ? (
        <View style={s.actions}>
          <TouchableOpacity style={[s.act, s.reject, locked && { opacity: 0.5 }]} onPress={onReject} disabled={locked} accessibilityLabel="Reject">
            {busyAct === 2 ? <ActivityIndicator size="small" color={T.red} /> : <Icon name="close" size={18} color={T.red} />}
            <Text style={[s.actText, { color: T.red }]}>Reject</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.act, s.approve, locked && { opacity: 0.5 }]} onPress={onApprove} disabled={locked} accessibilityLabel="Approve">
            {busyAct === 1 ? <ActivityIndicator size="small" color="#fff" /> : <Icon name="check" size={18} color="#fff" />}
            <Text style={[s.actText, { color: '#fff' }]}>Approve</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  content: { padding: 12, width: '100%', maxWidth: 1200, alignSelf: 'center', flexGrow: 1 },
  toolbar: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  toolRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  search: { flex: 1, minWidth: 0, height: 44, flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 10, borderWidth: 1, borderColor: T.border, backgroundColor: T.surface, paddingHorizontal: 12 },
  searchInput: { flex: 1, minWidth: 0, fontSize: 14, color: T.ink, height: 42 },
  iconBtn: { width: 44, height: 44, borderRadius: 10, borderWidth: 1, borderColor: T.border, backgroundColor: T.surface, alignItems: 'center', justifyContent: 'center' },
  ctx: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', maxWidth: '100%', backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, borderRadius: 16, paddingHorizontal: 10, height: 32 },
  ctxText: { fontSize: 12.5, fontWeight: '700', color: T.nav },
  ctxDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: T.border, marginHorizontal: 2 },
  kpis: { flexDirection: 'row', gap: 8 },
  kpi: { flex: 1, minWidth: 0, backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 10 },
  kpiLabel: { fontSize: 10, fontWeight: '800', color: T.muted, letterSpacing: 0.5, textTransform: 'uppercase' },
  kpiValue: { fontSize: 18, fontWeight: '800', marginTop: 2 },
  listInfo: { fontSize: 12, fontWeight: '700', color: T.nav },
  empty: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 24, gap: 6 },
  emptyTitle: { fontSize: 15, fontWeight: '800', color: T.nav },
  emptyText: { fontSize: 13, color: T.muted, textAlign: 'center' },

  card: { backgroundColor: T.surface, borderRadius: 12, borderWidth: 1, borderColor: T.border, borderLeftWidth: 4, overflow: 'hidden' },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10, backgroundColor: T.sub, paddingHorizontal: 12, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: T.hair },
  topDate: { fontSize: 12.5, fontWeight: '700', color: T.muted, flexShrink: 1 },
  topNo: { fontSize: 13.5, fontWeight: '800', color: T.nav, flexShrink: 1 },
  body: { padding: 12, gap: 10 },
  partyRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  parCode: { fontSize: 11.5, fontWeight: '700', color: T.muted },
  parName: { fontSize: 14.5, fontWeight: '800', color: T.ink, marginTop: 1 },
  badge: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 9, paddingVertical: 3, maxWidth: 120 },
  badgeText: { fontSize: 11, fontWeight: '800', textTransform: 'capitalize' },
  hr: { height: 1, backgroundColor: T.hair },
  row: { flexDirection: 'row', gap: 10 },
  kv: { flex: 1, minWidth: 0 },
  kvK: { fontSize: 10.5, fontWeight: '800', color: T.muted, textTransform: 'uppercase', letterSpacing: 0.4 },
  kvV: { fontSize: 13.5, fontWeight: '700', color: T.ink, marginTop: 1 },
  infoBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: T.blue, alignItems: 'center', justifyContent: 'center' },
  entries: { borderWidth: 1, borderColor: T.border, borderRadius: 10, overflow: 'hidden' },
  entriesHead: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: T.alt, paddingHorizontal: 10, paddingVertical: 7 },
  entriesHeadText: { fontSize: 11, fontWeight: '800', color: T.nav, textTransform: 'uppercase' },
  entryRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, paddingHorizontal: 10, paddingVertical: 7, borderTopWidth: 1, borderTopColor: T.hair },
  entryL: { fontSize: 12.5, fontWeight: '600', color: T.ink, flexShrink: 1 },
  entryR: { fontSize: 12.5, fontWeight: '800', color: T.nav, flexShrink: 1, textAlign: 'right' },
  qtyRow: { flexDirection: 'row', gap: 10, backgroundColor: T.sub, borderRadius: 10, padding: 10 },
  fieldLabel: { fontSize: 11, fontWeight: '700', color: T.muted, letterSpacing: 0.4, textTransform: 'uppercase' },
  remark: { minHeight: 44, borderWidth: 1, borderColor: T.border, borderRadius: 10, backgroundColor: T.surface, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: T.ink, textAlignVertical: 'top' },
  histRemark: { backgroundColor: T.sub, borderRadius: 10, padding: 10, gap: 2 },
  histRemarkText: { fontSize: 13, fontWeight: '600', color: T.ink },
  actions: { flexDirection: 'row', gap: 10, padding: 12, borderTopWidth: 1, borderTopColor: T.hair },
  act: { flex: 1, height: 42, borderRadius: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  reject: { borderWidth: 1, borderColor: T.red, backgroundColor: T.surface },
  approve: { backgroundColor: T.green },
  actText: { fontSize: 13.5, fontWeight: '800' },

  messageOverlay: {
    flex: 1,
    backgroundColor: 'rgba(8, 15, 30, 0.62)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  messageCard: {
    maxWidth: 440,
    backgroundColor: T.surface,
    borderRadius: 22,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: T.border,
    elevation: 18,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
  },
  messageIcon: {
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  messageTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: T.ink,
    textAlign: 'center',
    marginBottom: 10,
  },
  messageText: {
    width: '100%',
    fontSize: 15,
    lineHeight: 23,
    color: T.ink,
    textAlign: 'center',
    marginBottom: 24,
  },
  messageButton: {
    width: '100%',
    minHeight: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  messageButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },

});
