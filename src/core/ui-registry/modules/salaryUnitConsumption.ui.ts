import { registerUiNodes } from '../uiRegistry';

registerUiNodes([
  {
    id: 'nav.salary',
    kind: 'navigation',
    title: 'Salary',
    permission: 'reports.salary',
    action: 'view',
    route: 'salary',
    icon: 'payments',
    order: 56,
  },
  {
    id: 'screen.salary',
    kind: 'screen',
    title: 'Salary',
    permission: 'reports.salary',
    action: 'view',
    order: 56,
  },
  {
    id: 'nav.unit_consumption',
    kind: 'navigation',
    title: 'Unit Consumption',
    permission: 'reports.unit_consumption',
    action: 'view',
    route: 'unit-consumption',
    icon: 'analytics',
    order: 57,
  },
  {
    id: 'screen.unit_consumption',
    kind: 'screen',
    title: 'Unit Consumption',
    permission: 'reports.unit_consumption',
    action: 'view',
    order: 57,
  },
]);
