import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, Animated, Dimensions, ScrollView, ActivityIndicator, Alert } from 'react-native';
import Icon from '@expo/vector-icons/MaterialIcons';
// import LinearGradient from 'react-native-linear-gradient';
// import { DesignData, ItemData, ItemStatus } from './Modal';
import theme from '@/components/theme';
import SearchableDropdown from '@/Shared/SearchableDropdown';
import { Switch } from 'react-native';
import axios from 'axios';
import { API } from '../../common/API/dynamicAPI';
// import Snackbar from 'react-native-snackbar';
// import FullScreenLoader from '../Loader/Loader';
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

    const handleReset = () => {
        setFormState(prev => ({
            ...prev,
            values: {
                ...prev.values,
                PrpCode: '',
                LngName: '',
                YearNo: '',
                YearName: '',
                fromdate: '',
                todate: ''
            }
        }));
    };

    const getToken = () => token
    const selectedProperty = getAllPropertyData?.find((p) => p.PrpCode == FormState.values.PrpCode) || null;
    const selectedYear = getAllYearData?.find((y) => y.YearNo == FormState.values.YearNo) || null;

    return (
        <>
            {/* <Modal visible={isVisible} transparent animationType="none"
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
                                            date={
                                                FormState.values.fromdate
                                                    ? new Date(FormState.values.fromdate)
                                                    : new Date()
                                            }
                                            onConfirm={(date) => {
                                                const selectedDate = new Date(date);
                                                selectedDate.setHours(0, 0, 0, 0);

                                                setFormState(prev => ({
                                                    ...prev,
                                                    values: {
                                                        ...prev.values,
                                                        fromdate: toISODate(selectedDate) // ✅ DIRECT
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
                                        date={
                                            FormState.values.todate
                                                ? new Date(FormState.values.todate)
                                                : new Date()
                                        }
                                        onConfirm={(date) => {
                                            const selectedDate = new Date(date);
                                            selectedDate.setHours(0, 0, 0, 0);

                                            setFormState(prev => ({
                                                ...prev,
                                                values: {
                                                    ...prev.values,
                                                    todate: toISODate(selectedDate) // ✅ DIRECT
                                                }
                                            }));

                                            setCheckingDatePickerVisible1(false);
                                        }}
                                        onCancel={() => setCheckingDatePickerVisible1(false)}
                                    />
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
            </Modal> */}

            <Modal visible={isVisible} transparent animationType="fade">

                {/* 🔥 DARK BACKGROUND */}
                <TouchableOpacity style={styles.overlay} onPress={onClose} />

                <Animated.View style={styles.drawerContainer}>

                    {/* 🔥 DRAG BAR */}
                    <View style={styles.dragBar} />

                    {/* 🔥 HEADER */}
                    <View style={styles.drawerHeader}>

                        <Text style={styles.title}>Filter Records</Text>

                        <View style={{ flexDirection: 'row', gap: 15 }}>
                            <TouchableOpacity onPress={handleReset}>
                                <Text style={{ color: 'red' }}>Reset</Text>
                            </TouchableOpacity>

                            <TouchableOpacity onPress={onClose}>
                                <Icon name="close" size={22} color="#000" />
                            </TouchableOpacity>
                        </View>

                    </View>

                    {/* 🔥 FORM */}
                    <ScrollView>

                        <Text style={styles.label}>Property</Text>
                        <View style={styles.inputBox}>
                            {/* <Text>{FormState.values.PrpCode || "Select Property"}</Text> */}
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

                        <Text style={styles.label}>Year</Text>
                        <View style={styles.inputBox}>
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

                            {/* <Text>{FormState.values.YearNo || "Select Year"}</Text> */}
                        </View>

                        <Text style={styles.label}>From Date</Text>
                        <View style={styles.inputBox}>
                            {/* <Text>Select From Date</Text> */}
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
                                date={
                                    FormState.values.fromdate
                                        ? new Date(FormState.values.fromdate)
                                        : new Date()
                                }
                                onConfirm={(date) => {
                                    const selectedDate = new Date(date);
                                    selectedDate.setHours(0, 0, 0, 0);

                                    setFormState(prev => ({
                                        ...prev,
                                        values: {
                                            ...prev.values,
                                            fromdate: toISODate(selectedDate) // ✅ DIRECT
                                        }
                                    }));

                                    setCheckingDatePickerVisible(false);
                                }}
                                onCancel={() => setCheckingDatePickerVisible(false)}
                            />
                        </View>

                        <Text style={styles.label}>To Date</Text>
                        <View style={styles.inputBox}>
                            {/* <Text>Select To Date</Text> */}
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
                                date={
                                    FormState.values.todate
                                        ? new Date(FormState.values.todate)
                                        : new Date()
                                }
                                onConfirm={(date) => {
                                    const selectedDate = new Date(date);
                                    selectedDate.setHours(0, 0, 0, 0);

                                    setFormState(prev => ({
                                        ...prev,
                                        values: {
                                            ...prev.values,
                                            todate: toISODate(selectedDate) // ✅ DIRECT
                                        }
                                    }));

                                    setCheckingDatePickerVisible1(false);
                                }}
                                onCancel={() => setCheckingDatePickerVisible1(false)}
                            />

                        </View>
                        <View style={{ marginTop: 10, }}>
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

                    {/* 🔥 APPLY BUTTON */}
                    <TouchableOpacity style={styles.applyBtn} onPress={onLoadPress}>
                        <Text style={styles.applyText}>Apply Filters</Text>
                    </TouchableOpacity>

                </Animated.View>

            </Modal>
        </>
    );
};

const styles = StyleSheet.create({

    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: 40,
        paddingBottom: 14,
        paddingHorizontal: 16,
        backgroundColor: '#0e7490',
    },

    headerTitle: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '700'
    },

    headerSub: {
        color: '#d0eef2',
        fontSize: 12
    },

    /* 🔥 OVERLAY */
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)'
    },

    /* 🔥 DRAWER */
    drawerContainer: {
        position: 'absolute',
        bottom: 0,
        width: '100%',
        height: '65%',
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 15
    },

    dragBar: {
        width: 40,
        height: 4,
        backgroundColor: '#ccc',
        alignSelf: 'center',
        borderRadius: 2,
        marginBottom: 10
    },

    drawerHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15
    },

    title: {
        fontSize: 16,
        fontWeight: '700',
        color: '#000'
    },

    label: {
        marginTop: 10,
        marginBottom: 5,
        color: '#000'
    },

    inputBox: {
        backgroundColor: '#f1f5f9',
        padding: 0,
        borderRadius: 10
    },

    applyBtn: {
        backgroundColor: '#0e7490',
        padding: 14,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 10
    },

    applyText: {
        color: '#fff',
        fontWeight: '600'
    },
    resetBtn: { backgroundColor: '#ddd', padding: 12, borderRadius: 8, width: '48%', alignItems: 'center' },
    dateTriggerText: { fontSize: 14, color: theme.TEXT_PRIMARY, fontWeight: '600' },
    dateTrigger: { backgroundColor: '#F6F7FA', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', marginBottom: 10 },

});

export default CustomDrawer;
