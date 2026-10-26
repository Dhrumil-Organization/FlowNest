// ─────────────────────────────────────────────────────────────
// FILE: src/core/singleErp.ts
//
// There is ONE ERP now. The "Select ERP Platform" step (Legacy / New) is
// gone from the app, the web and the embedded entry — every sign-in goes
// to the ERP under /new.
//
// The stored key 'LOOKUP_PLATFORM' is kept (notification routing and a few
// screens still read it) but it is always 'NEW'.
//
// A device that was signed in to the old platform still holds that
// platform's session (its token is not a session of this ERP: there is no
// `app_session` with the user's rights). That session is cleared once, so
// the user signs in again — same as the old selection screen did whenever
// the platform was changed.
// ─────────────────────────────────────────────────────────────
import AsyncStorage from '@/common/utils/compatibleStorage';
import { useAppSessionStore } from '@/src/stores/AppSessionStore';

export const ERP_PLATFORM_KEY = 'LOOKUP_PLATFORM';

/** Session keys of a sign-in (same list the old platform selection cleared). */
const SESSION_KEYS = [
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
];

/**
 * Makes sure this device is on the single ERP. Returns true when an old
 * platform session was found and cleared (the user has to sign in again).
 * Safe to call any number of times.
 */
export async function ensureSingleErp(): Promise<boolean> {
  let cleared = false;
  try {
    const [platform, token, appSession] = await Promise.all([
      AsyncStorage.getItem(ERP_PLATFORM_KEY),
      AsyncStorage.getItem('access_token'),
      AsyncStorage.getItem('app_session'),
    ]);

    if (token && platform !== 'NEW' && !appSession) {
      await AsyncStorage.multiRemove(SESSION_KEYS);
      useAppSessionStore.setState({
        token: null,
        user: null,
        appSession: null,
        rawLoginResponse: null,
        hydrated: true,
        freshLogin: false,
      });
      cleared = true;
    }

    if (platform !== 'NEW') await AsyncStorage.setItem(ERP_PLATFORM_KEY, 'NEW');
  } catch (error) {
    console.log('ensureSingleErp failed', error);
  }
  return cleared;
}
