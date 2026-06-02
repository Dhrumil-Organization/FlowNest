// NewAccountRequest.tsx (updated)
// NOTE: Replace APP_PACKAGE_NAME with your real package name before building
import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
    View,
    Text,
    FlatList,
    TextInput,
    TouchableOpacity,
    Alert,
    TextInput as RNTextInput,
    Modal,
    ActivityIndicator,
    PermissionsAndroid,
    Platform,
    ToastAndroid,
    Linking,
    Share
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import axios from 'axios';
import RNFS from 'react-native-fs';
import { Buffer } from 'buffer';
import Pdf from 'react-native-pdf';
import FullScreenLoader from '../Loader/Loader';
import { crlimtreq_styles } from '../../common/Styles/Style';
import HeaderBar from '../HeaderBar/HeaderBar';
import theme from '../../android/app/src/theme';
import { API } from '../../common/API/dynamicAPI';

const APP_PACKAGE_NAME = 'com.anonymous.FlowNest'; // <-- REPLACE with your real package name (e.g. com.anonymous.FlowNest)

interface CardData {
    [key: string]: any;
    uid?: string;
    isProcessed?: boolean;
    actionType?: 'accept' | 'reject' | 'list';
}

interface Props {
    token: string;
    navigation: any;
    isConnected: boolean | null;
    username: string;
}

const NewAccountRequest: React.FC<Props> = ({ token, navigation, isConnected, username }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [responsemessage, setresponsemessage] = useState('');
    const filterKey = 'all';
    const [isLoading, setIsLoading] = useState(false);
    const [getLocationLoading, setLocationLoading] = useState(false);
    const [partyLoading, setIsPartyLoading] = useState(false);
    const [getSuccess, setSuccess] = useState(false);
    const [data, setData] = useState<CardData[]>([]);
    const [partyList, setPartyList] = useState<CardData[]>([]);
    const [editableValues, setEditableValues] = useState<{ [uid: string]: { CrLimit?: string; CrDay?: string } }>({});
    const [showOverlay, setShowOverlay] = useState(false);
    const [selectedAction, setSelectedAction] = useState<'accept' | 'reject' | 'list' | null>(null);
    const [selectedItem, setSelectedItem] = useState<CardData | null>(null);
    const [showTopButton, setShowTopButton] = useState(false);
    const flatListRef = useRef<FlatList>(null);
    const [activeTab1, setActiveTab1] = useState<'account requests'>('account requests');
    const [showPdfModal, setShowPdfModal] = useState(false);
    const [pdfUrl, setPdfUrl] = useState('');
    const [pdfLoading, setPdfLoading] = useState(false);
    const [pdfPublicUrl, setPdfPublicUrl] = useState<string | null>(null);

    let cancelToken: any;

    const getRequestConfig = (props: any) => ({
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
        },
        params: props.params,
        cancelToken: cancelToken?.token,
    });

    const fetchData = async () => {
        if (cancelToken?.cancel) cancelToken.cancel();
        cancelToken = axios.CancelToken.source();
        setIsLoading(true);
        try {
            const payload = { txntype: 'newaccountrequest', referrer: 'dashboard' };
            const headers = {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
                'X-Requested-with': 'XMLHttpRequest',
            };
            // const response = await axios.post(`https://apig.tms-webapp.com/api/accountreqauthbrowse`, payload, { headers });
            const response = await axios.post(`${API}/api/accountreqauthbrowse`, payload, { headers });
            if (response.data.success && response.data.response?.data?.length > 0) {
                const dataWithUid = response.data.response.data.map((item: any) => ({
                    ...item,
                    uid: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
                }));
                setData(dataWithUid);
            } else {
                setData([]);
            }
        } catch (error) {
            if (!axios.isCancel(error)) {
                Alert.alert('Error', 'Server error');
            }
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (activeTab1 === 'account requests') {
            fetchData();
        }
    }, [activeTab1]);

    const base64_encode = (str: string) => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
        let result = '';
        let i = 0;
        const len = str.length;
        let a, b, c;
        while (i < len) {
            a = str.charCodeAt(i++);
            b = str.charCodeAt(i++);
            c = str.charCodeAt(i++);
            result += chars.charAt((a >> 2) & 0x3F);
            result += chars.charAt(((a & 0x03) << 4) | ((b >> 4) & 0x0F));
            result += chars.charAt(((b & 0x0F) << 2) | ((c >> 6) & 0x03));
            result += chars.charAt(c & 0x3F);
        }
        return result.replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
    };

    const handleListIconClick = async (prpcode: string, prptype: string, yearno: string, parcode: string) => {
        if (cancelToken?.cancel) cancelToken.cancel();
        cancelToken = axios.CancelToken.source();
        setIsPartyLoading(true);
        try {
            const historyPayload = {
                prpcodes: [prpcode],
                prptype: prptype,
                yearno: yearno,
                strcode: '',
                parcodes: [parcode],
                txntype: 'newaccountrequest',
                fetch: 'dr'
            };
            const response = await axios.get(
                // `https://apig.tms-webapp.com/api/get_criterion`,
                `${API}/api/get_criterion`,
                getRequestConfig({ params: { ...historyPayload } })
            );
            if (response.data.success && response.data.response?.data?.length > 0) {
                setPartyList(response.data.response.data);
            } else {
                setPartyList([]);
            }
        } catch (error) {
            if (!axios.isCancel(error)) {
                Alert.alert('Error', 'Server error');
            }
        } finally {
            setIsPartyLoading(false);
        }
    };

    const filteredData = useMemo(() => {
        if (!searchQuery) return data;
        return data.filter((item) =>
            filterKey === 'all'
                ? Object.values(item).some((val) => String(val).toLowerCase().includes(searchQuery.toLowerCase()))
                : String(item[filterKey]).toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [data, searchQuery, filterKey]);

    const formatToIndianCurrency = (value: string | number) => {
        const numericValue = typeof value === 'string'
            ? value.replace(/[^0-9.]/g, '')
            : String(value).replace(/[^0-9.]/g, '');
        const num = parseFloat(numericValue) || 0;
        return num.toLocaleString('en-IN');
    };
    const handleEdit = (uid: string, field: 'CrLimit' | 'CrDay', formattedValue: string) => {
        const rawValue = formattedValue.replace(/[₹,]/g, '');
        const rawValuecrday = formattedValue.replace(/[₹,]/g, '');
        const displayValue = formatToIndianCurrency(rawValue || '0');
        const displayValuecrday = (formattedValue);
        setEditableValues(prev => ({
            ...prev,
            [uid]: {
                ...prev[uid],
                [field]: field === 'CrLimit' ? displayValue : displayValuecrday,
                [`${field}Raw`]: field === 'CrLimit' ? rawValue : rawValuecrday,
            },
        }));
    };

    const handleIconPress = (item: CardData, action: 'accept' | 'reject' | 'list') => {
        if (action === 'list') {
            setSelectedItem(item);
            setSelectedAction(action);
            handleListIconClick(item.prpcode, item.prptype, item.yearno, item.parcode);
            return;
        } else {
            setSelectedItem(item);
            setSelectedAction(action);
            setShowOverlay(true);
            return;
        }
    };

    const getToken = () => token;

    const handleConfirmAction = async () => {
        if (!selectedItem) return;
        let paylaodData: any = { ...selectedItem };
        delete paylaodData.uid;
        const updatedItemAccept = {
            ...paylaodData,
            CrLimit: formatToIndianCurrency(paylaodData.CrLimit || '0'),
            CrDay: (paylaodData.CrDay || '0'),
            IsAuth: selectedAction === 'accept' ? 1 : 2,
            referrer: 'dashboard',
            txntype: 'newaccountrequest',
            action: 'edit'
        };
        const updatedItemReject = {
            ...paylaodData,
            CrLimit: formatToIndianCurrency(paylaodData.CrLimit || '0'),
            CrDay: (paylaodData.CrDay || '0'),
            IsAuth: 2,
            referrer: 'dashboard',
            txntype: 'newaccountrequest',
            action: 'edit'
        };
        const payload = selectedAction === 'accept' ? { ...updatedItemAccept } : { ...updatedItemReject };

        setSuccess(true);
        setresponsemessage('Loading...');

        try {
            const response = await axios.get(
                // `https://apig.tms-webapp.com/api/accountreqauthsingle`,
                `${API}/api/accountreqauthsingle`,
                getRequestConfig({ params: { ...payload } })
            );
            if (response.data.success) {
                setresponsemessage(response.data.message || 'Success');
                setTimeout(() => {
                    setSuccess(false);
                    setShowOverlay(false);
                }, 2000);
                setData(prevData => {
                    const newData = prevData.filter(item => item.uid !== selectedItem.uid);
                    newData.push({ ...selectedItem, isProcessed: true, actionType: selectedAction });
                    return newData;
                });
                setTimeout(() => {
                    flatListRef.current?.scrollToEnd({ animated: true });
                }, 300);
            } else {
                setresponsemessage(response.data.message || 'Success');
                setTimeout(() => setSuccess(false), 2000);
            }
        } catch (error) {
            setresponsemessage('Server Error');
            setTimeout(() => setSuccess(false), 2000);
        }
    };

    // ----- PDF flow & permissions helpers -----
    let IntentLauncherModule: any = null;
    try {
        IntentLauncherModule = require('react-native-intent-launcher');
    } catch (e) {
        IntentLauncherModule = null;
    }

    // const APP_PACKAGE_NAME = 'com.your.app'; // replace

    const openManageAllFilesPermission = async () => {
        if (Platform.OS !== 'android') {
            Alert.alert('Only Android', 'This action is only for Android devices.');
            return;
        }

        const pkg = APP_PACKAGE_NAME;
        // prefer startActivity for ACTION_MANAGE_APP_ALL_FILES_ACCESS_PERMISSION
        try {
            const IntentLauncher = require('react-native-intent-launcher').default;
            await IntentLauncher.startActivity({
                action: 'android.settings.MANAGE_APP_ALL_FILES_ACCESS_PERMISSION',
                data: `package:${pkg}`,
            });
            return;
        } catch (e) {
            // IntentLauncher may not be installed / compatible: fallback
            console.warn('IntentLauncher not available or failed', e);
        }

        // fallback to the generic settings screens:
        try {
            // Try open special-manage intent with Linking (some ROMs accept this)
            await Linking.openURL(`package:${pkg}`); // sometimes no-op
        } catch (e) {
            console.warn('Linking package: failed', e);
        }

        // If above fails, open app details
        try {
            await Linking.openSettings(); // opens app details in many devices
        } catch (err) {
            console.warn('Linking.openSettings failed', err);
            // final fallback: start activity using adb-style intent
            try {
                await Linking.openURL(`app-settings:package:${pkg}`); // not always supported
            } catch (ee) {
                Alert.alert('Unable to open settings', 'Please open app settings manually and grant "All files access".');
            }
        }
    };

    async function requestStoragePermission(): Promise<boolean> {
        if (Platform.OS !== 'android') return true;
        try {
            const writeOk = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE);
            if (writeOk) return true;
            const status = await PermissionsAndroid.request(
                PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
                {
                    title: 'Storage permission required',
                    message: 'App needs access to your storage to save the PDF to Downloads.',
                    buttonPositive: 'OK',
                    buttonNegative: 'Cancel',
                }
            );
            if (status === PermissionsAndroid.RESULTS.GRANTED) {
                return true;
            }
            if (status === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
                Alert.alert(
                    'Permission required',
                    'Storage permission was permanently denied. Please open settings and enable storage permission to save the PDF.',
                    [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Open Settings', onPress: () => openManageAllFilesPermission() }
                    ]
                );
                return false;
            }
            Alert.alert('Permission denied', 'Cannot save PDF without storage permission.');
            return false;
        } catch (err) {
            console.warn('requestStoragePermission error', err);
            return false;
        }
    }

    async function askAndRequestStoragePermission(): Promise<boolean> {
        if (Platform.OS !== 'android') return true;
        const already = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE);
        if (already) return true;
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
                                            {
                                                text: 'Open Settings',
                                                onPress: () => {
                                                    Linking.openSettings().catch(() => { });
                                                    resolve(false);
                                                }
                                            }
                                        ]
                                    );
                                    return;
                                }
                                Alert.alert('Permission denied', 'Cannot save PDF without storage permission.');
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
    }

    // handleCallURL: download preview file, set selectedItem (so accurate card data available)
    const handleCallURL = async (item: CardData) => {
        setSelectedItem(item);
        setLocationLoading(true);
        setPdfLoading(true);
        try {
            const headers = {
                Authorization: `Bearer ${getToken()}`,
                'Content-Type': 'application/json',
                'X-Requested-with': 'XMLHttpRequest',
            };
            const apiResp = await axios.post(
                // 'https://apig.tms-webapp.com/api/new_account_reuest_print',
                `${API}/api/new_account_reuest_print`,
                {
                    prpcode: item.prpcode,
                    yearno: item.yearno,
                    accname: item.AccName,
                    printTypes: ['new_account_request'],
                    printFormat: 'one',
                },
                { headers }
            );
            const pdfUrlFromApi = apiResp?.data?.results?.new_account_request;
            console.log('pdfUrlFromApi', pdfUrlFromApi);
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
            const fileName = `new_account_request_${Date.now()}.pdf`;
            const localPath = `${RNFS.DocumentDirectoryPath}/${fileName}`;
            await RNFS.writeFile(localPath, base64PDF, 'base64');
            setPdfUrl(`file://${localPath}`);
            setPdfPublicUrl(pdfUrlFromApi);
            setShowPdfModal(true);
        } catch (err: any) {
            console.error('handleCallURL error:', err);
            Alert.alert('Error', err?.message || 'Failed to fetch/preview PDF');
        } finally {
            setLocationLoading(false);
            setPdfLoading(false);
        }
    };

    const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
        let binary = '';
        const bytes = new Uint8Array(buffer);
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) binary += String.fromCharCode(bytes[i]);
        return btoa(binary);
    };

    // helper: try sharing local file (no storage permission needed)
    const shareLocalFile = async (localFileUri: string) => {
        try {
            const urlToShare = localFileUri.startsWith('file://') ? localFileUri : `file://${localFileUri}`;
            await Share.share({ url: urlToShare } as any);
        } catch (err) {
            console.warn('shareLocalFile error', err);
            Alert.alert('Share failed', err?.message || String(err));
        }
    };

    // PdfViewerModal inside component (updated handleDownload)
    const PdfViewerModal = ({ visible, pdfUrl, pdfPublicUrl, onClose }: {
        visible: boolean;
        pdfUrl: string;
        pdfPublicUrl?: string | null;
        onClose: () => void;
    }) => {
        const [webViewKey, setWebViewKey] = useState(0);
        const [saving, setSaving] = useState(false);

        const handleDownload = async () => {
            try {
                if (!pdfUrl) { Alert.alert('No file', 'No PDF available to download'); return; }

                // iOS: open share sheet (no Downloads folder concept for RNFS copy)
                if (Platform.OS === 'ios') {
                    await shareLocalFile(pdfUrl);
                    return;
                }

                // Android: friendly dialog -> request permission
                // const ok = await askAndRequestStoragePermission();
                // if (!ok) {
                //     // user denied; offer share fallback
                //     Alert.alert(
                //         'Cannot save',
                //         'Storage permission not granted. You can share the file to save it elsewhere.',
                //         [
                //             { text: 'Cancel', style: 'cancel' },
                //             { text: 'Share', onPress: () => shareLocalFile(pdfUrl) }
                //         ]
                //     );
                //     return;
                // }

                // proceed to copy to Downloads
                const localPath = pdfUrl.startsWith('file://') ? pdfUrl.replace('file://', '') : pdfUrl;
                const fileName = localPath.split('/').pop() || `document_${Date.now()}.pdf`;
                const destPath = `${RNFS.DownloadDirectoryPath}/${fileName}`;

                try {
                    await RNFS.copyFile(localPath, destPath);
                    if (ToastAndroid) {
                        ToastAndroid.show(`Saved to Downloads: ${fileName}`, ToastAndroid.LONG);
                    } else {
                        Alert.alert('Saved', `Saved to Downloads:\n${destPath}`);
                    }
                } catch (copyErr: any) {
                    console.error('copyFile failed', copyErr);
                    // If copy fails due to Android 11+ restrictions, ask user to give All files access
                    Alert.alert(
                        'Save failed',
                        'Could not save to Downloads. Allow "All files access" or grant storage permission in Settings, or share the file instead.',
                        [
                            { text: 'Cancel', style: 'cancel' },
                            { text: 'Open Settings', onPress: () => openManageAllFilesPermission() },
                            { text: 'Share', onPress: () => shareLocalFile(pdfUrl) }
                        ]
                    );
                }
            } catch (err) {
                console.error('handleDownload error', err);
                Alert.alert('Error', `Could not save PDF: ${err?.message || err}`);
            }
        };

        const handleClose = () => {
            setWebViewKey(prev => prev + 1);
            onClose();
        };

        return (
            <Modal visible={visible} animationType="slide" onRequestClose={handleClose} presentationStyle="fullScreen">
                <View style={{ flex: 1, backgroundColor: '#fff' }}>
                    <View style={crlimtreq_styles.pdfHeader}>
                        <TouchableOpacity onPress={handleDownload} style={crlimtreq_styles.pdfHeaderButton} disabled={saving || !pdfUrl}>
                            <Icon name="download" size={24} color={saving ? "#999" : "#000"} />
                            <Text style={crlimtreq_styles.pdfHeaderButtonText}>{saving ? 'Saving...' : 'Download'}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity onPress={handleClose} style={crlimtreq_styles.pdfHeaderButton}>
                            <Icon name="close" size={24} color="#000" />
                            <Text style={crlimtreq_styles.pdfHeaderButtonText}>Close</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={{ flex: 1 }}>
                        {pdfUrl ? (
                            <Pdf
                                source={{ uri: pdfUrl }}
                                style={{ flex: 1 }}
                                onError={(e) => {
                                    console.error('react-native-pdf error', e);
                                    Alert.alert('Error', 'Failed to render PDF');
                                }}
                            />
                        ) : (
                            <View style={crlimtreq_styles.pdfLoading}>
                                <Text>No PDF</Text>
                            </View>
                        )}
                    </View>
                </View>
            </Modal>
        );
    };

    const renderCard = ({ item }: { item: CardData & { isProcessed?: boolean; actionType?: 'accept' | 'reject' } }) => (
        <View style={[
            crlimtreq_styles.card, !isConnected && crlimtreq_styles.disabledCard,
            item.actionType === 'accept' ? crlimtreq_styles.acceptedCard : item.actionType === 'reject' ? crlimtreq_styles.rejectedCard : crlimtreq_styles.card
        ]}>
            {item.isProcessed && (
                <View style={[crlimtreq_styles.stampContainer]}>
                    <View style={[crlimtreq_styles.stamp,
                    item.actionType === 'accept' ? crlimtreq_styles.stampAccepted : crlimtreq_styles.stampRejected]}>
                        <Text style={crlimtreq_styles.stampText}>
                            {item.actionType === 'accept' ? 'APPROVED' : 'REJECTED'}
                        </Text>
                    </View>
                </View>
            )}
            <View style={crlimtreq_styles.cardHeaderContainer}>
                <View style={crlimtreq_styles.cardHeader}>
                    <Text style={crlimtreq_styles.cardHeaderText}>{item.prptypename}</Text>
                </View>
            </View>
            <View style={crlimtreq_styles.cardSubHeader}>
                <Text style={crlimtreq_styles.cardSubHeaderText}>{item.AccName}</Text>
            </View>
            <View style={crlimtreq_styles.cardContent}>
                <View style={crlimtreq_styles.twoColumnRow}>
                    <View style={crlimtreq_styles.keyValuePair}>
                        <Text style={crlimtreq_styles.key}>Main Head:</Text>
                        <Text style={crlimtreq_styles.value}>{item.MLngName || 'N/A'}</Text>
                    </View>
                    <View style={crlimtreq_styles.keyValuePair}>
                        <Text style={crlimtreq_styles.key}>Sub Head:</Text>
                        <Text style={crlimtreq_styles.value}>{item.SLngName || 'N/A'}</Text>
                    </View>
                </View>
                <View style={crlimtreq_styles.twoColumnRow}>
                    <View style={crlimtreq_styles.keyValuePair}>
                        <Text style={crlimtreq_styles.key}>UsrCode:</Text>
                        <Text style={crlimtreq_styles.value}>{item.UsrCode || 'N/A'}</Text>
                    </View>
                    <View style={crlimtreq_styles.keyValuePair}>
                        <Text style={crlimtreq_styles.key}>Group:</Text>
                        <Text style={crlimtreq_styles.value}>{item.GrpCode || 'N/A'}</Text>
                    </View>
                </View>
                <View style={crlimtreq_styles.twoColumnRow}>
                    <View style={crlimtreq_styles.keyValuePair}>
                        <Text style={crlimtreq_styles.key}>Credit Days:</Text>
                        <RNTextInput
                            style={crlimtreq_styles.editableValue}
                            value={editableValues[item.uid]?.CrDay !== undefined ? editableValues[item.uid].CrDay : item.CrDay}
                            onChangeText={(text) => handleEdit(item.uid, 'CrDay', text)}
                            keyboardType="numeric"
                            placeholder={String(item.CrDay)}
                        />
                    </View>
                    <View style={crlimtreq_styles.keyValuePair}>
                        <Text style={crlimtreq_styles.key}>Credit Limit:</Text>
                        <RNTextInput
                            style={crlimtreq_styles.editableValue}
                            value={
                                editableValues[item.uid]?.CrLimit !== undefined
                                    ? editableValues[item.uid].CrLimit
                                    : formatToIndianCurrency(item.CrLimit || '0')
                            }
                            onChangeText={(text) => handleEdit(item.uid, 'CrLimit', text)}
                            keyboardType="numeric"
                        />
                    </View>
                </View>
                <View style={crlimtreq_styles.twoColumnRow}>
                    <View style={crlimtreq_styles.keyValuePair}>
                        <Text style={crlimtreq_styles.key}>Sales Executive:</Text>
                        <Text style={crlimtreq_styles.value}>{item.SExeName || 'N/A'}</Text>
                    </View>
                    <View style={crlimtreq_styles.keyValuePair}>
                        <Text style={crlimtreq_styles.key}>Collection Executive:</Text>
                        <Text style={crlimtreq_styles.value}>{item.CExeNam || 'N/A'}</Text>
                    </View>
                </View>
                <View style={crlimtreq_styles.fullWidthRow}>
                    <Text style={crlimtreq_styles.key}>Address:</Text>
                    <Text style={crlimtreq_styles.value}>{item.Address}</Text>
                </View>
            </View>
            <View style={crlimtreq_styles.cardActions}>
                <TouchableOpacity onPress={() => handleIconPress(item, 'accept')} disabled={!isConnected || item.isProcessed}>
                    <Icon name="check-circle" size={40} color={!isConnected || item.isProcessed ? "#ccc" : "#4CAF50"} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleIconPress(item, 'reject')} disabled={!isConnected || item.isProcessed}>
                    <Icon name="cancel" size={40} color={!isConnected || item.isProcessed ? "#ccc" : "#F44336"} />
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={() => { if (isConnected && !item.isProcessed) handleCallURL(item); }}
                    disabled={!isConnected || item.isProcessed || getLocationLoading}
                >
                    {getLocationLoading ? (
                        <ActivityIndicator size={40} color="#2196F3" />
                    ) : (
                        <Icon name="file-present" size={40} color={!isConnected || item.isProcessed ? "#ccc" : "#2196F3"} />
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );

    const TabBar = ({ activeTab, setActiveTab }: any) => (
        <View style={crlimtreq_styles.tabContainer1}>
            <TouchableOpacity
                style={[crlimtreq_styles.tab1, activeTab === 'account requests' && crlimtreq_styles.activeTab1]}
                onPress={() => setActiveTab('account requests')}
            >
                <Text style={crlimtreq_styles.tabText1}>New Account Request</Text>
            </TouchableOpacity>
        </View>
    );

    return (
        <>
            {activeTab1 === 'account requests' ? (
                <HeaderBar
                    userName={username}
                    onSearch={setSearchQuery}
                    placeholder="Search account request..."
                />
            ) : null}
            <View style={crlimtreq_styles.container}>
                {isLoading && <FullScreenLoader message={activeTab1 === 'account requests' ? "Loading Account Request..." : ""} />}
                <TabBar activeTab={activeTab1} setActiveTab={setActiveTab1} />
                {activeTab1 === 'account requests' ? (
                    <FlatList
                        ref={flatListRef}
                        data={filteredData}
                        renderItem={renderCard}
                        keyExtractor={(item) => item.uid || Math.random().toString()}
                        contentContainerStyle={crlimtreq_styles.list}
                        onScroll={({ nativeEvent }) => { setShowTopButton(nativeEvent.contentOffset.y > 100); }}
                        ListEmptyComponent={!isLoading ? (
                            <View style={crlimtreq_styles.emptyContainer}>
                                <Text style={crlimtreq_styles.emptyText}>No account request data found!</Text>
                            </View>
                        ) : null}
                    />
                ) : null}

                {getSuccess === true ? (
                    <Modal visible={showOverlay} transparent={true} animationType="fade" onRequestClose={() => setShowOverlay(false)}>
                        <View style={crlimtreq_styles.overlayContainer}>
                            <View style={crlimtreq_styles.overlay}>
                                <Text style={crlimtreq_styles.overlayTitle}>
                                    {selectedAction === 'accept' ? 'Confirm Accept' : 'Confirm Reject'}
                                </Text>
                                <Text style={crlimtreq_styles.overlayPartyName}>
                                    Party: {selectedItem?.parname}
                                </Text>
                                {responsemessage === 'Loading...' ? (
                                    <Text style={crlimtreq_styles.loadingText}>
                                        <ActivityIndicator size="small" color={theme.BRAND_GRADIENT_END} /> {responsemessage}
                                    </Text>
                                ) : (
                                    <Text style={crlimtreq_styles.responseText}>{responsemessage}</Text>
                                )}
                            </View>
                        </View>
                    </Modal>
                ) : (
                    <Modal visible={showOverlay} transparent={true} animationType="fade" onRequestClose={() => setShowOverlay(false)}>
                        <View style={crlimtreq_styles.overlayContainer}>
                            <View style={crlimtreq_styles.overlay}>
                                <Text style={crlimtreq_styles.overlayTitle}>
                                    {selectedAction === 'accept' ? 'Confirm Accept' : 'Confirm Reject'}
                                </Text>
                                <Text style={crlimtreq_styles.overlayPartyName}>Party: {selectedItem?.AccName}</Text>
                                <View style={crlimtreq_styles.overlayButtons}>
                                    <TouchableOpacity
                                        style={[crlimtreq_styles.overlayButton, { backgroundColor: '#4CAF50' }]}
                                        onPress={handleConfirmAction}
                                    >
                                        <Icon name="check" size={20} color="white" />
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[crlimtreq_styles.overlayButton, { backgroundColor: '#F44336' }]}
                                        onPress={() => setShowOverlay(false)}
                                    >
                                        <Icon name="close" size={20} color="white" />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    </Modal>
                )}
            </View>

            <PdfViewerModal
                visible={showPdfModal}
                pdfUrl={pdfUrl}
                pdfPublicUrl={pdfPublicUrl}
                onClose={() => {
                    setShowPdfModal(false);
                    setPdfUrl('');
                    setPdfPublicUrl(null);
                }}
            />
        </>
    );
};

export default NewAccountRequest;
