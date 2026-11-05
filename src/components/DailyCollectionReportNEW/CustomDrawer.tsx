import { Btn, Segment, Sheet } from '@/src/components/erpUi';
import { T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { useEffect, useRef, useState } from 'react';
import {
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { CustomListDrawerPropsNew, DesignData, ItemData, ItemStatus } from './Modal';
// NEW ERP UI: light re-skin of the shared dropdown (same props / behaviour).
import SearchableDropdown from './SearchableDropdown';


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

    // ---------- NEW ERP UI (presentation only) ----------
    const webDateStyle: any = {
        flex: 1,
        border: 'none',
        outline: 'none',
        background: 'transparent',
        fontSize: 14,
        fontWeight: 700,
        color: T.ink,
        width: '100%',
        minWidth: 0,
        padding: 0,
        cursor: 'pointer',
        fontFamily: 'inherit',
    };

    return (
        <Sheet
            open={isVisible}
            onClose={onClose}
            eyebrow="DAILY COLLECTION REPORT"
            title="Filters"
            side
            wideMax={460}
            footer={
                <>
                    <Btn label="Cancel" kind="ghost" onPress={onClose} style={{ flex: 1 }} />
                    <Btn
                        label={isLoading ? 'Loading…' : 'Load'}
                        icon="refresh"
                        onPress={handleLoadPress}
                        loading={isLoading}
                        style={{ flex: 2 }}
                    />
                </>
            }
        >
            {/* Property group */}
            <View style={styles.group}>
                <Text style={styles.label}>Property Group <Text style={styles.req}>*</Text></Text>
                <SearchableDropdown
                    data={getPropertyGroupData}
                    labelKey="PrpOfFull"
                    valueKey="PrpOf"
                    placeholder="Choose property..."
                    title="Property Group"
                    icon="domain"
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

            {/* Property (multi) */}
            <View style={styles.group}>
                <Text style={styles.label}>Property <Text style={styles.req}>*</Text></Text>
                <SearchableDropdown
                    data={getPropertyData}
                    // labelKey="PrpName"
                    labelKey={["PrpName", "PrpCode"]}
                    valueKey="PrpCode"
                    placeholder="Choose property..."
                    title="Property"
                    icon="business"
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

            {/* Date range */}
            <View style={styles.dateRow}>
                <View style={[styles.group, styles.dateCol]}>
                    <Text style={styles.label}>From Date</Text>

                    {Platform.OS === 'web' ? (
                        // ---------- WEB ----------
                        <View style={styles.dateTrigger}>
                            <Icon name="event" size={17} color={T.copper} />
                            {React.createElement('input', {
                                type: 'date',
                                value: form.fromdate || '',
                                max: toISODate(new Date()),
                                'aria-label': 'From date',
                                onChange: (e: any) => {
                                    const v = e.target.value; // already YYYY-MM-DD
                                    setForm(prev => ({ ...prev, fromdate: v }));
                                },
                                style: webDateStyle,
                            })}
                        </View>
                    ) : (
                        // ---------- NATIVE ----------
                        <>
                            <TouchableOpacity
                                activeOpacity={0.85}
                                style={styles.dateTrigger}
                                onPress={() => setCheckingDatePickerVisible(true)}
                                accessibilityRole="button"
                                accessibilityLabel="From date"
                            >
                                <Icon name="event" size={17} color={T.copper} />
                                <Text style={[styles.dateTriggerText, !form.fromdate && styles.placeholderText]} numberOfLines={1}>
                                    {form.fromdate ? formatDisplayDate(form.fromdate) : 'Select from date'}
                                </Text>
                                <Icon name="expand-more" size={20} color={T.muted} />
                            </TouchableOpacity>

                            <DateTimePickerModal
                                isVisible={checkingDatePickerVisible}
                                mode="date"
                                onConfirm={(date) => {
                                    const selectedDate = new Date(date);
                                    selectedDate.setHours(0, 0, 0, 0);
                                    setForm(prev => ({ ...prev, fromdate: toISODate(selectedDate) }));
                                    setCheckingDatePickerVisible(false);
                                }}
                                onCancel={() => setCheckingDatePickerVisible(false)}
                                headerTextIOS="Pick From Date"
                                locale="en_GB"
                                maximumDate={new Date()}
                            />
                        </>
                    )}
                </View>
                <View style={[styles.group, styles.dateCol]}>
                    <Text style={styles.label}>To Date</Text>

                    {Platform.OS === 'web' ? (
                        // ---------- WEB ----------
                        <View style={styles.dateTrigger}>
                            <Icon name="event" size={17} color={T.copper} />
                            {React.createElement('input', {
                                type: 'date',
                                value: form.todate || '',
                                max: toISODate(new Date()),
                                min: form.fromdate || undefined,
                                'aria-label': 'To date',
                                onChange: (e: any) => {
                                    const v = e.target.value;
                                    setForm(prev => ({ ...prev, todate: v }));
                                },
                                style: webDateStyle,
                            })}
                        </View>
                    ) : (
                        // ---------- NATIVE ----------
                        <>
                            <TouchableOpacity
                                activeOpacity={0.85}
                                style={styles.dateTrigger}
                                onPress={() => setCheckingDatePickerVisible1(true)}
                                accessibilityRole="button"
                                accessibilityLabel="To date"
                            >
                                <Icon name="event" size={17} color={T.copper} />
                                <Text style={[styles.dateTriggerText, !form.todate && styles.placeholderText]} numberOfLines={1}>
                                    {form.todate ? formatDisplayDate(form.todate) : 'Select to date'}
                                </Text>
                                <Icon name="expand-more" size={20} color={T.muted} />
                            </TouchableOpacity>

                            <DateTimePickerModal
                                isVisible={checkingDatePickerVisible1}
                                mode="date"
                                onConfirm={(date) => {
                                    const selectedDate = new Date(date);
                                    selectedDate.setHours(0, 0, 0, 0);
                                    setForm(prev => ({ ...prev, todate: toISODate(selectedDate) }));
                                    setCheckingDatePickerVisible1(false);
                                }}
                                onCancel={() => setCheckingDatePickerVisible1(false)}
                                headerTextIOS="Pick To Date"
                                locale="en_GB"
                                maximumDate={new Date()}
                            />
                        </>
                    )}
                </View>
            </View>

            {/* Sales executive (multi) */}
            <View style={styles.group}>
                <Text style={styles.label}>Sales Executive <Text style={styles.req}>*</Text></Text>
                <SearchableDropdown
                    data={exeDataCRT}
                    labelKey={["SalesExecutive", "Code"]}
                    valueKey="Code"
                    placeholder="Choose sales executive..."
                    title="Sales Executive"
                    icon="badge"
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

            {/* Internal / External / Both — same options + handler as the old dropdown */}
            <Segment
                label="Account Type"
                value={selectedInternal as any}
                options={internal_dropdown.map((internal) => ({
                    value: internal.lable as any,
                    label: internal.lable,
                }))}
                onChange={(lable: any) => {
                    const internal = internal_dropdown.find((i) => i.lable === lable);
                    if (!internal) return;
                    onExeChangeInternal(internal);
                    setIsIntDropdownOpen(false);
                }}
            />
        </Sheet>
    );
};

const styles = StyleSheet.create({
    group: { gap: 6 },
    label: { fontSize: 11, fontWeight: '800', color: T.muted, letterSpacing: 0.5, textTransform: 'uppercase' },
    req: { color: T.red },
    dateRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    dateCol: { flex: 1, minWidth: 150 },
    dateTrigger: {
        height: 44,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 12,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: T.border,
        backgroundColor: T.surface,
    },
    dateTriggerText: { flex: 1, fontSize: 14, color: T.ink, fontWeight: '700' },
    placeholderText: { color: T.muted, fontWeight: '600' },
});

export default CustomDrawer;
