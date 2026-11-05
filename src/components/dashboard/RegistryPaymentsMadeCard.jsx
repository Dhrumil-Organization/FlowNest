import React from 'react';
import PaymentsMadeCard from './PaymentsMadeCard';
import { canViewPaymentsMade } from './paymentsMadePermission';

/**
 * Drop-in, registry-gated card. The unauthorized card is not mounted, hence it
 * cannot call the payment API. The API also independently enforces permission.
 *
 * `permissionSession` is the existing app_session payload (or its permissions).
 * Do not pass fake permission booleans or a role-name shortcut.
 */
export default function RegistryPaymentsMadeCard({ permissionSession, ...cardProps }) {
  if (!canViewPaymentsMade(permissionSession)) return null;
  return <PaymentsMadeCard {...cardProps} />;
}
