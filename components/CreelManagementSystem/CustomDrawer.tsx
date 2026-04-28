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
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePickerModal from 'react-native-modal-datetime-picker';

const { height } = Dimensions.get('window');

const CustomDrawer = (props) => {
    const { isVisible,
        onClose,
        isLoading,
        selectedItemStatus,
        getAllPropertyData,
        FormState,
        setFormState,
        getAllYearData,
        onLoadPress,
        token
    } = props;

    const slideAnim = useRef(new Animated.Value(0)).current;
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [getShiftData, setShiftData] = useState([]);
    const [checkingDatePickerVisible, setCheckingDatePickerVisible] = useState(false);
    const [checkingDatePickerVisible1, setCheckingDatePickerVisible1] = useState(false);
    let cancelToken: any;

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



    const handleLoaddata = async () => {
        onLoadPress();
    }

    const formatDisplayDate = (d?: Date | string | null) => {
        if (!d) return '';
        const date = typeof d === 'string' ? new Date(d) : d;
        try {
            return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
        } catch {
            const dd = date.getDate().toString().padStart(2, '0');
            const mm = (date.getMonth() + 1).toString().padStart(2, '0');
            const yy = date.getFullYear();
            return `${dd}-${mm}-${yy}`;
        }
    };

    const toISODate = (d: Date) => {
        if (!d) return '';
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
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
                                                    LngName: item?.LngName || ''

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
                                                    YearName: item?.YearName || ''
                                                }
                                            }));
                                        }}
                                        multiple={false}
                                        emptyMessage="No years data available" />
                                </View>

                                <View style={{ marginBottom: 10 }} >
                                    <Text style={styles.label}>From Date</Text>
                                    <TouchableOpacity
                                        style={styles.dateTrigger}
                                        onPress={() => setCheckingDatePickerVisible(true)}
                                    >
                                        <Text style={{ color: '#000' }}>
                                            {FormState.values.fromdate
                                                ? formatDisplayDate(FormState.values.fromdate)
                                                : formatDisplayDate(new Date())}
                                        </Text>
                                    </TouchableOpacity>

                                    <DateTimePickerModal
                                        isVisible={checkingDatePickerVisible}
                                        mode="date"
                                        onConfirm={(date) => {
                                            const selectedDate = new Date(date);
                                            selectedDate.setHours(0, 0, 0, 0);

                                            setFormState(prev => ({
                                                ...prev,
                                                values: {
                                                    ...prev.values,
                                                    fromdate: toISODate(selectedDate)
                                                }
                                            }));

                                            setCheckingDatePickerVisible(false);
                                        }}
                                        onCancel={() => setCheckingDatePickerVisible(false)}
                                    />
                                </View>

                                <View style={{ marginBottom: 10 }} >
                                    <Text style={styles.label}>TO Date</Text>
                                    <TouchableOpacity
                                        style={styles.dateTrigger}
                                        onPress={() => setCheckingDatePickerVisible1(true)}
                                    >
                                        <Text style={{ color: '#000' }}>
                                            {FormState.values.todate
                                                ? formatDisplayDate(FormState.values.todate)
                                                : formatDisplayDate(new Date())}
                                        </Text>
                                    </TouchableOpacity>

                                    <DateTimePickerModal
                                        isVisible={checkingDatePickerVisible1}
                                        mode="date"
                                        onConfirm={(date) => {
                                            const selectedDate = new Date(date);
                                            selectedDate.setHours(0, 0, 0, 0);

                                            setFormState(prev => ({
                                                ...prev,
                                                values: {
                                                    ...prev.values,
                                                    todate: toISODate(selectedDate)
                                                }
                                            }));

                                            setCheckingDatePickerVisible1(false);
                                        }}
                                        onCancel={() => setCheckingDatePickerVisible1(false)}
                                    />
                                </View>

                                <View style={{ marginBottom: 10 }}>
                                    <View style={{ flexDirection: 'row' }}>
                                        <TouchableOpacity
                                            onPress={() => {
                                                setFormState(prev => ({
                                                    ...prev,
                                                    values: {
                                                        ...prev.values,
                                                        status: 'P'
                                                    }
                                                }));
                                            }}
                                            style={{
                                                flex: 1,
                                                padding: 10,
                                                borderRadius: 8,
                                                marginRight: 5,
                                                alignItems: 'center',
                                                backgroundColor: FormState.values.status === 'P' ? '#007bff' : '#eee'
                                            }}
                                        >
                                            <Text style={{
                                                color: FormState.values.status === 'P' ? '#fff' : '#000',
                                                fontWeight: 'bold'
                                            }}>
                                                Pending
                                            </Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            onPress={() => {
                                                setFormState(prev => ({
                                                    ...prev,
                                                    values: {
                                                        ...prev.values,
                                                        status: 'C'
                                                    }
                                                }));
                                            }}
                                            style={{
                                                flex: 1,
                                                padding: 10,
                                                borderRadius: 8,
                                                marginLeft: 5,
                                                alignItems: 'center',
                                                backgroundColor: FormState.values.status === 'C' ? '#28a745' : '#eee'
                                            }}
                                        >
                                            <Text style={{
                                                color: FormState.values.status === 'C' ? '#fff' : '#000',
                                                fontWeight: 'bold'
                                            }}>
                                                Completed
                                            </Text>
                                        </TouchableOpacity>

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
    dateTriggerText: { fontSize: 14, color: theme.TEXT_PRIMARY, fontWeight: '600' },
    dateTrigger: { backgroundColor: '#F6F7FA', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
});

export default CustomDrawer;
