// FILE: src/components/NewAccountRequestNEW/PdfStep.tsx
// In-screen PDF preview step. Legacy did router.push('/(tabs)/pdf-view', { pdfUrl, title }) which renders
// Shared/PdfViewerScreenMain.tsx; NEW modules must not navigate to legacy routes, so that viewer's behaviour
// is reproduced here as a step: preview (iframe on web, Google viewer in a WebView on Android, direct WebView
// on iOS), Download and Share with the same alert messages. No HTTP API call lives here.
import { AppAlert } from '@/common/utils/appAlert';
import { T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { WebView } from 'react-native-webview';

const isWeb = Platform.OS === 'web';

export default function PdfStep({ pdfUrl, title, onBack }: { pdfUrl: string; title: string; onBack: () => void }) {
  const [downloading, setDownloading] = useState(false);
  const safeName = useMemo(() => title.replace(/[^a-zA-Z0-9]/g, '_'), [title]);

  const previewUrl = useMemo(() => {
    if (!pdfUrl) return '';
    if (isWeb) return pdfUrl;
    if (Platform.OS === 'android') return `https://docs.google.com/viewer?url=${encodeURIComponent(pdfUrl)}&embedded=true`;
    return pdfUrl;
  }, [pdfUrl]);

  const handleShare = async () => {
    try {
      if (!pdfUrl) { AppAlert.alert('Error', 'PDF URL not found'); return; }
      if (isWeb) {
        const nav: any = typeof navigator !== 'undefined' ? navigator : null;
        if (nav?.share) {
          try { await nav.share({ title, url: pdfUrl }); return; } catch {}
        }
        if (nav?.clipboard?.writeText) {
          await nav.clipboard.writeText(pdfUrl);
          AppAlert.alert('Copied', 'PDF link copied to clipboard');
        } else AppAlert.alert('Info', pdfUrl);
        return;
      }
      const ok = await Sharing.isAvailableAsync();
      if (!ok) { AppAlert.alert('Error', 'Sharing not available'); return; }
      const localUri = `${FileSystem.cacheDirectory}${safeName}_${Date.now()}.pdf`;
      const { uri } = await FileSystem.downloadAsync(pdfUrl, localUri);
      await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: title, UTI: 'com.adobe.pdf' });
    } catch (err) {
      console.log('SHARE ERROR =>', err);
      AppAlert.alert('Error', 'Unable to share PDF');
    }
  };

  const handleDownload = async () => {
    if (!pdfUrl) { AppAlert.alert('Error', 'PDF URL not found'); return; }
    if (isWeb) {
      try {
        setDownloading(true);
        const doc: any = (globalThis as any).document;
        const link = doc.createElement('a');
        link.href = pdfUrl;
        link.download = `${safeName}.pdf`;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        doc.body.appendChild(link);
        link.click();
        doc.body.removeChild(link);
      } finally {
        setDownloading(false);
      }
      return;
    }
    try {
      setDownloading(true);
      const localUri = `${FileSystem.cacheDirectory}${safeName}_${Date.now()}.pdf`;
      const { uri, status } = await FileSystem.downloadAsync(pdfUrl, localUri);
      if (status !== 200) throw new Error(`Server returned ${status}`);
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: `${title} — Save or Open`, UTI: 'com.adobe.pdf' });
      } else {
        AppAlert.alert('Downloaded', `Saved to:\n${uri}`);
      }
    } catch (err: any) {
      console.log('DOWNLOAD ERROR =>', err);
      AppAlert.alert('Error', err?.message || 'Unable to download PDF');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <View style={p.root}>
      <View style={p.bar}>
        <TouchableOpacity style={p.back} onPress={onBack} accessibilityRole="button" accessibilityLabel="Back to requests">
          <Icon name="arrow-back" size={20} color={T.nav} />
          <Text style={p.backText} numberOfLines={1}>Requests</Text>
        </TouchableOpacity>
        <Text style={p.title} numberOfLines={1}>{title}</Text>
        <TouchableOpacity style={p.tool} onPress={handleDownload} disabled={downloading} accessibilityRole="button" accessibilityLabel="Download PDF">
          {downloading ? <ActivityIndicator size="small" color={T.copper} /> : <Icon name="download" size={20} color={T.nav} />}
        </TouchableOpacity>
        <TouchableOpacity style={p.tool} onPress={handleShare} accessibilityRole="button" accessibilityLabel="Share PDF">
          <Icon name="share" size={20} color={T.nav} />
        </TouchableOpacity>
      </View>

      <View style={p.frame}>
        {previewUrl ? (
          isWeb ? (
            React.createElement('iframe', {
              src: previewUrl,
              title: 'PDF Preview',
              style: { width: '100%', height: '100%', border: 'none', display: 'block' },
            })
          ) : (
            <WebView
              originWhitelist={['*']}
              source={{ uri: previewUrl }}
              style={p.pdf}
              startInLoadingState
              javaScriptEnabled
              domStorageEnabled
              allowFileAccess
              allowUniversalAccessFromFileURLs
              allowsInlineMediaPlayback
              mixedContentMode="always"
              onError={(e: any) => {
                console.log('PDF ERROR =>', e.nativeEvent);
                AppAlert.alert('Error', 'Failed to load PDF');
              }}
              renderLoading={() => (
                <View style={p.loader}>
                  <ActivityIndicator size="large" color={T.copper} />
                  <Text style={p.loaderText}>Loading PDF...</Text>
                </View>
              )}
            />
          )
        ) : (
          <View style={p.loader}>
            <Icon name="picture-as-pdf" size={34} color={T.muted} />
            <Text style={p.loaderText}>Unable to load PDF</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const p = StyleSheet.create({
  root: { ...StyleSheet.absoluteFillObject, backgroundColor: T.bg },
  bar: {
    flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 8,
    width: '100%', maxWidth: 1200, alignSelf: 'center',
  },
  back: {
    flexDirection: 'row', alignItems: 'center', gap: 6, height: 40, paddingHorizontal: 10, borderRadius: 10,
    borderWidth: 1, borderColor: T.border, backgroundColor: T.surface,
  },
  backText: { fontSize: 13, fontWeight: '700', color: T.nav },
  title: { flex: 1, minWidth: 0, fontSize: 14.5, fontWeight: '800', color: T.nav },
  tool: {
    width: 40, height: 40, borderRadius: 10, borderWidth: 1, borderColor: T.border, backgroundColor: T.surface,
    alignItems: 'center', justifyContent: 'center',
  },
  frame: {
    flex: 1, width: '100%', maxWidth: 1200, alignSelf: 'center', backgroundColor: T.surface,
    borderTopWidth: 1, borderColor: T.border, overflow: 'hidden',
  },
  pdf: { flex: 1, width: '100%', height: '100%' },
  loader: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: T.surface, gap: 10 },
  loaderText: { fontSize: 13.5, fontWeight: '600', color: T.muted },
});
