import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
// import Icon from 'react-native-vector-icons/MaterialIcons';
import Icon from '@expo/vector-icons/MaterialIcons';
import Svg, { Circle, G } from 'react-native-svg';
// import { getQuarterSummary } from '../../common/API/quarterSummaryApi';
import { getQuarterSummary } from '@/common/API/quarterSummaryApi';
import { useNavigation } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';


const { width: SCREEN_WIDTH } = Dimensions.get('window');

const BASE_WIDTH = 430;
const SCREEN_PADDING = 14;
const DASHBOARD_WIDTH = SCREEN_WIDTH - SCREEN_PADDING * 2;
const SCALE = DASHBOARD_WIDTH / BASE_WIDTH;
const s = value => Math.round(value * SCALE);

const COLORS = {
  bg: '#F6F8FC',
  card: '#FFFFFF',
  teal: '#00838F',
  tealDark: '#006F78',
  orange: '#FF7A00',
  blue: '#2563EB',
  green: '#16A34A',
  red: '#DC2626',
  purple: '#7C3AED',
  text: '#0F172A',
  muted: '#64748B',
  border: '#E5E7EB',
  softBlue: '#EFF6FF',
  softGreen: '#ECFDF5',
  softRed: '#FEF2F2',
  softOrange: '#FFF7ED',
  softPurple: '#F5F3FF',
};

const quarters = [
  { key: 'Q1', label: 'Apr - Jun' },
  { key: 'Q2', label: 'Jul - Sep' },
  { key: 'Q3', label: 'Oct - Dec' },
  { key: 'Q4', label: 'Jan - Mar' },
];

const types = ['ALL', 'GREIGE', 'DYED'];
const units = ['KG', 'PCS'];

const fmt = (value, suffix = '') =>
  `${Number(value || 0).toLocaleString('en-IN', {
    maximumFractionDigits: 3,
  })}${suffix}`;

const fmtCompact = (value, suffix = '') => {
  const n = Number(value || 0);
  return `${n.toLocaleString('en-IN', { maximumFractionDigits: 3 })}${suffix}`;
};

const pct = value => `${Number(value || 0).toFixed(2)}%`;
const getMonthNo = m => m.month_no ?? m.MonthNo ?? m.MonthNO ?? 0;

const getMonthName = m =>
  m.month_name || m.MonthName || m.month || m.Month || '';

const getOrderQty = m =>
  Number(m?.orders?.qty ?? m?.OrderQty ?? m?.order_qty ?? 0);

const getDispatchQty = m =>
  Number(m?.dispatch?.qty ?? m?.DispatchQty ?? m?.dispatch_qty ?? 0);

const getPendingQty = m =>
  Number(
    m?.total_pending?.qty ??
    m?.pending?.qty ??
    m?.TotalPendingQty ??
    m?.pending_qty ??
    0
  );

export default function QuarterSummaryScreen() {
  const [fy, setFy] = useState('2026-2027');
  const [quarter, setQuarter] = useState('Q1');
  const [type, setType] = useState('ALL');
  const [unit, setUnit] = useState('KG');
  const [prpCode] = useState('SK');
  const [strCode] = useState('5');
  const [party, setParty] = useState('');

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const [pickerType, setPickerType] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [yearOptions, setYearOptions] = useState([]);

  const navigation = useNavigation();
  const router = useRouter();

  useEffect(() => {
    const y = new Date().getFullYear();
    const years = [];
    for (let i = 0; i < 6; i++) {
      years.push(`${y - i}-${y - i + 1}`);
    }
    setYearOptions(years);
  }, []);

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  const loadData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setError('');

      const res = await getQuarterSummary({
        fy,
        quarter,
        type,
        unit,
        prp_code: prpCode,
        str_code: strCode,
        party_code: party,
      });

      console.log("strCode:", strCode);
      setData(res);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
        err?.message ||
        'Unable to load quarter dashboard',
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [fy, quarter, type, unit, party]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData(true);
  };

  const summary = data?.summary || {};
  const performance = data?.dispatch_performance || {};
  const carry = data?.carry_forward || {};
  const same = data?.same_quarter_dispatch || {};
  const prevDispatch = data?.previous_quarter_dispatch || {};
  const monthly = data?.monthly_summary || [];
  const topParties = data?.top_parties || [];
  const parties = data?.parties || [];

  const orderQty = Number(summary.orders?.qty || 0);
  const dispatchQty = Number(summary.actual_dispatch?.qty || 0);
  const pendingQty = Number(
    summary.pending_dispatch?.qty || Math.max(0, orderQty - dispatchQty),
  );

  const dispatchPercent = Number(summary.dispatch_percent || 0);
  const pendingPercent = orderQty > 0 ? (pendingQty / orderQty) * 100 : 0;
  const closedQty = Number(summary.closed_pending?.qty || 0);

  const monthlyChartMax = useMemo(() => {
    let max = 0;

    monthly.forEach(m => {
      max = Math.max(
        max,
        Number(m?.orders?.qty || 0),
        Number(m?.dispatch?.qty || 0),
      );
    });

    if (max <= 0) return 50000;

    return Math.ceil(max / 10000) * 10000;
  }, [monthly]);

  const monthlyTicks = useMemo(() => {
    const step = monthlyChartMax / 4;
    return [
      monthlyChartMax,
      step * 3,
      step * 2,
      step,
      0,
    ];
  }, [monthlyChartMax]);

  const pickerData = useMemo(() => {
    if (pickerType === 'fy') return yearOptions;
    if (pickerType === 'unit') return units;
    if (pickerType === 'party') {
      const p = parties.map(
        x =>
          x.PartyName ||
          x.party_name ||
          x.AccName ||
          x.name ||
          x.ParCode ||
          x.code,
      );
      return ['All Parties', ...p];
    }
    return [];
  }, [pickerType, yearOptions, parties]);

  return (
    <>
      {/* <SafeAreaView style={styles.safe}> */}
      <SafeAreaView edges={['top']} style={{ flex: 0, backgroundColor: COLORS.teal }}
      />
      <StatusBar style="light" backgroundColor={COLORS.teal} />
      <View style={styles.header}>
        {/* <TouchableOpacity hitSlop={12}>
          <Icon name="menu" size={s(30)} color="#fff" />
        </TouchableOpacity> */}
        <TouchableOpacity onPress={() => goBack()}>
          <Icon name="arrow-back-ios-new" size={20} color="#fff" />
        </TouchableOpacity>

        <View style={styles.headerTextBox}>
          <Text numberOfLines={1} style={styles.headerTitle}>
            Quarter Summary
          </Text>

          <TouchableOpacity
            activeOpacity={0.75}
            style={styles.headerSubRow}
            onPress={() => setPickerType('fy')}
          >
            <Text numberOfLines={1} style={styles.headerSub}>
              FY {fy}  ·  {prpCode}  ·  Store {strCode}
            </Text>
            {/* <Icon name="keyboard-arrow-down" size={s(17)} color="#fff" /> */}
          </TouchableOpacity>
        </View>

        {/* <TouchableOpacity onPress={() => setFilterOpen(true)} hitSlop={12}>
          <Icon name="filter-list" size={s(29)} color="#fff" />
        </TouchableOpacity> */}

        <TouchableOpacity onPress={() => setPickerType('fy')} hitSlop={12}>
          <Icon name="calendar-today" size={s(25)} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.teal]}
          />
        }
      >
        <View style={styles.quarterTabs}>
          {quarters.map(q => (
            <TouchableOpacity
              key={q.key}
              activeOpacity={0.8}
              style={[styles.qTab, quarter === q.key && styles.qTabActive]}
              onPress={() => setQuarter(q.key)}
            >
              <Text
                numberOfLines={1}
                style={[
                  styles.qTabTitle,
                  quarter === q.key && styles.qTabTextActive,
                ]}
              >
                {q.key}
              </Text>
              <Text
                numberOfLines={1}
                style={[
                  styles.qTabLabel,
                  quarter === q.key && styles.qTabTextActive,
                ]}
              >
                {q.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.filterRow}>
          {/* <TouchableOpacity
            activeOpacity={0.8}
            style={styles.partyButton}
            onPress={() => setPickerType('party')}
          >
            <Text numberOfLines={1} style={styles.filterButtonText}>
              {party || 'All Parties'}
            </Text>
            <Icon name="keyboard-arrow-down" size={s(18)} color={COLORS.text} />
          </TouchableOpacity> */}

          <View style={styles.typeSegment}>
            {types.map(t => (
              <TouchableOpacity
                key={t}
                activeOpacity={0.8}
                style={[
                  styles.typeButton,
                  type === t && styles.typeButtonActive,
                ]}
                onPress={() => setType(t)}
              >
                <Text
                  numberOfLines={1}
                  style={[
                    styles.typeText,
                    type === t && styles.typeTextActive,
                  ]}
                >
                  {t === 'ALL' ? 'All' : t[0] + t.slice(1).toLowerCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* <TouchableOpacity
            activeOpacity={0.8}
            style={styles.unitButton}
            onPress={() => setPickerType('unit')}
          >
            <Text numberOfLines={1} style={styles.filterButtonText}>
              {unit}
            </Text>
            <Icon name="keyboard-arrow-down" size={s(18)} color={COLORS.text} />
          </TouchableOpacity> */}
        </View>

        {loading && (
          <View style={styles.loaderBox}>
            <ActivityIndicator size="large" color={COLORS.teal} />
            <Text style={styles.loaderText}>Loading enterprise dashboard...</Text>
          </View>
        )}

        {!!error && !loading && (
          <View style={styles.errorBox}>
            <Icon name="error-outline" size={s(28)} color={COLORS.red} />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => loadData()}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {!loading && !error && data && (
          <>
            <View style={styles.kpiGrid}>
              <KpiCard
                icon="assignment"
                title="Total Orders"
                count={summary.orders?.count}
                value={fmtCompact(orderQty, ` ${unit}`)}
                color={COLORS.blue}
              />

              <KpiCard
                icon="local-shipping"
                title="Actual Dispatch"
                count={summary.actual_dispatch?.count}
                value={fmtCompact(dispatchQty, ` ${unit}`)}
                color={COLORS.green}
              />
            </View>

            <View style={styles.kpiGrid}>
              <KpiCard
                icon="hourglass-empty"
                title="Pending Dispatch"
                count={summary.pending_dispatch?.count}
                value={fmtCompact(pendingQty, ` ${unit}`)}
                color={COLORS.orange}
              />

              <KpiCard
                icon="track-changes"
                title="OTD (On Time)"
                count=""
                value={pct(summary.otd_percent)}
                color={COLORS.purple}
              />
            </View>

            <Card
              title="Order → Dispatch → Pending Overview"
              subTitle="(By Qty)"
            >
              <View style={styles.overviewRow}>
                <OverviewMetric
                  value={fmtCompact(orderQty, ` ${unit}`)}
                  label="Total Order"
                  color={COLORS.blue}
                />

                <OverviewMetric
                  value={fmtCompact(dispatchQty, ` ${unit}`)}
                  label="Dispatched"
                  percent={dispatchPercent}
                  color={COLORS.green}
                />

                <OverviewMetric
                  value={fmtCompact(pendingQty, ` ${unit}`)}
                  label="Pending"
                  percent={pendingPercent}
                  color={COLORS.orange}
                />
              </View>

              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressBlue,
                    { flex: Math.max(dispatchPercent, 1) },
                  ]}
                />
                <View
                  style={[
                    styles.progressGreen,
                    { flex: Math.max(dispatchPercent, 1) },
                  ]}
                />
                <View
                  style={[
                    styles.progressOrange,
                    { flex: Math.max(pendingPercent, 1) },
                  ]}
                />
              </View>
            </Card>

            <Card title="Dispatch Performance">
              <View style={styles.performanceRow}>
                <PerformanceCard
                  title="On Time Dispatch"
                  icon="trending-up"
                  count={performance.on_time?.count}
                  qty={performance.on_time?.qty}
                  percent={performance.on_time?.percent}
                  unit={unit}
                  color={COLORS.green}
                  bg={COLORS.softGreen}
                />

                <PerformanceCard
                  title="Delay Dispatch"
                  icon="trending-up"
                  count={performance.delay?.count}
                  qty={performance.delay?.qty}
                  percent={performance.delay?.percent}
                  unit={unit}
                  color={COLORS.red}
                  bg={COLORS.softRed}
                />
              </View>
            </Card>

            {/* <Card title="Carry Forward From Previous FY" titleColor={COLORS.purple}>
              <View style={styles.carryRow}>
                <CarryMetric
                  icon="description"
                  label="Carry Forward Qty"
                  value={fmtCompact(carry.order_qty, ` ${unit}`)}
                  color={COLORS.purple}
                />

                <CarryMetric
                  icon="local-shipping"
                  label="Carry Dispatch"
                  value={fmtCompact(carry.dispatch_qty, ` ${unit}`)}
                  color={COLORS.green}
                />

                <CarryMetric
                  icon="settings-backup-restore"
                  label="Open Pending"
                  value={fmtCompact(carry.open_pending_qty, ` ${unit}`)}
                  color={COLORS.orange}
                />

                <CarryMetric
                  icon="cancel"
                  label="Closed Pending"
                  value={fmtCompact(carry.closed_pending_qty, ` ${unit}`)}
                  color={COLORS.red}
                />
              </View>
            </Card> */}

            <View style={styles.samePrevRow}>
              <Card
                style={styles.sameQuarterCard}
                title={`Same Quarter Dispatch (${data?.quarter?.label || quarter})`}
              >
                <View style={styles.sameKpiRow}>
                  <MiniCard
                    icon="local-shipping"
                    title="Total Dispatch"
                    count={same.count}
                    value={fmtCompact(same.qty, ` ${unit}`)}
                    color={COLORS.blue}
                    bg={COLORS.softBlue}
                  />

                  <MiniCard
                    icon="check-circle"
                    title="On Time"
                    count={same.on_time_count}
                    value={fmtCompact(same.on_time_qty, ` ${unit}`)}
                    percent={summary.otd_percent}
                    color={COLORS.green}
                    bg={COLORS.softGreen}
                  />

                  <MiniCard
                    icon="access-time"
                    title="Delay"
                    count={same.delay_count}
                    value={fmtCompact(same.delay_qty, ` ${unit}`)}
                    percent={summary.delay_percent}
                    color={COLORS.red}
                    bg={COLORS.softRed}
                  />

                  <MiniCard
                    icon="track-changes"
                    title="OTD %"
                    count=""
                    value={pct(summary.otd_percent)}
                    color={COLORS.purple}
                    bg={COLORS.softPurple}
                  />
                </View>
              </Card>
            </View>

            <View style={styles.chartRow}>
              <Card style={styles.previousCard} title="Previous Quarter Dispatch">
                <View style={styles.previousBox}>
                  <View style={styles.previousIcon}>
                    <Icon name="receipt-long" size={s(27)} color={COLORS.teal} />
                  </View>
                  <Text
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    style={styles.previousCount}
                  >
                    {fmt(prevDispatch.count)}
                  </Text>
                  <Text
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    style={styles.previousQty}
                  >
                    {fmtCompact(prevDispatch.qty, ` ${unit}`)}
                  </Text>
                  <Text style={styles.previousLabel}>Orders Dispatched</Text>
                </View>
              </Card>


              <Card style={styles.chartCard} title="Order Status (By Qty)">
                <View style={styles.statusChartWrap}>
                  <DonutChart
                    total={orderQty}
                    unit={unit}
                    segments={[
                      { value: dispatchQty, color: COLORS.blue },
                      { value: pendingQty, color: COLORS.orange },
                      { value: closedQty, color: COLORS.green },
                    ]}
                  />

                  <View style={styles.statusLegend}>
                    <Legend color={COLORS.blue} text={`Dispatched`} />
                    <Text style={styles.statusLegendValue}>
                      {fmtCompact(dispatchQty, ` ${unit}`)}
                    </Text>

                    <Legend color={COLORS.orange} text={`Pending`} />
                    <Text style={styles.statusLegendValue}>
                      {fmtCompact(pendingQty, ` ${unit}`)}
                    </Text>

                    <Legend color={COLORS.green} text={`Closed Pending`} />
                    <Text style={styles.statusLegendValue}>
                      {fmtCompact(closedQty, ` ${unit}`)}
                    </Text>
                  </View>
                </View>
              </Card>
            </View>

            <View style={styles.chartRow}>
              {/* <Card style={styles.chartCard} title={`Top 5 Parties by Dispatch (${unit})`}>
                {topParties.length === 0 ? (
                  <TopPartyFallback unit={unit} />
                ) : (
                  topParties.slice(0, 5).map((p, index) => (
                    <TopPartyRow
                      key={`${index}`}
                      index={index + 1}
                      name={p.party_name || p.name || `Party ${index + 1}`}
                      qty={p.qty || 0}
                      max={topParties[0]?.qty || 1}
                      unit={unit}
                    />
                  ))
                )}
              </Card> */}
              {/* <Card style={styles.chartCard} title={`Monthly Order vs Dispatch (${unit})`}>
                <View style={styles.legendRow}>
                  <Legend color={COLORS.blue} text="Order" />
                  <Legend color={COLORS.green} text="Dispatch" />
                </View>

                <View style={styles.axisChartWrap}>
                  <View style={styles.yAxis}>
                    {monthlyTicks.map((t, i) => (
                      <Text key={i} style={styles.yAxisText}>
                        {t >= 1000 ? `${Math.round(t / 1000)}K` : t}
                      </Text>
                    ))}
                  </View>

                  <View style={styles.chartArea}>
                    {monthlyTicks.map((_, i) => (
                      <View key={i} style={styles.gridLine} />
                    ))}

                    <View style={styles.barChart}>
                      {monthly.length === 0 ? (
                        <EmptyText text="No monthly data" />
                      ) : (
                        monthly.map(m => (
                          <View key={m.month_no} style={styles.monthBarItem}>
                            <View style={styles.barPair}>
                              <View
                                style={[
                                  styles.bar,
                                  {
                                    height: barHeight(m?.orders?.qty, monthlyChartMax),
                                    backgroundColor: COLORS.blue,
                                  },
                                ]}
                              />
                              <View
                                style={[
                                  styles.bar,
                                  {
                                    height: barHeight(m?.dispatch?.qty, monthlyChartMax),
                                    backgroundColor: COLORS.green,
                                  },
                                ]}
                              />
                            </View>

                            <Text numberOfLines={1} style={styles.monthLabel}>
                              {String(m.month_name || '').slice(0, 3)}
                            </Text>
                          </View>
                        ))
                      )}
                    </View>
                  </View>
                </View>
              </Card> */}
              <Card style={styles.monthlyCard} title={`Monthly Order vs Dispatch (${unit})`}>
                {monthly.length === 0 ? (
                  <EmptyText text="No monthly data" />
                ) : (
                  <View style={styles.monthlyList}>
                    <View style={styles.monthlyHeaderRow}>
                      <Text style={[styles.monthlyHeadText, styles.monthCol]}>Month</Text>
                      <Text style={styles.monthlyHeadText}>Order</Text>
                      <Text style={styles.monthlyHeadText}>Dispatch</Text>
                      <Text style={styles.monthlyHeadText}>Pending</Text>
                    </View>

                    {monthly.map(m => (
                      <View key={getMonthNo(m)} style={styles.monthlyRow}>
                        <View style={styles.monthCol}>
                          <Text style={styles.monthName}>
                            {String(getMonthName(m)).slice(0, 3)}
                          </Text>
                        </View>

                        <View style={styles.monthQtyBox}>
                          <Text numberOfLines={1} adjustsFontSizeToFit style={[styles.monthQty, { color: COLORS.blue }]}>
                            {fmtCompact(getOrderQty(m))}
                          </Text>
                          <Text style={styles.monthUnit}>{unit}</Text>
                        </View>

                        <View style={styles.monthQtyBox}>
                          <Text numberOfLines={1} adjustsFontSizeToFit style={[styles.monthQty, { color: COLORS.green }]}>
                            {fmtCompact(getDispatchQty(m))}
                          </Text>
                          <Text style={styles.monthUnit}>{unit}</Text>
                        </View>

                        <View style={styles.monthQtyBox}>
                          <Text numberOfLines={1} adjustsFontSizeToFit style={[styles.monthQty, { color: COLORS.orange }]}>
                            {fmtCompact(getPendingQty(m))}
                          </Text>
                          <Text style={styles.monthUnit}>{unit}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </Card>
            </View>
            <View style={styles.footerSpace} />
          </>
        )}
      </ScrollView>

      <FilterSheet
        visible={filterOpen}
        fy={fy}
        setFy={setFy}
        onClose={() => setFilterOpen(false)}
        yearOptions={yearOptions}
        openYearPicker={() => setPickerType('fy')}
      />

      <PickerModal
        visible={!!pickerType}
        title={getPickerTitle(pickerType)}
        data={pickerData}
        onClose={() => setPickerType('')}
        onSelect={value => {
          if (pickerType === 'fy') setFy(value);
          if (pickerType === 'unit') setUnit(value);
          if (pickerType === 'party') setParty(value === 'All Parties' ? '' : value);
          setPickerType('');
        }}
      />
      {/* </SafeAreaView> */}
      <SafeAreaView edges={['bottom']} style={{ flex: 0, backgroundColor: COLORS.bg }} />
    </>
  );
}

function getPickerTitle(type) {
  if (type === 'fy') return 'Select Financial Year';
  if (type === 'unit') return 'Select Unit';
  if (type === 'party') return 'Select Party';
  return 'Select';
}

function barHeight(value, max) {
  return Math.max(
    s(6),
    Math.min(s(110), (Number(value || 0) / Number(max || 1)) * s(110)),
  );
}

function Card({ title, subTitle, titleColor, children, style }) {
  return (
    <View style={[styles.card, style]}>
      <Text numberOfLines={2} style={[styles.cardTitle, titleColor && { color: titleColor }]}>
        {title}{' '}
        {subTitle ? <Text style={styles.cardSubTitle}>{subTitle}</Text> : null}
      </Text>
      {children}
    </View>
  );
}

function KpiCard({ icon, title, count, value, color }) {
  return (
    <View style={styles.kpiCard}>
      <View style={[styles.kpiIcon, { backgroundColor: color }]}>
        <Icon name={icon} size={s(22)} color="#fff" />
      </View>

      <Text numberOfLines={2} style={styles.kpiTitle}>
        {title}
      </Text>

      {!!String(count || '') && (
        <Text numberOfLines={1} adjustsFontSizeToFit style={styles.kpiCount}>
          {fmt(count)}
        </Text>
      )}

      <Text
        numberOfLines={2}
        adjustsFontSizeToFit
        minimumFontScale={0.55}
        style={[styles.kpiValue, { color }]}
      >
        {value}
      </Text>
    </View>
  );
}

function OverviewMetric({ value, label, percent, color }) {
  return (
    <View style={styles.overviewMetric}>
      <Text
        numberOfLines={2}
        adjustsFontSizeToFit
        minimumFontScale={0.45}
        style={[styles.overviewValue, { color }]}
      >
        {value}
      </Text>

      <Text numberOfLines={1} style={styles.overviewLabel}>
        {label}
      </Text>

      {percent !== undefined && (
        <Text numberOfLines={1} style={[styles.overviewPercent, { color }]}>
          ({pct(percent)})
        </Text>
      )}
    </View>
  );
}

function PerformanceCard({ title, icon, count, qty, percent, unit, color, bg }) {
  return (
    <View style={[styles.performanceCard, { backgroundColor: bg }]}>
      <View style={styles.performanceTextBox}>
        <View style={styles.performanceTitleRow}>
          <Text numberOfLines={2} style={styles.performanceTitle}>
            {title}
          </Text>
          <Icon name={icon} size={s(22)} color={color} />
        </View>

        <Text numberOfLines={1} adjustsFontSizeToFit style={styles.performanceCount}>
          {fmt(count)}
        </Text>

        <Text
          numberOfLines={2}
          adjustsFontSizeToFit
          minimumFontScale={0.55}
          style={[styles.performanceQty, { color }]}
        >
          {fmtCompact(qty, ` ${unit}`)}
        </Text>

        <Text style={styles.performancePercent}>{pct(percent)}</Text>
        <Text style={styles.performanceSmallLabel}>
          {color === COLORS.green ? 'On Time %' : 'Delay %'}
        </Text>
      </View>

      <Gauge percent={percent} color={color} />
    </View>
  );
}

function Gauge({ percent, color }) {
  const size = s(88);
  const stroke = s(10);
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const p = Math.max(0, Math.min(100, Number(percent || 0)));
  const offset = circumference - (p / 100) * circumference;

  return (
    <View style={[styles.gaugeBox, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        <G rotation="-90" origin={`${size / 2}, ${size / 2}`}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#E5E7EB"
            strokeWidth={stroke}
            fill="none"
          />
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={stroke}
            fill="none"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={offset}
            strokeLinecap="round"
          />
        </G>
      </Svg>

      <Text style={styles.gaugeText}>{pct(p)}</Text>
    </View>
  );
}

function CarryMetric({ icon, label, value, color }) {
  return (
    <View style={styles.carryMetric}>
      <View style={[styles.carryIcon, { borderColor: `${color}55`, backgroundColor: `${color}10` }]}>
        <Icon name={icon} size={s(21)} color={color} />
      </View>

      <Text numberOfLines={2} style={styles.carryLabel}>
        {label}
      </Text>

      <Text
        numberOfLines={2}
        adjustsFontSizeToFit
        minimumFontScale={0.55}
        style={[styles.carryValue, { color: color === COLORS.red ? COLORS.red : COLORS.text }]}
      >
        {value}
      </Text>
    </View>
  );
}

function MiniCard({ icon, title, count, value, percent, color, bg }) {
  return (
    <View style={[styles.miniCard, { backgroundColor: bg }]}>
      <Icon name={icon} size={s(23)} color={color} />

      <Text numberOfLines={2} style={styles.miniTitle}>
        {title}
      </Text>

      {!!String(count || '') && (
        <Text numberOfLines={1} adjustsFontSizeToFit style={styles.miniCount}>
          {fmt(count)}
        </Text>
      )}

      <Text
        numberOfLines={2}
        adjustsFontSizeToFit
        minimumFontScale={0.55}
        style={[styles.miniValue, { color }]}
      >
        {value}
      </Text>

      {percent !== undefined && (
        <Text numberOfLines={1} style={[styles.miniPercent, { color }]}>
          {pct(percent)}
        </Text>
      )}
    </View>
  );
}

function DonutChart({ total, unit, segments }) {
  const size = s(122);
  const stroke = s(22);
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;

  const safeTotal = segments.reduce((sum, x) => sum + Math.abs(Number(x.value || 0)), 0) || 1;
  let start = 0;

  return (
    <View style={[styles.donutBox, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        <G rotation="-90" origin={`${size / 2}, ${size / 2}`}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#E5E7EB"
            strokeWidth={stroke}
            fill="none"
          />

          {segments.map((seg, index) => {
            const value = Math.abs(Number(seg.value || 0));
            const dash = (value / safeTotal) * circumference;

            const item = (
              <Circle
                key={index}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                stroke={seg.color}
                strokeWidth={stroke}
                fill="none"
                strokeDasharray={`${dash} ${circumference - dash}`}
                strokeDashoffset={-start}
              />
            );

            start += dash;
            return item;
          })}
        </G>
      </Svg>

      <View style={styles.donutCenter}>
        <Text numberOfLines={1} adjustsFontSizeToFit style={styles.donutTotal}>
          {fmt(total)}
        </Text>
        <Text style={styles.donutUnit}>{unit}</Text>
      </View>
    </View>
  );
}

function Legend({ color, text }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text numberOfLines={1} style={styles.legendText}>
        {text}
      </Text>
    </View>
  );
}

function TopPartyFallback({ unit }) {
  const demo = [
    { name: 'Party A', qty: 12450 },
    { name: 'Party B', qty: 9840 },
    { name: 'Party C', qty: 8260 },
    { name: 'Party D', qty: 6780 },
    { name: 'Party E', qty: 4950 },
  ];

  return (
    <>
      {demo.map((p, index) => (
        <TopPartyRow
          key={p.name}
          index={index + 1}
          name={p.name}
          qty={p.qty}
          max={demo[0].qty}
          unit={unit}
        />
      ))}
    </>
  );
}

function TopPartyRow({ index, name, qty, max, unit }) {
  const width = Math.max(16, Math.min(100, (Number(qty || 0) / Number(max || 1)) * 100));

  return (
    <View style={styles.partyRow}>
      <Text numberOfLines={1} style={styles.partyName}>
        {index}. {name}
      </Text>

      <View style={styles.partyBarTrack}>
        <View style={[styles.partyBarFill, { width: `${width}%` }]} />
      </View>

      <Text numberOfLines={1} style={styles.partyQty}>
        {fmtCompact(qty, ` ${unit}`)}
      </Text>
    </View>
  );
}

function EmptyText({ text }) {
  return <Text style={styles.emptyText}>{text}</Text>;
}

function FilterSheet({ visible, fy, setFy, yearOptions, openYearPicker, onClose }) {
  if (!visible) return null;

  return (
    <View style={styles.sheet}>
      <View style={styles.dragHandle} />

      <View style={styles.sheetHeader}>
        <Text style={styles.sheetTitle}>Filter</Text>

        <TouchableOpacity onPress={() => setFy(yearOptions[0] || fy)}>
          <View style={styles.resetRow}>
            <Icon name="refresh" size={s(19)} color={COLORS.teal} />
            <Text style={styles.resetText}>Reset</Text>
          </View>
        </TouchableOpacity>
      </View>

      <Text style={styles.filterLabel}>Financial Year</Text>

      <TouchableOpacity style={styles.bigInput} onPress={openYearPicker}>
        <View style={styles.inputLeft}>
          <Icon name="calendar-today" size={s(19)} color={COLORS.teal} />
          <Text style={styles.inputText}>{fy}</Text>
        </View>
        <Icon name="keyboard-arrow-down" size={s(23)} color={COLORS.muted} />
      </TouchableOpacity>

      <TouchableOpacity style={styles.applyButton} onPress={onClose}>
        <Text style={styles.applyText}>Apply Filter</Text>
      </TouchableOpacity>
    </View>
  );
}

function PickerModal({ visible, title, data, onClose, onSelect }) {
  return (
    <Modal visible={visible} animationType="slide">
      <SafeAreaView style={styles.pickerSafe}>
        <View style={styles.pickerHeader}>
          <TouchableOpacity onPress={onClose}>
            <Icon name="arrow-back-ios" size={s(20)} color={COLORS.text} />
          </TouchableOpacity>

          <Text style={styles.pickerTitle}>{title}</Text>

          <View style={{ width: s(24) }} />
        </View>

        <FlatList
          data={data}
          keyExtractor={(item, index) => `${item}-${index}`}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.pickerItem} onPress={() => onSelect(item)}>
              <Text style={styles.pickerItemText}>{item}</Text>
            </TouchableOpacity>
          )}
        />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },

  header: {
    backgroundColor: COLORS.teal,
    paddingHorizontal: s(18),
    paddingTop: s(16),
    paddingBottom: s(16),
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(14),
  },

  headerTextBox: {
    flex: 1,
  },

  headerTitle: {
    color: '#FFFFFF',
    fontSize: s(24),
    fontWeight: '900',
  },

  headerSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: s(3),
  },

  headerSub: {
    color: '#FFFFFF',
    fontSize: s(13),
    fontWeight: '700',
  },

  scroll: {
    flex: 1,
  },

  content: {
    padding: s(14),
  },

  quarterTabs: {
    backgroundColor: COLORS.card,
    borderRadius: s(18),
    flexDirection: 'row',
    padding: s(5),
    elevation: 3,
  },

  qTab: {
    flex: 1,
    paddingVertical: s(11),
    borderRadius: s(14),
    alignItems: 'center',
    justifyContent: 'center',
  },

  qTabActive: {
    backgroundColor: COLORS.orange,
  },

  qTabTitle: {
    color: COLORS.text,
    fontSize: s(19),
    fontWeight: '900',
  },

  qTabLabel: {
    color: COLORS.muted,
    fontSize: s(12),
    fontWeight: '700',
    marginTop: s(3),
  },

  qTabTextActive: {
    color: '#FFFFFF',
  },

  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(9),
    marginTop: s(13),
  },

  partyButton: {
    width: s(103),
    height: s(42),
    borderRadius: s(14),
    backgroundColor: COLORS.card,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: s(11),
    elevation: 2,
  },

  unitButton: {
    width: s(72),
    height: s(42),
    borderRadius: s(14),
    backgroundColor: COLORS.card,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: s(11),
    elevation: 2,
  },

  filterButtonText: {
    color: COLORS.text,
    fontWeight: '900',
    fontSize: s(12),
  },

  typeSegment: {
    flex: 1,
    height: s(42),
    borderRadius: s(14),
    backgroundColor: COLORS.card,
    padding: s(4),
    flexDirection: 'row',
    elevation: 2,
  },

  typeButton: {
    flex: 1,
    borderRadius: s(11),
    alignItems: 'center',
    justifyContent: 'center',
  },

  typeButtonActive: {
    backgroundColor: COLORS.teal,
  },

  typeText: {
    color: COLORS.text,
    fontWeight: '900',
    fontSize: s(12),
  },

  typeTextActive: {
    color: '#FFFFFF',
  },

  loaderBox: {
    padding: s(45),
    alignItems: 'center',
  },

  loaderText: {
    color: COLORS.muted,
    marginTop: s(10),
    fontWeight: '800',
    fontSize: s(12),
  },

  errorBox: {
    marginTop: s(18),
    backgroundColor: COLORS.card,
    borderRadius: s(18),
    padding: s(18),
    alignItems: 'center',
  },

  errorText: {
    color: COLORS.red,
    textAlign: 'center',
    marginTop: s(8),
    fontWeight: '800',
    fontSize: s(12),
  },

  retryButton: {
    backgroundColor: COLORS.teal,
    paddingHorizontal: s(22),
    paddingVertical: s(10),
    borderRadius: s(12),
    marginTop: s(12),
  },

  retryText: {
    color: '#FFFFFF',
    fontWeight: '900',
  },

  kpiGrid: {
    flexDirection: 'row',
    gap: s(8),
    marginTop: s(14),
  },

  kpiCard: {
    flex: 1,
    minHeight: s(135),
    backgroundColor: COLORS.card,
    borderRadius: s(15),
    padding: s(11),
    elevation: 2,
  },

  kpiIcon: {
    width: s(40),
    height: s(40),
    borderRadius: s(21),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: s(12),
  },

  kpiTitle: {
    color: COLORS.text,
    fontSize: s(11),
    fontWeight: '900',
    minHeight: s(28),
  },

  kpiCount: {
    color: COLORS.text,
    fontSize: s(22),
    fontWeight: '900',
    marginTop: s(7),
  },

  kpiValue: {
    fontSize: s(15),
    fontWeight: '900',
    marginTop: s(2),
  },

  card: {
    backgroundColor: COLORS.card,
    borderRadius: s(18),
    padding: s(14),
    marginTop: s(14),
    elevation: 2,
  },

  cardTitle: {
    color: COLORS.text,
    fontSize: s(15),
    fontWeight: '900',
    marginBottom: s(13),
  },

  cardSubTitle: {
    color: COLORS.text,
    fontSize: s(11),
    fontWeight: '900',
  },

  overviewRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },

  overviewMetric: {
    width: '32%',
    alignItems: 'center',
    paddingHorizontal: s(3),
  },

  overviewValue: {
    fontSize: s(15),
    fontWeight: '900',
    textAlign: 'center',
    minHeight: s(42),
  },

  overviewLabel: {
    color: COLORS.text,
    fontSize: s(10),
    fontWeight: '800',
    marginTop: s(5),
    textAlign: 'center',
  },

  overviewPercent: {
    fontSize: s(10),
    fontWeight: '900',
    marginTop: s(4),
    textAlign: 'center',
  },

  progressTrack: {
    height: s(25),
    borderRadius: s(30),
    overflow: 'hidden',
    flexDirection: 'row',
    backgroundColor: COLORS.border,
    marginTop: s(18),
  },

  progressBlue: {
    backgroundColor: COLORS.blue,
  },

  progressGreen: {
    backgroundColor: COLORS.green,
  },

  progressOrange: {
    backgroundColor: COLORS.orange,
  },

  performanceRow: {
    flexDirection: 'row',
    gap: s(10),
  },

  performanceCard: {
    flex: 1,
    minHeight: s(154),
    borderRadius: s(15),
    padding: s(11),
    flexDirection: 'row',
    alignItems: 'center',
  },

  performanceTextBox: {
    flex: 1,
  },

  performanceTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },

  performanceTitle: {
    color: COLORS.text,
    fontSize: s(11),
    fontWeight: '900',
    flex: 1,
  },

  performanceCount: {
    color: COLORS.text,
    fontSize: s(27),
    fontWeight: '900',
    marginTop: s(9),
  },

  performanceQty: {
    fontSize: s(14),
    fontWeight: '900',
    marginTop: s(5),
  },

  performancePercent: {
    color: COLORS.text,
    fontSize: s(12),
    fontWeight: '900',
    marginTop: s(8),
  },

  performanceSmallLabel: {
    color: COLORS.text,
    fontSize: s(10),
    marginTop: s(2),
  },

  gaugeBox: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  gaugeText: {
    position: 'absolute',
    color: COLORS.text,
    fontSize: s(11),
    fontWeight: '900',
  },

  carryRow: {
    flexDirection: 'row',
  },

  carryMetric: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: s(5),
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
  },

  carryIcon: {
    width: s(40),
    height: s(40),
    borderRadius: s(21),
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: s(9),
  },

  carryLabel: {
    color: COLORS.text,
    fontSize: s(10),
    fontWeight: '700',
    textAlign: 'center',
    minHeight: s(28),
  },

  carryValue: {
    fontSize: s(12),
    fontWeight: '900',
    textAlign: 'center',
    marginTop: s(6),
  },

  samePrevRow: {
    flexDirection: 'column',
    gap: s(10),
  },

  sameQuarterCard: {
    width: '100%',
  },

  previousCard: {
    width: '48%',
  },

  sameKpiRow: {
    flexDirection: 'row',
    gap: s(6),
  },

  miniCard: {
    flex: 1,
    minHeight: s(104),
    borderRadius: s(12),
    padding: s(7),
    alignItems: 'center',
  },

  miniTitle: {
    color: COLORS.text,
    fontSize: s(9),
    fontWeight: '800',
    textAlign: 'center',
    marginTop: s(4),
    minHeight: s(24),
  },

  miniCount: {
    color: COLORS.text,
    fontSize: s(18),
    fontWeight: '900',
    marginTop: s(2),
  },

  miniValue: {
    fontSize: s(10),
    fontWeight: '900',
    textAlign: 'center',
    marginTop: s(2),
  },

  miniPercent: {
    fontSize: s(10),
    fontWeight: '900',
    marginTop: s(2),
  },

  previousBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: s(5),
  },

  previousIcon: {
    width: s(52),
    height: s(52),
    borderRadius: s(27),
    backgroundColor: '#DFF7F7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: s(8),
  },

  previousCount: {
    color: COLORS.teal,
    fontSize: s(25),
    fontWeight: '900',
  },

  previousQty: {
    color: COLORS.teal,
    fontSize: s(13),
    fontWeight: '900',
    marginTop: s(3),
  },

  previousLabel: {
    color: COLORS.muted,
    fontSize: s(10),
    fontWeight: '700',
    textAlign: 'center',
    marginTop: s(7),
  },

  chartRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: s(10),
  },

  chartCard: {
    width: '48%',
    minHeight: s(230),
  },

  legendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: s(12),
    marginBottom: s(8),
  },

  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: s(4),
  },

  legendDot: {
    width: s(8),
    height: s(8),
    borderRadius: s(5),
    marginRight: s(5),
  },

  legendText: {
    color: COLORS.text,
    fontSize: s(9),
    fontWeight: '700',
  },
  monthBarItem: {
    flex: 1,
    alignItems: 'center',
  },
  monthLabel: {
    color: COLORS.text,
    fontSize: s(11),
    fontWeight: '800',
    marginTop: s(8),
  },

  partyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: s(9),
  },

  partyName: {
    width: s(58),
    color: COLORS.text,
    fontSize: s(8),
    fontWeight: '800',
  },

  partyBarTrack: {
    flex: 1,
    height: s(11),
    backgroundColor: '#DBEAFE',
    borderRadius: s(8),
    overflow: 'hidden',
  },

  partyBarFill: {
    height: s(11),
    backgroundColor: COLORS.blue,
    borderRadius: s(8),
  },

  partyQty: {
    width: s(48),
    color: COLORS.text,
    fontSize: s(8),
    fontWeight: '800',
    textAlign: 'right',
  },

  statusChartWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  donutBox: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  donutCenter: {
    position: 'absolute',
    alignItems: 'center',
    width: s(60),
  },

  donutTotal: {
    color: COLORS.text,
    fontSize: s(13),
    fontWeight: '900',
  },

  donutUnit: {
    color: COLORS.text,
    fontSize: s(9),
    fontWeight: '900',
  },

  statusLegend: {
    flex: 1,
    marginLeft: s(6),
  },

  statusLegendValue: {
    color: COLORS.text,
    fontSize: s(8),
    fontWeight: '800',
    marginBottom: s(5),
    marginLeft: s(13),
  },

  emptyText: {
    color: COLORS.muted,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: s(45),
    fontSize: s(10),
  },

  footerSpace: {
    height: s(25),
  },

  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.card,
    borderTopLeftRadius: s(30),
    borderTopRightRadius: s(30),
    paddingHorizontal: s(20),
    paddingTop: s(10),
    paddingBottom: s(25),
    elevation: 30,
  },

  dragHandle: {
    width: s(60),
    height: s(5),
    borderRadius: s(10),
    backgroundColor: '#D1D5DB',
    alignSelf: 'center',
    marginBottom: s(18),
  },

  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: s(18),
  },

  sheetTitle: {
    color: COLORS.text,
    fontSize: s(16),
    fontWeight: '900',
  },

  resetRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  resetText: {
    color: COLORS.teal,
    fontSize: s(13),
    fontWeight: '800',
    marginLeft: s(5),
  },

  filterLabel: {
    color: COLORS.text,
    fontSize: s(13),
    fontWeight: '800',
    marginBottom: s(10),
  },

  bigInput: {
    height: s(47),
    borderWidth: 2,
    borderColor: COLORS.teal,
    borderRadius: s(15),
    paddingHorizontal: s(14),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  inputLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  inputText: {
    color: COLORS.text,
    fontSize: s(13),
    fontWeight: '800',
    marginLeft: s(10),
  },

  applyButton: {
    height: s(47),
    borderRadius: s(16),
    backgroundColor: COLORS.teal,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: s(24),
  },

  applyText: {
    color: '#FFFFFF',
    fontSize: s(14),
    fontWeight: '900',
  },

  pickerSafe: {
    flex: 1,
    backgroundColor: COLORS.card,
  },

  pickerHeader: {
    height: s(58),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: s(16),
    borderBottomWidth: 1,
    borderColor: COLORS.border,
  },

  pickerTitle: {
    color: COLORS.text,
    fontSize: s(16),
    fontWeight: '900',
  },

  pickerItem: {
    padding: s(16),
    borderBottomWidth: 1,
    borderColor: COLORS.border,
  },

  pickerItemText: {
    color: COLORS.text,
    fontSize: s(15),
    fontWeight: '800',
  },
  monthlyCard: {
    width: '100%',
    minHeight: s(210),
  },

  monthlyList: {
    gap: s(8),
  },

  monthlyHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: s(10),
    paddingVertical: s(8),
    paddingHorizontal: s(8),
  },

  monthlyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: s(12),
    paddingVertical: s(10),
    paddingHorizontal: s(8),
  },

  monthCol: {
    width: s(48),
  },

  monthlyHeadText: {
    flex: 1,
    color: COLORS.muted,
    fontSize: s(9),
    fontWeight: '900',
    textAlign: 'center',
  },

  monthName: {
    color: COLORS.text,
    fontSize: s(13),
    fontWeight: '900',
  },

  monthQtyBox: {
    flex: 1,
    alignItems: 'center',
  },

  monthQty: {
    fontSize: s(11),
    fontWeight: '900',
    textAlign: 'center',
  },

  monthUnit: {
    color: COLORS.muted,
    fontSize: s(8),
    fontWeight: '800',
    marginTop: s(1),
  },
  axisChartWrap: {
    flexDirection: 'row',
    height: s(155),
  },

  yAxis: {
    width: s(34),
    height: s(125),
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingRight: s(5),
  },

  yAxisText: {
    color: COLORS.muted,
    fontSize: s(8),
    fontWeight: '800',
  },

  chartArea: {
    flex: 1,
    height: s(140),
    position: 'relative',
  },

  gridLine: {
    position: 'relative',
    height: s(31),
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },

  barChart: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: s(140),
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    paddingHorizontal: s(4),
  },

  barPair: {
    height: s(112),
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: s(5),
  },

  bar: {
    width: s(12),
    borderRadius: s(5),
  },
});