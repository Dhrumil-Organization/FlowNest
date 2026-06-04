// ============================================================
// PATCHES FOR src/screens/InquiryDetailScreen.tsx
// ============================================================
// Goal: Show cost sheet section with auth status banner and
//       "View Cost Sheet" button when design uses cost_sheet method.
// ============================================================

// ──────────────────────────────────────────────────────────
// 1) Add these imports at the top:
// ──────────────────────────────────────────────────────────
import {costSheetApi} from '../services/costSheetApi';
import {CostSheet} from '../types';

// ──────────────────────────────────────────────────────────
// 2) Add state for cost sheets per design:
// ──────────────────────────────────────────────────────────
const [costSheets, setCostSheets] = useState<Record<number, CostSheet | null>>({});

// ──────────────────────────────────────────────────────────
// 3) Load cost sheets after inquiry loads:
// ──────────────────────────────────────────────────────────
useEffect(() => {
  if (!inquiry?.designs) return;
  (async () => {
    const sheets: Record<number, CostSheet | null> = {};
    for (const design of inquiry.designs) {
      try {
        const sheet = await costSheetApi.show(inquiry.id, design.id);
        sheets[design.id] = sheet;
      } catch {
        sheets[design.id] = null;
      }
    }
    setCostSheets(sheets);
  })();
}, [inquiry?.id]);

// ──────────────────────────────────────────────────────────
// 4) For each design row in your designs list, add this
//    cost sheet section BELOW the design info:
// ──────────────────────────────────────────────────────────

{costSheets[design.id] ? (
  <View style={styles.costSheetBlock}>
    <View style={styles.csHead}>
      <Text style={styles.csTitle}>Cost Sheet</Text>
      {(() => {
        const cs = costSheets[design.id]!;
        if (cs.auth_status === 'awaiting_auth') {
          return (
            <View style={[styles.csPill, {backgroundColor: colors.warningBg}]}>
              <Text style={[styles.csPillText, {color: colors.warning}]}>
                Awaiting Auth
              </Text>
            </View>
          );
        }
        if (cs.auth_status === 'approved') {
          return (
            <View style={[styles.csPill, {backgroundColor: colors.successBg}]}>
              <Text style={[styles.csPillText, {color: colors.success}]}>
                Approved
              </Text>
            </View>
          );
        }
        if (cs.auth_status === 'rejected') {
          return (
            <View style={[styles.csPill, {backgroundColor: colors.dangerBg}]}>
              <Text style={[styles.csPillText, {color: colors.danger}]}>
                Rejected
              </Text>
            </View>
          );
        }
        return (
          <View style={[styles.csPill, {backgroundColor: colors.bgSecondary}]}>
            <Text style={[styles.csPillText, {color: colors.textSecondary}]}>
              Draft
            </Text>
          </View>
        );
      })()}
    </View>

    <View style={styles.csStats}>
      <View style={styles.csStat}>
        <Text style={styles.csStatLabel}>Total cost</Text>
        <Text style={styles.csStatValue}>
          {formatCurrency(costSheets[design.id]!.total_cost)}
        </Text>
      </View>
      <View style={styles.csStat}>
        <Text style={styles.csStatLabel}>Sale rate</Text>
        <Text style={styles.csStatValue}>
          {formatCurrency(costSheets[design.id]!.sale_rate)}
        </Text>
      </View>
      <View style={styles.csStat}>
        <Text style={styles.csStatLabel}>GM</Text>
        <Text style={[
          styles.csStatValue,
          {color: costSheets[design.id]!.gross_margin_pct < 5
            ? colors.danger
            : costSheets[design.id]!.gross_margin_pct < 10
            ? colors.warning
            : colors.success}
        ]}>
          {costSheets[design.id]!.gross_margin_pct}%
        </Text>
      </View>
    </View>

    {costSheets[design.id]!.auth_status === 'rejected' &&
     costSheets[design.id]!.rejection_reason ? (
      <View style={styles.rejectBox}>
        <Text style={styles.rejectTitle}>
          Rejected: {costSheets[design.id]!.rejection_reason}
        </Text>
        {costSheets[design.id]!.rejection_remarks ? (
          <Text style={styles.rejectText}>
            {costSheets[design.id]!.rejection_remarks}
          </Text>
        ) : null}
      </View>
    ) : null}

    <TouchableOpacity
      style={styles.csOpenBtn}
      onPress={() => navigation.navigate('CostSheet', {
        inquiryId: inquiry.id,
        designId: design.id,
      })}>
      <Text style={styles.csOpenText}>
        {costSheets[design.id]!.auth_status === 'awaiting_auth' ||
         costSheets[design.id]!.auth_status === 'approved'
          ? 'View Cost Sheet'
          : 'Edit Cost Sheet'} →
      </Text>
    </TouchableOpacity>
  </View>
) : null}

// ──────────────────────────────────────────────────────────
// 5) Styles to add:
// ──────────────────────────────────────────────────────────
  costSheetBlock: {
    backgroundColor: colors.bgSecondary,
    borderRadius: radius.md,
    padding: spacing.sm + 2,
    marginTop: spacing.sm,
  },
  csHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  csTitle: {fontSize: fontSize.sm, fontWeight: '500'},
  csPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  csPillText: {fontSize: fontSize.xs, fontWeight: '500'},
  csStats: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  csStat: {
    flex: 1,
    backgroundColor: colors.cardBg,
    padding: spacing.sm,
    borderRadius: radius.sm,
    alignItems: 'center',
  },
  csStatLabel: {fontSize: 10, color: colors.textSecondary},
  csStatValue: {fontSize: fontSize.sm, fontWeight: '500', marginTop: 2},
  rejectBox: {
    backgroundColor: colors.dangerBg,
    padding: spacing.sm,
    borderRadius: radius.sm,
    marginBottom: spacing.sm,
  },
  rejectTitle: {fontSize: fontSize.xs, color: colors.danger, fontWeight: '500'},
  rejectText: {fontSize: fontSize.xs, color: colors.danger, marginTop: 2},
  csOpenBtn: {
    paddingVertical: 8,
    alignItems: 'center',
    backgroundColor: colors.info,
    borderRadius: radius.sm,
  },
  csOpenText: {color: colors.white, fontSize: fontSize.sm, fontWeight: '500'},
