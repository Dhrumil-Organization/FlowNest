// import AsyncStorage from '@/common/utils/compatibleStorage';
// import * as SQLite from 'expo-sqlite';
// import { API } from '../../common/API/dynamicAPI';
// import { getCurrentFinancialYear } from '../../common/commonfunction';
// import api from './api';

// const DB_NAME = 'bharattex.db';

// const EVENTS_CACHE_KEY = 'cached_events';
// const PRP_CACHE_KEY = 'cached_prp';
// const DESIGNS_CHUNK_PREFIX = 'cached_designs_chunk_';
// const DESIGNS_META_KEY = 'cached_designs_meta';
// // FOR S
// const ITEM_CHUNK_PREFIX = 'cached_item_chunk_';
// const ITEM_META_KEY = 'cached_item_meta';
// // FOR K
// const ITEM_CHUNK_PREFIX_K = 'cached_item_chunk_K';
// const ITEM_META_KEY_K = 'cached_item_meta_K';
// // FOR V
// const ITEM_CHUNK_PREFIX_V = 'cached_item_chunk_V';
// const ITEM_META_KEY_V = 'cached_item_meta_V';
// // FOR R
// const ITEM_CHUNK_PREFIX_R = 'cached_item_chunk_R';
// const ITEM_META_KEY_R = 'cached_item_meta_R';
// const CHUNK_SIZE = 500;

// // ════════════════════════ CACHING LOGIC (AsyncStorage) ═════════════════════

// export const getCachedEvents = async () => {
//   try {
//     const data = await AsyncStorage.getItem(EVENTS_CACHE_KEY);
//     return data ? JSON.parse(data) : null;
//   } catch (e) {
//     return null;
//   }
// };

// export const setCachedEvents = async events => {
//   try {
//     await AsyncStorage.setItem(EVENTS_CACHE_KEY, JSON.stringify(events));
//   } catch (e) {
//     console.log('Failed to cache events', e);
//   }
// };

// export const clearCachedEvents = async () => {
//   try {
//     await AsyncStorage.removeItem(EVENTS_CACHE_KEY);
//   } catch (e) { }
// };

// export const getCachedPrp = async () => {
//   try {
//     const data = await AsyncStorage.getItem(PRP_CACHE_KEY);
//     return data ? JSON.parse(data) : null;
//   } catch (e) {
//     return null;
//   }
// };

// export const setCachedPrp = async prp => {
//   try {
//     await AsyncStorage.setItem(PRP_CACHE_KEY, JSON.stringify(prp));
//   } catch (e) {
//     console.log('Failed to cache prp', e);
//   }
// };

// export const clearCachedPrp = async () => {
//   try {
//     await AsyncStorage.removeItem(PRP_CACHE_KEY);
//   } catch (e) { }
// };

// // Chunked caching for designs
// export const setCachedDesing = async designs => {
//   try {
//     const chunks = [];
//     for (let i = 0; i < designs.length; i += CHUNK_SIZE) {
//       chunks.push(designs.slice(i, i + CHUNK_SIZE));
//     }

//     for (let i = 0; i < chunks.length; i++) {
//       await AsyncStorage.setItem(
//         `${DESIGNS_CHUNK_PREFIX}${i}`,
//         JSON.stringify(chunks[i]),
//       );
//     }

//     await AsyncStorage.setItem(
//       DESIGNS_META_KEY,
//       JSON.stringify({ totalChunks: chunks.length }),
//     );

//     await AsyncStorage.removeItem('cached_designs');
//   } catch (e) {
//     console.log('Failed to cache designs (chunked)', e);
//   }
// };

// export const getCachedDesign = async () => {
//   try {
//     const metaStr = await AsyncStorage.getItem(DESIGNS_META_KEY);
//     if (!metaStr) return null;

//     const meta = JSON.parse(metaStr);
//     const allDesigns = [];

//     for (let i = 0; i < meta.totalChunks; i++) {
//       const chunkStr = await AsyncStorage.getItem(`${DESIGNS_CHUNK_PREFIX}${i}`);
//       if (chunkStr) {
//         const chunk = JSON.parse(chunkStr);
//         allDesigns.push(...chunk);
//       }
//     }

//     return allDesigns;
//   } catch (e) {
//     console.log('Failed to get cached designs (chunked)', e);
//     return null;
//   }
// };

// export const clearCachedDesing = async () => {
//   try {
//     const keys = await AsyncStorage.getAllKeys();
//     const chunkKeys = keys.filter(
//       k => k.startsWith(DESIGNS_CHUNK_PREFIX) || k === DESIGNS_META_KEY,
//     );
//     await AsyncStorage.multiRemove(chunkKeys);
//     await AsyncStorage.removeItem('cached_designs');
//   } catch (e) {
//     console.log('Failed to clear cached designs', e);
//   }
// };

// // Chunked caching for items
// // FOR S
// export const setCachedItem = async items => {
//   try {
//     const chunks = [];
//     for (let i = 0; i < items.length; i += CHUNK_SIZE) {
//       chunks.push(items.slice(i, i + CHUNK_SIZE));
//     }

//     for (let i = 0; i < chunks.length; i++) {
//       await AsyncStorage.setItem(
//         `${ITEM_CHUNK_PREFIX}${i}`,
//         JSON.stringify(chunks[i]),
//       );
//     }

//     await AsyncStorage.setItem(
//       ITEM_META_KEY,
//       JSON.stringify({ totalChunks: chunks.length }),
//     );

//     await AsyncStorage.removeItem('cached_items');
//   } catch (e) {
//     console.log('Failed to cache items (chunked)', e);
//   }
// };

// export const getCachedItem = async () => {
//   try {
//     const metaStr = await AsyncStorage.getItem(ITEM_META_KEY);
//     if (!metaStr) return null;

//     const meta = JSON.parse(metaStr);
//     const allItems = [];

//     for (let i = 0; i < meta.totalChunks; i++) {
//       const chunkStr = await AsyncStorage.getItem(`${ITEM_CHUNK_PREFIX}${i}`);
//       if (chunkStr) {
//         const chunk = JSON.parse(chunkStr);
//         allItems.push(...chunk);
//       }
//     }

//     return allItems;
//   } catch (e) {
//     console.log('Failed to get cached items (chunked)', e);
//     return null;
//   }
// };

// export const clearCachedItem = async () => {
//   try {
//     const keys = await AsyncStorage.getAllKeys();
//     const chunkKeys = keys.filter(
//       k => k.startsWith(ITEM_CHUNK_PREFIX) || k === ITEM_META_KEY,
//     );
//     await AsyncStorage.multiRemove(chunkKeys);
//     await AsyncStorage.removeItem('cached_items');
//   } catch (e) {
//     console.log('Failed to clear cached items', e);
//   }
// };

// // FOR K
// export const setCachedItemK = async items => {
//   try {
//     const chunks = [];
//     for (let i = 0; i < items.length; i += CHUNK_SIZE) {
//       chunks.push(items.slice(i, i + CHUNK_SIZE));
//     }

//     for (let i = 0; i < chunks.length; i++) {
//       await AsyncStorage.setItem(
//         `${ITEM_CHUNK_PREFIX_K}${i}`,
//         JSON.stringify(chunks[i]),
//       );
//     }

//     await AsyncStorage.setItem(
//       ITEM_META_KEY_K,
//       JSON.stringify({ totalChunks: chunks.length }),
//     );

//     await AsyncStorage.removeItem('cached_items');
//   } catch (e) {
//     console.log('Failed to cache items (chunked)', e);
//   }
// };

// export const getCachedItemK = async () => {
//   try {
//     const metaStr = await AsyncStorage.getItem(ITEM_META_KEY_K);
//     if (!metaStr) return null;

//     const meta = JSON.parse(metaStr);
//     const allItems = [];

//     for (let i = 0; i < meta.totalChunks; i++) {
//       const chunkStr = await AsyncStorage.getItem(`${ITEM_CHUNK_PREFIX_K}${i}`);
//       if (chunkStr) {
//         const chunk = JSON.parse(chunkStr);
//         allItems.push(...chunk);
//       }
//     }

//     return allItems;
//   } catch (e) {
//     console.log('Failed to get cached items (chunked)', e);
//     return null;
//   }
// };

// export const clearCachedItemK = async () => {
//   try {
//     const keys = await AsyncStorage.getAllKeys();
//     const chunkKeys = keys.filter(
//       k => k.startsWith(ITEM_CHUNK_PREFIX_K) || k === ITEM_META_KEY_K,
//     );
//     await AsyncStorage.multiRemove(chunkKeys);
//     await AsyncStorage.removeItem('cached_items');
//   } catch (e) {
//     console.log('Failed to clear cached items', e);
//   }
// };

// // FOR V
// export const setCachedItemV = async items => {
//   try {
//     const chunks = [];
//     for (let i = 0; i < items.length; i += CHUNK_SIZE) {
//       chunks.push(items.slice(i, i + CHUNK_SIZE));
//     }

//     for (let i = 0; i < chunks.length; i++) {
//       await AsyncStorage.setItem(
//         `${ITEM_CHUNK_PREFIX_V}${i}`,
//         JSON.stringify(chunks[i]),
//       );
//     }

//     await AsyncStorage.setItem(
//       ITEM_META_KEY_V,
//       JSON.stringify({ totalChunks: chunks.length }),
//     );

//     await AsyncStorage.removeItem('cached_items');
//   } catch (e) {
//     console.log('Failed to cache items (chunked)', e);
//   }
// };

// export const getCachedItemV = async () => {
//   try {
//     const metaStr = await AsyncStorage.getItem(ITEM_META_KEY_V);
//     if (!metaStr) return null;

//     const meta = JSON.parse(metaStr);
//     const allItems = [];

//     for (let i = 0; i < meta.totalChunks; i++) {
//       const chunkStr = await AsyncStorage.getItem(`${ITEM_CHUNK_PREFIX_V}${i}`);
//       if (chunkStr) {
//         const chunk = JSON.parse(chunkStr);
//         allItems.push(...chunk);
//       }
//     }

//     return allItems;
//   } catch (e) {
//     console.log('Failed to get cached items (chunked)', e);
//     return null;
//   }
// };

// export const clearCachedItemV= async () => {
//   try {
//     const keys = await AsyncStorage.getAllKeys();
//     const chunkKeys = keys.filter(
//       k => k.startsWith(ITEM_CHUNK_PREFIX_V) || k === ITEM_META_KEY_V,
//     );
//     await AsyncStorage.multiRemove(chunkKeys);
//     await AsyncStorage.removeItem('cached_items');
//   } catch (e) {
//     console.log('Failed to clear cached items', e);
//   }
// };

// // FOR R
// export const setCachedItemR = async items => {
//   try {
//     const chunks = [];
//     for (let i = 0; i < items.length; i += CHUNK_SIZE) {
//       chunks.push(items.slice(i, i + CHUNK_SIZE));
//     }

//     for (let i = 0; i < chunks.length; i++) {
//       await AsyncStorage.setItem(
//         `${ITEM_CHUNK_PREFIX_R}${i}`,
//         JSON.stringify(chunks[i]),
//       );
//     }

//     await AsyncStorage.setItem(
//       ITEM_META_KEY_R,
//       JSON.stringify({ totalChunks: chunks.length }),
//     );

//     await AsyncStorage.removeItem('cached_items');
//   } catch (e) {
//     console.log('Failed to cache items R (chunked)', e);
//   }
// };

// export const getCachedItemR = async () => {
//   try {
//     const metaStr = await AsyncStorage.getItem(ITEM_META_KEY_R);
//     if (!metaStr) return null;

//     const meta = JSON.parse(metaStr);
//     const allItems = [];

//     for (let i = 0; i < meta.totalChunks; i++) {
//       const chunkStr = await AsyncStorage.getItem(`${ITEM_CHUNK_PREFIX_R}${i}`);
//       if (chunkStr) {
//         const chunk = JSON.parse(chunkStr);
//         allItems.push(...chunk);
//       }
//     }

//     return allItems;
//   } catch (e) {
//     console.log('Failed to get cached R items (chunked)', e);
//     return null;
//   }
// };

// export const clearCachedItemR = async () => {
//   try {
//     const keys = await AsyncStorage.getAllKeys();
//     const chunkKeys = keys.filter(
//       k => k.startsWith(ITEM_CHUNK_PREFIX_R) || k === ITEM_META_KEY_R,
//     );
//     await AsyncStorage.multiRemove(chunkKeys);
//     await AsyncStorage.removeItem('cached_items');
//   } catch (e) {
//     console.log('Failed to clear cached R items', e);
//   }
// };

// // ════════════════════════ DATABASE (expo-sqlite, async API) ════════════════

// let dbPromise = null;

// async function openAndPrepare() {
//   const db = await SQLite.openDatabaseAsync(DB_NAME);
//   await db.execAsync('PRAGMA journal_mode = WAL;');

//   // Main enquiries table - updated to store items as JSON
//   await db.execAsync(`
//     CREATE TABLE IF NOT EXISTS enquiries (
//       local_id TEXT PRIMARY KEY NOT NULL,
//       server_id INTEGER,
//       user_id INTEGER NOT NULL,
//       party_name TEXT,
//       address TEXT,
//       gst_no TEXT,
//       contact_name TEXT,
//       designation TEXT,
//       mobile TEXT,
//       email TEXT,
//       front_img TEXT,
//       back_img TEXT,
//       card_front_uri TEXT,
//       reference_photos TEXT,
//       scanned_from_card INTEGER DEFAULT 0,
//       sync_status TEXT NOT NULL DEFAULT 'pending',
//       created_at INTEGER NOT NULL,
//       updated_at INTEGER NOT NULL,
//       event_code TEXT,
//       items_json TEXT,  -- Store items with designs as JSON
//       is_deleted INTEGER DEFAULT 0
//     );
//   `);

//   await addColumnIfMissing(db, 'event_code', 'TEXT');
//   await addColumnIfMissing(db, 'items_json', 'TEXT');

//   return db;
// }

// async function addColumnIfMissing(db, column, type) {
//   try {
//     await db.execAsync(`ALTER TABLE enquiries ADD COLUMN ${column} ${type};`);
//     console.log(`${column} column added`);
//   } catch (e) {
//     // Column already exists
//   }
// }

// async function getDb() {
//   if (!dbPromise) {
//     dbPromise = openAndPrepare();
//   }
//   return dbPromise;
// }

// export async function initDb(token, prptype) {
//   await getDb();

//   // Fetch and cache events
//   if (token && prptype) {
//     try {
//       const yearno = getCurrentFinancialYear();
//       const response = await api.get(`${API}/api/getevent`, {
//         params: { prptype, yearno },
//         headers: { Authorization: `Bearer ${token}` },
//       });
//       const events = response.data.data;
//       if (events && events.length) {
//         await setCachedEvents(events);
//         console.log('Events cached during initDb');
//       }
//     } catch (error) {
//       console.log('Failed to fetch events during initDb', error.message);
//     }
//   }

//   if (token && prptype) {
//     try {
//       const yearno = getCurrentFinancialYear();
//       const response = await api.get(`${API}/api/geteventprptype`, {
//         params: { prptype, yearno },
//         headers: { Authorization: `Bearer ${token}` },
//       });
//       const prp = response.data.data;
//       if (prp && prp.length) {
//         await setCachedPrp(prp);
//         console.log('prp cached during initDb');
//       }
//     } catch (error) {
//       console.log('Failed to fetch prp during initDb', error.message);
//     }
//   }

//   // Fetch and cache designs
//   if (token && prptype) {
//     try {
//       const yearno = getCurrentFinancialYear();
//       const q = '';
//       const response = await api.get(`${API}/api/designs/search`, {
//         params: { q, prptype, yearno },
//         headers: { Authorization: `Bearer ${token}` },
//       });
//       const allDesigns = response.data.data;
//       if (allDesigns && allDesigns.length) {
//         await setCachedDesing(allDesigns);
//         console.log('Designs cached during initDb', allDesigns.length);
//       }
//     } catch (error) {
//       console.log('Failed to fetch Designs during initDb', error.message);
//     }
//   }

//   // Fetch and cache Items
//   // FOR S
//   if (token && prptype) {
//     try {
//       const yearno = getCurrentFinancialYear();
//       const q = '';
//       const response = await api.get(`${API}/api/geteventitem`, {
//         params: { prptype: 'S', yearno },
//         headers: { Authorization: `Bearer ${token}` },
//       });
//       const allItems = response.data.data;
//       if (allItems && allItems.length) {
//         await setCachedItem(allItems);
//         console.log('Items S cached during initDb', allItems.length);
//       }
//     } catch (error) {
//       console.log('Failed to fetch Items during initDb', error.message);
//     }
//   }
//   // FOR K
//   if (token && prptype) {
//     try {
//       const yearno = getCurrentFinancialYear();
//       const q = '';
//       const response = await api.get(`${API}/api/geteventitem`, {
//         params: { prptype: 'K', yearno },
//         headers: { Authorization: `Bearer ${token}` },
//       });
//       const allItems = response.data.data;
//       if (allItems && allItems.length) {
//         await setCachedItemK(allItems);
//         console.log('Items K cached during initDb', allItems.length);
//       }
//     } catch (error) {
//       console.log('Failed to fetch Items during initDb', error.message);
//     }
//   }
//   // FOR V
//   if (token && prptype) {
//     try {
//       const yearno = getCurrentFinancialYear();
//       const q = '';
//       const response = await api.get(`${API}/api/geteventitem`, {
//         params: { prptype: 'V', yearno },
//         headers: { Authorization: `Bearer ${token}` },
//       });
//       const allItems = response.data.data;
//       if (allItems && allItems.length) {
//         await setCachedItemV(allItems);
//         console.log('Items V cached during initDb', allItems.length);
//       }
//     } catch (error) {
//       console.log('Failed to fetch Items during initDb', error.message);
//     }
//   }
//   // FOR R
//   if (token && prptype) {
//     console.log('Fetching Items R during initDb');
//     try {
//       const yearno = getCurrentFinancialYear();
//       const q = '';
//       const response = await api.get(`${API}/api/geteventitem`, {
//         params: { prptype: 'R', yearno },
//         headers: { Authorization: `Bearer ${token}` },
//       });
//       console.log('Items R response:', response.data);
//       const allItems = response.data.data;
//       if (allItems && allItems.length) {
//         await setCachedItemR(allItems);
//         console.log('Items R cached during initDb', allItems.length);
//       }
//     } catch (error) {
//       console.log('Failed to fetch Items during initDb', error.message);
//     }
//   }
// }

// export function generateLocalId() {
//   return `ENQ_${Date.now()}_${Math.floor(Math.random() * 1000000)}`;
// }

// // Insert a new enquiry with items
// export async function insertEnquiry(enquiry) {
//   const db = await getDb();
//   const now = Date.now();
//   const localId = enquiry.local_id || generateLocalId();

//   await db.runAsync(
//     `INSERT INTO enquiries (
//       local_id, user_id, party_name, address, gst_no,
//       contact_name, designation, mobile, email,
//       front_img, back_img, card_front_uri, reference_photos,
//       scanned_from_card, sync_status, created_at, updated_at,
//       event_code, items_json
//     ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
//     [
//       localId,
//       enquiry.user_id,
//       enquiry.party_name || '',
//       enquiry.address || '',
//       enquiry.gst_no || '',
//       enquiry.contact_name || '',
//       enquiry.designation || '',
//       enquiry.mobile || '',
//       enquiry.email || '',
//       enquiry.front_img || '',
//       enquiry.back_img || '',
//       enquiry.card_front_uri || '',
//       JSON.stringify(enquiry.reference_photos || []),
//       enquiry.scanned_from_card ? 1 : 0,
//       'pending',
//       now,
//       now,
//       enquiry.event_code || '',
//       JSON.stringify(enquiry.items || []),
//     ],
//   );

//   return localId;
// }

// export async function getPendingEnquiries() {
//   const db = await getDb();
//   return db.getAllAsync(
//     `SELECT * FROM enquiries
//      WHERE sync_status IN ('pending','failed') AND is_deleted = 0`,
//   );
// }

// export async function getAllEnquiries() {
//   const db = await getDb();
//   return db.getAllAsync(
//     `SELECT * FROM enquiries
//      WHERE is_deleted = 0
//      ORDER BY created_at DESC`,
//   );
// }

// export async function deleteAllEnquiriesFromDB() {
//   const db = await getDb();
//   return db.getAllAsync(
//     `DELETE FROM enquiries`,
//   );
// }

// export async function markSynced(localId, serverId) {
//   const db = await getDb();
//   await db.runAsync(
//     `UPDATE enquiries
//      SET server_id = ?, sync_status = 'synced', updated_at = ?
//      WHERE local_id = ?`,
//     [serverId, Date.now(), localId],
//   );
// }

// export async function markFailed(localId) {
//   const db = await getDb();
//   await db.runAsync(
//     `UPDATE enquiries
//      SET sync_status = 'failed', updated_at = ?
//      WHERE local_id = ?`,
//     [Date.now(), localId],
//   );
// }

// export async function markSyncing(localId) {
//   const db = await getDb();
//   await db.runAsync(
//     `UPDATE enquiries SET sync_status = 'syncing' WHERE local_id = ?`,
//     [localId],
//   );
// }

// export const updateEnquiryLocally = async (localId, updatedData) => {
//   const db = await getDb();
//   const fields = [
//     'party_name',
//     'address',
//     'gst_no',
//     'contact_name',
//     'designation',
//     'mobile',
//     'email',
//     'front_img',
//     'back_img',
//     'card_front_uri',
//     'scanned_from_card',
//     'event_code',
//     'items_json',
//   ];

//   const setClause = fields.map(f => `${f} = ?`).join(', ');
//   const fieldValues = fields.map(f => {
//     if (f === 'items_json' && updatedData[f]) {
//       return JSON.stringify(updatedData[f]);
//     }
//     return updatedData[f] ?? null;
//   });

//   await db.runAsync(
//     `UPDATE enquiries
//      SET ${setClause}, sync_status = 'pending', updated_at = ?
//      WHERE local_id = ?`,
//     [...fieldValues, Date.now(), localId],
//   );
// };

// export default getDb;

import AsyncStorage from "@/common/utils/compatibleStorage";
import * as SQLite from "expo-sqlite";
import { API } from "../../common/API/dynamicAPI";
import { getCurrentFinancialYear } from "../../common/commonfunction";
import api from "./api";

const DB_NAME = "bharattex.db";

// Logical cache keys (unchanged names, now stored as rows in SQLite instead of
// AsyncStorage keys / chunks). Kept as constants so the migration step below
// can find and clean up the old AsyncStorage entries.
const EVENTS_CACHE_KEY = "cached_events";
const PRP_CACHE_KEY = "cached_prp";
const DESIGNS_CACHE_KEY = "cached_designs";
const DESIGNS_CHUNK_PREFIX = "cached_designs_chunk_";
const DESIGNS_META_KEY = "cached_designs_meta";
// FOR S
const ITEM_CACHE_KEY = "cached_item_S";
const ITEM_CHUNK_PREFIX = "cached_item_chunk_";
const ITEM_META_KEY = "cached_item_meta";
// FOR K
const ITEM_CACHE_KEY_K = "cached_item_K";
const ITEM_CHUNK_PREFIX_K = "cached_item_chunk_K";
const ITEM_META_KEY_K = "cached_item_meta_K";
// FOR V
const ITEM_CACHE_KEY_V = "cached_item_V";
const ITEM_CHUNK_PREFIX_V = "cached_item_chunk_V";
const ITEM_META_KEY_V = "cached_item_meta_V";
// FOR R
const ITEM_CACHE_KEY_R = "cached_item_R";
const ITEM_CHUNK_PREFIX_R = "cached_item_chunk_R";
const ITEM_META_KEY_R = "cached_item_meta_R";
const CHUNK_SIZE = 500; // only used by the one-time AsyncStorage->SQLite migration below

const MIGRATION_FLAG_KEY = "__async_storage_cache_migrated_v1__";

// ════════════════ CACHING LOGIC (SQLite key/value table, replaces AsyncStorage) ═══════════════
// All "cached_*" data (events, prp, designs, items) now lives inside the same
// bharattex.db SQLite database, in a simple key/value table (kv_cache).
// This avoids AsyncStorage's per-row size limits on Android (which is why the
// old code had to manually split designs/items into 500-row chunks) and keeps
// everything in one place that behaves the same way on Android and iOS.

// NOTE: getKV/setKV/deleteKV call getDb(), which is fine everywhere EXCEPT
// during the initial migration below — that runs from inside openAndPrepare()
// itself (i.e. while getDb()'s own promise is still pending), so the
// migration talks to the `db` handle it's given directly instead of calling
// getDb() again (that would deadlock, awaiting a promise that can't resolve
// until this same function returns).
async function getKV(key) {
  const db = await getDb();
  const row = await db.getFirstAsync(
    `SELECT value FROM kv_cache WHERE key = ?`,
    [key]
  );
  return row ? row.value : null;
}

async function setKV(key, value) {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO kv_cache (key, value, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    [key, value, Date.now()]
  );
}

async function deleteKV(key) {
  const db = await getDb();
  await db.runAsync(`DELETE FROM kv_cache WHERE key = ?`, [key]);
}

async function getKVWithDb(db, key) {
  const row = await db.getFirstAsync(
    `SELECT value FROM kv_cache WHERE key = ?`,
    [key]
  );
  return row ? row.value : null;
}

async function setKVWithDb(db, key, value) {
  await db.runAsync(
    `INSERT INTO kv_cache (key, value, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    [key, value, Date.now()]
  );
}

// One-time migration: pull any existing cache data out of AsyncStorage (old
// storage) and copy it into the new SQLite kv_cache table, then wipe the old
// AsyncStorage keys so nothing is left duplicated on the device. Safe to run
// every app start — it exits immediately once already migrated.
async function migrateOldAsyncStorageCacheIfNeeded(db) {
  try {
    const already = await getKVWithDb(db, MIGRATION_FLAG_KEY);
    if (already) return;

    const simpleKeys = [EVENTS_CACHE_KEY, PRP_CACHE_KEY];
    for (const key of simpleKeys) {
      try {
        const old = await AsyncStorage.getItem(key);
        if (old) await setKVWithDb(db, key, old);
      } catch (e) {}
    }

    const chunkedGroups = [
      {
        metaKey: DESIGNS_META_KEY,
        prefix: DESIGNS_CHUNK_PREFIX,
        target: DESIGNS_CACHE_KEY,
      },
      {
        metaKey: ITEM_META_KEY,
        prefix: ITEM_CHUNK_PREFIX,
        target: ITEM_CACHE_KEY,
      },
      {
        metaKey: ITEM_META_KEY_K,
        prefix: ITEM_CHUNK_PREFIX_K,
        target: ITEM_CACHE_KEY_K,
      },
      {
        metaKey: ITEM_META_KEY_V,
        prefix: ITEM_CHUNK_PREFIX_V,
        target: ITEM_CACHE_KEY_V,
      },
      {
        metaKey: ITEM_META_KEY_R,
        prefix: ITEM_CHUNK_PREFIX_R,
        target: ITEM_CACHE_KEY_R,
      },
    ];

    for (const group of chunkedGroups) {
      try {
        const metaStr = await AsyncStorage.getItem(group.metaKey);
        if (!metaStr) continue;
        const meta = JSON.parse(metaStr);
        const all = [];
        for (let i = 0; i < meta.totalChunks; i++) {
          const chunkStr = await AsyncStorage.getItem(`${group.prefix}${i}`);
          if (chunkStr) all.push(...JSON.parse(chunkStr));
        }
        if (all.length)
          await setKVWithDb(db, group.target, JSON.stringify(all));
      } catch (e) {}
    }

    // Clean up every old AsyncStorage key this module ever wrote.
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const oldKeys = allKeys.filter(
        (k) =>
          k === EVENTS_CACHE_KEY ||
          k === PRP_CACHE_KEY ||
          k === "cached_designs" ||
          k === "cached_items" ||
          k === DESIGNS_META_KEY ||
          k === ITEM_META_KEY ||
          k === ITEM_META_KEY_K ||
          k === ITEM_META_KEY_V ||
          k === ITEM_META_KEY_R ||
          k.startsWith(DESIGNS_CHUNK_PREFIX) ||
          k.startsWith(ITEM_CHUNK_PREFIX_R) ||
          k.startsWith(ITEM_CHUNK_PREFIX_K) ||
          k.startsWith(ITEM_CHUNK_PREFIX_V) ||
          k.startsWith(ITEM_CHUNK_PREFIX)
      );
      if (oldKeys.length) await AsyncStorage.multiRemove(oldKeys);
    } catch (e) {}

    await setKVWithDb(db, MIGRATION_FLAG_KEY, "1");
  } catch (e) {
    console.log("Cache migration from AsyncStorage skipped/failed", e);
  }
}

// ── Events ──────────────────────────────────────────────────────────────────
export const getCachedEvents = async () => {
  try {
    const data = await getKV(EVENTS_CACHE_KEY);
    return data ? JSON.parse(data) : null;
  } catch (e) {
    return null;
  }
};

export const setCachedEvents = async (events) => {
  try {
    await setKV(EVENTS_CACHE_KEY, JSON.stringify(events));
  } catch (e) {
    console.log("Failed to cache events", e);
  }
};

export const clearCachedEvents = async () => {
  try {
    await deleteKV(EVENTS_CACHE_KEY);
  } catch (e) {}
};

// ── PRP ──────────────────────────────────────────────────────────────────────
export const getCachedPrp = async () => {
  try {
    const data = await getKV(PRP_CACHE_KEY);
    return data ? JSON.parse(data) : null;
  } catch (e) {
    return null;
  }
};

export const setCachedPrp = async (prp) => {
  try {
    await setKV(PRP_CACHE_KEY, JSON.stringify(prp));
  } catch (e) {
    console.log("Failed to cache prp", e);
  }
};

export const clearCachedPrp = async () => {
  try {
    await deleteKV(PRP_CACHE_KEY);
  } catch (e) {}
};

// ── Designs ──────────────────────────────────────────────────────────────────
export const setCachedDesing = async (designs) => {
  try {
    await setKV(DESIGNS_CACHE_KEY, JSON.stringify(designs || []));
  } catch (e) {
    console.log("Failed to cache designs", e);
  }
};

export const getCachedDesign = async () => {
  try {
    const data = await getKV(DESIGNS_CACHE_KEY);
    return data ? JSON.parse(data) : null;
  } catch (e) {
    console.log("Failed to get cached designs", e);
    return null;
  }
};

export const clearCachedDesing = async () => {
  try {
    await deleteKV(DESIGNS_CACHE_KEY);
  } catch (e) {
    console.log("Failed to clear cached designs", e);
  }
};

// ── Items — FOR S ────────────────────────────────────────────────────────────
export const setCachedItem = async (items) => {
  try {
    await setKV(ITEM_CACHE_KEY, JSON.stringify(items || []));
  } catch (e) {
    console.log("Failed to cache items", e);
  }
};

export const getCachedItem = async () => {
  try {
    const data = await getKV(ITEM_CACHE_KEY);
    return data ? JSON.parse(data) : null;
  } catch (e) {
    console.log("Failed to get cached items", e);
    return null;
  }
};

export const clearCachedItem = async () => {
  try {
    await deleteKV(ITEM_CACHE_KEY);
  } catch (e) {
    console.log("Failed to clear cached items", e);
  }
};

// ── Items — FOR K ────────────────────────────────────────────────────────────
export const setCachedItemK = async (items) => {
  try {
    await setKV(ITEM_CACHE_KEY_K, JSON.stringify(items || []));
  } catch (e) {
    console.log("Failed to cache items K", e);
  }
};

export const getCachedItemK = async () => {
  try {
    const data = await getKV(ITEM_CACHE_KEY_K);
    return data ? JSON.parse(data) : null;
  } catch (e) {
    console.log("Failed to get cached items K", e);
    return null;
  }
};

export const clearCachedItemK = async () => {
  try {
    await deleteKV(ITEM_CACHE_KEY_K);
  } catch (e) {
    console.log("Failed to clear cached items K", e);
  }
};

// ── Items — FOR V ────────────────────────────────────────────────────────────
export const setCachedItemV = async (items) => {
  try {
    await setKV(ITEM_CACHE_KEY_V, JSON.stringify(items || []));
  } catch (e) {
    console.log("Failed to cache items V", e);
  }
};

export const getCachedItemV = async () => {
  try {
    const data = await getKV(ITEM_CACHE_KEY_V);
    return data ? JSON.parse(data) : null;
  } catch (e) {
    console.log("Failed to get cached items V", e);
    return null;
  }
};

export const clearCachedItemV = async () => {
  try {
    await deleteKV(ITEM_CACHE_KEY_V);
  } catch (e) {
    console.log("Failed to clear cached items V", e);
  }
};

// ── Items — FOR R ────────────────────────────────────────────────────────────
export const setCachedItemR = async (items) => {
  try {
    await setKV(ITEM_CACHE_KEY_R, JSON.stringify(items || []));
  } catch (e) {
    console.log("Failed to cache items R", e);
  }
};

export const getCachedItemR = async () => {
  try {
    const data = await getKV(ITEM_CACHE_KEY_R);
    return data ? JSON.parse(data) : null;
  } catch (e) {
    console.log("Failed to get cached items R", e);
    return null;
  }
};

export const clearCachedItemR = async () => {
  try {
    await deleteKV(ITEM_CACHE_KEY_R);
  } catch (e) {
    console.log("Failed to clear cached items R", e);
  }
};

// ════════════════════════ DATABASE (expo-sqlite, async API) ════════════════

let dbPromise = null;

async function openAndPrepare() {
  const db = await SQLite.openDatabaseAsync(DB_NAME);
  await db.execAsync("PRAGMA journal_mode = WAL;");

  // Main enquiries table - updated to store items as JSON
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS enquiries (
      local_id TEXT PRIMARY KEY NOT NULL,
      server_id INTEGER,
      user_id INTEGER NOT NULL,
      party_name TEXT,
      address TEXT,
      gst_no TEXT,
      contact_name TEXT,
      designation TEXT,
      mobile TEXT,
      email TEXT,
      front_img TEXT,
      back_img TEXT,
      card_front_uri TEXT,
      reference_photos TEXT,
      scanned_from_card INTEGER DEFAULT 0,
      sync_status TEXT NOT NULL DEFAULT 'pending',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      event_code TEXT,
      items_json TEXT,  -- Store items with designs as JSON
      is_deleted INTEGER DEFAULT 0
    );
  `);

  await addColumnIfMissing(db, "event_code", "TEXT");
  await addColumnIfMissing(db, "items_json", "TEXT");

  // Generic key/value cache table - replaces the old AsyncStorage-based
  // cache (events, prp, designs, items). Lives in the same SQLite DB so
  // there's only one storage engine for the whole module.
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS kv_cache (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT,
      updated_at INTEGER
    );
  `);

  await migrateOldAsyncStorageCacheIfNeeded(db);

  return db;
}

async function addColumnIfMissing(db, column, type) {
  try {
    await db.execAsync(`ALTER TABLE enquiries ADD COLUMN ${column} ${type};`);
    console.log(`${column} column added`);
  } catch (e) {
    // Column already exists
  }
}

async function getDb() {
  if (!dbPromise) {
    dbPromise = openAndPrepare();
  }
  return dbPromise;
}

export async function initDb(token, prptype) {
  await getDb();

  // Fetch and cache events
  if (token && prptype) {
    try {
      const yearno = getCurrentFinancialYear();
      const response = await api.get(`${API}/api/getevent`, {
        params: { prptype, yearno },
        headers: { Authorization: `Bearer ${token}` },
      });
      const events = response.data.data;
      if (events && events.length) {
        await setCachedEvents(events);
        console.log("Events cached during initDb");
      }
    } catch (error) {
      console.log("Failed to fetch events during initDb", error.message);
    }
  }

  if (token && prptype) {
    try {
      const yearno = getCurrentFinancialYear();
      const response = await api.get(`${API}/api/geteventprptype`, {
        params: { prptype, yearno },
        headers: { Authorization: `Bearer ${token}` },
      });
      const prp = response.data.data;
      if (prp && prp.length) {
        await setCachedPrp(prp);
        console.log("prp cached during initDb");
      }
    } catch (error) {
      console.log("Failed to fetch prp during initDb", error.message);
    }
  }

  // Fetch and cache designs
  if (token && prptype) {
    try {
      const yearno = getCurrentFinancialYear();
      const q = "";
      const response = await api.get(`${API}/api/designs/search`, {
        params: { q, prptype, yearno },
        headers: { Authorization: `Bearer ${token}` },
      });
      const allDesigns = response.data.data;
      if (allDesigns && allDesigns.length) {
        await setCachedDesing(allDesigns);
        console.log("Designs cached during initDb", allDesigns.length);
      }
    } catch (error) {
      console.log("Failed to fetch Designs during initDb", error.message);
    }
  }

  // Fetch and cache Items
  // FOR S
  if (token && prptype) {
    try {
      const yearno = getCurrentFinancialYear();
      const q = "";
      const response = await api.get(`${API}/api/geteventitem`, {
        params: { prptype: "S", yearno },
        headers: { Authorization: `Bearer ${token}` },
      });
      const allItems = response.data.data;
      if (allItems && allItems.length) {
        await setCachedItem(allItems);
        console.log("Items S cached during initDb", allItems.length);
      }
    } catch (error) {
      console.log("Failed to fetch Items during initDb", error.message);
    }
  }
  // FOR K
  if (token && prptype) {
    try {
      const yearno = getCurrentFinancialYear();
      const q = "";
      const response = await api.get(`${API}/api/geteventitem`, {
        params: { prptype: "K", yearno },
        headers: { Authorization: `Bearer ${token}` },
      });
      const allItems = response.data.data;
      if (allItems && allItems.length) {
        await setCachedItemK(allItems);
        console.log("Items K cached during initDb", allItems.length);
      }
    } catch (error) {
      console.log("Failed to fetch Items during initDb", error.message);
    }
  }
  // FOR V
  if (token && prptype) {
    try {
      const yearno = getCurrentFinancialYear();
      const q = "";
      const response = await api.get(`${API}/api/geteventitem`, {
        params: { prptype: "V", yearno },
        headers: { Authorization: `Bearer ${token}` },
      });
      const allItems = response.data.data;
      if (allItems && allItems.length) {
        await setCachedItemV(allItems);
        console.log("Items V cached during initDb", allItems.length);
      }
    } catch (error) {
      console.log("Failed to fetch Items during initDb", error.message);
    }
  }
  // FOR R
  if (token && prptype) {
    console.log("Fetching Items R during initDb");
    try {
      const yearno = getCurrentFinancialYear();
      const q = "";
      const response = await api.get(`${API}/api/geteventitem`, {
        params: { prptype: "R", yearno },
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log("Items R response:", response.data);
      const allItems = response.data.data;
      if (allItems && allItems.length) {
        await setCachedItemR(allItems);
        console.log("Items R cached during initDb", allItems.length);
      }
    } catch (error) {
      console.log("Failed to fetch Items during initDb", error.message);
    }
  }
}

export function generateLocalId() {
  return `ENQ_${Date.now()}_${Math.floor(Math.random() * 1000000)}`;
}

// Insert a new enquiry with items
export async function insertEnquiry(enquiry) {
  const db = await getDb();
  const now = Date.now();
  const localId = enquiry.local_id || generateLocalId();

  await db.runAsync(
    `INSERT INTO enquiries (
      local_id, user_id, party_name, address, gst_no,
      contact_name, designation, mobile, email,
      front_img, back_img, card_front_uri, reference_photos,
      scanned_from_card, sync_status, created_at, updated_at,
      event_code, items_json
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      localId,
      enquiry.user_id,
      enquiry.party_name || "",
      enquiry.address || "",
      enquiry.gst_no || "",
      enquiry.contact_name || "",
      enquiry.designation || "",
      enquiry.mobile || "",
      enquiry.email || "",
      enquiry.front_img || "",
      enquiry.back_img || "",
      enquiry.card_front_uri || "",
      JSON.stringify(enquiry.reference_photos || []),
      enquiry.scanned_from_card ? 1 : 0,
      "pending",
      now,
      now,
      enquiry.event_code || "",
      JSON.stringify(enquiry.items || []),
    ]
  );

  return localId;
}

export async function getPendingEnquiries() {
  const db = await getDb();
  return db.getAllAsync(
    `SELECT * FROM enquiries
     WHERE sync_status IN ('pending','failed') AND is_deleted = 0`
  );
}

export async function getAllEnquiries() {
  const db = await getDb();
  return db.getAllAsync(
    `SELECT * FROM enquiries 
     WHERE is_deleted = 0
     ORDER BY created_at DESC`
  );
}

export async function deleteAllEnquiriesFromDB() {
  const db = await getDb();
  return db.getAllAsync(`DELETE FROM enquiries`);
}

export async function markSynced(localId, serverId) {
  const db = await getDb();
  await db.runAsync(
    `UPDATE enquiries
     SET server_id = ?, sync_status = 'synced', updated_at = ?
     WHERE local_id = ?`,
    [serverId, Date.now(), localId]
  );
}

export async function markFailed(localId) {
  const db = await getDb();
  await db.runAsync(
    `UPDATE enquiries
     SET sync_status = 'failed', updated_at = ?
     WHERE local_id = ?`,
    [Date.now(), localId]
  );
}

export async function markSyncing(localId) {
  const db = await getDb();
  await db.runAsync(
    `UPDATE enquiries SET sync_status = 'syncing' WHERE local_id = ?`,
    [localId]
  );
}

export const updateEnquiryLocally = async (localId, updatedData) => {
  const db = await getDb();
  const fields = [
    "party_name",
    "address",
    "gst_no",
    "contact_name",
    "designation",
    "mobile",
    "email",
    "front_img",
    "back_img",
    "card_front_uri",
    "scanned_from_card",
    "event_code",
    "items_json",
  ];

  const setClause = fields.map((f) => `${f} = ?`).join(", ");
  const fieldValues = fields.map((f) => {
    if (f === "items_json" && updatedData[f]) {
      return JSON.stringify(updatedData[f]);
    }
    return updatedData[f] ?? null;
  });

  await db.runAsync(
    `UPDATE enquiries
     SET ${setClause}, sync_status = 'pending', updated_at = ?
     WHERE local_id = ?`,
    [...fieldValues, Date.now(), localId]
  );
};

export default getDb;
