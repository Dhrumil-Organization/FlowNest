import React, { createContext, useCallback, useContext, useMemo } from 'react';
import { Alert } from 'react-native';
import { flattenPermissionRegistry } from '../../registry';
import { useAppSessionStore } from '../../stores/AppSessionStore';

export type PermissionContextValue = {
  canAccess: (resourcePath: string) => boolean;
  canDo: (resourcePath: string, actionKey: string) => boolean;
  requireAccess: (resourcePath: string, message?: string) => boolean;
  requireAction: (resourcePath: string, actionKey: string, message?: string) => boolean;
  getAllowedChildren: (parentPath: string) => string[];
  isSuperAdmin: boolean;
};

const PermissionContext = createContext<PermissionContextValue | null>(null);

const normalize = (value: string) =>
  value.trim().replace(/^\.+|\.+$/g, '').replace(/\.+/g, '.').toLowerCase();

const screenFromPath = (resourcePath: string) => normalize(resourcePath).split('.')[0];

export function PermissionProvider({ children }: { children: React.ReactNode }) {
  const appSession = useAppSessionStore((state) => state.appSession);
  const user = useAppSessionStore((state) => state.user);
  const rawLoginResponse = useAppSessionStore((state) => state.rawLoginResponse);
  const legacyCanScreen = useAppSessionStore((state) => state.canScreen);
  const legacyCanTab = useAppSessionStore((state) => state.canTab);
  const legacyCanAction = useAppSessionStore((state) => state.canAction);

  const isSuperAdmin =
    Number(user?.is_superadmin || rawLoginResponse?.issuperadmin || 0) !== 0;

  const runtimeGrants = useMemo(() => {
    const grants = new Map<string, boolean>();
    const resourcePermissions = (appSession?.permissions as any)?.resources || [];

    if (Array.isArray(resourcePermissions)) {
      for (const item of resourcePermissions) {
        const resourcePath = normalize(item.resource_path || item.resourcePath || item.key || '');
        if (!resourcePath) continue;
        grants.set(`resource:${resourcePath}`, Boolean(item.can_view ?? item.allowed ?? true));

        const actions = item.actions || {};
        if (Array.isArray(actions)) {
          for (const action of actions) {
            grants.set(
              `action:${resourcePath}:${normalize(action.action_key || action.key || '')}`,
              Boolean(action.allowed ?? action.can_use ?? true),
            );
          }
        } else {
          for (const [key, allowed] of Object.entries(actions)) {
            grants.set(`action:${resourcePath}:${normalize(key)}`, Boolean(allowed));
          }
        }
      }
    } else if (resourcePermissions && typeof resourcePermissions === 'object') {
      for (const [resourcePathRaw, entry] of Object.entries(resourcePermissions as Record<string, any>)) {
        const resourcePath = normalize(resourcePathRaw);
        grants.set(`resource:${resourcePath}`, Boolean(entry?.access));
        for (const [key, allowed] of Object.entries(entry?.actions || {})) {
          grants.set(`action:${resourcePath}:${normalize(key)}`, Boolean(allowed));
        }
      }
    }
    return grants;
  }, [appSession]);

  const canAccess = useCallback(
    (resourcePath: string): boolean => {
      if (isSuperAdmin) return true;
      const path = normalize(resourcePath);
      if (!path) return false;

      const exact = runtimeGrants.get(`resource:${path}`);
      if (exact !== undefined) return exact;

      const parts = path.split('.');
      const screenKey = parts[0];
      if (!legacyCanScreen(screenKey)) return false;
      if (parts.length === 1) return true;

      const tabKey = parts[1];
      if (legacyCanTab(screenKey, tabKey)) return true;

      // Legacy backend has only screen + tab levels. Nested children inherit tab access.
      return parts.length > 2 && legacyCanTab(screenKey, tabKey);
    },
    [isSuperAdmin, legacyCanScreen, legacyCanTab, runtimeGrants],
  );

  const canDo = useCallback(
    (resourcePath: string, actionKey: string): boolean => {
      if (isSuperAdmin) return true;
      const path = normalize(resourcePath);
      const action = normalize(actionKey);
      if (!canAccess(path)) return false;

      const exact = runtimeGrants.get(`action:${path}:${action}`);
      if (exact !== undefined) return exact;

      // Walk upward so a parent action can cover a nested dialog/card until backend
      // starts returning fully nested resource grants.
      const parts = path.split('.');
      while (parts.length > 0) {
        const parentPath = parts.join('.');
        const parentGrant = runtimeGrants.get(`action:${parentPath}:${action}`);
        if (parentGrant !== undefined) return parentGrant;
        parts.pop();
      }

      return legacyCanAction(screenFromPath(path), action);
    },
    [canAccess, isSuperAdmin, legacyCanAction, runtimeGrants],
  );

  const requireAccess = useCallback(
    (resourcePath: string, message?: string) => {
      const allowed = canAccess(resourcePath);
      if (!allowed) Alert.alert('Access denied', message || 'You do not have permission to open this section.');
      return allowed;
    },
    [canAccess],
  );

  const requireAction = useCallback(
    (resourcePath: string, actionKey: string, message?: string) => {
      const allowed = canDo(resourcePath, actionKey);
      if (!allowed) Alert.alert('Permission required', message || 'You do not have permission for this action.');
      return allowed;
    },
    [canDo],
  );

  const getAllowedChildren = useCallback(
    (parentPath: string) => {
      const normalizedParent = normalize(parentPath);
      return flattenPermissionRegistry()
        .filter((entry) => {
          const path = normalize(entry.resourcePath);
          const parent = path.split('.').slice(0, -1).join('.');
          return parent === normalizedParent && canAccess(path);
        })
        .map((entry) => entry.resourcePath);
    },
    [canAccess],
  );

  const value = useMemo<PermissionContextValue>(
    () => ({ canAccess, canDo, requireAccess, requireAction, getAllowedChildren, isSuperAdmin }),
    [canAccess, canDo, requireAccess, requireAction, getAllowedChildren, isSuperAdmin],
  );

  return <PermissionContext.Provider value={value}>{children}</PermissionContext.Provider>;
}

export function usePermissionContext(): PermissionContextValue {
  const value = useContext(PermissionContext);
  if (!value) throw new Error('usePermission must be used inside PermissionProvider');
  return value;
}
