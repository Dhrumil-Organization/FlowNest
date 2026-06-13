import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, Animated, Dimensions, ScrollView, ActivityIndicator, Alert, Platform } from 'react-native';
import Icon from '@expo/vector-icons/MaterialIcons';
import { LinearGradient } from 'expo-linear-gradient';
import theme from '@/components/theme';
import SearchableDropdown from '@/Shared/SearchableDropdown';
// import Snackbar from 'react-native-snackbar';
// import FullScreenLoader from '../Loader/Loader';
import DateTimePicker from '@react-native-community/datetimepicker';

const { height } = Dimensions.get('window');

const CriteriaForm = (props) => {
    const { isVisible,
        onClose,
        isLoading,
        FormState,
        setFormState,
        getAllPropertyData,
        setAllPropertyData,
        getAllYearData,
        setAllYearData,
        getAllStoreData,
        fetchData,
        fetchAllHistoryData,
        fetchAllVerifyData,
        activeTab1YPO,
        fromDate,
        toDate,
        onFromDateChange,
        onToDateChange,
        handleConfirmAction,
        getAllData
    } = props;

    const slideAnim = useRef(new Animated.Value(0)).current;

    const [showFromDatePicker, setShowFromDatePicker] = useState(false);
    const [showToDatePicker, setShowToDatePicker] = useState(false);



    const selectedProperty = getAllPropertyData?.find((p) => p.PrpCode == FormState.values.PrpCode) || null;
    const selectedYear = getAllYearData?.find((y) => y.YearNo == FormState.values.YearNo) || null;


    const formatDate = (rawDate: any) => {
        let day = rawDate.getDate().toString().padStart(2, '0') || '';
        let month = (rawDate.getMonth() + 1).toString().padStart(2, '0') || ''; // Month is 0-indexed
        let year = rawDate.getFullYear() || '';
        return `${day}-${month}-${year}`;
    };


    return (
        <>
            <Modal visible={isVisible} transparent animationType="none" onRequestClose={onClose}>
                <View style={stylesCF.modalOverlay}>
                    <Animated.View style={[stylesCF.drawerContainer, { transform: [{ translateY: slideAnim }] }]}>
                        <LinearGradient
                            colors={[theme.BRAND_GRADIENT_START, theme.BRAND_GRADIENT_END]}
                            style={stylesCF.gradientBackground}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}>
                            <TouchableOpacity style={stylesCF.closeButton} onPress={onClose}>
                                <Icon name="close" size={28} color="#fff" />
                            </TouchableOpacity>
                            <ScrollView
                                style={stylesCF.scrollableFormContainer}
                                contentContainerStyle={stylesCF.scrollableFormContent}
                                nestedScrollEnabled={true}>
                                <View style={{ marginBottom: 10 }} >
                                    <Text style={stylesCF.label}>Select Property <Text style={{ color: 'red' }}> * </Text></Text>
                                    <SearchableDropdown
                                        key={FormState.values.PrpCode}
                                        data={getAllPropertyData}
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
                                    <Text style={stylesCF.label}>Select Year <Text style={{ color: 'red' }}> * </Text></Text>
                                    <SearchableDropdown
                                        key={FormState.values.YearNo}
                                        data={getAllYearData}
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
                                {/* From Date */}
                                <View style={stylesCF.inputGroup}>
                                    <Text style={stylesCF.label}>From Date <Text style={{ color: 'red' }}> * </Text></Text>
                                    <TouchableOpacity style={stylesCF.dateInput} onPress={() => setShowFromDatePicker(true)}>
                                        <Text style={stylesCF.dateText}>{formatDate(fromDate)}</Text>
                                    </TouchableOpacity>
                                    {showFromDatePicker && (
                                        <DateTimePicker
                                            value={fromDate}
                                            mode="date"
                                            display="default"
                                            onChange={(event, date) => {
                                                setShowFromDatePicker(Platform.OS === 'ios');
                                                if (date) onFromDateChange(date);
                                            }}
                                        />
                                    )}
                                </View>

                                {/* To Date */}
                                <View style={stylesCF.inputGroup}>
                                    <Text style={stylesCF.label}>To Date <Text style={{ color: 'red' }}> * </Text></Text>
                                    <TouchableOpacity style={stylesCF.dateInput} onPress={() => setShowToDatePicker(true)}>
                                        <Text style={stylesCF.dateText}>{formatDate(toDate)}</Text>
                                    </TouchableOpacity>
                                    {showToDatePicker && (
                                        <DateTimePicker
                                            value={toDate}
                                            mode="date"
                                            display="default"
                                            onChange={(event, date) => {
                                                setShowToDatePicker(Platform.OS === 'ios');
                                                if (date) onToDateChange(date);
                                            }}
                                        />
                                    )}
                                </View>
                                {/* <View style={{ marginBottom: 10 }} >
                                    <Text style={stylesCF.label}>Select Store <Text style={{ color: 'red' }}> * </Text></Text>
                                    <SearchableDropdown
                                        key={FormState.values.StrCode}
                                        data={getAllStoreData}
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
                                </View> */}
                            </ScrollView>
                            <TouchableOpacity
                                style={stylesCF.centerFabButton}
                                onPress={handleConfirmAction}
                                activeOpacity={0.85}>
                                {
                                    isLoading ?
                                        (<ActivityIndicator size="small" color="#fff" />)
                                        :
                                        (<>
                                            <Icon name="cloud-download" size={20} color="#fff" />
                                            <Text style={stylesCF.centerFabText}>Load Data</Text>
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

const stylesCF = StyleSheet.create({
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
    inputGroup: {
        marginBottom: 15,
        zIndex: 10,
    },
    dateInput: {
        borderWidth: 1,
        //borderColor: '#000',
        borderRadius: 5,
        padding: 10,
        backgroundColor: '#FFF',
    },
    dateText: {
        color: '#000',
    },
});

export default CriteriaForm;
