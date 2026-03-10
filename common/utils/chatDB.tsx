import SQLite from 'react-native-sqlite-storage';

const db = SQLite.openDatabase(
  { name: 'chat.db', location: 'default' },
  () => { },
  error => console.log(error)
);

export const initDB = () => {
  db.transaction(tx => {
    tx.executeSql(
      `CREATE TABLE IF NOT EXISTS chat(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userText TEXT,
        aiText TEXT,
        createdAt INTEGER
      );`
    );
  });
};

export const saveChat = (userText, aiText) => {
  return new Promise((resolve) => {

    db.transaction(tx => {

      tx.executeSql(
        'INSERT INTO chat(userText, aiText, createdAt) VALUES (?,?,?)',
        [userText, aiText, Date.now()],
        () => resolve(true),
        (_, err) => {
          console.log("Save error", err);
          resolve(false);
        }
      );

    });

  });
};

export const deleteAfterMessage = (userText) => {

  db.transaction(tx => {

    tx.executeSql(
      `DELETE FROM chat 
       WHERE id > (
         SELECT id FROM chat WHERE userText=? ORDER BY id DESC LIMIT 1
       )`,
      [userText]
    );

  });

};

export const getChat = (userText) => {
  return new Promise((resolve) => {
    db.transaction(tx => {
      tx.executeSql(
        'SELECT * FROM chat WHERE userText=?',
        [userText],
        (_, res) => {
          if (res.rows.length > 0) {
            resolve(res.rows.item(0));
          } else {
            resolve(null);
          }
        }
      );
    });
  });
};

export const clearChat = () => {
  db.transaction(tx => {
    tx.executeSql('DELETE FROM chat');
  });
};

export const getAllChats = () => {
  return new Promise((resolve) => {

    db.transaction(tx => {

      tx.executeSql(
        'SELECT * FROM chat ORDER BY id ASC',
        [],
        (_, res) => {

          const arr: any[] = [];

          for (let i = 0; i < res.rows.length; i++) {

            const item = res.rows.item(i);

            arr.push({
              type: 'user',
              text: item.userText
            });

            arr.push({
              type: 'ai',
              text: item.aiText
            });

          }

          resolve(arr);

        }
      );

    });

  });
};