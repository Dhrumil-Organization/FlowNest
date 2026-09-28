// api.js
// Axios instance — attaches the Laravel Passport bearer token automatically.
// Works identically in Expo (axios + AsyncStorage are JS-only, no native linking).
//
// Install:
//   npx expo install @react-native-async-storage/async-storage
//   npm install axios

import axios from 'axios';
import AsyncStorage from '@/common/utils/compatibleStorage';
import { API, getApiBaseUrl } from '../../common/API/dynamicAPI';

// Your Laravel API base URL
export const BASE_URL = API;

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 999999999999, // card-scan OCR can take a few seconds; keep this generous
});

api.interceptors.request.use(async config => {
  // Always use the LIVE host so a property switch (apig <-> apiy) applies without refresh.
  config.baseURL = getApiBaseUrl();
  const token = await AsyncStorage.getItem('access_token'); // saved at login
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  response => response,
  error => {
    if (error.response && error.response.status === 401) {
      console.log('Passport token invalid/expired — user may need to re-login when next online');
    }
    return Promise.reject(error);
  },
);

export default api;
