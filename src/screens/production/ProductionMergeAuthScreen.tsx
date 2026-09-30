import React from 'react';
import ProductionMergeAuthNEW from '../../components/ProductionMergeAuthNEW';
import { ErpSessionGate } from '../../core/session/erpSession';

// Production Merge Auth (moved from the legacy ERP). Token + API host come from the common
// ErpSessionGate (sudamo_knits -> apig, rayons -> apiy) and the screen
// remounts fresh when the property / token changes.
export function ProductionMergeAuthScreen() {
  return (
    <ErpSessionGate>
      {(s) => <ProductionMergeAuthNEW token={s.token} API={s.API} username={s.username} />}
    </ErpSessionGate>
  );
}
