// Legacy ERP login used only by the /embed route.
// The normal /(auth)/login.tsx flow remains unchanged.

import axios from 'axios';
import AsyncStorage from '@/common/utils/compatibleStorage';
import { API, initAPI } from '@/common/API/dynamicAPI';
import { buildProfileFromLogin } from '@/common/utils/profileStorage';
import { saveCredentialsForPropertySwitch } from '@/src/lib/biometricAuth';
import { setCustomUsername } from '@/common/utils/feedbackStorage';
import { getLoginSource } from '@/src/platform/runtime';
import * as Device from 'expo-device';
import { useAppSessionStore } from '@/src/stores/AppSessionStore';

export type LegacyEmbeddedLoginResult = {
  success: boolean;
  message?: string;
};

export async function performLegacyEmbeddedLogin(args: {
  username: string;
  password: string;
  property: 'sudamo_knits' | 'rayons';
}): Promise<LegacyEmbeddedLoginResult> {
  const username = args.username.trim();
  const password = args.password.trim();

  if (!username || !password) {
    return { success: false, message: 'Username and password are required.' };
  }

  try {
    await AsyncStorage.setItem('LOOKUP_PLATFORM', 'OLD');
    await AsyncStorage.setItem('selected_property', args.property);
    await initAPI(args.property);

    const notiToken =
      (await AsyncStorage.getItem('notification_token')) ||
      'xyz-noti-token';
    const deviceId = Device.osInternalBuildId || 'test-device';

    const response = await axios.post(
      `${API}/api/login`,
      {
        name: username,
        password,
        noti_token: notiToken,
        checkdevice: deviceId,
      },
      {
        headers: { 'x-platform': 'mob' },
      }
    );

    const data = response.data;

    if (!data?.success) {
      return {
        success: false,
        message: data?.response?.message || data?.message || 'Invalid username or password.',
      };
    }

    const login = data.response || {};
    const token = login.access_token;
    const user = login.user;
    const userDetails = user?.first_name || 'user';
    const userMenuApps = login.usermenu || '';
    const userOf = login.userof || '';
    const yearNo = login.year?.YearNo || '';
    const role1 = login.role1;
    const userId = user?.id || 0;
    const isMasterSync = login.ismastersync || '';
    const masterSyncData = login.mastersyncprptypes || [];

    if (!token || !user || !userMenuApps) {
      return { success: false, message: login?.message || 'Login response is incomplete.' };
    }

    if (String(user?.is_deleted || '') === '1') {
      return { success: false, message: 'User not available. Please register yourself.' };
    }

    // Match the existing legacy session storage so all existing legacy screens
    // continue to read the same session values.
    await AsyncStorage.setItem('mobile_raw_login_response', JSON.stringify(login));
    await AsyncStorage.setItem('access_token', token);
    await AsyncStorage.setItem('user_details', userDetails);
    await AsyncStorage.setItem('user_menu_apps', userMenuApps);
    await AsyncStorage.setItem('user_prptype', userOf);
    await AsyncStorage.setItem('login_user_name', username);
    await AsyncStorage.setItem('login_user_passwd', password);
    await AsyncStorage.setItem('yno', String(yearNo));
    await AsyncStorage.setItem('user_login_role', JSON.stringify(role1 ?? null));
    await AsyncStorage.setItem('user_id', JSON.stringify(userId));
    await AsyncStorage.setItem('ENABLE_DEVICE_CHECK', 'true');
    await AsyncStorage.setItem('LOGIN_SOURCE', getLoginSource());
    await AsyncStorage.setItem('LOOKUP_PLATFORM', 'OLD');

    await buildProfileFromLogin({
      access_token: token,
      user,
      role1,
      userof: userOf,
      usermenu: userMenuApps,
      year: login.year,
      ismastersync: isMasterSync,
      mastersyncprptypes: masterSyncData,
    });

    if (getLoginSource() !== 'web') {
      await saveCredentialsForPropertySwitch(username, password);
      await setCustomUsername(userDetails);
    }

    // Keep the New-ERP session store from accidentally treating the Legacy
    // token as a New ERP session after an embedded switch.
    useAppSessionStore.setState({
      token: null,
      user: null,
      appSession: null,
      rawLoginResponse: null,
      freshLogin: false,
      hydrated: true,
    });

    return { success: true };
  } catch (error: any) {
    console.error('Embedded Legacy login failed:', error?.response?.data || error);
    return {
      success: false,
      message:
        error?.response?.data?.response?.message ||
        error?.response?.data?.message ||
        error?.message ||
        'Legacy login failed.',
    };
  }
}
