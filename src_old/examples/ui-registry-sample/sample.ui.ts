import { registerUiNodes } from '../../core/ui-registry/uiRegistry';

registerUiNodes([
  { id: 'nav.sales_forecast', kind: 'navigation', title: 'Forecast', permission: 'sales.forecast', action: 'view', route: '/new/(tabs)/sales-forecast', icon: 'analytics', order: 50 },
  { id: 'screen.sales_forecast', kind: 'screen', title: 'Sales Forecast', permission: 'sales.forecast', action: 'view', order: 50 },
  { id: 'dashboard.sales_forecast', kind: 'dashboard-card', parentId: 'screen.dashboard', title: 'Sales Forecast', permission: 'sales.forecast.summary', action: 'view', order: 50 },
  { id: 'sales_forecast.summary', kind: 'section', parentId: 'screen.sales_forecast', title: 'Summary', permission: 'sales.forecast.summary', action: 'view', order: 10 },
  { id: 'sales_forecast.filters', kind: 'section', parentId: 'screen.sales_forecast', title: 'Filters', permission: 'sales.forecast.filters', action: 'view', order: 20 },
  { id: 'sales_forecast.create', kind: 'button', parentId: 'screen.sales_forecast', title: 'Create', permission: 'sales.forecast', action: 'create', order: 10 },
  { id: 'sales_forecast.create_dialog', kind: 'dialog', parentId: 'screen.sales_forecast', title: 'Create Forecast', permission: 'sales.forecast.create_dialog', action: 'open', order: 10 },
]);
