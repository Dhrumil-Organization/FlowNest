import React from "react";
import { Modal, View, Text, TouchableOpacity, StyleSheet } from "react-native";
import Icon from "@expo/vector-icons/MaterialIcons";
import { COLORS } from "./components/WarehouseStyles";

export default function WarehouseActionSheet({ visible, item, onClose, onAssign, onView, onTransfer }) {
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={local.overlay} activeOpacity={1} onPress={onClose}>
        <View style={local.sheet}>
          <TouchableOpacity style={local.row} onPress={onAssign}>
            <Icon name="inventory-2" size={22} color="#0f8f9a" />
            <Text style={local.text}>Assign</Text>
          </TouchableOpacity>
          <TouchableOpacity style={local.row} onPress={onView}>
            <Icon name="visibility" size={22} color="#0f8f9a" />
            <Text style={local.text}>View</Text>
          </TouchableOpacity>
          <TouchableOpacity style={local.row} onPress={onTransfer}>
            <Icon name="compare-arrows" size={22} color="#0f8f9a" />
            <Text style={local.text}>Transfer</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[local.row, local.cancel]} onPress={onClose}>
            <Icon name="cancel" size={22} color="#0f8f9a" />
            <Text style={[local.text, { color: "#000" }]}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const local = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "center", alignItems: "center" },
  sheet: { width: "62%", backgroundColor: "#fff", borderRadius: 14, paddingVertical: 12, paddingHorizontal: 18, elevation: 8 },
  row: { flexDirection: "row", alignItems: "center", paddingVertical: 14 },
  text: { marginLeft: 14, fontSize: 15, fontWeight: "800", color: COLORS.text },
  cancel: { borderTopWidth: 1, borderTopColor: COLORS.border, marginTop: 6 },
});
