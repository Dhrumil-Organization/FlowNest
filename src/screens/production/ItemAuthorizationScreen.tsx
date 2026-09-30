import React from 'react';
import ItemAuthorizationNEW from '../../components/ItemAuthorizationNEW';
import { ErpSessionGate } from '../../core/session/erpSession';

// Item Authorization (moved from the legacy ERP). Token + API host come from the common
// ErpSessionGate (sudamo_knits -> apig, rayons -> apiy) and the screen
// remounts fresh when the property / token changes.
export function ItemAuthorizationScreen() {
  return (
    <ErpSessionGate>
      {(s) => <ItemAuthorizationNEW token={s.token} API={s.API} username={s.username} />}
    </ErpSessionGate>
  );
}
