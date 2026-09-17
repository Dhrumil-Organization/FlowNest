import { createWebKVStore } from './webIndexedDB';

const globalStore = createWebKVStore('FlowNestGlobalCache');
const chatStore = createWebKVStore('FlowNestChat');

export const clearAllMasterDatabases = async () => {
  try {
    await globalStore.clear();
    return true;
  } catch (error) {
    console.error('❌ Browser global cache clear error:', error);
    return false;
  }
};

export const clearAllChatDatabases = async () => {
  try {
    await chatStore.clear();
    return true;
  } catch (error) {
    console.error('❌ Browser chat cache clear error:', error);
    return false;
  }
};

export const clearAllAppDatabases = async () => {
  try {
    await Promise.all([globalStore.clear(), chatStore.clear()]);
    return true;
  } catch (error) {
    console.error('❌ Browser cache clear error:', error);
    return false;
  }
};
