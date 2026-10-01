import { createWebKVStore } from '../../common/utils/webIndexedDB';
import api from './api';
import { API } from '../../common/API/dynamicAPI';
import { getEventYearNo } from './eventYear';

const store = createWebKVStore('FlowNestEventCache');
const groups = {
  design: { key: 'cached_designs' },
  itemS: { key: 'cached_item_S' },
  itemK: { key: 'cached_item_K' },
  itemV: { key: 'cached_item_V' },
  itemR: { key: 'cached_item_R' },
};

const jsonGet = async key => {
  try { return (await store.get(key)) || null; } catch { return null; }
};
const jsonSet = async (key, value) => {
  try { await store.set(key, value); }
  catch (error) { console.error('Browser cache write failed', error); }
};

const chunkSet = async (group, items) => {
  await store.set(group.key, items || []);
};

const chunkGet = async group => {
  return (await store.get(group.key)) || null;
};

const chunkClear = async group => {
  await store.remove(group.key);
};

export const getCachedEvents = () => jsonGet('cached_events');
export const setCachedEvents = events => jsonSet('cached_events', events);
export const clearCachedEvents = () => store.remove('cached_events');

export const getCachedPrp = () => jsonGet('cached_prp');
export const setCachedPrp = prp => jsonSet('cached_prp', prp);
export const clearCachedPrp = () => store.remove('cached_prp');

export const setCachedDesing = designs => chunkSet(groups.design, designs);
export const getCachedDesign = () => chunkGet(groups.design);
export const clearCachedDesing = () => chunkClear(groups.design);

export const setCachedItem = items => chunkSet(groups.itemS, items);
export const getCachedItem = () => chunkGet(groups.itemS);
export const clearCachedItem = () => chunkClear(groups.itemS);

export const setCachedItemK = items => chunkSet(groups.itemK, items);
export const getCachedItemK = () => chunkGet(groups.itemK);
export const clearCachedItemK = () => chunkClear(groups.itemK);

export const setCachedItemV = items => chunkSet(groups.itemV, items);
export const getCachedItemV = () => chunkGet(groups.itemV);
export const clearCachedItemV = () => chunkClear(groups.itemV);

export const setCachedItemR = items => chunkSet(groups.itemR, items);
export const getCachedItemR = () => chunkGet(groups.itemR);
export const clearCachedItemR = () => chunkClear(groups.itemR);

// Web does not open native SQLite. Keep the bootstrap contract unchanged.
export async function initDb(token, prptype) {
  if (!token || !prptype) return;
  try {
    const yearno = await getEventYearNo();
    const response = await api.get(`${API}/api/getevent`, {
      params: { prptype, yearno },
      headers: { Authorization: `Bearer ${token}` },
    });
    const events = response?.data?.data;
    if (events?.length) await setCachedEvents(events);
  } catch (error) {
    console.log('Failed to fetch events during web initDb', error?.message);
  }
}

const ENQUIRY_KEY = 'cached_enquiries';

export function generateLocalId() {
  return `ENQ_${Date.now()}_${Math.floor(Math.random() * 1000000)}`;
}

export async function insertEnquiry(enquiry) {
  const rows = (await jsonGet(ENQUIRY_KEY)) || [];
  const localId = enquiry.local_id || generateLocalId();
  rows.push({
    ...enquiry,
    local_id: localId,
    reference_photos: enquiry.reference_photos || [],
    items: enquiry.items || [],
    sync_status: 'pending',
    is_deleted: 0,
    created_at: Date.now(),
    updated_at: Date.now(),
  });
  await jsonSet(ENQUIRY_KEY, rows);
  return localId;
}

export async function getPendingEnquiries() {
  const rows = (await jsonGet(ENQUIRY_KEY)) || [];
  return rows.filter(row => ['pending', 'failed'].includes(row.sync_status) && !row.is_deleted);
}

export async function getAllEnquiries() {
  const rows = (await jsonGet(ENQUIRY_KEY)) || [];
  return rows.filter(row => !row.is_deleted).sort((a, b) => b.created_at - a.created_at);
}

export async function deleteAllEnquiriesFromDB() {
  await store.remove(ENQUIRY_KEY);
  return [];
}

const updateRow = async (localId, updater) => {
  const rows = (await jsonGet(ENQUIRY_KEY)) || [];
  const index = rows.findIndex(row => row.local_id === localId);
  if (index < 0) return false;
  rows[index] = { ...rows[index], ...updater(rows[index]), updated_at: Date.now() };
  await jsonSet(ENQUIRY_KEY, rows);
  return true;
};

export async function markSynced(localId, serverId) {
  return updateRow(localId, () => ({ server_id: serverId, sync_status: 'synced' }));
}

export async function markFailed(localId) {
  return updateRow(localId, () => ({ sync_status: 'failed' }));
}

export async function markSyncing(localId) {
  return updateRow(localId, () => ({ sync_status: 'syncing' }));
}

export const updateEnquiryLocally = async (localId, updatedData) =>
  updateRow(localId, () => ({
    ...updatedData,
    items_json: updatedData.items_json
      ? JSON.stringify(updatedData.items_json)
      : updatedData.items_json,
    sync_status: 'pending',
  }));

export default async function getDb() {
  return null;
}
