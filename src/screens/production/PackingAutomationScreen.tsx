import React from 'react';
import PackingAutomationNEW from '../../components/PackingAutomationNEW';
import { ErpSessionGate } from '../../core/session/erpSession';

// Packing Automation — token + API host from the common ErpSessionGate;
// remounts fresh on property / token change.
// userId: sent on every label as `userid` (web: getUserid()). Falls back to the username.
export function PackingAutomationScreen() {
  return (
    <ErpSessionGate>
      {(s) => <PackingAutomationNEW token={s.token} API={s.API} username={s.username} userId={(s as any).userid ?? (s as any).userId} />}
    </ErpSessionGate>
  );
}
