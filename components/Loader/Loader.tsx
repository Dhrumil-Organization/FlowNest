// components/Loader.tsx
import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import theme from '../../android/app/src/theme';

const Loader = ({ message = "Loading..." }) => (
    <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color={theme.BRAND_GRADIENT_END} />
        <Text style={styles.loaderText}>{message}</Text>
    </View>
);

const styles = StyleSheet.create({
    loaderContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1000,
    },
    loaderText: {
        marginTop: 10,
        fontSize: 16,
    },
});

export default Loader;
