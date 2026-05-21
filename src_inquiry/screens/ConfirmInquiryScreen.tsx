import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { colors, fontSize, radius, spacing } from '../utils/theme';
import { inquiryApi } from '../services/inquiryApi';
import { RootStackParamList } from '../types';
import HeaderBarwithBack from '../../components/HeaderBarwithBack/HeaderBarwithBack';
import Input from '../components/Input';
import Button from '../components/Button';

type Props = NativeStackScreenProps<RootStackParamList, 'ConfirmInquiry'>;

const ConfirmInquiryScreen: React.FC<Props> = ({ route, navigation, username }) => {
  const { id } = route.params;
  const [paymentTerms, setPaymentTerms] = useState('');
  const [deliveryTerms, setDeliveryTerms] = useState('');
  const [remarks, setRemarks] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    try {
      const res = await inquiryApi.confirm(id, {
        payment_terms: paymentTerms,
        delivery_terms: deliveryTerms,
        remarks,
        prpcode: 'SIP',
        yearno: '27',
      });
      const soNo = res?.sales_order?.so_no;
      Alert.alert(
        'Confirmed!',
        `Sales Order ${soNo} has been created successfully.`,
        [{ text: 'OK', onPress: () => navigation.goBack() }],
      );
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message || 'Failed to confirm');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <HeaderBarwithBack
        userName={username}
        header={'Confirm Inquiries'}
        subHeader={'Manage your inquiries confirmation'}
      />
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.bg }}
        contentContainerStyle={{ padding: spacing.md, paddingBottom: 40 }}>

        <View style={styles.banner}>
          <Text style={styles.bannerTitle}>✓ Confirm Inquiry</Text>
          <Text style={styles.bannerText}>
            This will create a Sales Order with all costed designs from this
            inquiry.
          </Text>
        </View>

        <Input
          label="Payment Terms"
          value={paymentTerms}
          onChangeText={setPaymentTerms}
          multiline
          placeholder="e.g., 30% advance, 70% on delivery"
        />

        <Input
          label="Delivery Terms"
          value={deliveryTerms}
          onChangeText={setDeliveryTerms}
          multiline
          placeholder="e.g., Delivery within 45 days from order"
        />

        <Input
          label="Remarks"
          value={remarks}
          onChangeText={setRemarks}
          multiline
          placeholder="Any additional notes for the sales order"
        />

        <Button
          title="Confirm & Create Sales Order"
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
    backgroundColor: colors.successBg,
    borderLeftWidth: 3,
    borderLeftColor: colors.success,
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.md,
  },
  bannerTitle: {
    color: colors.success,
    fontSize: fontSize.base,
    fontWeight: '500',
    marginBottom: 4,
  },
  bannerText: { color: colors.success, fontSize: fontSize.sm, lineHeight: 18 },
});

export default ConfirmInquiryScreen;
