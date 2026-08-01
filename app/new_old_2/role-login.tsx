// ─────────────────────────────────────────────────────────────
// FILE: app/new/role-login.tsx
//
// THREE distinct screens on this route — only ONE ever renders at
// a time:
//
//   1. RoleLoginScreen   -> no saved session at all, OR the person
//                            picked "Manual" below: normal id/password
//                            form (with its own "Remember me" toggle).
//   2. AutoOrManualGate   -> a saved session + "Remember me" was on
//                            from a previous login, AND this is a
//                            fresh app open/resume (not the instant
//                            after a login/auto-login just happened):
//                            ask "Auto Login or Manual?"
//   3. Redirect to (tabs) -> session exists and either Remember-me is
//                            off, or we just logged in / just
//                            auto-logged-in successfully.
//
// Auto Login: prompts the device's own lock (Face ID / Fingerprint /
// PIN / pattern — whatever the person already uses to unlock their
// phone), and only if THAT succeeds, pulls the securely saved
// username + password and logs in automatically — same as a banking
// app: unlock -> credentials auto-filled -> login button effectively
// pressed for you.
// ─────────────────────────────────────────────────────────────
import { Redirect } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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
    setBusy(true);
    setError(null);
    try {
      // Step 1: prove it's really them, using whatever lock method
      // their phone already has set up.
      const confirmed = await authenticateWithBiometrics('Confirm to auto login');
      if (!confirmed) {
        setError('Could not confirm. Try again, or log in manually.');
        return;
      }

      // Step 2: only after that succeeds, pull the saved credentials
      // and log in with them automatically.
      const creds = await getCredentialsForBiometric();
      if (!creds) {
        setError('No saved login found. Please log in manually.');
        return;
      }

      const outcome = await performLogin(creds.username, creds.password); // no rememberAction: leave saved state as-is
      if (!outcome.success) {
        setError(outcome.message || 'Auto login failed.');
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
          Auto Login confirms it's you with your {bioLabel}, then signs you in with your saved details.
        </Text>

        {error && <Text style={styles.error}>{error}</Text>}

        <TouchableOpacity
          style={[styles.primaryBtn, busy && styles.btnDisabled]}
          onPress={handleAutoLogin}
          disabled={busy}
          activeOpacity={0.85}
        >
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Auto Login</Text>}
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryBtn} onPress={onManual} disabled={busy}>
          <Text style={styles.secondaryText}>Login manually instead</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

export default function RoleLoginRoute() {
  const token = useAppSessionStore((s) => s.token);
  const biometricEnabled = useAppSessionStore((s) => s.biometricEnabled);
  const freshLogin = useAppSessionStore((s) => s.freshLogin);
  const [forceManual, setForceManual] = useState(false);
  console.log('RoleLoginRoute', { token, biometricEnabled, freshLogin, forceManual });

  // No session at all -> plain login form.
  if (!token && !biometricEnabled) return <RoleLoginScreen />;

  // We just logged in, or Auto Login just succeeded, in THIS app
  // session -> go straight in, no gate needed.
  if (freshLogin) return <Redirect href="/new/(tabs)" />;

  // Person explicitly chose "Login manually instead" on the gate ->
  // show the normal form (their old session/token is simply replaced
  // once they submit a fresh login).
  if (forceManual) return <RoleLoginScreen />;

  // Returning to the app with a saved session + Remember-me ON ->
  // ask Auto or Manual.
  if (!token && biometricEnabled) {
    return <AutoOrManualGate onManual={() => setForceManual(true)} />;
  }

  // Saved session, Remember-me OFF -> trust the token, go straight in.
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
