// CostingScreen.jsx — Madhusudhan Fabrics (React Native)

import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ComingSoonBanner } from '../screen/DesignsScreen';

const MOCK_JOBS = [
  { id: 'JC-2406', design: 'Rapier Check 44"', party: 'Rathi Textiles', mtrs: 5200, rate: 48.50, status: 'in-progress' },
  { id: 'JC-2405', design: 'WJet Plain 60"', party: 'Gujarat Fabrics', mtrs: 3800, rate: 52.00, status: 'completed' },
  { id: 'JC-2404', design: 'Sud Dobby 48"', party: 'Mehta & Sons', mtrs: 4100, rate: 46.75, status: 'completed' },
  { id: 'JC-2403', design: 'MW Stripe 44"', party: 'Patel Exports', mtrs: 6300, rate: 44.00, status: 'invoiced' },
];

const STATUS = { 'in-progress': '#c2823a', completed: '#1D9E75', invoiced: '#185FA5' };

const SUM = [['Active jobs', '3'], ['This month', '₹8.4 L'], ['Avg margin', '12.4%']];

export default function CostingScreen() {
  return (
    <SafeAreaView style={S.safe} edges={['top']}>
      <View style={S.header}>
        <Text style={S.eyebrow}>MADHUSUDHAN FABRICS</Text>
        <Text style={S.title}>Costing</Text>
        <Text style={S.sub}>Job costing · estimates · margins</Text>
      </View>

      <ScrollView style={S.body} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
        <View style={S.sumGrid}>
          {SUM.map(([l, v]) => (
            <View key={l} style={S.sumCard}>
              <Text style={S.sumLabel}>{l}</Text>
              <Text style={S.sumValue}>{v}</Text>
            </View>
          ))}
        </View>

        <Text style={S.sectionLabel}>RECENT JOBS</Text>

        {MOCK_JOBS.map((j) => (
          <View key={j.id} style={S.card}>
            <View style={{ flex: 1 }}>
              <Text style={S.jobId}>{j.id}</Text>
              <Text style={S.jobName}>{j.design}</Text>
              <Text style={S.jobMeta}>{j.party} · {j.mtrs.toLocaleString('en-IN')} m</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={S.jobRate}>₹{j.rate.toFixed(2)}/m</Text>
              <View style={[S.statusBadge, { backgroundColor: STATUS[j.status] + '22' }]}>
                <Text style={[S.statusText, { color: STATUS[j.status] }]}>{j.status}</Text>
              </View>
            </View>
          </View>
        ))}

        <ComingSoonBanner module="Costing" />
      </ScrollView>
    </SafeAreaView>
  );
}

const S = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8f7f4' },
  header: { backgroundColor: '#13879A', padding: 16, paddingBottom: 18, borderBottomLeftRadius: 16, borderBottomRightRadius: 16 },
  eyebrow: { fontSize: 10, color: '#fff', letterSpacing: 1, marginBottom: 3 },
  title: { fontSize: 20, fontWeight: '500', color: '#fff', marginBottom: 2 },
  sub: { fontSize: 11, color: '#fff' },
  body: { flex: 1, paddingHorizontal: 12, paddingTop: 14 },
  sumGrid: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  sumCard: { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 10, alignItems: 'center', borderWidth: 0.5, borderColor: '#e5e7eb' },
  sumLabel: { fontSize: 9, color: '#000', textTransform: 'uppercase', letterSpacing: 0.6 },
  sumValue: { fontSize: 16, fontWeight: '600', color: '#000', marginTop: 4 },
  sectionLabel: { fontSize: 10, color: '#000', textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 14, marginBottom: 8 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 0.5, borderColor: '#e5e7eb' },
  jobId: { fontSize: 10, color: '#9ca3af', marginBottom: 2 },
  jobName: { fontSize: 14, fontWeight: '500', color: '#000', marginBottom: 2 },
  jobMeta: { fontSize: 11, color: '#000' },
  jobRate: { fontSize: 14, fontWeight: '600', color: '#185FA5', marginBottom: 4 },
  statusBadge: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 10 },
  statusText: { fontSize: 11, fontWeight: '500' },
});
