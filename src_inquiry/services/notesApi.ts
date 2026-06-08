import client from './apiClient';
import {ApiResponse, InquiryNote} from '../types';

export const notesApi = {
  list: async (inquiryId: number, prptype: string, yearno: string): Promise<InquiryNote[]> => {
    const res = await client.get<ApiResponse<InquiryNote[]>>(
      `/api/inquiries/${inquiryId}/notes?prptype=${prptype}&yearno=${yearno}`,
    );
    console.log('Notes list', inquiryId, prptype, yearno, res);
    return res.data.data;
  },

  send: async (inquiryId: number, payload: {note: string; prptype: string; yearno: string}): Promise<InquiryNote> => {
    const res = await client.post<ApiResponse<InquiryNote>>(
      `/api/inquiries/${inquiryId}/notes`,
      payload,
    );
    console.log('Notes send', inquiryId, payload, res);
    return res.data.data;
  },


  update: async (
    inquiryId: number,
    noteId: number,
    note: string,
    prptype: string,
    yearno: string
  ): Promise<InquiryNote> => {
    const res = await client.put<ApiResponse<InquiryNote>>(
      `/api/inquiries/${inquiryId}/notes/${noteId}?prptype=${prptype}&yearno=${yearno}`,
      {note},
    );
    return res.data.data;
  },

  delete: async (inquiryId: number, noteId: number, prptype: string, yearno: string): Promise<void> => {
    const res = await client.delete(`/api/inquiries/${inquiryId}/notes/${noteId}?prptype=${prptype}&yearno=${yearno}`);
    console.log('Notes delete', inquiryId, noteId, res);
    return res.data.data;
  },
};
