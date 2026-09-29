// FILE: src/screens/beamGaitingNew/fields.tsx
// NEW ERP — Beam Gaiting: date + time inputs (web <input type=date|time>, native
// @react-native-community/datetimepicker). Values are ISO strings (like legacy
// FormState: `selectedDate.toISOString()`); display uses the legacy formatters.
import DateTimePicker from '@react-native-community/datetimepicker';
import { T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { useState } from 'react';
import { Platform, Text, TouchableOpacity, View } from 'react-native';
import { st } from '../inquiry/ui';
import { formatDate, showTime } from './beamGaitingApi';

const pad = (n: number) => String(n).padStart(2, '0');
const validDate = (v: any) => {
  const d = v ? new Date(v) : new Date();
  return Number.isNaN(d.getTime()) ? new Date() : d;
};

const webBox = (on: boolean) => ({
  height: 42, border: `1px solid ${on ? `${T.copper}88` : T.border}`, borderRadius: 10, padding: '0 11px',
  fontSize: 13, fontWeight: 700, color: T.ink, background: T.surface, outline: 'none', width: '100%',
  boxSizing: 'border-box', fontFamily: 'inherit',
});

function Label({ text, required }: { text: string; required?: boolean }) {
  return <Text style={st.label}>{text}{required ? <Text style={{ color: T.red }}> *</Text> : null}</Text>;
}

/** Date picker. Empty value displays today's date (legacy formatDate('') === today). */
export function DateInput({ label, required, value, onChange }: {
  label: string; required?: boolean; value: any; onChange: (iso: string) => void;
}) {
  const [open, setOpen] = useState(false);
  if (Platform.OS === 'web') {
    const d = validDate(value);
    const iso = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    return (
      <View style={{ marginBottom: 10 }}>
        <Label text={label} required={required} />
        {React.createElement('input', {
          type: 'date',
          value: iso,
          onChange: (e: any) => {
            const v = String(e?.target?.value || '');
            if (!v) return;
            const [y, m, dd] = v.split('-').map(Number);
            const cur = validDate(value);
            // keep the time-of-day the value already had (native picker does the same)
            onChange(new Date(y, m - 1, dd, cur.getHours(), cur.getMinutes(), cur.getSeconds()).toISOString());
          },
          style: webBox(true) as any,
        })}
      </View>
    );
  }
  return (
    <View style={{ marginBottom: 10 }}>
      <Label text={label} required={required} />
      <TouchableOpacity onPress={() => setOpen(true)} style={[st.select, { borderColor: `${T.copper}88` }]} activeOpacity={0.7}>
        <Text style={[st.selectText, { flex: 1 }]}>{formatDate(value)}</Text>
        <Icon name="event" size={17} color={T.muted} />
      </TouchableOpacity>
      {open && (
        <DateTimePicker
          value={validDate(value)}
          mode="date"
          display="default"
          onChange={(event: any, date?: Date) => {
            setOpen(false);
            if (event?.type === 'dismissed' || !date) return;
            onChange(date.toISOString());
          }}
        />
      )}
    </View>
  );
}

/** Time picker (24h). Display = legacy toLocaleTimeString hh:mm. */
export function TimeInput({ label, required, value, onChange }: {
  label: string; required?: boolean; value: any; onChange: (iso: string) => void;
}) {
  const [open, setOpen] = useState(false);
  if (Platform.OS === 'web') {
    const d = validDate(value);
    return (
      <View style={{ marginBottom: 10 }}>
        <Label text={label} required={required} />
        {React.createElement('input', {
          type: 'time',
          value: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
          onChange: (e: any) => {
            const v = String(e?.target?.value || '');
            if (!v) return;
            const [h, mi] = v.split(':').map(Number);
            const n = new Date();
            onChange(new Date(n.getFullYear(), n.getMonth(), n.getDate(), h, mi, 0).toISOString());
          },
          style: webBox(true) as any,
        })}
      </View>
    );
  }
  return (
    <View style={{ marginBottom: 10 }}>
      <Label text={label} required={required} />
      <TouchableOpacity onPress={() => setOpen(true)} style={[st.select, { borderColor: `${T.copper}88` }]} activeOpacity={0.7}>
        <Text style={[st.selectText, { flex: 1 }]}>{showTime(value)}</Text>
        <Icon name="schedule" size={17} color={T.muted} />
      </TouchableOpacity>
      {open && (
        <DateTimePicker
          value={validDate(value)}
          mode="time"
          is24Hour
          display="spinner"
          onChange={(event: any, time?: Date) => {
            setOpen(false);
            if (event?.type === 'dismissed' || !time) return;
            onChange(time.toISOString());
          }}
        />
      )}
    </View>
  );
}
