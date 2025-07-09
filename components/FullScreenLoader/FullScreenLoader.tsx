import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing, Dimensions } from 'react-native';
import LottieView from 'lottie-react-native';

const { width, height } = Dimensions.get('window');

export default function FullScreenLoader({ message = 'Loading...' }: { message?: string }) {
  const outerRotate = useRef(new Animated.Value(0)).current;
  const innerRotate = useRef(new Animated.Value(0)).current;
  const cutRotate1 = useRef(new Animated.Value(0)).current;
  const cutRotate2 = useRef(new Animated.Value(0)).current;
  const colorAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Outer Circle - Clockwise
    Animated.loop(
      Animated.timing(outerRotate, {
        toValue: 1,
        duration: 9000, // Make it fast for testing!
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    // Inner Circle - Anti-Clockwise
    Animated.loop(
      Animated.timing(innerRotate, {
        toValue: 1,
        duration: 9000, // Make it fast for testing!
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    // Horizontal Cut - Anti-Clockwise
    Animated.loop(
      Animated.timing(cutRotate1, {
        toValue: 1,
        duration: 3500,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    // Vertical Cut - Clockwise
    Animated.loop(
      Animated.timing(cutRotate2, {
        toValue: 1,
        duration: 8000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    // Text Color Animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(colorAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: false,
        }),
        Animated.timing(colorAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: false,
        }),
      ])
    ).start();
  }, []);

  const outerTransform = {
    transform: [
      {
        rotate: outerRotate.interpolate({
          inputRange: [0, 1],
          outputRange: ['0deg', '360deg'],
        }),
      },
    ],
  };

  const innerTransform = {
    transform: [
      {
        rotate: innerRotate.interpolate({
          inputRange: [0, 1],
          outputRange: ['0deg', '-360deg'],
        }),
      },
    ],
  };

  const cut1Transform = {
    transform: [
      {
        rotate: cutRotate1.interpolate({
          inputRange: [0, 1],
          outputRange: ['0deg', '-360deg'],
        }),
      },
    ],
  };

  const cut2Transform = {
    transform: [
      {
        rotate: cutRotate2.interpolate({
          inputRange: [0, 1],
          outputRange: ['0deg', '360deg'],
        }),
      },
    ],
  };

  const animatedTextColor = colorAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#ffffff', '#3BB2D0'],
  });

  return (
    <View style={styles.overlay}>
      <LottieView source={require('./particles.json')} autoPlay loop style={styles.particles} />

      {/* Outer Circle with indicator */}
      <Animated.View style={[styles.outerCircle, outerTransform]}>
        <View style={styles.indicatorDot} />
      </Animated.View>

      {/* Inner Circle with indicator */}
      <Animated.View style={[styles.innerCircle, innerTransform]}>
        <View style={styles.indicatorDotInner} />
      </Animated.View>

      <View style={styles.textCircle}>
        <Animated.View style={[styles.cutHorizontal, cut1Transform]} />
        <Animated.View style={[styles.cutVertical, cut2Transform]} />
        <Animated.Text style={[styles.text, { color: animatedTextColor }]}>
          {message}
        </Animated.Text>
      </View>
    </View>
  );
}

const SIZE = 240;

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#222',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  particles: {
    position: 'absolute',
    width: width,
    height: height,
  },
  outerCircle: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    borderWidth: 5,
    borderColor: '#1B5F70',
    position: 'absolute',
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  innerCircle: {
    width: SIZE - 40,
    height: SIZE - 40,
    borderRadius: (SIZE - 40) / 2,
    borderWidth: 5,
    borderColor: '#3BB2D0',
    position: 'absolute',
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  indicatorDot: {
    width: 100,
    height: 100,
    backgroundColor: '#222',
    borderRadius: 5,
    marginTop: -5, // So it sits exactly on the edge
  },
  indicatorDotInner: {
    width: 100,
    height: 100,
    backgroundColor: '#222',
    borderRadius: 5,
    marginTop: -5,
  },
  textCircle: {
    width: SIZE - 80,
    height: SIZE - 80,
    borderRadius: (SIZE - 80) / 2,
    borderWidth: 5,
    borderColor: '#45C4E8',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
  },
  text: {
    fontSize: 16,
    textTransform: 'uppercase',
    zIndex: 9999,
  },
  cutHorizontal: {
    position: 'absolute',
    width: '110%',
    height: 40,
    backgroundColor: '#222',
    zIndex: 1,
  },
  cutVertical: {
    position: 'absolute',
    width: 40,
    height: '110%',
    backgroundColor: '#222',
    zIndex: 1,
  },
});
