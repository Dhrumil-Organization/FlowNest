// FILE: src/components/ProcessChemicalsNEW/RecipeDateField.tsx
// Date input that looks EXACTLY like the other form fields (same height, radius, border, font, focus ring) —
// shared by Process Chemicals and Shade Recipe. Value is always 'YYYY-MM-DD'; it is shown as dd/mm/yyyy.
//   • Web     → the box is a normal styled field; a transparent native <input type="date"> sits on top of it,
//               so click / tap / keyboard open the browser calendar (and typing a date works) without the
//               browser's own ugly date styling showing through.
//   • iOS/And → the app's built-in calendar sheet (ProductionOrderNEW/DateField) in the same box style.
import { T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { useState } from 'react';
import { Platform, Text, View } from 'react-native';
import DateField from '../ProductionOrderNEW/DateField';
import { FieldError, FieldLabel, u } from '../StoreItemMasterNew/ui';
import { fmtDate } from './model';

type Props = { label?: string; value: string; onChange: (iso: string) => void; required?: boolean; error?: string };

export default function RecipeDateField({ label = 'Date', value, onChange, required, error }: Props) {
  const [focus, setFocus] = useState(false);
  const ring = [focus && { borderColor: T.copper, borderWidth: 1.5 }, !!error && { borderColor: T.red }];

  if (Platform.OS !== 'web') {
    return (
      <View>
        <FieldLabel label={label} required={required} />
        <DateField value={value} onChange={onChange} textSize={15} placeholder="dd/mm/yyyy"
          style={[{ minHeight: 46, borderRadius: 12, paddingHorizontal: 12, backgroundColor: T.surface, borderColor: T.border }, !!error && { borderColor: T.red }]} />
        <FieldError text={error} />
      </View>
    );
  }
  return (
    <View>
      <FieldLabel label={label} required={required} />
      <View style={[u.input, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, position: 'relative' }, ...ring]}>
        <Text style={{ fontSize: 15, color: value ? T.ink : T.muted }} numberOfLines={1}>{value ? fmtDate(value) : 'dd/mm/yyyy'}</Text>
        <Icon name="event" size={20} color={T.muted} />
        {React.createElement('input', {
          type: 'date',
          value: value || '',
          'aria-label': label,
          onChange: (e: any) => onChange(e.target.value),
          onFocus: () => setFocus(true),
          onBlur: () => setFocus(false),
          onClick: (e: any) => { try { e.currentTarget.showPicker && e.currentTarget.showPicker(); } catch { /* older browsers */ } },
          style: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer', border: 0, padding: 0, margin: 0, boxSizing: 'border-box', outline: 'none', fontSize: 16, colorScheme: 'light dark' },
        })}
      </View>
      <FieldError text={error} />
    </View>
  );
}
