import AppAlert from '@/common/utils/appAlert';
/* eslint-disable react/no-unstable-nested-components */
import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    SafeAreaView,
    ActivityIndicator,
    ScrollView,
    Modal,
    Alert,
} from 'react-native';
import axios from 'axios';
import Icon from '@expo/vector-icons/MaterialIcons';
import { POTDataProps, LabelMap, CardPayload, StageData } from './Modal';
import Svg, { Circle, G, Path } from 'react-native-svg';
import { API } from '../../common/API/dynamicAPI';

const ProdOrderTrackingCard: React.FC<POTDataProps> = ({
    gePOTData,
    searchQueryPOT,
    getpayload,
    token,
    parentDesignData
}) => {
    const [filteredData, setFilteredData] = useState(gePOTData || []);
    const [getStageData, setStageData] = useState<StageData[]>([]);
    const [isStageLoading, setStageLoading] = useState(false);
    const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
    const [modalVisible, setModalVisible] = useState(false);
    const [page, setPage] = useState(1);
    const [allData, setAllData] = useState(gePOTData || []);
    const [isLoadingMore, setIsLoadingMore] = useState(false);

    // useEffect(() => {
    //     if (!searchQueryPOT.trim()) {
    //         setFilteredData(gePOTData || []);
    //     } else {
    //         const filtered = (gePOTData || []).filter((item) =>
    //             Object.values(item).some(
    //                 (value) =>
    //                     typeof value === 'string' &&
    //                     value.toLowerCase().includes(searchQueryPOT.toLowerCase())
    //             )
    //         );
    //         setFilteredData(filtered);
    //     }
    // }, [gePOTData, searchQueryPOT]);

    useEffect(() => {
        if (!searchQueryPOT.trim()) {
            setFilteredData(gePOTData || []);
            setAllData((gePOTData || []).slice(0, 10)); // Reset pagination
            setPage(1);
        } else {
            // Step 1: ParentDesignData se pdesign nikalo jo searchQuery se match kare
            const matchedParentDesigns = parentDesignData.filter((parent) =>
                parent.pdesign.toLowerCase().includes(searchQueryPOT.toLowerCase()) ||
                parent.cdesign.toLowerCase().includes(searchQueryPOT.toLowerCase())
                // parent.pdesign.toLowerCase().includes(searchQueryPOT.toLowerCase())
            );

            // Step 2: gePOTData ko filter karo (normal search + parent design match)
            const filtered = (gePOTData || []).filter((item) => {
                const matchesSearch = Object.values(item).some(
                    (value) =>
                        typeof value === 'string' &&
                        value.toLowerCase().includes(searchQueryPOT.toLowerCase())
                );
                const matchesParentDesign = matchedParentDesigns.some(
                    (parent) => parent.pdesign === item.dsnname
                );
                return matchesSearch || matchesParentDesign;
            });

            setFilteredData(filtered);
            setAllData(filtered.slice(0, 10)); // Reset pagination
            setPage(1);
        }
    }, [gePOTData, searchQueryPOT, parentDesignData]);



    const handleCardPress = (item: any) => {
        setSelectedCardId(item.uid);
        setStageLoading(true);
        console.log('Selected Card Data:', item);
        const getpayloadsend = getpayload as object as CardPayload[];
        const infoPyload = { ...getpayloadsend[0], rowdata: [item] };
        console.log('infoPyload:', infoPyload);
        handleConfirmAction(infoPyload);
    };

    const getToken = () => {
        return token;
    };

    const handleConfirmAction = async (infoPyload: CardPayload) => {
        console.log('🔵 Send Row payload', infoPyload);
        const headers = {
            Authorization: `Bearer ${getToken()}`,
            'Content-Type': 'application/json',
            'X-Requested-with': 'XMLHttpRequest',
        };
        try {
            // const response = await axios.post(`https://apig.tms-webapp.com/api/prodordertrack`, infoPyload, { headers });
            const response = await axios.post(`${API}/api/prodordertrack`, infoPyload, { headers });
            if (response.data.success && response.data.data) {
                const { data: responseData, caption, stages } = response.data.data;

                const isValidValue = (val: any) => {
                    if (val === null || val === undefined) return false;
                    if (val === '') return false;
                    if (!isNaN(val) && val !== true && val !== false) {
                        const numVal = parseFloat(val);
                        return !(isNaN(numVal) || numVal === 0);
                    }
                    return true;
                };

                const formatValue = (val: any, key: any) => {
                    if (key === 'prodorderno' || key === 'dsnname') {
                        return val;
                    }
                    if (!isNaN(val) && val !== '' && val !== null && val !== undefined) {
                        return parseFloat(val).toFixed(2);
                    }
                    return val;
                };

                const stagesData = stages
                    .map((stageKey: string | number) => {
                        const rawVal = responseData[stageKey];
                        if (!isValidValue(rawVal)) return null;
                        const formattedVal = formatValue(rawVal, stageKey);
                        return {
                            stage: caption[stageKey] || stageKey,
                            qty: formattedVal
                        };
                    })
                    .filter(Boolean);

                console.log('Final Stages Data:', stagesData);
                setStageData(stagesData);
                setStageLoading(false);
                setModalVisible(true);
            } else {
                setStageLoading(false);
                console.error('Unexpected response structure:', response.data);
                AppAlert.alert(`${response.data}`);
            }
        } catch (error) {
            setStageLoading(false);
            AppAlert.alert('Server Error');
        }
    };

    const labelMap: LabelMap = {
        prpcode: { label: 'Property' },
        vouno: { label: 'Vou No' },
        voudate: { label: 'Date' },
        accname: { label: 'Party Name', hide: true },
        uid: { label: 'UID', hide: true },
        sexename: { label: 'Sales Executive' },
        dsnname: { label: 'Design Name' },
        itmname: { label: 'Item Name' },
        ptype: { label: 'Product Type' },
    };

    const CircularProgress = ({ pendingPercent }: { pendingPercent: number }) => {
        const size = 60;
        const strokeWidth = 6;
        const radius = (size - strokeWidth) / 2;
        const circumference = radius * 2 * Math.PI;
        const strokeDashoffset = circumference - (pendingPercent / 100) * circumference;

        return (
            <View style={styles.circularProgressContainer}>
                <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                    <G rotation="-90" origin={`${size / 2}, ${size / 2}`}>
                        <Circle
                            cx={size / 2}
                            cy={size / 2}
                            r={radius}
                            stroke="#f0f0f0"
                            strokeWidth={strokeWidth}
                            fill="none"
                        />
                        <Circle
                            cx={size / 2}
                            cy={size / 2}
                            r={radius}
                            stroke={pendingPercent > 50 ? '#ff6b6b' : '#4ECDC4'}
                            strokeWidth={strokeWidth}
                            strokeDasharray={circumference}
                            strokeDashoffset={strokeDashoffset}
                            strokeLinecap="round"
                            fill="none"
                        />
                    </G>
                </Svg>
                <Text style={styles.circularProgressText}>{pendingPercent.toFixed(0)}%</Text>
            </View>
        );
    };

    const PieProgress = ({ pendingPercent }) => {
        const size = 65;
        const radius = size / 2;

        // Handle all cases
        let displayPercent;
        let showFullGreen = false;

        if (pendingPercent < 0) {
            // Negative pending = 100% complete (full green)
            displayPercent = 100;
            showFullGreen = true;
        } else if (pendingPercent >= 100) {
            // 100% or more pending = 0% complete (full red)
            displayPercent = 0;
        } else {
            // Normal case
            displayPercent = 100 - pendingPercent;
        }

        const greenPercent = displayPercent;
        const redPercent = 100 - displayPercent;

        // Calculate paths only if not showing full circle
        let greenPath = '', redPath = '';

        if (!showFullGreen && greenPercent > 0) {
            greenPath = `
              M${radius},${radius}
              L${radius},0
              A${radius},${radius} 0 ${greenPercent > 50 ? 1 : 0},1 ${radius + radius * Math.sin(2 * Math.PI * (greenPercent / 100))},${radius - radius * Math.cos(2 * Math.PI * (greenPercent / 100))}
              Z
            `;
        }

        if (!showFullGreen && redPercent > 0) {
            redPath = `
              M${radius},${radius}
              L${radius + radius * Math.sin(2 * Math.PI * (greenPercent / 100))},${radius - radius * Math.cos(2 * Math.PI * (greenPercent / 100))}
              A${radius},${radius} 0 ${redPercent > 50 ? 1 : 0},1 ${radius},0
              Z
            `;
        }

        return (
            <View style={styles.pieContainer}>
                <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                    <G rotation="-90" origin={`${radius}, ${radius}`}>
                        {/* Case 1: Full green for negative pending */}
                        {showFullGreen && <Circle cx={radius} cy={radius} r={radius} fill="rgb(37, 138, 30)" />}

                        {/* Case 2: Full red for 100% pending */}
                        {!showFullGreen && greenPercent === 0 && <Circle cx={radius} cy={radius} r={radius} fill="rgb(193, 51, 51)" />}

                        {/* Case 3: Normal pie chart */}
                        {!showFullGreen && greenPercent > 0 && <Path d={greenPath} fill="rgb(37, 138, 30)" />}
                        {!showFullGreen && redPercent > 0 && greenPercent !== 100 && <Path d={redPath} fill="rgb(193, 51, 51)" />}
                    </G>
                    <Text style={styles.pieText}>{displayPercent.toFixed(0)}%</Text>
                </Svg>
            </View>
        );
    };

    // const PieProgress = ({ pendingPercent  }) => {
    //     const size = 75;
    //     const radius = size / 2;
    //     // Ensure pendingPercent is treated as 100% if negative or invalid
    //     const safePendingPercent = pendingPercent < 0 ? 0 : pendingPercent > 100 ? 100 : pendingPercent;
    //     const greenPercent = 100 - safePendingPercent;
    //     const redPercent = safePendingPercent;

    //     // Calculate the path for the green segment
    //     const greenPath = `
    //       M${radius},${radius}
    //       L${radius},0
    //       A${radius},${radius} 0 ${greenPercent > 50 ? 1 : 0},1 ${radius + radius * Math.sin(2 * Math.PI * (greenPercent / 100))},${radius - radius * Math.cos(2 * Math.PI * (greenPercent / 100))}
    //       Z
    //     `;

    //     // Calculate the path for the red segment
    //     const redPath = `
    //       M${radius},${radius}
    //       L${radius + radius * Math.sin(2 * Math.PI * (greenPercent / 100))},${radius - radius * Math.cos(2 * Math.PI * (greenPercent / 100))}
    //       A${radius},${radius} 0 ${redPercent > 50 ? 1 : 0},1 ${radius},0
    //       Z
    //     `;

    //     return (
    //         <View style={styles.pieContainer}>
    //             <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
    //                 <G rotation="-90" origin={`${radius}, ${radius}`}>
    //                     <Path d={greenPath} fill="#A8E6CF" />  {/* Light professional green */}
    //                     <Path d={redPath} fill="#FFB3B3" />      {/* Light professional red */}
    //                 </G>
    //                 <Text style={styles.pieText}>{parseFloat(greenPercent).toFixed(0)}%</Text>
    //             </Svg>
    //         </View>
    //     );
    // };



    const renderQuantityGraph = (item: any) => {
        const totalQty = parseFloat(item.totqty) || 1;
        const producedQty = parseFloat(item.producedqty) || 0;
        const remainingQty = parseFloat(item.prodpending) || 0;
        const pendingPercent = parseFloat(item.pendingperc) || 0;
        const producedWidth = (producedQty / totalQty) * 100;
        const remainingWidth = (remainingQty / totalQty) * 100;

        return (
            <View style={styles.graphContainer}>
                <View style={styles.graphHeader}>
                    <Text style={styles.graphHeaderText}>Production Status:</Text>
                    <PieProgress pendingPercent={pendingPercent} />
                    {/* <CircularProgress pendingPercent={pendingPercent} /> */}
                </View>
                {/* <View style={styles.linearGraphContainer}>
                    <View style={styles.linearGraphBackground}>
                        <View style={[styles.linearGraphProduced, { width: `${producedWidth}%` }]} />
                        <View style={[styles.linearGraphRemaining, { width: `${remainingWidth}%` }]} />
                    </View>
                </View> */}
                <View style={styles.graphLabels}>
                    <View style={styles.graphLabelRow}>
                        <View style={styles.graphLabelPair}>
                            <Text style={styles.graphLabel}>Total:</Text>
                            <Text style={styles.graphValue}>{totalQty.toFixed(2)}</Text>
                        </View>
                        <View style={styles.graphLabelPair}>
                            <Text style={styles.graphLabel}>Produced:</Text>
                            <Text style={styles.graphValue}>{producedQty.toFixed(2)}</Text>
                        </View>
                    </View>
                    <View style={styles.graphLabelRow}>
                        <View style={styles.graphLabelPair}>
                            <Text style={styles.graphLabel}>Remaining:</Text>
                            <Text style={styles.graphValue}>{remainingQty.toFixed(2)}</Text>
                        </View>
                        <View style={styles.graphLabelPair}>
                            <Text style={styles.graphLabel}>Pending:</Text>
                            <Text style={styles.graphValue}>{pendingPercent.toFixed(2)}%</Text>
                        </View>
                    </View>
                </View>
            </View>
        );
    };

    const renderStageTableHeader = () => (
        <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, { flex: 2 }]}>Stage</Text>
            <Text style={[styles.tableHeaderText, { flex: 1 }]}>Qty</Text>
        </View>
    );

    // const renderStageTableRow = ({ item }: { item: StageData }) => (
    //     <View style={styles.tableRow}>
    //         <Text style={[styles.tableCell, { flex: 2 }]}>{item.stage}</Text>
    //         <Text style={[styles.tableCell, { flex: 1 }]}>{item.qty}</Text>
    //     </View>
    // );

    // Load more data on scroll
    const loadMoreData = () => {
        if (isLoadingMore || (searchQueryPOT.trim() && filteredData.length <= page * 10)) return;

        setIsLoadingMore(true);
        setTimeout(() => {
            // Filtered data par kaam karna hai
            const nextPageData = filteredData.slice(0, (page + 1) * 10);
            setAllData(nextPageData);
            setPage(page + 1);
            setIsLoadingMore(false);
        }, 500); // Simulate network delay
    };


    const renderCard = ({ item }: { item: any }) => (
        <TouchableOpacity style={styles.card}>
            <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{item.accname}</Text>
                <TouchableOpacity onPress={() => handleCardPress(item)}>
                    {isStageLoading && selectedCardId === item.uid ? (
                        <ActivityIndicator size={21} color="rgb(86, 156, 214)" />
                    ) : (
                        <Icon name="info" size={20} color="rgb(86, 156, 214)" />
                    )}
                </TouchableOpacity>
            </View>
            <View style={styles.cardBody}>
                {Object.entries(labelMap).map(([key, config]) => {
                    if (config.hide) return null;
                    return (
                        <View key={key} style={styles.cardRow}>
                            <Text style={styles.cardLabel}>{config.label}:</Text>
                            <Text style={styles.cardValue}>{item[key]}</Text>
                        </View>
                    );
                })}
                {renderQuantityGraph(item)}
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container}>
            {/* <FlatList
                // data={filteredData}
                data={filteredData.slice(0, page * 10)}
                renderItem={renderCard}
                keyExtractor={(item, index) => index.toString()}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>No data found!</Text>
                    </View>
                }
            /> */}
            <FlatList
                data={allData} // `allData` use karna hai
                renderItem={renderCard}
                keyExtractor={(item, index) => index.toString()}
                contentContainerStyle={styles.listContent}
                onEndReached={loadMoreData}
                onEndReachedThreshold={0.3}
                // ListFooterComponent={
                //     isLoadingMore ? (
                //         <ActivityIndicator size="large" color="rgb(86, 156, 214)" />
                //     ) : null
                // }
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>No data found!</Text>
                    </View>
                }
            />

            <Modal
                animationType="slide"
                transparent={false}
                visible={modalVisible}
                onRequestClose={() => {
                    setModalVisible(!modalVisible);
                }}
            >
                <SafeAreaView style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalHeaderText}>Production Stages</Text>
                        <TouchableOpacity onPress={() => setModalVisible(!modalVisible)}>
                            <Icon name="close" size={24} color="rgb(86, 156, 214)" />
                        </TouchableOpacity>
                    </View>
                    <View style={styles.tableContainer}>
                        {renderStageTableHeader()}
                        <ScrollView style={styles.tableBody}>
                            {getStageData.map((item, index) => (
                                <View style={styles.tableRow} key={index}>
                                    <Text style={[styles.tableCellKey, { flex: 2 }]}>{item.stage}</Text>
                                    <Text style={[styles.tableCell, { flex: 1 }]}>{item.qty}</Text>
                                </View>
                            ))}
                        </ScrollView>
                    </View>
                </SafeAreaView>
            </Modal>

        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
        padding: 10,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 8,
        padding: 15,
        marginBottom: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        paddingBottom: 10,
    },
    cardTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: 'rgb(86, 156, 214)',
    },
    cardBody: {
        flexDirection: 'column',
    },
    cardRow: {
        flexDirection: 'row',
        marginBottom: 5,
        paddingBottom: 5,
    },
    cardLabel: {
        color: 'rgb(206, 145, 120)',
        marginRight: 10,
        minWidth: 100,
        fontSize: 12,
    },
    cardValue: {
        fontWeight: 'bold',
        color: 'rgb(86, 156, 214)',
        flex: 1,
        fontSize: 12,
        flexWrap: 'wrap',
    },
    graphContainer: {
        marginTop: 10,
        padding: 10,
        backgroundColor: '#f9f9f9',
        borderRadius: 8,
    },
    graphHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    graphHeaderText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: 'rgb(86, 156, 214)',
    },
    circularProgressContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    circularProgressText: {
        position: 'absolute',
        fontSize: 14,
        fontWeight: 'bold',
        color: '#333',
    },
    linearGraphContainer: {
        marginVertical: 10,
    },
    linearGraphBackground: {
        height: 10,
        backgroundColor: '#f0f0f0',
        borderRadius: 5,
        overflow: 'hidden',
    },
    linearGraphProduced: {
        height: '100%',
        backgroundColor: 'rgb(157, 255, 150)',
    },
    linearGraphRemaining: {
        height: '100%',
        backgroundColor: 'rgb(255, 145, 145)',
        position: 'absolute',
        right: 0,
    },
    graphLabels: {
        flexDirection: 'column',
    },
    graphLabelRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 3,
    },
    graphLabelPair: {
        flex: 1,
        marginHorizontal: 5,
    },
    graphLabel: {
        fontSize: 12,
        color: 'rgb(206, 145, 120)',
    },
    graphValue: {
        fontSize: 12,
        fontWeight: 'bold',
        color: 'rgb(86, 156, 214)',
        flexWrap: 'wrap',
    },
    listContent: {
        paddingBottom: 20,
    },
    emptyContainer: {
        padding: 20,
        alignItems: 'center',
    },
    emptyText: {
        color: '#666',
        fontSize: 16,
    },
    modalContainer: {
        flex: 1,
        backgroundColor: '#fff',
        padding: 20,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        paddingBottom: 10,
    },
    modalHeaderText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: 'rgb(86, 156, 214)',
    },
    tableContainer: {
        flex: 1,
    },
    tableHeader: {
        flexDirection: 'row',
        backgroundColor: '#f9f9f9',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    tableHeaderText: {
        fontWeight: 'bold',
        color: 'rgb(86, 156, 214)',
        paddingHorizontal: 10,
    },
    tableBody: {
        flex: 1,
    },
    tableRow: {
        flexDirection: 'row',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    tableCell: {
        paddingHorizontal: 10,
        textAlign: 'right',
        color: 'rgb(113, 113, 113)',
    },
    tableCellKey: {
        paddingHorizontal: 10,
        color: 'rgb(113, 113, 113)',
    },
    pieContainer: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    pieText: {
        position: 'absolute',
        fontSize: 11,
        fontWeight: 'bold',
        // color: '#333',
        color: 'white',
        textAlign: 'center',
        top: '40%',
        left: '40%',
    },

});

export default ProdOrderTrackingCard;
