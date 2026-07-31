// // import { ExpenseDashboardData } from '@/src/api/dashboard';
// // import { S, T } from '@/src/theme';
// // import React from 'react';
// // import {
// //   ActivityIndicator,
// //   StyleSheet,
// //   Text,
// //   TouchableOpacity,
// //   View,
// // } from 'react-native';

// // type Props = {
// //   data: ExpenseDashboardData | null;
// //   loading: boolean;
// //   error: string;
// //   onRefresh: () => void;
// //   onOpen: () => void;
// // };

// // function compactMoney(value: number, decimals = 2) {
// //   const amount = Number(value || 0);
// //   const abs = Math.abs(amount);
// //   const sign = amount < 0 ? '-' : '';

// //   if (abs >= 10000000) {
// //     return `${sign}₹${(abs / 10000000).toFixed(decimals)} Cr`;
// //   }

// //   if (abs >= 100000) {
// //     return `${sign}₹${(abs / 100000).toFixed(decimals)} L`;
// //   }

// //   return `${sign}₹${abs.toLocaleString('en-IN', {
// //     maximumFractionDigits: decimals,
// //   })}`;
// // }

// // function compactNumber(value: number, suffix = '') {
// //   const number = Number(value || 0);
// //   const abs = Math.abs(number);
// //   const sign = number < 0 ? '-' : '';

// //   if (abs >= 10000000) {
// //     return `${sign}${(abs / 10000000).toFixed(2)} Cr${suffix}`;
// //   }

// //   if (abs >= 100000) {
// //     return `${sign}${(abs / 100000).toFixed(2)} L${suffix}`;
// //   }

// //   if (abs >= 1000) {
// //     return `${sign}${(abs / 1000).toFixed(1)} K${suffix}`;
// //   }

// //   return `${sign}${abs.toLocaleString('en-IN', {
// //     maximumFractionDigits: 2,
// //   })}${suffix}`;
// // }

// // function Metric({
// //   label,
// //   value,
// //   accent = false,
// // }: {
// //   label: string;
// //   value: string;
// //   accent?: boolean;
// // }) {
// //   return (
// //     <View style={styles.metric}>
// //       <Text style={styles.metricLabel}>{label}</Text>
// //       <Text
// //         numberOfLines={1}
// //         adjustsFontSizeToFit
// //         style={[styles.metricValue, accent && styles.metricAccent]}
// //       >
// //         {value}
// //       </Text>
// //     </View>
// //   );
// // }

// // export default function ProductionCostDashboardCard({
// //   data,
// //   loading,
// //   error,
// //   onRefresh,
// //   onOpen,
// // }: Props) {
// //   if (loading && !data) {
// //     return (
// //       <View style={[styles.card, styles.stateCard]}>
// //         <ActivityIndicator color={T.copper} />
// //         <Text style={styles.stateText}>Loading production cost…</Text>
// //       </View>
// //     );
// //   }

// //   if (error && !data) {
// //     return (
// //       <View style={[styles.card, styles.errorCard]}>
// //         <View style={{ flex: 1 }}>
// //           <Text style={styles.errorTitle}>Production cost unavailable</Text>
// //           <Text style={styles.errorText}>{error}</Text>
// //         </View>
// //         <TouchableOpacity style={styles.retryButton} onPress={onRefresh}>
// //           <Text style={styles.retryText}>Retry</Text>
// //         </TouchableOpacity>
// //       </View>
// //     );
// //   }

// //   if (!data) {
// //     return null;
// //   }

// //   const { period, summary, composition } = data;

// //   return (
// //     <TouchableOpacity
// //       activeOpacity={0.92}
// //       onPress={onOpen}
// //       style={styles.card}
// //     >
// //       <View style={styles.header}>
// //         <View style={{ flex: 1 }}>
// //           <Text style={styles.kicker}>THIS MONTH · PRODUCTION COST</Text>
// //           <Text style={styles.period}>
// //             {period.label}
// //             {period.ongoing ? ' · LIVE' : ''}
// //           </Text>
// //         </View>

// //         <TouchableOpacity
// //           style={styles.refreshButton}
// //           onPress={(event) => {
// //             event.stopPropagation?.();
// //             onRefresh();
// //           }}
// //         >
// //           <Text style={styles.refreshText}>↻</Text>
// //         </TouchableOpacity>
// //       </View>

// //       <View style={styles.heroRow}>
// //         <View style={{ flex: 1 }}>
// //           <Text style={styles.heroLabel}>TOTAL COST</Text>
// //           <Text
// //             numberOfLines={1}
// //             adjustsFontSizeToFit
// //             style={styles.heroValue}
// //           >
// //             {compactMoney(summary.total_cost)}
// //           </Text>
// //           <Text style={styles.heroSub}>
// //             {period.working_days} working days · {summary.costing_looms} looms
// //           </Text>
// //         </View>

// //         <View style={styles.pickBadge}>
// //           <Text style={styles.pickValue}>
// //             {compactMoney(summary.cost_per_pick, 3)}
// //           </Text>
// //           <Text style={styles.pickLabel}>cost / pick</Text>
// //         </View>
// //       </View>

// //       <View style={styles.metricsRow}>
// //         <Metric
// //           label="PRODUCTION"
// //           value={compactNumber(summary.production_mtr, ' m')}
// //           accent
// //         />
// //         <Metric
// //           label="AVG PICKS"
// //           value={Number(summary.avg_picks || 0).toFixed(1)}
// //         />
// //         <Metric
// //           label="MC · DAY"
// //           value={compactMoney(summary.cost_per_machine_day)}
// //         />
// //       </View>

// //       <View style={styles.divider} />

// //       <View style={styles.costRow}>
// //         <View style={styles.costItem}>
// //           <Text style={styles.costLabel}>ELECTRICITY</Text>
// //           <Text style={styles.costValue}>
// //             {compactMoney(composition.electricity)}
// //           </Text>
// //         </View>
// //         <View style={styles.costItem}>
// //           <Text style={styles.costLabel}>SALARY</Text>
// //           <Text style={styles.costValue}>
// //             {compactMoney(composition.salary)}
// //           </Text>
// //         </View>
// //         <View style={styles.costItem}>
// //           <Text style={styles.costLabel}>STORES</Text>
// //           <Text style={styles.costValue}>
// //             {compactMoney(composition.stores)}
// //           </Text>
// //         </View>
// //       </View>

// //       <View style={styles.footer}>
// //         <Text style={styles.footerText}>
// //           Rapier {compactNumber(production.rapier_total_mtr, ' m')}
// //           {' · '}
// //           Waterjet {compactNumber(production.sip_waterjet_mtr, ' m')}
// //         </Text>
// //         <Text style={styles.arrow}>›</Text>
// //       </View>

// //       {!!error && (
// //         <Text style={styles.inlineError}>
// //           Latest refresh failed. Showing previously loaded values.
// //         </Text>
// //       )}
// //     </TouchableOpacity>
// //   );
// // }

// // const styles = StyleSheet.create({
// //   card: {
// //     backgroundColor: '#FFFDF9',
// //     borderRadius: 16,
// //     borderWidth: 1,
// //     borderColor: T.border,
// //     marginBottom: 14,
// //     overflow: 'hidden',
// //     ...S.card,
// //   },
// //   stateCard: {
// //     minHeight: 150,
// //     alignItems: 'center',
// //     justifyContent: 'center',
// //     gap: 10,
// //   },
// //   stateText: {
// //     color: T.muted,
// //     fontSize: 12,
// //     fontWeight: '700',
// //   },
// //   errorCard: {
// //     minHeight: 110,
// //     padding: 16,
// //     flexDirection: 'row',
// //     alignItems: 'center',
// //     gap: 12,
// //   },
// //   errorTitle: {
// //     color: T.red,
// //     fontSize: 14,
// //     fontWeight: '900',
// //   },
// //   errorText: {
// //     color: T.muted,
// //     fontSize: 11,
// //     lineHeight: 16,
// //     marginTop: 4,
// //   },
// //   retryButton: {
// //     backgroundColor: T.nav,
// //     borderRadius: 9,
// //     paddingHorizontal: 13,
// //     paddingVertical: 9,
// //   },
// //   retryText: {
// //     color: '#fff',
// //     fontSize: 11,
// //     fontWeight: '900',
// //   },
// //   header: {
// //     backgroundColor: '#6D287F',
// //     paddingHorizontal: 15,
// //     paddingVertical: 12,
// //     flexDirection: 'row',
// //     alignItems: 'center',
// //   },
// //   kicker: {
// //     color: '#fff',
// //     fontSize: 11,
// //     fontWeight: '900',
// //     letterSpacing: 0.65,
// //   },
// //   period: {
// //     color: '#E8D7ED',
// //     fontSize: 10,
// //     fontWeight: '700',
// //     marginTop: 3,
// //   },
// //   refreshButton: {
// //     width: 32,
// //     height: 32,
// //     borderRadius: 16,
// //     backgroundColor: 'rgba(255,255,255,0.14)',
// //     alignItems: 'center',
// //     justifyContent: 'center',
// //   },
// //   refreshText: {
// //     color: '#fff',
// //     fontSize: 20,
// //     lineHeight: 22,
// //     fontWeight: '700',
// //   },
// //   heroRow: {
// //     padding: 15,
// //     flexDirection: 'row',
// //     alignItems: 'center',
// //     gap: 12,
// //   },
// //   heroLabel: {
// //     color: T.muted,
// //     fontSize: 9,
// //     fontWeight: '900',
// //     letterSpacing: 0.65,
// //   },
// //   heroValue: {
// //     color: T.nav,
// //     fontSize: 25,
// //     fontWeight: '900',
// //     marginTop: 3,
// //   },
// //   heroSub: {
// //     color: T.muted,
// //     fontSize: 10,
// //     fontWeight: '700',
// //     marginTop: 4,
// //   },
// //   pickBadge: {
// //     minWidth: 92,
// //     backgroundColor: '#F6EDF8',
// //     borderRadius: 13,
// //     paddingHorizontal: 10,
// //     paddingVertical: 11,
// //     alignItems: 'center',
// //   },
// //   pickValue: {
// //     color: '#6D287F',
// //     fontSize: 16,
// //     fontWeight: '900',
// //   },
// //   pickLabel: {
// //     color: '#8A6991',
// //     fontSize: 9,
// //     fontWeight: '800',
// //     marginTop: 3,
// //   },
// //   metricsRow: {
// //     flexDirection: 'row',
// //     paddingHorizontal: 10,
// //     paddingBottom: 13,
// //   },
// //   metric: {
// //     flex: 1,
// //     minWidth: 0,
// //     paddingHorizontal: 5,
// //   },
// //   metricLabel: {
// //     color: T.muted,
// //     fontSize: 8,
// //     fontWeight: '900',
// //     letterSpacing: 0.45,
// //   },
// //   metricValue: {
// //     color: T.nav,
// //     fontSize: 14,
// //     fontWeight: '900',
// //     marginTop: 4,
// //   },
// //   metricAccent: {
// //     color: '#0A756F',
// //   },
// //   divider: {
// //     height: 1,
// //     backgroundColor: T.border,
// //     marginHorizontal: 15,
// //   },
// //   costRow: {
// //     flexDirection: 'row',
// //     paddingHorizontal: 10,
// //     paddingVertical: 12,
// //   },
// //   costItem: {
// //     flex: 1,
// //     minWidth: 0,
// //     paddingHorizontal: 5,
// //   },
// //   costLabel: {
// //     color: T.muted,
// //     fontSize: 8,
// //     fontWeight: '900',
// //   },
// //   costValue: {
// //     color: T.nav,
// //     fontSize: 12,
// //     fontWeight: '900',
// //     marginTop: 4,
// //   },
// //   footer: {
// //     backgroundColor: '#FAF7F2',
// //     borderTopWidth: 1,
// //     borderTopColor: T.border,
// //     paddingHorizontal: 15,
// //     paddingVertical: 10,
// //     flexDirection: 'row',
// //     alignItems: 'center',
// //   },
// //   footerText: {
// //     flex: 1,
// //     color: T.muted,
// //     fontSize: 10,
// //     fontWeight: '800',
// //   },
// //   arrow: {
// //     color: '#6D287F',
// //     fontSize: 22,
// //     fontWeight: '800',
// //   },
// //   inlineError: {
// //     color: T.red,
// //     fontSize: 9,
// //     fontWeight: '700',
// //     paddingHorizontal: 15,
// //     paddingBottom: 9,
// //   },
// // });

// import { ExpenseDashboardData } from '@/src/api/dashboard';
// import { S, T } from '@/src/theme';
// import React from 'react';
// import {
//   ActivityIndicator,
//   StyleSheet,
//   Text,
//   TouchableOpacity,
//   View,
// } from 'react-native';

// type Props = {
//   data: ExpenseDashboardData | null;
//   loading: boolean;
//   error: string;
//   onRefresh: () => void;
//   onOpen: () => void;
// };

// function compactMoney(value: number, decimals = 2) {
//   const amount = Number(value || 0);
//   const abs = Math.abs(amount);
//   const sign = amount < 0 ? '-' : '';

//   if (abs >= 10000000) {
//     return `${sign}₹${(abs / 10000000).toFixed(decimals)} Cr`;
//   }

//   if (abs >= 100000) {
//     return `${sign}₹${(abs / 100000).toFixed(decimals)} L`;
//   }

//   return `${sign}₹${abs.toLocaleString('en-IN', {
//     maximumFractionDigits: decimals,
//   })}`;
// }

// function compactNumber(value: number, suffix = '') {
//   const number = Number(value || 0);
//   const abs = Math.abs(number);
//   const sign = number < 0 ? '-' : '';

//   if (abs >= 10000000) {
//     return `${sign}${(abs / 10000000).toFixed(2)} Cr${suffix}`;
//   }

//   if (abs >= 100000) {
//     return `${sign}${(abs / 100000).toFixed(2)} L${suffix}`;
//   }

//   if (abs >= 1000) {
//     return `${sign}${(abs / 1000).toFixed(1)} K${suffix}`;
//   }

//   return `${sign}${abs.toLocaleString('en-IN', {
//     maximumFractionDigits: 2,
//   })}${suffix}`;
// }

// function Metric({
//   label,
//   value,
//   accent = false,
// }: {
//   label: string;
//   value: string;
//   accent?: boolean;
// }) {
//   return (
//     <View style={styles.metric}>
//       <Text style={styles.metricLabel}>{label}</Text>
//       <Text
//         numberOfLines={1}
//         adjustsFontSizeToFit
//         style={[styles.metricValue, accent && styles.metricAccent]}
//       >
//         {value}
//       </Text>
//     </View>
//   );
// }

// export default function ProductionCostDashboardCard({
//   data,
//   loading,
//   error,
//   onRefresh,
//   onOpen,
// }: Props) {
//   if (loading && !data) {
//     return (
//       <View style={[styles.card, styles.stateCard]}>
//         <ActivityIndicator color={T.copper} />
//         <Text style={styles.stateText}>Loading production cost…</Text>
//       </View>
//     );
//   }

//   if (error && !data) {
//     return (
//       <View style={[styles.card, styles.errorCard]}>
//         <View style={{ flex: 1 }}>
//           <Text style={styles.errorTitle}>Production cost unavailable</Text>
//           <Text style={styles.errorText}>{error}</Text>
//         </View>
//         <TouchableOpacity style={styles.retryButton} onPress={onRefresh}>
//           <Text style={styles.retryText}>Retry</Text>
//         </TouchableOpacity>
//       </View>
//     );
//   }

//   if (!data) {
//     return null;
//   }

//   const { period, summary, composition } = data;

//   return (
//     <TouchableOpacity
//       activeOpacity={0.92}
//       onPress={onOpen}
//       style={styles.card}
//     >
//       <View style={styles.header}>
//         <View style={{ flex: 1 }}>
//           <Text style={styles.kicker}>THIS MONTH · PRODUCTION COST</Text>
//           <Text style={styles.period}>
//             {period.label}
//             {period.ongoing ? ' · LIVE' : ''}
//           </Text>
//         </View>

//         <TouchableOpacity
//           style={styles.refreshButton}
//           onPress={(event) => {
//             event.stopPropagation?.();
//             onRefresh();
//           }}
//         >
//           <Text style={styles.refreshText}>↻</Text>
//         </TouchableOpacity>
//       </View>

//       <View style={styles.heroRow}>
//         <View style={{ flex: 1 }}>
//           <Text style={styles.heroLabel}>TOTAL COST</Text>
//           <Text
//             numberOfLines={1}
//             adjustsFontSizeToFit
//             style={styles.heroValue}
//           >
//             {compactMoney(summary.total_cost)}
//           </Text>
//           <Text style={styles.heroSub}>
//             {period.working_days} working days · {summary.costing_looms} looms
//           </Text>
//         </View>

//         <View style={styles.pickBadge}>
//           <Text style={styles.pickValue}>
//             {compactMoney(summary.cost_per_pick, 3)}
//           </Text>
//           <Text style={styles.pickLabel}>cost / pick</Text>
//         </View>
//       </View>

//       <View style={styles.metricsRow}>
//         <Metric
//           label="COST / PICK"
//           value={compactMoney(summary.cost_per_pick, 3)}
//           accent
//         />
//         <Metric
//           label="COST / MC · DAY"
//           value={compactMoney(summary.cost_per_machine_day)}
//         />
//       </View>

//       <View style={styles.divider} />

//       <View style={styles.costRow}>
//         <View style={styles.costItem}>
//           <Text style={styles.costLabel}>ELECTRICITY</Text>
//           <Text style={styles.costValue}>
//             {compactMoney(composition.electricity)}
//           </Text>
//         </View>
//         <View style={styles.costItem}>
//           <Text style={styles.costLabel}>SALARY</Text>
//           <Text style={styles.costValue}>
//             {compactMoney(composition.salary)}
//           </Text>
//         </View>
//         <View style={styles.costItem}>
//           <Text style={styles.costLabel}>STORES</Text>
//           <Text style={styles.costValue}>
//             {compactMoney(composition.stores)}
//           </Text>
//         </View>
//       </View>

//       <View style={styles.footer}>
//         <Text style={styles.footerText}>Tap to open Production Cost report</Text>
//         <Text style={styles.arrow}>›</Text>
//       </View>

//       {!!error && (
//         <Text style={styles.inlineError}>
//           Latest refresh failed. Showing previously loaded values.
//         </Text>
//       )}
//     </TouchableOpacity>
//   );
// }

// const styles = StyleSheet.create({
//   card: {
//     backgroundColor: '#FFFDF9',
//     borderRadius: 16,
//     borderWidth: 1,
//     borderColor: T.border,
//     marginBottom: 14,
//     overflow: 'hidden',
//     ...S.card,
//   },
//   stateCard: {
//     minHeight: 150,
//     alignItems: 'center',
//     justifyContent: 'center',
//     gap: 10,
//   },
//   stateText: {
//     color: T.muted,
//     fontSize: 12,
//     fontWeight: '700',
//   },
//   errorCard: {
//     minHeight: 110,
//     padding: 16,
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 12,
//   },
//   errorTitle: {
//     color: T.red,
//     fontSize: 14,
//     fontWeight: '900',
//   },
//   errorText: {
//     color: T.muted,
//     fontSize: 11,
//     lineHeight: 16,
//     marginTop: 4,
//   },
//   retryButton: {
//     backgroundColor: T.nav,
//     borderRadius: 9,
//     paddingHorizontal: 13,
//     paddingVertical: 9,
//   },
//   retryText: {
//     color: '#fff',
//     fontSize: 11,
//     fontWeight: '900',
//   },
//   header: {
//     backgroundColor: '#6D287F',
//     paddingHorizontal: 15,
//     paddingVertical: 12,
//     flexDirection: 'row',
//     alignItems: 'center',
//   },
//   kicker: {
//     color: '#fff',
//     fontSize: 11,
//     fontWeight: '900',
//     letterSpacing: 0.65,
//   },
//   period: {
//     color: '#E8D7ED',
//     fontSize: 10,
//     fontWeight: '700',
//     marginTop: 3,
//   },
//   refreshButton: {
//     width: 32,
//     height: 32,
//     borderRadius: 16,
//     backgroundColor: 'rgba(255,255,255,0.14)',
//     alignItems: 'center',
//     justifyContent: 'center',
//   },
//   refreshText: {
//     color: '#fff',
//     fontSize: 20,
//     lineHeight: 22,
//     fontWeight: '700',
//   },
//   heroRow: {
//     padding: 15,
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 12,
//   },
//   heroLabel: {
//     color: T.muted,
//     fontSize: 9,
//     fontWeight: '900',
//     letterSpacing: 0.65,
//   },
//   heroValue: {
//     color: T.nav,
//     fontSize: 25,
//     fontWeight: '900',
//     marginTop: 3,
//   },
//   heroSub: {
//     color: T.muted,
//     fontSize: 10,
//     fontWeight: '700',
//     marginTop: 4,
//   },
//   pickBadge: {
//     minWidth: 92,
//     backgroundColor: '#F6EDF8',
//     borderRadius: 13,
//     paddingHorizontal: 10,
//     paddingVertical: 11,
//     alignItems: 'center',
//   },
//   pickValue: {
//     color: '#6D287F',
//     fontSize: 16,
//     fontWeight: '900',
//   },
//   pickLabel: {
//     color: '#8A6991',
//     fontSize: 9,
//     fontWeight: '800',
//     marginTop: 3,
//   },
//   metricsRow: {
//     flexDirection: 'row',
//     paddingHorizontal: 10,
//     paddingBottom: 13,
//   },
//   metric: {
//     flex: 1,
//     minWidth: 0,
//     paddingHorizontal: 5,
//   },
//   metricLabel: {
//     color: T.muted,
//     fontSize: 8,
//     fontWeight: '900',
//     letterSpacing: 0.45,
//   },
//   metricValue: {
//     color: T.nav,
//     fontSize: 14,
//     fontWeight: '900',
//     marginTop: 4,
//   },
//   metricAccent: {
//     color: '#0A756F',
//   },
//   divider: {
//     height: 1,
//     backgroundColor: T.border,
//     marginHorizontal: 15,
//   },
//   costRow: {
//     flexDirection: 'row',
//     paddingHorizontal: 10,
//     paddingVertical: 12,
//   },
//   costItem: {
//     flex: 1,
//     minWidth: 0,
//     paddingHorizontal: 5,
//   },
//   costLabel: {
//     color: T.muted,
//     fontSize: 8,
//     fontWeight: '900',
//   },
//   costValue: {
//     color: T.nav,
//     fontSize: 12,
//     fontWeight: '900',
//     marginTop: 4,
//   },
//   footer: {
//     backgroundColor: '#FAF7F2',
//     borderTopWidth: 1,
//     borderTopColor: T.border,
//     paddingHorizontal: 15,
//     paddingVertical: 10,
//     flexDirection: 'row',
//     alignItems: 'center',
//   },
//   footerText: {
//     flex: 1,
//     color: T.muted,
//     fontSize: 10,
//     fontWeight: '800',
//   },
//   arrow: {
//     color: '#6D287F',
//     fontSize: 22,
//     fontWeight: '800',
//   },
//   inlineError: {
//     color: T.red,
//     fontSize: 9,
//     fontWeight: '700',
//     paddingHorizontal: 15,
//     paddingBottom: 9,
//   },
// });


import { ExpenseDashboardData } from '@/src/api/dashboard';
import { S, T } from '@/src/theme';
import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';

type Props = {
  data: ExpenseDashboardData | null;
  loading: boolean;
  error: string;
  onRefresh: () => void;
  onOpen: () => void;
};

function compactMoney(value: number, decimals = 2) {
  const amount = Number(value || 0);
  const abs = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';
  if (abs >= 10000000) return `${sign}₹${(abs / 10000000).toFixed(decimals)} Cr`;
  if (abs >= 100000) return `${sign}₹${(abs / 100000).toFixed(decimals)} L`;
  return `${sign}₹${abs.toLocaleString('en-IN', { maximumFractionDigits: decimals })}`;
}

function compactNumber(value: number, suffix = '') {
  const number = Number(value || 0);
  const abs = Math.abs(number);
  const sign = number < 0 ? '-' : '';
  if (abs >= 10000000) return `${sign}${(abs / 10000000).toFixed(2)} Cr${suffix}`;
  if (abs >= 100000) return `${sign}${(abs / 100000).toFixed(2)} L${suffix}`;
  if (abs >= 1000) return `${sign}${(abs / 1000).toFixed(1)} K${suffix}`;
  return `${sign}${abs.toLocaleString('en-IN', { maximumFractionDigits: 2 })}${suffix}`;
}

function Metric({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text numberOfLines={1} adjustsFontSizeToFit style={[styles.metricValue, accent && styles.metricAccent]}>
        {value}
      </Text>
    </View>
  );
}

function CostRing({ value, label }: { value: string; label: string }) {
  const size = 86;
  const stroke = 10;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = 0.76;

  return (
    <View style={[styles.ringWrap, { width: size, height: size }]}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFillObject}>
        <Circle cx={size / 2} cy={size / 2} r={radius} stroke="#E8E1DA" strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={T.copper || '#C56C24'}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="butt"
          strokeDasharray={`${circumference * progress} ${circumference}`}
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#244A76"
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={`${circumference * 0.16} ${circumference}`}
          strokeDashoffset={-circumference * 0.76}
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <Text numberOfLines={1} adjustsFontSizeToFit style={styles.ringValue}>{value}</Text>
      <Text style={styles.ringLabel}>{label}</Text>
    </View>
  );
}

export default function ProductionCostDashboardCard({ data, loading, error, onRefresh, onOpen }: Props) {
  if (loading && !data) {
    return (
      <View style={[styles.card, styles.stateCard]}>
        <ActivityIndicator color={T.copper} />
        <Text style={styles.stateText}>Loading production cost…</Text>
      </View>
    );
  }

  if (error && !data) {
    return (
      <View style={[styles.card, styles.errorCard]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.errorTitle}>Production cost unavailable</Text>
          <Text style={styles.errorText}>{error}</Text>
        </View>
        <TouchableOpacity style={styles.retryButton} onPress={onRefresh}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!data) return null;

  const { period, summary } = data;
  const monthLabel = String(period?.label || '').replace(/\s*·\s*LIVE/i, '') || 'Current';

  return (
    <TouchableOpacity activeOpacity={0.94} onPress={onOpen} style={styles.card}>
      <View style={styles.topRow}>
        <View>
          <Text style={styles.kicker}>THIS MONTH · PRODUCTION COST</Text>
          <Text style={styles.period}>{period.label}{period.ongoing ? ' · LIVE' : ''}</Text>
        </View>
        <TouchableOpacity
          onPress={(event) => {
            event.stopPropagation?.();
            onOpen();
          }}
          hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
        >
          <Text style={styles.fullReport}>Full report ›</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.bodyRow}>
        <CostRing value={compactMoney(summary.total_cost)} label={monthLabel} />

        <View style={styles.metricColumn}>
          <Metric label="COST / PICK" value={compactMoney(summary.cost_per_pick, 3)} accent />
          <Metric label="PRODUCTION" value={compactNumber(summary.production_mtr, ' m')} />
        </View>

        <View style={styles.metricColumn}>
          <Metric label="AVG PICKS" value={Number(summary.avg_picks || 0).toFixed(1)} />
          <Metric label="COST / MC-DAY" value={compactMoney(summary.cost_per_machine_day)} />
        </View>
      </View>

      {!!error && <Text style={styles.inlineError}>Latest refresh failed. Showing previously loaded values.</Text>}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFDF9', borderRadius: 16, borderWidth: 1, borderColor: T.border,
    borderLeftWidth: 3, borderLeftColor: T.copper || '#C56C24', marginBottom: 14,
    paddingHorizontal: 14, paddingVertical: 13, ...S.card,
  },
  stateCard: { minHeight: 140, alignItems: 'center', justifyContent: 'center', gap: 10 },
  stateText: { color: T.muted, fontSize: 12, fontWeight: '700' },
  errorCard: { minHeight: 110, flexDirection: 'row', alignItems: 'center', gap: 12 },
  errorTitle: { color: T.red, fontSize: 14, fontWeight: '900' },
  errorText: { color: T.muted, fontSize: 11, lineHeight: 16, marginTop: 4 },
  retryButton: { backgroundColor: T.nav, borderRadius: 9, paddingHorizontal: 13, paddingVertical: 9 },
  retryText: { color: '#fff', fontSize: 11, fontWeight: '900' },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 },
  kicker: { color: T.muted, fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
  period: { color: T.muted, fontSize: 9, fontWeight: '700', marginTop: 3 },
  fullReport: { color: T.copper || '#C56C24', fontSize: 10, fontWeight: '900' },
  bodyRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 10 },
  ringWrap: { alignItems: 'center', justifyContent: 'center' },
  ringValue: { width: 62, textAlign: 'center', color: T.nav, fontSize: 13, fontWeight: '900' },
  ringLabel: { color: T.muted, fontSize: 7, marginTop: 2 },
  metricColumn: { flex: 1, minWidth: 0, gap: 12 },
  metric: { minWidth: 0 },
  metricLabel: { color: T.muted, fontSize: 8, fontWeight: '900', letterSpacing: 0.35 },
  metricValue: { color: T.nav, fontSize: 13, fontWeight: '900', marginTop: 4 },
  metricAccent: { color: T.copper || '#C56C24' },
  inlineError: { color: T.red, fontSize: 9, fontWeight: '700', marginTop: 8 },
});
