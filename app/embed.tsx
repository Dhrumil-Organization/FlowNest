import AsyncStorage from '@/common/utils/compatibleStorage';
import { initNewErpAPI, setNewErpProperty } from '@/src/api/client';
import { performLogin } from '@/src/core/authFlow';
import {
  FLOWNEST_EMBED_AUTH,
  getEmbeddedParentOrigin,
  isEmbeddedWeb,
  isTrustedEmbeddedParent,
  notifyParentReady,
  type EmbeddedAuthPayload,
} from '@/src/core/embeddedAuth';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

type Property = 'sudamo_knits' | 'rayons';

type AuthState = {
  username: string;
  password: string;
  property: Property;
};

async function clearEmbeddedSession() {
  await AsyncStorage.multiRemove([
    'access_token',
    'app_session',
    'user_details',
    'user_id',
    'user_prptype',
    'yno',
    'user_login_role',
    'user_menu_apps',
    'mobile_user',
    'mobile_raw_login_response',
  ]);
}

// Embedded (iframe) entry. The parent application sends the credentials with
// postMessage; the ERP then opens directly. There is ONE ERP now, so the old
// "New ERP / Legacy ERP" choice between the two steps is removed — the login
// itself (performLogin + property API selection) is unchanged.
export default function EmbeddedFlowNestScreen() {
  const embedded = useMemo(() => isEmbeddedWeb(), []);
  const [auth, setAuth] = useState<AuthState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const opening = useRef(false);

  const openErp = useCallback(async (credentials: AuthState) => {
    if (opening.current) return;
    opening.current = true;
    setBusy(true);
    setError(null);

    try {
      await clearEmbeddedSession();

      await AsyncStorage.setItem('LOOKUP_PLATFORM', 'NEW');
      await setNewErpProperty(credentials.property);
      await initNewErpAPI();

      const result = await performLogin(credentials.username, credentials.password);
      if (!result.success) {
        throw new Error(result.message || 'ERP login failed.');
      }

      router.replace('/new/(tabs)');
    } catch (e: any) {
      console.error('Embedded ERP open failed:', e);
      setError(e?.message || 'Unable to open ERP.');
    } finally {
      opening.current = false;
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'web' || !embedded) {
      return;
    }

    const handleMessage = (event: MessageEvent<EmbeddedAuthPayload>) => {
      if (!isTrustedEmbeddedParent(event)) return;
      if (event.data?.type !== FLOWNEST_EMBED_AUTH) return;

      const username = String(event.data.username || '').trim();
      const password = String(event.data.password || '');
      const property = event.data.property;

      if (!username || !password) {
        setError('Embedded login credentials are missing.');
        return;
      }

      if (property !== 'sudamo_knits' && property !== 'rayons') {
        setError('Embedded login property is invalid.');
        return;
      }

      const credentials: AuthState = { username, password, property };
      setAuth(credentials);
      setError(null);
      setReady(true);
      void openErp(credentials);
    };

    window.addEventListener('message', handleMessage);
    notifyParentReady();

    return () => window.removeEventListener('message', handleMessage);
  }, [embedded, openErp]);

  if (Platform.OS !== 'web') {
    return (
      <View style={styles.centered}>
        <Text style={styles.title}>Web only</Text>
        <Text style={styles.subtitle}>This embedded entry point is only for the web iframe integration.</Text>
      </View>
    );
  }

  if (!embedded) {
    return (
      <View style={styles.centered}>
        <Text style={styles.title}>Embedded access required</Text>
        <Text style={styles.subtitle}>
          Open https://flownest.tms-webapp.com/embed inside the parent React application.
        </Text>
      </View>
    );
  }

  if (!ready || !auth) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#C87516" />
        <Text style={styles.waitTitle}>Waiting for parent application…</Text>
        <Text style={styles.waitText}>
          Parent origin: {getEmbeddedParentOrigin() || 'not configured'}
        </Text>
        {error ? <Text style={[styles.error, { marginTop: 12 }]}>{error}</Text> : null}
      </View>
    );
  }

  if (busy || !error) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#C87516" />
        <Text style={styles.waitTitle}>Opening ERP…</Text>
        <Text style={styles.waitText}>{auth.property === 'rayons' ? 'Rayons' : 'Sudamo / Knits'}</Text>
      </View>
    );
  }

  // The login failed: show why and let the user try again.
  return (
    <View style={styles.centered}>
      <Text style={styles.brand}>MADHUSUDHAN FABRICS</Text>
      <Text style={styles.title}>Unable to open ERP</Text>
      <Text style={styles.error}>{error}</Text>
      <TouchableOpacity style={styles.card} onPress={() => void openErp(auth)} activeOpacity={0.88}>
        <Text style={styles.cardTitle}>Try again</Text>
        <Text style={styles.cardText}>
          Sign in again for {auth.property === 'rayons' ? 'Rayons' : 'Sudamo / Knits'}.
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: '#F6F4F1',
  },
  brand: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.8,
    color: '#A35F0F',
    marginBottom: 10,
  },
  title: {
    fontSize: 30,
    fontWeight: '900',
    color: '#202020',
    marginBottom: 10,
  },
  subtitle: {
    maxWidth: 520,
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 21,
    color: '#707070',
    marginBottom: 22,
  },
  card: {
    width: '100%',
    maxWidth: 520,
    borderWidth: 1,
    borderColor: '#ECECEC',
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    padding: 20,
    marginTop: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#202020',
  },
  cardText: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 19,
    color: '#707070',
  },
  disabled: {
    opacity: 0.55,
  },
  error: {
    maxWidth: 520,
    textAlign: 'center',
    color: '#B00020',
    marginBottom: 6,
    lineHeight: 19,
  },
  waitTitle: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '800',
    color: '#202020',
  },
  waitText: {
    marginTop: 8,
    maxWidth: 520,
    textAlign: 'center',
    color: '#707070',
    fontSize: 12,
  },
});
