import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
    SafeAreaView,
    RefreshControl,
    Alert
} from 'react-native';
import axios from 'axios';
import { API } from "../../common/API/dynamicAPI";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSalesOrder } from './SalesOrderContext';
const API_BASE_URL = 'https://erp.sharpskillit.com/api';

const PartyListScreen = ({ navigation, route, token }) => {
    // const { prpcode, yearno, strcode,token } = route.params || {};
    const prpcode = route?.params?.prpcode;
    const yearno = route?.params?.yearno;
    const strcode = route?.params?.strcode;
    const [search, setSearch] = useState('');
    const [parties, setParties] = useState([]);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const { salesOrderParams, startNewOrder } = useSalesOrder();
    let cancelToken: any;

    const getRequestConfig = (props: any) => ({
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'x-platform': 'mob'
        },
        params: props.params,
        cancelToken: cancelToken?.token,
    });

    console.log("prpcode, yearno, strcode", prpcode, yearno, strcode);

    const filteredParties = parties.filter(item =>
        item.acccode.toLowerCase().includes(search.toLowerCase()) ||
        item.accountname.toLowerCase().includes(search.toLowerCase())
    );



    // const { setParty } = useSalesOrder();
    // const loadParties = async (text = '') => {
    //     try {
    //         setLoading(true);

    //         const res = await axios.post(`${API_BASE_URL}/sales-order/party-list`, {
    //             search: text,
    //         });

    //         if (res.data.status === true) {
    //             setParties(res.data.data || []);
    //         } else {
    //             setParties([]);
    //         }
    //     } catch (error) {
    //         console.log('PARTY API ERROR:', error?.response?.data || error.message);
    //         setParties([]);
    //     } finally {
    //         setLoading(false);
    //         setRefreshing(false);
    //     }
    // };

    const loadParties = async (text = '') => {
        const userPtype = await AsyncStorage.getItem('user_prptype');
        const yrno = yearno ? yearno.slice(-2) : '';
        try {
            setLoading(true);
            const payload = {
                prpcode: prpcode,
                prptype: userPtype,
                yearno: yrno,
                strcode: '002',
                txntype: 'yarn_sales_order',
                partytype: 'p',
                type: 'S',
                page: '',
                limit: '',
                search: '',
                isceo: '',
                partype: '',
                grntype: '',
                fetch: '',
                acccode: '',
                billdate: '',
                strtype: '',
                isfaint: ''
            };
            console.log("party type historyPayload:", payload);

            const response = await axios.get(
                `${API}/api/accountbasic`,
                getRequestConfig({ params: { ...payload } }),
            );
            console.log("party type Response:", response);

            const data = response?.data?.response?.data || [];
            if (response?.data?.success && response?.data?.response?.data?.length > 0) {
                setParties(data);
            } else {
                setParties([]);
            }
        } catch (error) {
            if (axios.isCancel(error)) {
                console.log("Request cancelled:", error.message);
            } else {
                console.log("API getyarnblend error:", error);
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadParties('');
    }, []);

    useEffect(() => {
        const delay = setTimeout(() => {
            loadParties(search);
        }, 400);

        return () => clearTimeout(delay);
    }, [search]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        loadParties(search);
    }, [search]);

    const selectParty = party => {
        const params = {
            mode: 'ADD',
            uid: 0,
            prpcode: route?.params?.prpcode || salesOrderParams?.prpcode || '',
            strcode: route?.params?.strcode || salesOrderParams?.strcode || '002',
            yearno: route?.params?.yearno || salesOrderParams?.yearno || '',
            token: route?.params?.token || salesOrderParams?.token || token,
            partyData: {
                ParCode: party.acccode,
                ParName: party.accountname,
                City: party.City || '',
                Address: party.Address || '',
                SExe: party.sexe || '',
                SExeName: party.SExeName || ''
            },
        };

        startNewOrder(params);
        // console.log("params", params);
        navigation.navigate('OrderSummaryScreen', params);
    };

    const renderAvatar = name => {
        const words = String(name || '').trim().split(' ');
        let initials = '';

        if (words.length >= 2) {
            initials = words[0][0] + words[1][0];
        } else {
            initials = String(name || 'P').substring(0, 2);
        }

        return initials.toUpperCase();
    };

    // const renderItem = ({ item }) => {
    //     return (
    //         <TouchableOpacity style={styles.card} onPress={() => selectParty(item)}>
    //             <View style={styles.avatar}>
    //                 <Text style={styles.avatarText}>{renderAvatar(item.ParName)}</Text>
    //             </View>

    //             <View style={styles.partyInfo}>
    //                 <Text style={styles.partyName}>{item.ParName}</Text>
    //                 <Text style={styles.partyCode}>{item.ParCode}</Text>
    //                 <Text style={styles.city}>{item.City || '-'}</Text>
    //             </View>

    //             <Text style={styles.arrow}>›</Text>
    //         </TouchableOpacity>
    //     );
    // };

    const renderItem = ({ item }) => {

        return (

            <TouchableOpacity
                style={styles.card}
                onPress={() => selectParty(item)}
                activeOpacity={0.8}
            >

                <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                        {renderAvatar(item.accountname)}
                    </Text>
                </View>

                <View style={styles.partyInfo}>

                    <Text style={styles.partyName}>
                        {item.accountname}
                    </Text>

                    <Text style={styles.partyCode}>
                        Party Code : {item.acccode}
                    </Text>

                    <Text style={styles.address}>
                        {item.Address}
                    </Text>

                     <Text style={styles.address}>
                        {item.SExeName}
                    </Text>

                </View>

                <Text style={styles.arrow}>›</Text>

            </TouchableOpacity>

        );

    };

    return (
        <SafeAreaView style={styles.safe}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={styles.back}>‹</Text>
                </TouchableOpacity>

                <Text style={styles.headerTitle}>Select Party</Text>

                <TouchableOpacity>
                    <Text style={styles.filter}>⌕</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.container}>
                <View style={styles.searchBox}>
                    <Text style={styles.searchIcon}>⌕</Text>
                    <TextInput
                        value={search}
                        onChangeText={setSearch}
                        placeholder="Search party name or code"
                        placeholderTextColor="#000"
                        style={styles.searchInput}
                    />
                </View>

                {loading && parties.length === 0 ? (
                    <View style={styles.loader}>
                        <ActivityIndicator size="large" color="#13879A" />
                        <Text style={styles.loadingText}>Loading parties...</Text>
                    </View>
                ) : (
                    <FlatList
                        // data={parties}
                        data={filteredParties}
                        keyExtractor={(item, index) => `${item.ParCode}_${index}`}
                        renderItem={renderItem}
                        showsVerticalScrollIndicator={false}
                        refreshControl={
                            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                        }
                        ListEmptyComponent={
                            <View style={styles.emptyBox}>
                                <Text style={styles.emptyText}>No party found</Text>
                            </View>
                        }
                    />
                )}
                {/* 
                <TouchableOpacity style={styles.addBtn}>
                    <Text style={styles.addBtnText}>＋ Add New Party</Text>
                </TouchableOpacity> */}
            </View>
        </SafeAreaView>
    );
};

export default PartyListScreen;

const styles = StyleSheet.create({
    safe: {
        flex: 1,
        backgroundColor: '#f5f7fb',
    },
    header: {
        height: 56,
        backgroundColor: '#13879A',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
    },
    // header: {
    //     height: 100,
    //     backgroundColor: '#13879A',
    //     flexDirection: 'row',
    //     alignItems: 'flex-end',
    //     paddingHorizontal: 14,
    //     paddingBottom: 16,
    // },
    back: {
        color: '#fff',
        fontSize: 34,
        width: 35,
    },
    headerTitle: {
        flex: 1,
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
        textAlign: 'center',
    },
    filter: {
        color: '#fff',
        fontSize: 24,
        width: 35,
        textAlign: 'right',
    },
    container: {
        flex: 1,
        padding: 14,
    },
    searchBox: {
        height: 46,
        backgroundColor: '#fff',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#e4e7ef',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        marginBottom: 12,
    },
    searchIcon: {
        fontSize: 18,
        color: '#000',
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        color: '#000',
        fontSize: 14,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 12,
        paddingVertical: 13,
        paddingHorizontal: 12,
        marginBottom: 10,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#edf0f5',
    },
    avatar: {
        height: 42,
        width: 42,
        borderRadius: 21,
        backgroundColor: '#3b82f6',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    avatarText: {
        color: '#fff',
        fontWeight: '800',
        fontSize: 13,
    },
    partyInfo: {
        flex: 1,
    },
    partyName: {
        color: '#000',
        fontSize: 14,
        fontWeight: '700',
    },
    partyCode: {
        color: '#000',
        fontSize: 12,
        marginTop: 3,
    },
    city: {
        color: '#000',
        fontSize: 12,
        marginTop: 3,
    },
    arrow: {
        fontSize: 28,
        color: '#06285f',
    },
    loader: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 8,
        color: '#000',
    },
    emptyBox: {
        paddingTop: 60,
        alignItems: 'center',
    },
    emptyText: {
        color: '#000',
        fontSize: 15,
    },
    addBtn: {
        height: 48,
        backgroundColor: '#13879A',
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 8,
    },
    addBtnText: {
        color: '#fff',
        fontWeight: '800',
        fontSize: 14,
    },
    address: {
        color: '#000',
        fontSize: 12,
        marginTop: 4,
    },
});