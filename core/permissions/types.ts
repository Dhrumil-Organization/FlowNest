export type PermissionDecision = 'allow' | 'deny' | 'inherit';

export type PermissionResourceType =
  | 'area'
  | 'module'
  | 'screen'
  | 'tab'
  | 'section'
  | 'dialog'
  | 'drawer'
  | 'grid'
  | 'card'
  | 'report'
  | 'widget'
  | 'workflow'
  | 'action-group';

export type PermissionActionDefinition = {
  key: string;
  name: string;
  dangerous?: boolean;
  description?: string;
  displayOrder?: number;
};

export type PermissionResourceDefinition = {
  key: string;
  name: string;
  type: PermissionResourceType;
  description?: string;
  displayOrder?: number;
  actions?: PermissionActionDefinition[];
  children?: PermissionResourceDefinition[];
};

export type PermissionAreaDefinition = {
  key: string;
  name: string;
  icon?: string;
  description?: string;
  displayOrder?: number;
  resources: PermissionResourceDefinition[];
};

export type FlattenedPermissionResource = {
  areaKey: string;
  areaName: string;
  resourcePath: string;
  parentPath: string | null;
  depth: number;
  resource: PermissionResourceDefinition;
};

export type PermissionRegistrySyncPayload = {
  client_version: string;
  areas: PermissionAreaDefinition[];
};

export type RuntimePermissionGrant = {
  resourcePath: string;
  actionKey?: string;
  allowed: boolean;
};

export type PermissionCheck = {
  resource: string;
  action?: string;
};
