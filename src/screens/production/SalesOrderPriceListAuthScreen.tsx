import React from 'react';
import SalesOrderPriceListAuthNEW from '../../components/SalesOrderPriceListAuthNEW';
import { ErpSessionGate } from '../../core/session/erpSession';

// Sales Order Price List Auth (moved from the legacy ERP). Token + API host come from the
// common ErpSessionGate and the screen remounts fresh when the property / token changes.
export function SalesOrderPriceListAuthScreen() {
  return (
    <ErpSessionGate>
      {(s) => <SalesOrderPriceListAuthNEW token={s.token} API={s.API} username={s.username} />}
    </ErpSessionGate>
  );
}
