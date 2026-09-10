import AppAlert from '@/common/utils/appAlert';
import client from '@/common/API/client_fix_design';
import { getCurrentFinancialYear } from '@/common/commonfunction';
import { T } from '@/src/theme';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@/common/utils/compatibleStorage';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

// Helper function to generate consistent color from name
const getAvatarColor = (name: string) => {
    const colors = [
        '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFBE0B', '#FB5607',
        '#8338EC', '#3A86FF', '#FF006E', '#A5DD9B', '#F9C74F',
        '#90BE6D', '#560BAD', '#4361EE', '#3F37C9', '#4895EF',
        '#4CC9F0', '#F8961E', '#F0506E', '#6A0572', '#2E8B57'
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
};

const DEFAULT_PRPCODE = 'SIP';
const DEFAULT_PRPTYPE = 'S';
const DEFAULT_STRCODE = '002';
const DEFAULT_YEARNO = getCurrentFinancialYear();

type ERPContextValue = { prpcode: string; strcode: string; yearno: string };

const DEFAULT_ERP_CONTEXT: ERPContextValue = {
    prpcode: DEFAULT_PRPCODE,
    strcode: DEFAULT_STRCODE,
    yearno: DEFAULT_YEARNO,
};
const ERPContext = createContext<ERPContextValue>(DEFAULT_ERP_CONTEXT);

function useERP(): ERPContextValue {
    return useContext(ERPContext);
}

export function MonthlySalesTargetScreen() {
    const { prpcode, strcode, yearno } = useERP();
    const now = new Date();
    const [month, setMonth] = useState(now.getMonth());
    const [year, setYear] = useState(now.getFullYear());
    const [periodPicked, setPeriodPicked] = useState(true);
    const [pickerVisible, setPickerVisible] = useState(false);
    const [pickerYear, setPickerYear] = useState(now.getFullYear());
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [savingLoading, setSaveLoading] = useState(false);
    const [rows, setRows] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [setAllValue, setSetAllValue] = useState('');
    const [userType, setUserType] = useState<string>('');

    // Load user type on mount
    useEffect(() => {
        const loadUserType = async () => {
            const p = await AsyncStorage.getItem('user_prptype');
            setUserType(p || prpcode);
        };
        loadUserType();
    }, []);

    const MONTH_NAMES = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December',
    ];

    const MONTH_SHORT = [
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
    ];

    const formatMonthYear = (month: number, year: number) => {
        return `${MONTH_NAMES[month]} ${year}`;
    };

    const getFinancialYear = (year: number, month: number) => {
        return month >= 3
            ? String((year + 1) % 100).padStart(2, "0")
            : String(year % 100).padStart(2, "0");
    };

    const loadTargetsForPeriod = async (month: number, year: number) => {
        setLoading(true);
        try {
            const payload = {
                prptype: userType || prpcode,
                yearno: getFinancialYear(year, month),
                monthno: String(month + 1).padStart(2, '0'),
                txntype: "monthly_sales_target",
            };

            const response = await client.get('/monthly_sales_target_browse', {
                params: payload,
            });

            if (response.data.success && response.data.data?.monthly_sales_target?.length > 0) {
                const targets = response.data.data.monthly_sales_target.map((item: any) => ({
                    ...item,
                    id: item.sexe,
                    // target: item.target || "0",
                    target:
                        item.target !== null &&
                            item.target !== undefined
                            ? String(parseFloat(item.target))
                            : "",
                    isSelected: true, // All rows are selected by default
                }));
                setRows(targets);
            } else {
                setRows([]);
            }
        } catch (error) {
            console.log("Browse API Error:", error);
            setRows([]);
        } finally {
            setLoading(false);
        }
    };

    const saveTargets = async () => {
        // All rows with non-zero values are considered selected
        const selectedRows = rows.filter((row) => parseFloat(row.target || "0") > 0);

        const payload = {
            prptype: userType || prpcode,
            yearno: getFinancialYear(year, month),
            monthno: String(month + 1).padStart(2, "0"),
            d1: rows.map(row => ({
                ...row,
                target: row.target || "0"
            })),
        };
        setSaveLoading(true);

        try {
            const response = await client.post('/add_edit_monthly_sales_target', payload);
            const message =
                response.data?.message ||
                response.data?.response?.message ||
                "Operation completed.";

            if (response.data?.success) {
                setSaveLoading(false);
                AppAlert.alert(
                    "Success",
                    message,
                    [
                        {
                            text: "OK",
                            onPress: async () => {
                                await loadTargetsForPeriod(month, year);
                            },
                        },
                    ],
                    { cancelable: false }
                );
            } else {
                AppAlert.alert("Error", message);
            }
        } catch (error: any) {
            setSaveLoading(false);
            const message =
                error.response?.data?.message ||
                error.response?.data?.response?.message ||
                error.message;
            AppAlert.alert("Error", message);
        } finally {
            setSaveLoading(false);
            setSaving(false);
        }
    };

    useEffect(() => {
        if (!periodPicked) return;
        setLoading(true);
        loadTargetsForPeriod(month, year);
    }, [month, year, periodPicked, userType]);

    const shiftMonth = (delta: number) => {
        setPeriodPicked(true);
        let m = month + delta;
        let y = year;
        if (m < 0) {
            m = 11;
            y -= 1;
        } else if (m > 11) {
            m = 0;
            y += 1;
        }
        setMonth(m);
        setYear(y);
    };

    const openPicker = () => {
        setPickerYear(year);
        setPickerVisible(true);
    };

    const shiftPickerYear = (delta: number) => setPickerYear((y) => y + delta);

    const selectMonthFromPicker = (m: number) => {
        setMonth(m);
        setYear(pickerYear);
        setPeriodPicked(true);
        setPickerVisible(false);
    };

    const handleSetAllChange = (value: string) => {
        if (/^\d*\.?\d{0,2}$/.test(value)) {
            setSetAllValue(value);
        }
    };

    const handleApplyToAll = () => {
        if (setAllValue === '') return;

        setRows(prevRows => prevRows.map(row => ({
            ...row,
            target: setAllValue,
            isSelected: true
        })));
        setSetAllValue('');
    };

    const handleChangeTarget = (id: string, value: string) => {
        if (/^\d*\.?\d{0,2}$/.test(value)) {
            setRows((prev) =>
                prev.map((r) =>
                    r.id === id ? { ...r, target: value, isSelected: true } : r
                )
            );
        }
    };

    const handleResetTarget = (id: string) => {
        setRows((prev) =>
            prev.map((r) =>
                r.id === id ? { ...r, target: "0", isSelected: true } : r
            )
        );
    };

    const filteredRows = useMemo(() => {
        return rows.filter(row =>
            row.sexename.toLowerCase().includes(searchQuery.toLowerCase()) ||
            row.sexe.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [rows, searchQuery]);

    const totalTarget = useMemo(() => {
        return rows.reduce((sum, row) => sum + parseFloat(row.target || 0), 0);
    }, [rows]);

    const selectedCount = useMemo(() => {
        return rows.filter(row => parseFloat(row.target || "0") > 0).length;
    }, [rows]);

    const renderRow = ({ item }: { item: any }) => {
        return (
            <View style={styles.row}>
                <View style={styles.avatarSection}>
                    <View
                        style={[
                            styles.avatar,
                            { backgroundColor: getAvatarColor(item.sexename) },
                        ]}
                    >
                        <Text style={styles.avatarText}>
                            {item.sexename.charAt(0).toUpperCase()}
                        </Text>
                    </View>

                    <View style={styles.rowContent}>
                        {/* Top Row */}
                        <View style={styles.rowHeader}>
                            <Text
                                style={styles.rowName}
                                numberOfLines={1}
                            >
                                {item.sexename}
                            </Text>

                            <Text style={styles.rowCode}>
                                {item.sexe}
                            </Text>
                        </View>

                        {/* Last Month */}
                        <Text style={styles.lastMonth}>
                            Last month: ₹{item.last_month_target || "0"}
                        </Text>

                        {/* Target Input */}
                        <View style={styles.targetInputContainer}>
                            <Text style={styles.rupeeSymbol}>₹</Text>

                            <TextInput
                                style={styles.targetInput}
                                value={item.target}
                                onChangeText={(v) => handleChangeTarget(item.id, v)}
                                placeholder="0"
                                placeholderTextColor="#7C93A6"
                                keyboardType="decimal-pad"
                            />

                            {parseFloat(item.target || "0") > 0 && (
                                <TouchableOpacity
                                    style={styles.resetButton}
                                    onPress={() => handleResetTarget(item.id)}
                                >
                                    <Ionicons
                                        name="close-circle"
                                        size={22}
                                        color="#ff3b30"
                                    />
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                </View>
            </View>
        );
    };

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.scrollContainer}
            keyboardShouldPersistTaps="handled"
        >
            {/* Month Picker */}
            <View style={styles.monthPicker}>
                <TouchableOpacity onPress={() => shiftMonth(-1)} style={styles.monthNav}>
                    <Ionicons name="chevron-back" size={24} color="#666" />
                </TouchableOpacity>
                <TouchableOpacity onPress={openPicker} style={styles.monthTextContainer}>
                    <Text style={styles.monthText}>{formatMonthYear(month, year)}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => shiftMonth(1)} style={styles.monthNav}>
                    <Ionicons name="chevron-forward" size={24} color="#666" />
                </TouchableOpacity>
            </View>

            {/* Search Bar */}
            <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search executive"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
            </View>

            {/* Set All and Apply to All */}
            <View style={styles.setAllContainer}>
                <View style={styles.setAllInputContainer}>
                    <Text style={styles.rupeeSymbol}>₹</Text>
                    <TextInput
                        style={styles.setAllInput}
                        value={setAllValue}
                        onChangeText={handleSetAllChange}
                        placeholder="Set all"
                        placeholderTextColor="#7C93A6"
                        keyboardType="numeric"
                    />
                </View>
                <TouchableOpacity
                    style={styles.applyAllButton}
                    onPress={handleApplyToAll}
                >
                    <Ionicons name="copy" size={18} color="#fff" />
                    <Text style={styles.applyAllButtonText}>Apply to all</Text>
                </TouchableOpacity>
            </View>

            {/* List of Executives */}
            <View style={styles.listHeader}>
                <Text style={styles.listTitle}>Executives ({filteredRows.length})</Text>
            </View>

            {loading ? (
                <ActivityIndicator size="large" color={T.copper} style={styles.loader} />
            ) : filteredRows.length === 0 ? (
                <Text style={styles.emptyText}>No executives found for this period.</Text>
            ) : (
                <FlatList
                    data={filteredRows}
                    keyExtractor={(item) => item.id}
                    renderItem={renderRow}
                    contentContainerStyle={styles.listContent}
                    scrollEnabled={false}
                />
            )}

            {/* Footer with Total and Save Button */}
            <View style={styles.footer}>
                <View style={styles.footerLeft}>
                    <Text style={styles.footerLabel}>Total target</Text>
                    <Text style={styles.footerValue}>₹{totalTarget.toFixed(2)}</Text>
                </View>
                <View style={styles.footerMiddle}>
                    <Text style={styles.footerLabel}>Assigned</Text>
                    <Text style={styles.footerValue}>{selectedCount}/{rows.length}</Text>
                </View>
                <TouchableOpacity
                    style={styles.saveButton}
                    onPress={saveTargets}
                    disabled={savingLoading}
                >
                    {savingLoading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <>
                            <Ionicons name="checkmark" size={18} color="#fff" />
                            <Text style={styles.saveButtonText}>Save targets</Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>

            {/* Month Picker Modal */}
            <Modal visible={pickerVisible} transparent animationType="fade" onRequestClose={() => setPickerVisible(false)}>
                <Pressable style={styles.modalOverlay} onPress={() => setPickerVisible(false)}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <TouchableOpacity onPress={() => shiftPickerYear(-1)}>
                                <Ionicons name="chevron-back" size={24} color="#6200ee" />
                            </TouchableOpacity>
                            <Text style={styles.modalYear}>{pickerYear}</Text>
                            <TouchableOpacity onPress={() => shiftPickerYear(1)}>
                                <Ionicons name="chevron-forward" size={24} color="#6200ee" />
                            </TouchableOpacity>
                        </View>
                        <View style={styles.monthGrid}>
                            {MONTH_SHORT.map((label, m) => {
                                const isActive = m === month && pickerYear === year;
                                return (
                                    <TouchableOpacity
                                        key={label}
                                        style={[styles.monthCell, isActive && styles.monthCellActive]}
                                        onPress={() => selectMonthFromPicker(m)}
                                    >
                                        <Text style={[styles.monthCellText, isActive && styles.monthCellTextActive]}>
                                            {label}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                        <TouchableOpacity
                            style={styles.modalCloseButton}
                            onPress={() => setPickerVisible(false)}
                        >
                            <Text style={styles.modalCloseText}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </Pressable>
            </Modal>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    scrollContainer: {
        padding: 16,
        paddingBottom: 30,
    },
    monthPicker: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 2,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    monthNav: {
        padding: 8,
    },
    monthTextContainer: {
        flex: 1,
        alignItems: 'center',
    },
    monthText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 12,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    searchIcon: {
        marginRight: 10,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        color: '#333',
    },
    setAllContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 16,
    },
    setAllInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    setAllInput: {
        flex: 1,
        height: 40,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#ddd',
        paddingHorizontal: 8,
        fontSize: 16,
    },
    applyAllButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        // backgroundColor: '#6200ee',
        backgroundColor: T.copper,
        borderRadius: 8,
        paddingHorizontal: 16,
        paddingVertical: 10,
    },
    applyAllButtonText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 14,
    },
    listHeader: {
        marginBottom: 8,
    },
    listTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 12,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    avatarText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 16,
    },
    rowInfo: {
        flex: 1,
    },
    rowName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 2,
    },
    rupeeSymbol: {
        fontSize: 16,
        color: '#333',
    },
    resetButton: {
        padding: 4,
    },
    listContent: {
        paddingBottom: 20,
    },
    loader: {
        marginVertical: 20,
    },
    emptyText: {
        textAlign: 'center',
        color: '#999',
        marginVertical: 20,
    },
    footer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginTop: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    footerLeft: {
        alignItems: 'flex-start',
    },
    footerMiddle: {
        alignItems: 'center',
    },
    footerLabel: {
        fontSize: 12,
        color: '#666',
    },
    footerValue: {
        fontSize: 16,
        fontWeight: '700',
        color: '#6200ee',
    },
    saveButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        // backgroundColor: '#6200ee',
        backgroundColor: T.copper,
        borderRadius: 8,
        paddingHorizontal: 16,
        paddingVertical: 10,
    },
    saveButtonText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 14,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 20,
        width: '80%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalYear: {
        fontSize: 18,
        fontWeight: '700',
        color: '#333',
    },
    monthGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    monthCell: {
        width: '30%',
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
        marginBottom: 10,
        backgroundColor: '#f5f5f5',
    },
    monthCellActive: {
        backgroundColor: '#6200ee',
    },
    monthCellText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
    },
    monthCellTextActive: {
        color: '#fff',
    },
    modalCloseButton: {
        marginTop: 20,
        alignItems: 'center',
    },
    modalCloseText: {
        fontSize: 16,
        color: '#6200ee',
        fontWeight: '600',
    },
    avatarSection: {
        flexDirection: "row",
        alignItems: "flex-start",
    },

    rowContent: {
        flex: 1,
    },

    rowHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 4,
    },

    targetInputContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 10,
        width: "100%",
    },

    targetInput: {
        flex: 1,
        height: 42,
        marginLeft: 8,
        borderWidth: 1,
        borderColor: "#DDD",
        borderRadius: 10,
        paddingHorizontal: 12,
        fontSize: 16,
        textAlign: "right",
        backgroundColor: "#FFF",
        width: "100%",
    },

    rowCode: {
        fontSize: 13,
        fontWeight: "600",
        color: "#666",
    },

    lastMonth: {
        fontSize: 12,
        color: "#8A8A8A",
    },
});

export default MonthlySalesTargetScreen;