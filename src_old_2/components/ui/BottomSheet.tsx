import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, TouchableWithoutFeedback, StyleSheet, Platform, KeyboardAvoidingView, Modal } from 'react-native';
import { T, S } from '../../theme';

interface Props {
    open: boolean;
    onClose: () => void;
    title?: string;
    children: React.ReactNode;
    scroll?: boolean;
}

/** Mobile port of the web app's `Sheet` — slide-up bottom sheet with
 *  scrim, grab handle, title row and close button. */
export function BottomSheet({ open, onClose, title, children, scroll = true }: Props) {
    return (
        <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={styles.flex}
            >
                <TouchableWithoutFeedback onPress={onClose}>
                    <View style={styles.scrim} />
                </TouchableWithoutFeedback>

                <View style={styles.sheet}>
                    <View style={styles.handleWrap}>
                        <View style={styles.handle} />
                    </View>
                    {title ? (
                        <View style={styles.titleRow}>
                            <Text style={styles.title}>{title}</Text>
                            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                                <Text style={styles.close}>×</Text>
                            </TouchableOpacity>
                        </View>
                    ) : null}
                    {scroll ? (
                        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.body}>
                            {children}
                        </ScrollView>
                    ) : (
                        <View style={styles.body}>{children}</View>
                    )}
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    flex: { flex: 1, justifyContent: 'flex-end' },
    scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(13,27,42,0.45)' },
    sheet: {
        backgroundColor: T.surface,
        borderTopLeftRadius: 18,
        borderTopRightRadius: 18,
        maxHeight: '86%',
        ...S.sheet,
    },
    handleWrap: { paddingTop: 10, paddingBottom: 4, alignItems: 'center' },
    handle: { width: 38, height: 4.5, borderRadius: 3, backgroundColor: T.border },
    titleRow: {
        paddingHorizontal: 18, paddingTop: 6, paddingBottom: 12,
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        borderBottomWidth: 1, borderBottomColor: T.hair,
    },
    title: { fontSize: 13, fontWeight: '800', color: T.nav, letterSpacing: 0.3 },
    close: { fontSize: 24, color: T.muted, lineHeight: 24 },
    body: { paddingBottom: 28 },
});
