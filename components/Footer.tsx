import AppAlert from '@/common/utils/appAlert';
// import Icon from '@expo/vector-icons/MaterialIcons';
// import AsyncStorage from '@/common/utils/compatibleStorage';
// import { useRouter } from 'expo-router';
// import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
// import { theme } from './theme';

// export default function Footer() {
//   const router = useRouter();

//   const handleLogout = async () => {
//     await AsyncStorage.clear();
//     router.replace('/(all)/landing');
//     // router.push({
//     //   pathname: `/(auth)/login'`,
//     //   params: {
//     //     _key: Math.random().toString(36).substring(2, 9) // Force remount
//     //   }
//     // })

//   };

//   const handleHome = async () => {
//     // await AsyncStorage.clear();
//     router.replace('/(tabs)');
//     // router.push({
//     //   pathname: `/`,
//     //   params: {
//     //     _key: Math.random().toString(36).substring(2, 9) // Force remount
//     //   }
//     // })

//   };

//   return (
//     <View style={styles.wrapper}>
//       <View style={styles.container}>

//         {/* HOME */}
//         <TouchableOpacity style={styles.item} onPress={handleHome}>
//           <Icon name="home" size={22} color="#fff" />
//           <Text style={styles.text}>Home</Text>
//         </TouchableOpacity>

//         {/* LOGOUT */}
//         <TouchableOpacity style={styles.item} onPress={handleLogout}>
//           <Icon name="logout" size={22} color="#fff" />
//           <Text style={styles.text}>Logout</Text>
//         </TouchableOpacity>

//       </View>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   wrapper: {
//     position: 'absolute',
//     bottom: 20,
//     width: '100%',
//     alignItems: 'center',
//   },
//   container: {
//     flexDirection: 'row',
//     width: '90%',
//     backgroundColor: theme.BRAND_GRADIENT_END,
//     borderRadius: 20,
//     paddingVertical: 12,
//     justifyContent: 'space-around',
//     alignItems: 'center',

//     // shadow (professional look)
//     shadowColor: '#000',
//     shadowOpacity: 0.2,
//     shadowRadius: 10,
//     elevation: 5,
//   },
//   item: {
//     alignItems: 'center',
//   },
//   text: {
//     color: '#fff',
//     fontSize: 12,
//     marginTop: 4,
//   },
// });
import { theme } from './theme'; // 👈 apne actual theme path ke hisaab se adjust karo

import Icon from '@expo/vector-icons/MaterialIcons';
import AsyncStorage from '@/common/utils/compatibleStorage';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
// 👇 Expo SDK 54+ me expo-file-system ka naya API aaya hai jisme EncodingType,
// documentDirectory, writeAsStringAsync, StorageAccessFramework, etc. is normal
// path se export nahi hote — isliye /legacy se import karna zaroori hai.
import axios from 'axios';
import { Buffer } from 'buffer';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  ToastAndroid,
  TouchableOpacity,
  View,
} from 'react-native';
// 👇 react-native-webview Expo Go ke andar already built-in hai (bina prebuild ke chalta
// hai), aur EAS build me bhi bina extra native config ke kaam karta hai.
// Install: npx expo install react-native-webview
import { API } from '@/common/API/dynamicAPI';
import { WebView } from 'react-native-webview';

interface FooterProps {
  onLogout: () => void;
  isConnected: boolean | null;
  totalAmount?: number;
  isChequeList?: boolean;
  text: string;
}

const Footer: React.FC<FooterProps> = ({
  onLogout,
  isConnected,
  totalAmount = 0,
  isChequeList = false,
  text = '',
}) => {
  const router = useRouter();

  // PDF/collection states
  const [menuVisible, setMenuVisible] = useState(false);
  const [fetchingSummary, setFetchingSummary] = useState(false);
  const [fetchingDetails, setFetchingDetails] = useState(false);
  const cancelTokenRef = useRef<any>(null);

  const [pdfModalVisible, setPdfModalVisible] = useState(false);
  const [pdfLocalUri, setPdfLocalUri] = useState<string>('');
  const [pdfPublicUrl, setPdfPublicUrl] = useState<string | null>(null);
  const [reportsModalVisible, setReportsModalVisible] = useState(false);

  const handleLogout = () => {
    AppAlert.alert(
      'Confirm Logout',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.removeItem('access_token');
            await AsyncStorage.removeItem('user_details');
            await AsyncStorage.removeItem('user_menu_apps');
            await AsyncStorage.removeItem('get_property');
            await AsyncStorage.removeItem('current_year');
            await AsyncStorage.removeItem('mastersyncData');
            await AsyncStorage.removeItem('login_user_name');
            await AsyncStorage.removeItem('login_user_passwd');
            await AsyncStorage.removeItem('receivables_sync_date');
            await AsyncStorage.removeItem('receivables_prpgroup');
            await AsyncStorage.removeItem('live_logs_unlocked');
            await AsyncStorage.removeItem('user_prptype');
            onLogout();
          },
        },
      ],
      { cancelable: true }
    );
  };

  // 👇 Apne actual expo-router routes ke hisaab se path adjust karo
  const handleHomePress = () => router.push('/(tabs)');
  const handleDailyReportPress = () => router.push('/DailyCollectionRPT');

  async function getAccessToken(): Promise<string | null> {
    return await AsyncStorage.getItem('access_token');
  }

  // ----- Share helper (Expo way) -----
  const shareLocalFile = async (localFileUri: string) => {
    try {
      const available = await Sharing.isAvailableAsync();
      if (!available) {
        AppAlert.alert('Not available', 'Sharing is not available on this device.');
        return;
      }
      await Sharing.shareAsync(localFileUri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Save or Share PDF',
        UTI: 'com.adobe.pdf',
      });
    } catch (err: any) {
      AppAlert.alert('Share failed', err?.message || String(err));
    }
  };

  // ----- API call for collection_crud to fetch summary/details PDF -----
  const fetchCollectionPdf = async (rptype: 'summary' | 'detail') => {
    setMenuVisible(false);
    if (rptype === 'summary') {
      setFetchingSummary(true);
      setFetchingDetails(false);
    } else {
      setFetchingDetails(true);
      setFetchingSummary(false);
    }

    cancelTokenRef.current?.cancel?.();
    cancelTokenRef.current = axios.CancelToken.source();

    try {
      const token = await getAccessToken();
      const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-Requested-with': 'XMLHttpRequest',
      };

      const payload: any = {
        action: 'download',
        fetch: 'pdf',
        rpttype: rptype === 'summary' ? 'summary' : 'detail',
      };

      const resp = await axios.post(`${API}/api/collection_crud`, payload, {
        headers,
        cancelToken: cancelTokenRef.current.token,
      });

      console.log('fetchCollectionPdf response', resp);

      const pdfUrlFromApi = resp?.data?.data?.filename;
      if (!pdfUrlFromApi) {
        AppAlert.alert('Error', 'PDF URL not found in server response');
        return;
      }

      const pdfResp = await axios.get(pdfUrlFromApi, { responseType: 'arraybuffer' });
      if (!pdfResp || !pdfResp.data) {
        AppAlert.alert('Error', 'Failed to download PDF bytes');
        return;
      }

      const buffer = Buffer.from(new Uint8Array(pdfResp.data));
      const base64PDF = buffer.toString('base64');
      const fileName =
        rptype === 'summary' ? `summary_${Date.now()}.pdf` : `detail_${Date.now()}.pdf`;

      // expo-file-system: documentDirectory already ends with a trailing slash
      // and already includes the file:// scheme
      const localPath = `${FileSystem.documentDirectory}${fileName}`;
      await FileSystem.writeAsStringAsync(localPath, base64PDF, {
        encoding: FileSystem.EncodingType.Base64,
      });

      setPdfLocalUri(localPath);
      setPdfPublicUrl(pdfUrlFromApi);
      setPdfModalVisible(true);
    } catch (err: any) {
      if (axios.isCancel(err)) {
        console.log('fetchCollectionPdf cancelled');
      } else {
        console.error('fetchCollectionPdf error', err);
        AppAlert.alert('Error', err?.message || 'Failed to fetch PDF');
      }
    } finally {
      setFetchingSummary(false);
      setFetchingDetails(false);
    }
  };

  // Pdf Viewer modal: Download button saves via SAF (Android) or opens share sheet (iOS)
  const PdfViewer = () => {
    const [saving, setSaving] = useState(false);

    const handleDownload = async () => {
      if (!pdfLocalUri) {
        AppAlert.alert('No file', 'No PDF available to save');
        return;
      }

      // iOS: always use the share sheet — user can "Save to Files" from there
      if (Platform.OS === 'ios') {
        await shareLocalFile(pdfLocalUri);
        return;
      }

      // Android: Storage Access Framework — no WRITE_EXTERNAL_STORAGE permission needed,
      // user picks the folder (e.g. Downloads) once, then we write the file there.
      try {
        setSaving(true);

        const permissions =
          await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();

        if (!permissions.granted) {
          AppAlert.alert(
            'Permission needed',
            'Please allow folder access to save the PDF, or share it instead.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Share', onPress: () => shareLocalFile(pdfLocalUri) },
            ]
          );
          return;
        }

        const base64 = await FileSystem.readAsStringAsync(pdfLocalUri, {
          encoding: FileSystem.EncodingType.Base64,
        });

        const fileName = pdfLocalUri.split('/').pop() || `document_${Date.now()}.pdf`;

        const destUri = await FileSystem.StorageAccessFramework.createFileAsync(
          permissions.directoryUri,
          fileName,
          'application/pdf'
        );

        await FileSystem.writeAsStringAsync(destUri, base64, {
          encoding: FileSystem.EncodingType.Base64,
        });

        if (ToastAndroid) {
          ToastAndroid.show(`Saved: ${fileName}`, ToastAndroid.LONG);
        } else {
          AppAlert.alert('Saved', `Saved: ${fileName}`);
        }
      } catch (copyErr: any) {
        console.error('SAF save failed', copyErr);
        AppAlert.alert(
          'Save failed',
          'Could not save the file. You can share it instead.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Share', onPress: () => shareLocalFile(pdfLocalUri) },
          ]
        );
      } finally {
        setSaving(false);
      }
    };

    return (
      <Modal
        visible={pdfModalVisible}
        animationType="slide"
        onRequestClose={() => setPdfModalVisible(false)}
        presentationStyle="fullScreen"
      >
        <View style={{ flex: 1, backgroundColor: '#fff' }}>
          <View style={styles.pdfHeader}>
            <TouchableOpacity
              onPress={handleDownload}
              style={styles.pdfHeaderButton}
              disabled={saving || !pdfLocalUri}
            >
              <Icon name="download" size={22} color={saving ? '#999' : '#000'} />
              <Text style={styles.pdfHeaderButtonText}>
                {saving ? 'Saving...' : 'Download'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setPdfModalVisible(false)}
              style={styles.pdfHeaderButton}
            >
              <Icon name="close" size={22} color="#000" />
              <Text style={styles.pdfHeaderButtonText}>Close</Text>
            </TouchableOpacity>
          </View>

          <View style={{ flex: 1 }}>
            {pdfLocalUri ? (
              <WebView
                // Backend se mila public HTTPS URL use kar rahe hain — WKWebView (iOS)
                // aur Android WebView dono https PDF ko seedha khol lete hain, isliye
                // local file:// wali dikkat (permission restriction) hi nahi aati.
                // Android pe Google Docs viewer se zoom/scroll bhi better milta hai.
                source={{
                  uri:
                    Platform.OS === 'ios'
                      ? pdfPublicUrl || pdfLocalUri
                      : `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(
                        pdfPublicUrl || pdfLocalUri
                      )}`,
                }}
                style={{ flex: 1 }}
                containerStyle={{ flex: 1 }}
                originWhitelist={['*']}
                javaScriptEnabled
                domStorageEnabled
                startInLoadingState
                scalesPageToFit
                renderLoading={() => (
                  <View style={styles.pdfLoading}>
                    <ActivityIndicator size="large" color={theme.BRAND_GRADIENT_END} />
                  </View>
                )}
                onError={(e) => {
                  console.error('WebView PDF error', e.nativeEvent);
                  AppAlert.alert('Error', 'Failed to render PDF');
                }}
                onHttpError={(e) => {
                  console.error('WebView PDF HTTP error', e.nativeEvent);
                }}
              />
            ) : (
              <View style={styles.pdfLoading}>
                <Text>No PDF</Text>
              </View>
            )}
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <>
      <LinearGradient
        colors={[theme.BRAND_GRADIENT_START, theme.BRAND_GRADIENT_END]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.footerContainer}
      >
        <SafeAreaView style={styles.safe}>
          {isChequeList && (
            <View style={styles.seekBarContainerRow}>
              <TouchableOpacity
                style={styles.pdfIconContainer}
                onPress={() => setMenuVisible(true)}
              >
                <Icon name="picture-as-pdf" size={20} color="#fff" />
              </TouchableOpacity>

              <View style={{ flex: 1 }}>
                <Text style={styles.totalAmountText}>
                  {text}: ₹{totalAmount.toLocaleString('en-IN')}
                </Text>
              </View>
            </View>
          )}

          {!isChequeList && (
            <View style={styles.footerContent}>
              <TouchableOpacity
                onPress={handleHomePress}
                disabled={!isConnected}
                style={[styles.footerButton, !isConnected && styles.disabledButton]}
              >
                <Icon name="home" color="#fff" size={18} />
                <Text style={styles.footerButtonText}>Home</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleLogout}
                disabled={!isConnected}
                style={[styles.footerButton, !isConnected && styles.disabledButton]}
              >
                <Icon name="logout" color="#fff" size={18} />
                <Text style={styles.footerButtonText}>Logout</Text>
              </TouchableOpacity>
            </View>
          )}
        </SafeAreaView>
      </LinearGradient>

      {/* small menu modal for Summary / Details */}
      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <TouchableOpacity
          style={styles.menuOverlay}
          activeOpacity={1}
          onPress={() => setMenuVisible(false)}
        >
          <View style={styles.menuContainer}>
            <Text style={styles.menuTitle}>Export</Text>

            <TouchableOpacity
              style={[styles.menuButton, fetchingSummary && styles.menuButtonDisabled]}
              onPress={() => fetchCollectionPdf('summary')}
              disabled={fetchingSummary || fetchingDetails}
            >
              {fetchingSummary ? (
                <ActivityIndicator size="small" color="#000" style={{ marginRight: 8 }} />
              ) : (
                <Icon name="summarize" size={18} color="#000" style={{ marginRight: 8 }} />
              )}
              <Text style={styles.menuButtonText}>Summary</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.menuButton, fetchingDetails && styles.menuButtonDisabled]}
              onPress={() => fetchCollectionPdf('detail')}
              disabled={fetchingDetails || fetchingSummary}
            >
              {fetchingDetails ? (
                <ActivityIndicator size="small" color="#000" style={{ marginRight: 8 }} />
              ) : (
                <Icon name="list" size={18} color="#000" style={{ marginRight: 8 }} />
              )}
              <Text style={styles.menuButtonText}>Details</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuCancel} onPress={() => setMenuVisible(false)}>
              <Text style={{ color: '#444' }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Reports modal (bottom sheet) */}
      <Modal
        visible={reportsModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setReportsModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.menuOverlay}
          activeOpacity={1}
          onPress={() => setReportsModalVisible(false)}
        >
          <View style={styles.reportsMenuContainer}>
            <Text style={styles.reportsMenuTitle}>Select Report</Text>

            <TouchableOpacity
              style={styles.reportsMenuItem}
              onPress={() => {
                setReportsModalVisible(false);
                handleDailyReportPress();
              }}
            >
              <Icon name="description" size={18} color="#000" style={{ marginRight: 8 }} />
              <Text style={styles.reportsMenuItemText}>Daily Collection</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuCancel}
              onPress={() => setReportsModalVisible(false)}
            >
              <Text style={{ color: '#444' }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* PDF preview modal component */}
      {pdfModalVisible && <PdfViewer />}
    </>
  );
};

const styles = StyleSheet.create({
  footerContainer: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
    borderRadius: 12,
    elevation: 6,
    backgroundColor: theme.SURFACE,
    zIndex: 1000,
  },
  safe: {
    borderRadius: 12,
  },
  seekBarContainerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  pdfIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  totalAmountText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
    textAlign: 'right',
  },
  footerContent: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 6,
  },
  footerButton: {
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  footerButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  disabledButton: {
    opacity: 0.55,
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  menuContainer: {
    backgroundColor: '#fff',
    padding: 16,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  menuTitle: {
    fontWeight: '700',
    marginBottom: 8,
  },
  menuButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: '#f6f6f6',
    marginBottom: 8,
  },
  menuButtonDisabled: {
    opacity: 0.6,
  },
  menuButtonText: {
    fontSize: 15,
  },
  menuCancel: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  pdfHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    marginTop: 50,
  },
  pdfHeaderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pdfHeaderButtonText: {
    marginLeft: 8,
    fontWeight: '600',
  },
  pdfLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportsMenuContainer: {
    backgroundColor: '#fff',
    padding: 16,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    maxHeight: '60%',
  },
  reportsMenuTitle: {
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  reportsMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: '#f6f6f6',
    marginBottom: 8,
  },
  reportsMenuItemText: {
    fontSize: 15,
  },
});

export default Footer;