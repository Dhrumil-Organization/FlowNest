// FILE: src/components/PlanningNEW/QtyHelpSheet.tsx
// TOTAL QUANTITY HELP — Order | Item | Party | Qty, with what is still free on every order ("check existing records").
// The user can edit every quantity here (or "Fill all with balance"); OK writes them back to the grid.
import { T } from '@/src/theme';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { PlanLine, fmtQty, sanitizeDecimal, toNum } from './model';
import { Btn, Sheet } from '../StoreItemMasterNew/ui';

type Props = { visible: boolean; lines: PlanLine[]; editable: boolean; onClose: () => void; onApply: (qty: Record<string, string>) => void };

export default function QtyHelpSheet({ visible, lines, editable, onClose, onApply }: Props) {
  const { width } = useWindowDimensions();
  const wide = width >= 640;
  const [qty, setQty] = useState<Record<string, string>>({});
  useEffect(() => { if (visible) setQty(Object.fromEntries(lines.map((l) => [l.id, l.qty]))); }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps
  const total = lines.reduce((s, l) => s + toNum(qty[l.id]), 0);
  const over = (l: PlanLine) => l.available > 0 && toNum(qty[l.id]) - l.available > 0.0005;

  return (
    <Sheet visible={visible} title="Total quantity" subtitle="Order · Item · Party · Qty — quantity left on every order is checked" size="md" onClose={onClose}
      footer={
        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <Text style={st.total}>Total {fmtQty(total)}</Text>
          <View style={{ flex: 1 }} />
          {editable ? <Btn icon="done-all" label="Fill balance" onPress={() => setQty(Object.fromEntries(lines.map((l) => [l.id, l.available > 0 ? String(l.available) : l.qty])))} /> : null}
          <Btn label={editable ? 'Cancel' : 'Close'} onPress={onClose} />
          {editable ? <Btn kind="primary" icon="check" label="OK" onPress={() => onApply(qty)} /> : null}
        </View>
      }>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 12, gap: 10 }}>
        {lines.map((l) => (
          <View key={l.id} style={[st.row, over(l) && { borderColor: T.red }]}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={st.t1} numberOfLines={1}>{l.kind} {l.orderNo}  ·  {l.itemName}</Text>
              <Text style={st.t2} numberOfLines={1}>{l.partyName}</Text>
              <Text style={st.t2}>Order {fmtQty(l.orderQty)}  ·  Left to plan {fmtQty(l.available)}</Text>
              {over(l) ? <Text style={st.err}>More than what is left on this order.</Text> : null}
            </View>
            {editable ? (
              <TextInput value={qty[l.id] ?? ''} onChangeText={(v) => setQty((p) => ({ ...p, [l.id]: sanitizeDecimal(v, 3) }))} keyboardType="decimal-pad" selectTextOnFocus
                accessibilityLabel={`Quantity for order ${l.orderNo}`} style={[st.in, { width: wide ? 140 : 110 }, over(l) && { borderColor: T.red }]} />
            ) : <Text style={st.qty}>{fmtQty(toNum(l.qty))}</Text>}
          </View>
        ))}
      </ScrollView>
    </Sheet>
  );
}

const st = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: T.border, borderRadius: 12, padding: 12, backgroundColor: T.surface },
  t1: { fontSize: 14, fontWeight: '800', color: T.ink },
  t2: { fontSize: 12.5, color: T.muted, marginTop: 1 },
  err: { fontSize: 12, color: T.red, fontWeight: '600', marginTop: 2 },
  in: { minHeight: 44, borderWidth: 1, borderColor: T.border, borderRadius: 10, paddingHorizontal: 10, fontSize: 16, fontWeight: '700', color: T.ink, textAlign: 'right', backgroundColor: T.surface },
  qty: { fontSize: 15, fontWeight: '800', color: T.ink },
  total: { fontSize: 15, fontWeight: '800', color: T.ink },
});
