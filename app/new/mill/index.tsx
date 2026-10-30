// FILE: app/new/mill/index.tsx — Mill Hub (the whole app while Mill mode is ON)
// Rights: MillShell checks every mill.* resource itself; with no Mill right it
// shows "No Mill Hub rights" + "Back to ERP" (a plain PermissionRouteGuard
// would leave the user stuck on "Access denied" with no way out of Mill mode).
import { MillShell } from '@/src/mill/MillShell';
import React from 'react';

export default function MillHubScreen() {
  return <MillShell />;
}
