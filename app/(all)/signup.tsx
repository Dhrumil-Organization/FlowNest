import { initAPI } from '@/common/API/dynamicAPI';
import AppAlert from '@/common/utils/appAlert';
import Icon from '@expo/vector-icons/MaterialIcons';
import axios from 'axios';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import {
  AuthButton,
  AuthField,
  AuthShell,
  CheckItem,
  ChecklistBox,
  FieldTone,
  PasswordToggle,
} from '../../src/components/auth/AuthUI';
import { T } from '../../src/theme';

type FieldStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid';

const CHECK_API = 'https://apiy.tms-webapp.com/api/check_availability';
const SIGNUP_API = 'https://apiy.tms-webapp.com/api/signup';

/* ---------- FORM COMPONENT ---------- */
function SignupForm() {
  const router = useRouter();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const [usernameStatus, setUsernameStatus] = useState<FieldStatus>('idle');
  const [emailStatus, setEmailStatus] = useState<FieldStatus>('idle');
  const [usernameMessage, setUsernameMessage] = useState('');
  const [emailMessage, setEmailMessage] = useState('');

  // const [passwordStrength, setPasswordStrength] = useState(0);
  // const [passwordChecks, setPasswordChecks] = useState({
  //   length: false,
  //   upper: false,
  //   lower: false,
  //   number: false,
  //   special: false,
  // });

  const usernameTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const emailTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const usernameRequestId = useRef(0);
  const emailRequestId = useRef(0);
  const usernameValueRef = useRef('');
  const emailValueRef = useRef('');

  useEffect(() => {
    initAPI();

    return () => {
      if (usernameTimer.current) clearTimeout(usernameTimer.current);
      if (emailTimer.current) clearTimeout(emailTimer.current);
      usernameRequestId.current += 1;
      emailRequestId.current += 1;
    };
  }, []);

  // Derived values: no extra state/render cycle while the user is typing.
  const passwordChecks = useMemo(
    () => ({
      length: password.length >= 8,
      upper: /[A-Z]/.test(password),
      lower: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
    }),
    [password]
  );

  const passwordStrength = useMemo(
    () => Object.values(passwordChecks).filter(Boolean).length,
    [passwordChecks]
  );

  const parseAvailabilityResponse = (data: any) => {
    if (data?.response?.error === false) {
      return {
        available: true,
        message: data?.response?.message || 'Available',
      };
    }
    return {
      available: false,
      message: data?.response?.message || data?.message || 'Already exists',
    };
  };

  const checkUsernameAvailability = useCallback(async (value: string) => {
    const normalized = value.trim();

    if (!normalized || normalized.length < 3) {
      return;
    }

    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    if (!usernameRegex.test(normalized)) {
      if (usernameValueRef.current === value) {
        setUsernameStatus('invalid');
        setUsernameMessage('3-20 chars, letters/numbers/underscore only');
      }
      return;
    }

    const requestId = ++usernameRequestId.current;

    if (usernameValueRef.current === value) {
      setUsernameStatus('checking');
      setUsernameMessage('Checking availability...');
    }

    try {
      const response = await axios.post(
        CHECK_API,
        { username: normalized },
        { headers: { 'x-platform': 'mob' } }
      );

      // Ignore a response for an older value. This is important on mobile,
      // where a slow network response can otherwise overwrite newer typing.
      if (
        requestId !== usernameRequestId.current ||
        usernameValueRef.current !== value
      ) {
        return;
      }

      const result = parseAvailabilityResponse(response.data);

      if (result.available) {
        setUsernameStatus('available');
        setUsernameMessage(`✓ ${result.message}`);
      } else {
        setUsernameStatus('taken');
        setUsernameMessage(`✗ ${result.message}`);
      }
    } catch {
      if (
        requestId !== usernameRequestId.current ||
        usernameValueRef.current !== value
      ) {
        return;
      }

      setUsernameStatus('idle');
      setUsernameMessage('Could not verify, try again');
    }
  }, []);

  const checkEmailAvailability = useCallback(async (value: string) => {
    const normalized = value.trim();

    if (!normalized) {
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalized)) {
      if (emailValueRef.current === value) {
        setEmailStatus('invalid');
        setEmailMessage('Enter a valid email address');
      }
      return;
    }

    const requestId = ++emailRequestId.current;

    if (emailValueRef.current === value) {
      setEmailStatus('checking');
      setEmailMessage('Checking email...');
    }

    try {
      const response = await axios.post(
        CHECK_API,
        { email: normalized },
        { headers: { 'x-platform': 'mob' } }
      );

      if (
        requestId !== emailRequestId.current ||
        emailValueRef.current !== value
      ) {
        return;
      }

      const result = parseAvailabilityResponse(response.data);

      if (result.available) {
        setEmailStatus('available');
        setEmailMessage(`✓ ${result.message}`);
      } else {
        setEmailStatus('taken');
        setEmailMessage(`✗ ${result.message}`);
      }
    } catch {
      if (
        requestId !== emailRequestId.current ||
        emailValueRef.current !== value
      ) {
        return;
      }

      setEmailStatus('idle');
      setEmailMessage('Could not verify, try again');
    }
  }, []);

  const handleUsernameChange = useCallback((value: string) => {
    usernameValueRef.current = value;

    // Update the actual input value first. Do not wait for API validation.
    setUsername(value);

    usernameRequestId.current += 1;

    if (usernameTimer.current) {
      clearTimeout(usernameTimer.current);
      usernameTimer.current = null;
    }

    if (value.length < 3) {
      setUsernameStatus('idle');
      setUsernameMessage('');
      return;
    }

    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    if (!usernameRegex.test(value)) {
      setUsernameStatus('invalid');
      setUsernameMessage('3-20 chars, letters/numbers/underscore only');
      return;
    }

    // Keep typing independent from the network. The availability check
    // starts only after the user pauses typing.
    setUsernameStatus('idle');
    setUsernameMessage('');

    usernameTimer.current = setTimeout(() => {
      usernameTimer.current = null;
      void checkUsernameAvailability(value);
    }, 600);
  }, [checkUsernameAvailability]);

  const handleEmailChange = useCallback((value: string) => {
    emailValueRef.current = value;

    setEmail(value);

    emailRequestId.current += 1;

    if (emailTimer.current) {
      clearTimeout(emailTimer.current);
      emailTimer.current = null;
    }

    if (!value) {
      setEmailStatus('idle');
      setEmailMessage('');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      setEmailStatus('invalid');
      setEmailMessage('Enter a valid email address');
      return;
    }

    setEmailStatus('idle');
    setEmailMessage('');

    emailTimer.current = setTimeout(() => {
      emailTimer.current = null;
      void checkEmailAvailability(value);
    }, 600);
  }, [checkEmailAvailability]);

  const getPasswordStrengthInfo = () => {
    if (password.length === 0) return { label: '', color: '#E0E0E0', percent: 0 };
    if (passwordStrength <= 2) return { label: 'Weak', color: '#FF4D4D', percent: 33 };
    if (passwordStrength === 3) return { label: 'Fair', color: '#FFA726', percent: 60 };
    if (passwordStrength === 4) return { label: 'Good', color: '#66BB6A', percent: 80 };
    return { label: 'Strong', color: '#2E7D32', percent: 100 };
  };

  const strengthInfo = getPasswordStrengthInfo();

  const isFormReady = useMemo(
    () =>
      firstName.trim() !== '' &&
      lastName.trim() !== '' &&
      usernameStatus === 'available' &&
      emailStatus === 'available' &&
      passwordStrength === 5 &&
      password === confirmPassword &&
      password.length > 0,
    [
      firstName,
      lastName,
      usernameStatus,
      emailStatus,
      passwordStrength,
      password,
      confirmPassword,
    ]
  );

  const validateForm = (): boolean => {
    if (!firstName.trim()) { setSubmitError('First name is required'); return false; }
    if (!lastName.trim()) { setSubmitError('Last name is required'); return false; }
    if (usernameStatus === 'idle' || usernameStatus === 'checking') {
      setSubmitError('Please wait, checking username availability...');
      return false;
    }
    if (usernameStatus === 'taken' || usernameStatus === 'invalid') {
      setSubmitError('Please choose an available username');
      return false;
    }
    if (emailStatus === 'idle' || emailStatus === 'checking') {
      setSubmitError('Please wait, checking email availability...');
      return false;
    }
    if (emailStatus === 'taken' || emailStatus === 'invalid') {
      setSubmitError('Please use an available email');
      return false;
    }
    if (passwordStrength < 5) {
      setSubmitError('Password does not meet all requirements');
      return false;
    }
    if (password !== confirmPassword) {
      setSubmitError('Passwords do not match');
      return false;
    }
    setSubmitError('');
    return true;
  };

  const handleSubmit = useCallback(async () => {
    if (!validateForm()) return;
    try {
      setIsSubmitting(true);
      setSubmitError('');
      const payload = {
        firstname: firstName.trim(),
        lastname: lastName.trim(),
        username: username.trim(),
        email: email.trim(),
        password: password,
      };
      const response = await axios.post(SIGNUP_API, payload, {
        headers: { 'x-platform': 'mob' },
      });
      if (response.data?.success === true && response.data?.response?.error === false) {
        const successMessage =
          response.data?.response?.message ||
          response.data?.message ||
          'Account created successfully!';
        AppAlert.alert(`🎉 ${successMessage}`);
        setTimeout(() => {
          router.replace('/(auth)/login');
        }, 500);
      } else {
        const errorMessage =
          response.data?.response?.message ||
          response.data?.message ||
          'Signup failed. Please try again.';
        setSubmitError(errorMessage);
      }
    } catch (err: any) {
      if (err?.response?.data?.response?.message) setSubmitError(err.response.data.response.message);
      else if (err?.response?.data?.message) setSubmitError(err.response.data.message);
      else if (err?.response?.data?.error) setSubmitError(err.response.data.error);
      else if (err?.message) setSubmitError(err.message);
      else setSubmitError('Signup failed. Please check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  }, [
    firstName,
    lastName,
    username,
    email,
    password,
    confirmPassword,
    passwordStrength,
    usernameStatus,
    emailStatus,
    router,
  ]);

  const getStatusIcon = (status: FieldStatus) => {
    switch (status) {
      case 'checking': return <ActivityIndicator size="small" color={T.copper} />;
      case 'available': return <Icon name="check-circle" size={20} color={T.green} />;
      case 'taken': return <Icon name="cancel" size={20} color={T.red} />;
      case 'invalid': return <Icon name="error-outline" size={20} color={T.amber} />;
      default: return null;
    }
  };

  const statusTone = (status: FieldStatus): FieldTone =>
    status === 'available' ? 'success' : status === 'taken' ? 'error' : status === 'invalid' ? 'warning' : 'default';

  const confirmTone: FieldTone =
    confirmPassword.length === 0 ? 'default' : password === confirmPassword ? 'success' : 'error';

  return (
    <>
      {submitError ? (
        <View style={styles.errorBox}>
          <Icon name="error-outline" size={18} color={T.red} />
          <Text style={styles.errorText}>{submitError}</Text>
        </View>
      ) : null}

      <View style={styles.row}>
        <AuthField
          containerStyle={styles.halfInput}
          label="FIRST NAME"
          icon="person-outline"
          placeholder="John"
          value={firstName}
          onChangeText={setFirstName}
          autoCapitalize="words"
          right={firstName.length > 0 ? <Icon name="check-circle" size={18} color={T.green} /> : undefined}
        />
        <AuthField
          containerStyle={styles.halfInput}
          label="LAST NAME"
          icon="person-outline"
          placeholder="Doe"
          value={lastName}
          onChangeText={setLastName}
          autoCapitalize="words"
          right={lastName.length > 0 ? <Icon name="check-circle" size={18} color={T.green} /> : undefined}
        />
      </View>

      <AuthField
        label="USERNAME"
        icon="alternate-email"
        placeholder="johndoe123"
        value={username}
        onChangeText={handleUsernameChange}
        autoCapitalize="none"
        autoCorrect={false}
        tone={statusTone(usernameStatus)}
        right={getStatusIcon(usernameStatus)}
        helper={usernameMessage || '3-20 characters, letters, numbers, underscore only'}
        helperTone={usernameMessage ? statusTone(usernameStatus) : 'default'}
      />

      <AuthField
        label="EMAIL ADDRESS"
        icon="email"
        placeholder="john@example.com"
        value={email}
        onChangeText={handleEmailChange}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        tone={statusTone(emailStatus)}
        right={getStatusIcon(emailStatus)}
        helper={emailMessage || undefined}
      />

      <AuthField
        label="PASSWORD"
        icon="lock-outline"
        placeholder="Enter password"
        secureTextEntry={!showPassword}
        value={password}
        onChangeText={setPassword}
        autoCapitalize="none"
        containerStyle={{ marginBottom: 8 }}
        right={<PasswordToggle visible={showPassword} onToggle={() => setShowPassword((v) => !v)} />}
      />

      {password.length > 0 && (
        <View style={styles.strengthWrap}>
          <View style={styles.strengthBarContainer}>
            <View
              style={[
                styles.strengthBar,
                { width: `${strengthInfo.percent}%`, backgroundColor: strengthInfo.color },
              ]}
            />
          </View>
          <Text style={[styles.strengthLabel, { color: strengthInfo.color }]}>
            {strengthInfo.label}
          </Text>
        </View>
      )}

      <ChecklistBox>
        <RequirementRow met={passwordChecks.length} text="At least 8 characters" />
        <RequirementRow met={passwordChecks.upper} text="One uppercase (A-Z)" />
        <RequirementRow met={passwordChecks.lower} text="One lowercase (a-z)" />
        <RequirementRow met={passwordChecks.number} text="One number (0-9)" />
        <RequirementRow met={passwordChecks.special} text="One special (!@#$%^&*)" />
      </ChecklistBox>

      <AuthField
        label="CONFIRM PASSWORD"
        icon="lock-outline"
        placeholder="Re-enter password"
        secureTextEntry={!showConfirmPassword}
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        autoCapitalize="none"
        containerStyle={{ marginTop: 12 }}
        tone={confirmTone}
        right={<PasswordToggle visible={showConfirmPassword} onToggle={() => setShowConfirmPassword((v) => !v)} />}
        helper={
          confirmPassword.length > 0
            ? password === confirmPassword
              ? '✓ Passwords match'
              : '✗ Passwords do not match'
            : undefined
        }
      />

      <AuthButton
        label={isFormReady ? 'Create Account' : 'Complete All Fields'}
        icon={isFormReady ? 'arrow-forward' : undefined}
        onPress={handleSubmit}
        disabled={isSubmitting || !isFormReady}
        loading={isSubmitting}
        style={{ marginTop: 10 }}
      />

      <View style={styles.loginRow}>
        <Text style={styles.loginText}>Already have an account? </Text>
        <TouchableOpacity onPress={() => router.replace('/(auth)/login')}>
          <Text style={styles.loginLink}>Login</Text>
        </TouchableOpacity>
      </View>
    </>
  );
}

/* ---------- SHELL ---------- */
export default function Signup() {
  const router = useRouter();

  const goBack = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }, [router]);

  const highlights = useMemo(
    () => [
      { icon: 'alternate-email', title: 'Pick a unique username', desc: 'Availability is checked live as you type.' },
      { icon: 'lock-outline', title: 'Strong password', desc: '8+ characters with upper, lower, number and symbol.' },
      { icon: 'login', title: 'Sign in right after', desc: 'You will be taken to the login screen once created.' },
    ],
    []
  );

  return (
    <AuthShell
      eyebrow="SIGN UP"
      title="Create your account"
      subtitle="Start managing your textile business smarter. Fill in your details to get started."
      onBack={goBack}
      brandTitle="Join FlowNest Textile ERP"
      brandSubtitle="Create your account to access production, collections, receivables and sales analysis from any device."
      highlights={highlights}
      maxWidth={560}
    >
      <SignupForm />
    </AuthShell>
  );
}

function RequirementRow({ met, text }: { met: boolean; text: string }) {
  return <CheckItem label={text} valid={met} />;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -6 },
  halfInput: { flexGrow: 1, flexBasis: 150, paddingHorizontal: 6 },
  strengthWrap: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  strengthBarContainer: {
    flex: 1, height: 6, backgroundColor: T.alt, borderRadius: 3, overflow: 'hidden',
  },
  strengthBar: { height: '100%', borderRadius: 3 },
  strengthLabel: { fontSize: 12, fontWeight: '800', marginLeft: 10, minWidth: 48, textAlign: 'right' },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FCF4F2',
    borderWidth: 1,
    borderColor: '#F0D2CC',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  errorText: { color: T.red, marginLeft: 8, fontSize: 13, fontWeight: '600', flex: 1 },
  loginRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 20 },
  loginText: { color: T.muted, fontSize: 14 },
  loginLink: { color: T.copper, fontWeight: '900', fontSize: 14 },
});