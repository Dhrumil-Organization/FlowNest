import { Platform } from 'react-native';

const WEB_DB_NAME = 'FlowNestSecureStorage';
const WEB_STORE_NAME = 'kv';
const WEB_KEY_STORE_NAME = 'keys';
const WEB_DB_VERSION = 2;

function openWebDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is unavailable.'));
      return;
    }
    const request = indexedDB.open(WEB_DB_NAME, WEB_DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(WEB_STORE_NAME)) {
        db.createObjectStore(WEB_STORE_NAME);
      }
      if (!db.objectStoreNames.contains(WEB_KEY_STORE_NAME)) {
        db.createObjectStore(WEB_KEY_STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getWebKey(): Promise<CryptoKey> {
  const db = await openWebDb();
  const existing = await new Promise<CryptoKey | undefined>((resolve, reject) => {
    const tx = db.transaction(WEB_KEY_STORE_NAME, 'readonly');
    const request = tx.objectStore(WEB_KEY_STORE_NAME).get('aes-gcm');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  if (existing) return existing;

  const key = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(WEB_KEY_STORE_NAME, 'readwrite');
    tx.objectStore(WEB_KEY_STORE_NAME).put(key, 'aes-gcm');
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });

  return key;
}

async function encryptWeb(value: string) {
  const key = await getWebKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(value);
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoded,
  );
  return { iv: Array.from(iv), ciphertext: Array.from(new Uint8Array(ciphertext)) };
}

async function decryptWeb(record: any): Promise<string | null> {
  if (typeof record === 'string') return record;
  if (!record?.iv || !record?.ciphertext) return null;
  try {
    const key = await getWebKey();
    const plaintext = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: new Uint8Array(record.iv) },
      key,
      new Uint8Array(record.ciphertext),
    );
    return new TextDecoder().decode(plaintext);
  } catch {
    return null;
  }
}

/**
 * Native: Expo SecureStore -> iOS Keychain / Android Keystore.
 * Web: IndexedDB. Browsers do not expose an OS Keychain equivalent, so this
 * is the safest persistent browser storage available to this client without
 * changing the server authentication contract. It is NOT equivalent to
 * native SecureStore against XSS.
 */
export const secureStorage = {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS !== 'web') {
      try {
        const SecureStore = await import('expo-secure-store');
        return await SecureStore.getItemAsync(key);
      } catch (error) {
        console.warn(`[SecureStorage] getItem failed for ${key}`, error);
        return null;
      }
    }

    try {
      const db = await openWebDb();
      return await new Promise((resolve, reject) => {
        const tx = db.transaction(WEB_STORE_NAME, 'readonly');
        const request = tx.objectStore(WEB_STORE_NAME).get(key);
        request.onsuccess = async () => {
          resolve(await decryptWeb(request.result));
        };
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.warn(`[WebSecureStorage] getItem failed for ${key}`, error);
      return null;
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS !== 'web') {
      const SecureStore = await import('expo-secure-store');
      await SecureStore.setItemAsync(key, value, {
        keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      });
      return;
    }

    const db = await openWebDb();
    const record = await encryptWeb(value);
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(WEB_STORE_NAME, 'readwrite');
      tx.objectStore(WEB_STORE_NAME).put(record, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },

  async removeItem(key: string): Promise<void> {
    if (Platform.OS !== 'web') {
      try {
        const SecureStore = await import('expo-secure-store');
        await SecureStore.deleteItemAsync(key);
      } catch {
        // Key may not exist.
      }
      return;
    }

    try {
      const db = await openWebDb();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(WEB_STORE_NAME, 'readwrite');
        tx.objectStore(WEB_STORE_NAME).delete(key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch {
      // Key may not exist.
    }
  },
};
