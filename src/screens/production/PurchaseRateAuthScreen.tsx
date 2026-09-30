import React from 'react';
import PurchaseRateAuthNEW from '../../components/PurchaseRateAuthNEW';
import { ErpSessionGate } from '../../core/session/erpSession';

// Purchase Rate Auth (moved from the legacy ERP). Token + API host come from the common
// ErpSessionGate and the screen remounts fresh when the property / token changes.
export function PurchaseRateAuthScreen() {
  return (
    <ErpSessionGate>
      {(s) => <PurchaseRateAuthNEW token={s.token} API={s.API} username={s.username} />}
    </ErpSessionGate>
  );
}
