import React from 'react';
import ProductionReportNEW from '../../components/ProductionReportNEW';
import { ErpSessionGate } from '../../core/session/erpSession';

// Production Report (moved from the legacy ERP — legacy screen stays as-is).
// Token + API host come from the common ErpSessionGate (sudamo_knits -> apig,
// rayons -> apiy) and the screen remounts fresh when the property / token changes.
export function ProductionReportLegacyScreen() {
  return (
    <ErpSessionGate>
      {(s) => <ProductionReportNEW token={s.token} API={s.API} username={s.username} />}
    </ErpSessionGate>
  );
}
