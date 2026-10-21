// FILE: src/components/OwnerDashboardNEW/index.tsx
// NEW ERP — Owner Dashboard (one-page owner summary, built from the "OWNER DASHBOARD" sheet).
//
// Endpoint (see ./api.ts — host = `API` prop, Bearer = `token` prop):
//   GET /api/getOwnerSummaryDashboard?date&prptype&executive_code
//     re-fetched on : mount and every change of Date / Executive, and the Refresh button / pull-to-refresh
//     response      : see OwnerSummaryData in ./model.ts
//
// Blocks (same order as the sheet):
//   1. Filters            Date · Month (derived from the date) · Executive Name (All / one executive)
//   2. Sales & Collection Today Sales · MTD Sales · Today Payment Collection · MTD Payment Collection ·
//                         Total Outstanding · Over Due Payment · Collection
//   3. Sales Orders       No Of Sales Order · Sales Order Mtrs · Sales Order Amt · Running Order ·
//                         Pending Order · On Time Delivery · Delay Delivery
//   4. Profit Overview    Sales · Total Expense · Gross Profit · Profit %
//      Owner Alerts       Delayed Orders · Open Orders · Low Efficiency (<90%) · Pending Sales
//   5. Production Dep't   MW Rapier / SUD Rapier / SUD Waterjet x Today Mtrs · Efficiency · MTD Mtrs ·
//                         Avg Efficiency · Avg RPM
//   6. Deployment         Today Att. · Today Salary Amt · MTD Att. · MTD Salary Amt · Avg/Day
//   7. Executive table    Open Order · Amt · Make to Order · Amt · Running Orders · Amt · Outstanding · Due Amt
//                         tap a row -> ./OrderTracker.tsx (open sales orders with stage tracker -> order detail)
//
// The screen only DISPLAYS what the API returns — no figure is calculated here. A value the ERP does not
// have yet (API sends null) is shown as "—" with a short note, never as 0.
// No own header / SafeAreaView (global AppHeader). AsyncStorage: none (amount mode uses the shared
// dashboard preference through useDashboardAmountMode).
import {
  useDashboardAmountMode,
  type DashboardAmountMode,
} from '@/src/components/dashboard/AmountDisplayModeControl';
import { S, T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { Btn, CONTENT_MAX, IconBtn, PickField, ProgressBar, SearchBox, Sheet } from '../erpUi';
import BeamPlan from './BeamPlan';
import { getCriterionExecutives, getOwnerSummaryDashboard, OwnerSummaryError } from './api';
import { FONT, loadOwnerFonts } from './fonts';
import {
  count,
  DASH,
  efficiencyBand,
  money,
  mtrs,
  percent,
  rpm,
  toIsoDate,
  ymdLabel,
  type Num,
  type OwnerDeploymentRow,
  type OwnerExecutiveOption,
  type OwnerExecutiveRow,
  type OwnerProductionRow,
  type OwnerSummaryData
} from './model';
import DelaysByPerson from './DelaysByPerson';
import { ExecutiveOrders } from './OrderTracker';
import { PRP_CODE, stageYearNo } from './prodOrderModel';
import ProductionOrders from './ProductionOrders';
import StageAssignment from './StageAssignment';


type Props = { token: string; API: string; username?: string; prptype?: string };

type Tone = 'default' | 'danger' | 'good' | 'accent';

const toneColor = (tone: Tone) =>
  tone === 'danger' ? T.red : tone === 'good' ? T.green : tone === 'accent' ? T.copper : T.nav;

/* ------------------------------------------------------------------ */
/* KPI tile                                                            */
/* ------------------------------------------------------------------ */

function Tile({
  label,
  value,
  sub,
  icon,
  tone = 'default',
  progress,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: string;
  tone?: Tone;
  progress?: Num;
}) {
  const c = toneColor(tone);
  const danger = tone === 'danger';
  return (
    <View style={[st.tile, danger && st.tileDanger]}>
      <View style={[st.tileBar, { backgroundColor: c }]} />
      <View style={st.tileHead}>
        <Text style={[st.tileLabel, danger && { color: T.red }]} numberOfLines={2}>
          {label}
        </Text>
        <View style={[st.tileIcon, { backgroundColor: `${c}16` }]}>
          <Icon name={icon as any} size={15} color={c} />
        </View>
      </View>
      <Text
        style={[st.tileValue, tone !== 'default' && tone !== 'accent' ? { color: c } : null]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.7}
      >
        {value}
      </Text>
      {typeof progress === 'number' ? (
        <View style={{ marginTop: 6 }}>
          <ProgressBar value={progress} color={c} height={5} />
        </View>
      ) : null}
      {sub ? (
        <Text style={st.tileSub} numberOfLines={1}>
          {sub}
        </Text>
      ) : null}
    </View>
  );
}

function TileGrid({ columns, children }: { columns: number; children: React.ReactNode }) {
  const items = React.Children.toArray(children).filter(Boolean);
  const basis = `${Math.floor(10000 / columns) / 100}%`;
  return (
    <View style={st.grid}>
      {items.map((child, i) => (
        <View key={i} style={[st.gridCell, { flexBasis: basis as any, maxWidth: columns === 1 ? '100%' : undefined }]}>
          {child}
        </View>
      ))}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Section card + table                                                */
/* ------------------------------------------------------------------ */

function Panel({
  title,
  meta,
  icon,
  accent = T.nav,
  right,
  children,
  style,
}: {
  title: string;
  meta?: string;
  icon: string;
  accent?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
  style?: any;
}) {
  return (
    <View style={[st.panel, style]}>
      <View style={st.panelHead}>
        <View style={[st.panelIcon, { backgroundColor: `${accent}16` }]}>
          <Icon name={icon as any} size={16} color={accent} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={st.panelTitle} numberOfLines={1}>
            {title}
          </Text>
          {meta ? (
            <Text style={st.panelMeta} numberOfLines={1}>
              {meta}
            </Text>
          ) : null}
        </View>
        {right}
      </View>
      {children}
    </View>
  );
}

type Col<R> = {
  key: string;
  label: string;
  flex: number;
  align?: 'left' | 'right';
  danger?: boolean;
  render: (row: R) => React.ReactNode;
};

function cell(node: React.ReactNode, style: any) {
  return typeof node === 'string' || typeof node === 'number' ? (
    <Text style={style} numberOfLines={1}>
      {node}
    </Text>
  ) : (
    node
  );
}

function Table<R>({
  columns,
  rows,
  total,
  rowKey,
  accent = T.nav,
  minWidth,
  onRowPress,
  selectedKey,
  emptyText = 'No data for the selected filters.',
}: {
  columns: Col<R>[];
  rows: R[];
  total?: R;
  rowKey: (row: R) => string;
  accent?: string;
  minWidth: number;
  onRowPress?: (row: R) => void;
  selectedKey?: string;
  emptyText?: string;
}) {
  const [width, setWidth] = useState(0);
  const tableWidth = Math.max(width, minWidth);

  const renderRow = (row: R, index: number, isTotal = false) => {
    const key = isTotal ? '__total' : rowKey(row);
    const selected = !isTotal && selectedKey !== undefined && selectedKey === key;
    const body = (
      <View
        style={[
          st.tr,
          !isTotal && index % 2 === 1 && st.trAlt,
          selected && st.trSelected,
          isTotal && st.trTotal,
        ]}
      >
        {columns.map((col, ci) => (
          <View
            key={col.key}
            style={[st.td, { flex: col.flex }, col.align === 'right' && st.tdRight, ci === 0 && st.tdFirst]}
          >
            {cell(
              col.render(row),
              [
                st.tdText,
                ci === 0 && st.tdTextFirst,
                col.align === 'right' && { textAlign: 'right' },
                col.danger && { color: T.red },
                isTotal && st.tdTextTotal,
              ],
            )}
          </View>
        ))}
      </View>
    );

    if (onRowPress && !isTotal) {
      return (
        <TouchableOpacity
          key={key}
          activeOpacity={0.75}
          onPress={() => onRowPress(row)}
          accessibilityRole="button"
          accessibilityState={{ selected }}
        >
          {body}
        </TouchableOpacity>
      );
    }
    return <React.Fragment key={key}>{body}</React.Fragment>;
  };

  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      <ScrollView horizontal showsHorizontalScrollIndicator={width > 0 && width < minWidth} bounces={false}>
        <View style={{ width: tableWidth || minWidth }}>
          <View style={[st.th, { backgroundColor: accent }]}>
            {columns.map((col, ci) => (
              <View
                key={col.key}
                style={[
                  st.td,
                  st.thCell,
                  { flex: col.flex },
                  col.align === 'right' && st.tdRight,
                  ci === 0 && st.tdFirst,
                  col.danger && { backgroundColor: T.red },
                ]}
              >
                <Text style={[st.thText, col.align === 'right' && { textAlign: 'right' }]} numberOfLines={2}>
                  {col.label}
                </Text>
              </View>
            ))}
          </View>
          {rows.length === 0 ? (
            <View style={st.tableEmpty}>
              <Text style={st.tableEmptyText}>{emptyText}</Text>
            </View>
          ) : (
            rows.map((row, i) => renderRow(row, i))
          )}
          {total && rows.length > 0 ? renderRow(total, 0, true) : null}
        </View>
      </ScrollView>
    </View>
  );
}

function Note({ text, tone = 'muted' }: { text: string; tone?: 'muted' | 'warn' }) {
  return (
    <View style={[st.note, tone === 'warn' && st.noteWarn]}>
      <Icon name="info-outline" size={14} color={tone === 'warn' ? T.amber : T.muted} />
      <Text style={[st.noteText, tone === 'warn' && { color: T.pd }]}>{text}</Text>
    </View>
  );
}

/** "Status" line of Profit Overview / Owner Alerts (label left, value box right). */
function StatusLine({
  label,
  value,
  sub,
  color = T.ink,
  tint,
  last,
}: {
  label: string;
  value: string;
  sub?: string;
  color?: string;
  tint: string;
  last?: boolean;
}) {
  return (
    <View style={[st.statusLine, last && { borderBottomWidth: 0 }]}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={st.statusLabel} numberOfLines={1}>
          {label}
        </Text>
        {sub ? (
          <Text style={st.statusSub} numberOfLines={1}>
            {sub}
          </Text>
        ) : null}
      </View>
      <View style={[st.statusBox, { backgroundColor: tint }]}>
        <Text style={[st.statusValue, { color }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
          {value}
        </Text>
      </View>
    </View>
  );
}

function EffPill({ value, threshold }: { value: Num; threshold: number }) {
  const band = efficiencyBand(value, threshold);
  if (band === 'none') return <Text style={[st.tdText, { textAlign: 'right' }]}>{DASH}</Text>;
  const c = band === 'good' ? T.green : band === 'warn' ? T.amber : T.red;
  return (
    <View style={[st.effPill, { backgroundColor: `${c}16`, borderColor: `${c}45` }]}>
      <Text style={[st.effText, { color: c }]}>{percent(value)}</Text>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Screen                                                              */
/* ------------------------------------------------------------------ */

type SalesProps = Props & {
  executive: { code: string; name: string };
  onPickExecutive: (opt: { code: string; name: string }) => void;
  mode: DashboardAmountMode;
  refreshTick: number;
  onBusyChange?: (busy: boolean) => void;
};

function SalesOrdersDashboard({ token, API, prptype = 'S', executive, onPickExecutive, mode, refreshTick, onBusyChange }: SalesProps) {

  const [date, setDate] = useState<Date>(() => new Date());

  const [data, setData] = useState<OwnerSummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<{ message: string; denied: boolean } | null>(null);

  const [contentWidth, setContentWidth] = useState(0);
  // Executive Summary drill-down: tapped executive -> open sales orders -> sales order detail.
  const [drill, setDrill] = useState<{ code: string; name: string } | null>(null);

  const requestSeq = useRef(0);
  const isoDate = toIsoDate(date);


  const getCurrentFinancialYearMain = () => {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1; // getMonth() returns 0-11

    // Financial year starts in April
    const financialYearStart = currentMonth >= 4 ? currentYear : currentYear - 1;
    const financialYearEnd = financialYearStart + 1;

    return `${financialYearStart}-${financialYearEnd}`;
  };

  const load = useCallback(
    async (opts: { silent?: boolean; refresh?: boolean } = {}) => {
      const seq = ++requestSeq.current;
      if (opts.silent) setRefreshing(true);
      else setLoading(true);
      setError(null);

      try {
        const result = await getOwnerSummaryDashboard(API, token, {
          yearno: getCurrentFinancialYearMain(),
          prptype: prptype || 'S',
          executive_code: executive.code,
          refresh: opts.refresh ? 1 : 0,
        });
        if (seq !== requestSeq.current) return;
        setData(result);
      } catch (err: any) {
        if (seq !== requestSeq.current) return;
        const e = err as OwnerSummaryError;
        setError({ message: e?.message || 'Unable to load Owner Dashboard.', denied: e?.status === 403 });
      } finally {
        if (seq === requestSeq.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [API, token, isoDate, prptype, executive.code],
  );

  // First load + every Date / Executive change. Data already on screen stays
  // visible while the new figures load (silent), so the page never blanks.
  const hasData = useRef(false);
  useEffect(() => {
    void load({ silent: hasData.current });
  }, [load]);
  useEffect(() => {
    hasData.current = !!data;
  }, [data]);

  const onRefresh = useCallback(() => void load({ silent: true, refresh: true }), [load]);

  // tell the shared Refresh button while this screen is re-fetching
  useEffect(() => {
    onBusyChange?.(refreshing);
  }, [refreshing, onBusyChange]);

  // Refresh button of the shared filter
  const lastTick = useRef(refreshTick);
  useEffect(() => {
    if (refreshTick !== lastTick.current) {
      lastTick.current = refreshTick;
      onRefresh();
    }
  }, [refreshTick, onRefresh]);

  const kpiCols = contentWidth >= 1160 ? 7 : contentWidth >= 820 ? 4 : contentWidth >= 520 ? 3 : 2;
  const twoUp = contentWidth >= 820;
  const isPhone = contentWidth > 0 && contentWidth < 560;

  const k = data?.kpis;
  const profit = data?.profit;
  const alerts = data?.alerts;
  const production = data?.production;
  const deployment = data?.deployment;
  const threshold = production?.low_efficiency_threshold ?? alerts?.low_efficiency_threshold ?? 90;

  /* ----------------------------- columns ----------------------------- */

  const productionCols = useMemo<Col<OwnerProductionRow>[]>(
    () => [
      { key: 'dept', label: "Production Dep't", flex: 1.5, render: (r) => r.label },
      { key: 'today', label: 'Today Mtrs', flex: 1, align: 'right', render: (r) => mtrs(r.today_mtrs) },
      {
        key: 'eff',
        label: 'Efficiency',
        flex: 1,
        align: 'right',
        render: (r) => <EffPill value={r.efficiency} threshold={threshold} />,
      },
      { key: 'mtd', label: 'MTD Mtrs', flex: 1, align: 'right', render: (r) => mtrs(r.mtd_mtrs) },
      {
        key: 'avgeff',
        label: 'Avg Efficiency',
        flex: 1,
        align: 'right',
        render: (r) => <EffPill value={r.avg_efficiency} threshold={threshold} />,
      },
      { key: 'rpm', label: 'Avg RPM', flex: 0.9, align: 'right', render: (r) => rpm(r.avg_rpm) },
    ],
    [threshold],
  );

  const deploymentCols = useMemo<Col<OwnerDeploymentRow>[]>(
    () => [
      { key: 'dep', label: 'Deployment', flex: 1.5, render: (r) => r.label },
      { key: 'tatt', label: 'Today Att.', flex: 0.9, align: 'right', render: (r) => count(r.today_attendance) },
      { key: 'tsal', label: 'Today Salary Amt', flex: 1.2, align: 'right', render: (r) => money(r.today_salary, mode) },
      { key: 'matt', label: 'MTD Att.', flex: 0.9, align: 'right', render: (r) => count(r.mtd_attendance) },
      { key: 'msal', label: 'MTD Salary Amt', flex: 1.2, align: 'right', render: (r) => money(r.mtd_salary, mode) },
      { key: 'avg', label: 'Avg/Day', flex: 1, align: 'right', render: (r) => money(r.avg_per_day, mode) },
    ],
    [mode],
  );

  const executiveCols = useMemo<Col<OwnerExecutiveRow>[]>(
    () => [
      { key: 'name', label: 'Executive Name', flex: 2.2, render: (r) => r.name },
      { key: 'open', label: 'Open Order', flex: 0.9, align: 'right', render: (r) => count(r.open_order) },
      { key: 'openamt', label: 'Amt', flex: 1.15, align: 'right', render: (r) => money(r.open_amount, mode) },
      { key: 'mto', label: 'Make to Order', flex: 0.9, align: 'right', render: (r) => count(r.mto_order) },
      { key: 'mtoamt', label: 'Amt', flex: 1.15, align: 'right', render: (r) => money(r.mto_amount, mode) },
      { key: 'run', label: 'Running Orders', flex: 0.9, align: 'right', render: (r) => count(r.running_order) },
      { key: 'runamt', label: 'Amt', flex: 1.15, align: 'right', render: (r) => money(r.running_amount, mode) },
      { key: 'out', label: 'Outstanding', flex: 1.25, align: 'right', render: (r) => money(r.outstanding, mode) },
      {
        key: 'due',
        label: 'Due Amt',
        flex: 1.2,
        align: 'right',
        danger: true,
        render: (r) => money(r.due_amount, mode),
      },
    ],
    [mode],
  );

  /* ------------------------------ render ----------------------------- */

  const productionMeta = [
    production?.production_day_ymd ? `Production day ${ymdLabel(production.production_day_ymd)}` : '',
    production?.efficiency_sheet_ymd ? `Loom sheet ${ymdLabel(production.efficiency_sheet_ymd)}` : '',
  ]
    .filter(Boolean)
    .join('  ·  ');

  const profitColor = (v: Num) => (typeof v === 'number' ? (v < 0 ? T.red : T.green) : T.ink);
  const scopeName = executive.code ? executive.name : 'All executives';

  return (
    <View style={st.screen}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={st.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[T.copper]} tintColor={T.copper} />
        }
      >
        <View style={st.content} onLayout={(e) => setContentWidth(e.nativeEvent.layout.width)}>
          {/* ------------------------------ states ------------------------------- */}
          {loading && !data ? (
            <View style={st.stateBox}>
              <ActivityIndicator size="large" color={T.copper} />
              <Text style={st.stateText}>Loading owner dashboard…</Text>
            </View>
          ) : null}

          {error ? (
            <View style={[st.stateBox, st.errorBox, data ? { paddingVertical: 14 } : null]}>
              <Icon name={error.denied ? 'lock-outline' : 'error-outline'} size={26} color={T.red} />
              <Text style={st.errorText}>{error.message}</Text>
              {!error.denied ? (
                <Btn label="Retry" icon="refresh" compact onPress={() => void load()} style={{ marginTop: 10 }} />
              ) : null}
            </View>
          ) : null}

          {data && k ? (
            <>
              {/* ------------------------- sales & collection ------------------------ */}
              <View style={st.sectionHead}>
                <Text style={st.sectionTitle}>Sales &amp; Collection</Text>
                <Text style={st.sectionMeta} numberOfLines={1}>
                  {ymdLabel(data.filters.date_ymd)}  ·  {data.filters.month_label}  ·  {scopeName}
                </Text>
              </View>
              <TileGrid columns={kpiCols}>
                <Tile label="Today Sales" value={money(k.today_sales, mode)} icon="today" sub="Billed today" />
                <Tile label="MTD Sales" value={money(k.mtd_sales, mode)} icon="trending-up" sub="Billed this month" />
                <Tile
                  label="Today Payment Collection"
                  value={money(k.today_collection, mode)}
                  icon="payments"
                  sub="Received today"
                />
                <Tile
                  label="MTD Payment Collection"
                  value={money(k.mtd_collection, mode)}
                  icon="account-balance-wallet"
                  sub="Received this month"
                />
                <Tile
                  label="Total Outstanding"
                  value={money(k.total_outstanding, mode)}
                  icon="account-balance"
                  sub={k.outstanding_basis || 'Receivable balance'}
                />
                <Tile
                  label="Over Due Payment"
                  value={money(k.overdue_payment, mode)}
                  icon="warning-amber"
                  tone="danger"
                  sub="Bills past due date"
                />
                <Tile
                  label="Collection"
                  value={percent(k.collection?.pct)}
                  icon="price-check"
                  tone="accent"
                  progress={typeof k.collection?.pct === 'number' ? k.collection.pct : undefined}
                  sub={`${money(k.collection?.received, mode)} of ${money(k.collection?.due, mode)} due`}
                />
              </TileGrid>

              {/* ---------------------------- sales orders --------------------------- */}
              <View style={st.sectionHead}>
                <Text style={st.sectionTitle}>Sales Orders</Text>
                <Text style={st.sectionMeta} numberOfLines={1}>
                  Booked this month  ·  open order book as on {ymdLabel(data.filters.date_ymd)}
                </Text>
              </View>
              <TileGrid columns={kpiCols}>
                <Tile
                  label="No Of Sales Order"
                  value={count(k.sales_orders.count)}
                  icon="receipt-long"
                  sub={`Today ${count(k.sales_orders.today_count)}`}
                />
                <Tile
                  label="Sales Order Mtrs"
                  value={mtrs(k.sales_orders.mtrs, mode)}
                  icon="straighten"
                  sub={`Today ${mtrs(k.sales_orders.today_mtrs, mode)}`}
                />
                <Tile
                  label="Sales Order Amt"
                  value={money(k.sales_orders.amount, mode)}
                  icon="currency-rupee"
                  sub={`Today ${money(k.sales_orders.today_amount, mode)}`}
                />
                <Tile
                  label="Running Order"
                  value={count(k.running_order.count)}
                  icon="autorenew"
                  sub="Dispatch started"
                />
                <Tile
                  label="Pending Order"
                  value={count(k.pending_order.count)}
                  icon="pending-actions"
                  tone="danger"
                  sub={`${mtrs(k.pending_order.mtrs, mode)} m balance`}
                />
                <Tile
                  label="On Time Delivery"
                  value={count(k.on_time_delivery.count)}
                  icon="verified"
                  tone="good"
                  sub={`${percent(k.on_time_delivery.pct)} of open orders`}
                />
                <Tile
                  label="Delay Delivery"
                  value={count(k.delay_delivery.count)}
                  icon="schedule"
                  tone={k.delay_delivery.count ? 'danger' : 'default'}
                  sub={`${percent(k.delay_delivery.pct)} past due date`}
                />
              </TileGrid>

              {/* ----------------------- profit overview + alerts -------------------- */}
              <View style={[st.duo, !twoUp && { flexDirection: 'column' }]}>
                <Panel
                  title="Profit Overview"
                  meta={`Company  ·  ${data.filters.month_label}${profit?.expense_through_ymd ? `  ·  expense through ${ymdLabel(profit.expense_through_ymd)}` : ''
                    }`}
                  icon="insights"
                  accent={T.blue}
                  style={twoUp ? { flex: 1 } : undefined}
                >
                  <View style={st.panelBody}>
                    <StatusLine label="Sales" value={money(profit?.sales, mode)} tint={`${T.green}12`} />
                    <StatusLine label="Total Expense" value={money(profit?.total_expense, mode)} tint={`${T.green}12`} />
                    <StatusLine
                      label="Gross Profit"
                      value={money(profit?.gross_profit, mode)}
                      color={profitColor(profit?.gross_profit)}
                      tint={`${T.green}12`}
                    />
                    <StatusLine
                      label="Profit %"
                      value={percent(profit?.profit_pct, 2)}
                      color={profitColor(profit?.profit_pct)}
                      tint={`${T.green}12`}
                      last
                    />
                  </View>
                  <Note text="Total Expense = production cost (electricity, salary, stores, maintenance, other). Yarn / purchase cost is not included." />
                </Panel>

                <Panel
                  title="Owner Alerts"
                  meta={`${scopeName}  ·  as on ${ymdLabel(data.filters.date_ymd)}`}
                  icon="notifications-active"
                  accent={T.red}
                  style={twoUp ? { flex: 1 } : undefined}
                >
                  <View style={st.panelBody}>
                    <StatusLine
                      label="Delayed Orders"
                      sub="Open orders past due date"
                      value={count(alerts?.delayed_orders)}
                      color={alerts?.delayed_orders ? T.red : T.ink}
                      tint={`${T.red}10`}
                    />
                    <StatusLine
                      label="Open Orders"
                      sub="Orders with balance to dispatch"
                      value={count(alerts?.open_orders)}
                      tint={`${T.red}10`}
                    />
                    <StatusLine
                      label={`Low Efficiency (<${threshold}%)`}
                      sub={
                        alerts?.low_efficiency_sheet_ymd
                          ? `Looms on sheet of ${ymdLabel(alerts.low_efficiency_sheet_ymd)}`
                          : 'Looms below target'
                      }
                      value={
                        typeof alerts?.low_efficiency_looms === 'number' ? `${count(alerts.low_efficiency_looms)} looms` : DASH
                      }
                      color={alerts?.low_efficiency_looms ? T.red : T.ink}
                      tint={`${T.red}10`}
                    />
                    <StatusLine
                      label="Pending Sales"
                      sub={
                        typeof alerts?.pending_sales_mtrs === 'number'
                          ? `${mtrs(alerts.pending_sales_mtrs, mode)} m balance on open orders`
                          : 'Balance value of open orders'
                      }
                      value={money(alerts?.pending_sales_amount, mode)}
                      tint={`${T.red}10`}
                      last
                    />
                  </View>
                </Panel>
              </View>

              {/* ----------------------------- production ---------------------------- */}
              {production ? (
                <Panel title="Production Dep't" meta={productionMeta || undefined} icon="precision-manufacturing" accent={T.green}>
                  <Table
                    columns={productionCols}
                    rows={production.rows}
                    total={{
                      key: '__total',
                      label: 'Total',
                      today_mtrs: production.total.today_mtrs,
                      mtd_mtrs: production.total.mtd_mtrs,
                      efficiency: production.total.efficiency,
                      avg_efficiency: production.total.avg_efficiency,
                      avg_rpm: production.total.avg_rpm,
                    }}
                    rowKey={(r) => r.key}
                    accent={T.green}
                    minWidth={640}
                  />
                  {!production.efficiency_available ? (
                    <Note
                      tone="warn"
                      text={production.efficiency_message || 'Efficiency / RPM: no loom sheet entry found for this month.'}
                    />
                  ) : null}
                </Panel>
              ) : null}

              {/* ----------------------------- deployment ---------------------------- */}
              {deployment ? (
                <Panel
                  title="Deployment"
                  meta={deployment.salary_day_ymd ? `Salary entered through ${ymdLabel(deployment.salary_day_ymd)}` : undefined}
                  icon="groups"
                  accent={T.yd}
                >
                  <Table
                    columns={deploymentCols}
                    rows={deployment.rows}
                    total={{ key: '__total', label: 'Total', ...deployment.total }}
                    rowKey={(r) => r.key}
                    accent={T.yd}
                    minWidth={640}
                  />
                  {!deployment.attendance_available ? (
                    <Note
                      tone="warn"
                      text={`${deployment.attendance_message || 'Attendance is not entered in the ERP yet.'} Salary is shown section-wise as entered in Expense Costing.`}
                    />
                  ) : null}
                </Panel>
              ) : null}

              {/* ---------------------------- executive table ------------------------ */}
              <Panel
                title="Executive Summary"
                meta={`${data.executive_rows.length} executive${data.executive_rows.length === 1 ? '' : 's'}  ·  tap a row to see its sales orders`}
                icon="badge"
                accent={T.nav}
                right={
                  executive.code ? (
                    <Btn label="Show all" icon="close" kind="soft" compact onPress={() => onPickExecutive({ code: '', name: 'All' })} />
                  ) : undefined
                }
              >
                <Table
                  columns={executiveCols}
                  rows={data.executive_rows}
                  total={
                    data.executive_rows.length > 1
                      ? { code: '__total', name: 'Total', ...data.executive_total }
                      : undefined
                  }
                  rowKey={(r) => r.code}
                  accent={T.nav}
                  minWidth={980}
                  selectedKey={executive.code || undefined}
                  onRowPress={(r) => setDrill({ code: r.code, name: r.name })}
                />
                {data.order_book && !data.order_book.mto_supported ? (
                  <Note tone="warn" text="Make to Order split is not available in this database (FAMSO.SOType missing) — all open orders are shown under Open Order." />
                ) : null}
              </Panel>

              <Text style={st.footer}>
                Updated {data.generated_at ? new Date(data.generated_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : ''}
                {'  ·  '}Pending Order = ERP Pending Order report (status P, balance qty). Open Order = stock orders, Make to Order = MTO
                orders, Running = dispatch started.
              </Text>
            </>
          ) : null}
        </View>
      </ScrollView>

      {/* ------------- executive drill-down (sales orders -> sales order detail) ------------- */}
      {drill ? (
        <ExecutiveOrders
          session={{ API, token, prptype: prptype || 'S', date: isoDate }}
          executive={drill}
          onBack={() => setDrill(null)}
        />
      ) : null}

    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Module entry: Sales orders | Production orders (Production opens first) */
/* ------------------------------------------------------------------ */

type ModuleTab = 'sales' | 'production';
// outer tabs: Order (everything that was on the dashboard before) | Setup (item x stage -> person)
type Section = 'order' |'delaysbyperson' |'beamplan' | 'setup';

export default function OwnerDashboardNEW(props: Props) {
  const { mode } = useDashboardAmountMode(); // Compact / Actual switch removed from the UI; saved preference is still honoured
  const [section, setSection] = useState<Section>('order'); // Order opens first
  const [setupVisited, setSetupVisited] = useState(false); // Setup loads only once it is opened
  const [delaysVisited, setDelaysVisited] = useState(false); // Delays by person loads only once it is opened
  const [delaysTick, setDelaysTick] = useState(0);
  const [beamVisited, setBeamVisited] = useState(false); // Beam plan loads only once it is opened
  const [beamTick, setBeamTick] = useState(0);
  const { width: winW } = useWindowDimensions();
  const [barW, setBarW] = useState(0);
  const [sectionPickerOpen, setSectionPickerOpen] = useState(false); // phone only: Order / Delays / Beam / Setup picker sheet
  const phoneBar = (barW || winW) < 680; // phone: 4 equal tabs (icon upar, poora naam neeche)
  const [tab, setTab] = useState<ModuleTab>('production');
  useEffect(() => {
    loadOwnerFonts();
  }, []);
  const [executive, setExecutive] = useState<{ code: string; name: string }>({ code: '', name: 'All' });
  const [executives, setExecutives] = useState<OwnerExecutiveOption[]>([]); // from get_criterion only
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerSearch, setPickerSearch] = useState('');
  const [refreshTick, setRefreshTick] = useState(0);
  const [width, setWidth] = useState(0);
  const [detailOpen, setDetailOpen] = useState(false);
  const isPhone = width > 0 && width < 560;

  const tabs: { key: ModuleTab; label: string }[] = [
    { key: 'sales', label: 'Sales orders' },
    { key: 'production', label: 'Production orders' },
  ];

  // dropdown list: get_criterion (prpcode SIP, strcode 012, txntype sales_order, fetch salesexe)
  // runs on mount AND on every Refresh click, exactly like the other load-time APIs
  const [execBusy, setExecBusy] = useState(false);
  const [prodBusy, setProdBusy] = useState(false);
  const [salesBusy, setSalesBusy] = useState(false);
  const execSeq = useRef(0);
  const loadExecutives = useCallback(() => {
    const id = ++execSeq.current;
    setExecBusy(true);
    getCriterionExecutives(props.API, props.token, { prpcode: PRP_CODE, yearno: stageYearNo() })
      .then((list) => {
        if (id === execSeq.current) {
          const seen = new Set<string>();
          setExecutives(list.filter((e) => (seen.has(e.code) ? false : (seen.add(e.code), true))));
        }
      })
      .catch(() => {
        /* keep the fallback list */
      })
      .finally(() => {
        if (id === execSeq.current) setExecBusy(false);
      });
  }, [props.API, props.token]);
  useEffect(() => {
    loadExecutives();
    return () => {
      execSeq.current++;
    };
  }, [loadExecutives]);

  // one Refresh = every API the screen calls on load (executives + production orders + sales dashboard)
  const onRefreshAll = useCallback(() => {
    loadExecutives();
    setRefreshTick((n) => n + 1);
  }, [loadExecutives]);
  const refreshBusy = execBusy || prodBusy || salesBusy;

  const executiveOptions = useMemo(() => {
    const list = [{ code: '', name: 'All' }, ...executives];
    const q = pickerSearch.trim().toLowerCase();
    return q ? list.filter((e) => e.name.toLowerCase().includes(q)) : list;
  }, [executives, pickerSearch]);

  const pickExecutive = useCallback((opt: { code: string; name: string }) => {
    setExecutive(opt);
    setPickerOpen(false);
    setPickerSearch('');
  }, []);

  // every time the person switches between Order and Setup, that screen calls its APIs again
  const [setupTick, setSetupTick] = useState(0);
  const openSection = (k: Section) => {
    setSection(k);
    if (k === 'setup') {
      setSetupVisited(true);
      setSetupTick((n) => n + 1);
    } else if (k === 'delaysbyperson') {
      // every time this tab is opened it calls getdelaysbyperson again (so a person saved in Setup shows up at once)
      setDelaysVisited(true);
      setDelaysTick((n) => n + 1);
    } else if (k === 'order') {
      setTab('production'); // Order always opens on its default tab (Production orders) and loads that tab's APIs
      onRefreshAll();
    } else if (k === 'beamplan') {
      // every time this tab is opened it calls getbeamplan again
      setBeamVisited(true);
      setBeamTick((n) => n + 1);
    }
  };
  const sectionIcon: Record<Section, string> = { order: 'dashboard', delaysbyperson: 'groups', beamplan: 'view-week', setup: 'tune' };
  const sectionTabs: { key: Section; label: string }[] = [
    { key: 'order', label: 'Order' },
    { key: 'delaysbyperson', label: 'Delays By Person' },
    { key: 'beamplan', label: 'Beam Plan' },
    { key: 'setup', label: 'Setup' },
  ];
  // the Order / Setup bar is hidden only while a production order detail is open (same rule as the inner tabs)
  const hideSectionBar = section === 'order' && tab === 'production' && detailOpen;

  return (
    <View style={st.screen}>
      {hideSectionBar ? null : (
        <View style={st.tabBarWrap}>
          <View style={st.tabBarInner} onLayout={(e) => setBarW(e.nativeEvent.layout.width)}>
            {phoneBar ? (
              // MOBILE: 4 tabs ki jagah ek button - selected section ka naam dikhta hai, click karne par bottom sheet khulti hai
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => setSectionPickerOpen(true)}
                style={st.sectionMenuBtn}
                accessibilityRole="button"
                accessibilityLabel="Select section"
              >
                <Icon name={sectionIcon[section] as any} size={18} color="#fff" />
                <Text style={st.sectionMenuText} numberOfLines={1}>
                  {sectionTabs.find((t) => t.key === section)?.label || ''}
                </Text>
                <Icon name="menu" size={20} color="#fff" />
              </TouchableOpacity>
            ) : (
              <View style={[st.tabBar, st.sectionBar, phoneBar && st.sectionBarPhone]}>
                {sectionTabs.map((t) => {
                  const on = section === t.key;
                  return (
                    <TouchableOpacity
                      key={t.key}
                      activeOpacity={0.8}
                      onPress={() => openSection(t.key)}
                      style={[st.tabBtn, st.sectionBtn, phoneBar && st.sectionBtnPhone, on && st.tabBtnOn]}
                      accessibilityRole="tab"
                      accessibilityState={{ selected: on }}
                    >
                      <Icon name={sectionIcon[t.key] as any} size={phoneBar ? 18 : 15} color={on ? '#fff' : T.muted} />
                      <Text style={[st.tabText, phoneBar && st.tabTextPhone, on && st.tabTextOn]} numberOfLines={phoneBar ? 2 : undefined}>
                        {t.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        </View>
      )}

      {/* Setup tab: mounted on first open, then kept (display toggled) so typed values survive tab switches */}
      {setupVisited ? (
        <View style={{ flex: 1, display: section === 'setup' ? 'flex' : 'none' }}>
          <StageAssignment token={props.token} API={props.API} refreshTick={setupTick} />
        </View>
      ) : null}

      {/* Delays by person tab: mounted on first open, then kept; reloads on every open (delaysTick) */}
      {delaysVisited ? (
        <View style={{ flex: 1, display: section === 'delaysbyperson' ? 'flex' : 'none' }}>
          <DelaysByPerson token={props.token} API={props.API} refreshTick={delaysTick} />
        </View>
      ) : null}

      {/* Beam plan tab: mounted on first open, then kept; reloads on every open (beamTick) */}
      {beamVisited ? (
        <View style={{ flex: 1, display: section === 'beamplan' ? 'flex' : 'none' }}>
          <BeamPlan token={props.token} API={props.API} refreshTick={beamTick} />
        </View>
      ) : null}

      {/* Order tab: the original dashboard, untouched, just wrapped */}
      <View style={{ flex: 1, display: section === 'order' ? 'flex' : 'none' }}>
      {/* ------------- shared filter: above the tabs, applies to both ------------- */}
      {/* filter + tabs are shown only on the main page, not while a production order detail is open */}
      {tab === 'production' && detailOpen ? null : (
      <View style={st.tabBarWrap}>
        <View style={st.tabBarInner} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
          <View style={st.filterCard}>
            <View style={[st.filterRow, isPhone && { flexDirection: 'column', alignItems: 'stretch', gap: 8 }]}>
              {isPhone ? (
                <View style={st.filterHeadPhone}>
                  <Text style={st.filterLabel}>Executive</Text>
                  <IconBtn icon="refresh" label="Refresh" onPress={onRefreshAll} loading={refreshBusy} tone="soft" color={T.copper} />
                </View>
              ) : null}

              <View style={isPhone ? { width: '100%' } : { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, maxWidth: 480 }}>
                {!isPhone ? <Text style={st.filterLabel}>Executive</Text> : null}
                <View style={isPhone ? { width: '100%' } : { flex: 1, minWidth: 0 }}>
                  <PickField
                    value={executive.name}
                    icon="person-outline"
                    onPress={() => setPickerOpen(true)}
                    onClear={executive.code ? () => pickExecutive({ code: '', name: 'All' }) : undefined}
                  />
                </View>
              </View>

              {!isPhone ? (
                <>
                  <View style={{ flex: 1 }} />
                  <IconBtn icon="refresh" label="Refresh" onPress={onRefreshAll} loading={refreshBusy} tone="soft" color={T.copper} />
                </>
              ) : null}
            </View>
          </View>

          {/* tabs are hidden while a production order detail is open */}
          {tab === 'production' && detailOpen ? null : (
          <View style={st.tabBar}>
            {tabs.map((t) => {
              const on = tab === t.key;
              return (
                <TouchableOpacity
                  key={t.key}
                  activeOpacity={0.8}
                  onPress={() => setTab(t.key)}
                  style={[st.tabBtn, on && st.tabBtnOn]}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: on }}
                >
                  <Text style={[st.tabText, on && st.tabTextOn]} numberOfLines={1}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          )}
        </View>
      </View>
      )}

      {/* both tabs stay mounted (state is kept when switching); the hidden one just is not drawn */}
      <View style={{ flex: 1, display: tab === 'production' ? 'flex' : 'none' }}>
        <ProductionOrders
          token={props.token}
          API={props.API}
          prptype={props.prptype || 'S'}
          executiveCode={executive.code}
          refreshTick={refreshTick}
          onBusyChange={setProdBusy}
          onDetailChange={setDetailOpen}
        />
      </View>
      {tab === 'sales' ? (
      <View style={{ flex: 1 }}>
        <SalesOrdersDashboard
          {...props}
          executive={executive}
          onPickExecutive={pickExecutive}
          mode={mode}
          refreshTick={refreshTick}
          onBusyChange={setSalesBusy}
        />
      </View>
      ) : null}

      </View>

      {/* MOBILE section picker: selected section highlighted + tick */}
      <Sheet open={phoneBar && sectionPickerOpen} onClose={() => setSectionPickerOpen(false)} eyebrow="OWNER DASHBOARD" title="Select section" wideMax={460}>
        <View>
          {sectionTabs.map((t) => {
            const on = section === t.key;
            return (
              <TouchableOpacity
                key={t.key}
                style={[st.option, on && st.optionOn]}
                onPress={() => {
                  setSectionPickerOpen(false);
                  openSection(t.key);
                }}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
              >
                <Icon name={sectionIcon[t.key] as any} size={18} color={on ? T.copper : T.muted} />
                <Text style={[st.optionText, on && { color: T.nav, fontWeight: '900' }]} numberOfLines={1}>
                  {t.label}
                </Text>
                {on ? <Icon name="check" size={18} color={T.copper} /> : null}
              </TouchableOpacity>
            );
          })}
        </View>
      </Sheet>

      <Sheet open={pickerOpen} onClose={() => setPickerOpen(false)} eyebrow="FILTER" title="Executive Name" wideMax={460}>
        <SearchBox value={pickerSearch} onChangeText={setPickerSearch} placeholder="Search executive…" />
        <View>
          {executiveOptions.map((opt) => {
            const on = opt.code === executive.code;
            return (
              <TouchableOpacity
                key={opt.code || '__all'}
                style={[st.option, on && st.optionOn]}
                onPress={() => pickExecutive(opt)}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
              >
                <Icon name={opt.code ? 'person-outline' : 'groups'} size={18} color={on ? T.copper : T.muted} />
                <Text style={[st.optionText, on && { color: T.nav, fontWeight: '900' }]} numberOfLines={1}>
                  {opt.name}
                </Text>
                {on ? <Icon name="check" size={18} color={T.copper} /> : null}
              </TouchableOpacity>
            );
          })}
          {executiveOptions.length === 0 ? <Text style={st.tableEmptyText}>No executive found.</Text> : null}
        </View>
      </Sheet>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Styles                                                              */
/* ------------------------------------------------------------------ */

const st = StyleSheet.create({
  screen: { flex: 1, backgroundColor: T.bg },
  tabBarWrap: { paddingHorizontal: 12, paddingTop: 8 },
  tabBarInner: { width: '100%', maxWidth: CONTENT_MAX, alignSelf: 'center', gap: 8 },
  tabBar: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    maxWidth: 400,
    width: '100%',
    backgroundColor: T.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: T.border,
    padding: 4,
    gap: 4,
    ...S.card,
    shadowOpacity: 0.04,
    elevation: 1,
  },
  sectionBar: { width: '100%', maxWidth: 720, alignSelf: 'flex-start' }, // web: 4 barabar tabs, har ek ~180px - poora naam aata hai
  sectionBarPhone: { width: '100%', maxWidth: '100%', alignSelf: 'stretch' },
  sectionMenuBtn: { width: '100%', height: 44, borderRadius: 12, backgroundColor: T.nav, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, ...S.card },
  sectionMenuText: { flex: 1, fontFamily: FONT, fontSize: 14, fontWeight: '800', color: '#fff' },
  sectionBtn: { flex: 1, minWidth: 0 },
  sectionBtnPhone: { flex: 1, flexShrink: 1, minWidth: 0, height: 54, paddingHorizontal: 2, gap: 2, flexDirection: 'column' },
  placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  placeholderText: { fontFamily: FONT, fontSize: 13, fontWeight: '700', color: T.muted },
  tabBtn: { flex: 1, height: 36, paddingHorizontal: 14, borderRadius: 9, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center' },
  tabBtnOn: { backgroundColor: T.nav, shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  tabText: { fontFamily: FONT, fontSize: 13, fontWeight: '800', color: T.muted },
  tabTextOn: { color: '#fff' },
  tabTextPhone: { fontSize: 11, lineHeight: 13, textAlign: 'center' },
  scroll: { paddingHorizontal: 12, paddingTop: 12, paddingBottom: 32 },
  content: { width: '100%', maxWidth: CONTENT_MAX, alignSelf: 'center', gap: 12 },

  // filters
  filterCard: {
    backgroundColor: T.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: T.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
    ...S.card,
    shadowOpacity: 0.04,
    elevation: 1,
  },
  filterHeadPhone: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  filterRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  filterField: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  filterLabel: { fontFamily: FONT, fontSize: 10.5, fontWeight: '800', color: T.muted, letterSpacing: 0.5, textTransform: 'uppercase' },
  monthPill: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: T.border,
    backgroundColor: T.sub,
  },
  monthText: { fontFamily: FONT, fontSize: 14, fontWeight: '800', color: T.nav },
  filterActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },

  // states
  stateBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 20,
    backgroundColor: T.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: T.border,
  },
  stateText: { marginTop: 10, fontFamily: FONT, fontSize: 13, fontWeight: '700', color: T.muted },
  errorBox: { borderColor: `${T.red}40`, backgroundColor: `${T.red}08` },
  errorText: { marginTop: 8, fontFamily: FONT, fontSize: 13, fontWeight: '700', color: T.red, textAlign: 'center', maxWidth: 520 },

  // section heading
  sectionHead: { flexDirection: 'row', alignItems: 'baseline', gap: 10, marginTop: 4, flexWrap: 'wrap' },
  sectionTitle: { fontFamily: FONT, fontSize: 12, fontWeight: '900', color: T.nav, letterSpacing: 0.8, textTransform: 'uppercase' },
  sectionMeta: { fontFamily: FONT, fontSize: 11.5, fontWeight: '600', color: T.muted, flexShrink: 1 },

  // tiles
  grid: { flexDirection: 'row', flexWrap: 'wrap', margin: -4 },
  gridCell: { padding: 4, flexGrow: 1, flexShrink: 0, minWidth: 0 },
  tile: {
    backgroundColor: T.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: T.border,
    paddingHorizontal: 12,
    paddingTop: 13,
    paddingBottom: 11,
    minHeight: 104,
    flexGrow: 1,
    overflow: 'hidden',
    ...S.card,
    shadowOpacity: 0.04,
    elevation: 1,
  },
  tileDanger: { backgroundColor: '#FBF1EF', borderColor: `${T.red}45` },
  tileBar: { position: 'absolute', left: 0, right: 0, top: 0, height: 3 },
  tileHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, minHeight: 28 },
  tileLabel: {
    flex: 1,
    fontFamily: FONT,
    fontSize: 10.5,
    lineHeight: 14,
    fontWeight: '800',
    color: T.muted,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  tileIcon: { width: 26, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  tileValue: { fontFamily: FONT, fontSize: 20, fontWeight: '900', color: T.ink, marginTop: 6 },
  tileSub: { fontFamily: FONT, fontSize: 11, fontWeight: '600', color: T.muted, marginTop: 4 },

  // panels
  duo: { flexDirection: 'row', gap: 12, alignItems: 'stretch' },
  panel: {
    backgroundColor: T.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: T.border,
    overflow: 'hidden',
    ...S.card,
    shadowOpacity: 0.04,
    elevation: 1,
  },
  panelHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: T.hair,
  },
  panelIcon: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  panelTitle: { fontFamily: FONT, fontSize: 13, fontWeight: '900', color: T.nav, letterSpacing: 0.6, textTransform: 'uppercase' },
  panelMeta: { fontFamily: FONT, fontSize: 11, fontWeight: '600', color: T.muted, marginTop: 1 },
  panelBody: { paddingHorizontal: 12, paddingVertical: 4 },

  statusLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 46,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: T.hair,
  },
  statusLabel: { fontFamily: FONT, fontSize: 13, fontWeight: '700', color: T.ink },
  statusSub: { fontFamily: FONT, fontSize: 10.5, fontWeight: '600', color: T.muted, marginTop: 1 },
  statusBox: {
    minWidth: 128,
    maxWidth: '52%',
    height: 34,
    borderRadius: 8,
    paddingHorizontal: 10,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  statusValue: { fontFamily: FONT, fontSize: 14.5, fontWeight: '900' },

  note: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: T.hair,
    backgroundColor: T.sub,
  },
  noteWarn: { backgroundColor: `${T.amber}12` },
  noteText: { flex: 1, fontFamily: FONT, fontSize: 11, lineHeight: 15, fontWeight: '600', color: T.muted },

  // table
  th: { flexDirection: 'row', minHeight: 38 },
  thCell: { justifyContent: 'center' },
  thText: { fontFamily: FONT, fontSize: 11, lineHeight: 14, fontWeight: '800', color: '#fff', letterSpacing: 0.3 },
  tr: { flexDirection: 'row', minHeight: 40, alignItems: 'stretch', borderBottomWidth: 1, borderBottomColor: T.hair },
  trAlt: { backgroundColor: T.sub },
  trSelected: { backgroundColor: `${T.copper}18` },
  trTotal: { backgroundColor: T.alt, borderBottomWidth: 0, borderTopWidth: 1, borderTopColor: T.border },
  td: { paddingHorizontal: 10, paddingVertical: 8, justifyContent: 'center', minWidth: 0 },
  tdFirst: { paddingLeft: 14 },
  tdRight: { alignItems: 'flex-end' },
  tdText: { fontFamily: FONT, fontSize: 12.5, fontWeight: '600', color: T.ink },
  tdTextFirst: { fontWeight: '800', color: T.nav },
  tdTextTotal: { fontWeight: '900' },
  tableEmpty: { paddingVertical: 22, alignItems: 'center' },
  tableEmptyText: { fontFamily: FONT, fontSize: 12.5, fontWeight: '600', color: T.muted, textAlign: 'center', paddingVertical: 8 },

  effPill: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 2 },
  effText: { fontFamily: FONT, fontSize: 12, fontWeight: '800' },

  // picker
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 46,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderBottomWidth: 1,
    borderBottomColor: T.hair,
  },
  optionOn: { backgroundColor: `${T.copper}12` },
  optionText: { flex: 1, fontFamily: FONT, fontSize: 14, fontWeight: '700', color: T.ink },

  footer: { fontFamily: FONT, fontSize: 10.5, lineHeight: 15, fontWeight: '600', color: T.muted, textAlign: 'center', marginTop: 2 },
});
