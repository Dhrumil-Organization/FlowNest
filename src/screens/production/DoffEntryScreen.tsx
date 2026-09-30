import React from 'react';
import DoffEntryNEW from '../../components/DoffEntryNEW';
import { ErpSessionGate } from '../../core/session/erpSession';

// Doff Entry (moved from the legacy ERP). Token + API host come from the common
// ErpSessionGate (sudamo_knits -> apig, rayons -> apiy) and the screen
// remounts fresh when the property / token changes.
export function DoffEntryScreen() {
  return (
    <ErpSessionGate>
      {(s) => <DoffEntryNEW token={s.token} API={s.API} username={s.username} />}
    </ErpSessionGate>
  );
}
