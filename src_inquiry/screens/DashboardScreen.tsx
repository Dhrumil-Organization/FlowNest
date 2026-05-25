import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import HeaderBar from '../HeaderBar/HeaderBar';
import HeaderBarwithBack from '../../components/HeaderBarwithBack/HeaderBarwithBack';
import { colors, fontSize, radius, spacing } from '../utils/theme';
import { inquiryApi } from '../services/inquiryApi';
import { masterApi } from '../services/masterApi';
import {
  DashboardCounts,
  Inquiry,
  InquiryStatus,
  RootStackParamList,
  TatCounts,
  TatStatus,
} from '../types';
import StatusBadge from '../components/StatusBadge';
import TatBadge from '../components/TatBadge';
import EmptyState from '../components/EmptyState';
import { formatDate } from '../utils/validators';
import theme from '../../android/app/src/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Props = NativeStackScreenProps<RootStackParamList, 'Dashboard'>;

type FilterKey = InquiryStatus | 'all';
type TatFilterKey = TatStatus | 'all';

const STATUS_FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pending_costing', label: 'Pending' },
  { key: 'costed', label: 'Costed' },
  { key: 'sent', label: 'Sent' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'rejected', label: 'Rejected' },
];

const TAT_FILTERS: { key: TatFilterKey; label: string }[] = [
  { key: 'all', label: 'All TAT' },
  { key: 'on_time', label: '🟢 On Time' },
  { key: 'warning', label: '🟡 Warning' },
  { key: 'breached', label: '🔴 Breached' },
];

const DashboardScreen: React.FC<Props> = ({ navigation, username, getUserId }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<FilterKey>('all');
  const [tatFilter, setTatFilter] = useState<TatFilterKey>('all');
  const [search, setSearch] = useState('');
  const [items, setItems] = useState<Inquiry[]>([]);
  const [counts, setCounts] = useState<DashboardCounts | null>(null);
  const [tatCounts, setTatCounts] = useState<TatCounts | null>(null);
  const [getUserPrptype, setUserPrptype] = useState<string>('');

  console.log('getUserId from login :', getUserId, 'getUserPrptype from login :', getUserPrptype);

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
    async (showSpinner = true) => {
      if (showSpinner) setLoading(true);
      try {
        const res = await inquiryApi.list({
          status: statusFilter,
          tat: tatFilter === 'all' ? undefined : tatFilter,
          search: search || undefined,
          prptype: getUserPrptype,
          yearno: "27"
        });
        console.log("Inquery:", res);
        setItems(res.data);
        setCounts(res.counts);
        setTatCounts(res.tatCounts);
      } catch (e) {
        // ignore
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [statusFilter, tatFilter, search, getUserPrptype],
  );
  const right = async (getUserId) => {
    const user_id = getUserId;
    const permission = 'mob_app';
    const txntype = 'mob_inquiry';

    setLoading(true);
    try {
      const data = await masterApi.checkRights(user_id, permission, txntype);
      console.log("Rights:", data);
    } catch (e: any) {
      // Convert error to string (handles ReadableNativeMap, objects, etc.)
      Alert.alert('Error', String(e || 'Unable to fetch Rights'));
    } finally {
      setLoading(false);
    }
  };

  // const right = useCallback(
  //   async (showSpinner = true) => {
  //     if (showSpinner) setLoading(true);
  //     try {
  //       const res = await MasterApi.userRights({ getUserId: getUserId, permission: 'mob_app', txntype: "mob_inquiry" });
  //       console.log("Right:", res);
  //       // setItems(res.data);
  //       // setCounts(res.counts);
  //       // setTatCounts(res.tatCounts);
  //     } catch (e) {
  //       // ignore
  //     } finally {
  //       setLoading(false);
  //       // setRefreshing(false);
  //     }
  //   },
  //   [getUserId],
  // );

  useFocusEffect(
    useCallback(() => {
      load(false);
    }, [load]),
  );

  useEffect(() => {
    load();
  }, [statusFilter, tatFilter, getUserId, getUserPrptype]);

  useEffect(() => {
    right(getUserId);
  }, [getUserId]);

  const onRefresh = () => {
    setRefreshing(true);
    load(false);
  };

  const renderItem = ({ item }: { item: Inquiry }) => (
    <TouchableOpacity
      activeOpacity={0.7}
      style={styles.card}
      onPress={() => navigation.navigate('InquiryDetail', { id: item.id })}>
      <View style={styles.cardHead}>
        <Text style={styles.inqNo}>{item.inquiry_no}</Text>
        <StatusBadge status={item.status} />
      </View>
      <Text style={styles.partyName} numberOfLines={1}>
        {item.party_name}
      </Text>
      <View style={styles.cardFooter}>
        <Text style={styles.meta}>
          {(item.designs_count ?? 0)} design{(item.designs_count ?? 0) > 1 ? 's' : ''}
          {' • '}
          {formatDate(item.inquiry_date)}
        </Text>
        {item.tat?.overall_status && item.tat.overall_status !== 'not_applicable' ? (
          <TatBadge status={item.tat.overall_status} />
        ) : null}
      </View>
    </TouchableOpacity>
  );

  return (
    <>
      <HeaderBarwithBack
        userName={username}
        header={'Inquiries Dashboard'}
        subHeader={'Manage your inquiries records'}
      />
      <TouchableOpacity
        onPress={() => navigation.navigate('TatAnalytics')}
        style={styles.iconBtn}>
        <Text style={styles.iconBtnText}>📊</Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => navigation.navigate('TatConfig')}
        style={styles.iconBtn1}>
        <Text style={styles.iconBtnText}>⚙</Text>
      </TouchableOpacity>
      <View style={styles.container}>
        {/* Top bar with admin shortcut */}
        {/* <View style={styles.topBar}>
          <Text style={styles.headerTitle}>Inquiries</Text>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <TouchableOpacity
              onPress={() => navigation.navigate('TatAnalytics')}
              style={styles.iconBtn}>
              <Text style={styles.iconBtnText}>📊</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => navigation.navigate('TatConfig')}
              style={styles.iconBtn1}>
              <Text style={styles.iconBtnText}>⚙</Text>
            </TouchableOpacity>
          </View>
        </View> */}

        {/* Stat cards */}
        {counts ? (
          <View style={styles.statsRow}>
            <Stat label="Pending" value={counts.pending_costing} color={colors.warning} bg={colors.warningBg} />
            <Stat label="Costed" value={counts.costed} color={colors.success} bg={colors.successBg} />
            <Stat label="Sent" value={counts.sent} color={colors.purple} bg={colors.purpleBg} />
            <Stat label="Total" value={counts.total} color={colors.info} bg={colors.infoBg} />
          </View>
        ) : null}

        {/* TAT stat row */}
        {tatCounts ? (
          <View style={styles.tatRow}>
            <View style={[styles.tatChip, { backgroundColor: colors.tatOnTimeBg }]}>
              <Text style={[styles.tatChipDot, { backgroundColor: colors.tatOnTime }]} />
              <Text style={[styles.tatChipText, { color: colors.tatOnTime }]}>
                On Time: {tatCounts.on_time}
              </Text>
            </View>
            <View style={[styles.tatChip, { backgroundColor: colors.tatWarningBg }]}>
              <Text style={[styles.tatChipDot, { backgroundColor: colors.tatWarning }]} />
              <Text style={[styles.tatChipText, { color: colors.tatWarning }]}>
                Warning: {tatCounts.warning}
              </Text>
            </View>
            <View style={[styles.tatChip, { backgroundColor: colors.tatBreachedBg }]}>
              <Text style={[styles.tatChipDot, { backgroundColor: colors.tatBreached }]} />
              <Text style={[styles.tatChipText, { color: colors.tatBreached }]}>
                Breached: {tatCounts.breached}
              </Text>
            </View>
          </View>
        ) : null}

        {/* Search */}
        <TextInput
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={() => load()}
          placeholder="Search by inquiry no or party"
          placeholderTextColor={colors.textTertiary}
          style={styles.search}
        />

        {/* Status chips */}
        <View style={styles.chipsWrap}>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={STATUS_FILTERS}
            keyExtractor={i => i.key}
            renderItem={({ item }) => {
              const active = statusFilter === item.key;
              return (
                <TouchableOpacity
                  onPress={() => setStatusFilter(item.key)}
                  style={[styles.chip, active && styles.chipActive]}>
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            }}
          />
        </View>

        {/* TAT chips */}
        <View style={styles.chipsWrap}>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={TAT_FILTERS}
            keyExtractor={i => i.key}
            renderItem={({ item }) => {
              const active = tatFilter === item.key;
              return (
                <TouchableOpacity
                  onPress={() => setTatFilter(item.key)}
                  style={[styles.chip, active && styles.chipActive]}>
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            }}
          />
        </View>

        {/* List */}
        {loading ? (
          <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />
        ) : (
          <FlatList
            data={items}
            keyExtractor={i => String(i.id)}
            renderItem={renderItem}
            contentContainerStyle={{ padding: spacing.md, paddingBottom: 100 }}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            ListEmptyComponent={
              <EmptyState
                title="No inquiries"
                subtitle="Tap the + button to create a new inquiry"
              />
            }
          />
        )}

        {/* FAB */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => navigation.navigate('InquiryForm')}
          style={styles.fab}>
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>
      </View>
    </>
  );
};

const Stat = ({
  label, value, color, bg,
}: { label: string; value: number; color: string; bg: string }) => (
  <View style={[styles.statCard, { backgroundColor: bg }]}>
    <Text style={[styles.statLabel, { color }]}>{label}</Text>
    <Text style={[styles.statValue, { color }]}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.cardBg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: { fontSize: fontSize.lg, fontWeight: '500', color: colors.textPrimary },
  iconBtn: {
    // padding: spacing.sm,
    // backgroundColor: colors.bgSecondary,
    // borderRadius: radius.md,
    position: 'absolute',
    top: 105,
    right: 2.5,
    zIndex: 10,
    backgroundColor: theme.BRAND_GRADIENT_END,
    color: '#fff',
    borderRadius: 3,
    padding: 4,
  },
  iconBtn1: {
    // padding: spacing.sm,
    // backgroundColor: colors.bgSecondary,
    // borderRadius: radius.md,
    position: 'absolute',
    top: 150,
    right: 2.5,
    zIndex: 10,
    backgroundColor: theme.BRAND_GRADIENT_END,
    color: '#fff',
    borderRadius: 3,
    padding: 7,
  },
  iconBtnText: { fontSize: 18, color: '#fff' },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
  statCard: {
    flex: 1,
    padding: spacing.sm + 2,
    borderRadius: radius.md,
    zIndex: 1
  },
  statLabel: { fontSize: fontSize.xs },
  statValue: { fontSize: fontSize.xl, fontWeight: '500', marginTop: 2 },
  tatRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    gap: spacing.sm,
  },
  tatChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: radius.md,
    gap: 6,
  },
  tatChipDot: { width: 8, height: 8, borderRadius: 4 },
  tatChipText: { fontSize: fontSize.xs, fontWeight: '500' },
  search: {
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: fontSize.md,
    color: colors.textPrimary,
  },
  chipsWrap: { paddingVertical: spacing.xs + 2, paddingLeft: spacing.md },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    backgroundColor: colors.cardBg,
    borderRadius: radius.pill,
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: fontSize.sm, color: colors.textSecondary },
  chipTextActive: { color: colors.textOnPrimary, fontWeight: '500' },
  card: {
    backgroundColor: colors.cardBg,
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  inqNo: { fontSize: fontSize.md, fontWeight: '500', color: colors.textPrimary },
  partyName: { fontSize: fontSize.base, color: colors.textPrimary, marginBottom: 6 },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  meta: { fontSize: fontSize.xs, color: colors.textSecondary, flex: 1 },
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  fabText: { color: colors.white, fontSize: 28, fontWeight: '300', lineHeight: 30 },
});

export default DashboardScreen;
