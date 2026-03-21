import React, { useState, useEffect, useRef } from 'react';

import { Text, View, TouchableOpacity } from 'react-native';
import { StyleSheetPCA } from '../../common/Styles/Style';
import HeaderBar from '../HeaderBar/HeaderBar';
import PCAcard from './PCAcard';
import Icon from 'react-native-vector-icons/MaterialIcons';
import CriteriaForm from './CriteriaForm';
import { fetchAllStoredata } from '../../common/API/Functions';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ProcessCompleteAuth = (props) => {
    const { token, navigation, isConnected, username, getUserPrptype } = props;
    const [criteriaFormOpen, setCriteriaFormOpen] = useState(false)
    const [getAllStoreData, setAllStoreData] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [FormState, setFormState] = useState({
        values: {
            StrCode: ''
        }
    })

    const didFetchStore = useRef(false);

    const handleCriteriaFormOpen = () => setCriteriaFormOpen(true)
    const handleCriteriaFormClose = () => setCriteriaFormOpen(false)

    useEffect(() => {
        if (didFetchStore.current) return;
        didFetchStore.current = true;

        const loadProperty = async () => {
            let yno = await AsyncStorage.getItem('yno');
            
            const allstoredata = await fetchAllStoredata(token, '', yno, 'sales_order')
            setAllStoreData(allstoredata)
        };
        loadProperty();
    }, []);

    return (
        <>
            <HeaderBar
                userName={username}
                onSearch={[]}
                placeholder="Search item..."
            />

            <View style={StyleSheetPCA.container}>
                <TouchableOpacity style={StyleSheetPCA.listIconContainer}>
                    <Icon name="list" size={24} color="white" onPress={handleCriteriaFormOpen} />
                </TouchableOpacity>
                <PCAcard />
                <CriteriaForm
                    isVisible={criteriaFormOpen}
                    onClose={handleCriteriaFormClose}
                isLoading={isLoading}
                 FormState={FormState}
                 setFormState={setFormState}
                 getAllStoreData={getAllStoreData}
                 setAllStoreData={setAllStoreData}
                 token={token}
                // fetchData={fetchData}
                // fetchAllHistoryData={fetchAllHistoryData}
                // fetchAllVerifyData={fetchAllVerifyData}
                // activeTab1YPO={activeTab1YPO}
                />
            </View>
        </>
    )
}

export default ProcessCompleteAuth;