// import Icon from '@expo/vector-icons/MaterialIcons';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import { useRouter } from 'expo-router';
// import React, { useState } from 'react';
// import {
//     Alert,
//     Dimensions,
//     Platform,
//     ScrollView,
//     StatusBar,
//     StyleSheet,
//     Text,
//     TouchableOpacity,
//     View,
// } from 'react-native';

// const { width } = Dimensions.get('window');

// const COLORS = {
//     background: '#F6F4F1',
//     dark: '#111111',
//     white: '#FFFFFF',
//     primary: '#C87516',
//     primaryDark: '#A35F0F',
//     border: '#ECECEC',
//     text: '#202020',
//     subText: '#707070',
//     success: '#2BA84A',
// };

// const STORAGE_KEY = 'LOOKUP_PLATFORM';

// const LookupSelectionScreen = () => {
//     const router = useRouter();
//     const [selected, setSelected] = useState<'NEW' | 'OLD' | null>('OLD');
//     const [loading, setLoading] = useState(false);

//     const saveSelection = async () => {
//         if (!selected) {
//             Alert.alert('Selection Required', 'Please select a system to continue.');
//             return;
//         }

//         try {
//             setLoading(true);

//             await AsyncStorage.setItem(STORAGE_KEY, selected);

//             // Alert.alert(
//             //     'Done',
//             //     `Selected Platform : ${selected === 'NEW' ? 'New ERP System' : 'Legacy ERP System'
//             //     }`,
//             // );
//             if (selected === 'NEW') {
//                 // router.push('/root-navigator')
//                 router.push('/new')
//             } else {
//                 // router.push('/lookup-select')
//                 router.push('/(auth)/login')
//             }
//             /**
//              * Navigate from here
//              *
//              * navigation.replace(...)
//              */


//         } catch (e) {
//             Alert.alert('Error', 'Unable to save selection.');
//         } finally {
//             setLoading(false);
//         }
//     };

//     const Card = ({
//         title,
//         desc,
//         value,
//         badge,
//     }: {
//         title: string;
//         desc: string;
//         value: 'NEW' | 'OLD';
//         badge: string;
//     }) => {
//         const active = selected === value;

//         return (
//             <TouchableOpacity
//                 activeOpacity={0.92}
//                 style={[
//                     styles.optionCard,
//                     active && {
//                         borderColor: COLORS.primary,
//                         borderWidth: 2,
//                     },
//                 ]}
//                 onPress={() => setSelected(value)}>
//                 <View style={styles.iconCircle}>
//                     <Text style={styles.icon}>
//                         {value === 'NEW' ? '🚀' : '🛡️'}
//                     </Text>
//                 </View>

//                 <View style={{ flex: 1 }}>
//                     <Text style={styles.optionTitle}>{title}</Text>

//                     <Text style={styles.optionDesc}>{desc}</Text>

//                     <View style={styles.badge}>
//                         <Text style={styles.badgeText}>{badge}</Text>
//                     </View>
//                 </View>

//                 <View
//                     style={[
//                         styles.radio,
//                         active && {
//                             backgroundColor: COLORS.primary,
//                             borderColor: COLORS.primary,
//                         },
//                     ]}>
//                     {active && <View style={styles.radioInner} />}
//                 </View>
//             </TouchableOpacity>
//         );
//     };

//     const goBack = () => {
//         if (router.canGoBack()) router.back();
//         else router.replace('/');
//     };

//     return (
//         // <SafeAreaView style={styles.container}>
//         <ScrollView
//             style={styles.container}
//             showsVerticalScrollIndicator={false}
//         >
//             <StatusBar
//                 barStyle="light-content"
//                 backgroundColor={COLORS.dark}
//             />

//             {/* HEADER */}

//             <View style={styles.header}>
//                 <View style={styles.topRow}>
//                     <TouchableOpacity
//                         activeOpacity={0.9}
//                         onPress={goBack}
//                         style={styles.backButton}
//                     >
//                         <Icon
//                             name="arrow-back-ios-new"
//                             size={18}
//                             color={COLORS.white}
//                         />

//                         <Text style={styles.backText}>Back</Text>
//                     </TouchableOpacity>

//                     <Text
//                         numberOfLines={1}
//                         adjustsFontSizeToFit
//                         style={styles.brand}
//                     >
//                         MADHUSUDHAN FABRICS
//                     </Text>

//                     {/* Right Side Spacer */}
//                     <View style={{ width: 70 }} />
//                 </View>

//                 <Text style={styles.heading}>
//                     Select ERP Platform
//                 </Text>

//                 <Text style={styles.subtitle}>
//                     Choose which business system you want to use.
//                     You can change this later from Settings.
//                 </Text>
//             </View>

//             {/* CONTENT */}

//             <View style={styles.content}>

//                 {/* <View style={styles.infoCard}>
//                     <Text style={styles.infoTop}>
//                         MOBILE PLATFORM
//                     </Text>

//                     <Text style={styles.infoTitle}>
//                         Business Lookup Selection
//                     </Text>

//                     <Text style={styles.infoDesc}>
//                         Select the ERP platform that should power your
//                         application experience.
//                     </Text>
//                 </View> */}

//                 <Card
//                     title="Legacy ERP System"
//                     desc="Use the existing ERP environment for compatibility with older workflows."
//                     value="OLD"
//                     badge="Recommended"
//                 />


//                 <Card
//                     title="New ERP System"
//                     desc="Latest platform with improved performance, modern UI and enhanced features."
//                     value="NEW"
//                     badge="Classic"
//                 />

//                 <TouchableOpacity
//                     activeOpacity={0.9}
//                     onPress={saveSelection}
//                     disabled={loading}
//                     style={styles.button}>
//                     <Text style={styles.buttonText}>
//                         {loading ? 'Saving...' : 'Continue'}
//                     </Text>
//                 </TouchableOpacity>

//                 <View style={styles.footer}>
//                     <View style={styles.dot} />

//                     <Text style={styles.footerText}>
//                         Your selection will be securely stored on this
//                         device.
//                     </Text>
//                 </View>

//             </View>
//         </ScrollView>
//     );
// };

// export default LookupSelectionScreen;

// const styles = StyleSheet.create({
//     container: {
//         flex: 1,
//         backgroundColor: COLORS.background,
//     },

//     header: {
//         backgroundColor: COLORS.dark,
//         paddingHorizontal: 26,
//         paddingTop: Platform.OS === 'android' ? 40 : 20,
//         paddingBottom: 90,
//     },

//     heading: {
//         color: COLORS.white,
//         fontSize: 34,
//         fontWeight: '800',
//     },

//     subtitle: {
//         color: '#B8B8B8',
//         marginTop: 15,
//         lineHeight: 23,
//         fontSize: 15,
//     },

//     content: {
//         flex: 1,
//         marginTop: -55,
//         paddingHorizontal: 22,
//     },

//     infoCard: {
//         backgroundColor: COLORS.white,
//         borderRadius: 26,
//         padding: 22,

//         shadowColor: '#000',

//         shadowOpacity: 0.09,
//         shadowRadius: 15,
//         shadowOffset: {
//             width: 0,
//             height: 8,
//         },

//         elevation: 8,
//         marginBottom: 25,
//     },

//     infoTop: {
//         color: COLORS.primary,
//         fontSize: 12,
//         fontWeight: '800',
//         letterSpacing: 2,
//     },

//     infoTitle: {
//         marginTop: 8,
//         fontSize: 26,
//         fontWeight: '800',
//         color: COLORS.text,
//     },

//     infoDesc: {
//         marginTop: 8,
//         fontSize: 15,
//         color: COLORS.subText,
//         lineHeight: 22,
//     },

//     optionCard: {
//         backgroundColor: COLORS.white,
//         borderRadius: 24,
//         padding: 18,
//         flexDirection: 'row',
//         alignItems: 'center',
//         marginBottom: 18,

//         borderWidth: 1,
//         borderColor: COLORS.border,

//         shadowColor: '#000',

//         shadowOpacity: 0.05,

//         shadowRadius: 10,

//         shadowOffset: {
//             width: 0,
//             height: 6,
//         },

//         elevation: 5,
//     },

//     iconCircle: {
//         width: 62,
//         height: 62,
//         borderRadius: 31,
//         backgroundColor: '#FFF3E4',
//         justifyContent: 'center',
//         alignItems: 'center',
//         marginRight: 16,
//     },

//     icon: {
//         fontSize: 28,
//     },

//     optionTitle: {
//         fontSize: 18,
//         fontWeight: '800',
//         color: COLORS.text,
//     },

//     optionDesc: {
//         marginTop: 5,
//         color: COLORS.subText,
//         lineHeight: 20,
//         fontSize: 14,
//     },

//     badge: {
//         marginTop: 12,
//         alignSelf: 'flex-start',
//         backgroundColor: '#FFF2E1',
//         paddingHorizontal: 12,
//         paddingVertical: 6,
//         borderRadius: 20,
//     },

//     badgeText: {
//         color: COLORS.primary,
//         fontWeight: '700',
//         fontSize: 12,
//     },

//     radio: {
//         width: 28,
//         height: 28,
//         borderRadius: 14,
//         borderWidth: 2,
//         borderColor: '#C9C9C9',
//         justifyContent: 'center',
//         alignItems: 'center',
//         marginLeft: 15,
//     },

//     radioInner: {
//         width: 12,
//         height: 12,
//         borderRadius: 6,
//         backgroundColor: COLORS.white,
//     },

//     button: {
//         backgroundColor: COLORS.primary,
//         height: 60,
//         borderRadius: 18,
//         justifyContent: 'center',
//         alignItems: 'center',
//         marginTop: 18,

//         shadowColor: COLORS.primary,

//         shadowOpacity: 0.35,

//         shadowRadius: 15,

//         shadowOffset: {
//             width: 0,
//             height: 8,
//         },

//         elevation: 10,
//     },

//     buttonText: {
//         color: COLORS.white,
//         fontSize: 18,
//         fontWeight: '800',
//     },

//     footer: {
//         marginTop: 25,
//         backgroundColor: COLORS.white,
//         borderRadius: 18,
//         padding: 18,
//         flexDirection: 'row',
//         alignItems: 'flex-start',
//     },

//     dot: {
//         width: 10,
//         height: 10,
//         borderRadius: 5,
//         backgroundColor: COLORS.success,
//         marginTop: 5,
//         marginRight: 12,
//     },

//     footerText: {
//         flex: 1,
//         fontSize: 14,
//         color: COLORS.subText,
//         lineHeight: 20,
//     },

//     topRow: {
//         flexDirection: 'row',
//         alignItems: 'center',
//         justifyContent: 'space-between',
//         marginBottom: 30,
//     },

//     backButton: {
//         flexDirection: 'row',
//         alignItems: 'center',
//         width: 70,
//     },

//     backText: {
//         color: COLORS.white,
//         fontSize: 15,
//         marginLeft: 4,
//         fontWeight: '600',
//     },

//     brand: {
//         flex: 1,
//         textAlign: 'center',
//         color: '#B6B6B6',
//         fontSize: 13,
//         fontWeight: '700',
//         letterSpacing: 2,
//         paddingHorizontal: 10,
//     },
// });

// import Icon from '@expo/vector-icons/MaterialIcons';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import { useRouter } from 'expo-router';
// import React, { useState } from 'react';
// import {
//     Alert,
//     Dimensions,
//     Platform,
//     ScrollView,
//     StatusBar,
//     StyleSheet,
//     Text,
//     TouchableOpacity,
//     View,
// } from 'react-native';

// const { width } = Dimensions.get('window');

// const COLORS = {
//     background: '#F6F4F1',
//     dark: '#111111',
//     white: '#FFFFFF',
//     primary: '#C87516',
//     primaryDark: '#A35F0F',
//     border: '#ECECEC',
//     text: '#202020',
//     subText: '#707070',
//     success: '#2BA84A',
// };

// const STORAGE_KEY = 'LOOKUP_PLATFORM';

// const LookupSelectionScreen = () => {
//     const router = useRouter();
//     const [selected, setSelected] = useState<'NEW' | 'OLD' | null>('OLD');
//     const [loading, setLoading] = useState(false);

//     const saveSelection = async () => {
//         if (!selected) {
//             Alert.alert('Selection Required', 'Please select a system to continue.');
//             return;
//         }

//         try {
//             setLoading(true);

//             await AsyncStorage.setItem(STORAGE_KEY, selected);

//             // Alert.alert(
//             //     'Done',
//             //     `Selected Platform : ${selected === 'NEW' ? 'New ERP System' : 'Legacy ERP System'
//             //     }`,
//             // );
//             if (selected === 'NEW') {
//                 // router.push('/root-navigator')
//                 router.push('/new')
//             } else {
//                 // router.push('/lookup-select')
//                 router.push('/(auth)/login')
//             }
//             /**
//              * Navigate from here
//              *
//              * navigation.replace(...)
//              */


//         } catch (e) {
//             Alert.alert('Error', 'Unable to save selection.');
//         } finally {
//             setLoading(false);
//         }
//     };

//     const Card = ({
//         title,
//         desc,
//         value,
//         badge,
//     }: {
//         title: string;
//         desc: string;
//         value: 'NEW' | 'OLD';
//         badge: string;
//     }) => {
//         const active = selected === value;

//         return (
//             <TouchableOpacity
//                 activeOpacity={0.92}
//                 style={[
//                     styles.optionCard,
//                     active && {
//                         borderColor: COLORS.primary,
//                         borderWidth: 2,
//                     },
//                 ]}
//                 onPress={() => setSelected(value)}>
//                 <View style={styles.iconCircle}>
//                     <Text style={styles.icon}>
//                         {value === 'NEW' ? '🚀' : '🛡️'}
//                     </Text>
//                 </View>

//                 <View style={{ flex: 1 }}>
//                     <Text style={styles.optionTitle}>{title}</Text>

//                     <Text style={styles.optionDesc}>{desc}</Text>

//                     <View style={styles.badge}>
//                         <Text style={styles.badgeText}>{badge}</Text>
//                     </View>
//                 </View>

//                 <View
//                     style={[
//                         styles.radio,
//                         active && {
//                             backgroundColor: COLORS.primary,
//                             borderColor: COLORS.primary,
//                         },
//                     ]}>
//                     {active && <View style={styles.radioInner} />}
//                 </View>
//             </TouchableOpacity>
//         );
//     };

//     const goBack = () => {
//         if (router.canGoBack()) router.back();
//         else router.replace('/');
//     };

//     return (
//         // <SafeAreaView style={styles.container}>
//         <ScrollView
//             style={styles.container}
//             showsVerticalScrollIndicator={false}
//         >
//             <StatusBar
//                 barStyle="light-content"
//                 backgroundColor={COLORS.dark}
//             />

//             {/* HEADER */}

//             <View style={styles.header}>
//                 <View style={styles.topRow}>
//                     <TouchableOpacity
//                         activeOpacity={0.9}
//                         onPress={goBack}
//                         style={styles.backButton}
//                     >
//                         <Icon
//                             name="arrow-back-ios-new"
//                             size={18}
//                             color={COLORS.white}
//                         />

//                         <Text style={styles.backText}>Back</Text>
//                     </TouchableOpacity>

//                     <Text
//                         numberOfLines={1}
//                         adjustsFontSizeToFit
//                         style={styles.brand}
//                     >
//                         MADHUSUDHAN FABRICS
//                     </Text>

//                     {/* Right Side Spacer */}
//                     <View style={{ width: 70 }} />
//                 </View>

//                 <Text style={styles.heading}>
//                     Select ERP Platform
//                 </Text>

//                 <Text style={styles.subtitle}>
//                     Choose which business system you want to use.
//                     You can change this later from Settings.
//                 </Text>
//             </View>

//             {/* CONTENT */}

//             <View style={styles.content}>

//                 {/* <View style={styles.infoCard}>
//                     <Text style={styles.infoTop}>
//                         MOBILE PLATFORM
//                     </Text>

//                     <Text style={styles.infoTitle}>
//                         Business Lookup Selection
//                     </Text>

//                     <Text style={styles.infoDesc}>
//                         Select the ERP platform that should power your
//                         application experience.
//                     </Text>
//                 </View> */}

//                 <Card
//                     title="Legacy ERP System"
//                     desc="Use the existing ERP environment for compatibility with older workflows."
//                     value="OLD"
//                     badge="Recommended"
//                 />


//                 <Card
//                     title="New ERP System"
//                     desc="Latest platform with improved performance, modern UI and enhanced features."
//                     value="NEW"
//                     badge="Classic"
//                 />

//                 <TouchableOpacity
//                     activeOpacity={0.9}
//                     onPress={saveSelection}
//                     disabled={loading}
//                     style={styles.button}>
//                     <Text style={styles.buttonText}>
//                         {loading ? 'Saving...' : 'Continue'}
//                     </Text>
//                 </TouchableOpacity>

//                 <View style={styles.footer}>
//                     <View style={styles.dot} />

//                     <Text style={styles.footerText}>
//                         Your selection will be securely stored on this
//                         device.
//                     </Text>
//                 </View>

//             </View>
//         </ScrollView>
//     );
// };

// export default LookupSelectionScreen;

// const styles = StyleSheet.create({
//     container: {
//         flex: 1,
//         backgroundColor: COLORS.background,
//     },

//     header: {
//         backgroundColor: COLORS.dark,
//         paddingHorizontal: 26,
//         paddingTop: Platform.OS === 'android' ? 40 : 70,
//         paddingBottom: 90,
//     },

//     heading: {
//         color: COLORS.white,
//         fontSize: 34,
//         fontWeight: '800',
//     },

//     subtitle: {
//         color: '#B8B8B8',
//         marginTop: 15,
//         lineHeight: 23,
//         fontSize: 15,
//     },

//     content: {
//         flex: 1,
//         marginTop: -55,
//         paddingHorizontal: 22,
//     },

//     infoCard: {
//         backgroundColor: COLORS.white,
//         borderRadius: 26,
//         padding: 22,

//         shadowColor: '#000',

//         shadowOpacity: 0.09,
//         shadowRadius: 15,
//         shadowOffset: {
//             width: 0,
//             height: 8,
//         },

//         elevation: 8,
//         marginBottom: 25,
//     },

//     infoTop: {
//         color: COLORS.primary,
//         fontSize: 12,
//         fontWeight: '800',
//         letterSpacing: 2,
//     },

//     infoTitle: {
//         marginTop: 8,
//         fontSize: 26,
//         fontWeight: '800',
//         color: COLORS.text,
//     },

//     infoDesc: {
//         marginTop: 8,
//         fontSize: 15,
//         color: COLORS.subText,
//         lineHeight: 22,
//     },

//     optionCard: {
//         backgroundColor: COLORS.white,
//         borderRadius: 24,
//         padding: 18,
//         flexDirection: 'row',
//         alignItems: 'center',
//         marginBottom: 18,

//         borderWidth: 1,
//         borderColor: COLORS.border,

//         shadowColor: '#000',

//         shadowOpacity: 0.05,

//         shadowRadius: 10,

//         shadowOffset: {
//             width: 0,
//             height: 6,
//         },

//         elevation: 5,
//     },

//     iconCircle: {
//         width: 62,
//         height: 62,
//         borderRadius: 31,
//         backgroundColor: '#FFF3E4',
//         justifyContent: 'center',
//         alignItems: 'center',
//         marginRight: 16,
//     },

//     icon: {
//         fontSize: 28,
//     },

//     optionTitle: {
//         fontSize: 18,
//         fontWeight: '800',
//         color: COLORS.text,
//     },

//     optionDesc: {
//         marginTop: 5,
//         color: COLORS.subText,
//         lineHeight: 20,
//         fontSize: 14,
//     },

//     badge: {
//         marginTop: 12,
//         alignSelf: 'flex-start',
//         backgroundColor: '#FFF2E1',
//         paddingHorizontal: 12,
//         paddingVertical: 6,
//         borderRadius: 20,
//     },

//     badgeText: {
//         color: COLORS.primary,
//         fontWeight: '700',
//         fontSize: 12,
//     },

//     radio: {
//         width: 28,
//         height: 28,
//         borderRadius: 14,
//         borderWidth: 2,
//         borderColor: '#C9C9C9',
//         justifyContent: 'center',
//         alignItems: 'center',
//         marginLeft: 15,
//     },

//     radioInner: {
//         width: 12,
//         height: 12,
//         borderRadius: 6,
//         backgroundColor: COLORS.white,
//     },

//     button: {
//         backgroundColor: COLORS.primary,
//         height: 60,
//         borderRadius: 18,
//         justifyContent: 'center',
//         alignItems: 'center',
//         marginTop: 18,

//         shadowColor: COLORS.primary,

//         shadowOpacity: 0.35,

//         shadowRadius: 15,

//         shadowOffset: {
//             width: 0,
//             height: 8,
//         },

//         elevation: 10,
//     },

//     buttonText: {
//         color: COLORS.white,
//         fontSize: 18,
//         fontWeight: '800',
//     },

//     footer: {
//         marginTop: 25,
//         backgroundColor: COLORS.white,
//         borderRadius: 18,
//         padding: 18,
//         flexDirection: 'row',
//         alignItems: 'flex-start',
//     },

//     dot: {
//         width: 10,
//         height: 10,
//         borderRadius: 5,
//         backgroundColor: COLORS.success,
//         marginTop: 5,
//         marginRight: 12,
//     },

//     footerText: {
//         flex: 1,
//         fontSize: 14,
//         color: COLORS.subText,
//         lineHeight: 20,
//     },

//     topRow: {
//         flexDirection: 'row',
//         alignItems: 'center',
//         justifyContent: 'space-between',
//         marginBottom: 30,
//     },

//     backButton: {
//         flexDirection: 'row',
//         alignItems: 'center',
//         width: 70,
//     },

//     backText: {
//         color: COLORS.white,
//         fontSize: 15,
//         marginLeft: 4,
//         fontWeight: '600',
//     },

//     brand: {
//         flex: 1,
//         textAlign: 'center',
//         color: '#B6B6B6',
//         fontSize: 13,
//         fontWeight: '700',
//         letterSpacing: 2,
//         paddingHorizontal: 10,
//     },
// });
import Icon from '@expo/vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    Alert,
    Dimensions,
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

const { width } = Dimensions.get('window');

const COLORS = {
    background: '#F6F4F1',
    dark: '#111111',
    white: '#FFFFFF',
    primary: '#C87516',
    primaryDark: '#A35F0F',
    border: '#ECECEC',
    text: '#202020',
    subText: '#707070',
    success: '#2BA84A',
    warning: '#FF0000', // Red color for "Under Development"
};

const STORAGE_KEY = 'LOOKUP_PLATFORM';

const LookupSelectionScreen = () => {
    const router = useRouter();
    const [selected, setSelected] = useState<'NEW' | 'OLD' | null>('OLD');
    const [loading, setLoading] = useState(false);

    const saveSelection = async () => {
        if (!selected) {
            Alert.alert('Selection Required', 'Please select a system to continue.');
            return;
        }

        try {
            setLoading(true);
            await AsyncStorage.setItem(STORAGE_KEY, selected);

            if (selected === 'NEW') {
                router.push('/new');
            } else {
                router.push('/(auth)/login');
            }
        } catch (e) {
            Alert.alert('Error', 'Unable to save selection.');
        } finally {
            setLoading(false);
        }
    };

    // const Card = ({
    //     title,
    //     desc,
    //     value,
    //     badge,
    //     isUnderDevelopment = false,
    // }: {
    //     title: string;
    //     desc: string;
    //     value: 'NEW' | 'OLD';
    //     badge: string;
    //     isUnderDevelopment?: boolean;
    // }) => {
    //     const active = selected === value;

    //     return (
    //         <TouchableOpacity
    //             activeOpacity={0.92}
    //             style={[
    //                 styles.optionCard,
    //                 active && {
    //                     borderColor: COLORS.primary,
    //                     borderWidth: 2,
    //                 },
    //             ]}
    //             onPress={() => setSelected(value)}>
    //             <View style={styles.iconCircle}>
    //                 <Icon
    //                     name={value === 'NEW' ? 'rocket-launch' : 'shield'}
    //                     size={28}
    //                     color={COLORS.primary}
    //                 />
    //             </View>

    //             <View style={{ flex: 1 }}>
    //                 <Text style={styles.optionTitle}>{title}</Text>
    //                 <Text style={styles.optionDesc}>{desc}</Text>

    //                 {isUnderDevelopment && (
    //                     <Text style={styles.underDevelopmentText}>
    //                         Under Development | Only for Sudamo Users
    //                     </Text>
    //                 )}

    //                 <View style={styles.badge}>
    //                     <Text style={styles.badgeText}>{badge}</Text>
    //                 </View>
    //             </View>

    //             <View
    //                 style={[
    //                     styles.radio,
    //                     active && {
    //                         backgroundColor: COLORS.primary,
    //                         borderColor: COLORS.primary,
    //                     },
    //                 ]}>
    //                 {active && <View style={styles.radioInner} />}
    //             </View>
    //         </TouchableOpacity>
    //     );
    // };

    const Card = ({
        title,
        desc,
        value,
        badge,
        isUnderDevelopment = false,
    }: {
        title: string;
        desc: string;
        value: 'NEW' | 'OLD';
        badge: string;
        isUnderDevelopment?: boolean;
    }) => {
        const active = selected === value;

        return (
            <TouchableOpacity
                activeOpacity={0.92}
                style={[
                    styles.optionCard,
                    active && {
                        borderColor: COLORS.primary,
                        borderWidth: 2,
                    },
                ]}
                onPress={() => setSelected(value)}>
                <View style={styles.iconCircle}>
                    <Icon
                        name={value === 'NEW' ? 'rocket-launch' : 'shield'}
                        size={28}
                        color={COLORS.primary}
                    />
                </View>

                <View style={{ flex: 1 }}>
                    <Text style={styles.optionTitle}>{title}</Text>
                    <Text style={styles.optionDesc}>{desc}</Text>

                    {isUnderDevelopment && (
                        <View style={styles.underDevelopmentBadge}>
                            <Icon
                                name="warning"
                                size={14}
                                color={COLORS.white}
                                style={{ marginRight: 5 }}
                            />
                            <Text style={styles.underDevelopmentText}>
                                Under Development | Only for Sudamo Users
                            </Text>
                        </View>
                    )}

                    <View style={styles.badge}>
                        <Text style={styles.badgeText}>{badge}</Text>
                    </View>
                </View>

                <View
                    style={[
                        styles.radio,
                        active && {
                            backgroundColor: COLORS.primary,
                            borderColor: COLORS.primary,
                        },
                    ]}>
                    {active && <View style={styles.radioInner} />}
                </View>
            </TouchableOpacity>
        );
    };

    const goBack = () => {
        if (router.canGoBack()) router.back();
        else router.replace('/');
    };

    return (
        <ScrollView
            style={styles.container}
            showsVerticalScrollIndicator={false}>
            <StatusBar
                barStyle="light-content"
                backgroundColor={COLORS.dark}
            />

            {/* HEADER */}
            <View style={styles.header}>
                <View style={styles.topRow}>
                    <TouchableOpacity
                        activeOpacity={0.9}
                        onPress={goBack}
                        style={styles.backButton}>
                        <Icon
                            name="arrow-back-ios-new"
                            size={18}
                            color={COLORS.white}
                        />
                        <Text style={styles.backText}>Back</Text>
                    </TouchableOpacity>

                    <Text
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        style={styles.brand}>
                        MADHUSUDHAN FABRICS
                    </Text>

                    <View style={{ width: 70 }} />
                </View>

                <Text style={styles.heading}>
                    Select ERP Platform
                </Text>

                <Text style={styles.subtitle}>
                    Choose which business system you want to use.
                    You can change this later from Settings.
                </Text>
            </View>

            {/* CONTENT */}
            <View style={styles.content}>
                <Card
                    title="Legacy ERP System"
                    desc="Use the existing ERP environment for compatibility with older workflows."
                    value="OLD"
                    badge="Recommended"
                />

                <Card
                    title="New ERP System"
                    desc="Latest platform with improved performance, modern UI and enhanced features."
                    value="NEW"
                    badge="Classic"
                    isUnderDevelopment={true}
                />

                <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={saveSelection}
                    disabled={loading}
                    style={styles.button}>
                    <Text style={styles.buttonText}>
                        {loading ? 'Saving...' : 'Continue'}
                    </Text>
                </TouchableOpacity>

                <View style={styles.footer}>
                    <View style={styles.dot} />
                    <Text style={styles.footerText}>
                        Your selection will be securely stored on this device.
                    </Text>
                </View>
            </View>
        </ScrollView>
    );
};

export default LookupSelectionScreen;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },

    header: {
        backgroundColor: COLORS.dark,
        paddingHorizontal: 26,
        paddingTop: Platform.OS === 'android' ? 40 : 70,
        paddingBottom: 90,
    },

    heading: {
        color: COLORS.white,
        fontSize: 34,
        fontWeight: '800',
    },

    subtitle: {
        color: '#B8B8B8',
        marginTop: 15,
        lineHeight: 23,
        fontSize: 15,
    },

    content: {
        flex: 1,
        marginTop: -55,
        paddingHorizontal: 22,
    },

    optionCard: {
        backgroundColor: COLORS.white,
        borderRadius: 24,
        padding: 18,
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 18,
        borderWidth: 1,
        borderColor: COLORS.border,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 10,
        shadowOffset: {
            width: 0,
            height: 6,
        },
        elevation: 5,
    },

    iconCircle: {
        width: 62,
        height: 62,
        borderRadius: 31,
        backgroundColor: '#FFF3E4',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },

    optionTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: COLORS.text,
    },

    optionDesc: {
        marginTop: 5,
        color: COLORS.subText,
        lineHeight: 20,
        fontSize: 14,
    },

    underDevelopmentText: {
        marginTop: 5,
        color: COLORS.warning,
        fontSize: 12,
        fontWeight: '600',
    },

    badge: {
        marginTop: 12,
        alignSelf: 'flex-start',
        backgroundColor: '#FFF2E1',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },

    badgeText: {
        color: COLORS.primary,
        fontWeight: '700',
        fontSize: 12,
    },

    radio: {
        width: 28,
        height: 28,
        borderRadius: 14,
        borderWidth: 2,
        borderColor: '#C9C9C9',
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 15,
    },

    radioInner: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: COLORS.white,
    },

    button: {
        backgroundColor: COLORS.primary,
        height: 60,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 18,
        shadowColor: COLORS.primary,
        shadowOpacity: 0.35,
        shadowRadius: 15,
        shadowOffset: {
            width: 0,
            height: 8,
        },
        elevation: 10,
    },

    buttonText: {
        color: COLORS.white,
        fontSize: 18,
        fontWeight: '800',
    },

    footer: {
        marginTop: 25,
        backgroundColor: COLORS.white,
        borderRadius: 18,
        padding: 18,
        flexDirection: 'row',
        alignItems: 'flex-start',
    },

    dot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: COLORS.success,
        marginTop: 5,
        marginRight: 12,
    },

    footerText: {
        flex: 1,
        fontSize: 14,
        color: COLORS.subText,
        lineHeight: 20,
    },

    topRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 30,
    },

    backButton: {
        flexDirection: 'row',
        alignItems: 'center',
        width: 70,
    },

    backText: {
        color: COLORS.white,
        fontSize: 15,
        marginLeft: 4,
        fontWeight: '600',
    },

    brand: {
        flex: 1,
        textAlign: 'center',
        color: '#B6B6B6',
        fontSize: 13,
        fontWeight: '700',
        letterSpacing: 2,
        paddingHorizontal: 10,
    },
});