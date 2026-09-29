// FILE: src/screens/inquiry/DashboardView.tsx
// Inquiry dashboard (legacy DashboardScreen): counts, TAT counts, search,
// status + TAT filters, inquiry cards (notes preview · Notes / Edit / Delete),
// "+" new inquiry, TAT config / authorizer settings / auth queue shortcuts.
//
// Same rules as legacy:
//   GET /api/inquiries { status, tat, search, prptype, yearno, rights }
//   rights = assign 3 · attachtds 1 · detachtds 2 · else 0 (checkrights mob_inquiry)
//   detachtds = view-only: no "+", no Notes, no admin icons
//   Edit / Delete only while pending_costing (or can_edit / can_delete from API)
//   Settings + Auth queue only for prptype != 'S'; Auth queue only for authorizers
import AppAlert from '@/common/utils/appAlert';
import { T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useInquiry, useInquiryNav, useViewFocus } from './InquiryContext';
import {
  canDeleteInquiry,
  canEditInquiry,
  DashboardCounts,
  dsnWord,
  errMsg,
  formatDate,
  Inquiry,
  InquiryStatus,
  isSip,
  isViewOnly,
  relativeTime,
  rightsCode,
  STATUS_FILTERS,
  TAT_FILTERS,
  TAT_META,
  TatCounts,
  TatStatus,
} from './inquiryModel';
import { EmptyState, ErrorBox, HIT, IconBtn, Loader, MONO, StatusBadge, TatBadge, useWide, ViewShell } from './ui';

export function DashboardView() {
  const { api, prptype, rights, rightsLoaded, isAuthorizer, pendingAuth, refreshAuth } = useInquiry();
  const nav = useInquiryNav();
  const { wide, xwide } = useWide();
  const viewOnly = isViewOnly(rights);
  const sip = isSip(prptype);

  const [status, setStatus] = useState<InquiryStatus | 'all'>('all');
  const [tat, setTat] = useState<TatStatus | 'all'>('all');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState(''); // debounced search
  const [items, setItems] = useState<Inquiry[]>([]);
  const [counts, setCounts] = useState<DashboardCounts | null>(null);
  const [tatCounts, setTatCounts] = useState<TatCounts | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reqId = useRef(0);

  // debounce the search box (legacy searched on submit only)
  useEffect(() => {
    const t = setTimeout(() => setQuery(search.trim()), 400);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async (spinner: boolean) => {
    if (!rightsLoaded) return;
    const id = ++reqId.current;
    if (spinner) setLoading(true);
    setError(null);
    try {
      const res = await api.list({
        status,
        tat: tat === 'all' ? undefined : tat,
        search: query || undefined,
        rights: rightsCode(rights),
      });
      if (id !== reqId.current) return;
      setItems(res.data);
      setCounts(res.counts);
      setTatCounts(res.tatCounts);
    } catch (e) {
      if (id === reqId.current) setError(errMsg(e, 'Unable to load inquiries'));
    } finally {
      if (id === reqId.current) { setLoading(false); setRefreshing(false); }
    }
  }, [api, status, tat, query, rights, rightsLoaded]);

  // first load + every filter change + every return to this view
  const first = useRef(true);
  useViewFocus(() => {
    void load(first.current || items.length === 0);
    first.current = false;
    void refreshAuth();
  }, [load]);

  const onDelete = (item: Inquiry) => {
    AppAlert.alert('Delete Inquiry?', `Are you sure you want to delete ${item.inquiry_no}? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.remove(item.id);
            setItems((cur) => cur.filter((x) => x.id !== item.id));
            void load(false);
          } catch (e) {
            AppAlert.alert('Error', errMsg(e, 'Failed to delete inquiry'));
          }
        },
      },
    ]);
  };

  const columns = xwide ? 3 : wide ? 2 : 1;

  const header = (
    <View style={{ gap: 10, marginBottom: 6 }}>
      {counts && (
        <View style={s.kpiRow}>
          <Kpi label="PENDING" value={counts.pending_costing} color={T.amber} onPress={() => setStatus('pending_costing')} />
          <Kpi label="COSTED" value={counts.costed} color={T.green} onPress={() => setStatus('costed')} />
          <Kpi label="SENT" value={counts.sent} color={T.purple} onPress={() => setStatus('sent')} />
          <Kpi label="TOTAL" value={counts.total} color={T.blue} onPress={() => setStatus('all')} />
        </View>
      )}
      {tatCounts && (
        <View style={s.tatRow}>
          {(['on_time', 'warning', 'breached'] as const).map((k) => (
            <TouchableOpacity
              key={k}
              onPress={() => setTat(tat === k ? 'all' : k)}
              style={[s.tatChip, { backgroundColor: TAT_META[k].bg }, tat === k && { borderColor: TAT_META[k].fg }]}
              activeOpacity={0.75}
            >
              <View style={[s.tatDot, { backgroundColor: TAT_META[k].fg }]} />
              <Text style={[s.tatText, { color: TAT_META[k].fg }]} numberOfLines={1}>
                {TAT_META[k].label}: {tatCounts[k] ?? 0}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <View style={s.search}>
        <Icon name="search" size={17} color={T.muted} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={() => setQuery(search.trim())}
          placeholder="Search by inquiry no or party"
          placeholderTextColor={T.muted}
          style={s.searchInput}
          returnKeyType="search"
          autoCorrect={false}
        />
        {!!search && (
          <TouchableOpacity onPress={() => { setSearch(''); setQuery(''); }} hitSlop={HIT}>
            <Icon name="close" size={16} color={T.muted} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}>
        {STATUS_FILTERS.map((f) => (
          <FilterChip key={f.key} label={f.label} on={status === f.key} onPress={() => setStatus(f.key)} />
        ))}
      </ScrollView>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}>
        {TAT_FILTERS.map((f) => (
          <FilterChip
            key={f.key}
            label={f.label}
            dot={f.key === 'all' ? undefined : TAT_META[f.key].fg}
            on={tat === f.key}
            onPress={() => setTat(f.key)}
          />
        ))}
      </ScrollView>
      {!!error && <ErrorBox text={error} onRetry={() => load(true)} />}
    </View>
  );

  return (
    <ViewShell
      title="Inquiries"
      subtitle={`Manage your inquiries · ${sip ? 'Designs' : 'Items'}`}
      scroll={false}
      right={!viewOnly ? (
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <IconBtn icon="timer" label="TAT configuration" onPress={() => nav.push({ name: 'tatConfig' })} />
          {!sip && <IconBtn icon="manage-accounts" label="Authorizers" onPress={() => nav.push({ name: 'settings' })} />}
          {isAuthorizer && !sip && (
            <IconBtn
              icon="notifications"
              label="Authorization queue"
              badge={pendingAuth}
              tone={pendingAuth > 0 ? 'alert' : undefined}
              onPress={() => nav.push({ name: 'authQueue' })}
            />
          )}
        </View>
      ) : null}
    >
      {loading && items.length === 0 ? (
        <View style={[s.listPad, wide && s.listWide]}>{header}<Loader label="Loading inquiries…" /></View>
      ) : (
        <FlatList
          key={`cols-${columns}`}
          data={items}
          numColumns={columns}
          keyExtractor={(i) => String(i.id)}
          columnWrapperStyle={columns > 1 ? { gap: 10 } : undefined}
          contentContainerStyle={[s.listPad, wide && s.listWide]}
          ListHeaderComponent={header}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(false); }} />}
          initialNumToRender={12}
          windowSize={7}
          ListEmptyComponent={
            !error ? (
              <EmptyState
                icon="request-quote"
                title="No inquiries"
                subtitle={viewOnly ? 'Nothing matches these filters' : 'Tap + to create a new inquiry'}
              />
            ) : null
          }
          renderItem={({ item }) => (
            <View style={{ flex: 1 / columns }}>
              <InquiryCard
                item={item}
                prptype={prptype}
                viewOnly={viewOnly}
                onOpen={() => nav.push({ name: 'detail', id: item.id })}
                onNotes={() => nav.push({ name: 'notes', inquiryId: item.id, inquiryNo: item.inquiry_no })}
                onEdit={() => nav.push({ name: 'form', inquiryId: item.id })}
                onDelete={() => onDelete(item)}
              />
            </View>
          )}
        />
      )}

      {!viewOnly && rightsLoaded && (
        <TouchableOpacity activeOpacity={0.85} onPress={() => nav.push({ name: 'form' })} style={s.fab}>
          <Icon name="add" size={22} color="#fff" />
          {wide && <Text style={s.fabText}>New Inquiry</Text>}
        </TouchableOpacity>
      )}
    </ViewShell>
  );
}

function Kpi({ label, value, color, onPress }: { label: string; value: number; color: string; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} style={[s.kpi, { borderTopColor: color }]} activeOpacity={0.75}>
      <Text style={s.kpiLbl}>{label}</Text>
      <Text style={[s.kpiVal, { color }]}>{value ?? 0}</Text>
    </TouchableOpacity>
  );
}

function FilterChip({ label, on, onPress, dot }: { label: string; on: boolean; onPress: () => void; dot?: string }) {
  return (
    <TouchableOpacity onPress={onPress} style={[s.chip, on && s.chipOn]} activeOpacity={0.75}>
      {!!dot && <View style={[s.chipDot, { backgroundColor: dot }]} />}
      <Text style={[s.chipText, on && { color: '#fff' }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const InquiryCard = React.memo(function InquiryCard({
  item, prptype, viewOnly, onOpen, onNotes, onEdit, onDelete,
}: {
  item: Inquiry; prptype: string; viewOnly: boolean;
  onOpen: () => void; onNotes: () => void; onEdit: () => void; onDelete: () => void;
}) {
  const count = item.designs_count ?? 0;
  const editable = canEditInquiry(item);
  const deletable = canDeleteInquiry(item);
  const overall = item.tat?.overall_status;
  return (
    <TouchableOpacity activeOpacity={0.75} style={s.card} onPress={onOpen}>
      <View style={s.cardHead}>
        <Text style={s.inqNo} numberOfLines={1}>{item.inquiry_no}</Text>
        <StatusBadge status={item.status} />
      </View>
      <Text style={s.party} numberOfLines={1}>{item.party_name}</Text>
      <View style={s.cardMetaRow}>
        <Text style={s.meta} numberOfLines={1}>
          {count} {dsnWord(prptype, count > 1)} · {formatDate(item.inquiry_date)}
        </Text>
        {!!overall && overall !== 'not_applicable' && <TatBadge status={overall} />}
      </View>

      {!!item.latest_note && (
        <View style={s.note}>
          <Icon name="chat-bubble-outline" size={14} color={T.blue} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={s.noteText} numberOfLines={1}>
              {item.latest_note.created_by_name ? `${item.latest_note.created_by_name}: ` : ''}{item.latest_note.note}
            </Text>
            <Text style={s.noteTime}>
              {relativeTime(item.latest_note.created_at)}
              {item.notes_count && item.notes_count > 1 ? ` · ${item.notes_count} notes` : ''}
            </Text>
          </View>
        </View>
      )}

      <View style={s.actions}>
        <ActionBtn icon="notes" label={`Notes${item.notes_count ? ` (${item.notes_count})` : ''}`} onPress={onNotes} disabled={viewOnly} />
        {editable && !viewOnly && <ActionBtn icon="edit" label="Edit" color={T.amber} onPress={onEdit} />}
        {deletable && !viewOnly && <ActionBtn icon="delete-outline" label="Delete" color={T.red} onPress={onDelete} danger />}
      </View>
    </TouchableOpacity>
  );
});

function ActionBtn({ icon, label, onPress, color = T.ink, danger, disabled }: {
  icon: any; label: string; onPress: () => void; color?: string; danger?: boolean; disabled?: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={(e: any) => { e?.stopPropagation?.(); onPress(); }}
      disabled={disabled}
      style={[s.actBtn, danger && { backgroundColor: `${T.red}10`, borderColor: `${T.red}33` }, disabled && { opacity: 0.45 }]}
      activeOpacity={0.7}
    >
      <Icon name={icon} size={15} color={color} />
      <Text style={[s.actText, danger && { color: T.red }]} numberOfLines={1}>{label}</Text>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  listPad: { padding: 12, paddingBottom: 110 },
  listWide: { maxWidth: 1240, width: '100%', alignSelf: 'center', paddingHorizontal: 20 },
  kpiRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  kpi: {
    flexGrow: 1, flexBasis: 72, backgroundColor: T.surface, borderRadius: 10, borderWidth: 1, borderColor: T.border,
    borderTopWidth: 3, paddingHorizontal: 10, paddingVertical: 8,
  },
  kpiLbl: { fontSize: 9, fontWeight: '900', color: T.muted, letterSpacing: 0.5 },
  kpiVal: { fontSize: 19, fontWeight: '800', fontFamily: MONO, marginTop: 2 },
  tatRow: { flexDirection: 'row', gap: 8 },
  tatChip: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 9, paddingVertical: 8,
    borderRadius: 9, borderWidth: 1, borderColor: 'transparent',
  },
  tatDot: { width: 8, height: 8, borderRadius: 4 },
  tatText: { fontSize: 11.5, fontWeight: '800', flexShrink: 1 },
  search: {
    flexDirection: 'row', alignItems: 'center', gap: 7, height: 44,
    backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, borderRadius: 10, paddingHorizontal: 11,
  },
  searchInput: { flex: 1, fontSize: 13.5, color: T.ink, paddingVertical: 0 },
  chips: { gap: 6, paddingRight: 12 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5, height: 32, paddingHorizontal: 13,
    borderRadius: 16, borderWidth: 1, borderColor: T.border, backgroundColor: T.surface,
  },
  chipOn: { backgroundColor: T.nav, borderColor: T.nav },
  chipDot: { width: 8, height: 8, borderRadius: 4 },
  chipText: { fontSize: 12, fontWeight: '800', color: T.ink },

  card: {
    backgroundColor: T.surface, borderRadius: 12, borderWidth: 1, borderColor: T.border, padding: 12, marginBottom: 10,
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 4 },
  inqNo: { flex: 1, fontSize: 14.5, fontWeight: '900', color: T.ink, fontFamily: MONO },
  party: { fontSize: 13.5, fontWeight: '800', color: T.yd, marginBottom: 4 },
  cardMetaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  meta: { flex: 1, fontSize: 11.5, fontWeight: '600', color: T.muted },
  note: {
    flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: `${T.blue}0F`, borderLeftWidth: 3,
    borderLeftColor: T.blue, borderRadius: 7, paddingHorizontal: 9, paddingVertical: 7, marginTop: 8,
  },
  noteText: { fontSize: 12, fontWeight: '700', color: T.ink },
  noteTime: { fontSize: 10.5, fontWeight: '600', color: T.muted, marginTop: 1 },
  actions: { flexDirection: 'row', gap: 6, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: T.hair },
  actBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, height: 34,
    borderRadius: 8, borderWidth: 1, borderColor: T.border, backgroundColor: T.sub, paddingHorizontal: 6,
  },
  actText: { fontSize: 12, fontWeight: '800', color: T.ink },
  fab: {
    position: 'absolute', right: 18, bottom: 22, minWidth: 54, height: 54, borderRadius: 27, paddingHorizontal: 16,
    backgroundColor: T.copper, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 5,
  },
  fabText: { color: '#fff', fontSize: 13.5, fontWeight: '900' },
});
