import React from 'react';
import SalesOrderInactiveNEW from '../../components/SalesOrderInactiveNEW';
import { ErpSessionGate } from '../../core/session/erpSession';

// Sales Order (Inactive) (moved from the legacy ERP). Token + API host come from the common
// ErpSessionGate and the screen remounts fresh when the property / token changes.
// Legacy route passed isConnected={true}.
export function SalesOrderInactiveScreen() {
  return (
    <ErpSessionGate>
      {(s) => <SalesOrderInactiveNEW token={s.token} API={s.API} username={s.username} isConnected />}
    </ErpSessionGate>
  );
}
