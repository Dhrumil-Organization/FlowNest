// // screens/SalesExecDashboardScreen.js
// import AsyncStorage from "@react-native-async-storage/async-storage";
// import { useLocalSearchParams, useRouter } from "expo-router";
// import React, { useCallback, useEffect, useState } from "react";
// import {
//   RefreshControl,
//   SafeAreaView,
//   ScrollView,
//   StyleSheet,
//   Text,
//   TouchableOpacity,
//   View,
// } from "react-native";
// import { api, formatAmount } from "../api/api";
// import InteractiveDailyTrendChart from "../components/InteractiveDailyTrendChart";
// import SalesExecDashboardSkeleton from "../components/SalesExecDashboardSkeleton";
// import {
//   AvatarCircle,
//   ColHeader,
//   COLORS,
//   ErrorView,
//   ProgressBar,
//   RankRow,
//   SectionCard,
//   SectionHeader,
//   SummaryCard,
//   TotalRow,
// } from "../components/SharedComponents";
// import TourOverlay from "../components/TourOverlay";
// import { SALES_EXEC_DASHBOARD_TOUR } from "./DashboardTours";

// // ─── Table scroll wrapper: auto height <10 rows, fixed+scroll ≥10 rows ───────
// const ROW_HEIGHT = 70;
// const SCROLL_THRESHOLD = 4;
// const FIXED_TABLE_HEIGHT = ROW_HEIGHT * SCROLL_THRESHOLD;

// const TableWrapper = ({ rowCount, children }) => {
//   if (rowCount < SCROLL_THRESHOLD) {
//     return <View>{children}</View>;
//   }
//   return (
//     <ScrollView
//       style={{ maxHeight: FIXED_TABLE_HEIGHT }}
//       nestedScrollEnabled={true}
//       showsVerticalScrollIndicator={true}
//     >
//       {children}
//     </ScrollView>
//   );
// };

// /**
//  * SalesExecDashboardScreen
//  *
//  * Route params:
//  *   execId    : number
//  *   execName  : string
//  *   execColor : string (hex)
//  *   date      : string  YYYY-MM-DD
//  *   user      : object  (logged-in user)
//  *
//  * Navigates to:
//  *   PartyDashboard when tapping a party row
//  */
// const firstParam = (value) => {
//   if (Array.isArray(value)) return value[0];
//   return value;
// };

// const asString = (value, fallback = "") => {
//   const resolved = firstParam(value);
//   if (resolved === undefined || resolved === null) return fallback;
//   return String(resolved);
// };

// const asNumber = (value, fallback = 0) => {
//   const resolved = Number(firstParam(value));
//   return Number.isFinite(resolved) ? resolved : fallback;
// };

// const safeArray = (value) => (Array.isArray(value) ? value : []);
// const safeNumber = (value) => {
//   const resolved = Number(value);
//   return Number.isFinite(resolved) ? resolved : 0;
// };

// export default function SalesExecDashboardScreen({
//   navigation,
//   route,
//   username,
// }) {
//   const router = useRouter();
//   const routerParams = useLocalSearchParams();
//   const routeParams = route?.params || route || {};

//   // Expo Router supplies Owner drill-down values through useLocalSearchParams().
//   // My View supplies values through route.params. Route params intentionally win.
//   const mergedParams = {
//     ...routerParams,
//     ...routeParams,
//   };

//   const activeTab =
//     asString(mergedParams.activeTab).toLowerCase() === "myview"
//       ? "myview"
//       : "owner";
//   const isMyView = activeTab === "myview";

//   const selectedExecId = asNumber(mergedParams.execId, 0);
//   const execId = isMyView ? 0 : selectedExecId;
//   const execName = asString(mergedParams.execName);
//   const execColor = asString(mergedParams.execColor);
//   const routeDate = asString(mergedParams.date);
//   const date = routeDate || new Date().toISOString().split("T")[0];

//   const [getUserPrptype, setUserPrptype] = useState("");
//   const [data, setData] = useState(null);
//   const [loading, setLoading] = useState(true);
//   const [refreshing, setRefreshing] = useState(false);
//   const [error, setError] = useState(null);
//   const [showTour, setShowTour] = useState(false);

//   useEffect(() => {
//     let mounted = true;

//     const initializeApp = async () => {
//       try {
//         const storedPrpType = await AsyncStorage.getItem("user_prptype");
//         if (!mounted) return;

//         const routePrpType = asString(mergedParams.getUserPrptype);
//         setUserPrptype(routePrpType || storedPrpType || "");
//       } catch (initializationError) {
//         console.error("Sales executive dashboard initialization error:", initializationError);
//         if (mounted) {
//           setError("Unable to read the dashboard property settings.");
//           setLoading(false);
//         }
//       }
//     };

//     initializeApp();
//     return () => {
//       mounted = false;
//     };
//   }, [mergedParams.getUserPrptype]);

//   const load = useCallback(
//     async (prpType, options = {}) => {
//       const { initial = false } = options;

//       if (!prpType) {
//         setError("Property type is missing. Please sign in again.");
//         setLoading(false);
//         setRefreshing(false);
//         return;
//       }

//       if (!isMyView && execId <= 0) {
//         setError("Selected sales executive code is missing.");
//         setLoading(false);
//         setRefreshing(false);
//         return;
//       }

//       try {
//         setError(null);
//         if (initial) setLoading(true);

//         const effectiveExecId = isMyView ? 0 : execId;
//         const res = await api.getExecDashboard(
//           effectiveExecId,
//           date,
//           prpType
//         );

//         if (!res?.success || !res?.data) {
//           throw new Error(res?.message || "Failed to load executive dashboard.");
//         }

//         setData(res.data);
//       } catch (loadError) {
//         console.error("Sales executive dashboard API error:", {
//           activeTab,
//           execId: isMyView ? 0 : execId,
//           selectedExecId,
//           execName,
//           date,
//           error: loadError,
//         });
//         setError(loadError?.message || "Network error. Please retry.");
//       } finally {
//         setLoading(false);
//         setRefreshing(false);
//       }
//     },
//     [activeTab, date, execId, execName, isMyView, selectedExecId]
//   );

//   useEffect(() => {
//     if (!getUserPrptype) return;
//     load(getUserPrptype, { initial: true });
//   }, [getUserPrptype, load]);

//   const onRefresh = useCallback(() => {
//     if (!getUserPrptype || refreshing) return;
//     setRefreshing(true);
//     load(getUserPrptype);
//   }, [getUserPrptype, load, refreshing]);

//   const goToParty = useCallback(
//     (party) => {
//       const partyId = asString(party?.party_id);
//       if (!partyId) return;

//       const responseExecId =
//         data?.exec_info?.exec_id ??
//         data?.exec_info?.id ??
//         data?.exec_info?.sexe ??
//         selectedExecId;

//       router.push({
//         pathname: "/new/PartyDashboardNew",
//         params: {
//           partyId,
//           partyName: asString(party?.party_name, "Party"),
//           execId: String(asNumber(responseExecId, 0)),
//           execName: asString(data?.exec_info?.name, execName),
//           execColor: asString(data?.exec_info?.avatar_color, execColor),
//           date,
//           activeTab,
//           getUserPrptype,
//         },
//       });
//     },
//     [activeTab, data, date, execColor, execName, getUserPrptype, router, selectedExecId]
//   );

//   if (loading) {
//     return <SalesExecDashboardSkeleton showProfile={!isMyView} />;
//   }

//   if (error) {
//     return (
//       <ErrorView
//         message={error}
//         onRetry={() => load(getUserPrptype, { initial: true })}
//       />
//     );
//   }

//   if (!data) {
//     return (
//       <ErrorView
//         message="Executive dashboard data is unavailable."
//         onRetry={() => load(getUserPrptype, { initial: true })}
//       />
//     );
//   }

//   const exec_info = data?.exec_info || {};
//   const summary = data?.summary || {};
//   const sales = data?.sales || {};
//   const collection = data?.collection || {};
//   const outstanding = data?.outstanding || {};

//   const salesTotal = sales?.total || {};
//   const collectionTotal = collection?.total || {};
//   const salesDailyTrend = safeArray(sales?.daily_trend);
//   const collectionDailyTrend = safeArray(collection?.daily_trend);
//   const salesByParty = safeArray(sales?.by_party);
//   const collectionByParty = safeArray(collection?.by_party);
//   const outstandingByParty = safeArray(collection?.outstanding_by_party);

// //   const collectionTrend = collectionDailyTrend.map((item) =>
//     safeNumber(item?.amount)
//   );
//   const collectedToday = safeNumber(collectionTotal?.today);
//   const amountDue = safeNumber(collectionTotal?.due);
//   const collectionBase = collectedToday + amountDue;
//   const collectionPct =
//     collectionBase > 0 ? (collectedToday / collectionBase) * 100 : 0;

//   return (
//     <>
//       {/* {activeTab !== 'myview' ? (
//         <HeaderBarwithBack
//           userName={username}
//           header={exec_info.name || execName || "Executive"}
//           subHeader={date}
//           noBorderRadius={true}
//           breadcrumb={'Doff Entry'}
//           SearchBar={false}
//         // noBorderRadius={true}
//         />
//       ) : null} */}
//       <SafeAreaView style={styles.safe}>
//         {/* ─── Header ─── */}
//         {/* <View style={styles.header}>
//           <TouchableOpacity
//             onPress={() => navigation.goBack()}
//             style={styles.backBtn}
//           >
//             <Text style={styles.backArrow}>←</Text>
//           </TouchableOpacity>
//           <Text style={styles.headerTitle}>{exec_info.name || execName || "Executive"}</Text>
//           <Text style={styles.headerDate}>{date}</Text>
//         </View> */}

//         {/* Breadcrumb */}
//         {!isMyView && (
//           <View style={styles.breadcrumb}>
//             <TouchableOpacity onPress={() => router.back()}>
//               <Text style={styles.breadcrumbText}> Back </Text>
//             </TouchableOpacity>
//             <Text style={styles.breadcrumbSep}> › </Text>
//             <Text style={styles.breadcrumbText}>Owner</Text>
//             <Text style={styles.breadcrumbSep}> › </Text>
//             <Text style={[styles.breadcrumbText, styles.breadcrumbActive]}>
//               {exec_info.name || execName || "Executive"}
//             </Text>
//             <TouchableOpacity
//               style={styles.breadcrumbHelp}
//               onPress={() => setShowTour(true)}
//             >
//               <Text style={styles.breadcrumbHelpText}>?</Text>
//             </TouchableOpacity>
//           </View>
//         )}

//         <ScrollView
//           style={styles.scroll}
//           nestedScrollEnabled={true}
//           contentContainerStyle={styles.content}
//           refreshControl={
//             <RefreshControl
//               refreshing={refreshing}
//               onRefresh={onRefresh}
//               colors={[COLORS.teal]}
//             />
//           }
//         >
//           {/* ─── Exec Profile Card ─── */}
//           {!isMyView && (
//             <SectionCard style={styles.profileCard}>
//               <View style={styles.profileTop}>
//                 <AvatarCircle
//                   name={exec_info.name || execName || "Executive"}
//                   color={exec_info.avatar_color || execColor}
//                   size={44}
//                 />
//                 <View style={styles.profileInfo}>
//                   <Text style={styles.profileName}>{exec_info.name || execName || "Executive"}</Text>
//                   <Text style={styles.profileSub}>
//                     {exec_info.city || ""}{exec_info.city ? " · " : ""}{safeNumber(exec_info.total_customers)} customers
//                   </Text>
//                 </View>
//                 {/* Target Achievement Badge */}
//                 {/* <View style={styles.targetBadge}>
//                 <Text style={styles.targetLabel}>TARGET</Text>
//                 <Text style={styles.targetPct}>
//                   {summary.target_achievement_pct}%
//                 </Text>
//               </View> */}
//               </View>

//               {/* Summary Cards Row */}
//               <View style={styles.summaryRow}>
//                 <SummaryCard
//                   label="TODAY SALE"
//                   value={formatAmount(safeNumber(summary.today_sale))}
//                   rawValue={safeNumber(summary.today_sale)}
//                 />
//                 <SummaryCard
//                   label="TOTAL BILLED"
//                   value={formatAmount(safeNumber(summary.total_billed_mtd))}
//                   rawValue={safeNumber(summary.total_billed_mtd)}
//                 />
//                 <SummaryCard
//                   label="OUTSTANDING"
//                   value={formatAmount(safeNumber(summary.outstanding))}
//                   rawValue={safeNumber(summary.outstanding)}
//                 />
//               </View>
//             </SectionCard>
//           )}

//           {/* ─── SALES SECTION ─── */}
//           <SectionCard>
//             <SectionHeader
//               icon="📊"
//               title="SALES"
//               bgColor={COLORS.salesBg}
//               action="Full report"
//               onAction={() => router.push("/new/(tabs)/reports/monthly-report")}
//             />

//             <TotalRow
//               leftLabel="TODAY"
//               leftValue={formatAmount(safeNumber(salesTotal.today))}
//               tealLeft
//               rightLabel="US MTD"
//               rightValue={formatAmount(safeNumber(salesTotal.mtd))}
//               rawLeftValue={safeNumber(salesTotal.today)}
//               rawRightValue={safeNumber(salesTotal.mtd)}
//             />

//             <View style={styles.chartWrap}>
//               <Text style={styles.trendLabel}>DAILY TREND</Text>
//               <MiniLineChart
//                 data={salesTrend}
//                 color={COLORS.teal}
//                 fillColor={COLORS.teal}
//                 width={340}
//                 height={50}
//               />
//               <View style={styles.chartAxisRow}>
//                 {salesDailyTrend.map((d, i) => (
//                   <Text key={i} style={styles.axisLabel}>
//                     {d.day}
//                   </Text>
//                 ))}
//               </View>
//             </View>

//             <Text style={styles.subHeader}>TOP CUSTOMERS BY SALES</Text>
//             <ColHeader label1="CUSTOMER" label2="TODAY" label3="BILLED" />
//             <TableWrapper rowCount={salesByParty.length}>
//               {salesByParty.map((p) => (
//                 <RankRow
//                   key={p.party_id}
//                   rank={p.rank}
//                   name={p.party_name}
//                   leftVal={formatAmount(p.today)}
//                   rightVal={formatAmount(p.mtd)}
//                   rawLeftVal={p.today}
//                   rawRightVal={p.mtd}
//                   onPress={() => goToParty(p)}
//                 />
//               ))}
//             </TableWrapper>
//           </SectionCard>

//           {/* ─── PAYMENT COLLECTION SECTION ─── */}
//           <SectionCard>
//             <SectionHeader
//               icon="💰"
//               title="PAYMENT COLLECTION"
//               bgColor={COLORS.collBg}
//               action="Full report"
//               onAction={() => router.push("/new/(tabs)/reports/monthly-report")}
//             />

//             <TotalRow
//               leftLabel="TODAY"
//               leftValue={formatAmount(collectedToday)}
//               tealLeft
//               rightLabel="DUE"
//               rightValue={formatAmount(amountDue)}
//               rawLeftValue={collectedToday}
//               rawRightValue={amountDue}
//             />

//             {/* Progress bar: collected vs due */}
//             <View style={styles.progressWrap}>
//               <ProgressBar
//                 pct={collectionPct}
//                 color={COLORS.teal}
//               />
//               <View style={styles.progressLabels}>
//                 <Text style={styles.progressLabelLeft}>
//                   Collected{" "}
//                   {collectionPct.toFixed(1)}
//                   %
//                 </Text>
//                 <Text style={styles.progressLabelRight}>
//                   Pending{" "}
//                   {(100 - collectionPct).toFixed(1)}
//                   %
//                 </Text>
//               </View>
//             </View>

//             <View style={styles.chartWrap}>
//               <Text style={styles.trendLabel}>COLLECTION TREND</Text>
//               <MiniLineChart
//                 data={collectionTrend}
//                 color={COLORS.green}
//                 fillColor={COLORS.green}
//                 width={340}
//                 height={50}
//               />
//               <View style={styles.chartAxisRow}>
//                 {collectionDailyTrend.map((d, i) => (
//                   <Text key={i} style={styles.axisLabel}>
//                     {d.day}
//                   </Text>
//                 ))}
//               </View>
//             </View>

//             {/* Collections highest first */}
//             <Text style={styles.subHeader}>COLLECTIONS — HIGHEST FIRST</Text>
//             <ColHeader label1="CUSTOMER" label2="TODAY" label3="TOTAL" />
//             <TableWrapper rowCount={collectionByParty.length}>
//               {collectionByParty.map((p) => (
//                 <RankRow
//                   key={p.party_id}
//                   rank={p.rank}
//                   name={p.party_name}
//                   leftVal={formatAmount(p.today)}
//                   rightVal={formatAmount(p.total_collected)}
//                   rawLeftVal={p.today}
//                   rawRightVal={p.total_collected}
//                   onPress={() =>
//                     goToParty({
//                       party_id: p.party_id,
//                       party_name: p.party_name,
//                     })
//                   }
//                 />
//               ))}
//             </TableWrapper>
//             {/* Outstanding highest first */}
//             <Text style={styles.subHeader}>OUTSTANDING — HIGHEST FIRST</Text>
//             <ColHeader label1="CUSTOMER" label2="" label3="AMOUNT" />
//             <TableWrapper rowCount={outstandingByParty.length}>
//               {outstandingByParty.map((p) => (
//                 <RankRow
//                   key={p.party_id}
//                   rank={p.rank}
//                   name={p.party_name}
//                   rightVal={formatAmount(p.amount)}
//                   rawRightVal={p.amount}
//                   trendUp={false}
//                   onPress={() =>
//                     goToParty({
//                       party_id: p.party_id,
//                       party_name: p.party_name,
//                     })
//                   }
//                 />
//               ))}
//             </TableWrapper>
//           </SectionCard>
//         </ScrollView>
//       </SafeAreaView>
//       <TourOverlay
//         tourKey="sales_exec_dashboard"
//         steps={SALES_EXEC_DASHBOARD_TOUR}
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
//     flexDirection: "row",
//     alignItems: "center",
//     backgroundColor: COLORS.primary,
//     paddingHorizontal: 12,
//     paddingVertical: 12,
//   },
//   backBtn: { paddingRight: 12 },
//   backArrow: { color: "#fff", fontSize: 20 },
//   headerTitle: { flex: 1, color: "#fff", fontSize: 16, fontWeight: "700" },
//   headerDate: { color: "rgba(255,255,255,0.7)", fontSize: 12 },
//   breadcrumb: {
//     flexDirection: "row",
//     paddingHorizontal: 14,
//     paddingVertical: 6,
//     backgroundColor: "#E8EDF2",
//   },
//   breadcrumbText: { fontSize: 11, color: COLORS.textLight },
//   breadcrumbSep: { fontSize: 11, color: COLORS.textLight },
//   breadcrumbActive: { color: COLORS.primary, fontWeight: "600" },
//   scroll: { flex: 1 },
//   content: { paddingTop: 10, paddingBottom: 24 },
//   profileCard: { marginHorizontal: 12, marginBottom: 12 },
//   profileTop: { flexDirection: "row", alignItems: "center", padding: 14 },
//   profileInfo: { flex: 1, marginLeft: 12 },
//   profileName: { fontSize: 15, fontWeight: "700", color: COLORS.textDark },
//   profileSub: { fontSize: 11, color: COLORS.textLight, marginTop: 2 },
//   targetBadge: {
//     backgroundColor: COLORS.primary,
//     borderRadius: 8,
//     paddingHorizontal: 10,
//     paddingVertical: 6,
//     alignItems: "center",
//   },
//   targetLabel: {
//     color: "rgba(255,255,255,0.7)",
//     fontSize: 8,
//     textTransform: "uppercase",
//   },
//   targetPct: { color: "#fff", fontSize: 16, fontWeight: "800" },
//   summaryRow: {
//     flexDirection: "row",
//     paddingHorizontal: 10,
//     paddingBottom: 12,
//   },
//   chartWrap: { paddingHorizontal: 10, paddingTop: 6, paddingBottom: 2 },
//   trendLabel: {
//     fontSize: 9,
//     color: COLORS.textLight,
//     textTransform: "uppercase",
//     marginBottom: 4,
//     paddingLeft: 4,
//   },
//   chartAxisRow: {
//     flexDirection: "row",
//     justifyContent: "space-between",
//     paddingHorizontal: 4,
//     marginTop: 2,
//   },
//   axisLabel: { fontSize: 9, color: COLORS.textLight },
//   subHeader: {
//     fontSize: 9,
//     color: COLORS.textLight,
//     textTransform: "uppercase",
//     letterSpacing: 0.5,
//     paddingHorizontal: 14,
//     paddingTop: 10,
//     paddingBottom: 2,
//   },
//   progressWrap: { paddingTop: 4 },
//   progressLabels: {
//     flexDirection: "row",
//     justifyContent: "space-between",
//     paddingHorizontal: 14,
//     marginTop: 4,
//   },
//   progressLabelLeft: { fontSize: 10, color: COLORS.teal },
//   progressLabelRight: { fontSize: 10, color: COLORS.textLight },
//   breadcrumbHelp: {
//     marginLeft: "auto",
//     width: 20,
//     height: 20,
//     borderRadius: 10,
//     backgroundColor: COLORS.primary,
//     alignItems: "center",
//     justifyContent: "center",
//   },
//   breadcrumbHelpText: {
//     color: "#fff",
//     fontSize: 11,
//     fontWeight: "700",
//   },
// });

// screens/SalesExecDashboardScreen.js
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SubScreenHeader } from "../../../../components/layout/SubScreenHeader";
import { api, formatAmount } from "../api/api";
import InteractiveDailyTrendChart from "../components/InteractiveDailyTrendChart";
import SalesExecDashboardSkeleton from "../components/SalesExecDashboardSkeleton";
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
  TotalRow,
} from "../components/SharedComponents";
import TourOverlay from "../components/TourOverlay";
import { SALES_EXEC_DASHBOARD_TOUR } from "./DashboardTours";

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
const firstParam = (value) => {
  if (Array.isArray(value)) return value[0];
  return value;
};

const asString = (value, fallback = "") => {
  const resolved = firstParam(value);
  if (resolved === undefined || resolved === null) return fallback;
  return String(resolved);
};

const asNumber = (value, fallback = 0) => {
  const resolved = Number(firstParam(value));
  return Number.isFinite(resolved) ? resolved : fallback;
};

const safeArray = (value) => (Array.isArray(value) ? value : []);
const safeNumber = (value) => {
  const resolved = Number(value);
  return Number.isFinite(resolved) ? resolved : 0;
};

export default function SalesExecDashboardScreen({
  navigation,
  route,
  username,
  visibleSections = { sales: true, production: false, collection: true, outstanding: true },
}) {
  const router = useRouter();
  const routerParams = useLocalSearchParams();
  const routeParams = route?.params || route || {};

  // Expo Router supplies Owner drill-down values through useLocalSearchParams().
  // My View supplies values through route.params. Route params intentionally win.
  const mergedParams = {
    ...routerParams,
    ...routeParams,
  };

  const activeTab =
    asString(mergedParams.activeTab).toLowerCase() === "myview"
      ? "myview"
      : "owner";
  const isMyView = activeTab === "myview";

  const selectedExecId = asNumber(mergedParams.execId, 0);
  const execName = asString(mergedParams.execName);
  const routeExecScope = asString(mergedParams.execScope).toLowerCase();

  const isUnassigned =
    !isMyView &&
    (
      routeExecScope === "unassigned" ||
      selectedExecId === 0 ||
      execName.trim().toLowerCase() === "unassigned"
    );

  const execId = isMyView ? 0 : selectedExecId;
  const execColor = asString(mergedParams.execColor);
  const routeDate = asString(mergedParams.date);
  const date = routeDate || new Date().toISOString().split("T")[0];

  const [getUserPrptype, setUserPrptype] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [showTour, setShowTour] = useState(false);

  const [outstandingSort, setOutstandingSort] = useState("desc");

  console.log('Sales activeTab: ', activeTab);

  useEffect(() => {
    let mounted = true;

    const initializeApp = async () => {
      try {
        const storedPrpType = await AsyncStorage.getItem("user_prptype");
        if (!mounted) return;

        const routePrpType = asString(mergedParams.getUserPrptype);
        setUserPrptype(routePrpType || storedPrpType || "");
      } catch (initializationError) {
        console.error("Sales executive dashboard initialization error:", initializationError);
        if (mounted) {
          setError("Unable to read the dashboard property settings.");
          setLoading(false);
        }
      }
    };

    initializeApp();
    return () => {
      mounted = false;
    };
  }, [mergedParams.getUserPrptype]);

  const load = useCallback(
    async (prpType, options = {}) => {
      const { initial = false } = options;

      if (!prpType) {
        setError("Property type is missing. Please sign in again.");
        setLoading(false);
        setRefreshing(false);
        return;
      }

      if (!isMyView && !isUnassigned && execId <= 0) {
        setError("Selected sales executive code is missing.");
        setLoading(false);
        setRefreshing(false);
        return;
      }

      try {
        setError(null);
        if (initial) setLoading(true);

        const effectiveExecId = isMyView
          ? 0
          : (isUnassigned ? -1 : execId);

        const res = await api.getExecDashboard(
          effectiveExecId,
          date,
          prpType
        );

        if (!res?.success || !res?.data) {
          throw new Error(res?.message || "Failed to load executive dashboard.");
        }

        setData(res.data);
      } catch (loadError) {
        console.error("Sales executive dashboard API error:", {
          activeTab,
          execId: isMyView ? 0 : (isUnassigned ? -1 : execId),
          execScope: isUnassigned ? "unassigned" : (isMyView ? "myview" : "executive"),
          selectedExecId,
          execName,
          date,
          error: loadError,
        });
        setError(loadError?.message || "Network error. Please retry.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [activeTab, date, execId, execName, isMyView, isUnassigned, selectedExecId]
  );

  useEffect(() => {
    if (!getUserPrptype) return;
    load(getUserPrptype, { initial: true });
  }, [getUserPrptype, load]);

  const onRefresh = useCallback(() => {
    if (!getUserPrptype || refreshing) return;
    setRefreshing(true);
    load(getUserPrptype);
  }, [getUserPrptype, load, refreshing]);

  const goToParty = useCallback(
    (party) => {
      const partyId = asString(party?.party_id);
      if (!partyId) return;

      const responseExecId =
        data?.exec_info?.exec_id ??
        data?.exec_info?.id ??
        data?.exec_info?.sexe ??
        selectedExecId;

      router.push({
        pathname: "/new/PartyDashboardNew",
        params: {
          partyId,
          partyName: asString(party?.party_name, "Party"),
          execId: String(
            isUnassigned ? 0 : asNumber(responseExecId, 0)
          ),
          execScope: isUnassigned
            ? "unassigned"
            : (isMyView ? "myview" : "executive"),
          execName: asString(data?.exec_info?.name, execName),
          execColor: asString(data?.exec_info?.avatar_color, execColor),
          date,
          activeTab,
          getUserPrptype,
        },
      });
    },
    [
      activeTab,
      data,
      date,
      execColor,
      execName,
      getUserPrptype,
      isMyView,
      isUnassigned,
      router,
      selectedExecId,
    ]
  );

  if (loading) {
    return <SalesExecDashboardSkeleton showProfile={!isMyView} />;
  }

  if (error) {
    return (
      <ErrorView
        message={error}
        onRetry={() => load(getUserPrptype, { initial: true })}
      />
    );
  }

  if (!data) {
    return (
      <ErrorView
        message="Executive dashboard data is unavailable."
        onRetry={() => load(getUserPrptype, { initial: true })}
      />
    );
  }

  const exec_info = data?.exec_info || {};
  const summary = data?.summary || {};
  const sales = data?.sales || {};
  const collection = data?.collection || {};
  const outstanding = data?.outstanding || {};

  const salesTotal = sales?.total || {};
  const collectionTotal = collection?.total || {};
  const salesDailyTrend = safeArray(sales?.daily_trend);
  const collectionDailyTrend = safeArray(collection?.daily_trend);
  const salesByParty = safeArray(sales?.by_party);
  const collectionByParty = safeArray(collection?.by_party);
  const outstandingByParty = safeArray(collection?.outstanding_by_party);

  const collectedToday = safeNumber(collectionTotal?.today);
  const amountDue = safeNumber(collectionTotal?.due);
  const collectionBase = collectedToday + amountDue;
  const collectionPct =
    collectionBase > 0 ? (collectedToday / collectionBase) * 100 : 0;


  const sortedOutstanding = [...outstandingByParty].sort((a, b) => {
    const aValue = Number(a?.amount || 0);
    const bValue = Number(b?.amount || 0);

    return outstandingSort === "asc"
      ? aValue - bValue
      : bValue - aValue;
  });

  const toggleOutstandingSort = () => {
    setOutstandingSort(prev => (prev === "desc" ? "asc" : "desc"));
  };


  return (
    <>
      {/* {activeTab !== 'myview' ? (
        <HeaderBarwithBack
          userName={username}
          header={exec_info.name || execName || "Executive"}
          subHeader={date}
          noBorderRadius={true}
          breadcrumb={'Doff Entry'}
          SearchBar={false}
        // noBorderRadius={true}
        />
      ) : null} */}
      {/* FIX: this screen previously had NO real header at all — its old
          hand-rolled header block (below) had been commented out at some
          point, leaving only the breadcrumb row, no navy header, and no
          sign-out button. Replaced with SubScreenHeader, the component
          already built for exactly this case (sub-screen + back button). */}
      <SafeAreaView style={styles.safe} edges={["bottom", "left", "right"]}>
        {activeTab !== "myview" && (
          <SubScreenHeader backLabel="Back" title={exec_info.name || execName || "Executive"} />
        )}
        {/* Dead code below kept commented for reference; no longer used.
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
          >
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{exec_info.name || execName || "Executive"}</Text>
          <Text style={styles.headerDate}>{date}</Text>
        </View> */}

        {/* Breadcrumb */}
        {!isMyView && (
          <View style={styles.breadcrumb}>
            <TouchableOpacity onPress={() => router.back()}>
              <Text style={styles.breadcrumbText}> Back </Text>
            </TouchableOpacity>
            <Text style={styles.breadcrumbSep}> › </Text>
            <Text style={styles.breadcrumbText}>Owner</Text>
            <Text style={styles.breadcrumbSep}> › </Text>
            <Text style={[styles.breadcrumbText, styles.breadcrumbActive]}>
              {exec_info.name || execName || "Executive"}
            </Text>
            <TouchableOpacity
              style={styles.breadcrumbHelp}
              onPress={() => setShowTour(true)}
            >
              <Text style={styles.breadcrumbHelpText}>?</Text>
            </TouchableOpacity>
          </View>
        )}

        <ScrollView
          style={styles.scroll}
          nestedScrollEnabled={true}
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[COLORS.teal]}
            />
          }
        >
          {/* ─── Exec Profile Card ─── */}
          {!isMyView && (
            <SectionCard style={styles.profileCard}>
              <View style={styles.profileTop}>
                <AvatarCircle
                  name={exec_info.name || execName || "Executive"}
                  color={exec_info.avatar_color || execColor}
                  size={44}
                />
                <View style={styles.profileInfo}>
                  <Text style={styles.profileName}>{exec_info.name || execName || "Executive"}</Text>
                  <Text style={styles.profileSub}>
                    {exec_info.city || ""}{exec_info.city ? " · " : ""}{safeNumber(exec_info.total_customers)} customers
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
                  value={formatAmount(safeNumber(summary.today_sale))}
                  rawValue={safeNumber(summary.today_sale)}
                />
                <SummaryCard
                  label="TOTAL BILLED"
                  value={formatAmount(safeNumber(summary.total_billed_mtd))}
                  rawValue={safeNumber(summary.total_billed_mtd)}
                />
                <SummaryCard
                  label="OUTSTANDING"
                  value={formatAmount(safeNumber(summary.outstanding))}
                  rawValue={safeNumber(summary.outstanding)}
                />
              </View>
            </SectionCard>
          )}

          {/* ─── SALES SECTION ─── */}
          {visibleSections.sales && (
            <SectionCard>
              <SectionHeader
                icon="📊"
                title="SALES"
                bgColor={COLORS.salesBg}
                action="Full report"
                onAction={() => router.push("/new/(tabs)/reports/monthly-report")}
              />

              <TotalRow
                leftLabel="TODAY"
                leftValue={formatAmount(safeNumber(salesTotal.today))}
                tealLeft
                rightLabel="US MTD"
                rightValue={formatAmount(safeNumber(salesTotal.mtd))}
                rawLeftValue={safeNumber(salesTotal.today)}
                rawRightValue={safeNumber(salesTotal.mtd)}
              />

              <View style={styles.chartWrap}>
                <Text style={styles.trendLabel}>DAILY TREND</Text>
                <InteractiveDailyTrendChart
                  data={salesDailyTrend}
                  valueKey="amount"
                  labelKey="day"
                  color={COLORS.teal}
                  fillColor={COLORS.teal}
                  height={64}
                  pointGap={54}
                  valueFormatter={value => formatAmount(Number(value || 0))}
                  showBaseline
                  showHint
                />
              </View>

              <Text style={styles.subHeader}>TOP CUSTOMERS BY SALES</Text>
              <ColHeader label1="CUSTOMER" label2="TODAY" label3="BILLED" />
              <TableWrapper rowCount={salesByParty.length}>
                {salesByParty.map((p) => (
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
          )}

          {/* ─── PAYMENT COLLECTION SECTION ─── */}
          {visibleSections.collection && (
            <SectionCard>
              <SectionHeader
                icon="💰"
                title="PAYMENT COLLECTION"
                bgColor={COLORS.collBg}
                action="Full report"
                onAction={() => router.push("/new/(tabs)/reports/monthly-report")}
              />

              <TotalRow
                leftLabel="TODAY"
                leftValue={formatAmount(collectedToday)}
                tealLeft
                rightLabel="DUE"
                rightValue={formatAmount(amountDue)}
                rawLeftValue={collectedToday}
                rawRightValue={amountDue}
              />

              {/* Progress bar: collected vs due */}
              <View style={styles.progressWrap}>
                <ProgressBar
                  pct={collectionPct}
                  color={COLORS.teal}
                />
                <View style={styles.progressLabels}>
                  <Text style={styles.progressLabelLeft}>
                    Collected{" "}
                    {collectionPct.toFixed(1)}
                    %
                  </Text>
                  <Text style={styles.progressLabelRight}>
                    Pending{" "}
                    {(100 - collectionPct).toFixed(1)}
                    %
                  </Text>
                </View>
              </View>

              <View style={styles.chartWrap}>
                <Text style={styles.trendLabel}>COLLECTION TREND</Text>
                <InteractiveDailyTrendChart
                  data={collectionDailyTrend}
                  valueKey="amount"
                  labelKey="day"
                  color={COLORS.green}
                  fillColor={COLORS.green}
                  height={64}
                  pointGap={54}
                  valueFormatter={value => formatAmount(Number(value || 0))}
                  showBaseline
                  showHint
                />
              </View>

              {/* Collections highest first */}
              <Text style={styles.subHeader}>COLLECTIONS — HIGHEST FIRST</Text>
              <ColHeader label1="CUSTOMER" label2="TODAY" label3="TOTAL" />
              <TableWrapper rowCount={collectionByParty.length}>
                {collectionByParty.map((p) => (
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
            </SectionCard>
          )}

          {/* ─── OUTSTANDING SECTION ─── */}
          {visibleSections.outstanding && (
            <SectionCard>
              <SectionHeader
                icon="⚠️"
                title="OUTSTANDING"
                bgColor={COLORS.outsBg}
              />
              <Text style={styles.subHeader}>OUTSTANDING — HIGHEST FIRST</Text>
              {/* <ColHeader label1="CUSTOMER" label2="" label3="AMOUNT" /> */}
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <ColHeader
                  label1="CUSTOMER"
                  label2=""
                  label3="AMOUNT"
                />

                <TouchableOpacity
                  onPress={toggleOutstandingSort}
                  style={{
                    marginLeft: -12,
                    paddingLeft: 0,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 9,
                      color: "#8C837B",
                    }}
                  >
                    ▼
                  </Text>
                </TouchableOpacity>
              </View>
              {/* <TableWrapper rowCount={outstandingByParty.length}>
                {outstandingByParty.map((p) => ( */}
              <TableWrapper rowCount={outstandingByParty.length}>
                {sortedOutstanding.map((p) => (
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
          )}
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
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: "#E8EDF2",
  },
  breadcrumbText: { fontSize: 11, color: COLORS.textLight },
  breadcrumbSep: { fontSize: 11, color: COLORS.textLight },
  breadcrumbActive: { color: COLORS.primary, fontWeight: "600" },
  scroll: { flex: 1 },
  content: { paddingTop: 10, paddingBottom: 24 },
  profileCard: { marginHorizontal: 12, marginBottom: 12 },
  profileTop: { flexDirection: "row", alignItems: "center", padding: 14 },
  profileInfo: { flex: 1, marginLeft: 12 },
  profileName: { fontSize: 15, fontWeight: "700", color: COLORS.textDark },
  profileSub: { fontSize: 11, color: COLORS.textLight, marginTop: 2 },
  targetBadge: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: "center",
  },
  targetLabel: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 8,
    textTransform: "uppercase",
  },
  targetPct: { color: "#fff", fontSize: 16, fontWeight: "800" },
  summaryRow: {
    flexDirection: "row",
    paddingHorizontal: 10,
    paddingBottom: 12,
  },
  chartWrap: { paddingHorizontal: 10, paddingTop: 6, paddingBottom: 2 },
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
    marginTop: 2,
  },
  axisLabel: { fontSize: 9, color: COLORS.textLight },
  subHeader: {
    fontSize: 9,
    color: COLORS.textLight,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 2,
  },
  progressWrap: { paddingTop: 4 },
  progressLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    marginTop: 4,
  },
  progressLabelLeft: { fontSize: 10, color: COLORS.teal },
  progressLabelRight: { fontSize: 10, color: COLORS.textLight },
  breadcrumbHelp: {
    marginLeft: "auto",
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  breadcrumbHelpText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },
});
