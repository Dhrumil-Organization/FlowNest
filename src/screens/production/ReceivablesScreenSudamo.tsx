import React from 'react';
import ReceivablesSudamoNEW from '../../components/OutstandingNEW/ReceivablesSudamo';
import { ErpSessionGate } from '../../core/session/erpSession';

// Receivables Sudamo on its own (always the Sudamo / Knits screen).
// The menu does not open this one directly: `ReceivablesScreen` picks
// Sudamo or Rayons from the logged-in property.
export function ReceivablesScreenSudamo() {
  return (
    <ErpSessionGate>
      {(s) => <ReceivablesSudamoNEW token={s.token} API={s.API} username={s.username} />}
    </ErpSessionGate>
  );
}
