import React from 'react';
import YarnManagementSystemNEW from '../../components/YarnManagementSystemNEW';
import { ErpSessionGate } from '../../core/session/erpSession';

// Yarn Management System (moved from the legacy ERP — legacy screen stays as-is).
// Token + API host come from the common ErpSessionGate (sudamo_knits -> apig,
// rayons -> apiy) and the screen remounts fresh when the property / token changes.
export function YarnManagementSystemScreen() {
  return (
    <ErpSessionGate>
      {(s) => <YarnManagementSystemNEW token={s.token} API={s.API} username={s.username} />}
    </ErpSessionGate>
  );
}
