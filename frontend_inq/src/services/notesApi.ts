import client from './apiClient';
import {ApiResponse, InquiryNote} from '../types';

export const notesApi = {
  list: async (inquiryId: number): Promise<InquiryNote[]> => {
    const res = await client.get<ApiResponse<InquiryNote[]>>(
      `/inquiries/${inquiryId}/notes`,
    );
    return res.data.data;
  },

  send: async (inquiryId: number, note: string): Promise<InquiryNote> => {
    const res = await client.post<ApiResponse<InquiryNote>>(
      `/inquiries/${inquiryId}/notes`,
      {note},
    );
    return res.data.data;
  },

  update: async (
    inquiryId: number,
    noteId: number,
    note: string,
  ): Promise<InquiryNote> => {
    const res = await client.put<ApiResponse<InquiryNote>>(
      `/inquiries/${inquiryId}/notes/${noteId}`,
      {note},
    );
    return res.data.data;
  },

  delete: async (inquiryId: number, noteId: number): Promise<void> => {
    await client.delete(`/inquiries/${inquiryId}/notes/${noteId}`);
  },
};
