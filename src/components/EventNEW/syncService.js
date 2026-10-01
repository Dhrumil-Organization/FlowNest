// // // syncService.js
// // // ────────────────────────────────────────────────────────────────────────────
// // // Pushes locally-saved (offline) enquiries to Laravel once connectivity returns.
// // // Call syncPendingEnquiries() on: app foreground, connectivity restored,
// // // and right after a successful manual save while online.
// // //
// // // EXPO version — connectivity via expo-network (replaces @react-native-community/netinfo).
// // //
// // // Install:
// // //   npx expo install expo-network
// // // ────────────────────────────────────────────────────────────────────────────

// // import * as Network from 'expo-network';
// // import { Platform } from 'react-native';
// // import api from './api';
// // import { API } from '../../common/API/dynamicAPI';
// // import { getPendingEnquiries, markSynced, markFailed, markSyncing } from './db';

// // let isSyncing = false; // guard against overlapping sync runs

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

// // // Safe FormData logger (won't crash on null values)
// // const logFormData = formData => {
// //   if (!formData?._parts) return;
// //   formData._parts.forEach(([key, value]) => {
// //     if (value && typeof value === 'object' && value.uri) {
// //       console.log(`  ${key} = [File: ${value.uri}]`);
// //     } else {
// //       console.log(`  ${key} = ${value}`);
// //     }
// //   });
// // };

// // async function hasConnectivity() {
// //   const state = await Network.getNetworkStateAsync();
// //   return !!(state?.isConnected && state?.isInternetReachable !== false);
// // }

// // export async function syncPendingEnquiries(token, yearno, prptype) {
// //   if (isSyncing) return;
// //   isSyncing = true;

// //   try {
// //     if (!(await hasConnectivity())) return;

// //     const pending = await getPendingEnquiries();

// //     for (const enquiry of pending) {
// //       try {
// //         const formData = new FormData();

// //         // back_img → file (only if present)
// //         if (enquiry.back_img && enquiry.back_img.trim()) {
// //           const fileName = enquiry.back_img.split('/').pop() || 'card.jpg';
// //           formData.append('back_img', {
// //             uri:
// //               Platform.OS === 'ios'
// //                 ? enquiry.back_img.replace('file://', '')
// //                 : enquiry.back_img,
// //             name: fileName,
// //             type: 'image/jpeg',
// //           });
// //         }

// //         // text fields
// //         API_FIELDS.forEach(key => {
// //           if (key === 'back_img') return;
// //           const value = enquiry[key];
// //           let finalValue = value;
// //           if (key === 'scanned_from_card') finalValue = value ? 1 : 0;
// //           formData.append(key, value !== null && value !== undefined ? finalValue : '');
// //         });

// //         formData.append('prptype', prptype);
// //         formData.append('yearno', yearno);
// //         formData.append('front_img_path', enquiry.front_img || '');
// //         formData.append('back_img_path', enquiry.back_img || '');
// //         formData.append('party_name ', enquiry.party_name || '');
// //         formData.append('local_id', enquiry.local_id || '');
// //         formData.append('design_dsn_code', enquiry.design_dsn_code || '');
// //         formData.append('design_dsn_name', enquiry.design_dsn_name || '');

// //         await markSyncing(enquiry.local_id);
// //         logFormData(formData);

// //         const res = await api.post(`${API}/api/enquiries`, formData, {
// //           headers: {
// //             'Content-Type': 'multipart/form-data',
// //             Authorization: `Bearer ${token}`,
// //           },
// //         });

// //         await markSynced(enquiry.local_id, res.data.id);
// //       } catch (err) {
// //         console.log('Sync failed for', enquiry.local_id, err?.message);
// //         await markFailed(enquiry.local_id);
// //       }
// //     }
// //   } finally {
// //     isSyncing = false;
// //   }
// // }

// // export async function syncShowEnquiries(id, token, yearno, prptype) {
// //   try {
// //     const res = await api.get(
// //       `${API}/api/enquiries/${id}?prptype=${prptype}&yearno=${yearno}`,
// //       { headers: { Authorization: `Bearer ${token}` } },
// //     );
// //     return res.data;
// //   } catch (err) {
// //     console.log('show STATUS =>', err?.response?.status);
// //     console.log('show DATA =>', err?.response?.data);
// //     throw err;
// //   }
// // }

// // export async function deleteEnquiries(id, token, yearno, prptype) {
// //   try {
// //     const res = await api.delete(
// //       `${API}/api/enquiries/${id}?prptype=${prptype}&yearno=${yearno}`,
// //       { headers: { Authorization: `Bearer ${token}` } },
// //     );
// //     return res.data;
// //   } catch (err) {
// //     console.log('delete STATUS =>', err?.response?.status);
// //     console.log('delete DATA =>', err?.response?.data);
// //     throw err;
// //   }
// // }

// // /**
// //  * Auto-sync whenever connectivity is restored.
// //  * Call once near app startup, passing a callback that triggers your sync.
// //  * Returns a subscription — call subscription.remove() to stop listening.
// //  */
// // export function registerSyncListener(callback) {
// //   return Network.addNetworkStateListener(state => {
// //     if (state.isConnected && state.isInternetReachable !== false) {
// //       callback?.();
// //     }
// //   });
// // }

// // /**
// //  * Update an existing enquiry on the server (multipart, Laravel _method=PUT).
// //  */
// // export async function updateEnquiries(id, token, yearno, prptype, fpayload) {
// //   if (isSyncing) return;
// //   isSyncing = true;

// //   try {
// //     if (!(await hasConnectivity())) return;

// //     try {
// //       const formData = new FormData();

// //       if (fpayload.back_img && fpayload.back_img.trim()) {
// //         const fileName = fpayload.back_img.split('/').pop() || 'card.jpg';
// //         formData.append('back_img', {
// //           uri:
// //             Platform.OS === 'ios'
// //               ? fpayload.back_img.replace('file://', '')
// //               : fpayload.back_img,
// //           name: fileName,
// //           type: 'image/jpeg',
// //         });
// //       }

// //       API_FIELDS.forEach(key => {
// //         if (key === 'back_img') return;
// //         const value = fpayload[key];
// //         let finalValue = value;
// //         if (key === 'scanned_from_card') finalValue = value ? 1 : 0;
// //         formData.append(key, value !== null && value !== undefined ? finalValue : '');
// //       });

// //       formData.append('prptype', prptype);
// //       formData.append('yearno', yearno);
// //       formData.append('front_img_path', fpayload.front_img || fpayload.front_img_path || '');
// //       formData.append('back_img_path', fpayload.back_img || fpayload.back_img_path || '');
// //       formData.append('party_name ', fpayload.party_name || '');
// //       formData.append('local_id', fpayload.local_id || '');
// //       formData.append('_method', 'PUT');
// //       formData.append('design_dsn_code', fpayload.design_dsn_code || '');
// //       formData.append('design_dsn_name', fpayload.design_dsn_name || '');

// //       await markSyncing(fpayload.local_id);
// //       logFormData(formData);

// //       const res = await api.post(
// //         `${API}/api/enquiries/${id}?prptype=${prptype}&yearno=${yearno}`,
// //         formData,
// //         {
// //           headers: {
// //             'Content-Type': 'multipart/form-data',
// //             Authorization: `Bearer ${token}`,
// //           },
// //         },
// //       );

// //       await markSynced(fpayload.local_id, res.data.id);
// //     } catch (err) {
// //       console.log('Update failed for', fpayload.local_id, err?.message);
// //       await markFailed(fpayload.local_id);
// //     }
// //   } finally {
// //     isSyncing = false;
// //   }
// // }
// // syncService.js
// // Updated to handle items JSON payload
// // ────────────────────────────────────────────────────────────────────────────

// import * as Network from 'expo-network';
// import { Platform } from 'react-native';
// import { API } from '../../common/API/dynamicAPI';
// import api from './api';
// import { getPendingEnquiries, markFailed, markSynced, markSyncing } from './db';

// let isSyncing = false;

// async function hasConnectivity() {
//   const state = await Network.getNetworkStateAsync();
//   return !!(state?.isConnected && state?.isInternetReachable !== false);
// }

// const logFormData = formData => {
//   if (!formData?._parts) return;
//   formData._parts.forEach(([key, value]) => {
//     if (value && typeof value === 'object' && value.uri) {
//       console.log(`  ${key} = [File: ${value.uri}]`);
//     } else {
//       console.log(`  ${key} = ${value}`);
//     }
//   });
// };

// export async function syncPendingEnquiries(token, yearno, prptype) {
//   if (isSyncing) return;
//   isSyncing = true;

//   try {
//     if (!(await hasConnectivity())) return;
//     const pending = await getPendingEnquiries();

//     for (const enquiry of pending) {
//       try {
//         const formData = new FormData();

//         // back_img → file
//         if (enquiry.back_img && enquiry.back_img.trim()) {
//           const fileName = enquiry.back_img.split('/').pop() || 'card.jpg';
//           formData.append('back_img', {
//             uri: Platform.OS === 'ios' ? enquiry.back_img.replace('file://', '') : enquiry.back_img,
//             name: fileName,
//             type: 'image/jpeg',
//           });
//         }

//         // Text fields
//         const textFields = [
//           'party_name', 'address', 'gst_no', 'contact_name', 'designation',
//           'mobile', 'email', 'front_img', 'card_front_uri', 'event_code'
//         ];
//         textFields.forEach(key => {
//           const value = enquiry[key];
//           formData.append(key, value !== null && value !== undefined ? value : '');
//         });

//         formData.append('scanned_from_card', enquiry.scanned_from_card ? 1 : 0);
//         formData.append('prptype', prptype);
//         formData.append('yearno', yearno);
//         formData.append('front_img_path', enquiry.front_img || '');
//         formData.append('back_img_path', enquiry.back_img || '');
//         formData.append('local_id', enquiry.local_id || '');

//         // items_json → send as JSON string
//         if (enquiry.items_json) {
//           formData.append('items', enquiry.items_json);
//         }

//         await markSyncing(enquiry.local_id);
//         logFormData(formData);

//         const res = await api.post(`${API}/api/enquiries`, formData, {
//           headers: {
//             'Content-Type': 'multipart/form-data',
//             Authorization: `Bearer ${token}`,
//           },
//         });
//         console.log('Sync successful for', enquiry.local_id, 'Server ID:', res.data.id);
//         console.log('Server response data & payload:', res, formData);

//         await markSynced(enquiry.local_id, res.data.id);
//       } catch (err) {
//         console.log('Sync failed for', enquiry.local_id, err?.message);
//         await markFailed(enquiry.local_id);
//       }
//     }
//   } finally {
//     isSyncing = false;
//   }
// }

// export async function syncShowEnquiries(id, token, yearno, prptype) {
//   try {
//     const res = await api.get(
//       `${API}/api/enquiries/${id}?prptype=${prptype}&yearno=${yearno}`,
//       { headers: { Authorization: `Bearer ${token}` } },
//     );
//     // Parse items JSON if present
//     if (res.data && res.data.items && typeof res.data.items === 'string') {
//       try {
//         res.data.items = JSON.parse(res.data.items);
//       } catch (e) {
//         res.data.items = [];
//       }
//     }
//     return res.data;
//   } catch (err) {
//     console.log('show STATUS =>', err?.response?.status);
//     console.log('show DATA =>', err?.response?.data);
//     throw err;
//   }
// }

// export async function deleteEnquiries(id, token, yearno, prptype) {
//   try {
//     const res = await api.delete(
//       `${API}/api/enquiries/${id}?prptype=${prptype}&yearno=${yearno}`,
//       { headers: { Authorization: `Bearer ${token}` } },
//     );
//     return res.data;
//   } catch (err) {
//     console.log('delete STATUS =>', err?.response?.status);
//     console.log('delete DATA =>', err?.response?.data);
//     throw err;
//   }
// }

// export function registerSyncListener(callback) {
//   return Network.addNetworkStateListener(state => {
//     if (state.isConnected && state.isInternetReachable !== false) {
//       callback?.();
//     }
//   });
// }

// export async function updateEnquiries(id, token, yearno, prptype, fpayload) {
//   if (isSyncing) return;
//   isSyncing = true;

//   try {
//     if (!(await hasConnectivity())) return;

//     const formData = new FormData();

//     if (fpayload.back_img && fpayload.back_img.trim()) {
//       const fileName = fpayload.back_img.split('/').pop() || 'card.jpg';
//       formData.append('back_img', {
//         uri: Platform.OS === 'ios' ? fpayload.back_img.replace('file://', '') : fpayload.back_img,
//         name: fileName,
//         type: 'image/jpeg',
//       });
//     }

//     const textFields = [
//       'party_name', 'address', 'gst_no', 'contact_name', 'designation',
//       'mobile', 'email', 'front_img', 'card_front_uri', 'event_code'
//     ];
//     textFields.forEach(key => {
//       const value = fpayload[key];
//       formData.append(key, value !== null && value !== undefined ? value : '');
//     });

//     formData.append('scanned_from_card', fpayload.scanned_from_card ? 1 : 0);
//     formData.append('prptype', prptype);
//     formData.append('yearno', yearno);
//     formData.append('front_img_path', fpayload.front_img || fpayload.front_img_path || '');
//     formData.append('back_img_path', fpayload.back_img || fpayload.back_img_path || '');
//     formData.append('local_id', fpayload.local_id || '');
//     formData.append('_method', 'PUT');

//     // items → send as JSON string
//     if (fpayload.items && fpayload.items.length > 0) {
//       formData.append('items', JSON.stringify(fpayload.items));
//     }

//     await markSyncing(fpayload.local_id);
//     logFormData(formData);

//     const res = await api.post(
//       `${API}/api/enquiries/${id}?prptype=${prptype}&yearno=${yearno}`,
//       formData,
//       {
//         headers: {
//           'Content-Type': 'multipart/form-data',
//           Authorization: `Bearer ${token}`,
//         },
//       },
//     );

//     await markSynced(fpayload.local_id, res.data.id);
//   } catch (err) {
//     console.log('Update failed for', fpayload.local_id, err?.message);
//     await markFailed(fpayload.local_id);
//   } finally {
//     isSyncing = false;
//   }
// }

// // syncService.js
// // ────────────────────────────────────────────────────────────────────────────
// // Pushes locally-saved (offline) enquiries to Laravel once connectivity returns.
// // Call syncPendingEnquiries() on: app foreground, connectivity restored,
// // and right after a successful manual save while online.
// //
// // EXPO version — connectivity via expo-network (replaces @react-native-community/netinfo).
// //
// // Install:
// //   npx expo install expo-network
// // ────────────────────────────────────────────────────────────────────────────

// import * as Network from 'expo-network';
// import { Platform } from 'react-native';
// import api from './api';
// import { API } from '../../common/API/dynamicAPI';
// import { getPendingEnquiries, markSynced, markFailed, markSyncing } from './db';

// let isSyncing = false; // guard against overlapping sync runs

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

// // Safe FormData logger (won't crash on null values)
// const logFormData = formData => {
//   if (!formData?._parts) return;
//   formData._parts.forEach(([key, value]) => {
//     if (value && typeof value === 'object' && value.uri) {
//       console.log(`  ${key} = [File: ${value.uri}]`);
//     } else {
//       console.log(`  ${key} = ${value}`);
//     }
//   });
// };

// async function hasConnectivity() {
//   const state = await Network.getNetworkStateAsync();
//   return !!(state?.isConnected && state?.isInternetReachable !== false);
// }

// export async function syncPendingEnquiries(token, yearno, prptype) {
//   if (isSyncing) return;
//   isSyncing = true;

//   try {
//     if (!(await hasConnectivity())) return;

//     const pending = await getPendingEnquiries();

//     for (const enquiry of pending) {
//       try {
//         const formData = new FormData();

//         // back_img → file (only if present)
//         if (enquiry.back_img && enquiry.back_img.trim()) {
//           const fileName = enquiry.back_img.split('/').pop() || 'card.jpg';
//           formData.append('back_img', {
//             uri:
//               Platform.OS === 'ios'
//                 ? enquiry.back_img.replace('file://', '')
//                 : enquiry.back_img,
//             name: fileName,
//             type: 'image/jpeg',
//           });
//         }

//         // text fields
//         API_FIELDS.forEach(key => {
//           if (key === 'back_img') return;
//           const value = enquiry[key];
//           let finalValue = value;
//           if (key === 'scanned_from_card') finalValue = value ? 1 : 0;
//           formData.append(key, value !== null && value !== undefined ? finalValue : '');
//         });

//         formData.append('prptype', prptype);
//         formData.append('yearno', yearno);
//         formData.append('front_img_path', enquiry.front_img || '');
//         formData.append('back_img_path', enquiry.back_img || '');
//         formData.append('party_name ', enquiry.party_name || '');
//         formData.append('local_id', enquiry.local_id || '');
//         formData.append('design_dsn_code', enquiry.design_dsn_code || '');
//         formData.append('design_dsn_name', enquiry.design_dsn_name || '');

//         await markSyncing(enquiry.local_id);
//         logFormData(formData);

//         const res = await api.post(`${API}/api/enquiries`, formData, {
//           headers: {
//             'Content-Type': 'multipart/form-data',
//             Authorization: `Bearer ${token}`,
//           },
//         });

//         await markSynced(enquiry.local_id, res.data.id);
//       } catch (err) {
//         console.log('Sync failed for', enquiry.local_id, err?.message);
//         await markFailed(enquiry.local_id);
//       }
//     }
//   } finally {
//     isSyncing = false;
//   }
// }

// export async function syncShowEnquiries(id, token, yearno, prptype) {
//   try {
//     const res = await api.get(
//       `${API}/api/enquiries/${id}?prptype=${prptype}&yearno=${yearno}`,
//       { headers: { Authorization: `Bearer ${token}` } },
//     );
//     return res.data;
//   } catch (err) {
//     console.log('show STATUS =>', err?.response?.status);
//     console.log('show DATA =>', err?.response?.data);
//     throw err;
//   }
// }

// export async function deleteEnquiries(id, token, yearno, prptype) {
//   try {
//     const res = await api.delete(
//       `${API}/api/enquiries/${id}?prptype=${prptype}&yearno=${yearno}`,
//       { headers: { Authorization: `Bearer ${token}` } },
//     );
//     return res.data;
//   } catch (err) {
//     console.log('delete STATUS =>', err?.response?.status);
//     console.log('delete DATA =>', err?.response?.data);
//     throw err;
//   }
// }

// /**
//  * Auto-sync whenever connectivity is restored.
//  * Call once near app startup, passing a callback that triggers your sync.
//  * Returns a subscription — call subscription.remove() to stop listening.
//  */
// export function registerSyncListener(callback) {
//   return Network.addNetworkStateListener(state => {
//     if (state.isConnected && state.isInternetReachable !== false) {
//       callback?.();
//     }
//   });
// }

// /**
//  * Update an existing enquiry on the server (multipart, Laravel _method=PUT).
//  */
// export async function updateEnquiries(id, token, yearno, prptype, fpayload) {
//   if (isSyncing) return;
//   isSyncing = true;

//   try {
//     if (!(await hasConnectivity())) return;

//     try {
//       const formData = new FormData();

//       if (fpayload.back_img && fpayload.back_img.trim()) {
//         const fileName = fpayload.back_img.split('/').pop() || 'card.jpg';
//         formData.append('back_img', {
//           uri:
//             Platform.OS === 'ios'
//               ? fpayload.back_img.replace('file://', '')
//               : fpayload.back_img,
//           name: fileName,
//           type: 'image/jpeg',
//         });
//       }

//       API_FIELDS.forEach(key => {
//         if (key === 'back_img') return;
//         const value = fpayload[key];
//         let finalValue = value;
//         if (key === 'scanned_from_card') finalValue = value ? 1 : 0;
//         formData.append(key, value !== null && value !== undefined ? finalValue : '');
//       });

//       formData.append('prptype', prptype);
//       formData.append('yearno', yearno);
//       formData.append('front_img_path', fpayload.front_img || fpayload.front_img_path || '');
//       formData.append('back_img_path', fpayload.back_img || fpayload.back_img_path || '');
//       formData.append('party_name ', fpayload.party_name || '');
//       formData.append('local_id', fpayload.local_id || '');
//       formData.append('_method', 'PUT');
//       formData.append('design_dsn_code', fpayload.design_dsn_code || '');
//       formData.append('design_dsn_name', fpayload.design_dsn_name || '');

//       await markSyncing(fpayload.local_id);
//       logFormData(formData);

//       const res = await api.post(
//         `${API}/api/enquiries/${id}?prptype=${prptype}&yearno=${yearno}`,
//         formData,
//         {
//           headers: {
//             'Content-Type': 'multipart/form-data',
//             Authorization: `Bearer ${token}`,
//           },
//         },
//       );

//       await markSynced(fpayload.local_id, res.data.id);
//     } catch (err) {
//       console.log('Update failed for', fpayload.local_id, err?.message);
//       await markFailed(fpayload.local_id);
//     }
//   } finally {
//     isSyncing = false;
//   }
// }
// syncService.js
// Updated to handle items JSON payload
// ────────────────────────────────────────────────────────────────────────────

import * as Network from 'expo-network';
import { Platform } from 'react-native';
import { API } from '../../common/API/dynamicAPI';
import api from './api';
import { getPendingEnquiries, markFailed, markSynced, markSyncing } from './db';

let isSyncing = false;

async function hasConnectivity() {
  const state = await Network.getNetworkStateAsync();
  return !!(state?.isConnected && state?.isInternetReachable !== false);
}

const logFormData = formData => {
  if (!formData?._parts) return;
  formData._parts.forEach(([key, value]) => {
    if (value && typeof value === 'object' && value.uri) {
      console.log(`  ${key} = [File: ${value.uri}]`);
    } else {
      console.log(`  ${key} = ${value}`);
    }
  });
};

export async function syncPendingEnquiries(token, yearno, prptype) {
  if (isSyncing) return;
  isSyncing = true;

  try {
    if (!(await hasConnectivity())) return;
    const pending = await getPendingEnquiries();

    for (const enquiry of pending) {
      try {
        const formData = new FormData();

        // back_img → file when it's a real local uri, else send as string (server path)
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
            formData.append('back_img', backUri);
          }
        }

        // front_img → file when it's a real local uri, else send as string (server path)
        if (enquiry.front_img && enquiry.front_img.trim()) {
          const frontUri = enquiry.front_img;
          if (frontUri.startsWith('file://') || frontUri.startsWith('content://')) {
            const fileName = frontUri.split('/').pop() || 'card_front.jpg';
            formData.append('front_img', {
              uri: Platform.OS === 'ios' ? frontUri.replace('file://', '') : frontUri,
              name: fileName,
              type: 'image/jpeg',
            });
          } else {
            formData.append('front_img', frontUri);
          }
        }

        // Text fields (front_img/back_img handled above, not here)
        const textFields = [
          'party_name', 'address', 'gst_no', 'contact_name', 'designation',
          'mobile', 'email', 'card_front_uri', 'event_code'
        ];
        textFields.forEach(key => {
          const value = enquiry[key];
          formData.append(key, value !== null && value !== undefined ? value : '');
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

        await markSyncing(enquiry.local_id);
        logFormData(formData);

        const res = await api.post(`${API}/api/enquiries`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: `Bearer ${token}`,
          },
        });
        console.log('Sync successful for', enquiry.local_id, 'Server ID:', res.data.id);
        console.log('Server response data & payload:', res, formData);

        await markSynced(enquiry.local_id, res.data.id);
      } catch (err) {
        console.log('Sync failed for', enquiry.local_id, err?.message);
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
      // `${API}/api/enquiries/${id}?prptype=${prptype}&yearno=${yearno}`,
      `${API}/api/enquiriesnew/${id}?prptype=${prptype}&yearno=${yearno}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    // Parse items JSON if present
    if (res.data && res.data.items && typeof res.data.items === 'string') {
      try {
        res.data.items = JSON.parse(res.data.items);
      } catch (e) {
        res.data.items = [];
      }
    }
    return res.data;
  } catch (err) {
    console.log('show STATUS =>', err?.response?.status);
    console.log('show DATA =>', err?.response?.data);
    throw err;
  }
}

export async function deleteEnquiries(id, token, yearno, prptype, eventCode) {
  try {
    const res = await api.delete(
      `${API}/api/enquiries/${id}?prptype=${prptype}&yearno=${yearno}`,
      {
        headers: { Authorization: `Bearer ${token}` },
        // Event report: the selected event is sent with key `event`.
        ...(eventCode ? { params: { event: eventCode } } : {}),
      },
    );
    return res.data;
  } catch (err) {
    console.log('delete STATUS =>', err?.response?.status);
    console.log('delete DATA =>', err?.response?.data);
    throw err;
  }
}

export function registerSyncListener(callback) {
  return Network.addNetworkStateListener(state => {
    if (state.isConnected && state.isInternetReachable !== false) {
      callback?.();
    }
  });
}

export async function updateEnquiries(id, token, yearno, prptype, fpayload) {
  if (isSyncing) return;
  isSyncing = true;

  try {
    if (!(await hasConnectivity())) return;

    const formData = new FormData();

    // back_img → file when it's a real local uri, else send as string (server path)
    if (fpayload.back_img && fpayload.back_img.trim()) {
      const backUri = fpayload.back_img;
      if (backUri.startsWith('file://') || backUri.startsWith('content://')) {
        const fileName = backUri.split('/').pop() || 'card.jpg';
        formData.append('back_img', {
          uri: Platform.OS === 'ios' ? backUri.replace('file://', '') : backUri,
          name: fileName,
          type: 'image/jpeg',
        });
      } else {
        formData.append('back_img', backUri);
      }
    }

    // front_img → file when it's a real local uri, else send as string (server path)
    if (fpayload.front_img && fpayload.front_img.trim()) {
      const frontUri = fpayload.front_img;
      if (frontUri.startsWith('file://') || frontUri.startsWith('content://')) {
        const fileName = frontUri.split('/').pop() || 'card_front.jpg';
        formData.append('front_img', {
          uri: Platform.OS === 'ios' ? frontUri.replace('file://', '') : frontUri,
          name: fileName,
          type: 'image/jpeg',
        });
      } else {
        formData.append('front_img', frontUri);
      }
    }

    const textFields = [
      'party_name', 'address', 'gst_no', 'contact_name', 'designation',
      'mobile', 'email', 'card_front_uri', 'event_code'
    ];
    textFields.forEach(key => {
      const value = fpayload[key];
      formData.append(key, value !== null && value !== undefined ? value : '');
    });

    formData.append('scanned_from_card', fpayload.scanned_from_card ? 1 : 0);
    formData.append('prptype', prptype);
    formData.append('yearno', yearno);
    formData.append('front_img_path', fpayload.front_img || fpayload.front_img_path || '');
    formData.append('back_img_path', fpayload.back_img || fpayload.back_img_path || '');
    formData.append('local_id', fpayload.local_id || '');
    formData.append('_method', 'PUT');

    // items → send as JSON string
    if (fpayload.items && fpayload.items.length > 0) {
      formData.append('items', JSON.stringify(fpayload.items));
    }

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

    await markSynced(fpayload.local_id, res.data.id);
  } catch (err) {
    console.log('Update failed for', fpayload.local_id, err?.message);
    await markFailed(fpayload.local_id);
  } finally {
    isSyncing = false;
  }
}
