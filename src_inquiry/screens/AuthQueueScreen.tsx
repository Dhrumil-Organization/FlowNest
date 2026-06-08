// import React, {useCallback, useEffect, useState} from 'react';
// import {
//   ActivityIndicator,
//   FlatList,
//   RefreshControl,
//   StyleSheet,
//   Text,
//   TouchableOpacity,
//   View,
// } from 'react-native';
// import {NativeStackScreenProps} from '@react-navigation/native-stack';
// import {useFocusEffect} from '@react-navigation/native';
// import AsyncStorage from '@react-native-async-storage/async-storage';

// import {colors, fontSize, radius, spacing} from '../utils/theme';
// import {AuthQueueItem, RootStackParamList} from '../types';
// import {costSheetApi} from '../services/costSheetApi';
// import EmptyState from '../components/EmptyState';
// import {formatCurrency} from '../utils/validators';

// type Props = NativeStackScreenProps<RootStackParamList, 'AuthQueue'>;

// const formatRelativeTime = (iso: string | null): string => {
//   if (!iso) return '';
//   const d = new Date(iso);
//   const diff = Date.now() - d.getTime();
//   const min = Math.floor(diff / 60000);
//   if (min < 1) return 'just now';
//   if (min < 60) return `${min}m ago`;
//   const hr = Math.floor(min / 60);
//   if (hr < 24) return `${hr}h ago`;
//   return `${Math.floor(hr / 24)}d ago`;
// };

// const AuthQueueScreen: React.FC<Props> = ({navigation}) => {
//   const [getUserPrptype, setUserPrptype] = useState<string>('');
//   const [items, setItems] = useState<AuthQueueItem[]>([]);
//   const [counts, setCounts] = useState({pending: 0, approved: 0, rejected: 0});
//   const [loading, setLoading] = useState(true);
//   const [refreshing, setRefreshing] = useState(false);

//   useEffect(() => {
//     const initializeApp = async () => {
//       try {
//         const user_prptype = await AsyncStorage.getItem('user_prptype');
//         console.log('user_prptype', user_prptype);
//         setUserPrptype(user_prptype);
//       } catch (error) {
//         console.error('Initialization error:', error);
//       } finally {
//       }
//     };

//     initializeApp();
//   }, []);

//   const load = useCallback(async (getUserPrptype) => {
//     if(!getUserPrptype) return;
//     try {
//       const res = await costSheetApi.pendingQueue(getUserPrptype, '27');
//       setItems(res.data);
//       setCounts(res.counts);
//     } catch {
//       // ignore
//     } finally {
//       setLoading(false);
//       setRefreshing(false);
//     }
//   }, []);

//   useFocusEffect(
//     useCallback(() => {
//       load(getUserPrptype);
//     }, [load, getUserPrptype]),
//   );

//   const renderItem = ({item}: {item: AuthQueueItem}) => {
//     const isLowGm = item.gross_margin_pct < 5;
//     const isMidGm = item.gross_margin_pct >= 5 && item.gross_margin_pct < 10;
//     const gmColor = isLowGm ? colors.danger : isMidGm ? colors.warning : colors.success;
//     const gmBg = isLowGm ? colors.dangerBg : isMidGm ? colors.warningBg : colors.successBg;

//     return (
//       <TouchableOpacity
//         style={styles.card}
//         activeOpacity={0.7}
//         onPress={() =>
//           navigation.navigate('AuthReview', {
//             inquiryId: item.inquiry_id,
//             designId: item.design_id,
//           })
//         }>
//         <View style={styles.cardHead}>
//           <Text style={styles.inqNo}>{item.inquiry_no}</Text>
//           <View style={styles.pill}>
//             <Text style={styles.pillText}>awaiting</Text>
//           </View>
//         </View>

//         <Text style={styles.party}>{item.party_name}</Text>
//         <Text style={styles.subMeta}>
//           {item.design_name}
//         </Text>
//         <Text style={styles.subMeta}>
//           Qty: {item.total_quantity} {item.quantity_unit} • Submitted{' '}
//           {formatRelativeTime(item.submitted_at)}
//         </Text>

//         <View style={styles.statsRow}>
//           <View style={styles.statBox}>
//             <Text style={styles.statLabel}>Total cost</Text>
//             <Text style={styles.statValue}>{formatCurrency(item.total_cost)}</Text>
//           </View>
//           <View style={styles.statBox}>
//             <Text style={styles.statLabel}>Sale rate</Text>
//             <Text style={styles.statValue}>{formatCurrency(item.sale_rate)}</Text>
//           </View>
//           <View style={[styles.statBox, {backgroundColor: gmBg}]}>
//             <Text style={[styles.statLabel, {color: gmColor}]}>GM</Text>
//             <Text style={[styles.statValue, {color: gmColor}]}>
//               {item.gross_margin_pct}%
//             </Text>
//           </View>
//         </View>

//         {isLowGm ? (
//           <View style={styles.warnBar}>
//             <Text style={styles.warnText}>⚠ Low margin — review carefully</Text>
//           </View>
//         ) : null}

//         <Text style={styles.openLink}>Tap to review full cost sheet →</Text>
//       </TouchableOpacity>
//     );
//   };

//   if (loading) {
//     return (
//       <View style={styles.center}>
//         <ActivityIndicator color={colors.primary} />
//       </View>
//     );
//   }

//   return (
//     <View style={{flex: 1, backgroundColor: colors.bg}}>
//       {/* Stat bar */}
//       <View style={styles.statBar}>
//         <View style={styles.statBarItem}>
//           <Text style={[styles.statBarValue, {color: colors.warning}]}>
//             {counts.pending}
//           </Text>
//           <Text style={styles.statBarLabel}>Pending</Text>
//         </View>
//         <View style={styles.statBarItem}>
//           <Text style={[styles.statBarValue, {color: colors.success}]}>
//             {counts.approved}
//           </Text>
//           <Text style={styles.statBarLabel}>Approved</Text>
//         </View>
//         <View style={styles.statBarItem}>
//           <Text style={[styles.statBarValue, {color: colors.danger}]}>
//             {counts.rejected}
//           </Text>
//           <Text style={styles.statBarLabel}>Rejected</Text>
//         </View>
//       </View>

//       <FlatList
//         data={items}
//         keyExtractor={i => String(i.id)}
//         renderItem={renderItem}
//         contentContainerStyle={{padding: spacing.md, paddingBottom: 40}}
//         refreshControl={
//           <RefreshControl
//             refreshing={refreshing}
//             onRefresh={() => {
//               setRefreshing(true);
//               load(getUserPrptype);
//             }}
//           />
//         }
//         ListEmptyComponent={
//           <View style={{paddingTop: 60}}>
//             <EmptyState
//               title="Nothing to authorize"
//               subtitle="All cost sheets are clear. Pull to refresh."
//             />
//           </View>
//         }
//       />
//     </View>
//   );
// };

// const styles = StyleSheet.create({
//   center: {flex: 1, alignItems: 'center', justifyContent: 'center'},
//   statBar: {
//     flexDirection: 'row',
//     padding: spacing.md,
//     gap: spacing.sm,
//   },
//   statBarItem: {
//     flex: 1,
//     backgroundColor: colors.cardBg,
//     padding: spacing.sm + 2,
//     borderRadius: radius.md,
//     alignItems: 'center',
//     borderWidth: 1,
//     borderColor: colors.border,
//   },
//   statBarValue: {fontSize: fontSize.xl, fontWeight: '500'},
//   statBarLabel: {fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2},
//   card: {
//     backgroundColor: colors.cardBg,
//     borderWidth: 1,
//     borderColor: colors.border,
//     borderRadius: radius.md,
//     padding: spacing.md,
//     marginBottom: spacing.sm,
//   },
//   cardHead: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     marginBottom: 4,
//   },
//   inqNo: {fontSize: fontSize.md, fontWeight: '500'},
//   pill: {
//     paddingHorizontal: spacing.sm + 2,
//     paddingVertical: 2,
//     backgroundColor: colors.warningBg,
//     borderRadius: radius.pill,
//   },
//   pillText: {fontSize: fontSize.xs, color: colors.warning, fontWeight: '500'},
//   party: {fontSize: fontSize.base, color: colors.textPrimary, marginBottom: 2},
//   subMeta: {fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2},
//   statsRow: {
//     flexDirection: 'row',
//     gap: spacing.sm,
//     marginTop: spacing.sm + 2,
//   },
//   statBox: {
//     flex: 1,
//     backgroundColor: colors.bgSecondary,
//     padding: spacing.sm,
//     borderRadius: radius.sm,
//     alignItems: 'center',
//   },
//   statLabel: {fontSize: 10, color: colors.textSecondary},
//   statValue: {fontSize: fontSize.sm, fontWeight: '500', marginTop: 2},
//   warnBar: {
//     marginTop: spacing.sm,
//     padding: 8,
//     backgroundColor: colors.dangerBg,
//     borderRadius: radius.sm,
//   },
//   warnText: {fontSize: fontSize.xs, color: colors.danger, fontWeight: '500'},
//   openLink: {
//     fontSize: fontSize.xs,
//     color: colors.info,
//     marginTop: spacing.sm,
//     textAlign: 'center',
//     fontWeight: '500',
//   },
// });

// export default AuthQueueScreen;
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, fontSize, radius, spacing } from '../utils/theme';
import { AuthQueueItem, RootStackParamList } from '../types';
import { costSheetApi } from '../services/costSheetApi';
import EmptyState from '../components/EmptyState';
import { formatCurrency } from '../utils/validators';

type Props = NativeStackScreenProps<RootStackParamList, 'AuthQueue'>;

const formatRelativeTime = (iso: string | null): string => {
  if (!iso) return '';
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
};

const AuthQueueScreen: React.FC<Props> = ({ navigation }) => {
  const [getUserPrptype, setUserPrptype] = useState<string>('');
  const [items, setItems] = useState<AuthQueueItem[]>([]);
  const [counts, setCounts] = useState({ pending: 0, approved: 0, rejected: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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

  const load = useCallback(async (getUserPrptype) => {
    try {
      const res = await costSheetApi.pendingQueue(getUserPrptype, '27');
      setItems(res.data);
      setCounts(res.counts);
    } catch {
      // ignore
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load(getUserPrptype);
    }, [load, getUserPrptype]),
  );

  const renderItem = ({ item }: { item: AuthQueueItem }) => {
    const isLowGm = item.gross_margin_pct < 5;
    const isMidGm = item.gross_margin_pct >= 5 && item.gross_margin_pct < 10;
    const gmColor = isLowGm ? colors.danger : isMidGm ? colors.warning : colors.success;
    const gmBg = isLowGm ? colors.dangerBg : isMidGm ? colors.warningBg : colors.successBg;

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.7}
        onPress={() =>
          navigation.navigate('AuthReview', {
            inquiryId: item.inquiry_id,
            designId: item.design_id,
          })
        }>
        <View style={styles.cardHead}>
          <Text style={styles.inqNo}>{item.inquiry_no}</Text>
          <View style={styles.pill}>
            <Text style={styles.pillText}>awaiting</Text>
          </View>
        </View>

        <Text style={styles.party}>{item.party_name}</Text>
        <Text style={styles.subMeta}>
          {item.design_name}
        </Text>
        <Text style={styles.subMeta}>
          Qty: {item.total_quantity} {item.quantity_unit} • Submitted{' '}
          {formatRelativeTime(item.submitted_at)}
        </Text>

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Total cost</Text>
            <Text style={styles.statValue}>{formatCurrency(item.total_cost)}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Sale rate</Text>
            <Text style={styles.statValue}>{formatCurrency(item.sale_rate)}</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: gmBg }]}>
            <Text style={[styles.statLabel, { color: gmColor }]}>GM</Text>
            <Text style={[styles.statValue, { color: gmColor }]}>
              {item.gross_margin_pct}%
            </Text>
          </View>
        </View>

        {isLowGm ? (
          <View style={styles.warnBar}>
            <Text style={styles.warnText}>⚠ Low margin — review carefully</Text>
          </View>
        ) : null}

        <Text style={styles.openLink}>Tap to review full cost sheet →</Text>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Stat bar */}
      <View style={styles.statBar}>
        <View style={styles.statBarItem}>
          <Text style={[styles.statBarValue, { color: colors.warning }]}>
            {counts.pending}
          </Text>
          <Text style={styles.statBarLabel}>Pending</Text>
        </View>
        <View style={styles.statBarItem}>
          <Text style={[styles.statBarValue, { color: colors.success }]}>
            {counts.approved}
          </Text>
          <Text style={styles.statBarLabel}>Approved</Text>
        </View>
        <View style={styles.statBarItem}>
          <Text style={[styles.statBarValue, { color: colors.danger }]}>
            {counts.rejected}
          </Text>
          <Text style={styles.statBarLabel}>Rejected</Text>
        </View>
      </View>

      <FlatList
        data={items}
        keyExtractor={i => String(i.id)}
        renderItem={renderItem}
        contentContainerStyle={{ padding: spacing.md, paddingBottom: 40 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load(getUserPrptype);
            }}
          />
        }
        ListEmptyComponent={
          <View style={{ paddingTop: 60 }}>
            <EmptyState
              title="Nothing to authorize"
              subtitle="All cost sheets are clear. Pull to refresh."
            />
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  statBar: {
    flexDirection: 'row',
    padding: spacing.md,
    gap: spacing.sm,
  },
  statBarItem: {
    flex: 1,
    backgroundColor: colors.cardBg,
    padding: spacing.sm + 2,
    borderRadius: radius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  statBarValue: { fontSize: fontSize.xl, fontWeight: '500' },
  statBarLabel: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2 },
  card: {
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  cardHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  inqNo: { fontSize: fontSize.md, fontWeight: '500' },
  pill: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 2,
    backgroundColor: colors.warningBg,
    borderRadius: radius.pill,
  },
  pillText: { fontSize: fontSize.xs, color: colors.warning, fontWeight: '500' },
  party: { fontSize: fontSize.base, color: colors.textPrimary, marginBottom: 2 },
  subMeta: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2 },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm + 2,
  },
  statBox: {
    flex: 1,
    backgroundColor: colors.bgSecondary,
    padding: spacing.sm,
    borderRadius: radius.sm,
    alignItems: 'center',
  },
  statLabel: { fontSize: 10, color: colors.textSecondary },
  statValue: { fontSize: fontSize.sm, fontWeight: '500', marginTop: 2 },
  warnBar: {
    marginTop: spacing.sm,
    padding: 8,
    backgroundColor: colors.dangerBg,
    borderRadius: radius.sm,
  },
  warnText: { fontSize: fontSize.xs, color: colors.danger, fontWeight: '500' },
  openLink: {
    fontSize: fontSize.xs,
    color: colors.info,
    marginTop: spacing.sm,
    textAlign: 'center',
    fontWeight: '500',
  },
});

export default AuthQueueScreen;
