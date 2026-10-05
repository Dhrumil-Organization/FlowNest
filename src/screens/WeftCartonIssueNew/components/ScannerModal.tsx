import React, { useEffect, useRef } from 'react';
import { Modal, View, Text, TouchableOpacity } from 'react-native';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import Icon from '@expo/vector-icons/MaterialIcons';
import { s, C } from '../styles';

type Props = { visible: boolean; onScanned: (raw: string) => void; onClose: () => void };

/** Camera scanner (expo-camera, same library as WeftIssueItemDrawer). */
const ScannerModal = ({ visible, onScanned, onClose }: Props) => {
    const [permission, requestPermission] = useCameraPermissions();
    const lock = useRef(false);

    useEffect(() => {
        if (visible) {
            lock.current = false;
            if (permission && !permission.granted) requestPermission();
        }
    }, [visible]);

    const handle = (r: BarcodeScanningResult) => {
        if (lock.current) return;
        lock.current = true; // one scan per open
        onScanned(r?.data || '');
    };

    return (
        <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
            <View style={{ flex: 1, backgroundColor: '#000' }}>
                {permission?.granted ? (
                    <CameraView
                        style={s.camera}
                        facing="back"
                        onBarcodeScanned={handle}
                        barcodeScannerSettings={{ barcodeTypes: ['qr', 'code128', 'code39', 'ean13'] }}
                    />
                ) : (
                    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
                        <Text style={{ color: '#fff', textAlign: 'center', marginBottom: 12 }}>Camera access is needed to scan carton labels.</Text>
                        <TouchableOpacity style={[s.btn, s.btnPrimary]} onPress={requestPermission}>
                            <Text style={s.btnPrimaryText}>Allow camera</Text>
                        </TouchableOpacity>
                    </View>
                )}
                {permission?.granted && (
                    <View pointerEvents="none" style={s.scanFrame}>
                        <View style={[s.corner, { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 14 }]} />
                        <View style={[s.corner, { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 14 }]} />
                        <View style={[s.corner, { bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: 14 }]} />
                        <View style={[s.corner, { bottom: 0, right: 0, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: 14 }]} />
                    </View>
                )}
                <Text style={{ position: 'absolute', top: 54, left: 20, color: '#fff', fontSize: 17, fontWeight: '700' }}>Scan carton</Text>
                <TouchableOpacity
                    onPress={onClose}
                    style={{ position: 'absolute', top: 48, right: 20, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20, padding: 8 }}
                    accessibilityLabel="Close scanner"
                >
                    <Icon name="close" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={{ position: 'absolute', bottom: 60, alignSelf: 'center', color: '#fff', backgroundColor: 'rgba(0,0,0,0.45)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16, overflow: 'hidden' }}>Point at the carton label</Text>
            </View>
        </Modal>
    );
};

export default ScannerModal;
