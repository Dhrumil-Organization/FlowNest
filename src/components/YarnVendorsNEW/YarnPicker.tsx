// ─────────────────────────────────────────────────────────────
// FILE: src/components/YarnVendorsNEW/YarnPicker.tsx
//
// Select yarns for the vendor search from the ERP yarn master — laid out like Designs → Yarns:
//   Spun / Filament → blend (folder) → ply → item cards (Blend, Count, Count Type, Ply, Other; filament also Type,
//   Lustre, Denier) → "Sub items" opens the item's sub items, each selectable on its own.
// Data: GET /api/yarn-vendors-yarns (./api.ts loadYarnMaster) — main items + sub items in one call.
// The parent keeps the selection; the backend reads every selected yarn's details again from the master.
// ─────────────────────────────────────────────────────────────
import { T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { Yarn, YarnMaster } from './api';

type Props = {
  visible: boolean;
  master: YarnMaster | null;
  loading: boolean;
  error: string;
  onReload: () => void;
  selected: Yarn[];
  /** how many more can be added (typed items count too) */
  room: number;
  onToggle: (y: Yarn) => void;
  onClose: () => void;
};

const norm = (v: string) => String(v || '').toLowerCase().replace(/\s+/g, ' ').trim();
const textOf = (y: Yarn) => norm([y.name, y.itmcode, y.blend_label, y.count, y.count_type, y.ply, y.denier, y.filament_type, y.lustre, y.other].join(' '));
const title = (s: string) => s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
const blendGroup = (y: Yarn) => (y.blend.length ? y.blend.map((b) => title(b.name)).join(' ') : 'Unknown');

/** the detail rows of a yarn (same as the Yarns card; filament adds type / lustre / denier) */
export function yarnStats(y: Yarn): [string, string][] {
  const rows: [string, string][] = [
    ['Blend', y.blend_label || '-'],
    ['Count', y.count || '-'],
    ['Count type', y.count_type || '-'],
    ['Ply', y.ply || '-'],
  ];
  if (y.kind === 'Filament' || y.filament_type || y.lustre) {
    rows.push(['Type', y.filament_type || '-'], ['Lustre', y.lustre || '-'], ['Denier', y.denier || '-']);
  } else if (y.denier) {
    rows.push(['Denier', y.denier]);
  }
  rows.push(['Other', y.other || '-']);
  return rows;
}

export function YarnPicker({ visible, master, loading, error, onReload, selected, room, onToggle, onClose }: Props) {
  const { width, height } = useWindowDimensions();
  const phone = width < 768;
  const cols = width >= 1100 ? 3 : width >= 700 ? 2 : 1;
  const [tab, setTab] = useState<'spun' | 'filament'>('spun');
  const [q, setQ] = useState('');
  const [openG, setOpenG] = useState<Record<string, boolean>>({});
  const [openP, setOpenP] = useState<Record<string, boolean>>({});
  const [openSub, setOpenSub] = useState<Record<string, boolean>>({});
  useEffect(() => { if (visible) setQ(''); }, [visible]);

  const isSel = (y: Yarn) => selected.some((x) => x.itmcode === y.itmcode);
  const list = master ? master[tab] : [];
  const query = norm(q);
  // a main item is shown when it or one of its sub items matches; matching sub items open by themselves
  const shown = useMemo(() => (query ? list.filter((y) => textOf(y).includes(query) || y.subs.some((x) => textOf(x).includes(query))) : list), [list, query]);
  const groups = useMemo(() => {
    const m = new Map<string, Map<string, Yarn[]>>();
    shown.forEach((y) => {
      const g = blendGroup(y);
      if (!m.has(g)) m.set(g, new Map());
      const ply = y.ply || '-';
      const pm = m.get(g)!;
      if (!pm.has(ply)) pm.set(ply, []);
      pm.get(ply)!.push(y);
    });
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]))
      .map(([g, pm]) => ({ g, total: [...pm.values()].reduce((t, l) => t + l.length, 0), plys: [...pm.entries()].sort((a, b) => Number(a[0]) - Number(b[0]) || a[0].localeCompare(b[0])) }));
  }, [shown]);
  const many = groups.length <= 3 || !!query;   // a search or a short list opens everything

  const card = (y: Yarn, sub = false) => {
    const on = isSel(y);
    const full = !on && room <= 0;
    const subOpen = openSub[y.itmcode] || (!!query && y.subs.some((x) => textOf(x).includes(query)));
    return (
      <View key={y.itmcode} style={[st.card, on && st.cardOn, sub && st.subCard, cols > 1 && !sub && { width: `${100 / cols - 1.5}%` as any }]}>
        <View style={st.cardTop}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={st.cardTitle} numberOfLines={2}>{y.name}</Text>
            <Text style={st.code}>#{y.itmcode}</Text>
          </View>
          <View style={st.badge}><Text style={st.badgeT}>{sub ? 'SUB ITEM' : y.kind === 'Filament' ? 'FILAMENT' : 'SPUN'}</Text></View>
        </View>
        <View style={st.stats}>
          {yarnStats(y).map(([k, v]) => (
            <View key={k} style={[st.stat, k === 'Blend' || k === 'Other' ? { flexBasis: '100%' } : null]}>
              <Text style={st.statK}>{k.toUpperCase()}</Text>
              <Text style={st.statV} numberOfLines={2}>{v}</Text>
            </View>
          ))}
        </View>
        <View style={st.actions}>
          <TouchableOpacity onPress={() => onToggle(y)} disabled={full} style={[st.btn, on ? st.btnOn : null, full && { opacity: 0.45 }]} accessibilityRole="button" accessibilityLabel={`${on ? 'Remove' : 'Select'} ${y.name}`}>
            <Icon name={on ? 'check-circle' : 'add-circle-outline'} size={16} color={on ? '#fff' : T.copper} />
            <Text style={[st.btnT, on && { color: '#fff' }]}>{on ? 'Selected' : full ? 'Limit reached' : 'Select'}</Text>
          </TouchableOpacity>
          {!sub && y.subs.length ? (
            <TouchableOpacity onPress={() => setOpenSub((p) => ({ ...p, [y.itmcode]: !subOpen }))} style={st.btn} accessibilityRole="button" accessibilityLabel={`Sub items of ${y.name}`}>
              <Icon name="account-tree" size={15} color={T.ink} />
              <Text style={[st.btnT, { color: T.ink }]}>Sub items ({y.subs.length})</Text>
              <Icon name={subOpen ? 'expand-less' : 'expand-more'} size={16} color={T.muted} />
            </TouchableOpacity>
          ) : null}
        </View>
        {!sub && subOpen ? <View style={{ gap: 8, marginTop: 8 }}>{y.subs.map((x) => card(x, true))}</View> : null}
      </View>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={st.backdrop}>
        <View style={[st.box, phone ? { width: '100%', height: '100%', borderRadius: 0 } : { width: Math.min(width - 40, 1180), height: Math.min(height - 40, 900) }]} testID="yarn-picker">
          <View style={st.head}>
            <View style={{ flex: 1 }}>
              <Text style={st.eyebrow}>YARN MASTER · DESIGNS → YARNS</Text>
              <Text style={st.h1}>Select yarns for the vendor search</Text>
              <Text style={st.muted}>{selected.length} selected · {room > 0 ? `${room} more can be added` : 'limit reached'} — every detail of a selected yarn goes to the AI.</Text>
            </View>
            <Pressable onPress={onClose} style={st.close} accessibilityLabel="Close"><Icon name="close" size={20} color={T.ink} /></Pressable>
          </View>
          <View style={st.tools}>
            <View style={st.seg}>
              {(['spun', 'filament'] as const).map((k) => (
                <TouchableOpacity key={k} onPress={() => setTab(k)} style={[st.segBtn, tab === k && st.segOn]} accessibilityRole="button">
                  <Text style={[st.segT, tab === k && { color: T.copper }]}>{k === 'spun' ? 'Spun' : 'Filament'}{master ? ` · ${master[k].length}` : ''}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={st.search}>
              <Icon name="search" size={18} color={T.muted} />
              <TextInput value={q} onChangeText={setQ} placeholder="Search yarn name / code / count / blend…" placeholderTextColor={T.muted} style={st.searchIn} accessibilityLabel="Search yarns" />
              {q ? <TouchableOpacity onPress={() => setQ('')}><Icon name="close" size={16} color={T.muted} /></TouchableOpacity> : null}
            </View>
          </View>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 14, gap: 10 }} keyboardShouldPersistTaps="handled">
            {loading ? <View style={st.center}><ActivityIndicator color={T.copper} /><Text style={st.muted}>Loading the yarn master…</Text></View> : null}
            {error && !loading ? (
              <View style={st.center}>
                <Text style={{ color: T.red, textAlign: 'center' }}>{error}</Text>
                <TouchableOpacity onPress={onReload} style={st.btn}><Icon name="refresh" size={16} color={T.copper} /><Text style={st.btnT}>Try again</Text></TouchableOpacity>
              </View>
            ) : null}
            {!loading && !error && master && !groups.length ? <Text style={[st.muted, { textAlign: 'center', padding: 20 }]}>{query ? 'No yarn matches.' : 'No yarns in the master.'}</Text> : null}
            {groups.map(({ g, total, plys }) => {
              const gOpen = openG[g] ?? many;
              return (
                <View key={g} style={[st.group, gOpen && st.groupOpen]}>
                  <Pressable onPress={() => setOpenG((p) => ({ ...p, [g]: !gOpen }))} style={st.gHead} accessibilityRole="button" accessibilityLabel={g}>
                    <View style={st.gIcon}><Icon name="folder-open" size={18} color={T.copper} /></View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={st.gTitle} numberOfLines={1}>{g.toUpperCase()}</Text>
                      <Text style={st.muted}>BLEND · {plys.length} ply · {total} item{total !== 1 ? 's' : ''}</Text>
                    </View>
                    <Text style={st.count}>{total}</Text>
                    <Icon name={gOpen ? 'expand-less' : 'expand-more'} size={22} color={T.copper} />
                  </Pressable>
                  {gOpen ? plys.map(([ply, items]) => {
                    const pk = g + '|' + ply;
                    const pOpen = openP[pk] ?? true;
                    return (
                      <View key={pk}>
                        <Pressable onPress={() => setOpenP((p) => ({ ...p, [pk]: !pOpen }))} style={st.pHead} accessibilityRole="button" accessibilityLabel={`Ply ${ply}`}>
                          <View style={st.pDot}><Text style={st.pDotT}>{ply}</Text></View>
                          <View style={{ flex: 1 }}><Text style={st.pTitle}>PLY {ply}</Text><Text style={st.muted}>{items.length} item{items.length !== 1 ? 's' : ''}</Text></View>
                          <Text style={st.count}>{items.length}</Text>
                          <Icon name={pOpen ? 'expand-less' : 'expand-more'} size={22} color={T.copper} />
                        </Pressable>
                        {pOpen ? <View style={st.grid}>{items.map((y) => card(y))}</View> : null}
                      </View>
                    );
                  }) : null}
                </View>
              );
            })}
          </ScrollView>
          <View style={st.foot}>
            <Text style={[st.muted, { flex: 1 }]} numberOfLines={2}>{selected.map((y) => y.name).join(' · ') || 'Nothing selected yet.'}</Text>
            <TouchableOpacity onPress={onClose} style={st.done} accessibilityRole="button" accessibilityLabel="Done">
              <Text style={st.doneT}>Done{selected.length ? ` · ${selected.length}` : ''}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const st = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.55)', alignItems: 'center', justifyContent: 'center' },
  box: { backgroundColor: T.bg || '#F6F3EE', borderRadius: 16, overflow: 'hidden' },
  head: { flexDirection: 'row', gap: 10, padding: 14, paddingBottom: 8, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: T.border },
  eyebrow: { color: T.copper, fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  h1: { color: T.ink, fontSize: 16, fontWeight: '800', marginTop: 2 },
  muted: { color: T.muted, fontSize: 11.5 },
  close: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: T.sub },
  tools: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, padding: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: T.border },
  seg: { flexDirection: 'row', gap: 4 },
  segBtn: { paddingHorizontal: 14, paddingVertical: 8, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  segOn: { borderBottomColor: T.copper },
  segT: { fontWeight: '800', color: T.muted, fontSize: 13 },
  search: { flex: 1, minWidth: 220, flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: T.border, borderRadius: 10, paddingHorizontal: 10, backgroundColor: T.sub },
  searchIn: { flex: 1, paddingVertical: 9, fontSize: 13, color: T.ink },
  center: { alignItems: 'center', gap: 10, padding: 24 },
  group: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: T.border, overflow: 'hidden' },
  groupOpen: { borderLeftWidth: 3, borderLeftColor: T.copper },
  gHead: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12 },
  gIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: T.sub, alignItems: 'center', justifyContent: 'center' },
  gTitle: { fontSize: 14, fontWeight: '800', color: T.ink },
  count: { minWidth: 26, textAlign: 'center', fontSize: 11.5, fontWeight: '800', color: T.copper, backgroundColor: T.sub, borderRadius: 12, paddingHorizontal: 7, paddingVertical: 2 },
  pHead: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 9, backgroundColor: T.sub, borderTopWidth: 1, borderTopColor: T.border },
  pDot: { width: 26, height: 26, borderRadius: 13, backgroundColor: T.copper, alignItems: 'center', justifyContent: 'center' },
  pDotT: { color: '#fff', fontWeight: '800', fontSize: 11 },
  pTitle: { fontWeight: '800', color: T.ink, fontSize: 12.5 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, padding: 12 },
  card: { flexGrow: 1, flexBasis: 260, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: T.border, padding: 12, gap: 8 },
  cardOn: { borderColor: T.copper, borderWidth: 2 },
  subCard: { backgroundColor: T.sub, flexBasis: 'auto' },
  cardTop: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  cardTitle: { fontSize: 13.5, fontWeight: '800', color: T.ink },
  code: { fontSize: 11, color: T.muted, marginTop: 2 },
  badge: { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2, backgroundColor: T.sub },
  badgeT: { fontSize: 9.5, fontWeight: '800', color: T.muted },
  stats: { flexDirection: 'row', flexWrap: 'wrap', backgroundColor: T.sub, borderRadius: 8, padding: 8, rowGap: 6 },
  stat: { flexBasis: '33%', paddingRight: 6 },
  statK: { fontSize: 9, fontWeight: '800', color: T.muted, letterSpacing: 0.4 },
  statV: { fontSize: 12, fontWeight: '700', color: T.ink, marginTop: 1 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  btn: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderColor: T.border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7, backgroundColor: '#fff' },
  btnOn: { backgroundColor: T.copper, borderColor: T.copper },
  btnT: { fontSize: 12, fontWeight: '800', color: T.copper },
  foot: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: T.border },
  done: { backgroundColor: T.ink, borderRadius: 10, paddingHorizontal: 22, paddingVertical: 11 },
  doneT: { color: '#fff', fontWeight: '800', fontSize: 13.5 },
});
