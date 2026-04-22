import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, Animated, Dimensions, ScrollView, ActivityIndicator, Alert, TextInput as RNTextInput, } from 'react-native';
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
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePickerModal from 'react-native-modal-datetime-picker';

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
        setIsLoading
    } = props;

    const slideAnim = useRef(new Animated.Value(0)).current;
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [getShiftData, setShiftData] = useState([]);
    const [checkingDatePickerVisible, setCheckingDatePickerVisible] = useState(false);
    const [checkingDatePickerVisible1, setCheckingDatePickerVisible1] = useState(false);
    let cancelToken: any;

    console.log("FormState.values", FormState.values)


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

    const soshow = async () => {
        const userPtype = await AsyncStorage.getItem('user_prptype');

        // 🔒 guard (important)
        if (!FormState.values.PrpCode || !FormState.values.YearNo) {
            return;
        }

        try {
            setIsLoading(true);

            const source = axios.CancelToken.source();

            const historyPayload = {
                uid: FormState.values.uid || '0',
                prpcode: FormState.values.PrpCode,
                yearno: FormState.values.YearNo,
                strcode: '012',
                action: 'add',
                txntype: 'weft_selvedge_issue'
            };

            console.log("GET Params:", historyPayload);

            const response = await axios.get(
                `${API}/api/warpissueshow`,
                {
                    params: historyPayload,
                    headers: {
                        Authorization: `Bearer ${token}`,
                        Accept: 'application/json',
                    },
                    cancelToken: source.token
                }
            );

            // 🔥 DEBUG (keep this for now)
            console.log("FULL RESPONSE:", response.data);

            // ✅ correct extraction
            const resData = response?.data?.data || {};
            const mainData = resData?.main?.[0] || {};

            console.log("MAIN DATA:", mainData);
            console.log("D1:", resData?.d1);
            console.log("D2:", resData?.d2);

            const cleanMainData = Object.fromEntries(
                Object.entries(mainData).filter(([key, value]) => {
                    return value !== null && value !== '';
                })
            );
            if (response?.data?.success) {
                const updatedValues = {
                    ...FormState.values,
                    ...cleanMainData,
                    d1: resData?.d1 || [],
                    d2: resData?.d2 || []
                };
                setFormState(prev => ({
                    ...prev,
                    values: updatedValues
                }));
                checkvoucher(updatedValues);
            }
        } catch (error) {
            if (axios.isCancel(error)) {
                console.log("Request cancelled:", error.message);
            } else {
                console.log("ERROR STATUS:", error?.response?.status);
                console.log("ERROR DATA:", error?.response?.data);
            }
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
                vouno: values.IssNo,
                suffix: values.suffix || '',
                month: month,
                uid: values.UId,

                // ✅ IMPORTANT: send ISO date directly
                date: formatDisplayDate(FormState.values.IssDate),
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
                Alert.alert(
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

    useEffect(() => {
        if (
            FormState.values.PrpCode &&
            FormState.values.YearNo
        ) {
            soshow();
        }
    }, [FormState.values.PrpCode, FormState.values.YearNo]);


    const handleLoaddata = async () => {
        onLoadPress();
    }

    // const formatDisplayDate = (d?: Date | string | null) => {
    //     if (!d) return '';
    //     const date = typeof d === 'string' ? new Date(d) : d;
    //     try {
    //         return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
    //     } catch {
    //         const dd = date.getDate().toString().padStart(2, '0');
    //         const mm = (date.getMonth() + 1).toString().padStart(2, '0');
    //         const yy = date.getFullYear();
    //         return `${dd}-${mm}-${yy}`;
    //     }
    // };

    const formatDisplayDate = (date) => {
        if (!date) return '';
        const d = new Date(date);
        if (isNaN(d)) return '';

        return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')
            }-${d.getFullYear()}`;
    };

    const toISODate = (date) => {
        return date.toISOString().split('T')[0]; // YYYY-MM-DD
    };

    const getToken = () => token
    const selectedProperty = getAllPropertyData?.find((p) => p.PrpCode == FormState.values.PrpCode) || null;
    const selectedYear = getAllYearData?.find((y) => y.YearNo == FormState.values.YearNo) || null;

    return (
        <>
            <Modal visible={isVisible} transparent animationType="none"
                onRequestClose={onClose}
            >
                <View style={styles.modalOverlay}>
                    {isLoadingMore && <FullScreenLoader />}
                    <Animated.View style={[styles.drawerContainer, { transform: [{ translateY: slideAnim }] }]}>

                        <View style={styles.modalCard}>

                            <View style={styles.header}>
                                <Text style={styles.headerTitle}>Weft Issue Detail</Text>

                                <TouchableOpacity onPress={onClose}>
                                    <Icon name="close" size={22} color="#444" />
                                </TouchableOpacity>
                            </View>

                            {/* 🔷 HEADER */}
                            <ScrollView
                                showsVerticalScrollIndicator={false}
                                contentContainerStyle={{ paddingBottom: 120 }}
                            >
                                {/* PROPERTY */}
                                <View style={styles.field}>
                                    <Text style={styles.label}>
                                        Select Property <Text style={{ color: 'red' }}>*</Text>
                                    </Text>

                                    <View style={{ flex: 1 }}>
                                        <SearchableDropdown
                                            data={getAllPropertyData || []}
                                            labelKey="LngName"
                                            valueKey="PrpCode"
                                            placeholder="Choose property..."
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
                                </View>

                                {/* YEAR */}
                                <View style={styles.field}>
                                    <Text style={styles.label}>
                                        Select Year <Text style={{ color: 'red' }}>*</Text>
                                    </Text>

                                    <View style={{ flex: 1 }}>
                                        <SearchableDropdown
                                            data={getAllYearData || []}
                                            labelKey="YearName"
                                            valueKey="YearNo"
                                            placeholder="Choose year..."
                                            initialValue={selectedYear}
                                            onSelect={(item) => {
                                                setFormState(prev => ({
                                                    ...prev,
                                                    values: {
                                                        ...prev.values,
                                                        YearNo: item?.YearNo || '',
                                                        YearName: item?.YearName || ''
                                                    }
                                                }));
                                            }}
                                        />
                                    </View>
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
                                            onConfirm={(date) => {
                                                const selectedDate = new Date(date);
                                                selectedDate.setHours(0, 0, 0, 0);

                                                setFormState(prev => ({
                                                    ...prev,
                                                    values: {
                                                        ...prev.values,
                                                        IssDate: selectedDate.toISOString(),
                                                    }
                                                }));

                                                setCheckingDatePickerVisible(false);
                                            }}
                                            onCancel={() => setCheckingDatePickerVisible(false)}
                                        />

                                        <Icon name="calendar-today" size={18} color="#777" />
                                    </TouchableOpacity>
                                </View>

                                <View style={styles.field}>
                                    <Text style={styles.label}>
                                        Voucher No <Text style={{ color: 'red' }}>*</Text>
                                    </Text>

                                    <View style={styles.row3}>

                                        <RNTextInput
                                            style={[styles.input3]}
                                            value={FormState.values.month || ""}
                                            placeholder="Month"
                                            editable={false}
                                        />

                                        <RNTextInput
                                            style={[styles.input3]}
                                            value={FormState.values.IssNo || ""}
                                            placeholder="Vou No"
                                            onChangeText={(text) => {
                                                if (text === "" || re.test(text)) {
                                                    setFormState(prev => ({
                                                        ...prev,
                                                        values: {
                                                            ...prev.values,
                                                            IssNo: text
                                                        }
                                                    }));
                                                }
                                            }}
                                        />

                                        <RNTextInput
                                            style={[styles.input3]}
                                            value={FormState.values.suffix}
                                            placeholder="suffix"
                                            onChangeText={(text) => {
                                                // if (!FormState.values.IssDate) {
                                                //     Alert.alert("Please select Issue Date first");
                                                //     return;
                                                // }
                                                // if (!FormState.values.IssNo) {
                                                //     Alert.alert("Please enter Issue No");
                                                //     return;
                                                // }

                                                const upperText = text.toUpperCase();

                                                const updatedValues = {
                                                    ...FormState.values,
                                                    suffix: upperText
                                                };

                                                setFormState(prev => ({
                                                    ...prev,
                                                    values: updatedValues
                                                }));

                                                checkvoucher(updatedValues);
                                            }}
                                        />

                                    </View>
                                </View>

                            </ScrollView>

                            {/* 🔘 BUTTON */}
                            <TouchableOpacity
                                style={styles.button}
                                onPress={handleLoaddata}
                            >
                                {isLoading ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text style={styles.buttonText}>Load Data</Text>
                                )}
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
    // label: {
    //     fontSize: 16,
    //     marginBottom: 5,
    //     color: '#000',
    // },
    scrollableFormContainer: {
        flex: 1,
        padding: 10,
    },
    scrollableFormContent: {
        paddingBottom: 80, // Extra space for the Load button
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
        backgroundColor: theme.SURFACE, // 🔥 light grey bg like screenshot
        // borderTopLeftRadius: 25,
        // borderTopRightRadius: 25,
        // paddingHorizontal: 16,
        // paddingTop: 10
        borderRadius: 12,
        padding: 12,
        elevation: 2,
        shadowColor: theme.SHADOW,
        marginBottom: 12
    },

    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: 0,
        // borderColor: '#000'
    },

    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333'
    },

    field: {
        marginTop: 15
    },

    label: {
        fontSize: 14,
        fontWeight: '500',
        color: '#444',
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
        color: '#333',
        fontSize: 15
    },

    button: {
        position: 'absolute',
        bottom: 20,
        left: 16,
        right: 16,
        backgroundColor: '#0e7490', // 🔥 same theme feel
        padding: 16,
        borderRadius: 14,
        alignItems: 'center',
        elevation: 5
    },

    buttonText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '600'
    },
    dateTrigger: {
        padding: 12,
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        backgroundColor: '#fafafa'
    },

    loadButton: {
        position: 'absolute',
        bottom: 20,
        left: 20,
        right: 20,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#007EA7',
        padding: 14,
        borderRadius: 10,
        elevation: 5
    },

    loadText: {
        color: '#fff',
        marginLeft: 8,
        fontWeight: '600'
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
    dateTriggerText: { fontSize: 14, color: theme.TEXT_PRIMARY, fontWeight: '600' },
    dateTrigger: { backgroundColor: '#F6F7FA', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
});

export default AddWeftIssueDetail;
