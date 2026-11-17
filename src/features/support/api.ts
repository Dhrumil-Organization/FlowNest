// FILE: src/features/support/api.ts
// Support Desk HTTP calls. One endpoint per action:
//   IT Desk   POST {API}/api/support/it/<action>       header X-Support-Token (own IT login)
//   FlowNest  POST {API}/api/support/client/<action>   Bearer <FlowNest token> + right support.raise_ticket
// Every answer: { success, response: { data }, message }.
import axios, { AxiosInstance } from 'axios';
import { Platform } from 'react-native';

export class SupportApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

const clean = (base: string) => String(base || '').replace(/\/+$/, '').replace(/\/api$/, '');

function unwrap(r: any) {
  const b = r?.data;
  if (!b || b.success !== true) throw new SupportApiError(b?.message || 'Something went wrong.', r?.status || 500);
  return b.response?.data;
}

function toError(e: any): SupportApiError {
  if (e instanceof SupportApiError) return e;
  const status = e?.response?.status || 0;
  const msg = e?.response?.data?.message
    || (status === 0 || e?.code === 'ERR_NETWORK' ? 'No connection to the server.' : e?.message || 'Something went wrong.');
  return new SupportApiError(String(msg), status);
}

function make(base: string, headers: Record<string, string>, prefix: string, timeout = 30000) {
  const c: AxiosInstance = axios.create({ baseURL: `${clean(base)}/api/support/${prefix}`, timeout, headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...headers } });
  return async <T = any>(action: string, body: Record<string, any> = {}, opts: { timeout?: number; signal?: AbortSignal } = {}): Promise<T> => {
    try {
      return unwrap(await c.post(action, body, { timeout: opts.timeout || timeout, signal: opts.signal })) as T;
    } catch (e) {
      throw toError(e);
    }
  };
}

export type SupportCall = <T = any>(action: string, body?: Record<string, any>, opts?: { timeout?: number; signal?: AbortSignal }) => Promise<T>;

export function itApi(base: string, token: string): SupportCall {
  return make(base, { 'X-Support-Token': token }, 'it');
}

export function clientApi(base: string, bearer: string, property: string): SupportCall {
  return make(base, { Authorization: `Bearer ${bearer}`, 'X-Erp-Property': property, 'X-Requested-With': 'XMLHttpRequest' }, 'client');
}

export async function itLogin(base: string, username: string, password: string) {
  try {
    const device = `${Platform.OS}${Platform.OS === 'web' && typeof navigator !== 'undefined' ? ` · ${String(navigator.userAgent || '').slice(0, 80)}` : ''}`;
    const r = await axios.post(`${clean(base)}/api/support/it/login`, { username, password, device }, { timeout: 20000, headers: { Accept: 'application/json' } });
    return unwrap(r) as { token: string; user: any; meta: any };
  } catch (e) {
    throw toError(e);
  }
}

/** absolute URL for a picture (the server sends /api/support/file/…) */
export const fileUrl = (base: string, url: string) => (/^https?:/i.test(url) ? url : `${clean(base)}${url}`);
export const exportUrl = (base: string, params: Record<string, string>, path: 'it-export' | 'client-export' = 'it-export') => {
  const qs = Object.keys(params).filter((k) => params[k]).map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`).join('&');
  return `${clean(base)}/api/support/${path}${qs ? `?${qs}` : ''}`;
};
