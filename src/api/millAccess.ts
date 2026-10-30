// ─────────────────────────────────────────────────────────────
// FILE: src/api/millAccess.ts
// Permission Manager → "Mills" tab.  apig /api/mill-access/*
//   roles / users  = MILLS server roles & users (read through Sudamo with the
//                    admin's own Mills login)
//   rights         = saved on SUDAMO, only mill.* resources
// Same shapes as AppAccessAPI, so the Permission Manager uses either one.
// ─────────────────────────────────────────────────────────────
import { MILL_LOGIN_REQUIRED, MillSessionApi } from '@/src/mill/millBridge';
import type { AccessPermissionRow } from './accessControl';
import { ApiClient } from './client';

async function call<T = any>(fn: () => Promise<any>): Promise<T> {
  let res: any = await fn();
  if (res && res.success === false && res.code === MILL_LOGIN_REQUIRED) {
    const r = await MillSessionApi.ensure();
    if (!r.session) throw new Error(r.message || 'Mills login failed.');
    res = await fn();
  }
  if (res && res.success === false) throw new Error(res.message || 'Mills access request failed.');
  return res as T;
}

export const MillAccessAPI = {
  bootstrap: () => call(() => ApiClient.get<any>(`/api/mill-access/bootstrap?reload=${Date.now()}`)),
  getRole: (roleId: number) => call(() => ApiClient.get<any>(`/api/mill-access/role/${roleId}?reload=${Date.now()}`)),
  saveRole: (roleId: number, permissions: AccessPermissionRow[]) =>
    call(() => ApiClient.post<any>(`/api/mill-access/role/${roleId}/save`, { permissions })),
  getUser: (userId: number) => call(() => ApiClient.get<any>(`/api/mill-access/user/${userId}?reload=${Date.now()}`)),
  saveUser: (userId: number, roleIds: number[], overrides: AccessPermissionRow[]) =>
    call(() => ApiClient.post<any>(`/api/mill-access/user/${userId}/save`, { role_ids: roleIds, overrides })),
};
