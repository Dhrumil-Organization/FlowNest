import React from 'react';
import ProcessChemicalsScreenView from '../../components/ProcessChemicalsNEW/ProcessChemicalsScreen';
import { ErpSessionGate } from '../../core/session/erpSession';

// Process Chemicals (Define Recipe).
// Token + API host come from the common ErpSessionGate (sudamo_knits -> apig, rayons -> apiy) and the
// screen remounts fresh when the property / token changes — same as StoreItemMasterNew.
export function ProcessChemicals() {
  return <ErpSessionGate>{(s) => <ProcessChemicalsScreenView token={s.token} API={s.API} username={s.username} />}</ErpSessionGate>;
}
