import AppAlert from '@/common/utils/appAlert';
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

import Icon from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { performLogin } from '../../core/authFlow';
import {
  getBiometricLabel,
  isBiometricSupported,
} from '../../lib/biometricAuth';
import { T } from '../../theme';

const COLORS = {
  background: '#F6F4F1',
  dark: '#111111',
  white: '#FFFFFF',
  primary: '#C87516',
  primaryDark: '#A35F0F',
  border: '#ECECEC',
  text: '#202020',
  subText: '#707070',
  success: '#2BA84A',
};

// ---------- Password Validation Types ----------
type PasswordValidation = {
  minLength: boolean;
  hasUppercase: boolean;
  hasSpecialChar: boolean;
  hasNumber: boolean;
};

// ---------- Validation Item Component ----------
const ValidationItem = ({ label, valid }: { label: string; valid: boolean }) => (
  <View style={styles.validationRow}>
    <Icon
      name={valid ? "check-circle" : "cancel"}
      size={18}
      color={valid ? COLORS.success : "red"}
    />
    <Text style={[styles.validationText, { color: valid ? COLORS.success : "red" }]}>
      {label}
    </Text>
  </View>
);

export function RoleLoginScreen() {
  const router = useRouter();
  const { width: viewportWidth } = useWindowDimensions();
  const isDesktopWeb = Platform.OS === 'web' && viewportWidth >= 1100;

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const [bioSupported, setBioSupported] = useState(false);
  const [bioLabel, setBioLabel] = useState('screen lock');
  const [rememberMe, setRememberMe] = useState(true);

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

      const outcome = await performLogin(
        username,
        password,
        rememberAction
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
    <ScrollView
      style={[styles.scroll, isDesktopWeb && styles.webScroll]}
      contentContainerStyle={[
        styles.scrollContent,
        isDesktopWeb && styles.webScrollContent,
      ]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <SafeAreaView style={[styles.safe, isDesktopWeb && styles.webSafe]}>
        <KeyboardAvoidingView
          style={styles.wrap}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={[styles.hero, isDesktopWeb && styles.webHero]}>
            <View style={[styles.topRow, isDesktopWeb && styles.webTopRow]}>
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={goBack}
                style={styles.backButton}
              >
                <Icon
                  name="arrow-back-ios-new"
                  size={18}
                  color={COLORS.white}
                />

                <Text style={styles.backText}>Back</Text>
              </TouchableOpacity>

              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                style={styles.brand}
              >
                MADHUSUDHAN FABRICS
              </Text>

              <View style={{ width: 70 }} />
            </View>

            <Text style={[styles.title, isDesktopWeb && styles.webTitle]}>Sign in</Text>

            <Text style={[styles.sub, isDesktopWeb && styles.webSub]}>
              Username and password only. Year, property, group and store
              are derived automatically from your ERP user defaults.
            </Text>
          </View>

          <View style={[styles.panel, isDesktopWeb && styles.webPanel]}>
            <View style={[styles.contextCard, isDesktopWeb && styles.webContextCard]}>
              <Text style={styles.contextLabel}>
                MOBILE PLATFORM CORE
              </Text>

              <Text style={styles.contextTitle}>
                Secure ERP session
              </Text>

              <Text style={styles.contextSub}>
                Login creates business context + permission context for
                every screen.
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
              style={[styles.input, isDesktopWeb && styles.webInput]}
            />

            <Text style={styles.label}>PASSWORD</Text>

            <View style={styles.passwordRow}>
              <TextInput
                value={password}
                onChangeText={handlePasswordChange}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="off"
                textContentType="oneTimeCode"
                importantForAutofill="noExcludeDescendants"
                secureTextEntry={!showPassword}
                placeholder="Enter password"
                placeholderTextColor={T.muted}
                style={[
                  styles.input,
                  styles.passwordInput,
                  isDesktopWeb && styles.webInput,
                ]}
              />

              <TouchableOpacity
                onPress={() => setShowPassword((value) => !value)}
                style={styles.eyeBtn}
              >
                <Text style={styles.eyeText}>
                  {showPassword ? 'Hide' : 'Show'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* ---------- Live Password Validation ---------- */}
            <View style={styles.validationContainer}>
              <ValidationItem label="Minimum 8 characters" valid={validation.minLength} />
              <ValidationItem label="At least 1 uppercase letter" valid={validation.hasUppercase} />
              <ValidationItem label="At least 1 special character" valid={validation.hasSpecialChar} />
              <ValidationItem label="At least 1 number" valid={validation.hasNumber} />
            </View>

            <TouchableOpacity
              onPress={handleLogin}
              disabled={!canSubmit}
              activeOpacity={0.85}
              style={[
                styles.loginBtn,
                isDesktopWeb && styles.webLoginBtn,
                !canSubmit && styles.loginBtnDisabled,
              ]}
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
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: T.nav,
  },
  scrollContent: {
    flexGrow: 1,
  },
  safe: {
    flex: 1,
    backgroundColor: T.nav,
  },
  wrap: {
    flex: 1,
  },
  hero: {
    paddingHorizontal: 24,
    paddingTop: 34,
    paddingBottom: 26,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 28,
  },
  backButton: {
    width: 70,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  backText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '800',
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
  title: {
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '900',
    color: '#fff',
    marginBottom: 8,
  },
  sub: {
    fontSize: 13,
    color: '#A9C0D4',
    lineHeight: 19,
    maxWidth: 340,
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
  label: {
    fontSize: 10,
    color: T.muted,
    fontWeight: '900',
    letterSpacing: 0.7,
    marginTop: 12,
    marginBottom: 7,
  },
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
  passwordRow: {
    position: 'relative',
  },
  passwordInput: {
    paddingRight: 70,
  },
  eyeBtn: {
    position: 'absolute',
    right: 8,
    top: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  eyeText: {
    color: T.copper,
    fontSize: 12,
    fontWeight: '800',
  },
  // ----- Password validation styles -----
  validationContainer: {
    marginTop: 8,
    marginBottom: 4,
  },
  validationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 2,
  },
  validationText: {
    marginLeft: 6,
    fontSize: 13,
    fontWeight: '500',
  },
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
    shadowOffset: {
      width: 0,
      height: 5,
    },
  },
  loginBtnDisabled: {
    opacity: 0.45,
  },
  loginText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
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
  bioIcon: {
    color: T.copper,
    fontSize: 22,
    fontWeight: '900',
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

  // Desktop web overrides only. Mobile/tablet layout remains unchanged.
  webScroll: {
    backgroundColor: '#F4F6F7',
  },
  webScrollContent: {
    minHeight: 760,
  },
  webSafe: {
    width: '100%',
    minHeight: 760,
    backgroundColor: '#F4F6F7',
  },
  webHero: {
    width: '100%',
    backgroundColor: T.nav,
    paddingTop: 30,
    paddingBottom: 54,
    paddingHorizontal: 28,
  },
  webTopRow: {
    width: '100%',
    maxWidth: 960,
    alignSelf: 'center',
    marginBottom: 38,
  },
  webTitle: {
    width: '100%',
    maxWidth: 960,
    alignSelf: 'center',
    fontSize: 34,
    lineHeight: 42,
  },
  webSub: {
    width: '100%',
    maxWidth: 960,
    alignSelf: 'center',
    marginTop: 2,
    fontSize: 14,
    lineHeight: 22,
  },
  webPanel: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    flex: 0,
    marginTop: -30,
    paddingHorizontal: 28,
    paddingVertical: 26,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 4,
    },
  },
  webContextCard: {
    borderRadius: 10,
    padding: 15,
  },
  webInput: {
    minHeight: 48,
    borderRadius: 9,
    paddingVertical: 11,
  },
  webLoginBtn: {
    height: 48,
    borderRadius: 9,
    shadowOpacity: 0.12,
    shadowRadius: 7,
  },
});

export default RoleLoginScreen;