import type React from 'react';

export type UiNodeKind =
  | 'navigation'
  | 'screen'
  | 'dashboard-card'
  | 'tab'
  | 'section'
  | 'button'
  | 'dialog';

export type UiRegistryNode = {
  id: string;
  kind: UiNodeKind;
  title: string;
  permission: string;
  action?: string;
  order?: number;
  parentId?: string;
  route?: string;
  icon?: string;
  enabled?: boolean;
  metadata?: Record<string, unknown>;
};

export type UiRenderMap<TContext = unknown> = Record<
  string,
  (context: TContext) => React.ReactNode
>;
