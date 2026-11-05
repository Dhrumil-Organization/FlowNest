// ─────────────────────────────────────────────────────────────
// FILE: src/registry/modules/mill.permission.ts
// MILL HUB (Process House) — permission resources.
//
// Resource paths do NOT include the area key (see permissionRegistry.visit),
// so everything sits under ONE top-level resource "mill":
//   mill, mill.dashboard, mill.inward, … mill.expense.coal, mill.reports.colour_cost
//
// No UI-registry navigation nodes are registered for Mill → Mill screens can
// never appear in the normal ERP sidebar / tab bar. Mill mode has its own shell
// (app/new/mill) that shows only the mill.* items the user has rights to.
// Rights are given the normal way (Platform Admin → registry sync → role / user).
// Not part of NEW_USER_RESOURCES.
// ─────────────────────────────────────────────────────────────
import { registerPermissionArea } from '../permissionRegistry';

const view = { key: 'view', name: 'View' };

registerPermissionArea({
  key: 'mill',
  name: 'Mill Hub (Process House)',
  icon: 'color-filter-outline',
  displayOrder: 90,
  resources: [
    {
      key: 'mill',
      name: 'Mill Hub',
      type: 'module',
      displayOrder: 10,
      actions: [view],
      children: [
        { key: 'dashboard', name: 'Plant Dashboard', type: 'screen', displayOrder: 10, actions: [view] },
        // ON (ALLOW) = an "Under development" strip on EVERY Mill page; OFF = no strip.
        // Only its own ALLOW counts (not inherited from "Mill Hub"); it does not open any page.
        { key: 'under_development', name: 'Under Development banner (all Mill pages)', type: 'section', displayOrder: 5, actions: [view] },
        { key: 'inward', name: 'Greige Inward', type: 'screen', displayOrder: 20, actions: [view, { key: 'create', name: 'Create' }, { key: 'edit', name: 'Edit' }] },
        { key: 'movement_register', name: 'Outward / Inward Movement Register', type: 'report', displayOrder: 25, actions: [view] },
        { key: 'lots', name: 'Lot Board', type: 'screen', displayOrder: 30, actions: [view, { key: 'edit', name: 'Edit' }] },
        { key: 'machines', name: 'Machine Planner', type: 'screen', displayOrder: 40, actions: [view, { key: 'edit', name: 'Edit' }] },
        { key: 'lab', name: 'Shade Lab', type: 'screen', displayOrder: 50, actions: [view, { key: 'edit', name: 'Edit' }] },
        { key: 'recipes', name: 'Recipes & Chemicals', type: 'screen', displayOrder: 60, actions: [view, { key: 'edit', name: 'Edit' }] },
        { key: 'dispatch', name: 'Dispatch & Billing', type: 'screen', displayOrder: 70, actions: [view, { key: 'create', name: 'Create' }] },
        {
          key: 'expense',
          name: 'Monthly Expense',
          type: 'module',
          displayOrder: 80,
          actions: [view],
          children: [
            { key: 'coal', name: 'Coal — Boiler + Thermopack', type: 'screen', displayOrder: 10, actions: [view] },
            { key: 'coal_steam_entry', name: 'Daily Steam Entry', type: 'screen', displayOrder: 26, actions: [view, { key: 'edit', name: 'Enter steam' }] },
                        { key: 'coal_optimiser', name: 'Coal Mix Optimiser', type: 'screen', displayOrder: 20, actions: [view, { key: 'edit', name: 'Edit constraints' }] },
            { key: 'coal_offers', name: 'Coal Supplier Offers', type: 'screen', displayOrder: 25, actions: [view, { key: 'edit', name: 'Add / edit / delete offers' }] },
            { key: 'electricity', name: 'Electricity — Torrent', type: 'screen', displayOrder: 30, actions: [view] },
            { key: 'electricity_daily_entry', name: 'Electricity Daily Entry', type: 'screen', displayOrder: 31, actions: [view, { key: 'edit', name: 'Enter / edit daily readings' }] },
            { key: 'electricity_meter_setup', name: 'Electricity Meter Setup', type: 'screen', displayOrder: 32, actions: [view, { key: 'edit', name: 'Configure meters and unit rate' }] },
            { key: 'chemicals', name: 'Chemicals & Dyes', type: 'screen', displayOrder: 40, actions: [view] },
            { key: 'labour', name: 'Labour & Wages', type: 'screen', displayOrder: 50, actions: [view] },
            { key: 'maintenance', name: 'Maintenance & Stores', type: 'screen', displayOrder: 60, actions: [view] },
          ],
        },
        {
          key: 'reports',
          name: 'Reports & KPIs',
          type: 'module',
          displayOrder: 90,
          actions: [view],
          children: [
            { key: 'colour_cost', name: 'Colour Cost', type: 'report', displayOrder: 10, actions: [view, { key: 'export', name: 'Export' }] },
          ],
        },
      ],
    },
  ],
});
