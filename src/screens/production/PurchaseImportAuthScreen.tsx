import React from 'react';
import PurchaseImportAuthNEW from '../../components/PurchaseImportAuthNEW';
import { ErpSessionGate } from '../../core/session/erpSession';

// Purchase Import Auth (moved from the legacy ERP). Token + API host come from the common
// ErpSessionGate and the screen remounts fresh when the property / token changes.
export function PurchaseImportAuthScreen() {
  return (
    <ErpSessionGate>
      {(s) => <PurchaseImportAuthNEW token={s.token} API={s.API} username={s.username} />}
    </ErpSessionGate>
  );
}
