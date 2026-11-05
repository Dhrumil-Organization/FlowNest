import AppAlert from '@/common/utils/appAlert';
import AsyncStorage from '@/common/utils/compatibleStorage';
import Icon from '@expo/vector-icons/MaterialIcons';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';
import {
  AuthButton,
  AuthField,
  AuthShell,
  CheckItem,
  ChecklistBox,
  PasswordToggle,
} from '../../components/auth/AuthUI';
import { getActiveNewErpProperty, performLogin } from '../../core/authFlow';
import {
  getRememberedLogin,
  getRememberSupport,
  saveRememberedLogin,
  type RememberSupport,
} from '../../lib/rememberedLogin';
import { T } from '../../theme';

type PasswordValidation = {
  minLength: boolean;
  hasUppercase: boolean;
  hasSpecialChar: boolean;
  hasNumber: boolean;
};

const ValidationItem = ({ label, valid }: { label: string; valid: boolean }) => (
  <CheckItem label={label} valid={valid} pendingIcon="cancel" />
);

const validatePassword = (pwd: string): PasswordValidation => ({
  minLength: pwd.length >= 8,
  hasUppercase: /[A-Z]/.test(pwd),
  hasSpecialChar: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd),
  hasNumber: /\d/.test(pwd),
});

const isPasswordValid = (v: PasswordValidation) => Object.values(v).every(Boolean);

/* ---------- FORM COMPONENT (owns ALL form state) ---------- */
function RoleLoginForm({ notice }: { notice?: string | null }) {
  const router = useRouter();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // "Remember me" is strictly opt-in: nothing is saved unless the user
  // switches it on here (it starts ON only if this property already has
  // a saved login on this device, so switching it OFF removes it).
  const [rememberSupport, setRememberSupport] = useState<RememberSupport | null>(null);
  const [rememberMe, setRememberMe] = useState(false);
  const [getNotitoken, setGetNotitoken] = useState('');
  const [getDeviceId, setGetDeviceId] = useState('');
  // Keep password validation derived from the current value.
  // This avoids a second state update/render on every mobile key press.
  const validation = useMemo(() => validatePassword(password), [password]);

  const handlePasswordChange = useCallback((text: string) => {
    setPassword(text);
  }, []);

  const requestPermissions = useCallback(async () => {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') {
      console.log('Notification permission denied');
      return false;
    }
    return true;
  }, []);

  const getFCMToken = useCallback(async () => {
    try {
      const hasPermission = await requestPermissions();
      if (!hasPermission) return null;
      const token = (await Notifications.getExpoPushTokenAsync()).data;
      if (token) {
        await AsyncStorage.setItem('notification_token', token);
        return token;
      }
    } catch (error) {
      console.error('Error getting Expo push token:', error);
      return null;
    }
  }, [requestPermissions]);

  useEffect(() => {
    const deviceId = Device.osInternalBuildId || 'test-device';
    setGetDeviceId(deviceId);
    getFCMToken().then((token) => {
      if (token) setGetNotitoken(token);
    });
  }, [getFCMToken]);

  useEffect(() => {
    let active = true;
    void (async () => {
      const [support, property] = await Promise.all([getRememberSupport(), getActiveNewErpProperty()]);
      const existing = await getRememberedLogin(property);
      if (!active) return;
      setRememberSupport(support);
      setRememberMe(Boolean(existing) && support.available);
    })();
    return () => {
      active = false;
    };
  }, []);

  const canSubmit = useMemo(
    () =>
      username.trim().length > 0 &&
      isPasswordValid(validation) &&
      !loading,
    [username, validation, loading]
  );

  const openNewErpDashboard = useCallback(() => {
    router.replace('/new/(tabs)');
  }, [router]);

  const handleLogin = useCallback(async () => {
    if (!canSubmit) return;
    if (!isPasswordValid(validation)) {
      AppAlert.alert('Error', 'Password does not meet security requirements');
      return;
    }

    setLoading(true);
    try {
      const rememberAction = rememberSupport?.available && rememberMe ? 'save' : 'clear';

      const outcome = await performLogin(
        username,
        password,
        rememberAction,
        getNotitoken,
        getDeviceId
      );

      if (!outcome.success) {
        AppAlert.alert('Login failed', outcome.message || 'Unable to login.');
        return;
      }

      // Safari (web) only opens Touch ID / Face ID inside a fresh tap. The
      // login already succeeded, so offer one more tap to finish saving.
      if (outcome.remember?.reason === 'needs-gesture') {
        const creds = { username: username.trim(), password: password.trim() };
        const hint = outcome.displayName || creds.username;
        const label = rememberSupport?.label || 'your device lock';
        openNewErpDashboard();
        AppAlert.alert(
          'Remember this login?',
          `Confirm with ${label} to finish saving your login on this browser.`,
          [
            { text: 'Not now', style: 'cancel' },
            {
              text: `Use ${label}`,
              onPress: () => {
                void (async () => {
                  const property = await getActiveNewErpProperty();
                  const result = await saveRememberedLogin(property, creds, hint);
                  if (!result.saved && result.message) AppAlert.alert('Remember me', result.message);
                })();
              },
            },
          ],
        );
        return;
      }

      if (outcome.message) {
        AppAlert.alert(
          'Note',
          outcome.message,
          [{ text: 'OK', onPress: openNewErpDashboard }],
          { cancelable: false }
        );
        return;
      }

      openNewErpDashboard();
    } catch (error: any) {
      AppAlert.alert('Login failed', error?.message || 'Unable to login.');
    } finally {
      setLoading(false);
    }
  }, [
    canSubmit,
    validation,
    rememberSupport,
    rememberMe,
    username,
    password,
    getNotitoken,
    getDeviceId,
    openNewErpDashboard,
  ]);

  const rememberDesc = !rememberSupport
    ? ''
    : !rememberSupport.available
    ? rememberSupport.reason || 'Remember me is not available on this device.'
    : rememberSupport.requiresUnlock
    ? `Next time choose Auto Login and confirm with your ${rememberSupport.label}. Saved encrypted on this device only.`
    : 'This computer has no screen lock, so Auto Login will sign you in directly. Saved encrypted on this browser only.';

  return (
    <>
      {notice ? (
        <View style={styles.noticeBox}>
          <Icon name="info-outline" size={17} color={T.copper} />
          <Text style={styles.noticeText}>{notice}</Text>
        </View>
      ) : null}

      <View style={styles.contextCard}>
        <View style={styles.contextIcon}>
          <Icon name="shield" size={18} color={T.copper} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.contextLabel}>MOBILE PLATFORM CORE</Text>
          <Text style={styles.contextTitle}>Secure ERP session</Text>
          <Text style={styles.contextSub}>
            Login creates business context + permission context for every screen.
          </Text>
        </View>
      </View>

      <AuthField
        label="USERNAME"
        icon="person-outline"
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="off"
        textContentType="none"
        importantForAutofill="no"
        placeholder="Enter username"
      />

      <AuthField
        label="PASSWORD"
        icon="lock-outline"
        value={password}
        onChangeText={handlePasswordChange}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="off"
        textContentType="password"
        importantForAutofill="no"
        secureTextEntry={!showPassword}
        placeholder="Enter password"
        onSubmitEditing={handleLogin}
        right={
          <PasswordToggle
            visible={showPassword}
            onToggle={() => setShowPassword((v) => !v)}
          />
        }
      />

      <ChecklistBox>
        <ValidationItem label="Minimum 8 characters" valid={validation.minLength} />
        <ValidationItem label="1 uppercase letter" valid={validation.hasUppercase} />
        <ValidationItem label="1 special character" valid={validation.hasSpecialChar} />
        <ValidationItem label="1 number" valid={validation.hasNumber} />
      </ChecklistBox>

      <AuthButton
        label="Login"
        icon="arrow-forward"
        onPress={handleLogin}
        disabled={!canSubmit}
        loading={loading}
        style={{ marginTop: 18 }}
      />

      {rememberSupport && (
        <View
          style={[
            styles.bioBox,
            rememberMe && rememberSupport.available && styles.bioBoxOn,
            !rememberSupport.available && styles.bioBoxDisabled,
          ]}
        >
          <View style={styles.bioIconWrap}>
            <Icon name={rememberSupport.icon as any} size={20} color={rememberSupport.available ? T.copper : T.muted} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.bioTitle}>Remember me</Text>
            <Text style={styles.bioSub}>{rememberDesc}</Text>
          </View>
          <Switch
            value={rememberMe && rememberSupport.available}
            onValueChange={setRememberMe}
            disabled={!rememberSupport.available || loading}
            trackColor={{ true: T.copper }}
            accessibilityLabel="Remember me"
          />
        </View>
      )}
    </>
  );
}

/* ---------- SHELL (does NOT re-render on typing) ---------- */
export function RoleLoginScreen({ notice, onBack }: { notice?: string | null; onBack?: () => void } = {}) {
  const router = useRouter();

  const goBack = useCallback(() => {
    router.replace('/new/property-select');
  }, [router]);

  const highlights = useMemo(
    () => [
      { icon: 'verified-user', title: 'Secure ERP session', desc: 'Role-based permissions applied to every module.' },
      { icon: 'apartment', title: 'Property aware', desc: 'Connects to the property you selected in the previous step.' },
      { icon: 'fingerprint', title: 'Remember me', desc: 'Next time sign in with Face ID, your phone screen lock or Windows Hello / Touch ID.' },
    ],
    []
  );

  return (
    <AuthShell
      eyebrow="MADHUSUDHAN FABRICS"
      title="Sign in"
      subtitle="Username and password only. Year, property, group and store are derived automatically from your ERP user defaults."
      onBack={onBack || goBack}
      brandTitle="Welcome to the ERP"
      brandSubtitle="Login creates your business context and permission context for every screen you open."
      highlights={highlights}
    >
      <RoleLoginForm notice={notice} />
    </AuthShell>
  );
}

export default RoleLoginScreen;

const styles = StyleSheet.create({
  contextCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: T.sub,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: T.border,
    padding: 14,
    marginBottom: 18,
  },
  contextIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  contextLabel: {
    fontSize: 10,
    color: T.copper,
    fontWeight: '900',
    letterSpacing: 0.8,
    marginBottom: 3,
  },
  contextTitle: { fontSize: 15, color: T.ink, fontWeight: '900', marginBottom: 2 },
  contextSub: { fontSize: 12, color: T.muted, lineHeight: 17 },
  bioBox: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    backgroundColor: T.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: T.border,
    padding: 13,
    marginTop: 16,
  },
  bioIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: T.sub,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bioBoxOn: { borderColor: T.copper },
  bioBoxDisabled: { opacity: 0.75 },
  noticeBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.border,
    borderLeftWidth: 3,
    borderLeftColor: T.copper,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  noticeText: { flex: 1, color: T.ink, fontSize: 12.5, lineHeight: 18, fontWeight: '600' },
  bioTitle: { color: T.ink, fontSize: 13, fontWeight: '900' },
  bioSub: { color: T.muted, fontSize: 11, lineHeight: 15, marginTop: 2 },
});
