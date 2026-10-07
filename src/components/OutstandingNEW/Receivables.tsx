// FILE: src/components/OutstandingNEW/Receivables.tsx
// Receivables of the RAYONS login (legacy components/Receivables, route app/(tabs)/receivables.tsx).
// Has the "Receivables View Combine" role rule (no property-group picker, prptype 'R').
import React from 'react';
import OutstandingView from './OutstandingView';

type Props = { token: string; API: string; username?: string };

export default function ReceivablesNEW(props: Props) {
  return <OutstandingView variant="receivables" {...props} />;
}
