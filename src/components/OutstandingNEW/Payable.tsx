// FILE: src/components/OutstandingNEW/Payable.tsx
// Payable (legacy components/Payable, route app/(tabs)/payable.tsx) — same for both properties.
import React from 'react';
import OutstandingView from './OutstandingView';

type Props = { token: string; API: string; username?: string };

export default function PayableNEW(props: Props) {
  return <OutstandingView variant="payable" {...props} />;
}
