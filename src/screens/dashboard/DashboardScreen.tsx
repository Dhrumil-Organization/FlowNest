import { getCurrentFinancialYear } from '@/common/commonfunction';
import AppAlert from '@/common/utils/appAlert';
import { AppAccessAPI, unwrapAccessResponse } from '@/src/api/accessControl';
import { DashboardAPI, DashboardCard, DashboardView, ExpenseDashboardData } from '@/src/api/dashboard';
import { AmountDisplayModeControl, formatDashboardAmount, useDashboardAmountMode } from '@/src/components/dashboard/AmountDisplayModeControl';
import { columnsForWidth, DASH_GAP, DashboardGrid, DashboardInsetContext, DashCols, Slot } from '@/src/components/dashboard/DashboardGrid';
import { EmptyState, ProgressBar } from '@/src/components/dashboard/DashboardPrimitives';
import ExpenseDashboardCard from '@/src/components/dashboard/ExpenseDashboardCard';
import { useHeaderExtrasStore } from '@/src/core/layout/headerExtras';
import { usePermission } from '@/src/core/permissions';
import { RegistryLayoutItem, RegistryRenderer } from '@/src/core/ui-registry';
import { getUiNodes } from '@/src/core/ui-registry/uiRegistry';
import EmployDashboardSection from '@/src/screens/dashboard/employ/screens/EmployDashboardSection';
import { DASHBOARD_MOBILE_WIDTH, DashboardForceMobileContext } from '@/src/components/EmployDashboard/rn-app/components/responsive';
import AsyncStorage from '@/common/utils/compatibleStorage';
import { useAppSessionStore } from '@/src/stores/AppSessionStore';
import { S, T } from '@/src/theme';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View
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

// FY navigation follows the selected ERP financial year, not a hard-coded FY.
// The card's existing monthly amounts always come from the current Target API.
function targetFyNavigation(yearno: string | number, today: Date) {
  const parsed = Number(yearno);
  const defaultEndYear = today.getFullYear() + (today.getMonth() >= 3 ? 1 : 0);
  const endYear = Number.isInteger(parsed) && parsed > 0
    ? (parsed < 100 ? 2000 + parsed : parsed)
    : defaultEndYear;
  const startYear = endYear - 1;
  const monthIndex = today.getMonth();
  const reportYear = monthIndex >= 3 ? startYear : endYear;
  const day = Math.min(today.getDate(), new Date(reportYear, monthIndex + 1, 0).getDate());
  const date = `${reportYear}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  return { label: `FY ${String(startYear).slice(-2)}-${String(endYear).slice(-2)}`, date };
}

function TargetSummary({ cards, label, onOpen, onOpenFY, fyLabel, amountMode }: {
  cards: DashboardCard[];
  label: string;
  onOpen: () => void;
  onOpenFY: () => void;
  fyLabel: string;
  amountMode: 'compact' | 'actual';
}) {
  const so = cardByKey(cards, 'SALES_ORDER');
  const billing = cardByKey(cards, 'BILLING');
  const collection = cardByKey(cards, 'COLLECTION');
  // Manual Sales/Billing targets may be intentionally unconfigured. The dashboard ring
  // represents billed conversion, so use Billing Actual ÷ Sales Order Actual.
  const salesActual = Number(so?.actual || 0);
  const billingActual = Number(billing?.actual || 0);
  const billedPct = salesActual > 0 ? (billingActual / salesActual) * 100 : 0;

  return (
    <View style={styles.targetCard}>
      <View style={styles.targetHeader}>
        <TouchableOpacity
          activeOpacity={0.88}
          onPress={onOpen}
          accessibilityRole="button"
          accessibilityLabel="Open monthly Target report"
          style={{ flex: 1, minWidth: 0 }}
        >
          <Text style={styles.targetTitle} numberOfLines={1}>{label}</Text>
          <Text style={styles.targetSub}>Tap for target breakdown</Text>
        </TouchableOpacity>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={onOpenFY}
          accessibilityRole="button"
          accessibilityLabel={`Open ${fyLabel} financial-year Sales report`}
          style={styles.targetFYBadge}
        >
          <Text style={styles.targetFYText}>{fyLabel} ›</Text>
        </TouchableOpacity>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={onOpen}
          accessibilityRole="button"
          accessibilityLabel="Open monthly Target breakdown"
          style={styles.targetHeaderArrowButton}
        >
          <Text style={styles.targetArrow}>›</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity activeOpacity={0.92} onPress={onOpen} style={styles.targetBody}>
        <View style={styles.targetMain}>
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
        <View style={styles.legendRow}>
          <View style={[styles.legendDot, { backgroundColor: T.copper }]} />
          <Text style={styles.legendText}>SO %</Text>
          <View style={[styles.legendDot, { backgroundColor: T.blue, marginLeft: 12 }]} />
          <Text style={styles.legendText}>Billed %</Text>
        </View>
      </TouchableOpacity>
    </View>
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
        <Text style={styles.monthlyReportIconText}>📈</Text>
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

/**
 * ERP-style arrangement of the (permission-visible) dashboard cards. UI only.
 *   Production Cost  — full width on top (all sizes)
 *   Monthly Target + Monthly Report — head of column 1, handed to the
 *     operational section so Sales follows them in the same column
 *   Operational (Sales / Production / Collection / Payment / Outstanding) —
 *     split into 1 / 2 / 3 columns inside EmployDashboardSection
 */
function renderDashboardLayout(items: RegistryLayoutItem[], columns: DashCols) {
  const byId = new Map(items.map((it) => [it.id, it]));
  const take = (id: string) => {
    const it = byId.get(id);
    byId.delete(id);
    return it;
  };
  const cost = take('dashboard.costing_summary');
  const target = take('dashboard.monthly_target');
  const report = take('dashboard.monthly_report');
  const ops = take('dashboard.operational_details');
  const others = Array.from(byId.values());

  const lead = [target, report].filter(Boolean).map((it) => it!.wrap(it!.element));

  return (
    <>
      {cost ? cost.wrap(cost.element) : null}
      {ops && React.isValidElement(ops.element) ? (
        ops.wrap(React.cloneElement(ops.element as React.ReactElement<any>, { lead, columns }))
      ) : (
        <DashboardGrid columns={columns} layout={{ 2: [['target', 'report'], ['ops']], 3: [['target'], ['report'], ['ops']] }}>
          <Slot name="target">{target ? target.wrap(target.element) : null}</Slot>
          <Slot name="report">{report ? report.wrap(report.element) : null}</Slot>
          <Slot name="ops">{ops ? ops.wrap(ops.element) : null}</Slot>
        </DashboardGrid>
      )}
      {others.map((it) => it.wrap(it.element))}
    </>
  );
}

export function DashboardScreen(token: any, getUserPrptype: any) {
  const router = useRouter();
  const { canAccess, isSuperAdmin } = usePermission();
  const appSession = useAppSessionStore((state) => state.appSession);
  const rawLoginResponse = useAppSessionStore((state) => state.rawLoginResponse);
  const sessionUser = useAppSessionStore((state) => state.user);
  const logout = useAppSessionStore((state) => state.logout);

  /*
   * Permissions are editable while a user is logged in. The login-time
   * app_session snapshot therefore cannot be treated as permanent. Refresh the
   * effective permission map whenever this dashboard regains focus so newly
   * allowed/denied card permissions (for example Outstanding Detail) are
   * applied immediately without a logout/login cycle.
   */
  const refreshPermissionSession = useCallback(async () => {
    try {
      const raw = unwrapAccessResponse<any>(await AppAccessAPI.session());
      const freshSession = raw?.app_session && typeof raw.app_session === 'object'
        ? raw.app_session
        : null;
      const freshPermissions = freshSession?.permissions ?? raw?.permissions;
      if (!freshPermissions) return;

      const store = useAppSessionStore.getState();
      const current = store.appSession;
      if (!current) return;

      await store.setAppSession({
        ...current,
        ...(freshSession || {}),
        business_context: freshSession?.business_context ?? current.business_context,
        permissions: freshPermissions,
      } as any);
    } catch (permissionError) {
      // Dashboard data can still load with the existing session; do not turn a
      // transient permission-refresh failure into a dashboard failure.
      console.warn('Dashboard permission refresh failed:', permissionError);
    }
  }, []);

  const context = appSession?.business_context;
  // Card-driven Owner access: derived from the registered dashboard cards.
  // New Owner cards participate by registering ownerCard: true and their
  // individual permission (or anyPermissions for a composite card).
  const ownerCardPermissions = getUiNodes('dashboard-card', 'screen.dashboard')
    .filter(node => node.metadata?.ownerCard === true)
    .flatMap(node => {
      const any = node.metadata?.anyPermissions;
      return Array.isArray(any) && any.length ? any as string[] : [node.permission];
    });
  const hasOwnerCardPermission = ownerCardPermissions.some(permission => canAccess(permission));
  const [view, setView] = useState<DashboardView>(hasOwnerCardPermission ? 'owner' : 'my');
  const { mode: amountMode, setMode: setAmountMode } = useDashboardAmountMode();
  const [cards, setCards] = useState<DashboardCard[]>([]);
  const [periodLabel, setPeriodLabel] = useState('Monthly Target');
  const [scopeMessage, setScopeMessage] = useState('');
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

  // Responsive layout (UI only): columns from the dashboard's CONTENT width,
  // so the desktop sidebar is already excluded — same as the ERP dashboard.
  const [contentWidth, setContentWidth] = useState(0);
  const columns: DashCols = columnsForWidth(contentWidth);

  // RESPONSIVE: Yes (default) = layout follows the screen width (as before).
  //             No            = the phone layout, also on web / tablet (content drawn at the mobile width).
  // UI only — remembered on this device. The switch is shown only where it changes something (wide screens).
  const { width: windowWidth } = useWindowDimensions();
  const [responsive, setResponsiveState] = useState(true);
  useEffect(() => {
    AsyncStorage.getItem('dashboard_responsive')
      .then((v: string | null) => { if (v === 'no') setResponsiveState(false); })
      .catch(() => undefined);
  }, []);
  const setResponsive = (yes: boolean) => {
    setResponsiveState(yes);
    AsyncStorage.setItem('dashboard_responsive', yes ? 'yes' : 'no').catch(() => undefined);
  };
  const showResponsiveSwitch = windowWidth > DASHBOARD_MOBILE_WIDTH + 140;
  const forceMobile = !responsive && showResponsiveSwitch;

  const now = new Date();
  const yearno = context?.year_no || rawLoginResponse?.yearno || rawLoginResponse?.yno || '';
  const prptype = context?.prp_group || rawLoginResponse?.userof || rawLoginResponse?.prptype || '';
  const monthno = now.getMonth() + 1;
  const targetFY = targetFyNavigation(yearno, now);
  // Backend scope flags cannot override explicit per-card grants.
  // For a non-Director user with assigned Sales Executives, Laravel scopes
  // the Owner cards to those executives; the tab itself stays permission based.
  const ownerAllowed = hasOwnerCardPermission;

  // My View scope differs by authority:
  // - SuperAdmin / Director: management My View is allowed even without a
  //   personal Sales Executive mapping. SalesExecDashboardScreen will ask the
  //   manager to select an executive when needed.
  // - Normal user: My View still requires users.saleexeid when that field is
  //   known; unknown legacy sessions remain compatible.
  const rawSaleExec = sessionUser?.saleexeid ?? rawLoginResponse?.user?.saleexeid;
  const saleExecKnown = rawSaleExec !== undefined;
  const saleExecCode = String(rawSaleExec ?? '').trim();
  const isDirector = Number(
    sessionUser?.is_director
      ?? rawLoginResponse?.is_director
      ?? rawLoginResponse?.user?.is_director
      ?? 0,
  ) === 1;
  const isManagementUser = isSuperAdmin || isDirector;
  // Production is a company/shed report. An authenticated user with the
  // Production card grant must be able to open My View even without a Sales
  // Executive mapping. The Production card still checks the same permission
  // locally and again on the Laravel dashboard/report endpoints.
  // A user assigned only through BaseController::DASHBOARD_MY_VIEW_SEXES has
  // no users.saleexeid, so any dashboard card grant also enables My View.
  // Laravel remains the scope authority (it returns "not configured" when
  // nothing is assigned).
  const myViewAllowed = isManagementUser
    || !saleExecKnown
    || (saleExecCode !== '' && saleExecCode !== '0')
    || hasOwnerCardPermission
    || canAccess('dashboard.production_detail');

  // Permissions arrive asynchronously after login, so the initial useState
  // value can be computed before they exist. Until the user picks a view
  // themselves, follow the permissions: Owner whenever any Owner card is
  // granted, otherwise My View.
  const userPickedViewRef = useRef(false);
  const pickView = useCallback((next: DashboardView) => {
    userPickedViewRef.current = true;
    setView(next);
  }, []);

  useEffect(() => {
    if (userPickedViewRef.current) return;
    if (ownerAllowed && view !== 'owner') setView('owner');
    else if (!ownerAllowed && view !== 'my') setView('my');
  }, [ownerAllowed, view]);

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
      void refreshPermissionSession();
      return undefined;
    }, [refreshPermissionSession]),
  );

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
    payment: canAccess('dashboard.payment_detail'),
    outstanding: canAccess('dashboard.outstanding_detail'),
  }), [canAccess]);

  const confirmLogout = () => AppAlert.alert('Sign out?', 'This will clear the mobile session on this device.', [
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
       <DashboardForceMobileContext.Provider value={forceMobile}>
       <View
         style={[styles.inner, forceMobile && styles.innerMobile]}
         onLayout={(e) => {
           const w = Math.round(e.nativeEvent.layout.width);
           if (Math.abs(w - contentWidth) > 1) setContentWidth(w);
         }}
       >
        <View style={styles.segment}>
          <TouchableOpacity
            disabled={!ownerAllowed}
            onPress={() => ownerAllowed && pickView('owner')}
            style={[styles.segmentButton, view === 'owner' && styles.segmentActive, !ownerAllowed && styles.segmentDisabled]}
          >
            <Text style={[styles.segmentText, view === 'owner' && styles.segmentTextActive]}>Owner</Text>
          </TouchableOpacity>
          <TouchableOpacity
            disabled={!myViewAllowed}
            onPress={() => myViewAllowed && pickView('my')}
            style={[styles.segmentButton, view === 'my' && styles.segmentActive, !myViewAllowed && styles.segmentDisabled]}
          >
            <Text style={[styles.segmentText, view === 'my' && styles.segmentTextActive]}>My View</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.amountModeRow}>
          {showResponsiveSwitch && (
            <View style={styles.respWrap}>
              <Text style={styles.amountModeLabel}>RESPONSIVE</Text>
              <View style={styles.respToggle}>
                {([[true, 'Yes'], [false, 'No']] as const).map(([v, l]) => {
                  const on = responsive === v;
                  return (
                    <TouchableOpacity
                      key={l}
                      onPress={() => setResponsive(v)}
                      style={[styles.respBtn, on && styles.respBtnOn]}
                      accessibilityRole="button"
                      accessibilityState={{ selected: on }}
                    >
                      <Text style={[styles.respText, on && styles.respTextOn]}>{l}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}
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
            <DashboardInsetContext.Provider value={0}>
            <RegistryRenderer
              layout={(items) => renderDashboardLayout(items, columns)}
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
                    fyLabel={targetFY.label}
                    onOpen={() => router.push({ pathname: '/new/(tabs)/reports/monthly-target', params: { view } } as any)}
                    onOpenFY={() => router.push({
                      pathname: '/new/(tabs)/reports/financial-year',
                      params: { metric: 'sales', view, prptype, date: targetFY.date },
                    } as any)}
                  />
                ),
                'dashboard.costing_summary': () =>
                  view === 'owner' ? (
                    <ExpenseDashboardCard
                      token={getToken?.token || ''}
                      prptype={getToken?.getUserPrptype || ''}
                      yearno={getCurrentFinancialYear()}
                      monthno={new Date().getMonth() + 1}
                      isConnected={true}
                      onPress={() =>
                        router.push({
                          pathname: '/new/(tabs)/reports/expense',
                          params: { view },
                        } as any)
                      }
                      onOpenFY={() => {
                        const today = new Date();
                        router.push({
                          pathname: '/new/(tabs)/reports/financial-year',
                          params: {
                            metric: 'prodcost',
                            prptype: getToken?.getUserPrptype || 'S',
                            view: 'owner',
                            date: `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`,
                          },
                        } as any);
                      }}
                    />
                  ) : null,
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
            </DashboardInsetContext.Provider>

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
       </View>
       </DashboardForceMobileContext.Provider>
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
  content: { padding: 14, paddingBottom: 100, flexGrow: 1 },
  // ERP dashboard: content column centred with a max width on large screens
  inner: { width: '100%', maxWidth: 1320, alignSelf: 'center' },
  segment: { flexDirection: 'row', backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, borderRadius: 13, overflow: 'hidden', marginBottom: 14 },
  segmentButton: { flex: 1, paddingVertical: 13, alignItems: 'center' },
  segmentActive: { backgroundColor: T.nav },
  segmentDisabled: { opacity: 0.35 },
  segmentText: { color: T.muted, fontSize: 12, fontWeight: '900' },
  segmentTextActive: { color: '#fff' },
  amountModeRow: { marginTop: -6, marginBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 8 },
  amountModeLabel: { color: T.muted, fontSize: 9, fontWeight: '900', letterSpacing: 0.8 },
  // "Responsive: No" — the phone layout, centred
  innerMobile: { maxWidth: DASHBOARD_MOBILE_WIDTH },
  respWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, marginRight: 'auto' },
  respToggle: { flexDirection: 'row', backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, borderRadius: 9, overflow: 'hidden' },
  respBtn: { paddingHorizontal: 12, paddingVertical: 6 },
  respBtnOn: { backgroundColor: T.nav },
  respText: { color: T.muted, fontSize: 11, fontWeight: '900' },
  respTextOn: { color: '#fff' },
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
    marginBottom: DASH_GAP,
    ...S.card,
  },
  monthlyReportIcon: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: T.alt,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  monthlyReportIconText: {
    fontSize: 21,
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
  targetCard: { backgroundColor: T.surface, borderRadius: 14, marginBottom: DASH_GAP, overflow: 'hidden', borderWidth: 1, borderColor: T.border, ...S.card },
  targetHeader: { backgroundColor: T.nav, paddingHorizontal: 15, paddingTop: 12, paddingBottom: 11, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  targetTitle: { color: '#fff', fontSize: 16, fontWeight: '900' },
  targetSub: { color: '#92A8BA', fontSize: 10, marginTop: 2 },
  targetFYBadge: { borderWidth: 1, borderColor: '#8595A6', borderRadius: 20, paddingHorizontal: 9, paddingVertical: 5, marginLeft: 8 },
  targetFYText: { color: '#fff', fontWeight: '900', fontSize: 10 },
  targetHeaderArrowButton: { marginLeft: 9, minWidth: 20, alignItems: 'center', justifyContent: 'center' },
  targetArrow: { color: '#fff', fontSize: 25 },
  targetBody: { padding: 16 },
  targetMain: { flexDirection: 'row', alignItems: 'center', gap: 18 },
  legendRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  legendDot: { width: 9, height: 9, borderRadius: 2, marginRight: 5 },
  legendText: { color: T.muted, fontSize: 10, fontWeight: '700' },
  ringOuter: { width: 104, height: 104, borderRadius: 52, borderWidth: 10, borderColor: T.copper, alignItems: 'center', justifyContent: 'center' },
  ringInner: { width: 74, height: 74, borderRadius: 37, borderWidth: 8, borderColor: T.blue, alignItems: 'center', justifyContent: 'center' },
  ringValue: { color: T.ink, fontSize: 21, fontWeight: '900' },
  ringLabel: { color: T.muted, fontSize: 9, marginTop: -1 },
  targetMetrics: { flex: 1, minWidth: 0 },
  darkKicker: { color: T.muted, fontSize: 9, fontWeight: '900', letterSpacing: 0.8 },
  darkLine: { color: T.ink, fontSize: 12, fontWeight: '700', marginTop: 4 },
  copper: { color: T.copper, fontWeight: '900' },
  blueText: { color: T.blue, fontWeight: '900' },
  collectionLine: { color: T.muted, fontSize: 10, marginTop: 5, fontWeight: '700' },
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
