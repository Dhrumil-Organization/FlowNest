// FILE: src/components/OutstandingNEW/ReceivablesSudamo.tsx
// Receivables of the SUDAMO / KNITS login (legacy components/ReceivablesSudamo,
// route app/(tabs)/receivables-sudamo.tsx). The property group is always chosen by the user.
import React from 'react';
import OutstandingView from './OutstandingView';

type Props = { token: string; API: string; username?: string };

export default function ReceivablesSudamoNEW(props: Props) {
  return <OutstandingView variant="receivablesSudamo" {...props} />;
}
