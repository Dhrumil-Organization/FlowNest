// DesignsScreen.jsx — Madhusudhan Fabrics (React Native)

import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const MOCK_DESIGNS = [
  { id: 'D-1042', name: 'Rapier Check 44"',    picks: 72, width: '44"', type: 'Rapier', status: 'active'  },
  { id: 'D-1038', name: 'WJet Plain 60"',       picks: 65, width: '60"', type: 'WJet',   status: 'active'  },
  { id: 'D-1035', name: 'Sud Dobby 48"',        picks: 74, width: '48"', type: 'Rapier', status: 'active'  },
  { id: 'D-1031', name: 'MW Stripe 44"',        picks: 71, width: '44"', type: 'Rapier', status: 'paused'  },
  { id: 'D-1027', name: 'WJet Twill 60"',       picks: 68, width: '60"', type: 'WJet',   status: 'active'  },
  { id: 'D-1020', name: 'Rapier Jacquard 44"',  picks: 73, width: '44"', type: 'Rapier', status: 'draft'   },
];

const STATUS_COLORS = { active: '#1D9E75', paused: '#c2823a', draft: '#9ca3af' };
const FILTERS = ['all', 'rapier', 'wjet', 'active', 'paused'];

export function ComingSoonBanner({ module: mod }) {
  return (
    <View style={B.wrap}>
      <Text style={B.icon}>🚧</Text>
      <Text style={B.title}>{mod} module in development</Text>
      <Text style={B.desc}>
        Full functionality coming soon. The data structure and navigation are ready — connect your API when the module is built.
      </Text>
    </View>
  );
}

const B = StyleSheet.create({
  wrap:  { backgroundColor: '#f8f7f4', borderWidth: 1, borderColor: '#d1d5db', borderStyle: 'dashed', borderRadius: 12, padding: 16, marginTop: 16, alignItems: 'center' },
  icon:  { fontSize: 24, marginBottom: 8 },
  title: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 4 },
  desc:  { fontSize: 12, color: '#9ca3af', lineHeight: 18, textAlign: 'center' },
});

export default function DesignsScreen() {
  const [filter, setFilter] = useState('all');

  const filtered = filter === 'all'
    ? MOCK_DESIGNS
    : MOCK_DESIGNS.filter((d) => d.type.toLowerCase() === filter || d.status === filter);

  return (
    <SafeAreaView style={S.safe} edges={['top']}>
      <View style={S.header}>
        <Text style={S.eyebrow}>MADHUSUDHAN FABRICS</Text>
        <View style={S.titleRow}>
          <Text style={S.title}>Designs</Text>
          <View style={S.countBadge}><Text style={S.countText}>{MOCK_DESIGNS.length}</Text></View>
        </View>
        <Text style={S.sub}>Design catalogue · loom configurations</Text>
      </View>

      <ScrollView style={S.body} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
        {/* Filter pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {FILTERS.map((f) => (
              <TouchableOpacity
                key={f}
                onPress={() => setFilter(f)}
                style={[S.pill, filter === f && S.pillActive]}
                activeOpacity={0.7}
              >
                <Text style={[S.pillText, filter === f && S.pillTextActive]}>
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {filtered.map((d) => (
          <View key={d.id} style={S.card}>
            <View style={{ flex: 1 }}>
              <Text style={S.designId}>{d.id}</Text>
              <Text style={S.designName}>{d.name}</Text>
              <Text style={S.designMeta}>{d.picks} picks · {d.width} · {d.type}</Text>
            </View>
            <View style={[S.statusBadge, { backgroundColor: STATUS_COLORS[d.status] + '22' }]}>
              <Text style={[S.statusText, { color: STATUS_COLORS[d.status] }]}>{d.status}</Text>
            </View>
          </View>
        ))}

        <ComingSoonBanner module="Designs" />
      </ScrollView>
    </SafeAreaView>
  );
}

const S = StyleSheet.create({
  safe:         { flex: 1, backgroundColor: '#f8f7f4' },
  header:       { backgroundColor: '#13879A', padding: 16, paddingBottom: 18, borderBottomLeftRadius: 16, borderBottomRightRadius: 16 },
  eyebrow:      { fontSize: 10, color: '#fff', letterSpacing: 1, marginBottom: 3 },
  titleRow:     { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  title:        { fontSize: 20, fontWeight: '500', color: '#fff' },
  countBadge:   { backgroundColor: '#334155', borderRadius: 10, paddingHorizontal: 7, paddingVertical: 1 },
  countText:    { color: '#fff', fontSize: 11 },
  sub:          { fontSize: 11, color: '#fff' },
  body:         { flex: 1, paddingHorizontal: 12, paddingTop: 14 },
  pill:         { paddingVertical: 4, paddingHorizontal: 11, borderRadius: 20, borderWidth: 1, borderColor: '#d1d5db', backgroundColor: '#fff' },
  pillActive:   { backgroundColor: '#13879A', borderColor: '#13879A' },
  pillText:     { fontSize: 12, color: '#6b7280' },
  pillTextActive:{ color: '#fff' },
  card:         { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 0.5, borderColor: '#e5e7eb' },
  designId:     { fontSize: 10, color: '#9ca3af', letterSpacing: 0.5, marginBottom: 2 },
  designName:   { fontSize: 14, fontWeight: '500', color: '#111827', marginBottom: 2 },
  designMeta:   { fontSize: 11, color: '#9ca3af' },
  statusBadge:  { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 10 },
  statusText:   { fontSize: 11, fontWeight: '500' },
});
