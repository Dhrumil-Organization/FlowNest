import Icon from '@expo/vector-icons/MaterialIcons';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { canChangePO, POEditFields, updateProductionOrder } from './productionOrderActions';

type Props = {
    visible: boolean;
    item: any | null;
    token: string;
    onClose: () => void;
    onSaved: (updated: any) => void;
};

const str = (v: any) => (v === undefined || v === null ? '' : String(v));
const isNum = (v: string) => v.trim() !== '' && Number.isFinite(Number(v.replace(/,/g, '')));

const ProductionOrderEditModal: React.FC<Props> = ({ visible, item, token, onClose, onSaved }) => {
    const [form, setForm] = useState<POEditFields>({ qty: '', rate: '', shkperc: '', expdate: '', remark: '' });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!visible || !item) return;
        setForm({
            qty: str(item.qty),
            rate: str(item.rate),
            shkperc: str(item.shkperc),
            expdate: str(item.expdate || item.deliverydate),
            remark: str(item.remark),
        });
        setError('');
        setSaving(false);
    }, [visible, item?.uid]);

    const set = (key: keyof POEditFields) => (value: string) => setForm((f) => ({ ...f, [key]: value }));

    const save = async () => {
        if (!item) return;
        if (!canChangePO(item)) {
            setError('This Production Order is already authorised and can no longer be modified.');
            return;
        }
        if (!isNum(form.qty) || Number(form.qty.replace(/,/g, '')) <= 0) return setError('Production Qty must be a number greater than 0.');
        if (!isNum(form.rate) || Number(form.rate.replace(/,/g, '')) < 0) return setError('Rate must be a valid number.');
        if (form.shkperc.trim() !== '' && !isNum(form.shkperc)) return setError('Shrink % must be a valid number.');

        const clean: POEditFields = {
            ...form,
            qty: form.qty.replace(/,/g, '').trim(),
            rate: form.rate.replace(/,/g, '').trim(),
            shkperc: (form.shkperc || '0').replace(/,/g, '').trim(),
            expdate: form.expdate.trim(),
            remark: form.remark.trim(),
        };

        setSaving(true);
        setError('');
        try {
            await updateProductionOrder(item, clean, token);
            onSaved({ ...item, ...clean, deliverydate: clean.expdate || item.deliverydate });
        } catch (e: any) {
            setError(e?.response?.data?.message || e?.message || 'Production Order could not be updated.');
        } finally {
            setSaving(false);
        }
    };

    const field = (label: string, key: keyof POEditFields, opts: { numeric?: boolean; placeholder?: string; multiline?: boolean } = {}) => (
        <View style={styles.field}>
            <Text style={styles.label}>{label}</Text>
            <TextInput
                style={[styles.input, opts.multiline && { minHeight: 70, textAlignVertical: 'top' }]}
                value={form[key]}
                onChangeText={set(key)}
                keyboardType={opts.numeric ? 'decimal-pad' : 'default'}
                placeholder={opts.placeholder}
                placeholderTextColor="#9CA3AF"
                multiline={opts.multiline}
                editable={!saving}
            />
        </View>
    );

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={() => !saving && onClose()}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.backdrop}>
                <View style={styles.sheet}>
                    <View style={styles.header}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.title}>Modify production order</Text>
                            <Text style={styles.sub} numberOfLines={1}>
                                {str(item?.vouno)}{item?.dsnname ? ` · ${item.dsnname}` : ''}{item?.shdname ? ` · ${item.shdname}` : ''}
                            </Text>
                        </View>
                        <TouchableOpacity onPress={onClose} disabled={saving} style={styles.close}>
                            <Icon name="close" size={20} color="#374151" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
                        <View style={styles.row}>
                            {field('Production Qty', 'qty', { numeric: true })}
                            {field('Rate', 'rate', { numeric: true })}
                        </View>
                        <View style={styles.row}>
                            {field('Shrink %', 'shkperc', { numeric: true })}
                            {field('Expected date', 'expdate', { placeholder: 'DD-MM-YYYY' })}
                        </View>
                        {field('Remark', 'remark', { multiline: true })}

                        {!!error && (
                            <View style={styles.error}>
                                <Icon name="error-outline" size={16} color="#B42318" />
                                <Text style={styles.errorText}>{error}</Text>
                            </View>
                        )}
                    </ScrollView>

                    <View style={styles.footer}>
                        <TouchableOpacity style={[styles.btn, styles.btnGhost]} onPress={onClose} disabled={saving}>
                            <Text style={styles.btnGhostText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.btn, styles.btnPrimary, saving && { opacity: 0.7 }]} onPress={save} disabled={saving}>
                            {saving ? <ActivityIndicator size="small" color="#fff" /> : <Icon name="save" size={18} color="#fff" />}
                            <Text style={styles.btnPrimaryText}>{saving ? 'Saving…' : 'Save changes'}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.45)', alignItems: 'center', justifyContent: 'center', padding: 16 },
    sheet: { width: '100%', maxWidth: 520, maxHeight: '90%', backgroundColor: '#fff', borderRadius: 14, overflow: 'hidden' },
    header: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#E5E7EB', gap: 10 },
    title: { fontSize: 16, fontWeight: '800', color: '#172033' },
    sub: { fontSize: 12, color: '#6B7280', marginTop: 2 },
    close: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
    row: { flexDirection: 'row', gap: 12 },
    field: { flex: 1, marginBottom: 12 },
    label: { fontSize: 11.5, fontWeight: '700', color: '#4B5563', marginBottom: 5 },
    input: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 9, fontSize: 14, color: '#111827', backgroundColor: '#fff' },
    error: { flexDirection: 'row', gap: 6, alignItems: 'flex-start', backgroundColor: '#FEF3F2', borderRadius: 8, padding: 10 },
    errorText: { flex: 1, color: '#B42318', fontSize: 12.5 },
    footer: { flexDirection: 'row', gap: 10, padding: 16, borderTopWidth: 1, borderTopColor: '#E5E7EB' },
    btn: { flex: 1, minHeight: 42, borderRadius: 9, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 },
    btnGhost: { borderWidth: 1, borderColor: '#D1D5DB', backgroundColor: '#fff' },
    btnGhostText: { color: '#374151', fontWeight: '800', fontSize: 13 },
    btnPrimary: { backgroundColor: '#17324A' },
    btnPrimaryText: { color: '#fff', fontWeight: '800', fontSize: 13 },
});

export default ProductionOrderEditModal;
