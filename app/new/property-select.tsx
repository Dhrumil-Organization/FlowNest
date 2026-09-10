import AppAlert from '@/common/utils/appAlert';
import Icon from '@expo/vector-icons/MaterialIcons';
import AsyncStorage from '@/common/utils/compatibleStorage';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { setNewErpProperty } from '@/src/api/client';
import type { NewErpProperty } from '@/src/api/client';
import { T } from '@/src/theme';

type PropertyOption = {
  label: string;
  value: NewErpProperty;
  description: string;
};

const PROPERTIES: PropertyOption[] = [
  {
    label: 'Sudamo/Knits',
    value: 'sudamo_knits',
    description: 'Use the Sudamo / Knits New ERP environment.',
  },
  {
    label: 'Rayons',
    value: 'rayons',
    description: 'Use the Rayons New ERP environment.',
  },
];

export default function NewErpPropertySelectScreen() {
  const router = useRouter();
  const [selected, setSelected] = useState<NewErpProperty | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      const [platform, property] = await Promise.all([
        AsyncStorage.getItem('LOOKUP_PLATFORM'),
        AsyncStorage.getItem('selected_property'),
      ]);

      if (!mounted) return;

      // This screen is part of the New ERP flow only.
      if (platform !== 'NEW') {
        router.replace('/(all)/lookup-select');
        return;
      }

      if (property === 'sudamo_knits' || property === 'rayons') {
        setSelected(property);
      }
    };

    void load();
    return () => {
      mounted = false;
    };
  }, [router]);

  const handleContinue = async () => {
    if (!selected) {
      AppAlert.alert('Property Required', 'Please select a property to continue.');
      return;
    }

    try {
      setLoading(true);
      await setNewErpProperty(selected);
      router.replace('/new/role-login?manual=1');
    } catch (error) {
      console.error('Unable to save New ERP property:', error);
      AppAlert.alert('Error', 'Unable to save the selected property. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const goBack = () => {
    router.replace('/(all)/lookup-select');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={T.nav} />

      <View style={styles.hero}>
        <View style={styles.topRow}>
          <TouchableOpacity activeOpacity={0.85} onPress={goBack} style={styles.backButton}>
            <Icon name="arrow-back-ios-new" size={18} color="#FFFFFF" />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>

          <Text numberOfLines={1} adjustsFontSizeToFit style={styles.brand}>
            MADHUSUDHAN FABRICS
          </Text>

          <View style={styles.rightSpacer} />
        </View>

        <Text style={styles.title}>Select Property</Text>
        <Text style={styles.sub}>
          Choose the business environment for New ERP. This selection determines which ERP API server is used for login and all subsequent requests.
        </Text>
      </View>

      <View style={styles.panel}>
        <View style={styles.contextCard}>
          <Text style={styles.contextLabel}>NEW ERP SYSTEM</Text>
          <Text style={styles.contextTitle}>Business environment</Text>
          <Text style={styles.contextSub}>
            Your New ERP theme, login and dashboard remain separate from Legacy ERP.
          </Text>
        </View>

        <Text style={styles.sectionLabel}>PROPERTY</Text>

        {PROPERTIES.map((property) => {
          const active = selected === property.value;

          return (
            <TouchableOpacity
              key={property.value}
              activeOpacity={0.86}
              onPress={() => setSelected(property.value)}
              style={[styles.propertyCard, active && styles.propertyCardActive]}
            >
              <View style={[styles.iconCircle, active && styles.iconCircleActive]}>
                <Icon name="apartment" size={24} color={active ? '#FFFFFF' : T.copper} />
              </View>

              <View style={styles.propertyTextWrap}>
                <Text style={styles.propertyTitle}>{property.label}</Text>
                <Text style={styles.propertyDescription}>{property.description}</Text>
              </View>

              <View style={[styles.radio, active && styles.radioActive]}>
                {active && <View style={styles.radioInner} />}
              </View>
            </TouchableOpacity>
          );
        })}

        <TouchableOpacity
          activeOpacity={0.86}
          disabled={!selected || loading}
          onPress={handleContinue}
          style={[styles.continueButton, (!selected || loading) && styles.continueButtonDisabled]}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.continueText}>Continue to New ERP Login</Text>
          )}
        </TouchableOpacity>

        <View style={styles.infoBox}>
          <View style={styles.infoDot} />
          <Text style={styles.infoText}>
            Property selection is stored on this device and can be changed again from the ERP selection flow.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: T.nav,
  },
  hero: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 28,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  backButton: {
    width: 70,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backText: {
    color: '#FFFFFF',
    fontSize: 15,
    marginLeft: 4,
    fontWeight: '600',
  },
  brand: {
    flex: 1,
    textAlign: 'center',
    color: '#B6B6B6',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 2,
    paddingHorizontal: 10,
  },
  rightSpacer: {
    width: 70,
  },
  title: {
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  sub: {
    fontSize: 13,
    color: '#A9C0D4',
    lineHeight: 19,
    maxWidth: 360,
  },
  panel: {
    flex: 1,
    backgroundColor: T.bg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 18,
    paddingTop: 20,
  },
  contextCard: {
    backgroundColor: T.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: T.border,
    padding: 16,
    marginBottom: 18,
  },
  contextLabel: {
    fontSize: 10,
    color: T.copper,
    fontWeight: '900',
    letterSpacing: 0.8,
    marginBottom: 5,
  },
  contextTitle: {
    fontSize: 18,
    color: T.ink,
    fontWeight: '900',
    marginBottom: 4,
  },
  contextSub: {
    fontSize: 12,
    color: T.muted,
    lineHeight: 17,
  },
  sectionLabel: {
    fontSize: 10,
    color: T.muted,
    fontWeight: '900',
    letterSpacing: 0.7,
    marginBottom: 8,
  },
  propertyCard: {
    minHeight: 88,
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  propertyCardActive: {
    borderColor: T.copper,
    borderWidth: 2,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: T.sub,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  iconCircleActive: {
    backgroundColor: T.copper,
  },
  propertyTextWrap: {
    flex: 1,
    paddingRight: 10,
  },
  propertyTitle: {
    color: T.ink,
    fontSize: 15,
    fontWeight: '900',
    marginBottom: 4,
  },
  propertyDescription: {
    color: T.muted,
    fontSize: 12,
    lineHeight: 17,
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: T.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioActive: {
    borderColor: T.copper,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: T.copper,
  },
  continueButton: {
    marginTop: 10,
    height: 52,
    borderRadius: 15,
    backgroundColor: T.copper,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: T.copper,
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
  },
  continueButtonDisabled: {
    opacity: 0.45,
  },
  continueText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
  infoBox: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: T.sub,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: T.border,
    padding: 13,
  },
  infoDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: T.green,
    marginTop: 4,
    marginRight: 9,
  },
  infoText: {
    flex: 1,
    color: T.muted,
    fontSize: 11,
    lineHeight: 16,
  },
});
