import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

import HeaderBarwithBack from '@/components/Header';
import theme from '@/components/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getCurrentFinancialYear } from '../../common/commonfunction';
import Button from '../components/Button';
import StatusBadge from '../components/StatusBadge';
import TatBadge from '../components/TatBadge';
import TatTimeline from '../components/TatTimeline';
import { costSheetApi } from '../services/costSheetApi';
import { inquiryApi } from '../services/inquiryApi';
import { masterApi } from '../services/masterApi';
import { CostSheet, InquiryDetailResponse, RootStackParamList } from '../types';
import { colors, fontSize, radius, spacing } from '../utils/theme';
import { formatCurrency, formatDate } from '../utils/validators';

type Props = NativeStackScreenProps<RootStackParamList, 'InquiryDetail'>;

const InquiryDetailScreen: React.FC<Props> = ({ route, navigation, username, getUserId }) => {
  // const { id } = route.params;
  const router = useRouter();
  const params = useLocalSearchParams();
  const id = params?.id;
  const [inquiry, setInquiry] = useState<InquiryDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [getUserPrptype, setUserPrptype] = useState<string>('');
  const [getUserRights, setUserRights] = useState([]);
  const [costSheets, setCostSheets] = useState<Record<number, CostSheet | null>>({});

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
    if (!inquiry?.designs) return;
    (async () => {
      const sheets: Record<number, CostSheet | null> = {};
      for (const design of inquiry.designs) {
        try {
          const sheet = await costSheetApi.show(inquiry.id, design.id, getUserPrptype, getCurrentFinancialYear());
          sheets[design.id] = sheet;
        } catch {
          sheets[design.id] = null;
        }
      }
      setCostSheets(sheets);
    })();
  }, [inquiry?.id, getUserPrptype]);

  const load = useCallback(async (getUserPrptype) => {
    try {
      const data = await inquiryApi.show(id, getUserPrptype, getCurrentFinancialYear(), {
        prptype: getUserPrptype,
        yearno: getCurrentFinancialYear()
      });
      setInquiry(data);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load(getUserPrptype);
    }, [load, getUserPrptype]),
  );

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
  }, [getUserId],
  );

  useEffect(() => {
    checkRightsAPI(true, getUserId);
  }, [getUserId]);

  const downloadPdf = async () => {
    if (!inquiry) return;
    try {
      const { pdf_url } = await inquiryApi.downloadPdf(inquiry.id, getUserPrptype, getCurrentFinancialYear());
      Linking.openURL(pdf_url);
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message || 'Failed to download PDF');
    }
  };

  if (loading || !inquiry) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const canCost = inquiry.status === 'pending_costing';
  const canSend = ['costed', 'sent'].includes(inquiry.status);
  const canClose = ['costed', 'sent'].includes(inquiry.status);

  const subTotal = (inquiry.designs ?? []).reduce(
    (s, d) => s + (d.amount || 0), 0,
  );
  const gstTotal = (inquiry.designs ?? []).reduce(
    (s, d) => s + (d.gst_amount || 0), 0,
  );
  const grandTotal = subTotal + gstTotal;

  return (
    <>
      <HeaderBarwithBack
        userName={username}
        header={'Inquiries Details'}
        subHeader={'Manage your inquiries details'}
        breadcrumb={'Inquiries Details'}
        SearchBar={false}
      />
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.bg }}
        contentContainerStyle={{ padding: spacing.md, paddingBottom: 40 }}>

        {/* Header */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.inqNo}>{inquiry.inquiry_no}</Text>
            <Text style={styles.date}>{formatDate(inquiry.inquiry_date)}</Text>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 4 }}>
            <StatusBadge status={inquiry.status} />
            {inquiry.tat.overall_status !== 'not_applicable' ? (
              <TatBadge status={inquiry.tat.overall_status} customLabel={`TAT: ${inquiry.tat.overall_status === 'on_time' ? 'On Time' : inquiry.tat.overall_status === 'warning' ? 'Warning' : 'Breached'}`} />
            ) : null}
          </View>
        </View>

        {/* TAT Timeline */}
        {inquiry.tat_live ? <TatTimeline tatLive={inquiry.tat_live} /> : null}

        {/* Party */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Party</Text>
          <Text style={styles.partyName}>{inquiry.party_name}</Text>
          {inquiry.party_address ? (
            <Text style={styles.meta}>{inquiry.party_address}</Text>
          ) : null}
          {inquiry.party_gstin ? (
            <Text style={styles.meta}>GSTIN: {inquiry.party_gstin}</Text>
          ) : null}
        </View>

        {/* Designs */}
        <Text style={styles.sectionLabel}>Designs ({inquiry.designs?.length ?? 0})</Text>
        {inquiry.designs?.map((d, idx) => (
          <View key={d.id} style={styles.designItem}>
            <View style={styles.designItemHead}>
              <Text style={styles.designName}>
                {idx + 1}. {d.design_name}
                {d.is_new_design ? ' (New)' : ''}
              </Text>
              {d.is_costed ? (
                <Text style={styles.costedBadge}>Costed</Text>
              ) : (
                <Text style={styles.pendingBadge}>Pending</Text>
              )}
            </View>
            {d.construction_remarks ? (
              <Text style={styles.construction}>{d.construction_remarks}</Text>
            ) : null}
            <View style={styles.row}>
              <Text style={styles.kv}>Qty: <Text style={styles.kvValue}>{d.quantity} {d.unit}</Text></Text>
              {d.cost_per_mtr !== null ? (
                <Text style={styles.kv}>Rate: <Text style={styles.kvValue}>{formatCurrency(d.cost_per_mtr)}</Text></Text>
              ) : null}
            </View>
            {d.is_costed ? (
              <View style={[styles.row, { marginTop: 4 }]}>
                <Text style={styles.kv}>GST: {d.gst_percent}%</Text>
                <Text style={[styles.kvValue, { fontWeight: '500' }]}>
                  {formatCurrency(d.total_amount)}
                </Text>
              </View>
            ) : null}
            {/*  */}
            {costSheets[d.id] ? (
              <View style={styles.costSheetBlock}>
                <View style={styles.csHead}>
                  <Text style={styles.csTitle}>Cost Sheet</Text>
                  {(() => {
                    const cs = costSheets[d.id]!;
                    if (cs.auth_status === 'awaiting_auth') {
                      return (
                        <View style={[styles.csPill, { backgroundColor: colors.warningBg }]}>
                          <Text style={[styles.csPillText, { color: colors.warning }]}>
                            Awaiting Auth
                          </Text>
                        </View>
                      );
                    }
                    if (cs.auth_status === 'approved') {
                      return (
                        <View style={[styles.csPill, { backgroundColor: colors.successBg }]}>
                          <Text style={[styles.csPillText, { color: colors.success }]}>
                            Approved
                          </Text>
                        </View>
                      );
                    }
                    if (cs.auth_status === 'rejected') {
                      return (
                        <View style={[styles.csPill, { backgroundColor: colors.dangerBg }]}>
                          <Text style={[styles.csPillText, { color: colors.danger }]}>
                            Rejected
                          </Text>
                        </View>
                      );
                    }
                    return (
                      <View style={[styles.csPill, { backgroundColor: colors.bgSecondary }]}>
                        <Text style={[styles.csPillText, { color: colors.textSecondary }]}>
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
                      {formatCurrency(costSheets[d.id]!.total_cost)}
                    </Text>
                  </View>
                  <View style={styles.csStat}>
                    <Text style={styles.csStatLabel}>Sale rate</Text>
                    <Text style={styles.csStatValue}>
                      {formatCurrency(costSheets[d.id]!.sale_rate)}
                    </Text>
                  </View>
                  <View style={styles.csStat}>
                    <Text style={styles.csStatLabel}>GM</Text>
                    <Text style={[
                      styles.csStatValue,
                      {
                        color: costSheets[d.id]!.gross_margin_pct < 5
                          ? colors.danger
                          : costSheets[d.id]!.gross_margin_pct < 10
                            ? colors.warning
                            : colors.success
                      }
                    ]}>
                      {costSheets[d.id]!.gross_margin_pct}%
                    </Text>
                  </View>
                </View>

                {costSheets[d.id]!.auth_status === 'rejected' && costSheets[d.id]!.rejection_reason ? (
                  <View style={styles.rejectBox}>
                    <Text style={styles.rejectTitle}>
                      Rejected: {costSheets[d.id]!.rejection_reason}
                    </Text>
                    {costSheets[d.id]!.rejection_remarks ? (
                      <Text style={styles.rejectText}>
                        {costSheets[d.id]!.rejection_remarks}
                      </Text>
                    ) : null}
                  </View>
                ) : null}

                <TouchableOpacity
                  style={styles.csOpenBtn}
                  // onPress={() => navigation.navigate('CostSheet', {
                  //   inquiryId: inquiry.id,
                  //   designId: d.id,
                  // })}
                  onPress={() => router.push({
                    pathname: '/CostSheet',
                    params: {
                      inquiryId: inquiry.id,
                      designId: d.id,
                    }
                  })}
                >
                  <Text style={styles.csOpenText}>
                    {costSheets[d.id]!.auth_status === 'awaiting_auth' || costSheets[d.id]!.auth_status === 'approved'
                      ? 'View Cost Sheet'
                      : 'Edit Cost Sheet'} →
                  </Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
        ))}

        {/* Totals */}
        {grandTotal > 0 ? (
          <View style={styles.totalsBox}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Sub Total</Text>
              <Text style={styles.totalValue}>{formatCurrency(subTotal)}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>GST</Text>
              <Text style={styles.totalValue}>{formatCurrency(gstTotal)}</Text>
            </View>
            <View style={[styles.totalRow, styles.grandTotalRow]}>
              <Text style={styles.grandLabel}>Grand Total</Text>
              <Text style={styles.grandValue}>{formatCurrency(grandTotal)}</Text>
            </View>
          </View>
        ) : null}

        {/* Sales order info if confirmed */}
        {inquiry.sales_order ? (
          <View style={[styles.section, { backgroundColor: colors.successBg, borderColor: colors.success }]}>
            <Text style={[styles.sectionLabel, { color: colors.success }]}>
              ✓ Converted to Sales Order
            </Text>
            <Text style={[styles.partyName, { color: colors.success }]}>
              {inquiry.sales_order.so_no}
            </Text>
            <Text style={[styles.meta, { color: colors.success }]}>
              {formatDate(inquiry.sales_order.so_date)} • {formatCurrency(inquiry.sales_order.grand_total)}
            </Text>
          </View>
        ) : null}

        {/* Rejection info */}
        {inquiry.rejection ? (
          <View style={[styles.section, { backgroundColor: colors.dangerBg, borderColor: colors.danger }]}>
            <Text style={[styles.sectionLabel, { color: colors.danger }]}>Rejected</Text>
            <Text style={[styles.partyName, { color: colors.danger }]}>
              {inquiry.rejection.reason}
            </Text>
            {inquiry.rejection.remarks ? (
              <Text style={[styles.meta, { color: colors.danger }]}>
                {inquiry.rejection.remarks}
              </Text>
            ) : null}
          </View>
        ) : null}

        {/* Action buttons */}
        <View style={{ marginTop: spacing.lg, gap: spacing.sm }}>
          {/* {getUserRights[0].assign === "1" || getUserRights[0].attachtds === "1" ? (
            null
          ) : (
            <>
              {canCost ? (
                <Button
                  title="Add Costing"
                  onPress={() => navigation.navigate('Costing', { id: inquiry.id })}
                />
              ) : null}
            </>
          )} */}
          <>
            {canCost ? (
              <Button
                title="Add Costing"
                // onPress={() => navigation.navigate('Costing', { id: inquiry.id })}
                // onPress={() => navigation.navigate('CostSheet', {
                //   inquiryId: inquiry.id,
                //   designId: inquiry.designs[0].id, // or pick the design from a picker
                // })}
                onPress={() =>
                  // navigation.navigate('CostSheetDesignPicker', { id: inquiry.id })
                  router.push({
                    pathname: '/CostSheetDesignPicker',
                    params: {
                      id: inquiry.id
                    }
                  })
                }
              />
            ) : null}
          </>


          {canSend ? (
            <>
              <Button
                title="Send Quotation to Party"
                onPress={() =>
                  // navigation.navigate('SendQuotation', { id: inquiry.id })
                  router.push({
                    pathname: '/SendQuotation',
                    params: {
                      id: inquiry.id
                    }
                  })
                }
              />
              <Button
                title="Download PDF"
                variant="outline"
                onPress={downloadPdf}
              />
            </>
          ) : null}

          {canClose ? (
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <Button
                title="Mark Confirmed"
                variant="secondary"
                onPress={() =>
                  // navigation.navigate('ConfirmInquiry', { id: inquiry.id })
                  router.push({
                    pathname: '/ConfirmInquiry',
                    params: {
                      id: inquiry.id
                    }
                  })
                }
                style={{ flex: 1 }}
              />
              <Button
                title="Mark Rejected"
                variant="danger"
                onPress={() =>
                  // navigation.navigate('RejectInquiry', { id: inquiry.id })
                  router.push({
                    pathname: '/RejectInquiry',
                    params: {
                      id: inquiry.id
                    }
                  })
                }
                style={{ flex: 1 }}
              />
            </View>
          ) : null}
        </View>
      </ScrollView>
    </>
  );
};

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  inqNo: { fontSize: fontSize.xl, fontWeight: '500', color: colors.textPrimary },
  date: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 2 },
  section: {
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  sectionLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    marginBottom: spacing.xs + 2,
    fontWeight: '500',
  },
  partyName: { fontSize: fontSize.base, fontWeight: '500', color: colors.textPrimary },
  meta: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 2 },
  designItem: {
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  designItemHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  designName: { fontSize: fontSize.base, fontWeight: '500', flex: 1, paddingRight: 8, color: theme.BRAND_GRADIENT_END },
  costedBadge: {
    fontSize: fontSize.xs,
    color: colors.success,
    backgroundColor: colors.successBg,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  pendingBadge: {
    fontSize: fontSize.xs,
    color: colors.warning,
    backgroundColor: colors.warningBg,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  construction: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginBottom: spacing.sm,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  kv: { fontSize: fontSize.sm, color: colors.textSecondary },
  kvValue: { color: colors.textPrimary },
  totalsBox: {
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  totalLabel: { fontSize: fontSize.sm, color: colors.textSecondary },
  totalValue: { fontSize: fontSize.sm, color: colors.textPrimary },
  grandTotalRow: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
    marginTop: spacing.xs,
  },
  grandLabel: { fontSize: fontSize.base, fontWeight: '500' },
  grandValue: { fontSize: fontSize.lg, fontWeight: '500' },
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
  csTitle: { fontSize: fontSize.sm, fontWeight: '500' },
  csPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  csPillText: { fontSize: fontSize.xs, fontWeight: '500' },
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
  csStatLabel: { fontSize: 10, color: colors.textSecondary },
  csStatValue: { fontSize: fontSize.sm, fontWeight: '500', marginTop: 2 },
  rejectBox: {
    backgroundColor: colors.dangerBg,
    padding: spacing.sm,
    borderRadius: radius.sm,
    marginBottom: spacing.sm,
  },
  rejectTitle: { fontSize: fontSize.xs, color: colors.danger, fontWeight: '500' },
  rejectText: { fontSize: fontSize.xs, color: colors.danger, marginTop: 2 },
  csOpenBtn: {
    paddingVertical: 8,
    alignItems: 'center',
    backgroundColor: colors.info,
    borderRadius: radius.sm,
  },
  csOpenText: { color: colors.white, fontSize: fontSize.sm, fontWeight: '500' },
});

export default InquiryDetailScreen;
