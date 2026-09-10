// ─────────────────────────────────────────────────────────────
// FILE: src/core/authFlow.ts
// Single source of truth for "what happens on a successful login".
// Used by:
//   - RoleLoginScreen (manual username/password submit, "Remember me")
//   - the gate screen (Auto Login using saved credentials after the
//     device's own screen lock / Face ID / Fingerprint confirms it)
// Keeping this in one place means both paths always stay in sync.
// ─────────────────────────────────────────────────────────────

import AsyncStorage from '@/common/utils/compatibleStorage';

import { AuthAPI } from '../api/client';
import {
  authenticateWithBiometrics,
  clearCredentialsForBiometric,
  saveCredentialsForBiometric,
} from '../lib/biometricAuth';
import { useAppSessionStore } from '../stores/AppSessionStore';
import { useAppStore } from '../stores/AppStore';
import type { UserAccount } from '../types';
import { autoSyncPermissionRegistry } from './registry/registryAutoSync';

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

export type LoginOutcome = {
  success: boolean;
  message?: string;
  /** Only meaningful when rememberAction === 'save'. */
  rememberSaved?: boolean;
};

/**
 * rememberAction:
 *  - 'save'      -> Manual login with "Remember me" checked. AFTER the
 *                    login itself succeeds, the device's own screen
 *                    lock (Face ID / Fingerprint / PIN / pattern —
 *                    whatever the person already uses to unlock their
 *                    phone) is prompted to CONFIRM it's really them
 *                    before the credentials get saved. If that
 *                    confirmation fails, nothing is saved.
 *  - 'clear'     -> Manual login with "Remember me" unchecked: wipe
 *                    any previously saved credentials.
 *  - undefined   -> Don't touch saved-credential state at all. Used by
 *                    the Auto Login path, which already confirmed the
 *                    device lock itself before calling this.
 */
export async function performLogin(
  username: string,
  password: string,
  rememberAction?: 'save' | 'clear'
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
    console.log('Login response:', res);

    const response = res.response || {};
    const token = response.access_token;
    const user = response.user;
    const appSession = response?.app_session ?? {
      business_context: {
        year_no: String(response?.year?.YearNo ?? ''),
        year_name: String(response?.year?.YearName ?? ''),
        prp_code: String(response?.prpcode ?? response?.year?.PrpCode ?? ''),
        prp_group: String(response?.userof ?? ''),
        str_code: String(response?.strcode ?? ''),
      },
      permissions: { dashboards: [], screens: [], resources: [], grants: {} },
      fallback_mode: true,
    };

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
    await AsyncStorage.setItem(
      'yno',
      String(appSession.business_context?.year_no || response?.year?.YearNo || '')
    );

    useAppStore.getState().setUser(makeLegacyUser(user));

    let rememberSaved: boolean | undefined;

    if (rememberAction === 'save') {
      // The login just succeeded with a real username/password. Before
      // we store those credentials for next time, make the person
      // prove it's really them via the phone's own lock method.
      const confirmed = await authenticateWithBiometrics('Confirm to save this login');
      if (confirmed) {
        await saveCredentialsForBiometric(username.trim(), password.trim());
        await useAppSessionStore.getState().setBiometricEnabled(true);
        rememberSaved = true;
      } else {
        await clearCredentialsForBiometric();
        await useAppSessionStore.getState().setBiometricEnabled(false);
        rememberSaved = false;
      }
    } else if (rememberAction === 'clear') {
      await clearCredentialsForBiometric();
      await useAppSessionStore.getState().setBiometricEnabled(false);
    }
    // rememberAction === undefined -> leave saved-credential state as is.

    // setLoggedIn also flips `freshLogin: true` so the login route
    // knows to skip the Auto/Manual gate immediately after this call —
    // the gate is only for returning to the app later, not the
    // instant after you just typed your password (or just auto-logged in).
    useAppSessionStore.getState().setLoggedIn({ token, user, appSession, rawLoginResponse: response });

    // Registry sync is additive and non-blocking. It runs only for a Platform Admin.
    // A sync failure must never undo a successful legacy login.
    void autoSyncPermissionRegistry(response);

    return {
      success: true,
      rememberSaved,
      message:
        rememberAction === 'save' && rememberSaved === false
          ? 'Login successful, but "Remember me" was not saved because the screen lock could not be confirmed.'
          : undefined,
    };
  } catch (e: any) {
    return { success: false, message: e?.message || 'Unable to login.' };
  }
}
