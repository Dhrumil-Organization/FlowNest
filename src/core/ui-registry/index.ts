import './modules/management.ui';
import './modules/design.ui';
import './modules/core-navigation.ui';
import './modules/production.ui';

import { validateUiRegistry } from './uiRegistry';
// FIX: cross-check every UI-registry node's `permission` string against
// the real permission registry (see uiRegistry.ts for why). `../../registry`
// only imports permission modules + permissionRegistry.ts, never anything
// from ui-registry, so this one-directional import is safe (no cycle).
import { flattenPermissionRegistry } from '../../registry';

const knownPermissionPaths = new Set(flattenPermissionRegistry().map((entry) => entry.resourcePath));
validateUiRegistry(knownPermissionPaths);

export * from './types';
export * from './uiRegistry';
export * from './components/RegistryRenderer';
export * from './components/PermissionUi';
