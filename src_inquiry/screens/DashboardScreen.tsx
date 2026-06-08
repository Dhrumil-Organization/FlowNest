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
import TourOverlay, { DASHBOARD_TOUR } from '../components/TourOverlay';
import { settingsApi } from '../services/settingsApi';
import { costSheetApi } from '../services/costSheetApi';

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

const formatNoteTime = (iso: string): string => {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;

  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
};

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
  const [getUserRights, setUserRights] = useState([]);
  const [isAuthorizer, setIsAuthorizer] = useState(false);
  const [pendingAuth, setPendingAuth] = useState(0);
  const [showTour, setShowTour] = useState(false);

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

  useEffect(() => {
    (async () => {
      try {
        const perms = await settingsApi.myPermissions(getUserPrptype, '27');
        setIsAuthorizer(perms.is_authorizer);
        if (perms.is_authorizer) {
          const queue = await costSheetApi.pendingQueue(getUserPrptype, '27');
          setPendingAuth(queue.counts.pending);
        }
      } catch {
        // ignore
      }
    })();
  }, [getUserPrptype]);


  const checkRightsAPI = useCallback(async (showSpinner = true, getUserId) => {
    if (showSpinner) setLoading(true);
    try {
      const data = await masterApi.checkRights('', getUserId, 'mob_inquiry');
      console.log("Rights res:", data?.response?.module_rights);
      setUserRights(data?.response?.module_rights);
    } catch (e: any) {
      Alert.alert('Error', e || 'Unable to fetch Rights');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, tatFilter, search, getUserId],
  );

  const load = useCallback(
    async (showSpinner = true, getUserPrptype, getUserRights) => {
      if (showSpinner) setLoading(true);
      try {
        const res = await inquiryApi.list({
          status: statusFilter,
          tat: tatFilter === 'all' ? undefined : tatFilter,
          search: search || undefined,
          prptype: getUserPrptype,
          yearno: "27",
          rights: getUserRights[0].assign === "1" ? 3 : getUserRights[0].attachtds === "1" ? 1 : getUserRights[0].detachtds === "1" ? 2 : 0,
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
    [statusFilter, tatFilter, search, getUserPrptype, getUserRights],
  );


  // console.log('getUserRights :', getUserRights[0]);

  // const right = async (getUserId) => {
  //   const user_id = getUserId;
  //   const permission = 'mob_app';
  //   const txntype = 'mob_inquiry';

  //   setLoading(true);
  //   try {
  //     const data = await masterApi.checkRights(user_id, permission, txntype);
  //     console.log("Rights:", data);
  //   } catch (e: any) {
  //     // Convert error to string (handles ReadableNativeMap, objects, etc.)
  //     Alert.alert('Error', String(e || 'Unable to fetch Rights'));
  //   } finally {
  //     setLoading(false);
  //   }
  // };

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
      load(false, getUserPrptype, getUserRights);
    }, [load]),
  );

  useEffect(() => {
    load(true, getUserPrptype, getUserRights);
  }, [statusFilter, tatFilter, getUserId, getUserPrptype, getUserRights]);

  useFocusEffect(
    useCallback(() => {
      checkRightsAPI(false, getUserId);
    }, [checkRightsAPI]),
  );

  useEffect(() => {
    checkRightsAPI(true, getUserId);
  }, [statusFilter, tatFilter, getUserId, getUserPrptype]);

  const onRefresh = () => {
    setRefreshing(true);
    load(false, getUserPrptype, getUserRights);
  };

  const handleDelete = (item: Inquiry) => {
    Alert.alert(
      'Delete Inquiry?',
      `Are you sure you want to delete ${item.inquiry_no}? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await inquiryApi.delete({ item: item.id, prptype: getUserPrptype, yearno: "27" });
              load(false, getUserPrptype, getUserRights);
            } catch (e: any) {
              Alert.alert(
                'Error',
                e?.response?.data?.message || 'Failed to delete inquiry',
              );
            }
          },
        },
      ],
    );
  };

  // const renderItem = ({ item }: { item: Inquiry }) => (
  //   <TouchableOpacity
  //     activeOpacity={0.7}
  //     style={styles.card}
  //     onPress={() => navigation.navigate('InquiryDetail', { id: item.id })}>
  //     <View style={styles.cardHead}>
  //       <Text style={styles.inqNo}>{item.inquiry_no}</Text>
  //       <StatusBadge status={item.status} />
  //     </View>
  //     <Text style={styles.partyName} numberOfLines={1}>
  //       {item.party_name}
  //     </Text>
  //     <View style={styles.cardFooter}>
  //       <Text style={styles.meta}>
  //         {(item.designs_count ?? 0)} {getUserPrptype === 'S' ? 'design' : 'item,'}{(item.designs_count ?? 0) > 1 ? 's' : ''}
  //         {' • '}
  //         {formatDate(item.inquiry_date)}
  //       </Text>
  //       {item.tat?.overall_status && item.tat.overall_status !== 'not_applicable' ? (
  //         <TatBadge status={item.tat.overall_status} />
  //       ) : null}
  //     </View>
  //   </TouchableOpacity>
  // );
  const renderItem = ({ item }: { item: Inquiry }) => {
    const isEditable = item.can_edit ?? (item.status === 'pending_costing');
    const isDeletable = item.can_delete ?? (item.status === 'pending_costing');

    return (
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
            {(item.designs_count ?? 0)}{' '}
            {getUserPrptype === 'S' ? 'design' : 'item'}
            {(item.designs_count ?? 0) > 1 ? 's' : ''}
            {' • '}
            {formatDate(item.inquiry_date)}
          </Text>
          {item.tat?.overall_status &&
            item.tat.overall_status !== 'not_applicable' ? (
            <TatBadge status={item.tat.overall_status} />
          ) : null}
        </View>

        {/* Notes preview row */}
        {item.latest_note ? (
          <View style={styles.notesPreview}>
            <Text style={styles.notesIcon}>💬</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.notesPreviewText} numberOfLines={1}>
                {item.latest_note.created_by_name
                  ? `${item.latest_note.created_by_name}: `
                  : ''}
                {item.latest_note.note}
              </Text>
              <Text style={styles.notesPreviewTime}>
                {formatNoteTime(item.latest_note.created_at)}
                {item.notes_count && item.notes_count > 1
                  ? ` • ${item.notes_count} notes`
                  : ''}
              </Text>
            </View>
          </View>
        ) : null}

        {/* Action row */}
        <View style={styles.cardActions}>
          <TouchableOpacity
            style={styles.actionBtn}
            disabled={getUserRights[0]?.detachtds === "1" ? true : false}
            onPress={(e) => {
              e.stopPropagation?.();
              navigation.navigate('InquiryNotes', {
                inquiryId: item.id,
                inquiryNo: item.inquiry_no,
              });
            }}>
            <Text style={styles.actionIcon}>📝</Text>
            <Text style={styles.actionText}>
              Notes {item.notes_count ? `(${item.notes_count})` : ''}
            </Text>
          </TouchableOpacity>

          {isEditable ? (
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={(e) => {
                e.stopPropagation?.();
                navigation.navigate('InquiryForm', { inquiryId: item.id });
              }}>
              <Text style={styles.actionIcon}>✏️</Text>
              <Text style={styles.actionText}>Edit</Text>
            </TouchableOpacity>
          ) : null}

          {isDeletable ? (
            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnDanger]}
              onPress={(e) => {
                e.stopPropagation?.();
                handleDelete(item);
              }}>
              <Text style={styles.actionIcon}>🗑️</Text>
              <Text style={[styles.actionText, { color: colors.danger }]}>
                Delete
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <>
      <HeaderBarwithBack
        userName={username}
        header={'Inquiries Dashboard'}
        subHeader={'Manage your inquiries records'}
      />
      {getUserRights[0]?.detachtds === "1" ? null : (
        <>
          {/* <TouchableOpacity
            onPress={() => navigation.navigate('TatAnalytics')}
            style={styles.iconBtn}>
            <Text style={styles.iconBtnText}>📊</Text>
          </TouchableOpacity> */}
          <TouchableOpacity
            onPress={() => setShowTour(true)}
            style={styles.iconBtn}>
            <Text style={styles.iconBtnText}> ?</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => navigation.navigate('TatConfig')}
            style={styles.iconBtn1}>
            <Text style={styles.iconBtnText}>⚙</Text>
          </TouchableOpacity>
          {getUserPrptype !== 'S' ? (
            <TouchableOpacity
              onPress={() => navigation.navigate('Settings')}
              style={styles.iconBtn2}>
              <Text style={styles.iconBtnText}>⚙</Text>
            </TouchableOpacity>
          ) : null}

          {isAuthorizer && getUserPrptype !== 'S' ? (
            <TouchableOpacity
              onPress={() => navigation.navigate('AuthQueue')}
              style={[styles.iconBtn3, pendingAuth > 0 && styles.iconBtnAlert]}>
              <Text style={styles.iconBtnText}>🔔</Text>
              {pendingAuth > 0 ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{pendingAuth}</Text>
                </View>
              ) : null}
            </TouchableOpacity>
          ) : null}

        </>
      )}
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
          onSubmitEditing={() => load(true, getUserPrptype, getUserRights)}
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
        {getUserRights[0]?.detachtds === "1" ? null : (<>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => navigation.navigate('InquiryForm')}
            style={styles.fab}>
            <Text style={styles.fabText}>+</Text>
          </TouchableOpacity>
        </>)}
      </View>
      <TourOverlay
        tourKey="dashboard"
        steps={DASHBOARD_TOUR}
        autoStart
        visible={showTour}
        onClose={() => setShowTour(false)}
        //  language="hi"
        language="en"
      />
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
    height: 35,
    width: 30,
    alignContent: 'center',
    textAlign: 'center',
    alignSelf: 'center',
    justifyContent: 'center',
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
  iconBtn2: {
    // padding: spacing.sm,
    // backgroundColor: colors.bgSecondary,
    // borderRadius: radius.md,
    position: 'absolute',
    top: 200,
    right: 2.5,
    zIndex: 10,
    backgroundColor: '#000',
    color: '#fff',
    borderRadius: 3,
    padding: 7,
  },
  iconBtn3: {
    // padding: spacing.sm,
    // backgroundColor: colors.bgSecondary,
    // borderRadius: radius.md,
    position: 'absolute',
    top: 250,
    right: 2.5,
    zIndex: 10,
    backgroundColor: theme.BRAND_GRADIENT_END,
    color: '#fff',
    borderRadius: 3,
    padding: 7,
  },
  iconBtn4: {
    // padding: spacing.sm,
    // backgroundColor: colors.bgSecondary,
    // borderRadius: radius.md,
    position: 'absolute',
    top: 250,
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
  partyName: { fontSize: fontSize.base, color: theme.BRAND_GRADIENT_END, marginBottom: 6 },
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
  notesPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.infoBg,
    borderLeftWidth: 3,
    borderLeftColor: colors.info,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  notesIcon: { fontSize: 16 },
  notesPreviewText: {
    fontSize: fontSize.sm,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  notesPreviewTime: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 1,
  },
  cardActions: {
    flexDirection: 'row',
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.xs,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.bgSecondary,
    borderRadius: radius.sm,
    gap: 4,
  },
  actionBtnDanger: {
    backgroundColor: colors.dangerBg,
  },
  actionIcon: { fontSize: 12 },
  actionText: {
    fontSize: fontSize.xs,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  iconBtnAlert: {
    backgroundColor: colors.warningBg,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: colors.danger,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: '500',
  },
});

export default DashboardScreen;
