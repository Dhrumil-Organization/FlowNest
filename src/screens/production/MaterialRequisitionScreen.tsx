import React from 'react';
import MaterialRequisitionView from '../../components/MaterialRequisitionNEW/MaterialRequisitionScreen';
import { ErpSessionGate } from '../../core/session/erpSession';
export function MaterialRequisitionScreen() {
  return <ErpSessionGate>{s => <MaterialRequisitionView token={s.token} API={s.API} />}</ErpSessionGate>;
}
