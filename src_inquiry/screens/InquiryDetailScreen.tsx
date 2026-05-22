import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Linking,
  Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';

import { colors, fontSize, radius, spacing } from '../utils/theme';
import { inquiryApi } from '../services/inquiryApi';
import { InquiryDetailResponse, RootStackParamList } from '../types';
import StatusBadge from '../components/StatusBadge';
import TatBadge from '../components/TatBadge';
import HeaderBarwithBack from '../../components/HeaderBarwithBack/HeaderBarwithBack';
import TatTimeline from '../components/TatTimeline';
import Button from '../components/Button';
import { formatCurrency, formatDate } from '../utils/validators';

type Props = NativeStackScreenProps<RootStackParamList, 'InquiryDetail'>;

const InquiryDetailScreen: React.FC<Props> = ({ route, navigation, username }) => {
  const { id } = route.params;
  const [inquiry, setInquiry] = useState<InquiryDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await inquiryApi.show(id, {
        prpcode: "SIP",
        yearno: "27"
      });
      setInquiry(data);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const downloadPdf = async () => {
    if (!inquiry) return;
    try {
      const { pdf_url } = await inquiryApi.downloadPdf(inquiry.id, "SIP", "27");
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
          {canCost ? (
            <Button
              title="Add Costing"
              onPress={() => navigation.navigate('Costing', { id: inquiry.id })}
            />
          ) : null}

          {canSend ? (
            <>
              <Button
                title="Send Quotation to Party"
                onPress={() => navigation.navigate('SendQuotation', { id: inquiry.id })}
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
                onPress={() => navigation.navigate('ConfirmInquiry', { id: inquiry.id })}
                style={{ flex: 1 }}
              />
              <Button
                title="Mark Rejected"
                variant="danger"
                onPress={() => navigation.navigate('RejectInquiry', { id: inquiry.id })}
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
  designName: { fontSize: fontSize.base, fontWeight: '500', flex: 1, paddingRight: 8 },
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
});

export default InquiryDetailScreen;
