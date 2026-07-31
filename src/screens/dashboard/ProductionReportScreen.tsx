import { T } from '@/src/theme';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

function parseJson(value: string | string[] | undefined, fallback: any) {
  try {
    const raw = Array.isArray(value) ? value[0] : value;
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function meters(value: number) {
  const n = Number(value || 0);
  if (Math.abs(n) >= 100000) return `${(n / 100000).toFixed(2)} L m`;
  if (Math.abs(n) >= 1000) return `${(n / 1000).toFixed(1)} K m`;
  return `${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })} m`;
}

export default function ProductionReportScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const production = useMemo(
    () => parseJson(params.production, { total: {}, daily_trend: [], by_machine: [] }),
    [params.production],
  );
  const date = Array.isArray(params.date) ? params.date[0] : params.date;

  const openMachine = (machine: any, index: number) => {
    const mtd = Number(machine?.today || machine?.mtd_meters || 0);
    const totalMtd = Number(production?.total?.mtd_meters || 0);

    router.push({
      pathname: '/new/(tabs)/reports/production-machine',
      params: {
        date: date || '',
        machine: JSON.stringify({
          ...machine,
          rank: index + 1,
          share: totalMtd > 0 ? (mtd / totalMtd) * 100 : 0,
          total_machine_count: production?.by_machine?.length || 0,
        }),
      },
    });
  };

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.content}>
        <View style={s.breadcrumb}>
          <TouchableOpacity style={s.back} onPress={() => router.back()}>
            <Text style={s.backText}>‹</Text>
          </TouchableOpacity>
          <Text style={s.crumb}>Owner › Production</Text>
        </View>

        <View style={s.summary}>
          <Text style={s.title}>Production · company</Text>
          <Text style={s.sub}>All machine groups · {date || 'selected date'}</Text>

          <View style={s.kpiRow}>
            <Kpi label="TODAY" value={meters(production?.total?.today_meters)} />
            <Kpi label="THIS MONTH" value={meters(production?.total?.mtd_meters)} />
            <Kpi label="MACHINES" value={String(production?.by_machine?.length || 0)} />
          </View>
        </View>

        <View style={s.card}>
          <View style={s.cardHeader}><Text style={s.cardHeaderText}>⚙  BY MACHINE</Text></View>
          <View style={s.tableHead}>
            <Text style={[s.th, { flex: 1 }]}>MACHINE</Text>
            <Text style={s.th}>TODAY</Text>
            <Text style={s.th}>MONTH</Text>
          </View>

          {(production?.by_machine || []).map((m: any, index: number) => (
            <TouchableOpacity
              key={`${m.prpcode || ''}-${m.macgrp || ''}-${index}`}
              style={s.row}
              onPress={() => openMachine(m, index)}
              activeOpacity={0.75}
            >
              <Text style={[s.machine, { flex: 1 }]} numberOfLines={1}>{m.machine}</Text>
              <Text style={s.today}>{meters(m.target || m.today_meters)}</Text>
              <Text style={s.month}>{meters(m.today || m.mtd_meters)}</Text>
              <Text style={s.chevron}>›</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={s.card}>
          <View style={s.cardHeader}><Text style={s.cardHeaderText}>▥  PRODUCTION TREND</Text></View>
          <View style={s.trend}>
            {(production?.daily_trend || []).map((d: any, index: number) => {
              const max = Math.max(...(production.daily_trend || []).map((x: any) => Number(x.meters || 0)), 1);
              const height = Math.max(4, (Number(d.meters || 0) / max) * 82);
              return (
                <View key={`${d.day}-${index}`} style={s.barCol}>
                  <View style={[s.bar, { height }]} />
                  <Text style={s.day}>{d.day}</Text>
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.kpi}>
      <Text style={s.kpiLabel}>{label}</Text>
      <Text numberOfLines={1} adjustsFontSizeToFit style={s.kpiValue}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: T.bg },
  content: { padding: 16, paddingBottom: 40 },
  breadcrumb: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  back: { width: 34, height: 34, borderRadius: 9, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: T.border },
  backText: { fontSize: 24, color: T.nav, marginTop: -2 },
  crumb: { marginLeft: 10, color: T.nav, fontSize: 12, fontWeight: '800' },
  summary: { backgroundColor: '#fff', borderRadius: 15, borderWidth: 1, borderColor: T.border, padding: 15, marginBottom: 14 },
  title: { color: T.nav, fontSize: 18, fontWeight: '900' },
  sub: { color: T.muted, fontSize: 11, marginTop: 3 },
  kpiRow: { flexDirection: 'row', gap: 8, marginTop: 13 },
  kpi: { flex: 1, minWidth: 0, borderWidth: 1, borderColor: T.border, borderRadius: 11, padding: 10 },
  kpiLabel: { color: T.muted, fontSize: 8, fontWeight: '900' },
  kpiValue: { color: '#6D287F', fontSize: 15, fontWeight: '900', marginTop: 5 },
  card: { backgroundColor: '#fff', borderRadius: 15, borderWidth: 1, borderColor: T.border, overflow: 'hidden', marginBottom: 14 },
  cardHeader: { backgroundColor: '#6D287F', paddingHorizontal: 14, paddingVertical: 11 },
  cardHeaderText: { color: '#fff', fontSize: 11, fontWeight: '900', letterSpacing: 0.4 },
  tableHead: { flexDirection: 'row', paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: T.border },
  th: { width: 84, textAlign: 'right', color: T.muted, fontSize: 8, fontWeight: '900' },
  row: { minHeight: 52, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: T.border },
  machine: { color: T.nav, fontSize: 12, fontWeight: '800' },
  today: { width: 84, textAlign: 'right', color: '#6D287F', fontSize: 11, fontWeight: '900' },
  month: { width: 84, textAlign: 'right', color: T.nav, fontSize: 11, fontWeight: '900' },
  chevron: { width: 17, textAlign: 'right', color: '#6D287F', fontSize: 20, fontWeight: '900' },
  trend: { height: 125, paddingHorizontal: 10, paddingTop: 15, paddingBottom: 8, flexDirection: 'row', alignItems: 'flex-end' },
  barCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  bar: { width: 4, minHeight: 4, borderRadius: 3, backgroundColor: '#6D287F' },
  day: { color: T.muted, fontSize: 7, marginTop: 5 },
});
