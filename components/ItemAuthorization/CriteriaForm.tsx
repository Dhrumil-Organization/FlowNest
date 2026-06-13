import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, Animated, Dimensions, ScrollView, ActivityIndicator, Alert } from 'react-native';
import Icon from '@expo/vector-icons/MaterialIcons';
import { LinearGradient } from 'expo-linear-gradient';
import theme from '@/components/theme';
import SearchableDropdown from '@/Shared/SearchableDropdown';
// import Snackbar from 'react-native-snackbar';
import { showSnackbar, showSuccess, showError, showWarning } from '@/common/utils/snackbar';
// import FullScreenLoader from '../Loader/Loader';

const { height } = Dimensions.get('window');

const CriteriaForm = (props) => {
    const { isVisible,
        onClose,
        isLoading,
        FormState,
        setFormState,
        getAllStoreData,
        fetchData,
        fetchAllHistoryData,
        fetchAllVerifyData,
        activeTab1YPO
    } = props;

    const slideAnim = useRef(new Animated.Value(0)).current;
    /*
    const handleLoaddata = async () => {
        if (typeof FormState.values.StrCode == 'undefined' || FormState.values.StrCode == null || FormState.values.StrCode == '') {
            Snackbar.show({
                text: 'Please select store',
                duration: Snackbar.LENGTH_LONG,
                backgroundColor: 'red',
                textColor: '#fff',
                action: { text: 'OK', textColor: 'white' },
            });
        } else {
            if (activeTab1YPO === 'history') {
                fetchAllHistoryData();
            } else if (activeTab1YPO === 'requests') {
                console.log("in CriteriaForm fetchData function called")
                fetchData();
            } else if (activeTab1YPO === 'verify') {
                fetchAllVerifyData();
            }
            onClose()
        }
    }
    */
    const handleLoaddata = async () => {
        if (isLoading) return;

        if (!FormState.values.StrCode) {
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
            return;
        }

        if (activeTab1YPO === 'history') {
            fetchAllHistoryData();
        } else if (activeTab1YPO === 'requests') {
            fetchData();
        } else if (activeTab1YPO === 'verify') {
            fetchAllVerifyData();
        }

        onClose();
    };
    const selectedStore = getAllStoreData?.find((y) => y.StrCode == FormState.values.StrCode) || null;

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
                                </View>
                            </ScrollView>
                            <TouchableOpacity
                                style={stylesCF.centerFabButton}
                                onPress={handleLoaddata}
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
        marginTop: 35
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
});

export default CriteriaForm;
