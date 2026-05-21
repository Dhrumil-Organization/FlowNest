import client from './apiClient';
import {ApiResponse, Design, GstinData, Party} from '../types';

export const masterApi = {
  // Search existing parties from famacc
  searchParties: async (q: string): Promise<Party[]> => {
    const res = await client.get<ApiResponse<Party[]>>('/api/parties/search', {
      params: {q, prpcode: 'SIP', yearno: '27'},
    });
    console.log("party api called", q, res);
    return res.data.data;
  },

  // Fetch GSTIN details from external API
  fetchGstin: async (gstin: string): Promise<GstinData> => {
    const res = await client.get<ApiResponse<GstinData>>(`/api/gstin/${gstin}`);
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
    prpcode?: string;
    yearno?: string;
  }): Promise<Party> => {
    console.log("store party api called", party, res);
    const res = await client.post<ApiResponse<Party>>('/api/parties', party);
    return res.data.data;
  },

  // Search existing designs from dapdesign
  searchDesigns: async (q: string): Promise<Design[]> => {
    const res = await client.get<ApiResponse<Design[]>>('/api/designs/search', {
      params: {q, prpcode: 'SIP', yearno: '27'},
    });
    return res.data.data;
  },

  storeDesign: async (design: {
    name: string;
    short_name?: string;
  }): Promise<Design> => {
    const res = await client.post<ApiResponse<Design>>('/api/designs', design);
    return res.data.data;
  },
};
