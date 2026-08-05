import '@/src/core/ui-registry';
import { getUiNodes } from '@/src/core/ui-registry';

export type AppNavigationItem = {
  routeName: string;
  title: string;
  resource: string;
  icon: string;
  action?: string;
  order: number;
};

/** Navigation is generated from the unified UI registry. Never hardcode tabs here. */
export const APP_NAVIGATION: readonly AppNavigationItem[] = getUiNodes('navigation').map((node) => ({
  routeName: String(node.route || ''),
  title: node.title,
  resource: node.permission,
  icon: node.icon || 'apps',
  action: node.action,
  order: node.order || 0,
}));
