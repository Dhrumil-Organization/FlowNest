import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Modal, Text, Animated, Easing, Dimensions } from "react-native";

interface AILoadingProps {
    visible: boolean;
}

const { width } = Dimensions.get("window");
const size = width * 0.28;

const AILoading: React.FC<AILoadingProps> = ({ visible }) => {

    const rotate1 = useRef(new Animated.Value(0)).current;
    const rotate2 = useRef(new Animated.Value(0)).current;
    const pulse = useRef(new Animated.Value(1)).current;
    const glow = useRef(new Animated.Value(0.5)).current;

    useEffect(() => {

        Animated.loop(
            Animated.timing(rotate1, {
                toValue: 1,
                duration: 6000,
                easing: Easing.linear,
                useNativeDriver: true
            })
        ).start();

        Animated.loop(
            Animated.timing(rotate2, {
                toValue: 1,
                duration: 4000,
                easing: Easing.linear,
                useNativeDriver: true
            })
        ).start();

        Animated.loop(
            Animated.sequence([
                Animated.timing(pulse, {
                    toValue: 1.15,
                    duration: 900,
                    useNativeDriver: true
                }),
                Animated.timing(pulse, {
                    toValue: 1,
                    duration: 900,
                    useNativeDriver: true
                })
            ])
        ).start();

        Animated.loop(
            Animated.sequence([
                Animated.timing(glow, {
                    toValue: 1,
                    duration: 1200,
                    useNativeDriver: true
                }),
                Animated.timing(glow, {
                    toValue: 0.4,
                    duration: 1200,
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

        <Modal transparent animationType="fade">

            <View style={styles.overlay}>

                <View style={styles.container}>

                    {/* Outer neon ring */}
                    <Animated.View
                        style={[
                            styles.outerRing,
                            { transform: [{ rotate: spin1 }] }
                        ]}
                    />

                    {/* middle ring */}
                    <Animated.View
                        style={[
                            styles.middleRing,
                            { transform: [{ rotate: spin2 }] }
                        ]}
                    />

                    {/* glow aura */}
                    <Animated.View
                        style={[
                            styles.glowRing,
                            { opacity: glow }
                        ]}
                    />

                    {/* center AI core */}
                    <Animated.View
                        style={[
                            styles.core,
                            { transform: [{ scale: pulse }] }
                        ]}
                    >
                        <Text style={styles.text}>Syncing...</Text>
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
        backgroundColor: "rgba(0,0,0,0.65)",
        justifyContent: "center",
        alignItems: "center"
    },

    container: {
        justifyContent: "center",
        alignItems: "center"
    },

    outerRing: {
        position: "absolute",
        width: size + 90,
        height: size + 90,
        borderRadius: 200,
        borderWidth: 6,
        borderColor: "#ff00ff",
        borderTopColor: "transparent",
        borderRightColor: "transparent"
    },

    middleRing: {
        position: "absolute",
        width: size + 50,
        height: size + 50,
        borderRadius: 200,
        borderWidth: 4,
        borderColor: "#E3117C",
        borderBottomColor: "transparent",
        borderLeftColor: "transparent"
    },

    glowRing: {
        position: "absolute",
        width: size + 20,
        height: size + 20,
        borderRadius: 200,
        borderWidth: 2,
        borderColor: "#ff66ff"
    },

    core: {
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: "#7B20A8",
        justifyContent: "center",
        alignItems: "center",

        shadowColor: "#ff00ff",
        shadowOpacity: 1,
        shadowRadius: 40,
        shadowOffset: { width: 0, height: 0 },

        elevation: 20
    },

    text: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "700",
        letterSpacing: 1
    }

});