// FILE: src/components/PlanningNEW/PlanGrid.tsx
// The planning grid  —  Order No | Party Name | Item Name | Qty   (+ Left-to-plan, remove)
//
// desktop / tablet (>= 560)  table, resizable columns (drag, double-click = autosize, right-click = "Autosize all columns")
// phone                      one card per order, big numeric qty box
// While editing the Qty cell is an input; the Total Quantity is always the live sum of this grid.
import { T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { memo, useMemo } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Breakpoint, PlanLine, fmtDate, fmtQty, lineQty, sanitizeDecimal, totalQty } from './model';
import { Btn } from '../StoreItemMasterNew/ui';
import { ColDef, ColumnMenu, ColumnSizing, ResizeHandle, useColumnSizing } from '../ProcessChemicalsNEW/columnSizing';

type Props = {
  lines: PlanLine[];
  bp: Breakpoint;
  editable: boolean;
  qtyErrors?: Record<string, string>;
  onQty: (id: string, qty: string) => void;
  onRemove: (l: PlanLine) => void;
};
type Sz = ColumnSizing;
const ACT_W = 56;
const COLS: ColDef[] = [
  { key: 'order', header: 'Order No', bold: true },
  { key: 'party', header: 'Party Name' },
  { key: 'item', header: 'Item Name' },
  { key: 'left', header: 'Left' },
  { key: 'qty', header: 'Qty' },
];
const base = (k: string, bp: Breakpoint) =>
  k === 'order' ? { width: bp === 'desktop' ? 150 : 124 } : k === 'party' ? { flex: 1.5 } : k === 'item' ? { flex: 1.1 } : k === 'left' ? { width: bp === 'desktop' ? 110 : 90 } : { width: bp === 'desktop' ? 130 : 108 };

const Th = ({ sz, k, label, b, right }: { sz: Sz; k: string; label: string; b: any; right?: boolean }) => (
  <View style={sz.col(k, b)} onLayout={sz.onLayout(k)}>
    <Text style={[st.th, right && { textAlign: 'right' }]} numberOfLines={1}>{label}</Text>
    <ResizeHandle sizing={sz} k={k} />
  </View>
);

const QtyBox = ({ l, editable, error, onQty, big }: { l: PlanLine; editable: boolean; error?: string; onQty: (id: string, q: string) => void; big?: boolean }) =>
  editable ? (
    <TextInput value={l.qty} onChangeText={(v) => onQty(l.id, sanitizeDecimal(v, 3))} keyboardType="decimal-pad" selectTextOnFocus placeholder="0.000" placeholderTextColor={T.muted}
      accessibilityLabel={`Quantity for order ${l.orderNo}`} style={[st.qtyIn, big && { minHeight: 46, fontSize: 17 }, !!error && { borderColor: T.red, backgroundColor: `${T.red}0F` }]} />
  ) : (
    <Text style={st.qtyTxt} numberOfLines={1}>{fmtQty(lineQty(l))}</Text>
  );

const Row = memo(function Row({ l, bp, editable, error, onQty, onRemove, sz }: { l: PlanLine; sz: Sz; error?: string } & Omit<Props, 'lines' | 'qtyErrors'>) {
  const left = l.available > 0 ? Math.max(0, l.available - lineQty(l)) : 0;
  if (bp === 'phone') {
    return (
      <View style={[st.card, !!error && { borderColor: T.red }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={st.kind}><Text style={st.kindTx}>{l.kind}</Text></View>
          <Text style={st.cardNo} numberOfLines={1}>{l.orderNo}</Text>
          <Text style={st.cardDate}>{fmtDate(l.orderDate)}</Text>
          <View style={{ flex: 1 }} />
          {editable ? <Btn icon="close" iconOnly compact kind="danger" onPress={() => onRemove(l)} accessibilityLabel={`Remove order ${l.orderNo}`} /> : null}
        </View>
        <Text style={st.cardTitle} numberOfLines={2}>{l.partyName || '—'}</Text>
        <Text style={st.cardMeta} numberOfLines={1}>{l.itemName}{l.shadeName ? `  ·  ${l.shadeName}` : ''}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Text style={st.cardMeta}>Left to plan {fmtQty(left)}</Text>
            {error ? <Text style={st.err}>{error}</Text> : null}
          </View>
          <View style={{ width: 140 }}><QtyBox l={l} editable={editable} error={error} onQty={onQty} big /></View>
        </View>
      </View>
    );
  }
  return (
    <View>
      <View style={[st.tr, st.body]}>
        <View style={[sz.col('order', base('order', bp)), { paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 6 }]}>
          <View style={st.kind}><Text style={st.kindTx}>{l.kind}</Text></View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[st.td, { padding: 0, fontWeight: '800' }]} numberOfLines={1}>{l.orderNo}</Text>
            <Text style={st.sub} numberOfLines={1}>{fmtDate(l.orderDate)}</Text>
          </View>
        </View>
        <Text style={[st.td, sz.col('party', base('party', bp))]} numberOfLines={1}>{l.partyName}</Text>
        <Text style={[st.td, sz.col('item', base('item', bp))]} numberOfLines={1}>{l.itemName}</Text>
        <Text style={[st.td, sz.col('left', base('left', bp)), { textAlign: 'right', color: T.muted, fontVariant: ['tabular-nums'] }]} numberOfLines={1}>{fmtQty(left)}</Text>
        <View style={[sz.col('qty', base('qty', bp)), { paddingHorizontal: 8, alignItems: 'flex-end' }]}><QtyBox l={l} editable={editable} error={error} onQty={onQty} /></View>
        {editable ? <View style={{ width: ACT_W, alignItems: 'center' }}><Btn icon="delete-outline" iconOnly compact kind="danger" onPress={() => onRemove(l)} accessibilityLabel={`Remove order ${l.orderNo}`} /></View> : null}
      </View>
      {error ? <Text style={[st.err, { paddingHorizontal: 12, paddingBottom: 6 }]}>{error}</Text> : null}
    </View>
  );
});

export default function PlanGrid({ lines, bp, editable, qtyErrors, onQty, onRemove }: Props) {
  const phone = bp === 'phone';
  const sz = useColumnSizing(COLS, (k) => lines.map((l) => (k === 'order' ? `${l.kind}  ${l.orderNo}` : k === 'party' ? l.partyName : k === 'item' ? l.itemName : k === 'left' ? fmtQty(l.available) : fmtQty(lineQty(l)))));
  const total = useMemo(() => totalQty(lines), [lines]);
  const table = (
    <View>
      {!phone ? (
        <ColumnMenu sizing={sz} style={[st.tr, st.head]}>
          <Th sz={sz} k="order" label="ORDER NO" b={base('order', bp)} />
          <Th sz={sz} k="party" label="PARTY NAME" b={base('party', bp)} />
          <Th sz={sz} k="item" label="ITEM NAME" b={base('item', bp)} />
          <Th sz={sz} k="left" label="LEFT" b={base('left', bp)} right />
          <Th sz={sz} k="qty" label="QTY" b={base('qty', bp)} right />
          {editable ? <View style={{ width: ACT_W }} /> : null}
        </ColumnMenu>
      ) : null}
      <View style={phone ? { gap: 10 } : undefined}>
        {lines.map((l) => <Row key={l.id} l={l} bp={bp} editable={editable} error={qtyErrors?.[l.id]} onQty={onQty} onRemove={onRemove} sz={sz} />)}
      </View>
      <View style={[st.tr, st.totalRow]}>
        <Icon name="functions" size={18} color={T.muted} style={{ marginLeft: 12 }} />
        <Text style={[st.totalLabel, { flex: 1 }]}>Total quantity</Text>
        <Text style={[st.totalVal, { paddingRight: phone ? 12 : 18 }]}>{fmtQty(total)}</Text>
        {editable && !phone ? <View style={{ width: ACT_W }} /> : null}
      </View>
    </View>
  );
  if (phone) return <View style={{ gap: 10 }}>{table}</View>;
  return (
    <View style={st.box}>
      <ScrollView horizontal showsHorizontalScrollIndicator keyboardShouldPersistTaps="handled" contentContainerStyle={{ minWidth: '100%' }}>
        <View style={[{ flexGrow: 1, flexShrink: 0, minWidth: '100%' }, sz.widths ? { width: sz.total + (editable ? ACT_W : 0) } : null]}>{table}</View>
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  box: { borderWidth: 1, borderColor: T.border, borderRadius: 14, overflow: 'hidden', backgroundColor: T.surface },
  tr: { flexDirection: 'row', alignItems: 'center' },
  head: { backgroundColor: T.sub, borderBottomWidth: 1, borderColor: T.hair },
  th: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5, color: T.muted, paddingHorizontal: 10, paddingVertical: 9 },
  body: { minHeight: 52, borderBottomWidth: 1, borderBottomColor: T.hair },
  td: { fontSize: 13.5, color: T.ink, paddingHorizontal: 10, paddingVertical: 8 },
  sub: { fontSize: 11.5, color: T.muted },
  kind: { backgroundColor: `${T.copper}18`, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  kindTx: { fontSize: 10.5, fontWeight: '800', color: T.copper },
  qtyIn: { minHeight: 38, width: '100%', borderWidth: 1, borderColor: T.border, borderRadius: 10, paddingHorizontal: 10, fontSize: 14.5, fontWeight: '700', color: T.ink, backgroundColor: T.surface, textAlign: 'right', fontVariant: ['tabular-nums'] },
  qtyTxt: { fontSize: 14, fontWeight: '800', color: T.ink, fontVariant: ['tabular-nums'], paddingHorizontal: 2 },
  err: { fontSize: 12, color: T.red, fontWeight: '600' },
  totalRow: { backgroundColor: T.sub, minHeight: 44, gap: 8 },
  totalLabel: { fontSize: 12, fontWeight: '800', color: T.muted, letterSpacing: 0.4, textTransform: 'uppercase' },
  totalVal: { fontSize: 15, fontWeight: '800', color: T.ink, fontVariant: ['tabular-nums'] },
  card: { backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, borderRadius: 12, padding: 12, gap: 8 },
  cardNo: { fontSize: 14.5, fontWeight: '800', color: T.ink },
  cardDate: { fontSize: 12, color: T.muted },
  cardTitle: { fontSize: 14.5, fontWeight: '700', color: T.ink },
  cardMeta: { fontSize: 12, color: T.muted },
});
