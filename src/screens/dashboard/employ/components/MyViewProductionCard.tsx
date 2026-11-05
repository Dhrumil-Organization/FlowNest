import React, { useEffect, useMemo, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '../api/api';
import {
  COLORS,
  ColHeader,
  RankRow,
  SectionCard,
  SectionHeader,
  TotalRow,
} from './SharedComponents';
import InteractiveDailyTrendChart from './InteractiveDailyTrendChart';
import {
  buildProductionShedSummary,
  type ProductionShedSummary,
} from '@/src/screens/dashboard/ProductionShedSummary';

const asNumber = (value: unknown): number => {
  const valueNumber = Number(value);
  return Number.isFinite(valueNumber) ? valueNumber : 0;
};

const formatMeters = (value: unknown): string =>
  asNumber(value).toLocaleString('en-IN', { maximumFractionDigits: 2 });

const formatShedMeters = (value: unknown): string => {
  const amount = asNumber(value);
  if (Math.abs(amount) >= 1000) {
    return `${(amount / 1000).toFixed(Math.abs(amount) >= 10000 ? 0 : 1)}K m`;
  }
  return `${amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })} m`;
};

const fyLabel = (date: string): string => {
  const match = date.match(/^(\d{4})-(\d{2})-\d{2}$/);
  if (!match) return '';
  const year = Number(match[1]);
  const start = Number(match[2]) >= 4 ? year : year - 1;
  return `${String(start).slice(-2)}-${String(start + 1).slice(-2)}`;
};

const throughDate = (period: any, requestedDate: string): string => {
  const value = String(period?.actual_to_ymd ?? '');
  if (/^\d{8}$/.test(value)) {
    return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
  }
  return requestedDate;
};

const coverageSubtitle = (period: any): string => {
  const value = String(period?.actual_to_ymd ?? '');
  if (/^\d{8}$/.test(value)) {
    const date = new Date(Number(value.slice(0, 4)), Number(value.slice(4, 6)) - 1, Number(value.slice(6, 8)));
    const label = date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
    return asNumber(period?.pending_days) > 0 ? `Data through ${label}` : `Current through ${label}`;
  }
  return String(period?.freshness_label ?? period?.display_label ?? '');
};

type ProductionSnapshot = {
  total?: { today_meters?: number | string; mtd_meters?: number | string };
  period?: any;
  daily_trend?: Array<{ day?: string; meters?: number | string }>;
  permitted?: boolean;
};

type ProductionCardState = {
  loading: boolean;
  allowed: boolean;
  snapshot: ProductionSnapshot | null;
  sheds: ProductionShedSummary | null;
  shedError: boolean;
  through: string;
  error: boolean;
};

const initialState: ProductionCardState = {
  loading: true,
  allowed: false,
  snapshot: null,
  sheds: null,
  shedError: false,
  through: '',
  error: false,
};

type Props = {
  permitted: boolean;
  date: string;
  prptype: string;
  refreshKey?: number;
};

/**
 * Real Production card for My View, using the same permission, dashboard
 * totals, and physical-shed classifier as the working Owner Production card.
 * No executive filter: checked production belongs to physical sheds, not to
 * a Sales Executive. Laravel authorizes BOTH dashboard and full-report calls.
 */
export default function MyViewProductionCard({ permitted, date, prptype, refreshKey = 0 }: Props) {
  const router = useRouter();
  const [state, setState] = useState<ProductionCardState>(initialState);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    if (!permitted || !prptype) {
      setState({ ...initialState, loading: false });
      return undefined;
    }

    let active = true;
    setState(initialState);

    const load = async () => {
      try {
        // The same API and date/permission-aware figures as Owner View.
        const snapshotResponse = await api.getOwnerDashboard(date, prptype);
        if (!active) return;

        const production: ProductionSnapshot | undefined = snapshotResponse?.data?.production;
        const allowed = snapshotResponse?.permissions?.cards?.production === true
          && production?.permitted === true;

        if (!snapshotResponse?.success || !allowed || !production?.total
          || !Array.isArray(production?.daily_trend)) {
          // Don't present stale or unauthorized figures even when the local
          // permission cache still says Production is available.
          setState({ ...initialState, loading: false, allowed: false });
          return;
        }

        const through = throughDate(production.period, date);
        // Show the live hero/trend even if shed-detail retrieval later fails.
        setState({
          loading: false,
          allowed: true,
          snapshot: production,
          sheds: null,
          shedError: false,
          through,
          error: false,
        });

        try {
          const detailedResponse = await api.getOwnerCardReport({
            report_type: 'production_full',
            date: through,
            from_date: `${through.slice(0, 7)}-01`.replace(/-/g, ''),
            to_date: through.replace(/-/g, ''),
            prptype,
          });
          if (!active) return;
          const report = detailedResponse?.data?.report;
          if (!detailedResponse?.success || !Array.isArray(report?.rows)
            || !Array.isArray(report?.shed_catalog)) {
            throw new Error('Physical-shed production is unavailable');
          }
          const sheds = buildProductionShedSummary(
            report.rows,
            report.shed_catalog,
            through.replace(/-/g, ''),
          );
          setState(prev => ({ ...prev, sheds, shedError: false }));
        } catch (_) {
          if (active) setState(prev => ({ ...prev, shedError: true }));
        }
      } catch (_) {
        if (active) setState({ ...initialState, loading: false, error: true });
      }
    };

    void load();
    return () => { active = false; };
  }, [permitted, date, prptype, refreshKey, retryKey]);

  const data = state.snapshot;
  const rows = useMemo(() => state.sheds?.sheds ?? [], [state.sheds]);

  if (!permitted || !prptype) return null;
  // If the backend no longer authorizes this card, don't reveal any numbers.
  if (!state.loading && !state.allowed && !state.error) return null;

  const openDailyReport = (shed?: { key: string; label: string }) => {
    const through = state.through || date;
    router.push({
      pathname: '/new/(tabs)/reports/production',
      params: {
        date: through,
        from_date: `${through.slice(0, 7)}-01`,
        prptype,
        tab: 'prod',
        ...(shed ? { shed_key: shed.key, shed_label: shed.label } : {}),
      },
    });
  };

  const openFy = () => router.push({
    pathname: '/new/(tabs)/reports/financial-year',
    params: { metric: 'production', view: 'my', date, prptype },
  });

  return (
    <SectionCard>
      <SectionHeader
        icon="⚙️"
        title="MY PRODUCTION"
        bgColor={COLORS.prodBg}
        subtitle={coverageSubtitle(data?.period)}
        badgeAction={`FY ${fyLabel(date)}`}
        onBadgeAction={openFy}
        action="Full report"
        onAction={() => openDailyReport()}
      />
      {state.loading ? (
        <Text style={{ paddingHorizontal: 12, paddingVertical: 14, color: COLORS.textLight, fontSize: 12 }}>
          Loading production…
        </Text>
      ) : state.error ? (
        <TouchableOpacity onPress={() => setRetryKey(key => key + 1)} style={{ paddingHorizontal: 12, paddingVertical: 14 }}>
          <Text style={{ color: COLORS.textLight, fontSize: 12 }}>
            Production data is unavailable. Tap to retry.
          </Text>
        </TouchableOpacity>
      ) : data?.total ? (
        <>
          <TotalRow
            leftLabel="YESTERDAY (m)"
            leftValue={formatMeters(data.total.today_meters)}
            tealLeft
            rightLabel="MTD (m)"
            rightValue={formatMeters(data.total.mtd_meters)}
            rawLeftValue={asNumber(data.total.today_meters)}
            rawRightValue={asNumber(data.total.mtd_meters)}
            tooltipPrefix=""
          />
          <View style={{ paddingHorizontal: 12, paddingVertical: 8 }}>
            <Text style={{ fontSize: 10, color: COLORS.textLight, fontWeight: '700', marginBottom: 5 }}>
              DAILY TREND
            </Text>
            <InteractiveDailyTrendChart
              data={data.daily_trend || []}
              valueKey="meters"
              labelKey="day"
              color="#AB47BC"
              fillColor="#AB47BC"
              height={68}
              pointGap={54}
              valueFormatter={value => `${formatMeters(value)} m`}
              showBaseline
              showHint
            />
          </View>
          <ColHeader label1="SHED" label2="YESTERDAY" label3="MTD" />
          {!state.sheds && !state.shedError && (
            <Text style={{ paddingHorizontal: 12, paddingVertical: 10, color: COLORS.textLight, fontSize: 12 }}>
              Loading shed-wise production…
            </Text>
          )}
          {state.shedError && (
            <Text style={{ paddingHorizontal: 12, paddingVertical: 10, color: COLORS.textLight, fontSize: 12 }}>
              Shed totals unavailable. Open Full report for detailed production.
            </Text>
          )}
          {state.sheds && (
            <>
              {rows.map((shed, index) => (
                <RankRow
                  key={shed.key}
                  rank={index + 1}
                  name={shed.label}
                  leftVal={formatShedMeters(shed.yesterdayMetres)}
                  rightVal={formatShedMeters(shed.mtdMetres)}
                  rawLeftVal={shed.yesterdayMetres}
                  rawRightVal={shed.mtdMetres}
                  trendUp={shed.yesterdayMetres > 0}
                  onPress={() => openDailyReport(shed)}
                />
              ))}
              {Math.abs(state.sheds.totalMtd - asNumber(data.total.mtd_meters)) > 1 && (
                <Text style={{ paddingHorizontal: 12, paddingBottom: 8, color: '#9A5B16', fontSize: 10 }}>
                  Shed totals differ from the summary. Open Full report for details.
                </Text>
              )}
            </>
          )}
        </>
      ) : null}
    </SectionCard>
  );
}
