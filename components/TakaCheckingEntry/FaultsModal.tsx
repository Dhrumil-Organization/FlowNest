import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
    Modal,
    View,
    Text,
    TextInput,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    Dimensions,
    Alert,
    ActivityIndicator,
    Animated,
    Platform,
    RefreshControl,
    StatusBar,
    Keyboard,
    TouchableWithoutFeedback,
    SafeAreaView
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

// Interface
interface Fault {
    Faults: string;
    RDesc: string;
    Remark: string;
    RsnCode: string;
    SrNo: string;
    SubSr: string;
    UId: string;
}

interface FaultsModalProps {
    visible: boolean;
    data: Fault[];
    onClose: () => void;
    onOK: (updatedData: Fault[]) => void;
    cacheKey: string;
    fetchData: (cacheKey: string) => Promise<Fault[]>;
    initialFilledData?: Fault[];
}

// Constants
const INITIAL_LOAD_COUNT = 10;
const PAGE_SIZE = 10;
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const isTablet = SCREEN_WIDTH >= 600;
const isLargeTablet = SCREEN_WIDTH >= 900;
const numColumns = isLargeTablet ? 4 : isTablet ? 3 : 2;

// Animated Card Component
const AnimatedCard = React.memo(({
    item,
    index,
    remarkValue,
    onRemarkChange,
    isTablet,
}: {
    item: Fault;
    index: number;
    remarkValue: string;
    onRemarkChange: (uid: string, text: string) => void;
    isTablet: boolean;
}) => {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(20)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 300,
                delay: Math.min(index * 30, 500),
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 300,
                delay: Math.min(index * 30, 500),
                useNativeDriver: true,
            })
        ]).start();
    }, []);

    return (
        <Animated.View style={[
            {
                width: cardWidth,
                margin: 6,
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
            },
        ]}>
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <View style={styles.titleContainer}>
                        <Text style={styles.title} numberOfLines={2}>
                            {item.RDesc || 'No Description'}
                        </Text>
                        {/* <Text style={styles.code}>{item.RsnCode || 'N/A'}</Text> */}
                        <Text style={styles.srNo}>Sr: {item.SubSr || '0'}</Text>
                    </View>
                    <View style={[styles.statusDot, remarkValue.trim() ? styles.statusDotActive : null]} />
                </View>

                <View style={styles.inputContainer}>
                    <Icon name="edit" size={16} color="#666" style={styles.inputIcon} />
                    <TextInput
                        style={styles.input}
                        placeholder="e.g. 123, 456-789"
                        placeholderTextColor="#aaa"
                        value={remarkValue}
                        onChangeText={(text) => onRemarkChange(item.SubSr, text)}
                        multiline={isTablet}
                        numberOfLines={isTablet ? 2 : 1}
                        maxLength={100}
                        keyboardType="default"
                        returnKeyType="next"
                        blurOnSubmit={false}
                    />
                </View>
            </View>
        </Animated.View>
    );
});

// Main Component
const FaultsModal: React.FC<FaultsModalProps> = ({
    visible,
    data: initialData,
    onClose,
    onOK,
    cacheKey,
    fetchData,
    initialFilledData = [],
}) => {
    // State
    const [searchQuery, setSearchQuery] = useState('');
    const [originalData, setOriginalData] = useState<Fault[]>(initialData);
    const remarksRef = useRef<Record<string, string>>({});
    const [remarks, setRemarks] = useState<Record<string, string>>({});
    const [displayedData, setDisplayedData] = useState<Fault[]>([]);
    const [allFilteredData, setAllFilteredData] = useState<Fault[]>(initialData);
    const [loading, setLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [hasMoreData, setHasMoreData] = useState(true);
    const [totalCount, setTotalCount] = useState(initialData.length);
    const [searchFocused, setSearchFocused] = useState(false);

    //   const { width: SCREEN_WIDTH } = Dimensions.get('window');
    const isTablet = SCREEN_WIDTH >= 600;
    const isLargeTablet = SCREEN_WIDTH >= 900;
    const numColumns = isLargeTablet ? 4 : isTablet ? 3 : 2;
    const cardWidth = (SCREEN_WIDTH - (numColumns + 1) * 12) / numColumns; // 12 = margins/padding
    // 

    // Refs
    const cacheRef = useRef<{ [key: string]: Fault[] }>({});
    const flatListRef = useRef<FlatList>(null);
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const searchTimeoutRef = useRef<NodeJS.Timeout>();
    const searchInputRef = useRef<TextInput>(null);

    // Load initial data
    useEffect(() => {
        if (visible) {
            setLoading(true);
            const loadData = async () => {
                try {
                    let fetchedData: Fault[];

                    if (cacheRef.current[cacheKey]) {
                        fetchedData = cacheRef.current[cacheKey];
                    } else {
                        fetchedData = await fetchData(cacheKey);
                        cacheRef.current[cacheKey] = fetchedData;
                    }

                    // Merge initialFilledData with fetchedData
                    const mergedData = fetchedData.map(item => {
                        const filledItem = initialFilledData.find(filled => filled.SubSr === item.SubSr);
                        return filledItem ? { ...item, Remark: filledItem.Remark } : item;
                    });

                    setOriginalData(mergedData);
                    setAllFilteredData(mergedData);
                    setTotalCount(mergedData.length);
                    setDisplayedData(mergedData.slice(0, INITIAL_LOAD_COUNT));
                    setCurrentPage(1);
                    setHasMoreData(mergedData.length > INITIAL_LOAD_COUNT);

                    // Initialize remarks with merged data
                    remarksRef.current = mergedData.reduce((acc, item) => {
                        acc[item.SubSr] = item.Remark || '';
                        return acc;
                    }, {} as Record<string, string>);

                    setRemarks({ ...remarksRef.current });

                    // Fade in animation
                    Animated.timing(fadeAnim, {
                        toValue: 1,
                        duration: 300,
                        useNativeDriver: true,
                    }).start();
                } catch (error) {
                    Alert.alert('Error', 'Failed to fetch faults data.');
                } finally {
                    setLoading(false);
                }
            };

            loadData();
        }
    }, [visible, cacheKey, initialFilledData]);

    useEffect(() => {
        const updateLayout = () => {
            const { width } = Dimensions.get('window');
            // No need to update state here, just recalculate numColumns and cardWidth
        };
        Dimensions.addEventListener('change', updateLayout);
        return () => Dimensions.removeEventListener('change', updateLayout);
    }, []);


    // Search functionality
    const handleSearch = useCallback((query: string) => {
        setSearchQuery(query);

        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        searchTimeoutRef.current = setTimeout(() => {
            const filtered = query.trim()
                ? originalData.filter(item =>
                    item.RDesc?.toLowerCase().includes(query.toLowerCase()) ||
                    item.RsnCode?.toLowerCase().includes(query.toLowerCase()) ||
                    item.SrNo?.toLowerCase().includes(query.toLowerCase())
                )
                : originalData;

            setAllFilteredData(filtered);
            setDisplayedData(filtered.slice(0, PAGE_SIZE));
            setCurrentPage(1);
            setHasMoreData(filtered.length > PAGE_SIZE);
        }, 300);
    }, [originalData]);

    const clearSearch = useCallback(() => {
        setSearchQuery('');
        setAllFilteredData(originalData);
        setDisplayedData(originalData.slice(0, INITIAL_LOAD_COUNT));
        setCurrentPage(1);
        setHasMoreData(originalData.length > INITIAL_LOAD_COUNT);

        // Focus back to search input
        setTimeout(() => {
            if (searchInputRef.current) {
                searchInputRef.current.focus();
            }
        }, 50);
    }, [originalData]);

    // Handle remark change
    const handleRemarkChange = useCallback((uid: string, text: string) => {
        remarksRef.current = {
            ...remarksRef.current,
            [uid]: text,
        };
        setRemarks(prev => ({
            ...prev,
            [uid]: text,
        }));
    }, []);

    // Validate Remark format
    const validateRemarks = useCallback((): boolean => {
        for (const [uid, remark] of Object.entries(remarksRef.current)) {
            if (remark.trim() !== '') {
                const parts = remark.split(',').map(part => part.trim());
                for (const part of parts) {
                    if (!/^\d+(-\d+)?$/.test(part)) {
                        return false;
                    }
                }
            }
        }
        return true;
    }, []);

    // Handle OK button
    const handleOK = () => {
        if (!validateRemarks()) {
            Alert.alert(
                'Invalid Format',
                'Please enter remarks in format: "123, 456-789"'
            );
            return;
        }

        const finalData = originalData
            .map(item => ({
                ...item,
                Remark: remarksRef.current[item.SubSr] || '',
            }))
            .filter(item => item.Remark.trim() !== '');

        onOK(finalData);
        onClose();
    };

    // Load more data
    const loadMoreData = useCallback(() => {
        if (loadingMore || !hasMoreData) return;

        setLoadingMore(true);
        setTimeout(() => {
            const nextData = allFilteredData.slice(
                displayedData.length,
                displayedData.length + PAGE_SIZE
            );

            setDisplayedData(prev => [...prev, ...nextData]);
            setCurrentPage(prev => prev + 1);
            setHasMoreData(displayedData.length + nextData.length < allFilteredData.length);
            setLoadingMore(false);
        }, 200);
    }, [displayedData, allFilteredData, loadingMore, hasMoreData]);

    const getItemLayout = useCallback(
        (data: Fault[] | null, index: number) => ({
            length: isTablet ? 180 : 160, // Adjust height as per your design
            offset: (isTablet ? 180 : 160) * index,
            index,
        }),
        [isTablet, numColumns] // Add numColumns as dependency
    );



    // Render header with fixed search bar
    const renderFixedSearchBar = () => (
        <View style={styles.fixedSearchContainer}>
            <View style={styles.searchContainer}>
                <Icon name="search" size={20} color="#999" style={styles.searchIcon} />
                <TextInput
                    ref={searchInputRef}
                    style={styles.searchInput}
                    placeholder="Search..."
                    placeholderTextColor="#999"
                    value={searchQuery}
                    onChangeText={handleSearch}
                    returnKeyType="search"
                    clearButtonMode="while-editing"
                    autoFocus={true}
                    keyboardShouldPersistTaps="always"
                    onFocus={() => setSearchFocused(true)}
                    onBlur={() => setSearchFocused(false)}
                    selectTextOnFocus={true}
                    contextMenuHidden={true}
                />
                {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={clearSearch} style={styles.clearButton}>
                        <Icon name="close" size={18} color="#999" />
                    </TouchableOpacity>
                )}
            </View>
            {/* <View style={styles.infoBar}>
                <Text style={styles.infoText}>{displayedData.length} of {totalCount} items</Text>
                <Text style={styles.formatHint}>Format: 123, 456-789</Text>
            </View> */}
        </View>
    );

    // Render card item
    const renderItem = useCallback(({ item, index }) => (
        <AnimatedCard
            item={item}
            index={index}
            remarkValue={remarksRef.current[item.SubSr] || ''}
            onRemarkChange={handleRemarkChange}
            isTablet={isTablet}
        />
    ), [handleRemarkChange, isTablet]);

    // Render footer loader
    const renderFooter = useCallback(() => {
        if (!hasMoreData) return null;
        return (
            <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color="#28a745" />
                <Text style={styles.footerLoaderText}>Loading more...</Text>
            </View>
        );
    }, [hasMoreData]);

    // Render empty state
    const renderEmpty = useCallback(() => (
        <View style={styles.emptyContainer}>
            <Icon name="error-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No faults found</Text>
            {searchQuery.length > 0 && (
                <TouchableOpacity style={styles.clearSearchBtn} onPress={clearSearch}>
                    <Text style={styles.clearSearchBtnText}>Clear Search</Text>
                </TouchableOpacity>
            )}
        </View>
    ), [searchQuery.length, clearSearch]);

    const keyExtractor = useCallback((item: Fault, index: number) => `fault-${item.SubSr}-${index}`, []);

    return (
        <Modal
            visible={visible}
            animationType="slide"
            onRequestClose={onClose}
        >
            <SafeAreaView style={styles.modalContainer}>
                <View style={styles.header}>
                    <View style={styles.headerTop}>
                        <View style={styles.headerLeft}>
                            <Text style={styles.headerText}>Faults List</Text>
                            <View style={styles.countBadge}>
                                <Text style={styles.countText}>{totalCount}</Text>
                            </View>
                        </View>
                        <View style={styles.headerActions}>
                            <TouchableOpacity
                                onPress={() => flatListRef.current?.scrollToOffset({ offset: 0, animated: true })}
                                style={styles.iconButton}
                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            >
                                <Icon name="arrow-upward" size={22} color="#666" />
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={onClose}
                                style={styles.iconButton}
                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            >
                                <Icon name="close" size={24} color="#666" />
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                {loading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#28a745" />
                        <Text style={styles.loadingText}>Loading faults...</Text>
                    </View>
                ) : (
                    <>
                        {renderFixedSearchBar()}

                        <FlatList
                            numColumns={numColumns}
                            contentContainerStyle={styles.listContainer}
                            ref={flatListRef}
                            data={displayedData}
                            renderItem={renderItem}
                            keyExtractor={keyExtractor}
                            // numColumns={numColumns}
                            // contentContainerStyle={[
                            //     styles.listContainer,
                            //     { paddingTop: searchFocused ? 0 : 0 }
                            // ]}
                            onEndReached={loadMoreData}
                            onEndReachedThreshold={0.5}
                            ListFooterComponent={renderFooter}
                            ListEmptyComponent={renderEmpty}
                            initialNumToRender={INITIAL_LOAD_COUNT}
                            maxToRenderPerBatch={PAGE_SIZE}
                            windowSize={7}
                            removeClippedSubviews={Platform.OS === 'android'}
                            keyboardShouldPersistTaps="handled"
                            keyboardDismissMode="interactive"
                            extraData={remarks}
                            getItemLayout={getItemLayout}
                            onScrollBeginDrag={() => {
                                if (searchInputRef.current) {
                                    searchInputRef.current.blur();
                                }
                            }}
                        />

                        <View style={styles.bottomContainer}>
                            <View style={styles.buttonContainer}>
                                <TouchableOpacity
                                    style={styles.okButton}
                                    onPress={handleOK}
                                    activeOpacity={0.8}
                                >
                                    <Icon name="check" size={20} color="#fff" />
                                    <Text style={styles.buttonText}>Apply Changes</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.closeButton}
                                    onPress={onClose}
                                    activeOpacity={0.8}
                                >
                                    <Icon name="close" size={20} color="#fff" />
                                    <Text style={styles.buttonText}>Close</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </>
                )}
            </SafeAreaView>
        </Modal>
    );
};

const cardWidth = (SCREEN_WIDTH - (numColumns + 1) * 12) / numColumns; // 12 = total horizontal margin/padding

// Updated styles
const styles = StyleSheet.create({
    modalContainer: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    header: {
        backgroundColor: '#fff',
        paddingHorizontal: 16,
        paddingTop: Platform.OS === 'ios' ? 50 : 16,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerText: {
        fontSize: isTablet ? 24 : 20,
        fontWeight: '700',
        color: '#0f172a',
        letterSpacing: 0.3,
    },
    countBadge: {
        backgroundColor: '#e6f7e6',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
        marginLeft: 12,
        borderWidth: 1,
        borderColor: '#c3e6cb',
    },
    countText: {
        color: '#28a745',
        fontWeight: '700',
        fontSize: 14,
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconButton: {
        padding: 8,
        marginLeft: 4,
        borderRadius: 20,
        backgroundColor: '#f8fafc',
    },
    fixedSearchContainer: {
        backgroundColor: '#fff',
        paddingHorizontal: 8,
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0',
        zIndex: 10,
        elevation: 2,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f8fafc',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 12,
        paddingHorizontal: 12,
        minHeight: 48,
        // marginBottom: 8,
    },
    searchIcon: {
        marginRight: 10,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        color: '#0f172a',
        paddingVertical: 10,
        paddingHorizontal: 8,
        includeFontPadding: false,
        textAlignVertical: 'center',
    },
    clearButton: {
        padding: 6,
        borderRadius: 16,
        backgroundColor: '#f1f5f9',
    },
    infoBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 4,
    },
    infoText: {
        fontSize: 13,
        color: '#64748b',
        fontWeight: '500',
    },
    formatHint: {
        fontSize: 12,
        color: '#28a745',
        fontWeight: '600',
        backgroundColor: '#e6f7e6',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 16,
    },
    listContainer: {
        padding: 8,
        paddingBottom: 20,
        paddingTop: 8,
    },
    // cardWrapper: {
    //     flex: 1,
    //     margin: 6,
    // },
    cardWrapper: {
        width: cardWidth,
        margin: 6,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 14,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.05,
                shadowRadius: 4,
            },
            android: {
                elevation: 2,
            },
        }),
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    titleContainer: {
        flex: 1,
    },
    title: {
        fontSize: isTablet ? 15 : 14,
        fontWeight: '600',
        color: '#0f172a',
        marginBottom: 4,
        lineHeight: 20,
    },
    code: {
        fontSize: 12,
        color: '#64748b',
        fontWeight: '500',
        marginBottom: 2,
    },
    srNo: {
        fontSize: 11,
        color: '#94a3b8',
        fontWeight: '400',
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#e2e8f0',
        marginLeft: 8,
        marginTop: 4,
    },
    statusDotActive: {
        backgroundColor: '#28a745',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 12,
        backgroundColor: '#f8fafc',
        paddingHorizontal: 10,
        // paddingVertical: Platform.OS === 'ios' ? 12 : 8,
    },
    inputIcon: {
        marginRight: 8,
        marginTop: 2,
    },
    input: {
        flex: 1,
        fontSize: 14,
        color: '#0f172a',
        padding: 0,
        // minHeight: isTablet ? 50 : 40,
        textAlignVertical: 'top',
    },
    bottomContainer: {
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#e2e8f0',
        paddingHorizontal: 16,
        paddingVertical: 12,
        ...Platform.select({
            ios: {
                paddingBottom: 34,
            },
        }),
    },
    buttonContainer: {
        flexDirection: 'row',
        gap: 12,
    },
    okButton: {
        flex: 2,
        backgroundColor: '#28a745',
        borderRadius: 12,
        paddingVertical: 10,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    closeButton: {
        flex: 1,
        backgroundColor: '#dc3545',
        borderRadius: 12,
        paddingVertical: 10,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    buttonText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 16,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f8fafc',
    },
    loadingText: {
        marginTop: 12,
        fontSize: 16,
        color: '#64748b',
        fontWeight: '500',
    },
    footerLoader: {
        paddingVertical: 20,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 8,
    },
    footerLoaderText: {
        fontSize: 14,
        color: '#64748b',
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 32,
        paddingVertical: 48,
    },
    emptyText: {
        fontSize: 16,
        color: '#94a3b8',
        marginTop: 16,
        marginBottom: 24,
    },
    clearSearchBtn: {
        backgroundColor: '#e6f7e6',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 8,
    },
    clearSearchBtnText: {
        color: '#28a745',
        fontWeight: '600',
    },
});

export default FaultsModal;
