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
import { LinearGradient } from 'expo-linear-gradient';
import {
    Calendar,
    DateData,
    LocaleConfig
} from 'react-native-calendars';
import {
    format,
    subDays,
    startOfWeek,
    endOfWeek,
    startOfMonth,
    endOfMonth,
    subMonths,
    startOfYear,
    endOfYear,
    subYears,
    isSameDay,
    isBefore,
    isAfter
} from 'date-fns';
import { CustomDrawerProps, CustomDrawerReceiveableProps, DashAccount, DashParty, DashPrp, DashSexe, DashSubHead, DesignData, ItemData, ItemStatus } from './Modal';
import theme from '../../components/theme';


const { height } = Dimensions.get('window');

const CustomDrawer: React.FC<CustomDrawerReceiveableProps> = ({
    isVisible,
    onClose,
    fromDate,
    toDate,
    setFromDate,
    setToDate,
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
    setAccountLoading,
    hideprpGroup
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
    const [hineidePrp, setHidePrp] = useState(false);
    // 
    const [searchQueryItem, setSearchQueryItem] = useState('');
    // const [selectedItems, setSelectedItems] = useState<ItemData[]>([]);
    const [displayedItems, setDisplayedItems] = useState<ItemData[]>([]);
    const [isLoadingMoreItem, setIsLoadingMoreItem] = useState(false);
    const [hasMoreItem, setHasMoreItem] = useState(true);
    // const [fromDate, setFromDate] = useState<Date | null>(null);
    // const [toDate, setToDate] = useState<Date | null>(null);
    const [showDateRangePicker, setShowDateRangePicker] = useState(false);

    const scrollViewRefItem = useRef<ScrollView>(null); 163

    const [isDesignAccordionOpenItem, setIsDesignAccordionOpenItem] = useState(false);
    const [localItemStatus, setLocalItemStatus] = useState<ItemStatus>(selectedItemStatus || 'All');
    // 
    // Add these state variables inside the component
    const [startDate, setStartDate] = useState<Date | null>(null);
    const [endDate, setEndDate] = useState<Date | null>(null);
    const [calendarMarkedDates, setCalendarMarkedDates] = useState<any>({});
    const [dateSelectionMode, setDateSelectionMode] = useState<'start' | 'end'>('start');
    const [currentMonth, setCurrentMonth] = useState(format(new Date(), 'yyyy-MM-dd'));

    const [step, setStep] = useState(1);
    // 
    const isInternalAutoSelected = useRef(false);
    const isPrpgrpAutoSelected = useRef(false);
    const isDashPrpAutoSelected = useRef(false);
    const isDashPartyAutoSelected = useRef(false);
    const isDashSexeAutoSelected = useRef(false);
    const isDashSubHeadAutoSelected = useRef(false);
    const isDashAccountAutoSelected = useRef(false);


    // Configure calendar locale (optional)
    LocaleConfig.locales['en'] = {
        monthNames: [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ],
        monthNamesShort: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
        dayNames: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
        dayNamesShort: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
        today: 'Today'
    };
    LocaleConfig.defaultLocale = 'en';


    const yearOptions = ['2022-2023', '2023-2024', '2024-2025', '2025-2026'];

    console.log("designData:", designData, "itemData:", itemData);

    useEffect(() => {
        if (hideprpGroup) {
            setHidePrp(hideprpGroup);
        }
    }, [hideprpGroup]);

    console.log("hineidePrp:", hineidePrp)

    // useEffect(() => {
    //     if (internal_dropdown.length > 0 && (!selectedInternal || selectedInternal === "")) {
    //         onExeChangeInternal(internal_dropdown[0]);
    //     }
    // }, [internal_dropdown, selectedInternal, onExeChangeInternal]);
    // useEffect(() => {
    //     if (receivables_prpgroup.length > 0 && (!selectedPrpgrp || selectedPrpgrp === "")) {
    //         onExeChangeReceive(receivables_prpgroup[0]);
    //     }
    // }, [receivables_prpgroup, selectedPrpgrp, onExeChangeReceive]);




    // console.log("aaa Formatted From Date:", fromDate ? format(fromDate, 'yyyy-MM-dd') : null);
    // console.log("aaa Formatted To Date:", toDate ? format(toDate, 'yyyy-MM-dd') : null);


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

    // 





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

    const formatDate = (rawDate: Date) => {
        let day = rawDate.getDate().toString().padStart(2, '0');
        let month = (rawDate.getMonth() + 1).toString().padStart(2, '0');
        let year = rawDate.getFullYear();
        return `${day}-${month}-${year}`; // Format: DD-MM-YYYY
    };


    const getCurrentFinancialYear = () => {
        const today = new Date();
        const currentYear = today.getFullYear();
        const currentMonth = today.getMonth() + 1; // Months are 0-indexed

        // FY starts from 1st April
        if (currentMonth >= 4) {
            return `${currentYear}-${currentYear + 1}`;
        } else {
            return `${currentYear - 1}-${currentYear}`;
        }
    };

    const getFinancialYearStartDate = (fyString) => {
        const [startYear, endYear] = fyString.split('-').map(Number);
        return new Date(startYear, 3, 1); // 1st April of startYear
    };

    const getFinancialYearEndDate = (fyString) => {
        const [startYear, endYear] = fyString.split('-').map(Number);
        return new Date(endYear, 2, 31); // 31st March of endYear
    };

    // Add this useEffect to initialize calendar when modal opens
    // Add this useEffect to sync fromDate/toDate with startDate/endDate when modal opens
    useEffect(() => {
        if (showDateRangePicker) {
            if (fromDate && toDate) {
                setStartDate(fromDate);
                setEndDate(toDate);
                updateCalendarMarkings(fromDate, toDate);
                setDateSelectionMode('start');
            }
            if (startDate) {
                setCurrentMonth(format(startDate, 'yyyy-MM-dd'));
            } else if (fromDate) {
                setCurrentMonth(format(fromDate, 'yyyy-MM-dd'));
            } else {
                setCurrentMonth(format(new Date(), 'yyyy-MM-dd'));
            }
        }
    }, [showDateRangePicker]);

    // Update the predefined ranges to use consistent date objects
    const predefinedRanges = [
        { label: "Today", start: new Date(), end: new Date() },
        { label: "Yesterday", start: new Date(new Date().setDate(new Date().getDate() - 1)), end: new Date(new Date().setDate(new Date().getDate() - 1)) },
        {
            label: "This week",
            start: new Date(new Date().setDate(new Date().getDate() - new Date().getDay())),
            end: new Date()
        },
        {
            label: "Last 7 days",
            start: new Date(new Date().setDate(new Date().getDate() - 6)),
            end: new Date()
        },
        {
            label: "Last 30 days",
            start: new Date(new Date().setDate(new Date().getDate() - 29)),
            end: new Date()
        },
        {
            label: "This month",
            start: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
            end: new Date()
        },
        {
            label: "Last month",
            start: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1),
            end: new Date(new Date().getFullYear(), new Date().getMonth(), 0)
        },
        {
            label: "This year",
            start: new Date(new Date().getFullYear(), 0, 1),
            end: new Date()
        },
        {
            label: "Last year",
            start: new Date(new Date().getFullYear() - 1, 0, 1),
            end: new Date(new Date().getFullYear() - 1, 11, 31)
        },
        {
            label: "Current FY",
            start: getFinancialYearStartDate(getCurrentFinancialYear()),
            end: getFinancialYearEndDate(getCurrentFinancialYear())
        },
        {
            label: "Previous FY",
            start: getFinancialYearStartDate(`${Number(getCurrentFinancialYear().split('-')[0]) - 1}-${Number(getCurrentFinancialYear().split('-')[0])}`),
            end: getFinancialYearEndDate(`${Number(getCurrentFinancialYear().split('-')[0]) - 1}-${Number(getCurrentFinancialYear().split('-')[0])}`)
        },
    ];

    // Add helper functions
    const formatDateToYYYYMMDD = (date: Date): string => {
        return format(date, 'yyyy-MM-dd');
    };

    const formatDateToDisplay = (date: Date | null): string => {
        if (!date) return 'Select Date';
        return format(date, 'dd MMM yyyy');
    };

    const formatRangeToDisplay = (start: Date | null, end: Date | null): string => {
        if (!start && !end) return 'Select Date Range';
        if (start && !end) return `${formatDateToDisplay(start)} - Select End Date`;
        if (!start && end) return `Select Start Date - ${formatDateToDisplay(end)}`;
        return `${formatDateToDisplay(start)} - ${formatDateToDisplay(end)}`;
    };

    // Handle date selection
    const handleDateSelect = (day: DateData) => {
        const selectedDate = new Date(day.dateString);

        if (dateSelectionMode === 'start') {
            // Clear previous selection if start date is after end date
            if (endDate && isAfter(selectedDate, endDate)) {
                setStartDate(selectedDate);
                setEndDate(null);
            } else {
                setStartDate(selectedDate);
            }
            setDateSelectionMode('end');
            updateCalendarMarkings(selectedDate, endDate);
        } else {
            // End date selection
            if (startDate && isBefore(selectedDate, startDate)) {
                // If selected end date is before start date, swap them
                setEndDate(startDate);
                setStartDate(selectedDate);
            } else {
                setEndDate(selectedDate);
            }
            setDateSelectionMode('start');
            updateCalendarMarkings(startDate, selectedDate);
        }
    };

    // Update calendar markings based on selected dates
    const updateCalendarMarkings = (start: Date | null, end: Date | null) => {
        const markings: any = {};

        if (start && end && !isSameDay(start, end)) {
            // Mark range
            let currentDate = new Date(start);
            while (currentDate <= end) {
                const dateStr = formatDateToYYYYMMDD(currentDate);
                if (isSameDay(currentDate, start)) {
                    markings[dateStr] = {
                        startingDay: true,
                        color: theme.BRAND_GRADIENT_START,
                        textColor: '#ffffff',
                        customStyles: {
                            container: { backgroundColor: theme.BRAND_GRADIENT_START },
                            text: { color: '#ffffff' }
                        }
                    };
                } else if (isSameDay(currentDate, end)) {
                    markings[dateStr] = {
                        endingDay: true,
                        color: theme.BRAND_GRADIENT_START,
                        textColor: '#ffffff',
                        customStyles: {
                            container: { backgroundColor: theme.BRAND_GRADIENT_START },
                            text: { color: '#ffffff' }
                        }
                    };
                } else {
                    markings[dateStr] = {
                        color: theme.BRAND_GRADIENT_START + '80',
                        textColor: '#ffffff',
                        customStyles: {
                            container: { backgroundColor: theme.BRAND_GRADIENT_START + '80' },
                            text: { color: '#ffffff' }
                        }
                    };
                }
                currentDate.setDate(currentDate.getDate() + 1);
            }
        } else if (start && !end) {
            // Single date selection
            const dateStr = formatDateToYYYYMMDD(start);
            markings[dateStr] = {
                selected: true,
                selectedColor: theme.BRAND_GRADIENT_START,
                customStyles: {
                    container: { backgroundColor: theme.BRAND_GRADIENT_START },
                    text: { color: '#ffffff' }
                }
            };
        }

        setCalendarMarkedDates(markings);
    };

    // Handle predefined date ranges
    const handlePredefinedRange = (range: { start: Date; end: Date; label: string }) => {
        setStartDate(range.start);
        setEndDate(range.end);
        setFromDate(range.start);  // Add this to update fromDate
        setToDate(range.end);      // Add this to update toDate
        updateCalendarMarkings(range.start, range.end);
        setDateSelectionMode('start');

        // Auto-apply the range after selection
        if (onFromDateChange && onToDateChange) {
            onFromDateChange(range.start);
            onToDateChange(range.end);
        }
        // setShowDateRangePicker(false);
    };

    // Apply selected date range
    const applyDateRange = () => {
        if (startDate && endDate) {
            // Validate date range
            if (isBefore(endDate, startDate)) {
                // Show error or swap dates
                alert('End date cannot be before start date');
                return;
            }

            setFromDate(startDate);  // Add this
            setToDate(endDate);      // Add this

            onFromDateChange(startDate);
            onToDateChange(endDate);
            setShowDateRangePicker(false);
        } else if (startDate && !endDate) {
            alert('Please select both start and end dates');
        } else if (!startDate && endDate) {
            alert('Please select both start and end dates');
        } else {
            alert('Please select a date range');
        }
    };

    // Clear selected dates
    const clearDateRange = () => {
        setStartDate(null);
        setEndDate(null);
        setFromDate(null);   // Add this
        setToDate(null);     // Add this
        setCalendarMarkedDates({});
        setDateSelectionMode('start');
        onFromDateChange(null);
        onToDateChange(null);
        // setShowDateRangePicker(false);
    };

    // console.log("aaa Sending to parent - From Date:", fromDate);
    // console.log("aaa Sending to parent - To Date:", toDate);
    // console.log("aaa Formatted From Date:", fromDate ? format(fromDate, 'yyyy-MM-dd') : null);
    // console.log("aaa Formatted To Date:", toDate ? format(toDate, 'yyyy-MM-dd') : null);

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

                            {/* Internal Dropdown */}
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

                            {/* Property Group Dropdown */}
                            {hineidePrp === false ? (<>
                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>Sales Property Group</Text>
                                    <TouchableOpacity
                                        style={styles.dropdownButton}
                                        onPress={() => setIsExeDropdownOpen(!isExeDropdownOpen)}
                                    >
                                        <Text style={styles.dropdownText}>{selectedPrpgrp}</Text>
                                    </TouchableOpacity>
                                    {isExeDropdownOpen && (
                                        <View style={styles.dropdownOptionsContainer}>
                                            <ScrollView nestedScrollEnabled style={{ maxHeight: 150 }}>
                                                <TouchableOpacity
                                                    style={styles.dropdownOption}
                                                    onPress={() => {
                                                        onExeChangeReceive(null); // Send empty value
                                                        setIsExeDropdownOpen(false);
                                                    }}
                                                >
                                                    <Text style={styles.dropdownOptionText}>Select Property Group</Text>
                                                </TouchableOpacity>
                                                {receivables_prpgroup.map((exe) => (
                                                    <TouchableOpacity
                                                        key={exe.PrpTypeCode}
                                                        style={[
                                                            styles.dropdownOption,
                                                            selectedPrpgrp === exe.PrpTypeOf && styles.selectedOption,
                                                        ]}
                                                        onPress={() => {
                                                            onExeChangeReceive(exe);
                                                            setIsExeDropdownOpen(false);
                                                        }}
                                                    >
                                                        <Text style={styles.dropdownOptionText}>{exe.PrpTypeOf}</Text>
                                                    </TouchableOpacity>
                                                ))}
                                            </ScrollView>
                                        </View>
                                    )}

                                </View></>) : (<></>)}
                            {/* <View style={styles.inputGroup}>
                                <Text style={styles.label}>Sales Property Group</Text>
                                <TouchableOpacity
                                    style={styles.dropdownButton}
                                    onPress={() => setIsExeDropdownOpen(!isExeDropdownOpen)}
                                >
                                    <Text style={styles.dropdownText}>{selectedPrpgrp}</Text>
                                </TouchableOpacity>
                                {isExeDropdownOpen && (
                                    <View style={styles.dropdownOptionsContainer}>
                                        <ScrollView nestedScrollEnabled style={{ maxHeight: 150 }}>
                                            <TouchableOpacity
                                                style={styles.dropdownOption}
                                                onPress={() => {
                                                    onExeChangeReceive(null); // Send empty value
                                                    setIsExeDropdownOpen(false);
                                                }}
                                            >
                                                <Text style={styles.dropdownOptionText}>Select Property Group</Text>
                                            </TouchableOpacity>
                                            {receivables_prpgroup.map((exe) => (
                                                <TouchableOpacity
                                                    key={exe.PrpTypeCode}
                                                    style={[
                                                        styles.dropdownOption,
                                                        selectedPrpgrp === exe.PrpTypeOf && styles.selectedOption,
                                                    ]}
                                                    onPress={() => {
                                                        onExeChangeReceive(exe);
                                                        setIsExeDropdownOpen(false);
                                                    }}
                                                >
                                                    <Text style={styles.dropdownOptionText}>{exe.PrpTypeOf}</Text>
                                                </TouchableOpacity>
                                            ))}
                                        </ScrollView>
                                    </View>
                                )}

                            </View> */}


                            {/* Accordion for Design Selection */}
                            {getdashPropertyLoading ? (<>
                                <TouchableOpacity
                                    style={styles.accordionHeader}
                                // onPress={toggleDesignAccordion}
                                >
                                    <Text style={styles.accordionHeaderText}>
                                        {'Loading...'}
                                    </Text>
                                    {/* <Icon
                                        name={isDashPrpAccordionOpen ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
                                        size={24}
                                        color="#fff"
                                    /> */}

                                    <ActivityIndicator size={24} color="#fff" />
                                </TouchableOpacity></>) : (<>
                                    <TouchableOpacity
                                        style={styles.accordionHeader}
                                        onPress={toggleDesignAccordion}
                                    >
                                        <Text style={styles.accordionHeaderText}>
                                            {isDashPrpAccordionOpen ? `Hide Property: (${selectedDashPrp.length})` : `Select Property: (${selectedDashPrp.length})`}
                                        </Text>
                                        <Icon
                                            name={isDashPrpAccordionOpen ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
                                            size={24}
                                            color="#fff"
                                        />
                                    </TouchableOpacity></>)}


                            {isDashPrpAccordionOpen && (
                                <>
                                    {/* Search Bar */}
                                    <View style={styles.searchContainer}>
                                        <TextInput
                                            style={styles.searchInput}
                                            placeholder="Search Property..."
                                            placeholderTextColor="#ccc"
                                            value={searchQuery}
                                            onChangeText={setSearchQuery}
                                        />
                                        <Icon name="search" size={24} color="#fff" style={styles.searchIcon} />
                                    </View>
                                    {/* Select All & Remove All Buttons */}
                                    <View style={styles.selectAllContainer}>
                                        <TouchableOpacity
                                            style={styles.selectAllButton}
                                            onPress={() => {
                                                const filtered = getdashPrp.filter(
                                                    (prp) =>
                                                        prp.PrpCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                                        prp.PrpName.toLowerCase().includes(searchQuery.toLowerCase())
                                                );
                                                setSelectedDashPrp(filtered);
                                            }}
                                        >
                                            <Text style={styles.selectAllButtonText}>Select All</Text>
                                        </TouchableOpacity>
                                        {selectedDashPrp.length > 0 && (
                                            <TouchableOpacity
                                                style={styles.removeAllButton}
                                                onPress={removeAllSelected}
                                            >
                                                <Icon name="close" size={20} color="#fff" />
                                            </TouchableOpacity>
                                        )}
                                    </View>

                                    {/* Selected Designs (Chips) */}
                                    <ScrollView horizontal style={styles.selectedDesignsContainer}>
                                        {selectedDashPrp.map((prp) => (
                                            <View key={prp.PrpCode} style={styles.selectedDesignChip}>
                                                <Text style={styles.selectedDesignText}>
                                                    {/* {prp.PrpName} ({prp.PrpCode}) */}
                                                    {prp.PrpName}
                                                </Text>
                                            </View>
                                        ))}

                                    </ScrollView>

                                    {/* Design List (with Lazy Loading) */}
                                    <ScrollView
                                        ref={scrollViewRef}
                                        style={styles.designListContainer}
                                        contentContainerStyle={styles.designListContent}
                                        nestedScrollEnabled={true} // Enable nested scrolling
                                        onScroll={({ nativeEvent }) => {
                                            const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
                                            const paddingToBottom = 20;
                                            if (
                                                layoutMeasurement.height + contentOffset.y >=
                                                contentSize.height - paddingToBottom
                                            ) {
                                                loadMorePrpGrp();
                                            }
                                        }}
                                        scrollEventThrottle={16}
                                    >
                                        {displayedDashPrp.map((prp) => (
                                            <TouchableOpacity
                                                key={prp.PrpCode}
                                                style={[
                                                    styles.designItem,
                                                    selectedDashPrp.some((d) => d.PrpCode === prp.PrpCode) &&
                                                    styles.selectedDesignItem,
                                                ]}
                                                onPress={() => toggleDashPrp(prp)}
                                            >
                                                <Text style={styles.designName}>{prp.PrpName}</Text>
                                                {/* <Text style={styles.designCode}>{prp.PrpCode}</Text> */}
                                            </TouchableOpacity>
                                        ))}
                                        {isLoadingMorePrpGrp && (
                                            <ActivityIndicator
                                                size="small"
                                                color="#fff"
                                                style={styles.loadingIndicator}
                                            />
                                        )}
                                    </ScrollView>

                                </>
                            )}

                            {/* Accordion for Party Selection */}
                            {getdashPartyLoading ? (<>
                                <TouchableOpacity
                                    style={styles.accordionHeader}
                                // onPress={toggleDesignAccordion}
                                >
                                    <Text style={styles.accordionHeaderText}>
                                        {'Loading...'}
                                    </Text>
                                    {/* <Icon
                                        name={isDashPrpAccordionOpen ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
                                        size={24}
                                        color="#fff"
                                    /> */}

                                    <ActivityIndicator size={24} color="#fff" />
                                </TouchableOpacity></>) : (<><TouchableOpacity
                                    style={styles.accordionHeader}
                                    onPress={toggleDesignAccordionParty}
                                >
                                    <Text style={styles.accordionHeaderText}>
                                        {isDashPartyAccordionOpen ? `Hide Party: (${selectedDashParty.length})` : `Select Party: (${selectedDashParty.length})`}
                                    </Text>
                                    <Icon
                                        name={isDashPartyAccordionOpen ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
                                        size={24}
                                        color="#fff"
                                    />
                                </TouchableOpacity></>)}



                            {isDashPartyAccordionOpen && (
                                <>
                                    {/* Search Bar */}
                                    <View style={styles.searchContainer}>
                                        <TextInput
                                            style={styles.searchInput}
                                            placeholder="Search Party..."
                                            placeholderTextColor="#ccc"
                                            value={searchQueryParty}
                                            onChangeText={setSearchQueryParty}
                                        />
                                        <Icon name="search" size={24} color="#fff" style={styles.searchIcon} />
                                    </View>

                                    {/* Remove "Select All" button and keep only "Remove All" if needed */}
                                    <View style={styles.selectAllContainer}>
                                        {selectedDashParty.length > 0 && (
                                            <TouchableOpacity
                                                style={styles.removeAllButton}
                                                onPress={removeAllSelectedParty}
                                            >
                                                <Icon name="close" size={20} color="#fff" />
                                            </TouchableOpacity>
                                        )}
                                    </View>

                                    {/* Selected Party (Chip) */}
                                    <ScrollView horizontal style={styles.selectedDesignsContainer}>
                                        {selectedDashParty.map((party) => (
                                            <View key={party.acccode} style={styles.selectedDesignChip}>
                                                <Text style={styles.selectedDesignText}>
                                                    {party.accname} ({party.acccode})
                                                </Text>
                                            </View>
                                        ))}
                                    </ScrollView>

                                    {/* Party List (with Lazy Loading) */}
                                    <ScrollView
                                        ref={scrollViewRefParty}
                                        style={styles.designListContainer}
                                        contentContainerStyle={styles.designListContent}
                                        nestedScrollEnabled={true}
                                        onScroll={({ nativeEvent }) => {
                                            const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
                                            const paddingToBottom = 20;
                                            if (
                                                layoutMeasurement.height + contentOffset.y >=
                                                contentSize.height - paddingToBottom
                                            ) {
                                                loadMoreParty();
                                            }
                                        }}
                                        scrollEventThrottle={16}
                                    >
                                        {displayedDashParty.map((party) => (
                                            <TouchableOpacity
                                                key={party.acccode}
                                                style={[
                                                    styles.designItem,
                                                    selectedDashParty.some((d) => d.acccode === party.acccode) &&
                                                    styles.selectedDesignItem,
                                                ]}
                                                onPress={() => toggleDashParty(party)} // Updated to single select
                                            >
                                                <Text style={styles.designName}>{party.accname}</Text>
                                                <Text style={styles.designCode}>{party.acccode}</Text>
                                            </TouchableOpacity>
                                        ))}
                                        {isLoadingMoreParty && (
                                            <ActivityIndicator
                                                size="small"
                                                color="#fff"
                                                style={styles.loadingIndicator}
                                            />
                                        )}
                                    </ScrollView>
                                </>
                            )}


                            {/* Accordion for SubHead Selection */}
                            {getdashSubHeadLoading ? (
                                <><TouchableOpacity
                                    style={styles.accordionHeader}
                                // onPress={toggleDesignAccordion}
                                >
                                    <Text style={styles.accordionHeaderText}>
                                        {'Loading...'}
                                    </Text>
                                    {/* <Icon
                                        name={isDashPrpAccordionOpen ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
                                        size={24}
                                        color="#fff"
                                    /> */}

                                    <ActivityIndicator size={24} color="#fff" />
                                </TouchableOpacity>
                                </>) : (
                                <><TouchableOpacity
                                    style={styles.accordionHeader}
                                    onPress={toggleDesignAccordionSubHead}
                                >
                                    <Text style={styles.accordionHeaderText}>
                                        {isDashSubHeadAccordionOpen ? `Hide SubHead: (${selectedDashSubHead.length})` : `Select SubHead: (${selectedDashSubHead.length})`}
                                    </Text>
                                    <Icon
                                        name={isDashSubHeadAccordionOpen ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
                                        size={24}
                                        color="#fff"
                                    />
                                </TouchableOpacity></>)}


                            {isDashSubHeadAccordionOpen && (
                                <>
                                    {/* Search Bar */}
                                    <View style={styles.searchContainer}>
                                        <TextInput
                                            style={styles.searchInput}
                                            placeholder="Search SubHead..."
                                            placeholderTextColor="#ccc"
                                            value={searchQuerySubHead}
                                            onChangeText={setSearchQuerySubHead}
                                        />
                                        <Icon name="search" size={24} color="#fff" style={styles.searchIcon} />
                                    </View>
                                    {/* Select All & Remove All Buttons */}
                                    <View style={styles.selectAllContainer}>
                                        <TouchableOpacity
                                            style={styles.selectAllButton}
                                            onPress={() => {
                                                const filtered12 = getdashSubHead.filter(
                                                    (sub) =>
                                                        sub.SHName.toLowerCase().includes(searchQuerySubHead.toLowerCase()) ||
                                                        sub.SHead.toLowerCase().includes(searchQuerySubHead.toLowerCase())
                                                );
                                                setSelectedDashSubHead(filtered12);
                                            }}
                                        >
                                            <Text style={styles.selectAllButtonText}>Select All</Text>
                                        </TouchableOpacity>
                                        {selectedDashSubHead.length > 0 && (
                                            <TouchableOpacity
                                                style={styles.removeAllButton}
                                                onPress={removeAllSelectedSubHead}
                                            >
                                                <Icon name="close" size={20} color="#fff" />
                                            </TouchableOpacity>
                                        )}
                                    </View>

                                    {/* Selected Designs (Chips) */}
                                    <ScrollView horizontal style={styles.selectedDesignsContainer}>
                                        {selectedDashSubHead.map((sub) => (
                                            <View key={sub.SHead} style={styles.selectedDesignChip}>
                                                <Text style={styles.selectedDesignText}>
                                                    {sub.SHName} ({sub.SHead})
                                                    {/* {party.accname} */}
                                                </Text>
                                            </View>
                                        ))}

                                    </ScrollView>

                                    {/* Design List (with Lazy Loading) */}
                                    <ScrollView
                                        ref={scrollViewRefSubHead}
                                        style={styles.designListContainer}
                                        contentContainerStyle={styles.designListContent}
                                        nestedScrollEnabled={true} // Enable nested scrolling
                                        onScroll={({ nativeEvent }) => {
                                            const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
                                            const paddingToBottom = 20;
                                            if (
                                                layoutMeasurement.height + contentOffset.y >=
                                                contentSize.height - paddingToBottom
                                            ) {
                                                loadMoreSubHead();
                                            }
                                        }}
                                        scrollEventThrottle={16}
                                    >
                                        {displayedDashSubHead.map((sub) => (
                                            <TouchableOpacity
                                                key={sub.SHead}
                                                style={[
                                                    styles.designItem,
                                                    selectedDashSubHead.some((d) => d.SHead === sub.SHead) &&
                                                    styles.selectedDesignItem,
                                                ]}
                                                onPress={() => toggleDashSubHead(sub)}
                                            >
                                                <Text style={styles.designName}>{sub.SHName}</Text>
                                                <Text style={styles.designCode}>{sub.SHead}</Text>
                                            </TouchableOpacity>
                                        ))}
                                        {isLoadingMoreSubHead && (
                                            <ActivityIndicator
                                                size="small"
                                                color="#fff"
                                                style={styles.loadingIndicator}
                                            />
                                        )}
                                    </ScrollView>

                                </>
                            )}

                            {/* Accordion for Sexe Selection */}
                            {getdashSexeLoading ? (<>
                                <TouchableOpacity
                                    style={styles.accordionHeader}
                                // onPress={toggleDesignAccordion}
                                >
                                    <Text style={styles.accordionHeaderText}>
                                        {'Loading...'}
                                    </Text>
                                    {/* <Icon
                                        name={isDashPrpAccordionOpen ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
                                        size={24}
                                        color="#fff"
                                    /> */}

                                    <ActivityIndicator size={24} color="#fff" />
                                </TouchableOpacity></>) : (
                                <>
                                    <TouchableOpacity
                                        style={styles.accordionHeader}
                                        onPress={toggleDesignAccordionSexe}
                                    >
                                        <Text style={styles.accordionHeaderText}>
                                            {isDashSexeAccordionOpen ? `Hide Sales Executive : (${selectedDashSexe.length})` : `Select Sales Executive: (${selectedDashSexe.length})`}
                                        </Text>
                                        <Icon
                                            name={isDashSexeAccordionOpen ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
                                            size={24}
                                            color="#fff"
                                        />
                                    </TouchableOpacity></>)}


                            {isDashSexeAccordionOpen && (
                                <>

                                    <View style={styles.searchContainer}>
                                        <TextInput
                                            style={styles.searchInput}
                                            placeholder="Search Sales Executive..."
                                            placeholderTextColor="#ccc"
                                            value={searchQuerySexe}
                                            onChangeText={setSearchQuerySexe}
                                        />
                                        <Icon name="search" size={24} color="#fff" style={styles.searchIcon} />
                                    </View>

                                    <View style={styles.selectAllContainer}>
                                        <TouchableOpacity
                                            style={styles.selectAllButton}
                                            onPress={() => {
                                                const filtered12 = getdashSexe.filter(
                                                    (sexe) =>
                                                        sexe.Code.toLowerCase().includes(searchQuerySexe.toLowerCase()) ||
                                                        sexe.SalesExecutive.toLowerCase().includes(searchQuerySexe.toLowerCase())
                                                );
                                                setSelectedDashSexe(filtered12);
                                            }}
                                        >
                                            <Text style={styles.selectAllButtonText}>Select All</Text>
                                        </TouchableOpacity>
                                        {selectedDashSexe.length > 0 && (
                                            <TouchableOpacity
                                                style={styles.removeAllButton}
                                                onPress={removeAllSelectedSexe}
                                            >
                                                <Icon name="close" size={20} color="#fff" />
                                            </TouchableOpacity>
                                        )}
                                    </View>


                                    <ScrollView horizontal style={styles.selectedDesignsContainer}>
                                        {selectedDashSexe.map((sexe) => (
                                            <View key={sexe.Code} style={styles.selectedDesignChip}>
                                                <Text style={styles.selectedDesignText}>
                                                    {sexe.SalesExecutive} ({sexe.Code})

                                                </Text>
                                            </View>
                                        ))}

                                    </ScrollView>


                                    <ScrollView
                                        ref={scrollViewRefSexe}
                                        style={styles.designListContainer}
                                        contentContainerStyle={styles.designListContent}
                                        nestedScrollEnabled={true} // Enable nested scrolling
                                        onScroll={({ nativeEvent }) => {
                                            const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
                                            const paddingToBottom = 20;
                                            if (
                                                layoutMeasurement.height + contentOffset.y >=
                                                contentSize.height - paddingToBottom
                                            ) {
                                                loadMoreSexe();
                                            }
                                        }}
                                        scrollEventThrottle={16}
                                    >
                                        {displayedDashSexe.map((sexe) => (
                                            <TouchableOpacity
                                                key={sexe.Code}
                                                style={[
                                                    styles.designItem,
                                                    selectedDashSexe.some((d) => d.Code === sexe.Code) &&
                                                    styles.selectedDesignItem,
                                                ]}
                                                onPress={() => toggleDashSexe(sexe)}
                                            >
                                                <Text style={styles.designName}>{sexe.SalesExecutive}</Text>
                                                <Text style={styles.designCode}>{sexe.Code}</Text>
                                            </TouchableOpacity>
                                        ))}
                                        {isLoadingMoreSexe && (
                                            <ActivityIndicator
                                                size="small"
                                                color="#fff"
                                                style={styles.loadingIndicator}
                                            />
                                        )}

                                    </ScrollView>

                                </>
                            )}

                            {/*------------------------------------------------------------ DATE------------------------------------------------------- */}

                            {/* Date Range Picker Button (Below Sales Executive Dropdown) */}
                            {/* <TouchableOpacity
                                style={styles.dateRangeButton}
                                onPress={() => setShowDateRangePicker(true)}
                            >
                                <Text style={styles.dateRangeButtonText}>
                                    {fromDate && toDate
                                        ? `${formatDate(fromDate)} ~ ${formatDate(toDate)}`
                                        : "Select Date Range"}
                                </Text>
                                <Icon name="calendar-today" size={20} color="#fff" />
                            </TouchableOpacity>


                            <Modal
                                visible={showDateRangePicker}
                                transparent={true}
                                animationType="slide"
                                onRequestClose={() => setShowDateRangePicker(false)}
                            >
                                <View style={stylesEnhanced.modalOverlay}>
                                    <View style={stylesEnhanced.modalContainer}>
                                       
                                        <View style={stylesEnhanced.modalHeader}>
                                            <TouchableOpacity onPress={() => setShowDateRangePicker(false)}>
                                                <Icon name="close" size={24} color="#666" />
                                            </TouchableOpacity>
                                            <Text style={stylesEnhanced.modalTitle}>Select Date Range</Text>
                                            <TouchableOpacity onPress={clearDateRange}>
                                                <Text style={stylesEnhanced.clearButton}>Clear</Text>
                                            </TouchableOpacity>
                                        </View>


                                        <View style={stylesEnhanced.rangeDisplay}>
                                            <View style={stylesEnhanced.rangeDisplayItem}>
                                                <Text style={stylesEnhanced.rangeLabel}>Start Date</Text>
                                                <Text style={stylesEnhanced.rangeValue}>
                                                    {formatDateToDisplay(startDate)}
                                                </Text>
                                            </View>
                                            <Icon name="arrow-forward" size={20} color="#999" />
                                            <View style={stylesEnhanced.rangeDisplayItem}>
                                                <Text style={stylesEnhanced.rangeLabel}>End Date</Text>
                                                <Text style={stylesEnhanced.rangeValue}>
                                                    {formatDateToDisplay(endDate)}
                                                </Text>
                                            </View>
                                        </View>


                                        <ScrollView
                                            horizontal
                                            showsHorizontalScrollIndicator={false}
                                            style={stylesEnhanced.predefinedRangesContainer}
                                            contentContainerStyle={stylesEnhanced.predefinedRangesContent}
                                        >
                                            {predefinedRanges.map((range, index) => (
                                                <TouchableOpacity
                                                    key={index}
                                                    style={[
                                                        stylesEnhanced.predefinedButton,
                                                        startDate && endDate &&
                                                        isSameDay(startDate, range.start) &&
                                                        isSameDay(endDate, range.end) &&
                                                        stylesEnhanced.predefinedButtonActive
                                                    ]}
                                                    onPress={() => handlePredefinedRange(range)}
                                                >
                                                    <Text style={[
                                                        stylesEnhanced.predefinedButtonText,
                                                        startDate && endDate &&
                                                        isSameDay(startDate, range.start) &&
                                                        isSameDay(endDate, range.end) &&
                                                        stylesEnhanced.predefinedButtonTextActive
                                                    ]}>
                                                        {range.label}
                                                    </Text>
                                                </TouchableOpacity>
                                            ))}
                                        </ScrollView>


                                        <View style={stylesEnhanced.calendarContainer}>
                                            <Calendar
                                                current={currentMonth}
                                                onMonthChange={(month: DateData) => setCurrentMonth(month.dateString)}
                                                onDayPress={handleDateSelect}
                                                markedDates={calendarMarkedDates}
                                                markingType={'period'}
                                                style={stylesEnhanced.calendar}
                                                theme={{
                                                    backgroundColor: '#ffffff',
                                                    calendarBackground: '#ffffff',
                                                    textSectionTitleColor: '#6c757d',
                                                    textSectionTitleDisabledColor: '#d9e1e8',
                                                    selectedDayBackgroundColor: theme.BRAND_GRADIENT_START,
                                                    selectedDayTextColor: '#ffffff',
                                                    todayTextColor: theme.BRAND_GRADIENT_START,
                                                    dayTextColor: '#2d4150',
                                                    textDisabledColor: '#d9e1e8',
                                                    dotColor: '#00adf5',
                                                    selectedDotColor: '#ffffff',
                                                    arrowColor: theme.BRAND_GRADIENT_START,
                                                    disabledArrowColor: '#d9e1e8',
                                                    monthTextColor: '#212529',
                                                    indicatorColor: theme.BRAND_GRADIENT_START,
                                                    textDayFontWeight: '400',
                                                    textMonthFontWeight: 'bold',
                                                    textDayHeaderFontWeight: '600',
                                                    textDayFontSize: 14,
                                                    textMonthFontSize: 16,
                                                    textDayHeaderFontSize: 12,
                                                }}
                                                enableSwipeMonths={true}
                                                firstDay={1}
                                                hideExtraDays={false}
                                                showWeekNumbers={false}
                                            />
                                        </View>


                                        <View style={stylesEnhanced.actionButtons}>
                                            <TouchableOpacity
                                                style={stylesEnhanced.cancelButton}
                                                onPress={() => setShowDateRangePicker(false)}
                                            >
                                                <Text style={stylesEnhanced.cancelButtonText}>Cancel</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                style={stylesEnhanced.applyButton}
                                                onPress={applyDateRange}
                                            >
                                                <Text style={stylesEnhanced.applyButtonText}>Apply Range</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                </View>
                            </Modal>

                            {showFromDatePicker && (
                                <DateTimePicker
                                    value={fromDate || new Date()}
                                    mode="date"
                                    display="default"
                                    onChange={(event, selectedDate) => {
                                        setShowFromDatePicker(false);
                                        if (selectedDate) {
                                            setFromDate(selectedDate);
                                            setShowDateRangePicker(true);
                                        }
                                    }}
                                />
                            )}


                            {showToDatePicker && (
                                <DateTimePicker
                                    value={toDate || new Date()}
                                    mode="date"
                                    display="default"
                                    onChange={(event, selectedDate) => {
                                        setShowToDatePicker(false);
                                        if (selectedDate) {
                                            setToDate(selectedDate);
                                            setShowDateRangePicker(true);
                                        }
                                    }}
                                />
                            )} */}

                            {/*------------------------------------------------------------ DATE------------------------------------------------------- */}

                        </ScrollView>

                        {/* <>
                                {(getdashAccount && getdashAccount.length > 0) ? (
                                    <>
                                        {getdashAccountLoading ? (<>
                                            <TouchableOpacity
                                                style={styles.accordionHeader}
                                            // onPress={toggleDesignAccordion}
                                            >
                                                <Text style={styles.accordionHeaderText}>
                                                    {'Loading...'}
                                                </Text>
                                               

                                                <ActivityIndicator size={24} color="#fff" />
                                            </TouchableOpacity></>) : (
                                            <>
                                                <TouchableOpacity
                                                    style={styles.accordionHeader}
                                                    onPress={toggleDesignAccordionAccount}
                                                >
                                                    <Text style={styles.accordionHeaderText}>
                                                        {isDashAccountAccordionOpen ? `Hide Account : (${selectedDashAccount.length})` : `Select Account: (${selectedDashAccount.length})`}
                                                    </Text>
                                                    <Icon
                                                        name={isDashAccountAccordionOpen ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
                                                        size={24}
                                                        color="#fff"
                                                    />
                                                </TouchableOpacity></>)}


                                        {isDashAccountAccordionOpen && (
                                            <>
                                               
                                                <View style={styles.searchContainer}>
                                                    <TextInput
                                                        style={styles.searchInput}
                                                        placeholder="Search Sales Executive..."
                                                        placeholderTextColor="#ccc"
                                                        value={searchQueryAccount}
                                                        onChangeText={setSearchQueryAccount}
                                                    />
                                                    <Icon name="search" size={24} color="#fff" style={styles.searchIcon} />
                                                </View>
                                          
                                                <View style={styles.selectAllContainer}>
                                                    <TouchableOpacity
                                                        style={styles.selectAllButton}
                                                        onPress={() => {
                                                            const filtered12 = getdashAccount.filter(
                                                                (acc) =>
                                                                    acc.AccCode.toLowerCase().includes(searchQueryAccount.toLowerCase()) ||
                                                                    acc.AccName.toLowerCase().includes(searchQueryAccount.toLowerCase())
                                                            );
                                                            setSelectedDashAccount(filtered12);
                                                        }}
                                                    >
                                                        <Text style={styles.selectAllButtonText}>Select All</Text>
                                                    </TouchableOpacity>
                                                    {selectedDashAccount.length > 0 && (
                                                        <TouchableOpacity
                                                            style={styles.removeAllButton}
                                                            onPress={removeAllSelectedAccount}
                                                        >
                                                            <Icon name="close" size={20} color="#fff" />
                                                        </TouchableOpacity>
                                                    )}
                                                </View>

                                               
                                                <ScrollView horizontal style={styles.selectedDesignsContainer}>
                                                    {selectedDashAccount.map((acc) => (
                                                        <View key={acc.AccCode} style={styles.selectedDesignChip}>
                                                            <Text style={styles.selectedDesignText}>
                                                                {acc.AccName} ({acc.AccCode})
                                                            
                                                            </Text>
                                                        </View>
                                                    ))}

                                                </ScrollView>

                                               
                                                <ScrollView
                                                    ref={scrollViewRefAccount}
                                                    style={styles.designListContainer}
                                                    contentContainerStyle={styles.designListContent}
                                                    nestedScrollEnabled={true} // Enable nested scrolling
                                                    onScroll={({ nativeEvent }) => {
                                                        const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
                                                        const paddingToBottom = 20;
                                                        if (
                                                            layoutMeasurement.height + contentOffset.y >=
                                                            contentSize.height - paddingToBottom
                                                        ) {
                                                            loadMoreAccount();
                                                        }
                                                    }}
                                                    scrollEventThrottle={16}
                                                >
                                                    {displayedDashAccount.map((acc) => (
                                                        <TouchableOpacity
                                                            key={acc.AccCode}
                                                            style={[
                                                                styles.designItem,
                                                                selectedDashAccount.some((d) => d.AccCode === acc.AccCode) &&
                                                                styles.selectedDesignItem,
                                                            ]}
                                                            onPress={() => toggleDashAccount(acc)}
                                                        >
                                                            <Text style={styles.designName}>{acc.AccName}</Text>
                                                            <Text style={styles.designCode}>{acc.AccCode}</Text>
                                                        </TouchableOpacity>
                                                    ))}
                                                    {isLoadingMoreAccount && (
                                                        <ActivityIndicator
                                                            size="small"
                                                            color="#fff"
                                                            style={styles.loadingIndicator}
                                                        />
                                                    )}
                                                </ScrollView>

                                            </>
                                        )}</>
                                ) : (<>
                                    <TouchableOpacity
                                        style={styles.accordionHeader}
                                        onPress={handleLoadPressAccount}
                                        disabled={getAccountLoading}
                                    >
                                        <Text style={styles.accordionHeaderText}>
                                            {getAccountLoading ? 'Loading...' : 'Load Account'}
                                        </Text>
                                        {getAccountLoading ? (
                                            <>
                                                <ActivityIndicator
                                                    size={24}
                                                    color="#fff"
                                                // style={styles.loadingIndicator}
                                                />
                                            </>
                                        ) : (<>
                                            <Icon
                                                name={'refresh'}
                                                size={24}
                                                color="#fff"
                                            />
                                        </>)}
                                      
                                    </TouchableOpacity></>)}
                            </>





                     

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
                        {/* <View style={styles.loadButtonContainer}>
                            <TouchableOpacity style={styles.loadButton} onPress={dashAccount()}>
                                {getAccountLoading ? (
                                    <ActivityIndicator size={24} color={theme.BRAND_GRADIENT_START} />
                                ) : (
                                    <Icon name="refresh" size={24} color={theme.BRAND_GRADIENT_START} />
                                )}
                            </TouchableOpacity>
                        </View> */}
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
        // borderTopLeftRadius: 20,
        // borderTopRightRadius: 20,
        overflow: 'hidden',
        height: '100%',
    },
    gradientBackground: {
        flex: 1,
        padding: 20,
    },
    closeButton: {
        alignSelf: 'flex-end',
        padding: 40,
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



});

export default CustomDrawer;
