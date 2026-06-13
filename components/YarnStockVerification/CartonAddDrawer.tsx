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
import Icon from '@expo/vector-icons/MaterialIcons';
import { LinearGradient } from 'expo-linear-gradient';
import theme from '@/components/theme';
import SearchableDropdown from '@/Shared/SearchableDropdown';
import axios from 'axios';
import { API } from '../../common/API/dynamicAPI';
// import Snackbar from 'react-native-snackbar';
import { showSnackbar, showSuccess, showError, showWarning } from '@/common/utils/snackbar';
import FullScreenLoader from '@/components/FullScreenLoader';
// import { values } from 'lodash';

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
    const [getItemData, setItemData] = useState([]);
    const [getMergeData, setMergeData] = useState([]);
    const [getGradeData, setGradeData] = useState([]);
    const [getShadeData, setShadeData] = useState([]);
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
            txntype: 'yarnStockVerification',
            stktype: typeof FormState.values.StkType != 'undefined' && FormState.values.StkType != null && FormState.values.StkType != '' ? FormState.values.StkType : '',
        };
        const headers = {
            Authorization: `Bearer ${getToken()}`,
            'Content-Type': 'application/json',
            'X-Requested-with': 'XMLHttpRequest',
        };
        console.log('get_verify_manual_stock API payload : ', payload)
        console.log('get_verify_manual_stock API URL : ', `${API}/api/get_verify_manual_stock`)
        try {
            const response = await axios.post(`${API}/api/get_verify_manual_stock`, payload, { headers });
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
            showWarning(`Carton no. can not be balnk or empty`, {
                text: 'OK',
                onPress: () => { },
            });
        } else if (typeof FormCartonDataState.values.Chees == 'undefined' || FormCartonDataState.values.Chees == null || FormCartonDataState.values.Chees == '' || parseFloat(FormCartonDataState.values.Chees) <= 0) {
            // Snackbar.show({
            //     text: 'Chees can not be balnk or empty or 0',
            //     duration: Snackbar.LENGTH_LONG,
            //     backgroundColor: 'red',
            //     textColor: '#fff',
            //     action: { text: 'OK', textColor: 'white' },
            // });
            showWarning(`Chees can not be balnk or empty or 0`, {
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
            showWarning(`Item can not be balnk or empty`, {
                text: 'OK',
                onPress: () => { },
            });
        } else if (typeof FormCartonDataState.values.MerCode == 'undefined' || FormCartonDataState.values.MerCode == null || FormCartonDataState.values.MerCode == '') {
            // Snackbar.show({
            //     text: 'Merge can not be balnk or empty',
            //     duration: Snackbar.LENGTH_LONG,
            //     backgroundColor: 'red',
            //     textColor: '#fff',
            //     action: { text: 'OK', textColor: 'white' },
            // });
            showWarning(`Merge can not be balnk or empty`, {
                text: 'OK',
                onPress: () => { },
            });
        } else if (typeof FormCartonDataState.values.GrdCode == 'undefined' || FormCartonDataState.values.GrdCode == null || FormCartonDataState.values.GrdCode == '') {
            // Snackbar.show({
            //     text: 'Grade can not be balnk or empty',
            //     duration: Snackbar.LENGTH_LONG,
            //     backgroundColor: 'red',
            //     textColor: '#fff',
            //     action: { text: 'OK', textColor: 'white' },
            // });
            showWarning(`Grade can not be balnk or empty`, {
                text: 'OK',
                onPress: () => { },
            });
        } else if (typeof FormCartonDataState.values.ShdCode == 'undefined' || FormCartonDataState.values.ShdCode == null || FormCartonDataState.values.ShdCode == '') {
            // Snackbar.show({
            //     text: 'Shade can not be balnk or empty',
            //     duration: Snackbar.LENGTH_LONG,
            //     backgroundColor: 'red',
            //     textColor: '#fff',
            //     action: { text: 'OK', textColor: 'white' },
            // });
            showWarning(`Shade can not be balnk or empty`, {
                text: 'OK',
                onPress: () => { },
            });
        } else if (typeof FormCartonDataState.values.Denier == 'undefined' || FormCartonDataState.values.Denier == null || FormCartonDataState.values.Chees == '') {
            // Snackbar.show({
            //     text: 'Denier can not be balnk or empty or 0',
            //     duration: Snackbar.LENGTH_LONG,
            //     backgroundColor: 'red',
            //     textColor: '#fff',
            //     action: { text: 'OK', textColor: 'white' },
            // });
            showWarning(`Denier can not be balnk or empty or 0`, {
                text: 'OK',
                onPress: () => { },
            });
        }
        // else if (typeof FormCartonDataState.values.grsWt == 'undefined' || FormCartonDataState.values.grsWt == null || FormCartonDataState.values.grsWt == '' || parseFloat(FormCartonDataState.values.grsWt) <= 0) {
        //     Snackbar.show({
        //         text: 'Gross wt. can not be balnk or empty or 0',
        //         duration: Snackbar.LENGTH_LONG,
        //         backgroundColor: 'red',
        //         textColor: '#fff',
        //         action: { text: 'OK', textColor: 'white' },
        //     });
        // } 
        else if (typeof FormCartonDataState.values.netWt == 'undefined' || FormCartonDataState.values.netWt == null || FormCartonDataState.values.netWt == '' || parseFloat(FormCartonDataState.values.netWt) <= 0) {
            // Snackbar.show({
            //     text: 'Net wt. can not be balnk or empty or 0',
            //     duration: Snackbar.LENGTH_LONG,
            //     backgroundColor: 'red',
            //     textColor: '#fff',
            //     action: { text: 'OK', textColor: 'white' },
            // });
            showWarning(`Net wt. can not be balnk or empty or 0`, {
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
                Chees: FormCartonDataState.values.Chees,
                ItmCode: FormCartonDataState.values.ItmCode,
                MerCode: FormCartonDataState.values.MerCode,
                GrdCode: FormCartonDataState.values.GrdCode,
                ShdCode: FormCartonDataState.values.ShdCode,
                Denier: FormCartonDataState.values.Denier,
                GrsWt: FormCartonDataState.values.grsWt,
                NetWt: FormCartonDataState.values.netWt,
                StkType: FormCartonDataState.values.StkType,
                txntype: 'yarnStockVerification'
            };
            const headers = {
                Authorization: `Bearer ${getToken()}`,
                'Content-Type': 'application/json',
                'X-Requested-with': 'XMLHttpRequest',
            };
            console.log("insert_verify_manual_stock api payload :", payload)
            console.log("insert_verify_manual_stock api url :", `${API}/api/insert_verify_manual_stock`)
            try {
                const response = await axios.post(`${API}/api/insert_verify_manual_stock`, payload, { headers });
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
                //setLoading(false)
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
    const getAllItems = async (token: string) => {
        if (cancelToken?.cancel) cancelToken.cancel();
        cancelToken = axios.CancelToken.source();

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
        if (cancelToken?.cancel) cancelToken.cancel();
        cancelToken = axios.CancelToken.source();

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
        if (cancelToken?.cancel) cancelToken.cancel();
        cancelToken = axios.CancelToken.source();

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
        if (cancelToken?.cancel) cancelToken.cancel();
        cancelToken = axios.CancelToken.source();

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

    useEffect(() => {
        if (!token) return;
        const loadAllFunctions = async () => {
            if (typeof FormCartonDataState.values.PrpCode != 'undefined' && FormCartonDataState.values.PrpCode != null && FormCartonDataState.values.PrpCode != ''
                && typeof FormCartonDataState.values.YearNo != 'undefined' && FormCartonDataState.values.YearNo != null && FormCartonDataState.values.YearNo != ''
                && typeof FormCartonDataState.values.StrCode != 'undefined' && FormCartonDataState.values.StrCode != null && FormCartonDataState.values.StrCode != '') {
                const itmdata = await getAllItems(token);
                setItemData(itmdata);
                const merdata = await getAllMerges(token);
                setMergeData(merdata);
                const grdata = await getAllGrades(token);
                setGradeData(grdata);
                const shdata = await getAllShades(token);
                setShadeData(shdata);
            }
        };

        loadAllFunctions();
    }, [token, FormCartonDataState.values.PrpCode, FormCartonDataState.values.YearNo, FormCartonDataState.values.StrCode]);

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
                Chees: '',
                ItmCode: '',
                MerCode: '',
                GrdCode: '',
                ShdCode: '',
                Denier: '',
                grsWt: 0,
                netWt: '',
                StkType: typeof FormCartonDataState.values.StkType != 'undefined' && FormCartonDataState.values.StkType != null && FormCartonDataState.values.StkType != ''
                    ? FormCartonDataState.values.StkType : ''
            }
        }));
    };

    const selectedProperty = getAllPropertyData?.find((p) => p.PrpCode === FormCartonDataState.values.PrpCode) || FormState.values.PrpCode;
    const selectedYear = getAllYearData?.find((y) => y.YearNo === FormCartonDataState.values.YearNo) || FormState.values.YearNo;
    const selectedStore = getAllStoreData?.find((y) => y.StrCode === FormCartonDataState.values.StrCode) || FormState.values.StrCode;
    const selectedItem = getItemData?.find((y) => y.ItmCode === FormCartonDataState.values.ItmCode) || null;
    const selectedMerge = getMergeData?.find((y) => y.MerCode === FormCartonDataState.values.MerCode) || null;
    const selectedGrade = getGradeData?.find((y) => y.GrdCode === FormCartonDataState.values.GrdCode) || null;
    const selectedShade = getShadeData?.find((y) => y.ShdCode === FormCartonDataState.values.ShdCode) || null;
    const selectedStockType = getStockTypes?.find((y) => y.value === FormCartonDataState.values.StkType) || null;


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

    return (
        <>

            <Modal visible={isVisible} transparent animationType="none" onRequestClose={onClose}>
                <View style={castyles.modalOverlay}>
                    {loading && <FullScreenLoader />}
                    <Animated.View style={[castyles.drawerContainer, { transform: [{ translateY: slideAnim }] }]}>
                        <LinearGradient
                            colors={[theme.BRAND_GRADIENT_START, theme.BRAND_GRADIENT_END]}
                            style={castyles.gradientBackground}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}>
                            <TouchableOpacity style={castyles.closeButton} onPress={onClose}>
                                <Icon name="close" size={28} color="#fff" />
                            </TouchableOpacity>
                            <ScrollView
                                style={castyles.scrollableFormContainer}
                                contentContainerStyle={castyles.scrollableFormContent}
                                nestedScrollEnabled={true}>
                                <View style={{ marginBottom: 10 }} >
                                    <Text style={castyles.label}>Select Property <Text style={{ color: 'red' }}> * </Text></Text>

                                    <SearchableDropdown
                                        //containerStyle={{ backgroundColor: 'red' }}
                                        //textStyle={{ color: '#000' }}
                                        data={getAllPropertyData}
                                        labelKey="LngName"
                                        valueKey="PrpCode"
                                        placeholder="Choose property..."
                                        pageSize={10}
                                        initialValue={selectedProperty}
                                        value={FormCartonDataState.values.PrpCode || FormState.values.PrpCode}
                                        onSelect={(item) => {
                                            setFormCartonDataState(FormCartonDataState => ({
                                                ...FormCartonDataState,
                                                values: {
                                                    ...FormCartonDataState.values,
                                                    PrpCode: item?.PrpCode || '',
                                                }
                                            }));
                                        }}
                                        multiple={false}
                                        emptyMessage="No properties available" />
                                </View>
                                <View style={{ marginBottom: 10 }} >
                                    <Text style={castyles.label}>Select Year <Text style={{ color: 'red' }}> * </Text></Text>
                                    <SearchableDropdown
                                        key={FormCartonDataState.values.YearNo}
                                        data={getAllYearData}
                                        labelKey="YearName"
                                        valueKey="YearNo"
                                        placeholder="Choose year..."
                                        pageSize={10}
                                        initialValue={selectedYear}
                                        value={FormCartonDataState.values.YearNo || FormState.values.YearNo}
                                        onSelect={(yr) => {
                                            setFormCartonDataState(FormCartonDataState => ({
                                                ...FormCartonDataState,
                                                values: {
                                                    ...FormCartonDataState.values,
                                                    YearNo: yr?.YearNo || '',
                                                }
                                            }));
                                        }}
                                        multiple={false}
                                        emptyMessage="No years data available" />
                                </View>
                                <View style={{ marginBottom: 10 }} >
                                    <Text style={castyles.label}>Select store <Text style={{ color: 'red' }}> * </Text></Text>
                                    <SearchableDropdown
                                        key={FormCartonDataState.values.StrCode}
                                        data={getAllStoreData}
                                        labelKey="StrName"
                                        valueKey="StrCode"
                                        placeholder="Choose sore..."
                                        pageSize={10}
                                        value={FormCartonDataState.values.StrCode || FormState.values.StrCode}
                                        initialValue={selectedStore}
                                        onSelect={(str) => {
                                            setFormCartonDataState(FormCartonDataState => ({
                                                ...FormCartonDataState,
                                                values: {
                                                    ...FormCartonDataState.values,
                                                    StrCode: str?.StrCode || '',
                                                }
                                            }));
                                        }}
                                        multiple={false}
                                        emptyMessage="No stores data available" />
                                </View>
                                <View style={castyles.rowInputs}>
                                    <View style={castyles.halfInput}>
                                        <Text style={castyles.label}>Carton no <Text style={{ color: 'red' }}> * </Text></Text>
                                        <RNTextInput
                                            style={castyles.editableValueBlack}
                                            value={FormCartonDataState.values.CartNo}
                                            onChangeText={(text) => handleChange("CartNo", text)} />
                                    </View>
                                    <View style={castyles.halfInput}>
                                        <Text style={castyles.label}>Chees <Text style={{ color: 'red' }}> * </Text></Text>
                                        <RNTextInput
                                            style={castyles.editableValueBlack}
                                            value={FormCartonDataState.values.Chees}
                                            onChangeText={(text) => handleChange("Chees", text)}
                                            keyboardType="numeric" />
                                    </View>
                                </View>
                                <View style={{ marginBottom: 10 }} >
                                    <Text style={castyles.label}>Select Item <Text style={{ color: 'red' }}> * </Text></Text>
                                    <SearchableDropdown
                                        key={FormCartonDataState.values.ItmCode}
                                        data={getItemData}
                                        labelKey="ItmName"
                                        valueKey="ItmCode"
                                        placeholder="Choose item..."
                                        pageSize={10}
                                        //initialValue={getItemData ?? null}
                                        //value={FormCartonDataState.values.ItmCode}
                                        initialValue={selectedItem}
                                        onSelect={(itm) => {
                                            setFormCartonDataState(FormCartonDataState => ({
                                                ...FormCartonDataState,
                                                values: {
                                                    ...FormCartonDataState.values,
                                                    ItmCode: itm?.ItmCode || '',
                                                    Denier: itm?.Denier || '',
                                                }
                                            }));
                                        }}
                                        multiple={false}
                                        emptyMessage="No years data available" />
                                </View>
                                <View style={{ marginBottom: 10 }} >
                                    <Text style={castyles.label}>Select merge <Text style={{ color: 'red' }}> * </Text></Text>
                                    <SearchableDropdown
                                        key={FormCartonDataState.values.MerCode}
                                        data={getMergeData}
                                        labelKey="MerName"
                                        valueKey="MerCode"
                                        placeholder="Choose merge..."
                                        pageSize={10}
                                        //initialValue={getMergeData ?? null}
                                        //value={FormCartonDataState.values.MerCode}
                                        initialValue={selectedMerge}
                                        onSelect={(mrg) => {
                                            setFormCartonDataState(FormCartonDataState => ({
                                                ...FormCartonDataState,
                                                values: {
                                                    ...FormCartonDataState.values,
                                                    MerCode: mrg?.MerCode || '',
                                                }
                                            }));
                                        }}
                                        multiple={false}
                                        emptyMessage="No years data available" />
                                </View>
                                <View style={{ marginBottom: 10 }} >
                                    <Text style={castyles.label}>Select grade <Text style={{ color: 'red' }}> * </Text></Text>
                                    <SearchableDropdown
                                        key={FormCartonDataState.values.GrdCode}
                                        data={getGradeData}
                                        labelKey="GrdName"
                                        valueKey="GrdCode"
                                        placeholder="Choose grade..."
                                        pageSize={10}
                                        //initialValue={getGradeData ?? null}
                                        //value={FormCartonDataState.values.GrdCode}
                                        initialValue={selectedGrade}
                                        onSelect={(grd) => {
                                            setFormCartonDataState(FormCartonDataState => ({
                                                ...FormCartonDataState,
                                                values: {
                                                    ...FormCartonDataState.values,
                                                    GrdCode: grd?.GrdCode || '',
                                                }
                                            }));
                                        }}
                                        multiple={false}
                                        emptyMessage="No years data available" />
                                </View>
                                <View style={{ marginBottom: 10 }} >
                                    <Text style={castyles.label}>Select shade <Text style={{ color: 'red' }}> * </Text></Text>

                                    <SearchableDropdown
                                        key={FormCartonDataState.values.ShdCode}
                                        data={getShadeData}
                                        labelKey="ShdName"
                                        valueKey="ShdCode"
                                        placeholder="Choose shade..."
                                        pageSize={10}
                                        //initialValue={getShadeData ?? null}
                                        //value={FormCartonDataState.values.ShdCode}
                                        initialValue={selectedShade}
                                        onSelect={(shd) => {
                                            setFormCartonDataState(FormCartonDataState => ({
                                                ...FormCartonDataState,
                                                values: {
                                                    ...FormCartonDataState.values,
                                                    ShdCode: shd?.ShdCode || '',
                                                }
                                            }));
                                        }}
                                        multiple={false}
                                        emptyMessage="No shade data available" />
                                </View>
                                <View style={{ marginBottom: 10 }} >
                                    <Text style={castyles.label}>Denier <Text style={{ color: 'red' }}> * </Text></Text>
                                    <RNTextInput
                                        style={castyles.editableValueBlack}
                                        value={FormCartonDataState.values.Denier}
                                        onChangeText={(text) => handleChange("Denier", text)}
                                        keyboardType="numeric" />
                                </View>
                                <View style={castyles.rowInputs}>
                                    <View style={castyles.halfInput}>
                                        <Text style={castyles.label}>Gross wt. <Text style={{ color: 'red' }}> * </Text></Text>
                                        <RNTextInput
                                            style={castyles.editableValueBlack}
                                            value={FormCartonDataState.values.grsWt}
                                            onChangeText={(text) => handleChange("grsWt", text)}
                                            keyboardType="numeric" />
                                    </View>
                                    <View style={castyles.halfInput}>
                                        <Text style={castyles.label}>Net wt. <Text style={{ color: 'red' }}> * </Text></Text>
                                        <RNTextInput
                                            style={castyles.editableValueBlack}
                                            value={FormCartonDataState.values.netWt}
                                            onChangeText={(text) => handleChange("netWt", text)}
                                            keyboardType="numeric" />
                                    </View>
                                </View>
                                <View style={{ marginBottom: 10 }} >
                                    <Text style={castyles.label}>Select stock type <Text style={{ color: 'red' }}> * </Text></Text>
                                    <SearchableDropdown
                                        key={FormCartonDataState.values.StkType}
                                        data={getStockTypes}
                                        labelKey="label"
                                        valueKey="value"
                                        placeholder="Choose stock type..."
                                        pageSize={10}
                                        //initialValue={getStockTypes ?? null}
                                        value={FormCartonDataState.values.StkType}
                                        initialValue={selectedStockType}
                                        onSelect={(stk) => {
                                            setFormCartonDataState(FormCartonDataState => ({
                                                ...FormCartonDataState,
                                                values: {
                                                    ...FormCartonDataState.values,
                                                    StkType: stk?.value || '',
                                                }
                                            }));
                                        }}
                                        multiple={false}
                                        emptyMessage="No stock types data available" />
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
                                                    <Text style={castyles.bottomBtnText}>Submit</Text>
                                                </>
                                            )
                                    }
                                </TouchableOpacity>
                            </View>
                        </LinearGradient>
                    </Animated.View>
                </View>
            </Modal>
        </>
    );
};

const castyles = StyleSheet.create({
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
