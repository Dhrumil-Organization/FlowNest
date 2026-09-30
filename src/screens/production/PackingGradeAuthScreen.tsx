import React from 'react';
import PackingGradeAuthNEW from '../../components/PackingGradeAuthNEW';
import { ErpSessionGate } from '../../core/session/erpSession';

// Packing Grade Auth (moved from the legacy ERP). Token + API host come from the common
// ErpSessionGate (sudamo_knits -> apig, rayons -> apiy) and the screen
// remounts fresh when the property / token changes.
export function PackingGradeAuthScreen() {
  return (
    <ErpSessionGate>
      {(s) => <PackingGradeAuthNEW token={s.token} API={s.API} username={s.username} />}
    </ErpSessionGate>
  );
}
