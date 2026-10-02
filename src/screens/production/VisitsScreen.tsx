import React from 'react';
import VisitorsNEW from '../../components/VisitorsNEW';
import { ErpSessionGate } from '../../core/session/erpSession';

// NEW ERP — Visits (gate register used by the watchman, English / Hindi).
// Token + API host come from the common ErpSessionGate:
//   - sudamo_knits -> apig, rayons -> apiy (login selection AND header switch)
//   - screen renders only after the correct token/host are known
//   - screen remounts fresh when property or token changes (no refresh needed)
// `username` is stored on every entry (entry by / OUT marked by).
export function VisitsScreen() {
  return (
    <ErpSessionGate>
      {(s) => <VisitorsNEW token={s.token} API={s.API} username={s.username} />}
    </ErpSessionGate>
  );
}
