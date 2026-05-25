import React, { useEffect, useState } from 'react';
import {
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { colors, fontSize, radius, spacing } from '../utils/theme';
import { inquiryApi } from '../services/inquiryApi';
import { Inquiry, RootStackParamList } from '../types';
import Input from '../components/Input';
import Button from '../components/Button';
import { isValidEmail, isValidMobile } from '../utils/validators';
import HeaderBarwithBack from '../../components/HeaderBarwithBack/HeaderBarwithBack';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Props = NativeStackScreenProps<RootStackParamList, 'SendQuotation'>;

type Channel = 'email' | 'whatsapp';

const SendQuotationScreen: React.FC<Props> = ({ route, navigation, username }) => {
  const { id } = route.params;
  const [channel, setChannel] = useState<Channel>('email');
  const [inquiry, setInquiry] = useState<Inquiry | null>(null);

  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [emailMessage, setEmailMessage] = useState('');

  const [mobile, setMobile] = useState('');
  const [waMessage, setWaMessage] = useState('');

  const [sending, setSending] = useState(false);
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

  useEffect(() => {
    (async () => {
      const data = await inquiryApi.show(id);
      setInquiry(data);
      if (data.party_gstin) {
        // pre-fill suggestions from inquiry (we don't have email/mobile in inquiry directly,
        // but you can extend to fetch from famacc — for now leave blank for user to enter)
      }
      setSubject(`Quotation ${data.inquiry_no} - ${data.party_name}`);
      setEmailMessage(
        `Dear ${data.party_name},\n\nPlease find attached our quotation ${data.inquiry_no} dated ${data.inquiry_date}.\n\nLooking forward to your response.\n\nRegards,\nSales Team`,
      );
      setWaMessage(
        `Dear ${data.party_name},\n\nPlease find attached our quotation ${data.inquiry_no}.\n\nLooking forward to your response.\n\nRegards,\nSales Team`,
      );
    })();
  }, [id]);

  const sendEmail = async () => {
    if (!isValidEmail(email)) {
      Alert.alert('Invalid Email', 'Please enter a valid email address');
      return;
    }
    setSending(true);
    try {
      await inquiryApi.sendEmail(id, { email, subject, message: emailMessage, prptype: getUserPrptype, yearno: "27" });
      Alert.alert('Sent!', 'Quotation emailed successfully', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message || 'Failed to send email');
    } finally {
      setSending(false);
    }
  };

  const sendWhatsapp = async () => {
    if (!isValidMobile(mobile)) {
      Alert.alert('Invalid Mobile', 'Please enter a valid 10-digit mobile');
      return;
    }
    setSending(true);
    try {
      await inquiryApi.sendWhatsapp(id, { mobile, message: waMessage, prptype: getUserPrptype, yearno: "27" });
      Alert.alert('Sent!', 'Quotation sent via WhatsApp', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message || 'Failed to send WhatsApp');
    } finally {
      setSending(false);
    }
  };

  const downloadPdf = async () => {
    setSending(true);
    try {
      // const {pdf_url} = await inquiryApi.downloadPdf(id);
      const { pdf_url } = await inquiryApi.downloadPdf(id, getUserPrptype, "27");
      Linking.openURL(pdf_url);
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message || 'Failed to generate PDF');
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <HeaderBarwithBack
        userName={username}
        header={'Send Quotation'}
        subHeader={'Manage your quotation'}
      />
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.bg }}
        contentContainerStyle={{ padding: spacing.md, paddingBottom: 40 }}>

        {/* Inquiry header */}
        {inquiry ? (
          <View style={styles.header}>
            <Text style={styles.inqNo}>{inquiry.inquiry_no}</Text>
            <Text style={styles.party}>{inquiry.party_name}</Text>
          </View>
        ) : null}

        {/* Channel tabs */}
        <View style={styles.tabs}>
          {(['email', 'whatsapp'] as Channel[]).map(c => (
            <TouchableOpacity
              key={c}
              style={[styles.tab, channel === c && styles.tabActive]}
              onPress={() => setChannel(c)}>
              <Text style={[styles.tabText, channel === c && styles.tabTextActive]}>
                {c === 'email' ? 'Email' : c === 'whatsapp' ? 'WhatsApp' : ''}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Email panel */}
        {channel === 'email' ? (
          <View style={styles.panel}>
            <Input
              label="To Email"
              required
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholder="party@example.com"
            />
            <Input
              label="Subject"
              value={subject}
              onChangeText={setSubject}
              placeholder="Quotation subject"
            />
            <Input
              label="Message"
              value={emailMessage}
              onChangeText={setEmailMessage}
              multiline
              placeholder="Email body"
            />
            <View style={styles.note}>
              <Text style={styles.noteText}>
                📎 PDF quotation will be attached automatically
              </Text>
            </View>
            <Button title="Send Email" onPress={sendEmail} loading={sending} />
          </View>
        ) : null}

        {/* WhatsApp panel */}
        {channel === 'whatsapp' ? (
          <View style={styles.panel}>
            <Input
              label="Mobile Number"
              required
              value={mobile}
              onChangeText={setMobile}
              keyboardType="phone-pad"
              placeholder="10-digit mobile"
              maxLength={13}
            />
            <Input
              label="Message"
              value={waMessage}
              onChangeText={setWaMessage}
              multiline
              placeholder="WhatsApp message"
            />
            <View style={styles.note}>
              <Text style={styles.noteText}>
                📎 PDF will be sent as document attachment
              </Text>
            </View>
            <Button title="Send via WhatsApp" onPress={sendWhatsapp} loading={sending} />
          </View>
        ) : null}

        {/* PDF panel */}
        {/* {channel === 'pdf' ? (
        <View style={styles.panel}>
          <Text style={styles.pdfDescription}>
            Download the quotation PDF to share manually via any other channel
            (print, share, etc.)
          </Text>
          <Button
            title="Download PDF"
            onPress={downloadPdf}
            loading={sending}
            style={{ marginTop: spacing.md }}
          />
        </View>
      ) : null} */}
      </ScrollView>
    </>
  );
};

const styles = StyleSheet.create({
  header: { marginBottom: spacing.md },
  inqNo: { fontSize: fontSize.lg, fontWeight: '500' },
  party: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 2 },
  tabs: {
    flexDirection: 'row',
    backgroundColor: colors.bgSecondary,
    borderRadius: radius.md,
    padding: 3,
    marginBottom: spacing.md,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: radius.sm,
  },
  tabActive: { backgroundColor: colors.primary },
  tabText: { fontSize: fontSize.sm, color: colors.textSecondary },
  tabTextActive: { color: colors.textOnPrimary, fontWeight: '500' },
  panel: {
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  note: {
    backgroundColor: colors.infoBg,
    padding: spacing.sm + 2,
    borderRadius: radius.md,
    marginBottom: spacing.md,
  },
  noteText: { color: colors.info, fontSize: fontSize.sm },
  pdfDescription: {
    fontSize: fontSize.base,
    color: colors.textSecondary,
    lineHeight: 20,
  },
});

export default SendQuotationScreen;
