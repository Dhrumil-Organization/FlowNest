import React from 'react';
import { Modal, SafeAreaView, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import theme from '../../android/app/src/theme';

export const SuccessModal: React.FC<{
  visible: boolean;
  title?: string;
  message?: string;
  onClose: () => void;
  onView: () => void;
}> = ({ visible, title = 'Saved', message = 'Your cheque data has been saved.', onClose, onView }) => {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <SafeAreaView style={s.backdrop}>
        <View style={s.card}>
          <View style={s.header}>
            <View style={s.iconWrap}>
              <Icon name="check" size={28} color="#fff" />
            </View>
            <Text style={s.title}>{title}</Text>
          </View>

          <View style={s.body}>
            <Text style={s.message}>{message}</Text>
          </View>

          <View style={s.actions}>
            <TouchableOpacity style={s.secondaryBtn} onPress={onClose}>
              <Text style={s.secondaryText}>Close</Text>
            </TouchableOpacity>

            <TouchableOpacity style={s.primaryBtn} onPress={onView}>
              <Text style={s.primaryText}>View data</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(10,10,12,0.45)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  card: { width: '100%', maxWidth: 520, backgroundColor: theme.SURFACE, borderRadius: 14, padding: 18, shadowColor: theme.SHADOW, elevation: 8 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  iconWrap: { width: 48, height: 48, borderRadius: 12, backgroundColor: theme.BRAND_ACCENT, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  title: { fontSize: 18, fontWeight: '900', color: theme.BRAND_DARK },
  body: { paddingVertical: 6 },
  message: { color: theme.BRAND_DARK, lineHeight: 20 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 18 },
  primaryBtn: { backgroundColor: theme.BRAND_ACCENT, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10, marginLeft: 12 },
  primaryText: { color: '#fff', fontWeight: '800' },
  secondaryBtn: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10, borderWidth: 1, borderColor: theme.BORDER || '#e6e6e6' },
  secondaryText: { color: theme.TEXT_SECONDARY, fontWeight: '800' },
});
