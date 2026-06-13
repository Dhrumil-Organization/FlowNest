import client from './apiClient';
import {ApiResponse, Design, GstinData, Party, UserRights} from '../types';

// Helper: combine address parts from GST response
const buildAddress = (result: any): string => {
  const parts = [
    result.AddrBnm,
    result.AddrBno,
    result.AddrFlno,
    result.AddrSt,
    result.AddrLoc,
  ].filter(Boolean);
  return parts.join(', ');
};

export const masterApi = {
  // Search existing parties from famacc
  searchParties: async (q: string, prptype: string, yearno: string): Promise<Party[]> => {
    const res = await client.get<ApiResponse<Party[]>>('/api/parties/search', {
      params: {q, prptype: prptype, yearno: yearno},
    });
    console.log("party api called", q, res);
    return res.data.data;
  },

  fetchGstin: async (gstin: string, prptype: string, yearno: string): Promise<GstinData> => {
    const payload = {
      prptype: prptype,
      yearno: yearno,
      action: "add",
      txntype: "account_master",
      gstin: gstin.trim().toUpperCase(),
    };

    try {
      const response = await client.post('/api/check_single_gstin', payload); // replace with actual endpoint
      const { success, result } = response.data;
      console.log('GSTIN fetch response:', response, payload);

      if (!success) {
        throw new Error(response.data.message || 'GSTIN fetch failed');
      }

      // Map the result to GstinData format expected by AddPartyScreen
      const gstinData: GstinData = {
        gstin: result.Gstin || gstin,
        legal_name: result.LegalName || '',
        trade_name: result.TradeName || '',
        address: buildAddress(result),
        city: result.AddrLoc || '',
        state: result.State || '', // if backend returns state name; otherwise you can map StateCode
        pincode: result.AddrPncd ? String(result.AddrPncd) : '',
        status: result.Status || '',
      };

      return gstinData;
    } catch (error) {
      console.error('GSTIN fetch error:', error);
      throw error; // let the caller handle it
    }
  },

  checkRights: async (permission: string, user_id: string, txntype: string): Promise<UserRights> => {
    try {
      const response = await client.get('/api/checkrights', {
        params: { permission: permission, user_id: user_id, txntype: txntype }
      }); // replace with actual endpoint
      const { success } = response.data;
      console.log('rights api response:', response);

      if (!success) {
        throw new Error(response.data.message || 'rights fetch failed');
      }

      return response.data;
    } catch (error) {
      console.error('rights fetch error:', error);
      throw error; // let the caller handle it
    }
  },

//   storeParty: async (
//     party: {
//     name: string;
//     address?: string;
//     city?: string;
//     state?: string;
//     pincode?: string;
//     gstin?: string;
//     mobile?: string;
//     email?: string;
//     contact?: string;
//     prptype?: string;
//     yearno?: string;
//   },
//   prpcode: string,
//   yearno: string
// ): Promise<Party> => {
//   const payload = {
//     party: party,
//     prptype: 'S',
//     yearno,
//   };
//     const res = await client.post<ApiResponse<Party>>('/api/parties', payload);
//     console.log("store party api called", payload, res);
//     return res.data.data;
//   },

  // Search existing designs from dapdesign
  searchDesigns: async (q: string, prptype: string, yearno: string): Promise<Design[]> => {
    const res = await client.get<ApiResponse<Design[]>>('/api/designs/search', {
      params: {q, prptype: prptype , yearno: yearno},
    });
    return res.data.data;
  },

  searchShades: async (search: string, prptype: string, yearno: string) => {
    const response = await client.get('/api/shades/search', { params: { search, prptype: prptype , yearno: yearno } });
    return response.data; // expects array of { name, code? }
  },

  storeDesign: async (design: {
    name: string;
    short_name?: string;
  }): Promise<Design> => {
    const res = await client.post<ApiResponse<Design>>('/api/designs', design);
    return res.data.data;
  },
};