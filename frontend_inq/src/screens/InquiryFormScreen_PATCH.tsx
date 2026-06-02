// ============================================================
// MODIFICATIONS for src/screens/InquiryFormScreen.tsx
// to support edit mode (when inquiryId param is passed)
// ============================================================

// ──────────────────────────────────────────────────────────
// 1) Add imports at the top:
// ──────────────────────────────────────────────────────────
import {useEffect} from 'react';

// ──────────────────────────────────────────────────────────
// 2) Inside the component, near the top of state declarations,
//    extract the inquiryId from route.params:
// ──────────────────────────────────────────────────────────
const inquiryId = route.params?.inquiryId;
const isEditMode = !!inquiryId;
const [loadingExisting, setLoadingExisting] = useState(isEditMode);

// ──────────────────────────────────────────────────────────
// 3) Add useEffect to load existing inquiry data when editing:
// ──────────────────────────────────────────────────────────
useEffect(() => {
  if (!isEditMode) return;

  (async () => {
    try {
      const existing = await inquiryApi.show(inquiryId!);

      // Guard: if it's no longer editable, bounce back
      if (existing.status !== 'pending_costing') {
        Alert.alert(
          'Cannot Edit',
          'This inquiry can no longer be edited because it has been costed.',
          [{text: 'OK', onPress: () => navigation.goBack()}],
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
      Alert.alert('Error', 'Failed to load inquiry');
      navigation.goBack();
    } finally {
      setLoadingExisting(false);
    }
  })();
}, [inquiryId, isEditMode, navigation]);

// ──────────────────────────────────────────────────────────
// 4) Update the `save` function to handle both create and update:
// ──────────────────────────────────────────────────────────
const save = async () => {
  // ... your existing validation code (party check, designs check) ...

  setSaving(true);
  try {
    const payload = {
      party_prp_code: party.prp_code,
      party_acc_code: party.acc_code,
      party_name_snapshot: party.name,
      party_gstin: party.gstin,
      party_address: party.address,
      remarks,
      designs: designs.map(({_id, ...rest}) => rest),
    };

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
            navigation.replace('InquiryDetail', {id: created.id});
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

// ──────────────────────────────────────────────────────────
// 5) Show loading state at top of render:
// ──────────────────────────────────────────────────────────
if (loadingExisting) {
  return (
    <View style={{flex: 1, alignItems: 'center', justifyContent: 'center'}}>
      <ActivityIndicator color={colors.primary} />
    </View>
  );
}

// ──────────────────────────────────────────────────────────
// 6) Update the save button to say "Update" when editing:
// ──────────────────────────────────────────────────────────
<Button
  title={isEditMode ? 'Update Inquiry' : 'Save Inquiry'}
  onPress={save}
  loading={saving}
  style={{flex: 1}}
/>

// ──────────────────────────────────────────────────────────
// 7) Optionally set screen title via useEffect:
// ──────────────────────────────────────────────────────────
useEffect(() => {
  navigation.setOptions({
    title: isEditMode ? 'Edit Inquiry' : 'New Inquiry',
  });
}, [navigation, isEditMode]);
