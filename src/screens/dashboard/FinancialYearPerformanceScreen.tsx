import { api } from '@/src/screens/dashboard/employ/api/api';
import { useDashboardAmountMode, formatDashboardAmount } from '@/src/components/dashboard/AmountDisplayModeControl';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import Svg, { Circle, Line, Polyline } from 'react-native-svg';

type FyMonth = {
  month: string;
  month_key: string;
  label: string;
  available: boolean;
  amount: number | null;
  qty: number | null;
  bills: number | null;
  avg_rate: number | null;
};

type FyLine = {
  month_key?: string;
  category_code?: string;
  category_name?: string;
  design_code?: string;
  design_name?: string;
  party_code?: string;
  party_name?: string;
  executive_code?: string;
  executive_name?: string;
  qty?: number;
  amount?: number;
};

type FyReport = {
  from_date?: number;
  to_date?: number;
  total?: { amount?: number; qty?: number; bills?: number; avg_rate?: number };
  months?: FyMonth[];
  dimensions?: Record<string, any[]>;
  lines?: FyLine[];
  status?: string;
  is_fallback?: boolean;
  details_loaded?: boolean;
  message?: string | null;
  generated_at?: string;
};

type YearSpec = {
  startYear: number;
  id: string;
  fromDate: string;
  toDate: string;
  fullEndDate: string;
  isCurrent: boolean;
};

type LoadedYear = YearSpec & {
  report: FyReport;
};

type DetailPath = { dim: DimensionKey; code: string; name: string };
type DimensionKey = 'executive' | 'party' | 'category' | 'design';

type GroupRow = { code: string; name: string; amount: number; qty: number; count: number };

const C = {
  bg: '#F5F2EE',
  card: '#FFFFFF',
  border: '#E5E0DA',
  hair: '#EFEAE4',
  ink: '#1A1514',
  mut: '#7C746C',
  faint: '#9A9590',
  owner: '#0D1B2A',
  bill: '#3A568A',
  today: '#2A6044',
  over: '#B23A2A',
  amber: '#C98A1A',
  grey1: '#C9C2BA',
  grey2: '#8A8580',
};

const DIMENSIONS: Array<{ key: DimensionKey; label: string; code: keyof FyLine; name: keyof FyLine }> = [
  { key: 'executive', label: 'Executive', code: 'executive_code', name: 'executive_name' },
  { key: 'party', label: 'Customer', code: 'party_code', name: 'party_name' },
  { key: 'category', label: 'Category', code: 'category_code', name: 'category_name' },
  { key: 'design', label: 'Design', code: 'design_code', name: 'design_name' },
];

const one = (value: any): string => Array.isArray(value) ? String(value[0] ?? '') : String(value ?? '');
const n = (value: any): number => {
  const x = Number(value ?? 0);
  return Number.isFinite(x) ? x : 0;
};
const pad2 = (value: number) => String(value).padStart(2, '0');

const parseYmd = (value: string): Date => {
  const m = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return new Date();
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
};

const toYmd = (value: Date): string =>
  `${value.getFullYear()}-${pad2(value.getMonth() + 1)}-${pad2(value.getDate())}`;


const fyStartYearOf = (value: string): number => {
  const d = parseYmd(value);
  return d.getMonth() + 1 >= 4 ? d.getFullYear() : d.getFullYear() - 1;
};

const fyId = (startYear: number): string => `${startYear}-${String(startYear + 1).slice(-2)}`;
const fyLabel = (startYear: number): string => `FY ${fyId(startYear)}`;
const fyRange = (startYear: number): string => `Apr ${startYear} – Mar ${startYear + 1}`;
const fyStartDate = (startYear: number): string => `${startYear}-04-01`;
const fyEndDate = (startYear: number): string => `${startYear + 1}-03-31`;

const monthDate = (startYear: number, index: number): { year: number; month: number; key: string; label: string } => {
  const raw = 4 + index;
  const year = raw > 12 ? startYear + 1 : startYear;
  const month = raw > 12 ? raw - 12 : raw;
  const label = new Date(year, month - 1, 1).toLocaleDateString('en-IN', { month: 'short' });
  return { year, month, key: `${year}-${pad2(month)}`, label };
};

const monthPeriod = (startYear: number, index: number, anchorDate: string, isCurrent: boolean) => {
  const m = monthDate(startYear, index);
  const first = `${m.key}-01`;
  const lastDay = new Date(m.year, m.month, 0).getDate();
  let last = `${m.key}-${pad2(lastDay)}`;
  if (isCurrent && String(anchorDate).slice(0, 7) === m.key) last = anchorDate;
  return { ...m, first, last, ym: m.key.replace('-', '') };
};

const formatQty = (value: any): string => {
  const x = n(value);
  if (Math.abs(x) >= 100000) return `${(x / 100000).toFixed(1)} L m`;
  if (Math.abs(x) >= 1000) return `${(x / 1000).toFixed(1)} K m`;
  return `${x.toLocaleString('en-IN', { maximumFractionDigits: 1 })} m`;
};

const formatCount = (value: any): string => Math.round(n(value)).toLocaleString('en-IN');
const formatRate = (value: any): string => `₹${n(value).toLocaleString('en-IN', { maximumFractionDigits: 0 })}/m`;
const pctChange = (a: number, b: number): number | null => b !== 0 ? ((a - b) / b) * 100 : null;
const pctText = (value: number | null): string => value == null ? '—' : `${value >= 0 ? '+' : '−'}${Math.abs(Math.round(value))}%`;

const availableMonths = (report?: FyReport): FyMonth[] => (report?.months || []).filter(m => m?.available !== false);
const monthMetric = (report: FyReport | undefined, index: number, field: 'amount' | 'qty' | 'bills'): number => {
  const row = report?.months?.[index];
  if (!row || row.available === false) return 0;
  return n(row[field]);
};

const fullMetric = (report: FyReport | undefined, field: 'amount' | 'qty' | 'bills'): number => {
  if (field === 'amount') return n(report?.total?.amount);
  if (field === 'qty') return n(report?.total?.qty);
  return n(report?.total?.bills);
};

const averageMonths = (report: FyReport | undefined, maxMonthIndex: number | null = null): number => {
  const months = (report?.months || []).filter((row, index) => row?.available !== false && (maxMonthIndex == null || index <= maxMonthIndex));
  return months.length ? months.reduce((sum, row) => sum + n(row.amount), 0) / months.length : 0;
};

const stageMetric = (
  report: FyReport | undefined,
  field: 'amount' | 'qty' | 'bills',
  currentMonthIndex: number,
  monthFraction: number,
): number => {
  if (!report) return 0;
  let total = 0;
  for (let i = 0; i < 12; i += 1) {
    if (i < currentMonthIndex) total += monthMetric(report, i, field);
    else if (i === currentMonthIndex) total += monthMetric(report, i, field) * monthFraction;
  }
  return total;
};

const cumulative = (report?: FyReport): Array<number | null> => {
  let total = 0;
  return Array.from({ length: 12 }, (_, i) => {
    const row = report?.months?.[i];
    if (!row || row.available === false) return null;
    total += n(row.amount);
    return total;
  });
};

const lineMonthIndex = (line: FyLine, startYear: number): number => {
  const raw = String(line.month_key || '').replace(/[^0-9]/g, '');
  if (!/^\d{6}$/.test(raw)) return -1;
  const year = Number(raw.slice(0, 4));
  const month = Number(raw.slice(4, 6));
  const offset = year === startYear ? month - 4 : month + 8;
  return offset >= 0 && offset < 12 ? offset : -1;
};

const linesForRange = (
  report: FyReport | undefined,
  startYear: number,
  maxMonthIndex?: number | null,
  exactMonthIndex?: number | null,
): FyLine[] => {
  const lines = report?.lines || [];
  if (exactMonthIndex != null) {
    return lines.filter(line => lineMonthIndex(line, startYear) === exactMonthIndex);
  }
  if (maxMonthIndex == null) return lines;
  return lines.filter(line => {
    const idx = lineMonthIndex(line, startYear);
    return idx >= 0 && idx <= maxMonthIndex;
  });
};

const filterPath = (lines: FyLine[], path: DetailPath[]): FyLine[] =>
  lines.filter(line => path.every(p => {
    const pm = DIMENSIONS.find(d => d.key === p.dim)!;
    return String(line[pm.code] ?? '').trim() === p.code;
  }));

const groupLines = (lines: FyLine[], dim: DimensionKey, path: DetailPath[]): GroupRow[] => {
  const meta = DIMENSIONS.find(d => d.key === dim)!;
  const filtered = filterPath(lines, path);
  const map = new Map<string, GroupRow>();
  filtered.forEach(line => {
    const code = String(line[meta.code] ?? '').trim();
    const name = String(line[meta.name] ?? '').trim() || 'Unassigned';
    const key = code || name;
    const row = map.get(key) || { code, name, amount: 0, qty: 0, count: 0 };
    row.amount += n(line.amount);
    row.qty += n(line.qty);
    row.count += 1;
    map.set(key, row);
  });
  return [...map.values()].sort((a, b) => b.amount - a.amount || a.name.localeCompare(b.name));
};

function Delta({ value, label }: { value: number | null; label?: string }) {
  if (value == null) return <Text style={styles.deltaMuted}>—{label ? ` ${label}` : ''}</Text>;
  const good = value >= 0;
  return (
    <Text style={[styles.delta, { color: good ? C.today : C.over }]}>
      {value >= 0 ? '▲ ' : '▼ '}{pctText(value)}{label ? <Text style={styles.deltaMuted}> {label}</Text> : null}
    </Text>
  );
}

function SectionLabel({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <View style={styles.sectionLabelRow}>
      <Text style={styles.sectionLabel}>{children}</Text>
      {right ? <Text style={styles.sectionLabelRight}>{right}</Text> : null}
    </View>
  );
}

function YearChips({ years, selected, onSelect, loadingId }: { years: YearSpec[]; selected: number; onSelect: (index: number) => void; loadingId?: string | null }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
      {years.map((year, index) => {
        const active = index === selected;
        return (
          <TouchableOpacity key={year.id} activeOpacity={0.76} onPress={() => onSelect(index)} style={[styles.chip, active && styles.chipActive]}>
            <Text style={[styles.chipText, active && styles.chipTextActive]}>
              {fyLabel(year.startYear)}{index === 0 ? ' · current' : ''}{loadingId === year.id ? ' · loading' : ''}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

function YearStrip({
  years,
  selected,
  currentMonthIndex,
  monthFraction,
  amount,
  onSelect,
}: {
  years: LoadedYear[];
  selected: number;
  currentMonthIndex: number;
  monthFraction: number;
  amount: (value: any) => string;
  onSelect: (index: number) => void;
}) {
  // Claude Artifact lays the strip out chronologically: oldest → current.
  const chronological = years.slice().reverse();
  const focusIsCurrent = selected === 0;

  return (
    <View style={styles.yearStrip}>
      {chronological.map((year, chronologicalIndex) => {
        const originalIndex = years.findIndex(item => item.id === year.id);
        const focus = originalIndex === selected;
        const fullValue = fullMetric(year.report, 'amount');
        const stageValue = originalIndex === 0
          ? fullValue
          : stageMetric(year.report, 'amount', currentMonthIndex, monthFraction);
        const previousChronological = chronological[chronologicalIndex - 1];
        const useStage = focusIsCurrent || originalIndex === 0;
        const compareValue = useStage ? stageValue : fullValue;
        const previousValue = previousChronological
          ? (useStage
            ? stageMetric(previousChronological.report, 'amount', currentMonthIndex, monthFraction)
            : fullMetric(previousChronological.report, 'amount'))
          : 0;
        const delta = previousChronological && previousValue > 0
          ? pctChange(compareValue, previousValue)
          : null;

        return (
          <TouchableOpacity
            key={year.id}
            activeOpacity={0.8}
            onPress={() => onSelect(originalIndex)}
            style={[styles.yearCard, focus && styles.yearCardActive]}
          >
            <Text style={[styles.yearCardLabel, focus && styles.yearCardTextActive]}>
              {fyLabel(year.startYear)}{originalIndex === 0 ? ' · to date' : ''}
            </Text>
            <Text numberOfLines={1} adjustsFontSizeToFit style={[styles.yearCardValue, focus && styles.yearCardTextActive]}>
              {amount(fullValue)}
            </Text>
            {originalIndex !== 0 ? (
              <>
                <Text style={[styles.yearCardStageLabel, focus && styles.yearCardTextActive]}>at this stage</Text>
                <Text style={[styles.yearCardStageValue, focus && styles.yearCardTextActive]}>{amount(stageValue)}</Text>
              </>
            ) : null}
            <Text
              style={[
                styles.yearCardDelta,
                focus && styles.yearCardTextActive,
                !focus && delta != null && { color: delta >= 0 ? C.today : C.over },
              ]}
            >
              {delta == null ? '—' : `${delta >= 0 ? '▲ ' : '▼ '}${pctText(delta)}`}
              {delta != null && previousChronological ? ` vs ${fyId(previousChronological.startYear)}` : ''}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function KpiTile({
  label,
  value,
  sub,
  delta,
  open,
  onPress,
  children,
}: {
  label: string;
  value: string;
  sub?: string;
  delta?: number | null;
  open: boolean;
  onPress: () => void;
  children?: React.ReactNode;
}) {
  return (
    <TouchableOpacity activeOpacity={0.82} onPress={onPress} style={[styles.kpiTile, open && styles.kpiTileOpen]}>
      <Text style={styles.kpiLabel}>{label}</Text>
      <Text numberOfLines={1} adjustsFontSizeToFit style={styles.kpiValue}>{value}</Text>
      {sub ? <Text style={styles.kpiSub}>{sub}</Text> : null}
      {delta !== undefined ? <Delta value={delta ?? null} /> : null}
      {open ? <View style={styles.kpiExpanded}>{children}</View> : null}
    </TouchableOpacity>
  );
}

function ChartTooltip({
  index,
  years,
  values,
  cumulativeMode,
  amount,
  colors,
}: {
  index: number;
  years: LoadedYear[];
  values: Array<Array<number | null>>;
  cumulativeMode?: boolean;
  amount: (value: any) => string;
  colors: string[];
}) {
  const m = monthDate(years[0].startYear, index);
  return (
    <View style={styles.chartTooltip} pointerEvents="none">
      <Text style={styles.chartTooltipTitle}>{m.label}</Text>
      {years.map((y, yi) => (
        <View key={y.id} style={styles.chartTooltipRow}>
          <View style={[styles.legendDot, { backgroundColor: colors[yi] || C.faint }]} />
          <Text style={styles.chartTooltipYear}>{fyLabel(y.startYear).replace('FY ', 'FY ')}</Text>
          <Text style={styles.chartTooltipValue}>{values[yi]?.[index] == null ? '—' : amount(values[yi][index])}</Text>
        </View>
      ))}
      {cumulativeMode ? <Text style={styles.chartTooltipHint}>cumulative</Text> : null}
    </View>
  );
}

function FyLineChart({
  years,
  selectedYear,
  currentMonthIndex,
  amount,
  selectedMonth,
  onMonth,
}: {
  years: LoadedYear[];
  selectedYear: number;
  currentMonthIndex: number;
  amount: (value: any) => string;
  selectedMonth: number | null;
  onMonth: (index: number) => void;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const width = 640;
  const height = 188;
  const left = 16;
  const right = 16;
  const top = 14;
  const bottom = 27;
  const innerW = width - left - right;
  const innerH = height - top - bottom;
  const chartYears = years.slice().reverse();
  const selectedId = years[selectedYear]?.id;
  const series = chartYears.map(y => cumulative(y.report));
  const max = Math.max(1, ...series.flat().filter((v): v is number => v != null));
  const x = (i: number) => left + (innerW * i) / 11;
  const y = (v: number) => top + innerH - (v / max) * innerH;
  const colors = chartYears.map((year, i) => year.id === selectedId ? C.bill : (year.isCurrent ? C.ink : i === 0 ? C.grey1 : C.grey2));
  const activeIndex = hover ?? selectedMonth;

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View style={{ width, height }}>
        <Svg width={width} height={height}>
          <Line x1={x(currentMonthIndex)} x2={x(currentMonthIndex)} y1={top} y2={top + innerH} stroke={C.mut} strokeWidth={1} strokeDasharray="4 4" />
          {series.map((vals, yi) => {
            const points = vals
              .map((v, i) => v == null ? null : `${x(i)},${y(v)}`)
              .filter(Boolean)
              .join(' ');
            return points ? (
              <React.Fragment key={chartYears[yi].id}>
                <Polyline points={points} fill="none" stroke={colors[yi]} strokeWidth={chartYears[yi].id === selectedId ? 3 : (chartYears[yi].isCurrent ? 2.5 : 2)} />
                {vals.map((v, i) => v == null ? null : (
                  <Circle key={i} cx={x(i)} cy={y(v)} r={chartYears[yi].isCurrent ? 2.4 : 1.8} fill={colors[yi]} />
                ))}
              </React.Fragment>
            ) : null;
          })}
        </Svg>
        <View style={[StyleSheet.absoluteFill, { left, right, bottom }]}> 
          {Array.from({ length: 12 }, (_, i) => {
            const cellW = innerW / 12;
            return (
              <Pressable
                key={i}
                onPress={() => onMonth(i)}
                onHoverIn={() => setHover(i)}
                onHoverOut={() => setHover(null)}
                style={{ position: 'absolute', left: Math.max(0, x(i) - left - cellW / 2), top: 0, bottom: 0, width: cellW }}
              />
            );
          })}
        </View>
        <View style={styles.chartXAxis}>
          {Array.from({ length: 12 }, (_, i) => <Text key={i} style={styles.chartXLabel}>{monthDate(chartYears[0].startYear, i).label}</Text>)}
        </View>
        {activeIndex != null ? (
          <View style={[styles.tooltipPos, { left: Math.min(width - 184, Math.max(6, x(activeIndex) - 80)) }]}>
            <ChartTooltip index={activeIndex} years={chartYears} values={series} cumulativeMode amount={amount} colors={colors} />
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
}

function FyBarChart({
  years,
  selectedYear,
  amount,
  selectedMonth,
  onMonth,
}: {
  years: LoadedYear[];
  selectedYear: number;
  amount: (value: any) => string;
  selectedMonth: number | null;
  onMonth: (index: number) => void;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const width = 660;
  const height = 180;
  const chartH = 138;
  const chartYears = years.slice().reverse();
  const selectedId = years[selectedYear]?.id;
  const series = chartYears.map(y => Array.from({ length: 12 }, (_, i) => y.report?.months?.[i]?.available === false ? null : monthMetric(y.report, i, 'amount')));
  const max = Math.max(1, ...series.flat().filter((v): v is number => v != null));
  const colors = chartYears.map((year, i) => year.id === selectedId ? C.bill : (year.isCurrent ? C.ink : i === 0 ? C.grey1 : C.grey2));
  const groupW = width / 12;
  const barW = 9;
  const active = hover ?? selectedMonth;

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View style={{ width, height }}>
        <View style={[styles.barArea, { height: chartH }]}> 
          {Array.from({ length: 12 }, (_, i) => (
            <Pressable
              key={i}
              onPress={() => onMonth(i)}
              onHoverIn={() => setHover(i)}
              onHoverOut={() => setHover(null)}
              style={[styles.barGroup, { width: groupW, opacity: selectedMonth != null && selectedMonth !== i ? 0.35 : 1 }]}
            >
              <View style={styles.barCluster}>
                {chartYears.map((year, yi) => {
                  const v = series[yi][i];
                  const h = v == null ? 0 : Math.max(v > 0 ? 2 : 0, (v / max) * (chartH - 12));
                  return <View key={year.id} style={{ width: barW, height: h, borderTopLeftRadius: 2, borderTopRightRadius: 2, backgroundColor: colors[yi] }} />;
                })}
              </View>
            </Pressable>
          ))}
        </View>
        <View style={styles.chartXAxis}>
          {Array.from({ length: 12 }, (_, i) => <Text key={i} style={styles.chartXLabel}>{monthDate(chartYears[0].startYear, i).label}</Text>)}
        </View>
        {active != null ? (
          <View style={[styles.tooltipPos, { left: Math.min(width - 184, Math.max(6, active * groupW + groupW / 2 - 80)) }]}>
            <ChartTooltip index={active} years={chartYears} values={series} amount={amount} colors={colors} />
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
}

export default function FinancialYearPerformanceScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { width } = useWindowDimensions();
  const { mode: amountMode } = useDashboardAmountMode();
  const amount = useCallback((value: any) => formatDashboardAmount(n(value), amountMode), [amountMode]);

  const metric = one(params.metric) || 'sales';
  const prptype = one(params.prptype) || 'S';
  const view = one(params.view) || 'owner';
  const anchorDate = one(params.date) || toYmd(new Date());
  const anchor = parseYmd(anchorDate);
  const anchorStartYear = fyStartYearOf(anchorDate);
  const currentMonthIndex = ((anchor.getMonth() + 1) - 4 + 12) % 12;
  const monthFraction = anchor.getDate() / new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0).getDate();

  const [years, setYears] = useState<LoadedYear[]>([]);
  const [selectedYear, setSelectedYear] = useState(0);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [monthReports, setMonthReports] = useState<Record<string, FyReport>>({});
  const [monthLoading, setMonthLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [loadingYearId, setLoadingYearId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'overview' | 'detail'>('overview');
  const [detailReport, setDetailReport] = useState<FyReport | null>(null);
  const [detailMonth, setDetailMonth] = useState<number | null>(null);
  const [detailPath, setDetailPath] = useState<DetailPath[]>([]);
  const [detailDimension, setDetailDimension] = useState<DimensionKey>('executive');
  const [openTile, setOpenTile] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const initialLoadKeyRef = useRef('');

  const specs = useMemo<YearSpec[]>(() => Array.from({ length: 3 }, (_, offset) => {
    const startYear = anchorStartYear - offset;
    const isCurrent = offset === 0;
    return {
      startYear,
      id: fyId(startYear),
      fromDate: fyStartDate(startYear),
      fullEndDate: fyEndDate(startYear),
      toDate: isCurrent ? anchorDate : fyEndDate(startYear),
      isCurrent,
    };
  }), [anchorStartYear, anchorDate]);

  const upsertYear = useCallback((year: LoadedYear) => {
    setYears(current => {
      const next = current.filter(item => item.id !== year.id);
      next.push(year);
      next.sort((a, b) => b.startYear - a.startYear);
      return next;
    });
  }, []);

  const loadYear = useCallback(async (
    specIndex: number,
    options: { refresh?: boolean; includeDetails?: boolean } = {},
  ): Promise<LoadedYear | null> => {
    const spec = specs[specIndex];
    if (!spec) return null;
    if (metric !== 'sales' || view === 'my') {
      setError(view === 'my' ? 'Financial-year Sales is not available in My View yet.' : 'This financial-year metric is not available yet.');
      setLoading(false);
      setRefreshing(false);
      return null;
    }

    const isInitial = specIndex === 0 && years.length === 0;
    if (options.refresh) setRefreshing(true);
    else if (isInitial) setLoading(true);
    else setLoadingYearId(spec.id);
    setError('');

    try {
      const response: any = await api.getOwnerFySales({
        date: spec.toDate,
        from_date: spec.fromDate,
        to_date: spec.toDate,
        prptype,
        view: 'owner',
        include_details: options.includeDetails ? 1 : 0,
      });

      if (!response?.success || !response?.data?.report) {
        throw new Error(response?.message || response?.code || `Unable to load ${fyLabel(spec.startYear)}.`);
      }

      const loaded: LoadedYear = { ...spec, report: response.data.report as FyReport };
      upsertYear(loaded);
      return loaded;
    } catch (e: any) {
      setError(e?.message || `Unable to load ${fyLabel(spec.startYear)}.`);
      return null;
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingYearId(null);
    }
  }, [metric, prptype, specs, upsertYear, view, years.length]);

  useEffect(() => {
    // Initial entry intentionally loads ONLY the current FY. Historical FYs are
    // requested only when the user selects them and remain cached in this screen.
    // The key guard also prevents development/StrictMode effect replays from
    // issuing a duplicate request for the same FY context.
    const key = `${metric}|${prptype}|${view}|${anchorDate}`;
    if (initialLoadKeyRef.current === key) return;
    initialLoadKeyRef.current = key;
    void loadYear(0);
    // Deliberately exclude cached years/loadYear identity: cache updates must not
    // turn into automatic API traffic.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [metric, prptype, view, anchorDate]);

  const selectedSpec = specs[selectedYear];
  const focus = selectedSpec ? years.find(year => year.id === selectedSpec.id) : undefined;
  const previous = focus ? years.find(year => year.startYear === focus.startYear - 1) : undefined;
  const currentPrior = years.find(year => year.id === specs[1]?.id);
  const loadedSelectedIndex = focus ? Math.max(0, years.findIndex(year => year.id === focus.id)) : 0;

  const focusTotal = fullMetric(focus?.report, 'amount');
  const previousComparable = previous
    ? (focus?.isCurrent
      ? stageMetric(previous.report, 'amount', currentMonthIndex, monthFraction)
      : fullMetric(previous.report, 'amount'))
    : 0;
  const gap = previous ? focusTotal - previousComparable : null;
  const gapPct = previous && previousComparable > 0 ? pctChange(focusTotal, previousComparable) : null;

  const elapsedMonths = currentMonthIndex + monthFraction;
  const remainingMonths = Math.max(0, 12 - elapsedMonths);
  const previousStage = currentPrior ? stageMetric(currentPrior.report, 'amount', currentMonthIndex, monthFraction) : 0;
  const previousFull = currentPrior ? fullMetric(currentPrior.report, 'amount') : 0;
  const pace = focus?.isCurrent
    ? (previousStage > 0 ? focusTotal * previousFull / previousStage : (elapsedMonths > 0 ? focusTotal / elapsedMonths * 12 : 0))
    : null;
  const paceRate = focus?.isCurrent && elapsedMonths > 0 ? focusTotal / elapsedMonths : null;
  const needPerMonth = focus?.isCurrent && previousFull > focusTotal && remainingMonths > 0.2
    ? Math.max(0, (previousFull - focusTotal) / remainingMonths)
    : null;
  const stageLabel = `Apr–${monthDate(anchorStartYear, currentMonthIndex).label} to ${anchor.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}`;

  const focusMonths = availableMonths(focus?.report);
  const avg = averageMonths(focus?.report, focus?.isCurrent ? currentMonthIndex : null);
  const bestIndex = focus?.report?.months?.reduce((best, row, index, arr) => {
    if (!row || row.available === false) return best;
    if (best < 0 || n(row.amount) > n(arr[best]?.amount)) return index;
    return best;
  }, -1) ?? -1;

  const focusRangeLines = useMemo(
    () => focus ? linesForRange(focus.report, focus.startYear, focus.isCurrent ? currentMonthIndex : null) : [],
    [focus, currentMonthIndex],
  );
  const previousRangeLines = useMemo(
    () => previous ? linesForRange(previous.report, previous.startYear, focus?.isCurrent ? currentMonthIndex : null) : [],
    [previous, focus?.isCurrent, currentMonthIndex],
  );
  const topExecutives = useMemo(
    () => groupLines(focusRangeLines, 'executive', []).slice(0, 5),
    [focusRangeLines],
  );
  const topPreviousExecutives = useMemo(
    () => new Map(groupLines(previousRangeLines, 'executive', []).map(row => [row.code || row.name, row])),
    [previousRangeLines],
  );

  const resetYearView = () => {
    setSelectedMonth(null);
    setOpenTile(null);
    setViewMode('overview');
    setDetailReport(null);
    setDetailMonth(null);
    setDetailPath([]);
  };

  const selectYear = async (index: number) => {
    const spec = specs[index];
    if (!spec || loadingYearId) return;
    resetYearView();

    const cached = years.find(year => year.id === spec.id);
    if (cached) {
      setSelectedYear(index);
      return;
    }

    // Lazy FY loading: only the year the user selected is requested.
    const loaded = await loadYear(index);
    if (loaded) setSelectedYear(index);
  };

  const loadMonthReport = useCallback(async (index: number): Promise<FyReport | null> => {
    if (!focus) return null;
    const period = monthPeriod(focus.startYear, index, anchorDate, focus.isCurrent);
    const row = focus.report?.months?.[index];
    if (!row || row.available === false) return null;
    const key = `${focus.id}|${index}`;
    if (monthReports[key]) return monthReports[key];
    setMonthLoading(true);
    try {
      const response = await api.getOwnerFySales({
        date: period.last,
        from_date: period.first,
        to_date: period.last,
        prptype,
        view: 'owner',
        include_details: 1,
      });
      if (!response?.success || !response?.data?.report) throw new Error(response?.message || 'Unable to load month detail.');
      const report = response.data.report as FyReport;
      setMonthReports(current => ({ ...current, [key]: report }));
      return report;
    } catch (e: any) {
      setError(e?.message || 'Unable to load month detail.');
      return null;
    } finally {
      setMonthLoading(false);
    }
  }, [anchorDate, focus, monthReports, prptype]);

  const selectMonth = (index: number) => {
    if (!focus?.report?.months?.[index] || focus.report.months[index].available === false) return;
    // Month selection is chart interaction only. Do not hit the API until the
    // user explicitly opens that month in the detailed breakdown.
    setSelectedMonth(current => current === index ? null : index);
  };

  const openDetail = async (monthIndex: number | null = null, initialPath: DetailPath[] = []) => {
    if (!focus) return;
    setViewMode('detail');
    setDetailPath(initialPath);
    setDetailMonth(monthIndex);
    const remaining = DIMENSIONS.find(d => !initialPath.some(p => p.dim === d.key));
    setDetailDimension(remaining?.key || 'design');

    setDetailLoading(true);
    try {
      if (monthIndex == null) {
        if (focus.report?.details_loaded) {
          setDetailReport(focus.report);
          return;
        }
        const loaded = await loadYear(selectedYear, { includeDetails: true });
        setDetailReport(loaded?.report || null);
        return;
      }
      const report = await loadMonthReport(monthIndex);
      setDetailReport(report || null);
    } finally {
      setDetailLoading(false);
    }
  };

  const detailLines = useMemo(() => {
    if (!focus || !detailReport) return [];
    return detailMonth == null
      ? linesForRange(detailReport, focus.startYear, focus.isCurrent ? currentMonthIndex : null)
      : linesForRange(detailReport, focus.startYear, null, detailMonth);
  }, [focus, detailReport, detailMonth, currentMonthIndex]);
  const previousDetailLines = useMemo(() => {
    if (!previous) return [];
    if (detailMonth != null) return linesForRange(previous.report, previous.startYear, null, detailMonth);
    return linesForRange(previous.report, previous.startYear, focus?.isCurrent ? currentMonthIndex : null);
  }, [previous, focus?.isCurrent, detailMonth, currentMonthIndex]);
  const detailDimsLeft = DIMENSIONS.filter(d => !detailPath.some(p => p.dim === d.key));
  const activeDetailDim = detailDimsLeft.some(d => d.key === detailDimension)
    ? detailDimension
    : (detailDimsLeft[0]?.key || 'design');
  const detailRows = useMemo(() => groupLines(detailLines, activeDetailDim, detailPath), [detailLines, activeDetailDim, detailPath]);
  const previousDetailRows = useMemo(
    () => new Map(groupLines(previousDetailLines, activeDetailDim, detailPath).map(row => [row.code || row.name, row])),
    [previousDetailLines, activeDetailDim, detailPath],
  );
  const detailScopedLines = useMemo(() => filterPath(detailLines, detailPath), [detailLines, detailPath]);
  const previousDetailScopedLines = useMemo(() => filterPath(previousDetailLines, detailPath), [previousDetailLines, detailPath]);
  const detailScopeTotal = detailScopedLines.reduce((sum, line) => sum + n(line.amount), 0);
  const detailScopeQty = detailScopedLines.reduce((sum, line) => sum + n(line.qty), 0);
  const previousDetailScopeTotal = previousDetailScopedLines.reduce((sum, line) => sum + n(line.amount), 0);

  const openInvoiceRecords = () => {
    if (!focus || detailMonth == null) return;
    const period = monthPeriod(focus.startYear, detailMonth, anchorDate, focus.isCurrent);
    const routeParams: Record<string, string> = {
      date: period.last,
      report_month: period.ym,
      expected_month: period.ym,
      prptype,
      view: 'owner',
      level: 'documents',
    };
    detailPath.forEach(p => {
      routeParams[`${p.dim}_code`] = p.code;
      routeParams[`${p.dim}_name`] = p.name;
    });
    router.push({ pathname: '/new/(tabs)/reports/sales-flow', params: routeParams } as any);
  };

  const monthPreview = selectedMonth != null && focus ? monthReports[`${focus.id}|${selectedMonth}`] : null;
  const monthTopExec = monthPreview
    ? groupLines(monthPreview.lines || [], 'executive', []).slice(0, 3)
    : [];

  const back = () => {
    if (viewMode === 'detail') {
      if (detailPath.length) setDetailPath(p => p.slice(0, -1));
      else setViewMode('overview');
      return;
    }
    if (selectedMonth != null) setSelectedMonth(null);
    else router.back();
  };

  if (loading) {
    return <SafeAreaView style={styles.safe}><View style={styles.center}><ActivityIndicator size="large" color={C.owner} /><Text style={styles.loadingText}>Loading financial-year Sales…</Text></View></SafeAreaView>;
  }

  if (error && years.length === 0) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}><TouchableOpacity onPress={() => router.back()} style={styles.backBtn}><Text style={styles.backText}>‹</Text></TouchableOpacity><Text style={styles.headerTitle}>🧵 Sales</Text></View>
        <View style={styles.center}><Text style={styles.errorText}>{error}</Text><TouchableOpacity style={styles.retryBtn} onPress={() => void loadYear(selectedYear)}><Text style={styles.retryText}>Try again</Text></TouchableOpacity></View>
      </SafeAreaView>
    );
  }

  if (!focus) return null;

  const detailPeriodLabel = detailMonth != null ? monthDate(focus.startYear, detailMonth).label : fyLabel(focus.startYear);
  const selectedMonthValue = selectedMonth != null ? monthMetric(focus.report, selectedMonth, 'amount') : 0;
  const topTotal = topExecutives.reduce((sum, row) => sum + row.amount, 0);
  const topScaleMax = Math.max(
    1,
    ...topExecutives.map(row => row.amount),
    ...Array.from(topPreviousExecutives.values()).map(row => row.amount),
  );
  const bestLabel = bestIndex >= 0 ? monthDate(focus.startYear, bestIndex).label : '—';
  const older = focus ? years.find(year => year.startYear === focus.startYear - 2) : undefined;
  const olderComparable = older
    ? (focus.isCurrent
      ? stageMetric(older.report, 'amount', currentMonthIndex, monthFraction)
      : fullMetric(older.report, 'amount'))
    : 0;
  const thirdYearGrowth = Boolean(previous && older && focusTotal > previousComparable && previousComparable > olderComparable);
  const concentration = topTotal > 0 && topExecutives.length > 0 ? topExecutives[0].amount / topTotal : 0;
  const heroInsights: string[] = [];
  if (previous && previousComparable > 0) {
    heroInsights.push(`${gap != null && gap >= 0 ? 'Ahead of' : 'Behind'} ${fyLabel(previous.startYear)} by ${amount(Math.abs(gap || 0))}${focus.isCurrent ? ' at this stage' : ''} (${pctText(gapPct)})`);
  }
  if (pace != null && previousFull > 0 && currentPrior) {
    heroInsights.push(`On pace for ${amount(pace)} — would ${pace >= previousFull ? 'pass' : 'fall short of'} ${fyLabel(currentPrior.startYear)}`);
  }
  if (thirdYearGrowth) heroInsights.push(`Up on both earlier years${focus.isCurrent ? ' at this stage' : ''} — third year of growth`);
  if (concentration >= 0.5 && topExecutives[0]) heroInsights.push(`${topExecutives[0].name} accounts for ${Math.round(concentration * 100)}% of billing`);
  if (bestIndex >= 0 && heroInsights.length < 3) heroInsights.push(`Best month${focus.isCurrent ? ' so far' : ''}: ${bestLabel} (${amount(monthMetric(focus.report, bestIndex, 'amount'))})`);

  const bestIndexForYear = (year: LoadedYear): number => {
    const limit = focus.isCurrent ? currentMonthIndex : 11;
    let best = -1;
    for (let i = 0; i <= limit; i += 1) {
      const row = year.report?.months?.[i];
      if (!row || row.available === false) continue;
      if (best < 0 || monthMetric(year.report, i, 'amount') > monthMetric(year.report, best, 'amount')) best = i;
    }
    return best;
  };

  const tileValueForYear = (key: string, year: LoadedYear): number => {
    if (key === 'avg') return averageMonths(year.report, focus.isCurrent ? currentMonthIndex : null);
    if (key === 'bills' || key === 'qty') {
      const field = key as 'bills' | 'qty';
      return focus.isCurrent && !year.isCurrent
        ? stageMetric(year.report, field, currentMonthIndex, monthFraction)
        : fullMetric(year.report, field);
    }
    if (key === 'rate') {
      const a = focus.isCurrent && !year.isCurrent
        ? stageMetric(year.report, 'amount', currentMonthIndex, monthFraction)
        : fullMetric(year.report, 'amount');
      const q = focus.isCurrent && !year.isCurrent
        ? stageMetric(year.report, 'qty', currentMonthIndex, monthFraction)
        : fullMetric(year.report, 'qty');
      return q > 0 ? a / q : 0;
    }
    if (key === 'best') {
      const idx = bestIndexForYear(year);
      return idx >= 0 ? monthMetric(year.report, idx, 'amount') : 0;
    }
    return 0;
  };

  const kpis = [
    { key: 'avg', label: 'Monthly average', value: amount(avg), sub: `${focusMonths.length} months`, raw: tileValueForYear('avg', focus), compare: previous ? tileValueForYear('avg', previous) : 0, fmt: amount },
    { key: 'best', label: 'Best month', value: bestIndex >= 0 ? amount(monthMetric(focus.report, bestIndex, 'amount')) : amount(0), sub: bestLabel, raw: tileValueForYear('best', focus), compare: 0, fmt: amount },
    { key: 'bills', label: 'Bills', value: formatCount(fullMetric(focus.report, 'bills')), sub: 'Invoices', raw: tileValueForYear('bills', focus), compare: previous ? tileValueForYear('bills', previous) : 0, fmt: formatCount },
    { key: 'qty', label: 'Metres', value: formatQty(fullMetric(focus.report, 'qty')), sub: 'Billed quantity', raw: tileValueForYear('qty', focus), compare: previous ? tileValueForYear('qty', previous) : 0, fmt: formatQty },
    { key: 'rate', label: 'Avg rate', value: formatRate(focus.report?.total?.avg_rate), sub: 'Amount ÷ metres', raw: tileValueForYear('rate', focus), compare: previous ? tileValueForYear('rate', previous) : 0, fmt: formatRate },
  ];

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={back} style={styles.backBtn} activeOpacity={0.75}><Text style={styles.backText}>‹</Text></TouchableOpacity>
        <View style={styles.headerCopy}>
          <Text numberOfLines={1} style={styles.headerTitle}>🧵 Sales</Text>
          <Text numberOfLines={1} style={styles.headerSub}>
            {viewMode === 'detail'
              ? [fyLabel(focus.startYear), detailPeriodLabel, ...detailPath.map(p => p.name)].join(' › ')
              : `${fyLabel(focus.startYear)} · ${fyRange(focus.startYear)}${focus.isCurrent ? ` · to ${anchor.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}` : ''}`}
          </Text>
        </View>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}><Text style={styles.closeText}>✕</Text></TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, width > 900 && styles.contentWide]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void loadYear(selectedYear, { refresh: true })} tintColor={C.owner} />}
      >
        <YearChips years={specs} selected={selectedYear} onSelect={(index) => void selectYear(index)} loadingId={loadingYearId} />

        {error ? <View style={styles.inlineError}><Text style={styles.inlineErrorText}>{error}</Text></View> : null}

        {viewMode === 'overview' ? (
          <>
            <View style={styles.heroCard}>
              <View style={styles.heroTop}>
                <View style={styles.heroMain}>
                  <Text style={styles.eyebrow}>BILLED · {fyLabel(focus.startYear)}{focus.isCurrent ? ' · TO DATE' : ' · FULL YEAR'}</Text>
                  <Text style={styles.heroValue}>{amount(focusTotal)}</Text>
                  {previous ? (
                    <View style={styles.heroDeltaRow}>
                      <Delta value={gapPct} />
                      <Text style={styles.heroCompare}>{gap != null && gap >= 0 ? '+' : '−'}{amount(Math.abs(gap || 0))} vs {fyLabel(previous.startYear)}{focus.isCurrent ? ' at this stage' : ''}</Text>
                    </View>
                  ) : null}
                  {pace != null && currentPrior ? <Text style={styles.paceText}>Pace <Text style={styles.boldMono}>{amount(pace)}</Text> for the full year (seasonal) · {fyLabel(currentPrior.startYear)} closed at <Text style={styles.boldMono}>{amount(previousFull)}</Text></Text> : null}
                </View>
                {heroInsights.length ? (
                  <View style={styles.insightBox}>
                    {heroInsights.slice(0, 3).map((text, index) => <Text key={index} style={styles.insightLine}>• {text}</Text>)}
                  </View>
                ) : null}
              </View>
              <YearStrip years={years} selected={loadedSelectedIndex} currentMonthIndex={currentMonthIndex} monthFraction={monthFraction} amount={amount} onSelect={(loadedIndex) => { const year = years[loadedIndex]; const specIndex = specs.findIndex(spec => spec.id === year?.id); if (specIndex >= 0) void selectYear(specIndex); }} />
            </View>

            <View style={styles.kpiGrid}>
              {kpis.map(tile => {
                const delta = previous && tile.compare > 0 ? pctChange(tile.raw, tile.compare) : null;
                return (
                  <KpiTile key={tile.key} label={tile.label} value={tile.value} sub={tile.sub} delta={delta} open={openTile === tile.key} onPress={() => setOpenTile(v => v === tile.key ? null : tile.key)}>
                    <View style={styles.kpiTableHead}>
                      <Text style={[styles.kpiTableHeadText, styles.kpiTableYearCol]}>YEAR</Text>
                      <Text style={[styles.kpiTableHeadText, styles.kpiTableValueCol]}>{tile.label.toUpperCase()}</Text>
                      <Text style={[styles.kpiTableHeadText, styles.kpiTableDeltaCol]}>VS PREVIOUS</Text>
                    </View>
                    {years.slice().reverse().map((year, chronologicalIndex, chronological) => {
                      const value = tileValueForYear(tile.key, year);
                      const previousYear = chronological[chronologicalIndex - 1];
                      const previousValue = previousYear ? tileValueForYear(tile.key, previousYear) : 0;
                      const rowDelta = previousYear && previousValue > 0 ? pctChange(value, previousValue) : null;
                      const bestForYear = tile.key === 'best' ? bestIndexForYear(year) : -1;
                      const suffix = year.isCurrent ? ' · to date' : (focus.isCurrent ? ' · at this stage' : '');
                      return (
                        <View key={year.id} style={styles.kpiTableRow}>
                          <Text style={[styles.kpiTableYear, styles.kpiTableYearCol, year.id === focus.id && { color: C.bill, fontWeight: '800' }]}>{fyLabel(year.startYear)}<Text style={styles.kpiTableSuffix}>{suffix}</Text></Text>
                          <Text style={[styles.kpiTableValue, styles.kpiTableValueCol]}>{tile.fmt(value)}{bestForYear >= 0 ? <Text style={styles.kpiTableSuffix}> {monthDate(year.startYear, bestForYear).label}</Text> : null}</Text>
                          <View style={styles.kpiTableDeltaCol}>{previousYear ? <Delta value={rowDelta} /> : <Text style={styles.deltaMuted}>—</Text>}</View>
                        </View>
                      );
                    })}
                    <View style={styles.kpiLinks}>
                      {tile.key === 'best' && bestIndex >= 0 ? <TouchableOpacity onPress={() => selectMonth(bestIndex)}><Text style={styles.linkText}>Open {bestLabel} ›</Text></TouchableOpacity> : null}
                      <TouchableOpacity onPress={() => void openDetail(null)}><Text style={styles.linkText}>Full breakdown ›</Text></TouchableOpacity>
                    </View>
                  </KpiTile>
                );
              })}
            </View>

            <SectionLabel right="dashed line = today’s stage">CUMULATIVE · THE CHASE</SectionLabel>
            <View style={styles.chartCard}>
              <FyLineChart years={years} selectedYear={loadedSelectedIndex} currentMonthIndex={currentMonthIndex} amount={amount} selectedMonth={selectedMonth} onMonth={selectMonth} />
              <View style={styles.legendRow}>
                {years.map((year, yi) => <View key={year.id} style={styles.legendItem}><View style={[styles.legendBar, { backgroundColor: yi === loadedSelectedIndex ? C.bill : yi === 0 ? C.ink : yi === 1 ? C.grey2 : C.grey1 }]} /><Text style={styles.legendText}>{fyLabel(year.startYear)}</Text></View>)}
                <Text style={styles.legendStage}>at this stage · {stageLabel}</Text>
              </View>
              {focus.isCurrent && currentPrior && paceRate != null ? (
                <Text style={styles.chaseNote}>
                  {previousFull > focusTotal && needPerMonth != null
                    ? `To pass ${fyLabel(currentPrior.startYear)} (${amount(previousFull)}): ${amount(needPerMonth)}/month needed over the remaining ${Math.round(remainingMonths * 10) / 10} months · current pace ${amount(paceRate)}/month`
                    : `${fyLabel(currentPrior.startYear)}’s full year (${amount(previousFull)}) is already passed · current pace ${amount(paceRate)}/month`}
                </Text>
              ) : null}
            </View>

            <SectionLabel right="tap a month">MONTH BY MONTH · THREE YEARS</SectionLabel>
            <View style={styles.chartCard}>
              <FyBarChart years={years} selectedYear={loadedSelectedIndex} amount={amount} selectedMonth={selectedMonth} onMonth={selectMonth} />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.monthChipRow}>
                {Array.from({ length: 12 }, (_, i) => {
                  const row = focus.report?.months?.[i];
                  const disabled = !row || row.available === false;
                  const active = selectedMonth === i;
                  return <TouchableOpacity key={i} disabled={disabled} onPress={() => selectMonth(i)} style={[styles.monthChip, active && styles.monthChipActive, disabled && styles.monthChipDisabled]}><Text style={[styles.monthChipText, active && styles.monthChipTextActive]}>{monthDate(focus.startYear, i).label}</Text></TouchableOpacity>;
                })}
              </ScrollView>
              {selectedMonth != null ? (
                <View style={styles.monthPreview}>
                  <View style={styles.monthPreviewHead}>
                    <Text style={styles.monthPreviewTitle}>{monthDate(focus.startYear, selectedMonth).label} '{String(monthDate(focus.startYear, selectedMonth).year).slice(-2)}</Text>
                    <Text style={styles.monthPreviewValue}>{amount(selectedMonthValue)}</Text>
                    <Text style={styles.monthPreviewShare}>{focusTotal > 0 ? `${Math.round((selectedMonthValue / focusTotal) * 100)}% of the year` : ''}</Text>
                  </View>
                  <View style={styles.monthCompareRow}>
                    {years.filter(year => year.id !== focus.id).map(year => {
                      const v = monthMetric(year.report, selectedMonth, 'amount');
                      const d = v > 0 ? pctChange(selectedMonthValue, v) : null;
                      return <View key={year.id} style={styles.monthCompareItem}><Text style={styles.monthCompareLabel}>{monthDate(year.startYear, selectedMonth).label} '{String(monthDate(year.startYear, selectedMonth).year).slice(-2)}</Text><Text style={styles.monthCompareValue}>{amount(v)}</Text><Delta value={d} /></View>;
                    })}
                  </View>
                  {monthLoading ? <ActivityIndicator style={{ marginTop: 8 }} color={C.bill} /> : null}
                  {monthTopExec.length ? <View style={styles.monthTopList}>{monthTopExec.map((row: any, i: number) => <View key={`${row.code || row.exec_id || row.name}-${i}`} style={styles.monthTopRow}><Text style={styles.rank}>{i + 1}</Text><Text numberOfLines={1} style={styles.monthTopName}>{row.name}</Text><Text style={styles.monthTopShare}>{selectedMonthValue > 0 ? `${Math.round(row.amount / selectedMonthValue * 100)}%` : ''}</Text><Text style={styles.monthTopValue}>{amount(row.amount)}</Text></View>)}</View> : null}
                  <TouchableOpacity onPress={() => void openDetail(selectedMonth)}><Text style={styles.openMonthLink}>Open {monthDate(focus.startYear, selectedMonth).label} in full ›</Text></TouchableOpacity>
                </View>
              ) : null}
            </View>

            <SectionLabel right={previous ? `grey = ${fyLabel(previous.startYear)}${focus.isCurrent ? ' at this stage' : ''}` : undefined}>TOP EXECUTIVES · {fyLabel(focus.startYear)}{focus.isCurrent ? ' TO DATE' : ''}</SectionLabel>
            <View style={styles.topCard}>
              {topExecutives.map((row, i) => {
                const v = row.amount;
                const share = topTotal > 0 ? v / topTotal * 100 : 0;
                const previousRow = topPreviousExecutives.get(row.code || row.name);
                const previousValue = previousRow?.amount || 0;
                const delta = previousValue > 0 ? pctChange(v, previousValue) : null;
                return (
                  <TouchableOpacity key={`${row.code || row.name}-${i}`} activeOpacity={0.75} onPress={() => void openDetail(null, [{ dim: 'executive', code: String(row.code || ''), name: String(row.name || 'Unassigned') }])} style={styles.topRow}>
                    <Text style={styles.rank}>{i + 1}</Text>
                    <View style={styles.topBody}>
                      <Text numberOfLines={1} style={styles.topName}>{row.name}</Text>
                      <View style={styles.topBars}>
                        <View style={styles.shareTrack}><View style={[styles.shareFill, { width: `${Math.min(100, v / topScaleMax * 100)}%` }]} /></View>
                        {previous ? <View style={styles.previousTrack}><View style={[styles.previousFill, { width: `${Math.min(100, previousValue / topScaleMax * 100)}%` }]} /></View> : null}
                      </View>
                    </View>
                    <View style={styles.topRight}>
                      <Text style={styles.topValue}>{amount(v)}</Text>
                      <View style={styles.topMetaRow}><Text style={styles.topShare}>{Math.round(share)}%</Text>{previousValue > 0 ? <Delta value={delta} /> : null}</View>
                    </View>
                  </TouchableOpacity>
                );
              })}
              {!topExecutives.length ? <Text style={styles.emptyText}>{focus.report?.details_loaded ? `No billing recorded in ${fyLabel(focus.startYear)}.` : 'Detailed breakdown loads only when opened.'}</Text> : null}
              <TouchableOpacity onPress={() => void openDetail(null)} style={styles.fullBreakdown}><Text style={styles.fullBreakdownText}>Full breakdown · Executive · Customer · Category · Design ›</Text><Text style={styles.fullBreakdownArrow}>›</Text></TouchableOpacity>
            </View>

            <Text style={styles.footerNote}>Billing by invoice date. A bill belongs to the executive of its sales order. Each financial year is read on demand from its actual ERP financial-year database and cached for this screen. “At this stage” compares the same elapsed Apr–Mar position.</Text>
          </>
        ) : (
          <>
            <View style={styles.detailSummary}>
              <View style={styles.detailBreadcrumb}>
                <TouchableOpacity onPress={() => { setDetailPath([]); setDetailReport(detailMonth == null ? focus.report : detailReport); }}><Text style={styles.crumbStrong}>{detailPeriodLabel}</Text></TouchableOpacity>
                {detailPath.map((p, i) => <React.Fragment key={`${p.dim}-${p.code}-${i}`}><Text style={styles.crumbSep}>›</Text><TouchableOpacity onPress={() => setDetailPath(detailPath.slice(0, i + 1))}><Text numberOfLines={1} style={styles.crumbStrong}>{p.name}</Text></TouchableOpacity></React.Fragment>)}
              </View>
              <Text style={styles.detailTotal}>{amount(detailLines.length ? detailScopeTotal : detailReport?.total?.amount)}</Text>
              <Text style={styles.detailMeta}>{formatQty(detailLines.length ? detailScopeQty : detailReport?.total?.qty)}</Text>
              {previous ? (
                <View style={styles.detailCompareRow}>
                  <Text style={styles.detailCompareText}>vs {fyLabel(previous.startYear)}{focus.isCurrent && detailMonth == null ? ' at this stage' : ''}: {amount(previousDetailScopeTotal)}</Text>
                  {previousDetailScopeTotal > 0 ? <Delta value={pctChange(detailScopeTotal, previousDetailScopeTotal)} /> : null}
                </View>
              ) : null}
            </View>

            {detailLoading ? (
              <View style={{ paddingVertical: 28, alignItems: 'center', gap: 8 }}>
                <ActivityIndicator color={C.bill} />
                <Text style={styles.loadingText}>Loading breakdown…</Text>
              </View>
            ) : null}

            {detailMonth == null ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.monthChipRowDetail}>
                {Array.from({ length: 12 }, (_, i) => {
                  const row = focus.report?.months?.[i];
                  const disabled = !row || row.available === false;
                  return <TouchableOpacity key={i} disabled={disabled} onPress={() => void openDetail(i, detailPath)} style={[styles.monthChip, disabled && styles.monthChipDisabled]}><Text style={styles.monthChipText}>{monthDate(focus.startYear, i).label}</Text></TouchableOpacity>;
                })}
              </ScrollView>
            ) : null}

            {detailDimsLeft.length ? (
              <View style={styles.dimRow}>
                <Text style={styles.byLabel}>BY</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                  {detailDimsLeft.map(d => <TouchableOpacity key={d.key} onPress={() => setDetailDimension(d.key)} style={[styles.dimChip, activeDetailDim === d.key && styles.dimChipActive]}><Text style={[styles.dimChipText, activeDetailDim === d.key && styles.dimChipTextActive]}>{d.label}</Text></TouchableOpacity>)}
                </ScrollView>
              </View>
            ) : null}

            <View style={styles.detailCard}>
              <View style={styles.detailHeaderRow}><Text style={styles.detailHeadName}>{DIMENSIONS.find(d => d.key === activeDetailDim)?.label || 'Detail'}</Text><Text style={styles.detailHeadQty}>Metres</Text><Text style={styles.detailHeadAmount}>Billed</Text></View>
              {detailRows.map((row, i) => {
                const share = detailScopeTotal > 0 ? row.amount / detailScopeTotal * 100 : 0;
                const previousRow = previousDetailRows.get(row.code || row.name);
                const previousValue = previousRow?.amount || 0;
                const rowDelta = previousValue > 0 ? pctChange(row.amount, previousValue) : null;
                const canOpen = detailDimsLeft.length > 1;
                return (
                  <TouchableOpacity key={`${row.code || row.name}-${i}`} activeOpacity={canOpen ? 0.72 : 1} onPress={canOpen ? () => {
                    const nextPath = [...detailPath, { dim: activeDetailDim, code: row.code, name: row.name }];
                    setDetailPath(nextPath);
                    const next = DIMENSIONS.find(d => !nextPath.some(p => p.dim === d.key));
                    if (next) setDetailDimension(next.key);
                  } : undefined} style={styles.detailRow}>
                    <Text style={styles.detailRank}>{i + 1}</Text>
                    <View style={styles.detailNameWrap}>
                      <Text numberOfLines={1} style={styles.detailName}>{row.name}</Text>
                      <View style={styles.detailShareLine}><View style={[styles.detailShareFill, { width: `${Math.min(100, share)}%` }]} /></View>
                      <View style={styles.detailCompareMeta}>
                        <Text style={styles.detailShareTextInline}>{Math.round(share)}%</Text>
                        {previous ? <Text style={styles.detailPreviousText}>{fyLabel(previous.startYear).replace('FY ', 'FY ')} {amount(previousValue)}</Text> : null}
                        {rowDelta != null ? <Delta value={rowDelta} /> : null}
                      </View>
                    </View>
                    <Text style={styles.detailQty}>{formatQty(row.qty)}</Text>
                    <Text style={styles.detailAmount}>{amount(row.amount)}</Text>
                  </TouchableOpacity>
                );
              })}
              {!detailRows.length ? <Text style={styles.emptyText}>No billing recorded here.</Text> : null}
            </View>

            {detailMonth != null ? (
              <TouchableOpacity onPress={openInvoiceRecords} style={styles.recordsBtn}><Text style={styles.recordsBtnText}>Open invoice records for {monthDate(focus.startYear, detailMonth).label} ›</Text></TouchableOpacity>
            ) : <Text style={styles.detailHint}>Choose a month above to continue from the FY breakdown into invoice records.</Text>}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  scroll: { flex: 1 },
  content: { width: '100%', maxWidth: 860, alignSelf: 'center', paddingHorizontal: 12, paddingTop: 12, paddingBottom: 34 },
  contentWide: { paddingHorizontal: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  loadingText: { marginTop: 12, fontSize: 12, color: C.mut },
  errorText: { fontSize: 13, color: C.over, textAlign: 'center', marginBottom: 14 },
  retryBtn: { backgroundColor: C.owner, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 9 },
  retryText: { color: '#fff', fontWeight: '800' },
  header: { minHeight: 56, backgroundColor: C.owner, paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 10 },
  backBtn: { width: 34, height: 34, borderRadius: 9, borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)', backgroundColor: 'rgba(255,255,255,0.10)', alignItems: 'center', justifyContent: 'center' },
  backText: { color: '#fff', fontSize: 25, lineHeight: 27 },
  headerCopy: { flex: 1, minWidth: 0 },
  headerTitle: { color: '#fff', fontSize: 14, fontWeight: '800' },
  headerSub: { color: 'rgba(255,255,255,0.80)', fontSize: 10.5, marginTop: 2 },
  closeBtn: { paddingHorizontal: 7, paddingVertical: 4 },
  closeText: { color: '#fff', fontSize: 18 },
  chipsRow: { gap: 7, paddingVertical: 2, paddingBottom: 10 },
  chip: { flexShrink: 0, paddingHorizontal: 13, paddingVertical: 7, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: C.border },
  chipActive: { backgroundColor: C.bill, borderColor: C.bill },
  chipText: { fontSize: 12, fontWeight: '700', color: C.mut },
  chipTextActive: { color: '#fff' },
  inlineError: { padding: 9, borderRadius: 8, backgroundColor: '#FBEAEA', marginBottom: 10 },
  inlineErrorText: { color: C.over, fontSize: 11 },
  heroCard: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 14, padding: 14, borderLeftWidth: 3, borderLeftColor: C.bill },
  heroTop: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  heroMain: { flexGrow: 1, flexBasis: 260, minWidth: 0 },
  eyebrow: { fontSize: 9.5, fontWeight: '800', color: C.faint, letterSpacing: 0.8 },
  heroValue: { fontSize: 30, lineHeight: 34, fontWeight: '800', color: C.ink, marginTop: 4, fontVariant: ['tabular-nums'] },
  heroDeltaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  heroCompare: { fontSize: 11, color: C.mut },
  paceText: { fontSize: 11, color: C.mut, marginTop: 4, lineHeight: 16 },
  boldMono: { fontWeight: '800', color: C.ink, fontVariant: ['tabular-nums'] },
  insightBox: { flexGrow: 1, flexBasis: 240, minWidth: 0, backgroundColor: C.bg, borderRadius: 10, paddingHorizontal: 11, paddingVertical: 8 },
  insightLine: { fontSize: 11, color: C.ink, lineHeight: 17, marginVertical: 1 },
  delta: { fontSize: 10, fontWeight: '800', fontVariant: ['tabular-nums'] },
  deltaMuted: { color: C.faint, fontWeight: '500' },
  yearStrip: { flexDirection: 'row', gap: 6, marginTop: 12 },
  yearCard: { flex: 1, minWidth: 0, paddingHorizontal: 9, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: C.border, backgroundColor: C.bg },
  yearCardActive: { backgroundColor: C.bill, borderColor: C.bill },
  yearCardLabel: { fontSize: 9, fontWeight: '800', color: C.ink, opacity: 0.75 },
  yearCardValue: { fontSize: 13.5, fontWeight: '800', color: C.ink, marginTop: 2, fontVariant: ['tabular-nums'] },
  yearCardStageLabel: { fontSize: 8.5, color: C.faint, marginTop: 2 },
  yearCardStageValue: { fontSize: 9, color: C.ink, fontWeight: '700', fontVariant: ['tabular-nums'] },
  yearCardDelta: { minHeight: 13, marginTop: 3, fontSize: 9.5, fontWeight: '800', color: C.faint },
  yearCardTextActive: { color: '#fff' },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  kpiTile: { flexGrow: 1, flexBasis: 150, minWidth: 145, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: C.border, paddingHorizontal: 11, paddingVertical: 10 },
  kpiTileOpen: { flexBasis: 300 },
  kpiLabel: { fontSize: 9, color: C.faint, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  kpiValue: { fontSize: 17, fontWeight: '800', color: C.ink, marginTop: 4, fontVariant: ['tabular-nums'] },
  kpiSub: { fontSize: 9.5, color: C.faint, marginTop: 2 },
  kpiExpanded: { marginTop: 9, paddingTop: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.border },
  kpiTableHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 3 },
  kpiTableHeadText: { fontSize: 8, color: C.faint, fontWeight: '800' },
  kpiTableRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 3 },
  kpiTableYearCol: { flex: 1.3, minWidth: 0 },
  kpiTableValueCol: { flex: 1, textAlign: 'right' },
  kpiTableDeltaCol: { flex: 1, alignItems: 'flex-end' },
  kpiTableYear: { fontSize: 10.5, color: C.ink },
  kpiTableValue: { fontSize: 10.5, color: C.ink, fontWeight: '800', fontVariant: ['tabular-nums'] },
  kpiTableSuffix: { fontSize: 9, color: C.faint, fontWeight: '500' },
  kpiLinks: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 2 },
  linkText: { marginTop: 7, fontSize: 10.5, color: C.bill, fontWeight: '800' },
  sectionLabelRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, marginTop: 16, marginBottom: 6, paddingHorizontal: 2 },
  sectionLabel: { fontSize: 9.5, fontWeight: '800', color: C.faint, letterSpacing: 0.7 },
  sectionLabelRight: { fontSize: 9.5, color: C.faint, textAlign: 'right' },
  chartCard: { backgroundColor: '#fff', borderWidth: 1, borderColor: C.border, borderRadius: 14, paddingHorizontal: 6, paddingTop: 10, paddingBottom: 6 },
  chartXAxis: { position: 'absolute', left: 4, right: 4, bottom: 1, height: 22, flexDirection: 'row', alignItems: 'flex-end' },
  chartXLabel: { width: `${100 / 12}%`, textAlign: 'center', fontSize: 9.5, color: C.faint },
  tooltipPos: { position: 'absolute', top: 6, zIndex: 20 },
  chartTooltip: { width: 178, backgroundColor: '#fff', borderWidth: 1, borderColor: C.border, borderRadius: 9, paddingHorizontal: 9, paddingVertical: 7, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 5 },
  chartTooltipTitle: { fontSize: 10, color: C.faint, fontWeight: '800', marginBottom: 4 },
  chartTooltipRow: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 2 },
  legendDot: { width: 7, height: 7, borderRadius: 2 },
  chartTooltipYear: { flex: 1, fontSize: 9.5, color: C.mut },
  chartTooltipValue: { fontSize: 10, color: C.ink, fontWeight: '800', fontVariant: ['tabular-nums'] },
  chartTooltipHint: { marginTop: 4, fontSize: 8.5, color: C.faint },
  legendRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 10, paddingHorizontal: 8, paddingTop: 5 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendBar: { width: 10, height: 3, borderRadius: 2 },
  legendText: { fontSize: 10, color: C.mut },
  legendStage: { marginLeft: 'auto', fontSize: 9.5, color: C.faint },
  chaseNote: { fontSize: 10.5, color: C.mut, lineHeight: 15, paddingHorizontal: 8, paddingTop: 4, paddingBottom: 4 },
  barArea: { flexDirection: 'row', alignItems: 'flex-end', paddingTop: 8 },
  barGroup: { height: '100%', justifyContent: 'flex-end', alignItems: 'center' },
  barCluster: { height: '100%', flexDirection: 'row', alignItems: 'flex-end', gap: 2 },
  monthChipRow: { gap: 5, paddingHorizontal: 6, paddingVertical: 8 },
  monthChip: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: 13, borderWidth: 1, borderColor: C.border, backgroundColor: '#fff' },
  monthChipActive: { backgroundColor: C.bill, borderColor: C.bill },
  monthChipDisabled: { opacity: 0.35 },
  monthChipText: { fontSize: 9.5, fontWeight: '700', color: C.mut },
  monthChipTextActive: { color: '#fff' },
  monthPreview: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.hair, marginHorizontal: 6, paddingHorizontal: 4, paddingTop: 10, paddingBottom: 4 },
  monthPreviewHead: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', gap: 10 },
  monthPreviewTitle: { fontSize: 14, fontWeight: '800', color: C.ink },
  monthPreviewValue: { fontSize: 16, fontWeight: '800', color: C.bill, fontVariant: ['tabular-nums'] },
  monthPreviewShare: { fontSize: 10.5, color: C.faint },
  monthCompareRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: 5 },
  monthCompareItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  monthCompareLabel: { fontSize: 9.5, color: C.mut },
  monthCompareValue: { fontSize: 10.5, color: C.ink, fontWeight: '800' },
  monthTopList: { marginTop: 7 },
  monthTopRow: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingVertical: 3 },
  rank: { width: 14, fontSize: 10, color: C.faint, textAlign: 'center' },
  monthTopName: { flex: 1, fontSize: 11, color: C.ink },
  monthTopShare: { width: 36, textAlign: 'right', fontSize: 9.5, color: C.faint },
  monthTopValue: { minWidth: 76, textAlign: 'right', fontSize: 10.5, fontWeight: '800', color: C.ink },
  openMonthLink: { marginTop: 7, fontSize: 11, fontWeight: '800', color: C.bill },
  topCard: { backgroundColor: '#fff', borderWidth: 1, borderColor: C.border, borderRadius: 14, paddingHorizontal: 12, paddingTop: 4, paddingBottom: 7 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.hair },
  topBody: { flex: 1, minWidth: 0 },
  topName: { fontSize: 12, color: C.ink, fontWeight: '700' },
  topBars: { marginTop: 4, gap: 2, maxWidth: 260 },
  shareTrack: { height: 5, backgroundColor: C.hair, borderRadius: 3, overflow: 'hidden' },
  shareFill: { height: '100%', backgroundColor: C.bill },
  previousTrack: { height: 3, backgroundColor: C.hair, borderRadius: 3, overflow: 'hidden' },
  previousFill: { height: '100%', backgroundColor: C.grey2 },
  topRight: { alignItems: 'flex-end' },
  topValue: { fontSize: 12, fontWeight: '800', color: C.ink, fontVariant: ['tabular-nums'] },
  topMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  topShare: { fontSize: 9.5, color: C.faint },
  emptyText: { paddingVertical: 16, textAlign: 'center', fontSize: 12, color: C.faint },
  fullBreakdown: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, paddingBottom: 2 },
  fullBreakdownText: { fontSize: 11, color: C.bill, fontWeight: '800' },
  fullBreakdownArrow: { color: C.faint },
  footerNote: { fontSize: 10, color: C.faint, lineHeight: 15, paddingHorizontal: 4, paddingTop: 14 },
  detailSummary: { backgroundColor: C.bill, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 10 },
  detailBreadcrumb: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 5 },
  crumbStrong: { color: '#fff', fontSize: 11, fontWeight: '800' },
  crumbSep: { color: 'rgba(255,255,255,0.60)' },
  detailTotal: { color: '#fff', fontSize: 18, fontWeight: '800', marginTop: 6, fontVariant: ['tabular-nums'] },
  detailMeta: { color: 'rgba(255,255,255,0.80)', fontSize: 10, marginTop: 2 },
  detailCompareRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 5 },
  detailCompareText: { color: 'rgba(255,255,255,0.86)', fontSize: 10.5 },
  monthChipRowDetail: { gap: 5, paddingBottom: 8 },
  dimRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 8 },
  byLabel: { fontSize: 9.5, color: C.mut, fontWeight: '800' },
  dimChip: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: 13, borderWidth: 1, borderColor: C.border, backgroundColor: '#fff' },
  dimChipActive: { backgroundColor: C.bill, borderColor: C.bill },
  dimChipText: { fontSize: 9.5, color: C.mut, fontWeight: '700' },
  dimChipTextActive: { color: '#fff' },
  detailCard: { backgroundColor: '#fff', borderWidth: 1, borderColor: C.border, borderRadius: 14, overflow: 'hidden' },
  detailHeaderRow: { minHeight: 36, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border },
  detailHeadName: { flex: 1, fontSize: 9, fontWeight: '800', color: C.faint, textTransform: 'uppercase' },
  detailHeadQty: { width: 88, textAlign: 'right', fontSize: 9, fontWeight: '800', color: C.faint, textTransform: 'uppercase' },
  detailHeadAmount: { width: 98, textAlign: 'right', fontSize: 9, fontWeight: '800', color: C.faint, textTransform: 'uppercase' },
  detailRow: { minHeight: 58, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.hair },
  detailRank: { width: 18, fontSize: 10, color: C.faint },
  detailNameWrap: { flex: 1, minWidth: 0 },
  detailName: { fontSize: 12, fontWeight: '700', color: C.ink },
  detailShareLine: { height: 5, backgroundColor: C.hair, borderRadius: 3, overflow: 'hidden', marginTop: 4, marginRight: 35 },
  detailShareFill: { height: '100%', backgroundColor: C.bill },
  detailCompareMeta: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginTop: 3 },
  detailShareTextInline: { fontSize: 9, color: C.faint },
  detailPreviousText: { fontSize: 9, color: C.faint },
  detailQty: { width: 88, textAlign: 'right', fontSize: 10.5, color: C.mut },
  detailAmount: { width: 98, textAlign: 'right', fontSize: 11.5, fontWeight: '800', color: C.ink },
  recordsBtn: { marginTop: 10, alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 9, borderRadius: 9, backgroundColor: C.owner },
  recordsBtnText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  detailHint: { marginTop: 10, fontSize: 10.5, color: C.faint },
});
