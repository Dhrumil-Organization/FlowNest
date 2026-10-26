import { registerUiNodes } from '../uiRegistry';

registerUiNodes([
  {
    id: 'nav.credit_limit_request',
    kind: 'navigation',
    title: 'Credit Limit Request',
    permission: 'credit_limit_request',
    action: 'view',
    route: 'credit-limit',
    icon: 'credit-card',
    order: 95,
  },
  {
    id: 'screen.credit_limit_request',
    kind: 'screen',
    title: 'Credit Limit Request',
    permission: 'credit_limit_request',
    action: 'view',
    order: 95,
  },
]);
