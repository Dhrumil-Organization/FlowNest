import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import HeaderBarwithBack from '@/components/Header';
import theme from '@/components/theme';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getCurrentFinancialYear } from '../../common/commonfunction';
import Button from '../components/Button';
import { costSheetApi } from '../services/costSheetApi';
import { inquiryApi } from '../services/inquiryApi';
import { CostSheet, Inquiry, RootStackParamList } from '../types';
import { colors, fontSize, radius, spacing } from '../utils/theme';
import { formatCurrency } from '../utils/validators';

type Props = NativeStackScreenProps<RootStackParamList, 'CostSheetDesignPicker'>;

// interface DesignWithStatus {
//   id: number;
//   design_name: string;
//   construction: string | null;
//   quantity: number;
//   unit: string;
//   costSheet: CostSheet | null;
//   shadesCount: number;
// }
interface DesignWithStatus {
  id: number;
  design_name: string;
  construction: string | null;
  quantity: number;
  unit: string;
  costSheet: CostSheet | null;
  shadesCount: number;

  isSimpleCosted?: boolean;
  costingMethod?: string;
  costPerMtr?: number | null;
}

const CostSheetDesignPickerScreen: React.FC<Props> = ({ route, navigation, username }) => {
  // const { id: inquiryId } = route.params;
  const router = useRouter();
  const params = useLocalSearchParams();
  const inquiryId = params?.id;
  const [inquiry, setInquiry] = useState<Inquiry | null>(null);
  const [designs, setDesigns] = useState<DesignWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [userPrptype, setUserPrptype] = useState<string>('');

  // useEffect(() => {
  //   AsyncStorage.getItem('user_prptype').then(v => setUserPrptype(v || ''));
  // }, []);
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

  const load = useCallback(async (userPrptype) => {
    if (!userPrptype) return;
    setLoading(true);
    try {
      const data = await inquiryApi.show(inquiryId, userPrptype, getCurrentFinancialYear(), {
        prptype: userPrptype,
        yearno: '27',
      });
      setInquiry(data);

      // Fetch each design's cost sheet status
      const designList: DesignWithStatus[] = [];
      for (const d of data.designs ?? []) {
        let sheet: CostSheet | null = null;
        try {
          sheet = await costSheetApi.show(inquiryId, d.id, userPrptype, getCurrentFinancialYear());
        } catch {
          // No cost sheet exists yet
        }
        // designList.push({
        //   id: d.id,
        //   design_name: d.design_name,
        //   construction: d.construction_remarks,
        //   quantity: d.quantity,
        //   unit: d.unit,
        //   costSheet: sheet,
        //   shadesCount: (d.shades || []).length,
        // });
        designList.push({
          id: d.id,
          design_name: d.design_name,
          construction: d.construction_remarks,
          quantity: d.quantity,
          unit: d.unit,
          costSheet: sheet,
          shadesCount: (d.shades || []).length,

          isSimpleCosted: d.is_costed,
          costingMethod: d.costing_method,
          costPerMtr: d.cost_per_mtr,
        });
      }
      setDesigns(designList);
    } finally {
      setLoading(false);
    }
  }, [inquiryId, userPrptype]);

  useFocusEffect(
    useCallback(() => {
      load(userPrptype);
    }, [load, userPrptype])
  );

  if (loading || !inquiry) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  // Counts
  const total = designs.length;
  // const completed = designs.filter(d => d.costSheet?.auth_status === 'approved').length;
  // const pending = designs.filter(d => !d.costSheet || d.costSheet?.auth_status === 'draft').length;
  // const awaiting = designs.filter(d => d.costSheet?.auth_status === 'awaiting_auth').length;
  // const rejected = designs.filter(d => d.costSheet?.auth_status === 'rejected').length;
  // 
  const completed = designs.filter(d =>
    d.costSheet?.auth_status === 'approved' ||
    (d.costingMethod === 'simple' && d.isSimpleCosted)
  ).length;

  const awaiting = designs.filter(
    d => d.costSheet?.auth_status === 'awaiting_auth'
  ).length;

  const rejected = designs.filter(
    d => d.costSheet?.auth_status === 'rejected'
  ).length;

  const pending = designs.filter(d => {
    const simpleDone =
      d.costingMethod === 'simple' &&
      d.isSimpleCosted;

    const sheetDone =
      d.costSheet?.auth_status === 'approved';

    const sheetAwaiting =
      d.costSheet?.auth_status === 'awaiting_auth';

    return !simpleDone && !sheetDone && !sheetAwaiting;
  }).length;

  // const statusInfo = (sheet: CostSheet | null) => {
  //   if (!sheet) {
  //     return { label: 'Not Started', bg: colors.bgSecondary, fg: colors.textSecondary, action: 'Start Cost' };
  //   }
  //   switch (sheet.auth_status) {
  //     case 'draft':
  //       return { label: 'Draft', bg: colors.bgSecondary, fg: colors.textSecondary, action: 'Continue Editing' };
  //     case 'awaiting_auth':
  //       return { label: 'Awaiting Auth', bg: colors.warningBg, fg: colors.warning, action: 'View' };
  //     case 'approved':
  //       return { label: 'Approved ✓', bg: colors.successBg, fg: colors.success, action: 'View' };
  //     case 'rejected':
  //       return { label: 'Rejected ✗', bg: colors.dangerBg, fg: colors.danger, action: 'Fix & Resubmit' };
  //     default:
  //       return { label: '-', bg: colors.bgSecondary, fg: colors.textSecondary, action: 'Open' };
  //   }
  // };
  const statusInfo = (design: DesignWithStatus) => {

    if (
      design.costingMethod === 'simple' &&
      design.isSimpleCosted
    ) {
      return {
        label: 'Completed ✓',
        bg: colors.successBg,
        fg: colors.success,
        action: 'View Costing',
      };
    }

    const sheet = design.costSheet;

    if (!sheet) {
      return {
        label: 'Not Started',
        bg: colors.bgSecondary,
        fg: colors.textSecondary,
        action: 'Start Cost',
      };
    }

    switch (sheet.auth_status) {
      case 'draft':
        return {
          label: 'Draft',
          bg: colors.bgSecondary,
          fg: colors.textSecondary,
          action: 'Continue Editing',
        };

      case 'awaiting_auth':
        return {
          label: 'Awaiting Auth',
          bg: colors.warningBg,
          fg: colors.warning,
          action: 'View',
        };

      case 'approved':
        return {
          label: 'Approved ✓',
          bg: colors.successBg,
          fg: colors.success,
          action: 'View',
        };

      case 'rejected':
        return {
          label: 'Rejected ✗',
          bg: colors.dangerBg,
          fg: colors.danger,
          action: 'Fix & Resubmit',
        };

      default:
        return {
          label: '-',
          bg: colors.bgSecondary,
          fg: colors.textSecondary,
          action: 'Open',
        };
    }
  };

  return (
    <>
      <HeaderBarwithBack
        userName={username}
        header={'Add Costing'}
        subHeader={'Fill cost sheet for each design'}
        breadcrumb={'Add Costing'}
        SearchBar={false}
      />
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.bg }}
        contentContainerStyle={{ padding: spacing.md, paddingBottom: 40 }}
      >
        {/* Inquiry header */}
        <View style={styles.header}>
          <Text style={styles.inqNo}>{inquiry.inquiry_no}</Text>
          <Text style={styles.party}>{inquiry.party_name}</Text>
        </View>

        {/* Progress strip */}
        <View style={styles.progressBox}>
          <View style={{ flex: 1 }}>
            <Text style={styles.progressTitle}>
              {completed} of {total} designs/items approved
            </Text>
            <Text style={styles.progressSub}>
              {pending > 0 ? `${pending} pending` : ''}
              {pending > 0 && awaiting > 0 ? ' • ' : ''}
              {awaiting > 0 ? `${awaiting} awaiting auth` : ''}
              {(pending > 0 || awaiting > 0) && rejected > 0 ? ' • ' : ''}
              {rejected > 0 ? `${rejected} rejected` : ''}
              {pending === 0 && awaiting === 0 && rejected === 0 ? 'All complete' : ''}
            </Text>
          </View>
          <View style={styles.progressCircle}>
            <Text style={styles.progressPct}>
              {total > 0 ? Math.round((completed / total) * 100) : 0}%
            </Text>
          </View>
        </View>

        {/* Help banner */}
        <View style={styles.helpBanner}>
          <Text style={styles.helpText}>
            💡 Each desig/item needs its own cost. Tap any design/item below to add or view its costing.
          </Text>
        </View>

        {/* Designs list */}
        {designs.map((d, idx) => {
          // const status = statusInfo(d.costSheet);
          const status = statusInfo(d);
          const isLocked =
            d.costSheet?.auth_status === 'awaiting_auth' ||
            d.costSheet?.auth_status === 'approved';

          return (
            <TouchableOpacity
              key={d.id}
              activeOpacity={0.7}
              style={styles.designCard}
              onPress={() =>
                // navigation.navigate('CostSheet', {
                //   inquiryId,
                //   designId: d.id,
                // })
                router.push({
                  pathname: '/CostSheet',
                  params: {
                    inquiryId: inquiryId,
                    designId: d.id,
                  }
                })
              }
            >
              {/* Header row */}
              <View style={styles.cardHead}>
                <View style={styles.designNumberBadge}>
                  <Text style={styles.designNumber}>{idx + 1}</Text>
                </View>
                <View style={{ flex: 1, marginLeft: spacing.sm }}>
                  <Text style={styles.designName}>{d.design_name}</Text>
                  <Text style={styles.designMeta}>
                    {d.quantity} {d.unit}
                    {d.shadesCount > 0 ? ` • ${d.shadesCount} shades` : ''}
                  </Text>
                </View>
                <View style={[styles.statusPill, { backgroundColor: status.bg }]}>
                  <Text style={[styles.statusText, { color: status.fg }]}>
                    {status.label}
                  </Text>
                </View>
              </View>

              {/* Construction line */}
              {d.construction ? (
                <Text style={styles.construction}>{d.construction}</Text>
              ) : null}

              {/* Cost summary if cost sheet exists */}
              {d.costSheet && d.costSheet.sale_rate > 0 ? (
                <>
                  {/* {!d.costSheet &&
                    d.costingMethod === 'simple' &&
                    d.isSimpleCosted ? (
                    <View style={styles.statsRow}>
                      <View style={styles.stat}>
                        <Text style={styles.statLabel}>Simple Cost</Text>
                        <Text style={styles.statValue}>
                          {formatCurrency(d.costPerMtr || 0)}
                        </Text>
                      </View>
                    </View>
                  ) : null} */}
                  <View style={styles.statsRow}>
                    <View style={styles.stat}>
                      <Text style={styles.statLabel}>Sale Rate</Text>
                      <Text style={styles.statValue}>
                        {formatCurrency(d.costSheet.sale_rate)}
                      </Text>
                    </View>
                    <View style={styles.stat}>
                      <Text style={styles.statLabel}>Total Cost</Text>
                      <Text style={styles.statValue}>
                        {formatCurrency(d.costSheet.total_cost)}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.stat,
                        {
                          backgroundColor:
                            d.costSheet.gross_margin_pct < 5
                              ? colors.dangerBg
                              : d.costSheet.gross_margin_pct < 10
                                ? colors.warningBg
                                : colors.successBg,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statLabel,
                          {
                            color:
                              d.costSheet.gross_margin_pct < 5
                                ? colors.danger
                                : d.costSheet.gross_margin_pct < 10
                                  ? colors.warning
                                  : colors.success,
                          },
                        ]}
                      >
                        GM
                      </Text>
                      <Text
                        style={[
                          styles.statValue,
                          {
                            color:
                              d.costSheet.gross_margin_pct < 5
                                ? colors.danger
                                : d.costSheet.gross_margin_pct < 10
                                  ? colors.warning
                                  : colors.success,
                          },
                        ]}
                      >
                        {d.costSheet.gross_margin_pct}%
                      </Text>
                    </View>
                  </View>
                </>
              ) : null}
              {!d.costSheet &&
                d.costingMethod === 'simple' &&
                d.isSimpleCosted ? (
                <View style={styles.statsRow}>
                  <View style={styles.stat}>
                    <Text style={styles.statLabel}>Simple Cost</Text>
                    <Text style={styles.statValue}>
                      {formatCurrency(d.costPerMtr || 0)}
                    </Text>
                  </View>
                </View>
              ) : null}

              {/* Rejection reason if rejected */}
              {d.costSheet?.auth_status === 'rejected' && d.costSheet?.rejection_reason ? (
                <View style={styles.rejectBox}>
                  <Text style={styles.rejectText}>
                    ⚠ Rejected: {d.costSheet.rejection_reason}
                  </Text>
                </View>
              ) : null}

              {/* Action hint */}
              <View style={styles.actionRow}>
                <Text style={styles.actionText}>{status.action} →</Text>
              </View>
            </TouchableOpacity>
          );
        })}

        {/* Bottom: Switch to Simple Costing */}
        {/* <View style={styles.switchBanner}>
          <View style={{ flex: 1 }}>
            <Text style={styles.switchTitle}>Want quick costing instead?</Text>
            <Text style={styles.switchSub}>
              Use Simple Costing — just enter cost per unit. No authorization needed.
            </Text>
          </View>
          <TouchableOpacity
            style={styles.switchBtn}
            onPress={() => navigation.navigate('Costing', { id: inquiryId })}
          >
            <Text style={styles.switchBtnText}>Simple →</Text>
          </TouchableOpacity>
        </View> */}

        {/* Done button - go back to inquiry */}
        {completed === total && total > 0 ? (
          <View style={styles.allDoneBox}>
            <Text style={styles.allDoneTitle}>✓ All designs/items costed</Text>
            <Text style={styles.allDoneText}>
              All cost sheets approved. You can now send the quotation to the party.
            </Text>
            <Button
              title="Back to Inquiry"
              onPress={() => router.back()}
              style={{ marginTop: spacing.sm }}
            />
          </View>
        ) : null}
      </ScrollView>
    </>
  );
};

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { marginBottom: spacing.md },
  inqNo: { fontSize: fontSize.lg, fontWeight: '500', color: theme.BRAND_GRADIENT_END },
  party: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 2 },

  progressBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  progressTitle: { fontSize: fontSize.base, fontWeight: '500', color: theme.BRAND_GRADIENT_END },
  progressSub: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 4 },
  progressCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.infoBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressPct: { fontSize: fontSize.md, fontWeight: '500', color: colors.info },

  helpBanner: {
    backgroundColor: colors.infoBg,
    borderRadius: radius.md,
    padding: spacing.sm + 2,
    marginBottom: spacing.md,
  },
  helpText: { fontSize: fontSize.xs, color: colors.info, lineHeight: 18 },

  designCard: {
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  designNumberBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.bgSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  designNumber: { fontSize: fontSize.sm, fontWeight: '500', color: colors.textPrimary },
  designName: { fontSize: fontSize.base, fontWeight: '500', color: theme.BRAND_GRADIENT_END },
  designMeta: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2 },
  statusPill: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  statusText: { fontSize: 10, fontWeight: '500' },
  construction: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginBottom: spacing.sm,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  stat: {
    flex: 1,
    backgroundColor: colors.bgSecondary,
    padding: spacing.sm,
    borderRadius: radius.sm,
    alignItems: 'center',
  },
  statLabel: { fontSize: 10, color: colors.textSecondary },
  statValue: { fontSize: fontSize.sm, fontWeight: '500', marginTop: 2 },
  rejectBox: {
    backgroundColor: colors.dangerBg,
    padding: 8,
    borderRadius: radius.sm,
    marginBottom: spacing.sm,
  },
  rejectText: { fontSize: fontSize.xs, color: colors.danger, fontWeight: '500' },
  actionRow: {
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    alignItems: 'flex-end',
  },
  actionText: { fontSize: fontSize.sm, color: colors.info, fontWeight: '500' },

  switchBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgSecondary,
    padding: spacing.md,
    borderRadius: radius.md,
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  switchTitle: { fontSize: fontSize.sm, fontWeight: '500', marginBottom: 2 },
  switchSub: { fontSize: fontSize.xs, color: colors.textSecondary, opacity: 0.85 },
  switchBtn: {
    backgroundColor: colors.textPrimary,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.md,
  },
  switchBtnText: { color: colors.white, fontSize: fontSize.sm, fontWeight: '500' },

  allDoneBox: {
    backgroundColor: colors.successBg,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  allDoneTitle: {
    fontSize: fontSize.md,
    fontWeight: '500',
    color: colors.success,
    marginBottom: 4,
  },
  allDoneText: { fontSize: fontSize.sm, color: colors.success },
});

export default CostSheetDesignPickerScreen;
