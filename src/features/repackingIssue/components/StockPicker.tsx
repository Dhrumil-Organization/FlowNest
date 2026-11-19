// FILE: src/features/repackingIssue/components/StockPicker.tsx
// "Pick from stock": cartons with balance for the item's Item / Merge / Grade / Shade (getcartondetail).
// Multi-select, search, select-all of the free cartons. Locked cartons show their reason and can't be picked.
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { fmt3 } from '../logic';
import { C, LABEL, R, SP } from '../theme';
import { StockCarton } from '../types';
import { Sheet } from './Sheet';
import { Btn, Input, Stat } from './ui';

export interface StockState {
  /** null = Item / Merge / Grade / Shade not chosen yet */
  rows: StockCarton[] | null;
  loading: boolean;
  error: string;
  reload: () => void;
}

export function StockPicker({ visible, stock, used, onAdd, onClose }: {
  visible: boolean;
  stock: StockState;
  /** carton nos already in this voucher (upper-case) */
  used: Set<string>;
  onAdd: (rows: StockCarton[]) => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState('');
  const [picked, setPicked] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (visible) { setQ(''); setPicked(new Set()); }
  }, [visible]);

  const free = useMemo(
    () => (stock.rows ?? []).filter(r => !used.has(r.cartNo.toUpperCase())),
    [stock.rows, used]
  );
  const shown = useMemo(() => {
    const s = q.trim().toUpperCase();
    return s ? free.filter(r => r.cartNo.toUpperCase().includes(s) || r.tranName.toUpperCase().includes(s)) : free;
  }, [free, q]);
  const selectable = shown.filter(r => !r.locked);
  const allOn = selectable.length > 0 && selectable.every(r => picked.has(r.cartNo));

  const toggle = (r: StockCarton) => {
    if (r.locked) return;
    setPicked(p => {
      const n = new Set(p);
      n.has(r.cartNo) ? n.delete(r.cartNo) : n.add(r.cartNo);
      return n;
    });
  };
  const toggleAll = () =>
    setPicked(p => {
      const n = new Set(p);
      selectable.forEach(r => (allOn ? n.delete(r.cartNo) : n.add(r.cartNo)));
      return n;
    });

  const sel = free.filter(r => picked.has(r.cartNo));
  const totQty = sel.reduce((a, r) => a + (r.source.qty ?? 0), 0);
  const totWt = sel.reduce((a, r) => a + (r.source.wt ?? 0), 0);

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Pick from stock"
      subtitle={stock.rows ? `${free.length} carton(s) available` : 'Stock'}
      maxWidth={760}
      footer={
        <>
          <View style={{ flexDirection: 'row', flex: 1 }}>
            <Stat label="Selected" value={String(sel.length)} />
            <Stat label="Qty" value={fmt3(totQty)} strong />
            <Stat label="Weight" value={fmt3(totWt)} />
          </View>
          <Btn title={sel.length ? `Add ${sel.length}` : 'Add'} icon="playlist-add" onPress={() => onAdd(sel)} disabled={!sel.length} style={{ minWidth: 120 }} />
        </>
      }>
      <View style={st.tools}>
        <View style={{ flex: 1 }}>
          <Input value={q} onChangeText={setQ} placeholder="Search carton no." autoCapitalize="characters" style={{ paddingLeft: 36 }} />
          <Icon name="search" size={20} color={C.muted} style={st.searchIcon} />
        </View>
        <Pressable onPress={toggleAll} style={st.allBtn} disabled={!selectable.length} accessibilityRole="checkbox" accessibilityState={{ checked: allOn }}>
          <Icon name={allOn ? 'check-box' : 'check-box-outline-blank'} size={22} color={selectable.length ? C.nav : C.muted} />
          <Text style={st.allTxt}>All</Text>
        </Pressable>
        <Pressable onPress={stock.reload} style={st.iconBtn} accessibilityLabel="Reload stock" disabled={stock.loading}>
          {stock.loading ? <ActivityIndicator color={C.cta} /> : <Icon name="refresh" size={22} color={C.nav} />}
        </Pressable>
      </View>

      <View style={[st.tr, st.th]}>
        <View style={st.c0} />
        <Text style={[st.c1, st.thTxt]}>Carton No</Text>
        <Text style={[st.c2, st.thTxt]}>Qty</Text>
        <Text style={[st.c2, st.thTxt]}>Weight</Text>
      </View>

      <FlatList
        data={shown}
        keyExtractor={r => `${r.source.trantype}-${r.source.puid}-${r.source.psrno}-${r.source.psubsr}`}
        keyboardShouldPersistTaps="handled"
        initialNumToRender={30}
        renderItem={({ item: r, index }) => {
          const on = picked.has(r.cartNo);
          return (
            <Pressable onPress={() => toggle(r)} style={[st.tr, index % 2 === 1 && st.alt, on && st.on, r.locked && { opacity: 0.55 }]} accessibilityRole="checkbox" accessibilityState={{ checked: on, disabled: r.locked }}>
              <View style={st.c0}>
                <Icon name={r.locked ? 'lock' : on ? 'check-box' : 'check-box-outline-blank'} size={20} color={r.locked ? C.danger : on ? C.cta : C.muted} />
              </View>
              <View style={[st.c1, { minWidth: 0 }]}>
                <Text style={st.cart} numberOfLines={1}>{r.cartNo}</Text>
                <Text style={[st.sub, r.locked && { color: C.danger }]} numberOfLines={1}>{r.locked ? r.lockReason || 'Locked' : r.tranName}</Text>
              </View>
              <Text style={[st.c2, st.num]}>{fmt3(r.source.qty ?? 0)}</Text>
              <Text style={[st.c2, st.num]}>{fmt3(r.source.wt ?? 0)}</Text>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <View style={st.state}>
            {stock.loading ? <ActivityIndicator color={C.cta} size="large" /> : (
              <>
                <Icon name={stock.error ? 'cloud-off' : 'inventory-2'} size={32} color={stock.error ? C.danger : C.muted} />
                <Text style={st.stateTxt}>{stock.error || (q ? 'No carton matches' : 'No stock for this item / merge / grade / shade')}</Text>
              </>
            )}
          </View>
        }
      />
    </Sheet>
  );
}

const st = StyleSheet.create({
  tools: { flexDirection: 'row', alignItems: 'center', gap: SP.sm, padding: SP.md },
  searchIcon: { position: 'absolute', left: 10, top: 12 },
  allBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: C.line, borderRadius: R.sm, paddingHorizontal: SP.sm, minHeight: 44, backgroundColor: C.card },
  allTxt: { fontSize: 13, fontWeight: '800', color: C.nav },
  iconBtn: { width: 44, height: 44, borderRadius: R.sm, borderWidth: 1, borderColor: C.line, alignItems: 'center', justifyContent: 'center', backgroundColor: C.card },
  tr: { flexDirection: 'row', alignItems: 'center', minHeight: 50, paddingHorizontal: SP.md, borderBottomWidth: 1, borderColor: C.hair, backgroundColor: C.card },
  th: { backgroundColor: C.nav, minHeight: 34, borderBottomWidth: 0 },
  thTxt: { ...LABEL, color: C.onNav },
  alt: { backgroundColor: C.quiet },
  on: { backgroundColor: C.ctaSoft },
  c0: { width: 32 },
  c1: { flex: 1.5 },
  c2: { flex: 1, textAlign: 'right' },
  cart: { fontSize: 14, fontWeight: '800', color: C.ink, fontVariant: ['tabular-nums'] },
  sub: { fontSize: 11, color: C.muted, marginTop: 2 },
  num: { fontSize: 14, color: C.ink, fontVariant: ['tabular-nums'] },
  state: { alignItems: 'center', gap: SP.sm, paddingVertical: 48, paddingHorizontal: SP.lg },
  stateTxt: { fontSize: 14, color: C.muted, textAlign: 'center' },
});
