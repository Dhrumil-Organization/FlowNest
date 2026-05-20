import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    SafeAreaView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { CommonActions } from '@react-navigation/native';

const SalesOrderAddAnotherShade = ({ navigation, route }) => {
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

        lastRow = null,
        workingRows = [],

        party = null,
        partyData = null,
        selectedParty = null,

        prpcode = '',
        strcode = '002',
        yearno = '',
        token = '',
    } = route?.params || {};

    const finalParty = party || partyData || selectedParty || null;

    const finalEditLineId =
        editLineId ||
        lastRow?.LineId ||
        oldRow?.LineId ||
        null;

    const getRouteName = (names, preferred, fallback) => {
        if (names.includes(preferred)) return preferred;
        if (names.includes(fallback)) return fallback;
        return preferred;
    };

    console.log("selectedItem", selectedItem);
    console.log("lastRow", lastRow);
    console.log("workingRows", workingRows);

    const onYes = () => {
        navigation.navigate('SalesOrderShadeList', {
            mode,
            uid,
            soNo,
            soDate,

            editMode: false,
            editIndex: null,
            editLineId: null,
            oldRow: null,

            selectedItem,
            selectedGrade,

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

    const onNo = () => {
        const state = navigation.getState();

        const keepRoutes = state.routes.filter(
            r =>
                ![
                    'SalesOrderItemList',
                    'SalesOrderGradeList',
                    'SalesOrderShadeList',
                    'SalesOrderDetails',
                    'SalesOrderAddAnotherShade',
                    'OrderSummaryScreen',
                ].includes(r.name),
        );
        const stableUid = Number(
            uid ||
            workingRows?.[0]?.UId ||
            lastRow?.UId ||
            oldRow?.UId ||
            0
        );

        const stableMode =
            stableUid > 0 || mode === 'EDIT'
                ? 'EDIT'
                : 'ADD';
        navigation.dispatch(
            CommonActions.reset({
                index: keepRoutes.length,
                routes: [
                    ...keepRoutes,
                    {
                        name: 'OrderSummaryScreen',
                        params: {
                            mode: stableMode,
                            uid: stableUid,
                            skipReload: true,
                            soNo,
                            soDate,
                            completedRows: workingRows,
                            completedRow: lastRow,

                            editMode,
                            editIndex,
                            editLineId: finalEditLineId,
                            oldRow,

                            party: finalParty,
                            partyData: finalParty,
                            selectedParty: finalParty,

                            prpcode,
                            strcode,
                            yearno,
                            token,
                        },
                    },
                ],
            }),
        );
    };

    return (
        <SafeAreaView style={styles.safe}>
            <View style={styles.container}>
                <View style={styles.check}>
                    <Icon name="check" size={52} color="#fff" />
                </View>

                <Text style={styles.title}>
                    {editMode ? 'Shade Updated Successfully' : 'Shade Added Successfully'}
                </Text>

                <View style={styles.card}>
                    <Text style={styles.cardTitle}>
                        {lastRow?.ShdCode} - {lastRow?.ShdName}
                    </Text>

                    <Text style={styles.row}>SrNo: {lastRow?.SrNo}</Text>
                    <Text style={styles.row}>Qty: {lastRow?.Qty}</Text>
                    <Text style={styles.row}>Pcs: {lastRow?.Pcs}</Text>
                    <Text style={styles.row}>Rate: ₹ {lastRow?.Rate}</Text>
                    <Text style={styles.row}>Amount: ₹ {lastRow?.Amount}</Text>
                    <Text style={styles.row}>Total Rows: {workingRows.length}</Text>
                </View>
{/* 
                {!editMode && (
                    <Text style={styles.ask}>
                        Do you want to add another shade for same item and design?
                    </Text>
                )} */}

                {/* {!editMode && (
                    <TouchableOpacity style={styles.btn} onPress={onYes}>
                        <Text style={styles.btnText}>Yes, Add Another Shade</Text>
                    </TouchableOpacity>
                )} */}

                <TouchableOpacity style={styles.btn2} onPress={onNo}>
                    <Text style={styles.btnText2}>
                        {
                        // editMode ? 
                        'Back To Order Summary' 
                        // : 'No, Finish This Item'
                        }
                    </Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
};

export default SalesOrderAddAnotherShade;

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: '#F5F7FB' },
    container: {
        flex: 1,
        justifyContent: 'center',
        padding: 20,
    },
    check: {
        width: 94,
        height: 94,
        borderRadius: 47,
        backgroundColor: '#13879A',
        justifyContent: 'center',
        alignItems: 'center',
        alignSelf: 'center',
    },
    title: {
        fontSize: 22,
        fontWeight: '900',
        textAlign: 'center',
        marginTop: 20,
        color: '#000',
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        marginTop: 22,
        borderWidth: 1,
        borderColor: '#E4E7EF',
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '900',
        color: '#000',
        marginBottom: 10,
    },
    row: {
        fontSize: 14,
        color: '#000',
        fontWeight: '700',
        marginTop: 5,
    },
    ask: {
        textAlign: 'center',
        marginTop: 28,
        fontSize: 16,
        fontWeight: '800',
        lineHeight: 24,
        color: '#000',
    },
    btn: {
        backgroundColor: '#13879A',
        height: 52,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 26,
    },
    btnText: {
        color: '#fff',
        fontWeight: '900',
        fontSize: 15,
    },
    btn2: {
        borderWidth: 1,
        borderColor: '#13879A',
        height: 52,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 14,
        backgroundColor: '#fff',
    },
    btnText2: {
        color: '#13879A',
        fontWeight: '900',
        fontSize: 15,
    },
});