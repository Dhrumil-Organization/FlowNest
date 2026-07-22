// ProdScreen.jsx — Madhusudhan Fabrics (React Native)

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ComingSoonBanner } from './DesignsScreen';

const MOCK_DAILY = [
  { date: '04-Jun', rapier: 10876, wjet: 4012, total: 14888, looms: 126 },
  { date: '03-Jun', rapier: 11240, wjet: 3980, total: 15220, looms: 126 },
  { date: '02-Jun', rapier: 10990, wjet: 4120, total: 15110, looms: 126 },
  { date: '01-Jun', rapier: 11380, wjet: 3870, total: 15250, looms: 126 },
];

const MOCK_MONTHLY = [
  { month: "May '26", rapier: 322109, wjet: 157035, total: 479144, days: 29, cpp: 0.334 },
  { month: "Apr '26", rapier: 361945, wjet: 175362, total: 537307, days: 30, cpp: 0.309 },
  { month: "Mar '26", rapier: 319511, wjet: 153591, total: 473102, days: 31, cpp: 0.359 },
];

const STRIP = [
  { l: 'Today est.', v: '~14,900 m' },
  { l: 'May total',  v: '4.79 L m'  },
  { l: 'Looms',      v: '126'        },
];

const fN = v => Math.round(v).toLocaleString('en-IN');
const fL = v => (v / 1e5).toFixed(2);

export default function ProdScreen() {
  const [view, setView] = useState('daily');

  return (
    <SafeAreaView style={S.safe} edges={['top']}>
      <View style={S.header}>
        <Text style={S.eyebrow}>MADHUSUDHAN FABRICS</Text>
        <Text style={S.title}>Production</Text>
        <Text style={S.sub}>Loom output · metres · picks</Text>
      </View>

      <ScrollView style={S.body} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
        {/* Summary strip */}
        <View style={S.strip}>
          {STRIP.map(({ l, v }) => (
            <View key={l} style={S.stripItem}>
              <Text style={S.stripLabel}>{l}</Text>
              <Text style={S.stripValue}>{v}</Text>
            </View>
          ))}
        </View>

        {/* Toggle */}
        <View style={S.toggle}>
          {['daily', 'monthly'].map((t) => (
            <TouchableOpacity
              key={t}
              onPress={() => setView(t)}
              style={[S.toggleBtn, view === t && S.toggleOn]}
              activeOpacity={0.7}
            >
              <Text style={[S.toggleText, view === t && { color: '#fff' }]}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {view === 'daily' && (
          <>
            <Text style={S.sectionLabel}>DAILY OUTPUT — JUN 2026</Text>
            {MOCK_DAILY.map((d) => (
              <View key={d.date} style={S.card}>
                <Text style={S.cardDate}>{d.date}</Text>
                <View style={{ flex: 1 }}>
                  <View style={S.metricRow}>
                    <Text style={S.metricLabel}>Rapier</Text>
                    <Text style={S.metricValue}>{fN(d.rapier)} m</Text>
                  </View>
                  <View style={S.metricRow}>
                    <Text style={S.metricLabel}>Waterjet</Text>
                    <Text style={S.metricValue}>{fN(d.wjet)} m</Text>
                  </View>
                  <View style={[S.metricRow, S.metricTotal]}>
                    <Text style={[S.metricLabel, { fontWeight: '500' }]}>Total</Text>
                    <Text style={[S.metricValue, { fontWeight: '600', color: '#111827' }]}>{fN(d.total)} m</Text>
                  </View>
                  <Text style={S.perDay}>{fN(Math.round(d.total / d.looms))} m / loom</Text>
                </View>
              </View>
            ))}
          </>
        )}

        {view === 'monthly' && (
          <>
            <Text style={S.sectionLabel}>MONTHLY SUMMARY</Text>
            {MOCK_MONTHLY.map((m) => (
              <View key={m.month} style={S.card}>
                <Text style={S.cardDate}>{m.month}</Text>
                <View style={{ flex: 1 }}>
                  <View style={S.metricRow}>
                    <Text style={S.metricLabel}>Rapier</Text>
                    <Text style={S.metricValue}>{fL(m.rapier)} L m</Text>
                  </View>
                  <View style={S.metricRow}>
                    <Text style={S.metricLabel}>Waterjet</Text>
                    <Text style={S.metricValue}>{fL(m.wjet)} L m</Text>
                  </View>
                  <View style={[S.metricRow, S.metricTotal]}>
                    <Text style={[S.metricLabel, { fontWeight: '500' }]}>Total</Text>
                    <Text style={[S.metricValue, { fontWeight: '600', color: '#111827' }]}>{fL(m.total)} L m</Text>
                  </View>
                  <Text style={S.perDay}>{m.days} days · Cost/pick ₹{m.cpp.toFixed(3)}</Text>
                </View>
              </View>
            ))}
          </>
        )}

        <ComingSoonBanner module="Production" />
      </ScrollView>
    </SafeAreaView>
  );
}

const S = StyleSheet.create({
  safe:         { flex: 1, backgroundColor: '#f8f7f4' },
  header:       { backgroundColor: '#0f172a', padding: 16, paddingBottom: 18, borderBottomLeftRadius: 16, borderBottomRightRadius: 16 },
  eyebrow:      { fontSize: 10, color: '#94a3b8', letterSpacing: 1, marginBottom: 3 },
  title:        { fontSize: 20, fontWeight: '500', color: '#fff', marginBottom: 2 },
  sub:          { fontSize: 11, color: '#64748b' },
  body:         { flex: 1, paddingHorizontal: 12, paddingTop: 14 },
  strip:        { flexDirection: 'row', gap: 8, marginBottom: 12 },
  stripItem:    { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 10, alignItems: 'center', borderWidth: 0.5, borderColor: '#e5e7eb' },
  stripLabel:   { fontSize: 9, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.6 },
  stripValue:   { fontSize: 15, fontWeight: '600', color: '#111827', marginTop: 3 },
  toggle:       { flexDirection: 'row', gap: 6, marginBottom: 4 },
  toggleBtn:    { paddingVertical: 5, paddingHorizontal: 16, borderRadius: 20, borderWidth: 1, borderColor: '#d1d5db', backgroundColor: '#fff' },
  toggleOn:     { backgroundColor: '#3B6D11', borderColor: '#3B6D11' },
  toggleText:   { fontSize: 13, color: '#6b7280' },
  sectionLabel: { fontSize: 10, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 12, marginBottom: 8 },
  card:         { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 8, flexDirection: 'row', gap: 12, borderWidth: 0.5, borderColor: '#e5e7eb' },
  cardDate:     { fontSize: 12, fontWeight: '600', color: '#374151', minWidth: 44, paddingTop: 2 },
  metricRow:    { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  metricTotal:  { borderTopWidth: 0.5, borderTopColor: '#f3f4f6', marginTop: 2, paddingTop: 6 },
  metricLabel:  { fontSize: 12, color: '#6b7280' },
  metricValue:  { fontSize: 12, color: '#374151' },
  perDay:       { fontSize: 11, color: '#9ca3af', marginTop: 4 },
});
