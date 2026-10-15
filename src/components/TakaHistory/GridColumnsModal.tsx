// FILE: src/components/TakaHistory/GridColumnsModal.tsx
// Show / hide grid columns: main columns one by one, step columns per field and per step.
import { T } from '@/src/theme';
import React, { useMemo } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import type { GridColumn } from './gridApi';

const STEP_FIELDS = ['Process', 'Design', 'Shade', 'Qty', 'Date'];

type Props = { visible: boolean; columns: GridColumn[]; hidden: Set<string>; onChange: (s: Set<string>) => void; onClose: () => void };

export default function GridColumnsModal({ visible, columns, hidden, onChange, onClose }: Props) {
  const main = useMemo(() => columns.filter((c) => !c.group), [columns]);
  const steps = useMemo(() => [...new Set(columns.filter((c) => c.group).map((c) => c.group as string))], [columns]);

  if (!visible) return null;

  const set = (names: string[], hide: boolean) => {
    const next = new Set(hidden);
    names.forEach((n) => (hide ? next.add(n) : next.delete(n)));
    onChange(next);
  };
  const namesOfStep = (g: string) => columns.filter((c) => c.group === g).map((c) => c.name);
  const namesOfField = (f: string) => columns.filter((c) => c.group && c.label === f).map((c) => c.name);
  const allHidden = (names: string[]) => names.length > 0 && names.every((n) => hidden.has(n));

  return (
    <Modal transparent animationType="fade" visible onRequestClose={onClose}>
      <Pressable style={st.backdrop} onPress={onClose}>
        <Pressable style={st.sheet} onPress={() => {}}>
          <View style={st.head}>
            <View style={{ flex: 1 }}>
              <Text style={st.eyebrow}>TAKA GRID</Text>
              <Text style={st.title}>Columns</Text>
            </View>
            <TouchableOpacity onPress={() => onChange(new Set())} accessibilityRole="button">
              <Text style={st.link}>Show all</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onClose} style={{ marginLeft: 16 }} accessibilityRole="button">
              <Text style={st.link}>Done</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator>
            <Text style={st.section}>Main columns</Text>
            {main.map((c) => (
              <Item key={c.name} label={c.name} value={!hidden.has(c.name)} disabled={c.name === 'Taka No'} onChange={(v) => set([c.name], !v)} />
            ))}

            {steps.length ? (
              <>
                <Text style={st.section}>Step fields (all steps)</Text>
                {STEP_FIELDS.map((f) => {
                  const names = namesOfField(f);
                  if (!names.length) return null;
                  return <Item key={f} label={f} value={!allHidden(names)} onChange={(v) => set(names, !v)} />;
                })}

                <Text style={st.section}>Steps</Text>
                {steps.map((g) => {
                  const names = namesOfStep(g);
                  return <Item key={g} label={g} value={!allHidden(names)} onChange={(v) => set(names, !v)} />;
                })}
              </>
            ) : null}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function Item({ label, value, onChange, disabled }: { label: string; value: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <View style={st.item}>
      <Text style={[st.itemText, disabled && { color: T.muted }]}>{label}</Text>
      <Switch value={value} onValueChange={onChange} disabled={disabled} trackColor={{ false: T.border, true: T.copper }} />
    </View>
  );
}

const st = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(15,27,45,0.45)', justifyContent: 'center', padding: 16 },
  sheet: { backgroundColor: T.surface, borderRadius: 14, borderWidth: 1, borderColor: T.border, padding: 16, maxHeight: '85%', width: '100%', maxWidth: 520, alignSelf: 'center' },
  head: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  eyebrow: { fontSize: 10.5, fontWeight: '800', letterSpacing: 0.8, color: T.copper },
  title: { fontSize: 18, fontWeight: '900', color: T.nav },
  link: { color: T.copper, fontWeight: '800', fontSize: 14 },
  section: { fontSize: 11, fontWeight: '800', letterSpacing: 0.6, color: T.muted, textTransform: 'uppercase', marginTop: 14, marginBottom: 4 },
  item: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: T.border },
  itemText: { fontSize: 14.5, fontWeight: '600', color: T.ink },
});
