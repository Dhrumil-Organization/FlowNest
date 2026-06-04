import client from './apiClient';
import {ApiResponse, UserPermissions} from '../types';

export const settingsApi = {
  /** Current user's permissions */
  myPermissions: async (prptype: string, yearno: string): Promise<UserPermissions> => {
    const res = await client.get<ApiResponse<UserPermissions>>(
      `/api/settings/me/permissions?prptype=${prptype}&yearno=${yearno}`,
    );
    console.log('setting myPermissions', prptype, yearno, res);
    return res.data.data;
  },

  /** Admin: list authorizer user IDs */
  listAuthorizers: async (prptype: string, yearno: string): Promise<number[]> => {
    const res = await client.get<ApiResponse<{user_ids: number[]}>>(
      `/api/settings/authorizers?prptype=${prptype}&yearno=${yearno}`,
    );
    console.log('setting listAuthorizers', prptype, yearno, res);
    return res.data.data.user_ids;
  },

  /** Admin: update authorizer user IDs */
  updateAuthorizers: async (userIds: number[], prptype: string, yearno: string): Promise<number[]> => {
    const res = await client.put<ApiResponse<{user_ids: number[]}>>(
      `/api/settings/authorizers?prptype=${prptype}&yearno=${yearno}`,
      {user_ids: userIds},
    );
    console.log('setting updateAuthorizers', prptype, yearno, res);
    return res.data.data.user_ids;
  },
};
