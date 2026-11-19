// FILE: src/features/support/components/DoneDialog.tsx
// Shown when a card goes to "Done" (drag to the Done column, or "Mark done" / "Resolve").
//   • Actual time — required (SUPPORT_ACTUAL_TIME_REQUIRED, like the "Actual Time Compulsory"
//     column of the IT sheet); pre-filled when the card already has it
//   • What was done — required for a user ticket (the user sees it), optional for an IT task
import { T } from '@/src/theme';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { fmtMinutes, Ticket } from '../model';
import { Btn, Dialog, Field, Input } from './ui';

type Props = {
  ticket: Ticket | null;
  requireTime: boolean;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: (v: { spent_min: number; note: string }) => void;
};

const QUICK = [15, 30, 60, 120, 240, 480];

export function DoneDialog({ ticket, requireTime, busy, onCancel, onConfirm }: Props) {
  const [h, setH] = useState('');
  const [m, setM] = useState('');
  const [note, setNote] = useState('');
  useEffect(() => {
    if (!ticket) return;
    const s = ticket.spent_min || 0;
    setH(s ? String(Math.floor(s / 60)) : '');
    setM(s ? String(s % 60) : '');
    setNote('');
  }, [ticket]);
  if (!ticket) return null;
  const isTicket = ticket.kind === 'ticket';
  const needNote = isTicket && !ticket.has_resolution;
  const minutes = (Number(h) || 0) * 60 + Math.min(59, Number(m) || 0);
  const ok = (!requireTime || minutes > 0) && (!needNote || note.trim().length > 0);
  const est = ticket.est_min || 0;
  // the estimate is the first quick choice ("took as planned")
  const quick = est && !QUICK.includes(est) ? [est, ...QUICK] : QUICK;

  return (
    <Dialog visible={!!ticket} onClose={onCancel} title={`${isTicket ? 'Resolve' : 'Done'} · ${ticket.no}`} width={460}
      footer={<><Btn title="Cancel" kind="ghost" onPress={onCancel} /><Btn title={isTicket ? 'Resolve' : 'Mark done'} kind="success" icon="check" busy={busy} disabled={!ok} onPress={() => onConfirm({ spent_min: minutes, note: note.trim() })} /></>}>
      <Text style={d.title} numberOfLines={2}>{ticket.title}</Text>
      <Field label="Actual time" required={requireTime} hint={est ? `Estimated: ${fmtMinutes(est)}` : undefined}>
        <View style={d.row}>
          <View style={{ flex: 1 }}><Input value={h} onChangeText={(t) => setH(t.replace(/[^0-9]/g, '').slice(0, 4))} keyboardType="number-pad" placeholder="0" right={<Text style={d.unit}>h</Text>} autoFocus={!ticket.spent_min} /></View>
          <View style={{ flex: 1 }}><Input value={m} onChangeText={(t) => setM(t.replace(/[^0-9]/g, '').slice(0, 2))} keyboardType="number-pad" placeholder="0" right={<Text style={d.unit}>min</Text>} /></View>
        </View>
        <View style={d.quick}>
          {quick.map((q) => {
            const on = q === minutes;
            return (
              <TouchableOpacity key={q} style={[d.chip, on && { backgroundColor: T.green, borderColor: T.green }]} onPress={() => { setH(String(Math.floor(q / 60))); setM(String(q % 60)); }} accessibilityRole="button">
                <Text style={[d.chipText, on && { color: '#fff' }]}>{fmtMinutes(q)}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </Field>
      <Field label={isTicket ? 'What was done' : 'What was done (optional)'} required={needNote}
        hint={isTicket ? `${ticket.client?.name || 'The user'} will see this note.` : undefined}>
        <Input value={note} onChangeText={setNote} placeholder={isTicket ? 'e.g. Fixed the beam total query — please check again' : 'Short note for the team / Excel'} multiline compact />
      </Field>
    </Dialog>
  );
}

const d = StyleSheet.create({
  title: { fontSize: 13.5, fontWeight: '800', color: T.ink, marginBottom: 12 },
  row: { flexDirection: 'row', gap: 8 },
  unit: { color: T.muted, fontWeight: '800', fontSize: 12 },
  quick: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  chip: { height: 28, paddingHorizontal: 10, borderRadius: 14, borderWidth: 1, borderColor: T.border, backgroundColor: T.surface, alignItems: 'center', justifyContent: 'center' },
  chipText: { fontSize: 12, fontWeight: '800', color: T.nav },
});
