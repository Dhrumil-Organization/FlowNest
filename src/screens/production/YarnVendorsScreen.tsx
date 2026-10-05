import React from 'react';
import YarnVendorsNEW from '../../components/YarnVendorsNEW';
import { ErpSessionGate } from '../../core/session/erpSession';

// Yarn Vendors — AI chat with Claude through the ERP backend
// (POST /api/yarn-vendors-chat with the Bearer token). Token + API host come
// from the common ErpSessionGate (sudamo_knits -> apig, rayons -> apiy) and the
// chat starts fresh when the user logs in again or switches property.
export function YarnVendorsScreen() {
  return (
    <ErpSessionGate>
      {(s) => <YarnVendorsNEW token={s.token} API={s.API} username={s.username} />}
    </ErpSessionGate>
  );
}
