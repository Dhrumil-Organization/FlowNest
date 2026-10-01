import React from 'react';
import PurchaseGradeAuthNEW from '../../components/PurchaseGradeAuthNEW';
import { ErpSessionGate } from '../../core/session/erpSession';

// Purchase Grade Auth (moved from the legacy ERP). Token + API host come from the common
// ErpSessionGate (sudamo_knits -> apig, rayons -> apiy) and the screen
// remounts fresh when the property / token changes.
export function PurchaseGradeAuthScreen() {
  return (
    <ErpSessionGate>
      {(s) => <PurchaseGradeAuthNEW token={s.token} API={s.API} username={s.username} />}
    </ErpSessionGate>
  );
}
