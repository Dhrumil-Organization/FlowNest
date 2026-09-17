import { createWebKVStore } from './webIndexedDB';

const store = createWebKVStore('FlowNestChat');

type ChatRow = {
  id: number;
  userText: string;
  aiText: string;
  userCreatedAt: number;
  aiCreatedAt: number;
  isEdited: number;
};

export const initDB = async () => {
  if (!(await store.get<ChatRow[]>('messages'))) {
    await store.set('messages', []);
  }
};

export const saveChat = async (
  userText: string,
  aiText: string,
  userTimestamp = Date.now(),
  aiTimestamp = Date.now(),
) => {
  try {
    const messages = (await store.get<ChatRow[]>('messages')) || [];
    const nextId = messages.length
      ? Math.max(...messages.map(row => row.id)) + 1
      : 1;
    messages.push({
      id: nextId,
      userText,
      aiText,
      userCreatedAt: userTimestamp,
      aiCreatedAt: aiTimestamp,
      isEdited: 0,
    });
    await store.set('messages', messages);
    return true;
  } catch (error) {
    console.error('❌ Browser chat save error:', error);
    return false;
  }
};

export const deleteAfterMessage = async (userText: string) => {
  try {
    const messages = (await store.get<ChatRow[]>('messages')) || [];
    const index = [...messages].reverse().findIndex(row => row.userText === userText);
    if (index < 0) return false;
    const actualIndex = messages.length - 1 - index;
    messages.splice(actualIndex + 1);
    messages[actualIndex].isEdited = 1;
    await store.set('messages', messages);
    return true;
  } catch {
    return false;
  }
};

export const getChats = async (): Promise<ChatRow[]> =>
  (await store.get<ChatRow[]>('messages')) || [];

export const clearChats = async () => {
  await store.set('messages', []);
};
