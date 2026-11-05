// Local NEW ERP re-skin of the shared `src/components/FooterNew` (cheque-list mode).
// The shared footer is used by legacy screens, so it is copied here instead of
// edited. Logout, PDF export (collection_crud download summary/detail), save /
// share and preview logic are identical to the shared version; only the
// presentation changed (inline totals card + Export sheet, no gradient).
import AppAlert from '@/common/utils/appAlert';
import { Btn, Sheet, useSotLayout } from '@/src/components/erpUi';
import { T } from '@/src/theme';

import AsyncStorage from '@/common/utils/compatibleStorage';
import Icon from '@expo/vector-icons/MaterialIcons';
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
  Modal,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  ToastAndroid,
  TouchableOpacity,
  View
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
  style?: any; // NEW UI: outer layout style for the totals card
}

const Footer: React.FC<FooterProps> = ({
  onLogout,
  isConnected,
  totalAmount = 0,
  isChequeList = false,
  text = '',
  style,
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
  const handleHomePress = () => router.push('/new/(tabs)' as any);
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
        <SafeAreaView style={styles.pdfWrap}>
          <View style={styles.pdfHeader}>
            <View style={styles.pdfHeaderInner}>
              <TouchableOpacity
                onPress={() => setPdfModalVisible(false)}
                style={styles.pdfBack}
                accessibilityRole="button"
                accessibilityLabel="Close"
              >
                <Icon name="close" size={20} color={T.nav} />
              </TouchableOpacity>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.pdfEyebrow}>COLLECTION REPORT</Text>
                <Text style={styles.pdfTitle} numberOfLines={1}>
                  {(pdfLocalUri || '').split('/').pop() || 'PDF preview'}
                </Text>
              </View>
              <Btn
                label={saving ? 'Saving...' : 'Download'}
                icon="download"
                compact
                onPress={handleDownload}
                disabled={saving || !pdfLocalUri}
              />
            </View>
          </View>

          <View style={{ flex: 1 }}>
            {pdfLocalUri ? (
              <WebView
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
                    <ActivityIndicator size="large" color={T.copper} />
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
                <Text style={styles.mutedText}>No PDF</Text>
              </View>
            )}
          </View>
        </SafeAreaView>
      </Modal>
    );
  };

  const { isPhone } = useSotLayout();

  // One export option row inside the Export sheet (same handlers / disabled rules as before).
  const renderExportOption = (
    label: string,
    sub: string,
    icon: string,
    busy: boolean,
    onPress: () => void,
    disabled: boolean
  ) => (
    <TouchableOpacity
      style={[styles.option, busy && { opacity: 0.6 }]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View style={styles.optionIcon}>
        {busy ? (
          <ActivityIndicator size="small" color={T.copper} />
        ) : (
          <Icon name={icon as any} size={18} color={T.copper} />
        )}
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.optionTitle}>{label}</Text>
        <Text style={styles.optionSub} numberOfLines={1}>{sub}</Text>
      </View>
      <Icon name="chevron-right" size={20} color={T.muted} />
    </TouchableOpacity>
  );

  return (
    <>
      {isChequeList ? (
        <View style={[styles.totalCard, style]}>
          <View style={styles.totalIcon}>
            <Icon name="payments" size={18} color={T.copper} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.totalLabel} numberOfLines={1}>{String(text || '').toUpperCase()}</Text>
            <Text style={styles.totalValue} numberOfLines={1} adjustsFontSizeToFit>
              ₹{totalAmount.toLocaleString('en-IN')}
            </Text>
          </View>
          <Btn
            label={isPhone ? 'PDF' : 'Export PDF'}
            icon="picture-as-pdf"
            kind="soft"
            compact
            onPress={() => setMenuVisible(true)}
          />
        </View>
      ) : (
        <View style={[styles.navBar, style]}>
          <TouchableOpacity
            onPress={handleHomePress}
            disabled={!isConnected}
            style={[styles.navBtn, !isConnected && styles.disabledButton]}
            accessibilityRole="button"
            accessibilityLabel="Home"
          >
            <Icon name="home" color="#fff" size={18} />
            <Text style={styles.navBtnText}>Home</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleLogout}
            disabled={!isConnected}
            style={[styles.navBtn, !isConnected && styles.disabledButton]}
            accessibilityRole="button"
            accessibilityLabel="Logout"
          >
            <Icon name="logout" color="#fff" size={18} />
            <Text style={styles.navBtnText}>Logout</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Export sheet: Summary / Details (was the small bottom menu) */}
      <Sheet
        open={menuVisible}
        onClose={() => setMenuVisible(false)}
        eyebrow="COLLECTION"
        title="Export"
        wideMax={440}
        footer={<Btn label="Cancel" kind="ghost" onPress={() => setMenuVisible(false)} style={{ flex: 1 }} />}
      >
        {renderExportOption(
          'Summary',
          'Collection summary as PDF',
          'summarize',
          fetchingSummary,
          () => fetchCollectionPdf('summary'),
          fetchingSummary || fetchingDetails
        )}
        {renderExportOption(
          'Details',
          'Entry-wise collection details as PDF',
          'list',
          fetchingDetails,
          () => fetchCollectionPdf('detail'),
          fetchingDetails || fetchingSummary
        )}
      </Sheet>

      {/* Reports sheet */}
      <Sheet
        open={reportsModalVisible}
        onClose={() => setReportsModalVisible(false)}
        eyebrow="REPORTS"
        title="Select Report"
        wideMax={440}
        footer={<Btn label="Cancel" kind="ghost" onPress={() => setReportsModalVisible(false)} style={{ flex: 1 }} />}
      >
        {renderExportOption(
          'Daily Collection',
          'Open the daily collection report',
          'description',
          false,
          () => {
            setReportsModalVisible(false);
            handleDailyReportPress();
          },
          false
        )}
      </Sheet>

      {/* PDF preview modal component */}
      {pdfModalVisible && <PdfViewer />}
    </>
  );
};

const styles = StyleSheet.create({
  // cheque-list totals card
  totalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: T.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: T.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 60,
  },
  totalIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${T.copper}14`,
  },
  totalLabel: { fontSize: 10, fontWeight: '800', color: T.copper, letterSpacing: 1.2 },
  totalValue: { fontSize: 18, fontWeight: '900', color: T.nav, marginTop: 2 },

  // home / logout bar (non cheque-list mode)
  navBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: T.nav,
    borderRadius: 14,
    paddingVertical: 6,
  },
  navBtn: { alignItems: 'center', paddingVertical: 6, paddingHorizontal: 12, minHeight: 44, justifyContent: 'center' },
  navBtnText: { color: '#fff', fontSize: 12, fontWeight: '700', marginTop: 4 },
  disabledButton: { opacity: 0.55 },

  // export options
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 56,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: T.border,
    backgroundColor: T.surface,
  },
  optionIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${T.copper}14`,
  },
  optionTitle: { fontSize: 14, fontWeight: '800', color: T.ink },
  optionSub: { fontSize: 11.5, fontWeight: '600', color: T.muted, marginTop: 2 },

  // pdf preview
  pdfWrap: { flex: 1, backgroundColor: T.bg },
  pdfHeader: { backgroundColor: T.surface, borderBottomWidth: 1, borderBottomColor: T.border },
  pdfHeaderInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    width: '100%',
    maxWidth: 1280,
    alignSelf: 'center',
  },
  pdfBack: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: T.alt,
  },
  pdfEyebrow: { fontSize: 10, fontWeight: '800', color: T.copper, letterSpacing: 1.2 },
  pdfTitle: { fontSize: 15, fontWeight: '900', color: T.nav, marginTop: 1 },
  pdfLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mutedText: { color: T.muted, fontWeight: '700' },
});

export default Footer;
