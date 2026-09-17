// import './modules/checking.ui';
// import './modules/beam-close.ui';
import './modules/core-navigation.ui';
import './modules/datalog.ui';
import './modules/design.ui';
import './modules/greyPacking.ui';
import './modules/management.ui';
import './modules/priority.ui';
import './modules/salesTarget.ui';

// production.module.ts registers BOTH the permission resources and the ui
// nodes for the Production module (see that file's header comment for the
// single-file pattern this follows). Importing it here — before
// validateUiRegistry() runs below — guarantees its permission definitions
// are in place before the cross-check.
import '../../registry/modules/production.module';

import { validateUiRegistry } from './uiRegistry';
// FIX: cross-check every UI-registry node's `permission` string against
// the real permission registry (see uiRegistry.ts for why). `../../registry`
// only imports permission modules + permissionRegistry.ts, never anything
// from ui-registry, so this one-directional import is safe (no cycle).
import { flattenPermissionRegistry } from '../../registry';

const knownPermissionPaths = new Set(flattenPermissionRegistry().map((entry) => entry.resourcePath));
validateUiRegistry(knownPermissionPaths);

export * from './components/PermissionUi';
export * from './components/RegistryRenderer';
export * from './types';
export * from './uiRegistry';

