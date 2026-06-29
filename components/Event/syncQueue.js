// src/services/syncQueue.js
import { getPendingEnquiries, markSynced, markFailed, markSyncing } from './db';
import api from './api';
import { API } from '../../common/API/dynamicAPI';
import { Platform } from 'react-native';
import NetInfo from '@react-native-community/netinfo';

let isSyncing = false;
let syncAborted = false; // allow abort if needed

// retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // ms

const API_FIELDS = [
  'party_name',
  'address',
  'gst_no',
  'design_requirement',
  'design_name',
  'qty_required',
  'price',
  'colour_requirement',
  'contact_name',
  'designation',
  'mobile',
  'email',
  'front_img',
  'back_img',
  'card_front_uri',
  'scanned_from_card',
  'event_code',
  'design_dsn_code',
  'design_dsn_name',
];

const logFormData = formData => {
  // same as existing code, skip for brevity
};

/**
 * processSingleEnquiry – tries to sync one enquiry with retries.
 * Returns { success: boolean, error?: any }
 */
async function processSingleEnquiry(enquiry, token, yearno, prptype) {
  await markSyncing(enquiry.local_id);

  let lastError;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const formData = new FormData();

      if (enquiry.back_img && enquiry.back_img.trim()) {
        const fileName = enquiry.back_img.split('/').pop() || 'card.jpg';
        formData.append('back_img', {
          uri:
            Platform.OS === 'ios'
              ? enquiry.back_img.replace('file://', '')
              : enquiry.back_img,
          name: fileName,
          type: 'image/jpeg',
        });
      }

      API_FIELDS.forEach(key => {
        if (key === 'back_img') return;
        let val = enquiry[key];
        if (key === 'scanned_from_card') val = val ? 1 : 0;
        if (val !== null && val !== undefined) {
          formData.append(key, val);
        } else {
          formData.append(key, '');
        }
      });

      formData.append('prptype', prptype);
      formData.append('yearno', yearno);
      formData.append('front_img_path', enquiry.front_img || '');
      formData.append('back_img_path', enquiry.back_img || '');
      formData.append('party_name ', enquiry.party_name || '');
      formData.append('local_id', enquiry.local_id || '');
      formData.append('design_dsn_code', enquiry.design_dsn_code || '');
      formData.append('design_dsn_name', enquiry.design_dsn_name || '');

      const res = await api.post(`${API}/api/enquiries`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`,
        },
      });

      await markSynced(enquiry.local_id, res.data.id);
      return { success: true };
    } catch (err) {
      lastError = err;
      console.log(`Attempt ${attempt} failed for ${enquiry.local_id}`, err);
      if (attempt < MAX_RETRIES) {
        await new Promise(res => setTimeout(res, RETRY_DELAY));
      }
    }
  }

  await markFailed(enquiry.local_id);
  return { success: false, error: lastError };
}

export async function startSyncQueue(token, yearno, prptype, onProgress) {
  if (isSyncing) {
    console.log('Sync already running');
    return;
  }
  isSyncing = true;
  syncAborted = false;

  try {
    const state = await NetInfo.fetch();
    if (!state.isConnected || state.isInternetReachable === false) {
      onProgress({ type: 'error', message: 'No internet connection' });
      isSyncing = false;
      return;
    }   

    let pending = await getPendingEnquiries();
    if (pending.length === 0) {
      // अब साफ़-साफ़ 0-0 भेजेंगे, लेकिन UI में हम इसे नहीं दिखाएँगे (नीचे देखो)
      onProgress({ type: 'all_done', syncedCount: 0, failedCount: 0 });
      isSyncing = false;
      return;
    }

    onProgress({ type: 'start', total: pending.length });

    let syncedCount = 0;
    let failedCount = 0;

    for (const enquiry of pending) {
      if (syncAborted) {
        onProgress({ type: 'aborted' });
        break;
      }

      onProgress({
        type: 'progress',
        currentItem: enquiry,
        syncedCount,
        failedCount,
        total: pending.length,
      });

      const result = await processSingleEnquiry(
        enquiry,
        token,
        yearno,
        prptype,
      );

      if (result.success) {
        syncedCount++;
      } else {
        failedCount++;
      }

      onProgress({
        type: 'item_done',
        enquiry,
        success: result.success,
        syncedCount,
        failedCount,
        total: pending.length,
      });

      // Sync होने के बाद फिर से पूछो — शायद बीच में नया डेटा add हो गया हो
      pending = await getPendingEnquiries();
      if (pending.length === 0) break;
    }

    // अगर बीच में सब खत्म हो गए तो भी counts सही भेजेंगे
    if (!syncAborted) {
      onProgress({ type: 'all_done', syncedCount, failedCount });
    }
  } catch (err) {
    console.log('Sync queue error', err);
    onProgress({ type: 'error', message: err.message });
  } finally {
    isSyncing = false;
    syncAborted = false;
  }
}

export function abortSync() {
  syncAborted = true;
}
