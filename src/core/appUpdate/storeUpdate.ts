// FILE: src/core/appUpdate/storeUpdate.ts
// ANDROID / iOS: detect that a newer version is live on Play Store / App Store.
//
// Sources
//   • public/app-update.json (deployed with the web build, URL = APP_UPDATE_CONFIG_URL):
//       { "android": { "latestVersion", "minVersion", "storeUrl", "message" },
//         "ios":     { "latestVersion", "minVersion", "storeUrl", "message" } }
//     You bump latestVersion ONLY after the store release is live, so users are never
//     sent to the store before the update is there.
//   • iOS additionally asks Apple directly (iTunes lookup by bundle id). Once Apple has
//     published the new version, iOS users get the prompt even if the JSON was not bumped,
//     and they are never prompted for a version Apple has not published yet.
//   • Installed version = expo-application nativeApplicationVersion (real binary version).
//
// Result
//   'force'    — installed < minVersion  -> blocking popup (only "Update now")
//   'optional' — installed < latest      -> popup with "Update now" / "Later"
import { Linking, Platform } from 'react-native';
import {
  APP_UPDATE_CONFIG_URL, compareVersions, fetchJsonNoCache, getApplicationId, getInstalledVersion, isNewer,
} from './version';

export type PlatformUpdateConfig = {
  latestVersion?: string;
  minVersion?: string;
  storeUrl?: string;
  message?: string;
  enabled?: boolean;
};
export type AppUpdateConfig = { android?: PlatformUpdateConfig; ios?: PlatformUpdateConfig };

export type StoreUpdateResult = {
  kind: 'force' | 'optional';
  installedVersion: string;
  latestVersion: string;
  storeUrl: string;
  fallbackUrl: string;
  message?: string;
};

type ItunesLookup = { version: string; trackViewUrl?: string; trackId?: number; releaseNotes?: string } | null;

async function itunesLookup(bundleId: string): Promise<ItunesLookup> {
  // country=in first (app is published for India), then the default store.
  for (const country of ['in', '']) {
    const q = `https://itunes.apple.com/lookup?bundleId=${encodeURIComponent(bundleId)}${country ? `&country=${country}` : ''}`;
    const data = await fetchJsonNoCache<any>(q);
    const r = data?.results?.[0];
    if (r?.version) return { version: r.version, trackViewUrl: r.trackViewUrl, trackId: r.trackId, releaseNotes: r.releaseNotes };
  }
  return null;
}

export async function checkStoreUpdate(): Promise<StoreUpdateResult | null> {
  if (Platform.OS !== 'android' && Platform.OS !== 'ios') return null;

  const installed = getInstalledVersion();
  const appId = getApplicationId();
  const cfgAll = await fetchJsonNoCache<AppUpdateConfig>(APP_UPDATE_CONFIG_URL);
  const cfg: PlatformUpdateConfig = (Platform.OS === 'ios' ? cfgAll?.ios : cfgAll?.android) || {};
  if (cfg.enabled === false) return null;

  let latest = cfg.latestVersion || '';
  let storeUrl = cfg.storeUrl || '';
  let fallbackUrl = '';
  let message = cfg.message;

  if (Platform.OS === 'android') {
    storeUrl = storeUrl || `market://details?id=${appId}`;
    fallbackUrl = `https://play.google.com/store/apps/details?id=${appId}`;
  } else {
    const apple = await itunesLookup(appId);
    if (apple?.version) {
      // Apple is the truth for "what is live": never prompt beyond it.
      latest = apple.version;
      if (!storeUrl && apple.trackId) storeUrl = `itms-apps://apps.apple.com/app/id${apple.trackId}`;
      fallbackUrl = apple.trackViewUrl || (apple.trackId ? `https://apps.apple.com/app/id${apple.trackId}` : '');
    }
    if (!storeUrl) storeUrl = fallbackUrl;
    if (!fallbackUrl) fallbackUrl = storeUrl;
  }

  const minVersion = cfg.minVersion || '';
  // Force only makes sense when the store actually has a version >= minVersion.
  const forceable = !!minVersion && compareVersions(installed, minVersion) < 0
    && (!latest || compareVersions(latest, minVersion) >= 0);

  if (forceable) {
    return { kind: 'force', installedVersion: installed, latestVersion: latest || minVersion, storeUrl, fallbackUrl, message };
  }
  if (isNewer(latest, installed) && storeUrl) {
    return { kind: 'optional', installedVersion: installed, latestVersion: latest, storeUrl, fallbackUrl, message };
  }
  return null;
}

/** Open Play Store / App Store app, fall back to the https store page. */
export async function openStore(r: Pick<StoreUpdateResult, 'storeUrl' | 'fallbackUrl'>) {
  const tryOpen = async (u?: string) => {
    if (!u) return false;
    try {
      await Linking.openURL(u);
      return true;
    } catch {
      return false;
    }
  };
  if (await tryOpen(r.storeUrl)) return;
  await tryOpen(r.fallbackUrl);
}
