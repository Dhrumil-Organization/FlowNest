import React, { useEffect, useState } from "react";
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Alert,
    ActivityIndicator,
    Modal,
    FlatList
} from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import { fetchPropertyData, fetchAllStoredata } from '../../common/API/Functions';
import { warehouseApi } from "./services/warehouseApi";
import { styles, COLORS } from "./components/WarehouseStyles";

const RadioRow = ({ label, value, onChange, onSelectedPress }) => (
    <View style={[styles.between, { marginBottom: 12 }]}>
        <Text style={styles.label}>{label}</Text>

        <View style={styles.row}>
            <TouchableOpacity style={styles.row} onPress={() => onChange("ALL")}>
                <Icon
                    name={value === "ALL" ? "radio-button-checked" : "radio-button-unchecked"}
                    size={22}
                    color={COLORS.primary}
                />
                <Text style={{ marginLeft: 6, marginRight: 18 }}>All</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.row}
                // onPress={() => onChange("SELECTED")}
                onPress={() => {

                    onChange("SELECTED");

                    onSelectedPress?.();
                }}
            >
                <Icon
                    name={value === "SELECTED" ? "radio-button-checked" : "radio-button-unchecked"}
                    size={22}
                    color={COLORS.primary}
                />
                <Text style={{ marginLeft: 6 }}>Selected</Text>
            </TouchableOpacity>
        </View>
    </View>
);

export default function WarehouseCriteriaScreen({ token, navigation }) {
    const [loading, setLoading] = useState(false);
    const [propertyPickerVisible, setPropertyPickerVisible] = useState(false);
    const [storePickerVisible, setStorePickerVisible] = useState(false);
    const [selectedProperty, setSelectedProperty] = useState(null);
    const [propertyData, setPropertyData] = useState([]);
    const [propertySearch, setPropertySearch] = useState("");
    const [selectedStore, setSelectedStore] = useState(null);
    const [storeData, setStoreData] = useState([]);
    const [storeSearch, setStoreSearch] = useState("");
    const [itemModalVisible, setItemModalVisible] = useState(false);
    const [mergeModalVisible, setMergeModalVisible] = useState(false);
    const [gradeModalVisible, setGradeModalVisible] = useState(false);
    const [shadeModalVisible, setShadeModalVisible] = useState(false);
    const [itemData, setItemData] = useState([]);
    const [mergeData, setMergeData] = useState([]);
    const [gradeData, setGradeData] = useState([]);
    const [shadeData, setShadeData] = useState([]);

    const [form, setForm] = useState({
        prpgroup: "Yarn Division",
        prpcode: "",
        strcode: "",
        itemMode: "ALL",
        mergeMode: "ALL",
        gradeMode: "ALL",
        shadeMode: "ALL",
        stockType: "ALL",
    });

    useEffect(() => {
        loadMaster();
    }, []);

    const loadMaster = async () => {
        try {
            setLoading(true);
            await warehouseApi.getCriteriaMaster();
        } catch (e) {
            console.log("criteria master error", e?.response?.data || e.message);
        } finally {
            setLoading(false);
        }
    };

    const setValue = (key, value) => {
        setForm(prev => ({ ...prev, [key]: value }));
    };

    const handlePreview = () => {
        if (!form.prpgroup) {
            Alert.alert("Validation", "Property group is required");
            return;
        }

        navigation.navigate("WarehouseDashboard", {
            criteria: form,
        });
    };

    useEffect(() => {
        const load = async () => {
            const data = await fetchPropertyData(token);

            setPropertyData(data || []);

            console.log("data ::", data);
        };

        load();
    }, []);

    useEffect(() => {
        if (!form.prpcode) {
            return;
        }
        const load = async () => {
            const stores = await fetchAllStoredata(
                token,
                form.prpcode
            );
            setStoreData(stores || []);
            console.log("store data ::", stores);
        };
        load();
    }, [form.prpcode]);


    const loadSelectionData = async (type) => {

        if (!form.prpcode || !form.strcode) {

            Alert.alert(
                "Validation",
                "Please select Property and Store"
            );

            return;
        }

        try {

            setLoading(true);

            const payload = {
                prpcode: form.prpcode,
                strcode: form.strcode,
                fetch: type,
            };

            console.log(
                `${type} payload ::`, payload);

            const res =
                await warehouseApi.AllItemMergeGradeShade(payload);

            console.log(`${type} response ::`, res);

            const data =
                res?.data?.response?.data ||
                res?.data?.response ||
                res?.data?.data ||
                [];

            console.log(
                `${type} data ::`, data);
            if (type === 'ITEM') {

                setItemData(data || []);

            } else if (type === 'MERGE') {

                setMergeData(data || []);

            } else if (type === 'GRADE') {

                setGradeData(data || []);

            } else if (type === 'SHADE') {

                setShadeData(data || []);
            }

        } catch (e) {

            console.log(
                `${type} api error`,
                e?.response?.data || e.message
            );

        } finally {

            setLoading(false);
        }
    };

    return (
        <View style={styles.screen}>
            <ScrollView contentContainerStyle={styles.container}>
                <View style={styles.card}>
                    <Text style={styles.label}>Property Group *</Text>
                    <TextInput
                        style={styles.input}
                        value={form.prpgroup}
                        onChangeText={v => setValue("prpgroup", v)}
                        placeholder="Property Group"
                    />



                    {/* <Text style={styles.label}>Prod. Property</Text>
                    <TextInput
                        style={styles.input}
                        value={form.prpcode}
                        onChangeText={v => setValue("prpcode", v)}
                        placeholder="Select Prod. Property"
                    /> */}

                    <Text style={styles.label}>Prod. Property</Text>

                    <TouchableOpacity
                        style={styles.bigInput}
                        onPress={() => setPropertyPickerVisible(true)}
                        activeOpacity={0.8}
                    >
                        <Text
                            style={[
                                styles.inputText,
                                !form.prpcode && {
                                    color: '#98A2B3',
                                },
                            ]}
                            numberOfLines={1}
                        >
                            {
                                selectedProperty?.LngName ||
                                propertyData.find(
                                    x => String(x.PrpCode) === String(form.prpcode)
                                )?.LngName ||
                                'Select Property'
                            }
                        </Text>

                        <Icon
                            name="keyboard-arrow-down"
                            size={22}
                            color="#667085"
                        />
                    </TouchableOpacity>


                    <Text style={styles.label}>Prod. Store</Text>
                    <TouchableOpacity
                        style={styles.bigInput}
                        onPress={() => setStorePickerVisible(true)}
                        activeOpacity={0.8}
                    >
                        <Text
                            style={[
                                styles.inputText,
                                !form.prpcode && {
                                    color: '#98A2B3',
                                },
                            ]}
                            numberOfLines={1}
                        >
                            {
                                selectedStore?.StrName ||
                                storeData.find(
                                    x => String(x.StrCode) === String(form.StrCode)
                                )?.StrName ||
                                'Select Store'
                            }
                        </Text>

                        <Icon
                            name="keyboard-arrow-down"
                            size={22}
                            color="#667085"
                        />
                    </TouchableOpacity>

                    <RadioRow
                        label="Item"
                        value={form.itemMode}
                        onChange={v => setValue("itemMode", v)}
                        onSelectedPress={() => {
                            loadSelectionData('ITEM');
                            setItemModalVisible(true);
                        }}
                    />

                    <RadioRow
                        label="Merge"
                        value={form.mergeMode}
                        onChange={v => setValue("mergeMode", v)}
                        onSelectedPress={() => {
                            loadSelectionData('MERGE');
                            setMergeModalVisible(true);
                        }}
                    />

                    <RadioRow
                        label="Grade"
                        value={form.gradeMode}
                        onChange={v => setValue("gradeMode", v)}
                        onSelectedPress={() => {
                            loadSelectionData('GRADE');
                            setGradeModalVisible(true);
                        }}
                    />

                    <RadioRow
                        label="Shade"
                        value={form.shadeMode}
                        onChange={v => setValue("shadeMode", v)}
                        onSelectedPress={() => {
                            loadSelectionData('SHADE');
                            setShadeModalVisible(true);
                        }}
                    />

                    <Text style={styles.label}>Stock Type</Text>
                    <TextInput
                        style={styles.input}
                        value={form.stockType}
                        onChangeText={v => setValue("stockType", v)}
                        placeholder="All"
                    />

                    <TouchableOpacity style={styles.button} onPress={handlePreview}>
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.buttonText}>PREVIEW</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </ScrollView>

            <Modal visible={propertyPickerVisible} animationType="slide">
                <View style={{ flex: 1, backgroundColor: "#fff" }}>

                    {/* HEADER */}
                    <View style={styles.pickerHeader}>
                        <TouchableOpacity
                            onPress={() => {
                                setPropertyPickerVisible(false);
                                setPropertySearch("");
                            }}
                        >
                            <Icon
                                name="arrow-back-ios"
                                size={20}
                                color="#000"
                            />
                        </TouchableOpacity>
                        <Text style={styles.pickerTitle}>
                            Select Property
                        </Text>
                        <View style={{ width: 20 }} />
                    </View>

                    {/* SEARCH */}
                    <View style={styles.pickerSearch}>
                        <Icon
                            name="search"
                            size={18}
                            color="#000"
                        />
                        <TextInput
                            placeholder="Search property..."
                            placeholderTextColor="#000"
                            value={propertySearch}
                            onChangeText={setPropertySearch}
                            style={{ flex: 1 }}
                        />
                    </View>

                    {/* LIST */}
                    <FlatList
                        data={propertyData.filter(p =>
                            p.LngName.toLowerCase().includes(
                                propertySearch.toLowerCase()
                            )
                        )}
                        keyExtractor={(item) => item.PrpCode}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={styles.pickerItem}
                                // onPress={() => {
                                //     setSelectedProperty(item);
                                //     setPropertyPickerVisible(false);
                                //     setPropertySearch("");
                                // }}
                                onPress={() => {

                                    console.log("selected property item", item);

                                    setSelectedProperty(item);

                                    // IMPORTANT
                                    setValue(
                                        'prpcode',
                                        item?.PrpCode || ''
                                    );

                                    setPropertyPickerVisible(false);

                                    setPropertySearch("");
                                }}
                            >
                                <Text style={{ color: "#000" }}>
                                    {item.LngName}
                                </Text>
                            </TouchableOpacity>
                        )}
                    />
                </View>
            </Modal>

            <Modal visible={storePickerVisible} animationType="slide">
                <View style={{ flex: 1, backgroundColor: "#fff" }}>
                    <View style={styles.pickerHeader}>
                        <TouchableOpacity
                            onPress={() => {
                                setSelectedStore(item);
                                setStorePickerVisible(false);
                                setStoreSearch("");
                            }}
                        >
                            <Icon
                                name="arrow-back-ios"
                                size={20}
                                color="#000"
                            />
                        </TouchableOpacity>
                        <Text style={styles.pickerTitle}>
                            Select Store
                        </Text>
                        <View style={{ width: 20 }} />
                    </View>

                    {/* SEARCH */}
                    <View style={styles.pickerSearch}>
                        <Icon
                            name="search"
                            size={18}
                            color="#000"
                        />
                        <TextInput
                            placeholder="Search property..."
                            placeholderTextColor="#000"
                            value={storeSearch}
                            onChangeText={setStoreSearch}
                            style={{ flex: 1 }}
                        />
                    </View>

                    {/* LIST */}
                    <FlatList
                        data={storeData.filter(p =>
                            p.StrCode.toLowerCase().includes(
                                storeSearch.toLowerCase()
                            )
                        )}
                        keyExtractor={(item) => item.StrCode}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={styles.pickerItem}

                                onPress={() => {

                                    setSelectedStore(item);

                                    // IMPORTANT
                                    setValue('strcode', item?.strcode || '');

                                    setStorePickerVisible(false);

                                    setStoreSearch("");
                                }}
                            >
                                <Text style={{ color: "#000" }}>
                                    {item.StrName}
                                </Text>
                            </TouchableOpacity>
                        )}
                    />
                </View>
            </Modal>

            <Modal
                visible={itemModalVisible}
                animationType="slide"
            >
                <View style={{ flex: 1, backgroundColor: '#fff' }}>

                    <View style={styles.pickerHeader}>
                        <TouchableOpacity
                            onPress={() => {
                                setItemModalVisible(false);
                            }}
                        >
                            <Icon
                                name="arrow-back-ios"
                                size={20}
                                color="#000"
                            />
                        </TouchableOpacity>

                        <Text style={styles.pickerTitle}>
                            Select Item
                        </Text>

                        <View style={{ width: 20 }} />
                    </View>

                    {/* FLATLIST HERE */}

                </View>
            </Modal>

        </View>
    );
}