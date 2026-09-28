// ─────────────────────────────────────────────────────────────
// FILE: src/screens/auth/RoleLoginScreen.tsx
//
// Production-safe New ERP manual login.
//
// Key navigation rules:
//   - Back always returns to New ERP Property Selection.
//   - Successful login explicitly replaces this route with
//     /new/(tabs).
//   - The parent app/new/role-login.tsx also redirects when the
//     session store becomes authenticated, giving us two safe paths
//     into the New ERP dashboard without allowing Legacy routing.
// ─────────────────────────────────────────────────────────────
import AppAlert from '@/common/utils/appAlert';
import AsyncStorage from '@/common/utils/compatibleStorage';
import Icon from '@expo/vector-icons/MaterialIcons';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  StyleSheet,
  Switch,
  Text,
  View
} from 'react-native';
import {
  AuthButton,
  AuthField,
  AuthShell,
  CheckItem,
  ChecklistBox,
  PasswordToggle,
} from '../../components/auth/AuthUI';
import { performLogin } from '../../core/authFlow';
import {
  getBiometricLabel,
  isBiometricSupported,
} from '../../lib/biometricAuth';
import { T } from '../../theme';

// ---------- Password Validation Types ----------
type PasswordValidation = {
  minLength: boolean;
  hasUppercase: boolean;
  hasSpecialChar: boolean;
  hasNumber: boolean;
};

// ---------- Validation Item Component ----------
const ValidationItem = ({ label, valid }: { label: string; valid: boolean }) => (
  <CheckItem label={label} valid={valid} pendingIcon="cancel" />
);

export function RoleLoginScreen() {
  const router = useRouter();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const [bioSupported, setBioSupported] = useState(false);
  const [bioLabel, setBioLabel] = useState('screen lock');
  const [rememberMe, setRememberMe] = useState(true);
  const [getNotitoken, setNotitoken] = useState('');
  const [getDeviceId, setDeviceId] = useState('');
  // ---------- Password Validation State ----------
  const [validation, setValidation] = useState<PasswordValidation>({
    minLength: false,
    hasUppercase: false,
    hasSpecialChar: false,
    hasNumber: false,
  });

  // ---------- Validation Functions ----------
  const validatePassword = (pwd: string): PasswordValidation => {
    return {
      minLength: pwd.length >= 8,
      hasUppercase: /[A-Z]/.test(pwd),
      hasSpecialChar: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd),
      hasNumber: /\d/.test(pwd),
    };
  };

  const isPasswordValid = (v: PasswordValidation) => Object.values(v).every(Boolean);

  const handlePasswordChange = (text: string) => {
    setPassword(text);
    setValidation(validatePassword(text));
  };

  const requestPermissions = async () => {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') {
      console.log('Notification permission denied');
      return false;
    }
    return true;
  };

  const getFCMToken = async () => {
    try {
      const hasPermission = await requestPermissions();
      if (!hasPermission) return null;

      const token = (await Notifications.getExpoPushTokenAsync()).data;
      console.log('Expo Push Token:', token);

      if (token) {
        await AsyncStorage.setItem('notification_token', token);
        return token;
      }
    } catch (error) {
      console.error('Error getting Expo push token:', error);
      return null;
    }
  };

  useEffect(() => {
    const deviceId = Device.osInternalBuildId || "test-device";
    console.log("Device ID:", deviceId);
    setDeviceId(deviceId);
    getFCMToken().then(token => {
      if (token) {
        setNotitoken(token);
      }
    });
  }, []);

  useEffect(() => {
    let active = true;

    void (async () => {
      const supported = await isBiometricSupported();

      if (!active) return;

      setBioSupported(supported);

      if (supported) {
        const label = await getBiometricLabel();

        if (active) {
          setBioLabel(label);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  // ---------- Form Validity ----------
  const canSubmit = useMemo(
    () =>
      username.trim().length > 0 &&
      isPasswordValid(validation) &&
      !loading,
    [username, validation, loading]
  );

  const openNewErpDashboard = () => {
    router.replace('/new/(tabs)');
  };

  const handleLogin = async () => {
    if (!canSubmit) return;

    // Extra safety check
    if (!isPasswordValid(validation)) {
      AppAlert.alert('Error', 'Password does not meet security requirements');
      return;
    }

    setLoading(true);

    try {
      const rememberAction =
        bioSupported && rememberMe
          ? 'save'
          : bioSupported
            ? 'clear'
            : undefined;

      const noti_token = getNotitoken;

      const outcome = await performLogin(
        username,
        password,
        rememberAction,
        noti_token,
        getDeviceId,
      );

      if (!outcome.success) {
        AppAlert.alert(
          'Login failed',
          outcome.message || 'Unable to login.'
        );
        return;
      }

      if (outcome.message) {
        AppAlert.alert(
          'Note',
          outcome.message,
          [
            {
              text: 'OK',
              onPress: openNewErpDashboard,
            },
          ],
          {
            cancelable: false,
          }
        );
        return;
      }

      openNewErpDashboard();
    } catch (error: any) {
      AppAlert.alert(
        'Login failed',
        error?.message || 'Unable to login.'
      );
    } finally {
      setLoading(false);
    }
  };

  const goBack = () => {
    router.replace('/new/property-select');
  };

  return (
    <AuthShell
      eyebrow="NEW ERP SYSTEM"
      title="Sign in"
      subtitle="Username and password only. Year, property, group and store are derived automatically from your ERP user defaults."
      onBack={goBack}
      brandTitle="Welcome to the New ERP"
      brandSubtitle="Login creates your business context and permission context for every screen you open."
      highlights={[
        { icon: 'verified-user', title: 'Secure ERP session', desc: 'Role-based permissions applied to every module.' },
        { icon: 'apartment', title: 'Property aware', desc: 'Connects to the property you selected in the previous step.' },
        { icon: 'fingerprint', title: 'Remember me', desc: 'Sign in faster next time with your device screen lock.' },
      ]}
    >
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
        textContentType="oneTimeCode"
        importantForAutofill="noExcludeDescendants"
        secureTextEntry={!showPassword}
        placeholder="Enter password"
        onSubmitEditing={handleLogin}
        right={<PasswordToggle visible={showPassword} onToggle={() => setShowPassword((value) => !value)} />}
      />

      {/* ---------- Live Password Validation ---------- */}
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

      {bioSupported && (
        <View style={styles.bioBox}>
          <View style={styles.bioIconWrap}>
            <Icon name="fingerprint" size={20} color={T.copper} />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.bioTitle}>Remember me</Text>

            <Text style={styles.bioSub}>
              We&apos;ll confirm with your {bioLabel} and save this
              login for next time.
            </Text>
          </View>

          <Switch
            value={rememberMe}
            onValueChange={setRememberMe}
            trackColor={{ true: T.copper }}
          />
        </View>
      )}
    </AuthShell>
  );
}

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
  contextTitle: {
    fontSize: 15,
    color: T.ink,
    fontWeight: '900',
    marginBottom: 2,
  },
  contextSub: {
    fontSize: 12,
    color: T.muted,
    lineHeight: 17,
  },
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
  bioTitle: {
    color: T.ink,
    fontSize: 13,
    fontWeight: '900',
  },
  bioSub: {
    color: T.muted,
    fontSize: 11,
    lineHeight: 15,
    marginTop: 2,
  },
});

export default RoleLoginScreen;