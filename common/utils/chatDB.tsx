// import SQLite from 'react-native-sqlite-storage';

// const db = SQLite.openDatabase(
//   { name: 'chat.db', location: 'default' },
//   () => { },
//   error => console.log(error)
// );

// export const initDB = () => {
//   db.transaction(tx => {
//     tx.executeSql(
//       `CREATE TABLE IF NOT EXISTS chat(
//         id INTEGER PRIMARY KEY AUTOINCREMENT,
//         userText TEXT,
//         aiText TEXT,
//         createdAt INTEGER
//       );`
//     );
//   });
// };

// export const saveChat = (userText, aiText) => {
//   return new Promise((resolve) => {

//     db.transaction(tx => {

//       tx.executeSql(
//         'INSERT INTO chat(userText, aiText, createdAt) VALUES (?,?,?)',
//         [userText, aiText, Date.now()],
//         () => resolve(true),
//         (_, err) => {
//           console.log("Save error", err);
//           resolve(false);
//         }
//       );

//     });

//   });
// };

// export const deleteAfterMessage = (userText) => {

//   db.transaction(tx => {

//     tx.executeSql(
//       `DELETE FROM chat 
//        WHERE id > (
//          SELECT id FROM chat WHERE userText=? ORDER BY id DESC LIMIT 1
//        )`,
//       [userText]
//     );

//   });

// };

// export const getChat = (userText) => {
//   return new Promise((resolve) => {
//     db.transaction(tx => {
//       tx.executeSql(
//         'SELECT * FROM chat WHERE userText=?',
//         [userText],
//         (_, res) => {
//           if (res.rows.length > 0) {
//             resolve(res.rows.item(0));
//           } else {
//             resolve(null);
//           }
//         }
//       );
//     });
//   });
// };

// export const clearChat = () => {
//   db.transaction(tx => {
//     tx.executeSql('DELETE FROM chat');
//   });
// };

// export const getAllChats = () => {
//   return new Promise((resolve) => {

//     db.transaction(tx => {

//       tx.executeSql(
//         'SELECT * FROM chat ORDER BY id ASC',
//         [],
//         (_, res) => {

//           const arr: any[] = [];

//           for (let i = 0; i < res.rows.length; i++) {

//             const item = res.rows.item(i);

//             arr.push({
//               type: 'user',
//               text: item.userText
//             });

//             arr.push({
//               type: 'ai',
//               text: item.aiText
//             });

//           }

//           resolve(arr);

//         }
//       );

//     });

//   });
// };

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
        createdAt INTEGER,
        isEdited INTEGER DEFAULT 0
      );`
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

// Save chat WITHOUT duplicate check (always insert new)
export const saveChat = (userText, aiText) => {
  return new Promise((resolve) => {
    db.transaction(tx => {
      tx.executeSql(
        'INSERT INTO chat(userText, aiText, createdAt, isEdited) VALUES (?,?,?,?)',
        [userText, aiText, Date.now(), 0],
        (_, result) => {
          console.log('✅ Chat saved successfully:', userText.substring(0, 20) + '...');
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

// Get cached chat - simple exact match
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

// Get all chats in correct order with user+AI pairs
export const getAllChats = () => {
  return new Promise((resolve) => {
    db.transaction(tx => {
      tx.executeSql(
        'SELECT * FROM chat ORDER BY id ASC',
        [],
        (_, res) => {
          const arr: any[] = [];

          console.log('📊 Loading chats from DB, total records:', res.rows.length);

          for (let i = 0; i < res.rows.length; i++) {
            const item = res.rows.item(i);

            // Add user message
            arr.push({
              type: 'user',
              text: item.userText,
              id: item.id,
              isEdited: item.isEdited === 1
            });

            // Add AI response
            arr.push({
              type: 'ai',
              text: item.aiText,
              id: item.id,
              isEdited: item.isEdited === 1
            });
          }

          console.log('📊 Loaded messages count:', arr.length);
          resolve(arr);
        },
        (_, err) => {
          console.log("Get all error:", err);
          resolve([]);
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