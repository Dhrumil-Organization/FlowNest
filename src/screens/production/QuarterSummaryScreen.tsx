import React from 'react';
import QuarterSummaryNEW from '../../components/QuarterSummaryNEW';
import { ErpSessionGate } from '../../core/session/erpSession';

// Quarter Summary (moved from the legacy ERP — legacy screen stays as-is).
// Token + API host come from the common ErpSessionGate (sudamo_knits -> apig,
// rayons -> apiy) and the screen remounts fresh when the property / token changes.
export function QuarterSummaryScreen() {
  return (
    <ErpSessionGate>
      {(s) => <QuarterSummaryNEW token={s.token} API={s.API} username={s.username} />}
    </ErpSessionGate>
  );
}
