import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert, KeyboardAvoidingView, LayoutChangeEvent, Modal, Platform, Pressable,
  ScrollView, Text, TextInput, View,
} from 'react-native';
import axios from 'axios';

/* ───────────────────────── Types ───────────────────────── */
type Line = { id: string; itemCode: string; itemName: string; uom: string; qty: string; balance: string };
type Entry = {
  id: string; processNo: string; process: string; batchNo: string; date: string; machine: string; slipNo: string;
  item: string; shade: string; shadeRecipe: string; pcs: string; weight: string; litres: string; shift: string;
  startTime: string; actualWeight: string; processRecipe: string; lines: Line[];
};
type ProcessOpt = { processNo: string; name: string; date: string; machine: string; slipNo: string; item: string; shade: string; pcs: string; weight: string; litres: string; lines?: Line[] };
type RecipeOpt = { code: string; name: string };
type ItemOpt = { code: string; name: string; uom: string; balance: string };
type PickItem = { key: string; title: string; sub?: string; tag?: string };

const emptyEntry = (): Entry => ({
  id: String(Date.now()), processNo: '', process: '', batchNo: '', date: new Date().toLocaleDateString('en-GB'),
  machine: '', slipNo: '', item: '', shade: '', shadeRecipe: '', pcs: '', weight: '', litres: '', shift: '',
  startTime: '', actualWeight: '', processRecipe: '', lines: [],
});

/* ───────── Demo / fallback data (used only if API is not reachable) ───────── */
const DEMO: Entry[] = [
  { ...emptyEntry(), id: '1', processNo: '11/01996', process: 'DYEING PROCESSING', batchNo: '11/09551', date: '02/11/2026', machine: 'DYG1', slipNo: '11/01996', item: '10772 · VISCOS SILK PLUS', shade: 'A-502/R.BLUE', pcs: '176', weight: '100.000', actualWeight: '100.000', processRecipe: '103 · SENSETIVE (212K)', shadeRecipe: 'A-502/R.BLUE',
    lines: [{ id: '1', itemCode: '', itemName: 'ACETIC ACID GNFC', uom: 'GMS', qty: '50.000', balance: '2868.100' }] },
  { ...emptyEntry(), id: '2', processNo: '04/01913', process: 'DYEING PROCESSING', batchNo: '11/09661', date: '23/04/2026', machine: 'DYG13', slipNo: '11/59665', item: '***', shade: 'WASH', pcs: '0', weight: '10.000', actualWeight: '10.000', lines: [] },
];
const DEMO_PROCESS: ProcessOpt[] = DEMO.map(e => ({ processNo: e.processNo, name: e.process, date: e.date, machine: e.machine, slipNo: e.slipNo, item: e.item, shade: e.shade, pcs: e.pcs, weight: e.weight, litres: e.litres, lines: e.lines }));
const DEMO_RECIPES: RecipeOpt[] = [{ code: '103', name: 'SENSETIVE (212K)' }, { code: '104', name: 'CATIONIC DARK' }, { code: '105', name: 'CAT/POLY' }];
const DEMO_ITEMS: ItemOpt[] = [
  { code: 'C001', name: 'ACETIC ACID GNFC', uom: 'GMS', balance: '2868.100' },
  { code: 'C002', name: 'SODA ASH LIGHT', uom: 'KGS', balance: '540.000' },
  { code: 'C003', name: 'GLAUBER SALT', uom: 'KGS', balance: '1250.500' },
];

/* ───────────────────────── Theme ───────────────────────── */
const palette = (dark: boolean) => dark ? {
  bg: '#0e1b2a', card: '#14263a', cardAlt: '#10202f', border: '#24394f', text: '#e8eef5', sub: '#9db0c3', muted: '#6f8499',
  input: '#0e1b2a', disabled: '#18293b', accent: '#c9803f', accentSoft: '#3a2a1c', accentText: '#e3a062',
  navy: '#2a4a68', hero: '#0a1624', danger: '#e56b6b', dangerBorder: '#5a2e34', overlay: 'rgba(3,10,18,0.65)',
} : {
  bg: '#f4f6f8', card: '#ffffff', cardAlt: '#f6f8fa', border: '#e0e6ec', text: '#17283b', sub: '#5d6f82', muted: '#8a97a5',
  input: '#ffffff', disabled: '#f1f3f5', accent: '#c47735', accentSoft: '#fff3e8', accentText: '#b86e2c',
  navy: '#1c354d', hero: '#10243a', danger: '#c44747', dangerBorder: '#efcaca', overlay: 'rgba(10,20,32,0.5)',
};
type Pal = ReturnType<typeof palette>;
const web = Platform.OS === 'web';
const notify = (t: string, m: string) => { if (web) window.alert(`${t}\n${m}`); else Alert.alert(t, m); };
const noOutline = web ? ({ outlineStyle: 'none' } as any) : null;

/* ───────────────────────── UI parts (OUTSIDE the screen so inputs keep focus) ───────────────────────── */
const Input = ({ c, style, ...rest }: any) => {
  const [focus, setFocus] = useState(false);
  return (
    <TextInput
      {...rest}
      placeholderTextColor={c.muted}
      onFocus={(e: any) => { setFocus(true); rest.onFocus?.(e); }}
      onBlur={(e: any) => { setFocus(false); rest.onBlur?.(e); }}
      style={[{ minHeight: 44, borderWidth: 1, borderRadius: 11, paddingHorizontal: 12, paddingVertical: 9, fontSize: 14, color: c.text,
        backgroundColor: c.input, borderColor: focus ? c.accent : c.border }, noOutline, style]}
    />
  );
};

const Btn = ({ c, label, onPress, kind = 'ghost', style }: { c: Pal; label: string; onPress: () => void; kind?: 'primary' | 'navy' | 'ghost' | 'danger'; style?: any }) => {
  const bg = kind === 'primary' ? c.accent : kind === 'navy' ? c.navy : 'transparent';
  const border = kind === 'danger' ? c.dangerBorder : kind === 'ghost' ? c.border : 'transparent';
  const color = kind === 'primary' || kind === 'navy' ? '#fff' : kind === 'danger' ? c.danger : c.sub;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [{ minHeight: 46, paddingHorizontal: 18, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
      backgroundColor: bg, borderWidth: 1, borderColor: border, opacity: pressed ? 0.8 : 1 }, style]}>
      <Text style={{ color, fontWeight: '800', fontSize: 13 }}>{label}</Text>
    </Pressable>
  );
};

/** Looks like a dropdown: tap anywhere on it to open the list */
const SelectBox = ({ c, label, value, placeholder, onPress, disabled, width }: { c: Pal; label: string; value: string; placeholder: string; onPress: () => void; disabled?: boolean; width: number | string }) => (
  <View style={{ width: width as any, gap: 5 }}>
    <Text style={{ fontSize: 11, fontWeight: '700', color: c.sub }}>{label}</Text>
    <Pressable onPress={onPress} disabled={disabled} style={({ pressed, hovered }: any) => ({
      minHeight: 46, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1,
      borderColor: hovered && !disabled ? c.accent : c.border, backgroundColor: disabled ? c.disabled : c.input, opacity: pressed ? 0.85 : 1 })}>
      <Text numberOfLines={1} style={{ flex: 1, fontSize: 14, fontWeight: value ? '700' : '400', color: value ? c.text : c.muted }}>{value || placeholder}</Text>
      {!disabled && <Text style={{ color: c.accent, fontSize: 13, fontWeight: '800' }}>▾</Text>}
    </Pressable>
  </View>
);

/** Read-only value (auto-filled from the process) */
const Info = ({ c, label, value, width }: { c: Pal; label: string; value: string; width: number | string }) => (
  <View style={{ width: width as any, backgroundColor: c.cardAlt, borderWidth: 1, borderColor: c.border, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9, gap: 3 }}>
    <Text style={{ fontSize: 11, fontWeight: '700', color: c.muted }}>{label}</Text>
    <Text numberOfLines={2} style={{ fontSize: 14, fontWeight: '700', color: value ? c.text : c.muted }}>{value || '—'}</Text>
  </View>
);

const Stat = ({ c, label, value, children, width, accent }: { c: Pal; label: string; value?: string; children?: React.ReactNode; width: number | string; accent?: boolean }) => (
  <View style={{ width: width as any, backgroundColor: accent ? c.accentSoft : c.cardAlt, borderWidth: 1, borderColor: accent ? c.accent : c.border, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9, gap: 2 }}>
    <Text style={{ fontSize: 11, fontWeight: '700', color: accent ? c.accentText : c.muted }}>{label}</Text>
    {children ?? <Text style={{ fontSize: 20, fontWeight: '800', color: c.text }}>{value || '—'}</Text>}
  </View>
);

/* ───────── Dropdown list (Process No., Process Recipe, Item) ───────── */
function PickerSheet({ c, visible, title, items, loading, wide, onSelect, onClose }: {
  c: Pal; visible: boolean; title: string; items: PickItem[]; loading?: boolean; wide: boolean; onSelect: (key: string) => void; onClose: () => void;
}) {
  const [q, setQ] = useState('');
  useEffect(() => { if (visible) setQ(''); }, [visible]);
  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    return t ? items.filter(i => `${i.title} ${i.sub ?? ''} ${i.tag ?? ''}`.toLowerCase().includes(t)) : items;
  }, [q, items]);
  return (
    <Modal visible={visible} transparent animationType={wide ? 'fade' : 'slide'} onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <Pressable onPress={onClose} style={{ flex: 1, backgroundColor: c.overlay, justifyContent: wide ? 'center' : 'flex-end', alignItems: 'center' }}>
          <Pressable onPress={() => {}} style={{ width: '100%', maxWidth: wide ? 520 : undefined, maxHeight: wide ? '75%' : '82%', backgroundColor: c.card,
            borderTopLeftRadius: 20, borderTopRightRadius: 20, borderBottomLeftRadius: wide ? 20 : 0, borderBottomRightRadius: wide ? 20 : 0,
            padding: 16, gap: 12, borderWidth: 1, borderColor: c.border }}>
            {!wide && <View style={{ alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: c.border }} />}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 16, fontWeight: '800', color: c.text }}>{title}</Text>
              <Pressable onPress={onClose} hitSlop={10}><Text style={{ color: c.muted, fontSize: 13, fontWeight: '700' }}>Close</Text></Pressable>
            </View>
            <Input c={c} value={q} onChangeText={setQ} placeholder="Type to search…" autoFocus={wide} />
            <ScrollView keyboardShouldPersistTaps="handled" style={{ flexGrow: 0 }}>
              {loading && <Text style={{ textAlign: 'center', padding: 20, color: c.muted }}>Loading…</Text>}
              {!loading && !list.length && <Text style={{ textAlign: 'center', padding: 20, color: c.muted }}>Nothing found.</Text>}
              {list.map(i => (
                <Pressable key={i.key} onPress={() => onSelect(i.key)} style={({ pressed, hovered }: any) => ({
                  paddingVertical: 12, paddingHorizontal: 10, borderRadius: 10, gap: 3, backgroundColor: pressed || hovered ? c.accentSoft : 'transparent',
                  borderBottomWidth: 1, borderBottomColor: c.border })}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: c.text, flexShrink: 1 }}>{i.title}</Text>
                    {!!i.tag && <Text style={{ fontSize: 12, color: c.accentText, fontWeight: '700' }}>{i.tag}</Text>}
                  </View>
                  {!!i.sub && <Text style={{ fontSize: 12, color: c.sub }}>{i.sub}</Text>}
                </Pressable>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/* ───────── Browse list = "Material Requisition Help" grid ───────── */
const BROWSE_COLS: [keyof Entry, string, number][] = [
  ['processNo', 'M.R. No', 100], ['date', 'Date', 100], ['batchNo', 'Batch No', 100], ['process', 'Process', 170],
  ['machine', 'Machine', 90], ['shade', 'Shade', 140], ['item', 'Item Name', 170], ['processRecipe', 'Process Recipe', 160], ['shadeRecipe', 'Shade Recipe', 140],
];
function BrowseModal({ c, visible, rows, wide, onPick, onClose }: { c: Pal; visible: boolean; rows: Entry[]; wide: boolean; onPick: (e: Entry) => void; onClose: () => void }) {
  const [q, setQ] = useState('');
  useEffect(() => { if (visible) setQ(''); }, [visible]);
  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    return t ? rows.filter(r => BROWSE_COLS.map(([k]) => String(r[k] ?? '')).join(' ').toLowerCase().includes(t)) : rows;
  }, [q, rows]);
  return (
    <Modal visible={visible} transparent animationType={wide ? 'fade' : 'slide'} onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <Pressable onPress={onClose} style={{ flex: 1, backgroundColor: c.overlay, justifyContent: wide ? 'center' : 'flex-end', alignItems: 'center', padding: wide ? 24 : 0 }}>
          <Pressable onPress={() => {}} style={{ width: '100%', maxWidth: wide ? 1100 : undefined, height: wide ? undefined : '90%', maxHeight: wide ? '85%' : '90%',
            backgroundColor: c.card, borderRadius: wide ? 20 : 0, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16, gap: 12, borderWidth: 1, borderColor: c.border }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 16, fontWeight: '800', color: c.text }}>Material Requisition Help</Text>
              <Pressable onPress={onClose} hitSlop={10}><Text style={{ color: c.muted, fontSize: 13, fontWeight: '700' }}>Close</Text></Pressable>
            </View>
            <Input c={c} value={q} onChangeText={setQ} placeholder="Search M.R. no, batch, machine, shade, item…" />
            {wide ? (
              <ScrollView horizontal style={{ flexGrow: 0 }}>
                <View>
                  <View style={{ flexDirection: 'row', backgroundColor: c.cardAlt, borderBottomWidth: 1, borderColor: c.border }}>
                    {BROWSE_COLS.map(([k, l, w]) => <Text key={k} style={{ width: w, padding: 10, fontSize: 12, fontWeight: '800', color: c.sub }}>{l}</Text>)}
                  </View>
                  <ScrollView style={{ maxHeight: 460 }}>
                    {list.map(r => (
                      <Pressable key={r.id} onPress={() => onPick(r)} style={({ pressed, hovered }: any) => ({ flexDirection: 'row', borderBottomWidth: 1, borderColor: c.border, backgroundColor: pressed || hovered ? c.accentSoft : 'transparent' })}>
                        {BROWSE_COLS.map(([k, , w]) => <Text key={k} numberOfLines={1} style={{ width: w, padding: 10, fontSize: 13, color: c.text }}>{String(r[k] ?? '') || '—'}</Text>)}
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
              </ScrollView>
            ) : (
              <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 8, paddingBottom: 12 }}>
                {list.map(r => (
                  <Pressable key={r.id} onPress={() => onPick(r)} style={({ pressed }) => ({ padding: 12, borderRadius: 12, gap: 4, borderWidth: 1, borderColor: c.border, backgroundColor: pressed ? c.accentSoft : c.cardAlt })}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ fontWeight: '900', color: c.text }}>{r.processNo}</Text>
                      <Text style={{ fontSize: 12, color: c.muted }}>{r.date}</Text>
                    </View>
                    <Text style={{ fontWeight: '700', color: c.text, fontSize: 13 }}>{r.item || '—'}</Text>
                    <Text style={{ fontSize: 12, color: c.sub }}>Batch {r.batchNo || '—'} · {r.machine || '—'} · {r.shade || '—'}</Text>
                    {!!r.processRecipe && <Text style={{ fontSize: 12, color: c.muted }}>{r.processRecipe}</Text>}
                  </Pressable>
                ))}
              </ScrollView>
            )}
            {!list.length && <Text style={{ textAlign: 'center', padding: 20, color: c.muted }}>No requisitions found.</Text>}
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}


/* ───────── Full-page item flow (same pattern as Yarn Sales Order: Select Item → Details) ───────── */
const PageHeader = ({ c, crumb, title, sub, onBack }: { c: Pal; crumb: string; title: string; sub?: string; onBack: () => void }) => (
  <View style={{ backgroundColor: c.card, borderBottomWidth: 1, borderColor: c.border }}>
    <View style={{ width: '100%', maxWidth: 940, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 10 }}>
      <Pressable onPress={onBack} accessibilityLabel="Back" style={({ pressed }) => ({ width: 38, height: 38, borderRadius: 11, backgroundColor: c.cardAlt, borderWidth: 1, borderColor: c.border, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.7 : 1 })}>
        <Text style={{ fontSize: 18, color: c.text, fontWeight: '800' }}>←</Text>
      </Pressable>
      <View style={{ flex: 1 }}>
        <Text numberOfLines={1} style={{ fontSize: 10, fontWeight: '800', color: c.accent }}>{crumb}</Text>
        <Text numberOfLines={1} style={{ fontSize: 17, fontWeight: '800', color: c.text }}>{title}</Text>
        {!!sub && <Text style={{ fontSize: 11, color: c.muted }}>{sub}</Text>}
      </View>
    </View>
  </View>
);

function ItemSelectView({ c, items, loading, selected, availW, onSelect, onBack, onRefresh }: { c: Pal; items: ItemOpt[]; loading: boolean; selected?: string; availW: number; onSelect: (o: ItemOpt) => void; onBack: () => void; onRefresh: () => void }) {
  const [q, setQ] = useState('');
  const t = q.trim().toLowerCase();
  const all = useMemo(() => t ? items.filter(i => `${i.code} ${i.name}`.toLowerCase().includes(t)) : items, [t, items]);
  const list = all.slice(0, 150);                       // keep the page light even with 10k+ items
  const cols = availW < 560 ? 1 : availW < 900 ? 2 : 3;
  const inner = availW - 28;
  const cw = Math.floor((inner - GAP * (cols - 1)) / cols) - 1;
  return (
    <View style={{ flex: 1 }}>
      <PageHeader c={c} crumb="Material Requisition › Items" title="Select Item" sub={`${items.length} items`} onBack={onBack} />
      <View style={{ width: '100%', maxWidth: 940, alignSelf: 'center', flex: 1, padding: 14, gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, backgroundColor: c.card, borderRadius: 12, borderWidth: 1, borderColor: c.border }}>
          <TextInput value={q} onChangeText={setQ} autoFocus={web} placeholder="Search item name or code" placeholderTextColor={c.muted} style={[{ flex: 1, paddingVertical: 12, color: c.text, fontSize: 14 }, noOutline]} />
          <Pressable onPress={onRefresh} hitSlop={8}><Text style={{ color: c.accent, fontSize: 16, fontWeight: '800' }}>↻</Text></Pressable>
        </View>
        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
          {loading && <Text style={{ textAlign: 'center', padding: 20, color: c.muted }}>Loading…</Text>}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: GAP }}>
            {list.map(i => {
              const on = selected === i.name;
              return (
                <Pressable key={i.code || i.name} onPress={() => onSelect(i)} style={({ pressed, hovered }: any) => ({
                  width: cw, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 14, backgroundColor: c.card, borderWidth: 1,
                  borderColor: on || hovered ? c.accent : c.border, opacity: pressed ? 0.85 : 1 })}>
                  <View style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: c.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ color: c.accent, fontSize: 16, fontWeight: '800' }}>▣</Text>
                  </View>
                  <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                    <Text numberOfLines={2} style={{ fontSize: 14, fontWeight: '800', color: c.text }}>{i.code ? `${i.code} - ${i.name}` : i.name}</Text>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: c.muted }}>{i.uom || '—'}</Text>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: c.muted }}>Bal : {i.balance || '—'}</Text>
                  </View>
                  <Text style={{ color: c.muted, fontSize: 18 }}>›</Text>
                </Pressable>
              );
            })}
          </View>
          {!loading && !list.length && <Text style={{ textAlign: 'center', padding: 30, color: c.muted }}>No items found.</Text>}
          {all.length > list.length && <Text style={{ textAlign: 'center', padding: 14, color: c.muted, fontSize: 12 }}>Showing first {list.length} of {all.length} — type to narrow down.</Text>}
        </ScrollView>
      </View>
    </View>
  );
}


/** Qty field: one bordered box, number on the left, UOM tag inside on the right – never overflows its card */
function QtyBox({ c, value, onChange, uom }: { c: Pal; value: string; onChange: (v: string) => void; uom?: string }) {
  const [focus, setFocus] = useState(false);
  return (
    <View style={{ width: '100%', flexDirection: 'row', alignItems: 'center', minHeight: 60, borderWidth: 1.5, borderRadius: 14, paddingLeft: 14, paddingRight: 8, gap: 8,
      backgroundColor: c.input, borderColor: focus ? c.accent : c.border, overflow: 'hidden' }}>
      <TextInput value={value} onChangeText={onChange} keyboardType="decimal-pad" placeholder="0.000" placeholderTextColor={c.muted} autoFocus={web}
        onFocus={() => setFocus(true)} onBlur={() => setFocus(false)} selectTextOnFocus
        style={[{ flex: 1, minWidth: 0, width: 0, paddingVertical: 0, fontSize: 26, fontWeight: '800', color: c.text }, noOutline]} />
      {!!uom && (
        <View style={{ backgroundColor: c.accentSoft, borderRadius: 9, paddingHorizontal: 12, paddingVertical: 8 }}>
          <Text style={{ fontSize: 13, fontWeight: '800', color: c.accentText }}>{uom}</Text>
        </View>
      )}
    </View>
  );
}

function ItemDetailView({ c, wide, availW, item, qty, isNew, onQty, onChangeItem, onConfirm, onRemove, onBack }: { c: Pal; wide: boolean; availW: number; item: ItemOpt; qty: string; isNew: boolean;
  onQty: (v: string) => void; onChangeItem: () => void; onConfirm: () => void; onRemove: () => void; onBack: () => void }) {
  const bal = Number(item.balance); const q = Number(qty);
  const after = !isNaN(bal) && qty !== '' && !isNaN(q) ? (bal - q).toFixed(3) : '';
  const card = { backgroundColor: c.card, borderRadius: 16, borderWidth: 1, borderColor: c.border, padding: 16, gap: 12 } as const;
  return (
    <View style={{ flex: 1 }}>
      <PageHeader c={c} crumb="Material Requisition › Items › Details" title={isNew ? 'Add Item' : 'Modify Item'} onBack={onBack} />
      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 14, paddingBottom: 20 }}>
        <View style={{ width: '100%', maxWidth: 940, alignSelf: 'center', flexDirection: wide ? 'row' : 'column', gap: 14, alignItems: 'flex-start' }}>
          <View style={[card, { width: wide ? '42%' : '100%' }]}>
            <SelectBox c={c} label="Item" value={item.code ? `${item.code} - ${item.name}` : item.name} placeholder="Select item" onPress={onChangeItem} width="100%" />
            <View style={{ flexDirection: 'row', gap: GAP }}>
              <Info c={c} label="UOM" value={item.uom} width="48%" />
              <Info c={c} label="Balance" value={item.balance} width="48%" />
            </View>
          </View>
          <View style={[card, { flex: wide ? 1 : undefined, width: wide ? undefined : '100%' }]}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: c.sub }}>Quantity *</Text>
            <QtyBox c={c} value={qty} onChange={onQty} uom={item.uom} />
            {!!after && <Text style={{ fontSize: 12, color: Number(after) < 0 ? c.danger : c.sub }}>Balance after issue : {after}</Text>}
          </View>
        </View>
      </ScrollView>
      <View style={{ borderTopWidth: 1, borderColor: c.border, backgroundColor: c.card }}>
        <View style={{ width: '100%', maxWidth: 940, alignSelf: 'center', flexDirection: 'row', gap: 10, padding: 14 }}>
          {!isNew && <Btn c={c} kind="danger" label="Remove" onPress={onRemove} />}
          <Btn c={c} kind="navy" label={isNew ? '＋ Add item' : '✓ Update item'} onPress={onConfirm} style={{ flex: 1 }} />
        </View>
      </View>
    </View>
  );
}

/* ───────────────────────── Screen ───────────────────────── */
const GAP = 10;
const num = (v: string) => v.replace(/[^0-9.]/g, '');
const mapLine = (x: any, i: number): Line => ({
  id: String(Date.now() + i), itemCode: x.item_code ?? x.ItmCode ?? '', itemName: x.item_name ?? x.ItmName ?? '',
  uom: x.uom ?? x.Uom ?? '', qty: String(x.qty ?? x.Qty ?? ''), balance: String(x.balance ?? x.ItemBal ?? ''),
});

export default function MaterialRequisitionScreen({ token, API, dark = false }: { token: string; API: string; dark?: boolean }) {
  const c = useMemo(() => palette(dark), [dark]);
  const [width, setWidth] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);
  const phone = width < 520;
  const wide = width >= 760;
  const rootPad = phone ? 12 : 18;
  const innerW = Math.max(240, width - rootPad * 2 - 34);
  const cols = innerW < 480 ? 2 : innerW < 760 ? 3 : 4;
  const fw = Math.floor((innerW - GAP * (cols - 1)) / cols) - 1;
  const full = innerW - 1;

  const [mode, setMode] = useState<'browse' | 'add' | 'modify'>('browse');
  const [records, setRecords] = useState<Entry[]>(DEMO);
  const [draft, setDraft] = useState<Entry>(emptyEntry());
  const [query, setQuery] = useState('');
  const [showBrowse, setShowBrowse] = useState(false);
  const [help, setHelp] = useState<null | 'process' | 'recipe'>(null);
  const [processOpts, setProcessOpts] = useState<ProcessOpt[]>(DEMO_PROCESS);
  const [recipeOpts, setRecipeOpts] = useState<RecipeOpt[]>(DEMO_RECIPES);
  const [itemOpts, setItemOpts] = useState<ItemOpt[]>(DEMO_ITEMS);
  const [loadingHelp, setLoadingHelp] = useState(false);
  const editing = mode === 'add' || mode === 'modify';
  const lock = mode === 'modify';
  const auth = { headers: { Authorization: `Bearer ${token}` } };
  const set = (k: keyof Entry, v: string) => setDraft(p => ({ ...p, [k]: v }));

  /* Dropdown data – API first, demo list if endpoint is not ready */
  const openHelp = useCallback(async (kind: 'process' | 'recipe') => {
    setHelp(kind); setLoadingHelp(true);
    try {
      const path = kind === 'process' ? 'process-list' : 'recipe-list';
      const r = await axios.post(`${API}/api/materialrequisition/${path}`, { txntype: 'material_requisition' }, auth);
      const a = r.data?.response ?? r.data?.data;
      if (Array.isArray(a) && a.length) {
        if (kind === 'process') setProcessOpts(a.map((x: any): ProcessOpt => ({
          processNo: x.process_no ?? x.ProcNo ?? '', name: x.process_name ?? x.ProcName ?? '', date: x.date ?? '', machine: x.machine ?? x.MchCode ?? '',
          slipNo: x.slip_no ?? x.SlipNo ?? '', item: x.item ?? x.ItmName ?? '', shade: x.shade ?? x.ShdName ?? '',
          pcs: String(x.pcs ?? x.Pcs ?? ''), weight: String(x.weight ?? x.Weight ?? ''), litres: String(x.litres ?? x.Litres ?? '') })));
        else setRecipeOpts(a.map((x: any): RecipeOpt => ({ code: String(x.code ?? x.RecCode ?? ''), name: x.name ?? x.RecName ?? '' })));
      }
    } catch { /* keep demo list */ }
    setLoadingHelp(false);
  }, [API, token]);

  const loadItems = useCallback(async () => {
    setLoadingHelp(true);
    try {
      const r = await axios.post(`${API}/api/materialrequisition/item-list`, { txntype: 'material_requisition' }, auth);
      const a = r.data?.response ?? r.data?.data;
      if (Array.isArray(a) && a.length) setItemOpts(a.map((x: any): ItemOpt => ({ code: String(x.item_code ?? x.ItmCode ?? ''), name: x.item_name ?? x.ItmName ?? '', uom: x.uom ?? x.Uom ?? '', balance: String(x.balance ?? x.ItemBal ?? '') })));
    } catch { /* keep demo list */ }
    setLoadingHelp(false);
  }, [API, token]);

  /* Pick a process → everything (master + D1 items) is set from it */
  const loadProcess = async (no: string, opt?: ProcessOpt) => {
    setDraft(p => ({ ...p, processNo: no, process: opt?.name ?? p.process, date: opt?.date || p.date, machine: opt?.machine ?? p.machine,
      slipNo: opt?.slipNo ?? p.slipNo, item: opt?.item ?? p.item, shade: opt?.shade ?? p.shade, pcs: opt?.pcs ?? p.pcs,
      weight: opt?.weight ?? p.weight, actualWeight: opt?.weight ?? p.actualWeight, litres: opt?.litres ?? p.litres,
      lines: opt?.lines ? opt.lines.map(l => ({ ...l })) : p.lines }));
    try {
      const r = await axios.post(`${API}/api/materialrequisition/process-data`, { process_no: no, txntype: 'material_requisition' }, auth);
      const d = r.data?.response ?? r.data?.data ?? {};
      setDraft(p => ({ ...p, processNo: no, date: d.date ?? p.date, machine: d.machine ?? d.MchCode ?? p.machine, slipNo: d.slip_no ?? d.SlipNo ?? p.slipNo,
        item: d.item ?? d.ItmName ?? p.item, shade: d.shade ?? d.ShdName ?? p.shade, shadeRecipe: d.shade_recipe ?? d.ShadeRecipe ?? p.shadeRecipe,
        pcs: String(d.pcs ?? d.Pcs ?? p.pcs), weight: String(d.weight ?? d.Weight ?? p.weight), litres: String(d.litres ?? d.Litres ?? p.litres),
        shift: d.shift ?? p.shift, startTime: d.start_time ?? p.startTime, actualWeight: String(d.actual_weight ?? d.weight ?? d.Weight ?? p.actualWeight),
        processRecipe: d.process_recipe ?? p.processRecipe, lines: Array.isArray(d.lines) ? d.lines.map(mapLine) : p.lines }));
    } catch { /* API contract pending – dropdown data already applied */ }
  };

  const startAdd = () => { setDraft(emptyEntry()); setMode('add'); };
  const startModify = (row: Entry) => { setDraft({ ...row, lines: row.lines.map(x => ({ ...x })) }); setMode('modify'); setShowBrowse(false); };

  const save = async () => {
    if (!draft.processNo.trim()) { notify('Required', 'Select Process No. first'); return; }
    const payload = { ...draft, lines: draft.lines.map(x => ({ ...x, qty: Number(x.qty) || 0 })), txntype: 'material_requisition' };
    try { await axios.post(`${API}/api/materialrequisition/${mode === 'add' ? 'add-data' : 'modify-data'}`, payload, auth); } catch { /* optimistic local save until endpoint is wired */ }
    setRecords(p => mode === 'add' ? [{ ...draft, id: String(Date.now()) }, ...p] : p.map(x => x.id === draft.id ? draft : x));
    setMode('browse');
  };
  const doDelete = async () => {
    try { await axios.post(`${API}/api/materialrequisition/delete-data`, { process_no: draft.processNo, txntype: 'material_requisition' }, auth); } catch { /* ignore */ }
    setRecords(p => p.filter(x => x.id !== draft.id)); setMode('browse');
  };
  const remove = () => {
    if (web) { if (window.confirm('Delete this complete Material Requisition?')) doDelete(); return; }
    Alert.alert('Delete entry', 'Delete this complete Material Requisition?', [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: doDelete }]);
  };

  type ItemEdit = { lineId: string | null; item: ItemOpt | null; qty: string; step: 'select' | 'detail' };
  const [itemEdit, setItemEdit] = useState<ItemEdit | null>(null);
  const openAddItem = () => { setItemEdit({ lineId: null, item: null, qty: '', step: 'select' }); loadItems(); };
  const openEditItem = (l: Line) => setItemEdit({ lineId: l.id, item: { code: l.itemCode, name: l.itemName, uom: l.uom, balance: l.balance }, qty: l.qty, step: 'detail' });
  const changeItem = () => { setItemEdit(p => p && { ...p, step: 'select' }); loadItems(); };
  const pickItem = (o: ItemOpt) => setItemEdit(p => p && { ...p, item: o, step: 'detail' });
  const itemBack = () => setItemEdit(p => {
    if (!p) return p;
    // Select Item: if an item was already chosen (Change item) go back to its details, else leave the item flow
    if (p.step === 'select') return p.item ? { ...p, step: 'detail' } : null;
    // Details: always go straight back to the Material Requisition screen
    return null;
  });
  const confirmItem = () => {
    if (!itemEdit?.item) return;
    if (!(Number(itemEdit.qty) > 0)) { notify('Required', 'Enter quantity'); return; }
    const o = itemEdit.item; const qty = itemEdit.qty; const id = itemEdit.lineId;
    setDraft(p => ({ ...p, lines: id === null
      ? [...p.lines, { id: String(Date.now()), itemCode: o.code, itemName: o.name, uom: o.uom, qty, balance: o.balance }]
      : p.lines.map(l => l.id === id ? { ...l, itemCode: o.code, itemName: o.name, uom: o.uom, balance: o.balance, qty } : l) }));
    setItemEdit(null);
  };
  const removeEdited = () => { if (itemEdit?.lineId) deleteLine(itemEdit.lineId); setItemEdit(null); };
  const setQty = (id: string, v: string) => setDraft(p => ({ ...p, lines: p.lines.map(l => l.id === id ? { ...l, qty: num(v) } : l) }));
  const deleteLine = (id: string) => setDraft(p => ({ ...p, lines: p.lines.filter(l => l.id !== id) }));
  const totalQty = draft.lines.reduce((s, l) => s + (Number(l.qty) || 0), 0);

  const filtered = records.filter(x => [x.processNo, x.item, x.shade, x.machine, x.slipNo].join(' ').toLowerCase().includes(query.toLowerCase()));
  const card = { backgroundColor: c.card, borderRadius: 18, borderWidth: 1, borderColor: c.border, overflow: 'hidden' } as const;
  const lineW = wide ? Math.floor((innerW - GAP) / 2) - 1 : full;

  if (itemEdit) {
    const availW = Math.min(940, width);
    return (
      <View style={{ flex: 1, backgroundColor: c.bg }} onLayout={onLayout}>
        {itemEdit.step === 'select'
          ? <ItemSelectView c={c} items={itemOpts} loading={loadingHelp} selected={itemEdit.item?.name} availW={availW} onSelect={pickItem} onBack={itemBack} onRefresh={loadItems} />
          : <ItemDetailView c={c} wide={availW >= 640} availW={availW} item={itemEdit.item!} qty={itemEdit.qty} isNew={itemEdit.lineId === null}
              onQty={v => setItemEdit(p => p && { ...p, qty: num(v) })} onChangeItem={changeItem} onConfirm={confirmItem} onRemove={removeEdited} onBack={itemBack} />}
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.bg, padding: rootPad }} onLayout={onLayout}>
      {/* Page title */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 12 }}>
        <View style={{ flexShrink: 1 }}>
          <Text style={{ fontSize: 10, fontWeight: '800', letterSpacing: 1.2, color: c.accent }}>YARN DYEING · STORE</Text>
          <Text style={{ fontSize: phone ? 20 : 22, fontWeight: '800', color: c.text }}>Material Requisition</Text>
        </View>
        <Text style={{ fontSize: 11, fontWeight: '700', color: c.sub, backgroundColor: c.card, borderWidth: 1, borderColor: c.border, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 }}>
          {editing ? (mode === 'add' ? 'NEW ENTRY' : 'MODIFY ENTRY') : `${records.length} entries`}
        </Text>
      </View>

      {editing ? (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 14, paddingBottom: 16 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {/* ───── Process card ───── */}
          <View style={card}>
            <Pressable disabled={lock} onPress={() => openHelp('process')} style={({ pressed, hovered }: any) => ({
              backgroundColor: c.hero, paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', gap: 12,
              opacity: pressed ? 0.9 : 1, borderBottomWidth: 3, borderBottomColor: hovered && !lock ? '#e0954f' : c.accent })}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#8fa6bd' }}>Process No.</Text>
                <Text numberOfLines={1} style={{ fontSize: draft.processNo ? 24 : 17, fontWeight: '800', color: draft.processNo ? '#fff' : '#9db0c3' }}>
                  {draft.processNo || 'Select process no.'}
                </Text>
                {!!draft.process && <Text style={{ fontSize: 12, color: '#9db0c3' }}>{draft.process}{draft.batchNo ? ` · Batch ${draft.batchNo}` : ''}</Text>}
              </View>
              <View style={{ alignItems: 'flex-end', gap: 8 }}>
                {!!draft.date && <Text style={{ fontSize: 12, fontWeight: '700', color: '#c8d4e0' }}>{draft.date}</Text>}
                {!lock && <View style={{ backgroundColor: c.accent, borderRadius: 9, paddingHorizontal: 12, paddingVertical: 7 }}>
                  <Text style={{ color: '#fff', fontSize: 12, fontWeight: '800' }}>{draft.processNo ? 'Change ▾' : 'Select ▾'}</Text>
                </View>}
              </View>
            </Pressable>

            <View style={{ padding: 16, gap: 12 }}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: GAP }}>
                <Stat c={c} label="Pcs" value={draft.pcs} width={fw} />
                <Stat c={c} label="Weight" value={draft.weight} width={fw} />
                <Stat c={c} label="Litres" value={draft.litres} width={fw} />
                <Stat c={c} label="Actual weight" width={fw} accent>
                  <TextInput value={draft.actualWeight} onChangeText={v => set('actualWeight', num(v))} keyboardType="numeric" placeholder="0.000" placeholderTextColor={c.muted}
                    style={[{ fontSize: 20, fontWeight: '800', color: c.text, padding: 0, minHeight: 28 }, noOutline]} />
                </Stat>
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: GAP }}>
                <Info c={c} label="Machine" value={draft.machine} width={fw} />
                <Info c={c} label="Slip No." value={draft.slipNo} width={fw} />
                <Info c={c} label="Shade" value={draft.shade} width={fw} />
                <Info c={c} label="Shade recipe" value={draft.shadeRecipe} width={fw} />
                <Info c={c} label="Item" value={draft.item} width={cols >= 3 ? fw * 2 + GAP : full} />
                <Info c={c} label="Shift" value={draft.shift} width={fw} />
                <Info c={c} label="Start time" value={draft.startTime} width={fw} />
              </View>
              <SelectBox c={c} label="Process recipe" value={draft.processRecipe} placeholder="Select process recipe" disabled={lock} onPress={() => openHelp('recipe')} width={full} />
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                <Btn c={c} label="Copy Weight → Actual" onPress={() => set('actualWeight', draft.weight)} />
                <Btn c={c} label="Print Slip" onPress={() => notify('Print Slip', 'Print slip integration will use the configured report.')} />
              </View>
            </View>
          </View>

          {/* ───── Material items (D1) ───── */}
          <View style={[card, { padding: 16, gap: 12 }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
              <View style={{ flexShrink: 1, gap: 2 }}>
                <Text style={{ fontSize: 15, fontWeight: '800', color: c.text }}>Material items</Text>
                <Text style={{ fontSize: 12, color: c.sub }}>{draft.lines.length} item{draft.lines.length === 1 ? '' : 's'} · Total qty {totalQty.toFixed(3)}</Text>
              </View>
              <Pressable onPress={openAddItem} style={({ pressed }) => ({ backgroundColor: c.accentSoft, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, opacity: pressed ? 0.8 : 1 })}>
                <Text style={{ fontSize: 12, fontWeight: '800', color: c.accentText }}>＋ Add item</Text>
              </Pressable>
            </View>

            {draft.lines.length === 0 && (
              <View style={{ alignItems: 'center', padding: 22, gap: 4, borderWidth: 1, borderStyle: 'dashed', borderColor: c.border, borderRadius: 14 }}>
                <Text style={{ fontWeight: '700', color: c.sub }}>No items yet</Text>
                <Text style={{ fontSize: 12, color: c.muted, textAlign: 'center' }}>Select a process to load its recipe items, or tap “Add item”.</Text>
              </View>
            )}

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: GAP }}>
              {draft.lines.map(line => (
                <View key={line.id} style={{ width: lineW, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 14,
                  backgroundColor: c.cardAlt, borderWidth: 1, borderColor: c.border, borderLeftWidth: 4, borderLeftColor: c.accent }}>
                  <Pressable onPress={() => openEditItem(line)} style={({ pressed }) => ({ flex: 1, minWidth: 0, gap: 6, opacity: pressed ? 0.7 : 1 })}>
                    <Text numberOfLines={2} style={{ fontSize: 14, fontWeight: '800', color: c.text }}>{line.itemName || '—'}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      {!!line.uom && <Text style={{ fontSize: 11, fontWeight: '800', color: c.accentText, backgroundColor: c.accentSoft, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>{line.uom}</Text>}
                      <Text style={{ fontSize: 12, color: c.sub }}>Bal {line.balance || '—'}</Text>
                    </View>
                    <Text style={{ fontSize: 11, fontWeight: '800', color: c.accent }}>Change item ›</Text>
                  </Pressable>
                  <View style={{ width: phone ? 104 : 120, gap: 4 }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: c.muted, textAlign: 'right' }}>Qty</Text>
                    <Input c={c} value={line.qty} onChangeText={(v: string) => setQty(line.id, v)} keyboardType="decimal-pad" placeholder="0.000"
                      style={{ width: '100%', minWidth: 0, textAlign: 'right', fontWeight: '800', fontSize: 15, minHeight: 42 }} />
                  </View>
                  <Pressable onPress={() => deleteLine(line.id)} hitSlop={8} accessibilityLabel="Remove item" style={{ width: 28, height: 42, alignItems: 'center', justifyContent: 'center', marginTop: 16 }}>
                    <Text style={{ color: c.danger, fontSize: 16, fontWeight: '800' }}>✕</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
      ) : (
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, backgroundColor: c.card, borderRadius: 12, borderWidth: 1, borderColor: c.border }}>
            <TextInput value={query} onChangeText={setQuery} placeholder="Search process no., item, shade, machine…" placeholderTextColor={c.muted}
              style={[{ flex: 1, paddingVertical: 12, color: c.text, fontSize: 14 }, noOutline]} />
            {!!query && <Pressable onPress={() => setQuery('')} hitSlop={8}><Text style={{ color: c.muted, fontWeight: '700' }}>Clear</Text></Pressable>}
          </View>
          <ScrollView contentContainerStyle={{ paddingVertical: 12 }} showsVerticalScrollIndicator={false}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {filtered.map(row => (
                <Pressable key={row.id} onPress={() => startModify(row)} style={({ pressed, hovered }: any) => ({
                  width: wide ? '49.5%' : '100%', backgroundColor: c.card, borderRadius: 14, padding: 14, gap: 7, borderWidth: 1,
                  borderColor: hovered ? c.accent : c.border, opacity: pressed ? 0.85 : 1 })}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 15, fontWeight: '900', color: c.text }}>{row.processNo || '—'}</Text>
                    <Text style={{ fontSize: 12, color: c.muted }}>{row.date}</Text>
                  </View>
                  <Text numberOfLines={1} style={{ fontSize: 14, fontWeight: '700', color: c.text }}>{row.item || 'Item not specified'}</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14 }}>
                    <Text style={{ fontSize: 12, color: c.sub }}>◈ {row.shade || '—'}</Text>
                    <Text style={{ fontSize: 12, color: c.sub }}>⚙ {row.machine || '—'}</Text>
                    <Text style={{ fontSize: 12, color: c.sub }}>Qty {row.weight || '—'}</Text>
                  </View>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: c.accent, alignSelf: 'flex-end' }}>Open details ›</Text>
                </Pressable>
              ))}
            </View>
            {!filtered.length && <Text style={{ textAlign: 'center', padding: 30, color: c.muted }}>No requisitions found.</Text>}
          </ScrollView>
        </View>
      )}

      {/* Footer */}
      <View style={{ flexDirection: 'row', gap: 10, paddingTop: 12, borderTopWidth: 1, borderColor: c.border }}>
        {editing ? (
          <>
            <Btn c={c} label="Cancel" onPress={() => setMode('browse')} />
            <Btn c={c} kind="navy" label="✓ Save" onPress={save} style={{ flex: 1 }} />
            {mode === 'modify' && <Btn c={c} kind="danger" label={phone ? 'Delete' : 'Delete entry'} onPress={remove} />}
          </>
        ) : (
          <>
            <Btn c={c} kind="primary" label="＋ Add new" onPress={startAdd} style={{ flex: 1 }} />
            <Btn c={c} label="Browse list" onPress={() => setShowBrowse(true)} />
          </>
        )}
      </View>

      {/* Dropdowns */}
      <PickerSheet c={c} visible={help === 'process'} wide={wide} loading={loadingHelp} title="Select Process No."
        items={processOpts.map(p => ({ key: p.processNo, title: p.processNo, tag: p.machine, sub: [p.name, p.item, p.shade].filter(Boolean).join(' · ') }))}
        onClose={() => setHelp(null)} onSelect={k => { const o = processOpts.find(p => p.processNo === k); setHelp(null); loadProcess(k, o); }} />
      <PickerSheet c={c} visible={help === 'recipe'} wide={wide} loading={loadingHelp} title="Select Process Recipe"
        items={recipeOpts.map(r => ({ key: r.code, title: r.name, tag: r.code }))}
        onClose={() => setHelp(null)} onSelect={k => { const o = recipeOpts.find(r => r.code === k); setHelp(null); if (o) set('processRecipe', `${o.code} · ${o.name}`); }} />
      <BrowseModal c={c} visible={showBrowse} rows={records} wide={wide} onPick={startModify} onClose={() => setShowBrowse(false)} />
    </View>
  );
}
