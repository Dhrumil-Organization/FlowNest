import React from 'react';
import PartyDashboardNEW from '../../components/PartyDashboardNEW';
import { ErpSessionGate } from '../../core/session/erpSession';

// Party Dashboard (moved from the legacy ERP — legacy screen stays as-is).
// Token + API host come from the common ErpSessionGate (sudamo_knits -> apig,
// rayons -> apiy) and the screen remounts fresh when the property / token changes.
export function PartyDashboardScreen() {
  return (
    <ErpSessionGate>
      {(s) => <PartyDashboardNEW token={s.token} API={s.API} username={s.username} />}
    </ErpSessionGate>
  );
}
