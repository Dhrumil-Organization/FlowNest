import AppAlert from '@/common/utils/appAlert';
import React, { useState, useEffect, useRef } from 'react';

import { Text, View, TouchableOpacity, Alert, Modal } from 'react-native';
import { StyleSheetPCA } from '@/common/Style';
import HeaderBar from '@/components/Header';
import PCAcard from './PCAcard';
// import Icon from 'react-native-vector-icons/MaterialIcons';
import CriteriaForm from './CriteriaForm';
import { fetchAllPropertyData, fetchAllYeardata, fetchAllStoredata } from '../../common/API/Functions';
import AsyncStorage from '@/common/utils/compatibleStorage';
import { API } from '../../common/API/dynamicAPI';
import axios from 'axios';
import FullScreenLoader from '@/components/FullScreenLoader';

const ProcessCompleteAuth = (props) => {
    const { token, navigation, isConnected, username, getUserPrptype } = props;
    const [criteriaFormOpen, setCriteriaFormOpen] = useState(false)
    const [getAllPropertyData, setAllPropertyData] = useState([]);
    const [getAllYearData, setAllYearData] = useState([]);
    const [getAllStoreData, setAllStoreData] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [FormState, setFormState] = useState({ values: { StrCode: '' } })
    // const [fromDate, setFromDate] = useState<Date>(new Date());
    // const [toDate, setToDate] = useState<Date>(new Date());
    const [fromDate, setFromDate] = useState(new Date());
    const [toDate, setToDate] = useState(new Date());
    const [getAllData, setAllData] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [getSelectedRow, setSelectedRow] = useState({});
    const [getModalOpen, setModalOpen] = useState(false)
    const [getPrpType, setPrpType] = useState('');

    const handleCriteriaFormOpen = () => setCriteriaFormOpen(true)
    const handleCriteriaFormClose = () => setCriteriaFormOpen(false)

    useEffect(

        () => {
            if (!token) return;
            const today = new Date();
            setFromDate(today);
            setToDate(today);

            const loadProperty = async () => {

                const allprpdata = await fetchAllPropertyData(token);
                setAllPropertyData(allprpdata);
            };

            loadProperty();

        }, [token]
    );

    useEffect(

        () => {
            if(!token) return;

            if (typeof FormState.values.PrpCode != 'undefined' && FormState.values.PrpCode != null && FormState.values.PrpCode != '') {

                const testFunc = async () => {

                    const allyeardata = await fetchAllYeardata(token, FormState.values.PrpCode)

                    setAllYearData(allyeardata)
                }

                testFunc();
            }
        }, [FormState.values.PrpCode, token]
    )

    const getToken = () => token;

    const handleConfirmAction = async (ptye = '') => {

        setIsLoading(true);

        const userPtype = await AsyncStorage.getItem('user_prptype');

        const payload = {
            //fromdate: formatDate(fromDate),
            //todate: formatDate(toDate),
            //fdate: formatDate(fromDate),
            //tdate: formatDate(toDate),
            //yearno: FormState.values.YearNo,
            //prpcode: FormState.values.PrpCode,
            //txntype: 'processCompleteAuth',
            chkldcldata: 1,
            chkrpt: 0,
            prptype: ptye,
            txntype: "mobile_api",
        };

        const headers = {
            Authorization: `Bearer ${getToken()}`,
            'Content-Type': 'application/json',
            'X-Requested-with': 'XMLHttpRequest',
        };

        console.log("get_process_complete_data API payload", payload)
        console.log("get_process_complete_data API URL", `${API}/api/get_process_complete_data`)
        console.log("userPtype :", userPtype)

        try {

            const response = await axios.post(`${API}/api/get_process_complete_data`, payload, { headers });
            console.log("get_process_complete_data API response", response)

            if (response.data.success === true && response.data.data.length === 0) {

                AppAlert.alert('No Data Found');

                setAllData([]);

            } else if (response.data.success === true && response.data.data.length > 0) {

                setAllData(response.data.data);

            } else if (response.data.success === false) {

                AppAlert.alert(`${response.data.message}`);

                setAllData([]);

            } else {

                AppAlert.alert(`${response.data.message}`);

                setAllData([]);

            }

        } catch (error) {

            setIsLoading(false);
            setAllData([]);
            AppAlert.alert('Server Error');

        } finally {

            setIsLoading(false);
            handleCriteriaFormClose()
            setCriteriaFormOpen(false)
        }
    };

    const isoToDDMMYYYY = (iso?: string) => {

        if (!iso) return '';

        if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {

            const [yyyy, mm, dd] = iso.split('-');

            return `${dd}-${mm}-${yyyy}`;
        }

        const d = new Date(iso);

        if (isNaN(d.getTime())) return iso; // fallback: return original

        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const yyyy = d.getFullYear();

        return `${dd}-${mm}-${yyyy}`;
    };

    const formatDate = (rawDate: any) => {

        let day = rawDate.getDate().toString().padStart(2, '0') || '';
        let month = (rawDate.getMonth() + 1).toString().padStart(2, '0') || ''; // Month is 0-indexed
        let year = rawDate.getFullYear() || '';

        return `${year}-${month}-${day}`;
    };

    const handleSave = async (item) => {

        setModalOpen(false);
        setIsLoading(true);

        const payloadData = {
            prptype: getPrpType,
            yearno: item.YearNo,
            //yearno: FormState.values.YearNo,
            prpcode: item.PrpCode,
            txntype: 'mobile_api',
            //fromdate: formatDate(fromDate),
            //todate: formatDate(toDate),
            chkldcldata: 1,
            chkrpt: 0,
            rows: [item]
        }

        const headers = {
            Authorization: `Bearer ${getToken()}`,
            'Content-Type': 'application/json',
            'X-Requested-with': 'XMLHttpRequest',
        };

        console.log("insert_process_complete_data API payload", payloadData)
        console.log("insert_process_complete_data API URL", `${API}/api/insert_process_complete_data`)

        try {

            const response = await axios.post(`${API}/api/insert_process_complete_data`, payloadData, { headers });
            console.log("insert_process_complete_data API response", response)

            if (response.data.success === true) {

                AppAlert.alert(`${response.data.message}`);

                setAllData([]);

            } else if (response.data.success === false) {

                AppAlert.alert(`${response.data.message}`);

            } else {

                AppAlert.alert(`${response.data.message}`);
            }

        } catch (error) {

            AppAlert.alert('Server Error');

        } finally {

            handleConfirmAction(getPrpType)
        }
    };

    useEffect(() => {

        const loadData = async () => {
            if(!token) return;

            const userPtype = await AsyncStorage.getItem('user_prptype');
            setPrpType(userPtype);

            typeof userPtype != 'undefined' && userPtype != null && userPtype != ''
                ? handleConfirmAction(userPtype)
                : null
        };

        loadData();

    }, [token])

    return (
        <>
            {
                isLoading && <FullScreenLoader />
            }

            <HeaderBar userName={username} onSearch={setSearchQuery} placeholder="Search greading no..." />
            <View style={StyleSheetPCA.container}>
                <PCAcard
                    getAllData={getAllData}
                    onSave={handleSave}
                    getChunkData={getAllData}
                    searchQuery={searchQuery}
                    getSelectedRow={getSelectedRow}
                    setSelectedRow={setSelectedRow}
                    getModalOpen={getModalOpen}
                    setModalOpen={setModalOpen}
                />
                <CriteriaForm
                    isVisible={criteriaFormOpen}
                    onClose={handleCriteriaFormClose}
                    isLoading={isLoading}
                    FormState={FormState}
                    setFormState={setFormState}
                    getAllPropertyData={getAllPropertyData}
                    setAllPropertyData={setAllPropertyData}
                    getAllYearData={getAllYearData}
                    setAllYearData={setAllYearData}
                    getAllStoreData={getAllStoreData}
                    setAllStoreData={setAllStoreData}
                    token={token}
                    fromDate={fromDate}
                    toDate={toDate}
                    onFromDateChange={setFromDate}
                    onToDateChange={setToDate}
                    handleConfirmAction={handleConfirmAction}
                    getAllData={getAllData}
                />
            </View>

            {
                getModalOpen && (
                    <Modal
                        visible={getModalOpen}
                        transparent
                        animationType="fade">
                        <View style={StyleSheetPCA.confirmOverlay}>
                            <View style={StyleSheetPCA.confirmBox}>

                                <Text style={StyleSheetPCA.confirmTitle}>Save confirm</Text>
                                <Text style={StyleSheetPCA.confirmText}> Are you sure you want to save ? </Text>

                                <View style={StyleSheetPCA.row}>
                                    <Text style={StyleSheetPCA.label}>Party :</Text>
                                    <Text style={StyleSheetPCA.value}>{getSelectedRow?.PartyNames}</Text>
                                </View>
                                <View style={StyleSheetPCA.row}>
                                    <Text style={StyleSheetPCA.label}>Property :</Text>
                                    <Text style={StyleSheetPCA.value}>{getSelectedRow?.PrpCode}</Text>
                                </View>
                                <View style={StyleSheetPCA.row}>
                                    <Text style={StyleSheetPCA.label}>Packing no. :</Text>
                                    <Text style={StyleSheetPCA.value}>{getSelectedRow?.PackingNo} </Text>
                                </View>
                                <View style={StyleSheetPCA.row}>
                                    <Text style={StyleSheetPCA.label}>Pack. date :</Text>
                                    <Text style={StyleSheetPCA.value}>{getSelectedRow?.PackDate}</Text>
                                </View>
                                <View style={StyleSheetPCA.row}>
                                    <Text style={StyleSheetPCA.label}>Quality :</Text>
                                    <Text style={StyleSheetPCA.value}>{getSelectedRow?.ItmName}</Text>
                                </View>
                                <View style={StyleSheetPCA.row}>
                                    <Text style={StyleSheetPCA.label}>Batch no :</Text>
                                    <Text style={StyleSheetPCA.value}>{getSelectedRow?.MerName}</Text>
                                </View>
                                <View style={StyleSheetPCA.row}>
                                    <Text style={StyleSheetPCA.label}>Shade :</Text>
                                    <Text style={StyleSheetPCA.value}>{getSelectedRow?.ShdName}</Text>
                                </View>
                                <View style={StyleSheetPCA.row}>
                                    <Text style={StyleSheetPCA.label}>Net wt. :</Text>
                                    <Text style={StyleSheetPCA.value}>{getSelectedRow?.NetWt}</Text>
                                </View>
                                <View style={StyleSheetPCA.row}>
                                    <Text style={StyleSheetPCA.label}>Dyeing no. of cones :</Text>
                                    <Text style={StyleSheetPCA.value}>{getSelectedRow?.Cones}</Text>
                                </View>
                                <View style={StyleSheetPCA.row}>
                                    <Text style={StyleSheetPCA.label}>Dyeing qty. :</Text>
                                    <Text style={StyleSheetPCA.value}>{getSelectedRow?.NetWt}</Text>
                                </View>

                                <View style={StyleSheetPCA.row}>
                                    <Text style={StyleSheetPCA.label}>Packing no. of cones :</Text>
                                    <Text style={StyleSheetPCA.value}>Need To Confirm</Text>
                                </View>
                                <View style={StyleSheetPCA.row}>
                                    <Text style={StyleSheetPCA.label}>Packing qty. :</Text>
                                    <Text style={StyleSheetPCA.value}>Need To Confirm</Text>
                                </View>
                                <View style={StyleSheetPCA.row}>
                                    <Text style={StyleSheetPCA.label}>Prod. type :</Text>
                                    <Text style={StyleSheetPCA.value}>{getSelectedRow?.ProdType}</Text>
                                </View>
                                <View style={StyleSheetPCA.confirmButtons}>
                                    <TouchableOpacity onPress={() => { setModalOpen(false) }} style={[StyleSheetPCA.confirmBtn, { backgroundColor: "red" }]}>
                                        <Text style={StyleSheetPCA.confirmBtnText}>No</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={() => handleSave(getSelectedRow)} style={[StyleSheetPCA.confirmBtn, { backgroundColor: "green" }]}>
                                        <Text style={[StyleSheetPCA.confirmBtnText, { color: "#fff" }]}>Yes</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    </Modal>
                )
            }
        </>
    )
}

export default ProcessCompleteAuth;