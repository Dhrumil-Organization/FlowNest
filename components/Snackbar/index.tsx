// components/Snackbar.tsx
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, fontSize, radius, spacing } from '@/common/theme';

export type SnackbarType = 'success' | 'error' | 'info' | 'warning';

interface SnackbarProps {
  visible: boolean;
  message: string;
  type?: SnackbarType;
  action?: {
    text: string;
    onPress: () => void;
  };
  duration?: number;
  onHide: () => void;
}

const Snackbar: React.FC<SnackbarProps> = ({
  visible,
  message,
  type = 'info',
  action,
  duration = 4000,
  onHide,
}) => {
  const translateY = useRef(new Animated.Value(100)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      const timer = setTimeout(() => {
        hideSnackbar();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [visible]);

  const hideSnackbar = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 100,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => onHide());
  };

  if (!visible) return null;

  const getBackgroundColor = () => {
    switch (type) {
      case 'success':
        return '#28a745'; // green
      case 'error':
        return '#dc3545'; // red
      case 'warning':
        return '#ffc107'; // yellow
      default:
        return '#333333'; // dark
    }
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: getBackgroundColor(),
          transform: [{ translateY }],
          opacity,
        },
      ]}>
      <View style={styles.content}>
        <Text style={styles.text} numberOfLines={2}>
          {message}
        </Text>
        {action ? (
          <TouchableOpacity
            onPress={() => {
              action.onPress();
              hideSnackbar();
            }}
            style={styles.actionBtn}>
            <Text style={styles.actionText}>{action.text}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 80,
    left: spacing.md,
    right: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    zIndex: 9999,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  text: {
    color: '#fff',
    fontSize: fontSize.md,
    flex: 1,
  },
  actionBtn: {
    marginLeft: spacing.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  actionText: {
    color: '#fff',
    fontSize: fontSize.md,
    fontWeight: '600',
  },
});

export default Snackbar;
