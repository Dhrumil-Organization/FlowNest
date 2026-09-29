// FILE: src/components/FabricStockNEW/index.tsx
// NEW ERP — Fabric Stock (replaces the legacy components/FebricStock screen).
// UI + behaviour: the shared StockTreeView (one screen, expandable tree).
//
// Same data + rules as legacy:
//   GET /api/get_criterion       { prptype (dynamic), txntype:'mob_febric_stock', fetch:'prp' }
//   GET /api/appgreyinstockdata  { prpcodes:[...], prptype (dynamic), txntype:'mob_fabric_stock' }
//   Grey stock = dptcode 'PR', Finish stock = every other row, qty = TOTQTY
//   Item grouped by ITMCODE, Design by MDSNNAME, Sub design by SDSNNAME,
//   Shade by SHDNAME (legacy keys).
// Fixes vs legacy: all selected properties are sent (legacy sent only the
// last one), every level is scoped to its parent, dptcode compared trimmed.
import { T } from '@/src/theme';
import React from 'react';
import StockTreeView from '../StockTreeNEW/StockTreeView';
import { num, StockConfig, str } from '../StockTreeNEW/stockTreeModel';

const isGrey = (r: any) => str(r.dptcode).toUpperCase() === 'PR';

export const FABRIC_STOCK_CONFIG: StockConfig = {
  title: 'Fabric Stock',
  dataEndpoint: 'appgreyinstockdata',
  txntype: 'mob_fabric_stock',
  criterionTxntype: 'mob_febric_stock',
  qty: (r) => num(r.TOTQTY),
  levels: [
    { label: 'Item', plural: 'items', key: (r) => str(r.ITMCODE) || str(r.ITMNAME), name: (r) => str(r.ITMNAME) || str(r.ITMCODE), code: (r) => str(r.ITMCODE) },
    { label: 'Design', plural: 'designs', key: (r) => str(r.MDSNNAME), name: (r) => str(r.MDSNNAME), code: (r) => str(r.MDSNCODE) },
    { label: 'Sub design', plural: 'sub designs', key: (r) => str(r.SDSNNAME), name: (r) => str(r.SDSNNAME), code: (r) => str(r.SDSNCODE) },
    { label: 'Shade', plural: 'shades', key: (r) => str(r.SHDNAME), name: (r) => str(r.SHDNAME), code: (r) => str(r.SHDCODE) },
  ],
  kinds: [
    { key: 'grey', label: 'GREY STOCK', short: 'grey stock', color: T.yd, match: isGrey },
    { key: 'finish', label: 'FINISH STOCK', short: 'finish stock', color: T.green, match: (r) => !isGrey(r) },
  ],
  searchPlaceholder: 'Search item, design, sub design, shade…',
};

type Props = { token: string; API: string; username?: string };

export default function FabricStockNEW({ token, API }: Props) {
  return <StockTreeView token={token} API={API} config={FABRIC_STOCK_CONFIG} />;
}
