import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Modal, Text, Animated, Easing, Dimensions } from "react-native";

interface AILoadingProps {
    visible: boolean;
}

const { width } = Dimensions.get("window");
const size = width * 0.25;

const AILoading: React.FC<AILoadingProps> = ({ visible }) => {

    const rotate1 = useRef(new Animated.Value(0)).current;
    const rotate2 = useRef(new Animated.Value(0)).current;
    const scale1 = useRef(new Animated.Value(1)).current;
    const scale2 = useRef(new Animated.Value(1)).current;
    const pulse = useRef(new Animated.Value(1)).current;
    const fade1 = useRef(new Animated.Value(0.3)).current;
    const fade2 = useRef(new Animated.Value(0.3)).current;

    useEffect(() => {

        // Slow outer ring rotation
        Animated.loop(
            Animated.timing(rotate1, {
                toValue: 1,
                duration: 8000,
                easing: Easing.linear,
                useNativeDriver: true
            })
        ).start();

        // Fast inner ring rotation (opposite direction)
        Animated.loop(
            Animated.timing(rotate2, {
                toValue: 1,
                duration: 4000,
                easing: Easing.linear,
                useNativeDriver: true
            })
        ).start();

        // Pulsing scale animation for rings
        Animated.loop(
            Animated.sequence([
                Animated.parallel([
                    Animated.timing(scale1, {
                        toValue: 1.2,
                        duration: 1500,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: true
                    }),
                    Animated.timing(fade1, {
                        toValue: 0.8,
                        duration: 1500,
                        useNativeDriver: true
                    })
                ]),
                Animated.parallel([
                    Animated.timing(scale1, {
                        toValue: 1,
                        duration: 1500,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: true
                    }),
                    Animated.timing(fade1, {
                        toValue: 0.3,
                        duration: 1500,
                        useNativeDriver: true
                    })
                ])
            ])
        ).start();

        // Second ring animation with delay
        Animated.loop(
            Animated.sequence([
                Animated.delay(750),
                Animated.parallel([
                    Animated.timing(scale2, {
                        toValue: 1.15,
                        duration: 1500,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: true
                    }),
                    Animated.timing(fade2, {
                        toValue: 0.7,
                        duration: 1500,
                        useNativeDriver: true
                    })
                ]),
                Animated.parallel([
                    Animated.timing(scale2, {
                        toValue: 1,
                        duration: 1500,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: true
                    }),
                    Animated.timing(fade2, {
                        toValue: 0.3,
                        duration: 1500,
                        useNativeDriver: true
                    })
                ])
            ])
        ).start();

        // Core pulse animation
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulse, {
                    toValue: 1.1,
                    duration: 1000,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true
                }),
                Animated.timing(pulse, {
                    toValue: 1,
                    duration: 1000,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true
                })
            ])
        ).start();

    }, []);

    const spin1 = rotate1.interpolate({
        inputRange: [0, 1],
        outputRange: ["0deg", "360deg"]
    });

    const spin2 = rotate2.interpolate({
        inputRange: [0, 1],
        outputRange: ["360deg", "0deg"]
    });

    if (!visible) return null;

    return (
        <Modal transparent animationType="fade" visible={visible}>
            <View style={styles.overlay}>
                <View style={styles.container}>

                    {/* Background blur effect */}
                    <View style={styles.blurBackground} />

                    {/* Outer ring - Light blue */}
                    <Animated.View
                        style={[
                            styles.outerRing,
                            {
                                transform: [
                                    { rotate: spin1 },
                                    { scale: scale1 }
                                ],
                                opacity: fade1,
                                borderColor: "#4ECDC4"
                            }
                        ]}
                    />

                    {/* Second ring - Primary color */}
                    <Animated.View
                        style={[
                            styles.middleRing,
                            {
                                transform: [
                                    { rotate: spin2 },
                                    { scale: scale2 }
                                ],
                                opacity: fade2,
                                borderColor: "#0A7EA4"
                            }
                        ]}
                    />

                    {/* Inner ring - White with primary tint */}
                    <Animated.View
                        style={[
                            styles.innerRing,
                            {
                                transform: [{ rotate: spin1 }],
                                borderColor: "#E1F5FE"
                            }
                        ]}
                    />

                    {/* Dots around the circle */}
                    {[...Array(8)].map((_, i) => (
                        <Animated.View
                            key={i}
                            style={[
                                styles.dot,
                                {
                                    transform: [
                                        { rotate: `${i * 45}deg` },
                                        { translateY: -size * 0.6 }
                                    ],
                                    opacity: pulse.interpolate({
                                        inputRange: [1, 1.1],
                                        outputRange: [0.3, 0.8]
                                    })
                                }
                            ]}
                        />
                    ))}

                    {/* Center core with gradient effect */}
                    <Animated.View
                        style={[
                            styles.core,
                            {
                                transform: [{ scale: pulse }]
                            }
                        ]}
                    >
                        <View style={styles.coreInner}>
                            <Text style={styles.text}>AI</Text>
                            <View style={styles.pulseRing} />
                        </View>
                    </Animated.View>

                    {/* Loading text with fade animation */}
                    <Animated.View style={[styles.textContainer, { opacity: fade1 }]}>
                        <Text style={styles.loadingText}>Syncing</Text>
                        <View style={styles.dotContainer}>
                            <Animated.View style={[styles.loadingDot, { opacity: pulse }]} />
                            <Animated.View style={[styles.loadingDot, { opacity: pulse }]} />
                            <Animated.View style={[styles.loadingDot, { opacity: pulse }]} />
                        </View>
                    </Animated.View>

                </View>
            </View>
        </Modal>
    );
};

export default AILoading;

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: "rgba(255,255,255,0.95)",
        justifyContent: "center",
        alignItems: "center"
    },
    container: {
        justifyContent: "center",
        alignItems: "center",
        width: size * 3,
        height: size * 3
    },
    blurBackground: {
        position: "absolute",
        width: "100%",
        height: "100%",
        backgroundColor: "rgba(255,255,255,0.5)",
        borderRadius: 200
    },
    outerRing: {
        position: "absolute",
        width: size * 2.2,
        height: size * 2.2,
        borderRadius: size * 1.1,
        borderWidth: 2,
        borderColor: "#4ECDC4",
        borderTopColor: "transparent",
        borderRightColor: "transparent"
    },
    middleRing: {
        position: "absolute",
        width: size * 1.8,
        height: size * 1.8,
        borderRadius: size * 0.9,
        borderWidth: 2.5,
        borderColor: "#0A7EA4",
        borderBottomColor: "transparent",
        borderLeftColor: "transparent"
    },
    innerRing: {
        position: "absolute",
        width: size * 1.4,
        height: size * 1.4,
        borderRadius: size * 0.7,
        borderWidth: 1.5,
        borderColor: "#E1F5FE",
        borderTopColor: "transparent",
        borderRightColor: "transparent"
    },
    dot: {
        position: "absolute",
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: "#0A7EA4"
    },
    core: {
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: "#0A7EA4",
        justifyContent: "center",
        alignItems: "center",
        shadowColor: "#0A7EA4",
        shadowOpacity: 0.4,
        shadowRadius: 20,
        shadowOffset: { width: 0, height: 0 },
        elevation: 10
    },
    coreInner: {
        width: size * 0.7,
        height: size * 0.7,
        borderRadius: size * 0.35,
        backgroundColor: "#fff",
        justifyContent: "center",
        alignItems: "center",
        shadowColor: "#000",
        shadowOpacity: 0.1,
        shadowRadius: 5,
        shadowOffset: { width: 0, height: 2 },
        elevation: 3
    },
    pulseRing: {
        position: "absolute",
        width: "100%",
        height: "100%",
        borderRadius: size * 0.35,
        borderWidth: 2,
        borderColor: "#0A7EA4",
        opacity: 0.3
    },
    text: {
        color: "#0A7EA4",
        fontSize: size * 0.25,
        fontWeight: "700",
        letterSpacing: 1
    },
    textContainer: {
        position: "absolute",
        bottom: -40,
        flexDirection: "row",
        alignItems: "center"
    },
    loadingText: {
        color: "#666",
        fontSize: 16,
        fontWeight: "500",
        marginRight: 4
    },
    dotContainer: {
        flexDirection: "row",
        alignItems: "center"
    },
    loadingDot: {
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: "#0A7EA4",
        marginHorizontal: 2
    }
});