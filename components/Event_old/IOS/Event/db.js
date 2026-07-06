// // db.js
// // ────────────────────────────────────────────────────────────────────────────
// // Offline SQL cache for enquiries — EXPO version.
// //
// // IMPORTANT (why this file changed):
// //   The previous Expo port mixed two different expo-sqlite APIs:
// //     • SQLite.openDatabase()      → legacy WebSQL API (no execAsync/runAsync)
// //     • db.execAsync(sql, params)  → new API, BUT execAsync ignores params
// //   Result: SELECTs worked by luck, every INSERT/UPDATE silently did nothing.
// //
// //   This rewrite uses ONLY the modern async API the way Expo documents it:
// //     • SQLite.openDatabaseAsync('bharattex.db')   → open
// //     • db.execAsync(sql)                          → schema / bulk (NO params)
// //     • db.runAsync(sql, [params])                 → INSERT / UPDATE / DELETE
// //     • db.getAllAsync(sql, [params])              → SELECT (array of rows)
// //     • db.getFirstAsync(sql, [params])            → SELECT one row
// //
// //   Behaviour is identical to your working react-native-sqlite-storage version.
// //
// // Install (managed Expo):
// //   npx expo install expo-sqlite @react-native-async-storage/async-storage
// // ────────────────────────────────────────────────────────────────────────────

// import AsyncStorage from '@react-native-async-storage/async-storage';
// import * as SQLite from 'expo-sqlite';
// import { API } from '../../common/API/dynamicAPI';
// import { getCurrentFinancialYear } from '../../common/commonfunction';
// import api from './api'; // your axios instance

// const DB_NAME = 'bharattex.db';

// const EVENTS_CACHE_KEY = 'cached_events';
// const DESIGNS_CHUNK_PREFIX = 'cached_designs_chunk_';
// const DESIGNS_META_KEY = 'cached_designs_meta';
// const ITEM_CHUNK_PREFIX = 'cached_item_chunk_';
// const ITEM_META_KEY = 'cached_item_meta';
// const CHUNK_SIZE = 500;

// // ════════════════════════ CACHING LOGIC (AsyncStorage) ═════════════════════
// // AsyncStorage works out of the box in Expo, so this logic is unchanged.

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

// // Chunked caching for designs (large payloads → split to stay under limits)
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

// // Chunked caching for items (large payloads → split to stay under limits)
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

// // ════════════════════════ DATABASE (expo-sqlite, async API) ════════════════

// // A single shared connection promise. Using a promise (not a raw value)
// // guarantees that even if many functions call getDb() at the same moment on
// // first launch, the database is opened + schema-created exactly once.
// let dbPromise = null;

// async function openAndPrepare() {
//   const db = await SQLite.openDatabaseAsync(DB_NAME);

//   // WAL = better concurrency (UI can read while a sync writes in background).
//   await db.execAsync('PRAGMA journal_mode = WAL;');

//   // Base schema. execAsync runs the whole block; safe to call every launch.
//   await db.execAsync(`
//     CREATE TABLE IF NOT EXISTS enquiries (
//       local_id TEXT PRIMARY KEY NOT NULL,
//       server_id INTEGER,
//       user_id INTEGER NOT NULL,
//       party_name TEXT,
//       address TEXT,
//       gst_no TEXT,
//       design_requirement TEXT,
//       design_name TEXT,
//       qty_required TEXT,
//       price TEXT,
//       colour_requirement TEXT,
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
//       design_dsn_code TEXT,
//       design_dsn_name TEXT,
//       is_deleted INTEGER DEFAULT 0
//     );
//   `);

//   // Lightweight migrations for older installs that predate these columns.
//   // ALTER ... ADD COLUMN throws if the column already exists → ignore.
//   await addColumnIfMissing(db, 'event_code', 'TEXT');
//   await addColumnIfMissing(db, 'design_dsn_code', 'TEXT');
//   await addColumnIfMissing(db, 'design_dsn_name', 'TEXT');

//   return db;
// }

// async function addColumnIfMissing(db, column, type) {
//   try {
//     await db.execAsync(`ALTER TABLE enquiries ADD COLUMN ${column} ${type};`);
//     console.log(`${column} column added`);
//   } catch (e) {
//     // Column already exists — expected on every launch after the first.
//   }
// }

// async function getDb() {
//   if (!dbPromise) {
//     dbPromise = openAndPrepare();
//   }
//   return dbPromise;
// }

// // Initialize database + warm the event/design caches.
// // Call once near app start (you already call this from the screen).
// export async function initDb(token, prptype) {
//   await getDb(); // ensures the schema is ready

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

//   // Fetch and cache Item
//   if (token && prptype) {
//     try {
//       const yearno = getCurrentFinancialYear();
//       const q = '';
//       const response = await api.get(`${API}/api/designs/search`, {
//         params: { q, prptype: 'K', yearno },
//         headers: { Authorization: `Bearer ${token}` },
//       });
//       const allItems = response.data.data;
//       if (allItems && allItems.length) {
//         await setCachedItem(allItems);
//         console.log('Items cached during initDb', allItems.length);
//       }
//     } catch (error) {
//       console.log('Failed to fetch Designs during initDb', error.message);
//     }
//   }
// }

// // Unique local id for offline rows
// export function generateLocalId() {
//   return `ENQ_${Date.now()}_${Math.floor(Math.random() * 1000000)}`;
// }

// // Insert a new enquiry → returns the local_id
// export async function insertEnquiry(enquiry) {
//   const db = await getDb();
//   const now = Date.now();
//   const localId = enquiry.local_id || generateLocalId();

//   await db.runAsync(
//     `INSERT INTO enquiries (
//       local_id, user_id, party_name, address, gst_no,
//       design_requirement, design_name, qty_required, price,
//       colour_requirement, contact_name, designation, mobile, email,
//       front_img, back_img, card_front_uri, reference_photos,
//       scanned_from_card, sync_status, created_at, updated_at,
//       event_code, design_dsn_code, design_dsn_name
//     ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
//     [
//       localId,
//       enquiry.user_id,
//       enquiry.party_name || '',
//       enquiry.address || '',
//       enquiry.gst_no || '',
//       enquiry.design_requirement || '',
//       enquiry.design_name || '',
//       enquiry.qty_required || '',
//       enquiry.price || '',
//       enquiry.colour_requirement || '',
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
//       enquiry.design_dsn_code || '',
//       enquiry.design_dsn_name || '',
//     ],
//   );

//   return localId;
// }

// // Enquiries still needing to be pushed to the server
// export async function getPendingEnquiries() {
//   const db = await getDb();
//   return db.getAllAsync(
//     `SELECT * FROM enquiries
//      WHERE sync_status IN ('pending','failed') AND is_deleted = 0`,
//   );
// }

// // All non-deleted enquiries, newest first
// export async function getAllEnquiries() {
//   const db = await getDb();
//   return db.getAllAsync(
//     `SELECT * FROM enquiries
//      WHERE is_deleted = 0
//      ORDER BY created_at DESC`,
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

// // Edit a row locally and re-queue it for sync
// export const updateEnquiryLocally = async (localId, updatedData) => {
//   const db = await getDb();
//   const fields = [
//     'party_name',
//     'address',
//     'gst_no',
//     'design_requirement',
//     'qty_required',
//     'price',
//     'colour_requirement',
//     'contact_name',
//     'designation',
//     'mobile',
//     'email',
//     'front_img',
//     'back_img',
//     'card_front_uri',
//     'scanned_from_card',
//     'event_code',
//     'design_dsn_name',
//     'design_dsn_code',
//   ];

//   const setClause = fields.map(f => `${f} = ?`).join(', ');
//   const fieldValues = fields.map(f => updatedData[f] ?? null);

//   await db.runAsync(
//     `UPDATE enquiries
//      SET ${setClause}, sync_status = 'pending', updated_at = ?
//      WHERE local_id = ?`,
//     [...fieldValues, Date.now(), localId],
//   );
// };

// export default getDb;
// db.js
// ────────────────────────────────────────────────────────────────────────────
// Offline SQL cache for enquiries — EXPO version.
// Updated to support items and designs with proper relationships
// ────────────────────────────────────────────────────────────────────────────

import AsyncStorage from '@react-native-async-storage/async-storage';
import SQLite from 'react-native-sqlite-storage';
import { API } from '../../common/API/dynamicAPI';
import { getCurrentFinancialYear } from '../../common/commonfunction';
import api from './api';

// react-native-sqlite-storage (^6.0.1) — enable promise API so we can use
// async/await the same way the rest of this file expects.
SQLite.enablePromise(true);

const DB_NAME = 'bharattex.db';

const EVENTS_CACHE_KEY = 'cached_events';
const PRP_CACHE_KEY = 'cached_prp';
const DESIGNS_CHUNK_PREFIX = 'cached_designs_chunk_';
const DESIGNS_META_KEY = 'cached_designs_meta';
// FOR S
const ITEM_CHUNK_PREFIX = 'cached_item_chunk_';
const ITEM_META_KEY = 'cached_item_meta';
// FOR K
const ITEM_CHUNK_PREFIX_K = 'cached_item_chunk_K';
const ITEM_META_KEY_K = 'cached_item_meta_K';
// FOR V
const ITEM_CHUNK_PREFIX_V = 'cached_item_chunk_V';
const ITEM_META_KEY_V = 'cached_item_meta_V';
// FOR R
const ITEM_CHUNK_PREFIX_R = 'cached_item_chunk_R';
const ITEM_META_KEY_R = 'cached_item_meta_R';
const CHUNK_SIZE = 500;

// ════════════════════════ CACHING LOGIC (AsyncStorage) ═════════════════════

export const getCachedEvents = async () => {
  try {
    const data = await AsyncStorage.getItem(EVENTS_CACHE_KEY);
    return data ? JSON.parse(data) : null;
  } catch (e) {
    return null;
  }
};

export const setCachedEvents = async events => {
  try {
    await AsyncStorage.setItem(EVENTS_CACHE_KEY, JSON.stringify(events));
  } catch (e) {
    console.log('Failed to cache events', e);
  }
};

export const clearCachedEvents = async () => {
  try {
    await AsyncStorage.removeItem(EVENTS_CACHE_KEY);
  } catch (e) { }
};

export const getCachedPrp = async () => {
  try {
    const data = await AsyncStorage.getItem(PRP_CACHE_KEY);
    return data ? JSON.parse(data) : null;
  } catch (e) {
    return null;
  }
};

export const setCachedPrp = async prp => {
  try {
    await AsyncStorage.setItem(PRP_CACHE_KEY, JSON.stringify(prp));
  } catch (e) {
    console.log('Failed to cache prp', e);
  }
};

export const clearCachedPrp = async () => {
  try {
    await AsyncStorage.removeItem(PRP_CACHE_KEY);
  } catch (e) { }
};

// Chunked caching for designs
export const setCachedDesing = async designs => {
  try {
    const chunks = [];
    for (let i = 0; i < designs.length; i += CHUNK_SIZE) {
      chunks.push(designs.slice(i, i + CHUNK_SIZE));
    }

    for (let i = 0; i < chunks.length; i++) {
      await AsyncStorage.setItem(
        `${DESIGNS_CHUNK_PREFIX}${i}`,
        JSON.stringify(chunks[i]),
      );
    }

    await AsyncStorage.setItem(
      DESIGNS_META_KEY,
      JSON.stringify({ totalChunks: chunks.length }),
    );

    await AsyncStorage.removeItem('cached_designs');
  } catch (e) {
    console.log('Failed to cache designs (chunked)', e);
  }
};

export const getCachedDesign = async () => {
  try {
    const metaStr = await AsyncStorage.getItem(DESIGNS_META_KEY);
    if (!metaStr) return null;

    const meta = JSON.parse(metaStr);
    const allDesigns = [];

    for (let i = 0; i < meta.totalChunks; i++) {
      const chunkStr = await AsyncStorage.getItem(`${DESIGNS_CHUNK_PREFIX}${i}`);
      if (chunkStr) {
        const chunk = JSON.parse(chunkStr);
        allDesigns.push(...chunk);
      }
    }

    return allDesigns;
  } catch (e) {
    console.log('Failed to get cached designs (chunked)', e);
    return null;
  }
};

export const clearCachedDesing = async () => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const chunkKeys = keys.filter(
      k => k.startsWith(DESIGNS_CHUNK_PREFIX) || k === DESIGNS_META_KEY,
    );
    await AsyncStorage.multiRemove(chunkKeys);
    await AsyncStorage.removeItem('cached_designs');
  } catch (e) {
    console.log('Failed to clear cached designs', e);
  }
};

// Chunked caching for items
// FOR S
export const setCachedItem = async items => {
  try {
    const chunks = [];
    for (let i = 0; i < items.length; i += CHUNK_SIZE) {
      chunks.push(items.slice(i, i + CHUNK_SIZE));
    }

    for (let i = 0; i < chunks.length; i++) {
      await AsyncStorage.setItem(
        `${ITEM_CHUNK_PREFIX}${i}`,
        JSON.stringify(chunks[i]),
      );
    }

    await AsyncStorage.setItem(
      ITEM_META_KEY,
      JSON.stringify({ totalChunks: chunks.length }),
    );

    await AsyncStorage.removeItem('cached_items');
  } catch (e) {
    console.log('Failed to cache items (chunked)', e);
  }
};

export const getCachedItem = async () => {
  try {
    const metaStr = await AsyncStorage.getItem(ITEM_META_KEY);
    if (!metaStr) return null;

    const meta = JSON.parse(metaStr);
    const allItems = [];

    for (let i = 0; i < meta.totalChunks; i++) {
      const chunkStr = await AsyncStorage.getItem(`${ITEM_CHUNK_PREFIX}${i}`);
      if (chunkStr) {
        const chunk = JSON.parse(chunkStr);
        allItems.push(...chunk);
      }
    }

    return allItems;
  } catch (e) {
    console.log('Failed to get cached items (chunked)', e);
    return null;
  }
};

export const clearCachedItem = async () => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const chunkKeys = keys.filter(
      k => k.startsWith(ITEM_CHUNK_PREFIX) || k === ITEM_META_KEY,
    );
    await AsyncStorage.multiRemove(chunkKeys);
    await AsyncStorage.removeItem('cached_items');
  } catch (e) {
    console.log('Failed to clear cached items', e);
  }
};

// FOR K
export const setCachedItemK = async items => {
  try {
    const chunks = [];
    for (let i = 0; i < items.length; i += CHUNK_SIZE) {
      chunks.push(items.slice(i, i + CHUNK_SIZE));
    }

    for (let i = 0; i < chunks.length; i++) {
      await AsyncStorage.setItem(
        `${ITEM_CHUNK_PREFIX_K}${i}`,
        JSON.stringify(chunks[i]),
      );
    }

    await AsyncStorage.setItem(
      ITEM_META_KEY_K,
      JSON.stringify({ totalChunks: chunks.length }),
    );

    await AsyncStorage.removeItem('cached_items');
  } catch (e) {
    console.log('Failed to cache items (chunked)', e);
  }
};

export const getCachedItemK = async () => {
  try {
    const metaStr = await AsyncStorage.getItem(ITEM_META_KEY_K);
    if (!metaStr) return null;

    const meta = JSON.parse(metaStr);
    const allItems = [];

    for (let i = 0; i < meta.totalChunks; i++) {
      const chunkStr = await AsyncStorage.getItem(`${ITEM_CHUNK_PREFIX_K}${i}`);
      if (chunkStr) {
        const chunk = JSON.parse(chunkStr);
        allItems.push(...chunk);
      }
    }

    return allItems;
  } catch (e) {
    console.log('Failed to get cached items (chunked)', e);
    return null;
  }
};

export const clearCachedItemK = async () => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const chunkKeys = keys.filter(
      k => k.startsWith(ITEM_CHUNK_PREFIX_K) || k === ITEM_META_KEY_K,
    );
    await AsyncStorage.multiRemove(chunkKeys);
    await AsyncStorage.removeItem('cached_items');
  } catch (e) {
    console.log('Failed to clear cached items', e);
  }
};

// FOR V
export const setCachedItemV = async items => {
  try {
    const chunks = [];
    for (let i = 0; i < items.length; i += CHUNK_SIZE) {
      chunks.push(items.slice(i, i + CHUNK_SIZE));
    }

    for (let i = 0; i < chunks.length; i++) {
      await AsyncStorage.setItem(
        `${ITEM_CHUNK_PREFIX_V}${i}`,
        JSON.stringify(chunks[i]),
      );
    }

    await AsyncStorage.setItem(
      ITEM_META_KEY_V,
      JSON.stringify({ totalChunks: chunks.length }),
    );

    await AsyncStorage.removeItem('cached_items');
  } catch (e) {
    console.log('Failed to cache items (chunked)', e);
  }
};

export const getCachedItemV = async () => {
  try {
    const metaStr = await AsyncStorage.getItem(ITEM_META_KEY_V);
    if (!metaStr) return null;

    const meta = JSON.parse(metaStr);
    const allItems = [];

    for (let i = 0; i < meta.totalChunks; i++) {
      const chunkStr = await AsyncStorage.getItem(`${ITEM_CHUNK_PREFIX_V}${i}`);
      if (chunkStr) {
        const chunk = JSON.parse(chunkStr);
        allItems.push(...chunk);
      }
    }

    return allItems;
  } catch (e) {
    console.log('Failed to get cached items (chunked)', e);
    return null;
  }
};

export const clearCachedItemV= async () => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const chunkKeys = keys.filter(
      k => k.startsWith(ITEM_CHUNK_PREFIX_V) || k === ITEM_META_KEY_V,
    );
    await AsyncStorage.multiRemove(chunkKeys);
    await AsyncStorage.removeItem('cached_items');
  } catch (e) {
    console.log('Failed to clear cached items', e);
  }
};

// FOR R
export const setCachedItemR = async items => {
  try {
    const chunks = [];
    for (let i = 0; i < items.length; i += CHUNK_SIZE) {
      chunks.push(items.slice(i, i + CHUNK_SIZE));
    }

    for (let i = 0; i < chunks.length; i++) {
      await AsyncStorage.setItem(
        `${ITEM_CHUNK_PREFIX_R}${i}`,
        JSON.stringify(chunks[i]),
      );
    }

    await AsyncStorage.setItem(
      ITEM_META_KEY_R,
      JSON.stringify({ totalChunks: chunks.length }),
    );

    await AsyncStorage.removeItem('cached_items');
  } catch (e) {
    console.log('Failed to cache items R (chunked)', e);
  }
};

export const getCachedItemR = async () => {
  try {
    const metaStr = await AsyncStorage.getItem(ITEM_META_KEY_R);
    if (!metaStr) return null;

    const meta = JSON.parse(metaStr);
    const allItems = [];

    for (let i = 0; i < meta.totalChunks; i++) {
      const chunkStr = await AsyncStorage.getItem(`${ITEM_CHUNK_PREFIX_R}${i}`);
      if (chunkStr) {
        const chunk = JSON.parse(chunkStr);
        allItems.push(...chunk);
      }
    }

    return allItems;
  } catch (e) {
    console.log('Failed to get cached R items (chunked)', e);
    return null;
  }
};

export const clearCachedItemR = async () => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const chunkKeys = keys.filter(
      k => k.startsWith(ITEM_CHUNK_PREFIX_R) || k === ITEM_META_KEY_R,
    );
    await AsyncStorage.multiRemove(chunkKeys);
    await AsyncStorage.removeItem('cached_items');
  } catch (e) {
    console.log('Failed to clear cached R items', e);
  }
};

// ═══════════════════ DATABASE (react-native-sqlite-storage) ════════════════
//
// react-native-sqlite-storage only exposes one primitive: `executeSql(sql,
// params)`, which resolves to `[ResultSet]`. To avoid rewriting every query
// in this file, we wrap the raw db connection in a small adapter that
// exposes the same execAsync / runAsync / getAllAsync / getFirstAsync
// methods the rest of this file already calls — so everything below this
// section works unchanged.

function wrapDb(rawDb) {
  return {
    // Underlying react-native-sqlite-storage connection, in case it's ever
    // needed directly (e.g. rawDb.transaction(...)).
    raw: rawDb,

    // Schema / PRAGMA / single statements without params.
    execAsync: async sql => {
      await rawDb.executeSql(sql);
    },

    // INSERT / UPDATE / DELETE with params.
    runAsync: async (sql, params = []) => {
      const [result] = await rawDb.executeSql(sql, params);
      return {
        insertId: result.insertId,
        rowsAffected: result.rowsAffected,
      };
    },

    // SELECT → array of plain row objects.
    getAllAsync: async (sql, params = []) => {
      const [result] = await rawDb.executeSql(sql, params);
      const rows = [];
      for (let i = 0; i < result.rows.length; i++) {
        rows.push(result.rows.item(i));
      }
      return rows;
    },

    // SELECT → single row object (or null).
    getFirstAsync: async (sql, params = []) => {
      const [result] = await rawDb.executeSql(sql, params);
      return result.rows.length > 0 ? result.rows.item(0) : null;
    },
  };
}

let dbPromise = null;

async function openAndPrepare() {
  const rawDb = await SQLite.openDatabase({
    name: DB_NAME,
    location: 'default',
  });

  const db = wrapDb(rawDb);

  // WAL mode: best-effort. Some Android SQLite builds ignore/reject this
  // pragma — don't let it block app startup if it fails.
  try {
    await db.execAsync('PRAGMA journal_mode = WAL;');
  } catch (e) {
    console.log('journal_mode=WAL not applied', e?.message);
  }

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

  await addColumnIfMissing(db, 'event_code', 'TEXT');
  await addColumnIfMissing(db, 'items_json', 'TEXT');

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
        console.log('Events cached during initDb');
      }
    } catch (error) {
      console.log('Failed to fetch events during initDb', error.message);
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
        console.log('prp cached during initDb');
      }
    } catch (error) {
      console.log('Failed to fetch prp during initDb', error.message);
    }
  }

  // Fetch and cache designs
  if (token && prptype) {
    try {
      const yearno = getCurrentFinancialYear();
      const q = '';
      const response = await api.get(`${API}/api/designs/search`, {
        params: { q, prptype, yearno },
        headers: { Authorization: `Bearer ${token}` },
      });
      const allDesigns = response.data.data;
      if (allDesigns && allDesigns.length) {
        await setCachedDesing(allDesigns);
        console.log('Designs cached during initDb', allDesigns.length);
      }
    } catch (error) {
      console.log('Failed to fetch Designs during initDb', error.message);
    }
  }

  // Fetch and cache Items
  // FOR S
  if (token && prptype) {
    try {
      const yearno = getCurrentFinancialYear();
      const q = '';
      const response = await api.get(`${API}/api/geteventitem`, {
        params: { prptype: 'S', yearno },
        headers: { Authorization: `Bearer ${token}` },
      });
      const allItems = response.data.data;
      if (allItems && allItems.length) {
        await setCachedItem(allItems);
        console.log('Items S cached during initDb', allItems.length);
      }
    } catch (error) {
      console.log('Failed to fetch Items during initDb', error.message);
    }
  }
  // FOR K
  if (token && prptype) {
    try {
      const yearno = getCurrentFinancialYear();
      const q = '';
      const response = await api.get(`${API}/api/geteventitem`, {
        params: { prptype: 'K', yearno },
        headers: { Authorization: `Bearer ${token}` },
      });
      const allItems = response.data.data;
      if (allItems && allItems.length) {
        await setCachedItemK(allItems);
        console.log('Items K cached during initDb', allItems.length);
      }
    } catch (error) {
      console.log('Failed to fetch Items during initDb', error.message);
    }
  }
  // FOR V
  if (token && prptype) {
    try {
      const yearno = getCurrentFinancialYear();
      const q = '';
      const response = await api.get(`${API}/api/geteventitem`, {
        params: { prptype: 'V', yearno },
        headers: { Authorization: `Bearer ${token}` },
      });
      const allItems = response.data.data;
      if (allItems && allItems.length) {
        await setCachedItemV(allItems);
        console.log('Items V cached during initDb', allItems.length);
      }
    } catch (error) {
      console.log('Failed to fetch Items during initDb', error.message);
    }
  }
  // FOR R
  if (token && prptype) {
    console.log('Fetching Items R during initDb');
    try {
      const yearno = getCurrentFinancialYear();
      const q = '';
      const response = await api.get(`${API}/api/geteventitem`, {
        params: { prptype: 'R', yearno },
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log('Items R response:', response.data);
      const allItems = response.data.data;
      if (allItems && allItems.length) {
        await setCachedItemR(allItems);
        console.log('Items R cached during initDb', allItems.length);
      }
    } catch (error) {
      console.log('Failed to fetch Items during initDb', error.message);
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
      enquiry.party_name || '',
      enquiry.address || '',
      enquiry.gst_no || '',
      enquiry.contact_name || '',
      enquiry.designation || '',
      enquiry.mobile || '',
      enquiry.email || '',
      enquiry.front_img || '',
      enquiry.back_img || '',
      enquiry.card_front_uri || '',
      JSON.stringify(enquiry.reference_photos || []),
      enquiry.scanned_from_card ? 1 : 0,
      'pending',
      now,
      now,
      enquiry.event_code || '',
      JSON.stringify(enquiry.items || []),
    ],
  );

  return localId;
}

export async function getPendingEnquiries() {
  const db = await getDb();
  return db.getAllAsync(
    `SELECT * FROM enquiries
     WHERE sync_status IN ('pending','failed') AND is_deleted = 0`,
  );
}

export async function getAllEnquiries() {
  const db = await getDb();
  return db.getAllAsync(
    `SELECT * FROM enquiries 
     WHERE is_deleted = 0
     ORDER BY created_at DESC`,
  );
}

export async function deleteAllEnquiriesFromDB() {
  const db = await getDb();
  return db.getAllAsync(
    `DELETE FROM enquiries`,
  );
}

export async function markSynced(localId, serverId) {
  const db = await getDb();
  await db.runAsync(
    `UPDATE enquiries
     SET server_id = ?, sync_status = 'synced', updated_at = ?
     WHERE local_id = ?`,
    [serverId, Date.now(), localId],
  );
}

export async function markFailed(localId) {
  const db = await getDb();
  await db.runAsync(
    `UPDATE enquiries
     SET sync_status = 'failed', updated_at = ?
     WHERE local_id = ?`,
    [Date.now(), localId],
  );
}

export async function markSyncing(localId) {
  const db = await getDb();
  await db.runAsync(
    `UPDATE enquiries SET sync_status = 'syncing' WHERE local_id = ?`,
    [localId],
  );
}

export const updateEnquiryLocally = async (localId, updatedData) => {
  const db = await getDb();
  const fields = [
    'party_name',
    'address',
    'gst_no',
    'contact_name',
    'designation',
    'mobile',
    'email',
    'front_img',
    'back_img',
    'card_front_uri',
    'scanned_from_card',
    'event_code',
    'items_json',
  ];

  const setClause = fields.map(f => `${f} = ?`).join(', ');
  const fieldValues = fields.map(f => {
    if (f === 'items_json' && updatedData[f]) {
      return JSON.stringify(updatedData[f]);
    }
    return updatedData[f] ?? null;
  });

  await db.runAsync(
    `UPDATE enquiries
     SET ${setClause}, sync_status = 'pending', updated_at = ?
     WHERE local_id = ?`,
    [...fieldValues, Date.now(), localId],
  );
};

export default getDb;