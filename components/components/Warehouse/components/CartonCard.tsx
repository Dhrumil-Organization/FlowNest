import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import Icon from "@expo/vector-icons/MaterialIcons";
import { COLORS } from "./WarehouseStyles";

const getCartonNo = item => item?.cartonNo || item?.cartno || item?.CartNo || "-";

export default function CartonCard({ item, selected, onPress, hideCheckbox = false, }) {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => onPress(item)}
      style={{
        backgroundColor: selected ? "#f0edff" : "#fff",
        borderRadius: 12,
        padding: 12,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: selected ? COLORS.primary : "#e5e7eb",
        flexDirection: "row",
        alignItems: "center",
      }}
    >
      {/* <Icon
        name={selected ? "check-box" : "check-box-outline-blank"}
        size={24}
        color={selected ? COLORS.primary : "#6b7280"}
      /> */}

      {
        !hideCheckbox && (

          <Icon
            name={
              selected
                ? "check-box"
                : "check-box-outline-blank"
            }
            size={24}
            color={
              selected
                ? COLORS.primary
                : "#6b7280"
            }
          />

        )
      }

      {/* <View style={{ flex: 1, marginLeft: 12 }}> */}
      <View
        style={{
          flex: 1,
          marginLeft: hideCheckbox ? 0 : 12,
        }}
      >
        <Text style={{ fontSize: 16, fontWeight: "900", color: "#111827" }}>
          {getCartonNo(item)}
        </Text>

        <Text style={{ color: "#374151", marginTop: 3 }}>
          Packing | {item?.PackingNo || item?.vouno || item?.vouNo || "-"}
        </Text>

        <Text numberOfLines={1} style={{ color: "#374151", marginTop: 2 }}>
          {item?.ItmName || item?.itemName || "-"} | Grade:{" "}
          {item?.GrdName || item?.gradeName || "-"}
        </Text>
      </View>

      <Icon name="more-vert" size={22} color="#4b5563" />
    </TouchableOpacity>
  );
}