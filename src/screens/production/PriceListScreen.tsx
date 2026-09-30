import React from 'react';
import PriceListNEW from '../../components/PriceListNEW';
import { ErpSessionGate } from '../../core/session/erpSession';

// Price List (moved from the legacy ERP). Token + API host come from the common
// ErpSessionGate (sudamo_knits -> apig, rayons -> apiy) and the screen
// remounts fresh when the property / token changes.
export function PriceListScreen() {
  return (
    <ErpSessionGate>
      {(s) => <PriceListNEW token={s.token} API={s.API} username={s.username} />}
    </ErpSessionGate>
  );
}
