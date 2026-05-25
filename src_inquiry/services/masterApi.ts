// import client from './apiClient';
// import {ApiResponse, Design, GstinData, Party} from '../types';

// // Helper: combine address parts from GST response
// const buildAddress = (result: any): string => {
//   const parts = [
//     result.AddrBnm,
//     result.AddrBno,
//     result.AddrFlno,
//     result.AddrSt,
//     result.AddrLoc,
//   ].filter(Boolean);
//   return parts.join(', ');
// };

// export const masterApi = {
//   // Search existing parties from famacc
//   searchParties: async (q: string): Promise<Party[]> => {
//     const res = await client.get<ApiResponse<Party[]>>('/api/parties/search', {
//       params: {q, prpcode: 'SIP', yearno: '27'},
//     });
//     console.log("party api called", q, res);
//     return res.data.data;
//   },

//   // Fetch GSTIN details from external API
//   // fetchGstin: async (gstin: string): Promise<GstinData> => {
//   //   const res = await client.get<ApiResponse<GstinData>>(`/api/gstin/${gstin}`);
//   //   return res.data.data;
//   // },
//   fetchGstin: async (gstin: string): Promise<GstinData> => {
//     const payload = {
//       prptype: "S",
//       prpcode: "SIP",
//       yearno: "27",
//       action: "add",
//       txntype: "account_master",
//       gstin: gstin.trim().toUpperCase(),
//     };

//     try {
//       const response = await client.post('/api/check_single_gstin', payload); // replace with actual endpoint
//       const { success, result } = response.data;
//       console.log('GSTIN fetch response:', response, payload);

//       if (!success) {
//         throw new Error(response.data.message || 'GSTIN fetch failed');
//       }

//       // Map the result to GstinData format expected by AddPartyScreen
//       const gstinData: GstinData = {
//         gstin: result.Gstin || gstin,
//         legal_name: result.LegalName || '',
//         trade_name: result.TradeName || '',
//         address: buildAddress(result),
//         city: result.AddrLoc || '',
//         state: result.State || '', // if backend returns state name; otherwise you can map StateCode
//         pincode: result.AddrPncd ? String(result.AddrPncd) : '',
//         status: result.Status || '',
//       };

//       return gstinData;
//     } catch (error) {
//       console.error('GSTIN fetch error:', error);
//       throw error; // let the caller handle it
//     }
//   },

//   // Save a new party to famacc
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
//     prpcode?: string;
//     yearno?: string;
//   },
//   prpcode: string,
//   yearno: string
// ): Promise<Party> => {
//   const payload = {
//     party: party,
//     prpcode,
//     yearno,
//   };
//     const res = await client.post<ApiResponse<Party>>('/api/parties', payload);
//     console.log("store party api called", payload, res);
//     return res.data.data;
//   },

//   // Search existing designs from dapdesign
//   searchDesigns: async (q: string): Promise<Design[]> => {
//     const res = await client.get<ApiResponse<Design[]>>('/api/designs/search', {
//       params: {q, prpcode: 'SIP', yearno: '27'},
//     });
//     return res.data.data;
//   },

//   storeDesign: async (design: {
//     name: string;
//     short_name?: string;
//   }): Promise<Design> => {
//     const res = await client.post<ApiResponse<Design>>('/api/designs', design);
//     return res.data.data;
//   },
// };

import React, { useEffect, useState, useCallback } from 'react';
import client from './apiClient';
import { ApiResponse, Design, GstinData, Party, UserRights } from '../types';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

export const useMasterApi = () => {
  const [userPrptype, setUserPrptype] = useState<string | null>('');

  useEffect(() => {
    const initializeApp = async () => {
      try {
        const storedPrptype = await AsyncStorage.getItem('user_prptype');
        console.log('user_prptype', storedPrptype);
        setUserPrptype(storedPrptype);
      } catch (error) {
        console.error('Initialization error:', error);
      }
    };
    initializeApp();
  }, []);

  const searchParties = useCallback(
    async (q: string): Promise<Party[]> => {
      const res = await client.get<ApiResponse<Party[]>>('/api/parties/search', {
        params: { q, prpcode: 'SIP', yearno: '27' },
      });
      console.log('party api called', q, res);
      return res.data.data;
    },
    [userPrptype]
  );

  const fetchGstin = useCallback(
    async (gstin: string): Promise<GstinData> => {
      const payload = {
        prptype: userPrptype || "S",
        yearno: "27",
        action: "add",
        txntype: "account_master",
        gstin: gstin.trim().toUpperCase(),
      };

      try {
        const response = await client.post('/api/check_single_gstin', payload);
        const { success, result } = response.data;
        console.log('GSTIN fetch response:', response, payload);

        if (!success) {
          throw new Error(response.data.message || 'GSTIN fetch failed');
        }

        const gstinData: GstinData = {
          gstin: result.Gstin || gstin,
          legal_name: result.LegalName || '',
          trade_name: result.TradeName || '',
          address: buildAddress(result),
          city: result.AddrLoc || '',
          state: result.State || '',
          pincode: result.AddrPncd ? String(result.AddrPncd) : '',
          status: result.Status || '',
        };

        return gstinData;
      } catch (error) {
        console.error('GSTIN fetch error:', error);
        throw error;
      }
    },
    [userPrptype]
  );

  const storeParty = useCallback(
    async (party: {
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
      const payload = {
        party,
        prptype: userPrptype,
        yearno: '27',
      };
      const res = await client.post<ApiResponse<Party>>('/api/parties', payload);
      console.log('store party api called', payload, res);
      return res.data.data;
    },
    [userPrptype]
  );

  const searchDesigns = useCallback(
    async (q: string): Promise<Design[]> => {
      const res = await client.get<ApiResponse<Design[]>>('/api/designs/search', {
        params: { q, prptype: userPrptype, yearno: '27' },
      });
      return res.data.data;
    },
    [userPrptype]
  );

  const storeDesign = useCallback(async (design: {
    name: string;
    short_name?: string;
  }): Promise<Design> => {
    const res = await client.post<ApiResponse<Design>>('/api/designs', design);
    return res.data.data;
  }, []);

  const userRights = useCallback(
    async (q: string, permission: string, txntype: string): Promise<UserRights[]> => {
      const payload = {
        user_id: q,
        permission: permission,
        txntype: txntype
      }
      console.log('I am called from masterAPI', payload);
      const res = await client.get<ApiResponse<UserRights[]>>('/api/checkrights', {
        params: { ...payload },
      });
      console.log('user Rights api called', payload, res);
      return res.data.data;
    },
    []
  );

  return {
    userPrptype,
    searchParties,
    fetchGstin,
    storeParty,
    searchDesigns,
    storeDesign,
    userRights
  };
};