import { registerPermissionArea } from '../permissionRegistry';

registerPermissionArea({
  key: 'commercial',
  name: 'Commercial',
  icon: 'cart-outline',
  displayOrder: 40,
  resources: [
    {
      key: 'orders',
      name: 'Orders',
      type: 'screen',
      displayOrder: 20,
      actions: [{ key: 'view', name: 'View' }, { key: 'add', name: 'Add' }, { key: 'edit', name: 'Edit' }, { key: 'delete', name: 'Delete', dangerous: true }, { key: 'print', name: 'Print' }],
      children: [
        { key: 'new_order', name: 'New Order', type: 'tab', displayOrder: 10, actions: [{ key: 'view', name: 'View' }, { key: 'create', name: 'Create Order' }, { key: 'edit', name: 'Edit Order' }, { key: 'submit_authorization', name: 'Submit for Authorization' }] },
        { key: 'authorization', name: 'Authorization', type: 'tab', displayOrder: 20, actions: [{ key: 'view', name: 'View' }], children: [{ key: 'order_detail', name: 'Order Detail', type: 'card', actions: [{ key: 'view', name: 'View Detail' }, { key: 'approve', name: 'Approve', dangerous: true }, { key: 'reject', name: 'Reject', dangerous: true }] }] },
        { key: 'tracking', name: 'Tracking', type: 'tab', displayOrder: 30, actions: [{ key: 'view', name: 'View' }], children: [{ key: 'dispatch_dialog', name: 'Dispatch', type: 'dialog', actions: [{ key: 'dispatch', name: 'Dispatch' }] }, { key: 'apc_dialog', name: 'Confirm APC', type: 'dialog', actions: [{ key: 'confirm', name: 'Confirm APC' }] }, { key: 'job_chart', name: 'Job Chart', type: 'dialog', actions: [{ key: 'view', name: 'View Job Chart' }, { key: 'copy', name: 'Copy Job Chart' }, { key: 'print', name: 'Print Job Chart' }] }] },
      ],
    },
  ],
});
