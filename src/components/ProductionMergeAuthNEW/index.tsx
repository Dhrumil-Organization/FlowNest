// FILE: src/components/ProductionMergeAuthNEW/index.tsx
// NEW ERP — Production Merge Auth.
// Legacy source: src/components/ProductionMergeAuth/index.tsx (identical copy in
// components/ProductionMergeAuth/index.tsx); legacy route app/(tabs)/production-merge-auth.tsx.
//
// Endpoints (same as legacy, see ./api.ts for exact params):
//   GET  /api/prodproductionbrowse  { prptype, yearno, txntype:'mob_prod_merge_auth', atype:'B'|'H',
//                                     referrer:'dashboard', fetch:'browsedata' }       (list, per tab)
//   POST /api/authproductionmerge   { prptype, yearno, mercode:submercode, isauth:1|2,
//                                     txntype:'mob_prod_merge_auth', remark }          (approve / reject)
//   GET  /api/prodpackingbrowse     { …, fetch:'packdata', produid }  — mapped in api.ts only; the legacy
//                                     screen defines this call but never triggers it from the UI.
// AsyncStorage keys read: 'user_prptype', 'yno'. Token = `token` prop.
//
// Rules kept from legacy:
//   - Tabs Request (atype B) / History (atype H); switching tab reloads the list.
//   - Search across submercode, submername, mainmercode, mainmername, rsnname, authstatus, prodno,
//     proddate, createdby, createddate, createdtime, aremark, authby, authdate, authtime.
//   - Request cards: per-row remark (keyed by uid, kept across reloads) + Reject (isauth 2) /
//     Approve (isauth 1), no confirmation (as legacy). On success: message + list reload.
//   - History cards: remark (aremark), Auth By / Date / Time; no actions.
//   - Card border green when authstatus "authorised", red when "rejected".
import { TruncText } from '@/src/components/ui/TruncText';
import AppAlert from '@/common/utils/appAlert';
import { S, T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { Segment } from '../StockVerificationNEW/ui';
import { Api, authoriseMerge, fetchMergeList, filterRows, Row, statusKey, Tab } from './api';

type Props = { token: string; API: string; username?: string };

const TABS = [
  { value: 'request', label: 'Request' },
  { value: 'history', label: 'History' },
];

const STATUS = {
  authorised: { color: T.green, bg: '#E8F2EC' },
  rejected: { color: T.red, bg: '#F8E9E6' },
  pending: { color: T.amber, bg: '#FBF3E2' },
} as const;

const dash = (v: any) => (v === undefined || v === null || v === '' ? '-' : String(v));
const rowKey = (r: Row, i: number) => (r?.uid !== undefined && r?.uid !== null ? `u-${r.uid}` : `i-${i}`);

export default function ProductionMergeAuthNEW({ token, API }: Props) {
  const { width } = useWindowDimensions();
  const phone = width < 768;
  const cols = width >= 1180 ? 3 : width >= 768 ? 2 : 1;

  const api: Api = useMemo(() => ({ API, token }), [API, token]);

  const [activeTab, setActiveTab] = useState<Tab>('request');
  const [search, setSearch] = useState('');
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [remarks, setRemarks] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<{ uid: any; isauth: 1 | 2 } | null>(null);

  const seq = useRef(0);
  const tabRef = useRef<Tab>(activeTab);
  tabRef.current = activeTab;

  /** legacy fetchProdMergelist */
  const loadList = useCallback(async (pull = false) => {
    const my = ++seq.current;
    if (pull) setRefreshing(true); else setLoading(true);
    setLoadError('');
    try {
      const { rows: data, warn } = await fetchMergeList(api, tabRef.current);
      if (my !== seq.current) return;
      setRows(data);
      if (warn) AppAlert.alert('Warning', 'Please Try Again !!!');
    } catch (e: any) {
      console.log(e);
      if (my !== seq.current) return;
      setRows([]);
      setLoadError(e?.response?.data?.message || e?.message || 'Could not load production merge data.');
    } finally {
      if (my === seq.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [api]);

  // Initial load + reload on tab change (legacy: two effects, one fetch each time).
  useEffect(() => {
    if (!token) return;
    loadList();
  }, [activeTab, token, loadList]);

  /** legacy fetchauthoriseddata(item, isauthValue) */
  const doAuth = async (item: Row, isauthValue: 1 | 2) => {
    if (busy) return;
    setBusy({ uid: item?.uid, isauth: isauthValue });
    try {
      const r = await authoriseMerge(api, item, isauthValue, remarks[item?.uid] || '');
      if (r.kind === 'error') {
        AppAlert.alert('Error', r.message);
      } else if (r.kind === 'success') {
        AppAlert.alert('Success', r.message);
        loadList();
      }
    } finally {
      setBusy(null);
    }
  };

  const visible = useMemo(() => filterRows(rows, search), [rows, search]);

  const counts = useMemo(() => {
    const c = { authorised: 0, rejected: 0, pending: 0 };
    rows.forEach((r) => { c[statusKey(r)] += 1; });
    return c;
  }, [rows]);

  const history = activeTab === 'history';

  /* -------------------------------- header -------------------------------- */

  const header = (
    <View style={{ gap: 10 }}>
      <View style={[s.toolbar, !phone && { maxWidth: 720 }]}>
        <View style={{ flex: 1 }}>
          <Segment value={activeTab} options={TABS} onChange={(v) => setActiveTab(v as Tab)} />
        </View>
      </View>
      <View style={s.toolbar}>
        <View style={s.search}>
          <Icon name="search" size={18} color={T.muted} />
          <TextInput
            placeholder="Search Production Merge..."
            placeholderTextColor={T.muted}
            value={search}
            onChangeText={setSearch}
            style={s.searchInput}
            returnKeyType="search"
            autoCorrect={false}
          />
          {search.length > 0 ? (
            <TouchableOpacity onPress={() => { setSearch(''); Keyboard.dismiss(); }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityLabel="Clear search">
              <Icon name="close" size={18} color={T.muted} />
            </TouchableOpacity>
          ) : null}
        </View>
        <TouchableOpacity style={s.iconBtn} onPress={() => loadList()} disabled={loading} accessibilityLabel="Refresh">
          {loading ? <ActivityIndicator size="small" color={T.copper} /> : <Icon name="refresh" size={20} color={T.nav} />}
        </TouchableOpacity>
      </View>

      {rows.length > 0 ? (
        <View style={s.chips}>
          <Chip label={search ? 'Shown' : 'Records'} value={search ? `${visible.length}/${rows.length}` : String(rows.length)} color={T.nav} />
          {counts.pending ? <Chip label="Pending" value={String(counts.pending)} color={STATUS.pending.color} /> : null}
          {counts.authorised ? <Chip label="Authorised" value={String(counts.authorised)} color={STATUS.authorised.color} /> : null}
          {counts.rejected ? <Chip label="Rejected" value={String(counts.rejected)} color={STATUS.rejected.color} /> : null}
        </View>
      ) : null}

      {loadError ? (
        <View style={s.errBox}>
          <Icon name="error-outline" size={16} color={T.red} />
          <TruncText style={s.errText} numberOfLines={3}>{loadError}</TruncText>
        </View>
      ) : null}
    </View>
  );

  const empty = loading ? (
    <View style={s.empty}>
      <ActivityIndicator color={T.copper} />
      <Text style={s.emptyText}>Loading production merge…</Text>
    </View>
  ) : (
    <View style={s.empty}>
      <Icon name="inventory-2" size={42} color={T.border} />
      <Text style={s.emptyTitle}>{rows.length ? 'No match' : 'No Production Merge Data'}</Text>
      <Text style={s.emptyText}>{rows.length ? 'Change the search text.' : 'Production Merge records will appear here'}</Text>
    </View>
  );

  return (
    <View style={s.root}>
      <FlatList
        key={`cols-${cols}`}
        data={loading && !refreshing ? [] : visible}
        numColumns={cols}
        keyExtractor={(r: Row, i: number) => rowKey(r, i)}
        ListHeaderComponent={header}
        ListHeaderComponentStyle={{ marginBottom: 10 }}
        ListEmptyComponent={empty}
        columnWrapperStyle={cols > 1 ? { gap: 10 } : undefined}
        contentContainerStyle={[s.content, { paddingBottom: 24 }]}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={9}
        removeClippedSubviews={Platform.OS === 'android'}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadList(true)} colors={[T.copper]} tintColor={T.copper} />}
        renderItem={({ item }: { item: Row }) => (
          <View style={{ flex: 1 / cols, marginBottom: 10 }}>
            <MergeCard
              item={item}
              history={history}
              remark={remarks[item?.uid] || ''}
              onRemark={(text) => setRemarks((prev) => ({ ...prev, [item?.uid]: text }))}
              busy={busy && busy.uid === item?.uid ? busy.isauth : null}
              locked={!!busy}
              onReject={() => doAuth(item, 2)}
              onApprove={() => doAuth(item, 1)}
            />
          </View>
        )}
      />
    </View>
  );
}

/* --------------------------------- pieces --------------------------------- */

function Chip({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={s.chip}>
      <View style={[s.chipDot, { backgroundColor: color }]} />
      <Text style={s.chipText}>{label}</Text>
      <View style={s.chipCount}><Text style={s.chipCountText}>{value}</Text></View>
    </View>
  );
}

function KV({ k, v, align = 'left', strong }: { k: string; v: any; align?: 'left' | 'right' | 'center'; strong?: boolean }) {
  const a = align === 'right' ? 'flex-end' : align === 'center' ? 'center' : 'flex-start';
  return (
    <View style={[s.kvItem, { alignItems: a }]}>
      <TruncText style={s.kvK} numberOfLines={1}>{k}</TruncText>
      <TruncText style={[s.kvV, strong && { fontWeight: '800', color: T.nav }, { textAlign: align }]} numberOfLines={2}>{dash(v)}</TruncText>
    </View>
  );
}

function MergeCard({ item, history, remark, onRemark, busy, locked, onReject, onApprove }: {
  item: Row; history: boolean; remark: string; onRemark: (t: string) => void;
  busy: 1 | 2 | null; locked: boolean; onReject: () => void; onApprove: () => void;
}) {
  const st = statusKey(item);
  const meta = STATUS[st];
  const border = st === 'authorised' ? T.green : st === 'rejected' ? T.red : T.border;
  return (
    <View style={[s.card, { borderColor: border, borderLeftColor: st === 'pending' ? T.copper : border }]}>
      {/* title row: sub merge code + name, status badge */}
      <View style={s.cardHead}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <TruncText style={s.eyebrow} numberOfLines={1}>SUB MERGE · {dash(item.submercode)}</TruncText>
          <TruncText style={s.title} numberOfLines={2}>{dash(item.submername)}</TruncText>
        </View>
        {item.authstatus ? (
          <View style={[s.badge, { backgroundColor: meta.bg, borderColor: meta.color }]}>
            <TruncText style={[s.badgeText, { color: meta.color }]} numberOfLines={1}>{String(item.authstatus)}</TruncText>
          </View>
        ) : null}
      </View>

      <View style={s.body}>
        <View style={s.kvRow}>
          <KV k="Main Merge Code" v={item.mainmercode} strong />
          <KV k="Main Merge Name" v={item.mainmername} align="right" strong />
        </View>
        <View style={s.kvRow}>
          <KV k="Reason" v={item.rsnname} />
        </View>
        <View style={s.kvRow}>
          <KV k="Prod. No." v={item.prodno} />
          <KV k="Prod. Date" v={item.proddate} align="right" />
        </View>
        <View style={s.kvRow}>
          <KV k="Created By" v={item.createdby} />
          <KV k="Created Date & Time" v={`${dash(item.createddate)}  ${dash(item.createdtime)}`} align="right" />
        </View>

        {history ? (
          <>
            <View style={s.remarkBox}>
              <Text style={s.kvK}>Remark</Text>
              <Text style={s.remarkText}>{dash(item.aremark)}</Text>
            </View>
            <View style={[s.kvRow, s.divTop]}>
              <KV k="Auth By" v={item.authby} />
              <KV k="Auth Date" v={item.authdate} align="center" />
              <KV k="Auth Time" v={item.authtime} align="right" />
            </View>
          </>
        ) : (
          <View>
            <Text style={s.label}>Remark</Text>
            <TextInput
              placeholder="Enter Remark"
              placeholderTextColor={T.muted}
              value={remark}
              onChangeText={onRemark}
              style={s.input}
              multiline
            />
          </View>
        )}
      </View>

      {!history ? (
        <View style={s.actions}>
          <TouchableOpacity
            style={[s.actBtn, s.rejectBtn, locked && { opacity: busy === 2 ? 1 : 0.5 }]}
            onPress={onReject}
            disabled={locked}
            accessibilityRole="button"
            accessibilityLabel="Reject"
          >
            {busy === 2 ? <ActivityIndicator size="small" color={T.red} /> : <Icon name="close" size={18} color={T.red} />}
            <Text style={[s.actText, { color: T.red }]}>Reject</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.actBtn, s.approveBtn, locked && { opacity: busy === 1 ? 1 : 0.5 }]}
            onPress={onApprove}
            disabled={locked}
            accessibilityRole="button"
            accessibilityLabel="Approve"
          >
            {busy === 1 ? <ActivityIndicator size="small" color="#fff" /> : <Icon name="check" size={18} color="#fff" />}
            <Text style={[s.actText, { color: '#fff' }]}>Approve</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  content: { padding: 12, width: '100%', maxWidth: 1200, alignSelf: 'center' },
  toolbar: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  search: { flex: 1, minWidth: 0, height: 44, flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 10, borderWidth: 1, borderColor: T.border, backgroundColor: T.surface, paddingHorizontal: 12 },
  searchInput: { flex: 1, minWidth: 0, fontSize: 14, color: T.ink, height: 42 },
  iconBtn: { width: 44, height: 44, borderRadius: 10, borderWidth: 1, borderColor: T.border, backgroundColor: T.surface, alignItems: 'center', justifyContent: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 32, paddingLeft: 10, paddingRight: 5, borderRadius: 16, borderWidth: 1, borderColor: T.border, backgroundColor: T.surface },
  chipDot: { width: 8, height: 8, borderRadius: 4 },
  chipText: { fontSize: 12, fontWeight: '700', color: T.nav },
  chipCount: { minWidth: 24, height: 22, borderRadius: 11, paddingHorizontal: 6, backgroundColor: T.alt, alignItems: 'center', justifyContent: 'center' },
  chipCountText: { fontSize: 11.5, fontWeight: '800', color: T.nav },
  errBox: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 10, borderRadius: 10, backgroundColor: '#F8E9E6' },
  errText: { flex: 1, fontSize: 12, color: T.red, fontWeight: '700' },
  empty: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 24, gap: 6 },
  emptyTitle: { fontSize: 15, fontWeight: '800', color: T.nav },
  emptyText: { fontSize: 13, color: T.muted, textAlign: 'center' },

  card: { flex: 1, backgroundColor: T.surface, borderRadius: 12, borderWidth: 1, borderLeftWidth: 4, overflow: 'hidden', ...S.card },
  cardHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: T.sub, borderBottomWidth: 1, borderBottomColor: T.hair },
  eyebrow: { fontSize: 10, fontWeight: '800', color: T.copper, letterSpacing: 0.8 },
  title: { fontSize: 14.5, fontWeight: '800', color: T.nav, marginTop: 2 },
  badge: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3, maxWidth: 120 },
  badgeText: { fontSize: 10.5, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.4 },
  body: { padding: 12, gap: 10 },
  kvRow: { flexDirection: 'row', gap: 10 },
  kvItem: { flex: 1, minWidth: 0 },
  kvK: { fontSize: 10.5, fontWeight: '800', color: T.muted, textTransform: 'uppercase', letterSpacing: 0.4 },
  kvV: { fontSize: 13, fontWeight: '700', color: T.ink, marginTop: 2 },
  divTop: { borderTopWidth: 1, borderTopColor: T.hair, paddingTop: 10 },
  remarkBox: { backgroundColor: T.sub, borderWidth: 1, borderColor: T.hair, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, gap: 2 },
  remarkText: { fontSize: 13, fontWeight: '600', color: T.ink, lineHeight: 18 },
  label: { fontSize: 11, fontWeight: '700', color: T.muted, letterSpacing: 0.4, marginBottom: 5, textTransform: 'uppercase' },
  input: { minHeight: 42, borderWidth: 1, borderColor: T.border, borderRadius: 10, backgroundColor: T.surface, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: T.ink, textAlignVertical: 'top' },
  actions: { flexDirection: 'row', gap: 10, paddingHorizontal: 12, paddingBottom: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: T.hair },
  actBtn: { flex: 1, height: 40, borderRadius: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  rejectBtn: { borderWidth: 1, borderColor: T.red, backgroundColor: T.surface },
  approveBtn: { backgroundColor: T.green },
  actText: { fontSize: 13.5, fontWeight: '800' },
});
