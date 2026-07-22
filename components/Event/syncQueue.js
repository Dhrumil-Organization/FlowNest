// // // syncQueue.js
// // // ────────────────────────────────────────────────────────────────────────────
// // // Robust sync queue with retries + progress callbacks. Pushes pending enquiries
// // // to Laravel one-by-one and reports progress to the UI via onProgress().
// // //
// // // EXPO version — connectivity via expo-network.
// // //
// // // Install:
// // //   npx expo install expo-network
// // // ────────────────────────────────────────────────────────────────────────────

// // import * as Network from 'expo-network';
// // import { Platform } from 'react-native';
// // import api from './api';
// // import { API } from '../../common/API/dynamicAPI';
// // import { getPendingEnquiries, markSynced, markFailed, markSyncing } from './db';

// // let isSyncing = false;
// // let syncAborted = false;

// // const MAX_RETRIES = 3;
// // const RETRY_DELAY = 1000;

// // const API_FIELDS = [
// //   'party_name',
// //   'address',
// //   'gst_no',
// //   'design_requirement',
// //   'design_name',
// //   'qty_required',
// //   'price',
// //   'colour_requirement',
// //   'contact_name',
// //   'designation',
// //   'mobile',
// //   'email',
// //   'front_img',
// //   'back_img',
// //   'card_front_uri',
// //   'scanned_from_card',
// //   'event_code',
// //   'design_dsn_code',
// //   'design_dsn_name',
// // ];

// // /**
// //  * Try to sync one enquiry with retries.
// //  * Returns { success: boolean, error?, errors?, enquiry? }
// //  */
// // async function processSingleEnquiry(enquiry, token, yearno, prptype) {
// //   await markSyncing(enquiry.local_id);

// //   let lastError;
// //   for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
// //     try {
// //       const formData = new FormData();

// //       if (enquiry.back_img && enquiry.back_img.trim()) {
// //         const fileName = enquiry.back_img.split('/').pop() || 'card.jpg';
// //         formData.append('back_img', {
// //           uri:
// //             Platform.OS === 'ios'
// //               ? enquiry.back_img.replace('file://', '')
// //               : enquiry.back_img,
// //           name: fileName,
// //           type: 'image/jpeg',
// //         });
// //       }

// //       if (enquiry.front_img && enquiry.front_img.trim()) {
// //         const uri = enquiry.front_img;
// //         if (uri.startsWith('file://') || uri.startsWith('content://')) {
// //           const fileName = uri.split('/').pop() || 'card_front.jpg';
// //           formData.append('front_img', {
// //             uri: Platform.OS === 'ios' ? uri.replace('file://', '') : uri,
// //             name: fileName,
// //             type: 'image/jpeg',
// //           });
// //         } else {
// //           // already a server path/URL → send as a string
// //           formData.append('front_img', uri);
// //         }
// //       }

// //       API_FIELDS.forEach(key => {
// //         if (key === 'back_img') return;
// //         let val = enquiry[key];
// //         if (key === 'scanned_from_card') val = val ? 1 : 0;
// //         formData.append(key, val !== null && val !== undefined ? val : '');
// //       });

// //       formData.append('prptype', prptype);
// //       formData.append('yearno', yearno);
// //       formData.append('front_img_path', enquiry.front_img || '');
// //       formData.append('back_img_path', enquiry.back_img || '');
// //       formData.append('party_name ', enquiry.party_name || '');
// //       formData.append('local_id', enquiry.local_id || '');
// //       formData.append('design_dsn_code', enquiry.design_dsn_code || '');
// //       formData.append('design_dsn_name', enquiry.design_dsn_name || '');

// //       const res = await api.post(`${API}/api/enquiries`, formData, {
// //         headers: {
// //           'Content-Type': 'multipart/form-data',
// //           Authorization: `Bearer ${token}`,
// //         },
// //         timeout: 60000,
// //       });

// //       // API returned validation errors
// //       if (res.data && !res.data.success && res.data.errors) {
// //         await markFailed(enquiry.local_id);
// //         return {
// //           success: false,
// //           errors: res.data.errors,
// //           enquiryId: enquiry.local_id,
// //           enquiry,
// //         };
// //       }

// //       // success
// //       if (res.data && res.data.success) {
// //         await markSynced(enquiry.local_id, res.data.id);
// //         return { success: true };
// //       }

// //       // unexpected shape
// //       await markFailed(enquiry.local_id);
// //       return {
// //         success: false,
// //         error: new Error('API returned success: false without errors'),
// //         enquiry,
// //       };
// //     } catch (err) {
// //       lastError = err;
// //       console.log(`Attempt ${attempt} failed for ${enquiry.local_id}`, err?.message);
// //       if (attempt < MAX_RETRIES) {
// //         await new Promise(r => setTimeout(r, RETRY_DELAY));
// //       }
// //     }
// //   }

// //   await markFailed(enquiry.local_id);
// //   return { success: false, error: lastError, enquiry };
// // }

// // export async function startSyncQueue(token, yearno, prptype, onProgress) {
// //   if (isSyncing) {
// //     console.log('Sync already running');
// //     return;
// //   }
// //   isSyncing = true;
// //   syncAborted = false;

// //   try {
// //     const networkState = await Network.getNetworkStateAsync();
// //     if (!networkState?.isConnected || networkState?.isInternetReachable === false) {
// //       onProgress({ type: 'error', message: 'No internet connection' });
// //       isSyncing = false;
// //       return;
// //     }

// //     let pending = await getPendingEnquiries();
// //     if (pending.length === 0) {
// //       onProgress({ type: 'all_done', syncedCount: 0, failedCount: 0 });
// //       isSyncing = false;
// //       return;
// //     }

// //     onProgress({ type: 'start', total: pending.length });

// //     let syncedCount = 0;
// //     let failedCount = 0;
// //     const failedItems = [];

// //     for (const enquiry of pending) {
// //       if (syncAborted) {
// //         onProgress({ type: 'aborted' });
// //         break;
// //       }

// //       onProgress({
// //         type: 'progress',
// //         currentItem: enquiry,
// //         syncedCount,
// //         failedCount,
// //         total: pending.length,
// //       });

// //       const result = await processSingleEnquiry(enquiry, token, yearno, prptype);

// //       if (result.success) {
// //         syncedCount++;
// //         onProgress({
// //           type: 'item_done',
// //           enquiry,
// //           success: true,
// //           syncedCount,
// //           failedCount,
// //           total: pending.length,
// //         });
// //       } else {
// //         failedCount++;
// //         failedItems.push({
// //           ...enquiry,
// //           error: result.error || result.errors || 'Unknown error',
// //           errors: result.errors || null,
// //         });

// //         if (result.errors) {
// //           onProgress({
// //             type: 'validation_error',
// //             enquiry,
// //             errors: result.errors,
// //             syncedCount,
// //             failedCount,
// //             total: pending.length,
// //           });
// //         }

// //         onProgress({
// //           type: 'item_done',
// //           enquiry,
// //           success: false,
// //           error: result.error || result.errors,
// //           syncedCount,
// //           failedCount,
// //           total: pending.length,
// //         });
// //       }

// //       // re-fetch in case new rows were added mid-sync
// //       pending = await getPendingEnquiries();
// //       if (pending.length === 0) break;
// //     }

// //     if (!syncAborted) {
// //       onProgress({ type: 'all_done', syncedCount, failedCount, failedItems });
// //     }
// //   } catch (err) {
// //     console.log('Sync queue error', err?.message);
// //     onProgress({ type: 'error', message: err.message, failedItems: [] });
// //   } finally {
// //     isSyncing = false;
// //     syncAborted = false;
// //   }
// // }

// // export function abortSync() {
// //   syncAborted = true;
// // }
// // syncQueue.js
// // Updated to handle items JSON payload
// // ────────────────────────────────────────────────────────────────────────────

// import * as Network from 'expo-network';
// import { Platform } from 'react-native';
// import { API } from '../../common/API/dynamicAPI';
// import api from './api';
// import { getPendingEnquiries, markFailed, markSynced, markSyncing } from './db';

// let isSyncing = false;
// let syncAborted = false;

// const MAX_RETRIES = 3;
// const RETRY_DELAY = 1000;

// async function processSingleEnquiry(enquiry, token, yearno, prptype) {
//   await markSyncing(enquiry.local_id);

//   let lastError;
//   for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
//     try {
//       const formData = new FormData();

//       if (enquiry.back_img && enquiry.back_img.trim()) {
//         const fileName = enquiry.back_img.split('/').pop() || 'card.jpg';
//         formData.append('back_img', {
//           uri: Platform.OS === 'ios' ? enquiry.back_img.replace('file://', '') : enquiry.back_img,
//           name: fileName,
//           type: 'image/jpeg',
//         });
//       }

//       if (enquiry.front_img && enquiry.front_img.trim()) {
//         const uri = enquiry.front_img;
//         if (uri.startsWith('file://') || uri.startsWith('content://')) {
//           const fileName = uri.split('/').pop() || 'card_front.jpg';
//           formData.append('front_img', {
//             uri: Platform.OS === 'ios' ? uri.replace('file://', '') : uri,
//             name: fileName,
//             type: 'image/jpeg',
//           });
//         } else {
//           formData.append('front_img', uri);
//         }
//       }

//       const textFields = [
//         'party_name', 'address', 'gst_no', 'contact_name', 'designation',
//         'mobile', 'email', 'card_front_uri', 'event_code'
//       ];
//       textFields.forEach(key => {
//         const val = enquiry[key];
//         formData.append(key, val !== null && val !== undefined ? val : '');
//       });

//       formData.append('scanned_from_card', enquiry.scanned_from_card ? 1 : 0);
//       formData.append('prptype', prptype);
//       formData.append('yearno', yearno);
//       formData.append('front_img_path', enquiry.front_img || '');
//       formData.append('back_img_path', enquiry.back_img || '');
//       formData.append('local_id', enquiry.local_id || '');

//       // items_json → send as JSON string
//       if (enquiry.items_json) {
//         formData.append('items', enquiry.items_json);
//       }

//       const res = await api.post(`${API}/api/enquiries`, formData, {
//         headers: {
//           'Content-Type': 'multipart/form-data',
//           Authorization: `Bearer ${token}`,
//         },
//         timeout: 60000,
//       });

//       if (res.data && !res.data.success && res.data.errors) {
//         await markFailed(enquiry.local_id);
//         return {
//           success: false,
//           errors: res.data.errors,
//           enquiryId: enquiry.local_id,
//           enquiry,
//         };
//       }

//       if (res.data && res.data.success) {
//         await markSynced(enquiry.local_id, res.data.id);
//         return { success: true };
//       }

//       await markFailed(enquiry.local_id);
//       return {
//         success: false,
//         error: new Error('API returned success: false without errors'),
//         enquiry,
//       };
//     } catch (err) {
//       lastError = err;
//       console.log(`Attempt ${attempt} failed for ${enquiry.local_id}`, err?.message);
//       if (attempt < MAX_RETRIES) {
//         await new Promise(r => setTimeout(r, RETRY_DELAY));
//       }
//     }
//   }

//   await markFailed(enquiry.local_id);
//   return { success: false, error: lastError, enquiry };
// }

// export async function startSyncQueue(token, yearno, prptype, onProgress) {
//   if (isSyncing) {
//     console.log('Sync already running');
//     return;
//   }
//   isSyncing = true;
//   syncAborted = false;

//   try {
//     const networkState = await Network.getNetworkStateAsync();
//     if (!networkState?.isConnected || networkState?.isInternetReachable === false) {
//       onProgress({ type: 'error', message: 'No internet connection' });
//       isSyncing = false;
//       return;
//     }

//     let pending = await getPendingEnquiries();
//     if (pending.length === 0) {
//       onProgress({ type: 'all_done', syncedCount: 0, failedCount: 0 });
//       isSyncing = false;
//       return;
//     }

//     onProgress({ type: 'start', total: pending.length });

//     let syncedCount = 0;
//     let failedCount = 0;
//     const failedItems = [];

//     for (const enquiry of pending) {
//       if (syncAborted) {
//         onProgress({ type: 'aborted' });
//         break;
//       }

//       onProgress({
//         type: 'progress',
//         currentItem: enquiry,
//         syncedCount,
//         failedCount,
//         total: pending.length,
//       });

//       const result = await processSingleEnquiry(enquiry, token, yearno, prptype);

//       if (result.success) {
//         syncedCount++;
//         onProgress({
//           type: 'item_done',
//           enquiry,
//           success: true,
//           syncedCount,
//           failedCount,
//           total: pending.length,
//         });
//       } else {
//         failedCount++;
//         failedItems.push({
//           ...enquiry,
//           error: result.error || result.errors || 'Unknown error',
//           errors: result.errors || null,
//         });

//         if (result.errors) {
//           onProgress({
//             type: 'validation_error',
//             enquiry,
//             errors: result.errors,
//             syncedCount,
//             failedCount,
//             total: pending.length,
//           });
//         }

//         onProgress({
//           type: 'item_done',
//           enquiry,
//           success: false,
//           error: result.error || result.errors,
//           syncedCount,
//           failedCount,
//           total: pending.length,
//         });
//       }

//       pending = await getPendingEnquiries();
//       if (pending.length === 0) break;
//     }

//     if (!syncAborted) {
//       onProgress({ type: 'all_done', syncedCount, failedCount, failedItems });
//     }
//   } catch (err) {
//     console.log('Sync queue error', err?.message);
//     onProgress({ type: 'error', message: err.message, failedItems: [] });
//   } finally {
//     isSyncing = false;
//     syncAborted = false;
//   }
// }

// export function abortSync() {
//   syncAborted = true;
// }


// // syncQueue.js
// // ────────────────────────────────────────────────────────────────────────────
// // Robust sync queue with retries + progress callbacks. Pushes pending enquiries
// // to Laravel one-by-one and reports progress to the UI via onProgress().
// //
// // EXPO version — connectivity via expo-network.
// //
// // Install:
// //   npx expo install expo-network
// // ────────────────────────────────────────────────────────────────────────────

// import * as Network from 'expo-network';
// import { Platform } from 'react-native';
// import api from './api';
// import { API } from '../../common/API/dynamicAPI';
// import { getPendingEnquiries, markSynced, markFailed, markSyncing } from './db';

// let isSyncing = false;
// let syncAborted = false;

// const MAX_RETRIES = 3;
// const RETRY_DELAY = 1000;

// const API_FIELDS = [
//   'party_name',
//   'address',
//   'gst_no',
//   'design_requirement',
//   'design_name',
//   'qty_required',
//   'price',
//   'colour_requirement',
//   'contact_name',
//   'designation',
//   'mobile',
//   'email',
//   'front_img',
//   'back_img',
//   'card_front_uri',
//   'scanned_from_card',
//   'event_code',
//   'design_dsn_code',
//   'design_dsn_name',
// ];

// /**
//  * Try to sync one enquiry with retries.
//  * Returns { success: boolean, error?, errors?, enquiry? }
//  */
// async function processSingleEnquiry(enquiry, token, yearno, prptype) {
//   await markSyncing(enquiry.local_id);

//   let lastError;
//   for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
//     try {
//       const formData = new FormData();

//       if (enquiry.back_img && enquiry.back_img.trim()) {
//         const fileName = enquiry.back_img.split('/').pop() || 'card.jpg';
//         formData.append('back_img', {
//           uri:
//             Platform.OS === 'ios'
//               ? enquiry.back_img.replace('file://', '')
//               : enquiry.back_img,
//           name: fileName,
//           type: 'image/jpeg',
//         });
//       }

//       if (enquiry.front_img && enquiry.front_img.trim()) {
//         const uri = enquiry.front_img;
//         if (uri.startsWith('file://') || uri.startsWith('content://')) {
//           const fileName = uri.split('/').pop() || 'card_front.jpg';
//           formData.append('front_img', {
//             uri: Platform.OS === 'ios' ? uri.replace('file://', '') : uri,
//             name: fileName,
//             type: 'image/jpeg',
//           });
//         } else {
//           // already a server path/URL → send as a string
//           formData.append('front_img', uri);
//         }
//       }

//       API_FIELDS.forEach(key => {
//         if (key === 'back_img') return;
//         let val = enquiry[key];
//         if (key === 'scanned_from_card') val = val ? 1 : 0;
//         formData.append(key, val !== null && val !== undefined ? val : '');
//       });

//       formData.append('prptype', prptype);
//       formData.append('yearno', yearno);
//       formData.append('front_img_path', enquiry.front_img || '');
//       formData.append('back_img_path', enquiry.back_img || '');
//       formData.append('party_name ', enquiry.party_name || '');
//       formData.append('local_id', enquiry.local_id || '');
//       formData.append('design_dsn_code', enquiry.design_dsn_code || '');
//       formData.append('design_dsn_name', enquiry.design_dsn_name || '');

//       const res = await api.post(`${API}/api/enquiries`, formData, {
//         headers: {
//           'Content-Type': 'multipart/form-data',
//           Authorization: `Bearer ${token}`,
//         },
//         timeout: 60000,
//       });

//       // API returned validation errors
//       if (res.data && !res.data.success && res.data.errors) {
//         await markFailed(enquiry.local_id);
//         return {
//           success: false,
//           errors: res.data.errors,
//           enquiryId: enquiry.local_id,
//           enquiry,
//         };
//       }

//       // success
//       if (res.data && res.data.success) {
//         await markSynced(enquiry.local_id, res.data.id);
//         return { success: true };
//       }

//       // unexpected shape
//       await markFailed(enquiry.local_id);
//       return {
//         success: false,
//         error: new Error('API returned success: false without errors'),
//         enquiry,
//       };
//     } catch (err) {
//       lastError = err;
//       console.log(`Attempt ${attempt} failed for ${enquiry.local_id}`, err?.message);
//       if (attempt < MAX_RETRIES) {
//         await new Promise(r => setTimeout(r, RETRY_DELAY));
//       }
//     }
//   }

//   await markFailed(enquiry.local_id);
//   return { success: false, error: lastError, enquiry };
// }

// export async function startSyncQueue(token, yearno, prptype, onProgress) {
//   if (isSyncing) {
//     console.log('Sync already running');
//     return;
//   }
//   isSyncing = true;
//   syncAborted = false;

//   try {
//     const networkState = await Network.getNetworkStateAsync();
//     if (!networkState?.isConnected || networkState?.isInternetReachable === false) {
//       onProgress({ type: 'error', message: 'No internet connection' });
//       isSyncing = false;
//       return;
//     }

//     let pending = await getPendingEnquiries();
//     if (pending.length === 0) {
//       onProgress({ type: 'all_done', syncedCount: 0, failedCount: 0 });
//       isSyncing = false;
//       return;
//     }

//     onProgress({ type: 'start', total: pending.length });

//     let syncedCount = 0;
//     let failedCount = 0;
//     const failedItems = [];

//     for (const enquiry of pending) {
//       if (syncAborted) {
//         onProgress({ type: 'aborted' });
//         break;
//       }

//       onProgress({
//         type: 'progress',
//         currentItem: enquiry,
//         syncedCount,
//         failedCount,
//         total: pending.length,
//       });

//       const result = await processSingleEnquiry(enquiry, token, yearno, prptype);

//       if (result.success) {
//         syncedCount++;
//         onProgress({
//           type: 'item_done',
//           enquiry,
//           success: true,
//           syncedCount,
//           failedCount,
//           total: pending.length,
//         });
//       } else {
//         failedCount++;
//         failedItems.push({
//           ...enquiry,
//           error: result.error || result.errors || 'Unknown error',
//           errors: result.errors || null,
//         });

//         if (result.errors) {
//           onProgress({
//             type: 'validation_error',
//             enquiry,
//             errors: result.errors,
//             syncedCount,
//             failedCount,
//             total: pending.length,
//           });
//         }

//         onProgress({
//           type: 'item_done',
//           enquiry,
//           success: false,
//           error: result.error || result.errors,
//           syncedCount,
//           failedCount,
//           total: pending.length,
//         });
//       }

//       // re-fetch in case new rows were added mid-sync
//       pending = await getPendingEnquiries();
//       if (pending.length === 0) break;
//     }

//     if (!syncAborted) {
//       onProgress({ type: 'all_done', syncedCount, failedCount, failedItems });
//     }
//   } catch (err) {
//     console.log('Sync queue error', err?.message);
//     onProgress({ type: 'error', message: err.message, failedItems: [] });
//   } finally {
//     isSyncing = false;
//     syncAborted = false;
//   }
// }

// export function abortSync() {
//   syncAborted = true;
// }
// syncQueue.js
// Updated to handle items JSON payload
// ────────────────────────────────────────────────────────────────────────────

import * as Network from 'expo-network';
import { Platform } from 'react-native';
import { API } from '../../common/API/dynamicAPI';
import api from './api';
import { getPendingEnquiries, markFailed, markSynced, markSyncing } from './db';

let isSyncing = false;
let syncAborted = false;

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

async function processSingleEnquiry(enquiry, token, yearno, prptype) {
  await markSyncing(enquiry.local_id);

  let lastError;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const formData = new FormData();

      if (enquiry.back_img && enquiry.back_img.trim()) {
        const backUri = enquiry.back_img;
        if (backUri.startsWith('file://') || backUri.startsWith('content://')) {
          const fileName = backUri.split('/').pop() || 'card.jpg';
          formData.append('back_img', {
            uri: Platform.OS === 'ios' ? backUri.replace('file://', '') : backUri,
            name: fileName,
            type: 'image/jpeg',
          });
        } else {
          // already a server path/URL → send as a string, same as front_img below
          formData.append('back_img', backUri);
        }
      }

      if (enquiry.front_img && enquiry.front_img.trim()) {
        const uri = enquiry.front_img;
        if (uri.startsWith('file://') || uri.startsWith('content://')) {
          const fileName = uri.split('/').pop() || 'card_front.jpg';
          formData.append('front_img', {
            uri: Platform.OS === 'ios' ? uri.replace('file://', '') : uri,
            name: fileName,
            type: 'image/jpeg',
          });
        } else {
          formData.append('front_img', uri);
        }
      }

      const textFields = [
        'party_name', 'address', 'gst_no', 'contact_name', 'designation',
        'mobile', 'email', 'card_front_uri', 'event_code'
      ];
      textFields.forEach(key => {
        const val = enquiry[key];
        formData.append(key, val !== null && val !== undefined ? val : '');
      });

      formData.append('scanned_from_card', enquiry.scanned_from_card ? 1 : 0);
      formData.append('prptype', prptype);
      formData.append('yearno', yearno);
      formData.append('front_img_path', enquiry.front_img || '');
      formData.append('back_img_path', enquiry.back_img || '');
      formData.append('local_id', enquiry.local_id || '');

      // items_json → send as JSON string
      if (enquiry.items_json) {
        formData.append('items', enquiry.items_json);
      }

      const res = await api.post(`${API}/api/enquiries`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`,
        },
        timeout: 60000,
      });

      if (res.data && !res.data.success && res.data.errors) {
        await markFailed(enquiry.local_id);
        return {
          success: false,
          errors: res.data.errors,
          enquiryId: enquiry.local_id,
          enquiry,
        };
      }

      if (res.data && res.data.success) {
        await markSynced(enquiry.local_id, res.data.id);
        return { success: true };
      }

      await markFailed(enquiry.local_id);
      return {
        success: false,
        error: new Error('API returned success: false without errors'),
        enquiry,
      };
    } catch (err) {
      lastError = err;
      console.log(`Attempt ${attempt} failed for ${enquiry.local_id}`, err?.message);
      if (attempt < MAX_RETRIES) {
        await new Promise(r => setTimeout(r, RETRY_DELAY));
      }
    }
  }

  await markFailed(enquiry.local_id);
  return { success: false, error: lastError, enquiry };
}

export async function startSyncQueue(token, yearno, prptype, onProgress) {
  if (isSyncing) {
    console.log('Sync already running');
    return;
  }
  isSyncing = true;
  syncAborted = false;

  try {
    const networkState = await Network.getNetworkStateAsync();
    if (!networkState?.isConnected || networkState?.isInternetReachable === false) {
      onProgress({ type: 'error', message: 'No internet connection' });
      isSyncing = false;
      return;
    }

    let pending = await getPendingEnquiries();
    if (pending.length === 0) {
      onProgress({ type: 'all_done', syncedCount: 0, failedCount: 0 });
      isSyncing = false;
      return;
    }

    onProgress({ type: 'start', total: pending.length });

    let syncedCount = 0;
    let failedCount = 0;
    const failedItems = [];

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

      const result = await processSingleEnquiry(enquiry, token, yearno, prptype);

      if (result.success) {
        syncedCount++;
        onProgress({
          type: 'item_done',
          enquiry,
          success: true,
          syncedCount,
          failedCount,
          total: pending.length,
        });
      } else {
        failedCount++;
        failedItems.push({
          ...enquiry,
          error: result.error || result.errors || 'Unknown error',
          errors: result.errors || null,
        });

        if (result.errors) {
          onProgress({
            type: 'validation_error',
            enquiry,
            errors: result.errors,
            syncedCount,
            failedCount,
            total: pending.length,
          });
        }

        onProgress({
          type: 'item_done',
          enquiry,
          success: false,
          error: result.error || result.errors,
          syncedCount,
          failedCount,
          total: pending.length,
        });
      }

      pending = await getPendingEnquiries();
      if (pending.length === 0) break;
    }

    if (!syncAborted) {
      onProgress({ type: 'all_done', syncedCount, failedCount, failedItems });
    }
  } catch (err) {
    console.log('Sync queue error', err?.message);
    onProgress({ type: 'error', message: err.message, failedItems: [] });
  } finally {
    isSyncing = false;
    syncAborted = false;
  }
}

export function abortSync() {
  syncAborted = true;
}