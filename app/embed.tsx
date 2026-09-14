import AppAlert from '@/common/utils/appAlert';
import AsyncStorage from '@/common/utils/compatibleStorage';
import { initAPI, initAPIForPrinterList, initAPIForSticker } from '@/common/API/dynamicAPI';
import { initNewErpAPI, setNewErpProperty } from '@/src/api/client';
import { performLogin } from '@/src/core/authFlow';
import { performLegacyEmbeddedLogin } from '@/src/core/embeddedLegacyLogin';
import {
  FLOWNEST_EMBED_AUTH,
  getEmbeddedParentOrigin,
  isEmbeddedWeb,
  isTrustedEmbeddedParent,
  notifyParentReady,
  type EmbeddedAuthPayload,
} from '@/src/core/embeddedAuth';
import { router } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

type ERPChoice = 'NEW' | 'OLD';
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

function SelectionScreen({
  auth,
  onSelect,
  busy,
  error,
}: {
  auth: AuthState;
  onSelect: (erp: ERPChoice) => void;
  busy: boolean;
  error: string | null;
}) {
  return (
    <View style={styles.centered}>
      <Text style={styles.brand}>MADHUSUDHAN FABRICS</Text>
      <Text style={styles.title}>Select ERP</Text>
      <Text style={styles.subtitle}>
        Choose the ERP you want to open for {auth.property === 'rayons' ? 'Rayons' : 'Sudamo / Knits'}.
      </Text>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TouchableOpacity
        style={[styles.card, busy && styles.disabled]}
        disabled={busy}
        onPress={() => onSelect('NEW')}
        activeOpacity={0.88}
      >
        <Text style={styles.cardTitle}>New ERP</Text>
        <Text style={styles.cardText}>Open the current New ERP platform.</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.card, busy && styles.disabled]}
        disabled={busy}
        onPress={() => onSelect('OLD')}
        activeOpacity={0.88}
      >
        <Text style={styles.cardTitle}>Legacy ERP</Text>
        <Text style={styles.cardText}>Open the existing Legacy ERP platform.</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function EmbeddedFlowNestScreen() {
  const embedded = useMemo(() => isEmbeddedWeb(), []);
  const [auth, setAuth] = useState<AuthState | null>(null);
  const [erp, setErp] = useState<ERPChoice | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

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

      setAuth({ username, password, property });
      setErp(null);
      setError(null);
      setReady(true);
    };

    window.addEventListener('message', handleMessage);
    notifyParentReady();

    return () => window.removeEventListener('message', handleMessage);
  }, [embedded]);

  const handleERPChoice = async (choice: ERPChoice) => {
    if (!auth || busy) return;

    setBusy(true);
    setError(null);
    setErp(choice);

    try {
      await clearEmbeddedSession();

      if (choice === 'NEW') {
        await AsyncStorage.setItem('LOOKUP_PLATFORM', 'NEW');
        await setNewErpProperty(auth.property);
        await initNewErpAPI();

        const result = await performLogin(auth.username, auth.password);
        if (!result.success) {
          throw new Error(result.message || 'New ERP login failed.');
        }

        router.replace('/new/(tabs)');
        return;
      }

      await AsyncStorage.setItem('LOOKUP_PLATFORM', 'OLD');
      await AsyncStorage.setItem('selected_property', auth.property);
      await Promise.all([initAPI(auth.property), initAPIForPrinterList(), initAPIForSticker()]);

      const result = await performLegacyEmbeddedLogin(auth);
      if (!result.success) {
        throw new Error(result.message || 'Legacy ERP login failed.');
      }

      router.replace('/(tabs)');
    } catch (e: any) {
      console.error('Embedded ERP open failed:', e);
      setError(e?.message || 'Unable to open ERP.');
      setErp(null);
    } finally {
      setBusy(false);
    }
  };

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
      </View>
    );
  }

  if (busy) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#C87516" />
        <Text style={styles.waitTitle}>
          Opening {erp === 'NEW' ? 'New ERP' : 'Legacy ERP'}…
        </Text>
      </View>
    );
  }

  return (
    <SelectionScreen
      auth={auth}
      onSelect={handleERPChoice}
      busy={busy}
      error={error}
    />
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
