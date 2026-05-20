import axios, {AxiosInstance, AxiosError} from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API } from '../../common/API/dynamicAPI';

// TODO: Replace with your actual base URL
export const API_BASE_URL = API;

const client: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});

// Attach auth token from AsyncStorage on every request.
// Replace 'auth_token' with your actual key.
client.interceptors.request.use(async config => {
  try {
    const token = await AsyncStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (e) {
    // ignore
  }
  return config;
});

// Centralised error logger
client.interceptors.response.use(
  res => res,
  (error: AxiosError) => {
    if (__DEV__) {
      console.log(
        '[API ERROR]',
        error.config?.url,
        error.response?.status,
        error.response?.data,
      );
    }
    return Promise.reject(error);
  },
);

export default client;
