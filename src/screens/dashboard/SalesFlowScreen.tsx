import { AmountDisplayModeControl, formatSummaryAmount, useDashboardAmountMode } from '@/src/components/dashboard/AmountDisplayModeControl';
import { SubScreenHeader } from '@/src/components/layout/SubScreenHeader';
import { useAppSessionStore } from '@/src/stores/AppSessionStore';
import { S, T } from '@/src/theme';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from './employ/api/api';

type SalesLevel =
  | 'categories'
  | 'executives'
  | 'parties'
  | 'designs'
  | 'documents'
  | 'lines';

type SalesRow = {
  code?: string;
  name?: string;
  qty?: number;
  amount?: number;
  amount_exact?: string;
  document_count?: number;
  line_count?: number;
  document_uid?: string;
  document_no?: string;
  document_date?: number | string;
  line_no?: number | string;
  category_code?: string;
  category_name?: string;
  design_code?: string;
  design_name?: string;
  executive_code?: string;
  executive_name?: string;
  party_code?: string;
  party_name?: string;
};

type Report = {
  type?: string;
  level?: SalesLevel;
  period?: {
    date?: number;
    month_start?: number;
    label?: string;
    month_name?: string;
  };
  context?: Record<string, string>;
  total?: {
    qty?: number;
    amount?: number;
    amount_exact?: string;
    row_count?: number;
  };
  rows?: SalesRow[];
  reconciliation?: {
    expected_amount?: number | null;
    expected_amount_exact?: string | null;
    list_amount?: number;
    list_amount_exact?: string;
    amount_difference?: number | null;
    amount_difference_exact?: string | null;
    amount_reconciled?: boolean | null;
    expected_qty?: number | null;
    list_qty?: number;
    qty_difference?: number | null;
    qty_reconciled?: boolean | null;
    expected_generated_at?: string | null;
    current_generated_at?: string | null;
    status?: string;
  };
  generated_at?: string;
  message?: string | null;
};

type MonthChip = {
  ym: string;
  label: string;
  requestDate: string;
};

const LEVEL_META: Record<SalesLevel, { title: string; singular: string }> = {
  categories: { title: 'By Category', singular: 'Category' },
  executives: { title: 'By Sales Executive', singular: 'Executive' },
  parties: { title: 'By Party', singular: 'Party' },
  designs: { title: 'By Design', singular: 'Design' },
  documents: { title: 'By Document', singular: 'Document' },
  lines: { title: 'Document Lines', singular: 'Line' },
};

const one = (value: unknown): string => {
  if (Array.isArray(value)) return String(value[0] ?? '');
  return String(value ?? '');
};

const qty = (value: number | string | undefined): string =>
  Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 3 });

const ymdFromDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const validAnchorDate = (raw: string): Date => {
  const clean = raw.trim();
  const match = clean.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (match) {
    const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    if (!Number.isNaN(date.getTime())) return date;
  }

  return new Date();
};

const sixMonthChips = (anchorRaw: string): MonthChip[] => {
  const anchor = validAnchorDate(anchorRaw);
  const anchorYm = `${anchor.getFullYear()}${String(anchor.getMonth() + 1).padStart(2, '0')}`;
  const chips: MonthChip[] = [];

  for (let offset = 0; offset < 6; offset += 1) {
    const monthDate = new Date(anchor.getFullYear(), anchor.getMonth() - offset, 1);
    const year = monthDate.getFullYear();
    const monthIndex = monthDate.getMonth();
    const ym = `${year}${String(monthIndex + 1).padStart(2, '0')}`;
    const lastDay = new Date(year, monthIndex + 1, 0);
    const requestDate = ym === anchorYm ? ymdFromDate(anchor) : ymdFromDate(lastDay);
    const label = monthDate.toLocaleDateString('en-GB', {
      month: 'short',
      year: '2-digit',
    });

    chips.push({ ym, label, requestDate });
  }

  return chips;
};

const prettyDate = (value: number | string | undefined): string => {
  const raw = String(value ?? '').replace(/-/g, '');
  if (!/^\d{8}$/.test(raw)) return String(value ?? '');
  return `${raw.slice(6, 8)}-${raw.slice(4, 6)}-${raw.slice(0, 4)}`;
};

export default function SalesFlowScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const session = useAppSessionStore((state: any) => state.appSession || state.session);

  const level = (one(params.level) || 'categories') as SalesLevel;
  const anchorDate = one(params.date) || ymdFromDate(new Date());
  const monthChips = useMemo(() => sixMonthChips(anchorDate), [anchorDate]);
  const initialMonth = one(params.report_month) || monthChips[0]?.ym || '';

  const businessContext = session?.business_context || session?.businessContext || {};
  const prptype =
    one(params.prptype) ||
    String(businessContext?.prp_group || businessContext?.prptype || 'S');

  const routeContext = useMemo(
    () => ({
      category_code: one(params.category_code),
      category_name: one(params.category_name),
      executive_code: one(params.executive_code),
      executive_name: one(params.executive_name),
      party_code: one(params.party_code),
      party_name: one(params.party_name),
      design_code: one(params.design_code),
      design_name: one(params.design_name),
      document_uid: one(params.document_uid),
      document_no: one(params.document_no),
    }),
    [
      params.category_code,
      params.category_name,
      params.design_code,
      params.design_name,
      params.document_no,
      params.document_uid,
      params.executive_code,
      params.executive_name,
      params.party_code,
      params.party_name,
    ],
  );

  const expectedMonth = one(params.expected_month);
  const expectedAmount = one(params.expected_amount);
  const expectedQty = one(params.expected_qty);
  const expectedGeneratedAt = one(params.expected_generated_at);

  const [selectedMonth, setSelectedMonth] = useState(initialMonth);
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [sortField, setSortField] = useState<'amount' | 'qty'>('amount');
  const { mode: amountMode, setMode: setAmountMode } = useDashboardAmountMode();
  const hasFocusedOnce = useRef(false);

  useEffect(() => {
    if (!monthChips.some(chip => chip.ym === selectedMonth)) {
      setSelectedMonth(monthChips[0]?.ym || '');
    }
  }, [monthChips, selectedMonth]);

  const selectedChip =
    monthChips.find(chip => chip.ym === selectedMonth) || monthChips[0];

  const load = useCallback(
    async (pull = false, silent = false) => {
      if (!selectedChip) return;

      if (!silent) {
        pull ? setRefreshing(true) : setLoading(true);
      }
      setError('');

      try {
        const includeExpected = expectedMonth !== '' && expectedMonth === selectedChip.ym;

        const response = await api.getOwnerCardReport({
          date: selectedChip.requestDate,
          prptype,
          report_type: 'sales',
          level,
          ...routeContext,
          expected_amount: includeExpected ? expectedAmount : undefined,
          expected_qty: includeExpected ? expectedQty : undefined,
          expected_generated_at: includeExpected ? expectedGeneratedAt : undefined,
        });

        if (!response?.success) {
          throw new Error(response?.message || 'Unable to load Sales report.');
        }

        setReport(response?.data?.report || null);
      } catch (err: any) {
        setReport(null);
        setError(err?.message || 'Unable to load Sales report.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    }, [expectedAmount, expectedGeneratedAt, expectedMonth, expectedQty, level, prptype, routeContext, selectedChip],
  );

  useEffect(() => {
    void load(false);
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      if (!hasFocusedOnce.current) {
        hasFocusedOnce.current = true;
        return undefined;
      }

      void load(false, true);
      return undefined;
    }, [load]),
  );

  const rows = useMemo(() => report?.rows || [], [report]);

  const sortedRows = useMemo(() => {
    return [...rows].sort((left, right) => {
      const a = Number(sortField === 'qty' ? left.qty || 0 : left.amount || 0);
      const b = Number(sortField === 'qty' ? right.qty || 0 : right.amount || 0);
      return b - a;
    });
  }, [rows, sortField]);

  const contextItems = useMemo(
    () =>
      [
        routeContext.category_name
          ? { label: 'Category', value: routeContext.category_name }
          : null,
        routeContext.executive_name
          ? { label: 'Executive', value: routeContext.executive_name }
          : null,
        routeContext.party_name
          ? { label: 'Party', value: routeContext.party_name }
          : null,
        routeContext.design_name
          ? { label: 'Design', value: routeContext.design_name }
          : null,
        routeContext.document_no
          ? { label: 'Document', value: routeContext.document_no }
          : null,
      ].filter(Boolean) as Array<{ label: string; value: string }>,
    [routeContext],
  );

  const nextLevel = useCallback(
    (current: SalesLevel): SalesLevel | null => {
      if (current === 'categories') {
        // Explicit dashboard rule: Party -> View Full Report first shows that
        // party's categories. Once a category is chosen, the useful next step
        // is the designs sold to that party in that category.
        return routeContext.party_code ? 'designs' : 'executives';
      }
      if (current === 'executives') return 'parties';
      if (current === 'parties') return routeContext.design_code ? 'documents' : 'designs';
      if (current === 'designs') return 'documents';
      if (current === 'documents') return 'lines';
      return null;
    },
    [routeContext.design_code, routeContext.party_code],
  );

  const openRow = (row: SalesRow) => {
    const next = nextLevel(level);
    if (!next || !selectedChip) return;

    const nextParams: Record<string, string> = {
      date: anchorDate,
      report_month: selectedChip.ym,
      expected_month: selectedChip.ym,
      prptype,
      view: one(params.view) || 'owner',
      level: next,
      category_code: routeContext.category_code,
      category_name: routeContext.category_name,
      executive_code: routeContext.executive_code,
      executive_name: routeContext.executive_name,
      party_code: routeContext.party_code,
      party_name: routeContext.party_name,
      design_code: routeContext.design_code,
      design_name: routeContext.design_name,
      document_uid: routeContext.document_uid,
      document_no: routeContext.document_no,
      expected_amount: String(Number(row.amount || 0)),
      expected_qty: String(Number(row.qty || 0)),
      expected_generated_at: String(report?.generated_at || ''),
    };

    if (level === 'categories') {
      nextParams.category_code = String(row.code || '');
      nextParams.category_name = String(row.name || '');
    } else if (level === 'executives') {
      nextParams.executive_code = String(row.code || '');
      nextParams.executive_name = String(row.name || '');
    } else if (level === 'parties') {
      nextParams.party_code = String(row.code || '');
      nextParams.party_name = String(row.name || '');
    } else if (level === 'designs') {
      nextParams.design_code = String(row.code || '');
      nextParams.design_name = String(row.name || '');
    } else if (level === 'documents') {
      nextParams.document_uid = String(row.document_uid || row.code || '');
      nextParams.document_no = String(row.document_no || row.name || row.code || '');
    }

    Object.keys(nextParams).forEach(key => {
      if (nextParams[key] === '') delete nextParams[key];
    });

    router.push({
      pathname: '/new/(tabs)/reports/sales-flow',
      params: nextParams,
    } as any);
  };

  const reconciliation = report?.reconciliation;
  const hasReconciliation = reconciliation?.expected_amount != null;
  const reconciled =
    reconciliation?.amount_reconciled !== false &&
    reconciliation?.qty_reconciled !== false;

  return (
    <View style={styles.root}>
      <SubScreenHeader backLabel="Back" title="Sales Report" />

      <SafeAreaView style={styles.safe} edges={['bottom', 'left', 'right']}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void load(true)}
              tintColor={T.nav}
            />
          }
        >
          <View style={styles.contextCard}>
            <View style={styles.contextTop}>
              <View style={styles.iconCircle}>
                <Text style={styles.iconText}>₹</Text>
              </View>
              <View style={styles.contextMain}>
                <Text style={styles.kicker}>SALES · {selectedChip?.label?.toUpperCase()}</Text>
                <Text style={styles.reportTitle}>{LEVEL_META[level].title}</Text>
                <Text style={styles.reportSub}>
                  {contextItems.length > 0
                    ? 'Filtered report. Every next screen keeps this context.'
                    : 'Complete Sales card report for the selected breakdown.'}
                </Text>
              </View>
            </View>

            {contextItems.length > 0 ? (
              <View style={styles.contextPills}>
                {contextItems.map(item => (
                  <View key={`${item.label}-${item.value}`} style={styles.contextPill}>
                    <Text style={styles.contextPillLabel}>{item.label}</Text>
                    <Text numberOfLines={1} style={styles.contextPillValue}>{item.value}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </View>

          {/* Six-month period selector is deliberately present on every level. */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.monthRow}
          >
            {monthChips.map(chip => {
              const active = chip.ym === selectedMonth;
              return (
                <TouchableOpacity
                  key={chip.ym}
                  onPress={() => setSelectedMonth(chip.ym)}
                  style={[styles.monthChip, active && styles.monthChipActive]}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.monthChipText, active && styles.monthChipTextActive]}>
                    {chip.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <AmountDisplayModeControl mode={amountMode} onChange={setAmountMode} />

          <View style={styles.totalCard}>
            <View style={styles.totalBlock}>
              <Text style={styles.totalLabel}>TOTAL SALES</Text>
              <Text style={styles.totalValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.62}>
                {formatSummaryAmount(report?.total?.amount, amountMode, report?.total?.amount_exact)}
              </Text>
            </View>
            <View style={styles.totalDivider} />
            <View style={styles.totalBlock}>
              <Text style={styles.totalLabel}>QTY</Text>
              <Text style={styles.totalValue}>{qty(report?.total?.qty)} m</Text>
            </View>
            <View style={styles.totalDivider} />
            <View style={styles.totalBlockSmall}>
              <Text style={styles.totalLabel}>ROWS</Text>
              <Text style={styles.totalValue}>{Number(report?.total?.row_count || 0)}</Text>
            </View>
          </View>

          {hasReconciliation ? (
            <View style={[styles.reconcile, reconciled ? styles.reconcileOk : styles.reconcileWarn]}>
              <Text style={[styles.reconcileTitle, reconciled ? styles.reconcileTitleOk : styles.reconcileTitleWarn]}>
                {reconciled
                  ? '✓ Total reconciled with previous screen'
                  : '↻ Current live total changed from the carried value'}
              </Text>
              {!reconciled ? (
                <Text style={styles.reconcileDetail}>
                  Previous {formatSummaryAmount(reconciliation?.expected_amount || 0, amountMode, reconciliation?.expected_amount_exact)} · Current {formatSummaryAmount(reconciliation?.list_amount || 0, amountMode, reconciliation?.list_amount_exact)}
                  {reconciliation?.qty_difference != null
                    ? ` · Qty change ${qty(Math.abs(Number(reconciliation.qty_difference || 0)))} m`
                    : ''}
                  {'\n'}The report uses the current database value. Going back refreshes the dashboard value.
                </Text>
              ) : null}
            </View>
          ) : null}

          {report?.message ? (
            <View style={styles.messageBox}>
              <Text style={styles.messageText}>{report.message}</Text>
            </View>
          ) : null}

          <View style={styles.panel}>
            <View style={styles.panelHeader}>
              <View>
                <Text style={styles.panelKicker}>SALES BREAKDOWN</Text>
                <Text style={styles.panelTitle}>{LEVEL_META[level].title}</Text>
              </View>
              <TouchableOpacity
                onPress={() => setSortField(current => (current === 'amount' ? 'qty' : 'amount'))}
                style={styles.sortButton}
              >
                <Text style={styles.sortText}>{sortField === 'amount' ? 'AMOUNT ▼' : 'QTY ▼'}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.columns}>
              <Text style={styles.columnName}>{LEVEL_META[level].singular.toUpperCase()}</Text>
              <Text style={styles.columnValue}>QTY · AMOUNT</Text>
            </View>

            {loading ? (
              <View style={styles.state}>
                <ActivityIndicator color={T.nav} size="large" />
                <Text style={styles.stateText}>Loading Sales report…</Text>
              </View>
            ) : error ? (
              <View style={styles.state}>
                <Text style={styles.errorTitle}>Unable to load Sales report</Text>
                <Text style={styles.stateText}>{error}</Text>
                <TouchableOpacity style={styles.retry} onPress={() => void load(false)}>
                  <Text style={styles.retryText}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : sortedRows.length === 0 ? (
              <View style={styles.state}>
                <Text style={styles.emptyTitle}>No Sales data</Text>
                <Text style={styles.stateText}>
                  No records match this filter for {selectedChip?.label || 'the selected month'}.
                </Text>
              </View>
            ) : (
              sortedRows.map((row, index) => {
                const canOpen = nextLevel(level) !== null;
                const primary =
                  level === 'documents'
                    ? row.document_no || row.name || row.code || 'Document'
                    : level === 'lines'
                      ? row.name || `Line ${row.line_no || row.code || index + 1}`
                      : row.name || row.code || 'Unspecified';

                const secondary =
                  level === 'documents'
                    ? `${prettyDate(row.document_date)}${row.line_count ? ` · ${row.line_count} lines` : ''}`
                    : level === 'lines'
                      ? [row.category_name, row.design_name].filter(Boolean).join(' · ')
                      : row.document_count
                        ? `${row.document_count} document${row.document_count === 1 ? '' : 's'}`
                        : '';

                return (
                  <TouchableOpacity
                    key={`${level}-${row.code || index}-${index}`}
                    style={styles.row}
                    onPress={() => openRow(row)}
                    disabled={!canOpen}
                    activeOpacity={canOpen ? 0.65 : 1}
                  >
                    <View style={[styles.rank, { backgroundColor: [T.yd, T.green, T.copper, T.purple, T.blue][index % 5] }]}>
                      <Text style={styles.rankText}>{index + 1}</Text>
                    </View>

                    <View style={styles.rowMain}>
                      <Text numberOfLines={2} style={styles.rowName}>{primary}</Text>
                      {secondary ? <Text numberOfLines={1} style={styles.rowSub}>{secondary}</Text> : null}
                    </View>

                    <View style={styles.rowRight}>
                      <Text style={styles.rowQty}>{qty(row.qty)} m</Text>
                      <Text style={styles.rowAmount} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.62}>{formatSummaryAmount(row.amount, amountMode, row.amount_exact)}</Text>
                    </View>

                    {canOpen ? <Text style={styles.chevron}>›</Text> : null}
                  </TouchableOpacity>
                );
              })
            )}

            {!loading && !error && sortedRows.length > 0 ? (
              <View style={styles.footerTotal}>
                <View>
                  <Text style={styles.footerKicker}>TOTAL</Text>
                  <Text style={styles.footerSub}>{sortedRows.length} rows</Text>
                </View>
                <View style={styles.footerRight}>
                  <Text style={styles.footerQty}>{qty(report?.total?.qty)} m</Text>
                  <Text style={styles.footerAmount} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.68}>
                    {formatSummaryAmount(report?.total?.amount, amountMode, report?.total?.amount_exact)}
                  </Text>
                </View>
              </View>
            ) : null}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  safe: { flex: 1, backgroundColor: T.bg },
  content: { paddingHorizontal: 14, paddingTop: 12, paddingBottom: 34 },

  contextCard: {
    backgroundColor: T.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: T.border,
    padding: 14,
    ...S.card,
  },
  contextTop: { flexDirection: 'row', alignItems: 'center' },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: T.nav,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },
  iconText: { color: '#fff', fontWeight: '900', fontSize: 18 },
  contextMain: { flex: 1, minWidth: 0 },
  kicker: { color: T.copper, fontSize: 9, fontWeight: '900', letterSpacing: 0.8 },
  reportTitle: { color: T.ink, fontSize: 19, fontWeight: '900', marginTop: 2 },
  reportSub: { color: T.muted, fontSize: 9, lineHeight: 14, marginTop: 3 },
  contextPills: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 12 },
  contextPill: {
    maxWidth: '100%',
    backgroundColor: T.alt,
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  contextPillLabel: { color: T.muted, fontSize: 7, fontWeight: '900', textTransform: 'uppercase' },
  contextPillValue: { color: T.ink, fontSize: 10, fontWeight: '800', marginTop: 1, maxWidth: 230 },

  monthRow: { gap: 7, paddingVertical: 12, paddingRight: 8 },
  monthChip: {
    minWidth: 70,
    height: 36,
    borderRadius: 18,
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.border,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  monthChipActive: { backgroundColor: T.nav, borderColor: T.nav },
  monthChipText: { color: T.muted, fontSize: 10, fontWeight: '800' },
  monthChipTextActive: { color: '#fff' },

  totalCard: {
    backgroundColor: T.nav,
    borderRadius: 17,
    paddingVertical: 14,
    paddingHorizontal: 13,
    flexDirection: 'row',
    alignItems: 'center',
    ...S.card,
  },
  totalBlock: { flex: 1 },
  totalBlockSmall: { width: 58, alignItems: 'flex-end' },
  totalDivider: { width: 1, height: 35, backgroundColor: 'rgba(255,255,255,0.14)', marginHorizontal: 10 },
  totalLabel: { color: 'rgba(255,255,255,0.55)', fontSize: 7, fontWeight: '900', letterSpacing: 0.7 },
  totalValue: { color: '#fff', fontSize: 14, fontWeight: '900', marginTop: 4 },

  reconcile: { marginTop: 10, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9, borderWidth: 1 },
  reconcileOk: { backgroundColor: '#EFF7F2', borderColor: '#CFE4D5' },
  reconcileWarn: { backgroundColor: '#FFF4EC', borderColor: '#EBC9AF' },
  reconcileTitle: { fontSize: 9, fontWeight: '900' },
  reconcileTitleOk: { color: T.green },
  reconcileTitleWarn: { color: T.red },
  reconcileDetail: { color: T.muted, fontSize: 8, marginTop: 3 },
  messageBox: { marginTop: 10, backgroundColor: '#FFF5E9', borderRadius: 12, padding: 11, borderWidth: 1, borderColor: '#EFD5B6' },
  messageText: { color: '#8A5B25', fontSize: 9, lineHeight: 14 },

  panel: {
    marginTop: 12,
    backgroundColor: T.surface,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: T.border,
    overflow: 'hidden',
    ...S.card,
  },
  panelHeader: { padding: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  panelKicker: { color: T.copper, fontSize: 8, fontWeight: '900', letterSpacing: 0.7 },
  panelTitle: { color: T.ink, fontSize: 16, fontWeight: '900', marginTop: 2 },
  sortButton: { backgroundColor: T.alt, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 7 },
  sortText: { color: T.nav, fontSize: 8, fontWeight: '900' },
  columns: {
    height: 34,
    paddingHorizontal: 13,
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: T.hair,
  },
  columnName: { flex: 1, color: T.muted, fontSize: 8, fontWeight: '900', letterSpacing: 0.6 },
  columnValue: { color: T.muted, fontSize: 8, fontWeight: '900', letterSpacing: 0.6 },

  state: { minHeight: 180, alignItems: 'center', justifyContent: 'center', padding: 24 },
  stateText: { color: T.muted, fontSize: 10, lineHeight: 16, textAlign: 'center', marginTop: 8 },
  errorTitle: { color: T.red, fontSize: 13, fontWeight: '900' },
  emptyTitle: { color: T.ink, fontSize: 13, fontWeight: '900' },
  retry: { marginTop: 12, borderRadius: 10, backgroundColor: T.nav, paddingHorizontal: 16, paddingVertical: 9 },
  retryText: { color: '#fff', fontSize: 10, fontWeight: '900' },

  row: {
    minHeight: 66,
    paddingHorizontal: 11,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: T.hair,
  },
  rank: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 9 },
  rankText: { color: '#fff', fontSize: 8, fontWeight: '900' },
  rowMain: { flex: 1, minWidth: 0 },
  rowName: { color: T.ink, fontSize: 11, fontWeight: '800' },
  rowSub: { color: T.muted, fontSize: 8, marginTop: 3 },
  rowRight: { alignItems: 'flex-end', marginLeft: 8, minWidth: 92, maxWidth: 150 },
  rowQty: { color: T.muted, fontSize: 8 },
  rowAmount: { color: T.ink, fontSize: 11, fontWeight: '900', marginTop: 3 },
  chevron: { color: T.muted, fontSize: 22, marginLeft: 6 },

  footerTotal: { minHeight: 55, backgroundColor: T.alt, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  footerKicker: { color: T.nav, fontSize: 9, fontWeight: '900', letterSpacing: 0.7 },
  footerSub: { color: T.muted, fontSize: 8, marginTop: 2 },
  footerRight: { alignItems: 'flex-end' },
  footerQty: { color: T.muted, fontSize: 8 },
  footerAmount: { color: T.green, fontSize: 13, fontWeight: '900', marginTop: 2 },
});
