/////// [1] /////////
// import Header from '@/components/Header';
// import Icon from '@expo/vector-icons/MaterialIcons';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import { useRouter } from 'expo-router';
// import React, { useEffect, useMemo, useRef, useState } from 'react';
// import {
//     Dimensions,
//     FlatList,
//     StyleSheet,
//     Text,
//     TouchableOpacity,
//     View
// } from 'react-native';

// const { width } = Dimensions.get('window');
// const NUM_COLUMNS = Math.max(3, Math.floor(width / 120));
// const ITEM_SIZE = (width - 40) / NUM_COLUMNS;
// const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

// interface Props {
//     username?: string;
// }

// // export default function HomeScreen() {
// const HomeScreen: React.FC<Props> = ({ username }) => {
//     //   const { username } = useAuth();
//     const [search, setSearch] = useState('');
//     const [apps, setApps] = useState<any[]>([]);
//     const [selectedLetter, setSelectedLetter] = useState('');
//     const flatListRef = useRef<FlatList>(null);
//     const router = useRouter();
//     const [prp, setPrp] = useState<string | null>(null);

//     useEffect(() => {
//         const load = async () => {
//             const prp = await AsyncStorage.getItem("selected_property");
//             setPrp(prp); // No need for type assertion if using `string | null`
//         };
//         load();
//     }, []);

//     console.log("prp in Home:", prp);

//     const ALL_APPS = [
//         { name: 'Credit Limit Request', route: 'credit-limit', icon: 'credit-score', color: '#4285F4' },
//         {
//             name: 'Receivables',
//             icon: 'receipt-long',
//             route: prp === "sudamo_knits" ? 'receivables-sudamo' : 'receivables',
//             color: '#773F3F'
//         },
//         { name: 'Collection', icon: 'currency-rupee', route: 'Collection', color: '#6bd35d' },
//         // { name: 'Upload', icon: 'upload', route: 'upload', color: '#2E2E2E' },
//         // { name: 'Sudamo Production Order', icon: 'production-quantity-limits', route: 'sudamo-production-order', color: '#F2D43D' },
//         { name: 'Yarn Purchase Order', icon: 'attach-money', route: 'yarn-purchase-order', color: '#1F7006' },
//         // { name: 'Grey Purchase Order', icon: 'payments', route: 'grey-purchase-order', color: '#3BAD18' },
//         // { name: 'Sales Order', icon: 'point-of-sale', route: 'sales-order', color: '#20BEC1' },
//         { name: 'Production Order Tracking', icon: 'track-changes', route: 'production-order-tracking', color: '#CE9F78' },
//         // { name: 'New Account Request', icon: 'account-balance', route: 'new-account-request', color: '#E982F6' },
//         { name: 'Monthly Expense Report', icon: 'table-chart', route: 'monthly-expense-report', color: '#D35400' },
//         { name: 'Snap View', icon: 'table-view', route: 'snap-view', color: '#ABC00B' },
//         // { name: 'Packing Automation', icon: 'receipt-long', route: 'packing-automation', color: 'rgb(194, 213, 52)' },
//         // { name: 'Inquiry', icon: 'table-view', route: 'inquiry', color: 'rgb(194, 213, 52)' },
//         { name: 'Payable', icon: 'payment', route: 'payable', color: '#521313' },
//         { name: 'Daily Collection Report', icon: 'collections-bookmark', route: 'daily-collection-report', color: '#5B2CFF' },
//         // { name: 'Taka Checking Entry', icon: 'dynamic-form', route: 'taka-checking-entry', color: '#5B2CFF' },
//         { name: 'Sales Order Tracking', icon: 'track-changes', route: 'sales-order-tracking', color: '#DB945A' },
//         // { name: 'Yarn Stock Verification', icon: 'check-circle', route: 'yarn-stock-verification', color: '#008080' },
//         // { name: 'Checking Scanner', icon: 'document-scanner', route: 'checking-scanner', color: '#4169E1' },
//         // { name: 'Purchase Order Tracking', icon: 'shopping-cart', route: 'purchase-order-tracking', color: '#228B22' },
//         { name: 'Sales Analysis', icon: 'bar-chart', route: 'sales-analysis', color: '#221080' },
//         // { name: 'Sales Order(Inactive)', icon: 'bar-chart', route: 'sales order-inactive', color: '#221080' },
//         // { name: 'Item Authorization', icon: 'gite', route: 'item-authorization', color: '#221080' },
//         // { name: 'ProcesFs complete auth.', icon: 'autorenew', route: 'process-complete-auth', color: '#dd5c98' },
//         // { name: 'Febric Stock', icon: 'autorenew', route: 'febric-stock', color: '#dd5c98' },
//         { name: 'Daily Payment Report', icon: 'payments', route: 'daily-payment-report', color: '#ff2ced' },
//     ];

//     // 🔥 LOAD MENU APPS FROM CACHE
//     useEffect(() => {
//         if (prp) {
//             const loadApps = async () => {
//                 try {
//                     const data = await AsyncStorage.getItem('user_menu_apps');

//                     if (!data) return;

//                     const decoded = atob(data);
//                     const parsed = JSON.parse(decoded);

//                     // const parsed = [
//                     //     {
//                     //         "title": "",
//                     //         "pages": [
//                     //             {
//                     //                 "title": "Mobile App",
//                     //                 "href": "#",
//                     //                 "icon": "",
//                     //                 "children": [
//                     //                     {
//                     //                         "title": "Upload",
//                     //                         "href": "/"
//                     //                     },
//                     //                     {
//                     //                         "title": "Credit Limit Request",
//                     //                         "href": "/"
//                     //                     },
//                     //                     {
//                     //                         "title": "Sudamo Production Order",
//                     //                         "href": "/"
//                     //                     },
//                     //                     {
//                     //                         "title": "Purchase Order",
//                     //                         "href": "/"
//                     //                     },
//                     //                     {
//                     //                         "title": "Collection",
//                     //                         "href": "/"
//                     //                     },
//                     //                     {
//                     //                         "title": "New Account Request",
//                     //                         "href": "/"
//                     //                     },
//                     //                     {
//                     //                         "title": "Sales Order",
//                     //                         "href": "/"
//                     //                     },
//                     //                     {
//                     //                         "title": "Grey Purchase Order",
//                     //                         "href": "/"
//                     //                     },
//                     //                     {
//                     //                         "title": "Production Order Tracking",
//                     //                         "href": "/"
//                     //                     },
//                     //                     {
//                     //                         "title": "Monthly Expense Report",
//                     //                         "href": "/"
//                     //                     },
//                     //                     {
//                     //                         "title": "Inquiry",
//                     //                         "href": "/"
//                     //                     },
//                     //                     {
//                     //                         "title": "Checking Scanner",
//                     //                         "href": "/"
//                     //                     },
//                     //                     {
//                     //                         "title": "Yarn Stock Verification",
//                     //                         "href": "/"
//                     //                     },
//                     //                     {
//                     //                         "title": "Daily Collection Report",
//                     //                         "href": "/"
//                     //                     },
//                     //                     {
//                     //                         "title": "Sales Order(Inactive)",
//                     //                         "href": "/"
//                     //                     },
//                     //                     {
//                     //                         "title": "Item Authorization",
//                     //                         "href": "/"
//                     //                     },
//                     //                     {
//                     //                         "title": "Process complete auth.",
//                     //                         "href": "/"
//                     //                     },
//                     //                     {
//                     //                         "title": "Febric Stock",
//                     //                         "href": "/"
//                     //                     },
//                     //                     {
//                     //                         "title": "Daily Collection Report",
//                     //                         "href": "/"
//                     //                     },
//                     //                     {
//                     //                         "title": "Daily Payment Report",
//                     //                         "href": "/"
//                     //                     },
//                     //                     {

//                     //                         "title": "Purchase Order Tracking",
//                     //                         "href": "/"
//                     //                     },
//                     //                     {
//                     //                         "title": "Sales Order Tracking",
//                     //                         "href": "/"
//                     //                     },
//                     //                     {
//                     //                         "title": "Beam Close",
//                     //                         "href": "/"
//                     //                     },
//                     //                     {
//                     //                         "title": "Creel Management System",
//                     //                         "href": "/"
//                     //                     },
//                     //                     {
//                     //                         "title": "Yarn Stock",
//                     //                         "href": "/"
//                     //                     },
//                     //                     {
//                     //                         "title": "Beam Gaiting",
//                     //                         "href": "/"
//                     //                     },
//                     //                     {
//                     //                         "title": "Taka Checking Entry",
//                     //                         "href": "/"
//                     //                     },
//                     //                     {
//                     //                         "title": "Yarn Management System",
//                     //                         "href": "/"
//                     //                     },
//                     //                     {
//                     //                         "title": "Party Dashboard",
//                     //                         "href": "/"
//                     //                     },
//                     //                     {

//                     //                         "title": "Weft Issue",
//                     //                         "href": "/"
//                     //                     },

//                     //                 ]
//                     //             }
//                     //         ]
//                     //     }
//                     // ];
//                     console.log("APP Access:", JSON.stringify(parsed));
//                     await AsyncStorage.setItem(
//                         'rightsMenuApps',
//                         JSON.stringify(parsed)
//                     );

//                     const mobileApp = parsed.find((item: any) =>
//                         item.pages?.some((p: any) => p.title === 'Mobile App')
//                     );

//                     const children = mobileApp?.pages?.find(
//                         (p: any) => p.title === 'Mobile App'
//                     )?.children || [];

//                     const allowedNames = children.map((c: any) => c.title);

//                     const filteredApps = ALL_APPS.filter(app =>
//                         allowedNames.includes(app.name)
//                     );

//                     // 🔥 SORT A-Z
//                     filteredApps.sort((a, b) => a.name.localeCompare(b.name));

//                     setApps(filteredApps);

//                 } catch (e) {
//                     console.log("❌ MENU ERROR", e);
//                 }
//             };

//             loadApps();
//         }
//     }, [prp]);

//     // 🔥 SEARCH FILTER
//     const filteredApps = useMemo(() => {
//         return apps.filter(a =>
//             a.name.toLowerCase().includes(search.toLowerCase())
//         );
//     }, [apps, search]);

//     // 🔥 ALPHABET SCROLL
//     const scrollToLetter = (letter: string) => {
//         const index = filteredApps.findIndex(a =>
//             a.name.startsWith(letter)
//         );

//         if (index !== -1) {
//             flatListRef.current?.scrollToIndex({ index, animated: true });
//             setSelectedLetter(letter);
//             setTimeout(() => setSelectedLetter(''), 800);
//         }
//     };

//     return (
//         <View style={{ flex: 1 }}>

//             <Header userName={username} onSearch={setSearch} />

//             <FlatList
//                 ref={flatListRef}
//                 data={filteredApps}
//                 numColumns={NUM_COLUMNS}
//                 key={NUM_COLUMNS} // 🔥 important for rerender
//                 keyExtractor={(item) => item.name}
//                 contentContainerStyle={{
//                     padding: 10,
//                     paddingBottom: 120,
//                     alignItems: 'flex-start' // 🔥 no stretch
//                 }}
//                 renderItem={({ item }) => (
//                     <TouchableOpacity
//                         style={[styles.card, { width: ITEM_SIZE }]}
//                         onPress={() =>
//                             router.replace(`${item.route}`)
//                         }
//                     >
//                         <View style={[styles.icon, { backgroundColor: item.color }]}>
//                             <Icon name={item.icon} size={22} color="#fff" />
//                         </View>
//                         <Text style={styles.text}>{item.name}</Text>
//                     </TouchableOpacity>
//                 )}
//             />

//             {/* 🔥 RIGHT SIDE ALPHABET */}
//             {/* <View style={styles.alphabet}>
//                 {ALPHABET.map(letter => (
//                     <TouchableOpacity key={letter} onPress={() => scrollToLetter(letter)}>
//                         <Text style={[
//                             styles.alphaText,
//                             selectedLetter === letter && { color: 'blue' }
//                         ]}>
//                             {letter}
//                         </Text>
//                     </TouchableOpacity>
//                 ))}
//             </View> */}

//         </View>
//     );
// }

// const styles = StyleSheet.create({
//     card: {
//         margin: 6,
//         alignItems: 'center',
//     },
//     icon: {
//         width: 55,
//         height: 55,
//         borderRadius: 12,
//         justifyContent: 'center',
//         alignItems: 'center'
//     },
//     text: {
//         marginTop: 6,
//         fontSize: 12,
//         textAlign: 'center'
//     },
//     alphabet: {
//         position: 'absolute',
//         right: 5,
//         top: 100,
//         bottom: 100,
//         justifyContent: 'center'
//     },
//     alphaText: {
//         fontSize: 10,
//         padding: 2
//     }
// });

// export default HomeScreen;

/////// [2] /////////
// import Header from '@/components/Header';
// import Icon from '@expo/vector-icons/MaterialIcons';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import { useRouter } from 'expo-router';
// import React, { useEffect, useMemo, useRef, useState } from 'react';
// import {
//     Dimensions,
//     FlatList,
//     StyleSheet,
//     Text,
//     TouchableOpacity,
//     View,
//     Platform,
//     ScrollView
// } from 'react-native';

// const { width } = Dimensions.get('window');
// // Responsive columns: 3 for phones, 4 for tablets, 5 for large tablets
// const getNumColumns = () => {
//     if (width >= 768 && width < 1024) return 4;
//     if (width >= 1024) return 5;
//     return 3;
// };
// const NUM_COLUMNS = getNumColumns();
// const ITEM_SIZE = (width - 40) / NUM_COLUMNS;
// const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

// interface Props {
//     username?: string;
// }

// const HomeScreen: React.FC<Props> = ({ username }) => {
//     const [search, setSearch] = useState('');
//     const [apps, setApps] = useState<any[]>([]);
//     const [selectedLetter, setSelectedLetter] = useState('');
//     const [selectedCategory, setSelectedCategory] = useState('All');
//     const flatListRef = useRef<FlatList>(null);
//     const router = useRouter();
//     const [prp, setPrp] = useState<string | null>(null);

//     useEffect(() => {
//         const load = async () => {
//             const prp = await AsyncStorage.getItem("selected_property");
//             setPrp(prp);
//         };
//         load();
//     }, []);

//     // All available apps with categories for filtering
//     const ALL_APPS = [
//         { name: 'Credit Limit Request', route: 'credit-limit', icon: 'credit-score', color: '#4285F4', category: 'Finance' },
//         {
//             name: 'Receivables',
//             icon: 'receipt-long',
//             route: prp === "sudamo_knits" ? 'receivables-sudamo' : 'receivables',
//             color: '#773F3F',
//             category: 'Finance'
//         },
//         { name: 'Collection', icon: 'currency-rupee', route: 'Collection', color: '#6bd35d', category: 'Finance' },
//         { name: 'Yarn Purchase Order', icon: 'attach-money', route: 'yarn-purchase-order', color: '#1F7006', category: 'Reports' },
//         { name: 'Production Order Tracking', icon: 'track-changes', route: 'production-order-tracking', color: '#CE9F78', category: 'Production' },
//         { name: 'Monthly Expense Report', icon: 'table-chart', route: 'monthly-expense-report', color: '#D35400', category: 'Reports' },
//         { name: 'Snap View', icon: 'table-view', route: 'snap-view', color: '#ABC00B', category: 'Reports' },
//         { name: 'Payable', icon: 'payment', route: 'payable', color: '#521313', category: 'Finance' },
//         { name: 'Daily Collection Report', icon: 'collections-bookmark', route: 'daily-collection-report', color: '#5B2CFF', category: 'Reports' },
//         { name: 'Sales Order Tracking', icon: 'track-changes', route: 'sales-order-tracking', color: '#DB945A', category: 'Production' },
//         { name: 'Sales Analysis', icon: 'bar-chart', route: 'sales-analysis', color: '#221080', category: 'Reports' },
//         { name: 'Daily Payment Report', icon: 'payments', route: 'daily-payment-report', color: '#ff2ced', category: 'Reports' },
//     ];

//     // Load user-specific apps from cache
//     useEffect(() => {
//         if (prp) {
//             const loadApps = async () => {
//                 try {
//                     const data = await AsyncStorage.getItem('user_menu_apps');
//                     if (!data) return;

//                     const decoded = atob(data);
//                     const parsed = JSON.parse(decoded);
//                     await AsyncStorage.setItem('rightsMenuApps', JSON.stringify(parsed));

//                     const mobileApp = parsed.find((item: any) =>
//                         item.pages?.some((p: any) => p.title === 'Mobile App')
//                     );

//                     const children = mobileApp?.pages?.find(
//                         (p: any) => p.title === 'Mobile App'
//                     )?.children || [];

//                     const allowedNames = children.map((c: any) => c.title);
//                     const filteredApps = ALL_APPS.filter(app =>
//                         allowedNames.includes(app.name)
//                     );

//                     filteredApps.sort((a, b) => a.name.localeCompare(b.name));
//                     setApps(filteredApps);
//                 } catch (e) {
//                     console.log("❌ MENU ERROR", e);
//                 }
//             };
//             loadApps();
//         }
//     }, [prp]);

//     // Extract unique categories from loaded apps
//     const categories = useMemo(() => {
//         const cats = ['All', ...new Set(apps.map(app => app.category))];
//         return cats;
//     }, [apps]);

//     // Filter apps by search text and selected category
//     const filteredApps = useMemo(() => {
//         let filtered = apps;
//         if (search) {
//             filtered = filtered.filter(a =>
//                 (
//                     a.name === 'Yarn Purchase Order'
//                         ? 'Purchase Order'
//                         : a.name
//                 )
//                     .toLowerCase()
//                     .includes(search.toLowerCase())
//             );
//         }
//         if (selectedCategory !== 'All') {
//             filtered = filtered.filter(a => a.category === selectedCategory);
//         }
//         return filtered;
//     }, [apps, search, selectedCategory]);

//     const groupedApps = useMemo(() => {
//         const grouped: any = {};

//         filteredApps.forEach(app => {
//             if (!grouped[app.category]) {
//                 grouped[app.category] = [];
//             }

//             grouped[app.category].push(app);
//         });

//         return grouped;
//     }, [filteredApps]);

//     // Scroll to letter in alphabet jump
//     const scrollToLetter = (letter: string) => {
//         const index = filteredApps.findIndex(a =>
//             a.name.startsWith(letter)
//         );
//         if (index !== -1) {
//             flatListRef.current?.scrollToIndex({ index, animated: true });
//             setSelectedLetter(letter);
//             setTimeout(() => setSelectedLetter(''), 800);
//         }
//     };

//     // Render category chip
//     const CategoryChip = ({ title }: { title: string }) => (
//         <TouchableOpacity
//             style={[styles.categoryChip, selectedCategory === title && styles.categoryChipActive]}
//             onPress={() => setSelectedCategory(title)}
//         >
//             <Text style={[styles.categoryChipText, selectedCategory === title && styles.categoryChipTextActive]}>
//                 {title}
//             </Text>
//         </TouchableOpacity>
//     );

//     return (
//         <View style={styles.container}>
//             <Header userName={username} onSearch={setSearch} />

//             {/* Horizontal Category Scroll */}
//             {categories.length > 1 && (
//                 <View style={styles.categoryWrapper}>
//                     <FlatList
//                         horizontal
//                         showsHorizontalScrollIndicator={false}
//                         data={categories}
//                         keyExtractor={(item) => item}
//                         renderItem={({ item }) => <CategoryChip title={item} />}
//                         contentContainerStyle={styles.categoryList}
//                     />
//                 </View>
//             )}

//             {/* Alphabet Quick Jump (Right Side) */}
//             <View style={styles.alphabetContainer}>
//                 {ALPHABET.map(letter => (
//                     <TouchableOpacity key={letter} onPress={() => scrollToLetter(letter)} style={styles.alphaItem}>
//                         <Text style={[styles.alphaText, selectedLetter === letter && styles.alphaTextActive]}>
//                             {letter}
//                         </Text>
//                     </TouchableOpacity>
//                 ))}
//             </View>

//             {/* Apps Grid */}
//             {/* <FlatList
//                 ref={flatListRef}
//                 data={filteredApps}
//                 numColumns={NUM_COLUMNS}
//                 key={NUM_COLUMNS}
//                 keyExtractor={(item) => item.name}
//                 contentContainerStyle={styles.gridContainer}
//                 renderItem={renderAppCard}
//                 showsVerticalScrollIndicator={false}
//                 ListEmptyComponent={
//                     <View style={styles.emptyContainer}>
//                         <Icon name="apps" size={64} color="#CBD5E1" />
//                         <Text style={styles.emptyText}>No apps found</Text>
//                     </View>
//                 }
//                 onScrollToIndexFailed={(info) => {
//                     const wait = new Promise(resolve => setTimeout(resolve, 500));
//                     wait.then(() => {
//                         flatListRef.current?.scrollToIndex({ index: info.index, animated: true });
//                     });
//                 }}
//             /> */}
//             {/* <FlatList
//                 ref={flatListRef}
//                 data={filteredApps}
//                 keyExtractor={(item) => item.name}
//                 contentContainerStyle={styles.listContainer}
//                 renderItem={renderAppCard}
//                 showsVerticalScrollIndicator={false}
//             /> */}
//             <ScrollView
//                 showsVerticalScrollIndicator={false}
//                 contentContainerStyle={styles.listContainer}
//             >
//                 {Object.entries(groupedApps).map(([category, items]: any) => (
//                     <View key={category}>
//                         <Text style={styles.sectionHeader}>
//                             {category.toUpperCase()}
//                         </Text>

//                         {items.map((item: any) => (
//                             <TouchableOpacity
//                                 key={item.name}
//                                 style={styles.appCard}
//                                 onPress={() => router.replace(item.route)}
//                             >
//                                 <View style={styles.leftSection}>
//                                     <View
//                                         style={[
//                                             styles.iconContainer,
//                                             { backgroundColor: item.color }
//                                         ]}
//                                     >
//                                         <Icon
//                                             name={item.icon}
//                                             size={22}
//                                             color="#fff"
//                                         />
//                                     </View>

//                                     <View style={styles.textContainer}>
//                                         <Text style={styles.title}>
//                                             {item.name === 'Yarn Purchase Order'
//                                                 ? 'Purchase Order'
//                                                 : item.name}
//                                         </Text>

//                                         <Text style={styles.subtitle}>
//                                             {item.category}
//                                         </Text>
//                                     </View>
//                                 </View>

//                                 <Icon
//                                     name="chevron-right"
//                                     size={18}
//                                     color="#A0A0A0"
//                                 />
//                             </TouchableOpacity>
//                         ))}
//                     </View>
//                 ))}
//             </ScrollView>
//         </View>
//     );
// };

// const styles = StyleSheet.create({
//     container: {
//         flex: 1,
//         backgroundColor: '#FFFFFF',
//     },
//     categoryWrapper: {
//         backgroundColor: '#FFFFFF',
//         paddingVertical: 12,
//         borderBottomWidth: 1,
//         borderBottomColor: '#F1F5F9',
//         elevation: 2,
//         shadowColor: '#000',
//         shadowOffset: { width: 0, height: 1 },
//         shadowOpacity: 0.02,
//         shadowRadius: 2,
//     },
//     categoryList: {
//         paddingHorizontal: 16,
//         gap: 8,
//     },
//     categoryChip: {
//         paddingHorizontal: 16,
//         paddingVertical: 8,
//         borderRadius: 24,
//         backgroundColor: '#F1F5F9',
//         marginRight: 8,
//     },
//     categoryChipActive: {
//         backgroundColor: '#3B82F6',
//     },
//     categoryChipText: {
//         fontSize: 14,
//         fontWeight: '500',
//         color: '#475569',
//     },
//     categoryChipTextActive: {
//         color: '#FFFFFF',
//     },
//     alphabetContainer: {
//         position: 'absolute',
//         right: 6,
//         top: '30%',
//         backgroundColor: 'rgba(255,255,255,0.96)',
//         borderRadius: 24,
//         paddingVertical: 8,
//         paddingHorizontal: 4,
//         shadowColor: '#000',
//         shadowOffset: { width: 0, height: 2 },
//         shadowOpacity: 0.08,
//         shadowRadius: 6,
//         elevation: 4,
//         zIndex: 10,
//     },
//     alphaItem: {
//         paddingHorizontal: 4,
//         paddingVertical: 2,
//         alignItems: 'center',
//         justifyContent: 'center',
//     },
//     alphaText: {
//         fontSize: 11,
//         fontWeight: '500',
//         color: '#64748B',
//     },
//     alphaTextActive: {
//         color: '#3B82F6',
//         fontSize: 13,
//         fontWeight: '700',
//     },
//     gridContainer: {
//         paddingHorizontal: 12,
//         paddingTop: 16,
//         paddingBottom: 120,
//     },
//     card: {
//         alignItems: 'center',
//         marginBottom: 20,
//         paddingVertical: 12,
//         paddingHorizontal: 4,
//     },
//     // iconContainer: {
//     //     width: 64,
//     //     height: 64,
//     //     borderRadius: 20,
//     //     justifyContent: 'center',
//     //     alignItems: 'center',
//     //     marginBottom: 8,
//     //     ...Platform.select({
//     //         ios: {
//     //             shadowColor: '#000',
//     //             shadowOffset: { width: 0, height: 1 },
//     //             shadowOpacity: 0.05,
//     //             shadowRadius: 2,
//     //         },
//     //         android: {
//     //             elevation: 1,
//     //         },
//     //     }),
//     // },
//     appName: {
//         fontSize: 12,
//         fontWeight: '500',
//         color: '#334155',
//         textAlign: 'center',
//         lineHeight: 16,
//         maxWidth: ITEM_SIZE - 10,
//     },
//     emptyContainer: {
//         alignItems: 'center',
//         justifyContent: 'center',
//         paddingVertical: 80,
//     },
//     emptyText: {
//         fontSize: 16,
//         color: '#94A3B8',
//         marginTop: 12,
//         fontWeight: '500',
//     },
//     // 
//     listContainer: {
//         paddingHorizontal: 12,
//         paddingBottom: 20,
//         backgroundColor: "#FFFFFF",
//     },

//     appCard: {
//         flexDirection: "row",
//         alignItems: "center",
//         justifyContent: "space-between",

//         width: "100%", // important

//         backgroundColor: "#FFFFFF",
//         paddingVertical: 14,
//         borderBottomWidth: 1,
//         borderBottomColor: "#EAEAEA",
//     },

//     leftSection: {
//         flexDirection: "row",
//         alignItems: "center",
//         flex: 1,
//     },

//     iconContainer: {
//         width: 44,
//         height: 44,
//         borderRadius: 12,
//         // backgroundColor: "#1E88E5",

//         justifyContent: "center",
//         alignItems: "center",
//     },

//     textContainer: {
//         marginLeft: 12,
//         flex: 1,
//     },

//     title: {
//         fontSize: 16,
//         fontWeight: "600",
//         color: "#111827",
//     },

//     subtitle: {
//         marginTop: 2,
//         fontSize: 13,
//         color: "#6B7280",
//     },
//     sectionHeader: {
//         fontSize: 12,
//         fontWeight: '700',
//         color: '#6B7280',
//         marginTop: 20,
//         marginBottom: 8,
//         paddingHorizontal: 4,
//         letterSpacing: 1,
//     },
// })

// export default HomeScreen;

/////// [3] /////////
import { HOME_TOUR } from '@/common/TourJson';
import TourOverlay from '@/common/TourOverlay';
import Header from '@/components/Header';
import Icon from '@expo/vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
    Dimensions,
    FlatList,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

const { width } = Dimensions.get('window');
const getNumColumns = () => {
    if (width >= 768 && width < 1024) return 4;
    if (width >= 1024) return 5;
    return 3;
};
const NUM_COLUMNS = getNumColumns();
const ITEM_SIZE = (width - 40) / NUM_COLUMNS;
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

// How many "frequent" apps to show collapsed
const FREQUENT_COLLAPSED_COUNT = 2;
// Minimum clicks before an app is considered "frequent"
const FREQUENT_MIN_CLICKS = 1;

interface Props {
    username?: string;
}

const HomeScreen: React.FC<Props> = ({ username }) => {
    const [search, setSearch] = useState('');
    const [apps, setApps] = useState<any[]>([]);
    // const [selectedLetter, setSelectedLetter] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [usageCounts, setUsageCounts] = useState<Record<string, number>>({});
    const [showAllFrequent, setShowAllFrequent] = useState(false);

    // const flatListRef = useRef<FlatList>(null);
    const router = useRouter();
    const [prp, setPrp] = useState<string | null>(null);
    const [showHeaderTour, setShowHeaderTour] =
        useState(false);

    const [showHomeTour, setShowHomeTour] =
        useState(false);

    // useEffect(() => {

    //     const initTour = async () => {

    //         // const seen =
    //         //     await AsyncStorage.getItem(
    //         //         '@flow_home_tour_completed'
    //         //     );

    //         // if (!seen) {
    //         setTimeout(() => {
    //             setShowHomeTour(true);
    //         }, 1000);
    //         // }
    //     };

    //     initTour();

    // }, []);

    useEffect(() => {
        const load = async () => {
            const prp = await AsyncStorage.getItem("selected_property");
            setPrp(prp);
        };
        load();
    }, []);

    // Load usage counts silently from storage
    useEffect(() => {
        const loadUsageCounts = async () => {
            try {
                const raw = await AsyncStorage.getItem('_app_usage_counts');
                if (raw) {
                    setUsageCounts(JSON.parse(raw));
                }
            } catch (_) { }
        };
        loadUsageCounts();
    }, []);

    const replayTour = () => {

        setShowHomeTour(true);
        // setShowHeaderTour(false);

        // setTimeout(() => {
        //     setShowHeaderTour(true);
        // }, 200);

    };

    // Silently track a click — no UI feedback
    const trackUsage = async (appName: string) => {
        try {
            const updated = { ...usageCounts, [appName]: (usageCounts[appName] || 0) + 1 };
            setUsageCounts(updated);
            await AsyncStorage.setItem('_app_usage_counts', JSON.stringify(updated));
        } catch (_) { }
    };

    const handleAppPress = (item: any) => {
        trackUsage(item.name);
        router.replace(item.route);
    };

    const ALL_APPS_old = [
        { name: 'Credit Limit Request', route: 'credit-limit', icon: 'credit-score', color: '#4285F4' },
        {
            name: 'Receivables',
            icon: 'receipt-long',
            route: prp === "sudamo_knits" ? 'receivables-sudamo' : 'receivables',
            color: '#773F3F'
        },
        { name: 'Collection', icon: 'currency-rupee', route: 'Collection', color: '#6bd35d' },
        // { name: 'Upload', icon: 'upload', route: 'upload', color: '#2E2E2E' },
        // { name: 'Sudamo Production Order', icon: 'production-quantity-limits', route: 'sudamo-production-order', color: '#F2D43D' },
        { name: 'Yarn Purchase Order', icon: 'attach-money', route: 'yarn-purchase-order', color: '#1F7006' },
        // { name: 'Grey Purchase Order', icon: 'payments', route: 'grey-purchase-order', color: '#3BAD18' },
        // { name: 'Sales Order', icon: 'point-of-sale', route: 'sales-order', color: '#20BEC1' },
        { name: 'Production Order Tracking', icon: 'track-changes', route: 'production-order-tracking', color: '#CE9F78' },
        // { name: 'New Account Request', icon: 'account-balance', route: 'new-account-request', color: '#E982F6' },
        { name: 'Monthly Expense Report', icon: 'table-chart', route: 'monthly-expense-report', color: '#D35400' },
        { name: 'Snap View', icon: 'table-view', route: 'snap-view', color: '#ABC00B' },
        // { name: 'Packing Automation', icon: 'receipt-long', route: 'packing-automation', color: 'rgb(194, 213, 52)' },
        // { name: 'Inquiry', icon: 'table-view', route: 'inquiry', color: 'rgb(194, 213, 52)' },
        { name: 'Payable', icon: 'payment', route: 'payable', color: '#521313' },
        { name: 'Daily Collection Report', icon: 'collections-bookmark', route: 'daily-collection-report', color: '#5B2CFF' },
        // { name: 'Taka Checking Entry', icon: 'dynamic-form', route: 'taka-checking-entry', color: '#5B2CFF' },
        { name: 'Sales Order Tracking', icon: 'track-changes', route: 'sales-order-tracking', color: '#DB945A' },
        // { name: 'Yarn Stock Verification', icon: 'check-circle', route: 'yarn-stock-verification', color: '#008080' },
        // { name: 'Checking Scanner', icon: 'document-scanner', route: 'checking-scanner', color: '#4169E1' },
        // { name: 'Purchase Order Tracking', icon: 'shopping-cart', route: 'purchase-order-tracking', color: '#228B22' },
        { name: 'Sales Analysis', icon: 'bar-chart', route: 'sales-analysis', color: '#221080' },
        // { name: 'Sales Order(Inactive)', icon: 'bar-chart', route: 'sales order-inactive', color: '#221080' },
        // { name: 'Item Authorization', icon: 'gite', route: 'item-authorization', color: '#221080' },
        // { name: 'ProcesFs complete auth.', icon: 'autorenew', route: 'process-complete-auth', color: '#dd5c98' },
        // { name: 'Febric Stock', icon: 'autorenew', route: 'febric-stock', color: '#dd5c98' },
        { name: 'Daily Payment Report', icon: 'payments', route: 'daily-payment-report', color: '#ff2ced' },
    ];

    const ALL_APPS = [
        { name: 'Credit Limit Request', route: 'credit-limit', icon: 'credit-score', color: '#4285F4', category: 'Finance' },
        {
            name: 'Receivables',
            icon: 'receipt-long',
            route: prp === "sudamo_knits" ? 'receivables-sudamo' : 'receivables',
            color: '#773F3F',
            category: 'Finance'
        },
        { name: 'Collection', icon: 'currency-rupee', route: 'Collection', color: '#6bd35d', category: 'Finance' },
        { name: 'Yarn Purchase Order', icon: 'attach-money', route: 'yarn-purchase-order', color: '#1F7006', category: 'Reports' },
        { name: 'Production Order Tracking', icon: 'track-changes', route: 'production-order-tracking', color: '#CE9F78', category: 'Production' },
        { name: 'Monthly Expense Report', icon: 'table-chart', route: 'monthly-expense-report', color: '#D35400', category: 'Reports' },
        { name: 'Snap View', icon: 'table-view', route: 'snap-view', color: '#ABC00B', category: 'Reports' },
        { name: 'Payable', icon: 'payment', route: 'payable', color: '#521313', category: 'Finance' },
        { name: 'Daily Collection Report', icon: 'collections-bookmark', route: 'daily-collection-report', color: '#5B2CFF', category: 'Reports' },
        { name: 'Sales Order Tracking', icon: 'track-changes', route: 'sales-order-tracking', color: '#DB945A', category: 'Production' },
        { name: 'Sales Analysis', icon: 'bar-chart', route: 'sales-analysis', color: '#221080', category: 'Reports' },
        { name: 'Daily Payment Report', icon: 'payments', route: 'daily-payment-report', color: '#ff2ced', category: 'Reports' },
        { name: 'Inquiry', icon: 'table-view', route: 'Inquiry', color: 'rgb(194, 213, 52)', category: 'Production' },
        // 
        { name: 'Sudamo Production Order', icon: 'production-quantity-limits', route: 'sudamo-production-order', color: '#F2D43D', category: 'Production' },
        { name: 'New Account Request', icon: 'account-balance', route: 'new-account-request', color: '#E982F6', category: 'Finance' },
        { name: 'Yarn Stock Verification', icon: 'check-circle', route: 'yarn-stock-verification', color: '#008080', category: 'Stocks' },
        { name: 'Sales Order(Inactive)', icon: 'bar-chart', route: 'sales order-inactive', color: '#221080', category: 'Production' },
        { name: 'Purchase Order Tracking', icon: 'shopping-cart', route: 'purchase-order-tracking', color: '#228B22', category: 'Production' },
        { name: 'Item Authorization', icon: 'gite', route: 'item-authorization', color: '#221080', category: 'Production' },
        { name: 'Process complete auth.', icon: 'autorenew', route: 'process-complete-auth', color: '#dd5c98', category: 'Production' },
        { name: 'Febric Stock', icon: 'autorenew', route: 'febric-stock', color: '#dd5c98', category: 'Stocks' },
        { name: 'Checking Scanner', icon: 'document-scanner', route: 'checking-scanner', color: '#4169E1', category: 'Finance' },
    ];

    useEffect(() => {
        if (prp) {
            const loadApps = async () => {
                try {
                    const data = await AsyncStorage.getItem('user_menu_apps');
                    if (!data) return;
                    const decoded = atob(data);
                    const parsed = JSON.parse(decoded);
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
                    //                         "title": "Purchase Order",
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
                    //                         "title": "Daily Collection Report",
                    //                         "href": "/"
                    //                     },
                    //                     {
                    //                         "title": "Sales Order(Inactive)",
                    //                         "href": "/"
                    //                     },
                    //                     {
                    //                         "title": "Item Authorization",
                    //                         "href": "/"
                    //                     },
                    //                     {
                    //                         "title": "Process complete auth.",
                    //                         "href": "/"
                    //                     },
                    //                     {
                    //                         "title": "Febric Stock",
                    //                         "href": "/"
                    //                     },
                    //                     {
                    //                         "title": "Daily Collection Report",
                    //                         "href": "/"
                    //                     },
                    //                     {
                    //                         "title": "Daily Payment Report",
                    //                         "href": "/"
                    //                     },
                    //                     {

                    //                         "title": "Purchase Order Tracking",
                    //                         "href": "/"
                    //                     },
                    //                     {
                    //                         "title": "Sales Order Tracking",
                    //                         "href": "/"
                    //                     },
                    //                     {
                    //                         "title": "Beam Close",
                    //                         "href": "/"
                    //                     },
                    //                     {
                    //                         "title": "Creel Management System",
                    //                         "href": "/"
                    //                     },
                    //                     {
                    //                         "title": "Yarn Stock",
                    //                         "href": "/"
                    //                     },
                    //                     {
                    //                         "title": "Beam Gaiting",
                    //                         "href": "/"
                    //                     },
                    //                     {
                    //                         "title": "Taka Checking Entry",
                    //                         "href": "/"
                    //                     },
                    //                     {
                    //                         "title": "Yarn Management System",
                    //                         "href": "/"
                    //                     },
                    //                     {
                    //                         "title": "Party Dashboard",
                    //                         "href": "/"
                    //                     },
                    //                     {

                    //                         "title": "Weft Issue",
                    //                         "href": "/"
                    //                     },

                    //                 ]
                    //             }
                    //         ]
                    //     }
                    // ];
                    await AsyncStorage.setItem('rightsMenuApps', JSON.stringify(parsed));
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
                    filteredApps.sort((a, b) => a.name.localeCompare(b.name));
                    setApps(filteredApps);
                } catch (e) {
                    console.log("❌ MENU ERROR", e);
                }
            };
            loadApps();
        }
    }, [prp]);

    const categories = useMemo(() => {
        const cats = ['All', ...new Set(apps.map(app => app.category))];
        return cats;
    }, [apps]);

    const filteredApps = useMemo(() => {
        let filtered = apps;
        if (search) {
            filtered = filtered.filter(a =>
                (a.name === 'Yarn Purchase Order' ? 'Purchase Order' : a.name)
                    .toLowerCase()
                    .includes(search.toLowerCase())
            );
        }
        if (selectedCategory !== 'All') {
            filtered = filtered.filter(a => a.category === selectedCategory);
        }
        return filtered;
    }, [apps, search, selectedCategory]);

    const groupedApps = useMemo(() => {
        const grouped: any = {};
        filteredApps.forEach(app => {
            if (!grouped[app.category]) grouped[app.category] = [];
            grouped[app.category].push(app);
        });
        return grouped;
    }, [filteredApps]);

    // Frequent apps: sorted by usage, min 1 click, top apps
    const frequentApps = useMemo(() => {
        return apps
            .filter(app => (usageCounts[app.name] || 0) >= FREQUENT_MIN_CLICKS)
            .sort((a, b) => (usageCounts[b.name] || 0) - (usageCounts[a.name] || 0));
    }, [apps, usageCounts]);

    // What to show in the frequent section
    const visibleFrequentApps = useMemo(() => {
        if (showAllFrequent) return frequentApps;
        return frequentApps.slice(0, FREQUENT_COLLAPSED_COUNT);
    }, [frequentApps, showAllFrequent]);

    const hasMoreFrequent = frequentApps.length > FREQUENT_COLLAPSED_COUNT;

    // const scrollToLetter = (letter: string) => {
    //     const index = filteredApps.findIndex(a => a.name.startsWith(letter));
    //     if (index !== -1) {
    //         flatListRef.current?.scrollToIndex({ index, animated: true });
    //         setSelectedLetter(letter);
    //         setTimeout(() => setSelectedLetter(''), 800);
    //     }
    // };

    const CategoryChip = ({ title }: { title: string }) => (
        <TouchableOpacity
            style={[styles.categoryChip, selectedCategory === title && styles.categoryChipActive]}
            onPress={() => setSelectedCategory(title)}
        >
            <Text style={[styles.categoryChipText, selectedCategory === title && styles.categoryChipTextActive]}>
                {title}
            </Text>
        </TouchableOpacity>
    );

    // Display name helper
    const getDisplayName = (app: any) =>
        app.name === 'Yarn Purchase Order' ? 'Purchase Order' : app.name;

    return (
        <>
            <View style={styles.container}>
                <Header userName={username}
                    onSearch={setSearch}
                    setShowHeaderTour={setShowHeaderTour}
                    onHelpPress={replayTour} />

                {/* Horizontal Category Scroll */}
                {categories.length > 1 && (
                    <View style={styles.categoryWrapper}>

                        <FlatList
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            data={categories}
                            keyExtractor={(item) => item}
                            renderItem={({ item }) => <CategoryChip title={item} />}
                            contentContainerStyle={styles.categoryList}
                        />
                        <TouchableOpacity
                            style={[styles.categoryChipInfo]}
                            onPress={() => replayTour()}
                        >
                            {/* <Text style={[styles.categoryChipText, selectedCategory === 'All' && styles.categoryChipTextActive]}>
                                Info
                            </Text> */}
                            <Icon name="help-outline" size={24} color={'#ffa931'} />
                        </TouchableOpacity>
                    </View>
                )}

                {/* Alphabet Quick Jump (Right Side) */}
                {/* <View style={styles.alphabetContainer}>
                {ALPHABET.map(letter => (
                    <TouchableOpacity
                        key={letter}
                        onPress={() => scrollToLetter(letter)}
                        style={styles.alphaItem}
                    >
                        <Text
                            style={[
                                styles.alphaText,
                                selectedLetter === letter &&
                                styles.alphaTextActive
                            ]}
                        >
                            {letter}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View> */}

                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.listContainer}
                >
                    {/* ── FREQUENTLY USED SECTION ── */}
                    {frequentApps.length > 0 && !search && selectedCategory === 'All' && (
                        <View style={styles.frequentSection}>
                            {/* Header row */}
                            <View style={styles.frequentHeaderRow}>
                                <View style={styles.frequentHeaderLeft}>
                                    <Icon name="bolt" size={14} color="#F59E0B" />
                                    <Text style={styles.frequentHeader}>FREQUENTLY USED</Text>
                                </View>
                            </View>

                            {/* Frequent app rows */}
                            {visibleFrequentApps.map((item: any, index: number) => (
                                <TouchableOpacity
                                    key={item.name}
                                    style={[
                                        styles.frequentCard,
                                        index === visibleFrequentApps.length - 1 &&
                                        !hasMoreFrequent &&
                                        styles.frequentCardLast,
                                    ]}
                                    onPress={() => handleAppPress(item)}
                                    activeOpacity={0.7}
                                >
                                    <View style={styles.leftSection}>
                                        <View style={[styles.frequentIconContainer, { backgroundColor: item.color }]}>
                                            <Icon name={item.icon} size={18} color="#fff" />
                                        </View>
                                        <View style={styles.textContainer}>
                                            <Text style={styles.frequentTitle}>{getDisplayName(item)}</Text>
                                            <Text style={styles.subtitle}>{item.category}</Text>
                                        </View>
                                    </View>
                                    <Icon name="chevron-right" size={16} color="#CBD5E1" />
                                </TouchableOpacity>
                            ))}

                            {/* Show more / less toggle */}
                            {hasMoreFrequent && (
                                <TouchableOpacity
                                    style={styles.showMoreBtn}
                                    onPress={() => setShowAllFrequent(prev => !prev)}
                                    activeOpacity={0.7}
                                >
                                    <Text style={styles.showMoreText}>
                                        {showAllFrequent
                                            ? 'Show less'
                                            : `+${frequentApps.length - FREQUENT_COLLAPSED_COUNT} more`}
                                    </Text>
                                    <Icon
                                        name={showAllFrequent ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
                                        size={14}
                                        color="#6B7280"
                                    />
                                </TouchableOpacity>
                            )}
                        </View>
                    )}

                    {/* ── ALL APPS BY CATEGORY ── */}
                    {Object.entries(groupedApps).map(([category, items]: any) => (
                        <View key={category}>
                            <Text style={styles.sectionHeader}>{category.toUpperCase()}</Text>
                            {items.map((item: any) => (
                                <TouchableOpacity
                                    key={item.name}
                                    style={styles.appCard}
                                    onPress={() => handleAppPress(item)}
                                    activeOpacity={0.7}
                                >
                                    <View style={styles.leftSection}>
                                        <View style={[styles.iconContainer, { backgroundColor: item.color }]}>
                                            <Icon name={item.icon} size={22} color="#fff" />
                                        </View>
                                        <View style={styles.textContainer}>
                                            <Text style={styles.title}>{getDisplayName(item)}</Text>
                                            <Text style={styles.subtitle}>{item.category}</Text>
                                        </View>
                                    </View>
                                    <Icon name="chevron-right" size={18} color="#A0A0A0" />
                                </TouchableOpacity>
                            ))}
                        </View>
                    ))}
                </ScrollView>
            </View>
            {/* <TourOverlay
                visible={showHeaderTour}
                tourKey="header-tour"
                steps={HEADER_TOUR}
                onClose={() => {

                    setShowHeaderTour(false);

                    setTimeout(() => {
                        setShowHomeTour(true);
                    }, 300);

                }}
            /> */}
            <TourOverlay
                visible={showHomeTour}
                tourKey="home-tour"
                steps={HOME_TOUR}
                onClose={async () => {

                    setShowHomeTour(false);

                    await AsyncStorage.setItem(
                        '@flow_home_tour_completed',
                        '1'
                    );

                }}
            />
        </>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    categoryWrapper: {
        backgroundColor: '#FFFFFF',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.02,
        shadowRadius: 2,
        display: 'flex',
        flexDirection: 'row',
    },
    categoryList: {
        // paddingHorizontal: 16,
        paddingRight: 0,
        paddingLeft: 16,
        gap: 8,
    },
    categoryChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 24,
        backgroundColor: '#F1F5F9',
        marginRight: 8,
    },
    categoryChipInfo: {
        // backgroundColor: '#E0E7FF',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 24,
        // backgroundColor: '#F1F5F9',
        // marginRight: 8,
    },
    categoryChipActive: {
        backgroundColor: '#000',
    },
    categoryChipText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#475569',
    },
    categoryChipTextActive: {
        color: '#FFFFFF',
    },
    alphabetContainer: {
        position: 'absolute',
        right: 6,
        top: '30%',
        backgroundColor: 'rgba(255,255,255,0.96)',
        borderRadius: 24,
        paddingVertical: 8,
        paddingHorizontal: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
        elevation: 4,
        zIndex: 10,
    },
    alphaItem: {
        paddingHorizontal: 4,
        paddingVertical: 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
    alphaText: {
        fontSize: 11,
        fontWeight: '500',
        color: '#64748B',
    },
    alphaTextActive: {
        color: '#3B82F6',
        fontSize: 13,
        fontWeight: '700',
    },
    listContainer: {
        paddingHorizontal: 12,
        paddingBottom: 20,
        backgroundColor: '#FFFFFF',
    },

    // ── Frequent Section ──
    frequentSection: {
        marginTop: 16,
        marginBottom: 4,
        backgroundColor: '#FAFAFA',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#F1F5F9',
        overflow: 'hidden',
    },
    frequentHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 14,
        paddingTop: 12,
        paddingBottom: 6,
    },
    frequentHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    frequentHeader: {
        fontSize: 11,
        fontWeight: '700',
        color: '#9CA3AF',
        letterSpacing: 1,
        marginLeft: 4,
    },
    frequentCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 11,
        paddingHorizontal: 14,
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
        backgroundColor: '#FAFAFA',
    },
    frequentCardLast: {
        borderBottomWidth: 0,
    },
    frequentIconContainer: {
        width: 36,
        height: 36,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    frequentTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#111827',
    },
    showMoreBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        paddingVertical: 10,
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
    },
    showMoreText: {
        fontSize: 12,
        fontWeight: '500',
        color: '#6B7280',
    },

    // ── Regular list ──
    appCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        backgroundColor: '#FFFFFF',
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#EAEAEA',
    },
    leftSection: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    iconContainer: {
        width: 44,
        height: 44,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    textContainer: {
        marginLeft: 12,
        flex: 1,
    },
    title: {
        fontSize: 16,
        fontWeight: '600',
        color: '#111827',
    },
    subtitle: {
        marginTop: 2,
        fontSize: 13,
        color: '#6B7280',
    },
    sectionHeader: {
        fontSize: 12,
        fontWeight: '700',
        color: '#6B7280',
        marginTop: 20,
        marginBottom: 8,
        paddingHorizontal: 4,
        letterSpacing: 1,
    },
    appName: {
        fontSize: 12,
        fontWeight: '500',
        color: '#334155',
        textAlign: 'center',
        lineHeight: 16,
        maxWidth: ITEM_SIZE - 10,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 80,
    },
    emptyText: {
        fontSize: 16,
        color: '#94A3B8',
        marginTop: 12,
        fontWeight: '500',
    },
    gridContainer: {
        paddingHorizontal: 12,
        paddingTop: 16,
        paddingBottom: 120,
    },
});

export default HomeScreen;


