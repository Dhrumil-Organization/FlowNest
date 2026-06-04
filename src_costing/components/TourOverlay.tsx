import React, {useEffect, useState} from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import {colors, fontSize, radius, spacing} from '../utils/theme';
import {i18n, useTourStrings} from '../i18n/tour';

export interface TourStep {
  /** Translation key for title from i18n */
  titleKey: string;
  /** Translation key for body from i18n */
  bodyKey: string;
}

interface Props {
  /** Unique key for this tour (e.g., "dashboard", "inquiry_form") */
  tourKey: string;
  steps: TourStep[];
  /** If true, shows tour on first mount automatically (once) */
  autoStart?: boolean;
  /** Controlled visible state — used when user manually opens tour */
  visible?: boolean;
  onClose?: () => void;
}

const TourOverlay: React.FC<Props> = ({
  tourKey,
  steps,
  autoStart = false,
  visible: controlledVisible,
  onClose,
}) => {
  const t = useTourStrings();
  const [internalVisible, setInternalVisible] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  const isControlled = controlledVisible !== undefined;
  const isVisible = isControlled ? controlledVisible : internalVisible;

  useEffect(() => {
    if (!autoStart || isControlled) return;
    (async () => {
      try {
        const seen = await AsyncStorage.getItem(`tour_${tourKey}_seen`);
        if (!seen) {
          setInternalVisible(true);
        }
      } catch {
        // ignore
      }
    })();
  }, [autoStart, isControlled, tourKey]);

  const finish = async () => {
    try {
      await AsyncStorage.setItem(`tour_${tourKey}_seen`, '1');
    } catch {
      // ignore
    }
    setStepIndex(0);
    if (isControlled) {
      onClose?.();
    } else {
      setInternalVisible(false);
    }
  };

  if (!isVisible || steps.length === 0) {
    return null;
  }

  const step = steps[stepIndex];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === steps.length - 1;

  const title = (t as any)[step.titleKey] || step.titleKey;
  const body = (t as any)[step.bodyKey] || step.bodyKey;

  return (
    <Modal
      transparent
      animationType="fade"
      visible={isVisible}
      onRequestClose={finish}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          {/* Language toggle */}
          <View style={styles.topRow}>
            <Text style={styles.stepCounter}>
              {stepIndex + 1} / {steps.length}
            </Text>
            <TouchableOpacity
              onPress={() => i18n.toggle()}
              style={styles.langBtn}>
              <Text style={styles.langText}>{t.switchLanguage}</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.title}>{title}</Text>
          <Text style={styles.body}>{body}</Text>

          {/* Progress dots */}
          <View style={styles.dotsRow}>
            {steps.map((_, idx) => (
              <View
                key={idx}
                style={[
                  styles.dot,
                  idx === stepIndex && styles.dotActive,
                ]}
              />
            ))}
          </View>

          {/* Buttons */}
          <View style={styles.btnRow}>
            <TouchableOpacity onPress={finish} style={styles.skipBtn}>
              <Text style={styles.skipText}>{t.skip}</Text>
            </TouchableOpacity>

            <View style={styles.rightBtns}>
              {!isFirst && (
                <TouchableOpacity
                  onPress={() => setStepIndex(i => i - 1)}
                  style={styles.outlineBtn}>
                  <Text style={styles.outlineText}>{t.back}</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={() => {
                  if (isLast) {
                    finish();
                  } else {
                    setStepIndex(i => i + 1);
                  }
                }}
                style={styles.primaryBtn}>
                <Text style={styles.primaryText}>
                  {isLast ? t.done : t.next}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    backgroundColor: colors.cardBg,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  stepCounter: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  langBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    backgroundColor: colors.infoBg,
    borderRadius: radius.sm,
  },
  langText: {fontSize: fontSize.xs, color: colors.info, fontWeight: '500'},
  title: {
    fontSize: fontSize.xl,
    fontWeight: '500',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  body: {
    fontSize: fontSize.base,
    color: colors.textPrimary,
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginBottom: spacing.lg,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
  },
  dotActive: {
    backgroundColor: colors.primary,
    width: 24,
  },
  btnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  skipBtn: {paddingVertical: 10, paddingHorizontal: 4},
  skipText: {fontSize: fontSize.sm, color: colors.textSecondary},
  rightBtns: {flexDirection: 'row', gap: spacing.sm},
  outlineBtn: {
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  outlineText: {fontSize: fontSize.sm, color: colors.textPrimary},
  primaryBtn: {
    paddingVertical: 10,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
  },
  primaryText: {fontSize: fontSize.sm, color: colors.white, fontWeight: '500'},
});

export default TourOverlay;

// ============================================================
// Predefined tour configurations for each screen
// ============================================================

export const DASHBOARD_TOUR: TourStep[] = [
  {titleKey: 'welcome_title', bodyKey: 'welcome_body'},
  {titleKey: 'card_title', bodyKey: 'card_body'},
  {titleKey: 'status_title', bodyKey: 'status_body'},
  {titleKey: 'filter_title', bodyKey: 'filter_body'},
  {titleKey: 'notes_title', bodyKey: 'notes_body'},
  {titleKey: 'edit_title', bodyKey: 'edit_body'},
  {titleKey: 'new_title', bodyKey: 'new_body'},
];

export const INQUIRY_FORM_TOUR: TourStep[] = [
  {titleKey: 'party_title', bodyKey: 'party_body'},
  {titleKey: 'designs_title', bodyKey: 'designs_body'},
  {titleKey: 'shades_title', bodyKey: 'shades_body'},
  {titleKey: 'delivery_title', bodyKey: 'delivery_body'},
];

export const COSTING_TOUR: TourStep[] = [
  {titleKey: 'costing_tabs_title', bodyKey: 'costing_tabs_body'},
  {titleKey: 'cost_sheet_title', bodyKey: 'cost_sheet_body'},
  {titleKey: 'auth_title', bodyKey: 'auth_body'},
];
