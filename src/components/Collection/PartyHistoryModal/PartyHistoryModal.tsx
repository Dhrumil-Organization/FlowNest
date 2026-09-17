// import React, { useState, useEffect } from 'react';
// import {
//     View,
//     Text,
//     TouchableOpacity,
//     Modal,
//     ActivityIndicator,
//     TextInput,
//     FlatList,
//     StyleSheet,
// } from 'react-native';
// import Icon from 'react-native-vector-icons/MaterialIcons';
// import { crlimtreq_styles } from '../../../common/Styles/Style';

// interface PartyData {
//     ParCode: string;
//     ParName: string;
//     Address: string;
//     Mhname: string;
//     Shname: string;
// }

// interface HistoryData {
//     uid: string;
//     prptype: string;
//     prptypename: string;
//     prpcode: string;
//     date: string;
//     parcode: string;
//     parname: string;
//     limit1: string;
//     limit2: string;
//     limit3: string;
//     crday1: string;
//     crday2: string;
//     crday3: string;
//     isauth: string;
//     status: string;
//     ausrname: string;
//     adate: string;
//     remark: string;
//     yearno: string;
//     revertdate: string;
//     sexename: string;
//     BrkAccName: string;
//     crdays: string;
// }

// interface PartyHistoryModalProps {
//     visible: boolean;
//     onClose: () => void;
//     partyList: PartyData[];
//     historyData: HistoryData[];
//     // allhistoryData?: HistoryData[];
//     partyLoading: boolean;
//     historyLoading: boolean;
//     // allhistoryLoading?: boolean;
//     // showAllHistoryOnly?: boolean;
//     activeTab: 'party' | 'history';
//     setActiveTab: (tab: 'party' | 'history') => void;
//     getParname: string;
// }

// const PartyHistoryModal: React.FC<PartyHistoryModalProps> = ({
//     visible,
//     onClose,
//     partyList = [],
//     historyData = [],
//     // allhistoryData = [],
//     partyLoading = false,
//     historyLoading = false,
//     // allhistoryLoading = false,
//     // showAllHistoryOnly = false,
//     activeTab = '',
//     getParname = '',
//     setActiveTab = () => { },
// }) => {
//     // const [activeTab, setActiveTab] = useState<'party' | 'history' | 'allhistory'>('party');
//     const [partySearchQuery, setPartySearchQuery] = useState('');
//     const [historySearchQuery, setHistorySearchQuery] = useState('');
//     // const [allhistorySearchQuery, setAllHistorySearchQuery] = useState('');

//     // Initialize active tab based on props
//     // useEffect(() => {
//     //     if (showAllHistoryOnly && allhistoryData.length > 0) {
//     //         setActiveTab('allhistory');
//     //     } else if (historyData.length > 0 && !showAllHistoryOnly) {
//     //         setActiveTab('history');
//     //     } else if (partyList.length > 0) {
//     //         setActiveTab('party');
//     //     }
//     // }, [showAllHistoryOnly, allhistoryData, historyData, partyList]);

//     // Filter data based on search queries
//     const filteredPartyList = partyList.filter((item) =>
//         Object.values(item).some((val) =>
//             String(val).toLowerCase().includes(partySearchQuery.toLowerCase())
//         )
//     );

//     const filteredHistoryData = historyData.filter((item) =>
//         Object.values(item).some((val) =>
//             String(val).toLowerCase().includes(historySearchQuery.toLowerCase())
//         )
//     );

//     // const filteredAllHistoryData = allhistoryData.filter((item) =>
//     //     Object.values(item).some((val) =>
//     //         String(val).toLowerCase().includes(allhistorySearchQuery.toLowerCase())
//     //     )
//     // );

//     // Reset search queries when switching tabs
//     useEffect(() => {
//         if (activeTab === 'party') {
//             setHistorySearchQuery('');
//             // setAllHistorySearchQuery('');
//         } else if (activeTab === 'history') {
//             setPartySearchQuery('');
//             // setAllHistorySearchQuery('');
//         }
//         // else if (activeTab === 'allhistory') {
//         //     setPartySearchQuery('');
//         //     setHistorySearchQuery('');
//         // }
//     }, [activeTab]);

//     const renderPartyItem = ({ item }: { item: PartyData }) => (
//         <View style={styles.card}>
//             <View style={styles.cardSubHeader}>
//                 <Text style={styles.cardSubHeaderText}>{item.ParName}</Text>
//             </View>
//             <View style={styles.cardContent}>
//                 <View style={styles.fullWidthRow}>
//                     <Text style={styles.key}>Address:</Text>
//                     <Text style={styles.value}>{item.Address}</Text>
//                 </View>
//             </View>
//         </View>
//     );

//     const renderHistoryItem = ({ item }: { item: HistoryData }) => (
//         <View style={[
//             crlimtreq_styles.card,
//             item.isauth === '1' ? crlimtreq_styles.acceptedCard : item.isauth === '2' ? crlimtreq_styles.rejectedCard : crlimtreq_styles.card
//         ]}>
//             {item.isauth && (
//                 <View style={crlimtreq_styles.stampContainer}>
//                     <View style={[
//                         crlimtreq_styles.stamp,
//                         item.isauth === '1' ? crlimtreq_styles.stampAccepted : item.isauth === '2' ? crlimtreq_styles.stampRejected : crlimtreq_styles.stampPendingall
//                     ]}>
//                         <Text style={crlimtreq_styles.stampText}>
//                             {item.isauth === '1' ? 'AUTHORISED' : item.isauth === '2' ? 'REJECTED' : 'PENDING'}
//                         </Text>
//                     </View>
//                 </View>
//             )}
//             <View style={crlimtreq_styles.dateContainer}>
//                 <Text style={crlimtreq_styles.dateText}>{item.date}</Text>
//             </View>
//             <View style={crlimtreq_styles.cardHeaderContainer}>
//                 <View style={crlimtreq_styles.cardHeader}>
//                     <Text style={crlimtreq_styles.cardHeaderText}>{item.prptypename}</Text>
//                 </View>
//             </View>

//             <View style={crlimtreq_styles.cardContent}>
//                 <View style={crlimtreq_styles.twoColumnRow}>
//                     <View style={crlimtreq_styles.keyValuePair}>
//                         <Text style={crlimtreq_styles.key}>Old Limit:</Text>
//                         <Text style={crlimtreq_styles.valuegreen}>{item.limit1}</Text>
//                     </View>
//                     <View style={crlimtreq_styles.keyValuePair}>
//                         <Text style={crlimtreq_styles.key}>Req. Limit:</Text>
//                         <Text style={crlimtreq_styles.editableValue1}>{item.limit2}</Text>
//                     </View>
//                 </View>
//                 <View style={crlimtreq_styles.twoColumnRow}>
//                     <View style={crlimtreq_styles.keyValuePair}>
//                         <Text style={crlimtreq_styles.key}>Auth. Limit:</Text>
//                         <Text style={crlimtreq_styles.Authvalue}>{item.limit3}</Text>
//                     </View>
//                     <View style={crlimtreq_styles.keyValuePair}>
//                         <Text style={crlimtreq_styles.key}>Auth. Days:</Text>
//                         <Text style={crlimtreq_styles.Authvalue}>{item.crday3}</Text>
//                     </View>
//                 </View>
//                 <View style={crlimtreq_styles.twoColumnRow}>
//                     <View style={crlimtreq_styles.keyValuePair}>
//                         <Text style={crlimtreq_styles.key}>Old Cr. Days:</Text>
//                         <Text style={crlimtreq_styles.valuegreen}>{item.crday1}</Text>
//                     </View>
//                     <View style={crlimtreq_styles.keyValuePair}>
//                         <Text style={crlimtreq_styles.key}>Req. Cr. Days:</Text>
//                         <Text style={crlimtreq_styles.editableValue1}>{item.crday2}</Text>
//                     </View>
//                 </View>
//                 <View style={crlimtreq_styles.twoColumnRow}>

//                     <View style={crlimtreq_styles.keyValuePair}>
//                         <Text style={crlimtreq_styles.key}>Authorised Date:</Text>
//                         <Text style={crlimtreq_styles.Authvalue}>{item.adate || 'N/A'}</Text>
//                     </View>
//                     <View style={crlimtreq_styles.keyValuePair}>
//                         <Text style={crlimtreq_styles.key}>Authorised By:</Text>
//                         <Text style={crlimtreq_styles.Authvalue}>{item.ausrname || 'N/A'}</Text>
//                     </View>
//                 </View>
//                 <View style={crlimtreq_styles.twoColumnRow}>
//                     <View style={crlimtreq_styles.keyValuePair}>
//                         <Text style={crlimtreq_styles.key}>Status:</Text>
//                         {item.status === 'Authorised' ? <Text style={crlimtreq_styles.valueAuthorised}>{item.status}</Text>
//                             : item.status === 'Rejected' ? <Text style={crlimtreq_styles.valueRejected}>{item.status}</Text>
//                                 : item.status === 'Pending' ? <Text style={crlimtreq_styles.value}>{item.status}</Text>
//                                     : <Text style={crlimtreq_styles.value}>{item.status}</Text>}
//                         {/* <Text style={crlimtreq_styles.value}>{item.status}</Text> */}
//                     </View>
//                     <View style={crlimtreq_styles.keyValuePair}>
//                         <Text style={crlimtreq_styles.key}>Revert Date:</Text>
//                         <Text style={crlimtreq_styles.value}>{item.revertdate || 'N/A'}</Text>
//                     </View>
//                 </View>


//                 <View style={crlimtreq_styles.fullWidthRow}>
//                     <Text style={crlimtreq_styles.key}>Remark:</Text>
//                     <Text style={crlimtreq_styles.value}>{item.remark}</Text>
//                 </View>
//                 <View style={crlimtreq_styles.fullWidthRow}>
//                     <Text style={crlimtreq_styles.key}>Broker:</Text>
//                     <Text style={crlimtreq_styles.value}>{item.BrkAccName}</Text>
//                 </View>
//                 <View style={crlimtreq_styles.fullWidthRow}>
//                     <Text style={crlimtreq_styles.key}>SExe:</Text>
//                     <Text style={crlimtreq_styles.value}>{item.sexename}</Text>
//                 </View>
//             </View>
//         </View>
//     );

//     // Render the appropriate tab content
//     const renderTabContent = () => {
//         if (activeTab === 'party') {
//             return (
//                 <>
//                     <TextInput
//                         style={styles.searchInput}
//                         placeholder="Search Parties..."
//                         value={partySearchQuery}
//                         onChangeText={setPartySearchQuery}
//                     />
//                     {partyLoading ? (
//                         <ActivityIndicator size="large" color="#2196F3" style={styles.loader} />
//                     ) : filteredPartyList.length > 0 ? (
//                         <FlatList
//                             data={filteredPartyList}
//                             renderItem={renderPartyItem}
//                             keyExtractor={(item) => item.ParCode}
//                             contentContainerStyle={styles.list}
//                             ListEmptyComponent={
//                                 <View style={styles.emptyContainer}>
//                                     <Text style={styles.emptyText}>No parties found!</Text>
//                                 </View>
//                             }
//                         />
//                     ) : (
//                         <View style={styles.emptyContainer}>
//                             <Text style={styles.emptyText}>No parties found!</Text>
//                         </View>
//                     )}
//                 </>
//             );
//         } else if (activeTab === 'history') {
//             return (
//                 <>
//                     <TextInput
//                         style={styles.searchInput}
//                         placeholder="Search History..."
//                         value={historySearchQuery}
//                         onChangeText={setHistorySearchQuery}
//                     />
//                     {historyLoading ? (<>
//                         <ActivityIndicator size="large" color="#2196F3" style={styles.loader} />
//                     </>
//                     ) : filteredHistoryData.length > 0 ? (
//                         <>
//                             <View style={crlimtreq_styles.cardSubHeaderhistory}>
//                                 <Text style={crlimtreq_styles.cardSubHeaderTexthistory}>{getParname}</Text>
//                             </View>
//                             <FlatList
//                                 data={filteredHistoryData}
//                                 renderItem={renderHistoryItem}
//                                 keyExtractor={(item) => item.uid}
//                                 contentContainerStyle={styles.list}
//                                 ListEmptyComponent={
//                                     <View style={styles.emptyContainer}>
//                                         <Text style={styles.emptyText}>No history found!</Text>
//                                     </View>
//                                 }
//                             />
//                         </>
//                     ) : (
//                         <View style={styles.emptyContainer}>
//                             <Text style={styles.emptyText}>No history found!</Text>
//                         </View>
//                     )}
//                 </>
//             );
//         }
//         // else { // allhistory tab
//         //     return (
//         //         <>
//         //             <TextInput
//         //                 style={styles.searchInput}
//         //                 placeholder="Search All History..."
//         //                 value={allhistorySearchQuery}
//         //                 onChangeText={setAllHistorySearchQuery}
//         //             />
//         //             {allhistoryLoading ? (
//         //                 <ActivityIndicator size="large" color="#2196F3" style={styles.loader} />
//         //             ) : filteredAllHistoryData.length > 0 ? (
//         //                 <FlatList
//         //                     data={filteredAllHistoryData}
//         //                     renderItem={renderHistoryItem}
//         //                     keyExtractor={(item) => item.uid}
//         //                     contentContainerStyle={styles.list}
//         //                     ListEmptyComponent={
//         //                         <View style={styles.emptyContainer}>
//         //                             <Text style={styles.emptyText}>No all history found!</Text>
//         //                         </View>
//         //                     }
//         //                 />
//         //             ) : (
//         //                 <View style={styles.emptyContainer}>
//         //                     <Text style={styles.emptyText}>No all history found!</Text>
//         //                 </View>
//         //             )}
//         //         </>
//         //     );
//         // }
//     };

//     return (
//         <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
//             <View style={styles.modalContainer}>
//                 <TouchableOpacity style={styles.closeButton} onPress={onClose}>
//                     <Icon name="close" size={25} color="#fff" />
//                 </TouchableOpacity>
//                 { }
//                 <View style={styles.tabContainer}>

//                     <>
//                         <TouchableOpacity
//                             style={[styles.tab, activeTab === 'party' && styles.activeTab]}
//                             onPress={() => setActiveTab('party')}
//                         >
//                             <Text style={styles.tabText}>Parties ({partyList.length})</Text>
//                         </TouchableOpacity>
//                         <TouchableOpacity
//                             style={[styles.tab, activeTab === 'history' && styles.activeTab]}
//                             onPress={() => setActiveTab('history')}
//                         >
//                             <Text style={styles.tabText}>History ({historyData.length})</Text>
//                         </TouchableOpacity>
//                     </>

//                     {/* {(allhistoryData.length > 0 || showAllHistoryOnly) && (
//                         <TouchableOpacity
//                             style={[styles.tab, activeTab === 'allhistory' && styles.activeTab]}
//                             onPress={() => setActiveTab('allhistory')}
//                         >
//                             <Text style={styles.tabText}>All History ({allhistoryData.length})</Text>
//                         </TouchableOpacity>
//                     )} */}
//                 </View>

//                 <View style={styles.listContainer}>
//                     {renderTabContent()}
//                 </View>
//             </View>
//         </Modal>
//     );
// };

// const styles = StyleSheet.create({
//     modalContainer: {
//         flex: 1,
//         backgroundColor: '#f5f5f5',
//         // paddingTop: 50,
//     },
//     closeButton: {
//         position: 'absolute',
//         backgroundColor: '#000',
//         // color: '#fff',
//         borderRadius: 50,
//         padding: 2,
//         top: 20,
//         right: 10,
//         zIndex: 1,
//     },
//     tabContainer: {
//         flexDirection: 'row',
//         marginBottom: 10,
//         borderBottomWidth: 1,
//         borderBottomColor: '#e0e0e0',
//         backgroundColor: '#fff',
//         paddingVertical: 10,
//     },
//     tab: {
//         flex: 1,
//         padding: 12,
//         alignItems: 'center',
//         borderBottomWidth: 2,
//         borderBottomColor: 'transparent',
//     },
//     activeTab: {
//         borderBottomColor: '#2196F3',
//     },
//     tabText: {
//         fontSize: 16,
//         fontWeight: '600',
//         color: '#333',
//     },
//     searchInput: {
//         backgroundColor: '#fff',
//         padding: 12,
//         borderRadius: 8,
//         borderWidth: 1,
//         borderColor: '#ddd',
//         marginHorizontal: 10,
//         marginBottom: 10,
//     },
//     listContainer: {
//         flex: 1,
//         paddingHorizontal: 10,
//     },
//     list: {
//         paddingBottom: 20,
//     },
//     card: {
//         backgroundColor: '#fff',
//         borderRadius: 10,
//         marginVertical: 8,
//         padding: 15,
//         elevation: 3,
//         shadowColor: '#000',
//         shadowOffset: { width: 0, height: 2 },
//         shadowOpacity: 0.1,
//         shadowRadius: 4,
//         borderWidth: 2,
//         borderColor: 'rgb(229, 216, 255)',
//     },
//     acceptedCard: {
//         backgroundColor: '#fff',
//         borderRadius: 10,
//         marginVertical: 8,
//         padding: 15,
//         elevation: 3,
//         shadowColor: '#000',
//         shadowOffset: { width: 0, height: 2 },
//         shadowOpacity: 0.1,
//         shadowRadius: 4,
//         borderWidth: 2,
//         borderColor: 'rgb(164, 255, 167)',
//     },
//     rejectedCard: {
//         backgroundColor: '#fff',
//         borderRadius: 10,
//         marginVertical: 8,
//         padding: 15,
//         elevation: 3,
//         shadowColor: '#000',
//         shadowOffset: { width: 0, height: 2 },
//         shadowOpacity: 0.1,
//         shadowRadius: 4,
//         borderWidth: 2,
//         borderColor: 'rgb(255, 193, 193)',
//     },
//     pendingCard: {
//         borderColor: 'rgba(112, 112, 112, 0.3)',
//     },
//     dateContainer: {
//         position: 'absolute',
//         top: 10,
//         right: 10,
//         backgroundColor: '#F5F5F5',
//         borderWidth: 1,
//         borderColor: '#BDBDBD',
//         borderRadius: 15,
//         paddingHorizontal: 8,
//         paddingVertical: 4,
//         zIndex: 1,
//     },
//     dateText: {
//         fontSize: 12,
//         color: '#555',
//     },
//     cardHeaderContainer: {
//         backgroundColor: '#E3F2FD',
//         padding: 10,
//         borderTopLeftRadius: 9,
//         borderTopRightRadius: 9,
//         marginTop: -15,
//         marginHorizontal: -15,
//         marginBottom: 10,
//     },
//     cardHeader: {
//         width: '100%',
//     },
//     cardHeaderText: {
//         color: '#0D47A1',
//         fontSize: 16,
//         fontWeight: 'bold',
//         textAlign: 'center',
//     },
//     cardSubHeader: {
//         borderColor: '#B3E5FC',
//         borderWidth: 1,
//         padding: 10,
//         borderRadius: 5,
//         marginBottom: 10,
//         alignSelf: 'flex-start',
//         width: '100%',
//         maxWidth: '100%',
//     },
//     cardSubHeaderText: {
//         color: '#0D47A1',
//         fontSize: 14,
//         fontWeight: '600',
//     },
//     cardContent: {
//         marginTop: 10,
//     },
//     twoColumnRow: {
//         flexDirection: 'row',
//         justifyContent: 'space-between',
//         marginBottom: 10,
//     },
//     keyValuePair: {
//         width: '48%',
//     },
//     fullWidthRow: {
//         marginBottom: 10,
//     },
//     key: {
//         fontWeight: '600',
//         fontSize: 13,
//         color: '#555',
//         marginBottom: 3,
//     },
//     value: {
//         fontSize: 14,
//         color: '#333',
//     },
//     stampContainer: {
//         position: 'absolute',
//         top: '80%',
//         left: '80%',
//         marginLeft: -50,
//         marginTop: -30,
//         zIndex: 2,
//         alignItems: 'center',
//         justifyContent: 'center',
//     },
//     stamp: {
//         width: 100,
//         height: 60,
//         borderRadius: 10,
//         alignItems: 'center',
//         justifyContent: 'center',
//         transform: [{ rotate: '0deg' }],
//         borderWidth: 1,
//         borderColor: '#999',
//     },
//     stampAccepted: {
//         backgroundColor: 'rgba(76, 175, 80, 0.7)',
//         borderColor: 'rgba(46, 125, 50, 0.9)',
//     },
//     stampRejected: {
//         backgroundColor: 'rgba(244, 67, 54, 0.7)',
//         borderColor: 'rgba(198, 40, 40, 0.9)',
//     },
//     stampPending: {
//         backgroundColor: 'rgba(173, 173, 173, 0.7)',
//         borderColor: 'rgba(140, 140, 140, 0.9)',
//     },
//     stampText: {
//         color: 'white',
//         fontWeight: 'bold',
//         fontSize: 12,
//         textAlign: 'center',
//     },
//     emptyContainer: {
//         flex: 1,
//         justifyContent: 'center',
//         alignItems: 'center',
//         padding: 20,
//     },
//     emptyText: {
//         fontSize: 16,
//         color: '#666',
//     },
//     loader: {
//         flex: 1,
//         justifyContent: 'center',
//         alignItems: 'center',
//     },
// });

// export default PartyHistoryModal;
