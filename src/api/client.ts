// ─────────────────────────────────────────────────────────────
// FILE: src/api/client.ts
// Phase 1 real API client for Sudamo mobile platform.
// No axios dependency required.
// ─────────────────────────────────────────────────────────────

import AsyncStorage from '@/common/utils/compatibleStorage';
// import { API } from '../../common/API/dynamicAPI';

// const NEW_ERP_API_URLS = {
//   sudamo_knits: 'https://apig.tms-webapp.com',
//   rayons: 'https://apiy.tms-webapp.com', 
// } as const;
const NEW_ERP_API_URLS = {
  sudamo_knits: 'http://192.168.13.100:4017',
  rayons: 'http://192.168.13.100:4017',
} as const;

export type NewErpProperty = keyof typeof NEW_ERP_API_URLS;

// Keep these exports because existing New ERP screens already import them.
// They are live bindings and are refreshed from selected_property.
export let API_BASE_URL: string = NEW_ERP_API_URLS.sudamo_knits;
export let API: string = API_BASE_URL;

export function resolveNewErpApiBaseUrl(property: string | null | undefined): string {
  return property === 'rayons'
    ? NEW_ERP_API_URLS.rayons
    : NEW_ERP_API_URLS.sudamo_knits;
}

export async function initNewErpAPI(): Promise<string> {
  const property = await AsyncStorage.getItem('selected_property');
  API_BASE_URL = resolveNewErpApiBaseUrl(property);
  API = API_BASE_URL;

  console.log('NEW ERP API initialized:', { property, api: API_BASE_URL });
  return API_BASE_URL;
}

export async function setNewErpProperty(property: NewErpProperty): Promise<string> {
  await AsyncStorage.setItem('selected_property', property);
  API_BASE_URL = resolveNewErpApiBaseUrl(property);
  API = API_BASE_URL;

  console.log('NEW ERP property selected:', { property, api: API_BASE_URL });
  return API_BASE_URL;
}

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
  // Resolve on every request as a safety net. This prevents a stale module-level
  // URL from sending Rayons credentials/data to the Sudamo API after the user
  // changes property.
  const apiBase = await initNewErpAPI();
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

  const res = await fetch(`${apiBase}${path}`, {
    ...options,
    headers,
  });
  console.log('API URL NEW:', `${apiBase}${path}`);

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
