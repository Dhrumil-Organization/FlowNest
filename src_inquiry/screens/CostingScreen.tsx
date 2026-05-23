import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { colors, fontSize, radius, spacing } from '../utils/theme';
import { inquiryApi } from '../services/inquiryApi';
import { Inquiry, RootStackParamList } from '../types';
import Button from '../components/Button';
import { formatCurrency } from '../utils/validators';
import HeaderBarwithBack from '../../components/HeaderBarwithBack/HeaderBarwithBack';

type Props = NativeStackScreenProps<RootStackParamList, 'Costing'>;

interface Row {
  inquiry_design_id: number;
  design_name: string;
  construction: string | null;
  quantity: number;
  unit: string;
  cost_per_mtr: string;
  gst_percent: string;
}

const CostingScreen: React.FC<Props> = ({ route, navigation, username, getUserPrptype }) => {
  const { id } = route.params;
  const [inquiry, setInquiry] = useState<Inquiry | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await inquiryApi.show(id, {
        prptype: getUserPrptype,
        yearno: "27"
      });
      setInquiry(data);
      setRows(
        (data.designs ?? []).map(d => ({
          inquiry_design_id: d.id,
          design_name: d.design_name,
          construction: d.construction_remarks,
          quantity: d.quantity,
          unit: d.unit,
          cost_per_mtr: d.cost_per_mtr !== null ? String(d.cost_per_mtr) : '',
          gst_percent: String(d.gst_percent),
        })),
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const updateRow = (idx: number, patch: Partial<Row>) => {
    setRows(prev => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  };

  const save = async () => {
    for (const r of rows) {
      if (!r.cost_per_mtr || parseFloat(r.cost_per_mtr) <= 0) {
        Alert.alert('Cost required', `Enter cost for "${r.design_name}"`);
        return;
      }
    }
    setSaving(true);
    try {
      await inquiryApi.submitCosting(id, {
        costings: rows.map(r => ({
          inquiry_design_id: r.inquiry_design_id,
          cost_per_mtr: parseFloat(r.cost_per_mtr),
          gst_percent: parseFloat(r.gst_percent) || 5,
        })),
        prptype: getUserPrptype,
        yearno: "27"
      });
      Alert.alert('Success', 'Costing saved', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message || 'Failed to save costing');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !inquiry) {
    return (
      <View style={[styles.center]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <>
      <HeaderBarwithBack
        userName={username}
        header={'Costing'}
        subHeader={'Manage your Costing details'}
      />
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.bg }}
        contentContainerStyle={{ padding: spacing.md, paddingBottom: 40 }}>

        <View style={styles.header}>
          <Text style={styles.inqNo}>{inquiry.inquiry_no}</Text>
          <Text style={styles.party}>{inquiry.party_name}</Text>
        </View>

        {rows.map((row, idx) => {
          const cost = parseFloat(row.cost_per_mtr) || 0;
          const gst = parseFloat(row.gst_percent) || 0;
          const amount = row.quantity * cost;
          const gstAmt = amount * (gst / 100);
          const total = amount + gstAmt;

          return (
            <View key={row.inquiry_design_id} style={styles.card}>
              <Text style={styles.designName}>{row.design_name}</Text>
              <Text style={styles.meta}>
                {row.quantity} {row.unit}
              </Text>
              {row.construction ? (
                <Text style={styles.construction}>{row.construction}</Text>
              ) : null}

              <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm }}>
                <View style={{ flex: 2 }}>
                  <Text style={styles.label}>Cost per {row.unit} *</Text>
                  <TextInput
                    value={row.cost_per_mtr}
                    onChangeText={t => updateRow(idx, { cost_per_mtr: t })}
                    keyboardType="decimal-pad"
                    placeholder="0.00"
                    placeholderTextColor={colors.textTertiary}
                    style={styles.input}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>GST %</Text>
                  <TextInput
                    value={row.gst_percent}
                    onChangeText={t => updateRow(idx, { gst_percent: t })}
                    keyboardType="decimal-pad"
                    placeholder="5"
                    placeholderTextColor={colors.textTertiary}
                    style={styles.input}
                  />
                </View>
              </View>

              {cost > 0 ? (
                <View style={styles.preview}>
                  <Text style={styles.previewLabel}>Total (with GST)</Text>
                  <Text style={styles.previewValue}>{formatCurrency(total)}</Text>
                </View>
              ) : null}
            </View>
          );
        })}

        <Button
          title="Submit Costing"
          onPress={save}
          loading={saving}
          style={{ marginTop: spacing.md }}
        />
      </ScrollView>
    </>
  );
};

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { marginBottom: spacing.md },
  inqNo: { fontSize: fontSize.lg, fontWeight: '500' },
  party: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 2 },
  card: {
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  designName: { fontSize: fontSize.base, fontWeight: '500' },
  meta: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2 },
  construction: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginTop: spacing.xs,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    marginBottom: 4,
    color: colors.textPrimary,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: fontSize.base,
    color: colors.textPrimary,
    backgroundColor: colors.cardBg,
  },
  preview: {
    backgroundColor: colors.successBg,
    padding: spacing.sm + 2,
    borderRadius: radius.md,
    marginTop: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  previewLabel: { fontSize: fontSize.sm, color: colors.success, fontWeight: '500' },
  previewValue: { fontSize: fontSize.lg, color: colors.success, fontWeight: '500' },
});

export default CostingScreen;
