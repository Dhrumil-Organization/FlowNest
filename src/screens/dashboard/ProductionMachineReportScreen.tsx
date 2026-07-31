import { T } from '@/src/theme';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

function parseJson(value: string | string[] | undefined, fallback: any) {
  try { const raw = Array.isArray(value) ? value[0] : value; return raw ? JSON.parse(raw) : fallback; } catch { return fallback; }
}
function meters(value: number) {
  const n = Number(value || 0);
  if (Math.abs(n) >= 100000) return `${(n / 100000).toFixed(2)} L m`;
  if (Math.abs(n) >= 1000) return `${(n / 1000).toFixed(1)} K m`;
  return `${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })} m`;
}
function points(source: any) {
  if (!Array.isArray(source)) return [];
  return source.map((x: any, i: number) => ({ label: String(x?.day ?? x?.month ?? x?.label ?? i + 1), value: Number(x?.meters ?? x?.qty ?? x?.value ?? x?.production_mtr ?? 0) }));
}

export default function ProductionMachineReportScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const machine = useMemo(() => parseJson(params.machine, {}), [params.machine]);
  const today = Number(machine?.target ?? machine?.today_meters ?? 0);
  const mtd = Number(machine?.today ?? machine?.mtd_meters ?? 0);
  const share = Number(machine?.share || 0);
  const daily = points(machine?.daily_trend || machine?.trend);
  const monthly = points(machine?.month_by_month || machine?.monthly_trend);

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.content}>
        <View style={s.breadcrumb}>
          <TouchableOpacity style={s.back} onPress={() => router.back()}><Text style={s.backText}>‹</Text></TouchableOpacity>
          <Text style={s.crumb}>Owner › {machine.machine || 'Machine'}</Text>
        </View>

        <View style={s.summary}>
          <View style={s.titleRow}>
            <View style={s.icon}><Text style={s.iconText}>⚙️</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={s.title}>{machine.machine || 'Production unit'}</Text>
              <Text style={s.sub}>Production unit · Rank #{machine.rank || 0} of {machine.total_machine_count || 0}</Text>
            </View>
            <View style={s.shareBadge}><Text style={s.shareValue}>{share.toFixed(1)}%</Text><Text style={s.shareLabel}>of output</Text></View>
          </View>
          <View style={s.kpiRow}>
            <Kpi label="TODAY" value={meters(today)} />
            <Kpi label="THIS MONTH" value={meters(mtd)} />
            <Kpi label="SHARE" value={`${share.toFixed(1)}%`} />
          </View>
        </View>

        <ChartCard title="⚙  PRODUCTION TREND" leftLabel="TODAY" leftValue={meters(today)} rightLabel="THIS MONTH" rightValue={meters(mtd)} data={daily} mode="line" />
        <ChartCard title="▥  MONTH BY MONTH" data={monthly} mode="bar" />
      </ScrollView>
    </SafeAreaView>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return <View style={s.kpi}><Text style={s.kpiLabel}>{label}</Text><Text numberOfLines={1} adjustsFontSizeToFit style={s.kpiValue}>{value}</Text></View>;
}

function ChartCard({ title, data, mode, leftLabel, leftValue, rightLabel, rightValue }: any) {
  const max = Math.max(1, ...data.map((x: any) => Number(x.value || 0)));
  return (
    <View style={s.card}>
      <View style={s.purpleHeader}><Text style={s.headerText}>{title}</Text></View>
      {(leftLabel || rightLabel) && <View style={s.chartKpis}>
        <View><Text style={s.label}>{leftLabel}</Text><Text style={s.valuePurple}>{leftValue}</Text></View>
        <View style={{ alignItems: 'flex-end' }}><Text style={s.label}>{rightLabel}</Text><Text style={s.value}>{rightValue}</Text></View>
      </View>}
      <View style={s.chart}>
        {(data.length ? data : Array.from({ length: mode === 'bar' ? 6 : 12 }, (_, i) => ({ label: String(i + 1), value: 0 }))).map((p: any, i: number) => (
          <View key={`${p.label}-${i}`} style={s.pointCol}>
            <View style={[mode === 'bar' ? s.bar : s.linePoint, { height: Math.max(mode === 'bar' ? 4 : 2, (Number(p.value || 0) / max) * (mode === 'bar' ? 52 : 30)) }]} />
            <Text style={s.axisLabel}>{p.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: T.bg }, content: { padding: 16, paddingBottom: 40 },
  breadcrumb: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  back: { width: 34, height: 34, borderRadius: 9, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: T.border },
  backText: { fontSize: 24, color: T.nav, marginTop: -2 }, crumb: { marginLeft: 10, color: T.nav, fontSize: 12, fontWeight: '800', flex: 1 },
  summary: { backgroundColor: '#fff', borderRadius: 15, borderWidth: 1, borderColor: T.border, padding: 14, marginBottom: 14 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 }, icon: { width: 44, height: 44, borderRadius: 11, backgroundColor: '#F4EDF6', alignItems: 'center', justifyContent: 'center' }, iconText: { fontSize: 22 },
  title: { color: T.nav, fontSize: 17, fontWeight: '900' }, sub: { color: T.muted, fontSize: 10, marginTop: 3 },
  shareBadge: { backgroundColor: '#F4EDF6', borderRadius: 12, minWidth: 70, paddingHorizontal: 9, paddingVertical: 9, alignItems: 'center' }, shareValue: { color: '#6D287F', fontSize: 15, fontWeight: '900' }, shareLabel: { color: T.muted, fontSize: 8, marginTop: 2 },
  kpiRow: { flexDirection: 'row', gap: 8, marginTop: 13 }, kpi: { flex: 1, minWidth: 0, borderWidth: 1, borderColor: T.border, borderRadius: 11, padding: 10 }, kpiLabel: { color: T.muted, fontSize: 8, fontWeight: '900' }, kpiValue: { color: '#6D287F', fontSize: 14, fontWeight: '900', marginTop: 5 },
  card: { backgroundColor: '#fff', borderRadius: 15, borderWidth: 1, borderColor: T.border, overflow: 'hidden', marginBottom: 14 },
  purpleHeader: { backgroundColor: '#6D287F', paddingHorizontal: 14, paddingVertical: 11 }, headerText: { color: '#fff', fontSize: 11, fontWeight: '900', letterSpacing: 0.4 },
  chartKpis: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 14, paddingTop: 13 }, label: { color: T.muted, fontSize: 8, fontWeight: '900' }, value: { color: T.nav, fontSize: 17, fontWeight: '900', marginTop: 5 }, valuePurple: { color: '#6D287F', fontSize: 17, fontWeight: '900', marginTop: 5 },
  chart: { height: 92, paddingHorizontal: 10, paddingTop: 14, paddingBottom: 8, flexDirection: 'row', alignItems: 'flex-end' }, pointCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  bar: { width: 5, minHeight: 4, borderRadius: 3, backgroundColor: '#245F84' }, linePoint: { width: '84%', minHeight: 2, borderRadius: 2, backgroundColor: '#6D287F' }, axisLabel: { color: T.muted, fontSize: 7, marginTop: 5 },
});
