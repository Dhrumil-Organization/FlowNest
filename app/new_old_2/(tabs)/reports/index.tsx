// ─────────────────────────────────────────────────────────────
// FILE: app/new/(tabs)/reports/index.tsx
// This is the old ReportsHome() function from
// src/screens/reports/ReportsHubScreen.tsx, moved here as its own
// route. Same cards, same permission filter — only the navigation
// call changed (navigation.navigate(c.route) -> router.push).
// ─────────────────────────────────────────────────────────────
import React from 'react';
import { useRouter } from 'expo-router';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { T } from '@/src/theme';
import { usePermission } from '@/src/core/permissions';

// Maps the old Stack.Screen names ('RealCosting' / 'Expense') to
// their new expo-router paths.
const ROUTE_MAP: Record<string, string> = {
  RealCosting: '/new/(tabs)/reports/real-costing',
  Expense: '/new/(tabs)/reports/expense',
};

export default function ReportsHome() {
  const router = useRouter();
  const { canAccess } = usePermission();

  const cards = [
    { key: 'management.reports.real_costing', title: 'Real Costing Chain', sub: 'Assumed vs actual by design and beam', route: 'RealCosting' },
    { key: 'management.reports.expense', title: 'Expense & Production', sub: 'Electricity, salary, stores and cost per pick', route: 'Expense' },
  ].filter(x => canAccess(x.key));

  return (
    <ScrollView style={s.page} contentContainerStyle={s.content}>
      <Text style={s.kicker}>MADHUSUDHAN FABRICS</Text>
      <Text style={s.title}>Reports</Text>
      <Text style={s.sub}>Select a report available to your role.</Text>
      {cards.map(c => (
        <TouchableOpacity
          key={c.key}
          style={s.card}
          onPress={() => router.push(ROUTE_MAP[c.route] as any)}
        >
          <View>
            <Text style={s.cardTitle}>{c.title}</Text>
            <Text style={s.cardSub}>{c.sub}</Text>
          </View>
          <Text style={s.arrow}>›</Text>
        </TouchableOpacity>
      ))}
      {!cards.length && <Text style={s.empty}>No reports assigned.</Text>}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: T.bg },
  content: { padding: 18, paddingTop: 42 },
  kicker: { fontSize: 10, fontWeight: '900', letterSpacing: 1.3, color: T.copper },
  title: { fontSize: 30, fontWeight: '900', color: T.ink, marginTop: 5 },
  sub: { fontSize: 13, color: T.muted, marginTop: 5, marginBottom: 18 },
  card: { backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, borderRadius: 16, padding: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { fontSize: 16, fontWeight: '800', color: T.ink },
  cardSub: { fontSize: 12, color: T.muted, marginTop: 4, maxWidth: 280 },
  arrow: { fontSize: 28, color: T.copper },
  empty: { color: T.muted, textAlign: 'center', marginTop: 40 },
});
