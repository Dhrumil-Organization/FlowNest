// import React, { useState, useEffect, useRef } from 'react';
// import {
//     View,
//     Text,
//     TouchableOpacity,
//     ActivityIndicator,
//     FlatList,
//     ScrollView
// } from 'react-native';
// import LinearGradient from 'react-native-linear-gradient';
// import Icon from 'react-native-vector-icons/MaterialIcons';
// import Ticker from '../../common/Ticker';
// import theme from '../../android/app/src/theme';

// const PAGE_SIZE = 30;
// const ROW_HEIGHT = 52;

// const SummaryTable = ({
//     data = [],
//     searchQuery = '',
//     onRowPress,
//     styles
// }) => {

//     const summaryColumns = [
//         { key: 'ParType', label: 'Type', width: 100, align: 'center' },
//         { key: 'SHName', label: 'Sh Name', width: 150, align: 'center' },
//         { key: 'Status', label: 'Status', width: 120, align: 'right' },
//         { key: 'bkrcode', label: 'PDC Amount', width: 100, align: 'right' },
//         { key: 'bkrname', label: '0-30', width: 100, align: 'right' },
//         { key: 'value', label: '31-60', width: 100, align: 'right' },
//     ];

//     const columnsToSum = ['Total'];

//     const [fullData, setFullData] = useState([]);
//     const [visibleData, setVisibleData] = useState([]);
//     const [page, setPage] = useState(1);

//     const [rowLoading, setRowLoading] = useState(null);

//     const debounceRef = useRef(null);

//     // ================= INIT =================
//     useEffect(() => {
//         setFullData(data);
//         setVisibleData(data.slice(0, PAGE_SIZE));
//         setPage(1);
//     }, [data]);

//     // ================= FILTER =================
//     useEffect(() => {
//         if (debounceRef.current) clearTimeout(debounceRef.current);

//         debounceRef.current = setTimeout(() => {
//             if (!searchQuery) {
//                 setFullData(data);
//                 setVisibleData(data.slice(0, PAGE_SIZE));
//                 return;
//             }

//             const filtered = data.filter(item =>
//                 Object.values(item).some(val =>
//                     String(val).toLowerCase().includes(searchQuery.toLowerCase())
//                 )
//             );

//             setFullData(filtered);
//             setVisibleData(filtered.slice(0, PAGE_SIZE));
//             setPage(1);
//         }, 300);

//     }, [searchQuery, data]);

//     // ================= LOAD MORE =================
//     const loadMore = () => {
//         const nextPage = page + 1;
//         const start = (nextPage - 1) * PAGE_SIZE;
//         const end = start + PAGE_SIZE;

//         const nextChunk = fullData.slice(start, end);

//         if (nextChunk.length > 0) {
//             setVisibleData(prev => [...prev, ...nextChunk]);
//             setPage(nextPage);
//         }
//     };

//     // ================= TOTAL =================
//     const calculateTotals = () => {
//         let total = 0;
//         fullData.forEach(item => {
//             total += parseFloat(item.Total) || 0;
//         });
//         return total;
//     };

//     const formatIndianNumber = (num) =>
//         Math.floor(num || 0).toLocaleString('en-IN');

//     const totalWidth =
//         summaryColumns.reduce((sum, c) => sum + c.width, 0) + 340;

//     // ================= ROW CLICK =================
//     const handleRowClick = (item) => {
//         setRowLoading(item.acccode);

//         setTimeout(() => {
//             console.log("FULL ROW JSON:", item); // 👈 yaha pura data milega
//             onRowPress && onRowPress(item);

//             setRowLoading(null);
//         }, 2000); // 👈 2 SECOND LOADER
//     };

//     // ================= HEADER =================
//     const Header = () => (
//         <View style={styles.tableHeader}>
//             <Text style={[styles.headerText, { width: 160, textAlign: 'center' }]}>Account Name</Text>
//             {/* <Text style={[styles.headerText, { width: 160, textAlign: 'center' }]}>Total</Text> */}
//             {/* <Text style={[styles.headerText, { width: 160, textAlign: 'center' }]}>Actions</Text> */}

//             {summaryColumns.map(col => (
//                 <Text
//                     key={col.key}
//                     style={[
//                         styles.headerText,
//                         { width: col.width, textAlign: col.align }
//                     ]}
//                 >
//                     {col.label}
//                 </Text>
//             ))}
//         </View>
//     );

//     // ================= FOOTER =================
//     const Footer = () => (
//         <View style={[styles.tableHeader]}>
//             <Text style={[styles.headerText, { width: 160, textAlign: 'center' }]}>Totals</Text>
//             {/* <Text style={[styles.headerText, { width: 100, textAlign: 'right' }]}>
//                 {formatIndianNumber(calculateTotals())}
//             </Text> */}
//             {/* <Text style={{ width: 80 }} /> */}

//             {summaryColumns.map(col => (
//                 <Text key={col.key} style={{ width: col.width }} />
//             ))}
//         </View>
//     );

//     // ================= ROW =================
//     const Row = React.memo(({ item }) => (
//         <TouchableOpacity style={styles.tableRow}
//             onPress={() => handleRowClick(item)}>
//             <Text style={[styles.rowText, { width: 160, textAlign: 'left' }]}
//                 numberOfLines={2}>{rowLoading === item.acccode ? (
//                     <ActivityIndicator size="small" />
//                 ) : (item.accname)}</Text>

//             {/* <Text style={[styles.rowText, { width: 160, textAlign: 'right' }]}>
//                 {formatIndianNumber(item.Total)}
//             </Text> */}

//             {/* <TouchableOpacity
//                 style={{ width: 80 }}
//                 onPress={() => handleRowClick(item)}
//             >
//                 {rowLoading === item.AccCode ? (
//                     <ActivityIndicator size="small" />
//                 ) : (
//                     <Icon name="info" size={20} />
//                 )}
//             </TouchableOpacity> */}

//             {summaryColumns.map(col => (
//                 <Text
//                     key={col.key}
//                     style={[
//                         styles.rowText,
//                         { width: col.width, textAlign: col.align }
//                     ]}
//                 >
//                     {item[col.key]}
//                 </Text>
//             ))}
//             {/* {rowLoading === item.acccode && (
//                 <ActivityIndicator size="small" />
//             )} */}
//         </TouchableOpacity>
//     ));

//     return (
//         <>

//             <TouchableOpacity style={styles.syncToggleContainer}>
//                 <LinearGradient
//                     colors={[theme.BRAND_GRADIENT_START, theme.BRAND_GRADIENT_END]}
//                     start={{ x: 0, y: 0 }}
//                     end={{ x: 1, y: 0 }}
//                     style={styles.narrationBar}
//                 >
//                     <View style={styles.syncToggle}>
//                         {/* <Ticker
//                             text={`{${visibleData.length} / ${fullData.length}}`}
//                             icon="sync"
//                             textStyle={{ fontFamily: theme.FONT_FAMILY_EXTRABOLD, fontSize: 10 }}
//                         /> */}
//                         <Text style={{ fontFamily: theme.FONT_FAMILY_EXTRABOLD, paddingHorizontal: 8, paddingVertical: 4, fontSize: 11.5, color: theme.TEXT_WHITE }}>{`Total Data : ${visibleData.length} / ${fullData.length}`}</Text>
//                         {/* <Icon
//                             name={showLastSync ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
//                             size={24}
//                             color={theme.TEXT_WHITE}
//                         /> */}
//                     </View>
//                 </LinearGradient>
//             </TouchableOpacity>
//             <View style={styles.tableWrapper}>

//                 {/* COUNT INFO */}
//                 {/* <View style={{ padding: 10 }}>
//                 <Text>Total Data: {fullData.length}</Text>
//                 <Text>Showing: {visibleData.length}</Text>
//             </View> */}


//                 <ScrollView horizontal>
//                     <View style={{ minWidth: totalWidth }}>
//                         <Header />

//                         <FlatList
//                             data={visibleData}
//                             renderItem={({ item }) => <Row item={item} />}
//                             keyExtractor={(item) => item.acccode}
//                             getItemLayout={(_, index) => ({
//                                 length: ROW_HEIGHT,
//                                 offset: ROW_HEIGHT * index,
//                                 index,
//                             })}
//                             onEndReached={loadMore}
//                             onEndReachedThreshold={0.5}
//                             initialNumToRender={20}
//                             maxToRenderPerBatch={20}
//                             windowSize={10}
//                             removeClippedSubviews
//                         />

//                         <Footer />
//                     </View>
//                 </ScrollView>
//             </View>
//         </>
//     );
// };

// export default SummaryTable;
import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    ActivityIndicator,
    FlatList,
    Dimensions
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import theme from '../../android/app/src/theme';

const PAGE_SIZE = 30;

const COLORS = [
    ['#141E30', '#243B55'],
    ['#0F2027', '#203A43'],
    ['#232526', '#414345'],
    ['#1D2671', '#C33764'],
    ['#42275A', '#734B6D'],
    ['#16222A', '#3A6073'],
    ['#0B486B', '#3B8686'],
];

const SummaryTable = ({
    data = [],
    searchQuery = '',
    onRowPress,
}) => {

    const [fullData, setFullData] = useState([]);
    const [visibleData, setVisibleData] = useState([]);
    const [page, setPage] = useState(1);
    const [rowLoading, setRowLoading] = useState(null);

    const debounceRef = useRef(null);

    // ================= SCREEN RESPONSIVE =================
    const screenWidth = Dimensions.get('window').width;

    const numColumns = screenWidth > 900 ? 4 :
        screenWidth > 600 ? 3 : 2;

    // ================= INIT =================
    useEffect(() => {
        setFullData(data);
        setVisibleData(data.slice(0, PAGE_SIZE));
        setPage(1);
    }, [data]);

    // ================= FILTER =================
    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);

        debounceRef.current = setTimeout(() => {

            if (!searchQuery) {
                setFullData(data);
                setVisibleData(data.slice(0, PAGE_SIZE));
                return;
            }

            const filtered = data.filter(item =>
                Object.values(item).some(val =>
                    String(val).toLowerCase().includes(searchQuery.toLowerCase())
                )
            );

            setFullData(filtered);
            setVisibleData(filtered.slice(0, PAGE_SIZE));
            setPage(1);

        }, 300);

    }, [searchQuery, data]);

    // ================= LOAD MORE =================
    const loadMore = () => {
        const nextPage = page + 1;
        const start = (nextPage - 1) * PAGE_SIZE;
        const end = start + PAGE_SIZE;

        const nextChunk = fullData.slice(start, end);

        if (nextChunk.length > 0) {
            setVisibleData(prev => [...prev, ...nextChunk]);
            setPage(nextPage);
        }
    };

    // ================= CLICK =================
    const handleCardClick = (item) => {
        setRowLoading(item.acccode);

        // setTimeout(() => {
        console.log("CARD JSON:", item);
        onRowPress && onRowPress(item);
        setRowLoading(null);
        // }, 2000);
    };

    // ================= CARD =================
    const Card = React.memo(({ item, index }) => {
        const gradient = COLORS[index % COLORS.length];

        return (
            <TouchableOpacity
                style={{
                    flex: 1,
                    margin: 8,
                    borderRadius: 14,
                    overflow: 'hidden'
                }}
                onPress={() => handleCardClick(item)}
                activeOpacity={0.85}
            >
                <LinearGradient
                    colors={gradient}
                    style={{
                        padding: 16,
                        minHeight: 100,
                        justifyContent: 'center'
                    }}
                >
                    {rowLoading === item.acccode ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text
                            style={{
                                color: '#fff',
                                fontSize: 14,
                                fontWeight: '700'
                            }}
                            numberOfLines={2}
                        >
                            {item.accname}
                        </Text>
                    )}
                </LinearGradient>
            </TouchableOpacity>
        );
    });

    return (
        <View style={{ flex: 1 }}>

            {/* COUNT BAR */}
            <View style={{
                padding: 10,
                backgroundColor: '#111',
                alignItems: 'center'
            }}>
                <Text style={{ color: '#fff' }}>
                    {`Total: ${visibleData.length} / ${fullData.length}`}
                </Text>
            </View>

            {/* GRID */}
            <FlatList
                data={visibleData}
                renderItem={({ item, index }) => (
                    <Card item={item} index={index} />
                )}
                keyExtractor={(item) => item.acccode}
                numColumns={numColumns}
                key={numColumns} // important for layout refresh
                onEndReached={loadMore}
                onEndReachedThreshold={0.5}
                initialNumToRender={10}
                maxToRenderPerBatch={10}
                windowSize={7}
                removeClippedSubviews
                contentContainerStyle={{ padding: 6 }}
            />
        </View>
    );
};

export default SummaryTable;