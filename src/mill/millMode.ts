// ─────────────────────────────────────────────────────────────
// FILE: src/mill/millMode.ts
// MILL MODE — one flag that turns the whole app into the Mill Hub.
//
//   mill_mode          'on' | (missing)   — default OFF
//   mill_prev_property 'rayons' | 'sudamo_knits'
//       Mill always runs on apig (sudamo_knits). If the user was on Rayons when
//       he switched Mill ON, we silently re-login on apig and remember Rayons, so
//       switching Mill OFF brings him back to Rayons.
//
// Login is common: the SAME user name + password logs into the Mills server
// (through Sudamo /api/mill/session/login); his Mill Hub rights come back with it.
// Logout → Mill mode is cleared (next login always starts in the normal ERP).
// ─────────────────────────────────────────────────────────────
import AsyncStorage from '@/common/utils/compatibleStorage';
import { initAPI } from '@/common/API/dynamicAPI';
import { setNewErpProperty, type NewErpProperty } from '@/src/api/client';
import { performLogin } from '@/src/core/authFlow';
import { getCredentialsForPropertySwitch } from '@/src/lib/biometricAuth';
import { useAppSessionStore } from '@/src/stores/AppSessionStore';
import { create } from 'zustand';
import { MillSessionApi, millRightsReason, type MillSession } from './millBridge';

const KEY = 'mill_mode';
const PREV = 'mill_prev_property';
export const MILL_PROPERTY: NewErpProperty = 'sudamo_knits';

type MillModeState = {
  hydrated: boolean;
  enabled: boolean;
  busy: boolean;
  /** Mills login of this user (through Sudamo) + his Mill Hub rights. */
  session: MillSession | null;
  setSession: (s: MillSession | null) => void;
  /** Mills login failed at switch ON (wrong user / password …) → Mill opens with a login box. */
  loginError: string | null;
  clearLoginError: () => void;
  hydrate: () => Promise<void>;
  /** Turn Mill mode ON (switches to apig first when needed). Throws with a user message on failure. */
  turnOn: () => Promise<void>;
  /** Turn Mill mode OFF (restores Rayons when Mill was opened from Rayons). */
  turnOff: () => Promise<void>;
  /** Clear without any re-login (used on logout). */
  reset: () => Promise<void>;
};

async function currentProperty(): Promise<NewErpProperty> {
  const p = await AsyncStorage.getItem('selected_property');
  return p === 'rayons' ? 'rayons' : 'sudamo_knits';
}

/** Same steps as the header "Switch Property" toggle (AppHeader.switchProperty). */
export async function reloginOnProperty(next: NewErpProperty): Promise<void> {
  const before = await currentProperty();
  if (before === next) return;
  const credentials = await getCredentialsForPropertySwitch();
  if (!credentials) throw new Error('Saved login credentials are not available. Please sign in again.');
  try {
    await setNewErpProperty(next);
    const result = await performLogin(credentials.username, credentials.password);
    if (!result.success) throw new Error(result.message || 'Unable to switch property.');
    await initAPI();
  } catch (error) {
    // put the old property back so the app keeps working
    await setNewErpProperty(before);
    await initAPI();
    throw error;
  }
}

export const useMillModeStore = create<MillModeState>((set, get) => ({
  hydrated: false,
  enabled: false,
  busy: false,
  session: null,
  setSession: (session) => set({ session, loginError: session ? null : get().loginError }),
  loginError: null,
  clearLoginError: () => set({ loginError: null }),

  hydrate: async () => {
    if (get().hydrated) return;
    let enabled = false;
    try {
      enabled = (await AsyncStorage.getItem(KEY)) === 'on';
      // Mill can only be ON on the apig session.
      if (enabled && (await currentProperty()) !== MILL_PROPERTY) enabled = false;
    } catch {
      enabled = false;
    }
    set({ hydrated: true, enabled });
  },

  turnOn: async () => {
    if (get().busy || get().enabled) return;
    set({ busy: true });
    try {
      const prev = await currentProperty();
      if (prev !== MILL_PROPERTY) await reloginOnProperty(MILL_PROPERTY);

      // Same user → Mills server (through Sudamo). Wrong user / no Mill right →
      // stay in the ERP (and go back to Rayons if we came from there).
      // always a FRESH Mills login on switch ON (rights / roles changed on Mills are picked up)
      let r = await MillSessionApi.loginWithSaved();
      if (!r.session && r.code === 'MILL_NO_CREDENTIALS') r = await MillSessionApi.status();
      // Logged in but no Mill right → stay in the ERP (back to Rayons if we came from there).
      const noRight = !!r.session && !r.session.hasAccess;
      if (noRight) {
        if (prev !== MILL_PROPERTY) {
          try { await reloginOnProperty(prev); } catch { /* stay on apig */ }
        }
        throw new Error('You do not have any Mill Hub rights.\n\n' + millRightsReason(r.session));
      }
      // Login problem (wrong user / password on Mills, no saved login, Mills offline …)
      // → still open Mill mode; MillShell shows the user name + password box with the reason.
      const loginError = r.session ? null : (r.message || 'Mills login failed. Enter your Mills user name and password.');
      set({ session: r.session, loginError });
      await AsyncStorage.setItem(PREV, prev);
      await AsyncStorage.setItem(KEY, 'on');
      set({ enabled: true });
    } finally {
      set({ busy: false });
    }
  },

  turnOff: async () => {
    if (get().busy) return;
    set({ busy: true });
    try {
      await AsyncStorage.removeItem(KEY);
      set({ enabled: false, session: null });
      MillSessionApi.logout().catch(() => undefined); // drop the Mills token kept on Sudamo
      const prev = (await AsyncStorage.getItem(PREV)) as NewErpProperty | null;
      await AsyncStorage.removeItem(PREV);
      if (prev === 'rayons') {
        try {
          await reloginOnProperty('rayons');
        } catch {
          // stay on apig – user can still switch property from the header
        }
      }
    } finally {
      set({ busy: false });
    }
  },

  reset: async () => {
    try {
      await AsyncStorage.removeItem(KEY);
      await AsyncStorage.removeItem(PREV);
    } catch {
      /* ignore */
    }
    set({ enabled: false, busy: false, session: null, loginError: null });
  },
}));

// Logout (session gone) → Mill mode off, so the next login starts in the ERP.
useAppSessionStore.subscribe((state, prev) => {
  if (prev?.appSession && !state.appSession && useMillModeStore.getState().enabled) {
    void useMillModeStore.getState().reset();
  }
});
