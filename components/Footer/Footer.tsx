import React, { useRef, useState } from 'react';
import {
  View,
  TouchableOpacity,
  Alert,
  StyleSheet,
  Text,
  SafeAreaView,
  Modal,
  ActivityIndicator,
  PermissionsAndroid,
  Platform,
  ToastAndroid,
  Linking,
  Share
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import theme from '../../android/app/src/theme';
import axios from 'axios';
import RNFS from 'react-native-fs';
import { Buffer } from 'buffer';
import Pdf from 'react-native-pdf';
import { API } from '../../common/API/dynamicAPI';

interface FooterProps {
  onLogout: () => void;
  isConnected: boolean | null;
  totalAmount?: number;
  isChequeList?: boolean;
  text: string;
}

const APP_PACKAGE_NAME = 'com.flownest'; // replace with your real package name if you need to open Manage All Files

const Footer: React.FC<FooterProps> = ({ onLogout, isConnected, totalAmount = 0, isChequeList = false, text = '' }) => {
  const navigation = useNavigation();

  // PDF/collection states
  const [menuVisible, setMenuVisible] = useState(false);
  const [fetchingSummary, setFetchingSummary] = useState(false);
  const [fetchingDetails, setFetchingDetails] = useState(false);
  const cancelTokenRef = useRef<any>(null);

  const [pdfModalVisible, setPdfModalVisible] = useState(false);
  const [pdfLocalUri, setPdfLocalUri] = useState<string>('');
  const [pdfPublicUrl, setPdfPublicUrl] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [reportsModalVisible, setReportsModalVisible] = useState(false);


  const handleLogout = () => {
    Alert.alert(
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
            onLogout();
          },
        },
      ],
      { cancelable: true }
    );
  };

  const handleHomePress = () => navigation.navigate('Home' as never);
  const handleDailyReportPress = () => navigation.navigate('DailyCollectionRPT' as never);

  // helper: iso date (YYYY-MM-DD) to DD-MM-YYYY or DD/MM/YYYY depending on server needs
  const isoToDDMMYYYY = (iso?: string) => {
    if (!iso) return '';
    const d = new Date(iso);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  };

  async function getAccessToken(): Promise<string | null> {
    return await AsyncStorage.getItem('access_token');
  }

  // ----- Permissions / settings helpers -----
  const openManageAllFilesPermission = async () => {
    if (Platform.OS !== 'android') {
      Alert.alert('Only Android', 'This action is only for Android devices.');
      return;
    }
    try {
      // Try Intent Launcher if present
      const IntentLauncher = require('react-native-intent-launcher').default;
      await IntentLauncher.startActivity({
        action: 'android.settings.MANAGE_APP_ALL_FILES_ACCESS_PERMISSION',
        data: `package:${APP_PACKAGE_NAME}`,
      });
      return;
    } catch (e) {
      console.warn('IntentLauncher not available or failed', e);
    }
    try {
      await Linking.openSettings();
    } catch (err) {
      console.warn('Linking.openSettings failed', err);
      Alert.alert('Unable to open settings', 'Please open app settings manually and grant storage permission.');
    }
  };

  async function askAndRequestStoragePermission(): Promise<boolean> {
    if (Platform.OS !== 'android') return true;
    try {
      const already = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE);
      if (already) return true;

      // show friendly dialog then request
      return new Promise(async (resolve) => {
        Alert.alert(
          'Storage permission required',
          'App needs permission to save the PDF to your Downloads. Do you want to allow?',
          [
            { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
            {
              text: 'Allow',
              onPress: async () => {
                try {
                  const status = await PermissionsAndroid.request(
                    PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
                    {
                      title: 'Storage permission required',
                      message: 'App needs access to your storage to save the PDF to Downloads.',
                      buttonPositive: 'OK',
                    }
                  );
                  if (status === PermissionsAndroid.RESULTS.GRANTED) {
                    resolve(true);
                    return;
                  }
                  if (status === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
                    Alert.alert(
                      'Permission required',
                      'Storage permission was permanently denied. Open settings to enable storage permission or grant manually.',
                      [
                        { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
                        { text: 'Open Settings', onPress: () => { Linking.openSettings().catch(() => { }); resolve(false); } }
                      ]
                    );
                    return;
                  }
                  resolve(false);
                } catch (err) {
                  console.warn('permission request error', err);
                  resolve(false);
                }
              }
            }
          ],
          { cancelable: true }
        );
      });
    } catch (err) {
      console.warn('askAndRequestStoragePermission error', err);
      return false;
    }
  }

  // share local file
  const shareLocalFile = async (localFileUri: string) => {
    try {
      const url = localFileUri.startsWith('file://') ? localFileUri : `file://${localFileUri}`;
      await Share.share({ url } as any);
    } catch (err) {
      Alert.alert('Share failed', err?.message || String(err));
    }
  };

  // ----- API call for collection_crud to fetch summary/details PDF -----
  const fetchCollectionPdf = async (rptype: 'summary' | 'detail') => {
    // disable menu and set loading flags
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

      // Build payload using sample you provided. Adjust PrpCode/EDate as needed.
      // Here I'm sending prpcode empty and EDate as today (you can replace with real values)
      const payload: any = {
        // uid: 0,
        // prpcode: "", // <--- you should set this value if available
        // EDate: isoToDDMMYYYY(new Date().toISOString().split('T')[0]),
        // txntype: 'mob_collection',
        action: 'download',   // as you said "action and its value will be download"
        fetch: 'pdf',         // fetch = 'pdf' to ask backend for pdf link/bytes
        rpttype: rptype === 'summary' ? 'summary' : 'detail'
      };

      // show loader in footer? we're using modal flow so keep it internal.
      const resp = await axios.post(
        // 'https://apig.tms-webapp.com/api/collection_crud',
        `${API}/api/collection_crud`,
        payload,
        { headers, cancelToken: cancelTokenRef.current.token }
      );

      console.log('fetchCollectionPdf response', resp);

      // expected shape unknown; try to extract pdf url from several places:
      const pdfUrlFromApi = resp?.data?.data.filename
        // const pdfUrlFromApi = 'https://apig.tms-webapp.com/live_print_data/AccountReuest_1.pdf';
        ;
      if (!pdfUrlFromApi) {
        Alert.alert('Error', 'PDF URL not found in server response');
        return;
      }
      const pdfResp = await axios.get(pdfUrlFromApi, { responseType: 'arraybuffer' });
      if (!pdfResp || !pdfResp.data) {
        Alert.alert('Error', 'Failed to download PDF bytes');
        return;
      }
      const buffer = Buffer.from(new Uint8Array(pdfResp.data));
      const base64PDF = buffer.toString('base64');
      const fileName = rptype === 'summary' ? `summary_${Date.now()}.pdf` : `detail_${Date.now()}.pdf`;
      const localPath = `${RNFS.DocumentDirectoryPath}/${fileName}`;
      await RNFS.writeFile(localPath, base64PDF, 'base64');
      setPdfLocalUri(`file://${localPath}`);
      setPdfPublicUrl(pdfUrlFromApi);

      // show preview modal
      setPdfModalVisible(true);

      // setPdfLocalUri(`file://${localPath}`);
      // setPdfPublicUrl(pdfUrl); // not public url but keep for parity


      // // show preview modal
      // setPdfModalVisible(true);
    } catch (err: any) {
      if (axios.isCancel(err)) {
        console.log('fetchCollectionPdf cancelled');
      } else {
        console.error('fetchCollectionPdf error', err);
        Alert.alert('Error', err?.message || 'Failed to fetch PDF');
      }
    } finally {
      setFetchingSummary(false);
      setFetchingDetails(false);
      setPdfLoading(false);
    }
  };

  // Pdf Viewer modal: Download button copies to Downloads (Android) or opens share (iOS)
  const PdfViewer = () => {
    const [saving, setSaving] = useState(false);

    const handleDownload = async () => {
      if (!pdfLocalUri) {
        Alert.alert('No file', 'No PDF available to save');
        return;
      }
      // iOS: share
      if (Platform.OS === 'ios') {
        await shareLocalFile(pdfLocalUri);
        return;
      }

      // const ok = await askAndRequestStoragePermission();
      // if (!ok) {
      //   Alert.alert(
      //     'Cannot save',
      //     'Storage permission not granted. You can share the file to save it elsewhere.',
      //     [
      //       { text: 'Cancel', style: 'cancel' },
      //       { text: 'Share', onPress: () => shareLocalFile(pdfLocalUri) }
      //     ]
      //   );
      //   return;
      // }

      const localPath = pdfLocalUri.startsWith('file://') ? pdfLocalUri.replace('file://', '') : pdfLocalUri;
      const fileName = localPath.split('/').pop() || `document_${Date.now()}.pdf`;
      const destPath = `${RNFS.DownloadDirectoryPath}/${fileName}`;

      try {
        setSaving(true);
        await RNFS.copyFile(localPath, destPath);
        if (ToastAndroid) {
          ToastAndroid.show(`Saved to Downloads: ${fileName}`, ToastAndroid.LONG);
        } else {
          Alert.alert('Saved', `Saved to Downloads:\n${destPath}`);
        }
      } catch (copyErr: any) {
        console.error('copyFile failed', copyErr);
        Alert.alert(
          'Save failed',
          'Could not save to Downloads. Allow "All files access" or grant storage permission in Settings, or share the file instead.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => openManageAllFilesPermission() },
            { text: 'Share', onPress: () => shareLocalFile(pdfLocalUri) }
          ]
        );
      } finally {
        setSaving(false);
      }
    };

    return (
      <Modal visible={pdfModalVisible} animationType="slide" onRequestClose={() => setPdfModalVisible(false)} presentationStyle="fullScreen">
        <View style={{ flex: 1, backgroundColor: '#fff' }}>
          <View style={styles.pdfHeader}>
            <TouchableOpacity onPress={handleDownload} style={styles.pdfHeaderButton} disabled={saving || !pdfLocalUri}>
              <MaterialIcons name="download" size={22} color={saving ? "#999" : "#000"} />
              <Text style={styles.pdfHeaderButtonText}>{saving ? 'Saving...' : 'Download'}</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setPdfModalVisible(false)} style={styles.pdfHeaderButton}>
              <MaterialIcons name="close" size={22} color="#000" />
              <Text style={styles.pdfHeaderButtonText}>Close</Text>
            </TouchableOpacity>
          </View>

          <View style={{ flex: 1 }}>
            {pdfLocalUri ? (
              <Pdf
                source={{ uri: pdfLocalUri }}
                style={{ flex: 1 }}
                onError={(e) => {
                  console.error('react-native-pdf error', e);
                  Alert.alert('Error', 'Failed to render PDF');
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

  // Render footer with PDF icon on left when isChequeList true
  return (
    <>
      <LinearGradient
        colors={[theme.BRAND_GRADIENT_START, theme.BRAND_GRADIENT_END]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.footerContainer}
      >
        <SafeAreaView style={styles.safe}>
          {/* {totalAmount !== undefined && totalAmount > 0 && ( */}
          {isChequeList && (
            <View style={styles.seekBarContainerRow}>
              {/* NEW REPORTS BUTTON */}
              {/* <TouchableOpacity
                style={styles.reportsButton}
                onPress={() => setReportsModalVisible(true)}
              >
                <MaterialIcons name="list" size={20} color="#fff" />
                <Text style={styles.reportsButtonText}>Reports</Text>
              </TouchableOpacity> */}

              {/* EXISTING PDF ICON (NO CHANGE) */}
              <TouchableOpacity
                style={styles.pdfIconContainer}
                onPress={() => setMenuVisible(true)}
              >
                <MaterialIcons name="picture-as-pdf" size={20} color="#fff" />
              </TouchableOpacity>

              {/* EXISTING TOTAL AMOUNT (NO CHANGE) */}
              <View style={{ flex: 1 }}>
                <Text style={styles.totalAmountText}>
                  {text}: ₹{totalAmount.toLocaleString('en-IN')}
                </Text>
              </View>
            </View>
          )}

          {/* )} */}

          <View style={styles.footerContent}>
            <TouchableOpacity
              onPress={handleHomePress}
              disabled={!isConnected}
              style={[styles.footerButton, !isConnected && styles.disabledButton]}
            >
              <MaterialIcons name="home" color="#fff" size={18} />
              <Text style={styles.footerButtonText}>Home</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleLogout}
              disabled={!isConnected}
              style={[styles.footerButton, !isConnected && styles.disabledButton]}
            >
              <MaterialIcons name="logout" color="#fff" size={18} />
              <Text style={styles.footerButtonText}>Logout</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </LinearGradient>

      {/* small menu modal for Summary / Details */}
      <Modal visible={menuVisible} transparent animationType="fade" onRequestClose={() => setMenuVisible(false)}>
        <TouchableOpacity style={styles.menuOverlay} activeOpacity={1} onPress={() => setMenuVisible(false)}>
          <View style={styles.menuContainer}>
            <Text style={styles.menuTitle}>Export</Text>

            <TouchableOpacity
              style={[styles.menuButton, fetchingSummary && styles.menuButtonDisabled]}
              onPress={() => fetchCollectionPdf('summary')}
              disabled={fetchingSummary || fetchingDetails}
            >
              {fetchingSummary ? <ActivityIndicator size="small" color="#000" style={{ marginRight: 8 }} /> : <MaterialIcons name="summarize" size={18} color="#000" style={{ marginRight: 8 }} />}
              <Text style={styles.menuButtonText}>Summary</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.menuButton, fetchingDetails && styles.menuButtonDisabled]}
              onPress={() => fetchCollectionPdf('detail')}
              disabled={fetchingDetails || fetchingSummary}
            >
              {fetchingDetails ? <ActivityIndicator size="small" color="#000" style={{ marginRight: 8 }} /> : <MaterialIcons name="list" size={18} color="#000" style={{ marginRight: 8 }} />}
              <Text style={styles.menuButtonText}>Details</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuCancel} onPress={() => setMenuVisible(false)}>
              <Text style={{ color: '#444' }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* NEW REPORTS MODAL (Bottom Sheet) */}
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

            {/* DAILY COLLECTION REPORT (Example) */}
            <TouchableOpacity
              style={styles.reportsMenuItem}
              onPress={() => {
                setReportsModalVisible(false);
                // TODO: Navigate to DailyCollectionReportScreen or fetch PDF
                // Example: navigation.navigate('DailyCollectionReport');
                // Alert.alert("Report Selected", "Daily Collection Report");
                handleDailyReportPress();
              }}
            >
              <MaterialIcons name="description" size={18} color="#000" style={{ marginRight: 8 }} />
              <Text style={styles.reportsMenuItemText}>Daily Collection</Text>
            </TouchableOpacity>

            {/* CANCEL BUTTON */}
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
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  pdfIconContainer: {
    // width: 40,
    // height: 40,
    // borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    backgroundColor: 'rgba(255,255,255,0.08)'
  },
  seekBar: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  seekBarFill: {
    height: '100%',
    width: '30%',
    backgroundColor: '#fff',
    borderRadius: 2,
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

  /* Menu modal styles */
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

  /* PDF modal header */
  pdfHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  pdfHeaderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  pdfHeaderButtonText: {
    marginLeft: 8,
    fontWeight: '600'
  },
  pdfLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // 
  reportsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    marginRight: 8,
  },
  reportsButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
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
