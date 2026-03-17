import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Modal } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import axios from 'axios';
import HeaderBar from '../HeaderBar/HeaderBar';
import { yarnstockverificatio_styles } from '../../common/Styles/Style';
import CustomDrawer from './CustomDrawer';
import CartonAddDrawer from './CartonAddDrawer';
import { ExeData, DesignData, ItemData, POTData, ItemStatus, CardPayload } from './Modal';
import YarnStockCard from './YarnStockCard';
import theme from '../../android/app/src/theme';
import { API } from '../../common/API/dynamicAPI';
import { fetchAllPropertyData, fetchAllYeardata, fetchAllStoredata } from '../../common/API/Functions';
import Snackbar from 'react-native-snackbar';
import FullScreenLoader from '../Loader/Loader';

//const YarnStockVerification: React.FC<Props> = ({ token, navigation, isConnected, username, getUserPrptype }) => {
const YarnStockVerification = (props) => {
    const { token, navigation, isConnected, username, getUserPrptype } = props;
    console.log("getUserPrptype ====>", getUserPrptype)
    const [isLoading, setIsLoading] = useState(false);
    const [isDrawerVisible, setIsDrawerVisible] = useState(false);
    const [isCartonAddDrawerVisible, setIsCartonAddDrawerVisible] = useState(false);
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
            StrCode: typeof FormState.values.StrCode != 'undefined' && FormState.values.StrCode != null && FormState.values.StrCode != '' ? FormState.values.StrCode : ''
        }
    })
    const [getAllStockData, setAllStockData] = useState([]);
    const [getAllStockDataInserted, setAllStockDataInserted] = useState([]);
    const [getSelectedStockRow, setSelectedStockRow] = useState({});
    const [getModalOpen, setModalOpen] = useState(false)
    const [getSavedCartons, setSavedCartons] = useState([])

    const rowsPerPage = 20;

    useEffect(() => {
        const loadProperty = async () => {
            const allprpdata = await fetchAllPropertyData(token);
            setAllPropertyData(allprpdata);
        };
        loadProperty();
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
                console.log('🔵 parent design details response main:', response_details.data.data);
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
    const openNewCatonDrawer = () => setIsCartonAddDrawerVisible(true);
    const closeNewCatonDrawer = () => setIsCartonAddDrawerVisible(false);
    console.log('🔵 POT Data:', gePOTData);

    useEffect(() => {
        if (typeof FormState.values.PrpCode != 'undefined' && FormState.values.PrpCode != null && FormState.values.PrpCode != '') {

            const testFinct = async () => {
                const allyeardata = await fetchAllYeardata(token, FormState.values.PrpCode)
                console.log("----------allyeardata----------", allyeardata, FormState.values)
                setAllYearData(allyeardata)

            }

            testFinct();
        }
    }, [FormState.values.PrpCode])

    useEffect(() => {
        if (typeof FormState.values.YearNo != 'undefined' && FormState.values.YearNo != null && FormState.values.YearNo != '') {

            const testFinctStore = async () => {
                const allstoredata = await fetchAllStoredata(token, FormState.values.PrpCode, FormState.values.YearNo)
                console.log("----------allstoredata----------", allstoredata, FormState.values)
                setAllStoreData(allstoredata)

            }

            testFinctStore();
        }
    }, [FormState.values.YearNo])








    useEffect(() => {
        if (typeof FormCartonDataState.values.PrpCode != 'undefined' && FormCartonDataState.values.PrpCode != null && FormCartonDataState.values.PrpCode != '') {

            const testFinct = async () => {
                const allyeardata = await fetchAllYeardata(token, FormCartonDataState.values.PrpCode)
                console.log("----------allyeardata----------", allyeardata, FormCartonDataState.values)
                setAllYearData(allyeardata)

            }

            testFinct();
        }
    }, [FormCartonDataState.values.PrpCode])

    useEffect(() => {
        if (typeof FormCartonDataState.values.YearNo != 'undefined' && FormCartonDataState.values.YearNo != null && FormCartonDataState.values.YearNo != '') {

            const testFinctStore = async () => {
                const allstoredata = await fetchAllStoredata(token, FormCartonDataState.values.PrpCode, FormCartonDataState.values.YearNo)
                console.log("----------allstoredata----------", allstoredata, FormCartonDataState.values)
                setAllStoreData(allstoredata)

            }

            testFinctStore();
        }
    }, [FormCartonDataState.values.YearNo])




    const updateStockData = async () => {
        //getSelectedStockRow

        setModalOpen(false);
        setIsLoading(true)
        getSelectedStockRow['Chk'] = '1';

        const payload = {
            data: { getSelectedStockRow },
            prptype: 'S',
            prpcodes: [FormState.values.PrpCode],
            yearno: FormState.values.YearNo,
            strcode: FormState.values.StrCode,
            updateStock: '1', //FormState.values.updateStock,
            autoFound: typeof FormState.values.autoFound == 'undefined' || FormState.values.autoFound == null || FormState.values.autoFound == '' ? '0' : FormState.values.autoFound,
            manual: typeof FormState.values.manual == 'undefined' || FormState.values.manual == null || FormState.values.manual == '' ? '0' : FormState.values.manual,
            stockNotFound: typeof FormState.values.stockNotFound == 'undefined' || FormState.values.stockNotFound == null || FormState.values.stockNotFound == '' ? '0' : FormState.values.stockNotFound,
            autoNotFound: typeof FormState.values.autoNotFound == 'undefined' || FormState.values.autoNotFound == null || FormState.values.autoNotFound == '' ? '0' : FormState.values.autoNotFound,
            autoForRepacking: typeof FormState.values.autoForRepacking == 'undefined' || FormState.values.autoForRepacking == null || FormState.values.autoForRepacking == '' ? '0' : FormState.values.autoForRepacking,
            duplicate: typeof FormState.values.duplicate == 'undefined' || FormState.values.duplicate == null || FormState.values.duplicate == '' ? '0' : FormState.values.duplicate,
            txntype: 'yarnStockVerification',
            isstockupdate: '1'
        };
        console.log('payload for update_verify_manual_stock API ', payload);
        const headers = {
            Authorization: `Bearer ${getToken()}`,
            'Content-Type': 'application/json',
            'X-Requested-with': 'XMLHttpRequest',
        };
        try {

            console.log("API URL :", `${API}/api/update_verify_manual_stock`)
            const response = await axios.post(`${API}/api/update_verify_manual_stock`, payload, { headers });

            console.log("update_verify_manual_stock API response :", response.data)

            if (response.data.success === true && response.data.data.length === 0) {
                Alert.alert('No Data Found');
                setIsLoading(false)
            } else if (response.data.success === true && response.data.data.length > 0) {
                //Alert.alert("Data Updated successfully.");
                //setSavedCartons(getSavedCartons => [...getSavedCartons, response.data.data[0].UId])
                // let mergedata1 = []
                // let mergedata1Cntr = 0;
                // let mergedata2 = []
                // let mergedata1Cntr2 = 0;

                // getAllStockData && getAllStockData.filter((el, ind) => {
                //     if()

                // })

                //handleStockData(mergedata)
                Snackbar.show({
                    text: 'Data Updated successfully.',
                    duration: Snackbar.LENGTH_LONG,
                    backgroundColor: 'green',
                    textColor: '#fff',
                    action: { text: 'OK', textColor: 'white' },
                });
                setIsLoading(false)
            } else if (response.data.success === false) {
                Alert.alert(`${response.data.message}`);
                setIsLoading(false)
            } else {
                Alert.alert(`${response.data.message}`);
                setIsLoading(false)
            }
        } catch (error) {
            setIsLoading(false)
            Alert.alert('Server Error :' + error)
        }

        setModalOpen(false);
    }
    console.log("FormState.values :", FormState.values)

    return (
        <>
            {isLoading && <FullScreenLoader />}
            <HeaderBar
                userName={username}
                onSearch={setSearchQueryPOT}
                placeholder="Search Carton..."
            />
            <View style={yarnstockverificatio_styles.container}>
                {/* Top-right List Icon */}
                <TouchableOpacity style={styles.fab} onPress={openDrawer}>
                    <Icon name="read-more" size={20} color="#fff" />
                </TouchableOpacity>

                <TouchableOpacity style={styles.fabAdd} onPress={openNewCatonDrawer}>
                    <Icon name="add" size={20} color="#fff" />
                </TouchableOpacity>

                {/* <TouchableOpacity style={styles.listIconContainer} onPress={openDrawer}>
                    <Icon name="list" size={24} color="white" />
                </TouchableOpacity> */}
                {/* Main Content: Replace Text with ProdOrderTrackingTable */}
                <YarnStockCard gePOTData={getAllStockData} searchQueryPOT={searchQueryPOT} getpayload={getpayload} token={token} parentDesignData={parentDesignData} setSelectedStockRow={setSelectedStockRow} getSelectedStockRow={getSelectedStockRow} setModalOpen={setModalOpen} setSavedCartons={setSavedCartons} getSavedCartons={getSavedCartons} />
            </View>

            <CartonAddDrawer
                isVisible={isCartonAddDrawerVisible}
                FormCartonDataState
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
                                <Text style={styles.confirmTitle}>Confirm</Text>
                                <Text style={styles.confirmText}> Are you sure you want to update ? </Text>
                                <Text style={styles.confirmText}> UID : {getSelectedStockRow?.UId} </Text>
                                <Text style={styles.confirmText}> Carton  : {getSelectedStockRow?.CartNo} </Text>
                                <Text style={styles.confirmText}> Item  : {getSelectedStockRow?.ItmName} </Text>
                                <Text style={styles.confirmText}> Merge  : {getSelectedStockRow?.MerName} </Text>
                                <Text style={styles.confirmText}> Grade  : {getSelectedStockRow?.GrdName} </Text>
                                <Text style={styles.confirmText}> Shade  : {getSelectedStockRow?.ShdName} </Text>
                                <View style={styles.confirmButtons}>
                                    <TouchableOpacity
                                        style={[styles.confirmBtn, { backgroundColor: "#ccc" }]}
                                        onPress={() => { setModalOpen(false) }}>
                                        <Text style={styles.confirmBtnText}>No</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.confirmBtn, { backgroundColor: "green" }]}
                                        onPress={updateStockData}>
                                        <Text style={[styles.confirmBtnText, { color: "#fff" }]}>Yes</Text>
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
    // fab: {
    //     position: 'absolute',
    //     bottom: 25,
    //     right: 20,
    //     backgroundColor: '#007EA7',
    //     width: 30,
    //     height: 30,
    //     borderRadius: 30,
    //     justifyContent: 'center',
    //     alignItems: 'center',
    //     elevation: 3
    // },
    fab: {
        position: 'absolute',
        bottom: 25,
        left: 20,
        backgroundColor: '#007EA7',
        width: 45,
        height: 45,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',

        zIndex: 999,     // important
        elevation: 10    // important for Android
    },
    fabAdd: {
        position: 'absolute',
        bottom: 75,
        left: 20,
        backgroundColor: '#007EA7',
        width: 45,
        height: 45,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',

        zIndex: 999,     // important
        elevation: 10    // important for Android
    },

    /**modal */
    confirmOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.4)",
        justifyContent: "center",
        alignItems: "center"
    },

    confirmBox: {
        width: "80%",
        backgroundColor: "#fff",
        borderRadius: 10,
        padding: 20,
        elevation: 5
    },

    confirmTitle: {
        fontSize: 18,
        fontWeight: "bold",
        marginBottom: 10
    },

    confirmText: {
        fontSize: 15,
        marginBottom: 5,
        color: '#000'
    },

    confirmButtons: {
        flexDirection: "row",
        justifyContent: "flex-end",
        marginTop: 15
    },

    confirmBtn: {
        flex: 1,
        height: 40,
        borderRadius: 6,
        justifyContent: "center",
        alignItems: "center",
        marginHorizontal: 5
    },

    confirmBtnText: {
        fontSize: 16,
        fontWeight: "600",
        textAlign: "center"
    }
});

export default YarnStockVerification;
