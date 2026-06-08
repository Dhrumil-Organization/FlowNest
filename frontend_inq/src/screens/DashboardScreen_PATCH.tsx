// ============================================================
// REPLACE your existing renderItem in DashboardScreen.tsx
// with the version below.
// ============================================================
// Make sure these are imported at the top of the file:
//
//   import { Alert } from 'react-native';
//   import { inquiryApi } from '../services/inquiryApi';
//
// Add this helper just above the component function:

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

  return d.toLocaleDateString('en-IN', {day: '2-digit', month: 'short'});
};

// ============================================================
// REPLACEMENT renderItem - includes notes icon + preview + edit/delete
// ============================================================

const handleDelete = (item: Inquiry) => {
  Alert.alert(
    'Delete Inquiry?',
    `Are you sure you want to delete ${item.inquiry_no}? This cannot be undone.`,
    [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await inquiryApi.delete(item.id);
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

const renderItem = ({item}: {item: Inquiry}) => {
  const isEditable = item.can_edit ?? (item.status === 'pending_costing');
  const isDeletable = item.can_delete ?? (item.status === 'pending_costing');

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      style={styles.card}
      onPress={() => navigation.navigate('InquiryDetail', {id: item.id})}>
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
          <View style={{flex: 1}}>
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
              navigation.navigate('InquiryForm', {inquiryId: item.id});
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
            <Text style={[styles.actionText, {color: colors.danger}]}>
              Delete
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </TouchableOpacity>
  );
};

// ============================================================
// ADD THESE STYLES to your styles StyleSheet.create({...})
// ============================================================

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
  notesIcon: {fontSize: 16},
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
  actionIcon: {fontSize: 12},
  actionText: {
    fontSize: fontSize.xs,
    color: colors.textPrimary,
    fontWeight: '500',
  },
