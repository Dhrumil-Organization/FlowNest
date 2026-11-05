import React from 'react';
import { usePermission } from '../usePermission';

export function PermissionGate({
  resource,
  action,
  fallback = null,
  children,
}: {
  resource: string;
  action?: string;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}) {
  const { canAccess, canDo } = usePermission();
  const allowed = action ? canDo(resource, action) : canAccess(resource);
  return allowed ? <>{children}</> : <>{fallback}</>;
}
