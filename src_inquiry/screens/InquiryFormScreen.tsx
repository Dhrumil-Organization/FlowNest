import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
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
import AsyncStorage from '@react-native-async-storage/async-storage';
import theme from '../../android/app/src/theme';

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

const InquiryFormScreen: React.FC<Props> = ({ route, navigation, username }) => {
  const [party, setParty] = useState<Party | null>(null);
  const [remarks, setRemarks] = useState('');
  const [getUserPrptype, setUserPrptype] = useState<string>('');
  const [designs, setDesigns] = useState<DesignRow[]>([
    emptyDesignRow('d1'),
  ]);
  const [saving, setSaving] = useState(false);
  const inquiryId = route.params?.inquiryId || null;
  const isEditMode = !!inquiryId;
  const [loadingExisting, setLoadingExisting] = useState(isEditMode);

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
    if (!isEditMode) return;

    (async () => {
      try {
        const existing = await inquiryApi.show(inquiryId!, { prptype: getUserPrptype, yearno: '27' });

        // Guard: if it's no longer editable, bounce back
        if (existing.status !== 'pending_costing') {
          Alert.alert(
            'Cannot Edit',
            'This inquiry can no longer be edited because it has been costed.',
            [{ text: 'OK', onPress: () => navigation.goBack() }],
          );
          return;
        }

        // Pre-fill the form with existing data
        setParty({
          prp_code: existing.party_prp_code,
          acc_code: existing.party_acc_code,
          name: existing.party_name,
          address: existing.party_address || '',
          gstin: existing.party_gstin || '',
        });
        setRemarks(existing.remarks || '');

        setDesigns(
          (existing.designs || []).map((d, idx) => ({
            _id: `d_${idx}_${d.id}`,
            design_prp_code: d.design_prp_code,
            design_dsn_code: d.design_dsn_code,
            is_new_design: d.is_new_design,
            design_name_snapshot: d.design_name,
            construction_remarks: d.construction_remarks || '',
            quantity: d.quantity,
            unit: d.unit,
            gst_percent: d.gst_percent,
            expected_delivery_date: d.expected_delivery_date || undefined,
          })),
        );
      } catch (e: any) {
        // Alert.alert('Error', 'Failed to load inquiry');
        console.error('Failed to load inquiry', e);
        // navigation.goBack();
      } finally {
        setLoadingExisting(false);
      }
    })();
  }, [inquiryId, isEditMode, navigation, getUserPrptype]);

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
        Alert.alert(` ${getUserPrptype === 'S' ? 'Design name required, Please add a design' : 'Item name required, Please add a item'} name for each row`);
        return;
      }
      if (d.is_new_design && !d.construction_remarks.trim()) {
        Alert.alert(
          'Construction details required',
          `Please add construction details for new ${getUserPrptype === 'S' ? 'designs' : 'items'}`,
        );
        return;
      }
      if (!d.quantity || d.quantity <= 0) {
        Alert.alert(`Quantity required', 'Enter a valid quantity for each ${getUserPrptype === 'S' ? 'design' : 'item'}`);
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
        prptype: getUserPrptype,
        yearno: "27",
        designs: designs.map(({ _id, ...rest }) => rest),
      });

      const payload = {
        party_prp_code: party.prp_code,
        party_acc_code: party.acc_code,
        party_name_snapshot: party.name,
        party_gstin: party.gstin,
        party_address: party.address,
        remarks,
        prptype: getUserPrptype,
        yearno: "27",
        designs: designs.map(({ _id, ...rest }) => rest),
      };

      // Alert.alert('Success', `Inquiry ${created.inquiry_no} created`, [
      //   {
      //     text: 'OK',
      //     onPress: () => {
      //       navigation.replace('InquiryDetail', { id: created.id });
      //     },
      //   },
      // ]);
      if (isEditMode) {
        const updated = await inquiryApi.update(inquiryId!, payload);
        Alert.alert('Success', `Inquiry ${updated.inquiry_no} updated`, [
          {
            text: 'OK',
            onPress: () => {
              navigation.goBack();
            },
          },
        ]);
      } else {
        const created = await inquiryApi.store(payload);
        Alert.alert('Success', `Inquiry ${created.inquiry_no} created`, [
          {
            text: 'OK',
            onPress: () => {
              navigation.replace('InquiryDetail', { id: created.id });
            },
          },
        ]);
      }
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message || 'Failed to save inquiry');
    } finally {
      setSaving(false);
    }
  };

  if (loadingExisting) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

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
          {getUserPrptype === 'S' ? 'Designs *' : ' Items *'}
        </Text>

        {designs.map((row, idx) => (
          <View key={row._id} style={styles.designCard}>
            <View style={styles.designHead}>
              <Text style={styles.designLabel}>
                {getUserPrptype === 'S' ? `Design #${idx + 1}` : `Items #${idx + 1}`}
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
                  {getUserPrptype === 'S' ? 'New Design' : 'New Item'}
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
                  {getUserPrptype === 'S' ? `${row.design_name_snapshot || 'Tap to select design'}` : `${row.design_name_snapshot || 'Tap to select item'}`}

                </Text>
              </TouchableOpacity>
            ) : (
              <>
                {getUserPrptype === 'S' ? (
                  <Input
                    label="Design Name"
                    style={styles.pickerValue}
                    required
                    value={row.design_name_snapshot}
                    onChangeText={t => updateRow(row._id, { design_name_snapshot: t })}
                    placeholder="Enter design name"
                  />

                ) : (
                  <Input
                    label="Item Name"
                    style={styles.pickerValue}
                    required
                    value={row.design_name_snapshot}
                    onChangeText={t => updateRow(row._id, { design_name_snapshot: t })}
                    placeholder="Enter item name"
                  />

                )}
              </>
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
          <Text style={styles.addDesignText}>{getUserPrptype === 'S' ? '+ Add Another Design' : '+ Add Another Item'}</Text>
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
            title={isEditMode ? 'Update Inquiry' : 'Save Inquiry'}
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
  partyName: { fontSize: fontSize.base, fontWeight: '500', color: theme.BRAND_GRADIENT_END },
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
  pickerValue: { fontSize: fontSize.base, color: theme.BRAND_GRADIENT_END },
  pickerPlaceholder: { fontSize: fontSize.md, color: theme.BRAND_GRADIENT_END },
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
/**
 * InquiryFormScreen.tsx  (UPDATED)
 * ─────────────────────────────────────────────────────
 * Changes vs original:
 *  1. Har DesignRow mein ab fabric_type aur shades[] hain.
 *  2. Design select hone ke baad → Fabric Type chips (Cotton / Poly / Blended / etc.)
 *  3. Fabric type select hone ke baad → Shades section (shade name + quantity per shade)
 *  4. One-time tour overlay (INQUIRY_FORM_TOUR)
 */

// import React, { useEffect, useState } from 'react';
// import {
//   ActivityIndicator,
//   Alert,
//   ScrollView,
//   StyleSheet,
//   Text,
//   TouchableOpacity,
//   View,
// } from 'react-native';
// import { NativeStackScreenProps } from '@react-navigation/native-stack';

// import { colors, fontSize, radius, spacing } from '../utils/theme';
// import Input from '../components/Input';
// import Button from '../components/Button';
// import { inquiryApi } from '../services/inquiryApi';
// import { Design, InquiryDesignInput, Party, RootStackParamList } from '../types';
// import HeaderBarwithBack from '../../components/HeaderBarwithBack/HeaderBarwithBack';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import theme from '../../android/app/src/theme';
// import TourOverlay, { INQUIRY_FORM_TOUR } from '../components/TourOverlay';
// import DatePickerInput from '../components/DatePickerInput';

// type Props = NativeStackScreenProps<RootStackParamList, 'InquiryForm'>;

// // ── Fabric Type options ───────────────────────────────────────────────────────
// const FABRIC_TYPES = [
//   { label: 'Cotton', value: 'Cotton' },
//   { label: 'Poly', value: 'Poly' },
//   { label: 'Blended', value: 'Blended' },
//   { label: 'Linen', value: 'Linen' },
//   { label: 'Silk', value: 'Silk' },
//   { label: 'Wool', value: 'Wool' },
//   { label: 'Other', value: 'Other' },
// ];

// // ── Shade row ─────────────────────────────────────────────────────────────────
// export interface ShadeInput {
//   _sid: string;
//   shade_name: string;
//   quantity: number;
//   rate: number;        // price per unit
//   lineTotal: number;   // quantity * rate (auto-calculated)
// }

// const emptyShade = (sid: string): ShadeInput => ({
//   _sid: sid,
//   shade_name: '',
//   quantity: 0,
//   rate: 0,
//   lineTotal: 0,
// });;

// // ── Design row ────────────────────────────────────────────────────────────────
// interface DesignRow extends InquiryDesignInput {
//   _id: string;
//   fabric_type: string;
//   shades: ShadeInput[];
//   expected_delivery_date?: string;  // add this
// }

// const emptyDesignRow = (id: string): DesignRow => ({
//   _id: id,
//   design_prp_code: null,
//   design_dsn_code: null,
//   is_new_design: false,
//   design_name_snapshot: '',
//   construction_remarks: '',
//   quantity: 0,
//   unit: 'mtr',
//   gst_percent: 5,
//   fabric_type: '',
//   shades: [emptyShade('s1')],
//   expected_delivery_date: '',
// });

// // ── Component ─────────────────────────────────────────────────────────────────
// const InquiryFormScreen: React.FC<Props> = ({ route, navigation, username }) => {
//   const [party, setParty] = useState<Party | null>(null);
//   const [remarks, setRemarks] = useState('');
//   const [getUserPrptype, setUserPrptype] = useState<string>('');
//   const [designs, setDesigns] = useState<DesignRow[]>([emptyDesignRow('d1')]);
//   const [saving, setSaving] = useState(false);
//   const inquiryId = route.params?.inquiryId || null;
//   const isEditMode = !!inquiryId;
//   const [loadingExisting, setLoadingExisting] = useState(isEditMode);

//   // ── Init ──────────────────────────────────────────────────────────────────
//   useEffect(() => {
//     (async () => {
//       try {
//         const user_prptype = await AsyncStorage.getItem('user_prptype');
//         setUserPrptype(user_prptype ?? '');
//       } catch (e) { }
//     })();
//   }, []);

//   useEffect(() => {
//     if (!isEditMode) return;
//     (async () => {
//       try {
//         const existing = await inquiryApi.show(inquiryId!, {
//           prptype: getUserPrptype,
//           yearno: '27',
//         });
//         if (existing.status !== 'pending_costing') {
//           Alert.alert('Cannot Edit', 'This inquiry can no longer be edited.', [
//             { text: 'OK', onPress: () => navigation.goBack() },
//           ]);
//           return;
//         }
//         setParty({
//           prp_code: existing.party_prp_code,
//           acc_code: existing.party_acc_code,
//           name: existing.party_name,
//           address: existing.party_address || '',
//           gstin: existing.party_gstin || '',
//         });
//         setRemarks(existing.remarks || '');
//         setDesigns(
//           (existing.designs || []).map((d, idx) => ({
//             _id: `d_${idx}_${d.id}`,
//             design_prp_code: d.design_prp_code,
//             design_dsn_code: d.design_dsn_code,
//             is_new_design: d.is_new_design,
//             design_name_snapshot: d.design_name,
//             construction_remarks: d.construction_remarks || '',
//             quantity: d.quantity,
//             unit: d.unit,
//             gst_percent: d.gst_percent,
//             expected_delivery_date: d.expected_delivery_date || undefined,
//             fabric_type: (d as any).fabric_type || '',
//             shades: ((d as any).shades || [emptyShade('s1')]).map((s: any, si: number) => ({
//               _sid: `s${si}_${d.id}`,
//               shade_name: s.shade_name || '',
//               quantity: s.quantity || 0,
//             })),
//           })),
//         );
//       } catch (e) {
//         console.error('Failed to load inquiry', e);
//       } finally {
//         setLoadingExisting(false);
//       }
//     })();
//   }, [inquiryId, isEditMode, navigation, getUserPrptype]);

//   // ── Helpers ───────────────────────────────────────────────────────────────
//   const updateRow = (id: string, patch: Partial<DesignRow>) =>
//     setDesigns(prev => prev.map(d => (d._id === id ? { ...d, ...patch } : d)));

//   const removeRow = (id: string) => {
//     if (designs.length === 1) {
//       Alert.alert('At least one design required');
//       return;
//     }
//     setDesigns(prev => prev.filter(d => d._id !== id));
//   };

//   const addRow = () =>
//     setDesigns(prev => [
//       ...prev,
//       emptyDesignRow('d' + (prev.length + 1) + '_' + Date.now()),
//     ]);

//   const pickExistingDesign = (rowId: string) => {
//     navigation.navigate('DesignSelection', {
//       onSelect: (d: Design) => {
//         updateRow(rowId, {
//           design_prp_code: d.prp_code,
//           design_dsn_code: d.dsn_code,
//           design_name_snapshot: d.name,
//           is_new_design: false,
//         });
//       },
//     });
//   };

//   // Shade helpers
//   const addShade = (rowId: string) =>
//     setDesigns(prev =>
//       prev.map(d =>
//         d._id === rowId
//           ? {
//             ...d,
//             shades: [
//               ...d.shades,
//               emptyShade('s' + (d.shades.length + 1) + '_' + Date.now()),
//             ],
//           }
//           : d,
//       ),
//     );

//   const updateShade = (rowId: string, sid: string, patch: Partial<ShadeInput>) => {
//     setDesigns(prev =>
//       prev.map(d => {
//         if (d._id !== rowId) return d;
//         const newShades = d.shades.map(s => {
//           if (s._sid !== sid) return s;
//           const updated = { ...s, ...patch };
//           // Auto-calculate lineTotal
//           updated.lineTotal = (updated.quantity || 0) * (updated.rate || 0);
//           return updated;
//         });
//         return { ...d, shades: newShades };
//       })
//     );
//   };

//   const removeShade = (rowId: string, sid: string) =>
//     setDesigns(prev =>
//       prev.map(d => {
//         if (d._id !== rowId) return d;
//         if (d.shades.length === 1) {
//           Alert.alert('At least one shade required');
//           return d;
//         }
//         return { ...d, shades: d.shades.filter(s => s._sid !== sid) };
//       }),
//     );

//   // ── Save ───────────────────────────────────────────────────────────────────
//   const save = async () => {
//     if (!party) {
//       Alert.alert('Select Party', 'Please select a party first');
//       return;
//     }
//     for (const d of designs) {
//       if (!d.design_name_snapshot.trim()) {
//         Alert.alert(
//           getUserPrptype === 'S'
//             ? 'Design name required'
//             : 'Item name required',
//           'Please add a name for each row',
//         );
//         return;
//       }
//       if (!d.fabric_type) {
//         Alert.alert('Fabric Type Required', `Please select fabric type for "${d.design_name_snapshot}"`);
//         return;
//       }
//       if (d.is_new_design && !d.construction_remarks.trim()) {
//         Alert.alert('Construction details required', 'Please add details for new designs');
//         return;
//       }
//       for (const s of d.shades) {
//         if (!s.shade_name.trim()) {
//           Alert.alert('Shade name required', `Please fill all shade names for "${d.design_name_snapshot}"`);
//           return;
//         }
//         if (!s.quantity || s.quantity <= 0) {
//           Alert.alert('Shade quantity required', `Enter quantity for shade "${s.shade_name}"`);
//           return;
//         }
//       }
//       // total quantity = sum of shades
//       const totalQty = d.shades.reduce((acc, s) => acc + (s.quantity || 0), 0);
//       if (totalQty <= 0) {
//         Alert.alert('Quantity required', `Enter quantity for shades of "${d.design_name_snapshot}"`);
//         return;
//       }
//     }

//     setSaving(true);
//     try {
//       const payload = {
//         party_prp_code: party.prp_code,
//         party_acc_code: party.acc_code,
//         party_name_snapshot: party.name,
//         party_gstin: party.gstin,
//         party_address: party.address,
//         remarks,
//         prptype: getUserPrptype,
//         yearno: '27',
//         designs: designs.map(({ _id, shades, fabric_type, ...rest }) => ({
//           ...rest,
//           fabric_type,
//           quantity: shades.reduce((acc, s) => acc + (s.quantity || 0), 0),
//           shades: shades.map(({ _sid, ...s }) => s),
//         })),
//       };

//       if (isEditMode) {
//         const updated = await inquiryApi.update(inquiryId!, payload as any);
//         Alert.alert('Success', `Inquiry ${updated.inquiry_no} updated`, [
//           { text: 'OK', onPress: () => navigation.goBack() },
//         ]);
//       } else {
//         const created = await inquiryApi.store(payload as any);
//         Alert.alert('Success', `Inquiry ${created.inquiry_no} created`, [
//           { text: 'OK', onPress: () => navigation.replace('InquiryDetail', { id: created.id }) },
//         ]);
//       }
//     } catch (e: any) {
//       Alert.alert('Error', e?.response?.data?.message || 'Failed to save inquiry');
//     } finally {
//       setSaving(false);
//     }
//   };

//   // ── Loading state ──────────────────────────────────────────────────────────
//   if (loadingExisting) {
//     return (
//       <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
//         <ActivityIndicator color={colors.primary} />
//       </View>
//     );
//   }

//   const designLabel = getUserPrptype === 'S' ? 'Design' : 'Item';

//   // ── Render ─────────────────────────────────────────────────────────────────
//   return (
//     <>
//       {/* One-time tour */}
//       <TourOverlay tourKey="inquiry_form" steps={INQUIRY_FORM_TOUR} />

//       <HeaderBarwithBack
//         userName={username}
//         header="Inquiries Form"
//         subHeader="Enter your inquiries details"
//       />
//       <ScrollView
//         style={{ flex: 1, backgroundColor: colors.bg }}
//         contentContainerStyle={{ padding: spacing.md, paddingBottom: 40 }}>

//         {/* ── Inquiry info box ────────────────────────────────────────────── */}
//         <View style={styles.infoBox}>
//           <View>
//             <Text style={styles.infoLabel}>Inquiry No.</Text>
//             <Text style={styles.infoValue}>Auto Generated</Text>
//           </View>
//           <View>
//             <Text style={styles.infoLabel}>Date</Text>
//             <Text style={styles.infoValue}>
//               {new Date().toLocaleDateString('en-IN', {
//                 day: '2-digit',
//                 month: 'short',
//                 year: 'numeric',
//               })}
//             </Text>
//           </View>
//         </View>

//         {/* ── Party ────────────────────────────────────────────────────────── */}
//         <Text style={styles.sectionLabel}>Party *</Text>
//         <TouchableOpacity
//           onPress={() =>
//             navigation.navigate('PartySelection', { onSelect: p => setParty(p) })
//           }
//           style={styles.partyBox}>
//           {party ? (
//             <View>
//               <Text style={styles.partyName}>{party.name}</Text>
//               <Text style={styles.partyMeta}>
//                 {[party.city, party.state].filter(Boolean).join(', ')}
//                 {party.gstin ? ` • ${party.gstin}` : ''}
//               </Text>
//             </View>
//           ) : (
//             <Text style={styles.partyPlaceholder}>Tap to select party</Text>
//           )}
//         </TouchableOpacity>

//         {/* ── Designs ──────────────────────────────────────────────────────── */}
//         <Text style={[styles.sectionLabel, { marginTop: spacing.md }]}>
//           {getUserPrptype === 'S' ? 'Designs *' : 'Items *'}
//         </Text>

//         {designs.map((row, idx) => (
//           <View key={row._id} style={styles.designCard}>
//             {/* Header row */}
//             <View style={styles.designHead}>
//               <Text style={styles.designLabel}>
//                 {`${designLabel} #${idx + 1}`}
//                 {row.is_new_design ? ' (New)' : ''}
//               </Text>
//               {designs.length > 1 ? (
//                 <TouchableOpacity onPress={() => removeRow(row._id)}>
//                   <Text style={{ color: colors.danger, fontSize: fontSize.sm }}>
//                     Remove
//                   </Text>
//                 </TouchableOpacity>
//               ) : null}
//             </View>

//             {/* ── Existing / New toggle ─────────────────────────────────── */}
//             <View style={styles.toggleRow}>
//               <TouchableOpacity
//                 onPress={() =>
//                   updateRow(row._id, {
//                     is_new_design: false,
//                     design_name_snapshot: '',
//                     construction_remarks: '',
//                     design_prp_code: null,
//                     design_dsn_code: null,
//                   })
//                 }
//                 style={[styles.toggleBtn, !row.is_new_design && styles.toggleBtnActive]}>
//                 <Text style={[styles.toggleText, !row.is_new_design && styles.toggleTextActive]}>
//                   Existing
//                 </Text>
//               </TouchableOpacity>
//               <TouchableOpacity
//                 onPress={() =>
//                   updateRow(row._id, {
//                     is_new_design: true,
//                     design_name_snapshot: '',
//                     construction_remarks: '',
//                     design_prp_code: null,
//                     design_dsn_code: null,
//                   })
//                 }
//                 style={[styles.toggleBtn, row.is_new_design && styles.toggleBtnActive]}>
//                 <Text style={[styles.toggleText, row.is_new_design && styles.toggleTextActive]}>
//                   {getUserPrptype === 'S' ? 'New Design' : 'New Item'}
//                 </Text>
//               </TouchableOpacity>
//             </View>

//             {/* ── Design picker / name input ─────────────────────────────── */}
//             {!row.is_new_design ? (
//               <TouchableOpacity
//                 style={styles.pickerBox}
//                 onPress={() => pickExistingDesign(row._id)}>
//                 <Text
//                   style={
//                     row.design_name_snapshot ? styles.pickerValue : styles.pickerPlaceholder
//                   }>
//                   {getUserPrptype === 'S'
//                     ? row.design_name_snapshot || 'Tap to select design'
//                     : row.design_name_snapshot || 'Tap to select item'}
//                 </Text>
//               </TouchableOpacity>
//             ) : (
//               <Input
//                 label={getUserPrptype === 'S' ? 'Design Name' : 'Item Name'}
//                 required
//                 value={row.design_name_snapshot}
//                 onChangeText={t => updateRow(row._id, { design_name_snapshot: t })}
//                 placeholder={
//                   getUserPrptype === 'S' ? 'Enter design name' : 'Enter item name'
//                 }
//               />
//             )}

//             <Input
//               label="Construction / Remarks"
//               value={row.construction_remarks}
//               onChangeText={t => updateRow(row._id, { construction_remarks: t })}
//               placeholder="Warp, weft, GSM, width, composition..."
//               multiline
//               required={row.is_new_design}
//             />

//             {/* ── Fabric Type ───────────────────────────────────────────── */}
//             <Text style={styles.subSectionLabel}>Fabric Type *</Text>
//             <View style={styles.chipRow}>
//               {FABRIC_TYPES.map(ft => {
//                 const selected = row.fabric_type === ft.value;
//                 return (
//                   <TouchableOpacity
//                     key={ft.value}
//                     onPress={() => updateRow(row._id, { fabric_type: ft.value })}
//                     style={[styles.chip, selected && styles.chipSelected]}>
//                     <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
//                       {ft.label}
//                     </Text>
//                   </TouchableOpacity>
//                 );
//               })}
//             </View>

//             {/* Expected Delivery Date */}
//             {/* <Input
//               label="Expected Delivery Date"
//               value={row.expected_delivery_date || ''}
//               onChangeText={t => updateRow(row._id, { expected_delivery_date: t })}
//               placeholder="DD/MM/YYYY"
//             /> */}

//             <DatePickerInput
//               label="Expected Delivery Date"
//               value={row.expected_delivery_date || ''}
//               onChange={(date) => updateRow(row._id, { expected_delivery_date: date })}
//               placeholder="DD/MM/YYYY"
//             />

//             {/* Design Total Amount (auto-calculated) */}
//             <View style={styles.designTotalBox}>
//               <Text style={styles.designTotalLabel}>Design Total Amount:</Text>
//               <Text style={styles.designTotalValue}>
//                 ₹{row.shades.reduce((sum, s) => sum + (s.lineTotal || 0), 0).toFixed(2)}
//               </Text>
//             </View>

//             {/* ── Shades — shown only after fabric type is selected ──────── */}
//             {row.fabric_type ? (
//               <View style={styles.shadesSection}>
//                 <View style={styles.shadesSectionHead}>
//                   <Text style={styles.subSectionLabel}>Shades *</Text>
//                   <Text style={styles.fabricTypeBadge}>{row.fabric_type}</Text>
//                 </View>

//                 {row.shades.map((shade, si) => (
//                   <View key={shade._sid} style={styles.shadeRow}>
//                     <View style={styles.shadeIndexBadge}>
//                       <Text style={styles.shadeIndexText}>{si + 1}</Text>
//                     </View>

//                     <View style={styles.shadeNameWrapper}>
//                       <TouchableOpacity
//                         style={styles.shadePicker}
//                         onPress={() => {
//                           navigation.navigate('ShadeSelection', {
//                             onSelect: (selected) => {
//                               updateShade(row._id, shade._sid, { shade_name: selected.name });
//                             },
//                           });
//                         }}
//                       >
//                         <Text style={shade.shade_name ? styles.shadePickerValue : styles.shadePickerPlaceholder}>
//                           {shade.shade_name || 'Select shade'}
//                         </Text>
//                       </TouchableOpacity>
//                     </View>

//                     <View style={styles.shadeQtyWrapper}>
//                       <Input
//                         label={si === 0 ? 'Qty' : undefined}
//                         value={shade.quantity ? String(shade.quantity) : ''}
//                         onChangeText={t => updateShade(row._id, shade._sid, { quantity: parseFloat(t) || 0 })}
//                         keyboardType="decimal-pad"
//                         placeholder="0"
//                         containerStyle={{ marginBottom: 0 }}
//                       />
//                     </View>

//                     <View style={styles.shadeRateWrapper}>
//                       <Input
//                         label={si === 0 ? 'Rate' : undefined}
//                         value={shade.rate ? String(shade.rate) : ''}
//                         onChangeText={t => updateShade(row._id, shade._sid, { rate: parseFloat(t) || 0 })}
//                         keyboardType="decimal-pad"
//                         placeholder="0"
//                         containerStyle={{ marginBottom: 0 }}
//                       />
//                     </View>

//                     <View style={styles.shadeTotalWrapper}>
//                       <Text style={styles.shadeTotalLabel}>₹</Text>
//                       <Text style={styles.shadeTotalValue}>{(shade.lineTotal || 0).toFixed(2)}</Text>
//                     </View>

//                     {row.shades.length > 1 ? (
//                       <TouchableOpacity onPress={() => removeShade(row._id, shade._sid)} style={styles.shadeRemoveBtn}>
//                         <Text style={styles.shadeRemoveText}>✕</Text>
//                       </TouchableOpacity>
//                     ) : (
//                       <View style={{ width: 28 }} />
//                     )}
//                   </View>
//                 ))}

//                 {/* total qty badge */}
//                 <View style={styles.totalQtyRow}>
//                   <Text style={styles.totalQtyLabel}>Total Qty:</Text>
//                   <Text style={styles.totalQtyValue}>
//                     {row.shades.reduce((a, s) => a + (s.quantity || 0), 0).toFixed(2)} mtr
//                   </Text>
//                 </View>

//                 {/* Add shade button */}
//                 <TouchableOpacity
//                   style={styles.addShadeBtn}
//                   onPress={() => addShade(row._id)}>
//                   <Text style={styles.addShadeText}>+ Add Shade</Text>
//                 </TouchableOpacity>
//               </View>
//             ) : (
//               <View style={styles.shadeHintBox}>
//                 <Text style={styles.shadeHintText}>
//                   👆 Fabric type select karo, phir shades add kar sakte ho
//                 </Text>
//               </View>
//             )}

//             {/* GST */}
//             <Input
//               label="GST %"
//               value={String(row.gst_percent)}
//               onChangeText={t => updateRow(row._id, { gst_percent: parseFloat(t) || 0 })}
//               keyboardType="decimal-pad"
//               placeholder="5"
//             />
//           </View>
//         ))}

//         <TouchableOpacity style={styles.addDesignBtn} onPress={addRow}>
//           <Text style={styles.addDesignText}>
//             {getUserPrptype === 'S' ? '+ Add Another Design' : '+ Add Another Item'}
//           </Text>
//         </TouchableOpacity>

//         <Input
//           label="Inquiry Remarks (optional)"
//           value={remarks}
//           onChangeText={setRemarks}
//           multiline
//           placeholder="Any general note for this inquiry..."
//         />

//         <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }}>
//           <Button
//             title="Cancel"
//             variant="secondary"
//             onPress={() => navigation.goBack()}
//             style={{ flex: 1 }}
//           />
//           <Button
//             title={isEditMode ? 'Update Inquiry' : 'Save Inquiry'}
//             onPress={save}
//             loading={saving}
//             style={{ flex: 1 }}
//           />
//         </View>
//       </ScrollView>
//     </>
//   );
// };

// // ── Styles ─────────────────────────────────────────────────────────────────────
// const styles = StyleSheet.create({
//   infoBox: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     backgroundColor: colors.bgSecondary,
//     padding: spacing.md,
//     borderRadius: radius.md,
//     marginBottom: spacing.md,
//   },
//   infoLabel: { fontSize: fontSize.xs, color: colors.textSecondary },
//   infoValue: { fontSize: fontSize.md, fontWeight: '500', color: colors.textPrimary, marginTop: 2 },
//   sectionLabel: {
//     fontSize: fontSize.md,
//     fontWeight: '500',
//     color: colors.textPrimary,
//     marginBottom: spacing.sm,
//   },
//   subSectionLabel: {
//     fontSize: fontSize.sm,
//     fontWeight: '600',
//     color: colors.textPrimary,
//     marginBottom: spacing.sm,
//   },
//   partyBox: {
//     padding: spacing.md,
//     backgroundColor: colors.cardBg,
//     borderWidth: 1,
//     borderColor: colors.border,
//     borderRadius: radius.md,
//     minHeight: 56,
//     justifyContent: 'center',
//   },
//   partyName: { fontSize: fontSize.base, fontWeight: '500', color: theme.BRAND_GRADIENT_END },
//   partyMeta: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 2 },
//   partyPlaceholder: { fontSize: fontSize.md, color: colors.textTertiary },
//   designCard: {
//     backgroundColor: colors.cardBg,
//     borderWidth: 1,
//     borderColor: colors.border,
//     borderRadius: radius.md,
//     padding: spacing.md,
//     marginBottom: spacing.sm,
//   },
//   designHead: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     marginBottom: spacing.sm,
//   },
//   designLabel: { fontSize: fontSize.md, fontWeight: '500', color: colors.textSecondary },
//   toggleRow: { flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.md },
//   toggleBtn: {
//     flex: 1,
//     paddingVertical: 8,
//     backgroundColor: colors.bgSecondary,
//     borderRadius: radius.md,
//     alignItems: 'center',
//   },
//   toggleBtnActive: { backgroundColor: colors.primary },
//   toggleText: { fontSize: fontSize.sm, color: colors.textPrimary },
//   toggleTextActive: { color: colors.textOnPrimary, fontWeight: '500' },
//   pickerBox: {
//     padding: spacing.md,
//     borderWidth: 1,
//     borderColor: colors.border,
//     borderRadius: radius.md,
//     marginBottom: spacing.md,
//     minHeight: 44,
//     justifyContent: 'center',
//   },
//   pickerValue: { fontSize: fontSize.base, color: theme.BRAND_GRADIENT_END },
//   pickerPlaceholder: { fontSize: fontSize.md, color: colors.textTertiary },

//   // ── Fabric type chips ─────────────────────────────────────────────────────
//   chipRow: {
//     flexDirection: 'row',
//     flexWrap: 'wrap',
//     gap: spacing.xs,
//     marginBottom: spacing.md,
//   },
//   chip: {
//     paddingHorizontal: spacing.md,
//     paddingVertical: 7,
//     borderRadius: radius.pill,
//     borderWidth: 1.5,
//     borderColor: colors.border,
//     backgroundColor: colors.bgSecondary,
//   },
//   chipSelected: {
//     borderColor: colors.info,
//     backgroundColor: colors.infoBg,
//   },
//   chipText: { fontSize: fontSize.sm, color: colors.textSecondary },
//   chipTextSelected: { color: colors.info, fontWeight: '600' },

//   // ── Shades ────────────────────────────────────────────────────────────────
//   shadesSection: {
//     backgroundColor: colors.bgSecondary,
//     borderRadius: radius.md,
//     padding: spacing.sm,
//     marginBottom: spacing.md,
//   },
//   shadesSectionHead: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'space-between',
//     marginBottom: spacing.sm,
//   },
//   fabricTypeBadge: {
//     fontSize: fontSize.xs,
//     fontWeight: '600',
//     color: colors.info,
//     backgroundColor: colors.infoBg,
//     paddingHorizontal: spacing.sm,
//     paddingVertical: 3,
//     borderRadius: radius.pill,
//   },
//   // shadeRow: {
//   //   flexDirection: 'row',
//   //   alignItems: 'flex-end',
//   //   gap: spacing.xs,
//   //   marginBottom: spacing.xs,
//   // },
//   shadeIndexBadge: {
//     width: 22,
//     height: 22,
//     borderRadius: 11,
//     backgroundColor: colors.info,
//     alignItems: 'center',
//     justifyContent: 'center',
//     marginBottom: 12,
//   },
//   shadeIndexText: { color: colors.white, fontSize: 11, fontWeight: '700' },
//   shadeRemoveBtn: {
//     width: 28,
//     height: 28,
//     borderRadius: 14,
//     backgroundColor: colors.dangerBg,
//     alignItems: 'center',
//     justifyContent: 'center',
//     marginBottom: 10,
//   },
//   shadeRemoveText: { color: colors.danger, fontSize: 12, fontWeight: '700' },
//   totalQtyRow: {
//     flexDirection: 'row',
//     justifyContent: 'flex-end',
//     alignItems: 'center',
//     gap: spacing.xs,
//     marginTop: spacing.xs,
//     marginBottom: spacing.sm,
//   },
//   totalQtyLabel: { fontSize: fontSize.sm, color: colors.textSecondary },
//   totalQtyValue: { fontSize: fontSize.base, fontWeight: '700', color: colors.info },
//   addShadeBtn: {
//     paddingVertical: 8,
//     borderWidth: 1,
//     borderStyle: 'dashed',
//     borderColor: colors.info,
//     borderRadius: radius.md,
//     alignItems: 'center',
//   },
//   addShadeText: { color: colors.info, fontSize: fontSize.sm, fontWeight: '500' },
//   shadeHintBox: {
//     backgroundColor: colors.bgSecondary,
//     borderRadius: radius.md,
//     padding: spacing.md,
//     marginBottom: spacing.md,
//     alignItems: 'center',
//   },
//   shadeHintText: { fontSize: fontSize.sm, color: colors.textTertiary, textAlign: 'center' },

//   // ── Add design button ──────────────────────────────────────────────────────
//   addDesignBtn: {
//     padding: spacing.md,
//     borderWidth: 1,
//     borderStyle: 'dashed',
//     borderColor: colors.info,
//     backgroundColor: colors.infoBg,
//     borderRadius: radius.md,
//     alignItems: 'center',
//     marginBottom: spacing.md,
//   },
//   addDesignText: { color: colors.info, fontWeight: '500' },
//   // 
//   shadeRow: {
//     flexDirection: 'row',
//     flexWrap: 'wrap',        // allow wrapping on small screens
//     alignItems: 'flex-end',
//     gap: spacing.xs,
//     marginBottom: spacing.sm,
//     paddingBottom: spacing.xs,
//     borderBottomWidth: 1,
//     borderBottomColor: colors.borderLight,
//   },
//   shadeNameWrapper: { flex: 2, minWidth: 120 },
//   shadeQtyWrapper: { flex: 0.8, minWidth: 70 },
//   shadeRateWrapper: { flex: 0.8, minWidth: 70 },
//   shadeTotalWrapper: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     backgroundColor: colors.infoBg,
//     paddingHorizontal: spacing.sm,
//     paddingVertical: 8,
//     borderRadius: radius.md,
//     minWidth: 80,
//     justifyContent: 'center',
//     marginBottom: 10,
//   },
//   shadeTotalLabel: { fontSize: fontSize.sm, fontWeight: '600', color: colors.info, marginRight: 4 },
//   shadeTotalValue: { fontSize: fontSize.sm, fontWeight: 'bold', color: colors.info },
//   shadePicker: {
//     padding: spacing.sm,
//     borderWidth: 1,
//     borderColor: colors.border,
//     borderRadius: radius.md,
//     backgroundColor: colors.cardBg,
//     justifyContent: 'center',
//     minHeight: 44,
//     width: '100%',
//   },
  
//   shadePickerValue: { fontSize: fontSize.base, color: colors.textPrimary },
//   shadePickerPlaceholder: { fontSize: fontSize.base, color: colors.textTertiary },
//   lineTotalBox: {
//     backgroundColor: colors.infoBg,
//     paddingHorizontal: spacing.sm,
//     paddingVertical: 6,
//     borderRadius: radius.md,
//     marginBottom: 12,
//     alignItems: 'center',
//   },
//   lineTotalLabel: { fontSize: fontSize.xs, color: colors.textSecondary },
//   lineTotalValue: { fontSize: fontSize.sm, fontWeight: 'bold', color: colors.info },
//   designTotalBox: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     backgroundColor: colors.primaryLight,
//     padding: spacing.sm,
//     borderRadius: radius.md,
//     marginVertical: spacing.sm,
//   },
//   designTotalLabel: { fontSize: fontSize.md, fontWeight: '600', color: colors.textPrimary },
//   designTotalValue: { fontSize: fontSize.md, fontWeight: 'bold', color: colors.primary },
// });

// export default InquiryFormScreen;
