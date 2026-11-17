// FILE: src/features/support/components/Shell.tsx
// Frame of the Support Desk "software" (opened from the header icon, like Mill mode):
// its own dark header with a way back to FlowNest, then the app.
import { T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import React from 'react';
import { StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LiveDot, ToastHost, useLayout } from './ui';

type Props = {
  title: string;
  subtitle?: string;
  icon: string;
  accent: string;
  live?: string;
  onBack: () => void;
  right?: React.ReactNode;
  children: React.ReactNode;
};

export function Shell({ title, subtitle, icon, accent, live, onBack, right, children }: Props) {
  const { phone } = useLayout();
  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={T.nav} />
      <View style={[s.head, phone && { paddingHorizontal: 10 }]}>
        <TouchableOpacity onPress={onBack} style={s.back} accessibilityRole="button" accessibilityLabel="Back to FlowNest">
          <Icon name="arrow-back-ios-new" size={16} color="#fff" />
          {!phone ? <Text style={s.backText}>FlowNest</Text> : null}
        </TouchableOpacity>
        <View style={[s.logo, { backgroundColor: accent }]}><Icon name={icon as any} size={phone ? 18 : 20} color="#fff" /></View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={s.eyebrow} numberOfLines={1}>SUDAMO TEXTILE · SUPPORT</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={s.title} numberOfLines={1}>{title}</Text>
            {live ? <LiveDot status={live} /> : null}
          </View>
          {subtitle && !phone ? <Text style={s.sub} numberOfLines={1}>{subtitle}</Text> : null}
        </View>
        <View style={s.right}>{right}</View>
      </View>
      <View style={s.body}>{children}</View>
      <ToastHost />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: T.nav },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 18, paddingVertical: 10, backgroundColor: T.nav, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.08)' },
  back: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 36, paddingHorizontal: 10, borderRadius: 10, borderWidth: 1, borderColor: '#2A4055', backgroundColor: 'rgba(255,255,255,0.04)' },
  backText: { color: '#fff', fontSize: 12.5, fontWeight: '800' },
  logo: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  eyebrow: { fontSize: 9, fontWeight: '700', letterSpacing: 1.4, color: '#8EA6BA' },
  title: { fontSize: 18, fontWeight: '900', color: '#fff', letterSpacing: -0.2, flexShrink: 1 },
  sub: { fontSize: 11, color: '#9FB0BF', fontWeight: '600', marginTop: 1 },
  right: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  body: { flex: 1, backgroundColor: T.bg },
});
