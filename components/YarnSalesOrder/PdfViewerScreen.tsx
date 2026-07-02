import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    // Share,
    Alert,
    Platform,
    ActivityIndicator,
    ToastAndroid,
} from 'react-native';
import Pdf from 'react-native-pdf';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Share from 'react-native-share';
import ReactNativeBlobUtil from 'react-native-blob-util';
// import * as FileSystem from 'expo-file-system';
import { SafeAreaView } from 'react-native-safe-area-context';
import RNFS from 'react-native-fs';

const PdfViewerScreen = ({ navigation, route }) => {
    const { pdfUrl = '', title = 'PDF Preview' } = route?.params || {};
    const [downloading, setDownloading] = React.useState(false);


    const handleShare = async () => {
        try {
            if (!pdfUrl) {
                Alert.alert('Error', 'PDF URL not found');
                return;
            }

            const { config, fs } = ReactNativeBlobUtil;

            const fileName =
                title.replace(/[^a-zA-Z0-9]/g, '_') +
                '.pdf';

            const path =
                fs.dirs.CacheDir + '/' + fileName;

            const res = await config({
                fileCache: true,
                path: path,
            }).fetch('GET', pdfUrl);
            await Share.open({
                title: title,
                url: 'file://' + res.path(),
                type: 'application/pdf',
                failOnCancel: false,
                saveToFiles: true,
            });

        } catch (error) {
            console.log('SHARE ERROR =>', error);
        }
    };

    // const handleDownload = async () => {
    //     try {

    //         if (!pdfUrl) {
    //             Alert.alert(
    //                 'Error',
    //                 'PDF URL not found'
    //             );
    //             return;
    //         }

    //         setDownloading(true);

    //         const fileUri =
    //             FileSystem.documentDirectory +
    //             `${title || 'PDF'}.pdf`;

    //         const downloadResumable =
    //             FileSystem.createDownloadResumable(
    //                 pdfUrl,
    //                 fileUri
    //             );

    //         const response =
    //             await downloadResumable.downloadAsync();

    //         setDownloading(false);

    //         console.log(
    //             'FILE URI =>',
    //             response.uri
    //         );

    //         Alert.alert(
    //             'Success',
    //             'PDF downloaded successfully'
    //         );

    //     } catch (error) {

    //         setDownloading(false);

    //         console.log(
    //             'DOWNLOAD ERROR =>',
    //             error
    //         );

    //         Alert.alert(
    //             'Error',
    //             'Unable to download PDF'
    //         );
    //     }
    // };

    const shareLocalFile = async (
        localFileUri: string
    ) => {
        try {

            const urlToShare =
                localFileUri.startsWith('file://')
                    ? localFileUri
                    : `file://${localFileUri}`;

            await Share.open({
                url: urlToShare,
                type: 'application/pdf',
                failOnCancel: false,
            });

        } catch (err: any) {

            console.warn(
                'shareLocalFile error',
                err
            );

            Alert.alert(
                'Share Failed',
                err?.message || 'Unable to share PDF'
            );
        }
    };

    const handleDownload = async () => {
        try {

            if (!pdfUrl) {

                Alert.alert(
                    'Error',
                    'PDF URL not found'
                );

                return;
            }

            setDownloading(true);
            const fileName =
                `${title || 'PDF'}_${Date.now()}.pdf`;

            const destPath =
                `${RNFS.DownloadDirectoryPath}/${fileName}`;

            const download = RNFS.downloadFile({
                fromUrl: pdfUrl,
                toFile: destPath,
            });

            const result =
                await download.promise;

            setDownloading(false);

            if (result.statusCode === 200) {

                ToastAndroid.show(
                    `${fileName} downloaded`,
                    ToastAndroid.LONG
                );

                console.log(
                    'FILE SAVED =>',
                    destPath
                );

            } else {

                Alert.alert(
                    'Error',
                    'Download failed'
                );
            }

        } catch (err: any) {

            setDownloading(false);

            console.log(
                'DOWNLOAD ERROR =>',
                err
            );

            Alert.alert(
                'Error',
                err?.message ||
                'Unable to download PDF'
            );
        }
    };

    return (
        <SafeAreaView edges={['top', 'bottom']} style={styles.safe}>
            {/* <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Icon name="arrow-back-ios-new" size={20} color="#fff" />
                </TouchableOpacity>

                <Text style={styles.title}>{title}</Text>

                <TouchableOpacity
                    onPress={handleDownload}
                    style={{ marginRight: 8}}
                >
                    <Icon
                        name="download"
                        size={24}
                        color="#fff"
                    />
                </TouchableOpacity>

                <TouchableOpacity onPress={handleShare}>
                    <Icon
                        name="share"
                        size={24}
                        color="#fff"
                    />
                </TouchableOpacity>

                <View style={{ width: 24 }} />
            </View> */}
            <View style={styles.header}>

                {/* LEFT BACK BUTTON */}
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    style={styles.leftIcon}
                >
                    <Icon
                        name="arrow-back-ios-new"
                        size={20}
                        color="#fff"
                    />
                </TouchableOpacity>

                {/* CENTER TITLE */}
                <Text style={styles.title}>
                    {title}
                </Text>

                {/* RIGHT ACTIONS */}
                <View style={styles.rightIcons}>

                    <TouchableOpacity
                        onPress={handleDownload}
                        style={{ marginRight: 15 }}
                        disabled={downloading}
                    >
                        {downloading ? (
                            <ActivityIndicator
                                size="small"
                                color="#fff"
                            />
                        ) : (
                            <Icon
                                name="download"
                                size={24}
                                color="#fff"
                            />
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity onPress={handleShare}>
                        <Icon
                            name="share"
                            size={24}
                            color="#fff"
                        />
                    </TouchableOpacity>

                </View>

            </View>

            <Pdf
                source={{ uri: pdfUrl, cache: true }}
                trustAllCerts={false}
                style={styles.pdf}
                onError={error => {
                    console.log('PDF ERROR =>', error);
                }}
            />
        </SafeAreaView>
    );
};

export default PdfViewerScreen;

const styles = StyleSheet.create({
    safe: {
        flex: 1,
        backgroundColor: '#fff',
    },
    // header: {
    //     height: 56,
    //     backgroundColor: '#13879A',
    //     flexDirection: 'row',
    //     alignItems: 'center',
    //     paddingHorizontal: 14,
    // },
    // title: {
    //     flex: 1,
    //     color: '#fff',
    //     fontSize: 16,
    //     fontWeight: '900',
    //     textAlign: 'center',
    // },
    header: {
        height: 56,
        backgroundColor: '#13879A',
        justifyContent: 'center',
        alignItems: 'center',
    },

    leftIcon: {
        position: 'absolute',
        left: 14,
        zIndex: 1,
    },

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
    },
    pdf: {
        flex: 1,
        width: '100%',
        height: '100%',
    },
    // rightIcons: {
    //     position: 'absolute',
    //     right: 10,
    //     flexDirection: 'row',
    //     // alignItems: 'center',
    // },

});