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
    Alert,
    TextInput as RNTextInput,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';
import { DesignData, ItemData, ItemStatus } from './Modal';
import theme from '../../android/app/src/theme';
import SearchableDropdown from '../Shared/SearchableDropdown';
import { Switch } from 'react-native';
import axios from 'axios';
import { API } from '../../common/API/dynamicAPI';
import Snackbar from 'react-native-snackbar';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { height } = Dimensions.get('window');

const CartonAddDrawer = (props) => {
    const { isVisible,
        onClose,
        //selectedExe,
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
        token,
        setFormCartonDataState,
        FormCartonDataState
    } = props;

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

    const [getItemData, setItemData] = useState([])
    const [getMergeData, setMergeData] = useState([])
    const [getGradeData, setGradeData] = useState([])
    const [getShadeData, setShadeData] = useState([])
    const [getStockTypes, setStockTypes] = useState([{ 'label': 'I', 'value': 'I' }, { 'label': 'P', 'value': 'P' }])

    //console.log("designData:", designData, "itemData:", itemData);

    // useEffect(() => {
    //     if (exeData.length > 0 && !selectedExe) {
    //         onExeChange(exeData[0]);
    //     }
    // }, [exeData, selectedExe, onExeChange]);



    // useEffect(() => {
    //     const filtered = designData.filter(
    //         (design) =>
    //             design.DsnName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    //             design.DsnCode.toLowerCase().includes(searchQuery.toLowerCase())
    //     );
    //     const filtereditem = itemData.filter(
    //         (item) =>
    //             item.ItmName.toLowerCase().includes(searchQueryItem.toLowerCase()) ||
    //             item.ItmCode.toLowerCase().includes(searchQueryItem.toLowerCase())
    //     );
    //     setDisplayedDesigns(filtered.slice(0, 10));
    //     setDisplayedItems(filtereditem.slice(0, 10));
    //     setHasMore(filtered.length > 10);
    //     setHasMoreItem(filtereditem.length > 10);
    // }, [searchQuery, designData, searchQueryItem, itemData]);


    // React.useEffect(() => {
    //     Animated.timing(slideAnim, {
    //         toValue: isVisible ? 0 : height,
    //         duration: 300,
    //         useNativeDriver: true,
    //     }).start();
    // }, [isVisible]);

    // useEffect(() => {
    //     setLocalItemStatus(selectedItemStatus);
    // }, [selectedItemStatus]);

    // const handleLoadPress = () => {
    //     onLoadPress();
    //     onDesignSelect(selectedDesigns); // Pass selected designs to parent.
    //     onItemSelectItem(selectedItems);
    // };

    const handleSaveCarton = async () => {
        console.log("FormCartonDataState.values :", FormCartonDataState.values)
        if (typeof FormCartonDataState.values.PrpCode == 'undefined' || FormCartonDataState.values.PrpCode == null || FormCartonDataState.values.PrpCode == '') {
            Snackbar.show({
                text: 'Please select property',
                duration: Snackbar.LENGTH_LONG,
                backgroundColor: 'red',
                textColor: '#fff',
                action: { text: 'OK', textColor: 'white' },
            });
        } else if (typeof FormCartonDataState.values.YearNo == 'undefined' || FormCartonDataState.values.YearNo == null || FormCartonDataState.values.YearNo == '') {
            Snackbar.show({
                text: 'Please select year',
                duration: Snackbar.LENGTH_LONG,
                backgroundColor: 'red',
                textColor: '#fff',
                action: { text: 'OK', textColor: 'white' },
            });
        } else if (typeof FormCartonDataState.values.StrCode == 'undefined' || FormCartonDataState.values.StrCode == null || FormCartonDataState.values.StrCode == '') {
            Snackbar.show({
                text: 'Please select store',
                duration: Snackbar.LENGTH_LONG,
                backgroundColor: 'red',
                textColor: '#fff',
                action: { text: 'OK', textColor: 'white' },
            });
        } else if (typeof FormCartonDataState.values.CartNo == 'undefined' || FormCartonDataState.values.CartNo == null || FormCartonDataState.values.CartNo == '') {
            Snackbar.show({
                text: 'Carton no. can not be balnk or empty',
                duration: Snackbar.LENGTH_LONG,
                backgroundColor: 'red',
                textColor: '#fff',
                action: { text: 'OK', textColor: 'white' },
            });
        } else if (typeof FormCartonDataState.values.Chees == 'undefined' || FormCartonDataState.values.Chees == null || FormCartonDataState.values.Chees == '' || parseFloat(FormCartonDataState.values.Chees) <= 0) {
            Snackbar.show({
                text: 'Chees can not be balnk or empty or 0',
                duration: Snackbar.LENGTH_LONG,
                backgroundColor: 'red',
                textColor: '#fff',
                action: { text: 'OK', textColor: 'white' },
            });
        } else if (typeof FormCartonDataState.values.ItmCode == 'undefined' || FormCartonDataState.values.ItmCode == null || FormCartonDataState.values.ItmCode == '') {
            Snackbar.show({
                text: 'Item can not be balnk or empty',
                duration: Snackbar.LENGTH_LONG,
                backgroundColor: 'red',
                textColor: '#fff',
                action: { text: 'OK', textColor: 'white' },
            });
        } else if (typeof FormCartonDataState.values.MerCode == 'undefined' || FormCartonDataState.values.MerCode == null || FormCartonDataState.values.MerCode == '') {
            Snackbar.show({
                text: 'Merge can not be balnk or empty',
                duration: Snackbar.LENGTH_LONG,
                backgroundColor: 'red',
                textColor: '#fff',
                action: { text: 'OK', textColor: 'white' },
            });
        } else if (typeof FormCartonDataState.values.GrdCode == 'undefined' || FormCartonDataState.values.GrdCode == null || FormCartonDataState.values.GrdCode == '') {
            Snackbar.show({
                text: 'Grade can not be balnk or empty',
                duration: Snackbar.LENGTH_LONG,
                backgroundColor: 'red',
                textColor: '#fff',
                action: { text: 'OK', textColor: 'white' },
            });
        } else if (typeof FormCartonDataState.values.ShdCode == 'undefined' || FormCartonDataState.values.ShdCode == null || FormCartonDataState.values.ShdCode == '') {
            Snackbar.show({
                text: 'Shade can not be balnk or empty',
                duration: Snackbar.LENGTH_LONG,
                backgroundColor: 'red',
                textColor: '#fff',
                action: { text: 'OK', textColor: 'white' },
            });
        } else if (typeof FormCartonDataState.values.Denier == 'undefined' || FormCartonDataState.values.Denier == null || FormCartonDataState.values.Chees == '') {
            Snackbar.show({
                text: 'Denier can not be balnk or empty or 0',
                duration: Snackbar.LENGTH_LONG,
                backgroundColor: 'red',
                textColor: '#fff',
                action: { text: 'OK', textColor: 'white' },
            });
        } else if (typeof FormCartonDataState.values.grsWt == 'undefined' || FormCartonDataState.values.grsWt == null || FormCartonDataState.values.grsWt == '' || parseFloat(FormCartonDataState.values.grsWt) <= 0) {
            Snackbar.show({
                text: 'Gross wt. can not be balnk or empty or 0',
                duration: Snackbar.LENGTH_LONG,
                backgroundColor: 'red',
                textColor: '#fff',
                action: { text: 'OK', textColor: 'white' },
            });
        } else if (typeof FormCartonDataState.values.netWt == 'undefined' || FormCartonDataState.values.netWt == null || FormCartonDataState.values.netWt == '' || parseFloat(FormCartonDataState.values.netWt) <= 0) {
            Snackbar.show({
                text: 'Net wt. can not be balnk or empty or 0',
                duration: Snackbar.LENGTH_LONG,
                backgroundColor: 'red',
                textColor: '#fff',
                action: { text: 'OK', textColor: 'white' },
            });
        } else {
            // console.log("handleLoaddata function ===> FormCartonDataState.values ===> :", FormCartonDataState.values)
            // setAllStockData([])
            const payload = {
                prptype: 'S',
                prpcodes: [FormCartonDataState.values.PrpCode],
                yearno: FormCartonDataState.values.YearNo,
                strcode: FormCartonDataState.values.StrCode,
                CartNo: FormCartonDataState.values.CartNo,
                Chees: FormCartonDataState.values.Chees,
                ItmCode: FormCartonDataState.values.ItmCode,
                MerCode: FormCartonDataState.values.MerCode,
                GrdCode: FormCartonDataState.values.GrdCode,
                ShdCode: FormCartonDataState.values.ShdCode,
                Denier: FormCartonDataState.values.Denier,
                GrsWt: FormCartonDataState.values.grsWt,
                NetWt: FormCartonDataState.values.netWt,
                StkType: FormCartonDataState.values.StkType,
                //updateStock: '1', //FormState.values.updateStock,
                //autoFound: typeof FormState.values.autoFound == 'undefined' || FormState.values.autoFound == null || FormState.values.autoFound == '' ? '0' : FormState.values.autoFound,
                //manual: typeof FormState.values.manual == 'undefined' || FormState.values.manual == null || FormState.values.manual == '' ? '0' : FormState.values.manual,
                //stockNotFound: typeof FormState.values.stockNotFound == 'undefined' || FormState.values.stockNotFound == null || FormState.values.stockNotFound == '' ? '0' : FormState.values.stockNotFound,
                //autoNotFound: typeof FormState.values.autoNotFound == 'undefined' || FormState.values.autoNotFound == null || FormState.values.autoNotFound == '' ? '0' : FormState.values.autoNotFound,
                //autoForRepacking: typeof FormState.values.autoForRepacking == 'undefined' || FormState.values.autoForRepacking == null || FormState.values.autoForRepacking == '' ? '0' : FormState.values.autoForRepacking,
                //duplicate: typeof FormState.values.duplicate == 'undefined' || FormState.values.duplicate == null || FormState.values.duplicate == '' ? '0' : FormState.values.duplicate,
                txntype: 'yarnStockVerification'
            };
            console.log('payload for get_verify_manual_stock API ', payload);
            const headers = {
                Authorization: `Bearer ${getToken()}`,
                'Content-Type': 'application/json',
                'X-Requested-with': 'XMLHttpRequest',
            };
            try {

                console.log("API URL :", `${API}/api/insert_verify_manual_stock`)
                const response = await axios.post(`${API}/api/insert_verify_manual_stock`, payload, { headers });

                console.log("insert_verify_manual_stock API response :", response.data)

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
            }
        }
    }

    const getToken = () => {
        return token;
    };


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
    const getAllItems = async () => {

        if (cancelToken?.cancel) cancelToken.cancel();
        cancelToken = axios.CancelToken.source();

        let yno = await AsyncStorage.getItem('yno');

        try {
            const historyPayload = {
                prpcode: FormCartonDataState.values.PrpCode,
                yearno: FormCartonDataState.values.YearNo,
                strcode: FormCartonDataState.values.StrCode,
                itemcode: '',
                itemname: '',
                isall: '1',
                txntype: 'yarnStockVerification',
                billdate: '',
                ttype: ['8', '3', '30', '2', '34', '83', '42'],
                fetch: ''
            };
            console.log("payload of itemdrop :", historyPayload);
            const response = await axios.get(
                `${API}/api/itemdrop`, getRequestConfig(
                    {
                        params: { ...historyPayload }
                    }
                )
            );
            console.log("itemdrop API URL :", `${API}/api/itemdrop`);
            console.log("response of itemdrop :", response.data.response.data);
            if (response.data.response.data.length > 0) {
                setItemData(response.data.response.data);
            } else {
                setItemData([]);
            }
        } catch (error) {
            console.log("item API error:", error);
        } finally {
            //setIsLoading(false)
        }
    }
    const getAllMerges = async () => {

        if (cancelToken?.cancel) cancelToken.cancel();
        cancelToken = axios.CancelToken.source();

        let yno = await AsyncStorage.getItem('yno');

        try {
            const historyPayload = {
                prpcode: FormCartonDataState.values.PrpCode,
                yearno: FormCartonDataState.values.YearNo,
                strcode: FormCartonDataState.values.StrCode,
                itemcode: '',
                itemname: '',
                isall: 1,
                txntype: 'yarnStockVerification',
                billdate: ''
            };

            const response = await axios.get(
                `${API}/api/mergedrop`, getRequestConfig(
                    {
                        params: { ...historyPayload }
                    }
                )
            );

            if (response.data.response.data.length > 0) {
                setMergeData(response.data.response.data);
            } else {
                setMergeData([]);
            }
        } catch (error) {
            console.log("shade API error:", error);
        } finally {
            //setIsLoading(false)
        }
    }
    const getAllGrades = async () => {

        if (cancelToken?.cancel) cancelToken.cancel();
        cancelToken = axios.CancelToken.source();

        let yno = await AsyncStorage.getItem('yno');

        try {
            const historyPayload = {
                prpcode: FormCartonDataState.values.PrpCode,
                yearno: FormCartonDataState.values.YearNo,
                strcode: FormCartonDataState.values.StrCode,
                itemcode: '',
                itemname: '',
                isall: 1,
                txntype: 'yarnStockVerification',
                billdate: '',
                ttype: ['8', '3', '30', '2', '34', '83', '42'],
                fetch: 'grade',

            };
            console.log("payload for gradedrop api :", historyPayload)
            console.log("URL for gradedrop api :", `${API}/api/gradedrop`)
            const response = await axios.get(
                `${API}/api/gradedrop`, getRequestConfig(
                    {
                        params: { ...historyPayload }
                    }
                )
            );
            console.log("response for gradedrop api :", response.data)
            if (response.data.response.data.length > 0) {
                setGradeData(response.data.response.data);
            } else {
                setGradeData([]);
            }
        } catch (error) {
            console.log("grade API error:", error);
        } finally {
            //setIsLoading(false)
        }
    }
    const getAllShades = async () => {

        if (cancelToken?.cancel) cancelToken.cancel();
        cancelToken = axios.CancelToken.source();

        let yno = await AsyncStorage.getItem('yno');

        try {
            const historyPayload = {
                prpcode: FormCartonDataState.values.PrpCode,
                yearno: FormCartonDataState.values.YearNo,
                strcode: FormCartonDataState.values.StrCode,
                itemcode: '',
                itemname: '',
                isall: 1,
                txntype: 'yarnStockVerification',
                billdate: ''
            };

            const response = await axios.get(
                `${API}/api/shadedrop`, getRequestConfig(
                    {
                        params: { ...historyPayload }
                    }
                )
            );

            if (response.data.response.data.length > 0) {
                setShadeData(response.data.response.data);
            } else {
                setShadeData([]);
            }
        } catch (error) {
            console.log("grade API error:", error);
        } finally {
            //setIsLoading(false)
        }
    }

    useEffect(() => {

        if (typeof FormCartonDataState.values.PrpCode != 'undefined' && FormCartonDataState.values.PrpCode != null && FormCartonDataState.values.PrpCode != ''
            && typeof FormCartonDataState.values.YearNo != 'undefined' && FormCartonDataState.values.YearNo != null && FormCartonDataState.values.YearNo != ''
            && typeof FormCartonDataState.values.StrCode != 'undefined' && FormCartonDataState.values.StrCode != null && FormCartonDataState.values.StrCode != '') {

            getAllItems();
            getAllMerges();
            getAllGrades();
            getAllShades();
        }

    }, [FormCartonDataState.values.PrpCode, FormCartonDataState.values.YearNo, FormCartonDataState.values.StrCode])



    const handleChange = (name, value) => {
        console.log("name:", name);
        console.log("value:", value);

        setFormCartonDataState(prev => ({
            ...prev,
            values: {
                ...prev.values,
                [name]: value
            }
        }));
    };
    // const handleChange = event => {

    //     console.log("event.target.name", event.target.name, event.target.value)
    //     event.persist();

    //     setFormCartonDataState(FormCartonDataState => ({
    //         ...FormCartonDataState,
    //         values: {
    //             ...FormCartonDataState.values,
    //             [event.target.name]:
    //                 event.target.type === 'checkbox'
    //                     ? event.target.checked
    //                         ? '1'
    //                         : '0'
    //                     : event.target.value
    //         }
    //     }));
    // };

    const handleClearForm = () => {

        setFormCartonDataState(prev => ({
            ...prev,
            values: {
                PrpCode: '',
                YearNo: '',
                StrCode: '',
                CartNo: '',
                Chees: '',
                ItmCode: '',
                MerCode: '',
                GrdCode: '',
                ShdCode: '',
                Denier: '',
                grsWt: '',
                netWt: '',
                StkType: ''
            }
        }));

    };
    return (
        <Modal visible={isVisible} transparent animationType="none" onRequestClose={onClose}>
            <View style={styles.modalOverlay}>
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
                                    data={getAllPropertyData}
                                    labelKey="LngName"
                                    valueKey="PrpCode"
                                    placeholder="Choose property..."
                                    pageSize={10}
                                    initialValue={getAllPropertyData ?? null}
                                    onSelect={(item) => {
                                        setFormCartonDataState(FormCartonDataState => ({
                                            ...FormCartonDataState,
                                            values: {
                                                ...FormCartonDataState.values,
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
                                    data={getAllYearData}
                                    labelKey="YearName"
                                    valueKey="YearNo"
                                    placeholder="Choose year..."
                                    pageSize={10}
                                    initialValue={getAllYearData ?? null}
                                    onSelect={(yr) => {
                                        setFormCartonDataState(FormCartonDataState => ({
                                            ...FormCartonDataState,
                                            values: {
                                                ...FormCartonDataState.values,
                                                YearNo: yr?.YearNo || '',
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
                                <Text style={styles.label}>Select store <Text style={{ color: 'red' }}> * </Text></Text>

                                <SearchableDropdown
                                    data={getAllStoreData}
                                    labelKey="StrName"
                                    valueKey="StrCode"
                                    placeholder="Choose sore..."
                                    pageSize={10}
                                    initialValue={getAllStoreData ?? null}
                                    onSelect={(str) => {
                                        setFormCartonDataState(FormCartonDataState => ({
                                            ...FormCartonDataState,
                                            values: {
                                                ...FormCartonDataState.values,
                                                StrCode: str?.StrCode || '',
                                            }
                                        }));
                                        //setForm(prev => ({ ...prev, PrpCode: item?.PrpCode || '' }));
                                        //setSelectedPropertyGroup(item);
                                    }}
                                    multiple={false}
                                    emptyMessage="No stores data available"
                                />
                            </View>
                            <View style={styles.rowInputs}>
                                <View style={styles.halfInput}>
                                    <Text style={styles.label}>Carton no <Text style={{ color: 'red' }}> * </Text></Text>
                                    <RNTextInput
                                        style={styles.editableValueBlack}
                                        value={FormCartonDataState.values.CartNo}
                                        //onChange={handleChange}
                                        onChangeText={(text) => handleChange("CartNo", text)}
                                    //keyboardType="numeric"
                                    />
                                </View>
                                <View style={styles.halfInput}>
                                    <Text style={styles.label}>Chees <Text style={{ color: 'red' }}> * </Text></Text>
                                    <RNTextInput
                                        style={styles.editableValueBlack}
                                        value={FormCartonDataState.values.Chees}
                                        //onChangeText={handleChange(e)}
                                        //onChange={handleChange}
                                        onChangeText={(text) => handleChange("Chees", text)}
                                        keyboardType="numeric"
                                    />
                                </View>
                            </View>
                            <View style={{ marginBottom: 10 }} >
                                <Text style={styles.label}>Select Item <Text style={{ color: 'red' }}> * </Text></Text>

                                <SearchableDropdown
                                    data={getItemData}
                                    labelKey="ItmName"
                                    valueKey="ItmCode"
                                    placeholder="Choose item..."
                                    pageSize={10}
                                    initialValue={getItemData ?? null}
                                    onSelect={(itm) => {
                                        setFormCartonDataState(FormCartonDataState => ({
                                            ...FormCartonDataState,
                                            values: {
                                                ...FormCartonDataState.values,
                                                ItmCode: itm?.ItmCode || '',
                                                Denier: itm?.Denier || '',
                                            }
                                        }));
                                        //setForm(prev => ({ ...prev, PrpCode: item?.PrpCode || '' }));
                                        //setSelectedPropertyGroup(item);
                                    }}
                                    multiple={false}
                                    emptyMessage="No years data available"
                                />
                            </View>
                            <View style={{ marginBottom: 10 }} >
                                <Text style={styles.label}>Select merge <Text style={{ color: 'red' }}> * </Text></Text>

                                <SearchableDropdown
                                    data={getMergeData}
                                    labelKey="MerName"
                                    valueKey="MerCode"
                                    placeholder="Choose merge..."
                                    pageSize={10}
                                    initialValue={getMergeData ?? null}
                                    onSelect={(mrg) => {
                                        setFormCartonDataState(FormCartonDataState => ({
                                            ...FormCartonDataState,
                                            values: {
                                                ...FormCartonDataState.values,
                                                MerCode: mrg?.MerCode || '',
                                            }
                                        }));
                                        //setForm(prev => ({ ...prev, PrpCode: item?.PrpCode || '' }));
                                        //setSelectedPropertyGroup(item);
                                    }}
                                    multiple={false}
                                    emptyMessage="No years data available"
                                />
                            </View>
                            <View style={{ marginBottom: 10 }} >
                                <Text style={styles.label}>Select grade <Text style={{ color: 'red' }}> * </Text></Text>

                                <SearchableDropdown
                                    data={getGradeData}
                                    labelKey="GrdName"
                                    valueKey="GrdCode"
                                    placeholder="Choose grade..."
                                    pageSize={10}
                                    initialValue={getGradeData ?? null}
                                    onSelect={(grd) => {
                                        setFormCartonDataState(FormCartonDataState => ({
                                            ...FormCartonDataState,
                                            values: {
                                                ...FormCartonDataState.values,
                                                GrdCode: grd?.GrdCode || '',
                                            }
                                        }));
                                        //setForm(prev => ({ ...prev, PrpCode: item?.PrpCode || '' }));
                                        //setSelectedPropertyGroup(item);
                                    }}
                                    multiple={false}
                                    emptyMessage="No years data available"
                                />
                            </View>
                            <View style={{ marginBottom: 10 }} >
                                <Text style={styles.label}>Select shade <Text style={{ color: 'red' }}> * </Text></Text>

                                <SearchableDropdown
                                    data={getShadeData}
                                    labelKey="ShdName"
                                    valueKey="ShdCode"
                                    placeholder="Choose shade..."
                                    pageSize={10}
                                    initialValue={getShadeData ?? null}
                                    onSelect={(shd) => {
                                        setFormCartonDataState(FormCartonDataState => ({
                                            ...FormCartonDataState,
                                            values: {
                                                ...FormCartonDataState.values,
                                                ShdCode: shd?.ShdCode || '',
                                            }
                                        }));
                                        //setForm(prev => ({ ...prev, PrpCode: item?.PrpCode || '' }));
                                        //setSelectedPropertyGroup(item);
                                    }}
                                    multiple={false}
                                    emptyMessage="No shade data available"
                                />
                            </View>
                            <View style={{ marginBottom: 10 }} >
                                <Text style={styles.label}>Denier <Text style={{ color: 'red' }}> * </Text></Text>

                                <RNTextInput
                                    style={styles.editableValueBlack}
                                    value={FormCartonDataState.values.Denier}
                                    //onChangeText={handleChange}
                                    //onChange={handleChange}
                                    onChangeText={(text) => handleChange("Denier", text)}
                                    keyboardType="numeric"
                                />
                            </View>

                            <View style={styles.rowInputs}>
                                <View style={styles.halfInput}>
                                    <Text style={styles.label}>Gross wt. <Text style={{ color: 'red' }}> * </Text></Text>
                                    <RNTextInput
                                        style={styles.editableValueBlack}
                                        value={FormCartonDataState.values.grsWt}
                                        //onChangeText={handleChange}
                                        //onChange={handleChange}
                                        onChangeText={(text) => handleChange("grsWt", text)}
                                        keyboardType="numeric"
                                    />
                                </View>
                                <View style={styles.halfInput}>
                                    <Text style={styles.label}>Net wt. <Text style={{ color: 'red' }}> * </Text></Text>
                                    <RNTextInput
                                        style={styles.editableValueBlack}
                                        value={FormCartonDataState.values.netWt}
                                        //onChangeText={handleChange}
                                        //onChange={handleChange}
                                        onChangeText={(text) => handleChange("netWt", text)}
                                        keyboardType="numeric"
                                    />
                                </View>
                            </View>

                            <View style={{ marginBottom: 10 }} >
                                <Text style={styles.label}>Select stock type <Text style={{ color: 'red' }}> * </Text></Text>

                                <SearchableDropdown
                                    data={getStockTypes}
                                    labelKey="label"
                                    valueKey="value"
                                    placeholder="Choose property..."
                                    pageSize={10}
                                    initialValue={getStockTypes ?? null}
                                    onSelect={(stk) => {
                                        setFormCartonDataState(FormCartonDataState => ({
                                            ...FormCartonDataState,
                                            values: {
                                                ...FormCartonDataState.values,
                                                StkType: stk?.value || '',
                                            }
                                        }));
                                        //setForm(prev => ({ ...prev, PrpCode: item?.PrpCode || '' }));
                                        //setSelectedPropertyGroup(item);
                                    }}
                                    multiple={false}
                                    emptyMessage="No stock types data available"
                                />
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
                        <View style={styles.bottomButtonContainer}>

                            <TouchableOpacity
                                style={styles.cancelButton}
                                onPress={handleClearForm}
                                activeOpacity={0.85}
                            >
                                <Icon name="delete-sweep" size={20} color="#fff" />
                                <Text style={styles.bottomBtnText}>Clear</Text>
                            </TouchableOpacity>
                            {/* <TouchableOpacity
                                style={styles.cancelButton}
                                onPress={onClose}
                                activeOpacity={0.85}
                            >
                                <Icon name="close" size={20} color="#fff" />
                                <Text style={styles.bottomBtnText}>Cancel</Text>
                            </TouchableOpacity> */}

                            <TouchableOpacity
                                style={styles.loadButtonNew}
                                onPress={handleSaveCarton}
                                activeOpacity={0.85}
                            >
                                {isLoading ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <>
                                        <Icon name="send" size={20} color="#fff" />
                                        <Text style={styles.bottomBtnText}>Submit</Text>
                                    </>
                                )}
                            </TouchableOpacity>

                        </View>
                        {/* <TouchableOpacity
                            style={styles.centerFabButton}
                            onPress={handleSaveCarton}
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
                        </TouchableOpacity> */}
                    </LinearGradient>
                </Animated.View>
            </View>
        </Modal>
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
    editableValueBlack: {
        fontSize: 14,
        color: 'rgb(0, 0, 0)',
        borderWidth: 1,
        borderColor: 'rgba(0, 0, 0, 0.1)',
        borderRadius: 5,
        padding: 4,
        backgroundColor: 'rgb(255, 255, 255)',
    },
    rowInputs: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 10
    },

    halfInput: {
        width: "48%"
    },
    bottomButtonContainer: {
        position: "absolute",
        bottom: 20,
        left: 15,
        right: 15,
        flexDirection: "row",
        justifyContent: "space-between"
    },

    cancelButton: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#d9534f",
        paddingVertical: 12,
        borderRadius: 8,
        marginRight: 10,
        elevation: 3
    },

    loadButtonNew: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#17b85a",
        paddingVertical: 12,
        borderRadius: 8,
        elevation: 3
    },

    bottomBtnText: {
        color: "#fff",
        fontWeight: "600",
        fontSize: 14,
        marginLeft: 6
    }
});

export default CartonAddDrawer;
