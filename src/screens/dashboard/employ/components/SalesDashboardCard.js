import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  LayoutAnimation,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  UIManager,
  View,
  ScrollView,
} from 'react-native';
import { formatAmount } from '../api/api';
import InteractiveDailyTrendChart from './InteractiveDailyTrendChart';
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

const LEVEL_BY_DIMENSION = {
  category: 'categories',
  executive: 'executives',
  design: 'designs',
  party: 'parties',
};

const NEXT_LEVEL_BY_DIMENSION = {
  category: 'executives',
  executive: 'parties',
  design: 'executives',
  // Explicit business rule: direct Party drill-down first shows that party's categories.
  party: 'categories',
};

const formatQty = value => {
  const amount = Number(value || 0);
  if (Math.abs(amount) >= 100000) return `${(amount / 100000).toFixed(1)} L m`;
  if (Math.abs(amount) >= 1000) return `${(amount / 1000).toFixed(1)} K m`;
  return `${amount.toLocaleString('en-IN', { maximumFractionDigits: 1 })} m`;
};

const cleanAmount = (value, amountMode = 'compact') =>
  formatAmount(Number(value || 0), amountMode);

const financialYearShortLabel = value => {
  const raw = String(value || '');
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const now = new Date();
  const year = match ? Number(match[1]) : now.getFullYear();
  const month = match ? Number(match[2]) : now.getMonth() + 1;
  const start = month >= 4 ? year : year - 1;
  return `${String(start).slice(-2)}-${String(start + 1).slice(-2)}`;
};

const coverageSubtitle = period => {
  if (!period) return '';
  if (period.type === 'live_balance') return period.freshness_label || 'Live current balance';
  const ymd = String(period.actual_to_ymd || '');
  if (/^\d{8}$/.test(ymd)) {
    const d = new Date(Number(ymd.slice(0, 4)), Number(ymd.slice(4, 6)) - 1, Number(ymd.slice(6, 8)));
    const label = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
    return Number(period.pending_days || 0) > 0 ? `Data through ${label}` : `Current through ${label}`;
  }
  return period.freshness_label || period.display_label || '';
};

function MetricValue({ quantity, amount, compact = false, amountMode = 'compact' }) {
  return (
    <View style={[styles.metricValue, compact && styles.metricValueCompact]}>
      <Text numberOfLines={1} style={[styles.qty, compact && styles.childQty]}>{formatQty(quantity)}</Text>
      <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.58} style={[styles.amount, compact && styles.childAmount]}>{cleanAmount(amount, amountMode)}</Text>
    </View>
  );
}

function ChildSection({ type, rows, amountMode = 'compact' }) {
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
          <MetricValue quantity={row.mtd_qty} amount={row.mtd_amount} amountMode={amountMode} compact />
        </View>
      ))}
    </View>
  );
}

function InteractiveSalesChart({ dailyTrend, amountMode = 'compact' }) {
  return (
    <View style={styles.chartWrap}>
      <InteractiveDailyTrendChart
        data={dailyTrend}
        valueKey="amount"
        labelKey="day"
        color="#0D2234"
        fillColor="#0D2234"
        height={62}
        pointGap={54}
        valueFormatter={value => cleanAmount(value, amountMode)}
        showBaseline
        showHint
      />
    </View>
  );
}

export default function SalesDashboardCard({ sales, dateString, view = 'owner', prptype = 'S', amountMode = 'compact' }) {
  const router = useRouter();
  const [dimension, setDimension] = useState(sales?.default_dimension || 'category');
  const [expandedKey, setExpandedKey] = useState(null);

  const [sortConfig, setSortConfig] = useState({
    field: 'mtd_amount',
    direction: 'desc',
  });

  const rows = useMemo(() => sales?.dimensions?.[dimension] || [], [sales, dimension]);

  const sortedRows = useMemo(() => {
    const data = [...rows];

    if (!sortConfig.field) return data;

    return data.sort((a, b) => {
      const aValue = Number(a?.[sortConfig.field] || 0);
      const bValue = Number(b?.[sortConfig.field] || 0);

      return sortConfig.direction === 'asc'
        ? aValue - bValue
        : bValue - aValue;
    });
  }, [rows, sortConfig]);


  const toggleSort = () => {
    setSortConfig(prev => ({
      field: prev.field === 'mtd_qty'
        ? 'mtd_amount'
        : 'mtd_qty',

      direction:
        prev.field === 'mtd_qty' &&
          prev.direction === 'desc'
          ? 'asc'
          : 'desc',
    }));
  };

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

  const openFinancialYear = () => {
    router.push({
      pathname: '/new/(tabs)/reports/financial-year',
      params: {
        metric: 'sales',
        view: view === 'myview' ? 'my' : view,
        date: dateString,
        prptype,
      },
    });
  };

  const openFullReport = extra => {
    router.push({
      pathname: '/new/(tabs)/reports/sales-flow',
      params: {
        view: view === 'myview' ? 'my' : view,
        date: dateString,
        report_month: String(dateString || '').slice(0, 7).replace('-', ''),
        expected_month: String(dateString || '').slice(0, 7).replace('-', ''),
        prptype,
        level: LEVEL_BY_DIMENSION[dimension] || 'categories',
        source_dimension: dimension,
        /*
         * Header Full Report is authoritative and therefore does not inherit
         * a preview-table total. Expanded-row View Full Report passes its own
         * parent amount/qty through `extra` for reconciliation.
         */
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
        subtitle={coverageSubtitle(sales?.period)}
        badgeAction={`FY ${financialYearShortLabel(dateString)}`}
        onBadgeAction={openFinancialYear}
        action="Full report"
        onAction={() => openFullReport()}
      />

      <View style={styles.summaryRow}>
        <View style={styles.summaryBlock}>
          <Text style={styles.summaryLabel}>TODAY</Text>
          <Text style={styles.todayValue}>{cleanAmount(sales?.total?.today, amountMode)}</Text>
        </View>
        <View style={styles.summaryBlock}>
          <Text style={styles.summaryLabel}>THIS MONTH</Text>
          <Text style={styles.monthValue}>{cleanAmount(sales?.total?.mtd, amountMode)}</Text>
        </View>
      </View>

      <InteractiveSalesChart dailyTrend={dailyTrend} amountMode={amountMode} />

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
        {/* <Text style={styles.columnMetric}>QTY   AMOUNT</Text> */}
        <TouchableOpacity onPress={toggleSort}>
          <Text style={styles.columnMetric}>
            QTY   AMOUNT ▼
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.salesRowsScroll} nestedScrollEnabled showsVerticalScrollIndicator>
      {/* {rows.map((row, index) => { */}
      {sortedRows.map((row, index) => {
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
              {dimension !== 'executive' && <View style={[styles.rankDot, { backgroundColor: ['#255C85', '#7440B7', '#168274', '#2563EB', '#B55E10', '#0A9B6C', '#D98200'][index % 7] }]} />}
              <Text numberOfLines={1} style={styles.parentName}>{row.name}</Text>
              <MetricValue quantity={row.mtd_qty} amount={row.mtd_amount} amountMode={amountMode} />
            </TouchableOpacity>

            {expanded && (
              <View style={styles.expandedBody}>
                {childEntries.map(([childType, childRows]) => (
                  <ChildSection key={childType} type={childType} rows={childRows} amountMode={amountMode} />
                ))}
                <TouchableOpacity
                  accessibilityRole="link"
                  onPress={() => openFullReport({
                    level: NEXT_LEVEL_BY_DIMENSION[dimension] || 'categories',
                    [`${dimension}_code`]: row.code,
                    [`${dimension}_name`]: row.name,
                    expected_amount: String(Number(row?.mtd_amount || 0)),
                    expected_qty: String(Number(row?.mtd_qty || 0)),
                    expected_generated_at: String(sales?.generated_at || ''),
                  })}
                >
                  <Text style={styles.fullLink}>View full report ›</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        );
      })}

      </ScrollView>
      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>Total</Text>
        <MetricValue
          // quantity={rows.reduce((sum, row) => sum + Number(row.mtd_qty || 0), 0)}
          quantity={sortedRows.reduce(
            (sum, row) => sum + Number(row.mtd_qty || 0),
            0
          )}
          // amount={rows.reduce((sum, row) => sum + Number(row.mtd_amount || 0), 0)}
          amount={sortedRows.reduce(
            (sum, row) => sum + Number(row.mtd_amount || 0),
            0
          )}
          amountMode={amountMode}
        />
      </View>
      <Text style={styles.footerNote}>Toggle the view · tap any row to expand its breakdown. Qty in metres, amount in ₹.</Text>
    </SectionCard>
  );
}

const styles = StyleSheet.create({
  salesRowsScroll: { height: 280, maxHeight: 280, flexGrow: 0 },
  summaryRow: { flexDirection: 'row', paddingHorizontal: 14, paddingTop: 12, paddingBottom: 6 },
  summaryBlock: { flex: 1 },
  summaryLabel: { fontSize: 9, letterSpacing: 1.1, color: '#8C837B', fontWeight: '700' },
  todayValue: { marginTop: 3, fontSize: 17, color: '#16633C', fontWeight: '800' },
  monthValue: { marginTop: 3, fontSize: 17, color: '#121417', fontWeight: '800' },
  chartWrap: { paddingHorizontal: 12, paddingBottom: 6, overflow: 'visible' },
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
