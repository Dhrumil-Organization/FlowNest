import {
  AnalyticsPartyRow,
  DashboardAPI,
  DashboardView,
} from '@/src/api/dashboard';
import { ProgressBar } from '@/src/components/dashboard/DashboardPrimitives';
import { useAppSessionStore } from '@/src/stores/AppSessionStore';
import { S, T } from '@/src/theme';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

function one(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value || '';
}

function money(value: number) {
  const n = Number(value || 0);
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 10000000) return `${sign}₹${(abs / 10000000).toFixed(2)} Cr`;
  if (abs >= 100000) return `${sign}₹${(abs / 100000).toFixed(2)} L`;
  return `${sign}₹${abs.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

function initials(name: string) {
  const words = String(name || '').trim().split(/\s+/).filter(Boolean);
  return ((words[0]?.[0] || '') + (words[1]?.[0] || words[0]?.[1] || '')).toUpperCase();
}

function achievementTone(pct: number) {
  if (pct >= 100) return T.green;
  if (pct >= 70) return T.blue;
  if (pct >= 40) return T.copper;
  return T.red;
}

export default function CollectionFlowScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const session = useAppSessionStore((s: any) => s.appSession || s.session);

  const view = (one(params.view as any) || 'my') as DashboardView;
  const monthno = Number(one(params.monthno as any) || new Date().getMonth() + 1);
  const executiveCode = one(params.executive_code as any);
  const executiveName = one(params.executive_name as any) || 'Collection Executive';

  const context = session?.business_context || session?.businessContext || {};
  const yearno = context?.year_no ?? context?.yearno ?? session?.year_no ?? 27;
  const prptype = context?.prp_group ?? context?.prptype ?? 'S';

  const [rows, setRows] = useState<AnalyticsPartyRow[]>([]);
  const [periodTitle, setPeriodTitle] = useState('Monthly Collection');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: 'target' | 'actual'; direction: 'asc' | 'desc'; }>({
    key: 'target', direction: 'desc',
  });

  const load = useCallback(async (pull = false) => {
    pull ? setRefreshing(true) : setLoading(true);
    setError('');
    try {
      const result = await DashboardAPI.analyticsParties({
        metric: 'COLLECTION',
        prptype,
        yearno,
        monthno,
        view,
        executive_code: executiveCode || undefined,
      });
      setRows(result.response.data || []);
      setPeriodTitle(result.response.period?.month_name || 'Monthly Collection');
    } catch (e: any) {
      setRows([]);
      setError(e?.message || 'Unable to load collection parties.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [executiveCode, monthno, prptype, view, yearno]);

  useEffect(() => { load(); }, [load]);

  const totals = useMemo(() => rows.reduce((acc, row) => ({
    target: acc.target + Number(row.target || 0),
    actual: acc.actual + Number(row.actual || 0),
    remaining: acc.remaining + Number(row.remaining || 0),
  }), { target: 0, actual: 0, remaining: 0 }), [rows]);

  const totalPct = totals.target > 0 ? (totals.actual / totals.target) * 100 : 0;

  const sortedRows = useMemo(() => {
    return [...rows].sort((a: any, b: any) => {
      const aValue = Number(
        sortConfig.key === 'target' ? a.target || 0 : a.actual || 0
      );

      const bValue = Number(
        sortConfig.key === 'target' ? b.target || 0 : b.actual || 0
      );

      return sortConfig.direction === 'asc'
        ? aValue - bValue
        : bValue - aValue;
    });
  }, [rows, sortConfig]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <View style={styles.headerMain}>
          <Text style={styles.kicker}>COLLECTION REPORT · {view.toUpperCase()} VIEW</Text>
          <Text numberOfLines={1} style={styles.title}>{executiveName}</Text>
          <Text style={styles.period}>{periodTitle}</Text>
        </View>
        <TouchableOpacity onPress={() => load(true)} style={styles.headerButton}>
          <Text style={styles.refreshText}>↻</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={T.nav} />}
      >
        <View style={styles.hero}>
          <View style={styles.heroTop}>
            <View style={styles.avatar}><Text style={styles.avatarText}>{initials(executiveName)}</Text></View>
            <View style={styles.heroNameWrap}>
              <Text style={styles.heroKicker}>EXECUTIVE COLLECTION</Text>
              <Text numberOfLines={1} style={styles.heroName}>{executiveName}</Text>
              <Text style={styles.heroSub}>{rows.length} parties assigned</Text>
            </View>
            <View style={[styles.pctBadge, { backgroundColor: achievementTone(totalPct) }]}>
              <Text style={styles.pctValue}>{totalPct.toFixed(1)}%</Text>
              <Text style={styles.pctLabel}>ACHIEVED</Text>
            </View>
          </View>

          <View style={styles.heroMetrics}>
            <View style={styles.heroMetric}><Text style={styles.metricLabel}>TARGET</Text><Text style={styles.metricValue}>{money(totals.target)}</Text></View>
            <View style={styles.heroDivider} />
            <View style={styles.heroMetric}><Text style={styles.metricLabel}>COLLECTED</Text><Text style={[styles.metricValue, { color: T.green }]}>{money(totals.actual)}</Text></View>
            <View style={styles.heroDivider} />
            <View style={styles.heroMetric}><Text style={styles.metricLabel}>BALANCE</Text><Text style={[styles.metricValue, { color: T.copper }]}>{money(totals.remaining)}</Text></View>
          </View>
          <ProgressBar value={Math.min(totalPct, 100)} tone={totalPct >= 100 ? 'green' : totalPct >= 60 ? 'blue' : 'orange'} />
        </View>

        <View style={styles.notice}>
          <View style={styles.noticeIcon}><Text style={styles.noticeIconText}>₹</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.noticeTitle}>Party-wise collection performance</Text>
            <Text style={styles.noticeText}>Target is due outstanding. Actual is receipt allocation linked through the production-safe collection engine.</Text>
          </View>
        </View>

        <View style={styles.panel}>
          <View style={styles.panelHeader}>
            <View><Text style={styles.panelKicker}>COLLECTION BREAKDOWN</Text><Text style={styles.panelTitle}>By Party</Text></View>
            <View style={styles.count}><Text style={styles.countText}>{rows.length}</Text></View>
          </View>
          <View style={styles.columns}>
            <Text style={styles.columnName}>PARTY</Text>
            {/* <Text style={styles.columnValue}>TARGET · ACTUAL</Text> */}
            <TouchableOpacity
              activeOpacity={0.6}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              onPress={() =>
                setSortConfig(prev => ({
                  key: prev.key === 'target' ? 'actual' : 'target',
                  direction:
                    prev.key === 'target' && prev.direction === 'asc'
                      ? 'desc'
                      : 'asc',
                }))
              }
            >
              <Text style={styles.columnValue}>
                TARGET · ACTUAL
                {sortConfig.direction === 'asc' ? ' ▲' : ' ▼'}
              </Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.state}><ActivityIndicator size="large" color={T.nav} /><Text style={styles.stateText}>Loading party collection…</Text></View>
          ) : error ? (
            <View style={styles.state}><Text style={styles.errorTitle}>Unable to load report</Text><Text style={styles.stateText}>{error}</Text><TouchableOpacity onPress={() => load()} style={styles.retry}><Text style={styles.retryText}>Retry</Text></TouchableOpacity></View>
          ) : rows.length === 0 ? (
            <View style={styles.state}><Text style={styles.emptyTitle}>No collection records</Text><Text style={styles.stateText}>No party-wise collection data is available for this executive and month.</Text></View>
          // ) : rows.map((row, index) => {
          ) : sortedRows.map((row, index) => {
            const pct = Number(row.achievement_pct || 0);
            const tone = achievementTone(pct);
            return (
              <View key={`${row.party_code}-${index}`} style={styles.row}>
                <View style={[styles.rank, { backgroundColor: [T.nav, T.blue, T.green, T.copper, T.purple][index % 5] }]}><Text style={styles.rankText}>{index + 1}</Text></View>
                <View style={styles.rowMain}>
                  <Text numberOfLines={1} style={styles.partyName}>{row.party_name || 'Unspecified Party'}</Text>
                  <Text numberOfLines={1} style={styles.partyCode}>{row.party_code || 'No code'}</Text>
                  <View style={styles.miniBarTrack}><View style={[styles.miniBarFill, { width: `${Math.min(Math.max(pct, 0), 100)}%`, backgroundColor: tone }]} /></View>
                </View>
                <View style={styles.rowRight}>
                  <Text style={styles.targetText}>{money(row.target)}</Text>
                  <Text style={styles.actualText}>{money(row.actual)}</Text>
                  <Text style={[styles.rowPct, { color: tone }]}>{row.target > 0 ? `${pct.toFixed(2)}%` : 'No target'}</Text>
                </View>
              </View>
            );
          })}

          {!loading && !error && rows.length > 0 ? (
            <View style={styles.totalRow}>
              <View><Text style={styles.totalKicker}>TOTAL COLLECTION</Text><Text style={styles.totalSub}>{rows.length} parties</Text></View>
              <View style={{ alignItems: 'flex-end' }}><Text style={styles.totalValue}>{money(totals.actual)}</Text><Text style={styles.totalTarget}>of {money(totals.target)}</Text></View>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: T.bg },
  header: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerButton: { width: 40, height: 40, borderRadius: 12, backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, alignItems: 'center', justifyContent: 'center' },
  backText: { color: T.nav, fontSize: 28, marginTop: -3 },
  refreshText: { color: T.nav, fontSize: 19, fontWeight: '900' },
  headerMain: { flex: 1, minWidth: 0 },
  kicker: { color: T.copper, fontSize: 8, fontWeight: '900', letterSpacing: 0.8 },
  title: { color: T.ink, fontSize: 21, fontWeight: '900', marginTop: 2 },
  period: { color: T.muted, fontSize: 10, marginTop: 2 },
  content: { paddingHorizontal: 16, paddingBottom: 36 },
  hero: { backgroundColor: T.nav, borderRadius: 18, padding: 15, ...S.card },
  heroTop: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 48, height: 48, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.13)', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 15, fontWeight: '900' },
  heroNameWrap: { flex: 1, minWidth: 0, marginLeft: 11 },
  heroKicker: { color: 'rgba(255,255,255,0.58)', fontSize: 8, fontWeight: '900', letterSpacing: 0.8 },
  heroName: { color: '#fff', fontSize: 16, fontWeight: '900', marginTop: 2 },
  heroSub: { color: 'rgba(255,255,255,0.62)', fontSize: 9, marginTop: 3 },
  pctBadge: { minWidth: 68, borderRadius: 13, paddingVertical: 8, paddingHorizontal: 7, alignItems: 'center' },
  pctValue: { color: '#fff', fontSize: 14, fontWeight: '900' },
  pctLabel: { color: 'rgba(255,255,255,0.78)', fontSize: 7, fontWeight: '900', marginTop: 1 },
  heroMetrics: { marginTop: 15, marginBottom: 12, flexDirection: 'row', alignItems: 'center' },
  heroMetric: { flex: 1 },
  heroDivider: { width: 1, height: 31, backgroundColor: 'rgba(255,255,255,0.15)', marginHorizontal: 7 },
  metricLabel: { color: 'rgba(255,255,255,0.55)', fontSize: 7, fontWeight: '900', letterSpacing: 0.5 },
  metricValue: { color: '#fff', fontSize: 12, fontWeight: '900', marginTop: 4 },
  notice: { marginTop: 12, backgroundColor: T.surface, borderRadius: 15, borderWidth: 1, borderColor: T.border, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10, ...S.card },
  noticeIcon: { width: 36, height: 36, borderRadius: 11, backgroundColor: T.alt, alignItems: 'center', justifyContent: 'center' },
  noticeIconText: { color: T.green, fontSize: 17, fontWeight: '900' },
  noticeTitle: { color: T.ink, fontSize: 11, fontWeight: '900' },
  noticeText: { color: T.muted, fontSize: 9, lineHeight: 14, marginTop: 3 },
  panel: { marginTop: 12, backgroundColor: T.surface, borderRadius: 17, borderWidth: 1, borderColor: T.border, overflow: 'hidden', ...S.card },
  panelHeader: { padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: T.surface },
  panelKicker: { color: T.copper, fontSize: 8, fontWeight: '900', letterSpacing: 0.75 },
  panelTitle: { color: T.ink, fontSize: 17, fontWeight: '900', marginTop: 2 },
  count: { minWidth: 34, borderRadius: 999, backgroundColor: T.alt, paddingVertical: 7, paddingHorizontal: 8 },
  countText: { color: T.nav, textAlign: 'center', fontSize: 10, fontWeight: '900' },
  columns: { minHeight: 35, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderBottomWidth: 1, borderColor: T.hair },
  columnName: { flex: 1, color: T.muted, fontSize: 8, fontWeight: '900', letterSpacing: 0.6 },
  columnValue: { color: T.muted, fontSize: 8, fontWeight: '900', letterSpacing: 0.6 },
  state: { minHeight: 190, padding: 24, alignItems: 'center', justifyContent: 'center' },
  stateText: { color: T.muted, fontSize: 10, lineHeight: 16, textAlign: 'center', marginTop: 8 },
  errorTitle: { color: T.red, fontSize: 14, fontWeight: '900' },
  emptyTitle: { color: T.ink, fontSize: 14, fontWeight: '900' },
  retry: { marginTop: 12, backgroundColor: T.nav, paddingHorizontal: 15, paddingVertical: 9, borderRadius: 10 },
  retryText: { color: '#fff', fontSize: 10, fontWeight: '900' },
  row: { minHeight: 76, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: T.hair },
  rank: { width: 29, height: 29, borderRadius: 15, alignItems: 'center', justifyContent: 'center', marginRight: 9 },
  rankText: { color: '#fff', fontSize: 9, fontWeight: '900' },
  rowMain: { flex: 1, minWidth: 0 },
  partyName: { color: T.ink, fontSize: 12, fontWeight: '800' },
  partyCode: { color: T.muted, fontSize: 8, marginTop: 3 },
  miniBarTrack: { height: 4, borderRadius: 999, backgroundColor: T.hair, overflow: 'hidden', marginTop: 7 },
  miniBarFill: { height: '100%', borderRadius: 999 },
  rowRight: { alignItems: 'flex-end', marginLeft: 10 },
  targetText: { color: T.muted, fontSize: 9, fontWeight: '700' },
  actualText: { color: T.ink, fontSize: 11, fontWeight: '900', marginTop: 3 },
  rowPct: { fontSize: 8, fontWeight: '900', marginTop: 3 },
  totalRow: { minHeight: 58, backgroundColor: T.alt, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  totalKicker: { color: T.nav, fontSize: 9, fontWeight: '900', letterSpacing: 0.7 },
  totalSub: { color: T.muted, fontSize: 8, marginTop: 3 },
  totalValue: { color: T.green, fontSize: 14, fontWeight: '900' },
  totalTarget: { color: T.muted, fontSize: 8, marginTop: 2 },
});
