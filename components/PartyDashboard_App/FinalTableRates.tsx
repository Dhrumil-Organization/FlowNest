import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    FlatList,
    ScrollView,
    TextInput,
    Dimensions
} from 'react-native';

const ROW_HEIGHT = 52;
const PAGE_SIZE = 20;

const FinalTableRates = ({ data = [], styles }) => {

    const screenHeight = Dimensions.get('window').height;

    const [fullData, setFullData] = useState([]);
    const [visibleData, setVisibleData] = useState([]);
    const [filteredFullData, setFilteredFullData] = useState([]);

    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');

    const debounceRef = useRef(null);

    const columns = [
        { key: 'srno', label: '#', width: 60, align: 'center' },
        { key: 'TranDate', label: 'Date', width: 120, align: 'center' },
        { key: 'VouNo', label: 'Vou No', width: 120, align: 'center' },
        { key: 'DrAmt', label: 'Debit', width: 120, align: 'right', type: 'number', color: 'red' },
        { key: 'CrAmt', label: 'Credit', width: 120, align: 'right', type: 'number', color: 'green' },
        { key: 'Outstanding', label: 'Outstanding', width: 120, align: 'right', type: 'number', color: 'green' },
        { key: 'Paid', label: 'Paid', width: 140, align: 'right', type: 'number' },
    ];

    const totalKeys = ['DrAmt', 'CrAmt', 'Outstanding', 'Paid'];

    // INIT
    useEffect(() => {
        setFullData(data);
        setFilteredFullData(data);
        setVisibleData(data.slice(0, PAGE_SIZE));
        setPage(1);
    }, [data]);

    // 🔍 FILTER + RESET LAZY
    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);

        debounceRef.current = setTimeout(() => {

            let filtered = fullData;

            if (search) {
                filtered = fullData.filter(item =>
                    Object.values(item).some(val =>
                        String(val).toLowerCase().includes(search.toLowerCase())
                    )
                );
            }

            setFilteredFullData(filtered);
            setVisibleData(filtered.slice(0, PAGE_SIZE));
            setPage(1);

        }, 300);

    }, [search, fullData]);

    // ⚡ LOAD MORE
    const loadMore = () => {
        const nextPage = page + 1;
        const start = (nextPage - 1) * PAGE_SIZE;
        const end = start + PAGE_SIZE;

        const nextChunk = filteredFullData.slice(start, end);

        if (nextChunk.length > 0) {
            setVisibleData(prev => [...prev, ...nextChunk]);
            setPage(nextPage);
        }
    };

    // 🇮🇳 FORMAT
    const formatIndian = (val) => {
        if (!val && val !== 0) return "0";
        const num = parseFloat(String(val).replace(/,/g, ''));
        return isNaN(num) ? val : Math.floor(num).toLocaleString('en-IN');
    };

    // 📊 TOTAL (filtered full data pe)
    const totals = {};
    totalKeys.forEach(key => {
        totals[key] = filteredFullData.reduce((sum, item) => {
            return sum + (parseFloat(item[key]) || 0);
        }, 0);
    });

    const totalWidth = columns.reduce((sum, c) => sum + c.width, 0);

    // 🔥 VALUE FORMAT
    const formatValue = (col, value) => {

        if (col.key === 'srno') return value;

        if (col.type === 'number') {
            const num = parseFloat(value) || 0;

            if (col.key === 'DrAmt') return `- ${formatIndian(num)}`;
            if (col.key === 'CrAmt') return `+ ${formatIndian(num)}`;

            return formatIndian(num);
        }

        return value;
    };

    const getColor = (col) => {
        if (col.key === 'DrAmt') return 'red';
        if (col.key === 'CrAmt') return 'green';
        return '#000';
    };

    // 🔥 HEADER
    const Header = () => (
        <View style={styles.tableHeader}>
            {columns.map(col => (
                <Text
                    key={col.key}
                    style={[
                        styles.headerText,
                        { width: col.width, textAlign: col.align, padding: 5 }
                    ]}
                >
                    {col.label}
                </Text>
            ))}
        </View>
    );

    // 🔥 FOOTER (ALWAYS FIXED)
    const Footer = () => (
        <View style={styles.tableHeader}>
            <Text style={[
                styles.headerText,
                { width: 60, textAlign: 'center', padding: 5 },
            ]}>Total</Text>
            <Text style={{ width: 120 }} />
            <Text style={{ width: 120 }} />

            {columns.slice(3).map(col => (
                <Text
                    key={col.key}
                    style={[
                        styles.headerText,
                        { width: col.width, textAlign: col.align, padding: 5 },
                    ]}
                >
                    {formatIndian(totals[col.key])}
                </Text>
            ))}
        </View>
    );

    // 🔥 ROW
    const Row = ({ item, index }) => (
        <View style={styles.tableRow}>
            {columns.map(col => {

                let value =
                    col.key === 'srno'
                        ? index + 1
                        : item[col.key];

                return (
                    <Text
                        key={col.key}
                        style={[
                            styles.rowText,
                            {
                                width: col.width,
                                textAlign: col.align,
                                color: getColor(col),
                                padding: 5
                            }
                        ]}
                    >
                        {formatValue(col, value)}
                    </Text>
                );
            })}
        </View>
    );

    return (
        <View style={{ flex: 1 }}>

            {/* 🔍 SEARCH */}
            <TextInput
                placeholder="Search..."
                value={search}
                onChangeText={setSearch}
                style={{
                    backgroundColor: '#fff',
                    padding: 8,
                    borderWidth: 1,
                    marginBottom: 5,
                    borderColor: 'rgba(0, 0, 0, 0.1)',
                }}
            />

            <ScrollView horizontal>
                <View style={{ minWidth: totalWidth, flex: 1 }}>

                    <Header />

                    {/* 📏 TABLE HEIGHT AUTO */}
                    <FlatList
                        data={visibleData}
                        renderItem={({ item, index }) => (
                            <Row item={item} index={index} />
                        )}
                        keyExtractor={(_, i) => i.toString()}
                        getItemLayout={(_, index) => ({
                            length: ROW_HEIGHT,
                            offset: ROW_HEIGHT * index,
                            index,
                        })}
                        onEndReached={loadMore}
                        onEndReachedThreshold={0.5}
                        style={{ height: screenHeight * 0.6 }} // 👈 AUTO HEIGHT
                        initialNumToRender={20}
                        maxToRenderPerBatch={20}
                        windowSize={10}
                        removeClippedSubviews
                    />

                    <Footer />

                </View>
            </ScrollView>

        </View>
    );
};

export default FinalTableRates;