import { ApiClient } from './client';

export type AccessRole = { id: number; role_key: string; role_name: string };
export type AccessUser = { id: number; name?: string; first_name?: string; last_name?: string; email?: string };

export const AppAccessAPI = {
  bootstrap() {
    return ApiClient.get<any>('/api/app-access/bootstrap');
  },
  syncRegistry(payload: any) {
    return ApiClient.post<any>('/api/app-access/registry/sync', payload);
  },
  getRole(roleId: number) {
    return ApiClient.get<any>(`/api/app-access/role/${roleId}`);
  },
  saveRole(roleId: number, permissions: any[]) {
    return ApiClient.post<any>(`/api/app-access/role/${roleId}/save`, { permissions });
  },
  getUser(userId: number) {
    return ApiClient.get<any>(`/api/app-access/user/${userId}`);
  },
  saveUser(userId: number, roleIds: number[], overrides: any[]) {
    return ApiClient.post<any>(`/api/app-access/user/${userId}/save`, {
      role_ids: roleIds,
      overrides,
    });
  },
  session() {
    return ApiClient.get<any>('/api/app-access/session');
  },
};
