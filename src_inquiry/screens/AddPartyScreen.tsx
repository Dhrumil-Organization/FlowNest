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
import Input from '../components/Input';
import Button from '../components/Button';
import { masterApi } from '../services/masterApi';
import { RootStackParamList, Party } from '../types';
import { isValidEmail, isValidGSTIN, isValidMobile } from '../utils/validators';
import HeaderBarwithBack from '../../components/HeaderBarwithBack/HeaderBarwithBack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCurrentFinancialYear } from '../../common/commonfunction';

type Props = NativeStackScreenProps<RootStackParamList, 'AddParty'>;

const AddPartyScreen: React.FC<Props> = ({ route, navigation, username }) => {
  const { onSaved, gstin: initialGstin } = route.params;

  const [gstin, setGstin] = useState(initialGstin || '');
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);

  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');
  const [contact, setContact] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');

  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
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

  const verifyGstin = async (getUserPrptype) => {
    const g = gstin.trim().toUpperCase();
    if (!isValidGSTIN(g)) {
      Alert.alert('Invalid GSTIN', 'Please enter a valid 15-digit GSTIN');
      return;
    }
    setVerifying(true);
    try {
      const data = await masterApi.fetchGstin(g, getUserPrptype, getCurrentFinancialYear());
      setName(data.trade_name || data.legal_name);
      setAddress(data.address);
      setCity(data.city);
      setState(data.state);
      setPincode(data.pincode);
      setVerified(true);
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message || 'Unable to fetch GSTIN');
    } finally {
      setVerifying(false);
    }
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Required';
    if (mobile && !isValidMobile(mobile)) e.mobile = 'Invalid mobile';
    if (email && !isValidEmail(email)) e.email = 'Invalid email';
    setErrors(e);
    return Object.keys(e).length === 0;
  };
  const save = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const partyData: Party = {
        prp_code: getUserPrptype,
        acc_code: '',
        name: name.trim(),
        address: address.trim(),
        city: city.trim(),
        state: state.trim(),
        pincode: pincode.trim(),
        gstin: gstin.trim() || undefined,
        mobile: mobile.trim() || undefined,
        email: email.trim() || undefined,
        contact: contact.trim() || undefined,
      };
      onSaved(partyData); // ✅ Bas itna kaam hai
      // navigation.goBack();
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message || 'Failed to save party');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <HeaderBarwithBack
        userName={username}
        header={'Party via GSTIN'}
        subHeader={'Enter your Party details'}
      />
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.bg }}
        contentContainerStyle={{ padding: spacing.md, paddingBottom: 40 }}>
        <View style={styles.gstinRow}>
          <View style={{ flex: 1 }}>
            <Input
              label="GSTIN"
              required
              value={gstin}
              onChangeText={t => {
                setGstin(t.toUpperCase());
                setVerified(false);
              }}
              placeholder="22AAAAA0000A1Z5"
              autoCapitalize="characters"
              maxLength={15}
            />
          </View>
          <TouchableOpacity
            onPress={() => verifyGstin(getUserPrptype)}
            disabled={verifying}
            style={styles.verifyBtn}>
            <Text style={styles.verifyText}>
              {verifying ? '...' : 'Verify'}
            </Text>
          </TouchableOpacity>
        </View>

        {verified ? (
          <View style={styles.banner}>
            <Text style={styles.bannerText}>✓ GSTIN verified - data fetched</Text>
          </View>
        ) : null}

        <Input
          label="Party Name"
          required
          value={name}
          onChangeText={setName}
          error={errors.name}
          placeholder="Enter party name"
        />

        <Input
          label="Address"
          value={address}
          onChangeText={setAddress}
          multiline
          placeholder="Enter address"
        />

        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <View style={{ flex: 1 }}>
            <Input label="City" value={city} onChangeText={setCity} />
          </View>
          <View style={{ flex: 1 }}>
            <Input label="Pincode" value={pincode} onChangeText={setPincode} keyboardType="numeric" />
          </View>
        </View>

        <Input label="State" value={state} onChangeText={setState} />

        <Input
          label="Contact Person"
          value={contact}
          onChangeText={setContact}
          placeholder="Enter contact name"
        />

        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <View style={{ flex: 1 }}>
            <Input
              label="Mobile"
              value={mobile}
              onChangeText={setMobile}
              keyboardType="phone-pad"
              error={errors.mobile}
              placeholder="10-digit"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Input
              label="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              error={errors.email}
              placeholder="email@..."
            />
          </View>
        </View>

        <Button
          title="Save & Continue"
          onPress={save}
          loading={saving}
          style={{ marginTop: spacing.md }}
        />
      </ScrollView>
    </>
  );
};

const styles = StyleSheet.create({
  gstinRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm },
  verifyBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 11,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    marginBottom: spacing.md,
  },
  verifyText: { color: colors.white, fontWeight: '500', fontSize: fontSize.md },
  banner: {
    backgroundColor: colors.successBg,
    borderLeftWidth: 3,
    borderLeftColor: colors.success,
    padding: spacing.sm + 2,
    marginBottom: spacing.md,
  },
  bannerText: { color: colors.success, fontSize: fontSize.sm, fontWeight: '500' },
});

export default AddPartyScreen;
