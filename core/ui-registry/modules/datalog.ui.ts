import { registerUiNodes } from '../uiRegistry';

registerUiNodes([
  {
    id: 'nav.datalog',
    kind: 'navigation',
    title: 'Datalog',
    permission: 'datalog',
    action: 'view',
    route: 'datalog',
    icon: 'insert-chart',
    order: 50,
  },
  {
    id: 'screen.datalog',
    kind: 'screen',
    title: 'Datalog',
    permission: 'datalog',
    action: 'view',
    order: 50,
  },
]);
