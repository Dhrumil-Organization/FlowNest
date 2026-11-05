import theme from '@/components/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    Dimensions,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    SafeAreaView,
    StatusBar,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { CustomDrawerReceiveableProps, DashAccount, DashParty, DashPrp, DashSexe, DashSubHead, DesignData, ItemData, ItemStatus } from './Modal';

const { height } = Dimensions.get('window');

const CustomDrawer: React.FC<CustomDrawerReceiveableProps> = ({
    isVisible,
    onClose,
    fromDate,
    toDate,
    selectedYear,
    selectedPrpgrp,
    setSelectedDashPrp,
    selectedDashPrp,
    onFromDateChange,
    onToDateChange,
    onYearChange,
    onExeChangeReceive,
    onLoadPress,
    handleConfirmAction,
    // onLoadPressItem,
    receivables_prpgroup,
    internal_dropdown,
    designData,
    isLoading,
    onDashPrpSelect,
    onDashPartySelect,
    onDashSexeSelect,
    onDashSubHeadSelect,
    onDashSSexedSelect,
    onItemSelectItem,
    itemData,
    selectedItemStatus,
    onItemStatusChange,
    setSelectedDesigns,
    selectedDesigns,
    setSelectedItems,
    selectedItems,
    // 
    onExeChangeInternal,
    selectedInternal,
    getdashPrp,
    // 
    getdashParty,
    setSelectedDashParty,
    selectedDashParty,
    // 
    getdashSubHead,
    setSelectedDashSubHead,
    selectedDashSubHead,
    // 
    getdashSexe,
    setSelectedDashSexe,
    selectedDashSexe,
    // 
    getAccountLoading,
    dashAccount,
    getdashPropertyLoading,
    getdashPartyLoading,
    getdashSubHeadLoading,
    getdashSexeLoading,
    // 
    getdashAccount,
    setSelectedDashAccount,
    selectedDashAccount,
    getdashAccountLoading,
    setAccountLoading
}) => {
    const slideAnim = useRef(new Animated.Value(0)).current;
    const [showFromDatePicker, setShowFromDatePicker] = useState(false);
    const [showToDatePicker, setShowToDatePicker] = useState(false);
    const [isYearDropdownOpen, setIsYearDropdownOpen] = useState(false);
    const [isExeDropdownOpen, setIsExeDropdownOpen] = useState(false);
    const [isIntDropdownOpen, setIsIntDropdownOpen] = useState(false);
    const [getdashAccountLoading123, setdashAccountLoading123] = useState(false);
    // 
    const [searchQuery, setSearchQuery] = useState('');
    const [searchQueryParty, setSearchQueryParty] = useState('');
    const [searchQuerySexe, setSearchQuerySexe] = useState('');
    const [searchQueryAccount, setSearchQueryAccount] = useState('');
    const [searchQuerySubHead, setSearchQuerySubHead] = useState('');
    // const [selectedDesigns, setSelectedDesigns] = useState<DesignData[]>([]);
    const [displayedDesigns, setDisplayedDesigns] = useState<DesignData[]>([]);
    const [displayedDashPrp, setDisplayedDashPrp] = useState<DashPrp[]>([]);
    const [displayedDashParty, setDisplayedDashParty] = useState<DashParty[]>([]);
    const [displayedDashSexe, setDisplayedDashSexe] = useState<DashSexe[]>([]);
    const [displayedDashAccount, setDisplayedDashAccount] = useState<DashAccount[]>([]);
    const [displayedDashSubHead, setDisplayedDashSubHead] = useState<DashSubHead[]>([]);
    const [isLoadingMorePrpGrp, setIsLoadingMorePrpGrp] = useState(false);
    const [isLoadingMoreParty, setIsLoadingMoreParty] = useState(false);
    const [isLoadingMoreSexe, setIsLoadingMoreSexe] = useState(false);
    const [isLoadingMoreAccount, setIsLoadingMoreAccount] = useState(false);
    const [isLoadingMoreSubHead, setIsLoadingMoreSubHead] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [hasMoreParty, setHasMoreParty] = useState(true);
    const [hasMoreSexe, setHasMoreSexe] = useState(true);
    const [hasMoreAccount, setHasMoreAccount] = useState(true);
    const [hasMoreSubHead, setHasMoreSubHead] = useState(true);
    const scrollViewRef = useRef<ScrollView>(null);
    const scrollViewRefParty = useRef<ScrollView>(null);
    const scrollViewRefSexe = useRef<ScrollView>(null);
    const scrollViewRefAccount = useRef<ScrollView>(null);
    const scrollViewRefSubHead = useRef<ScrollView>(null);
    const [isDashPrpAccordionOpen, setIsDashPrpAccordionOpen] = useState(false);
    const [isDashPartyAccordionOpen, setIsDashPartyAccordionOpen] = useState(false);
    const [isDashSexeAccordionOpen, setIsDashSexeAccordionOpen] = useState(false);
    const [isDashAccountAccordionOpen, setIsDashAccountAccordionOpen] = useState(false);
    const [isDashSubHeadAccordionOpen, setIsDashSubHeadAccordionOpen] = useState(false);
    // 
    const [searchQueryItem, setSearchQueryItem] = useState('');
    // const [selectedItems, setSelectedItems] = useState<ItemData[]>([]);
    const [displayedItems, setDisplayedItems] = useState<ItemData[]>([]);
    const [isLoadingMoreItem, setIsLoadingMoreItem] = useState(false);
    const [hasMoreItem, setHasMoreItem] = useState(true);
    const scrollViewRefItem = useRef<ScrollView>(null); 163

    const [isDesignAccordionOpenItem, setIsDesignAccordionOpenItem] = useState(false);
    const [localItemStatus, setLocalItemStatus] = useState<ItemStatus>(selectedItemStatus || 'All');

    const [step, setStep] = useState(1);
    const isInternalAutoSelected = useRef(false);
    const isPrpgrpAutoSelected = useRef(false);

    const yearOptions = ['2022-2023', '2023-2024', '2024-2025', '2025-2026'];

    console.log("designData:", designData, "itemData:", itemData);

    useEffect(() => {
        if (receivables_prpgroup.length > 0 && !selectedPrpgrp) {
            onExeChangeReceive(receivables_prpgroup[0]);
        }
    }, [receivables_prpgroup, selectedPrpgrp, onExeChangeReceive]);
    useEffect(() => {
        if (internal_dropdown.length > 0 && !selectedInternal) {
            onExeChangeInternal(internal_dropdown[0]);
        }
    }, [internal_dropdown, selectedInternal, onExeChangeInternal]);



    useEffect(() => {
        const filtered = getdashPrp.filter(
            (design) =>
                design.PrpCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
                design.PrpName.toLowerCase().includes(searchQuery.toLowerCase())
        );
        if (getdashParty && getdashParty.length > 0) {
            const filteredParty = getdashParty.filter(
                (design) =>
                    design.acccode.toLowerCase().includes(searchQueryParty.toLowerCase()) ||
                    design.accname.toLowerCase().includes(searchQueryParty.toLowerCase())
            );
            setDisplayedDashParty(filteredParty.slice(0, 10));
            setHasMoreParty(filteredParty.length > 10);
        }
        if (getdashSexe && getdashSexe.length > 0) {
            const filteredSexe = getdashSexe.filter(
                (sexe) =>
                    sexe.Code.toLowerCase().includes(searchQuerySexe.toLowerCase()) ||
                    sexe.SalesExecutive.toLowerCase().includes(searchQuerySexe.toLowerCase())
            );
            setDisplayedDashSexe(filteredSexe.slice(0, 10));
            setHasMoreSexe(filteredSexe.length > 10);
        }
        if (getdashAccount && getdashAccount.length > 0) {
            const filteredAccount = getdashAccount.filter(
                (acc) =>
                    acc.AccCode.toLowerCase().includes(searchQueryAccount.toLowerCase()) ||
                    acc.AccName.toLowerCase().includes(searchQueryAccount.toLowerCase())
            );
            setDisplayedDashAccount(filteredAccount.slice(0, 10));
            setHasMoreAccount(filteredAccount.length > 10);
        }
        if (getdashSubHead && getdashSubHead.length > 0) {
            const filteredSubHead = getdashSubHead.filter(
                (sub) =>
                    sub.SHName.toLowerCase().includes(searchQuerySubHead.toLowerCase()) ||
                    sub.SHead.toLowerCase().includes(searchQuerySubHead.toLowerCase())
            );
            setDisplayedDashSubHead(filteredSubHead.slice(0, 10));
            setHasMoreSubHead(filteredSubHead.length > 10);
        }
        const filtereditem = itemData.filter(
            (item) =>
                item.ItmName.toLowerCase().includes(searchQueryItem.toLowerCase()) ||
                item.ItmCode.toLowerCase().includes(searchQueryItem.toLowerCase())
        );
        setDisplayedDashPrp(filtered.slice(0, 10));

        setDisplayedItems(filtereditem.slice(0, 10));
        setHasMore(filtered.length > 10);

        setHasMoreItem(filtereditem.length > 10);
    }, [searchQuery, searchQueryParty, searchQuerySexe, searchQueryAccount, searchQuerySubHead, getdashPrp, getdashParty, getdashSexe, getdashAccount, getdashSubHead, searchQueryItem, itemData]);

    console.log("getdashPrp:", getdashPrp, "getdashParty:", getdashParty, "getdashSexe:", getdashSexe, "getdashAccount:", getdashAccount, "getdashSubHead:", getdashSubHead, "itemData:", itemData);
    console.log("Sexe Data:", displayedDashSexe);
    console.log("Account Data:", displayedDashAccount);


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

    // For Internal Dropdown
    // For Internal Dropdown
    useEffect(() => {
        if (internal_dropdown.length > 0 && (!selectedInternal || selectedInternal === "") && !isInternalAutoSelected.current) {
            onExeChangeInternal(internal_dropdown[0]);
            isInternalAutoSelected.current = true;
        }
    }, [internal_dropdown, selectedInternal, onExeChangeInternal]);

    // For Property Group Dropdown
    useEffect(() => {
        if (receivables_prpgroup.length > 0 && (!selectedPrpgrp || selectedPrpgrp === "") && !isPrpgrpAutoSelected.current) {
            onExeChangeReceive(receivables_prpgroup[0]);
            isPrpgrpAutoSelected.current = true;
        }
    }, [receivables_prpgroup, selectedPrpgrp, onExeChangeReceive]);

    // For DashPrp
    // For DashPrp
    // useEffect(() => {
    //     if (getdashPrp.length > 0) {
    //         setSelectedDashPrp([getdashPrp[0]]);
    //     }
    // }, [getdashPrp]);

    // // For DashParty
    // useEffect(() => {
    //     if (getdashParty.length > 0) {
    //         setSelectedDashParty([getdashParty[0]]);
    //     }
    // }, [getdashParty]);

    // // For DashSexe
    // useEffect(() => {
    //     if (getdashSexe.length > 0) {
    //         setSelectedDashSexe([getdashSexe[0]]);
    //     }
    // }, [getdashSexe]);

    // // For DashSubHead
    // useEffect(() => {
    //     if (getdashSubHead.length > 0) {
    //         setSelectedDashSubHead([getdashSubHead[0]]);
    //     }
    // }, [getdashSubHead]);

    // // For DashAccount
    // useEffect(() => {
    //     if (getdashAccount.length > 0) {
    //         setSelectedDashAccount([getdashAccount[0]]);
    //     }
    // }, [getdashAccount]);


    //   

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
    const loadMorePrpGrp = () => {
        if (isLoadingMorePrpGrp || !hasMore) return;

        setIsLoadingMorePrpGrp(true);
        setTimeout(() => {
            const filtered = getdashPrp.filter(
                (prp) =>
                    prp.PrpCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    prp.PrpName.toLowerCase().includes(searchQuery.toLowerCase())
            );
            const newDisplayed = filtered.slice(0, displayedDashPrp.length + 10);
            setDisplayedDashPrp(newDisplayed);
            setHasMore(newDisplayed.length < filtered.length);
            setIsLoadingMorePrpGrp(false);
        }, 1000); // Simulate network delay
    };
    const loadMoreParty = () => {
        if (isLoadingMoreParty || !hasMoreParty) return;

        setIsLoadingMoreParty(true);
        setTimeout(() => {
            const filtered = getdashParty.filter(
                (party) =>
                    party.acccode.toLowerCase().includes(searchQueryParty.toLowerCase()) ||
                    party.accname.toLowerCase().includes(searchQueryParty.toLowerCase()) ||
                    party.bkrcode.toLowerCase().includes(searchQueryParty.toLowerCase()) ||
                    party.sexe.toLowerCase().includes(searchQueryParty.toLowerCase())
            );
            const newDisplayedParty = filtered.slice(0, displayedDashParty.length + 10);
            setDisplayedDashParty(newDisplayedParty);
            setHasMoreParty(newDisplayedParty.length < filtered.length);
            setIsLoadingMoreParty(false);
        }, 1000); // Simulate network delay
    };
    const loadMoreSexe = () => {
        if (isLoadingMoreSexe || !hasMoreSexe) return;

        setIsLoadingMoreSexe(true);
        setTimeout(() => {
            const filtered = getdashSexe.filter(
                (sexe) =>
                    sexe.Code.toLowerCase().includes(searchQuerySexe.toLowerCase()) ||
                    sexe.SalesExecutive.toLowerCase().includes(searchQuerySexe.toLowerCase())
            );
            const newDisplayedSexe = filtered.slice(0, displayedDashSexe.length + 10);
            setDisplayedDashSexe(newDisplayedSexe);
            setHasMoreSexe(newDisplayedSexe.length < filtered.length);
            setIsLoadingMoreSexe(false);
        }, 1000); // Simulate network delay
    };
    const loadMoreAccount = () => {
        if (isLoadingMoreAccount || !hasMoreAccount) return;

        setIsLoadingMoreAccount(true);
        setTimeout(() => {
            const filtered = getdashAccount.filter(
                (acc) =>
                    acc.AccCode.toLowerCase().includes(searchQueryAccount.toLowerCase()) ||
                    acc.AccName.toLowerCase().includes(searchQueryAccount.toLowerCase())
            );
            const newDisplayedAccount = filtered.slice(0, displayedDashAccount.length + 10);
            setDisplayedDashAccount(newDisplayedAccount);
            setHasMoreAccount(newDisplayedAccount.length < filtered.length);
            setIsLoadingMoreAccount(false);
        }, 1000); // Simulate network delay
    };
    const loadMoreSubHead = () => {
        if (isLoadingMoreSubHead || !hasMoreSubHead) return;

        setIsLoadingMoreSubHead(true);
        setTimeout(() => {
            const filtered = getdashSubHead.filter(
                (sub) =>
                    sub.SHName.toLowerCase().includes(searchQuerySubHead.toLowerCase()) ||
                    sub.SHead.toLowerCase().includes(searchQuerySubHead.toLowerCase())
            );
            const newDisplayedSubHead = filtered.slice(0, displayedDashSubHead.length + 10);
            setDisplayedDashSubHead(newDisplayedSubHead);
            setHasMoreSubHead(newDisplayedSubHead.length < filtered.length);
            setIsLoadingMoreSubHead(false);
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
    const toggleDashPrp = (prp: DashPrp) => {
        setSelectedDashPrp((prev) =>
            prev.some((d) => d.PrpCode === prp.PrpCode)
                ? prev.filter((d) => d.PrpCode !== prp.PrpCode)
                : [...prev, prp]
        );
    };
    // const toggleDashParty = (party: DashParty) => {
    //     setSelectedDashParty((prev) =>
    //         prev.some((d) => d.acccode === party.acccode)
    //             ? prev.filter((d) => d.acccode !== party.acccode)
    //             : [...prev, party]
    //     );
    // };
    // Update the toggleDashParty function to handle single selection
    const toggleDashParty = (party: DashParty) => {
        setSelectedDashParty([party]); // Replace the entire array with the new selection
    };
    const toggleDashSexe = (sexe: DashSexe) => {
        setSelectedDashSexe((prev) =>
            prev.some((d) => d.Code === sexe.Code)
                ? prev.filter((d) => d.Code !== sexe.Code)
                : [...prev, sexe]
        );
    };
    const toggleDashAccount = (acc: DashAccount) => {
        setSelectedDashAccount((prev) =>
            prev.some((d) => d.AccCode === acc.AccCode)
                ? prev.filter((d) => d.AccCode !== acc.AccCode)
                : [...prev, acc]
        );
    };
    const toggleDashSubHead = (sub: DashSubHead) => {
        setSelectedDashSubHead((prev) =>
            prev.some((d) => d.SHead === sub.SHead)
                ? prev.filter((d) => d.SHead !== sub.SHead)
                : [...prev, sub]
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
        setIsDashPrpAccordionOpen(!isDashPrpAccordionOpen);
    };
    const toggleDesignAccordionParty = () => {
        setIsDashPartyAccordionOpen(!isDashPartyAccordionOpen);
    };
    const toggleDesignAccordionSexe = () => {
        setIsDashSexeAccordionOpen(!isDashSexeAccordionOpen);
    };
    const toggleDesignAccordionAccount = () => {
        setIsDashAccountAccordionOpen(!isDashAccountAccordionOpen);
    };
    const toggleDesignAccordionSubHead = () => {
        setIsDashSubHeadAccordionOpen(!isDashSubHeadAccordionOpen);
    };
    const toggleDesignAccordionItem = () => {
        setIsDesignAccordionOpenItem(!isDesignAccordionOpenItem);
    };


    // Remove all selected designs
    const removeAllSelected = () => {
        setSelectedDashPrp([]);
    };
    const removeAllSelectedParty = () => {
        setSelectedDashParty([]);
    };
    const removeAllSelectedSexe = () => {
        setSelectedDashSexe([]);
    };
    const removeAllSelectedAccount = () => {
        setSelectedDashAccount([]);
    };
    const removeAllSelectedSubHead = () => {
        setSelectedDashSubHead([]);
    };

    const removeAllSelectedItems = () => {
        setSelectedItems([]);
    };

    const handleLoadPressAccount = () => {
        setAccountLoading(true);
        // onLoadPress();
        // onDashPrpSelect(selectedDashPrp); // Pass selected designs to parent.
        // onDashPartySelect(selectedDashParty);
        // onDashSexeSelect(selectedDashSexe);
        // onDashSubHeadSelect(selectedDashSubHead);
        // onItemSelectItem(selectedItems);
        dashAccount(selectedDashPrp, selectedDashParty, selectedDashSexe, selectedDashSubHead, selectedPrpgrp, selectedInternal);
    };
    const handleLoadPress = () => {
        // onDashPrpSelect(selectedDashPrp); // Pass selected designs to parent.
        // onDashPartySelect(selectedDashParty);
        // onDashSexeSelect(selectedDashSexe);
        // onDashSubHeadSelect(selectedDashSubHead);
        // onItemSelectItem(selectedItems);
        handleConfirmAction(selectedDashPrp, selectedDashParty, selectedDashSexe, selectedDashSubHead, selectedDashAccount);
        // dashAccount(selectedDashPrp, selectedDashParty, selectedDashSexe, selectedDashSubHead, selectedPrpgrp, selectedInternal);
    };

    const formatDate = (rawDate: any) => {
        let day = rawDate.getDate().toString().padStart(2, '0') || '';
        let month = (rawDate.getMonth() + 1).toString().padStart(2, '0') || ''; // Month is 0-indexed
        let year = rawDate.getFullYear() || '';
        return `${day}-${month}-${year}`;
    };


    const [openDropdown, setOpenDropdown] = useState<string | null>(null);

    const selectField = (key: string, label: string, value: string, options: { label: string; onPress: () => void }[]) => (
        <View style={styles.simpleFieldGroup}>
            <Text style={styles.simpleLabel}>{label}</Text>
            <TouchableOpacity
                style={styles.simpleSelect}
                activeOpacity={0.85}
                onPress={() => setOpenDropdown(openDropdown === key ? null : key)}
            >
                <Text style={styles.simpleSelectText} numberOfLines={1}>{value || `Select ${label}`}</Text>
                <Icon name={openDropdown === key ? 'keyboard-arrow-up' : 'keyboard-arrow-down'} size={22} color="#27445A" />
            </TouchableOpacity>
            {openDropdown === key && (
                <View style={styles.simpleOptions}>
                    {options.map((option, index) => (
                        <TouchableOpacity
                            key={`${key}-${index}`}
                            style={styles.simpleOption}
                            onPress={() => { option.onPress(); setOpenDropdown(null); }}
                        >
                            <Text style={styles.simpleOptionText}>{option.label}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            )}
        </View>
    );

    const propertyOptions = (receivables_prpgroup || []).map((item: any) => ({
        label: item?.PrpTypeOf || item?.PrpName || item?.PrpCode || 'Property',
        onPress: () => onExeChangeReceive(item),
    }));
    const internalOptions = (internal_dropdown || []).map((item: any) => ({
        label: item?.lable || item?.label || item?.value || 'Internal',
        onPress: () => onExeChangeInternal(item),
    }));
    const yearList = Array.from(new Set([...yearOptions, selectedYear])).map((year) => ({
        label: year,
        onPress: () => onYearChange(year),
    }));

    return (
        <Modal visible={isVisible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent={false}>
            <StatusBar barStyle="light-content" backgroundColor="#10283A" translucent={false} />
            <View style={styles.modalOverlay}>
                <Animated.View style={[styles.drawerContainer, { transform: [{ translateY: slideAnim }] }]}>
                    <SafeAreaView style={styles.safeAreaContainer}>
                    <View style={styles.referenceFilterSheet}>
                        <View style={styles.referenceFilterHeader}>
                            <TouchableOpacity
                                style={styles.referenceBackButton}
                                onPress={onClose}
                                accessibilityRole="button"
                                accessibilityLabel="Back to payable"
                            >
                                <Icon name="arrow-back" size={24} color="#FFFFFF" />
                            </TouchableOpacity>

                            <View style={styles.commonHeaderTitleBlock}>
                                <View style={styles.filterHeaderTitleRow}>
                                    <Icon name="filter-alt" size={20} color="#F97316" />
                                    <Text style={styles.filterHeaderTitle}>Payable Filter</Text>
                                </View>
                                <Text style={styles.commonHeaderSubtitle}>Select property, year and store</Text>
                            </View>

                            <TouchableOpacity style={styles.referenceCloseButton} onPress={onClose}>
                                <Icon name="close" size={22} color="#10283A" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView contentContainerStyle={styles.referenceFilterContent} showsVerticalScrollIndicator={false} nestedScrollEnabled>
                            <View style={styles.commonFilterCard}>
                                {selectField('property', 'Property Group', selectedPrpgrp?.PrpTypeOf || selectedPrpgrp?.PrpName || selectedPrpgrp || '', propertyOptions)}
                                {selectField('year', 'Year', selectedYear, yearList)}
                                {selectField('internal', 'Store', selectedInternal?.lable || selectedInternal?.label || 'Internal', internalOptions)}
                            </View>

                            {/* <View style={styles.dateRow}>
                                <View style={styles.dateColumn}>
                                    <Text style={styles.simpleLabel}>From Date <Text style={styles.required}>*</Text></Text>
                                    <TouchableOpacity style={styles.simpleSelect} onPress={() => setShowFromDatePicker(!showFromDatePicker)}>
                                        <Text style={styles.simpleSelectText}>{formatDate(fromDate)}</Text>
                                        <Icon name="calendar-today" size={18} color="#27445A" />
                                    </TouchableOpacity>
                                </View>
                                <View style={styles.dateColumn}>
                                    <Text style={styles.simpleLabel}>To Date <Text style={styles.required}>*</Text></Text>
                                    <TouchableOpacity style={styles.simpleSelect} onPress={() => setShowToDatePicker(!showToDatePicker)}>
                                        <Text style={styles.simpleSelectText}>{formatDate(toDate)}</Text>
                                        <Icon name="calendar-today" size={18} color="#27445A" />
                                    </TouchableOpacity>
                                </View>
                            </View> */}

                            <View style={styles.optionalSection}>
                                <Text style={styles.optionalTitle}>Additional Filters</Text>
                                <View style={styles.multiSelectFieldGroup}>
                                    <Text style={styles.simpleLabel}>Property</Text>
                                    <TouchableOpacity style={styles.simpleSelect} onPress={toggleDesignAccordion} activeOpacity={0.85}>
                                        <Text style={styles.simpleSelectText} numberOfLines={1}>
                                            {selectedDashPrp.length > 0 ? `Selected Properties (${selectedDashPrp.length})` : 'Select Property'}
                                        </Text>
                                        <Icon name={isDashPrpAccordionOpen ? 'keyboard-arrow-up' : 'keyboard-arrow-down'} size={22} color="#27445A" />
                                    </TouchableOpacity>
                                </View>
                                {isDashPrpAccordionOpen && (displayedDashPrp.length > 0 ? (
                                    <View style={styles.multiSelectOptions}>
                                    {displayedDashPrp.map((item: any) => (
                                    <TouchableOpacity key={item.PrpCode} style={styles.inlineOption} onPress={() => toggleDashPrp(item)}>
                                        <Text style={styles.inlineOptionText}>{item.PrpName || item.PrpCode}</Text>
                                        <Icon name={selectedDashPrp.some((x) => x.PrpCode === item.PrpCode) ? 'check-circle' : 'radio-button-unchecked'} size={20} color="#F97316" />
                                    </TouchableOpacity>
                                ))}
                                    </View>
                                ) : <Text style={styles.noOptionText}>No properties available</Text>)}

                                <TouchableOpacity style={styles.optionalSelect} onPress={toggleDesignAccordionParty}>
                                    <Text style={styles.optionalSelectText}>Party Selection ({selectedDashParty.length})</Text>
                                    <Icon name={isDashPartyAccordionOpen ? 'keyboard-arrow-up' : 'keyboard-arrow-down'} size={22} color="#27445A" />
                                </TouchableOpacity>
                                {isDashPartyAccordionOpen && displayedDashParty.map((item: any) => (
                                    <TouchableOpacity key={item.acccode} style={styles.inlineOption} onPress={() => toggleDashParty(item)}>
                                        <Text style={styles.inlineOptionText}>{item.accname || item.acccode}</Text>
                                        <Icon name={selectedDashParty.some((x) => x.acccode === item.acccode) ? 'check-circle' : 'radio-button-unchecked'} size={20} color="#F97316" />
                                    </TouchableOpacity>
                                ))}

                                <TouchableOpacity style={styles.optionalSelect} onPress={toggleDesignAccordionSubHead}>
                                    <Text style={styles.optionalSelectText}>SubHead Selection ({selectedDashSubHead.length})</Text>
                                    <Icon name={isDashSubHeadAccordionOpen ? 'keyboard-arrow-up' : 'keyboard-arrow-down'} size={22} color="#27445A" />
                                </TouchableOpacity>
                                {isDashSubHeadAccordionOpen && displayedDashSubHead.map((item: any) => (
                                    <TouchableOpacity key={item.SHead} style={styles.inlineOption} onPress={() => toggleDashSubHead(item)}>
                                        <Text style={styles.inlineOptionText}>{item.SHName || item.SHead}</Text>
                                        <Icon name={selectedDashSubHead.some((x) => x.SHead === item.SHead) ? 'check-circle' : 'radio-button-unchecked'} size={20} color="#F97316" />
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </ScrollView>

                        <View style={styles.referenceFilterActions}>
                            <TouchableOpacity style={styles.resetButton} onPress={() => {
                                setSelectedDashPrp([]); setSelectedDashParty([]); setSelectedDashSubHead([]);
                                setSearchQuery(''); setSearchQueryParty(''); setSearchQuerySubHead('');
                            }}>
                                <Icon name="refresh" size={22} color="#10283A" />
                                <Text style={styles.resetButtonText}>Reset</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.applyButton} onPress={handleLoadPress}>
                                {isLoading ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Icon name="filter-alt" size={22} color="#FFFFFF" />}
                                <Text style={styles.applyButtonText}>Apply</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                    </SafeAreaView>
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
    safeAreaContainer: {
        flex: 1,
        backgroundColor: '#FBFAF7',
        // Android does not apply the top safe-area inset to the core SafeAreaView.
        // Reserve the status-bar height so the common header never slides underneath it.
        paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : 0,
    },
    drawerContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        // borderTopLeftRadius: 20,
        // borderTopRightRadius: 20,
        overflow: 'hidden',
        height: '100%',
    },
    gradientBackground: {
        flex: 1,
        backgroundColor: '#F8F7F4',
        borderTopLeftRadius: 26,
        borderTopRightRadius: 26,
        overflow: 'hidden',
    },
    filterHeader: {
        minHeight: 76,
        paddingHorizontal: 20,
        paddingVertical: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#10283A',
    },
    filterHeaderTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    filterHeaderTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: '#FFFFFF',
    },
    filterIntro: {
        paddingHorizontal: 18,
        paddingTop: 14,
        paddingBottom: 4,
    },
    filterIntroText: {
        color: '#64748B',
        fontSize: 12,
    },
    closeButton: {
        padding: 8,
        borderRadius: 18,
        backgroundColor: '#FFFFFF',
    },
    stepIndicator: {
        alignItems: 'center',
        marginBottom: 20,
    },
    stepText: {
        color: '#10283A',
        fontSize: 16,
        fontWeight: 'bold',
    },
    formContainer: {
        flex: 1,
        padding: 10,
    },
    inputGroup: {
        marginBottom: 14,
        paddingHorizontal: 18,
        zIndex: 10,
    },
    label: {
        fontSize: 13,
        marginBottom: 7,
        color: '#183247',
        fontWeight: '700',
    },
    dateInput: {
        borderWidth: 1,
        borderColor: '#D8DEE5',
        borderRadius: 10,
        padding: 12,
        backgroundColor: '#FFFFFF',
    },
    dateText: {
        color: '#183247',
    },
    dropdownButton: {
        minHeight: 48,
        borderWidth: 1,
        borderColor: '#D8DEE5',
        borderRadius: 10,
        paddingHorizontal: 13,
        justifyContent: 'space-between',
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
    },
    dropdownText: {
        color: '#183247',
        fontSize: 14,
        fontWeight: '500',
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
        backgroundColor: '#F97316',
        borderRadius: 12,
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
        backgroundColor: '#FFFFFF',
        borderRadius: 10,
        paddingHorizontal: 10,
        marginBottom: 10,
    },
    searchInput: {
        flex: 1,
        padding: 10,
        color: '#183247',
    },
    searchIcon: {
        marginLeft: 10,
    },
    selectedDesignsContainer: {
        flexDirection: 'row',
        marginBottom: 10,
    },
    selectedDesignChip: {
        backgroundColor: '#FFF0E5',
        padding: 8,
        borderRadius: 12,
        marginRight: 5,
    },
    selectedDesignText: {
        color: '#C2410C',
        fontSize: 12,
    },

    designListContainer: {
        maxHeight: 300, // Fixed height for the design list
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 8,
        marginBottom: 10,
    },
    designListContent: {
        paddingBottom: 20,
    },
    designItem: {
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#EEF2F6',
    },
    selectedDesignItem: {
        backgroundColor: '#FFF0E5',
    },
    designName: {
        color: '#183247',
        fontSize: 14,
        fontWeight: '600',
    },
    designCode: {
        color: '#64748B',
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
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#D8DEE5',
        borderRadius: 12,
        marginBottom: 10,
        minHeight: 54,
    },
    accordionHeaderText: {
        color: '#10283A',
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
        backgroundColor: '#FFF0E5',
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
        backgroundColor: '#FFF0E5',
        padding: 8,
        borderRadius: 12,
    },
    dateRangeButton: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 15,
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 8,
        marginBottom: 10,
    },
    dateRangeButtonText: {
        color: '#fff',
        fontSize: 16,
    },
    dateRangeModalContainer: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    dateRangeModalContent: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        padding: 10,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        height: '80%',
    },
    dateRangeOptionsContainer: {
        width: '40%',
        borderRightWidth: 1,
        borderRightColor: '#eee',
        paddingRight: 5,
    },
    dateRangeOptionsScroll: {
        flex: 1,
    },
    dateRangeOptionButton: {
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        backgroundColor: '#f9f9f9',
        borderRadius: 5,
        marginBottom: 5,
    },
    selectedDateRangeOption: {
        backgroundColor: theme.BRAND_GRADIENT_START,
    },
    dateRangeOptionText: {
        color: '#333',
        fontSize: 14,
        textAlign: 'center',
    },
    dateRangeCalendarContainer: {
        flex: 1,
        paddingLeft: 10,
        justifyContent: 'center',
    },
    dateRangeCalendarTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 10,
        color: '#333',
        textAlign: 'center',
    },
    datePickerButton: {
        padding: 15,
        backgroundColor: '#f0f0f0',
        borderRadius: 8,
        marginBottom: 10,
        alignItems: 'center',
    },
    datePickerButtonText: {
        color: '#333',
        fontSize: 16,
    },
    confirmDateRangeButton: {
        backgroundColor: theme.BRAND_GRADIENT_START,
        padding: 15,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 10,
        marginHorizontal: 10,
    },
    confirmDateRangeButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },



    referenceFilterSheet: {
        flex: 1,
        backgroundColor: '#FBFAF7',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        overflow: 'hidden',
    },
    referenceFilterHeader: {
        minHeight: 82,
        paddingHorizontal: 16,
        paddingVertical: 10,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#10283A',
    },
    referenceBackButton: {
        width: 42,
        height: 42,
        borderRadius: 21,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.22)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    commonHeaderTitleBlock: {
        flex: 1,
        justifyContent: 'center',
    },
    commonHeaderSubtitle: {
        color: '#B8C7D8',
        fontSize: 11,
        marginTop: 3,
        fontWeight: '500',
    },
    referenceCloseButton: {
        width: 42,
        height: 42,
        borderRadius: 22,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
    },
    referenceFilterContent: {
        paddingHorizontal: 18,
        paddingTop: 18,
        paddingBottom: 24,
    },
    commonFilterCard: {
        backgroundColor: '#F1F5F9',
        borderRadius: 16,
        padding: 14,
        marginBottom: 18,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    simpleFieldGroup: {
        marginBottom: 14,
        zIndex: 20,
    },
    multiSelectFieldGroup: {
        marginBottom: 10,
        zIndex: 30,
    },
    simpleLabel: {
        fontSize: 13,
        fontWeight: '700',
        color: '#183247',
        marginBottom: 7,
    },
    required: { color: '#EF4444' },
    simpleSelect: {
        minHeight: 48,
        borderWidth: 1,
        borderColor: '#D7DEE6',
        borderRadius: 11,
        paddingHorizontal: 13,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#FFFFFF',
    },
    simpleSelectText: {
        flex: 1,
        color: '#183247',
        fontSize: 14,
        marginRight: 8,
    },
    simpleOptions: {
        marginTop: 5,
        borderWidth: 1,
        borderColor: '#D7DEE6',
        borderRadius: 11,
        backgroundColor: '#FFFFFF',
        overflow: 'hidden',
        elevation: 4,
        shadowColor: '#000',
        shadowOpacity: 0.12,
        shadowRadius: 5,
        shadowOffset: { width: 0, height: 2 },
    },
    simpleOption: {
        paddingHorizontal: 14,
        paddingVertical: 13,
        borderBottomWidth: 1,
        borderBottomColor: '#EEF1F4',
    },
    simpleOptionText: { color: '#183247', fontSize: 14 },
    dateRow: { flexDirection: 'row', gap: 12, marginBottom: 18 },
    dateColumn: { flex: 1 },
    optionalSection: { marginTop: 4 },
    optionalTitle: { color: '#183247', fontSize: 14, fontWeight: '800', marginBottom: 9 },
    optionalSelect: {
        minHeight: 48,
        borderWidth: 1,
        borderColor: '#D7DEE6',
        borderRadius: 11,
        paddingHorizontal: 13,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#FFFFFF',
        marginBottom: 8,
    },
    optionalSelectText: { color: '#183247', fontSize: 13, fontWeight: '600' },
    inlineOption: {
        paddingHorizontal: 14,
        paddingVertical: 11,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#F3F6F8',
        borderBottomWidth: 1,
        borderBottomColor: '#E5EAF0',
    },
    inlineOptionText: { flex: 1, color: '#183247', fontSize: 13, marginRight: 8 },
    multiSelectOptions: {
        marginTop: 5,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#D7DEE6',
        borderRadius: 11,
        overflow: 'hidden',
        backgroundColor: '#FFFFFF',
    },
    noOptionText: { color: '#7B8794', padding: 12 },
    referenceFilterActions: {
        flexDirection: 'row',
        gap: 12,
        padding: 18,
        borderTopWidth: 1,
        borderTopColor: '#ECE7DF',
        backgroundColor: '#FBFAF7',
    },
    resetButton: {
        flex: 1,
        minHeight: 50,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E2D9CE',
        backgroundColor: '#F2EEE8',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    resetButtonText: { color: '#10283A', fontSize: 15, fontWeight: '800' },
    applyButton: {
        flex: 1,
        minHeight: 50,
        borderRadius: 12,
        backgroundColor: '#EA641F',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    applyButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },

});

export default CustomDrawer;
