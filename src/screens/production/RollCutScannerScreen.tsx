import React from 'react';
import RollCutScanner from '../../components/RollCutScanner';
import { ErpSessionGate } from '../../core/session/erpSession';

export function RollCutScannerScreen() {
  return (
    <ErpSessionGate>
      {(s) => <RollCutScanner token={s.token} API={s.API} username={s.username} />}
    </ErpSessionGate>
  );
}
