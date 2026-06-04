import client from './apiClient';
import {ApiResponse, CostSheet, AuthQueueResponse} from '../types';

export const costSheetApi = {
  /** Get cost sheet for one design */
  show: async (inquiryId: number, designId: number): Promise<CostSheet | null> => {
    const res = await client.get<ApiResponse<{design_id: number; cost_sheet: CostSheet | null}>>(
      `/inquiries/${inquiryId}/designs/${designId}/cost-sheet`,
    );
    return res.data.data.cost_sheet;
  },

  /** Save as draft */
  saveDraft: async (
    inquiryId: number,
    designId: number,
    payload: Partial<CostSheet>,
  ): Promise<CostSheet> => {
    const res = await client.post<ApiResponse<CostSheet>>(
      `/inquiries/${inquiryId}/designs/${designId}/cost-sheet`,
      payload,
    );
    return res.data.data;
  },

  /** Submit for authorization */
  submitForAuth: async (
    inquiryId: number,
    designId: number,
  ): Promise<CostSheet> => {
    const res = await client.post<ApiResponse<CostSheet>>(
      `/inquiries/${inquiryId}/designs/${designId}/cost-sheet/submit`,
    );
    return res.data.data;
  },

  /** Authorizer: approve */
  approve: async (inquiryId: number, designId: number): Promise<CostSheet> => {
    const res = await client.post<ApiResponse<CostSheet>>(
      `/inquiries/${inquiryId}/designs/${designId}/cost-sheet/approve`,
    );
    return res.data.data;
  },

  /** Authorizer: reject */
  reject: async (
    inquiryId: number,
    designId: number,
    payload: {reason: string; remarks?: string},
  ): Promise<CostSheet> => {
    const res = await client.post<ApiResponse<CostSheet>>(
      `/inquiries/${inquiryId}/designs/${designId}/cost-sheet/reject`,
      payload,
    );
    return res.data.data;
  },

  /** Get authorizer's queue */
  pendingQueue: async (): Promise<AuthQueueResponse> => {
    const res = await client.get<any>('/auth/pending-cost-sheets');
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
      `/inquiries/${inquiryId}/designs/${designId}/cost-sheet/pdf`,
    );
    return res.data.data;
  },

  /** Direct download URL for PDF (use with Linking.openURL) */
  pdfDownloadUrl: (inquiryId: number, designId: number): string => {
    // Returns the full URL the user can open in browser/share
    const base = (client.defaults.baseURL || '').replace(/\/$/, '');
    return `${base}/inquiries/${inquiryId}/designs/${designId}/cost-sheet/pdf/download`;
  },
};
