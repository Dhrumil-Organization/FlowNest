import { registerUiNodes } from '../uiRegistry';

// Dyeing module (formerly "Priority"). Route and permission key stay
// 'priority' so existing links and grants keep working.
registerUiNodes([
  {
    id: 'nav.priority',
    kind: 'navigation',
    title: 'Dyeing',
    permission: 'priority',
    action: 'view',
    route: 'priority',
    icon: 'opacity',
    order: 45,
  },
  {
    id: 'screen.priority',
    kind: 'screen',
    title: 'Dyeing',
    permission: 'priority',
    action: 'view',
    order: 45,
  },
]);
