// FILE: src/features/repackingIssue/components/Sheet.tsx
// Phone: full-screen page.  Tablet / desktop (useDeviceClass): centred dialog over a dimmed backdrop.
import Icon from '@expo/vector-icons/MaterialIcons';
import React from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { useDeviceClass } from '@/src/core/layout/useDeviceClass';
import { S as SH } from '@/src/theme';
import { C, R, SP } from '../theme';

export function Sheet({ visible, onClose, title, subtitle, right, maxWidth = 1000, children, footer }: {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  maxWidth?: number;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const { isPhone, height } = useDeviceClass();
  const dialog = !isPhone;

  const panel = (
    <View style={[st.panel, dialog ? [st.dialog, { maxWidth, height: Math.round(height * 0.92) }] : { flex: 1 }]}>
      <View style={st.head}>
        <Pressable onPress={onClose} hitSlop={12} accessibilityLabel="Close" style={st.close}>
          <Icon name="close" size={22} color={C.onNav} />
        </Pressable>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={st.title} numberOfLines={1}>{title}</Text>
          {subtitle ? <Text style={st.sub} numberOfLines={1}>{subtitle}</Text> : null}
        </View>
        {right}
      </View>
      <View style={{ flex: 1 }}>{children}</View>
      {footer ? <View style={st.footer}>{footer}</View> : null}
    </View>
  );

  return (
    <Modal visible={visible} animationType={dialog ? 'fade' : 'slide'} transparent={dialog} onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {dialog ? (
          <View style={st.backdrop}>
            <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close dialog" />
            {panel}
          </View>
        ) : (
          <SafeAreaView style={{ flex: 1, backgroundColor: C.nav }}>{panel}</SafeAreaView>
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
}

const st = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: C.overlay, alignItems: 'center', justifyContent: 'center' },
  panel: { backgroundColor: C.bg, overflow: 'hidden' },
  dialog: { width: '94%', borderRadius: R.lg, ...SH.sheet },
  head: { flexDirection: 'row', alignItems: 'center', gap: SP.md, paddingHorizontal: SP.lg, paddingVertical: SP.md, backgroundColor: C.nav },
  close: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
  title: { color: C.onNav, fontSize: 17, fontWeight: '800' },
  sub: { color: C.onNavSub, fontSize: 12, marginTop: 2, fontWeight: '600' },
  footer: { flexDirection: 'row', alignItems: 'center', gap: SP.md, padding: SP.md, backgroundColor: C.card, borderTopWidth: 1, borderColor: C.line }
});
