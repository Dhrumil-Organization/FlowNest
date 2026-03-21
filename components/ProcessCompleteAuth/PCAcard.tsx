import React, { useState, useEffect } from 'react';

import { View, Text, StyleSheet, FlatList } from 'react-native';
import { TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import theme from '../../android/app/src/theme';

const PCAcard = (props) => {

    const data = [
        {
            Type: "Greading",
            ProdUid: "510076326",
            PackingNo: "01/01528",
            PackDate: "16/01/2026",
            ItmCode: "2342451",
            TotWt: "321.700",
            TotPcs: "17",
            ItmName: "9722",
            MerCode: "629768",
            MerName: "01/15099",
            CartNo: "SD122930",
            ShdName: "LM-69635",
            ProdType: "5.DAMAN",
        },
        {
            Type: "Gread45ing",
            ProdUid: "510076365426",
            PackingNo: "01/01528",
            PackDate: "16/01/2026",
            ItmCode: "2342545451",
            TotWt: "321.7006",
            TotPcs: "17",
            ItmName: "97242",
            MerCode: "629768",
            MerName: "01/15099",
            CartNo: "SD122930",
            ShdName: "LM-69635",
            ProdType: "5.DAMAN",
        },
        {
            Type: "Gread45ing",
            ProdUid: "510076365426",
            PackingNo: "01/01528",
            PackDate: "16/01/2026",
            ItmCode: "2342545451",
            TotWt: "321.7006",
            TotPcs: "17",
            ItmName: "97242",
            MerCode: "629768",
            MerName: "01/15099",
            CartNo: "SD122930",
            ShdName: "LM-69635",
            ProdType: "5.DAMAN",
        },
        {
            Type: "Gread45ing",
            ProdUid: "510076365426",
            PackingNo: "01/01528",
            PackDate: "16/01/2026",
            ItmCode: "2342545451",
            TotWt: "321.7006",
            TotPcs: "17",
            ItmName: "97242",
            MerCode: "629768",
            MerName: "01/15099",
            CartNo: "SD122930",
            ShdName: "LM-69635",
            ProdType: "5.DAMAN",
        },
        {
            Type: "Gread45ing",
            ProdUid: "510076365426",
            PackingNo: "01/01528",
            PackDate: "16/01/2026",
            ItmCode: "2342545451",
            TotWt: "321.7006",
            TotPcs: "17",
            ItmName: "97242",
            MerCode: "629768",
            MerName: "01/15099",
            CartNo: "SD122930",
            ShdName: "LM-69635",
            ProdType: "5.DAMAN",
        },
    ];

    const renderItem = ({ item }) => (
        <View style={styles.card}>

            {/* Header */}
            <View style={styles.headerContainer}>
                <Text style={styles.headerText}>{item.Type}</Text>
            </View>
            <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Item</Text>
                <Text style={styles.infoValue}>{item.ItmName}</Text>
            </View>
            <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Merge</Text>
                <Text style={styles.infoValue}>{item.MerName}</Text>
            </View>
            <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Shade</Text>
                <Text style={styles.infoValue}>{item.ShdName}</Text>
            </View>
            <View style={styles.divider1} />
            {/* Row 1 */}
            <View style={styles.row}>
                <View style={styles.col}>
                    <Text style={styles.label}>Cart No</Text>
                    <Text style={styles.value}>{item.CartNo}</Text>
                </View>
                <View style={styles.col}>
                    <Text style={styles.label}>Packing No</Text>
                    <Text style={styles.value}>{item.PackingNo}</Text>
                </View>
            </View>

            {/* Row 2 */}
            <View style={styles.row}>
                <View style={styles.col}>
                    <Text style={styles.label}>Pack Date</Text>
                    <Text style={styles.value}>{item.PackDate}</Text>
                </View>
                <View style={styles.col}>
                    <Text style={styles.label}>Item Code</Text>
                    <Text style={styles.value}>{item.ItmCode}</Text>
                </View>
            </View>

            {/* Row 3 */}
            <View style={styles.row}>
                <View style={styles.col}>
                    <Text style={styles.label}>Weight</Text>
                    <Text style={styles.value}>{item.TotWt}</Text>
                </View>
                <View style={styles.col}>
                    <Text style={styles.label}>Pieces</Text>
                    <Text style={styles.value}>{item.TotPcs}</Text>
                </View>
            </View>



            {/* Row 5 */}
            {/* <View style={styles.row}>
                <View style={styles.col}>
                    <Text style={styles.label}>Cart No</Text>
                    <Text style={styles.value}>{item.CartNo}</Text>
                </View>
            </View> */}

            <View style={styles.divider} />
            {/* Footer */}
            {/* <Text style={styles.footer}>{item.ProdType}</Text> */}
            <View style={styles.footerRow}>
                <TouchableOpacity style={[styles.iconBtn]}>
                    <Icon name="visibility" size={35} color="#4CAF50" />
                </TouchableOpacity>

                <TouchableOpacity style={[styles.iconBtn]}>
                    <Icon name="edit" size={35} color="#FF9800" />
                </TouchableOpacity>

                <TouchableOpacity style={[styles.iconBtn]}>
                    <Icon name="delete" size={35} color="#F44336" />
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <FlatList
            data={data}
            renderItem={renderItem}
            keyExtractor={(item, index) => index.toString()}
            contentContainerStyle={{ padding: 10 }}
        />
    );
}

export default PCAcard;

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#ffffff',
        borderRadius: 16,
        padding: 10,
        marginBottom: 10,
        // Shadow
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 8,
        borderWidth: 0.5,
        borderColor: theme.BRAND_GRADIENT_START,
    },
    headerContainer: {
        backgroundColor: theme.BRAND_GRADIENT_START,
        paddingVertical: 8,
        borderRadius: 10,
        marginBottom: 5,
        marginTop: 3,
        alignItems: 'center', // 🔥 center horizontally        
    },
    headerText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    // header: {
    //     fontSize: 16,
    //     fontWeight: 'bold',
    //     color: '#4A90E2',
    //     marginBottom: 10,
    // },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 5,
    },
    col: {
        width: '48%',
    },
    label: {
        fontSize: 12,
        color: '#999',
    },
    value: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
    },
    footer: {
        marginTop: 5,
        textAlign: 'right',
        fontSize: 12,
        color: '#888',
    },
    footerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 5,
    },
    iconBtn: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 0,
        borderRadius: 10,
        marginHorizontal: 40,
    },
    divider: {
        height: 0.6,
        backgroundColor: theme.BRAND_GRADIENT_START,
        marginVertical: 0,
        marginTop: 0,
        marginBottom: 0,
    },
    divider1: {
        height: 0.6,
        backgroundColor: theme.BRAND_GRADIENT_START,
        marginVertical: 0,
        marginTop: 10,
        marginBottom: 5,
    },
    infoRow: {
        flexDirection: "row",
        marginBottom: 0
    },
    infoLabel: {
        width: 60,              // fixed alignment
        fontSize: 12,
        color: '#999',         // light color
    },
    infoValue: {
        flex: 1,
        fontSize: 14,
        //fontWeight: "700",
        color: "#333"
    },
});
