import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Modal, ScrollView, ActivityIndicator, TextInput } from 'react-native';
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
// import Snackbar from 'react-native-snackbar';
import { showSnackbar, showSuccess, showError } from '@/common/utils/snackbar';
import FullScreenLoader from '@/components/FullScreenLoader';
import FabricQrScannerModal from './FabricQrScannerModal';
import { findFabricStockRow, parseFabricQr } from './fabricQr';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
            CartNo: '',
            ItmCode: '',
            DsnCode: '',
            ShdCode: '',
            Chees: 0,
            grsWt: 0,
            netWt: '',
            IsAlumMoving: false,
            StkType: 'I'
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
    const [quickStatusFilter, setQuickStatusFilter] = useState<string>('all');
    const [printerLoading, setPrinterLoading] = useState(false)
    const [printerError, setPrinterError] = useState('')
    const [printerModalVisible, setPrinterModalVisible] = useState(false)
    const [printerSearch, setPrinterSearch] = useState('')
    const [pendingPrintData, setPendingPrintData] = useState<any>(null)

    const rowsPerPage = 20;

    // Fast warehouse filters. Status values come from the existing fabric
    // verification backend and are not changed by this UI. Rows verified in
    // the current session are treated as AUTO FOUND immediately, even before
    // the next API reload.
    const getQuickStatusKey = (row: any): string => {
        const savedNow = Array.isArray(getSavedCartons) && getSavedCartons.includes(row?.UId);
        const status = String(row?.Status ?? '');

        if (savedNow || status === '2') return 'autoFound';
        if (status === '3') return 'autoForRepacking';
        if (status === '4') return 'duplicate';
        if (status === '5') return 'stockNotFound';
        if (status === '0') return 'manual';
        // Existing backend Status=1 is the auto row waiting to be found / verified.
        return 'autoNotFound';
    };

    const filteredStockData = useMemo(() => {
        const rows = Array.isArray(getAllStockData) ? getAllStockData : [];
        if (quickStatusFilter === 'all') return rows;
        return rows.filter((row: any) => getQuickStatusKey(row) === quickStatusFilter);
    }, [getAllStockData, getSavedCartons, quickStatusFilter]);

    const quickFilterCounts = useMemo(() => {
        const counts: Record<string, number> = {
            all: 0,
            autoNotFound: 0,
            autoFound: 0,
            autoForRepacking: 0,
            manual: 0,
            duplicate: 0,
            stockNotFound: 0,
        };

        const rows = Array.isArray(getAllStockData) ? getAllStockData : [];
        counts.all = rows.length;
        rows.forEach((row: any) => {
            const key = getQuickStatusKey(row);
            if (typeof counts[key] === 'number') counts[key] += 1;
        });
        return counts;
    }, [getAllStockData, getSavedCartons]);

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
                Alert.alert('No Data Found');
                setPOTData([]);
            } else if (response.data.success === true && response.data.data.length > 0) {
                setIsLoading(false);
                setPOTData(response.data.data);
                closeDrawer();
            } else if (response.data.success === false) {
                setIsLoading(false);
                Alert.alert(`${response.data.message}`);
                setPOTData([]);
            } else {
                setIsLoading(false);
                Alert.alert(`${response.data.message}`);
                setPOTData([]);
            }
            if (response_details.data.success === true && response_details.data.data.length > 0) {
                setParentDesignData(response_details.data.data);
            }
        } catch (error) {
            setIsLoading(false);
            Alert.alert('Server Error');
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
    // Always start Manual Entry with a clean entry form.
    // Property / Year / Store remain inherited from the verification context.
    const resetManualEntryForm = () => {
        setFormCartonDataState(prev => ({
            ...prev,
            values: {
                ...prev.values,
                PrpCode: prev.values.PrpCode || FormState.values.PrpCode || '',
                YearNo: prev.values.YearNo || FormState.values.YearNo || '',
                StrCode: prev.values.StrCode || FormState.values.StrCode || '',
                CartNo: '',
                ItmCode: '',
                DsnCode: '',
                ShdCode: '',
                Chees: 0,
                grsWt: 0,
                netWt: '',
                IsAlumMoving: false,
                StkType: prev.values.StkType || 'I',
            },
        }));
    };

    const openNewCatonDrawer = () => {
        resetManualEntryForm();
        setIsCartonAddDrawerVisible(true);
    };

    const closeNewCatonDrawer = () => setIsCartonAddDrawerVisible(false);

    const openVerificationScanner = () => {
        if (!Array.isArray(getAllStockData) || getAllStockData.length === 0) {
            Alert.alert('Load Stock First', 'Select property/year and load fabric stock before scanning a taka.');
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
                    Alert.alert('Already Verified', `Taka ${matchedRow?.CartNo || qr.CartNo || ''} is already verified.`);
                    return;
                }

                setSelectedStockRow(matchedRow);
                setModalOpen(true);
                return;
            }

            // Do NOT copy the scanned QR payload into Manual Entry.
            // Manual Entry is a fresh operator-entry form. This is especially
            // important when the QR parser cannot identify a valid Taka No.
            Alert.alert(
                'Taka Not Found',
                `Scanned Taka ${qr.CartNo || 'could not be identified'} is not found.`,
                [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Manual Entry', onPress: openNewCatonDrawer },
                ]
            );
        } catch (error) {
            setIsQrScannerVisible(false);
            Alert.alert('Invalid QR', 'This QR could not be read as a fabric/taka QR code.');
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
                Alert.alert('No Data Found');
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
                Alert.alert(`${response.data.message}`);
                setIsLoading(false);
            } else {
                Alert.alert(`${response.data.message}`);
                setIsLoading(false);
            }
        } catch (error) {
            setIsLoading(false);
            Alert.alert('Server Error :' + error);
        }
        setModalOpen(false);
    };


    // const printSticker = (data) => {
    //     setIsLoading(true);
    //     console.log('printsticker function :', data);

    //     if (Object.keys(data).length > 0) {
    //         data.yearno = typeof FormState.values.YearNo != 'undefined' && FormState.values.YearNo != null && FormState.values.YearNo != '' ? FormState.values.YearNo : '99';
    //         const params = {
    //             data: [data],
    //             IskgQty: 0,
    //             printype: "Print",
    //             PrintFormat: 5,
    //             printerName: printer ? printer : '',
    //             txntype: 'fabricStockVerification'
    //         };
    //         const headers = {
    //             Authorization: `Bearer ${getToken()}`,
    //             'Content-Type': 'application/json',
    //             'X-Requested-with': 'XMLHttpRequest',
    //         };
    //         console.log("params :", params);
    //         console.log("url :", `${PRINTSTICKER}`);

    //         axios.post(`${PRINTSTICKER}`, params, { headers })
    //             .then(response => {
    //                 console.log("response :", response);
    //                 setIsLoading(false);
    //                 const res = response.data;

    //                 if (res.success) {
    //                     // ✅ NEW SNACKBAR
    //                     showSnackbar(`✅ ${res.printed} label(s) sent to printer.`, 'success', {
    //                         text: 'OK',
    //                         onPress: () => { },
    //                     });
    //                 } else {
    //                     // ✅ NEW SNACKBAR
    //                     showError(res.message || 'Operation failed', {
    //                         text: 'OK',
    //                         onPress: () => { },
    //                     });
    //                 }
    //             }).catch(error => {
    //                 setIsLoading(false);
    //                 // ✅ NEW SNACKBAR
    //                 showError(error?.response?.data?.error || error.message || 'Print failed', {
    //                     text: 'OK',
    //                     onPress: () => { },
    //                 });
    //             });
    //     } else {
    //         setIsLoading(false);
    //         // ✅ NEW SNACKBAR
    //         showError('printing sticker data is empty', {
    //             text: 'OK',
    //             onPress: () => { },
    //         });
    //     }
    // };


    const getPrinterHeaders = () => ({
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'x-api-key': 'PRINT_SECRET_123',
    });

    const getPrintersUrl = () =>
        `${String(API).replace(/\/$/, '')}/api/printers`;

    const normalizePrinterList = (raw: any) => {
        const list =
            raw?.printers ||
            raw?.data?.printers ||
            raw?.data ||
            raw ||
            [];

        if (!Array.isArray(list)) return [];

        return list.map((item: any) => ({
            ...item,
            Name: item?.Name || item?.name || '',
            StatusText: item?.StatusText || item?.status || 'Idle',
        }));
    };

    const getPrinterStatusColor = (status: string) =>
        status === 'Offline' ? '#DC2626' : '#16A34A';

    const getAllPrinters = async () => {
        if (!token) return;

        setPrinterLoading(true);
        setPrinterError('');

        try {
            const res = await axios.get(getPrintersUrl(), {
                headers: getPrinterHeaders(),
            });

            const list = normalizePrinterList(res?.data);
            setPrinters(list);

            const last = await AsyncStorage.getItem('lastSelectedPrinter');

            if (last) {
                const savedPrinter = list.find((p: any) => p?.Name === last);
                if (savedPrinter) {
                    setPrinter(savedPrinter.Name);
                }
            }
        } catch (error) {
            console.log(
                'PRINTER LIST ERROR ::',
                error?.response?.data || error?.message || error
            );
            setPrinters([]);
            setPrinterError('Unable to load printers');
        } finally {
            setPrinterLoading(false);
        }
    };

    const openPrinterList = async (data: any = null) => {
        setPendingPrintData(data);
        setPrinterSearch('');

        if (getPrinters.length === 0) {
            await getAllPrinters();
        }

        setPrinterModalVisible(true);
    };

    const selectPrinter = async (printerItem: any) => {
        const selectedName = printerItem?.Name || '';
        if (!selectedName) return;

        setPrinter(selectedName);

        await AsyncStorage.setItem(
            'lastSelectedPrinter',
            selectedName
        );

        setPrinterModalVisible(false);
        setPrinterSearch('');

        // Continue the pending print only after a printer is selected.
        if (pendingPrintData) {
            const dataToPrint = pendingPrintData;
            setPendingPrintData(null);
            printSticker(dataToPrint, selectedName);
        }
    };

    const printSticker = (data, selectedPrinterName = printer) => {
        if (!selectedPrinterName) {
            openPrinterList(data);
            return;
        }

        setIsLoading(true);
        console.log('printsticker function :', data);

        if (Object.keys(data).length > 0) {
            const yearno =
                typeof FormState.values.YearNo !== 'undefined' &&
                    FormState.values.YearNo !== null &&
                    FormState.values.YearNo !== ''
                    ? FormState.values.YearNo
                    : '99';

            // Keep the print payload in the same mapped-object format
            // instead of sending the complete card/row object directly.
            const tempPayloadObj = {
                UId: data.UId ?? "0",
                TranDate: data.TranDate ?? "0",
                PrpCode: data.PrpCode ?? "",
                StrCode: data.StrCode ?? "0",
                ItmCode: data.ItmCode ?? "0",
                MerCode: data.MerCode ?? "0",
                ShdCode: data.ShdCode ?? "0",
                GrdCode: data.GrdCode ?? "0",
                Denier: data.Denier ?? "0",
                DsnCode: data.DsnCode ?? "0",
                CartNo: data.CartNo ?? "",
                Wt: data.Wt ?? "0",
                Chees: data.Chees ?? "",
                IsAuto: data.IsAuto ?? "0",
                GrossWt: data.GrossWt ?? "0",
                PUId: data.PUId ?? "0",
                PSrNo: data.PSrNo ?? "0",
                PSubSr: data.PSubSr ?? "0",
                TranType: data.Trantype ?? "0",
                TranName: data.TranName ?? "",
                StkType: data.StkType ?? "",
                StkDate: data.StkDate ?? "",
                SrNo: data.SrNo ?? "0",
                UsrCode: data.UsrCode ?? "0",
                StrName: "",
                ItmName: data.ItmName ?? "",
                MerName: data.MerName ?? "",
                ShdName: data.ShdName ?? "",
                GrdName: data.GrdName ?? "",
                DnsName: data.DsnName ?? "",
                Stktype: data.StkType ?? "",
                nStkDate: data.nStkDate ?? "",
                yearno: yearno ?? "0",
                IskgQty: "0",
                Rate: "0",
                MItmCode: "0",
                MItmName: ""
            };

            const params = {
                data: [tempPayloadObj],
                IskgQty: 0,
                printype: "Print",
                PrintFormat: 5,
                printerName: selectedPrinterName || '',
                txntype: 'fabricStockVerification'
            };
            const headers = {
                Authorization: `Bearer ${getToken()}`,
                'Content-Type': 'application/json',
                'X-Requested-with': 'XMLHttpRequest',
            };
            console.log("tempPayloadObj :", tempPayloadObj);
            console.log("params :", params);
            console.log("url :", `${PRINTSTICKER}`);
            // return;
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
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,

                            justifyContent: 'center',
                            alignItems: 'center',

                            backgroundColor: 'rgba(255,255,255,0.45)',

                            zIndex: 9999,
                            elevation: 9999,
                        }}
                    >
                        <View
                            style={{
                                width: 70,
                                height: 70,
                                borderRadius: 35,
                                backgroundColor: '#fff',

                                justifyContent: 'center',
                                alignItems: 'center',

                                elevation: 8,

                                shadowColor: '#000',
                                shadowOffset: {
                                    width: 0,
                                    height: 3,
                                },
                                shadowOpacity: 0.25,
                                shadowRadius: 6,
                            }}
                        >
                            <ActivityIndicator
                                size="large"
                                color="#0788A8"
                            />
                        </View>
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
                            { key: 'all', bg: '#F2F8FA', border: '#087FA3', label: 'All' },
                            { key: 'autoNotFound', bg: '#FFFFFF', border: '#9AA6AD', label: 'Not Verified' },
                            { key: 'autoFound', bg: '#FFFBE6', border: '#D4A900', label: 'Verified' },
                            // { key: 'autoForRepacking', bg: '#F7F2FF', border: '#8B63C7', label: 'Auto for repacking' },
                            { key: 'manual', bg: '#F0FCFD', border: '#168A92', label: 'Manual' },
                            // { key: 'duplicate', bg: '#F4FAF6', border: '#5D8A6C', label: 'Duplicate' },
                            // { key: 'stockNotFound', bg: '#FFF4FB', border: '#B35D9E', label: 'Stock not found' },
                        ].map((filter) => {
                            const active = quickStatusFilter === filter.key;
                            const count = quickFilterCounts[filter.key] || 0;
                            return (
                                <TouchableOpacity
                                    key={filter.key}
                                    activeOpacity={0.8}
                                    onPress={() => setQuickStatusFilter(active && filter.key !== 'all' ? 'all' : filter.key)}
                                    style={[
                                        styles.legendChip,
                                        { backgroundColor: filter.bg, borderColor: filter.border },
                                        active && styles.legendChipActive,
                                    ]}
                                >
                                    {active ? (
                                        <Icon name="check-circle" size={16} color={filter.border} />
                                    ) : (
                                        <View style={[styles.legendDot, { backgroundColor: filter.bg, borderColor: filter.border }]} />
                                    )}
                                    <Text style={[styles.legendText, active && styles.legendTextActive]}>{filter.label}</Text>
                                    <View style={[styles.legendCount, { borderColor: filter.border }]}>
                                        <Text style={styles.legendCountText}>{count}</Text>
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                </View>
                <YarnStockCard gePOTData={filteredStockData} searchQueryPOT={searchQueryPOT} getpayload={getpayload} token={token} parentDesignData={parentDesignData} setSelectedStockRow={setSelectedStockRow} getSelectedStockRow={getSelectedStockRow} setModalOpen={setModalOpen} setSavedCartons={setSavedCartons} getSavedCartons={getSavedCartons} printSticker={printSticker} getPrintRow={getPrintRow} setPrintRow={setPrintRow} />
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
            <Modal
                transparent
                visible={printerModalVisible}
                animationType="slide"
                onRequestClose={() => {
                    setPrinterModalVisible(false);
                    setPrinterSearch('');
                    setPendingPrintData(null);
                }}
            >
                <View style={styles.printerOverlay}>
                    <View style={styles.printerSheet}>
                        <View style={styles.printerHeader}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.printerTitle}>Select Printer</Text>
                            </View>

                            <TouchableOpacity
                                onPress={() => {
                                    setPrinterModalVisible(false);
                                    setPrinterSearch('');
                                    setPendingPrintData(null);
                                }}
                                style={styles.printerCloseBtn}
                            >
                                <Icon name="close" size={20} color="#111827" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.printerSearchWrap}>
                            <Icon name="search" size={20} color="#6B7280" />
                            <TextInput
                                placeholder="Search printer..."
                                placeholderTextColor="#777"
                                value={printerSearch}
                                onChangeText={setPrinterSearch}
                                style={styles.printerSearchInput}
                            />
                        </View>

                        {printerLoading ? (
                            <View style={styles.printerEmptyBox}>
                                <ActivityIndicator size="small" color="#087FA3" />
                                <Text style={styles.printerEmptyText}>
                                    Loading printers...
                                </Text>
                            </View>
                        ) : printerError ? (
                            <View style={styles.printerEmptyBox}>
                                <Text style={styles.printerErrorText}>
                                    {printerError}
                                </Text>
                                <TouchableOpacity
                                    onPress={getAllPrinters}
                                    style={styles.printerRetryBtn}
                                >
                                    <Text style={styles.printerRetryText}>Retry</Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <ScrollView
                                keyboardShouldPersistTaps="handled"
                                showsVerticalScrollIndicator={false}
                            >
                                {getPrinters
                                    .filter((p: any) =>
                                        String(p?.Name || '')
                                            .toLowerCase()
                                            .includes(printerSearch.toLowerCase())
                                    )
                                    .map((printerItem: any, index: number) => (
                                        <TouchableOpacity
                                            key={`${printerItem?.Name || 'printer'}-${index}`}
                                            onPress={() => selectPrinter(printerItem)}
                                            style={[
                                                styles.printerItem,
                                                printer === printerItem?.Name &&
                                                styles.printerItemSelected,
                                            ]}
                                        >
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.printerName}>
                                                    {printerItem?.Name || 'Unnamed Printer'}
                                                </Text>

                                                <Text
                                                    style={[
                                                        styles.printerStatus,
                                                        {
                                                            color: getPrinterStatusColor(
                                                                printerItem?.StatusText
                                                            ),
                                                        },
                                                    ]}
                                                >
                                                    {printerItem?.StatusText || 'Idle'}
                                                </Text>
                                            </View>

                                            {printer === printerItem?.Name && (
                                                <Icon
                                                    name="check-circle"
                                                    size={24}
                                                    color="#087FA3"
                                                />
                                            )}
                                        </TouchableOpacity>
                                    ))}

                                {getPrinters.filter((p: any) =>
                                    String(p?.Name || '')
                                        .toLowerCase()
                                        .includes(printerSearch.toLowerCase())
                                ).length === 0 && (
                                        <View style={styles.printerEmptyBox}>
                                            <Icon
                                                name="print-disabled"
                                                size={32}
                                                color="#9CA3AF"
                                            />
                                            <Text style={styles.printerEmptyText}>
                                                No printer found
                                            </Text>
                                        </View>
                                    )}
                            </ScrollView>
                        )}
                    </View>
                </View>
            </Modal>
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
        borderRadius: 18, paddingHorizontal: 10, paddingVertical: 6, marginRight: 7,
        minHeight: 34
    },
    legendChipActive: { borderWidth: 2, paddingHorizontal: 9, paddingVertical: 5 },
    legendDot: { width: 11, height: 11, borderRadius: 5.5, borderWidth: 1.5, marginRight: 6 },
    legendText: { color: '#445158', fontSize: 11, fontWeight: '600', marginLeft: 5 },
    legendTextActive: { color: '#24363C', fontWeight: '800' },
    legendCount: {
        minWidth: 22, height: 20, borderRadius: 10, borderWidth: 1, marginLeft: 7,
        paddingHorizontal: 5, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF'
    },
    legendCountText: { color: '#445158', fontSize: 10, fontWeight: '800' },

    confirmOverlay: { flex: 1, backgroundColor: 'rgba(14, 40, 48, 0.42)', justifyContent: 'center', alignItems: 'center', padding: 20 },
    confirmBox: {
        width: '100%', maxWidth: 390, backgroundColor: '#fff', borderRadius: 18,
        padding: 18, elevation: 10, shadowColor: '#000', shadowOpacity: 0.18,
        shadowRadius: 16, shadowOffset: { width: 0, height: 7 }
    },
    legendCountText: { color: '#445158', fontSize: 10, fontWeight: '800' },

    printerOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.45)',
        justifyContent: 'flex-end',
    },
    printerSheet: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 25,
        borderTopRightRadius: 25,
        padding: 20,
        maxHeight: '80%',
    },
    printerHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
    },
    printerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#111827',
    },
    printerCloseBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#F1F5F9',
        justifyContent: 'center',
        alignItems: 'center',
    },
    printerSearchWrap: {
        height: 50,
        borderWidth: 1,
        borderColor: '#D1D5DB',
        borderRadius: 12,
        paddingHorizontal: 12,
        marginBottom: 12,
        flexDirection: 'row',
        alignItems: 'center',
    },
    printerSearchInput: {
        flex: 1,
        height: 48,
        paddingHorizontal: 10,
        color: '#111827',
    },
    printerItem: {
        padding: 15,
        borderBottomWidth: 1,
        borderColor: '#EEEEEE',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderRadius: 10,
    },
    printerItemSelected: {
        backgroundColor: '#E8F7F9',
    },
    printerName: {
        fontWeight: '700',
        fontSize: 15,
        color: '#111827',
    },
    printerStatus: {
        marginTop: 3,
        fontWeight: '600',
        fontSize: 13,
    },
    printerEmptyBox: {
        minHeight: 100,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 20,
    },
    printerEmptyText: {
        marginTop: 8,
        color: '#6B7280',
        fontSize: 14,
    },
    printerErrorText: {
        color: '#DC2626',
        fontSize: 14,
        textAlign: 'center',
    },
    printerRetryBtn: {
        marginTop: 10,
        paddingHorizontal: 20,
        paddingVertical: 9,
        borderRadius: 10,
        backgroundColor: '#087FA3',
    },
    printerRetryText: {
        color: '#fff',
        fontWeight: '700',
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
