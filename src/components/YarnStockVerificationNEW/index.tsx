// FILE: src/components/YarnStockVerificationNEW/index.tsx
// NEW ERP — Yarn Stock Verification (replaces legacy components/YarnStockVerification).
// UI + behaviour: shared StockVerificationView. APIs (same as legacy):
//   POST /api/get_verify_manual_stock      (load cartons)
//   POST /api/update_verify_manual_stock   (verify a carton)
//   POST /api/insert_verify_manual_stock   (add carton)
//   POST PRINTSTICKER                      (print label)
// txntype 'yarnStockVerification'; prptype dynamic.
import React from 'react';
import StockVerificationView from '../StockVerificationNEW/StockVerificationView';
import { VerifyConfig } from '../StockVerificationNEW/verificationModel';

export const YARN_VERIFY_CONFIG: VerifyConfig = {
  kind: 'yarn',
  title: 'Yarn Stock Verification',
  txntype: 'yarnStockVerification',
  endpoints: { load: 'get_verify_manual_stock', update: 'update_verify_manual_stock', insert: 'insert_verify_manual_stock' },
  verifiedMsg: 'Data Updated successfully.',
  unit: 'Carton',
  unitNo: 'Carton no.',
  wtLabel: 'Wt',
  wtUnit: 'kg',
  manualTitle: 'Add carton',
  searchPlaceholder: 'Search carton, item, merge, grade, shade…',
};

type Props = { token: string; API: string; username?: string };

export default function YarnStockVerificationNEW({ token, API }: Props) {
  return <StockVerificationView token={token} API={API} config={YARN_VERIFY_CONFIG} />;
}
