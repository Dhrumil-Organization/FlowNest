import client from './apiClient';
import {ApiResponse, TatAnalytics, TatConfiguration} from '../types';

export const tatApi = {
  listConfigurations: async (): Promise<TatConfiguration[]> => {
    const res = await client.get<ApiResponse<TatConfiguration[]>>(
      '/tat/configurations',
    );
    return res.data.data;
  },

  updateConfiguration: async (
    id: number,
    payload: Partial<TatConfiguration>,
  ): Promise<TatConfiguration> => {
    const res = await client.patch<ApiResponse<TatConfiguration>>(
      `/tat/configurations/${id}`,
      payload,
    );
    return res.data.data;
  },

  bulkUpdate: async (
    configurations: Array<{
      id: number;
      expected_hours: number;
      warning_threshold_percent?: number;
    }>,
  ): Promise<TatConfiguration[]> => {
    const res = await client.post<ApiResponse<TatConfiguration[]>>(
      '/tat/configurations/bulk',
      {configurations},
    );
    return res.data.data;
  },

  analytics: async (params: {from?: string; to?: string} = {}): Promise<TatAnalytics[]> => {
    const res = await client.get<ApiResponse<TatAnalytics[]>>('/tat/analytics', {
      params,
    });
    return res.data.data;
  },
};
