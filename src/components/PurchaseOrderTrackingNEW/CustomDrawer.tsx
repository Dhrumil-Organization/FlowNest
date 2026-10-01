import { T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    Dimensions,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { Btn, DateField, SearchBox, Sheet, useSotLayout } from '@/src/components/erpUi';
import { CustomDrawerProps, DesignData, ItemData, ItemStatus } from './Modal';
import PropertyDropdown from './PropertyDropdown';

const { height } = Dimensions.get('window');

const CustomDrawer: React.FC<CustomDrawerProps> = ({
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
    getPartyData,
    isLoading,
    onDesignSelect,
    onItemSelectItem,
    onItemSelectParty,
    itemData,
    selectedItemStatus,
    onItemStatusChange,
    setSelectedDesigns,
    selectedDesigns,
    setSelectedItems,
    selectedItems,
    setSelectedParty,
    selectedParty,
    propertydata,
    setpropertydata,
    selectedProperty,
    onPropertySelect,
    yearOptions
}) => {
    const slideAnim = useRef(new Animated.Value(0)).current;
    const [showFromDatePicker, setShowFromDatePicker] = useState(false);
    const [designData1, setdesignData11] = useState([]);
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
    const [isPartyAccordionOpen, setIsPartyAccordionOpen] = useState(false);
    // 
    const [searchQueryItem, setSearchQueryItem] = useState('');
    const [searchQueryParty, setSearchQueryParty] = useState('');
    // const [selectedItems, setSelectedItems] = useState<ItemData[]>([]);
    const [displayedItems, setDisplayedItems] = useState<ItemData[]>([]);
    const [displayedParty, setDisplayedParty] = useState([]);
    const [isLoadingMoreItem, setIsLoadingMoreItem] = useState(false);
    const [isLoadingMoreParty, setIsLoadingMoreParty] = useState(false);
    const [hasMoreItem, setHasMoreItem] = useState(true);
    const [hasMoreParty, setHasMoreParty] = useState(true);
    const scrollViewRefItem = useRef<ScrollView>(null);
    const [isDesignAccordionOpenItem, setIsDesignAccordionOpenItem] = useState(false);
    const [isDesignAccordionOpenParty, setIsDesignAccordionOpenparty] = useState(false);
    const [localItemStatus, setLocalItemStatus] = useState<ItemStatus>(selectedItemStatus || 'All');

    const [step, setStep] = useState(1);

    // const yearOptions = ['2022-2023', '2023-2024', '2024-2025', '2025-2026'];


    useEffect(() => {
        if (exeData.length > 0 && !selectedExe) {
            onExeChange(exeData[0]);
        }
    }, [exeData, selectedExe, onExeChange]);

    useEffect(() => {
        if (designData) {
            setdesignData11(designData as any);
        }
    }, [designData]);

    console.log("designData1:", designData1, "itemData:", itemData);


    // useEffect(() => {
    //     const filtered = designData1.filter(
    //         (design) =>
    //             design.DsnName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    //             design.DsnCode.toLowerCase().includes(searchQuery.toLowerCase())
    //     );
    //     const filtereditem = itemData.filter(
    //         (item) =>
    //             item.ItmName.toLowerCase().includes(searchQueryItem.toLowerCase()) ||
    //             item.ItmCode.toLowerCase().includes(searchQueryItem.toLowerCase())
    //     );
    //     const filteredparty = getPartyData.filter(
    //         (party) =>
    //             party.acccode.toLowerCase().includes(searchQueryParty.toLowerCase()) ||
    //             party.accountname.toLowerCase().includes(searchQueryParty.toLowerCase())
    //     );
    //     setDisplayedDesigns(filtered.slice(0, 10));
    //     setDisplayedItems(filtereditem.slice(0, 10));
    //     setDisplayedParty(filteredparty.slice(0, 10));
    //     setHasMore(filtered.length > 10);
    //     setHasMoreItem(filtereditem.length > 10);
    //     setHasMoreParty(filteredparty.length > 10);



    useEffect(() => {
        const filtered = designData1.filter(
            (design) =>
                design.DsnName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                design.DsnCode.toLowerCase().includes(searchQuery.toLowerCase())
        );
        const filtereditem = itemData.filter(
            (item) =>
                item.ItmName.toLowerCase().includes(searchQueryItem.toLowerCase()) ||
                item.ItmCode.toLowerCase().includes(searchQueryItem.toLowerCase())
        );
        const filteredparty = getPartyData.filter(
            (party) =>
                party.acccode.toLowerCase().includes(searchQueryParty.toLowerCase()) ||
                party.accountname.toLowerCase().includes(searchQueryParty.toLowerCase())
        );
        setDisplayedDesigns(filtered.slice(0, 10));
        setDisplayedItems(filtereditem.slice(0, 10));
        setDisplayedParty(filteredparty.slice(0, 10));
        setHasMore(filtered.length > 10);
        setHasMoreItem(filtereditem.length > 10);
        setHasMoreParty(filteredparty.length > 10);
    }, [searchQuery, designData1, searchQueryItem, itemData, getPartyData, searchQueryParty]);

    // useEffect(() => {
    //     const filtered = getPartyData.filter(
    //         (party) =>
    //             party.DsnName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    //             party.DsnCode.toLowerCase().includes(searchQuery.toLowerCase())
    //     );
    //     const filtereditem = itemData.filter(
    //         (item) =>
    //             item.ItmName.toLowerCase().includes(searchQueryItem.toLowerCase()) ||
    //             item.ItmCode.toLowerCase().includes(searchQueryItem.toLowerCase())
    //     );
    //     setDisplayedDesigns(filtered.slice(0, 10));
    //     setDisplayedItems(filtereditem.slice(0, 10));
    //     setHasMore(filtered.length > 10);
    //     setHasMoreItem(filtereditem.length > 10);
    // }, [searchQuery, getPartyData, searchQueryItem, itemData]);



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
    //     const filtered = designData1.filter(
    //         (design) =>
    //             design.DsnName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    //             design.DsnCode.toLowerCase().includes(searchQuery.toLowerCase())
    //     );
    //     setDisplayedDesigns(filtered.slice(0, 10));
    //     setHasMore(filtered.length > 10);
    // }, [searchQuery, designData1]);

    // Load more designs on scroll
    const loadMoreDesigns = () => {
        if (isLoadingMore || !hasMore) return;

        setIsLoadingMore(true);
        setTimeout(() => {
            const filtered = designData1.filter(
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
    const loadMoreParty = () => {
        if (isLoadingMoreParty || !hasMoreParty) return;

        // FIX: use the party loader + party search text (was setting the design
        // loader and filtering by the design search box, so "load more" ignored
        // the party search and the design loader stayed stuck "on").
        setIsLoadingMoreParty(true);
        setTimeout(() => {
            const filtered = getPartyData.filter(
                (party) =>
                    party.acccode.toLowerCase().includes(searchQueryParty.toLowerCase()) ||
                    party.accountname.toLowerCase().includes(searchQueryParty.toLowerCase())
            );
            const newDisplayed = filtered.slice(0, displayedParty.length + 10);
            setDisplayedParty(newDisplayed);
            setHasMoreParty(newDisplayed.length < filtered.length);
            setIsLoadingMoreParty(false);
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


    const togglePartySelection = (party) => {
        setSelectedParty((prev) =>
            prev.some((i) => i.acccode === party.acccode)
                ? prev.filter((i) => i.acccode !== party.acccode)
                : [...prev, party]
        );
    };

    // Toggle accordion
    const toggleDesignAccordion = () => {
        setIsDesignAccordionOpen(!isDesignAccordionOpen);
    };
    const toggleDesignAccordionItem = () => {
        setIsDesignAccordionOpenItem(!isDesignAccordionOpenItem);
    };
    const toggleDesignAccordionParty = () => {
        setIsDesignAccordionOpenparty(!isDesignAccordionOpenParty);
    };

    useEffect(() => {
        console.log("Selected Party :", selectedParty);
    }, [selectedParty]);

    // Remove all selected designs
    const removeAllSelected = () => {
        setSelectedDesigns([]);
    };
    const removeAllSelectedParty = () => {
        setSelectedParty([]);
    };

    const removeAllSelectedItems = () => {
        setSelectedItems([]);
    };

    const handleLoadPress = () => {
        onLoadPress();
        onDesignSelect(selectedDesigns);
        onItemSelectItem(selectedItems);
        onItemSelectParty(selectedParty);
        console.log("selectedParty", selectedParty)
    };

    const formatDate = (rawDate: any) => {
        let day = rawDate.getDate().toString().padStart(2, '0') || '';
        let month = (rawDate.getMonth() + 1).toString().padStart(2, '0') || ''; // Month is 0-indexed
        let year = rawDate.getFullYear() || '';
        return `${day}-${month}-${year}`;
    };
    console.log("yearOptions", yearOptions)


    // ===== NEW ERP UI (presentation only) =====
    const { width: winWidth } = useSotLayout();
    const twoCol = winWidth >= 720; // Sheet is a side panel from 720px

    // Fires the original "load more" handler when a list is scrolled near its end.
    const nearEnd = (fn: () => void) => ({ nativeEvent }: any) => {
        const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
        const paddingToBottom = 20;
        if (
            layoutMeasurement.height + contentOffset.y >=
            contentSize.height - paddingToBottom
        ) {
            fn();
        }
    };

    return (
        <Sheet
            open={isVisible}
            onClose={onClose}
            eyebrow="PURCHASE ORDER TRACKING"
            title="Filters"
            side
            wideMax={460}
            footer={
                <>
                    <Btn label="Cancel" kind="ghost" onPress={onClose} style={{ flex: 1 }} />
                    {/* Same handler as the old refresh button. Like the original it stays
                        tappable while the spinner shows (isLoading is not always reset). */}
                    <TouchableOpacity
                        style={styles.loadBtn}
                        onPress={handleLoadPress}
                        activeOpacity={0.85}
                        accessibilityRole="button"
                        accessibilityLabel="Load"
                    >
                        {isLoading ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <Icon name="refresh" size={18} color="#fff" />
                        )}
                        <Text style={styles.loadBtnText}>{isLoading ? 'Loading…' : 'Load'}</Text>
                    </TouchableOpacity>
                </>
            }
        >
            {/* Property group */}
            <View style={styles.group}>
                <Text style={styles.label}>
                    Property Group <Text style={{ color: T.red }}>*</Text>
                </Text>
                <PropertyDropdown
                    data={propertydata}
                    labelKey="PrpOfFull"
                    valueKey="PrpOf"
                    placeholder="Choose property..."
                    title="Property Group"
                    icon="apartment"
                    pageSize={10}
                    initialValue={selectedProperty}
                    onSelect={(item) => {
                        console.log("Selected Property:", item);
                        onPropertySelect(item);
                    }}
                    multiple={false}
                    emptyMessage="No properties group available"
                />
            </View>

            {/* From / To date */}
            <View style={[styles.row2, !twoCol && { flexDirection: 'column' }]}>
                <View style={[styles.group, twoCol && { flex: 1 }]}>
                    <Text style={styles.label}>From Date</Text>
                    <DateField value={fromDate} onChange={onFromDateChange} />
                </View>
                <View style={[styles.group, twoCol && { flex: 1 }]}>
                    <Text style={styles.label}>To Date</Text>
                    <DateField value={toDate} onChange={onToDateChange} />
                </View>
            </View>

            {/* Financial year */}
            <View style={styles.group}>
                <Text style={styles.label}>Financial Year</Text>
                <View style={styles.yearWrap}>
                    {yearOptions.map((year) => {
                        const on = selectedYear === year;
                        return (
                            <TouchableOpacity
                                key={year}
                                style={[styles.yearChip, on && styles.yearChipOn]}
                                onPress={() => {
                                    onYearChange(year);
                                    setIsYearDropdownOpen(false);
                                }}
                                accessibilityRole="button"
                                accessibilityState={{ selected: on }}
                            >
                                {on ? <Icon name="check" size={14} color="#fff" /> : null}
                                <Text style={[styles.yearChipText, on && { color: '#fff' }]}>{year}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </View>

            {/* Party */}
            <MultiSection
                title="Party"
                icon="person"
                open={isDesignAccordionOpenParty}
                onToggle={toggleDesignAccordionParty}
                count={selectedParty.length}
                search={searchQueryParty}
                onSearch={setSearchQueryParty}
                searchPlaceholder="Search Party..."
                onSelectAll={() => {
                    const filtered12 = getPartyData.filter(
                        (party) =>
                            party.acccode.toLowerCase().includes(searchQueryParty.toLowerCase()) ||
                            party.accountname.toLowerCase().includes(searchQueryParty.toLowerCase())
                    );
                    setSelectedParty(filtered12);
                }}
                onClear={removeAllSelectedParty}
                selected={selectedParty.map((party: any) => ({
                    key: String(party.acccode),
                    label: party.accountname,
                    code: party.acccode,
                    onRemove: () => togglePartySelection(party),
                }))}
                options={displayedParty.map((party: any) => ({
                    key: String(party.acccode),
                    label: party.accountname,
                    code: party.acccode,
                    on: selectedParty.some((d) => d.acccode === party.acccode),
                    onPress: () => togglePartySelection(party),
                }))}
                onScroll={nearEnd(loadMoreParty)}
                loadingMore={isLoadingMoreParty}
                hasMore={hasMoreParty}
                onLoadMore={loadMoreParty}
                emptyText={
                    getPartyData.length
                        ? 'No matches'
                        : 'Select a property group to load parties'
                }
            />

            {/* Designs — kept exactly as before: the section only renders when
                isDesignAccordionOpen is true (its header toggle was already disabled). */}
            {isDesignAccordionOpen && (
                <MultiSection
                    title="Designs"
                    icon="style"
                    open={isDesignAccordionOpen}
                    onToggle={toggleDesignAccordion}
                    count={selectedDesigns.length}
                    search={searchQuery}
                    onSearch={setSearchQuery}
                    searchPlaceholder="Search Designs..."
                    onSelectAll={() => {
                        const filteredpar = getPartyData.filter(
                            (party) =>
                                party.accountname.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                party.acccode.toLowerCase().includes(searchQuery.toLowerCase())
                        );
                        setSelectedParty(filteredpar);
                    }}
                    onClear={removeAllSelectedParty}
                    selected={selectedDesigns.map((design) => ({
                        key: String(design.DsnCode),
                        label: design.DsnName,
                        code: design.DsnCode,
                        onRemove: () => toggleDesignSelection(design),
                    }))}
                    options={displayedDesigns.map((design) => ({
                        key: String(design.DsnCode),
                        label: design.DsnName,
                        code: design.DsnCode,
                        on: selectedDesigns.some((d) => d.DsnCode === design.DsnCode),
                        onPress: () => toggleDesignSelection(design),
                    }))}
                    onScroll={nearEnd(loadMoreDesigns)}
                    loadingMore={isLoadingMore}
                    hasMore={hasMore}
                    onLoadMore={loadMoreDesigns}
                />
            )}
        </Sheet>
    );
};

/* ---------------------------------------------------------------------- */
/* Collapsible multi-select (same look as Sales Order Tracking filters)     */
/* ---------------------------------------------------------------------- */

type MultiOpt = { key: string; label: string; code?: string; on: boolean; onPress: () => void };
type MultiSel = { key: string; label: string; code?: string; onRemove: () => void };

function MultiSection({
    title,
    icon,
    open,
    onToggle,
    count,
    search,
    onSearch,
    searchPlaceholder,
    onSelectAll,
    onClear,
    selected,
    options,
    onScroll,
    loadingMore,
    hasMore,
    onLoadMore,
    emptyText = 'No matches',
}: {
    title: string;
    icon: string;
    open: boolean;
    onToggle: () => void;
    count: number;
    search: string;
    onSearch: (t: string) => void;
    searchPlaceholder: string;
    onSelectAll: () => void;
    onClear: () => void;
    selected: MultiSel[];
    options: MultiOpt[];
    onScroll: (e: any) => void;
    loadingMore: boolean;
    hasMore: boolean;
    onLoadMore: () => void;
    emptyText?: string;
}) {
    return (
        <View style={[styles.multi, open && styles.multiOpen]}>
            <TouchableOpacity
                style={styles.multiHead}
                onPress={onToggle}
                accessibilityRole="button"
                accessibilityLabel={`${open ? 'Hide' : 'Select'} ${title}`}
            >
                <View style={styles.multiIcon}>
                    <Icon name={icon as any} size={17} color={T.copper} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.multiTitle}>{title}</Text>
                    <Text style={styles.multiSub} numberOfLines={1}>
                        {count > 0
                            ? selected.slice(0, 2).map((s) => s.label).join(', ') + (count > 2 ? ` +${count - 2} more` : '')
                            : 'All (no filter)'}
                    </Text>
                </View>
                {count > 0 ? (
                    <View style={styles.countBadge}>
                        <Text style={styles.countBadgeText}>{count}</Text>
                    </View>
                ) : null}
                <Icon name={open ? 'keyboard-arrow-up' : 'keyboard-arrow-down'} size={22} color={T.muted} />
            </TouchableOpacity>

            {open && (
                <View style={styles.multiBody}>
                    <SearchBox value={search} onChangeText={onSearch} placeholder={searchPlaceholder} />

                    <View style={styles.multiActions}>
                        <TouchableOpacity style={styles.linkBtn} onPress={onSelectAll} accessibilityRole="button">
                            <Icon name="done-all" size={15} color={T.blue} />
                            <Text style={styles.linkBtnText}>Select all</Text>
                        </TouchableOpacity>
                        {count > 0 ? (
                            <TouchableOpacity style={styles.linkBtn} onPress={onClear} accessibilityRole="button">
                                <Icon name="clear-all" size={15} color={T.red} />
                                <Text style={[styles.linkBtnText, { color: T.red }]}>Clear ({count})</Text>
                            </TouchableOpacity>
                        ) : null}
                    </View>

                    {selected.length > 0 ? (
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.selRow}>
                            {selected.map((s, i) => (
                                <TouchableOpacity
                                    key={`${s.key}-${i}`}
                                    style={styles.selChip}
                                    onPress={s.onRemove}
                                    accessibilityLabel={`Remove ${s.label}`}
                                >
                                    <Text style={styles.selChipText} numberOfLines={1}>
                                        {s.label}
                                        {s.code ? ` (${s.code})` : ''}
                                    </Text>
                                    <Icon name="close" size={13} color="#fff" />
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    ) : null}

                    <ScrollView
                        style={styles.optList}
                        nestedScrollEnabled
                        keyboardShouldPersistTaps="handled"
                        onScroll={onScroll}
                        scrollEventThrottle={16}
                    >
                        {options.map((o, i) => (
                            <TouchableOpacity
                                key={`${o.key}-${i}`}
                                style={[styles.optRow, o.on && styles.optRowOn]}
                                onPress={o.onPress}
                                accessibilityRole="checkbox"
                                accessibilityState={{ checked: o.on }}
                            >
                                <Icon
                                    name={o.on ? 'check-box' : 'check-box-outline-blank'}
                                    size={20}
                                    color={o.on ? T.nav : T.muted}
                                />
                                <View style={{ flex: 1, minWidth: 0 }}>
                                    <Text style={styles.optLabel} numberOfLines={1}>{o.label}</Text>
                                    {o.code ? <Text style={styles.optCode} numberOfLines={1}>{o.code}</Text> : null}
                                </View>
                            </TouchableOpacity>
                        ))}
                        {!options.length ? <Text style={styles.noOpt}>{emptyText}</Text> : null}
                        {loadingMore ? (
                            <ActivityIndicator size="small" color={T.copper} style={{ marginVertical: 10 }} />
                        ) : hasMore ? (
                            <TouchableOpacity style={styles.moreBtn} onPress={onLoadMore}>
                                <Text style={styles.moreBtnText}>Show more</Text>
                            </TouchableOpacity>
                        ) : null}
                    </ScrollView>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    group: { gap: 6 },
    row2: { flexDirection: 'row', gap: 12 },
    label: { fontSize: 11, fontWeight: '800', color: T.muted, letterSpacing: 0.5, textTransform: 'uppercase' },

    yearWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    yearChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        height: 34,
        paddingHorizontal: 12,
        borderRadius: 17,
        borderWidth: 1,
        borderColor: T.border,
        backgroundColor: T.surface,
    },
    yearChipOn: { backgroundColor: T.nav, borderColor: T.nav },
    yearChipText: { fontSize: 12.5, fontWeight: '700', color: T.nav },

    loadBtn: {
        flex: 2,
        height: 44,
        borderRadius: 10,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: T.nav,
    },
    loadBtnText: { fontSize: 14, fontWeight: '800', color: '#fff' },

    multi: {
        borderWidth: 1,
        borderColor: T.border,
        borderRadius: 12,
        backgroundColor: T.surface,
        overflow: 'hidden',
    },
    multiOpen: { borderColor: `${T.nav}55` },
    multiHead: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, minHeight: 56 },
    multiIcon: {
        width: 32,
        height: 32,
        borderRadius: 9,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: `${T.copper}14`,
    },
    multiTitle: { fontSize: 14, fontWeight: '800', color: T.ink },
    multiSub: { fontSize: 11.5, fontWeight: '600', color: T.muted, marginTop: 1 },
    countBadge: {
        minWidth: 22,
        height: 22,
        borderRadius: 11,
        paddingHorizontal: 6,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: T.copper,
    },
    countBadgeText: { color: '#fff', fontSize: 11, fontWeight: '900' },
    multiBody: {
        paddingHorizontal: 12,
        paddingBottom: 12,
        gap: 10,
        borderTopWidth: 1,
        borderTopColor: T.hair,
        paddingTop: 12,
        backgroundColor: T.sub,
    },
    multiActions: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    linkBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4 },
    linkBtnText: { fontSize: 12.5, fontWeight: '800', color: T.blue },
    selRow: { gap: 6 },
    selChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        height: 28,
        paddingHorizontal: 10,
        borderRadius: 14,
        backgroundColor: T.nav,
        maxWidth: 240,
    },
    selChipText: { fontSize: 11.5, fontWeight: '700', color: '#fff', flexShrink: 1 },
    optList: {
        maxHeight: 300,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: T.border,
        backgroundColor: T.surface,
    },
    optRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: 12,
        paddingVertical: 10,
        minHeight: 44,
        borderBottomWidth: 1,
        borderBottomColor: T.hair,
    },
    optRowOn: { backgroundColor: `${T.nav}0D` },
    optLabel: { fontSize: 13.5, fontWeight: '700', color: T.ink },
    optCode: { fontSize: 11, fontWeight: '600', color: T.muted, marginTop: 1 },
    noOpt: { textAlign: 'center', color: T.muted, fontSize: 12.5, paddingVertical: 16, paddingHorizontal: 12 },
    moreBtn: { alignItems: 'center', paddingVertical: 10 },
    moreBtnText: { fontSize: 12.5, fontWeight: '800', color: T.copper },
});

export default CustomDrawer;
