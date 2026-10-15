// FILE: src/components/TakaHistory/GridFilterModal.tsx
// Filter for ONE grid column: operator + value (two values for "between").
import { T } from '@/src/theme';
import React, { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import type { GridColumn, GridFilter } from './gridApi';
import { needsValue, OPS } from './gridUtils';

type Props = { column: GridColumn | null; current?: GridFilter | null; onApply: (f: GridFilter | null) => void; onClose: () => void };

export default function GridFilterModal({ column, current, onApply, onClose }: Props) {
  const type = column ? column.type : 'text';
  const ops = OPS[type] || OPS.text;
  const [op, setOp] = useState(ops[0].op);
  const [value, setValue] = useState('');
  const [value2, setValue2] = useState('');

  useEffect(() => {
    if (!column) return;
    setOp(current ? current.op : ops[0].op);
    setValue(current && current.value != null ? String(current.value) : '');
    setValue2(current && current.value2 != null ? String(current.value2) : '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [column, current]);

  if (!column) return null;

  const apply = () => {
    if (needsValue(op) && value.trim() === '') return;
    if (op === 'between' && value2.trim() === '') return;
    onApply({ col: column.name, op, value: value.trim(), value2: op === 'between' ? value2.trim() : undefined });
  };

  const keyboard = type === 'number' ? 'decimal-pad' : type === 'date' ? 'numbers-and-punctuation' : 'default';
  const placeholder = type === 'date' ? 'dd/mm/yyyy' : type === 'number' ? '0' : 'Value';

  return (
    <Modal transparent animationType="fade" visible onRequestClose={onClose}>
      <Pressable style={st.backdrop} onPress={onClose}>
        <Pressable style={st.sheet} onPress={() => {}}>
          <Text style={st.eyebrow}>COLUMN FILTER</Text>
          <Text style={st.title}>{column.name}</Text>

          <ScrollView horizontal showsHorizontalScrollIndicator style={{ marginTop: 12, flexGrow: 0 }}>
            {ops.map((o) => (
              <TouchableOpacity key={o.op} onPress={() => setOp(o.op)} style={[st.op, op === o.op && st.opOn]} accessibilityRole="button">
                <Text style={[st.opText, op === o.op && { color: '#fff' }]}>{o.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {needsValue(op) ? (
            <View style={st.values}>
              <TextInput
                style={[st.input, { flex: 1 }]}
                value={value}
                onChangeText={setValue}
                placeholder={placeholder}
                placeholderTextColor={T.muted}
                keyboardType={keyboard}
                autoFocus
                onSubmitEditing={apply}
              />
              {op === 'between' ? (
                <>
                  <Text style={{ marginHorizontal: 8, color: T.muted, fontWeight: '700' }}>to</Text>
                  <TextInput
                    style={[st.input, { flex: 1 }]}
                    value={value2}
                    onChangeText={setValue2}
                    placeholder={placeholder}
                    placeholderTextColor={T.muted}
                    keyboardType={keyboard}
                    onSubmitEditing={apply}
                  />
                </>
              ) : null}
            </View>
          ) : null}

          <View style={st.actions}>
            {current ? (
              <TouchableOpacity style={st.ghost} onPress={() => onApply(null)} accessibilityRole="button">
                <Text style={[st.ghostText, { color: T.red }]}>Remove filter</Text>
              </TouchableOpacity>
            ) : null}
            <View style={{ flex: 1 }} />
            <TouchableOpacity style={st.ghost} onPress={onClose} accessibilityRole="button">
              <Text style={st.ghostText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={st.btn} onPress={apply} accessibilityRole="button">
              <Text style={st.btnText}>Apply</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const st = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(15,27,45,0.45)', justifyContent: 'center', padding: 16 },
  sheet: { backgroundColor: T.surface, borderRadius: 14, borderWidth: 1, borderColor: T.border, padding: 16, maxWidth: 520, width: '100%', alignSelf: 'center' },
  eyebrow: { fontSize: 10.5, fontWeight: '800', letterSpacing: 0.8, color: T.copper },
  title: { fontSize: 17, fontWeight: '900', color: T.nav },
  op: { paddingHorizontal: 12, height: 32, justifyContent: 'center', borderRadius: 16, borderWidth: 1, borderColor: T.border, marginRight: 8, backgroundColor: T.surface },
  opOn: { backgroundColor: T.nav, borderColor: T.nav },
  opText: { fontSize: 12.5, fontWeight: '700', color: T.nav },
  values: { flexDirection: 'row', alignItems: 'center', marginTop: 14 },
  input: { height: 44, borderWidth: 1, borderColor: T.border, borderRadius: 10, paddingHorizontal: 12, fontSize: 15, fontWeight: '700', color: T.ink, backgroundColor: T.surface },
  actions: { flexDirection: 'row', alignItems: 'center', marginTop: 18 },
  ghost: { paddingHorizontal: 14, height: 42, justifyContent: 'center' },
  ghostText: { fontSize: 14, fontWeight: '800', color: T.nav },
  btn: { backgroundColor: T.nav, paddingHorizontal: 20, height: 42, borderRadius: 10, justifyContent: 'center', marginLeft: 4 },
  btnText: { color: '#fff', fontWeight: '800', fontSize: 14 },
});
