// HomeScreen.jsx — Madhusudhan Fabrics
// React Native — overview / dashboard

import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const MODULES = [
  { id: 'designs', label: 'Designs', icon: '✦', color: '#534AB7', bg: '#EEEDFE', desc: 'Design catalogue & patterns' },
  { id: 'costing', label: 'Costing', icon: '⇗', color: '#185FA5', bg: '#E3EEF9', desc: 'Job costing & estimates' },
  { id: 'orders',  label: 'Orders',  icon: '≡',  color: '#0F6E56', bg: '#E1F5EE', desc: 'Order pipeline & dispatch' },
  { id: 'stock',   label: 'Stock',   icon: '◈',  color: '#854F0B', bg: '#FAEEDA', desc: 'Yarn & fabric inventory' },
  { id: 'expense', label: 'Expense', icon: 'Σ',  color: '#c2823a', bg: '#FDF3E8', desc: 'Monthly expense dashboard' },
  { id: 'prod',    label: 'Prod',    icon: '▦',  color: '#3B6D11', bg: '#EAF3DE', desc: 'Production & loom output' },
];

const STATS = [
  { l: 'This month', v: '₹1.11 Cr', s: 'Total expense' },
  { l: 'Production', v: '4.79 L m', s: 'May 2026' },
  { l: 'Cost / pick', v: '₹0.334',  s: 'May 2026' },
];

const ACTIVITY = [
  { text: 'May 2026 expense report exported',  time: '2 hours ago', dot: '#c2823a' },
  { text: 'Apr 2026 expense report viewed',    time: 'Yesterday',   dot: '#c2823a' },
  { text: 'Monthly costing updated — May',     time: '2 days ago',  dot: '#185FA5' },
  { text: 'Production report — May 2026 done', time: '3 days ago',  dot: '#3B6D11' },
];

export default function HomeScreen() {
  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  return (
    <SafeAreaView style={S.safe} edges={['top']}>
      {/* Header */}
      <View style={S.header}>
        <Text style={S.eyebrow}>MADHUSUDHAN FABRICS</Text>
        <Text style={S.title}>Good morning</Text>
        <Text style={S.date}>{today}</Text>
      </View>

      <ScrollView style={S.body} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
        {/* Stats strip */}
        <View style={S.statsRow}>
          {STATS.map((s, i) => (
            <View key={i} style={S.statItem}>
              <Text style={S.statLabel}>{s.l}</Text>
              <Text style={S.statValue}>{s.v}</Text>
              <Text style={S.statSub}>{s.s}</Text>
            </View>
          ))}
        </View>

        {/* Module grid */}
        <Text style={S.sectionLabel}>MODULES</Text>
        <View style={S.moduleGrid}>
          {MODULES.map((m) => (
            <TouchableOpacity key={m.id} style={[S.moduleCard, { backgroundColor: m.bg }]} activeOpacity={0.75}>
              <Text style={[S.moduleIcon, { color: m.color }]}>{m.icon}</Text>
              <Text style={[S.moduleLabel, { color: m.color }]}>{m.label}</Text>
              <Text style={S.moduleDesc}>{m.desc}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Recent activity */}
        <Text style={S.sectionLabel}>RECENT ACTIVITY</Text>
        {ACTIVITY.map((a, i) => (
          <View key={i} style={S.actRow}>
            <View style={[S.actDot, { backgroundColor: a.dot }]} />
            <View style={{ flex: 1 }}>
              <Text style={S.actText}>{a.text}</Text>
              <Text style={S.actTime}>{a.time}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const S = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: '#f8f7f4' },
  header:      { backgroundColor: '#13879A', padding: 16, paddingBottom: 18, borderBottomLeftRadius: 16, borderBottomRightRadius: 16 },
  eyebrow:     { fontSize: 10, color: '#fff', letterSpacing: 1, marginBottom: 3 },
  title:       { fontSize: 22, fontWeight: '500', color: '#fff', marginBottom: 2 },
  date:        { fontSize: 11, color: '#fff' },
  body:        { flex: 1, paddingHorizontal: 12, paddingTop: 14 },
  statsRow:    { flexDirection: 'row', gap: 8, marginBottom: 16 },
  statItem:    { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 10, alignItems: 'center', borderWidth: 0.5, borderColor: '#e5e7eb' },
  statLabel:   { fontSize: 9, color: '#000', textTransform: 'uppercase', letterSpacing: 0.6 },
  statValue:   { fontSize: 15, fontWeight: '600', color: '#000', marginVertical: 3 },
  statSub:     { fontSize: 10, color: '#000' },
  sectionLabel:{ fontSize: 10, color: '#000', textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 14, marginBottom: 8 },
  moduleGrid:  { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  moduleCard:  { width: '48%', borderRadius: 12, padding: 13 },
  moduleIcon:  { fontSize: 18, fontWeight: '700', marginBottom: 5 },
  moduleLabel: { fontSize: 13, fontWeight: '600', marginBottom: 2 },
  moduleDesc:  { fontSize: 11, color: '#000', lineHeight: 16 },
  actRow:      { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 9, borderBottomWidth: 0.5, borderBottomColor: '#f3f4f6' },
  actDot:      { width: 8, height: 8, borderRadius: 4, marginTop: 3, flexShrink: 0 },
  actText:     { fontSize: 13, color: '#000' },
  actTime:     { fontSize: 11, color: '#000', marginTop: 2 },
});
