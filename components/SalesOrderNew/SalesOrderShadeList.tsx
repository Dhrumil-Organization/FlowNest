import React, { useEffect, useMemo, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    TouchableOpacity,
    FlatList,
    TextInput,
    Alert,
} from 'react-native';
import axios from 'axios';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { API } from '../../common/API/dynamicAPI';

const toText = v => String(v || '').trim();

const SalesOrderShadeList = ({ navigation, route }) => {
    const {
        editMode = false,
        editIndex = null,
        oldRow = null,
        selectedItem = null,
        selectedDesign = null,
        prpcode = '',
        strcode = '012',
        yearno = '',
        token = '',
    } = route?.params || {};

    const [search, setSearch] = useState('');
    const [shades, setShades] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedShades, setSelectedShades] = useState([]);

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

    // const loadDesigns = async () => {
    //     if (!selectedItem?.ItmCode) {
    //         Alert.alert('Required', 'Item is missing.');
    //         return;
    //     }

    //     try {
    //         setLoading(true);

    //         const res = await axios.get(`${API}/api/sodesignlist`, {
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
    //                 search,
    //             },
    //         });

    //         const data =
    //             res.data?.response?.data ||
    //             res.data?.response ||
    //             res.data?.data ||
    //             [];

    //         setDesigns(Array.isArray(data) ? data : []);
    //     } catch (error) {
    //         console.log('DESIGN LIST ERROR:', error?.response?.data || error.message);
    //         Alert.alert('Error', 'Unable to load design list');
    //         setDesigns([]);
    //     } finally {
    //         setLoading(false);
    //     }
    // };

    const loadshades = async () => {
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
                search,
            };
            console.log("shade type historyPayload:", payload);

            const res = await axios.get(
                `${API}/api/getshade`,
                getRequestConfig({ params: { ...payload } }),
            );
            console.log("shade type Response:", res);
            const data =
                res.data?.response?.data ||
                res.data?.response ||
                res.data?.data ||
                [];

            setShades(Array.isArray(data) ? data : []);
        } catch (error) {
            console.log('getshade LIST ERROR:', error?.response?.data || error.message);
            Alert.alert('Error', 'Unable to load design list');
            setShades([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadshades();
    }, []);

    useEffect(() => {
        const t = setTimeout(() => {
            loadshades();
        }, 400);

        return () => clearTimeout(t);
    }, [search]);

    const filteredshades = useMemo(() => {
        const s = search.toLowerCase();

        return shades.filter(item => {
            return (
                toText(item.ShdCode).toLowerCase().includes(s) ||
                toText(item.ShdName).toLowerCase().includes(s)
                // toText(item.DesignName).toLowerCase().includes(s)
            );
        });
    }, [shades, search]);

    // const selectshade = shade => {
    //     navigation.navigate('SalesOrderShadeList', {
    //         editMode,
    //         editIndex,
    //         oldRow,
    //         selectedItem,
    //         selectedDesign,
    //         selectedShade: {
    //             ShdCode: shade.ShdCode,
    //             ShdName: shade.ShdName || '',
    //             Raw: shade,
    //         },
    //         prpcode,
    //         strcode,
    //         yearno,
    //         token,
    //     });
    // };

    const selectshade = shade => {

        const exists = selectedShades.some(
            x => String(x.ShdCode) === String(shade.ShdCode)
        );

        let updatedShades = [];

        if (exists) {

            updatedShades = selectedShades.filter(
                x => String(x.ShdCode) !== String(shade.ShdCode)
            );

        } else {

            updatedShades = [
                ...selectedShades,
                {
                    ShdCode: shade.ShdCode,
                    ShdName: shade.ShdName || '',
                    Raw: shade,
                },
            ];

        }

        setSelectedShades(updatedShades);

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
        const ShdCode = item.ShdCode;
        const ShdName = item.ShdName || item.ShdName || '';

        const isOld =
            editMode &&
            oldRow &&
            String(oldRow.ShdCode) === String(ShdCode);

        const isSelected = selectedShades.some(
            x => String(x.ShdCode) === String(ShdCode)
        );

        return (
            <TouchableOpacity
                activeOpacity={0.85}
                style={[styles.card, isOld && styles.selectedCard]}
                // style={[
                //     styles.card,
                //     (isOld || isSelected) && styles.selectedCard
                // ]}
                onPress={() => selectshade(item)}
            >
                <View style={styles.itemIcon}>
                    <Icon name="palette" size={22} color="#13879A" />
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={styles.designCode}>{ShdCode}</Text>
                    <Text style={styles.designName}>{ShdName || '-'}</Text>

                    {isOld && (
                        <View style={styles.currentBadge}>
                            <Text style={styles.currentText}>Current Shade</Text>
                        </View>
                    )}
                </View>

                <View
                    // style={[styles.radio, isOld && styles.radioActive]}
                    style={[
                        styles.radio,
                        (isOld || isSelected) && styles.radioActive
                    ]}
                >
                    {/* {isOld && <Icon name="check" size={16} color="#fff" />} */}

                    {(isOld || isSelected) && (
                        <Icon name="check" size={16} color="#fff" />
                    )}
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.safe}>
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
                </View>


                <View style={styles.itemBox}>
                    <Text style={styles.boxLabel}>Selected Design</Text>
                    <Text style={styles.boxTitle}>
                        {selectedDesign?.DsnCode} - {selectedDesign?.DsnName}
                    </Text>
                </View>

                {editMode && oldRow && (
                    <View style={styles.oldBox}>
                        <Text style={styles.oldLabel}>Current Selected Shade</Text>
                        <Text style={styles.oldTitle}>
                            {oldRow.ShdCode} - {oldRow.ShdName}
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
                        placeholder="Search shade code or name"
                        placeholderTextColor="#98A2B3"
                        style={styles.searchInput}
                    />

                    <TouchableOpacity onPress={loadshades}>
                        <Icon name="refresh" size={20} color="#13879A" />
                    </TouchableOpacity>
                </View>

                {loading ? (
                    <View>{renderSkeleton()}</View>
                ) : (
                    <FlatList
                        data={filteredshades}
                        keyExtractor={(item, index) => `${item.DsnCode}_${index}`}
                        renderItem={renderItem}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ paddingBottom: 20 }}
                        ListEmptyComponent={
                            <View style={styles.emptyBox}>
                                <Icon name="category" size={44} color="#98A2B3" />
                                <Text style={styles.emptyTitle}>No design found</Text>
                            </View>
                        }
                    />

                )}
            </View>

            <View style={styles.bottomBar}>

                <Text style={styles.selectedCount}>
                    {selectedShades.length} shades selected
                </Text>

                <TouchableOpacity
                    style={styles.nextBtn}
                    onPress={() => {

                        if (selectedShades.length === 0) {
                            Alert.alert('Select Shade', 'Please select at least one shade');
                            return;
                        }

                        navigation.navigate('NextScreen', {
                            selectedShades,
                        });

                    }}
                >
                    <Text style={styles.nextText}>
                        Next
                    </Text>
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
        color: '#667085',
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
        marginLeft: 10,
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

    bottomBar: {
        paddingTop: 10,
        paddingBottom: 10,
    },

    selectedCount: {
        color: '#000',
        fontSize: 14,
        fontWeight: '700',
        marginBottom: 10,
        paddingLeft: 14
    },

    nextBtn: {
        height: 45,
        backgroundColor: '#16A34A',
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },

    nextText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '900',
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
});