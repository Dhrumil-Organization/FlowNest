import React from "react";
import { Modal, View, Text, TouchableOpacity, StyleSheet } from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import { COLORS } from "./components/WarehouseStyles";

export default function WarehouseActionSheet({
  visible,
  item,
  onClose,
  onAssign,
  onView,
  onTransfer,
}) {
  return (
    <Modal transparent visible={visible} animationType="fade">
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.sheet}>
          <Text style={styles.title}>{item?.locationName || "Warehouse"}</Text>

          <TouchableOpacity style={styles.row} onPress={onAssign}>
            <Icon name="package-variant-closed-plus" size={24} color={COLORS.primary} />
            <Text style={styles.text}>Assign</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.row} onPress={onView}>
            <Icon name="eye-outline" size={24} color={COLORS.primary} />
            <Text style={styles.text}>View</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.row} onPress={onTransfer}>
            <Icon name="swap-horizontal" size={24} color={COLORS.primary} />
            <Text style={styles.text}>Transfer</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.row, styles.cancel]} onPress={onClose}>
            <Icon name="close" size={24} color="red" />
            <Text style={[styles.text, { color: "red" }]}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
  },
  sheet: {
    width: "82%",
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 18,
  },
  title: {
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 12,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
  },
  text: {
    marginLeft: 14,
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  cancel: {
    borderTopWidth: 1,
    borderTopColor: "#eee",
    marginTop: 8,
  },
});