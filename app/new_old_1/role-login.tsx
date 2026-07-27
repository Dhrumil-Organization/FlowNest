// ─────────────────────────────────────────────────────────────
// FILE: app/new/role-login.tsx
//
// THREE distinct screens on this route — only ONE ever renders at
// a time (no more stacking a failed-gate message on top of a half
// visible login form):
//
//   1. RoleLoginScreen        -> no token at all: normal id/password.
//   2. WelcomeBackGate        -> token exists + biometric is ON +
//                                 this is a fresh app open/resume
//                                 (not the instant after a manual
//                                 login): ask "unlock with Face ID /
//                                 Fingerprint / Screen Lock, or use a
//                                 different ID?"
//   3. Redirect to (tabs)     -> token exists and either biometric is
//                                 off, or we just logged in / just
//                                 unlocked successfully.
//
// On a successful unlock we pull the securely stored username +
// password and call performLogin() again automatically — same as a
// banking app: fingerprint -> credentials auto-filled -> login
// button effectively pressed for you.
// ─────────────────────────────────────────────────────────────
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Redirect } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { performLogin } from '@/src/core/authFlow';
import {
  authenticateWithBiometrics,
  clearCredentialsForBiometric,
  getBiometricLabel,
  getCredentialsForBiometric,
} from '@/src/lib/biometricAuth';
import { RoleLoginScreen } from '@/src/screens/auth/RoleLoginScreen';
import { useAppSessionStore } from '@/src/stores/AppSessionStore';
import { T } from '@/src/theme';

function WelcomeBackGate({ onUseDifferentId }: { onUseDifferentId: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bioLabel, setBioLabel] = useState('Biometric login');

  React.useEffect(() => {
    void getBiometricLabel().then(setBioLabel);
  }, []);

  const handleUnlock = async () => {
    setBusy(true);
    setError(null);
    try {
      const ok = await authenticateWithBiometrics('Unlock to continue');
      if (!ok) {
        setError('Unlock failed. Try again, or use a different ID.');
        return;
      }

      const creds = await getCredentialsForBiometric();
      if (!creds) {
        setError('No saved login found. Please log in with your ID.');
        return;
      }

      const outcome = await performLogin(creds.username, creds.password, true);
      if (!outcome.success) {
        setError(outcome.message);
      }
      // On success, freshLogin flips true + token is set -> this
      // component's parent re-renders and redirects to (tabs).
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
          Unlock with {bioLabel.toLowerCase()} to continue, or sign in with a different ID.
        </Text>

        {error && <Text style={styles.error}>{error}</Text>}

        <TouchableOpacity
          style={[styles.primaryBtn, busy && styles.btnDisabled]}
          onPress={handleUnlock}
          disabled={busy}
          activeOpacity={0.85}
        >
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Unlock with {bioLabel}</Text>}
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryBtn} onPress={onUseDifferentId} disabled={busy}>
          <Text style={styles.secondaryText}>Login with a different ID</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

export default function RoleLoginRoute() {
  const token = useAppSessionStore((s) => s.token);
  const biometricEnabled = useAppSessionStore((s) => s.biometricEnabled);
  const freshLogin = useAppSessionStore((s) => s.freshLogin);

  const useDifferentId = async () => {
    // Local, in-place "switch account" — clears the session + saved
    // biometric credentials but stays on this screen (no bounce
    // through a landing/logout route), then shows the plain login form.
    await AsyncStorage.multiRemove([
      'access_token',
      'app_session',
      'mobile_user',
      'mobile_raw_login_response',
      'biometric_enabled',
    ]);
    await clearCredentialsForBiometric();
    useAppSessionStore.setState({
      token: null,
      user: null,
      appSession: null,
      rawLoginResponse: null,
      biometricEnabled: false,
      freshLogin: false,
    });
  };

  // No session at all -> plain login form.
  if (!token) return <RoleLoginScreen />;

  // We just logged in or just auto-unlocked in THIS app session ->
  // go straight in, no gate needed.
  if (freshLogin) return <Redirect href="/new/(tabs)" />;

  // Returning to the app with a saved session + biometric ON ->
  // ask the person how they want to get in.
  if (biometricEnabled) {
    return <WelcomeBackGate onUseDifferentId={useDifferentId} />;
  }

  // Saved session, biometric OFF -> trust the token, go straight in.
  return <Redirect href="/new/(tabs)" />;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: T.nav },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 },
  brand: { fontSize: 10, color: '#6F91AD', fontWeight: '800', letterSpacing: 1.7, marginBottom: 14 },
  title: { fontSize: 28, fontWeight: '900', color: '#fff', marginBottom: 10 },
  sub: { fontSize: 13, color: '#A9C0D4', lineHeight: 19, textAlign: 'center', marginBottom: 26 },
  error: { color: '#E38B8B', fontSize: 12, textAlign: 'center', marginBottom: 16 },
  primaryBtn: {
    width: '100%',
    height: 52,
    borderRadius: 15,
    backgroundColor: T.copper,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  btnDisabled: { opacity: 0.6 },
  primaryText: { color: '#fff', fontSize: 15, fontWeight: '900' },
  secondaryBtn: { paddingVertical: 10 },
  secondaryText: { color: '#A9C0D4', fontSize: 13, fontWeight: '700', textDecorationLine: 'underline' },
});
