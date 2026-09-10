import AppAlert from '@/common/utils/appAlert';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import Icon from '@expo/vector-icons/MaterialIcons';
import { BarcodeScanningResult, CameraView, useCameraPermissions } from 'expo-camera';

type Props = {
    visible: boolean;
    title?: string;
    subtitle?: string;
    onClose: () => void;
    onScanned: (value: string) => void;
};

const FabricQrScannerModal: React.FC<Props> = ({
    visible,
    title = 'Scan Fabric QR',
    subtitle = 'Place the taka QR inside the frame',
    onClose,
    onScanned,
}) => {
    const [permission, requestPermission] = useCameraPermissions();
    const [cameraReady, setCameraReady] = useState(false);
    const [cameraKey, setCameraKey] = useState(0);
    const scanLock = useRef(false);

    useEffect(() => {
        if (!visible) {
            scanLock.current = false;
            setCameraReady(false);
            return;
        }

        scanLock.current = false;
        setCameraReady(false);
        setCameraKey((value) => value + 1);
    }, [visible]);

    const ensurePermission = async () => {
        try {
            const result = permission?.granted ? permission : await requestPermission();
            if (!result?.granted) {
                AppAlert.alert('Camera Permission Required', 'Allow camera access to scan fabric QR codes.');
            }
        } catch (error) {
            AppAlert.alert('Camera Error', 'Unable to request camera permission.');
        }
    };

    useEffect(() => {
        if (visible && !permission?.granted) {
            ensurePermission();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [visible]);

    const handleScan = (result: BarcodeScanningResult) => {
        if (scanLock.current) return;
        const value = String(result?.data || '').trim();
        if (!value) return;

        scanLock.current = true;
        onScanned(value);
    };

    const restartCamera = () => {
        scanLock.current = false;
        setCameraReady(false);
        setCameraKey((value) => value + 1);
    };

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={onClose} style={styles.iconButton} activeOpacity={0.8}>
                        <Icon name="arrow-back" size={25} color="#FFFFFF" />
                    </TouchableOpacity>
                    <View style={styles.headerTextWrap}>
                        <Text style={styles.title}>{title}</Text>
                        <Text style={styles.subtitle}>{subtitle}</Text>
                    </View>
                    <TouchableOpacity onPress={restartCamera} style={styles.iconButton} activeOpacity={0.8}>
                        <Icon name="refresh" size={24} color="#FFFFFF" />
                    </TouchableOpacity>
                </View>

                <View style={styles.cameraArea}>
                    {permission?.granted ? (
                        <CameraView
                            key={cameraKey}
                            style={styles.camera}
                            facing="back"
                            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                            onCameraReady={() => setCameraReady(true)}
                            onBarcodeScanned={cameraReady ? handleScan : undefined}
                        />
                    ) : (
                        <View style={styles.permissionCard}>
                            <Icon name="photo-camera" size={46} color="#087FA3" />
                            <Text style={styles.permissionTitle}>Camera access is required</Text>
                            <Text style={styles.permissionText}>The scanner only reads QR codes. Nothing is saved until you confirm the stock action.</Text>
                            <TouchableOpacity style={styles.permissionButton} onPress={ensurePermission} activeOpacity={0.85}>
                                <Text style={styles.permissionButtonText}>Allow Camera</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {permission?.granted && (
                        <View pointerEvents="none" style={styles.overlay}>
                            <View style={styles.scanBox}>
                                <View style={[styles.corner, styles.cornerTL]} />
                                <View style={[styles.corner, styles.cornerTR]} />
                                <View style={[styles.corner, styles.cornerBL]} />
                                <View style={[styles.corner, styles.cornerBR]} />
                            </View>
                            <View style={styles.scanHint}>
                                {!cameraReady && <ActivityIndicator size="small" color="#FFFFFF" />}
                                <Text style={styles.scanHintText}>{cameraReady ? 'Ready to scan' : 'Starting camera…'}</Text>
                            </View>
                        </View>
                    )}
                </View>

                <View style={styles.footer}>
                    <Icon name="verified-user" size={18} color="#087FA3" />
                    <Text style={styles.footerText}>Scan only identifies the taka. Verification or manual stock entry still requires your confirmation.</Text>
                </View>
            </SafeAreaView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#071A20' },
    header: { minHeight: 74, backgroundColor: '#087FA3', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10 },
    iconButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.14)' },
    headerTextWrap: { flex: 1, paddingHorizontal: 12 },
    title: { color: '#FFFFFF', fontSize: 18, fontWeight: '900' },
    subtitle: { color: '#D6F1F7', fontSize: 12, marginTop: 2 },
    cameraArea: { flex: 1, margin: 12, borderRadius: 20, overflow: 'hidden', backgroundColor: '#000000' },
    camera: { flex: 1 },
    overlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
    scanBox: { width: '72%', aspectRatio: 1, maxWidth: 320, position: 'relative' },
    corner: { position: 'absolute', width: 42, height: 42, borderColor: '#FFFFFF' },
    cornerTL: { left: 0, top: 0, borderLeftWidth: 4, borderTopWidth: 4, borderTopLeftRadius: 12 },
    cornerTR: { right: 0, top: 0, borderRightWidth: 4, borderTopWidth: 4, borderTopRightRadius: 12 },
    cornerBL: { left: 0, bottom: 0, borderLeftWidth: 4, borderBottomWidth: 4, borderBottomLeftRadius: 12 },
    cornerBR: { right: 0, bottom: 0, borderRightWidth: 4, borderBottomWidth: 4, borderBottomRightRadius: 12 },
    scanHint: { position: 'absolute', bottom: 22, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(0,0,0,0.58)', paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20 },
    scanHintText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
    footer: { minHeight: 72, backgroundColor: '#F5FBFC', paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
    footerText: { flex: 1, color: '#36545C', fontSize: 12, lineHeight: 17 },
    permissionCard: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F7FBFC', padding: 28 },
    permissionTitle: { marginTop: 14, color: '#173B45', fontSize: 18, fontWeight: '900', textAlign: 'center' },
    permissionText: { marginTop: 8, color: '#63757C', fontSize: 13, lineHeight: 19, textAlign: 'center', maxWidth: 360 },
    permissionButton: { marginTop: 18, minHeight: 46, paddingHorizontal: 22, borderRadius: 12, backgroundColor: '#087FA3', alignItems: 'center', justifyContent: 'center' },
    permissionButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
});

export default FabricQrScannerModal;
