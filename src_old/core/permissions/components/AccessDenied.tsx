import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { T } from '../../../theme';

export function AccessDenied({
  title = 'Access denied',
  message = 'You do not have permission to use this feature.',
  onBack,
}: {
  title?: string;
  message?: string;
  onBack?: () => void;
}) {
  return (
    <View style={styles.root}>
      <View style={styles.icon}><Text style={styles.iconText}>!</Text></View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {onBack ? (
        <TouchableOpacity style={styles.button} onPress={onBack}>
          <Text style={styles.buttonText}>Go back</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg, alignItems: 'center', justifyContent: 'center', padding: 28 },
  icon: { width: 48, height: 48, borderRadius: 24, backgroundColor: T.copper + '18', alignItems: 'center', justifyContent: 'center' },
  iconText: { color: T.copper, fontSize: 24, fontWeight: '900' },
  title: { color: T.ink, fontSize: 21, fontWeight: '900', marginTop: 14 },
  message: { color: T.muted, fontSize: 13, lineHeight: 20, textAlign: 'center', marginTop: 7, maxWidth: 300 },
  button: { marginTop: 18, backgroundColor: T.ink, borderRadius: 12, paddingHorizontal: 22, paddingVertical: 12 },
  buttonText: { color: '#fff', fontWeight: '800' },
});
