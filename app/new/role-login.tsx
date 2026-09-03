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

import { Redirect, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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
    <SafeAreaView style={styles.safe}>
      <View style={styles.center}>
        <Text style={styles.brand}>MADHUSUDHAN FABRICS</Text>

        <Text style={styles.title}>Welcome back</Text>

        <Text style={styles.sub}>
          Auto Login confirms it&apos;s you with your {bioLabel}, then
          signs you in with your saved details.
        </Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity
          style={[styles.primaryBtn, busy && styles.btnDisabled]}
          onPress={handleAutoLogin}
          disabled={busy}
          activeOpacity={0.85}
        >
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryText}>Auto Login</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={onManual}
          disabled={busy}
        >
          <Text style={styles.secondaryText}>
            Login manually instead
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
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
  safe: {
    flex: 1,
    backgroundColor: T.nav,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  brand: {
    fontSize: 10,
    color: '#6F91AD',
    fontWeight: '800',
    letterSpacing: 1.7,
    marginBottom: 14,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#fff',
    marginBottom: 10,
  },
  sub: {
    fontSize: 13,
    color: '#A9C0D4',
    lineHeight: 19,
    textAlign: 'center',
    marginBottom: 26,
  },
  error: {
    color: '#E38B8B',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 16,
  },
  primaryBtn: {
    width: '100%',
    height: 52,
    borderRadius: 15,
    backgroundColor: T.copper,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  primaryText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '900',
  },
  secondaryBtn: {
    paddingVertical: 10,
  },
  secondaryText: {
    color: '#A9C0D4',
    fontSize: 13,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
});
