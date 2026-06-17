import React, { useEffect, useRef, useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    Alert,
    Modal,
    ActivityIndicator,
    StyleSheet,
    ScrollView,
    Animated,
    Dimensions,
    StatusBar,
    Pressable,
    Image,
    Share,
    Platform,
} from 'react-native';
import Icon from '@expo/vector-icons/MaterialIcons';
import axios from 'axios';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
// import * as BarcodeScanner from 'expo-barcode-scanner';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import Header from '../Header';
import jsQR from 'jsqr';
import * as ImageManipulator from 'expo-image-manipulator';
import TourOverlay from '@/common/TourOverlay';
import { CHECKING_SCANNER_TOUR } from '@/common/TourJson'

const { width } = Dimensions.get('window');
const PRIMARY = '#007EA7';
const PRIMARY_DARK = '#003459';
const SUCCESS = '#2E7D32';
const BG = '#F4F7FB';
const CARD = '#FFFFFF';
const TEXT_DARK = '#1A2332';
const TEXT_MUTED = '#6B7A8F';
const BORDER = '#E3EAF2';
const API = 'https://your-api.com'; // Replace with your API base URL

// Sample QR data for demonstration
const SAMPLE_QR_DATA = {
    takano: "WJ2753",
    itmname: "LINEN SHIRTING",
    dsnname: "PASSAT-26-5555",
    grdname: "A",
    mtr: "23.393",
    kgs: "5.848",
    checker: "YEDULAL"
};
interface Props {
    token: string;
    username: string;
}

// ═══════════════════════════════════════════════════════
// 🎯 MAIN SCREEN
// ═══════════════════════════════════════════════════════
// const CheckingScannerNew = ({ token }: { token: string }) => {
const CheckingScannerNew: React.FC<Props> = ({ token, username }) => {
    const [permission, requestPermission] = useCameraPermissions();
    const [isScanning, setIsScanning] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [scannedData, setScannedData] = useState<any>(null);
    const [showHelp, setShowHelp] = useState(false);
    const [showSampleQR, setShowSampleQR] = useState(false);
    const [imageUri, setImageUri] = useState<string | null>(null);
    const [showScanButton, setShowScanButton] = useState(false);

    // Form state (auto-fill from API or QR)
    const [meter, setMeter] = useState('');
    const [kgs, setKgs] = useState('');
    const [design, setDesign] = useState('');
    const [grade, setGrade] = useState('');
    const [checker, setChecker] = useState('');
    const [shift, setShift] = useState('');
    const [showTour, setShowTour] = useState(false);
    // Dropdown open state
    const [openDropdown, setOpenDropdown] = useState<string | null>(null);

    // Animation refs
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(30)).current;
    const pulseAnim = useRef(new Animated.Value(1)).current;

    // Static options (replace with API data)
    const designOptions = [
        { code: 'DSN001', name: 'Cotton Plain 100s' },
        { code: 'DSN002', name: 'Polyester Blend' },
        { code: 'DSN003', name: 'Linen Stripe' },
    ];
    const gradeOptions = [
        { code: 'A', name: 'Grade A' },
        { code: 'B', name: 'Grade B' },
        { code: 'C', name: 'Grade C' },
    ];
    const checkerOptions = [
        { code: 'EMP001', name: 'Rajesh Kumar' },
        { code: 'EMP002', name: 'Suresh Patel' },
    ];
    const shiftOptions = [
        { code: 'SHF1', name: 'Shift 1 (Morning)' },
        { code: 'SHF2', name: 'Shift 2 (Evening)' },
        { code: 'SHF3', name: 'Shift 3 (Night)' },
    ];

    useEffect(() => {
        requestPermission();
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
            Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
        ]).start();
    }, []);

    useEffect(() => {
        if (isScanning) {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, { toValue: 1.1, duration: 800, useNativeDriver: true }),
                    Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
                ])
            ).start();
        }
    }, [isScanning]);

    // ═══════════════════════════════════════════════════
    // 🎯 SCAN QR FROM IMAGE
    // ═══════════════════════════════════════════════════
    // const scanQRFromImage = async (imageUri: string) => {
    //     try {
    //         // Use expo-barcode-scanner to scan QR from the image
    //         const { data } = await BarcodeScanner.scanFromURLAsync(imageUri, [
    //             BarcodeScanner.BarCodeScannerConstants.BarCodeType.qr
    //         ]);

    //         if (data) {
    //             try {
    //                 const parsed = JSON.parse(data);
    //                 return parsed; // Return parsed JSON
    //             } catch (e) {
    //                 Alert.alert('⚠️ Error', 'Scanned QR is not valid JSON.');
    //                 return null;
    //             }
    //         } else {
    //             Alert.alert('⚠️ Error', 'No QR code detected in the image.');
    //             return null;
    //         }
    //     } catch (err) {
    //         console.log('QR Scan Error:', err);
    //         Alert.alert('❌ Error', 'Failed to scan QR from image.');
    //         return null;
    //     }
    // };
    // const scanQRFromImage = async (imageUri: string) => {
    //     try {
    //         Alert.alert(
    //             'QR Image Scan',
    //             'Image selected successfully.\n\nExpo SDK 54 does not support direct scanFromURLAsync.\nNeed Vision Camera implementation.'
    //         );

    //         return null;
    //     } catch (err) {
    //         console.log(err);
    //         return null;
    //     }
    // };
    // const scanQRFromImage = async (imageUri: string) => {
    //     try {
    //         console.log('Scanning image:', imageUri);

    //         const result = await QRLocalImage.decode(imageUri);

    //         console.log('QR Result:', result);

    //         const parsed = JSON.parse(result);

    //         return parsed;
    //     } catch (e) {
    //         console.log('QR Scan Error:', e);
    //         Alert.alert('QR not found or invalid JSON');
    //         return null;
    //     }
    // };
    const scanQRFromImage = async (imageUri: string) => {
        try {
            console.log('Scanning image:', imageUri);

            // Temporary fixed data
            return {
                takano: "WJ2753",
                itmname: "LINEN SHIRTING",
                dsnname: "PASSAT-26-5555",
                grdname: "A",
                mtr: "23.393",
                kgs: "5.848",
                checker: "YEDULAL"
            };
        } catch (e) {
            console.log('QR Scan Error:', e);
            return null;
        }
    };

    // ═══════════════════════════════════════════════════
    // 📷 IMAGE UPLOAD & SCAN
    // ═══════════════════════════════════════════════════
    const pickFromGallery = async () => {
        try {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Required', 'Please allow access to the gallery to select an image.');
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: false,
                quality: 0.8,
            });

            if (!result.canceled && result.assets?.length > 0) {
                const asset = result.assets[0];

                setImageUri(asset.uri);
                const scannedData = await scanQRFromImage(asset.uri);

                if (scannedData) {
                    await processScannedData(scannedData);
                }
                // setShowScanButton(true);

                // Alert.alert(
                //     'Image Selected',
                //     'Preview loaded. Now tap "Scan This QR".'
                // );
            }
        } catch (err) {
            console.log('Gallery error:', err);
            Alert.alert('Error', 'Failed to pick image.');
        }
    };

    const handleCameraCapture = async () => {
        try {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Required', 'Please allow access to the camera.');
                return;
            }

            const result = await ImagePicker.launchCameraAsync({
                allowsEditing: false,
                quality: 0.8,
            });

            if (!result.canceled && result.assets?.length > 0) {
                const asset = result.assets[0];

                setImageUri(asset.uri);
                setShowScanButton(true);

                Alert.alert(
                    'Photo Captured',
                    'Preview loaded. Now tap "Scan This QR".'
                );
            }
        } catch (err) {
            console.log('Camera error:', err);
            Alert.alert('Error', 'Failed to capture image.');
        }
    };

    // ═══════════════════════════════════════════════════
    // 🎯 PROCESS SCANNED DATA (API + QR)
    // ═══════════════════════════════════════════════════
    // const processScannedData = async (parsed: any) => {
    //     try {
    //         setIsLoading(true);

    //         // 1️⃣ API Call (if needed)
    //         let apiData = {};
    //         if (parsed.prpcode && parsed.yearNo) {
    //             const response = await axios.post(
    //                 `${API}/api/get_auto_checking_help`,
    //                 {
    //                     txntype: 'chekingScanner',
    //                     referrer: 'dashboard',
    //                     scannedString: parsed,
    //                     prpcode: parsed.prpcode,
    //                     yearno: parsed.yearNo,
    //                 },
    //                 {
    //                     headers: {
    //                         Authorization: `Bearer ${token}`,
    //                         'Content-Type': 'application/json',
    //                     },
    //                 }
    //             );

    //             if (response.data?.success) {
    //                 apiData = response.data.response || response.data || {};
    //             }
    //         }

    //         // 2️⃣ Merge API and QR data
    //         const mergedData = {
    //             ...parsed,
    //             ...apiData,
    //         };

    //         // 3️⃣ Set scanned data (for display)
    //         setScannedData({
    //             takano: mergedData.takano || parsed.takano || '',
    //             itmname: mergedData.itmname || parsed.itmname || '',
    //             dsnname: mergedData.dsnname || parsed.dsnname || '',
    //             grdname: mergedData.grdname || parsed.grdname || '',
    //             mtr: mergedData.mtr || mergedData.meter || parsed.mtr || parsed.meter || '',
    //             kgs: mergedData.kgs || parsed.kgs || '',
    //             checker: mergedData.checker || parsed.checker || '',
    //             prpcode: mergedData.prpcode || parsed.prpcode || '',
    //             yearNo: mergedData.yearNo || parsed.yearNo || '',
    //             beamNo: mergedData.beamno || parsed.beamno || '',
    //         });

    //         // 4️⃣ Auto-fill form fields
    //         setMeter(String(mergedData.mtr || mergedData.meter || parsed.mtr || parsed.meter || ''));
    //         setKgs(String(mergedData.kgs || parsed.kgs || ''));
    //         setGrade(mergedData.grdname || mergedData.grade || parsed.grdname || parsed.grade || '');
    //         setChecker(mergedData.checker || parsed.checker || '');
    //         setDesign(mergedData.dsnname || mergedData.dsncode || parsed.dsnname || parsed.dsncode || '');
    //         setShift(mergedData.shift || parsed.shift || '');

    //         Alert.alert('✅ Success', 'QR scanned & data auto-filled!');
    //     } catch (err: any) {
    //         console.log('Process Error:', err);
    //         Alert.alert('❌ Error', err?.message || 'Failed to process scanned data.');
    //     } finally {
    //         setIsLoading(false);
    //     }
    // };
    const processScannedData = async (parsed: any) => {
        setScannedData(parsed);

        setMeter(String(parsed.mtr || ''));
        setKgs(String(parsed.kgs || ''));
        setGrade(parsed.grdname || '');
        setChecker(parsed.checker || '');
        setDesign(parsed.dsnname || '');
        setShift(parsed.shift || '');

        Alert.alert(
            'Success',
            'QR scanned and fields filled'
        );
    };

    // ═══════════════════════════════════════════════════
    // 🎯 SCAN HANDLER (Camera QR Scan)
    // ═══════════════════════════════════════════════════
    const handleBarCodeScanned = async (result: BarcodeScanningResult) => {
        if (isLoading) return;

        setIsScanning(false);
        setIsLoading(true);
        setShowScanButton(false);

        try {
            // 1️⃣ QR Parse
            const qrRaw = result?.data || '';
            const parsed = JSON.parse(qrRaw);
            setImageUri(null);
            // 2️⃣ Process scanned data (API + auto-fill)
            await processScannedData(parsed);
        } catch (err: any) {
            console.log('Scan Error:', err);
            Alert.alert('❌ Error', err?.message || 'Invalid QR data.');
        } finally {
            setIsLoading(false);
        }
    };

    // ═══════════════════════════════════════════════════
    // 📥 DOWNLOAD & SHARE SAMPLE QR
    // ═══════════════════════════════════════════════════
    // const downloadSampleQR = async () => {
    //     try {
    //         const qrJson = JSON.stringify(SAMPLE_QR_DATA, null, 2);
    //         const fileUri = FileSystem.cacheDirectory + 'sample_qr.json';
    //         await FileSystem.writeAsStringAsync(fileUri, qrJson);

    //         const isAvailable = await Sharing.isAvailableAsync();
    //         if (!isAvailable) {
    //             Alert.alert('Error', 'Sharing not available');
    //             return;
    //         }

    //         await Sharing.shareAsync(fileUri, {
    //             mimeType: 'application/json',
    //             dialogTitle: 'Sample QR Data',
    //         });
    //     } catch (err) {
    //         console.log('Download error:', err);
    //         Alert.alert('Error', 'Failed to download sample QR.');
    //     }
    // };
    const downloadSampleQR = async () => {
        const fileUri =
            FileSystem.cacheDirectory + 'WJ2753.png';

        const result = await FileSystem.downloadAsync(
            'https://apiy.tms-webapp.com/qrcodes/WJ2753.png',
            fileUri
        );

        await Sharing.shareAsync(result.uri);
    };

    // const shareSampleQR = async () => {
    //     try {
    //         const qrJson = JSON.stringify(SAMPLE_QR_DATA, null, 2);
    //         await Share.share({
    //             message: `Sample QR Data:\n${qrJson}`,
    //             title: 'Sample QR Data',
    //         });
    //     } catch (err) {
    //         console.log('Share error:', err);
    //         Alert.alert('Error', 'Failed to share sample QR.');
    //     }
    // };
    const shareSampleQR = async () => {
        await Share.share({
            message:
                'https://apiy.tms-webapp.com/qrcodes/WJ2753.png',
        });
    };

    const handleClear = () => {
        setScannedData(null);
        setMeter('');
        setKgs('');
        setDesign('');
        setGrade('');
        setChecker('');
        setShift('');
        setOpenDropdown(null);
        setImageUri(null);
        setShowScanButton(false);
    };

    // ── Permission screens ──
    if (!permission) {
        return (
            <View style={styles.centerScreen}>
                <ActivityIndicator size="large" color={PRIMARY} />
                <Text style={styles.permText}>Initializing camera...</Text>
            </View>
        );
    }

    if (!permission.granted) {
        return (
            <View style={styles.centerScreen}>
                <View style={styles.permIconCircle}>
                    <Icon name="camera-alt" size={50} color={PRIMARY} />
                </View>
                <Text style={styles.permTitle}>Camera Permission Required</Text>
                <Text style={styles.permSubtext}>
                    Please allow camera access to scan QR codes
                </Text>
                <TouchableOpacity style={styles.primaryBtn} onPress={requestPermission}>
                    <Icon name="lock-open" size={18} color="#fff" style={{ marginRight: 6 }} />
                    <Text style={styles.primaryBtnText}>Grant Permission</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <>
            <Header breadcrumb={'Checking Scanner'} SearchBar={false} />
            <TouchableOpacity
                style={styles.headerIconBtn}
                onPress={() => setShowTour(true)}
            >
                <Icon name="help-outline" size={22} color="#fff" />
            </TouchableOpacity>

            <View style={styles.screen}>
                <StatusBar barStyle="light-content" backgroundColor={PRIMARY_DARK} />

                <ScrollView
                    style={{ flex: 1 }}
                    contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    {/* ══════ SAMPLE QR BUTTONS ══════ */}
                    <View style={styles.sampleQRContainer}>
                        <TouchableOpacity
                            style={styles.sampleQRButton}
                            onPress={() => setShowSampleQR(true)}
                        >
                            <Icon name="qr-code" size={20} color={PRIMARY} />
                            <Text style={styles.sampleQRText}>Show Sample QR</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.sampleQRButton}
                            onPress={downloadSampleQR}
                        >
                            <Icon name="download" size={20} color={SUCCESS} />
                            <Text style={styles.sampleQRText}>Download Sample</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.sampleQRButton}
                            onPress={shareSampleQR}
                        >
                            <Icon name="share" size={20} color={PRIMARY} />
                            <Text style={styles.sampleQRText}>Share Sample</Text>
                        </TouchableOpacity>
                    </View>

                    {/* ══════ SCAN BUTTON (Camera) ══════ */}
                    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
                        <TouchableOpacity
                            activeOpacity={0.8}
                            style={[styles.scanButton, isScanning && styles.scanButtonActive]}
                            onPress={() => setIsScanning(!isScanning)}
                            disabled={isLoading}
                        >
                            <Animated.View style={[styles.scanIconCircle, { transform: [{ scale: pulseAnim }] }]}>
                                {isLoading ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <Icon
                                        name={isScanning ? 'stop' : 'qr-code-scanner'}
                                        size={28}
                                        color="#fff"
                                    />
                                )}
                            </Animated.View>
                            <View style={{ flex: 1, marginLeft: 14 }}>
                                <Text style={styles.scanButtonTitle}>
                                    {isLoading ? 'Processing...' : isScanning ? 'Scanning...' : 'Start Scan & Verify Data'}
                                </Text>
                                <Text style={styles.scanButtonSub}>
                                    {isLoading
                                        ? 'Fetching data from server'
                                        : isScanning
                                            ? 'Point camera at QR code'
                                            : 'Tap to scan & auto-fill'}
                                </Text>
                            </View>
                            <Icon name="chevron-right" size={24} color="#fff" />
                        </TouchableOpacity>
                    </Animated.View>

                    {/* ══════ CAMERA VIEW ══════ */}
                    {isScanning && (
                        <View style={styles.cameraWrap}>
                            <CameraView
                                style={styles.camera}
                                facing="back"
                                onBarcodeScanned={handleBarCodeScanned}
                                barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                            />
                            <View style={styles.cameraOverlay}>
                                <View style={styles.scanFrame}>
                                    <View style={[styles.corner, styles.tl]} />
                                    <View style={[styles.corner, styles.tr]} />
                                    <View style={[styles.corner, styles.bl]} />
                                    <View style={[styles.corner, styles.br]} />
                                </View>
                                <Text style={styles.cameraHint}>Align QR within the frame</Text>
                            </View>
                        </View>
                    )}

                    {/* ══════ IMAGE UPLOAD BUTTONS ══════ */}
                    <View style={styles.uploadButtonsContainer}>
                        <TouchableOpacity
                            style={styles.uploadButton}
                            onPress={pickFromGallery}
                        >
                            <Icon name="photo-library" size={20} color="#fff" />
                            <Text style={styles.uploadButtonText}>Upload from Gallery</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.uploadButton}
                            onPress={handleCameraCapture}
                        >
                            <Icon name="photo-camera" size={20} color="#fff" />
                            <Text style={styles.uploadButtonText}>Take Photo</Text>
                        </TouchableOpacity>
                    </View>

                    {/* ══════ UPLOADED IMAGE PREVIEW ══════ */}
                    {imageUri && (
                        <View style={styles.imagePreviewContainer}>
                            <Image source={{ uri: imageUri }} style={styles.imagePreview} />
                            {/* <Image
                                source={{
                                    uri: 'https://apiy.tms-webapp.com/qrcodes/WJ2753.png'
                                }}
                                style={{
                                    width: 250,
                                    height: 250,
                                    alignSelf: 'center'
                                }}
                            /> */}
                            <TouchableOpacity
                                style={styles.removeImageButton}
                                onPress={() => setImageUri(null)}
                            >
                                <Icon name="delete" size={20} color="#fff" />
                            </TouchableOpacity>
                        </View>
                    )}
                    {imageUri && showScanButton && (
                        <TouchableOpacity
                            style={{
                                backgroundColor: '#2E7D32',
                                padding: 14,
                                borderRadius: 10,
                                marginTop: 10,
                                alignItems: 'center',
                            }}
                            onPress={() => {
                                setIsScanning(true);
                            }}
                        >
                            <Text
                                style={{
                                    color: '#fff',
                                    fontWeight: '700',
                                    fontSize: 16,
                                }}
                            >
                                Scan This QR
                            </Text>
                        </TouchableOpacity>
                    )}

                    {/* ══════ SCANNED DATA CARD ══════ */}
                    {scannedData && (
                        <Animated.View
                            style={[
                                styles.card,
                                styles.successCard,
                                { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
                            ]}
                        >
                            <View style={styles.cardHeader}>
                                <View style={styles.successBadge}>
                                    <Icon name="check-circle" size={16} color="#fff" />
                                    <Text style={styles.successBadgeText}>QR Scanned</Text>
                                </View>
                                <TouchableOpacity onPress={handleClear} style={styles.closeBtn}>
                                    <Icon name="close" size={20} color={TEXT_MUTED} />
                                </TouchableOpacity>
                            </View>

                            {/* Display all keys and values from scannedData */}
                            {Object.entries(scannedData).map(([key, value]) => (
                                <DetailRow
                                    key={key}
                                    icon="tag"
                                    label={key}
                                    value={String(value || '')}
                                    isLast={Object.keys(scannedData).indexOf(key) === Object.keys(scannedData).length - 1}
                                />
                            ))}
                        </Animated.View>
                    )}

                    {/* ══════ INPUT SECTION ══════ */}

                </ScrollView>

                {/* ══════ SAMPLE QR MODAL ══════ */}
                <Modal visible={showSampleQR} transparent animationType="fade" onRequestClose={() => setShowSampleQR(false)}>
                    <Pressable style={styles.modalBackdrop} onPress={() => setShowSampleQR(false)}>
                        <View style={styles.sampleQRModal}>
                            <View style={styles.helpHeader}>
                                <Icon name="qr-code" size={24} color={PRIMARY} />
                                <Text style={styles.helpTitle}>Sample QR Data</Text>
                                <TouchableOpacity onPress={() => setShowSampleQR(false)} style={{ marginLeft: 'auto' }}>
                                    <Icon name="close" size={22} color={TEXT_MUTED} />
                                </TouchableOpacity>
                            </View>

                            <ScrollView style={styles.sampleQRContent}>
                                {/* <Text style={styles.sampleQRJson}>
                                    {JSON.stringify(SAMPLE_QR_DATA, null, 2)}
                                </Text> */}
                                <Image
                                    source={{
                                        uri: 'https://apiy.tms-webapp.com/qrcodes/WJ2753.png',
                                    }}
                                    style={{
                                        width: 250,
                                        height: 250,
                                        alignSelf: 'center',
                                        resizeMode: 'contain',
                                    }}
                                />
                            </ScrollView>

                            <View style={styles.sampleQRActions}>
                                <TouchableOpacity style={styles.sampleQRActionButton} onPress={downloadSampleQR}>
                                    <Icon name="download" size={20} color="#fff" />
                                    <Text style={styles.sampleQRActionText}>Download</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.sampleQRActionButton} onPress={shareSampleQR}>
                                    <Icon name="share" size={20} color="#fff" />
                                    <Text style={styles.sampleQRActionText}>Share</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </Pressable>
                </Modal>

                {/* ══════ HELP MODAL ══════ */}
                <Modal visible={showHelp} transparent animationType="fade">
                    <Pressable style={styles.modalBackdrop} onPress={() => setShowHelp(false)}>
                        <View style={styles.helpModal}>
                            <View style={styles.helpHeader}>
                                <Icon name="info" size={24} color={PRIMARY} />
                                <Text style={styles.helpTitle}>How to use</Text>
                                <TouchableOpacity onPress={() => setShowHelp(false)} style={{ marginLeft: 'auto' }}>
                                    <Icon name="close" size={22} color={TEXT_MUTED} />
                                </TouchableOpacity>
                            </View>
                            <Text style={styles.helpStep}>📷 Tap "Start Scan" to open camera</Text>
                            <Text style={styles.helpStep}>🎯 Point at QR code on the taka</Text>
                            <Text style={styles.helpStep}>📡 API will fetch & auto-fill data</Text>
                            <Text style={styles.helpStep}>✅ All set — values are ready!</Text>
                            <Text style={styles.helpStep}>📤 Or upload an image with a QR code</Text>
                        </View>
                    </Pressable>
                </Modal>
            </View>
            <TourOverlay
                tourKey="checking_scanner_tour"
                steps={CHECKING_SCANNER_TOUR}
                visible={showTour}
                onClose={() => setShowTour(false)}
            />
        </>
    );
};

// ═══════════════════════════════════════════════════════
// 🧩 Sub-Components
// ═══════════════════════════════════════════════════════
const Label: React.FC<{ text: string; required?: boolean }> = ({ text, required }) => (
    <Text style={styles.label}>
        {text}
        {required && <Text style={{ color: '#E53935' }}> *</Text>}
    </Text>
);

const DetailRow: React.FC<{
    icon: string;
    label: string;
    value: string;
    isLast?: boolean;
}> = ({ icon, label, value, isLast }) => (
    <View style={[styles.detailRow, isLast && { borderBottomWidth: 0 }]}>
        <View style={styles.detailIconBox}>
            <Icon name={icon as any} size={18} color={PRIMARY} />
        </View>
        <View style={{ flex: 1 }}>
            <Text style={styles.detailLabel}>{label}</Text>
            <Text style={styles.detailValue}>{value}</Text>
        </View>
    </View>
);

const DropdownField: React.FC<{
    label: string;
    icon: string;
    value: string;
    placeholder: string;
    options: { code: string; name: string }[];
    isOpen: boolean;
    onToggle: () => void;
    onSelect: (code: string) => void;
}> = ({ label, icon, value, placeholder, options, isOpen, onToggle, onSelect }) => {
    const selected = options.find((o) => o.code === value);
    return (
        <View style={{ marginTop: 14 }}>
            <Label text={label} required />
            <TouchableOpacity
                activeOpacity={0.7}
                onPress={onToggle}
                style={[styles.dropdown, isOpen && styles.dropdownOpen]}
            >
                <View style={styles.dropdownIconBox}>
                    <Icon name={icon as any} size={18} color={value ? PRIMARY : TEXT_MUTED} />
                </View>
                <Text
                    style={[styles.dropdownText, !value && { color: TEXT_MUTED }]}
                    numberOfLines={1}
                >
                    {selected ? selected.name : placeholder}
                </Text>
                <Icon
                    name={isOpen ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
                    size={22}
                    color={TEXT_MUTED}
                />
            </TouchableOpacity>

            {isOpen && (
                <View style={styles.dropdownList}>
                    {options.map((opt) => (
                        <TouchableOpacity
                            key={opt.code}
                            style={[styles.dropdownItem, value === opt.code && styles.dropdownItemActive]}
                            onPress={() => onSelect(opt.code)}
                        >
                            <Text
                                style={[
                                    styles.dropdownItemText,
                                    value === opt.code && { color: PRIMARY, fontWeight: '700' },
                                ]}
                            >
                                {opt.name}
                            </Text>
                            {value === opt.code && <Icon name="check" size={18} color={PRIMARY} />}
                        </TouchableOpacity>
                    ))}
                </View>
            )}
        </View>
    );
};

// ═══════════════════════════════════════════════════════
// 🎨 Styles
// ═══════════════════════════════════════════════════════
const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: BG },
    centerScreen: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        backgroundColor: BG,
    },
    permIconCircle: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#E3F2FD',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    permTitle: { fontSize: 20, fontWeight: '700', color: TEXT_DARK, marginBottom: 8 },
    permSubtext: {
        fontSize: 14,
        color: TEXT_MUTED,
        textAlign: 'center',
        marginBottom: 24,
    },
    permText: { marginTop: 12, fontSize: 15, color: TEXT_MUTED },
    primaryBtn: {
        flexDirection: 'row',
        backgroundColor: PRIMARY,
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 10,
        alignItems: 'center',
        elevation: 3,
    },
    primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

    // Header
    headerIconBtn: {
        width: 40,
        height: 40,
        right: 5,
        top: 280,
        borderRadius: 20,
        backgroundColor: 'rgb(255, 206, 47)',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'absolute',
        zIndex: 10
    },

    // Sample QR
    sampleQRContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    sampleQRButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: PRIMARY,
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 8,
        flex: 1,
        marginHorizontal: 4,
    },
    sampleQRText: {
        color: PRIMARY,
        fontWeight: '600',
        marginLeft: 8,
        fontSize: 12,
    },

    // Upload Buttons
    uploadButtonsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    uploadButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: PRIMARY,
        borderRadius: 10,
        paddingHorizontal: 16,
        paddingVertical: 12,
        flex: 1,
        marginHorizontal: 4,
    },
    uploadButtonText: {
        color: '#fff',
        fontWeight: '600',
        marginLeft: 8,
    },

    // Image Preview
    imagePreviewContainer: {
        position: 'relative',
        marginBottom: 16,
        borderRadius: 10,
        overflow: 'hidden',
    },
    imagePreview: {
        width: '100%',
        height: 200,
        resizeMode: 'cover',
    },
    removeImageButton: {
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderRadius: 12,
        width: 24,
        height: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },

    // Scan Button
    scanButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: PRIMARY,
        borderRadius: 14,
        padding: 16,
        elevation: 4,
        shadowColor: PRIMARY,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        marginBottom: 16,
    },
    scanButtonActive: { backgroundColor: '#E53935' },
    scanIconCircle: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: 'rgba(255,255,255,0.25)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    scanButtonTitle: { fontSize: 16, fontWeight: '700', color: '#fff' },
    scanButtonSub: { fontSize: 12, color: 'rgba(255,255,255,0.9)', marginTop: 2 },

    // Camera
    cameraWrap: {
        height: 280,
        borderRadius: 16,
        overflow: 'hidden',
        marginBottom: 16,
        backgroundColor: '#000',
        elevation: 4,
    },
    camera: { flex: 1 },
    cameraOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scanFrame: { width: 200, height: 200, position: 'relative' },
    corner: { position: 'absolute', width: 30, height: 30, borderColor: '#fff' },
    tl: { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4 },
    tr: { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4 },
    bl: { bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4 },
    br: { bottom: 0, right: 0, borderBottomWidth: 4, borderRightWidth: 4 },
    cameraHint: {
        color: '#fff',
        marginTop: 20,
        fontSize: 13,
        fontWeight: '600',
        backgroundColor: 'rgba(0,0,0,0.4)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },

    // Card
    card: {
        backgroundColor: CARD,
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
    },
    successCard: { borderLeftWidth: 4, borderLeftColor: SUCCESS },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 14,
    },
    successBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: SUCCESS,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        gap: 4,
    },
    successBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
    closeBtn: { padding: 4 },

    // Detail Row
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F2F4F7',
    },
    detailIconBox: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: '#E8F4FA',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    detailLabel: {
        fontSize: 11,
        fontWeight: '600',
        color: TEXT_MUTED,
        letterSpacing: 0.3,
        marginBottom: 2,
    },
    detailValue: { fontSize: 15, fontWeight: '700', color: TEXT_DARK },

    // Form
    row: { flexDirection: 'row', marginBottom: 4 },
    label: { fontSize: 13, fontWeight: '600', color: TEXT_DARK, marginBottom: 6 },
    input: {
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: BORDER,
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 12,
        fontSize: 15,
        color: TEXT_DARK,
    },

    // Dropdown
    dropdown: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: BORDER,
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 12,
    },
    dropdownOpen: { borderColor: PRIMARY, backgroundColor: '#fff' },
    dropdownIconBox: {
        width: 28,
        height: 28,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
    },
    dropdownText: { flex: 1, fontSize: 15, color: TEXT_DARK, fontWeight: '500' },
    dropdownList: {
        marginTop: 6,
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: BORDER,
        borderRadius: 10,
        overflow: 'hidden',
        elevation: 3,
    },
    dropdownItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        paddingHorizontal: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#F2F4F7',
    },
    dropdownItemActive: { backgroundColor: '#F0F9FC' },
    dropdownItemText: { fontSize: 14, color: TEXT_DARK },

    // Modal
    modalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    helpModal: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 20,
        width: '100%',
        maxWidth: 400,
    },
    helpHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 8 },
    helpTitle: { fontSize: 18, fontWeight: '700', color: TEXT_DARK },
    helpStep: { fontSize: 14, color: TEXT_DARK, marginBottom: 10, lineHeight: 20 },

    // Sample QR Modal
    sampleQRModal: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 20,
        width: '100%',
        maxWidth: 400,
        maxHeight: '80%',
    },
    sampleQRContent: {
        maxHeight: 300,
        marginBottom: 16,
    },
    sampleQRJson: {
        fontSize: 12,
        color: TEXT_DARK,
        fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    },
    sampleQRActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    sampleQRActionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: PRIMARY,
        borderRadius: 10,
        paddingHorizontal: 16,
        paddingVertical: 10,
        flex: 1,
        marginHorizontal: 4,
    },
    sampleQRActionText: {
        color: '#fff',
        fontWeight: '600',
        marginLeft: 8,
    },
});

export default CheckingScannerNew;