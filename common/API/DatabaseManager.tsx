// DatabaseManager.ts
import SQLite from 'react-native-sqlite-storage';
import { CachedPrptype } from './Functions';

// Database configuration
const DB_NAME = 'app_cache.db';
const DB_VERSION = '1.0';
const DB_DISPLAY_NAME = 'App Cache Database';
const DB_SIZE = 20000000; // 20MB

// Table names
const TABLE_PRPTYPES = 'prptypes';
const TABLE_ACCOUNTS = 'accounts';
const TABLE_BANKS = 'banks';
const TABLE_BRANCHES = 'branches';
const TABLE_INDEX = 'indexes';

// Global database reference
let db: SQLite.SQLiteDatabase | null = null;

// Ensure database is open and ready
const ensureDb = async (): Promise<SQLite.SQLiteDatabase> => {
  if (db) return db;

  return new Promise((resolve, reject) => {
    SQLite.openDatabase(
      {
        name: DB_NAME,
        version: DB_VERSION,
        displayName: DB_DISPLAY_NAME,
        size: DB_SIZE,
      },
      db => {
        console.log('✅ Database opened successfully');
        resolve(db);
      },
      error => {
        console.error('❌ Failed to open database:', error);
        reject(error);
      }
    );
  });
};

// Initialize database tables
export const initDatabase = async (): Promise<boolean> => {
  try {
    db = await ensureDb();

    await new Promise<void>((resolve, reject) => {
      db!.transaction(tx => {
        // Create tables if they don't exist
        tx.executeSql(
          `CREATE TABLE IF NOT EXISTS ${TABLE_PRPTYPES} (
            prptype TEXT PRIMARY KEY,
            prpcode TEXT,
            yearno TEXT,
            lastUpdated TEXT,
            accountChunks INTEGER DEFAULT 0,
            banksChunks INTEGER DEFAULT 0,
            branchesChunks INTEGER DEFAULT 0
          );`,
          [],
          () => { },
          (_, error) => reject(error)
        );

        tx.executeSql(
          `CREATE TABLE IF NOT EXISTS ${TABLE_ACCOUNTS} (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            prptype TEXT,
            acccode TEXT,
            data TEXT,
            chunkIndex INTEGER,
            UNIQUE(prptype, acccode, chunkIndex),
            FOREIGN KEY(prptype) REFERENCES ${TABLE_PRPTYPES}(prptype)
          );`,
          [],
          () => { },
          (_, error) => reject(error)
        );

        tx.executeSql(
          `CREATE INDEX IF NOT EXISTS idx_accounts_prptype_acccode
          ON ${TABLE_ACCOUNTS}(prptype, acccode);`,
          [],
          () => { },
          (_, error) => reject(error)
        );

        tx.executeSql(
          `CREATE TABLE IF NOT EXISTS ${TABLE_BANKS} (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            prptype TEXT,
            bankName TEXT,
            data TEXT,
            chunkIndex INTEGER,
            UNIQUE(prptype, bankName, chunkIndex),
            FOREIGN KEY(prptype) REFERENCES ${TABLE_PRPTYPES}(prptype)
          );`,
          [],
          () => { },
          (_, error) => reject(error)
        );

        tx.executeSql(
          `CREATE INDEX IF NOT EXISTS idx_banks_prptype_bankname
          ON ${TABLE_BANKS}(prptype, bankName);`,
          [],
          () => { },
          (_, error) => reject(error)
        );

        tx.executeSql(
          `CREATE TABLE IF NOT EXISTS ${TABLE_BRANCHES} (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            prptype TEXT,
            branchCode TEXT,
            data TEXT,
            chunkIndex INTEGER,
            UNIQUE(prptype, branchCode, chunkIndex),
            FOREIGN KEY(prptype) REFERENCES ${TABLE_PRPTYPES}(prptype)
          );`,
          [],
          () => { },
          (_, error) => reject(error)
        );

        tx.executeSql(
          `CREATE TABLE IF NOT EXISTS ${TABLE_INDEX} (
            prptype TEXT PRIMARY KEY,
            accountIndex TEXT,
            bankIndex TEXT,
            lastUpdated TEXT
          );`,
          [],
          () => resolve(),
          (_, error) => reject(error)
        );
      });
    });

    console.log('✅ Database initialized successfully');
    return true;
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    return false;
  }
};

// Helper: Execute SQL with error handling
const executeSql = async (
  sql: string,
  params: any[] = [],
  successCallback?: (tx: SQLite.Transaction, result: SQLite.ResultSet) => void,
  errorCallback?: (error: SQLite.SQLError) => void
): Promise<any> => {
  return new Promise((resolve, reject) => {
    (async () => {
      const dbInstance = await ensureDb();
      dbInstance.transaction(
        tx => {
          tx.executeSql(
            sql,
            params,
            (_, result) => {
              if (successCallback) successCallback(tx, result);
              resolve(result);
            },
            (_, error) => {
              if (errorCallback) errorCallback(error);
              reject(error);
              return false; // Rollback
            }
          );
        },
        error => {
          console.error('❌ Transaction failed:', error);
          reject(error);
        }
      );
    })();
  });
};

// Optimized chunk size
const getOptimalChunkSize = (itemCount: number): number => {
  if (itemCount > 100000) return 2000;
  if (itemCount > 50000) return 1000;
  if (itemCount > 10000) return 500;
  return 200;
};

// Save large data with proper chunking and indexing
export const saveLargeData = async (prptype: string, data: CachedPrptype): Promise<boolean> => {
  try {
    console.log(`💾 Saving data for ${prptype}...`);

    // Clear old data for this prptype
    await executeSql(`DELETE FROM ${TABLE_PRPTYPES} WHERE prptype = ?`, [prptype]);
    await executeSql(`DELETE FROM ${TABLE_ACCOUNTS} WHERE prptype = ?`, [prptype]);
    await executeSql(`DELETE FROM ${TABLE_BANKS} WHERE prptype = ?`, [prptype]);
    await executeSql(`DELETE FROM ${TABLE_BRANCHES} WHERE prptype = ?`, [prptype]);
    await executeSql(`DELETE FROM ${TABLE_INDEX} WHERE prptype = ?`, [prptype]);

    // Prepare metadata
    const metadata = {
      prptype: data.prptype,
      prpcode: data.prpcode,
      yearno: data.yearno,
      lastUpdated: new Date().toISOString(),
      accountChunks: 0,
      banksChunks: 0,
      branchesChunks: 0,
      accountIndex: '{}',
      bankIndex: '{}',
    };

    // Process accounts with indexing
    if (Array.isArray(data.account) && data.account.length > 0) {
      const ACCOUNT_CHUNK_SIZE = getOptimalChunkSize(data.account.length);
      const accountIndex: Record<string, number> = {};

      if (data.account.length > ACCOUNT_CHUNK_SIZE) {
        metadata.accountChunks = Math.ceil(data.account.length / ACCOUNT_CHUNK_SIZE);
        console.log(`📦 Chunking ${data.account.length} accounts into ${metadata.accountChunks} chunks`);

        for (let i = 0; i < data.account.length; i += ACCOUNT_CHUNK_SIZE) {
          const chunk = data.account.slice(i, i + ACCOUNT_CHUNK_SIZE);
          const chunkIndex = Math.floor(i / ACCOUNT_CHUNK_SIZE);

          // Update index
          chunk.forEach((account, idx) => {
            if (account.acccode) {
              accountIndex[account.acccode] = i + idx;
            }
          });

          // Save chunk
          await executeSql(
            `INSERT INTO ${TABLE_ACCOUNTS} (prptype, data, chunkIndex) VALUES (?, ?, ?)`,
            [prptype, JSON.stringify(chunk), chunkIndex]
          );
        }
      } else {
        // Single chunk
        metadata.accountChunks = 1;
        data.account.forEach((account, idx) => {
          if (account.acccode) {
            accountIndex[account.acccode] = idx;
          }
        });

        await executeSql(
          `INSERT INTO ${TABLE_ACCOUNTS} (prptype, data, chunkIndex) VALUES (?, ?, ?)`,
          [prptype, JSON.stringify(data.account), 0]
        );
      }

      metadata.accountIndex = JSON.stringify(accountIndex);
    }

    // Process banks (similar to accounts)
    if (Array.isArray(data.banks) && data.banks.length > 0) {
      const BANK_CHUNK_SIZE = getOptimalChunkSize(data.banks.length);
      const bankIndex: Record<string, number> = {};

      if (data.banks.length > BANK_CHUNK_SIZE) {
        metadata.banksChunks = Math.ceil(data.banks.length / BANK_CHUNK_SIZE);

        for (let i = 0; i < data.banks.length; i += BANK_CHUNK_SIZE) {
          const chunk = data.banks.slice(i, i + BANK_CHUNK_SIZE);
          const chunkIndex = Math.floor(i / BANK_CHUNK_SIZE);

          chunk.forEach((bank, idx) => {
            if (bank.BankName) {
              bankIndex[bank.BankName] = i + idx;
            }
          });

          await executeSql(
            `INSERT INTO ${TABLE_BANKS} (prptype, data, chunkIndex) VALUES (?, ?, ?)`,
            [prptype, JSON.stringify(chunk), chunkIndex]
          );
        }
      } else {
        metadata.banksChunks = 1;
        data.banks.forEach((bank, idx) => {
          if (bank.BankName) {
            bankIndex[bank.BankName] = idx;
          }
        });

        await executeSql(
          `INSERT INTO ${TABLE_BANKS} (prptype, data, chunkIndex) VALUES (?, ?, ?)`,
          [prptype, JSON.stringify(data.banks), 0]
        );
      }

      metadata.bankIndex = JSON.stringify(bankIndex);
    }

    // Process branches (similar to banks)
    if (Array.isArray(data.branches) && data.branches.length > 0) {
      const BRANCH_CHUNK_SIZE = getOptimalChunkSize(data.branches.length);

      if (data.branches.length > BRANCH_CHUNK_SIZE) {
        metadata.branchesChunks = Math.ceil(data.branches.length / BRANCH_CHUNK_SIZE);

        for (let i = 0; i < data.branches.length; i += BRANCH_CHUNK_SIZE) {
          const chunk = data.branches.slice(i, i + BRANCH_CHUNK_SIZE);
          const chunkIndex = Math.floor(i / BRANCH_CHUNK_SIZE);

          await executeSql(
            `INSERT INTO ${TABLE_BRANCHES} (prptype, data, chunkIndex) VALUES (?, ?, ?)`,
            [prptype, JSON.stringify(chunk), chunkIndex]
          );
        }
      } else {
        metadata.branchesChunks = 1;
        await executeSql(
          `INSERT INTO ${TABLE_BRANCHES} (prptype, data, chunkIndex) VALUES (?, ?, ?)`,
          [prptype, JSON.stringify(data.branches), 0]
        );
      }
    }

    // Save metadata and indexes
    await executeSql(
      `INSERT INTO ${TABLE_PRPTYPES} (
        prptype, prpcode, yearno, lastUpdated,
        accountChunks, banksChunks, branchesChunks
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        metadata.prptype,
        metadata.prpcode,
        metadata.yearno,
        metadata.lastUpdated,
        metadata.accountChunks,
        metadata.banksChunks,
        metadata.branchesChunks,
      ]
    );

    // Save indexes
    await executeSql(
      `INSERT INTO ${TABLE_INDEX} (
        prptype, accountIndex, bankIndex, lastUpdated
      ) VALUES (?, ?, ?, ?)`,
      [
        prptype,
        metadata.accountIndex || '{}',
        metadata.bankIndex || '{}',
        new Date().toISOString(),
      ]
    );

    console.log(`✅ Successfully saved data for ${prptype}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to save data for ${prptype}:`, error);
    return false;
  }
};

// Read cached data with optimized indexing
export const readPrptypeCache = async (
  prptype: string,
  options: {
    loadAccounts?: boolean;
    loadBanks?: boolean;
    loadBranches?: boolean;
  } = {}
): Promise<CachedPrptype | null> => {
  try {
    const { loadAccounts = true, loadBanks = true, loadBranches = true } = options;

    // Get metadata
    const metadata = await executeSql(
      `SELECT * FROM ${TABLE_PRPTYPES} WHERE prptype = ?`,
      [prptype]
    ).then((result: SQLite.ResultSet) => {
      return result.rows.length > 0 ? result.rows.item(0) : null;
    });

    if (!metadata) return null;

    const result: CachedPrptype = {
      prptype: metadata.prptype,
      prpcode: metadata.prpcode,
      yearno: metadata.yearno,
      lastUpdated: metadata.lastUpdated,
      account: loadAccounts ? [] : undefined,
      banks: loadBanks ? [] : undefined,
      branches: loadBranches ? [] : undefined,
      accountChunks: metadata.accountChunks,
      banksChunks: metadata.banksChunks,
      branchesChunks: metadata.branchesChunks,
    };

    // Load accounts
    if (loadAccounts && metadata.accountChunks > 0) {
      const accounts: any[] = [];

      if (metadata.accountChunks === 1) {
        const chunkData = await executeSql(
          `SELECT data FROM ${TABLE_ACCOUNTS} WHERE prptype = ? AND chunkIndex = 0`,
          [prptype]
        ).then((result: SQLite.ResultSet) => {
          return result.rows.length > 0 ? JSON.parse(result.rows.item(0).data) : null;
        });

        if (chunkData && Array.isArray(chunkData)) {
          accounts.push(...chunkData);
        }
      } else {
        // Load multiple chunks
        for (let i = 0; i < metadata.accountChunks; i++) {
          const chunkData = await executeSql(
            `SELECT data FROM ${TABLE_ACCOUNTS} WHERE prptype = ? AND chunkIndex = ?`,
            [prptype, i]
          ).then((result: SQLite.ResultSet) => {
            return result.rows.length > 0 ? JSON.parse(result.rows.item(0).data) : null;
          });

          if (chunkData && Array.isArray(chunkData)) {
            accounts.push(...chunkData);
          }
        }
      }

      result.account = accounts;
    }

    // Load banks (similar to accounts)
    if (loadBanks && metadata.banksChunks > 0) {
      const banks: any[] = [];

      if (metadata.banksChunks === 1) {
        const chunkData = await executeSql(
          `SELECT data FROM ${TABLE_BANKS} WHERE prptype = ? AND chunkIndex = 0`,
          [prptype]
        ).then((result: SQLite.ResultSet) => {
          return result.rows.length > 0 ? JSON.parse(result.rows.item(0).data) : null;
        });

        if (chunkData && Array.isArray(chunkData)) {
          banks.push(...chunkData);
        }
      } else {
        for (let i = 0; i < metadata.banksChunks; i++) {
          const chunkData = await executeSql(
            `SELECT data FROM ${TABLE_BANKS} WHERE prptype = ? AND chunkIndex = ?`,
            [prptype, i]
          ).then((result: SQLite.ResultSet) => {
            return result.rows.length > 0 ? JSON.parse(result.rows.item(0).data) : null;
          });

          if (chunkData && Array.isArray(chunkData)) {
            banks.push(...chunkData);
          }
        }
      }

      result.banks = banks;
    }

    // Load branches (similar to banks)
    if (loadBranches && metadata.branchesChunks > 0) {
      const branches: any[] = [];

      if (metadata.branchesChunks === 1) {
        const chunkData = await executeSql(
          `SELECT data FROM ${TABLE_BRANCHES} WHERE prptype = ? AND chunkIndex = 0`,
          [prptype]
        ).then((result: SQLite.ResultSet) => {
          return result.rows.length > 0 ? JSON.parse(result.rows.item(0).data) : null;
        });

        if (chunkData && Array.isArray(chunkData)) {
          branches.push(...chunkData);
        }
      } else {
        for (let i = 0; i < metadata.branchesChunks; i++) {
          const chunkData = await executeSql(
            `SELECT data FROM ${TABLE_BRANCHES} WHERE prptype = ? AND chunkIndex = ?`,
            [prptype, i]
          ).then((result: SQLite.ResultSet) => {
            return result.rows.length > 0 ? JSON.parse(result.rows.item(0).data) : null;
          });

          if (chunkData && Array.isArray(chunkData)) {
            branches.push(...chunkData);
          }
        }
      }

      result.branches = branches;
    }

    return result;
  } catch (error) {
    console.error(`❌ Failed to read cache for ${prptype}:`, error);
    return null;
  }
};

// Get account by acccode (fast lookup)
export const getAccountByCode = async (prptype: string, acccode: string): Promise<any | null> => {
  try {
    // Check index first
    const indexData = await executeSql(
      `SELECT accountIndex FROM ${TABLE_INDEX} WHERE prptype = ?`,
      [prptype]
    ).then((result: SQLite.ResultSet) => {
      return result.rows.length > 0 ? result.rows.item(0) : null;
    });

    if (indexData?.accountIndex) {
      const index = JSON.parse(indexData.accountIndex);
      if (index[acccode] !== undefined) {
        const position = index[acccode];
        const chunkIndex = Math.floor(position / getOptimalChunkSize(100000));

        // Get the chunk
        const chunkData = await executeSql(
          `SELECT data FROM ${TABLE_ACCOUNTS} WHERE prptype = ? AND chunkIndex = ?`,
          [prptype, chunkIndex]
        ).then((result: SQLite.ResultSet) => {
          return result.rows.length > 0 ? JSON.parse(result.rows.item(0).data) : null;
        });

        if (chunkData && Array.isArray(chunkData)) {
          const positionInChunk = position % getOptimalChunkSize(100000);
          return chunkData[positionInChunk] || null;
        }
      }
    }

    // Fallback: Full scan
    const metadata = await executeSql(
      `SELECT accountChunks FROM ${TABLE_PRPTYPES} WHERE prptype = ?`,
      [prptype]
    ).then((result: SQLite.ResultSet) => {
      return result.rows.length > 0 ? result.rows.item(0) : null;
    });

    if (metadata?.accountChunks) {
      for (let i = 0; i < metadata.accountChunks; i++) {
        const chunkData = await executeSql(
          `SELECT data FROM ${TABLE_ACCOUNTS} WHERE prptype = ? AND chunkIndex = ?`,
          [prptype, i]
        ).then((result: SQLite.ResultSet) => {
          return result.rows.length > 0 ? JSON.parse(result.rows.item(0).data) : null;
        });

        if (chunkData && Array.isArray(chunkData)) {
          const account = chunkData.find((a: any) => a.acccode === acccode);
          if (account) return account;
        }
      }
    }

    return null;
  } catch (error) {
    console.error(`❌ Failed to get account ${acccode} for ${prptype}:`, error);
    return null;
  }
};

// Get bank by name (fast lookup)
export const getBankByName = async (prptype: string, bankName: string): Promise<any | null> => {
  try {
    // Check index first
    const indexData = await executeSql(
      `SELECT bankIndex FROM ${TABLE_INDEX} WHERE prptype = ?`,
      [prptype]
    ).then((result: SQLite.ResultSet) => {
      return result.rows.length > 0 ? result.rows.item(0) : null;
    });

    if (indexData?.bankIndex) {
      const index = JSON.parse(indexData.bankIndex);
      if (index[bankName] !== undefined) {
        const position = index[bankName];
        const chunkIndex = Math.floor(position / getOptimalChunkSize(10000));

        // Get the chunk
        const chunkData = await executeSql(
          `SELECT data FROM ${TABLE_BANKS} WHERE prptype = ? AND chunkIndex = ?`,
          [prptype, chunkIndex]
        ).then((result: SQLite.ResultSet) => {
          return result.rows.length > 0 ? JSON.parse(result.rows.item(0).data) : null;
        });

        if (chunkData && Array.isArray(chunkData)) {
          const positionInChunk = position % getOptimalChunkSize(10000);
          return chunkData[positionInChunk] || null;
        }
      }
    }

    // Fallback: Full scan
    const metadata = await executeSql(
      `SELECT banksChunks FROM ${TABLE_PRPTYPES} WHERE prptype = ?`,
      [prptype]
    ).then((result: SQLite.ResultSet) => {
      return result.rows.length > 0 ? result.rows.item(0) : null;
    });

    if (metadata?.banksChunks) {
      for (let i = 0; i < metadata.banksChunks; i++) {
        const chunkData = await executeSql(
          `SELECT data FROM ${TABLE_BANKS} WHERE prptype = ? AND chunkIndex = ?`,
          [prptype, i]
        ).then((result: SQLite.ResultSet) => {
          return result.rows.length > 0 ? JSON.parse(result.rows.item(0).data) : null;
        });

        if (chunkData && Array.isArray(chunkData)) {
          const bank = chunkData.find((b: any) => b.BankName === bankName);
          if (bank) return bank;
        }
      }
    }

    return null;
  } catch (error) {
    console.error(`❌ Failed to get bank ${bankName} for ${prptype}:`, error);
    return null;
  }
};

// Get all prptypes (index)
export const getPrptypeIndex = async (): Promise<{ prptypes: string[]; count: number }> => {
  try {
    const prptypes: string[] = [];

    await executeSql(`SELECT prptype FROM ${TABLE_PRPTYPES}`).then((result: SQLite.ResultSet) => {
      for (let i = 0; i < result.rows.length; i++) {
        prptypes.push(result.rows.item(i).prptype);
      }
    });

    return { prptypes, count: prptypes.length };
  } catch (error) {
    console.error('❌ Failed to get prptype index:', error);
    return { prptypes: [], count: 0 };
  }
};

// Clear old data for a prptype
export const clearOldChunks = async (prptype: string): Promise<boolean> => {
  try {
    await executeSql(`DELETE FROM ${TABLE_PRPTYPES} WHERE prptype = ?`, [prptype]);
    await executeSql(`DELETE FROM ${TABLE_ACCOUNTS} WHERE prptype = ?`, [prptype]);
    await executeSql(`DELETE FROM ${TABLE_BANKS} WHERE prptype = ?`, [prptype]);
    await executeSql(`DELETE FROM ${TABLE_BRANCHES} WHERE prptype = ?`, [prptype]);
    await executeSql(`DELETE FROM ${TABLE_INDEX} WHERE prptype = ?`, [prptype]);

    console.log(`✅ Cleared old data for ${prptype}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to clear old data for ${prptype}:`, error);
    return false;
  }
};

// Close database connection
export const closeDatabase = async (): Promise<void> => {
  try {
    if (db) {
      await new Promise<void>((resolve, reject) => {
        db!.close(
          () => {
            console.log('✅ Database connection closed');
            db = null;
            resolve();
          },
          error => {
            console.error('❌ Failed to close database:', error);
            reject(error);
          }
        );
      });
    }
  } catch (error) {
    console.error('❌ Failed to close database:', error);
  }
};
