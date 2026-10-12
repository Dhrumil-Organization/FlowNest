import React from 'react';
import SalesOrderEntryVersions from '../../components/SalesOrderEntryNEW/VersionSwitch';
import { ErpSessionGate } from '../../core/session/erpSession';

// Sales Order Entry (moved from the legacy ERP — legacy screen stays as-is).
// Shows the New screen and the Old (Legacy) screen under a New / Old / Both switch.
// Token + API host come from the common ErpSessionGate (sudamo_knits -> apig,
// rayons -> apiy) and the screen remounts fresh when the property / token changes.
export function SalesOrderEntryScreen() {
  return (
    <ErpSessionGate>
      {(s) => <SalesOrderEntryVersions token={s.token} API={s.API} username={s.username} />}
    </ErpSessionGate>
  );
}
