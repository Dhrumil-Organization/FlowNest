// ─────────────────────────────────────────────────────────────
// FILE: src/core/authFlow.ts
// Single source of truth for "what happens on a successful login".
// Used by:
//   - RoleLoginScreen (manual username/password submit)
//   - the biometric gate screen (auto login after Face ID /
//     Fingerprint / Screen Lock success, using stored credentials)
// Keeping this in one place means both paths always stay in sync.
// ─────────────────────────────────────────────────────────────

import AsyncStorage from '@react-native-async-storage/async-storage';

import { AuthAPI } from '../api/client';
import {
  clearCredentialsForBiometric,
  saveCredentialsForBiometric,
} from '../lib/biometricAuth';
import { useAppSessionStore } from '../stores/AppSessionStore';
import { useAppStore } from '../stores/AppStore';
import type { UserAccount } from '../types';

function makeLegacyUser(user: any): UserAccount {
  const first = user?.first_name || user?.displayname || user?.name || 'User';
  const isSuper = Number(user?.is_superadmin || 0) !== 0;

  return {
    role: isSuper ? 'owner' : 'designer',
    name: first,
    glyph: isSuper ? '♔' : '◳',
    sub: isSuper ? 'Owner / Super Admin' : 'Sudamo User',
  };
}

export type LoginOutcome = { success: true } | { success: false; message: string };

/**
 * rememberForBiometric:
 *  - true  -> securely save these exact credentials + mark
 *             biometricEnabled so next app open offers quick login.
 *  - false -> clear any previously saved credentials + turn
 *             biometric quick-login off.
 */
export async function performLogin(
  username: string,
  password: string,
  rememberForBiometric: boolean
): Promise<LoginOutcome> {
  try {
    const res = await AuthAPI.login({
      name: username.trim(),
      password: password.trim(),
      noti_token: 'test',
    });

    if (!res.success) {
      return { success: false, message: res.message || 'Invalid username or password.' };
    }

    const response = res.response || {};
    const token = response.access_token;
    const user = response.user;
    const appSession = response?.app_session || {};

    if (!token || !user) {
      return { success: false, message: 'Login response is missing token or user.' };
    }

    await AsyncStorage.setItem('access_token', token);
    await AsyncStorage.setItem('app_session', JSON.stringify(appSession));
    await AsyncStorage.setItem('user_details', user?.first_name || user?.name || 'User');
    await AsyncStorage.setItem('user_id', String(user?.id || 0));
    await AsyncStorage.setItem(
      'user_prptype',
      response.userof || appSession.business_context?.prp_group || ''
    );
    await AsyncStorage.setItem('yno', appSession.business_context?.year_no || '');

    useAppStore.getState().setUser(makeLegacyUser(user));

    if (rememberForBiometric) {
      await saveCredentialsForBiometric(username.trim(), password.trim());
      await useAppSessionStore.getState().setBiometricEnabled(true);
    } else {
      await clearCredentialsForBiometric();
      await useAppSessionStore.getState().setBiometricEnabled(false);
    }

    // setLoggedIn also flips `freshLogin: true` so the login route
    // knows to skip the biometric gate immediately after this call —
    // the gate is only for returning to the app later, not the
    // instant after you just typed your password (or just unlocked).
    useAppSessionStore.getState().setLoggedIn({ token, user, appSession, rawLoginResponse: response });

    return { success: true };
  } catch (e: any) {
    return { success: false, message: e?.message || 'Unable to login.' };
  }
}
