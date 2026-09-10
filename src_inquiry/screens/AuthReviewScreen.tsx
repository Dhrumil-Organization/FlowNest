import AppAlert from '@/common/utils/appAlert';
// export default AuthReviewScreen;
import AsyncStorage from '@/common/utils/compatibleStorage';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { getCurrentFinancialYear } from '../../common/commonfunction';
import Button from '../components/Button';
import { costSheetApi } from '../services/costSheetApi';
import { CostSheet, RootStackParamList } from '../types';
import { colors, fontSize, radius, spacing } from '../utils/theme';
import { formatCurrency } from '../utils/validators';

type Props = NativeStackScreenProps<RootStackParamList, 'AuthReview'>;

const REJECT_REASONS = [
  'Margin too low',
  'Pricing error',
  'Wrong knitter/mill',
  'Missing information',
  'Quality concerns',
  'Other',
];

const AuthReviewScreen: React.FC<Props> = ({ route, navigation }) => {
  const [getUserPrptype, setUserPrptype] = useState<string>('');
  // const { inquiryId, designId } = route.params;
  const router = useRouter();
  const params = useLocalSearchParams();
  const inquiryId = params?.inquiryId;
  const designId = params?.designId;
  const [sheet, setSheet] = useState<CostSheet | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectRemarks, setRejectRemarks] = useState('');

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
        const data = await costSheetApi.show(inquiryId, designId, getUserPrptype, getCurrentFinancialYear());
        setSheet(data);
      } finally {
        setLoading(false);
      }
    })();
  }, [inquiryId, designId, getUserPrptype]);

  const approve = (getUserPrptype) => {
    AppAlert.alert(
      'Approve this cost sheet?',
      `GM: ${sheet?.gross_margin_pct}% (${formatCurrency(
        sheet?.gross_margin_amount || 0,
      )})\n\nOnce approved, the inquiry will move to "Costed".`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: async () => {
            setProcessing(true);
            try {
              await costSheetApi.approve(inquiryId, designId, getUserPrptype, getCurrentFinancialYear());
              AppAlert.alert('Approved', 'Cost sheet approved successfully', [
                { text: 'OK', onPress: () => router.back() },
              ]);
            } catch (e: any) {
              AppAlert.alert('Error', e?.response?.data?.message || 'Failed');
            } finally {
              setProcessing(false);
            }
          },
        },
      ],
    );
  };

  const reject = async (getUserPrptype) => {
    if (!rejectReason) {
      AppAlert.alert('Select reason', 'Please select a rejection reason');
      return;
    }
    setProcessing(true);
    try {
      await costSheetApi.reject(inquiryId, designId, getUserPrptype, getCurrentFinancialYear(), {
        reason: rejectReason,
        remarks: rejectRemarks,
      });
      AppAlert.alert('Rejected', 'Cost sheet rejected. Costing person notified.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e: any) {
      AppAlert.alert('Error', e?.response?.data?.message || 'Failed');
    } finally {
      setProcessing(false);
    }
  };

  if (loading || !sheet) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const gmColor =
    sheet.gross_margin_pct < 5
      ? colors.danger
      : sheet.gross_margin_pct < 10
        ? colors.warning
        : colors.success;
  const gmBg =
    sheet.gross_margin_pct < 5
      ? colors.dangerBg
      : sheet.gross_margin_pct < 10
        ? colors.warningBg
        : colors.successBg;

  return (
    <>

      <ScrollView
        style={{ flex: 1, backgroundColor: colors.bg }}
        contentContainerStyle={{ padding: spacing.md, paddingBottom: 40, marginTop: 60 }}>
        <TouchableOpacity style={{ marginBottom: 10 }}
          onPress={()=> router.back()}
        >
          <Text style={{ color: '#000' }}>Back</Text>
        </TouchableOpacity>
        {/* GM headline */}
        <View style={[styles.gmHero, { backgroundColor: gmBg }]}>
          <View>
            <Text style={[styles.gmLabel, { color: gmColor }]}>Gross margin</Text>
            <Text style={[styles.gmAmt, { color: gmColor }]}>
              {formatCurrency(sheet.gross_margin_amount)}
            </Text>
          </View>
          <Text style={[styles.gmPct, { color: gmColor }]}>{sheet.gross_margin_pct}%</Text>
        </View>

        {/* Reference */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Reference</Text>
          <Kv k="SO No" v={sheet.so_no || '-'} />
          <Kv k="Quality" v={sheet.quality || '-'} />
          <Kv k="Quantity" v={`${sheet.total_quantity || 0} ${sheet.quantity_unit}`} />
          <Kv k="Knitter" v={sheet.knitter_name || '-'} />
          <Kv k="Mill" v={sheet.mill_name || '-'} />
          <Kv k="Shades" v={sheet.shades_dyed || '-'} last />
        </View>

        {/* Cost breakdown */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Greige & Purchase</Text>
          <KvAmount k="Greige rate" v={sheet.greige_rate} />
          <KvAmount k="Purchase" v={sheet.purchase} />
          <KvAmount k="Brokerage" v={sheet.brokerage} />
          <KvAmount k="Freight" v={sheet.freight} last />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Dyeing & Processing</Text>
          <KvAmount
            k={`Dyeing shortage (${sheet.dyeing_shortage_pct}%)`}
            v={sheet.dyeing_shortage_amount}
          />
          <KvAmount k="Dyeing charge" v={sheet.dyeing_charge} />
          <KvAmount k="Value add" v={sheet.value_add} />
          <KvAmount k="Packaging charge" v={sheet.packaging_charge} last />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Overheads & Hidden</Text>
          <KvAmount k="Overheads" v={sheet.overheads_exp} />
          {sheet.overheads_basis ? (
            <Text style={styles.basisText}>{sheet.overheads_basis}</Text>
          ) : null}
          <KvAmount
            k={`Hidden cost (${sheet.hidden_cost_pct}%)`}
            v={sheet.hidden_cost_amount}
          />
          <KvAmount
            k={`Sale discount (${sheet.sale_discount_pct}%)`}
            v={sheet.sale_discount_amount}
            last
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Sale</Text>
          <KvAmount
            k={`Sale brokerage (${sheet.sale_brokerage_pct}%)`}
            v={sheet.sale_brokerage_amount}
          />
          <View style={styles.bigRow}>
            <Text style={styles.bigLabel}>Total cost</Text>
            <Text style={styles.bigValue}>{formatCurrency(sheet.total_cost)}</Text>
          </View>
          <View style={[styles.bigRow, styles.bigRowAccent]}>
            <Text style={styles.bigLabel}>Sale rate</Text>
            <Text style={styles.bigValue}>{formatCurrency(sheet.sale_rate)}</Text>
          </View>
        </View>

        {/* Payment & notes */}
        {sheet.payment_term ? (
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>Payment term</Text>
            <Text style={styles.bodyText}>{sheet.payment_term}</Text>
          </View>
        ) : null}
        {sheet.cost_remarks ? (
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>Remarks</Text>
            <Text style={styles.bodyText}>{sheet.cost_remarks}</Text>
          </View>
        ) : null}

        {/* Auth actions */}
        {sheet.auth_status === 'awaiting_auth' && !showRejectForm ? (
          <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }}>
            <Button
              title="Reject"
              variant="danger"
              onPress={() => setShowRejectForm(true)}
              style={{ flex: 1 }}
            />
            <Button
              title="Approve"
              onPress={() => approve(getUserPrptype)}
              loading={processing}
              style={{ flex: 2 }}
            />
          </View>
        ) : null}

        {showRejectForm ? (
          <View style={styles.rejectCard}>
            <Text style={styles.sectionLabel}>Rejection reason *</Text>
            {REJECT_REASONS.map(r => (
              <TouchableOpacity
                key={r}
                onPress={() => setRejectReason(r)}
                style={[
                  styles.reasonRow,
                  rejectReason === r && styles.reasonActive,
                ]}>
                <View
                  style={[styles.radio, rejectReason === r && styles.radioOn]}
                />
                <Text style={styles.reasonText}>{r}</Text>
              </TouchableOpacity>
            ))}

            <Text style={[styles.sectionLabel, { marginTop: spacing.md }]}>
              Additional remarks
            </Text>
            <TextInput
              value={rejectRemarks}
              onChangeText={setRejectRemarks}
              multiline
              placeholder="Optional details for the costing person"
              placeholderTextColor={colors.textTertiary}
              style={styles.input}
            />

            <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }}>
              <Button
                title="Cancel"
                variant="secondary"
                onPress={() => setShowRejectForm(false)}
                style={{ flex: 1 }}
              />
              <Button
                title="Confirm Reject"
                variant="danger"
                onPress={() => reject(getUserPrptype)}
                loading={processing}
                style={{ flex: 2 }}
              />
            </View>
          </View>
        ) : null}
      </ScrollView>
    </>
  );
};

// Helper components
const Kv: React.FC<{ k: string; v: string; last?: boolean }> = ({ k, v, last }) => (
  <View
    style={[
      styles.kvRow,
      !last && { borderBottomWidth: 1, borderBottomColor: colors.border },
    ]}>
    <Text style={styles.kvK}>{k}</Text>
    <Text style={styles.kvV}>{v}</Text>
  </View>
);

const KvAmount: React.FC<{ k: string; v: number; last?: boolean }> = ({ k, v, last }) => (
  <View
    style={[
      styles.kvRow,
      !last && { borderBottomWidth: 1, borderBottomColor: colors.border },
    ]}>
    <Text style={styles.kvK}>{k}</Text>
    <Text style={styles.kvV}>{formatCurrency(v)}</Text>
  </View>
);

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  gmHero: {
    padding: spacing.lg,
    borderRadius: radius.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  gmLabel: { fontSize: fontSize.sm, fontWeight: '500' },
  gmAmt: { fontSize: fontSize.lg, fontWeight: '500' },
  gmPct: { fontSize: 36, fontWeight: '500' },
  card: {
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  sectionLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
    fontWeight: '500',
  },
  kvRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  kvK: { fontSize: fontSize.sm, color: colors.textSecondary, flex: 1 },
  kvV: { fontSize: fontSize.sm, color: colors.textPrimary, fontWeight: '500' },
  bigRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    marginTop: 4,
  },
  bigRowAccent: {
    backgroundColor: colors.bgSecondary,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
    marginTop: spacing.sm,
  },
  bigLabel: { fontSize: fontSize.base, fontWeight: '500' },
  bigValue: { fontSize: fontSize.lg, fontWeight: '500' },
  basisText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginTop: -4,
    marginBottom: 4,
  },
  bodyText: { fontSize: fontSize.sm, color: colors.textPrimary, lineHeight: 20 },
  rejectCard: {
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm + 2,
    borderRadius: radius.sm,
    marginBottom: 4,
    gap: spacing.sm,
  },
  reasonActive: { backgroundColor: colors.dangerBg },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: colors.borderStrong,
  },
  radioOn: { borderColor: colors.danger, backgroundColor: colors.danger },
  reasonText: { fontSize: fontSize.sm, color: colors.textPrimary },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: spacing.sm + 2,
    fontSize: fontSize.base,
    color: colors.textPrimary,
    minHeight: 80,
    backgroundColor: colors.cardBg,
  },
});

export default AuthReviewScreen;
