import AppAlert from '@/common/utils/appAlert';
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Modal, ScrollView, ActivityIndicator } from 'react-native';
import Icon from '@expo/vector-icons/MaterialIcons';
import axios from 'axios';
import HeaderBar from '@/components/Header';
import HeaderBarwithBack from '@/components/Header';
import { yarnstockverificatio_styles } from '@/common/Style';
import CustomDrawer from './CustomDrawer';
import CartonAddDrawer from './CartonAddDrawer';
import { ExeData, DesignData, ItemData, POTData, ItemStatus, CardPayload } from './Modal';
import YarnStockCard from './YarnStockCard';
import theme from '@/components/theme';
import { API, PRINTERSLISTAPI, PRINTSTICKER } from '../../common/API/dynamicAPI';
import { fetchAllPropertyData, fetchAllYeardata, fetchAllStoredata } from '../../common/API/Functions';
// import Snackbar from '@/common/utils/snackbarCompat';
import { showSnackbar, showSuccess, showError } from '@/common/utils/snackbar';
import FullScreenLoader from '@/components/FullScreenLoader';
import FabricQrScannerModal from './FabricQrScannerModal';
import { findFabricStockRow, parseFabricQr } from './fabricQr';


interface Props {
    token: string;
    // navigation: any;
    // isConnected: boolean | null;
    username: string;
}

//const YarnStockVerification: React.FC<Props> = ({ token, navigation, isConnected, username, getUserPrptype }) => {
// const YarnStockVerification = (props) => {
const FabricStockVerification: React.FC<Props> = ({ token, username }) => {
    // const { token, navigation, isConnected, username, getUserPrptype } = props;
    const [isLoading, setIsLoading] = useState(false);
    const [isDrawerVisible, setIsDrawerVisible] = useState(false);
    const [isCartonAddDrawerVisible, setIsCartonAddDrawerVisible] = useState(false);
    const [isQrScannerVisible, setIsQrScannerVisible] = useState(false);
    const [searchQueryPOT, setSearchQueryPOT] = useState('');
    const [fromDate, setFromDate] = useState<Date>(new Date());
    const [toDate, setToDate] = useState<Date>(new Date());
    const [selectedYear, setSelectedYear] = useState<string>('2025-2026');
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
    const [getAllPropertyData, setAllPropertyData] = useState([]);
    const [getAllYearData, setAllYearData] = useState([]);
    const [getAllStoreData, setAllStoreData] = useState([]);
    const [FormState, setFormState] = useState({
        values: {
            updateStock: '1',
            autoFound: '1',
            manual: '1',
            stockNotFound: '1',
            autoNotFound: '1',
            autoForRepacking: '1',
            duplicate: '1'
        }
    })
    const [FormCartonDataState, setFormCartonDataState] = useState({
        values: {
            PrpCode: typeof FormState.values.PrpCode != 'undefined' && FormState.values.PrpCode != null && FormState.values.PrpCode != '' ? FormState.values.PrpCode : '',
            YearNo: typeof FormState.values.YearNo != 'undefined' && FormState.values.YearNo != null && FormState.values.YearNo != '' ? FormState.values.YearNo : '',
            StrCode: typeof FormState.values.StrCode != 'undefined' && FormState.values.StrCode != null && FormState.values.StrCode != '' ? FormState.values.StrCode : '',
            grsWt: 0
        }
    })
    const [getAllStockData, setAllStockData] = useState([]);
    const [getAllStockDataInserted, setAllStockDataInserted] = useState([]);
    const [getSelectedStockRow, setSelectedStockRow] = useState({});
    const [getModalOpen, setModalOpen] = useState(false)
    const [getSavedCartons, setSavedCartons] = useState([])
    const [getPrintRow, setPrintRow] = useState({})
    const [getPrinters, setPrinters] = useState([])
    const [printer, setPrinter] = useState('')

    const rowsPerPage = 20;

    useEffect(() => {
        if (!token) {
            console.log('❌ Token not available yet, skipping property load');
            return;
        }

        const loadProperty = async (token) => {
            try {
                console.log('🔄 [Property] Fetching with token:', token?.substring(0, 20) + '...');
                const allprpdata = await fetchAllPropertyData(token);
                console.log('✅ [Property] API Response:', allprpdata);
                console.log('✅ [Property] Response Type:', typeof allprpdata, 'Is Array:', Array.isArray(allprpdata));
                console.log('✅ [Property] Response Length:', allprpdata?.length);

                if (allprpdata && allprpdata.length > 0) {
                    console.log('✅ [Property] First item:', JSON.stringify(allprpdata[0]));
                }

                setAllPropertyData(allprpdata || []);
            } catch (error) {
                console.error('❌ [Property] API Error:', error);
                setAllPropertyData([]);
            }
        };
        loadProperty(token);
    }, [token]);

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

    const getToken = () => {
        return token;
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
        const sendpayload = [sendCardPayload]
        setPayload(sendpayload as object as CardPayload[]);
        const headers = {
            Authorization: `Bearer ${getToken()}`,
            'Content-Type': 'application/json',
            'X-Requested-with': 'XMLHttpRequest',
        };
        try {
            const response = await axios.post(`${API}/api/prodorderlist`, payload, { headers });
            const response_details = await axios.post(`${API}/api/getparentdesign`, payload, { headers });
            if (response.data.success === true && response.data.data.length === 0) {
                setIsLoading(false);
                AppAlert.alert('No Data Found');
                setPOTData([]);
            } else if (response.data.success === true && response.data.data.length > 0) {
                setIsLoading(false);
                setPOTData(response.data.data);
                closeDrawer();
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
                setParentDesignData(response_details.data.data);
            }
        } catch (error) {
            setIsLoading(false);
            AppAlert.alert('Server Error');
            setPOTData([]);
        }
    };



    const handleDesignSelect = (designs: DesignData[]) => {
        setSelectedDesigns(designs);
    };
    const handleItemSelect = (items: ItemData[]) => {
        setSelectedItems(items);
    };
    const handleItemStatusChange = (status: ItemStatus) => {
        setSelectedItemStatus(status);
    };

    const handleLoadPress = () => {
        handleConfirmAction();
    };

    const openDrawer = () => setIsDrawerVisible(true);
    const closeDrawer = () => setIsDrawerVisible(false);
    const openNewCatonDrawer = () => setIsCartonAddDrawerVisible(true);
    const closeNewCatonDrawer = () => setIsCartonAddDrawerVisible(false);

    const openVerificationScanner = () => {
        if (!Array.isArray(getAllStockData) || getAllStockData.length === 0) {
            AppAlert.alert('Load Stock First', 'Select property/year and load fabric stock before scanning a taka.');
            return;
        }
        setIsQrScannerVisible(true);
    };

    const handleVerificationQrScanned = (rawValue: string) => {
        try {
            const qr = parseFabricQr(rawValue);
            const matchedRow = findFabricStockRow(getAllStockData, qr);
            setIsQrScannerVisible(false);

            if (matchedRow) {
                const alreadyVerified = String(matchedRow?.Status ?? '') === '2' || Number(matchedRow?.Chk ?? 0) === 1 || getSavedCartons.includes(matchedRow?.UId);
                if (alreadyVerified) {
                    AppAlert.alert('Already Verified', `Taka ${matchedRow?.CartNo || qr.CartNo || ''} is already verified.`);
                    return;
                }

                setSelectedStockRow(matchedRow);
                setModalOpen(true);
                return;
            }

            setFormCartonDataState((prev: any) => ({
                ...prev,
                values: {
                    ...prev.values,
                    PrpCode: qr.PrpCode || prev.values.PrpCode || FormState.values.PrpCode || '',
                    YearNo: qr.YearNo || prev.values.YearNo || FormState.values.YearNo || '',
                    StrCode: prev.values.StrCode || FormState.values.StrCode || '012',
                    CartNo: qr.CartNo || '',
                    ItmCode: qr.ItmCode || '',
                    DsnCode: qr.DsnCode || '',
                    ShdCode: qr.ShdCode || '',
                    Chees: '0',
                    grsWt: qr.Qty !== undefined && qr.Qty !== null ? String(qr.Qty) : '',
                    netWt: qr.Qty !== undefined && qr.Qty !== null ? String(qr.Qty) : '',
                    StkType: qr.StkType || prev.values.StkType || 'I',
                },
            }));

            AppAlert.alert(
                'Taka Not Found in System Stock',
                `Taka ${qr.CartNo || rawValue} is not in the loaded stock. Review the details and create a manual stock entry only if it is physically present.`,
                [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Open Manual Entry', onPress: () => setIsCartonAddDrawerVisible(true) },
                ]
            );
        } catch (error) {
            setIsQrScannerVisible(false);
            AppAlert.alert('Invalid QR', 'This QR could not be read as a fabric/taka QR code.');
        }
    };

    useEffect(() => {
        if (!token) return;
        if (typeof FormState.values.PrpCode == 'undefined' ||
            FormState.values.PrpCode == null ||
            FormState.values.PrpCode == '') {
            console.log('⏭️ [Year] PrpCode not set, skipping year load');
            setAllYearData([]);  // 🔥 IMPORTANT: Reset year data when prp changes
            setAllStoreData([]); // 🔥 IMPORTANT: Reset store data too
            return;
        }

        const testFinct = async (token) => {
            try {
                console.log('🔄 [Year] Fetching for PrpCode:', FormState.values.PrpCode);
                const allyeardata = await fetchAllYeardata(token, FormState.values.PrpCode);
                console.log('✅ [Year] API Response:', allyeardata);
                console.log('✅ [Year] Response Length:', allyeardata?.length);

                if (allyeardata && allyeardata.length > 0) {
                    console.log('✅ [Year] First item:', JSON.stringify(allyeardata[0]));
                }

                setAllYearData(allyeardata || []);
                // 🔥 Reset store when year changes
                setFormState(prev => ({
                    ...prev,
                    values: { ...prev.values, YearNo: '', StrCode: '' }
                }));
            } catch (error) {
                console.error('❌ [Year] API Error:', error);
                setAllYearData([]);
            }
        };
        testFinct(token);
    }, [FormState.values.PrpCode, token]);

    useEffect(() => {
        if (!token) return;
        console.log("FormState.values.YearNo", FormState.values.YearNo);
        if (typeof FormState.values.YearNo == 'undefined' ||
            FormState.values.YearNo == null ||
            FormState.values.YearNo == '') {
            console.log('⏭️ [Store] YearNo not set, skipping store load');
            setAllStoreData([]);
            return;
        }

        const testFinctStore = async (token) => {
            try {
                console.log('🔄 [Store] Fetching for PrpCode:', FormState.values.PrpCode, 'YearNo:', FormState.values.YearNo);
                const allstoredata = await fetchAllStoredata(token, FormState.values.PrpCode, FormState.values.YearNo, '');
                console.log('✅ [Store] API Response:', allstoredata);
                console.log('✅ [Store] Response Length:', allstoredata?.length);

                if (allstoredata && allstoredata.length > 0) {
                    console.log('✅ [Store] First item:', JSON.stringify(allstoredata[0]));
                }

                setAllStoreData(allstoredata || []);
                // 🔥 Reset store when year changes
                setFormState(prev => ({
                    ...prev,
                    values: { ...prev.values, StrCode: '' }
                }));
            } catch (error) {
                console.error('❌ [Store] API Error:', error);
                setAllStoreData([]);
            }
        };
        testFinctStore(token);
    }, [FormState.values.YearNo, token, FormState.values.PrpCode]);

    useEffect(() => {
        if (!token) return;
        if (typeof FormCartonDataState.values.PrpCode != 'undefined' && FormCartonDataState.values.PrpCode != null && FormCartonDataState.values.PrpCode != '') {
            const testFinct = async (token) => {
                const allyeardata = await fetchAllYeardata(token, FormCartonDataState.values.PrpCode)
                setAllYearData(allyeardata)
            }
            testFinct(token);
        }
    }, [FormCartonDataState.values.PrpCode, token])

    useEffect(() => {
        if (!token) return;
        if (typeof FormCartonDataState.values.YearNo != 'undefined' && FormCartonDataState.values.YearNo != null && FormCartonDataState.values.YearNo != '') {
            const testFinctStore = async (token) => {
                const allstoredata = await fetchAllStoredata(token, FormCartonDataState.values.PrpCode, FormCartonDataState.values.YearNo)
                setAllStoreData(allstoredata)
            }
            testFinctStore(token);
        }
    }, [FormCartonDataState.values.YearNo, token])


    const updateStockData = async () => {
        setModalOpen(false);
        setIsLoading(true);
        getSelectedStockRow['Chk'] = '1';

        const payload = {
            data: { getSelectedStockRow },
            prptype: 'S',
            prpcodes: [FormState.values.PrpCode],
            yearno: FormState.values.YearNo,
            strcode: FormState.values.StrCode,
            updateStock: FormState.values.updateStock,
            autoFound: typeof FormState.values.autoFound == 'undefined' || FormState.values.autoFound == null || FormState.values.autoFound == '' ? '0' : FormState.values.autoFound,
            manual: typeof FormState.values.manual == 'undefined' || FormState.values.manual == null || FormState.values.manual == '' ? '0' : FormState.values.manual,
            stockNotFound: typeof FormState.values.stockNotFound == 'undefined' || FormState.values.stockNotFound == null || FormState.values.stockNotFound == '' ? '0' : FormState.values.stockNotFound,
            autoNotFound: typeof FormState.values.autoNotFound == 'undefined' || FormState.values.autoNotFound == null || FormState.values.autoNotFound == '' ? '0' : FormState.values.autoNotFound,
            autoForRepacking: typeof FormState.values.autoForRepacking == 'undefined' || FormState.values.autoForRepacking == null || FormState.values.autoForRepacking == '' ? '0' : FormState.values.autoForRepacking,
            duplicate: typeof FormState.values.duplicate == 'undefined' || FormState.values.duplicate == null || FormState.values.duplicate == '' ? '0' : FormState.values.duplicate,
            txntype: 'fabricStockVerification',
            isstockupdate: '1'
        };
        const headers = {
            Authorization: `Bearer ${getToken()}`,
            'Content-Type': 'application/json',
            'X-Requested-with': 'XMLHttpRequest',
        };
        try {
            const response = await axios.post(`${API}/api/update_verify_manual_fabric_stock`, payload, { headers });

            if (response.data.success === true && response.data.data.length === 0) {
                AppAlert.alert('No Data Found');
                setIsLoading(false);
            } else if (response.data.success === true && response.data.data.length > 0) {
                setSavedCartons(getSavedCartons => [...getSavedCartons, response.data.data[0].UId]);
                // ✅ NEW SNACKBAR
                showSuccess('Taka verified successfully.', {
                    text: 'OK',
                    onPress: () => { },
                });
                setIsLoading(false);
            } else if (response.data.success === false) {
                AppAlert.alert(`${response.data.message}`);
                setIsLoading(false);
            } else {
                AppAlert.alert(`${response.data.message}`);
                setIsLoading(false);
            }
        } catch (error) {
            setIsLoading(false);
            AppAlert.alert('Server Error :' + error);
        }
        setModalOpen(false);
    };

    // const printSticker = (data) => {

    //     setIsLoading(true);
    //     console.log('printsticker function :', data);

    //     if (Object.keys(data).length > 0) {

    //         data.yearno = typeof FormState.values.YearNo != 'undefined' && FormState.values.YearNo != null && FormState.values.YearNo != '' ? FormState.values.YearNo : '99'
    //         const params = {
    //             data: [data],
    //             IskgQty: 0,
    //             printype: "Print",
    //             PrintFormat: 3,
    //             printerName: printer ? printer : '',
    //             txntype: 'yarnStockVerification'
    //         };
    //         const headers = {
    //             Authorization: `Bearer ${getToken()}`,
    //             'Content-Type': 'application/json',
    //             'X-Requested-with': 'XMLHttpRequest',
    //         };
    //         console.log("params :", params)
    //         console.log("url :", `${PRINTSTICKER}`)

    //         axios.post(`${PRINTSTICKER}`, params, { headers })
    //             .then(response => {
    //                 console.log("response :", response)
    //                 setIsLoading(false);
    //                 const res = response.data;

    //                 if (res.success) {
    //                     // Snackbar.show({
    //                     //     text: '✅ ${res.printed} label(s) sent to printer.',
    //                     //     duration: Snackbar.LENGTH_INDEFINITE,
    //                     //     backgroundColor: 'green',
    //                     //     action: { text: 'OK', textColor: 'white' },
    //                     // });
    //                     showSnackbar(`✅ ${res.printed} label(s) sent to printer.`, 'success', {
    //                         text: 'OK',
    //                         onPress: () => { },
    //                     });
    //                 } else {
    //                     // Snackbar.show({
    //                     //     text: res.message || 'Operation failed',
    //                     //     duration: Snackbar.LENGTH_INDEFINITE,
    //                     //     backgroundColor: 'red',
    //                     //     action: { text: 'OK', textColor: 'white' },
    //                     // });
    //                     // Error case (response)
    //                     showError(res.message || 'Operation failed', {
    //                         text: 'OK',
    //                         onPress: () => { },
    //                     });
    //                 }
    //             }).catch(error => {
    //                 setIsLoading(false);
    //                 // Snackbar.show({
    //                 //     text: error?.response?.data?.error || error.message || 'Print failed',
    //                 //     duration: Snackbar.LENGTH_LONG,
    //                 //     backgroundColor: 'red',
    //                 //     action: { text: 'OK', textColor: 'white' },
    //                 // });
    //                 // Error case (catch)
    //                 showError(error?.response?.data?.error || error.message || 'Print failed', {
    //                     text: 'OK',
    //                     onPress: () => { },
    //                 });
    //             });
    //     } else {
    //         setIsLoading(false);
    //         // Snackbar.show({
    //         //     text: 'printing sticker data is empty',
    //         //     duration: Snackbar.LENGTH_LONG,
    //         //     backgroundColor: 'red',
    //         //     textColor: '#fff',
    //         //     action: { text: 'OK', textColor: '#fff' },
    //         // });
    //         showError('printing sticker data is empty', {
    //             text: 'OK',
    //             onPress: () => { },
    //         });

    //     }
    // }
    const printSticker = (data) => {
        setIsLoading(true);
        console.log('printsticker function :', data);

        if (Object.keys(data).length > 0) {
            data.yearno = typeof FormState.values.YearNo != 'undefined' && FormState.values.YearNo != null && FormState.values.YearNo != '' ? FormState.values.YearNo : '99';
            const params = {
                data: [data],
                IskgQty: 0,
                printype: "Print",
                PrintFormat: 3,
                printerName: printer ? printer : '',
                txntype: 'fabricStockVerification'
            };
            const headers = {
                Authorization: `Bearer ${getToken()}`,
                'Content-Type': 'application/json',
                'X-Requested-with': 'XMLHttpRequest',
            };
            console.log("params :", params);
            console.log("url :", `${PRINTSTICKER}`);

            axios.post(`${PRINTSTICKER}`, params, { headers })
                .then(response => {
                    console.log("response :", response);
                    setIsLoading(false);
                    const res = response.data;

                    if (res.success) {
                        // ✅ NEW SNACKBAR
                        showSnackbar(`✅ ${res.printed} label(s) sent to printer.`, 'success', {
                            text: 'OK',
                            onPress: () => { },
                        });
                    } else {
                        // ✅ NEW SNACKBAR
                        showError(res.message || 'Operation failed', {
                            text: 'OK',
                            onPress: () => { },
                        });
                    }
                }).catch(error => {
                    setIsLoading(false);
                    // ✅ NEW SNACKBAR
                    showError(error?.response?.data?.error || error.message || 'Print failed', {
                        text: 'OK',
                        onPress: () => { },
                    });
                });
        } else {
            setIsLoading(false);
            // ✅ NEW SNACKBAR
            showError('printing sticker data is empty', {
                text: 'OK',
                onPress: () => { },
            });
        }
    };


    // Full-screen screens: render them instead of stacking them over the main screen.
    // This keeps the underlying list/header completely out of the view while Criteria/Add Carton is open.
    if (isCartonAddDrawerVisible) {
        return (
            <CartonAddDrawer
                isVisible={true}
                onClose={closeNewCatonDrawer}
                isLoading={isLoading}
                getAllPropertyData={getAllPropertyData}
                FormState={FormState}
                setFormState={setFormState}
                getAllYearData={getAllYearData}
                getAllStoreData={getAllStoreData}
                setAllStockData={setAllStockData}
                token={token}
                setFormCartonDataState={setFormCartonDataState}
                FormCartonDataState={FormCartonDataState}
                getAllStockDataInserted={getAllStockDataInserted}
                setAllStockDataInserted={setAllStockDataInserted}
            />
        );
    }

    if (isDrawerVisible) {
        return (
            <CustomDrawer
                isVisible={true}
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
                getAllPropertyData={getAllPropertyData}
                setAllPropertyData={setAllPropertyData}
                FormState={FormState}
                setFormState={setFormState}
                getAllYearData={getAllYearData}
                setAllYearData={setAllYearData}
                getAllStoreData={getAllStoreData}
                setAllStoreData={setAllStoreData}
                getAllStockData={getAllStockData}
                setAllStockData={setAllStockData}
                token={token}
            />
        );
    }

    return (
        <>
            {
                isLoading &&
                (
                    <View
                        style={{
                            position: "absolute",
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            justifyContent: "center",
                            alignItems: "center",
                            backgroundColor: "rgba(255,255,255,0.3)",
                            zIndex: 999,
                        }}
                    >
                        <ActivityIndicator size="large" color="#007EA7" />
                    </View>
                )
                // <FullScreenLoader />
            }
            <HeaderBar
                userName={username}
                header={'Fabric Stock Verification'}
                breadcrumb={'Fabric Stock Verification'}
                SearchBar={false}
            />
            {/* <HeaderBarwithBack
                userName={username}
                header={'Fabric Stock Verification'}
                subHeader={false}
                breadcrumb={'Fabric Stock Verification'}
                SearchBar={false}
            /> */}
            <View style={yarnstockverificatio_styles.container}>
                <View style={styles.mobileActionBar}>
                    <TouchableOpacity style={[styles.mobileAction, styles.primaryAction]} onPress={openVerificationScanner} activeOpacity={0.85}>
                        <Icon name="qr-code-scanner" size={22} color="#FFFFFF" />
                        <View style={styles.mobileActionTextWrap}>
                            <Text style={styles.mobileActionTitleLight}>Scan Taka</Text>
                            <Text style={styles.mobileActionSubtitleLight}>Find & verify stock</Text>
                        </View>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.mobileAction} onPress={openNewCatonDrawer} activeOpacity={0.85}>
                        <Icon name="add-box" size={22} color="#087FA3" />
                        <View style={styles.mobileActionTextWrap}>
                            <Text style={styles.mobileActionTitle}>Manual Entry</Text>
                            <Text style={styles.mobileActionSubtitle}>Physical, not in system</Text>
                        </View>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.squareAction} onPress={openDrawer} activeOpacity={0.85}>
                        <Icon name="tune" size={24} color="#087FA3" />
                        <Text style={styles.squareActionText}>Filter</Text>
                    </TouchableOpacity>
                </View>
                <View style={styles.legendContainer}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.legendScroll}>
                        {[
                            ['#FFFFFF', '#9AA6AD', 'Auto not found'],
                            ['#FFFBE6', '#D4A900', 'Auto found'],
                            ['#F7F2FF', '#8B63C7', 'Auto for repacking'],
                            ['#F0FCFD', '#168A92', 'Manual'],
                            ['#F4FAF6', '#5D8A6C', 'Duplicate'],
                            ['#FFF4FB', '#B35D9E', 'Stock not found'],
                        ].map(([bg, border, label]) => (
                            <View key={label} style={[styles.legendChip, { backgroundColor: bg, borderColor: border }]}>
                                <View style={[styles.legendDot, { backgroundColor: bg, borderColor: border }]} />
                                <Text style={styles.legendText}>{label}</Text>
                            </View>
                        ))}
                    </ScrollView>
                </View>
                <YarnStockCard gePOTData={getAllStockData} searchQueryPOT={searchQueryPOT} getpayload={getpayload} token={token} parentDesignData={parentDesignData} setSelectedStockRow={setSelectedStockRow} getSelectedStockRow={getSelectedStockRow} setModalOpen={setModalOpen} setSavedCartons={setSavedCartons} getSavedCartons={getSavedCartons} printSticker={printSticker} getPrintRow={getPrintRow} setPrintRow={setPrintRow} />
            </View>
            <FabricQrScannerModal
                visible={isQrScannerVisible}
                title="Scan Taka for Verification"
                subtitle="Scan a physical taka to match it with loaded system stock"
                onClose={() => setIsQrScannerVisible(false)}
                onScanned={handleVerificationQrScanned}
            />
            <CartonAddDrawer
                isVisible={isCartonAddDrawerVisible}
                onClose={closeNewCatonDrawer}
                isLoading={isLoading}
                getAllPropertyData={getAllPropertyData}
                FormState={FormState}
                setFormState={setFormState}
                getAllYearData={getAllYearData}
                getAllStoreData={getAllStoreData}
                setAllStockData={setAllStockData}
                token={token}
                setFormCartonDataState={setFormCartonDataState}
                FormCartonDataState={FormCartonDataState}
                getAllStockDataInserted={getAllStockDataInserted}
                setAllStockDataInserted={setAllStockDataInserted}
            />
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
                getAllPropertyData={getAllPropertyData}
                setAllPropertyData={setAllPropertyData}
                FormState={FormState}
                setFormState={setFormState}
                getAllYearData={getAllYearData}
                setAllYearData={setAllYearData}
                getAllStoreData={getAllStoreData}
                setAllStoreData={setAllStoreData}
                getAllStockData={getAllStockData}
                setAllStockData={setAllStockData}
                token={token}
            />
            {
                getModalOpen && (
                    <Modal
                        visible={getModalOpen}
                        transparent
                        animationType="fade">
                        <View style={styles.confirmOverlay}>
                            <View style={styles.confirmBox}>

                                <Text style={styles.confirmTitle}>Verify Physical Taka</Text>
                                {/* <View style={styles.row}>
                                    <Text style={styles.label}>UID :</Text>
                                    <Text style={styles.value}>{getSelectedStockRow?.UId}</Text>
                                </View> */}

                                <View style={styles.row}>
                                    <Text style={styles.label}>Taka No. :</Text>
                                    <Text style={styles.value}>{getSelectedStockRow?.CartNo}</Text>
                                </View>

                                <View style={styles.row}>
                                    <Text style={styles.label}>Item :</Text>
                                    <Text style={styles.value}>{getSelectedStockRow?.ItmName} </Text>
                                </View>

                                <View style={styles.row}>
                                    <Text style={styles.label}>Merge :</Text>
                                    <Text style={styles.value}>{getSelectedStockRow?.MerName}</Text>
                                </View>

                                <View style={styles.row}>
                                    <Text style={styles.label}>Grade :</Text>
                                    <Text style={styles.value}>{getSelectedStockRow?.GrdName}</Text>
                                </View>

                                <View style={styles.row}>
                                    <Text style={styles.label}>Shade :</Text>
                                    <Text style={styles.value}>{getSelectedStockRow?.ShdName}</Text>
                                </View>
                                <View style={styles.row}>
                                    <Text style={styles.label}>Chees :</Text>
                                    <Text style={styles.value}>{getSelectedStockRow?.Chees}</Text>
                                </View>
                                <View style={styles.row}>
                                    <Text style={styles.label}>System Meter :</Text>
                                    <Text style={styles.value}>{getSelectedStockRow?.Wt}</Text>
                                </View>

                                <View style={styles.row}>
                                    <Text style={styles.label}>Stk. type :</Text>
                                    <Text style={styles.value}>{getSelectedStockRow?.StkType}</Text>
                                </View>
                                <Text style={styles.confirmText}>Confirm that this taka is physically present. System meter will not be changed.</Text>
                                {/* 
                                
                                <Text style={styles.confirmText}> UID : {getSelectedStockRow?.UId} </Text>
                                <Text style={styles.confirmText}> Carton  : {getSelectedStockRow?.CartNo} </Text>
                                <Text style={styles.confirmText}> Item  : {getSelectedStockRow?.ItmName} </Text>
                                <Text style={styles.confirmText}> Merge  : {getSelectedStockRow?.MerName} </Text>
                                <Text style={styles.confirmText}> Grade  : {getSelectedStockRow?.GrdName} </Text>
                                <Text style={styles.confirmText}> Shade  : {getSelectedStockRow?.ShdName} </Text> */}
                                <View style={styles.confirmButtons}>
                                    <TouchableOpacity
                                        style={[styles.confirmBtn, { backgroundColor: "#6F7C82" }]}
                                        onPress={() => { setModalOpen(false) }}>
                                        <Icon name="close" size={18} color="#fff" /><Text style={styles.confirmBtnText}>Cancel</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.confirmBtn, { backgroundColor: "#087FA3" }]}
                                        onPress={updateStockData}>
                                        <Icon name="verified" size={18} color="#fff" /><Text style={[styles.confirmBtnText, { color: "#fff", marginLeft: 5 }]}>Mark Verified</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    </Modal>
                )
            }
        </>
    );
};

const styles = StyleSheet.create({
    mobileActionBar: { flexDirection: 'row', alignItems: 'stretch', gap: 8, paddingHorizontal: 10, paddingTop: 9, paddingBottom: 8, backgroundColor: '#F6FAFB', borderBottomWidth: 1, borderBottomColor: '#E2ECEF' },
    mobileAction: { flex: 1, minHeight: 58, borderRadius: 14, borderWidth: 1, borderColor: '#B9DDE5', backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 11, gap: 9 },
    primaryAction: { backgroundColor: '#087FA3', borderColor: '#087FA3' },
    mobileActionTextWrap: { flex: 1, minWidth: 0 },
    mobileActionTitle: { color: '#173B45', fontSize: 13, fontWeight: '900' },
    mobileActionSubtitle: { color: '#71848B', fontSize: 10.5, marginTop: 2 },
    mobileActionTitleLight: { color: '#FFFFFF', fontSize: 13, fontWeight: '900' },
    mobileActionSubtitleLight: { color: '#D8F1F6', fontSize: 10.5, marginTop: 2 },
    squareAction: { width: 60, minHeight: 58, borderRadius: 14, borderWidth: 1, borderColor: '#B9DDE5', backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
    squareActionText: { color: '#45616A', fontSize: 10.5, fontWeight: '800', marginTop: 2 },
    fab: {
        position: 'absolute', bottom: 28, left: 18, backgroundColor: '#087FA3',
        width: 48, height: 48, borderRadius: 24, justifyContent: 'center',
        alignItems: 'center', zIndex: 999, elevation: 8,
        shadowColor: '#17343D', shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.22, shadowRadius: 5
    },
    fabAdd: {
        position: 'absolute', bottom: 88, left: 18, backgroundColor: '#087FA3',
        width: 48, height: 48, borderRadius: 24, justifyContent: 'center',
        alignItems: 'center', zIndex: 999, elevation: 8,
        shadowColor: '#17343D', shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.22, shadowRadius: 5
    },
    legendContainer: {
        backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E4EAED',
        marginBottom: 5, paddingVertical: 7
    },
    legendScroll: { paddingHorizontal: 12, alignItems: 'center' },
    legendChip: {
        flexDirection: 'row', alignItems: 'center', borderWidth: 1,
        borderRadius: 18, paddingHorizontal: 10, paddingVertical: 6, marginRight: 7
    },
    legendDot: { width: 11, height: 11, borderRadius: 5.5, borderWidth: 1.5, marginRight: 6 },
    legendText: { color: '#445158', fontSize: 11, fontWeight: '600' },

    confirmOverlay: { flex: 1, backgroundColor: 'rgba(14, 40, 48, 0.42)', justifyContent: 'center', alignItems: 'center', padding: 20 },
    confirmBox: {
        width: '100%', maxWidth: 390, backgroundColor: '#fff', borderRadius: 18,
        padding: 18, elevation: 10, shadowColor: '#000', shadowOpacity: 0.18,
        shadowRadius: 16, shadowOffset: { width: 0, height: 7 }
    },
    confirmTitle: { fontSize: 19, fontWeight: '800', color: '#173B45', textAlign: 'center', marginBottom: 4 },
    confirmText: { fontSize: 13, color: '#68767C', textAlign: 'center', marginTop: 10, marginBottom: 10 },
    confirmButtons: { flexDirection: 'row', marginTop: 10, gap: 9 },
    confirmBtn: { flex: 1, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    confirmBtnText: { fontSize: 14, fontWeight: '800', color: '#fff' },
    row: {
        flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 6,
        borderBottomWidth: 1, borderBottomColor: '#F0F3F4'
    },
    label: { fontSize: 12.5, fontWeight: '700', color: '#718087', width: '28%' },
    value: { fontSize: 13.5, color: '#253238', fontWeight: '600', flex: 1, textAlign: 'left' },
});
export default FabricStockVerification;
