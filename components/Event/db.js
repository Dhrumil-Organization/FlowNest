import SQLite from 'react-native-sqlite-storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './api'; // your axios instance
import { API } from '../../common/API/dynamicAPI';
import { getCurrentFinancialYear } from '../../common/commonfunction';
// import 'react-native-get-random-values';
// import { v4 as uuidv4 } from 'uuid';
const EVENTS_CACHE_KEY = 'cached_events';

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
  } catch (e) {}
};
//

const DESIGNS_CACHE_KEY = 'cached_designs';

export const getCachedDesign = async () => {
  try {
    const data = await AsyncStorage.getItem(DESIGNS_CACHE_KEY);
    return data ? JSON.parse(data) : null;
  } catch (e) {
    return null;
  }
};

export const setCachedDesing = async designs => {
  try {
    await AsyncStorage.setItem(DESIGNS_CACHE_KEY, JSON.stringify(designs));
  } catch (e) {
    console.log('Failed to cache events', e);
  }
};

export const clearCachedDesing = async () => {
  try {
    await AsyncStorage.removeItem(DESIGNS_CACHE_KEY);
  } catch (e) {}
};

SQLite.enablePromise(true);

let dbInstance = null;

async function getDb() {
  if (!dbInstance) {
    dbInstance = await SQLite.openDatabase({
      name: 'bharattex.db',
      location: 'default',
    });
  }
  return dbInstance;
}

export async function initDb(token, prptype) {
  const db = await getDb();

  await db.executeSql(`
    CREATE TABLE IF NOT EXISTS enquiries (
      local_id TEXT PRIMARY KEY NOT NULL,
      server_id INTEGER,
      user_id INTEGER NOT NULL,
      party_name TEXT,
      address TEXT,
      gst_no TEXT,
      design_requirement TEXT,
      design_name TEXT,
      qty_required TEXT,
      price TEXT,
      colour_requirement TEXT,
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
      design_dsn_code TEXT,
      design_dsn_name TEXT,
      is_deleted INTEGER DEFAULT 0
    );
  `);

  const [tables] = await db.executeSql(
    "SELECT name FROM sqlite_master WHERE type='table';",
  );

  console.log(tables.rows.raw());

  const [columns] = await db.executeSql('PRAGMA table_info(enquiries);');

  console.log(columns.rows.raw());

  try {
    await db.executeSql(`
      ALTER TABLE enquiries
      ADD COLUMN event_code TEXT;
    `);

    console.log('event_code column added');
  } catch (e) {
    console.log('event_code already exists');
  }
  try {
    await db.executeSql(`
      ALTER TABLE enquiries
      ADD COLUMN design_dsn_code TEXT;
    `);
    console.log('design_dsn_code column added');
  } catch (e) {
    console.log('design_dsn_code already exists');
  }

  try {
    await db.executeSql(`
      ALTER TABLE enquiries
      ADD COLUMN design_dsn_name TEXT;
    `);
    console.log('design_dsn_name column added');
  } catch (e) {
    console.log('design_dsn_name already exists');
  }

  // 2. If token and prptype are provided, fetch and cache events
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
      // If cache already exists from a previous session, keep it – no action needed
    }
  }

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
        console.log('Designs cached during initDb');
      }
    } catch (error) {
      console.log('Failed to fetch Designs during initDb', error.message);
      // If cache already exists from a previous session, keep it – no action needed
    }
  }
}

// export function generateLocalId() {
//   return uuidv4();
// }
export function generateLocalId() {
  return `ENQ_${Date.now()}_${Math.floor(Math.random() * 1000000)}`;
}

export async function insertEnquiry(enquiry) {
  const db = await getDb();

  const now = Date.now();
  const localId = enquiry.local_id || generateLocalId();

  await db.executeSql(
    `INSERT INTO enquiries (
      local_id, user_id, party_name, address, gst_no,
      design_requirement, design_name, qty_required, price,
      colour_requirement, contact_name, designation, mobile, email,
      front_img, back_img, card_front_uri, reference_photos,
      scanned_from_card, sync_status, created_at, updated_at, event_code, design_dsn_code, design_dsn_name
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      localId,
      enquiry.user_id,
      enquiry.party_name || '',
      enquiry.address || '',
      enquiry.gst_no || '',
      enquiry.design_requirement || '',
      enquiry.design_name || '',
      enquiry.qty_required || '',
      enquiry.price || '',
      enquiry.colour_requirement || '',
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
      enquiry.design_dsn_code || '',
      enquiry.design_dsn_name || '',
    ],
  );

  return localId;
}

export async function getPendingEnquiries() {
  const db = await getDb();

  const [result] = await db.executeSql(
    `SELECT * FROM enquiries 
     WHERE sync_status IN ('pending','failed')
     AND is_deleted = 0`,
  );

  return result.rows.raw();
}

export async function getAllEnquiries() {
  const db = await getDb();

  const [result] = await db.executeSql(
    `SELECT * FROM enquiries
     WHERE is_deleted = 0
     ORDER BY created_at DESC`,
  );

  return result.rows.raw();
}

export async function markSynced(localId, serverId) {
  const db = await getDb();

  await db.executeSql(
    `UPDATE enquiries
     SET server_id = ?,
         sync_status = 'synced',
         updated_at = ?
     WHERE local_id = ?`,
    [serverId, Date.now(), localId],
  );
}

export async function markFailed(localId) {
  const db = await getDb();

  await db.executeSql(
    `UPDATE enquiries
     SET sync_status = 'failed',
         updated_at = ?
     WHERE local_id = ?`,
    [Date.now(), localId],
  );
}

export async function markSyncing(localId) {
  const db = await getDb();

  await db.executeSql(
    `UPDATE enquiries
     SET sync_status = 'syncing'
     WHERE local_id = ?`,
    [localId],
  );
}

// db.js

export const updateEnquiryLocally = async (localId, updatedData) => {
  const db = await getDb();
  const fields = [
    'party_name',
    'address',
    'gst_no',
    'design_requirement',
    'qty_required',
    'price',
    'colour_requirement',
    'contact_name',
    'designation',
    'mobile',
    'email',
    'front_img',
    'back_img',
    'card_front_uri',
    'scanned_from_card',
    'event_code',
    'design_dsn_name',
    'design_dsn_code',
  ];

  const setClause = fields.map(f => `${f} = ?`).join(', ');
  const values = fields.map(f => updatedData[f] ?? null);
  values.push(localId); // for WHERE clause

  const query = `UPDATE enquiries SET ${setClause}, sync_status = 'pending', updated_at = CURRENT_TIMESTAMP WHERE local_id = ?`;
  await db.executeSql(query, values);
};

export default getDb;
