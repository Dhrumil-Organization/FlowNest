import React from 'react';
import YarnStockVerificationNEW from '../../components/YarnStockVerificationNEW';
import { ErpSessionGate } from '../../core/session/erpSession';

// Token + API host come from the common ErpSessionGate (same as Fabric/Yarn Stock):
//   - screen renders only after the correct token/host are known
//   - screen remounts fresh when property or token changes
export function YarnStockVerificationScreen() {
  return (
    <ErpSessionGate>
      {(s) => <YarnStockVerificationNEW token={s.token} API={s.API} username={s.username} />}
    </ErpSessionGate>
  );
}
