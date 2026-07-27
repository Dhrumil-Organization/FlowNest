// ─────────────────────────────────────────────────────────────
// FILE: src/screens/auth/RoleLoginScreen.tsx
// FIXED: removes repeated iOS password-save / biometric prompt loop.
// Login still stores token + app_session and opens dashboard directly.
// ─────────────────────────────────────────────────────────────

import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { performLogin } from '../../core/authFlow';
import { getBiometricLabel, isBiometricSupported } from '../../lib/biometricAuth';
import { T } from '../../theme';

export function RoleLoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const [bioSupported, setBioSupported] = useState(false);
  const [bioLabel, setBioLabel] = useState('Biometric login');
  const [wantsBiometric, setWantsBiometric] = useState(true);

  useEffect(() => {
    (async () => {
      const supported = await isBiometricSupported();
      setBioSupported(supported);
      if (supported) setBioLabel(await getBiometricLabel());
    })();
  }, []);

  const canSubmit = useMemo(
    () => username.trim().length > 0 && password.trim().length > 0 && !loading,
    [username, password, loading]
  );

  const handleLogin = async () => {
    if (!canSubmit) return;

    setLoading(true);
    try {
      const outcome = await performLogin(username, password, bioSupported && wantsBiometric);
      if (!outcome.success) {
        Alert.alert('Login failed', outcome.message);
      }
      // On success, AppSessionStore's token flips to truthy and the
      // route watching it (app/new/role-login.tsx) redirects into the
      // app automatically — no navigation call needed here.
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.wrap}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.hero}>
          <Text style={styles.brand}>MADHUSUDHAN FABRICS</Text>
          <Text style={styles.title}>Sign in</Text>
          <Text style={styles.sub}>
            Username and password only. Year, property, group and store are derived automatically from your ERP user defaults.
          </Text>
        </View>

        <View style={styles.panel}>
          <View style={styles.contextCard}>
            <Text style={styles.contextLabel}>MOBILE PLATFORM CORE</Text>
            <Text style={styles.contextTitle}>Secure ERP session</Text>
            <Text style={styles.contextSub}>
              Login creates business context + permission context for every screen.
            </Text>
          </View>

          <Text style={styles.label}>USERNAME</Text>
          <TextInput
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="off"
            textContentType="none"
            importantForAutofill="no"
            placeholder="Enter username"
            placeholderTextColor={T.muted}
            style={styles.input}
          />

          <Text style={styles.label}>PASSWORD</Text>
          <View style={styles.passwordRow}>
            <TextInput
              value={password}
              onChangeText={setPassword}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="off"
              textContentType="oneTimeCode"
              importantForAutofill="noExcludeDescendants"
              secureTextEntry={!showPassword}
              placeholder="Enter password"
              placeholderTextColor={T.muted}
              style={[styles.input, styles.passwordInput]}
            />
            <TouchableOpacity onPress={() => setShowPassword((v) => !v)} style={styles.eyeBtn}>
              <Text style={styles.eyeText}>{showPassword ? 'Hide' : 'Show'}</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            onPress={handleLogin}
            disabled={!canSubmit}
            activeOpacity={0.85}
            style={[styles.loginBtn, !canSubmit && styles.loginBtnDisabled]}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.loginText}>Login</Text>
            )}
          </TouchableOpacity>

          {bioSupported && (
            <View style={styles.bioBox}>
              <Text style={styles.bioIcon}>◉</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.bioTitle}>Enable {bioLabel}</Text>
                <Text style={styles.bioSub}>Skip the password next time you open the app.</Text>
              </View>
              <Switch
                value={wantsBiometric}
                onValueChange={setWantsBiometric}
                trackColor={{ true: T.copper }}
              />
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: T.nav },
  wrap: { flex: 1 },
  hero: { paddingHorizontal: 24, paddingTop: 34, paddingBottom: 26 },
  brand: { fontSize: 10, color: '#6F91AD', fontWeight: '800', letterSpacing: 1.7, marginBottom: 8 },
  title: { fontSize: 32, lineHeight: 38, fontWeight: '900', color: '#fff', marginBottom: 8 },
  sub: { fontSize: 13, color: '#A9C0D4', lineHeight: 19, maxWidth: 340 },
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
  contextLabel: { fontSize: 10, color: T.copper, fontWeight: '900', letterSpacing: 0.8, marginBottom: 5 },
  contextTitle: { fontSize: 18, color: T.ink, fontWeight: '900', marginBottom: 4 },
  contextSub: { fontSize: 12, color: T.muted, lineHeight: 17 },
  label: { fontSize: 10, color: T.muted, fontWeight: '900', letterSpacing: 0.7, marginTop: 12, marginBottom: 7 },
  input: {
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 13,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    color: T.ink,
  },
  passwordRow: { position: 'relative' },
  passwordInput: { paddingRight: 70 },
  eyeBtn: { position: 'absolute', right: 8, top: 8, paddingHorizontal: 10, paddingVertical: 7 },
  eyeText: { color: T.copper, fontSize: 12, fontWeight: '800' },
  loginBtn: {
    marginTop: 22,
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
  loginBtnDisabled: { opacity: 0.45 },
  loginText: { color: '#fff', fontSize: 15, fontWeight: '900', letterSpacing: 0.3 },
  bioBox: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    backgroundColor: T.sub,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: T.border,
    padding: 13,
    marginTop: 16,
  },
  bioIcon: { color: T.green, fontSize: 18, fontWeight: '900' },
  bioTitle: { color: T.ink, fontSize: 13, fontWeight: '900' },
  bioSub: { color: T.muted, fontSize: 11, marginTop: 2 },
});

export default RoleLoginScreen;
