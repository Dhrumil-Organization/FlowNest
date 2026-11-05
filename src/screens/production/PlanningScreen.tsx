import React from 'react';
import PlanningScreenView from '../../components/PlanningNEW/PlanningScreen';
import { ErpSessionGate } from '../../core/session/erpSession';

// Yarn Dyeing > Planning (production planning entry: Dyeing / Coning / Checking).
// Token + API host come from the common ErpSessionGate (sudamo_knits -> apig, rayons -> apiy) and the
// screen remounts fresh when the property / token changes — same as ProcessChemicals / ShadeRecipe.
export function Planning() {
  return <ErpSessionGate>{(s) => <PlanningScreenView token={s.token} API={s.API} username={s.username} />}</ErpSessionGate>;
}
