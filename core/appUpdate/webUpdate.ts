// FILE: src/core/appUpdate/webUpdate.ts
// WEB: detect that a newer build was deployed on the server.
//
// How it works
//   • scripts/build-web.js bakes a build id + app.json version into the bundle
//     (EXPO_PUBLIC_WEB_BUILD_ID) and writes dist/version.json with the same values.
//   • The running page polls /version.json (no cache). If the server has a different
//     build id, or a higher version, a banner asks the user to refresh.
//   • Refresh = clear SW caches (if any) + reload index.html with a cache-busting
//     query (?_v=<buildId>) so the browser cannot serve the old index.html again.
import { compareVersions, fetchJsonNoCache, getBundleVersion, WEB_BUILD_ID } from './version';

export type WebVersionInfo = { version: string; buildId: string; builtAt?: string; notes?: string };

const RELOAD_PARAM = '_v';

export function webVersionUrl(): string {
  return '/version.json';
}

/** Returns the server info if the server build differs from the one running, else null. */
export async function checkWebUpdate(): Promise<WebVersionInfo | null> {
  if (typeof window === 'undefined') return null;
  const remote = await fetchJsonNoCache<WebVersionInfo>(webVersionUrl());
  if (!remote || !remote.version) return null;

  const localVersion = getBundleVersion();
  const versionUp = compareVersions(remote.version, localVersion) > 0;
  // Same version but re-deployed build (only when this bundle knows its own build id).
  const buildChanged = !!WEB_BUILD_ID && !!remote.buildId && remote.buildId !== WEB_BUILD_ID
    && compareVersions(remote.version, localVersion) >= 0;

  return versionUp || buildChanged ? remote : null;
}

/** Hard refresh onto the newest build. */
export async function reloadToLatest(info?: WebVersionInfo | null) {
  if (typeof window === 'undefined') return;
  try {
    const nav: any = (window as any).navigator;
    if (nav?.serviceWorker?.getRegistrations) {
      const regs = await nav.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r: any) => r.update?.().catch(() => undefined)));
    }
    const cachesApi: any = (window as any).caches;
    if (cachesApi?.keys) {
      const keys: string[] = await cachesApi.keys();
      await Promise.all(keys.map((k) => cachesApi.delete(k)));
    }
  } catch {
    // ignore — reload anyway
  }
  const url = new URL(window.location.href);
  url.searchParams.set(RELOAD_PARAM, info?.buildId || String(Date.now()));
  window.location.replace(url.toString());
}

/** Remove the ?_v= cache-buster from the address bar after the fresh load. */
export function cleanReloadParam() {
  if (typeof window === 'undefined') return;
  try {
    const url = new URL(window.location.href);
    if (!url.searchParams.has(RELOAD_PARAM)) return;
    url.searchParams.delete(RELOAD_PARAM);
    window.history.replaceState(window.history.state, '', url.pathname + (url.search || '') + url.hash);
  } catch {
    // ignore
  }
}
