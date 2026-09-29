// FILE: src/components/StockVerificationNEW/QrScanSheet.tsx
// Full-screen QR scanner (NEW theme) — port of the legacy FabricQrScannerModal:
// camera permission handling, one-shot scan lock, restart, corner frame.
// Added: a "type / paste" row so a taka no. or QR text can be entered by hand
// (web / damaged label); it goes through exactly the same handler as a scan.
import AppAlert from '@/common/utils/appAlert';
import { T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import { BarcodeScanningResult, CameraView, useCameraPermissions } from 'expo-camera';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

type Props = {
  visible: boolean;
  title: string;
  subtitle: string;
  footer: string;
  manualPlaceholder: string;
  onClose: () => void;
  onScanned: (value: string) => void;
};

export default function QrScanSheet({ visible, title, subtitle, footer, manualPlaceholder, onClose, onScanned }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const [ready, setReady] = useState(false);
  const [camKey, setCamKey] = useState(0);
  const [typed, setTyped] = useState('');
  const lock = useRef(false);

  useEffect(() => {
    lock.current = false;
    setReady(false);
    setTyped('');
    if (visible) setCamKey((v) => v + 1);
  }, [visible]);

  const ensurePermission = async () => {
    try {
      const r = permission?.granted ? permission : await requestPermission();
      if (!r?.granted) AppAlert.alert('Camera Permission Required', 'Allow camera access to scan QR codes, or type the number below.');
    } catch (_) {
      AppAlert.alert('Camera Error', 'Unable to request camera permission.');
    }
  };

  useEffect(() => {
    if (visible && permission && !permission.granted && permission.canAskAgain !== false) ensurePermission();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, permission?.granted]);

  const handleScan = (res: BarcodeScanningResult) => {
    if (lock.current) return;
    const v = String(res?.data || '').trim();
    if (!v) return;
    lock.current = true;
    onScanned(v);
  };

  const submitTyped = () => {
    const v = typed.trim();
    if (!v) return;
    onScanned(v);
  };

  const restart = () => {
    lock.current = false;
    setReady(false);
    setCamKey((v) => v + 1);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <SafeAreaView style={st.root}>
        <View style={st.header}>
          <TouchableOpacity onPress={onClose} style={st.iconBtn} accessibilityLabel="Close scanner">
            <Icon name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1, paddingHorizontal: 12 }}>
            <Text style={st.eyebrow}>SCAN</Text>
            <Text style={st.title} numberOfLines={1}>{title}</Text>
            <Text style={st.sub} numberOfLines={1}>{subtitle}</Text>
          </View>
          <TouchableOpacity onPress={restart} style={st.iconBtn} accessibilityLabel="Restart camera">
            <Icon name="refresh" size={22} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={st.camArea}>
          {permission?.granted ? (
            <CameraView
              key={camKey}
              style={{ flex: 1 }}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
              onCameraReady={() => setReady(true)}
              onBarcodeScanned={ready ? handleScan : undefined}
            />
          ) : (
            <View style={st.permCard}>
              <Icon name="photo-camera" size={44} color={T.copper} />
              <Text style={st.permTitle}>Camera access is required</Text>
              <Text style={st.permText}>The scanner only reads QR codes. Nothing is saved until you confirm.</Text>
              <TouchableOpacity style={st.permBtn} onPress={ensurePermission}>
                <Text style={st.permBtnText}>Allow camera</Text>
              </TouchableOpacity>
            </View>
          )}
          {permission?.granted ? (
            <View pointerEvents="none" style={st.overlay}>
              <View style={st.box}>
                <View style={[st.corner, st.tl]} />
                <View style={[st.corner, st.tr]} />
                <View style={[st.corner, st.bl]} />
                <View style={[st.corner, st.br]} />
              </View>
              <View style={st.hint}>
                {!ready ? <ActivityIndicator size="small" color="#fff" /> : <Icon name="qr-code-scanner" size={16} color="#fff" />}
                <Text style={st.hintText}>{ready ? 'Ready to scan' : 'Starting camera…'}</Text>
              </View>
            </View>
          ) : null}
        </View>

        <View style={st.typeRow}>
          <TextInput
            value={typed}
            onChangeText={setTyped}
            placeholder={manualPlaceholder}
            placeholderTextColor={T.muted}
            style={st.typeInput}
            autoCapitalize="characters"
            returnKeyType="search"
            onSubmitEditing={submitTyped}
          />
          <TouchableOpacity style={[st.typeBtn, !typed.trim() && { opacity: 0.45 }]} onPress={submitTyped} disabled={!typed.trim()}>
            <Icon name="arrow-forward" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
        <View style={st.footer}>
          <Icon name="verified-user" size={16} color={T.copper} />
          <Text style={st.footerText}>{footer}</Text>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.nav },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.12)' },
  eyebrow: { color: T.copper, fontSize: 10, fontWeight: '800', letterSpacing: 1.2 },
  title: { color: '#fff', fontSize: 17, fontWeight: '800' },
  sub: { color: 'rgba(255,255,255,0.65)', fontSize: 12, marginTop: 1 },
  camArea: { flex: 1, marginHorizontal: 12, borderRadius: 18, overflow: 'hidden', backgroundColor: '#000' },
  overlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  box: { width: '70%', aspectRatio: 1, maxWidth: 300 },
  corner: { position: 'absolute', width: 40, height: 40, borderColor: T.copper },
  tl: { left: 0, top: 0, borderLeftWidth: 4, borderTopWidth: 4, borderTopLeftRadius: 12 },
  tr: { right: 0, top: 0, borderRightWidth: 4, borderTopWidth: 4, borderTopRightRadius: 12 },
  bl: { left: 0, bottom: 0, borderLeftWidth: 4, borderBottomWidth: 4, borderBottomLeftRadius: 12 },
  br: { right: 0, bottom: 0, borderRightWidth: 4, borderBottomWidth: 4, borderBottomRightRadius: 12 },
  hint: { position: 'absolute', bottom: 20, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18 },
  hintText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  permCard: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: T.sub, padding: 28 },
  permTitle: { marginTop: 12, color: T.nav, fontSize: 17, fontWeight: '800', textAlign: 'center' },
  permText: { marginTop: 6, color: T.muted, fontSize: 13, lineHeight: 19, textAlign: 'center', maxWidth: 360 },
  permBtn: { marginTop: 16, height: 44, paddingHorizontal: 22, borderRadius: 10, backgroundColor: T.nav, alignItems: 'center', justifyContent: 'center' },
  permBtnText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  typeRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingTop: 12 },
  typeInput: { flex: 1, height: 46, borderRadius: 10, backgroundColor: '#fff', paddingHorizontal: 14, fontSize: 15, color: T.ink },
  typeBtn: { width: 46, height: 46, borderRadius: 10, backgroundColor: T.copper, alignItems: 'center', justifyContent: 'center' },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 12 },
  footerText: { flex: 1, color: 'rgba(255,255,255,0.7)', fontSize: 12, lineHeight: 17 },
});
