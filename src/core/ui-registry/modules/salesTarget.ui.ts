import { registerUiNodes } from '../uiRegistry';

registerUiNodes([
  { id: 'nav.monthlysalestarget', kind: 'navigation', title: 'Sales Target', permission: 'monthlysalestarget', action: 'view', route: 'monthlysalestarget', icon: 'trending-up', order: 25 },
  { id: 'screen.monthlysalestarget', kind: 'screen', title: 'Monthly Sales Target', permission: 'monthlysalestarget', action: 'view', order: 25 },
]);
