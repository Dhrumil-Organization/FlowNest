// // CardScanService.js
// // ────────────────────────────────────────────────────────────────────────────
// // Handles: capturing the visiting-card photo, checking connectivity,
// // uploading to Laravel, and returning parsed OCR fields.
// //
// // EXPO version — uses expo-network (connectivity) + expo-image-picker (camera).
// //
// // Install:
// //   npx expo install expo-network expo-image-picker
// // ────────────────────────────────────────────────────────────────────────────

// import { API } from '@/common/API/dynamicAPI';
// import * as ImagePicker from 'expo-image-picker';
// import * as Network from 'expo-network';
// import api from './api';

// /**
//  * True if the device currently has internet connectivity.
//  */
// export async function isOnline() {
//   const state = await Network.getNetworkStateAsync();
//   return !!(state?.isConnected && state?.isInternetReachable !== false);
//   // return false
// }

// /**
//  * Opens the camera to capture the visiting card.
//  * Returns the local file URI, or null if the user cancelled.
//  * Throws Error('CAMERA_PERMISSION_DENIED') if permission is refused.
//  */
// export async function captureCardPhoto() {
//   const permission = await ImagePicker.requestCameraPermissionsAsync();
//   if (!permission.granted) {
//     throw new Error('CAMERA_PERMISSION_DENIED');
//   }

//   const result = await ImagePicker.launchCameraAsync({
//     mediaTypes: ImagePicker.MediaTypeOptions.Images,
//     quality: 0.7,
//     allowsEditing: false,
//   });

//   if (result.canceled) return null;
//   return result.assets?.[0]?.uri || null;
// }

// /**
//  * Uploads the card image to Laravel's /card-scan endpoint and returns the
//  * parsed fields: { party_name, address, gst_no, contact_name, mobile, email, ... }
//  *
//  * Throws:
//  *  - Error('OFFLINE')      if there is no connectivity
//  *  - Error('SCAN_FAILED')  if the OCR call fails or returns no usable text
//  */
// export async function scanVisitingCard(imageUri, token) {
//   const online = await isOnline();
//   if (!online) {
//     throw new Error('OFFLINE');
//   }

//   const formData = new FormData();
//   formData.append('card_image', {
//     uri: imageUri,
//     name: 'card.jpg',
//     type: 'image/jpeg',
//   });

//   try {
//     const response = await api.post(`${API}/api/card-scan`, formData, {
//       headers: {
//         'Content-Type': 'multipart/form-data',
//         Authorization: `Bearer ${token}`,
//       },
//     });

//     if (!response.data || !response.data.success) {
//       throw new Error('SCAN_FAILED');
//     }

//     return response.data.fields;
//   } catch (err) {
//     if (err.message === 'OFFLINE') throw err;
//     throw new Error('SCAN_FAILED');
//   }
// }
// CardScanService.js
// ────────────────────────────────────────────────────────────────────────────
// Handles: capturing the visiting-card photo, checking connectivity,
// uploading to Laravel, and returning parsed OCR fields.
//
// EXPO version — uses expo-network (connectivity) + expo-image-picker (camera).
//
// Install:
//   npx expo install expo-network expo-image-picker
// ────────────────────────────────────────────────────────────────────────────

import { API } from '@/common/API/dynamicAPI';
import * as ImagePicker from 'expo-image-picker';
import * as Network from 'expo-network';
import api from './api';

/**
 * True if the device currently has internet connectivity.
 */
export async function isOnline() {
  const state = await Network.getNetworkStateAsync();
  return !!(state?.isConnected && state?.isInternetReachable !== false);
  // return false
}

/**
 * Opens the camera to capture the visiting card.
 * Returns the local file URI, or null if the user cancelled.
 * Throws Error('CAMERA_PERMISSION_DENIED') if permission is refused.
 */
export async function captureCardPhoto() {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) {
    throw new Error('CAMERA_PERMISSION_DENIED');
  }

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 0.7,
    allowsEditing: false,
  });

  if (result.canceled) return null;
  return result.assets?.[0]?.uri || null;
}

/**
 * Uploads the card image(s) to Laravel's /card-scan endpoint and returns the
 * parsed fields: { party_name, address, gst_no, contact_name, mobile, email,
 * front_img, front_img_path, back_img, back_img_path, ... }
 *
 * @param {string} frontUri - local uri of the front-side capture (required)
 * @param {string|null} backUri - local uri of the back-side capture (optional)
 * @param {string} token
 *
 * Throws:
 *  - Error('OFFLINE')      if there is no connectivity
 *  - Error('SCAN_FAILED')  if the OCR call fails or returns no usable text
 */
export async function scanVisitingCard(frontUri, backUri, token) {
  const online = await isOnline();
  if (!online) {
    throw new Error('OFFLINE');
  }

  const formData = new FormData();
  formData.append('card_image', {
    uri: frontUri,
    name: 'card.jpg',
    type: 'image/jpeg',
  });

  // card_image_back is always sent: the back photo when captured, or an
  // empty string "" when the user skipped the back side.
  if (backUri) {
    formData.append('card_image_back', {
      uri: backUri,
      name: 'card_back.jpg',
      type: 'image/jpeg',
    });
  } else {
    formData.append('card_image_back', '');
  }

  try {
    const response = await api.post(`${API}/api/card-scan`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        Authorization: `Bearer ${token}`,
      },
    });
console.log('Card scan response:', response, formData);
    if (!response.data || !response.data.success) {
      throw new Error('SCAN_FAILED');
    }

    return response.data.fields;
  } catch (err) {
    if (err.message === 'OFFLINE') throw err;
    throw new Error('SCAN_FAILED');
  }
}