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

// export async function syncPendingEnquiries(token, yearno, prptype) {
//   if (isSyncing) return;
//   isSyncing = true;

//   try {
//     const state = await NetInfo.fetch();
//     if (!state.isConnected || state.isInternetReachable === false) {
//       return;
//     }

//     const pending = await getPendingEnquiries();

//     for (const enquiry of pending) {
//       try {
//         console.log('SYNCING ENQUIRY', enquiry);

//         const formData = new FormData();
//         formData.append('back_img', {
//           uri: enquiry.back_img,
//           name: 'card.jpg',
//           type: 'image/jpeg',
//         },
//       );

//         await markSyncing(enquiry.local_id);

//         const payload = {
//           local_id: enquiry.local_id,
//           party_name: enquiry.party_name,
//           address: enquiry.address,
//           gst_no: enquiry.gst_no,
//           design_requirement: enquiry.design_requirement,
//           design_name: enquiry.design_name,
//           qty_required: enquiry.qty_required,
//           price: enquiry.price,
//           colour_requirement: enquiry.colour_requirement,
//           contact_name: enquiry.contact_name,
//           designation: enquiry.designation,
//           mobile: enquiry.mobile,
//           email: enquiry.email,

//           front_img: enquiry.front_img || '',
//           back_img_path: enquiry.back_img || '',

//           card_front_uri: enquiry.card_front_uri,
//           front_img_path: enquiry.front_img,

//           // scanned_from_card: !!enquiry.scanned_from_card,
//           scanned_from_card: enquiry.scanned_from_card,
//           prptype: prptype,
//           yearno: yearno,

//           // ============

//           // user_id: user,

//           // party_name: partyName,
//           // address,
//           // gst_no: gstNo,

//           // design_requirement: designRequirement,
//           // qty_required: qtyRequired,
//           // price,

//           // colour_requirement: colourRequirement,
//           // contact_name: contactName,
//           // designation,

//           // mobile,
//           // email,

//           // front_img: front_path,
//           // back_img: backUri,

//           // card_front_uri: cardFrontUri,
//           // scanned_from_card: scannedFromCard,
//         };

//         console.log('Syncing', payload);
//         // const res = await api.post('/enquiries', payload);

//         const res = await api.post(`${API}/api/enquiries`, payload, {
//           headers: {
//             'Content-Type': 'multipart/form-data',
//             Authorization: `Bearer ${token}`,
//           },
//         });

//         // Laravel returns the created/existing row — see EnquiryController
//         await markSynced(enquiry.local_id, res.data.id);
//         console.log('Synced', payload, res);

//         // NOTE: card_front_uri / card_back_uri / reference_photos are local file
//         // paths. If you need the actual images on the server, upload them here
//         // via a separate multipart call once you have res.data.id, e.g.:
//         // await uploadEnquiryPhotos(res.data.id, enquiry);
//       } catch (err) {
//         console.log('Sync failed for', enquiry.local_id, err);
//         await markFailed(enquiry.local_id);
//         // continue with the rest of the queue — one failure shouldn't block others
//       }
//     }
//   } finally {
//     isSyncing = false;
//   }
// }

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

// export async function syncPendingEnquiries(token, yearno, prptype) {
//   if (isSyncing) return;
//   isSyncing = true;

//   try {
//     const state = await NetInfo.fetch();
//     if (!state.isConnected || state.isInternetReachable === false) {
//       return;
//     }

//     const pending = await getPendingEnquiries();

//     for (const enquiry of pending) {
//       try {
//         console.log('SYNCING ENQUIRY', enquiry);

//         const formData = new FormData();

//         // Append back_img if it exists
//         if (enquiry.back_img) {
//           const fileName = enquiry.back_img.split('/').pop() || 'card.jpg';
//           formData.append('back_img', {
//             uri:
//               Platform.OS === 'ios'
//                 ? enquiry?.back_img.replace('file://', '') || ''
//                 : enquiry?.back_img || '',
//             name: fileName,
//             type: 'image/jpeg',
//           });
//         }

//         // Append front_img if it exists
//         // if (enquiry.front_img) {
//         //   const fileName =
//         //     enquiry.front_img.split('/').pop() || 'card_front.jpg';
//         //   formData.append('front_img', {
//         //     uri:
//         //       Platform.OS === 'ios'
//         //         ? enquiry.front_img.replace('file://', '')
//         //         : enquiry.front_img,
//         //     name: fileName,
//         //     type: 'image/jpeg',
//         //   });
//         // }

//         // Append other fields to formData
//         Object.keys(enquiry).forEach(key => {
//           if (
//             key !== 'back_img' &&
//             // key !== 'front_img' &&
//             enquiry[key] !== undefined
//           ) {
//             formData.append(key, enquiry[key]);
//           }
//         });

//         // Append additional fields
//         formData.append('prptype', prptype);
//         formData.append('yearno', yearno);
//         formData.append('front_img_path', enquiry.front_img);

//         await markSyncing(enquiry.local_id);

//         const res = await api.post(`${API}/api/enquiries`, formData, {
//           headers: {
//             'Content-Type': 'multipart/form-data',
//             Authorization: `Bearer ${token}`,
//           },
//         });

//         logFormData(formData);

//         console.log('Saves formData :', formData, res);

//         await markSynced(enquiry.local_id, res.data.id);
//         console.log('Synced', enquiry, res);
//       } catch (err) {
//         console.log('Sync failed for', enquiry.local_id, err);
//         await markFailed(enquiry.local_id);
//       }
//     }
//   } finally {
//     isSyncing = false;
//   }
// }
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

// export async function updateEnquiries(id, token, yearno, prptype, fpayload) {
//   if (isSyncing) return;
//   isSyncing = true;

//   try {
//     const state = await NetInfo.fetch();
//     if (!state.isConnected || state.isInternetReachable === false) {
//       return;
//     }

//     // const pending = await getPendingEnquiries();

//     // for (const enquiry of pending) {
//     // try {
//     //   await markSyncing(fpayload.local_id);

//     //   const payload = {
//     //     // local_id: enquiry.local_id,
//     //     // party_name: enquiry.party_name,
//     //     // address: enquiry.address,
//     //     // gst_no: enquiry.gst_no,
//     //     // design_requirement: enquiry.design_requirement,
//     //     // design_name: enquiry.design_name,
//     //     // qty_required: enquiry.qty_required,
//     //     // price: enquiry.price,
//     //     // colour_requirement: enquiry.colour_requirement,
//     //     // contact_name: enquiry.contact_name,
//     //     // designation: enquiry.designation,
//     //     // mobile: enquiry.mobile,
//     //     // email: enquiry.email,

//     //     // front_img: enquiry.front_path || '',
//     //     // back_img: enquiry.backUri || '',

//     //     // card_front_uri: enquiry.cardFrontUri,

//     //     // scanned_from_card: !!enquiry.scanned_from_card,
//     //     // prptype: prptype,
//     //     // yearno: yearno,
//     //     ...fpayload,
//     //   };

//     //   // const res = await api.post('/enquiries', payload);

//     //   const res = await api.put(
//     //     `${API}/api/enquiries/${id}?prptype=${prptype}&yearno=${yearno}`,
//     //     payload,
//     //     {
//     //       headers: {
//     //         'Content-Type': 'application/json',
//     //         Authorization: `Bearer ${token}`,
//     //       },
//     //     },
//     //   );

//     //   // Laravel returns the created/existing row — see EnquiryController
//     //   await markSynced(fpayload.local_id, res.data.id);
//     //   console.log('Synced', fpayload, res);

//     //   // NOTE: card_front_uri / card_back_uri / reference_photos are local file
//     //   // paths. If you need the actual images on the server, upload them here
//     //   // via a separate multipart call once you have res.data.id, e.g.:
//     //   // await uploadpayloadPhotos(res.data.id, payload);
//     //   return res.data;
//     // } catch (err) {
//     //   console.log('Sync failed for', fpayload.local_id, err.message);
//     //   await markFailed(fpayload.local_id);
//     //   // continue with the rest of the queue — one failure shouldn't block others
//     // }
//     try {
//       console.log('upd SYNCING ENQUIRY', fpayload);

//       const formData = new FormData();

//       // Append back_img if it exists
//       if (fpayload.back_img) {
//         const fileName = fpayload.back_img.split('/').pop() || 'card.jpg';
//         formData.append('back_img', {
//           uri:
//             Platform.OS === 'ios'
//               ? fpayload?.back_img.replace('file://', '') || ''
//               : fpayload?.back_img || '',
//           name: fileName,
//           type: 'image/jpeg',
//         });
//       }

//       // Append front_img if it exists
//       // if (fpayload.front_img) {
//       //   const fileName =
//       //     fpayload.front_img.split('/').pop() || 'card_front.jpg';
//       //   formData.append('front_img', {
//       //     uri:
//       //       Platform.OS === 'ios'
//       //         ? fpayload.front_img.replace('file://', '')
//       //         : fpayload.front_img,
//       //     name: fileName,
//       //     type: 'image/jpeg',
//       //   });
//       // }

//       // Append other fields to formData
//       Object.keys(fpayload).forEach(key => {
//         if (
//           key !== 'back_img' &&
//           // key !== 'front_img' &&
//           fpayload[key] !== undefined
//         ) {
//           formData.append(key, fpayload[key]);
//         }
//       });

//       // Append additional fields
//       formData.append('prptype', prptype);
//       formData.append('yearno', yearno);
//       // formData.append('front_img_path', fpayload.front_img);
//       formData.append(
//         'front_img_path',
//         fpayload && fpayload?.front_img
//           ? fpayload?.front_img
//           : fpayload?.front_img_path,
//       );
//       formData.append(
//         'back_img_path',
//         fpayload && fpayload?.back_img
//           ? fpayload?.back_img
//           : fpayload?.back_img_path,
//       );
//       formData.append(
//         'scanned_from_card',
//         fpayload && fpayload?.scanned_from_card === true ? 1 : 0,
//       );
//       formData.append('_method', 'PUT');
//       // formData.append(
//       //   'back_img_path',
//       //   fpayload && fpayload.back_img === '' ? '' : fpayload?.back_img_path,
//       // );
//       console.log('fpayload.back_img', fpayload.back_img);
//       if (
//         fpayload.back_img === '' ||
//         fpayload.back_img === null ||
//         !fpayload.back_img
//       ) {
//         console.log('back_img is empty');
//         formData.append('back_img_path', ''); // Set to empty if back_img is empty
//       } else {
//         console.log('back_img is not empty');
//         formData.append('back_img_path', fpayload.back_img_path || ''); // Retain original value
//       }
//       console.log('back_img_path', fpayload.back_img_path);
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

//       console.log('Saves formData :', formData, res);

//       await markSynced(fpayload.local_id, res.data.id);
//       console.log('Synced', fpayload, res);
//     } catch (err) {
//       console.log('Sync failed for', fpayload.local_id, err);
//       await markFailed(fpayload.local_id);
//     }
//     // }
//   } finally {
//     isSyncing = false;
//   }
// }

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
