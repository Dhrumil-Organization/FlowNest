import React from 'react';
import PayableNew from '../../components/PayableNew';
import { ErpSessionGate } from '../../core/session/erpSession';

// Token + API host come from the common ErpSessionGate:
//   - sudamo_knits -> apig, rayons -> apiy (login selection AND header switch)
//   - screen renders only after the correct token/host are known
//   - screen remounts fresh when property or token changes (no refresh needed)
export function ReceivablesScreen() {
  return <ErpSessionGate>{(s) => <PayableNew token={s.token} username={s.username} />}</ErpSessionGate>;
}
