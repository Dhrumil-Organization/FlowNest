import React from 'react';
import FabricStockVerificationNEW from '../../components/FabricStockVerificationNEW';
import { ErpSessionGate } from '../../core/session/erpSession';

// Token + API host come from the common ErpSessionGate (same as Fabric/Yarn Stock):
//   - screen renders only after the correct token/host are known
//   - screen remounts fresh when property or token changes
export function FabricStockVerificationScreen() {
  return (
    <ErpSessionGate>
      {(s) => <FabricStockVerificationNEW token={s.token} API={s.API} username={s.username} />}
    </ErpSessionGate>
  );
}
