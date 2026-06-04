import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  TouchableOpacity
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { colors, fontSize, radius, spacing } from '../utils/theme';
import { inquiryApi } from '../services/inquiryApi';
import { Inquiry, RootStackParamList } from '../types';
import Button from '../components/Button';
import { formatCurrency } from '../utils/validators';
import HeaderBarwithBack from '../../components/HeaderBarwithBack/HeaderBarwithBack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import theme from '../../android/app/src/theme';
import TourOverlay, { COSTING_TOUR } from '../components/TourOverlay';

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

const CostingScreen: React.FC<Props> = ({ route, navigation, username }) => {
  const { id } = route.params;
  const [inquiry, setInquiry] = useState<Inquiry | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [getUserPrptype, setUserPrptype] = useState<string>('');
  const [showTour, setShowTour] = useState(false);


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
  }, [id, getUserPrptype]);

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

        <View style={styles.switchBanner}>
          <View style={{ flex: 1 }}>
            <Text style={styles.switchTitle}>Need detailed cost breakdown?</Text>
            <Text style={styles.switchSubtitle}>
              Use the new Cost Sheet with greige rate, dyeing, overheads & GM%
            </Text>
          </View>
          <TouchableOpacity
            style={styles.switchBtn}
            onPress={() => {
              if (rows.length > 0) {
                navigation.replace('CostSheet', {
                  inquiryId: id,
                  designId: rows[0].inquiry_design_id,
                });
              }
            }}>
            <Text style={styles.switchBtnText}>Cost Sheet →</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.helpRow}>
          <TouchableOpacity
            onPress={() => setShowTour(true)}
            style={styles.helpBtn}>
            <Text style={styles.helpBtnText}>? Help</Text>
          </TouchableOpacity>
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
      <TourOverlay
        tourKey="costing"
        steps={COSTING_TOUR}
        visible={showTour}
        onClose={() => setShowTour(false)}
      />
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
  designName: { fontSize: fontSize.base, fontWeight: '500', color: theme.BRAND_GRADIENT_END },
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
  switchBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.infoBg,
    borderLeftWidth: 3,
    borderLeftColor: colors.info,
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  switchTitle: {
    fontSize: fontSize.sm,
    color: colors.info,
    fontWeight: '500',
    marginBottom: 2,
  },
  switchSubtitle: {
    fontSize: fontSize.xs,
    color: colors.info,
    opacity: 0.85,
  },
  switchBtn: {
    backgroundColor: colors.info,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.md,
  },
  switchBtnText: {
    color: colors.white,
    fontSize: fontSize.sm,
    fontWeight: '500',
  },
  helpRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: spacing.sm,
  },
  helpBtn: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 6,
    backgroundColor: colors.infoBg,
    borderRadius: radius.md,
  },
  helpBtnText: {
    fontSize: fontSize.sm,
    color: colors.info,
    fontWeight: '500',
  },

});

export default CostingScreen;
