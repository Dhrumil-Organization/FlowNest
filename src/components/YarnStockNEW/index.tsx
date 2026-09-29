// FILE: src/components/YarnStockNEW/index.tsx
// NEW ERP — Yarn Stock (replaces the legacy YarnStock screen).
// UI + behaviour: the shared StockTreeView (one screen, expandable tree,
// same look as Fabric Stock).
//
// Same data + rules as legacy YarnStock.tsx:
//   GET /api/get_criterion        { prptype (dynamic), txntype:'mob_febric_stock', fetch:'prp' }
//   GET /api/appyarninstockdata   { prpcodes:[...], prptype (dynamic), txntype:'mob_yarn_stock' }
//   qty = QTY (parseFloat)
//   Main item grouped by MITMCODE, Item by ITMCODE, Merge by MERCODE,
//   Shade by SHDCODE (legacy keys), names MITMNAME / ITMNAME / MERNAME / SHDNAME.
// Legacy drill: Main item → Item → Merge → Shade (4 modals) — here one tree.
// Fixes vs legacy: loads on open with every property (legacy showed
// "No Property Selected" until the drawer was used), every level scoped to
// its parent.
import React from 'react';
import StockTreeView from '../StockTreeNEW/StockTreeView';
import { num, StockConfig, str } from '../StockTreeNEW/stockTreeModel';

export const YARN_STOCK_CONFIG: StockConfig = {
  title: 'Yarn Stock',
  dataEndpoint: 'appyarninstockdata',
  txntype: 'mob_yarn_stock',
  criterionTxntype: 'mob_febric_stock',
  qty: (r) => num(r.QTY),
  levels: [
    { label: 'Main item', plural: 'main items', key: (r) => str(r.MITMCODE) || str(r.MITMNAME), name: (r) => str(r.MITMNAME) || str(r.MITMCODE), code: (r) => str(r.MITMCODE) },
    { label: 'Item', plural: 'items', key: (r) => str(r.ITMCODE) || str(r.ITMNAME), name: (r) => str(r.ITMNAME) || str(r.ITMCODE), code: (r) => str(r.ITMCODE) },
    { label: 'Merge', plural: 'merges', key: (r) => str(r.MERCODE) || str(r.MERNAME), name: (r) => str(r.MERNAME) || str(r.MERCODE), code: (r) => str(r.MERCODE) },
    { label: 'Shade', plural: 'shades', key: (r) => str(r.SHDCODE) || str(r.SHDNAME), name: (r) => str(r.SHDNAME) || str(r.SHDCODE), code: (r) => str(r.SHDCODE) },
  ],
  searchPlaceholder: 'Search main item, item, merge, shade…',
};

type Props = { token: string; API: string; username?: string };

export default function YarnStockNEW({ token, API }: Props) {
  return <StockTreeView token={token} API={API} config={YARN_STOCK_CONFIG} />;
}
