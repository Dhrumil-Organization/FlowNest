// ─────────────────────────────────────────────────────────────
// FILE: src/stores/AppSessionStore.ts
// Session + permission store for Sudamo mobile platform.
// ─────────────────────────────────────────────────────────────

import AsyncStorage from '@/common/utils/compatibleStorage';
import { router } from 'expo-router';
import { create } from 'zustand';
import type { AppPermissionScreen, AppSession } from '../api/client';

type SessionState = {
  token: string | null;
  user: any | null;
  appSession: AppSession | null;
  rawLoginResponse: any | null;
  biometricEnabled: boolean;
  hydrated: boolean;
  // In-memory only (never persisted). True for the brief moment right
  // after a manual login or a successful biometric auto-login in THIS
  // app session, so the login route knows not to re-show the
  // biometric gate it was just satisfied by. Reset on cold start.
  freshLogin: boolean;

  setLoggedIn: (payload: {
    token: string;
    user: any;
    appSession: AppSession;
    rawLoginResponse?: any;
  }) => void;

  setBiometricEnabled: (enabled: boolean) => void;
  setAppSession: (appSession: AppSession) => Promise<void>;
  hydrate: () => Promise<void>;
  logout: () => Promise<void>;

  canScreen: (screenKey: string) => boolean;
  canTab: (screenKey: string, tabKey: string) => boolean;
  canAction: (screenKey: string, actionKey: string) => boolean;
  getScreen: (screenKey: string) => AppPermissionScreen | null;
  allowedScreens: () => AppPermissionScreen[];
};

const STORAGE_KEYS = [
  'access_token',
  'app_session',
  'user_details',
  'user_id',
  'user_prptype',
  'yno',
  'user_login_role',
  'LOOKUP_PLATFORM',
  'mobile_user',
  'mobile_raw_login_response',
];

function findScreen(appSession: AppSession | null, screenKey: string) {
  return appSession?.permissions?.screens?.find(
    (s) => s.screen_key === screenKey && s.can_view
  ) || null;
}

export const useAppSessionStore = create<SessionState>((set, get) => ({
  token: null,
  user: null,
  appSession: null,
  rawLoginResponse: null,
  biometricEnabled: false,
  hydrated: false,
  freshLogin: false,

  setLoggedIn: ({ token, user, appSession, rawLoginResponse }) => {
    // Persist the complete permission identity. Without this, a cold start only
    // restores a minimal user and the tab registry incorrectly hides routes.
    void AsyncStorage.multiSet([
      ['access_token', token],
      ['app_session', JSON.stringify(appSession)],
      ['mobile_user', JSON.stringify(user || null)],
      ['mobile_raw_login_response', JSON.stringify(rawLoginResponse || null)],
    ]);
    set({ token, user, appSession, rawLoginResponse: rawLoginResponse || null, hydrated: true, freshLogin: true });
  },

  setAppSession: async (appSession) => {
    await AsyncStorage.setItem('app_session', JSON.stringify(appSession));
    set({ appSession });
  },

  setBiometricEnabled: async (enabled) => {
    await AsyncStorage.setItem('biometric_enabled', enabled ? '1' : '0');
    set({ biometricEnabled: enabled });
  },

  hydrate: async () => {
    const token = await AsyncStorage.getItem('access_token');
    const appSessionRaw = await AsyncStorage.getItem('app_session');
    const biometricRaw = await AsyncStorage.getItem('biometric_enabled');
    const userId = await AsyncStorage.getItem('user_id');
    const userName = await AsyncStorage.getItem('user_details');
    const persistedUserRaw = await AsyncStorage.getItem('mobile_user');
    const persistedLoginRaw = await AsyncStorage.getItem('mobile_raw_login_response');

    let appSession: AppSession | null = null;
    try {
      appSession = appSessionRaw ? JSON.parse(appSessionRaw) : null;
    } catch {
      appSession = null;
    }

    let persistedUser: any = null;
    let persistedLogin: any = null;
    try { persistedUser = persistedUserRaw ? JSON.parse(persistedUserRaw) : null; } catch { persistedUser = null; }
    try { persistedLogin = persistedLoginRaw ? JSON.parse(persistedLoginRaw) : null; } catch { persistedLogin = null; }

    set({
      token,
      appSession,
      user: token ? (persistedUser || { id: userId, first_name: userName || 'User' }) : null,
      rawLoginResponse: token ? persistedLogin : null,
      biometricEnabled: biometricRaw === '1',
      hydrated: true,
      freshLogin: false, // cold start: gate must be offered if biometric is on
    });
  },

  logout: async () => {
    await AsyncStorage.multiRemove(STORAGE_KEYS);
    set({
      token: null,
      user: null,
      appSession: null,
      rawLoginResponse: null,
      hydrated: true,
      freshLogin: false,
    });
    router.replace('/(all)/landing');
  },

  canScreen: (screenKey) => Boolean(findScreen(get().appSession, screenKey)),

  canTab: (screenKey, tabKey) => {
    const screen = findScreen(get().appSession, screenKey);
    return Boolean(screen?.tabs?.some((t) => t.tab_key === tabKey && t.can_view));
  },

  canAction: (screenKey, actionKey) => {
    const screen = findScreen(get().appSession, screenKey);
    return Boolean(screen?.actions?.[actionKey]);
  },

  getScreen: (screenKey) => findScreen(get().appSession, screenKey),

  allowedScreens: () => get().appSession?.permissions?.screens?.filter((s) => s.can_view) || [],
}));
