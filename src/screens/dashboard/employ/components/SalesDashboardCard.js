import { useRouter } from 'expo-router';
import React, { useMemo, useRef, useState } from 'react';
import {
  LayoutAnimation,
  PanResponder,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  UIManager,
  View,
} from 'react-native';
import { formatAmount } from '../api/api';
import MiniLineChart from './MiniLineChart';
import { COLORS, SectionCard, SectionHeader } from './SharedComponents';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const DIMENSIONS = [
  { key: 'category', label: 'Category' },
  { key: 'executive', label: 'Executive' },
  { key: 'design', label: 'Design' },
  { key: 'party', label: 'Party' },
];

const CHILD_LABELS = {
  category: 'BY CATEGORY',
  executive: 'BY EXECUTIVE',
  design: 'BY DESIGN',
  party: 'BY PARTY',
};


const CHART_WIDTH = 340;
const CHART_HEIGHT = 38;
const TOOLTIP_WIDTH = 96;

const formatQty = value => {
  const amount = Number(value || 0);
  if (Math.abs(amount) >= 100000) return `${(amount / 100000).toFixed(1)} L m`;
  if (Math.abs(amount) >= 1000) return `${(amount / 1000).toFixed(1)} K m`;
  return `${amount.toLocaleString('en-IN', { maximumFractionDigits: 1 })} m`;
};

const cleanAmount = value => formatAmount(Number(value || 0)).replace('Cr', ' Cr').replace('L', ' L');

function MetricValue({ quantity, amount, compact = false }) {
  return (
    <View style={[styles.metricValue, compact && styles.metricValueCompact]}>
      <Text numberOfLines={1} style={[styles.qty, compact && styles.childQty]}>{formatQty(quantity)}</Text>
      <Text numberOfLines={1} style={[styles.amount, compact && styles.childAmount]}>{cleanAmount(amount)}</Text>
    </View>
  );
}

function ChildSection({ type, rows }) {
  if (!Array.isArray(rows) || rows.length === 0) return null;

  return (
    <View style={styles.childSection}>
      <Text style={styles.childTitle}>{CHILD_LABELS[type] || type.toUpperCase()}</Text>
      {rows.map((row, index) => (
        <View key={`${type}-${row.code || row.name}-${index}`} style={styles.childRow}>
          <View style={styles.childNameWrap}>
            {type === 'executive' ? (
              <View style={[styles.avatar, { backgroundColor: row.avatar_color || '#337FA5' }]}>
                <Text style={styles.avatarText}>{String(row.name || '?').trim().charAt(0).toUpperCase()}</Text>
              </View>
            ) : (
              <View style={styles.squareDot} />
            )}
            <Text numberOfLines={1} style={styles.childName}>{row.name}</Text>
          </View>
          <MetricValue quantity={row.mtd_qty} amount={row.mtd_amount} compact />
        </View>
      ))}
    </View>
  );
}

function InteractiveSalesChart({ dailyTrend }) {
  const [selectedIndex, setSelectedIndex] = useState(null);

  const points = useMemo(
    () =>
      (Array.isArray(dailyTrend) ? dailyTrend : []).map(item => ({
        ...item,
        amount: Number(item.amount || 0),
      })),
    [dailyTrend],
  );

  const values = useMemo(
    () => points.map(item => item.amount),
    [points],
  );

  const minValue = values.length ? Math.min(...values) : 0;
  const maxValue = values.length ? Math.max(...values) : 0;

  const selectNearestPoint = locationX => {
    if (!points.length) return;

    const safeX = Math.max(
      0,
      Math.min(CHART_WIDTH, Number(locationX || 0)),
    );

    if (points.length === 1) {
      setSelectedIndex(0);
      return;
    }

    const nextIndex = Math.round(
      (safeX / CHART_WIDTH) * (points.length - 1),
    );

    setSelectedIndex(
      Math.max(0, Math.min(points.length - 1, nextIndex)),
    );
  };

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,

      onPanResponderGrant: event => {
        selectNearestPoint(event.nativeEvent.locationX);
      },

      onPanResponderMove: event => {
        selectNearestPoint(event.nativeEvent.locationX);
      },

      onPanResponderRelease: () => {
        setSelectedIndex(null);
      },

      onPanResponderTerminate: () => {
        setSelectedIndex(null);
      },
    }),
  ).current;

  const selectedPoint =
    selectedIndex === null ? null : points[selectedIndex];

  const xPosition =
    selectedIndex === null
      ? null
      : points.length <= 1
        ? CHART_WIDTH / 2
        : (selectedIndex / (points.length - 1)) * CHART_WIDTH;

  const yPosition =
    !selectedPoint || maxValue === minValue
      ? CHART_HEIGHT / 2
      : CHART_HEIGHT -
        ((selectedPoint.amount - minValue) /
          (maxValue - minValue)) *
          CHART_HEIGHT;

  const tooltipLeft =
    xPosition === null
      ? 0
      : Math.max(
          0,
          Math.min(
            CHART_WIDTH - TOOLTIP_WIDTH,
            xPosition - TOOLTIP_WIDTH / 2,
          ),
        );

  const axisItems = useMemo(
    () =>
      points.filter(
        (_, index, all) =>
          index === 0 ||
          index === all.length - 1 ||
          index %
            Math.max(1, Math.floor(all.length / 3)) ===
            0,
      ),
    [points],
  );

  return (
    <View style={styles.chartWrap}>
      <View
        style={styles.chartTouchArea}
        {...responder.panHandlers}
      >
        <MiniLineChart
          data={values}
          color="#0D2234"
          fillColor="#0D2234"
          width={CHART_WIDTH}
          height={CHART_HEIGHT}
        />

        {selectedPoint && xPosition !== null ? (
          <>
            <View
              pointerEvents="none"
              style={[styles.chartGuide, { left: xPosition }]}
            />

            <View
              pointerEvents="none"
              style={[
                styles.chartDot,
                {
                  left: xPosition - 5,
                  top: yPosition - 5,
                },
              ]}
            />

            <View
              pointerEvents="none"
              style={[
                styles.chartTooltip,
                { left: tooltipLeft },
              ]}
            >
              <Text style={styles.tooltipDay}>
                {selectedPoint.day}
              </Text>

              <Text style={styles.tooltipValue}>
                {cleanAmount(selectedPoint.amount)}
              </Text>
            </View>
          </>
        ) : null}
      </View>

      <View style={styles.axisRow}>
        {axisItems.map((item, index) => (
          <Text
            key={`${item.day}-${index}`}
            style={styles.axisText}
          >
            {item.day}
          </Text>
        ))}
      </View>
    </View>
  );
}

export default function SalesDashboardCard({ sales, dateString, view = 'owner' }) {
  const router = useRouter();
  const [dimension, setDimension] = useState(sales?.default_dimension || 'category');
  const [expandedKey, setExpandedKey] = useState(null);

  const rows = useMemo(() => sales?.dimensions?.[dimension] || [], [sales, dimension]);
  const dailyTrend = useMemo(() => sales?.daily_trend || [], [sales]);

  const chooseDimension = next => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setDimension(next);
    setExpandedKey(null);
  };

  const toggleRow = row => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const key = `${dimension}:${row.code || row.name}`;
    setExpandedKey(current => (current === key ? null : key));
  };

  const openFullReport = extra => {
    router.push({
      pathname: '/new/(tabs)/reports/monthly-report',
      params: {
        view: view === 'myview' ? 'my' : view,
        date: dateString,
        monthno: String(new Date(dateString).getMonth() + 1),
        sales_dimension: dimension,
        ...(extra || {}),
      },
    });
  };

  return (
    <SectionCard>
      <SectionHeader
        icon="🧵"
        title="SALES"
        bgColor={COLORS.salesBg}
        rightText="updated now"
        action="Full report"
        onAction={() => openFullReport()}
      />

      <View style={styles.summaryRow}>
        <View style={styles.summaryBlock}>
          <Text style={styles.summaryLabel}>TODAY</Text>
          <Text style={styles.todayValue}>{cleanAmount(sales?.total?.today)}</Text>
        </View>
        <View style={styles.summaryBlock}>
          <Text style={styles.summaryLabel}>THIS MONTH</Text>
          <Text style={styles.monthValue}>{cleanAmount(sales?.total?.mtd)}</Text>
        </View>
      </View>

      <InteractiveSalesChart dailyTrend={dailyTrend} />

      <View style={styles.tabs}>
        {DIMENSIONS.map(tab => {
          const active = tab.key === dimension;
          return (
            <TouchableOpacity
              key={tab.key}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              style={[styles.tab, active && styles.tabActive]}
              onPress={() => chooseDimension(tab.key)}
            >
              <Text style={[styles.tabText, active && styles.tabTextActive]}>{tab.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.columnHeader}>
        <Text style={styles.columnTitle}>{dimension.toUpperCase()}</Text>
        <Text style={styles.columnMetric}>QTY   AMOUNT</Text>
      </View>

      {rows.map((row, index) => {
        const key = `${dimension}:${row.code || row.name}`;
        const expanded = expandedKey === key;
        const childEntries = Object.entries(row.children || {});
        return (
          <View key={key} style={styles.parentWrap}>
            <TouchableOpacity style={styles.parentRow} activeOpacity={0.7} onPress={() => toggleRow(row)}>
              <Text style={styles.chevron}>{expanded ? '⌄' : '›'}</Text>
              {dimension === 'executive' && (
                <View style={[styles.avatar, { backgroundColor: row.avatar_color || '#337FA5' }]}>
                  <Text style={styles.avatarText}>{String(row.name || '?').charAt(0).toUpperCase()}</Text>
                </View>
              )}
              {dimension !== 'executive' && <View style={[styles.rankDot, { backgroundColor: ['#255C85','#7440B7','#168274','#2563EB','#B55E10','#0A9B6C','#D98200'][index % 7] }]} />}
              <Text numberOfLines={1} style={styles.parentName}>{row.name}</Text>
              <MetricValue quantity={row.mtd_qty} amount={row.mtd_amount} />
            </TouchableOpacity>

            {expanded && (
              <View style={styles.expandedBody}>
                {childEntries.map(([childType, childRows]) => (
                  <ChildSection key={childType} type={childType} rows={childRows} />
                ))}
                <TouchableOpacity
                  accessibilityRole="link"
                  onPress={() => openFullReport({
                    [`${dimension}_code`]: row.code,
                    [`${dimension}_name`]: row.name,
                  })}
                >
                  <Text style={styles.fullLink}>View full report ›</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        );
      })}

      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>Total</Text>
        <MetricValue
          quantity={rows.reduce((sum, row) => sum + Number(row.mtd_qty || 0), 0)}
          amount={rows.reduce((sum, row) => sum + Number(row.mtd_amount || 0), 0)}
        />
      </View>
      <Text style={styles.footerNote}>Toggle the view · tap any row to expand its breakdown. Qty in metres, amount in ₹.</Text>
    </SectionCard>
  );
}

const styles = StyleSheet.create({
  summaryRow: { flexDirection: 'row', paddingHorizontal: 14, paddingTop: 12, paddingBottom: 6 },
  summaryBlock: { flex: 1 },
  summaryLabel: { fontSize: 9, letterSpacing: 1.1, color: '#8C837B', fontWeight: '700' },
  todayValue: { marginTop: 3, fontSize: 17, color: '#16633C', fontWeight: '800' },
  monthValue: { marginTop: 3, fontSize: 17, color: '#121417', fontWeight: '800' },
  chartWrap: { paddingHorizontal: 12, paddingBottom: 6, overflow: 'visible' },
  chartTouchArea: { width: CHART_WIDTH, height: CHART_HEIGHT, position: 'relative', overflow: 'visible' },
  chartGuide: { position: 'absolute', top: 0, bottom: 0, width: 1, backgroundColor: '#7D8A93' },
  chartDot: { position: 'absolute', width: 10, height: 10, borderRadius: 5, backgroundColor: '#FFFFFF', borderWidth: 2, borderColor: '#0D2234' },
  chartTooltip: { position: 'absolute', top: -48, width: TOOLTIP_WIDTH, minHeight: 40, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8, backgroundColor: '#1E2327', alignItems: 'center', justifyContent: 'center', shadowColor: '#000000', shadowOpacity: 0.18, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 4 },
  tooltipDay: { color: '#C8CFD4', fontSize: 8.5, fontWeight: '700' },
  tooltipValue: { marginTop: 1, color: '#FFFFFF', fontSize: 11.5, fontWeight: '900' },
  axisRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: -2 },
  axisText: { fontSize: 8, color: '#9D958D' },
  tabs: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, paddingHorizontal: 12, paddingVertical: 10 },
  tab: { paddingHorizontal: 14, height: 34, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: '#EEEAE6' },
  tabActive: { backgroundColor: '#0C1F31' },
  tabText: { fontSize: 12, fontWeight: '700', color: '#8B7564' },
  tabTextActive: { color: '#FFFFFF' },
  columnHeader: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 9, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#DDD7D0' },
  columnTitle: { fontSize: 9, letterSpacing: 1.1, color: '#A18F80', fontWeight: '700' },
  columnMetric: { fontSize: 9, letterSpacing: 1, color: '#A18F80', fontWeight: '700' },
  parentWrap: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#DDD7D0' },
  parentRow: { minHeight: 48, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center' },
  chevron: { width: 14, color: '#9C9288', fontSize: 16 },
  rankDot: { width: 9, height: 9, borderRadius: 2, marginRight: 8 },
  parentName: { flex: 1, fontSize: 13, fontWeight: '800', color: '#111317' },
  metricValue: { width: 122, flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 7 },
  metricValueCompact: { width: 125 },
  qty: { fontSize: 11, color: '#827B74', fontVariant: ['tabular-nums'] },
  amount: { fontSize: 12, color: '#111317', fontWeight: '900', fontVariant: ['tabular-nums'] },
  childQty: { fontSize: 10 },
  childAmount: { fontSize: 11 },
  expandedBody: { marginLeft: 20, paddingLeft: 14, paddingRight: 12, paddingBottom: 12, borderLeftWidth: 1, borderLeftColor: '#CDC6BF' },
  childSection: { marginTop: 9 },
  childTitle: { marginBottom: 5, fontSize: 8, letterSpacing: 1, color: '#9C9188', fontWeight: '700' },
  childRow: { minHeight: 28, flexDirection: 'row', alignItems: 'center' },
  childNameWrap: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  childName: { flex: 1, fontSize: 11, color: '#7E6A5C' },
  squareDot: { width: 7, height: 7, borderRadius: 1, backgroundColor: '#2563EB', marginRight: 7 },
  avatar: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginRight: 7 },
  avatarText: { color: '#FFFFFF', fontSize: 8, fontWeight: '800' },
  fullLink: { marginTop: 9, color: '#1C5D82', fontSize: 11, fontWeight: '800' },
  totalRow: { minHeight: 46, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  totalLabel: { flex: 1, color: '#8D837A', fontSize: 11 },
  footerNote: { paddingHorizontal: 12, paddingBottom: 10, color: '#A29991', fontSize: 8 },
});
