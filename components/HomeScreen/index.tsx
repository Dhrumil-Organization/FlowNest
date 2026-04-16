import Header from '@/components/Header';
import Icon from '@expo/vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    Dimensions,
    FlatList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

const { width } = Dimensions.get('window');
const NUM_COLUMNS = Math.max(3, Math.floor(width / 120));
const ITEM_SIZE = (width - 40) / NUM_COLUMNS;
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

interface Props {
    username?: string;
}

// export default function HomeScreen() {
const HomeScreen: React.FC<Props> = ({ username }) => {
    //   const { username } = useAuth();
    const [search, setSearch] = useState('');
    const [apps, setApps] = useState<any[]>([]);
    const [selectedLetter, setSelectedLetter] = useState('');
    const flatListRef = useRef<FlatList>(null);
    const router = useRouter();
    const [prp, setPrp] = useState<string | null>(null);

    useEffect(() => {
        const load = async () => {
            const prp = await AsyncStorage.getItem("selected_property");
            setPrp(prp); // No need for type assertion if using `string | null`
        };
        load();
    }, []);

    console.log("prp in Home:", prp);

    const ALL_APPS = [
        { name: 'Credit Limit Request', route: 'credit-limit', icon: 'credit-score', color: '#4285F4' },
        {
            name: 'Receivables',
            icon: 'receipt-long',
            route: prp === "sudamo_knits" ? 'receivables-sudamo' : 'receivables',
            color: '#773F3F'
        },
        { name: 'Collection', icon: 'currency-rupee', route: 'collection', color: '#6bd35d' },
        { name: 'Upload', icon: 'upload', route: 'upload', color: '#2E2E2E' },
        { name: 'Sudamo Production Order', icon: 'production-quantity-limits', route: 'sudamo-production-order', color: '#F2D43D' },
        { name: 'Yarn Purchase Order', icon: 'attach-money', route: 'yarn-purchase-order', color: '#1F7006' },
        // { name: 'Grey Purchase Order', icon: 'payments', route: 'grey-purchase-order', color: '#3BAD18' },
        { name: 'Sales Order', icon: 'point-of-sale', route: 'sales-order', color: '#20BEC1' },
        { name: 'Production Order Tracking', icon: 'track-changes', route: 'production-order-tracking', color: '#CE9F78' },
        { name: 'New Account Request', icon: 'account-balance', route: 'new-account-request', color: '#E982F6' },
        { name: 'Monthly Expense Report', icon: 'table-chart', route: 'monthly-expense-report', color: '#D35400' },
        { name: 'Snap View', icon: 'table-view', route: 'snap-view', color: '#ABC00B' },
        { name: 'Packing Automation', icon: 'receipt-long', route: 'packing-automation', color: 'rgb(194, 213, 52)' },
        { name: 'Inquiry', icon: 'table-view', route: 'inquiry', color: 'rgb(194, 213, 52)' },
        { name: 'Payable', icon: 'payment', route: 'payable', color: '#521313' },
        { name: 'Daily Collection Report', icon: 'collections-bookmark', route: 'daily-collection-report', color: '#5B2CFF' },
        { name: 'Taka Checking Entry', icon: 'dynamic-form', route: 'taka-checking-entry', color: '#5B2CFF' },
        { name: 'Sales Order Tracking', icon: 'track-changes', route: 'sales-order-tracking', color: '#DB945A' },
        { name: 'Yarn Stock Verification', icon: 'check-circle', route: 'yarn-stock-verification', color: '#008080' },
        { name: 'Checking Scanner', icon: 'document-scanner', route: 'checking-scanner', color: '#4169E1' },
        { name: 'Purchase Order Tracking', icon: 'shopping-cart', route: 'purchase-order-tracking', color: '#228B22' },
        { name: 'Sales Analysis', icon: 'bar-chart', route: 'sales-analysis', color: '#221080' },
        { name: 'Sales Order(Inactive)', icon: 'bar-chart', route: 'sales order-inactive', color: '#221080' },
        { name: 'Item Authorization', icon: 'gite', route: 'item-authorization', color: '#221080' },
        { name: 'Process complete auth.', icon: 'autorenew', route: 'process-complete-auth', color: '#dd5c98' },
        { name: 'Febric Stock', icon: 'autorenew', route: 'febric-stock', color: '#dd5c98' },
        { name: 'Daily Payment Report', icon: 'payments', route: 'daily-payment-report', color: '#ff2ced' },
    ];

    // 🔥 LOAD MENU APPS FROM CACHE
    useEffect(() => {
        if (prp) {
            const loadApps = async () => {
                try {
                    const data = await AsyncStorage.getItem('user_menu_apps');

                    if (!data) return;

                    const decoded = atob(data);
                    const parsed = JSON.parse(decoded);
                    console.log("APP Access:", JSON.stringify(parsed));
                    await AsyncStorage.setItem(
                        'rightsMenuApps',
                        JSON.stringify(parsed)
                    );
                    // await AsyncStorage.setItem('access_token', token);
                    // const parsed = [
                    //     {
                    //         "title": "",
                    //         "pages": [
                    //             {
                    //                 "title": "Mobile App",
                    //                 "href": "#",
                    //                 "icon": "",
                    //                 "children": [
                    //                     {
                    //                         "title": "Credit Limit Request",
                    //                         "href": "/"
                    //                     },
                    //                     {
                    //                         "title": "Receivables",
                    //                         "href": "/"
                    //                     },
                    //                 ]
                    //             }
                    //         ]
                    //     }
                    // ];

                    const mobileApp = parsed.find((item: any) =>
                        item.pages?.some((p: any) => p.title === 'Mobile App')
                    );

                    const children = mobileApp?.pages?.find(
                        (p: any) => p.title === 'Mobile App'
                    )?.children || [];

                    const allowedNames = children.map((c: any) => c.title);

                    const filteredApps = ALL_APPS.filter(app =>
                        allowedNames.includes(app.name)
                    );

                    // 🔥 SORT A-Z
                    filteredApps.sort((a, b) => a.name.localeCompare(b.name));

                    setApps(filteredApps);

                } catch (e) {
                    console.log("❌ MENU ERROR", e);
                }
            };

            loadApps();
        }
    }, [prp]);

    // 🔥 SEARCH FILTER
    const filteredApps = useMemo(() => {
        return apps.filter(a =>
            a.name.toLowerCase().includes(search.toLowerCase())
        );
    }, [apps, search]);

    // 🔥 ALPHABET SCROLL
    const scrollToLetter = (letter: string) => {
        const index = filteredApps.findIndex(a =>
            a.name.startsWith(letter)
        );

        if (index !== -1) {
            flatListRef.current?.scrollToIndex({ index, animated: true });
            setSelectedLetter(letter);
            setTimeout(() => setSelectedLetter(''), 800);
        }
    };

    return (
        <View style={{ flex: 1 }}>

            <Header userName={username} onSearch={setSearch} />

            <FlatList
                ref={flatListRef}
                data={filteredApps}
                numColumns={NUM_COLUMNS}
                key={NUM_COLUMNS} // 🔥 important for rerender
                keyExtractor={(item) => item.name}
                contentContainerStyle={{
                    padding: 10,
                    paddingBottom: 120,
                    alignItems: 'flex-start' // 🔥 no stretch
                }}
                renderItem={({ item }) => (
                    <TouchableOpacity
                        style={[styles.card, { width: ITEM_SIZE }]}
                        onPress={() =>
                            router.replace(`${item.route}`)
                        }
                    >
                        <View style={[styles.icon, { backgroundColor: item.color }]}>
                            <Icon name={item.icon} size={22} color="#fff" />
                        </View>
                        <Text style={styles.text}>{item.name}</Text>
                    </TouchableOpacity>
                )}
            />

            {/* 🔥 RIGHT SIDE ALPHABET */}
            <View style={styles.alphabet}>
                {ALPHABET.map(letter => (
                    <TouchableOpacity key={letter} onPress={() => scrollToLetter(letter)}>
                        <Text style={[
                            styles.alphaText,
                            selectedLetter === letter && { color: 'blue' }
                        ]}>
                            {letter}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        margin: 6,
        alignItems: 'center',
    },
    icon: {
        width: 55,
        height: 55,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center'
    },
    text: {
        marginTop: 6,
        fontSize: 12,
        textAlign: 'center'
    },
    alphabet: {
        position: 'absolute',
        right: 5,
        top: 100,
        bottom: 100,
        justifyContent: 'center'
    },
    alphaText: {
        fontSize: 10,
        padding: 2
    }
});

export default HomeScreen;