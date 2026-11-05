/*
 * Browser storage cannot provide the same OS-level protection as iOS
 * Keychain / Android Keystore. For web we keep sensitive session values out
 * of localStorage and use IndexedDB instead. This avoids the 5MB localStorage
 * limit and keeps the existing login/session persistence across refreshes.
 *
 * Important: a browser cannot be made equivalent to SecureStore against XSS.
 * Authentication must still be protected by the server/session policy.
 */

const DB_NAME = 'FlowNestSecureStorage';
const STORE_NAME = 'kv';
const DB_VERSION = 1;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not available in this browser.'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export const secureStorage = {
  async getItem(key: string): Promise<string | null> {
    try {
      const db = await openDb();
      return await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const request = tx.objectStore(STORE_NAME).get(key);
        request.onsuccess = () =>
          resolve(typeof request.result === 'string' ? request.result : null);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.warn(`[WebSecureStorage] getItem failed for ${key}`, error);
      return null;
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },

  async removeItem(key: string): Promise<void> {
    try {
      const db = await openDb();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).delete(key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch {
      // Key may not exist / IndexedDB may be unavailable.
    }
  },
};
