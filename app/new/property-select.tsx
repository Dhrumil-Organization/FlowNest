import AppAlert from '@/common/utils/appAlert';
import AsyncStorage from '@/common/utils/compatibleStorage';
import { ensureSingleErp } from '@/src/core/singleErp';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';

import type { NewErpProperty } from '@/src/api/client';
import { setNewErpProperty } from '@/src/api/client';
import { AuthButton, AuthShell, FieldLabel, InfoNote, OptionCard } from '@/src/components/auth/AuthUI';

type PropertyOption = {
  label: string;
  value: NewErpProperty;
  description: string;
};

const PROPERTIES: PropertyOption[] = [
  {
    label: 'Sudamo/Knits',
    value: 'sudamo_knits',
    description: 'Use the Sudamo / Knits ERP environment.',
  },
  {
    label: 'Rayons',
    value: 'rayons',
    description: 'Use the Rayons ERP environment.',
  },
];

export default function NewErpPropertySelectScreen() {
  const router = useRouter();
  const [selected, setSelected] = useState<NewErpProperty | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      // One ERP: no platform selection before this screen any more.
      await ensureSingleErp();
      const property = await AsyncStorage.getItem('selected_property');

      if (!mounted) return;

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
      console.error('Unable to save ERP property:', error);
      AppAlert.alert('Error', 'Unable to save the selected property. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const goBack = () => {
    router.replace('/(all)/landing');
  };

  return (
    <AuthShell
      eyebrow="MADHUSUDHAN FABRICS"
      title="Select Property"
      subtitle="Choose the business environment. This selection determines which ERP API server is used for login and all subsequent requests."
      onBack={goBack}
      brandTitle="Choose your business environment"
      brandSubtitle="Pick the business you work in — your login, rights and dashboard follow it."
      highlights={[
        { icon: 'apartment', title: 'Sudamo / Knits', desc: 'Use the Sudamo / Knits ERP environment.' },
        { icon: 'domain', title: 'Rayons', desc: 'Use the Rayons ERP environment.' },
        { icon: 'swap-horiz', title: 'Switch anytime', desc: 'Change property again from the ERP selection flow.' },
      ]}
    >
      <InfoNote icon="layers" style={{ marginTop: 0, marginBottom: 18 }}>
        Business environment — your login, rights and dashboard follow the property you pick.
      </InfoNote>

      <FieldLabel>PROPERTY</FieldLabel>

      {PROPERTIES.map((property) => (
        <OptionCard
          key={property.value}
          title={property.label}
          description={property.description}
          icon="apartment"
          active={selected === property.value}
          onPress={() => setSelected(property.value)}
        />  
      ))}

      <AuthButton
        label="Continue to Login"
        icon="arrow-forward"
        onPress={handleContinue}
        disabled={!selected || loading}
        loading={loading}
        style={{ marginTop: 8 }}
      />

      <InfoNote icon="info-outline">
        Property selection is stored on this device and can be changed again from the ERP selection flow.
      </InfoNote>
    </AuthShell>
  );
}
