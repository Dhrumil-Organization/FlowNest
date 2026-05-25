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

const SalesOrderGradeList = ({ navigation, route }) => {
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

        workingRows = [],

        isCustomGradeEdit = false,

        party = null,
        partyData = null,
        selectedParty = null,

        prpcode = '',
        strcode = '002',
        yearno = '',
        token = '',
    } = route?.params || {};

    const finalParty = party || partyData || selectedParty || null;

    const [search, setSearch] = useState('');
    const [designs, setDesigns] = useState([]);
    const [loading, setLoading] = useState(false);


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

    console.log("selectedItem", selectedItem);
    //   const loadDesigns = async () => {
    //     if (!selectedItem?.ItmCode) {
    //       Alert.alert('Required', 'Item is missing.');
    //       return;
    //     }

    //     try {
    //       setLoading(true);

    //       const res = await axios.get(`${API}/api/sodesignlist`, {
    //         headers: {
    //           Authorization: `Bearer ${token}`,
    //           'Content-Type': 'application/json',
    //           Accept: 'application/json',
    //           'x-platform': 'mob',
    //         },
    //         params: {
    //           prpcode,
    //           strcode,
    //           yearno,
    //           itmcode: selectedItem.ItmCode,
    //           mitmcode: selectedItem.MItmCode || selectedItem.ItmCode,
    //           search,
    //         },
    //       });



    //       const data =
    //         res.data?.response?.data ||
    //         res.data?.response ||
    //         res.data?.data ||
    //         [];

    //       setDesigns(Array.isArray(data) ? data : []);
    //     } catch (error) {
    //       console.log('DESIGN LIST ERROR:', error?.response?.data || error.message);
    //       Alert.alert('Error', 'Unable to load design list');
    //       setDesigns([]);
    //     } finally {
    //       setLoading(false);
    //     }
    //   };


    const loadDesigns = async () => {
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
                ItmCode: selectedItem.ItmCode,
                ttype: ['8', '3', '30', '2', '34', '83', '42'],
                fetch: '',
                MerCode: '',
                ShdCode: '',
                txntype: 'mob_app_sales_order'
            };
            console.log("party type historyPayload:", payload);

            const res = await axios.get(
                `${API}/api/getgrade`,
                getRequestConfig({ params: { ...payload } }),
            );
            console.log("getgrade Response:", res);
            const data =
                res.data?.response?.data ||
                res.data?.response ||
                res.data?.data ||
                [];

            setDesigns(Array.isArray(data) ? data : []);
        } catch (error) {
            console.log('getgrade ERROR:', error?.response?.data || error.message);
            Alert.alert('Error', 'Unable to load getgrade');
            setDesigns([]);
        } finally {
            setLoading(false);
        }
    };


    useEffect(() => {
        loadDesigns();
    }, []);


    // useEffect(() => {
    //     const t = setTimeout(() => {
    //         loadDesigns();
    //     }, 400);


    //     return () => clearTimeout(t);
    // }, [search]);


    const filteredDesigns = useMemo(() => {
        const s = search.toLowerCase();

        let arr = [...designs];

        if (editMode && oldRow?.GrdCode) {
            const oldExists = arr.some(
                item => String(item.GrdCode) === String(oldRow.GrdCode),
            );

            if (!oldExists) {
                arr.unshift({
                    GrdCode: oldRow.GrdCode,
                    GrdName: oldRow.GrdName,
                    GradeName: oldRow.GrdName,
                    __oldSelected: true,
                });
            }
        }

        // arr = arr
        //     .filter(item => {
        //         return (
        //             toText(item.GrdCode).toLowerCase().includes(s) ||
        //             toText(item.GrdName).toLowerCase().includes(s) ||
        //             toText(item.GradeName).toLowerCase().includes(s)
        //         );
        //     })
        arr = arr.filter((item) => {

            const fullText = `
        ${toText(item.GrdCode)}
        ${toText(item.GrdName)}
        ${toText(item.GradeName)}
    `.toLowerCase();

            return fullText.includes(s.toLowerCase());
        })
            .sort((a, b) => {
                if (editMode && oldRow?.GrdCode) {
                    if (String(a.GrdCode) === String(oldRow.GrdCode)) return -1;
                    if (String(b.GrdCode) === String(oldRow.GrdCode)) return 1;
                }
                return 0;
            });

        return arr;
    }, [designs, search, editMode, oldRow]);


    const selectDesign = grade => {
        // if (editMode && oldRow && String(oldRow.ItmCode) === '-1') {
        if (editMode && oldRow && isCustomGradeEdit) {
            const nextRows = (workingRows || []).map(row => {
                const sameLine =
                    String(row.LineId || '') === String(oldRow.LineId || '') ||
                    Number(row.SrNo || 0) === Number(oldRow.SrNo || 0);

                if (!sameLine) return row;

                return {
                    ...row,
                    GrdCode: grade.GrdCode,
                    GrdName: grade.GrdName || grade.GradeName || '',
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


        navigation.navigate('SalesOrderShadeList', {
            mode,
            uid,
            soNo,
            soDate,
            editMode,
            editIndex,
            editLineId,
            oldRow,

            selectedItem,

            selectedGrade: {
                GrdCode: grade.GrdCode,
                GrdName: grade.GrdName || grade.GradeName || '',
                Raw: grade,
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
                <View style={{ flex: 1 }}>
                    <View style={styles.skeletonLineBig} />
                    <View style={styles.skeletonLineSmall} />
                </View>
                <View style={styles.skeletonCircle} />
            </View>
        ));
    };

    const renderItem = ({ item }) => {
        const grdcode = item.GrdCode;
        const grdname = item.GrdName || item.GradeName || '';

        const isOld =
            editMode && oldRow && String(oldRow.GrdCode) === String(grdcode);
        return (
            <TouchableOpacity
                activeOpacity={0.85}
                style={[styles.card, isOld && styles.selectedCard]}
                onPress={() => selectDesign(item)}>

                <View style={[styles.radio, isOld && styles.radioActive]}>
                    {isOld && <Icon name="check" size={16} color="#fff" />}
                </View>

                <View style={{ flex: 1 }}>
                    <Text style={styles.designCode}>{grdcode}</Text>
                    <Text style={styles.designName}>{grdname || '-'}</Text>
                    {isOld && (
                        <View style={styles.currentBadge}>
                            <Text style={styles.currentText}>Selected Old Grade</Text>
                        </View>
                    )}
                </View>

                {/* <View style={[styles.radio, isOld && styles.radioActive]}>
                    {isOld && <Icon name="check" size={16} color="#fff" />}
                </View> */}
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
                    {editMode ? 'Modify Grade' : 'Select Grade'}
                </Text>
                <View style={{ width: 22 }} />
            </View>

            <View style={styles.container}>
                <View style={styles.itemBox}>
                    <Text style={styles.boxLabel}>Selected Item</Text>
                    <Text style={styles.boxTitle}>
                        {selectedItem?.ItmCode} - {selectedItem?.ItmName}
                    </Text>
                </View>
                {editMode && oldRow && (
                    <View style={styles.oldBox}>
                        <Text style={styles.oldLabel}>Current Selected Grade</Text>
                        <Text style={styles.oldTitle}>
                            {oldRow.GrdCode} - {oldRow.GrdName}
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
                        placeholder="Search Grade code or name"
                        placeholderTextColor="#000"
                        style={styles.searchInput}
                    />

                    <TouchableOpacity onPress={loadDesigns}>
                        <Icon name="refresh" size={20} color="#13879A" />
                    </TouchableOpacity>
                </View>
                {loading ? (
                    <View>{renderSkeleton()}</View>
                ) : (
                    <FlatList
                        data={filteredDesigns}
                        keyExtractor={(item, index) => `${item.GrdCode}_${index}`}
                        renderItem={renderItem}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ paddingBottom: 20 }}
                        ListEmptyComponent={
                            <View style={styles.emptyBox}>
                                <Icon name="category" size={44} color="#000" />
                                <Text style={styles.emptyTitle}>No Grade found</Text>
                            </View>
                        }
                    />
                )}
            </View>
        </SafeAreaView>
    );
};

export default SalesOrderGradeList;

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
    designCode: {
        color: '#101828',
        fontSize: 14,
        fontWeight: '900',
    },
    designName: {
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
    radio: {
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 1,
        borderColor: '#98A2B3',
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 0,
        marginRight: 10,
    },
    radioActive: {
        backgroundColor: '#13879A',
        borderColor: '#13879A',
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
    skeletonCircle: {
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: '#E5E7EB',
    },
});