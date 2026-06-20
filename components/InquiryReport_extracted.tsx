import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Dimensions,
    Modal,
    ScrollView,
    Animated,
    Easing,
    Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import HeaderBar from '../HeaderBar/HeaderBar';
import theme from '../../android/app/src/theme';
import axios from 'axios';
import { API } from '../../common/API/dynamicAPI';
import CustomDrawer from './CustomDrawer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
    ExeData,
    DesignData,
    ItemData,
    ItemStatus,
    WiseStatus,
} from './Modal';
import FullScreenLoader from '../FullScreenLoader/FullScreenLoader';
import {
    generateFinancialYearOptions,
    getCurrentFinancialYearMain,
} from '../../common/API/Functions';

const { width } = Dimensions.get('window');

interface Party {
    parcode: string;
    partyname: string;
    noof: string;
    totmtr: string;
    pendingmtr: string;
    amount: string;
    pendingamt: string;
}

interface ConversionItem {
    ConversionStatus: string;
    ExistingClient: number;
    NewClient: number;
    GrandTotal: number;
    Percentage: number;
}

const InquiryReport: React.FC<{
    token: string;
    username: string;
    getUserPrptype: string;
}> = ({ token, username, getUserPrptype }) => {


    const [getPartyData, setPartyData] = useState([]);
    const [salessumdata, setsalessumdata] = useState([]);
    const [salesdata, setsalesdata] = useState<Party[]>([]);


    const [isLoading, setIsLoading] = useState(false);
    const [getTrackingLoader, setTrackingLoader] = useState(false);
    const [isDrawerVisible, setIsDrawerVisible] = useState(false);
    const [searchQueryPOT, setSearchQueryPOT] = useState('');
    const [filteredData, setFilteredData] = useState<Party[]>([]);
    const [fromDate, setFromDate] = useState<Date>(new Date());
    const [delDate, setDelDate] = useState<Date>(new Date());
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const yearOptions = generateFinancialYearOptions(currentYear);
    const [selectedYear, setSelectedYear] = useState<string>(
        getCurrentFinancialYearMain(),
    );
    const [selectedExe, setSelectedExe] = useState<ExeData | null>(null);


    const [designData, setDesignData] = useState<DesignData[]>([]);
    const [itemData, setItemData] = useState<ItemData[]>([]);
    const [selectedDesigns, setSelectedDesigns] = useState<DesignData[]>([]);
    const [selectedItems, setSelectedItems] = useState<ItemData[]>([]);
    const [selectedParty, setSelectedParty] = useState([]);
    const [selectedItemStatus, setSelectedItemStatus] =
        useState<ItemStatus>('All');
    const [selectedItemStatus1, setSelectedItemStatus1] =
        useState<WiseStatus>('Party Wise');
    const [lastViewedParcode, setLastViewedParcode] = useState<string | null>(
        null,
    );

    const [selectedSalesExes, setSelectedSalesExes] = useState([]);
    const [salesExeData, setSalesExeData] = useState([]);

    // ─── CONVERSION DASHBOARD STATE ──────────────────────────────────────────
    const [conversionData, setConversionData] = useState<ConversionItem[]>([]);
    const [salesPerson, setSalesPerson] = useState('');
    const [selectedConversion, setSelectedConversion] =
        useState<ConversionItem | null>(null);
    const [isDetailModalVisible, setIsDetailModalVisible] = useState(false);
    const [animatedValue] = useState(new Animated.Value(0));
    const [fadeAnim] = useState(new Animated.Value(0));

    // ─── ANIMATIONS ──────────────────────────────────────────────────────────
    useEffect(() => {
        if (conversionData.length > 0) {
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 600,
                easing: Easing.out(Easing.ease),
                useNativeDriver: true,
            }).start();
        }
    }, [conversionData]);

    useEffect(() => {
        if (isDetailModalVisible) {
            Animated.timing(animatedValue, {
                toValue: 1,
                duration: 350,
                easing: Easing.out(Easing.ease),
                useNativeDriver: true,
            }).start();
        } else {
            animatedValue.setValue(0);
        }
    }, [isDetailModalVisible]);

    const getCurrentFinancialYear = () => {
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth() + 1;
        const financialYear = currentMonth >= 4 ? currentYear + 1 : currentYear;
        return financialYear.toString().substring(2);
    };

    // ─── FETCH PARTY ──────────────────────────────────────────────────────
    const fetchParty = async () => {
        if (cancelToken?.cancel) cancelToken.cancel();
        cancelToken = axios.CancelToken.source();
        const yearValue = selectedYear.split('-')[1].substring(2);
        try {
            const payload = {
                prpcode: 'SIP',
                prptype: 'S',
                yearno: yearValue,
                strcode: '0',
                txntype: 'sales_order',
                partytype: 'p',
                type: 's',
                page: 1,
                limit: 20,
                search: '',
                isceo: 0,
                partype: 0,
                grntype: '',
                fetch: '',
                acccode: '',
                billdate: '',
                strtype: '',
                isfaint: '',
                user_id: 1,
            };
            const response = await axios.get(
                `${API}/api/mobaccountbasic`,
                getRequestConfig({ params: payload }),
            );
            if (response.data.success && response.data.response.data.length > 0) {
                setPartyData(response.data.response.data);
                // fetchDesign();
            }
        } catch (error) {
            if (!axios.isCancel(error)) {
                Alert.alert('Error', `Server error: ${error}`);
            }
        }
    };

    useEffect(() => {
        if (fromDate && delDate && selectedYear) {
            fetchSalesExe();
        }
    }, []);



    // ─── SET DEFAULT DATES ──────────────────────────────────────────────
    useEffect(() => {
        const today = new Date();
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        setFromDate(firstDayOfMonth);
    }, []);

    let cancelToken: any;

    const getRequestConfig = (props: any) => ({
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
        },
        params: props.params,
        cancelToken: cancelToken?.token,
    });

    const formatDate = (rawDate: any) => {
        let day = rawDate.getDate().toString().padStart(2, '0') || '';
        let month = (rawDate.getMonth() + 1).toString().padStart(2, '0') || '';
        let year = rawDate.getFullYear() || '';
        return `${year}-${month}-${day}`;
    };

    // ─── HANDLE CONFIRM ACTION ──────────────────────────────────────────
    const handleConfirmAction = async () => {
        setIsLoading(true);
        setsalesdata([]);
        setsalessumdata([]);
        const yearValue = selectedYear.split('-')[1].substring(2);
        const dsnCodes = selectedDesigns.map(design => design.ItmCode);
        const partyCodes = selectedParty.map((item: any) => item.acccode);

        let seArr: string[] = [];
        selectedSalesExes?.forEach((el: any) => seArr.push(el.sexe));

        const payload = {
            fromdate: formatDate(fromDate),
            todate: formatDate(delDate),
            yearno: yearValue,
            sexe: seArr,
            prptype: getUserPrptype,
            txntype: 'mob_inquiry_report',
        };

        try {
            const response = await axios.get(
                `${API}/api/inquiries/conversion-summary`,
                getRequestConfig({ params: payload }),
            );

            const status = response.data.success;
            const data_res = response.data.data;
            if (status === true) {
                setConversionData(data_res);
                const selectedNames =
                    selectedSalesExes?.map((x: any) => x.SalesExecutive).join(', ') ||
                    'All';
                setSalesPerson(selectedNames);
                closeDrawer();
            }
        } catch (error) {
            Alert.alert('Error', `Server error: ${error?.message}`);
            setsalesdata([]);
            setsalessumdata([]);
        } finally {
            setIsLoading(false);
        }
    };

    // ─── DRAWER HANDLERS ────────────────────────────────────────────────
    const openDrawer = () => setIsDrawerVisible(true);
    const closeDrawer = () => setIsDrawerVisible(false);

    // ─── FETCH SALES EXE ────────────────────────────────────────────────
    const fetchSalesExe = async () => {
        const userPtype = await AsyncStorage.getItem('user_prptype');
        if (cancelToken?.cancel) cancelToken.cancel();
        cancelToken = axios.CancelToken.source();
        try {
            const pload = {
                prptype: userPtype,
                yearno: getCurrentFinancialYear(),
            };
            const response = await axios.get(
                `${API}/api/getsexes`,
                getRequestConfig({ params: pload }),
            );
            if (response.data.success) {
                setSalesExeData(response.data.data);
                fetchParty();
            } else {
                setSalesExeData([]);
            }
        } catch (error) {
            if (!axios.isCancel(error)) {
                Alert.alert('Error', `Server error: ${error.message}`);
            }
        }
    };

    // ─── CONVERSION CLICK HANDLER ──────────────────────────────────────
    const handleConversionPress = (item: ConversionItem) => {
        setSelectedConversion(item);
        setIsDetailModalVisible(true);
    };

    // ─── CLOSE DETAIL MODAL ─────────────────────────────────────────────
    const closeDetailModal = () => {
        setIsDetailModalVisible(false);
        setSelectedConversion(null);
    };

    // ─── GET STATUS ICON & COLOR ────────────────────────────────────────
    const getStatusConfig = (status: string) => {
        switch (status) {
            case 'Converted':
                return { icon: 'check-circle', color: '#2E7D32', bg: '#E8F5E9' };
            case 'HOLD':
                return { icon: 'pause-circle', color: '#E65100', bg: '#FFF3E0' };
            case 'Not Converted':
                return { icon: 'cancel', color: '#C62828', bg: '#FFEBEE' };
            case 'Grand Total':
                return { icon: 'bar-chart', color: '#0D47A1', bg: '#E3F2FD' };
            default:
                return { icon: 'info', color: '#455A64', bg: '#ECEFF1' };
        }
    };

    // ─── NEW: CATEGORY CLICK HANDLER ──────────────────────────────────
    const handleCategoryPress = (status: string, category: string, value: number) => {
        console.log(`🔹 Category Clicked: Status="${status}", Category="${category}", Value=${value}`);
        // Here you can call an API or show a detailed modal
        // For demonstration, we show an alert with the info
        Alert.alert(
            'Category Detail',
            `Status: ${status}\nCategory: ${category}\nCount: ${value}`
        );
        // You can replace this with a navigation or API call
        // e.g., fetchDetails(status, category, value);
    };

    // ─── RENDER CONVERSION CARD ─────────────────────────────────────────
    const renderConversionItem = ({ item, index }: { item: ConversionItem; index: number }) => {
        const isGrand = item.ConversionStatus === 'Grand Total';
        const config = getStatusConfig(item.ConversionStatus);

        // Skip rendering "Not Converted" if all zeros
        if (item.ConversionStatus === 'Not Converted' && item.GrandTotal === 0) {
            return null;
        }

        // Helper to render a clickable count chip
        const renderCountChip = (label: string, value: number, category: string, color: string) => (
            <TouchableOpacity
                style={[styles.countChip, { borderColor: color }]}
                onPress={() => handleCategoryPress(item.ConversionStatus, category, value)}
                activeOpacity={0.6}
            >
                <Text style={styles.countChipLabel}>{label}</Text>
                <Text style={[styles.countChipValue, { color }]}>{value}</Text>
            </TouchableOpacity>
        );

        return (
            <Animated.View
                style={{
                    opacity: fadeAnim,
                    transform: [
                        {
                            translateY: fadeAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [20 * (index + 1), 0],
                            }),
                        },
                    ],
                }}
            >
                <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => handleConversionPress(item)}
                    style={[
                        styles.conversionCard,
                        isGrand && styles.grandConversionCard,
                        { borderLeftColor: config.color, borderLeftWidth: isGrand ? 0 : 5 },
                    ]}
                >
                    <View style={styles.conversionCardLeft}>
                        <View style={[styles.statusIconWrap, { backgroundColor: config.bg }]}>
                            <Icon name={config.icon} size={22} color={config.color} />
                        </View>
                        <View>
                            <Text style={[styles.conversionStatusText, isGrand && styles.grandText]}>
                                {item.ConversionStatus}
                            </Text>
                            {!isGrand && (
                                <Text style={styles.conversionSubText}>
                                    Tap card for details
                                </Text>
                            )}
                        </View>
                    </View>
                    <View style={styles.conversionCardRight}>
                        <Text style={styles.conversionTotalText}>
                            {item.GrandTotal}
                            {!isGrand && (
                                <Text style={styles.conversionTotalSuffix}> clients</Text>
                            )}
                        </Text>
                        <View style={styles.percentageChip}>
                            <Text style={styles.percentageText}>{item.Percentage}%</Text>
                        </View>
                    </View>
                    {!isGrand && (
                        <View
                            style={[
                                styles.progressBar,
                                {
                                    width: `${Math.min(item.Percentage, 100)}%`,
                                    backgroundColor: config.color,
                                },
                            ]}
                        />
                    )}
                    <Icon
                        name="chevron-right"
                        size={20}
                        color="#B0BEC5"
                        style={styles.conversionChevron}
                    />
                </TouchableOpacity>

                {/* ─── CLICKABLE COUNT CHIPS (only for non-grand items) ─── */}
                {!isGrand && (
                    <View style={styles.countChipRow}>
                        {renderCountChip('Existing', item.ExistingClient, 'ExistingClient', '#1565C0')}
                        {renderCountChip('New', item.NewClient, 'NewClient', '#2E7D32')}
                        {renderCountChip('Total', item.GrandTotal, 'GrandTotal', '#0D47A1')}
                    </View>
                )}
            </Animated.View>
        );
    };

    // ─── RENDER ──────────────────────────────────────────────────────────
    return (
        <>
            {getTrackingLoader && <FullScreenLoader />}
            <HeaderBar
                userName={username}
                placeholder="Search sales order..."
                onSearch={setSearchQueryPOT}
            />
            <TouchableOpacity style={styles.listIconContainer} onPress={openDrawer}>
                <Icon name="tune" size={22} color="white" />
            </TouchableOpacity>

            <CustomDrawer
                isVisible={isDrawerVisible}
                onClose={closeDrawer}
                fromDate={fromDate}
                delDate={delDate}
                selectedYear={selectedYear}
                onFromDateChange={setFromDate}
                onToDateChange={setDelDate}
                onYearChange={setSelectedYear}
                onLoadPress={handleConfirmAction}
                exeData={salesExeData}
                onExeChange={setSelectedExe}
                selectedExe={selectedExe?.SalesExecutive || 'Select Executive'}
                designData={designData}
                getPartyData={getPartyData}
                isLoading={isLoading}
                setIsLoading={setIsLoading}
                onDesignSelect={setSelectedDesigns}
                onItemSelectItem={setSelectedItems}
                onItemSelectParty={setSelectedParty}
                selectedDesigns={selectedDesigns}
                setSelectedDesigns={setSelectedDesigns}
                selectedItems={selectedItems}
                setSelectedItems={setSelectedItems}
                itemData={itemData}
                selectedItemStatus={selectedItemStatus}
                selectedItemStatus1={selectedItemStatus1}
                onItemStatusChange={setSelectedItemStatus}
                onItemStatusChange1={setSelectedItemStatus1}
                setSelectedParty={setSelectedParty}
                selectedParty={selectedParty}
                yearOptions={yearOptions}
                setSelectedSalesExes={setSelectedSalesExes}
                selectedSalesExes={selectedSalesExes}
                onSalesExeSelect={setSelectedSalesExes}
            />

            {/* ─── CONVERSION DASHBOARD ──────────────────────────────────────── */}
            {conversionData.length > 0 && (
                <ScrollView
                    style={styles.dashboardContainer}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.dashboardContent}
                >
                    {/* ─── HEADER ─────────────────────────────────────────── */}
                    <View style={styles.dashboardHeader}>
                        <View>
                            <Text style={styles.dashboardTitle}>Conversion Report</Text>
                            <Text style={styles.dashboardSubtitle}>
                                {fromDate.toLocaleString('default', { month: 'long' }).toUpperCase()}{' '}
                                {fromDate.getFullYear()}
                            </Text>
                        </View>
                        <View style={styles.headerBadge}>
                            <Icon name="people" size={18} color="#fff" />
                            <Text style={styles.headerBadgeText}>
                                {conversionData.find(c => c.ConversionStatus === 'Grand Total')?.GrandTotal || 0}
                            </Text>
                        </View>
                    </View>

                    {/* ─── SALES PERSON ────────────────────────────────────── */}
                    <View style={styles.salesPersonCard}>
                        <Icon name="person" size={20} color="#1565C0" />
                        <Text style={styles.salesPersonLabel}>Sales Person:</Text>
                        <Text style={styles.salesPersonName}>{salesPerson || 'All'}</Text>
                    </View>

                    {/* ─── KPI CARDS ────────────────────────────────────────── */}
                    <View style={styles.kpiRow}>
                        {(() => {
                            const grand = conversionData.find(c => c.ConversionStatus === 'Grand Total');
                            const converted = conversionData.find(c => c.ConversionStatus === 'Converted');
                            const hold = conversionData.find(c => c.ConversionStatus === 'HOLD');
                            return (
                                <>
                                    <View style={[styles.kpiCard, styles.kpiCardTotal]}>
                                        <Text style={styles.kpiValue}>{grand?.GrandTotal || 0}</Text>
                                        <Text style={styles.kpiLabel}>Total</Text>
                                    </View>
                                    <View style={[styles.kpiCard, styles.kpiCardConverted]}>
                                        <Text style={styles.kpiValue}>{converted?.GrandTotal || 0}</Text>
                                        <Text style={styles.kpiLabel}>Converted</Text>
                                    </View>
                                    <View style={[styles.kpiCard, styles.kpiCardHold]}>
                                        <Text style={styles.kpiValue}>{hold?.GrandTotal || 0}</Text>
                                        <Text style={styles.kpiLabel}>Hold</Text>
                                    </View>
                                </>
                            );
                        })()}
                    </View>

                    {/* ─── CONVERSION BREAKDOWN ────────────────────────────── */}
                    <Text style={styles.breakdownTitle}>Breakdown</Text>

                    {conversionData
                        .filter(item => item.ConversionStatus !== 'Grand Total')
                        .map((item, index) => (
                            <React.Fragment key={index}>
                                {renderConversionItem({ item, index })}
                            </React.Fragment>
                        ))}

                    {/* ─── GRAND TOTAL FOOTER ──────────────────────────────── */}
                    {conversionData
                        .filter(item => item.ConversionStatus === 'Grand Total')
                        .map((item, index) => (
                            <View key={`grand-${index}`} style={styles.grandFooter}>
                                <View style={styles.grandFooterLeft}>
                                    <Icon name="assessment" size={22} color="#0D47A1" />
                                    <Text style={styles.grandFooterLabel}>Grand Total</Text>
                                </View>
                                <View style={styles.grandFooterRight}>
                                    <Text style={styles.grandFooterTotal}>{item.GrandTotal}</Text>
                                    <Text style={styles.grandFooterPercent}>{item.Percentage}%</Text>
                                </View>
                            </View>
                        ))}

                    {/* ─── EXISTING VS NEW BREAKDOWN ───────────────────────── */}
                    <View style={styles.breakdownChipRow}>
                        {(() => {
                            const grand = conversionData.find(c => c.ConversionStatus === 'Grand Total');
                            return (
                                <>
                                    <View style={[styles.breakdownChip, styles.breakdownChipExisting]}>
                                        <Icon name="people-outline" size={16} color="#1565C0" />
                                        <Text style={styles.breakdownChipLabel}>Existing</Text>
                                        <Text style={styles.breakdownChipValue}>{grand?.ExistingClient || 0}</Text>
                                    </View>
                                    <View style={[styles.breakdownChip, styles.breakdownChipNew]}>
                                        <Icon name="person-add" size={16} color="#2E7D32" />
                                        <Text style={styles.breakdownChipLabel}>New</Text>
                                        <Text style={styles.breakdownChipValue}>{grand?.NewClient || 0}</Text>
                                    </View>
                                    <View style={[styles.breakdownChip, styles.breakdownChipRate]}>
                                        <Icon name="trending-up" size={16} color="#E65100" />
                                        <Text style={styles.breakdownChipLabel}>Rate</Text>
                                        <Text style={styles.breakdownChipValue}>
                                            {grand?.GrandTotal ? `${((grand.ExistingClient / grand.GrandTotal) * 100).toFixed(1)}%` : '0%'}
                                        </Text>
                                    </View>
                                </>
                            );
                        })()}
                    </View>
                </ScrollView>
            )}

            {/* ─── CONVERSION DETAIL MODAL ──────────────────────────────────── */}
            <Modal
                visible={isDetailModalVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={closeDetailModal}
            >
                <View style={styles.modalOverlay}>
                    <Animated.View
                        style={[
                            styles.modalContent,
                            {
                                transform: [
                                    {
                                        scale: animatedValue.interpolate({
                                            inputRange: [0, 1],
                                            outputRange: [0.85, 1],
                                        }),
                                    },
                                ],
                                opacity: animatedValue,
                            },
                        ]}
                    >
                        <View style={styles.modalHeader}>
                            <View style={styles.modalHeaderLeft}>
                                {selectedConversion && (
                                    <>
                                        <View
                                            style={[
                                                styles.modalStatusIcon,
                                                {
                                                    backgroundColor: getStatusConfig(selectedConversion.ConversionStatus)
                                                        .bg,
                                                },
                                            ]}
                                        >
                                            <Icon
                                                name={getStatusConfig(selectedConversion.ConversionStatus).icon}
                                                size={28}
                                                color={getStatusConfig(selectedConversion.ConversionStatus).color}
                                            />
                                        </View>
                                        <View>
                                            <Text style={styles.modalTitle}>
                                                {selectedConversion.ConversionStatus}
                                            </Text>
                                            <Text style={styles.modalSubtitle}>
                                                Conversion Summary
                                            </Text>
                                        </View>
                                    </>
                                )}
                            </View>
                            <TouchableOpacity onPress={closeDetailModal} style={styles.modalCloseBtn}>
                                <Icon name="close" size={26} color="#78909C" />
                            </TouchableOpacity>
                        </View>

                        {selectedConversion && (
                            <View style={styles.modalBody}>
                                <View style={styles.detailCard}>
                                    <View style={styles.detailRow}>
                                        <View style={styles.detailItem}>
                                            <Text style={styles.detailLabel}>Total Clients</Text>
                                            <Text style={[styles.detailValue, styles.detailValueLarge]}>
                                                {selectedConversion.GrandTotal}
                                            </Text>
                                        </View>
                                        <View style={styles.detailItem}>
                                            <Text style={styles.detailLabel}>Conversion Rate</Text>
                                            <Text style={[styles.detailValue, styles.detailValuePercent]}>
                                                {selectedConversion.Percentage}%
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={styles.divider} />

                                    <View style={styles.detailRow}>
                                        <View style={[styles.detailChip, styles.detailChipExisting]}>
                                            <Icon name="people-outline" size={18} color="#1565C0" />
                                            <Text style={styles.detailChipLabel}>Existing</Text>
                                            <Text style={styles.detailChipValue}>
                                                {selectedConversion.ExistingClient}
                                            </Text>
                                        </View>
                                        <View style={[styles.detailChip, styles.detailChipNew]}>
                                            <Icon name="person-add" size={18} color="#2E7D32" />
                                            <Text style={styles.detailChipLabel}>New</Text>
                                            <Text style={styles.detailChipValue}>
                                                {selectedConversion.NewClient}
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={styles.detailProgressWrap}>
                                        <Text style={styles.detailProgressLabel}>
                                            Existing vs New Distribution
                                        </Text>
                                        <View style={styles.detailProgressBar}>
                                            <View
                                                style={[
                                                    styles.detailProgressFill,
                                                    {
                                                        width: `${selectedConversion.GrandTotal ? (selectedConversion.ExistingClient / selectedConversion.GrandTotal) * 100 : 0}%`,
                                                        backgroundColor: '#1565C0',
                                                    },
                                                ]}
                                            />
                                            <View
                                                style={[
                                                    styles.detailProgressFill,
                                                    {
                                                        width: `${selectedConversion.GrandTotal ? (selectedConversion.NewClient / selectedConversion.GrandTotal) * 100 : 0}%`,
                                                        backgroundColor: '#2E7D32',
                                                    },
                                                ]}
                                            />
                                        </View>
                                        <View style={styles.detailProgressLegend}>
                                            <View style={styles.legendItem}>
                                                <View style={[styles.legendDot, { backgroundColor: '#1565C0' }]} />
                                                <Text style={styles.legendText}>Existing</Text>
                                            </View>
                                            <View style={styles.legendItem}>
                                                <View style={[styles.legendDot, { backgroundColor: '#2E7D32' }]} />
                                                <Text style={styles.legendText}>New</Text>
                                            </View>
                                        </View>
                                    </View>
                                </View>

                                <TouchableOpacity
                                    style={styles.detailActionBtn}
                                    onPress={() => {
                                        closeDetailModal();
                                        // You can navigate to a detailed list view here
                                        Alert.alert(
                                            'View Details',
                                            `Showing full list of ${selectedConversion.ConversionStatus} clients`,
                                        );
                                    }}
                                >
                                    <Text style={styles.detailActionText}>
                                        View All {selectedConversion.ConversionStatus} Clients
                                    </Text>
                                    <Icon name="arrow-forward" size={20} color="#fff" />
                                </TouchableOpacity>
                            </View>
                        )}
                    </Animated.View>
                </View>
            </Modal>


        </>
    );
};

// ─── STYLES ──────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    // ─── HEADER ──────────────────────────────────────────────────────────
    listIconContainer: {
        position: 'absolute',
        top: 85,
        right: 20,
        zIndex: 1,
        backgroundColor: theme.BRAND_GRADIENT_END,
        borderRadius: 8,
        padding: 8,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
    },

    // ─── DASHBOARD CONTAINER ────────────────────────────────────────────
    dashboardContainer: {
        flex: 1,
        backgroundColor: '#F5F7FA',
    },
    dashboardContent: {
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 40,
    },

    // ─── DASHBOARD HEADER ──────────────────────────────────────────────
    dashboardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    dashboardTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: '#1A2332',
        letterSpacing: -0.5,
    },
    dashboardSubtitle: {
        fontSize: 14,
        color: '#78909C',
        fontWeight: '500',
        marginTop: 2,
    },
    headerBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#0D47A1',
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderRadius: 20,
        elevation: 2,
        shadowColor: '#0D47A1',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },
    headerBadgeText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 16,
        marginLeft: 6,
    },

    // ─── SALES PERSON ────────────────────────────────────────────────────
    salesPersonCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#E3F2FD',
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: 10,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#BBDEFB',
    },
    salesPersonLabel: {
        fontSize: 14,
        color: '#1565C0',
        fontWeight: '600',
        marginLeft: 8,
    },
    salesPersonName: {
        fontSize: 15,
        color: '#0D47A1',
        fontWeight: '700',
        marginLeft: 4,
        flex: 1,
    },

    // ─── KPI CARDS ──────────────────────────────────────────────────────
    kpiRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20,
        gap: 10,
    },
    kpiCard: {
        flex: 1,
        paddingVertical: 14,
        paddingHorizontal: 10,
        borderRadius: 12,
        alignItems: 'center',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
    },
    kpiCardTotal: {
        backgroundColor: '#E3F2FD',
        borderWidth: 1,
        borderColor: '#90CAF9',
    },
    kpiCardConverted: {
        backgroundColor: '#E8F5E9',
        borderWidth: 1,
        borderColor: '#A5D6A7',
    },
    kpiCardHold: {
        backgroundColor: '#FFF3E0',
        borderWidth: 1,
        borderColor: '#FFCC80',
    },
    kpiValue: {
        fontSize: 22,
        fontWeight: '700',
        color: '#1A2332',
    },
    kpiLabel: {
        fontSize: 11,
        color: '#78909C',
        fontWeight: '600',
        marginTop: 2,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },

    // ─── BREAKDOWN TITLE ────────────────────────────────────────────────
    breakdownTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1A2332',
        marginBottom: 12,
        letterSpacing: -0.3,
    },

    // ─── CONVERSION CARD ────────────────────────────────────────────────
    conversionCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 14,
        paddingVertical: 14,
        paddingHorizontal: 16,
        marginBottom: 4,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
        borderLeftWidth: 5,
        position: 'relative',
        overflow: 'hidden',
    },
    grandConversionCard: {
        backgroundColor: '#E8EAF6',
        borderLeftWidth: 0,
        borderWidth: 1,
        borderColor: '#C5CAE9',
        marginTop: 6,
    },
    conversionCardLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    statusIconWrap: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    conversionStatusText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1A2332',
    },
    grandText: {
        fontSize: 17,
        color: '#0D47A1',
    },
    conversionSubText: {
        fontSize: 12,
        color: '#78909C',
        marginTop: 1,
    },
    conversionCardRight: {
        alignItems: 'flex-end',
        marginLeft: 8,
    },
    conversionTotalText: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1A2332',
    },
    conversionTotalSuffix: {
        fontSize: 12,
        fontWeight: '400',
        color: '#78909C',
    },
    percentageChip: {
        backgroundColor: '#F5F7FA',
        paddingHorizontal: 10,
        paddingVertical: 2,
        borderRadius: 12,
        marginTop: 2,
    },
    percentageText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#455A64',
    },
    conversionChevron: {
        marginLeft: 8,
    },
    progressBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        height: 3,
        borderRadius: 2,
    },

    // ─── COUNT CHIPS (new) ──────────────────────────────────────────────
    countChipRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 10,
        paddingHorizontal: 4,
        gap: 8,
    },
    countChip: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFFFFF',
        paddingVertical: 6,
        paddingHorizontal: 8,
        borderRadius: 8,
        borderWidth: 1.5,
        borderColor: '#B0BEC5',
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        gap: 4,
    },
    countChipLabel: {
        fontSize: 11,
        color: '#78909C',
        fontWeight: '500',
    },
    countChipValue: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1A2332',
    },

    // ─── GRAND FOOTER ────────────────────────────────────────────────────
    grandFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#E8EAF6',
        borderRadius: 14,
        paddingVertical: 14,
        paddingHorizontal: 18,
        marginTop: 6,
        borderWidth: 1,
        borderColor: '#C5CAE9',
    },
    grandFooterLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    grandFooterLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#0D47A1',
        marginLeft: 10,
    },
    grandFooterRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
    },
    grandFooterTotal: {
        fontSize: 20,
        fontWeight: '700',
        color: '#0D47A1',
    },
    grandFooterPercent: {
        fontSize: 15,
        fontWeight: '600',
        color: '#0D47A1',
        backgroundColor: '#C5CAE9',
        paddingHorizontal: 10,
        paddingVertical: 2,
        borderRadius: 12,
    },

    // ─── BREAKDOWN CHIPS ────────────────────────────────────────────────
    breakdownChipRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 14,
        gap: 10,
    },
    breakdownChip: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 10,
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        borderWidth: 1,
        borderColor: '#ECEFF1',
    },
    breakdownChipExisting: {
        borderColor: '#90CAF9',
    },
    breakdownChipNew: {
        borderColor: '#A5D6A7',
    },
    breakdownChipRate: {
        borderColor: '#FFCC80',
    },
    breakdownChipLabel: {
        fontSize: 11,
        color: '#78909C',
        fontWeight: '500',
        marginLeft: 4,
        flex: 1,
    },
    breakdownChipValue: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1A2332',
    },

    // ─── MODAL ──────────────────────────────────────────────────────────
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.45)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    modalContent: {
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        width: '100%',
        maxWidth: 420,
        maxHeight: '80%',
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    modalHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    modalStatusIcon: {
        width: 52,
        height: 52,
        borderRadius: 26,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1A2332',
    },
    modalSubtitle: {
        fontSize: 13,
        color: '#78909C',
        marginTop: 1,
    },
    modalCloseBtn: {
        padding: 4,
    },
    modalBody: {
        paddingHorizontal: 20,
        paddingVertical: 18,
    },

    // ─── DETAIL CARD ────────────────────────────────────────────────────
    detailCard: {
        backgroundColor: '#F8FAFC',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: '#ECEFF1',
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        gap: 10,
    },
    detailItem: {
        alignItems: 'center',
        flex: 1,
    },
    detailLabel: {
        fontSize: 12,
        color: '#78909C',
        fontWeight: '500',
        textTransform: 'uppercase',
        letterSpacing: 0.3,
    },
    detailValue: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1A2332',
        marginTop: 4,
    },
    detailValueLarge: {
        fontSize: 28,
        color: '#0D47A1',
    },
    detailValuePercent: {
        color: '#E65100',
        fontSize: 24,
    },
    divider: {
        height: 1,
        backgroundColor: '#E0E0E0',
        marginVertical: 14,
    },
    detailChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 10,
        flex: 1,
        justifyContent: 'center',
        gap: 8,
        borderWidth: 1,
    },
    detailChipExisting: {
        backgroundColor: '#E3F2FD',
        borderColor: '#90CAF9',
    },
    detailChipNew: {
        backgroundColor: '#E8F5E9',
        borderColor: '#A5D6A7',
    },
    detailChipLabel: {
        fontSize: 13,
        color: '#455A64',
        fontWeight: '500',
    },
    detailChipValue: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1A2332',
    },

    detailProgressWrap: {
        marginTop: 14,
    },
    detailProgressLabel: {
        fontSize: 13,
        color: '#455A64',
        fontWeight: '500',
        marginBottom: 6,
    },
    detailProgressBar: {
        flexDirection: 'row',
        height: 8,
        borderRadius: 4,
        overflow: 'hidden',
        backgroundColor: '#E0E0E0',
    },
    detailProgressFill: {
        height: '100%',
        borderRadius: 4,
    },
    detailProgressLegend: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 20,
        marginTop: 8,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    legendDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    legendText: {
        fontSize: 12,
        color: '#78909C',
    },

    detailActionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0D47A1',
        paddingVertical: 14,
        borderRadius: 12,
        marginTop: 16,
        gap: 8,
        elevation: 2,
        shadowColor: '#0D47A1',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },
    detailActionText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },

    // ─── EMPTY STATE ─────────────────────────────────────────────────────
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#455A64',
        marginTop: 16,
    },
    emptySubText: {
        fontSize: 14,
        color: '#90A4AE',
        textAlign: 'center',
        marginTop: 6,
        lineHeight: 20,
    },

    // ─── PARTY CARD (existing) ──────────────────────────────────────────
    partyCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 14,
        padding: 16,
        marginHorizontal: 16,
        marginBottom: 12,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
        borderWidth: 1,
        borderColor: '#F0F0F0',
    },
    recentlyViewedCard: {
        borderColor: '#0D47A1',
        borderWidth: 2,
        backgroundColor: '#F5F8FF',
    },
    partyHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    partyAvatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    partyAvatarText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '700',
    },
    partyInfo: {
        flex: 1,
    },
    partyName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1A2332',
    },
    partyOrdersContainer: {
        backgroundColor: '#F5F7FA',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
        alignSelf: 'flex-start',
        marginTop: 2,
    },
    partyOrdersText: {
        fontSize: 11,
        color: '#78909C',
        fontWeight: '500',
    },
    chevronIcon: {
        marginLeft: 4,
    },
    partyValues: {
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#F0F0F0',
    },
    valueRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 6,
    },
    valueItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    valueLabel: {
        fontSize: 13,
        color: '#78909C',
        fontWeight: '500',
    },
    valueText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1A2332',
    },
    recentlyViewedBadge: {
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: '#0D47A1',
        paddingHorizontal: 10,
        paddingVertical: 2,
        borderRadius: 12,
    },
    recentlyViewedText: {
        color: '#fff',
        fontSize: 9,
        fontWeight: '600',
        letterSpacing: 0.3,
    },
    listContent: {
        paddingVertical: 8,
        paddingBottom: 30,
    },
    loadingIndicator: {
        paddingVertical: 16,
    },
});

export default React.memo(InquiryReport);