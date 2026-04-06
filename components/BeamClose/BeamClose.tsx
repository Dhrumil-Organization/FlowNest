import React, { useEffect, useState } from "react";
import { Text, StyleSheet, TouchableOpacity } from "react-native";
import { fetchAllYeardata } from "../../common/API/Functions";
import Icon from 'react-native-vector-icons/MaterialIcons';

const BeamClose = ({ token }) => {

    const [allYearData, setAllYearData] = useState([])
    const [showForm, setShowForm] = useState(false);

    const openForm = () => setShowForm(true);
    const colseForm = () => setShowForm(false);

    useEffect(() => {
        const testFinct = async () => {
            const data = await fetchAllYeardata(token, 'SIP')
            setAllYearData(data)
        }
        testFinct();
    }, [])

    return (

        <>
            <TouchableOpacity
                style={styles.fab}
            //onPress={openDrawer}
            >
                <Icon name="add" size={35} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.normalText}>Beam close Module</Text>
        </>
    );
}

export default BeamClose;

const styles = StyleSheet.create({

    normalText: {
        fontSize: 16, color: '#000'
    },
    fab: {
        position: 'absolute', bottom: 12, left: 12, backgroundColor: '#007EA7', width: 40,
        height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', zIndex: 999, elevation: 3
    },

});