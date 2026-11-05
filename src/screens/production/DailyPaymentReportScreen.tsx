import React from 'react';
import DailyPaymentReport from '../../components/DailyPaymentReportNEW';
import { ErpSessionGate } from '../../core/session/erpSession';

// Token + API host come from the common ErpSessionGate:
//   - sudamo_knits -> apig, rayons -> apiy (login selection AND header switch)
//   - screen renders only after the correct token/host are known
//   - screen remounts fresh when property or token changes (no refresh needed)
export function DailyPaymentReportScreen() {
  return <ErpSessionGate>{(s) => <DailyPaymentReport token={s.token} isConnected={true} username={s.username} />}</ErpSessionGate>;
}
