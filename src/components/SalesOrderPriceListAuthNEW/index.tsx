// FILE: src/components/SalesOrderPriceListAuthNEW/index.tsx
// NEW ERP — Sales Order Price List Auth (replaces legacy screen).
// Legacy source : src/components/SalesOrderPriceListAuth/index.tsx (identical copy: components/SalesOrderPriceListAuth/index.tsx)
// Legacy route  : app/(tabs)/sales-order-price-list-auth.tsx
//   (legacy route passes token, username and userid — userid is wrongly set from
//    user_prptype there — but the legacy component only destructures `token`;
//    neither username nor userid ever reaches an API call, so they are not used here.)
// Endpoints (same as legacy, host = `API` prop, Bearer = `token` prop):
//   GET /api/sosortbrowse { prpcode:'MTX', prptype:<user_prptype>, strcode:'002', yearno:<AsyncStorage yno>,
//                           txntype:'mob_sales_order_price_list_auth', referrer:'mob_sales_order_price_list_auth',
//                           atype:'B'|'H', strtype:'G' }
//                          — SO headers res.data.response.data, SO item rows res.data.response.d1 (joined on UId)
//   GET /api/authso       { prptype, yearno:<yno>, ...<whole SO header row>, isauth:1|2,
//                           txntype:'mob_sales_order_price_list_auth', remark, action:'edit',
//                           referrer:'dashboard', ARemark, aremark }   — approve (1) / reject (2)
// AsyncStorage keys read: user_prptype, yno (every call).
// No year/store selection in legacy (prpcode/strcode are hard-coded), so there is no filter sheet.
import { TruncText } from '@/src/components/ui/TruncText';
import { AppAlert } from '@/common/utils/appAlert';
import { S, T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { Opt, Segment } from '../StockVerificationNEW/ui';
import { authSO, belowPL, detailsOf, fetchBrowse, fmtPL, matchesSearch, Row, statusOf, Tab } from './api';

type Props = { token: string; API: string; username?: string };

const TAB_OPTS: Opt[] = [
  { value: 'request', label: 'Request' },
  { value: 'history', label: 'History' },
];

const statusColor = (st: string) => (st === 'authorised' ? T.green : st === 'rejected' ? T.red : T.amber);

export default function SalesOrderPriceListAuthNEW({ token, API }: Props) {
  const { width } = useWindowDimensions();
  const phone = width < 768;
  const cols = width >= 1180 ? 3 : width >= 768 ? 2 : 1;

  const [tab, setTab] = useState<Tab>('request');
  const [search, setSearch] = useState('');
  const [rows, setRows] = useState<Row[]>([]);
  const [details, setDetails] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [pulling, setPulling] = useState(false);

  const [remarks, setRemarks] = useState<Record<string, string>>({});
  const [showInfo, setShowInfo] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState<{ uid: string; act: 1 | 2 } | null>(null);

  const reqSeq = useRef(0);

  /* ------------------------------ list ----------------------------------- */
  const fetchList = async () => {
    const seq = ++reqSeq.current;
    setLoading(true);
    try {
      const { rows: data, details: d1, apiError } = await fetchBrowse(API, token, tab);
      if (seq !== reqSeq.current) return;
      setRows(data);
      setDetails(d1);
      if (apiError) AppAlert.alert('Warning', 'Please Try Again !!!');
    } catch (e) {
      console.log(e);
      if (seq === reqSeq.current) setRows([]); // legacy: only the header list is cleared on error
    } finally {
      if (seq === reqSeq.current) setLoading(false);
    }
  };
  const fetchRef = useRef(fetchList);
  fetchRef.current = fetchList;

  // legacy: load once when the token arrives and again on every tab change
  // (item expansions collapse on tab change).
  useEffect(() => {
    if (!token) return;
    setShowInfo({});
    fetchRef.current();
  }, [tab, token, API]);

  const onPull = async () => {
    setPulling(true);
    try { await fetchList(); } finally { setPulling(false); }
  };

  /* ------------------------- approve / reject ----------------------------- */
  const doAuth = async (item: Row, isauth: 1 | 2) => {
    setBusy({ uid: String(item?.UId ?? ''), act: isauth });
    try {
      const res = await authSO(API, token, item, isauth, remarks[item?.UId] || '');
      if (res?.data?.response?.error == true) {
        AppAlert.alert('Error', 'Please Try Again');
      } else if (res?.data?.success == true) {
        AppAlert.alert('Success', String(res?.data?.response?.message ?? ''));
        // use the latest fetchList so a tab switched mid-request reloads the tab now on screen
        fetchRef.current();
      }
    } catch (error: any) {
      console.log('Sales Order Price List Auth ERROR:', error?.response?.data || error?.message);
      AppAlert.alert('Error', error?.response?.data?.message || error?.message || 'Failed.');
    } finally {
      setBusy(null);
    }
  };

  /* ------------------------------ derived -------------------------------- */
  const filtered = useMemo(() => rows.filter((i) => matchesSearch(i, details, search)), [rows, details, search]);
  const stats = useMemo(() => {
    const c = { pending: 0, authorised: 0, rejected: 0 };
    rows.forEach((r) => {
      const st = statusOf(r);
      if (st === 'authorised') c.authorised++;
      else if (st === 'rejected') c.rejected++;
      else c.pending++;
    });
    return c;
  }, [rows]);

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
              placeholder="Search an Sales Order..."
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
          <TouchableOpacity style={s.iconBtn} onPress={() => fetchList()} disabled={loading} accessibilityLabel="Refresh">
            {loading ? <ActivityIndicator size="small" color={T.copper} /> : <Icon name="refresh" size={20} color={T.nav} />}
          </TouchableOpacity>
        </View>
      </View>

      <View style={s.kpis}>
        <Kpi label="Total" value={rows.length} color={T.nav} />
        <Kpi label="Pending" value={stats.pending} color={T.amber} />
        <Kpi label="Authorised" value={stats.authorised} color={T.green} />
        <Kpi label="Rejected" value={stats.rejected} color={T.red} />
      </View>

      {rows.length > 0 && search.trim() ? (
        <Text style={s.listInfo}>{filtered.length} of {rows.length} records</Text>
      ) : null}
    </View>
  );

  const empty = loading && !pulling ? (
    <View style={s.empty}><ActivityIndicator color={T.copper} /><Text style={s.emptyText}>Loading sales orders…</Text></View>
  ) : (
    <View style={s.empty}>
      <Icon name="inventory-2" size={42} color={T.border} />
      <Text style={s.emptyTitle}>{rows.length ? 'No match' : 'No Sales Order Price List Data'}</Text>
      <Text style={s.emptyText}>{rows.length ? 'Change the search text.' : 'Sales Order Price List records will appear here'}</Text>
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
        renderItem={({ item }: { item: Row }) => (
          <View style={{ flex: 1 / cols, marginBottom: 10 }}>
            <SOCard
              item={item}
              tab={tab}
              items={detailsOf(details, item)}
              open={!!showInfo[item.UId]}
              onToggle={() => setShowInfo((p) => ({ ...p, [item.UId]: !p[item.UId] }))}
              remark={remarks[item?.UId] || ''}
              onRemark={(text) => setRemarks((p) => ({ ...p, [item?.UId]: text }))}
              onApprove={() => doAuth(item, 1)}
              onReject={() => doAuth(item, 2)}
              busyAct={busy && busy.uid === String(item?.UId ?? '') ? busy.act : null}
              locked={busy !== null}
            />
          </View>
        )}
      />
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

function KV({ k, v, align = 'left', color, lines = 2, bold }: {
  k: string; v: any; align?: 'left' | 'center' | 'right'; color?: string; lines?: number; bold?: boolean;
}) {
  const a = align === 'right' ? 'flex-end' : align === 'center' ? 'center' : 'flex-start';
  return (
    <View style={[s.kv, { alignItems: a }]}>
      <Text style={s.kvK}>{k}</Text>
      <TruncText style={[s.kvV, color ? { color } : null, bold ? { fontWeight: '900' } : null, { textAlign: align }]} numberOfLines={lines}>
        {v ?? ''}
      </TruncText>
    </View>
  );
}

function SOCard({
  item, tab, items, open, onToggle, remark, onRemark, onApprove, onReject, busyAct, locked,
}: {
  item: Row; tab: Tab; items: Row[]; open: boolean; onToggle: () => void; remark: string;
  onRemark: (t: string) => void; onApprove: () => void; onReject: () => void; busyAct: 1 | 2 | null; locked: boolean;
}) {
  const st = statusOf(item);
  const col = statusColor(st);
  const lowCount = items.filter(belowPL).length;
  // legacy: remark + approve/reject shown on the Request tab for every row (no status check)
  const actionable = tab !== 'history';
  return (
    <View style={[s.card, S.card, { borderLeftColor: col }]}>
      <View style={s.cardTop}>
        <TruncText style={s.topNo} numberOfLines={1}>{item.SONo}</TruncText>
        <TruncText style={s.topDate} numberOfLines={1}>{item.SODate}</TruncText>
      </View>

      <View style={s.body}>
        <View style={s.partyRow}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={s.kvK}>Party Name</Text>
            <TruncText style={s.parName} numberOfLines={2}>{item.ParName || '-'}</TruncText>
          </View>
          <View style={[s.badge, { borderColor: col, backgroundColor: `${col}14` }]}>
            <TruncText style={[s.badgeText, { color: col }]} numberOfLines={1}>{item.AuthStatus}</TruncText>
          </View>
        </View>

        <View style={s.hr} />

        <View style={s.row}>
          <KV k="Broker" v={item.BAccName || '-'} />
          <KV k="Net Amount" v={item.NetAmt || '-'} align="right" color={T.copper} lines={1} />
        </View>
        <View style={s.row}>
          <KV k="Due Date" v={item.DueDate || '-'} lines={1} />
          <KV k="Due Day" v={item.DueDay || '-'} align="right" lines={1} />
        </View>

        <TouchableOpacity style={[s.itemsBtn, open && { backgroundColor: T.blue, borderColor: T.blue }]} onPress={onToggle} accessibilityLabel="Items">
          <Icon name="list-alt" size={18} color={open ? '#fff' : T.blue} />
          <Text style={[s.itemsBtnText, open && { color: '#fff' }]} numberOfLines={1}>
            Items ({item.CountOfItem})
          </Text>
          {lowCount > 0 ? (
            <View style={s.lowPill}>
              <Icon name="trending-down" size={13} color="#fff" />
              <Text style={s.lowPillText}>{lowCount} below PL</Text>
            </View>
          ) : null}
          <View style={{ flex: 1 }} />
          <Icon name={open ? 'expand-less' : 'expand-more'} size={20} color={open ? '#fff' : T.blue} />
        </TouchableOpacity>

        {open ? (
          <ScrollView style={{ maxHeight: 360 }} nestedScrollEnabled showsVerticalScrollIndicator persistentScrollbar bounces={false}>
            <View style={{ gap: 8 }}>
              {items.map((d, idx) => {
                const low = belowPL(d);
                return (
                  <View key={idx} style={[s.itemCard, low && s.itemLow]}>
                    <View style={s.itemHead}>
                      <TruncText style={s.itemTitle} numberOfLines={2}>{d.ItmName}</TruncText>
                      <View style={s.srBadge}><Text style={s.srText}>#{d.SrNo}</Text></View>
                    </View>
                    <View style={s.row}>
                      <KV k="Qty" v={d.Qty} lines={1} />
                      <KV k="Rate" v={d.UnitRate} align="center" lines={1} color={low ? T.red : undefined} />
                      <KV k="PL Rate" v={fmtPL(d.PLRate)} align="right" lines={1} bold={low} />
                    </View>
                    <View style={s.row}>
                      <KV k="Amount" v={d.Amount} lines={1} color={T.copper} />
                      <KV k="Denier" v={d.Denier} align="center" lines={1} />
                      <KV k="Grade" v={d.GrdName} align="right" lines={1} />
                    </View>
                    <KV k="Shade" v={d.ShdName} />
                  </View>
                );
              })}
              {items.length === 0 ? <Text style={s.emptyText}>No item rows.</Text> : null}
            </View>
          </ScrollView>
        ) : null}

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
            <View style={s.histRemark}>
              <Text style={s.kvK}>Remark</Text>
              <Text style={s.histRemarkText}>{item.ARemark || '-'}</Text>
            </View>
            <View style={s.row}>
              <KV k="Auth By" v={item.AuthorisedBy || '-'} />
              <KV k="Auth Date & Time" v={item.AuthorisedDate || '-'} align="right" />
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
  kpis: { flexDirection: 'row', gap: 8 },
  kpi: { flex: 1, minWidth: 0, backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 10 },
  kpiLabel: { fontSize: 10, fontWeight: '800', color: T.muted, letterSpacing: 0.5, textTransform: 'uppercase' },
  kpiValue: { fontSize: 18, fontWeight: '800', marginTop: 2 },
  listInfo: { fontSize: 12, fontWeight: '700', color: T.nav },
  empty: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 24, gap: 6 },
  emptyTitle: { fontSize: 15, fontWeight: '800', color: T.nav, textAlign: 'center' },
  emptyText: { fontSize: 13, color: T.muted, textAlign: 'center' },

  card: { backgroundColor: T.surface, borderRadius: 12, borderWidth: 1, borderColor: T.border, borderLeftWidth: 4, overflow: 'hidden' },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10, backgroundColor: T.sub, paddingHorizontal: 12, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: T.hair },
  topDate: { fontSize: 12.5, fontWeight: '700', color: T.muted, flexShrink: 1 },
  topNo: { fontSize: 13.5, fontWeight: '800', color: T.nav, flexShrink: 1 },
  body: { padding: 12, gap: 10 },
  partyRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  parName: { fontSize: 14.5, fontWeight: '800', color: T.ink, marginTop: 1 },
  badge: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 9, paddingVertical: 3, maxWidth: 120 },
  badgeText: { fontSize: 11, fontWeight: '800', textTransform: 'capitalize' },
  hr: { height: 1, backgroundColor: T.hair },
  row: { flexDirection: 'row', gap: 10 },
  kv: { flex: 1, minWidth: 0 },
  kvK: { fontSize: 10.5, fontWeight: '800', color: T.muted, textTransform: 'uppercase', letterSpacing: 0.4 },
  kvV: { fontSize: 13.5, fontWeight: '700', color: T.ink, marginTop: 1 },

  itemsBtn: { minHeight: 42, flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: T.border, borderRadius: 10, paddingHorizontal: 12, backgroundColor: T.sub },
  itemsBtnText: { fontSize: 13, fontWeight: '800', color: T.blue, flexShrink: 1 },
  lowPill: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: T.red, borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 },
  lowPillText: { fontSize: 10.5, fontWeight: '800', color: '#fff' },
  itemCard: { borderWidth: 1, borderColor: T.border, borderRadius: 10, padding: 10, gap: 8, backgroundColor: T.surface },
  itemLow: { borderColor: T.red, borderWidth: 2, backgroundColor: '#FEF2F2' },
  itemHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  itemTitle: { flex: 1, minWidth: 0, fontSize: 13.5, fontWeight: '800', color: T.nav },
  srBadge: { backgroundColor: T.alt, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2 },
  srText: { fontSize: 11, fontWeight: '800', color: T.nav },

  fieldLabel: { fontSize: 11, fontWeight: '700', color: T.muted, letterSpacing: 0.4, textTransform: 'uppercase' },
  remark: { minHeight: 44, borderWidth: 1, borderColor: T.border, borderRadius: 10, backgroundColor: T.surface, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: T.ink, textAlignVertical: 'top' },
  histRemark: { backgroundColor: T.sub, borderRadius: 10, padding: 10, gap: 2 },
  histRemarkText: { fontSize: 13, fontWeight: '600', color: T.ink },
  actions: { flexDirection: 'row', gap: 10, padding: 12, borderTopWidth: 1, borderTopColor: T.hair },
  act: { flex: 1, height: 42, borderRadius: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  reject: { borderWidth: 1, borderColor: T.red, backgroundColor: T.surface },
  approve: { backgroundColor: T.green },
  actText: { fontSize: 13.5, fontWeight: '800' },
});
