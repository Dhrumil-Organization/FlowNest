import { T } from '@/src/theme';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

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

type TrendPoint = {
  label: string;
  value: number;
};

type CategoryRow = {
  itmcode?: string | number | null;
  name?: string;
  today_meters?: number;
  mtd_meters?: number;
  share_pct?: number;
  unresolved?: boolean;
};

function points(source: any): TrendPoint[] {
  if (!Array.isArray(source)) {
    return [];
  }

  return source
    .map((x: any, i: number) => ({
      label: String(
        x?.day ??
          x?.month ??
          x?.label ??
          x?.date ??
          i + 1,
      ),
      value: Number(
        x?.meters ??
          x?.qty ??
          x?.value ??
          x?.production_mtr ??
          0,
      ),
    }))
    .filter(
      point =>
        point.label.trim() !== '' &&
        Number.isFinite(point.value),
    );
}

function axisLabelIndexes(length: number): Set<number> {
  if (length <= 0) {
    return new Set();
  }

  if (length <= 7) {
    return new Set(Array.from({ length }, (_, i) => i));
  }

  const desiredLabels = 6;
  const step = Math.max(1, Math.ceil((length - 1) / (desiredLabels - 1)));
  const indexes = new Set<number>();

  for (let i = 0; i < length; i += step) {
    indexes.add(i);
  }

  indexes.add(length - 1);

  return indexes;
}

export default function ProductionMachineReportScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const machine = useMemo(
    () => parseJson(params.machine, {}),
    [params.machine],
  );

  const today = Number(
    machine?.target ??
      machine?.today_meters ??
      0,
  );

  const mtd = Number(
    machine?.today ??
      machine?.mtd_meters ??
      0,
  );

  const share = Number(machine?.share || 0);

  const daily = useMemo(
    () => points(machine?.daily_trend || machine?.trend),
    [machine],
  );

  const monthly = useMemo(
    () => points(machine?.month_by_month || machine?.monthly_trend),
    [machine],
  );

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.breadcrumb}>
          <TouchableOpacity
            style={s.back}
            onPress={() => router.back()}
            activeOpacity={0.75}
          >
            <Text style={s.backText}>‹</Text>
          </TouchableOpacity>

          <Text style={s.crumb} numberOfLines={1}>
            Owner › {machine.machine || 'Machine'}
          </Text>
        </View>

        <View style={s.summary}>
          <View style={s.titleRow}>
            <View style={s.icon}>
              <Text style={s.iconText}>⚙️</Text>
            </View>

            <View style={{ flex: 1 }}>
              <Text style={s.title} numberOfLines={2}>
                {machine.machine || 'Production unit'}
              </Text>

              <Text style={s.sub}>
                Production unit · Rank #{machine.rank || 0} of{' '}
                {machine.total_machine_count || 0}
              </Text>
            </View>

            <View style={s.shareBadge}>
              <Text style={s.shareValue}>{share.toFixed(1)}%</Text>
              <Text style={s.shareLabel}>of output</Text>
            </View>
          </View>

          <View style={s.kpiRow}>
            <Kpi label="YESTERDAY" value={meters(today)} />
            <Kpi label="THIS MONTH" value={meters(mtd)} />
            <Kpi label="SHARE" value={`${share.toFixed(1)}%`} />
          </View>
        </View>

        <CategorySummaryCard
          title="▦  CATEGORY MIX"
          rows={machine?.by_category || []}
          totalMtd={mtd}
          reconciliation={machine?.category_reconciliation}
        />

        <ChartCard
          title="⚙  PRODUCTION TREND"
          leftLabel="YESTERDAY"
          leftValue={meters(today)}
          rightLabel="THIS MONTH"
          rightValue={meters(mtd)}
          data={daily}
          mode="line"
          emptyText="Daily production trend is not available for this machine."
        />

        <ChartCard
          title="▥  MONTH BY MONTH"
          data={monthly}
          mode="bar"
          emptyText="Month-by-month production trend is not available for this machine."
        />
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
      <View style={s.purpleHeader}>
        <Text style={s.headerText}>{title}</Text>
      </View>

      {safeRows.length === 0 ? (
        <View style={s.emptyState}>
          <Text style={s.emptyTitle}>No category data</Text>
          <Text style={s.emptyText}>
            No Item/category summary is available for this production unit.
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
            <Text style={s.categoryTotalLabel}>MACHINE TOTAL</Text>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={s.categoryTotalValue}>{meters(totalMtd)}</Text>
              <Text style={s.categoryTotalShare}>100.0%</Text>
            </View>
          </View>

          <View style={s.reconcileBox}>
            <Text style={s.reconcileText}>
              {reconciled
                ? '✓ Category mix reconciled with machine production'
                : '⚠ Category mix does not reconcile with machine production'}
            </Text>

            {unresolved > 0 ? (
              <Text style={s.unresolvedText}>
                {meters(unresolved)} unresolved ({unresolvedPct.toFixed(2)}%)
                is included in this machine total.
              </Text>
            ) : null}
          </View>
        </>
      )}
    </View>
  );
}

function Kpi({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View style={s.kpi}>
      <Text style={s.kpiLabel}>{label}</Text>
      <Text style={s.kpiValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function ChartCard({
  title,
  data,
  mode,
  leftLabel,
  leftValue,
  rightLabel,
  rightValue,
  emptyText,
}: {
  title: string;
  data: TrendPoint[];
  mode: 'line' | 'bar';
  leftLabel?: string;
  leftValue?: string;
  rightLabel?: string;
  rightValue?: string;
  emptyText: string;
}) {
  const hasData = data.length > 0;

  return (
    <View style={s.card}>
      <View style={s.purpleHeader}>
        <Text style={s.headerText}>{title}</Text>
      </View>

      {(leftLabel || rightLabel) && (
        <View style={s.chartKpis}>
          <View>
            {!!leftLabel && <Text style={s.label}>{leftLabel}</Text>}
            {!!leftValue && <Text style={s.valuePurple}>{leftValue}</Text>}
          </View>

          <View style={{ alignItems: 'flex-end' }}>
            {!!rightLabel && <Text style={s.label}>{rightLabel}</Text>}
            {!!rightValue && <Text style={s.value}>{rightValue}</Text>}
          </View>
        </View>
      )}

      {!hasData ? (
        <View style={s.emptyState}>
          <Text style={s.emptyTitle}>No trend data</Text>
          <Text style={s.emptyText}>{emptyText}</Text>
        </View>
      ) : mode === 'line' ? (
        <LineTrend data={data} />
      ) : (
        <BarTrend data={data} />
      )}
    </View>
  );
}

function LineTrend({ data }: { data: TrendPoint[] }) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const chartHeight = 112;
  const graphTop = 28;
  const graphBottom = 86;
  const graphHeight = graphBottom - graphTop;
  const sidePadding = 22;
  const pointGap = 56;

  const contentWidth = Math.max(
    320,
    sidePadding * 2 + Math.max(0, data.length - 1) * pointGap,
  );

  const values = data.map(item => Number(item.value || 0));
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = Math.max(1, max - min);

  const coords = data.map((point, index) => {
    const normalized = (Number(point.value || 0) - min) / range;

    return {
      x:
        data.length === 1
          ? contentWidth / 2
          : sidePadding + index * pointGap,
      y: graphBottom - normalized * graphHeight,
    };
  });

  const selected =
    selectedIndex !== null && data[selectedIndex]
      ? {
          ...data[selectedIndex],
          ...coords[selectedIndex],
        }
      : null;

  return (
    <View style={s.lineChartOuter}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator
        nestedScrollEnabled
        bounces={false}
        contentContainerStyle={{ width: contentWidth }}
      >
        <View style={{ width: contentWidth }}>
          <View style={[s.linePlot, { height: chartHeight, width: contentWidth }]}>
            <View
              style={[
                s.lineBaseline,
                {
                  top: graphBottom,
                  left: sidePadding,
                  right: sidePadding,
                },
              ]}
            />

            {coords.slice(0, -1).map((current, index) => {
              const next = coords[index + 1];
              const dx = next.x - current.x;
              const dy = next.y - current.y;
              const length = Math.sqrt(dx * dx + dy * dy);
              const angle = Math.atan2(dy, dx) * (180 / Math.PI);

              return (
                <View
                  key={`segment-${index}`}
                  pointerEvents="none"
                  style={[
                    s.lineSegment,
                    {
                      left: (current.x + next.x) / 2 - length / 2,
                      top: (current.y + next.y) / 2 - 1.25,
                      width: length,
                      transform: [{ rotateZ: `${angle}deg` }],
                    },
                  ]}
                />
              );
            })}

            {selected && (
              <View
                pointerEvents="none"
                style={[
                  s.pointTooltip,
                  {
                    left: Math.max(
                      2,
                      Math.min(contentWidth - 92, selected.x - 44),
                    ),
                    top: Math.max(0, selected.y - 38),
                  },
                ]}
              >
                <Text style={s.pointTooltipValue} numberOfLines={1}>
                  {meters(selected.value)}
                </Text>
              </View>
            )}

            {coords.map((point, index) => {
              const active = selectedIndex === index;

              return (
                <TouchableOpacity
                  key={`dot-${data[index].label}-${index}`}
                  activeOpacity={0.7}
                  onPress={() => setSelectedIndex(index)}
                  style={[
                    s.lineTouch,
                    {
                      left: point.x - 18,
                      top: point.y - 18,
                    },
                  ]}
                >
                  <View
                    style={[
                      s.lineDot,
                      active && s.lineDotActive,
                    ]}
                  />
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={[s.lineAxisLayer, { width: contentWidth }]}>
            {data.map((point, index) => (
              <Text
                key={`${point.label}-${index}`}
                style={[
                  s.axisLabelAbsolute,
                  {
                    left: coords[index].x - 18,
                  },
                ]}
                numberOfLines={1}
              >
                {point.label}
              </Text>
            ))}
          </View>
        </View>
      </ScrollView>

      <Text style={s.scrollHint}>Swipe horizontally · tap a point for value</Text>
    </View>
  );
}

function BarTrend({ data }: { data: TrendPoint[] }) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const max = Math.max(
    1,
    ...data.map(item => Number(item.value || 0)),
  );

  return (
    <View>
      {selectedIndex !== null && data[selectedIndex] ? (
        <View style={s.barSelectedValue}>
          <Text style={s.barSelectedMonth}>{data[selectedIndex].label}</Text>
          <Text style={s.barSelectedMeters}>
            {meters(data[selectedIndex].value)}
          </Text>
        </View>
      ) : null}

      <View style={s.chart}>
        {data.map((point, index) => {
          const barHeight = Math.max(
            4,
            (Number(point.value || 0) / max) * 58,
          );

          const active = selectedIndex === index;

          return (
            <TouchableOpacity
              key={`${point.label}-${index}`}
              style={s.pointCol}
              activeOpacity={0.7}
              onPress={() => setSelectedIndex(index)}
            >
              <View
                style={[
                  s.bar,
                  { height: barHeight },
                  active && s.barActive,
                ]}
              />
              <Text style={s.axisLabel} numberOfLines={1}>
                {point.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={s.scrollHint}>Tap a month for value</Text>
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
    flex: 1,
  },
  summary: {
    backgroundColor: '#fff',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: T.border,
    padding: 14,
    marginBottom: 14,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  icon: {
    width: 44,
    height: 44,
    borderRadius: 11,
    backgroundColor: '#F4EDF6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    fontSize: 22,
  },
  title: {
    color: T.nav,
    fontSize: 17,
    fontWeight: '900',
  },
  sub: {
    color: T.muted,
    fontSize: 10,
    marginTop: 3,
  },
  shareBadge: {
    backgroundColor: '#F4EDF6',
    borderRadius: 12,
    minWidth: 70,
    paddingHorizontal: 9,
    paddingVertical: 9,
    alignItems: 'center',
  },
  shareValue: {
    color: '#6D287F',
    fontSize: 15,
    fontWeight: '900',
  },
  shareLabel: {
    color: T.muted,
    fontSize: 8,
    marginTop: 2,
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
    fontSize: 14,
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
  purpleHeader: {
    backgroundColor: '#6D287F',
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  headerText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.4,
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
  chartKpis: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingTop: 13,
  },
  label: {
    color: T.muted,
    fontSize: 8,
    fontWeight: '900',
  },
  value: {
    color: T.nav,
    fontSize: 17,
    fontWeight: '900',
    marginTop: 5,
  },
  valuePurple: {
    color: '#6D287F',
    fontSize: 17,
    fontWeight: '900',
    marginTop: 5,
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
  lineChartOuter: {
    paddingTop: 8,
    paddingBottom: 8,
  },
  linePlot: {
    position: 'relative',
  },
  lineBaseline: {
    position: 'absolute',
    height: 1,
    backgroundColor: T.border,
  },
  lineTouch: {
    position: 'absolute',
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 4,
  },
  lineDot: {
    width: 8,
    height: 8,
    borderRadius: 5,
    backgroundColor: '#6D287F',
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  lineDotActive: {
    width: 12,
    height: 12,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#6D287F',
    backgroundColor: '#fff',
  },
  lineSegment: {
    position: 'absolute',
    height: 2.5,
    borderRadius: 2,
    backgroundColor: '#6D287F',
    zIndex: 1,
  },
  pointTooltip: {
    position: 'absolute',
    width: 88,
    paddingHorizontal: 7,
    paddingVertical: 5,
    borderRadius: 7,
    backgroundColor: '#102235',
    alignItems: 'center',
    zIndex: 6,
  },
  pointTooltipValue: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '900',
  },
  lineAxisLayer: {
    position: 'relative',
    height: 20,
  },
  axisLabelAbsolute: {
    position: 'absolute',
    width: 36,
    textAlign: 'center',
    color: T.muted,
    fontSize: 8,
  },
  chart: {
    height: 104,
    paddingHorizontal: 10,
    paddingTop: 14,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  pointCol: {
    flex: 1,
    minWidth: 0,
    height: 82,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  bar: {
    width: 7,
    minHeight: 4,
    borderRadius: 4,
    backgroundColor: '#245F84',
  },
  barActive: {
    width: 10,
  },
  barSelectedValue: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingTop: 11,
    paddingHorizontal: 14,
  },
  barSelectedMonth: {
    color: T.muted,
    fontSize: 9,
    fontWeight: '800',
  },
  barSelectedMeters: {
    color: '#245F84',
    fontSize: 12,
    fontWeight: '900',
  },
  axisLabel: {
    color: T.muted,
    fontSize: 7,
    marginTop: 5,
    textAlign: 'center',
  },
  scrollHint: {
    color: T.muted,
    fontSize: 8,
    textAlign: 'center',
    paddingHorizontal: 12,
    paddingBottom: 7,
  },
});
