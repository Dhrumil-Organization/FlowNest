// FILE: src/screens/samplingHub/SmpPdfPreview.tsx
// The sticker exactly as the print server draws it: POST PRINTSTICKER printype 'Preview' → Node → PDF (base64).
//   Web              the PDF inside the sheet (+ open in a new tab / download)
//   Android / iPhone "Open sticker PDF" → saved to the cache and opened in the phone's PDF viewer
// (Same handling as the Checking Scanner sticker preview — kept as its own file so the Sampling Hub does not depend
// on that module's temporary preview.)
import { T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

type Props = { visible: boolean; title: string; printer: string; loading: boolean; error: string; pdfBase64: string; onRetry: () => void; onClose: () => void };

function useBlobUrl(b64: string) {
  const url = useMemo(() => {
    if (Platform.OS !== 'web' || !b64) return '';
    try {
      const bin = atob(b64.replace(/^data:application\/pdf;base64,/, ''));
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      return URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
    } catch {
      return '';
    }
  }, [b64]);
  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);
  return url;
}

const Btn = ({ label, icon, onPress, accent, busy }: { label: string; icon: string; onPress: () => void; accent?: boolean; busy?: boolean }) => (
  <Pressable onPress={onPress} disabled={busy} style={[s.btn, accent ? { backgroundColor: T.copper, borderColor: T.copper } : null]} accessibilityRole="button" accessibilityLabel={label}>
    {busy ? <ActivityIndicator size="small" color={accent ? '#fff' : T.nav} /> : <Icon name={icon as any} size={16} color={accent ? '#fff' : T.nav} />}
    <Text style={[s.btnT, accent ? { color: '#fff' } : null]}>{label}</Text>
  </Pressable>
);

export function SmpPdfPreview({ visible, title, printer, loading, error, pdfBase64, onRetry, onClose }: Props) {
  const { width, height } = useWindowDimensions();
  const url = useBlobUrl(pdfBase64);
  const [opening, setOpening] = useState(false);
  const [openErr, setOpenErr] = useState('');
  useEffect(() => { if (!visible) setOpenErr(''); }, [visible]);

  const openNative = async () => {
    if (!pdfBase64) return;
    setOpening(true);
    setOpenErr('');
    try {
      const path = `${FileSystem.cacheDirectory}sample-sticker-${Date.now()}.pdf`;
      await FileSystem.writeAsStringAsync(path, pdfBase64.replace(/^data:application\/pdf;base64,/, ''), { encoding: FileSystem.EncodingType.Base64 });
      if (!(await Sharing.isAvailableAsync())) throw new Error('No PDF viewer / sharing on this device.');
      await Sharing.shareAsync(path, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: 'Sticker preview' });
    } catch (e: any) {
      setOpenErr(e?.message || 'Could not open the PDF.');
    } finally {
      setOpening(false);
    }
  };
  const openTab = () => { if (url && typeof window !== 'undefined') window.open(url, '_blank'); };
  const download = () => {
    if (!url || typeof document === 'undefined') return;
    const a = document.createElement('a');
    a.href = url;
    a.download = `sticker-${title.replace(/[^\w-]+/g, '_') || 'preview'}.pdf`;
    a.click();
  };
  const boxW = Math.min(width - 24, 560);
  const boxH = Math.min(height - 60, 760);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={s.backdrop}>
        <View style={[s.box, { width: boxW, maxHeight: boxH }]} testID="pdf-preview">
          <View style={s.head}>
            <View style={{ flex: 1 }}>
              <Text style={s.eyebrow}>STICKER PREVIEW · FROM THE PRINT SERVER</Text>
              <Text style={s.title} numberOfLines={1}>{title}</Text>
              {printer ? <Text style={s.muted2}>Printer: {printer}</Text> : null}
            </View>
            <Pressable onPress={onClose} style={s.close} accessibilityLabel="Close preview"><Icon name="close" size={20} color={T.ink} /></Pressable>
          </View>
          {loading ? (
            <View style={s.center}><ActivityIndicator size="large" color={T.copper} /><Text style={s.muted}>Making the sticker preview…</Text></View>
          ) : error ? (
            <View style={s.center}>
              <Icon name="error-outline" size={36} color={T.red} />
              <Text style={[s.muted, { color: T.red }]}>{error}</Text>
              <Btn label="Try again" icon="refresh" onPress={onRetry} />
            </View>
          ) : pdfBase64 ? (
            Platform.OS === 'web' ? (
              <View style={{ flex: 1, minHeight: Math.min(boxH - 150, 520) }}>
                {url
                  ? React.createElement('iframe' as any, { src: url, title: 'Sticker preview', style: { width: '100%', height: '100%', minHeight: Math.min(boxH - 150, 520), border: 0, borderRadius: 8, background: '#fff' } })
                  : <Text style={[s.muted, { color: T.red }]}>The preview PDF could not be read.</Text>}
                <View style={s.row}>
                  <Btn label="Open in new tab" icon="open-in-new" onPress={openTab} />
                  <Btn label="Download PDF" icon="file-download" onPress={download} />
                </View>
              </View>
            ) : (
              <View style={s.center}>
                <Icon name="picture-as-pdf" size={40} color={T.copper} />
                <Text style={s.muted}>The sticker is ready — open it in the phone's PDF viewer.</Text>
                <Btn label="Open sticker PDF" icon="open-in-new" accent busy={opening} onPress={() => void openNative()} />
                {openErr ? <Text style={[s.muted, { color: T.red }]}>{openErr}</Text> : null}
              </View>
            )
          ) : (
            <View style={s.center}><Text style={s.muted}>No preview.</Text></View>
          )}
          <Text style={s.note}>This is the label exactly as the printer gets it. Nothing is printed from here.</Text>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.55)', alignItems: 'center', justifyContent: 'center', padding: 12 },
  box: { backgroundColor: T.surface, borderRadius: 16, padding: 14, gap: 10, flex: 1 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  eyebrow: { color: T.copper, fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  title: { color: T.ink, fontSize: 16, fontWeight: '800' },
  close: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: T.sub },
  center: { flex: 1, minHeight: 220, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 8 },
  muted: { color: T.muted, fontSize: 13, lineHeight: 19, textAlign: 'center' },
  muted2: { color: T.muted, fontSize: 11.5 },
  row: { flexDirection: 'row', gap: 8, marginTop: 8 },
  note: { color: T.muted, fontSize: 11, textAlign: 'center' },
  btn: { flex: 1, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: T.border, borderRadius: 9, paddingVertical: 9, paddingHorizontal: 12, backgroundColor: '#fff' },
  btnT: { fontSize: 12.5, fontWeight: '800', color: T.nav },
});
