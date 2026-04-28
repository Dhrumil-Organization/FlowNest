import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, Alert, TextInput as RNTextInput, Button, Modal, FlatList, ActivityIndicator, StyleSheet, Dimensions,
    Platform
} from 'react-native';
import FullScreenLoader from '../Loader/Loader';
import HeaderBarwithBack from '../HeaderBarwithBack/HeaderBarwithBack';
import Icon from 'react-native-vector-icons/MaterialIcons';
import FilterForm from './FilterForm';

const CreelIssueReturn = ({ token, navigation, isConnected, username }) => {

    const [isLoading, setIsLoading] = useState(false);
    const [filterFormVisible, setFilterFormVisible] = useState(false);

    const openFiterForm = () => setFilterFormVisible(true);
    const closeFiterForm = () => setFilterFormVisible(false);

    return (
        <>
            {
                isLoading && <FullScreenLoader />
            }
            <HeaderBarwithBack userName={username} header={'Weft Issue'} subHeader={'Issue and manage weft yarn for production'} />
            <Text style={styles.title}>Creel Issue Return</Text>
            <TouchableOpacity style={styles.fab} onPress={openFiterForm} >
                <Icon name="filter-alt" size={25} color="#007EA7" />
            </TouchableOpacity>
            <FilterForm
                isVisible={filterFormVisible}
                onClose={closeFiterForm}
                //selectedYear={selectedYear}
                //onYearChange={setSelectedYear}
                //onLoadPress={handleLoadPress}
                //isLoading={isLoading}
                //setIsLoading={setIsLoading}
                //getAllPropertyData={getAllPropertyData}
                //setAllPropertyData={setAllPropertyData}
                //FormState={FormState}
                //setFormState={setFormState}
                //getAllYearData={getAllYearData}
                //setAllYearData={setAllYearData}
                token={token}
            />
        </>
    )
};

const styles = StyleSheet.create({

    title: { color: '#000' },
    fab: {

        position: 'absolute',
        bottom: 14,
        left: 14,
        backgroundColor: '#c1eaf8',
        width: 35,
        height: 35,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 999,
        elevation: 1,
    },

});

export default CreelIssueReturn;
