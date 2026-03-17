import SQLite from 'react-native-sqlite-storage';

const db = SQLite.openDatabase(
  { name: 'chat.db', location: 'default' },
  () => console.log('Database opened successfully'),
  error => console.log('Database error:', error)
);

export const initDB = () => {
  db.transaction(tx => {
    tx.executeSql(
      `CREATE TABLE IF NOT EXISTS chat(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userText TEXT,
  aiText TEXT,
  userCreatedAt INTEGER,  -- User message timestamp
  aiCreatedAt INTEGER,    -- AI response timestamp
  isEdited INTEGER DEFAULT 0
);
`
    );

    // Check if isEdited column exists (optional)
    tx.executeSql(
      "PRAGMA table_info(chat)",
      [],
      (_, result) => {
        const columns = result.rows.raw();
        const hasIsEdited = columns.some(col => col.name === 'isEdited');

        if (!hasIsEdited) {
          tx.executeSql(
            'ALTER TABLE chat ADD COLUMN isEdited INTEGER DEFAULT 0;',
            [],
            () => console.log('Added isEdited column'),
            (_, err) => console.log('Error adding column:', err)
          );
        }
      }
    );
  });
};

// Save chat WITH timestamps
export const saveChat = (userText, aiText, userTimestamp = Date.now(), aiTimestamp = Date.now()) => {
  return new Promise((resolve) => {
    db.transaction(tx => {
      tx.executeSql(
        'INSERT INTO chat(userText, aiText, userCreatedAt, aiCreatedAt, isEdited) VALUES (?,?,?,?,?)',
        [userText, aiText, userTimestamp, aiTimestamp, 0],
        (_, result) => {
          console.log('✅ Chat saved with timestamps - User:', new Date(userTimestamp).toLocaleString(), 'AI:', new Date(aiTimestamp).toLocaleString());
          resolve(true);
        },
        (_, err) => {
          console.log("❌ Save error:", err);
          resolve(false);
        }
      );
    });
  });
};



// Delete all messages after a specific message (for edit functionality)
export const deleteAfterMessage = (userText) => {
  return new Promise((resolve) => {
    db.transaction(tx => {
      // First get the ID of the message being edited
      tx.executeSql(
        'SELECT id FROM chat WHERE userText = ? ORDER BY id DESC LIMIT 1',
        [userText],
        (_, res) => {
          if (res.rows.length > 0) {
            const messageId = res.rows.item(0).id;
            console.log('Deleting messages after ID:', messageId);

            // Delete all messages with ID greater than this one
            tx.executeSql(
              'DELETE FROM chat WHERE id > ?',
              [messageId],
              (_, deleteResult) => {
                console.log('✅ Deleted', deleteResult.rowsAffected, 'messages after edit');

                // Mark this message as edited
                tx.executeSql(
                  'UPDATE chat SET isEdited = 1 WHERE id = ?',
                  [messageId],
                  () => resolve(true),
                  () => resolve(true)
                );
              },
              (_, err) => {
                console.log("Delete error:", err);
                resolve(false);
              }
            );
          } else {
            console.log('No message found to delete after');
            resolve(false);
          }
        },
        (_, err) => {
          console.log("Find error:", err);
          resolve(false);
        }
      );
    });
  });
};

// Get cached chat with timestamps
export const getChat = (userText) => {
  return new Promise((resolve) => {
    db.transaction(tx => {
      tx.executeSql(
        'SELECT * FROM chat WHERE userText = ? ORDER BY id DESC LIMIT 1',
        [userText],
        (_, res) => {
          if (res.rows.length > 0) {
            const item = res.rows.item(0);
            console.log('✅ Cache HIT for:', userText.substring(0, 20) + '...');
            console.log('   User Time:', new Date(item.userCreatedAt).toLocaleString());
            console.log('   AI Time:', new Date(item.aiCreatedAt).toLocaleString());
            resolve(item);
          } else {
            console.log('❌ Cache MISS for:', userText.substring(0, 20) + '...');
            resolve(null);
          }
        },
        (_, err) => {
          console.log("Get error:", err);
          resolve(null);
        }
      );
    });
  });
};

// Clear all chat
export const clearChat = () => {
  return new Promise((resolve) => {
    db.transaction(tx => {
      tx.executeSql(
        'DELETE FROM chat',
        [],
        (_, result) => {
          console.log('✅ Chat cleared, rows affected:', result.rowsAffected);
          resolve(true);
        },
        (_, err) => {
          console.log("Clear error:", err);
          resolve(false);
        }
      );
    });
  });
};

// Get all chats with proper timestamps
export const getAllChats = () => {
  return new Promise((resolve) => {
    db.transaction(tx => {
      tx.executeSql(
        'SELECT * FROM chat ORDER BY id ASC',
        [],
        (_, res) => {
          const arr = [];
          for (let i = 0; i < res.rows.length; i++) {
            const item = res.rows.item(i);

            // User message
            arr.push({
              type: 'user',
              text: item.userText,
              createdAt: item.userCreatedAt || Date.now(), // Fallback if null
              id: `${item.id}_user`,
              isEdited: item.isEdited === 1
            });

            // AI message
            arr.push({
              type: 'ai',
              text: item.aiText,
              createdAt: item.aiCreatedAt || Date.now(), // Fallback if null
              id: `${item.id}_ai`,
              isEdited: item.isEdited === 1
            });
          }
          console.log(`📊 Loaded ${arr.length} messages with timestamps`);
          resolve(arr);
        }
      );
    });
  });
};


// Debug function to check DB contents
export const debugDB = () => {
  return new Promise((resolve) => {
    db.transaction(tx => {
      tx.executeSql(
        'SELECT * FROM chat ORDER BY id DESC',
        [],
        (_, res) => {
          const records = [];
          for (let i = 0; i < res.rows.length; i++) {
            records.push(res.rows.item(i));
          }
          console.log('🔍 DB Contents:', records);
          resolve(records);
        }
      );
    });
  });
};