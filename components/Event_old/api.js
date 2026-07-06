// api.js
// Axios instance — attaches Laravel Passport bearer token automatically.
// Install: npm install axios @react-native-async-storage/async-storage

import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API } from '../../common/API/dynamicAPI';

// Change to your actual Laravel API base URL
export const BASE_URL = API;

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 999999999999, // card-scan OCR can take a few seconds, keep this generous
});

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('access_token'); // Passport access_token saved at login
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Centralised place to handle 401 (expired Passport token) etc.
    if (error.response && error.response.status === 401) {
      console.log('Passport token invalid/expired — user may need to re-login next time online');
    }
    return Promise.reject(error);
  }
);

export default api;
