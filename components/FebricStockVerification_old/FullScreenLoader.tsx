import React, { useEffect, useRef } from 'react';
import { View, Text, Modal, StyleSheet, ActivityIndicator, Animated } from 'react-native';
import Icon from '@expo/vector-icons/MaterialIcons';

const FullScreenLoader = () => {
    const pulse = useRef(new Animated.Value(0.96)).current;

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulse, { toValue: 1, duration: 650, useNativeDriver: true }),
                Animated.timing(pulse, { toValue: 0.96, duration: 650, useNativeDriver: true }),
            ])
        ).start();
    }, [pulse]);

    return (
        <Modal transparent visible animationType="fade" statusBarTranslucent>
            <View style={styles.overlay}>
                <Animated.View style={[styles.loaderCard, { transform: [{ scale: pulse }] }]}>
                    <View style={styles.iconCircle}>
                        <Icon name="sync" size={28} color="#087FA3" />
                    </View>
                    <Text style={styles.title}>Loading data</Text>
                    <Text style={styles.subtitle}>Please wait a moment...</Text>
                    <ActivityIndicator size="small" color="#087FA3" style={styles.spinner} />
                    <View style={styles.progressTrack}>
                        <View style={styles.progressFill} />
                    </View>
                </Animated.View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(16, 40, 47, 0.16)', justifyContent: 'center', alignItems: 'center', padding: 24 },
    loaderCard: {
        width: '88%', maxWidth: 330, backgroundColor: '#FFFFFF', borderRadius: 20,
        padding: 24, alignItems: 'center', elevation: 12,
        shadowColor: '#12333C', shadowOpacity: 0.18, shadowRadius: 18,
        shadowOffset: { width: 0, height: 8 }
    },
    iconCircle: { width: 58, height: 58, borderRadius: 29, backgroundColor: '#EAF6F9', justifyContent: 'center', alignItems: 'center', marginBottom: 13 },
    title: { fontSize: 18, fontWeight: '800', color: '#203238' },
    subtitle: { fontSize: 12.5, color: '#77848A', marginTop: 4 },
    spinner: { marginTop: 13, marginBottom: 12 },
    progressTrack: { width: '100%', height: 5, backgroundColor: '#E3E9EC', borderRadius: 4, overflow: 'hidden' },
    progressFill: { width: '58%', height: '100%', backgroundColor: '#087FA3', borderRadius: 4 },
});

export default FullScreenLoader;
