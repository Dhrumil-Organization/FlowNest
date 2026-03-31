import React, { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API } from '../../../common/API/dynamicAPI';
import { useAuth } from '../../../hooks/AuthContext';
import ReceivablesSudamo from '../../../components/ReceivablesSudamo/ReceivablesSudamo';
import Receivables from '../../../components/Receivables/Receivables';

export default function Receivables_Container() {
    const { token, username } = useAuth();
    const [prp, setPrp] = useState();

    useEffect(() => {
        const load = async () => {
            const prp = await AsyncStorage.getItem("selected_property");

            setPrp(prp as any);

        };
        load();
    }, []);

    return (
        <>
            {prp === "rayons" ? (
                <>

                    <Receivables token={token || ''} username={username} API={API} />

                </>

            ) : (
                <>
                    <ReceivablesSudamo token={token || ''} username={username} /> :

                </>
            )}
        </>
    );
}