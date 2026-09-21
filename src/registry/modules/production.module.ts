// FILE: src/registry/modules/production.module.ts
//
// SINGLE-FILE FEATURE MODULE for "Production".
// ------------------------------------------------------------------
// This is the ONE file that defines every Production feature's:
//   1. Permission resource (who can see it)
//   2. Navigation + screen nodes (where it shows up, what route it uses)
//
// It replaces having to edit two separate files (a *.permission.ts file
// AND a *.ui.ts file) for this module — everything for "Production" lives
// here now.
//
// HOW TO ADD A NEW FEATURE TO *THIS* MODULE (e.g. another Production screen):
//   1. Add one object to the `children` array below (permission resource).
//   2. Add one { nav, screen } pair to the `registerUiNodes([...])` call
//      below — `permission` MUST equal 'production.<your_key>', and
//      `route` MUST equal the exact filename (without .tsx) of the route
//      file you create in step 3.
//   3. Create the ACTUAL route file at:
//        app/new/(tabs)/<your-route-name>.tsx        <-- OUTER app/, NOT src/app/
//      (see production-order-tracking.tsx in that same folder for the
//      3-line pattern to copy — PermissionRouteGuard + your Screen).
//   4. Create a thin screens/production/<Feature>Screen.tsx wrapper if one
//      doesn't already exist for the underlying component (copy
//      CreditLimitRequestScreen.tsx's shape).
//
// That's it — no _layout.tsx edit needed: the header title is derived
// automatically from the `title` you gave the nav node in step 2.
//
// IMPORTANT: There are TWO "app" folders in this repo — the real, live one
// is the OUTER `app/` at the project root. `src/app/` is a stray leftover
// duplicate that Expo Router does NOT scan. Route files (step 3) always go
// in the OUTER `app/new/(tabs)/`, never under `src/app/new/(tabs)/`.
// ------------------------------------------------------------------

import { registerUiNodes } from '../../core/ui-registry/uiRegistry';
import { registerPermissionArea } from '../permissionRegistry';

// ---------------------------------------------------------------------------
// 1. PERMISSIONS
// ---------------------------------------------------------------------------
// Resource paths are built from resource-KEY nesting only (the area `key`
// below is just a display grouping — it is never part of the path). So the
// wrapping resource here MUST be keyed 'production' for its children to
// resolve to 'production.<child_key>', which is what the ui nodes below
// declare as their `permission`.
registerPermissionArea({
  key: 'production',
  name: 'Production',
  icon: 'construct-outline',
  displayOrder: 30,
  resources: [
    {
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
        {
          key: 'purchase_order',
          name: 'Purchase Order',
          type: 'screen',
          displayOrder: 70,
          actions: [{ key: 'view', name: 'View' }],
        },
        // {
        //   key: 'daily_collection_report',
        //   name: 'Daily Collection Report',
        //   type: 'screen',
        //   displayOrder: 70,
        //   actions: [{ key: 'view', name: 'View' }],
        // },
        {
          key: 'daily_payment_report',
          name: 'Daily Payment Report',
          type: 'screen',
          displayOrder: 70,
          actions: [{ key: 'view', name: 'View' }],
        },
        {
          key: 'daily_collection_report_new',
          name: 'Daily Payment Report',
          type: 'screen',
          displayOrder: 70,
          actions: [{ key: 'view', name: 'View' }],
        },
        {
          key: 'snapview',
          name: 'Snap View',
          type: 'screen',
          displayOrder: 70,
          actions: [{ key: 'view', name: 'View' }],
        },
        {
          key: 'sales_order',
          name: 'Sales Order',
          type: 'screen',
          displayOrder: 70,
          actions: [{ key: 'view', name: 'View' }],
        },
        {
          key: 'collection',
          name: 'Collection',
          type: 'screen',
          displayOrder: 70,
          actions: [{ key: 'view', name: 'View' }],
        },
        // {
        //   key: 'payable',
        //   name: 'Payable',
        //   type: 'screen',
        //   displayOrder: 70,
        //   actions: [{ key: 'view', name: 'View' }],
        // },
        // <-- add your new feature's resource object here (step 1)
      ],
    },
  ],
});

// ---------------------------------------------------------------------------
// 2. NAVIGATION + SCREEN NODES
// ---------------------------------------------------------------------------
// TEMPORARY PRODUCTION HOLD: beam_gaiting remains available in source but is
// not registered in Home, tabs, More, search, or quick navigation.
const ENABLE_BEAM_GAITING_UI = false;

if (ENABLE_BEAM_GAITING_UI) registerUiNodes([
  { id: 'nav.beam_gaiting', kind: 'navigation', title: 'Beam Gaiting', permission: 'beam_gaiting', action: 'view', route: 'beam-gaiting/index', icon: 'settings-input-component', order: 80 },
  { id: 'screen.beam_gaiting', kind: 'screen', title: 'Beam Gaiting', permission: 'beam_gaiting', action: 'view', order: 80 },
]);

registerUiNodes([
  {
    id: 'nav.production_order_tracking',
    kind: 'navigation',
    title: 'Production Order Tracking',
    permission: 'production.production_order_tracking',
    action: 'view',
    route: 'production-order-tracking',
    icon: 'assignment',
    order: 90,
  },
  {
    id: 'screen.production_order_tracking',
    kind: 'screen',
    title: 'Production Order Tracking',
    permission: 'production.production_order_tracking',
    action: 'view',
    order: 90,
  },
  {
    id: 'nav.sudamo_production_order',
    kind: 'navigation',
    title: 'Sudamo Production Order',
    permission: 'production.sudamo_production_order',
    action: 'view',
    route: 'sudamo-production-order',
    icon: 'assignment-turned-in',
    order: 100,
  },
  {
    id: 'screen.sudamo_production_order',
    kind: 'screen',
    title: 'Sudamo Production Order',
    permission: 'production.sudamo_production_order',
    action: 'view',
    order: 100,
  },
  {
    id: 'nav.credit_limit_request',
    kind: 'navigation',
    title: 'Credit Limit Request',
    permission: 'production.credit_limit_request',
    action: 'view',
    route: 'credit-limit-request',
    icon: 'credit-card',
    order: 110,
  },
  {
    id: 'screen.credit_limit_request',
    kind: 'screen',
    title: 'Credit Limit Request',
    permission: 'production.credit_limit_request',
    action: 'view',
    order: 110,
  },
  {
    id: 'nav.purchase_order',
    kind: 'navigation',
    title: 'Purchase Order',
    permission: 'production.purchase_order',
    action: 'view',
    route: 'purchase-order',
    icon: 'attach-money',
    order: 110,
  },
  {
    id: 'screen.purchase_order',
    kind: 'screen',
    title: 'Purchase Order',
    permission: 'production.purchase_order',
    action: 'view',
    order: 110,
  },
  // Daily Collection Report
  {
    id: 'nav.daily_collection_report_new',
    kind: 'navigation',
    title: 'Daily Collection Report',
    permission: 'production.daily_collection_report_new',
    action: 'view',
    route: 'daily-report',
    icon: 'collections-bookmark',
    order: 110,
  },
  {
    id: 'screen.daily_collection_report_new',
    kind: 'screen',
    title: 'Daily Collection Report',
    permission: 'production.daily_collection_report_new',
    action: 'view',
    order: 110,
  },
  // Daily Payment Report
  {
    id: 'nav.daily_payment_report',
    kind: 'navigation',
    title: 'Daily Payment Report',
    permission: 'production.daily_payment_report',
    action: 'view',
    route: 'daily-payment-report',
    icon: 'payments',
    order: 110,
  },
  {
    id: 'screen.daily_payment_report',
    kind: 'screen',
    title: 'Daily Payment Report',
    permission: 'production.daily_payment_report',
    action: 'view',
    order: 110,
  },
  // Snap View
  {
    id: 'nav.snapview',
    kind: 'navigation',
    title: 'Snap View',
    permission: 'production.snapview',
    action: 'view',
    route: 'snapview',
    icon: 'table-view',
    order: 110,
  },
  {
    id: 'screen.snapview',
    kind: 'screen',
    title: 'Snap View',
    permission: 'production.snapview',
    action: 'view',
    order: 110,
  },
  // 
  {
    id: 'nav.sales_order',
    kind: 'navigation',
    title: 'Sales Order',
    permission: 'production.sales_order',
    action: 'view',
    route: 'sales-order',
    icon: 'point-of-sale',
    order: 110,
  },
  {
    id: 'screen.sales_order',
    kind: 'screen',
    title: 'Sales Order',
    permission: 'production.sales_order',
    action: 'view',
    order: 110,
  },
  // Collection
  {
    id: 'nav.collection',
    kind: 'navigation',
    title: 'Collection',
    permission: 'production.collection',
    action: 'view',
    route: 'collection',
    icon: 'currency-rupee',
    order: 110,
  },
  {
    id: 'screen.collection',
    kind: 'screen',
    title: 'Collection',
    permission: 'production.collection',
    action: 'view',
    order: 110,
  },
  // {
  //   id: 'nav.payable',
  //   kind: 'navigation',
  //   title: 'Payable',
  //   permission: 'production.payable',
  //   action: 'view',
  //   route: 'Payable-Screen',
  //   icon: 'assignment',
  //   order: 110,
  // },
  // {
  //   id: 'screen.payable',
  //   kind: 'screen',
  //   title: 'Payable',
  //   permission: 'production.payable',
  //   action: 'view',
  //   order: 110,
  // },
  // <-- add your new feature's { nav, screen } node pair here (step 2)
]);
