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

const SalesOrderShadeList = ({ navigation, route }) => {
    const {
        mode = 'ADD',
        uid = 0,
        soNo = '',
        soDate = '',
        editMode = false,
        editIndex = null,
        editLineId = null,
        oldRow = null,

        selectedItem = null,
        selectedGrade = null,

        workingRows = [],

        isCustomShadeEdit = false,

        party = null,
        partyData = null,
        selectedParty = null,

        prpcode = '',
        strcode = '002',
        yearno = '',
        token = '',
    } = route?.params || {};

    const finalParty =
        party ||
        partyData ||
        selectedParty ||
        null;

    const [search, setSearch] = useState('');
    const [shades, setShades] = useState([]);
    // const [selectedShade, setSelectedShade] = useState(null);
    const [selectedShade, setSelectedShade] = useState([]);
    const [loading, setLoading] = useState(false);

    console.log("selectedShade", selectedShade)

    let cancelToken: any;

    console.log("selectedGrade", selectedGrade);


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

    // const loadShades = async () => {
    //     if (!selectedItem?.ItmCode) {
    //         Alert.alert('Required', 'Item is missing.');
    //         return;
    //     }

    //     if (!selectedGrade?.DsnCode) {
    //         Alert.alert('Required', 'Design is missing.');
    //         return;
    //     }

    //     try {
    //         setLoading(true);

    //         const res = await axios.get(`${API}/api/soshadelist`, {
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
    //                 itmcode: selectedItem.ItmCode,
    //                 mitmcode: selectedItem.MItmCode || selectedItem.ItmCode,
    //                 dsncode: selectedGrade.DsnCode,
    //                 search,
    //             },
    //         });

    //         const data =
    //             res.data?.response?.data ||
    //             res.data?.response ||
    //             res.data?.data ||
    //             [];

    //         const list = Array.isArray(data) ? data : [];
    //         setShades(list);

    //         if (editMode && oldRow?.ShdCode) {
    //             const oldShade = list.find(
    //                 x => String(x.ShdCode) === String(oldRow.ShdCode),
    //             );

    //             if (oldShade) {
    //                 setSelectedShade(oldShade);
    //             } else {
    //                 setSelectedShade({
    //                     ShdCode: oldRow.ShdCode,
    //                     ShdName: oldRow.ShdName,
    //                 });
    //             }
    //         }
    //     } catch (error) {
    //         console.log('SHADE LIST ERROR:', error?.response?.data || error.message);
    //         Alert.alert('Error', 'Unable to load shade list');
    //         setShades([]);
    //     } finally {
    //         setLoading(false);
    //     }
    // };


    const loadShades = async (searchText = '') => {
    const yrno = yearno ? yearno.slice(-2) : '';

    if (!selectedItem?.ItmCode) {
        Alert.alert('Required', 'Item is missing.');
        return;
    }

    try {
        setLoading(true);

        const payload = {
            prpcode,
            strcode,
            yearno: yrno,
            itmcode: selectedItem.ItmCode,
            mitmcode: selectedItem.MItmCode || selectedItem.ItmCode,
            search: searchText,
            limit: 100,
        };

        const res = await axios.get(
            `${API}/api/getmobshade`,
            getRequestConfig({ params: payload }),
        );

        const data =
            res.data?.response?.data ||
            res.data?.response ||
            res.data?.data ||
            [];

        setShades(Array.isArray(data) ? data : []);
    } catch (error) {
        console.log('getmobshade LIST ERROR:', error?.response?.data || error.message);
        Alert.alert('Error', 'Unable to load shade list');
        setShades([]);
    } finally {
        setLoading(false);
    }
};

    useEffect(() => {
        if (editMode && oldRow?.ShdCode) {
            const oldShade =
                shades.find(
                    x => String(x.ShdCode) === String(oldRow.ShdCode),
                ) || {
                    ShdCode: oldRow.ShdCode,
                    ShdName: oldRow.ShdName,
                    ShadeName: oldRow.ShdName,
                };

            setSelectedShade(oldShade);
        }
    }, [editMode, oldRow, shades]);

    //useEffect(() => {
    //    loadShades();
    //}, []);

    useEffect(() => {
    const t = setTimeout(() => {
        loadShades(search);
    }, 500);

    return () => clearTimeout(t);
}, [search]);

    const filteredShades = useMemo(() => {
        const s = search.toLowerCase();

        let arr = [...shades];

        if (editMode && oldRow?.ShdCode) {
            const oldExists = arr.some(
                item => String(item.ShdCode) === String(oldRow.ShdCode),
            );

            if (!oldExists) {
                arr.unshift({
                    ShdCode: oldRow.ShdCode,
                    ShdName: oldRow.ShdName,
                    ShadeName: oldRow.ShdName,
                    __oldSelected: true,
                });
            }
        }

        arr = arr.filter((item) => {

            const fullText = `
        ${toText(item.ShdCode)}
        ${toText(item.ShdName)}
        ${toText(item.ShadeName)}
    `.toLowerCase();

            return fullText.includes(s.toLowerCase());
        })
            .sort((a, b) => {
                if (editMode && oldRow?.ShdCode) {
                    if (String(a.ShdCode) === String(oldRow.ShdCode)) return -1;
                    if (String(b.ShdCode) === String(oldRow.ShdCode)) return 1;
                }
                return 0;
            });

        return arr;
    }, [shades, search, editMode, oldRow]);

    // const onNext = () => {
    //     // if (!selectedShade?.ShdCode) {
    //     //     Alert.alert('Required', 'Please select shade.');
    //     //     return;
    //     // }

    //     navigation.navigate('SalesOrderDetails', {
    //         mode,
    //         uid,
    //         soNo,
    //         soDate,
    //         editMode,
    //         editIndex,
    //         editLineId,
    //         oldRow,

    //         selectedItem,
    //         selectedGrade,

    //         selectedShade: {
    //             ShdCode: selectedShade.ShdCode,
    //             ShdName: selectedShade.ShdName || selectedShade.ShadeName || '',
    //             Raw: selectedShade,
    //         },

    //         workingRows,

    //         party: finalParty,
    //         partyData: finalParty,
    //         selectedParty: finalParty,

    //         prpcode,
    //         strcode,
    //         yearno,
    //         token,
    //     });
    // };

    useEffect(() => {
        if (editMode && oldRow?.ShdCode) {

            const oldShade =
                shades.find(
                    x => String(x.ShdCode) === String(oldRow.ShdCode),
                ) || {
                    ShdCode: oldRow.ShdCode,
                    ShdName: oldRow.ShdName,
                    ShadeName: oldRow.ShdName,
                };

            // IMPORTANT
            setSelectedShade([oldShade]);
        }
    }, [editMode, oldRow, shades]);

    const onNext = () => {

        // const shadeData = item || selectedShade;
        const shadeData = selectedShade;

        // always convert into array
        const finalShadeData = Array.isArray(shadeData)
            ? shadeData
            : [shadeData];

        console.log("finalShadeData", finalShadeData);

        if (editMode && oldRow && isCustomShadeEdit) {

            const nextRows = (workingRows || []).map(row => {

                const sameLine =
                    String(row.LineId || '') === String(oldRow.LineId || '') ||
                    Number(row.SrNo || 0) === Number(oldRow.SrNo || 0);

                if (!sameLine) return row;

                return {
                    ...row,
                    ShdCode: finalShadeData[0]?.ShdCode,
                    ShdName:
                        finalShadeData[0]?.ShdName ||
                        finalShadeData[0]?.ShadeName ||
                        '',
                };
            });

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

        navigation.navigate('SalesOrderDetails', {
            mode,
            uid,
            soNo,
            soDate,
            editMode,
            editIndex,
            editLineId,
            oldRow,
            selectedItem,
            selectedGrade,

            selectedShade: finalShadeData.map(x => ({
                ShdCode: x?.ShdCode,
                ShdName: x?.ShdName || x?.ShadeName || '',
                Raw: x,
            })),

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
                <View style={styles.skeletonCircle} />
                <View style={{ flex: 1 }}>
                    <View style={styles.skeletonLineBig} />
                    <View style={styles.skeletonLineSmall} />
                </View>
            </View>
        ));
    };

    // const handleShadeSelect = (item) => {
    //     const alreadySelected = selectedShade?.some(
    //         x => String(x.ShdCode) === String(item.ShdCode)
    //     );

    //     if (alreadySelected) {
    //         setSelectedShade(prev =>
    //             prev.filter(
    //                 x => String(x.ShdCode) !== String(item.ShdCode)
    //             )
    //         );
    //     } else {
    //         setSelectedShade(prev => [...prev, item]);
    //     }
    // };

    const handleShadeSelect = (item) => {
        if (editMode) {
            setSelectedShade([item]);
            return;
        }

        const alreadySelected = selectedShade?.some(
            x => String(x.ShdCode) === String(item.ShdCode)
        );

        if (alreadySelected) {
            setSelectedShade(prev =>
                prev.filter(
                    x => String(x.ShdCode) !== String(item.ShdCode)
                )
            );
        } else {
            setSelectedShade(prev => [...prev, item]);
        }
    };

    const renderItem = ({ item }) => {
        const shdCode = item.ShdCode;
        const shdName = item.ShdName || item.ShadeName || '';

        // const isSelected = String(selectedShade?.ShdCode) === String(shdCode);
        const isSelected = selectedShade?.some(
            x => String(x.ShdCode) === String(shdCode)
        );

        const isOld =
            editMode && oldRow && String(oldRow.ShdCode) === String(shdCode);

        return (
            <TouchableOpacity
                activeOpacity={0.85}
                style={[styles.card, isSelected && styles.selectedCard]}
                // onPress={() => onNext(item)}
                // onPress={() => {
                //     setSelectedShade(item);
                // }}
                onPress={() => handleShadeSelect(item)}
            >
                <View style={[styles.radio, isSelected && styles.radioActive]}>
                    {isSelected && <Icon name="check" size={16} color="#fff" />}
                </View>

                <View style={{ flex: 1 }}>
                    <Text style={styles.shadeName}>{shdName || '-'}</Text>
                    <Text style={styles.shadeCode}>{shdCode}</Text>

                    {isOld && (
                        <View style={styles.currentBadge}>
                            <Text style={styles.currentText}>Selected Old Shade</Text>
                        </View>
                    )}
                </View>
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
                    {editMode ? 'Modify Shade' : 'Select Shade'}
                </Text>

                <View style={{ width: 22 }} />
            </View>

            <View style={styles.container}>
                <View style={styles.itemBox}>
                    <Text style={styles.boxLabel}>Selected Item</Text>
                    <Text style={styles.boxTitle}>
                        {selectedItem?.ItmCode} - {selectedItem?.ItmName}
                    </Text>

                    <Text style={[styles.boxLabel, { marginTop: 8 }]}>Selected Grade</Text>
                    <Text style={styles.boxTitle}>
                        {selectedGrade?.GrdCode} - {selectedGrade?.GrdName}
                    </Text>
                </View>

                {editMode && oldRow && (
                    <View style={styles.oldBox}>
                        <Text style={styles.oldLabel}>Current Selected Shade</Text>
                        <Text style={styles.oldTitle}>
                            {oldRow.ShdCode} - {oldRow.ShdName}
                        </Text>
                        <Text style={styles.oldSub}>
                            Qty: {oldRow.Qty} | Pcs: {oldRow.Pcs} | Rate: ₹ {oldRow.Rate}
                        </Text>
                    </View>
                )}

                {selectedShade?.length > 0 && (
                    <Text style={{
                        marginBottom: 10,
                        color: '#13879A',
                        fontWeight: '800',
                    }}>
                        Selected Shades: {selectedShade.length}
                    </Text>
                )}
                <View style={styles.searchBox}>
                    <Icon name="search" size={20} color="#000" />
                    <TextInput
                        value={search}
                        onChangeText={setSearch}
                        placeholder="Search shade code or name"
                        placeholderTextColor="#98A2B3"
                        style={styles.searchInput}
                    />

                    <TouchableOpacity onPress={loadShades}>
                        <Icon name="refresh" size={20} color="#13879A" />
                    </TouchableOpacity>
                </View>

                {loading ? (
                    <View>{renderSkeleton()}</View>
                ) : (
                    <FlatList
                        data={shades}
                        keyExtractor={(item, index) => `${item.ShdCode}_${index}`}
                        renderItem={renderItem}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ paddingBottom: 90 }}
                        ListEmptyComponent={
                            <View style={styles.emptyBox}>
                                <Icon name="palette" size={44} color="#98A2B3" />
                                <Text style={styles.emptyTitle}>No shade found</Text>
                            </View>
                        }
                    />
                )}

                <TouchableOpacity style={styles.nextBtn} onPress={onNext}>
                    <Text style={styles.nextText}>Next</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
};

export default SalesOrderShadeList;

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
    itemBox: {
        backgroundColor: '#fff',
        borderRadius: 14,
        padding: 12,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#E4E7EF',
    },
    boxLabel: {
        color: '#000',
        fontSize: 11,
        fontWeight: '800',
    },
    boxTitle: {
        color: '#101828',
        fontSize: 14,
        fontWeight: '900',
        marginTop: 4,
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
        color: '#101828',
        fontSize: 14,
        fontWeight: '900',
    },
    oldSub: {
        color: '#667085',
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
        color: '#101828',
        fontSize: 14,
        marginHorizontal: 8,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 14,
        padding: 14,
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
    radio: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#98A2B3',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    radioActive: {
        backgroundColor: '#13879A',
        borderColor: '#13879A',
    },
    shadeName: {
        color: '#101828',
        fontSize: 14,
        fontWeight: '900',
    },
    shadeCode: {
        color: '#667085',
        fontSize: 12,
        marginTop: 4,
        fontWeight: '700',
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
        color: '#667085',
        fontWeight: '800',
    },
    nextBtn: {
        position: 'absolute',
        left: 14,
        right: 14,
        bottom: 14,
        backgroundColor: '#13879A',
        height: 52,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    nextText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '900',
    },
    skeletonCard: {
        backgroundColor: '#fff',
        borderRadius: 14,
        padding: 14,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#E6ECF2',
        flexDirection: 'row',
        alignItems: 'center',
    },
    skeletonCircle: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#E5E7EB',
        marginRight: 12,
    },
    skeletonLineBig: {
        height: 14,
        width: '75%',
        borderRadius: 8,
        backgroundColor: '#E5E7EB',
        marginBottom: 8,
    },
    skeletonLineSmall: {
        height: 11,
        width: '45%',
        borderRadius: 8,
        backgroundColor: '#EEF2F6',
    },
});