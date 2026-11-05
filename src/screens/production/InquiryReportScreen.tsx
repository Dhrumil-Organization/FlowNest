import React from 'react';
import Module from '../inquiryReport/InquiryReportView';
import { ErpSessionGate } from '../../core/session/erpSession';

// NEW ERP — Inquiry conversion report.
// Token + API host come from the common ErpSessionGate (sudamo_knits -> apig,
// rayons -> apiy); the screen remounts fresh on a property / token change.
export function InquiryReportScreen() {
  return (
    <ErpSessionGate>
      {(s) => <Module token={s.token} API={s.API} username={s.username} />}
    </ErpSessionGate>
  );
}
