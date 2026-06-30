// syncService.js
// Pushes locally-saved (offline) enquiries to Laravel once connectivity returns.
// Call syncPendingEnquiries() on: app foreground, NetInfo connectivity restored,
// and right after a successful manual save while online.

import NetInfo from '@react-native-community/netinfo';
import api from './api';
import { API } from '../../common/API/dynamicAPI';
import { getPendingEnquiries, markSynced, markFailed, markSyncing } from './db';
import { Platform } from 'react-native';
// import RNFetchBlob from 'rn-fetch-blob';

let isSyncing = false; // simple guard against overlapping sync runs


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
  // 'prptype' and 'yearno' are added separately below
];

// Helper to safely log FormData (prevents crash on null values)
const logFormData = formData => {
  console.log('📦 FormData entries:');
  if (formData._parts) {
    formData._parts.forEach(([key, value]) => {
      // Check for null/undefined before accessing properties
      if (value && typeof value === 'object' && value.uri) {
        console.log(`  ${key} = [File: ${value.uri}]`);
      } else {
        console.log(`  ${key} = ${value}`);
      }
    });
  } else {
    console.log('  (cannot inspect FormData)');
  }
};
export async function syncPendingEnquiries(token, yearno, prptype) {
  if (isSyncing) return;
  isSyncing = true;

  try {
    const state = await NetInfo.fetch();
    if (!state.isConnected || state.isInternetReachable === false) {
      return;
    }

    const pending = await getPendingEnquiries();

    for (const enquiry of pending) {
      try {
        console.log('SYNCING ENQUIRY', enquiry);

        const formData = new FormData();

        // 1. Append back_img as a file ONLY if it exists and is not empty
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

        // 2. Append all allowed text fields (skip null/undefined/empty? we'll send them as empty strings)
        API_FIELDS.forEach(key => {
          // Skip 'back_img' because we already handled it as a file
          if (key === 'back_img') return;
          const value = enquiry[key];
          // Convert boolean scanned_from_card to 0/1 if needed
          let finalValue = value;
          if (key === 'scanned_from_card') {
            finalValue = value ? 1 : 0;
          }
          // Append only if value is not null/undefined (send empty string if null)
          if (value !== null && value !== undefined) {
            formData.append(key, finalValue);
          } else {
            // Optionally send empty string to avoid null in backend
            formData.append(key, '');
          }
        });

        // 3. Additional fields required by the API
        formData.append('prptype', prptype);
        formData.append('yearno', yearno);
        // front_img_path and back_img_path are expected by your backend
        // (they may be the same as front_img/back_img or separate)
        formData.append('front_img_path', enquiry.front_img || '');
        formData.append('back_img_path', enquiry.back_img || '');
        formData.append('party_name ', enquiry.party_name || '');
        formData.append('local_id', enquiry.local_id || '');
        formData.append('design_dsn_code', enquiry.design_dsn_code || '');
        formData.append('design_dsn_name', enquiry.design_dsn_name || '');

        await markSyncing(enquiry.local_id);

        // Log the FormData (now safe)
        logFormData(formData);

        console.log('Saves formData :', formData);

        const res = await api.post(`${API}/api/enquiries`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: `Bearer ${token}`,
          },
        });

        console.log('Sync success', res.data);
        await markSynced(enquiry.local_id, res.data.id);
      } catch (err) {
        console.log('Sync failed for', enquiry.local_id, err);
        await markFailed(enquiry.local_id);
      }
    }
  } finally {
    isSyncing = false;
  }
}

export async function syncShowEnquiries(id, token, yearno, prptype) {
  try {
    const res = await api.get(
      `${API}/api/enquiries/${id}?prptype=${prptype}&yearno=${yearno}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    console.log('SUCCESS', id, yearno, prptype, res);

    return res.data;
  } catch (err) {
    console.log('STATUS =>', err?.response?.status);
    console.log('DATA =>', err?.response?.data);

    throw err;
  }
}

export async function deleteEnquiries(id, token, yearno, prptype) {
  try {
    const res = await api.delete(
      `${API}/api/enquiries/${id}?prptype=${prptype}&yearno=${yearno}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    console.log('delete api SUCCESS', id, yearno, prptype, res);

    return res.data;
  } catch (err) {
    console.log('STATUS =>', err?.response?.status);
    console.log('DATA =>', err?.response?.data);

    throw err;
  }
}

/**
 * Call this once near app startup (e.g. in App.js) to auto-sync
 * whenever connectivity is restored.
 */
export function registerSyncListener() {
  return NetInfo.addEventListener(state => {
    if (state.isConnected && state.isInternetReachable !== false) {
      syncPendingEnquiries();
    }
  });
}

// Similarly, update the `updateEnquiries` function – use the same approach
export async function updateEnquiries(id, token, yearno, prptype, fpayload) {
  if (isSyncing) return;
  isSyncing = true;

  try {
    const state = await NetInfo.fetch();
    if (!state.isConnected || state.isInternetReachable === false) {
      return;
    }

    try {
      console.log('UPDATE SYNCING ENQUIRY', fpayload);

      const formData = new FormData();

      // Append back_img as file if present
      if (fpayload.back_img && fpayload.back_img.trim()) {
        const fileName = fpayload.back_img.split('/').pop() || 'card.jpg';
        formData.append('back_img', {
          uri:
            Platform.OS === 'ios'
              ? fpayload.back_img.replace('file://', '')
              : fpayload.back_img,
          name: fileName,
          type: 'image/jpeg',
        });
      }

      // Append all allowed fields
      API_FIELDS.forEach(key => {
        if (key === 'back_img') return;
        const value = fpayload[key];
        let finalValue = value;
        if (key === 'scanned_from_card') {
          finalValue = value ? 1 : 0;
        }
        if (value !== null && value !== undefined) {
          formData.append(key, finalValue);
        } else {
          formData.append(key, '');
        }
      });

      formData.append('prptype', prptype);
      formData.append('yearno', yearno);
      formData.append(
        'front_img_path',
        fpayload.front_img || fpayload.front_img_path || '',
      );
      formData.append(
        'back_img_path',
        fpayload.back_img || fpayload.back_img_path || '',
      );
      formData.append('party_name ', fpayload.party_name || '');
      formData.append('local_id', fpayload.local_id || '');
      formData.append('_method', 'PUT');
      formData.append('design_dsn_code', fpayload.design_dsn_code || '');
      formData.append('design_dsn_name', fpayload.design_dsn_name || '');

      await markSyncing(fpayload.local_id);

      logFormData(formData);

      const res = await api.post(
        `${API}/api/enquiries/${id}?prptype=${prptype}&yearno=${yearno}`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: `Bearer ${token}`,
          },
        },
      );

      console.log('Update success', res.data);
      await markSynced(fpayload.local_id, res.data.id);
    } catch (err) {
      console.log('Update failed for', fpayload.local_id, err);
      await markFailed(fpayload.local_id);
    }
  } finally {
    isSyncing = false;
  }
}
