import AsyncStorage from '@/common/utils/compatibleStorage';

import { AppAccessAPI, unwrapAccessResponse } from '../../api/accessControl';
import { createPermissionRegistrySyncPayload } from '../../registry';

const LAST_HASH_KEY = 'app_registry_v2_last_synced_hash';
const LAST_VERSION_KEY = 'app_registry_v2_last_synced_version';
let inFlight: Promise<RegistrySyncResult> | null = null;

export type RegistrySyncResult = {
  attempted: boolean;
  synced: boolean;
  reason: 'not-admin' | 'already-current' | 'synced' | 'failed';
  message?: string;
};

function isPlatformAdmin(loginResponse: any): boolean {
  const user = loginResponse?.user || {};
  if (Number(user?.id || 0) === 1) return true;
  if (Number(user?.is_superadmin || loginResponse?.issuperadmin || 0) !== 0) return true;
  const roles = Array.isArray(loginResponse?.role1) ? loginResponse.role1 : [];
  return roles.some((role: any) => {
    const value = String(role?.name ?? role?.role_name ?? role ?? '')
      .toLowerCase()
      .replace(/[ _-]/g, '');
    return ['owner', 'superadmin', 'administrator'].includes(value);
  });
}

async function run(loginResponse: any, clientVersion: string): Promise<RegistrySyncResult> {
  if (!isPlatformAdmin(loginResponse)) {
    return { attempted: false, synced: false, reason: 'not-admin' };
  }

  const payload = createPermissionRegistrySyncPayload(clientVersion);
  const [localHash, localVersion] = await Promise.all([
    AsyncStorage.getItem(LAST_HASH_KEY),
    AsyncStorage.getItem(LAST_VERSION_KEY),
  ]);

  try {
    const statusResult = unwrapAccessResponse<any>(await AppAccessAPI.registryStatus());
    const serverHash = String(statusResult?.registry_hash ?? '');
    const serverVersion = String(statusResult?.client_version ?? '');

    if (
      serverHash === payload.registry_hash &&
      serverVersion === payload.client_version &&
      localHash === payload.registry_hash &&
      localVersion === payload.client_version
    ) {
      return { attempted: true, synced: false, reason: 'already-current' };
    }

    await AppAccessAPI.syncRegistry(payload);
    await Promise.all([
      AsyncStorage.setItem(LAST_HASH_KEY, payload.registry_hash),
      AsyncStorage.setItem(LAST_VERSION_KEY, payload.client_version),
    ]);
    return { attempted: true, synced: true, reason: 'synced' };
  } catch (error: any) {
    return {
      attempted: true,
      synced: false,
      reason: 'failed',
      message: error?.message || 'Registry synchronization failed.',
    };
  }
}

/**
 * Non-blocking, deduplicated auto-sync. Call after access_token is stored.
 * A failed registry sync never invalidates login.
 */
export function autoSyncPermissionRegistry(
  loginResponse: any,
  clientVersion = 'sudamo-mobile-registry-v2',
): Promise<RegistrySyncResult> {
  if (!inFlight) {
    inFlight = run(loginResponse, clientVersion).finally(() => {
      inFlight = null;
    });
  }
  return inFlight;
}
