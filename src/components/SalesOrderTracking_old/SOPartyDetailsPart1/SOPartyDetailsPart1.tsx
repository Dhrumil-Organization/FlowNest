// import React, { useEffect, useState, useCallback, useRef } from 'react';
// import { View, Text, StyleSheet, Dimensions, FlatList, TouchableOpacity, TextInput, Alert, Animated as RNAnimated } from 'react-native';
// import AsyncStorage from '@/common/utils/compatibleStorage';
// import { debounce } from 'lodash';
// import Icon from 'react-native-vector-icons/MaterialIcons';
// import HeaderBarwithBack from '../../HeaderBarwithBack/HeaderBarwithBack';

// const { width } = Dimensions.get('window');
// const isTablet = width >= 600;
// const AnimatedFlatList = RNAnimated.createAnimatedComponent(FlatList);

// interface GrandTotal {
//     [key: string]: number;
// }

// interface ChallanData {
//     chalno: string;
//     chaldate: string;
//     chalqty: string;
//     uid: string;
//     dsnname: string;
//     shdname: string;
//     chalsrno: string;
//     data: Array<{
//         chaluid: string;
//         stepname: string;
//         totalqty: string;
//         rate: string;
//         amount: number;
//     }>;
// }

// interface SOPartyDetailsProps {
//     route: {
//         params: {
//             party: any;
//         };
//     };
//     token: string;
//     navigation: any;
//     username: string;
// }

// const SummaryCard = ({ title, value, icon, color }: { title: string; value: string; icon: string; color: string }) => (
//     <View style={[styles.summaryCard, { backgroundColor: color }]}>
//         <View style={styles.cardIcon}>
//             <Icon name={icon} size={24} color="white" />
//         </View>
//         <Text style={styles.cardTitle}>{title}</Text>
//         <Text style={styles.cardValue}>{value}</Text>
//     </View>
// );

// const Carousel = ({ data }: { data: { key: string; value: number }[] }) => {
//     const scrollX = useRef(new RNAnimated.Value(0)).current;
//     const flatListRef = useRef<FlatList>(null);

//     const renderCard = ({ item }: { item: { key: string; value: number } }) => {
//         const icons: Record<string, string> = {
//             purchase: 'shopping-cart',
//             jobin: 'work',
//             jobin_prod: 'factory',
//             Repack: 'inventory',
//             Grading: 'grade',
//         };

//         const colors: Record<string, string> = {
//             purchase: '#4CAF50',
//             jobin: '#2196F3',
//             jobin_prod: '#FF9800',
//             Repack: '#9C27B0',
//             Grading: '#00BCD4',
//         };

//         return (
//             <SummaryCard
//                 title={item.key.replace(/_/g, ' ')}
//                 value={item.value.toLocaleString('en-IN')}
//                 icon={icons[item.key] || 'info'}
//                 color={colors[item.key] || '#757575'}
//             />
//         );
//     };

//     return (
//         <View style={styles.carouselContainer}>
//             <AnimatedFlatList
//                 ref={flatListRef}
//                 data={data}
//                 renderItem={renderCard}
//                 keyExtractor={(item) => item.key}
//                 horizontal
//                 showsHorizontalScrollIndicator={false}
//                 snapToInterval={width * 0.4}
//                 decelerationRate="fast"
//                 onScroll={RNAnimated.event(
//                     [{ nativeEvent: { contentOffset: { x: scrollX } } }],
//                     { useNativeDriver: true }
//                 )}
//                 contentContainerStyle={styles.carouselContent}
//                 snapToAlignment="start"
//                 scrollEventThrottle={16}
//             />
//         </View>
//     );
// };

// const AccordionTable = ({ data }: { data: ChallanData }) => {
//     const [isOpen, setIsOpen] = useState(false);

//     const toggleAccordion = () => setIsOpen(!isOpen);

//     const totalQty = data.data.reduce((sum, item) => sum + parseFloat(item.totalqty), 0);
//     const totalAmount = data.data.reduce((sum, item) => sum + item.amount, 0);

//     return (
//         <View style={styles.accordionContainer}>
//             <TouchableOpacity style={styles.accordionHeader} onPress={toggleAccordion}>
//                 <View style={styles.accordionHeaderLeft}>
//                     <Text style={styles.challanNumber}>{data.chalno}</Text>
//                     <Text style={styles.challanDate}>{data.chaldate}</Text>
//                 </View>
//                 <View style={styles.accordionHeaderRight}>
//                     <Text style={styles.accordionToggle}>{isOpen ? '▲' : '▼'}</Text>
//                 </View>
//             </TouchableOpacity>

//             {isOpen && (
//                 <View style={styles.tableContainer}>
//                     <View style={styles.tableHeader}>
//                         <Text style={[styles.tableCell, styles.headerCell, { flex: 2 }]}>Step</Text>
//                         <Text style={[styles.tableCell, styles.headerCell, { flex: 1 }]}>Qty</Text>
//                         <Text style={[styles.tableCell, styles.headerCell, { flex: 1 }]}>Rate</Text>
//                         <Text style={[styles.tableCell, styles.headerCell, { flex: 1 }]}>Amount</Text>
//                     </View>

//                     {data.data.map((item, index) => (
//                         <View key={index} style={styles.tableRow}>
//                             <Text style={[styles.tableCell, { flex: 2 }]}>{item.stepname}</Text>
//                             <Text style={[styles.tableCell, { flex: 1 }]}>{parseFloat(item.totalqty).toFixed(2)}</Text>
//                             <Text style={[styles.tableCell, { flex: 1 }]}>{parseFloat(item.rate).toFixed(2)}</Text>
//                             <Text style={[styles.tableCell, { flex: 1 }]}>{item.amount.toLocaleString('en-IN')}</Text>
//                         </View>
//                     ))}

//                     <View style={[styles.tableRow, styles.tableFooter]}>
//                         <Text style={[styles.tableCell, styles.footerCell, { flex: 2 }]}>Total</Text>
//                         <Text style={[styles.tableCell, styles.footerCell, { flex: 1 }]}>{totalQty.toFixed(2)}</Text>
//                         <Text style={[styles.tableCell, styles.footerCell, { flex: 1 }]}></Text>
//                         <Text style={[styles.tableCell, styles.footerCell, { flex: 1 }]}>{totalAmount.toLocaleString('en-IN')}</Text>
//                     </View>
//                 </View>
//             )}
//         </View>
//     );
// };

// const SOPartyDetailsPart1: React.FC<SOPartyDetailsProps> = ({ route, token, navigation, username }) => {
//     const { party } = route.params;
//     // const [getChallanResponse, setChallanResponse] = useState<{ data: { data_all: ChallanData[]; grandtotal: GrandTotal } } | null>(null);
//     const [getChallanResponse, setChallanResponse] = useState(null);
//     const [renderedChallans, setRenderedChallans] = useState<ChallanData[]>([]);
//     const [page, setPage] = useState(1);
//     const [loading, setLoading] = useState(false);
//     const [searchQuery, setSearchQuery] = useState('');
//     const [filteredChallans, setFilteredChallans] = useState<ChallanData[]>([]);
//     const itemsPerPage = 10;

//     useEffect(() => {
//         const initializeApp = async () => {
//             try {
//                 const parties_tracking_details_challan_response = await AsyncStorage.getItem('parties_tracking_details_challan_response');
//                 if (parties_tracking_details_challan_response) {
//                     const parsedData = JSON.parse(parties_tracking_details_challan_response);
//                     // setChallanResponse({ data: parsedData });
//                     setChallanResponse(parsedData);

//                     if (parsedData.data_all) {
//                         setFilteredChallans(parsedData.data.data_all);
//                         setRenderedChallans(parsedData.data.data_all.slice(0, itemsPerPage));
//                     }
//                 }
//             } catch (error) {
//                 console.error("Initialization error:", error);
//             }
//         };
//         initializeApp();
//     }, []);

//     useEffect(() => {
//         const debouncedSearch = debounce(() => {
//             if (!getChallanResponse?.data?.data_all) return;

//             const query = searchQuery.toLowerCase();
//             const filtered = getChallanResponse.data.data_all.filter(
//                 (challan) =>
//                     challan.chalno.toLowerCase().includes(query) ||
//                     challan.chaldate.toLowerCase().includes(query) ||
//                     challan.dsnname.toLowerCase().includes(query) ||
//                     challan.shdname.toLowerCase().includes(query) ||
//                     challan.uid.toLowerCase().includes(query)
//             );

//             setFilteredChallans(filtered);
//             setRenderedChallans(filtered.slice(0, itemsPerPage));
//             setPage(1);
//         }, 300);

//         debouncedSearch();
//         return () => debouncedSearch.cancel();
//     }, [searchQuery, getChallanResponse]);

//     const loadMoreChallans = useCallback(() => {
//         if (loading || !getChallanResponse || !filteredChallans || renderedChallans.length >= filteredChallans.length) return;

//         setLoading(true);
//         setTimeout(() => {
//             const nextPage = page + 1;
//             const startIndex = page * itemsPerPage;
//             const endIndex = startIndex + itemsPerPage;

//             setRenderedChallans(prev => [
//                 ...prev,
//                 ...filteredChallans.slice(startIndex, endIndex)
//             ]);
//             setPage(nextPage);
//             setLoading(false);
//         }, 500);
//     }, [page, loading, filteredChallans, renderedChallans]);

//     const formatValue = (value: string | number) => {
//         const num = typeof value === 'string' ? parseFloat(value) : value;
//         if (isNaN(num)) return value;
//         if (num >= 10000000) return `${(num / 10000000).toFixed(2)} Cr`;
//         if (num >= 100000) return `${(num / 100000).toFixed(2)} L`;
//         if (num >= 1000) return `${(num / 1000).toFixed(2)} K`;
//         return num.toFixed(2);
//     };

//     if (!getChallanResponse) {
//         return (
//             <>
//                 <HeaderBarwithBack
//                     userName={username}
//                     header={typeof party === 'object' ? party.partyname : party}
//                     subHeader={'Manage your Challans'}
//                     backNavigateScreen={'SOPartyDetails'}
//                 />
//                 <View style={styles.loadingContainer}>
//                     <Text>Loading...</Text>
//                 </View>
//             </>
//         );
//     }

//     const grandTotalEntries = getChallanResponse.data.grandtotal
//         ? Object.entries(getChallanResponse.data.grandtotal).map(([key, value]) => ({
//             key,
//             value: typeof value === 'number' ? value : parseFloat(value) || 0
//         }))
//         : [];

//     return (
//         <>
//             <HeaderBarwithBack
//                 userName={username}
//                 header={typeof party === 'object' ? party.partyname : party}
//                 subHeader={'Manage your Challans'}
//                 backNavigateScreen={'SOPartyDetails'}
//             />

//             <View style={styles.searchContainer}>
//                 <TextInput
//                     style={styles.searchInput}
//                     placeholder="Search Challans..."
//                     value={searchQuery}
//                     onChangeText={setSearchQuery}
//                 />
//             </View>

//             <Text style={styles.sectionTitle}>Production Summary</Text>
//             {grandTotalEntries.length > 0 && <Carousel data={grandTotalEntries} />}

//             <Text style={styles.sectionTitle}>Challan Details</Text>
//             {getChallanResponse.data.data_all && (
//                 <Text style={styles.subTitle}>
//                     Total Challans: {getChallanResponse.data.data_all.length} | Total Quantity: {formatValue(
//                         getChallanResponse.data.data_all.reduce((sum, item) => sum + parseFloat(item.chalqty), 0)
//                     )}
//                 </Text>
//             )}

//             {filteredChallans.length > 0 ? (
//                 <FlatList
//                     data={renderedChallans}
//                     renderItem={({ item }) => <AccordionTable data={item} />}
//                     keyExtractor={(item) => item.uid}
//                     onEndReached={loadMoreChallans}
//                     onEndReachedThreshold={0.5}
//                     ListFooterComponent={
//                         loading ? (
//                             <View style={styles.loadingIndicator}>
//                                 <Text>Loading more...</Text>
//                             </View>
//                         ) : null
//                     }
//                     contentContainerStyle={styles.listContent}
//                 />
//             ) : (
//                 <View style={styles.loadingContainer}>
//                     <Text>No challans found</Text>
//                 </View>
//             )}
//         </>
//     );
// };

// const styles = StyleSheet.create({
//     container: {
//         flex: 1,
//         backgroundColor: '#f5f5f5',
//         padding: 15,
//     },
//     searchContainer: {
//         padding: 10,
//         backgroundColor: '#f5f5f5',
//     },
//     searchInput: {
//         backgroundColor: '#fff',
//         borderRadius: 8,
//         padding: 10,
//         fontSize: 14,
//         borderWidth: 1,
//         borderColor: '#e0e0e0',
//         color: '#000',
//     },
//     sectionTitle: {
//         fontSize: 18,
//         fontWeight: 'bold',
//         color: '#333',
//         margin: 15,
//     },
//     subTitle: {
//         fontSize: 14,
//         color: '#666',
//         marginHorizontal: 15,
//         marginBottom: 10,
//     },
//     carouselContainer: {
//         marginBottom: 20,
//     },
//     carouselContent: {
//         paddingHorizontal: 15,
//     },
//     summaryCard: {
//         width: width * 0.4,
//         padding: 15,
//         borderRadius: 10,
//         marginRight: 10,
//         height: 120,
//         justifyContent: 'space-between',
//     },
//     cardIcon: {
//         width: 40,
//         height: 40,
//         borderRadius: 20,
//         backgroundColor: 'rgba(255, 255, 255, 0.2)',
//         justifyContent: 'center',
//         alignItems: 'center',
//         marginBottom: 10,
//     },
//     cardTitle: {
//         color: 'white',
//         fontSize: 14,
//         fontWeight: 'bold',
//     },
//     cardValue: {
//         color: 'white',
//         fontSize: 18,
//         fontWeight: 'bold',
//     },
//     accordionContainer: {
//         backgroundColor: '#fff',
//         borderRadius: 10,
//         marginBottom: 10,
//         marginHorizontal: 15,
//         overflow: 'hidden',
//         shadowColor: '#000',
//         shadowOffset: { width: 0, height: 2 },
//         shadowOpacity: 0.1,
//         shadowRadius: 4,
//         elevation: 2,
//     },
//     accordionHeader: {
//         flexDirection: 'row',
//         justifyContent: 'space-between',
//         alignItems: 'center',
//         padding: 15,
//         backgroundColor: '#f8f9fa',
//     },
//     accordionHeaderLeft: {},
//     challanNumber: {
//         fontSize: 16,
//         fontWeight: 'bold',
//         color: '#333',
//     },
//     challanDate: {
//         fontSize: 12,
//         color: '#666',
//         marginTop: 2,
//     },
//     accordionHeaderRight: {},
//     accordionToggle: {
//         fontSize: 18,
//         color: '#666',
//     },
//     tableContainer: {
//         padding: 10,
//     },
//     tableHeader: {
//         flexDirection: 'row',
//         backgroundColor: '#f1f3f4',
//         paddingVertical: 8,
//         borderTopLeftRadius: 5,
//         borderTopRightRadius: 5,
//         overflow: 'hidden',
//     },
//     tableRow: {
//         flexDirection: 'row',
//         paddingVertical: 8,
//         borderBottomWidth: 1,
//         borderBottomColor: '#e0e0e0',
//     },
//     tableFooter: {
//         backgroundColor: '#f8f9fa',
//         borderBottomLeftRadius: 5,
//         borderBottomRightRadius: 5,
//     },
//     tableCell: {
//         fontSize: 12,
//         paddingHorizontal: 5,
//         textAlign: 'right',
//     },
//     headerCell: {
//         fontWeight: 'bold',
//         color: '#333',
//     },
//     footerCell: {
//         fontWeight: 'bold',
//         color: '#333',
//     },
//     loadingContainer: {
//         flex: 1,
//         justifyContent: 'center',
//         alignItems: 'center',
//     },
//     loadingIndicator: {
//         padding: 20,
//         alignItems: 'center',
//     },
//     listContent: {
//         paddingBottom: 20,
//     },
// });

// export default SOPartyDetailsPart1;

import HeaderBarwithBack from '@/components/Header';
import Icon from '@expo/vector-icons/MaterialIcons';
import AsyncStorage from '@/common/utils/compatibleStorage';
import { useLocalSearchParams } from 'expo-router';
import { debounce } from 'lodash';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Dimensions, FlatList, Animated as RNAnimated, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

const { width } = Dimensions.get('window');
const isTablet = width >= 600;
const AnimatedFlatList = RNAnimated.createAnimatedComponent(FlatList);

interface GrandTotal {
    [key: string]: number;
}

interface ChallanData {
    chalno: string;
    chaldate: string;
    chalqty: string;
    uid: string;
    dsnname: string;
    shdname: string;
    chalsrno: string;
    data: Array<{
        chaluid: string;
        stepname: string;
        totalqty: string;
        rate: string;
        amount: number;
    }>;
}

interface SOPartyDetailsProps {
    route: {
        params: {
            party: any;
        };
    };
    token: string;
    navigation: any;
    username: string;
}

const SummaryCard = ({ title, value, icon, color }: { title: string; value: string; icon: string; color: string }) => (
    <View style={[styles.summaryCard, { backgroundColor: color }]}>
        <View style={styles.cardIcon}>
            <Icon name={icon} size={24} color="white" />
        </View>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardValue}>{value}</Text>
    </View>
);

const Carousel = ({ data }: { data: { key: string; value: number }[] }) => {
    const scrollX = useRef(new RNAnimated.Value(0)).current;
    const flatListRef = useRef<FlatList>(null);

    const renderCard = ({ item }: { item: { key: string; value: number } }) => {
        const icons: Record<string, string> = {
            purchase: 'shopping-cart',
            jobin: 'work',
            jobin_prod: 'factory',
            Repack: 'inventory',
            Grading: 'grade',
        };

        const colors: Record<string, string> = {
            purchase: '#4CAF50',
            jobin: '#2196F3',
            jobin_prod: '#FF9800',
            Repack: '#9C27B0',
            Grading: '#00BCD4',
        };

        return (
            <SummaryCard
                title={item.key.replace(/_/g, ' ')}
                value={item.value.toLocaleString('en-IN')}
                icon={icons[item.key] || 'info'}
                color={colors[item.key] || '#757575'}
            />
        );
    };

    return (
        <View style={styles.carouselContainer}>
            <AnimatedFlatList
                ref={flatListRef}
                data={data}
                renderItem={renderCard}
                keyExtractor={(item) => item.key}
                horizontal
                showsHorizontalScrollIndicator={false}
                snapToInterval={width * 0.4}
                decelerationRate="fast"
                onScroll={RNAnimated.event(
                    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
                    { useNativeDriver: true }
                )}
                contentContainerStyle={styles.carouselContent}
                snapToAlignment="start"
                scrollEventThrottle={16}
            />
        </View>
    );
};

// Updated AccordionTable with fixed height, scrollable table, and horizontal scrolling
// Updated AccordionTable with proper fixed header/footer and both scroll directions
// Updated AccordionTable with proper alignment and dynamic height
const AccordionTable = ({ data }: { data: ChallanData }) => {
    const [isOpen, setIsOpen] = useState(false);

    const toggleAccordion = () => setIsOpen(!isOpen);

    const totalQty = data.data.reduce((sum, item) => sum + parseFloat(item.totalqty), 0);
    const totalAmount = data.data.reduce((sum, item) => sum + item.amount, 0);

    // Column widths for horizontal scrolling
    const columnWidths = {
        step: 180,  // More width for step name
        qty: 100,
        rate: 100,
        amount: 130  // More width for amount with commas
    };

    return (
        <View style={styles.accordionContainer}>
            <TouchableOpacity style={styles.accordionHeader} onPress={toggleAccordion}>
                <View style={styles.accordionHeaderLeft}>
                    <Text style={styles.challanNumber}>{data.chalno}</Text>
                    <Text style={styles.challanDate}>{data.chaldate}</Text>
                </View>
                <View style={styles.accordionHeaderRight}>
                    <Text style={styles.accordionToggle}>{isOpen ? '▲' : '▼'}</Text>
                </View>
            </TouchableOpacity>

            {isOpen && (
                <View style={styles.tableContainer}>
                    {/* Horizontally scrollable content */}
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={true}
                        style={styles.horizontalScrollView}
                    >



                        <View>
                            {/* Vertically scrollable rows - dynamic height based on content */}

                            {/* Fixed Header Row */}
                            <View style={styles.headerRow}>
                                <View style={[styles.headerCell, { width: columnWidths.step }]}>
                                    <Text style={styles.headerCellText}>STEP NAME</Text>
                                </View>
                                <View style={[styles.headerCell, { width: columnWidths.qty }]}>
                                    <Text style={styles.headerCellTextRight}>QUANTITY</Text>
                                </View>
                                <View style={[styles.headerCell, { width: columnWidths.rate }]}>
                                    <Text style={styles.headerCellTextRight}>RATE (₹)</Text>
                                </View>
                                <View style={[styles.headerCell, { width: columnWidths.amount }]}>
                                    <Text style={styles.headerCellTextRight}>AMOUNT (₹)</Text>
                                </View>
                            </View>
                            <ScrollView
                                style={styles.verticalScrollView}
                                showsVerticalScrollIndicator={true}
                            >
                                {data.data.map((item, index) => (
                                    <View key={index} style={[
                                        styles.dataRow,
                                        index % 2 === 0 ? styles.evenRow : styles.oddRow
                                    ]}>
                                        {/* Step Name - Center Aligned */}
                                        <View style={[styles.dataCell, { width: columnWidths.step }]}>
                                            <Text style={styles.cellTextCenter} numberOfLines={0}>
                                                {item.stepname}
                                            </Text>
                                        </View>

                                        {/* Quantity - Right Aligned */}
                                        <View style={[styles.dataCell, { width: columnWidths.qty }]}>
                                            <Text style={styles.cellTextRight}>
                                                {parseFloat(item.totalqty).toFixed(2)}
                                            </Text>
                                        </View>

                                        {/* Rate - Right Aligned */}
                                        <View style={[styles.dataCell, { width: columnWidths.rate }]}>
                                            <Text style={styles.cellTextRight}>
                                                {parseFloat(item.rate).toFixed(2)}
                                            </Text>
                                        </View>

                                        {/* Amount - Right Aligned */}
                                        <View style={[styles.dataCell, { width: columnWidths.amount }]}>
                                            <Text style={styles.cellTextRight}>
                                                {item.amount.toLocaleString('en-IN', {
                                                    minimumFractionDigits: 2,
                                                    maximumFractionDigits: 2
                                                })}
                                            </Text>
                                        </View>
                                    </View>
                                ))}
                            </ScrollView>

                            {/* Fixed Footer Row */}
                            <View style={styles.footerRow}>
                                <View style={[styles.footerCell, { width: columnWidths.step }]}>
                                    <Text style={styles.footerCellText}>TOTAL</Text>
                                </View>
                                <View style={[styles.footerCell, { width: columnWidths.qty }]}>
                                    <Text style={styles.footerCellTextRight}>
                                        {totalQty.toFixed(2)}
                                    </Text>
                                </View>
                                <View style={[styles.footerCell, { width: columnWidths.rate }]}>
                                    <Text style={styles.footerCellTextRight}>-</Text>
                                </View>
                                <View style={[styles.footerCell, { width: columnWidths.amount }]}>
                                    <Text style={styles.footerCellTextRight}>
                                        {totalAmount.toLocaleString('en-IN', {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2
                                        })}
                                    </Text>
                                </View>
                            </View>
                        </View>
                    </ScrollView>
                </View>
            )}
        </View>
    );
};

const SOPartyDetailsPart1: React.FC<SOPartyDetailsProps> = ({ username }) => {
    const party = "N/A";
    const params = useLocalSearchParams();
    const [getChallanResponse, setChallanResponse] = useState(null);
    const [renderedChallans, setRenderedChallans] = useState<ChallanData[]>([]);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [filteredChallans, setFilteredChallans] = useState<ChallanData[]>([]);
    const itemsPerPage = 10;

    useEffect(() => {
        const initializeApp = async () => {
            try {
                const parties_tracking_details_challan_response = await AsyncStorage.getItem('parties_tracking_details_challan_response');
                if (parties_tracking_details_challan_response) {
                    const parsedData = JSON.parse(parties_tracking_details_challan_response);
                    setChallanResponse(parsedData);

                    if (parsedData.data && parsedData.data.data_all) {
                        setFilteredChallans(parsedData.data.data_all);
                        setRenderedChallans(parsedData.data.data_all.slice(0, itemsPerPage));
                    } else if (parsedData.data_all) {
                        setFilteredChallans(parsedData.data_all);
                        setRenderedChallans(parsedData.data_all.slice(0, itemsPerPage));
                    }
                }
            } catch (error) {
                console.error("Initialization error:", error);
            }
        };
        initializeApp();
    }, []);

    // Search function that searches through all data
    const searchInChallanData = (challan: ChallanData, query: string): boolean => {
        const lowerQuery = query.toLowerCase();

        // Search in main challan fields
        if (challan.chalno?.toLowerCase().includes(lowerQuery) ||
            challan.chaldate?.toLowerCase().includes(lowerQuery) ||
            challan.dsnname?.toLowerCase().includes(lowerQuery) ||
            challan.shdname?.toLowerCase().includes(lowerQuery) ||
            challan.uid?.toLowerCase().includes(lowerQuery) ||
            challan.chalsrno?.toLowerCase().includes(lowerQuery) ||
            challan.chalqty?.toLowerCase().includes(lowerQuery)) {
            return true;
        }

        // Search in table data
        if (challan.data && Array.isArray(challan.data)) {
            return challan.data.some(item =>
                item.stepname?.toLowerCase().includes(lowerQuery) ||
                item.totalqty?.toLowerCase().includes(lowerQuery) ||
                item.rate?.toLowerCase().includes(lowerQuery) ||
                item.amount?.toString().toLowerCase().includes(lowerQuery) ||
                item.chaluid?.toLowerCase().includes(lowerQuery)
            );
        }

        return false;
    };

    useEffect(() => {
        const debouncedSearch = debounce(() => {
            if (!getChallanResponse) return;

            let dataAll = [];
            if (getChallanResponse.data && getChallanResponse.data.data_all) {
                dataAll = getChallanResponse.data.data_all;
            } else if (getChallanResponse.data_all) {
                dataAll = getChallanResponse.data_all;
            }

            if (dataAll.length === 0) return;

            const query = searchQuery.toLowerCase();

            if (query === '') {
                setFilteredChallans(dataAll);
                setRenderedChallans(dataAll.slice(0, itemsPerPage));
            } else {
                const filtered = dataAll.filter(challan =>
                    searchInChallanData(challan, query)
                );
                setFilteredChallans(filtered);
                setRenderedChallans(filtered.slice(0, itemsPerPage));
            }

            setPage(1);
        }, 300);

        debouncedSearch();
        return () => debouncedSearch.cancel();
    }, [searchQuery, getChallanResponse]);

    const loadMoreChallans = useCallback(() => {
        if (loading || !filteredChallans || renderedChallans.length >= filteredChallans.length) return;

        setLoading(true);
        setTimeout(() => {
            const nextPage = page + 1;
            const startIndex = page * itemsPerPage;
            const endIndex = startIndex + itemsPerPage;

            setRenderedChallans(prev => [
                ...prev,
                ...filteredChallans.slice(startIndex, endIndex)
            ]);
            setPage(nextPage);
            setLoading(false);
        }, 500);
    }, [page, loading, filteredChallans, renderedChallans]);

    const formatValue = (value: string | number) => {
        const num = typeof value === 'string' ? parseFloat(value) : value;
        if (isNaN(num)) return value;
        if (num >= 10000000) return `${(num / 10000000).toFixed(2)} Cr`;
        if (num >= 100000) return `${(num / 100000).toFixed(2)} L`;
        if (num >= 1000) return `${(num / 1000).toFixed(2)} K`;
        return num.toFixed(2);
    };

    if (!getChallanResponse) {
        return (
            <>
                <HeaderBarwithBack
                    userName={username}
                    // header={typeof party === 'object' ? party.partyname : party}
                    subHeader={'Manage your Challans'}
                    backNavigateScreen={'SOPartyDetails'}
                    breadcrumbWithNoHome={params.party}
                    SearchBar={false}
                />
                <View style={styles.loadingContainer}>
                    <Text>Loading...</Text>
                </View>
            </>
        );
    }

    // Get grand total data - handle different data structures
    let grandTotalData = {};
    if (getChallanResponse.data && getChallanResponse.data.grandtotal) {
        grandTotalData = getChallanResponse.data.grandtotal;
    } else if (getChallanResponse.grandtotal) {
        grandTotalData = getChallanResponse.grandtotal;
    }

    const grandTotalEntries = Object.entries(grandTotalData).map(([key, value]) => ({
        key,
        value: typeof value === 'number' ? value : parseFloat(value as string) || 0
    }));

    // Get data_all - handle different data structures
    let dataAll = [];
    if (getChallanResponse.data && getChallanResponse.data.data_all) {
        dataAll = getChallanResponse.data.data_all;
    } else if (getChallanResponse.data_all) {
        dataAll = getChallanResponse.data_all;
    }

    // Calculate total quantity
    const totalQuantity = dataAll.reduce((sum, item) => sum + parseFloat(item.chalqty || '0'), 0);

    return (
        <>
            <HeaderBarwithBack
                userName={username}
                // header={typeof party === 'object' ? party.partyname : party}
                subHeader={'Manage your Challans'}
                backNavigateScreen={'SOPartyDetails'}
                breadcrumbWithNoHome={params.party}
                SearchBar={false}
            />

            <View style={styles.searchContainer}>
                <Icon name="search" size={20} color="#666" style={styles.searchIcon} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search Challans..."
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholderTextColor="#999"
                />
                {searchQuery !== '' && (
                    <TouchableOpacity onPress={() => setSearchQuery('')}>
                        <Icon name="close" size={20} color="#666" />
                    </TouchableOpacity>
                )}
            </View>

            <Text style={styles.sectionTitle}>Production Summary</Text>
            {grandTotalEntries.length > 0 && <Carousel data={grandTotalEntries} />}

            <Text style={styles.sectionTitle}>Challan Details</Text>
            {dataAll.length > 0 && (
                <Text style={styles.subTitle}>
                    Total Challans: {dataAll.length} | Total Quantity: {formatValue(totalQuantity)}
                    {searchQuery !== '' && ` | Filtered: ${filteredChallans.length}`}
                </Text>
            )}

            {filteredChallans.length > 0 ? (
                <FlatList
                    data={renderedChallans}
                    renderItem={({ item }) => <AccordionTable data={item} />}
                    keyExtractor={(item) => item.uid || Math.random().toString()}
                    onEndReached={loadMoreChallans}
                    onEndReachedThreshold={0.5}
                    ListFooterComponent={
                        loading ? (
                            <View style={styles.loadingIndicator}>
                                <Text>Loading more...</Text>
                            </View>
                        ) : null
                    }
                    contentContainerStyle={styles.listContent}
                />
            ) : (
                <View style={styles.loadingContainer}>
                    <Text>No challans found</Text>
                </View>
            )}
        </>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
        padding: 15,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 8,
        margin: 10,
        paddingHorizontal: 10,
        borderWidth: 1,
        borderColor: '#e0e0e0',
    },
    searchIcon: {
        marginRight: 10,
    },
    searchInput: {
        flex: 1,
        padding: 12,
        fontSize: 14,
        color: '#000',
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginHorizontal: 15,
        marginTop: 10,
        marginBottom: 5,
    },
    subTitle: {
        fontSize: 14,
        color: '#666',
        marginHorizontal: 15,
        marginBottom: 10,
    },
    carouselContainer: {
        marginBottom: 20,
    },
    carouselContent: {
        paddingHorizontal: 15,
    },
    summaryCard: {
        width: width * 0.4,
        padding: 15,
        borderRadius: 10,
        marginRight: 10,
        height: 120,
        justifyContent: 'space-between',
    },
    cardIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10,
    },
    cardTitle: {
        color: 'white',
        fontSize: 14,
        fontWeight: 'bold',
    },
    cardValue: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
    accordionContainer: {
        backgroundColor: '#fff',
        borderRadius: 8,
        marginBottom: 10,
        marginHorizontal: 12,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#e0e0e0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    accordionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 12,
        backgroundColor: '#f8f9fa',
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    accordionHeaderLeft: {},
    challanNumber: {
        fontSize: 15,
        fontWeight: '600',
        color: '#2c3e50',
    },
    challanDate: {
        fontSize: 12,
        color: '#7f8c8d',
        marginTop: 2,
    },
    accordionHeaderRight: {},
    accordionToggle: {
        fontSize: 16,
        color: '#7f8c8d',
        fontWeight: '500',
    },

    // Table Container
    tableContainer: {
        backgroundColor: '#ffffff',
        padding: 0,
    },

    // Horizontal Scroll View
    horizontalScrollView: {
        flexGrow: 0,
    },

    // Vertical Scroll View - Dynamic height
    verticalScrollView: {
        flexGrow: 0,
        backgroundColor: '#ffffff',
        maxHeight: 400, // Maximum height, but will shrink to content
    },

    // Header Row
    headerRow: {
        flexDirection: 'row',
        backgroundColor: '#2c3e50',
        borderBottomWidth: 2,
        borderBottomColor: '#1a252f',
    },
    headerCell: {
        padding: 12,
        borderRightWidth: 1,
        borderRightColor: '#34495e',
        justifyContent: 'center',
        backgroundColor: '#2c3e50',
    },
    headerCellText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#ffffff',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        textAlign: 'center',
    },
    headerCellTextRight: {
        fontSize: 13,
        fontWeight: '700',
        color: '#ffffff',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        textAlign: 'right',
    },

    // Data Rows
    dataRow: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#ecf0f1',
        minHeight: 45,
    },
    evenRow: {
        backgroundColor: '#f8f9fa',
    },
    oddRow: {
        backgroundColor: '#ffffff',
    },
    dataCell: {
        padding: 10,
        borderRightWidth: 1,
        borderRightColor: '#ecf0f1',
        justifyContent: 'center',
    },
    cellTextCenter: {
        fontSize: 12,
        color: '#2c3e50',
        flexWrap: 'wrap',
        lineHeight: 18,
        textAlign: 'center',
    },
    cellTextRight: {
        fontSize: 12,
        color: '#2c3e50',
        textAlign: 'right',
        flexWrap: 'wrap',
        fontWeight: '500',
        lineHeight: 18,
    },

    // Footer Row
    footerRow: {
        flexDirection: 'row',
        backgroundColor: '#ecf0f1',
        borderTopWidth: 2,
        borderTopColor: '#bdc3c7',
    },
    footerCell: {
        padding: 12,
        borderRightWidth: 1,
        borderRightColor: '#bdc3c7',
        justifyContent: 'center',
        backgroundColor: '#ecf0f1',
    },
    footerCellText: {
        fontSize: 13,
        fontWeight: '800',
        color: '#2c3e50',
        textTransform: 'uppercase',
        textAlign: 'center',
    },
    footerCellTextRight: {
        fontSize: 13,
        fontWeight: '800',
        color: '#2c3e50',
        textAlign: 'right',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    loadingIndicator: {
        padding: 20,
        alignItems: 'center',
    },
    listContent: {
        paddingBottom: 20,
    },
});

export default SOPartyDetailsPart1;