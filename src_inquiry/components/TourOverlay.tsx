/**
 * TourOverlay.tsx
 * ─────────────────────────────────────────────────────
 * Ek-baar dikhne wala guided tour overlay.
 * Usage:
 *   <TourOverlay tourKey="inquiry_form" steps={TOUR_STEPS} />
 *
 * - tourKey unique hona chahiye har screen ke liye.
 * - AsyncStorage mein save hota hai, ek baar dekh lo fir nahi aayega.
 * - "Skip" ya last step pe "Got it!" press karo → band ho jata hai.
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, fontSize, radius, spacing } from '../utils/theme';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const TOUR_STORAGE_PREFIX = '@inquiry_tour_seen_';

// ── Types ──────────────────────────────────────────────────────────────────────
export interface TourStep {
  title: string;
  description: string;
  /** optional emoji/icon shown big at top */
  emoji?: string;
}

interface Props {
  /** unique key per screen, e.g. "dashboard", "inquiry_form", "costing" */
  tourKey: string;
  steps: TourStep[];
  /** delay before showing tour (ms). default 600 */
  delay?: number;
}

// ── Component ──────────────────────────────────────────────────────────────────
const TourOverlay: React.FC<Props> = ({ tourKey, steps, delay = 600 }) => {
  const [visible, setVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    (async () => {
      try {
        const seen = await AsyncStorage.getItem(TOUR_STORAGE_PREFIX + tourKey);
        if (!seen) {
          timer = setTimeout(() => {
            setVisible(true);
            Animated.parallel([
              Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
              }),
              Animated.timing(slideAnim, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
              }),
            ]).start();
          }, delay);
        }
      } catch (_) {}
    })();
    return () => clearTimeout(timer);
  }, [tourKey, delay, fadeAnim, slideAnim]);

  const dismiss = async () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(async () => {
      setVisible(false);
      try {
        await AsyncStorage.setItem(TOUR_STORAGE_PREFIX + tourKey, '1');
      } catch (_) {}
    });
  };

  const next = () => {
    if (currentStep < steps.length - 1) {
      // slide out left, new step slides in from right
      Animated.sequence([
        Animated.timing(slideAnim, {
          toValue: -30,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, { toValue: 30, duration: 0, useNativeDriver: true }),
      ]).start(() => {
        setCurrentStep(prev => prev + 1);
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }).start();
      });
    } else {
      dismiss();
    }
  };

  if (!visible) return null;

  const step = steps[currentStep];
  const isLast = currentStep === steps.length - 1;

  return (
    <Modal transparent visible={visible} animationType="none" statusBarTranslucent>
      {/* dim backdrop */}
      <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
        {/* card */}
        <Animated.View
          style={[
            styles.card,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}>
          {/* skip button top-right */}
          <TouchableOpacity style={styles.skipBtn} onPress={dismiss}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>

          {/* emoji */}
          {step.emoji ? (
            <Text style={styles.emoji}>{step.emoji}</Text>
          ) : null}

          {/* step indicator dots */}
          <View style={styles.dots}>
            {steps.map((_, i) => (
              <View
                key={i}
                style={[styles.dot, i === currentStep && styles.dotActive]}
              />
            ))}
          </View>

          {/* content */}
          <Text style={styles.title}>{step.title}</Text>
          <Text style={styles.description}>{step.description}</Text>

          {/* action button */}
          <TouchableOpacity style={styles.nextBtn} onPress={next}>
            <Text style={styles.nextText}>
              {isLast ? 'Got it! 👍' : `Next  ${currentStep + 1}/${steps.length}`}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

// ── Styles ─────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 40,
    paddingHorizontal: spacing.lg,
  },
  card: {
    width: '100%',
    backgroundColor: colors.cardBg,
    borderRadius: radius.xl,
    padding: spacing.xl,
    paddingTop: spacing.xl + 4,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 20,
    elevation: 12,
  },
  skipBtn: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  skipText: {
    fontSize: fontSize.sm,
    color: colors.textTertiary,
  },
  emoji: {
    fontSize: 40,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginBottom: spacing.md,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.border,
  },
  dotActive: {
    backgroundColor: colors.info,
    width: 18,
  },
  title: {
    fontSize: fontSize.lg,
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
  nextBtn: {
    backgroundColor: colors.info,
    paddingVertical: 13,
    borderRadius: radius.pill,
    alignItems: 'center',
  },
  nextText: {
    color: colors.white,
    fontWeight: '600',
    fontSize: fontSize.base,
  },
});

// ── Pre-defined tour steps for each screen ────────────────────────────────────
export const DASHBOARD_TOUR: TourStep[] = [
  {
    emoji: '👋',
    title: 'Welcome to Inquiries!',
    description:
      'Yahan se aap apni saari inquiries dekh, manage aur track kar sakte ho. Dashboard pe status-wise count milega.',
  },
  {
    emoji: '➕',
    title: 'Nayi Inquiry Banao',
    description:
      'Neeche "+ New Inquiry" button se nayi inquiry start karo. Party aur designs ek hi form mein add hote hain.',
  },
  {
    emoji: '🔍',
    title: 'Filter & Search',
    description:
      'Top pe tabs hain — Pending, Costed, Sent, Confirmed, Rejected. Kisi bhi tab pe tap karo filter ke liye.',
  },
];

export const INQUIRY_FORM_TOUR: TourStep[] = [
  {
    emoji: '🏢',
    title: 'Party Select Karo',
    description:
      'Pehle party (customer) select karo. Search karke existing party chunno ya naya GSTIN se add karo.',
  },
  {
    emoji: '🎨',
    title: 'Design Add Karo',
    description:
      'Har design ke liye "Existing" ya "New Design" chunno. Existing mein search se design milega.',
  },
  {
    emoji: '🧵',
    title: 'Fabric Type Select Karo',
    description:
      'Design select hone ke baad Fabric Type choose karo (Cotton, Poly, Blended, etc.) — yeh mandatory hai.',
  },
  {
    emoji: '🌈',
    title: 'Shades Add Karo',
    description:
      'Fabric type ke neeche "+ Add Shade" se shades add karo. Har shade ka naam aur quantity separately dalo.',
  },
  {
    emoji: '➕',
    title: 'Multiple Designs',
    description:
      'Ek inquiry mein multiple designs ho sakte hain. "+ Add Another Design" se nayi design row add karo.',
  },
];

export const COSTING_TOUR: TourStep[] = [
  {
    emoji: '💰',
    title: 'Design-wise Costing',
    description:
      'Har design ek card mein hoga. Uske andar fabric type dikhega aur har shade ke liye alag rate daal sakte ho.',
  },
  {
    emoji: '🌈',
    title: 'Shade-wise Rate',
    description:
      'Har shade row mein sirf rate daalo. Amount automatically calculate ho jaata hai quantity ke hisaab se.',
  },
  {
    emoji: '📊',
    title: 'Design Total',
    description:
      'Har design card ke neeche us design ka total amount (saare shades mila ke) automatically dikhega.',
  },
];

export const INQUIRY_DETAIL_TOUR: TourStep[] = [
  {
    emoji: '📋',
    title: 'Inquiry Detail',
    description:
      'Yahan inquiry ka poora detail hai — party info, designs, status aur TAT (turnaround time) tracker.',
  },
  {
    emoji: '⏱️',
    title: 'TAT Tracker',
    description:
      'Har step (Costing → Quotation → Response) ka time track hota hai. Green = on time, Red = breach.',
  },
  {
    emoji: '⚡',
    title: 'Actions',
    description:
      'Status ke hisaab se actions milenge — Costing, Send Quotation, Confirm ya Reject.',
  },
];

export default TourOverlay;
