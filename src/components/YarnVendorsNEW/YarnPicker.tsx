// ─────────────────────────────────────────────────────────────
// FILE: src/components/YarnVendorsNEW/YarnPicker.tsx
//
// Select ONE yarn for the vendor search from the ERP yarn master. Only the yarns are shown — directly, no blend /
// ply folders and nothing to open: every main item and every sub item (Spun + Filament together) is one row with
// ALL its details visible (Blend %, Count + count type, Ply, Denier, Type, Lustre, Other).
//   wide screen  one table row per yarn, the details in columns
//   phone        one compact card per yarn, every detail on it
// Tap a yarn to select it (another tap on a different yarn replaces it). The backend reads every detail of the
// selected yarn again from the master and puts it in the AI question.
// Data: GET /api/yarn-vendors-yarns (./api.ts loadYarnMaster) — one call.
// ─────────────────────────────────────────────────────────────
import { T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Pressable, StyleSheet, Text, TextInput, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { Yarn, YarnMaster } from './api';

type Props = {
  visible: boolean;
  master: YarnMaster | null;
  loading: boolean;
  error: string;
  onReload: () => void;
  /** the selected yarn (one) */
  selected: Yarn | null;
  /** false = 5 typed items already, nothing can be added */
  canAdd: boolean;
  onSelect: (y: Yarn | null) => void;
  onClose: () => void;
};

/** a yarn of the flat list: a main item, or a sub item with the name of its main item */
type Row = Yarn & { parentName: string };

const norm = (v: string) => String(v || '').toLowerCase().replace(/\s+/g, ' ').trim();
const textOf = (y: Row) => norm([y.name, y.itmcode, y.parentName, y.kind, y.blend_label, y.count, y.count_type, y.ply, y.denier, y.filament_type, y.lustre, y.other].join(' '));

/** the details of a yarn (same fields as the Yarns card) — used on the form too */
export function yarnStats(y: Yarn): [string, string][] {
  const rows: [string, string][] = [
    ['Blend', y.blend_label || '-'],
    ['Count', y.count || '-'],
    ['Count type', y.count_type || '-'],
    ['Ply', y.ply || '-'],
  ];
  if (y.denier) rows.push(['Denier', y.denier]);
  if (y.kind === 'Filament' || y.filament_type || y.lustre) rows.push(['Type', y.filament_type || '-'], ['Lustre', y.lustre || '-']);
  rows.push(['Other', y.other || '-']);
  return rows;
}

// table columns (wide screen): label, flex
const COLS: [string, number][] = [['Yarn', 2.4], ['Kind', 0.8], ['Blend', 1.8], ['Count', 0.9], ['Ply', 0.5], ['Denier', 0.7], ['Type · Lustre', 1.1], ['Other', 1]];

export function YarnPicker({ visible, master, loading, error, onReload, selected, canAdd, onSelect, onClose }: Props) {
  const { width, height } = useWindowDimensions();
  const wide = width >= 900;
  const [q, setQ] = useState('');
  const [kind, setKind] = useState<'' | 'Spun' | 'Filament'>('');
  useEffect(() => { if (visible) setQ(''); }, [visible]);

  // every yarn, flat: each main item followed by its sub items
  const all = useMemo<Row[]>(() => {
    const out: Row[] = [];
    (master?.items || []).forEach((y) => {
      out.push({ ...y, parentName: '' });
      y.subs.forEach((x) => out.push({ ...x, kind: x.kind || y.kind, parentName: y.name }));
    });
    return out;
  }, [master]);
  const rows = useMemo(() => {
    const query = norm(q);
    return all.filter((y) => (!kind || y.kind === kind) && (!query || textOf(y).includes(query)));
  }, [all, q, kind]);
  const nSpun = all.filter((y) => y.kind === 'Spun').length;

  const pick = (y: Row) => {
    const on = selected?.itmcode === y.itmcode;
    if (!on && !canAdd) return;
    onSelect(on ? null : y);
  };

  const tableRow = ({ item: y }: { item: Row }) => {
    const on = selected?.itmcode === y.itmcode;
    const cells = [
      null,
      y.kind,
      y.blend_label || '-',
      [y.count, y.count_type].filter(Boolean).join(' ') || '-',
      y.ply || '-',
      y.denier || '-',
      [y.filament_type, y.lustre].filter(Boolean).join(' · ') || '-',
      y.other || '-',
    ];
    return (
      <Pressable onPress={() => pick(y)} style={[st.tRow, on && st.rowOn]} accessibilityRole="button" accessibilityLabel={`${on ? 'Remove' : 'Select'} ${y.name}`}>
        <Icon name={on ? 'radio-button-checked' : 'radio-button-unchecked'} size={18} color={on ? T.copper : T.muted} style={{ width: 24 }} />
        <View style={{ flex: COLS[0][1], minWidth: 0, paddingRight: 8 }}>
          <Text style={st.name} numberOfLines={2}>{y.name}</Text>
          <Text style={st.code} numberOfLines={1}>#{y.itmcode}{y.parentName ? ` · sub item of ${y.parentName}` : ''}</Text>
        </View>
        {cells.slice(1).map((v, i) => (
          <Text key={i} style={[st.cell, { flex: COLS[i + 1][1] }, i === 0 && { color: y.kind === 'Filament' ? '#652880' : T.ink }]} numberOfLines={2}>{v}</Text>
        ))}
      </Pressable>
    );
  };

  const card = ({ item: y }: { item: Row }) => {
    const on = selected?.itmcode === y.itmcode;
    return (
      <Pressable onPress={() => pick(y)} style={[st.card, on && st.rowOn]} accessibilityRole="button" accessibilityLabel={`${on ? 'Remove' : 'Select'} ${y.name}`}>
        <View style={st.cardTop}>
          <Icon name={on ? 'radio-button-checked' : 'radio-button-unchecked'} size={20} color={on ? T.copper : T.muted} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={st.name}>{y.name}</Text>
            <Text style={st.code}>#{y.itmcode}{y.parentName ? ` · sub item of ${y.parentName}` : ''}</Text>
          </View>
          <View style={[st.badge, y.kind === 'Filament' && st.badgeF]}><Text style={[st.badgeT, y.kind === 'Filament' && { color: '#652880' }]}>{y.kind.toUpperCase()}</Text></View>
        </View>
        <View style={st.stats}>
          {yarnStats(y).map(([k, v]) => (
            <View key={k} style={[st.stat, k === 'Blend' || k === 'Other' ? { flexBasis: '100%' } : null]}>
              <Text style={st.statK}>{k.toUpperCase()}</Text>
              <Text style={st.statV}>{v}</Text>
            </View>
          ))}
        </View>
      </Pressable>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={st.backdrop}>
        <View style={[st.box, wide ? { width: Math.min(width - 40, 1400), height: Math.min(height - 40, 940) } : { width, height, borderRadius: 0 }]} testID="yarn-picker">
          <View style={st.head}>
            <View style={{ flex: 1 }}>
              <Text style={st.eyebrow}>YARN MASTER</Text>
              <Text style={st.h1}>Select a yarn</Text>
              <Text style={st.muted} numberOfLines={2}>{selected ? `Selected: ${selected.name} (#${selected.itmcode})` : 'Tap one yarn — every detail of it goes to the AI.'}</Text>
            </View>
            <Pressable onPress={onClose} style={st.close} accessibilityLabel="Close"><Icon name="close" size={20} color={T.ink} /></Pressable>
          </View>
          <View style={st.tools}>
            <View style={st.search}>
              <Icon name="search" size={18} color={T.muted} />
              <TextInput value={q} onChangeText={setQ} placeholder="Search yarn name / code / count / blend…" placeholderTextColor={T.muted} style={st.searchIn} accessibilityLabel="Search yarns" />
              {q ? <TouchableOpacity onPress={() => setQ('')}><Icon name="close" size={16} color={T.muted} /></TouchableOpacity> : null}
            </View>
            <View style={st.kinds}>
              {([['', `All · ${all.length}`], ['Spun', `Spun · ${nSpun}`], ['Filament', `Filament · ${all.length - nSpun}`]] as const).map(([k, l]) => (
                <TouchableOpacity key={k || 'all'} onPress={() => setKind(k)} style={[st.kind, kind === k && st.kindOn]} accessibilityRole="button">
                  <Text style={[st.kindT, kind === k && { color: '#fff' }]}>{l}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {loading ? <View style={st.center}><ActivityIndicator color={T.copper} /><Text style={st.muted}>Loading the yarn master…</Text></View> : null}
          {error && !loading ? (
            <View style={st.center}>
              <Text style={{ color: T.red, textAlign: 'center' }}>{error}</Text>
              <TouchableOpacity onPress={onReload} style={st.retry}><Icon name="refresh" size={16} color={T.copper} /><Text style={st.retryT}>Try again</Text></TouchableOpacity>
            </View>
          ) : null}

          {!loading && !error && master ? (
            <View style={{ flex: 1, minHeight: 0 }}>
              {wide ? (
                <View style={st.tHead}>
                  <View style={{ width: 24 }} />
                  {COLS.map(([l, f]) => <Text key={l} style={[st.th, { flex: f }]}>{l.toUpperCase()}</Text>)}
                </View>
              ) : null}
              <FlatList
                style={{ flex: 1, minHeight: 0 }}
                data={rows}
                keyExtractor={(y) => y.itmcode}
                renderItem={wide ? tableRow : card}
                contentContainerStyle={wide ? undefined : { padding: 10, gap: 8 }}
                initialNumToRender={30}
                windowSize={11}
                keyboardShouldPersistTaps="handled"
                ListEmptyComponent={<Text style={[st.muted, { textAlign: 'center', padding: 24 }]}>{q ? 'No yarn matches.' : 'No yarns in the master.'}</Text>}
              />
            </View>
          ) : null}

          <View style={st.foot}>
            <Text style={[st.muted, { flex: 1 }]} numberOfLines={2}>{selected ? `${selected.name} · #${selected.itmcode} · ${selected.kind}` : `${rows.length} yarn${rows.length !== 1 ? 's' : ''} shown · nothing selected yet`}</Text>
            <TouchableOpacity onPress={onClose} style={st.done} accessibilityRole="button" accessibilityLabel="Done">
              <Text style={st.doneT}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const st = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.55)', alignItems: 'center', justifyContent: 'center' },
  box: { backgroundColor: T.bg, borderRadius: 16, overflow: 'hidden', flexDirection: 'column' },
  head: { flexDirection: 'row', gap: 10, padding: 14, paddingBottom: 8, backgroundColor: '#fff' },
  eyebrow: { color: T.copper, fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  h1: { color: T.ink, fontSize: 17, fontWeight: '800', marginTop: 1 },
  muted: { color: T.muted, fontSize: 12 },
  close: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: T.sub },
  tools: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingBottom: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: T.border },
  search: { flexGrow: 1, flexBasis: 260, flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: T.border, borderRadius: 10, paddingHorizontal: 10, backgroundColor: T.sub },
  searchIn: { flex: 1, paddingVertical: 10, fontSize: 14, color: T.ink },
  kinds: { flexDirection: 'row', gap: 6 },
  kind: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 18, borderWidth: 1, borderColor: T.border, backgroundColor: '#fff' },
  kindOn: { backgroundColor: T.ink, borderColor: T.ink },
  kindT: { fontSize: 12, fontWeight: '800', color: T.ink },
  center: { alignItems: 'center', gap: 10, padding: 30 },
  retry: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderColor: T.copper, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7 },
  retryT: { fontSize: 12, fontWeight: '800', color: T.copper },
  // wide: table
  tHead: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, backgroundColor: T.sub, borderBottomWidth: 1, borderBottomColor: T.border },
  th: { fontSize: 10, fontWeight: '800', color: T.muted, letterSpacing: 0.5, paddingRight: 8 },
  tRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: T.border },
  cell: { fontSize: 12.5, color: T.ink, paddingRight: 8 },
  rowOn: { backgroundColor: '#FBF1E6', borderColor: T.copper },
  name: { fontSize: 13.5, fontWeight: '800', color: T.ink },
  code: { fontSize: 11, color: T.muted, marginTop: 1 },
  // phone: cards
  card: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: T.border, padding: 12, gap: 8 },
  cardTop: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  badge: { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2, backgroundColor: T.sub },
  badgeF: { backgroundColor: '#EFE7F5' },
  badgeT: { fontSize: 9.5, fontWeight: '800', color: T.muted },
  stats: { flexDirection: 'row', flexWrap: 'wrap', backgroundColor: T.sub, borderRadius: 8, padding: 8, rowGap: 6 },
  stat: { flexBasis: '33%', paddingRight: 6 },
  statK: { fontSize: 9, fontWeight: '800', color: T.muted, letterSpacing: 0.4 },
  statV: { fontSize: 12.5, fontWeight: '700', color: T.ink, marginTop: 1 },
  foot: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: T.border },
  done: { backgroundColor: T.ink, borderRadius: 10, paddingHorizontal: 22, paddingVertical: 11 },
  doneT: { color: '#fff', fontWeight: '800', fontSize: 13.5 },
});
