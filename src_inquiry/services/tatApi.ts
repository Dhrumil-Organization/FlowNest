import client from './apiClient';
import {ApiResponse, TatAnalytics, TatConfiguration} from '../types';

export const tatApi = {
  listConfigurations: async (params: {prptype?: string; yearno?: string} = {}): Promise<TatConfiguration[]> => {
    const res = await client.get<ApiResponse<TatConfiguration[]>>(
      '/api/tat/configurations',{
        params,
      });
    console.log("tat api called", params, res);
    return res.data.data;
  },

  updateConfiguration: async (
    id: number,
    payload: Partial<TatConfiguration>,
  ): Promise<TatConfiguration> => {
    const res = await client.patch<ApiResponse<TatConfiguration>>(
      `/api/tat/configurations/${id}`,
      payload,
    );
    return res.data.data;
  },

  bulkUpdate: async (
    configurations: Array<{
      id: number;
      expected_hours: number;
      warning_threshold_percent: number;
    }>,
    prptype: string,
    yearno: string
  ): Promise<TatConfiguration[]> => {
    const res = await client.post<ApiResponse<TatConfiguration[]>>(
      '/api/tat/configurations/bulk',
      {
        configurations: configurations.map(c => ({
          ...c,
          prptype,
          yearno
        })),
        prptype,
        yearno
      },
    );
    console.log("tat bulkUpdate api called", configurations, res);
    return res.data.data;
  },

  analytics: async (params: {prptype?: string; yearno?: string} = {}): Promise<TatAnalytics[]> => {
    const res = await client.get<ApiResponse<TatAnalytics[]>>('/api/tat/analytics', {
      params,
    });
    console.log("tat analytics api called", params, res);
    return res.data.data;
  },
};
