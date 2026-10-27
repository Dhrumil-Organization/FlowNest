import React from 'react';
import SalesChallanPackingSlipNEW from '../../components/SalesChallanPackingSlipNEW';
import { ErpSessionGate } from '../../core/session/erpSession';

// Sales Challan Packing Slip — token + API host from the common ErpSessionGate;
// remounts fresh on property / token change.
// Opens on the packing slip list (web SalesChallanPackingSlipBrowse); + New / View / Modify / Scan / Delete follow the rights.
export function SalesChallanPackingSlipScreen() {
  return (
    <ErpSessionGate>
      {(s) => <SalesChallanPackingSlipNEW token={s.token} API={s.API} />}
    </ErpSessionGate>
  );
}
