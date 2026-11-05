import React from 'react';
import DesignAuthorizationNEW from '../../components/DesignAuthorizationNEW';
import { ErpSessionGate } from '../../core/session/erpSession';

// Design Authorization (moved from the legacy ERP — legacy screen stays as-is).
// Token + API host come from the common ErpSessionGate (sudamo_knits -> apig,
// rayons -> apiy) and the screen remounts fresh when the property / token changes.
export function DesignAuthorizationScreen() {
  return (
    <ErpSessionGate>
      {(s) => <DesignAuthorizationNEW token={s.token} API={s.API} username={s.username} />}
    </ErpSessionGate>
  );
}
