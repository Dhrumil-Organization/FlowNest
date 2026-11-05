// FILE: src/components/ProcessChemicalsNEW/RecipeGrid.tsx
// The recipe grid — simple flat chemical list without recipe-group sections:
//   Make | Model | UOM | Qty | Cost
//
// desktop (>= 900)  Make + Model columns, edit / delete icons on every row
// tablet  (>= 560)  Make + Model share one column, no horizontal scroll
// phone             one card per chemical (big touch targets), edit / delete inside the card
// Flat rows; recipe total remains visible.
import { T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { memo, useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Breakpoint, RecipeLine, fmtCost, fmtQty, lineCost, recipeTotals } from './model';
import { Btn } from '../StoreItemMasterNew/ui';
import { ColDef, ColumnMenu, ColumnSizing, ResizeHandle, useColumnSizing } from './columnSizing';

type Props = {
  lines: RecipeLine[];
  bp: Breakpoint;
  editable: boolean;
  onEdit: (l: RecipeLine) => void;
  onDelete: (l: RecipeLine) => void;
};
type Sz = ColumnSizing;

const ACT_W = 88;

// default (responsive) widths of the fixed columns
const defW = (bp: Breakpoint) => ({
  itemCode: bp === 'desktop' ? 78 : 68,
  itemName: bp === 'desktop' ? 190 : 150,
  make: bp === 'desktop' ? 130 : 100,
  model: bp === 'desktop' ? 120 : 100,
  uom: 64,
  qty: bp === 'desktop' ? 124 : 96,
  cost: bp === 'desktop' ? 116 : 90,
});

const colDefs = (bp: Breakpoint): ColDef[] => [
  { key: 'itemCode', header: 'Item Code' },
  { key: 'itemName', header: 'Item Name' },
  ...(bp === 'desktop' ? [{ key: 'make', header: 'Make' }, { key: 'model', header: 'Model' }] : [{ key: 'makemodel', header: 'Make / Model' }]),
  { key: 'uom', header: 'UOM' },
  { key: 'qty', header: 'Qty' },
  { key: 'cost', header: 'Cost' },
];

// NOTE: defined at module level on purpose - a component created inside HeadRow would remount (and cancel the drag) on every resize step
const Th = ({ sz, k, label, base, right }: { sz: Sz; k: string; label: string; base: any; right?: boolean }) => (
  <View style={sz.col(k, base)} onLayout={sz.onLayout(k)}>
    <Text style={[st.th, right && { textAlign: 'right' }]} numberOfLines={1}>{label}</Text>
    <ResizeHandle sizing={sz} k={k} />
  </View>
);

const HeadRow = ({ bp, editable, sz }: { bp: Breakpoint; editable: boolean; sz: Sz }) => {
  const w = defW(bp);
  return (
    <ColumnMenu sizing={sz} style={[st.tr, st.headRow]}>
      <Th sz={sz} k="itemCode" label="ITEM CODE" base={{ width: w.itemCode }} />
      <Th sz={sz} k="itemName" label="ITEM NAME" base={{ width: w.itemName, flex: bp === 'desktop' ? undefined : 1 }} />
      {bp === 'desktop' ? (
        <>
          <Th sz={sz} k="make" label="MAKE" base={{ width: w.make }} />
          <Th sz={sz} k="model" label="MODEL" base={{ width: w.model }} />
        </>
      ) : (
        <Th sz={sz} k="makemodel" label="MAKE / MODEL" base={{ flex: 1.2 }} />
      )}
      <Th sz={sz} k="uom" label="UOM" base={{ width: w.uom }} />
      <Th sz={sz} k="qty" label="QTY" base={{ width: w.qty }} right />
      <Th sz={sz} k="cost" label="COST" base={{ width: w.cost }} right />
      {editable ? <View style={{ width: ACT_W }} /> : null}
    </ColumnMenu>
  );
};

const Row = memo(function Row({ l, bp, editable, onEdit, onDelete, sz }: { l: RecipeLine; sz: Sz } & Omit<Props, 'lines'>) {
  const cost = lineCost(l);
  const w = defW(bp);
  if (bp === 'phone') {
    return (
      <Pressable onPress={editable ? () => onEdit(l) : undefined} disabled={!editable} style={st.card} accessibilityRole={editable ? 'button' : undefined} accessibilityLabel={`${l.make} ${l.model}, quantity ${l.qty} ${l.uom}`}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={st.cardTitle} numberOfLines={2}>{`${l.itemCode || ''} · ${l.itemName || ''}`.trim() || '—'}</Text>
            <Text style={st.cardMeta} numberOfLines={1}>{[l.make, l.model].filter(Boolean).join(' / ') || '—'}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={st.cardQty}>{fmtQty(l.qty)} <Text style={st.cardUom}>{l.uom}</Text></Text>
            <Text style={st.cardCost}>{fmtCost(cost)}</Text>
          </View>
        </View>
        {editable ? (
          <View style={st.cardActions}>
            <Btn icon="edit" label="Edit" compact kind="quiet" onPress={() => onEdit(l)} />
            <Btn icon="delete-outline" label="Remove" compact kind="danger" onPress={() => onDelete(l)} />
          </View>
        ) : null}
      </Pressable>
    );
  }
  return (
    <Pressable onPress={editable ? () => onEdit(l) : undefined} disabled={!editable} style={(p: any) => [st.tr, st.bodyRow, editable && p.hovered && { backgroundColor: T.alt }]}>
      <Text style={[st.td, sz.col('itemCode', { width: w.itemCode })]} numberOfLines={1}>{l.itemCode}</Text>
      <Text style={[st.td, sz.col('itemName', { width: w.itemName })]} numberOfLines={1}>{l.itemName}</Text>
      {bp === 'desktop' ? (
        <>
          <Text style={[st.td, sz.col('make', { width: w.make })]} numberOfLines={1}>{l.make}</Text>
          <Text style={[st.td, sz.col('model', { width: w.model })]} numberOfLines={1}>{l.model}</Text>
        </>
      ) : (
        <View style={[{ paddingHorizontal: 10 }, sz.col('makemodel', { flex: 1.2 })]}>
          <Text style={[st.td, { padding: 0 }]} numberOfLines={1}>{l.make || '—'}</Text>
          {l.model ? <Text style={st.sub} numberOfLines={1}>{l.model}</Text> : null}
        </View>
      )}
      <Text style={[st.td, sz.col('uom', { width: w.uom })]} numberOfLines={1}>{l.uom}</Text>
      <Text style={[st.td, sz.col('qty', { width: w.qty }), { textAlign: 'right', fontVariant: ['tabular-nums'] }]} numberOfLines={1}>{fmtQty(l.qty)}</Text>
      <Text style={[st.td, sz.col('cost', { width: w.cost }), { textAlign: 'right', fontVariant: ['tabular-nums'] }]} numberOfLines={1}>{fmtCost(cost)}</Text>
      {editable ? (
        <View style={{ width: ACT_W, flexDirection: 'row', justifyContent: 'flex-end', gap: 2, paddingRight: 6 }}>
          <Btn icon="edit" iconOnly compact kind="quiet" onPress={() => onEdit(l)} accessibilityLabel={`Edit ${l.itemName}`} />
          <Btn icon="delete-outline" iconOnly compact kind="danger" onPress={() => onDelete(l)} accessibilityLabel={`Remove ${l.itemName}`} />
        </View>
      ) : null}
    </Pressable>
  );
});


export default function RecipeGrid({ lines, bp, editable, onEdit, onDelete }: Props) {
  const t = recipeTotals(lines);
  const defs = useMemo(() => colDefs(bp), [bp]);
  // Every text in a column is used by "Autosize all columns".
  const samples = (k: string): string[] => {
    const out: string[] = [];
    for (const l of lines) {
      if (k === 'itemCode') out.push(l.itemCode || '');
      else if (k === 'itemName') out.push(l.itemName || '');
      else if (k === 'make') out.push(l.make || '');
      else if (k === 'model') out.push(l.model || '');
      else if (k === 'makemodel') out.push(l.make || '', l.model || '');
      else if (k === 'uom') out.push(l.uom || '');
      else if (k === 'qty') out.push(fmtQty(l.qty));
      else if (k === 'cost') out.push(fmtCost(lineCost(l)));
    }
    return out;
  };
  const sz = useColumnSizing(defs, samples);
  return (
    <View style={{ gap: 12 }}>
      {bp !== 'phone' ? <HeadRow bp={bp} editable={editable} sz={sz} /> : null}
      {lines.map((l) => <Row key={l.id} l={l} bp={bp} editable={editable} onEdit={onEdit} onDelete={onDelete} sz={sz} />)}
      <View style={st.grand} accessibilityRole="summary">
        <View style={{ flex: 1 }}>
          <Text style={st.grandLabel}>RECIPE TOTAL</Text>
          <Text style={st.grandSub}>{t.chemicals} chemical{t.chemicals === 1 ? '' : 's'}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={st.grandVal}>{fmtCost(t.cost)}</Text>
          <Text style={st.grandSub}>Qty {fmtQty(t.qty)}</Text>
        </View>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  tr: { flexDirection: 'row', alignItems: 'center' },
  headRow: { backgroundColor: T.sub, borderTopWidth: 1, borderBottomWidth: 1, borderColor: T.hair },
  th: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5, color: T.muted, paddingHorizontal: 10, paddingVertical: 8 },
  bodyRow: { minHeight: 46, borderBottomWidth: 1, borderBottomColor: T.hair },
  td: { fontSize: 13.5, color: T.ink, paddingHorizontal: 10, paddingVertical: 8 },
  sub: { fontSize: 11.5, color: T.muted },
  card: { backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, borderRadius: 12, padding: 12, gap: 8 },
  cardTitle: { fontSize: 14.5, fontWeight: '800', color: T.ink },
  cardMeta: { fontSize: 12, color: T.muted, marginTop: 2 },
  cardQty: { fontSize: 15, fontWeight: '800', color: T.ink, fontVariant: ['tabular-nums'] },
  cardUom: { fontSize: 11.5, fontWeight: '700', color: T.muted },
  cardCost: { fontSize: 12.5, fontWeight: '700', color: T.copper, marginTop: 2, fontVariant: ['tabular-nums'] },
  cardActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 6, borderTopWidth: 1, borderTopColor: T.hair, paddingTop: 6 },
  grand: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: T.ink, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14 },
  grandLabel: { fontSize: 11.5, fontWeight: '800', letterSpacing: 0.8, color: '#FFFFFFB3' },
  grandSub: { fontSize: 12, color: '#FFFFFFB3', marginTop: 2 },
  grandVal: { fontSize: 20, fontWeight: '800', color: '#FFFFFF', fontVariant: ['tabular-nums'] },
});
