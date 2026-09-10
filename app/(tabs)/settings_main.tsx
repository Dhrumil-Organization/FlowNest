import AppAlert from '@/common/utils/appAlert';
// import { clearAllAppDatabases, clearAllChatDatabases, clearAllMasterDatabases } from '@/common/utils/dbCleaner';
// import { theme } from '@/components/theme';
// import Icon from '@expo/vector-icons/MaterialIcons';
// import { LinearGradient } from 'expo-linear-gradient';
// import { useRouter } from 'expo-router';
// import React from 'react';
// import {
//     Alert,
//     StyleSheet,
//     Text,
//     TouchableOpacity,
//     View
// } from 'react-native';

// export default function SettingsScreen() {
//     const router = useRouter();

//     const confirmAction = (title: string, action: () => Promise<boolean>) => {
//         AppAlert.alert(
//             title,
//             "Are you sure?",
//             [
//                 { text: "Cancel", style: "cancel" },
//                 {
//                     text: "Confirm",
//                     style: "destructive",
//                     onPress: async () => {
//                         const res = await action();
//                         if (res) {
//                             AppAlert.alert(
//                                 "Success",
//                                 `${title} completed successfully`,
//                                 [
//                                     {
//                                         text: "OK",
//                                         style: "default"
//                                     }
//                                 ]
//                             );
//                         } else {
//                             AppAlert.alert(
//                                 "Error",
//                                 `Something went wrong `,
//                                 [
//                                     {
//                                         text: "OK",
//                                         style: "default"
//                                     }
//                                 ]
//                             );
//                         }
//                     }
//                 }
//             ]
//         );
//     };

//     return (
//         <View style={styles.container}>

//             {/* HEADER */}
//             <LinearGradient
//                 colors={[theme.BRAND_GRADIENT_START, theme.BRAND_GRADIENT_END]}
//                 style={styles.header}
//             >
//                 {/* <Text style={styles.headerText}>Settings</Text> */}
//                 <View style={styles.breadcrumb}>
//                     <TouchableOpacity onPress={() => router.replace('/')}>
//                         <Text style={styles.breadcrumbLink}>Home</Text>
//                     </TouchableOpacity>

//                     <Text style={styles.breadcrumbSeparator}>›</Text>

//                     <Text style={styles.breadcrumbCurrent}>{'Settings'}</Text>
//                 </View>
//             </LinearGradient>
//             {/* <Header breadcrumb={'settings'}/> */}

//             {/* CARD */}
//             <View style={styles.card}>

//                 {/* 🔴 ALL CLEAR */}
//                 <TouchableOpacity
//                     style={styles.row}
//                     onPress={() => confirmAction(
//                         "Clear All Cache + Chat",
//                         clearAllAppDatabases
//                     )}
//                 >
//                     <Icon name="delete-forever" size={24} color={theme.ERROR} />
//                     <Text style={styles.text}>Clear All (Cache + Chat)</Text>
//                 </TouchableOpacity>

//                 {/* 🟡 CHAT ONLY */}
//                 <TouchableOpacity
//                     style={styles.row}
//                     onPress={() => confirmAction(
//                         "Clear Chat Only",
//                         async () => {
//                             return await clearAllChatDatabases();
//                         }
//                     )}
//                 >
//                     <Icon name="chat" size={24} color="#FFA000" />
//                     <Text style={styles.text}>Clear Chat Only</Text>
//                 </TouchableOpacity>

//                 {/* 🔵 CACHE ONLY */}
//                 <TouchableOpacity
//                     style={styles.row}
//                     onPress={() => confirmAction(
//                         "Clear Cache Only",
//                         async () => {
//                             return await clearAllMasterDatabases();
//                         }
//                     )}
//                 >
//                     <Icon name="storage" size={24} color="#1976D2" />
//                     <Text style={styles.text}>Clear Cache Only</Text>
//                 </TouchableOpacity>

//             </View>

//         </View>
//     );
// }

// const styles = StyleSheet.create({
//     container: {
//         flex: 1,
//         backgroundColor: theme.NEUTRAL_BG,
//     },

//     header: {
//         padding: 20,
//         paddingTop: 60,
//         borderBottomLeftRadius: 20,
//         borderBottomRightRadius: 20,
//     },

//     headerText: {
//         color: theme.TEXT_WHITE,
//         fontSize: 22,
//         fontFamily: theme.FONT_FAMILY_BOLD,
//     },

//     card: {
//         backgroundColor: theme.SURFACE,
//         margin: 20,
//         borderRadius: 16,
//         paddingVertical: 10,
//         shadowColor: theme.SHADOW,
//         shadowOpacity: 0.3,
//         shadowRadius: 10,
//         elevation: 4,
//     },

//     row: {
//         flexDirection: 'row',
//         alignItems: 'center',
//         padding: 16,
//         borderBottomWidth: 1,
//         borderColor: theme.BORDER,
//     },

//     text: {
//         marginLeft: 15,
//         fontSize: 16,
//         color: theme.TEXT_PRIMARY,
//         fontFamily: theme.FONT_FAMILY_MEDIUM,
//     },
//     // 
//     breadcrumb: {
//         flexDirection: 'row',
//         alignItems: 'center',
//         marginTop: 8
//     },
//     breadcrumbLink: {
//         color: '#fff',
//         fontSize: 13,
//         opacity: 0.9
//     },
//     breadcrumbSeparator: {
//         color: '#fff',
//         marginHorizontal: 6
//     },
//     breadcrumbCurrent: {
//         color: '#fff',
//         fontWeight: '600',
//         fontSize: 13
//     },
// });

import {
    clearAllAppDatabases,
    clearAllChatDatabases,
    clearAllMasterDatabases
} from '@/common/utils/dbCleaner';
import { theme } from '@/components/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import AsyncStorage from '@/common/utils/compatibleStorage';
import * as Clipboard from 'expo-clipboard';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

export default function SettingsScreen() {
    const router = useRouter();

    const [notificationToken, setNotificationToken] = useState('');

    // 🔔 Load notification token from cache
    useEffect(() => {
        const loadNotificationToken = async () => {
            try {
                const token =
                    await AsyncStorage.getItem('notification_token');

                setNotificationToken(token || '');

                console.log(
                    '🔔 Cached notification token:',
                    token
                );
            } catch (error) {
                console.error(
                    '❌ Failed to load notification token:',
                    error
                );
            }
        };

        loadNotificationToken();
    }, []);

    // 📋 Copy notification token
    const copyNotificationToken = async () => {
        if (!notificationToken) {
            AppAlert.alert(
                'Notification Token',
                'No notification token found.'
            );
            return;
        }

        try {
            await Clipboard.setStringAsync(notificationToken);

            AppAlert.alert(
                'Copied',
                'Notification token copied to clipboard.'
            );
        } catch (error) {
            console.error(
                '❌ Copy token error:',
                error
            );
        }
    };

    const confirmAction = (
        title: string,
        action: () => Promise<boolean>
    ) => {
        AppAlert.alert(
            title,
            'Are you sure?',
            [
                {
                    text: 'Cancel',
                    style: 'cancel'
                },
                {
                    text: 'Confirm',
                    style: 'destructive',
                    onPress: async () => {
                        const res = await action();

                        if (res) {
                            AppAlert.alert(
                                'Success',
                                `${title} completed successfully`,
                                [
                                    {
                                        text: 'OK',
                                        style: 'default'
                                    }
                                ]
                            );
                        } else {
                            AppAlert.alert(
                                'Error',
                                'Something went wrong',
                                [
                                    {
                                        text: 'OK',
                                        style: 'default'
                                    }
                                ]
                            );
                        }
                    }
                }
            ]
        );
    };

    return (
        <View style={styles.container}>

            {/* HEADER */}
            <LinearGradient
                colors={[
                    theme.BRAND_GRADIENT_START,
                    theme.BRAND_GRADIENT_END
                ]}
                style={styles.header}
            >
                <View style={styles.breadcrumb}>
                    <TouchableOpacity
                        onPress={() => router.replace('/')}
                    >
                        <Text style={styles.breadcrumbLink}>
                            Home
                        </Text>
                    </TouchableOpacity>

                    <Text style={styles.breadcrumbSeparator}>
                        ›
                    </Text>

                    <Text style={styles.breadcrumbCurrent}>
                        Settings
                    </Text>
                </View>
            </LinearGradient>

            {/* CARD */}
            <View style={styles.card}>

                {/* 🔴 ALL CLEAR */}
                <TouchableOpacity
                    style={styles.row}
                    onPress={() =>
                        confirmAction(
                            'Clear All Cache + Chat',
                            clearAllAppDatabases
                        )
                    }
                >
                    <Icon
                        name="delete-forever"
                        size={24}
                        color={theme.ERROR}
                    />

                    <Text style={styles.text}>
                        Clear All (Cache + Chat)
                    </Text>
                </TouchableOpacity>


                {/* 🟡 CHAT ONLY */}
                <TouchableOpacity
                    style={styles.row}
                    onPress={() =>
                        confirmAction(
                            'Clear Chat Only',
                            async () => {
                                return await clearAllChatDatabases();
                            }
                        )
                    }
                >
                    <Icon
                        name="chat"
                        size={24}
                        color="#FFA000"
                    />

                    <Text style={styles.text}>
                        Clear Chat Only
                    </Text>
                </TouchableOpacity>


                {/* 🔵 CACHE ONLY */}
                <TouchableOpacity
                    style={styles.row}
                    onPress={() =>
                        confirmAction(
                            'Clear Cache Only',
                            async () => {
                                return await clearAllMasterDatabases();
                            }
                        )
                    }
                >
                    <Icon
                        name="storage"
                        size={24}
                        color="#1976D2"
                    />

                    <Text style={styles.text}>
                        Clear Cache Only
                    </Text>
                </TouchableOpacity>


                {/* 🔔 NOTIFICATION TOKEN */}
                <View style={styles.notificationSection}>

                    <View style={styles.notificationHeader}>
                        <View style={styles.notificationTitleRow}>
                            <Icon
                                name="notifications"
                                size={22}
                                color={theme.BRAND_GRADIENT_END}
                            />

                            <Text style={styles.notificationTitle}>
                                Notification Token
                            </Text>
                        </View>

                        <TouchableOpacity
                            style={styles.copyButton}
                            onPress={copyNotificationToken}
                        >
                            <Icon
                                name="content-copy"
                                size={18}
                                color="#fff"
                            />

                            <Text style={styles.copyText}>
                                Copy
                            </Text>
                        </TouchableOpacity>
                    </View>


                    {/* TOKEN BOX */}
                    <View style={styles.tokenBox}>
                        <Text
                            style={styles.tokenText}
                            selectable={true}
                            numberOfLines={0}
                        >
                            {notificationToken ||
                                'No notification token available'}
                        </Text>
                    </View>

                </View>

            </View>

        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.NEUTRAL_BG,
    },

    header: {
        padding: 20,
        paddingTop: 60,
        borderBottomLeftRadius: 20,
        borderBottomRightRadius: 20,
    },

    headerText: {
        color: theme.TEXT_WHITE,
        fontSize: 22,
        fontFamily: theme.FONT_FAMILY_BOLD,
    },

    card: {
        backgroundColor: theme.SURFACE,
        margin: 20,
        borderRadius: 16,
        paddingVertical: 10,
        shadowColor: theme.SHADOW,
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 4,
    },

    row: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderColor: theme.BORDER,
    },

    text: {
        marginLeft: 15,
        fontSize: 16,
        color: theme.TEXT_PRIMARY,
        fontFamily: theme.FONT_FAMILY_MEDIUM,
    },

    /* 🔔 NOTIFICATION TOKEN */

    notificationSection: {
        padding: 16,
        borderTopWidth: 1,
        borderColor: theme.BORDER,
    },

    notificationHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
    },

    notificationTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },

    notificationTitle: {
        marginLeft: 10,
        fontSize: 16,
        color: theme.TEXT_PRIMARY,
        fontFamily: theme.FONT_FAMILY_MEDIUM,
    },

    copyButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.BRAND_GRADIENT_END,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 10,
    },

    copyText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '600',
        marginLeft: 5,
    },

    tokenBox: {
        backgroundColor: '#F5F8FA',
        borderRadius: 12,
        padding: 12,
        borderWidth: 1,
        borderColor: theme.BORDER,
    },

    tokenText: {
        fontSize: 12,
        color: theme.TEXT_SECONDARY,
        lineHeight: 18,
    },

    // Breadcrumb
    breadcrumb: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
    },

    breadcrumbLink: {
        color: '#fff',
        fontSize: 13,
        opacity: 0.9,
    },

    breadcrumbSeparator: {
        color: '#fff',
        marginHorizontal: 6,
    },

    breadcrumbCurrent: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 13,
    },
});
