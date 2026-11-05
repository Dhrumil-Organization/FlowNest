import React from 'react';
import ReceivablesNEW from '../../components/OutstandingNEW/Receivables';
import ReceivablesSudamoNEW from '../../components/OutstandingNEW/ReceivablesSudamo';
import { ErpSessionGate } from '../../core/session/erpSession';

// Token + API host come from the common ErpSessionGate:
//   - sudamo_knits -> apig, rayons -> apiy (login selection AND header switch)
//   - screen renders only after the correct token/host are known
//   - screen remounts fresh when property or token changes (no refresh needed)
//
// Receivables is property-wise, same rule as the Legacy Home screen
// (`prp === 'sudamo_knits' ? 'receivables-sudamo' : 'receivables'`):
//   - Sudamo / Knits login -> Receivables Sudamo
//   - Rayons login         -> Receivables (with the "Receivables View Combine" role rule)
export function ReceivablesScreen() {
  return (
    <ErpSessionGate>
      {(s) =>
        s.property === 'sudamo_knits' ? (
          <ReceivablesSudamoNEW token={s.token} API={s.API} username={s.username} />
        ) : (
          <ReceivablesNEW token={s.token} API={s.API} username={s.username} />
        )
      }
    </ErpSessionGate>
  );
}
