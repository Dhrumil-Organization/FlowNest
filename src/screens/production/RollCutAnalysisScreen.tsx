import React from 'react';
import RollCutAnalysis from '../../components/RollCutAnalysis';
import { ErpSessionGate } from '../../core/session/erpSession';

export function RollCutAnalysisScreen() {
  return (
    <ErpSessionGate>
      {(s) => <RollCutAnalysis token={s.token} API={s.API} />}
    </ErpSessionGate>
  );
}
