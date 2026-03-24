import React, { useState, useEffect, useRef } from 'react';

import { Text, View, TouchableOpacity, Alert, Modal } from 'react-native';
import { StyleSheetPCA } from '../../common/Styles/Style';
import HeaderBar from '../HeaderBar/HeaderBar';
import PCAcard from './PCAcard';
import Icon from 'react-native-vector-icons/MaterialIcons';
import CriteriaForm from './CriteriaForm';
import { fetchAllPropertyData, fetchAllYeardata, fetchAllStoredata } from '../../common/API/Functions';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API } from '../../common/API/dynamicAPI';
import axios from 'axios';
import FullScreenLoader from '../Loader/Loader';

const ProcessCompleteAuth = (props) => {
    const { token, navigation, isConnected, username, getUserPrptype } = props;
    const [criteriaFormOpen, setCriteriaFormOpen] = useState(false)
    const [getAllPropertyData, setAllPropertyData] = useState([]);
    const [getAllYearData, setAllYearData] = useState([]);
    const [getAllStoreData, setAllStoreData] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [FormState, setFormState] = useState({
        values: {
            StrCode: ''
        }
    })
    const [fromDate, setFromDate] = useState<Date>(new Date());
    const [toDate, setToDate] = useState<Date>(new Date());
    const [getAllData, setAllData] = useState([]);
    const didFetchStore = useRef(false);
    const [getChunkData, setChunkData] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [getSelectedRow, setSelectedRow] = useState({});
    const [getModalOpen, setModalOpen] = useState(false)

    const handleCriteriaFormOpen = () => setCriteriaFormOpen(true)
    const handleCriteriaFormClose = () => setCriteriaFormOpen(false)

    useEffect(() => {
        const today = new Date();
        setFromDate(today);
        setToDate(today);
        const loadProperty = async () => {
            const allprpdata = await fetchAllPropertyData(token);
            setAllPropertyData(allprpdata);
        };
        loadProperty();
    }, []);

    useEffect(() => {
        if (typeof FormState.values.PrpCode != 'undefined' && FormState.values.PrpCode != null && FormState.values.PrpCode != '') {

            const testFunc = async () => {
                const allyeardata = await fetchAllYeardata(token, FormState.values.PrpCode)
                setAllYearData(allyeardata)
            }
            testFunc();
        }
    }, [FormState.values.PrpCode])

    const getToken = () => token;

    const handleConfirmAction = async () => {
        setIsLoading(true);

        const payload = {
            fromdate: formatDate(fromDate),
            todate: formatDate(toDate),
            fdate: formatDate(fromDate),
            tdate: formatDate(toDate),
            yearno: FormState.values.YearNo,
            prpcode: FormState.values.PrpCode,
            txntype: 'processCompleteAuth',
            chkldcldata: 1,
            chkrpt: 0,
        };
        const headers = {
            Authorization: `Bearer ${getToken()}`,
            'Content-Type': 'application/json',
            'X-Requested-with': 'XMLHttpRequest',
        };

        console.log("get_process_complete_data API payload", payload)
        console.log("get_process_complete_data API URL", `${API}/api/get_process_complete_data`)
        try {
            const response = await axios.post(`${API}/api/get_process_complete_data`, payload, { headers });
            console.log("get_process_complete_data API response", response)
            if (response.data.success === true && response.data.data.length === 0) {
                Alert.alert('No Data Found');
                setAllData([]);
            } else if (response.data.success === true && response.data.data.length > 0) {
                setAllData(response.data.data);
            } else if (response.data.success === false) {
                Alert.alert(`${response.data.message}`);
                setAllData([]);
            } else {
                Alert.alert(`${response.data.message}`);
                setAllData([]);
            }
        } catch (error) {
            setIsLoading(false);
            setAllData([]);
            Alert.alert('Server Error');
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
            yearno: FormState.values.YearNo,
            prpcode: FormState.values.PrpCode,
            txntype: 'processCompleteAuth',
            fromdate: formatDate(fromDate),
            todate: formatDate(toDate),
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
                Alert.alert(`${response.data.message}`);
                setAllData([]);
            } else if (response.data.success === false) {
                Alert.alert(`${response.data.message}`);
            } else {
                Alert.alert(`${response.data.message}`);
            }
        } catch (error) {
            Alert.alert('Server Error');
        } finally {
            handleConfirmAction()
        }
    };

    return (
        <>
            {
                isLoading && <FullScreenLoader />
            }
            <HeaderBar userName={username} onSearch={setSearchQuery} placeholder="Search greading no..." />
            <View style={StyleSheetPCA.container}>
                <TouchableOpacity style={StyleSheetPCA.listIconContainer}>
                    <Icon name="list" size={24} color="white" onPress={handleCriteriaFormOpen} />
                </TouchableOpacity>
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
                                                <Text style={StyleSheetPCA.label}>Greading no. :</Text>
                                                <Text style={StyleSheetPCA.value}>{getSelectedRow?.GreadingNo}</Text>
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
                                                <Text style={StyleSheetPCA.label}>Item :</Text>
                                                <Text style={StyleSheetPCA.value}>{getSelectedRow?.ItmName}</Text>
                                            </View>

                                            <View style={StyleSheetPCA.row}>
                                                <Text style={StyleSheetPCA.label}>Merge :</Text>
                                                <Text style={StyleSheetPCA.value}>{getSelectedRow?.MerName}</Text>
                                            </View>
            
                                            <View style={StyleSheetPCA.row}>
                                                <Text style={StyleSheetPCA.label}>Shade :</Text>
                                                <Text style={StyleSheetPCA.value}>{getSelectedRow?.ShdName}</Text>
                                            </View>
                                            <View style={StyleSheetPCA.row}>
                                                <Text style={StyleSheetPCA.label}>Tot. wt. :</Text>
                                                <Text style={StyleSheetPCA.value}>{getSelectedRow?.TotWt}</Text>
                                            </View>
                                            <View style={StyleSheetPCA.row}>
                                                <Text style={StyleSheetPCA.label}>Tot. pcs. :</Text>
                                                <Text style={StyleSheetPCA.value}>{getSelectedRow?.TotPcs}</Text>
                                            </View>
            
                                            <View style={StyleSheetPCA.row}>
                                                <Text style={StyleSheetPCA.label}>Prod. type :</Text>
                                                <Text style={StyleSheetPCA.value}>{getSelectedRow?.ProdType}</Text>
                                            </View>
                                            <View style={StyleSheetPCA.confirmButtons}>
                                                <TouchableOpacity
                                                    style={[StyleSheetPCA.confirmBtn, { backgroundColor: "red" }]}
                                                    onPress={() => { setModalOpen(false) }}>
                                                    <Text style={StyleSheetPCA.confirmBtnText}>No</Text>
                                                </TouchableOpacity>
                                                <TouchableOpacity
                                                    style={[StyleSheetPCA.confirmBtn, { backgroundColor: "green" }]}
                                                    onPress={() => handleSave(getSelectedRow)}>
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