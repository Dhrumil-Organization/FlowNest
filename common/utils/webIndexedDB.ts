/*
 * Small IndexedDB key/value helper used only by Expo web fallbacks.
 * IndexedDB is asynchronous and does not have localStorage's ~5MB limit,
 * making it a better fit for the application's larger browser caches.
 */
const DB_VERSION = 1;

export function createWebKVStore(dbName: string, storeName = 'kv') {
  const open = (): Promise<IDBDatabase> =>
    new Promise((resolve, reject) => {
      if (typeof indexedDB === 'undefined') {
        reject(new Error('IndexedDB is unavailable.'));
        return;
      }
      const req = indexedDB.open(dbName, DB_VERSION);
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains(storeName)) {
          req.result.createObjectStore(storeName);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });

  const get = async <T = any>(key: string): Promise<T | null> => {
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const req = tx.objectStore(storeName).get(key);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => reject(req.error);
    });
  };

  const set = async (key: string, value: any): Promise<void> => {
    const db = await open();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      tx.objectStore(storeName).put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  };

  const remove = async (key: string): Promise<void> => {
    const db = await open();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      tx.objectStore(storeName).delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  };

  const clear = async (): Promise<void> => {
    const db = await open();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      tx.objectStore(storeName).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  };

  return { get, set, remove, clear };
}
