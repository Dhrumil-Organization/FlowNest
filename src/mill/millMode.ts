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
// NO separate Mills login: it is the same Sudamo user. Switch ON only reads his Mill Hub rights
// from Sudamo (/api/mill/session/status); the data comes from the Mills server through Sudamo.
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

      // Same Sudamo user — no Mills login. Read his Mill rights (fresh, so changes in Permission
      // Manager are picked up). No Mill right / Sudamo not reachable → stay in the ERP
      // (and go back to Rayons if we came from there).
      const r = await MillSessionApi.status();
      if (!r.session || !r.session.hasAccess) {
        if (prev !== MILL_PROPERTY) {
          try { await reloginOnProperty(prev); } catch { /* stay on apig */ }
        }
        throw new Error(r.session
          ? 'You do not have any Mill Hub rights.\n\n' + millRightsReason(r.session)
          : (r.message || 'Could not read the Mill rights. Please try again.'));
      }
      set({ session: r.session, loginError: null });
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
