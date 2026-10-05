import React from 'react';
import WarehouseNEW from '../../components/WarehouseNEW';
import { ErpSessionGate } from '../../core/session/erpSession';

// Warehouse (moved from the legacy ERP — legacy screen stays as-is).
// Token + API host come from the common ErpSessionGate (sudamo_knits -> apig,
// rayons -> apiy) and the screen remounts fresh when the property / token changes.
export function WarehouseScreen() {
  return (
    <ErpSessionGate>
      {(s) => <WarehouseNEW token={s.token} API={s.API} username={s.username} />}
    </ErpSessionGate>
  );
}
