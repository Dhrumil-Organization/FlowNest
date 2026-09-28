// ─────────────────────────────────────────────────────────────
// FILE: app/new/role-login.tsx
//
// Production-safe New ERP login route.
//
// Route responsibilities:
//   1. Manual login selected from New ERP Property Selection.
//   2. Optional Auto Login for a remembered New ERP login.
//   3. Redirect every successfully authenticated New ERP session to
//      /new/(tabs), including sessions entered with ?manual=1.
//
// IMPORTANT:
// Successful authentication is checked BEFORE forceManual. This
// prevents ?manual=1 from permanently trapping the user on the login
// screen after performLogin() has already stored the token.
// ─────────────────────────────────────────────────────────────

import Icon from '@expo/vector-icons/MaterialIcons';
import { Redirect, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AuthButton, AuthShell } from '@/src/components/auth/AuthUI';

import { performLogin } from '@/src/core/authFlow';
import {
  authenticateWithBiometrics,
  getBiometricLabel,
  getCredentialsForBiometric,
} from '@/src/lib/biometricAuth';
import { RoleLoginScreen } from '@/src/screens/auth/RoleLoginScreen';
import { useAppSessionStore } from '@/src/stores/AppSessionStore';
import { T } from '@/src/theme';

function AutoOrManualGate({ onManual }: { onManual: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bioLabel, setBioLabel] = useState('Screen Lock');

  React.useEffect(() => {
    void getBiometricLabel().then(setBioLabel);
  }, []);

  const handleAutoLogin = async () => {
    if (busy) return;

    setBusy(true);
    setError(null);

    try {
      const confirmed = await authenticateWithBiometrics(
        'Confirm to auto login'
      );

      if (!confirmed) {
        setError('Could not confirm. Try again, or log in manually.');
        return;
      }

      const creds = await getCredentialsForBiometric();

      if (!creds) {
        setError('No saved login found. Please log in manually.');
        return;
      }

      const outcome = await performLogin(
        creds.username,
        creds.password
      );

      if (!outcome.success) {
        setError(outcome.message || 'Auto login failed.');
      }

      // On success performLogin() writes the token and sets
      // freshLogin=true. RoleLoginRoute then redirects to /new/(tabs).
    } catch (error: any) {
      setError(error?.message || 'Auto login failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell
      eyebrow="NEW ERP SYSTEM"
      title="Welcome back"
      subtitle={`Auto Login confirms it's you with your ${bioLabel}, then signs you in with your saved details.`}
      brandTitle="Welcome back to the New ERP"
      brandSubtitle="Your saved login is protected by your device screen lock."
    >
      <View style={styles.bioHero}>
        <View style={styles.bioCircle}>
          <Icon name="fingerprint" size={40} color={T.copper} />
        </View>
        <Text style={styles.bioHeroText}>Confirm with {bioLabel}</Text>
      </View>

      {error ? (
        <View style={styles.errorBox}>
          <Icon name="error-outline" size={18} color={T.red} />
          <Text style={styles.error}>{error}</Text>
        </View>
      ) : null}

      <AuthButton
        label="Auto Login"
        icon="arrow-forward"
        onPress={handleAutoLogin}
        disabled={busy}
        loading={busy}
      />

      <AuthButton
        label="Login manually instead"
        variant="secondary"
        onPress={onManual}
        disabled={busy}
        style={{ marginTop: 12 }}
      />
    </AuthShell>
  );
}

export default function RoleLoginRoute() {
  const params = useLocalSearchParams<{ manual?: string }>();

  const token = useAppSessionStore((s) => s.token);
  const biometricEnabled = useAppSessionStore(
    (s) => s.biometricEnabled
  );
  const freshLogin = useAppSessionStore((s) => s.freshLogin);

  const [forceManual, setForceManual] = useState(
    params.manual === '1'
  );

  console.log('RoleLoginRoute', {
    hasToken: !!token,
    biometricEnabled,
    freshLogin,
    forceManual,
  });

  // CRITICAL:
  // A successful manual or automatic login must always leave the login
  // route. This check must stay ABOVE forceManual.
  if (token && freshLogin) {
    return <Redirect href="/new/(tabs)" />;
  }

  // The New ERP property screen deliberately sends ?manual=1 so an
  // older remembered session cannot bypass the selected property's
  // login screen. Before authentication, keep showing the manual form.
  if (forceManual) {
    return <RoleLoginScreen />;
  }

  // No usable session and no remembered-login facility.
  if (!token && !biometricEnabled) {
    return <RoleLoginScreen />;
  }

  // Remembered credentials exist but there is no active token.
  if (!token && biometricEnabled) {
    return (
      <AutoOrManualGate
        onManual={() => setForceManual(true)}
      />
    );
  }

  // Existing authenticated New ERP session.
  return <Redirect href="/new/(tabs)" />;
}

const styles = StyleSheet.create({
  bioHero: {
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 18,
  },
  bioCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bioHeroText: {
    marginTop: 12,
    fontSize: 13,
    fontWeight: '800',
    color: T.muted,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FCF4F2',
    borderWidth: 1,
    borderColor: '#F0D2CC',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  error: {
    flex: 1,
    color: T.red,
    fontSize: 12.5,
    fontWeight: '600',
  },
});
