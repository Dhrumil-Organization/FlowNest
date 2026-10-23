// FILE: src/components/RollCutScanner/ScanCamera.tsx
// QR camera in a full-screen modal (expo-camera). Permission is asked only when the camera opens.
import { T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import React, { useEffect, useRef } from 'react';
import { Modal, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type Props = { visible: boolean; onClose: () => void; onScan: (value: string) => void };

export default function ScanCamera({ visible, onClose, onScan }: Props) {
  const [perm, requestPerm] = useCameraPermissions();
  const lock = useRef(false);

  useEffect(() => {
    if (visible) lock.current = false;
  }, [visible]);
  useEffect(() => {
    if (visible && perm && !perm.granted && perm.canAskAgain) void requestPerm();
  }, [visible, perm?.status]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={st.screen}>
        <View style={st.top}>
          <View style={{ flex: 1 }}>
            <Text style={st.title}>Scan QR</Text>
            <Text style={st.sub}>Keep the taka QR inside the frame</Text>
          </View>
          <TouchableOpacity style={st.close} onPress={onClose} accessibilityLabel="Close camera">
            <Icon name="close" size={22} color="#fff" />
          </TouchableOpacity>
        </View>

        {perm?.granted ? (
          <View style={{ flex: 1 }}>
            <CameraView
              style={{ flex: 1 }}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
              onBarcodeScanned={({ data }: { data: string }) => {
                if (lock.current) return;
                lock.current = true;
                onScan(data || '');
              }}
            />
            <View pointerEvents="none" style={st.frameWrap}>
              <View style={st.frame}>
                <View style={[st.corner, { top: -2, left: -2, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 18 }]} />
                <View style={[st.corner, { top: -2, right: -2, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 18 }]} />
                <View style={[st.corner, { bottom: -2, left: -2, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: 18 }]} />
                <View style={[st.corner, { bottom: -2, right: -2, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: 18 }]} />
              </View>
            </View>
          </View>
        ) : (
          <View style={st.noCam}>
            <Icon name="no-photography" size={40} color="#fff" />
            <Text style={st.noCamText}>Camera permission is required to scan</Text>
            <TouchableOpacity style={st.grant} onPress={() => requestPerm()}>
              <Text style={st.grantText}>Allow camera</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={st.bottom}>
          <TouchableOpacity style={st.stop} onPress={onClose}>
            <Text style={st.stopText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const SIZE = 250;
const st = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#000' },
  top: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 16, paddingTop: Platform.OS === 'web' ? 16 : 46 },
  title: { fontSize: 18, fontWeight: '900', color: '#fff' },
  sub: { fontSize: 12.5, fontWeight: '600', color: '#ffffffAA', marginTop: 2 },
  close: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#ffffff22', alignItems: 'center', justifyContent: 'center' },
  frameWrap: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  frame: { width: SIZE, height: SIZE, borderRadius: 20, backgroundColor: 'transparent' },
  corner: { position: 'absolute', width: 44, height: 44, borderColor: T.copper },
  noCam: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, padding: 24 },
  noCamText: { color: '#fff', fontSize: 14, fontWeight: '700', textAlign: 'center' },
  grant: { height: 44, paddingHorizontal: 22, borderRadius: 12, backgroundColor: T.copper, alignItems: 'center', justifyContent: 'center' },
  grantText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  bottom: { padding: 16 },
  stop: { height: 48, borderRadius: 12, backgroundColor: '#ffffff1A', alignItems: 'center', justifyContent: 'center' },
  stopText: { color: '#fff', fontSize: 15, fontWeight: '800' },
});
