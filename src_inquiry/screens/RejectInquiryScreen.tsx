import React, { useEffect, useState } from 'react';
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
import { inquiryApi } from '../services/inquiryApi';
import { RootStackParamList } from '../types';
import Input from '../components/Input';
import Button from '../components/Button';
import HeaderBarwithBack from '../../components/HeaderBarwithBack/HeaderBarwithBack';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Props = NativeStackScreenProps<RootStackParamList, 'RejectInquiry'>;

const REASONS = [
  'Price too high',
  'Design not suitable',
  'Quantity mismatch',
  'Delivery timeline issue',
  'Party not interested',
  'Other',
];

const RejectInquiryScreen: React.FC<Props> = ({ route, navigation, username }) => {
  const { id } = route.params;
  const [reason, setReason] = useState<string>('');
  const [remarks, setRemarks] = useState('');
  const [saving, setSaving] = useState(false);
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

  const submit = async () => {
    if (!reason) {
      Alert.alert('Reason required', 'Please select a rejection reason');
      return;
    }
    setSaving(true);
    try {
      await inquiryApi.reject(id, { reason, remarks, prptype: getUserPrptype, yearno: '27' });
      Alert.alert('Rejected', 'Inquiry has been marked as rejected', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message || 'Failed to reject');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <HeaderBarwithBack
        userName={username}
        header={'Reject Inquiries'}
        subHeader={'Manage your inquiries rejection'}
      />
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.bg }}
        contentContainerStyle={{ padding: spacing.md, paddingBottom: 40 }}>

        <View style={styles.banner}>
          <Text style={styles.bannerTitle}>Mark as Rejected</Text>
          <Text style={styles.bannerText}>
            Select the reason for rejection. This helps you track why inquiries
            don't convert.
          </Text>
        </View>

        <Text style={styles.label}>Reason *</Text>
        <View style={{ marginBottom: spacing.md }}>
          {REASONS.map(r => (
            <TouchableOpacity
              key={r}
              onPress={() => setReason(r)}
              style={[styles.option, reason === r && styles.optionActive]}>
              <View style={[styles.radio, reason === r && styles.radioActive]} />
              <Text
                style={[styles.optionText, reason === r && styles.optionTextActive]}>
                {r}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Input
          label="Additional Remarks"
          value={remarks}
          onChangeText={setRemarks}
          multiline
          placeholder="Any details (optional)"
        />

        <Button
          title="Confirm Rejection"
          variant="danger"
          onPress={submit}
          loading={saving}
          style={{ marginTop: spacing.md }}
        />
        <Button
          title="Cancel"
          variant="secondary"
          onPress={() => navigation.goBack()}
          style={{ marginTop: spacing.sm }}
        />
      </ScrollView>
    </>
  );
};

const styles = StyleSheet.create({
  banner: {
    backgroundColor: colors.dangerBg,
    borderLeftWidth: 3,
    borderLeftColor: colors.danger,
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.md,
  },
  bannerTitle: {
    color: colors.danger,
    fontSize: fontSize.base,
    fontWeight: '500',
    marginBottom: 4,
  },
  bannerText: { color: colors.danger, fontSize: fontSize.sm, lineHeight: 18 },
  label: {
    fontSize: fontSize.md,
    fontWeight: '500',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    marginBottom: spacing.xs,
    backgroundColor: colors.cardBg,
  },
  optionActive: {
    borderColor: colors.danger,
    backgroundColor: colors.dangerBg,
  },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    marginRight: spacing.sm + 2,
  },
  radioActive: {
    borderColor: colors.danger,
    backgroundColor: colors.danger,
  },
  optionText: { fontSize: fontSize.base, color: colors.textPrimary },
  optionTextActive: { color: colors.danger, fontWeight: '500' },
});

export default RejectInquiryScreen;
