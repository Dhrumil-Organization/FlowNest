// FILE: src/components/DesignAuthorizationNEW/index.tsx
// NEW ERP — Design Authorization (replaces legacy components/DesignAuthorization,
// route app/(tabs)/design-authorization.tsx which passed token, isConnected={true}, username).
//
// Legacy sources ported (nothing is imported from the legacy folder):
//   components/DesignAuthorization/index.tsx
//   components/DesignAuthorization/PartyHistoryModal/PartyHistoryModal.tsx → PartyHistorySheet.tsx
//   (customBase64 / encodingUtils / urlSafeEncode are not imported by the legacy screen → not copied;
//    the commented-out PDF viewer / share / stamp blocks are ignored.)
//
// Endpoints (host = `API` prop, `Authorization: Bearer <token prop>`), all in api.ts:
//   GET  ${API}/api/itembrowse        { txntype:'app_item_master_auth', referrer:'dashboard', prptype:'R',
//                                       yearno:<AsyncStorage 'yno'>, strcode, atype }  atype B=Request, h=History, A=Verify
//                                       → response.data.response.data
//   POST ${API}/api/authitem          row (minus d1) + { remark, prptype:'R', isauth, referrer:'dashboard', itmcode,
//                                       strcode:<row.strCode>, yearno:'26', action:'edit',
//                                       txntype:'app_item_master_auth', atype }
//                                       Accept isauth 1/B · Reject 2/B · Verify-Pending 0/A · Verify-Reject 2/A
//                                       → response.data.success / .message / .response.data
//   GET  ${API}/api/get_criterion     { prpcodes:[..], prptype, yearno, strcode:'', parcodes:[..],
//                                       txntype:'purchase_order_detail', fetch:'dr' } → response.data.response.data
//   GET  ${API}/api/crlimitreqbrowse  { text:parcode, txntype:'creditlimithistory', referrer:'dashboard',
//                                       action:'partyhistory', prptype } → response.data.data
//
// AsyncStorage keys: 'yno' (read, in api.ts). Legacy also read 'user_prptype' into an unused variable.
//
// LEGACY BEHAVIOUR KEPT ON PURPOSE (see report):
//   * The legacy screen has NO store selector, so its store code is always ''. Request loads with
//     strcode ''. The History and Verify loaders start with "no store → return", so they never call
//     the server: History is always empty, Verify only shows the rows returned by the last successful
//     POST /api/authitem (legacy puts that response into both the Request and the Verify list).
//     The empty state therefore always adds "No store Selected", exactly like legacy.
//   * POST yearno is the literal "26"; strcode is read from `row.strCode`; Request rows carry
//     `itemNameArray: []` into the POST body.
//   * Pending / Verify-Reject validate the row's stored `aremark`, not the remark typed on the card.
//
// Deliberate deviations:
//   * No own header/search bar: search moved from the legacy HeaderBar into the toolbar (same placeholders).
//   * Legacy called GET /api/getstore once on mount but never used the result → call dropped.
//   * Refresh button on the Request tab re-runs the legacy Request loader (legacy reloads only on tab change).
//   * The row-detail (d1) carousel and the party-history modal exist in legacy but have no visible trigger
//     there (buttons commented out). As in ItemAuthorizationNEW they are reachable through "Details" /
//     "Party history" links that appear only when a row actually carries `d1` lines / a `parcode`.
//   * Button captions "PENDING...." / "REJECT---" are shown as "Pending" / "Reject".
//   * Loader stays up until the newest request finishes (legacy could hide it when an older one was cancelled).
//
// Layout: tabs (Request / History / Verify) · toolbar (search · refresh) · count chip ·
// card grid (1 / 2 / 3 columns) · confirm sheet · party history sheet · row detail sheet · scroll-to-top.
import { TruncText } from '@/src/components/ui/TruncText';
import { AppAlert } from '@/common/utils/appAlert';
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
import { Api, browseItems, fetchPartyHistory, fetchPartyList, postAuthItem } from './api';
import {
  ACTION_TITLE, applyRemarkEdit, authPayload, authTone, EditMap, isNoStore, ItemAction, MainTab, PartyTab, Row,
  searchRows, str, TAB_META, validateAuth, withItemNameArray,
} from './model';
import PartyHistorySheet from './PartyHistorySheet';

type Props = { token: string; API: string; username?: string };

const TONE = { ok: T.green, rej: T.red, pend: T.amber };
const TABS: MainTab[] = ['requests', 'history', 'verify'];

export default function DesignAuthorizationNEW({ token, API }: Props) {
  const api: Api = useMemo(() => ({ API, token }), [API, token]);
  const { width } = useWindowDimensions();
  const cols = width >= 1180 ? 3 : width >= 768 ? 2 : 1;

  /* ------------------------------ state -------------------------------- */
  // legacy FormState.values.StrCode: declared but never set (the screen has no store criteria form)
  const strCode: string = '';
  const noStore = isNoStore(strCode);

  const [tab, setTab] = useState<MainTab>('requests');
  const [queries, setQueries] = useState<Record<MainTab, string>>({ requests: '', history: '', verify: '' });
  const [data, setData] = useState<Row[]>([]);                // requests (atype B)
  const [historyRows, setHistoryRows] = useState<Row[]>([]);  // history  (atype h)
  const [verifyRows, setVerifyRows] = useState<Row[]>([]);    // verify   (atype A)
  const [loading, setLoading] = useState(false);
  const [edits, setEdits] = useState<EditMap>({});

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
  const cancelRef = useRef<CancelTokenSource | null>(null);       // legacy cancelTokenRef (item browse)
  const partyCancelRef = useRef<CancelTokenSource | null>(null);  // legacy `cancelToken` (party calls)
  const loadSeq = useRef(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => () => {
    timers.current.forEach(clearTimeout);
    cancelRef.current?.cancel();
    partyCancelRef.current?.cancel();
  }, []);
  const later = (fn: () => void, ms: number) => { timers.current.push(setTimeout(fn, ms)); };

  /* -------------------------- item browse ------------------------------ */
  // legacy fetchData / fetchAllHistoryData / fetchAllVerifyData: on data → set that tab and clear
  // the other two; no data → clear that tab; error (not a cancel) → alert "Error / Server error".
  const fetchTab = useCallback(async (t: MainTab) => {
    // legacy: only History and Verify are guarded by the store code (the Request guard is commented out)
    if (t !== 'requests' && isNoStore(strCode)) return;
    cancelRef.current?.cancel();
    const src = axios.CancelToken.source();
    cancelRef.current = src;
    const seq = ++loadSeq.current;
    setLoading(true);
    try {
      const r = await browseItems(api, t, strCode, src.token);
      if (r.ok) {
        if (t === 'requests') { setData(withItemNameArray(r.rows)); setHistoryRows([]); setVerifyRows([]); }
        else if (t === 'history') { setHistoryRows(r.rows); setData([]); setVerifyRows([]); }
        else { setVerifyRows(r.rows); setData([]); setHistoryRows([]); }
      } else if (t === 'requests') setData([]);
      else if (t === 'history') setHistoryRows([]);
      else setVerifyRows([]);
    } catch (error) {
      if (!axios.isCancel(error)) AppAlert.alert('Error', 'Server error');
    } finally {
      if (seq === loadSeq.current) setLoading(false);
    }
  }, [api, strCode]);

  // legacy: reload whenever the tab (or token) changes
  useEffect(() => {
    if (!token) return;
    fetchTab(tab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, token]);

  /* --------------------------- lists ----------------------------------- */
  const rowsByTab: Record<MainTab, Row[]> = { requests: data, history: historyRows, verify: verifyRows };
  const allRows = rowsByTab[tab];
  const query = queries[tab];
  const shown = useMemo(() => searchRows(allRows, query), [allRows, query]);
  const setQuery = (v: string) => setQueries((q) => ({ ...q, [tab]: v }));

  const changeTab = (t: MainTab) => {
    if (t === tab) return;
    setShowTop(false); // each legacy tab had its own list, starting at the top
    setTab(t);
  };

  /* ------------------------ party history ------------------------------ */
  const fetchHistoryData = async (parcode: string, prptype: string) => {
    if (isNoStore(strCode)) return; // legacy guard
    partyCancelRef.current?.cancel();
    const src = axios.CancelToken.source();
    partyCancelRef.current = src;
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
    partyCancelRef.current?.cancel();
    const src = axios.CancelToken.source();
    partyCancelRef.current = src;
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
        // legacy: both the Request and the Verify list are replaced by the response rows
        setData(apiData);
        setVerifyRows(apiData);
        later(() => { setSuccess(false); setShowOverlay(false); }, 2000);
      } else {
        setRespOk(false);
        setRespMsg(response.data.message || 'Failed');
        later(() => setSuccess(false), 2000);
      }
    } catch (error) {
      setRespOk(false);
      setRespMsg('Server Error');
      later(() => setSuccess(false), 2000);
    }
  };

  /* ----------------------------- render -------------------------------- */
  const renderCard = ({ item }: { item: Row }) => {
    const tone = authTone(item.IsAuth);
    const toneC = TONE[tone];
    const disabled = !!item.isProcessed; // legacy: !isConnected || item.isProcessed (route always passed isConnected = true)
    const accent = tab === 'requests'
      ? item.actionType === 'accept' ? T.green : item.actionType === 'reject' ? T.red : T.border
      : tone === 'pend' ? T.border : toneC;
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
            <View style={[s.badge, { backgroundColor: `${toneC}14`, borderColor: toneC }]}>
              <TruncText style={[s.badgeText, { color: toneC }]} numberOfLines={1}>{str(item.AuthStatus) || '-'}</TruncText>
            </View>
          </View>

          <View style={s.kv}>
            <KV k="Main Item Code" v={item.MItmCode} />
            <KV k="Main Item Name" v={item.MItmName} />
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
                  <Icon name="info-outline" size={16} color={T.blue} />
                  <Text style={s.linkText}>Details ({item.d1.length})</Text>
                </TouchableOpacity>
              ) : null}
              {hasParty ? (
                <TouchableOpacity style={s.link} onPress={() => handleIconPress(item, 'list')}>
                  <Icon name="history" size={16} color={T.blue} />
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
  const positive = confirm?.action === 'accept' || confirm?.action === 'pending';

  return (
    <View style={s.root}>
      <View style={s.top}>
        <Segment
          value={tab}
          onChange={(v) => changeTab(v as MainTab)}
          options={TABS.map((t) => ({ value: t, label: TAB_META[t].label }))}
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
              <TouchableOpacity onPress={() => setQuery('')} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} accessibilityLabel="Clear search">
                <Icon name="close" size={16} color={T.muted} />
              </TouchableOpacity>
            ) : null}
          </View>
          {tab === 'requests' ? (
            <TouchableOpacity style={s.toolBtn} onPress={() => fetchTab('requests')} disabled={loading} accessibilityLabel="Refresh">
              {loading ? <ActivityIndicator size="small" color={T.copper} /> : <Icon name="refresh" size={20} color={T.nav} />}
            </TouchableOpacity>
          ) : null}
        </View>
        <View style={s.chips}>
          <View style={s.chip}>
            <Text style={s.chipText}>{TAB_META[tab].label}</Text>
            <View style={s.chipCount}><Text style={s.chipCountText}>{query ? `${shown.length}/${allRows.length}` : allRows.length}</Text></View>
          </View>
        </View>
      </View>

      <FlatList
        key={`cols-${cols}-${tab}`}
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
              <Text style={s.emptyText}>{TAB_META[tab].empty}</Text>
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
        eyebrow="DESIGN AUTHORIZATION"
        title={confirmTitle}
        wideMax={460}
        footer={
          success ? null : (
            <>
              <Btn label="Cancel" icon="close" kind="ghost" onPress={() => setShowOverlay(false)} style={{ flex: 1, borderColor: T.red }} />
              <Btn
                label={confirm?.action === 'pending' ? 'Pending' : confirm?.action === 'accept' ? 'Accept' : 'Reject'}
                icon="check"
                kind={positive ? 'primary' : 'danger'}
                onPress={handleConfirmAction}
                style={[{ flex: 1 }, positive && { backgroundColor: T.green }]}
              />
            </>
          )
        }
      >
        <Text style={s.kvK}>Item Name</Text>
        <Text style={s.confirmName}>{str(confirm?.item?.ItmName) || '-'}</Text>
        {confirm && str(confirm.item.ItmCode) ? <Text style={s.confirmSub}>{str(confirm.item.ItmCode)}</Text> : null}
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
  kvItem: { width: '50%', paddingRight: 8, minWidth: 0 },
  kvK: { fontSize: 10.5, fontWeight: '800', color: T.muted, textTransform: 'uppercase', letterSpacing: 0.4 },
  kvV: { fontSize: 13, fontWeight: '600', color: T.ink, marginTop: 1 },
  input: { height: 40, borderWidth: 1, borderColor: T.border, borderRadius: 10, backgroundColor: T.sub, paddingHorizontal: 10, fontSize: 14, color: T.ink, marginTop: 4 },
  linkRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  link: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 40 },
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
  loader: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: `${T.bg}8C` },
  loaderBox: { backgroundColor: T.surface, borderRadius: 14, paddingVertical: 18, paddingHorizontal: 26, alignItems: 'center', gap: 8, borderWidth: 1, borderColor: T.border },
  loaderText: { fontSize: 13, fontWeight: '700', color: T.nav },
  topBtn: { position: 'absolute', right: 16, bottom: 16, width: 44, height: 44, borderRadius: 22, backgroundColor: T.nav, alignItems: 'center', justifyContent: 'center' },
  confirmName: { fontSize: 16, fontWeight: '800', color: T.nav },
  confirmSub: { fontSize: 12.5, color: T.muted, fontWeight: '600' },
  respRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  respText: { fontSize: 14, fontWeight: '700', color: T.nav },
  d1Card: { backgroundColor: T.sub, borderRadius: 12, borderWidth: 1, borderColor: T.hair, padding: 12, gap: 8 },
});
