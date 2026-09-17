import React, { useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Icon from '@expo/vector-icons/MaterialIcons';
import axios from 'axios';
import FullScreenLoader from '../components/FullScreenLoader';
import * as Device from 'expo-device';
import { theme } from '../components/theme';

export default function AccessDeniedScreen({ fromInit = false }: { fromInit?: boolean }) {
    const router = useRouter();
    // const { fromInit } = useLocalSearchParams();

    const [isLoading, setIsLoading] = useState(false);

    const handleRetry = async () => {
        try {
            setIsLoading(true);

            const deviceId = Device.osInternalBuildId || "test-device";

            console.log("🔄 Retry checkdevice...");

            const res = await axios.post(
                "https://apig.tms-webapp.com/api/checkdevice",
                { deviceid: deviceId }
            );

            console.log("✅ Retry Response:", res.data);

            if (Number(res.data) === 1) {
                router.replace('/'); // OK (allowed now)
            } else {
                console.log("Still denied");
            }

        } catch (err) {
            console.log("❌ Retry Error:", err);
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return <FullScreenLoader message="Rechecking..." />;
    }

    return (
        <View style={styles.container}>

            <Icon name="block" size={80} color="#D32F2F" />

            <Text style={styles.title}>Access Denied</Text>

            <Text style={styles.desc}>
                Your device is not authorized to use this application.
                Please contact administrator.
            </Text>

            {/* 🔥 SHOW ONLY IF FROM INIT */}
            {fromInit == true && (
                <TouchableOpacity style={styles.retryBtn} onPress={handleRetry}>
                    <Icon name="refresh" size={22} color="#fff" />
                    <Text style={styles.retryText}>Retry</Text>
                </TouchableOpacity>
            )}

        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.NEUTRAL_BG,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 30,
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        color: theme.ERROR,
        marginTop: 15,
    },
    desc: {
        textAlign: 'center',
        color: theme.TEXT_SECONDARY,
        marginTop: 10,
        marginBottom: 30,
    },
    retryBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.BRAND_GRADIENT_START,
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 25,
    },
    retryText: {
        color: '#fff',
        marginLeft: 8,
        fontWeight: '600',
    },
});