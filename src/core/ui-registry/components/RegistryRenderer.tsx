import React from 'react';
import { Text, View } from 'react-native';
import { usePermission } from '../../permissions';
import type { UiNodeKind, UiRenderMap } from '../types';
import { getUiNodes } from '../uiRegistry';

type RegistryItemBoundaryProps = {
  nodeId: string;
  children: React.ReactNode;
};

type RegistryItemBoundaryState = {
  failed: boolean;
};

class RegistryItemBoundary extends React.PureComponent<RegistryItemBoundaryProps, RegistryItemBoundaryState> {
  state: RegistryItemBoundaryState = { failed: false };

  static getDerivedStateFromError(): RegistryItemBoundaryState {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.error(`[UI Registry] Renderer failed for ${this.props.nodeId}`, error);
  }

  render() {
    if (this.state.failed) {
      return (
        <View style={{ paddingVertical: 12 }}>
          <Text style={{ textAlign: 'center', opacity: 0.65 }}>
            This dashboard item could not be displayed.
          </Text>
        </View>
      );
    }
    return this.props.children;
  }
}

export function RegistryRenderer<TContext>({
  kind,
  parentId,
  context,
  renderers,
  empty = null,
}: {
  kind: UiNodeKind;
  parentId?: string;
  context: TContext;
  renderers: UiRenderMap<TContext>;
  empty?: React.ReactNode;
}) {
  const { canAccess, canDo } = usePermission();

  const visible = getUiNodes(kind, parentId).filter((node) => {
    const aliases = Array.isArray(node.metadata?.permissionAliases)
      ? (node.metadata?.permissionAliases as string[])
      : [];
    const monthlysalestarget = Array.isArray(node.metadata?.permissionMonthlysalestarget)
      ? (node.metadata?.permissionMonthlysalestarget as string[])
      : [];
    const anyPermissions = Array.isArray(node.metadata?.anyPermissions)
      ? (node.metadata?.anyPermissions as string[])
      : [];

    const hasResourceAccess = (permission: string) =>
      node.action && node.action !== 'view'
        ? canDo(permission, node.action)
        : canAccess(permission);

    if (anyPermissions.length > 0) {
      return anyPermissions.some((permission) => hasResourceAccess(permission));
    }

    return hasResourceAccess(node.permission) || aliases.some((permission) => hasResourceAccess(permission) || monthlysalestarget.some((permission) => hasResourceAccess(permission)));
  });

  if (visible.length === 0) return <>{empty}</>;

  return (
    <View>
      {visible.map((node) => {
        const render = renderers[node.id];
        if (!render) {
          console.warn(`[UI Registry] Missing renderer for ${node.id}`);
          return null;
        }

        return (
          <RegistryItemBoundary key={node.id} nodeId={node.id}>
            {render(context)}
          </RegistryItemBoundary>
        );
      })}
    </View>
  );
}
