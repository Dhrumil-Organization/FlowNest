import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    Modal,
    FlatList,
    TextInput,
    StyleSheet
} from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";

const CustomSearchableDropdown = ({
    data = [],
    labelKey = "label",
    valueKey = "value",
    value = null,
    disabled,
    placeholder = "Select",
    placeholderTextColor = "#000",
    onSelect
}) => {
    const [visible, setVisible] = useState(false);
    const [search, setSearch] = useState("");
    const [filteredData, setFilteredData] = useState(data);
    const [selectedItem, setSelectedItem] = useState(null);

    // 🔥 FILTER
    useEffect(() => {
        if (!search) {
            setFilteredData(data);
        } else {
            const filtered = data.filter(item =>
                String(item[labelKey])
                    .toLowerCase()
                    .includes(search.toLowerCase())
            );
            setFilteredData(filtered);
        }
    }, [search, data]);

    // 🔥 VALUE SYNC (MOST IMPORTANT FIX)
    useEffect(() => {
        if (value && data.length > 0) {
            const found = data.find(
                item => String(item[valueKey]) === String(value)
            );

            if (found) {
                setSelectedItem(found);
            }
        }
    }, [value, data]);

    const handleSelect = (item) => {
        if (disabled) return;
        setSelectedItem(item);
        setVisible(false);
        onSelect && onSelect(item);
    };

    return (
        <>
            {/* INPUT BOX */}
            {/* <TouchableOpacity
        style={styles.box}
        onPress={() => setVisible(true)}
      >
        <Text style={{ color: placeholderTextColor }}>
          {selectedItem ? selectedItem[labelKey] : placeholder}
        </Text>
        <Icon name="arrow-drop-down" size={20} />
      </TouchableOpacity> */}

            <TouchableOpacity
                style={[
                    styles.box,
                    disabled && { backgroundColor: "#f2f2f2" } // optional UI
                ]}
                activeOpacity={disabled ? 1 : 0.7}
                onPress={() => {
                    if (disabled) return;   // 👈 MAIN FIX (open hi nahi hoga)
                    setVisible(true);
                }}
            >
                <Text style={{ color: placeholderTextColor }}>
                    {selectedItem ? selectedItem[labelKey] : placeholder}
                </Text>
                <Icon name="arrow-drop-down" size={20} />
            </TouchableOpacity>

            {/* MODAL */}
            <Modal visible={visible} transparent animationType="slide">
                <View style={styles.modalBg}>
                    <View style={styles.modalBox}>

                        {/* SEARCH */}
                        <TextInput
                            placeholder="Search..."
                            placeholderTextColor={placeholderTextColor}
                            value={search}
                            onChangeText={setSearch}
                            style={styles.search}
                        />

                        {/* LIST */}
                        <FlatList
                            data={filteredData}
                            keyExtractor={(item, index) => index.toString()}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={styles.item}
                                    onPress={() => handleSelect(item)}
                                >
                                    <Text style={{ color: "#000" }}>
                                        {item[labelKey]}
                                    </Text>
                                </TouchableOpacity>
                            )}
                        />

                        {/* CLOSE */}
                        <TouchableOpacity onPress={() => setVisible(false)}>
                            <Text style={styles.close}>Close</Text>
                        </TouchableOpacity>

                    </View>
                </View>
            </Modal>
        </>
    );
};

export default CustomSearchableDropdown;

const styles = StyleSheet.create({
    box: {
        borderWidth: 1,
        borderColor: "#ccc",
        padding: 10,
        borderRadius: 8,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center"
    },
    modalBg: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.4)",
        justifyContent: "flex-end"
    },
    modalBox: {
        backgroundColor: "#fff",
        padding: 16,
        maxHeight: "70%",
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16
    },
    search: {
        borderWidth: 1,
        borderColor: "#ccc",
        borderRadius: 8,
        padding: 8,
        marginBottom: 10
    },
    item: {
        padding: 10,
        borderBottomWidth: 1,
        borderBottomColor: "#eee"
    },
    close: {
        textAlign: "center",
        marginTop: 10,
        color: "red"
    }
});