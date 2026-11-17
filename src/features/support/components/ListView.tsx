// FILE: src/features/support/components/ListView.tsx
// List of all cards for the filters — newest change first (or newest created).
// Virtualised (FlatList) + keyset paging: smooth with 1 lakh+ cards.
import { T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import React from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useItDesk } from '../itStore';
import { ago, fmtYmd, isOverdue, priorityOf, Ticket, typeOf } from '../model';
import { Avatar, Empty, MONO, Segmented, StatusPill, useLayout } from './ui';

export function ListView({ onOpen }: { onOpen: (t: Ticket) => void }) {
  const { phone } = useLayout();
  const list = useItDesk((s) => s.list);
  const tickets = useItDesk((s) => s.tickets);
  const counts = useItDesk((s) => s.counts);
  const noMatch = useItDesk((s) => s.noMatch);
  const listSort = useItDesk((s) => s.listSort);
  const setListSort = useItDesk((s) => s.setListSort);
  const loadList = useItDesk((s) => s.loadList);

  const header = (
    <View style={l.head}>
      <Text style={l.total}>{counts ? `${counts.total.toLocaleString('en-IN')} card${counts.total === 1 ? '' : 's'}` : ' '}</Text>
      <View style={{ flex: 1 }} />
      <Segmented value={listSort} onChange={(v) => setListSort(v)} options={[{ value: 'rev', label: 'Recently updated', icon: 'update' }, { value: 'created', label: 'Newest', icon: 'fiber-new' }]} />
    </View>
  );

  return (
    <FlatList
      data={list.ids}
      keyExtractor={(id) => String(id)}
      ListHeaderComponent={header}
      stickyHeaderIndices={phone ? undefined : [0]}
      renderItem={({ item }) => (tickets[item] ? <Row t={tickets[item]} onOpen={onOpen} phone={phone} /> : null)}
      onEndReached={() => { void loadList(); }}
      onEndReachedThreshold={0.5}
      initialNumToRender={20}
      maxToRenderPerBatch={20}
      windowSize={9}
      removeClippedSubviews
      contentContainerStyle={{ paddingBottom: 60 }}
      ListFooterComponent={list.loading && (!list.ids.length || list.more) ? <ActivityIndicator color={T.copper} style={{ marginVertical: 18 }} /> : list.more ? <Text style={l.more}>Scroll for more…</Text> : list.ids.length ? <Text style={l.more}>That is all</Text> : null}
      ListEmptyComponent={list.loaded && !list.loading ? <Empty icon={noMatch ? 'search-off' : 'inbox'} title={noMatch ? 'No match' : 'No cards'} text={noMatch ? 'No card has these words (checked instantly).' : 'Nothing matches these filters.'} /> : null}
    />
  );
}

function Row({ t, onOpen, phone }: { t: Ticket; onOpen: (t: Ticket) => void; phone: boolean }) {
  const ty = typeOf(t.type);
  const p = priorityOf(t.priority);
  const overdue = isOverdue(t);
  if (phone) {
    return (
      <Pressable onPress={() => onOpen(t)} style={({ pressed }) => [l.card, { borderLeftColor: p.color }, pressed && { backgroundColor: T.sub }]}>
        <View style={l.rowTop}>
          <Icon name={ty.icon as any} size={14} color={ty.color} />
          <Text style={l.no}>{t.no}</Text>
          <StatusPill status={t.status} small />
          <View style={{ flex: 1 }} />
          <Text style={l.time}>{ago(t.updated_at)}</Text>
        </View>
        <Text style={l.title} numberOfLines={2}>{t.title}</Text>
        <View style={l.rowTop}>
          {t.assignee ? <Avatar name={t.assignee.name} id={t.assignee.id} color={t.assignee.color} size={20} /> : null}
          <Text style={l.meta} numberOfLines={1}>{[t.assignee?.name || 'Unassigned', t.client?.name, t.module_label].filter(Boolean).join(' · ')}</Text>
        </View>
      </Pressable>
    );
  }
  return (
    <Pressable onPress={() => onOpen(t)} style={({ pressed, hovered }: any) => [l.row, (pressed || hovered) && { backgroundColor: T.sub }]}>
      <View style={[l.prio, { backgroundColor: p.color }]} />
      <Text style={[l.no, { width: 70 }]}>{t.no}</Text>
      <View style={{ flex: 3, minWidth: 0 }}>
        <Text style={l.title} numberOfLines={1}>{t.title}</Text>
        <Text style={l.meta} numberOfLines={1}>{t.client ? `${t.client.name} · ` : ''}{t.module_label || ty.label}</Text>
      </View>
      <View style={{ width: 118 }}><StatusPill status={t.status} small /></View>
      <View style={[l.cell, { width: 150 }]}>
        {t.assignee ? <><Avatar name={t.assignee.name} id={t.assignee.id} color={t.assignee.color} size={20} /><Text style={l.cellText} numberOfLines={1}>{t.assignee.name}</Text></> : <Text style={[l.cellText, { color: T.muted }]}>Unassigned</Text>}
      </View>
      <Text style={[l.cellText, { width: 80 }, overdue && { color: T.red }]}>{t.due_date ? fmtYmd(t.due_date) : '—'}</Text>
      <Text style={[l.time, { width: 90, textAlign: 'right' }]}>{ago(t.updated_at)}</Text>
    </Pressable>
  );
}

const l = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, backgroundColor: T.bg, flexWrap: 'wrap' },
  total: { fontSize: 13, fontWeight: '900', color: T.nav },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 12, backgroundColor: T.surface, borderBottomWidth: 1, borderBottomColor: T.hair },
  prio: { width: 4, height: 30, borderRadius: 2 },
  card: { backgroundColor: T.surface, borderRadius: 12, borderWidth: 1, borderColor: T.border, borderLeftWidth: 4, padding: 10, marginBottom: 8, gap: 6 },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  no: { fontSize: 11.5, fontWeight: '800', color: T.muted, fontFamily: MONO },
  title: { fontSize: 13.5, fontWeight: '800', color: T.ink },
  meta: { fontSize: 11.5, color: T.muted, fontWeight: '700', marginTop: 2, flexShrink: 1 },
  cell: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cellText: { fontSize: 12.5, fontWeight: '700', color: T.ink, flexShrink: 1 },
  time: { fontSize: 11.5, color: T.muted, fontWeight: '700' },
  more: { textAlign: 'center', color: T.muted, fontSize: 12, fontWeight: '700', paddingVertical: 14 },
});
