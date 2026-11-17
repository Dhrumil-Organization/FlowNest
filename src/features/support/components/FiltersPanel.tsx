// FILE: src/features/support/components/FiltersPanel.tsx
// IT Desk filters (apply to board, list, counts and the Excel export).
import { T } from '@/src/theme';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import type { ModuleOption } from '../modules';
import { addDaysYmd, DEV_SIDES, EMPTY_FILTERS, Filters, ItUser, PRIORITIES, toYmd, TYPES } from '../model';
import { Btn, DateInput, Field, Opt, Panel, Segmented, Select } from './ui';

type Props = { visible: boolean; onClose: () => void; value: Filters; onApply: (f: Filters) => void; users: ItUser[]; modules: ModuleOption[] };

const monthStart = () => { const d = new Date(); return toYmd(new Date(d.getFullYear(), d.getMonth(), 1)); };
const weekStart = () => { const d = new Date(); const day = (d.getDay() + 6) % 7; d.setDate(d.getDate() - day); return toYmd(d); };

export function FiltersPanel({ visible, onClose, value, onApply, users, modules }: Props) {
  const [f, setF] = useState<Filters>(value);
  React.useEffect(() => { if (visible) setF(value); }, [visible, value]);
  const set = (p: Partial<Filters>) => setF((x) => ({ ...x, ...p }));
  const userOpts: Opt[] = [
    { value: '', label: 'Everybody', icon: 'groups' },
    { value: 'me', label: 'Assigned to me', icon: 'person' },
    { value: 'none', label: 'Unassigned', icon: 'person-outline' },
    ...users.map((u) => ({ value: String(u.id), label: u.name, sub: u.active ? `@${u.username}` : 'switched off', avatar: { name: u.name, id: u.id, color: u.color } })),
  ];
  const range = f.from && f.to ? `${f.from}-${f.to}` : '';
  const today = String(toYmd(new Date()));
  const ranges = [
    { value: '', label: 'Any date' },
    { value: `${today}-${today}`, label: 'Today' },
    { value: `${weekStart()}-${today}`, label: 'This week' },
    { value: `${monthStart()}-${today}`, label: 'This month' },
    { value: `${addDaysYmd(-30)}-${today}`, label: 'Last 30 days' },
  ];
  return (
    <Panel visible={visible} onClose={onClose} title="Filters" subtitle="Board, list, counts and Excel use these" width={460}
      footer={<><Btn title="Clear all" kind="ghost" onPress={() => setF({ ...EMPTY_FILTERS, q: f.q })} /><Btn title="Apply" icon="filter-alt" onPress={() => { onApply(f); onClose(); }} /></>}>
      <ScrollView contentContainerStyle={{ padding: 18 }}>
        <Field label="Show"><Segmented value={f.kind} onChange={(v) => set({ kind: v })} scroll options={[{ value: '', label: 'Everything' }, { value: 'task', label: 'IT tasks', icon: 'task-alt' }, { value: 'ticket', label: 'User tickets', icon: 'confirmation-number' }]} /></Field>
        <Field label="Assigned to"><Select value={f.assignee} options={userOpts} onChange={(v) => set({ assignee: v })} title="Assigned to" /></Field>
        <Field label="Created by"><Segmented value={f.created_by} onChange={(v) => set({ created_by: v })} scroll options={[{ value: '', label: 'Anyone' }, { value: 'me', label: 'Me' }, { value: 'it', label: 'IT team' }, { value: 'client', label: 'Users' }]} /></Field>
        <Field label="Priority"><Segmented value={f.priority} onChange={(v) => set({ priority: v })} scroll options={[{ value: '', label: 'All' }, ...PRIORITIES.map((p) => ({ value: String(p.key), label: p.label, color: p.color }))]} /></Field>
        <Field label="Type"><Segmented value={f.type} onChange={(v) => set({ type: v })} scroll options={[{ value: '', label: 'All' }, ...TYPES.map((t) => ({ value: t.key, label: t.label, icon: t.icon, color: t.color }))]} /></Field>
        <Field label="Dev side"><Segmented value={f.dev_side} onChange={(v) => set({ dev_side: v })} scroll options={[{ value: '', label: 'All' }, ...DEV_SIDES.map((d) => ({ value: d.key, label: d.label }))]} /></Field>
        <Field label="Due"><Segmented value={f.due} onChange={(v) => set({ due: v })} scroll options={[{ value: '', label: 'Any' }, { value: 'overdue', label: 'Overdue', color: T.red }, { value: 'today', label: 'Today' }, { value: 'week', label: 'Next 7 days' }]} /></Field>
        <Field label="Module"><Select value={f.module} options={[{ value: '', label: 'All modules', icon: 'apps' }, ...modules.map((m) => ({ value: m.value, label: m.label, sub: m.area }))]} onChange={(v) => set({ module: v })} title="Module" /></Field>
        <Field label="Date (task day / raised day)">
          <Segmented value={ranges.some((r) => r.value === range) ? range : '__custom'} onChange={(v) => { if (v === '__custom') return; const [a, b] = String(v).split('-'); set({ from: a || '', to: b || '' }); }} scroll options={[...ranges, ...(range && !ranges.some((r) => r.value === range) ? [{ value: '__custom', label: 'Custom' }] : [])]} />
          <View style={s.row}>
            <View style={{ flex: 1 }}><DateInput value={f.from ? Number(f.from) : null} onChange={(v) => set({ from: v ? String(v) : '' })} placeholder="From" title="From" /></View>
            <View style={{ flex: 1 }}><DateInput value={f.to ? Number(f.to) : null} onChange={(v) => set({ to: v ? String(v) : '' })} placeholder="To" title="To" /></View>
          </View>
        </Field>
      </ScrollView>
    </Panel>
  );
}

const s = StyleSheet.create({ row: { flexDirection: 'row', gap: 8, marginTop: 8 } });
