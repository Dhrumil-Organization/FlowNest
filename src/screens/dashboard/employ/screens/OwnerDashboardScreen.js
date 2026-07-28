// // screens/OwnerDashboardScreen.js
// import DateTimePicker from '@react-native-community/datetimepicker';
// import { useRouter } from 'expo-router';
// import React, { useCallback, useEffect, useState } from 'react';
// import {
//   Platform,
//   RefreshControl,
//   SafeAreaView,
//   ScrollView,
//   StyleSheet,
//   Text,
//   View
// } from 'react-native';
// import { api, formatAmount } from '../api/api';
// import DashboardSkeleton from '../components/DashboardSkeleton'; // ← NEW
// import MiniLineChart from '../components/MiniLineChart';
// import {
//   ColHeader,
//   COLORS,
//   ErrorView,
//   LongPressValue,
//   RankRow,
//   SectionCard,
//   SectionHeader,
//   TotalRow
// } from '../components/SharedComponents';
// import TourOverlay from '../components/TourOverlay';
// import { OWNER_DASHBOARD_TOUR } from './DashboardTours';

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
//  * OwnerDashboardScreen
//  *
//  * Shown when user has is_owner = true
//  * Navigation prop expected: navigation (React Navigation)
//  * Route params: { user } — the logged-in user object from /auth/me
//  *
//  * Navigates to:
//  *   SalesExecDashboard  when tapping exec row in Collection or Outstanding
//  */
// export default function OwnerDashboardScreen({
//   navigation,
//   route,
//   getUserPrptype,
// }) {
//   const router = useRouter();
//   const { user } = route.params || {};
//   const [data, setData] = useState(null);
//   const [loading, setLoading] = useState(true);
//   const [refreshing, setRefreshing] = useState(false);
//   const [error, setError] = useState(null);

//   // ── Date state as Date object ──
//   const [date, setDate] = useState(new Date());
//   const [showPicker, setShowPicker] = useState(false);

//   // YYYY-MM-DD string for API
//   const dateString = date.toISOString().split('T')[0];
//   const [showTour, setShowTour] = useState(false);

//   const load = useCallback(
//     async getUserPrptype => {
//       try {
//         setError(null);
//         setLoading(true);
//         const res = await api.getOwnerDashboard(dateString, getUserPrptype);
//         console.log('getOwnerDashboard', res);
//         if (res.success) setData(res.data);
//         else setError('Failed to load dashboard');
//       } catch (e) {
//         setError('Network error. Please retry.');
//       } finally {
//         setLoading(false);
//         setRefreshing(false);
//       }
//     },
//     [dateString],
//   );

//   useEffect(() => {
//     if (!getUserPrptype) return;
//     load(getUserPrptype);
//   }, [load, getUserPrptype]);

//   const onRefresh = () => {
//     setRefreshing(true);
//     load(getUserPrptype);
//   };

//   const onDateChange = (event, selectedDate) => {
//     // Android: picker closes automatically; iOS: keep open
//     if (Platform.OS === 'android') setShowPicker(false);
//     if (selectedDate) setDate(selectedDate); // triggers useEffect → auto API call
//   };

//   const goToExec = exec => {
//     navigation.navigate('SalesExecDashboard', {
//       execId: exec.exec_id,
//       execName: exec.name,
//       execColor: exec.avatar_color,
//       date: dateString,
//       user,
//       getUserPrptype,
//     });
//   };

//   if (loading) return <DashboardSkeleton />;
//   if (error)
//     return <ErrorView message={error} onRetry={() => load(getUserPrptype)} />;
//   if (!data) return null;

//   const { sales, production, collection, outstanding } = data;

//   const salesTrend = sales.daily_trend.map(d => d.amount);
//   const productionTrend = production.daily_trend.map(d => d.meters);
//   const collectionTrend = collection.daily_trend.map(d => d.amount);

//   return (
//     <>
//       <SafeAreaView style={styles.safe}>
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
//           {/* ── DATE PICKER BAR ── */}
//           {/* <View style={styles.dateBar}>
//             <TouchableOpacity
//               style={styles.dateBtn}
//               onPress={() => setShowPicker(true)}
//             >
//               <Text style={styles.dateBtnIcon}>📅</Text>
//               <Text style={styles.dateBtnText}>{dateString}</Text>
//             </TouchableOpacity>

//             <View style={styles.dateBarRight}>
//               <TouchableOpacity style={styles.refreshBtn} onPress={onRefresh}>
//                 <Text style={styles.refreshBtnText}>↻ Refresh</Text>
//               </TouchableOpacity>
//               <TouchableOpacity
//                 style={styles.helpBtn}
//                 onPress={() => setShowTour(true)}
//               >
//                 <Text style={styles.helpBtnText}>?</Text>
//               </TouchableOpacity>
//             </View>
//           </View> */}

//           {/* iOS picker shown inline; Android shows native modal on its own */}
//           {showPicker && (
//             <DateTimePicker
//               value={date}
//               mode="date"
//               display={Platform.OS === 'ios' ? 'spinner' : 'default'}
//               onChange={onDateChange}
//               maximumDate={new Date()}
//             />
//           )}

//           {/* ── SALES SECTION ── */}
//           <SectionCard>
//             <SectionHeader
//               icon="📊"
//               title="SALES"
//               bgColor={COLORS.salesBg}
//               rightText={dateString}
//               action="Full report"
//               onAction={() => router.push('/new/(tabs)/reports/monthly-report')}
//             />

//             <TotalRow
//               leftLabel="TODAY"
//               leftValue={formatAmount(sales.total.today)}
//               tealLeft
//               rightLabel="MTD"
//               rightValue={formatAmount(sales.total.mtd)}
//               rawLeftValue={sales.total.today}
//               rawRightValue={sales.total.mtd}
//             />

//             <View style={styles.chartWrap}>
//               <Text style={styles.trendLabel}>DAILY TREND</Text>
//               <MiniLineChart
//                 data={salesTrend}
//                 color={COLORS.teal}
//                 fillColor={COLORS.teal}
//                 width={340}
//                 height={55}
//               />
//               <View style={styles.chartAxisRow}>
//                 {sales.daily_trend.map((d, i) => (
//                   <Text key={i} style={styles.axisLabel}>
//                     {d.day}
//                   </Text>
//                 ))}
//               </View>
//             </View>

//             <ColHeader label1="CATEGORY" label2="TODAY" label3="MTD" />
//             <TableWrapper rowCount={sales.by_category.length}>
//               {sales.by_category.map((cat, i) => (
//                 <View key={i} style={styles.catItem}>
//                   <RankRow
//                     rank={i + 1}
//                     name={cat.name}
//                     leftVal={formatAmount(cat.today)}
//                     rightVal={formatAmount(cat.mtd)}
//                     rawLeftVal={cat.today}
//                     rawRightVal={cat.mtd}
//                     trendUp={cat.trend === 'up'}
//                     noBorder
//                   />
//                   <View style={styles.catRow2}>
//                     <View style={styles.row2Spacer} />
//                     <View style={{ flex: 1 }} />
//                     <View style={styles.row2Col}>
//                       <Text style={styles.subLabel}>Qty:</Text>
//                     </View>
//                     <View style={styles.row2Col}>
//                       <LongPressValue
//                         rawValue={cat.todayqty}
//                         formattedValue={
//                           cat?.todayqty ? formatAmount(cat.todayqty) : 0
//                         }
//                         style={[styles.subVal, { color: COLORS.green }]}
//                       />
//                     </View>
//                     <View style={styles.row2Col}>
//                       <LongPressValue
//                         rawValue={cat.mtdqty}
//                         formattedValue={
//                           cat?.mtdqty ? formatAmount(cat.mtdqty) : 0
//                         }
//                         style={[styles.subVal, { color: COLORS.orange }]}
//                       />
//                     </View>
//                   </View>
//                 </View>
//               ))}
//             </TableWrapper>
//           </SectionCard>

//           {/* ── PRODUCTION SECTION ── */}
//           <SectionCard>
//             <SectionHeader
//               icon="⚙️"
//               title="PRODUCTION"
//               bgColor={COLORS.prodBg}
//               rightText={dateString}
//             />

//             <TotalRow
//               leftLabel="TODAY (m)"
//               leftValue={production.total.today_meters.toLocaleString('en-IN')}
//               tealLeft
//               rightLabel="MTD (m)"
//               rightValue={production.total.mtd_meters.toLocaleString('en-IN')}
//               rawLeftValue={production.total.today_meters}
//               rawRightValue={production.total.mtd_meters}
//               tooltipPrefix=""
//             />

//             <View style={styles.chartWrap}>
//               <Text style={styles.trendLabel}>DAILY TREND</Text>
//               <MiniLineChart
//                 data={productionTrend}
//                 color="#AB47BC"
//                 fillColor="#AB47BC"
//                 width={340}
//                 height={55}
//               />
//               <View style={styles.chartAxisRow}>
//                 {production.daily_trend.map((d, i) => (
//                   <Text key={i} style={styles.axisLabel}>
//                     {d.day}
//                   </Text>
//                 ))}
//               </View>
//             </View>

//             <ColHeader label1="MACHINE" label2="TODAY" label3="MTD" />
//             <TableWrapper rowCount={production.by_machine.length}>
//               {production.by_machine.map((m, i) => (
//                 <RankRow
//                   key={i}
//                   rank={i + 1}
//                   name={m.machine}
//                   leftVal={`${(m.target / 1000).toFixed(0)}K m`}
//                   rightVal={`${(m.today / 1000).toFixed(1)}K m`}
//                   trendUp={m.achievement === 'up'}
//                 />
//               ))}
//             </TableWrapper>
//           </SectionCard>

//           {/* ── PAYMENT COLLECTION SECTION ── */}
//           <SectionCard>
//             <SectionHeader
//               icon="💰"
//               title="PAYMENT COLLECTION"
//               bgColor={COLORS.collBg}
//               rightText={dateString}
//               action="Full report"
//               onAction={() => router.push('/new/(tabs)/reports/monthly-report')}
//             />

//             <TotalRow
//               leftLabel="TODAY"
//               leftValue={formatAmount(collection.total.today)}
//               tealLeft
//               rightLabel="TOTAL MTD"
//               rightValue={formatAmount(collection.total.mtd)}
//               rawLeftValue={collection.total.today}
//               rawRightValue={collection.total.mtd}
//             />

//             <View style={styles.chartWrap}>
//               <Text style={styles.trendLabel}>DAILY TREND</Text>
//               <MiniLineChart
//                 data={collectionTrend}
//                 color={COLORS.green}
//                 fillColor={COLORS.green}
//                 width={340}
//                 height={55}
//               />
//               <View style={styles.chartAxisRow}>
//                 {collection.daily_trend.map((d, i) => (
//                   <Text key={i} style={styles.axisLabel}>
//                     {d.day}
//                   </Text>
//                 ))}
//               </View>
//             </View>

//             <Text style={styles.subHeader}>
//               BY SALES EXECUTIVE · TODAY · MTD
//             </Text>
//             <ColHeader label1="EXECUTIVE" label2="TODAY" label3="MTD" />
//             <TableWrapper rowCount={collection.by_exec.length}>
//               {collection.by_exec.map(exec => (
//                 <RankRow
//                   key={exec.exec_id}
//                   name={exec.name}
//                   avatarColor={exec.avatar_color}
//                   leftVal={formatAmount(exec.today)}
//                   rightVal={formatAmount(exec.mtd)}
//                   rawLeftVal={exec.today}
//                   rawRightVal={exec.mtd}
//                   onPress={() => goToExec(exec)}
//                 />
//               ))}
//             </TableWrapper>
//           </SectionCard>

//           {/* ── OUTSTANDING SECTION ── */}
//           <SectionCard>
//             <SectionHeader
//               icon="⚠️"
//               title="OUTSTANDING"
//               bgColor={COLORS.outsBg}
//             />

//             <View style={styles.outsTotalRow}>
//               <Text style={styles.outsTotalLabel}>Total Due</Text>
//               <LongPressValue
//                 rawValue={outstanding.total_due}
//                 formattedValue={formatAmount(outstanding.total_due)}
//                 style={styles.outsTotalValue}
//               />
//             </View>

//             <Text style={styles.subHeader}>
//               BY SALES EXECUTIVE · HIGHEST FIRST
//             </Text>
//             <ColHeader label1="EXECUTIVE" label2="" label3="OUTSTANDING" />
//             <TableWrapper rowCount={outstanding.by_exec.length}>
//               {outstanding.by_exec.map(exec => (
//                 <RankRow
//                   key={exec.exec_id}
//                   name={exec.name}
//                   avatarColor={exec.avatar_color}
//                   rightVal={formatAmount(exec.outstanding)}
//                   rawRightVal={exec.outstanding}
//                   trendUp={false}
//                   onPress={() => goToExec(exec)}
//                 />
//               ))}
//             </TableWrapper>
//           </SectionCard>
//         </ScrollView>
//       </SafeAreaView>
//       <TourOverlay
//         tourKey="owner_dashboard"
//         steps={OWNER_DASHBOARD_TOUR}
//         delay={800}
//         visible={showTour}
//         onClose={() => setShowTour(false)}
//       />
//     </>
//   );
// }

// const styles = StyleSheet.create({
//   // safe: { flex: 1, backgroundColor: COLORS.bg },
//   safe: { flex: 1 },
//   scroll: { flex: 1 },
//   content: { paddingTop: 8, paddingBottom: 24 },

//   // ── Date bar ──
//   dateBar: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'space-between',
//     marginHorizontal: 12,
//     marginBottom: 6,
//     marginTop: 0,
//   },
//   dateBtn: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     backgroundColor: '#fff',
//     borderRadius: 8,
//     paddingHorizontal: 12,
//     paddingVertical: 8,
//     elevation: 1,
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 1 },
//     shadowOpacity: 0.06,
//     shadowRadius: 2,
//     gap: 6,
//   },
//   dateBtnIcon: { fontSize: 14 },
//   dateBtnText: {
//     fontSize: 13,
//     fontWeight: '600',
//     color: COLORS.textDark,
//     letterSpacing: 0.3,
//   },
//   refreshBtn: {
//     backgroundColor: COLORS.teal,
//     borderRadius: 8,
//     paddingHorizontal: 14,
//     paddingVertical: 8,
//   },
//   refreshBtnText: {
//     color: '#fff',
//     fontSize: 13,
//     fontWeight: '600',
//   },

//   // ── Chart ──
//   chartWrap: { paddingHorizontal: 10, paddingTop: 6, paddingBottom: 2 },
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
//     marginTop: 2,
//   },
//   axisLabel: { fontSize: 9, color: COLORS.textLight },

//   // ── Sub header ──
//   subHeader: {
//     fontSize: 9,
//     color: COLORS.textLight,
//     textTransform: 'uppercase',
//     letterSpacing: 0.5,
//     paddingHorizontal: 14,
//     paddingTop: 10,
//     paddingBottom: 2,
//   },

//   // ── Outstanding total ──
//   outsTotalRow: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     paddingHorizontal: 14,
//     paddingVertical: 10,
//   },
//   outsTotalLabel: { fontSize: 12, color: COLORS.textMid, fontWeight: '600' },
//   outsTotalValue: { fontSize: 18, fontWeight: '800', color: COLORS.red },

//   // ── Category 2-row ──
//   catItem: {
//     borderBottomWidth: 1,
//     borderBottomColor: COLORS.border,
//   },
//   catRow2: {
//     flexDirection: 'row',
//     alignItems: 'flex-end',
//     paddingHorizontal: 14,
//     paddingBottom: 7,
//   },
//   row2Spacer: { width: 18 },
//   row2Col: {
//     width: 70,
//     alignItems: 'flex-end',
//   },
//   subLabel: {
//     fontSize: 9,
//     color: COLORS.textLight,
//     textTransform: 'uppercase',
//     letterSpacing: 0.3,
//     marginBottom: 1,
//   },
//   subVal: {
//     fontSize: 11,
//     fontWeight: '600',
//   },
//   dateBarRight: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 8,
//   },
//   helpBtn: {
//     width: 34,
//     height: 34,
//     borderRadius: 17,
//     backgroundColor: COLORS.primary,
//     alignItems: 'center',
//     justifyContent: 'center',
//   },
//   helpBtnText: {
//     color: '#fff',
//     fontSize: 16,
//     fontWeight: '700',
//   },
// });

// screens/OwnerDashboardScreen.js
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Platform,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { api, formatAmount } from '../api/api';
import DashboardSkeleton from '../components/DashboardSkeleton'; // ← NEW
import MiniLineChart from '../components/MiniLineChart';
import SalesDashboardCard from '../components/SalesDashboardCard';
import {
  ColHeader,
  COLORS,
  ErrorView,
  LongPressValue,
  RankRow,
  SectionCard,
  SectionHeader,
  TotalRow
} from '../components/SharedComponents';
import TourOverlay from '../components/TourOverlay';
import { OWNER_DASHBOARD_TOUR } from './DashboardTours';

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
 * OwnerDashboardScreen
 *
 * Shown when user has is_owner = true
 * Navigation prop expected: navigation (React Navigation)
 * Route params: { user } — the logged-in user object from /auth/me
 *
 * Navigates to:
 *   SalesExecDashboard  when tapping exec row in Collection or Outstanding
 */
export default function OwnerDashboardScreen({
  navigation,
  route,
  getUserPrptype,
}) {
  const router = useRouter();
  const { user } = route.params || {};
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // ── Date state as Date object ──
  const [date, setDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);

  // YYYY-MM-DD string for API
  const dateString = date.toISOString().split('T')[0];
  const [showTour, setShowTour] = useState(false);

  const load = useCallback(
    async getUserPrptype => {
      try {
        setError(null);
        setLoading(true);
        const res = await api.getOwnerDashboard(dateString, getUserPrptype);
        console.log('getOwnerDashboard', res);
        if (res.success) setData(res.data);
        else setError('Failed to load dashboard');
      } catch (e) {
        setError('Network error. Please retry.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [dateString],
  );

  useEffect(() => {
    if (!getUserPrptype) return;
    load(getUserPrptype);
  }, [load, getUserPrptype]);

  const onRefresh = () => {
    setRefreshing(true);
    load(getUserPrptype);
  };

  const onDateChange = (event, selectedDate) => {
    // Android: picker closes automatically; iOS: keep open
    if (Platform.OS === 'android') setShowPicker(false);
    if (selectedDate) setDate(selectedDate); // triggers useEffect → auto API call
  };

  const goToExec = exec => {
    navigation.navigate('SalesExecDashboard', {
      execId: exec.exec_id,
      execName: exec.name,
      execColor: exec.avatar_color,
      date: dateString,
      user,
      getUserPrptype,
    });
  };

  if (loading) return <DashboardSkeleton />;
  if (error)
    return <ErrorView message={error} onRetry={() => load(getUserPrptype)} />;
  if (!data) return null;

  const { sales, production, collection, outstanding } = data;

  const salesTrend = sales.daily_trend.map(d => d.amount);
  const productionTrend = production.daily_trend.map(d => d.meters);
  const collectionTrend = collection.daily_trend.map(d => d.amount);

  return (
    <>
      <SafeAreaView style={styles.safe}>
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
          {/* ── DATE PICKER BAR ── */}
          {/* <View style={styles.dateBar}>
            <TouchableOpacity
              style={styles.dateBtn}
              onPress={() => setShowPicker(true)}
            >
              <Text style={styles.dateBtnIcon}>📅</Text>
              <Text style={styles.dateBtnText}>{dateString}</Text>
            </TouchableOpacity>

            <View style={styles.dateBarRight}>
              <TouchableOpacity style={styles.refreshBtn} onPress={onRefresh}>
                <Text style={styles.refreshBtnText}>↻ Refresh</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.helpBtn}
                onPress={() => setShowTour(true)}
              >
                <Text style={styles.helpBtnText}>?</Text>
              </TouchableOpacity>
            </View>
          </View> */}

          {/* iOS picker shown inline; Android shows native modal on its own */}
          {showPicker && (
            <DateTimePicker
              value={date}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={onDateChange}
              maximumDate={new Date()}
            />
          )}

          {/* ── SALES SECTION ── */}
          <SalesDashboardCard
            sales={sales}
            dateString={dateString}
            view="owner"
          />

          {/* ── PRODUCTION SECTION ── */}
          <SectionCard>
            <SectionHeader
              icon="⚙️"
              title="PRODUCTION"
              bgColor={COLORS.prodBg}
              rightText={dateString}
            />

            <TotalRow
              leftLabel="TODAY (m)"
              leftValue={production.total.today_meters.toLocaleString('en-IN')}
              tealLeft
              rightLabel="MTD (m)"
              rightValue={production.total.mtd_meters.toLocaleString('en-IN')}
              rawLeftValue={production.total.today_meters}
              rawRightValue={production.total.mtd_meters}
              tooltipPrefix=""
            />

            <View style={styles.chartWrap}>
              <Text style={styles.trendLabel}>DAILY TREND</Text>
              <MiniLineChart
                data={productionTrend}
                color="#AB47BC"
                fillColor="#AB47BC"
                width={340}
                height={55}
              />
              <View style={styles.chartAxisRow}>
                {production.daily_trend.map((d, i) => (
                  <Text key={i} style={styles.axisLabel}>
                    {d.day}
                  </Text>
                ))}
              </View>
            </View>

            <ColHeader label1="MACHINE" label2="TODAY" label3="MTD" />
            <TableWrapper rowCount={production.by_machine.length}>
              {production.by_machine.map((m, i) => (
                <RankRow
                  key={i}
                  rank={i + 1}
                  name={m.machine}
                  leftVal={`${(m.target / 1000).toFixed(0)}K m`}
                  rightVal={`${(m.today / 1000).toFixed(1)}K m`}
                  trendUp={m.achievement === 'up'}
                />
              ))}
            </TableWrapper>
          </SectionCard>

          {/* ── PAYMENT COLLECTION SECTION ── */}
          <SectionCard>
            <SectionHeader
              icon="💰"
              title="PAYMENT COLLECTION"
              bgColor={COLORS.collBg}
              rightText={dateString}
              action="Full report"
              onAction={() => router.push('/new/(tabs)/reports/monthly-report')}
            />

            <TotalRow
              leftLabel="TODAY"
              leftValue={formatAmount(collection.total.today)}
              tealLeft
              rightLabel="TOTAL MTD"
              rightValue={formatAmount(collection.total.mtd)}
              rawLeftValue={collection.total.today}
              rawRightValue={collection.total.mtd}
            />

            <View style={styles.chartWrap}>
              <Text style={styles.trendLabel}>DAILY TREND</Text>
              <MiniLineChart
                data={collectionTrend}
                color={COLORS.green}
                fillColor={COLORS.green}
                width={340}
                height={55}
              />
              <View style={styles.chartAxisRow}>
                {collection.daily_trend.map((d, i) => (
                  <Text key={i} style={styles.axisLabel}>
                    {d.day}
                  </Text>
                ))}
              </View>
            </View>

            <Text style={styles.subHeader}>
              BY SALES EXECUTIVE · TODAY · MTD
            </Text>
            <ColHeader label1="EXECUTIVE" label2="TODAY" label3="MTD" />
            <TableWrapper rowCount={collection.by_exec.length}>
              {collection.by_exec.map(exec => (
                <RankRow
                  key={exec.exec_id}
                  name={exec.name}
                  avatarColor={exec.avatar_color}
                  leftVal={formatAmount(exec.today)}
                  rightVal={formatAmount(exec.mtd)}
                  rawLeftVal={exec.today}
                  rawRightVal={exec.mtd}
                  onPress={() => goToExec(exec)}
                />
              ))}
            </TableWrapper>
          </SectionCard>

          {/* ── OUTSTANDING SECTION ── */}
          <SectionCard>
            <SectionHeader
              icon="⚠️"
              title="OUTSTANDING"
              bgColor={COLORS.outsBg}
            />

            <View style={styles.outsTotalRow}>
              <Text style={styles.outsTotalLabel}>Total Due</Text>
              <LongPressValue
                rawValue={outstanding.total_due}
                formattedValue={formatAmount(outstanding.total_due)}
                style={styles.outsTotalValue}
              />
            </View>

            <Text style={styles.subHeader}>
              BY SALES EXECUTIVE · HIGHEST FIRST
            </Text>
            <ColHeader label1="EXECUTIVE" label2="" label3="OUTSTANDING" />
            <TableWrapper rowCount={outstanding.by_exec.length}>
              {outstanding.by_exec.map(exec => (
                <RankRow
                  key={exec.exec_id}
                  name={exec.name}
                  avatarColor={exec.avatar_color}
                  rightVal={formatAmount(exec.outstanding)}
                  rawRightVal={exec.outstanding}
                  trendUp={false}
                  onPress={() => goToExec(exec)}
                />
              ))}
            </TableWrapper>
          </SectionCard>
        </ScrollView>
      </SafeAreaView>
      <TourOverlay
        tourKey="owner_dashboard"
        steps={OWNER_DASHBOARD_TOUR}
        delay={800}
        visible={showTour}
        onClose={() => setShowTour(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  // safe: { flex: 1, backgroundColor: COLORS.bg },
  safe: { flex: 1 },
  scroll: { flex: 1 },
  content: { paddingTop: 8, paddingBottom: 24 },

  // ── Date bar ──
  dateBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 12,
    marginBottom: 6,
    marginTop: 0,
  },
  dateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    gap: 6,
  },
  dateBtnIcon: { fontSize: 14 },
  dateBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textDark,
    letterSpacing: 0.3,
  },
  refreshBtn: {
    backgroundColor: COLORS.teal,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  refreshBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },

  // ── Chart ──
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

  // ── Sub header ──
  subHeader: {
    fontSize: 9,
    color: COLORS.textLight,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 2,
  },

  // ── Outstanding total ──
  outsTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  outsTotalLabel: { fontSize: 12, color: COLORS.textMid, fontWeight: '600' },
  outsTotalValue: { fontSize: 18, fontWeight: '800', color: COLORS.red },

  // ── Category 2-row ──
  catItem: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  catRow2: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 14,
    paddingBottom: 7,
  },
  row2Spacer: { width: 18 },
  row2Col: {
    width: 70,
    alignItems: 'flex-end',
  },
  subLabel: {
    fontSize: 9,
    color: COLORS.textLight,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: 1,
  },
  subVal: {
    fontSize: 11,
    fontWeight: '600',
  },
  dateBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  helpBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  helpBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
