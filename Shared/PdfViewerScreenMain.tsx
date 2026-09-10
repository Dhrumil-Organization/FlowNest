import AppAlert from '@/common/utils/appAlert';
import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { WebView } from 'react-native-webview';
import Icon from '@expo/vector-icons/MaterialIcons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as FileSystem from 'expo-file-system/legacy'; // Use legacy API
import * as Sharing from 'expo-sharing';

const PdfViewerScreenMain = () => {
    const router = useRouter();
    const params = useLocalSearchParams();

    const pdfUrl = params?.pdfUrl;
    const title = String(params.title || 'PDF Preview');

    const [loadingPdf, setLoadingPdf] = useState(true);
    const [downloading, setDownloading] = useState(false);
    const [localPdfPath, setLocalPdfPath] = useState('');

    // Download PDF to local storage (using legacy API)
    const preparePdf = async () => {
        try {
            if (!pdfUrl) {
                AppAlert.alert('Error', 'PDF URL not found');
                return;
            }

            setLoadingPdf(true);

            const fileName = `${title.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.pdf`;
            const localUri = `${FileSystem.cacheDirectory}${fileName}`;

            const { uri } = await FileSystem.downloadAsync(pdfUrl, localUri);
            setLocalPdfPath(uri);
        } catch (err) {
            console.log('PDF LOAD ERROR =>', err);
            AppAlert.alert('Error', 'Unable to load PDF');
        } finally {
            setLoadingPdf(false);
        }
    };

    // Share PDF (directly or via local file)
    const handleShare = async () => {
        try {
            if (!pdfUrl) {
                AppAlert.alert('Error', 'PDF URL not found');
                return;
            }

            const isAvailable = await Sharing.isAvailableAsync();
            if (!isAvailable) {
                AppAlert.alert('Error', 'Sharing not available');
                return;
            }

            // Try sharing the URL directly first
            try {
                await Sharing.shareAsync(pdfUrl, {
                    mimeType: 'application/pdf',
                    dialogTitle: title,
                });
            } catch (shareErr) {
                // If direct sharing fails, download and share the local file
                if (!localPdfPath) {
                    await preparePdf();
                }
                await Sharing.shareAsync(localPdfPath, {
                    mimeType: 'application/pdf',
                    dialogTitle: title,
                });
            }
        } catch (err) {
            console.log('SHARE ERROR =>', err);
            AppAlert.alert('Error', 'Unable to share PDF');
        }
    };

    // Download PDF to device storage
    const handleDownload = async () => {
        try {
            if (!pdfUrl) {
                AppAlert.alert('Error', 'PDF URL not found');
                return;
            }

            setDownloading(true);

            const fileName = `${title}_${Date.now()}.pdf`;
            const destination = `${FileSystem.documentDirectory}${fileName}`;

            const { uri } = await FileSystem.downloadAsync(pdfUrl, destination);

            AppAlert.alert('Downloaded', `PDF saved to: ${destination}`);
        } catch (err) {
            console.log('DOWNLOAD ERROR =>', err);
            AppAlert.alert('Error', err?.message || 'Unable to download PDF');
        } finally {
            setDownloading(false);
        }
    };

    useEffect(() => {
        if (pdfUrl) {
            preparePdf();
        }
    }, [pdfUrl]);

    return (
        <SafeAreaView edges={['top', 'bottom']} style={styles.safe}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.leftIcon}>
                    <Icon name="arrow-back-ios-new" size={20} color="#fff" />
                </TouchableOpacity>

                <Text style={styles.title} numberOfLines={1}>
                    {title}
                </Text>

                <View style={styles.rightIcons}>
                    <TouchableOpacity
                        onPress={handleDownload}
                        style={{ marginRight: 15 }}
                        disabled={downloading}
                    >
                        {downloading ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <Icon name="download" size={24} color="#fff" />
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity onPress={handleShare}>
                        <Icon name="share" size={24} color="#fff" />
                    </TouchableOpacity>
                </View>
            </View>

            {loadingPdf ? (
                <View style={styles.loader}>
                    <ActivityIndicator size="large" />
                    <Text style={{ marginTop: 12 }}>Loading PDF...</Text>
                </View>
            ) : pdfUrl ? (
                <WebView
                    source={{ uri: pdfUrl }}
                    style={styles.pdf}
                    onError={(e) => {
                        console.log('PDF ERROR =>', e);
                        AppAlert.alert('Error', 'Failed to load PDF');
                    }}
                />
            ) : (
                <View style={styles.loader}>
                    <Text>Unable to load PDF</Text>
                </View>
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: '#fff' },
    header: {
        height: 56,
        backgroundColor: '#13879A',
        justifyContent: 'center',
        alignItems: 'center',
    },
    leftIcon: { position: 'absolute', left: 14, zIndex: 1 },
    rightIcons: {
        position: 'absolute',
        right: 14,
        flexDirection: 'row',
        alignItems: 'center',
    },
    title: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '900',
        textAlign: 'center',
        maxWidth: '60%',
    },
    pdf: { flex: 1, width: '100%', height: '100%' },
    loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});

export default PdfViewerScreenMain;