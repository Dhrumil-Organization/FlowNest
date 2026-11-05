// // screens/PartyDashboardScreen.js
// import { useLocalSearchParams, useRouter } from 'expo-router';
// import React, { useCallback, useEffect, useState } from 'react';
// import {
//   RefreshControl,
// //   ScrollView,
//   StyleSheet,
//   Text,
//   TouchableOpacity,
//   View,
// } from 'react-native';
// import TourOverlay from '../components/TourOverlay';
// import { api, formatAmount } from '../api/api';
// import MiniLineChart from '../components/MiniLineChart';
// import PartyDashboardSkeleton from '../components/PartyDashboardSkeleton';
// import {
//   AvatarCircle,
//   COLORS,
//   ErrorView,
//   ProgressBar,
//   SectionCard,
//   SectionHeader,
//   SummaryCard,
//   TotalRow
// } from '../components/SharedComponents';
// import { PARTY_DASHBOARD_TOUR } from './DashboardTours';

// /**
//  * PartyDashboardScreen
//  *
//  * Route params:
//  *   partyId   : number
//  *   partyName : string
//  *   execId    : number
//  *   execName  : string
//  *   date      : string YYYY-MM-DD
//  *
//  * Shows:
//  *   - Party profile card  (today sale / total billed / outstanding)
//  *   - Sales Trend section (line chart last 11 days + TS today / US MTD)
//  *   - Payment Status section (collected vs due, line chart, progress)
//  */
// export default function PartyDashboardScreen({ username }) {
//   const router = useRouter();
//   const params = useLocalSearchParams();
//   const {
//     partyId,
//     partyName,
//     execId,
//     execName,
//     date: routeDate,
//     getUserPrptype,
//   } = params || {};
//   const date = routeDate || new Date().toISOString().split('T')[0];

//   const [data, setData] = useState(null);
//   const [loading, setLoading] = useState(true);
//   const [refreshing, setRefreshing] = useState(false);
//   const [error, setError] = useState(null);
//   const [showTour, setShowTour] = useState(false);

//   const load = useCallback(
//     async getUserPrptype => {
//       try {
//         setError(null);
//         const res = await api.getPartyDashboard(
//           partyId,
//           execId,
//           date,
//           getUserPrptype,
//         );
//         console.log('Party Das Data: ', res);
//         if (res.success) setData(res.data);
//         else setError('Failed to load party dashboard');
//       } catch (e) {
//         setError('Network error. Please retry.');
//       } finally {
//         setLoading(false);
//         setRefreshing(false);
//       }
//     },
//     [partyId, execId, date],
//   );

//   useEffect(() => {
//     load(getUserPrptype);
//   }, [load, getUserPrptype]);

//   const onRefresh = () => {
//     setRefreshing(true);
//     load(getUserPrptype);
//   };

//   if (loading) return <PartyDashboardSkeleton/>;
//   if (error)
//     return <ErrorView message={error} onRetry={() => load(getUserPrptype)} />;
//   if (!data) return null;

//   const { party_info, summary, sales_trend, payment_status } = data;

//   const salesData = sales_trend.daily_trend_11days.map(d => d.amount);
//   const salesLabels = sales_trend.daily_trend_11days.map(d => d.label);
//   const collectionData = payment_status.daily_trend_11days.map(d => d.amount);

//   const collectedPct =
//     payment_status.total.due > 0
//       ? (payment_status.total.collected /
//           (payment_status.total.collected + payment_status.total.due)) *
//         100
//       : 100;

//   return (
//     <>
//       <SafeAreaView style={styles.safe}>
//         {/* ─── Header ─── */}
//         <View style={styles.header}>
//           <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
//             <Text style={styles.backArrow}>←</Text>
//           </TouchableOpacity>
//           <Text style={styles.headerTitle}>{party_info?.name || ''}</Text>
//           <Text style={styles.headerDate}>{date}</Text>
//         </View>

//         {/* Breadcrumb: Owner › ExecName › PartyName */}
//         <View style={styles.breadcrumb}>
//           <Text style={styles.breadcrumbText}>Owner</Text>
//           <Text style={styles.breadcrumbSep}> › </Text>
//           <Text style={styles.breadcrumbText}>{execName}</Text>
//           <Text style={styles.breadcrumbSep}> › </Text>
//           <Text style={[styles.breadcrumbText, styles.breadcrumbActive]}>
//             {party_info.name}
//           </Text>
//           <TouchableOpacity
//             style={styles.breadcrumbHelp}
//             onPress={() => setShowTour(true)}
//           >
//             <Text style={styles.breadcrumbHelpText}>?</Text>
//           </TouchableOpacity>
//         </View>

//         <ScrollView
//           style={styles.scroll}
//           nestedScrollEnabled={true}
//           contentContainerStyle={styles.content}
//           refreshControl={
//             <RefreshControl
//               refreshing={refreshing}
//               onRefresh={() => onRefresh(getUserPrptype)}
//               colors={[COLORS.teal]}
//             />
//           }
//         >
//           {/* ─── Party Profile Card ─── */}
//           <SectionCard style={styles.profileCard}>
//             <View style={styles.profileTop}>
//               <AvatarCircle
//                 name={party_info.name}
//                 color={party_info.avatar_color}
//                 size={44}
//               />
//               <View style={styles.profileInfo}>
//                 <Text style={styles.profileName}>{party_info.name}</Text>
//                 <Text style={styles.profileSub}>
//                   {party_info.city} · Last order {party_info.last_order_date}
//                 </Text>
//               </View>
//             </View>

//             {/* Summary cards row */}
//             <View style={styles.summaryRow}>
//               <SummaryCard
//                 label="TODAY SALE"
//                 value={formatAmount(summary.today_sale)}
//               />
//               <SummaryCard
//                 label="TOTAL BILLED"
//                 value={formatAmount(summary.total_billed)}
//               />
//               <SummaryCard
//                 label="OUTSTANDING"
//                 value={
//                   summary.outstanding === 0
//                     ? 'Nil'
//                     : formatAmount(summary.outstanding)
//                 }
//               />
//             </View>
//           </SectionCard>

//           {/* ─── SALES TREND ─── */}
//           <SectionCard>
//             <SectionHeader
//               icon="📈"
//               title="SALES TREND"
//               bgColor={COLORS.salesBg}
//             />

//             <TotalRow
//               leftLabel="TODAY"
//               leftValue={formatAmount(sales_trend.total.today)}
//               tealLeft
//               rightLabel="US MTD"
//               rightValue={formatAmount(sales_trend.total.mtd)}
//             />

//             {/* Sparkline — last 11 days */}
//             <View style={styles.chartWrap}>
//               <Text style={styles.trendLabel}>DAILY SALES — LAST 11 DAYS</Text>
//               <MiniLineChart
//                 data={salesData}
//                 color={COLORS.teal}
//                 fillColor={COLORS.teal}
//                 width={340}
//                 height={60}
//                 showBaseline
//               />
//               {/* Day labels */}
//               <View style={styles.chartAxisRow}>
//                 {salesLabels
//                   .filter((_, i) => i % 2 === 0)
//                   .map((lbl, i) => (
//                     <Text key={i} style={styles.axisLabel}>
//                       {lbl}
//                     </Text>
//                   ))}
//               </View>
//             </View>
//           </SectionCard>

//           {/* ─── PAYMENT STATUS ─── */}
//           <SectionCard>
//             <SectionHeader
//               icon="💳"
//               title="PAYMENT STATUS"
//               bgColor={COLORS.collBg}
//             />

//             <TotalRow
//               leftLabel="COLLECTED"
//               leftValue={formatAmount(payment_status.total.collected)}
//               tealLeft
//               rightLabel="DUE"
//               rightValue={
//                 payment_status.total.due === 0
//                   ? '—'
//                   : formatAmount(payment_status.total.due)
//               }
//             />

//             {/* Rate row */}
//             <View style={styles.rateRow}>
//               <View style={{ flex: 1 }}>
//                 <Text style={styles.rateLabel}>COLLECTION RATE</Text>
//                 <Text style={styles.rateValue}>
//                   {formatAmount(payment_status.collection_rate_today)} /{' '}
//                   {formatAmount(payment_status.collection_rate_mtd)}
//                 </Text>
//               </View>
//               <Text
//                 style={[
//                   styles.pendingPct,
//                   payment_status.pending_pct > 0 && { color: COLORS.red },
//                 ]}
//               >
//                 {payment_status.pending_pct > 0
//                   ? `Pending ${payment_status.pending_pct.toFixed(1)}%`
//                   : 'Fully Collected ✓'}
//               </Text>
//             </View>

//             {/* Progress bar */}
//             <ProgressBar pct={collectedPct} color={COLORS.teal} />

//             {/* Collection trend — last 11 days */}
//             <View style={styles.chartWrap}>
//               <Text style={styles.trendLabel}>
//                 COLLECTION TREND — LAST 11 DAYS
//               </Text>
//               <MiniLineChart
//                 data={collectionData}
//                 color={COLORS.green}
//                 fillColor={COLORS.green}
//                 width={340}
//                 height={60}
//                 showBaseline
//               />
//               <View style={styles.chartAxisRow}>
//                 {salesLabels
//                   .filter((_, i) => i % 2 === 0)
//                   .map((lbl, i) => (
//                     <Text key={i} style={styles.axisLabel}>
//                       {lbl}
//                     </Text>
//                   ))}
//               </View>
//             </View>
//           </SectionCard>
//         </ScrollView>
//       </SafeAreaView>
//       <TourOverlay
//         tourKey="party_dashboard"
//         steps={PARTY_DASHBOARD_TOUR}
//         delay={700}
//         visible={showTour}
//         onClose={() => setShowTour(false)}
//       />
//     </>
//   );
// }

// const styles = StyleSheet.create({
//   safe: { flex: 1, backgroundColor: COLORS.bg },
//   header: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     backgroundColor: COLORS.primary,
//     paddingHorizontal: 12,
//     paddingVertical: 12,
//   },
//   backBtn: { paddingRight: 12 },
//   backArrow: { color: '#fff', fontSize: 20 },
//   headerTitle: { flex: 1, color: '#fff', fontSize: 16, fontWeight: '700' },
//   headerDate: { color: 'rgba(255,255,255,0.7)', fontSize: 12 },
//   breadcrumb: {
//     flexDirection: 'row',
//     paddingHorizontal: 14,
//     paddingVertical: 6,
//     backgroundColor: '#E8EDF2',
//   },
//   breadcrumbText: { fontSize: 11, color: COLORS.textLight },
//   breadcrumbSep: { fontSize: 11, color: COLORS.textLight },
//   breadcrumbActive: { color: COLORS.primary, fontWeight: '600' },
//   scroll: { flex: 1 },
//   content: { paddingTop: 10, paddingBottom: 24 },
//   profileCard: {},
//   profileTop: { flexDirection: 'row', alignItems: 'center', padding: 14 },
//   profileInfo: { flex: 1, marginLeft: 12 },
//   profileName: { fontSize: 15, fontWeight: '700', color: COLORS.textDark },
//   profileSub: { fontSize: 11, color: COLORS.textLight, marginTop: 2 },
//   summaryRow: {
//     flexDirection: 'row',
//     paddingHorizontal: 10,
//     paddingBottom: 12,
//   },
//   chartWrap: { paddingHorizontal: 10, paddingTop: 6, paddingBottom: 6 },
//   trendLabel: {
//     fontSize: 9,
//     color: COLORS.textLight,
//     textTransform: 'uppercase',
//     marginBottom: 4,
//     paddingLeft: 4,
//   },
//   chartAxisRow: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     paddingHorizontal: 4,
//     marginTop: 3,
//   },
//   axisLabel: { fontSize: 9, color: COLORS.textLight },
//   rateRow: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     paddingHorizontal: 14,
//     paddingTop: 8,
//     paddingBottom: 4,
//   },
//   rateLabel: {
//     fontSize: 9,
//     color: COLORS.textLight,
//     textTransform: 'uppercase',
//   },
//   rateValue: {
//     fontSize: 12,
//     fontWeight: '600',
//     color: COLORS.textDark,
//     marginTop: 2,
//   },
//   pendingPct: { fontSize: 11, color: COLORS.textLight, fontWeight: '600' },
//   breadcrumbHelp: {
//     marginLeft: 'auto',
//     width: 20,
//     height: 20,
//     borderRadius: 10,
//     backgroundColor: COLORS.primary,
//     alignItems: 'center',
//     justifyContent: 'center',
//   },
//   breadcrumbHelpText: {
//     color: '#fff',
//     fontSize: 11,
//     fontWeight: '700',
//   },
// });
// screens/PartyDashboardScreen.js
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { AmountDisplayModeControl, useDashboardAmountMode } from "@/src/components/dashboard/AmountDisplayModeControl";
import { SubScreenHeader } from "../../../../components/layout/SubScreenHeader";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api, formatAmount } from "../api/api";
import InteractiveDailyTrendChart from "../components/InteractiveDailyTrendChart";
import PartyDashboardSkeleton from "../components/PartyDashboardSkeleton";
import {
  AvatarCircle,
  COLORS,
  ErrorView,
  ProgressBar,
  SectionCard,
  SectionHeader,
  SummaryCard,
  TotalRow,
} from "../components/SharedComponents";
import TourOverlay from "../components/TourOverlay";
import { PARTY_DASHBOARD_TOUR } from "./DashboardTours";
import { DashboardGrid, DashboardInsetContext, Slot } from "@/src/components/dashboard/DashboardGrid";
import { REPORT_MAX_WIDTH, ReportContainer, useReportLayout } from "@/src/components/dashboard/ResponsiveReport";

// Responsive columns (UI only): profile card stays full width on top, the
// section cards below flow into 2 (tablet) / 3 (desktop) columns.
const PARTY_LAYOUT = {
  2: [["sales", "ageing"], ["payment"]],
  3: [["sales"], ["payment"], ["ageing"]],
};

const asNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

const asArray = (value) => (Array.isArray(value) ? value : []);

const firstDefined = (...values) =>
  values.find((value) => value !== undefined && value !== null);

const normalizeBucket = (source, fallbackLabel, fallbackKey) => ({
  key: String(firstDefined(source?.key, source?.code, fallbackKey)),
  label: String(
    firstDefined(source?.label, source?.name, source?.bucket, fallbackLabel)
  ),
  amount: asNumber(
    firstDefined(
      source?.amount,
      source?.outstanding,
      source?.due,
      source?.value,
      source?.total,
      0
    )
  ),
});

const normalizeAgeing = (data) => {
  const source =
    data?.invoices_ageing ||
    data?.invoice_ageing ||
    data?.ageing ||
    data?.aging ||
    data?.age_analysis ||
    {};

  const rawBuckets = asArray(
    firstDefined(
      source?.buckets,
      source?.ageing_buckets,
      source?.aging_buckets,
      source?.rows,
      source?.data,
      []
    )
  );

  let buckets = rawBuckets.map((bucket, index) =>
    normalizeBucket(bucket, `Bucket ${index + 1}`, index)
  );

  if (buckets.length === 0) {
    buckets = [
      normalizeBucket(
        {
          amount: firstDefined(
            source?.days_0_30,
            source?.bucket_0_30,
            source?.d0_30,
            source?.current
          ),
        },
        "0–30 days",
        "0_30"
      ),
      normalizeBucket(
        {
          amount: firstDefined(
            source?.days_31_60,
            source?.bucket_31_60,
            source?.d31_60
          ),
        },
        "31–60 days",
        "31_60"
      ),
      normalizeBucket(
        {
          amount: firstDefined(
            source?.days_61_90,
            source?.bucket_61_90,
            source?.d61_90
          ),
        },
        "61–90 days",
        "61_90"
      ),
      normalizeBucket(
        {
          amount: firstDefined(
            source?.days_90_plus,
            source?.bucket_90_plus,
            source?.d90_plus,
            source?.over_90
          ),
        },
        "90+ days",
        "90_plus"
      ),
    ];
  }

  const invoices = asArray(
    firstDefined(
      source?.open_invoices,
      source?.invoices,
      source?.invoice_rows,
      []
    )
  );

  const openInvoiceCount = asNumber(
    firstDefined(
      source?.open_invoice_count,
      source?.open_invoices_count,
      source?.invoice_count,
      invoices.length
    )
  );

  const total = asNumber(
    firstDefined(
      source?.total,
      source?.total_due,
      source?.outstanding,
      buckets.reduce((sum, bucket) => sum + bucket.amount, 0)
    )
  );

  const hasAgeingData =
    Boolean(
      data?.invoices_ageing ||
        data?.invoice_ageing ||
        data?.ageing ||
        data?.aging ||
        data?.age_analysis
    ) ||
    buckets.some((bucket) => bucket.amount !== 0) ||
    invoices.length > 0 ||
    openInvoiceCount > 0;

  return {
    buckets,
    invoices,
    openInvoiceCount,
    total,
    hasAgeingData,
  };
};

const AGEING_COLORS = ["#2E7D5B", "#D58A00", "#C14335", "#8B2F2F"];

/**
 * PartyDashboardScreen
 *
 * Owner drill-down hierarchy:
 * Owner -> Executive -> Party
 *
 * API data supported:
 * - party_info
 * - summary
 * - sales_trend
 * - payment_status
 * - invoices_ageing / invoice_ageing / ageing / aging
 */
export default function PartyDashboardScreen({ username }) {
  const router = useRouter();
  const params = useLocalSearchParams();
  const {
    partyId,
    partyName,
    execId,
    execName,
    execScope,
    date: routeDate,
    getUserPrptype,
  } = params || {};

  const date = routeDate || new Date().toISOString().split("T")[0];

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const { mode: amountMode, setMode: setAmountMode } = useDashboardAmountMode();
  const displayAmount = value => formatAmount(value, amountMode);
  const [showTour, setShowTour] = useState(false);
  const [ageingExpanded, setAgeingExpanded] = useState(false);
  const layout = useReportLayout();

  const load = useCallback(
    async (prpType) => {
      try {
        setError(null);

        const safePartyId = String(partyId ?? "").trim();
        const safeExecId = String(execId ?? "").trim();

        if (!safePartyId) {
          throw new Error("Selected party code is missing.");
        }

        const res = await api.getPartyDashboard(
          safePartyId,
          safeExecId,
          date,
          prpType,
          String(execScope ?? "").trim()
        );

        console.log("Party dashboard response:", res);

        if (res?.success) {
          setData(res.data || {});
        } else {
          setError(res?.message || "Failed to load party dashboard");
        }
      } catch (e) {
        console.error("Party dashboard error:", e);
        setError(e?.message || "Network error. Please retry.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [partyId, execId, execScope, date]
  );

  useEffect(() => {
    load(getUserPrptype);
  }, [load, getUserPrptype]);

  const onRefresh = () => {
    setRefreshing(true);
    load(getUserPrptype);
  };

  const ageing = useMemo(() => normalizeAgeing(data), [data]);

  if (loading) return <PartyDashboardSkeleton />;
  if (error) {
    return <ErrorView message={error} onRetry={() => load(getUserPrptype)} />;
  }
  if (!data) return null;

  const partyInfo = data.party_info || {};
  const summary = data.summary || {};
  const salesTrend = data.sales_trend || {};
  const paymentStatus = data.payment_status || {};

  const salesTrendRows = asArray(salesTrend.daily_trend_11days);
  const collectionTrendRows = asArray(paymentStatus.daily_trend_11days);

  const salesData = salesTrendRows.map((row) => asNumber(row?.amount));
  const salesLabels = salesTrendRows.map((row) =>
    String(row?.label ?? row?.day ?? "")
  );
  const collectionData = collectionTrendRows.map((row) =>
    asNumber(row?.amount)
  );
  const collectionLabels = collectionTrendRows.map((row) =>
    String(row?.label ?? row?.day ?? "")
  );

  const collected = asNumber(paymentStatus?.total?.collected);
  const due = asNumber(paymentStatus?.total?.due);
  const collectionBase = collected + due;
  const collectedPct =
    collectionBase > 0 ? (collected / collectionBase) * 100 : 0;
  const maxAgeingAmount = Math.max(
    0,
    ...ageing.buckets.map((bucket) => bucket.amount)
  );

  const displayPartyName = partyInfo.name || partyName || "Party";
  const displayExecName = execName || "Executive";

  return (
    <>
      {/* FIX: this screen used to render its own hand-rolled header (light
          background, "←" back button, party name, date) — the 7th separate
          header implementation found across this app, and the only one not
          using the app's navy theme or sign-out button at all. Replaced
          with SubScreenHeader, the component already built specifically
          for "push screen with a back button" — it was sitting unused. */}
      <SafeAreaView style={styles.safe} edges={["bottom", "left", "right"]}>
        <SubScreenHeader backLabel="Back" title={displayPartyName} />

        <View style={styles.breadcrumb}>
          <Text style={styles.breadcrumbText}>Owner</Text>
          <Text style={styles.breadcrumbSep}> › </Text>
          <Text style={styles.breadcrumbText} numberOfLines={1}>
            {displayExecName}
          </Text>
          <Text style={styles.breadcrumbSep}> › </Text>
          <Text
            style={[styles.breadcrumbText, styles.breadcrumbActive]}
            numberOfLines={1}
          >
            {displayPartyName}
          </Text>
          <TouchableOpacity
            style={styles.breadcrumbHelp}
            onPress={() => setShowTour(true)}
          >
            <Text style={styles.breadcrumbHelpText}>?</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.amountModeBar, styles.centred]}>
        <AmountDisplayModeControl mode={amountMode} onChange={setAmountMode} compact />
      </View>

      <ScrollView
          style={styles.scroll}
          nestedScrollEnabled
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[COLORS.teal]}
            />
          }
        >
          <ReportContainer
            onLayout={layout.onLayout}
            style={!layout.compact && styles.containerWide}
          >
          <DashboardInsetContext.Provider value={layout.compact ? null : 0}>
          <SectionCard style={styles.profileCard}>
            <View style={styles.profileTop}>
              <AvatarCircle
                name={displayPartyName}
                color={partyInfo.avatar_color}
                size={44}
              />
              <View style={styles.profileInfo}>
                <Text style={styles.profileName} numberOfLines={1}>{displayPartyName}</Text>
                <Text style={styles.profileSub} numberOfLines={1}>
                  {partyInfo.city || "—"} · Last order{" "}
                  {partyInfo.last_order_date || "—"}
                </Text>
              </View>
            </View>

            <View style={styles.summaryRow}>
              <SummaryCard
                label="TODAY SALE"
                value={displayAmount(asNumber(summary.today_sale))}
              />
              <SummaryCard
                label="TOTAL BILLED"
                value={displayAmount(asNumber(summary.total_billed))}
              />
              <SummaryCard
                label="OUTSTANDING"
                value={
                  asNumber(summary.outstanding) === 0
                    ? "Nil"
                    : displayAmount(asNumber(summary.outstanding))
                }
              />
            </View>
          </SectionCard>

          <DashboardGrid columns={layout.cols} layout={PARTY_LAYOUT}>
          <Slot name="sales">
          <SectionCard>
            <SectionHeader
              icon="🧵"
              title="SALES TREND"
              bgColor={COLORS.salesBg}
            />

            <TotalRow
              leftLabel="TODAY"
              leftValue={displayAmount(asNumber(salesTrend?.total?.today))}
              tealLeft
              rightLabel="BILLED (MONTH)"
              rightValue={displayAmount(asNumber(salesTrend?.total?.mtd))}
            />

            <View style={styles.chartWrap}>
              <Text style={styles.trendLabel}>DAILY SALES — LAST 11 DAYS</Text>
              <InteractiveDailyTrendChart
                data={salesTrendRows}
                valueKey="amount"
                labelKey="label"
                color={COLORS.teal}
                fillColor={COLORS.teal}
                height={70}
                pointGap={54}
                valueFormatter={value => displayAmount(Number(value || 0))}
                showBaseline
                showHint
              />
            </View>
          </SectionCard>
          </Slot>

          <Slot name="payment">
          <SectionCard>
            <SectionHeader
              icon="💰"
              title="PAYMENT STATUS"
              bgColor={COLORS.collBg}
            />

            <TotalRow
              leftLabel="COLLECTED"
              leftValue={displayAmount(collected)}
              tealLeft
              rightLabel="DUE"
              rightValue={due === 0 ? "—" : displayAmount(due)}
            />

            <View style={styles.rateRow}>
              <View style={styles.rateLeft}>
                <Text style={styles.rateLabel}>COLLECTION RATE</Text>
                <Text style={styles.rateValue}>
                  {displayAmount(asNumber(paymentStatus.collection_rate_today))}{" "}
                  / {displayAmount(asNumber(paymentStatus.collection_rate_mtd))}
                </Text>
              </View>
              <Text
                style={[
                  styles.pendingPct,
                  asNumber(paymentStatus.pending_pct) > 0 && {
                    color: COLORS.red,
                  },
                ]}
              >
                {asNumber(paymentStatus.pending_pct) > 0
                  ? `Pending ${asNumber(paymentStatus.pending_pct).toFixed(1)}%`
                  : "Fully Collected ✓"}
              </Text>
            </View>

            <ProgressBar pct={collectedPct} color={COLORS.teal} />

            <View style={styles.chartWrap}>
              <Text style={styles.trendLabel}>
                COLLECTION TREND — LAST 11 DAYS
              </Text>
              <InteractiveDailyTrendChart
                data={collectionTrendRows}
                valueKey="amount"
                labelKey="label"
                color={COLORS.green}
                fillColor={COLORS.green}
                height={70}
                pointGap={54}
                valueFormatter={value => displayAmount(Number(value || 0))}
                showBaseline
                showHint
              />
            </View>
          </SectionCard>
          </Slot>

          <Slot name="ageing">
          <SectionCard>
            <SectionHeader
              icon="📋"
              title="INVOICES & AGEING"
              bgColor="#D0792D"
            />

            <View style={styles.ageingBody}>
              {ageing.buckets.map((bucket, index) => {
                const widthPct =
                  maxAgeingAmount > 0
                    ? Math.min(100, (bucket.amount / maxAgeingAmount) * 100)
                    : 0;

                return (
                  <View key={bucket.key || index} style={styles.ageingRow}>
                    <Text style={styles.ageingLabel}>{bucket.label}</Text>
                    <View style={styles.ageingTrack}>
                      <View
                        style={[
                          styles.ageingFill,
                          {
                            width: `${widthPct}%`,
                            backgroundColor:
                              AGEING_COLORS[index % AGEING_COLORS.length],
                          },
                        ]}
                      />
                    </View>
                    <Text style={styles.ageingAmount}>
                      {displayAmount(bucket.amount)}
                    </Text>
                  </View>
                );
              })}

              {!ageing.hasAgeingData && (
                <Text style={styles.ageingEmpty}>
                  Ageing breakup is not available from the API yet.
                </Text>
              )}
            </View>

            <TouchableOpacity
              style={styles.ageingFooter}
              activeOpacity={ageing.invoices.length > 0 ? 0.7 : 1}
              onPress={() => {
                if (ageing.invoices.length > 0) {
                  setAgeingExpanded((value) => !value);
                }
              }}
            >
              <Text style={styles.ageingFooterText}>
                View {ageing.openInvoiceCount} open invoice
                {ageing.openInvoiceCount === 1 ? "" : "s"}
              </Text>
              <Text style={styles.ageingChevron}>
                {ageing.invoices.length > 0 && ageingExpanded ? "⌃" : "⌄"}
              </Text>
            </TouchableOpacity>

            {ageingExpanded && ageing.invoices.length > 0 && (
              <View style={styles.invoiceList}>
                {ageing.invoices.map((invoice, index) => {
                  const invoiceNo = String(
                    firstDefined(
                      invoice?.bill_no,
                      invoice?.billno,
                      invoice?.invoice_no,
                      invoice?.vou_no,
                      `Invoice ${index + 1}`
                    )
                  );
                  const invoiceDate = String(
                    firstDefined(
                      invoice?.bill_date,
                      invoice?.billdate,
                      invoice?.invoice_date,
                      ""
                    )
                  );
                  const days = asNumber(
                    firstDefined(
                      invoice?.ageing_days,
                      invoice?.aging_days,
                      invoice?.days,
                      invoice?.overdue_days,
                      0
                    )
                  );
                  const amount = asNumber(
                    firstDefined(
                      invoice?.outstanding,
                      invoice?.due,
                      invoice?.balance,
                      invoice?.amount,
                      0
                    )
                  );

                  return (
                    <View
                      key={String(
                        firstDefined(
                          invoice?.uid,
                          invoice?.id,
                          `${invoiceNo}-${index}`
                        )
                      )}
                      style={styles.invoiceRow}
                    >
                      <View style={styles.invoiceInfo}>
                        <Text style={styles.invoiceNo}>{invoiceNo}</Text>
                        <Text style={styles.invoiceMeta}>
                          {invoiceDate || "—"} · {days}d
                        </Text>
                      </View>
                      <Text style={styles.invoiceAmount}>
                        {displayAmount(amount)}
                      </Text>
                    </View>
                  );
                })}
              </View>
            )}
          </SectionCard>
          </Slot>
          </DashboardGrid>
          </DashboardInsetContext.Provider>
          </ReportContainer>
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
  amountModeBar: { paddingHorizontal: 12, paddingTop: 8, paddingBottom: 4, alignItems: "flex-end" },
  safe: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  backBtn: { paddingRight: 12 },
  backArrow: { color: "#fff", fontSize: 20 },
  headerTitle: { flex: 1, color: "#fff", fontSize: 16, fontWeight: "700" },
  headerDate: { color: "rgba(255,255,255,0.7)", fontSize: 12 },
  breadcrumb: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: "#E8EDF2",
  },
  breadcrumbText: {
    maxWidth: 110,
    fontSize: 11,
    color: COLORS.textLight,
  },
  breadcrumbSep: { fontSize: 11, color: COLORS.textLight },
  breadcrumbActive: { flex: 1, color: COLORS.primary, fontWeight: "600" },
  breadcrumbHelp: {
    marginLeft: "auto",
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  breadcrumbHelpText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  scroll: { flex: 1 },
  content: { paddingTop: 10, paddingBottom: 24 },
  containerWide: { paddingHorizontal: 12 },
  centred: { width: "100%", maxWidth: REPORT_MAX_WIDTH, alignSelf: "center" },
  profileCard: {},
  profileTop: { flexDirection: "row", alignItems: "center", padding: 14 },
  profileInfo: { flex: 1, marginLeft: 12 },
  profileName: { fontSize: 15, fontWeight: "700", color: COLORS.textDark },
  profileSub: { fontSize: 11, color: COLORS.textLight, marginTop: 2 },
  summaryRow: {
    flexDirection: "row",
    paddingHorizontal: 10,
    paddingBottom: 12,
  },
  chartWrap: { paddingHorizontal: 10, paddingTop: 6, paddingBottom: 6 },
  trendLabel: {
    fontSize: 9,
    color: COLORS.textLight,
    textTransform: "uppercase",
    marginBottom: 4,
    paddingLeft: 4,
  },
  chartAxisRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 4,
    marginTop: 3,
  },
  axisLabel: { fontSize: 9, color: COLORS.textLight },
  rateRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 4,
  },
  rateLeft: { flex: 1 },
  rateLabel: {
    fontSize: 9,
    color: COLORS.textLight,
    textTransform: "uppercase",
  },
  rateValue: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.textDark,
    marginTop: 2,
  },
  pendingPct: { fontSize: 11, color: COLORS.textLight, fontWeight: "600" },
  ageingBody: { paddingHorizontal: 12, paddingTop: 10, paddingBottom: 6 },
  ageingRow: {
    minHeight: 26,
    flexDirection: "row",
    alignItems: "center",
  },
  ageingLabel: { width: 72, fontSize: 10, color: COLORS.textMid },
  ageingTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#EEEAE6",
    overflow: "hidden",
  },
  ageingFill: { height: 6, borderRadius: 3 },
  ageingAmount: {
    width: 72,
    marginLeft: 8,
    textAlign: "right",
    fontSize: 10,
    fontWeight: "600",
    color: COLORS.textDark,
  },
  ageingEmpty: {
    paddingVertical: 8,
    textAlign: "center",
    color: COLORS.textLight,
    fontSize: 11,
  },
  ageingFooter: {
    minHeight: 38,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  ageingFooterText: {
    flex: 1,
    fontSize: 11,
    fontWeight: "700",
    color: "#214A83",
  },
  ageingChevron: { fontSize: 13, color: COLORS.textLight },
  invoiceList: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
  },
  invoiceRow: {
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  invoiceInfo: { flex: 1 },
  invoiceNo: { fontSize: 11, fontWeight: "600", color: COLORS.textDark },
  invoiceMeta: { marginTop: 2, fontSize: 9, color: COLORS.textLight },
  invoiceAmount: { fontSize: 11, fontWeight: "700", color: COLORS.red },
});
