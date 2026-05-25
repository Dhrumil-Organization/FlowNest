import React, { useEffect, useMemo, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    TextInput,
    Alert,
} from 'react-native';
import axios from 'axios';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { API } from '../../common/API/dynamicAPI';
import { SafeAreaView } from 'react-native-safe-area-context';
const toText = v => String(v || '').trim();

const SalesOrderItemList = ({ navigation, route }) => {
    const {
        mode = 'ADD',
        uid = 0,
        soNo = '',
        soDate = '',
        editMode = false,
        editIndex = null,
        editLineId = null,
        oldRow = null,

        workingRows = [],

        isCustomItemEdit = false,

        party = null,
        partyData = null,
        selectedParty = null,

        prpcode = '',
        strcode = '002',
        yearno = '',
        token = '',
    } = route?.params || {};

    const finalParty = party || partyData || selectedParty || null;
    const isCustomItem = route?.params?.isCustomItem;

    const [search, setSearch] = useState('');
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);

    console.log("selectedParty", selectedParty);

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

    // const loadItems = async () => {
    //     try {
    //         setLoading(true);

    //         const res = await axios.get(`${API}/api/soitemlist`, {
    //             headers: {
    //                 Authorization: `Bearer ${token}`,
    //                 'Content-Type': 'application/json',
    //                 Accept: 'application/json',
    //                 'x-platform': 'mob',
    //             },
    //             params: {
    //                 prpcode,
    //                 strcode,
    //                 yearno,
    //                 search,
    //             },
    //         });

    //         const data =
    //             res.data?.response?.data ||
    //             res.data?.response ||
    //             res.data?.data ||
    //             [];

    //         setItems(Array.isArray(data) ? data : []);
    //     } catch (error) {
    //         console.log('ITEM LIST ERROR:', error?.response?.data || error.message);
    //         Alert.alert('Error', 'Unable to load item list');
    //         setItems([]);
    //     } finally {
    //         setLoading(false);
    //     }
    // };

    const loadItems = async () => {
        // const userPtype = await AsyncStorage.getItem('user_prptype');
        const yrno = yearno ? yearno.slice(-2) : '';
        try {
            setLoading(true);
            const payload = {
                prpcode,
                strcode,
                yearno: yrno,
                txntype: 'yarn_sales_order',
                // search,
            };
            console.log("Item historyPayload:", payload);

            const res = await axios.get(
                `${API}/api/getitem`,
                getRequestConfig({ params: { ...payload } }),
            );
            console.log("Item List Response:", res);
            const data =
                res.data?.response?.data ||
                res.data?.response ||
                res.data?.data ||
                [];

            setItems(Array.isArray(data) ? data : []);
        } catch (error) {
            console.log('ITEM LIST ERROR:', error?.response?.data || error.message);
            Alert.alert('Error', 'Unable to load item list');
            setItems([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadItems();
    }, []);

    // useEffect(() => {
    //     const t = setTimeout(() => {
    //         loadItems();
    //     }, 400);

    //     return () => clearTimeout(t);
    // }, [search]);

    // const filteredItems = useMemo(() => {
    //     const s = search.toLowerCase();

    //     let arr = [...items];

    //     if (editMode && oldRow?.ItmCode) {
    //         const oldExists = arr.some(
    //             item => String(item.ItmCode) === String(oldRow.ItmCode),
    //         );

    //         if (!oldExists) {
    //             arr.unshift({
    //                 ItmCode: oldRow.ItmCode,
    //                 ItmName: oldRow.ItmName,
    //                 MItmCode: oldRow.MItmCode || oldRow.ItmCode,
    //                 __oldSelected: true,
    //             });
    //         }
    //     }

    //     arr = arr
    //         .filter(item => {
    //             return (
    //                 toText(item.ItmCode).toLowerCase().includes(s) ||
    //                 toText(item.ItmName).toLowerCase().includes(s) ||
    //                 toText(item.MItmCode).toLowerCase().includes(s)
    //             );
    //         })
    //         .sort((a, b) => {
    //             if (editMode && oldRow?.ItmCode) {
    //                 if (String(a.ItmCode) === String(oldRow.ItmCode)) return -1;
    //                 if (String(b.ItmCode) === String(oldRow.ItmCode)) return 1;
    //             }
    //             return 0;
    //         });

    //     return arr;
    // }, [items, search, editMode, oldRow]);


    const filteredItems = useMemo(() => {
        const s = search.toLowerCase();
        let arr: any[] = [...items];
        if (editMode && oldRow?.ItmCode) {
            const oldExists = arr.some(
                (item) =>
                    String(item.ItmCode) === String(oldRow.ItmCode)
            );
            if (!oldExists) {
                arr.unshift({
                    ItmCode: oldRow.ItmCode,
                    ItmName: oldRow.ItmName,
                    MItmCode: oldRow.MItmCode || oldRow.ItmCode,
                    __oldSelected: true,
                });
            }
        }
        // arr = arr
        //     .filter((item) => {

        //         return (
        //             toText(item.ItmCode)
        //                 .toLowerCase()
        //                 .includes(s)

        //             ||

        //             toText(item.ItmName)
        //                 .toLowerCase()
        //                 .includes(s)

        //             ||

        //             toText(item.MItmCode)
        //                 .toLowerCase()
        //                 .includes(s)
        //         );
        //     })
        arr = arr.filter((item) => {

            const fullText = `
        ${toText(item.ItmCode)}
        ${toText(item.ItmName)}
        ${toText(item.MItmCode)}
        ${toText(item.UOM)}
        ${toText(item.Denier)}
        ${toText(item.HsnCode)}
    `.toLowerCase();

            return fullText.includes(s.toLowerCase());
        })
            .sort((a, b) => {

                if (editMode && oldRow?.ItmCode) {

                    if (
                        String(a.ItmCode) ===
                        String(oldRow.ItmCode)
                    ) {
                        return -1;
                    }

                    if (
                        String(b.ItmCode) ===
                        String(oldRow.ItmCode)
                    ) {
                        return 1;
                    }
                }

                return 0;
            });

        return arr;

    }, [items, search, editMode, oldRow]);

    const selectItem = item => {
        // =====================================================
        // SPECIAL CASE:
        // Edit existing temporary item ItmCode = -1
        // Only replace item code/name in same SrNo row
        // Do not go to Grade/Shade screen
        // =====================================================
        // if (editMode && oldRow && String(oldRow.ItmCode) === '-1') {
        if (editMode && oldRow && isCustomItemEdit) {
            const nextRows = (workingRows || []).map(row => {
                const sameLine =
                    String(row.LineId || '') === String(oldRow.LineId || '') ||
                    Number(row.SrNo || 0) === Number(oldRow.SrNo || 0);

                if (!sameLine) return row;

                return {
                    ...row,
                    ItmCode: item.ItmCode,
                    ItmName: item.ItmName,
                    MItmCode: item.MItmCode || item.ItmCode,
                    UOM: item.UOM || row.UOM || '',
                    Denier: item.Denier || row.Denier || '',
                    HsnCode: item.HsnCode || row.HsnCode || '',
                };
            });

            // navigation.replace({
            //     name: 'OrderSummaryScreen',
            //     params: {
            //         completedRows: nextRows,
            //         editMode: true,
            //         replaceItemOnlyDone: true,

            //         mode,
            //         uid,
            //         screenMode: mode,
            //         soNo,
            //         soDate,

            //         party: finalParty,
            //         partyData: finalParty,
            //         selectedParty: finalParty,

            //         prpcode,
            //         strcode,
            //         yearno,
            //         token,

            //         skipReload: true,
            //     },
            //     merge: true,
            // });

            navigation.replace(
                'OrderSummaryScreen',
                {
                    completedRows: nextRows,

                    editMode: true,

                    replaceItemOnlyDone: true,

                    mode,
                    uid,

                    screenMode: mode,

                    soNo,
                    soDate,

                    workingRows: nextRows,

                    party: finalParty,
                    partyData: finalParty,
                    selectedParty: finalParty,

                    prpcode,
                    strcode,
                    yearno,
                    token,

                    skipReload: true,
                }
            );

            return;
        }

        // =====================================================
        // NORMAL FLOW
        // =====================================================
        navigation.navigate('SalesOrderGradeList', {
            mode,
            uid,
            soNo,
            soDate,
            editMode,
            editIndex,
            editLineId,
            oldRow,
            selectedItem: {
                ItmCode: item.ItmCode,
                ItmName: item.ItmName,
                MItmCode: item.MItmCode || item.ItmCode,
                UOM: item.UOM || '',
                Denier: item.Denier,
                HsnCode: item.HsnCode,
                Raw: item,
            },
            workingRows,
            party: finalParty,
            partyData: finalParty,
            selectedParty: finalParty,
            prpcode,
            strcode,
            yearno,
            token,
        });
    };

    const renderSkeleton = () => {
        return [1, 2, 3, 4, 5, 6].map(i => (
            <View key={i} style={styles.skeletonCard}>
                <View style={styles.skeletonIcon} />
                <View style={{ flex: 1 }}>
                    <View style={styles.skeletonLineBig} />
                    <View style={styles.skeletonLineSmall} />
                </View>
            </View>
        ));
    };

    const renderItem = ({ item }) => {
        const isOld =
            editMode &&
            oldRow &&
            String(oldRow.ItmCode) === String(item.ItmCode);

        return (
            <TouchableOpacity
                activeOpacity={0.85}
                style={[styles.card, isOld && styles.selectedCard]}
                onPress={() => selectItem(item)}>
                <View style={[styles.itemIcon, isOld && styles.itemIconActive]}>
                    <Icon
                        name={isOld ? 'check-circle' : 'inventory-2'}
                        size={22}
                        color={isOld ? '#fff' : '#13879A'}
                    />
                </View>

                <View style={{ flex: 1 }}>
                    <Text style={styles.itemCode}>
                        {item.ItmCode} - {item.ItmName}
                    </Text>

                    <Text style={styles.itemSub}>
                        {item.UOM || '-'}
                        {/* {item.Denier || '-'} */}
                        {item.MItmCode ? `  •  Main: ${item.MItmCode}` : ''}
                    </Text>

                    <Text style={styles.itemSub}>
                        {item.Denier || '-'}
                    </Text>

                    {isOld && (
                        <View style={styles.currentBadge}>
                            <Text style={styles.currentText}>Selected Old Item</Text>
                        </View>
                    )}
                </View>

                <Icon name="chevron-right" size={24} color="#98A2B3" />
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView edges={['top', 'bottom']} style={styles.safe}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Icon name="arrow-back-ios-new" size={20} color="#fff" />
                </TouchableOpacity>

                <Text style={styles.headerTitle}>
                    {editMode ? 'Modify Item' : 'Select Item'}
                </Text>

                <View style={{ width: 22 }} />
            </View>

            <View style={styles.container}>
                {editMode && oldRow && (
                    <View style={styles.oldBox}>
                        <Text style={styles.oldLabel}>Currently Saved Item</Text>
                        <Text style={styles.oldTitle}>
                            {oldRow.ItmCode} - {oldRow.ItmName}
                        </Text>
                        <Text style={styles.oldSub}>
                            Grade: {oldRow.GrdCode} {oldRow.GrdName}
                        </Text>
                        <Text style={styles.oldSub}>
                            Shade: {oldRow.ShdCode} {oldRow.ShdName}
                        </Text>
                    </View>
                )}

                <View style={styles.searchBox}>
                    <Icon name="search" size={20} color="#667085" />

                    <TextInput
                        value={search}
                        onChangeText={setSearch}
                        placeholder="Search item name or code"
                        placeholderTextColor="#98A2B3"
                        style={styles.searchInput}
                    />

                    <TouchableOpacity onPress={loadItems}>
                        <Icon name="refresh" size={20} color="#13879A" />
                    </TouchableOpacity>
                </View>

                {loading ? (
                    <View>{renderSkeleton()}</View>
                ) : (
                    <FlatList
                        data={filteredItems}
                        keyExtractor={(item, index) => `${item.ItmCode}_${index}`}
                        renderItem={renderItem}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ paddingBottom: 20 }}
                        ListEmptyComponent={
                            <View style={styles.emptyBox}>
                                <Icon name="inventory-2" size={44} color="#98A2B3" />
                                <Text style={styles.emptyTitle}>No item found</Text>
                            </View>
                        }
                    />
                )}
                <TouchableOpacity
                    style={styles.addBtn}
                    // onPress={() => navigation.navigate('AddNewPartyScreen')}
                    onPress={() =>
                        navigation.navigate('AddNewItemScreen', {
                            mode,
                            uid,
                            soNo,
                            soDate,
                            editMode,
                            editIndex,
                            editLineId,
                            oldRow,
                            workingRows,
                            party: finalParty,
                            partyData: finalParty,
                            selectedParty: finalParty,
                            prpcode,
                            strcode,
                            yearno,
                            token,
                        })
                    }
                >
                    <Text style={styles.addBtnText}>＋ Add New Item</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
};

export default SalesOrderItemList;

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: '#F5F7FB' },
    header: {
        height: 56,
        backgroundColor: '#13879A',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
    },
    headerTitle: {
        flex: 1,
        color: '#fff',
        fontSize: 16,
        fontWeight: '900',
        textAlign: 'center',
    },
    container: {
        flex: 1,
        padding: 14,
    },
    oldBox: {
        backgroundColor: '#E7F6F8',
        borderRadius: 14,
        padding: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#BFE7ED',
    },
    oldLabel: {
        color: '#13879A',
        fontSize: 11,
        fontWeight: '900',
        marginBottom: 5,
    },
    oldTitle: {
        color: '#000',
        fontSize: 14,
        fontWeight: '900',
    },
    oldSub: {
        color: '#000',
        fontSize: 12,
        marginTop: 3,
        fontWeight: '700',
    },
    searchBox: {
        height: 46,
        backgroundColor: '#fff',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E4E7EF',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        marginBottom: 12,
    },
    searchInput: {
        flex: 1,
        color: '#000',
        fontSize: 14,
        marginHorizontal: 8,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 14,
        padding: 12,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#E6ECF2',
        flexDirection: 'row',
        alignItems: 'center',
        elevation: 2,
    },
    selectedCard: {
        borderColor: '#13879A',
        backgroundColor: '#F0FBFC',
    },
    itemIcon: {
        width: 44,
        height: 44,
        borderRadius: 14,
        backgroundColor: '#E7F6F8',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    itemIconActive: {
        backgroundColor: '#13879A',
    },
    itemCode: {
        color: '#000',
        fontSize: 14,
        fontWeight: '900',
    },
    itemSub: {
        color: '#000',
        fontSize: 12,
        marginTop: 4,
        fontWeight: '600',
    },
    currentBadge: {
        alignSelf: 'flex-start',
        marginTop: 7,
        backgroundColor: '#13879A',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 20,
    },
    currentText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: '900',
    },
    emptyBox: {
        marginTop: 80,
        alignItems: 'center',
    },
    emptyTitle: {
        marginTop: 10,
        color: '#000',
        fontWeight: '800',
    },
    skeletonCard: {
        backgroundColor: '#fff',
        borderRadius: 14,
        padding: 12,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#E6ECF2',
        flexDirection: 'row',
        alignItems: 'center',
    },
    skeletonIcon: {
        width: 44,
        height: 44,
        borderRadius: 14,
        backgroundColor: '#E5E7EB',
        marginRight: 12,
    },
    skeletonLineBig: {
        height: 14,
        width: '80%',
        borderRadius: 8,
        backgroundColor: '#E5E7EB',
        marginBottom: 8,
    },
    skeletonLineSmall: {
        height: 11,
        width: '55%',
        borderRadius: 8,
        backgroundColor: '#EEF2F6',
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
});