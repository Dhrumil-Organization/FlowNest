import React from 'react';
import ShadeRecipeScreenView from '../../components/ShadeRecipeNEW/ShadeRecipeScreen';
import { ErpSessionGate } from '../../core/session/erpSession';

// Shade Recipe (Define Recipe with Shade / Color / Shade range).
// Token + API host come from the common ErpSessionGate (sudamo_knits -> apig, rayons -> apiy) and the
// screen remounts fresh when the property / token changes — same as ProcessChemicals / StoreItemMasterNew.
export function ShadeRecipe() {
  return <ErpSessionGate>{(s) => <ShadeRecipeScreenView token={s.token} API={s.API} username={s.username} />}</ErpSessionGate>;
}
