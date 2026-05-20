import client from './apiClient';
import {
  ApiResponse,
  DashboardCounts,
  Inquiry,
  InquiryDesignInput,
  InquiryDetailResponse,
  InquiryStatus,
  PaginatedResponse,
  TatCounts,
  TatStatus,
} from '../types';

export interface ListParams {
  status?: InquiryStatus | 'all';
  tat?: TatStatus | 'all';
  search?: string;
  from?: string;
  to?: string;
  page?: number;
}

export interface StorePayload {
  party_prp_code: string | null;
  party_acc_code: string;
  party_name_snapshot: string;
  party_gstin?: string;
  party_address?: string;
  designs: InquiryDesignInput[];
  remarks?: string;
  custom_overall_hours?: number | null;
}

export interface CostingPayload {
  costings: Array<{
    inquiry_design_id: number;
    cost_per_mtr: number;
    gst_percent?: number;
  }>;
}

export const inquiryApi = {
  list: async (params: ListParams = {}) => {
    const res = await client.get<PaginatedResponse<Inquiry>>('/inquiries', {
      params,
    });
    return {
      data: res.data.data,
      counts: res.data.counts as DashboardCounts,
      tatCounts: res.data.tat_counts as TatCounts,
      meta: res.data.meta,
    };
  },

  show: async (id: number): Promise<InquiryDetailResponse> => {
    const res = await client.get<ApiResponse<InquiryDetailResponse>>(`/inquiries/${id}`);
    // The server attaches tat_live via additional() — axios serialises it into the data envelope.
    // We merge both shapes safely:
    const payload = res.data.data as InquiryDetailResponse;
    const tat_live = (res.data as any).tat_live ?? (payload as any).tat_live;
    return {...payload, tat_live};
  },

  store: async (payload: StorePayload): Promise<Inquiry> => {
    const res = await client.post<ApiResponse<Inquiry>>('/inquiries', payload);
    return res.data.data;
  },

  submitCosting: async (id: number, payload: CostingPayload): Promise<Inquiry> => {
    const res = await client.post<ApiResponse<Inquiry>>(
      `/inquiries/${id}/costing`,
      payload,
    );
    return res.data.data;
  },

  confirm: async (
    id: number,
    payload: {
      payment_terms?: string;
      delivery_terms?: string;
      remarks?: string;
    },
  ) => {
    const res = await client.post<ApiResponse<any>>(
      `/inquiries/${id}/confirm`,
      payload,
    );
    return res.data.data;
  },

  reject: async (id: number, payload: {reason: string; remarks?: string}) => {
    const res = await client.post<ApiResponse<Inquiry>>(
      `/inquiries/${id}/reject`,
      payload,
    );
    return res.data.data;
  },

  downloadPdf: async (id: number): Promise<{pdf_url: string; pdf_path: string}> => {
    const res = await client.get<ApiResponse<{pdf_url: string; pdf_path: string}>>(
      `/inquiries/${id}/pdf`,
    );
    return res.data.data;
  },

  sendEmail: async (
    id: number,
    payload: {email: string; subject?: string; message?: string},
  ) => {
    const res = await client.post(`/inquiries/${id}/email`, payload);
    return res.data;
  },

  sendWhatsapp: async (id: number, payload: {mobile: string; message?: string}) => {
    const res = await client.post(`/inquiries/${id}/whatsapp`, payload);
    return res.data;
  },
};
