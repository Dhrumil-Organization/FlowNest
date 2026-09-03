import {
  AnalyticsExecutiveRow,
  DashboardAPI,
  DashboardCard,
  DashboardMetricKey,
  DashboardScope,
  DashboardView,
} from '@/src/api/dashboard';
import { ProgressBar } from '@/src/components/dashboard/DashboardPrimitives';
import { AmountDisplayModeControl, formatDashboardAmount, useDashboardAmountMode } from '@/src/components/dashboard/AmountDisplayModeControl';
import { usePermission } from '@/src/core/permissions';
import { useAppSessionStore } from '@/src/stores/AppSessionStore';
import { S, T } from '@/src/theme';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
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

function monthlyReportAnchorDate(year: number, month: number) {
  const now = new Date();
  const isCurrent = now.getFullYear() === year && now.getMonth() + 1 === month;
  const d = isCurrent ? now : new Date(year, month, 0);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function resolveFinancialYearNo(baseYearNo: string | number, calendarYear: number, calendarMonth: number) {
  const fyEndYear = calendarMonth >= 4 ? calendarYear + 1 : calendarYear;
  const numericBase = Number(baseYearNo);

  if (Number.isFinite(numericBase) && numericBase > 0 && numericBase < 100) {
    return fyEndYear % 100;
  }

  if (Number.isFinite(numericBase) && numericBase >= 1000) {
    return fyEndYear;
  }

  return fyEndYear % 100;
}

function numberFrom(...values: unknown[]) {
  for (const value of values) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

function parseExecutiveCodes(value: unknown): string[] {
  const source = Array.isArray(value) ? value.join(',') : String(value ?? '');

  return Array.from(
    new Set(
      source
        .replace(/[\[\]'\"]/g, '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  );
}

function executiveRowAsCard(
  base: DashboardCard | undefined,
  row: AnalyticsExecutiveRow | undefined,
  metric: DashboardMetricKey,
): DashboardCard | undefined {
  if (!row) return base;

  const target = Number(row.target || 0);
  const actual = Number(row.actual || 0);

  return {
    ...(base || ({} as DashboardCard)),
    key: metric,
    label:
      base?.label ||
      (metric === 'SALES_ORDER'
        ? 'Sales Order'
        : metric === 'BILLING'
          ? 'Billing'
          : 'Collection'),
    target,
    actual,
    remaining: Math.max(target - actual, 0),
    excess: Math.max(actual - target, 0),
    achievement_pct: target > 0 ? (actual / target) * 100 : 0,
    target_configured:
      metric === 'COLLECTION' ? true : target > 0,
    status:
      metric !== 'COLLECTION' && target <= 0
        ? 'NOT_CONFIGURED'
        : target > 0 && actual >= target
          ? 'ACHIEVED'
          : 'IN_PROGRESS',
  };
}

/**
 * Return one Target Card metric safely.
 *
 * Keep this lookup centralized because the API returns the cards as an array
 * and the render section addresses them by business key. Missing cards remain
 * undefined so ReportPanel can render its existing zero/not-configured state
 * without crashing the screen.
 */
function cardByKey(
  cards: DashboardCard[],
  key: DashboardMetricKey,
): DashboardCard | undefined {
  return (Array.isArray(cards) ? cards : []).find(
    (card) =>
      String(card?.key || '').trim().toUpperCase() === key,
  );
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

/**
 * Final UI guard for Monthly Report -> My View.
 * Backend scope remains authoritative; this prevents stale or accidentally
 * widened executive rows from being rendered if a downstream endpoint ever
 * returns data outside the resolved My View scope.
 */
function normalizeScopedExecutiveRows(
  rows: any[],
  metric: DashboardMetricKey,
  view: DashboardView,
  scope: DashboardScope | null,
): AnalyticsExecutiveRow[] {
  const normalized = normalizeExecutiveRows(rows, metric);

  if (view !== 'my') {
    return normalized;
  }

  const allowed = new Set(
    (scope?.executive_codes || [])
      .map((code) => String(code || '').trim())
      .filter(Boolean),
  );

  if (allowed.size === 0) {
    return [];
  }

  return normalized.filter((row) =>
    allowed.has(String(row.executive_code || '').trim()),
  );
}

function ReportPanel({
  card,
  rows,
  metric,
  onExecutive,
  amountMode,
}: {
  card?: DashboardCard;
  rows: AnalyticsExecutiveRow[];
  metric: DashboardMetricKey;
  onExecutive: (row: AnalyticsExecutiveRow) => void;
  amountMode: 'compact' | 'actual';
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
            <Text style={styles.summaryValue}>{formatDashboardAmount(card?.actual || 0, amountMode)}</Text>
          </View>
          <View style={styles.summaryRight}>
            <Text style={styles.summaryTarget}>{configured ? formatDashboardAmount(card?.target || 0, amountMode) : 'Not configured'}</Text>
            <Text style={[styles.summaryPct, { color: meta.tone }]}>{configured ? `${pct.toFixed(2)}%` : '—'}</Text>
          </View>
        </View>

        <ProgressBar value={configured ? pct : 0} tone={meta.bar} />
        <Text style={styles.remainingText}>
          {configured ? `${formatDashboardAmount(card?.remaining || 0, amountMode)} remaining` : 'Monthly target has not been configured.'}
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
                <Text style={styles.executiveTarget}>Target {formatDashboardAmount(row.target, amountMode)}</Text>
              </View>
              <View style={styles.executiveRight}>
                <Text style={styles.executiveActual}>{formatDashboardAmount(row.actual, amountMode)}</Text>
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
  const appSession = useAppSessionStore((state) => state.appSession);
  const user = useAppSessionStore((state) => state.user);
  const rawLoginResponse = useAppSessionStore((state) => state.rawLoginResponse);
  const { isSuperAdmin } = usePermission();

  const today = new Date();
  const initialMonth = Number(params.monthno || today.getMonth() + 1);
  const hasInitialOwnerAuthority = Number(
    user?.is_director ?? rawLoginResponse?.is_director ?? rawLoginResponse?.user?.is_director ?? 0,
  ) === 1 || isSuperAdmin;

  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(
    initialMonth >= 1 && initialMonth <= 12
      ? initialMonth
      : today.getMonth() + 1,
  );
  const [view, setView] = useState<DashboardView>(
    params.view === 'owner' || (!params.view && hasInitialOwnerAuthority) ? 'owner' : 'my',
  );

  /*
   * The server owns Monthly Report scope. My View comes only from the
   * dashboard-only BaseController mapping; Owner View is director-only.
   * These route values are retained only for compatible drill-down context.
   */
  const [selectedExecutiveCode, setSelectedExecutiveCode] = useState(
    String(params.executive_code || '').trim(),
  );
  const [selectedExecutiveName, setSelectedExecutiveName] = useState(
    String(params.executive_name || '').trim(),
  );

  const [scope, setScope] = useState<DashboardScope | null>(null);
  const [cards, setCards] = useState<DashboardCard[]>([]);
  const [salesRows, setSalesRows] = useState<AnalyticsExecutiveRow[]>([]);
  const [billingRows, setBillingRows] = useState<AnalyticsExecutiveRow[]>([]);
  const [collectionRows, setCollectionRows] = useState<AnalyticsExecutiveRow[]>([]);
  const [periodTitle, setPeriodTitle] = useState('Monthly Report');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [selectorOpen, setSelectorOpen] = useState(false);
  const { mode: amountMode, setMode: setAmountMode } = useDashboardAmountMode();

  const context = appSession?.business_context;
  const yearno =
    context?.year_no ||
    rawLoginResponse?.yearno ||
    rawLoginResponse?.yno ||
    '';
  const prptype =
    context?.prp_group ||
    rawLoginResponse?.userof ||
    rawLoginResponse?.prptype ||
    '';

  const ownerAllowed =
    scope?.owner_view_allowed !== undefined
      ? Boolean(scope.owner_view_allowed)
      : hasInitialOwnerAuthority;


  /*
   * Management My View intentionally means ALL executives.
   * The backend already authorizes Director/Super Admin for Owner scope, so
   * management My View uses that same server-authorized ALL_EXECUTIVES scope
   * while the UI remains on the My View tab. Normal users still send view=my
   * and remain locked to BaseController::DASHBOARD_MY_VIEW_SEXES.
   */
  const apiView: DashboardView =
    view === 'my' && hasInitialOwnerAuthority ? 'owner' : view;

  useEffect(() => {
    if (!ownerAllowed && view === 'owner') {
      setView('my');
    }
  }, [ownerAllowed, view]);

  const months = useMemo(() => {
    const result: Array<{
      year: number;
      month: number;
      key: string;
      label: string;
    }> = [];

    for (let offset = 0; offset > -MONTH_WINDOW; offset -= 1) {
      const item = addMonth(
        today.getFullYear(),
        today.getMonth() + 1,
        offset,
      );

      result.push({
        ...item,
        key: monthKey(item.year, item.month),
        label: monthLabel(item.year, item.month),
      });
    }

    return result;
  }, []);

  const selectedYearNo = useMemo(
    () => resolveFinancialYearNo(yearno, year, month),
    [yearno, year, month],
  );

  const selectableExecutives = useMemo(
    () =>
      (scope?.selectable_executives || [])
        .filter((item) => String(item?.code || '').trim() !== '')
        .map((item) => ({
          code: String(item.code).trim(),
          name:
            String(item.name || '').trim() ||
            `EXECUTIVE ${String(item.code).trim()}`,
        })),
    [scope],
  );

  const scopeExecutiveName = useMemo(() => {
    if (scope?.selected_executive_name) {
      return String(scope.selected_executive_name).trim();
    }

    if ((scope?.executive_names || []).length === 1) {
      return String(scope?.executive_names?.[0] || '').trim();
    }

    if ((scope?.my_executive_names || []).length === 1) {
      return String(scope?.my_executive_names?.[0] || '').trim();
    }

    return selectedExecutiveName;
  }, [scope, selectedExecutiveName]);

  const scopeExecutiveCode = useMemo(() => {
    if (scope?.selected_executive_code) {
      return String(scope.selected_executive_code).trim();
    }

    if ((scope?.executive_codes || []).length === 1 && view === 'my') {
      return String(scope?.executive_codes?.[0] || '').trim();
    }

    return selectedExecutiveCode;
  }, [scope, selectedExecutiveCode, view]);

  const load = useCallback(
    async (refresh = false) => {
      if (!yearno || !prptype) {
        setError(
          'Business context is incomplete. Please sign in again and select Year and Property Group.',
        );
        setLoading(false);
        setRefreshing(false);
        return;
      }

      refresh ? setRefreshing(true) : setLoading(true);
      setError('');

      try {
        /*
         * Load the card first because it is the server-authoritative source
         * for Owner/My View capability and executive scope.
         */
        const cardResult = await DashboardAPI.targetCard({
          prptype,
          yearno: selectedYearNo,
          monthno: month,
          view: apiView,
          sexe:
            apiView === 'my' && selectedExecutiveCode
              ? selectedExecutiveCode
              : undefined,
        });

        /*
         * The backend is the sole dashboard-scope authority. My View comes
         * only from BaseController::DASHBOARD_MY_VIEW_SEXES.
         */
        const enforcedScope: DashboardScope | null =
          cardResult.response.scope || null;

        // Keep My View selected. The server is the scope authority and
        // React must not silently redirect a user to Owner View.

        setScope(enforcedScope);
        setCards(cardResult.response.cards || []);
        setPeriodTitle(
          cardResult.response.period?.month_name ||
            `${monthLabel(year, month)}`,
        );

        /*
         * A missing dashboard mapping is a configuration error. Never widen
         * My View to all executives as a fallback.
         */
        if (!cardResult.response.configured) {
          setSalesRows([]);
          setBillingRows([]);
          setCollectionRows([]);

          const scopeType = String(enforcedScope?.scope_type || '');

          if (
            scopeType === 'EXECUTIVE_SELECTION_REQUIRED' ||
            scopeType === 'INVALID_EXECUTIVE_SELECTION'
          ) {
            setError('');
            return;
          }

          setError(
            enforcedScope?.message ||
              cardResult.response.message ||
              'Monthly Report scope is not configured.',
          );
          return;
        }

        const effectiveExecutiveCode =
          apiView === 'my'
            ? String(
                enforcedScope?.selected_executive_code ||
                  (
                    (enforcedScope?.executive_codes || []).length === 1
                      ? enforcedScope?.executive_codes?.[0]
                      : ''
                  ) ||
                  selectedExecutiveCode ||
                  '',
              ).trim()
            : '';

        const common = {
          prptype,
          yearno: selectedYearNo,
          monthno: month,
          view: apiView,
          executive_code: effectiveExecutiveCode || undefined,
        };

        const [salesResult, billingResult, collectionResult] =
          await Promise.all([
            DashboardAPI.analyticsExecutives({
              ...common,
              metric: 'SALES_ORDER',
            }),
            DashboardAPI.analyticsExecutives({
              ...common,
              metric: 'BILLING',
            }),
            DashboardAPI.analyticsExecutives({
              ...common,
              metric: 'COLLECTION',
            }),
          ]);

        const nextSalesRows = normalizeScopedExecutiveRows(
          salesResult.response.data || [],
          'SALES_ORDER',
          apiView,
          enforcedScope,
        );
        const nextBillingRows = normalizeScopedExecutiveRows(
          billingResult.response.data || [],
          'BILLING',
          apiView,
          enforcedScope,
        );
        const nextCollectionRows = normalizeScopedExecutiveRows(
          collectionResult.response.data || [],
          'COLLECTION',
          apiView,
          enforcedScope,
        );

        setSalesRows(nextSalesRows);
        setBillingRows(nextBillingRows);
        setCollectionRows(nextCollectionRows);

        /*
         * When My View resolves to exactly one server-authoritative executive,
         * use that same row as the visible card summary. This keeps the cards
         * and executive rows on the identical SELF/inspection scope.
         */
        if (
          apiView === 'my' &&
          (enforcedScope?.executive_codes || []).length === 1
        ) {
          const baseCards = cardResult.response.cards || [];
          const scopedCards = [
            executiveRowAsCard(
              cardByKey(baseCards, 'SALES_ORDER'),
              nextSalesRows[0],
              'SALES_ORDER',
            ),
            executiveRowAsCard(
              cardByKey(baseCards, 'BILLING'),
              nextBillingRows[0],
              'BILLING',
            ),
            executiveRowAsCard(
              cardByKey(baseCards, 'COLLECTION'),
              nextCollectionRows[0],
              'COLLECTION',
            ),
          ].filter(Boolean) as DashboardCard[];

          setCards(scopedCards);

          const resolvedName =
            nextSalesRows[0]?.executive_name ||
            nextBillingRows[0]?.executive_name ||
            nextCollectionRows[0]?.executive_name ||
            selectedExecutiveName;

          if (resolvedName) {
            setScope((current) =>
              current
                ? ({
                    ...current,
                    executive_names: [resolvedName],
                    my_executive_names: [resolvedName],
                    selected_executive_name: resolvedName,
                  } as DashboardScope)
                : current,
            );
          }
        }
      } catch (e: any) {
        setError(e?.message || 'Unable to load monthly report.');
        setSalesRows([]);
        setBillingRows([]);
        setCollectionRows([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [
      month,
      prptype,
      selectedExecutiveCode,
      selectedExecutiveName,
      selectedYearNo,
      apiView,
      view,
      year,
      yearno,
    ],
  );

  useEffect(() => {
    load();
  }, [load]);

  const switchView = (nextView: DashboardView) => {
    if (nextView === 'owner' && !ownerAllowed) {
      return;
    }

    setView(nextView);

    /*
     * Never carry a drill-down executive selection into Owner View.
     * Returning to My View always re-resolves the dashboard-only constant.
     */
    if (nextView === 'owner') {
      setSelectedExecutiveCode('');
      setSelectedExecutiveName('');
      setSelectorOpen(false);
      return;
    }

    if (scope?.my_view_locked) {
      setSelectedExecutiveCode('');
      setSelectedExecutiveName('');
    } else if (scope?.my_selector_allowed) {
      setSelectedExecutiveCode('');
      setSelectedExecutiveName('');
    }
  };

  const chooseExecutive = (code: string, name: string) => {
    setSelectedExecutiveCode(code);
    setSelectedExecutiveName(name);
    setSelectorOpen(false);
  };

  const openExecutive = (
    row: AnalyticsExecutiveRow,
    metric: DashboardMetricKey,
  ) => {
    const commonParams = {
      source: 'monthly_report',
      api_view: apiView,
      view,
      date: monthlyReportAnchorDate(year, month),
      report_month: `${year}${String(month).padStart(2, '0')}`,
      yearno: selectedYearNo,
      monthno: month,
      prptype,
      metric,
      executive_code: row.executive_code,
      executive_name: row.executive_name,
    };

    if (metric === 'COLLECTION') {
      router.push({
        pathname: '/new/(tabs)/reports/collection-flow',
        params: {
          ...commonParams,
          mode: 'collection',
          level: 'parties',
        },
      } as any);
      return;
    }

    router.push({
      pathname: '/new/(tabs)/reports/sales-flow',
      params: {
        ...commonParams,
        level: 'parties',
      },
    } as any);
  };

  const scopeNote = useMemo(() => {
    if (view === 'owner') {
      return `All executives · FY ${selectedYearNo}`;
    }

    if (view === 'my' && hasInitialOwnerAuthority) {
      return `My View · All executives · FY ${selectedYearNo}`;
    }

    if (scope?.my_view_mode === 'SELF_EXECUTIVE' || scope?.my_view_mode === 'ASSIGNED_EXECUTIVE') {
      if ((scope?.executive_names || []).length === 1) {
        return `My View · ${scopeExecutiveName || 'Assigned executive'} · FY ${selectedYearNo}`;
      }

      const count = (scope?.executive_codes || []).length;
      return `My View · ${count} assigned executives · FY ${selectedYearNo}`;
    }

    if (scope?.my_view_mode === 'MANAGEMENT_SELECTOR') {
      return scopeExecutiveCode
        ? `Inspecting · ${scopeExecutiveName || scopeExecutiveCode} · FY ${selectedYearNo}`
        : `Select an executive to inspect · FY ${selectedYearNo}`;
    }

    return `My View · FY ${selectedYearNo}`;
  }, [
    hasInitialOwnerAuthority,
    scope,
    scopeExecutiveCode,
    scopeExecutiveName,
    selectedYearNo,
    view,
  ]);

  const reportTitle =
    view === 'my' && scopeExecutiveName
      ? scopeExecutiveName
      : 'Monthly Report';

  const selectionRequired =
    view === 'my' &&
    scope?.my_view_mode === 'MANAGEMENT_SELECTOR' &&
    !scopeExecutiveCode;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>

        <View style={{ flex: 1 }}>
          <Text style={styles.kicker}>
            {view.toUpperCase()} · MONTHLY REPORT
          </Text>
          <Text numberOfLines={1} style={styles.title}>
            {reportTitle}
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => load(true)}
          style={styles.refreshButton}
        >
          <Text style={styles.refreshText}>↻</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => load(true)}
            tintColor={T.nav}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.segment}>
          <TouchableOpacity
            onPress={() => switchView('owner')}
            disabled={!ownerAllowed}
            style={[
              styles.segmentButton,
              view === 'owner' && styles.segmentActive,
              !ownerAllowed && styles.segmentDisabled,
            ]}
          >
            <Text
              style={[
                styles.segmentText,
                view === 'owner' && styles.segmentTextActive,
              ]}
            >
              Owner
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => switchView('my')}
            style={[
              styles.segmentButton,
              view === 'my' && styles.segmentActive,
            ]}
          >
            <Text
              style={[
                styles.segmentText,
                view === 'my' && styles.segmentTextActive,
              ]}
            >
              My View
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.amountModeRow}>
          <Text style={styles.amountModeLabel}>AMOUNT</Text>
          <AmountDisplayModeControl mode={amountMode} onChange={setAmountMode} compact />
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.monthRow}
        >
          {months.map((item) => {
            const active =
              item.year === year &&
              item.month === month;

            return (
              <TouchableOpacity
                key={item.key}
                onPress={() => {
                  setYear(item.year);
                  setMonth(item.month);
                }}
                style={[
                  styles.monthChip,
                  active && styles.monthChipActive,
                ]}
              >
                <Text
                  style={[
                    styles.monthChipText,
                    active && styles.monthChipTextActive,
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={styles.reportHeaderCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.reportHeaderKicker}>
              REPORTING PERIOD
            </Text>
            <Text style={styles.reportHeaderTitle}>
              {periodTitle}
            </Text>
            <Text style={styles.executiveFilterNote}>
              {scopeNote}
            </Text>
          </View>

          {view === 'my' && scope?.my_selector_allowed ? (
            <TouchableOpacity
              onPress={() => setSelectorOpen(true)}
              style={styles.executiveSelectorButton}
              activeOpacity={0.82}
            >
              <Text
                style={styles.executiveSelectorButtonText}
                numberOfLines={1}
              >
                {scopeExecutiveName || 'Select Executive'}
              </Text>
              <Text style={styles.executiveSelectorChevron}>⌄</Text>
            </TouchableOpacity>
          ) : view === 'my' && scope?.my_view_locked ? (
            <View style={styles.lockedBadge}>
              <Text style={styles.lockedBadgeText}>MY EXECUTIVE</Text>
            </View>
          ) : null}
        </View>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={T.nav} size="large" />
            <Text style={styles.loadingText}>
              Loading monthly performance…
            </Text>
          </View>
        ) : error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorTitle}>Unable to load report</Text>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity
              onPress={() => load()}
              style={styles.retryButton}
            >
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : selectionRequired ? (
          <View style={styles.selectionBox}>
            <Text style={styles.selectionTitle}>
              Select a Sales Executive
            </Text>
            <Text style={styles.selectionText}>
              My View for management is an executive inspection view.
              Select one executive to see only that executive&apos;s Sales
              Order, Billing and Collection performance.
            </Text>
            <TouchableOpacity
              onPress={() => setSelectorOpen(true)}
              style={styles.selectionButton}
            >
              <Text style={styles.selectionButtonText}>
                Choose Executive
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <ReportPanel
              card={cardByKey(cards, 'SALES_ORDER')}
              rows={salesRows}
              metric="SALES_ORDER"
              amountMode={amountMode}
              onExecutive={(row) =>
                openExecutive(row, 'SALES_ORDER')
              }
            />

            <ReportPanel
              card={cardByKey(cards, 'BILLING')}
              rows={billingRows}
              metric="BILLING"
              amountMode={amountMode}
              onExecutive={(row) =>
                openExecutive(row, 'BILLING')
              }
            />

            <ReportPanel
              card={cardByKey(cards, 'COLLECTION')}
              rows={collectionRows}
              metric="COLLECTION"
              amountMode={amountMode}
              onExecutive={(row) =>
                openExecutive(row, 'COLLECTION')
              }
            />
          </>
        )}
      </ScrollView>

      <Modal
        visible={selectorOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectorOpen(false)}
      >
        <View style={styles.selectorShade}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setSelectorOpen(false)}
          />

          <View style={styles.selectorSheet}>
            <View style={styles.selectorHeader}>
              <View>
                <Text style={styles.selectorKicker}>MY VIEW</Text>
                <Text style={styles.selectorTitle}>Select Executive</Text>
              </View>
              <TouchableOpacity
                onPress={() => setSelectorOpen(false)}
                style={styles.selectorClose}
              >
                <Text style={styles.selectorCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.selectorList}
              showsVerticalScrollIndicator
            >
              {selectableExecutives.map((item) => {
                const active =
                  item.code === scopeExecutiveCode;

                return (
                  <TouchableOpacity
                    key={item.code}
                    onPress={() =>
                      chooseExecutive(item.code, item.name)
                    }
                    style={[
                      styles.selectorRow,
                      active && styles.selectorRowActive,
                    ]}
                  >
                    <View
                      style={[
                        styles.selectorAvatar,
                        active && styles.selectorAvatarActive,
                      ]}
                    >
                      <Text style={styles.selectorAvatarText}>
                        {initials(item.name)}
                      </Text>
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text style={styles.selectorName}>
                        {item.name}
                      </Text>
                      <Text style={styles.selectorCode}>
                        Executive {item.code}
                      </Text>
                    </View>

                    {active ? (
                      <Text style={styles.selectorCheck}>✓</Text>
                    ) : (
                      <Text style={styles.selectorArrow}>›</Text>
                    )}
                  </TouchableOpacity>
                );
              })}

              {selectableExecutives.length === 0 ? (
                <View style={styles.emptyBox}>
                  <Text style={styles.emptyText}>
                    No active Sales Executives are available.
                  </Text>
                </View>
              ) : null}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  amountModeRow: { marginBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 8 },
  amountModeLabel: { color: T.muted, fontSize: 9, fontWeight: '900', letterSpacing: 0.8 },
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
  executiveFilterNote: { color: T.muted, fontSize: 10, fontWeight: '700', marginTop: 4 },
  clearButton: { backgroundColor: T.alt, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  clearButtonText: { color: T.nav, fontSize: 10, fontWeight: '900' },
  executiveSelectorButton: {
    maxWidth: '46%',
    minHeight: 38,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: T.alt,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  executiveSelectorButtonText: {
    flexShrink: 1,
    color: T.nav,
    fontSize: 10,
    fontWeight: '900',
  },
  executiveSelectorChevron: {
    color: T.nav,
    fontSize: 14,
    fontWeight: '900',
  },
  lockedBadge: {
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: T.alt,
  },
  lockedBadgeText: {
    color: T.nav,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.45,
  },
  selectionBox: {
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 16,
    padding: 20,
    marginBottom: 14,
    ...S.card,
  },
  selectionTitle: {
    color: T.ink,
    fontSize: 17,
    fontWeight: '900',
  },
  selectionText: {
    color: T.muted,
    fontSize: 11,
    lineHeight: 17,
    marginTop: 7,
  },
  selectionButton: {
    alignSelf: 'flex-start',
    marginTop: 14,
    backgroundColor: T.nav,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  selectionButtonText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '900',
  },
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

  selectorShade: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.38)',
  },
  selectorSheet: {
    maxHeight: '72%',
    backgroundColor: T.surface,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderWidth: 1,
    borderColor: T.border,
    paddingBottom: 18,
    overflow: 'hidden',
  },
  selectorHeader: {
    minHeight: 70,
    paddingHorizontal: 18,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: T.hair,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectorKicker: {
    color: T.copper,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.7,
  },
  selectorTitle: {
    color: T.ink,
    fontSize: 19,
    fontWeight: '900',
    marginTop: 2,
  },
  selectorClose: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: T.alt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectorCloseText: {
    color: T.nav,
    fontSize: 14,
    fontWeight: '900',
  },
  selectorList: {
    flexGrow: 0,
  },
  selectorRow: {
    minHeight: 64,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: T.hair,
  },
  selectorRowActive: {
    backgroundColor: T.alt,
  },
  selectorAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: T.yd,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },
  selectorAvatarActive: {
    backgroundColor: T.nav,
  },
  selectorAvatarText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '900',
  },
  selectorName: {
    color: T.ink,
    fontSize: 12,
    fontWeight: '900',
  },
  selectorCode: {
    color: T.muted,
    fontSize: 9,
    marginTop: 3,
  },
  selectorCheck: {
    color: T.green,
    fontSize: 17,
    fontWeight: '900',
  },
  selectorArrow: {
    color: T.muted,
    fontSize: 22,
  },
});
