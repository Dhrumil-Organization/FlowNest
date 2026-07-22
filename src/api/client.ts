// ─────────────────────────────────────────────────────────────
// FILE: src/api/client.ts
// Phase 1 real API client for Sudamo mobile platform.
// No axios dependency required.
// ─────────────────────────────────────────────────────────────

import AsyncStorage from '@react-native-async-storage/async-storage';
import { API } from '../../common/API/dynamicAPI';

//export const API_BASE_URL = 'https://apig.tms-webapp.com';
// For local testing, replace above with your local Laravel API base:
// export const API_BASE_URL = API;
export const API_BASE_URL = 'https://apig.tms-webapp.com';
// export const API_BASE_URL = 'https://apig.tms-webapp.com';

export type LoginPayload = {
  name: string;
  password: string;
  checkdevice?: string | null;
  noti_token?: string | null;
};

export type BusinessContext = {
  year_no: string;
  year_name: string;
  prp_code: string;
  prp_group: string;
  str_code: string;
};

export type AppPermissionTab = {
  tab_key: string;
  tab_name: string;
  can_view: boolean;
};

export type AppPermissionScreen = {
  screen_key: string;
  screen_name: string;
  can_view: boolean;
  tabs: AppPermissionTab[];
  actions: Record<string, boolean>;
};

export type AppSession = {
  business_context: BusinessContext;
  permissions: {
    dashboards: any[];
    screens: AppPermissionScreen[];
  };
};

export type LoginResponse = {
  success: boolean;
  message?: string;
  response?: {
    user?: any;
    access_token?: string;
    year?: any;
    prpcode?: string;
    strcode?: string;
    userof?: string;
    issuperadmin?: number;
    role1?: any;
    app_session?: AppSession;
    [key: string]: any;
  };
};

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await AsyncStorage.getItem('access_token');

  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    'x-platform': 'mob',
    ...(options.headers as Record<string, string> | undefined),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  // const res = await fetch(`${API_BASE_URL}${path}`, {
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers,
  });
  console.log('API URL NEW LOGIN:', `${API}${path}`);

  const text = await res.text();
  // console.log('API URL:', `${API_BASE_URL}${path}`);
// console.log('STATUS:', res.status);
// console.log('RAW RESPONSE:', text.slice(0, 1000));

  let data: any = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }

  if (!res.ok) {
    const message = data?.message || data?.error || `HTTP ${res.status}`;
    throw new Error(message);
  }

  return data as T;
}

export const AuthAPI = {
  login(payload: LoginPayload) {
    console.log('Login Payload:', payload);
    return request<LoginResponse>('/api/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};

export const ApiClient = {
  get<T>(path: string) {
    return request<T>(path, { method: 'GET' });
  },
  post<T>(path: string, body: any) {
    return request<T>(path, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },
};
