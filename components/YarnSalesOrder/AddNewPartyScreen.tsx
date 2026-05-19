// AddNewPartyScreen.js

import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    TouchableOpacity,
    TextInput,
    ScrollView,
    Alert,
    ActivityIndicator
} from 'react-native';
import { useSalesOrder } from './SalesOrderContext';
import { API } from '../../common/API/dynamicAPI';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AddNewPartyScreen = ({ navigation, route, token }) => {

    const [partyName, setPartyName] = useState('');
    const [remark, setRemark] = useState('');
    const [cityname, setCityName] = useState('');
    const [printname, setPrintname] = useState('');
    const [statename, setStateName] = useState('');
    const [cntyname, setCntyName] = useState('');
    const [zip, setZip] = useState('');
    const [tel1, setTel1] = useState('');
    const [deliveryAddress, setDeliveryAddress] = useState('');
    const [gstin, setGstin] = useState('');
    const [loader, setLoader] = useState(false);
    const [loading, setIsloading] = useState(false);
    const [getStateData, setStateData] = useState([]);
    const [getCityData, setCityData] = useState([]);
    const { salesOrderParams, startNewOrder } = useSalesOrder();

    // console.log("getStateData", getStateData);

    const getstate = async () => {
        const userPtype = await AsyncStorage.getItem('user_prptype');
        const yno = route?.params?.yearno ? route?.params?.yearno.slice(-2) : '';
        try {
            setIsloading(true);
            const payload = {
                module: "MasterList",
                prpcode: route?.params?.prpcode || salesOrderParams?.prpcode || '',
                prptype: userPtype,
                shead: "",
                txntype: "sales_order",
                yearno: yno,
                fetch: ['State', 'City']
            };
            console.log('master api type payload:', payload);
            const response = await axios.post(
                `${API}/api/master_api`,
                payload,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        Accept: 'application/json',
                        'Content-Type': 'application/json',
                        'x-platform': 'mob',
                    },
                }
            );
            console.log('master api payload type Response:', response);
            const stateData = response?.data?.response?.data?.State || [];
            const cityData = response?.data?.response?.data?.City || [];
            if (response?.data?.success) {
                setStateData(stateData);
                setCityData(cityData);
            } else {
                setStateData([]);
                setCityData([]);
            }
        } catch (error) {
            console.log(
                'API master_api error:',
                error?.response?.data || error.message
            );
        } finally {
            setIsloading(false);
        }
    };

    useEffect(() => {
        getstate();
    }, []);

    const checkgstin = async () => {
        const userPtype = await AsyncStorage.getItem('user_prptype');
        const yno = route?.params?.yearno ? route?.params?.yearno.slice(-2) : '';
        try {
            setLoader(true);
            const payload = {
                Mode: 'ADD',
                gstin: gstin,
                prpcode: route?.params?.prpcode || salesOrderParams?.prpcode || '',
                yearno: yno || '',
                action: 'ADD',
                txntype: 'sales_order',
                prptype: userPtype
            };

            console.log("gstin payload", payload);

            const res = await axios.post(`${API}/api/check_single_gstin`, payload, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    'x-platform': 'mob',
                },
            });

            console.log("gstin response..", res);

            if (res.data?.success === true) {
                const { AddrFlno, AddrBno, AddrBnm, AddrSt, TradeName, AddrLoc, AddrPncd, StateCode } = res?.data?.result || {};
                const address = [AddrFlno, AddrBno, AddrBnm, AddrSt].filter(Boolean).join(', ');
                const zipcode = String(AddrPncd).trim();
                const stateCodeFromApi = String(StateCode).trim().toUpperCase();
                const cityFromApi = String(AddrLoc || '').trim().toUpperCase();
                const city = getCityData.find(cty => String(cty.CityName || '').trim().toUpperCase() === cityFromApi)?.CityName || '';
                const stateName =
                    getStateData.find(
                        state =>
                            String(state.StateCode)
                                .trim()
                                .toUpperCase() === stateCodeFromApi
                    )?.StateName || '';

                setPartyName(TradeName || '');
                setDeliveryAddress(address || '');
                setCityName(city || '');
                setCntyName('');
                setPrintname(TradeName || '');
                setStateName(stateName.toUpperCase());
                setZip(zipcode || '');
            } else {
                Alert.alert('Load detail data failed', res.data?.message || 'Unable to load data');
            }
        } catch (error) {
            console.log('SAVE ORDER ERROR:', error?.res?.data || error.message);
            Alert.alert(
                'Error',
                error?.res?.data?.message || 'Something went wrong while saving',
            );
        } finally {
            setLoader(false);
        }
    };

    const handleSaveParty = () => {
        if (!partyName.trim()) {
            Alert.alert('Validation', 'Please enter party name');
            return;
        }

        if (!deliveryAddress.trim()) {
            Alert.alert('Validation', 'Please enter delivery address');
            return;
        }

        let mobileNo = tel1.replace(/\s/g, '');

        if (!mobileNo) {
            Alert.alert('Validation', 'Please enter telephone number');
            return;
        }

        // if (!mobileNo.startsWith('+')) {
        //     mobileNo = '+91' + mobileNo;
        // }

        const onlyDigits = mobileNo.replace(/\D/g, '');
        if (
            !(
                onlyDigits.length === 10 ||
                onlyDigits.length === 12
            )
        ) {
            Alert.alert(
                'Validation',
                'Please enter valid telephone number'
            );
            return;
        }

        const newPartyData = {
            ParCode: '-1',
            ParName: partyName,
            Address: deliveryAddress,
            City: cityname,
            State: statename,
            Cnty: "INDIA",
            Zip: zip,
            Tel1: mobileNo,
            GSTIN: gstin,
            SExe: '',
            SExeName: '',
            PrintName: printname,
            Remark: remark
        };

        const params = {
            mode: 'ADD',
            uid: 0,
            prpcode: route?.params?.prpcode || salesOrderParams?.prpcode || '',
            strcode: route?.params?.strcode || salesOrderParams?.strcode || '002',
            yearno: route?.params?.yearno || salesOrderParams?.yearno || '',
            token: route?.params?.token || salesOrderParams?.token || token,
            partyData: newPartyData,
            selectedparty: newPartyData,
        };
        startNewOrder(params);
        navigation.replace('OrderSummaryScreen', params);
    };

    return (
        <SafeAreaView style={styles.safe}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={styles.back}>‹</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Add New Party</Text>
                <View style={{ width: 30 }} />
            </View>

            <ScrollView
                contentContainerStyle={styles.container}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.inputGroup}>
                    <Text style={styles.label}>
                        GSTIN <Text style={styles.required}>*</Text>
                    </Text>
                    <View style={styles.gstinRow}>
                        <TextInput
                            value={gstin}
                            onChangeText={setGstin}
                            placeholder="Enter GSTIN"
                            placeholderTextColor="#999"
                            autoCapitalize="characters"
                            style={styles.gstinInput}
                        />
                        <TouchableOpacity
                            style={styles.gstinBtn}
                            onPress={checkgstin}
                            activeOpacity={0.8}
                        // disabled={loader}
                        >
                            {
                                loader ? (
                                    <ActivityIndicator color="#13879A" />
                                ) : (
                                    <Text style={styles.gstinBtnText}>
                                        Get Details
                                    </Text>
                                )
                            }
                        </TouchableOpacity>

                    </View>

                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>
                        Party Name <Text style={styles.required}>*</Text>
                    </Text>
                    <TextInput
                        value={partyName}
                        onChangeText={setPartyName}
                        placeholder="Enter party name"
                        placeholderTextColor="#999"
                        style={styles.input}
                    />
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>
                        Delivery Address <Text style={styles.required}>*</Text>
                    </Text>
                    <TextInput
                        value={deliveryAddress}
                        onChangeText={setDeliveryAddress}
                        placeholder="Enter complete delivery address"
                        placeholderTextColor="#999"
                        multiline
                        textAlignVertical="top"
                        style={styles.textArea}
                    />
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>
                        City
                    </Text>
                    <TextInput
                        value={cityname}
                        onChangeText={setCityName}
                        placeholder="Enter City"
                        placeholderTextColor="#999"
                        style={styles.input}
                    />
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>
                        State
                    </Text>
                    <TextInput
                        value={statename}
                        onChangeText={setStateName}
                        placeholder="Enter State"
                        placeholderTextColor="#999"
                        style={styles.input}
                    />
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>
                        Country
                    </Text>
                    <TextInput
                        value={cntyname}
                        onChangeText={setCntyName}
                        placeholder="Enter country"
                        placeholderTextColor="#999"
                        style={styles.input}
                    />
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>
                        Zip
                    </Text>
                    <TextInput
                        value={zip}
                        onChangeText={setZip}
                        placeholder="Enter zip code"
                        placeholderTextColor="#999"
                        style={styles.input}
                    />
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>
                        Telephone 1 <Text style={styles.required}>*</Text>
                    </Text>
                    <TextInput
                        value={tel1}
                        onChangeText={(text) => {
                            let cleaned = text;
                            cleaned = cleaned.replace(/[^0-9+]/g, '');
                            if (cleaned.indexOf('+') > 0) {
                                cleaned = cleaned.replace(/\+/g, '');
                            }
                            if (cleaned.startsWith('+')) {
                                const parts = cleaned.match(/^(\+\d{0,3})(\d{0,10})$/);
                                if (parts) {
                                    const code = parts[1];
                                    const number = parts[2];

                                    let formatted = number;

                                    if (number.length > 5) {
                                        formatted =
                                            number.slice(0, 5) + ' ' + number.slice(5);
                                    }
                                    setTel1(`${code} ${formatted}`.trim());
                                } else {
                                    setTel1(cleaned);
                                }

                            } else {
                                let number = cleaned.slice(0, 12);
                                let formatted = number;
                                if (number.length > 5) {
                                    formatted =
                                        number.slice(0, 5) + ' ' + number.slice(5);
                                }
                                setTel1(formatted);
                            }
                        }}
                        placeholder="+91 98765 43210"
                        placeholderTextColor="#999"
                        keyboardType="phone-pad"
                        maxLength={14}
                        style={styles.input}
                    />
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>
                        Remark
                    </Text>
                    <TextInput
                        value={remark}
                        onChangeText={setRemark}
                        placeholder="Enter remark"
                        placeholderTextColor="#999"
                        style={styles.input}
                    />
                </View>

                <View style={styles.bottomBtnContainer}>
                    <TouchableOpacity
                        style={styles.cancelBtn}
                        // onPress={() => navigation.goBack()}
                        onPress={() =>
                            navigation.navigate('PartyListScreen', {
                                prpcode: route?.params?.prpcode || '',
                                strcode: route?.params?.strcode || '002',
                                yearno: route?.params?.yearno || '',
                                token: route?.params?.token || '',
                            })
                        }
                        activeOpacity={0.8}
                    >
                        <Text style={styles.cancelBtnText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.saveBtn}
                        onPress={handleSaveParty}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.saveBtnText}>Save Party</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

export default AddNewPartyScreen;

const styles = StyleSheet.create({
    safe: {
        flex: 1,
        backgroundColor: '#f5f7fb',
    },

    header: {
        height: 56,
        backgroundColor: '#13879A',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
    },

    back: {
        color: '#fff',
        fontSize: 34,
        width: 35,
    },

    headerTitle: {
        flex: 1,
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
        textAlign: 'center',
    },

    container: {
        padding: 16,
        paddingBottom: 20,
    },

    inputGroup: {
        marginBottom: 18,
    },

    label: {
        color: '#111',
        fontSize: 14,
        fontWeight: '700',
        marginBottom: 8,
    },

    required: {
        color: 'red',
    },

    input: {
        height: 48,
        backgroundColor: '#fff',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#dfe3ea',
        paddingHorizontal: 14,
        color: '#000',
        fontSize: 14,
    },

    textArea: {
        height: 120,
        backgroundColor: '#fff',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#dfe3ea',
        paddingHorizontal: 14,
        paddingTop: 12,
        color: '#000',
        fontSize: 14,
    },

    bottomBtnContainer: {
        marginTop: 30,
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 12,
    },

    saveBtn: {
        flex: 1,
        height: 46,
        backgroundColor: '#13879A',
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },

    saveBtnText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '700',
    },

    cancelBtn: {
        flex: 1,
        height: 46,
        backgroundColor: '#fff',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#13879A',
        justifyContent: 'center',
        alignItems: 'center',
    },

    cancelBtnText: {
        color: '#13879A',
        fontSize: 14,
        fontWeight: '700',
    },

    gstinRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },

    gstinInput: {
        flex: 1,
        height: 48,
        backgroundColor: '#fff',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#dfe3ea',
        paddingHorizontal: 14,
        color: '#000',
        fontSize: 14,
    },

    gstinBtn: {
        width: 90,
        height: 48,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#13879A',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f4fffd',
    },

    gstinBtnText: {
        color: '#13879A',
        fontSize: 13,
        fontWeight: '700',
    },

});