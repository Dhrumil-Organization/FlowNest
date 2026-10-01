import { Btn, Sheet } from '@/src/components/erpUi';
import { T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useEffect, useRef, useState } from 'react';
import {
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { CustomListDrawerProps, DesignData, ItemData, ItemStatus } from './Modal';
import SearchableDropdown from './SearchableDropdown';

const CustomDrawer: React.FC<CustomListDrawerProps> = ({
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
    exeData,
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
    getPropertyData,
    setSelectedProperty,
    selectedProperty,
    setForm,
    yearOptions
}) => {
    const [showFromDatePicker, setShowFromDatePicker] = useState(false);
    const [showToDatePicker, setShowToDatePicker] = useState(false);
    const [isYearDropdownOpen, setIsYearDropdownOpen] = useState(false);
    const [isExeDropdownOpen, setIsExeDropdownOpen] = useState(false);
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

    const [step, setStep] = useState(1);

    // const yearOptions = ['2022-2023', '2023-2024', '2024-2025', '2025-2026'];

    console.log("designData:", designData, "itemData:", itemData);

    useEffect(() => {
        if (exeData.length > 0 && !selectedExe) {
            onExeChange(exeData[0]);
        }
    }, [exeData, selectedExe, onExeChange]);



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

    // Date → "YYYY-MM-DD" (HTML date input expects this)
    // Date → "YYYY-MM-DD" (HTML date input expects this)
    const toISODate = (d?: Date | string | null) => {
        if (!d) return '';

        // Already a YYYY-MM-DD string → return as-is
        if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)) return d;

        const date = typeof d === 'string' ? new Date(d) : d;
        if (isNaN(date.getTime())) return '';

        const yyyy = date.getFullYear();
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const dd = String(date.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    };

    // "YYYY-MM-DD" → Date at LOCAL NOON (no timezone shift ever)
    const fromISODate = (s: string) => {
        if (!s) return new Date();
        const [y, m, d] = s.split('-').map(Number);
        return new Date(y, (m || 1) - 1, d || 1, 12, 0, 0, 0);   // 👈 12:00 noon local
    };


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
            eyebrow="COLLECTION"
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
            {/* Property */}
            <View style={styles.group}>
                <Text style={styles.label}>Select Property <Text style={styles.req}>*</Text></Text>
                <SearchableDropdown
                    data={getPropertyData}
                    labelKey="LngName"
                    valueKey="PrpCode"
                    placeholder="Choose property..."
                    title="Property"
                    icon="business"
                    pageSize={10}
                    initialValue={selectedProperty ?? null}
                    onSelect={(item) => {
                        setForm(prev => ({ ...prev, PrpCode: item?.PrpCode || '' }));
                        setSelectedProperty(item);
                    }}
                    multiple={false}
                    emptyMessage="No properties available"
                />
            </View>

            {/* Date range */}
            <View style={styles.dateRow}>
                {/* From Date */}
                <View style={[styles.group, styles.dateCol]}>
                    <Text style={styles.label}>From Date</Text>

                    {Platform.OS === 'web' ? (
                        // Web: native HTML date input
                        <View style={styles.dateTrigger}>
                            <Icon name="event" size={17} color={T.copper} />
                            {React.createElement('input', {
                                type: 'date',
                                value: toISODate(fromDate),
                                max: toISODate(new Date()),
                                'aria-label': 'From date',
                                onChange: (e: any) => {
                                    const v = e.target.value; // "YYYY-MM-DD"
                                    if (v) onFromDateChange(fromISODate(v));
                                },
                                style: webDateStyle,
                            })}
                        </View>
                    ) : (
                        // Native: existing DateTimePicker
                        <>
                            <TouchableOpacity
                                style={styles.dateTrigger}
                                onPress={() => setShowFromDatePicker(true)}
                                activeOpacity={0.85}
                                accessibilityRole="button"
                                accessibilityLabel="From date"
                            >
                                <Icon name="event" size={17} color={T.copper} />
                                <Text style={styles.dateTriggerText} numberOfLines={1}>{formatDate(fromDate)}</Text>
                                <Icon name="expand-more" size={20} color={T.muted} />
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
                        </>
                    )}
                </View>

                {/* To Date */}
                <View style={[styles.group, styles.dateCol]}>
                    <Text style={styles.label}>To Date</Text>

                    {Platform.OS === 'web' ? (
                        <View style={styles.dateTrigger}>
                            <Icon name="event" size={17} color={T.copper} />
                            {React.createElement('input', {
                                type: 'date',
                                value: toISODate(toDate),
                                min: toISODate(fromDate),          // can't pick before From Date
                                max: toISODate(new Date()),        // can't pick future
                                'aria-label': 'To date',
                                onChange: (e: any) => {
                                    const v = e.target.value;
                                    if (v) onToDateChange(fromISODate(v));
                                },
                                style: webDateStyle,
                            })}
                        </View>
                    ) : (
                        <>
                            <TouchableOpacity
                                style={styles.dateTrigger}
                                onPress={() => setShowToDatePicker(true)}
                                activeOpacity={0.85}
                                accessibilityRole="button"
                                accessibilityLabel="To date"
                            >
                                <Icon name="event" size={17} color={T.copper} />
                                <Text style={styles.dateTriggerText} numberOfLines={1}>{formatDate(toDate)}</Text>
                                <Icon name="expand-more" size={20} color={T.muted} />
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
                        </>
                    )}
                </View>
            </View>

            {/* Financial Year Dropdown */}
            <View style={styles.group}>
                <Text style={styles.label}>Financial Year</Text>
                <TouchableOpacity
                    style={[styles.dateTrigger, isYearDropdownOpen && { borderColor: T.nav }]}
                    onPress={() => setIsYearDropdownOpen(!isYearDropdownOpen)}
                    activeOpacity={0.85}
                    accessibilityRole="button"
                    accessibilityLabel={`Financial year ${selectedYear}`}
                    accessibilityState={{ expanded: isYearDropdownOpen }}
                >
                    <Icon name="date-range" size={17} color={T.copper} />
                    <Text style={styles.dateTriggerText}>{selectedYear}</Text>
                    <Icon name={isYearDropdownOpen ? 'expand-less' : 'expand-more'} size={20} color={T.muted} />
                </TouchableOpacity>
                {isYearDropdownOpen && (
                    <View style={styles.options}>
                        <ScrollView nestedScrollEnabled style={{ maxHeight: 200 }}>
                            {yearOptions.map((year, i) => {
                                const on = selectedYear === year;
                                return (
                                    <TouchableOpacity
                                        key={year}
                                        style={[styles.option, i === 0 && { borderTopWidth: 0 }, on && styles.optionOn]}
                                        onPress={() => {
                                            onYearChange(year);
                                            setIsYearDropdownOpen(false);
                                        }}
                                        accessibilityRole="button"
                                        accessibilityState={{ selected: on }}
                                    >
                                        <Text style={[styles.optionText, on && { color: T.nav, fontWeight: '900' }]}>{year}</Text>
                                        {on ? <Icon name="check" size={18} color={T.copper} /> : null}
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                    </View>
                )}
            </View>
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
    options: {
        borderWidth: 1,
        borderColor: T.border,
        borderRadius: 10,
        backgroundColor: T.surface,
        overflow: 'hidden',
    },
    option: {
        minHeight: 44,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 12,
        borderTopWidth: 1,
        borderTopColor: T.hair,
    },
    optionOn: { backgroundColor: `${T.copper}10` },
    optionText: { fontSize: 14, fontWeight: '700', color: T.ink },
});

export default CustomDrawer;
