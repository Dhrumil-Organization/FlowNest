// ─────────────────────────────────────────────────────────────
// FILE: src/features/globalSearch/FlowNestMark.tsx
// The FlowNest logo, alive:
//   idle       the roof floats gently over the nest, a soft halo breathes
//   thinking   faster float (while results are being worked out)
//   listening  the halo and rings grow with the voice (mic level 0 … 1)
// Transform / opacity only, all on the native driver → smooth on
// Android, iOS and web, no JS work per frame.
// ─────────────────────────────────────────────────────────────
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

const ROOF = require('./assets/flownest_roof.png');
const NEST = require('./assets/flownest_nest.png');

type Props = {
  size?: number;
  mode?: 'idle' | 'thinking' | 'listening';
  /** mic level 0 … 1 (listening) */
  level?: Animated.Value;
  color?: string;
};

export function FlowNestMark({ size = 28, mode = 'idle', level, color = '#14B8C8' }: Props) {
  const float = useRef(new Animated.Value(0)).current;
  const breathe = useRef(new Animated.Value(0)).current;
  const zero = useRef(new Animated.Value(0)).current;
  const mic = level || zero;

  useEffect(() => {
    const dur = mode === 'thinking' ? 520 : mode === 'listening' ? 700 : 1500;
    const a = Animated.loop(
      Animated.sequence([
        Animated.timing(float, { toValue: 1, duration: dur, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(float, { toValue: 0, duration: dur, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    const b = Animated.loop(
      Animated.timing(breathe, { toValue: 1, duration: mode === 'idle' ? 2400 : 1300, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    );
    a.start();
    b.start();
    return () => {
      a.stop();
      b.stop();
    };
  }, [mode, float, breathe]);

  const lift = float.interpolate({ inputRange: [0, 1], outputRange: [0, -size * 0.09] });
  const roofScale = float.interpolate({ inputRange: [0, 1], outputRange: [1, 1.04] });
  const haloScale = Animated.add(breathe.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1.45] }), Animated.multiply(mic, 0.7));
  const haloOpacity = breathe.interpolate({ inputRange: [0, 1], outputRange: [mode === 'idle' ? 0.28 : 0.42, 0] });
  const ringScale = Animated.add(1, Animated.multiply(mic, 0.55));
  const ringOpacity = Animated.multiply(mic, 0.6);
  const box = size * 1.6;

  return (
    <View style={{ width: box, height: box, alignItems: 'center', justifyContent: 'center' }} pointerEvents="none">
      <Animated.View
        style={[
          st.halo,
          { width: size * 1.2, height: size * 1.2, borderRadius: size, backgroundColor: color, opacity: haloOpacity, transform: [{ scale: haloScale }] },
        ]}
      />
      {mode === 'listening' ? (
        <Animated.View
          style={[
            st.halo,
            { width: size * 1.3, height: size * 1.3, borderRadius: size, borderWidth: 2, borderColor: color, opacity: ringOpacity, transform: [{ scale: ringScale }] },
          ]}
        />
      ) : null}
      <View style={{ width: size, height: size * 1.06 }}>
        <Animated.Image source={ROOF} resizeMode="contain" style={[st.part, { transform: [{ translateY: lift }, { scale: roofScale }] }]} />
        <Animated.Image source={NEST} resizeMode="contain" style={st.part} />
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  halo: { position: 'absolute' },
  part: { position: 'absolute', left: 0, top: 0, width: '100%', height: '100%' },
});
