import React from 'react';
import SalesChallanPackingSlipNEW from '../../components/SalesChallanPackingSlipNEW';
import { ErpSessionGate } from '../../core/session/erpSession';

// Sales Challan Packing Slip — token + API host from the common ErpSessionGate;
// remounts fresh on property / token change.
// Opens on a new slip (add right) or the "open a slip" start (no add right).
export function SalesChallanPackingSlipScreen() {
  return (
    <ErpSessionGate>
      {(s) => <SalesChallanPackingSlipNEW token={s.token} API={s.API} />}
    </ErpSessionGate>
  );
}
