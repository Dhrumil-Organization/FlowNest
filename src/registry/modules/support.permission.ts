// ─────────────────────────────────────────────────────────────
// FILE: src/registry/modules/support.permission.ts
// SUPPORT DESK — permission resources (header icons + the two apps).
//   support.raise_ticket  FlowNest users: raise tickets, see / chat on their own tickets
//                         (also checked on the server: SupportController::canRaise)
//   support.it_desk       IT team: shows the IT Desk icon; the IT Desk itself has its own login
// No sidebar / tab entries: both open from the header icons (like Mill mode).
// Rights are given the normal way (Platform Admin → registry sync → role / user).
// ─────────────────────────────────────────────────────────────
import { registerPermissionArea } from '../permissionRegistry';

const view = { key: 'view', name: 'View' };

registerPermissionArea({
  key: 'support',
  name: 'Support Desk',
  icon: 'help-buoy-outline',
  displayOrder: 95,
  resources: [
    {
      key: 'support',
      name: 'Support Desk',
      type: 'module',
      displayOrder: 10,
      actions: [view],
      children: [
        { key: 'raise_ticket', name: 'Raise ticket (my tickets)', type: 'screen', displayOrder: 10, actions: [view] },
        { key: 'it_desk', name: 'IT Desk (IT team software)', type: 'screen', displayOrder: 20, actions: [view] },
      ],
    },
  ],
});
