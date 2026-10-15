import React from 'react';
import { YarnHubView } from '../yarnHub/YarnHubView';

// Yarn Hub — the ERP Designing "Yarn hub" on live ERP data (read-only):
// categories (Linen · Cotton · Polyester · Blends · Other fibres) -> yarns -> yarn detail
// (in stock, used via creel + weft issue, designs in warp + weft, party-wise price trend).
// Backend: YarnHubController (POST /api/yarn_hub/summary, /api/yarn_hub/item); property group + year
// come from the login business context, token / host from the shared legacy client.
export function YarnHubScreen() {
  return <YarnHubView />;
}
