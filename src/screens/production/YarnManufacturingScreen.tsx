import React from 'react';
import YarnManufacturingNEW from '../../components/YarnManufacturingNEW';
import { ErpSessionGate } from '../../core/session/erpSession';

// Yarn Manufacturing (moved from the legacy ERP — legacy screen stays as-is).
// Token + API host come from the common ErpSessionGate (sudamo_knits -> apig,
// rayons -> apiy) and the screen remounts fresh when the property / token changes.
export function YarnManufacturingScreen() {
  return (
    <ErpSessionGate>
      {(s) => <YarnManufacturingNEW token={s.token} API={s.API} username={s.username} />}
    </ErpSessionGate>
  );
}
