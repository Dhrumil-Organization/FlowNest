import { useAppSessionStore } from '@/src/stores/AppSessionStore';
import { T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { useCallback } from 'react';
import { Alert, StyleSheet, TouchableOpacity } from 'react-native';

export function CommonLogoutButton() {
  const logout = useAppSessionStore((state) => state.logout);

  const confirmLogout = useCallback(() => {
    Alert.alert('Sign out?', 'This will clear the mobile session on this device.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => void logout() },
    ]);
  }, [logout]);

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel="Sign out"
      activeOpacity={0.85}
      onPress={confirmLogout}
      style={styles.button}
    >
      <Icon name="logout" size={20} color="#FFFFFF" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    top: 47,
    right: 14,
    zIndex: 1000,
    elevation: 10,
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: T.nav,
    borderWidth: 1,
    borderColor: '#294155',
  },
});
