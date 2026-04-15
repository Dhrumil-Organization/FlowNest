import { API } from '@/common/API/dynamicAPI';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';
import * as MailComposer from 'expo-mail-composer';
import * as Print from 'expo-print';
import qs from 'qs';
import { Alert } from 'react-native';

// Define types for bug reports and API responses
interface BugReport {
  filename: string;
  username: string;
  endpoint: string;
  method: string;
  payload: any;
  timestamp: string;
  error: any;
  response: any;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: any;
  bugReport?: BugReport;
}

// Helper function to fetch token and username from AsyncStorage
const getAuthData = async () => {
  const token = await AsyncStorage.getItem('access_token');
  const userDetails = await AsyncStorage.getItem('user_details');
  const username = userDetails ? JSON.parse(userDetails)?.username || 'User' : 'User';
  return { token: token || '', username };
};

// Generate a bug report object
const generateBugReport = (
  filename: string,
  username: string,
  endpoint: string,
  method: string,
  payload: any,
  error: any,
  response?: any
): BugReport => ({
  filename,
  username,
  endpoint,
  method,
  payload,
  timestamp: new Date().toISOString(),
  error: error.message || error,
  response: response || null,
});

// Generate a PDF bug report using expo-print
const generateBugReportPDF = async (bugReport: BugReport) => {
  const html = `
    <html>
      <body>
        <h1>Bug Report</h1>
        <p><strong>Filename:</strong> ${bugReport.filename}</p>
        <p><strong>Username:</strong> ${bugReport.username}</p>
        <p><strong>Endpoint:</strong> ${bugReport.endpoint}</p>
        <p><strong>Method:</strong> ${bugReport.method}</p>
        <p><strong>Timestamp:</strong> ${bugReport.timestamp}</p>
        <p><strong>Error:</strong> ${bugReport.error}</p>
        <p><strong>Response:</strong> ${JSON.stringify(bugReport.response)}</p>
      </body>
    </html>
  `;

  const { uri } = await Print.printToFileAsync({ html });
  return uri;
};

// Send bug report as email
const sendBugReportEmail = async (bugReport: BugReport, pdfUri: string) => {
  const isAvailable = await MailComposer.isAvailableAsync();
  if (!isAvailable) {
    console.error('Email is not available on this device.');
    return;
  }

  await MailComposer.composeAsync({
    recipients: ['rhythmtasks@gmail.com'],
    subject: `Bug Report: ${bugReport.endpoint} (${bugReport.timestamp})`,
    body: `
      Bug Report Details:
      - Filename: ${bugReport.filename}
      - Username: ${bugReport.username}
      - Endpoint: ${bugReport.endpoint}
      - Method: ${bugReport.method}
      - Error: ${bugReport.error}
      - Response: ${JSON.stringify(bugReport.response)}
    `,
    attachments: [pdfUri],
  });
};

// Save bug report to AsyncStorage
const saveBugReport = async (bugReport: BugReport) => {
  try {
    const existingReports = await AsyncStorage.getItem('bugReports');
    const reports = existingReports ? JSON.parse(existingReports) : [];
    reports.push(bugReport);
    await AsyncStorage.setItem('bugReports', JSON.stringify(reports));
  } catch (error) {
    console.error('Failed to save bug report:', error);
  }
};

// Common API call function
export const apiCall = async <T>(
  filename: string,
  endpoint: string,
  method: 'get' | 'post' | 'put' | 'delete' = 'get',
  payload: any = {},
  params: any = {},
  arrayFormat: 'brackets' | 'indices' | 'repeat' = 'brackets'
): Promise<ApiResponse<T>> => {
  // Fetch token and username from AsyncStorage
  const { token, username } = await getAuthData();

  const config: AxiosRequestConfig = {
    method,
    url: `${API}${endpoint}`,
    headers: {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      'Authorization': `Bearer ${token}`,
    },
    params,
    paramsSerializer: (p) => qs.stringify(p, { arrayFormat }),
  };

  if (method !== 'get') {
    config.data = payload;
  }

  try {
    const response: AxiosResponse<T> = await axios(config);
    if (response.data.success === false) {
      Alert.alert('Bug Report Sent', 'A bug report has been sent to the support team.');
      const bugReport = generateBugReport(filename, username, endpoint, method, payload, new Error('API returned success=false'), response.data);
      await saveBugReport(bugReport);
      const pdfUri = await generateBugReportPDF(bugReport);
      await sendBugReportEmail(bugReport, pdfUri);
      return {
        success: false,
        error: response.data,
        bugReport,
      };
    }
    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    const axiosError = error as AxiosError;
    const bugReport = generateBugReport(
      filename,
      username,
      endpoint,
      method,
      payload,
      axiosError,
      axiosError.response?.data
    );
    await saveBugReport(bugReport);
    const pdfUri = await generateBugReportPDF(bugReport);
    await sendBugReportEmail(bugReport, pdfUri);
    return {
      success: false,
      error: axiosError.message,
      bugReport,
    };
  }
};

// Example: GET request
export const apiGet = async <T>(
  filename: string,
  endpoint: string,
  params: any = {}
): Promise<ApiResponse<T>> => {
  return apiCall<T>(filename, endpoint, 'get', {}, params);
};

// Example: POST request
export const apiPost = async <T>(
  filename: string,
  endpoint: string,
  payload: any = {},
  params: any = {}
): Promise<ApiResponse<T>> => {
  return apiCall<T>(filename, endpoint, 'post', payload, params);
};