import React, { useState, useEffect, useRef } from 'react';
import { View, Text, FlatList, ScrollView, TextInput, Dimensions } from 'react-native';

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

    const screenWidth = Dimensions.get('window').width;

    const isMobile = screenWidth < 600;
    const isTablet = screenWidth >= 600;

    const columns = [
        { key: 'srno', label: '#', width: 60, align: 'center' },
        { key: 'QgName', label: 'Grp Name ', width: 100, align: 'center' },
        { key: 'Qltname', label: 'Quality Name', width: 130, align: 'center' },
        { key: 'Rate', label: 'Rate', width: 100, align: 'right', type: 'number', color: 'red' },
    ];

    // {
    //     "AccCode": "55411",
    //     "Party": "ALLOL CREATION PVT. LTD. [JOB]",
    //     "Qltname": "CRAPE SILK",
    //     "QgName": "ONLY BRUMING",
    //     "Rate": "10.00"
    // }

    const totalKeys = ['Rate'];

    useEffect(() => {
        setFullData(data);
        setFilteredFullData(data);
        setVisibleData(data.slice(0, PAGE_SIZE));
        setPage(1);
    }, [data]);

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

    const formatIndian = (val) => {
        if (!val && val !== 0) return "0";
        const num = parseFloat(String(val).replace(/,/g, ''));
        return isNaN(num) ? val : Math.floor(num).toLocaleString('en-IN');
    };

    const totals = {};
    totalKeys.forEach(key => {
        totals[key] = filteredFullData.reduce((sum, item) => {
            return sum + (parseFloat(item[key]) || 0);
        }, 0);
    });

    const totalWidth = columns.reduce((sum, c) => sum + c.width, 0);

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

    const CardRow = ({ item, index }) => (
        <View style={{
            backgroundColor: '#fff', marginVertical: 6, marginHorizontal: 6, padding: 12,
            borderRadius: 10, elevation: 2
        }}>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontWeight: 'bold', fontSize: 16, flex: 1 }}>
                    #{index + 1} - {item.Qltname}
                </Text>

                <Text style={{ color: 'green', fontSize: 20, fontWeight: 'bold', textAlign: 'right' }}>
                    {/* ₹  */}
                    {formatIndian(item.Rate)}
                </Text>

            </View>

            <Text style={{ marginTop: 4, color: '#a3a3a3' }}>
                Group: {item.QgName}
            </Text>

        </View>
    );

    const TableRow = ({ item, index }) => (
        <View style={styles.tableRow}>
            {columns.map(col => {
                let value = col.key === 'srno'
                    ? index + 1
                    : item[col.key];

                return (
                    <Text
                        key={col.key}
                        numberOfLines={2}
                        style={[
                            styles.rowText,
                            {
                                flex: 1,
                                textAlign: col.align,
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

    const Header = () => (
        <View style={styles.tableHeader}>
            {columns.map(col => (
                <Text
                    key={col.key}
                    style={[
                        styles.headerText,
                        { flex: 1, textAlign: col.align, padding: 5 }
                    ]}
                >
                    {col.label}
                </Text>
            ))}
        </View>
    );

    return (
        <View style={{ flex: 1 }}>

            <TextInput
                placeholder="Search..."
                value={search}
                onChangeText={setSearch}
                style={{ backgroundColor: '#fff', padding: 8, borderWidth: 1, marginBottom: 5, borderColor: 'rgba(0, 0, 0, 0.1)', }}
            />

            {isMobile ? (
                <FlatList
                    data={visibleData}
                    renderItem={({ item, index }) => (
                        <CardRow item={item} index={index} />
                    )}
                    keyExtractor={(_, i) => i.toString()}
                    onEndReached={loadMore}
                    onEndReachedThreshold={0.5}
                />
            ) : (
                <View style={{ flex: 1 }}>
                    <Header />

                    <FlatList
                        data={visibleData}
                        renderItem={({ item, index }) => (
                            <TableRow item={item} index={index} />
                        )}
                        keyExtractor={(_, i) => i.toString()}
                        onEndReached={loadMore}
                        onEndReachedThreshold={0.5}
                    />
                </View>
            )}
        </View>
    );
};

export default FinalTableRates;