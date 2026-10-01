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
import { normalizeErpProperty } from '@/common/API/dynamicAPI';
import { saveCredentialsForPropertySwitch } from '../lib/biometricAuth';
import {
  forgetRememberedLogin,
  saveRememberedLogin,
  type SaveRememberResult,
} from '../lib/rememberedLogin';
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
  /**
   * 'rejected' → the ERP server answered and refused the username/password.
   * 'error'    → network / unexpected failure (saved login must NOT be wiped).
   */
  failure?: 'rejected' | 'error';
  /** Only meaningful when rememberAction === 'save'. */
  rememberSaved?: boolean;
  /** Full result of the Remember-me save (e.g. 'needs-gesture' on Safari). */
  remember?: SaveRememberResult;
  /** Friendly name used as the hint on the Auto Login card. */
  displayName?: string;
};

/** The NEW ERP property the next login / saved login belongs to. */
export async function getActiveNewErpProperty(): Promise<string> {
  return normalizeErpProperty(await AsyncStorage.getItem('selected_property'));
}

/**
 * rememberAction:
 *  - 'save'      -> Manual login with "Remember me" checked. AFTER the
 *                    login itself succeeds, the device's own lock
 *                    (Android screen lock / iOS Face ID+passcode /
 *                    Windows Hello / Touch ID; a PC without any screen
 *                    lock saves directly) is prompted to CONFIRM it's
 *                    really them, then the credentials are saved for the
 *                    selected NEW ERP property (src/lib/rememberedLogin).
 *                    If that confirmation fails, nothing is saved.
 *  - 'clear'     -> Manual login with "Remember me" unchecked: wipe
 *                    any previously saved credentials.
 *  - undefined   -> Don't touch saved-credential state at all. Used by
 *                    the Auto Login path, which already confirmed the
 *                    device lock itself before calling this.
 */
export async function performLogin(
  username: string,
  password: string,
  rememberAction?: 'save' | 'clear',
  noti_token?: string,
  getDeviceId?: string,
): Promise<LoginOutcome> {
  try {
    const res = await AuthAPI.login({
      name: username.trim(),
      password: password.trim(),
      noti_token: noti_token || 'xyz-noti-token',
      checkdevice: getDeviceId || 'xyz-device',
      // isclient: 1,
    });

    if (!res.success) {
      return { success: false, failure: 'rejected', message: res.message || 'Invalid username or password.' };
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

    // Keep the successfully used credentials in OS secure storage for the
    // in-app property switch. This does not alter the existing login/session
    // or Remember Me flow.
    await saveCredentialsForPropertySwitch(username.trim(), password.trim());

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
    let remember: SaveRememberResult | undefined;
    const displayName = String(user?.first_name || user?.displayname || user?.name || username).trim();

    if (rememberAction === 'save' || rememberAction === 'clear') {
      const property = await getActiveNewErpProperty();
      if (rememberAction === 'save') {
        // Login just succeeded with a real username/password. Only now do
        // we ask the device lock (Face ID / screen lock / Windows Hello /
        // Touch ID) to confirm, and only then save — per property.
        remember = await saveRememberedLogin(property, { username: username.trim(), password: password.trim() }, displayName);
        rememberSaved = remember.saved;
      } else {
        await forgetRememberedLogin(property);
      }
      await useAppSessionStore.getState().setBiometricEnabled(Boolean(rememberSaved));
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
      remember,
      displayName,
      message:
        rememberAction === 'save' && rememberSaved === false && remember?.reason !== 'needs-gesture'
          ? `Login successful. ${remember?.message || '"Remember me" was not saved.'}`
          : undefined,
    };
  } catch (e: any) {
    const status = Number(e?.status) || 0;
    // 4xx (except timeout / rate-limit) = the server refused these credentials.
    const rejected = status >= 400 && status < 500 && status !== 408 && status !== 429;
    return { success: false, failure: rejected ? 'rejected' : 'error', message: e?.message || 'Unable to login.' };
  }
}
