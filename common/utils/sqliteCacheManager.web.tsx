import axios from 'axios';
import { API } from '../API/dynamicAPI';

const DB = 'FlowNestWebCache';
const STORE = 'kv';

function openStore(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function setValue(key: string, value: any) {
  const db = await openStore();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

async function getValue<T = any>(key: string): Promise<T | null> {
  const db = await openStore();
  const value = await new Promise<T | null>((resolve, reject) => {
    const req = db.transaction(STORE, 'readonly').objectStore(STORE).get(key);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return value;
}

async function deleteValue(key: string) {
  const db = await openStore();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export const initGlobalCacheDB = async (): Promise<void> => {
  await openStore().then(db => db.close());
};

export const getCachedGlobalData = async (table: string): Promise<any[]> => {
  try {
    return (await getValue<any[]>(`global:${table}`)) || [];
  } catch (e) {
    console.error(`❌ Error fetching ${table}:`, e);
    return [];
  }
};

export const clearAllGlobalCacheData = async (): Promise<void> => {
  await Promise.all(['party', 'item', 'shade'].map(t => deleteValue(`global:${t}`)));
};

export const fetchAndCacheGlobalData = async (token: string, forceRefresh = false): Promise<void> => {
  const [party, item, shade] = await Promise.all([
    getCachedGlobalData('party'),
    getCachedGlobalData('item'),
    getCachedGlobalData('shade'),
  ]);

  if (party.length && item.length && shade.length && !forceRefresh) return;

  const response = await axios.post(
    `${API}/api/get_mobile_user_details`,
    { prptype: 'R' },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    }
  );

  const data = response?.data?.response || {};
  await Promise.all([
    setValue('global:party', data.party || []),
    setValue('global:item', data.item || []),
    setValue('global:shade', data.shade || []),
  ]);
};

export const updateGlobalCacheInBackground = async (token: string): Promise<void> => {
  try { await fetchAndCacheGlobalData(token, true); }
  catch (e) { console.error('❌ Background global cache update failed:', e); }
};
