import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, Animated, Dimensions, ScrollView, ActivityIndicator, Alert } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';
import { DesignData, ItemData, ItemStatus } from './Modal';
import theme from '../../android/app/src/theme';
import SearchableDropdown from '../Shared/SearchableDropdown';
import { Switch } from 'react-native';
import axios from 'axios';
import { API } from '../../common/API/dynamicAPI';
import Snackbar from 'react-native-snackbar';
import FullScreenLoader from '../Loader/Loader';

const { height } = Dimensions.get('window');

const CustomDrawer = (props) => {
    const { isVisible,
        onClose,
        selectedExe,
        onExeChange,
        exeData,
        designData,
        isLoading,
        itemData,
        selectedItemStatus,
        getAllPropertyData,
        FormState,
        setFormState,
        getAllYearData,
        getAllStoreData,
        setAllStockData,
        token
    } = props;

    const slideAnim = useRef(new Animated.Value(0)).current;
    const [searchQuery, setSearchQuery] = useState('');
    const [displayedDesigns, setDisplayedDesigns] = useState<DesignData[]>([]);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const scrollViewRef = useRef<ScrollView>(null);
    const [searchQueryItem, setSearchQueryItem] = useState('');
    const [displayedItems, setDisplayedItems] = useState<ItemData[]>([]);
    const [hasMoreItem, setHasMoreItem] = useState(true);
    const [localItemStatus, setLocalItemStatus] = useState<ItemStatus>(selectedItemStatus || 'All');
    const [getStockTypesFilterForm, setStockTypesFilterForm] = useState([
        { 'label': 'All', 'value': 'A' },
        { 'label': 'In house', 'value': 'I' },
        { 'label': 'Process house', 'value': 'P' }
    ]);

    useEffect(() => {
        if (exeData.length > 0 && !selectedExe) {
            onExeChange(exeData[0]);
        }
    }, [exeData, selectedExe, onExeChange]);

    useEffect(() => {
        const filtered = designData.filter(
            (design) =>
                design.DsnName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                design.DsnCode.toLowerCase().includes(searchQuery.toLowerCase())
        );
        const filtereditem = itemData.filter(
            (item) =>
                item.ItmName.toLowerCase().includes(searchQueryItem.toLowerCase()) ||
                item.ItmCode.toLowerCase().includes(searchQueryItem.toLowerCase())
        );
        setDisplayedDesigns(filtered.slice(0, 10));
        setDisplayedItems(filtereditem.slice(0, 10));
        setHasMore(filtered.length > 10);
        setHasMoreItem(filtereditem.length > 10);
    }, [searchQuery, designData, searchQueryItem, itemData]);

    React.useEffect(() => {
        Animated.timing(slideAnim, {
            toValue: isVisible ? 0 : height,
            duration: 300,
            useNativeDriver: true,
        }).start();
    }, [isVisible]);

    useEffect(() => {
        setLocalItemStatus(selectedItemStatus);
    }, [selectedItemStatus]);

    const handleLoaddata = async () => {
        if (typeof FormState.values.PrpCode == 'undefined' || FormState.values.PrpCode == null || FormState.values.PrpCode == '') {
            Snackbar.show({
                text: 'Please select property',
                duration: Snackbar.LENGTH_LONG,
                backgroundColor: 'red',
                textColor: '#fff',
                action: { text: 'OK', textColor: 'white' },
            });
        } else if (typeof FormState.values.YearNo == 'undefined' || FormState.values.YearNo == null || FormState.values.YearNo == '') {
            Snackbar.show({
                text: 'Please select year',
                duration: Snackbar.LENGTH_LONG,
                backgroundColor: 'red',
                textColor: '#fff',
                action: { text: 'OK', textColor: 'white' },
            });
        } else if (typeof FormState.values.StrCode == 'undefined' || FormState.values.StrCode == null || FormState.values.StrCode == '') {
            Snackbar.show({
                text: 'Please select store',
                duration: Snackbar.LENGTH_LONG,
                backgroundColor: 'red',
                textColor: '#fff',
                action: { text: 'OK', textColor: 'white' },
            });
        } else if (typeof FormState.values.StkType == 'undefined' || FormState.values.StkType == null || FormState.values.StkType == '') {
            Snackbar.show({
                text: 'Please select stock type',
                duration: Snackbar.LENGTH_LONG,
                backgroundColor: 'red',
                textColor: '#fff',
                action: { text: 'OK', textColor: 'white' },
            });
        } else {
            setIsLoadingMore(true)
            setAllStockData([])
            const payload = {
                prptype: 'S',
                prpcodes: [FormState.values.PrpCode],
                yearno: FormState.values.YearNo,
                strcode: FormState.values.StrCode,
                updateStock: FormState.values.updateStock,
                autoFound: typeof FormState.values.autoFound == 'undefined' || FormState.values.autoFound == null || FormState.values.autoFound == '' ? '0' : FormState.values.autoFound,
                manual: typeof FormState.values.manual == 'undefined' || FormState.values.manual == null || FormState.values.manual == '' ? '0' : FormState.values.manual,
                stockNotFound: typeof FormState.values.stockNotFound == 'undefined' || FormState.values.stockNotFound == null || FormState.values.stockNotFound == '' ? '0' : FormState.values.stockNotFound,
                autoNotFound: typeof FormState.values.autoNotFound == 'undefined' || FormState.values.autoNotFound == null || FormState.values.autoNotFound == '' ? '0' : FormState.values.autoNotFound,
                autoForRepacking: typeof FormState.values.autoForRepacking == 'undefined' || FormState.values.autoForRepacking == null || FormState.values.autoForRepacking == '' ? '0' : FormState.values.autoForRepacking,
                duplicate: typeof FormState.values.duplicate == 'undefined' || FormState.values.duplicate == null || FormState.values.duplicate == '' ? '0' : FormState.values.duplicate,
                txntype: 'yarnStockVerification',
                stktype: typeof FormState.values.StkType != 'undefined' && FormState.values.StkType != null && FormState.values.StkType != '' ? FormState.values.StkType : '',
            };
            const headers = {
                Authorization: `Bearer ${getToken()}`,
                'Content-Type': 'application/json',
                'X-Requested-with': 'XMLHttpRequest',
            };
            try {
                const response = await axios.post(`${API}/api/get_verify_manual_stock`, payload, { headers });
                if (response.data.success === true && response.data.response.data.length === 0) {
                    Alert.alert('No Data Found');
                } else if (response.data.success === true && response.data.response.data.length > 0) {
                    setAllStockData(response.data.response.data);
                    onClose()
                } else if (response.data.success === false) {
                    Alert.alert(`${response.data.message}`);
                } else {
                    Alert.alert(`${response.data.message}`);
                }
            } catch (error) {
                Alert.alert('Server Error :' + error)
            } finally {
                setIsLoadingMore(false)
            }
        }
    }

    const getToken = () => token
    const selectedProperty = getAllPropertyData?.find((p) => p.PrpCode == FormState.values.PrpCode) || null;
    const selectedYear = getAllYearData?.find((y) => y.YearNo == FormState.values.YearNo) || null;
    const selectedStore = getAllStoreData?.find((y) => y.StrCode == FormState.values.StrCode) || null;
    const selectedStockTypeFilterForm = getStockTypesFilterForm?.find((y) => y.value == FormState.values.StkType) || null;


    useEffect(() => {
        if (!FormState.values.StkType) {
            setFormState(prev => ({
                ...prev,
                values: {
                    ...prev.values,
                    StkType: 'I'
                }
            }));
        }
    }, []);

    return (
        <>
            <Modal visible={isVisible} transparent animationType="none" onRequestClose={onClose}>
                <View style={styles.modalOverlay}>
                    {isLoadingMore && <FullScreenLoader />}
                    <Animated.View style={[styles.drawerContainer, { transform: [{ translateY: slideAnim }] }]}>
                        <LinearGradient
                            colors={[theme.BRAND_GRADIENT_START, theme.BRAND_GRADIENT_END]}
                            style={styles.gradientBackground}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}>
                            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                                <Icon name="close" size={28} color="#fff" />
                            </TouchableOpacity>
                            <ScrollView
                                style={styles.scrollableFormContainer}
                                contentContainerStyle={styles.scrollableFormContent}
                                nestedScrollEnabled={true}>
                                <View style={{ marginBottom: 10 }} >
                                    <Text style={styles.label}>Select Property <Text style={{ color: 'red' }}> * </Text></Text>
                                    <SearchableDropdown
                                        key={FormState.values.PrpCode}
                                        data={getAllPropertyData}
                                        labelKey="LngName"
                                        valueKey="PrpCode"
                                        placeholder="Choose property..."
                                        pageSize={10}
                                        initialValue={selectedProperty}
                                        onSelect={(item) => {
                                            setFormState(FormState => ({
                                                ...FormState,
                                                values: {
                                                    ...FormState.values,
                                                    PrpCode: item?.PrpCode || '',
                                                }
                                            }));
                                        }}
                                        multiple={false}
                                        emptyMessage="No properties available" />
                                </View>
                                <View style={{ marginBottom: 10 }} >
                                    <Text style={styles.label}>Select Year <Text style={{ color: 'red' }}> * </Text></Text>
                                    <SearchableDropdown
                                        key={FormState.values.YearNo}
                                        data={getAllYearData}
                                        labelKey="YearName"
                                        valueKey="YearNo"
                                        placeholder="Choose year..."
                                        pageSize={10}
                                        initialValue={selectedYear}
                                        onSelect={(item) => {
                                            setFormState(FormState => ({
                                                ...FormState,
                                                values: {
                                                    ...FormState.values,
                                                    YearNo: item?.YearNo || '',
                                                }
                                            }));
                                        }}
                                        multiple={false}
                                        emptyMessage="No years data available" />
                                </View>
                                <View style={{ marginBottom: 10 }} >
                                    <Text style={styles.label}>Select Store <Text style={{ color: 'red' }}> * </Text></Text>
                                    <SearchableDropdown
                                        key={FormState.values.StrCode}
                                        data={getAllStoreData}
                                        labelKey="StrName"
                                        valueKey="StrCode"
                                        placeholder="Choose sore..."
                                        pageSize={10}
                                        initialValue={selectedStore}
                                        onSelect={(item) => {
                                            setFormState(FormState => ({
                                                ...FormState,
                                                values: {
                                                    ...FormState.values,
                                                    StrCode: item?.StrCode || '',
                                                }
                                            }));
                                        }}
                                        multiple={false}
                                        emptyMessage="No stores data available" />
                                </View>
                                <View style={{ marginBottom: 10 }} >
                                    <Text style={styles.label}>Select stock type <Text style={{ color: 'red' }}> * </Text></Text>
                                    <SearchableDropdown
                                        key={FormState.values.StkType}
                                        data={getStockTypesFilterForm}
                                        labelKey="label"
                                        valueKey="value"
                                        placeholder="Choose property..."
                                        pageSize={10}
                                        value={FormState.values.StkType}
                                        initialValue={selectedStockTypeFilterForm}
                                        onSelect={(stk) => {
                                            setFormState(FormState => ({
                                                ...FormState,
                                                values: {
                                                    ...FormState.values,
                                                    StkType: stk?.value || '',
                                                }
                                            }));
                                        }}
                                        multiple={false}
                                        emptyMessage="No stock types data available" />
                                </View>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <Text style={styles.label1}>Update stock ?</Text>
                                        <Switch
                                            style={styles.switch}
                                            value={FormState.values.updateStock === '1'}
                                            onValueChange={(value) => {
                                                setFormState(prev => ({
                                                    ...prev,
                                                    values: {
                                                        ...prev.values,
                                                        updateStock: value ? '1' : '0'
                                                    }
                                                }));
                                            }}
                                            trackColor={{ false: "#ccc", true: "#00E676" }}   // bright green
                                            thumbColor={"#fff"} />
                                    </View>
                                </View>
                                <View style={styles.cartonContainer}>
                                    <View style={styles.cartonTitleContainer}>
                                        <Text style={styles.cartonTitle}>Cartons</Text>
                                    </View>
                                    <View style={styles.switchGrid}>
                                        <View style={styles.switchItem}>
                                            <Text style={styles.switchLabelWhite}>Auto not found</Text>
                                            <Switch
                                                value={FormState.values.autoNotFound === '1'}
                                                onValueChange={(value) => {
                                                    setFormState(prev => ({
                                                        ...prev,
                                                        values: {
                                                            ...prev.values,
                                                            autoNotFound: value ? '1' : '0'
                                                        }
                                                    }));
                                                }}
                                                trackColor={{ false: "#ccc", true: "#00E676" }}
                                                thumbColor="#fff" />
                                        </View>
                                        <View style={styles.switchItem}>
                                            <Text style={styles.switchLabelYellow}>Auto found</Text>
                                            <Switch
                                                value={FormState.values.autoFound === '1'}
                                                onValueChange={(value) => {
                                                    setFormState(prev => ({
                                                        ...prev,
                                                        values: {
                                                            ...prev.values,
                                                            autoFound: value ? '1' : '0'
                                                        }
                                                    }));
                                                }}
                                                trackColor={{ false: "#ccc", true: "#00E676" }}
                                                thumbColor="#fff" />
                                        </View>
                                        <View style={styles.switchItem}>
                                            <Text style={styles.switchLabelPurple}>Auto for repacking</Text>
                                            <Switch
                                                value={FormState.values.autoForRepacking === '1'}
                                                onValueChange={(value) => {
                                                    setFormState(prev => ({
                                                        ...prev,
                                                        values: {
                                                            ...prev.values,
                                                            autoForRepacking: value ? '1' : '0'
                                                        }
                                                    }));
                                                }}
                                                trackColor={{ false: "#ccc", true: "#00E676" }}
                                                thumbColor="#fff" />
                                        </View>
                                        <View style={styles.switchItem}>
                                            <Text style={styles.switchLabelManual}>Manual</Text>
                                            <Switch
                                                value={FormState.values.manual === '1'}
                                                onValueChange={(value) => {
                                                    setFormState(prev => ({
                                                        ...prev,
                                                        values: {
                                                            ...prev.values,
                                                            manual: value ? '1' : '0'
                                                        }
                                                    }));
                                                }}
                                                trackColor={{ false: "#ccc", true: "#00E676" }}
                                                thumbColor="#fff" />
                                        </View>
                                        <View style={styles.switchItem}>
                                            <Text style={styles.switchLabelGreen}>Duplicate</Text>
                                            <Switch
                                                value={FormState.values.duplicate === '1'}
                                                onValueChange={(value) => {
                                                    setFormState(prev => ({
                                                        ...prev,
                                                        values: {
                                                            ...prev.values,
                                                            duplicate: value ? '1' : '0'
                                                        }
                                                    }));
                                                }}
                                                trackColor={{ false: "#ccc", true: "#00E676" }}
                                                thumbColor="#fff" />
                                        </View>
                                        <View style={styles.switchItem}>
                                            <Text style={styles.switchLabelPink}>Stock not found</Text>
                                            <Switch
                                                value={FormState.values.stockNotFound === '1'}
                                                onValueChange={(value) => {
                                                    setFormState(prev => ({
                                                        ...prev,
                                                        values: {
                                                            ...prev.values,
                                                            stockNotFound: value ? '1' : '0'
                                                        }
                                                    }));
                                                }}
                                                trackColor={{ false: "#ccc", true: "#00E676" }}
                                                thumbColor="#fff" />
                                        </View>
                                    </View>
                                </View>
                            </ScrollView>
                            <TouchableOpacity
                                style={styles.centerFabButton}
                                onPress={handleLoaddata}
                                activeOpacity={0.85}>
                                {
                                    isLoading ?
                                        (<ActivityIndicator size="small" color="#fff" />)
                                        :
                                        (<>
                                            <Icon name="cloud-download" size={20} color="#fff" />
                                            <Text style={styles.centerFabText}>Load Data</Text>
                                        </>)
                                }
                            </TouchableOpacity>
                        </LinearGradient>
                    </Animated.View>
                </View>
            </Modal>
        </>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    drawerContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        borderTopLeftRadius: 0,
        borderTopRightRadius: 0,
        overflow: 'hidden',
    },
    gradientBackground: {
        flex: 1,
        padding: 0,
    },
    closeButton: {
        alignSelf: 'flex-end',
        padding: 10,
    },
    label: {
        fontSize: 16,
        marginBottom: 5,
        color: '#fff',
    },
    scrollableFormContainer: {
        flex: 1,
        padding: 10,
    },
    scrollableFormContent: {
        paddingBottom: 80, // Extra space for the Load button
    },
    label1: {
        paddingVertical: 5,
        color: '#FFF',
        marginTop: 10,
        fontWeight: "500",
        marginRight: 20
    },
    switch: {
        lineHeight: 1,
        marginTop: 10
    },
    cartonContainer: {
        backgroundColor: "#fff",
        borderRadius: 10,
        padding: 15,
        marginVertical: 10,
        borderWidth: 1,
        borderColor: "#E5E5E5",
    },
    switchLabelWhite: {
        fontSize: 13,
        color: "#444",
        width: "70%",
        backgroundColor: "#FFFFFF",
        padding: 5,
        borderRadius: 8
    },
    switchLabelYellow: {
        fontSize: 14,
        color: "#444",
        width: "70%",
        backgroundColor: "#F1FA73",
        padding: 5,
        borderRadius: 8
    },
    switchLabelPurple: {
        fontSize: 14,
        color: "#000",
        width: "70%",
        backgroundColor: "#B59AE3",
        padding: 5,
        borderRadius: 8
    },
    switchLabelManual: {
        fontSize: 14,
        color: "#000",
        width: "70%",
        backgroundColor: "#98FAF3",
        padding: 5,
        borderRadius: 8
    },
    switchLabelGreen: {
        fontSize: 14,
        color: "#000",
        width: "70%",
        backgroundColor: "#678F76",
        padding: 5,
        borderRadius: 8
    },
    switchLabelPink: {
        fontSize: 14,
        color: "#000",
        width: "70%",
        backgroundColor: "#DBA7D7",
        padding: 5,
        borderRadius: 8
    },
    cartonTitleContainer: {
        alignItems: "center",
        marginBottom: 12
    },
    cartonTitle: {
        backgroundColor: "#E3F2FD",
        color: "#007EA7",
        fontSize: 15,
        fontWeight: "600",
        paddingVertical: 6,
        paddingHorizontal: 20,
        borderRadius: 20,
        overflow: "hidden"
    },
    switchGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "space-between"
    },
    switchItem: {
        width: "48%",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 10,
        paddingVertical: 6
    },
    centerFabButton: {
        position: "absolute",
        bottom: 25,
        alignSelf: "center",
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#17b85a",
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 30,
        elevation: 3,
        shadowColor: "#000",
        shadowOpacity: 0.3,
        shadowOffset: { width: 0, height: 4 },
        shadowRadius: 5
    },
    centerFabText: {
        color: "#fff",
        fontWeight: "600",
        fontSize: 14,
        marginLeft: 6
    },
});

export default CustomDrawer;
