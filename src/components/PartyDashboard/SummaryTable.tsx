import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, FlatList, Dimensions } from 'react-native';
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

const SummaryTable = ({ data = [], searchQuery = '', onRowPress, }) => {

    

    const [fullData, setFullData] = useState([]);
    const [visibleData, setVisibleData] = useState([]);
    const [page, setPage] = useState(1);
    const [rowLoading, setRowLoading] = useState(null);

    const debounceRef = useRef(null);

    const screenWidth = Dimensions.get('window').width;

    const numColumns = screenWidth > 900 ? 4 :
        screenWidth > 600 ? 3 : 2;

    useEffect(() => {
        setFullData(data);
        setVisibleData(data.slice(0, PAGE_SIZE));
        setPage(1);
    }, [data]);

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

    const handleCardClick = async (item) => {
        console.log("TESTING CARD CCCC")
        setRowLoading(item.acccode);

        onRowPress && onRowPress(item);
        setRowLoading(null);

    };

    const Card = React.memo(({ item, index }) => {
        const gradient = COLORS[index % COLORS.length];

        return (
            <TouchableOpacity
                style={{ flex: 1, margin: 8, borderRadius: 14, overflow: 'hidden' }}
                onPress={() => handleCardClick(item)}
                activeOpacity={0.85}
            >
                <LinearGradient
                    colors={gradient}
                    style={{ padding: 16, minHeight: 100, justifyContent: 'center' }}
                >
                    {rowLoading === item.acccode ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text
                            style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}
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

            <View style={{ padding: 10, backgroundColor: '#111', alignItems: 'center' }}>
                
                <Text style={{ color: '#fff' }}>
                    {`Total: ${visibleData.length} / ${fullData.length}`}
                </Text>
            </View>

            <FlatList
                data={visibleData}
                renderItem={({ item, index }) => (
                    <Card item={item} index={index} />
                )}
                keyExtractor={(item) => item.acccode}
                numColumns={numColumns}
                key={numColumns}
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