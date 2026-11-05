import React, { useMemo, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, FlatList, TextInput, ActivityIndicator } from 'react-native';
import Icon from '@expo/vector-icons/MaterialIcons';
import { s, C } from '../styles';

type Props = {
    visible: boolean;
    title: string;
    items: any[];
    loading?: boolean;
    labelOf: (x: any) => string;
    subOf?: (x: any) => string;
    disabledOf?: (x: any) => string | null; // return reason to disable
    onSelect: (x: any) => void;
    onClose: () => void;
    emptyText?: string;
};

/** Searchable bottom-sheet list. Self-contained so the screen does not depend on PartyDropdown props. */
const PickerModal = ({ visible, title, items, loading, labelOf, subOf, disabledOf, onSelect, onClose, emptyText }: Props) => {
    const [q, setQ] = useState('');

    const data = useMemo(() => {
        const t = q.trim().toLowerCase();
        if (!t) return items;
        return items.filter(x => `${labelOf(x)} ${subOf ? subOf(x) : ''}`.toLowerCase().includes(t));
    }, [q, items]);

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={s.modalWrap}>
                <View style={[s.sheet, { height: '70%' }]}>
                    <View style={[s.headerRow, { marginBottom: 10 }]}>
                        <Text style={s.sheetTitle}>{title}</Text>
                        <TouchableOpacity onPress={() => { setQ(''); onClose(); }} accessibilityLabel="Close">
                            <Icon name="close" size={22} color={C.ink2} />
                        </TouchableOpacity>
                    </View>
                    {items.length > 8 && (
                        <TextInput style={[s.input, { marginBottom: 8 }]} placeholder="Search" value={q} onChangeText={setQ} autoCorrect={false} />
                    )}
                    {loading ? (
                        <ActivityIndicator style={{ marginTop: 24 }} color={C.indigo} />
                    ) : (
                        <FlatList
                            data={data}
                            keyExtractor={(_, i) => String(i)}
                            keyboardShouldPersistTaps="handled"
                            ListEmptyComponent={<Text style={[s.hint, { textAlign: 'center', marginTop: 24 }]}>{emptyText || 'Nothing to show.'}</Text>}
                            renderItem={({ item }) => {
                                const reason = disabledOf ? disabledOf(item) : null;
                                return (
                                    <TouchableOpacity
                                        style={[s.listRow, reason ? { opacity: 0.45 } : null]}
                                        disabled={!!reason}
                                        onPress={() => { setQ(''); onSelect(item); }}
                                    >
                                        <View style={{ flex: 1 }}>
                                            <Text style={s.lineTitle}>{labelOf(item)}</Text>
                                            {!!subOf && !!subOf(item) && <Text style={s.lineSub}>{subOf(item)}</Text>}
                                            {!!reason && <Text style={s.lockText}>{reason}</Text>}
                                        </View>
                                        <Icon name="chevron-right" size={20} color={C.ink2} />
                                    </TouchableOpacity>
                                );
                            }}
                        />
                    )}
                </View>
            </View>
        </Modal>
    );
};

export default PickerModal;
