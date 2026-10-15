// FILE: src/components/PackingAutomationNEW/ScanSheet.tsx
// Camera scan of the route card barcode / QR (phones and tablets).
// Needs expo-camera:  npx expo install expo-camera
// Hardware scanners that type like a keyboard need none of this: they type
// straight into the Route card field, which looks the card up on Enter.
import { T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import React, { useEffect, useRef } from 'react';
import { Modal, Text, TouchableOpacity, View } from 'react-native';
import { Btn } from './ui';

export default function ScanSheet({ open, onClose, onScanned }: { open: boolean; onClose: () => void; onScanned: (code: string) => void }) {
  const [perm, requestPerm] = useCameraPermissions();
  const done = useRef(false);

  useEffect(() => {
    if (!open) return;
    done.current = false;
    if (perm && !perm.granted && perm.canAskAgain) requestPerm();
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Modal visible={open} animationType="slide" onRequestClose={onClose} presentationStyle="fullScreen">
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        {perm?.granted ? (
          <CameraView
            style={{ flex: 1 }}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['qr', 'code128', 'code39', 'ean13', 'ean8', 'itf14', 'datamatrix'] }}
            onBarcodeScanned={({ data }: { data: string }) => {
              if (done.current || !data) return; // the camera fires many times per code
              done.current = true;
              onScanned(String(data).trim());
            }}
          />
        ) : (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16 }}>
            <Icon name="photo-camera" size={48} color="#fff" />
            <Text style={{ color: '#fff', fontSize: 16, textAlign: 'center' }}>
              {perm && !perm.canAskAgain
                ? 'Camera access is turned off for this app. Turn it on in the phone settings, or type the route card number.'
                : 'Allow camera access to scan route cards.'}
            </Text>
            {perm?.canAskAgain !== false ? <Btn label="Allow camera" kind="copper" onPress={requestPerm} style={{ paddingHorizontal: 24 }} /> : null}
          </View>
        )}
        <View pointerEvents="none" style={{ position: 'absolute', top: '30%', left: '12%', right: '12%', height: 180, borderWidth: 3, borderColor: T.copper, borderRadius: 16 }} />
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, paddingTop: 48, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity onPress={onClose} accessibilityRole="button" accessibilityLabel="Close scanner"
            style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="close" size={26} color="#fff" />
          </TouchableOpacity>
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '800', marginLeft: 12 }}>Scan route card</Text>
        </View>
      </View>
    </Modal>
  );
}
