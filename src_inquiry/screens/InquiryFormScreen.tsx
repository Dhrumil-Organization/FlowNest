import React, { useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { colors, fontSize, radius, spacing } from '../utils/theme';
import Input from '../components/Input';
import Button from '../components/Button';
import { inquiryApi } from '../services/inquiryApi';
import { Design, InquiryDesignInput, Party, RootStackParamList } from '../types';
import HeaderBarwithBack from '../../components/HeaderBarwithBack/HeaderBarwithBack';

type Props = NativeStackScreenProps<RootStackParamList, 'InquiryForm'>;

interface DesignRow extends InquiryDesignInput {
  _id: string; // local key
}

const emptyDesignRow = (id: string): DesignRow => ({
  _id: id,
  design_prp_code: null,
  design_dsn_code: null,
  is_new_design: false,
  design_name_snapshot: '',
  construction_remarks: '',
  quantity: 0,
  unit: 'mtr',
  gst_percent: 5,
});

const InquiryFormScreen: React.FC<Props> = ({ navigation, username }) => {
  const [party, setParty] = useState<Party | null>(null);
  const [remarks, setRemarks] = useState('');
  const [designs, setDesigns] = useState<DesignRow[]>([
    emptyDesignRow('d1'),
  ]);
  const [saving, setSaving] = useState(false);

  const pickParty = () => {
    navigation.navigate('PartySelection', {
      onSelect: p => {
        setParty(p);
      },
    });
  };

  const updateRow = (id: string, patch: Partial<DesignRow>) => {
    setDesigns(prev =>
      prev.map(d => (d._id === id ? { ...d, ...patch } : d)),
    );
  };

  const removeRow = (id: string) => {
    if (designs.length === 1) {
      Alert.alert('At least one design required');
      return;
    }
    setDesigns(prev => prev.filter(d => d._id !== id));
  };

  const addRow = () => {
    setDesigns(prev => [...prev, emptyDesignRow('d' + (prev.length + 1) + '_' + Date.now())]);
  };

  const pickExistingDesign = (rowId: string) => {
    navigation.navigate('DesignSelection', {
      onSelect: (d: Design) => {
        updateRow(rowId, {
          design_prp_code: d.prp_code,
          design_dsn_code: d.dsn_code,
          design_name_snapshot: d.name,
          is_new_design: false,
        });
      },
    });
  };

  const save = async () => {
    if (!party) {
      Alert.alert('Select Party', 'Please select a party first');
      return;
    }
    for (const d of designs) {
      if (!d.design_name_snapshot.trim()) {
        Alert.alert('Design name required', 'Please add a design name for each row');
        return;
      }
      if (d.is_new_design && !d.construction_remarks.trim()) {
        Alert.alert(
          'Construction details required',
          'Please add construction details for new designs',
        );
        return;
      }
      if (!d.quantity || d.quantity <= 0) {
        Alert.alert('Quantity required', 'Enter a valid quantity for each design');
        return;
      }
    }

    setSaving(true);
    try {
      const created = await inquiryApi.store({
        party_prp_code: party.prp_code,
        party_acc_code: party.acc_code,
        party_name_snapshot: party.name,
        party_gstin: party.gstin,
        party_address: party.address,
        remarks,
        prpcode: "SIP",
        yearno: "27",
        designs: designs.map(({ _id, ...rest }) => rest),
      });

      Alert.alert('Success', `Inquiry ${created.inquiry_no} created`, [
        {
          text: 'OK',
          onPress: () => {
            navigation.replace('InquiryDetail', { id: created.id });
          },
        },
      ]);
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message || 'Failed to save inquiry');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <HeaderBarwithBack
        userName={username}
        header={'Inquiries Form'}
        subHeader={'Enter your inquiries details'}
      />
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.bg }}
        contentContainerStyle={{ padding: spacing.md, paddingBottom: 40 }}>

        {/* Inquiry no/date info */}
        <View style={styles.infoBox}>
          <View>
            <Text style={styles.infoLabel}>Inquiry No.</Text>
            <Text style={styles.infoValue}>Auto Generated</Text>
          </View>
          <View>
            <Text style={styles.infoLabel}>Date</Text>
            <Text style={styles.infoValue}>
              {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
            </Text>
          </View>
        </View>

        {/* Party */}
        <Text style={styles.sectionLabel}>Party *</Text>
        <TouchableOpacity onPress={pickParty} style={styles.partyBox}>
          {party ? (
            <View>
              <Text style={styles.partyName}>{party.name}</Text>
              <Text style={styles.partyMeta}>
                {[party.city, party.state].filter(Boolean).join(', ')}
                {party.gstin ? ` • ${party.gstin}` : ''}
              </Text>
            </View>
          ) : (
            <Text style={styles.partyPlaceholder}>Tap to select party</Text>
          )}
        </TouchableOpacity>

        {/* Designs */}
        <Text style={[styles.sectionLabel, { marginTop: spacing.md }]}>
          Designs *
        </Text>

        {designs.map((row, idx) => (
          <View key={row._id} style={styles.designCard}>
            <View style={styles.designHead}>
              <Text style={styles.designLabel}>
                Design #{idx + 1}
                {row.is_new_design ? ' (New)' : ''}
              </Text>
              {designs.length > 1 ? (
                <TouchableOpacity onPress={() => removeRow(row._id)}>
                  <Text style={{ color: colors.danger, fontSize: fontSize.sm }}>Remove</Text>
                </TouchableOpacity>
              ) : null}
            </View>

            {/* Toggle existing/new */}
            <View style={styles.toggleRow}>
              <TouchableOpacity
                onPress={() => updateRow(row._id, {
                  is_new_design: false,
                  design_name_snapshot: '',
                  construction_remarks: '',
                  design_prp_code: null,
                  design_dsn_code: null,
                })}
                style={[
                  styles.toggleBtn,
                  !row.is_new_design && styles.toggleBtnActive,
                ]}>
                <Text style={[styles.toggleText, !row.is_new_design && styles.toggleTextActive]}>
                  Existing
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => updateRow(row._id, {
                  is_new_design: true,
                  design_name_snapshot: '',
                  construction_remarks: '',
                  design_prp_code: null,
                  design_dsn_code: null,
                })}
                style={[
                  styles.toggleBtn,
                  row.is_new_design && styles.toggleBtnActive,
                ]}>
                <Text style={[styles.toggleText, row.is_new_design && styles.toggleTextActive]}>
                  New Design
                </Text>
              </TouchableOpacity>
            </View>

            {/* Existing - searchable picker */}
            {!row.is_new_design ? (
              <TouchableOpacity
                style={styles.pickerBox}
                onPress={() => pickExistingDesign(row._id)}>
                <Text style={
                  row.design_name_snapshot
                    ? styles.pickerValue
                    : styles.pickerPlaceholder
                }>
                  {row.design_name_snapshot || 'Tap to select design'}
                </Text>
              </TouchableOpacity>
            ) : (
              <Input
                label="Design Name"
                required
                value={row.design_name_snapshot}
                onChangeText={t => updateRow(row._id, { design_name_snapshot: t })}
                placeholder="Enter design name"
              />
            )}

            <Input
              label="Construction / Remarks"
              value={row.construction_remarks}
              onChangeText={t => updateRow(row._id, { construction_remarks: t })}
              placeholder="Warp, weft, GSM, width, composition..."
              multiline
              required={row.is_new_design}
            />

            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <View style={{ flex: 1 }}>
                <Input
                  label="Quantity"
                  required
                  value={row.quantity ? String(row.quantity) : ''}
                  onChangeText={t =>
                    updateRow(row._id, { quantity: parseFloat(t) || 0 })
                  }
                  keyboardType="decimal-pad"
                  placeholder="5000"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Input
                  label="Unit"
                  value={row.unit}
                  onChangeText={t => updateRow(row._id, { unit: t })}
                  placeholder="mtr"
                />
              </View>
            </View>

            <Input
              label="GST %"
              value={String(row.gst_percent)}
              onChangeText={t => updateRow(row._id, { gst_percent: parseFloat(t) || 0 })}
              keyboardType="decimal-pad"
              placeholder="5"
            />
          </View>
        ))}

        <TouchableOpacity style={styles.addDesignBtn} onPress={addRow}>
          <Text style={styles.addDesignText}>+ Add Another Design</Text>
        </TouchableOpacity>

        <Input
          label="Inquiry Remarks (optional)"
          value={remarks}
          onChangeText={setRemarks}
          multiline
          placeholder="Any general note for this inquiry..."
        />

        <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }}>
          <Button
            title="Cancel"
            variant="secondary"
            onPress={() => navigation.goBack()}
            style={{ flex: 1 }}
          />
          <Button
            title="Save Inquiry"
            onPress={save}
            loading={saving}
            style={{ flex: 1 }}
          />
        </View>
      </ScrollView>
    </>
  );
};

const styles = StyleSheet.create({
  infoBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.bgSecondary,
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.md,
  },
  infoLabel: { fontSize: fontSize.xs, color: colors.textSecondary },
  infoValue: { fontSize: fontSize.md, fontWeight: '500', color: colors.textPrimary, marginTop: 2 },
  sectionLabel: {
    fontSize: fontSize.md,
    fontWeight: '500',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  partyBox: {
    padding: spacing.md,
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    minHeight: 56,
    justifyContent: 'center',
  },
  partyName: { fontSize: fontSize.base, fontWeight: '500' },
  partyMeta: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 2 },
  partyPlaceholder: { fontSize: fontSize.md, color: colors.textTertiary },

  designCard: {
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  designHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  designLabel: { fontSize: fontSize.md, fontWeight: '500', color: colors.textSecondary },
  toggleRow: { flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.md },
  toggleBtn: {
    flex: 1,
    paddingVertical: 8,
    backgroundColor: colors.bgSecondary,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  toggleBtnActive: { backgroundColor: colors.primary },
  toggleText: { fontSize: fontSize.sm, color: colors.textPrimary },
  toggleTextActive: { color: colors.textOnPrimary, fontWeight: '500' },
  pickerBox: {
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    marginBottom: spacing.md,
    minHeight: 44,
    justifyContent: 'center',
  },
  pickerValue: { fontSize: fontSize.base, color: colors.textPrimary },
  pickerPlaceholder: { fontSize: fontSize.md, color: colors.textTertiary },
  addDesignBtn: {
    padding: spacing.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.info,
    backgroundColor: colors.infoBg,
    borderRadius: radius.md,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  addDesignText: { color: colors.info, fontWeight: '500' },
});

export default InquiryFormScreen;
