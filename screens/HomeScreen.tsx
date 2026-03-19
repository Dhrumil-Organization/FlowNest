// export default HomeScreen;
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    Dimensions,
    StyleSheet,
    ScrollView,
    FlatList,
    SafeAreaView,
    SectionList,
    ImageBackground,
    Platform,
    Modal,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import HeaderBar from '../components/HeaderBar/HeaderBar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import theme from '../android/app/src/theme';
import { hexToRgba } from '../android/app/src/utils/color';

const { width } = Dimensions.get('window');
const NUM_COLUMNS = width > 500 ? 4 : 3;
const GAP = 12;
const APP_BUTTON_WIDTH = Math.floor((width - 32 - (NUM_COLUMNS - 1) * GAP) / NUM_COLUMNS);

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

const useDebounce = (value: string, delay: number) => {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const t = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(t);
    }, [value, delay]);
    return debouncedValue;
};

// #4285F4 (Blue) - Credit Limit Request

// #6bd35d (Green) - Collection

// #2E2E2E (Dark Gray) - Upload

// #F2D43D (Yellow) - Sudamo Production Order

// #1F7006 (Dark Green) - Yarn Purchase Order

// #3BAD18 (Light Green) - Grey Purchase Order

// #20BEC1 (Teal) - Sales Order

// #CE9F78 (Brown/Tan) - Production Order Tracking

// #E982F6 (Pink/Purple) - New Account Request

// #D35400 (Pumpkin Orange) - Monthly Expense Report

// #ABC00B - Snap View

// #773F3F - Receivables

// #521313 - Payable

//  #5B2CFF - Daily Collection Report

//rgb(219, 148, 90) - Sales Order Tracking

const APP_SECTIONS = [
    {
        title: 'C',
        data: [
            { id: '1', name: 'Credit Limit Request', screen: 'Credit Limit Request', icon: 'credit-score', iconColor: '#4285F4' },
            { id: '2', name: 'Collection', screen: 'Collection', icon: 'currency-rupee', iconColor: '#6bd35d' },
        ],
    },
    {
        title: 'U',
        data: [
            { id: '3', name: 'Upload', screen: 'Upload', icon: 'upload', iconColor: '#2E2E2E' },
        ],
    },
    {
        title: 'S',
        data: [
            { id: '4', name: 'Sudamo Production Order', screen: 'Sudamo Production Order', icon: 'production-quantity-limits', iconColor: '#F2D43D' },
        ],
    },
    {
        title: 'Y',
        data: [
            { id: '5', name: 'Yarn Purchase Order', screen: 'Yarn Purchase Order', icon: 'attach-money', iconColor: '#1F7006' },
        ],
    },
    {
        title: 'G',
        data: [
            { id: '6', name: 'Grey Purchase Order', screen: 'Grey Purchase Order', icon: 'payments', iconColor: '#3BAD18' },
            { id: '7', name: 'Sales Order', screen: 'Sales Order', icon: 'point-of-sale', iconColor: '#20BEC1' },
        ],
    },
    // Only For Sudamo
    {
        title: 'P',
        data: [
            { id: '8', name: 'Production Order Tracking', screen: 'Production Order Tracking', icon: 'track-changes', iconColor: '#CE9F78' },
        ],
    },
    {
        title: 'N',
        data: [
            { id: '9', name: 'New Account Request', screen: 'New Account Request', icon: 'account-balance', iconColor: '#E982F6' },
        ],
    },
    {
        title: 'M',
        data: [
            { id: '10', name: 'Monthly Expense Report', screen: 'Monthly Expense Report', icon: 'table-chart', iconColor: '#D35400' },
        ],
    },
    {
        title: 'S',
        data: [
            { id: '11', name: 'Snap View', screen: 'Snap View', icon: 'table-view', iconColor: '#ABC00B' },
        ],
    },
    {
        title: 'R',
        data: [
            { id: '12', name: 'Receivables', screen: 'Receivables', icon: 'receipt-long', iconColor: '#773F3F' },
        ],
    },
    {
        title: 'P',
        data: [
            { id: '13', name: 'Packing Automation', screen: 'Packing Automation', icon: 'table-view', iconColor: 'rgb(194, 213, 52)' },
        ],
    },
    {
        title: 'I',
        data: [
            { id: '14', name: 'Inquiry', screen: 'Inquiry', icon: 'table-view', iconColor: 'rgb(194, 213, 52)' },
        ],
    },
    {
        title: 'R',
        data: [
            { id: '15', name: 'Payable', screen: 'Payable', icon: 'payment', iconColor: '#521313' },
        ],
    },
    {
        title: 'D',
        data: [
            { id: '16', name: 'Daily Collection Report', screen: 'Daily Collection Report', icon: 'collections-bookmark', iconColor: '#5B2CFF' },
        ],
    },
    // Only For Sudamo
    {
        title: 'T',
        data: [
            { id: '17', name: 'Taka Checking Entry', screen: 'Taka Checking Entry', icon: 'dynamic-form', iconColor: '#5B2CFF' },
        ],
    },
    {
        title: 'S',
        data: [
            { id: '18', name: 'Sales Order Tracking', screen: 'Sales Order Tracking', icon: 'track-changes', iconColor: '#DB945A' },
        ],
    },
    {
        title: 'Y',
        data: [
            { id: '19', name: 'Yarn Stock Verification', screen: 'Yarn Stock Verification', icon: 'check-circle', iconColor: '#008080' },
        ],
    },
    {
        title: 'C',
        data: [
            { id: '20', name: 'Checking Scanner', screen: 'Checking Scanner', icon: 'document-scanner', iconColor: '#4169E1' },
        ],
    },
    {
        title: 'P',
        data: [
            { id: '21', name: 'Purchase Order Tracking', screen: 'Purchase Order Tracking', icon: 'shopping-cart', iconColor: '#228B22' },
        ],
    },
    // {
    //     title: 'D',
    //     data: [
    //         { id: '22', name: 'Design Authorization', screen: 'Design Authorization', icon: 'edit', iconColor: '#4B0082' },
    //     ],
    // },
    // 
    {
        title: 'S',
        data: [
            { id: '23', name: 'Sales Analysis', screen: 'Sales Analysis', icon: 'bar-chart', iconColor: '#221080' },
        ],
    },
    {
        title: 'S',
        data: [
            { id: '24', name: 'Sales Order(Inactive)', screen: 'Sales Order(Inactive)', icon: 'bar-chart', iconColor: '#221080' },
        ],
    },
    // mob_sales_order_Inactive

];

interface Props {
    navigation: any;
    isConnected: boolean | null;
    username: string;
    token: string;
    getMenuApps: string;
    setMenuApps: (v: string) => void;
    setDecodedMenuApps: (v: any) => void;
}

const BACKGROUND_URI = '@mipmap/logo';

const HomeScreen: React.FC<Props> = ({ navigation, isConnected, username, getMenuApps, token, setMenuApps, setDecodedMenuApps }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedLetter, setSelectedLetter] = useState<string | null>(null);
    const [appSections, setAppSections] = useState(APP_SECTIONS);
    // 
    const [drawerVisible, setDrawerVisible] = useState(false);
    const [consoleLogs, setConsoleLogs] = useState<string[]>([]);
    // 
    const sectionListRef = useRef<SectionList>(null);
    const debouncedQuery = useDebounce(searchQuery, 300);
    const flatListRef = useRef<FlatList>(null);

    // CONSOLE

    // Original console.log ko override karke logs capture karna
    // useEffect(() => {
    //     const originalConsoleLog = console.log;
    //     console.log = (...args: any[]) => {
    //         originalConsoleLog(...args);
    //         setConsoleLogs(prev => [...prev, args.map(arg => typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)).join(' ')]);
    //     };
    //     return () => {
    //         console.log = originalConsoleLog;
    //     };
    // }, []);

    // Drawer toggle function
    const toggleDrawer = () => {
        setDrawerVisible(!drawerVisible);
    };

    // Clear console logs
    const clearConsole = () => {
        setConsoleLogs([]);
    };
    // Drawer UI
    const renderDrawer = () => (
        <Modal
            visible={drawerVisible}
            animationType="slide"
            transparent={false}
            onRequestClose={toggleDrawer}
        >
            <View style={styles.drawerContainer}>
                <View style={styles.drawerHeader}>
                    <Text style={styles.drawerTitle}>Console Logs</Text>
                    <TouchableOpacity onPress={toggleDrawer} style={styles.closeButton}>
                        <Icon name="close" size={24} color="#000" />
                    </TouchableOpacity>
                </View>
                <ScrollView style={styles.drawerContent}>
                    {consoleLogs.length === 0 ? (
                        <Text style={styles.noLogsText}>No logs yet</Text>
                    ) : (
                        consoleLogs.map((log, index) => (
                            <Text key={index} style={styles.logText}>{log}</Text>
                        ))
                    )}
                </ScrollView>
                <TouchableOpacity onPress={clearConsole} style={styles.clearButton}>
                    <Text style={styles.clearButtonText}>Clear Console</Text>
                </TouchableOpacity>
            </View>
        </Modal>
    );

    // HeaderBar mein drawer icon add karna
    const renderHeaderBar = () => (
        <View style={styles.headerContainer}>
            <TouchableOpacity onPress={toggleDrawer} style={styles.drawerIcon}>
                <Icon name="menu" size={24} color="#000" />
            </TouchableOpacity>
            <HeaderBar userName={username} onSearch={setSearchQuery} placeholder="Search apps..." />
        </View>
    );
    // CONSOLE


    const checkMenuApps = useCallback(async () => {
        try {
            const user_menu_apps = await AsyncStorage.getItem('user_menu_apps');
            setMenuApps(user_menu_apps || '');
        } catch (error) {
            console.log("Menu check error:", error);
        }
    }, [setMenuApps]);

    // useEffect(() => {
    //     if (!getMenuApps || getMenuApps === '') {
    //         checkMenuApps();
    //     } else {
    //         try {
    //             const decodedValue = atob(getMenuApps);
    //             const parsedValue = JSON.parse(decodedValue || '[]');

    //             const mobileApp = parsedValue.find((item: any) => item.pages && item.pages.some((page: any) => page.title === "Mobile App"));
    //             if (mobileApp) {
    //                 const mobileAppPage = mobileApp.pages.find((page: any) => page.title === "Mobile App");
    //                 if (mobileAppPage && mobileAppPage.children && mobileAppPage.children.length > 0) {
    //                     const allowedTitles = mobileAppPage.children.map((child: any) => child.title);
    //                     const newSections = APP_SECTIONS.map(section => {
    //                         const newData = section.data.filter(app => allowedTitles.includes(app.name));
    //                         return { ...section, data: newData };
    //                     }).filter(section => section.data.length > 0);
    //                     setAppSections(newSections);
    //                 } else {
    //                     setAppSections([]);
    //                 }
    //             } else {
    //                 setAppSections([]);
    //             }
    //         } catch (error) {
    //             console.log("Error:", error);
    //             setAppSections([]);
    //         }
    //     }
    // }, [checkMenuApps, getMenuApps]);
    useEffect(() => {
        if (!getMenuApps || getMenuApps === '') {
            checkMenuApps();
        } else {
            try {
                const decodedValue = atob(getMenuApps);
                const parsedValue = JSON.parse(decodedValue);
                // const parsedValue = [
                //     {
                //         "title": "",
                //         "pages": [
                //             {
                //                 "title": "Mobile App",
                //                 "href": "#",
                //                 "icon": "",
                //                 "children": [
                //                     {
                //                         "title": "Upload",
                //                         "href": "/"
                //                     },
                //                     {
                //                         "title": "Credit Limit Request",
                //                         "href": "/"
                //                     },
                //                     {
                //                         "title": "Sudamo Production Order",
                //                         "href": "/"
                //                     },
                //                     {
                //                         "title": "Yarn Purchase Order",
                //                         "href": "/"
                //                     },
                //                     {
                //                         "title": "Collection",
                //                         "href": "/"
                //                     },
                //                     {
                //                         "title": "New Account Request",
                //                         "href": "/"
                //                     },
                //                     {
                //                         "title": "Sales Order",
                //                         "href": "/"
                //                     },
                //                     {
                //                         "title": "Grey Purchase Order",
                //                         "href": "/"
                //                     },
                //                     {
                //                         "title": "Production Order Tracking",
                //                         "href": "/"
                //                     },
                //                     {
                //                         "title": "Monthly Expense Report",
                //                         "href": "/"
                //                     },
                //                     {
                //                         "title": "Inquiry",
                //                         "href": "/"
                //                     },
                //                     {
                //                         "title": "Checking Scanner",
                //                         "href": "/"
                //                     },
                //                     {
                //                         "title": "Yarn Stock Verification",
                //                         "href": "/"
                //                     },
                //                     {
                //                         "title": "Sales Order(Inactive)",
                //                         "href": "/"
                //                     },
                //                 ]
                //             }   
                //         ]
                //     }
                // ];
                console.log('Decoded getMenuApps:', parsedValue);
                setDecodedMenuApps(parsedValue);

                const mobileApp = parsedValue.find((item: any) => item.pages && item.pages.some((page: any) => page.title === "Mobile App"));
                if (mobileApp) {
                    const mobileAppPage = mobileApp.pages.find((page: any) => page.title === "Mobile App");
                    if (mobileAppPage && mobileAppPage.children && mobileAppPage.children.length > 0) {
                        console.log('Mobile App Title:', mobileAppPage.title);
                        console.log('Children Titles:');
                        mobileAppPage.children.forEach((child: any) => {
                            console.log('-', child.title);
                        });

                        // Extract children titles
                        const allowedTitles = mobileAppPage.children.map((child: any) => child.title);

                        // Filter APP_SECTIONS to only include apps whose name is in allowedTitles
                        const newSections = APP_SECTIONS.map(section => {
                            const newData = section.data.filter(app =>
                                allowedTitles.includes(app.name)
                            );
                            return { ...section, data: newData };
                        }).filter(section => section.data.length > 0);

                        setAppSections(newSections);
                    } else {
                        // If no children, set appSections to empty
                        setAppSections([]);
                    }
                } else {
                    // If no Mobile App page found, set appSections to empty
                    setAppSections([]);
                }
            } catch (error) {
                console.log("Error:", error);
                setAppSections([]); // Fallback to empty if error
            }
        }
    }, [checkMenuApps, getMenuApps]);


    const appsAlphabet = [...appSections].sort((a: any, b: any) => a.title.localeCompare(b.title));

    const filteredSections = appsAlphabet
        .map((section) => ({
            ...section,
            data: section.data.filter((app) =>
                app.name.toLowerCase().includes(debouncedQuery.toLowerCase())
            ),
        }))
        .filter((section) => section.data.length > 0);

    const scrollToSection = (letter: string) => {
        const sectionIndex = filteredSections.findIndex((section) => section.title === letter);
        if (sectionIndex !== -1) {
            sectionListRef.current?.scrollToLocation({
                sectionIndex,
                itemIndex: 0,
                animated: true,
            });
            setSelectedLetter(letter);
            setTimeout(() => setSelectedLetter(null), 900);
        }
    };

    // Build flat list of apps (sorted by name) and an index map for letters -> first index
    const flatApps = useMemo(() => {
        const apps = appSections.flatMap(s => s.data);
        apps.sort((a: any, b: any) => a.name.localeCompare(b.name));
        return apps;
    }, [appSections]);

    const letterIndexMap = useMemo(() => {
        const map: Record<string, number> = {};
        flatApps.forEach((app, idx) => {
            const letter = (app.name || ' ').charAt(0).toUpperCase();
            if (!map[letter]) map[letter] = idx;
        });
        return map;
    }, [flatApps]);

    // When search/filter changes, we still want a filtered flat apps array
    const filteredFlatApps = useMemo(() => {
        return flatApps.filter(a => a.name.toLowerCase().includes(debouncedQuery.toLowerCase()));
    }, [flatApps, debouncedQuery]);

    // Scroll to item index for a letter (alphabet sidebar)
    const scrollToLetter = (letter: string) => {
        // if there's a search active, compute from filteredFlatApps
        if (debouncedQuery && debouncedQuery.length > 0) {
            const idx = filteredFlatApps.findIndex(a => a.name.charAt(0).toUpperCase() === letter);
            if (idx !== -1) {
                try { flatListRef.current?.scrollToIndex({ index: idx, animated: true, viewPosition: 0 }); } catch (e) { }
                setSelectedLetter(letter); setTimeout(() => setSelectedLetter(null), 800);
            }
            return;
        }

        const idx = letterIndexMap[letter];
        if (idx !== undefined) {
            try {
                flatListRef.current?.scrollToIndex({ index: idx, animated: true, viewPosition: 0 });
                setSelectedLetter(letter);
                setTimeout(() => setSelectedLetter(null), 800);
            } catch (e) {
                // fallback: scroll to offset approx
                try {
                    const row = Math.floor(idx / NUM_COLUMNS);
                    const approxOffset = row * 140; // approx row height
                    flatListRef.current?.scrollToOffset({ offset: approxOffset, animated: true });
                    setSelectedLetter(letter);
                    setTimeout(() => setSelectedLetter(null), 800);
                } catch { }
            }
        }
    };

    // RENDER: professional tile — no "Tap to open" subtitle, name allowed to wrap but minimize lines.
    const renderAppItem = ({ item, index }: { item: any; index: number }) => {
        const disabled = !isConnected;
        const bg = hexToRgba(item.iconColor || theme.BRAND_PRIMARY, 0.12);
        const circleBg = item.iconColor || theme.BRAND_PRIMARY;

        return (
            <TouchableOpacity
                style={[styles.appCard, { width: APP_BUTTON_WIDTH, marginRight: GAP }]}
                // onPress={() => navigation.navigate(item.screen)}
                onPress={async () => {
                    if (item.name === 'Sales Order Tracking') {
                        await AsyncStorage.removeItem('sales_order_tracking_recently_viewed');
                        await AsyncStorage.removeItem('sales_order_tracking_confirm_action');
                        await AsyncStorage.removeItem('sales_order_tracking_card_press_');
                        // await AsyncStorage.removeItem('sales_order_tracking_recently_viewed');
                    }
                    navigation.navigate(item.screen);
                }}
                disabled={disabled}
                activeOpacity={0.85}
                accessibilityLabel={`Open ${item.name}`}
            >
                <View style={[styles.iconWrap, { backgroundColor: bg }]}>
                    <View style={[styles.iconCircle, { backgroundColor: circleBg }]}>
                        <Icon name={item.icon} size={20} color="#fff" />
                    </View>
                </View>

                <Text style={styles.appTitle} numberOfLines={2} ellipsizeMode="tail">
                    {item.name}
                </Text>

                {disabled && <View style={styles.disabledOverlay} pointerEvents="none" />}
            </TouchableOpacity>
        );
    };


    const renderSection = ({ section }: { section: any }) => (
        <View style={styles.sectionContainer}>
            <Text style={styles.sectionHeader}>{section.title}</Text>
            <FlatList
                data={section.data}
                renderItem={renderAppItem}
                keyExtractor={(item) => item.id}
                numColumns={NUM_COLUMNS}
                contentContainerStyle={styles.gridContainer}
                scrollEnabled={false}
            />
        </View>
    );
    const keyExtractor = (item: any) => item.id;

    return (
        <SafeAreaView style={styles.safe}>
            <ImageBackground
                source={{ uri: BACKGROUND_URI }}
                style={styles.background}
                blurRadius={Platform.OS === 'android' ? 8.5 : 40} // android blur lower for perf
                resizeMode="center"
            >
                {/* dim overlay to make icons pop */}
                <View style={styles.overlay} />
                {/*  */}
                {/* {renderHeaderBar()} */}
                {/* For live console */}
                {/* <TouchableOpacity onPress={toggleDrawer} style={styles.drawerIcon}>
                    <Icon name="menu" size={24} color="#fff" />
                </TouchableOpacity>
                {renderDrawer()} */}
                {/* For live console */}
                {/*  */}

                <HeaderBar userName={username} onSearch={setSearchQuery} placeholder="Search apps..." />

                <View style={styles.container}>
                    {filteredFlatApps.length === 0 ? (
                        <View style={styles.noAppsContainer}>
                            <Text style={styles.noAppsText}>No apps available</Text>
                            <Text style={styles.noAppsSubtext}>Contact administrator for access.</Text>
                        </View>
                    ) : (
                        <>
                            <FlatList
                                ref={flatListRef}
                                data={filteredFlatApps}
                                keyExtractor={keyExtractor}
                                renderItem={renderAppItem}
                                numColumns={NUM_COLUMNS}
                                contentContainerStyle={styles.listContainer}
                                showsVerticalScrollIndicator={false}
                                getItemLayout={(_, index) => {
                                    // approximate item layout to help scrollToIndex
                                    const row = Math.floor(index / NUM_COLUMNS);
                                    const itemHeight = 140; // tweak if you change styles
                                    return { length: itemHeight, offset: row * itemHeight, index };
                                }}
                            />

                            {/* <ScrollView
                                style={styles.alphabetSidebar}
                                contentContainerStyle={styles.alphabetContainer}
                                showsVerticalScrollIndicator={false}
                            >
                                {ALPHABET.map((letter) => (
                                    <TouchableOpacity
                                        key={letter}
                                        onPress={() => scrollToLetter(letter)}
                                        style={[styles.alphabetItem, selectedLetter === letter && styles.selectedAlphabetItem]}
                                        accessibilityLabel={`Jump to ${letter}`}
                                    >
                                        <Text style={[styles.alphabetText, selectedLetter === letter && styles.selectedAlphabetText]}>{letter}</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView> */}
                            {/* Right-side alphabet pill (floating panel) */}
                            <View style={styles.alphabetPanel}>
                                <View style={styles.alphabetPill} pointerEvents="box-none">
                                    <ScrollView
                                        contentContainerStyle={styles.alphabetContainer}
                                        showsVerticalScrollIndicator={false}
                                        keyboardShouldPersistTaps="handled"
                                    >
                                        {ALPHABET.map((letter) => (
                                            <TouchableOpacity
                                                key={letter}
                                                onPress={() => scrollToLetter(letter)}
                                                style={[styles.alphabetItem, selectedLetter === letter && styles.selectedAlphabetItem]}
                                                accessibilityLabel={`Jump to ${letter}`}
                                                activeOpacity={0.8}
                                            >
                                                <Text style={[styles.alphabetText, selectedLetter === letter && styles.selectedAlphabetText]}>
                                                    {letter}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                </View>
                            </View>


                        </>
                    )}
                </View>
            </ImageBackground>

        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.NEUTRAL_BG },
    background: { flex: 1 },
    overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgb(255, 255, 255)' },

    container: { flex: 1, position: 'relative', paddingHorizontal: 16, paddingBottom: 96 },
    listContainer: { paddingTop: 12, paddingBottom: 28, paddingRight: 8, alignItems: 'flex-start' },
    alphabetPanel: {
        position: 'absolute',
        right: -5, // small gap from edge for safe area
        top: 100, // keep below header
        bottom: 120, // keep above footer
        width: 56,
        zIndex: 50,
        alignItems: 'flex-end',
        paddingRight: 6,
    },

    alphabetPill: {
        width: 20,
        borderRadius: 28,
        paddingVertical: 8,
        // subtle translucent surface so the alphabet stands out over wallpaper
        backgroundColor: 'rgb(255, 255, 255)',
        // subtle border to separate from background
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.06)',
        // shadow to lift the pill above wallpaper
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
        elevation: 6,
        // alignItems: 'center',
    },

    alphabetContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 4,
    },

    alphabetItem: {
        paddingVertical: 6,
        width: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginVertical: 2,
        borderRadius: 14,
    },

    alphabetText: {
        color: theme.MUTED,
        fontSize: 12,
        fontWeight: '700',
    },

    selectedAlphabetItem: {
        backgroundColor: theme.BRAND_ACCENT || '#00B4A2',
        width: 36,
        height: 28,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },

    selectedAlphabetText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '800',
    },

    appCard: {
        alignItems: 'center',
        marginBottom: 18,
        backgroundColor: 'transparent',
        borderRadius: 10,
        paddingVertical: 6,
        paddingHorizontal: 4,
        minHeight: 106,
        justifyContent: 'flex-start',
    },
    iconWrap: { marginBottom: 6, width: 64, height: 64, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
    iconCircle: { width: 48, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    appTitle: { color: theme.TEXT_SECONDARY, fontSize: 10, textAlign: 'center', paddingHorizontal: 6, lineHeight: 16 },

    disabledOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: 12 },

    // alphabet
    alphabetSidebar: { position: 'absolute', right: 8, top: 120, bottom: 120, width: 36, zIndex: 40 },
    // alphabetContainer: { justifyContent: 'center', alignItems: 'center' },
    // alphabetItem: { paddingVertical: 4, width: 32, justifyContent: 'center', alignItems: 'center', marginVertical: 2 },
    // alphabetText: { color: '#B58EDC', fontSize: 12, fontWeight: '700' },
    // selectedAlphabetItem: { backgroundColor: '#6A0DAD', borderRadius: 14, width: 32, alignItems: 'center', paddingVertical: 3 },
    // selectedAlphabetText: { color: '#fff', fontSize: 12, fontWeight: '800' },

    noAppsContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
    noAppsText: { color: theme.BRAND_DARK, fontSize: 18, fontWeight: '700', marginBottom: 8 },
    noAppsSubtext: { color: theme.MUTED, fontSize: 14, textAlign: 'center' },
    screen: { flex: 1, backgroundColor: theme.NEUTRAL_BG },
    // container: { flex: 1, position: 'relative', paddingBottom: 96 },
    // listContainer: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 20 },
    sectionContainer: { marginBottom: 22 },
    gridContainer: { justifyContent: 'flex-start' },
    // NOTE: removed solid white card surface to achieve cleaner flat look per request.
    // appCard: {
    //     alignItems: 'center',
    //     marginBottom: 16,
    //     backgroundColor: 'transparent', // removed white card surface
    //     borderRadius: 12,
    //     paddingVertical: 6,
    //     paddingHorizontal: 4,
    //     minHeight: 98,
    //     justifyContent: 'flex-start',
    // },
    // iconWrap: { marginBottom: 6, width: 60, height: 60, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
    // iconCircle: { width: 46, height: 46, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },

    // Make app name visible — allow wrapping but try to keep compact
    // appTitle: {
    //     color: theme.TEXT_PRIMARY,
    //     fontSize: 12,
    //     // fontWeight: '700',
    //     textAlign: 'center',
    //     paddingHorizontal: 6,
    //     marginTop: 6,
    //     lineHeight: 16,
    // },

    // disabledOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: 12 },

    sectionHeader: { color: theme.BRAND_DARK, fontSize: 15, fontWeight: '700', paddingHorizontal: 6, paddingVertical: 6 },

    // alphabetSidebar: { position: 'absolute', right: 8, top: 110, bottom: 110, width: 36, zIndex: 20 },
    // alphabetContainer: { justifyContent: 'center', alignItems: 'center' },
    // alphabetItem: { paddingVertical: 4, width: 32, justifyContent: 'center', alignItems: 'center', marginVertical: 2 },
    // alphabetText: { color: '#6A0DAD', fontSize: 12, fontWeight: '700' },
    // selectedAlphabetItem: { backgroundColor: '#6A0DAD', borderRadius: 14, width: 32, alignItems: 'center', paddingVertical: 3 },
    // selectedAlphabetText: { color: '#fff', fontSize: 12, fontWeight: '800' },

    // noAppsContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
    // noAppsText: { color: theme.BRAND_DARK, fontSize: 18, fontWeight: '700', marginBottom: 8 },
    // noAppsSubtext: { color: theme.MUTED, fontSize: 14, textAlign: 'center' },
    // 
    drawerContainer: {
        flex: 1,
        backgroundColor: '#fff',
        padding: 16,
    },
    drawerHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    drawerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    closeButton: {
        padding: 8,
    },
    drawerContent: {
        flex: 1,
    },
    noLogsText: {
        textAlign: 'center',
        marginTop: 20,
        color: '#999',
    },
    logText: {
        fontFamily: 'monospace',
        fontSize: 12,
        marginBottom: 8,
        color: '#333',
    },
    clearButton: {
        backgroundColor: '#ff4444',
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 16,
    },
    clearButtonText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    headerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
    },
    drawerIcon: {
        padding: 8,
        // marginRight: 8,
        position: 'absolute',
        top: 200,
        left: 2,
        zIndex: 100,
        backgroundColor: '#000',
        color: '#fff',

    },
});

export default HomeScreen;
