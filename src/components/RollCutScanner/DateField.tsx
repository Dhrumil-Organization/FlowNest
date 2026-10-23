// FILE: src/components/RollCutScanner/DateField.tsx
// Date field with a calendar popup (pure React Native — works the same on phone and web, no extra package).
import { T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { fmtShowDate } from './api';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DOW = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const same = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

type Props = { label: string; value: Date; onChange: (d: Date) => void };

export default function DateField({ label, value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(new Date(value.getFullYear(), value.getMonth(), 1));
  const today = new Date();

  const openIt = () => {
    setView(new Date(value.getFullYear(), value.getMonth(), 1));
    setOpen(true);
  };
  const go = (months: number) => setView((v) => new Date(v.getFullYear(), v.getMonth() + months, 1));
  const pick = (d: Date) => {
    onChange(d);
    setOpen(false);
  };

  const y = view.getFullYear();
  const m = view.getMonth();
  const offset = new Date(y, m, 1).getDay();
  const dim = new Date(y, m + 1, 0).getDate();
  const cells = Array.from({ length: 42 }, (_, i) => {
    const day = i - offset + 1;
    return day >= 1 && day <= dim ? new Date(y, m, day) : null;
  });

  return (
    <View style={st.field}>
      <Text style={st.label}>{label}</Text>
      <TouchableOpacity activeOpacity={0.8} style={st.box} onPress={openIt} accessibilityRole="button" accessibilityLabel={`${label}: ${fmtShowDate(value)}`}>
        <Icon name="event" size={17} color={T.copper} />
        <Text style={st.boxText} numberOfLines={1}>{fmtShowDate(value)}</Text>
        <Icon name="keyboard-arrow-down" size={20} color={T.muted} />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)} statusBarTranslucent>
        <View style={st.backdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setOpen(false)} />
          <View style={st.card}>
            <View style={st.head}>
              <View style={{ flex: 1 }}>
                <Text style={st.eyebrow}>{label.toUpperCase()}</Text>
                <Text style={st.picked}>{fmtShowDate(value)}</Text>
              </View>
              <TouchableOpacity style={st.close} onPress={() => setOpen(false)} accessibilityLabel="Close">
                <Icon name="close" size={20} color={T.ink} />
              </TouchableOpacity>
            </View>

            <View style={st.nav}>
              <TouchableOpacity style={st.navBtn} onPress={() => go(-12)} accessibilityLabel="Previous year"><Icon name="first-page" size={20} color={T.nav} /></TouchableOpacity>
              <TouchableOpacity style={st.navBtn} onPress={() => go(-1)} accessibilityLabel="Previous month"><Icon name="chevron-left" size={22} color={T.nav} /></TouchableOpacity>
              <Text style={st.month}>{MONTHS[m]} {y}</Text>
              <TouchableOpacity style={st.navBtn} onPress={() => go(1)} accessibilityLabel="Next month"><Icon name="chevron-right" size={22} color={T.nav} /></TouchableOpacity>
              <TouchableOpacity style={st.navBtn} onPress={() => go(12)} accessibilityLabel="Next year"><Icon name="last-page" size={20} color={T.nav} /></TouchableOpacity>
            </View>

            <View style={st.grid}>
              {DOW.map((d, i) => (
                <View key={`h${i}`} style={st.cell}><Text style={st.dow}>{d}</Text></View>
              ))}
              {cells.map((d, i) => {
                if (!d) return <View key={i} style={st.cell} />;
                const sel = same(d, value);
                const isToday = same(d, today);
                return (
                  <View key={i} style={st.cell}>
                    <TouchableOpacity activeOpacity={0.7} onPress={() => pick(d)} style={[st.day, isToday && st.dayToday, sel && st.daySel]}>
                      <Text style={[st.dayText, sel && { color: '#fff' }, !sel && isToday && { color: T.copper }]}>{d.getDate()}</Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>

            <View style={st.foot}>
              <TouchableOpacity style={st.footBtn} onPress={() => pick(new Date())}>
                <Icon name="today" size={16} color={T.copper} />
                <Text style={st.footText}>Today</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const st = StyleSheet.create({
  field: { flexGrow: 1, flexBasis: 160, minWidth: 0 },
  label: { fontSize: 10.5, fontWeight: '800', letterSpacing: 0.6, color: T.muted, textTransform: 'uppercase', marginBottom: 6 },
  box: { height: 46, flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, borderWidth: 1, borderColor: T.border, backgroundColor: T.surface, paddingHorizontal: 12 },
  boxText: { flex: 1, minWidth: 0, fontSize: 14, fontWeight: '800', color: T.ink },
  backdrop: { flex: 1, backgroundColor: 'rgba(8,16,28,0.55)', alignItems: 'center', justifyContent: 'center', padding: 16 },
  card: { width: '100%', maxWidth: 360, backgroundColor: T.surface, borderRadius: 20, overflow: 'hidden' },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 16, backgroundColor: T.nav },
  eyebrow: { fontSize: 10.5, fontWeight: '800', letterSpacing: 0.8, color: '#ffffffAA' },
  picked: { fontSize: 20, fontWeight: '900', color: '#fff', marginTop: 2 },
  close: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#ffffff', alignItems: 'center', justifyContent: 'center' },
  nav: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingTop: 10 },
  navBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  month: { flex: 1, textAlign: 'center', fontSize: 15, fontWeight: '900', color: T.ink },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 10, paddingVertical: 6 },
  cell: { width: `${100 / 7}%`, height: 42, alignItems: 'center', justifyContent: 'center' },
  dow: { fontSize: 11, fontWeight: '800', color: T.muted },
  day: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  dayToday: { borderWidth: 1.5, borderColor: T.copper },
  daySel: { backgroundColor: T.copper, borderColor: T.copper },
  dayText: { fontSize: 13.5, fontWeight: '700', color: T.ink },
  foot: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 12, paddingBottom: 12 },
  footBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 38, paddingHorizontal: 14, borderRadius: 10, backgroundColor: T.alt, borderWidth: 1, borderColor: T.border },
  footText: { fontSize: 13, fontWeight: '800', color: T.copper },
});
