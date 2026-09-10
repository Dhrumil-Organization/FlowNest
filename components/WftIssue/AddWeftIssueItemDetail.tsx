import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, Animated, Dimensions, ScrollView, FlatList, ActivityIndicator, Alert, TextInput as RNTextInput, } from 'react-native';
import Icon from '@expo/vector-icons/MaterialIcons';
// import LinearGradient from 'react-native-linear-gradient';
// import { DesignData, ItemData, ItemStatus } from './Modal';
import theme from '@/components/theme';
// import SearchableDropdown from '../Shared/SearchableDropdown';
// import { Switch } from 'react-native';
import axios from 'axios';
import { API } from '../../common/API/dynamicAPI';
// import Snackbar from '@/common/utils/snackbarCompat';
import FullScreenLoader from '@/components/FullScreenLoader';
import AsyncStorage from '@/common/utils/compatibleStorage';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { showSnackbar, showSuccess, showError, showWarning } from '@/common/utils/snackbar';
// import PartyDropdown from '../Shared/PartyDropdown';

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
        hasIssueDesignAccess = false
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
    const [cartonSummary, setCartonSummary] = useState([]);
    const [getStockTypes, setStockTypes] = useState([
        { stktypename: 'In house', StkType: 'I' },
        { stktypename: 'Process house', StkType: 'P' }
    ]);
    const [showNextModal, setShowNextModal] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    const [errors, setErrors] = useState({});

    // console.log("maindesigndata", maindesigndata);

    let cancelToken: any;

    // console.log("FormState.values", FormState.values)

    console.log("========== ISSUE DESIGN DEBUG ==========");
    console.log("hasIssueDesignAccess =", hasIssueDesignAccess);
    console.log("DsnCode =", FormState.values.DsnCode);
    console.log("IssDsnCode =", FormState.values.IssDsnCode);
    console.log("========================================");

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

    useEffect(() => {
        if (
            isEditMode &&
            FormState.values.DsnCode &&
            FormState.values.PrpCode &&
            FormState.values.YearNo &&
            FormState.values.BeamUId   // 🔥 IMPORTANT
        ) {
            fetchdesignwiseitem();   // 🔥 list load
        }
    }, [
        isEditMode,
        FormState.values.DsnCode,
        FormState.values.IssDsnCode,
        FormState.values.PrpCode,
        FormState.values.YearNo,
        FormState.values.BeamUId,
        hasIssueDesignAccess
    ]);

    useEffect(() => {
        if (isEditMode && editData) {

            const m = editData.mainData || {};

            setFormState(prev => ({
                ...prev,
                values: {
                    ...prev.values,
                    UId: m.UId || '',
                    PrpCode: m.PrpCode || '',
                    IssNo: m.IssNo || '',
                    IssDate: m.IssDate || '',
                    Remark: m.Remark || '',
                    BatchNo: m.BatchNo || '',
                    BeamUId: m.BeamUId || '',
                    DsnCode: m.DsnCode || '',
                    month: m.month || '',
                    suffix: m.suffix || ''
                }
            }));
        }
    }, [editData]);

    useEffect(() => {
        if (
            isEditMode &&
            editData?.cartonSummary?.length > 0 &&
            maindesigndata.length > 0
        ) {
            const firstItem = editData.cartonSummary[0];

            const matched = maindesigndata.find(
                x => String(x.mitmcode) === String(firstItem.ItmCode)
            );

            if (matched) {
                setSelectedItem(matched);
            }
        }
    }, [editData, maindesigndata]);

    useEffect(() => {
        if (isEditMode && maindesigndata.length > 0) {
            setShowNextModal(true);   // 🔥 modal open
        }
    }, [maindesigndata]);

    useEffect(() => {
        // 🔥 FIX: this used to depend on [isVisible] ONLY, while actually
        // reading isEditMode/mainUId from the closure. If mainUId changed
        // without isVisible changing (e.g. user tapped Edit on a different
        // row before this component fully unmounted), this effect would
        // either not re-run at all, or re-run with a stale mainUId — showing
        // the previous item's data under the new item's screen.
        //
        // With the parent (index.tsx) now fetching the item via
        // handleViewClick() and only opening this screen once editData is
        // ready, this call is normally redundant. It's kept only as a
        // fallback (e.g. if this screen is ever opened without that
        // pre-fetch) and now depends on the actual values it uses, and skips
        // re-fetching once editData for this mainUId is already present.
        if (isVisible && isEditMode && mainUId && !editData) {
            handleclick({ UId: mainUId });
        }
    }, [isVisible, isEditMode, mainUId, editData]);

    useEffect(() => {
        if (
            isEditMode &&
            FormState.values.DsnCode &&
            FormState.values.PrpCode &&
            FormState.values.YearNo &&
            FormState.values.BeamUId   // 🔥 IMPORTANT
        ) {
            fetchdesignwiseitem();   // 🔥 list load
        }
    }, [
        isEditMode,
        FormState.values.DsnCode,
        FormState.values.IssDsnCode,
        FormState.values.PrpCode,
        FormState.values.YearNo,
        FormState.values.BeamUId,
        hasIssueDesignAccess
    ]);

    useEffect(() => {
        if (
            FormState.values.PrpCode &&
            FormState.values.YearNo &&
            FormState.values.DsnCode
        ) {
            fetchdesignwiseitem();
        }
    }, [
        FormState.values.PrpCode,
        FormState.values.YearNo,
        FormState.values.DsnCode,
        FormState.values.IssDsnCode,
        hasIssueDesignAccess
    ]);

    const fetchdesignwiseitem = async () => {
        const userPtype = await AsyncStorage.getItem('user_prptype');
        try {
            setIsLoading(true);
            if (cancelToken?.cancel) cancelToken.cancel();
            cancelToken = axios.CancelToken.source();
            const issueDsnCode = FormState.values.IssDsnCode?.toString().trim();
            const normalDsnCode = FormState.values.DsnCode?.toString().trim();

            const historyPayload = {
                prpcode: FormState.values.PrpCode,
                yearno: FormState.values.YearNo,
                txntype: 'weft_selvedge_issue',
                // If the current user has Issue Design access and an Issue Design
                // is selected, use IssDsnCode. Otherwise always use DsnCode.
                dsncode:
                    hasIssueDesignAccess === true && issueDsnCode
                        ? issueDsnCode
                        : normalDsnCode
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

    const handleSaveNext = () => {
        // if (!selectedItem || !selectedItem.srno) {
        //     Snackbar.show({
        //         text: "Please select item",
        //         duration: Snackbar.LENGTH_SHORT,
        //         backgroundColor: "#B00020",
        //         textColor: "#fff",
        //     });
        //     return;
        // }
        setFormState(prev => ({
            ...prev,
            values: {
                ...prev.values,
                ItmCode: selectedItem.mitmcode,
                ItmName: selectedItem.mitmname,
                srno: selectedItem.srno
            }
        }));

        console.log("Selected Item:", selectedItem);

        setShowNextModal(false);

        props.onNext && props.onNext();
    };

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

            showError(`${firstError}`, {
                text: 'OK',
                onPress: () => { },
            });

            return;
        }

        setErrors({});

        await fetchdesignwiseitem();
        setShowNextModal(true);
    };

    return (
        <>
            <Modal visible={isVisible} transparent animationType="none"
                onRequestClose={onClose}
            >
                <View style={styles.modalOverlay}>
                    {isLoadingMore && <FullScreenLoader />}
                    <Animated.View style={[styles.drawerContainer, { transform: [{ translateY: slideAnim }] }]}>
                        <View style={styles.fullScreenContainer}>
                            <View style={styles.fullHeader}>
                                <TouchableOpacity onPress={onClose}>
                                    <Icon name="arrow-back" size={22} color="#fff" />
                                </TouchableOpacity>

                                <Text style={styles.headerTitle}>Design Items</Text>

                            </View>
                            <View style={styles.designCard}>

                                <View style={styles.designRow}>
                                    <View>
                                        <Text style={styles.label}>Design Code</Text>
                                        <Text style={styles.value}>
                                            {FormState.values.DsnCode}
                                        </Text>
                                    </View>

                                    <View>
                                        <Text style={styles.label}>Design Name</Text>
                                        <Text style={styles.value}>
                                            {FormState.values.DsnName}
                                        </Text>
                                    </View>
                                </View>

                            </View>

                            {/* 🔹 LIST */}
                            <FlatList
                                data={maindesigndata}
                                keyExtractor={(item, index) => index.toString()}
                                contentContainerStyle={{ padding: 12 }}
                                showsVerticalScrollIndicator={false}
                                renderItem={({ item, index }) => {

                                    const isSelected = selectedItem?.srno === item.srno;

                                    return (
                                        <TouchableOpacity
                                            style={[
                                                styles.listCard,
                                                isSelected && styles.selectedCard   // 🔥 highlight
                                            ]}
                                            onPress={() => setSelectedItem(item)}
                                        >

                                            <View style={styles.leftSection}>

                                                <View style={styles.indexCircle}>
                                                    <Text style={styles.indexText}>
                                                        {item.srno}
                                                    </Text>
                                                </View>

                                                <View>
                                                    <Text style={styles.cartonNo}>
                                                        {item.mitmcode}
                                                    </Text>

                                                    <Text style={styles.subText} numberOfLines={2}>
                                                        {item.mitmname}
                                                    </Text>
                                                </View>

                                            </View>

                                        </TouchableOpacity>
                                    );
                                }}
                            />
                            <TouchableOpacity
                                style={styles.nextButton}
                                onPress={handleSaveNext}
                            >
                                <Text style={styles.nextButtonText}>Save & Next</Text>
                            </TouchableOpacity>

                        </View>
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
        marginTop: 15
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
        borderColor: '#e2e4e8'
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
        backgroundColor: '#fff'
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
