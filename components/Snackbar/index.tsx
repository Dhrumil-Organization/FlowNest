// components/Snackbar.tsx - COMPLETE REPLACEMENT
import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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
  const translateY = useRef(new Animated.Value(200)).current;
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
        toValue: 200,
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
        return '#28a745';
      case 'error':
        return '#dc3545';
      case 'warning':
        return '#ffc107';
      default:
        return '#333333';
    }
  };

  // ❌ NO <Modal> tag
  return (
    // ✅ Full screen transparent overlay (sirf press handle karega, click through nahi hoga)
    <Pressable
      style={styles.fullScreenOverlay}
      onPress={hideSnackbar}  // Tap to dismiss
    >
      {/* ✅ Bottom area for Snackbar - touches pass through */}
      <View style={styles.bottomArea} pointerEvents="box-none">
        <Animated.View
          style={[
            styles.snackbar,
            {
              backgroundColor: getBackgroundColor(),
              transform: [{ translateY }],
              opacity,
            },
          ]}>
          <View style={styles.content}>
            <Text style={styles.text} numberOfLines={3}>
              {message}
            </Text>
            {action ? (
              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation();
                  action.onPress();
                  hideSnackbar();
                }}
                style={styles.actionBtn}>
                <Text style={styles.actionText}>{action.text}</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </Animated.View>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  // ✅ Full screen overlay - on top of EVERYTHING
 fullScreenOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.001)', // 0.001% black = almost invisible
    zIndex: 999999,                          // 👈 ADD THIS
    elevation: 999999,                       // 👈 ADD THIS
},
  // ✅ Bottom area for snackbar
  bottomArea: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingBottom: 80,
    paddingHorizontal: 16,
  },
  snackbar: {
    padding: 16,
    borderRadius: 12,
    elevation: 999999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  text: {
    color: '#fff',
    fontSize: 15,
    flex: 1,
  },
  actionBtn: {
    marginLeft: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  actionText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});

export default Snackbar;
