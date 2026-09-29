import React from 'react';
import Module from '../weftReturn/WeftReturnModule';
import { ErpSessionGate } from '../../core/session/erpSession';

// NEW ERP — Weft Issue Return: list, new entry, modify, sticker print.
// Token + API host come from the common ErpSessionGate (sudamo_knits -> apig,
// rayons -> apiy); the screen remounts fresh on a property / token change.
export function WeftIssueReturnScreen() {
  return (
    <ErpSessionGate>
      {(s) => <Module token={s.token} API={s.API} username={s.username} />}
    </ErpSessionGate>
  );
}
