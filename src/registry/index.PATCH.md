In `src/registry/index.ts`, add one import line alongside the others:

  import './modules/dashboard.permission';
  import './modules/designs.permission';
  import './modules/monthlySalesTarget.permission';
  import './modules/creel.permission';
  import './modules/beam.permission';
  import './modules/costing.permission';
  import './modules/orders.permission';
  import './modules/administration.permission';
  import './modules/greyPacking.permission';
  import './modules/priority.permission';   // <-- ADD THIS LINE

Nothing else in this file changes.
