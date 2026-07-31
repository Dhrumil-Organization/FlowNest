import React, { useEffect } from 'react';

import { useAppSessionStore } from '../../stores/AppSessionStore';
import { autoSyncPermissionRegistry } from './registryAutoSync';

export function RegistryAutoSyncGate({ children }: { children: React.ReactNode }) {
  const token = useAppSessionStore((state) => state.token);
  const rawLoginResponse = useAppSessionStore((state) => state.rawLoginResponse);

  useEffect(() => {
    if (!token || !rawLoginResponse) return;
    void autoSyncPermissionRegistry(rawLoginResponse);
  }, [token, rawLoginResponse]);

  return <>{children}</>;
}
