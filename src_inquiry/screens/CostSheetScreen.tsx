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
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, fontSize, radius, spacing } from '../utils/theme';
import { CostSheet, RootStackParamList } from '../types';
import { costSheetApi } from '../services/costSheetApi';
import { inquiryApi } from '../services/inquiryApi';
import Button from '../components/Button';
import TourOverlay, { COSTING_TOUR } from '../components/TourOverlay';
import { formatCurrency } from '../utils/validators';
import { getCurrentFinancialYear } from '../../common/commonfunction';

type Props = NativeStackScreenProps<RootStackParamList, 'CostSheet'>;

type Tab = 'simple' | 'sheet';

const defaultSheet = (designId: number): CostSheet => ({
  inquiry_design_id: designId,
  greige_rate: 0,
  purchase: 0,
  brokerage: 0,
  freight: 0,
  dyeing_shortage_pct: 0,
  dyeing_shortage_amount: 0,
  dyeing_charge: 0,
  value_add: 0,
  packaging_charge: 0,
  overheads_exp: 0,
  hidden_cost_pct: 0,
  hidden_cost_amount: 0,
  sale_discount_pct: 0,
  sale_discount_amount: 0,
  sale_brokerage_pct: 0,
  sale_brokerage_amount: 0,
  total_cost: 0,
  sale_rate: 0,
  gross_margin_amount: 0,
  gross_margin_pct: 0,
  quantity_unit: 'KGS',
  auth_status: 'draft',
});

// Compute totals locally (mirror of backend formula)
const recompute = (s: CostSheet): CostSheet => {
  const dyeShort = +(s.greige_rate * (s.dyeing_shortage_pct / 100)).toFixed(2);
  const subtotal =
    +s.greige_rate +
    +s.purchase +
    +s.brokerage +
    +s.freight +
    dyeShort +
    +s.dyeing_charge +
    +s.value_add +
    +s.packaging_charge +
    +s.overheads_exp;

  const hidden = +(subtotal * (s.hidden_cost_pct / 100)).toFixed(2);
  const dis = +(s.sale_rate * (s.sale_discount_pct / 100)).toFixed(2);
  const sBrk = +(s.sale_rate * (s.sale_brokerage_pct / 100)).toFixed(2);

  const total = +(subtotal + hidden + dis + sBrk).toFixed(2);
  const gmAmt = +(s.sale_rate - total).toFixed(2);
  const gmPct = s.sale_rate > 0 ? +((gmAmt / s.sale_rate) * 100).toFixed(2) : 0;

  return {
    ...s,
    dyeing_shortage_amount: dyeShort,
    hidden_cost_amount: hidden,
    sale_discount_amount: dis,
    sale_brokerage_amount: sBrk,
    total_cost: total,
    gross_margin_amount: gmAmt,
    gross_margin_pct: gmPct,
  };
};

const CostSheetScreen: React.FC<Props> = ({ route, navigation }) => {
  const { inquiryId, designId } = route.params;
  const [tab, setTab] = useState<Tab>('simple');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showTour, setShowTour] = useState(false);

  // Simple costing tab state
  const [simpleRate, setSimpleRate] = useState('');
  const [simpleGst, setSimpleGst] = useState('5');

  // Cost sheet state
  const [sheet, setSheet] = useState<CostSheet>(defaultSheet(designId));
  const [designName, setDesignName] = useState('');
  // 
  const [getUserPrptype, setUserPrptype] = useState<string>('');


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
        const inq = await inquiryApi.show(inquiryId, getUserPrptype, getCurrentFinancialYear());
        const design = inq.designs?.find(d => d.id === designId);
        if (design) {
          setDesignName(design.design_name);
          if (design.cost_per_mtr) {
            setSimpleRate(String(design.cost_per_mtr));
            setSimpleGst(String(design.gst_percent));
          }
        }
        const existing = await costSheetApi.show(inquiryId, designId, getUserPrptype, getCurrentFinancialYear());
        if (existing) {
          setSheet(existing);
          setTab('sheet');
        }
      } catch (e) {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, [inquiryId, designId, getUserPrptype]);


  const updateSheet = (patch: Partial<CostSheet>) => {
    setSheet(prev => recompute({ ...prev, ...patch }));
  };

  const saveDraft = async (getUserPrptype) => {
    setSaving(true);
    try {
      const saved = await costSheetApi.saveDraft(inquiryId, designId, getUserPrptype, getCurrentFinancialYear(), sheet);
      setSheet(saved);
      // Alert.alert('Saved', 'Cost sheet saved as draft');
      Alert.alert('Saved', 'Cost sheet saved as draft', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const submitForAuth = async (getUserPrptype) => {
    if (!sheet.sale_rate || sheet.sale_rate <= 0) {
      Alert.alert('Missing', 'Please enter sale rate before submitting');
      return;
    }
    Alert.alert(
      'Submit for authorization?',
      `Total cost: ${formatCurrency(sheet.total_cost)}\nSale rate: ${formatCurrency(
        sheet.sale_rate,
      )}\nGM: ${sheet.gross_margin_pct}%\n\nOnce submitted, you cannot edit until approved or rejected.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Submit',
          onPress: async () => {
            setSubmitting(true);
            try {
              // Save first, then submit
              await costSheetApi.saveDraft(inquiryId, designId, getUserPrptype, getCurrentFinancialYear(), sheet);
              const submitted = await costSheetApi.submitForAuth(
                inquiryId,
                designId,
                getUserPrptype,
                getCurrentFinancialYear()
              );
              setSheet(submitted);
              Alert.alert('Submitted', 'Cost sheet sent for authorization', [
                { text: 'OK', onPress: () => navigation.goBack() },
              ]);
            } catch (e: any) {
              Alert.alert(
                'Error',
                e?.response?.data?.message || 'Failed to submit',
              );
            } finally {
              setSubmitting(false);
            }
          },
        },
      ],
    );
  };

  const submitSimple = async (getUserPrptype) => {
    const rate = parseFloat(simpleRate);
    if (!rate || rate <= 0) {
      Alert.alert('Missing', 'Enter a valid rate');
      return;
    }
    setSubmitting(true);
    try {
      await inquiryApi.submitCosting(inquiryId, getUserPrptype, getCurrentFinancialYear(), {
        costings: [
          {
            inquiry_design_id: designId,
            cost_per_mtr: rate,
            gst_percent: parseFloat(simpleGst) || 5,
          },
        ],
      });
      Alert.alert('Saved', 'Simple costing submitted', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message || 'Failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const readonly =
    sheet.auth_status === 'awaiting_auth' || sheet.auth_status === 'approved';

  return (
    <>
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.bg }}
        contentContainerStyle={{ padding: spacing.md, paddingBottom: 40 }}>

        {/* Header with help button */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.designName}>{designName}</Text>
            <Text style={styles.subText}>Costing</Text>
          </View>
          <TouchableOpacity
            onPress={() => setShowTour(true)}
            style={styles.helpBtn}>
            <Text style={styles.helpBtnText}>? Help</Text>
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>

          {getUserPrptype === 'S' ? (
            <TouchableOpacity
              onPress={() => setTab('simple')}
              style={[styles.tab, tab === 'simple' && styles.tabActive]}>
              <Text
                style={[styles.tabText, tab === 'simple' && styles.tabTextActive]}>
                Simple Costing
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={() => setTab('sheet')}
              style={[styles.tab, tab === 'sheet' && styles.tabActive]}>
              <Text
                style={[styles.tabText, tab === 'sheet' && styles.tabTextActive]}>
                Cost Sheet (New)
              </Text>
            </TouchableOpacity>
          )}

        </View>




        {/* Auth banner */}
        {sheet.auth_status === 'awaiting_auth' ? (
          <View style={styles.bannerWarn}>
            <Text style={styles.bannerWarnTitle}>⏳ Awaiting Authorization</Text>
            <Text style={styles.bannerWarnText}>
              This cost sheet has been submitted. You'll be notified once approved.
            </Text>
          </View>
        ) : null}
        {sheet.auth_status === 'approved' ? (
          <View style={styles.bannerSuccess}>
            <Text style={styles.bannerSuccessTitle}>✓ Approved</Text>
            <Text style={styles.bannerSuccessText}>
              Approved by {sheet.authorized_by_name || 'authorizer'}
            </Text>
          </View>
        ) : null}
        {sheet.auth_status === 'rejected' ? (
          <View style={styles.bannerDanger}>
            <Text style={styles.bannerDangerTitle}>
              ✗ Rejected: {sheet.rejection_reason}
            </Text>
            {sheet.rejection_remarks ? (
              <Text style={styles.bannerDangerText}>
                {sheet.rejection_remarks}
              </Text>
            ) : null}
            <Text style={styles.bannerDangerText}>
              Please review and resubmit.
            </Text>
          </View>
        ) : null}

        {/* TAB 1: Simple Costing */}
        {getUserPrptype === 'S' && tab === 'simple' ? (
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>Simple Rate Entry</Text>
            <Text style={styles.hint}>
              Just enter cost per unit + GST. Use this for quick quotations
              without detailed breakdown. No authorization needed.
            </Text>
            <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }}>
              <View style={{ flex: 2 }}>
                <Text style={styles.lbl}>Cost per unit *</Text>
                <TextInput
                  value={simpleRate}
                  onChangeText={setSimpleRate}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  placeholderTextColor={colors.textTertiary}
                  style={styles.input}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.lbl}>GST %</Text>
                <TextInput
                  value={simpleGst}
                  onChangeText={setSimpleGst}
                  keyboardType="decimal-pad"
                  placeholder="5"
                  placeholderTextColor={colors.textTertiary}
                  style={styles.input}
                />
              </View>
            </View>
            <Button
              title="Submit Simple Costing"
              onPress={() => submitSimple(getUserPrptype)}
              loading={submitting}
              style={{ marginTop: spacing.md }}
            />
          </View>
        ) : (
          /* TAB 2: Cost Sheet (New) */
          <>
            {/* Reference info */}
            <View style={styles.card}>
              <Text style={styles.sectionLabel}>Reference</Text>
              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                {/* <View style={{ flex: 1 }}>
                  <Text style={styles.lbl}>SO No</Text>
                  <TextInput
                    editable={!readonly}
                    value={sheet.so_no || ''}
                    onChangeText={t => updateSheet({ so_no: t })}
                    placeholder="1953"
                    placeholderTextColor={colors.textTertiary}
                    style={styles.input}
                  />
                </View> */}
                <View style={{ flex: 1 }}>
                  <Text style={styles.lbl}>Quantity ({sheet.quantity_unit})</Text>
                  <TextInput
                    editable={!readonly}
                    value={sheet.total_quantity ? String(sheet.total_quantity) : ''}
                    onChangeText={t =>
                      updateSheet({ total_quantity: parseFloat(t) || 0 })
                    }
                    keyboardType="decimal-pad"
                    placeholder="1000"
                    placeholderTextColor={colors.textTertiary}
                    style={styles.input}
                  />
                </View>
              </View>
              <Text style={[styles.lbl, { marginTop: spacing.sm }]}>Quality</Text>
              <TextInput
                editable={!readonly}
                value={sheet.quality || ''}
                onChangeText={t => updateSheet({ quality: t })}
                placeholder="PLAIN INTERLOK FULL DULL-200/62&quot;"
                placeholderTextColor={colors.textTertiary}
                style={styles.input}
              />

              <Text style={[styles.lbl, { marginTop: spacing.sm }]}>
                Knitter (from party master)
              </Text>
              <TextInput
                editable={!readonly}
                value={sheet.knitter_name || ''}
                onChangeText={t => updateSheet({ knitter_name: t })}
                placeholder="Tap and search party"
                placeholderTextColor={colors.textTertiary}
                style={styles.input}
              />

              <Text style={[styles.lbl, { marginTop: spacing.sm }]}>Mill name</Text>
              <TextInput
                editable={!readonly}
                value={sheet.mill_name || ''}
                onChangeText={t => updateSheet({ mill_name: t })}
                placeholder="LAXMINARAYAN IND ESTATE"
                placeholderTextColor={colors.textTertiary}
                style={styles.input}
              />

              <Text style={[styles.lbl, { marginTop: spacing.sm }]}>Shades dyed</Text>
              <TextInput
                editable={!readonly}
                value={sheet.shades_dyed || ''}
                onChangeText={t => updateSheet({ shades_dyed: t })}
                placeholder="Black, Navy Blue, Maroon..."
                placeholderTextColor={colors.textTertiary}
                style={styles.input}
              />
            </View>

            {/* Greige & Purchase */}
            <View style={styles.card}>
              <Text style={styles.sectionLabel}>Greige & Purchase</Text>
              <Row label="Greige rate" value={sheet.greige_rate}
                onChange={v => updateSheet({ greige_rate: v })} readonly={readonly} />
              <Row label="Purchase" value={sheet.purchase}
                onChange={v => updateSheet({ purchase: v })} readonly={readonly} />
              <Row label="Brokerage" value={sheet.brokerage}
                onChange={v => updateSheet({ brokerage: v })} readonly={readonly} />
              <Row label="Freight" value={sheet.freight}
                onChange={v => updateSheet({ freight: v })} readonly={readonly} last />
            </View>

            {/* Dyeing & Processing */}
            <View style={styles.card}>
              <Text style={styles.sectionLabel}>Dyeing & Processing</Text>
              <PctRow
                label="Dyeing shortage"
                pct={sheet.dyeing_shortage_pct}
                amount={sheet.dyeing_shortage_amount}
                onChange={v => updateSheet({ dyeing_shortage_pct: v })}
                readonly={readonly}
              />
              <Row label="Dyeing charge" value={sheet.dyeing_charge}
                onChange={v => updateSheet({ dyeing_charge: v })} readonly={readonly} />
              <Row label="Value add" value={sheet.value_add}
                onChange={v => updateSheet({ value_add: v })} readonly={readonly} />
              <Row label="Packaging charge" value={sheet.packaging_charge}
                onChange={v => updateSheet({ packaging_charge: v })} readonly={readonly} last />
            </View>

            {/* Overheads & Hidden */}
            <View style={styles.card}>
              <Text style={styles.sectionLabel}>Overheads & Hidden</Text>
              <Row label="Overheads" value={sheet.overheads_exp}
                onChange={v => updateSheet({ overheads_exp: v })} readonly={readonly} />
              <TextInput
                editable={!readonly}
                value={sheet.overheads_basis || ''}
                onChangeText={t => updateSheet({ overheads_basis: t })}
                placeholder="e.g., AS PER 35 TONS MONTHLY"
                placeholderTextColor={colors.textTertiary}
                style={[styles.input, { fontSize: fontSize.sm, marginBottom: spacing.sm }]}
              />
              <PctRow
                label="Hidden cost"
                pct={sheet.hidden_cost_pct}
                amount={sheet.hidden_cost_amount}
                onChange={v => updateSheet({ hidden_cost_pct: v })}
                readonly={readonly}
              />
              <PctRow
                label="Sale discount"
                pct={sheet.sale_discount_pct}
                amount={sheet.sale_discount_amount}
                onChange={v => updateSheet({ sale_discount_pct: v })}
                readonly={readonly}
                last
              />
            </View>

            {/* Sale */}
            <View style={styles.card}>
              <Text style={styles.sectionLabel}>Sale</Text>
              <PctRow
                label="Sale brokerage"
                pct={sheet.sale_brokerage_pct}
                amount={sheet.sale_brokerage_amount}
                onChange={v => updateSheet({ sale_brokerage_pct: v })}
                readonly={readonly}
              />
              <View style={[styles.summaryRow, { marginTop: spacing.sm }]}>
                <Text style={styles.summaryLabel}>Total cost</Text>
                <Text style={styles.summaryValue}>
                  {formatCurrency(sheet.total_cost)}
                </Text>
              </View>
              <Text style={[styles.lbl, { marginTop: spacing.sm }]}>
                Sale rate * (final selling price)
              </Text>
              <TextInput
                editable={!readonly}
                value={sheet.sale_rate ? String(sheet.sale_rate) : ''}
                onChangeText={t => updateSheet({ sale_rate: parseFloat(t) || 0 })}
                keyboardType="decimal-pad"
                placeholder="270"
                placeholderTextColor={colors.textTertiary}
                style={[styles.input, styles.inputBig]}
              />
            </View>

            {/* GM */}
            <View
              style={[
                styles.gmBox,
                sheet.gross_margin_pct < 5
                  ? styles.gmBoxLow
                  : sheet.gross_margin_pct < 10
                    ? styles.gmBoxMid
                    : styles.gmBoxGood,
              ]}>
              <View>
                <Text style={styles.gmLabel}>Gross margin</Text>
                <Text style={styles.gmAmount}>
                  {formatCurrency(sheet.gross_margin_amount)}
                </Text>
              </View>
              <Text style={styles.gmPct}>{sheet.gross_margin_pct}%</Text>
            </View>

            {/* Payment term */}
            <View style={styles.card}>
              <Text style={styles.sectionLabel}>Payment term</Text>
              <TextInput
                editable={!readonly}
                value={sheet.payment_term || ''}
                onChangeText={t => updateSheet({ payment_term: t })}
                placeholder="e.g., 30% advance, 70% on delivery"
                placeholderTextColor={colors.textTertiary}
                style={[styles.input, { minHeight: 60 }]}
                multiline
              />
              <Text style={[styles.lbl, { marginTop: spacing.sm }]}>Remarks</Text>
              <TextInput
                editable={!readonly}
                value={sheet.cost_remarks || ''}
                onChangeText={t => updateSheet({ cost_remarks: t })}
                placeholder="Any internal notes"
                placeholderTextColor={colors.textTertiary}
                style={[styles.input, { minHeight: 60 }]}
                multiline
              />
            </View>

            {/* Auth note */}
            {!readonly ? (
              <View style={styles.authNote}>
                <Text style={styles.authNoteText}>
                  ⚠ This cost sheet requires authorization before the inquiry
                  can move forward.
                </Text>
              </View>
            ) : null}

            {/* Actions */}
            {!readonly ? (
              <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }}>
                <Button
                  title="Save Draft"
                  variant="secondary"
                  onPress={() => saveDraft(getUserPrptype)}
                  loading={saving}
                  style={{ flex: 1 }}
                />
                <Button
                  title="Submit for Auth"
                  onPress={() => submitForAuth(getUserPrptype)}
                  loading={submitting}
                  style={{ flex: 2 }}
                />
              </View>
            ) : null}
          </>
        )}
      </ScrollView>

      <TourOverlay
        tourKey="costing"
        steps={COSTING_TOUR}
        visible={showTour}
        onClose={() => setShowTour(false)}
      />
    </>
  );
};

// --- Inline row components ---

interface RowProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
  readonly?: boolean;
  last?: boolean;
}

const Row: React.FC<RowProps> = ({ label, value, onChange, readonly, last }) => (
  <View
    style={[
      styles.kvRow,
      !last && { borderBottomWidth: 1, borderBottomColor: colors.border },
    ]}>
    <Text style={styles.kvLabel}>{label}</Text>
    <TextInput
      editable={!readonly}
      value={value ? String(value) : ''}
      onChangeText={t => onChange(parseFloat(t) || 0)}
      keyboardType="decimal-pad"
      placeholder="0"
      placeholderTextColor={colors.textTertiary}
      style={styles.kvInput}
    />
  </View>
);

interface PctRowProps {
  label: string;
  pct: number;
  amount: number;
  onChange: (v: number) => void;
  readonly?: boolean;
  last?: boolean;
}

const PctRow: React.FC<PctRowProps> = ({ label, pct, amount, onChange, readonly, last }) => (
  <View
    style={[
      styles.kvRow,
      !last && { borderBottomWidth: 1, borderBottomColor: colors.border },
    ]}>
    <View style={{ flex: 1 }}>
      <Text style={styles.kvLabel}>{label}</Text>
      <Text style={styles.kvSub}>{pct || 0}%</Text>
    </View>
    <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
      <TextInput
        editable={!readonly}
        value={pct ? String(pct) : ''}
        onChangeText={t => onChange(parseFloat(t) || 0)}
        keyboardType="decimal-pad"
        placeholder="%"
        placeholderTextColor={colors.textTertiary}
        style={[styles.kvInput, { width: 60 }]}
      />
      <Text style={styles.kvAmt}>{formatCurrency(amount)}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  designName: { fontSize: fontSize.lg, fontWeight: '500' },
  subText: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 2 },
  helpBtn: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 6,
    backgroundColor: colors.infoBg,
    borderRadius: radius.md,
  },
  helpBtnText: { fontSize: fontSize.sm, color: colors.info, fontWeight: '500' },
  tabs: {
    flexDirection: 'row',
    backgroundColor: colors.bgSecondary,
    borderRadius: radius.md,
    padding: 3,
    marginBottom: spacing.md,
  },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: radius.sm },
  tabActive: { backgroundColor: colors.cardBg },
  tabText: { fontSize: fontSize.sm, color: colors.textSecondary },
  tabTextActive: { color: colors.textPrimary, fontWeight: '500' },
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
  hint: { fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 18 },
  lbl: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginBottom: 3,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 9,
    fontSize: fontSize.base,
    color: colors.textPrimary,
    backgroundColor: colors.cardBg,
  },
  inputBig: { fontSize: fontSize.lg, fontWeight: '500', paddingVertical: 12 },
  kvRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  kvLabel: { fontSize: fontSize.sm, color: colors.textPrimary, flex: 1 },
  kvSub: { fontSize: 10, color: colors.textSecondary },
  kvInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: fontSize.sm,
    color: colors.textPrimary,
    textAlign: 'right',
    width: 100,
    backgroundColor: colors.cardBg,
  },
  kvAmt: {
    fontSize: fontSize.sm,
    color: colors.textPrimary,
    fontWeight: '500',
    minWidth: 80,
    textAlign: 'right',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 4,
    backgroundColor: colors.bgSecondary,
    borderRadius: radius.sm,
  },
  summaryLabel: { fontSize: fontSize.base, fontWeight: '500' },
  summaryValue: { fontSize: fontSize.base, fontWeight: '500' },
  gmBox: {
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  gmBoxGood: { backgroundColor: colors.successBg },
  gmBoxMid: { backgroundColor: colors.warningBg },
  gmBoxLow: { backgroundColor: colors.dangerBg },
  gmLabel: { fontSize: fontSize.sm, color: colors.textPrimary },
  gmAmount: { fontSize: fontSize.lg, fontWeight: '500' },
  gmPct: { fontSize: 28, fontWeight: '500' },
  authNote: {
    backgroundColor: colors.warningBg,
    borderLeftWidth: 3,
    borderLeftColor: colors.warning,
    padding: spacing.sm + 2,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
  },
  authNoteText: { fontSize: fontSize.sm, color: colors.warning },
  bannerWarn: {
    backgroundColor: colors.warningBg,
    borderLeftWidth: 3,
    borderLeftColor: colors.warning,
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.md,
  },
  bannerWarnTitle: { color: colors.warning, fontWeight: '500', marginBottom: 4 },
  bannerWarnText: { color: colors.warning, fontSize: fontSize.sm },
  bannerSuccess: {
    backgroundColor: colors.successBg,
    borderLeftWidth: 3,
    borderLeftColor: colors.success,
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.md,
  },
  bannerSuccessTitle: { color: colors.success, fontWeight: '500', marginBottom: 4 },
  bannerSuccessText: { color: colors.success, fontSize: fontSize.sm },
  bannerDanger: {
    backgroundColor: colors.dangerBg,
    borderLeftWidth: 3,
    borderLeftColor: colors.danger,
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.md,
  },
  bannerDangerTitle: { color: colors.danger, fontWeight: '500', marginBottom: 4 },
  bannerDangerText: { color: colors.danger, fontSize: fontSize.sm, marginTop: 2 },
});

export default CostSheetScreen;
