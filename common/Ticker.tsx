import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, ViewStyle, TextStyle } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import theme from '../android/app/src/theme';

interface TickerProps {
    text: string;
    icon?: string;
    style?: ViewStyle;
    textStyle?: TextStyle;
    duration?: number;
}

const Ticker: React.FC<TickerProps> = ({
    text,
    icon = 'sync',
    style,
    textStyle,
    duration = 15000,
}) => {
    const [contentWidth, setContentWidth] = useState(0);
    const [containerWidth, setContainerWidth] = useState(0);
    const scrollPosition = useRef(new Animated.Value(0)).current;

    // Calculate how many duplicates are needed to fill the container
    const getDuplicateCount = () => {
        if (contentWidth === 0 || containerWidth === 0) return 1;
        return Math.ceil(containerWidth / contentWidth) + 1;
    };

    useEffect(() => {
        if (contentWidth > 0 && containerWidth > 0) {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(scrollPosition, {
                        toValue: -contentWidth,
                        duration,
                        useNativeDriver: true,
                    }),
                    Animated.timing(scrollPosition, {
                        toValue: 0,
                        duration: 0,
                        useNativeDriver: true,
                    }),
                ])
            ).start();
        }
    }, [contentWidth, containerWidth, duration]);

    return (
        <View
            style={[styles.container, style]}
            onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
        >
            <Animated.View
                style={{
                    flexDirection: 'row',
                    transform: [{ translateX: scrollPosition }],
                    // transform: [
                    //     {
                    //         translateX: Animated.modulo(
                    //             scrollPosition,
                    //             contentWidth // Reset position modulo contentWidth
                    //         ),
                    //     },
                    // ],
                }}
            >
                {Array(getDuplicateCount())
                    .fill(0)
                    .map((_, index) => (
                        <View
                            key={index}
                            style={styles.contentContainer}
                            onLayout={(e) => index === 0 && setContentWidth(e.nativeEvent.layout.width)}
                        >
                            {icon && (
                                <Icon
                                    name={icon}
                                    size={16}
                                    color={theme.TEXT_WHITE}
                                    style={styles.icon}
                                />
                            )}
                            <Text style={[styles.text, textStyle]}>
                                {text}
                            </Text>
                        </View>
                    ))}
            </Animated.View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: '100%',
        overflow: 'hidden',
        paddingVertical: 8,
    },
    contentContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-start',
        paddingHorizontal: 16,
        flexShrink: 0,
    },
    icon: {
        marginRight: 8,
    },
    text: {
        color: theme.TEXT_WHITE,
        fontSize: 12,
        fontFamily: theme.FONT_FAMILY_SEMIBOLD_ITALIC,
        textShadowColor: 'rgba(0, 0, 0, 0.2)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 1,
        letterSpacing: 0.5,
    },
});

export default Ticker;
