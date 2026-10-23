import React from 'react';
import SalesInvoiceBrowse from '../../components/YarnSalesInvoice';
import { ErpSessionGate } from '../../core/session/erpSession';

// Yarn Sales Order (moved from the legacy ERP — legacy screen stays as-is).
// Token + API host come from the common ErpSessionGate (sudamo_knits -> apig,
// rayons -> apiy) and the screen remounts fresh when the property / token changes.
export function YarnSalesInvoiceScreen() {
  return (
    <ErpSessionGate>
      {(s) => <SalesInvoiceBrowse token={s.token} API={s.API} username={s.username} />}
    </ErpSessionGate>
  );
}
