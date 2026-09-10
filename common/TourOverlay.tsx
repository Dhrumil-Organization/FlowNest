import React, { useEffect, useRef, useState } from 'react';
import {
    Animated,
    Dimensions,
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    PanResponder,
} from 'react-native';
import AsyncStorage from '@/common/utils/compatibleStorage';
import { colors, fontSize, radius, spacing } from './theme';
import Icon from '@expo/vector-icons/MaterialIcons';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const TOUR_STORAGE_PREFIX = '@inquiry_tour_seen_';

export interface TourStep {
    title: {
        en: string;
        hi: string;
    };
    description: {
        en: string;
        hi: string;
    };
    icon?: string;
}

interface Props {
    tourKey: string;
    steps: TourStep[];
    delay?: number;
    visible?: boolean;
    onClose?: () => void;
    defaultLanguage?: 'en' | 'hi';
}

// Predefined unique icon colors (cycling through vibrant set)
const ICON_COLORS = [
    '#4285F4', // blue
    '#EA4335', // red
    '#34A853', // green
    '#FBBC05', // yellow
    '#9C27B0', // purple
    '#FF5722', // orange
    '#00BCD4', // cyan
    '#795548', // brown
    '#607D8B', // grey-blue
    '#E91E63', // pink
];

const TourOverlay: React.FC<Props> = ({
    tourKey,
    steps,
    delay = 600,
    visible: externalVisible,
    onClose,
    defaultLanguage = 'en',
}) => {
    const [visible, setVisible] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const [language, setLanguage] = useState<'en' | 'hi'>(defaultLanguage);
    const [isTransitioning, setIsTransitioning] = useState(false); // prevent double taps

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const contentFadeAnim = useRef(new Animated.Value(1)).current; // for step transitions

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onPanResponderRelease: (_, gestureState) => {
                if (isTransitioning) return;
                if (gestureState.dx > 50) {
                    goBack();
                } else if (gestureState.dx < -50) {
                    goNext();
                }
            },
        })
    ).current;

    // Reset to first step when externally triggered
    useEffect(() => {
        if (externalVisible) {
            (async () => {
                try {
                    await AsyncStorage.removeItem(TOUR_STORAGE_PREFIX + tourKey);
                    setCurrentStep(0);
                    setVisible(true);
                    contentFadeAnim.setValue(1);
                    Animated.timing(fadeAnim, {
                        toValue: 1,
                        duration: 300,
                        useNativeDriver: true,
                    }).start();
                } catch (_) { }
            })();
        } else if (!externalVisible && visible) {
            dismiss();
        }
    }, [externalVisible, tourKey]);

    // Auto-show on first load
    useEffect(() => {
        let timer: ReturnType<typeof setTimeout>;
        (async () => {
            try {
                const seen = await AsyncStorage.getItem(TOUR_STORAGE_PREFIX + tourKey);
                if (!seen && !externalVisible) {
                    timer = setTimeout(() => {
                        setCurrentStep(0);
                        setVisible(true);
                        contentFadeAnim.setValue(1);
                        Animated.timing(fadeAnim, {
                            toValue: 1,
                            duration: 300,
                            useNativeDriver: true,
                        }).start();
                    }, delay);
                }
            } catch (_) { }
        })();
        return () => clearTimeout(timer);
    }, [tourKey, delay, externalVisible]);

    const dismiss = async () => {
        Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
        }).start(async () => {
            setVisible(false);
            try {
                await AsyncStorage.setItem(TOUR_STORAGE_PREFIX + tourKey, '1');
                onClose?.();
            } catch (_) { }
        });
    };

    // Smooth step change: fade out → update step → fade in
    const changeStep = (newStep: number) => {
        if (isTransitioning) return;
        setIsTransitioning(true);
        Animated.timing(contentFadeAnim, {
            toValue: 0,
            duration: 150,
            useNativeDriver: true,
        }).start(() => {
            setCurrentStep(newStep);
            Animated.timing(contentFadeAnim, {
                toValue: 1,
                duration: 150,
                useNativeDriver: true,
            }).start(() => {
                setIsTransitioning(false);
            });
        });
    };

    const goNext = () => {
        if (currentStep < steps.length - 1) {
            changeStep(currentStep + 1);
        } else {
            dismiss();
        }
    };

    const goBack = () => {
        if (currentStep > 0) {
            changeStep(currentStep - 1);
        }
    };

    const toggleLanguage = () => {
        setLanguage(prev => (prev === 'en' ? 'hi' : 'en'));
    };

    if (!visible) return null;

    const step = steps[currentStep];
    const isFirstStep = currentStep === 0;
    const isLastStep = currentStep === steps.length - 1;

    // Determine icon color: if icon is 'help-outline' use #ffa931, else cycle through list
    let iconColor = ICON_COLORS[currentStep % ICON_COLORS.length];
    if (step.icon === 'help-outline') {
        iconColor = '#ffa931';
    } else if (step.icon === 'bolt') {
        iconColor = '#F59E0B';
    } else if (step.icon === 'list') {
        iconColor = '#969696';
    }

    return (
        <Modal transparent visible={visible} animationType="none" statusBarTranslucent>
            <Animated.View
                style={[styles.backdrop, { opacity: fadeAnim }]}
                {...panResponder.panHandlers}
            >
                <TouchableOpacity
                    style={StyleSheet.absoluteFill}
                    activeOpacity={1}
                    onPress={dismiss}
                />
                <Animated.View style={[styles.card]}>
                    {/* Skip button */}
                    <TouchableOpacity style={styles.skipBtn} onPress={dismiss}>
                        <Text style={styles.skipText}>
                            {language === 'hi' ? 'छोड़ें' : 'Skip'}
                        </Text>
                    </TouchableOpacity>

                    {/* Content with fade animation */}
                    <Animated.View style={{ opacity: contentFadeAnim }}>
                        {/* Icon */}
                        {step.icon ? (
                            <View style={[styles.iconWrap, { backgroundColor: `${iconColor}15` }]}>
                                <Icon name={step.icon as any} size={52} color={iconColor} />
                            </View>
                        ) : null}

                        {/* Step indicator dots */}
                        <View style={styles.dots}>
                            {steps.map((_, i) => (
                                <View
                                    key={i}
                                    style={[
                                        styles.dot,
                                        i === currentStep && styles.dotActive,
                                    ]}
                                />
                            ))}
                        </View>

                        {/* Title and description */}
                        <Text style={styles.title}>
                            {language === 'hi' ? step.title.hi : step.title.en}
                        </Text>
                        <Text style={styles.description}>
                            {language === 'hi' ? step.description.hi : step.description.en}
                        </Text>

                        {/* Navigation buttons */}
                        <View style={styles.buttonRow}>
                            {!isFirstStep ? (
                                <TouchableOpacity style={styles.backBtn} onPress={goBack}>
                                    <Text style={styles.backText}>
                                        {language === 'hi' ? 'पिछला' : 'Back'}
                                    </Text>
                                </TouchableOpacity>
                            ) : (
                                <View style={styles.emptyBtn} />
                            )}
                            <TouchableOpacity style={styles.nextBtn} onPress={goNext}>
                                <Text style={styles.nextText}>
                                    {isLastStep
                                        ? language === 'hi'
                                            ? 'समझ गया!'
                                            : 'Got it!'
                                        : language === 'hi'
                                            ? `अगला (${currentStep + 1}/${steps.length})`
                                            : `Next (${currentStep + 1}/${steps.length})`}
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {/* Language toggle */}
                        <TouchableOpacity style={styles.langToggle} onPress={toggleLanguage}>
                            <Text style={styles.langToggleText}>
                                {language === 'hi' ? 'Switch to English' : 'हिंदी में बदलें'}
                            </Text>
                        </TouchableOpacity>
                    </Animated.View>
                </Animated.View>
            </Animated.View>
        </Modal>
    );
};

// Styles – card background is white
const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'flex-end',
        alignItems: 'center',
        paddingBottom: 30,
        paddingHorizontal: spacing.md,
    },
    card: {
        width: '100%',
        maxWidth: 400,
        backgroundColor: '#FFFFFF', // white background
        borderRadius: radius.xl,
        padding: spacing.xl,
        paddingTop: spacing.xl + 10,
        shadowColor: '#000',
        shadowOpacity: 0.2,
        shadowOffset: { width: 0, height: 10 },
        shadowRadius: 20,
        elevation: 15,
    },
    skipBtn: {
        position: 'absolute',
        top: spacing.md,
        right: spacing.md,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        zIndex: 10,
    },
    skipText: {
        fontSize: fontSize.sm,
        color: colors.textTertiary,
        fontWeight: '500',
    },
    dots: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 6,
        marginBottom: spacing.md,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: colors.border,
    },
    dotActive: {
        backgroundColor: colors.primary,
        width: 20,
    },
    title: {
        fontSize: fontSize.lg + 2,
        fontWeight: '700',
        color: colors.textPrimary,
        textAlign: 'center',
        marginBottom: spacing.sm,
    },
    description: {
        fontSize: fontSize.base,
        color: colors.textSecondary,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: spacing.xl,
    },
    buttonRow: {
        flexDirection: 'row',
        gap: spacing.md,
        marginTop: spacing.sm,
    },
    backBtn: {
        flex: 1,
        backgroundColor: colors.bgSecondary,
        paddingVertical: 12,
        borderRadius: radius.pill,
        alignItems: 'center',
    },
    backText: {
        color: colors.textPrimary,
        fontWeight: '600',
        fontSize: fontSize.base,
    },
    nextBtn: {
        flex: 2,
        backgroundColor: colors.primary,
        paddingVertical: 12,
        borderRadius: radius.pill,
        alignItems: 'center',
    },
    nextText: {
        color: colors.white,
        fontWeight: '600',
        fontSize: fontSize.base,
    },
    emptyBtn: {
        flex: 1,
    },
    langToggle: {
        alignItems: 'center',
        marginTop: spacing.md,
    },
    langToggleText: {
        fontSize: fontSize.xs,
        color: colors.primary,
        textDecorationLine: 'underline',
    },
    iconWrap: {
        width: 80,
        height: 80,
        borderRadius: 40,
        alignSelf: 'center',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
});

// ── Pre-defined tour steps for each screen (Bilingual) ────────────────────────
export const DASHBOARD_TOUR: TourStep[] = [
    {
        emoji: '👋',
        title: {
            en: 'Welcome to Inquiries!',
            hi: 'इनक्वायरी में आपका स्वागत है!',
        },
        description: {
            en: 'Here you can view, manage, and track all your inquiries. The dashboard shows status-wise counts.',
            hi: 'यहाँ से आप अपनी सारी इनक्वायरी देख, मैनेज और ट्रैक कर सकते हैं। डैशबोर्ड पर स्टेटस-वार काउंट मिलेगा।',
        },
    },
    {
        emoji: '➕',
        title: {
            en: 'Create New Inquiry',
            hi: 'नई इनक्वायरी बनाएं',
        },
        description: {
            en: 'Tap the "+ New Inquiry" button below to start a new inquiry. Add party and designs/items in the same form.',
            hi: 'नीचे "+ नई इनक्वायरी" बटन टैप करें। पार्टी और डिज़ाइन/आइटम एक ही फॉर्म में जोड़ें।',
        },
    },
    {
        emoji: '🔍',
        title: {
            en: 'Filter & Search',
            hi: 'फिल्टर और खोजें',
        },
        description: {
            en: 'Use the tabs at the top to filter inquiries by status (Pending, Costed, Sent, Confirmed, Rejected).',
            hi: 'टॉप पर टैब हैं — पेंडिंग, कॉस्टेड, सेंट, कन्फर्म्ड, रिजेक्टेड। किसी भी टैब पर टैप करें फिल्टर के लिए।',
        },
    },
];

export const INQUIRY_FORM_TOUR: TourStep[] = [
    {
        emoji: '🏢',
        title: {
            en: 'Select Party',
            hi: 'पार्टी चुनें',
        },
        description: {
            en: 'First, select the party (customer). Search for an existing party or add a new one using GSTIN.',
            hi: 'पहले पार्टी (ग्राहक) चुनें। खोजकर मौजूदा पार्टी चुनें या नया GSTIN से जोड़ें।',
        },
    },
    {
        emoji: '🎨',
        title: {
            en: 'Add Design/Item',
            hi: 'डिज़ाइन/आइटम जोड़ें',
        },
        description: {
            en: 'For each design/item, choose "Existing" or "New Design/Item". Use search to find existing designs/items.',
            hi: 'हर डिज़ाइन/आइटम के लिए "मौजूदा" या "नई डिज़ाइन/आइटम" चुनें। मौजूदा डिज़ाइन/आइटम खोजने के लिए सर्च करें।',
        },
    },
    {
        emoji: '🧵',
        title: {
            en: 'Select Fabric Type',
            hi: 'फैब्रिक टाइप चुनें',
        },
        description: {
            en: 'After selecting a design/item, choose the fabric type (Cotton, Poly, Blended, etc.). This is mandatory.',
            hi: 'डिज़ाइन/आइटम चुनने के बाद फैब्रिक टाइप चुनें (कॉटन, पॉली, ब्लेंडेड, आदि) — यह अनिवार्य है।',
        },
    },
];

export const COSTING_TOUR: TourStep[] = [
    {
        emoji: '💰',
        title: {
            en: 'Design/Item-wise Costing',
            hi: 'डिज़ाइन/आइटम-वार कॉस्टिंग',
        },
        description: {
            en: 'Each design/item is in a card. Inside, you can see the fabric type and add rates for each shade separately.',
            hi: 'हर डिज़ाइन/आइटम एक कार्ड में होगी। अंदर फैब्रिक टाइप दिखेगा और हर शेड के लिए अलग रेट डाल सकते हैं।',
        },
    },
    // {
    //   emoji: '🌈',
    //   title: {
    //     en: 'Shade-wise Rate',
    //     hi: 'शेड-वार रेट',
    //   },
    //   description: {
    //     en: 'In each shade row, just enter the rate. The amount is automatically calculated based on quantity.',
    //     hi: 'हर शेड रो में सिर्फ रेट डालें। अमाउंट ऑटोमैटिकली क्वांटिटी के हिसाब से कैलकुलेट हो जाएगा।',
    //   },
    // },
];

export const INQUIRY_DETAIL_TOUR: TourStep[] = [
    {
        emoji: '📋',
        title: {
            en: 'Inquiry Details',
            hi: 'इनक्वायरी डिटेल्स',
        },
        description: {
            en: 'Here you can see the full details of the inquiry — party info, designs/items, status, and TAT (Turnaround Time) tracker.',
            hi: 'यहाँ इनक्वायरी का पूरा डिटेल है — पार्टी इन्फो, डिज़ाइन/आइटम, स्टेटस और TAT (टर्नअराउंड टाइम) ट्रैकर।',
        },
    },
    {
        emoji: '⏱️',
        title: {
            en: 'TAT Tracker',
            hi: 'TAT ट्रैकर',
        },
        description: {
            en: 'Each step (Costing → Quotation → Response) time is tracked. Green = On Time, Red = Breached.',
            hi: 'हर स्टेप (कॉस्टिंग → कोटेशन → रिस्पॉन्स) का टाइम ट्रैक होता है। ग्रीन = समय पर, रेड = ब्रीच।',
        },
    },
];

export default TourOverlay;