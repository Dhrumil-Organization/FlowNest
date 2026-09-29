import React from 'react';
import Module from '../weftIssue/WeftIssueModule';
import { ErpSessionGate } from '../../core/session/erpSession';

// NEW ERP — Weft Issue (New + Previous flow): list, header, design items, carton scan.
// Token + API host come from the common ErpSessionGate (sudamo_knits -> apig,
// rayons -> apiy); the screen remounts fresh on a property / token change.
export function WeftIssueScreen() {
  return (
    <ErpSessionGate>
      {(s) => <Module token={s.token} API={s.API} username={s.username} />}
    </ErpSessionGate>
  );
}
