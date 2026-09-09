// ─────────────────────────────────────────────────────────────────────────
// NEW: Chart Priority — mobile "Priority" tab. Lets a user drag/reorder the
// sales-order allocation charts for the logged-in property + financial
// year, then save that order back. Two endpoints, same `client` instance
// (axios, token/headers already attached by the interceptor above) used by
// every other domain block in this file.
// ─────────────────────────────────────────────────────────────────────────
export const PriorityAPI = {
  // POST /prioritybrowse — body: { prptype, yearno } (prptype here carries
  // the property's prp_code, e.g. 'SIP' — same quirky-but-existing naming
  // used by the legacy web screen's contract, kept as-is intentionally).
  browse: (body: { prptype: string; yearno: string }) =>
    client.post('/prioritybrowseparty', body),

  // POST /save_priority — body: array of per-order payloads, each with the
  // shade-level items carrying the new ClientPriority rank.
  save: (payloads: Record<string, any>[]) =>
    client.post('/save_priority', payloads),
};
