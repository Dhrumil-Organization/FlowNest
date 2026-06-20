import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { colors, fontSize, radius, spacing } from '../utils/theme';
import { inquiryApi } from '../services/inquiryApi';
import { Inquiry, RootStackParamList } from '../types';
import HeaderBarwithBack from '../../components/HeaderBarwithBack/HeaderBarwithBack';
import Input from '../components/Input';
import Button from '../components/Button';
import AsyncStorage from '@react-native-async-storage/async-storage';
import theme from '../../android/app/src/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'ConfirmInquiry'>;

const ConfirmInquiryScreen: React.FC<Props> = ({ route, navigation, username }) => {
  const { id, prpcode, strcode, yearno, txntype, fetch } = route.params;
  const [paymentTerms, setPaymentTerms] = useState('');
  const [deliveryTerms, setDeliveryTerms] = useState('');
  const [remarks, setRemarks] = useState('');
  const [saving, setSaving] = useState(false);
  const [getloading, setLoading] = useState(false);
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

  const handleAutoEntry = async () => {
    setLoading(true);
    try {
      // setLoading(true);
      const payload = {
        uid: id,
        prpcode: prpcode,
        strcode: strcode,
        // prptype: getUserPrptype,
        yearno: yearno,
        txntype: txntype,
        fetch: fetch,
      };

      console.log("Auto Entry Payload:", payload);
      // Alert.alert(
      //   "Auto Entry Success",
      //   `Auto Entry completed for ${item.inquiry_no}`
      // );
      console.log("Auto Entry Response:", payload);
      const response = await inquiryApi.autoEntry(payload as any);
      console.log("Auto Entry Response:", response);
      if (response.data.success) {
        setLoading(false);
        submitFinal();
      } else {
        setLoading(false);
        Alert.alert(
          "Error",
          response?.data?.message || "Failed to perform Auto Entry"
        );
      }

      // Show the response in the card (e.g., as a toast or inline message)
      // Alert.alert(
      //   "Auto Entry Success",
      //   `Auto Entry completed for ${item.inquiry_no}. Response: ${JSON.stringify(response)}`
      // );

      // Optionally: Update the card to show the response
      // You can add a new state to track the response for each card
    } catch (e: any) {
      setLoading(false);
      Alert.alert(
        "Error",
        e?.response?.data?.message || "Failed to perform Auto Entry"
      );
    } finally {
      // setLoading(false);
    }
  };

  const submit = async () => {
    handleAutoEntry();
  };

  const submitFinal = async () => {
    setSaving(true);
    try {
      const res = await inquiryApi.confirm(id, {
        payment_terms: paymentTerms,
        delivery_terms: deliveryTerms,
        remarks,
        prptype: getUserPrptype,
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

        {/* <Input
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
        /> */}
        {getloading ? (
          <ActivityIndicator size="large" color={theme.BRAND_GRADIENT_END} />
        ) : (
          <Button
            title="Confirm & Create Sales Order"
            onPress={submit}
            loading={saving}
            style={{ marginTop: spacing.md }}
          />
        )}
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
