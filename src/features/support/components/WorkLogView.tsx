// FILE: src/features/support/components/WorkLogView.tsx
// IT WORK LOG (Raise ticket → "IT work log"): every FlowNest user can see what the IT team is
// doing — in progress, in testing, waiting in the queue, finished in the last 30 days.
// Only title / module / status / who: never descriptions, internal notes or other users' names;
// cards the IT team labels "private" or "internal" never show. The user's own tickets are marked.
import { T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { SupportCall } from '../api';
import { ago, devSideOf, statusOf, typeOf } from '../model';
import { Avatar, Empty, Input, Segmented, useLayout } from './ui';

type Item = {
  id: number; no: string; kind: string; title: string; type: string; status: string; status_label: string; module_label: string; dev_side: string;
  it_person: { name: string; color: string } | null; mine: boolean; work_date: number | null; resolved_at: string | null; updated_at: string;
};
type Group = 'now' | 'testing' | 'todo' | 'done';

export function WorkLogView({ api, onOpenMine }: { api: SupportCall; onOpenMine: (id: number) => void }) {
  const { phone } = useLayout();
  const [group, setGroup] = useState<Group>('now');
  const [q, setQ] = useState('');
  const [items, setItems] = useState<Item[]>([]);
  const [cursor, setCursor] = useState<number | null>(null);
  const [counts, setCounts] = useState<Record<Group, number> | null>(null);
  const [loading, setLoading] = useState(false);
  const gen = useRef(0);

  const load = useCallback(async (reset: boolean, quiet = false) => {
    const g = reset ? ++gen.current : gen.current;
    if (!quiet) setLoading(true);
    try {
      const r = await api<{ items: Item[]; next_cursor: number | null; counts: Record<Group, number> }>('worklog', { group, q, cursor: reset ? '' : cursor || '', limit: 30 });
      if (g !== gen.current) return;
      setItems((cur) => (reset ? r.items : [...cur, ...r.items.filter((x) => !cur.some((c) => c.id === x.id))]));
      setCursor(r.next_cursor);
      setCounts(r.counts);
    } catch { /* keep what is shown */ } finally {
      if (g === gen.current) setLoading(false);
    }
  }, [api, group, q, cursor]);

  useEffect(() => { const t = setTimeout(() => void load(true), q ? 300 : 0); return () => clearTimeout(t); }, [group, q]); // eslint-disable-line react-hooks/exhaustive-deps
  // quiet refresh while open
  useEffect(() => { const t = setInterval(() => void load(true, true), 30000); return () => clearInterval(t); }, [group, q]); // eslint-disable-line react-hooks/exhaustive-deps

  const n = (g: Group) => (counts ? ` · ${counts[g]}` : '');
  return (
    <View style={{ flex: 1, gap: 10 }}>
      <View style={w.note}>
        <Icon name="engineering" size={18} color={T.blue} />
        <Text style={w.noteText}>What the IT team is working on right now — the same board the IT team uses (titles only). Your own tickets are marked <Text style={w.mineTag}> YOURS </Text></Text>
      </View>
      <View style={[w.bar, phone && { flexDirection: 'column', alignItems: 'stretch' }]}>
        <Segmented value={group} onChange={setGroup} scroll options={[
          { value: 'now', label: `In progress${n('now')}`, icon: 'autorenew' },
          { value: 'testing', label: `Testing${n('testing')}`, icon: 'fact-check' },
          { value: 'todo', label: `In queue${n('todo')}`, icon: 'schedule' },
          { value: 'done', label: `Done (30 days)${n('done')}`, icon: 'task-alt' },
        ]} />
        <View style={{ flex: 1, minWidth: 200 }}><Input value={q} onChangeText={setQ} placeholder="Search the IT work…" icon="search" /></View>
      </View>
      <FlatList
        data={items}
        keyExtractor={(x) => String(x.id)}
        renderItem={({ item }) => <Row x={item} phone={phone} onPress={item.mine ? () => onOpenMine(item.id) : undefined} />}
        onEndReached={() => { if (cursor && !loading) void load(false); }}
        onEndReachedThreshold={0.5}
        contentContainerStyle={{ paddingBottom: 40 }}
        ListFooterComponent={loading && (!items.length || cursor) ? <ActivityIndicator color={T.copper} style={{ marginVertical: 14 }} /> : null}
        ListEmptyComponent={!loading ? <Empty icon="inbox" title={q ? 'No match' : group === 'now' ? 'Nothing in progress right now' : 'Nothing here'} /> : null}
      />
    </View>
  );
}

function Row({ x, phone, onPress }: { x: Item; phone: boolean; onPress?: () => void }) {
  const st = statusOf(x.status);
  const ty = typeOf(x.type);
  const side = devSideOf(x.dev_side);
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={({ hovered }: any) => [w.row, { borderLeftColor: st.color }, hovered && onPress ? { backgroundColor: T.sub } : null]} accessibilityRole={onPress ? 'button' : undefined}>
      <Icon name={ty.icon as any} size={15} color={ty.color} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={w.title} numberOfLines={1}>{x.title}</Text>
          {x.mine ? <Text style={w.mineTag}> YOURS </Text> : null}
        </View>
        <Text style={w.meta} numberOfLines={1}>{[x.no, x.module_label, side?.label, x.status === 'done' && x.resolved_at ? `done ${ago(x.resolved_at)}` : `updated ${ago(x.updated_at)}`].filter(Boolean).join(' · ')}</Text>
      </View>
      {x.it_person ? (
        <View style={w.who}>
          <Avatar name={x.it_person.name} color={x.it_person.color} size={22} />
          {!phone ? <Text style={w.whoText} numberOfLines={1}>{x.it_person.name}</Text> : null}
        </View>
      ) : <Text style={w.meta}>{phone ? '—' : 'not picked yet'}</Text>}
      {!phone ? <Text style={[w.status, { color: st.color, backgroundColor: `${st.color}14` }]}>{x.status_label}</Text> : null}
    </Pressable>
  );
}

const w = StyleSheet.create({
  note: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 12, backgroundColor: `${T.blue}0D`, borderWidth: 1, borderColor: `${T.blue}2A` },
  noteText: { flex: 1, fontSize: 12.5, fontWeight: '600', color: T.ink, lineHeight: 18 },
  bar: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9, paddingHorizontal: 12, marginBottom: 5, backgroundColor: T.surface, borderRadius: 10, borderWidth: 1, borderColor: T.border, borderLeftWidth: 4 },
  title: { fontSize: 13.5, fontWeight: '800', color: T.ink, flexShrink: 1 },
  meta: { fontSize: 11.5, fontWeight: '700', color: T.muted, marginTop: 1 },
  mineTag: { fontSize: 9.5, fontWeight: '900', color: '#fff', backgroundColor: T.copper, borderRadius: 4, overflow: 'hidden' },
  who: { flexDirection: 'row', alignItems: 'center', gap: 6, maxWidth: 150 },
  whoText: { fontSize: 12, fontWeight: '800', color: T.ink, flexShrink: 1 },
  status: { fontSize: 11, fontWeight: '900', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, overflow: 'hidden', minWidth: 84, textAlign: 'center' },
});
