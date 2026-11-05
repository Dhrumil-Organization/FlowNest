// Local NEW ERP presentation helpers for Grey Purchase Order.
// Pure presentation — no API / business logic. Everything shared comes from
// '@/src/components/erpUi'; this file only adds what the kit doesn't have
// (green/red/blue action buttons, an approval badge and a themed modal card).
import { S, T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import React from 'react';
import {
    ActivityIndicator,
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    TouchableWithoutFeedback,
    useWindowDimensions,
    View,
} from 'react-native';

export * from '../erpUi';

type Tone = 'green' | 'red' | 'blue' | 'nav' | 'copper';
const toneColor = (t: Tone) =>
    t === 'green' ? T.green : t === 'red' ? T.red : t === 'blue' ? T.blue : t === 'copper' ? T.copper : T.nav;

/** Approve / reject / PDF style action: solid (filled) or outline. */
export function ActionBtn({
    label,
    icon,
    onPress,
    tone = 'nav',
    disabled,
    loading,
    outline,
    style,
}: {
    label: string;
    icon?: string;
    onPress: () => void;
    tone?: Tone;
    disabled?: boolean;
    loading?: boolean;
    outline?: boolean;
    style?: any;
}) {
    const c = toneColor(tone);
    const fg = outline ? c : '#fff';
    return (
        <TouchableOpacity
            onPress={onPress}
            disabled={disabled || loading}
            activeOpacity={0.85}
            style={[
                ui.actBtn,
                outline ? { backgroundColor: `${c}10`, borderColor: `${c}45` } : { backgroundColor: c, borderColor: c },
                disabled && ui.actDisabled,
                style,
            ]}
            accessibilityRole="button"
            accessibilityLabel={label}
            accessibilityState={{ disabled: !!disabled }}
        >
            {loading ? (
                <ActivityIndicator size="small" color={fg} />
            ) : icon ? (
                <Icon name={icon as any} size={17} color={disabled ? T.muted : fg} />
            ) : null}
            <Text style={[ui.actText, { color: disabled ? T.muted : fg }]} numberOfLines={1}>
                {label}
            </Text>
        </TouchableOpacity>
    );
}

/** Approved / Rejected / Pending badge. */
export function AuthBadge({ kind }: { kind: 'approved' | 'rejected' | 'pending' }) {
    const c = kind === 'approved' ? T.green : kind === 'rejected' ? T.red : T.copper;
    const label = kind === 'approved' ? 'Approved' : kind === 'rejected' ? 'Rejected' : 'Pending';
    return (
        <View style={[ui.badge, { backgroundColor: `${c}14`, borderColor: `${c}40` }]}>
            <Icon name={kind === 'approved' ? 'check-circle' : kind === 'rejected' ? 'cancel' : 'schedule'} size={12} color={c} />
            <Text style={[ui.badgeText, { color: c }]}>{label.toUpperCase()}</Text>
        </View>
    );
}

/** Themed modal card (centred dialog on wide screens, bottom sheet look on phones).
 *  `onRequestClose` and `onClose` are kept separate so each original handler
 *  stays wired exactly where it was (hardware back vs. the close button). */
export function ModalCard({
    visible,
    onRequestClose,
    onClose,
    eyebrow,
    title,
    subtitle,
    children,
    footer,
    maxWidth = 560,
    animationType = 'fade',
    scrimCloses = false,
}: {
    visible: boolean;
    onRequestClose?: () => void;
    onClose?: () => void;
    eyebrow?: string;
    title: string;
    subtitle?: string;
    children?: React.ReactNode;
    footer?: React.ReactNode;
    maxWidth?: number;
    animationType?: 'fade' | 'slide' | 'none';
    scrimCloses?: boolean;
}) {
    const { width } = useWindowDimensions();
    const wide = width >= 720;
    return (
        <Modal visible={visible} transparent animationType={animationType} onRequestClose={onRequestClose}>
            <View style={[ui.flex, wide ? ui.centerWrap : ui.bottomWrap]}>
                <TouchableWithoutFeedback onPress={scrimCloses ? onClose : undefined}>
                    <View style={ui.scrim} />
                </TouchableWithoutFeedback>
                <View style={[ui.card, wide ? [ui.cardWide, { maxWidth }] : ui.cardPhone]}>
                    {!wide ? <View style={ui.handle} /> : null}
                    <View style={ui.head}>
                        <View style={{ flex: 1, minWidth: 0 }}>
                            {eyebrow ? <Text style={ui.eyebrow}>{eyebrow}</Text> : null}
                            <Text style={ui.title} numberOfLines={2}>{title}</Text>
                            {subtitle ? <Text style={ui.subtitle} numberOfLines={2}>{subtitle}</Text> : null}
                        </View>
                        {onClose ? (
                            <TouchableOpacity onPress={onClose} style={ui.closeBtn} accessibilityLabel="Close" accessibilityRole="button">
                                <Icon name="close" size={20} color={T.nav} />
                            </TouchableOpacity>
                        ) : null}
                    </View>
                    {children}
                    {footer ? <View style={ui.foot}>{footer}</View> : null}
                </View>
            </View>
        </Modal>
    );
}

export const ui = StyleSheet.create({
    flex: { flex: 1 },
    actBtn: {
        flex: 1,
        minWidth: 0,
        height: 40,
        borderRadius: 10,
        borderWidth: 1,
        paddingHorizontal: 10,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
    },
    actDisabled: { backgroundColor: T.alt, borderColor: T.border },
    actText: { fontSize: 13, fontWeight: '800' },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        borderWidth: 1,
        borderRadius: 20,
        paddingHorizontal: 8,
        paddingVertical: 3,
        alignSelf: 'flex-start',
    },
    badgeText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.4 },
    centerWrap: { alignItems: 'center', justifyContent: 'center', padding: 24 },
    bottomWrap: { justifyContent: 'flex-end' },
    scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(13,27,42,0.5)' },
    card: { backgroundColor: T.surface, overflow: 'hidden', ...S.sheet },
    cardWide: { width: '100%', borderRadius: 16, maxHeight: '90%' },
    cardPhone: { borderTopLeftRadius: 18, borderTopRightRadius: 18, maxHeight: '92%' },
    handle: { alignSelf: 'center', width: 38, height: 4.5, borderRadius: 3, backgroundColor: T.border, marginTop: 8 },
    head: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: T.hair,
    },
    eyebrow: { fontSize: 10, fontWeight: '800', color: T.copper, letterSpacing: 1.2 },
    title: { fontSize: 16, fontWeight: '800', color: T.nav },
    subtitle: { fontSize: 12, fontWeight: '600', color: T.muted, marginTop: 2 },
    closeBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: T.alt,
    },
    foot: {
        flexDirection: 'row',
        gap: 10,
        padding: 12,
        borderTopWidth: 1,
        borderTopColor: T.hair,
        backgroundColor: T.sub,
    },
});
