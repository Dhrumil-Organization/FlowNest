import { crlimtreq_styles } from '@/common/Style';
import AppAlert from '@/common/utils/appAlert';
import theme from '@/components/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import axios from 'axios';
import React, { useEffect, useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { API } from '../../common/API/dynamicAPI';
import { generateFinancialYearOptions, getCurrentFinancialYearMain } from '../../common/API/Functions';
import HeaderBar from '../../components/HeaderNew';
import CustomDrawer from './CustomDrawer';
import { CardPayload, DesignData, ExeData, ItemData, ItemStatus, POTData } from './Modal';
import ProdOrderTrackingCard from './ProdOrderTrackingCard';

interface Props {
    token: string;
    username?: string;
}

const ProdOrderTracking: React.FC<Props> = ({ token, username }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [isDrawerVisible, setIsDrawerVisible] = useState(false);
    const [searchQueryPOT, setSearchQueryPOT] = useState('');
    const [fromDate, setFromDate] = useState<Date>(new Date());
    const [toDate, setToDate] = useState<Date>(new Date());
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const yearOptions = generateFinancialYearOptions(currentYear);
    const [selectedYear, setSelectedYear] = useState<string>(getCurrentFinancialYearMain());
    const [selectedExe, setSelectedExe] = useState<ExeData | null>(null);
    const [exeData, setExeData] = useState<ExeData[]>([]);
    const [designData, setDesignData] = useState<DesignData[]>([]);
    const [itemData, setItemData] = useState<ItemData[]>([]);
    const [page, setpage] = useState(0);
    const [selectedDesigns, setSelectedDesigns] = useState<DesignData[]>([])
    const [selectedItems, setSelectedItems] = useState<ItemData[]>([])
    const [selectedItemStatus, setSelectedItemStatus] = useState<ItemStatus>('All');
    const [gePOTData, setPOTData] = useState<POTData[]>([])
    const [getpayload, setPayload] = useState<CardPayload[]>([])
    const [parentDesignData, setParentDesignData] = useState<any[]>([]);

    const rowsPerPage = 20;

    // Set default dates
    useEffect(() => {
        
        const today = new Date();
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        setFromDate(firstDayOfMonth);
        setToDate(today);
    }, []);


    const getCurrentFinancialYear = () => {
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth() + 1; // getMonth() returns 0-11

        // Financial year starts in April
        const financialYear = currentMonth >= 4 ? currentYear + 1 : currentYear;
        return financialYear.toString().substring(2); // Return last two digits of the year
    };

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

    const fetchData = async () => {
        if (cancelToken?.cancel) cancelToken.cancel();
        cancelToken = axios.CancelToken.source();
        // setIsLoading(true);
        try {
            const payload = {
                prpcode: 'SIP',
                yearno: selectedYear,
                strcode: '012',
                txntype: 'production_order_track',
                prptype: '',
                fetch: 'salesexe'
            };
            const response = await axios.get(
                // `https://apig.tms-webapp.com/api/get_criterion`,
                `${API}/api/get_criterion`,
                getRequestConfig({
                    params: {
                        prpcode: 'SIP',
                        yearno: getCurrentFinancialYear(),
                        strcode: '012',
                        txntype: 'production_order_track',
                        prptype: '',
                        fetch: 'salesexe'
                    }
                })
            );
            console.log('🔵 payload', payload, response);
            if (response.data.success && response.data.response.data.length > 0) {
                console.log('✅ Data Sexe:', response.data.response.data);
                setExeData(response.data.response.data);
                fetchDesign();
                // fetchItem();

                // setAllHistoryData([])
            } else {
                // setData([]);
            }
        } catch (error) {
            if (!axios.isCancel(error)) {
                AppAlert.alert('Error', `Server error: ${error}`);
            }
        } finally {
            // setIsLoading(false);
        }
    };

    const fetchDesign = async () => {
        if (cancelToken?.cancel) cancelToken.cancel();
        cancelToken = axios.CancelToken.source();
        // setIsLoading(true);
        try {
            const payload = {
                prpcode: 'SIP',
                yearno: getCurrentFinancialYear(),
                strcode: '012',
                itmcode: '',
                dsncode: '',
                shdcode: '',
                page: page + 1,
                limit: rowsPerPage,
                txntype: 'production_order_track'
            };
            const response = await axios.get(
                // `https://apig.tms-webapp.com/api/getdesign`,
                `${API}/api/getdesign`,
                getRequestConfig({
                    params: {
                        prpcode: 'SIP',
                        yearno: getCurrentFinancialYear(),
                        strcode: '012',
                        itmcode: '',
                        dsncode: '',
                        shdcode: '',
                        page: page + 1,
                        limit: rowsPerPage,
                        txntype: 'production_order_track'
                    }
                })
            );
            console.log('🔵 design payload', payload, response);
            if (response.data.success && response.data.response.data.length > 0) {
                console.log('✅ Data:', response.data.response.data);
                setDesignData(response.data.response.data);
                fetchItem();
                // setAllHistoryData([])
            } else {
                // setData([]);
            }
        } catch (error) {
            if (!axios.isCancel(error)) {
                AppAlert.alert('Error', `Server error: ${error}`);
            }
        } finally {
            // setIsLoading(false);
        }
    };

    const fetchItem = async () => {
        if (cancelToken?.cancel) cancelToken.cancel();
        cancelToken = axios.CancelToken.source();
        // setIsLoading(true);
        try {
            const payload = {
                // prpcode: 'SIP',
                // yearno: getCurrentFinancialYear(),
                // strcode: '012',
                // itmcode: '',
                // dsncode: '',
                // shdcode: '',
                // page: page + 1,
                // limit: rowsPerPage,
                // fetch: 'itm',
                // txntype: 'production_order_track'
                prpcode: 'SIP',
                yearno: getCurrentFinancialYear(),
                strcode: '012',
                txntype: 'production_order_track',
                prptype: '',
                limit: 20,
                fetch: 'itm',
                itmcode: '',
                strcodes: '012',
                issdate: ''
            };
            const response = await axios.get(
                // `https://apig.tms-webapp.com/api/get_criterion`,
                `${API}/api/get_criterion`,
                getRequestConfig({
                    params: {
                        prpcode: 'SIP',
                        yearno: getCurrentFinancialYear(),
                        strcode: '012',
                        txntype: 'production_order_track',
                        prptype: '',
                        limit: 20,
                        fetch: 'itm',
                        itmcode: '',
                        strcodes: '012',
                        issdate: ''
                    }
                })
            );
            console.log('🔵 item payload', payload, response);
            if (response.data.success && response.data.response.data.length > 0) {
                console.log('✅ Data:', response.data.response.data);
                setItemData(response.data.response.data);
                // setAllHistoryData([])
            } else {
                // setData([]);
            }
        } catch (error) {
            if (!axios.isCancel(error)) {
                AppAlert.alert('Error', `Server error: ${error}`);
            }
        } finally {
            // setIsLoading(false);
        }
    };

    const getToken = () => {
        return token;
    };

    const formatDate = (rawDate: any) => {
        let day = rawDate.getDate().toString().padStart(2, '0') || '';
        let month = (rawDate.getMonth() + 1).toString().padStart(2, '0') || ''; // Month is 0-indexed
        let year = rawDate.getFullYear() || '';
        return `${day}-${month}-${year}`;
    };

    const handleConfirmAction = async () => {
        setIsLoading(true);
        const yearValue = selectedYear.split('-')[1].substring(2);
        const dsnCodes = selectedDesigns.map((design) => design.DsnCode);
        const dsnNames = selectedDesigns.map((design) => design.DsnName);
        const itemCodes = selectedItems.map((item) => item.ItmCode);
        const itemNames = selectedItems.map((item) => item.ItmName);

        const payload = {
            fromdate: formatDate(fromDate),
            // todate: toDate.toISOString().split('T')[0],
            todate: formatDate(toDate),
            yearno: yearValue,
            sexes: selectedExe?.Code ? selectedExe?.Code : '0',
            type: selectedItemStatus === 'All' ? 'all' : selectedItemStatus === 'Open' ? 'open' : selectedItemStatus === 'Closed' ? 'closed' : 'all',
            dsncodes: dsnCodes,
            items: itemCodes,
            prptype: 'S',
            txntype: 'prodorderlist'
        };
        const sendCardPayload = {
            fromdate: formatDate(fromDate),
            todate: formatDate(toDate),
            yearno: yearValue,
            sexe: selectedExe?.Code ? selectedExe?.Code : '0',
            dsncode: dsnCodes,
            dsnname: dsnNames,
            itmcode: itemCodes,
            itmname: itemNames,
            prptype: 'S',
            txntype: 'prodordertrack',
            rowdata: {}
        };
        console.log('🔵 payload', payload);
        const sendpayload = [sendCardPayload]
        setPayload(sendpayload as object as CardPayload[]);
        const headers = {
            Authorization: `Bearer ${getToken()}`,
            'Content-Type': 'application/json',
            'X-Requested-with': 'XMLHttpRequest',
        };
        try {
            // const response = await axios.post(`https://apig.tms-webapp.com/api/prodorderlist`, payload, { headers });
            const response = await axios.post(`${API}/api/prodorderlist`, payload, { headers });
            const response_details = await axios.post(`${API}/api/getparentdesign`, payload, { headers });
            console.log('🔵 parent design details response:', response_details, payload);
            console.log('🔵 design details response 123:', response, payload);
            if (response.data.success === true && response.data.data.length === 0) {
                setIsLoading(false);
                AppAlert.alert('No Data Found');
                setPOTData([]);
                // setresponsemessage(response.data.message || 'Success');
                // setTimeout(() => {
                //     setSuccess(false);
                //     setShowOverlay(false);
                // }, 2000);
                // setProcessedCards(prev => new Set(prev).add(selectedItem.uid));

            } else if (response.data.success === true && response.data.data.length > 0) {
                setIsLoading(false);
                setPOTData(response.data.data);
                closeDrawer();
                // setresponsemessage(response.data.message || 'Success');
                // setTimeout(() => {
                //     setSuccess(false);
                //     setShowOverlay(false);
                // }, 2000);
                // setProcessedCards(prev => new Set(prev).add(selectedItem.uid));
            } else if (response.data.success === false) {
                setIsLoading(false);
                AppAlert.alert(`${response.data.message}`);
                setPOTData([]);
            } else {
                setIsLoading(false);
                AppAlert.alert(`${response.data.message}`);
                setPOTData([]);
            }

            if (response_details.data.success === true && response_details.data.data.length > 0) {
                console.log('🔵 parent design details response main:', response_details.data.data);
                setParentDesignData(response_details.data.data);
            }

        } catch (error) {
            setIsLoading(false);
            AppAlert.alert('Server Error');
            setPOTData([]);
            // setTimeout(() => {
            //     setSuccess(false);
            // }, 2000);
        }


    };

    useEffect(() => {
        if (!token) return;
        if (fromDate && toDate && selectedYear) {
            fetchData();
            // fetchDesign();
        }
    }, [token]);

    const handleDesignSelect = (designs: DesignData[]) => {
        setSelectedDesigns(designs);
        console.log("Selected Designs in Parent:", designs);
    };
    const handleItemSelect = (items: ItemData[]) => {
        setSelectedItems(items);
        console.log("Selected Items in Parent:", items);
    };
    const handleItemStatusChange = (status: ItemStatus) => {
        setSelectedItemStatus(status);
    };

    // Handle Load Button Press
    const handleLoadPress = () => {
        handleConfirmAction();
    };

    const openDrawer = () => setIsDrawerVisible(true);
    const closeDrawer = () => setIsDrawerVisible(false);
    console.log('🔵 POT Data:', gePOTData);

    return (
        <>
            <HeaderBar
                userName={username}
                onSearch={setSearchQueryPOT}
                placeholder="Search order..."
            />
            <View style={crlimtreq_styles.container}>
                {/* Top-right List Icon */}
                <TouchableOpacity style={styles.listIconContainer} onPress={openDrawer}>
                    <Icon name="list" size={24} color="white" />
                </TouchableOpacity>

                {/* Main Content: Replace Text with ProdOrderTrackingTable */}
                <ProdOrderTrackingCard gePOTData={gePOTData} searchQueryPOT={searchQueryPOT} getpayload={getpayload} token={token} parentDesignData={parentDesignData} />
            </View>
            <CustomDrawer
                isVisible={isDrawerVisible}
                onClose={closeDrawer}
                fromDate={fromDate}
                toDate={toDate}
                selectedYear={selectedYear}
                onFromDateChange={setFromDate}
                onToDateChange={setToDate}
                onYearChange={setSelectedYear}
                onLoadPress={handleLoadPress}
                exeData={exeData}
                onExeChange={setSelectedExe}
                selectedExe={selectedExe?.SalesExecutive || 'Select Executive'}
                designData={designData}
                isLoading={isLoading}
                setIsLoading={setIsLoading}
                onDesignSelect={handleDesignSelect}
                onItemSelectItem={handleItemSelect}
                selectedDesigns={selectedDesigns}
                setSelectedDesigns={setSelectedDesigns}
                setSelectedItems={setSelectedItems}
                selectedItems={selectedItems}
                itemData={itemData}
                selectedItemStatus={selectedItemStatus}
                onItemStatusChange={handleItemStatusChange}
                yearOptions={yearOptions}
            />
        </>
    );
};

const styles = StyleSheet.create({
    listIconContainer: {
        position: 'absolute',
        top: 1.5,
        right: 2.5,
        zIndex: 1,
        backgroundColor: theme.BRAND_GRADIENT_END,
        color: '#fff',
        borderRadius: 3,
        padding: 4,
    },
});

export default ProdOrderTracking;
