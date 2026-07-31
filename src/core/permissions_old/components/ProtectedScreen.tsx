import React from 'react';
import { AccessDenied } from './AccessDenied';
import { usePermission } from '../usePermission';

export function ProtectedScreen({
  resource,
  children,
  onBack,
}: {
  resource: string;
  children: React.ReactNode;
  onBack?: () => void;
}) {
  const { canAccess } = usePermission();
  if (!canAccess(resource)) return <AccessDenied onBack={onBack} />;
  return <>{children}</>;
}
