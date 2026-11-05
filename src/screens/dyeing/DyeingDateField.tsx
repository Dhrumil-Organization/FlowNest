// FILE: src/screens/dyeing/DyeingDateField.tsx
// Compact date box used by Daily Update + Mill Hub (the ERP's <input type=date>).
//   web    -> a real <input type="date"> (react-native-web renders DOM)
//   native -> a box showing DD-MM-YYYY that opens the platform date picker
import DateTimePicker from '@react-native-community/datetimepicker';
import { T } from '@/src/theme';
import React, { useState } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { showDate, toISO, todayISO } from './dyeingModel';

type Props = {
  value: string; // YYYY-MM-DD
  onChange: (iso: string) => void;
  max?: string; // YYYY-MM-DD (default today)
  min?: string;
  compact?: boolean;
};

const MONO = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' });

const fromISO = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};

export function DyeingDateField({ value, onChange, max = todayISO(), min, compact }: Props) {
  const [open, setOpen] = useState(false);

  if (Platform.OS === 'web') {
    return React.createElement('input', {
      type: 'date',
      value,
      max,
      min,
      onChange: (e: any) => { if (e?.target?.value) onChange(String(e.target.value)); },
      style: {
        border: `1.5px solid ${T.border}`, borderRadius: 9, padding: compact ? '6px 7px' : '7px 9px',
        fontSize: compact ? 11 : 12, fontFamily: 'monospace', color: T.ink, background: T.surface, outline: 'none',
      },
    });
  }

  return (
    <View>
      <TouchableOpacity onPress={() => setOpen(true)} style={[st.box, compact && st.boxCompact]} activeOpacity={0.7}>
        <Text style={[st.text, compact && { fontSize: 11 }]}>{showDate(value)}</Text>
      </TouchableOpacity>
      {open && (
        <DateTimePicker
          value={fromISO(value)}
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          maximumDate={max ? fromISO(max) : undefined}
          minimumDate={min ? fromISO(min) : undefined}
          onChange={(event: any, date?: Date) => {
            setOpen(false);
            if (event?.type === 'dismissed' || !date) return;
            onChange(toISO(date));
          }}
        />
      )}
    </View>
  );
}

const st = StyleSheet.create({
  box: {
    borderWidth: 1.5, borderColor: T.border, borderRadius: 9, backgroundColor: T.surface,
    paddingHorizontal: 10, paddingVertical: 7,
  },
  boxCompact: { paddingHorizontal: 8, paddingVertical: 6 },
  text: { fontSize: 12, fontWeight: '700', color: T.ink, fontFamily: MONO },
});
