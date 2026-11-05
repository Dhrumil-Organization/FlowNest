import React from 'react';
import ProcessingScreenView from '../../components/ProcessingNEW/ProcessingScreen';
import { ErpSessionGate } from '../../core/session/erpSession';
export function ProcessingScreen() {
  return <ErpSessionGate>{(s) => <ProcessingScreenView token={s.token} API={s.API} />}</ErpSessionGate>;
}
