// FILE: src/components/QuarterSummaryNEW/index.tsx
// NEW ERP — Quarter Summary (quarter-wise dispatch summary). Replaces the legacy screen.
// Legacy source : components/QuarterWiseDispatch/QuarterSummaryScreen.tsx
//                 + common/API/quarterSummaryApi.tsx
// Legacy route  : app/(tabs)/QuarterWiseDispatch.tsx (passed token + apiBase = API host)
//
// Endpoint (see ./api.ts — host = `API` prop, Bearer = `token` prop):
//   POST /api/quarter-summary  { fy, quarter, type, unit, prp_code, str_code, party_code }
//     state sources : fy (default '2026-2027'), quarter ('Q1'), type ('ALL'), unit ('KG'),
//                     prp_code 'SK' (fixed), str_code '5' (fixed), party_code '' (party state)
//     re-fetched on : mount and every change of fy / quarter / type / unit / party (as legacy)
//     response paths: data.summary.{orders,actual_dispatch,pending_dispatch,closed_pending}.{count,qty},
//                     data.summary.{dispatch_percent,otd_percent,delay_percent},
//                     data.dispatch_performance.{on_time,delay}.{count,qty,percent},
//                     data.same_quarter_dispatch.{count,qty,on_time_count,on_time_qty,delay_count,delay_qty},
//                     data.previous_quarter_dispatch.{count,qty}, data.quarter.label,
//                     data.monthly_summary[] (month_no/month_name/orders.qty/dispatch.qty/total_pending.qty + aliases),
//                     data.parties[] (only feeds the party picker list)
// AsyncStorage keys : none (legacy read `access_token` inside the API helper — now the `token` prop).
// Alerts            : none in legacy. Errors show inline:
//                     err.response.data.message || err.message || 'Unable to load quarter dashboard' + Retry.
//
// Calculations kept exactly:
//   pendingQty     = Number(summary.pending_dispatch.qty || max(0, orderQty - dispatchQty))
//   pendingPercent = orderQty > 0 ? pendingQty / orderQty * 100 : 0
//   overview bar   = three flex parts: max(dispatch%,1), max(dispatch%,1), max(pending%,1)   (legacy uses
//                    dispatch% for BOTH the first and second part — kept as is)
//   donut segments = dispatched / pending / closed pending, centre = total order qty
//   numbers en-IN with max 3 decimals, percentages toFixed(2)
//
// Deliberate deviations (presentation only):
//   * No own header / back button / SafeAreaView / StatusBar (global AppHeader). The legacy header subtitle
//     "FY x · SK · Store 5" and its calendar icon (both opened the FY picker) are one in-screen FY field.
//   * FY picker is a kit Sheet instead of a full-screen Modal; selecting a year closes it (as legacy).
//   * A refresh icon button was added next to the FY field because pull-to-refresh does not exist on web;
//     it runs the same silent refresh as the legacy RefreshControl.
//   * Legacy code that is commented out or unreachable is not ported: Carry Forward card, Top 5 Parties,
//     monthly bar chart, party / unit dropdown buttons, FilterSheet (its open button is commented out).
//     `unit` and `party` state, their request keys and their picker branches are kept, so they behave
//     exactly as legacy (always 'KG' and '' because legacy has no reachable control for them).
import { S, T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { useEffect, useMemo, useState } from 'react';
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
import { Btn, IconBtn, Segment, Sheet } from '../erpUi';
import { getQuarterSummary } from './api';
import { DonutChart, Gauge } from './charts';
import {
  buildYearOptions,
  fmt,
  fmtCompact,
  getDispatchQty,
  getMonthName,
  getMonthNo,
  getOrderQty,
  getPendingQty,
  getPickerTitle,
  pct,
  quarters,
  typeLabel,
  types,
  units,
} from './model';

type Props = { token: string; API: string; username?: string };

// Legacy palette -> NEW theme tokens.
const C = {
  order: T.blue, // legacy blue
  dispatch: T.green, // legacy green
  pending: T.amber, // legacy orange
  delay: T.red, // legacy red
  otd: T.purple, // legacy purple
  accent: T.yd, // legacy teal
};
const soft = (c: string) => `${c}14`;

const TYPE_OPTS = types.map((t) => ({ value: t, label: typeLabel(t) }));

export default function QuarterSummaryNEW({ token, API }: Props) {
  const { width } = useWindowDimensions();
  const isPhone = width < 768;
  const isNarrow = width < 520;

  const [fy, setFy] = useState('2026-2027');
  const [quarter, setQuarter] = useState('Q1');
  const [type, setType] = useState('ALL');
  const [unit, setUnit] = useState('KG');
  const [prpCode] = useState('SK');
  const [strCode] = useState('5');
  const [party, setParty] = useState('');

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const [pickerType, setPickerType] = useState('');
  const [yearOptions, setYearOptions] = useState<string[]>([]);

  useEffect(() => {
    setYearOptions(buildYearOptions());
  }, []);

  const loadData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setError('');

      const res = await getQuarterSummary(API, token, {
        fy,
        quarter,
        type,
        unit,
        prp_code: prpCode,
        str_code: strCode,
        party_code: party,
      });

      setData(res);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Unable to load quarter dashboard');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fy, quarter, type, unit, party]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData(true);
  };

  const summary = data?.summary || {};
  const performance = data?.dispatch_performance || {};
  const same = data?.same_quarter_dispatch || {};
  const prevDispatch = data?.previous_quarter_dispatch || {};
  const monthly: any[] = data?.monthly_summary || [];
  const parties: any[] = data?.parties || [];

  const orderQty = Number(summary.orders?.qty || 0);
  const dispatchQty = Number(summary.actual_dispatch?.qty || 0);
  const pendingQty = Number(summary.pending_dispatch?.qty || Math.max(0, orderQty - dispatchQty));

  const dispatchPercent = Number(summary.dispatch_percent || 0);
  const pendingPercent = orderQty > 0 ? (pendingQty / orderQty) * 100 : 0;
  const closedQty = Number(summary.closed_pending?.qty || 0);

  const pickerData = useMemo<string[]>(() => {
    if (pickerType === 'fy') return yearOptions;
    if (pickerType === 'unit') return units;
    if (pickerType === 'party') {
      const p = parties.map(
        (x) => x.PartyName || x.party_name || x.AccName || x.name || x.ParCode || x.code,
      );
      return ['All Parties', ...p];
    }
    return [];
  }, [pickerType, yearOptions, parties]);

  const onPick = (value: string) => {
    if (pickerType === 'fy') setFy(value);
    if (pickerType === 'unit') setUnit(value);
    if (pickerType === 'party') setParty(value === 'All Parties' ? '' : value);
    setPickerType('');
  };

  const pickerCurrent = pickerType === 'fy' ? fy : pickerType === 'unit' ? unit : party || 'All Parties';

  return (
    <View style={{ flex: 1, backgroundColor: T.bg }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[st.content, { paddingHorizontal: isPhone ? 12 : 16 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[T.copper]} tintColor={T.copper} />
        }
      >
        {/* FY (legacy header subtitle + calendar icon) */}
        <View style={st.topRow}>
          <TouchableOpacity
            activeOpacity={0.8}
            style={st.fyField}
            onPress={() => setPickerType('fy')}
            accessibilityRole="button"
            accessibilityLabel="Select Financial Year"
          >
            <View style={st.fyIcon}>
              <Icon name="calendar-today" size={17} color={T.copper} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={st.eyebrow}>Financial Year</Text>
              <Text numberOfLines={1} style={st.fyText}>
                FY {fy}  ·  {prpCode}  ·  Store {strCode}
              </Text>
            </View>
            <Icon name="keyboard-arrow-down" size={22} color={T.muted} />
          </TouchableOpacity>
          <IconBtn icon="refresh" label="Refresh" onPress={onRefresh} loading={refreshing} />
        </View>

        {/* Quarter tabs */}
        <View style={st.quarterTabs}>
          {quarters.map((q) => {
            const on = quarter === q.key;
            return (
              <TouchableOpacity
                key={q.key}
                activeOpacity={0.8}
                style={[st.qTab, on && st.qTabActive]}
                onPress={() => setQuarter(q.key)}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
              >
                <Text numberOfLines={1} style={[st.qTabTitle, on && st.onText]}>
                  {q.key}
                </Text>
                <Text numberOfLines={1} style={[st.qTabLabel, on && st.onText]}>
                  {q.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Type filter */}
        <View style={st.typeRow}>
          <Segment value={type} options={TYPE_OPTS} onChange={setType} />
        </View>

        {loading && (
          <View style={st.loaderBox}>
            <ActivityIndicator size="large" color={T.copper} />
            <Text style={st.loaderText}>Loading enterprise dashboard...</Text>
          </View>
        )}

        {!!error && !loading && (
          <View style={st.errorBox}>
            <Icon name="error-outline" size={28} color={T.red} />
            <Text style={st.errorText}>{error}</Text>
            <Btn label="Retry" icon="refresh" onPress={() => loadData()} style={{ marginTop: 12 }} />
          </View>
        )}

        {!loading && !error && data && (
          <>
            <View style={st.kpiGrid}>
              <KpiCard
                icon="assignment"
                title="Total Orders"
                count={summary.orders?.count}
                value={fmtCompact(orderQty, ` ${unit}`)}
                color={C.order}
                isPhone={isPhone}
              />
              <KpiCard
                icon="local-shipping"
                title="Actual Dispatch"
                count={summary.actual_dispatch?.count}
                value={fmtCompact(dispatchQty, ` ${unit}`)}
                color={C.dispatch}
                isPhone={isPhone}
              />
              <KpiCard
                icon="hourglass-empty"
                title="Pending Dispatch"
                count={summary.pending_dispatch?.count}
                value={fmtCompact(pendingQty, ` ${unit}`)}
                color={C.pending}
                isPhone={isPhone}
              />
              <KpiCard
                icon="track-changes"
                title="OTD (On Time)"
                count=""
                value={pct(summary.otd_percent)}
                color={C.otd}
                isPhone={isPhone}
              />
            </View>

            <Panel title="Order → Dispatch → Pending Overview" subTitle="(By Qty)">
              <View style={st.overviewRow}>
                <OverviewMetric value={fmtCompact(orderQty, ` ${unit}`)} label="Total Order" color={C.order} />
                <OverviewMetric
                  value={fmtCompact(dispatchQty, ` ${unit}`)}
                  label="Dispatched"
                  percent={dispatchPercent}
                  color={C.dispatch}
                />
                <OverviewMetric
                  value={fmtCompact(pendingQty, ` ${unit}`)}
                  label="Pending"
                  percent={pendingPercent}
                  color={C.pending}
                />
              </View>

              <View style={st.progressTrack}>
                <View style={{ backgroundColor: C.order, flex: Math.max(dispatchPercent, 1) }} />
                <View style={{ backgroundColor: C.dispatch, flex: Math.max(dispatchPercent, 1) }} />
                <View style={{ backgroundColor: C.pending, flex: Math.max(pendingPercent, 1) }} />
              </View>
            </Panel>

            <Panel title="Dispatch Performance">
              <View style={[st.performanceRow, isNarrow && { flexDirection: 'column' }]}>
                <PerformanceCard
                  title="On Time Dispatch"
                  icon="trending-up"
                  count={performance.on_time?.count}
                  qty={performance.on_time?.qty}
                  percent={performance.on_time?.percent}
                  unit={unit}
                  color={C.dispatch}
                  smallLabel="On Time %"
                  stacked={isNarrow}
                />
                <PerformanceCard
                  title="Delay Dispatch"
                  icon="trending-up"
                  count={performance.delay?.count}
                  qty={performance.delay?.qty}
                  percent={performance.delay?.percent}
                  unit={unit}
                  color={C.delay}
                  smallLabel="Delay %"
                  stacked={isNarrow}
                />
              </View>
            </Panel>

            <Panel title={`Same Quarter Dispatch (${data?.quarter?.label || quarter})`}>
              <View style={st.sameKpiRow}>
                <MiniCard
                  icon="local-shipping"
                  title="Total Dispatch"
                  count={same.count}
                  value={fmtCompact(same.qty, ` ${unit}`)}
                  color={C.order}
                  compact={isPhone}
                />
                <MiniCard
                  icon="check-circle"
                  title="On Time"
                  count={same.on_time_count}
                  value={fmtCompact(same.on_time_qty, ` ${unit}`)}
                  percent={summary.otd_percent}
                  color={C.dispatch}
                  compact={isPhone}
                />
                <MiniCard
                  icon="access-time"
                  title="Delay"
                  count={same.delay_count}
                  value={fmtCompact(same.delay_qty, ` ${unit}`)}
                  percent={summary.delay_percent}
                  color={C.delay}
                  compact={isPhone}
                />
                <MiniCard
                  icon="track-changes"
                  title="OTD %"
                  count=""
                  value={pct(summary.otd_percent)}
                  color={C.otd}
                  compact={isPhone}
                />
              </View>
            </Panel>

            <View style={[st.chartRow, isPhone && { flexDirection: 'column' }]}>
              <Panel title="Previous Quarter Dispatch" style={!isPhone && st.half}>
                <View style={st.previousBox}>
                  <View style={st.previousIcon}>
                    <Icon name="receipt-long" size={26} color={C.accent} />
                  </View>
                  <Text numberOfLines={1} adjustsFontSizeToFit style={st.previousCount}>
                    {fmt(prevDispatch.count)}
                  </Text>
                  <Text numberOfLines={1} adjustsFontSizeToFit style={st.previousQty}>
                    {fmtCompact(prevDispatch.qty, ` ${unit}`)}
                  </Text>
                  <Text style={st.previousLabel}>Orders Dispatched</Text>
                </View>
              </Panel>

              <Panel title="Order Status (By Qty)" style={!isPhone && st.half}>
                <View style={st.statusChartWrap}>
                  <DonutChart
                    total={orderQty}
                    unit={unit}
                    segments={[
                      { value: dispatchQty, color: C.order },
                      { value: pendingQty, color: C.pending },
                      { value: closedQty, color: C.dispatch },
                    ]}
                  />

                  <View style={st.statusLegend}>
                    <Legend color={C.order} text="Dispatched" value={fmtCompact(dispatchQty, ` ${unit}`)} />
                    <Legend color={C.pending} text="Pending" value={fmtCompact(pendingQty, ` ${unit}`)} />
                    <Legend color={C.dispatch} text="Closed Pending" value={fmtCompact(closedQty, ` ${unit}`)} />
                  </View>
                </View>
              </Panel>
            </View>

            <Panel title={`Monthly Order vs Dispatch (${unit})`}>
              {monthly.length === 0 ? (
                <Text style={st.emptyText}>No monthly data</Text>
              ) : (
                <View style={st.monthlyTable}>
                  <View style={st.monthlyHeaderRow}>
                    <Text style={[st.monthlyHeadText, st.monthCol, { textAlign: 'left' }]}>Month</Text>
                    <Text style={st.monthlyHeadText}>Order</Text>
                    <Text style={st.monthlyHeadText}>Dispatch</Text>
                    <Text style={st.monthlyHeadText}>Pending</Text>
                  </View>

                  {monthly.map((m, i) => (
                    <View key={`${getMonthNo(m)}-${i}`} style={[st.monthlyRow, i % 2 === 1 && { backgroundColor: T.sub }]}>
                      <View style={st.monthCol}>
                        <Text numberOfLines={1} style={st.monthName}>
                          {String(getMonthName(m)).slice(0, 3)}
                        </Text>
                      </View>

                      <MonthQty value={fmtCompact(getOrderQty(m))} unit={unit} color={C.order} />
                      <MonthQty value={fmtCompact(getDispatchQty(m))} unit={unit} color={C.dispatch} />
                      <MonthQty value={fmtCompact(getPendingQty(m))} unit={unit} color={C.pending} />
                    </View>
                  ))}
                </View>
              )}
            </Panel>
          </>
        )}
      </ScrollView>

      <Sheet open={!!pickerType} onClose={() => setPickerType('')} title={getPickerTitle(pickerType)} wideMax={420}>
        <View style={st.pickList}>
          {pickerData.map((item, index) => {
            const on = item === pickerCurrent;
            return (
              <TouchableOpacity
                key={`${item}-${index}`}
                style={[st.pickItem, on && st.pickItemOn]}
                onPress={() => onPick(item)}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
              >
                <Text numberOfLines={1} style={[st.pickItemText, on && { color: T.copper }]}>
                  {item}
                </Text>
                {on ? <Icon name="check" size={18} color={T.copper} /> : null}
              </TouchableOpacity>
            );
          })}
        </View>
      </Sheet>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Pieces                                                              */
/* ------------------------------------------------------------------ */

function Panel({
  title,
  subTitle,
  children,
  style,
}: {
  title: string;
  subTitle?: string;
  children: React.ReactNode;
  style?: any;
}) {
  return (
    <View style={[st.card, style]}>
      <Text numberOfLines={2} style={st.cardTitle}>
        {title}{' '}
        {subTitle ? <Text style={st.cardSubTitle}>{subTitle}</Text> : null}
      </Text>
      {children}
    </View>
  );
}

function KpiCard({
  icon,
  title,
  count,
  value,
  color,
  isPhone,
}: {
  icon: string;
  title: string;
  count: any;
  value: string;
  color: string;
  isPhone: boolean;
}) {
  return (
    <View style={[st.kpiCell, isPhone ? { width: '50%' } : { flex: 1 }]}>
      <View style={st.kpiCard}>
        <View style={st.kpiHead}>
          <View style={[st.kpiIcon, { backgroundColor: soft(color) }]}>
            <Icon name={icon as any} size={18} color={color} />
          </View>
          <Text numberOfLines={2} style={st.kpiTitle}>
            {title}
          </Text>
        </View>

        {!!String(count || '') && (
          <Text numberOfLines={1} adjustsFontSizeToFit style={st.kpiCount}>
            {fmt(count)}
          </Text>
        )}

        <Text numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.55} style={[st.kpiValue, { color }]}>
          {value}
        </Text>
      </View>
    </View>
  );
}

function OverviewMetric({
  value,
  label,
  percent,
  color,
}: {
  value: string;
  label: string;
  percent?: number;
  color: string;
}) {
  return (
    <View style={st.overviewMetric}>
      <Text numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.45} style={[st.overviewValue, { color }]}>
        {value}
      </Text>

      <Text numberOfLines={1} style={st.overviewLabel}>
        {label}
      </Text>

      {percent !== undefined && (
        <Text numberOfLines={1} style={[st.overviewPercent, { color }]}>
          ({pct(percent)})
        </Text>
      )}
    </View>
  );
}

function PerformanceCard({
  title,
  icon,
  count,
  qty,
  percent,
  unit,
  color,
  smallLabel,
  stacked,
}: {
  title: string;
  icon: string;
  count: any;
  qty: any;
  percent: any;
  unit: string;
  color: string;
  smallLabel: string;
  stacked: boolean;
}) {
  return (
    <View style={[st.performanceCard, !stacked && { flex: 1 }, { backgroundColor: soft(color), borderColor: `${color}30` }]}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={st.performanceTitleRow}>
          <Text numberOfLines={2} style={st.performanceTitle}>
            {title}
          </Text>
          <Icon name={icon as any} size={20} color={color} />
        </View>

        <Text numberOfLines={1} adjustsFontSizeToFit style={st.performanceCount}>
          {fmt(count)}
        </Text>

        <Text numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.55} style={[st.performanceQty, { color }]}>
          {fmtCompact(qty, ` ${unit}`)}
        </Text>

        <Text style={st.performancePercent}>{pct(percent)}</Text>
        <Text style={st.performanceSmallLabel}>{smallLabel}</Text>
      </View>

      <Gauge percent={percent} color={color} />
    </View>
  );
}

function MiniCard({
  icon,
  title,
  count,
  value,
  percent,
  color,
  compact,
}: {
  icon: string;
  title: string;
  count: any;
  value: string;
  percent?: any;
  color: string;
  compact: boolean;
}) {
  return (
    <View style={[st.miniCell, compact ? { width: '50%' } : { flex: 1 }]}>
      <View style={[st.miniCard, { backgroundColor: soft(color) }]}>
        <Icon name={icon as any} size={22} color={color} />

        <Text numberOfLines={2} style={st.miniTitle}>
          {title}
        </Text>

        {!!String(count || '') && (
          <Text numberOfLines={1} adjustsFontSizeToFit style={st.miniCount}>
            {fmt(count)}
          </Text>
        )}

        <Text numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.55} style={[st.miniValue, { color }]}>
          {value}
        </Text>

        {percent !== undefined && (
          <Text numberOfLines={1} style={[st.miniPercent, { color }]}>
            {pct(percent)}
          </Text>
        )}
      </View>
    </View>
  );
}

function Legend({ color, text, value }: { color: string; text: string; value: string }) {
  return (
    <View style={st.legendBlock}>
      <View style={st.legendItem}>
        <View style={[st.legendDot, { backgroundColor: color }]} />
        <Text numberOfLines={1} style={st.legendText}>
          {text}
        </Text>
      </View>
      <Text numberOfLines={1} adjustsFontSizeToFit style={st.legendValue}>
        {value}
      </Text>
    </View>
  );
}

function MonthQty({ value, unit, color }: { value: string; unit: string; color: string }) {
  return (
    <View style={st.monthQtyBox}>
      <Text numberOfLines={1} adjustsFontSizeToFit style={[st.monthQty, { color }]}>
        {value}
      </Text>
      <Text style={st.monthUnit}>{unit}</Text>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Styles                                                              */
/* ------------------------------------------------------------------ */

const st = StyleSheet.create({
  content: {
    paddingTop: 12,
    paddingBottom: 28,
    width: '100%',
    maxWidth: 1200,
    alignSelf: 'center',
    gap: 12,
  },

  topRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  fyField: {
    flex: 1,
    minWidth: 0,
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  fyIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: `${T.copper}16`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyebrow: { fontSize: 10, fontWeight: '800', color: T.muted, letterSpacing: 0.5, textTransform: 'uppercase' },
  fyText: { fontSize: 14, fontWeight: '800', color: T.ink, marginTop: 1 },

  quarterTabs: {
    flexDirection: 'row',
    gap: 4,
    padding: 4,
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 14,
    ...S.card,
  },
  qTab: {
    flex: 1,
    minWidth: 0,
    minHeight: 56,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qTabActive: { backgroundColor: T.copper },
  qTabTitle: { color: T.ink, fontSize: 17, fontWeight: '900' },
  qTabLabel: { color: T.muted, fontSize: 11.5, fontWeight: '700', marginTop: 2 },
  onText: { color: '#fff' },

  typeRow: { width: '100%', maxWidth: 460 },

  loaderBox: { padding: 44, alignItems: 'center' },
  loaderText: { color: T.muted, marginTop: 10, fontWeight: '700', fontSize: 12.5 },

  errorBox: {
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: `${T.red}40`,
    borderRadius: 14,
    padding: 18,
    alignItems: 'center',
  },
  errorText: { color: T.red, textAlign: 'center', marginTop: 8, fontWeight: '700', fontSize: 13 },

  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', margin: -5 },
  kpiCell: { padding: 5 },
  kpiCard: {
    flexGrow: 1,
    minHeight: 118,
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 14,
    padding: 12,
    ...S.card,
  },
  kpiHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  kpiIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  kpiTitle: { flex: 1, minWidth: 0, color: T.muted, fontSize: 11.5, fontWeight: '800', letterSpacing: 0.2 },
  kpiCount: { color: T.ink, fontSize: 21, fontWeight: '900' },
  kpiValue: { fontSize: 15.5, fontWeight: '900', marginTop: 2 },

  card: {
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 14,
    padding: 14,
    ...S.card,
  },
  half: { flex: 1, minWidth: 0 },
  cardTitle: { color: T.ink, fontSize: 14.5, fontWeight: '900', marginBottom: 12 },
  cardSubTitle: { color: T.muted, fontSize: 11, fontWeight: '800' },

  overviewRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  overviewMetric: { width: '32%', alignItems: 'center', paddingHorizontal: 3 },
  overviewValue: { fontSize: 15, fontWeight: '900', textAlign: 'center' },
  overviewLabel: { color: T.muted, fontSize: 11, fontWeight: '800', marginTop: 5, textAlign: 'center' },
  overviewPercent: { fontSize: 11, fontWeight: '900', marginTop: 3, textAlign: 'center' },

  progressTrack: {
    height: 20,
    borderRadius: 20,
    overflow: 'hidden',
    flexDirection: 'row',
    backgroundColor: T.border,
    marginTop: 16,
  },

  performanceRow: { flexDirection: 'row', gap: 10 },
  performanceCard: {
    minWidth: 0,
    minHeight: 140,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    gap: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  performanceTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6 },
  performanceTitle: { color: T.ink, fontSize: 12, fontWeight: '900', flex: 1, minWidth: 0 },
  performanceCount: { color: T.ink, fontSize: 25, fontWeight: '900', marginTop: 8 },
  performanceQty: { fontSize: 13.5, fontWeight: '900', marginTop: 4 },
  performancePercent: { color: T.ink, fontSize: 12.5, fontWeight: '900', marginTop: 8 },
  performanceSmallLabel: { color: T.muted, fontSize: 10.5, fontWeight: '700', marginTop: 2 },

  sameKpiRow: { flexDirection: 'row', flexWrap: 'wrap', margin: -4 },
  miniCell: { padding: 4 },
  miniCard: { flexGrow: 1, minHeight: 112, borderRadius: 12, padding: 10, alignItems: 'center' },
  miniTitle: { color: T.ink, fontSize: 11, fontWeight: '800', textAlign: 'center', marginTop: 4 },
  miniCount: { color: T.ink, fontSize: 18, fontWeight: '900', marginTop: 4 },
  miniValue: { fontSize: 11.5, fontWeight: '900', textAlign: 'center', marginTop: 2 },
  miniPercent: { fontSize: 11, fontWeight: '900', marginTop: 2 },

  chartRow: { flexDirection: 'row', gap: 12, alignItems: 'stretch' },

  previousBox: { alignItems: 'center', justifyContent: 'center', paddingVertical: 6 },
  previousIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: `${T.yd}16`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  previousCount: { color: T.yd, fontSize: 24, fontWeight: '900' },
  previousQty: { color: T.yd, fontSize: 13.5, fontWeight: '900', marginTop: 3 },
  previousLabel: { color: T.muted, fontSize: 11, fontWeight: '700', textAlign: 'center', marginTop: 6 },

  statusChartWrap: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  statusLegend: { flex: 1, minWidth: 0, gap: 8 },
  legendBlock: { minWidth: 0 },
  legendItem: { flexDirection: 'row', alignItems: 'center' },
  legendDot: { width: 9, height: 9, borderRadius: 5, marginRight: 6 },
  legendText: { flex: 1, minWidth: 0, color: T.muted, fontSize: 11, fontWeight: '800' },
  legendValue: { color: T.ink, fontSize: 12.5, fontWeight: '900', marginLeft: 15, marginTop: 1 },

  emptyText: { color: T.muted, fontWeight: '800', textAlign: 'center', marginVertical: 36, fontSize: 12 },

  monthlyTable: { borderWidth: 1, borderColor: T.border, borderRadius: 12, overflow: 'hidden' },
  monthlyHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: T.alt,
    paddingVertical: 9,
    paddingHorizontal: 10,
  },
  monthlyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: T.surface,
    borderTopWidth: 1,
    borderTopColor: T.hair,
    paddingVertical: 9,
    paddingHorizontal: 10,
  },
  monthCol: { flex: 0, width: 56 },
  monthlyHeadText: {
    flex: 1,
    color: T.muted,
    fontSize: 10.5,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  monthName: { color: T.ink, fontSize: 13, fontWeight: '900' },
  monthQtyBox: { flex: 1, minWidth: 0, alignItems: 'center' },
  monthQty: { fontSize: 12.5, fontWeight: '900', textAlign: 'center' },
  monthUnit: { color: T.muted, fontSize: 9.5, fontWeight: '800', marginTop: 1 },

  pickList: { borderWidth: 1, borderColor: T.border, borderRadius: 12, overflow: 'hidden' },
  pickItem: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingHorizontal: 14,
    backgroundColor: T.surface,
    borderBottomWidth: 1,
    borderBottomColor: T.hair,
  },
  pickItemOn: { backgroundColor: `${T.copper}10` },
  pickItemText: { flex: 1, minWidth: 0, color: T.ink, fontSize: 14.5, fontWeight: '800' },
});
