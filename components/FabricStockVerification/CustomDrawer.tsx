import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Dimensions, ScrollView, ActivityIndicator, Alert, BackHandler, Platform, StatusBar } from 'react-native';
import Icon from '@expo/vector-icons/MaterialIcons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { DesignData, ItemData, ItemStatus } from './Modal';
import theme from '@/components/theme';
import SearchableDropdown from '@/Shared/SearchableDropdown';
import { Switch } from 'react-native';
import axios from 'axios';
import { API } from '../../common/API/dynamicAPI';
// import Snackbar from 'react-native-snackbar';
import { showSnackbar, showSuccess, showError, showWarning } from '@/common/utils/snackbar';
import FullScreenLoader from '@/components/FullScreenLoader';

const { height, width } = Dimensions.get('window');

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
    const insets = useSafeAreaInsets();
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

    // 🔥 NEW: BackButton handle karo manually
    useEffect(() => {
        const backHandler = BackHandler.addEventListener(
            'hardwareBackPress',
            () => {
                if (isVisible) {
                    onClose();
                    return true; // event consume karo
                }
                return false;
            }
        );
        return () => backHandler.remove();
    }, [isVisible, onClose]);

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
            // showWarning
            // Snackbar.show({
            //     text: 'Please select property',
            //     duration: Snackbar.LENGTH_LONG,
            //     backgroundColor: 'red',
            //     textColor: '#fff',
            //     action: { text: 'OK', textColor: 'white' },
            // });

            showWarning(`Please select property`, {
                text: 'OK',
                onPress: () => { },
            });

        } else if (typeof FormState.values.YearNo == 'undefined' || FormState.values.YearNo == null || FormState.values.YearNo == '') {
            // Snackbar.show({
            //     text: 'Please select year',
            //     duration: Snackbar.LENGTH_LONG,
            //     backgroundColor: 'red',
            //     textColor: '#fff',
            //     action: { text: 'OK', textColor: 'white' },
            // });
            showWarning(`Please select year`, {
                text: 'OK',
                onPress: () => { },
            });
        } else if (typeof FormState.values.StrCode == 'undefined' || FormState.values.StrCode == null || FormState.values.StrCode == '') {
            // Snackbar.show({
            //     text: 'Please select store',
            //     duration: Snackbar.LENGTH_LONG,
            //     backgroundColor: 'red',
            //     textColor: '#fff',
            //     action: { text: 'OK', textColor: 'white' },
            // });
            showWarning(`Please select store`, {
                text: 'OK',
                onPress: () => { },
            });
        } else if (typeof FormState.values.StkType == 'undefined' || FormState.values.StkType == null || FormState.values.StkType == '') {
            // Snackbar.show({
            //     text: 'Please select stock type',
            //     duration: Snackbar.LENGTH_LONG,
            //     backgroundColor: 'red',
            //     textColor: '#fff',
            //     action: { text: 'OK', textColor: 'white' },
            // });
            showWarning(`Please select stock type`, {
                text: 'OK',
                onPress: () => { },
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
                txntype: 'fabricStockVerification',
                stktype: typeof FormState.values.StkType != 'undefined' && FormState.values.StkType != null && FormState.values.StkType != '' ? FormState.values.StkType : '',
            };
            const headers = {
                Authorization: `Bearer ${getToken()}`,
                'Content-Type': 'application/json',
                'X-Requested-with': 'XMLHttpRequest',
            };
            console.log("get_verify_manual_fabric_stock API payload :", payload)
            console.log("get_verify_manual_fabric_stock API URL :", `${API}/api/get_verify_manual_fabric_stock`)
            try {
                const response = await axios.post(`${API}/api/get_verify_manual_fabric_stock`, payload, { headers });
                console.log("get_verify_manual_stock API response :", response)
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

    // ✅ NEW: Normal View use karo with absolute positioning
    if (!isVisible) return null;
    return (
        <>
            <View style={styles.fullScreenView}>
                <SafeAreaView style={styles.safeAreaSheet} edges={['bottom']}>
                    <StatusBar barStyle="light-content" backgroundColor="#087FA3" />
                {isLoadingMore && <FullScreenLoader />}
                <View style={styles.screenContent}>
                <Animated.View style={[styles.drawerContainer, { transform: [{ translateY: slideAnim }] }]}>
                    <View style={styles.sheet}>
                        <View style={[styles.drawerHeader, { paddingTop: insets.top, minHeight: 58 + insets.top }]}>
                            <View style={styles.drawerHeaderLeft}>
                                <View style={styles.headerIconCircle}>
                                    <Icon name="tune" size={18} color="#FFFFFF" />
                                </View>
                                <Text style={styles.drawerHeaderTitle}>Filters</Text>
                            </View>
                            <TouchableOpacity style={styles.closeButton} onPress={onClose} activeOpacity={0.8}>
                                <Icon name="arrow-back" size={26} color="#FFFFFF" />
                            </TouchableOpacity>
                        </View>
                        <ScrollView
                            style={styles.scrollableFormContainer}
                            contentContainerStyle={styles.scrollableFormContent}
                            nestedScrollEnabled={true}>
                            <View style={{ marginBottom: 10 }} >
                                <Text style={styles.label}>Select Property <Text style={{ color: 'red' }}> * </Text></Text>
                                <SearchableDropdown
                                    key={FormState.values.PrpCode}
                                    data={getAllPropertyData || []}
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
                                    data={getAllYearData || []}
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
                                    data={getAllStoreData || []}
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
                                    data={getStockTypesFilterForm || []}
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
                    </View>
                </Animated.View>
                </View>
                </SafeAreaView>
            </View>

        </>
    );
};

const styles = StyleSheet.create({
    fullScreenView: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%', zIndex: 99999, elevation: 99999, backgroundColor: '#F7FAFB' },
    drawerContainer: { flex: 1, overflow: 'hidden', backgroundColor: '#F5F8F9' },
    safeAreaSheet: { flex: 1, backgroundColor: '#FFFFFF' },
    screenContent: { flex: 1, backgroundColor: '#087FA3', paddingTop: 0 },
    gradientBackground: { flex: 1, paddingTop: 0 },
    sheet: { flex: 1, minHeight: '100%', backgroundColor: '#F7FAFB' },
    drawerHeader: { minHeight: 58, paddingTop: 0, backgroundColor: '#087FA3', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 },
    drawerHeaderLeft: { flexDirection: 'row', alignItems: 'center' },
    headerIconCircle: { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center', marginRight: 9 },
    drawerHeaderTitle: { color: '#FFFFFF', fontSize: 17, fontWeight: '800' },
    closeButton: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.16)' },
    label: { fontSize: 12.5, marginBottom: 5, color: '#0B5266', fontWeight: '800' },
    scrollableFormContainer: { flex: 1, paddingHorizontal: 12, backgroundColor: '#F7FAFB' },
    scrollableFormContent: { paddingBottom: 10, paddingTop: 8, flexGrow: 1 },
    label1: { paddingVertical: 5, color: '#0B5266', fontWeight: '700', marginRight: 14, fontSize: 13 },
    switch: { marginTop: 2 },
    cartonContainer: {
        backgroundColor: '#FFFFFF', borderRadius: 14, padding: 11, marginVertical: 7,
        borderWidth: 1, borderColor: '#E0E7EA', elevation: 2,
        shadowColor: '#153943', shadowOpacity: 0.08, shadowRadius: 5,
        shadowOffset: { width: 0, height: 2 }
    },
    cartonTitleContainer: { alignItems: 'center', marginBottom: 8 },
    cartonTitle: {
        backgroundColor: '#EAF6F9', color: '#087FA3', fontSize: 13,
        fontWeight: '800', paddingVertical: 6, paddingHorizontal: 20,
        borderRadius: 18, overflow: 'hidden'
    },
    switchGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
    switchItem: {
        width: '48%', flexDirection: 'row', alignItems: 'center',
        justifyContent: 'space-between', marginBottom: 6, paddingVertical: 5,
        paddingHorizontal: 6, borderRadius: 10, borderWidth: 1, borderColor: '#E5EBED',
        backgroundColor: '#FAFCFC'
    },
    switchLabelWhite: { fontSize: 11, color: '#445158', flex: 1, marginRight: 4 },
    switchLabelYellow: { fontSize: 11, color: '#6B5A00', flex: 1, marginRight: 4 },
    switchLabelPurple: { fontSize: 11, color: '#6945A3', flex: 1, marginRight: 4 },
    switchLabelManual: { fontSize: 11, color: '#16757C', flex: 1, marginRight: 4 },
    switchLabelGreen: { fontSize: 11, color: '#4F755D', flex: 1, marginRight: 4 },
    switchLabelPink: { fontSize: 11, color: '#9C4D88', flex: 1, marginRight: 4 },
    centerFabButton: {
        height: 48, marginHorizontal: 12, marginBottom: Platform.OS === 'android' ? 8 : 4,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        backgroundColor: '#12A36F', borderRadius: 12, elevation: 4,
        shadowColor: '#123C35', shadowOpacity: 0.18, shadowOffset: { width: 0, height: 3 },
        shadowRadius: 6
    },
    centerFabText: { color: '#fff', fontWeight: '800', fontSize: 13.5, marginLeft: 7 },
});
export default CustomDrawer;
