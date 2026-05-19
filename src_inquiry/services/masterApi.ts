import client from './apiClient';
import {ApiResponse, Design, GstinData, Party} from '../types';

export const masterApi = {
  // Search existing parties from famacc
  searchParties: async (q: string): Promise<Party[]> => {
    const res = await client.get<ApiResponse<Party[]>>('/parties/search', {
      params: {q},
    });
    return res.data.data;
  },

  // Fetch GSTIN details from external API
  fetchGstin: async (gstin: string): Promise<GstinData> => {
    const res = await client.get<ApiResponse<GstinData>>(`/gstin/${gstin}`);
    return res.data.data;
  },

  // Save a new party to famacc
  storeParty: async (party: {
    name: string;
    address?: string;
    city?: string;
    state?: string;
    pincode?: string;
    gstin?: string;
    mobile?: string;
    email?: string;
    contact?: string;
  }): Promise<Party> => {
    const res = await client.post<ApiResponse<Party>>('/parties', party);
    return res.data.data;
  },

  // Search existing designs from dapdesign
  searchDesigns: async (q: string): Promise<Design[]> => {
    const res = await client.get<ApiResponse<Design[]>>('/designs/search', {
      params: {q},
    });
    return res.data.data;
  },

  storeDesign: async (design: {
    name: string;
    short_name?: string;
  }): Promise<Design> => {
    const res = await client.post<ApiResponse<Design>>('/designs', design);
    return res.data.data;
  },
};
