import client from './apiClient';
import {ApiResponse, InquiryShade, ShadeStock} from '../types';

export const shadesApi = {
  /** List shades for a design */
  list: async (designId: number): Promise<InquiryShade[]> => {
    const res = await client.get<ApiResponse<InquiryShade[]>>(
      `/api/designs/${designId}/shades`,
    );
    console.log('shades list', designId, res);
    return res.data.data;
  },

  listShades: async (apiPrpType: string, yearno: string, storecode: string, txntype: string): Promise<InquiryShade[]> => {
    const res = await client.get<ApiResponse<InquiryShade[]>>(
      `/api/shadedrop?prpcode=${apiPrpType}&yearno=${yearno}&strcode=${storecode}&shdcode=&shdname=&txntype=${txntype}`,
    );
    console.log('shades listShades', apiPrpType, yearno, storecode, txntype, res);
    return res.data;
  },

  /** Save shades (bulk replace) */
  save: async (
    designId: number,
    prptype: string,
    yearno: string,
    shades: Array<{
      shade_name: string;
      shade_code?: string;
      quantity: number;
      rate?: number;
    }>,
  ): Promise<InquiryShade[]> => {
    const res = await client.post<ApiResponse<InquiryShade[]>>(
      `api/designs/${designId}/shades?prptype=${prptype}&yearno=${yearno}`,
      {shades},
    );
    console.log('shades save', designId, prptype, yearno, shades, res);
    return res.data.data;
  },

  /** Get stock for a shade name */
  stock: async (name: string, prptype: string, yearno: string): Promise<ShadeStock> => {
    const res = await client.get<ApiResponse<ShadeStock>>(`/api/shades/stock?prptype=${prptype}&yearno=${yearno}`, {
      params: {name},
    });
    console.log('shades stock', name, prptype, yearno, res);
    return res.data.data;
  },
  stockList: async (prptype: string, yearno: string): Promise<ShadeStock> => {
    const res = await client.get<ApiResponse<ShadeStock>>(`/api/appgreyinstockdata`, {
      params: {
        prpcodes: [], 
        prptype: prptype, 
        yearno: yearno,
        txntype: 'mob_fabric_stock'
      },
    });
    console.log('shades stock list', prptype, yearno, res);
    return res.data;
  },
};
