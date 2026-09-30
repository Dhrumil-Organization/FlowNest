import React from 'react';
import MonthlyExpenseReportNEW from '../../components/MonthlyExpenseReportNEW';
import { ErpSessionGate } from '../../core/session/erpSession';

// Monthly Expense Report (moved from the legacy ERP). The report page needs the
// device id (AsyncStorage cache_deviceId) — ErpSessionGate loads it BEFORE the
// WebView / iframe mounts, so the real id is always injected (legacy often sent '').
export function MonthlyExpenseReportScreen() {
  return (
    <ErpSessionGate>
      {(s) => <MonthlyExpenseReportNEW deviceId={s.deviceId} username={s.username} token={s.token} API={s.API} />}
    </ErpSessionGate>
  );
}
