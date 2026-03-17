import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    Modal,
    StyleSheet,
    Animated,
    Dimensions,
    ScrollView,
    ActivityIndicator,
    Alert
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';
import { CustomDrawerProps, DesignData, ItemData, ItemStatus } from './Modal';
import theme from '../../android/app/src/theme';
import SearchableDropdown from '../Shared/SearchableDropdown';
import { Switch } from 'react-native';
import axios from 'axios';
import { API } from '../../common/API/dynamicAPI';
import Snackbar from 'react-native-snackbar';
import FullScreenLoader from '../Loader/Loader';

const { height } = Dimensions.get('window');

// const CustomDrawer: React.FC<CustomDrawerProps> = ({
//     isVisible,
//     onClose,
//     selectedExe,
//     onExeChange,
//     onLoadPress,
//     exeData,
//     designData,
//     isLoading,
//     onDesignSelect,
//     onItemSelectItem,
//     itemData,
//     selectedItemStatus,
//     selectedDesigns,
//     selectedItems,
//     getAllPropertyData,
//     FormState,
//     setFormState,
//     getAllYearData,
//     getAllStoreData,
//     getAllStockData,
//     setAllStockData,
//     token
// }) => {
const CustomDrawer = (props) => {
    const { isVisible,
        onClose,
        selectedExe,
        onExeChange,
        onLoadPress,
        exeData,
        designData,
        isLoading,
        onDesignSelect,
        onItemSelectItem,
        itemData,
        selectedItemStatus,
        selectedDesigns,
        selectedItems,
        getAllPropertyData,
        FormState,
        setFormState,
        getAllYearData,
        getAllStoreData,
        getAllStockData,
        setAllStockData,
        token
    } = props;

    console.log("customedrewer FormState :", FormState)

    const slideAnim = useRef(new Animated.Value(0)).current;
    const [showFromDatePicker, setShowFromDatePicker] = useState(false);
    const [showToDatePicker, setShowToDatePicker] = useState(false);
    const [isYearDropdownOpen, setIsYearDropdownOpen] = useState(false);
    const [isExeDropdownOpen, setIsExeDropdownOpen] = useState(false);
    // 
    const [searchQuery, setSearchQuery] = useState('');
    // const [selectedDesigns, setSelectedDesigns] = useState<DesignData[]>([]);
    const [displayedDesigns, setDisplayedDesigns] = useState<DesignData[]>([]);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const scrollViewRef = useRef<ScrollView>(null);
    const [isDesignAccordionOpen, setIsDesignAccordionOpen] = useState(false);
    // 
    const [searchQueryItem, setSearchQueryItem] = useState('');
    // const [selectedItems, setSelectedItems] = useState<ItemData[]>([]);
    const [displayedItems, setDisplayedItems] = useState<ItemData[]>([]);
    const [isLoadingMoreItem, setIsLoadingMoreItem] = useState(false);
    const [hasMoreItem, setHasMoreItem] = useState(true);
    const scrollViewRefItem = useRef<ScrollView>(null);
    const [isDesignAccordionOpenItem, setIsDesignAccordionOpenItem] = useState(false);
    const [localItemStatus, setLocalItemStatus] = useState<ItemStatus>(selectedItemStatus || 'All');

    const [step, setStep] = useState(1);

    const yearOptions = ['2022-2023', '2023-2024', '2024-2025', '2025-2026'];

    //console.log("designData:", designData, "itemData:", itemData);

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

    const handleLoadPress = () => {
        onLoadPress();
        onDesignSelect(selectedDesigns); // Pass selected designs to parent.
        onItemSelectItem(selectedItems);
    };

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
        } else {
            setIsLoadingMore(true)
            console.log("handleLoaddata function ===> FormState.values ===> :", FormState.values)
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
                txntype: 'yarnStockVerification'
            };
            console.log('payload for get_verify_manual_stock API ', payload);
            const headers = {
                Authorization: `Bearer ${getToken()}`,
                'Content-Type': 'application/json',
                'X-Requested-with': 'XMLHttpRequest',
            };
            try {
                //setIsLoadingMore(false)
                console.log("API URL :", `${API}/api/get_verify_manual_stock`)
                const response = await axios.post(`${API}/api/get_verify_manual_stock`, payload, { headers });

                console.log("get_verify_manual_stock API response :", response.data)

                if (response.data.success === true && response.data.response.data.length === 0) {
                    //setIsLoadingMore(false)
                    Alert.alert('No Data Found');

                } else if (response.data.success === true && response.data.response.data.length > 0) {
                    //setIsLoadingMore(false)
                    setAllStockData(response.data.response.data);
                    onClose()
                } else if (response.data.success === false) {
                    //setIsLoadingMore(false)
                    Alert.alert(`${response.data.message}`);
                } else {
                    //setIsLoadingMore(false)
                    Alert.alert(`${response.data.message}`);
                }
            } catch (error) {
                //setIsLoadingMore(false)
                Alert.alert('Server Error :' + error)
            } finally {

                setIsLoadingMore(false)

            }
        }
    }

    const getToken = () => {
        return token;
    };

    const selectedProperty = getAllPropertyData?.find((p) => p.PrpCode == FormState.values.PrpCode) || null;
    const selectedYear = getAllYearData?.find((y) => y.YearNo == FormState.values.YearNo) || null;
    const selectedStore = getAllStoreData?.find((y) => y.StrCode == FormState.values.StrCode) || null;

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
                            end={{ x: 1, y: 0 }}
                        >
                            {/* Close Button */}
                            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                                <Icon name="close" size={28} color="#fff" />
                            </TouchableOpacity>

                            {/* Scrollable Form Container */}
                            <ScrollView
                                style={styles.scrollableFormContainer}
                                contentContainerStyle={styles.scrollableFormContent}
                                nestedScrollEnabled={true}
                            >
                                <View style={{ marginBottom: 10 }} >
                                    <Text style={styles.label}>Select Property <Text style={{ color: 'red' }}> * </Text></Text>

                                    <SearchableDropdown
                                        key={FormState.values.PrpCode}
                                        data={getAllPropertyData}
                                        labelKey="LngName"
                                        valueKey="PrpCode"
                                        placeholder="Choose property..."
                                        pageSize={10}
                                        //initialValue={getAllPropertyData ?? null}
                                        initialValue={selectedProperty}
                                        onSelect={(item) => {
                                            setFormState(FormState => ({
                                                ...FormState,
                                                values: {
                                                    ...FormState.values,
                                                    PrpCode: item?.PrpCode || '',
                                                }
                                            }));
                                            //setForm(prev => ({ ...prev, PrpCode: item?.PrpCode || '' }));
                                            //setSelectedPropertyGroup(item);
                                        }}
                                        multiple={false}
                                        emptyMessage="No properties available"
                                    />

                                </View>

                                {/**Year dropdown */}
                                <View style={{ marginBottom: 10 }} >
                                    <Text style={styles.label}>Select Year <Text style={{ color: 'red' }}> * </Text></Text>

                                    <SearchableDropdown
                                        key={FormState.values.YearNo}
                                        data={getAllYearData}
                                        labelKey="YearName"
                                        valueKey="YearNo"
                                        placeholder="Choose year..."
                                        pageSize={10}
                                        //initialValue={getAllYearData ?? null}
                                        initialValue={selectedYear}
                                        onSelect={(item) => {
                                            setFormState(FormState => ({
                                                ...FormState,
                                                values: {
                                                    ...FormState.values,
                                                    YearNo: item?.YearNo || '',
                                                }
                                            }));
                                            //setForm(prev => ({ ...prev, PrpCode: item?.PrpCode || '' }));
                                            //setSelectedPropertyGroup(item);
                                        }}
                                        multiple={false}
                                        emptyMessage="No years data available"
                                    />
                                </View>

                                {/**Store dropdown */}
                                <View style={{ marginBottom: 10 }} >
                                    <Text style={styles.label}>Select Store <Text style={{ color: 'red' }}> * </Text></Text>

                                    <SearchableDropdown
                                        key={FormState.values.StrCode}
                                        data={getAllStoreData}
                                        labelKey="StrName"
                                        valueKey="StrCode"
                                        placeholder="Choose sore..."
                                        pageSize={10}
                                        //initialValue={getAllStoreData ?? null}
                                        initialValue={selectedStore}
                                        onSelect={(item) => {
                                            // setFormState(FormState => ({
                                            //     ...FormState,
                                            //     values: {
                                            //         ...FormState.values,
                                            //         YearNo: '',
                                            //     }
                                            // }));

                                            setFormState(FormState => ({
                                                ...FormState,
                                                values: {
                                                    ...FormState.values,
                                                    StrCode: item?.StrCode || '',
                                                }
                                            }));
                                            //setForm(prev => ({ ...prev, PrpCode: item?.PrpCode || '' }));
                                            //setSelectedPropertyGroup(item);
                                        }}
                                        multiple={false}
                                        emptyMessage="No stores data available"
                                    />
                                </View>

                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 }}>

                                    {/* Update Stock */}
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
                                            thumbColor={"#fff"}
                                        />
                                    </View>

                                    {/* <View style={styles.cartonActionContainer}>
                                    <TouchableOpacity
                                        style={styles.cartonActionButton}
                                        onPress={() => console.log("Carton Action")}
                                        activeOpacity={0.8}
                                    >
                                        <Icon name="add" size={18} color="#000" />
                                        <Text style={styles.cartonActionText}>Add manual cartons</Text>
                                    </TouchableOpacity>
                                </View> */}
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
                                                thumbColor="#fff"
                                            />
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
                                                thumbColor="#fff"
                                            />
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
                                                thumbColor="#fff"
                                            />
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
                                                thumbColor="#fff"
                                            />
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
                                                thumbColor="#fff"
                                            />
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
                                                thumbColor="#fff"
                                            />
                                        </View>
                                    </View>
                                </View>
                            </ScrollView>
                            {/* Load Button (Fixed at Bottom) */}
                            {/* <View style={styles.loadButtonContainer}>
                            
                             <TouchableOpacity
                                style={styles.loadButton}
                                onPress={handleLoadPress}
                                activeOpacity={0.8}
                            >
                                {
                                    isLoading ?
                                        (
                                            <ActivityIndicator size="small" color={theme.BRAND_GRADIENT_END} />
                                        )
                                        :
                                        (
                                            <>
                                                <Icon name="cloud-download" size={20} color={theme.BRAND_GRADIENT_END} />
                                                <Text style={styles.loadButtonText}>Load Data</Text>
                                            </>
                                        )
                                }
                            </TouchableOpacity> 
                        </View> */}
                            <TouchableOpacity
                                style={styles.centerFabButton}
                                onPress={handleLoaddata}
                                activeOpacity={0.85}
                            >
                                {isLoading ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <>
                                        <Icon name="cloud-download" size={20} color="#fff" />
                                        <Text style={styles.centerFabText}>Load Data</Text>
                                    </>
                                )}
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
        //justifyContent: 'flex-end',
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
    stepIndicator: {
        alignItems: 'center',
        marginBottom: 0,
    },
    stepText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    formContainer: {
        flex: 1,
        padding: 0,
    },
    inputGroup: {
        marginBottom: 15,
        zIndex: 10,
    },
    label: {
        fontSize: 16,
        marginBottom: 5,
        color: '#fff',
    },
    dateInput: {
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 5,
        padding: 10,
        backgroundColor: 'rgba(255,255,255,0.2)',
    },
    dateText: {
        color: '#fff',
    },
    dropdownButton: {
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 5,
        padding: 10,
        backgroundColor: 'rgba(255,255,255,0.2)',
    },
    dropdownText: {
        color: '#fff',
    },
    dropdownOptionsContainer: {
        position: 'relative',
        left: 0,
        right: 0,
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 5,
        zIndex: 100,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        maxHeight: 200,
    },
    dropdownOption: {
        padding: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    dropdownOptionText: {
        color: '#333',
    },
    selectedOption: {
        backgroundColor: '#e0e0e0',
    },
    navigationContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: 10,
        marginTop: 'auto',
    },
    navButton: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        padding: 10,
        borderRadius: 5,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 8,
        paddingHorizontal: 10,
        marginBottom: 10,
    },
    searchInput: {
        flex: 1,
        padding: 10,
        color: '#fff',
    },
    searchIcon: {
        marginLeft: 10,
    },
    selectedDesignsContainer: {
        flexDirection: 'row',
        marginBottom: 10,
    },
    selectedDesignChip: {
        backgroundColor: 'rgba(255,255,255,0.3)',
        padding: 8,
        borderRadius: 12,
        marginRight: 5,
    },
    selectedDesignText: {
        color: '#fff',
        fontSize: 12,
    },
    designListContainer: {
        maxHeight: 300, // Fixed height for the design list
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)',
        borderRadius: 8,
        marginBottom: 10,
    },
    designListContent: {
        paddingBottom: 20
    },
    designItem: {
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.2)',
    },
    selectedDesignItem: {
        backgroundColor: 'rgba(255,255,255,0.2)',
    },
    designName: {
        color: '#fff',
        fontSize: 14,
    },
    designCode: {
        color: '#ccc',
        fontSize: 12,
    },
    loadingIndicator: {
        padding: 10,
    },
    accordionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 15,
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 8,
        marginBottom: 10,
    },
    accordionHeaderText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    scrollableFormContainer: {
        flex: 1,
        padding: 10,
    },
    scrollableFormContent: {
        paddingBottom: 80, // Extra space for the Load button
    },
    radioGroup: {
        flexDirection: 'row',
        marginBottom: 10,
    },
    radioButton: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 20,
    },
    radioCircle: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 5,
    },
    radioInnerCircle: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#fff',
    },
    radioLabel: {
        color: '#fff',
        fontSize: 14,
    },
    selectAllContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    selectAllButton: {
        backgroundColor: 'rgba(255,255,255,0.3)',
        padding: 10,
        borderRadius: 8,
        marginRight: 10,
        alignItems: 'center',
    },
    selectAllButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: 'bold',
    },
    removeAllButton: {
        backgroundColor: 'rgba(255,255,255,0.3)',
        padding: 8,
        borderRadius: 12,
    },
    label1: {
        paddingVertical: 5,
        //paddingHorizontal: 10,
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
    switchRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 8,
        borderBottomWidth: 0.5,
        borderBottomColor: "#EAEAEA"
    },
    switchLabel: {
        fontSize: 14,
        color: "#444",
        width: "70%",
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
        //color: "#BBC443",
        color: "#444",
        width: "70%",
        backgroundColor: "#F1FA73",
        padding: 5,
        borderRadius: 8
    },
    switchLabelPurple: {
        fontSize: 14,
        //color: "#BBC443",
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
    loadButtonContainer: {
        position: 'absolute',
        bottom: 20,
        left: 20,
        right: 20,
    },
    loadButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#fff",
        paddingVertical: 14,
        borderRadius: 8,
        elevation: 6
    },
    loadButtonText: {
        fontSize: 16,
        fontWeight: "600",
        color: theme.BRAND_GRADIENT_END,
        marginLeft: 8
    },
    cartonActionContainer: {
        alignItems: "center",
        marginTop: 10
    },

    cartonActionButton: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#98FAF3",
        paddingVertical: 6,
        paddingHorizontal: 16,
        borderRadius: 5,
        elevation: 3
    },

    cartonActionText: {
        color: "#000",
        fontSize: 13,
        fontWeight: "600",
        marginLeft: 5
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
