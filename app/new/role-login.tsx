// ─────────────────────────────────────────────────────────────
// FILE: app/new/role-login.tsx
//
// NEW ERP login route.
//
//   1. If this device has a login saved with "Remember me" for the
//      selected property, ask: Auto Login  or  Manual Login.
//        • Manual      → normal username / password screen.
//        • Auto Login  → device lock first, then sign in:
//            Android → phone screen lock (finger / face / PIN / pattern)
//            iOS     → Face ID; if it fails iOS offers the passcode;
//                      cancel → username / password screen
//            Web     → Windows Hello / Touch ID when the PC has a screen
//                      lock, otherwise signs in directly
//   2. No saved login → normal username / password screen.
//   3. Every successful login (manual or auto) redirects to /new/(tabs).
//
// IMPORTANT: the "token && freshLogin" redirect stays ABOVE everything
// else so a successful login can never be trapped on this route.
// ─────────────────────────────────────────────────────────────

import AppAlert from '@/common/utils/appAlert';
import AsyncStorage from '@/common/utils/compatibleStorage';
import Icon from '@expo/vector-icons/MaterialIcons';
import * as Device from 'expo-device';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { AuthShell, InfoNote } from '@/src/components/auth/AuthUI';
import { getActiveNewErpProperty, performLogin } from '@/src/core/authFlow';
import {
  forgetRememberedLogin,
  getRememberedLogin,
  getRememberSupport,
  unlockRememberedLogin,
  type RememberedLoginInfo,
  type RememberSupport,
} from '@/src/lib/rememberedLogin';
import { RoleLoginScreen } from '@/src/screens/auth/RoleLoginScreen';
import { useAppSessionStore } from '@/src/stores/AppSessionStore';
import { T } from '@/src/theme';

const PROPERTY_LABEL: Record<string, string> = { sudamo_knits: 'Sudamo/Knits', rayons: 'Rayons' };

function formatSavedAt(ts: number): string {
  if (!ts) return '';
  try {
    return new Date(ts).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return '';
  }
}

function initialsOf(hint: string): string {
  const clean = hint.replace(/[^A-Za-z0-9 ]/g, '').trim();
  return (clean.slice(0, 2) || 'U').toUpperCase();
}

type GateProps = {
  property: string;
  info: RememberedLoginInfo;
  support: RememberSupport;
  onManual: (notice?: string) => void;
  onBack: () => void;
};

function AutoOrManualGate({ property, info, support, onManual, onBack }: GateProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const busyRef = useRef(false);

  // Web vaults record whether they are locked behind the PC's screen lock.
  const locked = support.platform === 'web' ? info.locked !== false : true;
  const lockLabel = support.platform === 'web' && !locked ? 'This computer' : support.label;
  const autoIcon = locked ? support.icon : 'flash-on';

  const autoSubtitle = !locked
    ? 'No screen lock on this computer — signs you in directly.'
    : support.platform === 'ios' && support.label === 'Face ID'
    ? 'Confirm with Face ID (passcode if Face ID is not recognised).'
    : support.platform === 'android'
    ? "Unlock with your phone's screen lock."
    : `Confirm with ${support.label}.`;

  const handleAutoLogin = useCallback(async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError(null);

    try {
      // Must be the FIRST await: on web the Windows Hello / Touch ID prompt
      // has to start inside this click.
      const unlocked = await unlockRememberedLogin(property);

      if (unlocked.status === 'cancelled') {
        onManual(`${lockLabel} was not confirmed. Sign in with your username and password.`);
        return;
      }
      if (unlocked.status === 'missing') {
        onManual('The saved login was not found on this device. Please sign in manually.');
        return;
      }
      if (unlocked.status === 'failed') {
        const stillSaved = await getRememberedLogin(property);
        if (!stillSaved) {
          onManual(unlocked.message);
        } else {
          setError(unlocked.message);
        }
        return;
      }

      const [notiToken, deviceId] = await Promise.all([
        AsyncStorage.getItem('notification_token'),
        Promise.resolve(Device.osInternalBuildId || 'test-device'),
      ]);

      const outcome = await performLogin(
        unlocked.credentials.username,
        unlocked.credentials.password,
        undefined, // keep the saved login exactly as it is
        notiToken || undefined,
        deviceId,
      );

      if (!outcome.success) {
        if (outcome.failure === 'rejected') {
          // Password changed / user blocked: the saved copy is useless now.
          await forgetRememberedLogin(property);
          onManual(
            `${outcome.message || 'The saved login was refused.'} The saved login was removed — please sign in again and tick Remember me.`,
          );
        } else {
          setError(`${outcome.message || 'Auto login failed.'} Check your internet connection and try again.`);
        }
        return;
      }

      router.replace('/new/(tabs)');
    } catch (e: any) {
      setError(e?.message || 'Auto login failed.');
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }, [lockLabel, onManual, property, router]);

  const confirmForget = useCallback(() => {
    AppAlert.alert(
      'Remove saved login?',
      `Auto Login for ${PROPERTY_LABEL[property] || property} will be removed from this device. You can save it again by ticking Remember me when you sign in.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            void forgetRememberedLogin(property).then(() => onManual('Saved login removed from this device.'));
          },
        },
      ],
    );
  }, [onManual, property]);

  const savedOn = formatSavedAt(info.savedAt);

  return (
    <AuthShell
      eyebrow="NEW ERP SYSTEM"
      title="Welcome back"
      subtitle="A saved login was found on this device. How would you like to sign in?"
      onBack={onBack}
      brandTitle="Welcome back to the New ERP"
      brandSubtitle="Your saved login is encrypted on this device and only opens after your device lock confirms it's you."
      highlights={[
        { icon: 'lock', title: 'Locked to this device', desc: 'Encrypted with the phone Keychain / Keystore, or an encrypted browser cookie.' },
        { icon: 'fingerprint', title: 'Your device lock', desc: 'Face ID, phone screen lock, Windows Hello or Touch ID.' },
        { icon: 'visibility-off', title: 'Never shown', desc: 'Your password is never visible in the app or in browser storage.' },
      ]}
    >
      {/* Saved account */}
      <View style={styles.account}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initialsOf(info.hint)}</Text>
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.accountLabel}>SAVED LOGIN</Text>
          <Text style={styles.accountName} numberOfLines={1}>
            {info.hint || 'Saved user'}
          </Text>
          <Text style={styles.accountMeta} numberOfLines={1}>
            {PROPERTY_LABEL[property] || property}
            {savedOn ? ` · Saved ${savedOn}` : ''}
          </Text>
        </View>
        <View style={[styles.chip, !locked && styles.chipMuted]}>
          <Icon name={locked ? 'lock' : 'computer'} size={12} color={locked ? T.green : T.muted} />
          <Text style={[styles.chipText, !locked && { color: T.muted }]}>{locked ? 'Protected' : 'This PC'}</Text>
        </View>
      </View>

      {/* Choice: Auto */}
      <Pressable
        onPress={handleAutoLogin}
        disabled={busy}
        accessibilityRole="button"
        accessibilityLabel="Auto Login"
        style={({ pressed }) => [styles.choice, styles.choicePrimary, pressed && !busy && styles.pressed, busy && styles.dim]}
      >
        <View style={[styles.choiceIcon, styles.choiceIconPrimary]}>
          {busy ? <ActivityIndicator color="#FFFFFF" /> : <Icon name={autoIcon as any} size={24} color="#FFFFFF" />}
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.choiceTitle}>{busy ? 'Signing you in…' : 'Auto Login'}</Text>
          <Text style={styles.choiceSub}>{autoSubtitle}</Text>
        </View>
        <Icon name="arrow-forward" size={20} color={T.copper} />
      </Pressable>

      {/* Choice: Manual */}
      <Pressable
        onPress={() => onManual()}
        disabled={busy}
        accessibilityRole="button"
        accessibilityLabel="Manual Login"
        style={({ pressed }) => [styles.choice, pressed && !busy && styles.pressed, busy && styles.dim]}
      >
        <View style={styles.choiceIcon}>
          <Icon name="keyboard" size={22} color={T.copper} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.choiceTitle}>Manual Login</Text>
          <Text style={styles.choiceSub}>Enter your username and password.</Text>
        </View>
        <Icon name="arrow-forward" size={20} color={T.muted} />
      </Pressable>

      {error ? (
        <View style={styles.errorBox}>
          <Icon name="error-outline" size={18} color={T.red} />
          <Text style={styles.error}>{error}</Text>
        </View>
      ) : null}

      <InfoNote icon="verified-user" style={{ marginTop: 16 }}>
        {locked
          ? `Your password stays encrypted on this device and only unlocks after ${support.label} confirms it's you.`
          : 'Your password stays encrypted on this browser only. Add a screen lock (e.g. Windows Hello PIN) and save again for extra protection.'}
      </InfoNote>

      <Pressable onPress={confirmForget} disabled={busy} hitSlop={8} style={styles.forgetBtn} accessibilityRole="button">
        <Icon name="delete-outline" size={16} color={T.muted} />
        <Text style={styles.forgetText}>Remove saved login from this device</Text>
      </Pressable>
    </AuthShell>
  );
}

type GateState =
  | { phase: 'loading' }
  | { phase: 'ready'; property: string; info: RememberedLoginInfo | null; support: RememberSupport };

export default function RoleLoginRoute() {
  const router = useRouter();
  const params = useLocalSearchParams<{ manual?: string }>();

  const token = useAppSessionStore((s) => s.token);
  const freshLogin = useAppSessionStore((s) => s.freshLogin);

  // ?manual=1 is sent by the New ERP property screen: it must never let an
  // older active session skip this property's login. It still offers the
  // saved-login choice for the selected property.
  const fromPropertySelect = params.manual === '1';

  const [gate, setGate] = useState<GateState>({ phase: 'loading' });
  const [manual, setManual] = useState<{ notice?: string } | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      const property = await getActiveNewErpProperty();
      const [support, info] = await Promise.all([getRememberSupport(), getRememberedLogin(property)]);
      if (active) setGate({ phase: 'ready', property, support, info });
    })();
    return () => {
      active = false;
    };
  }, []);

  const goPropertySelect = useCallback(() => router.replace('/new/property-select'), [router]);
  const showManual = useCallback((notice?: string) => {
    setManual({ notice });
    // The gate may have just removed the saved login (cancel → kept,
    // wrong password / Remove → deleted). Re-read so "Back" is accurate.
    void (async () => {
      const property = await getActiveNewErpProperty();
      const info = await getRememberedLogin(property);
      setGate((g) => (g.phase === 'ready' ? { ...g, property, info } : g));
    })();
  }, []);

  // CRITICAL: a successful manual or automatic login always leaves this route.
  if (token && freshLogin) {
    return <Redirect href="/new/(tabs)" />;
  }

  // Existing authenticated session (cold start) — unchanged behaviour.
  if (token && !fromPropertySelect) {
    return <Redirect href="/new/(tabs)" />;
  }

  if (gate.phase === 'loading') {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={T.copper} size="large" />
      </View>
    );
  }

  if (gate.info && gate.support.available && !manual) {
    return (
      <AutoOrManualGate
        property={gate.property}
        info={gate.info}
        support={gate.support}
        onManual={showManual}
        onBack={goPropertySelect}
      />
    );
  }

  return (
    <RoleLoginScreen
      notice={manual?.notice}
      // From the gate, "Back" returns to the Auto / Manual choice.
      onBack={gate.info && manual ? () => setManual(null) : undefined}
    />
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, backgroundColor: T.nav, alignItems: 'center', justifyContent: 'center' },
  account: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 16,
    padding: 14,
    marginBottom: 18,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: T.nav,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#FFFFFF', fontSize: 16, fontWeight: '900', letterSpacing: 0.5 },
  accountLabel: { fontSize: 10, color: T.copper, fontWeight: '900', letterSpacing: 0.9, marginBottom: 2 },
  accountName: { fontSize: 16, color: T.ink, fontWeight: '900' },
  accountMeta: { fontSize: 12, color: T.muted, marginTop: 2 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#EAF5EE',
  },
  chipMuted: { backgroundColor: T.sub },
  chipText: { fontSize: 10.5, fontWeight: '800', color: T.green },
  choice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 16,
    paddingVertical: 15,
    paddingHorizontal: 14,
    marginBottom: 12,
    minHeight: 76,
  },
  choicePrimary: { borderColor: T.copper, borderWidth: 1.5 },
  choiceIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: T.sub,
    alignItems: 'center',
    justifyContent: 'center',
  },
  choiceIconPrimary: { backgroundColor: T.copper },
  choiceTitle: { fontSize: 15, color: T.ink, fontWeight: '900' },
  choiceSub: { fontSize: 12, color: T.muted, lineHeight: 17, marginTop: 2 },
  pressed: { opacity: 0.85, transform: [{ scale: 0.99 }] },
  dim: { opacity: 0.7 },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FCF4F2',
    borderWidth: 1,
    borderColor: '#F0D2CC',
    borderRadius: 12,
    padding: 12,
    marginTop: 4,
  },
  error: { flex: 1, color: T.red, fontSize: 12.5, fontWeight: '600' },
  forgetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 18,
    paddingVertical: 8,
  },
  forgetText: { fontSize: 12.5, color: T.muted, fontWeight: '700', textDecorationLine: 'underline' },
});
