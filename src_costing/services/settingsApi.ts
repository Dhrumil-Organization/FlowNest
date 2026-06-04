import client from './apiClient';
import {ApiResponse, UserPermissions} from '../types';

export const settingsApi = {
  /** Current user's permissions */
  myPermissions: async (): Promise<UserPermissions> => {
    const res = await client.get<ApiResponse<UserPermissions>>(
      '/settings/me/permissions',
    );
    return res.data.data;
  },

  /** Admin: list authorizer user IDs */
  listAuthorizers: async (): Promise<number[]> => {
    const res = await client.get<ApiResponse<{user_ids: number[]}>>(
      '/settings/authorizers',
    );
    return res.data.data.user_ids;
  },

  /** Admin: update authorizer user IDs */
  updateAuthorizers: async (userIds: number[]): Promise<number[]> => {
    const res = await client.put<ApiResponse<{user_ids: number[]}>>(
      '/settings/authorizers',
      {user_ids: userIds},
    );
    return res.data.data.user_ids;
  },
};
