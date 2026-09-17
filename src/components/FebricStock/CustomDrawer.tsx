import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    Modal,
    StyleSheet,
    Animated,
    Dimensions,
    Platform,
    ScrollView,
    ActivityIndicator,
    TextInput,
} from 'react-native';
import Icon from '@expo/vector-icons/MaterialIcons';
// import DateTimePicker from '@react-native-community/datetimepicker';
import { LinearGradient } from 'expo-linear-gradient';
import { CustomDrawerProps, DesignData, ItemStatus } from './Modal';
import theme from '@/components/theme';
import SearchableDropdown from '@/Shared/SearchableDropdown';

const { height } = Dimensions.get('window');

const CustomDrawer: React.FC<CustomDrawerProps> = ({
    isVisible,
    onClose,
    fromDate,
    toDate,
    selectedYear,
    onFromDateChange,
    onToDateChange,
    onYearChange,
    onLoadPress,
    isLoading,
    PrpCodeList,
    selectedPrpCode,
    onPropertyCodeSelect
}) => {
    const slideAnim = useRef(new Animated.Value(0)).current;
    const [showFromDatePicker, setShowFromDatePicker] = useState(false);
    const [showToDatePicker, setShowToDatePicker] = useState(false);
    const [isYearDropdownOpen, setIsYearDropdownOpen] = useState(false);
    const [isExeDropdownOpen, setIsExeDropdownOpen] = useState(false);
    // 
    const [step, setStep] = useState(1);
    const yearOptions = ['2022-2023', '2023-2024', '2024-2025', '2025-2026'];
    React.useEffect(() => {
        Animated.timing(slideAnim, {
            toValue: isVisible ? 0 : height,
            duration: 300,
            useNativeDriver: true,
        }).start();
    }, [isVisible]);

    const updatedPrpCodeList = React.useMemo(() => {
        if (!PrpCodeList || PrpCodeList.length === 0) return [];

        return [
            { PrpCode: "ALL", LngName: "All" },
            ...PrpCodeList
        ];
    }, [PrpCodeList]);

    const handleLoadPress = () => {
        onLoadPress();
    };

    return (
        <Modal visible={isVisible} transparent animationType="none" onRequestClose={onClose}>
            <View style={styles.modalOverlay}>
                <Animated.View style={[styles.drawerContainer, { transform: [{ translateY: slideAnim }] }]}>
                    <LinearGradient
                        colors={[theme.BRAND_GRADIENT_START, theme.BRAND_GRADIENT_END]}
                        style={styles.gradientBackground}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                    >
                        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                            <Icon name="close" size={28} color="#fff" />
                        </TouchableOpacity>
                        <ScrollView
                            style={styles.scrollableFormContainer}
                            contentContainerStyle={styles.scrollableFormContent}
                            nestedScrollEnabled={true}
                        >
                            <View style={{ marginBottom: 10 }} >
                                <Text style={styles.label}>Select Property..<Text style={{ color: 'red' }}>*</Text></Text>
                                {/* <SearchableDropdown
                                    data={PrpCodeList}
                                    labelKey="LngName"
                                    valueKey="PrpCode"
                                    placeholder="Choose property..."
                                    pageSize={10}
                                    initialValue={selectedPrpCode}
                                    onSelect={(item) => {
                                        console.log("Selected Property:", item);
                                        onPropertyCodeSelect(item);
                                    }}
                                    multiple={true}
                                    emptyMessage="No properties available"
                                /> */}
                                <SearchableDropdown
                                    data={updatedPrpCodeList}
                                    labelKey="LngName"
                                    valueKey="PrpCode"
                                    placeholder="Choose property..."
                                    pageSize={10}
                                    initialValue={selectedPrpCode}
                                    onSelect={(item) => {
                                        const isAllSelected = item.some(i => i.PrpCode === "ALL");

                                        if (isAllSelected) {
                                            onPropertyCodeSelect(PrpCodeList); // 👈 full list
                                        } else {
                                            onPropertyCodeSelect(item);
                                        }
                                    }}
                                    multiple={true}
                                    emptyMessage="No properties available"
                                />
                            </View>
                        </ScrollView>
                        <View style={styles.loadButtonContainer}>
                            <TouchableOpacity style={styles.loadButton} onPress={handleLoadPress}>
                                {isLoading ? (
                                    <ActivityIndicator size={24} color={theme.BRAND_GRADIENT_START} />
                                ) : (
                                    <Icon name="refresh" size={24} color={theme.BRAND_GRADIENT_START} />
                                )}
                            </TouchableOpacity>
                        </View>
                    </LinearGradient>
                </Animated.View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    drawerContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        overflow: 'hidden',
    },
    gradientBackground: {
        flex: 1,
        padding: 20,
    },
    closeButton: {
        alignSelf: 'flex-end',
        padding: 10,
        marginTop: 35
    },
    stepIndicator: {
        alignItems: 'center',
        marginBottom: 20,
    },
    stepText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    formContainer: {
        flex: 1,
        padding: 10,
    },
    inputGroup: {
        marginBottom: 15,
        zIndex: 10,
    },
    label: {
        fontSize: 16,
        marginBottom: 5,
        color: '#fff',
    },
    dateInput: {
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 5,
        padding: 10,
        backgroundColor: 'rgba(255,255,255,0.2)',
    },
    dateText: {
        color: '#fff',
    },
    dropdownButton: {
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 5,
        padding: 10,
        backgroundColor: 'rgba(255,255,255,0.2)',
    },
    dropdownText: {
        color: '#fff',
    },
    dropdownOptionsContainer: {
        position: 'relative',
        left: 0,
        right: 0,
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 5,
        zIndex: 100,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        maxHeight: 200,
    },
    dropdownOption: {
        padding: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    dropdownOptionText: {
        color: '#333',
    },
    selectedOption: {
        backgroundColor: '#e0e0e0',
    },
    navigationContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: 10,
        marginTop: 'auto',
    },
    navButton: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        padding: 10,
        borderRadius: 5,
    },
    loadButton: {
        backgroundColor: 'rgb(255, 255, 255)',
        borderRadius: 5,
        alignItems: 'center',
        // flex: 1,
        padding: 10,
    },
    loadButtonText: {
        color: 'rgb(103, 9, 210)',
        fontSize: 16,
        fontWeight: 'bold',
    },
    // 
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 8,
        paddingHorizontal: 10,
        marginBottom: 10,
    },
    searchInput: {
        flex: 1,
        padding: 10,
        color: '#fff',
    },
    searchIcon: {
        marginLeft: 10,
    },
    selectedDesignsContainer: {
        flexDirection: 'row',
        marginBottom: 10,
    },
    selectedDesignChip: {
        backgroundColor: 'rgba(255,255,255,0.3)',
        padding: 8,
        borderRadius: 12,
        marginRight: 5,
    },
    selectedDesignText: {
        color: '#fff',
        fontSize: 12,
    },
    designListContainer: {
        maxHeight: 300, // Fixed height for the design list
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)',
        borderRadius: 8,
        marginBottom: 10,
    },
    designListContent: {
        paddingBottom: 20,
    },
    designItem: {
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.2)',
    },
    selectedDesignItem: {
        backgroundColor: 'rgba(255,255,255,0.2)',
    },
    designName: {
        color: '#fff',
        fontSize: 14,
    },
    designCode: {
        color: '#ccc',
        fontSize: 12,
    },
    loadingIndicator: {
        padding: 10,
    },
    accordionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 15,
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 8,
        marginBottom: 10,
    },
    accordionHeaderText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    scrollableFormContainer: {
        flex: 1,
        padding: 10,
    },
    scrollableFormContent: {
        paddingBottom: 80,
    },
    loadButtonContainer: {
        position: 'absolute',
        bottom: 20,
        left: 20,
        right: 20,
        alignItems: 'center',
    },
    radioGroup: {
        flexDirection: 'row',
        marginBottom: 10,
    },
    radioButton: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 20,
    },
    radioCircle: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 5,
    },
    radioInnerCircle: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#fff',
    },
    radioLabel: {
        color: '#fff',
        fontSize: 14,
    },
    selectAllContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    selectAllButton: {
        backgroundColor: 'rgba(255,255,255,0.3)',
        padding: 10,
        borderRadius: 8,
        marginRight: 10,
        alignItems: 'center',
    },
    selectAllButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: 'bold',
    },
    removeAllButton: {
        backgroundColor: 'rgba(255,255,255,0.3)',
        padding: 8,
        borderRadius: 12,
    },
});

export default CustomDrawer;
