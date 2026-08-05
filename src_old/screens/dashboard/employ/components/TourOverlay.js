// components/TourOverlay.js
// Lightweight step-by-step walkthrough modal used by the Employ Dashboard
// screens (Owner / Sales Exec / Party). The original project referenced a
// shared '../../../../common/TourOverlay' module that wasn't part of this
// export, so this is a small self-contained replacement with the same props:
//   <TourOverlay tourKey visible steps delay onClose />
import React, { useEffect, useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COLORS } from './SharedComponents';

export default function TourOverlay({ visible, steps = [], delay = 0, onClose }) {
  const [step, setStep] = useState(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!visible) {
      setStep(0);
      setReady(false);
      return;
    }
    const t = setTimeout(() => setReady(true), delay);
    return () => clearTimeout(t);
  }, [visible, delay]);

  if (!visible || !ready || steps.length === 0) return null;

  const current = steps[step];
  const isLast = step === steps.length - 1;

  const close = () => {
    setStep(0);
    setReady(false);
    onClose && onClose();
  };

  return (
    <Modal transparent visible animationType="fade" onRequestClose={close}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.emoji}>{current.emoji}</Text>
          <Text style={styles.title}>{current.title?.en || current.title}</Text>
          <Text style={styles.description}>{current.description?.en || current.description}</Text>

          <View style={styles.dots}>
            {steps.map((_, i) => (
              <View key={i} style={[styles.dot, i === step && styles.dotActive]} />
            ))}
          </View>

          <View style={styles.actions}>
            <TouchableOpacity onPress={close} style={styles.skipBtn}>
              <Text style={styles.skipText}>Skip</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => (isLast ? close() : setStep((s) => s + 1))}
              style={styles.nextBtn}
            >
              <Text style={styles.nextText}>{isLast ? 'Done' : 'Next'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  emoji: { fontSize: 32, marginBottom: 8 },
  title: { fontSize: 16, fontWeight: '800', color: COLORS.textDark, marginBottom: 8, textAlign: 'center' },
  description: { fontSize: 12, color: COLORS.textMid, lineHeight: 18, textAlign: 'center' },
  dots: { flexDirection: 'row', gap: 6, marginTop: 16, marginBottom: 16 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.border },
  dotActive: { backgroundColor: COLORS.teal, width: 16 },
  actions: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
  skipBtn: { paddingVertical: 10, paddingHorizontal: 14 },
  skipText: { color: COLORS.textLight, fontWeight: '700', fontSize: 12 },
  nextBtn: { backgroundColor: COLORS.primary, paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8 },
  nextText: { color: '#fff', fontWeight: '700', fontSize: 12 },
});
