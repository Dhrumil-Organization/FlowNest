import AsyncStorage from '@/common/utils/compatibleStorage';

// ─────────────────────────────────────────────────────────────
// SINGLE SOURCE OF TRUTH for the ERP API host (Legacy + NEW ERP).
//
// IMPORTANT: `src/common/API/dynamicAPI.ts` now re-exports THIS file.
// Earlier there were two separate copies (root `common/` and
// `src/common/`), so a property switch updated one copy while the NEW
// ERP production screens (which import `../../common/API/dynamicAPI`
// from inside `src/`) kept the other copy's stale host. That is why
// Rayons users were still hitting apig until a full page refresh.
//
//   sudamo_knits -> https://apig.tms-webapp.com
//   rayons       -> https://apiy.tms-webapp.com
// ─────────────────────────────────────────────────────────────
export type ErpProperty = 'sudamo_knits' | 'rayons';

const IS_LOCAL = false; 
const LOCAL_API_URL = 'http://192.168.13.100:4017';

const LIVE_API_URLS: Record<ErpProperty, string> = {
  sudamo_knits: 'https://apig.tms-webapp.com',
  rayons: 'https://apiy.tms-webapp.com',
};

export const ERP_API_URLS = LIVE_API_URLS;

export let API: string = IS_LOCAL ? LOCAL_API_URL : LIVE_API_URLS.sudamo_knits;
export let PRINTSTICKER: string = IS_LOCAL
  ? 'http://192.168.13.100:4017/api/print-grey-in-stock'
  : 'https://apig.tms-webapp.com/api/print-grey-in-stock';
export let PRINTERSLISTAPI: string = IS_LOCAL
  ? 'http://192.168.13.130:4000/printers'
  : 'http://192.168.0.6:4000/printers';

// Property the in-memory API host currently points at (null = not yet
// initialised from storage in this JS session).
let CURRENT_PROPERTY: ErpProperty | null = null;

// ── Change notifications ─────────────────────────────────────
// Anything that caches the host/token (NEW ERP client, useErpSession hook,
// production screens) subscribes here so a property switch is picked up
// immediately on mobile AND web without a refresh.
export type ErpContextListener = (ctx: { property: ErpProperty; api: string }) => void;
const listeners = new Set<ErpContextListener>();

export function subscribeErpContext(listener: ErpContextListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Manually broadcast (e.g. after a new access_token was saved). */
export function notifyErpContextChanged() {
  const property = CURRENT_PROPERTY ?? 'sudamo_knits';
  listeners.forEach((listener) => {
    try {
      listener({ property, api: API });
    } catch (e) {
      console.log('ErpContext listener failed', e);
    }
  });
}

export function normalizeErpProperty(property: string | null | undefined): ErpProperty {
  return property === 'rayons' ? 'rayons' : 'sudamo_knits';
}

export function getCurrentErpProperty(): ErpProperty | null {
  return CURRENT_PROPERTY;
}

/** Synchronous read of the current host (always the live value). */
export function getApiBaseUrl(): string {
  return API;
}

export function setDynamicApiBaseUrl(property: ErpProperty) {
  const next = IS_LOCAL ? LOCAL_API_URL : LIVE_API_URLS[property];
  const changed = next !== API || property !== CURRENT_PROPERTY;
  API = next;
  CURRENT_PROPERTY = property;
  // Sticker API historically exists only on the Sudamo server.
  PRINTSTICKER = IS_LOCAL
    ? 'http://192.168.13.100:4017/api/print-grey-in-stock'
    : 'https://apig.tms-webapp.com/api/print-grey-in-stock';
  if (changed) notifyErpContextChanged();
  return API;
}

export function resolveDynamicApiBaseUrl(property: string | null | undefined) {
  if (IS_LOCAL) return LOCAL_API_URL;
  return LIVE_API_URLS[normalizeErpProperty(property)];
}

// Backward-compatible initializer used by old screens. It remains async because
// the original project resolved the selected property from AsyncStorage.
export const initAPI = async (propertyOrUrl?: ErpProperty | string | null): Promise<string> => {
  let value = propertyOrUrl;

  if (!value) {
    const selectedProperty = await AsyncStorage.getItem('selected_property');
    value = normalizeErpProperty(selectedProperty);
  }

  if (value === 'rayons' || value === 'sudamo_knits') {
    setDynamicApiBaseUrl(value);
  } else {
    API = String(value).replace(/\/$/, '');
    notifyErpContextChanged();
  }

  console.log('✅ initAPI done | selected_property:', value, '| API:', API);
  return API;
};

export const initAPIForSticker = async (): Promise<string> => {
  // Preserve the existing printer/sticker behavior: sticker printing uses the
  // Sudamo print endpoint even when the ERP property is Rayons.
  if (IS_LOCAL) {
    PRINTSTICKER = 'http://192.168.13.100:4017/api/print-grey-in-stock';
  } else {
    PRINTSTICKER = 'https://apig.tms-webapp.com/api/print-grey-in-stock';
  }
  return PRINTSTICKER;
};

export const initAPIForPrinterList = async (): Promise<string> => {
  PRINTERSLISTAPI = IS_LOCAL
    ? 'http://192.168.13.130:4000/printers'
    : 'http://192.168.0.6:4000/printers';
  return PRINTERSLISTAPI;
};
