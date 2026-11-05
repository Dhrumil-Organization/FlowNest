// FILE: src/components/SalesOrderInactiveNEW/index.tsx
// NEW ERP — Sales Order (Inactive) (replaces legacy screen).
// Legacy source : src/components/SalesOrderInActive/index.tsx (+ PartyHistoryModal/PartyHistoryModal.tsx)
//                 (identical copy: components/SalesOrderInActive/ — the one the legacy route imports)
// Legacy route  : app/(tabs)/sales order-inactive.tsx  (token, isConnected=true, username)
// Endpoints (same as legacy, host = `API` prop, Bearer = `token` prop):
//   GET  /api/sosortbrowse     { txntype:'sales_order', referrer:'dashboard', prptype:'R', yearno:<FY yy>,
//                                strtype:['Y','G'], strcodes:['001','002','005'],
//                                atype:'B', status:'I' }  — Request tab        (response.data.response.data)
//                                atype:'H', status:'P' }  — Active History tab
//                                atype:'H', status:'C' }  — Close History tab
//   GET  /api/get_criterion    { prpcodes:[prpcode], prptype, yearno, strcode:'', parcodes:[parcode],
//                                txntype:'sales_order', fetch:'dr' }            — party list (party history sheet)
//   GET  /api/crlimitreqbrowse { text:parcode, txntype:'creditlimithistory', referrer:'dashboard',
//                                action:'partyhistory', prptype }               — credit limit history (response.data.data)
//   GET  /api/activeso         params = row without d1 + { Remark, IsAuth:1, referrer:'dashboard',
//                                txntype:'sales_order', action:'edit' }         — ACTIVE (Content-Type application/javascript)
//   POST /api/closesalesorder  { PrpCode, StrCode, YearNo:<row.yearno>, UId, DueDay, Remark, referrer:'dashboard' } — CLOSE
// AsyncStorage keys read: none (legacy only used the token).
// Legacy encoding helpers (customBase64 / encodingUtils / urlSafeEncode) are not imported by the screen, so not ported.
import { AppAlert } from '@/common/utils/appAlert';
import { S, T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import axios, { CancelTokenSource } from 'axios';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { Btn, Opt, Segment, Sheet } from '../StockVerificationNEW/ui';
import {
  activePayload, activeSO, authTone, closePayload, closeSO, displayValue, fetchBrowse, fetchPartyHistory,
  fetchPartyList, groupD1, MainTab, netAmtNum, PartyTab, Row, searchRows, SoAction, str,
} from './api';
import PartyHistorySheet from './PartyHistorySheet';

type Props = { token: string; API: string; username?: string; isConnected?: boolean | null };

const TAB_OPTS: Opt[] = [
  { value: 'requests', label: 'Request' },
  { value: 'Activehistory', label: 'Active History' },
  { value: 'Closehistory', label: 'Close History' },
];

const TAB_META: Record<MainTab, { search: string; empty: string }> = {
  requests: { search: 'Search sales order...', empty: 'No request data found!' },
  Activehistory: { search: 'Search sales history...', empty: 'No history data found!' },
  Closehistory: { search: 'Search sales Closehistory...', empty: 'No Closehistory data found!' },
};

const TONE = {
  ok: { c: T.green, bg: '#E8F1EC', label: 'AUTHORISED' },
  rej: { c: T.red, bg: '#F8E9E6', label: 'REJECTED' },
  pend: { c: T.amber, bg: '#FBF3E3', label: 'PENDING' },
};

const inr = (n: number) => n.toLocaleString('en-IN');

export default function SalesOrderInactiveNEW({ token, API, isConnected = true }: Props) {
  const { width } = useWindowDimensions();
  const phone = width < 768;
  const cols = width >= 1180 ? 3 : width >= 768 ? 2 : 1;
  const gridCols = width > 600 ? 3 : 2; // legacy info-modal numColumns

  const [tab, setTab] = useState<MainTab>('requests');
  const [queries, setQueries] = useState<Record<MainTab, string>>({ requests: '', Activehistory: '', Closehistory: '' });
  const [lists, setLists] = useState<Record<MainTab, Row[]>>({ requests: [], Activehistory: [], Closehistory: [] });
  const [loading, setLoading] = useState(false);
  const [pulling, setPulling] = useState(false);
  const [remarks, setRemarks] = useState<Record<string, string>>({});
  const [showTop, setShowTop] = useState(false);

  // confirm overlay (legacy showOverlayYPO / getSuccessYPO / responsemessageYPO)
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [selItem, setSelItem] = useState<Row | null>(null);
  const [selAction, setSelAction] = useState<SoAction | null>(null);
  const [success, setSuccess] = useState(false);
  const [message, setMessage] = useState('');

  // party history sheet
  const [partyOpen, setPartyOpen] = useState(false);
  const [partyTab, setPartyTab] = useState<PartyTab>('party');
  const [partyList, setPartyList] = useState<Row[]>([]);
  const [historyData, setHistoryData] = useState<Row[]>([]);
  const [partyLoading, setPartyLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [parname, setParname] = useState('');

  // item info sheet (legacy carousel modal)
  const [infoOpen, setInfoOpen] = useState(false);
  const [infoRows, setInfoRows] = useState<Row[]>([]);
  const [infoParty, setInfoParty] = useState('');
  const [openAcc, setOpenAcc] = useState<Record<string, boolean>>({});

  const listRef = useRef<FlatList<Row>>(null);
  const listCancel = useRef<CancelTokenSource | null>(null);
  const partyCancel = useRef<CancelTokenSource | null>(null);
  const alive = useRef(true);
  useEffect(() => () => { alive.current = false; }, []);
  const later = (fn: () => void, ms: number) => setTimeout(() => { if (alive.current) fn(); }, ms);

  const online = isConnected !== false && isConnected !== null;

  /* ------------------------------ list ----------------------------------- */
  const fetchList = async (t: MainTab = tab) => {
    if (!token) return;
    listCancel.current?.cancel();
    const src = axios.CancelToken.source();
    listCancel.current = src;
    setLoading(true);
    try {
      const rows = await fetchBrowse(API, token, t, src.token);
      // legacy: each successful fetch also cleared the other tabs' arrays
      setLists({ requests: [], Activehistory: [], Closehistory: [], [t]: rows } as Record<MainTab, Row[]>);
    } catch (error) {
      if (!axios.isCancel(error)) {
        AppAlert.alert('Error', 'Server error');
      }
    } finally {
      if (listCancel.current === src) setLoading(false);
    }
  };
  const fetchRef = useRef(fetchList);
  fetchRef.current = fetchList;

  // legacy: reload whenever the tab (or token) changes
  useEffect(() => {
    if (!token) return;
    setShowTop(false);
    fetchRef.current(tab);
  }, [tab, token]);

  const onPull = async () => {
    setPulling(true);
    try { await fetchList(); } finally { setPulling(false); }
  };

  /* ------------------------- party history ------------------------------- */
  const loadPartyHistory = async (parcode: string, prptype: string, cancel: CancelTokenSource) => {
    setHistoryLoading(true);
    try {
      const rows = await fetchPartyHistory(API, token, parcode, prptype, cancel.token);
      // Fix vs legacy: legacy also cleared the Request / Close History lists here (setData([]) etc.),
      // which would blank the list behind the sheet; only the history is set now.
      setHistoryData(rows || []);
    } catch (error) {
      if (!axios.isCancel(error)) AppAlert.alert('Error', 'Server error');
    } finally {
      setHistoryLoading(false);
    }
  };

  // legacy handleIconPress(item, 'list') -> handleListIconClick(item.prpcode, item.prptype, item.yearno, item.parcode)
  const openPartyHistory = async (item: Row) => {
    // Fix vs legacy: sosortbrowse rows use PrpCode / ParCode / ParName; fall back to them when the lowercase keys are absent.
    const prpcode = str(item.prpcode ?? item.PrpCode);
    const prptype = str(item.prptype ?? item.PrpType ?? 'R');
    const yearno = str(item.yearno ?? item.YearNo);
    const parcode = str(item.parcode ?? item.ParCode);
    setParname(str(item.parname ?? item.ParName));
    setPartyTab('party');
    setPartyOpen(true);
    // Fix vs legacy: clear the previous party's lists so stale data is not shown for a new party.
    setPartyList([]);
    setHistoryData([]);
    partyCancel.current?.cancel();
    const src = axios.CancelToken.source();
    partyCancel.current = src;
    setPartyLoading(true);
    try {
      const list = await fetchPartyList(API, token, prpcode, prptype, yearno, parcode, src.token);
      if (list) {
        setPartyList(list);
        loadPartyHistory(parcode, prptype, src);
      } else {
        setPartyList([]);
      }
    } catch (error) {
      if (!axios.isCancel(error)) AppAlert.alert('Error', 'Server error');
    } finally {
      setPartyLoading(false);
    }
  };

  /* ------------------------- active / close ------------------------------ */
  const remarkOf = (item: Row) => remarks[item.UId] || item.Remark || '';

  // legacy handleIconPress for 'Active' / 'InActive'
  const askAction = (item: Row, action: SoAction) => {
    const remark = remarkOf(item);
    if (!String(remark).trim()) {
      AppAlert.alert('Validation Error', 'Remark cannot be empty for Voucher No.: ' + (item.SONo || ''));
      return;
    }
    setSelItem(item);
    setSelAction(action);
    setSuccess(false);
    setOverlayOpen(true);
  };

  // legacy handleConfirmAction
  const confirmAction = async () => {
    if (!selItem || !selAction) return;
    const item = selItem;
    const action = selAction;
    const remark = remarkOf(item);
    const payload = action === 'Active' ? activePayload(item, remark) : closePayload(item, remark);
    // legacy handleValidation
    if (action === 'InActive' && !str(payload?.Remark)) {
      AppAlert.alert('Validation Error', 'Remark cannot be empty for Voucher No.: ' + (payload?.ParName || ''));
      setOverlayOpen(false);
      return;
    }
    setSuccess(true);
    setMessage('Loading...');
    try {
      const response = action === 'Active' ? await activeSO(API, token, payload) : await closeSO(API, token, payload);
      if (response.data.success) {
        setMessage(response.data.message || 'Success');
        later(() => { setSuccess(false); setOverlayOpen(false); }, 2000);
        // legacy: remove from the Request list, prepend (marked processed) to the Close History array
        setLists((p) => ({
          ...p,
          requests: p.requests.filter((r) => r.UId !== item.UId),
          Closehistory: [{ ...item, isProcessed: true, actionType: action }, ...p.Closehistory],
        }));
      } else {
        // legacy: Active falls back to 'Success', Close to 'Failed'
        setMessage(response.data.message || (action === 'Active' ? 'Success' : 'Failed'));
        later(() => setSuccess(false), 2000);
      }
    } catch (error) {
      setMessage('Server Error');
      later(() => setSuccess(false), 2000);
    }
  };

  /* ------------------------------ info ----------------------------------- */
  const openInfo = (item: Row) => {
    setInfoRows(Array.isArray(item.d1) ? item.d1 : []);
    setInfoParty(str(item.ParName));
    setInfoOpen(true);
  };
  const groups = useMemo(() => groupD1(infoRows), [infoRows]);

  /* ------------------------------ derived -------------------------------- */
  const rows = lists[tab];
  const q = queries[tab];
  const filtered = useMemo(() => searchRows(rows, q), [rows, q]);
  const netTotal = useMemo(() => filtered.reduce((a, r) => a + netAmtNum(r.NetAmt), 0), [filtered]);

  /* ------------------------------- header -------------------------------- */
  const header = (
    <View style={{ gap: 10 }}>
      <View style={[s.toolbar, phone && { flexDirection: 'column', alignItems: 'stretch' }]}>
        <View style={[{ flexDirection: 'row' }, phone ? null : { width: 400 }]}>
          <Segment value={tab} options={TAB_OPTS} onChange={(v) => setTab(v as MainTab)} />
        </View>
        <View style={s.toolRow}>
          <View style={s.search}>
            <Icon name="search" size={18} color={T.muted} />
            <TextInput
              value={q}
              onChangeText={(t) => setQueries((p) => ({ ...p, [tab]: t }))}
              placeholder={TAB_META[tab].search}
              placeholderTextColor={T.muted}
              style={s.searchInput}
              returnKeyType="search"
              autoCorrect={false}
            />
            {q.length > 0 ? (
              <TouchableOpacity onPress={() => { setQueries((p) => ({ ...p, [tab]: '' })); Keyboard.dismiss(); }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Icon name="close" size={18} color={T.muted} />
              </TouchableOpacity>
            ) : null}
          </View>
          <TouchableOpacity style={s.iconBtn} onPress={() => fetchList()} disabled={loading} accessibilityLabel="Refresh">
            {loading ? <ActivityIndicator size="small" color={T.copper} /> : <Icon name="refresh" size={20} color={T.nav} />}
          </TouchableOpacity>
        </View>
      </View>

      <View style={s.kpis}>
        <Kpi label="Records" value={String(rows.length)} color={T.nav} />
        <Kpi label="Showing" value={String(filtered.length)} color={T.blue} />
        <Kpi label="Net Amt" value={`₹ ${inr(netTotal)}`} color={T.copper} wide />
      </View>
    </View>
  );

  const empty = loading && !pulling ? (
    <View style={s.empty}><ActivityIndicator color={T.copper} /><Text style={s.emptyText}>Loading...</Text></View>
  ) : (
    <View style={s.empty}>
      <Icon name="receipt-long" size={42} color={T.border} />
      <Text style={s.emptyTitle}>{rows.length ? 'No match' : TAB_META[tab].empty}</Text>
      {rows.length ? <Text style={s.emptyText}>Change the search text.</Text> : null}
    </View>
  );

  const actionTitle = selAction === 'Active' ? 'Confirm Active' : selAction === 'InActive' ? 'Confirm Close' : '';

  return (
    <View style={s.root}>
      <FlatList
        ref={listRef}
        key={`cols-${cols}`}
        data={loading && !pulling ? [] : filtered}
        numColumns={cols}
        keyExtractor={(item: Row, i: number) => `${str(item.UId)}-${i}`}
        ListHeaderComponent={header}
        ListHeaderComponentStyle={{ marginBottom: 12 }}
        ListEmptyComponent={empty}
        columnWrapperStyle={cols > 1 ? { gap: 10 } : undefined}
        contentContainerStyle={s.content}
        keyboardShouldPersistTaps="handled"
        onScroll={({ nativeEvent }) => setShowTop(nativeEvent.contentOffset.y > 100)}
        scrollEventThrottle={100}
        refreshControl={<RefreshControl refreshing={pulling} onRefresh={onPull} colors={[T.copper]} tintColor={T.copper} />}
        renderItem={({ item }: { item: Row }) => (
          <View style={{ flex: 1 / cols, marginBottom: 10 }}>
            <SoCard
              item={item}
              tab={tab}
              online={online}
              remark={remarks[item.UId] || ''}
              onRemark={(text) => setRemarks((p) => ({ ...p, [item.UId]: text }))}
              onActive={() => askAction(item, 'Active')}
              onClose={() => askAction(item, 'InActive')}
              onInfo={() => openInfo(item)}
              onParty={() => openPartyHistory(item)}
            />
          </View>
        )}
      />

      {showTop ? (
        <TouchableOpacity style={s.topBtn} onPress={() => listRef.current?.scrollToOffset({ offset: 0, animated: true })} accessibilityLabel="Scroll to top">
          <Icon name="arrow-upward" size={22} color="#fff" />
        </TouchableOpacity>
      ) : null}

      {/* legacy confirm overlay: confirm view (party name + ✓ / ✕) -> result view (voucher no + message) */}
      <Sheet
        open={overlayOpen}
        onClose={() => setOverlayOpen(false)}
        eyebrow="CONFIRM"
        title={actionTitle}
        wideMax={440}
        footer={success ? undefined : (
          <>
            <Btn label="Cancel" icon="close" kind="ghost" style={{ flex: 1 }} onPress={() => setOverlayOpen(false)} />
            <Btn
              label={selAction === 'Active' ? 'Active' : 'Close'}
              icon="check"
              kind={selAction === 'Active' ? 'primary' : 'danger'}
              style={[{ flex: 1 }, selAction === 'Active' && { backgroundColor: T.green }]}
              onPress={confirmAction}
            />
          </>
        )}
      >
        {success ? (
          <View style={{ gap: 10, alignItems: 'center', paddingVertical: 8 }}>
            <Text style={s.ovLine}>Vouchar No.: {selItem?.SONo}</Text>
            {message === 'Loading...' ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <ActivityIndicator size="small" color={T.copper} />
                <Text style={s.ovMsg}>{message}</Text>
              </View>
            ) : (
              <Text style={s.ovMsg}>{message}</Text>
            )}
          </View>
        ) : (
          <View style={{ gap: 6 }}>
            <Text style={s.ovLine}>Party Name: {selItem?.ParName}</Text>
            <Text style={s.ovSub}>SO No.: {selItem?.SONo}   ·   Remark: {selItem ? remarkOf(selItem) : ''}</Text>
          </View>
        )}
      </Sheet>

      <PartyHistorySheet
        visible={partyOpen}
        onClose={() => {
          // Fix vs legacy: legacy onClose also emptied the Active History array (setAllHistoryDataYPO([]));
          // that list is refetched on every tab switch, so it is left intact here.
          partyCancel.current?.cancel();
          setPartyOpen(false);
        }}
        partyList={partyList}
        historyData={historyData}
        partyLoading={partyLoading}
        historyLoading={historyLoading}
        activeTab={partyTab}
        setActiveTab={setPartyTab}
        parname={parname}
      />

      {/* legacy carousel modal: d1 lines grouped by design + item, accordion (open by default) */}
      <Sheet
        open={infoOpen}
        onClose={() => { setInfoOpen(false); setInfoRows([]); }}
        eyebrow={`ITEMS (${infoRows.length})`}
        title={infoParty || 'Item details'}
        wideMax={900}
      >
        {groups.length === 0 ? (
          <View style={s.empty}><Icon name="inbox" size={30} color={T.muted} /><Text style={s.emptyText}>No items</Text></View>
        ) : groups.map((g) => {
          const isOpen = openAcc[g.key] ?? true;
          return (
            <View key={g.key} style={s.acc}>
              <TouchableOpacity style={s.accHead} onPress={() => setOpenAcc((p) => ({ ...p, [g.key]: !isOpen }))} activeOpacity={0.8}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={s.accTitle}>{g.designName}</Text>
                  <Text style={s.accSub}>{g.itemName}</Text>
                </View>
                <View style={s.countBadge}><Text style={s.countText}>{g.items.length}</Text></View>
                <Icon name={isOpen ? 'keyboard-arrow-up' : 'keyboard-arrow-down'} size={26} color={T.nav} />
              </TouchableOpacity>
              {isOpen ? (
                <View style={s.grid}>
                  {g.items.map((row, i) => (
                    <View key={i} style={{ width: `${100 / gridCols}%` as `${number}%`, padding: 4 }}>
                      <View style={s.gridCard}>
                        <GridRow k="Shade" v={row.ShdName} />
                        <GridRow k="Qty" v={row.Qty} />
                        <GridRow k="Rate" v={row.UnitRate} />
                        <GridRow k="Amount" v={row.Amount} />
                        <GridRow k="Disc %" v={row.DisPer} />
                      </View>
                    </View>
                  ))}
                </View>
              ) : null}
            </View>
          );
        })}
      </Sheet>
    </View>
  );
}

/* --------------------------------------------------------------------------- */

function Kpi({ label, value, color, wide }: { label: string; value: string; color: string; wide?: boolean }) {
  return (
    <View style={[s.kpi, wide && { flex: 1.6 }]}>
      <Text style={s.kpiLabel} numberOfLines={1}>{label}</Text>
      <Text style={[s.kpiValue, { color }]} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
    </View>
  );
}

function KV({ k, v, align = 'left', color, lines = 2 }: { k: string; v: any; align?: 'left' | 'right'; color?: string; lines?: number }) {
  return (
    <View style={[s.kv, { alignItems: align === 'right' ? 'flex-end' : 'flex-start' }]}>
      <Text style={s.kvK}>{k}</Text>
      <Text style={[s.kvV, color ? { color } : null, { textAlign: align }]} numberOfLines={lines}>{v ?? ''}</Text>
    </View>
  );
}

function GridRow({ k, v }: { k: string; v: any }) {
  return (
    <View style={s.gridRow}>
      <Text style={s.gridK}>{k}</Text>
      <Text style={s.gridV} numberOfLines={1}>{str(v)}</Text>
    </View>
  );
}

function SoCard({
  item, tab, online, remark, onRemark, onActive, onClose, onInfo, onParty,
}: {
  item: Row; tab: MainTab; online: boolean; remark: string; onRemark: (t: string) => void;
  onActive: () => void; onClose: () => void; onInfo: () => void; onParty: () => void;
}) {
  const isReq = tab === 'requests';
  const tone = TONE[authTone(item.IsAuth)];
  const col = isReq ? T.amber : item.IsAuth ? tone.c : T.border;
  const d1Count = Array.isArray(item.d1) ? item.d1.length : null;
  const locked = !online || !!item.isProcessed;
  return (
    <View style={[s.card, S.card, { borderLeftColor: col }, !online && { opacity: 0.6 }]}>
      <View style={s.cardTop}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={s.topNo} numberOfLines={1}>{item.SONo}</Text>
          <Text style={s.topStore} numberOfLines={1}>{item.StrName}</Text>
        </View>
        <Text style={s.topDate} numberOfLines={1}>{item.SODate}</Text>
      </View>

      <View style={s.body}>
        <View style={s.partyRow}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={s.prpName} numberOfLines={1}>{item.PrpName}</Text>
            <Text style={s.parName} numberOfLines={2}>{item.ParName || ''}</Text>
          </View>
          {!isReq && item.IsAuth ? (
            <View style={[s.badge, { borderColor: tone.c, backgroundColor: tone.bg }]}>
              <Text style={[s.badgeText, { color: tone.c }]} numberOfLines={1}>{tone.label}</Text>
            </View>
          ) : null}
          {isReq && item.isProcessed ? (
            <View style={[s.badge, { borderColor: item.actionType === 'Active' ? T.green : T.red }]}>
              <Text style={[s.badgeText, { color: item.actionType === 'Active' ? T.green : T.red }]}>
                {item.actionType === 'Active' ? 'APPROVED' : 'REJECTED'}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={s.hr} />

        <View style={s.row}>
          <KV k="Broker" v={item.BAccName || ''} />
          <KV k="Sales Exe." v={item.SlExeName || ''} align="right" />
        </View>
        <View style={s.row}>
          <KV k="Net Amt" v={`₹ ${item.NetAmt || ''}`} color={T.copper} lines={1} />
          <KV k="Status" v={item.Status || ''} align="right" lines={1} />
        </View>

        {tab === 'Activehistory' ? (
          <>
            <View style={s.row}>
              <KV k="Active By" v={displayValue(item.ActiveBy || '-')} />
              <KV k="Active Date" v={displayValue(item.ActiveDate || '')} align="right" />
            </View>
            <View style={s.histRemark}>
              <Text style={s.kvK}>Remark</Text>
              <Text style={s.histRemarkText}>{item.ActiveRemark || ''}</Text>
            </View>
          </>
        ) : null}

        {tab === 'Closehistory' ? (
          <>
            <View style={s.row}>
              <KV k="Closed By" v={displayValue(item.CloseBy || '-')} />
              <KV k="Close Date" v={displayValue(item.CloseDate || '')} align="right" />
            </View>
            <View style={s.histRemark}>
              <Text style={s.kvK}>Remark</Text>
              <Text style={s.histRemarkText}>{item.CloseRemark || ''}</Text>
            </View>
          </>
        ) : null}

        {isReq ? (
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
      </View>

      <View style={s.actions}>
        {isReq ? (
          <>
            <TouchableOpacity style={[s.act, { backgroundColor: T.green }, locked && s.dis]} onPress={onActive} disabled={locked} accessibilityLabel="Active">
              <Icon name="check" size={18} color="#fff" />
              <Text style={[s.actText, { color: '#fff' }]}>ACTIVE</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.act, s.closeBtn, locked && s.dis]} onPress={onClose} disabled={locked} accessibilityLabel="Close order">
              <Icon name="block" size={18} color={T.red} />
              <Text style={[s.actText, { color: T.red }]}>CLOSE</Text>
            </TouchableOpacity>
          </>
        ) : null}
        <TouchableOpacity style={[s.act, s.infoBtn, !online && s.dis]} onPress={onInfo} disabled={!online} accessibilityLabel="Item info">
          <Icon name="info-outline" size={18} color={T.blue} />
          <Text style={[s.actText, { color: T.blue }]}>INFO</Text>
          {d1Count !== null ? <View style={s.infoCount}><Text style={s.infoCountText}>{d1Count}</Text></View> : null}
        </TouchableOpacity>
        {/* Legacy request cards show only ACTIVE / CLOSE / INFO — the party-history ('list') action was never
            reachable in legacy, so no button is rendered for it (onParty / PartyHistorySheet kept for parity). */}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  content: { padding: 12, paddingBottom: 80, width: '100%', maxWidth: 1200, alignSelf: 'center', flexGrow: 1 },
  toolbar: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  toolRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  search: { flex: 1, minWidth: 0, height: 44, flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 10, borderWidth: 1, borderColor: T.border, backgroundColor: T.surface, paddingHorizontal: 12 },
  searchInput: { flex: 1, minWidth: 0, fontSize: 14, color: T.ink, height: 42 },
  iconBtn: { width: 44, height: 44, borderRadius: 10, borderWidth: 1, borderColor: T.border, backgroundColor: T.surface, alignItems: 'center', justifyContent: 'center' },
  kpis: { flexDirection: 'row', gap: 8 },
  kpi: { flex: 1, minWidth: 0, backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 10 },
  kpiLabel: { fontSize: 10, fontWeight: '800', color: T.muted, letterSpacing: 0.5, textTransform: 'uppercase' },
  kpiValue: { fontSize: 18, fontWeight: '800', marginTop: 2 },
  empty: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 24, gap: 6 },
  emptyTitle: { fontSize: 15, fontWeight: '800', color: T.nav, textAlign: 'center' },
  emptyText: { fontSize: 13, color: T.muted, textAlign: 'center' },
  topBtn: { position: 'absolute', right: 16, bottom: 20, width: 44, height: 44, borderRadius: 22, backgroundColor: T.nav, alignItems: 'center', justifyContent: 'center', ...S.card },

  card: { backgroundColor: T.surface, borderRadius: 12, borderWidth: 1, borderColor: T.border, borderLeftWidth: 4, overflow: 'hidden' },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10, backgroundColor: T.sub, paddingHorizontal: 12, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: T.hair },
  topNo: { fontSize: 13.5, fontWeight: '800', color: T.nav },
  topStore: { fontSize: 11.5, fontWeight: '600', color: T.yd, marginTop: 1 },
  topDate: { fontSize: 12, fontWeight: '700', color: T.muted, backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3 },
  body: { padding: 12, gap: 10 },
  partyRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  prpName: { fontSize: 11.5, fontWeight: '700', color: T.muted },
  parName: { fontSize: 14.5, fontWeight: '800', color: T.ink, marginTop: 1 },
  badge: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 9, paddingVertical: 3, maxWidth: 130 },
  badgeText: { fontSize: 10.5, fontWeight: '900', letterSpacing: 0.4 },
  hr: { height: 1, backgroundColor: T.hair },
  row: { flexDirection: 'row', gap: 10 },
  kv: { flex: 1, minWidth: 0 },
  kvK: { fontSize: 10.5, fontWeight: '800', color: T.muted, textTransform: 'uppercase', letterSpacing: 0.4 },
  kvV: { fontSize: 13.5, fontWeight: '700', color: T.ink, marginTop: 1 },
  fieldLabel: { fontSize: 11, fontWeight: '700', color: T.muted, letterSpacing: 0.4, textTransform: 'uppercase' },
  remark: { minHeight: 44, borderWidth: 1, borderColor: T.border, borderRadius: 10, backgroundColor: T.surface, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: T.ink, textAlignVertical: 'top' },
  histRemark: { backgroundColor: T.sub, borderRadius: 10, padding: 10, gap: 2 },
  histRemarkText: { fontSize: 13, fontWeight: '600', color: T.ink },
  actions: { flexDirection: 'row', gap: 8, padding: 12, borderTopWidth: 1, borderTopColor: T.hair },
  act: { flex: 1, height: 42, borderRadius: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingHorizontal: 6 },
  closeBtn: { borderWidth: 1, borderColor: T.red, backgroundColor: T.surface },
  infoBtn: { borderWidth: 1, borderColor: T.blue, backgroundColor: T.surface },
  iconAct: { width: 42, height: 42, borderRadius: 10, borderWidth: 1, borderColor: T.border, backgroundColor: T.surface, alignItems: 'center', justifyContent: 'center' },
  dis: { opacity: 0.45 },
  actText: { fontSize: 12.5, fontWeight: '800' },
  infoCount: { minWidth: 18, height: 18, borderRadius: 9, backgroundColor: T.blue, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  infoCountText: { fontSize: 10, fontWeight: '800', color: '#fff' },

  ovLine: { fontSize: 14.5, fontWeight: '800', color: T.nav },
  ovSub: { fontSize: 12.5, fontWeight: '600', color: T.muted },
  ovMsg: { fontSize: 14, fontWeight: '700', color: T.ink, textAlign: 'center' },

  acc: { borderWidth: 1, borderColor: T.border, borderRadius: 12, overflow: 'hidden', backgroundColor: T.surface },
  accHead: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 10, minHeight: 48, backgroundColor: T.sub },
  accTitle: { fontSize: 14, fontWeight: '800', color: T.nav },
  accSub: { fontSize: 12, fontWeight: '600', color: T.muted, marginTop: 1 },
  countBadge: { minWidth: 24, height: 24, borderRadius: 12, backgroundColor: T.copper, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  countText: { fontSize: 11, fontWeight: '800', color: '#fff' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', padding: 6 },
  gridCard: { borderWidth: 1, borderColor: T.hair, borderRadius: 10, padding: 8, gap: 3, backgroundColor: T.surface },
  gridRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 6 },
  gridK: { fontSize: 11, fontWeight: '700', color: T.muted },
  gridV: { fontSize: 12, fontWeight: '800', color: T.ink, flexShrink: 1, textAlign: 'right' },
});
