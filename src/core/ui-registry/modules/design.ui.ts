import { registerUiNodes } from '../uiRegistry';

registerUiNodes([
  { id: 'nav.designs', kind: 'navigation', title: 'Designs', permission: 'designs', action: 'view', route: 'designs', icon: 'build', order: 20 },
  { id: 'screen.designs', kind: 'screen', title: 'Designs', permission: 'designs', action: 'view', order: 20 },
  { id: 'designs.aliases', kind: 'tab', parentId: 'screen.designs', title: 'Aliases', permission: 'designs.aliases', action: 'view', order: 10 },
  { id: 'designs.catalog', kind: 'tab', parentId: 'screen.designs', title: 'Catalog', permission: 'designs.catalog', action: 'view', order: 20 },
  { id: 'designs.design', kind: 'tab', parentId: 'screen.designs', title: 'Design', permission: 'designs.design', action: 'view', order: 30 },
  { id: 'designs.colourway', kind: 'tab', parentId: 'screen.designs', title: 'Colourway', permission: 'designs.colourway', action: 'view', order: 40 },
  { id: 'designs.yarns', kind: 'tab', parentId: 'screen.designs', title: 'Yarns', permission: 'designs.yarns', action: 'view', order: 50 },
  { id: 'designs.dyeing', kind: 'tab', parentId: 'screen.designs', title: 'Dyeing', permission: 'designs.dyeing', action: 'view', order: 60 },
]);
