import React from 'react';
import NewAccountRequestNEW from '../../components/NewAccountRequestNEW';
import { ErpSessionGate } from '../../core/session/erpSession';

// New Account Request (moved from the legacy ERP — legacy screen stays as-is).
// Token + API host come from the common ErpSessionGate (sudamo_knits -> apig,
// rayons -> apiy) and the screen remounts fresh when the property / token changes.
export function NewAccountRequestScreen() {
  return (
    <ErpSessionGate>
      {(s) => <NewAccountRequestNEW token={s.token} API={s.API} username={s.username} />}
    </ErpSessionGate>
  );
}
