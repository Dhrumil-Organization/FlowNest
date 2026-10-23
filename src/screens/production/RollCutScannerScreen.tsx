import React from 'react';
import { ErpSessionGate } from '../../core/session/erpSession';
import Module from '../checkingScannerNew/CheckingScannerModule';
// import RollCutScanner from '../index/RollCutScanner'; 
// NEW ERP — Checking Scanner: QR / manual taka checking entry, scanner list, faults, sticker print. Token + API host from ErpSessionGate.
export function CheckingScannerNewScreen() {
  return (
    <ErpSessionGate>
      {(s) => <Module token={s.token} API={s.API} username={s.username} />}
    </ErpSessionGate>
  );
}
