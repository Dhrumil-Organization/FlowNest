import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Animated,
    Dimensions,
    ScrollView,
    FlatList,
    Modal,
    Platform,
    StatusBar,
    ActivityIndicator,
    Alert,
    TextInput as RNTextInput,
    Switch,
} from 'react-native';
import Icon from '@expo/vector-icons/MaterialIcons';
import theme from '@/components/theme';
import axios from 'axios';
import { API } from '../../common/API/dynamicAPI';
// import Snackbar from 'react-native-snackbar';
import { showSnackbar, showSuccess, showError, showWarning } from '@/common/utils/snackbar';
import FullScreenLoader from '@/components/FullScreenLoader';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
// import { values } from 'lodash';

const LargeSearchDropdown = ({
    data = [],
    labelKey,
    valueKey,
    value = '',
    placeholder,
    onSelect,
    loading = false,
    emptyMessage = 'No data available',
}) => {
    const [visible, setVisible] = useState(false);
    const [search, setSearch] = useState('');

    const selectedItem = data.find(
        (item) => String(item?.[valueKey] ?? '') === String(value ?? '')
    );

    const filteredData = React.useMemo(() => {
        const query = search.trim().toLowerCase();
        if (!query) return data;

        return data.filter((item) =>
            String(item?.[labelKey] ?? '').toLowerCase().includes(query) ||
            String(item?.[valueKey] ?? '').toLowerCase().includes(query)
        );
    }, [data, search, labelKey, valueKey]);

    const openDropdown = () => {
        setSearch('');
        setVisible(true);
    };

    const closeDropdown = () => {
        setSearch('');
        setVisible(false);
    };

    const handleSelect = (item) => {
        onSelect?.(item);
        closeDropdown();
    };

    const typeLabel =
        labelKey === 'DsnName'
            ? 'Design'
            : labelKey === 'ItmName'
                ? 'Item'
                : labelKey === 'ShdName'
                    ? 'Shade'
                    : 'Stock Type';

    return (
        <>
            <TouchableOpacity
                style={castyles.dropdownTrigger}
                onPress={openDropdown}
                activeOpacity={0.8}
            >
                <Text
                    style={[
                        castyles.dropdownValue,
                        !selectedItem && castyles.dropdownPlaceholder,
                    ]}
                    numberOfLines={1}
                >
                    {selectedItem
                        ? String(selectedItem?.[labelKey] ?? '')
                        : placeholder}
                </Text>
                <Icon name="keyboard-arrow-down" size={24} color="#52656C" />
            </TouchableOpacity>

            <Modal
                visible={visible}
                transparent
                animationType="fade"
                statusBarTranslucent
                onRequestClose={closeDropdown}
            >
                <View style={castyles.dropdownOverlay}>
                    <TouchableOpacity
                        style={castyles.dropdownBackdrop}
                        activeOpacity={1}
                        onPress={closeDropdown}
                    />

                    <View style={castyles.dropdownModal}>
                        <View style={castyles.dropdownHeader}>
                            <View style={{ flex: 1 }}>
                                <Text style={castyles.dropdownTitle}>
                                    Select {typeLabel}
                                </Text>
                                <Text style={castyles.dropdownCount}>
                                    {loading
                                        ? 'Loading data...'
                                        : `${filteredData.length} option${filteredData.length === 1 ? '' : 's'}`}
                                </Text>
                            </View>

                            <TouchableOpacity
                                style={castyles.dropdownClose}
                                onPress={closeDropdown}
                                activeOpacity={0.8}
                            >
                                <Icon name="close" size={24} color="#203238" />
                            </TouchableOpacity>
                        </View>

                        <View style={castyles.dropdownSearchWrap}>
                            <Icon name="search" size={21} color="#71848B" />
                            <RNTextInput
                                value={search}
                                onChangeText={setSearch}
                                placeholder={`Search ${typeLabel.toLowerCase()}...`}
                                placeholderTextColor="#8A989D"
                                style={castyles.dropdownSearchInput}
                                autoCorrect={false}
                                autoCapitalize="none"
                            />
                            {!!search && (
                                <TouchableOpacity
                                    onPress={() => setSearch('')}
                                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                >
                                    <Icon name="cancel" size={20} color="#8A989D" />
                                </TouchableOpacity>
                            )}
                        </View>

                        {loading ? (
                            <View style={castyles.dropdownLoading}>
                                <ActivityIndicator size="small" color="#087FA3" />
                                <Text style={castyles.dropdownLoadingText}>
                                    Loading {typeLabel.toLowerCase()}s...
                                </Text>
                                <Text style={castyles.dropdownLoadingHint}>
                                    The list will appear automatically when the API response is ready.
                                </Text>
                            </View>
                        ) : filteredData.length === 0 ? (
                            <View style={castyles.dropdownEmpty}>
                                <Icon name="search-off" size={34} color="#A2B0B5" />
                                <Text style={castyles.dropdownEmptyTitle}>
                                    {search ? 'No matching data' : emptyMessage}
                                </Text>
                                {search ? (
                                    <Text style={castyles.dropdownEmptyText}>
                                        Try a different name or code.
                                    </Text>
                                ) : null}
                            </View>
                        ) : (
                            <FlatList
                                data={filteredData}
                                keyExtractor={(item, index) =>
                                    `${String(item?.[valueKey] ?? index)}-${index}`
                                }
                                keyboardShouldPersistTaps="handled"
                                showsVerticalScrollIndicator
                                initialNumToRender={20}
                                maxToRenderPerBatch={30}
                                windowSize={8}
                                renderItem={({ item }) => {
                                    const isSelected =
                                        String(item?.[valueKey] ?? '') === String(value ?? '');

                                    return (
                                        <TouchableOpacity
                                            style={[
                                                castyles.dropdownOption,
                                                isSelected && castyles.dropdownOptionSelected,
                                            ]}
                                            onPress={() => handleSelect(item)}
                                            activeOpacity={0.75}
                                        >
                                            <View style={castyles.dropdownOptionTextWrap}>
                                                <Text
                                                    style={[
                                                        castyles.dropdownOptionLabel,
                                                        isSelected && castyles.dropdownOptionLabelSelected,
                                                    ]}
                                                    numberOfLines={2}
                                                >
                                                    {String(item?.[labelKey] ?? '--')}
                                                </Text>
                                                <Text style={castyles.dropdownOptionCode}>
                                                    {String(item?.[valueKey] ?? '')}
                                                </Text>
                                            </View>

                                            {isSelected && (
                                                <Icon name="check-circle" size={22} color="#087FA3" />
                                            )}
                                        </TouchableOpacity>
                                    );
                                }}
                            />
                        )}
                    </View>
                </View>
            </Modal>
        </>
    );
};

const CartonAddDrawer = (props) => {
    const { isVisible,
        onClose,
        isLoading,
        getAllPropertyData,
        FormState,
        setFormState,
        getAllYearData,
        getAllStoreData,
        setAllStockData,
        token,
        setFormCartonDataState,
        FormCartonDataState,
        getAllStockDataInserted,
        setAllStockDataInserted
    } = props;

    const slideAnim = useRef(new Animated.Value(0)).current;
    const insets = useSafeAreaInsets();
    const [getItemData, setItemData] = useState([]);
    const [getMergeData, setMergeData] = useState([]);
    const [getGradeData, setGradeData] = useState([]);
    const [getShadeData, setShadeData] = useState([]);
    const [getDesignData, setDesignData] = useState([]);
    const [getStockTypes, setStockTypes] = useState([
        { 'label': 'In house', 'value': 'I' },
        { 'label': 'Process house', 'value': 'P' }
    ]);
    const [loading, setLoading] = useState(false)
    const handleStockData = async (newdata) => {
        setLoading(true)
        setAllStockData([])

        const payload = {
            prptype: 'S',
            prpcodes: [FormCartonDataState.values.PrpCode],
            yearno: FormCartonDataState.values.YearNo,
            strcode: FormCartonDataState.values.StrCode,
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
        console.log('get_verify_manual_fabric_stock API payload : ', payload)
        console.log('get_verify_manual_fabric_stock API URL : ', `${API}/api/get_verify_manual_fabric_stock`)
        try {
            const response = await axios.post(`${API}/api/get_verify_manual_fabric_stock`, payload, { headers });
            console.log('get_verify_manual_stock API response : ', response)

            if (response.data.success === true && response.data.response.data.length === 0) {

                Alert.alert('No Data Found');
            } else if (response.data.success === true && response.data.response.data.length > 0) {
                if (newdata && newdata.length > 0) {

                    let cartons = [];
                    newdata && newdata.filter((el, ind) => {
                        cartons.push(el.CartNo);
                    })

                    let finalrespo = []
                    let finalrespoCntr = 0
                    response.data.response.data && response.data.response.data.filter((el, ind) => {
                        if (!cartons.includes(el.CartNo)) {
                            finalrespo[finalrespoCntr] = el
                            finalrespoCntr++;
                        }
                    })
                    const alldt = newdata.concat(finalrespo)
                    setAllStockData(alldt);
                } else {
                    setAllStockData(response.data.response.data);
                }

                setFormState(FormState => ({
                    ...FormState,
                    values: {
                        ...FormState.values,
                        PrpCode: FormCartonDataState.values.PrpCode || '',
                        YearNo: FormCartonDataState.values.YearNo || '',
                        StrCode: FormCartonDataState.values.StrCode || '',
                    }
                }));
                handleClearForm()

            } else if (response.data.success === false) {

                Alert.alert(`${response.data.message}`);
            } else {

                Alert.alert(`${response.data.message}`);
            }
        } catch (error) {
            Alert.alert('Server Error :' + error)
        } finally {
            setLoading(false)
            onClose()
        }

    }

    const handleSaveCarton = async () => {
        console.log("FormState", FormState)
        console.log("FormCartonDataState", FormCartonDataState)
        if (typeof FormCartonDataState.values.PrpCode == 'undefined' || FormCartonDataState.values.PrpCode == null || FormCartonDataState.values.PrpCode == '') {
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
        } else if (typeof FormCartonDataState.values.YearNo == 'undefined' || FormCartonDataState.values.YearNo == null || FormCartonDataState.values.YearNo == '') {
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
        } else if (typeof FormCartonDataState.values.StrCode == 'undefined' || FormCartonDataState.values.StrCode == null || FormCartonDataState.values.StrCode == '') {
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
        } else if (typeof FormCartonDataState.values.CartNo == 'undefined' || FormCartonDataState.values.CartNo == null || FormCartonDataState.values.CartNo == '') {
            // Snackbar.show({
            //     text: 'Carton no. can not be balnk or empty',
            //     duration: Snackbar.LENGTH_LONG,
            //     backgroundColor: 'red',
            //     textColor: '#fff',
            //     action: { text: 'OK', textColor: 'white' },
            // });
            showWarning(`Taka / Roll No. can not be blank or empty`, {
                text: 'OK',
                onPress: () => { },
            });
        } else if (typeof FormCartonDataState.values.ItmCode == 'undefined' || FormCartonDataState.values.ItmCode == null || FormCartonDataState.values.ItmCode == '') {
            // Snackbar.show({
            //     text: 'Item can not be balnk or empty',
            //     duration: Snackbar.LENGTH_LONG,
            //     backgroundColor: 'red',
            //     textColor: '#fff',
            //     action: { text: 'OK', textColor: 'white' },
            // });
            showWarning(`Item can not be blank or empty`, {
                text: 'OK',
                onPress: () => { },
            });
        }
        // else if (typeof FormCartonDataState.values.MerCode == 'undefined' || FormCartonDataState.values.MerCode == null || FormCartonDataState.values.MerCode == '') {         
        //     showWarning(`Merge can not be balnk or empty`, {
        //         text: 'OK',
        //         onPress: () => { },
        //     });
        // } 
        // else if (typeof FormCartonDataState.values.GrdCode == 'undefined' || FormCartonDataState.values.GrdCode == null || FormCartonDataState.values.GrdCode == '') {            
        //     showWarning(`Grade can not be balnk or empty`, {
        //         text: 'OK',
        //         onPress: () => { },
        //     });
        // }
        // else if (typeof FormCartonDataState.values.Denier == 'undefined' || FormCartonDataState.values.Denier == null || FormCartonDataState.values.Chees == '') {

        //     showWarning(`Denier can not be balnk or empty or 0`, {
        //         text: 'OK',
        //         onPress: () => { },
        //     });
        // }
        else if (typeof FormCartonDataState.values.DsnCode == 'undefined' || FormCartonDataState.values.DsnCode == null || FormCartonDataState.values.DsnCode == '') {
            showWarning(`Design can not be blank or empty`, {
                text: 'OK',
                onPress: () => { },
            });
        } else if (typeof FormCartonDataState.values.ShdCode == 'undefined' || FormCartonDataState.values.ShdCode == null || FormCartonDataState.values.ShdCode == '') {
            showWarning(`Shade can not be blank or empty`, {
                text: 'OK',
                onPress: () => { },
            });
        } else if (typeof FormCartonDataState.values.netWt == 'undefined' || FormCartonDataState.values.netWt == null || FormCartonDataState.values.netWt == '' || parseFloat(FormCartonDataState.values.netWt) <= 0) {
            showWarning(`Physical meter can not be blank, empty or 0`, {
                text: 'OK',
                onPress: () => { },
            });
        } else if (typeof FormCartonDataState.values.StkType == 'undefined' || FormCartonDataState.values.StkType == null || FormCartonDataState.values.StkType == '') {
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
            setLoading(true)
            const payload = {
                prptype: 'S',
                prpcodes: [FormCartonDataState.values.PrpCode],
                yearno: FormCartonDataState.values.YearNo,
                strcode: FormCartonDataState.values.StrCode,
                CartNo: FormCartonDataState.values.CartNo,
                Chees: 0,
                ItmCode: FormCartonDataState.values.ItmCode,
                MerCode: FormCartonDataState.values.MerCode || '',
                GrdCode: FormCartonDataState.values.GrdCode || '',
                ShdCode: FormCartonDataState.values.ShdCode,
                Denier: '',
                DsnCode: FormCartonDataState.values.DsnCode,
                // Legacy fabric manual-entry contract: one meter value.
                // Send all supported aliases so the existing Laravel endpoint
                // stores the same meter in Wt/GrossWt without changing its API.
                Qty: FormCartonDataState.values.netWt,
                Wt: FormCartonDataState.values.netWt,
                GrsWt: FormCartonDataState.values.netWt,
                NetWt: FormCartonDataState.values.netWt,
                StkType: FormCartonDataState.values.StkType,
                IsAlumMoving: FormCartonDataState.values.IsAlumMoving ? 1 : 0,
                // If/when the backend persists IsNonMove, this keeps the
                // legacy meaning intuitive: moving=true => non-move=false.
                IsNonMove: FormCartonDataState.values.IsAlumMoving ? 0 : 1,
                txntype: 'fabricStockVerification'
            };
            const headers = {
                Authorization: `Bearer ${getToken()}`,
                'Content-Type': 'application/json',
                'X-Requested-with': 'XMLHttpRequest',
            };
            console.log("insert_verify_manual_fabric_stock api payload :", payload)
            console.log("insert_verify_manual_fabric_stock api url :", `${API}/api/insert_verify_manual_fabric_stock`)
            try {
                const response = await axios.post(`${API}/api/insert_verify_manual_fabric_stock`, payload, { headers });
                if (response.data.success === true && response.data.data.length === 0) {
                    Alert.alert('No Data Found');
                } else if (response.data.success === true && response.data.data.length > 0) {
                    setAllStockDataInserted(getAllStockDataInserted => [...getAllStockDataInserted, response.data.data[0]])
                    const mergedata = response.data.data.concat(getAllStockDataInserted);
                    handleStockData(mergedata)
                    //onClose()
                } else if (response.data.success === false) {
                    Alert.alert(`${response.data.message}`);
                } else {
                    Alert.alert(`${response.data.message}`);
                }
            } catch (error) {
                Alert.alert('Server Error :' + error)
            } finally {
                setLoading(false)
            }
        }
    }

    const getToken = () => {
        return token;
    };

    const getRequestConfig = (props: any) => ({
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
        },
        params: props.params,
    });
    const getAllItems = async (token: string) => {
        try {
            const historyPayload = {
                prpcode: FormCartonDataState.values.PrpCode,
                yearno: FormCartonDataState.values.YearNo,
                strcode: FormCartonDataState.values.StrCode,
                itemcode: '',
                itemname: '',
                isall: '1',
                txntype: 'fabricStockVerification',
                billdate: '',
                ttype: ['8', '3', '30', '2', '34', '83', '42'],
                fetch: ''
            };
            const response = await axios.get(
                `${API}/api/itemdrop`, getRequestConfig(
                    {
                        params: { ...historyPayload }
                    }
                )
            );
            console.log("response item", response)
            if (response.data.response.data.length > 0) {
                //setItemData(response.data.response.data);
                const itmdt = response.data.response.data
                return itmdt;
            } else {
                return [];
            }
        } catch (error) {
            console.log("item API error:", error);
        } finally {
            //setIsLoading(false)
        }
    }
    const getAllMerges = async (token: string) => {
        try {
            const historyPayload = {
                prpcode: FormCartonDataState.values.PrpCode,
                yearno: FormCartonDataState.values.YearNo,
                strcode: FormCartonDataState.values.StrCode,
                itemcode: '',
                itemname: '',
                isall: 1,
                txntype: 'fabricStockVerification',
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
                //setMergeData(response.data.response.data);
                const merdt = response.data.response.data
                return merdt;
            } else {
                return [];
            }
        } catch (error) {
            console.log("shade API error:", error);
        } finally {
            //setIsLoading(false)
        }
    }
    const getAllGrades = async (token: string) => {
        try {
            const historyPayload = {
                prpcode: FormCartonDataState.values.PrpCode,
                yearno: FormCartonDataState.values.YearNo,
                strcode: FormCartonDataState.values.StrCode,
                itemcode: '',
                itemname: '',
                isall: 1,
                txntype: 'fabricStockVerification',
                billdate: '',
                ttype: ['8', '3', '30', '2', '34', '83', '42'],
                fetch: 'grade',

            };
            const response = await axios.get(
                `${API}/api/gradedrop`, getRequestConfig(
                    {
                        params: { ...historyPayload }
                    }
                )
            );
            if (response.data.response.data.length > 0) {
                //setGradeData(response.data.response.data);
                const grddt = response.data.response.data
                return grddt
            } else {
                //etGradeData([]);
                return []
            }
        } catch (error) {
            console.log("grade API error:", error);
        } finally {
            //setIsLoading(false)
        }
    }

    const getAllShades = async (token: string) => {
        try {
            const historyPayload = {
                prpcode: FormCartonDataState.values.PrpCode,
                yearno: FormCartonDataState.values.YearNo,
                strcode: FormCartonDataState.values.StrCode,
                itemcode: '',
                itemname: '',
                isall: 1,
                txntype: 'fabricStockVerification',
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
                //setShadeData(response.data.response.data);
                const shddt = response.data.response.data
                return shddt
            } else {
                //setShadeData([]);
                return []
            }
        } catch (error) {
            console.log("grade API error:", error);
        } finally {
            //setIsLoading(false)
        }
    }

    const getAllDesign = async (token: string) => {
        try {
            const historyPayload = {
                prpcode: FormCartonDataState.values.PrpCode,
                yearno: FormCartonDataState.values.YearNo,
                strcode: FormCartonDataState.values.StrCode,
                txntype: 'fabricStockVerification',
                dsncode: '',
                dsnname: '',
            };
            const response = await axios.get(
                `${API}/api/designdrop`, getRequestConfig(
                    {
                        params: { ...historyPayload }
                    }
                )
            );
            console.log("response design", response)
            if (response.data.response.data.length > 0) {
                //setShadeData(response.data.response.data);
                const dsnndt = response.data.response.data
                return dsnndt
            } else {
                //setShadeData([]);
                return []
            }
        } catch (error) {
            console.log("design API error:", error);
        } finally {
            //setIsLoading(false)
        }
    }

    useEffect(() => {
        setFormCartonDataState(prev => ({
            ...prev,
            values: {
                ...prev.values,
                PrpCode:
                    prev.values.PrpCode ||
                    FormState.values.PrpCode ||
                    '',

                YearNo:
                    prev.values.YearNo ||
                    FormState.values.YearNo ||
                    '',

                StrCode:
                    prev.values.StrCode ||
                    FormState.values.StrCode ||
                    ''
            }
        }));
    }, [
        FormState.values.PrpCode,
        FormState.values.YearNo,
        FormState.values.StrCode
    ]);

    const [dropdownLoading, setDropdownLoading] = useState({
        item: false,
        merge: false,
        grade: false,
        shade: false,
        design: false,
    });

    useEffect(() => {
        if (!token) return;

        const prpCode = FormCartonDataState.values.PrpCode;
        const yearNo = FormCartonDataState.values.YearNo;
        const strCode = FormCartonDataState.values.StrCode;

        if (!prpCode || !yearNo || !strCode) return;

        let cancelled = false;

        // Start all dropdown APIs together. Design is not blocked by the
        // Item/Merge/Grade/Shade response times.
        setDropdownLoading({
            item: true,
            merge: true,
            grade: true,
            shade: true,
            design: true,
        });

        const loadDropdown = (key, request, setter) => {
            request
                .then((data) => {
                    if (!cancelled) setter(Array.isArray(data) ? data : []);
                })
                .catch((error) => {
                    console.log(`${key} dropdown load error:`, error);
                    if (!cancelled) setter([]);
                })
                .finally(() => {
                    if (!cancelled) {
                        setDropdownLoading((prev) => ({
                            ...prev,
                            [key]: false,
                        }));
                    }
                });
        };

        loadDropdown('item', getAllItems(token), setItemData);
        loadDropdown('merge', getAllMerges(token), setMergeData);
        loadDropdown('grade', getAllGrades(token), setGradeData);
        loadDropdown('shade', getAllShades(token), setShadeData);
        loadDropdown('design', getAllDesign(token), setDesignData);

        return () => {
            cancelled = true;
        };
    }, [
        token,
        FormCartonDataState.values.PrpCode,
        FormCartonDataState.values.YearNo,
        FormCartonDataState.values.StrCode
    ]);

    const handleChange = (name, value) => {
        setFormCartonDataState(prev => ({
            ...prev,
            values: {
                ...prev.values,
                [name]: value
            }
        }));
    };

    const handleClearForm = () => {
        setFormCartonDataState(prev => ({
            ...prev,
            values: {
                PrpCode: typeof FormCartonDataState.values.PrpCode != 'undefined' && FormCartonDataState.values.PrpCode != null && FormCartonDataState.values.PrpCode != ''
                    ? FormCartonDataState.values.PrpCode
                    : typeof FormState.values.PrpCode != 'undefined' && FormState.values.PrpCode != null && FormState.values.PrpCode != ''
                        ? FormState.values.PrpCode : '',
                YearNo: typeof FormCartonDataState.values.YearNo != 'undefined' && FormCartonDataState.values.YearNo != null && FormCartonDataState.values.YearNo != ''
                    ? FormCartonDataState.values.YearNo
                    : typeof FormState.values.YearNo != 'undefined' && FormState.values.YearNo != null && FormState.values.YearNo != ''
                        ? FormState.values.YearNo : '',
                StrCode: typeof FormCartonDataState.values.StrCode != 'undefined' && FormCartonDataState.values.StrCode != null && FormCartonDataState.values.StrCode != ''
                    ? FormCartonDataState.values.StrCode
                    : typeof FormState.values.StrCode != 'undefined' && FormState.values.StrCode != null && FormState.values.StrCode != ''
                        ? FormState.values.StrCode : '',
                CartNo: '',
                Chees: 0,
                ItmCode: '',
                MerCode: '',
                DsnCode: '',
                GrdCode: '',
                ShdCode: '',
                Denier: '',
                grsWt: 0,
                netWt: '',
                IsAlumMoving: false,
                StkType: typeof FormCartonDataState.values.StkType != 'undefined' && FormCartonDataState.values.StkType != null && FormCartonDataState.values.StkType != ''
                    ? FormCartonDataState.values.StkType : ''
            }
        }));
    };


    useEffect(() => {
        if (!FormCartonDataState.values.StkType) {
            setFormCartonDataState(prev => ({
                ...prev,
                values: {
                    ...prev.values,
                    StkType: 'I'
                }
            }));
        }
    }, []);

    // Safety guard: whenever the Manual Fabric Stock screen is opened,
    // never allow an old/scanned QR string to remain in Taka No.
    useEffect(() => {
        if (!isVisible) return;

        setFormCartonDataState(prev => ({
            ...prev,
            values: {
                ...prev.values,
                CartNo: '',
                ItmCode: '',
                DsnCode: '',
                ShdCode: '',
                Chees: 0,
                grsWt: 0,
                netWt: '',
                IsAlumMoving: false,
                StkType: prev.values.StkType || 'I',
            },
        }));
    }, [isVisible]);

    if (!isVisible) return null;

    return (
        <>
            <View style={castyles.fullScreenView}>
                <SafeAreaView style={castyles.safeAreaSheet} edges={['bottom']}>
                    <StatusBar barStyle="light-content" backgroundColor="#087FA3" />
                    {loading && (
                        <View
                            style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,

                                justifyContent: 'center',
                                alignItems: 'center',

                                backgroundColor: 'rgba(255,255,255,0.45)',

                                zIndex: 9999,
                                elevation: 9999,
                            }}
                        >
                            <View
                                style={{
                                    width: 70,
                                    height: 70,
                                    borderRadius: 35,
                                    backgroundColor: '#fff',

                                    justifyContent: 'center',
                                    alignItems: 'center',

                                    elevation: 8,

                                    shadowColor: '#000',
                                    shadowOffset: {
                                        width: 0,
                                        height: 3,
                                    },
                                    shadowOpacity: 0.25,
                                    shadowRadius: 6,
                                }}
                            >
                                <ActivityIndicator
                                    size="large"
                                    color="#0788A8"
                                />
                            </View>
                        </View>
                    )
                        // <FullScreenLoader />
                    }
                    <View style={castyles.screenContent}>
                        <Animated.View style={[castyles.drawerContainer, { transform: [{ translateY: slideAnim }] }]}>
                            <View style={castyles.sheet}>
                                <View style={[castyles.drawerHeader, { paddingTop: insets.top, minHeight: 58 + insets.top }]}>
                                    <View style={castyles.drawerHeaderLeft}>
                                        <View style={castyles.headerIconCircle}>
                                            <Icon name="add-box" size={18} color="#FFFFFF" />
                                        </View>
                                        <View>
                                            <Text style={castyles.drawerHeaderTitle}>Manual Fabric Stock</Text>
                                            <Text style={castyles.drawerHeaderSubtitle}>Physical stock not in system</Text>
                                        </View>
                                    </View>
                                    <TouchableOpacity style={castyles.closeButton} onPress={onClose} activeOpacity={0.8}>
                                        <Icon name="arrow-back" size={26} color="#FFFFFF" />
                                    </TouchableOpacity>
                                </View>
                                <View style={castyles.contextCard}>
                                    <View style={castyles.contextIcon}>
                                        <Icon name="inventory-2" size={18} color="#087FA3" />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={castyles.contextTitle}>Manual Fabric Stock</Text>
                                        <Text style={castyles.contextText}>
                                            {String(FormCartonDataState.values.PrpCode || FormState.values.PrpCode || '--')} · Store {String(FormCartonDataState.values.StrCode || FormState.values.StrCode || '012')}
                                        </Text>
                                    </View>
                                </View>
                                <ScrollView
                                    style={castyles.scrollableFormContainer}
                                    contentContainerStyle={castyles.scrollableFormContent}
                                    keyboardShouldPersistTaps="handled"
                                    nestedScrollEnabled={true}>
                                    <View style={castyles.formCard}>
                                        <View style={castyles.fieldBlock}>
                                            <Text style={castyles.label}>Taka No. <Text style={castyles.required}>*</Text></Text>
                                            <RNTextInput
                                                style={castyles.editableValueBlack}
                                                value={String(FormCartonDataState.values.CartNo ?? '')}
                                                onChangeText={(text) => handleChange('CartNo', text)}
                                                autoCapitalize="characters"
                                                placeholder="Enter taka / roll number"
                                                placeholderTextColor="#9AA6AD"
                                                returnKeyType="next" />
                                        </View>

                                        <View style={castyles.fieldBlock}>
                                            <Text style={castyles.label}>Mtr. <Text style={castyles.required}>*</Text></Text>
                                            <View style={castyles.meterInputWrap}>
                                                <RNTextInput
                                                    style={castyles.meterInput}
                                                    value={String(FormCartonDataState.values.netWt ?? '')}
                                                    onChangeText={(text) => {
                                                        const cleaned = text.replace(/[^0-9.]/g, '');
                                                        handleChange('netWt', cleaned);
                                                        handleChange('grsWt', cleaned);
                                                    }}
                                                    keyboardType="decimal-pad"
                                                    placeholder="0.000"
                                                    placeholderTextColor="#9AA6AD" />
                                                <Text style={castyles.meterSuffix}>MTR</Text>
                                            </View>
                                        </View>

                                        <View style={castyles.fieldBlock}>
                                            <Text style={castyles.label}>Design <Text style={castyles.required}>*</Text></Text>
                                            <LargeSearchDropdown
                                                data={getDesignData}
                                                labelKey="DsnName"
                                                valueKey="DsnCode"
                                                value={FormCartonDataState.values.DsnCode}
                                                placeholder="Select design..."
                                                loading={dropdownLoading.design}
                                                onSelect={(dsn) => {
                                                    setFormCartonDataState(prev => ({
                                                        ...prev,
                                                        values: { ...prev.values, DsnCode: dsn?.DsnCode || '' }
                                                    }));
                                                }}
                                                emptyMessage="No design data available"
                                            />
                                        </View>

                                        <View style={castyles.fieldBlock}>
                                            <Text style={castyles.label}>Item <Text style={castyles.required}>*</Text></Text>
                                            <LargeSearchDropdown
                                                data={getItemData}
                                                labelKey="ItmName"
                                                valueKey="ItmCode"
                                                value={FormCartonDataState.values.ItmCode}
                                                placeholder="Select item..."
                                                loading={dropdownLoading.item}
                                                onSelect={(itm) => {
                                                    setFormCartonDataState(prev => ({
                                                        ...prev,
                                                        values: { ...prev.values, ItmCode: itm?.ItmCode || '', Denier: '' }
                                                    }));
                                                }}
                                                emptyMessage="No item data available"
                                            />
                                        </View>

                                        <View style={castyles.fieldBlock}>
                                            <Text style={castyles.label}>Shade <Text style={castyles.required}>*</Text></Text>
                                            <LargeSearchDropdown
                                                data={getShadeData}
                                                labelKey="ShdName"
                                                valueKey="ShdCode"
                                                value={FormCartonDataState.values.ShdCode}
                                                placeholder="Select shade..."
                                                loading={dropdownLoading.shade}
                                                onSelect={(shd) => {
                                                    setFormCartonDataState(prev => ({
                                                        ...prev,
                                                        values: { ...prev.values, ShdCode: shd?.ShdCode || '' }
                                                    }));
                                                }}
                                                emptyMessage="No shade data available"
                                            />
                                        </View>

                                        {/* <View style={castyles.switchRow}>
                                            <View style={castyles.switchCopy}>
                                                <Text style={castyles.switchTitle}>Is Alum Moving</Text>
                                                <Text style={castyles.switchSubtitle}>Same option as the legacy Taka Manual Entry screen</Text>
                                            </View>
                                            <Switch
                                                value={Boolean(FormCartonDataState.values.IsAlumMoving)}
                                                onValueChange={(value) => handleChange('IsAlumMoving', value)}
                                                trackColor={{ false: '#D6DEE1', true: '#8ED1DC' }}
                                                thumbColor={FormCartonDataState.values.IsAlumMoving ? '#087FA3' : '#FFFFFF'} />
                                        </View> */}

                                        <View style={[castyles.fieldBlock, { marginBottom: 0 }]}>
                                            <Text style={castyles.label}>Stock Type <Text style={castyles.required}>*</Text></Text>
                                            <LargeSearchDropdown
                                                data={getStockTypes}
                                                labelKey="label"
                                                valueKey="value"
                                                value={FormCartonDataState.values.StkType}
                                                placeholder="Select stock type..."
                                                onSelect={(stk) => {
                                                    setFormCartonDataState(prev => ({
                                                        ...prev,
                                                        values: { ...prev.values, StkType: stk?.value || '' }
                                                    }));
                                                }}
                                                emptyMessage="No stock type available"
                                            />
                                        </View>
                                    </View>

                                    <View style={castyles.safetyNote}>
                                        <Icon name="verified-user" size={18} color="#087FA3" />
                                        <Text style={castyles.safetyNoteText}>
                                            Save only when this taka is physically present and not available in the loaded system stock.
                                        </Text>
                                    </View>
                                </ScrollView>
                                <View style={castyles.bottomButtonContainer}>
                                    <TouchableOpacity
                                        style={castyles.cancelButton}
                                        onPress={handleClearForm}
                                        activeOpacity={0.85}>
                                        <Icon name="delete-sweep" size={20} color="#fff" />
                                        <Text style={castyles.bottomBtnText}>Clear</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={castyles.loadButtonNew}
                                        onPress={handleSaveCarton}
                                        activeOpacity={0.85}>
                                        {
                                            isLoading ?
                                                (
                                                    <ActivityIndicator size="small" color="#fff" />
                                                )
                                                :
                                                (
                                                    <>
                                                        <Icon name="send" size={20} color="#fff" />
                                                        <Text style={castyles.bottomBtnText}>Save Manual Stock</Text>
                                                    </>
                                                )
                                        }
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </Animated.View>
                    </View>
                </SafeAreaView>
            </View>
        </>
    );
};

const castyles = StyleSheet.create({
    entryModeContainer: { flexDirection: 'row', backgroundColor: '#EAF5F8', borderRadius: 14, padding: 4, marginBottom: 8, gap: 4 },
    entryModeButton: { flex: 1, minHeight: 44, borderRadius: 11, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
    entryModeButtonActive: { backgroundColor: '#087FA3', elevation: 3 },
    entryModeText: { color: '#087FA3', fontSize: 14, fontWeight: '800' },
    entryModeTextActive: { color: '#fff' },
    scanHintCard: { flexDirection: 'row', alignItems: 'center', gap: 9, backgroundColor: '#F0FBF6', borderWidth: 1, borderColor: '#B8E5D0', borderRadius: 12, padding: 11, marginBottom: 8 },
    scanHintTitle: { color: '#116B4B', fontSize: 13, fontWeight: '800' },
    scanHintText: { color: '#56746A', fontSize: 11, marginTop: 2, lineHeight: 15 },
    rescanButton: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#087FA3', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 9 },
    rescanText: { color: '#fff', fontSize: 11, fontWeight: '800' },
    scannerOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10000, backgroundColor: 'rgba(4,18,23,0.78)', justifyContent: 'center', alignItems: 'center', padding: 14 },
    scannerModal: { width: '100%', maxWidth: 520, backgroundColor: '#102E36', borderRadius: 20, overflow: 'hidden', elevation: 20 },
    scannerHeader: { minHeight: 70, paddingHorizontal: 14, paddingVertical: 10, flexDirection: 'row', alignItems: 'center' },
    scannerIconCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#087FA3', alignItems: 'center', justifyContent: 'center' },
    scannerTitle: { color: '#fff', fontSize: 18, fontWeight: '900' },
    scannerSubtitle: { color: '#B8D2D8', fontSize: 11, marginTop: 2 },
    scannerClose: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center' },
    cameraFrame: { height: 360, marginHorizontal: 12, borderRadius: 16, overflow: 'hidden', backgroundColor: '#061216', position: 'relative' },
    camera: { flex: 1 },
    scanOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' },
    scanCorner: { width: 230, height: 230, borderWidth: 2, borderColor: '#42D7B1', borderRadius: 16, backgroundColor: 'transparent' },
    scanInstruction: { position: 'absolute', bottom: 14, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20 },
    scanInstructionText: { color: '#fff', fontSize: 12, fontWeight: '700' },
    cameraPermissionView: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
    cameraPermissionText: { color: '#fff', fontSize: 14, marginTop: 10, marginBottom: 14, textAlign: 'center' },
    permissionButton: { backgroundColor: '#087FA3', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 10 },
    permissionButtonText: { color: '#fff', fontWeight: '800' },
    scannerFooter: { minHeight: 58, paddingHorizontal: 15, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#F0F8FA' },
    scannerFooterText: { flex: 1, color: '#31545D', fontSize: 11.5, lineHeight: 16 },


    contextCard: {
        marginHorizontal: 12, marginTop: 10, marginBottom: 2, paddingHorizontal: 12,
        paddingVertical: 10, borderRadius: 14, borderWidth: 1, borderColor: '#CBE3E9',
        backgroundColor: '#F0F8FA', flexDirection: 'row', alignItems: 'center'
    },
    contextIcon: {
        width: 36, height: 36, borderRadius: 18, backgroundColor: '#DDF1F5',
        alignItems: 'center', justifyContent: 'center', marginRight: 10
    },
    contextTitle: { color: '#0B5266', fontSize: 14, fontWeight: '900' },
    contextText: { color: '#6B7D84', fontSize: 11.5, marginTop: 2, fontWeight: '600' },
    formCard: {
        backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E0E8EA',
        borderRadius: 16, padding: 12
    },
    fieldBlock: { marginBottom: 12 },
    required: { color: '#D94F4F', fontWeight: '900' },
    meterInputWrap: {
        height: 46, borderWidth: 1, borderColor: '#D9E2E5', borderRadius: 10,
        backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center', overflow: 'hidden'
    },
    meterInput: { flex: 1, height: 44, paddingHorizontal: 11, fontSize: 16, fontWeight: '800', color: '#203238' },
    meterSuffix: {
        paddingHorizontal: 12, color: '#087FA3', fontSize: 11, fontWeight: '900',
        borderLeftWidth: 1, borderLeftColor: '#E0E8EA', height: 44, textAlignVertical: 'center'
    },
    switchRow: {
        minHeight: 60, borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#E8EEF0',
        marginBottom: 12, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'
    },
    switchCopy: { flex: 1, paddingRight: 12 },
    switchTitle: { color: '#203238', fontSize: 14, fontWeight: '800' },
    switchSubtitle: { color: '#788A91', fontSize: 10.5, lineHeight: 14, marginTop: 2 },
    safetyNote: {
        marginTop: 10, marginBottom: 4, padding: 11, borderRadius: 12, backgroundColor: '#F0F8FA',
        borderWidth: 1, borderColor: '#D1E7EC', flexDirection: 'row', alignItems: 'flex-start'
    },
    safetyNoteText: { flex: 1, marginLeft: 8, color: '#47636C', fontSize: 11, lineHeight: 16 },

    fullScreenView: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%', zIndex: 99999, elevation: 99999, backgroundColor: '#F7FAFB' },
    drawerContainer: { flex: 1, overflow: 'hidden', backgroundColor: '#F5F8F9' },
    safeAreaSheet: { flex: 1, backgroundColor: '#FFFFFF' },
    screenContent: { flex: 1, backgroundColor: '#087FA3', paddingTop: 0 },
    gradientBackground: { flex: 1, paddingTop: 0 },
    sheet: { flex: 1, minHeight: '100%', backgroundColor: '#F7FAFB' },
    drawerHeader: { minHeight: 58, paddingTop: 0, backgroundColor: '#087FA3', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 },
    drawerHeaderLeft: { flexDirection: 'row', alignItems: 'center' },
    headerIconCircle: { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center', marginRight: 9 },
    drawerHeaderSubtitle: { color: '#D7F0F5', fontSize: 10.5, marginTop: 2, maxWidth: 270 },
    optionalText: { color: '#7C8D93', fontSize: 11, fontWeight: '500' },
    fieldHelp: { color: '#71848B', fontSize: 10.5, lineHeight: 15, marginTop: 5 },
    drawerHeaderTitle: { color: '#FFFFFF', fontSize: 17, fontWeight: '800' },
    closeButton: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.16)' },
    label: { fontSize: 12.5, marginBottom: 5, color: '#0B5266', fontWeight: '800' },
    scrollableFormContainer: { flex: 1, paddingHorizontal: 12, backgroundColor: '#F7FAFB' },
    scrollableFormContent: { paddingBottom: 10, paddingTop: 8, flexGrow: 1 },
    editableValueBlack: {
        fontSize: 14, color: '#203238', borderWidth: 1, borderColor: '#D9E2E5',
        borderRadius: 10, paddingHorizontal: 11, height: 42, backgroundColor: '#FFFFFF'
    },
    rowInputs: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    halfInput: { width: '48.5%' },
    bottomButtonContainer: {
        marginHorizontal: 12, marginBottom: Platform.OS === 'android' ? 8 : 4,
        flexDirection: 'row', justifyContent: 'space-between', gap: 9
    },
    cancelButton: {
        flex: 1, height: 46, flexDirection: 'row', alignItems: 'center',
        justifyContent: 'center', backgroundColor: '#D95C5C', borderRadius: 13, elevation: 3
    },
    loadButtonNew: {
        flex: 1, height: 46, flexDirection: 'row', alignItems: 'center',
        justifyContent: 'center', backgroundColor: '#12A36F', borderRadius: 13, elevation: 3
    },
    bottomBtnText: { color: '#fff', fontWeight: '800', fontSize: 13.5, marginLeft: 6 },
    dropdownTrigger: {
        minHeight: 46,
        borderWidth: 1,
        borderColor: '#D9E2E5',
        borderRadius: 10,
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    dropdownValue: {
        flex: 1,
        fontSize: 14,
        color: '#203238',
        fontWeight: '600',
        marginRight: 8,
    },
    dropdownPlaceholder: { color: '#7C8D93', fontWeight: '400' },
    dropdownOverlay: {
        flex: 1,
        backgroundColor: 'rgba(5, 22, 28, 0.48)',
        justifyContent: 'center',
        paddingHorizontal: 18,
        paddingVertical: 28,
    },
    dropdownBackdrop: { ...StyleSheet.absoluteFillObject },
    dropdownModal: {
        width: '100%',
        maxHeight: '82%',
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        overflow: 'hidden',
        elevation: 18,
        shadowColor: '#102E36',
        shadowOpacity: 0.22,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 8 },
    },
    dropdownHeader: {
        minHeight: 66,
        paddingHorizontal: 16,
        paddingVertical: 10,
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#E7EEF0',
    },
    dropdownTitle: { color: '#17353D', fontSize: 17, fontWeight: '900' },
    dropdownCount: { color: '#7A8A90', fontSize: 11, marginTop: 2, fontWeight: '600' },
    dropdownClose: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: '#F1F5F6', alignItems: 'center', justifyContent: 'center',
    },
    dropdownSearchWrap: {
        height: 48, marginHorizontal: 12, marginVertical: 10,
        paddingHorizontal: 12, borderRadius: 12, backgroundColor: '#F4F7F8',
        flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E6ECEE',
    },
    dropdownSearchInput: {
        flex: 1, height: 46, marginLeft: 8, paddingVertical: 0,
        fontSize: 14, color: '#203238',
    },
    dropdownLoading: { minHeight: 220, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
    dropdownLoadingText: { marginTop: 10, color: '#60757D', fontSize: 13, fontWeight: '700' },
    dropdownLoadingHint: { marginTop: 5, color: '#8A989D', fontSize: 10.5, lineHeight: 15, textAlign: 'center' },
    dropdownEmpty: { minHeight: 220, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
    dropdownEmptyTitle: { marginTop: 8, color: '#50646B', fontSize: 14, fontWeight: '700' },
    dropdownEmptyText: { marginTop: 4, color: '#8A989D', fontSize: 11, textAlign: 'center' },
    dropdownOption: {
        minHeight: 60, paddingHorizontal: 16, paddingVertical: 10,
        borderTopWidth: 1, borderTopColor: '#EEF2F3', flexDirection: 'row',
        alignItems: 'center', justifyContent: 'space-between',
    },
    dropdownOptionSelected: { backgroundColor: '#F0F8FA' },
    dropdownOptionTextWrap: { flex: 1, paddingRight: 10 },
    dropdownOptionLabel: { color: '#203238', fontSize: 14, fontWeight: '700', lineHeight: 19 },
    dropdownOptionLabelSelected: { color: '#087FA3' },
    dropdownOptionCode: { color: '#829198', fontSize: 10.5, fontWeight: '600', marginTop: 2 },
});
export default CartonAddDrawer;
