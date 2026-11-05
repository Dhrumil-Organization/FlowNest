import AsyncStorage from '@react-native-async-storage/async-storage';
import { secureStorage } from '@/src/platform/secureStorage';

const SECURE_KEYS = new Set([
  'access_token',
  'flow_nest_session',
  'sudamo_biometric_credentials',
  'sudamo_property_switch_credentials',
  'login_user_name',
  'login_user_passwd',
]);

const isSensitive = (key: string) =>
  SECURE_KEYS.has(key) ||
  /(^|_)(token|passwd|password|credential|credentials|secret)(_|$)/i.test(key);

const secureKnownKeys = Array.from(SECURE_KEYS);

const getItem = async (key: string): Promise<string | null> => {
  if (!isSensitive(key)) return AsyncStorage.getItem(key);

  const secure = await secureStorage.getItem(key);
  if (secure !== null) return secure;

  // One-time migration for users who already have a session saved by the
  // previous AsyncStorage implementation.
  const legacy = await AsyncStorage.getItem(key);
  if (legacy !== null) {
    try {
      await secureStorage.setItem(key, legacy);
      await AsyncStorage.removeItem(key);
    } catch {
      // Keep the legacy value if migration cannot be completed.
    }
  }
  return legacy;
};

const setItem = async (key: string, value: string): Promise<void> => {
  if (!isSensitive(key)) {
    await AsyncStorage.setItem(key, value);
    return;
  }
  await secureStorage.setItem(key, value);
  // Do not leave a plaintext legacy copy behind.
  await AsyncStorage.removeItem(key);
};

const removeItem = async (key: string): Promise<void> => {
  if (isSensitive(key)) {
    await Promise.all([
      secureStorage.removeItem(key),
      AsyncStorage.removeItem(key),
    ]);
    return;
  }
  await AsyncStorage.removeItem(key);
};

const multiGet = async (keys: string[]) =>
  Promise.all(keys.map(async key => [key, await getItem(key)] as [string, string | null]));

const multiSet = async (pairs: [string, string][]) => {
  await Promise.all(pairs.map(([key, value]) => setItem(key, value)));
};

const multiRemove = async (keys: string[]) => {
  await Promise.all(keys.map(removeItem));
};

const getAllKeys = async () => {
  const legacyKeys = await AsyncStorage.getAllKeys();
  const secureKeys = [];
  for (const key of secureKnownKeys) {
    if ((await secureStorage.getItem(key)) !== null) secureKeys.push(key);
  }
  return Array.from(new Set([...legacyKeys, ...secureKeys]));
};

const clear = async () => {
  await AsyncStorage.clear();
  await Promise.all(secureKnownKeys.map(key => secureStorage.removeItem(key)));
};

const compatibleStorage = {
  getItem,
  setItem,
  removeItem,
  multiGet,
  multiSet,
  multiRemove,
  getAllKeys,
  clear,
};

export default compatibleStorage;
