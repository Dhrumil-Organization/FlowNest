import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    FlatList,
    Modal,
    ActivityIndicator,
    StyleSheet,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import theme from '../../android/app/src/theme';

interface DropdownItem {
    [key: string]: any;
}

interface NewPartyDropdownProps {
    data: DropdownItem[];
    placeholder: string;
    labelKey: string | string[];
    valueKey: string;
    pageSize?: number;
    initialValue?: DropdownItem | DropdownItem[];
    selected?: DropdownItem | DropdownItem[];
    loading?: boolean;
    type?: string;
    multiple?: boolean;
    onSelect: (items: DropdownItem | DropdownItem[]) => void;
    setSelected: (items: DropdownItem | DropdownItem[] | null) => void;
    emptyMessage?: string;
}

const NewPartyDropdown: React.FC<NewPartyDropdownProps> = ({
    data = [],
    placeholder = 'Select...',
    labelKey = 'name',
    valueKey = 'code',
    pageSize = 10,
    initialValue = null,
    selected = null,
    loading = false,
    type = 'default',
    multiple = false,
    onSelect,
    setSelected,
    emptyMessage = 'No data available',
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [filteredData, setFilteredData] = useState<DropdownItem[]>([]);
    const [displayData, setDisplayData] = useState<DropdownItem[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [localSelected, setLocalSelected] = useState<DropdownItem[]>([]);
    const flatListRef = useRef<FlatList>(null);

    // Initialize localSelected with selected or initialValue
    useEffect(() => {
        if (multiple) {
            const initialItems = Array.isArray(selected) ? selected : Array.isArray(initialValue) ? initialValue : [];
            setLocalSelected(initialItems);
        } else {
            const initialItem = selected || initialValue || null;
            setLocalSelected(initialItem ? [initialItem] : []);
        }
    }, [selected, initialValue, multiple]);

    // Filter data based on search query
    useEffect(() => {
        if (searchQuery.trim() === '') {
            setFilteredData(data);
            setCurrentPage(1);
        } else {
            const filtered = data.filter(item =>
                Array.isArray(labelKey)
                    ? labelKey.some(key => String(item[key]).toLowerCase().includes(searchQuery.toLowerCase()))
                    : String(item[labelKey]).toLowerCase().includes(searchQuery.toLowerCase())
            );
            setFilteredData(filtered);
            setCurrentPage(1);
        }
    }, [searchQuery, data, labelKey]);

    // Load initial page of data
    useEffect(() => {
        setDisplayData(filteredData.slice(0, pageSize));
    }, [filteredData, pageSize]);

    // Load more data on scroll
    const loadMoreData = () => {
        if (isLoadingMore || displayData.length >= filteredData.length) return;

        setIsLoadingMore(true);
        const nextPage = currentPage + 1;
        const newData = filteredData.slice(0, nextPage * pageSize);
        setDisplayData(newData);
        setCurrentPage(nextPage);
        setIsLoadingMore(false);
    };

    // Toggle item selection
    const toggleItem = (item: DropdownItem) => {
        if (multiple) {
            const itemIndex = localSelected.findIndex(selectedItem =>
                selectedItem[valueKey] === item[valueKey]
            );
            if (itemIndex > -1) {
                const newSelected = [...localSelected];
                newSelected.splice(itemIndex, 1);
                setLocalSelected(newSelected);
            } else {
                setLocalSelected([...localSelected, item]);
            }
        } else {
            setLocalSelected([item]);
            setIsOpen(false);
            onSelect(item);
            setSelected(item);
        }
    };

    // Handle done button for multi-select
    const handleDone = () => {
        setIsOpen(false);
        if (multiple) {
            onSelect(localSelected);
            setSelected(localSelected);
        }
    };

    // Handle clear button
    const handleClear = () => {
        setLocalSelected([]);
        setSelected(multiple ? [] : null);
        onSelect(multiple ? [] : null);
    };

    // Render item
    const renderItem = ({ item }: { item: DropdownItem }) => {
        const isSelected = localSelected.some(selectedItem =>
            selectedItem[valueKey] === item[valueKey]
        );
        const itemLabel = Array.isArray(labelKey)
            ? labelKey.map(key => item[key]).join(' - ')
            : item[labelKey];

        return (
            <TouchableOpacity
                style={[
                    styles.item,
                    isSelected && styles.selectedItem,
                ]}
                onPress={() => toggleItem(item)}
            >
                <View style={styles.itemTextContainer}>
                    <Text style={styles.itemText}>
                        {itemLabel}
                    </Text>
                </View>
                {isSelected && (
                    <Icon name="check" size={18} color={theme.BRAND_ACCENT} />
                )}
            </TouchableOpacity>
        );
    };

    // Get label for selected items
    const getSelectedLabel = () => {
        if (localSelected.length === 0) return placeholder;
        if (!multiple) {
            return Array.isArray(labelKey)
                ? labelKey.map(key => localSelected[0][key]).join(' - ')
                : localSelected[0][labelKey];
        }
        return `${localSelected.length} selected`;
    };

    return (
        <View style={styles.container}>
            <TouchableOpacity
                style={styles.dropdownTrigger}
                onPress={() => setIsOpen(!isOpen)}
            >
                <Text
                    style={[
                        styles.triggerText,
                        localSelected.length === 0 && styles.placeholderText,
                    ]}
                    numberOfLines={1}
                >
                    {getSelectedLabel()}
                </Text>
                <Icon
                    name={isOpen ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
                    size={20}
                    color={theme.TEXT_SECONDARY}
                />
            </TouchableOpacity>

            <Modal
                visible={isOpen}
                transparent
                animationType="fade"
                onRequestClose={() => setIsOpen(false)}
            >
                <TouchableOpacity
                    style={styles.modalBackdrop}
                    activeOpacity={1}
                    onPress={() => setIsOpen(false)}
                >
                    <View style={styles.dropdownContainer}>
                        <View style={styles.searchContainer}>
                            <Icon name="search" size={20} color={theme.TEXT_SECONDARY} />
                            <TextInput
                                style={styles.searchInput}
                                placeholder="Search..."
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                                autoFocus
                            />
                        </View>

                        {loading ? (
                            <ActivityIndicator size="small" color={theme.BRAND_ACCENT} style={styles.loader} />
                        ) : displayData.length === 0 ? (
                            <Text style={styles.emptyText}>{emptyMessage}</Text>
                        ) : (
                            <FlatList
                                ref={flatListRef}
                                data={displayData}
                                renderItem={renderItem}
                                keyExtractor={(item, index) => `${item[valueKey]}-${index}`}
                                onEndReached={loadMoreData}
                                onEndReachedThreshold={0.5}
                                ListFooterComponent={
                                    isLoadingMore ? (
                                        <ActivityIndicator size="small" color={theme.BRAND_ACCENT} />
                                    ) : null
                                }
                            />
                        )}

                        {multiple && (
                            <View style={styles.footer}>
                                <TouchableOpacity
                                    style={[styles.footerButton, styles.clearButton]}
                                    onPress={handleClear}
                                >
                                    <Text style={styles.footerButtonText}>Clear</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.footerButton, styles.doneButton]}
                                    onPress={handleDone}
                                >
                                    <Text style={styles.footerButtonText}>Done</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                </TouchableOpacity>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: 10,
    },

    triggerText: {
        flex: 1,
        fontSize: 14,
        color: theme.TEXT_PRIMARY,
        fontWeight: '600',
    },
    dropdownTrigger: {
        backgroundColor: '#F6F7FA',
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1,
        borderColor: theme.BORDER,
        minHeight: 48
    },
    placeholderText: {
        color: theme.MUTED,
    },
    modalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        padding: 20,
    },

    dropdownContainer: {
        backgroundColor: theme.SURFACE,
        borderRadius: 14,
        maxHeight: '80%',
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOpacity: 0.15,
        shadowRadius: 10,
        elevation: 8
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: theme.BORDER,
    },
    searchInput: {
        flex: 1,
        marginLeft: 8,
        fontSize: 14,
        color: theme.TEXT_PRIMARY,
    },
    item: {
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: theme.BORDER,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    selectedItem: {
        backgroundColor: 'rgba(0, 123, 255, 0.1)',
    },
    itemTextContainer: {
        flex: 1,
        paddingRight: 10
    },

    itemText: {
        fontSize: 14,
        color: theme.TEXT_PRIMARY,
        lineHeight: 18,
        flexWrap: 'wrap'
    },
    emptyText: {
        padding: 16,
        textAlign: 'center',
        color: theme.MUTED,
    },
    loader: {
        padding: 16,
    },
    footer: {
        flexDirection: 'row',
        borderTopWidth: 1,
        borderTopColor: theme.BORDER,
    },
    footerButton: {
        flex: 1,
        padding: 12,
        alignItems: 'center',
    },
    clearButton: {
        backgroundColor: 'rgba(255, 0, 0, 0.1)',
    },
    doneButton: {
        backgroundColor: theme.BRAND_ACCENT,
    },
    footerButtonText: {
        color: theme.TEXT_PRIMARY,
        fontWeight: '600',
    },
});

export default NewPartyDropdown;
