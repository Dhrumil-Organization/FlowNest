// import AppAlert from '@/common/utils/appAlert';
// import React, { useEffect, useState } from 'react';
// import {
//     View,
//     Text,
//     StyleSheet,
//     TouchableOpacity,
//     ActivityIndicator,
//     Alert,
// } from 'react-native';
// import { WebView } from 'react-native-webview';
// import Icon from '@expo/vector-icons/MaterialIcons';
// import { SafeAreaView } from 'react-native-safe-area-context';
// import { useLocalSearchParams, useRouter } from 'expo-router';
// import * as FileSystem from 'expo-file-system/legacy'; // Use legacy API
// import * as Sharing from 'expo-sharing';

// const PdfViewerScreenMain = () => {
//     const router = useRouter();
//     const params = useLocalSearchParams();

//     const pdfUrl = params?.pdfUrl;
//     const title = String(params.title || 'PDF Preview');

//     const [loadingPdf, setLoadingPdf] = useState(true);
//     const [downloading, setDownloading] = useState(false);
//     const [localPdfPath, setLocalPdfPath] = useState('');

//     // Download PDF to local storage (using legacy API)
//     const preparePdf = async () => {
//         try {
//             if (!pdfUrl) {
//                 AppAlert.alert('Error', 'PDF URL not found');
//                 return;
//             }

//             setLoadingPdf(true);

//             const fileName = `${title.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.pdf`;
//             const localUri = `${FileSystem.cacheDirectory}${fileName}`;

//             const { uri } = await FileSystem.downloadAsync(pdfUrl, localUri);
//             setLocalPdfPath(uri);
//         } catch (err) {
//             console.log('PDF LOAD ERROR =>', err);
//             AppAlert.alert('Error', 'Unable to load PDF');
//         } finally {
//             setLoadingPdf(false);
//         }
//     };

//     // Share PDF (directly or via local file)
//     const handleShare = async () => {
//         try {
//             if (!pdfUrl) {
//                 AppAlert.alert('Error', 'PDF URL not found');
//                 return;
//             }

//             const isAvailable = await Sharing.isAvailableAsync();
//             if (!isAvailable) {
//                 AppAlert.alert('Error', 'Sharing not available');
//                 return;
//             }

//             // Try sharing the URL directly first
//             try {
//                 await Sharing.shareAsync(pdfUrl, {
//                     mimeType: 'application/pdf',
//                     dialogTitle: title,
//                 });
//             } catch (shareErr) {
//                 // If direct sharing fails, download and share the local file
//                 if (!localPdfPath) {
//                     await preparePdf();
//                 }
//                 await Sharing.shareAsync(localPdfPath, {
//                     mimeType: 'application/pdf',
//                     dialogTitle: title,
//                 });
//             }
//         } catch (err) {
//             console.log('SHARE ERROR =>', err);
//             AppAlert.alert('Error', 'Unable to share PDF');
//         }
//     };

//     // Download PDF to device storage
//     const handleDownload = async () => {
//         try {
//             if (!pdfUrl) {
//                 AppAlert.alert('Error', 'PDF URL not found');
//                 return;
//             }

//             setDownloading(true);

//             const fileName = `${title}_${Date.now()}.pdf`;
//             const destination = `${FileSystem.documentDirectory}${fileName}`;

//             const { uri } = await FileSystem.downloadAsync(pdfUrl, destination);

//             AppAlert.alert('Downloaded', `PDF saved to: ${destination}`);
//         } catch (err) {
//             console.log('DOWNLOAD ERROR =>', err);
//             AppAlert.alert('Error', err?.message || 'Unable to download PDF');
//         } finally {
//             setDownloading(false);
//         }
//     };

//     useEffect(() => {
//         if (pdfUrl) {
//             preparePdf();
//         }
//     }, [pdfUrl]);

//     return (
//         <SafeAreaView edges={['top', 'bottom']} style={styles.safe}>
//             <View style={styles.header}>
//                 <TouchableOpacity onPress={() => router.back()} style={styles.leftIcon}>
//                     <Icon name="arrow-back-ios-new" size={20} color="#fff" />
//                 </TouchableOpacity>

//                 <Text style={styles.title} numberOfLines={1}>
//                     {title}
//                 </Text>

//                 <View style={styles.rightIcons}>
//                     <TouchableOpacity
//                         onPress={handleDownload}
//                         style={{ marginRight: 15 }}
//                         disabled={downloading}
//                     >
//                         {downloading ? (
//                             <ActivityIndicator size="small" color="#fff" />
//                         ) : (
//                             <Icon name="download" size={24} color="#fff" />
//                         )}
//                     </TouchableOpacity>

//                     <TouchableOpacity onPress={handleShare}>
//                         <Icon name="share" size={24} color="#fff" />
//                     </TouchableOpacity>
//                 </View>
//             </View>

//             {loadingPdf ? (
//                 <View style={styles.loader}>
//                     <ActivityIndicator size="large" />
//                     <Text style={{ marginTop: 12 }}>Loading PDF...</Text>
//                 </View>
//             ) : pdfUrl ? (
//                 <WebView
//                     source={{ uri: pdfUrl }}
//                     style={styles.pdf}
//                     onError={(e) => {
//                         console.log('PDF ERROR =>', e);
//                         AppAlert.alert('Error', 'Failed to load PDF');
//                     }}
//                 />
//             ) : (
//                 <View style={styles.loader}>
//                     <Text>Unable to load PDF</Text>
//                 </View>
//             )}
//         </SafeAreaView>
//     );
// };

// const styles = StyleSheet.create({
//     safe: { flex: 1, backgroundColor: '#fff' },
//     header: {
//         height: 56,
//         backgroundColor: '#13879A',
//         justifyContent: 'center',
//         alignItems: 'center',
//     },
//     leftIcon: { position: 'absolute', left: 14, zIndex: 1 },
//     rightIcons: {
//         position: 'absolute',
//         right: 14,
//         flexDirection: 'row',
//         alignItems: 'center',
//     },
//     title: {
//         color: '#fff',
//         fontSize: 16,
//         fontWeight: '900',
//         textAlign: 'center',
//         maxWidth: '60%',
//     },
//     pdf: { flex: 1, width: '100%', height: '100%' },
//     loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
// });

// export default PdfViewerScreenMain;
import AppAlert from '@/common/utils/appAlert';
import Icon from '@expo/vector-icons/MaterialIcons';
import * as FileSystem from 'expo-file-system/legacy'; // 👈 the fix
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import React, { useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

const isWeb = Platform.OS === 'web';

const PdfViewerScreenMain = () => {
    const router = useRouter();
    const params = useLocalSearchParams();

    const pdfUrl = String(params?.pdfUrl || '');
    const title  = String(params.title || 'PDF Preview');

    const [downloading, setDownloading] = useState(false);

    const safeName = useMemo(
        () => title.replace(/[^a-zA-Z0-9]/g, '_'),
        [title],
    );

    // ---------- URL that WebView / iframe loads ----------
    const previewUrl = useMemo(() => {
        if (!pdfUrl) return '';
        if (isWeb) return pdfUrl;
        if (Platform.OS === 'android') {
            return `https://docs.google.com/viewer?url=${encodeURIComponent(pdfUrl)}&embedded=true`;
        }
        return pdfUrl;
    }, [pdfUrl]);

    // ---------- SHARE ----------
    const handleShare = async () => {
        try {
            if (!pdfUrl) { AppAlert.alert('Error', 'PDF URL not found'); return; }

            // WEB
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

            // NATIVE
            const ok = await Sharing.isAvailableAsync();
            if (!ok) { AppAlert.alert('Error', 'Sharing not available'); return; }

            const localUri = `${FileSystem.cacheDirectory}${safeName}_${Date.now()}.pdf`;
            const { uri } = await FileSystem.downloadAsync(pdfUrl, localUri);

            await Sharing.shareAsync(uri, {
                mimeType: 'application/pdf',
                dialogTitle: title,
                UTI: 'com.adobe.pdf',
            });
        } catch (err) {
            console.log('SHARE ERROR =>', err);
            AppAlert.alert('Error', 'Unable to share PDF');
        }
    };

    // ---------- DOWNLOAD ----------
    const handleDownload = async () => {
        if (!pdfUrl) { AppAlert.alert('Error', 'PDF URL not found'); return; }

        // ---------------- WEB ----------------
        if (isWeb) {
            try {
                setDownloading(true);
                const link = document.createElement('a');
                link.href = pdfUrl;
                link.download = `${safeName}.pdf`;
                link.target = '_blank';
                link.rel = 'noopener noreferrer';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            } finally {
                setDownloading(false);
            }
            return;
        }

        // ---------------- NATIVE ----------------
        try {
            setDownloading(true);

            const localUri = `${FileSystem.cacheDirectory}${safeName}_${Date.now()}.pdf`;
            const { uri, status } = await FileSystem.downloadAsync(pdfUrl, localUri);

            if (status !== 200) {
                throw new Error(`Server returned ${status}`);
            }

            // Hand off to the OS share sheet → user can Save to Files/Downloads/Drive
            const canShare = await Sharing.isAvailableAsync();
            if (canShare) {
                await Sharing.shareAsync(uri, {
                    mimeType: 'application/pdf',
                    dialogTitle: `${title} — Save or Open`,
                    UTI: 'com.adobe.pdf',
                });
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

    // ---------- WEB renderer ----------
    const WebFrame = ({ uri }: { uri: string }) =>
        React.createElement('iframe', {
            src: uri,
            title: 'PDF Preview',
            style: { width: '100%', height: '100%', border: 'none', display: 'block' },
        });

    return (
        <SafeAreaView edges={['top', 'bottom']} style={styles.safe}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.leftIcon}>
                    <Icon name="arrow-back-ios-new" size={20} color="#fff" />
                </TouchableOpacity>

                <Text style={styles.title} numberOfLines={1}>{title}</Text>

                <View style={styles.rightIcons}>
                    <TouchableOpacity onPress={handleDownload} style={{ marginRight: 15 }} disabled={downloading}>
                        {downloading
                            ? <ActivityIndicator size="small" color="#fff" />
                            : <Icon name="download" size={24} color="#fff" />}
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleShare}>
                        <Icon name="share" size={24} color="#fff" />
                    </TouchableOpacity>
                </View>
            </View>

            {previewUrl ? (
                <View style={styles.pdfWrapper}>
                    {isWeb ? (
                        <WebFrame uri={previewUrl} />
                    ) : (
                        <WebView
                            originWhitelist={['*']}
                            source={{ uri: previewUrl }}
                            style={styles.pdf}
                            startInLoadingState
                            javaScriptEnabled
                            domStorageEnabled
                            allowFileAccess
                            allowUniversalAccessFromFileURLs
                            allowsInlineMediaPlayback
                            mixedContentMode="always"
                            onError={(e) => {
                                console.log('PDF ERROR =>', e.nativeEvent);
                                AppAlert.alert('Error', 'Failed to load PDF');
                            }}
                            renderLoading={() => (
                                <View style={styles.loader}>
                                    <ActivityIndicator size="large" color="#13879A" />
                                    <Text style={{ marginTop: 12 }}>Loading PDF...</Text>
                                </View>
                            )}
                        />
                    )}
                </View>
            ) : (
                <View style={styles.loader}><Text>Unable to load PDF</Text></View>
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: '#fff' },
    header: {
        height: 56, backgroundColor: '#13879A',
        justifyContent: 'center', alignItems: 'center',
    },
    leftIcon: { position: 'absolute', left: 14, zIndex: 1 },
    rightIcons: { position: 'absolute', right: 14, flexDirection: 'row', alignItems: 'center' },
    title: { color: '#fff', fontSize: 16, fontWeight: '900', textAlign: 'center', maxWidth: '60%' },
    pdfWrapper: { flex: 1, width: '100%', height: '100%', backgroundColor: '#fff' },
    pdf: { flex: 1, width: '100%', height: '100%' },
    loader: {
        flex: 1, justifyContent: 'center', alignItems: 'center',
        backgroundColor: '#fff',
    },
});

export default PdfViewerScreenMain;