import React from 'react';
import VisitorsReportNEW from '../../components/VisitorsReportNEW';
import { ErpSessionGate } from '../../core/session/erpSession';

// NEW ERP — Visitors Report (summary, register and visitor history of the
// gate entries made on the Visits screen; Excel / print export).
// Token + API host come from the common ErpSessionGate:
//   - sudamo_knits -> apig, rayons -> apiy (login selection AND header switch)
//   - screen renders only after the correct token/host are known
//   - screen remounts fresh when property or token changes (no refresh needed)
export function VisitorsReportScreen() {
  return (
    <ErpSessionGate>
      {(s) => <VisitorsReportNEW token={s.token} API={s.API} username={s.username} />}
    </ErpSessionGate>
  );
}
