In `src/core/ui-registry/index.ts`, add one import line alongside the others:

  import './modules/core-navigation.ui';
  import './modules/greyPacking.ui';
  import './modules/priority.ui';   // <-- ADD THIS LINE
  import './modules/design.ui';
  import './modules/management.ui';
  import './modules/production.ui';
  import './modules/salesTarget.ui';

Nothing else in this file changes. (This is what makes the "Priority" tab
show up in APP_NAVIGATION automatically — no changes needed in
navigationRegistry.ts or (tabs)/_layout.tsx's Tabs.Screen mapping, since
that already maps over APP_NAVIGATION dynamically.)
