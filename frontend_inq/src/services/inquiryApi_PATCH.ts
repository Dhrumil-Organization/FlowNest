// ============================================================
// ADD THESE METHODS TO YOUR EXISTING src/services/inquiryApi.ts
// ============================================================
// Add inside the `inquiryApi = { ... }` object.

  // Update an inquiry (only allowed when status = pending_costing)
  update: async (id: number, payload: StorePayload): Promise<Inquiry> => {
    const res = await client.put<ApiResponse<Inquiry>>(
      `/inquiries/${id}`,
      payload,
    );
    return res.data.data;
  },

  // Delete an inquiry (only allowed when status = pending_costing)
  delete: async (id: number): Promise<void> => {
    await client.delete(`/inquiries/${id}`);
  },
