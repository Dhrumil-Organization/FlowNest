// // // // screens/OwnerDashboardScreen.js
// // // import DateTimePicker from '@react-native-community/datetimepicker';
// // // import { useRouter } from 'expo-router';
// // // import React, { useCallback, useEffect, useState } from 'react';
// // // import {
// // //   Platform,
// // //   RefreshControl,
// // //   SafeAreaView,
// // //   ScrollView,
// // //   StyleSheet,
// // //   Text,
// // //   View
// // // } from 'react-native';
// // // import { api, formatAmount } from '../api/api';
// // // import DashboardSkeleton from '../components/DashboardSkeleton'; // ← NEW
// // // import InteractiveDailyTrendChart from '../components/InteractiveDailyTrendChart';
// // // import {
// // //   ColHeader,
// // //   COLORS,
// // //   ErrorView,
// // //   LongPressValue,
// // //   RankRow,
// // //   SectionCard,
// // //   SectionHeader,
// // //   TotalRow
// // // } from '../components/SharedComponents';
// // // import TourOverlay from '../components/TourOverlay';
// // // import { OWNER_DASHBOARD_TOUR } from './DashboardTours';

// // // // ─── Table scroll wrapper: auto height <10 rows, fixed+scroll ≥10 rows ───────
// // // const ROW_HEIGHT = 70;
// // // const SCROLL_THRESHOLD = 4;
// // // const FIXED_TABLE_HEIGHT = ROW_HEIGHT * SCROLL_THRESHOLD;

// // // const TableWrapper = ({ rowCount, children }) => {
// // //   if (rowCount < SCROLL_THRESHOLD) {
// // //     return <View>{children}</View>;
// // //   }
// // //   return (
// // //     <ScrollView
// // //       style={{ maxHeight: FIXED_TABLE_HEIGHT }}
// // //       nestedScrollEnabled={true}
// // //       showsVerticalScrollIndicator={true}
// // //     >
// // //       {children}
// // //     </ScrollView>
// // //   );
// // // };

// // // /**
// // //  * OwnerDashboardScreen
// // //  *
// // //  * Shown when user has is_owner = true
// // //  * Navigation prop expected: navigation (React Navigation)
// // //  * Route params: { user } — the logged-in user object from /auth/me
// // //  *
// // //  * Navigates to:
// // //  *   SalesExecDashboard  when tapping exec row in Collection or Outstanding
// // //  */
// // // export default function OwnerDashboardScreen({
// // //   navigation,
// // //   route,
// // //   getUserPrptype,
// // // }) {
// // //   const router = useRouter();
// // //   const { user } = route.params || {};
// // //   const [data, setData] = useState(null);
// // //   const [loading, setLoading] = useState(true);
// // //   const [refreshing, setRefreshing] = useState(false);
// // //   const [error, setError] = useState(null);

// // //   // ── Date state as Date object ──
// // //   const [date, setDate] = useState(new Date());
// // //   const [showPicker, setShowPicker] = useState(false);

// // //   // YYYY-MM-DD string for API
// // //   const dateString = date.toISOString().split('T')[0];
// // //   const [showTour, setShowTour] = useState(false);

// // //   const load = useCallback(
// // //     async getUserPrptype => {
// // //       try {
// // //         setError(null);
// // //         setLoading(true);
// // //         const res = await api.getOwnerDashboard(dateString, getUserPrptype);
// // //         console.log('getOwnerDashboard', res);
// // //         if (res.success) setData(res.data);
// // //         else setError('Failed to load dashboard');
// // //       } catch (e) {
// // //         setError('Network error. Please retry.');
// // //       } finally {
// // //         setLoading(false);
// // //         setRefreshing(false);
// // //       }
// // //     },
// // //     [dateString],
// // //   );

// // //   useEffect(() => {
// // //     if (!getUserPrptype) return;
// // //     load(getUserPrptype);
// // //   }, [load, getUserPrptype]);

// // //   const onRefresh = () => {
// // //     setRefreshing(true);
// // //     load(getUserPrptype);
// // //   };

// // //   const onDateChange = (event, selectedDate) => {
// // //     // Android: picker closes automatically; iOS: keep open
// // //     if (Platform.OS === 'android') setShowPicker(false);
// // //     if (selectedDate) setDate(selectedDate); // triggers useEffect → auto API call
// // //   };

// // //   const goToExec = exec => {
// // //     navigation.navigate('SalesExecDashboard', {
// // //       execId: exec.exec_id,
// // //       execName: exec.name,
// // //       execColor: exec.avatar_color,
// // //       date: dateString,
// // //       user,
// // //       getUserPrptype,
// // //     });
// // //   };

// // //   if (loading) return <DashboardSkeleton />;
// // //   if (error)
// // //     return <ErrorView message={error} onRetry={() => load(getUserPrptype)} />;
// // //   if (!data) return null;

// // //   const { sales, production, collection, outstanding } = data;

// // // // // // // // // 
// // //   return (
// // //     <>
// // //       <SafeAreaView style={styles.safe}>
// // //         <ScrollView
// // //           style={styles.scroll}
// // //           nestedScrollEnabled={true}
// // //           contentContainerStyle={styles.content}
// // //           refreshControl={
// // //             <RefreshControl
// // //               refreshing={refreshing}
// // //               onRefresh={onRefresh}
// // //               colors={[COLORS.teal]}
// // //             />
// // //           }
// // //         >
// // //           {/* ── DATE PICKER BAR ── */}
// // //           {/* <View style={styles.dateBar}>
// // //             <TouchableOpacity
// // //               style={styles.dateBtn}
// // //               onPress={() => setShowPicker(true)}
// // //             >
// // //               <Text style={styles.dateBtnIcon}>📅</Text>
// // //               <Text style={styles.dateBtnText}>{dateString}</Text>
// // //             </TouchableOpacity>

// // //             <View style={styles.dateBarRight}>
// // //               <TouchableOpacity style={styles.refreshBtn} onPress={onRefresh}>
// // //                 <Text style={styles.refreshBtnText}>↻ Refresh</Text>
// // //               </TouchableOpacity>
// // //               <TouchableOpacity
// // //                 style={styles.helpBtn}
// // //                 onPress={() => setShowTour(true)}
// // //               >
// // //                 <Text style={styles.helpBtnText}>?</Text>
// // //               </TouchableOpacity>
// // //             </View>
// // //           </View> */}

// // //           {/* iOS picker shown inline; Android shows native modal on its own */}
// // //           {showPicker && (
// // //             <DateTimePicker
// // //               value={date}
// // //               mode="date"
// // //               display={Platform.OS === 'ios' ? 'spinner' : 'default'}
// // //               onChange={onDateChange}
// // //               maximumDate={new Date()}
// // //             />
// // //           )}

// // //           {/* ── SALES SECTION ── */}
// // //           <SectionCard>
// // //             <SectionHeader
// // //               icon="📊"
// // //               title="SALES"
// // //               bgColor={COLORS.salesBg}
// // //               rightText={dateString}
// // //               action="Full report"
// // //               onAction={() => openCollectionReport()}
// // //             />

// // //             <TotalRow
// // //               leftLabel="TODAY"
// // //               leftValue={formatAmount(sales.total.today)}
// // //               tealLeft
// // //               rightLabel="MTD"
// // //               rightValue={formatAmount(sales.total.mtd)}
// // //               rawLeftValue={sales.total.today}
// // //               rawRightValue={sales.total.mtd}
// // //             />

// // //             <View style={styles.chartWrap}>
// // //               <Text style={styles.trendLabel}>DAILY TREND</Text>
// // //               <MiniLineChart
// // //                 data={salesTrend}
// // //                 color={COLORS.teal}
// // //                 fillColor={COLORS.teal}
// // //                 width={340}
// // //                 height={55}
// // //               />
// // //               <View style={styles.chartAxisRow}>
// // //                 {sales.daily_trend.map((d, i) => (
// // //                   <Text key={i} style={styles.axisLabel}>
// // //                     {d.day}
// // //                   </Text>
// // //                 ))}
// // //               </View>
// // //             </View>

// // //             <ColHeader label1="CATEGORY" label2="TODAY" label3="MTD" />
// // //             <TableWrapper rowCount={sales.by_category.length}>
// // //               {sales.by_category.map((cat, i) => (
// // //                 <View key={i} style={styles.catItem}>
// // //                   <RankRow
// // //                     rank={i + 1}
// // //                     name={cat.name}
// // //                     leftVal={formatAmount(cat.today)}
// // //                     rightVal={formatAmount(cat.mtd)}
// // //                     rawLeftVal={cat.today}
// // //                     rawRightVal={cat.mtd}
// // //                     trendUp={cat.trend === 'up'}
// // //                     noBorder
// // //                   />
// // //                   <View style={styles.catRow2}>
// // //                     <View style={styles.row2Spacer} />
// // //                     <View style={{ flex: 1 }} />
// // //                     <View style={styles.row2Col}>
// // //                       <Text style={styles.subLabel}>Qty:</Text>
// // //                     </View>
// // //                     <View style={styles.row2Col}>
// // //                       <LongPressValue
// // //                         rawValue={cat.todayqty}
// // //                         formattedValue={
// // //                           cat?.todayqty ? formatAmount(cat.todayqty) : 0
// // //                         }
// // //                         style={[styles.subVal, { color: COLORS.green }]}
// // //                       />
// // //                     </View>
// // //                     <View style={styles.row2Col}>
// // //                       <LongPressValue
// // //                         rawValue={cat.mtdqty}
// // //                         formattedValue={
// // //                           cat?.mtdqty ? formatAmount(cat.mtdqty) : 0
// // //                         }
// // //                         style={[styles.subVal, { color: COLORS.orange }]}
// // //                       />
// // //                     </View>
// // //                   </View>
// // //                 </View>
// // //               ))}
// // //             </TableWrapper>
// // //           </SectionCard>

// // //           {/* ── PRODUCTION SECTION ── */}
// // //           <SectionCard>
// // //             <SectionHeader
// // //               icon="⚙️"
// // //               title="PRODUCTION"
// // //               bgColor={COLORS.prodBg}
// // //               rightText={dateString}
// // //             />

// // //             <TotalRow
// // //               leftLabel="TODAY (m)"
// // //               leftValue={production.total.today_meters.toLocaleString('en-IN')}
// // //               tealLeft
// // //               rightLabel="MTD (m)"
// // //               rightValue={production.total.mtd_meters.toLocaleString('en-IN')}
// // //               rawLeftValue={production.total.today_meters}
// // //               rawRightValue={production.total.mtd_meters}
// // //               tooltipPrefix=""
// // //             />

// // //             <View style={styles.chartWrap}>
// // //               <Text style={styles.trendLabel}>DAILY TREND</Text>
// // //               <MiniLineChart
// // //                 data={productionTrend}
// // //                 color="#AB47BC"
// // //                 fillColor="#AB47BC"
// // //                 width={340}
// // //                 height={55}
// // //               />
// // //               <View style={styles.chartAxisRow}>
// // //                 {production.daily_trend.map((d, i) => (
// // //                   <Text key={i} style={styles.axisLabel}>
// // //                     {d.day}
// // //                   </Text>
// // //                 ))}
// // //               </View>
// // //             </View>

// // //             <ColHeader label1="MACHINE" label2="TODAY" label3="MTD" />
// // //             <TableWrapper rowCount={production.by_machine.length}>
// // //               {production.by_machine.map((m, i) => (
// // //                 <RankRow
// // //                   key={i}
// // //                   rank={i + 1}
// // //                   name={m.machine}
// // //                   leftVal={`${(m.target / 1000).toFixed(0)}K m`}
// // //                   rightVal={`${(m.today / 1000).toFixed(1)}K m`}
// // //                   trendUp={m.achievement === 'up'}
// // //                 />
// // //               ))}
// // //             </TableWrapper>
// // //           </SectionCard>

// // //           {/* ── PAYMENT COLLECTION SECTION ── */}
// // //           <SectionCard>
// // //             <SectionHeader
// // //               icon="💰"
// // //               title="PAYMENT COLLECTION"
// // //               bgColor={COLORS.collBg}
// // //               rightText={dateString}
// // //               action="Full report"
// // //               onAction={() => openCollectionReport()}
// // //             />

// // //             <TotalRow
// // //               leftLabel="TODAY"
// // //               leftValue={formatAmount(collection.total.today)}
// // //               tealLeft
// // //               rightLabel="TOTAL MTD"
// // //               rightValue={formatAmount(collection.total.mtd)}
// // //               rawLeftValue={collection.total.today}
// // //               rawRightValue={collection.total.mtd}
// // //             />

// // //             <View style={styles.chartWrap}>
// // //               <Text style={styles.trendLabel}>DAILY TREND</Text>
// // //               <MiniLineChart
// // //                 data={collectionTrend}
// // //                 color={COLORS.green}
// // //                 fillColor={COLORS.green}
// // //                 width={340}
// // //                 height={55}
// // //               />
// // //               <View style={styles.chartAxisRow}>
// // //                 {collection.daily_trend.map((d, i) => (
// // //                   <Text key={i} style={styles.axisLabel}>
// // //                     {d.day}
// // //                   </Text>
// // //                 ))}
// // //               </View>
// // //             </View>

// // //             <Text style={styles.subHeader}>
// // //               BY SALES EXECUTIVE · TODAY · MTD
// // //             </Text>
// // //             <ColHeader label1="EXECUTIVE" label2="TODAY" label3="MTD" />
// // //             <TableWrapper rowCount={collection.by_exec.length}>
// // //               {collection.by_exec.map(exec => (
// // //                 <RankRow
// // //                   key={exec.exec_id}
// // //                   name={exec.name}
// // //                   avatarColor={exec.avatar_color}
// // //                   leftVal={formatAmount(exec.today)}
// // //                   rightVal={formatAmount(exec.mtd)}
// // //                   rawLeftVal={exec.today}
// // //                   rawRightVal={exec.mtd}
// // //                   onPress={() => openCollectionReport(exec)}
// // //                 />
// // //               ))}
// // //             </TableWrapper>
// // //           </SectionCard>

// // //           {/* ── OUTSTANDING SECTION ── */}
// // //           <SectionCard>
// // //             <SectionHeader
// // //               icon="⚠️"
// // //               title="OUTSTANDING"
// // //               bgColor={COLORS.outsBg}
// // //             />

// // //             <View style={styles.outsTotalRow}>
// // //               <Text style={styles.outsTotalLabel}>Total Due</Text>
// // //               <LongPressValue
// // //                 rawValue={outstanding.total_due}
// // //                 formattedValue={formatAmount(outstanding.total_due)}
// // //                 style={styles.outsTotalValue}
// // //               />
// // //             </View>

// // //             <Text style={styles.subHeader}>
// // //               BY SALES EXECUTIVE · HIGHEST FIRST
// // //             </Text>
// // //             <ColHeader label1="EXECUTIVE" label2="" label3="OUTSTANDING" />
// // //             <TableWrapper rowCount={outstanding.by_exec.length}>
// // //               {outstanding.by_exec.map(exec => (
// // //                 <RankRow
// // //                   key={exec.exec_id}
// // //                   name={exec.name}
// // //                   avatarColor={exec.avatar_color}
// // //                   rightVal={formatAmount(exec.outstanding)}
// // //                   rawRightVal={exec.outstanding}
// // //                   trendUp={false}
// // //                   onPress={() => openOutstandingReport(exec)}
// // //                 />
// // //               ))}
// // //             </TableWrapper>
// // //           </SectionCard>
// // //         </ScrollView>
// // //       </SafeAreaView>
// // //       <TourOverlay
// // //         tourKey="owner_dashboard"
// // //         steps={OWNER_DASHBOARD_TOUR}
// // //         delay={800}
// // //         visible={showTour}
// // //         onClose={() => setShowTour(false)}
// // //       />
// // //     </>
// // //   );
// // // }

// // // const styles = StyleSheet.create({
// // //   // safe: { flex: 1, backgroundColor: COLORS.bg },
// // //   safe: { flex: 1 },
// // //   scroll: { flex: 1 },
// // //   content: { paddingTop: 8, paddingBottom: 24 },

// // //   // ── Date bar ──
// // //   dateBar: {
// // //     flexDirection: 'row',
// // //     alignItems: 'center',
// // //     justifyContent: 'space-between',
// // //     marginHorizontal: 12,
// // //     marginBottom: 6,
// // //     marginTop: 0,
// // //   },
// // //   dateBtn: {
// // //     flexDirection: 'row',
// // //     alignItems: 'center',
// // //     backgroundColor: '#fff',
// // //     borderRadius: 8,
// // //     paddingHorizontal: 12,
// // //     paddingVertical: 8,
// // //     elevation: 1,
// // //     shadowColor: '#000',
// // //     shadowOffset: { width: 0, height: 1 },
// // //     shadowOpacity: 0.06,
// // //     shadowRadius: 2,
// // //     gap: 6,
// // //   },
// // //   dateBtnIcon: { fontSize: 14 },
// // //   dateBtnText: {
// // //     fontSize: 13,
// // //     fontWeight: '600',
// // //     color: COLORS.textDark,
// // //     letterSpacing: 0.3,
// // //   },
// // //   refreshBtn: {
// // //     backgroundColor: COLORS.teal,
// // //     borderRadius: 8,
// // //     paddingHorizontal: 14,
// // //     paddingVertical: 8,
// // //   },
// // //   refreshBtnText: {
// // //     color: '#fff',
// // //     fontSize: 13,
// // //     fontWeight: '600',
// // //   },

// // //   // ── Chart ──
// // //   chartWrap: { paddingHorizontal: 10, paddingTop: 6, paddingBottom: 2 },
// // //   trendLabel: {
// // //     fontSize: 9,
// // //     color: COLORS.textLight,
// // //     textTransform: 'uppercase',
// // //     marginBottom: 4,
// // //     paddingLeft: 4,
// // //   },
// // //   chartAxisRow: {
// // //     flexDirection: 'row',
// // //     justifyContent: 'space-between',
// // //     paddingHorizontal: 4,
// // //     marginTop: 2,
// // //   },
// // //   axisLabel: { fontSize: 9, color: COLORS.textLight },

// // //   // ── Sub header ──
// // //   subHeader: {
// // //     fontSize: 9,
// // //     color: COLORS.textLight,
// // //     textTransform: 'uppercase',
// // //     letterSpacing: 0.5,
// // //     paddingHorizontal: 14,
// // //     paddingTop: 10,
// // //     paddingBottom: 2,
// // //   },

// // //   // ── Outstanding total ──
// // //   outsTotalRow: {
// // //     flexDirection: 'row',
// // //     justifyContent: 'space-between',
// // //     alignItems: 'center',
// // //     paddingHorizontal: 14,
// // //     paddingVertical: 10,
// // //   },
// // //   outsTotalLabel: { fontSize: 12, color: COLORS.textMid, fontWeight: '600' },
// // //   outsTotalValue: { fontSize: 18, fontWeight: '800', color: COLORS.red },

// // //   // ── Category 2-row ──
// // //   catItem: {
// // //     borderBottomWidth: 1,
// // //     borderBottomColor: COLORS.border,
// // //   },
// // //   catRow2: {
// // //     flexDirection: 'row',
// // //     alignItems: 'flex-end',
// // //     paddingHorizontal: 14,
// // //     paddingBottom: 7,
// // //   },
// // //   row2Spacer: { width: 18 },
// // //   row2Col: {
// // //     width: 70,
// // //     alignItems: 'flex-end',
// // //   },
// // //   subLabel: {
// // //     fontSize: 9,
// // //     color: COLORS.textLight,
// // //     textTransform: 'uppercase',
// // //     letterSpacing: 0.3,
// // //     marginBottom: 1,
// // //   },
// // //   subVal: {
// // //     fontSize: 11,
// // //     fontWeight: '600',
// // //   },
// // //   paymentMeta: {
  //   marginTop: 3,
  //   fontSize: 10,
  //   color: COLORS.textLight,
  // },
  // dateBarRight: {
// // //     flexDirection: 'row',
// // //     alignItems: 'center',
// // //     gap: 8,
// // //   },
// // //   helpBtn: {
// // //     width: 34,
// // //     height: 34,
// // //     borderRadius: 17,
// // //     backgroundColor: COLORS.primary,
// // //     alignItems: 'center',
// // //     justifyContent: 'center',
// // //   },
// // //   helpBtnText: {
// // //     color: '#fff',
// // //     fontSize: 16,
// // //     fontWeight: '700',
// // //   },
// // // });

// // // screens/OwnerDashboardScreen.js
// // import DateTimePicker from '@react-native-community/datetimepicker';
// // import { useRouter } from 'expo-router';
// // import React, { useCallback, useEffect, useState } from 'react';
// // import {
// //   Platform,
// //   RefreshControl,
// //   SafeAreaView,
// //   ScrollView,
// //   StyleSheet,
// //   Text,
// //   View
// // } from 'react-native';
// // import { api, formatAmount } from '../api/api';
// // import DashboardSkeleton from '../components/DashboardSkeleton'; // ← NEW
// // import InteractiveDailyTrendChart from '../components/InteractiveDailyTrendChart';
// // import SalesDashboardCard from '../components/SalesDashboardCard';
// // import {
// //   ColHeader,
// //   COLORS,
// //   ErrorView,
// //   LongPressValue,
// //   RankRow,
// //   SectionCard,
// //   SectionHeader,
// //   TotalRow
// // } from '../components/SharedComponents';
// // import TourOverlay from '../components/TourOverlay';
// // import { OWNER_DASHBOARD_TOUR } from './DashboardTours';

// // // ─── Table scroll wrapper: auto height <10 rows, fixed+scroll ≥10 rows ───────
// // const ROW_HEIGHT = 70;
// // const SCROLL_THRESHOLD = 4;
// // const FIXED_TABLE_HEIGHT = ROW_HEIGHT * SCROLL_THRESHOLD;

// // const TableWrapper = ({ rowCount, children }) => {
// //   if (rowCount < SCROLL_THRESHOLD) {
// //     return <View>{children}</View>;
// //   }
// //   return (
// //     <ScrollView
// //       style={{ maxHeight: FIXED_TABLE_HEIGHT }}
// //       nestedScrollEnabled={true}
// //       showsVerticalScrollIndicator={true}
// //     >
// //       {children}
// //     </ScrollView>
// //   );
// // };

// // /**
// //  * OwnerDashboardScreen
// //  *
// //  * Shown when user has is_owner = true
// //  * Navigation prop expected: navigation (React Navigation)
// //  * Route params: { user } — the logged-in user object from /auth/me
// //  *
// //  * Navigates to:
// //  *   SalesExecDashboard  when tapping exec row in Collection or Outstanding
// //  */
// // export default function OwnerDashboardScreen({
// //   navigation,
// //   route,
// //   getUserPrptype,
// // }) {
// //   const router = useRouter();
// //   const { user } = route.params || {};
// //   const [data, setData] = useState(null);
// //   const [loading, setLoading] = useState(true);
// //   const [refreshing, setRefreshing] = useState(false);
// //   const [error, setError] = useState(null);

// //   // ── Date state as Date object ──
// //   const [date, setDate] = useState(new Date());
// //   const [showPicker, setShowPicker] = useState(false);

// //   // YYYY-MM-DD string for API
// //   const dateString = date.toISOString().split('T')[0];
// //   const [showTour, setShowTour] = useState(false);

// //   const load = useCallback(
// //     async getUserPrptype => {
// //       try {
// //         setError(null);
// //         setLoading(true);
// //         const res = await api.getOwnerDashboard(dateString, getUserPrptype);
// //         console.log('getOwnerDashboard', res);
// //         if (res.success) setData(res.data);
// //         else setError('Failed to load dashboard');
// //       } catch (e) {
// //         setError('Network error. Please retry.');
// //       } finally {
// //         setLoading(false);
// //         setRefreshing(false);
// //       }
// //     },
// //     [dateString],
// //   );

// //   useEffect(() => {
// //     if (!getUserPrptype) return;
// //     load(getUserPrptype);
// //   }, [load, getUserPrptype]);

// //   const onRefresh = () => {
// //     setRefreshing(true);
// //     load(getUserPrptype);
// //   };

// //   const onDateChange = (event, selectedDate) => {
// //     // Android: picker closes automatically; iOS: keep open
// //     if (Platform.OS === 'android') setShowPicker(false);
// //     if (selectedDate) setDate(selectedDate); // triggers useEffect → auto API call
// //   };

// //   const goToExec = exec => {
// //     navigation.navigate('SalesExecDashboard', {
// //       execId: exec.exec_id,
// //       execName: exec.name,
// //       execColor: exec.avatar_color,
// //       date: dateString,
// //       user,
// //       getUserPrptype,
// //     });
// //   };

// //   if (loading) return <DashboardSkeleton />;
// //   if (error)
// //     return <ErrorView message={error} onRetry={() => load(getUserPrptype)} />;
// //   if (!data) return null;

// //   const { sales, production, collection, outstanding } = data;

// // // // // // 
// //   return (
// //     <>
// //       <SafeAreaView style={styles.safe}>
// //         <ScrollView
// //           style={styles.scroll}
// //           nestedScrollEnabled={true}
// //           contentContainerStyle={styles.content}
// //           refreshControl={
// //             <RefreshControl
// //               refreshing={refreshing}
// //               onRefresh={onRefresh}
// //               colors={[COLORS.teal]}
// //             />
// //           }
// //         >
// //           {/* ── DATE PICKER BAR ── */}
// //           {/* <View style={styles.dateBar}>
// //             <TouchableOpacity
// //               style={styles.dateBtn}
// //               onPress={() => setShowPicker(true)}
// //             >
// //               <Text style={styles.dateBtnIcon}>📅</Text>
// //               <Text style={styles.dateBtnText}>{dateString}</Text>
// //             </TouchableOpacity>

// //             <View style={styles.dateBarRight}>
// //               <TouchableOpacity style={styles.refreshBtn} onPress={onRefresh}>
// //                 <Text style={styles.refreshBtnText}>↻ Refresh</Text>
// //               </TouchableOpacity>
// //               <TouchableOpacity
// //                 style={styles.helpBtn}
// //                 onPress={() => setShowTour(true)}
// //               >
// //                 <Text style={styles.helpBtnText}>?</Text>
// //               </TouchableOpacity>
// //             </View>
// //           </View> */}

// //           {/* iOS picker shown inline; Android shows native modal on its own */}
// //           {showPicker && (
// //             <DateTimePicker
// //               value={date}
// //               mode="date"
// //               display={Platform.OS === 'ios' ? 'spinner' : 'default'}
// //               onChange={onDateChange}
// //               maximumDate={new Date()}
// //             />
// //           )}

// //           {/* ── SALES SECTION ── */}
// //           <SalesDashboardCard
// //             sales={sales}
// //             dateString={dateString}
// //             view="owner"
// //           />

// //           {/* ── PRODUCTION SECTION ── */}
// //           <SectionCard>
// //             <SectionHeader
// //               icon="⚙️"
// //               title="PRODUCTION"
// //               bgColor={COLORS.prodBg}
// //               rightText={dateString}
// //             />

// //             <TotalRow
// //               leftLabel="TODAY (m)"
// //               leftValue={production.total.today_meters.toLocaleString('en-IN')}
// //               tealLeft
// //               rightLabel="MTD (m)"
// //               rightValue={production.total.mtd_meters.toLocaleString('en-IN')}
// //               rawLeftValue={production.total.today_meters}
// //               rawRightValue={production.total.mtd_meters}
// //               tooltipPrefix=""
// //             />

// //             <View style={styles.chartWrap}>
// //               <Text style={styles.trendLabel}>DAILY TREND</Text>
// //               <MiniLineChart
// //                 data={productionTrend}
// //                 color="#AB47BC"
// //                 fillColor="#AB47BC"
// //                 width={340}
// //                 height={55}
// //               />
// //               <View style={styles.chartAxisRow}>
// //                 {production.daily_trend.map((d, i) => (
// //                   <Text key={i} style={styles.axisLabel}>
// //                     {d.day}
// //                   </Text>
// //                 ))}
// //               </View>
// //             </View>

// //             <ColHeader label1="MACHINE" label2="TODAY" label3="MTD" />
// //             <TableWrapper rowCount={production.by_machine.length}>
// //               {production.by_machine.map((m, i) => (
// //                 <RankRow
// //                   key={i}
// //                   rank={i + 1}
// //                   name={m.machine}
// //                   leftVal={`${(m.target / 1000).toFixed(0)}K m`}
// //                   rightVal={`${(m.today / 1000).toFixed(1)}K m`}
// //                   trendUp={m.achievement === 'up'}
// //                 />
// //               ))}
// //             </TableWrapper>
// //           </SectionCard>

// //           {/* ── PAYMENT COLLECTION SECTION ── */}
// //           <SectionCard>
// //             <SectionHeader
// //               icon="💰"
// //               title="PAYMENT COLLECTION"
// //               bgColor={COLORS.collBg}
// //               rightText={dateString}
// //               action="Full report"
// //               onAction={() => openCollectionReport()}
// //             />

// //             <TotalRow
// //               leftLabel="TODAY"
// //               leftValue={formatAmount(collection.total.today)}
// //               tealLeft
// //               rightLabel="TOTAL MTD"
// //               rightValue={formatAmount(collection.total.mtd)}
// //               rawLeftValue={collection.total.today}
// //               rawRightValue={collection.total.mtd}
// //             />

// //             <View style={styles.chartWrap}>
// //               <Text style={styles.trendLabel}>DAILY TREND</Text>
// //               <MiniLineChart
// //                 data={collectionTrend}
// //                 color={COLORS.green}
// //                 fillColor={COLORS.green}
// //                 width={340}
// //                 height={55}
// //               />
// //               <View style={styles.chartAxisRow}>
// //                 {collection.daily_trend.map((d, i) => (
// //                   <Text key={i} style={styles.axisLabel}>
// //                     {d.day}
// //                   </Text>
// //                 ))}
// //               </View>
// //             </View>

// //             <Text style={styles.subHeader}>
// //               BY SALES EXECUTIVE · TODAY · MTD
// //             </Text>
// //             <ColHeader label1="EXECUTIVE" label2="TODAY" label3="MTD" />
// //             <TableWrapper rowCount={collection.by_exec.length}>
// //               {collection.by_exec.map(exec => (
// //                 <RankRow
// //                   key={exec.exec_id}
// //                   name={exec.name}
// //                   avatarColor={exec.avatar_color}
// //                   leftVal={formatAmount(exec.today)}
// //                   rightVal={formatAmount(exec.mtd)}
// //                   rawLeftVal={exec.today}
// //                   rawRightVal={exec.mtd}
// //                   onPress={() => goToExec(exec)}
// //                 />
// //               ))}
// //             </TableWrapper>
// //           </SectionCard>

// //           {/* ── OUTSTANDING SECTION ── */}
// //           <SectionCard>
// //             <SectionHeader
// //               icon="⚠️"
// //               title="OUTSTANDING"
// //               bgColor={COLORS.outsBg}
// //             />

// //             <View style={styles.outsTotalRow}>
// //               <Text style={styles.outsTotalLabel}>Total Due</Text>
// //               <LongPressValue
// //                 rawValue={outstanding.total_due}
// //                 formattedValue={formatAmount(outstanding.total_due)}
// //                 style={styles.outsTotalValue}
// //               />
// //             </View>

// //             <Text style={styles.subHeader}>
// //               BY SALES EXECUTIVE · HIGHEST FIRST
// //             </Text>
// //             <ColHeader label1="EXECUTIVE" label2="" label3="OUTSTANDING" />
// //             <TableWrapper rowCount={outstanding.by_exec.length}>
// //               {outstanding.by_exec.map(exec => (
// //                 <RankRow
// //                   key={exec.exec_id}
// //                   name={exec.name}
// //                   avatarColor={exec.avatar_color}
// //                   rightVal={formatAmount(exec.outstanding)}
// //                   rawRightVal={exec.outstanding}
// //                   trendUp={false}
// //                   onPress={() => goToExec(exec)}
// //                 />
// //               ))}
// //             </TableWrapper>
// //           </SectionCard>
// //         </ScrollView>
// //       </SafeAreaView>
// //       <TourOverlay
// //         tourKey="owner_dashboard"
// //         steps={OWNER_DASHBOARD_TOUR}
// //         delay={800}
// //         visible={showTour}
// //         onClose={() => setShowTour(false)}
// //       />
// //     </>
// //   );
// // }

// // const styles = StyleSheet.create({
// //   // safe: { flex: 1, backgroundColor: COLORS.bg },
// //   safe: { flex: 1 },
// //   scroll: { flex: 1 },
// //   content: { paddingTop: 8, paddingBottom: 24 },

// //   // ── Date bar ──
// //   dateBar: {
// //     flexDirection: 'row',
// //     alignItems: 'center',
// //     justifyContent: 'space-between',
// //     marginHorizontal: 12,
// //     marginBottom: 6,
// //     marginTop: 0,
// //   },
// //   dateBtn: {
// //     flexDirection: 'row',
// //     alignItems: 'center',
// //     backgroundColor: '#fff',
// //     borderRadius: 8,
// //     paddingHorizontal: 12,
// //     paddingVertical: 8,
// //     elevation: 1,
// //     shadowColor: '#000',
// //     shadowOffset: { width: 0, height: 1 },
// //     shadowOpacity: 0.06,
// //     shadowRadius: 2,
// //     gap: 6,
// //   },
// //   dateBtnIcon: { fontSize: 14 },
// //   dateBtnText: {
// //     fontSize: 13,
// //     fontWeight: '600',
// //     color: COLORS.textDark,
// //     letterSpacing: 0.3,
// //   },
// //   refreshBtn: {
// //     backgroundColor: COLORS.teal,
// //     borderRadius: 8,
// //     paddingHorizontal: 14,
// //     paddingVertical: 8,
// //   },
// //   refreshBtnText: {
// //     color: '#fff',
// //     fontSize: 13,
// //     fontWeight: '600',
// //   },

// //   // ── Chart ──
// //   chartWrap: { paddingHorizontal: 10, paddingTop: 6, paddingBottom: 2 },
// //   trendLabel: {
// //     fontSize: 9,
// //     color: COLORS.textLight,
// //     textTransform: 'uppercase',
// //     marginBottom: 4,
// //     paddingLeft: 4,
// //   },
// //   chartAxisRow: {
// //     flexDirection: 'row',
// //     justifyContent: 'space-between',
// //     paddingHorizontal: 4,
// //     marginTop: 2,
// //   },
// //   axisLabel: { fontSize: 9, color: COLORS.textLight },

// //   // ── Sub header ──
// //   subHeader: {
// //     fontSize: 9,
// //     color: COLORS.textLight,
// //     textTransform: 'uppercase',
// //     letterSpacing: 0.5,
// //     paddingHorizontal: 14,
// //     paddingTop: 10,
// //     paddingBottom: 2,
// //   },

// //   // ── Outstanding total ──
// //   outsTotalRow: {
// //     flexDirection: 'row',
// //     justifyContent: 'space-between',
// //     alignItems: 'center',
// //     paddingHorizontal: 14,
// //     paddingVertical: 10,
// //   },
// //   outsTotalLabel: { fontSize: 12, color: COLORS.textMid, fontWeight: '600' },
// //   outsTotalValue: { fontSize: 18, fontWeight: '800', color: COLORS.red },

// //   // ── Category 2-row ──
// //   catItem: {
// //     borderBottomWidth: 1,
// //     borderBottomColor: COLORS.border,
// //   },
// //   catRow2: {
// //     flexDirection: 'row',
// //     alignItems: 'flex-end',
// //     paddingHorizontal: 14,
// //     paddingBottom: 7,
// //   },
// //   row2Spacer: { width: 18 },
// //   row2Col: {
// //     width: 70,
// //     alignItems: 'flex-end',
// //   },
// //   subLabel: {
// //     fontSize: 9,
// //     color: COLORS.textLight,
// //     textTransform: 'uppercase',
// //     letterSpacing: 0.3,
// //     marginBottom: 1,
// //   },
// //   subVal: {
// //     fontSize: 11,
// //     fontWeight: '600',
// //   },
// //   dateBarRight: {
// //     flexDirection: 'row',
// //     alignItems: 'center',
// //     gap: 8,
// //   },
// //   helpBtn: {
// //     width: 34,
// //     height: 34,
// //     borderRadius: 17,
// //     backgroundColor: COLORS.primary,
// //     alignItems: 'center',
// //     justifyContent: 'center',
// //   },
// //   helpBtnText: {
// //     color: '#fff',
// //     fontSize: 16,
// //     fontWeight: '700',
// //   },
// // });


// // // screens/OwnerDashboardScreen.js
// // import DateTimePicker from '@react-native-community/datetimepicker';
// // import { useRouter } from 'expo-router';
// // import React, { useCallback, useEffect, useState } from 'react';
// // import {
// //   Platform,
// //   RefreshControl,
// //   SafeAreaView,
// //   ScrollView,
// //   StyleSheet,
// //   Text,
// //   View
// // } from 'react-native';
// // import { api, formatAmount } from '../api/api';
// // import DashboardSkeleton from '../components/DashboardSkeleton'; // ← NEW
// // import InteractiveDailyTrendChart from '../components/InteractiveDailyTrendChart';
// // import {
// //   ColHeader,
// //   COLORS,
// //   ErrorView,
// //   LongPressValue,
// //   RankRow,
// //   SectionCard,
// //   SectionHeader,
// //   TotalRow
// // } from '../components/SharedComponents';
// // import TourOverlay from '../components/TourOverlay';
// // import { OWNER_DASHBOARD_TOUR } from './DashboardTours';

// // // ─── Table scroll wrapper: auto height <10 rows, fixed+scroll ≥10 rows ───────
// // const ROW_HEIGHT = 70;
// // const SCROLL_THRESHOLD = 4;
// // const FIXED_TABLE_HEIGHT = ROW_HEIGHT * SCROLL_THRESHOLD;

// // const TableWrapper = ({ rowCount, children }) => {
// //   if (rowCount < SCROLL_THRESHOLD) {
// //     return <View>{children}</View>;
// //   }
// //   return (
// //     <ScrollView
// //       style={{ maxHeight: FIXED_TABLE_HEIGHT }}
// //       nestedScrollEnabled={true}
// //       showsVerticalScrollIndicator={true}
// //     >
// //       {children}
// //     </ScrollView>
// //   );
// // };

// // /**
// //  * OwnerDashboardScreen
// //  *
// //  * Shown when user has is_owner = true
// //  * Navigation prop expected: navigation (React Navigation)
// //  * Route params: { user } — the logged-in user object from /auth/me
// //  *
// //  * Navigates to:
// //  *   SalesExecDashboard  when tapping exec row in Collection or Outstanding
// //  */
// // export default function OwnerDashboardScreen({
// //   navigation,
// //   route,
// //   getUserPrptype,
// // }) {
// //   const router = useRouter();
// //   const { user } = route.params || {};
// //   const [data, setData] = useState(null);
// //   const [loading, setLoading] = useState(true);
// //   const [refreshing, setRefreshing] = useState(false);
// //   const [error, setError] = useState(null);

// //   // ── Date state as Date object ──
// //   const [date, setDate] = useState(new Date());
// //   const [showPicker, setShowPicker] = useState(false);

// //   // YYYY-MM-DD string for API
// //   const dateString = date.toISOString().split('T')[0];
// //   const [showTour, setShowTour] = useState(false);

// //   const load = useCallback(
// //     async getUserPrptype => {
// //       try {
// //         setError(null);
// //         setLoading(true);
// //         const res = await api.getOwnerDashboard(dateString, getUserPrptype);
// //         console.log('getOwnerDashboard', res);
// //         if (res.success) setData(res.data);
// //         else setError('Failed to load dashboard');
// //       } catch (e) {
// //         setError('Network error. Please retry.');
// //       } finally {
// //         setLoading(false);
// //         setRefreshing(false);
// //       }
// //     },
// //     [dateString],
// //   );

// //   useEffect(() => {
// //     if (!getUserPrptype) return;
// //     load(getUserPrptype);
// //   }, [load, getUserPrptype]);

// //   const onRefresh = () => {
// //     setRefreshing(true);
// //     load(getUserPrptype);
// //   };

// //   const onDateChange = (event, selectedDate) => {
// //     // Android: picker closes automatically; iOS: keep open
// //     if (Platform.OS === 'android') setShowPicker(false);
// //     if (selectedDate) setDate(selectedDate); // triggers useEffect → auto API call
// //   };

// //   const goToExec = exec => {
// //     navigation.navigate('SalesExecDashboard', {
// //       execId: exec.exec_id,
// //       execName: exec.name,
// //       execColor: exec.avatar_color,
// //       date: dateString,
// //       user,
// //       getUserPrptype,
// //     });
// //   };

// //   if (loading) return <DashboardSkeleton />;
// //   if (error)
// //     return <ErrorView message={error} onRetry={() => load(getUserPrptype)} />;
// //   if (!data) return null;

// //   const { sales, production, collection, outstanding } = data;

// // // // // // 
// //   return (
// //     <>
// //       <SafeAreaView style={styles.safe}>
// //         <ScrollView
// //           style={styles.scroll}
// //           nestedScrollEnabled={true}
// //           contentContainerStyle={styles.content}
// //           refreshControl={
// //             <RefreshControl
// //               refreshing={refreshing}
// //               onRefresh={onRefresh}
// //               colors={[COLORS.teal]}
// //             />
// //           }
// //         >
// //           {/* ── DATE PICKER BAR ── */}
// //           {/* <View style={styles.dateBar}>
// //             <TouchableOpacity
// //               style={styles.dateBtn}
// //               onPress={() => setShowPicker(true)}
// //             >
// //               <Text style={styles.dateBtnIcon}>📅</Text>
// //               <Text style={styles.dateBtnText}>{dateString}</Text>
// //             </TouchableOpacity>

// //             <View style={styles.dateBarRight}>
// //               <TouchableOpacity style={styles.refreshBtn} onPress={onRefresh}>
// //                 <Text style={styles.refreshBtnText}>↻ Refresh</Text>
// //               </TouchableOpacity>
// //               <TouchableOpacity
// //                 style={styles.helpBtn}
// //                 onPress={() => setShowTour(true)}
// //               >
// //                 <Text style={styles.helpBtnText}>?</Text>
// //               </TouchableOpacity>
// //             </View>
// //           </View> */}

// //           {/* iOS picker shown inline; Android shows native modal on its own */}
// //           {showPicker && (
// //             <DateTimePicker
// //               value={date}
// //               mode="date"
// //               display={Platform.OS === 'ios' ? 'spinner' : 'default'}
// //               onChange={onDateChange}
// //               maximumDate={new Date()}
// //             />
// //           )}

// //           {/* ── SALES SECTION ── */}
// //           <SectionCard>
// //             <SectionHeader
// //               icon="📊"
// //               title="SALES"
// //               bgColor={COLORS.salesBg}
// //               rightText={dateString}
// //               action="Full report"
// //               onAction={() => openCollectionReport()}
// //             />

// //             <TotalRow
// //               leftLabel="TODAY"
// //               leftValue={formatAmount(sales.total.today)}
// //               tealLeft
// //               rightLabel="MTD"
// //               rightValue={formatAmount(sales.total.mtd)}
// //               rawLeftValue={sales.total.today}
// //               rawRightValue={sales.total.mtd}
// //             />

// //             <View style={styles.chartWrap}>
// //               <Text style={styles.trendLabel}>DAILY TREND</Text>
// //               <MiniLineChart
// //                 data={salesTrend}
// //                 color={COLORS.teal}
// //                 fillColor={COLORS.teal}
// //                 width={340}
// //                 height={55}
// //               />
// //               <View style={styles.chartAxisRow}>
// //                 {sales.daily_trend.map((d, i) => (
// //                   <Text key={i} style={styles.axisLabel}>
// //                     {d.day}
// //                   </Text>
// //                 ))}
// //               </View>
// //             </View>

// //             <ColHeader label1="CATEGORY" label2="TODAY" label3="MTD" />
// //             <TableWrapper rowCount={sales.by_category.length}>
// //               {sales.by_category.map((cat, i) => (
// //                 <View key={i} style={styles.catItem}>
// //                   <RankRow
// //                     rank={i + 1}
// //                     name={cat.name}
// //                     leftVal={formatAmount(cat.today)}
// //                     rightVal={formatAmount(cat.mtd)}
// //                     rawLeftVal={cat.today}
// //                     rawRightVal={cat.mtd}
// //                     trendUp={cat.trend === 'up'}
// //                     noBorder
// //                   />
// //                   <View style={styles.catRow2}>
// //                     <View style={styles.row2Spacer} />
// //                     <View style={{ flex: 1 }} />
// //                     <View style={styles.row2Col}>
// //                       <Text style={styles.subLabel}>Qty:</Text>
// //                     </View>
// //                     <View style={styles.row2Col}>
// //                       <LongPressValue
// //                         rawValue={cat.todayqty}
// //                         formattedValue={
// //                           cat?.todayqty ? formatAmount(cat.todayqty) : 0
// //                         }
// //                         style={[styles.subVal, { color: COLORS.green }]}
// //                       />
// //                     </View>
// //                     <View style={styles.row2Col}>
// //                       <LongPressValue
// //                         rawValue={cat.mtdqty}
// //                         formattedValue={
// //                           cat?.mtdqty ? formatAmount(cat.mtdqty) : 0
// //                         }
// //                         style={[styles.subVal, { color: COLORS.orange }]}
// //                       />
// //                     </View>
// //                   </View>
// //                 </View>
// //               ))}
// //             </TableWrapper>
// //           </SectionCard>

// //           {/* ── PRODUCTION SECTION ── */}
// //           <SectionCard>
// //             <SectionHeader
// //               icon="⚙️"
// //               title="PRODUCTION"
// //               bgColor={COLORS.prodBg}
// //               rightText={dateString}
// //             />

// //             <TotalRow
// //               leftLabel="TODAY (m)"
// //               leftValue={production.total.today_meters.toLocaleString('en-IN')}
// //               tealLeft
// //               rightLabel="MTD (m)"
// //               rightValue={production.total.mtd_meters.toLocaleString('en-IN')}
// //               rawLeftValue={production.total.today_meters}
// //               rawRightValue={production.total.mtd_meters}
// //               tooltipPrefix=""
// //             />

// //             <View style={styles.chartWrap}>
// //               <Text style={styles.trendLabel}>DAILY TREND</Text>
// //               <MiniLineChart
// //                 data={productionTrend}
// //                 color="#AB47BC"
// //                 fillColor="#AB47BC"
// //                 width={340}
// //                 height={55}
// //               />
// //               <View style={styles.chartAxisRow}>
// //                 {production.daily_trend.map((d, i) => (
// //                   <Text key={i} style={styles.axisLabel}>
// //                     {d.day}
// //                   </Text>
// //                 ))}
// //               </View>
// //             </View>

// //             <ColHeader label1="MACHINE" label2="TODAY" label3="MTD" />
// //             <TableWrapper rowCount={production.by_machine.length}>
// //               {production.by_machine.map((m, i) => (
// //                 <RankRow
// //                   key={i}
// //                   rank={i + 1}
// //                   name={m.machine}
// //                   leftVal={`${(m.target / 1000).toFixed(0)}K m`}
// //                   rightVal={`${(m.today / 1000).toFixed(1)}K m`}
// //                   trendUp={m.achievement === 'up'}
// //                 />
// //               ))}
// //             </TableWrapper>
// //           </SectionCard>

// //           {/* ── PAYMENT COLLECTION SECTION ── */}
// //           <SectionCard>
// //             <SectionHeader
// //               icon="💰"
// //               title="PAYMENT COLLECTION"
// //               bgColor={COLORS.collBg}
// //               rightText={dateString}
// //               action="Full report"
// //               onAction={() => openCollectionReport()}
// //             />

// //             <TotalRow
// //               leftLabel="TODAY"
// //               leftValue={formatAmount(collection.total.today)}
// //               tealLeft
// //               rightLabel="TOTAL MTD"
// //               rightValue={formatAmount(collection.total.mtd)}
// //               rawLeftValue={collection.total.today}
// //               rawRightValue={collection.total.mtd}
// //             />

// //             <View style={styles.chartWrap}>
// //               <Text style={styles.trendLabel}>DAILY TREND</Text>
// //               <MiniLineChart
// //                 data={collectionTrend}
// //                 color={COLORS.green}
// //                 fillColor={COLORS.green}
// //                 width={340}
// //                 height={55}
// //               />
// //               <View style={styles.chartAxisRow}>
// //                 {collection.daily_trend.map((d, i) => (
// //                   <Text key={i} style={styles.axisLabel}>
// //                     {d.day}
// //                   </Text>
// //                 ))}
// //               </View>
// //             </View>

// //             <Text style={styles.subHeader}>
// //               BY SALES EXECUTIVE · TODAY · MTD
// //             </Text>
// //             <ColHeader label1="EXECUTIVE" label2="TODAY" label3="MTD" />
// //             <TableWrapper rowCount={collection.by_exec.length}>
// //               {collection.by_exec.map(exec => (
// //                 <RankRow
// //                   key={exec.exec_id}
// //                   name={exec.name}
// //                   avatarColor={exec.avatar_color}
// //                   leftVal={formatAmount(exec.today)}
// //                   rightVal={formatAmount(exec.mtd)}
// //                   rawLeftVal={exec.today}
// //                   rawRightVal={exec.mtd}
// //                   onPress={() => goToExec(exec)}
// //                 />
// //               ))}
// //             </TableWrapper>
// //           </SectionCard>

// //           {/* ── OUTSTANDING SECTION ── */}
// //           <SectionCard>
// //             <SectionHeader
// //               icon="⚠️"
// //               title="OUTSTANDING"
// //               bgColor={COLORS.outsBg}
// //             />

// //             <View style={styles.outsTotalRow}>
// //               <Text style={styles.outsTotalLabel}>Total Due</Text>
// //               <LongPressValue
// //                 rawValue={outstanding.total_due}
// //                 formattedValue={formatAmount(outstanding.total_due)}
// //                 style={styles.outsTotalValue}
// //               />
// //             </View>

// //             <Text style={styles.subHeader}>
// //               BY SALES EXECUTIVE · HIGHEST FIRST
// //             </Text>
// //             <ColHeader label1="EXECUTIVE" label2="" label3="OUTSTANDING" />
// //             <TableWrapper rowCount={outstanding.by_exec.length}>
// //               {outstanding.by_exec.map(exec => (
// //                 <RankRow
// //                   key={exec.exec_id}
// //                   name={exec.name}
// //                   avatarColor={exec.avatar_color}
// //                   rightVal={formatAmount(exec.outstanding)}
// //                   rawRightVal={exec.outstanding}
// //                   trendUp={false}
// //                   onPress={() => goToExec(exec)}
// //                 />
// //               ))}
// //             </TableWrapper>
// //           </SectionCard>
// //         </ScrollView>
// //       </SafeAreaView>
// //       <TourOverlay
// //         tourKey="owner_dashboard"
// //         steps={OWNER_DASHBOARD_TOUR}
// //         delay={800}
// //         visible={showTour}
// //         onClose={() => setShowTour(false)}
// //       />
// //     </>
// //   );
// // }

// // const styles = StyleSheet.create({
// //   // safe: { flex: 1, backgroundColor: COLORS.bg },
// //   safe: { flex: 1 },
// //   scroll: { flex: 1 },
// //   content: { paddingTop: 8, paddingBottom: 24 },

// //   // ── Date bar ──
// //   dateBar: {
// //     flexDirection: 'row',
// //     alignItems: 'center',
// //     justifyContent: 'space-between',
// //     marginHorizontal: 12,
// //     marginBottom: 6,
// //     marginTop: 0,
// //   },
// //   dateBtn: {
// //     flexDirection: 'row',
// //     alignItems: 'center',
// //     backgroundColor: '#fff',
// //     borderRadius: 8,
// //     paddingHorizontal: 12,
// //     paddingVertical: 8,
// //     elevation: 1,
// //     shadowColor: '#000',
// //     shadowOffset: { width: 0, height: 1 },
// //     shadowOpacity: 0.06,
// //     shadowRadius: 2,
// //     gap: 6,
// //   },
// //   dateBtnIcon: { fontSize: 14 },
// //   dateBtnText: {
// //     fontSize: 13,
// //     fontWeight: '600',
// //     color: COLORS.textDark,
// //     letterSpacing: 0.3,
// //   },
// //   refreshBtn: {
// //     backgroundColor: COLORS.teal,
// //     borderRadius: 8,
// //     paddingHorizontal: 14,
// //     paddingVertical: 8,
// //   },
// //   refreshBtnText: {
// //     color: '#fff',
// //     fontSize: 13,
// //     fontWeight: '600',
// //   },

// //   // ── Chart ──
// //   chartWrap: { paddingHorizontal: 10, paddingTop: 6, paddingBottom: 2 },
// //   trendLabel: {
// //     fontSize: 9,
// //     color: COLORS.textLight,
// //     textTransform: 'uppercase',
// //     marginBottom: 4,
// //     paddingLeft: 4,
// //   },
// //   chartAxisRow: {
// //     flexDirection: 'row',
// //     justifyContent: 'space-between',
// //     paddingHorizontal: 4,
// //     marginTop: 2,
// //   },
// //   axisLabel: { fontSize: 9, color: COLORS.textLight },

// //   // ── Sub header ──
// //   subHeader: {
// //     fontSize: 9,
// //     color: COLORS.textLight,
// //     textTransform: 'uppercase',
// //     letterSpacing: 0.5,
// //     paddingHorizontal: 14,
// //     paddingTop: 10,
// //     paddingBottom: 2,
// //   },

// //   // ── Outstanding total ──
// //   outsTotalRow: {
// //     flexDirection: 'row',
// //     justifyContent: 'space-between',
// //     alignItems: 'center',
// //     paddingHorizontal: 14,
// //     paddingVertical: 10,
// //   },
// //   outsTotalLabel: { fontSize: 12, color: COLORS.textMid, fontWeight: '600' },
// //   outsTotalValue: { fontSize: 18, fontWeight: '800', color: COLORS.red },

// //   // ── Category 2-row ──
// //   catItem: {
// //     borderBottomWidth: 1,
// //     borderBottomColor: COLORS.border,
// //   },
// //   catRow2: {
// //     flexDirection: 'row',
// //     alignItems: 'flex-end',
// //     paddingHorizontal: 14,
// //     paddingBottom: 7,
// //   },
// //   row2Spacer: { width: 18 },
// //   row2Col: {
// //     width: 70,
// //     alignItems: 'flex-end',
// //   },
// //   subLabel: {
// //     fontSize: 9,
// //     color: COLORS.textLight,
// //     textTransform: 'uppercase',
// //     letterSpacing: 0.3,
// //     marginBottom: 1,
// //   },
// //   subVal: {
// //     fontSize: 11,
// //     fontWeight: '600',
// //   },
// //   dateBarRight: {
// //     flexDirection: 'row',
// //     alignItems: 'center',
// //     gap: 8,
// //   },
// //   helpBtn: {
// //     width: 34,
// //     height: 34,
// //     borderRadius: 17,
// //     backgroundColor: COLORS.primary,
// //     alignItems: 'center',
// //     justifyContent: 'center',
// //   },
// //   helpBtnText: {
// //     color: '#fff',
// //     fontSize: 16,
// //     fontWeight: '700',
// //   },
// // });

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
// import InteractiveDailyTrendChart from '../components/InteractiveDailyTrendChart';
// import SalesDashboardCard from '../components/SalesDashboardCard';
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

// // // 
//   const openProductionReport = () => {
//     router.push({
//       pathname: '/new/(tabs)/reports/production',
//       params: {
//         date: dateString,
//         production: JSON.stringify(production),
//       },
//     });
//   };

//   const openProductionMachineReport = (machine, index) => {
//     const mtd = Number(machine?.today || machine?.mtd_meters || 0);
//     const totalMtd = Number(production?.total?.mtd_meters || 0);
//     const share = totalMtd > 0 ? (mtd / totalMtd) * 100 : 0;

//     router.push({
//       pathname: '/new/(tabs)/reports/production-machine',
//       params: {
//         date: dateString,
//         machine: JSON.stringify({
//           ...machine,
//           rank: index + 1,
//           share,
//           total_machine_count: production?.by_machine?.length || 0,
//         }),
//       },
//     });
//   };

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
//           <SalesDashboardCard
//             sales={sales}
//             dateString={dateString}
//             view="owner"
//           />

//           {/* ── PRODUCTION SECTION ── */}
//           <SectionCard>
//             <SectionHeader
//               icon="⚙️"
//               title="PRODUCTION"
//               bgColor={COLORS.prodBg}
//               rightText={dateString}
//               action="Full report"
//               onAction={openProductionReport}
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
//                   key={`${m.prpcode || ''}-${m.macgrp || ''}-${i}`}
//                   rank={i + 1}
//                   name={m.machine}
//                   leftVal={`${(Number(m.target || m.today_meters || 0) / 1000).toFixed(0)}K m`}
//                   rightVal={`${(Number(m.today || m.mtd_meters || 0) / 1000).toFixed(1)}K m`}
//                   rawLeftVal={Number(m.target || m.today_meters || 0)}
//                   rawRightVal={Number(m.today || m.mtd_meters || 0)}
//                   trendUp={m.achievement === 'up'}
//                   onPress={() => openProductionMachineReport(m, i)}
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
//               onAction={() => openCollectionReport()}
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
// import InteractiveDailyTrendChart from '../components/InteractiveDailyTrendChart';
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

// // // 
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
//               onAction={() => openCollectionReport()}
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
//               onAction={() => openCollectionReport()}
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
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AmountDisplayModeControl, useDashboardAmountMode } from '@/src/components/dashboard/AmountDisplayModeControl';
import { usePermission } from '@/src/core/permissions';
import {
  Platform,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
  TouchableOpacity
} from 'react-native';
import { api, formatAmount } from '../api/api';
import DashboardSkeleton from '../components/DashboardSkeleton'; // ← NEW
import InteractiveDailyTrendChart from '../components/InteractiveDailyTrendChart';
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
import { DashboardGrid, Slot } from '@/src/components/dashboard/DashboardGrid';

// ERP-dashboard columns (UI only). 'lead' = Monthly Target + Monthly Report
// handed down from DashboardScreen so Sales follows them in column 1.
const OWNER_LAYOUT = {
  2: [['lead', 'sales', 'payment'], ['production', 'collection', 'outstanding']],
  3: [['lead', 'sales'], ['production', 'collection'], ['outstanding', 'payment']],
};

// ─── Table scroll wrapper: auto height <10 rows, fixed+scroll ≥10 rows ───────
const ROW_HEIGHT = 70;
const SCROLL_THRESHOLD = 4;
const FIXED_TABLE_HEIGHT = ROW_HEIGHT * SCROLL_THRESHOLD;

const coverageSubtitle = period => {
  if (!period) return '';
  if (period.type === 'live_balance') {
    return period.freshness_label || 'Live current balance';
  }

  const ymd = String(period.actual_to_ymd || '');
  if (/^\d{8}$/.test(ymd)) {
    const dt = new Date(
      Number(ymd.slice(0, 4)),
      Number(ymd.slice(4, 6)) - 1,
      Number(ymd.slice(6, 8)),
    );
    const label = dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
    return Number(period.pending_days || 0) > 0
      ? `Data through ${label}`
      : `Current through ${label}`;
  }

  return period.freshness_label || period.display_label || '';
};

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
  visibleSections = { sales: true, production: true, collection: true, payment: true, outstanding: true },
  showAmountControl = true,
  lead, // array of cards -> embedded in the Business Dashboard grid (UI only)
  columns,
}) {
  const embedded = Array.isArray(lead);
  const leadNodes = embedded ? lead : [];
  const router = useRouter();
  const { canAccess } = usePermission();
  const { user } = route.params || {};
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const { mode: amountMode, setMode: setAmountMode } = useDashboardAmountMode();
  const displayAmount = value => formatAmount(value, amountMode);
  const hasFocusedOnce = useRef(false);

  // ── Date state as Date object ──
  const [date, setDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);

  // YYYY-MM-DD string for API
  const dateString = date.toISOString().split('T')[0];
  const [showTour, setShowTour] = useState(false);

  const [collectionSort, setCollectionSort] = useState({
    field: 'today',
    direction: 'desc',
  });

  const [outstandingSort, setOutstandingSort] = useState('desc');
  const [paymentSort, setPaymentSort] = useState('desc');

  const load = useCallback(
    async (getUserPrptype, silent = false) => {
      try {
        setError(null);
        if (!silent) setLoading(true);
        const res = await api.getOwnerDashboard(dateString, getUserPrptype);
        console.log('getOwnerDashboard', res);
        if (res?.success && res.data && typeof res.data === 'object') {
          // Permission-filtered cards can legitimately be null. Keep them null:
          // never fabricate zero-valued financial data for a denied card.
          setData(res.data);
        } else {
          setData(null);
          setError('Failed to load dashboard');
        }
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

  /*
   * Card drill-downs are live. When the user comes back after viewing a
   * report, refresh the dashboard silently so the parent row reflects the
   * same current database state instead of keeping an old carried amount.
   */
  useFocusEffect(
    useCallback(() => {
      if (!getUserPrptype) return undefined;

      if (!hasFocusedOnce.current) {
        hasFocusedOnce.current = true;
        return undefined;
      }

      void load(getUserPrptype, true);
      return undefined;
    }, [getUserPrptype, load]),
  );

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


  const openCollectionReport = exec => {
    router.push({
      pathname: '/new/(tabs)/reports/collection-flow',
      params: {
        mode: 'collection',
        view: 'owner',
        date: dateString,
        prptype: getUserPrptype,
        report_month: String(dateString || '').slice(0, 7).replace('-', ''),
        expected_month: String(dateString || '').slice(0, 7).replace('-', ''),
        level: exec ? 'parties' : 'executives',
        executive_code: exec?.exec_id != null ? String(exec.exec_id) : undefined,
        executive_name: exec?.name || undefined,
        expected_amount: String(Number(exec?.mtd ?? collection?.total?.mtd ?? 0)),
      },
    });
  };

  const openOutstandingReport = exec => {
    router.push({
      pathname: '/new/(tabs)/reports/collection-flow',
      params: {
        mode: 'outstanding',
        view: 'owner',
        date: dateString,
        prptype: getUserPrptype,
        report_month: String(dateString || '').slice(0, 7).replace('-', ''),
        expected_month: String(dateString || '').slice(0, 7).replace('-', ''),
        level: exec ? 'parties' : 'executives',
        executive_code: exec?.exec_id != null ? String(exec.exec_id) : undefined,
        executive_name: exec?.name || undefined,
        expected_amount: String(Number(exec?.outstanding ?? outstanding?.total_due ?? 0)),
      },
    });
  };

  if (loading) return <>{leadNodes}<DashboardSkeleton /></>;
  if (error)
    return <>{leadNodes}<ErrorView message={error} onRetry={() => load(getUserPrptype)} /></>;
  if (!data) return <>{leadNodes}</>;

  // Every card is optional: Laravel returns null when its permission is denied.
  // The operational renderer must not dereference by_exec on a null card.
  const { sales, production, collection, payment, outstanding } = data ?? {};
  const hasCollectionRows = Array.isArray(collection?.by_exec);
  const hasOutstandingRows = Array.isArray(outstanding?.by_exec);


  const openProductionReport = () => {
    router.push({
      pathname: '/new/(tabs)/reports/production',
      params: {
        date: dateString,
        production: JSON.stringify(production),
        prptype: getUserPrptype,
      },
    });
  };

  const openProductionMachineReport = (machine, index) => {
    const mtd = Number(machine?.today || machine?.mtd_meters || 0);
    const totalMtd = Number(production?.total?.mtd_meters || 0);
    const share = totalMtd > 0 ? (mtd / totalMtd) * 100 : 0;

    router.push({
      pathname: '/new/(tabs)/reports/production-machine',
      params: {
        date: dateString,
        machine: JSON.stringify({
          ...machine,
          rank: index + 1,
          share,
          total_machine_count: production?.by_machine?.length || 0,
        }),
      },
    });
  };


  const sortedCollection = [...(Array.isArray(collection?.by_exec) ? collection.by_exec : [])].sort((a, b) => {
    const aValue = Number(a?.[collectionSort.field] || 0);
    const bValue = Number(b?.[collectionSort.field] || 0);

    return collectionSort.direction === 'asc'
      ? aValue - bValue
      : bValue - aValue;
  });

  const toggleCollectionSort = () => {
    setCollectionSort(prev => {
      if (prev.field === 'today' && prev.direction === 'desc') {
        return { field: 'today', direction: 'asc' };
      }

      if (prev.field === 'today' && prev.direction === 'asc') {
        return { field: 'mtd', direction: 'desc' };
      }

      if (prev.field === 'mtd' && prev.direction === 'desc') {
        return { field: 'mtd', direction: 'asc' };
      }

      return { field: 'today', direction: 'desc' };
    });
  };

  // Creditor Dashboard belongs to the payable/payment side.
  // Keep this separate from CollectionFlow (receivable side).
  const openCreditorDashboard = party => {
    if (!canAccess('dashboard.creditor_dashboard')) return;

    const partyCode =
      party?.party_code != null ? String(party.party_code).trim() : '';

    if (!partyCode) return;

    router.push({
      pathname: '/new/(tabs)/reports/creditor-dashboard',
      params: {
        prptype: getUserPrptype,
        partycode: partyCode,
        partyname: party?.party_name || partyCode,
        date: dateString,
      },
    });
  };

  const sortedPayment = [...(payment?.by_party || [])].sort((a, b) => {
    const aValue = Number(a?.to_pay || 0);
    const bValue = Number(b?.to_pay || 0);
    return paymentSort === 'asc' ? aValue - bValue : bValue - aValue;
  });

  const togglePaymentSort = () => {
    setPaymentSort(prev => prev === 'desc' ? 'asc' : 'desc');
  };

  const sortedOutstanding = [...(Array.isArray(outstanding?.by_exec) ? outstanding.by_exec : [])].sort((a, b) => {
    const aValue = Number(a?.outstanding || 0);
    const bValue = Number(b?.outstanding || 0);

    return outstandingSort === 'asc'
      ? aValue - bValue
      : bValue - aValue;
  });

  const toggleOutstandingSort = () => {
    setOutstandingSort(prev =>
      prev === 'desc' ? 'asc' : 'desc'
    );
  };

  return (
    <>
      <SafeAreaView style={styles.safe}>
        <ScrollView
          style={styles.scroll}
          nestedScrollEnabled={true}
          contentContainerStyle={[styles.content, embedded && styles.contentEmbedded]}
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

          {showAmountControl && (
            <View style={styles.amountModeBar}>
              <AmountDisplayModeControl mode={amountMode} onChange={setAmountMode} compact />
            </View>
          )}

          <DashboardGrid columns={columns || 1} layout={OWNER_LAYOUT}>
          <Slot name="lead">{leadNodes}</Slot>
          {/* ── SALES SECTION ── */}
          <Slot name="sales">
          {visibleSections.sales && (
            <SalesDashboardCard
              sales={sales}
              dateString={dateString}
              view="owner"
              prptype={getUserPrptype}
              amountMode={amountMode}
            />
          )}

          </Slot>
          {/* ── PRODUCTION SECTION ── */}
          <Slot name="production">
          {visibleSections.production && production?.total && Array.isArray(production?.daily_trend) && Array.isArray(production?.by_machine) && (
            <SectionCard>
              <SectionHeader
                icon="⚙️"
                title="PRODUCTION"
                bgColor={COLORS.prodBg}
                subtitle={coverageSubtitle(production?.period)}
                action="Full report"
                onAction={openProductionReport}
              />

              <TotalRow
                leftLabel="YESTERDAY (m)"
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
                <InteractiveDailyTrendChart
                  data={production.daily_trend}
                  valueKey="meters"
                  labelKey="day"
                  color="#AB47BC"
                  fillColor="#AB47BC"
                  height={68}
                  pointGap={54}
                  valueFormatter={value =>
                    `${Number(value || 0).toLocaleString('en-IN', {
                      maximumFractionDigits: 1,
                    })} m`
                  }
                  showBaseline
                  showHint
                />
              </View>

              <ColHeader label1="MACHINE" label2="YESTERDAY" label3="MTD" />
              <TableWrapper rowCount={production.by_machine.length}>
                {production.by_machine.map((m, i) => (
                  <RankRow
                    key={`${m.prpcode || ''}-${m.macgrp || ''}-${i}`}
                    rank={i + 1}
                    name={m.machine}
                    leftVal={`${(Number(m.target || m.today_meters || 0) / 1000).toFixed(0)}K m`}
                    rightVal={`${(Number(m.today || m.mtd_meters || 0) / 1000).toFixed(1)}K m`}
                    rawLeftVal={Number(m.target || m.today_meters || 0)}
                    rawRightVal={Number(m.today || m.mtd_meters || 0)}
                    trendUp={m.achievement === 'up'}
                    onPress={() => openProductionMachineReport(m, i)}
                  />
                ))}
              </TableWrapper>
            </SectionCard>
          )}

          </Slot>
          {/* ── PAYMENT COLLECTION SECTION ── */}
          <Slot name="collection">
          {visibleSections.collection && collection?.total && Array.isArray(collection?.daily_trend) && hasCollectionRows && (
            <SectionCard>
              <SectionHeader
                icon="💰"
                title="PAYMENT COLLECTION"
                bgColor={COLORS.collBg}
                subtitle={coverageSubtitle(collection?.period)}
                action="Full report"
                onAction={() => openCollectionReport()}
              />

              <TotalRow
                leftLabel="TODAY"
                leftValue={displayAmount(collection.total.today)}
                tealLeft
                rightLabel="TOTAL MTD"
                rightValue={displayAmount(collection.total.mtd)}
                rawLeftValue={collection.total.today}
                rawRightValue={collection.total.mtd}
              />

              <View style={styles.chartWrap}>
                <Text style={styles.trendLabel}>DAILY TREND</Text>
                <InteractiveDailyTrendChart
                  data={collection.daily_trend}
                  valueKey="amount"
                  labelKey="day"
                  color={COLORS.green}
                  fillColor={COLORS.green}
                  height={68}
                  pointGap={54}
                  valueFormatter={value => displayAmount(Number(value || 0))}
                  showBaseline
                  showHint
                />
              </View>

              {/* <Text style={styles.subHeader}>
                BY SALES EXECUTIVE · TODAY · MTD
              </Text>
              <ColHeader label1="EXECUTIVE" label2="TODAY" label3="MTD" /> */}
              <Text style={styles.subHeader}>
                BY SALES EXECUTIVE · TODAY · MTD
              </Text>

              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <ColHeader
                  label1="EXECUTIVE"
                  label2="TODAY"
                  label3="MTD"
                />

                <TouchableOpacity
                  onPress={toggleCollectionSort}
                  style={{
                    marginLeft: -12,
                    paddingLeft: 0,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 9,
                      color: '#8C837B',
                    }}
                  >
                    ▼
                  </Text>
                </TouchableOpacity>
              </View>

              {/* <TableWrapper rowCount={collection.by_exec.length}> */}
              <TableWrapper rowCount={sortedCollection.length}>
                {/* {collection.by_exec.map(exec => ( */}
                {sortedCollection.map(exec => (
                  <RankRow
                    key={exec.exec_id}
                    name={exec.name}
                    avatarColor={exec.avatar_color}
                    leftVal={displayAmount(exec.today)}
                    rightVal={displayAmount(exec.mtd)}
                    rawLeftVal={exec.today}
                    rawRightVal={exec.mtd}
                    onPress={() => openCollectionReport(exec)}
                  />
                ))}
              </TableWrapper>
            </SectionCard>
          )}

          </Slot>
          {/* ── PAYMENT TO PAY SECTION ── */}
          <Slot name="payment">
          {visibleSections.payment && payment?.total && Array.isArray(payment?.by_party) && (
            <SectionCard>
              <SectionHeader
                icon="💳"
                title="PAYMENT TO PAY"
                bgColor={COLORS.collBg}
                subtitle="Uncleared payments"
              />

              <View style={styles.outsTotalRow}>
                <View>
                  <Text style={styles.outsTotalLabel}>Total To Pay</Text>
                  <Text style={styles.paymentMeta}>
                    {Number(payment?.total?.party_count || 0)} parties · {Number(payment?.total?.pending_count || 0)} payments
                  </Text>
                </View>
                <LongPressValue
                  rawValue={Number(payment?.total?.to_pay || 0)}
                  formattedValue={displayAmount(Number(payment?.total?.to_pay || 0))}
                  style={styles.outsTotalValue}
                />
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <ColHeader label1="PARTY" label2="PENDING" label3="TO PAY" />
                <TouchableOpacity
                  onPress={togglePaymentSort}
                  style={{ marginLeft: -12, paddingLeft: 0 }}
                >
                  <Text style={{ fontSize: 9, color: '#8C837B' }}>▼</Text>
                </TouchableOpacity>
              </View>

              <TableWrapper rowCount={sortedPayment.length}>
                {sortedPayment.map((party, i) => (
                  <RankRow
                    key={`${party?.prpcode || ''}-${party?.party_code || ''}-${i}`}
                    rank={i + 1}
                    name={party?.party_name || party?.party_code || 'Unknown Party'}
                    leftVal={String(Number(party?.pending_count || 0))}
                    rightVal={displayAmount(Number(party?.to_pay || 0))}
                    rawLeftVal={Number(party?.pending_count || 0)}
                    rawRightVal={Number(party?.to_pay || 0)}
                    trendUp={false}
                    onPress={
                      canAccess('dashboard.creditor_dashboard')
                        ? () => openCreditorDashboard(party)
                        : undefined
                    }
                  />
                ))}
              </TableWrapper>
            </SectionCard>
          )}

          </Slot>
          {/* ── OUTSTANDING SECTION ── */}
          <Slot name="outstanding">
          {visibleSections.outstanding && outstanding && hasOutstandingRows && (
            <SectionCard>
              <SectionHeader
                icon="⚠️"
                title="OUTSTANDING"
                bgColor={COLORS.outsBg}
                subtitle={coverageSubtitle(outstanding?.period)}
                action="Full report"
                onAction={() => openOutstandingReport()}
              />

              <View style={styles.outsTotalRow}>
                <Text style={styles.outsTotalLabel}>Total Due</Text>
                <LongPressValue
                  rawValue={outstanding.total_due}
                  formattedValue={displayAmount(outstanding.total_due)}
                  style={styles.outsTotalValue}
                />
              </View>

              {/* <Text style={styles.subHeader}>
                BY SALES EXECUTIVE · HIGHEST FIRST
              </Text>
              <ColHeader label1="EXECUTIVE" label2="" label3="OUTSTANDING" /> */}

              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <ColHeader
                  label1="EXECUTIVE"
                  label2=""
                  label3="OUTSTANDING"
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
                      color: '#8C837B',
                    }}
                  >
                    ▼
                  </Text>
                </TouchableOpacity>
              </View>

              {/* <TableWrapper rowCount={outstanding.by_exec.length}>
                {outstanding.by_exec.map(exec => ( */}
              <TableWrapper rowCount={sortedOutstanding.length}>
                {sortedOutstanding.map(exec => (
                  <RankRow
                    key={exec.exec_id}
                    name={exec.name}
                    avatarColor={exec.avatar_color}
                    rightVal={displayAmount(exec.outstanding)}
                    rawRightVal={exec.outstanding}
                    trendUp={false}
                    onPress={() => openOutstandingReport(exec)}
                  />
                ))}
              </TableWrapper>
            </SectionCard>
          )}
          </Slot>
          </DashboardGrid>
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
  contentEmbedded: { paddingTop: 0, paddingBottom: 0 },
  amountModeBar: { paddingHorizontal: 12, paddingBottom: 8, alignItems: 'flex-end' },

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
  paymentMeta: {
    marginTop: 3,
    fontSize: 10,
    color: COLORS.textLight,
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
