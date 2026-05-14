import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    TouchableOpacity,
} from 'react-native';
import Pdf from 'react-native-pdf';
import Icon from 'react-native-vector-icons/MaterialIcons';

const PdfViewerScreen = ({ navigation, route }) => {
    const { pdfUrl = '', title = 'PDF Preview' } = route?.params || {};

    return (
        <SafeAreaView style={styles.safe}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Icon name="arrow-back-ios-new" size={20} color="#fff" />
                </TouchableOpacity>

                <Text style={styles.title}>{title}</Text>

                <View style={{ width: 24 }} />
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
    header: {
        height: 56,
        backgroundColor: '#13879A',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
    },
    title: {
        flex: 1,
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
});