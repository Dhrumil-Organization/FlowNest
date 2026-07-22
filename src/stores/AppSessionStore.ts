// ─────────────────────────────────────────────────────────────
// FILE: src/stores/AppSessionStore.ts
// Session + permission store for Sudamo mobile platform.
// ─────────────────────────────────────────────────────────────

import AsyncStorage from '@react-native-async-storage/async-storage';
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

  setLoggedIn: ({ token, user, appSession, rawLoginResponse }) => {
    set({ token, user, appSession, rawLoginResponse: rawLoginResponse || null, hydrated: true });
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

    let appSession: AppSession | null = null;
    try {
      appSession = appSessionRaw ? JSON.parse(appSessionRaw) : null;
    } catch {
      appSession = null;
    }

    set({
      token,
      appSession,
      user: token ? { id: userId, first_name: userName || 'User' } : null,
      biometricEnabled: biometricRaw === '1',
      hydrated: true,
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
