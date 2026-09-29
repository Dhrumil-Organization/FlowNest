import React from 'react';
import Module from '../creelIssueReturn/CreelIssueReturnModule';
import { ErpSessionGate } from '../../core/session/erpSession';
// NEW ERP — Creel Issue Return: list, new entry, modify, sticker print. Token + API host from ErpSessionGate.
export function CreelIssueReturnScreen() {
  return (
    <ErpSessionGate>
      {(s) => <Module token={s.token} API={s.API} username={s.username} />}
    </ErpSessionGate>
  );
}
