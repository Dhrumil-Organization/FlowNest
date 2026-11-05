import React from 'react';
import { ErpSessionGate } from '../../core/session/erpSession';
import WeftCartonIssueScreen from '../WeftCartonIssueNew/WeftCartonIssueScreen';
// NEW ERP — Beam Gaiting: machine beam status list by year + new beam gaiting entry. Token + API host from ErpSessionGate.
export function WeftCartonIssueNewScreen() {
  return (
    <ErpSessionGate>
      {(s) => <WeftCartonIssueScreen token={s.token} API={s.API} username={s.username} />}
    </ErpSessionGate>
  );
}
