// src/components/CustomPicker.tsx
import React, { useState } from 'react';
import { Modal, View, Text, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
import Icon from '@expo/vector-icons/MaterialIcons';

interface PickerChild {
    label: string;
    value: string;
    enabled?: boolean;
}

interface CustomPickerProps {
    selectedValue: string;
    onValueChange: (value: string) => void;
    children: React.ReactNode;
    style?: any;
    placeholderColor?: string;
}

const CustomPicker: React.FC<CustomPickerProps> = ({
    selectedValue,
    onValueChange,
    children,
    style,
}) => {
    const [modalVisible, setModalVisible] = useState(false);

    // Parse <Picker.Item> children into array
    const items: PickerChild[] = [];
    React.Children.forEach(children, (child: any) => {
        if (child && child.props) {
            items.push({
                label: child.props.label,
                value: child.props.value,
                enabled: child.props.enabled !== false,
            });
        }
    });

    const selectedItem = items.find((i) => i.value === selectedValue);
    const displayLabel = selectedItem ? selectedItem.label : items[0]?.label || 'Select...';
    const isPlaceholder = !selectedValue || !selectedItem;

    return (
        <>
            <TouchableOpacity
                style={[styles.button, style]}
                onPress={() => setModalVisible(true)}
                activeOpacity={0.7}
            >
                <Text
                    style={[styles.buttonText, isPlaceholder && { color: '#999' }]}
                    numberOfLines={1}
                >
                    {displayLabel}
                </Text>
                <Icon name="arrow-drop-down" size={24} color="#666" />
            </TouchableOpacity>

            <Modal
                visible={modalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setModalVisible(false)}
            >
                <TouchableOpacity
                    style={styles.overlay}
                    activeOpacity={1}
                    onPress={() => setModalVisible(false)}
                >
                    <View style={styles.modalBox}>
                        <FlatList
                            data={items}
                            keyExtractor={(item, index) => `picker-${index}`}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={[styles.item, !item.enabled && { opacity: 0.4 }]}
                                    disabled={!item.enabled}
                                    onPress={() => {
                                        onValueChange(item.value);
                                        setModalVisible(false);
                                    }}
                                >
                                    <Text
                                        style={[
                                            styles.itemText,
                                            item.value === selectedValue && {
                                                color: '#007EA7',
                                                fontWeight: '700',
                                            },
                                        ]}
                                    >
                                        {item.label}
                                    </Text>
                                    {item.value === selectedValue && (
                                        <Icon name="check" size={20} color="#007EA7" />
                                    )}
                                </TouchableOpacity>
                            )}
                        />
                    </View>
                </TouchableOpacity>
            </Modal>
        </>
    );
};

const styles = StyleSheet.create({
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 12,
        paddingVertical: 10,
        minHeight: 45,
    },
    buttonText: {
        fontSize: 15,
        color: '#000',
        flex: 1,
    },
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 30,
    },
    modalBox: {
        backgroundColor: '#fff',
        borderRadius: 12,
        width: '100%',
        maxHeight: '70%',
        paddingVertical: 8,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
    },
    item: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 14,
        paddingHorizontal: 18,
        borderBottomWidth: 0.5,
        borderBottomColor: '#eee',
    },
    itemText: {
        fontSize: 15,
        color: '#333',
    },
});

export default CustomPicker;
