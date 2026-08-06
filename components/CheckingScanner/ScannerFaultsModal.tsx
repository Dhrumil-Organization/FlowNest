import { API } from '@/common/API/dynamicAPI';
import { getCurrentFinancialYear } from '@/common/commonfunction';
import Icon from '@expo/vector-icons/MaterialIcons';
import axios from 'axios';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Modal,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

interface Fault {
    Faults: string;
    RDesc: string;
    Remark: string;
    RsnCode: string;
    SrNo: string;
    SubSr: string;
    UId: string;
}

interface ScannerFaultsModalProps {
    visible: boolean;
    token: string;
    rowData: any;
    loading?: boolean;
    onClose: () => void;
    onOK: (updatedData: any[]) => Promise<void>;
}

const ScannerFaultsModal: React.FC<ScannerFaultsModalProps> = ({
    visible,
    token,
    rowData,
    loading = false,
    onClose,
    onOK,
}) => {

    const [faultsData, setFaultsData] = useState<any[]>([]);
    const [pageLoading, setPageLoading] = useState(false);

    const headers = {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "X-Requested-With": "XMLHttpRequest",
    };

    useEffect(() => {

        if (!visible || !rowData) return;

        loadFaults();

    }, [visible, rowData]);

    const loadFaults = async () => {

        try {

            setPageLoading(true);

            const payload = {

                ShfCode: rowData.ShfCode,
                ChkDate: rowData.ChkDate,
                MacGrp: rowData.MacGrp,
                PrpCode: rowData.PrpCode,
                // yearno: rowData.yearno,
                BeamNo: rowData.BeamNo,
                SrNo: rowData.SrNo,
                UId: rowData.UId,
                yearno: getCurrentFinancialYear(),

                txntype: "beam_checking",

            };

            console.log(
                "Scanner Fault Fetch Payload",
                payload
            );

            // const response = await axios.post(
            //     `${API}/api/get_checking_fault_help`,
            //     payload,
            //     { headers }
            // );

            const response = await axios.get(`${API}/api/get_checking_fault_help`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                },
                params: payload,
            });

            console.log(
                "Scanner Fault Fetch Response",
                response.data
            );

            const apiData =
                response?.data?.data ||
                response?.data?.response?.data ||
                [];

            setFaultsData(apiData);

        } catch (e) {

            console.log(e);

        } finally {

            setPageLoading(false);

        }

    };

    const handleRemarkChange = (
        uid: string,
        subSr: string,
        remark: string
    ) => {

        setFaultsData(prev =>
            prev.map(item =>
                item.UId === uid &&
                    item.SubSr === subSr
                    ? {
                        ...item,
                        Remark: remark,
                    }
                    : item
            )
        );

    };

    const handleOK = async () => {

        await onOK(faultsData);

    };

    return (

        <Modal
            visible={visible}
            animationType="slide"
            transparent={false}
        >

            <View style={styles.modalContainer}>

                <View style={styles.modalHeader}>

                    <Text style={styles.modalTitle}>
                        Scanner Faults
                    </Text>

                    <TouchableOpacity
                        onPress={onClose}
                    >
                        <Icon
                            name="close"
                            size={24}
                            color="#000"
                        />
                    </TouchableOpacity>

                </View>

                {
                    pageLoading ?

                        <View
                            style={styles.loaderContainer}
                        >

                            <ActivityIndicator
                                size="large"
                            />

                        </View>

                        :

                        <FlatList
                            data={faultsData}
                            keyExtractor={(item, index) =>
                                `${item.UId}_${item.SubSr}_${index}`
                            }
                            renderItem={({ item }) => (

                                <View style={styles.faultItem}>

                                    <View style={styles.faultHeader}>

                                        <View style={{ flex: 1 }}>

                                            <Text
                                                style={styles.faultSubSr}
                                            >
                                                Sr. No : {item.SubSr}
                                            </Text>

                                            <Text
                                                style={styles.faultDesc}
                                            >
                                                {item.RDesc}
                                            </Text>

                                        </View>

                                        <Text
                                            style={styles.reasonCode}
                                        >
                                            {item.RsnCode}
                                        </Text>

                                    </View>

                                    <TextInput
                                        style={styles.input}
                                        value={item.Remark ?? ""}
                                        placeholder="123, 345-678"
                                        placeholderTextColor="#999"
                                        onChangeText={(text) =>
                                            handleRemarkChange(
                                                item.UId,
                                                item.SubSr,
                                                text
                                            )
                                        }
                                    />

                                </View>

                            )}
                        />

                }
                <View style={styles.modalFooter}>

                    <TouchableOpacity
                        style={styles.cancelButton}
                        onPress={onClose}
                        disabled={loading}
                    >
                        <Text style={styles.cancelText}>
                            Cancel
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[
                            styles.okButton,
                            loading && { opacity: 0.6 },
                        ]}
                        onPress={handleOK}
                        disabled={loading}
                    >

                        {
                            loading ?

                                <ActivityIndicator
                                    color="#fff"
                                />

                                :

                                <Text style={styles.okText}>
                                    OK
                                </Text>

                        }

                    </TouchableOpacity>

                </View>

            </View>

        </Modal>

    );

};

const styles = StyleSheet.create({

    modalContainer: {
        flex: 1,
        backgroundColor: "#fff",
        padding: 16,
    },

    loaderContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },

    modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginTop: 55,
        marginBottom: 18,
    },

    modalTitle: {
        fontSize: 20,
        fontWeight: "700",
        color: "#111",
    },

    faultItem: {
        borderWidth: 1,
        borderColor: "#E5E5E5",
        borderRadius: 10,
        padding: 12,
        marginBottom: 12,
        backgroundColor: "#fff",
    },

    faultHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: 8,
    },

    faultSubSr: {
        fontSize: 13,
        color: "#555",
        fontWeight: "600",
    },

    faultDesc: {
        fontSize: 15,
        color: "#222",
        marginTop: 4,
    },

    reasonCode: {
        fontSize: 14,
        color: "#007AFF",
        fontWeight: "700",
    },

    input: {
        borderWidth: 1,
        borderColor: "#DADADA",
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        marginTop: 8,
        color: "#000",
        fontSize: 14,
        backgroundColor: "#FFF",
    },

    modalFooter: {
        flexDirection: "row",
        justifyContent: "flex-end",
        marginTop: 16,
    },

    cancelButton: {
        paddingHorizontal: 20,
        paddingVertical: 12,
        marginRight: 12,
    },

    cancelText: {
        color: "#007AFF",
        fontWeight: "700",
        fontSize: 15,
    },

    okButton: {
        backgroundColor: "#007AFF",
        borderRadius: 8,
        paddingHorizontal: 26,
        paddingVertical: 12,
        justifyContent: "center",
        alignItems: "center",
        minWidth: 90,
    },

    okText: {
        color: "#FFF",
        fontWeight: "700",
        fontSize: 15,
    },

});

export default ScannerFaultsModal;