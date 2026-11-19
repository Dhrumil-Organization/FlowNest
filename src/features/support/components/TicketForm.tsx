// FILE: src/features/support/components/TicketForm.tsx
// New / edit form — IT Desk (all fields) and Raise ticket (what a user needs to say).
import { T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { ModuleOption } from '../modules';
import { moduleLabel } from '../modules';
import { DEV_SIDES, ItUser, PRIORITIES, Status, STATUSES, TicketDetail, todayYmd, TYPES } from '../model';
import { AddPictures, Thumbs } from './Pictures';
import { Btn, DateInput, Field, Input, Opt, Segmented, Select, useLayout } from './ui';

export type FormPicture = { key: string; uri: string; name: string; sub?: string };
export type FormValues = Record<string, any>;

type Props = {
  realm: 'it' | 'client';
  initial?: TicketDetail | null;
  status?: Status;
  users?: ItUser[];
  me?: ItUser | null;
  modules: ModuleOption[];
  presetModule?: ModuleOption | null;
  pictures?: FormPicture[];
  onPictures?: (p: FormPicture[]) => void;
  busy?: boolean;
  onSubmit: (v: FormValues) => void;
  onCancel: () => void;
  /** a new card straight into Done needs the actual time */
  actualTimeRequired?: boolean;
};

const uid = () => Math.random().toString(36).slice(2, 9);

export function TicketForm({ realm, initial, status = 'todo', users = [], me, modules, presetModule, pictures = [], onPictures, busy, onSubmit, onCancel, actualTimeRequired = true }: Props) {
  const { phone } = useLayout();
  const isIt = realm === 'it';
  const edit = !!initial;
  const [title, setTitle] = useState(initial?.title || '');
  const [body, setBody] = useState(initial?.body || '');
  const [type, setType] = useState<string>(initial?.type || (isIt ? 'task' : 'bug'));
  const [priority, setPriority] = useState<number>(initial?.priority || 2);
  const [st, setSt] = useState<Status>(initial?.status || status);
  const [assignee, setAssignee] = useState<string>(initial ? (initial.assignee ? String(initial.assignee.id) : '') : isIt && me ? String(me.id) : '');
  const presetValue = initial ? initial.module : presetModule?.value || '';
  const [module, setModule] = useState<string>(presetValue);
  const [workDate, setWorkDate] = useState<number | null>(initial?.work_date || (isIt ? todayYmd() : null));
  const [dueDate, setDueDate] = useState<number | null>(initial?.due_date || null);
  const [hours, setHours] = useState(initial?.spent_min ? String(Math.floor(initial.spent_min / 60)) : '');
  const [mins, setMins] = useState(initial?.spent_min ? String(initial.spent_min % 60) : '');
  const [labels, setLabels] = useState(initial?.labels.join(', ') || '');
  const [devSide, setDevSide] = useState<string>(initial?.dev_side || '');
  const [estH, setEstH] = useState(initial?.est_min ? String(Math.floor(initial.est_min / 60)) : '');
  const [estM, setEstM] = useState(initial?.est_min ? String(initial.est_min % 60) : '');
  const [timeErr, setTimeErr] = useState('');
  const [err, setErr] = useState('');

  const typeOpts = TYPES.filter((t) => isIt || t.client);
  const userOpts: Opt[] = useMemo(() => [
    { value: '', label: 'Unassigned', icon: 'person-outline', color: T.muted },
    ...users.filter((u) => u.active || String(u.id) === assignee).map((u) => ({ value: String(u.id), label: u.name, sub: u.role === 'admin' ? 'Admin' : `@${u.username}`, avatar: { name: u.name, id: u.id, color: u.color } })),
  ], [users, assignee]);
  const moduleOpts: Opt[] = useMemo(() => {
    const list = modules.map((m) => ({ value: m.value, label: m.label, sub: m.depth === 0 ? m.area : m.area, icon: m.value === 'new_module' ? 'auto-awesome' : m.value === 'general' ? 'apps' : m.depth === 0 ? 'folder' : 'article' }));
    if (module && !list.some((o) => o.value === module)) list.unshift({ value: module, label: initial?.module_label || module, sub: 'current', icon: 'article' });
    return list;
  }, [modules, module, initial]);

  const submit = () => {
    if (!title.trim()) { setErr(isIt ? 'Enter the title.' : 'Write in one line what the problem / request is.'); return; }
    setErr('');
    const spent = (Number(hours) || 0) * 60 + Math.min(59, Number(mins) || 0);
    const doneNow = edit ? initial?.status === 'done' : st === 'done';
    if (isIt && doneNow && actualTimeRequired && spent <= 0) { setTimeErr('Actual time is required for a card in Done.'); return; }
    setTimeErr('');
    const m = modules.find((x) => x.value === module) || null;
    const v: FormValues = {
      title: title.trim(),
      body: body.trim(),
      type,
      priority,
      module,
      module_label: m ? moduleLabel(m) : initial?.module === module ? initial?.module_label || '' : '',
    };
    if (isIt) {
      Object.assign(v, {
        assignee_id: assignee || null,
        work_date: workDate || '',
        due_date: dueDate || '',
        spent_min: spent,
        est_min: (Number(estH) || 0) * 60 + Math.min(59, Number(estM) || 0),
        dev_side: devSide,
        labels,
      });
      if (!edit) v.status = st;
    }
    onSubmit(v);
  };

  const pics = (
    <Field label={isIt ? 'Pictures' : 'Screenshots / photos'} hint={isIt ? undefined : 'A screenshot shows the IT team exactly what you see.'}>
      <Thumbs pics={pictures} onRemove={(k) => onPictures?.(pictures.filter((p) => p.key !== k))} />
      <View style={{ height: pictures.length ? 8 : 0 }} />
      <AddPictures onAdd={(list) => onPictures?.([...pictures, ...list.map((p) => ({ key: uid(), uri: p.uri, name: p.name }))].slice(-8))} />
    </Field>
  );

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={f.wrap} keyboardShouldPersistTaps="handled">
        {!isIt ? (
          <Field label="What is it about?" required>
            <View style={f.typeGrid}>
              {typeOpts.map((t) => {
                const on = type === t.key;
                return (
                  <TouchableOpacity key={t.key} onPress={() => setType(t.key)} style={[f.typeCard, phone && { width: '48%' as any }, on && { borderColor: t.color, backgroundColor: `${t.color}10` }]} activeOpacity={0.8} accessibilityRole="radio" accessibilityState={{ selected: on }}>
                    <Icon name={t.icon as any} size={22} color={t.color} />
                    <Text style={[f.typeTitle, on && { color: t.color }]}>{t.label}</Text>
                    <Text style={f.typeHint} numberOfLines={2}>{t.hint}</Text>
                    {on ? <View style={[f.check, { backgroundColor: t.color }]}><Icon name="check" size={12} color="#fff" /></View> : null}
                  </TouchableOpacity>
                );
              })}
            </View>
          </Field>
        ) : null}

        <Field label={isIt ? 'Title' : 'Short summary'} required error={err}>
          <Input value={title} onChangeText={setTitle} placeholder={isIt ? 'What needs to be done' : 'e.g. Beam shortage report shows wrong metres'} maxLength={250} autoFocus={!edit} />
        </Field>

        <Field label={isIt ? 'Module' : 'Where in FlowNest / Mill Hub?'} hint={!isIt && presetModule && module === presetModule.value ? 'Picked from the screen you were on — change it if needed.' : undefined}>
          <Select value={module} options={moduleOpts} onChange={setModule} title="Module" placeholder="Select the module / screen" icon="apps" clearable />
        </Field>

        <Field label="Details" hint={isIt ? undefined : 'Steps, what you expected, what happened instead, any numbers (beam no, taka no …).'}>
          <Input value={body} onChangeText={setBody} placeholder={isIt ? 'Notes, steps, links…' : 'Describe it in your own words'} multiline maxLength={20000} />
        </Field>

        <View style={[f.row, phone && { flexDirection: 'column', gap: 0 }]}>
          {isIt ? (
            <Field label="Type" style={f.cell}>
              <Select value={type} options={typeOpts.map((t) => ({ value: t.key, label: t.label, icon: t.icon, color: t.color }))} onChange={setType} title="Type" searchable={false} />
            </Field>
          ) : null}
          <Field label="Priority" style={f.cell}>
            <Segmented value={priority} onChange={setPriority} scroll options={PRIORITIES.map((p) => ({ value: p.key, label: p.label, color: p.color }))} />
          </Field>
        </View>

        {isIt ? (
          <>
            <View style={[f.row, phone && { flexDirection: 'column', gap: 0 }]}>
              <Field label="Assigned to" style={f.cell}>
                <Select value={assignee} options={userOpts} onChange={setAssignee} title="Assign to" icon="person" />
              </Field>
              {!edit ? (
                <Field label="Column" style={f.cell}>
                  <Select value={st} options={STATUSES.map((s) => ({ value: s.key, label: s.label, icon: s.icon, color: s.color }))} onChange={(v) => setSt(v as Status)} title="Column" searchable={false} />
                </Field>
              ) : null}
            </View>
            <View style={[f.row, phone && { flexDirection: 'column', gap: 0 }]}>
              <Field label="Work date" style={f.cell}><DateInput value={workDate} onChange={setWorkDate} title="Work date" clearable={false} /></Field>
              <Field label="Due date" style={f.cell}><DateInput value={dueDate} onChange={setDueDate} title="Due date" /></Field>
            </View>
            <View style={[f.row, phone && { flexDirection: 'column', gap: 0 }]}>
              <Field label="Dev side" style={f.cell}>
                <Select value={devSide} options={[{ value: '', label: 'Not set', icon: 'remove', color: T.muted }, ...DEV_SIDES.map((d) => ({ value: d.key, label: d.label, icon: 'code', color: d.color }))]} onChange={setDevSide} title="Dev side" searchable={false} icon="code" />
              </Field>
              <Field label="Labels" style={f.cell} hint="Comma separated, e.g. android, printer">
                <Input value={labels} onChangeText={setLabels} placeholder="label1, label2" icon="sell" />
              </Field>
            </View>
            <View style={[f.row, phone && { flexDirection: 'column', gap: 0 }]}>
              <Field label="Est time" style={f.cell}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <View style={{ flex: 1 }}><Input value={estH} onChangeText={(t) => setEstH(t.replace(/[^0-9]/g, '').slice(0, 4))} keyboardType="number-pad" placeholder="0" right={<Text style={f.unit}>h</Text>} /></View>
                  <View style={{ flex: 1 }}><Input value={estM} onChangeText={(t) => setEstM(t.replace(/[^0-9]/g, '').slice(0, 2))} keyboardType="number-pad" placeholder="0" right={<Text style={f.unit}>min</Text>} /></View>
                </View>
              </Field>
              <Field label="Actual time" style={f.cell} required={actualTimeRequired && (edit ? initial?.status === 'done' : st === 'done')} error={timeErr} hint={!timeErr && actualTimeRequired ? 'Required when the card goes to Done' : undefined}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <View style={{ flex: 1 }}><Input value={hours} onChangeText={(t) => setHours(t.replace(/[^0-9]/g, '').slice(0, 4))} keyboardType="number-pad" placeholder="0" right={<Text style={f.unit}>h</Text>} /></View>
                  <View style={{ flex: 1 }}><Input value={mins} onChangeText={(t) => setMins(t.replace(/[^0-9]/g, '').slice(0, 2))} keyboardType="number-pad" placeholder="0" right={<Text style={f.unit}>min</Text>} /></View>
                </View>
              </Field>
            </View>
          </>
        ) : null}

        {!edit ? pics : null}
      </ScrollView>
      <View style={f.foot}>
        <Btn title="Cancel" kind="ghost" onPress={onCancel} disabled={busy} />
        <Btn title={edit ? 'Save changes' : isIt ? 'Create task' : 'Raise ticket'} icon={edit ? 'save' : isIt ? 'add-task' : 'send'} onPress={submit} busy={busy} />
      </View>
    </View>
  );
}

const f = StyleSheet.create({
  wrap: { padding: 18, paddingBottom: 30 },
  row: { flexDirection: 'row', gap: 12 },
  cell: { flex: 1, minWidth: 0 },
  unit: { color: T.muted, fontWeight: '800', fontSize: 12 },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeCard: { width: '23.5%' as any, minWidth: 130, flexGrow: 1, padding: 12, borderRadius: 12, borderWidth: 1.5, borderColor: T.border, backgroundColor: T.surface, gap: 4 },
  typeTitle: { fontSize: 13.5, fontWeight: '900', color: T.nav },
  typeHint: { fontSize: 11, color: T.muted, fontWeight: '600', lineHeight: 15 },
  check: { position: 'absolute', top: 8, right: 8, width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  foot: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, paddingHorizontal: 18, paddingVertical: 12, borderTopWidth: 1, borderTopColor: T.border, backgroundColor: T.surface },
});
