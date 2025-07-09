import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';

export default function FullScreenLoader({ message = 'Loading...' }: { message?: string }) {
  const rotateOuter = useRef(new Animated.Value(0)).current;
  const rotateInner = useRef(new Animated.Value(0)).current;
  const colorAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(rotateOuter, {
        toValue: 1,
        duration: 30000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    ).start();

    Animated.loop(
      Animated.timing(rotateInner, {
        toValue: 1,
        duration: 15000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(colorAnim, { toValue: 1, duration: 1000, useNativeDriver: false }),
        Animated.timing(colorAnim, { toValue: 0, duration: 1000, useNativeDriver: false }),
      ]),
    ).start();
  }, []);

  const outerRotate = rotateOuter.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const innerRotate = rotateInner.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '-360deg'],
  });

  const animatedTextColor = colorAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#ffffff', '#3BB2D0'],
  });

  return (
    <View style={styles.overlay}>
      <Animated.View style={[styles.outerCircle, { transform: [{ rotate: outerRotate }] }]} />
      <Animated.View style={[styles.innerCircle, { transform: [{ rotate: innerRotate }] }]} />
      <Animated.Text style={[styles.textCircle, { color: animatedTextColor }]}>
        {message}
      </Animated.Text>
    </View>
  );
}

const CIRCLE_SIZE = 240;

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: '#222',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  outerCircle: {
    position: 'absolute',
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    borderWidth: 5,
    borderColor: '#1B5F70',
  },
  innerCircle: {
    position: 'absolute',
    width: CIRCLE_SIZE - 40,
    height: CIRCLE_SIZE - 40,
    borderRadius: (CIRCLE_SIZE - 40) / 2,
    borderWidth: 5,
    borderColor: '#3BB2D0',
  },
  textCircle: {
    fontSize: 16,
    textTransform: 'uppercase',
  },
});
