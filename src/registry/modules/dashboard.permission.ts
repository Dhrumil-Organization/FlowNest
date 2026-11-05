import { registerPermissionArea } from '../permissionRegistry';

registerPermissionArea({
  key: 'management',
  name: 'Management',
  icon: 'speedometer-outline',
  displayOrder: 10,
  resources: [
    {
      key: 'dashboard',
      name: 'Dashboard',
      type: 'screen',
      displayOrder: 10,
      actions: [],
      children: [
        { key: 'owner_view', name: 'Owner View', type: 'section', displayOrder: 5, actions: [] },

        { key: 'monthly_target', name: 'Monthly Target Summary', type: 'widget', displayOrder: 10, actions: [] },
        { key: 'monthly_report', name: 'Monthly Report', type: 'report', displayOrder: 60, actions: [{ key: 'print', name: 'Print' }, { key: 'export', name: 'Export' }] },
        { key: 'costing_summary', name: 'Costing / Production Cost Card', type: 'widget', displayOrder: 20, actions: [] },
        { key: 'sales_detail', name: 'Sales Detail Card', type: 'widget', displayOrder: 110, actions: [] },
        { key: 'production_detail', name: 'Production Detail Card', type: 'widget', displayOrder: 120, actions: [] },
        { key: 'collection_detail', name: 'Payment Collection Detail Card', type: 'widget', displayOrder: 130, actions: [] },
        { key: 'payment_detail', name: 'Payment To Pay Detail Card', type: 'widget', displayOrder: 135, actions: [] },
        { key: 'outstanding_detail', name: 'Outstanding Detail Card', type: 'widget', displayOrder: 140, actions: [] },
        { key: 'creditor_dashboard', name: 'Creditor Dashboard', type: 'screen', displayOrder: 137, actions: [] },
      ],
    },
    {
      key: 'reports',
      name: 'Reports',
      type: 'module',
      displayOrder: 20,
      actions: [],
      children: [
        { key: 'monthly_target', name: 'Monthly Target', type: 'report', displayOrder: 5, actions: [{ key: 'print', name: 'Print' }, { key: 'export', name: 'Export' }] },
        { key: 'monthly_report', name: 'Monthly Report', type: 'report', displayOrder: 10, actions: [{ key: 'print', name: 'Print' }, { key: 'export', name: 'Export' }] },
        { key: 'sales_analysis', name: 'Sales Analysis', type: 'report', displayOrder: 20, actions: [{ key: 'print', name: 'Print' }, { key: 'export', name: 'Export' }] },
        { key: 'collection_analysis', name: 'Collection Analysis', type: 'report', displayOrder: 30, actions: [{ key: 'print', name: 'Print' }, { key: 'export', name: 'Export' }] },
        // Reports → Expense & Production (ExpenseScreen). Freeze = lock a finished month after its
        // actuals are applied (Monthly adjustment & freeze). Unfreeze / delete is only for user id 1.
        { key: 'expense', name: 'Expense & Production', type: 'report', displayOrder: 35, actions: [{ key: 'freeze', name: 'Freeze month' }] },
        {
          key: 'production_report', name: 'Production Report', type: 'report', displayOrder: 40,
          actions: [{ key: 'print', name: 'Print' }, { key: 'export', name: 'Export' }],
          children: [
            { key: 'conversion', name: 'Conversion', type: 'tab', displayOrder: 10, actions: [] },
            { key: 'daily_production', name: 'Daily Production', type: 'tab', displayOrder: 20, actions: [] },
            { key: 'beam_status', name: 'Beam Status', type: 'tab', displayOrder: 30, actions: [] },
            { key: 'beam_shortage', name: 'Beam Shortage', type: 'tab', displayOrder: 40, actions: [] },
          ],
        },
        // Reports → Real Costing Chain (RealCostChainController): assumed vs actual cost per metre, design → beam
        { key: 'real_costing', name: 'Real Costing Chain', type: 'report', displayOrder: 45, actions: [] },
        // Reports → Assign Report: the web ERP's "Reports" (get_user_saved_report_settings + rpt_gateway) on FlowNest
        { key: 'assign_report', name: 'Assign Report', type: 'report', displayOrder: 50, actions: [{ key: 'export', name: 'Export' }] },
      ],
    },
  ],
});
