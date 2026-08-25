import { getCurrentFinancialYear } from '@/common/commonfunction';
import { DashboardAPI, DashboardCard, DashboardView, ExpenseDashboardData } from '@/src/api/dashboard';
import { EmptyState, ProgressBar } from '@/src/components/dashboard/DashboardPrimitives';
import { AmountDisplayModeControl, formatDashboardAmount, useDashboardAmountMode } from '@/src/components/dashboard/AmountDisplayModeControl';
import ExpenseDashboardCard from '@/src/components/dashboard/ExpenseDashboardCard';
import { useHeaderExtrasStore } from '@/src/core/layout/headerExtras';
import { usePermission } from '@/src/core/permissions';
import { RegistryRenderer } from '@/src/core/ui-registry';
import EmployDashboardSection from '@/src/screens/dashboard/employ/screens/EmployDashboardSection';
import { useAppSessionStore } from '@/src/stores/AppSessionStore';
import { S, T } from '@/src/theme';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
// FIX: the header is now rendered once, in app/new/(tabs)/_layout.tsx —
// this screen no longer renders its own AppHeader (that was the second
// "Business Dashboard" header stacking on top of whichever tab you
// actually navigated to). This screen no longer needs its own top-inset
// SafeAreaView either, since the tabs layout's one SafeAreaView + header
// already accounts for it — reverted to a plain View.

function cardByKey(cards: DashboardCard[], key: DashboardCard['key']) {
  return cards.find((card) => card.key === key);
}

function TargetSummary({ cards, label, onOpen, amountMode }: { cards: DashboardCard[]; label: string; onOpen: () => void; amountMode: 'compact' | 'actual' }) {
  const so = cardByKey(cards, 'SALES_ORDER');
  const billing = cardByKey(cards, 'BILLING');
  const collection = cardByKey(cards, 'COLLECTION');
  // Manual Sales/Billing targets may be intentionally unconfigured. The dashboard ring
  // represents billed conversion, so use Billing Actual ÷ Sales Order Actual.
  const salesActual = Number(so?.actual || 0);
  const billingActual = Number(billing?.actual || 0);
  const billedPct = salesActual > 0 ? (billingActual / salesActual) * 100 : 0;

  return (
    <TouchableOpacity activeOpacity={0.92} onPress={onOpen} style={styles.targetCard}>
      <View style={styles.targetHeader}>
        <View>
          <Text style={styles.targetTitle}>{label}</Text>
          <Text style={styles.targetSub}>Tap for target breakdown</Text>
        </View>
        <Text style={styles.targetArrow}>›</Text>
      </View>

      <View style={styles.targetBody}>
        <View style={styles.ringOuter}>
          <View style={styles.ringInner}>
            <Text style={styles.ringValue}>{Math.round(Math.min(999, billedPct))}%</Text>
            <Text style={styles.ringLabel}>billed</Text>
          </View>
        </View>

        <View style={styles.targetMetrics}>
          <Text style={styles.darkKicker}>SALES</Text>
          <Text style={styles.darkLine}>SO booked <Text style={styles.copper}>{formatDashboardAmount(so?.actual || 0, amountMode)}</Text></Text>
          <Text style={styles.darkLine}>Billed <Text style={styles.blueText}>{formatDashboardAmount(billing?.actual || 0, amountMode)}</Text></Text>
          <Text style={[styles.darkKicker, { marginTop: 12 }]}>COLLECTION</Text>
          <ProgressBar value={collection?.achievement_pct || 0} />
          <Text style={styles.collectionLine}>
            {formatDashboardAmount(collection?.actual || 0, amountMode)} / {formatDashboardAmount(collection?.target || 0, amountMode)}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}


function MonthlyReportCard({
  label,
  view,
  onOpen,
}: {
  label: string;
  view: DashboardView;
  onOpen: () => void;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={onOpen}
      style={styles.monthlyReportCard}
    >
      <View style={styles.monthlyReportIcon}>
        <Text style={styles.monthlyReportIconText}>↗</Text>
      </View>

      <View style={styles.monthlyReportMain}>
        <Text style={styles.monthlyReportKicker}>
          {view === 'owner' ? 'OWNER' : 'MY VIEW'} · MONTHLY REPORT
        </Text>
        <Text style={styles.monthlyReportTitle}>Monthly Report</Text>
        <Text style={styles.monthlyReportSub}>
          {label} · Sales order, billing and collection
        </Text>
      </View>

      <Text style={styles.monthlyReportArrow}>›</Text>
    </TouchableOpacity>
  );
}

export function DashboardScreen(token: any, getUserPrptype: any) {
  const router = useRouter();
  const { canAccess, isSuperAdmin } = usePermission();
  const appSession = useAppSessionStore((state) => state.appSession);
  const rawLoginResponse = useAppSessionStore((state) => state.rawLoginResponse);
  const sessionUser = useAppSessionStore((state) => state.user);
  const logout = useAppSessionStore((state) => state.logout);

  const context = appSession?.business_context;
  const isDirector = Number(
    sessionUser?.is_director ??
    rawLoginResponse?.is_director ??
    rawLoginResponse?.user?.is_director ??
    0,
  ) === 1;
  const hasOwnerAuthority = isDirector || isSuperAdmin;

  const [view, setView] = useState<DashboardView>(hasOwnerAuthority ? 'owner' : 'my');
  const { mode: amountMode, setMode: setAmountMode } = useDashboardAmountMode();
  const [cards, setCards] = useState<DashboardCard[]>([]);
  const [periodLabel, setPeriodLabel] = useState('Monthly Target');
  const [scopeMessage, setScopeMessage] = useState('');
  const [ownerAllowedFromApi, setOwnerAllowedFromApi] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [expenseData, setExpenseData] = useState<ExpenseDashboardData | null>(null);
  const [expenseLoading, setExpenseLoading] = useState(true);
  const [expenseError, setExpenseError] = useState('');
  // const [token, setToken] = useState('');
  const [username, setUsername] = useState('');
  const [getToken, setToken] = useState('');
  const [getPrp, setPrp] = useState('');

  const now = new Date();
  const yearno = context?.year_no || rawLoginResponse?.yearno || rawLoginResponse?.yno || '';
  const prptype = context?.prp_group || rawLoginResponse?.userof || rawLoginResponse?.prptype || '';
  const monthno = now.getMonth() + 1;
  const ownerAllowed = ownerAllowedFromApi ?? hasOwnerAuthority;

  // useEffect(() => {
  //   // if (!token) return
  //   const load = async () => {
  //     const t = await AsyncStorage.getItem('access_token');
  //     const u = await AsyncStorage.getItem('user_details');

  //     setToken(t || '');
  //     setUsername(u || 'User');
  //   };
  //   load();
  // }, [token]);

  useEffect(() => {
    if (!ownerAllowed && view === 'owner') {
      setView('my');
    }
  }, [ownerAllowed, view]);

  useEffect(() => {
    if (!token) return;
    setToken(token);
    return;

  }, [token]);

  useEffect(() => {
    if (!getUserPrptype) return;
    setPrp(getUserPrptype);
    return;

  }, [getUserPrptype]);

  console.log('aaa token', token)


  // Pushes this screen's subtitle into the one shared header (see
  // headerExtras.ts). useFocusEffect (not useEffect) so it's cleared when
  // you navigate away, not just on unmount — Expo Router's Tabs keep this
  // screen mounted-but-hidden on other tabs rather than unmounting it.
  const setHeaderExtras = useHeaderExtrasStore((state) => state.setHeaderExtras);
  const clearHeaderExtras = useHeaderExtrasStore((state) => state.clearHeaderExtras);
  useFocusEffect(
    useCallback(() => {
      setHeaderExtras({
        subtitle: `${context?.prp_code || '—'} · FY ${context?.year_name || yearno || '—'} · Store ${context?.str_code || '—'}`,
      });
      return () => clearHeaderExtras();
    }, [context?.prp_code, context?.year_name, context?.str_code, yearno, setHeaderExtras, clearHeaderExtras]),
  );

  const loadExpense = useCallback(async (forceRefresh = false) => {
    if (!yearno || !prptype) {
      setExpenseLoading(false);
      return;
    }

    setExpenseLoading(true);
    setExpenseError('');

    try {
      const result = await DashboardAPI.expenseCard({
        prptype,
        yearno,
        monthno,
        refresh: forceRefresh ? 1 : 0,
      });
      console.log("result",result);
      setExpenseData(result.response?.data || null);
    } catch (e: any) {
      setExpenseError(e?.message || 'Unable to load production cost.');
    } finally {
      setExpenseLoading(false);
    }
  }, [monthno, prptype, yearno]);

  const load = useCallback(async (showRefresh = false) => {
    if (!yearno || !prptype) {
      setError('Business context is incomplete. Please sign in again and select Year and Property Group.');
      setLoading(false);
      setRefreshing(false);
      return;
    }

    showRefresh ? setRefreshing(true) : setLoading(true);
    setError('');
    try {
      const result = await DashboardAPI.targetCard({ prptype, yearno, monthno, view });
      console.log("prptype",prptype);
      console.log("result",result);
      const payload = result.response;

      // Keep the user's selected view. The backend is the sole scope
      // authority; React must never silently change My View back to Owner.

      setCards(payload.cards || []);
      setPeriodLabel(payload.period?.label || payload.period?.month_name || 'Monthly Target');
      setScopeMessage(payload.scope?.message || payload.message || '');
      if (payload.scope?.owner_view_allowed !== undefined) {
        setOwnerAllowedFromApi(Boolean(payload.scope.owner_view_allowed));
      }
    } catch (e: any) {
      setError(e?.message || 'Unable to load dashboard.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [monthno, prptype, view, yearno]);

  useEffect(() => {
    load();
    loadExpense(false);
  }, [load, loadExpense]);

  const collection = useMemo(() => cardByKey(cards, 'COLLECTION'), [cards]);
  const billing = useMemo(() => cardByKey(cards, 'BILLING'), [cards]);
  const salesOrder = useMemo(() => cardByKey(cards, 'SALES_ORDER'), [cards]);

  const detailVisibility = useMemo(() => ({
    sales: canAccess('dashboard.sales_detail'),
    production: canAccess('dashboard.production_detail'),
    collection: canAccess('dashboard.collection_detail'),
    outstanding: canAccess('dashboard.outstanding_detail'),
  }), [canAccess]);

  const confirmLogout = () => Alert.alert('Sign out?', 'This will clear the mobile session on this device.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Sign out', style: 'destructive', onPress: logout },
  ]);

  return (
    <View style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { load(true); loadExpense(true); }} tintColor={T.copper} />}
      >
        <View style={styles.segment}>
          <TouchableOpacity
            disabled={!ownerAllowed}
            onPress={() => ownerAllowed && setView('owner')}
            style={[styles.segmentButton, view === 'owner' && styles.segmentActive, !ownerAllowed && styles.segmentDisabled]}
          >
            <Text style={[styles.segmentText, view === 'owner' && styles.segmentTextActive]}>Owner</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setView('my')}
            style={[styles.segmentButton, view === 'my' && styles.segmentActive]}
          >
            <Text style={[styles.segmentText, view === 'my' && styles.segmentTextActive]}>My View</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.amountModeRow}>
          <Text style={styles.amountModeLabel}>AMOUNT</Text>
          <AmountDisplayModeControl mode={amountMode} onChange={setAmountMode} compact />
        </View>

        {loading ? (
          <View style={styles.loadingCard}><ActivityIndicator color={T.copper} /><Text style={styles.loadingText}>Loading dashboard…</Text></View>
        ) : error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>Dashboard unavailable</Text>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => load()}><Text style={styles.retryText}>Retry</Text></TouchableOpacity>
          </View>
        ) : (
          <>
            {/* {view !== 'my' && ( */}
            {/* <DashboardSection title="THIS MONTH · BUSINESS PULSE" tone="orange" action="Refresh" onAction={() => load(true)}>
                <View style={styles.metricRow}>
                  <MetricCell label="SALES ORDER" value={formatDashboardAmount(salesOrder?.actual || 0, amountMode)} />
                  <MetricCell label="BILLING" value={formatDashboardAmount(billing?.actual || 0, amountMode)} />
                </View>
                <View style={[styles.metricRow, { marginTop: 15 }]}>
                  <MetricCell label="COLLECTION" value={formatDashboardAmount(collection?.actual || 0, amountMode)} accent />
                  <MetricCell label="OUTSTANDING" value={formatDashboardAmount(collection?.remaining || 0, amountMode)} />
                </View>
              </DashboardSection> */}
            {/* )} */}
            {view === 'owner' && (
              <ExpenseDashboardCard
                token={getToken?.token || ''}
                prptype={getToken?.getUserPrptype || ''}
                yearno={getCurrentFinancialYear()}
                monthno={new Date().getMonth() + 1}
                isConnected={true}
                onPress={expenseData => {
                  // Optional future detail navigation:
                  // navigation.navigate('Expense Dashboard', { initialData: expenseData });
                  // Navigate to Expense scree
                  router.push({ pathname: '/new/(tabs)/reports/expense', params: { view } } as any);
                }}
              />
            )}


            <RegistryRenderer
              kind="dashboard-card"
              parentId="screen.dashboard"
              context={{
                expenseData,
                expenseLoading,
                expenseError,
                cards,
                periodLabel,
                view,
                sessionUser,
              }}
              renderers={{
                // 'dashboard.monthly_target': () => (
                //   <ExpenseDashboardCard
                //     token={token}
                //     cards={cards}
                //     periodLabel={periodLabel}
                //     onOpen={() => router.push({ pathname: '/new/(tabs)/reports/expense', params: { view } } as any)}
                //   />
                // ),
                'dashboard.monthly_target': () => (
                  <TargetSummary
                    cards={cards}
                    label={periodLabel}
                    amountMode={amountMode}
                    onOpen={() => router.push({ pathname: '/new/(tabs)/reports/monthly-target', params: { view } } as any)}
                  />
                ),
                'dashboard.monthly_report': () => (
                  <MonthlyReportCard
                    label={periodLabel}
                    view={view}
                    onOpen={() =>
                      router.push({
                        pathname: '/new/(tabs)/reports/monthly-report',
                        params: {
                          view,
                          monthno: String(monthno),
                        },
                      } as any)
                    }
                  />
                ),
                'dashboard.operational_details': () => (
                  <EmployDashboardSection
                    activeTab={view === 'owner' ? 'owner' : 'myview'}
                    username={sessionUser?.first_name || sessionUser?.name}
                    user={sessionUser}
                    visibleSections={detailVisibility}
                  />
                ),
              }}
              empty={<EmptyState message="No dashboard cards are assigned to this user." />}
            />

            {/* <DashboardSection title="SALES" tone="navy" action="Full report" onAction={() => router.push('/new/(tabs)/reports/monthly-report' as any)}>
              <View style={styles.metricRow}>
                <MetricCell label="THIS MONTH" value={formatDashboardAmount(billing?.actual || 0, amountMode)} />
                <MetricCell label="SO BOOKED" value={formatDashboardAmount(salesOrder?.actual || 0, amountMode)} />
              </View>
              <View style={styles.miniTrend}><View style={styles.miniTrendLine} /></View>
            </DashboardSection>

            <DashboardSection title="PAYMENT COLLECTION" tone="blue" action="Full report" onAction={() => router.push('/new/(tabs)/reports/monthly-report' as any)}>
              <View style={styles.metricRow}>
                <MetricCell label="COLLECTED" value={formatDashboardAmount(collection?.actual || 0, amountMode)} />
                <MetricCell label="TARGET" value={formatDashboardAmount(collection?.target || 0, amountMode)} />
              </View>
              <View style={styles.achievementRow}>
                <Text style={styles.achievementLabel}>Achievement</Text>
                <Text style={styles.achievementValue}>{(collection?.achievement_pct || 0).toFixed(2)}%</Text>
              </View>
              <ProgressBar value={collection?.achievement_pct || 0} tone="blue" />
            </DashboardSection> */}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: T.bg },
  topBar: { backgroundColor: T.nav, paddingHorizontal: 17, paddingTop: 46, paddingBottom: 15, flexDirection: 'row', alignItems: 'center', gap: 12 },
  brand: { color: '#7F9AB2', fontSize: 9, fontWeight: '900', letterSpacing: 1.3 },
  heading: { color: '#fff', fontSize: 23, fontWeight: '900', marginTop: 2 },
  context: { color: '#8EA5B8', fontSize: 11, fontWeight: '700', marginTop: 3 },
  logoutButton: { borderWidth: 1, borderColor: '#294155', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9 },
  logoutText: { color: '#E5EEF5', fontWeight: '800', fontSize: 11 },
  scroll: { flex: 1 },
  content: { padding: 14, paddingBottom: 100 },
  segment: { flexDirection: 'row', backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, borderRadius: 13, overflow: 'hidden', marginBottom: 14 },
  segmentButton: { flex: 1, paddingVertical: 13, alignItems: 'center' },
  segmentActive: { backgroundColor: T.nav },
  segmentDisabled: { opacity: 0.35 },
  segmentText: { color: T.muted, fontSize: 12, fontWeight: '900' },
  segmentTextActive: { color: '#fff' },
  amountModeRow: { marginTop: -6, marginBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 8 },
  amountModeLabel: { color: T.muted, fontSize: 9, fontWeight: '900', letterSpacing: 0.8 },
  monthlyReportCard: {
    minHeight: 82,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 14,
  },
  monthlyReportIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: T.nav,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  monthlyReportIconText: {
    color: T.copper,
    fontSize: 22,
    fontWeight: '900',
  },
  monthlyReportMain: { flex: 1, minWidth: 0 },
  monthlyReportKicker: {
    color: T.copper,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
  },
  monthlyReportTitle: {
    color: T.ink,
    fontSize: 17,
    fontWeight: '900',
    marginTop: 2,
  },
  monthlyReportSub: {
    color: T.muted,
    fontSize: 10.5,
    fontWeight: '600',
    marginTop: 3,
  },
  monthlyReportArrow: {
    color: T.nav,
    fontSize: 28,
    fontWeight: '700',
    marginLeft: 10,
  },
  loadingCard: { minHeight: 160, backgroundColor: T.surface, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: T.border, gap: 10 },
  loadingText: { color: T.muted, fontSize: 12, fontWeight: '700' },
  errorCard: { backgroundColor: '#FFF7F4', borderWidth: 1, borderColor: '#F0C7BB', borderRadius: 16, padding: 18 },
  errorTitle: { color: T.red, fontSize: 16, fontWeight: '900' },
  errorText: { color: '#80554B', fontSize: 12, lineHeight: 18, marginTop: 5 },
  retryButton: { alignSelf: 'flex-start', backgroundColor: T.nav, borderRadius: 9, paddingHorizontal: 15, paddingVertical: 10, marginTop: 14 },
  retryText: { color: '#fff', fontWeight: '900', fontSize: 12 },
  metricRow: { flexDirection: 'row', gap: 16 },
  targetCard: { backgroundColor: T.nav, borderRadius: 16, marginBottom: 14, overflow: 'hidden', ...S.card },
  targetHeader: { paddingHorizontal: 15, paddingTop: 14, paddingBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#21394C' },
  targetTitle: { color: '#fff', fontSize: 16, fontWeight: '900' },
  targetSub: { color: '#92A8BA', fontSize: 10, marginTop: 2 },
  targetArrow: { color: '#fff', fontSize: 25 },
  targetBody: { padding: 16, flexDirection: 'row', alignItems: 'center', gap: 18 },
  ringOuter: { width: 92, height: 92, borderRadius: 46, borderWidth: 9, borderColor: T.copper, alignItems: 'center', justifyContent: 'center' },
  ringInner: { width: 64, height: 64, borderRadius: 32, borderWidth: 6, borderColor: T.blue, alignItems: 'center', justifyContent: 'center' },
  ringValue: { color: '#fff', fontSize: 20, fontWeight: '900' },
  ringLabel: { color: '#8EA5B8', fontSize: 9, marginTop: -1 },
  targetMetrics: { flex: 1 },
  darkKicker: { color: '#7590A6', fontSize: 9, fontWeight: '900', letterSpacing: 0.8 },
  darkLine: { color: '#E8F0F5', fontSize: 12, fontWeight: '700', marginTop: 4 },
  copper: { color: T.copper, fontWeight: '900' },
  blueText: { color: '#8DB4E6', fontWeight: '900' },
  collectionLine: { color: '#ABC0D0', fontSize: 10, marginTop: 5, fontWeight: '700' },
  reportLink: { flexDirection: 'row', alignItems: 'center', backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, borderRadius: 15, padding: 14, gap: 12, marginBottom: 14, ...S.card },
  reportIcon: { width: 43, height: 43, borderRadius: 11, backgroundColor: T.alt, alignItems: 'center', justifyContent: 'center' },
  reportEmoji: { fontSize: 21 },
  reportTitle: { color: T.ink, fontSize: 14, fontWeight: '900' },
  reportSub: { color: T.muted, fontSize: 10, lineHeight: 15, marginTop: 2 },
  reportChevron: { color: T.muted, fontSize: 25 },
  miniTrend: { height: 32, marginTop: 15, justifyContent: 'center' },
  miniTrendLine: { height: 2, borderRadius: 2, backgroundColor: T.nav, transform: [{ rotate: '-1deg' }] },
  achievementRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 14, marginBottom: 6 },
  achievementLabel: { color: T.muted, fontSize: 10, fontWeight: '800' },
  achievementValue: { color: T.green, fontSize: 12, fontWeight: '900' },
});
