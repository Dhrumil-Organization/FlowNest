import React from 'react';
import ProcessCompleteAuthNEW from '../../components/ProcessCompleteAuthNEW';
import { ErpSessionGate } from '../../core/session/erpSession';

// Process Complete Auth (moved from the legacy ERP). Token + API host come from the common
// ErpSessionGate (sudamo_knits -> apig, rayons -> apiy) and the screen
// remounts fresh when the property / token changes.
export function ProcessCompleteAuthScreen() {
  return (
    <ErpSessionGate>
      {(s) => <ProcessCompleteAuthNEW token={s.token} API={s.API} username={s.username} />}
    </ErpSessionGate>
  );
}
