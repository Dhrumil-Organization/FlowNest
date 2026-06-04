import client from './apiClient';
import {ApiResponse, InquiryShade, ShadeStock} from '../types';

export const shadesApi = {
  /** List shades for a design */
  list: async (designId: number): Promise<InquiryShade[]> => {
    const res = await client.get<ApiResponse<InquiryShade[]>>(
      `/designs/${designId}/shades`,
    );
    return res.data.data;
  },

  /** Save shades (bulk replace) */
  save: async (
    designId: number,
    shades: Array<{
      shade_name: string;
      shade_code?: string;
      quantity: number;
      rate?: number;
    }>,
  ): Promise<InquiryShade[]> => {
    const res = await client.post<ApiResponse<InquiryShade[]>>(
      `/designs/${designId}/shades`,
      {shades},
    );
    return res.data.data;
  },

  /** Get stock for a shade name */
  stock: async (name: string): Promise<ShadeStock> => {
    const res = await client.get<ApiResponse<ShadeStock>>('/shades/stock', {
      params: {name},
    });
    return res.data.data;
  },
};
