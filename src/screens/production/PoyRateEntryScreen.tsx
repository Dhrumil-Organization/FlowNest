import React from 'react';
import PoyRateEntryNEW from '../../components/PoyRateEntryNEW';
import { ErpSessionGate } from '../../core/session/erpSession';

// POY Rate Entry (moved from the legacy ERP). Token + API host come from the common
// ErpSessionGate (sudamo_knits -> apig, rayons -> apiy) and the screen
// remounts fresh when the property / token changes.
export function PoyRateEntryScreen() {
  return (
    <ErpSessionGate>
      {(s) => <PoyRateEntryNEW token={s.token} API={s.API} username={s.username} />}
    </ErpSessionGate>
  );
}
