import { T } from '@/src/theme';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  LayoutChangeEvent,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  ReportContainer,
  SplitPane,
  useReportLayout,
} from '@/src/components/dashboard/ResponsiveReport';

function parseJson(value: string | string[] | undefined, fallback: any) {
  try {
    const raw = Array.isArray(value) ? value[0] : value;
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function meters(value: number) {
  const n = Number(value || 0);

  if (Math.abs(n) >= 100000) {
    return `${(n / 100000).toFixed(2)} L m`;
  }

  if (Math.abs(n) >= 1000) {
    return `${(n / 1000).toFixed(1)} K m`;
  }

  return `${n.toLocaleString('en-IN', {
    maximumFractionDigits: 2,
  })} m`;
}

type DailyTrendPoint = {
  day: string;
  meters: number;
};

type CategoryRow = {
  itmcode?: string | number | null;
  name?: string;
  today_meters?: number;
  mtd_meters?: number;
  share_pct?: number;
  unresolved?: boolean;
};

export default function ProductionReportScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const layout = useReportLayout();

  const production = useMemo(
    () =>
      parseJson(params.production, {
        total: {},
        daily_trend: [],
        by_machine: [],
        by_category: [],
        category_reconciliation: {},
      }),
    [params.production],
  );

  const date = Array.isArray(params.date) ? params.date[0] : params.date;

  const dailyTrend: DailyTrendPoint[] = useMemo(() => {
    if (!Array.isArray(production?.daily_trend)) {
      return [];
    }

    return production.daily_trend
      .map((row: any, index: number) => ({
        day: String(row?.day ?? index + 1),
        meters: Number(row?.meters ?? 0),
      }))
      .filter(
        (row: DailyTrendPoint) =>
          row.day.trim() !== '' && Number.isFinite(row.meters),
      );
  }, [production]);

  const openMachine = (machine: any, index: number) => {
    const mtd = Number(machine?.today || machine?.mtd_meters || 0);
    const totalMtd = Number(production?.total?.mtd_meters || 0);

    router.push({
      pathname: '/new/(tabs)/reports/production-machine',
      params: {
        date: date || '',
        machine: JSON.stringify({
          ...machine,
          rank: index + 1,
          share: totalMtd > 0 ? (mtd / totalMtd) * 100 : 0,
          total_machine_count: production?.by_machine?.length || 0,
        }),
      },
    });
  };

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >
        <ReportContainer onLayout={layout.onLayout}>
        <View style={s.breadcrumb}>
          <TouchableOpacity
            style={s.back}
            onPress={() => router.back()}
            activeOpacity={0.75}
          >
            <Text style={s.backText}>‹</Text>
          </TouchableOpacity>

          <Text style={s.crumb}>Owner › Production</Text>
        </View>

        <View style={s.summary}>
          <Text style={s.title}>Production · company</Text>
          <Text style={s.sub}>
            All machine groups · {date || 'selected date'}
          </Text>

          <View style={s.kpiRow}>
            <Kpi
              label="YESTERDAY"
              value={meters(production?.total?.today_meters)}
            />
            <Kpi
              label="THIS MONTH"
              value={meters(production?.total?.mtd_meters)}
            />
            <Kpi
              label="MACHINES"
              value={String(production?.by_machine?.length || 0)}
            />
          </View>
        </View>

        <SplitPane
          layout={layout}
          ratio={layout.wide ? 0.55 : 0.5}
          left={
        <View style={s.card}>
          <View style={s.cardHeader}>
            <Text style={s.cardHeaderText}>⚙  BY MACHINE</Text>
          </View>

          <View style={s.tableHead}>
            <Text style={[s.th, { flex: 1 }]}>MACHINE</Text>
            <Text style={s.th}>YESTERDAY</Text>
            <Text style={s.th}>MONTH</Text>
          </View>

          {(production?.by_machine || []).map((m: any, index: number) => (
            <TouchableOpacity
              key={`${m.prpcode || ''}-${m.macgrp || ''}-${index}`}
              style={s.row}
              onPress={() => openMachine(m, index)}
              activeOpacity={0.75}
            >
              <Text style={[s.machine, { flex: 1 }]} numberOfLines={1}>
                {m.machine}
              </Text>
              <Text style={s.today}>
                {meters(m.target || m.today_meters)}
              </Text>
              <Text style={s.month}>
                {meters(m.today || m.mtd_meters)}
              </Text>
              <Text style={s.chevron}>›</Text>
            </TouchableOpacity>
          ))}
        </View>
          }
          right={
        <CategorySummaryCard
          title="▦  BY CATEGORY (ITEM)"
          rows={production?.by_category || []}
          totalMtd={Number(production?.total?.mtd_meters || 0)}
          reconciliation={production?.category_reconciliation}
        />
          }
        />

        <View style={s.card}>
          <View style={s.cardHeader}>
            <Text style={s.cardHeaderText}>▥  PRODUCTION TREND</Text>
          </View>

          {dailyTrend.length > 0 ? (
            <ScrollableDailyBars data={dailyTrend} />
          ) : (
            <View style={s.emptyState}>
              <Text style={s.emptyTitle}>No trend data</Text>
              <Text style={s.emptyText}>
                Daily production trend is not available for this period.
              </Text>
            </View>
          )}
        </View>
        </ReportContainer>
      </ScrollView>
    </SafeAreaView>
  );
}

function CategorySummaryCard({
  title,
  rows,
  totalMtd,
  reconciliation,
}: {
  title: string;
  rows: CategoryRow[];
  totalMtd: number;
  reconciliation?: any;
}) {
  const safeRows = Array.isArray(rows) ? rows : [];
  const unresolved = Number(reconciliation?.unresolved_meters || 0);
  const unresolvedPct = Number(reconciliation?.unresolved_pct || 0);
  const reconciled = reconciliation?.is_reconciled !== false;

  return (
    <View style={s.card}>
      <View style={s.cardHeader}>
        <Text style={s.cardHeaderText}>{title}</Text>
      </View>

      {safeRows.length === 0 ? (
        <View style={s.emptyState}>
          <Text style={s.emptyTitle}>No category data</Text>
          <Text style={s.emptyText}>
            Item/category production summary is not available for this period.
          </Text>
        </View>
      ) : (
        <>
          {safeRows.map((row, index) => (
            <View
              key={`${String(row?.itmcode ?? 'unresolved')}-${index}`}
              style={s.categoryRow}
            >
              <View style={s.categoryLeft}>
                <Text
                  style={[
                    s.categoryName,
                    row?.unresolved && s.categoryUnresolved,
                  ]}
                  numberOfLines={2}
                >
                  {row?.name || 'UNRESOLVED ITEM'}
                </Text>

                <Text style={s.categoryMeta} numberOfLines={1}>
                  {row?.unresolved
                    ? 'Item not resolved · included in total'
                    : `Item ${String(row?.itmcode ?? '')}`}
                </Text>
              </View>

              <View style={s.categoryRight}>
                <Text style={s.categoryMtd}>
                  {meters(Number(row?.mtd_meters || 0))}
                </Text>
                <Text style={s.categoryDetail}>
                  Yday {meters(Number(row?.today_meters || 0))} ·{' '}
                  {Number(row?.share_pct || 0).toFixed(1)}%
                </Text>
              </View>
            </View>
          ))}

          <View style={s.categoryTotalRow}>
            <Text style={s.categoryTotalLabel}>TOTAL</Text>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={s.categoryTotalValue}>{meters(totalMtd)}</Text>
              <Text style={s.categoryTotalShare}>100.0%</Text>
            </View>
          </View>

          <View style={s.reconcileBox}>
            <Text style={s.reconcileText}>
              {reconciled
                ? '✓ Category total reconciled with production'
                : '⚠ Category total does not reconcile with production'}
            </Text>

            {unresolved > 0 ? (
              <Text style={s.unresolvedText}>
                {meters(unresolved)} unresolved ({unresolvedPct.toFixed(2)}%)
                is included so the total remains complete.
              </Text>
            ) : null}
          </View>
        </>
      )}
    </View>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.kpi}>
      <Text style={s.kpiLabel}>{label}</Text>
      <Text style={s.kpiValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function ScrollableDailyBars({ data }: { data: DailyTrendPoint[] }) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  // UI only: measured width so bars spread across wide screens
  const [availWidth, setAvailWidth] = useState(0);
  const onTrendLayout = (e: LayoutChangeEvent) => {
    const w = Math.round(e.nativeEvent.layout.width);
    setAvailWidth(prev => (Math.abs(prev - w) > 1 ? w : prev));
  };

  const max = Math.max(
    1,
    ...data.map(row => Number(row.meters || 0)),
  );

  const pointWidth =
    data.length > 0 ? Math.max(48, Math.floor(availWidth / data.length)) : 48;
  const contentWidth = Math.max(320, data.length * pointWidth);

  const selected =
    selectedIndex !== null && data[selectedIndex]
      ? data[selectedIndex]
      : null;

  return (
    <View style={s.trendWrap} onLayout={onTrendLayout}>
      {selected ? (
        <View style={s.selectedTrendValue}>
          <Text style={s.selectedTrendDay}>DAY {selected.day}</Text>
          <Text style={s.selectedTrendMeters}>{meters(selected.meters)}</Text>
        </View>
      ) : null}

      <ScrollView
        horizontal
        nestedScrollEnabled
        bounces={false}
        showsHorizontalScrollIndicator
        contentContainerStyle={{ width: contentWidth }}
      >
        <View style={[s.trend, { width: contentWidth }]}>
          {data.map((d, index) => {
            const height = Math.max(
              4,
              (Number(d.meters || 0) / max) * 86,
            );

            const active = selectedIndex === index;

            return (
              <TouchableOpacity
                key={`${d.day}-${index}`}
                style={[s.barCol, { width: pointWidth }]}
                activeOpacity={0.7}
                onPress={() => setSelectedIndex(index)}
              >
                <View
                  style={[
                    s.bar,
                    { height },
                    active && s.barActive,
                  ]}
                />
                <Text style={s.day}>{d.day}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      <Text style={s.scrollHint}>Swipe horizontally · tap a day for value</Text>
    </View>
  );
}

const s = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: T.bg,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  breadcrumb: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  back: {
    width: 34,
    height: 34,
    borderRadius: 9,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: T.border,
  },
  backText: {
    fontSize: 24,
    color: T.nav,
    marginTop: -2,
  },
  crumb: {
    marginLeft: 10,
    color: T.nav,
    fontSize: 12,
    fontWeight: '800',
  },
  summary: {
    backgroundColor: '#fff',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: T.border,
    padding: 15,
    marginBottom: 14,
  },
  title: {
    color: T.nav,
    fontSize: 18,
    fontWeight: '900',
  },
  sub: {
    color: T.muted,
    fontSize: 11,
    marginTop: 3,
  },
  kpiRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 13,
  },
  kpi: {
    flex: 1,
    minWidth: 0,
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 11,
    padding: 10,
  },
  kpiLabel: {
    color: T.muted,
    fontSize: 8,
    fontWeight: '900',
  },
  kpiValue: {
    color: '#6D287F',
    fontSize: 15,
    fontWeight: '900',
    marginTop: 5,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: T.border,
    overflow: 'hidden',
    marginBottom: 14,
  },
  cardHeader: {
    backgroundColor: '#6D287F',
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  cardHeaderText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  tableHead: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
  },
  th: {
    width: 84,
    textAlign: 'right',
    color: T.muted,
    fontSize: 8,
    fontWeight: '900',
  },
  row: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
  },
  machine: {
    color: T.nav,
    fontSize: 12,
    fontWeight: '800',
  },
  today: {
    width: 84,
    textAlign: 'right',
    color: '#6D287F',
    fontSize: 11,
    fontWeight: '900',
  },
  month: {
    width: 84,
    textAlign: 'right',
    color: T.nav,
    fontSize: 11,
    fontWeight: '900',
  },
  chevron: {
    width: 17,
    textAlign: 'right',
    color: '#6D287F',
    fontSize: 20,
    fontWeight: '900',
  },
  categoryRow: {
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
  },
  categoryLeft: {
    flex: 1,
    minWidth: 0,
    paddingRight: 10,
  },
  categoryRight: {
    minWidth: 118,
    alignItems: 'flex-end',
  },
  categoryName: {
    color: T.nav,
    fontSize: 12,
    fontWeight: '900',
  },
  categoryUnresolved: {
    color: '#A85B00',
  },
  categoryMeta: {
    color: T.muted,
    fontSize: 8,
    marginTop: 4,
  },
  categoryMtd: {
    color: '#6D287F',
    fontSize: 12,
    fontWeight: '900',
  },
  categoryDetail: {
    color: T.muted,
    fontSize: 8,
    marginTop: 4,
  },
  categoryTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 11,
    backgroundColor: '#F8F5F1',
  },
  categoryTotalLabel: {
    color: T.nav,
    fontSize: 10,
    fontWeight: '900',
  },
  categoryTotalValue: {
    color: T.nav,
    fontSize: 13,
    fontWeight: '900',
  },
  categoryTotalShare: {
    color: T.muted,
    fontSize: 8,
    marginTop: 2,
  },
  reconcileBox: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: T.border,
  },
  reconcileText: {
    color: '#236A4A',
    fontSize: 9,
    fontWeight: '800',
  },
  unresolvedText: {
    color: '#A85B00',
    fontSize: 8,
    lineHeight: 12,
    marginTop: 4,
  },
  trendWrap: {
    paddingTop: 8,
    paddingBottom: 7,
  },
  trend: {
    height: 132,
    paddingHorizontal: 0,
    paddingTop: 14,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  barCol: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: 108,
  },
  bar: {
    width: 5,
    minHeight: 4,
    borderRadius: 3,
    backgroundColor: '#6D287F',
  },
  barActive: {
    width: 9,
  },
  day: {
    color: T.muted,
    fontSize: 8,
    marginTop: 6,
  },
  selectedTrendValue: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingTop: 4,
  },
  selectedTrendDay: {
    color: T.muted,
    fontSize: 8,
    fontWeight: '900',
  },
  selectedTrendMeters: {
    color: '#6D287F',
    fontSize: 12,
    fontWeight: '900',
  },
  scrollHint: {
    color: T.muted,
    fontSize: 8,
    textAlign: 'center',
    paddingHorizontal: 12,
    paddingTop: 2,
  },
  emptyState: {
    paddingHorizontal: 14,
    paddingVertical: 24,
    alignItems: 'center',
  },
  emptyTitle: {
    color: T.nav,
    fontSize: 12,
    fontWeight: '900',
  },
  emptyText: {
    color: T.muted,
    fontSize: 10,
    lineHeight: 15,
    marginTop: 5,
    textAlign: 'center',
  },
});
