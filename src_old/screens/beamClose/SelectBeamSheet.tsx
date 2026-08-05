// FILE: src/screens/beamClose/SelectBeamSheet.tsx
// Migrated from BeamClose/SelectBeam.tsx. Business logic (payload shape,
// validation, save behavior) preserved exactly — only structural changes:
// shared API client, shared theme, and a plain solid button in place of a
// LinearGradient that was using the same color twice (not actually a
// gradient in the original).
import { BeamCloseAPI } from '@/src/api/legacyClient';
import { T } from '@/src/theme';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Keyboard, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

interface Props {
    visible: boolean;
    onClose: () => void;
    FormState: { values: Record<string, any> };
    setFormState: React.Dispatch<React.SetStateAction<{ values: Record<string, any> }>>;
    token: string;
}

export function SelectBeamSheet({ visible, onClose, FormState, setFormState, token }: Props) {
    const [beamList, setBeamList] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchText, setSearchText] = useState('');

    const formatDate = (date: any) => {
        if (!date) return '';
        const d = new Date(date);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${day}-${month}-${year}`;
    };

    const fetchBeamList = async () => {
        try {
            setLoading(true);
            const response = await BeamCloseAPI.checkingHelp({
                PrpCode: 'SIP',
                YearNo: FormState?.values?.YearNo,
                ChkDate: formatDate(FormState.values.CheckingDate),
                txntype: 'beam_open_tablet',
            });
            setBeamList(response?.data?.response?.data || []);
        } catch (error) {
            console.log('BEAM API ERROR:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (visible) fetchBeamList();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [visible]);

    const handleSaveEntry = async (rowData: any) => {
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
                ShfCode: 0,
                YearNo: FormState.values.YearNo,
                ChkDate: formatDate(FormState.values.CheckingDate),
                txntype: 'beam_close_tablet',
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
                txntype: 'beam_close_tablet',
            };

            const response = await BeamCloseAPI.addBeamOpen(payload);

            if (response.data.success === true) {
                Alert.alert('Success', 'Saved successfully.');
                setFormState((prev) => ({
                    ...prev,
                    values: {
                        ...prev.values,
                        BeamNo: rowData.BeamNo,
                        DsnCode: rowData.DsnCode,
                        DsnName: rowData.DsnName,
                        MacCode: rowData.MacCode,
                        MacName: rowData.MacName,
                    },
                }));
                onClose();
            } else {
                Alert.alert('Warning', response.data.message);
            }
        } catch (error) {
            console.log('SAVE ERROR:', error);
            Alert.alert('Error', 'Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    const handleDemo = (rowData: any) => {
        if (!rowData) return;
        Alert.alert(
            'Confirm',
            `Do you want to open this Beam entry ${rowData.BeamNo}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Yes', onPress: () => handleSaveEntry(rowData) },
            ],
            { cancelable: true },
        );
    };

    const getMatchType = (item: any) => {
        const search = searchText.toLowerCase();
        if (item.BeamNo?.toString().toLowerCase().includes(search)) return `Matched: Beam No (${item.BeamNo})`;
        if (item.PlanNo?.toString().toLowerCase().includes(search)) return `Matched: Plan No (${item.PlanNo})`;
        if (item.MacCode?.toString().toLowerCase().includes(search)) return `Matched: Machine Code (${item.MacCode})`;
        if (item.MacName?.toLowerCase().includes(search)) return `Matched: Machine Name (${item.MacName})`;
        if (item.DsnCode?.toString().toLowerCase().includes(search)) return `Matched: Design Code (${item.DsnCode})`;
        if (item.DsnName?.toLowerCase().includes(search)) return `Matched: Design Name (${item.DsnName})`;
        if (item.WarpLen?.toString().toLowerCase().includes(search)) return `Matched: Balance (${item.WarpLen})`;
        return '';
    };

    const filteredBeamList = beamList.filter((item) => {
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

    const renderItem = ({ item }: { item: any }) => (
        <View style={s.card}>
            <View style={s.rowBetween}>
                <Text style={s.beamNo}>Beam No: {item.BeamNo}</Text>
                <Text style={s.plan}>Plan No: {item.PlanNo}</Text>
            </View>
            <Text style={s.text}>Machine: {item.MacCode} - {item.MacName}</Text>
            <Text style={s.text}>Design: {item.DsnCode} - {item.DsnName}</Text>
            <Text style={s.balance}>Balance: {item.WarpLen}</Text>
            {searchText ? <Text style={s.matchText}>{getMatchType(item)}</Text> : null}
            <View style={s.buttonRow}>
                <TouchableOpacity style={s.smallBtn} onPress={() => handleDemo(item)}>
                    <Text style={s.buttonText}>Open Beam</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <View style={[s.overlay, { display: visible ? 'flex' : 'none' }]}>
            <View style={s.container}>
                <View style={s.header}>
                    <Text style={s.headerText}>Closed Beam List</Text>
                    <TouchableOpacity onPress={onClose}>
                        <Text style={{ fontSize: 20 }}>✕</Text>
                    </TouchableOpacity>
                </View>

                <View style={s.searchContainer}>
                    <TextInput placeholder="Search...." value={searchText} onChangeText={setSearchText} style={s.searchInput} />
                    {searchText ? (
                        <TouchableOpacity onPress={() => { setSearchText(''); Keyboard.dismiss(); }}>
                            <Text style={s.clearIcon}>✕</Text>
                        </TouchableOpacity>
                    ) : null}
                </View>

                {loading ? (
                    <ActivityIndicator size="large" color={T.nav} />
                ) : (
                    <FlatList
                        data={filteredBeamList}
                        keyExtractor={(item, index) => index.toString()}
                        renderItem={renderItem}
                        style={{ flex: 1 }}
                        ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 20 }}>No Beam Found</Text>}
                    />
                )}
            </View>
        </View>
    );
}

const s = StyleSheet.create({
    overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    container: { backgroundColor: T.surface, width: '95%', height: '90%', borderRadius: 12, padding: 12 },
    header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
    headerText: { fontSize: 16, fontWeight: 'bold', color: T.ink },
    card: { backgroundColor: T.alt, borderRadius: 10, padding: 12, marginBottom: 10 },
    rowBetween: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
    beamNo: { fontWeight: 'bold', fontSize: 14, color: T.ink },
    plan: { fontSize: 14, color: T.muted },
    text: { fontSize: 14, marginBottom: 3, color: T.ink },
    balance: { marginTop: 5, fontWeight: '600', color: T.green },
    buttonRow: { marginTop: 10, flexDirection: 'row', justifyContent: 'flex-end' },
    smallBtn: { backgroundColor: T.nav, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, alignItems: 'center' },
    buttonText: { color: '#fff', fontWeight: '600' },
    matchText: { marginTop: 4, fontSize: 12, color: T.nav, fontStyle: 'italic' },
    searchContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: T.border, borderRadius: 8, paddingHorizontal: 10, marginBottom: 10, backgroundColor: T.sub },
    searchInput: { flex: 1, paddingVertical: 8, color: T.ink },
    clearIcon: { fontSize: 18, color: T.muted, paddingLeft: 10 },
});
