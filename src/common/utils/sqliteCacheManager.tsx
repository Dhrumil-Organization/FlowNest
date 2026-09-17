// // sqliteCacheManager.ts
// // import SQLite from 'react-native-sqlite-storage';
// import axios from 'axios';
// import * as SQLite from 'expo-sqlite';
// import { API } from '../API/dynamicAPI';

// // Define types
// interface PartyData {
//     acccode?: string;  // Updated to match API
//     accname?: string;
//     address?: string;
//     email?: string;
//     gstin?: string;
//     ordno?: string;
//     [k: string]: any;
// }

// interface ItemData {
//     itmcode: string;
//     itmname: string;
//     lastrate: string;
// }

// interface ShadeData {
//     shdcode: string;
//     shdname: string;
// }

// // Open or create the SQLite database for GlobalCache
// // const globalCacheDB = SQLite.openDatabase(
// //     { name: 'GlobalCache.db', location: 'default' },
// //     () => console.log('✅ GlobalCache.db opened/created successfully'),
// //     (error) => console.error('❌ Error opening GlobalCache.db:', error)
// // );

// // Open or create the SQLite database
// // let globalCacheDB: SQLite.SQLiteDatabase;
// let globalCacheDB: any;

// // const openGlobalCacheDB = async (): Promise<SQLite.SQLiteDatabase> => {
// //     return new Promise((resolve, reject) => {
// //         const db = SQLite.openDatabase(
// //             { name: 'GlobalCache.db', location: 'default' },
// //             (db) => {
// //                 console.log('✅ GlobalCache.db opened successfully');
// //                 resolve(db);
// //             },
// //             (error) => {
// //                 console.error('❌ Error opening GlobalCache.db:', error);
// //                 reject(error);
// //             }
// //         );
// //     });
// // };
// // const openGlobalCacheDB = async (): Promise<SQLite.SQLiteDatabase> => {
// //     try {
// //         const db = SQLite.openDatabase('GlobalCache.db');
// //         console.log('✅ GlobalCache.db opened successfully');
// //         return db;
// //     } catch (error) {
// //         console.error('❌ Error opening GlobalCache.db:', error);
// //         throw error;
// //     }
// // };
// const openGlobalCacheDB = async (): Promise<any> => {
//     try {
//         const db = SQLite.openDatabaseSync('GlobalCache.db');
//         console.log('✅ GlobalCache.db opened successfully');
//         return db;
//     } catch (error) {
//         console.error('❌ Error opening GlobalCache.db:', error);
//         throw error;
//     }
// };

// // Initialize tables (call this once at app startup)
// // Initialize tables (call this once at app startup)
// // export const initGlobalCacheDB = async (): Promise<void> => {
// //     console.log('🔧 Initializing GlobalCache.db tables...');
// //     try {
// //         globalCacheDB = await openGlobalCacheDB();
// //         return new Promise((resolve, reject) => {
// //             globalCacheDB.transaction((tx) => {
// //                 // Party table (updated to match API response)
// //                 tx.executeSql(
// //                     `CREATE TABLE IF NOT EXISTS party (
// //                         acccode TEXT PRIMARY KEY,  -- Changed from 'accode' to 'acccode'
// //                         accname TEXT,
// //                         address TEXT,
// //                         email TEXT,
// //                         gstin TEXT,
// //                         ordno TEXT
// //                     )`,
// //                     [],
// //                     () => console.log('✅ Party table created/ready'),
// //                     (_, error) => {
// //                         console.error('❌ Error creating party table:', error);
// //                         return false;
// //                     }
// //                 );

// //                 // Item table
// //                 tx.executeSql(
// //                     `CREATE TABLE IF NOT EXISTS item (
// //                         itmcode TEXT PRIMARY KEY,
// //                         itmname TEXT,
// //                         lastrate TEXT
// //                     )`,
// //                     [],
// //                     () => console.log('✅ Item table created/ready'),
// //                     (_, error) => {
// //                         console.error('❌ Error creating item table:', error);
// //                         return false;
// //                     }
// //                 );

// //                 // Shade table
// //                 tx.executeSql(
// //                     `CREATE TABLE IF NOT EXISTS shade (
// //                         shdcode TEXT PRIMARY KEY,
// //                         shdname TEXT
// //                     )`,
// //                     [],
// //                     () => console.log('✅ Shade table created/ready'),
// //                     (_, error) => {
// //                         console.error('❌ Error creating shade table:', error);
// //                         return false;
// //                     }
// //                 );
// //             },
// //                 (error) => {
// //                     console.error('❌ Transaction error during table initialization:', error);
// //                     reject(error);
// //                 },
// //                 () => {
// //                     console.log('✅ All GlobalCache.db tables initialized successfully');
// //                     resolve();
// //                 });
// //         });
// //     } catch (error) {
// //         console.error('❌ Failed to initialize GlobalCache.db:', error);
// //         throw error;
// //     }
// // };
// export const initGlobalCacheDB = async (): Promise<void> => {
//     console.log('🔧 Initializing GlobalCache.db tables...');

//     globalCacheDB = await openGlobalCacheDB();

//     try {
//         await globalCacheDB.execAsync(`
//             CREATE TABLE IF NOT EXISTS party (
//                 acccode TEXT PRIMARY KEY,
//                 accname TEXT,
//                 address TEXT,
//                 email TEXT,
//                 gstin TEXT,
//                 ordno TEXT
//             );
//         `);

//         await globalCacheDB.execAsync(`
//             CREATE TABLE IF NOT EXISTS item (
//                 itmcode TEXT PRIMARY KEY,
//                 itmname TEXT,
//                 lastrate TEXT
//             );
//         `);

//         await globalCacheDB.execAsync(`
//             CREATE TABLE IF NOT EXISTS shade (
//                 shdcode TEXT PRIMARY KEY,
//                 shdname TEXT
//             );
//         `);

//         console.log('✅ Tables ready');
//     } catch (error) {
//         console.error('❌ Error creating tables:', error);
//         throw error;
//     }
// };


// // Fetch data from API and cache in SQLite
// export const fetchAndCacheGlobalData = async (token: string, forceRefresh: boolean = false): Promise<void> => {
//     console.log('🔄 Fetching global data...');

//     // Check if data already exists in cache
//     const cachedParty = await getCachedGlobalData('party').catch(() => []);
//     const cachedItem = await getCachedGlobalData('item').catch(() => []);
//     const cachedShade = await getCachedGlobalData('shade').catch(() => []);

//     // If data exists and forceRefresh is false, skip API call
//     if (cachedParty.length > 0 && cachedItem.length > 0 && cachedShade.length > 0 && !forceRefresh) {
//         console.log('✅ Using cached data (skipping API call)');
//         return;
//     }

//     try {
//         console.log('🌐 Fetching fresh data from API...');
//         const response = await axios.post(
//             `${API}/api/get_mobile_user_details`,
//             { prptype: 'R' },
//             {
//                 headers: {
//                     Authorization: `Bearer ${token}`,
//                     'Content-Type': 'application/json',
//                     Accept: 'application/json',
//                 },
//             }
//         );

//         console.log('✅ API response received. Parsing data...');
//         const partyData: PartyData[] = response?.data?.response?.party || [];
//         const itemData: ItemData[] = response?.data?.response?.item || [];
//         const shadeData: ShadeData[] = response?.data?.response?.shade || [];

//         console.log(`📊 Data counts: Party=${partyData.length}, Item=${itemData.length}, Shade=${shadeData.length}`);

//         // Clear old data
//         await clearAllGlobalCacheData();
//         console.log('🧹 Old data cleared. Inserting new data...');

//         // Insert new data in batches
//         await insertBatch('party', partyData);
//         await insertBatch('item', itemData);
//         await insertBatch('shade', shadeData);

//         console.log('✅ Global data cached in GlobalCache.db successfully');
//     } catch (error) {
//         console.error('❌ Failed to fetch/cache global data:', error);
//         throw error;
//     }
// };




// // Insert data in batches (for performance)
// // Insert data in batches (for performance)
// // const insertBatch = async (table: string, data: any[]): Promise<void> => {
// //     console.log(`📤 Inserting ${data.length} records into ${table}...`);
// //     return new Promise((resolve, reject) => {
// //         globalCacheDB.execAsync(
// //             (tx) => {
// //                 data.forEach((item, index) => {
// //                     const columns = Object.keys(item).join(',');
// //                     const placeholders = Object.keys(item).map(() => '?').join(',');
// //                     const values = Object.values(item);
// //                     tx.executeSql(
// //                         `INSERT INTO ${table} (${columns}) VALUES (${placeholders})`,
// //                         values,
// //                         () => { },
// //                         (_, error) => {
// //                             console.error(`❌ Error inserting record ${index} into ${table}:`, error);
// //                             return false;
// //                         }
// //                     );
// //                 });
// //             },
// //             (error) => {
// //                 // Only reject if the error is not `undefined`
// //                 if (error) {
// //                     console.error(`❌ Transaction error during insert into ${table}:`, error);
// //                     reject(error);
// //                 } else {
// //                     console.log(`✅ Inserted ${data.length} records into ${table}`);
// //                     resolve();
// //                 }
// //             },
// //             () => {
// //                 // This callback is called if all operations succeed
// //                 console.log(`✅ Inserted ${data.length} records into ${table}`);
// //                 resolve();
// //             }
// //         );
// //     });
// // };
// const insertBatch = async (table: string, data: any[]): Promise<void> => {
//     for (const item of data) {
//         const columns = Object.keys(item).join(',');
//         const placeholders = Object.keys(item).map(() => '?').join(',');
//         const values = Object.values(item);

//         await globalCacheDB.runAsync(
//             `INSERT INTO ${table} (${columns}) VALUES (${placeholders})`,
//             values
//         );
//     }
// };


// // Clear all data from all tables in GlobalCache.db
// // Clear all data from all tables in GlobalCache.db
// // export const clearAllGlobalCacheData = async (): Promise<void> => {
// //     console.log('🧹 Clearing all data from GlobalCache.db tables...');
// //     return new Promise((resolve, reject) => {
// //         globalCacheDB.execAsync(
// //             (tx) => {
// //                 tx.executeSql(
// //                     'DELETE FROM party',
// //                     [],
// //                     () => console.log('✅ Party table cleared'),
// //                     (_, error) => {
// //                         console.error('❌ Error clearing party table:', error);
// //                         return false;
// //                     }
// //                 );
// //                 tx.executeSql(
// //                     'DELETE FROM item',
// //                     [],
// //                     () => console.log('✅ Item table cleared'),
// //                     (_, error) => {
// //                         console.error('❌ Error clearing item table:', error);
// //                         return false;
// //                     }
// //                 );
// //                 tx.executeSql(
// //                     'DELETE FROM shade',
// //                     [],
// //                     () => console.log('✅ Shade table cleared'),
// //                     (_, error) => {
// //                         console.error('❌ Error clearing shade table:', error);
// //                         return false;
// //                     }
// //                 );
// //             },
// //             (error) => {
// //                 // Only reject if the error is not `undefined`
// //                 if (error) {
// //                     console.error('❌ Transaction error during clear:', error);
// //                     reject(error);
// //                 } else {
// //                     console.log('✅ All GlobalCache.db tables cleared successfully');
// //                     resolve();
// //                 }
// //             },
// //             () => {
// //                 // This callback is called if all operations succeed
// //                 console.log('✅ All GlobalCache.db tables cleared successfully');
// //                 resolve();
// //             }
// //         );
// //     });
// // };
// export const clearAllGlobalCacheData = async (): Promise<void> => {
//     await globalCacheDB.execAsync('DELETE FROM party');
//     await globalCacheDB.execAsync('DELETE FROM item');
//     await globalCacheDB.execAsync('DELETE FROM shade');
// };


// // Get all data from a table in GlobalCache.db
// // export const getCachedGlobalData = async (table: string): Promise<any[]> => {
// //     console.log(`🔍 Fetching all data from ${table}...`);
// //     return new Promise((resolve, reject) => {
// //         // globalCacheDB.execAsync((tx) => {
// //         globalCacheDB.transaction((tx) => {
// //             tx.executeSql(
// //                 `SELECT * FROM ${table}`,
// //                 [],
// //                 (_, { rows }) => {
// //                     const data = rows.raw();
// //                     console.log(`✅ Fetched ${data.length} records from ${table}`);
// //                     resolve(data);
// //                 },
// //                 (_, error) => {
// //                     console.error(`❌ Error fetching data from ${table}:`, error);
// //                     reject(error);
// //                 }
// //             );
// //         });
// //     });
// // };
// export const getCachedGlobalData = async (table: string): Promise<any[]> => {
//     try {
//         const res = await globalCacheDB.getAllAsync(`SELECT * FROM ${table}`);
//         return res;
//     } catch (error) {
//         console.error(`❌ Error fetching ${table}:`, error);
//         return [];
//     }
// };

// // Background update (call this every hour or as needed)
// export const updateGlobalCacheInBackground = async (token: string): Promise<void> => {
//     console.log('🔄 Starting background update for global data...');
//     try {
//         await fetchAndCacheGlobalData(token, true); // Force refresh
//         console.log('✅ Background update completed successfully');
//     } catch (error) {
//         if (error) {
//             console.error('❌ Background update failed:', error);
//         } else {
//             console.log('✅ Background update completed (no changes)');
//         }
//     }
// };


// sqliteCacheManager.ts
import axios from 'axios';
import * as SQLite from 'expo-sqlite';
import { API } from '../API/dynamicAPI';

// Define types
interface PartyData {
    acccode?: string;  // Updated to match API
    accname?: string;
    address?: string;
    email?: string;
    gstin?: string;
    ordno?: string;
    [k: string]: any;
}

interface ItemData {
    itmcode: string;
    itmname: string;
    lastrate: string;
}

interface ShadeData {
    shdcode: string;
    shdname: string;
}

const DB_NAME = 'GlobalCache.db';

// ── Single shared "open + create tables" promise ────────────────────────────
// Every caller (RootLayout on app boot, LoginScreen after login, etc.) awaits
// the SAME promise instead of each opening its own SQLite connection. That's
// what was causing the NullPointerException: two concurrent
// openDatabaseSync()+execAsync() calls racing against the same underlying
// GlobalCache.db file. Now openAndPrepare() runs exactly once per app session.
let dbPromise: Promise<any> | null = null;

async function openAndPrepare(): Promise<any> {
    const db = SQLite.openDatabaseSync(DB_NAME);

    // WAL mode lets reads/writes coexist safely instead of hard-locking the
    // file — same setting already used for bharattex.db.
    await db.execAsync('PRAGMA journal_mode = WAL;');

    await db.execAsync(`
        CREATE TABLE IF NOT EXISTS party (
            acccode TEXT PRIMARY KEY,
            accname TEXT,
            address TEXT,
            email TEXT,
            gstin TEXT,
            ordno TEXT
        );
    `);

    await db.execAsync(`
        CREATE TABLE IF NOT EXISTS item (
            itmcode TEXT PRIMARY KEY,
            itmname TEXT,
            lastrate TEXT
        );
    `);

    await db.execAsync(`
        CREATE TABLE IF NOT EXISTS shade (
            shdcode TEXT PRIMARY KEY,
            shdname TEXT
        );
    `);

    console.log('✅ GlobalCache.db opened and tables ready');
    return db;
}

async function getGlobalCacheDb(): Promise<any> {
    if (!dbPromise) {
        dbPromise = openAndPrepare();
    }
    return dbPromise;
}

// Kept as a named export with the same signature so nothing calling it needs
// to change — it's now just "make sure the shared db is opened & ready".
// Safe to call from multiple places (RootLayout, LoginScreen, ...): the
// second+ calls just await the same already-resolved/resolving promise.
export const initGlobalCacheDB = async (): Promise<void> => {
    console.log('🔧 Initializing GlobalCache.db tables...');
    await getGlobalCacheDb();
};

// Fetch data from API and cache in SQLite
export const fetchAndCacheGlobalData = async (token: string, forceRefresh: boolean = false): Promise<void> => {
    console.log('🔄 Fetching global data...');

    // Check if data already exists in cache
    const cachedParty = await getCachedGlobalData('party').catch(() => []);
    const cachedItem = await getCachedGlobalData('item').catch(() => []);
    const cachedShade = await getCachedGlobalData('shade').catch(() => []);

    // If data exists and forceRefresh is false, skip API call
    if (cachedParty.length > 0 && cachedItem.length > 0 && cachedShade.length > 0 && !forceRefresh) {
        console.log('✅ Using cached data (skipping API call)');
        return;
    }

    try {
        console.log('🌐 Fetching fresh data from API...');
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

        console.log('✅ API response received. Parsing data...');
        const partyData: PartyData[] = response?.data?.response?.party || [];
        const itemData: ItemData[] = response?.data?.response?.item || [];
        const shadeData: ShadeData[] = response?.data?.response?.shade || [];

        console.log(`📊 Data counts: Party=${partyData.length}, Item=${itemData.length}, Shade=${shadeData.length}`);

        // Clear old data
        await clearAllGlobalCacheData();
        console.log('🧹 Old data cleared. Inserting new data...');

        // Insert new data in batches
        await insertBatch('party', partyData);
        await insertBatch('item', itemData);
        await insertBatch('shade', shadeData);

        console.log('✅ Global data cached in GlobalCache.db successfully');
    } catch (error) {
        console.error('❌ Failed to fetch/cache global data:', error);
        throw error;
    }
};

// Insert data in batches (for performance)
const insertBatch = async (table: string, data: any[]): Promise<void> => {
    if (!data || data.length === 0) return;
    const db = await getGlobalCacheDb();
    console.log(`📤 Inserting ${data.length} records into ${table}...`);
    for (const item of data) {
        const columns = Object.keys(item).join(',');
        const placeholders = Object.keys(item).map(() => '?').join(',');
        const values = Object.values(item);

        await db.runAsync(
            `INSERT INTO ${table} (${columns}) VALUES (${placeholders})`,
            values
        );
    }
};

// Clear all data from all tables in GlobalCache.db
export const clearAllGlobalCacheData = async (): Promise<void> => {
    const db = await getGlobalCacheDb();
    await db.execAsync('DELETE FROM party');
    await db.execAsync('DELETE FROM item');
    await db.execAsync('DELETE FROM shade');
};

// Get all data from a table in GlobalCache.db
export const getCachedGlobalData = async (table: string): Promise<any[]> => {
    try {
        const db = await getGlobalCacheDb();
        const res = await db.getAllAsync(`SELECT * FROM ${table}`);
        return res;
    } catch (error) {
        console.error(`❌ Error fetching ${table}:`, error);
        return [];
    }
};

// Background update (call this every hour or as needed)
export const updateGlobalCacheInBackground = async (token: string): Promise<void> => {
    console.log('🔄 Starting background update for global data...');
    try {
        await fetchAndCacheGlobalData(token, true); // Force refresh
        console.log('✅ Background update completed successfully');
    } catch (error) {
        if (error) {
            console.error('❌ Background update failed:', error);
        } else {
            console.log('✅ Background update completed (no changes)');
        }
    }
};