// CardScanService.js
// Handles: picking/capturing the visiting card photo, checking connectivity,
// uploading to Laravel, and returning parsed fields.
//
// Install: expo install expo-image-picker @react-native-community/netinfo

// import * as ImagePicker from 'expo-image-picker';
// NEW
import NetInfo from '@react-native-community/netinfo';
import { API } from '../../common/API/dynamicAPI';
import api from './api';
import { PermissionsAndroid, Platform } from 'react-native';

import { launchCamera } from 'react-native-image-picker';

/**
 * Returns true if device currently has internet connectivity.
 */
export async function isOnline() {
  const state = await NetInfo.fetch();
  return !!(state.isConnected && state.isInternetReachable !== false);
}

/**
 * Opens camera to capture the visiting card. Returns the local file URI,
 * or null if the user cancelled.
 */
// export async function captureCardPhoto() {
//   const permission = await requestCameraPermission();

//   if (permission !== 'granted') {
//     throw new Error('CAMERA_PERMISSION_DENIED');
//   }

//   const result = await launchCamera({
//     mediaType: 'photo',
//     quality: 0.7,
//     includeBase64: false,
//     saveToPhotos: false,
//   });

//   if (result.didCancel) {
//     return null;
//   }

//   if (result.errorCode) {
//     throw new Error(result.errorMessage || 'CAMERA_ERROR');
//   }

//   return result.assets?.[0]?.uri || null;
// }
export async function captureCardPhoto() {
  if (Platform.OS === 'android') {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.CAMERA,
      {
        title: 'Camera Permission',
        message: 'App needs camera access to scan visiting cards',
        buttonPositive: 'OK',
      },
    );

    if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
      throw new Error('CAMERA_PERMISSION_DENIED');
    }
  }

  const result = await launchCamera({
    mediaType: 'photo',
    quality: 0.7,
    saveToPhotos: false,
  });

  console.log('CAMERA RESULT', result);

  if (result.didCancel) {
    return null;
  }

  if (result.errorCode) {
    throw new Error(result.errorMessage || result.errorCode);
  }

  return result.assets?.[0]?.uri || null;
}

/**
 * Uploads the card image to Laravel's /card-scan endpoint and returns
 * the parsed fields: { party_name, address, gst_no, contact_name, mobile, email }
 *
 * Throws:
 *  - Error('OFFLINE')          if no connectivity (caller should show offline hint)
 *  - Error('SCAN_FAILED')      if OCR call fails or returns no usable text
 */
export async function scanVisitingCard(imageUri, token) {
  const online = await isOnline();
  if (!online) {
    throw new Error('OFFLINE');
  }

  const formData = new FormData();
  formData.append('card_image', {
    uri: imageUri,
    name: 'card.jpg',
    type: 'image/jpeg',
  });

  console.log('IMAGE URI =>', imageUri);
  console.log('TOKEN =>', token);
  console.log('API URL =>', `${API}/api/card-scan`);

  try {
    const response = await api.post(`${API}/api/card-scan`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        Authorization: `Bearer ${token}`,
      },
    });
    // const response = {
    //   success: true,
    //   fields: {
    //     party_name: '',
    //     contact_name: 'Ashok Jain, Gaurav Jain',
    //     designation: '',
    //     email: '',
    //     front_img: 'http://192.168.13.100:4017/visiting_cards/card_20260624_152514_b74.jpg',
    //     front_path: 'http://192.168.13.100:4017/visiting_cards/card_20260624_152514_b74.jpg',
    //     mobile:
    //       '9422860251, 9834933155',
    //     address:
    //       '306, Jai Commercial Complex, Near Gandhi Bagh Bus Stop, NAGPUR - 440 002',
    //     website: '',
    //     gst_no: '',
    //   },
    // };

    // Expected shape from Laravel — see CardScanController
    // {
    //   success: true,
    //   fields: {
    //     party_name, address, gst_no, contact_name, mobile, email
    //   },
    //   raw_text: "..." // for debugging / manual correction reference
    // }
    console.log('scan/upload res: ', formData, response);
    if (!response.data || !response.data.success) {
      throw new Error('SCAN_FAILED');
    }

    return response.data.fields;
    // return response.fields;
  } catch (err) {
    if (err.message === 'OFFLINE') throw err;
    throw new Error('SCAN_FAILED');
  }
  // } catch (err) {
  //   console.log('CARD API RESPONSE =>', err?.response?.data);
  //   console.log('CARD API STATUS =>', err?.response?.status);
  //   console.log('CARD API MESSAGE =>', err?.message);

  //   throw err;
  // }
}

// {
//   "success": true,
//   "fields": {
//       "party_name": "",
//       "contact_name": "Ashok Jain, Gaurav Jain",
//       "designation": "",
//       "email": "",
//       "mobile": "9422860251, 9834933155, 9422860151, 8329267414, 0712-2775900, 0712-2767731",
//       "address": "306, Jai Commercial Complex, Near Gandhi Bagh Bus Stop, NAGPUR - 440 002",
//       "website": "",
//       "gst_no": ""
//   }
// }

// {
//   "success": false,
//   "message": "No response received from Gemini",
//   "response": {
//       "error": {
//           "code": 503,
//           "message": "This model is currently experiencing high demand. Spikes in demand are usually temporary. Please try again later.",
//           "status": "UNAVAILABLE"
//       }
//   }
// }
