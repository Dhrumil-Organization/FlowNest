// AddNewPartyScreen.js

import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    TouchableOpacity,
    TextInput,
    ScrollView,
    Alert
} from 'react-native';

const AddNewPartyScreen = ({ navigation }) => {

    const [partyName, setPartyName] = useState('');
    const [deliveryAddress, setDeliveryAddress] = useState('');
    const [gstin, setGstin] = useState('');

    const handleSaveParty = () => {

        if (!partyName.trim()) {
            Alert.alert('Validation', 'Please enter party name');
            return;
        }

        if (!deliveryAddress.trim()) {
            Alert.alert('Validation', 'Please enter delivery address');
            return;
        }

        // SAVE API CALL HERE

        console.log({
            partyName,
            deliveryAddress,
            gstin
        });

        Alert.alert('Success', 'Party Added Successfully');

        navigation.goBack();
    };

    return (
        <SafeAreaView style={styles.safe}>

            {/* HEADER */}
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

                {/* PARTY NAME */}
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

                {/* DELIVERY ADDRESS */}
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

                {/* GSTIN */}
                <View style={styles.inputGroup}>

                    <Text style={styles.label}>GSTIN</Text>

                    <TextInput
                        value={gstin}
                        onChangeText={setGstin}
                        placeholder="Enter GSTIN"
                        placeholderTextColor="#999"
                        autoCapitalize="characters"
                        style={styles.input}
                    />

                </View>

                <View style={styles.bottomBtnContainer}>

                    <TouchableOpacity
                        style={styles.cancelBtn}
                        onPress={() => navigation.goBack()}
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
        paddingBottom: 300,
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
        position: 'absolute',
        bottom: 20,
        left: 16,
        right: 16,
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

});