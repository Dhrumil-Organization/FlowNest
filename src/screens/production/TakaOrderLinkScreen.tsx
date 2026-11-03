import React from 'react';
import Module from '../../components/takaOrderLink/TakaOrderLinkModule';
import { ErpSessionGate } from '../../core/session/erpSession';

// NEW ERP — Taka ↔ Production Order Link: takas in stock for a design / As On date, link or unlink their production order.
export function TakaOrderLinkScreen() {
  return (
    <ErpSessionGate>
      {(s) => <Module token={s.token} API={s.API} username={s.username} />}
    </ErpSessionGate>
  );
}
