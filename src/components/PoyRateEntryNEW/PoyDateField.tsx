// FILE: src/components/PoyRateEntryNEW/PoyDateField.tsx
// Cross-platform "applicable from" date pill (pattern from src/screens/dyeing/DyeingDateField.tsx).
//   web     -> a real <input type="date"> (react-native-web renders DOM), max = today
//   android -> pill showing the legacy formatDate() text, opens the native date dialog
//   ios     -> pill that opens an inline calendar inside a Sheet (legacy used display="default")
// maximumDate = today, exactly like the legacy DateTimePicker.
import { Sheet } from '@/src/components/StockVerificationNEW/ui';
import { T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useState } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { formatDate, fromISO, toISO } from './model';

type Props = { value: Date; onChange: (d: Date) => void; disabled?: boolean };

export function PoyDateField({ value, onChange, disabled }: Props) {
  const [open, setOpen] = useState(false);

  if (Platform.OS === 'web') {
    return (
      <View style={[st.pill, disabled && { opacity: 0.55 }]}>
        <Icon name="calendar-month" size={16} color={T.copper} />
        {React.createElement('input', {
          type: 'date',
          value: toISO(value),
          max: toISO(new Date()),
          disabled,
          'aria-label': 'Applicable from date',
          onChange: (e: any) => {
            const v = e?.target?.value;
            if (v) onChange(fromISO(String(v)));
          },
          style: {
            border: 'none', outline: 'none', background: 'transparent', color: T.ink,
            fontSize: 13, fontWeight: 700, padding: 0, minWidth: 0, cursor: 'pointer',
          },
        })}
      </View>
    );
  }

  const handleNative = (event: any, selected?: Date) => {
    setOpen(false);
    if (event?.type === 'dismissed' || !selected) return;
    onChange(selected);
  };

  return (
    <>
      <TouchableOpacity
        style={[st.pill, disabled && { opacity: 0.55 }]}
        onPress={() => setOpen(true)}
        disabled={disabled}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={`Date ${formatDate(value)}`}
      >
        <Icon name="calendar-month" size={16} color={T.copper} />
        <Text style={st.text} numberOfLines={1}>{formatDate(value)}</Text>
        <Icon name="expand-more" size={18} color={T.muted} />
      </TouchableOpacity>

      {Platform.OS === 'android' && open ? (
        <DateTimePicker value={value} mode="date" display="default" onChange={handleNative} maximumDate={new Date()} />
      ) : null}

      {Platform.OS === 'ios' ? (
        <Sheet open={open} onClose={() => setOpen(false)} eyebrow="POY RATE ENTRY" title="Select date" wideMax={420}>
          <View style={{ alignItems: 'center' }}>
            {open ? (
            <DateTimePicker
              value={value}
              mode="date"
              display="inline"
              onChange={handleNative}
              maximumDate={new Date()}
              themeVariant="light"
              accentColor={T.copper}
            />
            ) : null}
          </View>
        </Sheet>
      ) : null}
    </>
  );
}

const st = StyleSheet.create({
  pill: {
    height: 44, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12,
    borderRadius: 10, borderWidth: 1, borderColor: T.border, backgroundColor: T.surface,
  },
  text: { fontSize: 13, fontWeight: '700', color: T.ink },
});
