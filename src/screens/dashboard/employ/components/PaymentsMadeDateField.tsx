import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useEffect, useState } from 'react';
import { Modal, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type Props = {
  label: string;
  value: string; // YYYY-MM-DD, compatible with the existing ERP report filter
  minDate: string;
  maxDate: string;
  onChange: (value: string) => void;
};

const asDate = (iso: string): Date => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
  if (!match) return new Date();
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
};
const asIso = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const display = (iso: string): string => iso ? `${iso.slice(8, 10)}-${iso.slice(5, 7)}-${iso.slice(0, 4)}` : 'DD-MM-YYYY';

/** Uses an HTML date input on Expo Web and the installed native date picker on iOS/Android. */
export default function PaymentsMadeDateField({ label, value, minDate, maxDate, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Date>(() => asDate(value));
  useEffect(() => { if (!open) setDraft(asDate(value)); }, [open, value]);

  if (Platform.OS === 'web') {
    return (
      <View style={s.field}>
        <Text style={s.label}>{label.toUpperCase()}</Text>
        {React.createElement('input', {
          type: 'date', value, min: minDate, max: maxDate, lang: 'en-GB',
          'aria-label': `${label} date`,
          onChange: (event: any) => {
            const next = String(event?.target?.value || '');
            if (/^\d{4}-\d{2}-\d{2}$/.test(next) && next >= minDate && next <= maxDate) onChange(next);
          },
          style: {
            boxSizing: 'border-box', width: '100%', minWidth: 120, height: 34,
            border: '1px solid #E8DED5', borderRadius: 7, padding: '5px 7px',
            color: '#17212F', backgroundColor: '#FFFFFF', colorScheme: 'light',
            fontSize: 12, cursor: 'pointer', outlineOffset: 2,
          },
        })}
        <Text style={s.hint}>{display(value)}</Text>
      </View>
    );
  }

  const onPick = (event: any, selected?: Date) => {
    if (Platform.OS === 'android') setOpen(false);
    if (event?.type === 'dismissed' || !selected) return;
    if (Platform.OS === 'ios') setDraft(selected);
    else onChange(asIso(selected));
  };
  return (
    <View style={s.field}>
      <Text style={s.label}>{label.toUpperCase()}</Text>
      <TouchableOpacity style={s.nativeField} accessibilityRole="button" accessibilityLabel={`Choose ${label.toLowerCase()} date`} onPress={() => { setDraft(asDate(value)); setOpen(true); }}>
        <Text style={s.nativeDate}>{display(value)}</Text><Text style={s.calendar}>▦</Text>
      </TouchableOpacity>
      {open && Platform.OS === 'android' && (
        <DateTimePicker value={asDate(value)} mode="date" display="default"
          minimumDate={asDate(minDate)} maximumDate={asDate(maxDate)} onChange={onPick} />
      )}
      {Platform.OS === 'ios' && (
        <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
          <View style={s.overlay}><View style={s.modalCard}>
            <Text style={s.modalTitle}>Select {label.toLowerCase()} date</Text>
            <DateTimePicker value={draft} mode="date" display="spinner" style={{ alignSelf: 'stretch' }}
              minimumDate={asDate(minDate)} maximumDate={asDate(maxDate)} onChange={onPick} />
            <View style={s.actions}>
              <TouchableOpacity onPress={() => setOpen(false)} style={s.cancel}><Text style={s.cancelText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => { onChange(asIso(draft)); setOpen(false); }} style={s.done}><Text style={s.doneText}>Done</Text></TouchableOpacity>
            </View>
          </View></View>
        </Modal>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  field: { flexGrow: 1, minWidth: 126, flexShrink: 1 },
  label: { fontSize: 9, fontWeight: '800', color: '#A29389', marginBottom: 4 },
  hint: { fontSize: 9, color: '#A29389', marginTop: 3 },
  nativeField: { height: 36, borderWidth: 1, borderColor: '#E8DED5', borderRadius: 7, backgroundColor: '#FFFFFF', paddingHorizontal: 9, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  nativeDate: { color: '#17212F', fontSize: 12, fontWeight: '700' },
  calendar: { fontSize: 17, color: '#91492D' },
  overlay: { flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.35)', padding: 20 },
  modalCard: { backgroundColor: '#FFF', borderRadius: 13, padding: 15 },
  modalTitle: { fontSize: 14, fontWeight: '800', color: '#17212F' },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 10 },
  cancel: { padding: 11 }, cancelText: { color: '#91492D', fontWeight: '700' },
  done: { backgroundColor: '#91492D', borderRadius: 7, padding: 11 }, doneText: { color: '#FFF', fontWeight: '800' },
});
