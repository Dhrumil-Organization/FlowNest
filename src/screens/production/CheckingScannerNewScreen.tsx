import React from 'react';
// TEMPORARY (testing): NEW Checking Scanner module is commented out so the OLD
// legacy Checking Scanner can be tested from the same New ERP menu / permission.
// To go back to the new screen: uncomment the NEW lines and remove the OLD lines.
// import Module from '../checkingScannerNew/CheckingScannerModule';            // NEW
import CheckingScanner from '@/components/CheckingScanner'; // OLD (legacy)
import { ErpSessionGate } from '../../core/session/erpSession';
// NEW ERP — Checking Scanner: QR / manual taka checking entry, scanner list, faults, sticker print. Token + API host from ErpSessionGate.
export function CheckingScannerNewScreen() {
  // NEW: {(s) => <Module token={s.token} API={s.API} username={s.username} />}
  return (
    <ErpSessionGate>
      {(s) => <CheckingScanner token={s.token} username={s.username} />}
    </ErpSessionGate>
  );
}
