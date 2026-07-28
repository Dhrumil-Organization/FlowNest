import {
  AnalyticsExecutiveRow,
  CollectionReconciliation,
  DashboardAPI,
  DashboardCard,
  DashboardMetricKey,
  DashboardView,
} from '@/src/api/dashboard';
import { ProgressBar } from '@/src/components/dashboard/DashboardPrimitives';
import { usePermission } from '@/src/core/permissions';
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

const METRICS: Array<{ key: DashboardMetricKey; title: string; short: string; tone: string }> = [
  { key: 'SALES_ORDER', title: 'Sales Order', short: 'SO', tone: T.copper },
  { key: 'BILLING', title: 'Billing', short: 'BL', tone: T.blue },
  { key: 'COLLECTION', title: 'Collection', short: 'CL', tone: T.green },
];

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
  return (words[0]?.[0] || '') + (words[1]?.[0] || words[0]?.[1] || '');
}

function cardByKey(cards: DashboardCard[], key: DashboardMetricKey) {
  return cards.find((item) => item.key === key);
}

function monthLabel(year: number, month: number) {
  return new Date(year, month - 1, 1).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
}

function changeMonth(year: number, month: number, delta: number) {
  const d = new Date(year, month - 1 + delta, 1);
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

function MetricSummaryCard({ card, selected, onPress, tone }: {
  card?: DashboardCard;
  selected: boolean;
  onPress: () => void;
  tone: string;
}) {
  const pct = Number(card?.achievement_pct || 0);
  const configured = Boolean(card?.target_configured);
  return (
    <TouchableOpacity activeOpacity={0.88} onPress={onPress} style={[styles.metricCard, selected && { borderColor: tone, borderWidth: 2 }]}>
      <View style={styles.metricCardTop}>
        <View style={[styles.metricDot, { backgroundColor: tone }]} />
        <Text style={styles.metricCardTitle}>{card?.label || 'Metric'}</Text>
      </View>
      <Text style={styles.metricActual}>{money(card?.actual || 0)}</Text>
      <Text style={styles.metricCaption}>actual</Text>
      <View style={styles.metricTargetRow}>
        <Text style={styles.metricTargetLabel}>Target</Text>
        <Text style={styles.metricTargetValue}>{configured ? money(card?.target || 0) : 'Not configured'}</Text>
      </View>
      <ProgressBar value={configured ? pct : 0} tone={tone === T.copper ? 'orange' : tone === T.blue ? 'blue' : 'green'} />
      <View style={styles.metricFooter}>
        <Text style={[styles.metricPct, { color: tone }]}>{configured ? `${pct.toFixed(2)}%` : '—'}</Text>
        <Text style={styles.metricRemaining}>{configured ? `${money(card?.remaining || 0)} pending` : 'Manual target required'}</Text>
      </View>
    </TouchableOpacity>
  );
}

function ExecutiveRow({ row, rank, onPress }: { row: AnalyticsExecutiveRow; rank: number; onPress: () => void }) {
  const achieved = row.target > 0 && row.actual >= row.target;
  const avatarTone = [T.yd, T.green, T.purple, T.copper, T.blue][rank % 5];
  return (
    <TouchableOpacity activeOpacity={0.82} onPress={onPress} style={styles.executiveRow}>
      <Text style={styles.rank}>{rank + 1}</Text>
      <View style={[styles.avatar, { backgroundColor: avatarTone }]}>
        <Text style={styles.avatarText}>{initials(row.executive_name).toUpperCase()}</Text>
      </View>
      <View style={styles.executiveMain}>
        <Text numberOfLines={1} style={styles.executiveName}>{row.executive_name}</Text>
        <Text style={styles.executiveSub}>Target {money(row.target)}</Text>
      </View>
      <View style={styles.executiveAmounts}>
        <Text style={styles.executiveActual}>{money(row.actual)}</Text>
        <Text style={[styles.executivePct, achieved && { color: T.green }]}>{row.target > 0 ? `${row.achievement_pct.toFixed(2)}%` : 'No target'}</Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  );
}

function ReconciliationBanner({ value }: { value?: CollectionReconciliation }) {
  if (!value) return null;
  const good = value.is_reconciled;
  return (
    <View style={[styles.reconciliation, good ? styles.reconciliationGood : styles.reconciliationBad]}>
      <View style={[styles.reconciliationIcon, { backgroundColor: good ? '#DDF1E6' : '#F8E0D9' }]}>
        <Text style={{ fontWeight: '900', color: good ? T.green : T.red }}>{good ? '✓' : '!'}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.reconciliationTitle, { color: good ? T.green : T.red }]}>
          {good ? 'Executive totals reconciled' : 'Reconciliation difference found'}
        </Text>
        <Text style={styles.reconciliationText}>
          Target difference {money(value.target_difference)} · Actual difference {money(value.actual_difference)}
        </Text>
      </View>
    </View>
  );
}

export function MonthlyTargetScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ view?: string; metric?: string }>();
  const { canAccess, isSuperAdmin } = usePermission();
  const appSession = useAppSessionStore((state) => state.appSession);
  const rawLoginResponse = useAppSessionStore((state) => state.rawLoginResponse);

  const context = appSession?.business_context;
  const today = new Date();
  const initialView: DashboardView = params.view === 'owner' ? 'owner' : 'my';
  const initialMetric = METRICS.some((item) => item.key === params.metric) ? params.metric as DashboardMetricKey : 'COLLECTION';

  const [view, setView] = useState<DashboardView>(initialView);
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [selectedMetric, setSelectedMetric] = useState<DashboardMetricKey>(initialMetric);
  const [cards, setCards] = useState<DashboardCard[]>([]);
  const [executives, setExecutives] = useState<AnalyticsExecutiveRow[]>([]);
  const [reconciliation, setReconciliation] = useState<CollectionReconciliation | undefined>();
  const [periodTitle, setPeriodTitle] = useState('Monthly Target');
  const [scopeMessage, setScopeMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const yearno = context?.year_no || rawLoginResponse?.yearno || rawLoginResponse?.yno || '';
  const prptype = context?.prp_group || rawLoginResponse?.userof || rawLoginResponse?.prptype || '';
  const ownerAllowed = isSuperAdmin || canAccess('management.dashboard.owner_view') || canAccess('dashboard.owner_view');

  const load = useCallback(async (refresh = false) => {
    if (!yearno || !prptype) {
      setError('Business context is incomplete. Please sign in again and select Year and Property Group.');
      setLoading(false);
      setRefreshing(false);
      return;
    }
    refresh ? setRefreshing(true) : setLoading(true);
    setError('');
    try {
      const [cardResult, executiveResult] = await Promise.all([
        DashboardAPI.targetCard({ prptype, yearno, monthno: month, view }),
        DashboardAPI.analyticsExecutives({ prptype, yearno, monthno: month, view, metric: selectedMetric }),
      ]);
      setCards(cardResult.response.cards || []);
      setPeriodTitle(cardResult.response.period?.label || `${monthLabel(year, month)} Target`);
      setScopeMessage(cardResult.response.scope?.message || cardResult.response.message || '');
      setExecutives(executiveResult.response.data || []);
      setReconciliation(executiveResult.response.reconciliation);
    } catch (e: any) {
      setError(e?.message || 'Unable to load monthly target.');
      setExecutives([]);
      setReconciliation(undefined);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [month, prptype, selectedMetric, view, year, yearno]);

  useEffect(() => { load(); }, [load]);

  const selectedCard = useMemo(() => cardByKey(cards, selectedMetric), [cards, selectedMetric]);
  const totals = useMemo(() => ({
    actual: cards.reduce((sum, item) => sum + Number(item.actual || 0), 0),
    configured: cards.filter((item) => item.target_configured).length,
  }), [cards]);

  const moveMonth = (delta: number) => {
    const next = changeMonth(year, month, delta);
    setYear(next.year);
    setMonth(next.month);
  };

  const openExecutive = (row: AnalyticsExecutiveRow) => {
    router.push({
      pathname: selectedMetric === 'COLLECTION'
        ? '/new/(tabs)/reports/collection-flow'
        : '/new/(tabs)/reports/sales-flow',
      params: {
        view,
        metric: selectedMetric,
        level: 'parties',
        executive_code: row.executive_code,
        executive_name: row.executive_name,
        monthno: month,
      },
    } as any);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}><Text style={styles.backText}>‹</Text></TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.kicker}>DASHBOARD · {view.toUpperCase()} VIEW</Text>
          <Text style={styles.title}>Monthly Target</Text>
        </View>
        <TouchableOpacity style={styles.refreshButton} onPress={() => load(true)}><Text style={styles.refreshText}>↻</Text></TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={T.copper} />}
      >
        <View style={styles.segment}>
          <TouchableOpacity disabled={!ownerAllowed} onPress={() => ownerAllowed && setView('owner')} style={[styles.segmentButton, view === 'owner' && styles.segmentActive, !ownerAllowed && styles.segmentDisabled]}>
            <Text style={[styles.segmentText, view === 'owner' && styles.segmentTextActive]}>Owner</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setView('my')} style={[styles.segmentButton, view === 'my' && styles.segmentActive]}>
            <Text style={[styles.segmentText, view === 'my' && styles.segmentTextActive]}>My View</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.monthNavigator}>
          <TouchableOpacity onPress={() => moveMonth(-1)} style={styles.monthArrow}><Text style={styles.monthArrowText}>‹</Text></TouchableOpacity>
          <View style={{ alignItems: 'center' }}>
            <Text style={styles.monthLabel}>{monthLabel(year, month)}</Text>
            <Text style={styles.periodLabel}>{periodTitle}</Text>
          </View>
          <TouchableOpacity onPress={() => moveMonth(1)} style={styles.monthArrow}><Text style={styles.monthArrowText}>›</Text></TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.stateCard}><ActivityIndicator color={T.copper} /><Text style={styles.stateText}>Loading monthly target…</Text></View>
        ) : error ? (
          <View style={[styles.stateCard, { alignItems: 'flex-start' }]}>
            <Text style={styles.errorTitle}>Monthly target unavailable</Text>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={() => load()} style={styles.retryButton}><Text style={styles.retryText}>Retry</Text></TouchableOpacity>
          </View>
        ) : cards.length === 0 ? (
          <View style={styles.stateCard}><Text style={styles.errorTitle}>No target data</Text><Text style={styles.errorText}>{scopeMessage || 'No cards are available for this view.'}</Text></View>
        ) : (
          <>
            <View style={styles.hero}>
              <View style={styles.heroTop}>
                <View>
                  <Text style={styles.heroKicker}>MONTHLY BUSINESS TARGET</Text>
                  <Text style={styles.heroTitle}>{periodTitle}</Text>
                </View>
                <View style={styles.heroBadge}><Text style={styles.heroBadgeValue}>{totals.configured}/3</Text><Text style={styles.heroBadgeLabel}>targets</Text></View>
              </View>
              <View style={styles.heroDivider} />
              <View style={styles.heroMetrics}>
                <View style={styles.heroMetric}><Text style={styles.heroMetricLabel}>TOTAL ACTIVITY</Text><Text style={styles.heroMetricValue}>{money(totals.actual)}</Text></View>
                <View style={styles.heroMetric}><Text style={styles.heroMetricLabel}>VIEW SCOPE</Text><Text style={styles.heroMetricValueSmall}>{view === 'owner' ? 'All executives' : 'My executives'}</Text></View>
              </View>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cardsRow}>
              {METRICS.map((metric) => (
                <MetricSummaryCard
                  key={metric.key}
                  card={cardByKey(cards, metric.key)}
                  selected={selectedMetric === metric.key}
                  tone={metric.tone}
                  onPress={() => setSelectedMetric(metric.key)}
                />
              ))}
            </ScrollView>

            <View style={styles.breakdownCard}>
              <View style={[styles.breakdownHeader, { backgroundColor: METRICS.find((item) => item.key === selectedMetric)?.tone || T.nav }]}>
                <View>
                  <Text style={styles.breakdownKicker}>TARGET BREAKDOWN</Text>
                  <Text style={styles.breakdownTitle}>{selectedCard?.label || selectedMetric}</Text>
                </View>
                <View style={styles.breakdownPercent}><Text style={styles.breakdownPercentText}>{selectedCard?.target_configured ? `${Number(selectedCard.achievement_pct || 0).toFixed(1)}%` : '—'}</Text></View>
              </View>
              <View style={styles.breakdownBody}>
                <View style={styles.breakdownGrid}>
                  <View style={styles.breakdownCell}><Text style={styles.breakdownLabel}>TARGET</Text><Text style={styles.breakdownValue}>{selectedCard?.target_configured ? money(selectedCard.target) : 'Not configured'}</Text></View>
                  <View style={styles.breakdownCell}><Text style={styles.breakdownLabel}>ACTUAL</Text><Text style={[styles.breakdownValue, { color: T.green }]}>{money(selectedCard?.actual || 0)}</Text></View>
                  <View style={styles.breakdownCell}><Text style={styles.breakdownLabel}>REMAINING</Text><Text style={styles.breakdownValue}>{money(selectedCard?.remaining || 0)}</Text></View>
                  <View style={styles.breakdownCell}><Text style={styles.breakdownLabel}>STATUS</Text><Text style={styles.breakdownValueSmall}>{String(selectedCard?.status || '—').replaceAll('_', ' ')}</Text></View>
                </View>
                <ProgressBar value={selectedCard?.target_configured ? selectedCard.achievement_pct : 0} tone={selectedMetric === 'SALES_ORDER' ? 'orange' : selectedMetric === 'BILLING' ? 'blue' : 'green'} />
              </View>
            </View>

            {selectedMetric === 'COLLECTION' ? <ReconciliationBanner value={reconciliation} /> : null}

            <View style={styles.executivesCard}>
              <View style={styles.executivesHeader}>
                <View>
                  <Text style={styles.executivesKicker}>BY EXECUTIVE</Text>
                  <Text style={styles.executivesTitle}>{selectedCard?.label || 'Metric'} performance</Text>
                </View>
                <Text style={styles.executivesCount}>{executives.length}</Text>
              </View>
              {executives.length === 0 ? (
                <View style={styles.noRows}><Text style={styles.noRowsTitle}>No executive data</Text><Text style={styles.noRowsText}>No rows were returned for this metric and month.</Text></View>
              ) : executives.map((row, index) => <ExecutiveRow key={`${row.executive_code}-${index}`} row={row} rank={index} onPress={() => openExecutive(row)} />)}
            </View>

            <TouchableOpacity activeOpacity={0.88} style={styles.monthlyReportButton} onPress={() => router.push({ pathname: '/new/(tabs)/reports/monthly-report', params: { view, monthno: month } } as any)}>
              <View style={styles.monthlyReportIcon}><Text style={{ fontSize: 18 }}>📈</Text></View>
              <View style={{ flex: 1 }}><Text style={styles.monthlyReportTitle}>Open Monthly Report</Text><Text style={styles.monthlyReportSub}>Detailed charts, category and executive analysis</Text></View>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: T.bg },
  header: { backgroundColor: T.bg, paddingHorizontal: 15, paddingTop: 10, paddingBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 12 },
  backButton: { width: 40, height: 40, borderRadius: 12, backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, alignItems: 'center', justifyContent: 'center' },
  backText: { color: T.nav, fontSize: 28, marginTop: -3 },
  kicker: { fontSize: 9, color: T.copper, letterSpacing: 1, fontWeight: '900' },
  title: { color: T.ink, fontSize: 24, fontWeight: '900', marginTop: 1 },
  refreshButton: { width: 40, height: 40, borderRadius: 12, backgroundColor: T.nav, alignItems: 'center', justifyContent: 'center' },
  refreshText: { color: '#fff', fontSize: 22, fontWeight: '800' },
  content: { padding: 14, paddingBottom: 110 },
  segment: { flexDirection: 'row', backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, borderRadius: 13, overflow: 'hidden', marginBottom: 12 },
  segmentButton: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  segmentActive: { backgroundColor: T.nav },
  segmentDisabled: { opacity: 0.35 },
  segmentText: { color: T.muted, fontSize: 12, fontWeight: '900' },
  segmentTextActive: { color: '#fff' },
  monthNavigator: { backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, borderRadius: 15, paddingVertical: 10, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 13, ...S.card },
  monthArrow: { width: 36, height: 36, borderRadius: 10, backgroundColor: T.alt, alignItems: 'center', justifyContent: 'center' },
  monthArrowText: { fontSize: 25, color: T.nav, marginTop: -3 },
  monthLabel: { color: T.ink, fontWeight: '900', fontSize: 15 },
  periodLabel: { color: T.muted, fontSize: 10, marginTop: 2 },
  stateCard: { minHeight: 180, backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, borderRadius: 16, alignItems: 'center', justifyContent: 'center', padding: 18, gap: 10 },
  stateText: { color: T.muted, fontSize: 12, fontWeight: '700' },
  errorTitle: { color: T.red, fontSize: 16, fontWeight: '900' },
  errorText: { color: T.muted, fontSize: 12, lineHeight: 18 },
  retryButton: { backgroundColor: T.nav, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10, marginTop: 6 },
  retryText: { color: '#fff', fontWeight: '900', fontSize: 12 },
  hero: { backgroundColor: T.nav, borderRadius: 18, padding: 17, marginBottom: 13, ...S.card },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroKicker: { color: '#7F9AB2', fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  heroTitle: { color: '#fff', fontSize: 21, fontWeight: '900', marginTop: 3 },
  heroBadge: { width: 55, height: 55, borderRadius: 28, borderWidth: 5, borderColor: T.copper, alignItems: 'center', justifyContent: 'center', backgroundColor: '#12283B' },
  heroBadgeValue: { color: '#fff', fontSize: 14, fontWeight: '900' },
  heroBadgeLabel: { color: '#91A7B9', fontSize: 8 },
  heroDivider: { height: 1, backgroundColor: '#21394C', marginVertical: 15 },
  heroMetrics: { flexDirection: 'row', gap: 20 },
  heroMetric: { flex: 1 },
  heroMetricLabel: { color: '#7F9AB2', fontSize: 8, fontWeight: '900', letterSpacing: 0.8 },
  heroMetricValue: { color: '#fff', fontSize: 17, fontWeight: '900', marginTop: 4 },
  heroMetricValueSmall: { color: '#fff', fontSize: 14, fontWeight: '900', marginTop: 5 },
  cardsRow: { gap: 10, paddingBottom: 13 },
  metricCard: { width: 255, backgroundColor: T.surface, borderRadius: 16, borderWidth: 1, borderColor: T.border, padding: 14, ...S.card },
  metricCardTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  metricDot: { width: 9, height: 9, borderRadius: 5 },
  metricCardTitle: { color: T.ink, fontSize: 13, fontWeight: '900' },
  metricActual: { color: T.ink, fontSize: 22, fontWeight: '900', marginTop: 12 },
  metricCaption: { color: T.muted, fontSize: 9, marginTop: 1 },
  metricTargetRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, marginBottom: 7 },
  metricTargetLabel: { color: T.muted, fontSize: 9, fontWeight: '900' },
  metricTargetValue: { color: T.ink, fontSize: 10, fontWeight: '900' },
  metricFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  metricPct: { fontSize: 12, fontWeight: '900' },
  metricRemaining: { color: T.muted, fontSize: 9 },
  breakdownCard: { backgroundColor: T.surface, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: T.border, marginBottom: 13, ...S.card },
  breakdownHeader: { minHeight: 64, paddingHorizontal: 15, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  breakdownKicker: { color: 'rgba(255,255,255,0.72)', fontSize: 8, fontWeight: '900', letterSpacing: 0.8 },
  breakdownTitle: { color: '#fff', fontSize: 17, fontWeight: '900', marginTop: 2 },
  breakdownPercent: { backgroundColor: 'rgba(255,255,255,0.16)', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  breakdownPercentText: { color: '#fff', fontSize: 13, fontWeight: '900' },
  breakdownBody: { padding: 14 },
  breakdownGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -5, marginBottom: 12 },
  breakdownCell: { width: '50%', paddingHorizontal: 5, marginBottom: 13 },
  breakdownLabel: { color: T.muted, fontSize: 8, fontWeight: '900', letterSpacing: 0.7 },
  breakdownValue: { color: T.ink, fontSize: 14, fontWeight: '900', marginTop: 4 },
  breakdownValueSmall: { color: T.ink, fontSize: 11, fontWeight: '900', marginTop: 5 },
  reconciliation: { borderRadius: 14, borderWidth: 1, padding: 13, marginBottom: 13, flexDirection: 'row', alignItems: 'center', gap: 11 },
  reconciliationGood: { backgroundColor: '#F1FAF5', borderColor: '#C5E7D3' },
  reconciliationBad: { backgroundColor: '#FFF5F2', borderColor: '#ECC7BC' },
  reconciliationIcon: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  reconciliationTitle: { fontSize: 12, fontWeight: '900' },
  reconciliationText: { color: T.muted, fontSize: 9, marginTop: 2 },
  executivesCard: { backgroundColor: T.surface, borderRadius: 16, borderWidth: 1, borderColor: T.border, overflow: 'hidden', marginBottom: 13, ...S.card },
  executivesHeader: { padding: 14, borderBottomWidth: 1, borderBottomColor: T.hair, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  executivesKicker: { color: T.copper, fontSize: 8, fontWeight: '900', letterSpacing: 0.9 },
  executivesTitle: { color: T.ink, fontSize: 15, fontWeight: '900', marginTop: 2 },
  executivesCount: { color: T.nav, backgroundColor: T.alt, minWidth: 34, textAlign: 'center', paddingVertical: 7, borderRadius: 999, fontWeight: '900', fontSize: 11 },
  executiveRow: { minHeight: 67, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: T.hair },
  rank: { color: T.muted, width: 20, fontSize: 10 },
  avatar: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 9, fontWeight: '900' },
  executiveMain: { flex: 1, marginLeft: 10 },
  executiveName: { color: T.ink, fontSize: 12, fontWeight: '800' },
  executiveSub: { color: T.muted, fontSize: 9, marginTop: 3 },
  executiveAmounts: { alignItems: 'flex-end', marginLeft: 8 },
  executiveActual: { color: T.ink, fontSize: 11, fontWeight: '900' },
  executivePct: { color: T.amber, fontSize: 9, fontWeight: '900', marginTop: 3 },
  chevron: { color: T.muted, fontSize: 22, marginLeft: 8 },
  noRows: { padding: 22, alignItems: 'center' },
  noRowsTitle: { color: T.ink, fontSize: 14, fontWeight: '900' },
  noRowsText: { color: T.muted, fontSize: 11, marginTop: 4 },
  monthlyReportButton: { backgroundColor: T.surface, borderRadius: 15, borderWidth: 1, borderColor: T.border, padding: 13, flexDirection: 'row', alignItems: 'center', ...S.card },
  monthlyReportIcon: { width: 42, height: 42, borderRadius: 12, backgroundColor: T.alt, alignItems: 'center', justifyContent: 'center', marginRight: 11 },
  monthlyReportTitle: { color: T.ink, fontSize: 13, fontWeight: '900' },
  monthlyReportSub: { color: T.muted, fontSize: 9, marginTop: 3 },
});
