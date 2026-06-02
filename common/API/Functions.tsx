// common/API/Functions.ts

import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import RNFS from 'react-native-fs';
import {
  initDatabase,
  saveLargeData,
  readPrptypeCache,
  getAccountByCode,
  getBankByName,
  getPrptypeIndex,
  clearOldChunks,
} from './DatabaseManager';
import { API } from './dynamicAPI';

let cancelToken: any;

export const fetchPropertyGroupDataDCR = async (token: string) => {
  try {
    if (cancelToken?.cancel) cancelToken.cancel();
    cancelToken = axios.CancelToken.source();

    let params = null;
    const response = await axios.get(
      `${API}/api/get_criterion?fetch=prptype&txntype=mob_daily_collection_report`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/javascript',
          Accept: 'application/json',
        },
        params,
      },
    );


    if (response.data.success && response.data.response.data.length > 0) {
      const propertyGroupData = response.data.response.data;

      // 3. Response ko cache me store karo

      return propertyGroupData;
    }

    return [];
  } catch (error) {
    if (!axios.isCancel(error)) {
      console.log('fetchpropertyGroupData error', error);
    }
    return [];
  }
};
export const fetchPropertyDataDCR = async (token: string, prptype: string) => {
  try {
    if (cancelToken?.cancel) cancelToken.cancel();
    cancelToken = axios.CancelToken.source();

    let params = null;
    const response = await axios.get(
      `${API}/api/get_criterion?prptype=${prptype}&txntype=mob_daily_collection_report&fetch=prp`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/javascript',
          Accept: 'application/json',
        },
        params,
      },
    );


    if (response.data.success && response.data.response.data.length > 0) {
      const propertyGroupData = response.data.response.data;

      // 3. Response ko cache me store karo

      return propertyGroupData;
    }

    return [];
  } catch (error) {
    if (!axios.isCancel(error)) {
      console.log('fetchpropertyGroupData error', error);
    }
    return [];
  }
};

//

export const fetchPropertyData = async (token: string) => {
  try {
    // 1. Pehle cache check karo
    const cached = await AsyncStorage.getItem('get_property');

    // 2. Cache nahi mila toh API call
    if (cancelToken?.cancel) cancelToken.cancel();
    cancelToken = axios.CancelToken.source();

    let params = null;
    const response = await axios.get(
      `${API}/api/getproperty`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/javascript',
          Accept: 'application/json',
        },
        params,
      },
    );

    console.log("response", response, params)

    if (response.data.success && response.data.response.data.length > 0) {
      const propertyData = response.data.response.data;

      // 3. Response ko cache me store karo
      await AsyncStorage.setItem('get_property', JSON.stringify(propertyData));

      return propertyData;
    }

    return [];
  } catch (error) {
    if (!axios.isCancel(error)) {
      console.log('fetchPropertyData error', error);
    }
    return [];
  }
};

export const fetchCurrentYearData = async (token: string) => {
  try {
    // 1. Pehle cache check karo
    const cached = await AsyncStorage.getItem('current_year');

    // 2. Cache nahi mila toh API call
    if (cancelToken?.cancel) cancelToken.cancel();
    cancelToken = axios.CancelToken.source();

    let params = null;
    const response = await axios.get(
      `${API}/api/getcurrentyear`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/javascript',
          Accept: 'application/json',
        },
        params,
      },
    );

    if (response) {
      const yearData = response;

      // 3. Response ko cache me store karo
      await AsyncStorage.setItem('current_year', JSON.stringify(yearData));

      return yearData;
    }

    return null;
  } catch (error) {
    if (!axios.isCancel(error)) {
      console.log('fetchYearData error', error);
    }
    return null;
  }
};

// Add this at the top of your Functions.ts
const MAX_CHUNK_SIZE = 500; // Reduced from 1000 to be more conservative
const FILE_NAME_LENGTH_LIMIT = 200; // Android file name length limit

// Optimized saveLargeData with memory-safe chunking
// Replace your existing saveLargeData with this:
export { saveLargeData } from './DatabaseManager';

// Define paths (no await here)
const PRPTYPE_FOLDER = `${RNFS.DocumentDirectoryPath}/prptypes/`;
const INDEX_FILE = `${PRPTYPE_FOLDER}index.json`;

// Initialize directory (call this function early in your app)

// Save data to file
export const saveToFile = async (prptype: string, data: CachedPrptype) => {
  const filePath = `${PRPTYPE_FOLDER}${prptype}.json`;
  await RNFS.writeFile(filePath, JSON.stringify(data), 'utf8');
};

// Read data from file
export const readFromFile = async (
  prptype: string,
): Promise<CachedPrptype | null> => {
  const filePath = `${PRPTYPE_FOLDER}${prptype}.json`;
  if (await RNFS.exists(filePath)) {
    const fileContent = await RNFS.readFile(filePath, 'utf8');
    return JSON.parse(fileContent) as CachedPrptype;
  }
  return null;
};

// Save index to file
export const saveIndexToFile = async (prptypes: string[]) => {
  await RNFS.writeFile(INDEX_FILE, JSON.stringify(prptypes), 'utf8');
};

// Read index from file
export const readIndexFromFile = async (): Promise<string[]> => {
  if (await RNFS.exists(INDEX_FILE)) {
    const fileContent = await RNFS.readFile(INDEX_FILE, 'utf8');
    return JSON.parse(fileContent) as string[];
  }
  return [];
};

// Updated fetchMasterSyncPartyDataPerPrptypeCache in Functions.ts
export const fetchMasterSyncPartyDataPerPrptypeCache = async (
  token: string,
  getMasterSyncData: any[],
) => {
  if (cancelToken?.cancel) {
    cancelToken.cancel('New master sync requested - cancelling previous');
  }
  cancelToken = axios.CancelToken.source();

  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
    'x-platform': 'mob',
  };

  if (!Array.isArray(getMasterSyncData) || getMasterSyncData.length === 0) {
    console.log('⚪ No master sync items found.');
    return;
  }

  // Process each prptype with optimized batching
  for (let i = 0; i < getMasterSyncData.length; i++) {
    const item = getMasterSyncData[i];
    const prptypeRaw = (item?.prptype ?? item?.PrpType ?? '').toString();
    const prptype = normalizePrptype(prptypeRaw);
    const prpcode = item?.prpcode ?? item?.PrpCode ?? '';
    const yearno = item?.yearno ?? item?.YearNo ?? '';
    const apiBase = item?.api ?? '';

    if (!prptype) {
      console.warn('🔶 Skipping invalid item (empty prptype):', item);
      continue;
    }

    const base = (apiBase || '').replace(/\/+$/, '');
    const accountUrl = `${base}/mobaccountbasic`;
    const bankUrl = `${base}/getmobbanklist`;
    const branchUrl = `${base}/getmobbranchlist`;

    try {
      // Clear old data first
      await clearOldChunks(prptype);

      // Prepare payloads
      const accPayload = {
        prpcode,
        yearno,
        prptype,
        strcode: '0',
        txntype: 'sales_order',
        partytype: 'p',
        type: 's',
        page: 1,
        limit: 20,
        search: '',
        isceo: 0,
        partype: 0,
        grntype: '',
        fetch: '',
        acccode: '',
        billdate: '',
        strtype: '',
        isfaint: '',
        user_id: 1,
      };

      const bankPayload = {
        prptype,
        prpcode,
        yearno,
        txntype: 'receipt',
        user_id: 1,
      };

      // Fetch data with parallel requests
      const [accountRes, bankRes, branchRes] = await Promise.all([
        axios.get(accountUrl, {
          headers,
          params: accPayload,
          cancelToken: cancelToken.token,
        }),
        axios.get(bankUrl, {
          headers,
          params: bankPayload,
          cancelToken: cancelToken.token,
        }),
        axios.get(branchUrl, {
          headers,
          params: bankPayload,
          cancelToken: cancelToken.token,
        }),
      ]);

      // Process results
      const results: CachedPrptype = {
        prptype,
        prpcode,
        yearno,
        account: accountRes.data?.success ? accountRes.data.response?.data : [],
        banks: bankRes.data?.success ? bankRes.data.response?.data : [],
        branches: branchRes.data?.success ? branchRes.data.response?.data : [],
        lastUpdated: new Date().toISOString(),
      };

      // Save to database
      if (results.account || results.banks || results.branches) {
        await saveLargeData(prptype, results);
        console.log(`✅ Completed sync for ${prptype}`);
      } else {
        console.warn(`⚠️ No data saved for ${prptype}`);
      }
    } catch (err) {
      console.error(`❌ Failed to process ${prptype}:`, err);
    } finally {
      // Yield to event loop between items
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  console.log('\n🎉 FULL MASTER SYNC COMPLETED');
};

/* ---------- config ---------- */
const ALL_PRPTYPES_KEY = 'master_sync_all_prptypes';
const PRPTYPE_KEY_PREFIX = 'master_sync_';
const PRPTYPE_PART_SUFFIX = ':part:'; // final keys: `${PRPTYPE_KEY_PREFIX}${key}${PRPTYPE_PART_SUFFIX}${i}`

/**
 * CHUNK SIZE: size of each part in characters (approx bytes).
 * CursorWindow issues kick in when a single value becomes very large (>~2MB).
 * We'll use 500k char chunks which is safe on most devices.
 */
const CHUNK_SIZE = 500_000;

export type CachedPrptype = {
  prptype: string;
  prpcode?: string;
  yearno?: string;
  account?: any | null;
  banks?: any[] | null;
  branches?: any[] | null;
  lastUpdated?: string | null;
  accountChunks?: number; // Number of account chunks
  banksChunks?: number; // Number of bank chunks
  branchesChunks?: number; // Number of branch chunks
};

/* normalize key */
export const normalizePrptype = (val?: any) => {
  if (val === undefined || val === null) return '';
  return String(val).trim();
};

export const writePrptypeCache = async (
  prptype: string,
  value: CachedPrptype,
) => {
  try {
    await saveToFile(prptype, value);
    console.log(`✅ Saved cache for "${prptype}" to file system`);
  } catch (err) {
    console.warn(`❌ Failed to save cache for ${prptype}:`, err);
  }
};

// Reassemble chunked data when reading
// Optimized read with progress tracking
// Memory-safe read function
// Replace your existing readPrptypeCache with this:
export { readPrptypeCache } from './DatabaseManager';

// Add these new functions:
export { getAccountByCode, getBankByName, getPrptypeIndex, clearOldChunks };

// Update your initFileSystem to also initialize the database:
export const initFileSystem = async () => {
  try {
    const fsInit = await RNFS.exists(PRPTYPE_FOLDER);
    if (!fsInit) {
      await RNFS.mkdir(PRPTYPE_FOLDER);
      console.log(`✅ Created directory: ${PRPTYPE_FOLDER}`);
    }

    const dbInit = await initDatabase();
    if (!dbInit) {
      console.warn('⚠️ Database initialization failed');
      return false;
    }

    return true;
  } catch (err) {
    console.warn(`❌ Failed to initialize file system and database:`, err);
    return false;
  }
};

// Process data in memory-safe batches
export const processInBatches = async <T,>(
  array: T[],
  batchSize: number,
  processBatch: (batch: T[]) => Promise<void>,
  options: {
    onProgress?: (processed: number, total: number) => void;
    delayMs?: number;
  } = {},
) => {
  const { onProgress, delayMs = 0 } = options;

  for (let i = 0; i < array.length; i += batchSize) {
    const batch = array.slice(i, i + batchSize);
    await processBatch(batch);

    if (onProgress) {
      onProgress(Math.min(i + batchSize, array.length), array.length);
    }

    // Yield to event loop
    if (delayMs > 0) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    } else {
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  }
};

export const addPrptypeToIndex = async (prptype: string) => {
  const key = normalizePrptype(prptype);
  if (!key) return;

  try {
    const index = await readIndexFromFile();
    if (!index.includes(key)) {
      index.push(key);
      await saveIndexToFile(index);
    }

  } catch (err) {
    console.warn('❌ Failed to update index:', err);
  }
};

export const loadAllPrptypeCaches = async (): Promise<
  Record<string, CachedPrptype | null>
> => {
  try {
    const { prptypes } = await getPrptypeIndex();
    const out: Record<string, CachedPrptype | null> = {};

    for (const p of prptypes) {
      const key = normalizePrptype(p);
      out[key] = await readPrptypeCache(key);
    }

    return out;
  } catch (err) {
    console.warn('❌ Failed to load all caches:', err);
    return {};
  }
};

/* ---------- summary + debug helpers ---------- */
export const getPrptypeSummary = async (
  prptype: string,
): Promise<{
  prptype: string;
  accountCount: number | null;
  banksCount: number | null;
  branchesCount: number | null;
  lastUpdated: string | null;
}> => {
  try {
    const cache = await readPrptypeCache(prptype);
    if (!cache) {
      return {
        prptype,
        accountCount: null,
        banksCount: null,
        branchesCount: null,
        lastUpdated: null,
      };
    }
    const accountCount = Array.isArray(cache.account)
      ? cache.account.length
      : cache.account
        ? null
        : 0;
    const banksCount = Array.isArray(cache.banks)
      ? cache.banks.length
      : cache.banks
        ? null
        : 0;
    const branchesCount = Array.isArray(cache.branches)
      ? cache.branches.length
      : cache.branches
        ? null
        : 0;
    return {
      prptype,
      accountCount,
      banksCount,
      branchesCount,
      lastUpdated: cache.lastUpdated ?? null,
    };
  } catch (err) {
    console.warn('getPrptypeSummary failed for', prptype, err);
    return {
      prptype,
      accountCount: null,
      banksCount: null,
      branchesCount: null,
      lastUpdated: null,
    };
  }
};

export const debugRawAsyncStorage = async () => {
  try {
    const keys = await AsyncStorage.getAllKeys();

    const masterKeys = keys.filter(
      k => k && (k === ALL_PRPTYPES_KEY || k.startsWith(PRPTYPE_KEY_PREFIX)),
    );
    for (const k of masterKeys) {
      const v = await AsyncStorage.getItem(k);
    }
  } catch (err) {
    console.warn('debugRawAsyncStorage failed', err);
  }
};

export const printCachedPrptypesWithData = async () => {
  try {
    const { prptypes } = await getPrptypeIndex();

    const present: string[] = [];
    for (const p of prptypes) {
      const key = normalizePrptype(p);
      const cache = await readPrptypeCache(key);
      if (!cache) {
        continue;
      }

      const a = Array.isArray(cache.account) ? cache.account.length : 0;
      const b = Array.isArray(cache.banks) ? cache.banks.length : 0;
      const c = Array.isArray(cache.branches) ? cache.branches.length : 0;

      if (a > 0 || b > 0 || c > 0) {
        present.push(key);
      }
    }

    return { index: prptypes, present };
  } catch (err) {
    console.warn('❌ printCachedPrptypesWithData failed:', err);
    return { index: [], present: [] };
  }
};

export const debugFileSystem = async () => {
  try {
    const files = await RNFS.readDir(PRPTYPE_FOLDER);
    for (const file of files) {
      const stats = await RNFS.stat(file.path);
    }
  } catch (err) {
    console.warn('❌ debugFileSystem failed:', err);
  }
};

export const debugChunkedFiles = async (prptype: string) => {
  try {
    const files = await RNFS.readDir(PRPTYPE_FOLDER);
    const prptypeFiles = files.filter(f => f.name.startsWith(prptype));

    for (const file of prptypeFiles) {
      const stats = await RNFS.stat(file.path);
    }
  } catch (err) {
    console.warn(`❌ Failed to debug files for ${prptype}:`, err);
  }
};

export const fetchAllPropertyData = async (token: string) => {
  try {
    // const userPtype = 'R'; //await AsyncStorage.getItem('user_prptype');
    const userPtype = await AsyncStorage.getItem('user_prptype');

    if (cancelToken?.cancel) cancelToken.cancel();
    cancelToken = axios.CancelToken.source();

    let params = null;

    console.log("fetchAllPropertydata api url :", `${API}/api/get_criterion?prptype=${userPtype}&txntype=''&fetch=prp`)
    const response = await axios.get(
      `${API}/api/get_criterion?prptype=${userPtype}&txntype=''&fetch=prp`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/javascript',
          Accept: 'application/json',
        },
        params,
      },
    );

    console.log("response :", response);

    if (response.data.success && response.data.response.data.length > 0) {
      const propertyGroupData = response.data.response.data;
      return propertyGroupData;
    } else {
      return [];
    }
  } catch (error) {
    if (!axios.isCancel(error)) {
      console.log('fetchpropertyGroupData error', error);
    }
    return [];
  }
};

export const fetchAllYeardata = async (token: string, prpcd = '') => {
  try {
    if (cancelToken?.cancel) cancelToken.cancel();
    cancelToken = axios.CancelToken.source();

    let params = { prpcode: prpcd };

    const response = await axios.get(`${API}/api/getyear`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/javascript',
        Accept: 'application/json',
      },
      params,
    });

    if (response.data.response.data && response.data.response.data.length > 0) {
      const appYdata = response.data.response.data;
      return appYdata;
    } else {
      return [];
    }
  } catch (error) {
    if (!axios.isCancel(error)) {
      console.log('fetchAllYeardata error', error);
    }
    return [];
  }
};

export const fetchAllStoredata = async (
  token: string,
  prp = '',
  yrno = '',
  txn = '',
) => {
  const userPtype = await AsyncStorage.getItem('user_prptype');
  const platform = txn !== '' ? 'mob' : '';
  try {
    if (cancelToken?.cancel) cancelToken.cancel();
    cancelToken = axios.CancelToken.source();

    let params = {
      prpcode: prp,
      yearno: yrno,
      txntype: txn,
      prptype: userPtype,
      // prptype: 'R'
    };
    const response = await axios.get(`${API}/api/getstore`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/javascript',
        Accept: 'application/json',
        'x-platform': 'mob',
      },
      params,
    });
    if (response.data.response.data && response.data.response.data.length > 0) {
      const appStoredata = response.data.response.data;
      return appStoredata;
    } else {
      return [];
    }
  } catch (error) {
    if (!axios.isCancel(error)) {
      console.log('fetchAllStoredata error', error);
    }
    return [];
  }
};

export const getCurrentFinancialYearMain = () => {
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1; // getMonth() returns 0-11

  // Financial year starts in April
  const financialYearStart = currentMonth >= 4 ? currentYear : currentYear - 1;
  const financialYearEnd = financialYearStart + 1;

  return `${financialYearStart}-${financialYearEnd}`;
};

// without Not future
export const generateFinancialYearOptions = (
  currentYear: number,
  range: number = 4,
) => {
  const years = [];
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1; // getMonth() returns 0-11
  const currentFinancialYearStart =
    currentMonth >= 4 ? currentYear : currentYear - 1;

  // Generate the last 'range' financial years including the current financial year
  for (let i = 0; i <= range; i++) {
    const startYear = currentFinancialYearStart - i;
    const endYear = startYear + 1;
    years.push(`${startYear}-${endYear}`);
  }

  return years;
};
