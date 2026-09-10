import AppAlert from '@/common/utils/appAlert';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, Animated, Dimensions, ScrollView, FlatList, ActivityIndicator, Alert, TextInput as RNTextInput, } from 'react-native';
import Icon from '@expo/vector-icons/MaterialIcons';
// import LinearGradient from 'react-native-linear-gradient';
// import { DesignData, ItemData, ItemStatus } from './Modal';
import theme from '@/components/theme';
import SearchableDropdown from '@/Shared/SearchableDropdown';
import { Switch } from 'react-native';
import axios from 'axios';
import { API } from '../../common/API/dynamicAPI';
// import Snackbar from 'react-native-snackbar';
import { showSnackbar, showSuccess, showError, showWarning } from '@/common/utils/snackbar';
import FullScreenLoader from '@/components/FullScreenLoader';
import AsyncStorage from '@/common/utils/compatibleStorage';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import PartyDropdown from '@/Shared/PartyDropdown';
import PartyDropdownforweft from '@/Shared/PartyDropdownforweft';

const { height } = Dimensions.get('window');

const AddWeftIssueDetail = (props) => {
    const { isVisible,
        onClose,
        isLoading,
        selectedItemStatus,
        getAllPropertyData,
        FormState,
        setFormState,
        getAllYearData,
        onLoadPress,
        token,
        setIsLoading,
        handleclick,
        editData,
        mainUId,
        isEditMode,
        isItemdetailvisible,
        resetFlag,
        userid
    } = props;

    const slideAnim = useRef(new Animated.Value(0)).current;
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [getShiftData, setShiftData] = useState([]);
    const [checkingDatePickerVisible, setCheckingDatePickerVisible] = useState(false);
    const [checkingDatePickerVisible1, setCheckingDatePickerVisible1] = useState(false);
    const [selectedbeam, setSelectedbeam] = useState([]);
    const [selectedstocktype, setselectedstocktype] = useState([]);
    const [Beamdata, setBeamdata] = useState([]);
    const [Designdata, setDesigndata] = useState([]);
    const [maindesigndata, setmaindesigndata] = useState([]);
    const [selecteddesign, setselecteddesign] = useState([]);
    const [getStockTypes, setStockTypes] = useState([
        { stktypename: 'In house', StkType: 'I' },
        { stktypename: 'Process house', StkType: 'P' }
    ]);
    const [showNextModal, setShowNextModal] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    const [errors, setErrors] = useState({});
    const [IssueDesigndata, setIssueDesigndata] = useState([]);
    const [selectedissuedesign, setselectedissuedesign] = useState([]);
    const [canShowIssueDesign, setCanShowIssueDesign] = useState(false);

    // console.log("maindesigndata", maindesigndata);

    let cancelToken: any;

    // console.log("FormState.values", FormState.values)
    console.log("Formstate.values.PrpCode", FormState.values.PrpCode);
    console.log("Formstate.values.YearNo", FormState.values.YearNo, userid);



    React.useEffect(() => {
        Animated.timing(slideAnim, {
            toValue: isVisible ? 0 : height,
            duration: 300,
            useNativeDriver: true,
        }).start();
    }, [isVisible]);

    const getRequestConfig = (props: any) => ({
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
        },
        params: props.params,
        cancelToken: cancelToken?.token,
    });

    // const soshow = async () => {
    //     const userPtype = await AsyncStorage.getItem('user_prptype');
    //     if (!FormState.values.PrpCode || !FormState.values.YearNo) {
    //         return;
    //     }
    //     try {
    //         setIsLoading(true);

    //         const source = axios.CancelToken.source();

    //         const historyPayload = {
    //             uid: FormState.values.uid || '0',
    //             prpcode: FormState.values.PrpCode,
    //             yearno: FormState.values.YearNo,
    //             strcode: '012',
    //             action: 'add',
    //             txntype: 'beam_weft_issue'
    //         };

    //         console.log("GET Params:", historyPayload);

    //         const response = await axios.get(
    //             `${API}/api/warpissueshow`,
    //             {
    //                 params: historyPayload,
    //                 headers: {
    //                     Authorization: `Bearer ${token}`,
    //                     Accept: 'application/json',
    //                 },
    //                 cancelToken: source.token
    //             }
    //         );

    //         // 🔥 DEBUG (keep this for now)
    //         console.log("FULL RESPONSE:", response.data);

    //         // ✅ correct extraction
    //         const resData = response?.data?.data || {};
    //         const mainData = resData?.main?.[0] || {};

    //         // console.log("MAIN DATA:", mainData);
    //         // console.log("D1:", resData?.d1);
    //         // console.log("D2:", resData?.d2);

    //         const cleanMainData = Object.fromEntries(
    //             Object.entries(mainData).filter(([key, value]) => {
    //                 return value !== null && value !== '';
    //             })
    //         );
    //         if (response?.data?.success) {
    //             const updatedValues = {
    //                 ...FormState.values,
    //                 ...cleanMainData,
    //                 d1: resData?.d1 || [],
    //                 d2: resData?.d2 || []
    //             };
    //             setFormState(prev => ({
    //                 ...prev,
    //                 values: updatedValues
    //             }));
    //             checkvoucher(updatedValues);
    //             fetchbeam(updatedValues);
    //         }
    //     } catch (error) {
    //         if (axios.isCancel(error)) {
    //             console.log("Request cancelled:", error.message);
    //         } else {
    //             console.log("ERROR STATUS:", error?.response?.status);
    //             console.log("ERROR DATA:", error?.response?.data);
    //         }
    //     } finally {
    //         setIsLoading(false);
    //     }
    // };


    const prp = FormState.values.PrpCode;
    const year = FormState.values.YearNo;

    const soshow = async () => {
        // if (!FormState.values.PrpCode || !FormState.values.YearNo) {
        //     console.log("❌ Missing values");
        //     return;
        // }

        try {
            setIsLoading(true);

            const payload = {
                uid: FormState.values.uid || '0',
                prpcode: FormState.values.PrpCode,
                yearno: FormState.values.YearNo,
                strcode: '012',
                action: 'add',
                txntype: 'beam_weft_issue'
            };

            console.log("🚀 API PAYLOAD:", payload);

            const response = await axios.get(`${API}/api/warpissueshow`, {
                params: payload,
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: 'application/json',
                }
            });

            console.log("✅ API RESPONSE:", response);

            if (response?.data?.success) {
                const resData = response?.data?.data || {};
                const mainData = resData?.main?.[0] || {};

                const issueDesignUsers = Array.isArray(resData?.issuedesignuser)
                    ? resData.issuedesignuser
                    : [];

                const hasIssueDesignAccess = issueDesignUsers.some(
                    user => String(user) === String(userid)
                );

                setCanShowIssueDesign(hasIssueDesignAccess);

                // 🔥 SAFE MERGE (NO OVERWRITE IF BLANK)
                const safeData = {};

                Object.keys(mainData).forEach(key => {
                    if (mainData[key] !== null && mainData[key] !== '') {
                        safeData[key] = mainData[key];
                    }
                });

                setFormState(prev => ({
                    ...prev,
                    values: {
                        ...prev.values,   // old safe values
                        ...safeData,      // only valid values

                        // 🔥 FORCE KEEP (CRITICAL)
                        PrpCode: prev.values.PrpCode,
                        YearNo: prev.values.YearNo,

                        d1: resData?.d1 || [],
                        d2: resData?.d2 || []
                    }
                }));

                checkvoucher(mainData);
                fetchbeam(mainData);
            }

        } catch (error) {
            console.log("❌ ERROR:", error?.response?.data || error.message);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (FormState.values.IssDate) {
            const d = new Date(FormState.values.IssDate);
            const m = String(d.getMonth() + 1).padStart(2, '0');

            setFormState(prev => ({
                ...prev,
                values: {
                    ...prev.values,
                    month: m
                }
            }));
        }
    }, [FormState.values.IssDate]);

    const checkvoucher = async (values) => {
        try {
            setIsLoading(true);

            // ✅ Always use values.IssDate
            const dateObj = new Date(values.IssDate);

            if (isNaN(dateObj)) {
                console.log("Invalid Date:", values.IssDate);
                return;
            }

            const month = String(dateObj.getMonth() + 1).padStart(2, '0');

            const payload = {
                prpcode: FormState.values.PrpCode,
                yearno: FormState.values.YearNo,
                acccode: '',
                vouno: values.IssNo || '',
                suffix: values.suffix || '',
                month: month,
                // date: formatDisplayDate(values.IssDate),
                uid: values.UId,

                // ✅ IMPORTANT: send ISO date directly
                date: formatDisplayDate(FormState.values.IssDate) || formatDisplayDate(values.IssDate),
                module: 'POYIssue',
                module_no_key: 'IssNo'
            };

            console.log("Voucher Payload:", payload);

            const response = await axios.get(
                `${API}/api/checkvoucherno`,
                getRequestConfig({
                    params: payload
                })
            );

            console.log("voucher response", response)

            const res = response?.data?.response;

            if (res?.validate === 'true') {
                setFormState(prev => ({
                    ...prev,
                    values: {
                        ...prev.values,
                        IssNo: res.IssNo,
                        suffix: res.suffix,
                        month: res.month
                    }
                }));
            } else if (res?.validate === 'false') {
                AppAlert.alert(
                    'Oops!!!',
                    res?.message || 'Something went wrong!',
                    [
                        {
                            text: 'OK',
                            onPress: () => {
                                setFormState(prev => ({
                                    ...prev,
                                    values: {
                                        ...prev.values,
                                        IssNo: res.IssNo,
                                        suffix: res.suffix,
                                        month: res.month
                                    }
                                }));
                            }
                        }
                    ]
                );
            }

        } catch (error) {
            console.log("Check voucher error:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchbeam = async (values) => {
        const userPtype = await AsyncStorage.getItem('user_prptype');
        try {
            setIsLoading(true);
            if (cancelToken?.cancel) cancelToken.cancel();
            cancelToken = axios.CancelToken.source();
            const historyPayload = {
                prpcode: FormState.values.PrpCode,
                yearno: FormState.values.YearNo,
                strcode: values.yarnstrcode,
                txntype: 'beam_weft_issue',
                date: formatDisplayDate(values.IssDate),
                uid: values.UId
            };
            // console.log("beam Payload:", historyPayload);
            const response = await axios.get(
                `${API}/api/beam_for_weftissue_help`,
                getRequestConfig({
                    params: { ...historyPayload },
                    cancelToken: cancelToken.token
                })
            );
            console.log("Beam API Response:", response);
            const data = response?.data?.data || [];
            if (response?.data?.success && data.length > 0) {
                setBeamdata(data);
            } else {
                setBeamdata([]);
            }
        } catch (error) {
            if (axios.isCancel(error)) {
                console.log("Request cancelled:", error.message);
            } else {
                console.log("API beam error:", error);
            }
        } finally {
            setIsLoading(false);
        }
    };

    const fetchDesign = async (values) => {
        const userPtype = await AsyncStorage.getItem('user_prptype');
        try {
            setIsLoading(true);
            if (cancelToken?.cancel) cancelToken.cancel();
            cancelToken = axios.CancelToken.source();
            const historyPayload = {
                prpcode: FormState.values.PrpCode,
                yearno: FormState.values.YearNo,
                // strcode: values.yarnstrcode,
                txntype: 'beam_weft_issue',
                date: formatDisplayDate(values.IssDate),
                uid: values.UId,
                stktype: values.StkType,
                beamuid: FormState.values.BeamUId
            };
            console.log("Design Payload:", historyPayload);
            const response = await axios.get(
                `${API}/api/orderdesign_for_weftissue_help`,
                getRequestConfig({
                    params: { ...historyPayload },
                    cancelToken: cancelToken.token
                })
            );
            console.log("Design API Response:", response);
            const data = response?.data?.data || [];
            if (response?.data?.success && data.length > 0) {
                setDesigndata(data);
            } else {
                setDesigndata([]);
            }
        } catch (error) {
            if (axios.isCancel(error)) {
                console.log("Request cancelled:", error.message);
            } else {
                console.log("API beam error:", error);
            }
        } finally {
            setIsLoading(false);
        }
    };


    const fetchdesignwiseitem = async () => {
        const userPtype = await AsyncStorage.getItem('user_prptype');
        try {
            setIsLoading(true);
            if (cancelToken?.cancel) cancelToken.cancel();
            cancelToken = axios.CancelToken.source();
            const historyPayload = {
                prpcode: FormState.values.PrpCode,
                yearno: FormState.values.YearNo,
                txntype: 'weft_selvedge_issue',
                dsncode: FormState.values.DsnCode
            };
            console.log("designwise_mainitem_for_weftissue_help Payload:", historyPayload);
            const response = await axios.get(
                `${API}/api/designwise_mainitem_for_weftissue_help`,
                getRequestConfig({
                    params: { ...historyPayload },
                    cancelToken: cancelToken.token
                })
            );
            console.log("designwise_mainitem_for_weftissue_help API Response:", response);
            const data = response?.data?.data || [];
            if (response?.data?.success && data.length > 0) {
                setmaindesigndata(data);
            } else {
                setmaindesigndata([]);
            }
        } catch (error) {
            if (axios.isCancel(error)) {
                console.log("Request cancelled:", error.message);
            } else {
                console.log("API beam error:", error);
            }
        } finally {
            setIsLoading(false);
        }
    };

    // useEffect(() => {
    //     console.log("PrpCode:", FormState.values.PrpCode);
    //     console.log("YearNo:", FormState.values.YearNo);
    //         console.log("API CALL HO RAHI HAI");
    //         soshow();
    // }, [FormState.values.PrpCode, FormState.values.YearNo]);

    // useEffect(() => {
    //     console.log("🔥 useEffect TRIGGERED");
    //     console.log("PrpCode:", FormState.values.PrpCode);
    //     console.log("YearNo:", FormState.values.YearNo);

    //     if (FormState.values.PrpCode && FormState.values.YearNo) {
    //         console.log("🚀 API CALL");
    //         soshow();
    //     }
    // }, [FormState.values.PrpCode, FormState.values.YearNo]); // ✅ TEMP for debug // ✅ correct


    useEffect(() => {
        console.log("🔥 useEffect TRIGGERED", prp, year);
        if (isVisible && prp && year) {
            soshow();
        }
    }, [isVisible, prp, year]);

    const handleLoaddata = async () => {
        onLoadPress();
    }

    const formatDisplayDate = (date) => {
        if (!date) return '';
        const d = new Date(date);
        if (isNaN(d)) return '';

        return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')
            }-${d.getFullYear()}`;
    };

    // const handleSaveNext = () => {
    //     if (!selectedItem || !selectedItem.srno) {
    //         Snackbar.show({
    //             text: "Please select item",
    //             duration: Snackbar.LENGTH_SHORT,
    //             backgroundColor: "#B00020",
    //             textColor: "#fff",
    //         });
    //         return;
    //     }
    //     setFormState(prev => ({
    //         ...prev,
    //         values: {
    //             ...prev.values,
    //             ItmCode: selectedItem.mitmcode,
    //             ItmName: selectedItem.mitmname,
    //             srno: selectedItem.srno
    //         }
    //     }));

    //     console.log("Selected Item:", selectedItem);

    //     setShowNextModal(false);

    //     props.onNext && props.onNext();
    // };

    const handleNextPress = async () => {

        const values = FormState.values;

        let newErrors: Record<string, string> = {};

        const validations = [
            { key: "PrpCode", message: "Please select Property" },
            { key: "YearNo", message: "Please select Year" },
            { key: "BeamNo", message: "Please select Beam" },
            { key: "StkType", message: "Please select Stock Type" },
            { key: "DsnCode", message: "Please select Design" },
            // { key: "IssNo", message: "Please enter Voucher No" },
            // { key: "month", message: "Invalid Month" }
        ];

        const isEmpty = (val: any) =>
            val === undefined ||
            val === null ||
            val === '' ||
            val === '0' ||
            val === 0;

        validations.forEach(({ key, message }) => {
            if (isEmpty(values[key])) {
                newErrors[key] = message;
            }
        });

        if (Object.keys(newErrors).length > 0) {

            setErrors(newErrors);

            const firstError = Object.values(newErrors)[0];

            // Snackbar.show({
            //     text: firstError,
            //     duration: Snackbar.LENGTH_SHORT,   
            //     backgroundColor: "#B00020",
            //     textColor: "#fff",
            // });

            // showError(firstError, {
            //     text: 'OK',
            //     onPress: () => { },
            // });
            AppAlert.alert(`${firstError}`);

            return;
        }

        setErrors({});

        // await fetchdesignwiseitem();
        // isItemdetailvisible(true);
        setShowNextModal(false);
        // props.onNext && props.onNext();
        props.onNext && props.onNext({
            hasIssueDesignAccess: canShowIssueDesign,
            StkType: values.StkType || ''
        });
    };

    useEffect(() => {
        if (!FormState.values.IssDate) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            setFormState(prev => ({
                ...prev,
                values: {
                    ...prev.values,
                    IssDate: today.toISOString()
                }
            }));
        }
    }, []);

    useEffect(() => {
        console.log("🔥 RESET TRIGGERED");

        setSelectedbeam(null);
        setselectedstocktype(null);
        setselecteddesign(null);

        setBeamdata([]);
        setDesigndata([]);

    }, [resetFlag]);

    const selectedProperty = getAllPropertyData?.find((p) => p.PrpCode == FormState.values.PrpCode) || null;
    const selectedYear = getAllYearData?.find((y) => y.YearNo == FormState.values.YearNo) || null;


    const fetchissuedesign = async (values) => {
        try {
            const payload = {
                prpcode: FormState.values.PrpCode,
                yearno: FormState.values.YearNo,
                strcode: '012',
                txntype: 'beam_weft_issue',
                dsncode: values?.DsnCode || '',
            };

            console.log("Issue Design Payload:", payload);

            const response = await axios.get(
                `${API}/api/get_weftissuedesign_help`,
                getRequestConfig({
                    params: payload,
                })
            );

            console.log("Issue Design API Response:", response?.data);

            const data =
                response?.data?.data?.IssueDesign || [];

            console.log("Issue Design List:", data);

            if (response?.data?.success) {
                setIssueDesigndata(data);
            } else {
                setIssueDesigndata([]);
            }

        } catch (error: any) {
            console.log(
                "Issue Design API Error:",
                error?.response?.data || error?.message
            );

            setIssueDesigndata([]);
        }
    };

    return (
        <>
            <Modal visible={isVisible} transparent animationType="none"
                onRequestClose={onClose}
            >
                <View style={styles.modalOverlay}>
                    {isLoadingMore && <FullScreenLoader />}
                    <Animated.View style={[styles.drawerContainer, { transform: [{ translateY: slideAnim }] }]}>

                        <View style={styles.topHeader}>
                            <TouchableOpacity onPress={onClose}>
                                <Icon name="arrow-back" size={22} color="#fff" />
                            </TouchableOpacity>
                            <Text style={styles.topHeaderTitle}>Weft Issue Detail</Text>
                            <TouchableOpacity onPress={onClose}>
                                {/* <Icon name="close" size={22} color="#fff" /> */}
                            </TouchableOpacity>
                        </View>

                        <ScrollView
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={{ paddingBottom: 0 }}
                        >
                            <View style={styles.mainCard}>
                                <View style={styles.field}>
                                    <Text style={styles.label}>Property *</Text>
                                    <SearchableDropdown
                                        data={getAllPropertyData || []}
                                        labelKey="LngName"
                                        valueKey="PrpCode"
                                        placeholder="Select Property"
                                        initialValue={selectedProperty}
                                        onSelect={(item) => {
                                            setFormState(prev => ({
                                                ...prev,
                                                values: {
                                                    ...prev.values,
                                                    PrpCode: item?.PrpCode || '',
                                                }
                                            }));
                                        }}
                                    />
                                </View>

                                <View style={styles.field}>
                                    <Text style={styles.label}>Year *</Text>
                                    <SearchableDropdown
                                        data={getAllYearData || []}
                                        labelKey="YearName"
                                        valueKey="YearNo"
                                        placeholder="Select Year"
                                        initialValue={selectedYear}
                                        onSelect={(item) => {
                                            setFormState(prev => ({
                                                ...prev,
                                                values: {
                                                    ...prev.values,
                                                    YearNo: item?.YearNo || '',
                                                }
                                            }));
                                        }}
                                    />
                                </View>

                                <View style={styles.field}>
                                    <Text style={styles.label}>Issue Date</Text>
                                    <TouchableOpacity
                                        style={styles.inputBox}
                                        onPress={() => setCheckingDatePickerVisible(true)}
                                    >
                                        <Text style={styles.inputText}>
                                            {FormState?.values?.IssDate
                                                ? formatDisplayDate(FormState.values.IssDate)
                                                : formatDisplayDate(new Date())}
                                        </Text>
                                        <DateTimePickerModal
                                            isVisible={checkingDatePickerVisible}
                                            mode="date"
                                            date={
                                                FormState?.values?.IssDate
                                                    ? new Date(FormState.values.IssDate)
                                                    : new Date()
                                            }
                                            // onConfirm={(date) => {
                                            //     const selectedDate = new Date(date);
                                            //     selectedDate.setHours(0, 0, 0, 0);

                                            //     setFormState(prev => ({
                                            //         ...prev,
                                            //         values: {
                                            //             ...prev.values,
                                            //             IssDate: selectedDate.toISOString(),
                                            //         }
                                            //     }));

                                            //     setCheckingDatePickerVisible(false);
                                            // }}
                                            onConfirm={(date) => {
                                                const selectedDate = new Date(date);
                                                selectedDate.setHours(0, 0, 0, 0);

                                                const isoDate = selectedDate.toISOString();

                                                // 🔥 updated values bana lo (IMPORTANT)
                                                const updatedValues = {
                                                    ...FormState.values,
                                                    IssDate: isoDate
                                                };

                                                // ✅ state update
                                                setFormState(prev => ({
                                                    ...prev,
                                                    values: updatedValues
                                                }));

                                                // 🔥 API call with latest values
                                                checkvoucher(updatedValues);

                                                setCheckingDatePickerVisible(false);
                                            }}
                                            onCancel={() => setCheckingDatePickerVisible(false)}
                                        />
                                        <Icon name="calendar-today" size={18} color="#555" />
                                    </TouchableOpacity>
                                </View>

                                {/* VOUCHER */}
                                <View style={styles.field}>
                                    <Text style={styles.label}>Voucher No *</Text>

                                    <View style={styles.row3}>
                                        <RNTextInput
                                            style={[styles.input3, { backgroundColor: '#f1f5f9' }]}
                                            value={FormState.values.month || ""}
                                            editable={false}
                                        />

                                        <RNTextInput
                                            style={styles.input3}
                                            value={FormState.values.IssNo || ""}
                                            placeholder="No"
                                            onChangeText={(text) => {
                                                setFormState(prev => ({
                                                    ...prev,
                                                    values: {
                                                        ...prev.values,
                                                        IssNo: text
                                                    }
                                                }));
                                            }}
                                        />

                                        <RNTextInput
                                            style={styles.input3}
                                            value={FormState.values.suffix}
                                            placeholder="Suffix"
                                            onChangeText={(text) => {
                                                const upperText = text.toUpperCase();
                                                setFormState(prev => ({
                                                    ...prev,
                                                    values: {
                                                        ...prev.values,
                                                        suffix: upperText
                                                    }
                                                }));
                                            }}
                                        />
                                    </View>
                                </View>

                                {/* BEAM */}
                                <View style={styles.field}>
                                    <Text style={styles.label}>Beam *</Text>
                                    <PartyDropdown
                                        data={Beamdata}
                                        placeholder="Select Beam"
                                        labelKey={["BeamNo"]}
                                        valueKey="BeamNo"
                                        pageSize={12}
                                        initialValue={selectedbeam ?? null}
                                        selected={selectedbeam ?? null}
                                        type="weftbeam"
                                        onSelect={(item) => {
                                            setSelectedbeam(item);
                                            const updatedValues = {
                                                ...FormState.values,
                                                BeamNo: item?.BeamNo || "",
                                                BeamUId: item?.UId || "",
                                                WarpLen: item?.WarpLen || "",
                                                TranDate: item?.TranDate || ""
                                            };
                                            setFormState(prev => ({
                                                ...prev,
                                                values: updatedValues
                                            }));
                                        }}
                                        setSelected={(val) => {
                                            if (!val) {
                                                setFormState(prev => ({
                                                    ...prev,
                                                    values: {
                                                        ...prev.values,
                                                        BeamNo: "",
                                                        BeamUId: "",
                                                        WarpLen: "",
                                                        TranDate: ""
                                                    }
                                                }));
                                            } else {
                                                setFormState(prev => ({
                                                    ...prev,
                                                    values: {
                                                        ...prev.values,
                                                        BeamNo: val?.BeamNo || "",
                                                        BeamUId: val?.UId || "",
                                                        WarpLen: val?.WarpLen || "",
                                                        TranDate: val?.TranDate || ""
                                                    }
                                                }));
                                            }
                                        }}
                                    />
                                </View>


                                <View style={styles.field}>
                                    <Text style={styles.label}>Warping Date</Text>
                                    <TouchableOpacity
                                        style={styles.inputBox}
                                    // onPress={() => setCheckingDatePickerVisible(true)}
                                    >
                                        <Text style={styles.inputText}>
                                            {FormState?.values?.TranDate}
                                        </Text>
                                        {/* <Icon name="calendar-today" size={18} color="#555" /> */}
                                    </TouchableOpacity>
                                </View>

                                <View style={styles.field}>
                                    <Text style={styles.label}>Stcok Type *</Text>
                                    <PartyDropdown
                                        data={getStockTypes}
                                        placeholder="Select Stock Type"
                                        labelKey={["StkType", "stktypename"]}
                                        valueKey="StkType"
                                        pageSize={12}
                                        initialValue={selectedstocktype ?? null}
                                        selected={selectedstocktype ?? null}
                                        type="stocktype"
                                        // onSelect={(item) => {
                                        //     setselectedstocktype(item);
                                        //     setFormState(prev => ({
                                        //         ...prev,
                                        //         values: {
                                        //             ...prev.values,
                                        //             StkType: item?.StkType
                                        //         }
                                        //     }));
                                        // }}
                                        onSelect={(item) => {
                                            setselectedstocktype(item);

                                            const updatedValues = {
                                                ...FormState.values,
                                                StkType: item?.StkType || ""
                                            };

                                            setFormState(prev => ({
                                                ...prev,
                                                values: updatedValues
                                            }));

                                            fetchDesign(updatedValues); // ✅ direct updated values
                                        }}
                                        // setSelected={(val) => {
                                        //     if (!val) {
                                        //         setFormState(prev => ({
                                        //             ...prev,
                                        //             values: {
                                        //                 ...prev.values,
                                        //                 StkType: ""
                                        //             }
                                        //         }));
                                        //     } else {
                                        //         setFormState(prev => ({
                                        //             ...prev,
                                        //             values: {
                                        //                 ...prev.values,
                                        //                 StkType: val?.StkType || ""
                                        //             }
                                        //         }));
                                        //     }
                                        // }}
                                        setSelected={(val) => {
                                            const updatedValues = {
                                                ...FormState.values,
                                                StkType: val?.StkType || ""
                                            };

                                            setFormState(prev => ({
                                                ...prev,
                                                values: updatedValues
                                            }));

                                            // if (val) {
                                            //     fetchDesign(updatedValues); // ✅ call here also
                                            // }
                                        }}
                                    />
                                </View>

                                <View style={styles.field}>
                                    <Text style={styles.label}>Design *</Text>
                                    <PartyDropdownforweft
                                        data={Designdata}
                                        placeholder="Select Design"
                                        labelKey={["DsnCode", "DsnName"]}
                                        valueKey="DsnCode"
                                        pageSize={12}
                                        initialValue={selecteddesign ?? null}
                                        selected={selecteddesign ?? null}
                                        type="Designdata"
                                        onSelect={(item) => {
                                            setselecteddesign(item);
                                            const updatedValues = {
                                                ...FormState.values,
                                                DsnCode: item?.DsnCode || "",
                                                DsnName: item?.DsnName || ""
                                            };
                                            setFormState(prev => ({
                                                ...prev,
                                                values: updatedValues
                                            }));
                                        }}

                                        // setSelected={(val) => {
                                        //     if (!val) {
                                        //         setFormState(prev => ({
                                        //             ...prev,
                                        //             values: {
                                        //                 ...prev.values,
                                        //                 DsnCode: "",
                                        //                 DsnName: ""
                                        //             }
                                        //         }));
                                        //     } else {
                                        //         setFormState(prev => ({
                                        //             ...prev,
                                        //             values: {
                                        //                 ...prev.values,
                                        //                 DsnCode: val?.DsnCode,
                                        //                 DsnName: val?.DsnName
                                        //             }
                                        //         }));

                                        //         fetchissuedesign(updatedValues);
                                        //     }
                                        // }}

                                        setSelected={(val) => {
                                            if (!val) {
                                                setFormState(prev => ({
                                                    ...prev,
                                                    values: {
                                                        ...prev.values,
                                                        DsnCode: "",
                                                        DsnName: ""
                                                    }
                                                }));
                                            } else {
                                                const updatedValues = {
                                                    ...FormState.values,
                                                    DsnCode: val?.DsnCode || "",
                                                    DsnName: val?.DsnName || ""
                                                };

                                                setFormState(prev => ({
                                                    ...prev,
                                                    values: updatedValues
                                                }));

                                                console.log("Selected Design:", val);

                                                fetchissuedesign(updatedValues);
                                            }
                                        }}
                                    />

                                </View>
                                {canShowIssueDesign && (
                                    <View style={styles.field}>
                                        <Text style={styles.label}>Issue Design *</Text>
                                        <PartyDropdownforweft
                                            data={IssueDesigndata}
                                            placeholder="Select Design"
                                            labelKey={["IssDsnCode", "IssDsnName"]}
                                            valueKey="IssDsnCode"
                                            pageSize={12}
                                            initialValue={selectedissuedesign ?? null}
                                            selected={selectedissuedesign ?? null}
                                            type="issuedesign"
                                            onSelect={(item) => {
                                                setselectedissuedesign(item);
                                                const updatedValues = {
                                                    ...FormState.values,
                                                    IssDsnCode: item?.IssDsnCode || "",
                                                    IssDsnName: item?.IssDsnName || ""
                                                };
                                                setFormState(prev => ({
                                                    ...prev,
                                                    values: updatedValues
                                                }));
                                            }}

                                            setSelected={(val) => {
                                                if (!val) {
                                                    setFormState(prev => ({
                                                        ...prev,
                                                        values: {
                                                            ...prev.values,
                                                            IssDsnCode: "",
                                                            IssDsnName: ""
                                                        }
                                                    }));
                                                } else {
                                                    setFormState(prev => ({
                                                        ...prev,
                                                        values: {
                                                            ...prev.values,
                                                            IssDsnCode: val?.IssDsnCode,
                                                            IssDsnName: val?.IssDsnName
                                                        }
                                                    }));
                                                }
                                            }}
                                        />
                                    </View>
                                )}
                            </View>
                        </ScrollView>

                        {/* <TouchableOpacity
                            style={styles.nextButton}
                            onPress={handleSaveNext}
                        >
                            <Text style={styles.nextButtonText}>Save & Next</Text>
                        </TouchableOpacity> */}

                        <TouchableOpacity
                            style={styles.nextButton}
                            // onPress={() => setShowNextModal(true)}
                            onPress={handleNextPress}
                        >
                            <Text style={styles.nextButtonText}>Next</Text>
                        </TouchableOpacity>
                    </Animated.View>
                </View>
            </Modal>
        </>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: '#e6f0f3',
        marginTop: 35
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
    scrollableFormContainer: {
        flex: 1,
        padding: 10,
    },
    scrollableFormContent: {
        paddingBottom: 80,
    },
    label1: {
        paddingVertical: 5,
        color: '#000',
        marginTop: 10,
        fontWeight: "500",
        marginRight: 20
    },
    modalCard: {
        flex: 1,
        backgroundColor: theme.SURFACE,
        borderRadius: 12,
        padding: 12,
        elevation: 2,
        shadowColor: theme.SHADOW,
        marginBottom: 12
    },
    field: {
        marginTop: 15,
        color: '#000'
    },
    label: {
        fontSize: 14,
        fontWeight: '500',
        color: '#000',
        marginBottom: 6
    },
    inputBox: {
        backgroundColor: '#eef0f3', // 🔥 soft grey like your UI
        borderRadius: 14,
        paddingHorizontal: 14,
        paddingVertical: 14,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#e2e4e8',
        color: '#000'
    },
    inputText: {
        color: '#000',
        fontSize: 15
    },
    dateTrigger: {
        padding: 12,
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        backgroundColor: '#fafafa'
    },
    row3: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 8 // RN new version
    },
    input3: {
        flex: 1, // 👈 equal width for all 3
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 8,
        padding: 10,
        backgroundColor: '#fff',
        color: '#000'
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 14,
        padding: 14,
        marginTop: 12,
        elevation: 2
    },
    cardTitle: {
        fontSize: 15,
        fontWeight: '600',
        marginBottom: 10,
        color: '#000'
    },
    topHeader: {
        backgroundColor: '#0e7490',
        paddingTop: 30,
        paddingBottom: 15,
        paddingHorizontal: 15,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    topHeaderTitle: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600'
    },
    mainCard: {
        backgroundColor: '#fff',
        margin: 12,
        borderRadius: 16,
        padding: 14,
        elevation: 3
    },
    nextButton: {
        backgroundColor: '#0e7490',
        margin: 12,
        padding: 16,
        borderRadius: 12,
        alignItems: 'center'
    },
    nextButtonText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 15
    },
    inputWrapper: {
        borderWidth: 1,
        borderColor: '#d1d5db',
        borderRadius: 12,
        padding: 6,
        backgroundColor: '#fff'
    },

    errorBorder: {
        borderColor: '#ef4444' // red
    },

    errorText: {
        color: '#ef4444',
        fontSize: 12,
        marginTop: 4,
        marginLeft: 2
    },
    label11: {
        fontSize: 14,
        fontWeight: '500',
        marginBottom: 6,
        color: '#111827'
    },
    dateTriggerText: { fontSize: 14, color: theme.TEXT_PRIMARY, fontWeight: '600' },
    overlayContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 999
    },

    overlayCard: {
        width: '92%',
        backgroundColor: '#eef2f7',   // 👈 contrast bg
        borderRadius: 16,
        padding: 12,
        maxHeight: '80%'
    },

    cardTitle: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 10,
        color: '#0f172a'
    },

    indexText: {
        color: '#fff',
        fontWeight: '700'
    },

    cartonNo: {
        fontSize: 14,
        fontWeight: '700',
        color: '#0e7490'
    },

    subText: {
        fontSize: 12,
        color: '#64748b',
        marginTop: 2
    },

    rightSection: {
        alignItems: 'flex-end',
        justifyContent: 'center'
    },

    qtyText: {
        fontSize: 12,
        color: '#444'
    },

    cheesText: {
        fontSize: 12,
        color: '#0e7490',
        fontWeight: '600',
        marginTop: 4
    },

    primaryBtn: {
        backgroundColor: '#0e7490',
        paddingVertical: 12,
        borderRadius: 20,
        alignItems: 'center',
        marginTop: 10
    },

    primaryText: {
        color: '#fff',
        fontWeight: '600'
    },
    fullScreenContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: '#f4f6f8',
        zIndex: 999
    },

    fullHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: 40,
        paddingBottom: 12,
        paddingHorizontal: 16,
        backgroundColor: '#0e7490'
    },

    headerTitle: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
        marginLeft: 12
    },

    designCard: {
        backgroundColor: '#fff',
        margin: 12,
        padding: 14,
        borderRadius: 14,
        elevation: 3
    },

    designRow: {
        flexDirection: 'row',
        justifyContent: 'space-between'
    },

    label: {
        fontSize: 11,
        color: '#64748b'
    },

    value: {
        fontSize: 14,
        fontWeight: '700',
        color: '#0f172a',
        marginTop: 2
    },

    listCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        backgroundColor: '#fff',
        padding: 14,
        borderRadius: 14,
        marginBottom: 10,
        elevation: 2
    },

    leftSection: {
        flexDirection: 'row',
        alignItems: 'center'
    },

    indexCircle: {
        width: 32,
        height: 32,
        borderRadius: 10,
        backgroundColor: '#0e7490',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10
    },
    selectedCard: {
        borderWidth: 2,
        borderColor: '#0e7490',
        backgroundColor: '#e0f2f1'
    },

    // indexText: {
    //     color: '#fff',
    //     fontWeight: '700'
    // },

    // cartonNo: {
    //     fontSize: 14,
    //     fontWeight: '700',
    //     color: '#0e7490'
    // },

    // subText: {
    //     fontSize: 12,
    //     color: '#64748b',
    //     marginTop: 2
    // }
    // dateTrigger: { backgroundColor: '#F6F7FA', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
});

export default AddWeftIssueDetail;
