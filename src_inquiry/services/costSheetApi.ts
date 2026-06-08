import client from './apiClient';
import {ApiResponse, CostSheet, AuthQueueResponse} from '../types';

export const costSheetApi = {
  /** Get cost sheet for one design */
  show: async (inquiryId: number, designId: number, prptype: string, yearno: string): Promise<CostSheet | null> => {
    const res = await client.get<ApiResponse<{design_id: number; cost_sheet: CostSheet | null}>>(
      `/api/inquiries/${inquiryId}/designs/${designId}/cost-sheet?prptype=${prptype}&yearno=${yearno}`,
    );
    console.log('costSheet show', prptype, yearno, res);
    return res.data.data.cost_sheet;
  },

  /** Save as draft */
  saveDraft: async (
    inquiryId: number,
    designId: number,
    prptype: string,
    yearno: string,
    payload: Partial<CostSheet>,
  ): Promise<CostSheet> => {
    const res = await client.post<ApiResponse<CostSheet>>(
      `/api/inquiries/${inquiryId}/designs/${designId}/cost-sheet?prptype=${prptype}&yearno=${yearno}`,
      payload,
    );
    console.log("costSheet saveDraft", prptype, yearno, inquiryId, designId, payload, res);
    if (!res.data?.success) {
      throw {
        response: {
          data: {
            message:
              res.data?.message ||
              'Failed to save',
          },
        },
      };
    }
  
    return res.data.data;
  },

  /** Submit for authorization */
  submitForAuth: async (
    inquiryId: number,
    designId: number,
    prptype: string,
    yearno: string
  ): Promise<CostSheet> => {
    const res = await client.post<ApiResponse<CostSheet>>(
      `/api/inquiries/${inquiryId}/designs/${designId}/cost-sheet/submit?prptype=${prptype}&yearno=${yearno}`,
    );
    console.log("costSheet submitForAuth", prptype, yearno, res);
    return res.data.data;
  },

  /** Authorizer: approve */
  approve: async (inquiryId: number, designId: number, prptype: string, yearno: string): Promise<CostSheet> => {
    const res = await client.post<ApiResponse<CostSheet>>(
      `/api/inquiries/${inquiryId}/designs/${designId}/cost-sheet/approve?prptype=${prptype}&yearno=${yearno}`,
    );
    console.log("costSheet approve", prptype, yearno, res);
    return res.data.data;
  },

  /** Authorizer: reject */
  reject: async (
    inquiryId: number,
    designId: number,
    prptype: string,
    yearno: string,
    payload: {reason: string; remarks?: string},
  ): Promise<CostSheet> => {
    const res = await client.post<ApiResponse<CostSheet>>(
      `/api/inquiries/${inquiryId}/designs/${designId}/cost-sheet/reject?prptype=${prptype}&yearno=${yearno}`,
      payload,
    );
    console.log("costSheet reject", prptype, yearno, res);
    return res.data.data;
  },

  /** Get authorizer's queue */
  pendingQueue: async (prptype: string, yearno: string): Promise<AuthQueueResponse> => {
    const res = await client.get<any>(`/api/auth/pending-cost-sheets?prptype=${prptype}&yearno=${yearno}`);
    console.log('costSheet pendingQueue', prptype, yearno, res);
    return {
      counts: res.data.counts,
      data: res.data.data,
    };
  },

  /** Generate PDF for cost sheet (returns URL) */
  generatePdf: async (
    inquiryId: number,
    designId: number,
  ): Promise<{pdf_url: string; pdf_path: string}> => {
    const res = await client.get<ApiResponse<{pdf_url: string; pdf_path: string}>>(
      `/api/inquiries/${inquiryId}/designs/${designId}/cost-sheet/pdf`,
    );
    console.log('costSheet generatePdf',res);
    return res.data.data;
  },

  /** Direct download URL for PDF (use with Linking.openURL) */
  pdfDownloadUrl: (inquiryId: number, designId: number): string => {
    // Returns the full URL the user can open in browser/share
    const base = (client.defaults.baseURL || '').replace(/\/$/, '');
    console.log('costSheet pdfDownloadUrl', base);
    return `${base}/api/inquiries/${inquiryId}/designs/${designId}/cost-sheet/pdf/download`;
  },
};
