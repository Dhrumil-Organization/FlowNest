import React, { useCallback, useEffect, useState } from 'react';
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
import DateTimePicker from '@react-native-community/datetimepicker';
import { colors, fontSize, radius, spacing } from '../utils/theme';
import Input from '../components/Input';
import Button from '../components/Button';
import { inquiryApi } from '../services/inquiryApi';
import { Design, InquiryDesignInput, Party, RootStackParamList } from '../types';
import HeaderBarwithBack from '../../components/HeaderBarwithBack/HeaderBarwithBack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import theme from '../../android/app/src/theme';
import ShadesSection from '../components/ShadesSection';
import TourOverlay, { INQUIRY_FORM_TOUR } from '../components/TourOverlay';
import { shadesApi } from '../services/shadesApi';
import { InquiryShade } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'InquiryForm'>;

interface DesignRow extends InquiryDesignInput {
  _id: string; // local key
  expected_delivery_date?: string;
  shades: InquiryShade[];
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
  expected_delivery_date: '',
  shades: [],
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
  const [showTour, setShowTour] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [stockData, setstockData] = useState([]);

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
        const existing = await inquiryApi.show(inquiryId!, getUserPrptype, '27', { prptype: getUserPrptype, yearno: '27' });

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
            shades: d.shades || [],
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

  useEffect(() => {
    (async () => {
      try {
        const shadesData = await shadesApi.stockList(getUserPrptype, '27');

        console.log('stock List Data: ', shadesData);
        setstockData(shadesData?.response?.data || [])


      } catch (e: any) {
        // Alert.alert('Error', 'Failed to load inquiry');
        console.error('Failed to load shades List', e);
        // navigation.goBack();
      } finally {
        setLoadingExisting(false);
      }
    })();
  }, [getUserPrptype]);

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

  // const save = async () => {
  //   if (!party) {
  //     Alert.alert('Select Party', 'Please select a party first');
  //     return;
  //   }

  //   for (const d of designs) {
  //     if (!d.design_name_snapshot.trim()) {
  //       Alert.alert(` ${getUserPrptype === 'S' ? 'Design name required, Please add a design' : 'Item name required, Please add a item'} name for each row`);
  //       return;
  //     }
  //     if (d.is_new_design && !d.construction_remarks.trim()) {
  //       Alert.alert(
  //         'Construction details required',
  //         `Please add construction details for new ${getUserPrptype === 'S' ? 'designs' : 'items'}`,
  //       );
  //       return;
  //     }
  //     if (!d.shades || d.shades.length <= 0) {
  //       Alert.alert(`At least one shade required', 'Select at least one shade for each ${getUserPrptype === 'S' ? 'design' : 'item'}`);
  //       return;
  //     }
  //     if (!d.quantity || d.quantity <= 0) {
  //       Alert.alert(`Quantity required', 'Enter a valid quantity for each ${getUserPrptype === 'S' ? 'design' : 'item'} from selected shades`);
  //       return;
  //     }
  //     console.log('expected_delivery_date', d.expected_delivery_date);
  //     // if (!d.expected_delivery_date) {
  //     //   Alert.alert('Missing Date', `Delivery date required for ${getUserPrptype === 'S' ? 'design' : 'item'} #${idx + 1}`);
  //     //   return;
  //     // }
  //   }

  //   for (let idx = 0; idx < designs.length; idx++) {
  //     const d = designs[idx];
  //     if (!d.expected_delivery_date) {
  //       Alert.alert('Missing Date', `Delivery date required for ${getUserPrptype === 'S' ? 'design' : 'item'} #${idx + 1}`);
  //       return;
  //     }
  //   }
  //   setSaving(true);
  //   try {
  //     const created = await inquiryApi.store({
  //       party_prp_code: party.prp_code,
  //       party_acc_code: party.acc_code,
  //       party_name_snapshot: party.name,
  //       party_gstin: party.gstin,
  //       party_address: party.address,
  //       remarks,
  //       prptype: getUserPrptype,
  //       yearno: "27",
  //       designs: designs.map(({ _id, ...rest }) => rest),
  //     });

  //     const payload = {
  //       party_prp_code: party.prp_code,
  //       party_acc_code: party.acc_code,
  //       party_name_snapshot: party.name,
  //       party_gstin: party.gstin,
  //       party_address: party.address,
  //       remarks,
  //       prptype: getUserPrptype,
  //       yearno: "27",
  //       designs: designs.map(({ _id, ...rest }) => rest),
  //     };

  //     // Alert.alert('Success', `Inquiry ${created.inquiry_no} created`, [
  //     //   {
  //     //     text: 'OK',
  //     //     onPress: () => {
  //     //       navigation.replace('InquiryDetail', { id: created.id });
  //     //     },
  //     //   },
  //     // ]);
  //     if (isEditMode) {
  //       const updated = await inquiryApi.update(inquiryId!, payload);
  //       Alert.alert('Success', `Inquiry ${updated.inquiry_no} updated`, [
  //         {
  //           text: 'OK',
  //           onPress: () => {
  //             navigation.goBack();
  //           },
  //         },
  //       ]);
  //     } else {
  //       const created = await inquiryApi.store(payload);
  //       if (created.designs && created.designs.length) {
  //         for (let i = 0; i < created.designs.length; i++) {
  //           const savedDesign = created.designs[i];
  //           const localDesign = designs[i];
  //           if (localDesign?.shades && localDesign.shades.length > 0) {
  //             await shadesApi.save(
  //               savedDesign.id,
  //               getUserPrptype,
  //               '27',   // design ID from backend
  //               localDesign.shades.map(sh => ({
  //                 shade_name: sh.shade_name,
  //                 shade_code: sh.shade_code,
  //                 quantity: sh.quantity,
  //                 rate: sh.rate,
  //               }))
  //             );
  //           }
  //         }
  //       }
  //       Alert.alert('Success', `Inquiry ${created.inquiry_no} created`, [
  //         {
  //           text: 'OK',
  //           onPress: () => {
  //             navigation.replace('InquiryDetail', { id: created.id });
  //           },
  //         },
  //       ]);
  //     }
  //   } catch (e: any) {
  //     Alert.alert('Error', e?.response?.data?.message || 'Failed to save inquiry');
  //   } finally {
  //     setSaving(false);
  //   }
  // };
  const save = async () => {
    if (!party) {
      Alert.alert('Select Party', 'Please select a party first');
      return;
    }

    // Validation loop
    for (let idx = 0; idx < designs.length; idx++) {
      const d = designs[idx];
      if (!d.design_name_snapshot.trim()) {
        Alert.alert(getUserPrptype === 'S' ? 'Design name required, Please add a design' : 'Item name required, Please add an item');
        return;
      }
      if (d.is_new_design && !d.construction_remarks.trim()) {
        Alert.alert(
          'Construction details required',
          `Please add construction details for new ${getUserPrptype === 'S' ? 'designs' : 'items'}`,
        );
        return;
      }
      if (!d.shades || d.shades.length <= 0) {
        Alert.alert('At least one shade required', `Select at least one shade for each ${getUserPrptype === 'S' ? 'design' : 'item'}`);
        return;
      }
      if (!d.quantity || d.quantity <= 0) {
        Alert.alert('Quantity required', `Enter a valid quantity for each ${getUserPrptype === 'S' ? 'design' : 'item'} from selected shades`);
        return;
      }
      if (!d.expected_delivery_date) {
        Alert.alert('Missing Date', `Delivery date required for ${getUserPrptype === 'S' ? 'design' : 'item'} #${idx + 1}`);
        return;
      }
    }

    setSaving(true);
    try {
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

      if (isEditMode) {
        const updated = await inquiryApi.update(inquiryId!, payload);
        Alert.alert('Success', `Inquiry ${updated.inquiry_no} updated`, [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } else {
        const created = await inquiryApi.store(payload);
        if (created.designs && created.designs.length) {
          for (let i = 0; i < created.designs.length; i++) {
            const savedDesign = created.designs[i];
            const localDesign = designs[i];
            if (localDesign?.shades && localDesign.shades.length > 0) {
              await shadesApi.save(
                savedDesign.id,
                getUserPrptype,
                '27',
                localDesign.shades.map(sh => ({
                  shade_name: sh.shade_name,
                  shade_code: sh.shade_code,
                  quantity: sh.quantity,
                  rate: sh.rate,
                }))
              );
            }
          }
        }
        Alert.alert('Success', `Inquiry ${created.inquiry_no} created`, [
          { text: 'OK', onPress: () => navigation.replace('InquiryDetail', { id: created.id }) },
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

  // const onDateChange = (event: any, date?: Date) => {
  //   setShowDatePicker(false);
  //   if (date) {
  //     if (selectedRowId) {
  //       updateRow(selectedRowId, {
  //         expected_delivery_date: date.toLocaleDateString('en-IN', {
  //           day: '2-digit',
  //           month: '2-digit',
  //           year: 'numeric',
  //         }),
  //       });
  //     }
  //     setSelectedDate(date);
  //   }
  // };
  const onDateChange = (event: any, date?: Date) => {
    setShowDatePicker(false);
    if (date && selectedRowId) {
      // Format the date as dd-mm-yyyy for API
      const formattedDate = date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }).replace(/\//g, '-'); // Replace '/' with '-'

      updateRow(selectedRowId, {
        expected_delivery_date: formattedDate,
      });
    }
    setSelectedDate(date || null);
  };

  // const openDatePicker = (rowId: string, currentDate?: string) => {
  //   setSelectedRowId(rowId);
  //   if (currentDate) {
  //     const [day, month, year] = currentDate.split('/');
  //     const date = new Date(`${year}-${month}-${day}`);
  //     setSelectedDate(date);
  //   } else {
  //     setSelectedDate(new Date());
  //   }
  //   setShowDatePicker(true);
  // };
  const openDatePicker = (rowId: string, currentDate?: string) => {
    setSelectedRowId(rowId);
    if (currentDate) {
      // Parse the existing date (assuming it's in dd/mm/yyyy or dd-mm-yyyy)
      const [day, month, year] = currentDate.split(/[/-]/); // Split by '/' or '-'
      const date = new Date(`${year}-${month}-${day}`);
      setSelectedDate(date);
    } else {
      setSelectedDate(new Date());
    }
    setShowDatePicker(true);
  };

  return (
    <>
      <HeaderBarwithBack
        userName={username}
        header={'Inquiries Form'}
        subHeader={'Enter your inquiries details'}
      />
      <View style={styles.helpRow}>
        <TouchableOpacity onPress={() => setShowTour(true)} style={styles.helpBtn}>
          <Text style={styles.helpBtnText}>? Help</Text>
        </TouchableOpacity>
      </View>
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
                <ShadesSection
                  shades={row.shades || []}
                  onChange={(newShades) =>
                    updateRow(row._id, {
                      shades: newShades,
                      // Auto-update design's quantity from shades total
                      quantity: newShades.reduce((sum, sh) => sum + (sh.quantity || 0), 0),
                    })
                  }
                  showStock={true}
                  stockList={stockData} // Pass the stock data from shadesApi.stockList
                  designDsnCode={row.design_dsn_code} // Pass the current design's DSN code
                  getUserPrptype={getUserPrptype}
                />
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <View style={{ flex: 1 }}>
                <Input
                  label="Unit"
                  value={row.unit}
                  onChangeText={t => updateRow(row._id, { unit: t })}
                  placeholder="mtr"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Input
                  label="GST %"
                  value={String(row.gst_percent)}
                  onChangeText={t => updateRow(row._id, { gst_percent: parseFloat(t) || 0 })}
                  keyboardType="decimal-pad"
                  placeholder="5"
                />
              </View>
            </View>
            {/* <Input
              label="Expected Delivery Date *"
              value={row.expected_delivery_date || ''}
              onChangeText={t => updateRow(row._id, { expected_delivery_date: t })}
              placeholder="DD/MM/YYYY"
              required
            /> */}
            <Text style={{ color: '#000', fontWeight: '500', marginBottom: 2 }}> Expected Delivery Date * </Text>
            <TouchableOpacity
              style={styles.pickerBox}
              onPress={() => openDatePicker(row._id, row.expected_delivery_date)}
            >
              <Text style={row.expected_delivery_date ? styles.pickerValue : styles.pickerPlaceholder}>
                {row.expected_delivery_date
                  ? row.expected_delivery_date.replace(/-/g, '/') // Replace '-' with '/' for display
                  : 'Select expected delivery date'}
              </Text>
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={selectedDate || new Date()}
                mode="date"
                display="default"
                onChange={onDateChange}
                minimumDate={new Date()}
                locale="en-IN"
              />
            )}

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
      <TourOverlay
        tourKey="inquiry_form"
        steps={INQUIRY_FORM_TOUR}
        visible={showTour}
        onClose={() => setShowTour(false)}
      />
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

export default InquiryFormScreen;