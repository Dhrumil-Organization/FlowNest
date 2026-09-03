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

type Mode = 'collection' | 'outstanding';
type Level = 'executives' | 'parties' | 'party_detail';

type Row = {
  code?: string;
  name?: string;
  today_amount?: number;
  today_amount_exact?: string;
  amount?: number;
  amount_exact?: string;
};

type HistoryRow = {
  date_ymd?: number | string;
  date_label?: string;
  entry_count?: number;
  amount?: number;
  amount_exact?: string;
};

type AgeingBucket = { key?: string; label?: string; amount?: number; amount_exact?: string };
type AgeingInvoice = {
  uid?: string;
  bill_no?: string;
  bill_date?: number | string;
  ageing_days?: number;
  outstanding?: number;
  outstanding_exact?: string;
  prp_code?: string;
};
type Ageing = {
  total?: number;
  total_exact?: string;
  open_invoice_count?: number;
  buckets?: AgeingBucket[];
  open_invoices?: AgeingInvoice[];
  account_outstanding?: number;
  account_outstanding_exact?: string;
  net_adjustment?: number;
  net_adjustment_exact?: string;
  reconciliation_difference?: number;
  reconciliation_difference_exact?: string;
  is_reconciled?: boolean;
  message?: string;
};

type Report = {
  type?: Mode;
  level?: Level;
  period?: {
    label?: string;
    month_name?: string;
    historical_supported?: boolean;
    mode?: string;
  };
  total?: {
    amount?: number;
    amount_exact?: string;
    row_count?: number;
  };
  rows?: Row[];
  reconciliation?: {
    expected_amount?: number | null;
    expected_amount_exact?: string | null;
    list_amount?: number;
    list_amount_exact?: string;
    amount_difference?: number | null;
    amount_difference_exact?: string | null;
    amount_reconciled?: boolean | null;
    expected_generated_at?: string | null;
    current_generated_at?: string | null;
    status?: string;
  };
  generated_at?: string;
  ageing?: Ageing;
  history?: HistoryRow[];
  collection_history?: HistoryRow[];
  message?: string | null;
};

type MonthChip = { ym: string; label: string; requestDate: string };

const one = (value: unknown): string => {
  if (Array.isArray(value)) return String(value[0] ?? '');
  return String(value ?? '');
};

const ymdFromDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const validAnchorDate = (raw: string): Date => {
  const match = raw.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) {
    const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    if (!Number.isNaN(date.getTime())) return date;
  }
  return new Date();
};

const sixMonthChips = (anchorRaw: string): MonthChip[] => {
  const anchor = validAnchorDate(anchorRaw);
  const anchorYm = `${anchor.getFullYear()}${String(anchor.getMonth() + 1).padStart(2, '0')}`;
  const result: MonthChip[] = [];

  for (let offset = 0; offset < 6; offset += 1) {
    const monthDate = new Date(anchor.getFullYear(), anchor.getMonth() - offset, 1);
    const year = monthDate.getFullYear();
    const monthIndex = monthDate.getMonth();
    const ym = `${year}${String(monthIndex + 1).padStart(2, '0')}`;
    const requestDate =
      ym === anchorYm
        ? ymdFromDate(anchor)
        : ymdFromDate(new Date(year, monthIndex + 1, 0));

    result.push({
      ym,
      requestDate,
      label: monthDate.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }),
    });
  }

  return result;
};

export default function CollectionFlowScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const session = useAppSessionStore((state: any) => state.appSession || state.session);

  const mode = (one(params.mode) || 'collection') as Mode;
  const level = (one(params.level) || 'executives') as Level;
  const anchorDate = one(params.date) || ymdFromDate(new Date());
  const monthChips = useMemo(() => sixMonthChips(anchorDate), [anchorDate]);
  const initialMonth = one(params.report_month) || monthChips[0]?.ym || '';

  const businessContext = session?.business_context || session?.businessContext || {};
  const prptype =
    one(params.prptype) ||
    String(businessContext?.prp_group || businessContext?.prptype || 'S');

  const executiveCode = one(params.executive_code);
  const executiveName = one(params.executive_name);
  const partyCode = one(params.party_code);
  const partyName = one(params.party_name);
  const expectedMonth = one(params.expected_month);
  const expectedAmount = one(params.expected_amount);
  const expectedGeneratedAt = one(params.expected_generated_at);

  const [selectedMonth, setSelectedMonth] = useState(initialMonth);
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [sortAscending, setSortAscending] = useState(false);
  const [ageingExpanded, setAgeingExpanded] = useState(false);
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
          report_type: mode,
          level,
          executive_code: executiveCode || undefined,
          executive_name: executiveName || undefined,
          party_code: partyCode || undefined,
          party_name: partyName || undefined,
          expected_amount: includeExpected ? expectedAmount : undefined,
          expected_generated_at: includeExpected ? expectedGeneratedAt : undefined,
        });

        if (!response?.success) {
          throw new Error(response?.message || `Unable to load ${mode} report.`);
        }

        setReport(response?.data?.report || null);
      } catch (err: any) {
        setReport(null);
        setError(err?.message || `Unable to load ${mode} report.`);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    }, [executiveCode, executiveName, expectedAmount, expectedGeneratedAt, expectedMonth, level, mode, partyCode, partyName, prptype, selectedChip],
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
    const copy = [...rows];
    copy.sort((a, b) => Number(a.amount || 0) - Number(b.amount || 0));
    return sortAscending ? copy : copy.reverse();
  }, [rows, sortAscending]);

  const title = mode === 'collection' ? 'Collection Report' : 'Outstanding Report';
  const panelTitle = level === 'executives'
    ? 'By Sales Executive'
    : level === 'party_detail'
      ? 'Party Outstanding'
      : 'By Party';
  const accent = mode === 'collection' ? T.green : '#B85C00';

  const openRow = (row: Row) => {
    if (!selectedChip) return;

    if (level === 'executives') {
      router.push({
        pathname: '/new/(tabs)/reports/collection-flow',
        params: {
          mode,
          view: one(params.view) || 'owner',
          date: anchorDate,
          report_month: selectedChip.ym,
          expected_month: selectedChip.ym,
          prptype,
          level: 'parties',
          executive_code: String(row.code || ''),
          executive_name: String(row.name || ''),
          expected_amount: String(Number(row.amount || 0)),
          expected_generated_at: String(report?.generated_at || ''),
        },
      } as any);
      return;
    }

    if (mode === 'outstanding' && level === 'parties') {
      router.push({
        pathname: '/new/(tabs)/reports/collection-flow',
        params: {
          mode,
          view: one(params.view) || 'owner',
          date: anchorDate,
          report_month: selectedChip.ym,
          expected_month: selectedChip.ym,
          prptype,
          level: 'party_detail',
          executive_code: executiveCode || undefined,
          executive_name: executiveName || undefined,
          party_code: String(row.code || ''),
          party_name: String(row.name || ''),
          expected_amount: String(Number(row.amount || 0)),
          expected_generated_at: String(report?.generated_at || ''),
        },
      } as any);
    }
  };

  const reconciliation = report?.reconciliation;
  const hasReconciliation = reconciliation?.expected_amount != null;
  const reconciled = reconciliation?.amount_reconciled !== false;
  const historyRows: HistoryRow[] = mode === 'collection'
    ? (report?.history || [])
    : (report?.collection_history || []);
  const showPaymentHistory =
    (mode === 'collection' && Boolean(executiveName || partyName))
    || (mode === 'outstanding' && level === 'party_detail');
  const historyTotal = historyRows.reduce(
    (sum, row) => sum + Number(row?.amount || 0),
    0,
  );

  return (
    <View style={styles.root}>
      <SubScreenHeader backLabel="Back" title={title} />

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
          <View style={[styles.contextCard, { borderLeftColor: accent }]}>
            <Text style={[styles.kicker, { color: accent }]}>
              {mode === 'collection' ? 'PAYMENT COLLECTION' : 'OUTSTANDING'} · {selectedChip?.label?.toUpperCase()}
            </Text>
            <Text style={styles.reportTitle}>{panelTitle}</Text>
            <Text style={styles.reportSub}>
              {executiveName
                ? `Executive: ${executiveName}`
                : partyName
                  ? `Party: ${partyName}`
                  : `Complete ${mode === 'collection' ? 'Collection' : 'Outstanding'} card report.`}
            </Text>

            {executiveName || partyName ? (
              <View style={styles.contextPills}>
                {executiveName ? (
                  <View style={styles.contextPill}>
                    <Text style={styles.contextPillLabel}>Executive</Text>
                    <Text style={styles.contextPillValue}>{executiveName}</Text>
                  </View>
                ) : null}
                {partyName ? (
                  <View style={styles.contextPill}>
                    <Text style={styles.contextPillLabel}>Party</Text>
                    <Text style={styles.contextPillValue}>{partyName}</Text>
                  </View>
                ) : null}
              </View>
            ) : null}
          </View>

          {/* Last six months remain visible on every drill-down level. */}
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

          <View style={[styles.totalCard, { borderLeftColor: accent }]}>
            <View>
              <Text style={styles.totalLabel}>
                {mode === 'collection' ? 'TOTAL COLLECTION' : 'TOTAL OUTSTANDING'}
              </Text>
              <Text style={[styles.totalValue, { color: accent }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.68}>
                {formatSummaryAmount(report?.total?.amount, amountMode, report?.total?.amount_exact)}
              </Text>
            </View>
            <View style={styles.totalRight}>
              <Text style={styles.totalLabel}>{level === 'party_detail' ? 'OPEN INVOICES' : 'ROWS'}</Text>
              <Text style={styles.totalCount}>
                {level === 'party_detail'
                  ? Number(report?.ageing?.open_invoice_count || 0)
                  : Number(report?.total?.row_count || 0)}
              </Text>
            </View>
          </View>

          {hasReconciliation ? (
            <View style={[styles.reconcile, reconciled ? styles.reconcileOk : styles.reconcileWarn]}>
              <Text style={[styles.reconcileTitle, { color: reconciled ? T.green : '#B85C00' }]}>
                {reconciled
                  ? '✓ Total reconciled with previous screen'
                  : '↻ Current live total changed from the carried value'}
              </Text>
              {!reconciled ? (
                <Text style={styles.reconcileDetail}>
                  Previous {formatSummaryAmount(reconciliation?.expected_amount || 0, amountMode, reconciliation?.expected_amount_exact)} · Current {formatSummaryAmount(reconciliation?.list_amount || 0, amountMode, reconciliation?.list_amount_exact)}
                  {'\n'}The current database value is authoritative.
                </Text>
              ) : null}
            </View>
          ) : null}

          {report?.message ? (
            <View style={styles.messageBox}>
              <Text style={styles.messageTitle}>Data availability</Text>
              <Text style={styles.messageText}>{report.message}</Text>
            </View>
          ) : null}

          {showPaymentHistory ? (
            <View style={styles.historyPanel}>
              <View style={styles.historyHeader}>
                <View>
                  <Text style={styles.historyKicker}>PAYMENT COLLECTION</Text>
                  <Text style={styles.historyTitle}>Payment History · {selectedChip?.label}</Text>
                </View>
                <View style={styles.historyTotalWrap}>
                  <Text style={styles.historyTotalLabel}>MONTH TOTAL</Text>
                  <Text style={styles.historyTotalValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.62}>{formatSummaryAmount(historyTotal, amountMode)}</Text>
                </View>
              </View>

              {historyRows.length === 0 ? (
                <View style={styles.historyEmpty}>
                  <Text style={styles.historyEmptyTitle}>No payment entries</Text>
                  <Text style={styles.historyEmptyText}>
                    No Collection transactions match this exact Executive / Party context for {selectedChip?.label}.
                  </Text>
                </View>
              ) : (
                historyRows.map((item, index) => (
                  <View key={`${item?.date_ymd || index}-${index}`} style={styles.historyRow}>
                    <View style={styles.historyDateWrap}>
                      <Text style={styles.historyDate}>{item?.date_label || String(item?.date_ymd || '')}</Text>
                      <Text style={styles.historyEntries}>
                        {Number(item?.entry_count || 0)} entr{Number(item?.entry_count || 0) === 1 ? 'y' : 'ies'}
                      </Text>
                    </View>
                    <Text style={styles.historyAmount} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.62}>{formatSummaryAmount(item?.amount, amountMode, item?.amount_exact)}</Text>
                  </View>
                ))
              )}
            </View>
          ) : null}

          {level === 'party_detail' && mode === 'outstanding' ? (
            <View style={styles.ageingPanel}>
              <View style={styles.ageingHeader}>
                <View>
                  <Text style={[styles.panelKicker, { color: accent }]}>OUTSTANDING DETAIL</Text>
                  <Text style={styles.panelTitle}>Invoices & Ageing</Text>
                </View>
                <View style={styles.ageingHeaderRight}>
                  <Text style={styles.ageingHeaderLabel}>OPEN INVOICES</Text>
                  <Text style={styles.ageingHeaderCount}>{Number(report?.ageing?.open_invoice_count || 0)}</Text>
                </View>
              </View>

              {loading ? (
                <View style={styles.state}>
                  <ActivityIndicator size="large" color={T.nav} />
                  <Text style={styles.stateText}>Loading invoice ageing…</Text>
                </View>
              ) : error ? (
                <View style={styles.state}>
                  <Text style={styles.errorTitle}>Unable to load ageing</Text>
                  <Text style={styles.stateText}>{error}</Text>
                  <TouchableOpacity onPress={() => void load(false)} style={styles.retry}>
                    <Text style={styles.retryText}>Retry</Text>
                  </TouchableOpacity>
                </View>
              ) : report?.message ? (
                <View style={styles.state}>
                  <Text style={styles.emptyTitle}>Historical outstanding unavailable</Text>
                  <Text style={styles.stateText}>{report.message}</Text>
                </View>
              ) : (
                <>
                  <View style={styles.ageingSummary}>
                    <View>
                      <Text style={styles.totalLabel}>NET OUTSTANDING</Text>
                      <Text style={[styles.ageingSummaryValue, { color: accent }]}>
                        {formatSummaryAmount(
                          report?.ageing?.account_outstanding ?? report?.total?.amount,
                          amountMode,
                          report?.ageing?.account_outstanding_exact ?? report?.total?.amount_exact,
                        )}
                      </Text>
                    </View>
                    <View style={styles.ageingSummaryRight}>
                      <Text style={styles.totalLabel}>OPEN INVOICE BALANCE</Text>
                      <Text style={styles.ageingInvoiceTotal} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.62}>{formatSummaryAmount(report?.ageing?.total, amountMode, report?.ageing?.total_exact)}</Text>
                    </View>
                  </View>

                  <View style={styles.ageingBody}>
                    {(report?.ageing?.buckets || []).map((bucket, index) => {
                      const bucketAmount = Number(bucket?.amount || 0);
                      const maxBucket = Math.max(
                        0,
                        ...(report?.ageing?.buckets || []).map(item => Number(item?.amount || 0)),
                      );
                      const width = maxBucket > 0 ? Math.max(2, Math.min(100, (bucketAmount / maxBucket) * 100)) : 0;
                      return (
                        <View key={bucket?.key || String(index)} style={styles.ageingRow}>
                          <Text style={styles.ageingLabel}>{bucket?.label || ''}</Text>
                          <View style={styles.ageingTrack}>
                            <View
                              style={[
                                styles.ageingFill,
                                {
                                  width: `${width}%`,
                                  backgroundColor: ['#2E7D5B', '#D58A00', '#C14335', '#8B2F2F'][index % 4],
                                },
                              ]}
                            />
                          </View>
                          <Text style={styles.ageingAmount} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.62}>{formatSummaryAmount(bucketAmount, amountMode, bucket?.amount_exact)}</Text>
                        </View>
                      );
                    })}
                  </View>

                  {Math.abs(Number(report?.ageing?.net_adjustment || 0)) > 1 ? (
                    <View style={styles.adjustmentBox}>
                      <Text style={styles.adjustmentTitle}>Net balance adjustment</Text>
                      <Text style={styles.adjustmentText}>
                        Open invoices {formatSummaryAmount(report?.ageing?.total, amountMode, report?.ageing?.total_exact)} · credits / other account adjustments {formatSummaryAmount(report?.ageing?.net_adjustment, amountMode, report?.ageing?.net_adjustment_exact)}.
                        {'\n'}The Outstanding card continues to use the net FamAcc.ClBal balance.
                      </Text>
                    </View>
                  ) : null}

                  <TouchableOpacity
                    style={styles.ageingFooter}
                    activeOpacity={(report?.ageing?.open_invoices || []).length > 0 ? 0.7 : 1}
                    onPress={() => {
                      if ((report?.ageing?.open_invoices || []).length > 0) {
                        setAgeingExpanded(value => !value);
                      }
                    }}
                  >
                    <Text style={styles.ageingFooterText}>
                      View {Number(report?.ageing?.open_invoice_count || 0)} open invoice{Number(report?.ageing?.open_invoice_count || 0) === 1 ? '' : 's'}
                    </Text>
                    <Text style={styles.ageingChevron}>
                      {(report?.ageing?.open_invoices || []).length > 0 && ageingExpanded ? '⌃' : '⌄'}
                    </Text>
                  </TouchableOpacity>

                  {ageingExpanded && (report?.ageing?.open_invoices || []).length > 0 ? (
                    <View style={styles.invoiceList}>
                      {(report?.ageing?.open_invoices || []).map((invoice, index) => (
                        <View key={invoice?.uid || `${invoice?.bill_no || 'invoice'}-${index}`} style={styles.invoiceRow}>
                          <View style={styles.invoiceInfo}>
                            <Text style={styles.invoiceNo}>{invoice?.bill_no || `Invoice ${index + 1}`}</Text>
                            <Text style={styles.invoiceMeta}>
                              {String(invoice?.bill_date || '')} · {Number(invoice?.ageing_days || 0)}d
                              {invoice?.prp_code ? ` · ${invoice.prp_code}` : ''}
                            </Text>
                          </View>
                          <Text style={styles.invoiceAmount} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.62}>{formatSummaryAmount(invoice?.outstanding, amountMode, invoice?.outstanding_exact)}</Text>
                        </View>
                      ))}
                    </View>
                  ) : null}
                </>
              )}
            </View>
          ) : (
            <View style={styles.panel}>
              <View style={styles.panelHeader}>
                <View>
                  <Text style={[styles.panelKicker, { color: accent }]}>
                    {mode === 'collection' ? 'COLLECTION BREAKDOWN' : 'OUTSTANDING BREAKDOWN'}
                  </Text>
                  <Text style={styles.panelTitle}>{panelTitle}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => setSortAscending(value => !value)}
                  style={styles.sortButton}
                >
                  <Text style={styles.sortText}>{sortAscending ? 'LOWEST ▲' : 'HIGHEST ▼'}</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.columns}>
                <Text style={styles.columnName}>{level === 'executives' ? 'EXECUTIVE' : 'PARTY'}</Text>
                <Text style={styles.columnValue}>
                  {mode === 'collection' ? 'TODAY · MONTH' : 'OUTSTANDING'}
                </Text>
              </View>

              {loading ? (
                <View style={styles.state}>
                  <ActivityIndicator size="large" color={T.nav} />
                  <Text style={styles.stateText}>Loading {mode} report…</Text>
                </View>
              ) : error ? (
                <View style={styles.state}>
                  <Text style={styles.errorTitle}>Unable to load report</Text>
                  <Text style={styles.stateText}>{error}</Text>
                  <TouchableOpacity onPress={() => void load(false)} style={styles.retry}>
                    <Text style={styles.retryText}>Retry</Text>
                  </TouchableOpacity>
                </View>
              ) : sortedRows.length === 0 ? (
                <View style={styles.state}>
                  <Text style={styles.emptyTitle}>No {mode} data</Text>
                  <Text style={styles.stateText}>
                    {report?.message || `No records match this filter for ${selectedChip?.label || 'the selected month'}.`}
                  </Text>
                </View>
              ) : (
                sortedRows.map((row, index) => {
                  const canOpen = level === 'executives' || (mode === 'outstanding' && level === 'parties');
                  return (
                    <TouchableOpacity
                      key={`${row.code || index}-${index}`}
                      onPress={() => openRow(row)}
                      disabled={!canOpen}
                      activeOpacity={canOpen ? 0.65 : 1}
                      style={styles.row}
                    >
                      <View style={[styles.rank, { backgroundColor: [T.yd, T.green, T.copper, T.purple, T.blue][index % 5] }]}>
                        <Text style={styles.rankText}>{index + 1}</Text>
                      </View>

                      <View style={styles.rowMain}>
                        <Text numberOfLines={2} style={styles.rowName}>{row.name || 'Unspecified'}</Text>
                        {row.code ? <Text style={styles.rowCode}>{row.code}</Text> : null}
                      </View>

                      <View style={styles.rowRight}>
                        {mode === 'collection' ? (
                          <Text style={styles.todayAmount} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.62}>{formatSummaryAmount(row.today_amount, amountMode, row.today_amount_exact)}</Text>
                        ) : null}
                        <Text style={[styles.rowAmount, { color: mode === 'outstanding' ? T.red : T.ink }]}>
                          {formatSummaryAmount(row.amount, amountMode, row.amount_exact)}
                        </Text>
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
                  <Text style={[styles.footerAmount, { color: accent }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72}>
                    {formatSummaryAmount(report?.total?.amount, amountMode, report?.total?.amount_exact)}
                  </Text>
                </View>
              ) : null}
            </View>
          )}
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
    borderRadius: 17,
    borderWidth: 1,
    borderColor: T.border,
    borderLeftWidth: 5,
    padding: 14,
    ...S.card,
  },
  kicker: { fontSize: 9, fontWeight: '900', letterSpacing: 0.75 },
  reportTitle: { color: T.ink, fontSize: 19, fontWeight: '900', marginTop: 3 },
  reportSub: { color: T.muted, fontSize: 9, lineHeight: 14, marginTop: 3 },
  contextPills: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 11 },
  contextPill: { maxWidth: '100%', backgroundColor: T.alt, borderRadius: 10, paddingHorizontal: 9, paddingVertical: 6 },
  contextPillLabel: { color: T.muted, fontSize: 7, fontWeight: '900', textTransform: 'uppercase' },
  contextPillValue: { color: T.ink, fontSize: 10, fontWeight: '800', marginTop: 1, maxWidth: 235 },

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
    backgroundColor: T.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: T.border,
    borderLeftWidth: 5,
    paddingHorizontal: 14,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...S.card,
  },
  totalLabel: { color: T.muted, fontSize: 8, fontWeight: '900', letterSpacing: 0.7 },
  totalValue: { fontSize: 19, fontWeight: '900', marginTop: 3 },
  totalRight: { alignItems: 'flex-end' },
  totalCount: { color: T.ink, fontSize: 15, fontWeight: '900', marginTop: 3 },

  reconcile: { marginTop: 10, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9, borderWidth: 1 },
  reconcileOk: { backgroundColor: '#EFF7F2', borderColor: '#CFE4D5' },
  reconcileWarn: { backgroundColor: '#FFF4EC', borderColor: '#EBC9AF' },
  reconcileTitle: { fontSize: 9, fontWeight: '900' },
  reconcileDetail: { color: T.muted, fontSize: 8, marginTop: 3 },
  messageBox: { marginTop: 10, backgroundColor: '#FFF5E9', borderRadius: 12, padding: 11, borderWidth: 1, borderColor: '#EFD5B6' },
  messageTitle: { color: '#8A5B25', fontSize: 9, fontWeight: '900' },
  messageText: { color: '#8A5B25', fontSize: 9, lineHeight: 14, marginTop: 3 },

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
  panelKicker: { fontSize: 8, fontWeight: '900', letterSpacing: 0.7 },
  panelTitle: { color: T.ink, fontSize: 16, fontWeight: '900', marginTop: 2 },
  sortButton: { backgroundColor: T.alt, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 7 },
  sortText: { color: T.nav, fontSize: 8, fontWeight: '900' },
  columns: { height: 34, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderBottomWidth: 1, borderColor: T.hair },
  columnName: { flex: 1, color: T.muted, fontSize: 8, fontWeight: '900', letterSpacing: 0.6 },
  columnValue: { color: T.muted, fontSize: 8, fontWeight: '900', letterSpacing: 0.6 },

  state: { minHeight: 180, alignItems: 'center', justifyContent: 'center', padding: 24 },
  stateText: { color: T.muted, fontSize: 10, lineHeight: 16, textAlign: 'center', marginTop: 8 },
  errorTitle: { color: T.red, fontSize: 13, fontWeight: '900' },
  emptyTitle: { color: T.ink, fontSize: 13, fontWeight: '900' },
  retry: { marginTop: 12, backgroundColor: T.nav, paddingHorizontal: 16, paddingVertical: 9, borderRadius: 10 },
  retryText: { color: '#fff', fontSize: 10, fontWeight: '900' },

  row: { minHeight: 66, paddingHorizontal: 11, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: T.hair },
  rank: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 9 },
  rankText: { color: '#fff', fontSize: 8, fontWeight: '900' },
  rowMain: { flex: 1, minWidth: 0 },
  rowName: { color: T.ink, fontSize: 11, fontWeight: '800' },
  rowCode: { color: T.muted, fontSize: 8, marginTop: 3 },
  rowRight: { alignItems: 'flex-end', marginLeft: 8, minWidth: 105, maxWidth: 165 },
  todayAmount: { color: T.green, fontSize: 8, fontWeight: '800' },
  rowAmount: { fontSize: 11, fontWeight: '900', marginTop: 3 },
  chevron: { color: T.muted, fontSize: 22, marginLeft: 6 },

  historyPanel: {
    marginTop: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: T.border,
    overflow: 'hidden',
  },
  historyHeader: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: T.border,
  },
  historyKicker: {
    color: T.green,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
  },
  historyTitle: {
    marginTop: 4,
    color: T.ink,
    fontSize: 16,
    fontWeight: '900',
  },
  historyTotalWrap: { alignItems: 'flex-end', paddingLeft: 10 },
  historyTotalLabel: {
    color: T.muted,
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  historyTotalValue: {
    marginTop: 3,
    color: T.green,
    fontSize: 15,
    fontWeight: '900',
  },
  historyRow: {
    minHeight: 64,
    paddingHorizontal: 16,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: T.border,
  },
  historyDateWrap: { flex: 1, paddingRight: 12 },
  historyDate: { color: T.ink, fontSize: 13, fontWeight: '800' },
  historyEntries: { marginTop: 3, color: T.muted, fontSize: 10, fontWeight: '600' },
  historyAmount: { color: T.green, fontSize: 14, fontWeight: '900' },
  historyEmpty: { paddingHorizontal: 16, paddingVertical: 18 },
  historyEmptyTitle: { color: T.ink, fontSize: 13, fontWeight: '800' },
  historyEmptyText: { marginTop: 4, color: T.muted, fontSize: 11, lineHeight: 16 },
  ageingPanel: {
    marginTop: 12, backgroundColor: T.surface, borderRadius: 17, borderWidth: 1,
    borderColor: T.border, overflow: 'hidden', ...S.card,
  },
  ageingHeader: {
    padding: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderBottomWidth: 1, borderBottomColor: T.hair,
  },
  ageingHeaderRight: { alignItems: 'flex-end' },
  ageingHeaderLabel: { color: T.muted, fontSize: 7, fontWeight: '900', letterSpacing: 0.6 },
  ageingHeaderCount: { color: T.ink, fontSize: 16, fontWeight: '900', marginTop: 2 },
  ageingSummary: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end',
    paddingHorizontal: 13, paddingVertical: 12, backgroundColor: T.alt,
  },
  ageingSummaryValue: { fontSize: 18, fontWeight: '900', marginTop: 3 },
  ageingSummaryRight: { alignItems: 'flex-end' },
  ageingInvoiceTotal: { color: T.ink, fontSize: 13, fontWeight: '900', marginTop: 3 },
  ageingBody: { paddingHorizontal: 13, paddingTop: 12, paddingBottom: 6 },
  ageingRow: { flexDirection: 'row', alignItems: 'center', minHeight: 31 },
  ageingLabel: { width: 72, color: T.muted, fontSize: 9, fontWeight: '700' },
  ageingTrack: { flex: 1, height: 6, backgroundColor: T.hair, borderRadius: 3, overflow: 'hidden', marginHorizontal: 8 },
  ageingFill: { height: 6, borderRadius: 3 },
  ageingAmount: { width: 125, textAlign: 'right', color: T.ink, fontSize: 8.5, fontWeight: '900', fontVariant: ['tabular-nums'] },
  adjustmentBox: { marginHorizontal: 13, marginVertical: 8, backgroundColor: '#FFF5E9', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: '#EFD5B6' },
  adjustmentTitle: { color: '#8A5B25', fontSize: 9, fontWeight: '900' },
  adjustmentText: { color: '#8A5B25', fontSize: 8, lineHeight: 13, marginTop: 3 },
  ageingFooter: {
    minHeight: 44, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderTopWidth: 1, borderTopColor: T.hair,
  },
  ageingFooterText: { color: T.nav, fontSize: 10, fontWeight: '900' },
  ageingChevron: { color: T.muted, fontSize: 15 },
  invoiceList: { borderTopWidth: 1, borderTopColor: T.hair },
  invoiceRow: { minHeight: 54, paddingHorizontal: 13, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: T.hair },
  invoiceInfo: { flex: 1, minWidth: 0 },
  invoiceNo: { color: T.ink, fontSize: 10, fontWeight: '900' },
  invoiceMeta: { color: T.muted, fontSize: 8, marginTop: 3 },
  invoiceAmount: { color: T.red, fontSize: 10, fontWeight: '900', marginLeft: 10 },

  footerTotal: { minHeight: 55, backgroundColor: T.alt, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  footerKicker: { color: T.nav, fontSize: 9, fontWeight: '900', letterSpacing: 0.7 },
  footerSub: { color: T.muted, fontSize: 8, marginTop: 2 },
  footerAmount: { fontSize: 13, fontWeight: '900' },
});
