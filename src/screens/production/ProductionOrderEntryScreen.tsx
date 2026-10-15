import React from 'react';
import ProductionOrderNEW from '../../components/ProductionOrderNEW';
import { ErpSessionGate } from '../../core/session/erpSession';

// Production Orders (entry) — token + API host from the common ErpSessionGate;
// remounts fresh on property / token change.
export function ProductionOrderEntryScreen() {
  return <ErpSessionGate>{(s) => <ProductionOrderNEW token={s.token} API={s.API} username={s.username} isConnected />}</ErpSessionGate>;
}
