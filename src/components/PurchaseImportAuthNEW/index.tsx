// FILE: src/components/PurchaseImportAuthNEW/index.tsx
// NEW ERP — Purchase Import Auth (replaces legacy screen).
// Legacy source : src/components/PurchaseImportAuth/index.tsx (identical copy: components/PurchaseImportAuth/index.tsx)
// Legacy route  : app/(tabs)/purchase-import-auth.tsx
// Endpoints (same as legacy, host = `API` prop, Bearer = `token` prop):
//   GET  /api/purchasebrowse  { prpcode:'MT', prptype, strcode:'', yearno:<AsyncStorage yno>,
//                                txntype:'purchase_import_auth', referrer:'dashboard', atype:'B'|'H' }
//                               — headers res.data.response.data, item lines res.data.response.d1 (joined on uid)
//   POST /api/authpurchase    { prptype, yearno:<yno>, ...row, isauth:1|2, txntype:'purchase_import_auth',
//                                remark, action:'edit', referrer:'dashboard', ARemark, aremark }
//                               — approve (1, remark mandatory) / reject (2); on success the list is
//                                 replaced by res.data.response.data / d1 (legacy does not re-browse)
// AsyncStorage keys read: user_prptype, yno (every call).
// Legacy has no year/store selector (year comes from AsyncStorage yno), so there is no filter sheet.
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
import { fetchBrowse, fmt2, linesOf, matchesSearch, postAuth, rateExceedsPo, Row, statusOf, Tab } from './api';

type Props = { token: string; API: string; username?: string };

const TAB_OPTS: Opt[] = [
  { value: 'request', label: 'Request' },
  { value: 'history', label: 'History' },
];

const statusColor = (st: string) => (st === 'authorised' ? T.green : st === 'rejected' ? T.red : T.amber);

export default function PurchaseImportAuthNEW({ token, API }: Props) {
  const { width } = useWindowDimensions();
  const phone = width < 768;
  const cols = width >= 1180 ? 3 : width >= 768 ? 2 : 1;

  const [tab, setTab] = useState<Tab>('request');
  const [search, setSearch] = useState('');
  const [rows, setRows] = useState<Row[]>([]);
  const [d1, setD1] = useState<Row[]>([]);
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
      const { rows: data, d1: lines, apiError } = await fetchBrowse({ API, token, tab });
      if (seq !== reqSeq.current) return;
      setRows(data);
      setD1(lines);
      if (apiError) AppAlert.alert('Warning', 'Please Try Again !!!');
    } catch (e) {
      console.log(e);
      if (seq === reqSeq.current) setRows([]);
    } finally {
      if (seq === reqSeq.current) setLoading(false);
    }
  };
  const fetchRef = useRef(fetchList);
  fetchRef.current = fetchList;

  // legacy: first load once the token is available; tab change collapses item panels and
  // reloads. (Legacy's two effects fire only ONE browse on mount — its initialLoaded flag is
  // state, so the 2nd effect still sees `false` in that render; a single effect keeps that.)
  useEffect(() => {
    if (!token) return;
    setShowInfo({});
    fetchRef.current();
  }, [tab, token]);

  const onPull = async () => {
    setPulling(true);
    try { await fetchList(); } finally { setPulling(false); }
  };

  /* ------------------------- approve / reject ----------------------------- */
  const doAuth = async (item: Row, isauth: 1 | 2) => {
    const remark = remarks[item?.uid] || '';
    // legacy: approval requires a remark (reject does not)
    if (isauth === 1 && !remark.trim()) {
      AppAlert.alert('Warning', 'Please enter remark before approval.');
      return;
    }
    setBusy({ uid: String(item?.uid ?? ''), act: isauth });
    try {
      const res = await postAuth({ API, token }, item, isauth, remark);
      if (res?.data?.response?.error == true) {
        AppAlert.alert('Error', 'Please Try Again');
      } else if (res?.data?.success == true) {
        AppAlert.alert('Success', String(res?.data?.response?.message ?? ''));
        // legacy: replace the list with what the auth call returns (no re-browse)
        reqSeq.current++; // drop any in-flight browse response
        setRows(res?.data?.response?.data || []);
        setD1(res?.data?.response?.d1 || []);
        setLoading(false); // legacy finally clears loading; the dropped browse no longer will
      }
    } catch (error: any) {
      console.log('Purchase Import Auth Auth ERROR:', error?.response?.data || error?.message);
      AppAlert.alert('Error', error?.response?.data?.message || error?.message || 'Failed.');
    } finally {
      setBusy(null);
    }
  };

  /* ------------------------------ derived -------------------------------- */
  const filtered = useMemo(() => rows.filter((i) => matchesSearch(i, linesOf(d1, i), search)), [rows, d1, search]);
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
              placeholder="Search Purchase..."
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

      {rows.length > 0 && search ? (
        <Text style={s.listInfo}>{filtered.length} of {rows.length} records</Text>
      ) : null}
    </View>
  );

  const empty = loading && !pulling ? (
    <View style={s.empty}><ActivityIndicator color={T.copper} /><Text style={s.emptyText}>Loading purchases…</Text></View>
  ) : (
    <View style={s.empty}>
      <Icon name="inventory-2" size={42} color={T.border} />
      <Text style={s.emptyTitle}>{rows.length ? 'No match' : 'No Purchase Import Auth Data'}</Text>
      <Text style={s.emptyText}>{rows.length ? 'Change the search text.' : 'Purchase Import Auth records will appear here'}</Text>
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
            <PurchaseCard
              item={item}
              tab={tab}
              lines={linesOf(d1, item)}
              open={!!showInfo[item.uid]}
              remark={remarks[item?.uid] || ''}
              onRemark={(text) => setRemarks((p) => ({ ...p, [item?.uid]: text }))}
              onInfo={() => setShowInfo((p) => ({ ...p, [item.uid]: !p[item.uid] }))}
              onApprove={() => doAuth(item, 1)}
              onReject={() => doAuth(item, 2)}
              busyAct={busy && busy.uid === String(item?.uid ?? '') ? busy.act : null}
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

function KV({ k, v, align = 'left', color, lines = 2 }: { k: string; v: any; align?: 'left' | 'center' | 'right'; color?: string; lines?: number }) {
  const a = align === 'right' ? 'flex-end' : align === 'center' ? 'center' : 'flex-start';
  return (
    <View style={[s.kv, { alignItems: a }]}>
      <Text style={s.kvK}>{k}</Text>
      <TruncText style={[s.kvV, color ? { color } : null, { textAlign: align }]} numberOfLines={lines}>{v ?? ''}</TruncText>
    </View>
  );
}

function LineCard({ d }: { d: Row }) {
  const over = rateExceedsPo(d);
  return (
    <View style={[s.line, over && s.lineOver]}>
      <View style={s.lineHead}>
        <TruncText style={s.lineTitle} numberOfLines={2}>{d.itmname}</TruncText>
        <View style={s.srBadge}><Text style={s.srText}>#{d.srno}</Text></View>
      </View>

      <Text style={s.section}>Purchase Order</Text>
      <View style={s.row}>
        <KV k="PO Curr" v={d.curr || '-'} lines={1} />
        <KV k="PO Curr Rate" v={fmt2(d.currrate)} align="center" lines={1} />
        <KV k="PO Ex Rate" v={fmt2(d.exrate)} align="right" lines={1} />
      </View>
      <View style={s.row}>
        <KV k="PO Rate" v={fmt2(d.porate)} lines={1} />
        <KV k="PO Amount" v={d.poamt || '-'} align="right" color={T.copper} lines={1} />
      </View>

      <View style={s.hr} />

      <Text style={s.section}>Purchase</Text>
      <View style={s.row}>
        <KV k="Pur Rate" v={fmt2(d.purrate)} color={over ? T.red : undefined} lines={1} />
        <KV k="Pur Amount" v={d.puramt || d.amount || '-'} align="right" color={T.copper} lines={1} />
      </View>
    </View>
  );
}

function PurchaseCard({
  item, tab, lines, open, remark, onRemark, onInfo, onApprove, onReject, busyAct, locked,
}: {
  item: Row; tab: Tab; lines: Row[]; open: boolean; remark: string;
  onRemark: (t: string) => void; onInfo: () => void; onApprove: () => void; onReject: () => void;
  busyAct: 1 | 2 | null; locked: boolean;
}) {
  const st = statusOf(item);
  const col = statusColor(st);
  const history = tab === 'history';
  return (
    <View style={[s.card, S.card, { borderLeftColor: col }]}>
      <View style={s.cardTop}>
        <TruncText style={s.topNo} numberOfLines={1}>{item.inwno}</TruncText>
        <TruncText style={s.topDate} numberOfLines={1}>{item.inwdate}</TruncText>
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

        <View style={[s.row, { alignItems: 'center' }]}>
          <KV k="Invoice Type" v={item.invtype || '-'} />
          <KV k="Str Name" v={item.mainstrname || '-'} align="right" color={T.blue} />
          <TouchableOpacity
            style={[s.countBtn, open && { backgroundColor: T.blue }]}
            onPress={onInfo}
            accessibilityLabel={`Items (${item.countofitem ?? 0})`}
          >
            <Text style={[s.countText, open && { color: '#fff' }]}>{item.countofitem}</Text>
            <Icon name={open ? 'expand-less' : 'expand-more'} size={16} color={open ? '#fff' : T.blue} />
          </TouchableOpacity>
        </View>

        {open ? (
          <ScrollView style={{ maxHeight: 360 }} contentContainerStyle={{ gap: 8 }} nestedScrollEnabled showsVerticalScrollIndicator persistentScrollbar bounces={false}>
            {lines.length ? lines.map((d, idx) => <LineCard key={idx} d={d} />) : (
              <Text style={s.emptyText}>No item lines</Text>
            )}
          </ScrollView>
        ) : null}

        {!history ? (
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
        ) : (
          <>
            <View style={s.histRemark}>
              <Text style={s.kvK}>Remark</Text>
              <Text style={s.histRemarkText}>{item.aremark || '-'}</Text>
            </View>
            <View style={s.row}>
              <KV k="Auth By" v={item.authby || '-'} />
              <KV k="Auth Date" v={item.authdate || '-'} align="right" />
            </View>
          </>
        )}
      </View>

      {!history ? (
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
  topDate: { fontSize: 12.5, fontWeight: '700', color: T.muted, flexShrink: 1, textAlign: 'right' },
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
  countBtn: { minWidth: 56, height: 40, borderRadius: 20, borderWidth: 1, borderColor: T.blue, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 2 },
  countText: { fontSize: 14, fontWeight: '800', color: T.blue },

  line: { borderWidth: 1, borderColor: T.border, borderRadius: 10, padding: 10, gap: 8, backgroundColor: T.surface },
  lineOver: { borderColor: '#EF4444', borderWidth: 2, backgroundColor: '#FEF2F2' },
  lineHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  lineTitle: { flex: 1, minWidth: 0, fontSize: 13.5, fontWeight: '800', color: T.ink },
  srBadge: { backgroundColor: T.alt, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  srText: { fontSize: 11.5, fontWeight: '800', color: T.nav },
  section: { fontSize: 11, fontWeight: '800', color: T.copper, textTransform: 'uppercase', letterSpacing: 0.6 },

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
