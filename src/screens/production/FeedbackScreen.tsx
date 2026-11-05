import React from 'react';
import FeedbackNEW from '../../components/FeedbackNEW';
import { ErpSessionGate } from '../../core/session/erpSession';

// Feedback (moved from the legacy ERP — legacy screen stays as-is).
// Token + API host come from the common ErpSessionGate (sudamo_knits -> apig,
// rayons -> apiy) and the screen remounts fresh when the property / token changes.
export function FeedbackScreen() {
  return (
    <ErpSessionGate>
      {(s) => <FeedbackNEW token={s.token} API={s.API} username={s.username} />}
    </ErpSessionGate>
  );
}
