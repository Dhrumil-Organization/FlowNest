import React from 'react';
import OutstandingDaysRequestNEW from '../../components/OutstandingDaysRequestNEW';
import { ErpSessionGate } from '../../core/session/erpSession';

// Outstanding Days Request (moved from the legacy ERP — legacy screen stays as-is).
// Token + API host come from the common ErpSessionGate (sudamo_knits -> apig,
// rayons -> apiy) and the screen remounts fresh when the property / token changes.
export function OutstandingDaysRequestScreen() {
  return (
    <ErpSessionGate>
      {(s) => <OutstandingDaysRequestNEW token={s.token} API={s.API} username={s.username} />}
    </ErpSessionGate>
  );
}
