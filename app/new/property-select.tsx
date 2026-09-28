import AppAlert from '@/common/utils/appAlert';
import AsyncStorage from '@/common/utils/compatibleStorage';
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
    <AuthShell
      eyebrow="NEW ERP SYSTEM"
      title="Select Property"
      subtitle="Choose the business environment for New ERP. This selection determines which ERP API server is used for login and all subsequent requests."
      onBack={goBack}
      brandTitle="Choose your business environment"
      brandSubtitle="Your New ERP theme, login and dashboard remain separate from Legacy ERP."
      highlights={[
        { icon: 'apartment', title: 'Sudamo / Knits', desc: 'Use the Sudamo / Knits New ERP environment.' },
        { icon: 'domain', title: 'Rayons', desc: 'Use the Rayons New ERP environment.' },
        { icon: 'swap-horiz', title: 'Switch anytime', desc: 'Change property again from the ERP selection flow.' },
      ]}
    >
      <InfoNote icon="layers" style={{ marginTop: 0, marginBottom: 18 }}>
        Business environment — your New ERP theme, login and dashboard remain separate from Legacy ERP.
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
        label="Continue to New ERP Login"
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
