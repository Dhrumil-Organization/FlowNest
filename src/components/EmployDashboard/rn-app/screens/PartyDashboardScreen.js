// screens/PartyDashboardScreen.js
import HeaderBarwithBack from '@/components/Header';
import { useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import TourOverlay from '../../../../common/TourOverlay';
import { api, formatAmount } from '../api/api';
import MiniLineChart from '../components/MiniLineChart';
import PartyDashboardSkeleton from '../components/PartyDashboardSkeleton';
import {
  AvatarCircle,
  COLORS,
  ErrorView,
  ProgressBar,
  SectionCard,
  SectionHeader,
  SummaryCard,
  TotalRow
} from '../components/SharedComponents';
import { PARTY_DASHBOARD_TOUR } from './DashboardTours';
import { useDashboardResponsive } from '../components/responsive';

/**
 * PartyDashboardScreen
 *
 * Route params:
 *   partyId   : number
 *   partyName : string
 *   execId    : number
 *   execName  : string
 *   date      : string YYYY-MM-DD
 *
 * Shows:
 *   - Party profile card  (today sale / total billed / outstanding)
 *   - Sales Trend section (line chart last 11 days + TS today / US MTD)
 *   - Payment Status section (collected vs due, line chart, progress)
 */
export default function PartyDashboardScreen({ username }) {
  const params = useLocalSearchParams();
  const {
    partyId,
    partyName,
    execId,
    execName,
    date: routeDate,
    getUserPrptype,
  } = params || {};
  const date = routeDate || new Date().toISOString().split('T')[0];

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [showTour, setShowTour] = useState(false);
  const { isDesktop, isTablet } = useDashboardResponsive();

  const load = useCallback(
    async getUserPrptype => {
      try {
        setError(null);
        const res = await api.getPartyDashboard(
          partyId,
          execId,
          date,
          getUserPrptype,
        );
        console.log('Party Das Data: ', res);
        if (res.success) setData(res.data);
        else setError('Failed to load party dashboard');
      } catch (e) {
        setError('Network error. Please retry.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [partyId, execId, date],
  );

  useEffect(() => {
    load(getUserPrptype);
  }, [load, getUserPrptype]);

  const onRefresh = () => {
    setRefreshing(true);
    load(getUserPrptype);
  };

  if (loading) return <PartyDashboardSkeleton/>;
  if (error)
    return <ErrorView message={error} onRetry={() => load(getUserPrptype)} />;
  if (!data) return null;

  const { party_info, summary, sales_trend, payment_status } = data;

  const salesData = sales_trend.daily_trend_11days.map(d => d.amount);
  const salesLabels = sales_trend.daily_trend_11days.map(d => d.label);
  const collectionData = payment_status.daily_trend_11days.map(d => d.amount);

  const collectedPct =
    payment_status.total.due > 0
      ? (payment_status.total.collected /
          (payment_status.total.collected + payment_status.total.due)) *
        100
      : 100;

  return (
    <>
      <HeaderBarwithBack
        userName={username}
        header={party_info?.name || ''}
        subHeader={date}
        noBorderRadius={true}
        breadcrumb={party_info?.name || ''}
        SearchBar={false}
        // noBorderRadius={true}
      />
      <SafeAreaView style={styles.safe}>
        {/* ─── Header ─── */}
        {/* <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
          >
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{party_info.name}</Text>
          <Text style={styles.headerDate}>{date}</Text>
        </View> */}

        {/* Breadcrumb: Owner › ExecName › PartyName */}
        <View style={[styles.breadcrumb, (isDesktop || isTablet) && styles.breadcrumbWide]}>
          <Text style={styles.breadcrumbText}>Owner</Text>
          <Text style={styles.breadcrumbSep}> › </Text>
          <Text style={styles.breadcrumbText}>{execName}</Text>
          <Text style={styles.breadcrumbSep}> › </Text>
          <Text style={[styles.breadcrumbText, styles.breadcrumbActive]}>
            {party_info.name}
          </Text>
          <TouchableOpacity
            style={styles.breadcrumbHelp}
            onPress={() => setShowTour(true)}
          >
            <Text style={styles.breadcrumbHelpText}>?</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => onRefresh(getUserPrptype)}
              colors={[COLORS.teal]}
            />
          }
        >
          {/* ─── Party Profile Card ─── */}
          <SectionCard style={styles.profileCard}>
            <View style={styles.profileTop}>
              <AvatarCircle
                name={party_info.name}
                color={party_info.avatar_color}
                size={44}
              />
              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>{party_info.name}</Text>
                <Text style={styles.profileSub}>
                  {party_info.city} · Last order {party_info.last_order_date}
                </Text>
              </View>
            </View>

            {/* Summary cards row */}
            <View style={styles.summaryRow}>
              <SummaryCard
                label="TODAY SALE"
                value={formatAmount(summary.today_sale)}
              />
              <SummaryCard
                label="TOTAL BILLED"
                value={formatAmount(summary.total_billed)}
              />
              <SummaryCard
                label="OUTSTANDING"
                value={
                  summary.outstanding === 0
                    ? 'Nil'
                    : formatAmount(summary.outstanding)
                }
              />
            </View>
          </SectionCard>

          {isDesktop ? (
            <View style={styles.desktopColumns}>
              <View style={styles.desktopColumn}>
                          {/* ─── SALES TREND ─── */}
                          <SectionCard>
                            <SectionHeader
                              icon="📈"
                              title="SALES TREND"
                              bgColor={COLORS.salesBg}
                            />
                
                            <TotalRow
                              leftLabel="TODAY"
                              leftValue={formatAmount(sales_trend.total.today)}
                              tealLeft
                              rightLabel="US MTD"
                              rightValue={formatAmount(sales_trend.total.mtd)}
                            />
                
                            {/* Sparkline — last 11 days */}
                            <View style={styles.chartWrap}>
                              <Text style={styles.trendLabel}>DAILY SALES — LAST 11 DAYS</Text>
                              <MiniLineChart
                                data={salesData}
                                color={COLORS.teal}
                                fillColor={COLORS.teal}
                                responsive
                                height={60}
                                showBaseline
                              />
                              {/* Day labels */}
                              <View style={styles.chartAxisRow}>
                                {salesLabels
                                  .filter((_, i) => i % 2 === 0)
                                  .map((lbl, i) => (
                                    <Text key={i} style={styles.axisLabel}>
                                      {lbl}
                                    </Text>
                                  ))}
                              </View>
                            </View>
                          </SectionCard>
              </View>
              <View style={styles.desktopColumn}>
                          {/* ─── PAYMENT STATUS ─── */}
                          <SectionCard>
                            <SectionHeader
                              icon="💳"
                              title="PAYMENT STATUS"
                              bgColor={COLORS.collBg}
                            />
                
                            <TotalRow
                              leftLabel="COLLECTED"
                              leftValue={formatAmount(payment_status.total.collected)}
                              tealLeft
                              rightLabel="DUE"
                              rightValue={
                                payment_status.total.due === 0
                                  ? '—'
                                  : formatAmount(payment_status.total.due)
                              }
                            />
                
                            {/* Rate row */}
                            <View style={styles.rateRow}>
                              <View style={{ flex: 1 }}>
                                <Text style={styles.rateLabel}>COLLECTION RATE</Text>
                                <Text style={styles.rateValue}>
                                  {formatAmount(payment_status.collection_rate_today)} /{' '}
                                  {formatAmount(payment_status.collection_rate_mtd)}
                                </Text>
                              </View>
                              <Text
                                style={[
                                  styles.pendingPct,
                                  payment_status.pending_pct > 0 && { color: COLORS.red },
                                ]}
                              >
                                {payment_status.pending_pct > 0
                                  ? `Pending ${payment_status.pending_pct.toFixed(1)}%`
                                  : 'Fully Collected ✓'}
                              </Text>
                            </View>
                
                            {/* Progress bar */}
                            <ProgressBar pct={collectedPct} color={COLORS.teal} />
                
                            {/* Collection trend — last 11 days */}
                            <View style={styles.chartWrap}>
                              <Text style={styles.trendLabel}>
                                COLLECTION TREND — LAST 11 DAYS
                              </Text>
                              <MiniLineChart
                                data={collectionData}
                                color={COLORS.green}
                                fillColor={COLORS.green}
                                responsive
                                height={60}
                                showBaseline
                              />
                              <View style={styles.chartAxisRow}>
                                {salesLabels
                                  .filter((_, i) => i % 2 === 0)
                                  .map((lbl, i) => (
                                    <Text key={i} style={styles.axisLabel}>
                                      {lbl}
                                    </Text>
                                  ))}
                              </View>
                            </View>
                          </SectionCard>
              </View>
            </View>
          ) : (
            <>
                      {/* ─── SALES TREND ─── */}
                      <SectionCard>
                        <SectionHeader
                          icon="📈"
                          title="SALES TREND"
                          bgColor={COLORS.salesBg}
                        />
            
                        <TotalRow
                          leftLabel="TODAY"
                          leftValue={formatAmount(sales_trend.total.today)}
                          tealLeft
                          rightLabel="US MTD"
                          rightValue={formatAmount(sales_trend.total.mtd)}
                        />
            
                        {/* Sparkline — last 11 days */}
                        <View style={styles.chartWrap}>
                          <Text style={styles.trendLabel}>DAILY SALES — LAST 11 DAYS</Text>
                          <MiniLineChart
                            data={salesData}
                            color={COLORS.teal}
                            fillColor={COLORS.teal}
                            responsive
                            height={60}
                            showBaseline
                          />
                          {/* Day labels */}
                          <View style={styles.chartAxisRow}>
                            {salesLabels
                              .filter((_, i) => i % 2 === 0)
                              .map((lbl, i) => (
                                <Text key={i} style={styles.axisLabel}>
                                  {lbl}
                                </Text>
                              ))}
                          </View>
                        </View>
                      </SectionCard>
                      {/* ─── PAYMENT STATUS ─── */}
                      <SectionCard>
                        <SectionHeader
                          icon="💳"
                          title="PAYMENT STATUS"
                          bgColor={COLORS.collBg}
                        />
            
                        <TotalRow
                          leftLabel="COLLECTED"
                          leftValue={formatAmount(payment_status.total.collected)}
                          tealLeft
                          rightLabel="DUE"
                          rightValue={
                            payment_status.total.due === 0
                              ? '—'
                              : formatAmount(payment_status.total.due)
                          }
                        />
            
                        {/* Rate row */}
                        <View style={styles.rateRow}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.rateLabel}>COLLECTION RATE</Text>
                            <Text style={styles.rateValue}>
                              {formatAmount(payment_status.collection_rate_today)} /{' '}
                              {formatAmount(payment_status.collection_rate_mtd)}
                            </Text>
                          </View>
                          <Text
                            style={[
                              styles.pendingPct,
                              payment_status.pending_pct > 0 && { color: COLORS.red },
                            ]}
                          >
                            {payment_status.pending_pct > 0
                              ? `Pending ${payment_status.pending_pct.toFixed(1)}%`
                              : 'Fully Collected ✓'}
                          </Text>
                        </View>
            
                        {/* Progress bar */}
                        <ProgressBar pct={collectedPct} color={COLORS.teal} />
            
                        {/* Collection trend — last 11 days */}
                        <View style={styles.chartWrap}>
                          <Text style={styles.trendLabel}>
                            COLLECTION TREND — LAST 11 DAYS
                          </Text>
                          <MiniLineChart
                            data={collectionData}
                            color={COLORS.green}
                            fillColor={COLORS.green}
                            responsive
                            height={60}
                            showBaseline
                          />
                          <View style={styles.chartAxisRow}>
                            {salesLabels
                              .filter((_, i) => i % 2 === 0)
                              .map((lbl, i) => (
                                <Text key={i} style={styles.axisLabel}>
                                  {lbl}
                                </Text>
                              ))}
                          </View>
                        </View>
                      </SectionCard>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
      <TourOverlay
        tourKey="party_dashboard"
        steps={PARTY_DASHBOARD_TOUR}
        delay={700}
        visible={showTour}
        onClose={() => setShowTour(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  backBtn: { paddingRight: 12 },
  backArrow: { color: '#fff', fontSize: 20 },
  headerTitle: { flex: 1, color: '#fff', fontSize: 16, fontWeight: '700' },
  headerDate: { color: 'rgba(255,255,255,0.7)', fontSize: 12 },
  breadcrumb: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: '#E8EDF2',
  },
  breadcrumbText: { fontSize: 11, color: COLORS.textLight },
  breadcrumbWide: { paddingHorizontal: 18, paddingVertical: 8 },
  breadcrumbSep: { fontSize: 11, color: COLORS.textLight },
  breadcrumbActive: { color: COLORS.primary, fontWeight: '600' },
  scroll: { flex: 1 },
  content: { paddingTop: 10, paddingBottom: 24, width: '100%', alignSelf: 'center' },
  desktopColumns: { flexDirection: 'row', alignItems: 'flex-start', gap: 16, paddingHorizontal: 18, maxWidth: 1100, alignSelf: 'center', width: '100%' },
  desktopColumn: { flex: 1, minWidth: 0 },
  profileCard: {},
  profileTop: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  profileInfo: { flex: 1, marginLeft: 12 },
  profileName: { fontSize: 15, fontWeight: '700', color: COLORS.textDark },
  profileSub: { fontSize: 11, color: COLORS.textLight, marginTop: 2 },
  summaryRow: {
    flexDirection: 'row',
    paddingHorizontal: 10,
    paddingBottom: 12,
  },
  chartWrap: { paddingHorizontal: 10, paddingTop: 6, paddingBottom: 6 },
  trendLabel: {
    fontSize: 9,
    color: COLORS.textLight,
    textTransform: 'uppercase',
    marginBottom: 4,
    paddingLeft: 4,
  },
  chartAxisRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginTop: 3,
  },
  axisLabel: { fontSize: 9, color: COLORS.textLight },
  rateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 4,
  },
  rateLabel: {
    fontSize: 9,
    color: COLORS.textLight,
    textTransform: 'uppercase',
  },
  rateValue: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textDark,
    marginTop: 2,
  },
  pendingPct: { fontSize: 11, color: COLORS.textLight, fontWeight: '600' },
  breadcrumbHelp: {
    marginLeft: 'auto',
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  breadcrumbHelpText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
});
