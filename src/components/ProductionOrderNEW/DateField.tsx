// FILE: src/components/ProductionOrderNEW/DateField.tsx
// Date picker for the Production Orders screens. Value is always 'YYYY-MM-DD'.
//   • Web     → native browser calendar (<input type="date">), opens on click anywhere.
//   • iOS/And → small built-in calendar sheet (no extra npm dependency).
import { T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { useMemo, useState } from 'react';
import { Modal, Platform, Pressable, Text, TouchableOpacity, View } from 'react-native';
import { x } from './ui';

type Props = {
  value: string;
  onChange: (iso: string) => void;
  min?: string;
  max?: string;
  placeholder?: string;
  disabled?: boolean;
  style?: any;
};

const pad = (n: number) => String(n).padStart(2, '0');
const toISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseISO = (s: string): Date | null => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || '').trim());
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
};
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
/** 'YYYY-MM-DD' → '21 Oct 2026' for display on mobile. */
const pretty = (iso: string) => {
  const d = parseISO(iso);
  return d ? `${pad(d.getDate())} ${MONTHS[d.getMonth()].slice(0, 3)} ${d.getFullYear()}` : '';
};

export default function DateField({ value, onChange, min, max, placeholder = 'Select date', disabled, style }: Props) {
  if (Platform.OS === 'web') {
    return (
      <View style={[{ flexDirection: 'row', alignItems: 'center' }, style]}>
        {React.createElement('input', {
          type: 'date',
          value: value || '',
          min: min || undefined,
          max: max || undefined,
          disabled,
          onChange: (e: any) => onChange(e.target.value),
          // Open the calendar when clicking anywhere in the box, not just the icon.
          onClick: (e: any) => { try { e.currentTarget.showPicker && e.currentTarget.showPicker(); } catch { /* older browsers */ } },
          style: {
            flex: 1, width: '100%', minWidth: 0, boxSizing: 'border-box', minHeight: 38,
            padding: '8px 10px', fontSize: 13, fontFamily: 'inherit', color: T.ink,
            backgroundColor: T.surface, border: `1px solid ${T.border}`, borderRadius: 8,
            cursor: disabled ? 'default' : 'pointer', outline: 'none', colorScheme: 'light dark',
          },
        })}
      </View>
    );
  }
  return <NativeDateField value={value} onChange={onChange} min={min} max={max} placeholder={placeholder} disabled={disabled} style={style} />;
}

function NativeDateField({ value, onChange, min, max, placeholder, disabled, style }: Props) {
  const [open, setOpen] = useState(false);
  const selected = parseISO(value);
  const [cursor, setCursor] = useState<Date>(() => selected || new Date());
  const minD = parseISO(min || '');
  const maxD = parseISO(max || '');

  const cells = useMemo(() => {
    const y = cursor.getFullYear(); const m = cursor.getMonth();
    const startDow = new Date(y, m, 1).getDay();
    const days = new Date(y, m + 1, 0).getDate();
    const out: (Date | null)[] = [];
    for (let i = 0; i < startDow; i++) out.push(null);
    for (let d = 1; d <= days; d++) out.push(new Date(y, m, d));
    while (out.length % 7) out.push(null);
    return out;
  }, [cursor]);

  const isOff = (d: Date) => (minD && d < minD) || (maxD && d > maxD);
  const shift = (n: number) => setCursor((c) => new Date(c.getFullYear(), c.getMonth() + n, 1));
  const openPicker = () => { if (disabled) return; setCursor(selected || new Date()); setOpen(true); };
  const pick = (d: Date) => { if (isOff(d)) return; onChange(toISO(d)); setOpen(false); };
  const todayIso = toISO(new Date());

  return (
    <>
      <TouchableOpacity onPress={openPicker} activeOpacity={0.7} disabled={disabled}
        style={[x.input, { flexDirection: 'row', alignItems: 'center', gap: 6 }, style]}>
        <Text style={{ flex: 1, fontSize: 13, color: value ? T.ink : T.muted }} numberOfLines={1}>{pretty(value) || placeholder}</Text>
        <Icon name="event" size={16} color={T.muted} />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable onPress={() => setOpen(false)} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <Pressable onPress={() => undefined} style={{ width: '100%', maxWidth: 340, backgroundColor: T.surface, borderRadius: 14, padding: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
              <TouchableOpacity onPress={() => shift(-1)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Icon name="chevron-left" size={24} color={T.ink} />
              </TouchableOpacity>
              <Text style={{ flex: 1, textAlign: 'center', fontSize: 14, fontWeight: '800', color: T.ink }}>
                {MONTHS[cursor.getMonth()]} {cursor.getFullYear()}
              </Text>
              <TouchableOpacity onPress={() => shift(1)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Icon name="chevron-right" size={24} color={T.ink} />
              </TouchableOpacity>
            </View>
            <View style={{ flexDirection: 'row' }}>
              {DAYS.map((d) => (
                <Text key={d} style={{ width: `${100 / 7}%`, textAlign: 'center', fontSize: 10.5, fontWeight: '800', color: T.muted, paddingVertical: 4 }}>{d}</Text>
              ))}
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {cells.map((d, i) => {
                if (!d) return <View key={`e${i}`} style={{ width: `${100 / 7}%`, height: 38 }} />;
                const iso = toISO(d);
                const active = iso === value;
                const off = isOff(d);
                const today = iso === todayIso;
                return (
                  <TouchableOpacity key={iso} disabled={!!off} onPress={() => pick(d)}
                    style={{ width: `${100 / 7}%`, height: 38, alignItems: 'center', justifyContent: 'center' }}>
                    <View style={{
                      width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center',
                      backgroundColor: active ? T.copper : 'transparent',
                      borderWidth: today && !active ? 1 : 0, borderColor: T.copper,
                    }}>
                      <Text style={{ fontSize: 13, fontWeight: active ? '800' : '600', color: active ? '#fff' : off ? T.border : T.ink }}>{d.getDate()}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
              <TouchableOpacity onPress={() => { const t = new Date(); if (!isOff(t)) pick(t); else setCursor(t); }}>
                <Text style={{ fontSize: 12.5, fontWeight: '800', color: T.copper }}>Today</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setOpen(false)}>
                <Text style={{ fontSize: 12.5, fontWeight: '800', color: T.muted }}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
