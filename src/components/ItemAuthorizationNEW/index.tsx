// FILE: src/components/ItemAuthorizationNEW/index.tsx
// NEW ERP — Item Authorization (replaces legacy src/components/ItemAuthorization,
// route app/(tabs)/item-authorization.tsx).
//
// Legacy sources ported (nothing is imported from the legacy folder):
//   src/components/ItemAuthorization/index.tsx
//   src/components/ItemAuthorization/CriteriaForm.tsx            → CriteriaSheet.tsx
//   src/components/ItemAuthorization/PartyHistoryModal/…tsx      → PartyHistorySheet.tsx
//   common/API/Functions.tsx fetchAllStoredata                   → api.ts fetchStores
//   (encodingUtils / urlSafeEncode / customBase64 are not used by the live legacy
//    screen, so they are not copied; "YarnPurchaseOrder copy.tsx" is ignored.)
//
// Endpoints (host = `API` prop, `Authorization: Bearer <token prop>`):
//   GET  ${API}/api/getstore          { prpcode:'', yearno:<AsyncStorage yno>, txntype:'sales_order',
//                                       prptype:<AsyncStorage user_prptype> }  (x-platform: mob)
//   GET  ${API}/api/itembrowse        { txntype:'app_item_master_auth', referrer:'dashboard', prptype:'R',
//                                       yearno:<FY 2-digit>, strcode, atype }  atype B=Request, h=History, A=Verify
//   POST ${API}/api/authitem          row (minus d1) + { remark, prptype:'R', isauth, referrer, itmcode,
//                                       strcode, yearno, action:'edit', txntype:'app_item_master_auth', atype }
//                                       Accept isauth 1/B · Reject 2/B · Verify-Pending 0/A · Verify-Reject 2/A
//   GET  ${API}/api/get_criterion     { prpcodes:[..], prptype, yearno, strcode:'', parcodes:[..],
//                                       txntype:'purchase_order_detail', fetch:'dr' }   (party history → parties)
//   GET  ${API}/api/crlimitreqbrowse  { text:parcode, txntype:'creditlimithistory', referrer:'dashboard',
//                                       action:'partyhistory', prptype }              (party history → history)
//
// Layout: tabs (Request / History / Verify) · toolbar (search · store criteria · refresh) ·
// store/count chips · card grid (1 / 2 / 3 columns) · confirm sheet · party history sheet ·
// item detail (d1) sheet · scroll-to-top.
import { TruncText } from '@/src/components/ui/TruncText';
import AppAlert from '@/common/utils/appAlert';
import AsyncStorage from '@/common/utils/compatibleStorage';
import { T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import axios, { CancelTokenSource } from 'axios';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { Btn, Segment, Sheet } from '../StockVerificationNEW/ui';
import { Api, browseItems, fetchPartyHistory, fetchPartyList, fetchStores, postAuthItem } from './api';
import CriteriaSheet from './CriteriaSheet';
import {
  ACTION_TITLE, applyRemarkEdit, authPayload, authTone, EditMap, ItemAction, MainTab, PartyTab, Row,
  searchRows, str, TAB_META, validateAuth,
} from './model';
import PartyHistorySheet from './PartyHistorySheet';

type Props = { token: string; API: string; username?: string };

const TONE = {
  ok: { c: T.green, bg: '#E8F1EC' },
  rej: { c: T.red, bg: '#F8E9E6' },
  pend: { c: T.amber, bg: '#FBF3E3' },
};

export default function ItemAuthorizationNEW({ token, API }: Props) {
  const api: Api = useMemo(() => ({ API, token }), [API, token]);
  const { width } = useWindowDimensions();
  const cols = width >= 1180 ? 3 : width >= 768 ? 2 : 1;

  /* ------------------------------ state -------------------------------- */
  const [tab, setTab] = useState<MainTab>('requests');
  const [queries, setQueries] = useState<Record<MainTab, string>>({ requests: '', history: '', verify: '' });
  const [data, setData] = useState<Row[]>([]);                // requests (atype B)
  const [historyRows, setHistoryRows] = useState<Row[]>([]);  // history  (atype h)
  const [verifyRows, setVerifyRows] = useState<Row[]>([]);    // verify   (atype A)
  const [loading, setLoading] = useState(false);
  const [edits, setEdits] = useState<EditMap>({});

  const [strCode, setStrCode] = useState('');
  const [stores, setStores] = useState<Row[]>([]);
  const [storesLoading, setStoresLoading] = useState(false);
  const [criteriaOpen, setCriteriaOpen] = useState(false);

  const [confirm, setConfirm] = useState<{ item: Row; action: ItemAction } | null>(null);
  const [showOverlay, setShowOverlay] = useState(false);
  const [success, setSuccess] = useState(false);
  const [respMsg, setRespMsg] = useState('');
  const [respOk, setRespOk] = useState(false);

  const [showParty, setShowParty] = useState(false);
  const [partyTab, setPartyTab] = useState<PartyTab>('party');
  const [partyList, setPartyList] = useState<Row[]>([]);
  const [partyHistory, setPartyHistory] = useState<Row[]>([]);
  const [partyLoading, setPartyLoading] = useState(false);
  const [partyHistLoading, setPartyHistLoading] = useState(false);
  const [parname, setParname] = useState('');

  const [d1Open, setD1Open] = useState(false);
  const [d1Rows, setD1Rows] = useState<Row[]>([]);
  const [d1Party, setD1Party] = useState('');

  const [showTop, setShowTop] = useState(false);
  const listRef = useRef<FlatList>(null);
  const cancelRef = useRef<CancelTokenSource | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const didFetchStore = useRef(false);

  useEffect(() => () => { timers.current.forEach(clearTimeout); cancelRef.current?.cancel(); }, []);
  const later = (fn: () => void, ms: number) => { timers.current.push(setTimeout(fn, ms)); };

  /* ------------------------- stores (once) ----------------------------- */
  const loadStores = useCallback(async () => {
    setStoresLoading(true);
    try {
      const yno = await AsyncStorage.getItem('yno');
      setStores(await fetchStores(api, yno));
    } finally {
      setStoresLoading(false);
    }
  }, [api]);

  useEffect(() => {
    if (!token) return;
    if (didFetchStore.current) return;
    didFetchStore.current = true;
    loadStores();
  }, [token, loadStores]);

  /* -------------------------- item browse ------------------------------ */
  // legacy fetchData / fetchAllHistoryData / fetchAllVerifyData: on data → set that
  // tab and clear the other two; no data → clear that tab; error → "Server error".
  const fetchTab = useCallback(async (t: MainTab, strcode: string) => {
    setLoading(true);
    try {
      const r = await browseItems(api, t, strcode);
      if (r.ok) {
        if (t === 'requests') { setData(r.rows); setHistoryRows([]); setVerifyRows([]); }
        else if (t === 'history') { setHistoryRows(r.rows); setData([]); setVerifyRows([]); }
        else { setVerifyRows(r.rows); setData([]); setHistoryRows([]); }
      } else if (t === 'requests') setData([]);
      else if (t === 'history') setHistoryRows([]);
      else setVerifyRows([]);
    } catch (error) {
      if (!axios.isCancel(error)) AppAlert.alert('Error', 'Server error');
    } finally {
      setLoading(false);
    }
  }, [api]);

  // legacy: reload whenever the tab (or token) changes, with the current store
  useEffect(() => {
    if (!token) return;
    fetchTab(tab, strCode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, token]);

  /* --------------------------- lists ----------------------------------- */
  const rowsByTab: Record<MainTab, Row[]> = { requests: data, history: historyRows, verify: verifyRows };
  const allRows = rowsByTab[tab];
  const query = queries[tab];
  const shown = useMemo(() => searchRows(allRows, query), [allRows, query]);
  const setQuery = (v: string) => setQueries((q) => ({ ...q, [tab]: v }));
  const storeName = useMemo(() => {
    const s = stores.find((x) => str(x.StrCode) === strCode);
    return s ? str(s.StrName) || strCode : strCode;
  }, [stores, strCode]);

  /* ------------------------ party history ------------------------------ */
  const fetchHistoryData = async (parcode: string, prptype: string) => {
    if (typeof strCode == 'undefined' || strCode == null || strCode == '') return;
    cancelRef.current?.cancel();
    const src = axios.CancelToken.source();
    cancelRef.current = src;
    setPartyHistLoading(true);
    try {
      const rows = await fetchPartyHistory(api, parcode, prptype, src.token);
      if (rows) {
        setPartyHistory(rows);
        // legacy side effect kept: clears the Verify and Request lists
        setVerifyRows([]);
        setData([]);
      } else setPartyHistory([]);
    } catch (error) {
      if (!axios.isCancel(error)) AppAlert.alert('Error', 'Server error');
    } finally {
      setPartyHistLoading(false);
    }
  };

  const handleListIconClick = async (prpcode: string, prptype: string, yearno: string, parcode: string) => {
    setPartyTab('party');
    cancelRef.current?.cancel();
    const src = axios.CancelToken.source();
    cancelRef.current = src;
    setPartyLoading(true);
    try {
      const rows = await fetchPartyList(api, prpcode, prptype, yearno, parcode, src.token);
      if (rows) {
        setPartyList(rows);
        fetchHistoryData(parcode, prptype);
      } else setPartyList([]);
    } catch (error) {
      if (!axios.isCancel(error)) AppAlert.alert('Error', 'Server error');
    } finally {
      setPartyLoading(false);
    }
  };

  /* ---------------------------- actions -------------------------------- */
  const handleIconPress = (item: Row, action: ItemAction) => {
    setConfirm({ item, action });
    if (action === 'list') {
      handleListIconClick(item.prpcode, item.prptype, item.yearno, item.parcode);
      setShowParty(true);
      setParname(item.parname);
      return;
    }
    setShowOverlay(true);
  };

  const handleInfoPress = (d1: any, item: Row) => {
    setD1Rows(Array.isArray(d1) ? d1 : []);
    setD1Party(item.ParName);
    setD1Open(true);
  };

  const handleConfirmAction = async () => {
    if (!confirm) return;
    const { item, action } = confirm;
    const payload = authPayload(item, action, edits);
    const invalid = validateAuth(payload, action);
    if (invalid) {
      AppAlert.alert('Validation Error', invalid);
      setShowOverlay(false);
      return;
    }
    setSuccess(true);
    setRespMsg('Loading...');
    try {
      const response = await postAuthItem(api, payload);
      if (response?.data?.success) {
        setRespOk(true);
        setRespMsg(response.data.message || 'Success');
        const apiData = response?.data?.response?.data || [];
        // legacy: both the Request and Verify lists are replaced by the response rows
        setData(apiData);
        setVerifyRows(apiData);
        later(() => { setSuccess(false); setShowOverlay(false); }, 2000);
      } else {
        setRespOk(false);
        setRespMsg(response?.data?.message || 'Failed');
        later(() => setSuccess(false), 2000);
      }
    } catch (error) {
      setRespOk(false);
      setRespMsg('Server Error');
      later(() => setSuccess(false), 2000);
    }
  };

  /* ----------------------------- render -------------------------------- */
  const noStore = !strCode;

  const renderCard = ({ item }: { item: Row }) => {
    const tone = TONE[authTone(item.IsAuth)];
    const disabled = !!item.isProcessed;
    const accent = tab === 'requests'
      ? item.actionType === 'accept' ? T.green : item.actionType === 'reject' ? T.red : T.border
      : authTone(item.IsAuth) === 'pend' ? T.border : tone.c;
    const hasD1 = Array.isArray(item.d1) && item.d1.length > 0;
    const hasParty = !!str(item.parcode);
    return (
      <View style={{ width: `${100 / cols}%` as any, padding: 6 }}>
        <View style={[s.card, { borderLeftColor: accent }]}>
          <View style={s.cardTop}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <TruncText style={s.eyebrow} numberOfLines={1}>ITEM · {str(item.ItmCode) || '-'}</TruncText>
              <TruncText style={s.title} numberOfLines={2}>{str(item.ItmName) || '-'}</TruncText>
            </View>
            <View style={[s.badge, { backgroundColor: tone.bg, borderColor: tone.c }]}>
              <TruncText style={[s.badgeText, { color: tone.c }]} numberOfLines={1}>{str(item.AuthStatus) || '-'}</TruncText>
            </View>
          </View>

          <View style={s.kv}>
            <KV k="Main Item Code" v={item.MItmCode} />
            <KV k="Main Item Name" v={item.MItmName} />
            <KV k="Store" v={item.StrName} />
            <KV k="Denier" v={item.Denier} />
            <KV k="Item Sub Group" v={item.IsgName} />
            <KV k="Item Group" v={item.IgName} />
          </View>

          {tab === 'history' ? (
            <View>
              <Text style={s.kvK}>Remark</Text>
              <Text style={[s.kvV, { color: T.blue }]}>{str(item.aremark) || '-'}</Text>
            </View>
          ) : (
            <View>
              <Text style={s.kvK}>Remark</Text>
              <TextInput
                style={s.input}
                value={edits[item.ItmCode]?.aremark || ''}
                onChangeText={(text) => setEdits((prev) => applyRemarkEdit(prev, item.ItmCode, text))}
                placeholder="Enter remark..."
                placeholderTextColor={T.muted}
              />
            </View>
          )}

          {hasD1 || hasParty ? (
            <View style={s.linkRow}>
              {hasD1 ? (
                <TouchableOpacity style={s.link} onPress={() => handleInfoPress(item.d1, item)}>
                  <Icon name="info-outline" size={15} color={T.blue} />
                  <Text style={s.linkText}>Details ({item.d1.length})</Text>
                </TouchableOpacity>
              ) : null}
              {hasParty ? (
                <TouchableOpacity style={s.link} onPress={() => handleIconPress(item, 'list')}>
                  <Icon name="history" size={15} color={T.blue} />
                  <Text style={s.linkText}>Party history</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : null}

          {tab !== 'history' ? (
            <View style={s.actions}>
              <TouchableOpacity
                style={[s.actBtn, s.approve, disabled && s.disabled]}
                disabled={disabled}
                onPress={() => handleIconPress(item, tab === 'requests' ? 'accept' : 'pending')}
              >
                <Icon name={tab === 'requests' ? 'check' : 'hourglass-empty'} size={16} color="#fff" />
                <Text style={[s.actText, { color: '#fff' }]}>{tab === 'requests' ? 'Accept' : 'Pending'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.actBtn, s.reject, disabled && s.disabled]}
                disabled={disabled}
                onPress={() => handleIconPress(item, tab === 'requests' ? 'reject' : 'verifyreject')}
              >
                <Icon name="close" size={16} color={T.red} />
                <Text style={[s.actText, { color: T.red }]}>Reject</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      </View>
    );
  };

  const confirmTitle = confirm ? ACTION_TITLE[confirm.action] : '';
  const confirmOpen = showOverlay && !!confirm && confirm.action !== 'list';

  return (
    <View style={s.root}>
      <View style={s.top}>
        <Segment
          value={tab}
          onChange={(v) => setTab(v as MainTab)}
          options={(['requests', 'history', 'verify'] as MainTab[]).map((t) => ({ value: t, label: TAB_META[t].label }))}
        />
        <View style={s.toolbar}>
          <View style={s.search}>
            <Icon name="search" size={18} color={T.muted} />
            <TextInput
              style={s.searchInput}
              placeholder={TAB_META[tab].search}
              placeholderTextColor={T.muted}
              value={query}
              onChangeText={setQuery}
            />
            {query ? (
              <TouchableOpacity onPress={() => setQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Icon name="close" size={16} color={T.muted} />
              </TouchableOpacity>
            ) : null}
          </View>
          <TouchableOpacity style={[s.toolBtn, !noStore && { borderColor: T.copper }]} onPress={() => setCriteriaOpen(true)} accessibilityLabel="Select store">
            <Icon name="tune" size={20} color={noStore ? T.nav : T.copper} />
          </TouchableOpacity>
          <TouchableOpacity style={s.toolBtn} onPress={() => fetchTab(tab, strCode)} disabled={loading} accessibilityLabel="Refresh">
            {loading ? <ActivityIndicator size="small" color={T.copper} /> : <Icon name="refresh" size={20} color={T.nav} />}
          </TouchableOpacity>
        </View>
        <View style={s.chips}>
          <TouchableOpacity style={s.chip} onPress={() => setCriteriaOpen(true)}>
            <Icon name="store" size={14} color={noStore ? T.red : T.nav} />
            <TruncText style={[s.chipText, noStore && { color: T.red }]} numberOfLines={1} tapReveal={false}>{noStore ? 'No store selected' : storeName}</TruncText>
          </TouchableOpacity>
          <View style={s.chip}>
            <Text style={s.chipText}>{TAB_META[tab].label}</Text>
            <View style={s.chipCount}><Text style={s.chipCountText}>{query ? `${shown.length}/${allRows.length}` : allRows.length}</Text></View>
          </View>
        </View>
      </View>

      <FlatList
        key={`cols-${cols}`}
        ref={listRef}
        data={shown}
        numColumns={cols}
        renderItem={renderCard}
        keyExtractor={(item, i) => `${str(item.UId) || str(item.ItmCode)}-${i}`}
        contentContainerStyle={s.list}
        keyboardShouldPersistTaps="handled"
        onScroll={({ nativeEvent }) => setShowTop(nativeEvent.contentOffset.y > 100)}
        scrollEventThrottle={64}
        ListEmptyComponent={
          !loading ? (
            <View style={s.empty}>
              <Icon name="inventory-2" size={34} color={T.muted} />
              <Text style={s.emptyText}>{query && allRows.length ? 'No match for your search' : TAB_META[tab].empty}</Text>
              {noStore ? <Text style={s.emptyRed}>No store Selected</Text> : null}
            </View>
          ) : null
        }
      />

      {loading ? (
        <View style={s.loader} pointerEvents="none">
          <View style={s.loaderBox}>
            <ActivityIndicator size="large" color={T.copper} />
            <Text style={s.loaderText}>Loading...</Text>
          </View>
        </View>
      ) : null}

      {showTop ? (
        <TouchableOpacity style={s.topBtn} onPress={() => listRef.current?.scrollToOffset({ offset: 0, animated: true })} accessibilityLabel="Scroll to top">
          <Icon name="arrow-upward" size={22} color="#fff" />
        </TouchableOpacity>
      ) : null}

      {/* confirm (legacy overlay): buttons, or the running / result message for 2 s */}
      <Sheet
        open={confirmOpen}
        onClose={() => setShowOverlay(false)}
        eyebrow="ITEM AUTHORIZATION"
        title={confirmTitle}
        wideMax={460}
        footer={
          success ? null : (
            <>
              <Btn label="Cancel" icon="close" kind="ghost" onPress={() => setShowOverlay(false)} style={{ flex: 1, borderColor: T.red }} />
              <Btn
                label={confirm?.action === 'pending' ? 'Pending' : confirm?.action === 'accept' ? 'Accept' : 'Reject'}
                icon="check"
                kind={confirm?.action === 'accept' || confirm?.action === 'pending' ? 'primary' : 'danger'}
                onPress={handleConfirmAction}
                style={[{ flex: 1 }, (confirm?.action === 'accept' || confirm?.action === 'pending') && { backgroundColor: T.green }]}
              />
            </>
          )
        }
      >
        <Text style={s.kvK}>Item Name</Text>
        <Text style={s.confirmName}>{str(confirm?.item?.ItmName) || '-'}</Text>
        {confirm ? (
          <Text style={s.confirmSub}>
            {str(confirm.item.ItmCode)}{str(confirm.item.StrName) ? ` · ${str(confirm.item.StrName)}` : ''}
          </Text>
        ) : null}
        {success ? (
          respMsg === 'Loading...' ? (
            <View style={s.respRow}><ActivityIndicator size="small" color={T.copper} /><Text style={s.respText}>{respMsg}</Text></View>
          ) : (
            <Text style={[s.respText, { color: respOk ? T.green : T.red }]}>{respMsg}</Text>
          )
        ) : null}
      </Sheet>

      <PartyHistorySheet
        visible={showParty}
        onClose={() => {
          setShowParty(false);
          setHistoryRows([]); // legacy side effect kept
        }}
        partyList={partyList}
        historyData={partyHistory}
        partyLoading={partyLoading}
        historyLoading={partyHistLoading}
        activeTab={partyTab}
        setActiveTab={setPartyTab}
        parname={parname}
      />

      {/* legacy "carousel" of the row's d1 lines */}
      <Sheet open={d1Open} onClose={() => { setD1Open(false); setD1Rows([]); }} eyebrow="ITEM DETAILS" title={str(d1Party) || 'Details'} wideMax={720}>
        {d1Rows.map((d, i) => (
          <View key={`${str(d.SrNo) || i}`} style={s.d1Card}>
            <TruncText style={s.title} numberOfLines={2}>{str(d.ItmName) || '-'}</TruncText>
            <View style={s.kv}>
              <KV k="Grade" v={d.GrdName} />
              <KV k="Shade" v={d.ShdName} />
              <KV k="Qty" v={d.Qty} />
              <KV k="Rate" v={d.UnitRate} />
              <KV k="Amount" v={d.Amount} />
              <KV k="Disc. %" v={d.DisPer} />
              {tab === 'requests' ? (
                <>
                  <KV k="Current Stock" v={d.CurrentStock} />
                  <KV k="Last Party" v={d.LastParty} />
                  <KV k="Last Rate" v={d.LastRate} />
                  <KV k="Last Shade" v={d.LastShade} />
                </>
              ) : null}
            </View>
          </View>
        ))}
      </Sheet>

      <CriteriaSheet
        isVisible={criteriaOpen}
        onClose={() => setCriteriaOpen(false)}
        isLoading={loading}
        strCode={strCode}
        setStrCode={setStrCode}
        stores={stores}
        storesLoading={storesLoading}
        onReloadStores={loadStores}
        onLoad={(sc) => fetchTab(tab, sc)}
      />
    </View>
  );
}

function KV({ k, v }: { k: string; v: any }) {
  return (
    <View style={s.kvItem}>
      <TruncText style={s.kvK} numberOfLines={1}>{k}</TruncText>
      <TruncText style={s.kvV} numberOfLines={2}>{str(v) || '-'}</TruncText>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  top: { padding: 12, paddingBottom: 6, gap: 10, width: '100%', maxWidth: 1200, alignSelf: 'center' },
  toolbar: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  search: { flex: 1, minWidth: 0, height: 44, flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 10, borderWidth: 1, borderColor: T.border, backgroundColor: T.surface, paddingHorizontal: 12 },
  searchInput: { flex: 1, minWidth: 0, fontSize: 14, color: T.ink, height: 42 },
  toolBtn: { width: 44, height: 44, borderRadius: 10, borderWidth: 1, borderColor: T.border, backgroundColor: T.surface, alignItems: 'center', justifyContent: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 32, paddingHorizontal: 10, borderRadius: 16, borderWidth: 1, borderColor: T.border, backgroundColor: T.surface, maxWidth: '100%' },
  chipText: { fontSize: 12.5, fontWeight: '700', color: T.nav, flexShrink: 1 },
  chipCount: { minWidth: 24, height: 22, borderRadius: 11, paddingHorizontal: 6, backgroundColor: T.alt, alignItems: 'center', justifyContent: 'center' },
  chipCountText: { fontSize: 11.5, fontWeight: '800', color: T.nav },
  list: { paddingHorizontal: 6, paddingBottom: 24, width: '100%', maxWidth: 1212, alignSelf: 'center', flexGrow: 1 },
  card: { flex: 1, backgroundColor: T.surface, borderRadius: 12, borderWidth: 1, borderColor: T.border, borderLeftWidth: 4, padding: 12, gap: 10 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  eyebrow: { fontSize: 10, fontWeight: '800', color: T.copper, letterSpacing: 0.8 },
  title: { fontSize: 14.5, fontWeight: '800', color: T.nav, marginTop: 1 },
  badge: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2, maxWidth: '40%' },
  badgeText: { fontSize: 10.5, fontWeight: '800' },
  kv: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 8 },
  kvItem: { width: '50%', paddingRight: 8 },
  kvK: { fontSize: 10.5, fontWeight: '800', color: T.muted, textTransform: 'uppercase', letterSpacing: 0.4 },
  kvV: { fontSize: 13, fontWeight: '600', color: T.ink, marginTop: 1 },
  input: { height: 40, borderWidth: 1, borderColor: T.border, borderRadius: 10, backgroundColor: T.sub, paddingHorizontal: 10, fontSize: 14, color: T.ink, marginTop: 4 },
  linkRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  link: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  linkText: { fontSize: 12.5, fontWeight: '700', color: T.blue },
  actions: { flexDirection: 'row', gap: 8, borderTopWidth: 1, borderTopColor: T.hair, paddingTop: 10 },
  actBtn: { flex: 1, height: 40, borderRadius: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  approve: { backgroundColor: T.green },
  reject: { backgroundColor: T.surface, borderWidth: 1, borderColor: T.red },
  disabled: { opacity: 0.4 },
  actText: { fontSize: 13, fontWeight: '800' },
  empty: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 24, gap: 6 },
  emptyText: { fontSize: 13.5, color: T.muted, textAlign: 'center', fontWeight: '600' },
  emptyRed: { fontSize: 13, color: T.red, fontWeight: '700' },
  loader: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(245,242,238,0.55)' },
  loaderBox: { backgroundColor: T.surface, borderRadius: 14, paddingVertical: 18, paddingHorizontal: 26, alignItems: 'center', gap: 8, borderWidth: 1, borderColor: T.border },
  loaderText: { fontSize: 13, fontWeight: '700', color: T.nav },
  topBtn: { position: 'absolute', right: 16, bottom: 16, width: 44, height: 44, borderRadius: 22, backgroundColor: T.nav, alignItems: 'center', justifyContent: 'center' },
  confirmName: { fontSize: 16, fontWeight: '800', color: T.nav },
  confirmSub: { fontSize: 12.5, color: T.muted, fontWeight: '600' },
  respRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  respText: { fontSize: 14, fontWeight: '700', color: T.nav },
  d1Card: { backgroundColor: T.sub, borderRadius: 12, borderWidth: 1, borderColor: T.hair, padding: 12, gap: 8 },
});
