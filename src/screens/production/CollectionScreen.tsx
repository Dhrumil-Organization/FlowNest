import React from 'react';
import CollectionList from '../../components/CollectionListNEW';
import { ErpSessionGate } from '../../core/session/erpSession';

// Token + API host come from the common ErpSessionGate:
//   - sudamo_knits -> apig, rayons -> apiy (login selection AND header switch)
//   - screen renders only after the correct token/host are known
//   - screen remounts fresh when property or token changes (no refresh needed)
export function CollectionScreen() {
  return <ErpSessionGate>{(s) => <CollectionList token={s.token} username={s.username} API={s.API} />}</ErpSessionGate>;
}
