// Local NEW ERP re-skin of the shared `@/Shared/SuccessModal`.
// The shared file is used by legacy screens, so it is copied here instead of
// edited. Props and the onClose / onView calls are identical to the shared
// version; only the visuals changed.
import { S, T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export const SuccessModal: React.FC<{
    visible: boolean;
    title?: string;
    message?: string;
    onClose: () => void;
    onView: () => void;
}> = ({ visible, title = 'Saved', message = 'Your cheque data has been saved.', onClose, onView }) => {
    return (
        <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose} statusBarTranslucent>
            <View style={s.backdrop}>
                <View style={s.card}>
                    <View style={s.iconWrap}>
                        <Icon name="check-circle" size={34} color={T.green} />
                    </View>
                    <Text style={s.eyebrow}>COLLECTION</Text>
                    <Text style={s.title}>{title}</Text>
                    <Text style={s.message}>{message}</Text>

                    <View style={s.actions}>
                        <TouchableOpacity
                            style={[s.btn, s.ghostBtn]}
                            onPress={onClose}
                            accessibilityRole="button"
                            accessibilityLabel="Close"
                        >
                            <Text style={s.ghostText}>Close</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[s.btn, s.primaryBtn]}
                            onPress={onView}
                            accessibilityRole="button"
                            accessibilityLabel="View data"
                        >
                            <Icon name="list-alt" size={18} color="#fff" />
                            <Text style={s.primaryText}>View data</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const s = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(13,27,42,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    card: {
        width: '100%',
        maxWidth: 420,
        backgroundColor: T.surface,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: T.border,
        paddingHorizontal: 20,
        paddingTop: 22,
        paddingBottom: 16,
        alignItems: 'center',
        ...S.sheet,
    },
    iconWrap: {
        width: 64,
        height: 64,
        borderRadius: 20,
        backgroundColor: `${T.green}16`,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    eyebrow: { fontSize: 10, fontWeight: '800', color: T.copper, letterSpacing: 1.2 },
    title: { fontSize: 18, fontWeight: '900', color: T.nav, marginTop: 3, textAlign: 'center' },
    message: { fontSize: 13.5, lineHeight: 20, fontWeight: '600', color: T.muted, marginTop: 6, textAlign: 'center' },
    actions: { flexDirection: 'row', gap: 10, marginTop: 20, alignSelf: 'stretch' },
    btn: {
        flex: 1,
        height: 44,
        borderRadius: 10,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    ghostBtn: { borderWidth: 1, borderColor: T.border, backgroundColor: T.surface },
    ghostText: { color: T.nav, fontWeight: '800', fontSize: 14 },
    primaryBtn: { backgroundColor: T.nav },
    primaryText: { color: '#fff', fontWeight: '800', fontSize: 14 },
});
