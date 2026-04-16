import * as SQLite from 'expo-sqlite';

// GlobalCache DB
const globalDB = SQLite.openDatabaseSync('GlobalCache.db');

// Chat DB
const chatDB = SQLite.openDatabaseSync('chat.db');

// 🔥 MAIN FUNCTION
export const clearAllMasterDatabases = async () => {
  try {
    console.log("🧹 Clearing ALL databases...");

    // -------- GLOBAL CACHE --------
    await globalDB.execAsync('DELETE FROM party');
    await globalDB.execAsync('DELETE FROM item');
    await globalDB.execAsync('DELETE FROM shade');

    console.log("✅ GlobalCache.db cleared");

    return true;
  } catch (err) {
    console.log("❌ DB CLEAR ERROR:", err);
    return false;
  }
};

export const clearAllChatDatabases = async () => {
  try {
    console.log("🧹 Clearing ALL databases...");

    // -------- CHAT DB --------
    await chatDB.execAsync('DELETE FROM chat');

    console.log("✅ chat.db cleared");

    return true;
  } catch (err) {
    console.log("❌ DB CLEAR ERROR:", err);
    return false;
  }
};

export const clearAllAppDatabases = async () => {
  try {
    console.log("🧹 Clearing ALL databases...");

    // -------- GLOBAL CACHE --------
    await globalDB.execAsync('DELETE FROM party');
    await globalDB.execAsync('DELETE FROM item');
    await globalDB.execAsync('DELETE FROM shade');

    console.log("✅ GlobalCache.db cleared");

    // -------- CHAT DB --------
    await chatDB.execAsync('DELETE FROM chat');

    console.log("✅ chat.db cleared");

    return true;
  } catch (err) {
    console.log("❌ DB CLEAR ERROR:", err);
    return false;
  }
};