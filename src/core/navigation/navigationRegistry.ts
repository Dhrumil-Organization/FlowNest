import '@/src/core/ui-registry';
import { getUiNodes } from '@/src/core/ui-registry';

export type AppNavigationItem = {
  routeName: string;
  title: string;
  resource: string;
  icon: string;
  action?: string;
  order: number;

  //new
  groupId?: string;
};


export type AppNavigationGroup = {
  id: string;
  title: string;
  subtitle?: string;
  icon: string;
  order: number;
};

/**
 * Flat list of every screen. Expo Router tabs, notifications, search and the
 * first-screen logic all keep using THIS list, so putting a screen inside a
 * group never changes a route or a permission.
 */

/** Navigation is generated from the unified UI registry. Never hardcode tabs here. */
export const APP_NAVIGATION: readonly AppNavigationItem[] = getUiNodes('navigation').map((node) => ({
  routeName: String(node.route || ''),
  title: node.title,
  resource: node.permission,
  icon: node.icon || 'apps',
  action: node.action,
  order: node.order || 0,

  //new
  groupId: node.parentId,
}));

/** Menu folders (Yarn Dyeing …). Only used to DRAW the menu; they are not routes. */
export const APP_NAV_GROUPS: readonly AppNavigationGroup[] = getUiNodes('group').map((node) => ({
  id: node.id,
  title: node.title,
  subtitle: typeof node.metadata?.subtitle === 'string' ? (node.metadata.subtitle as string) : undefined,
  icon: node.icon || 'folder',
  order: node.order || 0,
}));
