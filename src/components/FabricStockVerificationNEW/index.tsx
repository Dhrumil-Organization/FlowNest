// FILE: src/components/FabricStockVerificationNEW/index.tsx
// NEW ERP — Fabric Stock Verification (replaces legacy components/FabricStockVerification).
// UI + behaviour: shared StockVerificationView. APIs (same as legacy):
//   POST /api/get_verify_manual_fabric_stock     (load takas)
//   POST /api/update_verify_manual_fabric_stock  (mark taka verified)
//   POST /api/insert_verify_manual_fabric_stock  (physical stock not in system)
//   POST PRINTSTICKER                            (print label)
// txntype 'fabricStockVerification'; prptype dynamic; QR scan to verify.
import React from 'react';
import StockVerificationView from '../StockVerificationNEW/StockVerificationView';
import { VerifyConfig } from '../StockVerificationNEW/verificationModel';

export const FABRIC_VERIFY_CONFIG: VerifyConfig = {
  kind: 'fabric',
  title: 'Fabric Stock Verification',
  txntype: 'fabricStockVerification',
  endpoints: { load: 'get_verify_manual_fabric_stock', update: 'update_verify_manual_fabric_stock', insert: 'insert_verify_manual_fabric_stock' },
  verifiedMsg: 'Taka verified successfully.',
  unit: 'Taka',
  unitNo: 'Taka / Roll No.',
  wtLabel: 'System meter',
  wtUnit: 'm',
  manualTitle: 'Physical stock not in system',
  searchPlaceholder: 'Search taka, item, design, grade, shade…',
};

type Props = { token: string; API: string; username?: string };

export default function FabricStockVerificationNEW({ token, API }: Props) {
  return <StockVerificationView token={token} API={API} config={FABRIC_VERIFY_CONFIG} />;
}
