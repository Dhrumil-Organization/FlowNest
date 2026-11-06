// ─────────────────────────────────────────────────────────────
// FILE: src/features/globalSearch/useErpSearchIndex.ts
// The ERP search index of the LOGGED-IN user, for the CURRENT property.
//
//   all screens / tabs / actions (registries)  ──►  filterByRights(canAccess, canDo)
//
// canAccess / canDo come from the PermissionProvider, which reads the grants of
// the property the user is logged in to. A property switch (Sudamo ↔ Rayons)
// logs in again → new grants → new canAccess → this index is rebuilt, so the
// search only ever shows the screens of the property you are on.
// Mill Hub resources (mill.*) are never part of this index.
// ─────────────────────────────────────────────────────────────
import { getCurrentErpProperty } from '@/common/API/dynamicAPI';
import '@/src/core/ui-registry';
import { getUiNodes } from '@/src/core/ui-registry';
import { usePermission } from '@/src/core/permissions';
import { flattenPermissionRegistry } from '@/src/registry';
import { useAppSessionStore } from '@/src/stores/AppSessionStore';
import { useMemo } from 'react';
import { buildErpIndex, filterByRights, type IndexUiNode } from './erpIndex';
import { GENERATED_ROUTES } from './generated/routes.generated';
import { SCREEN_HELP } from './helpContent';
import { prepareIndex, type PreparedIndex } from './searchEngine';
import type { SearchEntry } from './types';

export const isMillResource = (path: string) => /^mill(\.|$)/i.test(String(path || ''));

let cachedAll: SearchEntry[] | null = null;
/** Everything the ERP has (rights NOT applied). Built once — the registries are static. */
export function getAllErpEntries(): SearchEntry[] {
  if (!cachedAll) {
    cachedAll = buildErpIndex({
      uiNodes: getUiNodes() as unknown as IndexUiNode[],
      resources: flattenPermissionRegistry(),
      generatedRoutes: GENERATED_ROUTES,
      help: SCREEN_HELP,
      isExcluded: isMillResource,
    });
  }
  return cachedAll;
}

const PROPERTY_LABEL: Record<string, string> = { sudamo_knits: 'Sudamo / Knits', rayons: 'Rayons' };

export function useErpSearchIndex(): {
  ready: boolean;
  index: PreparedIndex;
  unfiltered: SearchEntry[];
  property: string;
  propertyLabel: string;
  ownerKey: { property: string; userId: unknown };
} {
  const { canAccess, canDo } = usePermission();
  const hydrated = useAppSessionStore((s) => s.hydrated);
  const appSession = useAppSessionStore((s) => s.appSession);
  const sessionEpoch = useAppSessionStore((s) => s.sessionEpoch);
  const rawLoginResponse = useAppSessionStore((s) => s.rawLoginResponse);
  const user = useAppSessionStore((s) => s.user);
  const ready = hydrated && Boolean(appSession);

  const property = String(rawLoginResponse?.__erp_property || getCurrentErpProperty() || 'default');
  const userId = rawLoginResponse?.user?.id ?? user?.id ?? null;
  const unfiltered = getAllErpEntries();

  const index = useMemo(
    () => prepareIndex(ready ? filterByRights(unfiltered, { canAccess, canDo }) : []),
    // sessionEpoch: a fresh login / property switch always rebuilds
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ready, canAccess, canDo, unfiltered, sessionEpoch],
  );

  return {
    ready,
    index,
    unfiltered,
    property,
    propertyLabel: PROPERTY_LABEL[property] || 'ERP',
    ownerKey: { property, userId },
  };
}
