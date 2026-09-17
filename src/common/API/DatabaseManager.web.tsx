import type { CachedPrptype } from './Functions';
import { createWebKVStore } from '../utils/webIndexedDB';

const store = createWebKVStore('FlowNestPrptypeCache');

export const initDatabase = async (): Promise<boolean> => true;

export const saveLargeData = async (
  prptype: string,
  data: CachedPrptype,
): Promise<boolean> => {
  try {
    await store.set(`prptype:${prptype}`, {
      ...data,
      prptype,
      lastUpdated: data.lastUpdated || new Date().toISOString(),
    });
    return true;
  } catch (error) {
    console.error('❌ Browser cache save error:', error);
    return false;
  }
};

export const readPrptypeCache = async (
  prptype: string,
): Promise<CachedPrptype | null> => {
  try {
    return await store.get<CachedPrptype>(`prptype:${prptype}`);
  } catch (error) {
    console.error('❌ Browser cache read error:', error);
    return null;
  }
};

export const clearOldChunks = async (prptype: string): Promise<void> => {
  await store.remove(`prptype:${prptype}`);
};

export const getAccountByCode = async (
  prptype: string,
  acccode: string,
) => {
  const cache = await readPrptypeCache(prptype);
  return cache?.account?.find((item: any) => String(item?.acccode) === String(acccode)) || null;
};

export const getBankByName = async (
  prptype: string,
  bankName: string,
) => {
  const cache = await readPrptypeCache(prptype);
  const target = String(bankName).toLowerCase();
  return (
    cache?.banks?.find(
      (item: any) => String(item?.BankName ?? '').toLowerCase() === target,
    ) || null
  );
};

export const getPrptypeIndex = async (prptype: string) => {
  const cache = await readPrptypeCache(prptype);
  if (!cache) return null;
  const accountIndex: Record<string, number> = {};
  const bankIndex: Record<string, number> = {};
  (cache.account || []).forEach((item: any, index: number) => {
    if (item?.acccode) accountIndex[item.acccode] = index;
  });
  (cache.banks || []).forEach((item: any, index: number) => {
    if (item?.BankName) bankIndex[item.BankName] = index;
  });
  return { accountIndex, bankIndex };
};
