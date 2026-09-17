import AppAlert from '@/common/utils/appAlert';
import axios from "axios";
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Keyboard, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { API } from "../../common/API/dynamicAPI";

const SelectBeam = ({ visible, onClose, FormState, token, txntype, setFormState }) => {

    const [beamList, setBeamList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchText, setSearchText] = useState("");

    const formatDate = (date) => {
        if (!date) return "";
        const d = new Date(date);

        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();

        return `${day}-${month}-${year}`;
    };

    const fetchBeamList = async () => {
        try {
            setLoading(true);

            const payload = {
                PrpCode: 'SIP',
                YearNo: FormState?.values?.YearNo,
                ChkDate: formatDate(FormState.values.CheckingDate),
                txntype: 'beam_open_tablet'
            };

            const response = await axios.get(`${API}/api/get_checking_help`, {
                params: payload,
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            const data = response?.data?.response?.data || [];

            setBeamList(data);

        } catch (error) {
            console.log("BEAM API ERROR:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (visible) {
            fetchBeamList();
        }
    }, [visible]);

    const handleDemo = (rowData) => {
        if (!rowData) return;

        AppAlert.alert(
            "Confirm",
            `Do you want to open this Beam entry ${rowData.BeamNo}?`,
            [
                {
                    text: "Cancel",
                    style: "cancel"
                },
                {
                    text: "Yes",
                    onPress: () => handleSaveEntry(rowData)
                }
            ],
            { cancelable: true }
        );
    };

    const handleSaveEntry = async (rowData) => {
        try {
            setLoading(true);

            const d1obj = {
                font: 0,
                PrpCode: rowData.PrpCode,
                UId: rowData.UId,
                PlanUId: rowData.PlanUId,
                BeamUId: rowData.BeamUId,
                MacCode: rowData.MacCode,
                MacName: rowData.MacName,
                BeamNo: rowData.BeamNo,
                PlanNo: rowData.PlanNo,
                DsnCode: rowData.DsnCode,
                DsnName: rowData.DsnName,
                TakaNo: rowData.TakaNo,
                WarpLen: rowData.WarpLen,
                QltWt: rowData.QltWt,
                islasttakatrack: rowData.islasttakatrack,
                Status: rowData.Status,
                // Qty: rowData.Qty,
                // Wt: rowData.Wt,
                // AvgWt: rowData.AvgWt,
                // WvrCode: rowData.WvrCode,
                // WvrName: rowData.WvrName,
                ShfCode: 0,
                YearNo: FormState.values.YearNo,
                ChkDate: formatDate(FormState.values.CheckingDate),
                txntype: 'beam_close_tablet',
                // ismending: rowData.ismending,
                islasttaka: rowData.islasttaka || '',
                SrNo: 0,
                isalldata: 0,
            };

            const payload = {
                ShfCode: 0,
                ChkDate: formatDate(FormState.values.CheckingDate),
                MacGrp: FormState.values.MacGrp || '',
                PrpCode: rowData.PrpCode,
                prpcode: rowData.PrpCode,
                YearNo: FormState.values.YearNo,
                yearno: FormState.values.YearNo,
                d1: [d1obj],
                d2: FormState.values.d2 || [],
                txntype: 'beam_close_tablet'
            };

            const response = await axios.post(
                `${API}/api/add_beam_open`,
                payload,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (response.data.success === true) {
                AppAlert.alert("Success", "Saved successfully.");

                // 👉 FormState update bhi yahin karo
                setFormState(prev => ({
                    ...prev,
                    values: {
                        ...prev.values,
                        BeamNo: rowData.BeamNo,
                        DsnCode: rowData.DsnCode,
                        DsnName: rowData.DsnName,
                        MacCode: rowData.MacCode,
                        MacName: rowData.MacName
                    }
                }));
                onClose(); // modal close
            } else {
                AppAlert.alert("Warning", response.data.message);
            }

        } catch (error) {
            console.log("SAVE ERROR:", error);
            AppAlert.alert("Error", "Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    const renderItem = ({ item }) => (
        <View style={styles.card}>

            {/* Top Row */}
            <View style={styles.rowBetween}>
                <Text style={styles.beamNo}>Beam No: {item.BeamNo}</Text>
                <Text style={styles.plan}>Plan No: {item.PlanNo}</Text>
            </View>

            {/* Machine */}
            <Text style={styles.text}>
                Machine: {item.MacCode} - {item.MacName}
            </Text>

            {/* Design */}
            <Text style={styles.text}>
                Design: {item.DsnCode} - {item.DsnName}
            </Text>

            {/* Balance */}
            <Text style={styles.balance}>
                Balance: {item.WarpLen}
            </Text>

            {searchText ? (
                <Text style={styles.matchText}>
                    {getMatchType(item)}
                </Text>
            ) : null}

            {/* Button */}
            <View style={styles.buttonRow}>
                <TouchableOpacity
                    onPress={() => handleDemo(item)}
                >
                    <LinearGradient
                        colors={['#5baee5', '#5baee5']}
                        style={styles.smallBtn}
                    >
                        <Text style={styles.buttonText}>Open Beam</Text>
                    </LinearGradient>
                </TouchableOpacity>
            </View>
        </View>
    );

    const filteredBeamList = beamList.filter(item => {
        const search = searchText.toLowerCase();

        return (
            item.BeamNo?.toString().toLowerCase().includes(search) ||
            item.PlanNo?.toString().toLowerCase().includes(search) ||
            item.MacCode?.toString().toLowerCase().includes(search) ||
            item.MacName?.toLowerCase().includes(search) ||
            item.DsnCode?.toString().toLowerCase().includes(search) ||
            item.DsnName?.toLowerCase().includes(search) ||
            item.WarpLen?.toString().toLowerCase().includes(search)
        );
    });

    const getMatchType = (item) => {
        const search = searchText.toLowerCase();

        if (item.BeamNo?.toString().toLowerCase().includes(search)) {
            return `Matched: Beam No (${item.BeamNo})`;
        }
        if (item.PlanNo?.toString().toLowerCase().includes(search)) {
            return `Matched: Plan No (${item.PlanNo})`;
        }
        if (item.MacCode?.toString().toLowerCase().includes(search)) {
            return `Matched: Machine Code (${item.MacCode})`;
        }
        if (item.MacName?.toLowerCase().includes(search)) {
            return `Matched: Machine Name (${item.MacName})`;
        }
        if (item.DsnCode?.toString().toLowerCase().includes(search)) {
            return `Matched: Design Code (${item.DsnCode})`;
        }
        if (item.DsnName?.toLowerCase().includes(search)) {
            return `Matched: Design Name (${item.DsnName})`;
        }
        if (item.WarpLen?.toString().toLowerCase().includes(search)) {
            return `Matched: Balance (${item.WarpLen})`;
        }

        return "";
    };

    return (
        <View style={[styles.overlay, { display: visible ? 'flex' : 'none' }]}>
            <View style={styles.container}>

                <View style={styles.header}>
                    <Text style={styles.headerText}>Closed Beam List</Text>
                    <TouchableOpacity onPress={onClose}>
                        <Text style={{ fontSize: 20 }}>✕</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.searchContainer}>
                    <TextInput
                        placeholder="Search...."
                        value={searchText}
                        onChangeText={setSearchText}
                        style={styles.searchInput}
                    />

                    {searchText ? (
                        <TouchableOpacity
                            onPress={() => {
                                setSearchText("");
                                Keyboard.dismiss();   // 👈 keyboard band
                            }}>
                            <Text style={styles.clearIcon}>✕</Text>
                        </TouchableOpacity>
                    ) : null}
                </View>

                {loading ? (
                    <ActivityIndicator size="large" />
                ) : (
                    <FlatList
                        data={filteredBeamList}
                        keyExtractor={(item, index) => index.toString()}
                        renderItem={renderItem}
                        style={{ flex: 1 }}   // ✅ important
                        ListEmptyComponent={
                            <Text style={{ textAlign: 'center', marginTop: 20 }}>
                                No Beam Found
                            </Text>
                        }
                    />
                )}

            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    overlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',   // ❌ flex-end hatao
        alignItems: 'center'
    },

    container: {
        backgroundColor: '#fff',
        width: '95%',
        height: '90%',        // ✅ full screen feel
        borderRadius: 12,
        padding: 12
    },

    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 10
    },

    headerText: {
        fontSize: 16,
        fontWeight: 'bold'
    },

    item: {
        padding: 12,
        borderBottomWidth: 1,
        borderColor: '#eee'
    },

    title: {
        fontWeight: '600'
    },

    sub: {
        color: '#666',
        fontSize: 12
    },
    card: {
        backgroundColor: '#f9f9f9',
        borderRadius: 10,
        padding: 12,
        marginBottom: 10,
        elevation: 2
    },

    rowBetween: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 5
    },

    beamNo: {
        fontWeight: 'bold',
        fontSize: 14
    },

    plan: {
        fontSize: 14,
        color: '#555'
    },

    text: {
        // fontSize: 13,
        // fontWeight: 'bold',
        fontSize: 14,
        marginBottom: 3
    },

    balance: {
        marginTop: 5,
        fontWeight: '600',
        color: 'green'
    },

    button: {
        marginTop: 10,
        backgroundColor: '#007bff',
        paddingVertical: 10,
        borderRadius: 6,
        alignItems: 'center'
    },

    buttonText: {
        color: '#fff',
        fontWeight: '600'
    },

    buttonRow: {
        marginTop: 10,
        flexDirection: 'row',
        justifyContent: 'flex-end'   // 👉 right side
    },

    smallBtn: {
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 20,   // 👉 pill shape
        alignItems: 'center'
    },

    // searchInput: {
    //     borderWidth: 1,
    //     borderColor: '#ccc',
    //     borderRadius: 8,
    //     paddingHorizontal: 10,
    //     paddingVertical: 8,
    //     marginBottom: 10,
    //     backgroundColor: '#f5f5f5'
    // },

    matchText: {
        marginTop: 4,
        fontSize: 12,
        color: '#007bff',
        fontStyle: 'italic'
    },

    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 8,
        paddingHorizontal: 10,
        marginBottom: 10,
        backgroundColor: '#f5f5f5'
    },

    searchInput: {
        flex: 1,
        paddingVertical: 8
    },

    clearIcon: {
        fontSize: 18,
        color: '#999',
        paddingLeft: 10
    },
});

export default SelectBeam;