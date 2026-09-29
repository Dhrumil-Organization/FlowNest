import React from 'react';
import Module from '../beamGaitingNew/BeamGaitingModule';
import { ErpSessionGate } from '../../core/session/erpSession';
// NEW ERP — Beam Gaiting: machine beam status list by year + new beam gaiting entry. Token + API host from ErpSessionGate.
export function BeamGaitingNewScreen() {
  return (
    <ErpSessionGate>
      {(s) => <Module token={s.token} API={s.API} username={s.username} />}
    </ErpSessionGate>
  );
}
