import theme from '@/components/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef } from 'react';
import {
    ActivityIndicator,
    Animated,
    Dimensions,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

const { height } = Dimensions.get('window');

const FilterForm = (props) => {

    const {
        isVisible,
        onClose,
        isLoading,
        FormState,
        setFormState,
        onLoadPress
    } = props;

    // 🔥 Animations
    const slideAnim = useRef(new Animated.Value(height)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        if (isVisible) {
            Animated.parallel([
                Animated.spring(slideAnim, {
                    toValue: 0,
                    useNativeDriver: true,
                }),
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                })
            ]).start();
        } else {
            Animated.parallel([
                Animated.timing(slideAnim, {
                    toValue: height,
                    duration: 250,
                    useNativeDriver: true,
                }),
                Animated.timing(fadeAnim, {
                    toValue: 0,
                    duration: 200,
                    useNativeDriver: true,
                })
            ]).start();
        }
    }, [isVisible]);

    // 🔘 Button press animation
    const onPressIn = () => {
        Animated.spring(scaleAnim, {
            toValue: 0.95,
            useNativeDriver: true,
        }).start();
    };

    const onPressOut = () => {
        Animated.spring(scaleAnim, {
            toValue: 1,
            useNativeDriver: true,
        }).start();
    };

    return (
        <Modal
            visible={isVisible}
            transparent={false}
            animationType="none"
            onRequestClose={onClose}
             statusBarTranslucent={true}
        >
            <View style={styles.modalOverlay}>

                {/* 🔥 Backdrop */}
                <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]} />

                {/* 🔥 Sliding Modal */}
                <Animated.View
                    style={[
                        styles.drawerContainer,
                        { transform: [{ translateY: slideAnim }] }
                    ]}
                >
                    <LinearGradient
                        colors={[theme.BRAND_GRADIENT_START, theme.BRAND_GRADIENT_END]}
                        style={styles.gradientBackground}
                    >

                        {/* 🔥 HEADER */}
                        <View style={styles.header}>
                            <Text style={styles.headerTitle}>Filters</Text>

                            <TouchableOpacity onPress={onClose}>
                                <Icon name="close" size={26} color="#fff" />
                            </TouchableOpacity>
                        </View>

                        {/* 🔥 CONTENT */}
                        <View style={styles.contentCard}>
                            <ScrollView
                                showsVerticalScrollIndicator={false}
                                contentContainerStyle={{ paddingBottom: 100 }}
                            >

                                {/* 👇 Your Existing Form Starts Here */}

                                <Text style={styles.label}>Your Filters</Text>

                                {/* Example placeholder */}
                                <Text style={{ color: '#666', marginBottom: 20 }}>
                                    Add your dropdowns, switches, API data here...
                                </Text>

                                {/* 👆 KEEP ADDING YOUR REAL UI HERE */}

                            </ScrollView>
                        </View>

                        {/* 🔥 FAB BUTTON */}
                        <Animated.View
                            style={[
                                styles.fabWrapper,
                                { transform: [{ scale: scaleAnim }] }
                            ]}
                        >
                            <TouchableOpacity
                                style={styles.centerFabButton}
                                onPress={onLoadPress}
                                onPressIn={onPressIn}
                                onPressOut={onPressOut}
                                activeOpacity={0.9}
                            >
                                {
                                    isLoading ? (
                                        <ActivityIndicator size="small" color="#fff" />
                                    ) : (
                                        <>
                                            <Icon name="cloud-download" size={20} color="#fff" />
                                            <Text style={styles.centerFabText}>Load Data</Text>
                                        </>
                                    )
                                }
                            </TouchableOpacity>
                        </Animated.View>

                    </LinearGradient>
                </Animated.View>
            </View>
        </Modal>
    );
};


const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
    },

    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.6)',
    },

    drawerContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },

    gradientBackground: {
        flex: 1,
    },

    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 50,
        paddingBottom: 15,
    },

    headerTitle: {
        color: '#fff',
        fontSize: 20,
        fontWeight: '700',
    },

    contentCard: {
        flex: 1,
        backgroundColor: '#fff',
        borderTopLeftRadius: 25,
        borderTopRightRadius: 25,
        padding: 15,
    },

    label: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 10,
        color: '#333',
    },

    fabWrapper: {
        position: 'absolute',
        bottom: 25,
        alignSelf: 'center',
    },

    centerFabButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#17b85a',
        paddingVertical: 12,
        paddingHorizontal: 22,
        borderRadius: 30,
        elevation: 5,
        shadowColor: '#000',
        shadowOpacity: 0.3,
        shadowOffset: { width: 0, height: 4 },
        shadowRadius: 6,
    },

    centerFabText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 14,
        marginLeft: 6,
    },
});

export default FilterForm;