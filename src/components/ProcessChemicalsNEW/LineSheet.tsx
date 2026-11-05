// FILE: src/components/ProcessChemicalsNEW/LineSheet.tsx
// Add / edit ONE chemical of the recipe: Recipe group -> Chemical -> Quantity.
// Make / model / UOM / rate come from the chemical, cost is calculated live — nothing to type twice.
// "Save & add next" keeps the group, so a whole group can be entered quickly (keyboard friendly on web).
import { T } from '@/src/theme';
import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { Btn, Cell, Field, Sheet } from '../StoreItemMasterNew/ui';
import { ChemOpt, fmtCost, lineCost, LineErrors, Lookups, QTY_DP, RecipeLine, sanitizeDecimal, validateLine } from './model';

type Props = {
  visible: boolean;
  /** Line being edited, or a fresh one (isNew). */
  line: RecipeLine | null;
  isNew: boolean;
  lookups: Lookups;
  /** All OTHER lines of the recipe (duplicate check). */
  others: RecipeLine[];
  onSave: (line: RecipeLine, addNext: boolean) => void;
  onClose: () => void;
};

const chemLabel = (c: ChemOpt) => `${c.itemCode} · ${c.itemName}${c.make ? ` — ${c.make}` : ''}${c.model ? ` (${c.model})` : ''}`;

export default function LineSheet({ visible, line, isNew, lookups, others, onSave, onClose }: Props) {
  const { width } = useWindowDimensions();
  const two = width >= 560;
  const [d, setD] = useState<RecipeLine | null>(line);
  const [err, setErr] = useState<LineErrors>({});
  const [tried, setTried] = useState(false);
  const [itemHelpVisible, setItemHelpVisible] = useState(false);
  const [itemSearch, setItemSearch] = useState('');

  // a different line (or the "next" blank line) was handed in -> start clean
  useEffect(() => { setD(line); setErr({}); setTried(false); }, [line?.id, visible]); // eslint-disable-line react-hooks/exhaustive-deps

  const chemOpts = useMemo(() => lookups.chemicals.map((c) => ({ id: c.key, label: chemLabel(c) })), [lookups.chemicals]);
  const filteredChemicals = useMemo(() => {
    const q = itemSearch.trim().toLowerCase();
    if (!q) return lookups.chemicals;
    return lookups.chemicals.filter((c) => `${c.itemCode} ${c.itemName} ${c.make} ${c.model}`.toLowerCase().includes(q));
  }, [lookups.chemicals, itemSearch]);
  if (!d) return null;

  const chemKey = d.itemCode ? `${d.itemCode}|${d.make}|${d.model}` : '';
  const patch = (p: Partial<RecipeLine>) => {
    const next = { ...d, ...p };
    setD(next);
    if (tried) setErr(validateLine(next, others));
  };
  const pickChem = (key: string) => {
    const c = lookups.chemicals.find((x) => x.key === key);
    if (c) patch({ itemCode: c.itemCode, itemName: c.itemName, make: c.make, model: c.model, uom: c.uom, rate: c.rate });
  };
  const submit = (addNext: boolean) => {
    setTried(true);
    const e = validateLine(d, others);
    setErr(e);
    if (Object.keys(e).length) return;
    onSave(d, addNext);
  };
  const cost = lineCost(d);

  return (
    <>
    <Sheet
      visible={visible}
      title={isNew ? 'Add chemical' : 'Edit chemical'}
      subtitle={d.calc ? `Calculation: ${d.calc}` : 'Choose the item and enter the quantity'}
      onClose={onClose}
      size="md"
      footer={
        <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
          <Btn label="Cancel" onPress={onClose} flex={!two} />
          <View style={{ flex: two ? 1 : 0 }} />
          {isNew ? <Btn icon="playlist-add" label="Save & add next" onPress={() => submit(true)} flex={!two} /> : null}
          <Btn kind="primary" icon="check" label={isNew ? 'Add to recipe' : 'Update'} onPress={() => submit(false)} flex={!two} />
        </View>
      }
    >
      <View style={{ padding: 16, gap: 14 }}>
        <View>
          <Text style={st.helpLabel}>Item <Text style={{ color: T.copper }}>*</Text></Text>
          <Pressable onPress={() => { setItemSearch(''); setItemHelpVisible(true); }} style={[st.helpButton, err.chemical ? { borderColor: T.danger } : null]}>
            <Text numberOfLines={2} style={[st.helpButtonText, d.itemCode ? { color: T.ink } : null]}>{d.itemCode ? (chemLabel(lookups.chemicals.find((c) => c.itemCode === d.itemCode && c.make === d.make && c.model === d.model)) || `${d.itemCode} · ${d.itemName}`) : 'Select item from Item Help'}</Text>
            <Text style={st.helpButtonIcon}>⌕</Text>
          </Pressable>
          {err.chemical ? <Text style={st.errorText}>{err.chemical}</Text> : null}
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -6, rowGap: 14 }}>
          <Cell cols={two ? 3 : 1} gutter={12}><Field label="Make" value={d.make} readOnly placeholder="—" /></Cell>
          <Cell cols={two ? 3 : 1} gutter={12}><Field label="Model" value={d.model} readOnly placeholder="—" /></Cell>
          <Cell cols={two ? 3 : 1} gutter={12}><Field label="UOM" value={d.uom} readOnly placeholder="—" /></Cell>
        </View>
        <Field
          label={`Quantity${d.uom ? ` (${d.uom})` : ''}`}
          required
          value={d.qty}
          keyboardType="decimal-pad"
          align="right"
          placeholder="0.00000"
          error={err.qty}
          onChangeText={(v) => patch({ qty: sanitizeDecimal(v, QTY_DP) })}
          onSubmitEditing={() => submit(isNew)}
        />
        <View style={st.cost}>
          <View style={{ flex: 1 }}>
            <Text style={st.costLabel}>Rate</Text>
            <Text style={st.costValue}>{d.rate ? fmtCost(d.rate) : '—'}</Text>
          </View>
          <View style={{ flex: 1, alignItems: 'flex-end' }}>
            <Text style={st.costLabel}>Cost (calculated)</Text>
            <Text style={[st.costValue, { color: T.copper }]}>{fmtCost(cost)}</Text>
          </View>
        </View>
      </View>
    </Sheet>
    <Sheet visible={itemHelpVisible} title="Item Help" subtitle="Search by item code or item name" onClose={() => setItemHelpVisible(false)} size="md">
      <View style={{ padding: 12, gap: 10, minHeight: 320 }}>
        <TextInput value={itemSearch} onChangeText={setItemSearch} placeholder="Search item code, name, make..." style={st.searchInput} autoFocus />
        <FlatList
          data={filteredChemicals}
          keyExtractor={(item) => item.key}
          keyboardShouldPersistTaps="handled"
          style={{ maxHeight: 420 }}
          ListEmptyComponent={<Text style={st.emptyText}>No items found</Text>}
          renderItem={({ item }) => (
            <Pressable key={item.key} onPress={() => { pickChem(item.key); setItemHelpVisible(false); }} style={st.itemRow}>
              <View style={{ width: 74 }}><Text style={st.itemCode}>{item.itemCode}</Text></View>
              <View style={{ flex: 1 }}><Text style={st.itemName}>{item.itemName}</Text><Text style={st.itemMeta}>{[item.make, item.model, item.uom].filter(Boolean).join(' · ')}</Text></View>
            </Pressable>
          )}
        />
      </View>
    </Sheet>
    </>
  );
}

const st = StyleSheet.create({
  helpLabel: { fontSize: 11.5, fontWeight: '700', color: T.muted, marginBottom: 6 },
  helpButton: { minHeight: 48, borderWidth: 1, borderColor: T.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: T.card, flexDirection: 'row', alignItems: 'center', gap: 8 },
  helpButtonText: { flex: 1, color: T.muted, fontSize: 14 },
  helpButtonIcon: { color: T.muted, fontSize: 22, fontWeight: '700' },
  errorText: { color: T.danger, fontSize: 11, marginTop: 4 },
  searchInput: { borderWidth: 1, borderColor: T.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, color: T.ink, backgroundColor: T.card },
  itemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: T.border, gap: 10 },
  itemCode: { color: T.ink, fontSize: 13, fontWeight: '800' },
  itemName: { color: T.ink, fontSize: 13, fontWeight: '600' },
  itemMeta: { color: T.muted, fontSize: 11, marginTop: 3 },
  emptyText: { color: T.muted, textAlign: 'center', padding: 20 },
  cost: { flexDirection: 'row', backgroundColor: T.sub, borderWidth: 1, borderColor: T.border, borderRadius: 12, padding: 12 },
  costLabel: { fontSize: 11.5, fontWeight: '700', color: T.muted, letterSpacing: 0.3 },
  costValue: { fontSize: 18, fontWeight: '800', color: T.ink, marginTop: 2 },
});
