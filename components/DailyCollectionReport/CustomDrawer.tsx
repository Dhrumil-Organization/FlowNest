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
import Icon from 'react-native-vector-icons/MaterialIcons';
import DateTimePicker from '@react-native-community/datetimepicker';
import LinearGradient from 'react-native-linear-gradient';
import { CustomDrawerProps, CustomListDrawerProps, CustomListDrawerPropsNew, DesignData, ItemData, ItemStatus } from './Modal';
import theme from '../../android/app/src/theme';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import SearchableDropdown from '../Shared/SearchableDropdown';

const { height } = Dimensions.get('window');


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
    // return `${dd}-${mm}-${yyyy}`;
};

const CustomDrawer: React.FC<CustomListDrawerPropsNew> = ({
    isVisible,
    onClose,
    fromDate,
    toDate,
    selectedYear,
    selectedExe,
    onFromDateChange,
    onToDateChange,
    onYearChange,
    onExeChange,
    onLoadPress,
    // onLoadPressItem,
    exeDataCRT,
    designData,
    isLoading,
    onDesignSelect,
    onItemSelectItem,
    itemData,
    selectedItemStatus,
    onItemStatusChange,
    setSelectedDesigns,
    selectedDesigns,
    setSelectedItems,
    selectedItems,
    getPropertyGroupData,
    getPropertyData,
    setSelectedProperty,
    setSelectedPropertyGroup,
    selectedPropertyGroup,
    selectedProperty,
    setForm,
    setSelectedSexe,
    SelectedSexe,
    internal_dropdown,
    onExeChangeInternal,
    selectedInternal,

    form
}) => {
    const slideAnim = useRef(new Animated.Value(0)).current;
    const [showFromDatePicker, setShowFromDatePicker] = useState(false);
    const [showToDatePicker, setShowToDatePicker] = useState(false);
    const [isYearDropdownOpen, setIsYearDropdownOpen] = useState(false);
    const [isExeDropdownOpen, setIsExeDropdownOpen] = useState(false);
    const [checkingDatePickerVisible, setCheckingDatePickerVisible] = useState(false);
    const [checkingDatePickerVisible1, setCheckingDatePickerVisible1] = useState(false);
    const [isIntDropdownOpen, setIsIntDropdownOpen] = useState(false);
    // 
    const [searchQuery, setSearchQuery] = useState('');
    // const [selectedDesigns, setSelectedDesigns] = useState<DesignData[]>([]);
    const [displayedDesigns, setDisplayedDesigns] = useState<DesignData[]>([]);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const scrollViewRef = useRef<ScrollView>(null);
    const [isDesignAccordionOpen, setIsDesignAccordionOpen] = useState(false);
    // 
    const [searchQueryItem, setSearchQueryItem] = useState('');
    // const [selectedItems, setSelectedItems] = useState<ItemData[]>([]);
    const [displayedItems, setDisplayedItems] = useState<ItemData[]>([]);
    const [isLoadingMoreItem, setIsLoadingMoreItem] = useState(false);
    const [hasMoreItem, setHasMoreItem] = useState(true);
    const scrollViewRefItem = useRef<ScrollView>(null);
    const [isDesignAccordionOpenItem, setIsDesignAccordionOpenItem] = useState(false);
    const [localItemStatus, setLocalItemStatus] = useState<ItemStatus>(selectedItemStatus || 'All');
    const isPrpgrpAutoSelected = useRef(false);
    const isInternalAutoSelected = useRef(false);

    const [step, setStep] = useState(1);

    const yearOptions = ['2022-2023', '2023-2024', '2024-2025', '2025-2026'];

    console.log("designData:", designData, "itemData:", itemData);

    useEffect(() => {
        if (exeDataCRT.length > 0 && !selectedExe) {
            onExeChange(exeDataCRT[0]);
        }
    }, [exeDataCRT, selectedExe, onExeChange]);



    useEffect(() => {
        const filtered = designData.filter(
            (design) =>
                design.DsnName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                design.DsnCode.toLowerCase().includes(searchQuery.toLowerCase())
        );
        const filtereditem = itemData.filter(
            (item) =>
                item.ItmName.toLowerCase().includes(searchQueryItem.toLowerCase()) ||
                item.ItmCode.toLowerCase().includes(searchQueryItem.toLowerCase())
        );
        setDisplayedDesigns(filtered.slice(0, 10));
        setDisplayedItems(filtereditem.slice(0, 10));
        setHasMore(filtered.length > 10);
        setHasMoreItem(filtereditem.length > 10);
    }, [searchQuery, designData, searchQueryItem, itemData]);


    React.useEffect(() => {
        Animated.timing(slideAnim, {
            toValue: isVisible ? 0 : height,
            duration: 300,
            useNativeDriver: true,
        }).start();
    }, [isVisible]);

    useEffect(() => {
        setLocalItemStatus(selectedItemStatus);
    }, [selectedItemStatus]);

    // Handle radio selection
    const handleStatusChange = (status: ItemStatus) => {
        setLocalItemStatus(status);
        onItemStatusChange(status);
    };

    const nextStep = () => setStep(step + 1);
    const prevStep = () => setStep(step - 1);


    // Filter and paginate designs based on search query
    // useEffect(() => {
    //     const filtered = designData.filter(
    //         (design) =>
    //             design.DsnName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    //             design.DsnCode.toLowerCase().includes(searchQuery.toLowerCase())
    //     );
    //     setDisplayedDesigns(filtered.slice(0, 10));
    //     setHasMore(filtered.length > 10);
    // }, [searchQuery, designData]);

    // Load more designs on scroll
    const loadMoreDesigns = () => {
        if (isLoadingMore || !hasMore) return;

        setIsLoadingMore(true);
        setTimeout(() => {
            const filtered = designData.filter(
                (design) =>
                    design.DsnName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    design.DsnCode.toLowerCase().includes(searchQuery.toLowerCase())
            );
            const newDisplayed = filtered.slice(0, displayedDesigns.length + 10);
            setDisplayedDesigns(newDisplayed);
            setHasMore(newDisplayed.length < filtered.length);
            setIsLoadingMore(false);
        }, 1000); // Simulate network delay
    };

    const loadMoreItems = () => {
        if (isLoadingMoreItem || !hasMoreItem) return;

        setIsLoadingMoreItem(true);
        setTimeout(() => {
            const filtered = itemData.filter(
                (item) =>
                    item.ItmName.toLowerCase().includes(searchQueryItem.toLowerCase()) ||
                    item.ItmCode.toLowerCase().includes(searchQueryItem.toLowerCase())
            );
            const newDisplayed = filtered.slice(0, displayedItems.length + 10);
            setDisplayedItems(newDisplayed);
            setHasMoreItem(newDisplayed.length < filtered.length);
            setIsLoadingMoreItem(false);
        }, 1000); // Simulate network delay
    };


    // Toggle design selection
    const toggleDesignSelection = (design: DesignData) => {
        setSelectedDesigns((prev) =>
            prev.some((d) => d.DsnCode === design.DsnCode)
                ? prev.filter((d) => d.DsnCode !== design.DsnCode)
                : [...prev, design]
        );
    };

    const toggleItemSelection = (item: ItemData) => {
        setSelectedItems((prev) =>
            prev.some((i) => i.ItmCode === item.ItmCode)
                ? prev.filter((i) => i.ItmCode !== item.ItmCode)
                : [...prev, item]
        );
    };

    // Toggle accordion
    const toggleDesignAccordion = () => {
        setIsDesignAccordionOpen(!isDesignAccordionOpen);
    };
    const toggleDesignAccordionItem = () => {
        setIsDesignAccordionOpenItem(!isDesignAccordionOpenItem);
    };


    // Remove all selected designs
    const removeAllSelected = () => {
        setSelectedDesigns([]);
    };

    const removeAllSelectedItems = () => {
        setSelectedItems([]);
    };

    const handleLoadPress = () => {
        onLoadPress();
        // onDesignSelect(selectedDesigns); // Pass selected designs to parent.
        // onItemSelectItem(selectedItems);
    };

    const formatDate = (rawDate: any) => {
        let day = rawDate.getDate().toString().padStart(2, '0') || '';
        let month = (rawDate.getMonth() + 1).toString().padStart(2, '0') || ''; // Month is 0-indexed
        let year = rawDate.getFullYear() || '';
        return `${day}-${month}-${year}`;
    };

    useEffect(() => {
        if (internal_dropdown.length > 0 && (!selectedInternal || selectedInternal === "") && !isInternalAutoSelected.current) {
            onExeChangeInternal(internal_dropdown[0]);
            isInternalAutoSelected.current = true;
        }
    }, [internal_dropdown, selectedInternal, onExeChangeInternal]);

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
                        {/* Close Button */}
                        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                            <Icon name="close" size={28} color="#fff" />
                        </TouchableOpacity>

                        {/* Scrollable Form Container */}
                        <ScrollView
                            style={styles.scrollableFormContainer}
                            contentContainerStyle={styles.scrollableFormContent}
                            nestedScrollEnabled={true}
                        >
                            {/* Property */}
                            <View style={{ marginBottom: 10 }} >
                                <Text style={styles.label}>Select Property Group <Text style={{ color: 'red' }}>*</Text></Text>

                                <SearchableDropdown
                                    data={getPropertyGroupData}
                                    labelKey="PrpOfFull"
                                    valueKey="PrpOf"
                                    placeholder="Choose property..."
                                    pageSize={10}
                                    initialValue={selectedPropertyGroup ?? null}
                                    onSelect={(item) => {
                                        setForm(prev => ({ ...prev, PrpOf: item?.PrpOf || '' }));
                                        setSelectedPropertyGroup(item);
                                    }}
                                    multiple={false}
                                    emptyMessage="No properties group available"
                                />
                            </View>
                            <View style={{ marginBottom: 10 }} >
                                <Text style={styles.label}>Select Property <Text style={{ color: 'red' }}>*</Text></Text>

                                <SearchableDropdown
                                    data={getPropertyData}
                                    // labelKey="PrpName"
                                    labelKey={["PrpName", "PrpCode"]}
                                    valueKey="PrpCode"
                                    placeholder="Choose property..."
                                    pageSize={10}
                                    initialValue={selectedProperty ?? null}
                                    onSelect={(items) => {
                                        // items will be an array of selected objects
                                        setSelectedProperty(items);
                                        // Extract PrpCode values and pass as array to parent
                                        const selectedCodes = items.map(item => item.PrpCode);
                                        setForm(prev => ({ ...prev, PrpCode: selectedCodes }));
                                    }}
                                    multiple={true} // Enable multi-select
                                    emptyMessage="No properties available"
                                />

                            </View>
                            <View style={{ marginBottom: 10 }} >
                                <Text style={styles.label}>From Date</Text>
                                <TouchableOpacity activeOpacity={0.85} style={styles.dateTrigger} onPress={() => setCheckingDatePickerVisible(true)}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.dateTriggerText, !form.fromdate && styles.placeholderText]}>
                                            {form.fromdate ? formatDisplayDate(form.fromdate) : "Select from date"}
                                        </Text>
                                    </View>
                                    <Icon name="calendar-today" size={18} color={theme.TEXT_SECONDARY} />
                                </TouchableOpacity>

                                <DateTimePickerModal
                                    isVisible={checkingDatePickerVisible}
                                    mode="date"

                                    // onConfirm={(date) => setForm(prev => ({ ...prev, EDate: toISODate(date) }))}
                                    onConfirm={(date) => {
                                        const selectedDate = new Date(date);
                                        selectedDate.setHours(0, 0, 0, 0);
                                        setForm(prev => ({ ...prev, fromdate: toISODate(selectedDate) }));
                                        setCheckingDatePickerVisible(false);
                                        // Force UI update
                                        setTimeout(() => { }, 100); // Small delay to ensure state update
                                    }}

                                    onCancel={() => setCheckingDatePickerVisible(false)}
                                    headerTextIOS="Pick From Date"
                                    locale="en_GB"
                                    // maximumDate={new Date(2099, 11, 31)}
                                    // minimumDate={new Date(2000, 0, 1)} // Allow dates from 1st Jan 2000
                                    maximumDate={new Date()} // Only allow today or past dates
                                />
                            </View>
                            <View style={{ marginBottom: 10 }} >
                                <Text style={styles.label}>TO Date</Text>
                                <TouchableOpacity activeOpacity={0.85} style={styles.dateTrigger} onPress={() => setCheckingDatePickerVisible1(true)}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.dateTriggerText, !form.todate && styles.placeholderText]}>
                                            {form.todate ? formatDisplayDate(form.todate) : "Select Checking date"}
                                        </Text>
                                    </View>
                                    <Icon name="calendar-today" size={18} color={theme.TEXT_SECONDARY} />
                                </TouchableOpacity>

                                <DateTimePickerModal
                                    isVisible={checkingDatePickerVisible1}
                                    mode="date"

                                    // onConfirm={(date) => setForm(prev => ({ ...prev, EDate: toISODate(date) }))}
                                    onConfirm={(date) => {
                                        const selectedDate = new Date(date);
                                        selectedDate.setHours(0, 0, 0, 0);
                                        setForm(prev => ({ ...prev, todate: toISODate(selectedDate) }));
                                        setCheckingDatePickerVisible1(false);
                                        // Force UI update
                                        setTimeout(() => { }, 100); // Small delay to ensure state update
                                    }}

                                    onCancel={() => setCheckingDatePickerVisible1(false)}
                                    headerTextIOS="Pick todate Date"
                                    locale="en_GB"
                                    // maximumDate={new Date(2099, 11, 31)}
                                    // minimumDate={new Date(2000, 0, 1)} // Allow dates from 1st Jan 2000
                                    maximumDate={new Date()} // Only allow today or past dates
                                />
                            </View>
                            <View style={{ marginBottom: 10 }} >
                                <Text style={styles.label}>Sales Executive <Text style={{ color: 'red' }}>*</Text></Text>

                                <SearchableDropdown
                                    data={exeDataCRT}
                                    labelKey={["SalesExecutive", "Code"]}
                                    valueKey="Code"
                                    placeholder="Choose sales executive..."
                                    pageSize={10}
                                    initialValue={SelectedSexe ?? null}
                                    onSelect={(items) => {
                                        // items will be an array of selected objects
                                        setSelectedSexe(items);
                                        // Extract PrpCode values and pass as array to parent
                                        const selectedCodes = items.map(item => item.Code);
                                        setForm(prev => ({ ...prev, SexeCode: selectedCodes }));
                                    }}
                                    multiple={true} // Enable multi-select
                                    emptyMessage="No sales executive available"
                                />

                            </View>
                            <View style={styles.inputGroup}>
                                {/* <Text style={styles.label}>Sales Property Group</Text> */}
                                <TouchableOpacity
                                    style={styles.dropdownButton}
                                    onPress={() => setIsIntDropdownOpen(!isIntDropdownOpen)}
                                >
                                    <Text style={styles.dropdownText}>{selectedInternal}</Text>
                                </TouchableOpacity>
                                {isIntDropdownOpen && (
                                    <View style={styles.dropdownOptionsContainer}>
                                        <ScrollView nestedScrollEnabled style={{ maxHeight: 150 }}>
                                            {/* <TouchableOpacity
                                                                            style={styles.dropdownOption}
                                                                            onPress={() => {
                                                                                onExeChangeInternal(null); // Send empty value
                                                                                setIsExeDropdownOpen(false);
                                                                            }}
                                                                        >
                                                                            <Text style={styles.dropdownOptionText}>Select</Text>
                                                                        </TouchableOpacity> */}
                                            {internal_dropdown.map((internal) => (
                                                <TouchableOpacity
                                                    key={internal.value}
                                                    style={[
                                                        styles.dropdownOption,
                                                        selectedInternal === internal.lable && styles.selectedOption,
                                                    ]}
                                                    onPress={() => {
                                                        onExeChangeInternal(internal);
                                                        setIsIntDropdownOpen(false);
                                                    }}
                                                >
                                                    <Text style={styles.dropdownOptionText}>{internal.lable}</Text>
                                                </TouchableOpacity>
                                            ))}
                                        </ScrollView>
                                    </View>
                                )}

                            </View>
                        </ScrollView>

                        {/* Load Button (Fixed at Bottom) */}
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
        paddingBottom: 80, // Extra space for the Load button
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
    dateTriggerText: { fontSize: 14, color: theme.TEXT_PRIMARY, fontWeight: '600' },
    dateTrigger: { backgroundColor: '#F6F7FA', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
});

export default CustomDrawer;
