import type { ErrorBoundaryProps } from 'expo-router';
import React from 'react';
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { T } from '@/src/theme';

export function ReportRouteError({ error, retry }: ErrorBoundaryProps) {
  const message = error instanceof Error ? error.message : 'An unexpected report error occurred.';

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.card}>
        <View style={styles.icon}><Text style={styles.iconText}>!</Text></View>
        <Text style={styles.title}>Unable to open report</Text>
        <Text style={styles.message}>{message}</Text>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Retry opening report"
          activeOpacity={0.82}
          onPress={retry}
          style={styles.button}
        >
          <Text style={styles.buttonText}>Try again</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: T.bg, justifyContent: 'center', padding: 22 },
  card: { backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, borderRadius: 22, padding: 24, alignItems: 'center' },
  icon: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#FDECEC', alignItems: 'center', justifyContent: 'center' },
  iconText: { color: T.red, fontWeight: '900', fontSize: 22 },
  title: { marginTop: 14, color: T.ink, fontSize: 18, fontWeight: '900', textAlign: 'center' },
  message: { marginTop: 8, color: T.muted, fontSize: 12, lineHeight: 18, textAlign: 'center' },
  button: { marginTop: 18, minWidth: 132, minHeight: 44, borderRadius: 12, backgroundColor: T.nav, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
  buttonText: { color: '#fff', fontSize: 12, fontWeight: '900' },
});
