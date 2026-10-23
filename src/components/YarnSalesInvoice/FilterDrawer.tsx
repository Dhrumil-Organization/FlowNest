// FILE: src/components/SalesInvoiceBrowse/FilterDrawer.tsx
// Right-side criteria drawer (same look as the Taka History "Filters" panel):
//   small copper kicker + title, close button, fields, Cancel / Load footer.
// Rendered as an overlay inside the screen (not a Modal) so the pickers opened from it can use their own Modal.
import { Btn } from '@/src/components/erpUi';
import { T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useCols } from './ui';

type Props = {
  open: boolean;
  kicker: string;
  title: string;
  onClose: () => void;
  onSubmit: () => void;
  submitLabel?: string;
  submitIcon?: string;
  loading?: boolean;
  children: React.ReactNode;
};

export default function FilterDrawer({ open, kicker, title, onClose, onSubmit, submitLabel = 'Load', submitIcon = 'refresh', loading, children }: Props) {
  const { isPhone } = useCols();
  if (!open) return null;
  return (
    <View style={st.layer}>
      <Pressable style={st.backdrop} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close filters" />
      <View style={[st.panel, { width: isPhone ? '100%' : 420 }]}>
        <View style={st.head}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={st.kicker} numberOfLines={1}>{kicker}</Text>
            <Text style={st.title} numberOfLines={1}>{title}</Text>
          </View>
          <TouchableOpacity style={st.close} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close">
            <Icon name="close" size={20} color={T.nav} />
          </TouchableOpacity>
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={st.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {children}
        </ScrollView>

        <View style={st.foot}>
          <Btn label="Cancel" kind="ghost" onPress={onClose} style={{ flex: 1 }} />
          <Btn label={submitLabel} icon={submitIcon} onPress={onSubmit} loading={loading} style={{ flex: 1.6 }} />
        </View>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  layer: { ...StyleSheet.absoluteFillObject, zIndex: 30, flexDirection: 'row', justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15,23,32,0.45)' },
  panel: {
    height: '100%',
    backgroundColor: T.surface,
    borderLeftWidth: 1,
    borderLeftColor: T.border,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: -4, height: 0 },
    elevation: 12,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: T.hair,
  },
  kicker: { fontSize: 11, fontWeight: '800', color: T.copper, letterSpacing: 0.8, textTransform: 'uppercase' },
  title: { fontSize: 20, fontWeight: '900', color: T.ink, marginTop: 2 },
  close: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: T.border,
    backgroundColor: T.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { padding: 18, gap: 16 },
  foot: {
    flexDirection: 'row',
    gap: 10,
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: T.hair,
    backgroundColor: T.surface,
  },
});
