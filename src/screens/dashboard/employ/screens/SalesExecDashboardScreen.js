// screens/SalesExecDashboardScreen.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
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
import { api, formatAmount } from '../api/api';
import MiniLineChart from '../components/MiniLineChart';
import SalesExecDashboardSkeleton from '../components/SalesExecDashboardSkeleton';
import {
  AvatarCircle,
  ColHeader,
  COLORS,
  ErrorView,
  ProgressBar,
  RankRow,
  SectionCard,
  SectionHeader,
  SummaryCard,
  TotalRow
} from '../components/SharedComponents';
import TourOverlay from '../components/TourOverlay';
import { SALES_EXEC_DASHBOARD_TOUR } from './DashboardTours';

// ─── Table scroll wrapper: auto height <10 rows, fixed+scroll ≥10 rows ───────
const ROW_HEIGHT = 70;
const SCROLL_THRESHOLD = 4;
const FIXED_TABLE_HEIGHT = ROW_HEIGHT * SCROLL_THRESHOLD;

const TableWrapper = ({ rowCount, children }) => {
  if (rowCount < SCROLL_THRESHOLD) {
    return <View>{children}</View>;
  }
  return (
    <ScrollView
      style={{ maxHeight: FIXED_TABLE_HEIGHT }}
      nestedScrollEnabled={true}
      showsVerticalScrollIndicator={true}
    >
      {children}
    </ScrollView>
  );
};

/**
 * SalesExecDashboardScreen
 *
 * Route params:
 *   execId    : number
 *   execName  : string
 *   execColor : string (hex)
 *   date      : string  YYYY-MM-DD
 *   user      : object  (logged-in user)
 *
 * Navigates to:
 *   PartyDashboard when tapping a party row
 */
export default function SalesExecDashboardScreen({
  navigation,
  route,
  username,
}) {
  const router = useRouter();
  const params = useLocalSearchParams();
  const {
    execId,
    execName,
    execColor,
    date: routeDate,
    user,
    // getUserPrptype,
    activeTab,
    // username
  } = params || {};
  const date = routeDate || new Date().toISOString().split('T')[0];
  const [getUserPrptype, setUserPrptype] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [showTour, setShowTour] = useState(false);

  console.log('activeTab12', activeTab);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        const user_prptype = await AsyncStorage.getItem('user_prptype');
        console.log('user_prptype', user_prptype);
        setUserPrptype(user_prptype);
      } catch (error) {
        console.error('Initialization error:', error);
      } finally {
      }
    };

    initializeApp();
  }, []);

  const load = useCallback(
    async getUserPrptype => {
      try {
        setError(null);
        const res = await api.getExecDashboard(
          activeTab === 'myview' ? 0 : execId,
          date,
          getUserPrptype,
        );
        console.log('res', res);
        if (res.success) setData(res.data);
        else setError('Failed to load exec dashboard');
      } catch (e) {
        setError('Network error. Please retry.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [execId, date],
  );

  useEffect(() => {
    if (!getUserPrptype) return;
    load(getUserPrptype, activeTab);
  }, [load, getUserPrptype, activeTab]);

  const onRefresh = (getUserPrptype, activeTab) => {
    setRefreshing(true);
    load(getUserPrptype, activeTab);
  };

  const goToParty = party => {
    // navigation.navigate('PartyDashboardNew', {
    //   partyId: party.party_id,
    //   partyName: party.party_name,
    //   execId,
    //   execName,
    //   date,
    //   user,
    //   getUserPrptype,
    // });
    router.push({
      pathname: '/new/PartyDashboardNew',
      params: {
        partyId: party.party_id,
        partyName: party.party_name,
        execId,
        execName,
        date,
        user,
        getUserPrptype,
      }
    });
  };

  if (loading) return <SalesExecDashboardSkeleton />;
  if (error)
    return <ErrorView message={error} onRetry={() => load(getUserPrptype)} />;
  if (!data) return null;

  const { exec_info, summary, sales, collection, outstanding } = data;

  const salesTrend = sales.daily_trend.map(d => d.amount);
  const collectionTrend = collection.daily_trend.map(d => d.amount);

  return (
    <>
      {/* {activeTab !== 'myview' ? (
        <HeaderBarwithBack
          userName={username}
          header={exec_info.name}
          subHeader={date}
          noBorderRadius={true}
          breadcrumb={'Doff Entry'}
          SearchBar={false}
        // noBorderRadius={true}
        />
      ) : null} */}
      <SafeAreaView style={styles.safe}>
        {/* ─── Header ─── */}
        {/* <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
          >
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{exec_info.name}</Text>
          <Text style={styles.headerDate}>{date}</Text>
        </View> */}

        {/* Breadcrumb */}
        <View style={styles.breadcrumb}>
        
          
          <TouchableOpacity
            onPress={() => router.back()}>
              <Text style={styles.breadcrumbText}> Back </Text>
          </TouchableOpacity>
          <Text style={styles.breadcrumbSep}> › </Text>
          <Text style={styles.breadcrumbText}>Owner</Text>
          <Text style={styles.breadcrumbSep}> › </Text>
          <Text style={[styles.breadcrumbText, styles.breadcrumbActive]}>
            {exec_info.name}
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
          nestedScrollEnabled={true}
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => onRefresh(getUserPrptype, activeTab)}
              colors={[COLORS.teal]}
            />
          }
        >
          {/* ─── Exec Profile Card ─── */}
          <SectionCard style={styles.profileCard}>
            <View style={styles.profileTop}>
              <AvatarCircle
                name={exec_info.name}
                color={exec_info.avatar_color}
                size={44}
              />
              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>{exec_info.name}</Text>
                <Text style={styles.profileSub}>
                  {exec_info.city} · {exec_info.total_customers} customers
                </Text>
              </View>
              {/* Target Achievement Badge */}
              {/* <View style={styles.targetBadge}>
                <Text style={styles.targetLabel}>TARGET</Text>
                <Text style={styles.targetPct}>
                  {summary.target_achievement_pct}%
                </Text>
              </View> */}
            </View>

            {/* Summary Cards Row */}
            <View style={styles.summaryRow}>
              <SummaryCard
                label="TODAY SALE"
                value={formatAmount(summary.today_sale)}
                rawValue={summary.today_sale}
              />
              <SummaryCard
                label="TOTAL BILLED"
                value={formatAmount(summary.total_billed_mtd)}
                rawValue={summary.total_billed_mtd}
              />
              <SummaryCard
                label="OUTSTANDING"
                value={formatAmount(summary.outstanding)}
                rawValue={summary.outstanding}
              />
            </View>
          </SectionCard>

          {/* ─── SALES SECTION ─── */}
          <SectionCard>
            <SectionHeader
              icon="📊"
              title="SALES"
              bgColor={COLORS.salesBg}
              action="Full report"
              onAction={() => router.push('/new/(tabs)/reports/monthly-report')}
            />

            <TotalRow
              leftLabel="TODAY"
              leftValue={formatAmount(sales.total.today)}
              tealLeft
              rightLabel="US MTD"
              rightValue={formatAmount(sales.total.mtd)}
              rawLeftValue={sales.total.today}
              rawRightValue={sales.total.mtd}
            />

            <View style={styles.chartWrap}>
              <Text style={styles.trendLabel}>DAILY TREND</Text>
              <MiniLineChart
                data={salesTrend}
                color={COLORS.teal}
                fillColor={COLORS.teal}
                width={340}
                height={50}
              />
              <View style={styles.chartAxisRow}>
                {sales.daily_trend.map((d, i) => (
                  <Text key={i} style={styles.axisLabel}>
                    {d.day}
                  </Text>
                ))}
              </View>
            </View>

            <Text style={styles.subHeader}>TOP CUSTOMERS BY SALES</Text>
            <ColHeader label1="CUSTOMER" label2="TODAY" label3="BILLED" />
            <TableWrapper rowCount={sales.by_party.length}>
              {sales.by_party.map(p => (
                <RankRow
                  key={p.party_id}
                  rank={p.rank}
                  name={p.party_name}
                  leftVal={formatAmount(p.today)}
                  rightVal={formatAmount(p.mtd)}
                  rawLeftVal={p.today}
                  rawRightVal={p.mtd}
                  onPress={() => goToParty(p)}
                />
              ))}
            </TableWrapper>
          </SectionCard>

          {/* ─── PAYMENT COLLECTION SECTION ─── */}
          <SectionCard>
            <SectionHeader
              icon="💰"
              title="PAYMENT COLLECTION"
              bgColor={COLORS.collBg}
              action="Full report"
              onAction={() => router.push('/new/(tabs)/reports/monthly-report')}
            />

            <TotalRow
              leftLabel="TODAY"
              leftValue={formatAmount(collection.total.today)}
              tealLeft
              rightLabel="DUE"
              rightValue={formatAmount(collection.total.due)}
              rawLeftValue={collection.total.today}
              rawRightValue={collection.total.due}
            />

            {/* Progress bar: collected vs due */}
            <View style={styles.progressWrap}>
              <ProgressBar
                pct={
                  (collection.total.today /
                    (collection.total.today + collection.total.due)) *
                  100
                }
                color={COLORS.teal}
              />
              <View style={styles.progressLabels}>
                <Text style={styles.progressLabelLeft}>
                  Collected{' '}
                  {(
                    (collection.total.today /
                      (collection.total.today + collection.total.due)) *
                    100
                  ).toFixed(1)}
                  %
                </Text>
                <Text style={styles.progressLabelRight}>
                  Pending{' '}
                  {(
                    100 -
                    (collection.total.today /
                      (collection.total.today + collection.total.due)) *
                    100
                  ).toFixed(1)}
                  %
                </Text>
              </View>
            </View>

            <View style={styles.chartWrap}>
              <Text style={styles.trendLabel}>COLLECTION TREND</Text>
              <MiniLineChart
                data={collectionTrend}
                color={COLORS.green}
                fillColor={COLORS.green}
                width={340}
                height={50}
              />
              <View style={styles.chartAxisRow}>
                {collection.daily_trend.map((d, i) => (
                  <Text key={i} style={styles.axisLabel}>
                    {d.day}
                  </Text>
                ))}
              </View>
            </View>

            {/* Collections highest first */}
            <Text style={styles.subHeader}>COLLECTIONS — HIGHEST FIRST</Text>
            <ColHeader label1="CUSTOMER" label2="TODAY" label3="TOTAL" />
            <TableWrapper rowCount={collection.by_party.length}>
              {collection.by_party.map(p => (
                <RankRow
                  key={p.party_id}
                  rank={p.rank}
                  name={p.party_name}
                  leftVal={formatAmount(p.today)}
                  rightVal={formatAmount(p.total_collected)}
                  rawLeftVal={p.today}
                  rawRightVal={p.total_collected}
                  onPress={() =>
                    goToParty({
                      party_id: p.party_id,
                      party_name: p.party_name,
                    })
                  }
                />
              ))}
            </TableWrapper>
            {/* Outstanding highest first */}
            <Text style={styles.subHeader}>OUTSTANDING — HIGHEST FIRST</Text>
            <ColHeader label1="CUSTOMER" label2="" label3="AMOUNT" />
            <TableWrapper rowCount={collection.outstanding_by_party.length}>
              {collection.outstanding_by_party.map(p => (
                <RankRow
                  key={p.party_id}
                  rank={p.rank}
                  name={p.party_name}
                  rightVal={formatAmount(p.amount)}
                  rawRightVal={p.amount}
                  trendUp={false}
                  onPress={() =>
                    goToParty({
                      party_id: p.party_id,
                      party_name: p.party_name,
                    })
                  }
                />
              ))}
            </TableWrapper>
          </SectionCard>
        </ScrollView>
      </SafeAreaView>
      <TourOverlay
        tourKey="sales_exec_dashboard"
        steps={SALES_EXEC_DASHBOARD_TOUR}
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
  breadcrumbSep: { fontSize: 11, color: COLORS.textLight },
  breadcrumbActive: { color: COLORS.primary, fontWeight: '600' },
  scroll: { flex: 1 },
  content: { paddingTop: 10, paddingBottom: 24 },
  profileCard: { marginHorizontal: 12, marginBottom: 12 },
  profileTop: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  profileInfo: { flex: 1, marginLeft: 12 },
  profileName: { fontSize: 15, fontWeight: '700', color: COLORS.textDark },
  profileSub: { fontSize: 11, color: COLORS.textLight, marginTop: 2 },
  targetBadge: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: 'center',
  },
  targetLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 8,
    textTransform: 'uppercase',
  },
  targetPct: { color: '#fff', fontSize: 16, fontWeight: '800' },
  summaryRow: {
    flexDirection: 'row',
    paddingHorizontal: 10,
    paddingBottom: 12,
  },
  chartWrap: { paddingHorizontal: 10, paddingTop: 6, paddingBottom: 2 },
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
    marginTop: 2,
  },
  axisLabel: { fontSize: 9, color: COLORS.textLight },
  subHeader: {
    fontSize: 9,
    color: COLORS.textLight,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 2,
  },
  progressWrap: { paddingTop: 4 },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    marginTop: 4,
  },
  progressLabelLeft: { fontSize: 10, color: COLORS.teal },
  progressLabelRight: { fontSize: 10, color: COLORS.textLight },
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
