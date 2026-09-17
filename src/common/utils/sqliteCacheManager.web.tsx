import axios from 'axios';
import { API } from '../API/dynamicAPI';
import { createWebKVStore } from './webIndexedDB';

const store = createWebKVStore('FlowNestGlobalCache');

const tableKey = (table: string) => `table:${table}`;

export const initGlobalCacheDB = async (): Promise<void> => {
  // Browser fallback: IndexedDB replaces native SQLite.
};

export const getCachedGlobalData = async (table: string): Promise<any[]> => {
  try {
    return (await store.get<any[]>(tableKey(table))) || [];
  } catch {
    return [];
  }
};

export const clearAllGlobalCacheData = async (): Promise<void> => {
  await Promise.all([
    store.remove(tableKey('party')),
    store.remove(tableKey('item')),
    store.remove(tableKey('shade')),
  ]);
};

export const fetchAndCacheGlobalData = async (
  token: string,
  forceRefresh = false,
): Promise<void> => {
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
    },
  );

  const nextParty = response?.data?.response?.party || [];
  const nextItem = response?.data?.response?.item || [];
  const nextShade = response?.data?.response?.shade || [];

  await Promise.all([
    store.set(tableKey('party'), nextParty),
    store.set(tableKey('item'), nextItem),
    store.set(tableKey('shade'), nextShade),
  ]);
};

export const updateGlobalCacheInBackground = async (token: string): Promise<void> => {
  try {
    await fetchAndCacheGlobalData(token, true);
  } catch (error) {
    console.error('❌ Browser global cache update failed:', error);
  }
};
