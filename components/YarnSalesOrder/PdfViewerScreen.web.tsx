import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';

export default function PdfViewerScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const pdfUrl =
    typeof params.pdfUrl === 'string'
      ? params.pdfUrl
      : Array.isArray(params.pdfUrl)
        ? params.pdfUrl[0]
        : '';

  const title =
    typeof params.title === 'string'
      ? params.title
      : 'PDF Preview';

  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  const downloadPdf = () => {
    if (!pdfUrl) {
      Alert.alert('Error', 'PDF URL not found');
      return;
    }

    try {
      setDownloading(true);

      const fileName = `${title || 'PDF'}_${Date.now()}.pdf`
        .replace(/[^a-zA-Z0-9._-]/g, '_');

      const link = document.createElement('a');
      link.href = pdfUrl;
      link.download = fileName;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('WEB PDF DOWNLOAD ERROR:', error);
      Alert.alert('Error', 'Unable to download PDF');
    } finally {
      setDownloading(false);
    }
  };

  const sharePdf = async () => {
    if (!pdfUrl) {
      Alert.alert('Error', 'PDF URL not found');
      return;
    }

    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({
          title,
          url: pdfUrl,
        });
        return;
      }

      window.open(pdfUrl, '_blank', 'noopener,noreferrer');
    } catch (error: any) {
      if (error?.name === 'AbortError') return;

      try {
        await navigator.clipboard?.writeText(pdfUrl);
        Alert.alert(
          'PDF Link Copied',
          'PDF link has been copied to clipboard.'
        );
      } catch {
        window.open(pdfUrl, '_blank', 'noopener,noreferrer');
      }
    }
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <MaterialIcons
            name="arrow-back-ios-new"
            size={20}
            color="#fff"
          />
        </TouchableOpacity>

        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>

        <View style={styles.actions}>
          <TouchableOpacity
            onPress={downloadPdf}
            disabled={downloading}
            style={styles.actionButton}
          >
            {downloading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <MaterialIcons
                name="download"
                size={24}
                color="#fff"
              />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={sharePdf}
            style={styles.actionButton}
          >
            <MaterialIcons
              name="share"
              size={24}
              color="#fff"
            />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.pdfContainer}>
        {loading && (
          <View style={styles.loader}>
            <ActivityIndicator size="large" />
            <Text style={styles.loadingText}>Loading PDF...</Text>
          </View>
        )}

        {pdfUrl ? (
          <iframe
            src={pdfUrl}
            title={title}
            onLoad={() => setLoading(false)}
            onError={() => {
              setLoading(false);
              console.error('PDF iframe failed to load');
            }}
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              display: loading ? 'none' : 'block',
            }}
          />
        ) : (
          <View style={styles.loader}>
            <Text>Unable to load PDF</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    height: 56,
    backgroundColor: '#13879A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButton: {
    position: 'absolute',
    left: 14,
    zIndex: 10,
    padding: 5,
  },
  actions: {
    position: 'absolute',
    right: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    marginLeft: 15,
    padding: 4,
  },
  title: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '900',
    textAlign: 'center',
    maxWidth: '60%',
  },
  pdfContainer: {
    flex: 1,
    width: '100%',
    position: 'relative',
  },
  loader: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    zIndex: 2,
  },
  loadingText: {
    marginTop: 12,
  },
});
