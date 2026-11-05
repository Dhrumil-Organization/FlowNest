import React from 'react';
import SnapView from '../../components/SnapViewNEW';
import { ErpSessionGate } from '../../core/session/erpSession';

// Token + API host come from the common ErpSessionGate:
//   - sudamo_knits -> apig, rayons -> apiy (login selection AND header switch)
//   - screen renders only after the correct token/host are known
//   - screen remounts fresh when property or token changes (no refresh needed)
export function SnapviewScreen() {
  return <ErpSessionGate>{(s) => <SnapView token={s.token} deviceId={s.deviceId} username={s.username} />}</ErpSessionGate>;
}
