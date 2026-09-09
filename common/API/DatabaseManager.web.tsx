import { CachedPrptype } from './Functions';

const DB = 'FlowNestWebAppCache';
const STORE = 'kv';

function openStore(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function setValue(key: string, value: any) {
  const db = await openStore();
  await new Promise<void>((resolve, reject) => { const tx=db.transaction(STORE,'readwrite'); tx.objectStore(STORE).put(value,key); tx.oncomplete=()=>resolve(); tx.onerror=()=>reject(tx.error); });
  db.close();
}
async function getValue<T=any>(key:string):Promise<T|null>{ const db=await openStore(); const v=await new Promise<T|null>((resolve,reject)=>{const r=db.transaction(STORE,'readonly').objectStore(STORE).get(key);r.onsuccess=()=>resolve(r.result??null);r.onerror=()=>reject(r.error)});db.close();return v; }
async function del(key:string){const db=await openStore();await new Promise<void>((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).delete(key);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error)});db.close();}

const key = (p:string) => `prptype:${p}`;

export const initDatabase = async (): Promise<boolean> => { try { const db=await openStore(); db.close(); return true; } catch(e){ console.error('❌ Web DB INIT ERROR',e); return false; } };

export const saveLargeData = async (prptype: string, data: CachedPrptype): Promise<boolean> => {
  try {
    await setValue(key(prptype), { ...data, lastUpdated: new Date().toISOString() });
    return true;
  } catch(e){ console.error('❌ Web cache save error',e); return false; }
};

export const readPrptypeCache = async (prptype: string): Promise<CachedPrptype | null> => {
  try { return await getValue<CachedPrptype>(key(prptype)); } catch(e){ console.error('❌ Web cache read error',e); return null; }
};
export const clearOldChunks = async (prptype:string) => { await del(key(prptype)); };
export const getAccountByCode = async (prptype:string, acccode:string) => { const d:any=await readPrptypeCache(prptype); return d?.account?.find((a:any)=>String(a?.acccode)===String(acccode)) || null; };
export const getBankByName = async (prptype:string, bankName:string) => { const d:any=await readPrptypeCache(prptype); return d?.banks?.find((b:any)=>String(b?.BankName)===String(bankName)) || null; };
export const getPrptypeIndex = async () => { const db=await openStore(); const keys=await new Promise<any[]>((resolve,reject)=>{const r=db.transaction(STORE,'readonly').objectStore(STORE).getAllKeys();r.onsuccess=()=>resolve(r.result as any[]);r.onerror=()=>reject(r.error)});db.close(); const prptypes=keys.filter(k=>String(k).startsWith('prptype:')).map(k=>String(k).slice(8)); return {prptypes,count:prptypes.length}; };
