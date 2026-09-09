import { registerUiNodes } from '../uiRegistry';

registerUiNodes([
  {
    id: 'nav.priority',
    kind: 'navigation',
    title: 'Priority',
    permission: 'priority',
    action: 'view',
    route: 'priority',
    icon: 'low-priority',
    order: 45,
  },
  {
    id: 'screen.priority',
    kind: 'screen',
    title: 'Chart Priority',
    permission: 'priority',
    action: 'view',
    order: 45,
  },
]);
