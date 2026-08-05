// import { ApiClient } from './client';

// export type AccessRole = { id: number; role_key: string; role_name: string };
// export type AccessUser = { id: number; name?: string; first_name?: string; last_name?: string; email?: string };

// export const AppAccessAPI = {
//   bootstrap() {
//     return ApiClient.get<any>('/api/app-access/bootstrap');
//   },
//   syncRegistry(payload: any) {
//     return ApiClient.post<any>('/api/app-access/registry/sync', payload);
//   },
//   getRole(roleId: number) {
//     return ApiClient.get<any>(`/api/app-access/role/${roleId}`);
//   },
//   saveRole(roleId: number, permissions: any[]) {
//     return ApiClient.post<any>(`/api/app-access/role/${roleId}/save`, { permissions });
//   },
//   getUser(userId: number) {
//     return ApiClient.get<any>(`/api/app-access/user/${userId}`);
//   },
//   saveUser(userId: number, roleIds: number[], overrides: any[]) {
//     return ApiClient.post<any>(`/api/app-access/user/${userId}/save`, {
//       role_ids: roleIds,
//       overrides,
//     });
//   },
//   session() {
//     return ApiClient.get<any>('/api/app-access/session');
//   },
// };
import { ApiClient } from './client';

export type AccessDecision = 'allow' | 'deny' | 'inherit';
export type AccessPermissionRow = { resource_path: string; action_key?: string; decision: AccessDecision };
export type AccessRole = { id: number; role_id?: number; role_key?: string; name?: string; role_name: string; description?: string };
export type AccessUser = { id: number; name?: string; first_name?: string; last_name?: string; email?: string };

export const unwrapAccessResponse = <T = any>(result: any): T =>
  (result?.response ?? result?.data?.response ?? result?.data ?? result) as T;

export const AppAccessAPI = {
  bootstrap: () => ApiClient.get<any>(`/api/app-access/bootstrap?reload=${Date.now()}`),
  roles: () => ApiClient.get<any>('/api/app-access/roles'),
  resources: () => ApiClient.get<any>(`/api/app-access/resources?reload=${Date.now()}`),
  registryStatus: () => ApiClient.get<any>('/api/app-access/registry/status'),
  syncRegistry: (payload: any) => ApiClient.post<any>('/api/app-access/registry/sync', payload),
  getRole: (roleId: number) => ApiClient.get<any>(`/api/app-access/role/${roleId}?reload=${Date.now()}`),
  saveRole: (roleId: number, permissions: AccessPermissionRow[]) => ApiClient.post<any>(`/api/app-access/role/${roleId}/save`, { permissions }),
  getUser: (userId: number) => ApiClient.get<any>(`/api/app-access/user/${userId}?reload=${Date.now()}`),
  saveUser: (userId: number, roleIds: number[], overrides: AccessPermissionRow[]) => ApiClient.post<any>(`/api/app-access/user/${userId}/save`, { role_ids: roleIds, overrides }),
  session: () => ApiClient.get<any>(`/api/app-access/session?reload=${Date.now()}`),
};
