import React from 'react';
import Module from '../beamCloseNew/BeamCloseModule';
import { ErpSessionGate } from '../../core/session/erpSession';
// NEW ERP — Beam Close: close the running beam of a machine / re-open a closed beam. Token + API host from ErpSessionGate.
export function BeamCloseNewScreen() {
  return (
    <ErpSessionGate>
      {(s) => <Module token={s.token} API={s.API} username={s.username} />}
    </ErpSessionGate>
  );
}
