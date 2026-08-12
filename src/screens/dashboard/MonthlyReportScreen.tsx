import {
  AnalyticsExecutiveRow,
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

const MONTH_WINDOW = 6;

const METRIC_META: Record<DashboardMetricKey, { title: string; tone: string; bar: 'orange' | 'blue' | 'green' }> = {
  SALES_ORDER: { title: 'Sales Order vs Target', tone: T.nav, bar: 'orange' },
  BILLING: { title: 'Billing vs Target', tone: T.yd, bar: 'blue' },
  COLLECTION: { title: 'Collection vs Target', tone: T.green, bar: 'green' },
};

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

function monthKey(year: number, month: number) {
  return `${year}-${String(month).padStart(2, '0')}`;
}

function monthLabel(year: number, month: number) {
  return new Date(year, month - 1, 1).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
}

function addMonth(year: number, month: number, delta: number) {
  const d = new Date(year, month - 1 + delta, 1);
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

function cardByKey(cards: DashboardCard[], key: DashboardMetricKey) {
  return cards.find((card) => card.key === key);
}

function numberFrom(...values: unknown[]) {
  for (const value of values) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

function normalizeExecutiveRows(rows: any[], metric: DashboardMetricKey): AnalyticsExecutiveRow[] {
  return (Array.isArray(rows) ? rows : []).map((row) => {
    const target = numberFrom(row?.target, row?.target_amount, row?.target_amt, row?.Target);
    const actual = numberFrom(
      row?.actual,
      row?.actual_amount,
      row?.amount,
      row?.sales_amount,
      row?.billing_amount,
      row?.collection_amount,
      row?.Actual,
    );
    const remaining = numberFrom(row?.remaining, Math.max(0, target - actual));
    const achievement = numberFrom(
      row?.achievement_pct,
      row?.achievement,
      row?.ach,
      target > 0 ? (actual / target) * 100 : 0,
    );

    return {
      executive_code: String(row?.executive_code ?? row?.sexecode ?? row?.SExe ?? ''),
      executive_name: String(row?.executive_name ?? row?.sexename ?? row?.SExeName ?? 'Unassigned Executive'),
      target,
      actual,
      remaining,
      achievement_pct: achievement,
      metric,
    };
  }).filter((row) => row.executive_code || row.executive_name).slice(0, 50);
}

function ReportPanel({
  card,
  rows,
  metric,
  onExecutive,
}: {
  card?: DashboardCard;
  rows: AnalyticsExecutiveRow[];
  metric: DashboardMetricKey;
  onExecutive: (row: AnalyticsExecutiveRow) => void;
}) {
  const meta = METRIC_META[metric];
  const pct = Math.max(0, Number(card?.achievement_pct || 0));
  const configured = Boolean(card?.target_configured);
  const [sortConfig, setSortConfig] = useState<{
    key: 'actual' | 'ach';
    direction: 'asc' | 'desc';
  }>({
    key: 'actual',
    direction: 'desc',
  });

  const sortedRows = useMemo(() => {
    return [...rows].sort((a, b) => {
      const aValue =
        sortConfig.key === 'actual'
          ? Number(a.actual || 0)
          : Number(a.achievement_pct || 0);

      const bValue =
        sortConfig.key === 'actual'
          ? Number(b.actual || 0)
          : Number(b.achievement_pct || 0);

      return sortConfig.direction === 'asc'
        ? aValue - bValue
        : bValue - aValue;
    });
  }, [rows, sortConfig]);

  return (
    <View style={styles.panel}>
      <View style={[styles.panelHeader, { backgroundColor: meta.tone }]}>
        <Text style={styles.panelHeaderText}>{meta.title.toUpperCase()}</Text>
      </View>

      <View style={styles.panelBody}>
        <View style={styles.summaryRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.summaryLabel}>ACTUAL</Text>
            <Text style={styles.summaryValue}>{money(card?.actual || 0)}</Text>
          </View>
          <View style={styles.summaryRight}>
            <Text style={styles.summaryTarget}>{configured ? money(card?.target || 0) : 'Not configured'}</Text>
            <Text style={[styles.summaryPct, { color: meta.tone }]}>{configured ? `${pct.toFixed(2)}%` : '—'}</Text>
          </View>
        </View>

        <ProgressBar value={configured ? pct : 0} tone={meta.bar} />
        <Text style={styles.remainingText}>
          {configured ? `${money(card?.remaining || 0)} remaining` : 'Monthly target has not been configured.'}
        </Text>

        <View style={styles.pulseWrap}>
          {rows.slice(0, 14).map((row, index) => {
            const max = Math.max(...rows.map((item) => Math.abs(Number(item.actual || 0))), 1);
            const height = 12 + Math.round((Math.abs(Number(row.actual || 0)) / max) * 28);
            return <View key={`${row.executive_code}-${index}`} style={[styles.pulseBar, { height, backgroundColor: meta.tone }]} />;
          })}
          {rows.length === 0 ? <Text style={styles.noPulse}>No executive activity</Text> : null}
        </View>

        <View style={styles.tableTitleRow}>
          <Text style={styles.tableTitle}>BY EXECUTIVE</Text>
          {/* <Text style={styles.tableTitle}>ACTUAL · ACH</Text> */}
          <TouchableOpacity
            activeOpacity={0.6}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            onPress={() =>
              setSortConfig(prev => ({
                key: prev.key === 'actual' ? 'ach' : 'actual',
                direction:
                  prev.key === 'actual' && prev.direction === 'asc'
                    ? 'desc'
                    : 'asc',
              }))
            }
          >
            <Text style={styles.tableTitle}>
              ACTUAL · ACH
              {sortConfig.direction === 'asc' ? ' ▲' : ' ▼'}
            </Text>
          </TouchableOpacity>
        </View>

        {rows.length === 0 ? (
          <View style={styles.emptyBox}><Text style={styles.emptyText}>No executive records for this month.</Text></View>
        // ) : rows.map((row, index) => {
         ) : sortedRows.map((row, index) => {
          const avatarTone = [T.yd, T.green, T.purple, T.copper, T.blue][index % 5];
          return (
            <TouchableOpacity key={row.executive_code} onPress={() => onExecutive(row)} activeOpacity={0.82} style={styles.executiveRow}>
              <Text style={styles.rank}>{index + 1}</Text>
              <View style={[styles.avatar, { backgroundColor: avatarTone }]}><Text style={styles.avatarText}>{initials(row.executive_name)}</Text></View>
              <View style={styles.executiveMain}>
                <Text numberOfLines={1} style={styles.executiveName}>{row.executive_name}</Text>
                <Text style={styles.executiveTarget}>Target {money(row.target)}</Text>
              </View>
              <View style={styles.executiveRight}>
                <Text style={styles.executiveActual}>{money(row.actual)}</Text>
                <Text style={[styles.executiveAch, row.achievement_pct >= 100 && { color: T.green }]}>{row.target > 0 ? `${row.achievement_pct.toFixed(0)}%` : '—'}</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export function MonthlyReportScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    view?: string;
    monthno?: string;
    executive_code?: string;
    executive_name?: string;
  }>();
  const { canAccess, isSuperAdmin } = usePermission();
  const appSession = useAppSessionStore((state) => state.appSession);
  const rawLoginResponse = useAppSessionStore((state) => state.rawLoginResponse);

  const today = new Date();
  const initialMonth = Number(params.monthno || today.getMonth() + 1);
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(initialMonth >= 1 && initialMonth <= 12 ? initialMonth : today.getMonth() + 1);
  const [view, setView] = useState<DashboardView>(params.view === 'owner' ? 'owner' : 'my');
  const [cards, setCards] = useState<DashboardCard[]>([]);
  const [salesRows, setSalesRows] = useState<AnalyticsExecutiveRow[]>([]);
  const [billingRows, setBillingRows] = useState<AnalyticsExecutiveRow[]>([]);
  const [collectionRows, setCollectionRows] = useState<AnalyticsExecutiveRow[]>([]);
  const [periodTitle, setPeriodTitle] = useState('Monthly Report');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const context = appSession?.business_context;
  const yearno = context?.year_no || rawLoginResponse?.yearno || rawLoginResponse?.yno || '';
  const prptype = context?.prp_group || rawLoginResponse?.userof || rawLoginResponse?.prptype || '';
  const ownerAllowed = isSuperAdmin || canAccess('management.dashboard.owner_view') || canAccess('dashboard.owner_view');
  const selectedExecutive = String(params.executive_code || '').trim();

  const months = useMemo(() => {
    const result: Array<{ year: number; month: number; key: string; label: string }> = [];
    for (let offset = -(MONTH_WINDOW - 1); offset <= 0; offset += 1) {
      const item = addMonth(today.getFullYear(), today.getMonth() + 1, offset);
      result.push({ ...item, key: monthKey(item.year, item.month), label: monthLabel(item.year, item.month) });
    }
    return result;
  }, []);

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
      const common = { prptype, yearno, monthno: month, view, executive_code: selectedExecutive || undefined };
      const [cardResult, salesResult, billingResult, collectionResult] = await Promise.all([
        DashboardAPI.targetCard({ prptype, yearno, monthno: month, view }),
        DashboardAPI.analyticsExecutives({ ...common, metric: 'SALES_ORDER' }),
        DashboardAPI.analyticsExecutives({ ...common, metric: 'BILLING' }),
        DashboardAPI.analyticsExecutives({ ...common, metric: 'COLLECTION' }),
      ]);

      setCards(cardResult.response.cards || []);
      setSalesRows(normalizeExecutiveRows(salesResult.response.data || [], 'SALES_ORDER'));
      setBillingRows(normalizeExecutiveRows(billingResult.response.data || [], 'BILLING'));
      setCollectionRows(normalizeExecutiveRows(collectionResult.response.data || [], 'COLLECTION'));
      setPeriodTitle(cardResult.response.period?.month_name || `${monthLabel(year, month)}`);
    } catch (e: any) {
      setError(e?.message || 'Unable to load monthly report.');
      setSalesRows([]);
      setBillingRows([]);
      setCollectionRows([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [month, prptype, selectedExecutive, view, year, yearno]);

  useEffect(() => { load(); }, [load]);

  const openExecutive = (row: AnalyticsExecutiveRow, metric: DashboardMetricKey) => {
    if (metric === 'COLLECTION') {
      router.push({
        pathname: '/new/(tabs)/reports/collection-flow',
        params: {
          view,
          monthno: month,
          metric,
          executive_code: row.executive_code,
          executive_name: row.executive_name,
        },
      } as any);
      return;
    }

    router.push({
      pathname: '/new/(tabs)/reports/sales-flow',
      params: {
        view,
        monthno: month,
        metric,
        level: 'parties',
        executive_code: row.executive_code,
        executive_name: row.executive_name,
      },
    } as any);
  };

  const clearExecutive = () => {
    router.replace({ pathname: '/new/(tabs)/reports/monthly-report', params: { view, monthno: month } } as any);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}><Text style={styles.backText}>‹</Text></TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.kicker}>{view.toUpperCase()} · MONTHLY REPORT</Text>
          <Text numberOfLines={1} style={styles.title}>{selectedExecutive ? params.executive_name || 'Executive Report' : 'Monthly Report'}</Text>
        </View>
        <TouchableOpacity onPress={() => load(true)} style={styles.refreshButton}><Text style={styles.refreshText}>↻</Text></TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={T.nav} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.segment}>
          <TouchableOpacity onPress={() => setView('owner')} disabled={!ownerAllowed} style={[styles.segmentButton, view === 'owner' && styles.segmentActive, !ownerAllowed && styles.segmentDisabled]}>
            <Text style={[styles.segmentText, view === 'owner' && styles.segmentTextActive]}>Owner</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setView('my')} style={[styles.segmentButton, view === 'my' && styles.segmentActive]}>
            <Text style={[styles.segmentText, view === 'my' && styles.segmentTextActive]}>My View</Text>
          </TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.monthRow}>
          {months.map((item) => {
            const active = item.year === year && item.month === month;
            return (
              <TouchableOpacity key={item.key} onPress={() => { setYear(item.year); setMonth(item.month); }} style={[styles.monthChip, active && styles.monthChipActive]}>
                <Text style={[styles.monthChipText, active && styles.monthChipTextActive]}>{item.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={styles.reportHeaderCard}>
          <View>
            <Text style={styles.reportHeaderKicker}>REPORTING PERIOD</Text>
            <Text style={styles.reportHeaderTitle}>{periodTitle}</Text>
          </View>
          {selectedExecutive ? (
            <TouchableOpacity onPress={clearExecutive} style={styles.clearButton}><Text style={styles.clearButtonText}>All executives</Text></TouchableOpacity>
          ) : null}
        </View>

        {loading ? (
          <View style={styles.loadingBox}><ActivityIndicator color={T.nav} size="large" /><Text style={styles.loadingText}>Loading monthly performance…</Text></View>
        ) : error ? (
          <View style={styles.errorBox}><Text style={styles.errorTitle}>Unable to load report</Text><Text style={styles.errorText}>{error}</Text><TouchableOpacity onPress={() => load()} style={styles.retryButton}><Text style={styles.retryText}>Retry</Text></TouchableOpacity></View>
        ) : (
          <>
            <ReportPanel card={cardByKey(cards, 'SALES_ORDER')} rows={salesRows} metric="SALES_ORDER" onExecutive={(row) => openExecutive(row, 'SALES_ORDER')} />
            <ReportPanel card={cardByKey(cards, 'BILLING')} rows={billingRows} metric="BILLING" onExecutive={(row) => openExecutive(row, 'BILLING')} />
            <ReportPanel card={cardByKey(cards, 'COLLECTION')} rows={collectionRows} metric="COLLECTION" onExecutive={(row) => openExecutive(row, 'COLLECTION')} />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: T.bg },
  header: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 12 },
  backButton: { width: 40, height: 40, borderRadius: 12, backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, alignItems: 'center', justifyContent: 'center' },
  backText: { fontSize: 28, color: T.nav, marginTop: -3 },
  kicker: { fontSize: 9, color: T.copper, fontWeight: '900', letterSpacing: 0.9 },
  title: { fontSize: 23, color: T.ink, fontWeight: '900', marginTop: 2 },
  refreshButton: { width: 40, height: 40, borderRadius: 12, backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, alignItems: 'center', justifyContent: 'center' },
  refreshText: { fontSize: 19, color: T.nav, fontWeight: '900' },
  content: { paddingHorizontal: 16, paddingBottom: 32 },
  segment: { flexDirection: 'row', backgroundColor: T.surface, borderRadius: 12, borderWidth: 1, borderColor: T.border, overflow: 'hidden', marginBottom: 12 },
  segmentButton: { flex: 1, minHeight: 42, alignItems: 'center', justifyContent: 'center' },
  segmentActive: { backgroundColor: T.nav },
  segmentDisabled: { opacity: 0.45 },
  segmentText: { color: T.muted, fontWeight: '800', fontSize: 12 },
  segmentTextActive: { color: '#fff' },
  monthRow: { paddingBottom: 12, gap: 8 },
  monthChip: { paddingHorizontal: 15, paddingVertical: 9, backgroundColor: T.surface, borderRadius: 999, borderWidth: 1, borderColor: T.border },
  monthChipActive: { backgroundColor: T.nav, borderColor: T.nav },
  monthChipText: { color: T.muted, fontWeight: '800', fontSize: 11 },
  monthChipTextActive: { color: '#fff' },
  reportHeaderCard: { backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, borderRadius: 16, padding: 15, marginBottom: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', ...S.card },
  reportHeaderKicker: { fontSize: 9, fontWeight: '900', color: T.muted, letterSpacing: 0.8 },
  reportHeaderTitle: { fontSize: 18, fontWeight: '900', color: T.ink, marginTop: 3 },
  clearButton: { backgroundColor: T.alt, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  clearButtonText: { color: T.nav, fontSize: 10, fontWeight: '900' },
  loadingBox: { backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, borderRadius: 16, paddingVertical: 50, alignItems: 'center' },
  loadingText: { marginTop: 10, color: T.muted, fontSize: 12 },
  errorBox: { backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, borderRadius: 16, padding: 20 },
  errorTitle: { color: T.red, fontSize: 16, fontWeight: '900' },
  errorText: { color: T.muted, fontSize: 12, lineHeight: 18, marginTop: 6 },
  retryButton: { alignSelf: 'flex-start', backgroundColor: T.nav, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9, marginTop: 14 },
  retryText: { color: '#fff', fontWeight: '900', fontSize: 11 },
  panel: { backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, borderRadius: 16, overflow: 'hidden', marginBottom: 14, ...S.card },
  panelHeader: { minHeight: 42, paddingHorizontal: 14, justifyContent: 'center' },
  panelHeaderText: { color: '#fff', fontWeight: '900', fontSize: 11, letterSpacing: 0.55 },
  panelBody: { padding: 14 },
  summaryRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 10 },
  summaryLabel: { color: T.muted, fontSize: 9, fontWeight: '900', letterSpacing: 0.7 },
  summaryValue: { color: T.ink, fontSize: 20, fontWeight: '900', marginTop: 3 },
  summaryRight: { alignItems: 'flex-end' },
  summaryTarget: { color: T.muted, fontSize: 11, fontWeight: '700' },
  summaryPct: { fontSize: 15, fontWeight: '900', marginTop: 2 },
  remainingText: { alignSelf: 'flex-end', color: T.muted, fontSize: 10, marginTop: 6 },
  pulseWrap: { height: 52, marginTop: 10, marginBottom: 12, borderBottomWidth: 1, borderBottomColor: T.hair, flexDirection: 'row', alignItems: 'flex-end', gap: 7, paddingHorizontal: 3 },
  pulseBar: { flex: 1, minWidth: 4, borderTopLeftRadius: 3, borderTopRightRadius: 3, opacity: 0.9 },
  noPulse: { color: T.muted, fontSize: 10, marginBottom: 12 },
  tableTitleRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: T.hair },
  tableTitle: { color: T.muted, fontSize: 9, fontWeight: '900', letterSpacing: 0.65 },
  executiveRow: { minHeight: 58, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: T.hair },
  rank: { width: 20, color: T.muted, fontSize: 10, fontWeight: '800' },
  avatar: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 9 },
  avatarText: { color: '#fff', fontSize: 9, fontWeight: '900' },
  executiveMain: { flex: 1, minWidth: 0 },
  executiveName: { color: T.ink, fontSize: 12, fontWeight: '800' },
  executiveTarget: { color: T.muted, fontSize: 9, marginTop: 3 },
  executiveRight: { alignItems: 'flex-end', marginLeft: 8 },
  executiveActual: { color: T.ink, fontSize: 11, fontWeight: '900' },
  executiveAch: { color: T.copper, fontSize: 10, fontWeight: '900', marginTop: 2 },
  chevron: { color: T.muted, fontSize: 20, marginLeft: 7 },
  emptyBox: { paddingVertical: 18, alignItems: 'center' },
  emptyText: { color: T.muted, fontSize: 11 },
});
