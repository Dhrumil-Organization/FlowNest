import AsyncStorage from '@/common/utils/compatibleStorage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { T } from '@/src/theme';

export default function NotificationAccessDeniedScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ platform?: string; route?: string }>();

  const goHome = async () => {
    const stored = await AsyncStorage.getItem('LOOKUP_PLATFORM');
    const platform = String(stored || params.platform || '').toUpperCase();
    router.replace(platform === 'NEW' ? '/new' : '/(tabs)');
  };

  return (
    <View style={styles.root}>
      <TouchableOpacity accessibilityRole="button" style={styles.back} onPress={goHome}>
        <Text style={styles.backText}>‹</Text>
        <Text style={styles.backLabel}>Back</Text>
      </TouchableOpacity>

      <View style={styles.icon}><Text style={styles.iconText}>!</Text></View>
      <Text style={styles.title}>Notification screen unavailable</Text>
      <Text style={styles.message}>
        This notification points to a screen that is not available in your current ERP system, or you do not have permission to access it.
      </Text>
      <Text style={styles.subMessage}>
        You may be using the wrong ERP system, or this screen may not be included in your assigned access. Please contact your administrator.
      </Text>

      <TouchableOpacity style={styles.button} onPress={goHome}>
        <Text style={styles.buttonText}>Go to Home</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg, alignItems: 'center', justifyContent: 'center', padding: 28 },
  back: { position: 'absolute', top: 54, left: 20, flexDirection: 'row', alignItems: 'center', padding: 8 },
  backText: { color: T.ink, fontSize: 36, lineHeight: 36, fontWeight: '300' },
  backLabel: { color: T.ink, fontSize: 15, fontWeight: '800', marginLeft: 3 },
  icon: { width: 54, height: 54, borderRadius: 27, backgroundColor: T.copper + '18', alignItems: 'center', justifyContent: 'center' },
  iconText: { color: T.copper, fontSize: 28, fontWeight: '900' },
  title: { color: T.ink, fontSize: 21, fontWeight: '900', textAlign: 'center', marginTop: 16 },
  message: { color: T.muted, fontSize: 14, lineHeight: 21, textAlign: 'center', marginTop: 10, maxWidth: 360 },
  subMessage: { color: T.muted, fontSize: 13, lineHeight: 20, textAlign: 'center', marginTop: 8, maxWidth: 360 },
  button: { marginTop: 22, backgroundColor: T.ink, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 13 },
  buttonText: { color: '#fff', fontWeight: '800' },
});
