import React from 'react';
import SalesOrderTrackingPartyDetailsPart1 from '../../components/SalesOrderTrackingNEW/SOPartyDetailsPart1/SOPartyDetailsPart1';
import { ErpSessionGate } from '../../core/session/erpSession';

// Token + API host come from the common ErpSessionGate:
//   - sudamo_knits -> apig, rayons -> apiy (login selection AND header switch)
//   - screen renders only after the correct token/host are known
//   - screen remounts fresh when property or token changes (no refresh needed)
export function SOPartyDetailsPart1Screen() {
  return <ErpSessionGate>{(s) => <SalesOrderTrackingPartyDetailsPart1 username={s.username} />}</ErpSessionGate>;
}
