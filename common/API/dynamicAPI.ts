import AsyncStorage from '@react-native-async-storage/async-storage';

// Shared live ERP API base. All legacy modules import this value so the
// common property switch changes the host for every subsequent call.
export type ErpProperty = 'sudamo_knits' | 'rayons';

const IS_LOCAL = false;

const LIVE_API_URLS: Record<ErpProperty, string> = {
  sudamo_knits: 'https://apig.tms-webapp.com',
  rayons: 'https://apiy.tms-webapp.com',
};

export const ERP_API_URLS = LIVE_API_URLS;

export let API: string = IS_LOCAL ? 'http://192.168.13.100:4017' : LIVE_API_URLS.sudamo_knits;
export let PRINTSTICKER: string = IS_LOCAL
  ? 'http://192.168.13.100:4017/api/print-grey-in-stock'
  : 'https://apig.tms-webapp.com/api/print-grey-in-stock';
export let PRINTERSLISTAPI: string = IS_LOCAL
  ? 'http://192.168.13.130:4000/printers'
  : 'http://192.168.0.6:4000/printers';

export function setDynamicApiBaseUrl(property: ErpProperty) {
  API = IS_LOCAL ? 'http://192.168.13.100:4017' : LIVE_API_URLS[property];
  // Sticker API historically exists only on the Sudamo server.
  PRINTSTICKER = IS_LOCAL
    ? 'http://192.168.13.100:4017/api/print-grey-in-stock'
    : 'https://apig.tms-webapp.com/api/print-grey-in-stock';
  return API;
}

export function resolveDynamicApiBaseUrl(property: string | null | undefined) {
  if (IS_LOCAL) return 'http://192.168.13.100:4017';
  return property === 'rayons' ? LIVE_API_URLS.rayons : LIVE_API_URLS.sudamo_knits;
}

// Backward-compatible initializer used by old screens. It remains async because
// the original project resolved the selected property from AsyncStorage.
export const initAPI = async (propertyOrUrl?: ErpProperty | string | null): Promise<string> => {
  let value = propertyOrUrl;

  if (!value) {
    const selectedProperty = await AsyncStorage.getItem('selected_property');
    value = selectedProperty === 'rayons' ? 'rayons' : 'sudamo_knits';
  }

  if (value === 'rayons' || value === 'sudamo_knits') {
    setDynamicApiBaseUrl(value);
  } else {
    API = String(value).replace(/\/$/, '');
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
