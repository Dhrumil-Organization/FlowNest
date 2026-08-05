import './ui-registry';
import React from 'react';
import { BusinessContextProvider } from './business';
import { PermissionProvider } from './permissions';

export function AppCoreProvider({ children }: { children: React.ReactNode }) {
  return (
    <BusinessContextProvider>
      <PermissionProvider>{children}</PermissionProvider>
    </BusinessContextProvider>
  );
}
