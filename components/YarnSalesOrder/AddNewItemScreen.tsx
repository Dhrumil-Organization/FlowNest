import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
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
import { SafeAreaView } from 'react-native-safe-area-context';
const AddNewItemScreen = ({ navigation, route }) => {
    const {
        mode = 'ADD',
        uid = 0,
        soNo = '',
        soDate = '',
        editMode = false,
        editIndex = null,
        editLineId = null,
        oldRow = null,
        workingRows = [],
        party = null,
        partyData = null,
        selectedParty = null,
        prpcode = '',
        strcode = '002',
        yearno = '',
        token = '',
    } = route?.params || {};
    const finalParty = party || partyData || selectedParty || null;
    const [ItemName, setItemName] = useState('');
    const [cityname, setCityName] = useState('');
    const [remark, setremark] = useState('');
    const [gstin, setGstin] = useState('');

    const handleSaveParty = () => {
        if (!ItemName.trim()) {
            Alert.alert('Validation', 'Please enter Item name');
            return;
        }
        
        const newitemdata = {
            ItmCode: '-1',
            ItmName: ItemName,
            MItmCode: '-1',
            UOM: '',
            Denier: '',
            HsnCode: '',
            Remark: remark
        };

        const params = {
            mode,
            uid,
            soNo,
            soDate,
            editMode,
            editIndex,
            editLineId,
            oldRow,
            party: finalParty,
            partyData: finalParty,
            selectedParty: finalParty,
            selectedItem: newitemdata,
            workingRows,
            prpcode,
            strcode,
            yearno,
            token,
        };
        navigation.replace('SalesOrderGradeList', params);
    };


    return (
        <SafeAreaView edges={['top', 'bottom']} style={styles.safe}>
            {/* HEADER */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={styles.back}>‹</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Add New Item</Text>
                <View style={{ width: 30 }} />
            </View>
            <ScrollView
                contentContainerStyle={styles.container}
                showsVerticalScrollIndicator={false}
            >                
                <View style={styles.inputGroup}>
                    <Text style={styles.label}>
                        Item Name <Text style={styles.required}>*</Text>
                    </Text>
                    <TextInput
                        value={ItemName}
                        onChangeText={setItemName}
                        placeholder="Enter item name"
                        placeholderTextColor="#000"
                        style={styles.input}
                    />
                </View>                
                <View style={styles.inputGroup}>
                    <Text style={styles.label}>
                        Remark <Text style={styles.required}>*</Text>
                    </Text>
                    <TextInput
                        value={remark}
                        onChangeText={setremark}
                        placeholder="Enter remark"
                        placeholderTextColor="#000"
                        multiline
                        textAlignVertical="top"
                        style={styles.textArea}
                    />
                </View>
                <View style={styles.bottomBtnContainer}>
                    <TouchableOpacity
                        style={styles.cancelBtn}
                        onPress={() =>
                            navigation.navigate('SalesOrderItemList', {
                                mode,
                                uid,
                                soNo,
                                soDate,
                                editMode,
                                editIndex,
                                editLineId,
                                oldRow,
                                workingRows,
                                party: finalParty,
                                partyData: finalParty,
                                selectedParty: finalParty,
                                prpcode,
                                strcode,
                                yearno,
                                token,
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
                        <Text style={styles.saveBtnText}>Save Item</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

export default AddNewItemScreen;

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
        paddingBottom: 300,
    },

    inputGroup: {
        marginBottom: 18,
    },

    label: {
        color: '#000',
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

    // bottomBtnContainer: {
    //     position: 'absolute',
    //     bottom: 20,
    //     left: 16,
    //     right: 16,
    //     flexDirection: 'row',
    //     justifyContent: 'space-between',
    //     gap: 12,
    // },
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