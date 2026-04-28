import React, { useRef, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, Modal, Animated, Dimensions, Alert } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useWindowDimensions } from 'react-native';
import { API } from '../../common/API/dynamicAPI';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TextInput } from 'react-native-gesture-handler';
import { Camera, useCameraDevice, useCodeScanner, useCameraPermission } from 'react-native-vision-camera';

const { height } = Dimensions.get('window');

const WeftIssueItemDrawer = ({
    isVisible,
    onClose,
    FormState,
    token
}) => {
    const slideAnim = useRef(new Animated.Value(height)).current;
    const device = useCameraDevice('back');
    const [items, setItems] = useState([]);
    const [showManualSearch, setShowManualSearch] = useState(null);
    const [searchResults, setSearchResults] = useState([]);
    const [searchText, setSearchText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    const [CartonNo, setCartonNo] = useState('');
    const [yearNo, setYearNo] = useState('');
    const [getavgwt, setavgwt] = useState('0');
    const [getchees, setchees] = useState('0');
    const [getScannedObj, setScannedObj] = useState({})
    const { width } = useWindowDimensions();
    const [isScanning, setIsScanning] = useState(false);
    const { hasPermission, requestPermission } = useCameraPermission();
    const isSmallDevice = width < 360;

    let cancelToken: any;

    const getRequestConfig = (props: any) => ({
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
        },
        params: props.params,
        cancelToken: cancelToken?.token,
    });

    const getToken = () => {
        return token;
    };

    useEffect(() => {
        Animated.timing(slideAnim, {
            toValue: isVisible ? 0 : height,
            duration: 300,
            useNativeDriver: true,
        }).start();
    }, [isVisible]);

    const codeScanner = useCodeScanner({
        codeTypes: ['qr'],
        onCodeScanned: (codes) => {
            const value = codes[0]?.value || '';
            console.log("📦 Raw QR Value 👉", value);
            try {
                const parts = value.split("~");
                if (parts.length < 17) {
                    throw new Error("Invalid format");
                }
                const parsed = {
                    PUId: parts[0],
                    PSrNo: parts[1],
                    PSubSr: parts[2],
                    TranType: parts[3],
                    CartNo: parts[4],
                    ItmCode: parts[5],
                    ItmName: parts[6],
                    MerCode: parts[7],
                    MerName: parts[8],
                    GrdCode: parts[9],
                    GrdName: parts[10],
                    ShdCode: parts[11],
                    ShdName: parts[12],
                    Denier: parts[13],
                    Wt: parts[14],
                    Chees: parts[15],
                    yearNo: parts[16]
                };
                console.log("✅ Parsed 👉", parsed);
                setScannedObj(parsed);
                setCartonNo(parsed.CartNo || '');
                setYearNo(parsed.yearNo || '');
                setchees(parsed.Chees || '');
                setavgwt(parsed.Wt || '');
                // sendScannedValue(value);
            } catch (err) {
                Alert.alert("Invalid QR", "QR format not valid");
            }
            setIsScanning(false);
        },
    });

    const handleSearch = async () => {
        if (!searchText) {
            Alert.alert('Enter carton number');
            return;
        }
        if (cancelToken?.cancel) cancelToken.cancel();
        cancelToken = axios.CancelToken.source();
        setIsLoading(true);
        try {
            const yno = await AsyncStorage.getItem('yno');
            const payload = {
                prpcode: FormState.values.PrpCode,
                yearno: FormState.values.YearNo,
                strcode: '002',
                searchcarton: searchText.trim()
            };
            console.log("Payload:", payload);
            const response = await axios.post(
                `${API}/api/get_carton_search`,
                payload,
                {
                    headers: {
                        Authorization: `Bearer ${getToken()}`,
                        'Content-Type': 'application/json',
                        'X-Requested-with': 'XMLHttpRequest',
                    },
                    cancelToken: cancelToken.token
                }
            );
            console.log("Search Response:", response);
            const data = response?.data?.response?.data || [];
            if (response?.data?.success && data.length > 0) {
                setSearchResults(data);
            } else {
                setSearchResults([]);
                Alert.alert('No data found');
            }

        } catch (error) {
            if (axios.isCancel(error)) {
                // console.log("Request cancelled");
            } else {
                // console.log("API Error:", error);
                Alert.alert('Error while searching');
            }
        } finally {
            setIsLoading(false);
        }
    };


    {
        (!device || !hasPermission) && (
            <View style={{ alignItems: 'center', marginTop: 20 }}>
                <Text>No camera permission or device not available</Text>
            </View>
        )
    }

    return (
        <Modal visible={isVisible} transparent animationType="none">
            <View style={styles.overlay}>

                <Animated.View style={[
                    styles.container,
                    { transform: [{ translateY: slideAnim }] }
                ]}>
                    <View style={styles.header}>
                        <TouchableOpacity onPress={onClose}>
                            <Icon name="arrow-back" size={22} color="#fff" />
                        </TouchableOpacity>

                        <Text style={styles.headerTitle}>Weft Issue Carton Detail</Text>


                        <TouchableOpacity onPress={onClose}>
                            {/* <Icon name="close" size={22} color="#fff" /> */}
                        </TouchableOpacity>
                    </View>

                    <View style={styles.topSwitchContainer}>

                        <TouchableOpacity
                            activeOpacity={0.85}
                            style={[
                                styles.switchCard,
                                !showManualSearch && styles.activeCard
                            ]}
                            onPress={() => setShowManualSearch(false)}
                        >
                            <Icon
                                name="qr-code-scanner"
                                size={isSmallDevice ? 18 : 22}
                                color={!showManualSearch ? "#fff" : "#007EA7"}
                            />
                            <Text
                                numberOfLines={1}
                                style={[
                                    styles.switchText,
                                    isSmallDevice && { fontSize: 12 },
                                    !showManualSearch && styles.activeText
                                ]}
                            >
                                Scan Carton
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            activeOpacity={0.85}
                            style={[
                                styles.switchCard,
                                showManualSearch && styles.activeCard
                            ]}
                            onPress={() => setShowManualSearch(true)}
                        >
                            <Icon
                                name="search"
                                size={isSmallDevice ? 18 : 20}
                                color={showManualSearch ? "#fff" : "#007EA7"}
                            />
                            <Text
                                numberOfLines={1}
                                style={[
                                    styles.switchText,
                                    isSmallDevice && { fontSize: 12 },
                                    showManualSearch && styles.activeText
                                ]}
                            >
                                Manual Search
                            </Text>
                        </TouchableOpacity>

                    </View>                   
                </Animated.View>
            </View>
        </Modal>
    );
};

export default WeftIssueItemDrawer;

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)'
    },
    container: {
        flex: 1,
        backgroundColor: '#f4f6f8'
    },

    header: {
        backgroundColor: '#0e7490',
        paddingTop: 40,
        paddingBottom: 15,
        paddingHorizontal: 15,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    headerTitle: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600'
    },

    // 🔘 Toggle
    switchWrapper: {
        flexDirection: 'row',
        backgroundColor: '#e6f4f8',
        margin: 12,
        borderRadius: 10,
        overflow: 'hidden'
    },
    switchBtn: {
        flex: 1,
        padding: 12,
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'center'
    },
    activeBtn: {
        backgroundColor: '#007EA7'
    },
    // switchText: {
    //     marginLeft: 6,
    //     color: '#007EA7',
    //     fontWeight: '600'
    // },
    // activeText: {
    //     color: '#fff'
    // },

    // 📋 Items
    itemCard: {
        backgroundColor: '#fff',
        marginHorizontal: 12,
        marginBottom: 10,
        padding: 12,
        borderRadius: 10,
        elevation: 2
    },
    itemName: {
        fontWeight: '600',
        fontSize: 14
    },
    itemCode: {
        color: '#666',
        marginTop: 4
    },
    emptyText: {
        textAlign: 'center',
        marginTop: 30,
        color: '#999'
    },

    // 🔳 Scan Button
    scanBtn: {
        position: 'absolute',
        bottom: 20,
        right: 20,
        backgroundColor: '#17b85a',
        padding: 14,
        borderRadius: 30,
        flexDirection: 'row',
        alignItems: 'center',
        elevation: 5
    },
    scanText: {
        color: '#fff',
        marginLeft: 6,
        fontWeight: '600'
    },
    topSwitchContainer: {
        flexDirection: 'row',
        marginHorizontal: 10,
        marginTop: 10,
    },

    switchCard: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 8,
        marginHorizontal: 4,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#007EA7',
        backgroundColor: '#fff',
        minHeight: 48,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 3,
        elevation: 2,
    },

    activeCard: {
        backgroundColor: '#007EA7',
        borderColor: '#007EA7',

        elevation: 4,
        shadowOpacity: 0.15,
    },

    switchText: {
        marginLeft: 6,
        fontSize: 13,
        fontWeight: '600',
        color: '#007EA7',
        flexShrink: 1,
    },

    activeText: {
        color: '#fff',
    },

    commonBtn: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',

        // shadow
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },

    btnText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
    btnPrimary: {
        backgroundColor: '#007EA7',
    },

    btnSuccess: {
        backgroundColor: '#22c55e',
    },

    btnDanger: {
        backgroundColor: '#ef4444',
    },

    buttonRow: {
        flexDirection: 'row',
        marginTop: 10,
    },

    btnHalf: {
        flex: 1,
        marginHorizontal: 4,
    },

    btnOutline: {
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#007EA7',
    },
    card: {
        backgroundColor: '#fff',
        marginHorizontal: 12,
        marginTop: 10,
        padding: 12,
        borderRadius: 12,

        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 3,
    },

    row: {
        flexDirection: 'row',
        alignItems: 'center',
    },

    input: {
        flex: 1,
        height: 45,
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 10,
        paddingHorizontal: 12,
        fontSize: 14,
        backgroundColor: '#f9f9f9',
    },

    iconBtn: {
        width: 45,
        height: 45,
        borderRadius: 10,
        backgroundColor: '#007EA7',
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 8,
    },

    item: {
        padding: 10,
        borderRadius: 8,
        backgroundColor: '#f7f7f7',
        marginBottom: 6,
    },

    itemSelected: {
        backgroundColor: '#007EA7',
    },

    text1: {
        fontWeight: '600',
        fontSize: 14,
        color: '#222',
    },

    text2: {
        fontSize: 12,
        color: '#666',
        marginTop: 2,
    },

    textWhite: {
        color: '#fff',
    },

    btn: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 10,
        alignItems: 'center',
    },

    btnOk: {
        backgroundColor: '#22c55e',
        marginRight: 5,
    },

    btnClose: {
        backgroundColor: '#ef4444',
        marginLeft: 5,
    },

    btnPrimary: {
        backgroundColor: '#007EA7',
    },

    btnText: {
        color: '#fff',
        fontWeight: '600',
    },

    scanTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: '#007EA7',
    },

    cameraContainer: {
        marginTop: 15,
        height: 260,
        borderRadius: 12,
        overflow: 'hidden',
    },

    camera: {
        flex: 1,
    },

    // overlay: {
    //     ...StyleSheet.absoluteFillObject,
    //     justifyContent: 'center',
    //     alignItems: 'center',
    // },

    scanBox: {
        width: '70%',
        height: '40%',
        borderWidth: 2,
        borderColor: '#00ffcc',
        borderRadius: 10,
    },
});