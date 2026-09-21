import { registerUiNodes } from '../uiRegistry';

registerUiNodes([
  {
    id: 'nav.home',
    kind: 'navigation',
    title: 'Home',
    permission: 'dashboard',
    action: 'view',
    route: 'index',
    icon: 'home',
    order: 10,
  },

  {
    id: 'screen.dashboard',
    kind: 'screen',
    title: 'Dashboard',
    permission: 'dashboard',
    action: 'view',
    order: 10,
  },

  {
    id: 'dashboard.monthly_target',
    kind: 'dashboard-card',
    parentId: 'screen.dashboard',
    title: 'Monthly Target',
    permission: 'dashboard.monthly_target',
    action: 'view',
    order: 10,
  },

  {
    id: 'dashboard.monthly_report',
    kind: 'dashboard-card',
    parentId: 'screen.dashboard',
    title: 'Monthly Report',
    permission: 'dashboard.monthly_report',
    action: 'view',
    order: 20,
  },

  {
    id: 'dashboard.costing_summary',
    kind: 'dashboard-card',
    parentId: 'screen.dashboard',
    title: 'Costing / Production Cost',
    permission: 'dashboard.costing_summary',
    action: 'view',
    order: 30,
  },

  {
    id: 'dashboard.operational_details',
    kind: 'dashboard-card',
    parentId: 'screen.dashboard',
    title: 'Operational Details',
    permission: 'dashboard.sales_detail',
    action: 'view',
    order: 100,
    metadata: {
      anyPermissions: [
        'dashboard.sales_detail',
        'dashboard.production_detail',
        'dashboard.collection_detail',
        'dashboard.payment_detail',
        'dashboard.outstanding_detail',
      ],
    },
  },

  {
    id: 'screen.creditor_dashboard',
    kind: 'screen',
    title: 'Creditor Dashboard',
    permission: 'dashboard.creditor_dashboard',
    action: 'view',
    order: 135,
  },
]);