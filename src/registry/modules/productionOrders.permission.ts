import { registerPermissionArea } from '../permissionRegistry';

registerPermissionArea({
  key: 'production',
  name: 'Production',
  icon: 'construct-outline',
  displayOrder: 30,
  resources: [
    {
      // Parent resource key MUST be 'production' — flattenPermissionRegistry()
      // builds resource paths purely from resource-key nesting (it never
      // prefixes with the area `key` above), so without this wrapper the
      // children below would flatten to bare 'production_order_tracking' /
      // 'sudamo_production_order' instead of 'production.production_order_tracking'
      // / 'production.sudamo_production_order', which is what
      // core/ui-registry/modules/production.ui.ts's nav/screen nodes declare
      // as their `permission`. Same pattern as 'orders' in orders.permission.ts
      // and 'creel' in creel.permission.ts.
      key: 'production',
      name: 'Production',
      type: 'screen',
      displayOrder: 30,
      actions: [{ key: 'view', name: 'View' }],
      children: [
        {
          key: 'production_order_tracking',
          name: 'Production Order Tracking',
          type: 'screen',
          displayOrder: 40,
          actions: [{ key: 'view', name: 'View' }],
        },
        {
          key: 'sudamo_production_order',
          name: 'Sudamo Production Order',
          type: 'screen',
          displayOrder: 50,
          actions: [{ key: 'view', name: 'View' }],
        },
        {
          key: 'credit_limit_request',
          name: 'Credit Limit Request',
          type: 'screen',
          displayOrder: 60,
          actions: [{ key: 'view', name: 'View' }],
        },
<<<<<<< HEAD
        {
          key: 'payable',
          name: 'Payable',
          type: 'screen',
          displayOrder: 70,
          actions: [{ key: 'view', name: 'View' }],
        },
        {
          key: 'receivables',
          name: 'Receivables',
          type: 'screen',
          displayOrder: 70,
          actions: [{ key: 'view', name: 'View' }],
        },

=======
        // {
        //   key: 'payable',
        //   name: 'Payable',
        //   type: 'screen',
        //   displayOrder: 70,
        //   actions: [{ key: 'view', name: 'View' }],
        // },          
>>>>>>> 2f2f05e535b11bf14bd1b98fcc3d8727155a2268
      ],
    },
  ],
});