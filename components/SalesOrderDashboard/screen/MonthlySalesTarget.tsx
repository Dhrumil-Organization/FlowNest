// ─────────────────────────────────────────────────────────────
// FILE: app/new/monthly-sales-target.tsx
//
// Monthly Sales Target module.
//
// - Month/Year filter: a card with chevrons on either side for
//   one-step +/- navigation, and a tappable center label that opens
//   a calendar-style modal (year stepper + month grid) for jumping
//   further ahead/back without repeated tapping.
//   List only loads once a period is picked (defaults to current
//   month on first open — change DEFAULT_TO_CURRENT_MONTH below
//   if you'd rather force an explicit pick first).
// - Each row: checkbox + name + numeric textbox for target value.
// - "Select all" checkbox at the top.
// - "Save Selected" validates that every CHECKED row has a
//   non-empty target before saving; empty ones are highlighted
//   red and the save is blocked until fixed.
//
// Wire-up points (search for TODO):
//   1. API_BASE_URL — point this at your real API host.
//   2. PRPTYPE — this screen needs a "prptype" value for every call;
//      wire it to wherever your app already keeps it (session store,
//      a picked property, etc). Left as a placeholder getter below.
//   3. FIELD — key names inside each browse-response row. Change these
//      to match your actual API's field names; everything else adapts
//      automatically.
// ─────────────────────────────────────────────────────────────
import { API } from '@/common/API/dynamicAPI';
import { T } from '@/src/theme';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from "axios";
import React, { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Modal,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// ---- Set to false if you want the list hidden until the user
// explicitly interacts with the month/year stepper at least once. ----
const DEFAULT_TO_CURRENT_MONTH = true;

// TODO: point this at your real API host.
// const API_BASE_URL = 'https://your-api-domain.com/api';

const TXN_TYPE = 'monthly_sales_target';

// TODO: adjust these to match the actual key names your browse API
// returns for each row. Everything downstream (mapping, rendering,
// the d1 payload on save) is driven off this object, so this is the
// only place you should need to touch for field-name changes.
const FIELD = {
    id: 'id', // unique row identifier
    name: 'name', // display name
    code: 'code', // secondary label (optional — omit/blank if unused)
    target: 'target', // the target-amount field, both read on browse and written on save
};

type TargetRow = {
    id: string;
    sexename: string;
    sexe?: string;
    target: string; // kept as string to match TextInput value
    raw: Record<string, any>; // the untouched row exactly as browse returned it
};

const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
];

const MONTH_SHORT = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

function formatMonthYear(month: number, year: number) {
    return `${MONTH_NAMES[month]} ${year}`;
}


// async function saveTargets(
//     month: number,
//     year: number,
//     rows: TargetRow[]
// ): Promise<{ success: boolean; message?: string }> {
//     const d1 = rows.map((r) => ({
//         ...r.raw,
//         [FIELD.target]: r.target,
//     }));

//     const response = await callApi<{ success?: boolean; message?: string }>(
//         'add_edit_monthly_sales_target',
//         'POST',
//         {
//             prptype: userPtype,
//             yearno: year,
//             monthno: month + 1, // TODO: same 0-based/1-based note as above — keep this consistent with browse
//             d1,
//         }
//     );

//     return { success: response?.success !== false, message: response?.message };
// }

export default function MonthlySalesTargetScreen({
    token,
    apiBase,
}: {
    token: string;
    apiBase: string;
}) {
    const now = new Date();
    const [month, setMonth] = useState(now.getMonth());
    const [year, setYear] = useState(now.getFullYear());
    const [periodPicked, setPeriodPicked] = useState(DEFAULT_TO_CURRENT_MONTH);

    // Quick-jump picker (calendar-style modal opened by tapping the filter)
    const [pickerVisible, setPickerVisible] = useState(false);
    const [pickerYear, setPickerYear] = useState(now.getFullYear());

    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [rows, setRows] = useState<TargetRow[]>([]);
    const [selected, setSelected] = useState<Record<string, boolean>>({});
    const [errors, setErrors] = useState<Record<string, boolean>>({});
    const [search, setSearch] = useState("");

    let cancelToken: any;

    const getRequestConfig = (props: any) => ({
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            Accept: "application/json",
        },
        params: props.params,
        cancelToken: cancelToken?.token,
    });

    const getFinancialYear = (year: number, month: number) => {
        // month: 0 = Jan, ..., 11 = Dec
        return month >= 3
            ? String((year + 1) % 100).padStart(2, "0") // Apr-Dec => next year
            : String(year % 100).padStart(2, "0");      // Jan-Mar => current year
    };

    const loadTargetsForPeriod = async (month: number, year: number) => {
        setLoading(true);
        const userPtype = await AsyncStorage.getItem('user_prptype');
        try {
            const payload = {
                prptype: userPtype,
                // yearno: year,
                yearno: getFinancialYear(year, month),
                // monthno: month + 1,
                monthno: String(month + 1).padStart(2, '0'),
                txntype: "monthly_sales_target",

                // prptype: "S",
                // monthno: "07",
                // yearno: "27",
                // txntype: "monthly_sales_target"
            };

            console.log("mmm payload", payload);

            const response = await axios.get(
                `${API}/api/monthly_sales_target_browse`,
                getRequestConfig({
                    params: { ...payload },
                }),
            );

            console.log("mmm response", response, API);
            if (
                response.data.success && response.data.data?.monthly_sales_target?.length > 0) {
                const targets = response.data.data.monthly_sales_target.map((item: any) => ({
                    ...item,
                    id: item.sexe,
                }));
                // setRows(response.data.data.monthly_sales_target);
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

    const getToken = () => {
        return token;
    };

    const saveTargets = async () => {
        const userPtype = await AsyncStorage.getItem("user_prptype");
        const selectedRows = rows.filter((row) => selected[row.id]);

        const payload = {
            prptype: userPtype,
            yearno: getFinancialYear(year, month),
            monthno: String(month + 1).padStart(2, "0"),
            d1: selectedRows,
        };

        const headers = {
            Authorization: `Bearer ${getToken()}`,
            "Content-Type": "application/json",
            "X-Requested-with": "XMLHttpRequest",
        };

        try {
            const response = await axios.post(
                `${API}/api/add_edit_monthly_sales_target`,
                payload,
                { headers }
            );

            console.log("Save Response :", response.data);

            const message =
                response.data?.message ||
                response.data?.response?.message ||
                "Operation completed.";

            if (response.data?.success) {
                Alert.alert(
                    "Success",
                    message,
                    [
                        {
                            text: "OK",
                            onPress: async () => {
                                setSelected({});
                                setErrors({});
                                await loadTargetsForPeriod(month, year);
                            },
                        },
                    ],
                    { cancelable: false }
                );
            } else {
                Alert.alert("Error", message);
            }
        } catch (error) {
            console.log("Save API Error :", error);

            if (axios.isAxiosError(error)) {
                const message =
                    error.response?.data?.message ||
                    error.response?.data?.response?.message ||
                    error.message;

                Alert.alert("Error", message);
            } else {
                Alert.alert("Error", "Something went wrong.");
            }
        } finally {
            setSaving(false);
        }
    };


    useEffect(() => {
        if (!periodPicked) return;

        setLoading(true);
        setSelected({});
        setErrors({});

        loadTargetsForPeriod(month, year);
    }, [month, year, periodPicked]);

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

    const allSelected = rows.length > 0 && rows.every((r) => selected[r.id]);

    const toggleSelectAll = () => {
        if (allSelected) {
            setSelected({});
        } else {
            const next: Record<string, boolean> = {};
            rows.forEach((r) => {
                next[r.id] = true;
            });
            setSelected(next);
        }
    };

    const toggleSelect = (id: string) => {
        setSelected((prev) => ({ ...prev, [id]: !prev[id] }));
    };

    const handleChangeTarget = (id: string, value: string) => {
        if (/^\d*\.?\d{0,2}$/.test(value)) {
            setRows((prev) =>
                prev.map((r) =>
                    r.id === id ? { ...r, target: value } : r
                )
            );

            if (errors[id]) {
                setErrors((prev) => ({ ...prev, [id]: false }));
            }
        }
    };

    const selectedCount = useMemo(() => Object.values(selected).filter(Boolean).length, [selected]);

    // const handleSaveSelected = async () => {
    //     if (!rows.some((r) => selected[r.id])) {
    //         Alert.alert("Select at least one row.");
    //         return;
    //     }

    //     await saveTargets();
    // };

    const handleSaveSelected = async () => {
        const selectedRows = rows.filter((r) => selected[r.id]);

        if (selectedRows.length === 0) {
            Alert.alert("Select at least one row.");
            return;
        }

        // const invalidRow = selectedRows.find((r) => {
        //     const value = (r.target || "").trim();

        //     return (
        //         value === "" ||
        //         value === ".00" ||
        //         value === "0" ||
        //         value === "0.0" ||
        //         value === "0.00"
        //     );
        // });

        // if (invalidRow) {
        //     Alert.alert(
        //         "Validation",
        //         "Target value cannot be blank ."
        //     );
        //     return;
        // }

        setSaving(true);
        await saveTargets();
    };

    const showTarget = async (id: string) => {
        const userPtype = await AsyncStorage.getItem("user_prptype");

        const payload = {
            prptype: userPtype,
            yearno: getFinancialYear(year, month),
            monthno: String(month + 1).padStart(2, "0"),
            sexe: id,
        };
        try {
            const response = await axios.get(
                `${API}/api/monthly_sales_target_show`,
                getRequestConfig({
                    params: payload,
                })
            );

            console.log("Show Response :", response.data);

            if (response.data.success) {
                // data set karo
                setRows(response.data.data.monthly_sales_target);
            }
        } catch (error) {
            console.log(error);
        }
    };

    const deleteTarget = async (id: string) => {
        const userPtype = await AsyncStorage.getItem("user_prptype");

        const payload = {
            prptype: userPtype,
            yearno: getFinancialYear(year, month),
            monthno: String(month + 1).padStart(2, "0"),
            sexe: id,
        };

        try {
            const response = await axios.post(
                `${API}/api/monthly_sales_target_delete`,
                payload,
                {
                    headers: {
                        Authorization: `Bearer ${getToken()}`,
                        "Content-Type": "application/json",
                        "X-Requested-with": "XMLHttpRequest",
                    },
                }
            );

            const message =
                response.data?.message ||
                response.data?.response?.message ||
                "Deleted Successfully";

            if (response.data.success) {
                Alert.alert("Success", message);

                // Grid refresh
                loadTargetsForPeriod(month, year);
            } else {
                Alert.alert("Error", message);
            }
        } catch (error: any) {
            Alert.alert(
                "Error",
                error.response?.data?.message || "Something went wrong."
            );
        }
    };

    const renderRow = ({ item }: { item: TargetRow }) => {
        const isChecked = !!selected[item.id];
        const hasError = !!errors[item.id];
        return (
            <View style={styles.row}>
                <TouchableOpacity
                    style={styles.checkbox}
                    onPress={() => toggleSelect(item.id)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                    <View style={[styles.checkboxBox, isChecked && styles.checkboxBoxChecked]}>
                        {isChecked && <Ionicons name="checkmark" size={14} color="#fff" />}
                    </View>
                </TouchableOpacity>

                <View style={styles.rowInfo}>
                    <Text style={styles.rowName} numberOfLines={1}>{item.sexename}</Text>
                    {!!item.sexe && <Text style={styles.rowCode}>{item.sexe}</Text>}
                </View>

                <TextInput
                    style={[styles.targetInput, hasError && styles.targetInputError]}
                    value={item.target}
                    onChangeText={(v) => handleChangeTarget(item.id, v)}
                    placeholder="Target"
                    placeholderTextColor="#7C93A6"
                    keyboardType="numeric"
                />
            </View>
        );
    };

    const filteredRows = useMemo(() => {
        if (!search.trim()) return rows;

        const keyword = search.trim().toLowerCase();

        return rows.filter((row) =>
            Object.values(row).some((value) => {
                if (value === null || value === undefined) return false;

                if (typeof value === "object") {
                    return JSON.stringify(value)
                        .toLowerCase()
                        .includes(keyword);
                }

                return String(value)
                    .toLowerCase()
                    .includes(keyword);
            })
        );
    }, [rows, search]);

    return (
        <>
            <SafeAreaView style={styles.safe} edges={['top']} />
            {/* <Text style={styles.title}>Monthly Sales Target</Text> */}

            {/* Month / Year filter */}
            <View style={styles.filterCard}>
                <TouchableOpacity
                    style={styles.chevronBtn}
                    onPress={() => shiftMonth(-1)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <Ionicons name="chevron-back" size={18} color={T.copper} />
                </TouchableOpacity>

                <TouchableOpacity style={styles.filterCenter} onPress={openPicker} activeOpacity={0.75}>
                    <Ionicons
                        name="calendar-outline"
                        size={20}
                        color="#FFFFFF"
                        style={{ marginRight: 14 }}
                    />
                    <View>
                        <Text style={styles.filterLabel}>{formatMonthYear(month, year)}</Text>
                        <Text style={styles.filterSubLabel}>Tap to jump to a month</Text>
                    </View>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.chevronBtn}
                    onPress={() => shiftMonth(1)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <Ionicons name="chevron-forward" size={18} color={T.copper} />
                </TouchableOpacity>
            </View>

            <View style={styles.searchContainer}>
                <Ionicons
                    name="search"
                    size={20}
                    color="#000"
                    style={{ marginRight: 8 }}
                />

                <TextInput
                    placeholder="Search..."
                    placeholderTextColor="#7C93A6"
                    value={search}
                    onChangeText={setSearch}
                    style={styles.searchInput}
                />

                {search !== "" && (
                    <TouchableOpacity onPress={() => setSearch("")}>
                        <Ionicons
                            name="close-circle"
                            size={20}
                            color="#7C93A6"
                        />
                    </TouchableOpacity>
                )}
            </View>

            {/* Quick-jump modal: pick a year, then tap a month */}
            <Modal visible={pickerVisible} transparent animationType="fade" onRequestClose={() => setPickerVisible(false)}>
                <Pressable style={styles.modalOverlay} onPress={() => setPickerVisible(false)}>
                    <Pressable style={styles.modalCard} onPress={() => { }}>
                        <View style={styles.modalYearRow}>
                            <TouchableOpacity
                                style={styles.chevronBtn}
                                onPress={() => shiftPickerYear(-1)}
                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            >
                                <Ionicons name="chevron-back" size={18} color={T.copper} />
                            </TouchableOpacity>

                            <Text style={styles.modalYearText}>{pickerYear}</Text>

                            <TouchableOpacity
                                style={styles.chevronBtn}
                                onPress={() => shiftPickerYear(1)}
                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            >
                                <Ionicons name="chevron-forward" size={18} color={T.copper} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.monthGrid}>
                            {MONTH_SHORT.map((label, m) => {
                                const isActive = m === month && pickerYear === year;
                                const isCurrent = m === now.getMonth() && pickerYear === now.getFullYear();
                                return (
                                    <TouchableOpacity
                                        key={label}
                                        style={[
                                            styles.monthCell,
                                            isActive && styles.monthCellActive,
                                            isCurrent && !isActive && styles.monthCellCurrent,
                                        ]}
                                        onPress={() => selectMonthFromPicker(m)}
                                    >
                                        <Text style={[styles.monthCellText, isActive && styles.monthCellTextActive]}>{label}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setPickerVisible(false)}>
                            <Text style={styles.modalCloseText}>Close</Text>
                        </TouchableOpacity>
                    </Pressable>
                </Pressable>
            </Modal>

            {!periodPicked ? (
                <View style={styles.center}>
                    <Text style={styles.hint}>Use + / - above to pick a month, then the list will load here.</Text>
                </View>
            ) : loading ? (
                <View style={styles.center}>
                    <ActivityIndicator color={T.copper} size="large" />
                </View>
            ) : (
                <>
                    <View style={styles.selectAllRow}>
                        <TouchableOpacity style={styles.checkbox} onPress={toggleSelectAll}>
                            <View style={[styles.checkboxBox, allSelected && styles.checkboxBoxChecked]}>
                                {allSelected && <Ionicons name="checkmark" size={14} color="#fff" />}
                            </View>
                        </TouchableOpacity>
                        <Text style={styles.selectAllText}>
                            Select all {selectedCount > 0 ? `(${selectedCount} selected)` : ''}
                        </Text>
                    </View>

                    <FlatList
                        data={filteredRows}
                        keyExtractor={(item) => item.id}
                        renderItem={renderRow}
                        contentContainerStyle={styles.listContent}
                        ListEmptyComponent={
                            <View style={styles.center}>
                                <Text style={styles.hint}>No parties found for this period.</Text>
                            </View>
                        }
                    />

                    <TouchableOpacity
                        style={[styles.saveBtn, saving && styles.btnDisabled]}
                        onPress={handleSaveSelected}
                        disabled={saving}
                        activeOpacity={0.85}
                    >
                        {saving ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.saveBtnText}>
                                Save Selected{selectedCount > 0 ? ` (${selectedCount})` : ''}
                            </Text>
                        )}
                    </TouchableOpacity>
                </>
            )}
            {/* </SafeAreaView> */}
        </>

    );
}

const styles = StyleSheet.create({
    safe: { flex: 0, backgroundColor: T.nav },
    title: {
        fontSize: 20,
        fontWeight: '900',
        color: '#fff',
        paddingHorizontal: 18,
        paddingTop: 16,
        paddingBottom: 8,
    },
    filterCard: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",

        backgroundColor: T.nav,

        paddingHorizontal: 18,
        paddingVertical: 16,

        marginHorizontal: 0,
        marginBottom: 14,

        borderRadius: 0,      // 👈 gap remove
        elevation: 4,
    },
    chevronBtn: {
        width: 25,
        height: 25,
        borderRadius: 25,

        backgroundColor: "rgba(255,255,255,0.08)",

        borderWidth: 1.5,
        borderColor: "rgba(255,255,255,0.35)",

        alignItems: "center",
        justifyContent: "center",
    },
    filterCenter: {
        flex: 0,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
    },
    filterLabel: {
        color: "#fff",
        fontSize: 14,
        fontWeight: "700",
        textAlign: "center",
    },
    filterSubLabel: {
        color: "rgba(255,255,255,0.75)",
        fontSize: 14,
        marginTop: 0,
        textAlign: "center",
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.55)',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 30,
    },
    modalCard: {
        width: '100%',
        maxWidth: 340,
        backgroundColor: T.nav,
        borderRadius: 20,
        padding: 18,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    modalYearRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    modalYearText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '900',
        marginHorizontal: 28,
        minWidth: 60,
        textAlign: 'center',
    },
    monthGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    monthCell: {
        width: '31%',
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 10,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderWidth: 1,
        borderColor: 'transparent',
    },
    monthCellCurrent: { borderColor: 'rgba(210,140,80,0.5)' },
    monthCellActive: { backgroundColor: T.copper },
    monthCellText: { color: '#000', fontSize: 13, fontWeight: '700' },
    monthCellTextActive: { color: '#fff' },
    modalCloseBtn: { alignItems: 'center', paddingVertical: 10, marginTop: 4 },
    modalCloseText: { color: '#A9C0D4', fontSize: 13, fontWeight: '700' },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30 },
    hint: { color: '#A9C0D4', fontSize: 13, textAlign: 'center', lineHeight: 19 },
    selectAllRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 18,
        paddingBottom: 8,
    },
    selectAllText: { color: '#000', fontSize: 13, fontWeight: '700', marginLeft: 8 },
    listContent: { paddingHorizontal: 18, paddingBottom: 90 },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
        marginBottom: 8,
    },
    checkbox: { marginRight: 10 },
    checkboxBox: {
        width: 20,
        height: 20,
        borderRadius: 5,
        borderWidth: 1.5,
        borderColor: '#000',
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkboxBoxChecked: { backgroundColor: T.copper, borderColor: T.copper },
    rowInfo: { flex: 1, marginRight: 10 },
    rowName: { color: '#000', fontSize: 14, fontWeight: '700' },
    rowCode: { color: '#000', fontSize: 11, marginTop: 2 },
    targetInput: {
        width: 100,
        height: 40,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#33506A',
        backgroundColor: '#fff',
        color: '#000',
        paddingHorizontal: 10,
        fontSize: 14,
        textAlign: 'right',
    },
    targetInputError: { borderColor: '#E38B8B' },
    saveBtn: {
        position: 'absolute',
        left: 18,
        right: 18,
        bottom: 16,
        height: 52,
        borderRadius: 15,
        backgroundColor: T.copper,
        alignItems: 'center',
        justifyContent: 'center',
    },
    btnDisabled: { opacity: 0.6 },
    saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '900' },
    searchContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginHorizontal: 18,
        marginBottom: 12,
        paddingHorizontal: 12,
        height: 48,
        borderRadius: 14,
        backgroundColor: "rgba(255,255,255,0.06)",
        borderWidth: 1,
        borderColor: "#000",
    },

    searchInput: {
        flex: 1,
        color: "#000",
        fontSize: 14,
    },
});