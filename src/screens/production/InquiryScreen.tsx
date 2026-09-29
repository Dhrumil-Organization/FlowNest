import React from 'react';
import InquiryModule from '../inquiry/InquiryModule';
import { ErpSessionGate } from '../../core/session/erpSession';

// NEW ERP — Inquiry (replaces the legacy src_inquiry screens + their 17 routes).
// Token + API host come from the common ErpSessionGate:
//   - sudamo_knits -> apig, rayons -> apiy (login selection AND header switch)
//   - screen renders only after the correct token/host are known
//   - screen remounts fresh when property or token changes (no refresh needed)
// The whole inquiry flow (dashboard, form, detail, costing, quotation,
// confirm / reject, notes, authorization, TAT config) lives inside this ONE
// screen — see src/screens/inquiry/InquiryModule.tsx.
export function InquiryScreen() {
  return (
    <ErpSessionGate>
      {(s) => <InquiryModule token={s.token} API={s.API} username={s.username} />}
    </ErpSessionGate>
  );
}
